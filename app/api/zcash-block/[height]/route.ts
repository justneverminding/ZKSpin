import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CIPHERSCAN_INFO_URL =
  "https://api.testnet.cipherscan.app/api/blockchain-info";

export async function GET(
  request: Request,
  { params }: { params: { height: string } }
) {
  try {
    const targetHeight =
      Number(params.height);

    if (
      !Number.isInteger(targetHeight) ||
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
        }
      );
    }

    /*
      Get current Zcash testnet tip.
    */
    const infoResponse =
      await fetch(
        CIPHERSCAN_INFO_URL,
        {
          cache: "no-store",
        }
      );

    if (!infoResponse.ok) {
      return NextResponse.json({
        connected: false,
        status: "SOURCE_UNAVAILABLE",
        found: false,
        hash: null,
        tipHeight: null,
        confirmationDepth: 0,
        error: `CipherScan blockchain-info returned HTTP ${infoResponse.status}`,
      });
    }

    const infoData =
      await infoResponse.json();

    const tipHeight =
      typeof infoData?.blocks ===
      "number"
        ? infoData.blocks
        : null;

    if (tipHeight === null) {
      return NextResponse.json({
        connected: false,
        status: "SOURCE_UNAVAILABLE",
        found: false,
        hash: null,
        tipHeight: null,
        confirmationDepth: 0,
        error:
          "CipherScan returned invalid blockchain-info data",
      });
    }

    /*
      The source tip has not reached
      our locked block yet.
    */
    if (
      tipHeight < targetHeight
    ) {
      return NextResponse.json({
        connected: true,
        status: "NOT_MINED",
        found: false,
        hash: null,
        tipHeight,
        confirmationDepth: 0,
        error: null,
      });
    }

    /*
      The chain tip says the target
      height should exist.

      Now request that exact block.
    */
    const blockResponse =
      await fetch(
        `https://api.testnet.cipherscan.app/api/block/${targetHeight}`,
        {
          cache: "no-store",
        }
      );

    /*
      Tip is already at/past target,
      but target block lookup is not
      available yet.

      Treat this as source lag.
    */
    if (!blockResponse.ok) {
      return NextResponse.json({
        connected: true,
        status: "DATA_SOURCE_LAG",
        found: false,
        hash: null,
        tipHeight,
        confirmationDepth: 0,
        error: null,
      });
    }

    const blockData =
      await blockResponse.json();

    const blockHash =
      typeof blockData?.hash ===
      "string"
        ? blockData.hash
        : typeof blockData?.data
            ?.hash === "string"
        ? blockData.data.hash
        : null;

    if (!blockHash) {
      return NextResponse.json({
        connected: true,
        status: "DATA_SOURCE_LAG",
        found: false,
        hash: null,
        tipHeight,
        confirmationDepth: 0,
        error: null,
      });
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

    return NextResponse.json({
      connected: true,
      status: "FOUND",
      found: true,
      hash:
        blockHash.toLowerCase(),
      tipHeight,
      confirmationDepth,
      error: null,
    });
  } catch (error) {
    console.error(
      "CipherScan block lookup error:",
      error
    );

    return NextResponse.json({
      connected: false,
      status: "SOURCE_UNAVAILABLE",
      found: false,
      hash: null,
      tipHeight: null,
      confirmationDepth: 0,
      error:
        "Unable to reach CipherScan block source",
    });
  }
}
