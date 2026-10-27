"use client";
import { Component, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import type { SceneName } from "@/lib/scene-store";
import { AgentField } from "./AgentField";
import { VolumeBreak } from "./VolumeBreak";
import { Convergence } from "./Convergence";
import { ExplodedStack } from "./ExplodedStack";
import { AgentLoop } from "./AgentLoop";
import { Turbine } from "./Turbine";
import { AnomalyStream } from "./AnomalyStream";
import { Ledger } from "./Ledger";
import { ArenaGraph } from "./ArenaGraph";
import { HeartbeatRing } from "./HeartbeatRing";
import { FlywheelScene } from "./FlywheelScene";
import { SplitWorld } from "./SplitWorld";
import { CasinoWheel } from "./CasinoWheel";

const SCENES: Record<SceneName, ComponentType> = {
  AgentField,
  VolumeBreak,
  Convergence,
  ExplodedStack,
  AgentLoop,
  Turbine,
  AnomalyStream,
  Ledger,
  ArenaGraph,
  HeartbeatRing,
  FlywheelScene,
  SplitWorld,
  CasinoWheel,
};

interface BoundaryProps {
  name: string;
  children: ReactNode;
}

/** Isolates each scene: a crashing scene renders nothing instead of taking down the canvas. */
class SceneBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[scene:${this.props.name}] crashed`, error, info.componentStack);
    }
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Mounts all 13 scenes once; each fades itself via useSceneFade. */
export function SceneRegistry() {
  return (
    <>
      {(Object.keys(SCENES) as SceneName[]).map((name) => {
        const Scene = SCENES[name];
        return (
          <SceneBoundary key={name} name={name}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </SceneBoundary>
        );
      })}
    </>
  );
}
