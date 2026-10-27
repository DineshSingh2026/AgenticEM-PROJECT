"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSceneStore } from "@/lib/scene-store";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import { sim } from "@/lib/sim/engine";
import { mulberry32 } from "@/lib/sim/prng";
import seed from "@/lib/sim/seed.json";
import { useSceneFade } from "./shared/useSceneFade";
import polarVert from "./shaders/casinoWheel-polar-vert.glsl";
import streamFrag from "./shaders/casinoWheel-stream-frag.glsl";
import hudFrag from "./shaders/casinoWheel-hud-frag.glsl";
import dustVert from "./shaders/casinoWheel-dust-vert.glsl";
import dustFrag from "./shaders/casinoWheel-dust-frag.glsl";
import glowVert from "./shaders/casinoWheel-glow-vert.glsl";
import glowFrag from "./shaders/casinoWheel-glow-frag.glsl";

const CONFIG = {
  seed: 0xca51e0,
  pockets: 37,
  segments: 160,
  /** rad about X: the face normal sits ~61 deg off the view axis, so the wheel reads as an ellipse */
  tilt: 0.5,
  roll: -0.09,
  /** desktop: centre as fraction of viewport width / height, radius as fraction of viewport height */
  desktop: { x: 0.335, y: -0.02, scale: 0.36 },
  /** mobile: behind the copy, lower right and dimmer */
  mobile: { x: 0.26, y: -0.3, scale: 0.6, dim: 0.5 },
  rotorSpeed: 0.11,
  orbit: { count: 360, track: [0.865, 0.915] as const, halo: [0.98, 1.17] as const, haloShare: 0.28, speed: [0.22, 0.6] as const, size: [0.005, 0.009] as const },
  settle: { slots: 10, calmSlots: 4, trail: 5, duration: 1.5, rest: 0.35 },
  flash: { tau: 0.24, gain: 3.4 },
  stream: { max: 12, radialDur: 0.24, arcSpeed: 2.6, life: 1.2 },
  hud: { radii: [1.1, 1.22, 1.245, 1.46] as const, speed: [0.05, -0.022, 0.16] as const },
  chips: 6,
  dust: 260,
  pointerTilt: { x: 0.05, y: 0.09 },
  calm: { density: 0.4, speed: 0.5 },
  envIntensity: 1.25,
  sweepSpeed: 0.14,
  colors: {
    gold: "#E8B65A", goldPale: "#F7DFA3", goldDeep: "#B07A2A",
    red: "#4E1C20", graphite: "#15171B", green: "#0F3B2B", lacquer: "#0C0E11",
  },
} as const;

const NAME = "CasinoWheel" as const;
const TAU = Math.PI * 2;
const STEP = TAU / CONFIG.pockets;
/** European wheel order (clockwise from above). */
const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const GAMES = ["poker", "blackjack", "roulette", "baccarat", "dice"] as const;

/* ------------------------------------------------------------------ */
/* Profile (unit wheel, Y up). Polar convention: angle a -> (cos a, 0, -sin a). */
/* ------------------------------------------------------------------ */
const TOP: [number, number][] = [
  [0.585, 0.03], [0.655, 0.03], [0.7, 0.044], [0.75, 0.06], [0.795, 0.078], [0.83, 0.084], [0.87, 0.089],
  [0.905, 0.097], [0.925, 0.115], [0.94, 0.148], [0.952, 0.172], [0.962, 0.18], [0.99, 0.181], [1.008, 0.172],
];
function heightAt(r: number): number {
  if (r <= TOP[0][0]) return pocketY(r);
  for (let i = 1; i < TOP.length; i++) {
    if (r <= TOP[i][0]) {
      const [r0, y0] = TOP[i - 1];
      const [r1, y1] = TOP[i];
      return y0 + ((r - r0) / (r1 - r0)) * (y1 - y0);
    }
  }
  return TOP[TOP.length - 1][1];
}
const P0 = 0.452;
const P1 = 0.585;
function pocketY(r: number): number {
  const t = (r - P0) / (P1 - P0);
  if (t > 0.9) return THREE.MathUtils.lerp(-0.012, 0.03, (t - 0.9) / 0.1);
  return 0.004 - 0.016 * Math.sin(Math.PI * Math.min(1, t / 0.9)) * 0.9 - 0.012 * Math.min(1, t / 0.9);
}

function lathe(points: [number, number][], segs: number) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
}

/** Polar grid in the wheel plane with polar UVs (u = angle fraction, v = radial fraction). */
function polarGrid(r0: number, r1: number, a0: number, a1: number, nr: number, na: number, yAt: (r: number) => number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nr; j++) {
    const r = r0 + ((r1 - r0) * j) / nr;
    const y = yAt(r);
    for (let i = 0; i <= na; i++) {
      const a = a0 + ((a1 - a0) * i) / na;
      pos.push(Math.cos(a) * r, y, -Math.sin(a) * r);
      uv.push(i / na, j / nr);
    }
  }
  for (let j = 0; j < nr; j++) {
    for (let i = 0; i < na; i++) {
      const a = j * (na + 1) + i;
      const b = a + 1;
      const c = a + na + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Runtime canvas textures                                             */
/* ------------------------------------------------------------------ */
function numberTexture(): THREE.CanvasTexture {
  const cell = 72;
  const h = 96;
  const c = document.createElement("canvas");
  c.width = cell * CONFIG.pockets;
  c.height = h;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < CONFIG.pockets; i++) {
    const n = ORDER[(CONFIG.pockets - i) % CONFIG.pockets];
    const x = i * cell;
    ctx.fillStyle = n === 0 ? "#134a36" : i % 2 === 0 ? "#5a2025" : "#1a1c21";
    if (n !== 0) ctx.fillStyle = (CONFIG.pockets - i) % 2 === 1 ? "#5a2025" : "#1a1c21";
    ctx.fillRect(x, 0, cell, h);
    ctx.fillStyle = CONFIG.colors.goldPale;
    ctx.font = "600 44px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), x + cell / 2, h / 2 + 2);
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillRect(x, 0, 3, h);
  }
  ctx.fillStyle = CONFIG.colors.gold;
  ctx.fillRect(0, 0, c.width, 4);
  ctx.fillRect(0, h - 5, c.width, 5);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function labelTexture(): THREE.CanvasTexture {
  const w = 4096;
  const h = 96;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.font = "500 46px ui-monospace, 'JetBrains Mono', Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let prev = 0;
  for (const g of GAMES) {
    const f = seed.gameMix[g];
    const mid = prev + f / 2;
    ctx.fillText(`${g.toUpperCase()} ${Math.round(f * 100)}%`, mid * w, h / 2);
    prev += f;
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  return t;
}

/** Chip atlas: 3 variants side by side; each column = 512px cap on top, 128px edge strip below. */
function chipTexture(): THREE.CanvasTexture {
  const variants = [
    { base: "#1b1e23", stripe: "#e9e1cf", ring: CONFIG.colors.gold },
    { base: "#e7dfcd", stripe: "#202329", ring: CONFIG.colors.goldDeep },
    { base: "#c4954a", stripe: "#f3ead7", ring: "#2a2218" },
  ];
  const c = document.createElement("canvas");
  c.width = 512 * 3;
  c.height = 640;
  const ctx = c.getContext("2d")!;
  variants.forEach((v, k) => {
    const x0 = k * 512;
    const cx = x0 + 256;
    const cy = 256;
    ctx.fillStyle = v.base;
    ctx.fillRect(x0, 0, 512, 640);
    // edge inlays on the face
    ctx.fillStyle = v.stripe;
    for (let s = 0; s < 8; s++) {
      const a = ((s + 0.5) / 8) * TAU;
      ctx.beginPath();
      ctx.arc(cx, cy, 256, a - 0.13, a + 0.13);
      ctx.arc(cx, cy, 196, a + 0.13, a - 0.13, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = v.ring;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 184, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, TAU);
    ctx.stroke();
    for (let d = 0; d < 48; d++) {
      const a = (d / 48) * TAU;
      ctx.fillStyle = v.ring;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 162, cy + Math.sin(a) * 162, 3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = v.ring;
    ctx.font = "600 150px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("A", cx, cy + 8);
    // edge strip
    ctx.fillStyle = v.stripe;
    for (let s = 0; s < 8; s++) {
      const u = (s + 0.5) / 8;
      ctx.fillRect(x0 + u * 512 - 18, 512, 36, 128);
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function chipGeometry(): THREE.BufferGeometry {
  const R = 0.2;
  const h = 0.026;
  const b = 0.01;
  const g = lathe(
    [[0, -h], [R - b, -h], [R - b * 0.3, -h + b * 0.3], [R, -h + b], [R, h - b], [R - b * 0.3, h - b * 0.3], [R - b, h], [R * 0.5, h], [0, h]],
    64,
  );
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (Math.abs(y) > h - 0.004 && r < R - 0.004) {
      const th = Math.atan2(x, z);
      const k = r / R;
      uv.setXY(i, 0.5 + 0.5 * k * Math.cos(th), (0.5 + 0.5 * k * Math.sin(th)) * 0.8);
    } else {
      uv.setXY(i, uv.getX(i), 0.8 + 0.2 * ((y + h) / (2 * h)));
    }
  }
  uv.needsUpdate = true;
  return g;
}

/** Contrasty warm studio for gold (no network): built once, PMREM-filtered. */
function buildEnv(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  const geo = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  const panel = (color: string, k: number, p: [number, number, number], s: [number, number], look: [number, number, number] = [0, 0, 0]) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p);
    mesh.scale.set(s[0], s[1], 1);
    mesh.lookAt(...look);
    scene.add(mesh);
  };
  panel("#fff4e0", 5, [0, 6, 0], [8, 2.2]);
  panel("#ffe2b0", 3.5, [-6, 1.5, 2], [0.6, 7]);
  panel("#ffffff", 2.4, [6, 2, -2], [0.5, 6]);
  panel("#ffcf8a", 2, [0, 1, 6], [6, 0.4]);
  panel("#7f8fa8", 0.8, [0, -5, 0], [10, 10]);
  const pmrem = new THREE.PMREMGenerator(gl);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  geo.dispose();
  mats.forEach((m) => m.dispose());
  return tex;
}

/* ------------------------------------------------------------------ */

interface Orbit { r: number; y: number; a: number; w: number; size: number; color: THREE.Color; busyUntil: number }
interface Settle { active: boolean; t0: number; ball: number; pocket: number; a0: number; w0: number; d0: number; landed: boolean; intensity: number }
interface Packet { angle: number; t0: number; w: number }

export function CasinoWheel() {
  const quality = useSceneStore((s) => s.quality);
  const q = quality >= 2 ? 2 : 1;
  return <CasinoWheelInner key={q} q={q} />;
}

function CasinoWheelInner({ q }: { q: 1 | 2 }) {
  const { opacity, isVisible } = useSceneFade(NAME);
  const gl = useThree((s) => s.gl);

  const root = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const balls = useRef<THREE.InstancedMesh>(null);
  const glowInst = useRef<THREE.InstancedMesh>(null);
  const chipsRef = useRef<THREE.InstancedMesh>(null);
  const keyLight = useRef<THREE.PointLight>(null);

  const orbitN = q === 2 ? CONFIG.orbit.count : CONFIG.orbit.count / 2;
  const chipN = q === 2 ? CONFIG.chips : Math.ceil(CONFIG.chips / 2);
  const dustN = q === 2 ? CONFIG.dust : CONFIG.dust / 2;
  const settleInst = CONFIG.settle.slots * (1 + CONFIG.settle.trail);

  const res = useMemo(() => {
    const rng = mulberry32(CONFIG.seed);
    const col = CONFIG.colors;

    // Materials
    const goldParams = {
      color: new THREE.Color(col.gold),
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: CONFIG.envIntensity,
      transparent: true,
      opacity: 0,
    };
    const gold =
      q === 2
        ? new THREE.MeshPhysicalMaterial({ ...goldParams, anisotropy: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.15 })
        : new THREE.MeshStandardMaterial(goldParams);
    const goldDeep = new THREE.MeshStandardMaterial({ ...goldParams, color: new THREE.Color(col.goldDeep).lerp(new THREE.Color(col.gold), 0.4), roughness: 0.3 });
    const lacquer = new THREE.MeshStandardMaterial({ color: new THREE.Color(col.lacquer), metalness: 0.4, roughness: 0.22, envMapIntensity: 0.6, transparent: true, opacity: 0 });
    const pocketMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.15, roughness: 0.4, envMapIntensity: 0.7, transparent: true, opacity: 0 });
    const numTex = numberTexture();
    const numberMat = new THREE.MeshStandardMaterial({ map: numTex, metalness: 0.45, roughness: 0.35, envMapIntensity: 0.9, transparent: true, opacity: 0 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const ballMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0 });
    const chipTex = chipTexture();
    const chipMat = new THREE.MeshStandardMaterial({ map: chipTex, metalness: 0.3, roughness: 0.42, envMapIntensity: 0.8, transparent: true, opacity: 0 });
    chipMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aVariant;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x = (vMapUv.x + aVariant) / 3.0;\n#endif");
    };
    chipMat.customProgramCacheKey = () => "casinoWheel-chip";

    const packets = new Array(CONFIG.stream.max).fill(0).map(() => new THREE.Vector4());
    const streamMat = new THREE.ShaderMaterial({
      vertexShader: polarVert,
      fragmentShader: streamFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      uniforms: {
        uPackets: { value: packets },
        uOpacity: { value: 0 },
        uRadialDur: { value: CONFIG.stream.radialDur },
        uArcSpeed: { value: CONFIG.stream.arcSpeed },
        uLife: { value: CONFIG.stream.life },
        uRadial: { value: new THREE.Vector2(0.6, 0.975) },
        uLipR: { value: 0.975 },
        uColor: { value: new THREE.Color(col.gold).multiplyScalar(1.6) },
        uHot: { value: new THREE.Color(col.goldPale).multiplyScalar(3.2) },
      },
    });
    let cum = 0;
    const mix = GAMES.map((g) => (cum += seed.gameMix[g]));
    const labelTex = labelTexture();
    const hudMat = new THREE.ShaderMaterial({
      vertexShader: polarVert,
      fragmentShader: hudFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
      extensions: { derivatives: true } as unknown as THREE.ShaderMaterial["extensions"],
      uniforms: {
        uOpacity: { value: 0 },
        uRot: { value: new THREE.Vector3() },
        uMix: { value: mix },
        uPulse: { value: [0, 0, 0, 0, 0] },
        uGold: { value: new THREE.Color(col.gold).multiplyScalar(0.55) },
        uPale: { value: new THREE.Color(col.goldPale).multiplyScalar(0.6) },
        uDeep: { value: new THREE.Color(col.goldDeep).multiplyScalar(0.45) },
        uLabels: { value: labelTex },
        uRadii: { value: new THREE.Vector4(...CONFIG.hud.radii) },
      },
    });
    const glowBgMat = new THREE.ShaderMaterial({
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color(col.gold) }, uOpacity: { value: 0 }, uPulse: { value: 0 } },
    });
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 5 },
        uPixelRatio: { value: 1 },
        uBox: { value: new THREE.Vector3(3, 3, 2) },
        uColor: { value: new THREE.Color(col.goldPale).multiplyScalar(0.7) },
        uOpacity: { value: 0 },
      },
    });

    // Geometry
    const rimPts: [number, number][] = [
      [0.9, -0.085], [0.98, -0.08], [1.015, -0.05], [1.026, 0.02], [1.026, 0.1], [1.02, 0.15], [1.008, 0.172], [0.99, 0.181],
      [0.962, 0.18], [0.952, 0.172], [0.94, 0.148], [0.925, 0.115], [0.905, 0.097], [0.87, 0.089], [0.83, 0.084], [0.795, 0.078],
    ];
    const rim = lathe(rimPts, CONFIG.segments);
    const bowl = mergeGeometries([
      lathe([[0.8, 0.078], [0.75, 0.06], [0.7, 0.044], [0.655, 0.03], [0.65, 0.0]], CONFIG.segments),
      lathe([[0.455, 0.004], [0.4, 0.028], [0.3, 0.066], [0.2, 0.092], [0.135, 0.108]], CONFIG.segments),
    ])!;
    const turretParts: THREE.BufferGeometry[] = [
      lathe([[0.14, 0.106], [0.11, 0.118], [0.075, 0.13], [0.05, 0.16], [0.036, 0.21], [0.03, 0.25], [0.046, 0.27], [0.05, 0.287], [0.034, 0.305], [0.0, 0.312]], 64),
    ];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      const arm = new THREE.CylinderGeometry(0.007, 0.009, 0.17, 10).rotateZ(Math.PI / 2).translate(0.115, 0.255, 0).rotateY(a);
      const knob = new THREE.SphereGeometry(0.019, 16, 12).translate(0.2, 0.258, 0).rotateY(a);
      turretParts.push(arm, knob);
    }
    const turret = mergeGeometries(turretParts)!;
    turretParts.forEach((g) => g.dispose());
    const fret = new THREE.BoxGeometry(P1 - P0 + 0.004, 0.03, 0.006).translate((P0 + P1) / 2, 0.016, 0);
    const deflector = new THREE.OctahedronGeometry(0.022, 0).scale(1.6, 0.6, 0.7);
    const pocket = polarGrid(P0, P1, -STEP / 2, STEP / 2, 8, 4, pocketY);
    const glowSector = polarGrid(P0 + 0.004, 0.652, -STEP / 2 + 0.006, STEP / 2 - 0.006, 8, 4, (r) => heightAt(r) + 0.004);
    const numbers = polarGrid(P1, 0.655, 0, TAU, 1, CONFIG.pockets * 6, () => 0.03);
    const stream = polarGrid(0.58, 1.0, 0, TAU, 28, 288, (r) => heightAt(r) + 0.004);
    const hud = polarGrid(1.06, 1.53, 0, TAU, 1, 384, () => -0.03);
    const ball = new THREE.SphereGeometry(1, 10, 8);
    const chip = chipGeometry();
    const glowPlane = new THREE.PlaneGeometry(1, 1);

    // Dust
    const dustGeo = new THREE.BufferGeometry();
    const dp = new Float32Array(CONFIG.dust * 3);
    const ds = new Float32Array(CONFIG.dust);
    for (let i = 0; i < CONFIG.dust; i++) {
      const rx = Math.pow(rng(), 0.6); // weighted right
      dp[i * 3] = -1.2 + rx * 5.8;
      dp[i * 3 + 1] = (rng() * 2 - 1) * 2.8;
      dp[i * 3 + 2] = -3 + rng() * 4.5;
      ds[i] = rng();
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(ds, 1));
    dustGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(1.5, 0, 0), 8);

    // Orbiting agent balls
    const o = CONFIG.orbit;
    const warm = new THREE.Color(col.goldPale);
    const white = new THREE.Color("#fff6e6");
    const orbits: Orbit[] = [];
    for (let i = 0; i < CONFIG.orbit.count; i++) {
      const halo = rng() < o.haloShare;
      const r = halo ? o.halo[0] + rng() * (o.halo[1] - o.halo[0]) : o.track[0] + rng() * (o.track[1] - o.track[0]);
      const size = o.size[0] + rng() * (o.size[1] - o.size[0]);
      const y = halo ? 0.2 + (rng() - 0.5) * 0.08 : heightAt(r) + size;
      const k = 1.6 + rng() * 1.6;
      orbits.push({
        r, y, size,
        a: rng() * TAU,
        w: -(o.speed[0] + rng() * (o.speed[1] - o.speed[0])) * (halo ? 0.6 : 1),
        color: white.clone().lerp(warm, rng()).multiplyScalar(halo ? k * 0.45 : k),
        busyUntil: 0,
      });
    }
    // Pocket colours: alternating desaturated red / graphite, single green zero
    const pocketColors = new Array(CONFIG.pockets).fill(0).map((_, i) => {
      const n = ORDER[(CONFIG.pockets - i) % CONFIG.pockets];
      if (n === 0) return new THREE.Color(col.green);
      return new THREE.Color((CONFIG.pockets - i) % 2 === 1 ? col.red : col.graphite);
    });
    // Chips: deterministic drift layout (world units, relative to the scene root)
    const chips = new Array(CONFIG.chips).fill(0).map((_, i) => ({
      p: new THREE.Vector3(...([
        [3.75, 1.75, -0.6], [1.35, -1.0, 1.4], [4.1, -1.35, 0.7], [1.0, 2.0, -2.6], [2.9, 2.3, -3.6], [5.2, 0.2, -4.2],
      ] as [number, number, number][])[i]),
      rot: new THREE.Euler(rng() * 1.2 - 0.3 + 0.9, rng() * TAU, rng() * 0.8 - 0.4),
      spin: (rng() - 0.5) * 0.3,
      bob: rng() * TAU,
      scale: [1.05, 1.25, 0.95, 0.85, 0.9, 0.8][i],
      variant: [0, 2, 1, 2, 0, 1][i],
    }));

    return {
      rng, gold, goldDeep, lacquer, pocketMat, numberMat, glowMat, ballMat, chipMat, streamMat, hudMat, glowBgMat, dustMat,
      textures: [numTex, labelTex, chipTex],
      geos: { rim, bowl, turret, fret, deflector, pocket, glowSector, numbers, stream, hud, ball, chip, glowPlane, dustGeo },
      orbits, pocketColors, chips, packets,
    };
  }, [q]);

  // Environment for the metals (local PMREM, no fetch)
  useEffect(() => {
    const env = buildEnv(gl);
    for (const m of [res.gold, res.goldDeep, res.lacquer, res.pocketMat, res.numberMat, res.chipMat]) {
      m.envMap = env;
      m.needsUpdate = true;
    }
    return () => env.dispose();
  }, [gl, res]);

  // Dispose everything on unmount
  useEffect(
    () => () => {
      Object.values(res.geos).forEach((g) => g.dispose());
      res.textures.forEach((t) => t.dispose());
      [res.gold, res.goldDeep, res.lacquer, res.pocketMat, res.numberMat, res.glowMat, res.ballMat, res.chipMat, res.streamMat, res.hudMat, res.glowBgMat, res.dustMat].forEach((m) => m.dispose());
    },
    [res],
  );

  // Static instance layouts
  useEffect(() => {
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const zero = new THREE.Vector3();
    const pockets = pocketRef.current;
    const frets = fretRef.current;
    const defl = deflRef.current;
    const glow = glowInst.current;
    for (let i = 0; i < CONFIG.pockets; i++) {
      q4.setFromAxisAngle(up, (i + 0.5) * STEP);
      m4.compose(zero, q4, one);
      pockets?.setMatrixAt(i, m4);
      pockets?.setColorAt(i, res.pocketColors[i]);
      glow?.setMatrixAt(i, m4);
      glow?.setColorAt(i, new THREE.Color(0, 0, 0));
      q4.setFromAxisAngle(up, i * STEP);
      m4.compose(zero, q4, one);
      frets?.setMatrixAt(i, m4);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2;
      const e = new THREE.Euler(0, a + (k % 2 ? Math.PI / 2 : 0), 0);
      m4.compose(new THREE.Vector3(Math.cos(a) * 0.735, heightAt(0.735) + 0.008, -Math.sin(a) * 0.735), new THREE.Quaternion().setFromEuler(e), one);
      defl?.setMatrixAt(k, m4);
    }
    [pockets, frets, defl, glow].forEach((x) => {
      if (!x) return;
      x.instanceMatrix.needsUpdate = true;
      if (x.instanceColor) x.instanceColor.needsUpdate = true;
    });
    const ch = chipsRef.current;
    if (ch) {
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(CONFIG.chips), 1);
      res.chips.forEach((c, i) => attr.setX(i, c.variant));
      ch.geometry.setAttribute("aVariant", attr);
    }
  }, [res]);

  const pocketRef = useRef<THREE.InstancedMesh>(null);
  const fretRef = useRef<THREE.InstancedMesh>(null);
  const deflRef = useRef<THREE.InstancedMesh>(null);

  // Simulation state
  const st = useRef({
    t: 0,
    rotor: 0,
    hud: new THREE.Vector3(),
    flash: new Float32Array(CONFIG.pockets),
    pulse: [0, 0, 0, 0, 0],
    bgPulse: 0,
    queue: [] as { game: number; w: number }[],
    settles: new Array(CONFIG.settle.slots).fill(0).map<Settle>(() => ({ active: false, t0: 0, ball: 0, pocket: 0, a0: 0, w0: 0, d0: 0, landed: false, intensity: 1 })),
    packets: [] as Packet[],
    calm: false,
    dim: 1,
  });

  useSimFeed("round.settled", (e) => {
    if (!isVisible()) return;
    const s = st.current;
    if (s.queue.length > 6) s.queue.shift();
    const gi = Math.max(0, GAMES.indexOf(e.game as (typeof GAMES)[number]));
    const w = THREE.MathUtils.clamp(0.75 + Math.log10(1 + e.stakeUsd) * 0.18 + (e.payoutUsd > e.stakeUsd ? 0.3 : 0), 0.7, 1.6);
    s.queue.push({ game: gi, w });
  });

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), c: new THREE.Color(), hot: new THREE.Color(CONFIG.colors.goldPale).multiplyScalar(CONFIG.flash.gain), black: new THREE.Color(0, 0, 0), e: new THREE.Euler() }),
    [],
  );

  useFrame((state, dtRaw) => {
    const g = root.current;
    const o = opacity.current;
    const visible = isVisible();
    if (keyLight.current) keyLight.current.intensity = 14 * o * st.current.dim;
    if (!g) return;
    g.visible = visible;
    if (!visible) {
      st.current.queue.length = 0;
      return;
    }
    const s = st.current;
    const store = useSceneStore.getState();
    if (store.activeScene === NAME) s.calm = store.variant === "calm";
    const calm = s.calm;
    const motion = store.reducedMotion ? 0 : 1;
    const speed = (calm ? CONFIG.calm.speed : 1) * motion;
    const dt = Math.min(dtRaw, 0.05);
    s.t += dt * speed;
    const t = s.t;

    // Layout
    const vp = state.viewport;
    const desktop = vp.aspect > 1;
    const L = desktop ? CONFIG.desktop : CONFIG.mobile;
    const scale = desktop ? vp.height * CONFIG.desktop.scale : vp.width * CONFIG.mobile.scale;
    s.dim = desktop ? 1 : CONFIG.mobile.dim;
    const w = wheel.current!;
    w.position.set(vp.width * L.x, vp.height * L.y + store.progress * 0.5, 0);
    w.scale.setScalar(scale);
    const kRot = 1 - Math.exp(-dt * 3);
    const px = calm ? 0 : store.pointer.x * CONFIG.pointerTilt.y;
    const py = calm ? 0 : store.pointer.y * CONFIG.pointerTilt.x;
    g.rotation.y += (px - g.rotation.y) * kRot;
    g.rotation.x += (-py - g.rotation.x) * kRot;
    w.rotation.set(CONFIG.tilt + store.progress * 0.12, 0, CONFIG.roll, "ZXY");
    if (keyLight.current) keyLight.current.position.set(w.position.x - 0.6, w.position.y + 2.2, 3.2);

    // Fade opacity into every material
    const fo = o * s.dim;
    for (const m of [res.gold, res.goldDeep, res.lacquer, res.pocketMat, res.numberMat, res.ballMat, res.chipMat, res.glowMat]) m.opacity = fo;
    res.streamMat.uniforms.uOpacity.value = fo;
    res.hudMat.uniforms.uOpacity.value = fo;
    res.glowBgMat.uniforms.uOpacity.value = fo;
    res.dustMat.uniforms.uOpacity.value = fo;
    res.dustMat.uniforms.uTime.value = t;
    res.dustMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();

    // Specular sweep: rotate the studio around the rim
    const sweep = t * CONFIG.sweepSpeed;
    res.gold.envMapRotation.set(0.25, sweep, 0);
    res.goldDeep.envMapRotation.set(0.25, sweep, 0);

    // Rotor
    s.rotor += dt * CONFIG.rotorSpeed * speed;
    if (rotor.current) rotor.current.rotation.y = s.rotor;

    // HUD rings rotate with network load
    const load = sim.getSnapshot().roundsPerSec / seed.baseline.roundsPerSec;
    s.hud.x += dt * CONFIG.hud.speed[0] * load * speed;
    s.hud.y += dt * CONFIG.hud.speed[1] * speed;
    s.hud.z += dt * CONFIG.hud.speed[2] * load * speed;
    res.hudMat.uniforms.uRot.value.copy(s.hud);

    // Launch settlements from the queue
    const maxSlots = calm ? CONFIG.settle.calmSlots : CONFIG.settle.slots;
    const visibleOrbits = Math.floor(orbitN * (calm ? CONFIG.calm.density : 1));
    while (s.queue.length && motion) {
      const slot = s.settles.findIndex((x, i) => !x.active && i < maxSlots);
      if (slot < 0) break;
      const ev = s.queue.shift()!;
      let ball = Math.floor(res.rng() * visibleOrbits);
      for (let tries = 0; tries < 8 && (res.orbits[ball].busyUntil > t || res.orbits[ball].r > 0.95); tries++) ball = Math.floor(res.rng() * visibleOrbits);
      const ob = res.orbits[ball];
      if (ob.busyUntil > t) break;
      const pocket = Math.floor(res.rng() * CONFIG.pockets);
      const D = CONFIG.settle.duration;
      const a0 = ob.a + ob.w * t;
      const base1 = a0 + ob.w * D * 0.5;
      const target = s.rotor + CONFIG.rotorSpeed * speed * D + (pocket + 0.5) * STEP;
      const d0 = Math.atan2(Math.sin(target - base1), Math.cos(target - base1));
      ob.busyUntil = t + D + CONFIG.settle.rest + 0.6;
      Object.assign(s.settles[slot], { active: true, t0: t, ball, pocket, a0, w0: ob.w, d0, landed: false, intensity: ev.w });
      s.pulse[ev.game] = 1;
      s.bgPulse = Math.min(1, s.bgPulse + 0.3);
    }

    // Balls
    const b = balls.current;
    const { m, p, s: sc, q: qq, c } = tmp;
    qq.identity();
    if (b) {
      const D = CONFIG.settle.duration;
      const K = CONFIG.settle.trail;
      for (let k = 0; k < CONFIG.settle.slots; k++) {
        const S = s.settles[k];
        for (let j = 0; j <= K; j++) {
          const idx = k * (K + 1) + j;
          if (!S.active) {
            sc.setScalar(0);
            m.compose(p.set(0, 0, 0), qq, sc);
            b.setMatrixAt(idx, m);
            continue;
          }
          const ob = res.orbits[S.ball];
          const tt = THREE.MathUtils.clamp((t - S.t0 - j * 0.035) / D, 0, 1);
          const e = tt * tt * (3 - 2 * tt);
          const base = S.a0 + S.w0 * D * tt * (1 - tt / 2);
          const target = s.rotor + (S.pocket + 0.5) * STEP;
          const base1 = S.a0 + S.w0 * D * 0.5;
          const d = S.d0 + Math.atan2(Math.sin(target - base1 - S.d0), Math.cos(target - base1 - S.d0));
          const a = base + d * Math.pow(e, 1.4);
          const r = THREE.MathUtils.lerp(ob.r, 0.52, Math.pow(e, 1.6));
          const bounce = Math.abs(Math.sin(tt * Math.PI * 4)) * 0.035 * (1 - tt) * Math.min(1, tt * 3);
          const y = (r < P1 ? pocketY(r) : heightAt(r)) + ob.size + bounce;
          const age = t - S.t0;
          let size = ob.size * (j === 0 ? 1.15 : 1 - j / (K + 1)) * 1.1;
          if (age > D) size *= j === 0 ? Math.max(0, 1 - (age - D) / CONFIG.settle.rest) : 0;
          sc.setScalar(size);
          m.compose(p.set(Math.cos(a) * r, y, -Math.sin(a) * r), qq, sc);
          b.setMatrixAt(idx, m);
          c.copy(ob.color).multiplyScalar(j === 0 ? 1.4 : 0.9 * (1 - j / (K + 1)));
          b.setColorAt(idx, c);
        }
        if (S.active && !S.landed && t - S.t0 >= D) {
          S.landed = true;
          s.flash[S.pocket] = Math.min(1.6, s.flash[S.pocket] + S.intensity);
          const angle = s.rotor + (S.pocket + 0.5) * STEP;
          if (s.packets.length >= CONFIG.stream.max) s.packets.shift();
          s.packets.push({ angle, t0: t, w: S.intensity });
        }
        if (S.active && t - S.t0 >= D + CONFIG.settle.rest) S.active = false;
      }
      for (let i = 0; i < visibleOrbits; i++) {
        const ob = res.orbits[i];
        const idx = settleInst + i;
        const a = ob.a + ob.w * t;
        const reveal = ob.busyUntil > t ? Math.max(0, 1 - (ob.busyUntil - t) / 0.6) * (ob.busyUntil - t < 0.6 ? 1 : 0) : 1;
        sc.setScalar(ob.size * reveal);
        m.compose(p.set(Math.cos(a) * ob.r, ob.y, -Math.sin(a) * ob.r), qq, sc);
        b.setMatrixAt(idx, m);
        b.setColorAt(idx, ob.color);
      }
      b.count = settleInst + visibleOrbits;
      b.instanceMatrix.needsUpdate = true;
      if (b.instanceColor) b.instanceColor.needsUpdate = true;
    }

    // Pocket flashes (emissive spike -> ~700ms decay)
    const decay = Math.exp(-dt / CONFIG.flash.tau);
    const gi = glowInst.current;
    if (gi) {
      for (let i = 0; i < CONFIG.pockets; i++) {
        s.flash[i] *= decay;
        c.copy(tmp.hot).multiplyScalar(s.flash[i]);
        gi.setColorAt(i, c);
      }
      if (gi.instanceColor) gi.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < 5; i++) s.pulse[i] *= Math.exp(-dt / 0.35);
    res.hudMat.uniforms.uPulse.value = s.pulse;
    s.bgPulse *= Math.exp(-dt / 0.6);
    res.glowBgMat.uniforms.uPulse.value = s.bgPulse;

    // Settlement streams
    for (let i = 0; i < CONFIG.stream.max; i++) {
      const pk = s.packets[i];
      const v = res.packets[i];
      if (pk && t - pk.t0 < CONFIG.stream.life) v.set(pk.angle, t - pk.t0, 0, pk.w);
      else v.set(0, 0, 0, 0);
    }
    s.packets = s.packets.filter((pk) => t - pk.t0 < CONFIG.stream.life);

    // Chips drift
    const ch = chipsRef.current;
    if (ch) {
      const n = Math.min(desktop ? chipN : 2, Math.max(1, Math.round(chipN * (calm ? CONFIG.calm.density : 1))));
      const cs = desktop ? 1 : 0.6;
      res.chips.forEach((cdat, i) => {
        if (i >= n) return;
        p.copy(cdat.p);
        if (!desktop) p.set(cdat.p.x * 0.32 + 0.3, cdat.p.y * 0.6 - 1.0, cdat.p.z);
        p.y += Math.sin(t * 0.35 + cdat.bob) * 0.08;
        p.x += Math.cos(t * 0.21 + cdat.bob) * 0.05;
        tmp.e.set(cdat.rot.x + Math.sin(t * 0.3 + cdat.bob) * 0.12, cdat.rot.y + t * cdat.spin, cdat.rot.z);
        qq.setFromEuler(tmp.e);
        sc.setScalar(cdat.scale * cs);
        m.compose(p, qq, sc);
        ch.setMatrixAt(i, m);
      });
      ch.count = n;
      ch.instanceMatrix.needsUpdate = true;
    }
    res.geos.dustGeo.setDrawRange(0, Math.floor(dustN * (calm ? CONFIG.calm.density : 1)));
  });

  return (
    <>
      <pointLight ref={keyLight} intensity={0} distance={9} decay={1.6} color={CONFIG.colors.goldPale} />
      <group ref={root} visible={false}>
        <mesh geometry={res.geos.glowPlane} material={res.glowBgMat} position={[2.3, 0, -2]} scale={[9, 7, 1]} renderOrder={-1} />
        <points geometry={res.geos.dustGeo} material={res.dustMat} frustumCulled={false} />
        <instancedMesh ref={chipsRef} args={[res.geos.chip, res.chipMat, CONFIG.chips]} frustumCulled={false} />
        <group ref={wheel}>
          <mesh geometry={res.geos.rim} material={res.gold} />
          <mesh geometry={res.geos.bowl} material={res.lacquer} />
          <instancedMesh ref={deflRef} args={[res.geos.deflector, res.goldDeep, 8]} />
          <mesh geometry={res.geos.hud} material={res.hudMat} renderOrder={2} />
          <mesh geometry={res.geos.stream} material={res.streamMat} renderOrder={3} />
          <group ref={rotor}>
            <mesh geometry={res.geos.turret} material={res.gold} />
            <mesh geometry={res.geos.numbers} material={res.numberMat} />
            <instancedMesh ref={pocketRef} args={[res.geos.pocket, res.pocketMat, CONFIG.pockets]} />
            <instancedMesh ref={fretRef} args={[res.geos.fret, res.goldDeep, CONFIG.pockets]} />
            <instancedMesh ref={glowInst} args={[res.geos.glowSector, res.glowMat, CONFIG.pockets]} renderOrder={3} />
          </group>
          <instancedMesh ref={balls} args={[res.geos.ball, res.ballMat, settleInst + orbitN]} frustumCulled={false} renderOrder={4} />
        </group>
      </group>
    </>
  );
}
