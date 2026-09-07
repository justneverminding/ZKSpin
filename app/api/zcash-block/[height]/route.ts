import { NextResponse } from "next/server";
import {
  fetchCipherScan,
  isBlockHash,
  isBlockHeight,
  isRecord,
  isTimeoutError,
  readJson,
} from "../../../../lib/cipherScan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const responseHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ height: string }> }
) {
  try {
    const { height } =
      await params;

    const targetHeight =
      Number(height);

    if (
      !Number.isSafeInteger(targetHeight) ||
      targetHeight < 0
    ) {
      return NextResponse.json(
        {
          connected: false,
          status: "SOURCE_UNAVAILABLE",
          found: false,
          hash: null,
          tipHeight: null,
          confirmationDepth: 0,
          error: "Invalid block height",
        },
        {
          status: 400,
          headers: responseHeaders,
        }
      );
    }

    /*
      Get current Zcash testnet tip.
    */
    const infoResponse =
      await fetchCipherScan(
        "/api/blockchain-info"
      );

    if (!infoResponse.ok) {
      return NextResponse.json(
        {
          connected: false,
          status: "SOURCE_UNAVAILABLE",
          found: false,
          hash: null,
          tipHeight: null,
          confirmationDepth: 0,
          error: `CipherScan blockchain-info returned HTTP ${infoResponse.status}`,
        },
        {
          status: 502,
          headers: responseHeaders,
        }
      );
    }

    const infoData =
      await readJson(infoResponse);

    const tipHeight =
      isRecord(infoData) &&
      isBlockHeight(infoData.blocks)
        ? infoData.blocks
        : null;

    if (tipHeight === null) {
      return NextResponse.json(
        {
          connected: false,
          status: "SOURCE_UNAVAILABLE",
          found: false,
          hash: null,
          tipHeight: null,
          confirmationDepth: 0,
          error:
            "CipherScan returned invalid blockchain-info data",
        },
        {
          status: 502,
          headers: responseHeaders,
        }
      );
    }

    /*
      The source tip has not reached
      our locked block yet.
    */
    if (
      tipHeight < targetHeight
    ) {
      return NextResponse.json(
        {
          connected: true,
          status: "NOT_MINED",
          found: false,
          hash: null,
          tipHeight,
          confirmationDepth: 0,
          error: null,
        },
        { headers: responseHeaders }
      );
    }

    /*
      The chain tip says the target
      height should exist.

      Now request that exact block.
    */
    const blockResponse =
      await fetchCipherScan(
        `/api/block/${targetHeight}`
      );

    /*
      Tip is already at/past target,
      but target block lookup is not
      available yet.

      Treat this as source lag.
    */
    if (!blockResponse.ok) {
      if (
        blockResponse.status !==
        404
      ) {
        return NextResponse.json(
          {
            connected: false,
            status: "SOURCE_UNAVAILABLE",
            found: false,
            hash: null,
            tipHeight,
            confirmationDepth: 0,
            error: `CipherScan block lookup returned HTTP ${blockResponse.status}`,
          },
          {
            status: 502,
            headers: responseHeaders,
          }
        );
      }

      return NextResponse.json(
        {
          connected: true,
          status: "DATA_SOURCE_LAG",
          found: false,
          hash: null,
          tipHeight,
          confirmationDepth: 0,
          error: null,
        },
        { headers: responseHeaders }
      );
    }

    const blockData =
      await readJson(blockResponse);

    const nestedBlockData =
      isRecord(blockData) &&
      isRecord(blockData.data)
        ? blockData.data
        : null;

    const blockHash =
      isRecord(blockData) &&
      isBlockHash(blockData.hash)
        ? blockData.hash
        : nestedBlockData &&
          isBlockHash(nestedBlockData.hash)
        ? nestedBlockData.hash
        : null;

    if (!blockHash) {
      return NextResponse.json(
        {
          connected: true,
          status: "DATA_SOURCE_LAG",
          found: false,
          hash: null,
          tipHeight,
          confirmationDepth: 0,
          error: null,
        },
        { headers: responseHeaders }
      );
    }

    /*
      Actual block depth.

      target = 100
      tip = 100
      => 1 confirmation

      target = 100
      tip = 101
      => 2 confirmations
    */
    const confirmationDepth =
      Math.max(
        1,
        tipHeight -
          targetHeight +
          1
      );

    return NextResponse.json(
      {
        connected: true,
        status: "FOUND",
        found: true,
        hash:
          blockHash.toLowerCase(),
        tipHeight,
        confirmationDepth,
        error: null,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    console.error(
      "CipherScan block lookup error:",
      error
    );

    return NextResponse.json(
      {
        connected: false,
        status: "SOURCE_UNAVAILABLE",
        found: false,
        hash: null,
        tipHeight: null,
        confirmationDepth: 0,
        error: isTimeoutError(error)
          ? "CipherScan request timed out"
          : "Unable to reach CipherScan block source",
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
