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
  const [history, setHistory] = useState<number[]>([]);
  const [selectedNumber, setSelectedNumber] =
  useState<number | null>(null);

  function handleSpin() {
  if (spinning) return;

  setSpinning(true);
  setResult(null);

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
  </div>
)}
      </section>

      <section className="bet-panel">
        <div className="bet-amount">
          <span>Bet amount</span>

          <div className="amount-control">
            <button>-</button>
            <strong>1 TEST ZEC</strong>
            <button>+</button>
          </div>
        </div>

       <div className="prediction">
  <div className="prediction-header">
    <span>PREDICT THE RESULT</span>
  </div>

  <div className="simple-bet-options">
    <button>RED</button>
    <button>BLACK</button>
    <button>ODD</button>
    <button>EVEN</button>
  </div>
</div>
        <button
  className="spin-button"
  onClick={handleSpin}
  disabled={spinning}
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
