"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Beat, Sparks, Waves, discGeometry, easeOut, hash, hop, lerp, seg, smooth, TAU, type PodCtx } from "../kit";
import { Robot, driveRig, handPos, makeRig } from "../Robot";

/** Coin flip: the agent reasons, flicks a heavy gold coin high, it spins, lands, wobbles and settles. */
const P = { period: 4.6, launch: 1.0, flight: 1.3, back: 3.6, backDur: 0.8, R: 0.125, H: 0.012 };
const LAND = new THREE.Vector3(0.02, P.H, 0.38);

export function CoinFlip({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0, 0, -0.42], 0.44);
    const geo = kit.own(discGeometry(P.R, P.H, 2));
    return { rig, geo, sparks: new Sparks(kit, 64), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);
  const coin = useRef<THREE.Group>(null);
  const st = useRef({ beat: new Beat(P.period, ctx.index * 0.7), start: new THREE.Vector3(), hand: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler() });

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on || !coin.current) return;
    const { t, dt } = c;
    const s = st.current;
    const b = s.beat.step(t);
    const u = b.u;
    const heads = hash(b.k * 31 + ctx.index) < 0.6;
    const rig = res.rig;
    const g = coin.current;

    // Arm: palm forward, dip, flick up, rest, reach to catch
    let ax = -0.95 + Math.sin(t * 3) * 0.03;
    if (u >= 0.8 && u < P.launch) ax = lerp(-0.95, -0.7, smooth(seg(u, 0.8, P.launch)));
    else if (u >= P.launch && u < 1.6) ax = lerp(-0.7, -2.0, easeOut(seg(u, P.launch, P.launch + 0.12)));
    else if (u >= 1.6 && u < P.back - 0.4) ax = lerp(-2.0, -0.35, smooth(seg(u, 1.6, 2.1)));
    else if (u >= P.back - 0.4) ax = lerp(-0.35, -0.95, smooth(seg(u, P.back - 0.4, P.back)));
    rig.armA.x = ax;
    rig.armA.z = 0.05;
    rig.armB.x = -0.25 + Math.sin(t * 1.4) * 0.05;
    rig.think = u < P.launch ? 1 : 0;

    handPos(rig, "A", s.hand);
    s.hand.y += 0.075;
    const landT = P.launch + P.flight;
    const base = heads ? 0 : Math.PI;
    if (u < P.launch) {
      g.position.copy(s.hand);
      g.quaternion.identity();
      s.start.copy(s.hand);
    } else if (u < landT) {
      if (b.cross(P.launch)) s.start.copy(s.hand);
      const f = (u - P.launch) / P.flight;
      g.position.lerpVectors(s.start, LAND, f);
      g.position.y = lerp(s.start.y, LAND.y, f) + 1.05 * hop(f);
      const spin = base + 7 * TAU * f;
      s.e.set(spin, f * 2.4, 0.25 * Math.sin(f * 9) * (1 - f));
      g.quaternion.setFromEuler(s.e);
    } else if (u < P.back) {
      const w = u - landT;
      const tilt = 0.32 * Math.exp(-w * 3.2);
      const prec = w * 22 * Math.exp(-w * 0.8);
      g.position.copy(LAND);
      g.position.y += 0.06 * Math.abs(Math.sin(w * 14)) * Math.exp(-w * 7);
      s.e.set(base + tilt * Math.cos(prec), 2.4, tilt * Math.sin(prec));
      g.quaternion.setFromEuler(s.e);
    } else {
      const f = seg(u, P.back, P.back + P.backDur);
      g.position.lerpVectors(LAND, s.hand, easeOut(f, 2));
      g.position.y = lerp(LAND.y, s.hand.y, f) + 0.32 * hop(f);
      s.e.set(base + (heads ? TAU : Math.PI) * smooth(f), 2.4 * (1 - smooth(f)), 0);
      g.quaternion.setFromEuler(s.e);
    }
    rig.look = u >= P.launch - 0.1 ? g.position : null;

    if (b.cross(landT)) {
      const col = heads ? "#F7DFA3" : "#7FF3EA";
      res.sparks.burst(LAND, col, heads ? 34 : 20, 1.3, { up: 0.9, life: 0.8 });
      res.waves.fire(LAND, col, 0.75, 0.8);
      rig.flash = 1;
      rig.flashColor.set(col);
      ctx.emit(heads ? 1.2 : 0.6, heads ? "#F7DFA3" : "#7FF3EA");
    }
    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <group ref={coin}>
        <mesh geometry={res.geo} material={kit.mat.coin} />
      </group>
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
