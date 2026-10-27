"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/lib/scene-store";
import { TOKENS } from "@/lib/tokens";
import series from "@/content/data/volume-series.json";
import { useSceneFade } from "./shared/useSceneFade";
import vert from "./shaders/volumeBreak.vert.glsl";
import frag from "./shaders/volumeBreak.frag.glsl";

const CONFIG = {
  subLines: 1500,
  /** progress window mapped to uSplit 0→1 (smoothstep) */
  splitStart: 0.4,
  splitEnd: 0.6,
  splitLerp: 0.12,
  fracture: 0.45,
  /** chart width as a fraction of the visible viewport width */
  widthFrac: 0.82,
  maxWidth: 9,
  baseY: -1.1,
  humanHeight: 0.9,
  agentHeight: 3.4,
  subAlpha: 0.09,
  colors: { human: TOKENS.text, copper: TOKENS.copper, steel: TOKENS.steel },
  calm: { density: 0.4, speed: 0.5 },
};

interface Series {
  human: number[];
  agent: number[];
}

function readSeries(): Series {
  const s = series as Partial<Series>;
  const ok = (a: unknown): a is number[] => Array.isArray(a) && a.length > 1 && a.every((v) => typeof v === "number");
  if (ok(s.human) && ok(s.agent) && s.human.length === s.agent.length) return { human: s.human, agent: s.agent };
  // Fallback synthetic series (keeps the scene alive if the data file changes shape).
  const n = 120;
  return {
    human: Array.from({ length: n }, (_, i) => 15 + Math.sin(i / 9) * 2 + i * 0.1),
    agent: Array.from({ length: n }, (_, i) => 30 * Math.pow(2000 / 30, i / (n - 1))),
  };
}

/** Shift band: human volume line fractures into 1,500 agent sub-lines. One instanced draw call. */
export function VolumeBreak() {
  const { opacity, isVisible } = useSceneFade("VolumeBreak");
  const group = useRef<THREE.Group>(null);
  const split = useRef(0);
  const time = useRef(0);
  const origin = useMemo(() => new THREE.Vector3(), []);

  const { geometry, material, instances } = useMemo(() => {
    const { human, agent } = readSeries();
    const n = human.length;
    const hMax = Math.max(...human);
    const aMax = Math.max(...agent);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = i / (n - 1);
      pos[i * 3 + 1] = CONFIG.baseY + (human[i] / hMax) * CONFIG.humanHeight;
      pos[i * 3 + 2] = CONFIG.baseY + (agent[i] / aMax) * CONFIG.agentHeight;
    }
    const index: number[] = [];
    for (let i = 0; i < n - 1; i++) index.push(i, i + 1);

    const instances = CONFIG.subLines + 1;
    const rank = new Float32Array(instances);
    const seed = new Float32Array(instances);
    rank[0] = -1;
    seed[0] = 0;
    for (let i = 1; i < instances; i++) {
      rank[i] = (i - 1) / (CONFIG.subLines - 1);
      seed[i] = Math.random();
    }
    // Shuffle rank so the calm-variant prefix still spans the full fan.
    for (let i = instances - 1; i > 1; i--) {
      const j = 1 + Math.floor(Math.random() * i);
      const tmp = rank[i];
      rank[i] = rank[j];
      rank[j] = tmp;
    }

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setIndex(index);
    geometry.setAttribute("aRank", new THREE.InstancedBufferAttribute(rank, 1));
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    geometry.instanceCount = instances;

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSplit: { value: 0 },
        uWidth: { value: 8 },
        uTime: { value: 0 },
        uFracture: { value: CONFIG.fracture },
        uHuman: { value: new THREE.Color(CONFIG.colors.human) },
        uCopper: { value: new THREE.Color(CONFIG.colors.copper) },
        uSteel: { value: new THREE.Color(CONFIG.colors.steel) },
        uOpacity: { value: 0 },
        uSubAlpha: { value: CONFIG.subAlpha },
      },
    });
    return { geometry, material, instances };
  }, []);

  const quality = useSceneStore((s) => s.quality);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const visible = isVisible();
    g.visible = visible;
    if (!visible) return;
    const s = useSceneStore.getState();
    const calm = s.variant === "calm";
    time.current += dt * (calm ? CONFIG.calm.speed : 1);

    const target = THREE.MathUtils.smoothstep(s.progress, CONFIG.splitStart, CONFIG.splitEnd);
    split.current += (target - split.current) * Math.min(1, CONFIG.splitLerp * dt * 60);

    const vp = state.viewport.getCurrentViewport(state.camera, origin);
    const u = material.uniforms;
    u.uSplit.value = split.current;
    u.uWidth.value = Math.min(CONFIG.maxWidth, vp.width * CONFIG.widthFrac);
    u.uTime.value = time.current;
    u.uOpacity.value = opacity.current;
    // Tier 1 → half the sub-lines (compensate alpha); calm → 40%.
    const density = (quality >= 2 ? 1 : 0.5) * (calm ? CONFIG.calm.density : 1);
    geometry.instanceCount = Math.max(1, Math.floor(instances * density));
    u.uSubAlpha.value = CONFIG.subAlpha * Math.min(2, 1 / density);
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
