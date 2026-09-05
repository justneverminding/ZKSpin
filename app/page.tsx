"use client";
import { useEffect, useState } from "react";
import RouletteWheel from "../components/RouletteWheel";
type RouletteResult = number | "00";

const wheelNumbers: RouletteResult[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17,
  5, 22, 34, 15, 3, 24, 36, 13, 1, "00",
  27, 10, 25, 29, 12, 8, 19, 31, 18, 6,
  21, 33, 16, 4, 23, 35, 14, 2
];

const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36
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

const wagerAmount = Number(betAmount);

const invalidBet =
  betAmount.trim() === "" ||
  !Number.isFinite(wagerAmount) ||
  wagerAmount < 1 ||
  wagerAmount > balance;
  
 const [history, setHistory] = useState<
  {
    result: RouletteResult;
    bet: "RED" | "BLACK" | "ODD" | "EVEN";
    amount: number;
    outcome: "WIN" | "LOSS";
  }[]
>([]);

    const [selectedBet, setSelectedBet] =
  useState<"RED" | "BLACK" | "ODD" | "EVEN" | null>(null);
  const [outcome, setOutcome] =
  useState<"WIN" | "LOSS" | null>(null);
  
  useEffect(() => {
  async function loadZcashStatus() {
    try {
      const response = await fetch("/api/zcash-status");
      const data = await response.json();

      setBlockHeight(data.height);
      setTestnetConnected(data.connected);
    } catch {
      setBlockHeight(null);
      setTestnetConnected(false);
    }
  }

  loadZcashStatus();
}, []);

  function handleSpin() {
  const wager = Number(betAmount);

if (spinning) return;
if (selectedBet === null) return;
if (!Number.isFinite(wager)) return;
if (wager < 1) return;
if (wager > balance) return;

setBalance((current) => current - wager);

  setSpinning(true);
  setResult(null);
  setOutcome(null);

  const resultIndex = Math.floor(
    Math.random() * wheelNumbers.length
  );
  const resultNumber = wheelNumbers[resultIndex];


  const segmentAngle = 360 / wheelNumbers.length;

  setRotation((current) => {
    const currentPosition = current % 360;
    const targetPosition = -(resultIndex * segmentAngle);

    const adjustment =
      targetPosition - currentPosition;

    return current + 1440 + adjustment;
  });

 setTimeout(() => {
  setSpinning(false);
  setResult(resultNumber);
   
const resultColor = getResultColor(resultNumber);

let won = false;

if (selectedBet === "RED") {
  won = resultColor === "RED";
} else if (selectedBet === "BLACK") {
  won = resultColor === "BLACK";
} else if (selectedBet === "ODD") {
  won =
    typeof resultNumber === "number" &&
    resultNumber !== 0 &&
    resultNumber % 2 !== 0;
} else if (selectedBet === "EVEN") {
  won =
    typeof resultNumber === "number" &&
    resultNumber !== 0 &&
    resultNumber % 2 === 0;
}

if (won) {
  setOutcome("WIN");

  setBalance((current) =>
    current + wager * 2
  );
} else {
  setOutcome("LOSS");
}
setHistory((current) => [
  {
    result: resultNumber,
    bet: selectedBet,
    amount: wager,
    outcome: won ? "WIN" : "LOSS",
  },
  ...current,
]);
}, 3000);
}
  
  return (
    <main className="game">
      
      <header className="topbar">
        <div>
          <h1 className="brand">ZKSPIN</h1>
          <p className="subtitle">Zero Knowledge Roulette</p>
        </div>

        <div className="topbar-info">
  <div className="balance">
    <span>Balance</span>
    <strong>{balance} TEST ZEC</strong>
  </div>

 <div className="network-status">
  <span>
    ZCASH TESTNET •{" "}
    {testnetConnected ? "CONNECTED" : "OFFLINE"}
  </span>

  <strong>
    BLOCK: {blockHeight ?? "—"}
  </strong>
</div>

</div>
        
</header>

      <section className="roulette-section">
        <RouletteWheel
  rotation={rotation}
  spinning={spinning}
/>

     {result === null ? (
  <p className="wheel-label">
    {spinning ? "Spinning..." : "Waiting for spin"}
  </p>
) : (
  <div className="spin-result">
    <span>RESULT</span>
    <strong>{result}</strong>
    <em>{getResultColor(result)}</em>

    {outcome !== null && (
      <p className="round-outcome">
        {outcome}
      </p>
    )}
  </div>
)}
      </section>

      <section className="bet-panel">
        <div className="bet-amount">
          <span>Bet amount</span>

        <div className="amount-control">
  <button
    onClick={() =>
      setBetAmount((current) =>
        String(
          Math.max(
            1,
            Number(current || 0) - 1
          )
        )
      )
    }
    disabled={spinning}
  >
    -
  </button>

  <input
    type="number"
    min="1"
    step="1"
    value={betAmount}
    onChange={(event) =>
      setBetAmount(event.target.value)
    }
    disabled={spinning}
  />

  <span>TEST ZEC</span>

  <button
    onClick={() =>
      setBetAmount((current) =>
        String(Number(current || 0) + 1)
      )
    }
    disabled={spinning}
  >
    +
  </button>
</div>
        </div>

       <div className="prediction">
  <div className="prediction-header">
    <span>PREDICT THE RESULT</span>
  </div>

  <div className="simple-bet-options">
    <button
  className={selectedBet === "RED" ? "selected" : ""}
  onClick={() => setSelectedBet("RED")}
  disabled={spinning}
>
  RED
</button>
    
    <button
  className={selectedBet === "BLACK" ? "selected" : ""}
  onClick={() => setSelectedBet("BLACK")}
  disabled={spinning}
>
  BLACK
</button>
    
    <button
  className={selectedBet === "ODD" ? "selected" : ""}
  onClick={() => setSelectedBet("ODD")}
  disabled={spinning}
>
  ODD
</button>
    
    <button
  className={selectedBet === "EVEN" ? "selected" : ""}
  onClick={() => setSelectedBet("EVEN")}
  disabled={spinning}
>
  EVEN
</button>
  </div>
</div>
  <button
  className="spin-button"
  onClick={handleSpin}
  disabled={
    spinning ||
    selectedBet === null ||
    invalidBet
  }
>
  {spinning ? "SPINNING..." : "SPIN"}
</button>
      </section>

      <section className="history">
  <h2>Recent Spins</h2>

  {history.length === 0 ? (
    <div className="history-empty">
      No spins yet.
    </div>
  ) : (
    <div className="history-list">
      {history.map((round, index) => (
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
    BET: {round.bet} • {round.amount} TEST ZEC
  </span>

  <p>
    RESULT: {getResultColor(round.result)}
  </p>

<strong
  className={
    round.outcome === "WIN"
      ? "history-win"
      : "history-loss"
  }
>
  {round.outcome === "WIN"
    ? `WIN • +${round.amount} TEST ZEC`
    : `LOSS • -${round.amount} TEST ZEC`}
</strong>
</div>
  </div>
))}
    </div>
  )}
</section>
    </main>
  );
}
