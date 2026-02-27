import { NextResponse } from "next/server";
import { generateForecast } from "@/lib/mock-data";

export async function GET(_req: Request, { params }: { params: { gameId: string } }) {
  const start = performance.now();
  const { gameId } = params;
  const forecast = generateForecast(gameId);
  const processingTimeMs = parseFloat((performance.now() - start).toFixed(2));
  return NextResponse.json({
    ...forecast,
    processedAt: new Date().toISOString(),
    processingTimeMs,
  });
}
