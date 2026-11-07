"use client";
import { useEffect, useMemo, useRef, type ComponentType, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSceneStore } from "@/lib/scene-store";
import { Kit, PAL, lathe, type Clock, type PodCtx } from "./kit";
import { Blackjack } from "./games/Blackjack";
import { Slots } from "./games/Slots";
import { Crash } from "./games/Crash";
import { Plinko } from "./games/Plinko";
import { Mines } from "./games/Mines";
import { Dice } from "./games/Dice";
import { Pool } from "./games/Pool";
import { CoinFlip } from "./games/CoinFlip";

/**
 * Cinematic tour for the hero. The film opens on the roulette wheel exactly as composed, then a
 * virtual camera pulls back and glides down an aisle of game stations behind the viewer — each one
 * a marble-and-gold stage under its own spotlight, where an AI agent plays a live round — before
 * rushing back to the wheel. The camera never moves: the whole world is moved by the inverse of the
 * virtual camera, so the shared canvas and every other scene are untouched.
 */
/** focus: height of the action (stage units); d / el: camera distance and elevation for the shot. */
const GAMES: { C: ComponentType<{ ctx: PodCtx }>; accent: string; focus: number; d: number; el: number }[] = [
  { C: Blackjack, accent: "#F7DFA3", focus: 0.15, d: 4.5, el: 0.62 },
  { C: Slots, accent: "#A98BFF", focus: 0.45, d: 4.9, el: 0.34 },
  { C: Crash, accent: "#FF8A3D", focus: 0.5, d: 5.0, el: 0.3 },
  { C: Plinko, accent: "#2EE6DC", focus: 0.5, d: 5.0, el: 0.3 },
  { C: Mines, accent: "#3DDC97", focus: 0.1, d: 4.2, el: 0.66 },
  { C: Dice, accent: "#FF5A6A", focus: 0.12, d: 4.0, el: 0.56 },
  { C: Pool, accent: "#5FB2FF", focus: 0.1, d: 4.4, el: 0.6 },
  { C: CoinFlip, accent: "#F5C451", focus: 0.3, d: 4.2, el: 0.42 },
];
const N = GAMES.length;

const AISLE = { S: 1.35, gap: 6.4, x: 2.6, y: -1.5, z0: 15 };
const SHOT = { az: 0.24, frame: 0.2 };
const HOME = { eye: new THREE.Vector3(0, 0, 8), look: new THREE.Vector3(0, 0, 0) };
const UP = new THREE.Vector3(0, 1, 0);
const MOTES = 900;
/**
 * Dwell strength. The camera rides one closed Catmull-Rom spline; time is warped per segment with
 * g(s) = s - DWELL*sin(2πs)/2π, so it eases into every shot and lingers there, but its speed never
 * reaches zero and never jumps — one continuous, glitch-free move.
 */
const DWELL = 0.84;

/** Dev aids: `?tourAt=sec` starts the tour there, `&tourFreeze=1` parks the camera on that frame. */
const DEBUG = (() => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return { at: 0, freeze: false };
  const q = new URLSearchParams(window.location.search);
  return { at: Number(q.get("tourAt") ?? 0) || 0, freeze: q.get("tourFreeze") === "1" };
})();

const stationPos = (i: number) => new THREE.Vector3(i % 2 ? AISLE.x : -AISLE.x, AISLE.y, AISLE.z0 + i * AISLE.gap);
const STATIONS = GAMES.map((_, i) => stationPos(i));

interface Pose { eye: THREE.Vector3; look: THREE.Vector3; phi: number }

/** Hero shot of station i; the look point is shifted so the game sits right of the copy. */
function stationShot(i: number, frame: number) {
  const G = GAMES[i];
  const c = STATIONS[i].clone().add(new THREE.Vector3(0, G.focus * AISLE.S, 0));
  const az = i % 2 ? -SHOT.az : SHOT.az;
  const eye = new THREE.Vector3(Math.sin(az) * Math.cos(G.el), Math.sin(G.el), Math.cos(az) * Math.cos(G.el)).multiplyScalar(G.d).add(c);
  const right = c.clone().sub(eye).normalize().cross(UP).normalize();
  return { eye, look: c.clone().addScaledVector(right, -frame * G.d) };
}

interface Path { eye: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3; phi: number[]; dur: number[]; start: number[]; loop: number }

/** Keys: wheel -> 8 stations -> rise over the aisle -> swoop back -> wheel (closed loop). */
function buildPath(frame: number): Path {
  const shots = GAMES.map((_, i) => stationShot(i, frame));
  const last = shots[N - 1];
  // the wheel stays in frame while the camera cranes up and back, then tilts down onto the first table
  const REVEAL = new THREE.Vector3(1.4, 1.7, 13);
  const eyes = [HOME.eye.clone(), REVEAL.clone(), ...shots.map((x) => x.eye)];
  const looks = [HOME.look.clone(), new THREE.Vector3(2.2, -0.3, 0), ...shots.map((x) => x.look)];
  const phi = [-1, -0.6, ...shots.map((_, i) => i)];
  const dur = [6, 6.5, ...new Array(N - 1).fill(8.6)];
  // crane up and look back down the aisle toward the wheel
  eyes.push(new THREE.Vector3(0, 5.2, last.eye.z - 4));
  looks.push(new THREE.Vector3(0, -1.2, last.eye.z - 20));
  phi.push((N - 1) / 2);
  dur.push(6);
  // arrive on the wheel along the same line we leave it (zero-velocity turn at home)
  // arrive along the same line we leave on, so the turn at the wheel has zero velocity
  eyes.push(REVEAL.clone());
  looks.push(new THREE.Vector3(1.2, -0.2, 0));
  phi.push(-0.4);
  dur.push(8.5);
  dur.push(7);
  const start: number[] = [];
  let acc = 0;
  for (const d of dur) {
    start.push(acc);
    acc += d;
  }
  return {
    eye: new THREE.CatmullRomCurve3(eyes, true, "catmullrom", 0.5),
    look: new THREE.CatmullRomCurve3(looks, true, "catmullrom", 0.5),
    phi, dur, start, loop: acc,
  };
}
const PATHS = { side: buildPath(SHOT.frame), centre: buildPath(0) };
const TAU = Math.PI * 2;

function cameraAt(t: number, path: Path, out: Pose) {
  const u = ((t % path.loop) + path.loop) % path.loop;
  let k = path.dur.length - 1;
  while (k > 0 && path.start[k] > u) k--;
  const s = (u - path.start[k]) / path.dur[k];
  const g = s - (DWELL * Math.sin(TAU * s)) / TAU;
  const n = path.dur.length;
  const p = (k + g) / n;
  path.eye.getPoint(p, out.eye);
  path.look.getPoint(p, out.look);
  out.phi = THREE.MathUtils.lerp(path.phi[k], path.phi[(k + 1) % n], g);
  return out;
}

export function CasinoFilm({
  q, opacity, env, film, onSettle,
}: {
  q: 1 | 2;
  opacity: RefObject<number>;
  env: THREE.Texture | null;
  film: RefObject<THREE.Group | null>;
  onSettle: (strength: number) => void;
}) {
  const kit = useMemo(() => new Kit(q), [q]);
  useEffect(() => () => kit.dispose(), [kit]);
  useEffect(() => {
    if (env) kit.setEnv(env);
  }, [kit, env]);
  const gl = useThree((s) => s.gl);

  const clock = useRef<Clock>({ t: 0, dt: 0, on: false, fo: 0 });
  const group = useRef<THREE.Group>(null);
  const stations = useRef<(THREE.Group | null)[]>([]);
  const spots = useRef<(THREE.SpotLight | null)[]>([]);
  const st = useRef({
    tour: DEBUG.at,
    flash: new Float32Array(N),
    pose: { eye: new THREE.Vector3(), look: new THREE.Vector3(), phi: -1 } as Pose,
    V: new THREE.Matrix4(),
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    col: new THREE.Color(),
    tmp: new THREE.Vector3(),
    right: new THREE.Vector3(),
    shadowsReady: false,
    compiled: false,
    px: 0,
    py: 0,
    key: new THREE.Vector3(),
  });

  const res = useMemo(() => {
    const g = {
      top: kit.own(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 96).translate(0, -0.05, 0)),
      band: kit.own(lathe([[1.08, -0.1], [1.135, -0.088], [1.15, -0.05], [1.14, -0.006], [1.1, 0.012], [1.07, 0.012]], 128)),
      plinth: kit.own(new THREE.CylinderGeometry(1.24, 1.32, 0.16, 96).translate(0, -0.18, 0)),
      glowRing: kit.own(new THREE.TorusGeometry(1.29, 0.012, 8, 160).rotateX(Math.PI / 2).translate(0, -0.262, 0)),
      inlay: kit.own(new THREE.TorusGeometry(1.2, 0.006, 6, 160).rotateX(Math.PI / 2).translate(0, -0.1, 0)),
    };
    const rings = GAMES.map((x) => kit.basic({ color: new THREE.Color(x.accent).multiplyScalar(2) }));
    const floors = GAMES.map((x) => kit.light(x.accent, 0.32, 0.9, kit.tex.glow));
    const golds = GAMES.map(() => kit.light(PAL.gold, 0.35, 0.9, kit.tex.glow));
    // gold dust drifting through the aisle
    const mg = new THREE.BufferGeometry();
    const p = new Float32Array(MOTES * 3);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < MOTES; i++) p.set([(rnd() - 0.5) * 16, -2.2 + rnd() * 8, 6 + rnd() * (N * AISLE.gap + 14)], i * 3);
    mg.setAttribute("position", new THREE.BufferAttribute(p, 3));
    kit.own(mg);
    const moteMat = kit.reg(new THREE.PointsMaterial({ size: 0.07, map: kit.tex.glow, color: new THREE.Color(PAL.goldPale).multiplyScalar(1.4), blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false }), 0.85);
    return { g, rings, floors, golds, mg, moteMat };
  }, [kit]);

  const ctxs = useMemo<PodCtx[]>(
    () => GAMES.map((x, i) => ({
      kit,
      clock,
      accent: new THREE.Color(x.accent),
      index: i,
      emit: (w: number) => {
        st.current.flash[i] = Math.min(1.5, st.current.flash[i] + 0.5 + w * 0.5);
        onSettle(w * 0.6);
      },
    })),
    [kit, onSettle],
  );

  // Spot targets must live in the moving world, next to their lights
  useEffect(() => {
    const grp = group.current;
    if (!grp) return;
    const targets = spots.current.filter(Boolean).map((sp) => sp!.target);
    targets.forEach((t) => grp.add(t));
    return () => targets.forEach((t) => grp.remove(t));
  }, []);

  // Real shadows from the stage spotlights on capable GPUs
  useEffect(() => {
    if (q !== 2) return;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    st.current.shadowsReady = false;
  }, [gl, q]);

  useFrame((state, dtRaw) => {
    const c = clock.current;
    const o = opacity.current ?? 0;
    const f = film.current;
    const grp = group.current;
    const s = st.current;
    c.on = o > 0.001;
    if (grp) grp.visible = c.on;
    if (!f) return;
    if (!c.on) {
      // off-screen: rewind so the hero always opens on the wheel
      s.tour = DEBUG.at;
      f.matrix.identity();
      f.matrixWorldNeedsUpdate = true;
      return;
    }
    const store = useSceneStore.getState();
    const calm = store.activeScene === "CasinoWheel" && store.variant === "calm";
    const speed = (calm ? 0.5 : 1) * (store.reducedMotion ? 0 : 1);
    const dt = Math.min(dtRaw, 0.05) * speed;
    c.dt = dt;
    c.t += dt;
    c.fo = o;
    if (!DEBUG.freeze) s.tour += dt;
    kit.fade(o);

    // Tag shadow casters once everything has mounted
    if (q === 2 && !s.shadowsReady && grp) {
      s.shadowsReady = true;
      grp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.Material;
        const lit = mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial;
        mesh.castShadow = !!lit;
        mesh.receiveShadow = !!lit;
      });
    }

    // Compile every station shader up front (with all stations visible) so none hitches on first view
    if (!s.compiled) {
      s.compiled = true;
      stations.current.forEach((sg) => { if (sg) sg.visible = true; });
      state.gl.compile(state.scene, state.camera);
    }

    // Virtual camera -> inverse world transform
    const vp = state.viewport;
    const portrait = vp.aspect < 1;
    const pose = cameraAt(s.tour, portrait ? PATHS.centre : PATHS.side, s.pose);
    const away = THREE.MathUtils.clamp(pose.phi + 1, 0, 1);
    // pointer parallax, low-passed so a twitchy mouse never jolts the camera
    const kp = 1 - Math.exp(-Math.min(dtRaw, 0.1) * 2.5);
    s.px += (store.pointer.x - s.px) * kp;
    s.py += (store.pointer.y - s.py) * kp;
    if (away > 0 && !portrait) {
      s.right.subVectors(pose.look, pose.eye).cross(UP).normalize();
      pose.eye.addScaledVector(s.right, s.px * 0.22 * away);
      pose.eye.y += s.py * 0.12 * away;
    }
    if (portrait && away > 0) pose.eye.lerp(pose.look, -0.35 * away);
    s.V.lookAt(pose.eye, pose.look, UP);
    s.V.setPosition(pose.eye);
    f.matrix.copy(state.camera.matrixWorld).multiply(s.m.copy(s.V).invert());
    f.matrixWorldNeedsUpdate = true;

    // Stations: skip only those well behind the camera (never pops on screen); glow flares on wins
    s.tmp.subVectors(pose.look, pose.eye).normalize();
    for (let j = 0; j < N; j++) {
      const sg = stations.current[j];
      if (sg) sg.visible = s.right.subVectors(STATIONS[j], pose.eye).dot(s.tmp) > -3;
      s.flash[j] *= Math.exp(-dt / 0.8);
      const k = s.flash[j];
      res.rings[j].color.copy(ctxs[j].accent).multiplyScalar(1.6 + k * 4 + Math.sin(c.t * 2 + j) * 0.25);
      res.floors[j].color.copy(ctxs[j].accent).multiplyScalar(0.3 + k * 0.5);
    }

    // Three spotlights follow the focus; station j always uses slot j % 3 so lights never pop
    const lo = Math.floor(pose.phi) - 1;
    const best = [-1, -1, -1];
    const bw = [0, 0, 0];
    for (let j = lo; j <= lo + 3; j++) {
      if (j < 0 || j >= N) continue;
      const w = THREE.MathUtils.clamp(1.6 - Math.abs(pose.phi - j), 0, 1);
      const slot = j % 3;
      if (w > bw[slot]) {
        bw[slot] = w;
        best[slot] = j;
      }
    }
    for (let k = 0; k < 3; k++) {
      const sp = spots.current[k];
      if (!sp) continue;
      const j = best[k];
      if (j < 0) {
        sp.intensity = 0;
        continue;
      }
      const P = STATIONS[j];
      sp.position.set(P.x + (j % 2 ? -1.2 : 1.2), P.y + 6.2, P.z + 2.4);
      sp.target.position.set(P.x, P.y + 0.3, P.z);
      sp.intensity = 520 * bw[k] * o * (1 + s.flash[j] * 0.35);
    }
    // One shadow-casting key light glides along with the focus (a single shadow pass per frame)
    const key = spots.current[3];
    if (key) {
      const fc = THREE.MathUtils.clamp(pose.phi, 0, N - 1);
      const i0 = Math.floor(fc);
      const i1 = Math.min(N - 1, i0 + 1);
      s.key.lerpVectors(STATIONS[i0], STATIONS[i1], THREE.MathUtils.smoothstep(fc - i0, 0, 1));
      key.position.set(s.key.x * 0.6, s.key.y + 7, s.key.z + 3.2);
      key.target.position.set(s.key.x, s.key.y + 0.3, s.key.z);
      key.intensity = 420 * o * away;
    }
  });

  return (
    <group ref={group} visible={false}>
      {[0, 1, 2].map((k) => (
        <spotLight
          key={k}
          ref={(l) => { spots.current[k] = l; }}
          intensity={0}
          angle={0.42}
          penumbra={0.85}
          decay={1.6}
          distance={0}
          color="#FFE7BF"
        />
      ))}
      {[3].map((k) => (
        <spotLight
          key={k}
          ref={(l) => { spots.current[k] = l; }}
          intensity={0}
          angle={0.38}
          penumbra={0.9}
          decay={1.6}
          distance={0}
          color="#FFF1D6"
          castShadow={q === 2}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
          shadow-camera-near={2}
          shadow-camera-far={16}
        />
      ))}
      <points geometry={res.mg} material={res.moteMat} frustumCulled={false} />
      {GAMES.map((game, i) => (
        <group key={i} ref={(o) => { stations.current[i] = o; }} position={STATIONS[i].toArray()} scale={AISLE.S}>
          <mesh geometry={kit.geo.pool} material={res.golds[i]} position={[0, -0.27, 0]} scale={9} renderOrder={-2} />
          <mesh geometry={kit.geo.pool} material={res.floors[i]} position={[0, -0.265, 0]} scale={4.5} renderOrder={-2} />
          <mesh geometry={res.g.plinth} material={kit.mat.lacquer} />
          <mesh geometry={res.g.glowRing} material={res.rings[i]} />
          <mesh geometry={res.g.inlay} material={kit.mat.gold} />
          <mesh geometry={res.g.top} material={kit.mat.deck} />
          <mesh geometry={res.g.band} material={kit.mat.gold} />
          <game.C ctx={ctxs[i]} />
        </group>
      ))}
    </group>
  );
}

