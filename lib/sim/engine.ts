/**
 * Seeded network simulator. Safe to import on the server: no timers, no DOM
 * access and no randomness are touched until start() is called in a browser.
 */
import seedConfig from "./seed.json";
import { createRng, type Rng } from "./prng";
import type {
  AnomalyRule,
  GameType,
  NetworkSnapshot,
  Severity,
  SimEvent,
  SimEventKind,
  SimEventOf,
  SimFeed,
} from "./types";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export interface SimConfig {
  seed: number;
  tickMs: number;
  baseline: Omit<NetworkSnapshot, "ts">;
  drift: { activeAgents: number; roundsPerSec: number; medianDecisionMs: number };
  gameMix: Record<GameType, number>;
  anomalyRatePerMin: number;
  severityMix: Record<Severity, number>;
  blockIntervalMs: number;
  regions: string[];
}

export const SIM_CONFIG: SimConfig = seedConfig as SimConfig;

const OU_THETA = 0.05;
/** Drift for metrics not listed in seed.json drift. */
const HOLD_PCT_DRIFT = 0.008;
/** Seasonality on roundsPerSec: ±18%, peak at 21:00 UTC. */
const SEASON_AMPLITUDE = 0.18;
const SEASON_PEAK_HOUR_UTC = 21;
/** Visible round.settled rate band (events per second). */
const ROUNDS_VISIBLE_MIN = 6;
const ROUNDS_VISIBLE_MAX = 12;
/** match.event rate band (events per second). */
const MATCH_RATE_MIN = 2;
const MATCH_RATE_MAX = 4;
const BLOCK_START_HEIGHT = 4_812_300;
const STAKE_MIN = 5;
const STAKE_MAX = 500;

export const HOUSE_EDGE: Record<GameType, number> = {
  poker: 0.05,
  blackjack: 0.005,
  roulette: 0.027,
  baccarat: 0.0106,
  dice: 0.01,
};

export const ANOMALY_RULES: readonly AnomalyRule[] = [
  "Unusual betting pattern",
  "Multiple login attempts",
  "Collusion signal",
  "Velocity spike",
  "Wallet mismatch",
  "Bot fingerprint drift",
];

const SCORE_BANDS: Record<Severity, [number, number]> = {
  low: [0.55, 0.74],
  med: [0.7, 0.88],
  high: [0.85, 0.99],
};

export const MATCH_AGENTS = ["agt_01", "agt_02", "agt_03", "agt_04", "agt_05"] as const;

const SIM_EVENT_KINDS: readonly SimEventKind[] = [
  "round.settled",
  "anomaly.detected",
  "block.confirmed",
  "match.event",
];

/** Fixed timestamp for the SSR/initial snapshot so hydration matches. 2026-10-27 21:00:00 UTC. */
export const BASELINE_TS = Date.UTC(2026, 9, 27, 21, 0, 0);

/** Deterministic snapshot used on the server and for the first client render. */
export const BASELINE_SNAPSHOT: NetworkSnapshot = Object.freeze({
  ts: BASELINE_TS,
  ...SIM_CONFIG.baseline,
});

/* ------------------------------------------------------------------ */
/* Shared emitter                                                      */
/* ------------------------------------------------------------------ */

type AnyListener = (e: SimEvent) => void;

function createEmitter() {
  const listeners = new Map<SimEventKind, Set<AnyListener>>();
  const snapshotListeners = new Set<(s: NetworkSnapshot) => void>();

  return {
    subscribe<K extends SimEventKind>(kind: K, fn: (e: SimEventOf<K>) => void): () => void {
      let set = listeners.get(kind);
      if (!set) {
        set = new Set();
        listeners.set(kind, set);
      }
      const l = fn as unknown as AnyListener;
      set.add(l);
      return () => {
        set.delete(l);
      };
    },
    onSnapshot(fn: (s: NetworkSnapshot) => void): () => void {
      snapshotListeners.add(fn);
      return () => {
        snapshotListeners.delete(fn);
      };
    },
    emit(e: SimEvent) {
      const set = listeners.get(e.kind);
      if (!set) return;
      for (const fn of Array.from(set)) {
        try {
          fn(e);
        } catch (err) {
          console.error("[sim] listener error", err);
        }
      }
    },
    emitSnapshot(s: NetworkSnapshot) {
      for (const fn of Array.from(snapshotListeners)) {
        try {
          fn(s);
        } catch (err) {
          console.error("[sim] snapshot listener error", err);
        }
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Local seeded engine                                                 */
/* ------------------------------------------------------------------ */

function seasonFactor(ts: number): number {
  const d = new Date(ts);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  return 1 + SEASON_AMPLITUDE * Math.cos((2 * Math.PI * (hour - SEASON_PEAK_HOUR_UTC)) / 24);
}

function isHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

interface EngineState {
  rng: Rng;
  /** Continuous (unrounded) metric values. */
  activeAgents: number;
  roundsPerSec: number;
  medianDecisionMs: number;
  holdPct: number;
  settlements24h: number;
  anomaliesFlagged24h: number;
  ggr24hUsd: number;
  blockHeight: number;
  /** ms elapsed since the last block within simulated time. */
  blockClock: number;
  matchId: string;
  matchGame: "poker" | "blackjack";
  matchEventsLeft: number;
}

function initialState(seed: number): EngineState {
  const b = SIM_CONFIG.baseline;
  return {
    rng: createRng(seed),
    activeAgents: b.activeAgents,
    roundsPerSec: b.roundsPerSec,
    medianDecisionMs: b.medianDecisionMs,
    holdPct: b.holdPct,
    settlements24h: b.settlements24h,
    anomaliesFlagged24h: b.anomaliesFlagged24h,
    ggr24hUsd: b.ggr24hUsd,
    blockHeight: BLOCK_START_HEIGHT,
    blockClock: 0,
    matchId: "",
    matchGame: "poker",
    matchEventsLeft: 0,
  };
}

/** One OU step: x += theta (mu - x) + sigma * mu * N(0,1). */
function ou(rng: Rng, x: number, mu: number, sigma: number): number {
  return x + OU_THETA * (mu - x) + sigma * mu * rng.gaussian();
}

/** Create an independent local simulator. `sim` is the shared singleton. */
export function createLocalSim(seed: number = SIM_CONFIG.seed): SimFeed {
  const cfg = SIM_CONFIG;
  const emitter = createEmitter();
  let state = initialState(seed);
  let snapshot: NetworkSnapshot = BASELINE_SNAPSHOT;
  let refCount = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  const pending = new Set<ReturnType<typeof setTimeout>>();

  function schedule(offsetMs: number, e: SimEvent) {
    const id = setTimeout(() => {
      pending.delete(id);
      emitter.emit(e);
    }, offsetMs);
    pending.add(id);
  }

  function makeRound(): SimEventOf<"round.settled"> {
    const { rng } = state;
    const game = rng.pickWeighted(cfg.gameMix);
    const stake = rng.logUniform(STAKE_MIN, STAKE_MAX);
    const edge = HOUSE_EDGE[game];
    // Even-money outcome with win probability chosen so E[payout] = stake * (1 - edge).
    const win = rng.next() < (1 - edge) / 2;
    const stakeUsd = Math.round(stake * 100) / 100;
    const payoutUsd = win ? Math.round(stakeUsd * 2 * 100) / 100 : 0;
    const seats = game === "poker" ? rng.int(2, 6) : game === "baccarat" ? rng.int(1, 3) : rng.int(1, 2);
    const agentIds: string[] = [];
    for (let i = 0; i < seats; i++) agentIds.push("agt_" + rng.hex(3));
    const ms = Math.max(4, Math.round(state.medianDecisionMs * Math.exp(0.35 * rng.gaussian())));
    return { kind: "round.settled", id: "rnd_" + rng.hex(8), game, stakeUsd, payoutUsd, agentIds, ms };
  }

  function makeAnomaly(): SimEventOf<"anomaly.detected"> {
    const { rng } = state;
    const severity = rng.pickWeighted(cfg.severityMix);
    const [lo, hi] = SCORE_BANDS[severity];
    const score = Math.round(rng.uniform(lo, hi) * 100) / 100;
    return {
      kind: "anomaly.detected",
      id: "anm_" + rng.hex(6),
      severity,
      rule: rng.pick(ANOMALY_RULES),
      agentId: "agt_" + rng.hex(3),
      score,
    };
  }

  function makeBlock(): SimEventOf<"block.confirmed"> {
    const { rng } = state;
    state.blockHeight += 1;
    return { kind: "block.confirmed", height: state.blockHeight, hash: rng.hex(64), txCount: rng.int(40, 400) };
  }

  function makeMatchEvent(): SimEventOf<"match.event"> {
    const { rng } = state;
    if (state.matchEventsLeft <= 0) {
      state.matchId = "mt_" + rng.hex(4);
      state.matchGame = rng.next() < 0.6 ? "poker" : "blackjack";
      state.matchEventsLeft = rng.int(12, 36);
    }
    state.matchEventsLeft -= 1;
    const fromIdx = rng.int(0, MATCH_AGENTS.length - 1);
    let toIdx = rng.int(0, MATCH_AGENTS.length - 2);
    if (toIdx >= fromIdx) toIdx += 1;
    const action =
      state.matchGame === "poker"
        ? rng.pickWeighted({ raise: 0.3, call: 0.45, fold: 0.25 })
        : rng.pickWeighted({ hit: 0.55, stand: 0.45 });
    return { kind: "match.event", matchId: state.matchId, from: MATCH_AGENTS[fromIdx], to: MATCH_AGENTS[toIdx], action };
  }

  function tick() {
    if (isHidden()) return;
    const { rng } = state;
    const b = cfg.baseline;
    const dt = cfg.tickMs / 1000;
    const now = Date.now();
    const season = seasonFactor(now);

    // 1-3. OU mean reversion for continuous metrics.
    state.activeAgents = ou(rng, state.activeAgents, b.activeAgents, cfg.drift.activeAgents);
    state.roundsPerSec = ou(rng, state.roundsPerSec, b.roundsPerSec * season, cfg.drift.roundsPerSec);
    state.medianDecisionMs = ou(rng, state.medianDecisionMs, b.medianDecisionMs, cfg.drift.medianDecisionMs);
    state.holdPct = ou(rng, state.holdPct, b.holdPct, HOLD_PCT_DRIFT);
    state.medianDecisionMs = Math.max(8, state.medianDecisionMs);

    // Sub-tick events with deterministic offsets in [0, tickMs).
    const batch: { at: number; e: SimEvent }[] = [];

    // 4. round.settled, visible rate 6-12/s scaled by network load.
    const load = state.roundsPerSec / b.roundsPerSec;
    const visibleRate = Math.min(ROUNDS_VISIBLE_MAX, Math.max(ROUNDS_VISIBLE_MIN, 9 * load));
    const nRounds = rng.poisson(visibleRate * dt);
    for (let i = 0; i < nRounds; i++) batch.push({ at: rng.uniform(0, cfg.tickMs), e: makeRound() });

    // 5. anomaly.detected as a Poisson process.
    const nAnomalies = rng.poisson((cfg.anomalyRatePerMin / 60) * dt);
    for (let i = 0; i < nAnomalies; i++) batch.push({ at: rng.uniform(0, cfg.tickMs), e: makeAnomaly() });

    // 6. block.confirmed on a fixed interval.
    let blockAt = cfg.blockIntervalMs - state.blockClock;
    while (blockAt < cfg.tickMs) {
      batch.push({ at: Math.max(0, blockAt), e: makeBlock() });
      blockAt += cfg.blockIntervalMs;
    }
    state.blockClock = (state.blockClock + cfg.tickMs) % cfg.blockIntervalMs;

    // 7. match.event, 2-4/s.
    const nMatch = rng.poisson(rng.uniform(MATCH_RATE_MIN, MATCH_RATE_MAX) * dt);
    for (let i = 0; i < nMatch; i++) batch.push({ at: rng.uniform(0, cfg.tickMs), e: makeMatchEvent() });

    // Counters grow plausibly with activity.
    const settlementRate = (b.settlements24h / 86_400) * load; // ~154/s at baseline
    state.settlements24h += rng.poisson(settlementRate * dt);
    state.anomaliesFlagged24h += nAnomalies;
    const ggrRate = (b.ggr24hUsd / 86_400) * load * (state.holdPct / b.holdPct);
    state.ggr24hUsd += Math.max(0, ggrRate * dt * (1 + 0.5 * rng.gaussian()));

    snapshot = {
      ts: now,
      activeAgents: Math.round(state.activeAgents),
      roundsPerSec: Math.round(state.roundsPerSec),
      settlements24h: Math.round(state.settlements24h),
      anomaliesFlagged24h: state.anomaliesFlagged24h,
      medianDecisionMs: Math.round(state.medianDecisionMs * 10) / 10,
      ggr24hUsd: Math.round(state.ggr24hUsd),
      holdPct: Math.round(state.holdPct * 100) / 100,
    };
    emitter.emitSnapshot(snapshot);

    batch.sort((a, b2) => a.at - b2.at);
    for (const { at, e } of batch) {
      if (at < 1) emitter.emit(e);
      else schedule(Math.round(at), e);
    }
  }

  return {
    start() {
      refCount += 1;
      if (interval !== null || typeof window === "undefined") return;
      interval = setInterval(tick, cfg.tickMs);
      tick();
    },
    stop() {
      refCount = Math.max(0, refCount - 1);
      if (refCount > 0) return;
      if (interval !== null) clearInterval(interval);
      interval = null;
      for (const id of pending) clearTimeout(id);
      pending.clear();
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe: emitter.subscribe,
    onSnapshot: emitter.onSnapshot,
  };
}

/* ------------------------------------------------------------------ */
/* WebSocket-backed feed (same interface)                              */
/* ------------------------------------------------------------------ */

/**
 * Accepted message shapes:
 *  { "type": "snapshot", "data": NetworkSnapshot }
 *  { "type": "event", "data": SimEvent }
 *  a bare SimEvent ({ "kind": ... })
 */
export function createWsFeed(url: string): SimFeed {
  const emitter = createEmitter();
  let snapshot: NetworkSnapshot = BASELINE_SNAPSHOT;
  let refCount = 0;
  let ws: WebSocket | null = null;
  let retry = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  function handle(raw: unknown) {
    if (!raw || typeof raw !== "object") return;
    const msg = raw as { type?: string; data?: unknown; kind?: string };
    if (msg.type === "snapshot" && msg.data && typeof msg.data === "object") {
      snapshot = { ...BASELINE_SNAPSHOT, ...(msg.data as Partial<NetworkSnapshot>) };
      emitter.emitSnapshot(snapshot);
      return;
    }
    const ev = (msg.type === "event" ? msg.data : msg) as SimEvent | undefined;
    if (ev && typeof ev === "object" && SIM_EVENT_KINDS.includes(ev.kind)) {
      if (isHidden()) return;
      emitter.emit(ev);
    }
  }

  function connect() {
    if (!active || typeof WebSocket === "undefined") return;
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      retry = 0;
    };
    ws.onmessage = (m) => {
      try {
        handle(JSON.parse(typeof m.data === "string" ? m.data : ""));
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      ws = null;
      scheduleReconnect();
    };
    ws.onerror = () => {
      ws?.close();
    };
  }

  function scheduleReconnect() {
    if (!active || retryTimer !== null) return;
    const delay = Math.min(30_000, 500 * 2 ** retry++);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  }

  return {
    start() {
      refCount += 1;
      if (active || typeof window === "undefined") return;
      active = true;
      connect();
    },
    stop() {
      refCount = Math.max(0, refCount - 1);
      if (refCount > 0) return;
      active = false;
      if (retryTimer !== null) clearTimeout(retryTimer);
      retryTimer = null;
      if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
      }
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe: emitter.subscribe,
    onSnapshot: emitter.onSnapshot,
  };
}

/* ------------------------------------------------------------------ */
/* Factory + singleton                                                 */
/* ------------------------------------------------------------------ */

/** WebSocket feed when NEXT_PUBLIC_FEED_URL is set, otherwise the local seeded engine. */
export function createFeed(): SimFeed {
  const url = process.env.NEXT_PUBLIC_FEED_URL;
  return url ? createWsFeed(url) : createLocalSim(SIM_CONFIG.seed);
}

/** Shared feed singleton. Creating it has no side effects; timers start on start(). */
export const sim: SimFeed = createFeed();

export { SIM_EVENT_KINDS };
