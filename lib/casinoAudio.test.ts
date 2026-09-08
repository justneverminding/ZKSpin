import { describe, expect, it } from "vitest";
import { DEFAULT_SOUND, parseSoundPreferences, renderCue, renderLounge } from "./casinoAudio";

describe("sound preferences", () => {
  it("defaults safely for missing or malformed storage", () => {
    for (const value of [null, "{", "null", "[]", '{"enabled":"yes"}']) expect(parseSoundPreferences(value)).toEqual(DEFAULT_SOUND);
  });
  it("preserves mute and clamps valid numeric levels", () => {
    expect(parseSoundPreferences('{"enabled":false,"music":-2,"effects":4}')).toEqual({ enabled: false, music: 0, effects: 1 });
    expect(parseSoundPreferences('{"enabled":true,"music":"loud","effects":null}')).toEqual(DEFAULT_SOUND);
  });
});

describe("original synthesized sound", () => {
  it("renders a finite, audible, non-clipping lounge loop", () => {
    const samples = renderLounge(22050);
    expect(samples.length).toBe(Math.ceil(60 / 88 * 24 * 22050));
    let energy = 0;
    let peak = 0;
    for (const sample of samples) { expect(Number.isFinite(sample)).toBe(true); energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
    expect(Math.sqrt(energy / samples.length)).toBeGreaterThan(0.01);
    expect(peak).toBeLessThan(0.9);
    expect(Math.abs(samples[0] - samples.at(-1)!)).toBeLessThan(0.02);
  });
  it.each(["spin", "chip", "win", "loss"] as const)("renders a bounded %s cue", cue => {
    const samples = renderCue(cue, 22050);
    let peak = 0;
    for (const sample of samples) { expect(Number.isFinite(sample)).toBe(true); peak = Math.max(peak, Math.abs(sample)); }
    expect(peak).toBeGreaterThan(0.02);
    expect(peak).toBeLessThan(1);
    if (cue === "spin") expect(samples.length).toBe(66150);
  });
});
