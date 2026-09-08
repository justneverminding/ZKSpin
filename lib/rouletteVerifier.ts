export type DerivedRouletteResult =
  | number
  | "00";

const roulettePockets: DerivedRouletteResult[] = [
  0,
  "00",
  1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
];

export async function deriveRouletteResult(
  blockHash: string
): Promise<DerivedRouletteResult | null> {
  return (await explainRouletteResult(blockHash))?.pocket ?? null;
}

export async function explainRouletteResult(blockHash: string) {
  if (!/^[0-9a-fA-F]{64}$/.test(blockHash)) {
    return null;
  }

  /*
   * IMPORTANT:
   *
   * We do NOT use the raw Zcash block hash directly.
   *
   * Zcash block hashes are proof-of-work hashes, so their
   * leading bytes are affected by the mining target.
   *
   * Instead we hash the complete block hash again.
   *
   * This gives us a fresh deterministic SHA-256 digest
   * derived from the Zcash block hash.
   */

  const encoder = new TextEncoder();

  const input = encoder.encode(
    `zkspin:v1:${blockHash.toLowerCase()}`
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    input
  );

  const bytes = new Uint8Array(digest);

  /*
   * Rejection sampling:
   *
   * 0–227 = 228 usable values
   * 228–255 = rejected
   *
   * 228 / 38 = 6
   *
   * Therefore every roulette pocket receives
   * exactly 6 possible byte values.
   */

  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i];

    if (value > 227) {
      continue;
    }

    const group = Math.floor(value / 6);

    return {
      input: `zkspin:v1:${blockHash.toLowerCase()}`,
      digest: Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""),
      rejected: Array.from(bytes.slice(0, i)),
      byte: value,
      index: group,
      pocket: roulettePockets[group],
    };
  }

  return null;
}
