"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Sparks, Waves, easeOut, hop, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, makeRig, visorPos } from "../Robot";

/**
 * Mines: the agent sweeps a scanning beam across a 5x5 grid, locks a tile and flips it to reveal a
 * floating emerald; after a streak it either cashes out (gems burst into light) or hits a mine.
 */
const G = { n: 5, size: 0.13, pitch: 0.158, cz: 0.2, h: 0.028 };
const TILES = G.n * G.n;
const PALE = "#2EE6B0";
const GEMS = 7;
const tileXZ = (i: number) => [((i % G.n) - (G.n - 1) / 2) * G.pitch, G.cz + (Math.floor(i / G.n) - (G.n - 1) / 2) * G.pitch] as const;

type Phase = "think" | "scan" | "flip" | "cash" | "boom" | "reset";

export function Mines({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0, 0, -0.52], 0.44);
    const tile = kit.own(new THREE.BoxGeometry(G.size, G.h, G.size));
    const side = kit.mat.goldDeep;
    const top = kit.std({ map: kit.tex.tile, metalness: 0.4, roughness: 0.3, envMapIntensity: 0.8 });
    const under = kit.std({ color: new THREE.Color("#0b2a22"), emissive: new THREE.Color(PALE), emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.3 });
    const gem = kit.own(new THREE.OctahedronGeometry(1, 0).scale(1, 1.35, 1));
    const gemMat = kit.gloss({ color: new THREE.Color("#2FD08A"), emissive: new THREE.Color("#2FD08A"), emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.08, flatShading: true });
    const spikes: THREE.BufferGeometry[] = [new THREE.SphereGeometry(0.05, 18, 12)];
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]]) {
      const v = new THREE.Vector3(...d).normalize();
      const cone = new THREE.ConeGeometry(0.014, 0.05, 8).translate(0, 0.065, 0);
      cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v));
      spikes.push(cone);
    }
    const mine = kit.own(mergeGeometries(spikes)!);
    spikes.forEach((g) => g.dispose());
    const mineMat = kit.std({ color: new THREE.Color("#1a1b1f"), emissive: new THREE.Color("#ff2a2a"), emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.3 });
    const beam = kit.own(new THREE.CylinderGeometry(0.006, 0.012, 1, 10, 1, true).translate(0, 0.5, 0));
    const beamMat = kit.light(ctx.accent, 2.4, 0.8);
    const reticle = kit.own(new THREE.RingGeometry(0.075, 0.085, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2));
    const reticleMat = kit.light(ctx.accent, 2.6, 1);
    const glowMat = kit.light(ctx.accent, 1.4, 0.9, kit.tex.glow);
    return { rig, tile, mats: [side, side, top, under, side, side], gem, gemMat, mine, mineMat, beam, beamMat, reticle, reticleMat, glowMat, sparks: new Sparks(kit, 80), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);

  const tiles = useRef<THREE.InstancedMesh>(null);
  const gems = useRef<THREE.InstancedMesh>(null);
  const mineRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const retRef = useRef<THREE.Mesh>(null);
  const gemGlow = useRef<THREE.Mesh>(null);
  const st = useRef({
    phase: "think" as Phase,
    t0: 0.4 * ctx.index,
    flipT: new Float32Array(TILES).fill(-1),
    unflipT: new Float32Array(TILES).fill(-1),
    revealed: [] as number[],
    gemT: [] as number[],
    target: 0,
    decoys: [0, 0],
    picks: 0,
    goal: 4,
    bust: false,
    mineTile: -1,
    mineT: -9,
    cashT: -9,
    beamFrom: new THREE.Vector3(),
    beamTo: new THREE.Vector3(),
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    e: new THREE.Euler(),
    sc: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    col: new THREE.Color(),
    white: new THREE.Color(1, 1, 1),
    red: new THREE.Color("#ff6a6a"),
  });

  const pickFree = (s: typeof st.current) => {
    for (let k = 0; k < 40; k++) {
      const i = Math.floor(Math.random() * TILES);
      if (!s.revealed.includes(i)) return i;
    }
    return 0;
  };

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on) return;
    const { t, dt } = c;
    const s = st.current;
    const rig = res.rig;
    const el = t - s.t0;

    // State machine
    switch (s.phase) {
      case "think":
        if (el > 0.5) {
          s.phase = "scan";
          s.t0 = t;
          s.target = pickFree(s);
          s.decoys = [pickFree(s), pickFree(s)];
        }
        break;
      case "scan":
        if (el > 0.9) {
          s.phase = "flip";
          s.t0 = t;
          s.flipT[s.target] = t;
          const isMine = s.bust && s.picks >= s.goal;
          if (isMine) {
            s.mineTile = s.target;
            s.mineT = t + 0.3;
          } else {
            s.revealed.push(s.target);
            s.gemT.push(t + 0.25);
          }
        }
        break;
      case "flip":
        if (el > 0.75) {
          s.picks++;
          s.t0 = t;
          if (s.mineTile >= 0) s.phase = "boom";
          else if (!s.bust && s.picks >= s.goal) {
            s.phase = "cash";
            s.cashT = t;
            for (const i of s.revealed) {
              const [x, z] = tileXZ(i);
              res.sparks.burst(s.a.set(x, 0.14, z), "#7FF7C0", 8, 1.0, { up: 1, life: 0.8 });
            }
            res.waves.fire(s.a.set(0, 0.03, G.cz), "#7FF7C0", 1.2, 1.0);
            rig.flash = 1;
            rig.flashColor.set("#7FF7C0");
            ctx.emit(0.8 + s.revealed.length * 0.18, "#7FF7C0");
          } else s.phase = "think";
        }
        break;
      case "cash":
      case "boom":
        if (el > 1.5) {
          s.phase = "reset";
          s.t0 = t;
          for (let i = 0; i < TILES; i++) if (s.flipT[i] >= 0) s.unflipT[i] = t + 0.05 * (Math.abs((i % G.n) - 2) + Math.abs(Math.floor(i / G.n) - 2));
        }
        break;
      case "reset":
        if (el > 0.9) {
          s.flipT.fill(-1);
          s.unflipT.fill(-1);
          s.revealed = [];
          s.gemT = [];
          s.picks = 0;
          s.goal = 3 + Math.floor(Math.random() * 3);
          s.bust = Math.random() < 0.38;
          s.mineTile = -1;
          s.phase = "think";
          s.t0 = t;
        }
        break;
    }

    // Events
    if (s.mineT > 0 && t >= s.mineT && t - dt < s.mineT) {
      const [x, z] = tileXZ(s.mineTile);
      s.a.set(x, 0.1, z);
      res.sparks.burst(s.a, "#FF4A3D", 50, 1.7, { up: 0.8, life: 0.9, size: 0.02 });
      res.sparks.burst(s.a, "#FFC48A", 18, 1.0, { up: 0.8, life: 0.6 });
      res.waves.fire(s.a.setY(0.03), "#FF3B30", 1.1, 0.9);
      rig.recoil = 1;
      rig.flash = 1;
      rig.flashColor.set("#FF4A3D");
    }
    // Tiles
    const tm = tiles.current;
    if (tm) {
      for (let i = 0; i < TILES; i++) {
        const [x, z] = tileXZ(i);
        let f = s.flipT[i] >= 0 ? smooth(seg(t, s.flipT[i], s.flipT[i] + 0.35)) : 0;
        if (s.unflipT[i] >= 0) f *= 1 - smooth(seg(t, s.unflipT[i], s.unflipT[i] + 0.35));
        const lift = 0.07 * hop(f);
        const hover = s.phase === "scan" && i === s.target ? 0.012 * smooth(seg(el, 0.6, 0.9)) : 0;
        s.e.set(Math.PI * f, 0, 0);
        s.q.setFromEuler(s.e);
        s.m.compose(s.a.set(x, G.h / 2 + 0.004 + lift + hover, z), s.q, s.sc.set(1, 1, 1));
        tm.setMatrixAt(i, s.m);
        tm.setColorAt(i, i === s.mineTile && f > 0.5 ? s.red : s.white);
      }
      tm.instanceMatrix.needsUpdate = true;
      if (tm.instanceColor) tm.instanceColor.needsUpdate = true;
    }

    // Gems float, spin; burst upward on cash-out, shatter on bust
    const gm = gems.current;
    let gemCount = 0;
    if (gm) {
      for (let k = 0; k < s.revealed.length && k < GEMS; k++) {
        const i = s.revealed[k];
        const [x, z] = tileXZ(i);
        const g = seg(t, s.gemT[k], s.gemT[k] + 0.35);
        let y = lerp(0.02, 0.13, easeOut(g, 3)) + Math.sin(t * 2.4 + k) * 0.01;
        let sc = 0.045 * easeOut(g, 2);
        if (s.phase === "cash" || (s.phase === "reset" && s.mineTile < 0)) {
          const cf = seg(t, s.cashT, s.cashT + 1.2);
          y += easeOut(cf, 2) * 0.5;
          sc *= 1 + Math.sin(cf * Math.PI) * 0.6;
          sc *= 1 - smooth(seg(cf, 0.7, 1));
        } else if (s.mineTile >= 0 && t > s.mineT) {
          sc *= 1 - smooth(seg(t, s.mineT + 0.1, s.mineT + 0.5));
        }
        s.e.set(0, t * 2 + k, 0);
        s.q.setFromEuler(s.e);
        s.m.compose(s.a.set(x, y, z), s.q, s.sc.setScalar(sc));
        gm.setMatrixAt(k, s.m);
        gemCount++;
      }
      gm.count = gemCount;
      gm.instanceMatrix.needsUpdate = true;
    }
    res.gemMat.emissiveIntensity = 0.5 + (s.phase === "cash" ? 2 * Math.sin(seg(t, s.cashT, s.cashT + 1.2) * Math.PI) : 0);
    if (gemGlow.current) {
      gemGlow.current.visible = s.phase === "cash";
      gemGlow.current.scale.setScalar(1.6 * Math.sin(seg(t, s.cashT, s.cashT + 1.2) * Math.PI) + 0.01);
    }

    // Mine
    const mn = mineRef.current;
    if (mn) {
      const on = s.mineTile >= 0 && t > s.mineT - 0.15;
      mn.visible = on;
      if (on) {
        const [x, z] = tileXZ(s.mineTile);
        const g = seg(t, s.mineT - 0.15, s.mineT + 0.2);
        const out = s.phase === "reset" ? 1 - seg(t, s.t0, s.t0 + 0.4) : 1;
        mn.position.set(x, 0.03 + 0.09 * easeOut(g, 3), z);
        mn.rotation.set(t * 1.3, t * 2.1, 0);
        mn.scale.setScalar(Math.max(0.001, easeOut(g, 2) * out * (1 + 0.15 * Math.sin(t * 22))));
        res.mineMat.emissiveIntensity = 0.8 + 0.8 * Math.sin(t * 22);
      }
    }

    // Scanning beam from the visor
    let aim: number | null = null;
    let beamK = 0;
    if (s.phase === "scan") {
      const seq = [s.decoys[0], s.decoys[1], s.target];
      const f = Math.min(0.999, el / 0.6) * 2;
      const k = Math.floor(f);
      const [x0, z0] = tileXZ(seq[k]);
      const [x1, z1] = tileXZ(seq[Math.min(2, k + 1)]);
      const ff = smooth(f - k);
      s.beamTo.set(lerp(x0, x1, ff), G.h + 0.006, lerp(z0, z1, ff));
      aim = s.target;
      beamK = el > 0.6 ? 1.6 : 0.8;
    } else if (s.phase === "flip" && el < 0.3) {
      const [x, z] = tileXZ(s.target);
      s.beamTo.set(x, G.h + 0.006, z);
      beamK = 1.6 * (1 - el / 0.3);
      aim = s.target;
    }
    rig.look = aim !== null ? s.beamTo : s.phase === "cash" ? s.b.set(0, 0.6, G.cz) : null;
    rig.think = s.phase === "think" ? 1 : s.phase === "scan" ? 0.5 : 0;
    rig.armA.x = s.phase === "cash" ? -2.7 : -0.45;
    rig.armA.z = s.phase === "cash" ? 0.35 : 0.1;
    rig.armB.x = s.phase === "cash" ? -2.7 : s.phase === "scan" ? -1.1 : -0.45;
    rig.armB.z = s.phase === "cash" ? -0.35 : -0.1;
    driveRig(rig, t, dt);

    const bm = beamRef.current;
    if (bm) {
      bm.visible = beamK > 0.01;
      if (bm.visible) {
        visorPos(rig, s.beamFrom);
        s.b.subVectors(s.beamTo, s.beamFrom);
        const len = s.b.length();
        bm.position.copy(s.beamFrom);
        bm.quaternion.setFromUnitVectors(s.up, s.b.multiplyScalar(1 / len));
        bm.scale.set(1 + beamK * 0.4, len, 1 + beamK * 0.4);
        res.beamMat.color.set(ctx.accent).multiplyScalar(1.2 * beamK + 0.4 * Math.sin(t * 40));
      }
    }
    const rt = retRef.current;
    if (rt) {
      rt.visible = beamK > 0.01;
      rt.position.copy(s.beamTo).setY(G.h + 0.012);
      rt.rotation.y = t * 3;
      rt.scale.setScalar(1 + 0.15 * Math.sin(t * 12));
    }

    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <instancedMesh ref={tiles} args={[res.tile, res.mats, TILES]} frustumCulled={false} />
      <instancedMesh ref={gems} args={[res.gem, res.gemMat, GEMS]} frustumCulled={false} />
      <mesh ref={mineRef} geometry={res.mine} material={res.mineMat} visible={false} />
      <mesh ref={beamRef} geometry={res.beam} material={res.beamMat} visible={false} renderOrder={5} />
      <mesh ref={retRef} geometry={res.reticle} material={res.reticleMat} visible={false} renderOrder={5} />
      <mesh ref={gemGlow} geometry={kit.geo.plane} material={res.glowMat} position={[0, 0.35, G.cz]} visible={false} renderOrder={6} />
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}

