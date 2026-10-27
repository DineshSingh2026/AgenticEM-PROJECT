"use client";
import { useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSceneStore } from "@/lib/scene-store";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import type { SimEventOf } from "@/lib/sim/types";
import { TOKENS } from "@/lib/tokens";
import { useSceneFade } from "./shared/useSceneFade";
import noise from "./shaders/noise.glsl";
import waveVert from "./shaders/anomalystream-wave-vert.glsl";
import waveFrag from "./shaders/anomalystream-wave-frag.glsl";

const CONFIG = {
  maxSpikes: 24, // must match SPIKES in anomalystream-wave-frag.glsl
  /** fraction of viewport height the waveform plane covers (centred vertically) */
  heightFrac: 0.62,
  scrollSpeed: 0.32, // world units / s
  linePx: 1.6,
  /** max spike height as a fraction of the plane height */
  spikeHeight: 0.36,
  minSpike: 0.08,
  severity: { low: 0, med: 0.45, high: 1 },
  pointerAmount: 1,
  calmDensity: 0.4,
  calmSpeed: 0.5,
} as const;

const NAME = "AnomalyStream" as const;

export function AnomalyStream() {
  const { opacity, isVisible } = useSceneFade(NAME);
  const mesh = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const scroll = useRef(0);
  const halfW = useRef(3);
  const planeH = useRef(1.5);
  const slot = useRef(0);
  const calm = useRef(false);
  const pointerAmt = useRef(0);

  const spikes = useMemo(
    () => Array.from({ length: CONFIG.maxSpikes }, () => new THREE.Vector4(0, 0, 0, 0)),
    [],
  );

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waveVert,
        fragmentShader: noise + "\n" + waveFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uWidth: { value: 6 },
          uHeight: { value: 1.5 },
          uOpacity: { value: 0 },
          uDensity: { value: 1 },
          uLinePx: { value: CONFIG.linePx },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uSteel: { value: new THREE.Color(TOKENS.steel) },
          uDim: { value: new THREE.Color(TOKENS.textDim) },
          uCopper: { value: new THREE.Color(TOKENS.copper) },
          uRed: { value: new THREE.Color(TOKENS.dataRed) },
          uSpikes: { value: spikes },
        },
      }),
    [spikes],
  );

  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), []);

  const onAnomaly = useCallback(
    (e: SimEventOf<"anomaly.detected">) => {
      const st = useSceneStore.getState();
      if (st.activeScene !== NAME) return; // only collect while the band is on screen
      if (calm.current && Math.random() > CONFIG.calmDensity) return;
      const raw = Number.isFinite(e.score) ? e.score : 0.5;
      const norm = Math.min(1, Math.max(0, raw > 1 ? raw / 100 : raw));
      const h = planeH.current * (CONFIG.minSpike + (CONFIG.spikeHeight - CONFIG.minSpike) * norm);
      const s = spikes[slot.current];
      // enters just inside the right edge, in scroll space so it travels with the waveform
      s.set(scroll.current + halfW.current * 0.96, time.current, h, CONFIG.severity[e.severity] ?? 0);
      // tier 1 keeps half as many live spikes
      const cap = st.quality === 1 ? CONFIG.maxSpikes / 2 : CONFIG.maxSpikes;
      if (st.quality === 1) for (let i = cap; i < CONFIG.maxSpikes; i++) spikes[i].z = 0;
      slot.current = (slot.current + 1) % cap;
    },
    [spikes],
  );
  useSimFeed("anomaly.detected", onAnomaly);

  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    const visible = isVisible();
    m.visible = visible;
    const u = mat.uniforms;
    u.uOpacity.value = opacity.current;
    if (!visible) return;

    const st = useSceneStore.getState();
    if (st.activeScene === NAME) calm.current = st.variant === "calm";
    const isCalm = calm.current;
    const motion = st.reducedMotion ? 0 : 1;
    const speed = (isCalm ? CONFIG.calmSpeed : 1) * motion;
    time.current += dt * speed;
    scroll.current += dt * CONFIG.scrollSpeed * speed;

    // full-width, vertically centred framing
    const vp = state.viewport.getCurrentViewport(state.camera, [0, 0, 0]);
    const w = vp.width * 1.02;
    const h = vp.height * CONFIG.heightFrac;
    m.scale.set(w, h, 1);
    m.position.set(0, 0, 0);
    halfW.current = w / 2;
    planeH.current = h;

    // retire spikes that have scrolled off the left edge
    for (const s of spikes) {
      if (s.z > 0 && s.x - scroll.current < -halfW.current - 0.3) s.z = 0;
    }

    const kP = 1 - Math.exp(-dt * 4);
    pointerAmt.current += ((isCalm ? 0 : CONFIG.pointerAmount) - pointerAmt.current) * kP;
    (u.uPointer.value as THREE.Vector2).set(st.pointer.x * halfW.current, pointerAmt.current);
    u.uTime.value = time.current;
    u.uScroll.value = scroll.current;
    u.uWidth.value = w;
    u.uHeight.value = h;
    u.uDensity.value += ((isCalm ? CONFIG.calmDensity : 1) - (u.uDensity.value as number)) * kP;
  });

  return <mesh ref={mesh} geometry={geo} material={mat} visible={false} frustumCulled={false} />;
}
