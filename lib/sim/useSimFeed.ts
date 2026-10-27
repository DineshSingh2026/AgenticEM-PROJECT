"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BASELINE_SNAPSHOT, SIM_EVENT_KINDS, sim } from "./engine";
import type { NetworkSnapshot, SimEvent, SimEventKind, SimEventOf } from "./types";

/** Ref-counted start/stop of the shared feed for the lifetime of the calling component. */
function useSimRunning(): void {
  useEffect(() => {
    sim.start();
    return () => sim.stop();
  }, []);
}

const getServerSnapshot = (): NetworkSnapshot => BASELINE_SNAPSHOT;

/**
 * Latest network snapshot; re-renders every tick (250 ms).
 * Server and hydration render use the fixed baseline snapshot so markup matches.
 */
export function useSimSnapshot(): NetworkSnapshot {
  useSimRunning();
  const subscribe = useCallback((onChange: () => void) => sim.onSnapshot(onChange), []);
  const getSnapshot = useCallback(() => sim.getSnapshot(), []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Newest-first rolling list of the last `max` events of `kind`. Empty on the server. */
export function useSimEvents<K extends SimEventKind>(kind: K, max = 8): SimEventOf<K>[] {
  useSimRunning();
  const [events, setEvents] = useState<SimEventOf<K>[]>([]);
  useEffect(() => {
    setEvents([]);
    return sim.subscribe(kind, (e) => {
      setEvents((prev) => {
        const next = [e, ...prev];
        if (next.length > max) next.length = max;
        return next;
      });
    });
  }, [kind, max]);
  return events;
}

/**
 * Subscribe a callback to events of `kind` (or every kind when `kind` is undefined).
 * The callback is held in a ref, so passing an inline function does not resubscribe.
 */
export function useSimFeed<K extends SimEventKind>(kind: K, fn: (e: SimEventOf<K>) => void): void;
export function useSimFeed(kind: undefined, fn: (e: SimEvent) => void): void;
export function useSimFeed(kind: SimEventKind | undefined, fn: (e: SimEvent) => void): void {
  useSimRunning();
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    const handler = (e: SimEvent) => fnRef.current(e);
    const kinds = kind ? [kind] : SIM_EVENT_KINDS;
    const offs = kinds.map((k) => sim.subscribe(k, handler as (e: SimEventOf<typeof k>) => void));
    return () => offs.forEach((off) => off());
  }, [kind]);
}
