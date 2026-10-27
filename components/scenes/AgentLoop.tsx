"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSceneStore } from "@/lib/scene-store";
import { TOKENS } from "@/lib/tokens";
import { useSceneFade } from "./shared/useSceneFade";
import ringVert from "./shaders/agentloop-ring-vert.glsl";
import ringFrag from "./shaders/agentloop-ring-frag.glsl";
import particlesVert from "./shaders/agentloop-particles-vert.glsl";
import particlesFrag from "./shaders/agentloop-particles-frag.glsl";

const CONFIG = {
  radius: 1.0,
  lineWidth: 0.022,
  /** Base (dim) brightness of every quadrant */
  baseLevel: 0.2,
  /** Sequence timing when a preset is chosen */
  stepMs: 900,
  /** Glow levels */
  activeLevel: 1.0,
  doneLevel: 0.38,
  holdOthersLevel: 0.3,
  levelDamp: 8,
  /** Background particles */
  particles: 3200,
  particleSize: 2.2,
  orbitSpeed: 0.06,
  /** Layout */
  desktopX: 1.2,
  mobileFill: 0.42, // fraction of viewport width the ring radius may occupy on mobile
  refViewportHeight: 3.15,
  pointerTilt: 0.18,
  calmDensity: 0.4,
  calmSpeed: 0.5,
} as const;

const NAME = "AgentLoop" as const;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function AgentLoop() {
  const { opacity, isVisible } = useSceneFade(NAME);
  const quality = useSceneStore((s) => s.quality);
  const gl = useThree((s) => s.gl);
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  const calm = useRef(false);
  const levels = useRef(new THREE.Vector4(0, 0, 0, 0));

  const count = quality === 1 ? Math.floor(CONFIG.particles / 2) : CONFIG.particles;

  const ringGeo = useMemo(
    () => new THREE.RingGeometry(CONFIG.radius * 0.8, CONFIG.radius * 1.18, 256, 1),
    [],
  );

  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uColA: { value: new THREE.Color(TOKENS.dataRed) },
          uColB: { value: new THREE.Color(TOKENS.dataBlue) },
          uColC: { value: new THREE.Color(TOKENS.dataGreen) },
          uColD: { value: new THREE.Color(TOKENS.dataGold) },
          uGuide: { value: new THREE.Color(TOKENS.lineStrong) },
          uLevel: { value: new THREE.Vector4() },
          uFill: { value: new THREE.Vector4(1, 1, 1, 1) },
          uBase: { value: CONFIG.baseLevel },
          uRadius: { value: CONFIG.radius },
          uWidth: { value: CONFIG.lineWidth },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
        },
      }),
    [],
  );

  const pointsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = rng(1337);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // radial spread biased toward the ring
      const u = rand() * 2 - 1;
      const spread = Math.sign(u) * Math.pow(Math.abs(u), 2.2) * 1.1;
      seeds[i * 4] = spread;
      seeds[i * 4 + 1] = rand() * Math.PI * 2;
      seeds[i * 4 + 2] = -(CONFIG.orbitSpeed * (0.5 + rand())) * (1.0 / (1.0 + Math.abs(spread)));
      seeds[i * 4 + 3] = (rand() - 0.5) * 0.8;
    }
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    // position attribute is required for drawRange / bounding; values unused by the shader
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), CONFIG.radius * 3);
    return g;
  }, [count]);

  const pointsMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particlesVert,
        fragmentShader: particlesFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uRadius: { value: CONFIG.radius },
          uSize: { value: CONFIG.particleSize },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color(TOKENS.steel) },
          uAccent: { value: new THREE.Color(TOKENS.dataGold) },
          uAccentMix: { value: 0 },
          uOpacity: { value: 0 },
        },
      }),
    [],
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const visible = isVisible();
    g.visible = visible;
    const o = opacity.current;
    ringMat.uniforms.uOpacity.value = o;
    pointsMat.uniforms.uOpacity.value = o;
    if (!visible) return;

    const st = useSceneStore.getState();
    if (st.activeScene === NAME) calm.current = st.variant === "calm";
    const isCalm = calm.current;
    const motion = st.reducedMotion ? 0 : 1;
    const speed = (isCalm ? CONFIG.calmSpeed : 1) * motion;
    time.current += dt * speed;

    // layout: right of centre on desktop, centred and fitted on mobile
    const vp = state.viewport;
    const desktop = vp.aspect > 1;
    // framing is authored for a viewport 3.15 units tall (camera z~5); rescale for the shared camera
    const unit = vp.height / CONFIG.refViewportHeight;
    const fit = desktop ? unit : Math.min(unit, (vp.width * CONFIG.mobileFill) / CONFIG.radius);
    g.position.x = desktop ? CONFIG.desktopX * unit : 0;
    g.scale.setScalar(fit);
    const tx = isCalm ? 0 : st.pointer.y * CONFIG.pointerTilt;
    const ty = isCalm ? 0 : st.pointer.x * CONFIG.pointerTilt;
    const kRot = 1 - Math.exp(-dt * 3);
    g.rotation.x += (-tx - g.rotation.x) * kRot;
    g.rotation.y += (ty - g.rotation.y) * kRot;

    // preset sequence
    const preset = st.interaction.agentPreset;
    const startedAt = st.interaction.agentPresetStartedAt;
    const target = [0, 0, 0, 0];
    const fill = ringMat.uniforms.uFill.value as THREE.Vector4;
    let accent = 0;
    if (preset && typeof startedAt === "number") {
      const step = Math.max(0, (performance.now() - startedAt) / CONFIG.stepMs);
      const cur = Math.floor(step);
      const f = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        f[i] = Math.min(1, Math.max(0, step - i));
        if (cur >= 4) {
          target[i] =
            i === 3
              ? CONFIG.activeLevel * (0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 2.2))
              : CONFIG.holdOthersLevel;
        } else if (i < cur) target[i] = CONFIG.doneLevel;
        else if (i === cur) target[i] = CONFIG.activeLevel;
      }
      fill.set(f[0], f[1], f[2], f[3]);
      accent = cur >= 4 ? 0.35 : 0;
    } else {
      fill.set(1, 1, 1, 1);
      // gentle idle breathing travelling around the loop
      const t = time.current;
      for (let i = 0; i < 4; i++) target[i] = 0.06 + 0.06 * Math.max(0, Math.sin(t * 1.2 - i * 1.4));
    }
    const lv = levels.current;
    const kL = 1 - Math.exp(-dt * CONFIG.levelDamp);
    lv.x += (target[0] - lv.x) * kL;
    lv.y += (target[1] - lv.y) * kL;
    lv.z += (target[2] - lv.z) * kL;
    lv.w += (target[3] - lv.w) * kL;
    (ringMat.uniforms.uLevel.value as THREE.Vector4).copy(lv);
    ringMat.uniforms.uTime.value = time.current;

    const pu = pointsMat.uniforms;
    pu.uTime.value = time.current;
    pu.uPixelRatio.value = gl.getPixelRatio();
    pu.uAccentMix.value += (accent - (pu.uAccentMix.value as number)) * kL;
    const drawCount = Math.floor(count * (isCalm ? CONFIG.calmDensity : 1));
    if (pointsGeo.drawRange.count !== drawCount) pointsGeo.setDrawRange(0, drawCount);
  });

  return (
    <group ref={group} visible={false}>
      <points geometry={pointsGeo} material={pointsMat} frustumCulled={false} renderOrder={1} />
      <mesh geometry={ringGeo} material={ringMat} renderOrder={2} />
    </group>
  );
}
