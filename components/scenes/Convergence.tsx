"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Text } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSceneStore } from "@/lib/scene-store";
import { TOKENS } from "@/lib/tokens";
import { useSceneFade } from "./shared/useSceneFade";
import vert from "./shaders/convergence.vert.glsl";
import frag from "./shaders/convergence.frag.glsl";

const CONFIG = {
  tubes: { 2: 600, 1: 300 } as Record<1 | 2, number>,
  tubularSegments: 64,
  radialSegments: 3,
  radius: 0.0045,
  xStart: -6.5,
  xEnd: 6.5,
  /** y of the three output bundles: top/middle/bottom thirds, matching the cards stacked in the right column (cols 9-12) */
  bundleY: [1.5, 0, -1.5] as const,
  laneSpacing: 0.032,
  chaosSpread: { y: 2.6, z: 1.6 },
  dashCount: 3,
  dashSpeed: 0.12,
  hover: { on: 2, off: 0.4 },
  gainLerp: 0.1,
  cube: {
    size: 1.3,
    plate: 0.07,
    spin: 0.18,
    tilt: 0.38,
    body: TOKENS.bgElev2,
    edge: TOKENS.copper,
    edgeBoost: 1.6,
    label: "AGENTIUM OS",
    /** Optional local .woff/.ttf for the engraving; undefined → troika default font */
    fontUrl: undefined as string | undefined,
  },
  colors: { chaos: TOKENS.text, order: TOKENS.steel, dash: TOKENS.copper },
  calm: { density: 0.4, speed: 0.5 },
};

type Q = 1 | 2;

function buildTubes(count: number) {
  const parts: THREE.BufferGeometry[] = [];
  const perBundle = Math.ceil(count / 3);
  const rnd = (a: number) => (Math.random() * 2 - 1) * a;
  for (let i = 0; i < count; i++) {
    // Interleave bundles so any prefix (calm draw range) covers all three.
    const bundle = i % 3;
    const lane = Math.floor(i / 3);
    const laneY = ((lane % 12) - 5.5) * CONFIG.laneSpacing;
    const laneZ = (Math.floor(lane / 12) / Math.max(1, Math.ceil(perBundle / 12)) - 0.5) * 0.35;
    const by = CONFIG.bundleY[bundle];
    const s = CONFIG.chaosSpread;
    let y = rnd(s.y);
    let z = rnd(s.z);
    const pts: THREE.Vector3[] = [new THREE.Vector3(CONFIG.xStart, y, z)];
    for (const x of [-5.0, -3.7, -2.5, -1.6]) {
      const pull = (x + 6.5) / 5;
      y = y * (1 - pull * 0.35) + rnd(0.9 * (1 - pull * 0.5));
      z = z * (1 - pull * 0.35) + rnd(0.6 * (1 - pull * 0.5));
      pts.push(new THREE.Vector3(x + rnd(0.25), y, z));
    }
    pts.push(new THREE.Vector3(-0.9, y * 0.12 + rnd(0.08), z * 0.12));
    pts.push(new THREE.Vector3(0, by * 0.15 + laneY * 0.6, laneZ * 0.5));
    pts.push(new THREE.Vector3(0.9, by * 0.22 + laneY, laneZ));
    pts.push(new THREE.Vector3(2.1, by * 0.3 + laneY, laneZ));
    pts.push(new THREE.Vector3(3.4, by * 0.85 + laneY, laneZ));
    pts.push(new THREE.Vector3(4.8, by + laneY, laneZ));
    pts.push(new THREE.Vector3(CONFIG.xEnd, by + laneY, laneZ));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const g = new THREE.TubeGeometry(curve, CONFIG.tubularSegments, CONFIG.radius, CONFIG.radialSegments, false);
    g.deleteAttribute("normal");
    const n = g.getAttribute("position").count;
    g.setAttribute("aBundle", new THREE.Float32BufferAttribute(new Float32Array(n).fill(bundle), 1));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Float32Array(n).fill(Math.random()), 1));
    parts.push(g);
  }
  const indexPerTube = parts[0]?.getIndex()?.count ?? 0;
  const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry();
  parts.forEach((p) => p.dispose());
  merged.computeBoundingSphere();
  return { geometry: merged, indexPerTube };
}

/** Intelligence-layer band: chaos → cube → three ordered bundles. Tubes are one draw call. */
export function Convergence() {
  const quality = useSceneStore((s) => s.quality);
  const q: Q = quality >= 2 ? 2 : 1;
  return <ConvergenceInner key={q} q={q} />;
}

function ConvergenceInner({ q }: { q: Q }) {
  const { opacity, isVisible } = useSceneFade("Convergence");
  const group = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Group>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const plateMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const edgeMat = useRef<THREE.LineBasicMaterial>(null);
  const time = useRef(0);
  const [live, setLive] = useState(false);
  const liveRef = useRef(false);
  const count = CONFIG.tubes[q];

  const tubes = useMemo(() => {
    const { geometry, indexPerTube } = buildTubes(count);
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uDashCount: { value: CONFIG.dashCount },
        uDashSpeed: { value: CONFIG.dashSpeed },
        uBundleGain: { value: [1, 1, 1] },
        uChaos: { value: new THREE.Color(CONFIG.colors.chaos) },
        uOrder: { value: new THREE.Color(CONFIG.colors.order) },
        uDash: { value: new THREE.Color(CONFIG.colors.dash) },
      },
    });
    return { geometry, material, indexPerTube };
  }, [count]);

  const cubeGeo = useMemo(() => {
    const s = CONFIG.cube.size;
    const body = new THREE.BoxGeometry(s, s, s);
    const plate = new THREE.BoxGeometry(s * 1.02, CONFIG.cube.plate, s * 1.02);
    const edges = new THREE.EdgesGeometry(body);
    return { body, plate, edges };
  }, []);

  const edgeColor = useMemo(() => new THREE.Color(CONFIG.cube.edge).multiplyScalar(CONFIG.cube.edgeBoost), []);

  useEffect(
    () => () => {
      tubes.geometry.dispose();
      tubes.material.dispose();
      cubeGeo.body.dispose();
      cubeGeo.plate.dispose();
      cubeGeo.edges.dispose();
    },
    [tubes, cubeGeo],
  );

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const visible = isVisible();
    g.visible = visible;
    if (visible !== liveRef.current) {
      liveRef.current = visible;
      setLive(visible);
    }
    if (!visible) return;
    const s = useSceneStore.getState();
    const calm = s.variant === "calm";
    time.current += dt * (calm ? CONFIG.calm.speed : 1);
    const o = opacity.current;

    const u = tubes.material.uniforms;
    u.uTime.value = time.current;
    u.uOpacity.value = o;
    const hovered = calm ? null : s.interaction.hoveredCard;
    const gains = u.uBundleGain.value as number[];
    for (let b = 0; b < 3; b++) {
      const target = typeof hovered === "number" ? (hovered === b ? CONFIG.hover.on : CONFIG.hover.off) : 1;
      gains[b] += (target - gains[b]) * Math.min(1, CONFIG.gainLerp * dt * 60);
    }
    const tubesShown = calm ? Math.floor(count * CONFIG.calm.density) : count;
    tubes.geometry.setDrawRange(0, tubesShown * tubes.indexPerTube);

    if (cube.current) {
      cube.current.rotation.y += dt * CONFIG.cube.spin * (calm ? CONFIG.calm.speed : 1);
      cube.current.rotation.x = CONFIG.cube.tilt * 0.5 + Math.sin(time.current * 0.3) * 0.05;
    }
    if (bodyMat.current) bodyMat.current.opacity = o;
    if (plateMat.current) plateMat.current.opacity = o;
    if (edgeMat.current) edgeMat.current.opacity = o;
  });

  const s = CONFIG.cube.size;
  const useTransmission = q === 2 && live;

  return (
    <group ref={group} visible={false}>
      <mesh geometry={tubes.geometry} material={tubes.material} frustumCulled={false} />
      <group ref={cube} rotation={[CONFIG.cube.tilt * 0.5, 0.6, 0]}>
        <mesh geometry={cubeGeo.body}>
          <meshStandardMaterial
            ref={bodyMat}
            color={CONFIG.cube.body}
            metalness={0.7}
            roughness={0.42}
            envMapIntensity={0.8}
            transparent
            opacity={0}
          />
        </mesh>
        <mesh geometry={cubeGeo.plate} position={[0, s / 2 + CONFIG.cube.plate / 2, 0]}>
          {useTransmission ? (
            <MeshTransmissionMaterial
              samples={4}
              resolution={256}
              thickness={0.15}
              roughness={0.25}
              transmission={1}
              chromaticAberration={0.03}
              anisotropicBlur={0.1}
              distortion={0}
              color={TOKENS.ivory}
              backside={false}
            />
          ) : (
            <meshPhysicalMaterial
              ref={plateMat}
              color={TOKENS.ivory}
              transmission={0.9}
              roughness={0.3}
              thickness={0.15}
              metalness={0}
              transparent
              opacity={0}
            />
          )}
        </mesh>
        <lineSegments geometry={cubeGeo.edges}>
          <lineBasicMaterial ref={edgeMat} color={edgeColor} toneMapped={false} transparent opacity={0} />
        </lineSegments>
        <Text
          position={[0, -0.05, s / 2 + 0.002]}
          fontSize={0.085}
          letterSpacing={0.12}
          anchorX="center"
          anchorY="middle"
          color={TOKENS.copperSoft}
          font={CONFIG.cube.fontUrl}
          fillOpacity={0.85}
        >
          {CONFIG.cube.label}
        </Text>
      </group>
    </group>
  );
}
