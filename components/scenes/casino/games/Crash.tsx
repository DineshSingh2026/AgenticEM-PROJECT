"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Sparks, Waves, discGeometry, easeOut, hop, lerp, seg, smooth, type PodCtx } from "../kit";
import { Robot, driveRig, handPos, makeRig } from "../Robot";

/**
 * Crash: a rocket climbs an exponential curve across a holographic chart. The agent watches the
 * multiplier, cashes out (teal pulse, coin flies to its hand) and the rocket eventually explodes.
 */
const PANEL = { x: -0.1, y: 0.56, z: -0.08, w: 1.12, h: 0.8 };
const CURVE = { x0: -0.47, y0: -0.31, w: 0.9, h: 0.6, k: 2.2, dur: 4.4 };
const N = 96;

const panelVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const panelFrag = /* glsl */ `
uniform float uOpacity; uniform vec3 uColor; uniform float uCrash; uniform float uTime; uniform float uLevel;
varying vec2 vUv;
void main() {
  vec2 p = vUv;
  vec2 g = abs(fract(p * vec2(12.0, 8.0)) - 0.5);
  float line = smoothstep(0.46, 0.5, max(g.x, g.y));
  float d = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
  float edge = smoothstep(0.03, 0.0, d) + smoothstep(0.012, 0.0, abs(d - 0.045)) * 0.5;
  float scan = 0.5 + 0.5 * sin(p.y * 180.0 - uTime * 5.0);
  float lvl = smoothstep(0.008, 0.0, abs(p.y - uLevel)) * step(0.02, uLevel);
  vec3 col = vec3(0.012, 0.022, 0.026) + uColor * (line * 0.12 + edge * 0.9 + scan * 0.012 + lvl * 0.5);
  col += vec3(0.9, 0.08, 0.06) * uCrash * (0.25 + 0.25 * sin(uTime * 40.0)) * (0.3 + edge);
  gl_FragColor = vec4(col, 0.86 * uOpacity);
  #include <colorspace_fragment>
}
`;
const lineVert = /* glsl */ `
attribute float aT;
varying float vT;
void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ribbonFrag = /* glsl */ `
uniform float uOpacity; uniform float uAlpha; uniform float uCrash; uniform vec3 uA; uniform vec3 uB;
varying float vT;
void main() {
  vec3 c = mix(uA, uB, vT) * (1.4 + 3.2 * vT * vT);
  c = mix(c, vec3(3.0, 0.25, 0.2), uCrash);
  gl_FragColor = vec4(c * uOpacity * uAlpha, 1.0);
}
`;
const fillFrag = /* glsl */ `
uniform float uOpacity; uniform float uAlpha; uniform float uCrash; uniform vec3 uA;
varying float vT;
void main() {
  vec3 c = mix(uA, vec3(1.0, 0.1, 0.08), uCrash) * pow(vT, 1.3) * 0.5;
  gl_FragColor = vec4(c * uOpacity * uAlpha, 1.0);
}
`;

const curveY = (p: number) => (Math.exp(CURVE.k * p) - 1) / (Math.exp(CURVE.k) - 1);
/** The chart auto-zooms like a live crash graph: the tip always rides near the top-right. */
const view = (p: number) => ({ xr: Math.max(p / 0.86, 0.25), yr: Math.max(curveY(p) / 0.84, curveY(0.25)) });
const chartX = (q: number, xr: number) => CURVE.x0 + CURVE.w * (q / xr);
const chartY = (q: number, yr: number) => CURVE.y0 + CURVE.h * (curveY(q) / yr);

export function Crash({ ctx }: { ctx: PodCtx }) {
  const { kit } = ctx;
  const res = useMemo(() => {
    const rig = makeRig(kit, ctx.accent, [0.62, 0, 0.14], 0.44, -0.65);
    const accent = new THREE.Color(ctx.accent);
    const panelMat = kit.own(new THREE.ShaderMaterial({
      vertexShader: panelVert, fragmentShader: panelFrag, transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 0 }, uColor: { value: accent.clone().multiplyScalar(1.1) }, uCrash: { value: 0 }, uTime: { value: 0 }, uLevel: { value: 0 } },
    }));
    const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide } as const;
    const ribbonMat = kit.own(new THREE.ShaderMaterial({
      vertexShader: lineVert, fragmentShader: ribbonFrag, ...add,
      uniforms: { uOpacity: { value: 0 }, uAlpha: { value: 0 }, uCrash: { value: 0 }, uA: { value: new THREE.Color("#E8B65A") }, uB: { value: accent.clone() } },
    }));
    const fillMat = kit.own(new THREE.ShaderMaterial({
      vertexShader: lineVert, fragmentShader: fillFrag, ...add,
      uniforms: { uOpacity: { value: 0 }, uAlpha: { value: 0 }, uCrash: { value: 0 }, uA: { value: accent.clone() } },
    }));
    const mk = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const at = new Float32Array(N * 2);
      g.setAttribute("aT", new THREE.BufferAttribute(at, 1));
      const idx: number[] = [];
      for (let i = 0; i < N - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      g.setIndex(idx);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
      return kit.own(g);
    };
    const ribbon = mk();
    const fill = mk();
    const rAt = ribbon.attributes.aT as THREE.BufferAttribute;
    const fAt = fill.attributes.aT as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      rAt.setX(i * 2, i / (N - 1));
      rAt.setX(i * 2 + 1, i / (N - 1));
      fAt.setX(i * 2, 0);
      fAt.setX(i * 2 + 1, 1);
    }
    const panel = kit.own(new THREE.PlaneGeometry(PANEL.w, PANEL.h));
    const bezel = kit.own(new RoundedBoxGeometry(PANEL.w + 0.05, PANEL.h + 0.05, 0.03, 2, 0.012));
    const post = kit.own(new THREE.CylinderGeometry(0.018, 0.024, 0.2, 12).translate(0, 0.1, 0));
    const foot = kit.own(new RoundedBoxGeometry(0.9, 0.04, 0.16, 2, 0.012).translate(0, 0.02, 0));
    const cone = kit.own(new THREE.ConeGeometry(0.036, 0.11, 16).translate(0, 0.015, 0));
    const fin = kit.own(new THREE.BoxGeometry(0.09, 0.03, 0.008).translate(0, -0.03, 0));
    const coin = kit.own(discGeometry(0.05, 0.007, 2));
    const glowMat = kit.light("#FFB070", 2.2, 1, kit.tex.glow);
    const coneMat = kit.basic({ color: new THREE.Color("#FFF1D0").multiplyScalar(1.6) });
    return { rig, panelMat, ribbonMat, fillMat, ribbon, fill, panel, bezel, post, foot, cone, fin, coin, glowMat, coneMat, sparks: new Sparks(kit, 96, -1.2), waves: new Waves(kit, 3) };
  }, [kit, ctx.accent]);

  const rocket = useRef<THREE.Group>(null);
  const coinRef = useRef<THREE.Group>(null);
  const panelGrp = useRef<THREE.Group>(null);
  const st = useRef({
    phase: "wait" as "wait" | "run" | "crash",
    t0: 0.5 * ctx.index,
    pc: 0.7,
    pco: 0.5,
    cash: true,
    cashed: false,
    crash: 0,
    alpha: 0,
    coinT: -9,
    coinFrom: new THREE.Vector3(),
    tip: new THREE.Vector3(),
    tipPod: new THREE.Vector3(),
    hand: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    tmp: new THREE.Vector3(),
    emitAcc: 0,
    shake: 0,
  });

  const writeCurve = (p: number) => {
    const rp = res.ribbon.attributes.position as THREE.BufferAttribute;
    const fp = res.fill.attributes.position as THREE.BufferAttribute;
    const w = 0.016;
    const { xr, yr } = view(p);
    for (let i = 0; i < N; i++) {
      const q = (p * i) / (N - 1);
      const x = chartX(q, xr);
      const y = chartY(q, yr);
      const dq = 0.002;
      const dx = chartX(q + dq, xr) - x;
      const dy = chartY(q + dq, yr) - y;
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      rp.setXYZ(i * 2, x + nx * w, y + ny * w, 0.012);
      rp.setXYZ(i * 2 + 1, x - nx * w, y - ny * w, 0.012);
      fp.setXYZ(i * 2, x, CURVE.y0, 0.006);
      fp.setXYZ(i * 2 + 1, x, y, 0.006);
    }
    rp.needsUpdate = true;
    fp.needsUpdate = true;
  };

  useFrame(() => {
    const c = ctx.clock.current;
    if (!c.on) return;
    const { t, dt } = c;
    const s = st.current;
    const rig = res.rig;

    let p = 0;
    if (s.phase === "wait") {
      s.alpha = Math.max(0, s.alpha - dt * 2.5);
      if (t - s.t0 > 1.0) {
        s.phase = "run";
        s.t0 = t;
        s.pc = 0.38 + Math.random() * 0.62;
        s.cash = Math.random() < 0.72;
        s.pco = s.pc * (0.55 + Math.random() * 0.33);
        s.cashed = false;
        s.crash = 0;
      }
    } else if (s.phase === "run") {
      s.alpha = Math.min(1, s.alpha + dt * 4);
      p = Math.min(s.pc, (t - s.t0) / CURVE.dur);
      if (s.cash && !s.cashed && p >= s.pco) {
        s.cashed = true;
        s.coinT = t;
        s.coinFrom.copy(s.tipPod);
        res.waves.fire(s.tipPod, "#7FF3EA", 0.35, 0.6, false, 2);
        res.sparks.burst(s.tipPod, "#7FF3EA", 22, 0.9, { up: 0.5, life: 0.6 });
        rig.flash = 1;
        rig.flashColor.set("#7FF3EA");
        ctx.emit(0.7 + p * 1.2, "#FFC48A");
      }
      if (p >= s.pc) {
        s.phase = "crash";
        s.t0 = t;
        s.crash = 1;
        s.shake = 1;
        res.sparks.burst(s.tipPod, "#FF7A45", 46, 1.6, { up: 0.3, life: 0.9, size: 0.02 });
        res.sparks.burst(s.tipPod, "#FFE2A8", 20, 0.9, { up: 0.3, life: 0.6 });
        res.waves.fire(s.tipPod, "#FF5A3D", 0.6, 0.7, false, 2);
        if (!s.cashed) {
          rig.recoil = 1;
          rig.flash = 0.8;
          rig.flashColor.set("#FF4A3D");
        }
      }
    } else {
      p = s.pc;
      if (t - s.t0 > 1.1) s.alpha = Math.max(0, s.alpha - dt * 2.2);
      if (t - s.t0 > 1.7) {
        s.phase = "wait";
        s.t0 = t;
      }
    }
    s.crash *= Math.exp(-dt / 0.9);
    s.shake *= Math.exp(-dt / 0.18);

    writeCurve(Math.max(p, 0.0005));
    const vw = view(p);
    s.tip.set(chartX(p, vw.xr), chartY(p, vw.yr), 0.02);
    s.tipPod.set(s.tip.x + PANEL.x, s.tip.y + PANEL.y, s.tip.z + PANEL.z);

    const fo = c.fo;
    const u1 = res.ribbonMat.uniforms;
    const u2 = res.fillMat.uniforms;
    u1.uOpacity.value = u2.uOpacity.value = fo;
    u1.uAlpha.value = u2.uAlpha.value = s.alpha;
    u1.uCrash.value = u2.uCrash.value = Math.min(1, s.crash * 1.3);
    const pu = res.panelMat.uniforms;
    pu.uOpacity.value = fo;
    pu.uTime.value = t;
    pu.uCrash.value = s.crash;
    pu.uLevel.value = s.phase === "run" ? (s.tip.y + PANEL.h / 2) / PANEL.h : 0;

    const rk = rocket.current;
    if (rk) {
      const live = s.phase === "run";
      rk.visible = live || s.phase === "wait";
      rk.position.copy(s.tip);
      rk.rotation.z = Math.atan2(chartY(p + 0.01, vw.yr) - s.tip.y, chartX(p + 0.01, vw.xr) - s.tip.x) - Math.PI / 2;
      const sc = s.phase === "wait" ? 0.6 + 0.25 * Math.sin(t * 6) : 1;
      rk.scale.setScalar(sc);
      if (live) {
        s.emitAcc += dt;
        s.dir.set(-Math.cos(rk.rotation.z + Math.PI / 2), -Math.sin(rk.rotation.z + Math.PI / 2), 0).multiplyScalar(0.6);
        while (s.emitAcc > 0.03) {
          s.emitAcc -= 0.03;
          res.sparks.burst(s.tipPod, Math.random() < 0.5 ? "#FFB070" : "#FFE2A8", 1, 0.5, { dir: s.dir, life: 0.45, size: 0.011 });
        }
      }
    }
    if (panelGrp.current) panelGrp.current.position.set(PANEL.x + (Math.random() - 0.5) * 0.02 * s.shake, PANEL.y + (Math.random() - 0.5) * 0.02 * s.shake, PANEL.z);

    // Cash-out coin flies to the agent
    handPos(rig, "A", s.hand);
    const cf = (t - s.coinT) / 0.65;
    const cg = coinRef.current;
    if (cg) {
      cg.visible = cf >= 0 && cf < 1.6;
      if (cg.visible) {
        const f = Math.min(1, cf);
        cg.position.lerpVectors(s.coinFrom, s.hand, easeOut(f, 2));
        cg.position.y += 0.2 * hop(f);
        cg.rotation.set(Math.PI / 2 + f * 9, 0, 0);
        cg.scale.setScalar(cf > 1 ? Math.max(0, 1 - (cf - 1) * 2) : 1);
      }
    }
    const cashPose = smooth(seg(t - s.coinT, 0.1, 0.4)) * (1 - smooth(seg(t - s.coinT, 1.2, 1.7)));
    rig.armA.x = lerp(-0.35, -1.5, cashPose);
    rig.armA.z = lerp(0.1, -0.2, cashPose);
    rig.armB.x = s.phase === "run" && !s.cashed ? -0.7 + Math.sin(t * 4) * 0.08 : -0.3;
    rig.think = s.phase === "run" && !s.cashed ? 0.8 : 0;
    rig.look = s.tipPod;

    driveRig(rig, t, dt);
    res.sparks.update(dt);
    res.waves.update(dt, c.fo);
  });

  return (
    <>
      <Robot kit={kit} rig={res.rig} />
      <mesh geometry={res.foot} material={kit.mat.gold} position={[PANEL.x, 0, PANEL.z]} />
      <mesh geometry={res.post} material={kit.mat.gold} position={[PANEL.x - 0.38, 0, PANEL.z]} />
      <mesh geometry={res.post} material={kit.mat.gold} position={[PANEL.x + 0.38, 0, PANEL.z]} />
      <group ref={panelGrp} position={[PANEL.x, PANEL.y, PANEL.z]}>
        <mesh geometry={res.bezel} material={kit.mat.goldDeep} position={[0, 0, -0.02]} />
        <mesh geometry={res.panel} material={res.panelMat} renderOrder={2} />
        <mesh geometry={res.fill} material={res.fillMat} renderOrder={3} frustumCulled={false} />
        <mesh geometry={res.ribbon} material={res.ribbonMat} renderOrder={4} frustumCulled={false} />
        <group ref={rocket}>
          <mesh geometry={res.cone} material={res.coneMat} renderOrder={5} />
          <mesh geometry={res.fin} material={kit.mat.gold} renderOrder={5} />
          <mesh geometry={kit.geo.plane} material={res.glowMat} scale={0.42} renderOrder={6} />
        </group>
      </group>
      <group ref={coinRef} visible={false}>
        <mesh geometry={res.coin} material={kit.mat.coin} />
      </group>
      <primitive object={res.sparks.mesh} />
      <primitive object={res.waves.group} />
    </>
  );
}
