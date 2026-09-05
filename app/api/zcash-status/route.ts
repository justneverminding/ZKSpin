import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CIPHERSCAN_URL =
  "https://api.testnet.cipherscan.app/api/blockchain-info";

export async function GET() {
  try {
    const response = await fetch(
      CIPHERSCAN_URL,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "CipherScan status error:",
        response.status,
        response.statusText
      );

      return NextResponse.json({
        network: "testnet",
        connected: false,
        height: null,
        bestBlockHash: null,
        source: "CipherScan",
        error: `CipherScan returned HTTP ${response.status}`,
      });
    }

    const data =
      await response.json();

    const height =
      typeof data?.blocks ===
      "number"
        ? data.blocks
        : null;

    const bestBlockHash =
      typeof data?.bestblockhash ===
      "string"
        ? data.bestblockhash
        : null;

    if (height === null) {
      console.error(
        "CipherScan returned unexpected status data:",
        data
      );

      return NextResponse.json({
        network: "testnet",
        connected: false,
        height: null,
        bestBlockHash: null,
        source: "CipherScan",
        error:
          "CipherScan returned invalid blockchain data",
      });
    }

    return NextResponse.json({
      network: "testnet",
      connected: true,
      height,
      bestBlockHash,
      source: "CipherScan",
      error: null,
    });
  } catch (error) {
    console.error(
      "CipherScan status error:",
      error
    );

    return NextResponse.json({
      network: "testnet",
      connected: false,
      height: null,
      bestBlockHash: null,
      source: "CipherScan",
      error:
        "Unable to reach CipherScan",
    });
  }
}
