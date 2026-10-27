"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSceneStore } from "@/lib/scene-store";
import { TOKENS } from "@/lib/tokens";
import { useSceneFade } from "./shared/useSceneFade";
import glowVert from "./shaders/turbine-glow-vert.glsl";
import glowFrag from "./shaders/turbine-glow-frag.glsl";

const CONFIG = {
  ringRadius: 1.05,
  ringTube: 0.055,
  blades: 28,
  bladeInner: 0.2,
  bladeOuter: 0.76,
  bladePitch: 0.55,
  bladeSpeed: 0.35, // rad/s
  steps: 5,
  /** progress thresholds 0.2, 0.4 ... 1.0 minus this tolerance (ScrollTrigger rarely hits exactly 1) */
  thresholdEps: 0.015,
  tokenDamp: 3.2,
  tokenRadius: 0.052,
  haloSize: 0.55,
  markerRadius: 0.032,
  tilt: { x: -0.42, y: 0.32 },
  desktopX: 1.05,
  mobileFill: 0.4,
  refViewportHeight: 3.15,
  pointerTilt: 0.12,
  calmDensity: 0.4,
  calmSpeed: 0.5,
  envIntensity: 0.9,
} as const;

const NAME = "Turbine" as const;
/** Angle of slot k (0 = home at 12 o'clock, 1..5 = step markers), clockwise. */
const slotAngle = (k: number) => Math.PI / 2 - k * ((Math.PI * 2) / (CONFIG.steps + 1));

const COPPER = new THREE.Color(TOKENS.copper);
const COPPER_HOT = new THREE.Color(TOKENS.copperSoft).multiplyScalar(2.4);
const MARKER_OFF = new THREE.Color(TOKENS.lineStrong);

export function Turbine() {
  const { opacity, isVisible } = useSceneFade(NAME);
  const quality = useSceneStore((s) => s.quality);
  const gl = useThree((s) => s.gl);

  const group = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const blades = useRef<THREE.InstancedMesh>(null);
  const markers = useRef<THREE.InstancedMesh>(null);
  const token = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const tokenLight = useRef<THREE.PointLight>(null);

  const calm = useRef(false);
  const layoutFor = useRef(-1);
  const tokenPos = useRef(0);
  const markerGlow = useRef<number[]>(new Array<number>(CONFIG.steps).fill(0));

  const bladeCount = quality === 1 ? Math.floor(CONFIG.blades / 2) : CONFIG.blades;

  const metal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(TOKENS.textDim),
        metalness: 0.9,
        roughness: 0.35,
        envMapIntensity: CONFIG.envIntensity,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const bladeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(TOKENS.lineStrong).lerp(new THREE.Color(TOKENS.steel), 0.35),
        metalness: 0.85,
        roughness: 0.42,
        envMapIntensity: CONFIG.envIntensity,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const markerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0 }),
    [],
  );
  const tokenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COPPER_HOT.clone(),
        toneMapped: false,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowVert,
        fragmentShader: glowFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uColor: { value: COPPER.clone() },
          uIntensity: { value: 1.4 },
          uOpacity: { value: 0 },
          uSize: { value: CONFIG.haloSize },
        },
      }),
    [],
  );

  const geos = useMemo(
    () => ({
      ring: new THREE.TorusGeometry(CONFIG.ringRadius, CONFIG.ringTube, 32, 220),
      shroud: new THREE.TorusGeometry(CONFIG.bladeOuter + 0.03, 0.014, 12, 160),
      hub: new THREE.CylinderGeometry(CONFIG.bladeInner, CONFIG.bladeInner, 0.12, 48).rotateX(Math.PI / 2),
      blade: new THREE.BoxGeometry(CONFIG.bladeOuter - CONFIG.bladeInner, 0.085, 0.012).translate(
        (CONFIG.bladeOuter + CONFIG.bladeInner) / 2,
        0,
        0,
      ),
      marker: new THREE.SphereGeometry(CONFIG.markerRadius, 16, 12),
      token: new THREE.SphereGeometry(CONFIG.tokenRadius, 24, 16),
      halo: new THREE.PlaneGeometry(1, 1),
    }),
    [],
  );

  // Local studio environment for the metal (no network, scoped to these materials only)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    metal.envMap = env;
    bladeMat.envMap = env;
    metal.needsUpdate = true;
    bladeMat.needsUpdate = true;
    return () => {
      env.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
      });
    };
  }, [gl, metal, bladeMat]);

  // static marker placement
  useEffect(() => {
    const m = markers.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    for (let k = 1; k <= CONFIG.steps; k++) {
      const a = slotAngle(k);
      mat.makeTranslation(Math.cos(a) * CONFIG.ringRadius, Math.sin(a) * CONFIG.ringRadius, CONFIG.ringTube * 0.9);
      m.setMatrixAt(k - 1, mat);
      m.setColorAt(k - 1, MARKER_OFF);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => {
    layoutFor.current = -1; // force blade relayout when instance count changes
  }, [bladeCount]);

  useFrame((state, dt) => {
    const g = group.current;
    const o = opacity.current;
    const visible = isVisible();
    // lights live outside the group (constant light count → no shader recompiles); fade them instead
    if (keyLight.current) keyLight.current.intensity = 2.2 * o;
    if (tokenLight.current) tokenLight.current.intensity = 1.6 * o;
    if (!g) return;
    g.visible = visible;
    metal.opacity = o;
    bladeMat.opacity = o;
    markerMat.opacity = o;
    tokenMat.opacity = o;
    haloMat.uniforms.uOpacity.value = o;
    if (!visible) return;

    const st = useSceneStore.getState();
    if (st.activeScene === NAME) calm.current = st.variant === "calm";
    const isCalm = calm.current;
    const motion = st.reducedMotion ? 0 : 1;
    const speed = (isCalm ? CONFIG.calmSpeed : 1) * motion;

    // layout
    const vp = state.viewport;
    const desktop = vp.aspect > 1;
    // framing is authored for a viewport 3.15 units tall (camera z~5); rescale for the shared camera
    const unit = vp.height / CONFIG.refViewportHeight;
    const fit = desktop ? unit : Math.min(unit, (vp.width * CONFIG.mobileFill) / CONFIG.ringRadius);
    g.position.x = desktop ? CONFIG.desktopX * unit : 0;
    g.scale.setScalar(fit);
    haloMat.uniforms.uSize.value = CONFIG.haloSize * fit;
    const kRot = 1 - Math.exp(-dt * 3);
    const px = isCalm ? 0 : st.pointer.x * CONFIG.pointerTilt;
    const py = isCalm ? 0 : st.pointer.y * CONFIG.pointerTilt;
    g.rotation.x += (CONFIG.tilt.x - py - g.rotation.x) * kRot;
    g.rotation.y += (CONFIG.tilt.y + px - g.rotation.y) * kRot;

    // blades: evenly re-laid when density changes (calm shows 40%)
    const visibleBlades = Math.max(3, Math.round(bladeCount * (isCalm ? CONFIG.calmDensity : 1)));
    const b = blades.current;
    if (b && layoutFor.current !== visibleBlades) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const one = new THREE.Vector3(1, 1, 1);
      const zero = new THREE.Vector3();
      for (let i = 0; i < visibleBlades; i++) {
        e.set(CONFIG.bladePitch, 0, (i / visibleBlades) * Math.PI * 2, "ZYX");
        q.setFromEuler(e);
        m.compose(zero, q, one);
        b.setMatrixAt(i, m);
      }
      b.count = visibleBlades;
      b.instanceMatrix.needsUpdate = true;
      layoutFor.current = visibleBlades;
    }
    if (rotor.current) rotor.current.rotation.z -= dt * CONFIG.bladeSpeed * speed * (1 + st.progress * 0.6);

    // token: hold at the last reached step, ease between stops
    let reached = 0;
    for (let k = 1; k <= CONFIG.steps; k++) {
      if (st.progress >= k / CONFIG.steps - CONFIG.thresholdEps) reached = k;
    }
    const kTok = st.reducedMotion ? 1 : 1 - Math.exp(-dt * CONFIG.tokenDamp * (isCalm ? CONFIG.calmSpeed : 1));
    tokenPos.current += (reached - tokenPos.current) * kTok;
    if (Math.abs(reached - tokenPos.current) < 1e-4) tokenPos.current = reached;
    const a = slotAngle(tokenPos.current);
    const tx = Math.cos(a) * CONFIG.ringRadius;
    const ty = Math.sin(a) * CONFIG.ringRadius;
    const tz = CONFIG.ringTube * 1.2;
    if (token.current) token.current.position.set(tx, ty, tz);
    const moving = Math.abs(reached - tokenPos.current);
    const pulse = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 3.0);
    haloMat.uniforms.uIntensity.value = (1.1 + Math.min(1, moving) * 0.8) * pulse;
    if (tokenLight.current) {
      // light follows the token in world space
      tokenLight.current.position.set(tx, ty, tz + 0.25).applyMatrix4(g.matrixWorld);
    }

    // markers light when the token arrives
    const mk = markers.current;
    if (mk) {
      const c = new THREE.Color();
      const kM = 1 - Math.exp(-dt * 6);
      for (let k = 1; k <= CONFIG.steps; k++) {
        const lit = tokenPos.current >= k - 0.06 ? 1 : 0;
        const gv = markerGlow.current;
        gv[k - 1] += (lit - gv[k - 1]) * kM;
        c.copy(MARKER_OFF).lerp(COPPER_HOT, gv[k - 1]);
        mk.setColorAt(k - 1, c);
      }
      if (mk.instanceColor) mk.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <directionalLight ref={keyLight} position={[3, 4, 5]} intensity={0} color={TOKENS.ivory} />
      <pointLight ref={tokenLight} intensity={0} distance={2.5} decay={2} color={TOKENS.copper} />
      <group ref={group} visible={false}>
        <mesh geometry={geos.ring} material={metal} />
        <mesh geometry={geos.shroud} material={metal} />
        <group ref={rotor}>
          <mesh geometry={geos.hub} material={metal} />
          <instancedMesh ref={blades} args={[geos.blade, bladeMat, bladeCount]} key={bladeCount} />
        </group>
        <instancedMesh ref={markers} args={[geos.marker, markerMat, CONFIG.steps]} />
        <group ref={token}>
          <mesh geometry={geos.token} material={tokenMat} />
          <mesh geometry={geos.halo} material={haloMat} renderOrder={3} frustumCulled={false} />
        </group>
      </group>
    </>
  );
}
