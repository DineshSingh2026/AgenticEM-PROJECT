"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Sparks, Waves, easeIn, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, makeRig } from "../Robot";

/**
 * 8-Ball Pool: the agent projects a teal aim line and ghost-ball, draws the cue and breaks; balls
 * scatter with real collisions, cushion bounces and pocketing, then it lines up the next shot.
 */
const T = { hx: 0.6, hz: 0.31, y: 0.07, r: 0.031 };
const BALL_Y = T.y + T.r;
const POCKETS: [number, number][] = [[-T.hx, -T.hz], [0, -T.hz - 0.012], [T.hx, -T.hz], [-T.hx, T.hz], [0, T.hz + 0.012], [T.hx, T.hz]];
const POCKET_R = 0.058;
const COLORS = ["#F2C14E", "#2F5FD8", "#D63C3C", "#7A4FD8", "#111111", "#F08A2E", "#2F9E5B", "#8C2B3A", "#F2C14E", "#2F5FD8"];
const N = 11; // 0 = cue ball
const HEAD = new THREE.Vector2(-0.34, 0);

type Phase = "rack" | "aim" | "strike" | "roll" | "clear";

interface Ball { x: number; z: number; vx: number; vz: number; on: boolean; sink: number; sx: number; sz: number }

export function Pool({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0.04, 0, -0.6], 0.44);
    const body = kit.own(new RoundedBoxGeometry(T.hx * 2 + 0.16, T.y, T.hz * 2 + 0.16, 2, 0.02).translate(0, T.y / 2, 0));
    const felt = kit.own(new THREE.PlaneGeometry(T.hx * 2 + 0.02, T.hz * 2 + 0.02).rotateX(-Math.PI / 2).translate(0, T.y + 0.001, 0));
    const railX = kit.own(new RoundedBoxGeometry(T.hx * 2 + 0.16, 0.035, 0.07, 2, 0.012));
    const railZ = kit.own(new RoundedBoxGeometry(0.07, 0.035, T.hz * 2 + 0.02, 2, 0.012));
    const pocket = kit.own(new THREE.CircleGeometry(POCKET_R * 0.95, 24).rotateX(-Math.PI / 2));
    const pocketRing = kit.own(new THREE.TorusGeometry(POCKET_R * 0.95, 0.008, 8, 24).rotateX(Math.PI / 2));
    const ball = kit.own(new THREE.SphereGeometry(T.r, 20, 14));
    const cue = kit.own(new THREE.CylinderGeometry(0.006, 0.012, 0.78, 12).rotateZ(Math.PI / 2).translate(-0.39 - 0.02, 0, 0));
    const cueTip = kit.own(new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 10).rotateZ(Math.PI / 2).translate(-0.016, 0, 0));
    const aim = kit.own(new THREE.PlaneGeometry(1, 0.008).translate(0.5, 0, 0).rotateX(-Math.PI / 2));
    const ghost = kit.own(new THREE.RingGeometry(T.r * 0.85, T.r, 32).rotateX(-Math.PI / 2));
    const feltMat = kit.std({ color: new THREE.Color("#0f5446"), roughness: 0.95, metalness: 0, envMapIntensity: 0.25 });
    const railMat = kit.std({ color: new THREE.Color("#3a1c14"), roughness: 0.35, metalness: 0.2, envMapIntensity: 0.8 });
    const ballMat = kit.gloss({ color: 0xffffff, roughness: 0.12, metalness: 0.05, envMapIntensity: 1 });
    const cueMat = kit.std({ color: new THREE.Color("#d9b27a"), roughness: 0.35, metalness: 0.3 });
    const aimMat = kit.light(ctx.accent, 2.2, 0.9);
    const ghostMat = kit.light(ctx.accent, 2.6, 1);
    return { rig, body, felt, railX, railZ, pocket, pocketRing, ball, cue, cueTip, aim, ghost, feltMat, railMat, ballMat, cueMat, aimMat, ghostMat, sparks: new Sparks(kit, 64), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);

  const ballsRef = useRef<THREE.InstancedMesh>(null);
  const cueRef = useRef<THREE.Group>(null);
  const aimRef = useRef<THREE.Mesh>(null);
  const ghostRef = useRef<THREE.Mesh>(null);
  const st = useRef({
    phase: "rack" as Phase,
    t0: 0.5 * ctx.index,
    shots: 0,
    balls: new Array(N).fill(0).map<Ball>(() => ({ x: 0, z: 0, vx: 0, vz: 0, on: false, sink: 0, sx: 0, sz: 0 })),
    ang: 0,
    power: 2,
    target: 1,
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    sc: new THREE.Vector3(),
    p: new THREE.Vector3(),
    col: new THREE.Color(),
    look: new THREE.Vector3(),
    ghost: new THREE.Vector2(),
    inited: false,
  });

  const rack = () => {
    const s = st.current;
    const b = s.balls;
    Object.assign(b[0], { x: HEAD.x, z: HEAD.y, vx: 0, vz: 0, on: true, sink: 0 });
    let k = 1;
    const dx = T.r * 2 * 0.87;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i <= row; i++) {
        Object.assign(b[k], { x: 0.2 + row * dx, z: (i - row / 2) * T.r * 2.02, vx: 0, vz: 0, on: true, sink: 0 });
        k++;
      }
    }
    s.shots = 0;
  };

  const chooseShot = () => {
    const s = st.current;
    const b = s.balls;
    const cue = b[0];
    if (!cue.on) Object.assign(cue, { x: HEAD.x, z: HEAD.y, vx: 0, vz: 0, on: true, sink: 0 });
    const live = b.map((x, i) => ({ x, i })).filter((o) => o.i > 0 && o.x.on);
    if (!live.length) return false;
    const tgt = s.shots === 0 ? live[0] : live[Math.floor(Math.random() * live.length)];
    let dx = tgt.x.x - cue.x;
    let dz = tgt.x.z - cue.z;
    // aim to send the target toward the nearest pocket when possible
    if (s.shots > 0) {
      const pk = POCKETS.reduce((a, p) => (Math.hypot(p[0] - tgt.x.x, p[1] - tgt.x.z) < Math.hypot(a[0] - tgt.x.x, a[1] - tgt.x.z) ? p : a));
      const px = pk[0] - tgt.x.x;
      const pz = pk[1] - tgt.x.z;
      const pl = Math.hypot(px, pz) || 1;
      const gx = tgt.x.x - (px / pl) * T.r * 2;
      const gz = tgt.x.z - (pz / pl) * T.r * 2;
      const ndx = gx - cue.x;
      const ndz = gz - cue.z;
      // only cut if the cue approaches from behind the target (dot > 0.3)
      if ((ndx * px + ndz * pz) / ((Math.hypot(ndx, ndz) || 1) * pl) > 0.3) {
        dx = ndx;
        dz = ndz;
      }
    }
    s.ang = Math.atan2(dz, dx) + (s.shots === 0 ? (Math.random() - 0.5) * 0.03 : 0);
    s.power = s.shots === 0 ? 3.4 : 1.6 + Math.random() * 0.8;
    s.target = tgt.i;
    const d = Math.hypot(dx, dz);
    s.ghost.set(cue.x + Math.cos(s.ang) * d, cue.z + Math.sin(s.ang) * d);
    return true;
  };

  const sink = (b: Ball, i: number) => {
    b.on = false;
    b.sink = 0.001;
    b.sx = b.x;
    b.sz = b.z;
    const s = st.current;
    s.p.set(b.x, T.y + 0.02, b.z);
    const col = i === 0 ? "#FFFFFF" : i === 5 ? "#F7DFA3" : COLORS[i - 1];
    res.sparks.burst(s.p, col, i === 5 ? 34 : 16, 0.9, { up: 1, life: 0.7 });
    res.waves.fire(s.p, i === 0 ? "#FF5A3D" : ctx.accent, 0.3, 0.6);
    if (i > 0) ctx.emit(i === 5 ? 1.4 : 0.7, "#8CC8FF");
    if (i === 5) {
      res.rig.flash = 1;
      res.rig.flashColor.set("#F7DFA3");
    }
  };

  const physics = (dt: number) => {
    const b = st.current.balls;
    const steps = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / steps;
    let moving = false;
    for (let n = 0; n < steps; n++) {
      for (let i = 0; i < N; i++) {
        const a = b[i];
        if (!a.on) continue;
        const sp = Math.hypot(a.vx, a.vz);
        if (sp > 0) {
          const ns = Math.max(0, sp - (0.42 + sp * 0.25) * h);
          a.vx *= ns / sp;
          a.vz *= ns / sp;
        }
        a.x += a.vx * h;
        a.z += a.vz * h;
        for (const [px, pz] of POCKETS) {
          if (Math.hypot(a.x - px, a.z - pz) < POCKET_R) {
            sink(a, i);
            break;
          }
        }
        if (!a.on) continue;
        const lx = T.hx - T.r;
        const lz = T.hz - T.r;
        if (a.x > lx) { a.x = lx; a.vx = -Math.abs(a.vx) * 0.78; }
        if (a.x < -lx) { a.x = -lx; a.vx = Math.abs(a.vx) * 0.78; }
        if (a.z > lz) { a.z = lz; a.vz = -Math.abs(a.vz) * 0.78; }
        if (a.z < -lz) { a.z = -lz; a.vz = Math.abs(a.vz) * 0.78; }
      }
      for (let i = 0; i < N; i++) {
        const a = b[i];
        if (!a.on) continue;
        for (let j = i + 1; j < N; j++) {
          const c = b[j];
          if (!c.on) continue;
          const dx = c.x - a.x;
          const dz = c.z - a.z;
          const d = Math.hypot(dx, dz);
          if (d > 0 && d < T.r * 2) {
            const nx = dx / d;
            const nz = dz / d;
            const rel = (a.vx - c.vx) * nx + (a.vz - c.vz) * nz;
            if (rel > 0) {
              const im = rel * 0.96;
              a.vx -= im * nx;
              a.vz -= im * nz;
              c.vx += im * nx;
              c.vz += im * nz;
            }
            const o = (T.r * 2 - d) / 2;
            a.x -= nx * o;
            a.z -= nz * o;
            c.x += nx * o;
            c.z += nz * o;
          }
        }
      }
    }
    for (const a of b) if (a.on && Math.hypot(a.vx, a.vz) > 0.015) moving = true;
    return moving;
  };

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on) return;
    const { t, dt } = c;
    const s = st.current;
    const rig = res.rig;
    if (!s.inited) {
      s.inited = true;
      rack();
    }
    const el = t - s.t0;
    let draw = 0;
    let aimK = 0;

    switch (s.phase) {
      case "rack":
        if (el > 0.9) {
          s.phase = "aim";
          s.t0 = t;
          chooseShot();
        }
        break;
      case "aim":
        aimK = smooth(seg(el, 0, 0.3));
        draw = smooth(seg(el, 0.35, 1.1)) * (s.shots === 0 ? 0.14 : 0.09);
        if (el > 1.25) {
          s.phase = "strike";
          s.t0 = t;
        }
        break;
      case "strike": {
        const f = seg(el, 0, 0.07);
        draw = lerp(s.shots === 0 ? 0.14 : 0.09, -0.01, easeIn(f, 2));
        aimK = 1 - f;
        if (f >= 1) {
          const cb = s.balls[0];
          cb.vx = Math.cos(s.ang) * s.power;
          cb.vz = Math.sin(s.ang) * s.power;
          s.phase = "roll";
          s.t0 = t;
          s.shots++;
          s.p.set(cb.x, BALL_Y, cb.z);
          res.sparks.burst(s.p, "#FFFFFF", 6, 0.4, { up: 1, life: 0.3, size: 0.01 });
        }
        break;
      }
      case "roll": {
        draw = -0.01 - smooth(seg(el, 0, 0.4)) * 0.2;
        const moving = physics(dt);
        if ((!moving && el > 0.6) || el > 5) {
          const left = s.balls.filter((x, i) => i > 0 && x.on).length;
          s.t0 = t;
          if (left > 3 && s.shots < 4) {
            s.phase = "aim";
            chooseShot();
          } else s.phase = "clear";
        }
        break;
      }
      case "clear":
        if (el > 0.7) {
          rack();
          s.phase = "rack";
          s.t0 = t;
        }
        break;
    }

    // Balls
    const bm = ballsRef.current;
    if (bm) {
      for (let i = 0; i < N; i++) {
        const b = s.balls[i];
        let scale = 1;
        let y = BALL_Y;
        let x = b.x;
        let z = b.z;
        if (s.phase === "rack") scale = smooth(seg(el, i * 0.05, i * 0.05 + 0.3));
        if (s.phase === "clear" && b.on) scale = 1 - smooth(seg(el, 0, 0.5));
        if (!b.on) {
          if (b.sink > 0 && b.sink < 1) b.sink = Math.min(1, b.sink + dt / 0.35);
          scale = b.sink > 0 ? 1 - b.sink : 0;
          y = BALL_Y - b.sink * 0.05;
          x = b.sx;
          z = b.sz;
          if (b.sink >= 1) scale = 0;
        }
        s.m.compose(s.p.set(x, y, z), s.q, s.sc.setScalar(Math.max(0.0001, scale)));
        bm.setMatrixAt(i, s.m);
        bm.setColorAt(i, s.col.set(i === 0 ? "#F6F1E6" : COLORS[i - 1]));
      }
      bm.instanceMatrix.needsUpdate = true;
      if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
    }

    // Cue, aim line, ghost ball
    const cb = s.balls[0];
    const cue = cueRef.current;
    if (cue) {
      const show = s.phase === "aim" || s.phase === "strike" || (s.phase === "roll" && el < 0.5);
      cue.visible = show;
      cue.position.set(cb.x - Math.cos(s.ang) * (T.r + draw + 0.004), BALL_Y + 0.012, cb.z - Math.sin(s.ang) * (T.r + draw + 0.004));
      cue.rotation.set(0, -s.ang, -0.09);
    }
    const am = aimRef.current;
    if (am) {
      am.visible = aimK > 0.01;
      const len = Math.max(0.01, Math.hypot(s.ghost.x - cb.x, s.ghost.y - cb.z) - T.r);
      am.position.set(cb.x, T.y + 0.003, cb.z);
      am.rotation.y = -s.ang;
      am.scale.set(len * aimK, 1, 1);
      res.aimMat.color.set(ctx.accent).multiplyScalar(1.4 + 0.6 * Math.sin(t * 18));
    }
    const gh = ghostRef.current;
    if (gh) {
      gh.visible = aimK > 0.01;
      gh.position.set(s.ghost.x, T.y + 0.004, s.ghost.y);
      gh.scale.setScalar(aimK * (1 + 0.1 * Math.sin(t * 10)));
    }

    // Agent: leans on the cue, follows the cue ball
    rig.armA.x = -1.1 - draw * 4;
    rig.armA.z = -0.2;
    rig.armB.x = -0.9;
    rig.armB.z = 0.15;
    rig.think = s.phase === "aim" ? 0.9 : 0;
    rig.look = s.look.set(cb.on ? cb.x : HEAD.x, BALL_Y, cb.on ? cb.z : HEAD.y);

    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <mesh geometry={res.body} material={res.railMat} />
      <mesh geometry={res.felt} material={res.feltMat} />
      <mesh geometry={res.railX} material={res.railMat} position={[0, T.y + 0.012, T.hz + 0.045]} />
      <mesh geometry={res.railX} material={res.railMat} position={[0, T.y + 0.012, -T.hz - 0.045]} />
      <mesh geometry={res.railZ} material={res.railMat} position={[T.hx + 0.045, T.y + 0.012, 0]} />
      <mesh geometry={res.railZ} material={res.railMat} position={[-T.hx - 0.045, T.y + 0.012, 0]} />
      {POCKETS.map(([x, z], i) => (
        <group key={i} position={[x, T.y + 0.003, z]}>
          <mesh geometry={res.pocket} material={kit.mat.black} />
          <mesh geometry={res.pocketRing} material={kit.mat.gold} position={[0, 0.026, 0]} />
        </group>
      ))}
      <instancedMesh ref={ballsRef} args={[res.ball, res.ballMat, N]} frustumCulled={false} />
      <group ref={cueRef} visible={false}>
        <mesh geometry={res.cue} material={res.cueMat} />
        <mesh geometry={res.cueTip} material={kit.mat.ivory} />
      </group>
      <mesh ref={aimRef} geometry={res.aim} material={res.aimMat} visible={false} renderOrder={4} />
      <mesh ref={ghostRef} geometry={res.ghost} material={res.ghostMat} visible={false} renderOrder={4} />
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
