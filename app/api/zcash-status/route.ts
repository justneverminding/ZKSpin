import { NextResponse } from "next/server";

export async function GET() {
  const rpcUrl = process.env.ZCASH_RPC_URL;

  if (!rpcUrl) {
    return NextResponse.json({
      network: "testnet",
      height: null,
      bestBlockHash: null,
      connected: false,
      message: "ZCASH_RPC_URL is not configured",
    });
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "1.0",
        id: "zkspin-status",
        method: "getblockchaininfo",
        params: [],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Zcash RPC returned ${response.status}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return NextResponse.json({
      network: data.result.chain,
      height: data.result.blocks,
      bestBlockHash: data.result.bestblockhash,
      connected: true,
    });
  } catch (error) {
    console.error("Zcash RPC error:", error);

    return NextResponse.json({
      network: "testnet",
      height: null,
      bestBlockHash: null,
      connected: false,
      message: "Unable to reach Zcash RPC",
    });
  }
}
