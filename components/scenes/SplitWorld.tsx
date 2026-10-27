"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneStore } from "@/lib/scene-store";
import { useSceneFade } from "@/components/scenes/shared/useSceneFade";
import { TOKENS } from "@/lib/tokens";
import splitVert from "./shaders/split-world-vert.glsl";
import splitFrag from "./shaders/split-world-frag.glsl";

const CONFIG = {
  /** Distance in front of the camera where the backdrop plane sits (behind other scenes at z≈0) */
  distance: 6,
  /** Overscan so edges never show during camera drift */
  overscan: 1.04,
  seamCentre: 0.5,
  /** Pointer x moves the seam ±8% */
  seamPointer: 0.08,
  seamLerp: 3,
  exposure: 0.9,
  bokehLayers: 4,
  calm: { density: 0.4, speed: 0.5 },
} as const;

export function SplitWorld() {
  const { opacity, isVisible } = useSceneFade("SplitWorld");
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const res = useMemo(() => {
    const c = (hex: string) => new THREE.Color(hex);
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: splitVert,
      fragmentShader: splitFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uSeam: { value: CONFIG.seamCentre },
        uAspect: { value: 1 },
        uDensity: { value: 1 },
        uLayers: { value: CONFIG.bokehLayers },
        uExposure: { value: CONFIG.exposure },
        uBg: { value: c(TOKENS.bg) },
        uSteel: { value: c(TOKENS.steel) },
        uBlue: { value: c(TOKENS.dataBlue) },
        uCopper: { value: c(TOKENS.copper) },
        uCopperSoft: { value: c(TOKENS.copperSoft) },
        uGold: { value: c(TOKENS.dataGold) },
      },
    });
    return { geo, mat };
  }, []);

  useEffect(() => () => { res.geo.dispose(); res.mat.dispose(); }, [res]);

  const motion = useRef({ time: 0, seam: CONFIG.seamCentre as number });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dtRaw) => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const vis = isVisible();
    g.visible = vis;
    if (!vis) return;

    const st = useSceneStore.getState();
    const calm = st.variant === "calm";
    const dt = Math.min(dtRaw, 0.05);
    const mo = motion.current;
    mo.time += dt * (calm ? CONFIG.calm.speed : 1);

    const targetSeam = CONFIG.seamCentre + (calm ? 0 : THREE.MathUtils.clamp(st.pointer.x, -1, 1) * CONFIG.seamPointer);
    mo.seam += (targetSeam - mo.seam) * Math.min(1, dt * CONFIG.seamLerp);

    // Pin the plane to the camera frustum so it always fills the viewport.
    const cam = state.camera as THREE.PerspectiveCamera;
    const d = CONFIG.distance;
    m.position.copy(cam.position).add(tmp.set(0, 0, -d).applyQuaternion(cam.quaternion));
    m.quaternion.copy(cam.quaternion);
    const fov = cam.isPerspectiveCamera ? cam.fov : 35;
    const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    const aspect = state.size.width / Math.max(1, state.size.height);
    m.scale.set(h * aspect * CONFIG.overscan, h * CONFIG.overscan, 1);

    const u = res.mat.uniforms;
    u.uTime.value = mo.time;
    u.uOpacity.value = opacity.current;
    u.uSeam.value = mo.seam;
    u.uAspect.value = aspect;
    u.uDensity.value = calm ? CONFIG.calm.density : 1;
    u.uLayers.value = st.quality === 1 ? CONFIG.bokehLayers / 2 : CONFIG.bokehLayers;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={mesh} geometry={res.geo} material={res.mat} frustumCulled={false} renderOrder={-10} />
    </group>
  );
}
