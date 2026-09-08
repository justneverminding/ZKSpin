"use client";
import { useState } from "react";
import RouletteWheel from "./RouletteWheel";
import s from "../app/home.module.css";
export default function RoulettePreview() {
  const [rotation, setRotation] = useState(0);
  return <div className={s.previewWheel}><RouletteWheel rotation={rotation} /><button type="button" onClick={() => setRotation(value => value + 1440 + 360 / 38 * 7)}>Preview a spin <span aria-hidden="true">↻</span></button><p>Illustrative preview · No wager</p></div>;
}
