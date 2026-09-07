import { describe, expect, it } from "vitest";

import { deriveRouletteResult } from "./rouletteVerifier";

describe("deriveRouletteResult", () => {
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
