"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSceneStore } from "@/lib/scene-store";
import { TOKENS } from "@/lib/tokens";
import { useSceneFade } from "./shared/useSceneFade";
import packetsVert from "./shaders/explodedStack.packets.vert.glsl";
import packetsFrag from "./shaders/explodedStack.packets.frag.glsl";

const CONFIG = {
  slab: { w: 2.4, d: 1.6, t: 0.12 },
  stackedGap: 0.03,
  explodedGap: 0.85,
  /** progress windows for gap 0 (glass ↑), gap 1 (lattice ↑), gap 2 (plate ↑), then camera orbit */
  windows: [
    [0.05, 0.3],
    [0.3, 0.55],
    [0.55, 0.8],
  ] as const,
  orbitWindow: [0.8, 1.0] as const,
  orbitDeg: 25,
  baseRotation: { x: 0.42, y: -0.62 },
  /** desktop: stack sits left of centre (HTML labels occupy the right columns) */
  desktopX: -1.0,
  mobileScaleWidth: 6.2,
  progressLerp: 0.1,
  lattice: { bars: 9, bar: 0.035 },
  fins: { count: 15, h: 0.16, t: 0.03 },
  packets: { 2: 160, 1: 80 } as Record<1 | 2, number>,
  packetSize: 4,
  colors: {
    glass: TOKENS.ivory,
    copper: TOKENS.copper,
    steel: TOKENS.steel,
    graphite: TOKENS.bgElev2,
    edge: TOKENS.copper,
    packet: TOKENS.copperSoft,
  },
  calm: { density: 0.4, speed: 0.5 },
};

type Q = 1 | 2;

function buildLattice(): THREE.BufferGeometry {
  const { w, d, t } = CONFIG.slab;
  const { bars, bar } = CONFIG.lattice;
  const parts: THREE.BufferGeometry[] = [];
  // Outer frame
  for (const z of [-d / 2 + bar / 2, d / 2 - bar / 2]) {
    parts.push(new THREE.BoxGeometry(w, t, bar).translate(0, 0, z));
  }
  for (const x of [-w / 2 + bar / 2, w / 2 - bar / 2]) {
    parts.push(new THREE.BoxGeometry(bar, t, d).translate(x, 0, 0));
  }
  // Diagonal-free orthogonal grid, thinner than the frame
  for (let i = 1; i < bars; i++) {
    const x = -w / 2 + (w * i) / bars;
    parts.push(new THREE.BoxGeometry(bar * 0.6, t * 0.7, d).translate(x, 0, 0));
  }
  const rows = Math.round((bars * d) / w);
  for (let i = 1; i < rows; i++) {
    const z = -d / 2 + (d * i) / rows;
    parts.push(new THREE.BoxGeometry(w, t * 0.7, bar * 0.6).translate(0, 0, z));
  }
  const merged = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(w, t, d);
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildBase(): THREE.BufferGeometry {
  const { w, d, t } = CONFIG.slab;
  const { count, h, t: ft } = CONFIG.fins;
  const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(w, t, d)];
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / count;
    parts.push(new THREE.BoxGeometry(ft, h, d * 0.92).translate(x, -t / 2 - h / 2, 0));
  }
  const merged = mergeGeometries(parts, false) ?? new THREE.BoxGeometry(w, t, d);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Architecture band: four platform layers separate one at a time with scroll progress. */
export function ExplodedStack() {
  const quality = useSceneStore((s) => s.quality);
  const q: Q = quality >= 2 ? 2 : 1;
  return <ExplodedStackInner key={q} q={q} />;
}

function ExplodedStackInner({ q }: { q: Q }) {
  const { opacity, isVisible } = useSceneFade("ExplodedStack");
  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const slabs = useRef<(THREE.Group | null)[]>([]);
  const mats = useRef<(THREE.Material | null)[]>([]);
  const progress = useRef(0);
  const time = useRef(0);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const packetCount = CONFIG.packets[q];

  const geo = useMemo(() => {
    const { w, d, t } = CONFIG.slab;
    const plate = new THREE.BoxGeometry(w, t, d);
    const glass = new THREE.BoxGeometry(w, t * 0.8, d);
    const lattice = buildLattice();
    const base = buildBase();
    const edges = new THREE.EdgesGeometry(plate);
    return { plate, glass, lattice, base, edges };
  }, []);

  const packets = useMemo(() => {
    const { w, d } = CONFIG.slab;
    const pos = new Float32Array(packetCount * 3);
    for (let i = 0; i < packetCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * w * 0.85;
      pos[i * 3 + 1] = Math.random();
      pos[i * 3 + 2] = (Math.random() - 0.5) * d * 0.85;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: packetsVert,
      fragmentShader: packetsFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBottom: { value: 0 },
        uHeight: { value: 1 },
        uDpr: { value: 1 },
        uSize: { value: CONFIG.packetSize },
        uColor: { value: new THREE.Color(CONFIG.colors.packet) },
        uOpacity: { value: 0 },
      },
    });
    return { geometry, material };
  }, [packetCount]);

  const edgeColor = useMemo(() => new THREE.Color(CONFIG.colors.edge).multiplyScalar(1.3), []);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      packets.geometry.dispose();
      packets.material.dispose();
    },
    [geo, packets],
  );

  useFrame((state, dt) => {
    const r = root.current;
    if (!r) return;
    const visible = isVisible();
    r.visible = visible;
    if (!visible) return;
    const s = useSceneStore.getState();
    const calm = s.variant === "calm";
    time.current += dt * (calm ? CONFIG.calm.speed : 1);
    const target = calm ? 0.5 : s.progress;
    progress.current += (target - progress.current) * Math.min(1, CONFIG.progressLerp * dt * 60);
    const p = progress.current;

    // Layout: left of centre on desktop, centred + scaled on mobile.
    const vp = state.viewport.getCurrentViewport(state.camera, origin);
    const desktop = vp.aspect > 1;
    r.position.x = desktop ? CONFIG.desktopX : 0;
    r.scale.setScalar(desktop ? 1 : Math.min(1, vp.width / CONFIG.mobileScaleWidth));

    // Slab separation, bottom (index 3) to top (index 0).
    const { t } = CONFIG.slab;
    const gaps = CONFIG.windows.map(([a, b]) => THREE.MathUtils.smoothstep(p, a, b));
    // gaps[k] separates slab k from slab k+1 (top-down order); the top slab lifts first.
    let y = 0;
    const ys = [0, 0, 0, 0];
    for (let i = 3; i >= 0; i--) {
      ys[i] = y;
      if (i > 0) y += t + THREE.MathUtils.lerp(CONFIG.stackedGap, CONFIG.explodedGap, gaps[i - 1]);
    }
    const centre = ys[0] / 2;
    for (let i = 0; i < 4; i++) {
      const g = slabs.current[i];
      if (g) g.position.y = ys[i] - centre;
    }

    // Camera-style orbit near the end (applied to the rig so the shared camera is untouched).
    const orbit = THREE.MathUtils.smoothstep(p, CONFIG.orbitWindow[0], CONFIG.orbitWindow[1]);
    if (rig.current) {
      rig.current.rotation.x = CONFIG.baseRotation.x - orbit * 0.12;
      rig.current.rotation.y = CONFIG.baseRotation.y + THREE.MathUtils.degToRad(CONFIG.orbitDeg) * orbit;
    }

    const o = opacity.current;
    mats.current.forEach((m) => {
      if (m) m.opacity = o * (m.userData.baseOpacity ?? 1);
    });
    const u = packets.material.uniforms;
    u.uTime.value = time.current;
    u.uBottom.value = -centre - CONFIG.fins.h;
    u.uHeight.value = ys[0] + t + CONFIG.fins.h + 0.4;
    u.uDpr.value = state.viewport.dpr;
    u.uOpacity.value = o;
    packets.geometry.setDrawRange(0, calm ? Math.floor(packetCount * CONFIG.calm.density) : packetCount);
  });

  const setMat = (i: number, base = 1) => (m: THREE.Material | null) => {
    if (m) {
      m.userData.baseOpacity = base;
      m.transparent = true;
    }
    mats.current[i] = m;
  };
  const setSlab = (i: number) => (g: THREE.Group | null) => {
    slabs.current[i] = g;
  };

  return (
    <group ref={root} visible={false}>
      <group ref={rig} rotation={[CONFIG.baseRotation.x, CONFIG.baseRotation.y, 0]}>
        {/* 0 — frosted glass: real-time analytics & intelligence */}
        <group ref={setSlab(0)}>
          <mesh geometry={geo.glass} renderOrder={2}>
            {q === 2 ? (
              <meshPhysicalMaterial
                ref={setMat(0, 1)}
                color={CONFIG.colors.glass}
                transmission={0.85}
                roughness={0.55}
                thickness={0.2}
                ior={1.4}
                metalness={0}
                depthWrite={false}
              />
            ) : (
              <meshStandardMaterial
                ref={setMat(0, 0.35)}
                color={CONFIG.colors.glass}
                roughness={0.6}
                metalness={0}
                depthWrite={false}
              />
            )}
          </mesh>
          <lineSegments geometry={geo.edges}>
            <lineBasicMaterial ref={setMat(4, 0.6)} color={edgeColor} toneMapped={false} />
          </lineSegments>
        </group>
        {/* 1 — copper lattice: autonomous agent capabilities */}
        <group ref={setSlab(1)}>
          <mesh geometry={geo.lattice}>
            <meshStandardMaterial ref={setMat(1)} color={CONFIG.colors.copper} metalness={0.9} roughness={0.32} />
          </mesh>
        </group>
        {/* 2 — steel-blue plate: AI gaming infrastructure */}
        <group ref={setSlab(2)}>
          <mesh geometry={geo.plate}>
            <meshStandardMaterial ref={setMat(2)} color={CONFIG.colors.steel} metalness={0.85} roughness={0.35} />
          </mesh>
          <lineSegments geometry={geo.edges}>
            <lineBasicMaterial ref={setMat(5, 0.5)} color={edgeColor} toneMapped={false} />
          </lineSegments>
        </group>
        {/* 3 — graphite base with heat-sink fins: transaction & platform infrastructure */}
        <group ref={setSlab(3)}>
          <mesh geometry={geo.base}>
            <meshStandardMaterial ref={setMat(3)} color={CONFIG.colors.graphite} metalness={0.7} roughness={0.5} />
          </mesh>
        </group>
        <points geometry={packets.geometry} material={packets.material} frustumCulled={false} renderOrder={3} />
      </group>
    </group>
  );
}
