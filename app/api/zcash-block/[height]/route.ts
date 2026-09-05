import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { height: string } }
) {
  try {
    const targetHeight = Number(params.height);

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
      First get the latest known block.

      This lets us determine whether the
      requested block has been mined yet.
    */

    const latestResponse =
      await fetch(
        "https://api.cipherscan.app/api/v1/zcash/testnet/block/latest",
        {
          cache: "no-store",
        }
      );

    if (!latestResponse.ok) {
      return NextResponse.json({
        connected: false,
        status: "SOURCE_UNAVAILABLE",
        found: false,
        hash: null,
        tipHeight: null,
        confirmationDepth: 0,
        error: `Latest block source returned HTTP ${latestResponse.status}`,
      });
    }

    const latestData =
      await latestResponse.json();

    const tipHeight =
      typeof latestData?.height ===
      "number"
        ? latestData.height
        : typeof latestData?.data
            ?.height === "number"
        ? latestData.data.height
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
          "Latest block source returned invalid data",
      });
    }

    /*
      The target block has not been mined yet.

      The blockchain tip has not reached
      the locked round block.
    */

    if (tipHeight < targetHeight) {
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
      Fetch the specific locked block.

      CipherScan's block endpoint may differ
      from the latest block endpoint.
    */

    const blockResponse =
      await fetch(
        `https://api.testnet.cipherscan.app/api/block/${targetHeight}`,
        {
          cache: "no-store",
        }
      );

    /*
      The latest endpoint says the chain has
      reached this height, but the block endpoint
      cannot provide the block yet.

      This is treated as source lag rather than
      declaring the round failed.
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
        : typeof blockData?.data?.hash ===
          "string"
        ? blockData.data.hash
        : null;

    /*
      The endpoint responded, but no usable hash
      was returned.

      Treat this as data source lag.
    */

    if (blockHash === null) {
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
      Confirmation depth:

      Target block itself = 1 confirmation.

      Example:

      tip = 100
      target = 100

      depth = 1

      tip = 101
      target = 100

      depth = 2
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
      hash: blockHash.toLowerCase(),
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
