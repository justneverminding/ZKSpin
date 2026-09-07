import "server-only";

const CIPHERSCAN_BASE_URL = "https://api.testnet.cipherscan.app";
const UPSTREAM_TIMEOUT_MS = 8_000;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isBlockHeight(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isBlockHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

export async function fetchCipherScan(path: string): Promise<Response> {
  return fetch(new URL(path, CIPHERSCAN_BASE_URL), {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

export async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.toLowerCase().includes("application/json")) {
    throw new TypeError("CipherScan returned a non-JSON response");
  }

  return response.json() as Promise<unknown>;
}
