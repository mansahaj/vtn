import { NextResponse } from "next/server";
import { simulateStaffChange } from "@/lib/mock-data";
import { SimulationRequest } from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const body: SimulationRequest = await req.json();
  const result = simulateStaffChange(gameId, body);
  return NextResponse.json(result);
}
