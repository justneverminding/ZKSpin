import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { height: string } }
) {
  try {
    const height = Number(params.height);

    if (!Number.isInteger(height) || height < 0) {
      return NextResponse.json(
        {
          connected: false,
          error: "Invalid block height",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.testnet.cipherscan.app/api/blocks/${height}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        found: false,
      });
    }

    const data = await response.json();

    return NextResponse.json({
      connected: true,
      found: true,
      height,
      hash: data.hash,
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        found: false,
      },
      { status: 500 }
    );
  }
}
