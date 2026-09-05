export type VerifiedRouletteResult =
  | number
  | "00";

const roulettePockets: VerifiedRouletteResult[] = [
  0,
  "00",
  1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
];

export async function verifyBlockHash(
  blockHash: string
): Promise<VerifiedRouletteResult | null> {
  if (!/^[0-9a-fA-F]+$/.test(blockHash)) {
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

  for (const value of bytes) {
    if (value > 227) {
      continue;
    }

    const group = Math.floor(value / 6);

    return roulettePockets[group];
  }

  return null;
}
