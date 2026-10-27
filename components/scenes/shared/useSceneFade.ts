"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneStore, type SceneName } from "@/lib/scene-store";

const FADE_MS = 400;

/**
 * Shared fade contract for every scene. `opacity.current` eases toward 1 while the scene is active
 * and toward 0 otherwise (~400ms). Copy it into the scene's uOpacity uniform each frame and return
 * early from the scene's own useFrame when `isVisible()` is false.
 */
export function useSceneFade(name: SceneName) {
  const opacity = useRef(0);
  useFrame((_, dt) => {
    const target = useSceneStore.getState().activeScene === name ? 1 : 0;
    const k = Math.min(1, (dt * 1000) / (FADE_MS / 4));
    opacity.current += (target - opacity.current) * k;
    if (Math.abs(target - opacity.current) < 0.002) opacity.current = target;
  }, -1);
  return { opacity, isVisible: () => opacity.current > 0.001 };
}
