"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/lib/scene-store";
import { TOKENS } from "@/lib/tokens";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import { useSceneFade } from "./shared/useSceneFade";
import noise from "./shaders/noise.glsl";
import fullscreenVert from "./shaders/fullscreen.vert.glsl";
import simFrag from "./shaders/agentField.sim.frag.glsl";
import pointsVert from "./shaders/agentField.points.vert.glsl";
import pointsFrag from "./shaders/agentField.points.frag.glsl";
import trailVert from "./shaders/agentField.trail.vert.glsl";
import trailFrag from "./shaders/agentField.trail.frag.glsl";

const CONFIG = {
  texSize: { 2: 256, 1: 128 } as Record<1 | 2, number>,
  /** Flattened volume half-extents (world units; camera at z=8, fov 35) */
  volume: new THREE.Vector3(5.6, 2.9, 0.9),
  bounds: new THREE.Vector3(7.5, 4.2, 2.0),
  noiseFreq: 0.35,
  speed: 0.04,
  /** world units / second per unit of `speed` */
  speedScale: 10,
  pointSize: [1.2, 2.4] as const,
  alpha: 0.55,
  color: TOKENS.steel,
  flashColor: TOKENS.copper,
  flashMs: 600,
  maxFlash: 16,
  trailLen: 0.22,
  pointerRadius: 0.25, // fraction of viewport height
  pointerStrength: 0.6,
  pointerLerp: 0.08,
  tiltDeg: 6,
  driftPeriod: 40,
  driftAmp: { x: 0.25, y: 0.12, rotY: 0.05 },
  calm: { density: 0.4, speed: 0.5 },
};

type Q = 1 | 2;

function makeOrigin(size: number): THREE.DataTexture {
  const n = size * size;
  const data = new Float32Array(n * 4);
  const v = CONFIG.volume;
  for (let i = 0; i < n; i++) {
    // Slightly centre-weighted distribution.
    const rx = Math.random() + Math.random() - 1;
    const ry = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
    data[i * 4] = rx * v.x;
    data[i * 4 + 1] = ry * v.y;
    data[i * 4 + 2] = (Math.random() * 2 - 1) * v.z;
    data[i * 4 + 3] = Math.random();
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeTarget(size: number, type: THREE.TextureDataType) {
  return new THREE.WebGLRenderTarget(size, size, {
    type,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

/** Hero: 65,536 GPGPU agents (16,384 on tier 1) advecting through curl noise. */
export function AgentField() {
  const quality = useSceneStore((s) => s.quality);
  const q: Q = quality >= 2 ? 2 : 1;
  return <AgentFieldInner key={q} q={q} />;
}

function AgentFieldInner({ q }: { q: Q }) {
  const gl = useThree((s) => s.gl);
  const { opacity, isVisible } = useSceneFade("AgentField");
  const group = useRef<THREE.Group>(null);
  const size = CONFIG.texSize[q];
  const count = size * size;

  const sim = useMemo(() => {
    const floatOk = gl.capabilities.isWebGL2 && gl.extensions.has("EXT_color_buffer_float");
    const type = floatOk ? THREE.FloatType : THREE.HalfFloatType;
    const origin = makeOrigin(size);
    const targets = [makeTarget(size, type), makeTarget(size, type)] as const;
    const material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: noise + "\n" + simFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPositions: { value: null },
        uOrigin: { value: origin },
        uInit: { value: 1 },
        uTime: { value: 0 },
        uDt: { value: 0 },
        uSpeed: { value: CONFIG.speed * CONFIG.speedScale },
        uFreq: { value: CONFIG.noiseFreq },
        uBounds: { value: CONFIG.bounds },
        uPointer: { value: new THREE.Vector2(99, 99) },
        uRadius: { value: 1 },
        uStrength: { value: CONFIG.pointerStrength },
        uPointerOn: { value: 0 },
      },
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { origin, targets, material, scene, quad, camera, read: 0, initialised: false };
  }, [gl, size]);

  const flash = useMemo(
    () => ({
      idx: new Array<number>(CONFIG.maxFlash).fill(-1),
      time: new Array<number>(CONFIG.maxFlash).fill(-1000),
      cursor: 0,
    }),
    [],
  );

  const points = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = ((i % size) + 0.5) / size;
      pos[i * 3 + 1] = (Math.floor(i / size) + 0.5) / size;
      pos[i * 3 + 2] = i;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: pointsVert,
      fragmentShader: pointsFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPositions: { value: null },
        uDpr: { value: 1 },
        uTime: { value: 0 },
        uFlashDur: { value: CONFIG.flashMs / 1000 },
        uSizeMin: { value: CONFIG.pointSize[0] },
        uSizeMax: { value: CONFIG.pointSize[1] },
        uFlashIdx: { value: flash.idx },
        uFlashTime: { value: flash.time },
        uColor: { value: new THREE.Color(CONFIG.color) },
        uFlashColor: { value: new THREE.Color(CONFIG.flashColor) },
        uAlpha: { value: CONFIG.alpha },
        uOpacity: { value: 0 },
      },
    });
    return { geometry, material };
  }, [count, size, flash]);

  const trail = useMemo(() => {
    const pos = new Float32Array(CONFIG.maxFlash * 2 * 3);
    for (let i = 0; i < CONFIG.maxFlash; i++) {
      pos.set([i, 0, 0, i, 1, 0], i * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: trailVert,
      fragmentShader: trailFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPositions: { value: null },
        uSize: { value: size },
        uTime: { value: 0 },
        uFlashDur: { value: CONFIG.flashMs / 1000 },
        uTrailLen: { value: CONFIG.trailLen },
        uFlashIdx: { value: flash.idx },
        uFlashTime: { value: flash.time },
        uColor: { value: new THREE.Color(CONFIG.flashColor) },
        uOpacity: { value: 0 },
      },
    });
    return { geometry, material };
  }, [size, flash]);

  const clock = useRef(0);
  const pointerWorld = useRef(new THREE.Vector2(99, 99));
  const pointerTarget = useMemo(() => new THREE.Vector2(), []);
  const origin3 = useMemo(() => new THREE.Vector3(), []);
  const tilt = useRef({ x: 0, y: 0 });

  // Sim feed: flash a random (visible) particle copper on every settled round.
  useSimFeed("round.settled", () => {
    if (!isVisible()) return;
    const s = useSceneStore.getState();
    const visible = s.variant === "calm" ? Math.floor(count * CONFIG.calm.density) : count;
    const slot = flash.cursor;
    flash.idx[slot] = Math.floor(Math.random() * visible);
    flash.time[slot] = clock.current;
    flash.cursor = (slot + 1) % CONFIG.maxFlash;
  });

  // Mobile tilt via deviceorientation (no permission prompt; where gated, events simply never fire).
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      tilt.current.y = THREE.MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1);
      tilt.current.x = THREE.MathUtils.clamp(((e.beta ?? 45) - 45) / 45, -1, 1);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);

  useEffect(
    () => () => {
      sim.targets.forEach((t) => t.dispose());
      sim.origin.dispose();
      sim.material.dispose();
      sim.quad.geometry.dispose();
      points.geometry.dispose();
      points.material.dispose();
      trail.geometry.dispose();
      trail.material.dispose();
    },
    [sim, points, trail],
  );

  useFrame((state, rawDt) => {
    const g = group.current;
    if (!g) return;
    const visible = isVisible();
    g.visible = visible;
    if (!visible) return;
    const dt = Math.min(rawDt, 1 / 30);
    clock.current += dt;
    const t = clock.current;
    const s = useSceneStore.getState();
    const calm = s.variant === "calm";

    // --- simulation step ---
    const u = sim.material.uniforms;
    const vp = state.viewport.getCurrentViewport(state.camera, origin3);
    if (calm) {
      u.uPointerOn.value = 0;
    } else {
      pointerTarget.set((s.pointer.x * vp.width) / 2 - g.position.x, (s.pointer.y * vp.height) / 2 - g.position.y);
      pointerWorld.current.lerp(pointerTarget, CONFIG.pointerLerp);
      u.uPointerOn.value = 1;
    }
    u.uPointer.value.copy(pointerWorld.current);
    u.uRadius.value = CONFIG.pointerRadius * vp.height;
    u.uTime.value = t;
    u.uDt.value = dt * (calm ? CONFIG.calm.speed : 1);
    u.uInit.value = sim.initialised ? 0 : 1;
    const read = sim.targets[sim.read];
    const write = sim.targets[1 - sim.read];
    u.uPositions.value = read.texture;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(write);
    gl.render(sim.scene, sim.camera);
    gl.setRenderTarget(prev);
    sim.read = 1 - sim.read;
    sim.initialised = true;
    const tex = sim.targets[sim.read].texture;

    // --- draw uniforms ---
    const pu = points.material.uniforms;
    pu.uPositions.value = tex;
    pu.uDpr.value = state.viewport.dpr;
    pu.uTime.value = t;
    pu.uOpacity.value = opacity.current;
    const tu = trail.material.uniforms;
    tu.uPositions.value = tex;
    tu.uTime.value = t;
    tu.uOpacity.value = opacity.current;
    points.geometry.setDrawRange(0, calm ? Math.floor(count * CONFIG.calm.density) : count);

    // --- 40s drift (applied to the group so the shared camera stays untouched) + tilt ---
    const w = (t / CONFIG.driftPeriod) * Math.PI * 2;
    g.position.x = Math.sin(w) * CONFIG.driftAmp.x;
    g.position.y = Math.sin(w * 2) * CONFIG.driftAmp.y;
    const tiltR = THREE.MathUtils.degToRad(CONFIG.tiltDeg);
    g.rotation.x += (tilt.current.x * tiltR - g.rotation.x) * 0.05;
    g.rotation.y += (Math.sin(w) * CONFIG.driftAmp.rotY + tilt.current.y * tiltR - g.rotation.y) * 0.05;
  });

  return (
    <group ref={group} visible={false}>
      <points geometry={points.geometry} material={points.material} frustumCulled={false} />
      <lineSegments geometry={trail.geometry} material={trail.material} frustumCulled={false} />
    </group>
  );
}
