"use client";
import * as THREE from "three";
import type { Kit } from "./kit";

/** Robot-local shoulder offsets and arm length to the palm. */
const SHOULDER_Y = 1.0;
const SHOULDER_X = 0.4;
const GRIP = 0.62;
const HEAD_Y = 1.05;

export interface ArmPose {
  /** swing about X: negative = forward, -PI/2 = straight ahead, -PI = straight up */
  x: number;
  /** sideways: positive swings the hand toward robot +X */
  z: number;
}

/**
 * Mutable rig state. Games write target poses (`armA`, `armB`, `look`, `think`, `flash`) and call
 * `driveRig` once per frame; the rig eases its joints toward the targets so motion never pops.
 * Side A is the robot's +X arm (screen right when facing the viewer), side B is -X.
 */
export interface Rig {
  pos: THREE.Vector3;
  scale: number;
  yaw: number;
  accent: THREE.Color;
  group: THREE.Group | null;
  head: THREE.Group | null;
  armAObj: THREE.Group | null;
  armBObj: THREE.Group | null;
  visor: THREE.MeshBasicMaterial;
  tether: THREE.MeshBasicMaterial;
  pool: THREE.MeshBasicMaterial;
  rings: (THREE.Group | null)[];
  chest: THREE.MeshBasicMaterial;
  tip: THREE.MeshBasicMaterial;
  armA: ArmPose;
  armB: ArmPose;
  look: THREE.Vector3 | null;
  think: number;
  flash: number;
  flashColor: THREE.Color;
  recoil: number;
  /** joint follow rate (1/s) */
  stiff: number;
}

export function makeRig(kit: Kit, accent: THREE.ColorRepresentation, pos: [number, number, number], scale = 0.42, yaw = 0): Rig {
  const a = new THREE.Color(accent);
  return {
    pos: new THREE.Vector3(...pos),
    scale,
    yaw,
    accent: a,
    group: null,
    head: null,
    armAObj: null,
    armBObj: null,
    visor: kit.basic({ color: a.clone() }),
    tether: kit.light(a, 1.6, 0.7),
    pool: kit.light(a, 0.5, 0.8, kit.tex.glow),
    rings: [null, null],
    chest: kit.basic({ color: a.clone() }),
    tip: kit.basic({ color: a.clone() }),
    armA: { x: -0.3, z: 0.12 },
    armB: { x: -0.3, z: -0.12 },
    look: null,
    think: 0,
    flash: 0,
    flashColor: new THREE.Color("#F7DFA3"),
    recoil: 0,
    stiff: 16,
  };
}

const _v = new THREE.Vector3();
const _hot = new THREE.Color();
const _flash = new THREE.Color();

/** Ease joints toward targets, aim the head, pulse the visor. */
export function driveRig(rig: Rig, t: number, dt: number) {
  const k = 1 - Math.exp(-dt * rig.stiff);
  const a = rig.armAObj;
  const b = rig.armBObj;
  if (a) {
    a.rotation.x += (rig.armA.x - a.rotation.x) * k;
    a.rotation.z += (rig.armA.z - a.rotation.z) * k;
  }
  if (b) {
    b.rotation.x += (rig.armB.x - b.rotation.x) * k;
    b.rotation.z += (rig.armB.z - b.rotation.z) * k;
  }
  const head = rig.head;
  if (head) {
    let yaw = Math.sin(t * 0.6 + rig.pos.x * 5) * 0.25;
    let pitch = 0.18;
    if (rig.look) {
      _v.copy(rig.look).sub(rig.pos);
      // into robot-local yaw frame
      const c = Math.cos(-rig.yaw);
      const s = Math.sin(-rig.yaw);
      const dx = _v.x * c + _v.z * s;
      const dz = -_v.x * s + _v.z * c;
      const dy = _v.y - HEAD_Y * rig.scale;
      yaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -1.2, 1.2);
      pitch = THREE.MathUtils.clamp(Math.atan2(-dy, Math.hypot(dx, dz)), -0.7, 0.9);
    }
    pitch -= rig.recoil * 0.5;
    const kh = 1 - Math.exp(-dt * 7);
    head.rotation.y += (yaw - head.rotation.y) * kh;
    head.rotation.x += (pitch - head.rotation.x) * kh;
  }
  const pulse = rig.think > 0 ? (0.5 + 0.5 * Math.sin(t * 15)) * rig.think : 0;
  _hot.copy(rig.accent).multiplyScalar(1.2 + pulse * 1.8);
  _hot.lerp(_flash.copy(rig.flashColor).multiplyScalar(3.2), Math.min(1, rig.flash));
  rig.visor.color.copy(_hot);
  rig.chest.color.copy(rig.accent).multiplyScalar(0.8 + pulse * 1.5 + rig.flash * 2);
  rig.tip.color.copy(rig.accent).multiplyScalar(1.4 + pulse * 1.2 + rig.flash * 2.5);
  rig.tether.color.copy(rig.accent).multiplyScalar(0.9 + pulse * 1.4 + rig.flash * 2);
  rig.pool.color.copy(rig.accent).multiplyScalar(0.35 + pulse * 0.25 + rig.flash * 0.8);
  const [r1, r2] = rig.rings;
  const spin = 1 + rig.think * 2.5 + rig.flash * 4;
  if (r1) {
    r1.rotation.x += dt * 0.7 * spin;
    r1.rotation.y += dt * 0.45 * spin;
  }
  if (r2) {
    r2.rotation.y -= dt * 0.6 * spin;
    r2.rotation.z += dt * 0.35 * spin;
  }
  if (rig.group) {
    rig.group.position.set(rig.pos.x, rig.pos.y + Math.sin(t * 2.1 + rig.pos.z * 3) * 0.004 + rig.flash * 0.03 * Math.abs(Math.sin(rig.flash * 10)), rig.pos.z - rig.recoil * 0.03);
  }
  rig.flash *= Math.exp(-dt / 0.5);
  rig.recoil *= Math.exp(-dt / 0.35);
}

/** Pod-local position of a palm, from the rig's *current* joint angles. */
export function handPos(rig: Rig, side: "A" | "B", out: THREE.Vector3) {
  const obj = side === "A" ? rig.armAObj : rig.armBObj;
  const th = obj ? obj.rotation.x : (side === "A" ? rig.armA : rig.armB).x;
  const ph = obj ? obj.rotation.z : (side === "A" ? rig.armA : rig.armB).z;
  const lx = (side === "A" ? SHOULDER_X : -SHOULDER_X) + GRIP * Math.sin(ph);
  const ly = SHOULDER_Y - GRIP * Math.cos(ph) * Math.cos(th);
  const lz = -GRIP * Math.cos(ph) * Math.sin(th);
  const c = Math.cos(rig.yaw);
  const s = Math.sin(rig.yaw);
  const x = lx * c + lz * s;
  const z = -lx * s + lz * c;
  return out.set(rig.pos.x + x * rig.scale, rig.pos.y + ly * rig.scale, rig.pos.z + z * rig.scale);
}

/** Pod-local position of the visor centre. */
export function visorPos(rig: Rig, out: THREE.Vector3) {
  const h = rig.head;
  const yaw = rig.yaw + (h ? h.rotation.y : 0);
  const pitch = h ? h.rotation.x : 0;
  const f = 0.3 * rig.scale;
  return out.set(
    rig.pos.x + Math.sin(yaw) * Math.cos(pitch) * f,
    rig.pos.y + HEAD_Y * rig.scale - Math.sin(pitch) * f,
    rig.pos.z + Math.cos(yaw) * Math.cos(pitch) * f,
  );
}

/**
 * The agent: a floating obsidian core with a glowing lens that tracks what it is reasoning about,
 * two counter-rotating gold gyroscope rings, and two tethered manipulator nodes that act as hands.
 */
export function Robot({ kit, rig }: { kit: Kit; rig: Rig }) {
  const g = kit.geo;
  const m = kit.mat;
  const arm = (side: "A" | "B") => (
    <group
      ref={(o) => { if (side === "A") rig.armAObj = o; else rig.armBObj = o; }}
      position={[side === "A" ? SHOULDER_X : -SHOULDER_X, SHOULDER_Y, 0]}
      rotation={[(side === "A" ? rig.armA : rig.armB).x, 0, (side === "A" ? rig.armA : rig.armB).z]}
    >
      <mesh geometry={g.tether} material={rig.tether} />
      <mesh geometry={g.node} material={m.gold} />
      <mesh geometry={g.nodeRing} material={rig.tip} />
    </group>
  );
  return (
    <group
      ref={(o) => { rig.group = o; }}
      position={rig.pos.toArray()}
      rotation={[0, rig.yaw, 0]}
      scale={rig.scale}
    >
      <mesh geometry={g.pool} material={rig.pool} position={[0, 0.02, 0]} scale={2.2} renderOrder={-1} />
      <group ref={(o) => { rig.head = o; }} position={[0, HEAD_Y, 0]}>
        <mesh geometry={g.core} material={m.obsidian} />
        <mesh geometry={g.iris} material={rig.visor} />
        <mesh geometry={g.pupil} material={rig.chest} />
        <mesh geometry={g.lens} material={m.gold} />
      </group>
      <group ref={(o) => { rig.rings[0] = o; }} position={[0, HEAD_Y, 0]} rotation={[1.1, 0.3, 0]}>
        <mesh geometry={g.gyro} material={m.gold} />
      </group>
      <group ref={(o) => { rig.rings[1] = o; }} position={[0, HEAD_Y, 0]} rotation={[0.4, 1.2, 0.6]}>
        <mesh geometry={g.gyroThin} material={m.goldDeep} />
      </group>
      {arm("A")}
      {arm("B")}
    </group>
  );
}
