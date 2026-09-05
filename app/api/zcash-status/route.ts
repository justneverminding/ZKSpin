import { NextResponse } from "next/server";

const CIPHERSCAN_STATUS_URL =
  "https://api.testnet.cipherscan.app/api/blockchain-info";

export async function GET(
  request: Request,
  { params }: { params: { height: string } }
) {
  try {
    const height =
      Number(params.height);

    if (
      !Number.isInteger(height) ||
      height < 0
    ) {
      return NextResponse.json(
        {
          connected: false,
          found: false,
          status: "INVALID_HEIGHT",
          targetHeight: null,
          tipHeight: null,
          hash: null,
          source: "CipherScan",
        },
        {
          status: 400,
        }
      );
    }

    const [
      blockResponse,
      statusResponse,
    ] =
      await Promise.all([
        fetch(
          `https://api.testnet.cipherscan.app/api/blocks/${height}`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          CIPHERSCAN_STATUS_URL,
          {
            cache: "no-store",
          }
        ),
      ]);

    if (
      !statusResponse.ok
    ) {
      return NextResponse.json(
        {
          connected: false,
          found: false,
          status:
            "SOURCE_UNAVAILABLE",
          targetHeight: height,
          tipHeight: null,
          hash: null,
          source: "CipherScan",
        },
        {
          status: 503,
        }
      );
    }

    const statusData =
      await statusResponse.json();

    const tipHeight =
      typeof statusData.blocks ===
      "number"
        ? statusData.blocks
        : null;

    if (
      tipHeight === null
    ) {
      return NextResponse.json(
        {
          connected: false,
          found: false,
          status:
            "SOURCE_UNAVAILABLE",
          targetHeight: height,
          tipHeight: null,
          hash: null,
          source: "CipherScan",
        },
        {
          status: 503,
        }
      );
    }

    if (
      !blockResponse.ok
    ) {
      if (
        tipHeight < height
      ) {
        return NextResponse.json({
          connected: true,
          found: false,
          status:
            "NOT_MINED",
          targetHeight: height,
          tipHeight,
          hash: null,
          source: "CipherScan",
        });
      }

      return NextResponse.json({
        connected: true,
        found: false,
        status:
          "DATA_SOURCE_LAG",
        targetHeight: height,
        tipHeight,
        hash: null,
        source: "CipherScan",
      });
    }

    const blockData =
      await blockResponse.json();

    const hash =
      typeof blockData.hash ===
      "string"
        ? blockData.hash.toLowerCase()
        : null;

    if (!hash) {
      return NextResponse.json({
        connected: true,
        found: false,
        status:
          "DATA_SOURCE_LAG",
        targetHeight: height,
        tipHeight,
        hash: null,
        source: "CipherScan",
      });
    }

    const confirmationDepth =
      Math.max(
        1,
        tipHeight -
          height +
          1
      );

    return NextResponse.json({
      connected: true,
      found: true,
      status: "FOUND",
      targetHeight: height,
      tipHeight,
      confirmationDepth,
      hash,
      source: "CipherScan",
    });
  } catch (error) {
    console.error(
      "CipherScan block lookup error:",
      error
    );

    return NextResponse.json(
      {
        connected: false,
        found: false,
        status:
          "SOURCE_UNAVAILABLE",
        targetHeight:
          Number(params.height) ||
          null,
        tipHeight: null,
        hash: null,
        source: "CipherScan",
      },
      {
        status: 503,
      }
    );
  }
}
