import { describe, expect, it } from "vitest";

import { parseStoredState, type StoredState } from "./rouletteState";

const validState: StoredState = {
  version: 4,
  demoMode: false,
  roundPhase: "BETTING",
  betAmount: "1",
  balance: 100,
  targetBlockHeight: null,
  roundBlockHash: null,
  roundVerifiedPocket: null,
  roundBet: null,
  roundWager: null,
  selectedBet: null,
  result: null,
  outcome: null,
  history: [],
  bettingEndsAt: 1_800_000_000_000,
  waitingStartedAt: null,
  resultEndsAt: null,
  roundSettled: false,
  confirmationDepth: 0,
  sourceTipHeight: null,
  pollAttempts: 0,
  sourceErrors: 0,
  reorgCount: 0,
  blockFoundAt: null,
};

describe("parseStoredState", () => {
  it("accepts a complete valid state", () => {
    expect(parseStoredState(JSON.stringify(validState))).toEqual(validState);
  });

  it.each([
    "not json",
    JSON.stringify({ ...validState, version: 3 }),
    JSON.stringify({ ...validState, balance: -1 }),
    JSON.stringify({ ...validState, roundPhase: "UNKNOWN" }),
    JSON.stringify({ ...validState, roundBlockHash: "abc" }),
    JSON.stringify({
      ...validState,
      history: [{ result: 1, resultColor: "INVALID" }],
    }),
  ])("rejects malformed or unsafe state", (raw) => {
    expect(parseStoredState(raw)).toBeNull();
  });
});
