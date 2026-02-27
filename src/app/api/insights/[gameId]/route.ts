import { NextResponse } from "next/server";
import { generateForecast } from "@/lib/mock-data";

interface Insight {
  id: string;
  type: "risk" | "opportunity" | "pattern";
  title: string;
  body: string;
  confidence: number;
}

export async function GET(_req: Request, { params }: { params: { gameId: string } }) {
  const { gameId } = params;
  const forecast = generateForecast(gameId);

  const { summary, stands, game, timeBuckets } = forecast;
  const topStand = summary.topBottleneckStands[0];
  const secondStand = summary.topBottleneckStands[1];
  const thirdStand = summary.topBottleneckStands[2];

  // Find the peak bucket for the top bottleneck stand
  const peakBucket = topStand
    ? topStand.buckets.reduce((max, b) =>
        b.predictedTransactions > max.predictedTransactions ? b : max,
        topStand.buckets[0]
      )
    : null;

  // Find the least-loaded stand during the peak window
  const peakBucketIndex = peakBucket
    ? timeBuckets.indexOf(peakBucket.bucket)
    : 0;
  const leastLoadedAtPeak = [...stands]
    .filter((sf) => sf.stand.id !== topStand?.stand.id)
    .sort((a, b) => {
      const aRatio = a.buckets[peakBucketIndex]?.overloadRatio ?? 0;
      const bRatio = b.buckets[peakBucketIndex]?.overloadRatio ?? 0;
      return aRatio - bRatio;
    })[0];

  // Find intermission surge: bucket with highest aggregate demand
  const stressWindows = summary.topStressWindows;
  const topStressWindow = stressWindows[0];

  // Calculate how many additional staff would be needed for top bottleneck
  const additionalStaffNeeded = peakBucket && topStand
    ? Math.ceil(
        (peakBucket.predictedTransactions - peakBucket.capacity) /
          topStand.stand.serviceRatePerStaff
      )
    : 2;

  const insights: Insight[] = [];

  // Insight 1: Critical bottleneck risk
  if (topStand && peakBucket) {
    insights.push({
      id: "insight-1",
      type: "risk",
      title: `Critical Bottleneck: ${topStand.stand.name}`,
      body: `${topStand.stand.name} faces ${peakBucket.predictedTransactions} tx/10min at ${peakBucket.bucket} but only has capacity for ${peakBucket.capacity}. This represents a ${(topStand.peakOverloadRatio * 100).toFixed(0)}% overload ratio, putting $${topStand.totalRevenueAtRisk.toLocaleString()} in revenue at risk. Consider deploying ${Math.max(1, additionalStaffNeeded)} additional staff${leastLoadedAtPeak ? ` from ${leastLoadedAtPeak.stand.name}` : ""} during the pre-game rush.`,
      confidence: 0.94,
    });
  }

  // Insight 2: Opportunity to recover revenue
  if (secondStand && leastLoadedAtPeak) {
    const leastLoadedRatio = leastLoadedAtPeak.buckets[peakBucketIndex]?.overloadRatio ?? 0;
    const sparePct = ((1 - leastLoadedRatio) * 100).toFixed(0);
    insights.push({
      id: "insight-2",
      type: "opportunity",
      title: `Staff Reallocation Opportunity: $${summary.recoveryPotential.toLocaleString()} Recoverable`,
      body: `${leastLoadedAtPeak.stand.name} operates at only ${(leastLoadedRatio * 100).toFixed(0)}% capacity during peak windows, with ${sparePct}% spare capacity. Temporarily redeploying 1-2 staff to ${secondStand.stand.name} ($${secondStand.totalRevenueAtRisk.toLocaleString()} at risk) could recover an estimated $${summary.recoveryPotential.toLocaleString()} across the game. This is a zero-cost operational optimization.`,
      confidence: 0.87,
    });
  }

  // Insight 3: Demand surge pattern
  if (topStressWindow) {
    const matchingEvent = forecast.events.find((e) => e.bucket === topStressWindow.bucket);
    const eventLabel = matchingEvent ? matchingEvent.label : "a high-traffic window";
    const affectedStands = stands.filter(
      (sf) => {
        const idx = timeBuckets.indexOf(topStressWindow.bucket);
        return idx >= 0 && sf.buckets[idx]?.overloadRatio > 1.0;
      }
    );
    insights.push({
      id: "insight-3",
      type: "pattern",
      title: `Demand Surge Pattern at ${topStressWindow.bucket}`,
      body: `Historical data shows a coordinated demand spike at ${topStressWindow.bucket} (${eventLabel}), with ${affectedStands.length} of ${stands.length} stands exceeding capacity simultaneously. Aggregate overload reaches ${topStressWindow.totalOverload.toFixed(1)}x across all stands. For ${game.opponent} games with ${game.expectedAttendance.toLocaleString()} attendance, this window consistently drives the highest revenue loss. Pre-positioning staff 10 minutes before this window is recommended.`,
      confidence: 0.91,
    });
  }

  // Insight 4: Category-level pattern
  if (thirdStand) {
    const categoryStands = stands.filter(
      (sf) => sf.stand.category === topStand.stand.category
    );
    const categoryRisk = categoryStands.reduce(
      (sum, sf) => sum + sf.totalRevenueAtRisk,
      0
    );
    const categoryPct = ((categoryRisk / summary.totalRevenueAtRisk) * 100).toFixed(0);
    insights.push({
      id: "insight-4",
      type: "pattern",
      title: `${topStand.stand.category.charAt(0).toUpperCase() + topStand.stand.category.slice(1)} Category Concentration Risk`,
      body: `${categoryPct}% of total revenue at risk ($${categoryRisk.toLocaleString()} of $${summary.totalRevenueAtRisk.toLocaleString()}) is concentrated in the ${topStand.stand.category} category across ${categoryStands.length} stands. ${topStand.stand.name} alone accounts for $${topStand.totalRevenueAtRisk.toLocaleString()}. Consider adding a temporary ${topStand.stand.category} service point near ${topStand.stand.location} for high-attendance games above ${Math.round(game.expectedAttendance * 0.9).toLocaleString()}.`,
      confidence: 0.82,
    });
  }

  return NextResponse.json({ insights });
}
