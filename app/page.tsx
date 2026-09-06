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

type SourceState =
  | "READY"
  | "WAITING_FOR_BLOCK"
  | "SOURCE_LAG"
  | "SOURCE_UNAVAILABLE"
  | "CONFIRMING"
  | "VERIFIED";

type RoundMode =
  | "BLOCKCHAIN"
  | "DEMO";

type HistoryEntry = {
  result: RouletteResult;

  resultColor:
    | "RED"
    | "BLACK"
    | "GREEN";

  bet: BetType;

  amount: number;

  outcome:
    | "WIN"
    | "LOSS";

  blockHeight:
    | number
    | null;

  blockHash:
    | string
    | null;

  timestamp: number;

  mode: RoundMode;
};

type StoredState = {
  version: 3;

  demoMode: boolean;

  roundPhase:
    RoundPhase;

  betAmount: string;

  balance: number;

  targetBlockHeight:
    | number
    | null;

  roundBlockHash:
    | string
    | null;

  roundVerifiedPocket:
    | RouletteResult
    | null;

  roundBet:
    | BetType
    | null;

  roundWager:
    | number
    | null;

  selectedBet:
    | BetType
    | null;

  result:
    | RouletteResult
    | null;

  outcome:
    | "WIN"
    | "LOSS"
    | null;

  history:
    HistoryEntry[];

  bettingEndsAt:
    | number
    | null;

  waitingStartedAt:
    | number
    | null;

  resultEndsAt:
    | number
    | null;

  roundSettled:
    boolean;

  confirmationDepth:
    number;

  sourceTipHeight:
    | number
    | null;

  pollAttempts:
    number;

  sourceErrors:
    number;

  reorgCount:
    number;

  blockFoundAt:
    | number
    | null;
};

const BETTING_SECONDS =
  30;

const CONFIRMATIONS_REQUIRED =
  1;

const POLL_INTERVAL_MS =
  5000;

const MAX_HISTORY_ITEMS =
  10;

const DEMO_DELAY_MS =
  1000;

const STORAGE_KEY =
  "zkspin-demo-state-v3";

const wheelNumbers:
  RouletteResult[] = [
  0,
  28,
  9,
  26,
  30,
  11,
  7,
  20,
  32,
  17,
  5,
  22,
  34,
  15,
  3,
  24,
  36,
  13,
  1,
  "00",
  27,
  10,
  25,
  29,
  12,
  8,
  19,
  31,
  18,
  6,
  21,
  33,
  16,
  4,
  23,
  35,
  14,
  2,
];

const redNumbers =
  new Set([
    1,
    3,
    5,
    7,
    9,
    12,
    14,
    16,
    18,
    19,
    21,
    23,
    25,
    27,
    30,
    32,
    34,
    36,
  ]);

function getResultColor(
  result: RouletteResult
):
  | "RED"
  | "BLACK"
  | "GREEN" {
  if (
    result === 0 ||
    result === "00"
  ) {
    return "GREEN";
  }

  if (
    typeof result ===
      "number" &&
    redNumbers.has(
      result
    )
  ) {
    return "RED";
  }

  return "BLACK";
}

function didBetWin(
  bet: BetType,
  pocket:
    RouletteResult
) {
  const color =
    getResultColor(
      pocket
    );

  if (
    bet === "RED"
  ) {
    return (
      color === "RED"
    );
  }

  if (
    bet === "BLACK"
  ) {
    return (
      color ===
      "BLACK"
    );
  }

  if (
    bet === "ODD"
  ) {
    return (
      typeof pocket ===
        "number" &&
      pocket !== 0 &&
      pocket % 2 !== 0
    );
  }

  return (
    typeof pocket ===
      "number" &&
    pocket !== 0 &&
    pocket % 2 === 0
  );
}

function formatTime(
  seconds: number
) {
  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(
    2,
    "0"
  )}`;
}

function formatHistoryTime(
  timestamp: number
) {
  return new Date(
    timestamp
  ).toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
      second:
        "2-digit",
    }
  );
}

export default function Home() {
  const [
    hydrated,
    setHydrated,
  ] =
    useState(false);

  /*
    MODE

    false =
    real Zcash testnet
    block result

    true =
    fast local demo
    result
  */

  const [
    demoMode,
    setDemoMode,
  ] =
    useState(false);

  const [
    rotation,
    setRotation,
  ] =
    useState(0);

  const [
    roundPhase,
    setRoundPhase,
  ] =
    useState<RoundPhase>(
      "BETTING"
    );

  const [
    sourceState,
    setSourceState,
  ] =
    useState<SourceState>(
      "READY"
    );

  const [
    result,
    setResult,
  ] =
    useState<
      RouletteResult |
        null
    >(null);

  const [
    betAmount,
    setBetAmount,
  ] =
    useState("1");

  const [
    balance,
    setBalance,
  ] =
    useState(100);

  const [
    blockHeight,
    setBlockHeight,
  ] =
    useState<
      number |
        null
    >(null);

  const [
    testnetConnected,
    setTestnetConnected,
  ] =
    useState(false);

  const [
    bestBlockHash,
    setBestBlockHash,
  ] =
    useState<
      string |
        null
    >(null);

  const [
    targetBlockHeight,
    setTargetBlockHeight,
  ] =
    useState<
      number |
        null
    >(null);

  const [
    roundBlockHash,
    setRoundBlockHash,
  ] =
    useState<
      string |
        null
    >(null);

  const [
    roundVerifiedPocket,
    setRoundVerifiedPocket,
  ] =
    useState<
      RouletteResult |
        null
    >(null);

  const [
    roundBet,
    setRoundBet,
  ] =
    useState<
      BetType |
        null
    >(null);

  const [
    roundWager,
    setRoundWager,
  ] =
    useState<
      number |
        null
    >(null);

  const [
    selectedBet,
    setSelectedBet,
  ] =
    useState<
      BetType |
        null
    >(null);

  const [
    outcome,
    setOutcome,
  ] =
    useState<
      | "WIN"
      | "LOSS"
      | null
    >(null);

  const [
    bettingTimeLeft,
    setBettingTimeLeft,
  ] =
    useState(
      BETTING_SECONDS
    );

  const [
    waitingSeconds,
    setWaitingSeconds,
  ] =
    useState(0);

  const [
    bettingEndsAt,
    setBettingEndsAt,
  ] =
    useState<
      number |
        null
    >(null);

  const [
    waitingStartedAt,
    setWaitingStartedAt,
  ] =
    useState<
      number |
        null
    >(null);

  const [
    resultEndsAt,
    setResultEndsAt,
  ] =
    useState<
      number |
        null
    >(null);

  const [
    confirmationDepth,
    setConfirmationDepth,
  ] =
    useState(0);

  const [
    sourceTipHeight,
    setSourceTipHeight,
  ] =
    useState<
      number |
        null
    >(null);

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
    useState<
      number |
        null
    >(null);

  const [
    roundSettled,
    setRoundSettled,
  ] =
    useState(false);

  const [
    history,
    setHistory,
  ] =
    useState<
      HistoryEntry[]
    >([]);

  const resolvingBlockRef =
    useRef(false);

  const pollInFlightRef =
    useRef(false);

  const demoSpinInFlightRef =
    useRef(false);

  const wagerAmount =
    Number(
      betAmount
    );

  const invalidBet =
    betAmount.trim() ===
      "" ||
    !Number.isFinite(
      wagerAmount
    ) ||
    wagerAmount < 1 ||
    wagerAmount >
      balance;

  const bettingOpen =
    hydrated &&
    roundPhase ===
      "BETTING" &&
    bettingTimeLeft >
      0;

  const spinning =
    roundPhase ===
    "SPINNING";

  /*
    START FRESH ROUND
  */

  const startNewRound =
    useCallback(() => {
      const deadline =
        Date.now() +
        BETTING_SECONDS *
          1000;

      setRoundPhase(
        "BETTING"
      );

      setSourceState(
        "READY"
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

      setWaitingSeconds(
        0
      );

      setResultEndsAt(
        null
      );

      setSelectedBet(
        null
      );

      setRoundBet(
        null
      );

      setRoundWager(
        null
      );

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

      setRoundSettled(
        false
      );

      setConfirmationDepth(
        0
      );

      setSourceTipHeight(
        null
      );

      setPollAttempts(
        0
      );

      setSourceErrors(
        0
      );

      setReorgCount(
        0
      );

      setBlockFoundAt(
        null
      );

      resolvingBlockRef.current =
        false;

      pollInFlightRef.current =
        false;

      demoSpinInFlightRef.current =
        false;
    }, []);

  /*
    RESTORE LOCAL STATE
  */

  useEffect(() => {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      startNewRound();

      setHydrated(
        true
      );

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
        saved.version !==
        3
      ) {
        window.localStorage.removeItem(
          STORAGE_KEY
        );

        startNewRound();

        setHydrated(
          true
        );

        return;
      }

      setDemoMode(
        Boolean(
          saved.demoMode
        )
      );

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
          saved.history.slice(
            0,
            MAX_HISTORY_ITEMS
          )
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
        saved.result ??
          null
      );

      setOutcome(
        saved.outcome ??
          null
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
        Restore active
        BLOCKCHAIN round.

        Demo rounds are not
        resumed halfway through.
        If someone refreshes
        during a demo spin,
        the last safely saved
        betting state is restored.
      */

      const activeBlockRound =
        !saved.demoMode &&
        (
          saved.roundPhase ===
            "WAITING" ||
          saved.roundPhase ===
            "CONFIRMING" ||
          saved.roundPhase ===
            "REORG_DETECTED" ||
          saved.roundPhase ===
            "SPINNING"
        );

      if (
        activeBlockRound &&
        typeof saved
          .targetBlockHeight ===
          "number" &&
        saved.roundBet &&
        typeof saved
          .roundWager ===
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
              ) /
                1000
            )
          )
        );

        setBettingEndsAt(
          null
        );

        if (
          saved.roundBlockHash
        ) {
          setRoundPhase(
            "CONFIRMING"
          );

          setSourceState(
            "CONFIRMING"
          );
        } else {
          setRoundPhase(
            "WAITING"
          );

          setSourceState(
            "WAITING_FOR_BLOCK"
          );
        }

        setHydrated(
          true
        );

        return;
      }

      /*
        RESTORE RESULT
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

        setSourceState(
          saved.demoMode
            ? "READY"
            : "VERIFIED"
        );

        setResultEndsAt(
          saved.resultEndsAt
        );

        setBettingEndsAt(
          null
        );

        setHydrated(
          true
        );

        return;
      }

      /*
        RESTORE ACTIVE
        BETTING TIMER
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
              ) /
                1000
            )
          );

        setRoundPhase(
          "BETTING"
        );

        setSourceState(
          "READY"
        );

        setBettingEndsAt(
          saved.bettingEndsAt
        );

        setBettingTimeLeft(
          secondsLeft
        );

        setHydrated(
          true
        );

        return;
      }

      startNewRound();

      setHydrated(
        true
      );
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY
      );

      startNewRound();

      setHydrated(
        true
      );
    }
  }, [
    startNewRound,
  ]);

  /*
    SAVE STATE
  */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    /*
      Don't overwrite the
      last safe state during
      an active Demo spin.

      So refreshing during
      a demo animation doesn't
      leave a half-settled round.
    */

    if (
      demoMode &&
      (
        roundPhase ===
          "LOCKING" ||
        roundPhase ===
          "SPINNING"
      )
    ) {
      return;
    }

    const state:
      StoredState =
      {
        version: 3,

        demoMode,

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
    demoMode,
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
    LOAD ZCASH STATUS

    We still display Testnet
    status while Demo Mode
    is enabled.

    Demo Mode simply doesn't
    use it to determine the
    roulette result.
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
          typeof data.height ===
            "number"
            ? data.height
            : null
        );

        setBestBlockHash(
          data.bestBlockHash ??
            null
        );

        setTestnetConnected(
          Boolean(
            data.connected
          )
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
    BETTING TIMER
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
            ) /
              1000
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

    Show missed message
    for 3 seconds then
    automatically reopen
    betting.

    No browser refresh
    required.
  */

  useEffect(() => {
    if (
      !hydrated ||
      roundPhase !==
        "BETTING" ||
      bettingTimeLeft !==
        0
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
        3000
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
    BLOCK WAIT TIMER
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
            ) /
              1000
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
    RESULT DISPLAY TIMER
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

    if (
      remaining <= 0
    ) {
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
    BLOCKCHAIN
    CONFIRMATION ENGINE

    Demo Mode NEVER enters
    this effect because it
    does not use WAITING /
    CONFIRMING states.
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
      demoMode ||
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
        const response =
          await fetch(
            `/api/zcash-block/${targetBlockHeight}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (
          data.status ===
            "SOURCE_UNAVAILABLE" ||
          !data.connected
        ) {
          setSourceErrors(
            (current) =>
              current + 1
          );

          setTestnetConnected(
            false
          );

          setSourceState(
            "SOURCE_UNAVAILABLE"
          );

          return;
        }

        setTestnetConnected(
          true
        );

        if (
          typeof data.tipHeight ===
          "number"
        ) {
          setSourceTipHeight(
            data.tipHeight
          );

          setBlockHeight(
            data.tipHeight
          );
        }

        if (
          data.status ===
          "NOT_MINED"
        ) {
          setRoundPhase(
            "WAITING"
          );

          setSourceState(
            "WAITING_FOR_BLOCK"
          );

          setConfirmationDepth(
            0
          );

          return;
        }

        if (
          data.status ===
          "DATA_SOURCE_LAG"
        ) {
          setRoundPhase(
            "WAITING"
          );

          setSourceState(
            "SOURCE_LAG"
          );

          return;
        }

        if (
          data.status !==
            "FOUND" ||
          !data.found ||
          !data.hash
        ) {
          return;
        }

        const observedHash =
          String(
            data.hash
          ).toLowerCase();

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

          setSourceState(
            "CONFIRMING"
          );

          const newDepth =
            typeof data
              .confirmationDepth ===
            "number"
              ? data.confirmationDepth
              : 1;

          setConfirmationDepth(
            newDepth
          );

          return;
        }

        const depth =
          typeof data
            .confirmationDepth ===
          "number"
            ? data.confirmationDepth
            : 1;

        setConfirmationDepth(
          depth
        );

        if (
          depth <
          CONFIRMATIONS_REQUIRED
        ) {
          setRoundPhase(
            "CONFIRMING"
          );

          setSourceState(
            "CONFIRMING"
          );

          return;
        }

        resolvingBlockRef.current =
          true;

        setSourceState(
          "VERIFIED"
        );

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
              number ===
              pocket
          );

        if (
          resultIndex ===
          -1
        ) {
          resolvingBlockRef.current =
            false;

          return;
        }

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
              current %
              360;

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

            const pocketColor =
              getResultColor(
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

              const historyEntry:
                HistoryEntry =
                {
                  result:
                    pocket,

                  resultColor:
                    pocketColor,

                  bet:
                    roundBet,

                  amount:
                    roundWager,

                  outcome:
                    won
                      ? "WIN"
                      : "LOSS",

                  blockHeight:
                    targetBlockHeight,

                  blockHash:
                    observedHash,

                  timestamp:
                    Date.now(),

                  mode:
                    "BLOCKCHAIN",
                };

              setHistory(
                (current) =>
                  [
                    historyEntry,
                    ...current,
                  ].slice(
                    0,
                    MAX_HISTORY_ITEMS
                  )
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

            setSourceState(
              "VERIFIED"
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

        setTestnetConnected(
          false
        );

        setSourceState(
          "SOURCE_UNAVAILABLE"
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
    demoMode,
    roundPhase,
    targetBlockHeight,
    roundBlockHash,
    roundBet,
    roundWager,
    roundSettled,
  ]);

  /*
    DEMO SPIN

    Does NOT:
    - lock a Zcash block
    - request a block hash
    - run blockchain verifier
    - claim blockchain verification

    It is only for
    fast interface testing.
  */

  async function runDemoSpin(
    wager: number,
    lockedBet:
      BetType
  ) {
    if (
      demoSpinInFlightRef.current
    ) {
      return;
    }

    demoSpinInFlightRef.current =
      true;

    setRoundPhase(
      "LOCKING"
    );

    setSourceState(
      "READY"
    );

    setRoundBet(
      lockedBet
    );

    setRoundWager(
      wager
    );

    setBalance(
      (current) =>
        current - wager
    );

    setBettingEndsAt(
      null
    );

    setBettingTimeLeft(
      0
    );

    setWaitingStartedAt(
      null
    );

    setWaitingSeconds(
      0
    );

    setTargetBlockHeight(
      null
    );

    setRoundBlockHash(
      null
    );

    setRoundVerifiedPocket(
      null
    );

    setConfirmationDepth(
      0
    );

    setResult(null);

    setOutcome(null);

    setRoundSettled(
      false
    );

    setResultEndsAt(
      null
    );

    /*
      Small delay so testers
      can see that the round
      was submitted.
    */

    await new Promise<void>(
      (resolve) => {
        window.setTimeout(
          resolve,
          DEMO_DELAY_MS
        );
      }
    );

    /*
      Demo-only random
      roulette pocket.
    */

    const randomIndex =
      Math.floor(
        Math.random() *
          wheelNumbers.length
      );

    const pocket =
      wheelNumbers[
        randomIndex
      ];

    const pocketColor =
      getResultColor(
        pocket
      );

    setRoundVerifiedPocket(
      pocket
    );

    setRoundPhase(
      "SPINNING"
    );

    const segmentAngle =
      360 /
      wheelNumbers.length;

    setRotation(
      (current) => {
        const currentPosition =
          current % 360;

        const targetPosition =
          -(
            randomIndex *
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
        const won =
          didBetWin(
            lockedBet,
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

        if (won) {
          setBalance(
            (current) =>
              current +
              wager *
                2
          );
        }

        const historyEntry:
          HistoryEntry =
          {
            result:
              pocket,

            resultColor:
              pocketColor,

            bet:
              lockedBet,

            amount:
              wager,

            outcome:
              won
                ? "WIN"
                : "LOSS",

            /*
              Demo rounds have
              no blockchain proof.
            */

            blockHeight:
              null,

            blockHash:
              null,

            timestamp:
              Date.now(),

            mode:
              "DEMO",
          };

        setHistory(
          (current) =>
            [
              historyEntry,
              ...current,
            ].slice(
              0,
              MAX_HISTORY_ITEMS
            )
        );

        setRoundSettled(
          true
        );

        const endsAt =
          Date.now() +
          3000;

        setResultEndsAt(
          endsAt
        );

        setRoundPhase(
          "RESULT"
        );

        setSourceState(
          "READY"
        );

        demoSpinInFlightRef.current =
          false;
      },
      3000
    );
  }

  /*
    MAIN SPIN BUTTON
  */

  async function handleSpin() {
    const wager =
      Number(
        betAmount
      );

    if (
      !bettingOpen
    ) {
      return;
    }

    if (
      selectedBet ===
      null
    ) {
      return;
    }

    if (
      !Number.isFinite(
        wager
      ) ||
      wager < 1 ||
      wager >
        balance
    ) {
      return;
    }

    /*
      DEMO PATH
    */

    if (demoMode) {
      await runDemoSpin(
        wager,
        selectedBet
      );

      return;
    }

    /*
      BLOCKCHAIN PATH
    */

    setRoundPhase(
      "LOCKING"
    );

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

      const nextBlock =
        currentBlock +
        1;

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

      setRoundBet(
        selectedBet
      );

      setRoundWager(
        wager
      );

      setBalance(
        (current) =>
          current -
          wager
      );

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

      setTargetBlockHeight(
        nextBlock
      );

      setRoundBlockHash(
        null
      );

      setRoundVerifiedPocket(
        null
      );

      setConfirmationDepth(
        0
      );

      setSourceTipHeight(
        currentBlock
      );

      setPollAttempts(
        0
      );

      setSourceErrors(
        0
      );

      setReorgCount(
        0
      );

      setBlockFoundAt(
        null
      );

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

      setSourceState(
        "WAITING_FOR_BLOCK"
      );

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

  /*
    MODE TOGGLE

    Only allow switching
    while betting is open.

    Never change mode during
    an active round.
  */

  function toggleDemoMode() {
  const canSwitchMode =
    roundPhase === "BETTING" ||
    roundPhase === "RESULT" ||
    roundPhase === "MISSED";

  if (!canSwitchMode) {
    return;
  }

  setDemoMode(
    (current) => !current
  );

  setSelectedBet(null);
  setResult(null);
  setOutcome(null);
  setSourceState("READY");

  if (
    roundPhase === "RESULT" ||
    roundPhase === "MISSED"
  ) {
    startNewRound();
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

          <div className="mode-control">
            <span className="mode-label">
              MODE
            </span>

            <div className="mode-switch-row">

              <span
                className={
                  !demoMode
                    ? "mode-name active"
                    : "mode-name"
                }
              >
                BLOCKCHAIN
              </span>

              <button
                type="button"
                className={
                  demoMode
                    ? "mode-toggle active"
                    : "mode-toggle"
                }
                onClick={
                  toggleDemoMode
                }
           disabled={
  roundPhase === "LOCKING" ||
  roundPhase === "WAITING" ||
  roundPhase === "CONFIRMING" ||
  roundPhase === "REORG_DETECTED" ||
  roundPhase === "SPINNING"
}
                aria-label="Toggle Demo Mode"
                aria-pressed={
                  demoMode
                }
              >
                <span className="mode-toggle-knob" />
              </button>

              <span
                className={
                  demoMode
                    ? "mode-name active"
                    : "mode-name"
                }
              >
                DEMO
              </span>

            </div>
          </div>

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
              {demoMode
                ? "DEMO MODE • LOCAL RANDOM"
                : `ZCASH TESTNET • ${
                    testnetConnected
                      ? "CONNECTED"
                      : "OFFLINE"
                  }`}
            </span>

            <strong>
              {demoMode
                ? "BLOCKCHAIN VERIFICATION BYPASSED"
                : `BLOCK: ${
                    blockHeight ??
                    "—"
                  }`}
            </strong>

          </div>

        </div>

      </header>

      <section className="roulette-section">

        <RouletteWheel
          rotation={
            rotation
          }
          spinning={
            spinning
          }
        />

        {demoMode &&
        roundPhase ===
          "LOCKING" ? (
          <p className="wheel-label">
            PREPARING DEMO ROUND...
          </p>
        ) : demoMode &&
          roundPhase ===
            "SPINNING" ? (
          <p className="wheel-label">
            DEMO RESULT —
            SPINNING...
          </p>
        ) : sourceState ===
          "SOURCE_LAG" ? (
          <div>

            <p className="wheel-label">
              BLOCKCHAIN DATA
              CATCHING UP
            </p>

            <p className="wheel-label">
              LOCKED BLOCK{" "}
              {targetBlockHeight ??
                "—"}
            </p>

          </div>
        ) : sourceState ===
          "SOURCE_UNAVAILABLE" ? (
          <div>

            <p className="wheel-label">
              BLOCKCHAIN DATA
              TEMPORARILY UNAVAILABLE
            </p>

            <p className="wheel-label">
              RETRYING...
            </p>

          </div>
        ) : roundPhase ===
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
            "CONFIRMING" ||
          roundPhase ===
            "REORG_DETECTED" ? (
          <div>

            <p className="wheel-label">
              VERIFYING BLOCK{" "}
              {targetBlockHeight ??
                "—"}
            </p>

            <p className="wheel-label">
              CONFIRMATION:{" "}
              {Math.min(
                confirmationDepth,
                CONFIRMATIONS_REQUIRED
              )}
              /
              {
                CONFIRMATIONS_REQUIRED
              }
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
          result !==
            null ? (
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

            {demoMode && (
              <small className="demo-result-label">
                DEMO RESULT
              </small>
            )}

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
            PLACE YOUR PREDICTION
          </p>
        )}

      </section>

      <section className="verification-panel">

        <div className="verification-header">

          <span>
            {demoMode
              ? "DEMO ROUND"
              : "BLOCKCHAIN VERIFICATION"}
          </span>

          <strong>
            {demoMode
              ? "LOCAL RANDOM"
              : sourceState ===
                "SOURCE_LAG"
              ? "SYNCING"
              : sourceState ===
                "SOURCE_UNAVAILABLE"
              ? "RETRYING"
              : roundPhase ===
                "WAITING"
              ? "WAITING"
              : roundPhase ===
                  "CONFIRMING" ||
                roundPhase ===
                  "REORG_DETECTED"
              ? `CONFIRMING ${Math.min(
                  confirmationDepth,
                  CONFIRMATIONS_REQUIRED
                )}/${CONFIRMATIONS_REQUIRED}`
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
            {demoMode
              ? "Result Source"
              : "Locked Block"}
          </span>

          <strong>
            {demoMode
              ? "LOCAL RANDOM"
              : targetBlockHeight ??
                "—"}
          </strong>

        </div>

        <div className="verification-row">

          <span>
            Block Hash
          </span>

          <code>
            {demoMode
              ? "NOT USED"
              : roundBlockHash
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
            Confirmation
          </span>

          <strong>
            {demoMode
              ? "NOT USED"
              : roundBlockHash
              ? `${Math.min(
                  confirmationDepth,
                  CONFIRMATIONS_REQUIRED
                )}/${CONFIRMATIONS_REQUIRED}`
              : "—"}
          </strong>

        </div>

        <div className="verification-row">

          <span>
            {demoMode
              ? "Demo Pocket"
              : "Verified Pocket"}
          </span>

          <strong>
            {roundVerifiedPocket ??
              "—"}
          </strong>

        </div>

        <div className="verification-row">

          <span>
            Block Wait Time
          </span>

          <strong>
            {demoMode
              ? "NOT USED"
              : targetBlockHeight
              ? formatTime(
                  waitingSeconds
                )
              : "—"}
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
              ? demoMode
                ? "PREPARING DEMO ROUND"
                : "LOCKING ROUND"
              : sourceState ===
                "SOURCE_LAG"
              ? "BLOCK DATA SYNCING"
              : sourceState ===
                "SOURCE_UNAVAILABLE"
              ? "RECONNECTING"
              : roundPhase ===
                "WAITING"
              ? "WAITING FOR BLOCK"
              : roundPhase ===
                  "CONFIRMING" ||
                roundPhase ===
                  "REORG_DETECTED"
              ? "VERIFYING BLOCK"
              : roundPhase ===
                "SPINNING"
              ? demoMode
                ? "DEMO SPIN"
                : "BLOCK VERIFIED"
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
                        ) -
                          1
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
              value={
                betAmount
              }
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
                      ) +
                        1
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

            {(
              [
                "RED",
                "BLACK",
                "ODD",
                "EVEN",
              ] as BetType[]
            ).map(
              (
                bet
              ) => (
                <button
                  key={
                    bet
                  }
                  className={
                    selectedBet ===
                    bet
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setSelectedBet(
                      bet
                    )
                  }
                  disabled={
                    !bettingOpen
                  }
                >
                  {bet}
                </button>
              )
            )}

          </div>

        </div>

        <button
          className="spin-button"
          onClick={
            handleSpin
          }
          disabled={
            !bettingOpen ||
            selectedBet ===
              null ||
            invalidBet ||
            (
              !demoMode &&
              !testnetConnected
            )
          }
        >
          {roundPhase ===
          "BETTING"
            ? demoMode
              ? "DEMO SPIN"
              : "SPIN"
            : roundPhase ===
              "LOCKING"
            ? demoMode
              ? "PREPARING DEMO..."
              : "LOCKING ROUND..."
            : sourceState ===
              "SOURCE_LAG"
            ? "BLOCK DATA SYNCING..."
            : sourceState ===
              "SOURCE_UNAVAILABLE"
            ? "RECONNECTING..."
            : roundPhase ===
              "WAITING"
            ? `WAITING FOR BLOCK ${targetBlockHeight}`
            : roundPhase ===
                "CONFIRMING" ||
              roundPhase ===
                "REORG_DETECTED"
            ? `CONFIRMING ${Math.min(
                confirmationDepth,
                CONFIRMATIONS_REQUIRED
              )}/${CONFIRMATIONS_REQUIRED}`
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

        <div className="history-header">

          <h2>
            Recent Spins
          </h2>

          <span>
            LAST{" "}
            {
              MAX_HISTORY_ITEMS
            }
          </span>

        </div>

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
                  key={`${round.timestamp}-${index}`}
                >

                  <div
                    className={`history-number ${round.resultColor.toLowerCase()}`}
                  >
                    {
                      round.result
                    }
                  </div>

                  <div className="history-details">

                    <div className="history-top-row">

                      <span>
                        BET:{" "}
                        {
                          round.bet
                        }
                      </span>

                      <span>
                        {formatHistoryTime(
                          round.timestamp
                        )}
                      </span>

                    </div>

                    <p>
                      {
                        round.amount
                      }{" "}
                      TEST ZEC
                    </p>

                    <p>
                      RESULT:{" "}
                      {
                        round.resultColor
                      }
                    </p>

                    {round.mode ===
                    "DEMO" ? (
                      <p className="history-block">
                        DEMO ROUND •
                        LOCAL RANDOM
                      </p>
                    ) : (
                      <p className="history-block">
                        BLOCK #
                        {round.blockHeight ??
                          "—"}
                      </p>
                    )}

                    {round.mode !==
                      "DEMO" &&
                      round.blockHash && (
                        <code className="history-hash">
                          {round.blockHash.slice(
                            0,
                            18
                          )}
                          ...
                        </code>
                      )}

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
