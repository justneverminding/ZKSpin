import { describe, expect, it } from "vitest";

import { deriveRouletteResult, explainRouletteResult } from "./rouletteVerifier";

describe("deriveRouletteResult", () => {
  it("exposes the exact digest bytes used to calculate a result", async () => {
    const hash = "0".repeat(64);
    const proof = await explainRouletteResult(hash);
    expect(proof).not.toBeNull();
    expect(proof!.input).toBe(`zkspin:v1:${hash}`);
    expect(proof!.digest).toMatch(/^[0-9a-f]{64}$/);
    const bytes = proof!.digest.match(/../g)!.map(byte => parseInt(byte, 16));
    const acceptedIndex = bytes.findIndex(byte => byte <= 227);
    expect(proof!.rejected).toEqual(bytes.slice(0, acceptedIndex));
    expect(proof!.byte).toBe(bytes[acceptedIndex]);
    expect(proof!.index).toBe(Math.floor(bytes[acceptedIndex] / 6));
    expect(proof!.pocket).toBe(18);
  });
  it.each([
    ["0".repeat(64), 18],
    ["f".repeat(64), 10],
    ["0123456789abcdef".repeat(4), 10],
  ])("maps a known hash to its expected pocket", async (hash, pocket) => {
    await expect(deriveRouletteResult(hash)).resolves.toBe(pocket);
  });

  it("normalizes hexadecimal letter case", async () => {
    const lowerHash = "abcdef0123456789".repeat(4);

    await expect(deriveRouletteResult(lowerHash.toUpperCase())).resolves.toBe(
      await deriveRouletteResult(lowerHash)
    );
  });

  it.each(["", "0".repeat(63), "0".repeat(65), `${"0".repeat(63)}g`])(
    "rejects malformed block hash %j",
    async (hash) => {
      await expect(deriveRouletteResult(hash)).resolves.toBeNull();
    }
  );
});
