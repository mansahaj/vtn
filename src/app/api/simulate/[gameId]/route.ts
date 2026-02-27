import { NextResponse } from "next/server";
import { simulateStaffChange } from "@/lib/mock-data";
import { SimulationRequest } from "@/lib/types";

export async function POST(req: Request, { params }: { params: { gameId: string } }) {
  const start = performance.now();
  const { gameId } = params;
  const body: SimulationRequest = await req.json();
  const result = simulateStaffChange(gameId, body);
  const processingTimeMs = parseFloat((performance.now() - start).toFixed(2));
  return NextResponse.json({
    ...result,
    processedAt: new Date().toISOString(),
    processingTimeMs,
  });
}
