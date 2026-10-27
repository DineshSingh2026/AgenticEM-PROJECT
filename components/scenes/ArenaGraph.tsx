"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/lib/scene-store";
import { useSceneFade } from "@/components/scenes/shared/useSceneFade";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import { TOKENS } from "@/lib/tokens";
import pointsVert from "./shaders/arena-points-vert.glsl";
import pointsFrag from "./shaders/arena-points-frag.glsl";

const CONFIG = {
  /** World units (at z=0) covered by the graph's unit radius = min(viewport w,h) / fit */
  fit: 3.9,
  offset: { x: 0, y: 0 },
  agentCount: 5,
  agentRadius: 1.0,
  agentSize: 0.2,
  spectators: { inner: 14, outer: 18, innerRadius: 1.42, outerRadius: 1.72, tilt: 0.42 },
  spectatorSize: 0.075,
  orbitSpeed: { inner: 0.06, outer: -0.04 },
  pulsePool: 24,
  pulseSize: 0.11,
  pulseDuration: 0.75,
  /** Spectators closer than this (local units) to a landing pulse brighten */
  landRadius: 1.0,
  boostDecay: 1.6,
  edgeBase: 0.16,
  edgeActive: 0.55,
  idleSpawnAfter: 1.4,
  hoverPx: 26,
  calm: { density: 0.4, speed: 0.5 },
} as const;

const N_SPEC = CONFIG.spectators.inner + CONFIG.spectators.outer;
const N_AGENT = CONFIG.agentCount;
const N_POINTS = N_AGENT + N_SPEC + CONFIG.pulsePool;
const EDGES: [number, number][] = [];
for (let a = 0; a < N_AGENT; a++) for (let b = a + 1; b < N_AGENT; b++) EDGES.push([a, b]);

function edgeIndex(a: number, b: number) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return EDGES.findIndex(([x, y]) => x === lo && y === hi);
}

function agentPos(i: number, out: THREE.Vector3) {
  const a = Math.PI / 2 - (i * Math.PI * 2) / N_AGENT;
  return out.set(Math.cos(a) * CONFIG.agentRadius, Math.sin(a) * CONFIG.agentRadius, 0);
}

function parseAgent(id: string): number {
  const n = Number(id.replace(/\D/g, "")) - 1;
  return Number.isFinite(n) && n >= 0 && n < N_AGENT ? n : -1;
}

interface Pulse { active: boolean; from: number; to: number; t: number; dur: number }

export function ArenaGraph() {
  const { opacity, isVisible } = useSceneFade("ArenaGraph");
  const group = useRef<THREE.Group>(null);

  const colors = useMemo(
    () => ({
      blue: new THREE.Color(TOKENS.dataBlue),
      green: new THREE.Color(TOKENS.dataGreen),
      pulse: new THREE.Color(TOKENS.copperSoft),
      ivory: new THREE.Color(TOKENS.ivory),
    }),
    [],
  );

  const pts = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_POINTS * 3);
    const col = new Float32Array(N_POINTS * 3);
    const size = new Float32Array(N_POINTS);
    const alpha = new Float32Array(N_POINTS);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    const mat = new THREE.ShaderMaterial({
      vertexShader: pointsVert,
      fragmentShader: pointsFrag,
      uniforms: { uOpacity: { value: 0 }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, mat, pos, col, size, alpha };
  }, []);

  const edges = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(EDGES.length * 6);
    const col = new Float32Array(EDGES.length * 6);
    const v = new THREE.Vector3();
    EDGES.forEach(([a, b], i) => {
      agentPos(a, v).toArray(pos, i * 6);
      agentPos(b, v).toArray(pos, i * 6 + 3);
    });
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { geo, mat, col };
  }, []);

  const hover = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N_AGENT * 6);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(TOKENS.dataGreen), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { geo, mat, pos };
  }, []);

  useEffect(
    () => () => {
      pts.geo.dispose(); pts.mat.dispose();
      edges.geo.dispose(); edges.mat.dispose();
      hover.geo.dispose(); hover.mat.dispose();
    },
    [pts, edges, hover],
  );

  const sim = useRef({
    time: 0,
    lastEvent: 0,
    pulses: Array.from({ length: CONFIG.pulsePool }, (): Pulse => ({ active: false, from: 0, to: 1, t: 0, dur: 1 })),
    edgeHeat: new Float32Array(EDGES.length),
    agentFlash: new Float32Array(N_AGENT),
    specBoost: new Float32Array(N_SPEC),
    specLocal: Array.from({ length: N_SPEC }, () => new THREE.Vector3()),
    agentLocal: Array.from({ length: N_AGENT }, (_, i) => agentPos(i, new THREE.Vector3())),
    hovered: -1,
    hoverAmt: 0,
  });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3() }), []);

  const spawn = (from: number, to: number) => {
    const s = sim.current;
    if (from < 0 || to < 0 || from === to) return;
    const st = useSceneStore.getState();
    const calm = st.variant === "calm";
    const pool = st.quality === 1 ? CONFIG.pulsePool / 2 : CONFIG.pulsePool;
    let slot = -1;
    let oldest = -1;
    let oldestT = -1;
    for (let i = 0; i < pool; i++) {
      const p = s.pulses[i];
      if (!p.active) { slot = i; break; }
      if (p.t > oldestT) { oldestT = p.t; oldest = i; }
    }
    if (slot < 0) slot = oldest;
    if (slot < 0) return;
    const p = s.pulses[slot];
    p.active = true; p.from = from; p.to = to; p.t = 0;
    p.dur = CONFIG.pulseDuration * (calm ? 1 / CONFIG.calm.speed : 1) * (0.85 + Math.random() * 0.3);
    s.lastEvent = s.time;
  };

  useSimFeed("match.event", (e) => {
    if (!isVisible()) return;
    const st = useSceneStore.getState();
    if (st.variant === "calm" && Math.random() > CONFIG.calm.density) return;
    spawn(parseAgent(e.from), parseAgent(e.to));
  });

  useFrame((state, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const vis = isVisible();
    g.visible = vis;
    if (!vis) return;

    const st = useSceneStore.getState();
    const calm = st.variant === "calm";
    const speed = calm ? CONFIG.calm.speed : 1;
    const density = (calm ? CONFIG.calm.density : 1) * (st.quality === 1 ? 0.5 : 1);
    const dt = Math.min(dtRaw, 0.05);
    const s = sim.current;
    s.time += dt;
    const op = opacity.current;

    // Frame the graph in the viewport.
    const cam = state.camera as THREE.PerspectiveCamera;
    const vp = state.viewport.getCurrentViewport(cam, tmp.w.set(0, 0, 0));
    const scale = Math.min(vp.width, vp.height) / CONFIG.fit;
    g.scale.setScalar(scale);
    g.position.set(CONFIG.offset.x * vp.width, CONFIG.offset.y * vp.height, 0);
    g.rotation.z = Math.sin(s.time * 0.05 * speed) * 0.04;

    pts.mat.uniforms.uOpacity.value = op;
    const fov = cam.isPerspectiveCamera ? cam.fov : 35;
    pts.mat.uniforms.uScale.value =
      (state.size.height * state.viewport.dpr * 0.5) / Math.tan(THREE.MathUtils.degToRad(fov) / 2) * scale;
    edges.mat.opacity = op;

    if (s.time - s.lastEvent > CONFIG.idleSpawnAfter / speed) {
      const a = Math.floor(Math.random() * N_AGENT);
      spawn(a, (a + 1 + Math.floor(Math.random() * (N_AGENT - 1))) % N_AGENT);
    }

    // Spectators: two tilted rings orbiting in opposite directions.
    const visibleInner = Math.max(1, Math.round(CONFIG.spectators.inner * density));
    const visibleOuter = Math.max(1, Math.round(CONFIG.spectators.outer * density));
    const tilt = CONFIG.spectators.tilt;
    for (let j = 0; j < N_SPEC; j++) {
      const inner = j < CONFIG.spectators.inner;
      const k = inner ? j : j - CONFIG.spectators.inner;
      const n = inner ? CONFIG.spectators.inner : CONFIG.spectators.outer;
      const r = inner ? CONFIG.spectators.innerRadius : CONFIG.spectators.outerRadius;
      const w = (inner ? CONFIG.orbitSpeed.inner : CONFIG.orbitSpeed.outer) * speed;
      const a = (k / n) * Math.PI * 2 + s.time * w + (inner ? 0 : 0.2);
      const t = inner ? tilt : -tilt * 0.7;
      const y = Math.sin(a) * r;
      s.specLocal[j].set(Math.cos(a) * r, y * Math.cos(t), y * Math.sin(t) + Math.sin(a * 3 + s.time * 0.4) * 0.03);
    }

    // Pulses.
    s.edgeHeat.forEach((h, i) => { s.edgeHeat[i] = Math.max(0, h - dt * 2.2); });
    for (let i = 0; i < N_AGENT; i++) s.agentFlash[i] = Math.max(0, s.agentFlash[i] - dt * 2.5);
    for (let j = 0; j < N_SPEC; j++) s.specBoost[j] = Math.max(0, s.specBoost[j] - dt * CONFIG.boostDecay);

    const P0 = N_AGENT + N_SPEC;
    for (let i = 0; i < CONFIG.pulsePool; i++) {
      const p = s.pulses[i];
      const idx = P0 + i;
      if (!p.active) { pts.alpha[idx] = 0; pts.size[idx] = 0; continue; }
      p.t += dt / p.dur;
      const e = edgeIndex(p.from, p.to);
      if (e >= 0) s.edgeHeat[e] = Math.min(1, s.edgeHeat[e] + dt * 4);
      if (p.t >= 1) {
        p.active = false;
        pts.alpha[idx] = 0;
        s.agentFlash[p.to] = 1;
        const target = s.agentLocal[p.to];
        for (let j = 0; j < N_SPEC; j++) {
          const d = s.specLocal[j].distanceTo(target);
          if (d < CONFIG.landRadius) s.specBoost[j] = Math.max(s.specBoost[j], 1 - d / CONFIG.landRadius);
        }
        continue;
      }
      const tt = p.t * p.t * (3 - 2 * p.t);
      tmp.v.lerpVectors(s.agentLocal[p.from], s.agentLocal[p.to], tt);
      tmp.v.toArray(pts.pos, idx * 3);
      colors.pulse.toArray(pts.col, idx * 3);
      pts.size[idx] = CONFIG.pulseSize * (0.8 + 0.4 * Math.sin(p.t * Math.PI));
      pts.alpha[idx] = Math.min(1, p.t * 8) * Math.min(1, (1 - p.t) * 8 + 0.4);
    }

    // Hover: interaction override, else nearest projected spectator to the pointer (not in calm).
    const hint = st.interaction.hoveredSpectator;
    let hovered = -1;
    if (typeof hint === "number" && hint >= 0 && hint < N_SPEC) hovered = hint;
    else if (!calm) {
      let best: number = CONFIG.hoverPx;
      const halfW = state.size.width / 2;
      const halfH = state.size.height / 2;
      g.updateMatrixWorld();
      for (let j = 0; j < N_SPEC; j++) {
        const inner = j < CONFIG.spectators.inner;
        const k = inner ? j : j - CONFIG.spectators.inner;
        if (k >= (inner ? visibleInner : visibleOuter)) continue;
        tmp.v.copy(s.specLocal[j]).applyMatrix4(g.matrixWorld).project(cam);
        const dx = (tmp.v.x - st.pointer.x) * halfW;
        const dy = (tmp.v.y - st.pointer.y) * halfH;
        const d = Math.hypot(dx, dy);
        if (d < best) { best = d; hovered = j; }
      }
    }
    if (hovered >= 0) s.hovered = hovered;
    s.hoverAmt += ((hovered >= 0 ? 1 : 0) - s.hoverAmt) * Math.min(1, dt * 10);
    const showHover = s.hovered >= 0 && s.hoverAmt > 0.01;
    if (showHover) {
      const sp = s.specLocal[s.hovered];
      for (let i = 0; i < N_AGENT; i++) {
        sp.toArray(hover.pos, i * 6);
        s.agentLocal[i].toArray(hover.pos, i * 6 + 3);
      }
      (hover.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      hover.mat.opacity = op * 0.6 * s.hoverAmt;
    } else s.hovered = -1;
    hover.mat.visible = showHover;

    // Agents.
    for (let i = 0; i < N_AGENT; i++) {
      s.agentLocal[i].toArray(pts.pos, i * 3);
      const f = s.agentFlash[i];
      tmp.v.set(colors.blue.r, colors.blue.g, colors.blue.b).lerp(
        tmp.w.set(colors.ivory.r, colors.ivory.g, colors.ivory.b), f * 0.45,
      );
      tmp.v.toArray(pts.col, i * 3);
      pts.size[i] = CONFIG.agentSize * (1 + f * 0.25 + Math.sin(s.time * 1.3 * speed + i) * 0.03);
      pts.alpha[i] = 0.9;
    }
    // Spectator points.
    for (let j = 0; j < N_SPEC; j++) {
      const idx = N_AGENT + j;
      const inner = j < CONFIG.spectators.inner;
      const k = inner ? j : j - CONFIG.spectators.inner;
      const shown = k < (inner ? visibleInner : visibleOuter);
      s.specLocal[j].toArray(pts.pos, idx * 3);
      const b = s.specBoost[j];
      const isHover = j === s.hovered ? s.hoverAmt : 0;
      const lift = Math.max(b, isHover);
      tmp.v.set(colors.green.r, colors.green.g, colors.green.b).lerp(
        tmp.w.set(colors.ivory.r, colors.ivory.g, colors.ivory.b), lift * 0.35,
      );
      tmp.v.toArray(pts.col, idx * 3);
      pts.size[idx] = shown ? CONFIG.spectatorSize * (1 + lift * 0.7) : 0;
      pts.alpha[idx] = shown ? 0.45 + 0.55 * lift : 0;
    }
    const ga = pts.geo.attributes;
    (ga.position as THREE.BufferAttribute).needsUpdate = true;
    (ga.aColor as THREE.BufferAttribute).needsUpdate = true;
    (ga.aSize as THREE.BufferAttribute).needsUpdate = true;
    (ga.aAlpha as THREE.BufferAttribute).needsUpdate = true;

    // Edge brightness.
    for (let e = 0; e < EDGES.length; e++) {
      const b = CONFIG.edgeBase + CONFIG.edgeActive * s.edgeHeat[e];
      for (let v = 0; v < 2; v++) {
        const o = e * 6 + v * 3;
        edges.col[o] = colors.blue.r * b;
        edges.col[o + 1] = colors.blue.g * b;
        edges.col[o + 2] = colors.blue.b * b;
      }
    }
    (edges.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments geometry={edges.geo} material={edges.mat} frustumCulled={false} renderOrder={1} />
      <lineSegments geometry={hover.geo} material={hover.mat} frustumCulled={false} renderOrder={1} />
      <points geometry={pts.geo} material={pts.mat} frustumCulled={false} renderOrder={2} />
    </group>
  );
}
