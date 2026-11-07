"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Beat, DIE_FACE_VALUES, Sparks, Waves, easeOut, hash, hop, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, handPos, makeRig } from "../Robot";

/** Dice: the agent shakes two ruby dice, hurls them, they tumble, bounce and settle on a result. */
const P = { period: 5.0, release: 1.27, flight: 1.45, back: 4.0, backDur: 0.7, size: 0.13 };
const FLOOR = P.size / 2;

/** Map each face (+x,-x,+y,-y,+z,-z) normal onto +Y. */
const FACE_UP: THREE.Euler[] = [
  new THREE.Euler(0, 0, Math.PI / 2),
  new THREE.Euler(0, 0, -Math.PI / 2),
  new THREE.Euler(0, 0, 0),
  new THREE.Euler(Math.PI, 0, 0),
  new THREE.Euler(-Math.PI / 2, 0, 0),
  new THREE.Euler(Math.PI / 2, 0, 0),
];

function dieGeometry(size: number) {
  const g = new RoundedBoxGeometry(size, size, size, 3, size * 0.16);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const n = [nor.getX(i), nor.getY(i), nor.getZ(i)];
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const ax = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
    const f = ax * 2 + (n[ax] < 0 ? 1 : 0);
    const a = ax === 0 ? p[2] : p[0];
    const b = ax === 1 ? p[2] : p[1];
    uv.setXY(i, (f + THREE.MathUtils.clamp(a / size + 0.5, 0.02, 0.98)) / 6, THREE.MathUtils.clamp(b / size + 0.5, 0.02, 0.98));
  }
  uv.needsUpdate = true;
  return g;
}

export function Dice({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0, 0, -0.45], 0.44);
    const geo = kit.own(dieGeometry(P.size));
    const mat = kit.gloss({ map: kit.tex.dice, emissiveMap: kit.tex.diceMask, emissive: new THREE.Color("#ffe6b0"), emissiveIntensity: 0, roughness: 0.18, metalness: 0.05, envMapIntensity: 1 });
    return { rig, geo, mat, sparks: new Sparks(kit, 72), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);
  const dice = useRef<(THREE.Mesh | null)[]>([]);
  const st = useRef({
    beat: new Beat(P.period, ctx.index * 0.53),
    hand: new THREE.Vector3(),
    start: [new THREE.Vector3(), new THREE.Vector3()],
    land: [new THREE.Vector3(), new THREE.Vector3()],
    qT: [new THREE.Quaternion(), new THREE.Quaternion()],
    axis: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
    spin: [0, 0],
    glow: 0,
    win: false,
    q: new THREE.Quaternion(),
    qy: new THREE.Quaternion(),
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

    // New round: pick result (often doubles) and landing spots
    if (b.cross(0)) {
      const r = (k: number) => hash(b.k * 97 + ctx.index * 13 + k);
      const dbl = r(1) < 0.4;
      const v1 = 1 + Math.floor(r(2) * 6);
      const v2 = dbl ? v1 : 1 + Math.floor(r(3) * 6);
      [v1, v2].forEach((v, d) => {
        const f = DIE_FACE_VALUES.indexOf(v);
        s.qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r(4 + d) - 0.5) * 1.6);
        s.qT[d].setFromEuler(FACE_UP[f]).premultiply(s.qy);
        s.land[d].set((d ? 0.2 : -0.18) + (r(6 + d) - 0.5) * 0.12, FLOOR, 0.32 + (r(8 + d) - 0.5) * 0.16);
        s.axis[d].set(r(10 + d) - 0.5, r(12 + d) - 0.3, r(14 + d) - 0.5).normalize();
        s.spin[d] = 11 + r(16 + d) * 5;
      });
      s.win = dbl || v1 + v2 >= 10;
    }
    const win = s.win;

    // Arm: shake, wind up, hurl, rest, reach back
    let ax = -1.0 + Math.sin(u * 24) * 0.16 * (u < 0.9 ? 1 : 0);
    if (u >= 0.9 && u < 1.15) ax = lerp(-1.0, 0.35, smooth(seg(u, 0.9, 1.15)));
    else if (u >= 1.15 && u < 1.6) ax = lerp(0.35, -1.65, easeOut(seg(u, 1.15, 1.3)));
    else if (u >= 1.6 && u < P.back - 0.35) ax = lerp(-1.65, -0.35, smooth(seg(u, 1.6, 2.2)));
    else if (u >= P.back - 0.35) ax = lerp(-0.35, -1.0, smooth(seg(u, P.back - 0.35, P.back)));
    rig.armA.x = ax;
    rig.armA.z = -0.15;
    rig.armB.x = -0.2;
    rig.think = u < 0.9 ? 1 : 0;
    handPos(rig, "A", s.hand);

    const landT = P.release + P.flight;
    for (let d = 0; d < 2; d++) {
      const m = dice.current[d];
      if (!m) continue;
      if (u < P.release) {
        m.position.copy(s.hand).add(s.tmp.set(d ? 0.06 : -0.06, 0.07 + Math.sin(u * 30 + d) * 0.01, 0.03));
        m.quaternion.setFromAxisAngle(s.axis[d], u * 9 + d);
        s.start[d].copy(m.position);
      } else if (u < landT) {
        const f = (u - P.release) / P.flight;
        // flight + two decaying bounces + slide
        let y: number;
        const y0 = s.start[d].y;
        if (f < 0.42) y = lerp(y0, FLOOR, f / 0.42) + 0.5 * hop(f / 0.42);
        else if (f < 0.66) y = FLOOR + 0.11 * hop((f - 0.42) / 0.24);
        else if (f < 0.82) y = FLOOR + 0.035 * hop((f - 0.66) / 0.16);
        else y = FLOOR;
        m.position.lerpVectors(s.start[d], s.land[d], 1 - Math.pow(1 - f, 2.2));
        m.position.y = y;
        const rem = Math.pow(1 - easeOut(f, 2.6), 1);
        s.q.setFromAxisAngle(s.axis[d], s.spin[d] * rem);
        m.quaternion.copy(s.qT[d]).premultiply(s.q);
        if (b.cross(P.release + P.flight * 0.42) && d === 0) {
          for (let k = 0; k < 2; k++) {
            const lp = s.tmp.set(s.land[k].x * 0.8, 0.01, s.land[k].z * 0.9);
            res.sparks.burst(lp, "#FFD9A0", 6, 0.6, { up: 1, life: 0.5, size: 0.012 });
          }
        }
      } else if (u < P.back) {
        m.position.copy(s.land[d]);
        m.quaternion.copy(s.qT[d]);
      } else {
        const f = seg(u, P.back, P.back + P.backDur);
        s.tmp.copy(s.hand).add(s.look.set(d ? 0.06 : -0.06, 0.07, 0.03));
        m.position.lerpVectors(s.land[d], s.tmp, easeOut(f, 2));
        m.position.y = lerp(s.land[d].y, s.tmp.y, f) + 0.3 * hop(f);
        s.q.setFromAxisAngle(s.axis[d], f * 6);
        m.quaternion.copy(s.qT[d]).premultiply(s.q);
      }
    }
    const d0 = dice.current[0];
    const d1 = dice.current[1];
    if (d0 && d1 && u >= P.release - 0.1) rig.look = s.look.lerpVectors(d0.position, d1.position, 0.5);
    else rig.look = null;

    if (b.cross(landT)) {
      const mid = s.tmp.lerpVectors(s.land[0], s.land[1], 0.5);
      mid.y = 0.02;
      if (win) {
        s.glow = 1;
        res.sparks.burst(mid, "#F7DFA3", 40, 1.5, { up: 0.9, life: 0.9 });
        res.waves.fire(mid, "#F7DFA3", 0.85, 0.9);
        rig.flash = 1;
        rig.flashColor.set("#F7DFA3");
        ctx.emit(1.3, "#FF9AA6");
      } else {
        res.waves.fire(mid, "#E5484D", 0.5, 0.6, true, 1.2);
        ctx.emit(0.5, "#FF9AA6");
      }
    }
    s.glow *= Math.exp(-dt / 1.1);
    res.mat.emissiveIntensity = 0.15 + s.glow * 3.2;
    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      {[0, 1].map((d) => (
        <mesh key={d} ref={(m) => { dice.current[d] = m; }} geometry={res.geo} material={res.mat} />
      ))}
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
