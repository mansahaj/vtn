import { BucketForecast, Stand, StandForecast, RecommendedMove } from "./types";

export function computeCapacity(staffCount: number, serviceRate: number): number {
  return Math.max(0, staffCount * serviceRate);
}

export function computeBucketForecast(
  predictedTransactions: number,
  staffCount: number,
  serviceRate: number,
  avgTransactionValue: number
): BucketForecast {
  const capacity = computeCapacity(staffCount, serviceRate);
  const overloadRatio = capacity > 0 ? predictedTransactions / capacity : predictedTransactions > 0 ? Infinity : 0;
  const lostTransactions = Math.max(0, predictedTransactions - capacity);
  const revenueAtRisk = lostTransactions * avgTransactionValue;

  return {
    bucket: "",
    predictedTransactions,
    capacity,
    overloadRatio,
    revenueAtRisk,
  };
}

export function computeStandForecast(
  stand: Stand,
  predictedTxPerBucket: number[],
  timeBuckets: string[],
  staffOverride?: number,
  serviceRateOverride?: number
): StandForecast {
  const staff = staffOverride ?? stand.staffCount;
  const rate = serviceRateOverride ?? stand.serviceRatePerStaff;

  const buckets: BucketForecast[] = predictedTxPerBucket.map((tx, i) => ({
    ...computeBucketForecast(tx, staff, rate, stand.avgTransactionValue),
    bucket: timeBuckets[i],
  }));

  const totalRevenueAtRisk = buckets.reduce((sum, b) => sum + b.revenueAtRisk, 0);
  const peakOverloadRatio = Math.max(...buckets.map((b) => b.overloadRatio));

  return { stand, buckets, totalRevenueAtRisk, peakOverloadRatio };
}

export function generateRecommendedMoves(
  stands: StandForecast[],
  timeBuckets: string[]
): RecommendedMove[] {
  const moves: RecommendedMove[] = [];

  for (const bucket of timeBuckets) {
    const overloaded = stands
      .map((sf) => ({
        sf,
        b: sf.buckets.find((b) => b.bucket === bucket)!,
      }))
      .filter(({ b }) => b && b.overloadRatio > 1.1)
      .sort((a, b) => b.b.revenueAtRisk - a.b.revenueAtRisk);

    const underloaded = stands
      .map((sf) => ({
        sf,
        b: sf.buckets.find((b) => b.bucket === bucket)!,
      }))
      .filter(({ b }) => b && b.overloadRatio < 0.7)
      .sort((a, b) => a.b.overloadRatio - b.b.overloadRatio);

    for (const over of overloaded) {
      for (const under of underloaded) {
        const rateFrom = over.sf.stand.serviceRatePerStaff;
        const impact = Math.min(
          rateFrom * over.sf.stand.avgTransactionValue,
          over.b.revenueAtRisk
        );

        if (impact > 0) {
          moves.push({
            fromStandId: under.sf.stand.id,
            fromStandName: under.sf.stand.name,
            toStandId: over.sf.stand.id,
            toStandName: over.sf.stand.name,
            staffCount: 1,
            window: bucket,
            revenueImpact: Math.round(impact),
            reason: `${over.sf.stand.name} overloaded (${(over.b.overloadRatio * 100).toFixed(0)}%) while ${under.sf.stand.name} has slack (${(under.b.overloadRatio * 100).toFixed(0)}%)`,
          });
        }
      }
    }
  }

  // Deduplicate by stand pair and return top moves
  const seen = new Set<string>();
  return moves
    .sort((a, b) => b.revenueImpact - a.revenueImpact)
    .filter((m) => {
      const key = `${m.fromStandId}-${m.toStandId}-${m.window}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}
