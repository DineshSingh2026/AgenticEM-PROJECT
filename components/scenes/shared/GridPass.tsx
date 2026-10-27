"use client";
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TOKENS } from "@/lib/tokens";
import vert from "../shaders/fullscreen.vert.glsl";
import frag from "../shaders/grid.frag.glsl";

const CONFIG = {
  cellPx: 80,
  opacity: 0.05,
  color: TOKENS.text,
  renderOrder: 9999,
};

/** Screen-space blueprint grid + crop marks drawn over every scene. One draw call. */
export function GridPass() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uResolution: { value: new THREE.Vector2(1, 1) },
          uDpr: { value: 1 },
          uCell: { value: CONFIG.cellPx },
          uOpacity: { value: CONFIG.opacity },
          uColor: { value: new THREE.Color(CONFIG.color) },
        },
      }),
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  useFrame(() => {
    material.uniforms.uResolution.value.set(size.width * dpr, size.height * dpr);
    material.uniforms.uDpr.value = dpr;
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={CONFIG.renderOrder} />;
}
