"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CARD_BACK, CARD_CELLS, Sparks, Waves, discGeometry, easeOut, hop, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, makeRig } from "../Robot";

/**
 * Blackjack: a dealer agent slides cards from the shoe across green baize, flips them, reveals its
 * hole card and pays (or collects) the bet; then sweeps the table for the next hand.
 */
const TABLE_Z = -0.12;
const CARD_W = 0.12;
const CARD_H = 0.17;
const SHOE = new THREE.Vector3(-0.42, 0.11, -0.02);
const DEAL = 0.45;
const CARD_Y = 0.045;
const PLAYER_Z = 0.44;
const DEALER_Z = 0.1;
const BET = new THREE.Vector3(0.3, CARD_Y + 0.008, 0.46);
const BANK = new THREE.Vector3(0.36, CARD_Y + 0.008, -0.02);
const CHIP_H = 0.0165;

/** Atlas cells: 0 A♠ 1 K♥ 2 Q♠ 3 J♦ 4 10♣ 5 9♥ 6 8♠ 7 7♦ 8 A♥ 9 5♣ */
const HANDS = [
  { p: [0, 1], d: [5, 7], win: 2 },
  { p: [4, 6], d: [2, 7], win: 1 },
  { p: [5, 9, 7], d: [1, 6], win: 1 },
  { p: [3, 7], d: [8, 2], win: 0 },
];

interface Card { cell: number; to: THREE.Vector3; yaw: number; t0: number; up: boolean; reveal: number; order: number }

export function Blackjack({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0, 0, -0.44], 0.44);
    const base = kit.own(new THREE.CylinderGeometry(0.82, 0.85, 0.04, 64, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.02, TABLE_Z));
    const felt = kit.own(new THREE.CircleGeometry(0.78, 64, Math.PI, Math.PI).rotateX(-Math.PI / 2).translate(0, 0.0415, TABLE_Z));
    const rim = kit.own(new THREE.TorusGeometry(0.8, 0.02, 10, 64, Math.PI).rotateX(Math.PI / 2).translate(0, 0.043, TABLE_Z));
    const edge = kit.own(new THREE.BoxGeometry(1.64, 0.035, 0.035).translate(0, 0.043, TABLE_Z));
    const shoe = kit.own(new RoundedBoxGeometry(0.17, 0.1, 0.22, 2, 0.02));
    const shoeTrim = kit.own(new THREE.BoxGeometry(0.15, 0.012, 0.012));
    const back = kit.own(new THREE.PlaneGeometry(CARD_W, CARD_H).rotateX(Math.PI / 2));
    const backUv = back.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < backUv.count; i++) backUv.setX(i, (CARD_BACK + backUv.getX(i)) / CARD_CELLS);
    const fronts = new Array(6).fill(0).map(() => kit.own(new THREE.PlaneGeometry(CARD_W, CARD_H).rotateX(-Math.PI / 2)));
    const chip = kit.own(discGeometry(0.045, 0.008, 1));
    const feltMat = kit.std({ map: kit.tex.felt, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 });
    const cardMat = kit.std({ map: kit.tex.cards, roughness: 0.45, metalness: 0, envMapIntensity: 0.6 });
    return { rig, base, felt, rim, edge, shoe, shoeTrim, back, fronts, chip, feltMat, cardMat, sparks: new Sparks(kit, 72), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);

  const cardRefs = useRef<(THREE.Group | null)[]>([]);
  const flipRefs = useRef<(THREE.Group | null)[]>([]);
  const chipRefs = useRef<(THREE.Mesh | null)[]>([]);
  const st = useRef({
    round: -1,
    t0: 0.6 * ctx.index,
    cards: [] as Card[],
    reveal: 0,
    outcome: 0,
    sweep: 0,
    end: 0,
    win: 0,
    fired: false,
    p: new THREE.Vector3(),
    look: new THREE.Vector3(),
  });

  const setFace = (k: number, cell: number) => {
    const uv = res.fronts[k].attributes.uv as THREE.BufferAttribute;
    const base = [0, 1, 0, 1];
    for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + base[i % 4]) / CARD_CELLS);
    uv.needsUpdate = true;
  };

  const startRound = (t: number) => {
    const s = st.current;
    s.round++;
    s.t0 = t;
    const h = HANDS[(s.round + ctx.index) % HANDS.length];
    const cards: Card[] = [];
    const spot = (z: number, i: number, n: number) => new THREE.Vector3(-0.02 + (i - (n - 1) / 2) * 0.078, CARD_Y + i * 0.0015, z + i * 0.012);
    let tt = 0.5;
    const order: { who: "p" | "d"; i: number }[] = [{ who: "p", i: 0 }, { who: "d", i: 0 }, { who: "p", i: 1 }, { who: "d", i: 1 }];
    for (let i = 2; i < h.p.length; i++) order.push({ who: "p", i });
    for (const o of order) {
      const list = o.who === "p" ? h.p : h.d;
      const n = list.length;
      cards.push({
        cell: list[o.i],
        to: spot(o.who === "p" ? PLAYER_Z : DEALER_Z, o.i, n),
        yaw: (o.i - (n - 1) / 2) * -0.08,
        t0: tt,
        up: !(o.who === "d" && o.i === 1),
        reveal: 0,
        order: cards.length,
      });
      tt += o.i >= 2 ? 0.75 : 0.5;
    }
    s.reveal = tt + 0.35;
    cards.forEach((c) => {
      if (!c.up) c.reveal = s.reveal;
    });
    s.outcome = s.reveal + 0.6;
    s.sweep = s.outcome + 1.9;
    s.end = s.sweep + 0.75;
    s.win = h.win;
    s.fired = false;
    s.cards = cards;
    cards.forEach((c, k) => setFace(k, c.cell));
  };

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on) return;
    const { t, dt } = c;
    const s = st.current;
    if (s.round < 0 || t - s.t0 > s.end) startRound(t);
    const u = t - s.t0;
    const rig = res.rig;
    let latest: THREE.Vector3 | null = null;

    for (let k = 0; k < 6; k++) {
      const g = cardRefs.current[k];
      const fl = flipRefs.current[k];
      if (!g || !fl) continue;
      const cd = s.cards[k];
      if (!cd || u < cd.t0) {
        g.visible = false;
        continue;
      }
      g.visible = true;
      const f = seg(u, cd.t0, cd.t0 + DEAL);
      g.position.lerpVectors(SHOE, cd.to, easeOut(f, 2.4));
      g.position.y = lerp(SHOE.y, cd.to.y, easeOut(f, 2)) + 0.06 * hop(f);
      g.rotation.y = lerp(0.9, cd.yaw, easeOut(f, 2));
      let flip = Math.PI;
      if (cd.up) flip = Math.PI * (1 - smooth(seg(f, 0.25, 0.95)));
      else if (cd.reveal) {
        const r = seg(u, cd.reveal, cd.reveal + 0.4);
        flip = Math.PI * (1 - smooth(r));
        fl.position.y = 0.05 * hop(r);
      }
      fl.rotation.z = flip;
      if (u > s.sweep) {
        const w = seg(u, s.sweep + cd.order * 0.03, s.sweep + 0.5 + cd.order * 0.03);
        g.position.lerp(st.current.p.set(0, CARD_Y + 0.02, -0.25), easeOut(w, 2));
        g.scale.setScalar(Math.max(0.001, 1 - smooth(seg(w, 0.5, 1))));
      } else g.scale.setScalar(1);
      if (f < 1 || (cd.reveal && u < cd.reveal + 0.5 && u > cd.reveal)) latest = g.position;
    }

    // Chips: 3-chip bet on the felt; win adds 3 from the bank, loss slides the bet to the dealer
    for (let j = 0; j < 6; j++) {
      const m = chipRefs.current[j];
      if (!m) continue;
      const appear = smooth(seg(u, 0.1 + j * 0.06, 0.35 + j * 0.06));
      const out = 1 - smooth(seg(u, s.sweep + 0.2, s.sweep + 0.6));
      if (j < 3) {
        m.position.copy(BET).setY(BET.y + j * CHIP_H);
        if (!s.win && u > s.outcome) {
          const w = seg(u, s.outcome + 0.1 + j * 0.05, s.outcome + 0.6 + j * 0.05);
          m.position.lerp(st.current.p.set(BANK.x, BANK.y + j * CHIP_H, BANK.z), easeOut(w, 2));
          m.position.y += 0.06 * hop(w);
        }
        m.scale.setScalar(Math.max(0.001, appear * out));
      } else {
        const w = s.win ? seg(u, s.outcome + (j - 3) * 0.12, s.outcome + 0.5 + (j - 3) * 0.12) : 0;
        m.visible = w > 0;
        m.position.lerpVectors(BANK, BET, easeOut(w, 2));
        m.position.y = lerp(BANK.y, BET.y + j * CHIP_H, w) + 0.12 * hop(w);
        m.rotation.x = (1 - w) * 2.5;
        m.scale.setScalar(Math.max(0.001, out));
      }
    }

    if (!s.fired && u >= s.outcome) {
      s.fired = true;
      if (s.win) {
        const big = s.win === 2;
        st.current.p.set(0.05, 0.08, PLAYER_Z);
        res.sparks.burst(st.current.p, "#F7DFA3", big ? 52 : 30, big ? 1.5 : 1.1, { up: 0.9, life: 0.9 });
        res.waves.fire(st.current.p.setY(0.05), "#F7DFA3", big ? 1.1 : 0.8, 0.9);
        rig.flash = 1;
        rig.flashColor.set("#F7DFA3");
        ctx.emit(big ? 1.6 : 1.1, "#F7DFA3");
      } else {
        res.waves.fire(st.current.p.set(0, 0.05, DEALER_Z), ctx.accent, 0.6, 0.7, true, 1.4);
        ctx.emit(0.5, "#F7DFA3");
      }
    }

    // Dealer arm flicks on each card, other hand turns the hole card
    let flick = 0;
    for (const cd of s.cards) flick = Math.max(flick, hop(seg(u, cd.t0 - 0.15, cd.t0 + 0.25)));
    rig.armB.x = -0.55 - flick * 0.9;
    rig.armB.z = -0.15 - flick * 0.25;
    const rv = hop(seg(u, s.reveal - 0.2, s.reveal + 0.4));
    const sw = hop(seg(u, s.sweep - 0.1, s.sweep + 0.6));
    rig.armA.x = -0.45 - rv * 0.9 - sw * 1.0;
    rig.armA.z = 0.1 - sw * 0.3;
    rig.think = u < 0.45 || (u > s.reveal - 0.5 && u < s.reveal) ? 1 : 0;
    rig.look = latest ? st.current.look.copy(latest) : st.current.look.set(0, 0.05, (PLAYER_Z + DEALER_Z) / 2);

    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <mesh geometry={res.base} material={kit.mat.lacquer} />
      <mesh geometry={res.felt} material={res.feltMat} />
      <mesh geometry={res.rim} material={kit.mat.gold} />
      <mesh geometry={res.edge} material={kit.mat.gold} />
      <group position={[SHOE.x, 0.09, SHOE.z - 0.04]} rotation={[0, 0.5, 0]}>
        <mesh geometry={res.shoe} material={kit.mat.lacquer} />
        <mesh geometry={res.shoeTrim} material={kit.mat.gold} position={[0, 0.05, 0.11]} />
      </group>
      {res.fronts.map((fg, k) => (
        <group key={k} ref={(g) => { cardRefs.current[k] = g; }} visible={false}>
          <group ref={(g) => { flipRefs.current[k] = g; }}>
            <mesh geometry={fg} material={res.cardMat} position={[0, 0.0006, 0]} />
            <mesh geometry={res.back} material={res.cardMat} position={[0, -0.0006, 0]} />
          </group>
        </group>
      ))}
      {new Array(6).fill(0).map((_, j) => (
        <mesh key={j} ref={(m) => { chipRefs.current[j] = m; }} geometry={res.chip} material={kit.mat.chip} />
      ))}
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
