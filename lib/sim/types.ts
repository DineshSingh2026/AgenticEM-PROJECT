export type GameType = "poker" | "blackjack" | "roulette" | "baccarat" | "dice";

export interface NetworkSnapshot {
  ts: number;
  activeAgents: number;
  roundsPerSec: number;
  settlements24h: number;
  anomaliesFlagged24h: number;
  medianDecisionMs: number;
  ggr24hUsd: number;
  holdPct: number;
}

export type AnomalyRule =
  | "Unusual betting pattern"
  | "Multiple login attempts"
  | "Collusion signal"
  | "Velocity spike"
  | "Wallet mismatch"
  | "Bot fingerprint drift";

export type Severity = "low" | "med" | "high";

export type SimEvent =
  | { kind: "round.settled"; id: string; game: GameType; stakeUsd: number; payoutUsd: number; agentIds: string[]; ms: number }
  | { kind: "anomaly.detected"; id: string; severity: Severity; rule: AnomalyRule; agentId: string; score: number }
  | { kind: "block.confirmed"; height: number; hash: string; txCount: number }
  | { kind: "match.event"; matchId: string; from: string; to: string; action: "raise" | "call" | "fold" | "hit" | "stand" };

export type SimEventKind = SimEvent["kind"];
export type SimEventOf<K extends SimEventKind> = Extract<SimEvent, { kind: K }>;

/** Shared interface implemented by the local seeded engine and (later) a WebSocket client. */
export interface SimFeed {
  start(): void;
  stop(): void;
  getSnapshot(): NetworkSnapshot;
  subscribe<K extends SimEventKind>(kind: K, fn: (e: SimEventOf<K>) => void): () => void;
  /** Called on every tick with the latest snapshot. */
  onSnapshot(fn: (s: NetworkSnapshot) => void): () => void;
}
