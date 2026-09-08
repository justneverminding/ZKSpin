"use client";

import { useEffect, useRef, useState } from "react";
import type { HistoryEntry } from "../lib/rouletteState";
import { explainRouletteResult } from "../lib/rouletteVerifier";

const demoPockets = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, "00", 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];

export default function ResultCalculation({ round, onClose }: {
  round: HistoryEntry;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [proof, setProof] = useState<Awaited<ReturnType<typeof explainRouletteResult>>>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    if (round.blockHash) {
      explainRouletteResult(round.blockHash).then(value => {
        if (active) { setProof(value); setError(!value); }
      }).catch(() => { if (active) setError(true); });
    }
    return () => { active = false; };
  }, [round]);

  const index = round.demoDraw === undefined ? null : Math.floor(round.demoDraw * 38);
  return (
    <dialog ref={dialog} className="calculation-dialog" onClose={onClose}
      aria-labelledby="calculation-title">
      <header>
        <h2 id="calculation-title">{round.mode === "DEMO" ? "Demo" : "Testnet"} result calculation</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close calculation">×</button>
      </header>
      <p className="calculation-result">{round.result} · {round.resultColor}</p>
      <p>Played: <time dateTime={new Date(round.timestamp).toISOString()}>{new Date(round.timestamp).toLocaleString()}</time></p>
      {round.mode === "DEMO" ? (
        <>
          <p>A browser Math.random() draw between 0 (inclusive) and 1 (exclusive) selects one of 38 wheel positions.</p>
          {index === null ? <p>The original random draw was not saved for this older round.</p> : <>
            <p>Random draw: <code>{round.demoDraw}</code></p>
            <p>Position (zero-based): <code>floor({round.demoDraw} × 38) = {index}</code></p>
            <p>Wheel position {index} gives <strong>{demoPockets[index]}</strong>.</p>
            <p>{demoPockets[index] === round.result ? "Matches the recorded result." : "Does not match the recorded result."}</p>
          </>}
          <p>Wheel order: <code>{demoPockets.join(", ")}</code></p>
          <p>Demo draws are local and cannot be independently verified on the blockchain.</p>
        </>
      ) : (
        <>
          <p>Block {round.blockHeight}: <code>{round.blockHash}</code></p>
          <p>The saved testnet block hash is the input. SHA-256 hashes the complete prefixed input again before the pocket is selected.</p>
          {error ? <p>The calculation could not be reconstructed.</p> : !proof ? <p>Calculating SHA-256...</p> : <>
            <p>1. Encode this input as UTF-8: <code>{proof.input}</code></p>
            <p>2. SHA-256 digest: <code>{proof.digest}</code></p>
            <p>3. Read bytes from left to right, skipping values above 227. Rejected bytes: <code>{proof.rejected.length ? proof.rejected.join(", ") : "None"}</code>. First accepted byte: <strong>{proof.byte}</strong>.</p>
            <p>4. Position: <code>floor({proof.byte} / 6) = {proof.index}</code>. Each of 38 positions gets six of the 228 accepted byte values.</p>
            <p>5. Map position {proof.index} into <code>[0, 00, 1, 2, ..., 36]</code>: <strong>{proof.pocket}</strong>.</p>
            <p>{proof.pocket === round.result ? "Matches the recorded result." : "Does not match the recorded result."}</p>
          </>}
        </>
      )}
      <p>Bet: {round.bet} · Wager: {round.amount} ZEC · {round.outcome}</p>
      <p>Return: {round.outcome === "WIN" ? `${round.amount} × 2 = ${round.amount * 2}` : "0"} ZEC.
        Net change: {round.outcome === "WIN" ? `${round.amount * 2} − ${round.amount} = +${round.amount}` : `0 − ${round.amount} = −${round.amount}`} ZEC.</p>
      <p>Red/black and odd/even pay 1:1. Both 0 and 00 lose these bets. A win returns twice the wager including the original stake; a loss returns zero.</p>
    </dialog>
  );
}
