import { BucketForecast, Stand, StandForecast, PortableStationRecommendation } from "./types";

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
): PortableStationRecommendation[] {
  const recs: PortableStationRecommendation[] = [];

  for (const bucket of timeBuckets) {
    const overloaded = stands
      .map((sf) => ({
        sf,
        b: sf.buckets.find((b) => b.bucket === bucket)!,
      }))
      .filter(({ b }) => b && b.overloadRatio > 1.1)
      .sort((a, b) => b.b.revenueAtRisk - a.b.revenueAtRisk);

    for (const over of overloaded) {
      const neededStaff = over.sf.stand.serviceRatePerStaff > 0
        ? Math.min(2, Math.ceil((over.b.predictedTransactions - over.b.capacity) / over.sf.stand.serviceRatePerStaff))
        : 1;
      const impact = Math.min(
        neededStaff * over.sf.stand.serviceRatePerStaff * over.sf.stand.avgTransactionValue,
        over.b.revenueAtRisk
      );

      if (impact > 0) {
        recs.push({
          targetStandId: over.sf.stand.id,
          targetStandName: over.sf.stand.name,
          targetLocation: over.sf.stand.location,
          targetCategory: over.sf.stand.category,
          staffCount: neededStaff,
          window: bucket,
          revenueImpact: Math.round(impact),
          reason: `${over.sf.stand.name} at ${(over.b.overloadRatio * 100).toFixed(0)}% capacity — portable ${over.sf.stand.category} station reduces queue overflow`,
        });
      }
    }
  }

  // Deduplicate by stand + window and return top recommendations
  const seen = new Set<string>();
  return recs
    .sort((a, b) => b.revenueImpact - a.revenueImpact)
    .filter((r) => {
      const key = `${r.targetStandId}-${r.window}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}
