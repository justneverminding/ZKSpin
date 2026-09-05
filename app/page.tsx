"use client";

import { useEffect, useRef, useState } from "react";
import RouletteWheel from "../components/RouletteWheel";
import { verifyBlockHash } from "../lib/rouletteVerifier";

type RouletteResult = number | "00";

type BetType = "RED" | "BLACK" | "ODD" | "EVEN";

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

function getResultColor(result: RouletteResult) {
  if (result === 0 || result === "00") {
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

export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const [result, setResult] =
    useState<RouletteResult | null>(null);

  const [betAmount, setBetAmount] = useState("1");
  const [balance, setBalance] = useState(100);

  const [blockHeight, setBlockHeight] =
    useState<number | null>(null);

  const [testnetConnected, setTestnetConnected] =
    useState(false);

  const [bestBlockHash, setBestBlockHash] =
    useState<string | null>(null);

  const [targetBlockHeight, setTargetBlockHeight] =
    useState<number | null>(null);

  const [roundBlockHash, setRoundBlockHash] =
    useState<string | null>(null);

  const [roundVerifiedPocket, setRoundVerifiedPocket] =
    useState<RouletteResult | null>(null);

  const [waitingForBlock, setWaitingForBlock] =
    useState(false);

  const [lockingRound, setLockingRound] =
    useState(false);

  const [roundBet, setRoundBet] =
    useState<BetType | null>(null);

  const [roundWager, setRoundWager] =
    useState<number | null>(null);

  const [selectedBet, setSelectedBet] =
    useState<BetType | null>(null);

  const [outcome, setOutcome] =
    useState<"WIN" | "LOSS" | null>(null);

  /*
    NEW:
    Betting countdown starts at 15 seconds.
  */
  const [bettingTimeLeft, setBettingTimeLeft] =
    useState(15);

  const [history, setHistory] = useState<
    {
      result: RouletteResult;
      bet: BetType;
      amount: number;
      outcome: "WIN" | "LOSS";
    }[]
  >([]);

  const resolvingBlockRef = useRef(false);

  const wagerAmount = Number(betAmount);

  const invalidBet =
    betAmount.trim() === "" ||
    !Number.isFinite(wagerAmount) ||
    wagerAmount < 1 ||
    wagerAmount > balance;

  /*
    LOAD CURRENT ZCASH TESTNET STATUS
  */
  useEffect(() => {
    async function loadZcashStatus() {
      try {
        const response = await fetch(
          "/api/zcash-status",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        setBlockHeight(data.height);
        setBestBlockHash(data.bestBlockHash);
        setTestnetConnected(data.connected);
      } catch {
        setBlockHeight(null);
        setBestBlockHash(null);
        setTestnetConnected(false);
      }
    }

    loadZcashStatus();
  }, []);

  /*
    NEW:
    15 SECOND BETTING COUNTDOWN

    This is visual only for now.

    It does NOT automatically spin or
    lock a block when it reaches zero.
  */
  useEffect(() => {
    if (waitingForBlock || spinning) {
      return;
    }

    if (bettingTimeLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setBettingTimeLeft((current) =>
        Math.max(0, current - 1)
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    bettingTimeLeft,
    waitingForBlock,
    spinning,
  ]);

  /*
    WATCH THE LOCKED FUTURE BLOCK
  */
  useEffect(() => {
    if (
      !waitingForBlock ||
      targetBlockHeight === null
    ) {
      return;
    }

    async function checkTargetBlock() {
      if (resolvingBlockRef.current) {
        return;
      }

      try {
        const response = await fetch(
          `/api/zcash-block/${targetBlockHeight}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!data.found || !data.hash) {
          return;
        }

        resolvingBlockRef.current = true;

        /*
          ZCASH HASH → VERIFIED POCKET
        */
        const pocket =
          verifyBlockHash(data.hash);

        if (pocket === null) {
          resolvingBlockRef.current = false;
          return;
        }

        setRoundBlockHash(data.hash);
        setRoundVerifiedPocket(pocket);

        setWaitingForBlock(false);

        /*
          FIND VERIFIED POCKET
          ON THE WHEEL
        */
        const resultIndex =
          wheelNumbers.findIndex(
            (number) => number === pocket
          );

        if (resultIndex === -1) {
          resolvingBlockRef.current = false;
          return;
        }

        /*
          START VISUAL SPIN
        */
        setSpinning(true);
        setResult(null);
        setOutcome(null);

        const segmentAngle =
          360 / wheelNumbers.length;

        setRotation((current) => {
          const currentPosition =
            current % 360;

          const targetPosition =
            -(resultIndex * segmentAngle);

          const adjustment =
            targetPosition -
            currentPosition;

          return (
            current +
            1440 +
            adjustment
          );
        });

        /*
          WAIT FOR WHEEL ANIMATION
        */
        setTimeout(() => {
          setSpinning(false);
          setResult(pocket);

          const resultColor =
            getResultColor(pocket);

          let won = false;

          if (roundBet === "RED") {
            won =
              resultColor === "RED";
          } else if (
            roundBet === "BLACK"
          ) {
            won =
              resultColor === "BLACK";
          } else if (
            roundBet === "ODD"
          ) {
            won =
              typeof pocket === "number" &&
              pocket !== 0 &&
              pocket % 2 !== 0;
          } else if (
            roundBet === "EVEN"
          ) {
            won =
              typeof pocket === "number" &&
              pocket !== 0 &&
              pocket % 2 === 0;
          }

          if (won) {
            setOutcome("WIN");

            if (roundWager !== null) {
              setBalance(
                (current) =>
                  current +
                  roundWager * 2
              );
            }
          } else {
            setOutcome("LOSS");
          }

          if (
            roundBet !== null &&
            roundWager !== null
          ) {
            setHistory((current) => [
              {
                result: pocket,
                bet: roundBet,
                amount: roundWager,
                outcome: won
                  ? "WIN"
                  : "LOSS",
              },
              ...current,
            ]);
          }

          resolvingBlockRef.current =
            false;
        }, 3000);
      } catch {
        /*
          If the request fails,
          keep waiting.

          The next check will retry.
        */
      }
    }

    checkTargetBlock();

    const interval = window.setInterval(
      checkTargetBlock,
      5000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    waitingForBlock,
    targetBlockHeight,
    roundBet,
    roundWager,
  ]);

  /*
    MAIN SPIN BUTTON

    NO Math.random().

    It locks the NEXT Zcash block.
  */
  async function handleSpin() {
    const wager = Number(betAmount);

    if (spinning) return;
    if (waitingForBlock) return;
    if (lockingRound) return;
    if (selectedBet === null) return;
    if (!Number.isFinite(wager)) return;
    if (wager < 1) return;
    if (wager > balance) return;

    setLockingRound(true);

    try {
      /*
        Get the latest block at the
        moment SPIN is clicked.
      */
      const response = await fetch(
        "/api/zcash-status",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        !data.connected ||
        typeof data.height !== "number"
      ) {
        setTestnetConnected(false);
        setLockingRound(false);
        return;
      }

      const currentBlock =
        data.height;

      const nextBlock =
        currentBlock + 1;

      setBlockHeight(currentBlock);

      setBestBlockHash(
        data.bestBlockHash ?? null
      );

      setTestnetConnected(true);

      /*
        FREEZE THIS ROUND'S
        TEST PREDICTION
      */
      setRoundBet(selectedBet);
      setRoundWager(wager);

      /*
        UPDATE TEST BALANCE
      */
      setBalance(
        (current) =>
          current - wager
      );

      /*
        LOCK FUTURE BLOCK
      */
      setTargetBlockHeight(
        nextBlock
      );

      setRoundBlockHash(null);
      setRoundVerifiedPocket(null);

      setResult(null);
      setOutcome(null);

      resolvingBlockRef.current =
        false;

      setWaitingForBlock(true);
      setLockingRound(false);
    } catch {
      setTestnetConnected(false);
      setLockingRound(false);
    }
  }

  return (
    <main className="game">

      {/* HEADER */}

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
              {blockHeight ?? "—"}
            </strong>
          </div>
        </div>
      </header>

      {/* ROULETTE WHEEL */}

      <section className="roulette-section">
        <RouletteWheel
          rotation={rotation}
          spinning={spinning}
        />

        {waitingForBlock ? (
          <p className="wheel-label">
            WAITING FOR ZCASH BLOCK{" "}
            {targetBlockHeight ?? "—"}
          </p>
        ) : result === null ? (
          <p className="wheel-label">
            {spinning
              ? "Spinning..."
              : "Waiting for spin"}
          </p>
        ) : (
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

            {outcome !== null && (
              <p className="round-outcome">
                {outcome}
              </p>
            )}
          </div>
        )}
      </section>

      {/* BLOCKCHAIN VERIFICATION */}

      <section className="verification-panel">
        <div className="verification-header">
          <span>
            BLOCKCHAIN VERIFICATION
          </span>

          <strong>
            {waitingForBlock
              ? "WAITING"
              : roundBlockHash
              ? "VERIFIED"
              : "READY"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Current Zcash Block
          </span>

          <strong>
            {blockHeight ?? "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Current Block Hash
          </span>

          <code>
            {bestBlockHash
              ? `${bestBlockHash.slice(
                  0,
                  16
                )}...`
              : "—"}
          </code>
        </div>

        <div className="verification-row">
          <span>
            Locked Block
          </span>

          <strong>
            {targetBlockHeight ?? "—"}
          </strong>
        </div>

        <div className="verification-row">
          <span>
            Round Hash
          </span>

          <code>
            {roundBlockHash
              ? `${roundBlockHash.slice(
                  0,
                  16
                )}...`
              : waitingForBlock
              ? "WAITING..."
              : "—"}
          </code>
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
      </section>

      {/* BET PANEL */}

      <section className="bet-panel">

        {/* NEW BETTING TIMER */}

        <div className="betting-timer">
          <span>
            BETTING CLOSES IN
          </span>

          <strong>
            00:
            {String(
              bettingTimeLeft
            ).padStart(2, "0")}
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
                          current || 0
                        ) - 1
                      )
                    )
                )
              }
              disabled={
                spinning ||
                waitingForBlock
              }
            >
              -
            </button>

            <input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(event) =>
                setBetAmount(
                  event.target.value
                )
              }
              disabled={
                spinning ||
                waitingForBlock
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
                        current || 0
                      ) + 1
                    )
                )
              }
              disabled={
                spinning ||
                waitingForBlock
              }
            >
              +
            </button>
          </div>
        </div>

        {/* PREDICTION */}

        <div className="prediction">
          <div className="prediction-header">
            <span>
              PREDICT THE RESULT
            </span>
          </div>

          <div className="simple-bet-options">

            <button
              className={
                selectedBet === "RED"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedBet(
                  "RED"
                )
              }
              disabled={
                spinning ||
                waitingForBlock
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
                spinning ||
                waitingForBlock
              }
            >
              BLACK
            </button>

            <button
              className={
                selectedBet === "ODD"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setSelectedBet(
                  "ODD"
                )
              }
              disabled={
                spinning ||
                waitingForBlock
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
                spinning ||
                waitingForBlock
              }
            >
              EVEN
            </button>

          </div>
        </div>

        {/* MAIN SPIN BUTTON */}

        <button
          className="spin-button"
          onClick={handleSpin}
          disabled={
            spinning ||
            waitingForBlock ||
            lockingRound ||
            selectedBet === null ||
            invalidBet ||
            !testnetConnected
          }
        >
          {lockingRound
            ? "LOCKING ROUND..."
            : waitingForBlock
            ? `WAITING FOR BLOCK ${targetBlockHeight}`
            : spinning
            ? "SPINNING..."
            : "SPIN"}
        </button>
      </section>

      {/* HISTORY */}

      <section className="history">
        <h2>
          Recent Spins
        </h2>

        {history.length === 0 ? (
          <div className="history-empty">
            No spins yet.
          </div>
        ) : (
          <div className="history-list">

            {history.map(
              (round, index) => (
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
