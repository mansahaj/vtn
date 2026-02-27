import { NextResponse } from "next/server";
import { generateLiveStatus } from "@/lib/mock-data";

export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const url = new URL(req.url);
  const elapsed = parseInt(url.searchParams.get("elapsed") ?? "0", 10);
  const status = generateLiveStatus(gameId, elapsed);
  return NextResponse.json(status);
}
