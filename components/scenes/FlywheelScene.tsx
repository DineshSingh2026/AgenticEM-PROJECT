"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSceneStore } from "@/lib/scene-store";
import { useSceneFade } from "@/components/scenes/shared/useSceneFade";
import { TOKENS } from "@/lib/tokens";
import brushedPars from "./shaders/flywheel-brushed-pars.glsl";
import brushedFrag from "./shaders/flywheel-brushed-frag.glsl";

const CONFIG = {
  /** Wheel radius as a fraction of min(viewport w,h) */
  radiusFraction: 0.36,
  /** Horizontal offset (fraction of viewport width) on landscape screens */
  offsetX: 0.2,
  landscapeAspect: 1.25,
  outerRadius: 1.0,
  innerRadius: 0.27,
  depth: 0.16,
  seamGap: 0.05,
  hubRadius: 0.235,
  hubDepth: 0.26,
  segments: 4,
  steelColor: TOKENS.textDim,
  envIntensity: 0.75,
  /** rad/s */
  baseSpeed: 0.18,
  /** rad/s added per unit |scrollVelocity|, then clamped */
  velocityGain: 0.035,
  maxBoost: 2.4,
  speedLerp: 2.5,
  tilt: { x: -0.32, y: -0.38 },
  pointerTilt: { x: 0.12, y: 0.18 },
  seamGlow: 2.1,
  ticks: 96,
  calm: { speed: 0.5 },
} as const;

function buildWheel() {
  const { outerRadius: R, innerRadius: r, seamGap: g, depth, segments } = CONFIG;
  const parts: THREE.BufferGeometry[] = [];
  const step = (Math.PI * 2) / segments;
  for (let i = 0; i < segments; i++) {
    const a0 = i * step + Math.PI / 4;
    const a1 = a0 + step;
    // Constant-width seam: offset each edge by g/2 perpendicular to the seam line.
    const oR0 = a0 + Math.asin(g / 2 / R);
    const oR1 = a1 - Math.asin(g / 2 / R);
    const or0 = a0 + Math.asin(g / 2 / r);
    const or1 = a1 - Math.asin(g / 2 / r);
    const shape = new THREE.Shape();
    shape.moveTo(Math.cos(or0) * r, Math.sin(or0) * r);
    shape.lineTo(Math.cos(oR0) * R, Math.sin(oR0) * R);
    shape.absarc(0, 0, R, oR0, oR1, false);
    shape.lineTo(Math.cos(or1) * r, Math.sin(or1) * r);
    shape.absarc(0, 0, r, or1, or0, true);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.014, bevelSegments: 2, curveSegments: 40,
    });
    geo.translate(0, 0, -depth / 2);
    geo.clearGroups();
    parts.push(geo);
  }
  const hub = new THREE.CylinderGeometry(CONFIG.hubRadius, CONFIG.hubRadius, CONFIG.hubDepth, 48, 1).toNonIndexed();
  hub.rotateX(Math.PI / 2);
  parts.push(hub);
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

function buildSeams() {
  const { outerRadius: R, innerRadius: r, seamGap: g, depth, segments } = CONFIG;
  const parts: THREE.BufferGeometry[] = [];
  const step = (Math.PI * 2) / segments;
  const len = R - r;
  for (let i = 0; i < segments; i++) {
    const a = i * step + Math.PI / 4;
    const box = new THREE.BoxGeometry(len, g * 0.45, depth * 0.85).toNonIndexed();
    box.translate(r + len / 2, 0, 0);
    box.rotateZ(a);
    parts.push(box);
  }
  const ring = new THREE.TorusGeometry(CONFIG.hubRadius + 0.012, 0.007, 6, 72).toNonIndexed();
  ring.translate(0, 0, CONFIG.hubDepth / 2);
  parts.push(ring);
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

function buildTicks() {
  const pos: number[] = [];
  for (let i = 0; i < CONFIG.ticks; i++) {
    const a = (i / CONFIG.ticks) * Math.PI * 2;
    const r0 = 1.09;
    const r1 = i % 8 === 0 ? 1.16 : 1.12;
    pos.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}

export function FlywheelScene() {
  const { opacity, isVisible } = useSceneFade("FlywheelScene");
  const gl = useThree((s) => s.gl);
  const group = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  const res = useMemo(() => {
    const wheelGeo = buildWheel();
    const seamGeo = buildSeams();
    const tickGeo = buildTicks();
    const uniforms = {
      uFwRot: { value: 0 },
      uFwSheenAngle: { value: Math.PI * 0.62 },
      uFwSheenColor: { value: new THREE.Color(TOKENS.ivory) },
    };
    const wheelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.steelColor),
      metalness: 1,
      roughness: 0.3,
      envMapIntensity: CONFIG.envIntensity,
      transparent: true,
    });
    wheelMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vFwLocal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFwLocal = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${brushedPars}`)
        .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${brushedFrag}`);
    };
    wheelMat.customProgramCacheKey = () => "flywheel-brushed";
    const seamColor = new THREE.Color(TOKENS.copper);
    const seamMat = new THREE.MeshBasicMaterial({
      color: seamColor.clone().multiplyScalar(CONFIG.seamGlow), transparent: true, toneMapped: false,
    });
    const tickMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(TOKENS.steel), transparent: true, depthWrite: false,
    });
    return { wheelGeo, seamGeo, tickGeo, wheelMat, seamMat, seamColor, tickMat, uniforms };
  }, []);

  // Runtime-generated environment so metalness 1 has something to reflect (scoped to this material).
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    res.wheelMat.envMap = env;
    res.wheelMat.needsUpdate = true;
    room.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mt) => mt.dispose());
      }
    });
    pmrem.dispose();
    return () => {
      env.dispose();
      res.wheelMat.envMap = null;
    };
  }, [gl, res]);

  useEffect(
    () => () => {
      res.wheelGeo.dispose(); res.seamGeo.dispose(); res.tickGeo.dispose();
      res.wheelMat.dispose(); res.seamMat.dispose(); res.tickMat.dispose();
    },
    [res],
  );

  const motion = useRef({ omega: CONFIG.baseSpeed, angle: 0, tx: 0, ty: 0, time: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dtRaw) => {
    const g = group.current;
    const tilt = tiltRef.current;
    const spin = spinRef.current;
    if (!g || !tilt || !spin) return;
    const vis = isVisible();
    g.visible = vis;
    if (!vis) return;

    const st = useSceneStore.getState();
    const calm = st.variant === "calm";
    const speed = calm ? CONFIG.calm.speed : 1;
    const dt = Math.min(dtRaw, 0.05);
    const m = motion.current;
    m.time += dt;
    const op = opacity.current;

    const cam = state.camera as THREE.PerspectiveCamera;
    const vp = state.viewport.getCurrentViewport(cam, tmp.set(0, 0, 0));
    const R = Math.min(vp.width, vp.height) * CONFIG.radiusFraction;
    const landscape = vp.width / vp.height > CONFIG.landscapeAspect;
    g.scale.setScalar(R);
    g.position.set(landscape ? vp.width * CONFIG.offsetX : 0, 0, 0);

    const boost = Math.min(Math.abs(st.scrollVelocity) * CONFIG.velocityGain, CONFIG.maxBoost);
    const target = (CONFIG.baseSpeed + boost) * speed;
    m.omega += (target - m.omega) * Math.min(1, dt * CONFIG.speedLerp);
    m.angle -= m.omega * dt;
    spin.rotation.z = m.angle;
    res.uniforms.uFwRot.value = m.angle;

    const px = calm ? 0 : st.pointer.x;
    const py = calm ? 0 : st.pointer.y;
    const k = Math.min(1, dt * 3);
    m.tx += (CONFIG.tilt.x - py * CONFIG.pointerTilt.x - m.tx) * k;
    m.ty += ((landscape ? CONFIG.tilt.y : 0) + px * CONFIG.pointerTilt.y - m.ty) * k;
    tilt.rotation.set(m.tx, m.ty, 0);

    res.wheelMat.opacity = op;
    res.wheelMat.depthWrite = op > 0.98;
    const glow = CONFIG.seamGlow * (0.85 + 0.15 * Math.sin(m.time * 2.2 * speed)) * (1 + boost * 0.12);
    res.seamMat.color.copy(res.seamColor).multiplyScalar(glow);
    res.seamMat.opacity = op;
    res.tickMat.opacity = op * 0.3;
  });

  return (
    <group ref={group} visible={false}>
      <group ref={tiltRef}>
        <lineSegments geometry={res.tickGeo} material={res.tickMat} frustumCulled={false} />
        <group ref={spinRef}>
          <mesh geometry={res.wheelGeo} material={res.wheelMat} frustumCulled={false} />
          <mesh geometry={res.seamGeo} material={res.seamMat} frustumCulled={false} />
        </group>
      </group>
    </group>
  );
}
