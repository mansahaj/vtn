import { NextResponse } from "next/server";
import { generateForecast } from "@/lib/mock-data";

export async function GET(_req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const forecast = generateForecast(gameId);
  return NextResponse.json(forecast);
}
