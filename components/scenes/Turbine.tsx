"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useSceneStore } from "@/lib/scene-store";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import { mulberry32 } from "@/lib/sim/prng";
import { useSceneFade } from "./shared/useSceneFade";
import uvVert from "./shaders/turbine-uv-vert.glsl";
import ribbonFrag from "./shaders/turbine-ribbon-frag.glsl";
import floorFrag from "./shaders/turbine-floor-frag.glsl";
import spriteVert from "./shaders/turbine-sprite-vert.glsl";
import spriteFrag from "./shaders/turbine-sprite-frag.glsl";
import edgeVert from "./shaders/turbine-edge-vert.glsl";
import edgeFrag from "./shaders/turbine-edge-frag.glsl";
import linkVert from "./shaders/turbine-link-vert.glsl";
import linkFrag from "./shaders/turbine-link-frag.glsl";
import holoFrag from "./shaders/turbine-holo-frag.glsl";
import dustVert from "./shaders/turbine-dust-vert.glsl";
import dustFrag from "./shaders/turbine-dust-frag.glsl";

/**
 * 06 // ROUND_LIFECYCLE. One game round's journey as a gold data pipeline: a branded round token rides a
 * curved gold rail through five stations (Trigger, Compute, Action, Settlement, Insight), synced to the
 * band's scroll progress (stops at 0.2 / 0.4 / 0.6 / 0.8 / 1.0). Ambient sparks ride the rail per sim
 * "round.settled" event. Portrait / calm: the round autoplays on a loop.
 */
const CONFIG = {
  seed: 0x7ab1e5,
  steps: 5,
  /** progress thresholds 0.2, 0.4 ... 1.0 minus this tolerance (ScrollTrigger rarely hits exactly 1) */
  thresholdEps: 0.015,
  progressDamp: 6,
  /** desktop: centre as fraction of viewport, scale as fraction of viewport height */
  desktop: { x: 0.17, y: 0.06, scale: 0.188, maxScaleW: 0.11, tilt: 0.5, yaw: 0.22, yawProgress: -0.1, drift: 0.035 },
  /** portrait: placed in the [data-turbine-anchor] gap between heading and cards */
  mobile: { tilt: 0.82, yaw: 0, fitH: 3.75, fitW: 1.75, fallbackY: 0.02, fallbackH: 0.42 },
  autoplay: { cycle: 12, run: 10.5 },
  plinth: { r: 0.34, h: 0.06 },
  /** token hover height at each station */
  socket: [0.34, 0.42, 0.5, 0.52, 0.66] as const,
  hop: 0.14,
  tokenScale: 0.55,
  chipStep: 0.027,
  nodes: 18,
  flow: { max: 40, speed: [0.075, 0.12] as const, throttle: 0.2 },
  particles: 48,
  dust: 220,
  lit: { done: 0.42, damp: 4 },
  flash: { tau: 0.32 },
  pointerTilt: { x: 0.04, y: 0.07 },
  calm: { density: 0.4, speed: 0.5 },
  envIntensity: 1.25,
  sweepSpeed: 0.12,
  colors: { gold: "#E8B65A", goldPale: "#F7DFA3", goldDeep: "#B07A2A", graphite: "#15171B", lacquer: "#0C0E11", dim: "#3a3f48" },
} as const;

const NAME = "Turbine" as const;
const TAU = Math.PI * 2;
const SPRITES = 128;
const S_TOKEN = 0;
const S_GLOW = 1;
const S_FLASH = 6;
const S_NODE = 11;
const S_CAP = 29;
const S_FLOW = 36;
const S_PART = 76;
const BARS = 7;
const HOLO_N = 24;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */
interface Layout {
  stations: THREE.Vector3[];
  lead: [THREE.Vector3, THREE.Vector3];
  labels: THREE.Vector3[];
  floor: [number, number];
  ledgerChain: boolean;
}
function makeLayout(portrait: boolean): Layout {
  if (!portrait) {
    const z = [0.22, -0.2, 0.22, -0.2, 0.18];
    const stations = z.map((zz, i) => new THREE.Vector3(-2 + i, 0, zz));
    return {
      stations,
      lead: [new THREE.Vector3(-2.8, 0, 0.5), new THREE.Vector3(2.6, 0, -0.05)],
      labels: stations.map((p) => p.clone().add(new THREE.Vector3(0, 0.02, 0.58))),
      floor: [3.4, 1.6],
      ledgerChain: true,
    };
  }
  const x = [0.36, -0.36, 0.36, -0.36, 0.36];
  const stations = x.map((xx, i) => new THREE.Vector3(xx, 0, -1.8 + i * 0.9));
  return {
    stations,
    lead: [new THREE.Vector3(0.6, 0, -2.6), new THREE.Vector3(0.1, 0, 2.5)],
    labels: stations.map((p) => p.clone().add(new THREE.Vector3(p.x > 0 ? -0.92 : 0.92, 0.12, 0))),
    floor: [1.3, 2.6],
    ledgerChain: false,
  };
}

/* ------------------------------------------------------------------ */
/* Geometry + textures                                                 */
/* ------------------------------------------------------------------ */
function lathe(points: [number, number][], segs: number) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
}

/** Flat ribbon along the curve on the floor: uv.x = arc length 0..1, uv.y = across. */
function ribbonGeometry(lut: Float32Array, n: number, width: number, y: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const tx = lut[b * 3] - lut[a * 3];
    const tz = lut[b * 3 + 2] - lut[a * 3 + 2];
    const l = Math.hypot(tx, tz) || 1;
    const sx = -tz / l;
    const sz = tx / l;
    const px = lut[i * 3];
    const pz = lut[i * 3 + 2];
    pos.push(px - sx * width * 0.5, y, pz - sz * width * 0.5, px + sx * width * 0.5, y, pz + sz * width * 0.5);
    uv.push(i / (n - 1), 0, i / (n - 1), 1);
    if (i < n - 1) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Chip atlas: 4 variants side by side; each column = 512px cap on top, 128px edge strip below. Variant 3 = round token. */
function chipTexture(): { tex: THREE.CanvasTexture; drawEmblem: (img: HTMLImageElement) => void } {
  const variants = [
    { base: "#1b1e23", stripe: "#e9e1cf", ring: CONFIG.colors.gold },
    { base: "#e7dfcd", stripe: "#202329", ring: CONFIG.colors.goldDeep },
    { base: "#c4954a", stripe: "#f3ead7", ring: "#2a2218" },
    { base: "#0f1115", stripe: CONFIG.colors.gold, ring: CONFIG.colors.goldPale },
  ];
  const c = document.createElement("canvas");
  c.width = 512 * 4;
  c.height = 640;
  const ctx = c.getContext("2d")!;
  variants.forEach((v, k) => {
    const x0 = k * 512;
    const cx = x0 + 256;
    const cy = 256;
    ctx.fillStyle = v.base;
    ctx.fillRect(x0, 0, 512, 640);
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
    if (k < 3) {
      ctx.fillStyle = v.ring;
      ctx.font = "600 150px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", cx, cy + 8);
    }
    ctx.fillStyle = v.stripe;
    for (let s = 0; s < 8; s++) {
      const u = (s + 0.5) / 8;
      ctx.fillRect(x0 + u * 512 - 18, 512, 36, 128);
    }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const drawEmblem = (img: HTMLImageElement) => {
    const w = 250;
    const h = (w * img.height) / img.width;
    ctx.drawImage(img, 3 * 512 + 256 - w / 2, 256 - h / 2, w, h);
    tex.needsUpdate = true;
  };
  return { tex, drawEmblem };
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

function cardTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 360;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#101216";
  ctx.fillRect(0, 0, 256, 360);
  ctx.strokeStyle = CONFIG.colors.gold;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 228, 332);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, 200, 304);
  ctx.strokeStyle = CONFIG.colors.goldDeep;
  for (let i = -12; i < 24; i++) {
    ctx.beginPath();
    ctx.moveTo(28 + i * 16, 28);
    ctx.lineTo(28 + i * 16 + 304, 332);
    ctx.stroke();
  }
  ctx.fillStyle = "#101216";
  ctx.beginPath();
  ctx.arc(128, 180, 54, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CONFIG.colors.goldPale;
  ctx.font = "600 76px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", 128, 186);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** HUD ring for the floor under each station (white on black, tinted per instance). */
function haloTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, S, S);
  const cx = S / 2;
  const R = S / 2;
  const grd = ctx.createRadialGradient(cx, cx, R * 0.55, cx, cx, R * 0.98);
  grd.addColorStop(0, "rgba(255,255,255,0)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.14)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cx, R * 0.8, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    ctx.beginPath();
    ctx.arc(cx, cx, R * 0.9, a, a + 1.25);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const r0 = R * (i % 6 === 0 ? 0.68 : 0.72);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * R * 0.76, cx + Math.sin(a) * R * 0.76);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function labelTexture(lines: string[]): THREE.CanvasTexture {
  const W = 1024;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H * lines.length;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => {
    const [idx, rest] = l.split("|");
    ctx.font = "500 46px ui-monospace, 'JetBrains Mono', Menlo, monospace";
    const wi = ctx.measureText(idx).width;
    ctx.font = "500 46px ui-monospace, 'JetBrains Mono', Menlo, monospace";
    const wr = ctx.measureText(rest).width;
    const x0 = W / 2 - (wi + 28 + wr) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(idx, x0, i * H + H / 2);
    ctx.fillStyle = "#a9a9a9";
    ctx.fillText(rest, x0 + wi + 28, i * H + H / 2);
  });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

/** Contrasty warm studio for gold (no network): built once, PMREM-filtered. */
function buildEnv(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  const geo = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  const panel = (color: string, k: number, p: [number, number, number], s: [number, number]) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p);
    mesh.scale.set(s[0], s[1], 1);
    mesh.lookAt(0, 0, 0);
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

interface Flow { t0: number; v: number; size: number }
interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; t0: number; life: number; size: number; hot: number }

export function Turbine() {
  const quality = useSceneStore((s) => s.quality);
  const portrait = useThree((s) => s.size.width < s.size.height);
  const q = quality >= 2 ? 2 : 1;
  return <TurbineInner key={`${q}-${portrait ? "p" : "l"}`} q={q} portrait={portrait} />;
}

function TurbineInner({ q, portrait }: { q: 1 | 2; portrait: boolean }) {
  const { opacity, isVisible } = useSceneFade(NAME);
  const gl = useThree((s) => s.gl);

  const root = useRef<THREE.Group>(null);
  const layoutRef = useRef<THREE.Group>(null);
  const computeRef = useRef<THREE.Group>(null);
  const packetRef = useRef<THREE.Mesh>(null);
  const chipsRef = useRef<THREE.InstancedMesh>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const ledgerRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);
  const halosRef = useRef<THREE.InstancedMesh>(null);
  const labelsRef = useRef<THREE.InstancedMesh>(null);
  const cardsRef = useRef<THREE.InstancedMesh>(null);
  const keyLight = useRef<THREE.PointLight>(null);
  const tokenLight = useRef<THREE.PointLight>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const band = useRef<HTMLElement | null>(null);

  const nodeN = q === 2 ? CONFIG.nodes : Math.ceil(CONFIG.nodes / 2);
  const flowN = q === 2 ? CONFIG.flow.max : CONFIG.flow.max / 2;
  const partN = q === 2 ? CONFIG.particles : CONFIG.particles / 2;
  const dustN = Math.floor((q === 2 ? CONFIG.dust : CONFIG.dust / 2) * (portrait ? 0.5 : 1));

  const res = useMemo(() => {
    const rng = mulberry32(CONFIG.seed);
    const col = CONFIG.colors;
    const L = makeLayout(portrait);
    const P = L.stations;
    const PT = CONFIG.plinth.h;

    // Track curve + arc-length LUT
    const curve = new THREE.CatmullRomCurve3([L.lead[0], ...P, L.lead[1]], false, "centripetal", 0.5);
    const LUT_N = 600;
    const lut = new Float32Array(LUT_N * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < LUT_N; i++) {
      curve.getPointAt(i / (LUT_N - 1), v);
      lut[i * 3] = v.x;
      lut[i * 3 + 1] = v.y;
      lut[i * 3 + 2] = v.z;
    }
    const stationU = P.map((p) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < LUT_N; i++) {
        const d = (lut[i * 3] - p.x) ** 2 + (lut[i * 3 + 2] - p.z) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return best / (LUT_N - 1);
    });

    // Materials
    const metal = { metalness: 1, roughness: 0.24, envMapIntensity: CONFIG.envIntensity, transparent: true, opacity: 0 };
    const goldParams = { ...metal, color: new THREE.Color(col.gold) };
    const gold =
      q === 2
        ? new THREE.MeshPhysicalMaterial({ ...goldParams, clearcoat: 0.4, clearcoatRoughness: 0.15 })
        : new THREE.MeshStandardMaterial(goldParams);
    const tintMetal = new THREE.MeshStandardMaterial({ ...metal, color: 0xffffff, roughness: 0.3 });
    const lacquer = new THREE.MeshStandardMaterial({ color: new THREE.Color(col.lacquer), metalness: 0.5, roughness: 0.24, envMapIntensity: 0.7, transparent: true, opacity: 0 });
    const packetMat = new THREE.MeshStandardMaterial({ ...goldParams, roughness: 0.18, flatShading: true, emissive: new THREE.Color(col.gold), emissiveIntensity: 0 });
    const cardTex = cardTexture();
    const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, metalness: 0.25, roughness: 0.42, envMapIntensity: 0.8, transparent: true, opacity: 0 });
    const ledgerParams = { color: new THREE.Color("#1a1d23"), metalness: 0.35, roughness: 0.18, envMapIntensity: 0.9, transparent: true, opacity: 0 };
    const ledgerMat = q === 2 ? new THREE.MeshPhysicalMaterial({ ...ledgerParams, clearcoat: 1, clearcoatRoughness: 0.08 }) : new THREE.MeshStandardMaterial(ledgerParams);
    const chip = chipTexture();
    const chipMat = new THREE.MeshStandardMaterial({ map: chip.tex, metalness: 0.3, roughness: 0.4, envMapIntensity: 0.85, transparent: true, opacity: 0 });
    chipMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aVariant;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x = (vMapUv.x + aVariant) / 4.0;\n#endif");
    };
    chipMat.customProgramCacheKey = () => "turbine-chip";

    const goldC = () => new THREE.Color(col.gold);
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
    const ribbonMat = new THREE.ShaderMaterial({
      vertexShader: uvVert,
      fragmentShader: ribbonFrag,
      ...additive,
      uniforms: {
        uHead: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 0 },
        uGold: { value: goldC().multiplyScalar(1.5) }, uPale: { value: new THREE.Color(col.goldPale).multiplyScalar(3) },
        uDim: { value: new THREE.Color(col.dim).multiplyScalar(0.5) },
      },
    });
    const stationsU = P.map((p) => new THREE.Vector3(p.x, p.z, 0));
    const floorMat = new THREE.ShaderMaterial({
      vertexShader: uvVert,
      fragmentShader: floorFrag,
      ...additive,
      uniforms: { uOpacity: { value: 0 }, uExtent: { value: new THREE.Vector2(...L.floor) }, uGold: { value: goldC() }, uStations: { value: stationsU } },
    });
    const holoData = new Array(HOLO_N).fill(0).map((_, i) => clamp01(0.35 + 0.35 * Math.sin(i * 0.55) * 0.6 + i * 0.016 + (rng() - 0.5) * 0.22));
    const holoMat = new THREE.ShaderMaterial({
      vertexShader: uvVert,
      fragmentShader: holoFrag,
      ...additive,
      side: THREE.DoubleSide,
      uniforms: {
        uData: { value: holoData }, uReveal: { value: 0 }, uLit: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 0 },
        uGold: { value: goldC().multiplyScalar(1.2) }, uPale: { value: new THREE.Color(col.goldPale).multiplyScalar(2.2) },
        uDim: { value: new THREE.Color(col.dim).multiplyScalar(0.35) },
      },
    });
    const linkMat = new THREE.ShaderMaterial({
      vertexShader: linkVert,
      fragmentShader: linkFrag,
      ...additive,
      uniforms: {
        uTime: { value: 0 }, uLit: { value: 0 }, uActive: { value: 0 }, uOpacity: { value: 0 },
        uGold: { value: goldC() }, uPale: { value: new THREE.Color(col.goldPale).multiplyScalar(1.6) }, uDim: { value: new THREE.Color(col.dim).multiplyScalar(0.35) },
      },
    });
    const edgeMat = new THREE.ShaderMaterial({
      vertexShader: edgeVert,
      fragmentShader: edgeFrag,
      ...additive,
      uniforms: {
        uBase: { value: new THREE.Color(col.dim).multiplyScalar(0.9) }, uGold: { value: goldC().multiplyScalar(1.2) },
        uPale: { value: new THREE.Color(col.goldPale).multiplyScalar(2.4) }, uOpacity: { value: 0 },
      },
    });
    const spriteMat = new THREE.ShaderMaterial({ vertexShader: spriteVert, fragmentShader: spriteFrag, ...additive, uniforms: { uOpacity: { value: 0 } } });
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      ...additive,
      uniforms: {
        uTime: { value: 0 }, uSize: { value: 4.5 }, uPixelRatio: { value: 1 }, uY: { value: new THREE.Vector2(-0.1, 1.6) },
        uColor: { value: new THREE.Color(col.goldPale).multiplyScalar(0.6) }, uOpacity: { value: 0 },
      },
    });
    const haloTex = haloTexture();
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, ...additive, opacity: 0 });
    const labelLines = [
      "01|TRIGGER · GAME_STATE",
      `02|COMPUTE · ${nodeN} AGENTS`,
      "03|ACTION · BET_PLACED",
      `04|SETTLE · 0x${Math.floor(rng() * 0xffff).toString(16).padStart(4, "0")}…${Math.floor(rng() * 0xffff).toString(16).padStart(4, "0")}`,
      "05|INSIGHT · LIVE_EVENTS",
    ];
    const labelTex = labelTexture(labelLines);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, ...additive, opacity: 0 });
    labelMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aRow;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.y = (vMapUv.y + 4.0 - aRow) / 5.0;\n#endif");
    };
    labelMat.customProgramCacheKey = () => "turbine-label";

    // Static geometry: plinths + table body (lacquer) and every static gold part (one merged mesh each)
    const lacquerParts: THREE.BufferGeometry[] = [];
    const goldParts: THREE.BufferGeometry[] = [];
    const R = CONFIG.plinth.r;
    for (const p of P) {
      lacquerParts.push(lathe([[0, 0], [R - 0.012, 0], [R, 0.012], [R, PT - 0.012], [R - 0.012, PT], [R * 0.82, PT], [R * 0.8, PT - 0.006], [0, PT - 0.006]], 72).translate(p.x, 0, p.z));
      goldParts.push(new THREE.TorusGeometry(R - 0.004, 0.0065, 8, 96).rotateX(Math.PI / 2).translate(p.x, PT - 0.002, p.z));
      goldParts.push(new THREE.TorusGeometry(R * 0.81, 0.004, 6, 96).rotateX(Math.PI / 2).translate(p.x, PT - 0.004, p.z));
    }
    const T = P[0];
    lacquerParts.push(lathe([[0, 0.15], [0.2, 0.15], [0.218, 0.158], [0.222, 0.17], [0.212, 0.18], [0, 0.18]], 72).translate(T.x, 0, T.z));
    goldParts.push(new THREE.TorusGeometry(0.214, 0.008, 10, 96).rotateX(Math.PI / 2).translate(T.x, 0.178, T.z));
    goldParts.push(lathe([[0.05, PT], [0.032, PT + 0.02], [0.024, 0.13], [0.04, 0.15], [0.0, 0.15]], 48).translate(T.x, 0, T.z));
    // twin rails
    const railPts = (side: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 24; i < LUT_N - 24; i += 6) {
        const a = Math.max(0, i - 3);
        const b = Math.min(LUT_N - 1, i + 3);
        const tx = lut[b * 3] - lut[a * 3];
        const tz = lut[b * 3 + 2] - lut[a * 3 + 2];
        const l = Math.hypot(tx, tz) || 1;
        pts.push(new THREE.Vector3(lut[i * 3] - (tz / l) * side, 0.012, lut[i * 3 + 2] + (tx / l) * side));
      }
      return new THREE.CatmullRomCurve3(pts);
    };
    goldParts.push(new THREE.TubeGeometry(railPts(0.055), 420, 0.0075, 8, false));
    goldParts.push(new THREE.TubeGeometry(railPts(-0.055), 420, 0.0075, 8, false));
    // insight base plate
    const I = P[4];
    goldParts.push(new THREE.BoxGeometry(0.52, 0.012, 0.1).translate(I.x, PT + 0.006, I.z + 0.08));
    const lacquerGeo = mergeGeometries(lacquerParts.map((g) => g.toNonIndexed()))!;
    const goldGeo = mergeGeometries(goldParts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
    lacquerParts.forEach((g) => g.dispose());
    goldParts.forEach((g) => g.dispose());

    const ribbon = ribbonGeometry(lut, LUT_N, 0.34, 0.004);
    const floor = new THREE.PlaneGeometry(L.floor[0] * 2, L.floor[1] * 2).rotateX(-Math.PI / 2);
    // vPos must stay in authored XY, so bake rotation into the mesh instead of the geometry
    floor.rotateX(Math.PI / 2);
    const holo = new THREE.PlaneGeometry(0.72, 0.4);
    const halo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const label = new THREE.PlaneGeometry(1.3, 0.1625);
    const card = new THREE.BoxGeometry(0.08, 0.004, 0.112);
    const packet = new THREE.OctahedronGeometry(0.05, 0);
    const node = new THREE.SphereGeometry(1, 16, 12);
    const chipGeo = chipGeometry();
    const ledgerBody = new RoundedBoxGeometry(1, 1, 1, 2, 0.04);
    const ledgerEdge = new THREE.BoxGeometry(1, 1, 1);
    const bar = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);

    // Sprites (instanced camera-facing quads)
    const quad = new THREE.PlaneGeometry(1, 1);
    const sprite = new THREE.InstancedBufferGeometry();
    sprite.index = quad.index;
    sprite.setAttribute("position", quad.attributes.position);
    sprite.setAttribute("uv", quad.attributes.uv);
    const sOff = new THREE.InstancedBufferAttribute(new Float32Array(SPRITES * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const sCol = new THREE.InstancedBufferAttribute(new Float32Array(SPRITES * 4), 4).setUsage(THREE.DynamicDrawUsage);
    sprite.setAttribute("aOffset", sOff);
    sprite.setAttribute("aColor", sCol);
    sprite.instanceCount = SPRITES;

    // Compute lattice (local to the compute group centred at the core)
    const nodes: THREE.Vector3[] = [new THREE.Vector3()];
    for (let tries = 0; nodes.length < CONFIG.nodes && tries < 4000; tries++) {
      const p = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
      if (p.lengthSq() > 1) continue;
      p.multiply(new THREE.Vector3(0.27, 0.2, 0.24));
      if (p.length() < 0.1) continue;
      if (nodes.some((o) => o.distanceTo(p) < 0.085)) continue;
      nodes.push(p);
    }
    const used = nodes.slice(0, nodeN);
    const pairs = new Set<string>();
    used.forEach((a, i) => {
      const near = used.map((b, j) => ({ j, d: a.distanceTo(b) })).filter((x) => x.j !== i).sort((x, y) => x.d - y.d).slice(0, i === 0 ? 6 : 3);
      near.forEach(({ j }) => pairs.add(i < j ? `${i}-${j}` : `${j}-${i}`));
    });
    const lp: number[] = [];
    const lt: number[] = [];
    const ls: number[] = [];
    pairs.forEach((k) => {
      const [i, j] = k.split("-").map(Number);
      const sd = rng();
      lp.push(used[i].x, used[i].y, used[i].z, used[j].x, used[j].y, used[j].z);
      lt.push(0, 1);
      ls.push(sd, sd);
    });
    const links = new THREE.BufferGeometry();
    links.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    links.setAttribute("aT", new THREE.Float32BufferAttribute(lt, 1));
    links.setAttribute("aSeed", new THREE.Float32BufferAttribute(ls, 1));
    const nodeSeed = used.map(() => ({ ph: rng() * TAU, f: 2 + rng() * 5 }));

    // Chips: 0 = token, then stacks at the Action station
    const A = P[2];
    const stacks = [
      { x: 0, z: 0, variants: [0, 1, 0], bet: true },
      { x: -0.175, z: 0.07, variants: [2, 2, 2, 2] },
      { x: 0.16, z: -0.1, variants: [1, 1] },
    ];
    const chips: { x: number; y: number; z: number; variant: number; rot: number; bet: boolean }[] = [];
    stacks.forEach((s) => {
      s.variants.forEach((vv, k) => chips.push({ x: A.x + s.x, y: PT + 0.013 + k * CONFIG.chipStep, z: A.z + s.z, variant: vv, rot: rng() * TAU, bet: false }));
      if (s.bet) chips.push({ x: A.x + s.x, y: PT + 0.013 + s.variants.length * CONFIG.chipStep, z: A.z + s.z, variant: 3, rot: 0, bet: true });
    });
    const betTop = PT + 0.013 + 3 * CONFIG.chipStep;

    // Dust
    const dustGeo = new THREE.BufferGeometry();
    const dp = new Float32Array(CONFIG.dust * 3);
    const ds = new Float32Array(CONFIG.dust);
    for (let i = 0; i < CONFIG.dust; i++) {
      dp[i * 3] = (rng() * 2 - 1) * L.floor[0] * 0.9;
      dp[i * 3 + 1] = rng() * 1.6;
      dp[i * 3 + 2] = (rng() * 2 - 1) * L.floor[1] * 0.9;
      ds[i] = rng();
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(ds, 1));
    dustGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);

    const barH = new Array(BARS).fill(0).map((_, i) => 0.1 + 0.2 * (0.35 + 0.65 * (i / (BARS - 1))) + (rng() - 0.5) * 0.06);

    return {
      rng, L, lut, LUT_N, stationU, chips, betTop, used, nodeSeed, barH, holoData, sOff, sCol, labelLines, chip,
      gold, tintMetal, lacquer, packetMat, cardMat, ledgerMat, chipMat, ribbonMat, floorMat, holoMat, linkMat, edgeMat, spriteMat, dustMat, haloMat, labelMat,
      textures: [cardTex, chip.tex, haloTex, labelTex],
      geos: { lacquerGeo, goldGeo, ribbon, floor, holo, halo, label, card, packet, node, chipGeo, ledgerBody, ledgerEdge, bar, quad, sprite, links, dustGeo },
    };
  }, [q, portrait, nodeN]);

  const solidMats = [res.gold, res.tintMetal, res.lacquer, res.packetMat, res.cardMat, res.ledgerMat, res.chipMat];
  const fadeBasic = [res.haloMat, res.labelMat];
  const fadeShader = [res.ribbonMat, res.floorMat, res.holoMat, res.linkMat, res.edgeMat, res.spriteMat, res.dustMat];

  // Environment for the metals (local PMREM, no fetch) + brand emblem on the token face
  useEffect(() => {
    const env = buildEnv(gl);
    for (const m of [res.gold, res.tintMetal, res.lacquer, res.packetMat, res.cardMat, res.ledgerMat, res.chipMat]) {
      m.envMap = env;
      m.needsUpdate = true;
    }
    const img = new Image();
    img.onload = () => res.chip.drawEmblem(img);
    img.src = "/brand/agentium-emblem.png";
    return () => {
      img.onload = null;
      env.dispose();
    };
  }, [gl, res]);

  // Dispose everything on unmount
  useEffect(
    () => () => {
      Object.values(res.geos).forEach((g) => g.dispose());
      res.textures.forEach((t) => t.dispose());
      [res.gold, res.tintMetal, res.lacquer, res.packetMat, res.cardMat, res.ledgerMat, res.chipMat, res.ribbonMat, res.floorMat, res.holoMat, res.linkMat, res.edgeMat, res.spriteMat, res.dustMat, res.haloMat, res.labelMat].forEach((m) => m.dispose());
    },
    [res],
  );

  // Static instance attributes
  useEffect(() => {
    const ch = chipsRef.current;
    if (ch) {
      const attr = new THREE.InstancedBufferAttribute(new Float32Array(res.chips.length + 1), 1);
      attr.setX(0, 3);
      res.chips.forEach((c, i) => attr.setX(i + 1, c.variant));
      ch.geometry.setAttribute("aVariant", attr);
    }
    const lb = labelsRef.current;
    if (lb) {
      const attr = new THREE.InstancedBufferAttribute(new Float32Array([0, 1, 2, 3, 4]), 1);
      lb.geometry.setAttribute("aRow", attr);
    }
    const ed = edgesRef.current;
    if (ed) ed.geometry.setAttribute("aState", new THREE.InstancedBufferAttribute(new Float32Array(4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const cards = cardsRef.current;
    if (cards) {
      const T = res.L.stations[0];
      const m = new THREE.Matrix4();
      const qq = new THREE.Quaternion();
      [[-0.06, 0.03, 0.35], [0.055, 0.04, -0.3]].forEach(([x, z, r], i) => {
        m.compose(new THREE.Vector3(T.x + x, 0.183 + i * 0.002, T.z + z), qq.setFromEuler(new THREE.Euler(0, r, 0)), new THREE.Vector3(1, 1, 1));
        cards.setMatrixAt(i, m);
      });
      cards.instanceMatrix.needsUpdate = true;
    }
  }, [res]);

  // Simulation state
  const st = useRef({
    t: 0,
    sp: 0,
    pv: 0,
    calm: false,
    reached: 0,
    arrive: [-1, -1, -1, -1, -1],
    lit: [0, 0, 0, 0, 0],
    flash: [0, 0, 0, 0, 0],
    flows: [] as Flow[],
    lastFlow: -1,
    lastHolo: -1,
    parts: new Array(CONFIG.particles).fill(0).map<Particle>(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t0: -99, life: 1, size: 0, hot: 0 })),
    partHead: 0,
    reveal: 0,
    rise: new Array(BARS).fill(0),
    barLive: new Array(BARS).fill(0),
    head: 0,
  });

  useSimFeed("round.settled", (e) => {
    if (!isVisible()) return;
    const s = st.current;
    if (s.t - s.lastFlow > CONFIG.flow.throttle && s.flows.length < flowN) {
      s.lastFlow = s.t;
      const v = CONFIG.flow.speed[0] + res.rng() * (CONFIG.flow.speed[1] - CONFIG.flow.speed[0]);
      s.flows.push({ t0: s.t, v, size: 0.05 + Math.min(0.05, Math.log10(1 + e.stakeUsd) * 0.012) });
    }
    if (s.t - s.lastHolo > 0.7) {
      s.lastHolo = s.t;
      const d = res.holoData;
      d.shift();
      const last = d[d.length - 1];
      d.push(clamp01(last * 0.6 + 0.4 * clamp01(0.25 + Math.log10(1 + e.stakeUsd) * 0.16 + (e.payoutUsd > e.stakeUsd ? 0.12 : -0.05))));
      const b = Math.floor(res.rng() * BARS);
      s.barLive[b] = Math.min(0.05, s.barLive[b] + 0.02);
    }
  });

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), p2: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), qi: new THREE.Quaternion(), c: new THREE.Color(), e: new THREE.Euler(), gold: new THREE.Color(CONFIG.colors.gold), pale: new THREE.Color(CONFIG.colors.goldPale), graphite: new THREE.Color("#2a2d33") }),
    [],
  );

  useFrame((state, dtRaw) => {
    const g = root.current;
    const o = opacity.current;
    const visible = isVisible();
    if (keyLight.current) keyLight.current.intensity = 10 * o;
    if (!g) return;
    g.visible = visible;
    if (!visible) {
      st.current.flows.length = 0;
      if (tokenLight.current) tokenLight.current.intensity = 0;
      return;
    }
    const s = st.current;
    const store = useSceneStore.getState();
    if (store.activeScene === NAME) s.calm = store.variant === "calm";
    const calm = s.calm;
    const motion = store.reducedMotion ? 0 : 1;
    const speed = (calm ? CONFIG.calm.speed : 1) * motion;
    const dt = Math.min(dtRaw, 0.05);
    s.t += dt * Math.max(speed, 0.0001);
    const t = s.t;
    const { m, p, p2, s: sc, q: qq, c } = tmp;
    const PT = CONFIG.plinth.h;
    const P = res.L.stations;

    /* ---------- Layout ---------- */
    const vp = state.viewport;
    const lay = layoutRef.current!;
    if (!portrait) {
      const D = CONFIG.desktop;
      const scale = Math.min(vp.height * D.scale, vp.width * D.maxScaleW);
      lay.position.set(vp.width * D.x, vp.height * D.y, 0);
      lay.scale.setScalar(scale);
      lay.rotation.set(D.tilt + Math.sin(t * 0.11) * D.drift * 0.4, D.yaw + s.sp * D.yawProgress + Math.sin(t * 0.07) * D.drift, 0);
    } else {
      const M = CONFIG.mobile;
      if (!anchor.current || !anchor.current.isConnected) anchor.current = document.querySelector<HTMLElement>("[data-turbine-anchor]");
      const r = anchor.current?.getBoundingClientRect();
      let cy = vp.height * M.fallbackY;
      let H = vp.height * M.fallbackH;
      let W = vp.width * 0.9;
      if (r && r.height > 0) {
        cy = (0.5 - (r.top + r.height / 2) / window.innerHeight) * vp.height;
        H = (r.height / window.innerHeight) * vp.height;
        W = (r.width / window.innerWidth) * vp.width;
      }
      lay.position.set(0, cy, 0);
      lay.scale.setScalar(Math.min(H / M.fitH, W / M.fitW));
      lay.rotation.set(M.tilt + Math.sin(t * 0.11) * 0.015, M.yaw + Math.sin(t * 0.07) * 0.04, 0);
    }
    const kRot = 1 - Math.exp(-dt * 3);
    const px = calm || portrait ? 0 : store.pointer.x * CONFIG.pointerTilt.y;
    const py = calm || portrait ? 0 : store.pointer.y * CONFIG.pointerTilt.x;
    g.rotation.y += (px - g.rotation.y) * kRot;
    g.rotation.x += (-py - g.rotation.x) * kRot;

    /* ---------- Fade ---------- */
    for (const mt of solidMats) mt.opacity = o;
    for (const mt of fadeBasic) mt.opacity = o;
    for (const mt of fadeShader) mt.uniforms.uOpacity.value = o;
    res.ledgerMat.opacity = o * 0.94;
    const sweep = t * CONFIG.sweepSpeed;
    res.gold.envMapRotation.set(0.25, sweep, 0);
    res.tintMetal.envMapRotation.set(0.25, sweep, 0);

    /* ---------- Progress -> stage ---------- */
    const auto = portrait || calm;
    let target: number;
    if (auto) {
      const A = CONFIG.autoplay;
      const ct = t % A.cycle;
      const pv = Math.min(1, ct / A.run);
      if (pv < s.pv - 0.5) {
        s.sp = 0;
        s.arrive.fill(-1);
        s.reached = 0;
      }
      s.pv = pv;
      target = pv;
      s.sp = pv;
    } else {
      // Mirror the HTML step cards exactly: they light from the pinned band's own progress, not the scene trigger's.
      if (!band.current || !band.current.isConnected) band.current = document.querySelector<HTMLElement>(`[data-scene="${NAME}"] > div`);
      const br = band.current?.getBoundingClientRect();
      const travel = br ? br.height - window.innerHeight : 0;
      target = store.activeScene !== NAME ? s.sp : br && travel > 0 ? clamp01(-br.top / travel) : store.progress;
      s.sp += (target - s.sp) * (1 - Math.exp(-dt * CONFIG.progressDamp));
    }
    const sp = s.sp;
    const stops = [0, 1, 2, 3, 4].map((k) => 0.2 * (k + 1) - CONFIG.thresholdEps);
    const reached = stops.filter((x) => sp >= x).length;
    if (reached > s.reached) for (let k = s.reached; k < reached; k++) onArrive(k);
    if (reached < s.reached) for (let k = reached; k < s.reached; k++) s.arrive[k] = -1;
    s.reached = reached;
    const current = reached - 1;
    const kl = 1 - Math.exp(-dt * CONFIG.lit.damp);
    for (let k = 0; k < 5; k++) {
      const tg = k === current ? 1 : k < current ? CONFIG.lit.done : 0;
      s.lit[k] += (tg - s.lit[k]) * kl;
      s.flash[k] *= Math.exp(-dt / CONFIG.flash.tau);
    }
    const age = (k: number) => (s.arrive[k] < 0 ? -1 : t - s.arrive[k]);

    function onArrive(k: number) {
      s.arrive[k] = t;
      s.flash[k] = 1;
      const st0 = P[k];
      if (k === 0) burst(st0.x, 0.34, st0.z, q === 2 ? 28 : 14, 0.9, 1);
      if (k === 1) burst(st0.x, 0.42, st0.z, 10, 0.5, 0.6);
      if (k === 3) burst(st0.x, PT + 0.22, st0.z, 12, 0.6, 0.8);
      if (k === 4) burst(st0.x, 0.5, st0.z, q === 2 ? 20 : 10, 0.45, 1, true);
    }
    function burst(x: number, y: number, z: number, n: number, v: number, hot: number, up = false) {
      for (let i = 0; i < n; i++) {
        const pt = s.parts[s.partHead];
        s.partHead = (s.partHead + 1) % partN;
        const a = res.rng() * TAU;
        const el = up ? 0.7 + res.rng() * 0.8 : (res.rng() - 0.25) * 1.3;
        const sv = v * (0.35 + res.rng() * 0.75);
        pt.x = x;
        pt.y = y;
        pt.z = z;
        pt.vx = Math.cos(a) * Math.cos(el) * sv;
        pt.vy = Math.sin(el) * sv * (up ? 0.6 : 1);
        pt.vz = Math.sin(a) * Math.cos(el) * sv;
        pt.t0 = t;
        pt.life = 0.8 + res.rng() * 0.9;
        pt.size = 0.035 + res.rng() * 0.05;
        pt.hot = hot * (0.6 + res.rng() * 0.8);
      }
    }
    const sample = (u: number, out: THREE.Vector3) => {
      const f = clamp01(u) * (res.LUT_N - 1);
      const i = Math.min(res.LUT_N - 2, Math.floor(f));
      const k = f - i;
      const l = res.lut;
      return out.set(
        l[i * 3] + (l[i * 3 + 3] - l[i * 3]) * k,
        0,
        l[i * 3 + 2] + (l[i * 3 + 5] - l[i * 3 + 2]) * k,
      );
    };
    const U = res.stationU;
    const SOCK = CONFIG.socket;
    const activeOf = (k: number) => clamp01((s.lit[k] - CONFIG.lit.done) / (1 - CONFIG.lit.done));

    /* ---------- Token ---------- */
    let tu = U[0];
    let ty: number = SOCK[0];
    let tScale = 1;
    let tTilt = 0;
    let emerge = 1;
    const tokenPos = p2;
    if (reached === 0) {
      emerge = seg(sp, 0.03, stops[0]);
      tScale = easeOut(emerge);
      sample(tu, tokenPos);
      tokenPos.y = SOCK[0] + 0.02 * (1 - emerge);
      s.head = U[0] * emerge;
    } else if (reached < 5) {
      const k = reached - 1;
      const f = seg(sp, stops[k] + 0.035, stops[k + 1]);
      const e = easeInOut(f);
      tu = U[k] + (U[k + 1] - U[k]) * e;
      ty = SOCK[k] + (SOCK[k + 1] - SOCK[k]) * e + Math.sin(Math.PI * e) * CONFIG.hop;
      tTilt = Math.sin(Math.PI * e) * 0.3;
      sample(tu, tokenPos);
      tokenPos.y = ty;
      s.head = tu;
    } else {
      const a4 = age(4);
      const ab = easeInOut(seg(a4, 0.1, 1.3));
      sample(U[4], tokenPos);
      const I = P[4];
      tokenPos.set(tokenPos.x + (I.x - tokenPos.x) * ab, SOCK[4] + (PT + 0.47 - SOCK[4]) * ab, tokenPos.z + (I.z - 0.12 - tokenPos.z) * ab);
      tScale = 1 - easeOut(seg(a4, 0.7, 1.5));
      s.head = U[4] + (1 - U[4]) * easeOut(seg(a4, 0.2, 2.5));
    }
    res.ribbonMat.uniforms.uHead.value = s.head;
    res.ribbonMat.uniforms.uTime.value = t;

    const ch = chipsRef.current;
    if (ch) {
      tmp.e.set(tTilt, t * 1.3, tTilt * 0.4);
      qq.setFromEuler(tmp.e);
      sc.setScalar(CONFIG.tokenScale * tScale + 1e-5);
      m.compose(tokenPos, qq, sc);
      ch.setMatrixAt(0, m);
      const a2 = age(2);
      res.chips.forEach((cd, i) => {
        p.set(cd.x, cd.y, cd.z);
        let k = 0.5;
        if (cd.bet) {
          if (a2 < 0) k = 0;
          else {
            const d = seg(a2, 0, 0.34);
            p.y = SOCK[2] + (cd.y - SOCK[2]) * d * d + (d >= 1 ? Math.sin(seg(a2, 0.34, 0.6) * Math.PI) * 0.012 : 0);
            if (d >= 1 && s.flash[2] > 0.95 && a2 < 0.45) s.flash[2] = 1;
            if (a2 >= 0.34 && a2 - dt < 0.34) {
              s.flash[2] = 1.3;
              burst(cd.x, cd.y + 0.02, cd.z, q === 2 ? 16 : 8, 0.55, 1);
            }
          }
        }
        tmp.e.set(0, cd.rot + (cd.bet ? t * 0.2 : 0), 0);
        qq.setFromEuler(tmp.e);
        sc.setScalar(k + 1e-5);
        m.compose(p, qq, sc);
        ch.setMatrixAt(i + 1, m);
      });
      ch.instanceMatrix.needsUpdate = true;
    }
    if (tokenLight.current) {
      tokenLight.current.position.set(tokenPos.x, tokenPos.y + 0.12, tokenPos.z + 0.1);
      tokenLight.current.intensity = 2.2 * o * tScale;
    }

    /* ---------- Sprites ---------- */
    const off = res.sOff.array as Float32Array;
    const colA = res.sCol.array as Float32Array;
    const spr = (i: number, x: number, y: number, z: number, color: THREE.Color, k: number, size: number) => {
      off[i * 3] = x;
      off[i * 3 + 1] = y;
      off[i * 3 + 2] = z;
      colA[i * 4] = color.r * k;
      colA[i * 4 + 1] = color.g * k;
      colA[i * 4 + 2] = color.b * k;
      colA[i * 4 + 3] = k > 0.0005 ? size : 0;
    };
    spr(S_TOKEN, tokenPos.x, tokenPos.y, tokenPos.z, tmp.pale, 1.25 * tScale * (reached === 0 ? 0.5 + 0.5 * emerge : 1), 0.62);

    /* ---------- Stations ---------- */
    const hearts: [number, number, number][] = [
      [P[0].x, SOCK[0], P[0].z],
      [P[1].x, SOCK[1], P[1].z],
      [P[2].x, res.betTop + 0.03, P[2].z],
      [P[3].x, PT + 0.2, P[3].z],
      [P[4].x, PT + 0.47, P[4].z - 0.12],
    ];
    const floorSt = res.floorMat.uniforms.uStations.value as THREE.Vector3[];
    const halos = halosRef.current;
    const labels = labelsRef.current;
    lay.getWorldQuaternion(tmp.qi).invert();
    for (let k = 0; k < 5; k++) {
      const lit = s.lit[k];
      const act = activeOf(k);
      const fl = s.flash[k];
      const [hx, hy, hz] = hearts[k];
      spr(S_GLOW + k, hx, hy, hz, tmp.gold, act * 0.3 + fl * 0.9, 0.9);
      spr(S_FLASH + k, hx, hy, hz, tmp.pale, fl * fl * 2.6, 0.32);
      floorSt[k].z = lit * 0.85 + fl * 0.5;
      if (halos) {
        tmp.e.set(0, k * 1.3 + t * (0.08 + 0.35 * act), 0);
        qq.setFromEuler(tmp.e);
        sc.setScalar(1.12 + fl * 0.08);
        m.compose(p.set(P[k].x, 0.003, P[k].z), qq, sc);
        halos.setMatrixAt(k, m);
        c.copy(tmp.graphite).multiplyScalar(0.9).lerp(tmp.gold, Math.min(1, lit * 1.4)).multiplyScalar(0.25 + lit * 0.9 + fl * 1.4);
        halos.setColorAt(k, c);
      }
      if (labels) {
        const lp = res.L.labels[k];
        sc.setScalar(portrait ? 1.25 : 1);
        m.compose(p.copy(lp), tmp.qi, sc);
        labels.setMatrixAt(k, m);
        c.setRGB(0.32, 0.32, 0.34).lerp(tmp.pale, Math.min(1, lit * 1.6)).multiplyScalar(0.55 + lit * 0.7 + fl * 0.4);
        labels.setColorAt(k, c);
      }
    }
    if (halos) {
      halos.instanceMatrix.needsUpdate = true;
      if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
    }
    if (labels) {
      labels.instanceMatrix.needsUpdate = true;
      if (labels.instanceColor) labels.instanceColor.needsUpdate = true;
    }

    // 01 Trigger: the game-state packet charges, then emits the token
    const pk = packetRef.current;
    if (pk) {
      pk.position.set(P[0].x, SOCK[0] + 0.012 * Math.sin(t * 1.6), P[0].z);
      pk.rotation.set(0.5, t * 0.9, 0.2);
      pk.scale.setScalar((1 + s.flash[0] * 0.5) * (reached === 0 ? 0.8 + 0.2 * (1 - emerge) : 0.75));
      res.packetMat.emissiveIntensity = reached === 0 ? 0.15 + emerge * 1.1 * (0.8 + 0.2 * Math.sin(t * 9)) : 0.12 + s.lit[0] * 0.6 + s.flash[0] * 1.5;
    }

    // 02 Compute: lattice of agent nodes with reasoning pulses
    const cg = computeRef.current;
    const nodesM = nodesRef.current;
    if (cg && nodesM) {
      const rot = t * 0.16;
      cg.position.set(P[1].x, SOCK[1], P[1].z);
      cg.rotation.set(0, rot, 0);
      const lit = s.lit[1];
      const act = activeOf(1);
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      for (let i = 0; i < nodeN; i++) {
        const n = res.used[i];
        const ns = res.nodeSeed[i];
        const fire = Math.pow(0.5 + 0.5 * Math.sin(t * ns.f + ns.ph), 6);
        sc.setScalar(i === 0 ? 0.034 : 0.017 + fire * 0.004 * act);
        qq.identity();
        m.compose(n, qq, sc);
        nodesM.setMatrixAt(i, m);
        c.copy(tmp.graphite).lerp(tmp.gold, Math.min(1, lit * 1.6));
        nodesM.setColorAt(i, c);
        const k = lit * 0.12 + act * (0.15 + fire * 1.1) + s.flash[1] * 0.6;
        spr(S_NODE + i, P[1].x + n.x * cr + n.z * sr, SOCK[1] + n.y, P[1].z - n.x * sr + n.z * cr, i === 0 ? tmp.pale : tmp.gold, i === 0 ? k * 1.2 : k, i === 0 ? 0.28 : 0.15);
      }
      for (let i = nodeN; i < CONFIG.nodes; i++) spr(S_NODE + i, 0, 0, 0, tmp.gold, 0, 0);
      nodesM.instanceMatrix.needsUpdate = true;
      if (nodesM.instanceColor) nodesM.instanceColor.needsUpdate = true;
      res.linkMat.uniforms.uTime.value = t;
      res.linkMat.uniforms.uLit.value = lit;
      res.linkMat.uniforms.uActive.value = act;
    }

    // 04 Settlement: ledger block seals (lid drops, gold edges, hash streak); prior blocks behind
    const lg = ledgerRef.current;
    const ed = edgesRef.current;
    if (lg && ed) {
      const S3 = P[3];
      const a3 = age(3);
      const sealed = a3 >= 0;
      const drop = sealed ? seg(a3, 0, 0.26) : 0;
      const lift = 0.13 * (1 - drop * drop) + (drop >= 1 ? Math.sin(seg(a3, 0.26, 0.5) * Math.PI) * 0.01 : 0);
      const chain = res.L.ledgerChain;
      const blocks: [number, number, number, number, number, number, number, number, number][] = [
        // x, y, z, sx, sy, sz, glow, sweep, alpha
        [S3.x, PT + 0.1, S3.z, 0.34, 0.2, 0.26, sealed ? 0.45 + s.lit[3] * 0.55 + s.flash[3] * 0.8 : 0.06, sealed ? seg(a3, 0.22, 1.2) : 0, 1],
        [S3.x, PT + 0.2 + 0.0175 + lift, S3.z, 0.37, 0.035, 0.29, sealed ? 0.45 + s.lit[3] * 0.55 + s.flash[3] * 0.8 : 0.1 + 0.05 * Math.sin(t * 3), sealed ? seg(a3, 0.22, 1.2) : 0, 1],
        [S3.x - 0.03, 0.08, S3.z - 0.62, 0.27, 0.16, 0.2, 0.32, 0, chain ? 0.65 : 0],
        [S3.x - 0.07, 0.07, S3.z - 0.98, 0.24, 0.14, 0.18, 0.22, 0, chain ? 0.4 : 0],
      ];
      const stAttr = ed.geometry.getAttribute("aState") as THREE.InstancedBufferAttribute | undefined;
      qq.identity();
      blocks.forEach((b, i) => {
        const vis = b[8] > 0 ? 1 : 0;
        m.compose(p.set(b[0], b[1], b[2]), qq, sc.set(b[3] * vis + 1e-5, b[4] * vis + 1e-5, b[5] * vis + 1e-5));
        lg.setMatrixAt(i, m);
        m.compose(p, qq, sc.multiplyScalar(1.006));
        ed.setMatrixAt(i, m);
        stAttr?.setXYZ(i, b[6], b[7], b[8]);
      });
      if (stAttr) stAttr.needsUpdate = true;
      lg.instanceMatrix.needsUpdate = true;
      ed.instanceMatrix.needsUpdate = true;
    }

    // 05 Insight: gold bars rise, the hologram sparkline draws in
    const bars = barsRef.current;
    if (bars) {
      const a4 = age(4);
      const I = P[4];
      const kb = 1 - Math.exp(-dt * 5);
      for (let i = 0; i < BARS; i++) {
        const tg = a4 >= 0 ? easeOut(seg(a4, 0.15 + i * 0.07, 0.85 + i * 0.07)) : 0;
        s.rise[i] += (tg - s.rise[i]) * kb;
        s.barLive[i] *= Math.exp(-dt * 0.6);
        const h = res.barH[i] * (0.1 + 0.9 * s.rise[i]) + s.barLive[i] * s.rise[i];
        const x = I.x - 0.21 + i * 0.07;
        const z = I.z + 0.08;
        qq.identity();
        m.compose(p.set(x, PT + 0.012 + h / 2, z), qq, sc.set(0.045, h, 0.045));
        bars.setMatrixAt(i, m);
        c.copy(tmp.graphite).lerp(tmp.gold, Math.min(1, s.lit[4] * 1.5));
        bars.setColorAt(i, c);
        spr(S_CAP + i, x, PT + 0.012 + h + 0.006, z, tmp.pale, s.rise[i] * (0.35 + 0.4 * activeOf(4)), 0.12);
      }
      bars.instanceMatrix.needsUpdate = true;
      if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
      const rv = a4 >= 0 ? easeOut(seg(a4, 0.3, 2.0)) : 0;
      s.reveal += (rv - s.reveal) * kb;
      res.holoMat.uniforms.uReveal.value = s.reveal;
      res.holoMat.uniforms.uLit.value = Math.max(s.lit[4], 0.12);
      res.holoMat.uniforms.uTime.value = t;
    }

    // Ambient flow: one spark per sim settlement rides the rail end to end
    const density = calm ? CONFIG.calm.density : 1;
    s.flows = s.flows.filter((f) => (t - f.t0) * f.v < 1);
    const maxFlow = Math.floor(flowN * density);
    for (let i = 0; i < CONFIG.flow.max; i++) {
      const f = i < maxFlow ? s.flows[i] : undefined;
      if (!f) {
        spr(S_FLOW + i, 0, 0, 0, tmp.gold, 0, 0);
        continue;
      }
      const u = (t - f.t0) * f.v;
      sample(u, p);
      const fade = seg(u, 0, 0.06) * (1 - seg(u, 0.92, 1)) * (u < s.head ? 1 : 0.55);
      spr(S_FLOW + i, p.x, 0.03, p.z, tmp.gold, 0.55 * fade, f.size * 1.4);
    }

    // Particles
    for (let i = 0; i < CONFIG.particles; i++) {
      const pt = s.parts[i];
      const a = t - pt.t0;
      if (i >= partN || a > pt.life || a < 0) {
        spr(S_PART + i, 0, 0, 0, tmp.pale, 0, 0);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      const dr = Math.exp(-dt * 2.4);
      pt.vx *= dr;
      pt.vy = pt.vy * dr + 0.04 * dt;
      pt.vz *= dr;
      const k = Math.pow(1 - a / pt.life, 2) * pt.hot;
      spr(S_PART + i, pt.x, pt.y, pt.z, tmp.pale, k * 1.4, pt.size);
    }
    res.sOff.needsUpdate = true;
    res.sCol.needsUpdate = true;

    res.dustMat.uniforms.uTime.value = t;
    res.dustMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    res.geos.dustGeo.setDrawRange(0, Math.floor(dustN * density));
  });

  const I = res.L.stations[4];
  return (
    <group ref={root} visible={false}>
      <group ref={layoutRef}>
        <pointLight ref={keyLight} position={[-1.6, 2.6, 2.6]} intensity={0} distance={14} decay={1.3} color={CONFIG.colors.goldPale} />
        <pointLight ref={tokenLight} intensity={0} distance={2.4} decay={1.8} color={CONFIG.colors.gold} />
        <mesh geometry={res.geos.floor} material={res.floorMat} rotation-x={-Math.PI / 2} renderOrder={-1} />
        <mesh geometry={res.geos.ribbon} material={res.ribbonMat} renderOrder={1} />
        <mesh geometry={res.geos.lacquerGeo} material={res.lacquer} />
        <mesh geometry={res.geos.goldGeo} material={res.gold} />
        <instancedMesh ref={halosRef} args={[res.geos.halo, res.haloMat, 5]} renderOrder={1} frustumCulled={false} />
        <instancedMesh ref={cardsRef} args={[res.geos.card, res.cardMat, 2]} />
        <mesh ref={packetRef} geometry={res.geos.packet} material={res.packetMat} />
        <group ref={computeRef}>
          <instancedMesh ref={nodesRef} args={[res.geos.node, res.tintMetal, nodeN]} frustumCulled={false} />
          <lineSegments geometry={res.geos.links} material={res.linkMat} renderOrder={2} />
        </group>
        <instancedMesh ref={chipsRef} args={[res.geos.chipGeo, res.chipMat, res.chips.length + 1]} frustumCulled={false} />
        <instancedMesh ref={ledgerRef} args={[res.geos.ledgerBody, res.ledgerMat, 4]} frustumCulled={false} />
        <instancedMesh ref={edgesRef} args={[res.geos.ledgerEdge, res.edgeMat, 4]} frustumCulled={false} renderOrder={3} />
        <instancedMesh ref={barsRef} args={[res.geos.bar, res.tintMetal, BARS]} frustumCulled={false} />
        <mesh geometry={res.geos.holo} material={res.holoMat} position={[I.x, CONFIG.plinth.h + 0.47, I.z - 0.14]} renderOrder={3} />
        <instancedMesh ref={labelsRef} args={[res.geos.label, res.labelMat, 5]} frustumCulled={false} renderOrder={4} />
        <mesh geometry={res.geos.sprite} material={res.spriteMat} frustumCulled={false} renderOrder={5} />
        <points geometry={res.geos.dustGeo} material={res.dustMat} frustumCulled={false} />
      </group>
    </group>
  );
}
