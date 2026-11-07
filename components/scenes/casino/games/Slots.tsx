"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Beat, SLOT_SYMBOLS, Sparks, TAU, Waves, backOut, discGeometry, hash, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, makeRig } from "../Robot";

/**
 * Slots: an agent pulls the lever of a gold-arched cabinet, three reels blur and stop one by one;
 * every third spin lands triple sevens and the cabinet erupts in chasing lights and a coin fountain.
 */
const P = { period: 5.6, pull: 1.0, start: 1.2, stops: [2.4, 2.8, 3.25], winStop: 3.7, omega: 24 };
const CAB = new THREE.Vector3(-0.2, 0, 0.12);
const REEL_R = 0.12;
const REEL_X = [-0.165, 0, 0.165];
const REEL_Y = 0.37;
const BULBS = 15;
const COINS = 18;
const CELL = TAU / SLOT_SYMBOLS;

interface Reel { a0: number; target: number; tStop: number; preA: number }

export function Slots({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0.47, 0, 0.0], 0.44, -0.6);
    const body = kit.own(new RoundedBoxGeometry(0.68, 0.64, 0.3, 3, 0.035).translate(0, 0.32, -0.08));
    const bezelTop = kit.own(new RoundedBoxGeometry(0.62, 0.15, 0.12, 2, 0.02).translate(0, 0.565, 0.065));
    const bezelBot = kit.own(new RoundedBoxGeometry(0.62, 0.25, 0.14, 2, 0.02).translate(0, 0.125, 0.075));
    const bezelSide = kit.own(new THREE.BoxGeometry(0.05, 0.25, 0.12));
    const arch = kit.own(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 40, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(0, 0.64, -0.08));
    const archFace = kit.own(new THREE.CircleGeometry(0.3, 40, 0, Math.PI).translate(0, 0.64, 0.072));
    const plinth = kit.own(new RoundedBoxGeometry(0.76, 0.05, 0.38, 2, 0.015).translate(0, 0.025, -0.04));
    const trim = kit.own(new THREE.BoxGeometry(0.5, 0.012, 0.012));
    const tray = kit.own(new RoundedBoxGeometry(0.3, 0.05, 0.08, 2, 0.015).translate(0, 0.07, 0.18));
    const reel = kit.own(new THREE.CylinderGeometry(REEL_R, REEL_R, 0.145, 40, 1, true).rotateZ(Math.PI / 2));
    const reelCap = kit.own(new THREE.CylinderGeometry(REEL_R * 1.02, REEL_R * 1.02, 0.008, 40).rotateZ(Math.PI / 2));
    const glass = kit.own(new THREE.PlaneGeometry(0.5, 0.21).translate(0, REEL_Y, 0.128));
    const rod = kit.own(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 10).translate(0, 0.15, 0));
    const knob = kit.own(new THREE.SphereGeometry(0.042, 20, 14).translate(0, 0.31, 0));
    const pivot = kit.own(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 16).rotateZ(Math.PI / 2));
    const bulb = kit.own(new THREE.SphereGeometry(0.016, 10, 8));
    const coin = kit.own(discGeometry(0.045, 0.006, 2));
    const reelMat = kit.std({ map: kit.tex.slot, emissiveMap: kit.tex.slot, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.6 });
    const glassMat = kit.light("#ffffff", 0.08, 1);
    const knobMat = kit.gloss({ color: new THREE.Color("#c8283f"), roughness: 0.15, metalness: 0.1 });
    const archFaceMat = kit.basic({ color: new THREE.Color(ctx.accent).multiplyScalar(0.45) });
    const bulbMat = kit.basic({ color: 0xffffff });
    return {
      rig, body, bezelTop, bezelBot, bezelSide, arch, archFace, plinth, trim, tray, reel, reelCap, glass, rod, knob, pivot, bulb, coin,
      reelMat, glassMat, knobMat, archFaceMat, bulbMat, sparks: new Sparks(kit, 72), waves: new Waves(kit, 2),
    };
  }, [kit, ctx.accent]);

  const reelRefs = useRef<(THREE.Group | null)[]>([]);
  const lever = useRef<THREE.Group>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const coins = useRef<THREE.InstancedMesh>(null);
  const st = useRef({
    beat: new Beat(P.period, ctx.index * 0.61),
    reels: [0, 1, 2].map<Reel>(() => ({ a0: 0, target: 0, tStop: 0, preA: 0 })),
    angles: [0.5 * CELL, 0.5 * CELL + 3 * CELL, 0.5 * CELL + 5 * CELL],
    win: false,
    party: 0,
    coin: new Array(COINS).fill(0).map(() => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 })),
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    sc: new THREE.Vector3(),
    col: new THREE.Color(),
    tmp: new THREE.Vector3(),
    look: new THREE.Vector3(),
  });

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on) return;
    const { t, dt } = c;
    const s = st.current;
    const b = s.beat.step(t);
    const u = b.u;
    const rig = res.rig;

    if (b.cross(0)) {
      const r = (k: number) => hash(b.k * 53 + ctx.index * 7 + k);
      s.win = b.k % 3 === 2;
      const near = r(1) < 0.5;
      const sym = s.win ? [0, 0, 0] : near ? [0, 0, 1 + Math.floor(r(2) * 7)] : [Math.floor(r(3) * 8), Math.floor(r(4) * 8), Math.floor(r(5) * 8)];
      if (!s.win && sym[0] === sym[1] && sym[1] === sym[2]) sym[2] = (sym[2] + 3) % 8;
      s.reels.forEach((R, i) => {
        R.a0 = s.angles[i];
        R.tStop = i === 2 && s.win ? P.winStop : P.stops[i];
        // angle reached just before the settle, then the next cell centre of the chosen symbol beyond it
        const pre = R.a0 + P.omega * (R.tStop - 0.4 - P.start - 0.125);
        const want = (sym[i] + 0.5) * CELL;
        let tgt = want + Math.ceil((pre + 1.2 - want) / TAU) * TAU;
        if (tgt < pre + 0.9) tgt += TAU;
        R.preA = pre;
        R.target = tgt;
      });
    }

    // Reels
    for (let i = 0; i < 3; i++) {
      const R = s.reels[i];
      const tau = u - P.start;
      let a = R.a0;
      if (tau > 0 && u < R.tStop - 0.4) a = R.a0 + (tau < 0.25 ? (P.omega * tau * tau) / 0.5 : P.omega * (tau - 0.125));
      else if (u >= R.tStop - 0.4 && u < R.tStop) a = lerp(R.preA, R.target, backOut(seg(u, R.tStop - 0.4, R.tStop), 1.2));
      else if (u >= R.tStop) a = R.target;
      s.angles[i] = a;
      const g = reelRefs.current[i];
      if (g) g.rotation.x = a;
      if (b.cross(R.tStop)) res.sparks.burst(s.tmp.set(CAB.x + REEL_X[i], REEL_Y + 0.12, CAB.z + 0.14), "#F7DFA3", 5, 0.5, { up: 1, life: 0.35, size: 0.01 });
    }
    const spinning = u > P.start && u < s.reels[2].tStop;

    // Robot pulls the lever
    const reach = smooth(seg(u, 0.45, P.pull));
    const pull = smooth(seg(u, P.pull, P.pull + 0.3)) * (1 - smooth(seg(u, P.pull + 0.45, P.pull + 0.9)));
    rig.armB.x = lerp(-0.3, -2.25, reach) + pull * 1.2 + (u > P.pull + 0.45 ? lerp(0, 1.95, smooth(seg(u, P.pull + 0.45, P.pull + 0.9))) : 0);
    rig.armB.z = lerp(-0.1, -0.35, reach);
    rig.armA.x = s.party > 0.3 ? -2.6 + Math.sin(t * 12) * 0.25 : -0.25;
    rig.armA.z = s.party > 0.3 ? 0.4 : 0.1;
    rig.think = u < 0.5 ? 1 : spinning ? 0.4 : 0;
    rig.look = s.look.set(CAB.x, REEL_Y, CAB.z + 0.15);
    if (lever.current) lever.current.rotation.x = pull * 1.15;

    if (b.cross(s.reels[2].tStop + 0.02)) {
      const top = s.tmp.set(CAB.x, 0.8, CAB.z);
      if (s.win) {
        s.party = 1;
        rig.flash = 1;
        rig.flashColor.set("#F7DFA3");
        res.waves.fire(s.tmp.set(CAB.x, 0.4, CAB.z + 0.2), "#F7DFA3", 1.0, 1.0, false, 1.6);
        res.sparks.burst(top, "#F7DFA3", 50, 1.4, { up: 0.8, life: 1.1 });
        for (const k of s.coin) {
          k.life = 1.8 + Math.random() * 0.6;
          k.p.set(CAB.x + (Math.random() - 0.5) * 0.2, 0.1, CAB.z + 0.2);
          k.v.set((Math.random() - 0.5) * 1.3, 1.2 + Math.random() * 0.9, 0.35 + Math.random() * 0.6);
          k.r.set(Math.random() * TAU, Math.random() * TAU, 0);
          k.w.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 18);
        }
        ctx.emit(1.6, "#C9B6FF");
      } else {
        res.sparks.burst(top, ctx.accent, 10, 0.6, { up: 1, life: 0.5 });
        ctx.emit(0.4, "#C9B6FF");
      }
    }
    s.party *= Math.exp(-dt / 1.6);

    // Marquee bulbs: idle chase, fast chase while spinning, strobe on jackpot
    const bl = bulbs.current;
    if (bl) {
      for (let i = 0; i < BULBS; i++) {
        const a = (i / (BULBS - 1)) * Math.PI;
        s.m.makeTranslation(CAB.x + Math.cos(a) * 0.305, 0.64 + Math.sin(a) * 0.305, CAB.z + 0.08);
        bl.setMatrixAt(i, s.m);
        const sp = spinning ? 14 : 4;
        let k = Math.pow(0.5 + 0.5 * Math.sin(i * 1.3 - t * sp), 4);
        if (s.party > 0.05) k = (Math.floor(t * 10) + i) % 2 ? 1 : 0.2;
        s.col.set(i % 2 ? "#F7DFA3" : ctx.accent).multiplyScalar(0.5 + k * (2.5 + s.party * 2));
        bl.setColorAt(i, s.col);
      }
      bl.instanceMatrix.needsUpdate = true;
      if (bl.instanceColor) bl.instanceColor.needsUpdate = true;
    }
    res.archFaceMat.color.set(ctx.accent).multiplyScalar(0.35 + s.party * 1.2 + (spinning ? 0.15 * Math.sin(t * 20) : 0));

    // Coin fountain
    const cm = coins.current;
    if (cm) {
      for (let i = 0; i < COINS; i++) {
        const k = s.coin[i];
        if (k.life > 0) {
          k.life -= dt;
          k.v.y -= 4.2 * dt;
          k.p.addScaledVector(k.v, dt);
          if (k.p.y < 0.006) {
            k.p.y = 0.006;
            k.v.y *= -0.3;
            k.v.x *= 0.6;
            k.v.z *= 0.6;
            k.w.multiplyScalar(0.5);
          }
          k.r.x += k.w.x * dt;
          k.r.y += k.w.y * dt;
          k.r.z += k.w.z * dt;
          s.q.setFromEuler(k.r);
          s.m.compose(k.p, s.q, s.sc.setScalar(Math.min(1, k.life * 2)));
        } else s.m.makeScale(0, 0, 0);
        cm.setMatrixAt(i, s.m);
      }
      cm.instanceMatrix.needsUpdate = true;
    }

    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <group position={CAB.toArray()}>
        <mesh geometry={res.plinth} material={kit.mat.gold} />
        <mesh geometry={res.body} material={kit.mat.lacquer} />
        <mesh geometry={res.bezelTop} material={kit.mat.lacquer} />
        <mesh geometry={res.bezelBot} material={kit.mat.lacquer} />
        <mesh geometry={res.bezelSide} material={kit.mat.goldDeep} position={[-0.28, REEL_Y, 0.065]} />
        <mesh geometry={res.bezelSide} material={kit.mat.goldDeep} position={[0.28, REEL_Y, 0.065]} />
        <mesh geometry={res.trim} material={kit.mat.gold} position={[0, REEL_Y + 0.112, 0.128]} />
        <mesh geometry={res.trim} material={kit.mat.gold} position={[0, REEL_Y - 0.112, 0.146]} />
        <mesh geometry={res.arch} material={kit.mat.goldDeep} />
        <mesh geometry={res.archFace} material={res.archFaceMat} />
        <mesh geometry={res.tray} material={kit.mat.gold} />
        {REEL_X.map((x, i) => (
          <group key={i} position={[x, REEL_Y, 0]} ref={(g) => { reelRefs.current[i] = g; }}>
            <mesh geometry={res.reel} material={res.reelMat} />
            <mesh geometry={res.reelCap} material={kit.mat.goldDeep} position={[-0.074, 0, 0]} />
            <mesh geometry={res.reelCap} material={kit.mat.goldDeep} position={[0.074, 0, 0]} />
          </group>
        ))}
        <mesh geometry={res.glass} material={res.glassMat} renderOrder={3} />
        <mesh geometry={res.pivot} material={kit.mat.gold} position={[0.355, 0.36, 0]} />
        <group ref={lever} position={[0.37, 0.36, 0]}>
          <mesh geometry={res.rod} material={kit.mat.gold} />
          <mesh geometry={res.knob} material={res.knobMat} />
        </group>
      </group>
      <instancedMesh ref={bulbs} args={[res.bulb, res.bulbMat, BULBS]} frustumCulled={false} />
      <instancedMesh ref={coins} args={[res.coin, kit.mat.coin, COINS]} frustumCulled={false} />
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
