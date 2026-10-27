"use client";
import { useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/lib/scene-store";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { TOKENS } from "@/lib/tokens";
import { SceneRegistry } from "./SceneRegistry";
import { GridPass } from "./shared/GridPass";
import { Post } from "./shared/Post";

/** The single full-screen WebGL canvas behind the whole site. */
export function SceneCanvas() {
  const [hidden, setHidden] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);

  // Mirror the active scene onto the layer (no re-render) so CSS can dim busy scenes on phones.
  useEffect(() => {
    const apply = (name: string) => layerRef.current?.setAttribute("data-active-scene", name);
    apply(useSceneStore.getState().activeScene);
    return useSceneStore.subscribe((s, prev) => {
      if (s.activeScene !== prev.activeScene) apply(s.activeScene);
    });
  }, []);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div ref={layerRef} aria-hidden="true" className="scene-layer pointer-events-none fixed inset-0 z-0">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
        frameloop={hidden ? "never" : "always"}
        camera={{ fov: 35, position: [0, 0, 8], near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(TOKENS.bg), 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        style={{ pointerEvents: "none" }}
        tabIndex={-1}
      >
        <color attach="background" args={[TOKENS.bg]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} color={TOKENS.ivory} />
        <directionalLight position={[-5, -2, -4]} intensity={0.4} color={TOKENS.steel} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} position={[0, 5, -6]} scale={[10, 4, 1]} color={TOKENS.ivory} />
          <Lightformer form="rect" intensity={1.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color={TOKENS.steel} />
          <Lightformer form="rect" intensity={0.8} position={[6, 0, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color={TOKENS.copper} />
          <Lightformer form="ring" intensity={1} position={[0, -4, 3]} scale={3} color={TOKENS.ivory} />
        </Environment>
        <SceneRegistry />
        <GridPass />
        <Post />
      </Canvas>
    </div>
  );
}
