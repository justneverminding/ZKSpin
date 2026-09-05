"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import RouletteWheel from "../components/RouletteWheel";
import { verifyBlockHash } from "../lib/rouletteVerifier";

type RouletteResult = number | "00";

type BetType =
  | "RED"
  | "BLACK"
  | "ODD"
  | "EVEN";

type RoundPhase =
  | "BETTING"
  | "LOCKING"
  | "WAITING"
  | "CONFIRMING"
  | "REORG_DETECTED"
  | "SPINNING"
  | "RESULT"
  | "MISSED";

type HistoryEntry = {
  result: RouletteResult;
  bet: BetType;
  amount: number;
  outcome: "WIN" | "LOSS";
};

type StoredState = {
  version: 2;

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

const BETTING_SECONDS = 30;

/*
  ZKSpin demo confirmation policy.

  IMPORTANT:

  This is BLOCK DEPTH.

  It is NOT:
  "CipherScan returned the same hash 3 times."

  Example:

  Target N
  Tip N     = depth 1
  Tip N + 1 = depth 2
  Tip N + 2 = depth 3
*/
const CONFIRMATIONS_REQUIRED = 3;

const POLL_INTERVAL_MS = 5000;

const STORAGE_KEY =
  "zkspin-demo-state-v2";

const wheelNumbers: RouletteResult[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17,
  5, 22, 34, 15, 3, 24, 36, 13, 1, "00",
  27, 10, 25, 29, 12, 8, 19, 31, 18, 6,
  21, 33, 16, 4, 23, 35, 14, 2,
];

const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getResultColor(
  result: RouletteResult
) {
  if (
    result === 0 ||
    result === "00"
  ) {
    return "GREEN";
  }

  if (
    typeof result === "number" &&
    redNumbers.has(result)
  ) {
    return "RED";
  }

  return "BLACK";
}

function didBetWin(
  bet: BetType,
  pocket: RouletteResult
) {
  const color =
    getResultColor(pocket);

  if (bet === "RED") {
    return color === "RED";
  }

  if (bet === "BLACK") {
    return color === "BLACK";
  }

  if (bet === "ODD") {
    return (
      typeof pocket === "number" &&
      pocket !== 0 &&
      pocket % 2 !== 0
    );
  }

  return (
    typeof pocket === "number" &&
    pocket !== 0 &&
    pocket % 2 === 0
  );
}

function formatTime(seconds: number) {
  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function Home() {
  const [hydrated, setHydrated] =
    useState(false);

  const [rotation, setRotation] =
    useState(0);

  const [roundPhase, setRoundPhase] =
    useState<RoundPhase>("BETTING");

  const [result, setResult] =
    useState<RouletteResult | null>(
      null
    );

  const [betAmount, setBetAmount] =
    useState("1");

  const [balance, setBalance] =
    useState(100);

  const [
    blockHeight,
    setBlockHeight,
  ] =
    useState<number | null>(null);

  const [
    testnetConnected,
    setTestnetConnected,
  ] =
    useState(false);

  const [
    bestBlockHash,
    setBestBlockHash,
  ] =
    useState<string | null>(null);

  /*
    LOCKED ROUND DATA
  */

  const [
    targetBlockHeight,
    setTargetBlockHeight,
  ] =
    useState<number | null>(null);

  /*
    This starts as the candidate hash.

    Once depth reaches 3/3, this becomes
    the verified hash used by the verifier.
  */
  const [
    roundBlockHash,
    setRoundBlockHash,
  ] =
    useState<string | null>(null);

  const [
    roundVerifiedPocket,
    setRoundVerifiedPocket,
  ] =
    useState<RouletteResult | null>(
      null
    );

  const [
    roundBet,
    setRoundBet,
  ] =
    useState<BetType | null>(null);

  const [
    roundWager,
    setRoundWager,
  ] =
    useState<number | null>(null);

  const [
    selectedBet,
    setSelectedBet,
  ] =
    useState<BetType | null>(null);

  const [
    outcome,
    setOutcome,
  ] =
    useState<"WIN" | "LOSS" | null>(
      null
    );

  /*
    TIMERS
  */

  const [
    bettingTimeLeft,
    setBettingTimeLeft,
  ] =
    useState(BETTING_SECONDS);

  const [
    waitingSeconds,
    setWaitingSeconds,
  ] =
    useState(0);

  const [
    bettingEndsAt,
    setBettingEndsAt,
  ] =
    useState<number | null>(null);

  const [
    waitingStartedAt,
    setWaitingStartedAt,
  ] =
    useState<number | null>(null);

  const [
    resultEndsAt,
    setResultEndsAt,
  ] =
    useState<number | null>(null);

  /*
    CONFIRMATION / DIAGNOSTICS
  */

  const [
    confirmationDepth,
    setConfirmationDepth,
  ] =
    useState(0);

  const [
    sourceTipHeight,
    setSourceTipHeight,
  ] =
    useState<number | null>(null);

  const [
    pollAttempts,
    setPollAttempts,
  ] =
    useState(0);

  const [
    sourceErrors,
    setSourceErrors,
  ] =
    useState(0);

  const [
    reorgCount,
    setReorgCount,
  ] =
    useState(0);

  const [
    blockFoundAt,
    setBlockFoundAt,
  ] =
    useState<number | null>(null);

  const [
    roundSettled,
    setRoundSettled,
  ] =
    useState(false);

  const [history, setHistory] =
    useState<HistoryEntry[]>([]);

  /*
    Prevent duplicate async resolution
    and overlapping polls.
  */

  const resolvingBlockRef =
    useRef(false);

  const pollInFlightRef =
    useRef(false);

  const wagerAmount =
    Number(betAmount);

  const invalidBet =
    betAmount.trim() === "" ||
    !Number.isFinite(
      wagerAmount
    ) ||
    wagerAmount < 1 ||
    wagerAmount > balance;

  const bettingOpen =
    hydrated &&
    roundPhase === "BETTING" &&
    bettingTimeLeft > 0;

  const spinning =
    roundPhase === "SPINNING";

  /*
    START NEW ROUND
  */

  const startNewRound =
    useCallback(() => {
      const deadline =
        Date.now() +
        BETTING_SECONDS * 1000;

      setRoundPhase(
        "BETTING"
      );

      setBettingEndsAt(
        deadline
      );

      setBettingTimeLeft(
        BETTING_SECONDS
      );

      setWaitingStartedAt(
        null
      );

      setWaitingSeconds(0);

      setResultEndsAt(null);

      setSelectedBet(null);

      setRoundBet(null);

      setRoundWager(null);

      setTargetBlockHeight(
        null
      );

      setRoundBlockHash(
        null
      );

      setRoundVerifiedPocket(
        null
      );

      setResult(null);

      setOutcome(null);

      setRoundSettled(false);

      /*
        Reset confirmation engine.
      */

      setConfirmationDepth(0);

      setSourceTipHeight(null);

      setPollAttempts(0);

      setSourceErrors(0);

      setReorgCount(0);

      setBlockFoundAt(null);

      resolvingBlockRef.current =
        false;

      pollInFlightRef.current =
        false;
    }, []);

  /*
    RESTORE SAVED BROWSER STATE
  */

  useEffect(() => {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      startNewRound();

      setHydrated(true);

      return;
    }

    try {
      const saved =
        JSON.parse(
          raw
        ) as Partial<StoredState>;

      const now =
        Date.now();

      if (
        saved.version !== 2
      ) {
        startNewRound();

        setHydrated(true);

        return;
      }

      if (
        typeof saved.betAmount ===
        "string"
      ) {
        setBetAmount(
          saved.betAmount
        );
      }

      if (
        typeof saved.balance ===
        "number"
      ) {
        setBalance(
          saved.balance
        );
      }

      if (
        Array.isArray(
          saved.history
        )
      ) {
        setHistory(
          saved.history
        );
      }

      setSelectedBet(
        saved.selectedBet ??
          null
      );

      setRoundBet(
        saved.roundBet ??
          null
      );

      setRoundWager(
        saved.roundWager ??
          null
      );

      setTargetBlockHeight(
        saved.targetBlockHeight ??
          null
      );

      setRoundBlockHash(
        saved.roundBlockHash ??
          null
      );

      setRoundVerifiedPocket(
        saved.roundVerifiedPocket ??
          null
      );

      setResult(
        saved.result ?? null
      );

      setOutcome(
        saved.outcome ?? null
      );

      setRoundSettled(
        saved.roundSettled ??
          false
      );

      setConfirmationDepth(
        saved.confirmationDepth ??
          0
      );

      setSourceTipHeight(
        saved.sourceTipHeight ??
          null
      );

      setPollAttempts(
        saved.pollAttempts ??
          0
      );

      setSourceErrors(
        saved.sourceErrors ??
          0
      );

      setReorgCount(
        saved.reorgCount ??
          0
      );

      setBlockFoundAt(
        saved.blockFoundAt ??
          null
      );

      /*
        RESTORE ACTIVE BLOCK ROUND.

        WAITING:
        target block hasn't appeared.

        CONFIRMING:
        target hash exists but needs depth.

        REORG_DETECTED:
        continue checking SAME target height.

        SPINNING:
        refresh means we re-check the same
        locked block instead of trusting
        an interrupted animation.
      */

      const activeBlockRound =
        saved.roundPhase ===
          "WAITING" ||
        saved.roundPhase ===
          "CONFIRMING" ||
        saved.roundPhase ===
          "REORG_DETECTED" ||
        saved.roundPhase ===
          "SPINNING";

      if (
        activeBlockRound &&
        typeof saved
          .targetBlockHeight ===
          "number" &&
        saved.roundBet &&
        typeof saved.roundWager ===
          "number"
      ) {
        const startedAt =
          saved.waitingStartedAt ??
          now;

        setWaitingStartedAt(
          startedAt
        );

        setWaitingSeconds(
          Math.max(
            0,
            Math.floor(
              (
                now -
                startedAt
              ) / 1000
            )
          )
        );

        setBettingEndsAt(
          null
        );

        /*
          If we already had a candidate hash,
          resume confirmation.

          Otherwise resume waiting.
        */

        if (
          saved.roundBlockHash
        ) {
          setRoundPhase(
            "CONFIRMING"
          );
        } else {
          setRoundPhase(
            "WAITING"
          );
        }

        setHydrated(true);

        return;
      }

      /*
        RESTORE RESULT DISPLAY
      */

      if (
        saved.roundPhase ===
          "RESULT" &&
        saved.roundSettled &&
        typeof saved
          .resultEndsAt ===
          "number" &&
        saved.resultEndsAt >
          now
      ) {
        setRoundPhase(
          "RESULT"
        );

        setResultEndsAt(
          saved.resultEndsAt
        );

        setBettingEndsAt(
          null
        );

        setHydrated(true);

        return;
      }

      /*
        RESTORE ACTIVE BETTING TIMER
      */

      if (
        saved.roundPhase ===
          "BETTING" &&
        typeof saved
          .bettingEndsAt ===
          "number" &&
        saved.bettingEndsAt >
          now
      ) {
        const secondsLeft =
          Math.max(
            0,
            Math.ceil(
              (
                saved
                  .bettingEndsAt -
                now
              ) / 1000
            )
          );

        setRoundPhase(
          "BETTING"
        );

        setBettingEndsAt(
          saved.bettingEndsAt
        );

        setBettingTimeLeft(
          secondsLeft
        );

        setHydrated(true);

        return;
      }

      /*
        Stored round is no longer usable.
      */

      startNewRound();

      setHydrated(true);
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY
      );

      startNewRound();

      setHydrated(true);
    }
  }, [startNewRound]);

  /*
    SAVE STATE
  */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const state: StoredState =
      {
        version: 2,

        roundPhase,

        betAmount,

        balance,

        targetBlockHeight,

        roundBlockHash,

        roundVerifiedPocket,

        roundBet,

        roundWager,

        selectedBet,

        result,

        outcome,

        history,

        bettingEndsAt,

        waitingStartedAt,

        resultEndsAt,

        roundSettled,

        confirmationDepth,

        sourceTipHeight,

        pollAttempts,

        sourceErrors,

        reorgCount,

        blockFoundAt,
      };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        state
      )
    );
  }, [
    hydrated,
    roundPhase,
    betAmount,
    balance,
    targetBlockHeight,
    roundBlockHash,
    roundVerifiedPocket,
    roundBet,
    roundWager,
    selectedBet,
    result,
    outcome,
    history,
    bettingEndsAt,
    waitingStartedAt,
    resultEndsAt,
    roundSettled,
    confirmationDepth,
    sourceTipHeight,
    pollAttempts,
    sourceErrors,
    reorgCount,
    blockFoundAt,
  ]);

  /*
    LOAD CURRENT ZCASH STATUS
  */

  useEffect(() => {
    async function loadZcashStatus() {
      try {
        const response =
          await fetch(
            "/api/zcash-status",
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        setBlockHeight(
          data.height
        );

        setBestBlockHash(
          data.bestBlockHash
        );

        setTestnetConnected(
          data.connected
        );
      } catch {
        setBlockHeight(
          null
        );

        setBestBlockHash(
          null
        );

        setTestnetConnected(
          false
        );
      }
    }

    loadZcashStatus();
  }, []);

  /*
    TIMESTAMP BETTING TIMER
  */

  useEffect(() => {
    if (
      !hydrated ||
      roundPhase !==
        "BETTING" ||
      bettingEndsAt ===
        null
    ) {
      return;
    }

    function updateTimer() {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (
              bettingEndsAt -
              Date.now()
            ) / 1000
          )
        );

      setBettingTimeLeft(
        remaining
      );
    }

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
        250
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    hydrated,
    roundPhase,
    bettingEndsAt,
  ]);

  /*
    MISSED ROUND
  */

  useEffect(() => {
    if (
      !hydrated ||
      roundPhase !==
        "BETTING" ||
      bettingTimeLeft !== 0
    ) {
      return;
    }

    setRoundPhase(
      "MISSED"
    );

    setBettingEndsAt(
      null
    );

    const timer =
      window.setTimeout(
        startNewRound,
        2000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    hydrated,
    roundPhase,
    bettingTimeLeft,
    startNewRound,
  ]);

  /*
    WAIT TIMER

    Runs both while waiting for the
    target block and while confirming it.
  */

  useEffect(() => {
    const active =
      roundPhase ===
        "WAITING" ||
      roundPhase ===
        "CONFIRMING" ||
      roundPhase ===
        "REORG_DETECTED";

    if (
      !active ||
      waitingStartedAt ===
        null
    ) {
      return;
    }

    function updateWait() {
      setWaitingSeconds(
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              waitingStartedAt
            ) / 1000
          )
        )
      );
    }

    updateWait();

    const timer =
      window.setInterval(
        updateWait,
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    roundPhase,
    waitingStartedAt,
  ]);

  /*
    END RESULT DISPLAY
  */

  useEffect(() => {
    if (
      roundPhase !==
        "RESULT" ||
      resultEndsAt ===
        null
    ) {
      return;
    }

    const remaining =
      resultEndsAt -
      Date.now();

    if (remaining <= 0) {
      startNewRound();

      return;
    }

    const timer =
      window.setTimeout(
        startNewRound,
        remaining
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    roundPhase,
    resultEndsAt,
    startNewRound,
  ]);

  /*
    BLOCK CONFIRMATION ENGINE

    This effect runs while:

    WAITING
    CONFIRMING
    REORG_DETECTED

    It always checks the SAME
    locked target height.
  */

  useEffect(() => {
    const active =
      roundPhase ===
        "WAITING" ||
      roundPhase ===
        "CONFIRMING" ||
      roundPhase ===
        "REORG_DETECTED";

    if (
      !active ||
      targetBlockHeight ===
        null
    ) {
      return;
    }

    async function checkRoundBlock() {
      if (
        pollInFlightRef.current ||
        resolvingBlockRef.current
      ) {
        return;
      }

      pollInFlightRef.current =
        true;

      setPollAttempts(
        (current) =>
          current + 1
      );

      try {
        /*
          1. GET TARGET BLOCK HASH

          Target height NEVER changes.
        */

        const blockResponse =
          await fetch(
            `/api/zcash-block/${targetBlockHeight}`,
            {
              cache:
                "no-store",
            }
          );

        const blockData =
          await blockResponse.json();

        /*
          2. GET CURRENT SOURCE TIP

          This is how confirmation depth
          is calculated.

          NOT by number of polls.
        */

        const statusResponse =
          await fetch(
            "/api/zcash-status",
            {
              cache:
                "no-store",
            }
          );

        const statusData =
          await statusResponse.json();

        if (
          !statusData.connected ||
          typeof statusData.height !==
            "number"
        ) {
          setSourceErrors(
            (current) =>
              current + 1
          );

          setTestnetConnected(
            false
          );

          return;
        }

        const tipHeight =
          statusData.height;

        setSourceTipHeight(
          tipHeight
        );

        setBlockHeight(
          tipHeight
        );

        setBestBlockHash(
          statusData.bestBlockHash ??
            null
        );

        setTestnetConnected(
          true
        );

        /*
          Target not available through
          CipherScan yet.

          This may mean:

          - target not mined yet
          - CipherScan is lagging

          With one source, we cannot
          distinguish perfectly.
        */

        if (
          !blockData.found ||
          !blockData.hash
        ) {
          setRoundPhase(
            "WAITING"
          );

          setConfirmationDepth(
            0
          );

          return;
        }

        const observedHash =
          String(
            blockData.hash
          ).toLowerCase();

        /*
          First time target block
          has been observed.
        */

        if (
          roundBlockHash ===
            null
        ) {
          setRoundBlockHash(
            observedHash
          );

          setBlockFoundAt(
            Date.now()
          );
        }

        /*
          REORG DETECTION

          SAME HEIGHT
          DIFFERENT HASH
        */

        if (
          roundBlockHash !==
            null &&
          observedHash !==
            roundBlockHash
        ) {
          setRoundBlockHash(
            observedHash
          );

          setRoundVerifiedPocket(
            null
          );

          setReorgCount(
            (current) =>
              current + 1
          );

          setRoundPhase(
            "REORG_DETECTED"
          );

          /*
            The depth is recalculated
            using the current canonical
            chain tip.

            We never switch to N+1.
          */

          const newDepth =
            Math.max(
              1,
              tipHeight -
                targetBlockHeight +
                1
            );

          setConfirmationDepth(
            newDepth
          );

          return;
        }

        /*
          ACTUAL BLOCK DEPTH

          Example:

          target = 100
          tip = 100 → 1

          target = 100
          tip = 101 → 2

          target = 100
          tip = 102 → 3
        */

        const depth =
          Math.max(
            1,
            tipHeight -
              targetBlockHeight +
              1
          );

        setConfirmationDepth(
          depth
        );

        /*
          NOT DEEP ENOUGH YET
        */

        if (
          depth <
          CONFIRMATIONS_REQUIRED
        ) {
          setRoundPhase(
            "CONFIRMING"
          );

          return;
        }

        /*
          VERIFIED.

          ONLY NOW does the
          roulette derivation run.
        */

        resolvingBlockRef.current =
          true;

        const pocket =
          await verifyBlockHash(
            observedHash
          );

        if (
          pocket === null
        ) {
          resolvingBlockRef.current =
            false;

          return;
        }

        setRoundBlockHash(
          observedHash
        );

        setRoundVerifiedPocket(
          pocket
        );

        const resultIndex =
          wheelNumbers.findIndex(
            (number) =>
              number === pocket
          );

        if (
          resultIndex === -1
        ) {
          resolvingBlockRef.current =
            false;

          return;
        }

        /*
          VERIFIED WHEEL SPIN
        */

        setRoundPhase(
          "SPINNING"
        );

        setResult(null);

        setOutcome(null);

        const segmentAngle =
          360 /
          wheelNumbers.length;

        setRotation(
          (current) => {
            const currentPosition =
              current % 360;

            const targetPosition =
              -(
                resultIndex *
                segmentAngle
              );

            const adjustment =
              targetPosition -
              currentPosition;

            return (
              current +
              1440 +
              adjustment
            );
          }
        );

        window.setTimeout(
          () => {
            if (
              roundBet ===
                null ||
              roundWager ===
                null
            ) {
              resolvingBlockRef.current =
                false;

              return;
            }

            const won =
              didBetWin(
                roundBet,
                pocket
              );

            setResult(
              pocket
            );

            setOutcome(
              won
                ? "WIN"
                : "LOSS"
            );

            /*
              TEST ZEC DEMO
              SETTLEMENT
            */

            if (
              !roundSettled
            ) {
              if (won) {
                setBalance(
                  (current) =>
                    current +
                    roundWager *
                      2
                );
              }

              setHistory(
                (current) => [
                  {
                    result:
                      pocket,

                    bet:
                      roundBet,

                    amount:
                      roundWager,

                    outcome:
                      won
                        ? "WIN"
                        : "LOSS",
                  },

                  ...current,
                ]
              );

              setRoundSettled(
                true
              );
            }

            const endsAt =
              Date.now() +
              3000;

            setResultEndsAt(
              endsAt
            );

            setRoundPhase(
              "RESULT"
            );

            resolvingBlockRef.current =
              false;
          },
          3000
        );
      } catch {
        setSourceErrors(
          (current) =>
            current + 1
        );
      } finally {
        pollInFlightRef.current =
          false;
      }
    }

    checkRoundBlock();

    const interval =
      window.setInterval(
        checkRoundBlock,
        POLL_INTERVAL_MS
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    roundPhase,
    targetBlockHeight,
    roundBlockHash,
    roundBet,
    roundWager,
    roundSettled,
  ]);

  /*
    SUBMIT DEMO ROUND
  */

  async function handleSpin() {
    const wager =
      Number(betAmount);

    if (!bettingOpen) {
      return;
    }

    if (
      selectedBet === null
    ) {
      return;
    }

    if (
      !Number.isFinite(
        wager
      ) ||
      wager < 1 ||
      wager > balance
    ) {
      return;
    }

    setRoundPhase(
      "LOCKING"
    );

    try {
      /*
        Read the current tip at the
        exact moment this round locks.
      */

      const response =
        await fetch(
          "/api/zcash-status",
          {
            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !data.connected ||
        typeof data.height !==
          "number"
      ) {
        setTestnetConnected(
          false
        );

        setRoundPhase(
          "BETTING"
        );

        return;
      }

      const currentBlock =
        data.height;

      /*
        COMMIT TO N + 1.

        This height will NEVER
        change during this round.
      */

      const nextBlock =
        currentBlock + 1;

      setBlockHeight(
        currentBlock
      );

      setBestBlockHash(
        data.bestBlockHash ??
          null
      );

      setTestnetConnected(
        true
      );

      /*
        Freeze TEST prediction.
      */

      setRoundBet(
        selectedBet
      );

      setRoundWager(
        wager
      );

      setBalance(
        (current) =>
          current - wager
      );

      /*
        Close betting.
      */

      setBettingEndsAt(
        null
      );

      setBettingTimeLeft(
        0
      );

      const waitStart =
        Date.now();

      setWaitingStartedAt(
        waitStart
      );

      setWaitingSeconds(
        0
      );

      /*
        LOCK HEIGHT
      */

      setTargetBlockHeight(
        nextBlock
      );

      setRoundBlockHash(
        null
      );

      setRoundVerifiedPocket(
        null
      );

      /*
        Reset confirmation diagnostics.
      */

      setConfirmationDepth(
        0
      );

      setSourceTipHeight(
        currentBlock
      );

      setPollAttempts(0);

      setSourceErrors(0);

      setReorgCount(0);

      setBlockFoundAt(null);

      setResult(null);

      setOutcome(null);

      setRoundSettled(
        false
      );

      setResultEndsAt(
        null
      );

      resolvingBlockRef.current =
        false;

      pollInFlightRef.current =
        false;

      setRoundPhase(
        "WAITING"
      );
    } catch {
      setTestnetConnected(
        false
      );

      setRoundPhase(
        "BETTING"
      );
    }
  }

  return (
    <main className="game">

      <header className="topbar">

        <div>
          <h1 className="brand">
            ZKSPIN
          </h1>

          <p className="subtitle">
            Zero Knowledge Roulette
          </p>
        </div>

        <div className="topbar-info">

          <div className="balance">
            <span>
              Balance
            </span>

            <strong>
              {balance} TEST ZEC
            </strong>
          </div>

          <div className="network-status">

            <span>
              ZCASH TESTNET •{" "}
              {testnetConnected
                ? "CONNECTED"
                : "OFFLINE"}
            </span>

            <strong>
              BLOCK:{" "}
              {blockHeight ??
                "—"}
            </strong>

          </div>

        </div>

      </header>

      <section className="roulette-section">

        <RouletteWheel
          rotation={rotation}
          spinning={spinning}
        />

        {roundPhase ===
        "WAITING" ? (
          <div>

            <p className="wheel-label">
              WAITING FOR ZCASH
              BLOCK{" "}
              {targetBlockHeight ??
                "—"}
            </p>

            <p className="wheel-label">
              WAIT TIME:{" "}
              {formatTime(
                waitingSeconds
              )}
            </p>

          </div>
        ) : roundPhase ===
          "CONFIRMING" ? (
          <div>

            <p className="wheel-label">
              CONFIRMING BLOCK{" "}
              {targetBlockHeight ??
                "—"}
            </p>

            <p className="wheel-label">
              DEPTH:{" "}
              {confirmationDepth}/
              {CONFIRMATIONS_REQUIRED}
            </p>

          </div>
        ) : roundPhase ===
          "REORG_DETECTED" ? (
          <div>

            <p className="wheel-label">
              REORG DETECTED
            </p>

            <p className="wheel-label">
              RECHECKING BLOCK{" "}
              {targetBlockHeight ??
                "—"}
            </p>

          </div>
        ) : roundPhase ===
          "SPINNING" ? (
          <p className="wheel-label">
            BLOCK VERIFIED —
            SPINNING...
          </p>
        ) : roundPhase ===
          "RESULT" &&
          result !== null ? (
          <div className="spin-result">

            <span>
              RESULT
            </span>

            <strong>
              {result}
            </strong>

            <em>
              {getResultColor(
                result
              )}
            </em>

            {outcome !==
              null && (
              <p className="round-outcome">
                {outcome}
              </p>
            )}

          </div>
        ) : roundPhase ===
          "MISSED" ? (
          <p className="wheel-label">
            ROUND MISSED —
            NEW ROUND STARTING
          </p>
        ) : (
          <p className="wheel-label">
            WAITING FOR PREDICTION
          </p>
        )}

      </section>

      <section className="verification-panel">

        <div className="verification-header">

          <span>
            BLOCKCHAIN VERIFICATION
          </span>

          <strong>
            {roundPhase ===
            "WAITING"
              ? "WAITING"
              : roundPhase ===
                "CONFIRMING"
              ? `CONFIRMING ${confirmationDepth}/${CONFIRMATIONS_REQUIRED}`
              : roundPhase ===
                "REORG_DETECTED"
              ? "REORG"
              : roundPhase ===
                  "SPINNING" ||
                roundPhase ===
                  "RESULT"
              ? "VERIFIED"
              : "READY"}
          </strong>

        </div>

        <div className="verification-row">
          <span>
            Source Tip
          </span>

          <strong>
            {sourceTipHeight ??
              blockHeight ??
              "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Locked Block
          </span>

          <strong>
            {targetBlockHeight ??
              "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Candidate Hash
          </span>

          <code>
            {roundBlockHash
              ? `${roundBlockHash.slice(
                  0,
                  16
                )}...`
              : roundPhase ===
                "WAITING"
              ? "WAITING..."
              : "—"}
          </code>
        </div>

        <div className="verification-row">
          <span>
            Block Depth
          </span>

          <strong>
            {roundBlockHash
              ? `${confirmationDepth}/${CONFIRMATIONS_REQUIRED}`
              : "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Verified Pocket
          </span>

          <strong>
            {roundVerifiedPocket ??
              "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Total Wait Time
          </span>

          <strong>
            {targetBlockHeight
              ? formatTime(
                  waitingSeconds
                )
              : "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Poll Attempts
          </span>

          <strong>
            {pollAttempts}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Source Errors
          </span>

          <strong>
            {sourceErrors}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Reorgs Detected
          </span>

          <strong>
            {reorgCount}
          </strong>
        </div>

      </section>

      <section className="bet-panel">

        <div className="betting-timer">

          <span>
            {roundPhase ===
            "BETTING"
              ? "BETTING CLOSES IN"
              : roundPhase ===
                "LOCKING"
              ? "LOCKING ROUND"
              : roundPhase ===
                "WAITING"
              ? "WAITING FOR BLOCK"
              : roundPhase ===
                "CONFIRMING"
              ? "VERIFYING BLOCK"
              : roundPhase ===
                "REORG_DETECTED"
              ? "REORG DETECTED"
              : roundPhase ===
                "SPINNING"
              ? "BLOCK VERIFIED"
              : roundPhase ===
                "RESULT"
              ? "ROUND COMPLETE"
              : "ROUND MISSED"}
          </span>

          <strong>
            {roundPhase ===
            "BETTING"
              ? formatTime(
                  bettingTimeLeft
                )
              : roundPhase ===
                  "WAITING" ||
                roundPhase ===
                  "CONFIRMING" ||
                roundPhase ===
                  "REORG_DETECTED"
              ? formatTime(
                  waitingSeconds
                )
              : "--:--"}
          </strong>

        </div>

        <div className="bet-amount">

          <span>
            Bet amount
          </span>

          <div className="amount-control">

            <button
              onClick={() =>
                setBetAmount(
                  (current) =>
                    String(
                      Math.max(
                        1,
                        Number(
                          current ||
                            0
                        ) - 1
                      )
                    )
                )
              }
              disabled={
                !bettingOpen
              }
            >
              -
            </button>

            <input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(
                event
              ) =>
                setBetAmount(
                  event.target
                    .value
                )
              }
              disabled={
                !bettingOpen
              }
            />

            <span>
              TEST ZEC
            </span>

            <button
              onClick={() =>
                setBetAmount(
                  (current) =>
                    String(
                      Number(
                        current ||
                          0
                      ) + 1
                    )
                )
              }
              disabled={
                !bettingOpen
              }
            >
              +
            </button>

          </div>

        </div>

        <div className="prediction">

          <div className="prediction-header">
            <span>
              PREDICT THE RESULT
            </span>
          </div>

          <div className="simple-bet-options">

            <button
              className={
                selectedBet ===
                  "RED"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedBet(
                  "RED"
                )
              }
              disabled={
                !bettingOpen
              }
            >
              RED
            </button>

            <button
              className={
                selectedBet ===
                  "BLACK"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedBet(
                  "BLACK"
                )
              }
              disabled={
                !bettingOpen
              }
            >
              BLACK
            </button>

            <button
              className={
                selectedBet ===
                  "ODD"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedBet(
                  "ODD"
                )
              }
              disabled={
                !bettingOpen
              }
            >
              ODD
            </button>

            <button
              className={
                selectedBet ===
                  "EVEN"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedBet(
                  "EVEN"
                )
              }
              disabled={
                !bettingOpen
              }
            >
              EVEN
            </button>

          </div>

        </div>

        <button
          className="spin-button"
          onClick={handleSpin}
          disabled={
            !bettingOpen ||
            selectedBet ===
              null ||
            invalidBet ||
            !testnetConnected
          }
        >
          {roundPhase ===
          "BETTING"
            ? "SPIN"
            : roundPhase ===
              "LOCKING"
            ? "LOCKING ROUND..."
            : roundPhase ===
              "WAITING"
            ? `WAITING FOR BLOCK ${targetBlockHeight}`
            : roundPhase ===
              "CONFIRMING"
            ? `CONFIRMING ${confirmationDepth}/${CONFIRMATIONS_REQUIRED}`
            : roundPhase ===
              "REORG_DETECTED"
            ? "REORG DETECTED"
            : roundPhase ===
              "SPINNING"
            ? "SPINNING..."
            : roundPhase ===
              "RESULT"
            ? "ROUND COMPLETE"
            : "ROUND MISSED"}
        </button>

      </section>

      <section className="history">

        <h2>
          Recent Spins
        </h2>

        {history.length ===
        0 ? (
          <div className="history-empty">
            No spins yet.
          </div>
        ) : (
          <div className="history-list">

            {history.map(
              (
                round,
                index
              ) => (
                <div
                  className="history-item"
                  key={`${round.result}-${index}`}
                >

                  <div
                    className={`history-number ${getResultColor(
                      round.result
                    ).toLowerCase()}`}
                  >
                    {round.result}
                  </div>

                  <div className="history-details">

                    <span>
                      BET:{" "}
                      {round.bet} •{" "}
                      {round.amount}{" "}
                      TEST ZEC
                    </span>

                    <p>
                      RESULT:{" "}
                      {getResultColor(
                        round.result
                      )}
                    </p>

                    <strong
                      className={
                        round.outcome ===
                        "WIN"
                          ? "history-win"
                          : "history-loss"
                      }
                    >
                      {round.outcome ===
                      "WIN"
                        ? `WIN • +${round.amount} TEST ZEC`
                        : `LOSS • -${round.amount} TEST ZEC`}
                    </strong>

                  </div>

                </div>
              )
            )}

          </div>
        )}

      </section>

    </main>
  );
}
