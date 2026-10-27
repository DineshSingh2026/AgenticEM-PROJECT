"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/lib/scene-store";
import { useSceneFade } from "@/components/scenes/shared/useSceneFade";
import { TOKENS } from "@/lib/tokens";
import pointsVert from "./shaders/arena-points-vert.glsl";
import pointsFrag from "./shaders/arena-points-frag.glsl";
import spokeVert from "./shaders/heartbeat-spoke-vert.glsl";
import spokeFrag from "./shaders/heartbeat-spoke-frag.glsl";
import arcVert from "./shaders/heartbeat-arc-vert.glsl";
import arcFrag from "./shaders/heartbeat-arc-frag.glsl";
import hubVert from "./shaders/heartbeat-hub-vert.glsl";
import hubFrag from "./shaders/heartbeat-hub-frag.glsl";

/**
 * Layout contract with the HTML overlay (Resilience): ring centred in the viewport,
 * radius = 30% of min(viewport w, h), node i at angle -90° + i*45° (screen space, clockwise).
 * Everything below is in unit-ring coordinates; the group is scaled by that radius.
 */
const CONFIG = {
  nodes: 8,
  ringFraction: 0.3,
  hubRadius: 0.3,
  hubDepth: 0.12,
  spokeStart: 0.37,
  spokeEnd: 0.9,
  spokeWidth: 0.16,
  nodeSize: 0.17,
  arcBulge: 0.16,
  arcSegments: 28,
  beatsPerSecond: 0.55,
  aliveLerp: 7,
  flashMs: 600,
  calm: { speed: 0.5 },
} as const;

const N = CONFIG.nodes;

/** Screen-space angle → unit-ring position in world (y up). */
function nodeXY(i: number): [number, number] {
  const a = THREE.MathUtils.degToRad(-90 + i * (360 / N));
  return [Math.cos(a), -Math.sin(a)];
}

function buildSpokes() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const index: number[] = [];
  const hw = CONFIG.spokeWidth / 2;
  for (let i = 0; i < N; i++) {
    const [dx, dy] = nodeXY(i);
    const px = -dy;
    const py = dx;
    const corners: [number, number, number, number][] = [
      [CONFIG.spokeStart, -hw, 0, 0],
      [CONFIG.spokeEnd, -hw, 1, 0],
      [CONFIG.spokeEnd, hw, 1, 1],
      [CONFIG.spokeStart, hw, 0, 1],
    ];
    const base = i * 4;
    for (const [r, o, u, v] of corners) {
      pos.push(dx * r + px * o, dy * r + py * o, 0);
      uv.push(u, v);
      idx.push(i);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("aIndex", new THREE.Float32BufferAttribute(idx, 1));
  geo.setIndex(index);
  return geo;
}

function buildArcs() {
  const pos: number[] = [];
  const idx: number[] = [];
  const ts: number[] = [];
  const step = (Math.PI * 2) / N;
  for (let i = 0; i < N; i++) {
    // Screen angle of the dropped node; arc spans neighbour i-1 → i+1, bulging outward.
    const centre = THREE.MathUtils.degToRad(-90 + i * (360 / N));
    const pt = (t: number): [number, number] => {
      const a = centre - step + t * step * 2;
      const r = 1 + CONFIG.arcBulge * Math.sin(Math.PI * t);
      return [Math.cos(a) * r, -Math.sin(a) * r];
    };
    for (let s = 0; s < CONFIG.arcSegments; s++) {
      const t0 = s / CONFIG.arcSegments;
      const t1 = (s + 1) / CONFIG.arcSegments;
      const a = pt(t0);
      const b = pt(t1);
      pos.push(a[0], a[1], 0, b[0], b[1], 0);
      idx.push(i, i);
      ts.push(t0, t1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aIndex", new THREE.Float32BufferAttribute(idx, 1));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
  return geo;
}

export function HeartbeatRing() {
  const { opacity, isVisible } = useSceneFade("HeartbeatRing");
  const group = useRef<THREE.Group>(null);

  const res = useMemo(() => {
    const c = (hex: string) => new THREE.Color(hex);
    const colors = {
      node: c(TOKENS.steel), dead: c(TOKENS.textFaint), copper: c(TOKENS.copper), green: c(TOKENS.dataGreen),
    };

    // Hub: octagonal prism with its axis along z, flat edge on top.
    const hubGeo = new THREE.CylinderGeometry(CONFIG.hubRadius, CONFIG.hubRadius, CONFIG.hubDepth, 8, 1);
    hubGeo.rotateX(Math.PI / 2);
    hubGeo.rotateZ(Math.PI / 8);
    const hubMat = new THREE.ShaderMaterial({
      vertexShader: hubVert,
      fragmentShader: hubFrag,
      transparent: true,
      uniforms: {
        uOpacity: { value: 0 }, uTime: { value: 0 }, uRadius: { value: CONFIG.hubRadius },
        uBase: { value: c(TOKENS.bgElev2) }, uLight: { value: c(TOKENS.lineStrong) },
        uCopper: { value: c(TOKENS.copper) }, uPulse: { value: c(TOKENS.dataGreen) },
      },
    });
    const edgeGeo = new THREE.EdgesGeometry(hubGeo, 1);
    const edgeMat = new THREE.LineBasicMaterial({ color: c(TOKENS.copper), transparent: true, depthWrite: false });

    const spokeGeo = buildSpokes();
    const spokeMat = new THREE.ShaderMaterial({
      vertexShader: spokeVert,
      fragmentShader: spokeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0 },
        uAspect: { value: CONFIG.spokeWidth / (CONFIG.spokeEnd - CONFIG.spokeStart) },
        uColor: { value: colors.green }, uDeadColor: { value: colors.dead }, uFlashColor: { value: colors.copper },
        uAlive: { value: new Array<number>(N).fill(1) },
        uFlash: { value: new Array<number>(N).fill(0) },
        uLoad: { value: new Array<number>(N).fill(0) },
      },
    });

    const arcGeo = buildArcs();
    const arcMat = new THREE.ShaderMaterial({
      vertexShader: arcVert,
      fragmentShader: arcFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: colors.green },
        uActive: { value: new Array<number>(N).fill(0) },
      },
    });

    const ringPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineBasicMaterial({ color: c(TOKENS.lineStrong), transparent: true, depthWrite: false });

    const nodeGeo = new THREE.BufferGeometry();
    const nodePos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const [x, y] = nodeXY(i);
      nodePos.set([x, y, 0.01], i * 3);
    }
    const nodeCol = new Float32Array(N * 3);
    const nodeSize = new Float32Array(N).fill(CONFIG.nodeSize);
    const nodeAlpha = new Float32Array(N).fill(1);
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute("aColor", new THREE.BufferAttribute(nodeCol, 3).setUsage(THREE.DynamicDrawUsage));
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(nodeSize, 1).setUsage(THREE.DynamicDrawUsage));
    nodeGeo.setAttribute("aAlpha", new THREE.BufferAttribute(nodeAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    const nodeMat = new THREE.ShaderMaterial({
      vertexShader: pointsVert,
      fragmentShader: pointsFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0 }, uScale: { value: 1 } },
    });

    return {
      colors, hubGeo, hubMat, edgeGeo, edgeMat, spokeGeo, spokeMat, arcGeo, arcMat, ringGeo, ringMat,
      nodeGeo, nodeMat, nodeCol, nodeSize, nodeAlpha,
    };
  }, []);

  useEffect(
    () => () => {
      for (const d of [res.hubGeo, res.hubMat, res.edgeGeo, res.edgeMat, res.spokeGeo, res.spokeMat,
        res.arcGeo, res.arcMat, res.ringGeo, res.ringMat, res.nodeGeo, res.nodeMat]) d.dispose();
    },
    [res],
  );

  const st8 = useRef({
    time: 0,
    beat: 0,
    alive: new Array<number>(N).fill(1),
    wasDropped: new Array<boolean>(N).fill(false),
    flashAt: new Array<number>(N).fill(-1e9),
  });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), c: new THREE.Color() }), []);

  useFrame((state, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const vis = isVisible();
    g.visible = vis;
    if (!vis) return;

    const store = useSceneStore.getState();
    const speed = store.variant === "calm" ? CONFIG.calm.speed : 1;
    const dt = Math.min(dtRaw, 0.05);
    const s = st8.current;
    s.time += dt;
    s.beat += dt * CONFIG.beatsPerSecond * speed;
    const op = opacity.current;

    const cam = state.camera as THREE.PerspectiveCamera;
    const vp = state.viewport.getCurrentViewport(cam, tmp.v.set(0, 0, 0));
    const R = Math.min(vp.width, vp.height) * CONFIG.ringFraction;
    g.scale.setScalar(R);
    g.position.set(0, 0, 0);

    // Dropped-node state from the HTML overlay.
    const raw = store.interaction.droppedNodes;
    const dropped = new Array<boolean>(N).fill(false);
    if (Array.isArray(raw)) for (const n of raw) if (typeof n === "number" && n >= 0 && n < N) dropped[n] = true;

    const uAlive = res.spokeMat.uniforms.uAlive.value as number[];
    const uFlash = res.spokeMat.uniforms.uFlash.value as number[];
    const uLoad = res.spokeMat.uniforms.uLoad.value as number[];
    const uActive = res.arcMat.uniforms.uActive.value as number[];
    const nowMs = s.time * 1000;
    const k = Math.min(1, dt * CONFIG.aliveLerp);
    for (let i = 0; i < N; i++) {
      if (s.wasDropped[i] && !dropped[i]) s.flashAt[i] = nowMs;
      s.wasDropped[i] = dropped[i];
      s.alive[i] += ((dropped[i] ? 0 : 1) - s.alive[i]) * k;
      const f = Math.max(0, 1 - (nowMs - s.flashAt[i]) / CONFIG.flashMs);
      uAlive[i] = s.alive[i];
      uFlash[i] = f * f;
      uActive[i] = 1 - s.alive[i];
    }
    for (let i = 0; i < N; i++) {
      const prev = (i + N - 1) % N;
      const next = (i + 1) % N;
      uLoad[i] = s.alive[i] * Math.max(1 - s.alive[prev], 1 - s.alive[next]);
    }

    // Nodes.
    for (let i = 0; i < N; i++) {
      const a = s.alive[i];
      tmp.c.copy(res.colors.dead).lerp(res.colors.node, a).lerp(res.colors.copper, uFlash[i]);
      tmp.c.toArray(res.nodeCol, i * 3);
      res.nodeSize[i] = CONFIG.nodeSize * (0.85 + 0.15 * a + 0.35 * uFlash[i] + 0.08 * uLoad[i]);
      res.nodeAlpha[i] = 0.45 + 0.55 * Math.max(a, uFlash[i]);
    }
    const na = res.nodeGeo.attributes;
    (na.aColor as THREE.BufferAttribute).needsUpdate = true;
    (na.aSize as THREE.BufferAttribute).needsUpdate = true;
    (na.aAlpha as THREE.BufferAttribute).needsUpdate = true;

    const fov = cam.isPerspectiveCamera ? cam.fov : 35;
    res.nodeMat.uniforms.uScale.value =
      ((state.size.height * state.viewport.dpr * 0.5) / Math.tan(THREE.MathUtils.degToRad(fov) / 2)) * R;
    res.nodeMat.uniforms.uOpacity.value = op;
    res.spokeMat.uniforms.uTime.value = s.beat;
    res.spokeMat.uniforms.uOpacity.value = op;
    res.arcMat.uniforms.uTime.value = s.time * speed;
    res.arcMat.uniforms.uOpacity.value = op * 0.8;
    res.hubMat.uniforms.uTime.value = s.beat;
    res.hubMat.uniforms.uOpacity.value = op;
    res.edgeMat.opacity = op * 0.9;
    res.ringMat.opacity = op * 0.35;
  });

  return (
    <group ref={group} visible={false}>
      <lineLoop geometry={res.ringGeo} material={res.ringMat} frustumCulled={false} renderOrder={1} />
      <mesh geometry={res.spokeGeo} material={res.spokeMat} frustumCulled={false} renderOrder={2} />
      <lineSegments geometry={res.arcGeo} material={res.arcMat} frustumCulled={false} renderOrder={2} />
      <mesh geometry={res.hubGeo} material={res.hubMat} frustumCulled={false} renderOrder={3} />
      <lineSegments geometry={res.edgeGeo} material={res.edgeMat} frustumCulled={false} renderOrder={4} />
      <points geometry={res.nodeGeo} material={res.nodeMat} frustumCulled={false} renderOrder={5} />
    </group>
  );
}
