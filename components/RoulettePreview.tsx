"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCw } from "lucide-react";
import RouletteWheel from "./RouletteWheel";
import s from "../app/home.module.css";

export default function RoulettePreview() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(false);
  const [selection, setSelection] = useState("RED");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(false);
    // Pocket 9 is at index 2 in the actual wheel component.
    setRotation(current => current + 1440 - (current % 360) - 2 * 360 / 38);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => { setSpinning(false); setResult(true); }, reduced ? 50 : 3000);
  }

  return <div className={s.previewStage}>
    <div className={s.previewWheel} aria-hidden="true"><RouletteWheel rotation={rotation} spinning={spinning} /></div>
    <div className={s.previewControls}>
      <div className={s.previewStatus}><span className={s.statusDot} /> INTERACTIVE PREVIEW <span>NO WAGER</span></div>
      <p className={s.previewTitle}>Make a little prediction.</p>
      <div className={s.sampleOptions} aria-label="Sample prediction">{["RED", "BLACK", "ODD", "EVEN"].map(option => <button key={option} type="button" disabled={spinning} aria-pressed={selection === option} onClick={() => setSelection(option)}><span data-color={option} />{option}</button>)}</div>
      <button type="button" className={s.primary} disabled={spinning} onClick={spin}>{spinning ? "Spinning..." : "Spin Preview"}<RotateCw size={18} className={spinning ? s.rotating : undefined} /></button>
      <div className={s.sampleResult} aria-live="polite"><span className={s.sampleNumber}>{result ? "9" : "—"}</span><div><strong>{spinning ? "A moment of possibility." : result ? "Sample result · 9 RED" : "A preview of the reveal."}</strong><p>{result ? `${selection === "RED" || selection === "ODD" ? "Your sample selection matches." : "Your sample selection doesn't match."} The preview always lands on 9.` : "Visual demonstration. No balance or network activity."}</p></div><ArrowRight size={16} /></div>
    </div>
  </div>;
}
