"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useSceneStore } from "@/lib/scene-store";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import type { SimEventOf } from "@/lib/sim/types";
import { TOKENS } from "@/lib/tokens";
import { useSceneFade } from "./shared/useSceneFade";
import edgeVert from "./shaders/ledger-edge-vert.glsl";
import edgeFrag from "./shaders/ledger-edge-frag.glsl";

const CONFIG = {
  maxVisible: 14,
  calmVisible: 6, // ~40% density for the calm (/trust) hero
  seedBlocks: 10,
  blockSize: 0.42,
  spacing: 0.68,
  connector: { thickness: 0.035, depth: 0.05 },
  /** head (newest) block anchor in group space */
  desktopAnchorX: 1.1,
  mobileAnchorX: 0.25,
  mobileFill: 0.85,
  refViewportHeight: 3.15,
  tilt: { x: 0.18, y: -0.42 },
  pointerTilt: 0.1,
  /** newest-block timeline, seconds */
  popIn: 0.25,
  typeOut: 0.8,
  glowIn: 0.3,
  shiftDelay: 1.05,
  shiftDamp: 4.5,
  residualGlow: 0.12,
  glowDecay: 1.6,
  textSize: 0.052,
  calmSpeed: 0.5,
  envIntensity: 0.7,
} as const;

const NAME = "Ledger" as const;

interface TroikaText extends THREE.Mesh {
  text: string;
  color: THREE.ColorRepresentation;
  fillOpacity: number;
  sync: (cb?: () => void) => void;
}

interface Entry {
  height: number;
  hash: string; // 64 hex chars, no prefix
  tx: number;
  born: number; // scene-clock seconds
  glow: number;
}

function seededHash(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  let out = "";
  for (let i = 0; i < 64; i++) {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    out += (s & 15).toString(16);
  }
  return out;
}

function cleanHash(h: string) {
  const hex = h.replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "").toLowerCase();
  return (hex + "0".repeat(64)).slice(0, 64);
}

function fullLabel(e: Entry) {
  return `BLOCK #${e.height}  //  ${e.tx} TX\n0x${e.hash.slice(0, 32)}\n  ${e.hash.slice(32)}`;
}

const COPPER = new THREE.Color(TOKENS.copper);
const STEEL = new THREE.Color(TOKENS.steel);

export function Ledger() {
  const { opacity, isVisible } = useSceneFade(NAME);
  const quality = useSceneStore((s) => s.quality);
  const gl = useThree((s) => s.gl);

  const group = useRef<THREE.Group>(null);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const edges = useRef<THREE.InstancedMesh>(null);
  const links = useRef<THREE.InstancedMesh>(null);
  const text = useRef<TroikaText>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const fillLight = useRef<THREE.PointLight>(null);

  const time = useRef(0);
  const shift = useRef(0);
  const mono = useRef(0);
  const calm = useRef(false);
  const shownChars = useRef(-1);
  const shownFor = useRef(-1);

  const capacity = (quality === 1 ? Math.ceil(CONFIG.maxVisible / 2) : CONFIG.maxVisible) + 1;

  const chain = useRef<Entry[]>([]);
  if (chain.current.length === 0) {
    const base = 18_400_000;
    for (let i = 0; i < CONFIG.seedBlocks; i++) {
      chain.current.unshift({ height: base + i, hash: seededHash(base + i), tx: 40 + ((i * 37) % 160), born: -100, glow: 0 });
    }
  }

  const geos = useMemo(
    () => ({
      block: new THREE.BoxGeometry(CONFIG.blockSize, CONFIG.blockSize, CONFIG.blockSize),
      shell: new THREE.BoxGeometry(CONFIG.blockSize * 1.012, CONFIG.blockSize * 1.012, CONFIG.blockSize * 1.012),
      link: new THREE.BoxGeometry(1, CONFIG.connector.thickness, CONFIG.connector.depth),
    }),
    [],
  );

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(TOKENS.bgElev2),
        metalness: 0.55,
        roughness: 0.5,
        envMapIntensity: CONFIG.envIntensity,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const linkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: COPPER.clone(),
        emissive: COPPER.clone(),
        emissiveIntensity: 0.25,
        metalness: 0.85,
        roughness: 0.3,
        envMapIntensity: CONFIG.envIntensity,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const edgeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: edgeVert,
        fragmentShader: edgeFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uBase: { value: new THREE.Color(TOKENS.lineStrong) },
          uGlow: { value: COPPER.clone() },
          uOpacity: { value: 0 },
          uFadeLeft: { value: -3 },
        },
      }),
    [],
  );
  const stateAttr = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2),
    [capacity],
  );
  useEffect(() => {
    geos.shell.setAttribute("aState", stateAttr);
  }, [geos, stateAttr]);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    bodyMat.envMap = env;
    linkMat.envMap = env;
    bodyMat.needsUpdate = true;
    linkMat.needsUpdate = true;
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
  }, [gl, bodyMat, linkMat]);

  const onBlock = useCallback((e: SimEventOf<"block.confirmed">) => {
    const st = useSceneStore.getState();
    const active = st.activeScene === NAME;
    const entry: Entry = {
      height: e.height,
      hash: cleanHash(e.hash),
      tx: e.txCount,
      born: active ? time.current : -100,
      glow: active ? 0 : CONFIG.residualGlow,
    };
    const c = chain.current;
    c.unshift(entry);
    if (c.length > CONFIG.maxVisible + 1) c.length = CONFIG.maxVisible + 1;
    if (active) shift.current += 1;
  }, []);
  useSimFeed("block.confirmed", onBlock);

  useFrame((state, dt) => {
    const g = group.current;
    const o = opacity.current;
    if (keyLight.current) keyLight.current.intensity = 2.0 * o;
    if (fillLight.current) fillLight.current.intensity = 1.2 * o;
    if (!g) return;
    const visible = isVisible();
    g.visible = visible;
    bodyMat.opacity = o;
    linkMat.opacity = o;
    edgeMat.uniforms.uOpacity.value = o;
    if (text.current) text.current.fillOpacity = o;
    if (!visible) return;

    const st = useSceneStore.getState();
    if (st.activeScene === NAME) calm.current = st.variant === "calm";
    const isCalm = calm.current;
    const motion = st.reducedMotion ? 0 : 1;
    const speed = isCalm ? CONFIG.calmSpeed : 1;
    // reduced motion: timeline completes instantly
    time.current += st.reducedMotion ? 100 : dt * speed;
    const t = time.current;

    // layout
    const vp = state.viewport;
    const desktop = vp.aspect > 1;
    // framing is authored for a viewport 3.15 units tall (camera z≈5); rescale for the shared camera
    const unit = vp.height / CONFIG.refViewportHeight;
    const fit = desktop ? unit : Math.min(unit, (vp.width * CONFIG.mobileFill) / (CONFIG.spacing * 4));
    g.scale.setScalar(fit);
    const anchor = desktop ? CONFIG.desktopAnchorX : CONFIG.mobileAnchorX;
    const kRot = 1 - Math.exp(-dt * 3);
    const px = isCalm || !motion ? 0 : st.pointer.x * CONFIG.pointerTilt;
    const py = isCalm || !motion ? 0 : st.pointer.y * CONFIG.pointerTilt;
    g.rotation.x += (CONFIG.tilt.x - py - g.rotation.x) * kRot;
    g.rotation.y += (CONFIG.tilt.y + px - g.rotation.y) * kRot;
    edgeMat.uniforms.uFadeLeft.value = -vp.width / 2 - 0.2 * unit;

    // monochrome for the calm (/trust) hero
    const kM = 1 - Math.exp(-dt * 4);
    mono.current += ((isCalm ? 1 : 0) - mono.current) * kM;
    const accent = new THREE.Color().copy(COPPER).lerp(STEEL, mono.current);
    (edgeMat.uniforms.uGlow.value as THREE.Color).copy(accent);
    linkMat.color.copy(accent);
    linkMat.emissive.copy(accent);
    if (text.current) text.current.color = accent.getHex();

    const c = chain.current;
    const head = c[0];
    const headAge = head ? t - head.born : 99;

    // chain shift: hold while the hash types out, then ease left by one block
    const shiftTarget = headAge > CONFIG.shiftDelay ? 0 : Math.min(shift.current, 1);
    const kS = st.reducedMotion ? 1 : 1 - Math.exp(-dt * CONFIG.shiftDamp * speed);
    shift.current += (shiftTarget - shift.current) * kS;
    if (Math.abs(shift.current) < 1e-4) shift.current = 0;

    const maxShown = Math.min(
      capacity,
      (isCalm ? CONFIG.calmVisible : quality === 1 ? Math.ceil(CONFIG.maxVisible / 2) : CONFIG.maxVisible) + 1,
    );
    const n = Math.min(c.length, maxShown);
    const b = bodies.current;
    const ed = edges.current;
    const ln = links.current;
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const st2 = stateAttr.array as Float32Array;

    for (let j = 0; j < n; j++) {
      const e = c[j];
      const age = t - e.born;
      const pop = Math.min(1, Math.max(0, age / CONFIG.popIn));
      const popE = 1 - Math.pow(1 - pop, 3);
      // glow: newest rises after typing, older blocks decay to a residual
      if (j === 0) {
        const gIn = Math.min(1, Math.max(0, (age - CONFIG.typeOut) / CONFIG.glowIn));
        e.glow = Math.max(e.glow, gIn);
      } else {
        e.glow += (CONFIG.residualGlow - e.glow) * (1 - Math.exp(-dt * CONFIG.glowDecay * speed));
      }
      const x = anchor - (j - shift.current) * CONFIG.spacing;
      const y = (1 - popE) * 0.35;
      pos.set(x, y, 0);
      scl.setScalar(0.6 + 0.4 * popE);
      m.compose(pos, q, scl);
      b?.setMatrixAt(j, m);
      ed?.setMatrixAt(j, m);
      st2[j * 2] = e.glow;
      st2[j * 2 + 1] = popE;

      // connector to the previous (older) block, j+1 sits to the left
      if (j + 1 < n) {
        const len = CONFIG.spacing - CONFIG.blockSize;
        pos.set(x - CONFIG.spacing / 2, 0, 0);
        scl.set(len * popE, 1, 1);
        m.compose(pos, q, scl);
        ln?.setMatrixAt(j, m);
      }
    }
    if (b) {
      b.count = n;
      b.instanceMatrix.needsUpdate = true;
    }
    if (ed) {
      ed.count = n;
      ed.instanceMatrix.needsUpdate = true;
    }
    if (ln) {
      ln.count = Math.max(0, n - 1);
      ln.instanceMatrix.needsUpdate = true;
    }
    stateAttr.needsUpdate = true;

    // newest hash types out (only the head block)
    const tx = text.current;
    if (tx && head) {
      const label = fullLabel(head);
      const reveal = Math.min(1, Math.max(0, headAge / CONFIG.typeOut));
      const headerLen = label.indexOf("\n") + 1;
      // header appears immediately, hash characters type out; quantised to limit troika re-layouts
      const chars = reveal >= 1 ? label.length : headerLen + Math.floor(((label.length - headerLen) * reveal) / 3) * 3;
      if (chars !== shownChars.current || head.height !== shownFor.current) {
        shownChars.current = chars;
        shownFor.current = head.height;
        const body = label.slice(0, chars);
        tx.text = reveal < 1 ? body + "_" : body;
        tx.sync();
      }
      tx.position.set(anchor - (0 - shift.current) * CONFIG.spacing - CONFIG.blockSize / 2, CONFIG.blockSize / 2 + 0.12, 0);
    }
  });

  return (
    <>
      <directionalLight ref={keyLight} position={[-2, 4, 5]} intensity={0} color={TOKENS.ivory} />
      <pointLight ref={fillLight} position={[2.5, -1, 2.5]} intensity={0} distance={8} decay={1.5} color={TOKENS.steel} />
      <group ref={group} visible={false}>
        <instancedMesh ref={bodies} args={[geos.block, bodyMat, capacity]} key={`b${capacity}`} />
        <instancedMesh ref={edges} args={[geos.shell, edgeMat, capacity]} key={`e${capacity}`} renderOrder={2} />
        <instancedMesh ref={links} args={[geos.link, linkMat, capacity]} key={`l${capacity}`} />
        <Text
          ref={text}
          fontSize={CONFIG.textSize}
          lineHeight={1.35}
          letterSpacing={0.04}
          anchorX="left"
          anchorY="bottom"
          color={TOKENS.copper}
          fillOpacity={0}
          renderOrder={3}
        >
          {" "}
        </Text>
      </group>
    </>
  );
}
