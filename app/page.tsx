"use client";
import { useState } from "react";
import RouletteWheel from "../components/RouletteWheel";
const wheelNumbers = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
  6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26
];
const predictionNumbers = Array.from(
  { length: 37 },
  (_, index) => index
);
const redNumbers = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36
]);

function getResultColor(number: number) {
  if (number === 0) return "GREEN";
  if (redNumbers.has(number)) return "RED";
  return "BLACK";
}
export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const [betAmount, setBetAmount] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [selectedNumber, setSelectedNumber] =
  useState<number | null>(null);
    const [selectedBet, setSelectedBet] =
  useState<"RED" | "BLACK" | "ODD" | "EVEN" | null>(null);
  const [outcome, setOutcome] =
  useState<"WIN" | "LOSS" | null>(null);

  function handleSpin() {
  if (spinning) return;
  if (selectedBet === null) return;

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

const won =
  selectedBet === resultColor ||
  (selectedBet === "ODD" &&
    resultNumber !== 0 &&
    resultNumber % 2 !== 0) ||
  (selectedBet === "EVEN" &&
    resultNumber !== 0 &&
    resultNumber % 2 === 0);

if (won) {
  setOutcome("WIN");
} else {
  setOutcome("LOSS");
}
  setHistory((current) => [
    resultNumber,
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

        <div className="balance">
          <span>Balance</span>
          <strong>100 TEST ZEC</strong>
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
      setBetAmount((current) => Math.max(1, current - 1))
    }
    disabled={spinning}
  >
    -
  </button>

  <strong>{betAmount} TEST ZEC</strong>

  <button
    onClick={() =>
      setBetAmount((current) => current + 1)
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
  disabled={spinning || selectedBet === null}
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
      {history.map((number, index) => (
        <div
          className="history-item"
          key={`${number}-${index}`}
        >
         <div className={`history-number ${getResultColor(number).toLowerCase()}`}>
  {number}
</div>

<span>{getResultColor(number)}</span>
        </div>
      ))}
    </div>
  )}
</section>
    </main>
  );
}
