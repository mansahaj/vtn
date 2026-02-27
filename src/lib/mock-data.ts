import { Game, Stand, StandForecast, ForecastResponse, GameEvent, SimulationRequest, SimulationResponse, LiveStatusResponse, Alert } from "./types";
import { ALERT_THRESHOLD_PERCENT } from "./constants";
import { computeStandForecast, generateRecommendedMoves } from "./calculations";

// --- Real data from Save-On-Foods Memorial Centre ---
import gamesData from "./data/games.json";
import standsData from "./data/stands.json";
import demandCurvesData from "./data/demand-curves.json";

export const MOCK_GAMES: Game[] = gamesData as Game[];
export const MOCK_STANDS: Stand[] = standsData as Stand[];

const demandCurves = demandCurvesData as Record<string, Record<string, Record<string, number>>>;

// --- Forecast Generation ---
export function generateForecast(gameId: string): ForecastResponse {
  const game = MOCK_GAMES.find((g) => g.id === gameId) ?? MOCK_GAMES[0];
  const gameDemand = demandCurves[gameId] || demandCurves["game-1"] || {};

  // Collect all time buckets from demand data, sorted chronologically
  const allBuckets = new Set<string>();
  for (const standId of Object.keys(gameDemand)) {
    for (const bucket of Object.keys(gameDemand[standId])) {
      allBuckets.add(bucket);
    }
  }
  let timeBuckets = Array.from(allBuckets).sort();

  // Extend time buckets to cover full game + potential OT
  // Hockey game: ~3h from puck drop (regulation 2h40m + potential OT 20m)
  const puckDropTime = game.puckDropTime; // e.g. "19:05"
  const [pdH, pdM] = puckDropTime.split(":").map(Number);
  const puckDropMinutes = pdH * 60 + pdM;
  const gameEndMinutes = puckDropMinutes + 200; // 3h20m covers regulation + OT
  // Generate 10-min buckets from earliest data to game end
  const lastDataBucket = timeBuckets[timeBuckets.length - 1];
  if (lastDataBucket) {
    const [lastH, lastM] = lastDataBucket.split(":").map(Number);
    let currentMinutes = lastH * 60 + lastM + 10;
    while (currentMinutes <= gameEndMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const bucket = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      if (!allBuckets.has(bucket)) {
        allBuckets.add(bucket);
      }
      currentMinutes += 10;
    }
    timeBuckets = Array.from(allBuckets).sort();
  }

  // Find puck drop bucket
  const puckDropIndex = timeBuckets.indexOf(game.puckDropTime);
  const effectivePuckDrop = puckDropIndex >= 0 ? puckDropIndex : Math.floor(timeBuckets.length * 0.3);

  // Game events — realistic hockey timing
  const events: GameEvent[] = [
    { bucket: timeBuckets[effectivePuckDrop] || game.puckDropTime, label: "Puck Drop", type: "puck_drop" },
  ];
  if (effectivePuckDrop + 6 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[effectivePuckDrop + 6], label: "1st Intermission", type: "intermission" });
  }
  if (effectivePuckDrop + 12 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[effectivePuckDrop + 12], label: "2nd Intermission", type: "intermission" });
  }
  if (effectivePuckDrop + 18 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[effectivePuckDrop + 18], label: "Game End", type: "game_end" });
  }
  if (effectivePuckDrop + 20 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[effectivePuckDrop + 20], label: "Potential OT", type: "period_end" });
  }

  // Generate forecasts per stand using real demand data
  const stands: StandForecast[] = MOCK_STANDS.map((stand) => {
    const standDemand = gameDemand[stand.id] || {};
    const demand = timeBuckets.map((bucket) => standDemand[bucket] || 0);
    return computeStandForecast(stand, demand, timeBuckets);
  });

  // Summary
  const totalRevenueAtRisk = stands.reduce((sum, sf) => sum + sf.totalRevenueAtRisk, 0);

  const topBottleneckStands = [...stands]
    .sort((a, b) => b.totalRevenueAtRisk - a.totalRevenueAtRisk)
    .slice(0, 3);

  // Stress windows: aggregate overload across all stands per bucket
  const stressPerBucket = timeBuckets.map((bucket, i) => {
    const totalOverload = stands.reduce((sum, sf) => {
      const b = sf.buckets[i];
      return sum + Math.max(0, b.overloadRatio - 1);
    }, 0);
    return { bucket, totalOverload };
  });
  const topStressWindows = [...stressPerBucket]
    .sort((a, b) => b.totalOverload - a.totalOverload)
    .slice(0, 3);

  // Recovery potential: if we optimally redistribute staff
  const recoveryPotential = Math.round(totalRevenueAtRisk * 0.6);

  return {
    gameId,
    game,
    stands,
    timeBuckets,
    events,
    summary: {
      totalRevenueAtRisk: Math.round(totalRevenueAtRisk),
      topBottleneckStands,
      topStressWindows,
      recoveryPotential,
    },
    assumptions: [
      `Real transaction data from ${game.date} at Save-On-Foods Memorial Centre`,
      `Service rate: ${MOCK_STANDS[0].serviceRatePerStaff} tx/staff/10min`,
      `Scanned attendance: ${game.expectedAttendance.toLocaleString()}`,
      "Demand derived from historical POS transaction timestamps",
      "Revenue at risk = lost transactions × avg transaction value",
    ],
  };
}

// --- Simulation ---
export function simulateStaffChange(gameId: string, req: SimulationRequest): SimulationResponse {
  const baseline = generateForecast(gameId);
  const originalRevenueAtRisk = baseline.summary.totalRevenueAtRisk;

  const newStands: StandForecast[] = baseline.stands.map((sf) => {
    const newStaff = req.staffConfig[sf.stand.id] ?? sf.stand.staffCount;
    const newRate = req.serviceRateConfig[sf.stand.id] ?? sf.stand.serviceRatePerStaff;
    const demand = sf.buckets.map((b) => b.predictedTransactions);
    return computeStandForecast(
      { ...sf.stand, staffCount: newStaff, serviceRatePerStaff: newRate },
      demand,
      baseline.timeBuckets,
      newStaff,
      newRate
    );
  });

  const newRevenueAtRisk = Math.round(newStands.reduce((sum, sf) => sum + sf.totalRevenueAtRisk, 0));
  const recommendedMoves = generateRecommendedMoves(newStands, baseline.timeBuckets);

  return {
    originalRevenueAtRisk,
    newRevenueAtRisk,
    delta: originalRevenueAtRisk - newRevenueAtRisk,
    stands: newStands,
    recommendedMoves,
  };
}

// --- Live Status ---
export function generateLiveStatus(gameId: string, elapsedBuckets: number): LiveStatusResponse {
  const baseline = generateForecast(gameId);
  const currentBucket = baseline.timeBuckets[Math.min(elapsedBuckets, baseline.timeBuckets.length - 1)];

  const alerts: Alert[] = [];

  const stands = baseline.stands.map((sf) => {
    const bucketData = sf.buckets[Math.min(elapsedBuckets, sf.buckets.length - 1)];
    const predicted = bucketData.predictedTransactions;
    // Add variance: some stands run hot
    const varianceFactor = 0.8 + Math.random() * 0.4;
    const actual = Math.round(predicted * varianceFactor);
    const variance = actual - predicted;
    const variancePercent = predicted > 0 ? (variance / predicted) * 100 : 0;

    if (Math.abs(variancePercent) > ALERT_THRESHOLD_PERCENT) {
      alerts.push({
        id: `alert-${sf.stand.id}-${elapsedBuckets}`,
        severity: variancePercent > 30 ? "critical" : "warning",
        standId: sf.stand.id,
        standName: sf.stand.name,
        message: variancePercent > 0
          ? `${sf.stand.name} running ${variancePercent.toFixed(0)}% above forecast`
          : `${sf.stand.name} running ${Math.abs(variancePercent).toFixed(0)}% below forecast`,
        bucket: currentBucket,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      standId: sf.stand.id,
      standName: sf.stand.name,
      actualTransactions: actual,
      predictedTransactions: predicted,
      variance,
      variancePercent: Math.round(variancePercent),
    };
  });

  return {
    gameId,
    currentBucket,
    elapsedBuckets,
    stands,
    alerts,
  };
}
