export type RouletteResult = number | "00";

export type BetType = "RED" | "BLACK" | "ODD" | "EVEN";

export type RoundPhase =
  | "BETTING"
  | "LOCKING"
  | "WAITING"
  | "CONFIRMING"
  | "REORG_DETECTED"
  | "SPINNING"
  | "RESULT"
  | "MISSED";

export type RoundMode = "BLOCKCHAIN" | "DEMO";

export type HistoryEntry = {
  demoDraw?: number;
  result: RouletteResult;
  resultColor: "RED" | "BLACK" | "GREEN";
  bet: BetType;
  amount: number;
  outcome: "WIN" | "LOSS";
  blockHeight: number | null;
  blockHash: string | null;
  timestamp: number;
  mode: RoundMode;
};

export type StoredState = {
  version: 4;
  demoMode: boolean;
  roundPhase: RoundPhase;
  betAmount: string;
  balance: number;
  targetBlockHeight: number | null;
  roundBlockHash: string | null;
  roundVerifiedPocket: RouletteResult | null;
  roundBet: BetType | null;
  roundWager: number | null;
  selectedBet: BetType | null;
  result: RouletteResult | null;
  outcome: "WIN" | "LOSS" | null;
  history: HistoryEntry[];
  bettingEndsAt: number | null;
  waitingStartedAt: number | null;
  resultEndsAt: number | null;
  roundSettled: boolean;
  confirmationDepth: number;
  sourceTipHeight: number | null;
  pollAttempts: number;
  sourceErrors: number;
  reorgCount: number;
  blockFoundAt: number | null;
};

const betTypes = new Set<BetType>(["RED", "BLACK", "ODD", "EVEN"]);
const roundPhases = new Set<RoundPhase>([
  "BETTING",
  "LOCKING",
  "WAITING",
  "CONFIRMING",
  "REORG_DETECTED",
  "SPINNING",
  "RESULT",
  "MISSED",
]);
const resultColors = new Set(["RED", "BLACK", "GREEN"]);
const outcomes = new Set(["WIN", "LOSS"]);
const roundModes = new Set<RoundMode>(["BLOCKCHAIN", "DEMO"]);
const blockHashPattern = /^[0-9a-f]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isBlockHash(value: unknown): value is string {
  return typeof value === "string" && blockHashPattern.test(value);
}

function isNullableBlockHash(value: unknown): value is string | null {
  return value === null || isBlockHash(value);
}

function isRouletteResult(value: unknown): value is RouletteResult {
  return value === "00" || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 36);
}

function isNullableRouletteResult(value: unknown): value is RouletteResult | null {
  return value === null || isRouletteResult(value);
}

function isBetType(value: unknown): value is BetType {
  return typeof value === "string" && betTypes.has(value as BetType);
}

function isNullableBetType(value: unknown): value is BetType | null {
  return value === null || isBetType(value);
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!isRecord(value)) {
    return false;
  }

  const validCommonFields =
    isRouletteResult(value.result) &&
    typeof value.resultColor === "string" &&
    resultColors.has(value.resultColor) &&
    isBetType(value.bet) &&
    isFiniteNumber(value.amount, 1) &&
    typeof value.outcome === "string" &&
    outcomes.has(value.outcome) &&
    isFiniteNumber(value.timestamp) &&
    typeof value.mode === "string" &&
    roundModes.has(value.mode as RoundMode);

  if (!validCommonFields) {
    return false;
  }

  if (value.mode === "DEMO") {
    return value.blockHeight === null && value.blockHash === null &&
      (value.demoDraw === undefined ||
        (isFiniteNumber(value.demoDraw) && value.demoDraw < 1));
  }

  return isNonNegativeInteger(value.blockHeight) && isBlockHash(value.blockHash);
}

function isStoredState(value: unknown): value is StoredState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 4 &&
    typeof value.demoMode === "boolean" &&
    typeof value.roundPhase === "string" &&
    roundPhases.has(value.roundPhase as RoundPhase) &&
    typeof value.betAmount === "string" &&
    value.betAmount.length <= 64 &&
    isFiniteNumber(value.balance) &&
    isNullableInteger(value.targetBlockHeight) &&
    isNullableBlockHash(value.roundBlockHash) &&
    isNullableRouletteResult(value.roundVerifiedPocket) &&
    isNullableBetType(value.roundBet) &&
    (value.roundWager === null || isFiniteNumber(value.roundWager, 1)) &&
    isNullableBetType(value.selectedBet) &&
    isNullableRouletteResult(value.result) &&
    (value.outcome === null || (typeof value.outcome === "string" && outcomes.has(value.outcome))) &&
    Array.isArray(value.history) &&
    value.history.every(isHistoryEntry) &&
    isNullableTimestamp(value.bettingEndsAt) &&
    isNullableTimestamp(value.waitingStartedAt) &&
    isNullableTimestamp(value.resultEndsAt) &&
    typeof value.roundSettled === "boolean" &&
    isNonNegativeInteger(value.confirmationDepth) &&
    isNullableInteger(value.sourceTipHeight) &&
    isNonNegativeInteger(value.pollAttempts) &&
    isNonNegativeInteger(value.sourceErrors) &&
    isNonNegativeInteger(value.reorgCount) &&
    isNullableTimestamp(value.blockFoundAt)
  );
}

export function parseStoredState(raw: string): StoredState | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isStoredState(value) ? value : null;
  } catch {
    return null;
  }
}
