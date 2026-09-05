import { NextResponse } from "next/server";

const CIPHERSCAN_URL =
  "https://api.testnet.cipherscan.app/api/blockchain-info";

export async function GET() {
  try {
    const response = await fetch(CIPHERSCAN_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `CipherScan returned ${response.status}`
      );
    }

    const data = await response.json();

    return NextResponse.json({
      network: "testnet",
      height: data.blocks ?? null,
      bestBlockHash: data.bestblockhash ?? null,
      connected: true,
      source: "CipherScan",
    });
  } catch (error) {
    console.error("CipherScan error:", error);

    return NextResponse.json({
      network: "testnet",
      height: null,
      bestBlockHash: null,
      connected: false,
      source: "CipherScan",
      message: "Unable to reach CipherScan",
    });
  }
}
