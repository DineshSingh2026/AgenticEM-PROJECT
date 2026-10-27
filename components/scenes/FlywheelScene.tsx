"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSceneStore } from "@/lib/scene-store";
import { useSimFeed } from "@/lib/sim/useSimFeed";
import { mulberry32 } from "@/lib/sim/prng";
import seed from "@/lib/sim/seed.json";
import { useSceneFade } from "./shared/useSceneFade";
import polarVert from "./shaders/flywheel-polar-vert.glsl";
import hudFrag from "./shaders/flywheel-hud-frag.glsl";
import streamFrag from "./shaders/flywheel-stream-frag.glsl";
import dustVert from "./shaders/flywheel-dust-vert.glsl";
import dustFrag from "./shaders/flywheel-dust-frag.glsl";

/**
 * FlywheelScene — a gold gyroscopic "intelligence engine".
 * Unit space: outer HUD edge = 1. Four stage nodes sit on the data track (r = 0.8) on the diagonals, each pointing at
 * its step card (01 top-left, 02 top-right, 03 bottom-right, 04 bottom-left). Data beads flow clockwise node to node;
 * every completed lap (and every simulated settled round) compounds the flow volume. The mechanism is anchored to the
 * DOM: the open centre cell of the step grid on desktop, a reserved square above the cards on mobile, and the empty
 * side / top of the PageHero on /company.
 */
const CONFIG = {
  seed: 0xf1e3e1,
  trackR: 0.8,
  nodeR: 0.8,
  nodeZ: 0.045,
  beads: 520,
  packets: 14,
  packetTrail: 3,
  packetSpeed: 0.16,
  packetGap: 0.22,
  teeth: 72,
  dust: 160,
  /** laps per second */
  flow: { base: 0.05, volGain: 0.9, scrollGain: 0.004, maxBoost: 0.22, lerp: 2.2 },
  lead: 0.1,
  vol: { floor: 0.3, lap: 0.14, event: 0.004, packet: 0.02, tau: 26 },
  rotor: 0.9,
  tilt: { x: -0.2, y: 0.16 },
  pointerTilt: { x: 0.08, y: 0.12 },
  /** fallback placement (no DOM anchor, e.g. /company PageHero) */
  heroDesktop: { x: 0.77, y: 0.52, r: [0.29, 0.19] as const },
  heroMobileNav: 78,
  calm: { density: 0.4, speed: 0.5 },
  envIntensity: 1.0,
  colors: { gold: "#E8B65A", goldPale: "#F7DFA3", goldDeep: "#B07A2A", lacquer: "#0B0D10", felt: "#0c2a21", ivory: "#efe6d2" },
} as const;

const NAME = "FlywheelScene" as const;
const TAU = Math.PI * 2;
const NODE_A = [0.75, 0.25, -0.25, -0.75].map((f) => f * Math.PI);
const GAMES = ["poker", "blackjack", "roulette", "baccarat", "dice"] as const;
/** clockwise lap fraction (0 at node 0) to angle */
const angleAt = (s: number) => NODE_A[0] - s * TAU;

function lathe(points: [number, number][], segs: number) {
  const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
  g.rotateX(Math.PI / 2);
  return g;
}

function annulus(r0: number, r1: number, nr: number, na: number, z: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nr; j++) {
    const r = r0 + ((r1 - r0) * j) / nr;
    for (let i = 0; i <= na; i++) {
      const a = (i / na) * TAU;
      pos.push(Math.cos(a) * r, Math.sin(a) * r, z);
    }
  }
  for (let j = 0; j < nr; j++)
    for (let i = 0; i < na; i++) {
      const a = j * (na + 1) + i;
      idx.push(a, a + 1, a + na + 1, a + 1, a + na + 2, a + na + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(0.6, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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
  panel("#fff4e0", 5, [0, 6, 1], [8, 2.2]);
  panel("#ffe2b0", 3.5, [-6, 1.5, 2], [0.6, 7]);
  panel("#ffffff", 2.4, [6, 2, -2], [0.5, 6]);
  panel("#ffcf8a", 2.2, [0, -1, 6], [6, 0.5]);
  panel("#7f8fa8", 0.8, [0, -5, 0], [10, 10]);
  const pmrem = new THREE.PMREMGenerator(gl);
  const tex = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  geo.dispose();
  mats.forEach((m) => m.dispose());
  return tex;
}

interface Bead { s: number; dr: number; dz: number; w: number; size: number; color: THREE.Color }
interface Packet { active: boolean; t0: number; w: number; passed: number }

export function FlywheelScene() {
  const quality = useSceneStore((s) => s.quality);
  const q = quality >= 2 ? 2 : 1;
  return <FlywheelInner key={q} q={q} />;
}

function FlywheelInner({ q }: { q: 1 | 2 }) {
  const { opacity, isVisible } = useSceneFade(NAME);
  const gl = useThree((s) => s.gl);

  const root = useRef<THREE.Group>(null);
  const place = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const gimbalA = useRef<THREE.Mesh>(null);
  const gimbalB = useRef<THREE.Mesh>(null);
  const teethRef = useRef<THREE.InstancedMesh>(null);
  const bezelRef = useRef<THREE.InstancedMesh>(null);
  const faceRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const cylRef = useRef<THREE.InstancedMesh>(null);
  const glowBoxRef = useRef<THREE.InstancedMesh>(null);
  const beadRef = useRef<THREE.InstancedMesh>(null);
  const keyLight = useRef<THREE.PointLight>(null);

  const beadN = q === 2 ? CONFIG.beads : CONFIG.beads / 2;
  const dustN = q === 2 ? CONFIG.dust : CONFIG.dust / 2;
  const packetInst = CONFIG.packets * (1 + CONFIG.packetTrail);
  const AGENTS = 3;
  const BOXES = 12;
  const CYLS = 7;
  const GLOW_BOXES = 21;

  const res = useMemo(() => {
    const rng = mulberry32(CONFIG.seed);
    const col = CONFIG.colors;
    const base = { metalness: 1, roughness: 0.22, envMapIntensity: CONFIG.envIntensity, transparent: true, opacity: 0, side: THREE.DoubleSide };
    const gold =
      q === 2
        ? new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color(col.gold), clearcoat: 0.45, clearcoatRoughness: 0.12 })
        : new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color(col.gold) });
    const goldDeep = new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color(col.goldDeep).lerp(new THREE.Color(col.gold), 0.35), roughness: 0.3 });
    const parts = new THREE.MeshStandardMaterial({ ...base, color: 0xffffff, roughness: 0.28 });
    const lacquer = new THREE.MeshStandardMaterial({ color: new THREE.Color(col.lacquer), metalness: 0.5, roughness: 0.18, envMapIntensity: 0.7, transparent: true, opacity: 0 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const haloTex = haloTexture();
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, color: 0xffffff, toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const gMul = (h: string, k: number) => new THREE.Color(h).multiplyScalar(k);
    const hudMat = new THREE.ShaderMaterial({
      vertexShader: polarVert,
      fragmentShader: hudFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uOpacity: { value: 0 },
        uRot: { value: new THREE.Vector3() },
        uStage: { value: 0 },
        uVol: { value: 0 },
        uPulse: { value: [0, 0, 0, 0] },
        uGold: { value: gMul(col.gold, 0.6) },
        uPale: { value: gMul(col.goldPale, 0.8) },
        uDeep: { value: gMul(col.goldDeep, 0.5) },
      },
    });
    const streamMat = new THREE.ShaderMaterial({
      vertexShader: polarVert,
      fragmentShader: streamFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uOpacity: { value: 0 },
        uFlow: { value: 0 },
        uLead: { value: 0 },
        uVol: { value: 0 },
        uGold: { value: gMul(col.gold, 0.9) },
        uPale: { value: gMul(col.goldPale, 2.2) },
      },
    });
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uSize: { value: 4 }, uPixelRatio: { value: 1 }, uColor: { value: gMul(col.goldPale, 0.6) }, uOpacity: { value: 0 } },
    });

    const geos = {
      hud: annulus(0.26, 1.06, 2, 384, -0.04),
      stream: annulus(0.74, 0.86, 6, 384, -0.01),
      rotor: lathe(
        [[0.43, -0.04], [0.43, 0.026], [0.437, 0.042], [0.468, 0.046], [0.474, 0.034], [0.516, 0.034], [0.522, 0.046], [0.553, 0.042], [0.562, 0.026], [0.562, -0.04]],
        160,
      ),
      race: lathe([[0.392, -0.02], [0.392, 0.018], [0.4, 0.026], [0.42, 0.026], [0.42, -0.02]], 128),
      tooth: new THREE.BoxGeometry(1, 1, 1),
      gimbalA: new THREE.TorusGeometry(0.37, 0.008, 12, 180),
      gimbalB: new THREE.TorusGeometry(0.326, 0.006, 10, 160),
      bezel: lathe([[0.13, -0.025], [0.13, 0.024], [0.137, 0.036], [0.158, 0.038], [0.168, 0.026], [0.168, -0.03]], 64),
      face: new THREE.CircleGeometry(0.132, 48),
      plane: new THREE.PlaneGeometry(1, 1),
      box: new THREE.BoxGeometry(1, 1, 1),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 40, 1),
      bead: new THREE.SphereGeometry(1, 10, 8),
      dust: new THREE.BufferGeometry(),
    };

    const dp = new Float32Array(CONFIG.dust * 3);
    const ds = new Float32Array(CONFIG.dust);
    for (let i = 0; i < CONFIG.dust; i++) {
      const a = rng() * TAU;
      const r = 0.35 + Math.pow(rng(), 0.7) * 0.95;
      dp[i * 3] = Math.cos(a) * r;
      dp[i * 3 + 1] = Math.sin(a) * r;
      dp[i * 3 + 2] = (rng() - 0.5) * 0.8;
      ds[i] = rng();
    }
    geos.dust.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    geos.dust.setAttribute("aSeed", new THREE.BufferAttribute(ds, 1));
    geos.dust.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);

    const white = new THREE.Color("#fff6e6");
    const pale = new THREE.Color(col.goldPale);
    const goldC = new THREE.Color(col.gold);
    const beads: Bead[] = [];
    for (let i = 0; i < CONFIG.beads; i++) {
      const g = (rng() + rng() + rng()) / 3 - 0.5;
      const k = 1.1 + rng() * 1.8;
      beads.push({
        s: rng(),
        dr: g * 0.075,
        dz: (rng() - 0.5) * 0.04,
        w: 0.82 + rng() * 0.4,
        size: 0.0045 + rng() * 0.0055,
        color: white.clone().lerp(rng() < 0.6 ? pale : goldC, rng()).multiplyScalar(k),
      });
    }
    let cum = 0;
    const mix = GAMES.map((g) => (cum += seed.gameMix[g]) - seed.gameMix[g] / 2);
    const barBase = [0.38, 0.62, 0.5, 0.82, 0.7].map((v, i) => v * (0.85 + mix[i] * 0.3));

    return { rng, gold, goldDeep, parts, lacquer, glowMat, haloMat, hudMat, streamMat, dustMat, haloTex, geos, beads, barBase };
  }, [q]);

  useEffect(() => {
    const env = buildEnv(gl);
    for (const m of [res.gold, res.goldDeep, res.parts, res.lacquer]) {
      m.envMap = env;
      m.needsUpdate = true;
    }
    return () => env.dispose();
  }, [gl, res]);

  useEffect(
    () => () => {
      Object.values(res.geos).forEach((g) => g.dispose());
      res.haloTex.dispose();
      [res.gold, res.goldDeep, res.parts, res.lacquer, res.glowMat, res.haloMat, res.hudMat, res.streamMat, res.dustMat].forEach((m) => m.dispose());
    },
    [res],
  );

  const nodeM = useMemo(
    () =>
      NODE_A.map((a) =>
        new THREE.Matrix4().makeTranslation(Math.cos(a) * CONFIG.nodeR, Math.sin(a) * CONFIG.nodeR, CONFIG.nodeZ),
      ),
    [],
  );

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), c: new THREE.Color(), v: new THREE.Vector3() }),
    [],
  );

  /** Write one emblem instance in node-k space. */
  const setPart = (mesh: THREE.InstancedMesh, i: number, k: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) => {
    const { m, p, s, q: qq, e } = tmp;
    e.set(rx, ry, rz);
    qq.setFromEuler(e);
    m.compose(p.set(x, y, z), qq, s.set(sx, sy, sz));
    m.premultiply(nodeM[k]);
    mesh.setMatrixAt(i, m);
  };

  // Static layouts: teeth, bezels, faces, emblem colours
  useEffect(() => {
    const { m, p, s, q: qq, c } = tmp;
    const t = teethRef.current;
    if (t) {
      for (let i = 0; i < CONFIG.teeth; i++) {
        const a = (i / CONFIG.teeth) * TAU;
        qq.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
        m.compose(p.set(Math.cos(a) * 0.578, Math.sin(a) * 0.578, 0.0), qq, s.set(0.03, 0.012, i % 6 === 0 ? 0.07 : 0.05));
        t.setMatrixAt(i, m);
      }
      t.instanceMatrix.needsUpdate = true;
    }
    qq.identity();
    for (let k = 0; k < 4; k++) {
      m.copy(nodeM[k]);
      bezelRef.current?.setMatrixAt(k, m);
      m.compose(p.set(0, 0, 0.008), qq, s.set(1, 1, 1)).premultiply(nodeM[k]);
      faceRef.current?.setMatrixAt(k, m);
    }
    [bezelRef.current, faceRef.current].forEach((x) => x && (x.instanceMatrix.needsUpdate = true));
    const cyl = cylRef.current;
    if (cyl) {
      const chipCols = [CONFIG.colors.gold, CONFIG.colors.ivory, CONFIG.colors.goldDeep, CONFIG.colors.ivory, CONFIG.colors.gold];
      chipCols.forEach((h, i) => cyl.setColorAt(i, c.set(h)));
      cyl.setColorAt(5, c.set(CONFIG.colors.goldDeep));
      cyl.setColorAt(6, c.set(CONFIG.colors.felt));
    }
    const box = boxRef.current;
    if (box) {
      for (let i = 0; i < 10; i++) box.setColorAt(i, c.set(CONFIG.colors.gold));
      box.setColorAt(10, c.set(CONFIG.colors.ivory));
      box.setColorAt(11, c.set(CONFIG.colors.ivory));
    }
    [cyl, box].forEach((x) => x?.instanceColor && (x.instanceColor.needsUpdate = true));
  }, [res, nodeM, tmp]);

  const st = useRef({
    t: 0,
    flow: 0,
    omega: CONFIG.flow.base,
    lead: 0,
    vol: 0.45,
    rotor: 0,
    hud: new THREE.Vector3(),
    pulse: [0, 0, 0, 0],
    active: [1, 0, 0, 0],
    cells: new Float32Array(16),
    bars: [0, 0, 0, 0, 0],
    flip: 0,
    queue: 0,
    lastSpawn: 0,
    packets: new Array(CONFIG.packets).fill(0).map<Packet>(() => ({ active: false, t0: 0, w: 1, passed: 0 })),
    calm: false,
    section: null as HTMLElement | null,
    lastPlace: { x: 0, y: 0, r: 0 },
  });

  useSimFeed("round.settled", (e) => {
    if (!isVisible()) return;
    const s = st.current;
    s.queue = Math.min(4, s.queue + 1);
    s.vol = Math.min(1, s.vol + CONFIG.vol.event * Math.min(2, 0.6 + Math.log10(1 + e.stakeUsd) * 0.3));
  });

  useFrame((state, dtRaw) => {
    const g = root.current;
    const o = opacity.current;
    const visible = isVisible();
    if (keyLight.current) keyLight.current.intensity = 6 * o;
    if (!g) return;
    g.visible = visible;
    if (!visible) {
      st.current.queue = 0;
      return;
    }
    const s = st.current;
    const store = useSceneStore.getState();
    if (store.activeScene === NAME) s.calm = store.variant === "calm";
    const calm = s.calm;
    const motion = store.reducedMotion ? 0 : 1;
    const speed = (calm ? CONFIG.calm.speed : 1) * motion;
    const density = calm ? CONFIG.calm.density : 1;
    const dt = Math.min(dtRaw, 0.05);
    s.t += dt * speed;
    const t = s.t;

    /* ---------- DOM-anchored placement ---------- */
    const W = state.size.width;
    const H = state.size.height;
    const vp = state.viewport;
    const wpp = vp.height / H;
    if (!s.section || !s.section.isConnected) s.section = document.querySelector<HTMLElement>(`[data-scene="${NAME}"]`);
    const sec = s.section;
    if (sec) {
      let anchor: HTMLElement | null = null;
      sec.querySelectorAll<HTMLElement>("[data-fw-anchor]").forEach((el) => {
        if (!anchor && el.offsetWidth > 0) anchor = el;
      });
      const a = anchor as HTMLElement | null;
      if (a) {
        const r = a.getBoundingClientRect();
        const square = a.dataset.fwAnchor === "square";
        s.lastPlace.x = r.left + r.width / 2;
        s.lastPlace.y = r.top + r.height / 2;
        s.lastPlace.r = square ? Math.min(r.width, r.height) * 0.5 * 0.96 : 0.5 * Math.hypot(r.width, r.height) * 0.97;
      } else {
        const r = sec.getBoundingClientRect();
        if (W > H) {
          const L = CONFIG.heroDesktop;
          s.lastPlace.x = W * L.x;
          s.lastPlace.y = r.top + r.height * L.y;
          s.lastPlace.r = Math.min(H * L.r[0], W * L.r[1]);
        } else {
          const text = sec.querySelector<HTMLElement>(".container-site");
          const top = text ? text.getBoundingClientRect().top : r.top + r.height * 0.4;
          const nav = r.top + CONFIG.heroMobileNav;
          s.lastPlace.x = W / 2;
          s.lastPlace.y = (nav + top) / 2;
          s.lastPlace.r = Math.max(0, Math.min(((top - nav) / 2) * 0.92, W * 0.4));
        }
      }
    }
    const P = place.current!;
    const R = Math.max(0.001, s.lastPlace.r * wpp);
    P.position.set((s.lastPlace.x - W / 2) * wpp, (H / 2 - s.lastPlace.y) * wpp, 0);
    P.scale.setScalar(R);
    const kRot = 1 - Math.exp(-dt * 3);
    const px = calm ? 0 : store.pointer.x * CONFIG.pointerTilt.y;
    const py = calm ? 0 : store.pointer.y * CONFIG.pointerTilt.x;
    const T = tilt.current!;
    T.rotation.x += (CONFIG.tilt.x - py - T.rotation.x) * kRot;
    T.rotation.y += (CONFIG.tilt.y + px - T.rotation.y) * kRot;
    if (keyLight.current) {
      keyLight.current.position.set(P.position.x - R * 0.6, P.position.y + R * 1.3, R * 2.6);
      keyLight.current.distance = R * 7;
    }

    /* ---------- Fade ---------- */
    for (const m of [res.gold, res.goldDeep, res.parts, res.lacquer, res.glowMat, res.haloMat]) {
      m.opacity = o;
      if (m !== res.glowMat && m !== res.haloMat) m.depthWrite = o > 0.98;
    }
    res.hudMat.uniforms.uOpacity.value = o;
    res.streamMat.uniforms.uOpacity.value = o;
    res.dustMat.uniforms.uOpacity.value = o * 0.8;
    res.dustMat.uniforms.uTime.value = t;
    res.dustMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    res.dustMat.uniforms.uSize.value = Math.max(2.5, R * 3.2);
    const sweep = t * 0.12;
    res.gold.envMapRotation.set(0.2, sweep, 0);
    res.goldDeep.envMapRotation.set(0.2, sweep, 0);

    /* ---------- Flywheel dynamics ---------- */
    const F = CONFIG.flow;
    const boost = Math.min(Math.abs(store.scrollVelocity) * F.scrollGain, F.maxBoost);
    const target = (F.base * (1 + s.vol * F.volGain) + boost) * speed;
    s.omega += (target - s.omega) * Math.min(1, dt * F.lerp);
    s.flow += s.omega * dt;
    const prevLead = s.lead;
    s.lead += (CONFIG.lead * (0.7 + s.vol * 0.6) + boost * 0.8) * speed * dt;
    if (Math.floor(s.lead) > Math.floor(prevLead)) {
      s.vol = Math.min(1, s.vol + CONFIG.vol.lap);
      s.pulse[0] = 1;
    }
    if (Math.floor(s.lead * 4) > Math.floor(prevLead * 4)) s.pulse[Math.floor(s.lead * 4) % 4] = Math.max(s.pulse[Math.floor(s.lead * 4) % 4], 0.8);
    s.vol += (CONFIG.vol.floor - s.vol) * (1 - Math.exp(-dt / CONFIG.vol.tau));
    const stage = (s.lead % 1) * 4;
    const curStage = Math.floor(stage);
    s.rotor += (s.omega * CONFIG.rotor + boost * 0.6) * dt * TAU * 0.25;
    if (rotor.current) rotor.current.rotation.z = -s.rotor;
    if (gimbalA.current) gimbalA.current.rotation.set(Math.sin(t * 0.4) * 0.55, Math.cos(t * 0.33) * 0.45, 0);
    if (gimbalB.current) gimbalB.current.rotation.set(Math.cos(t * 0.29) * -0.5, Math.sin(t * 0.37) * 0.6, 0);
    s.hud.x -= dt * 0.03 * speed;
    s.hud.z -= dt * (0.08 + s.omega) * speed;
    res.hudMat.uniforms.uRot.value.copy(s.hud);
    res.hudMat.uniforms.uStage.value = stage;
    res.hudMat.uniforms.uVol.value = s.vol;
    res.streamMat.uniforms.uFlow.value = s.flow;
    res.streamMat.uniforms.uLead.value = s.lead % 1;
    res.streamMat.uniforms.uVol.value = s.vol;

    // Packets from settled rounds: enter at 01, travel one lap, pulse each node, compound on return.
    if (motion && s.queue > 0 && t - s.lastSpawn > CONFIG.packetGap / Math.max(0.3, speed)) {
      const slot = s.packets.findIndex((x, i) => !x.active && i < Math.ceil(CONFIG.packets * (calm ? 0.5 : 1)));
      if (slot >= 0) {
        Object.assign(s.packets[slot], { active: true, t0: t, w: 0.8 + res.rng() * 0.6, passed: 0 });
        s.queue -= 1;
        s.lastSpawn = t;
      } else s.queue = 0;
    }
    for (let k = 0; k < 4; k++) {
      s.pulse[k] *= Math.exp(-dt / 0.45);
      s.active[k] += ((k === curStage ? 1 : 0) - s.active[k]) * Math.min(1, dt * 4);
    }

    const b = beadRef.current;
    const { m, p, s: sc, q: qq, c } = tmp;
    qq.identity();
    if (b) {
      const lapT = 1 / (CONFIG.packetSpeed * (1 + s.vol * 0.8) + boost * 2);
      const K = CONFIG.packetTrail;
      for (let k = 0; k < CONFIG.packets; k++) {
        const pk = s.packets[k];
        const ph = pk.active ? (t - pk.t0) / lapT : 0;
        if (pk.active) {
          const n = Math.floor(ph * 4);
          if (n > pk.passed) {
            pk.passed = n;
            const node = n % 4;
            s.pulse[node] = Math.min(1.4, s.pulse[node] + 0.5 * pk.w);
            if (node === 1) s.cells[Math.floor(res.rng() * 16)] = 1.6;
            if (node === 2) s.bars[Math.floor(res.rng() * 5)] = 1;
            if (node === 3) s.flip = 1;
          }
          if (ph >= 1) {
            pk.active = false;
            s.pulse[0] = Math.min(1.4, s.pulse[0] + 0.5);
            s.vol = Math.min(1, s.vol + CONFIG.vol.packet);
          }
        }
        for (let j = 0; j <= K; j++) {
          const idx = k * (K + 1) + j;
          if (!pk.active) {
            m.compose(p.set(0, 0, 0), qq, sc.setScalar(0));
            b.setMatrixAt(idx, m);
            continue;
          }
          const a = angleAt(Math.max(0, ph - j * 0.012));
          const r = CONFIG.trackR;
          m.compose(p.set(Math.cos(a) * r, Math.sin(a) * r, 0.012), qq, sc.setScalar((j === 0 ? 0.016 : 0.012 * (1 - j / (K + 1))) * pk.w));
          b.setMatrixAt(idx, m);
          c.set(CONFIG.colors.goldPale).multiplyScalar(j === 0 ? 4.5 : 2.4 * (1 - j / (K + 1)));
          b.setColorAt(idx, c);
        }
      }
      // Agents orbiting the execution chips (node 0)
      for (let i = 0; i < AGENTS; i++) {
        const a = t * 1.6 + (i * TAU) / AGENTS;
        p.set(Math.cos(a) * 0.098, Math.sin(a) * 0.04 + 0.005, 0.03 + Math.sin(a) * 0.03).applyMatrix4(nodeM[0]);
        m.compose(p, qq, sc.setScalar(0.011));
        b.setMatrixAt(packetInst + i, m);
        b.setColorAt(packetInst + i, c.set(CONFIG.colors.goldPale).multiplyScalar(3 + s.pulse[0] * 2));
      }
      // Flow beads
      const off = packetInst + AGENTS;
      const n = Math.floor(beadN * density * (0.3 + 0.7 * s.vol));
      const bright = 0.55 + 0.75 * s.vol;
      for (let i = 0; i < n; i++) {
        const bd = res.beads[i];
        const a = angleAt(bd.s + s.flow * bd.w);
        const r = CONFIG.trackR + bd.dr;
        m.compose(p.set(Math.cos(a) * r, Math.sin(a) * r, bd.dz), qq, sc.setScalar(bd.size));
        b.setMatrixAt(off + i, m);
        b.setColorAt(off + i, c.copy(bd.color).multiplyScalar(bright));
      }
      b.count = off + n;
      b.instanceMatrix.needsUpdate = true;
      if (b.instanceColor) b.instanceColor.needsUpdate = true;
    }
    res.hudMat.uniforms.uPulse.value = s.pulse;

    // Node halos
    const halo = haloRef.current;
    if (halo) {
      for (let k = 0; k < 4; k++) {
        const e = 0.18 + s.active[k] * 0.55 + s.pulse[k] * 0.7;
        m.compose(p.set(0, 0, -0.03), qq, sc.set(0.62 + e * 0.12, 0.62 + e * 0.12, 1)).premultiply(nodeM[k]);
        halo.setMatrixAt(k, m);
        halo.setColorAt(k, c.set(CONFIG.colors.gold).multiplyScalar(e));
      }
      halo.instanceMatrix.needsUpdate = true;
      if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    }

    // Emblems
    const box = boxRef.current;
    const cyl = cylRef.current;
    const gb = glowBoxRef.current;
    if (box && cyl && gb) {
      // 01 execution: two chip stacks (tilted to show their faces)
      const cx = 0.9;
      const stack: [number, number, number][] = [[-0.03, -0.035, 0.055], [-0.03, -0.017, 0.055], [-0.03, 0.001, 0.055], [0.042, -0.035, 0.045], [0.042, -0.019, 0.045]];
      stack.forEach(([x, y, r], i) => setPart(cyl, i, 0, x, y, 0.02, cx, 0, 0, r, 0.013, r));
      // 04 evolution: table + felt, card flipping above
      setPart(cyl, 5, 3, 0, -0.03, 0.02, 1.05, 0, 0, 0.092, 0.012, 0.092);
      setPart(cyl, 6, 3, 0, -0.024, 0.024, 1.05, 0, 0, 0.078, 0.012, 0.078);
      s.flip *= Math.exp(-dt / 0.8);
      const spin = t * 0.9 + s.flip * 2.5;
      setPart(box, 10, 3, -0.024, 0.032, 0.05, 0.15, spin, -0.18, 0.046, 0.064, 0.003);
      setPart(box, 11, 3, 0.026, 0.03, 0.045, 0.15, -spin * 0.7 + 1.2, 0.2, 0.046, 0.064, 0.003);
      // 02 capture: gold frame + 4x4 glowing cells
      setPart(box, 0, 1, 0, 0.076, 0.02, 0, 0, 0, 0.158, 0.006, 0.012);
      setPart(box, 1, 1, 0, -0.076, 0.02, 0, 0, 0, 0.158, 0.006, 0.012);
      setPart(box, 2, 1, 0.076, 0, 0.02, 0, 0, 0, 0.006, 0.158, 0.012);
      setPart(box, 3, 1, -0.076, 0, 0.02, 0, 0, 0, 0.006, 0.158, 0.012);
      const scan = (t * 0.7) % 1;
      for (let i = 0; i < 16; i++) {
        const gx = i % 4;
        const gy = Math.floor(i / 4);
        s.cells[i] *= Math.exp(-dt / 0.5);
        const row = Math.exp(-Math.pow((gy / 3 - (1 - scan)) * 5, 2)) * 0.5;
        setPart(gb, i, 1, (gx - 1.5) * 0.034, (gy - 1.5) * 0.034, 0.022, 0, 0, 0, 0.026, 0.026, 0.004);
        gb.setColorAt(i, c.set(CONFIG.colors.gold).multiplyScalar(0.18 + row + s.cells[i] * 1.8 + s.active[1] * 0.25));
      }
      // 03 intelligence: holographic bar chart
      setPart(box, 4, 2, 0, -0.06, 0.02, 0, 0, 0, 0.14, 0.004, 0.01);
      for (let i = 0; i < 5; i++) {
        s.bars[i] *= Math.exp(-dt / 0.9);
        const h = (0.03 + res.barBase[i] * 0.075) * (0.85 + 0.1 * Math.sin(t * 0.8 + i * 1.7) + s.bars[i] * 0.25);
        const x = (i - 2) * 0.026;
        setPart(box, 5 + i, 2, x, -0.058 + h / 2, 0.02, 0, 0, 0, 0.016, h, 0.01);
        setPart(gb, 16 + i, 2, x, -0.058 + h + 0.005, 0.024, 0, 0, 0, 0.018, 0.005, 0.005);
        gb.setColorAt(16 + i, c.set(CONFIG.colors.goldPale).multiplyScalar(1.2 + s.bars[i] * 2 + s.active[2] * 0.6));
      }
      [box, cyl, gb].forEach((x) => (x.instanceMatrix.needsUpdate = true));
      if (gb.instanceColor) gb.instanceColor.needsUpdate = true;
    }
    res.geos.dust.setDrawRange(0, Math.floor(dustN * density));
  });

  return (
    <>
      <pointLight ref={keyLight} intensity={0} distance={9} decay={1.6} color={CONFIG.colors.goldPale} />
      <group ref={root} visible={false}>
        <group ref={place}>
          <points geometry={res.geos.dust} material={res.dustMat} frustumCulled={false} />
          <group ref={tilt}>
            <mesh geometry={res.geos.hud} material={res.hudMat} renderOrder={1} frustumCulled={false} />
            <mesh geometry={res.geos.stream} material={res.streamMat} renderOrder={2} frustumCulled={false} />
            <group ref={rotor}>
              <mesh geometry={res.geos.rotor} material={res.gold} />
              <mesh geometry={res.geos.race} material={res.goldDeep} />
              <instancedMesh ref={teethRef} args={[res.geos.tooth, res.goldDeep, CONFIG.teeth]} />
            </group>
            <mesh ref={gimbalA} geometry={res.geos.gimbalA} material={res.gold} />
            <mesh ref={gimbalB} geometry={res.geos.gimbalB} material={res.goldDeep} />
            <instancedMesh ref={haloRef} args={[res.geos.plane, res.haloMat, 4]} frustumCulled={false} renderOrder={1} />
            <instancedMesh ref={bezelRef} args={[res.geos.bezel, res.gold, 4]} frustumCulled={false} />
            <instancedMesh ref={faceRef} args={[res.geos.face, res.lacquer, 4]} frustumCulled={false} />
            <instancedMesh ref={boxRef} args={[res.geos.box, res.parts, BOXES]} frustumCulled={false} />
            <instancedMesh ref={cylRef} args={[res.geos.cyl, res.parts, CYLS]} frustumCulled={false} />
            <instancedMesh ref={glowBoxRef} args={[res.geos.box, res.glowMat, GLOW_BOXES]} frustumCulled={false} renderOrder={4} />
            <instancedMesh ref={beadRef} args={[res.geos.bead, res.glowMat, packetInst + AGENTS + beadN]} frustumCulled={false} renderOrder={3} />
          </group>
        </group>
      </group>
    </>
  );
}
