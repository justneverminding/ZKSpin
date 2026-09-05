import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const response = await fetch(
      "https://api.cipherscan.app/api/v1/zcash/testnet/block/latest",
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
        connected: false,
        height: null,
        bestBlockHash: null,
        error: `CipherScan returned HTTP ${response.status}`,
      });
    }

    const data = await response.json();

    /*
      CipherScan may return different response shapes.

      Never assume data.height exists.
    */

    const height =
      typeof data?.height === "number"
        ? data.height
        : typeof data?.data?.height === "number"
        ? data.data.height
        : null;

    const bestBlockHash =
      typeof data?.hash === "string"
        ? data.hash
        : typeof data?.bestBlockHash === "string"
        ? data.bestBlockHash
        : typeof data?.data?.hash === "string"
        ? data.data.hash
        : null;

    /*
      If CipherScan responded successfully but
      did not give us a usable block height,
      treat the source as unavailable.
    */

    if (height === null) {
      console.error(
        "CipherScan returned unexpected data:",
        data
      );

      return NextResponse.json({
        connected: false,
        height: null,
        bestBlockHash: null,
        error: "CipherScan returned invalid block data",
      });
    }

    return NextResponse.json({
      connected: true,
      height,
      bestBlockHash,
      error: null,
    });
  } catch (error) {
    console.error(
      "CipherScan block lookup error:",
      error
    );

    return NextResponse.json({
      connected: false,
      height: null,
      bestBlockHash: null,
      error: "Unable to reach CipherScan",
    });
  }
}
