"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Sparks, Waves, easeIn, hop, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, handPos, makeRig } from "../Robot";

/**
 * Plinko: the agent tosses glowing balls into a gold peg pyramid; each one ricochets peg to peg
 * (pegs flare on contact) and drops into a bin; edge bins pay big and light up.
 */
const B = { x: -0.14, z: -0.02, sp: 0.092, dy: 0.082, top: 0.94, r0: 2, rows: 8, ball: 0.026, hopT: 0.15, drop: 1.3 };
const BINS = B.rows + 1;
const BIN_Y = B.top - B.rows * B.dy - 0.06;
const MAX_BALLS = 5;
const TRAIL = 6;
const pegList: [number, number][] = [];
for (let r = B.r0; r < B.r0 + B.rows; r++) for (let i = 0; i <= r; i++) pegList.push([r, i]);
const pegX = (r: number, i: number) => B.x + (i - r / 2) * B.sp;
const pegY = (r: number) => B.top - (r - B.r0) * B.dy;
const pegIndex = (r: number, i: number) => pegList.findIndex(([a, b]) => a === r && b === i);
/** Bin weights: edges are rare jackpots, centre is common. */
const WEIGHT = [0.07, 0.09, 0.12, 0.14, 0.16, 0.14, 0.12, 0.09, 0.07];

interface Ball { active: boolean; t0: number; path: number[]; bin: number; from: THREE.Vector3; trail: THREE.Vector3[]; landed: boolean; hue: THREE.Color }

export function Plinko({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0.62, 0, 0.05], 0.44, -0.45);
    const board = kit.own(new RoundedBoxGeometry(0.98, 0.98, 0.035, 2, 0.015).translate(B.x, 0.5, B.z - 0.04));
    const frame = kit.own(new RoundedBoxGeometry(1.03, 1.03, 0.025, 2, 0.01).translate(B.x, 0.5, B.z - 0.06));
    const peg = kit.own(new THREE.SphereGeometry(0.016, 10, 8));
    const ball = kit.own(new THREE.SphereGeometry(1, 16, 12));
    const divider = kit.own(new THREE.BoxGeometry(0.008, 0.08, 0.03));
    const binGlow = kit.own(new THREE.PlaneGeometry(B.sp * 0.9, 0.075));
    const feet = kit.own(new RoundedBoxGeometry(1.1, 0.05, 0.18, 2, 0.015).translate(B.x, 0.025, B.z - 0.03));
    const boardMat = kit.std({ color: new THREE.Color("#10302f"), emissive: new THREE.Color(ctx.accent), emissiveIntensity: 0.06, metalness: 0.5, roughness: 0.25, envMapIntensity: 0.6 }, 0.94);
    const pegMat = kit.basic({ color: 0xffffff });
    const ballMat = kit.basic({ color: 0xffffff });
    const binMat = kit.basic({ color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false });
    return { rig, board, frame, peg, ball, divider, binGlow, feet, boardMat, pegMat, ballMat, binMat, sparks: new Sparks(kit, 64), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);

  const pegs = useRef<THREE.InstancedMesh>(null);
  const balls = useRef<THREE.InstancedMesh>(null);
  const bins = useRef<THREE.InstancedMesh>(null);
  const st = useRef({
    pegFlash: new Float32Array(pegList.length),
    binFlash: new Float32Array(BINS),
    balls: new Array(MAX_BALLS).fill(0).map<Ball>(() => ({ active: false, t0: 0, path: [], bin: 0, from: new THREE.Vector3(), trail: new Array(TRAIL).fill(0).map(() => new THREE.Vector3()), landed: false, hue: new THREE.Color() })),
    nextDrop: 0.6 + ctx.index * 0.3,
    armT: -9,
    count: 0,
    hand: new THREE.Vector3(),
    p: new THREE.Vector3(),
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    sc: new THREE.Vector3(),
    col: new THREE.Color(),
    look: new THREE.Vector3(),
    init: false,
    hot: new THREE.Color("#FFF4D6").multiplyScalar(4),
  });

  /** Ball position at time `a` (seconds since toss). Returns peg row hit this frame or -1. */
  const ballAt = (bl: Ball, a: number, hand: THREE.Vector3, out: THREE.Vector3) => {
    const toss = 0.32;
    const entry = { x: B.x, y: pegY(B.r0) + 0.1 };
    if (a < toss) {
      const f = a / toss;
      out.set(lerp(bl.from.x, entry.x, f), lerp(bl.from.y, entry.y, f) + 0.18 * hop(f), lerp(bl.from.z, B.z + 0.02, f));
      return;
    }
    const a1 = a - toss;
    const fall = 0.14;
    if (a1 < fall) {
      out.set(entry.x, lerp(entry.y, pegY(B.r0) + 0.013 + B.ball, easeIn(a1 / fall)), B.z + 0.02);
      return;
    }
    const a2 = a1 - fall;
    const step = Math.floor(a2 / B.hopT);
    const f = (a2 - step * B.hopT) / B.hopT;
    let k = 1; // rights so far relative to row r0 (centre peg index 1 at r0=2)
    for (let i = 0; i < Math.min(step, B.rows); i++) k += bl.path[i];
    const r = B.r0 + Math.min(step, B.rows);
    if (step >= B.rows) {
      // drop into bin
      const x = B.x + (bl.bin + 1 - (B.r0 + B.rows) / 2) * B.sp;
      const y0 = pegY(B.r0 + B.rows - 1) + 0.013 + B.ball;
      const ff = Math.min(1, (a2 - B.rows * B.hopT) / 0.16);
      out.set(x, lerp(y0 - 0.02, BIN_Y + B.ball, easeIn(ff)), B.z + 0.02);
      return;
    }
    const x0 = pegX(r, k);
    const y0 = pegY(r) + 0.013 + B.ball;
    const nk = k + bl.path[step];
    const lastRow = step === B.rows - 1;
    const x1 = lastRow ? B.x + (nk - (r + 1) / 2) * B.sp : pegX(r + 1, nk);
    const y1 = lastRow ? y0 - 0.02 : pegY(r + 1) + 0.013 + B.ball;
    const xm = lerp(x0, (x0 + x1) / 2, Math.min(1, f * 2.2));
    out.set(f < 0.45 ? xm : lerp((x0 + x1) / 2, x1, (f - 0.45) / 0.55), lerp(y0, y1, easeIn(f, 1.6)) + 0.03 * hop(Math.min(1, f * 1.6)), B.z + 0.02);
  };

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on) return;
    const { t, dt } = c;
    const s = st.current;
    const rig = res.rig;

    // Static layout once
    if (!s.init && pegs.current && bins.current) {
      s.init = true;
      pegList.forEach(([r, i], n) => {
        s.m.makeTranslation(pegX(r, i), pegY(r), B.z);
        pegs.current!.setMatrixAt(n, s.m);
      });
      pegs.current.instanceMatrix.needsUpdate = true;
      for (let k = 0; k < BINS; k++) {
        s.m.makeTranslation(B.x + (k + 1 - (B.r0 + B.rows) / 2) * B.sp, BIN_Y + 0.01, B.z - 0.015);
        bins.current.setMatrixAt(k, s.m);
      }
      bins.current.instanceMatrix.needsUpdate = true;
    }

    // Robot: raise, toss, lower
    const a = t - s.armT;
    const raise = smooth(seg(a, 0, 0.3)) * (1 - smooth(seg(a, 0.45, 0.85)));
    rig.armB.x = lerp(-0.4, -2.5, raise);
    rig.armB.z = lerp(-0.05, -0.25, raise);
    rig.armA.x = -0.35 + Math.sin(t * 1.7) * 0.05;
    rig.think = t > s.nextDrop - 0.5 && t < s.nextDrop ? 1 : 0;
    handPos(rig, "B", s.hand);

    if (t >= s.nextDrop) {
      const bl = s.balls.find((x) => !x.active);
      if (bl) {
        s.count++;
        let u = Math.random();
        let bin = 0;
        while (bin < BINS - 1 && u > WEIGHT[bin]) u -= WEIGHT[bin++];
        if (s.count % 7 === 0) bin = Math.random() < 0.5 ? 0 : BINS - 1;
        const path: number[] = new Array(B.rows).fill(0).map((_, i) => (i < bin ? 1 : 0));
        for (let i = path.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [path[i], path[j]] = [path[j], path[i]];
        }
        Object.assign(bl, { active: true, t0: t + 0.3, path, bin, landed: false });
        bl.hue.set(Math.random() < 0.5 ? ctx.accent : "#F7DFA3");
        s.armT = t;
      }
      s.nextDrop = t + B.drop * (0.8 + Math.random() * 0.4);
    }

    const bm = balls.current;
    if (bm) {
      let n = 0;
      for (const bl of s.balls) {
        if (!bl.active) continue;
        const age = t - bl.t0;
        if (age < 0) {
          s.p.copy(s.hand).y += 0.05;
          bl.from.copy(s.p);
          bl.trail.forEach((v) => v.copy(s.p));
        } else {
          const prevStep = Math.floor((age - dt - 0.46) / B.hopT);
          ballAt(bl, age, s.hand, s.p);
          const step = Math.floor((age - 0.46) / B.hopT);
          if (age > 0.46 && step !== prevStep && step >= 0 && step < B.rows) {
            let k = 1;
            for (let i = 0; i < step; i++) k += bl.path[i];
            const pi = pegIndex(B.r0 + step, k);
            if (pi >= 0) s.pegFlash[pi] = 1;
          }
          const landAt = 0.46 + B.rows * B.hopT + 0.16;
          if (!bl.landed && age >= landAt) {
            bl.landed = true;
            s.binFlash[bl.bin] = 1;
            const edge = bl.bin <= 1 || bl.bin >= BINS - 2;
            const jackpot = bl.bin === 0 || bl.bin === BINS - 1;
            const col = jackpot ? "#F7DFA3" : edge ? "#7FF3EA" : ctx.accent;
            res.sparks.burst(s.p, col, jackpot ? 36 : edge ? 16 : 6, jackpot ? 1.3 : 0.7, { up: 1, life: 0.7 });
            if (jackpot) {
              res.waves.fire(s.p.clone().setZ(B.z + 0.03), "#F7DFA3", 0.6, 0.8, false, 1.5);
              rig.flash = 1;
              rig.flashColor.set("#F7DFA3");
            }
            if (edge) ctx.emit(jackpot ? 1.4 : 0.8, "#7FF3EA");
          }
          if (age > landAt + 0.5) bl.active = false;
        }
        // trail
        for (let j = TRAIL - 1; j > 0; j--) bl.trail[j].lerp(bl.trail[j - 1], Math.min(1, dt * 30));
        bl.trail[0].copy(s.p);
        const fade = bl.landed ? Math.max(0, 1 - (t - bl.t0 - (0.46 + B.rows * B.hopT + 0.16)) / 0.5) : 1;
        for (let j = 0; j < TRAIL; j++) {
          const sz = B.ball * (j === 0 ? 1 : 0.8 * (1 - j / TRAIL)) * fade;
          s.m.compose(bl.trail[j], s.q, s.sc.setScalar(sz));
          bm.setMatrixAt(n, s.m);
          s.col.copy(bl.hue).multiplyScalar(j === 0 ? 3 : 1.6 * (1 - j / TRAIL));
          bm.setColorAt(n, s.col);
          n++;
        }
      }
      bm.count = n;
      bm.instanceMatrix.needsUpdate = true;
      if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
      const live = s.balls.find((x) => x.active && t > x.t0);
      rig.look = live ? s.look.copy(live.trail[0]) : s.look.set(B.x, 0.6, B.z);
    }

    const pm = pegs.current;
    if (pm) {
      const decay = Math.exp(-dt / 0.25);
      for (let i = 0; i < pegList.length; i++) {
        s.pegFlash[i] *= decay;
        s.col.set("#E8B65A").multiplyScalar(1.6).lerp(s.hot, s.pegFlash[i]);
        pm.setColorAt(i, s.col);
      }
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
    }
    const bn = bins.current;
    if (bn) {
      for (let k = 0; k < BINS; k++) {
        s.binFlash[k] *= Math.exp(-dt / 0.6);
        const d = Math.abs(k - (BINS - 1) / 2) / ((BINS - 1) / 2);
        s.col.set(d > 0.8 ? "#F7DFA3" : d > 0.4 ? "#7FF3EA" : ctx.accent).multiplyScalar(0.55 + s.binFlash[k] * 3);
        bn.setColorAt(k, s.col);
      }
      if (bn.instanceColor) bn.instanceColor.needsUpdate = true;
    }

    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  const dividers = useMemo(() => new Array(BINS + 1).fill(0).map((_, k) => B.x + (k + 0.5 - (B.r0 + B.rows) / 2) * B.sp), []);

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <mesh geometry={res.feet} material={kit.mat.gold} />
      <mesh geometry={res.frame} material={kit.mat.goldDeep} />
      <mesh geometry={res.board} material={res.boardMat} />
      <instancedMesh ref={pegs} args={[res.peg, res.pegMat, pegList.length]} frustumCulled={false} />
      <instancedMesh ref={bins} args={[res.binGlow, res.binMat, BINS]} frustumCulled={false} />
      {dividers.map((x, k) => (
        <mesh key={k} geometry={res.divider} material={kit.mat.gold} position={[x, BIN_Y + 0.02, B.z]} />
      ))}
      <instancedMesh ref={balls} args={[res.ball, res.ballMat, MAX_BALLS * TRAIL]} frustumCulled={false} renderOrder={4} />
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
