import { create } from "zustand";

export type SceneName =
  | "AgentField" | "VolumeBreak" | "Convergence" | "ExplodedStack" | "AgentLoop" | "Turbine"
  | "AnomalyStream" | "Ledger" | "ArenaGraph" | "HeartbeatRing" | "FlywheelScene" | "SplitWorld" | "CasinoWheel";

export const SCENE_NAMES: SceneName[] = [
  "AgentField", "VolumeBreak", "Convergence", "ExplodedStack", "AgentLoop", "Turbine",
  "AnomalyStream", "Ledger", "ArenaGraph", "HeartbeatRing", "FlywheelScene", "SplitWorld", "CasinoWheel",
];

export type SceneVariant = "full" | "calm";
export type Quality = 0 | 1 | 2;

interface SceneState {
  activeScene: SceneName;
  nextScene: SceneName | null;
  /** 0-1 progress within the active [data-scene] band */
  progress: number;
  /** Variant requested by the active band (data-scene-variant="calm") */
  variant: SceneVariant;
  /** Normalised pointer, -1..1 */
  pointer: { x: number; y: number };
  /** Smoothed scroll velocity (signed) */
  scrollVelocity: number;
  quality: Quality;
  reducedMotion: boolean;
  /** Interaction channel between HTML overlays and scenes, e.g. { hoveredCard: 1 }, { preset: "poker" }, { droppedNode: 3 } */
  interaction: Record<string, unknown>;
  setActive: (scene: SceneName, variant?: SceneVariant) => void;
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  setScrollVelocity: (v: number) => void;
  setQuality: (q: Quality) => void;
  setReducedMotion: (r: boolean) => void;
  setInteraction: (patch: Record<string, unknown>) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  activeScene: "CasinoWheel",
  nextScene: null,
  progress: 0,
  variant: "full",
  pointer: { x: 0, y: 0 },
  scrollVelocity: 0,
  quality: 2,
  reducedMotion: false,
  interaction: {},
  setActive: (scene, variant = "full") => set({ activeScene: scene, variant, nextScene: null }),
  setProgress: (progress) => set({ progress }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setScrollVelocity: (scrollVelocity) => set({ scrollVelocity }),
  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setInteraction: (patch) => set((s) => ({ interaction: { ...s.interaction, ...patch } })),
}));
