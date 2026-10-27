"use client";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useSceneStore } from "@/lib/scene-store";

const CONFIG = {
  bloom: { luminanceThreshold: 0.85, intensity: 0.6, luminanceSmoothing: 0.1 },
  noise: 0.03,
  vignette: { offset: 0.3, darkness: 0.7 },
};

/** Shared post stack. Bloom is "selective" by threshold: only copper/emissive values exceed 0.85. */
export function Post() {
  const quality = useSceneStore((s) => s.quality);
  if (quality >= 2) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          luminanceThreshold={CONFIG.bloom.luminanceThreshold}
          luminanceSmoothing={CONFIG.bloom.luminanceSmoothing}
          intensity={CONFIG.bloom.intensity}
        />
        <Noise premultiply opacity={CONFIG.noise} blendFunction={BlendFunction.ADD} />
        <Vignette offset={CONFIG.vignette.offset} darkness={CONFIG.vignette.darkness} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Noise premultiply opacity={CONFIG.noise} blendFunction={BlendFunction.ADD} />
      <Vignette offset={CONFIG.vignette.offset} darkness={CONFIG.vignette.darkness} />
    </EffectComposer>
  );
}
