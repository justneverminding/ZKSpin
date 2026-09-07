import { NextResponse } from "next/server";
import {
  fetchCipherScan,
  isBlockHash,
  isBlockHeight,
  isRecord,
  isTimeoutError,
  readJson,
} from "../../../lib/cipherScan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const responseHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const response = await fetchCipherScan(
      "/api/blockchain-info"
    );

    if (!response.ok) {
      console.error(
        "CipherScan status error:",
        response.status,
        response.statusText
      );

      return NextResponse.json(
        {
          network: "testnet",
          connected: false,
          height: null,
          bestBlockHash: null,
          source: "CipherScan",
          error: `CipherScan returned HTTP ${response.status}`,
        },
        {
          status: 502,
          headers: responseHeaders,
        }
      );
    }

    const data =
      await readJson(response);

    const height =
      isRecord(data) &&
      isBlockHeight(data.blocks)
        ? data.blocks
        : null;

    const bestBlockHash =
      isRecord(data) &&
      isBlockHash(data.bestblockhash)
        ? data.bestblockhash
        : null;

    if (
      height === null ||
      bestBlockHash === null
    ) {
      console.error(
        "CipherScan returned unexpected status data:",
        data
      );

      return NextResponse.json(
        {
          network: "testnet",
          connected: false,
          height: null,
          bestBlockHash: null,
          source: "CipherScan",
          error:
            "CipherScan returned invalid blockchain data",
        },
        {
          status: 502,
          headers: responseHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        network: "testnet",
        connected: true,
        height,
        bestBlockHash:
          bestBlockHash.toLowerCase(),
        source: "CipherScan",
        error: null,
      },
      {
        headers: responseHeaders,
      }
    );
  } catch (error) {
    console.error(
      "CipherScan status error:",
      error
    );

    return NextResponse.json(
      {
        network: "testnet",
        connected: false,
        height: null,
        bestBlockHash: null,
        source: "CipherScan",
        error: isTimeoutError(error)
          ? "CipherScan request timed out"
          : "Unable to reach CipherScan",
      },
      {
        status: isTimeoutError(error)
          ? 504
          : 502,
        headers: responseHeaders,
      }
    );
  }
}
