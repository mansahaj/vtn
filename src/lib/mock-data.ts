import { Game, Stand, StandForecast, ForecastResponse, GameEvent, SimulationRequest, SimulationResponse, LiveStatusResponse, Alert } from "./types";
import { generateTimeBuckets, ALERT_THRESHOLD_PERCENT } from "./constants";
import { computeStandForecast, generateRecommendedMoves } from "./calculations";

// --- Games ---
export const MOCK_GAMES: Game[] = [
  {
    id: "game-1",
    opponent: "Calgary Flames",
    date: "2025-01-15",
    venue: "Rogers Arena",
    expectedAttendance: 18500,
    puckDropTime: "19:00",
    status: "completed",
  },
  {
    id: "game-2",
    opponent: "Edmonton Oilers",
    date: "2025-01-22",
    venue: "Rogers Arena",
    expectedAttendance: 18900,
    puckDropTime: "19:00",
    status: "completed",
  },
  {
    id: "game-3",
    opponent: "Toronto Maple Leafs",
    date: "2025-02-05",
    venue: "Rogers Arena",
    expectedAttendance: 18900,
    puckDropTime: "19:30",
    status: "upcoming",
  },
  {
    id: "game-4",
    opponent: "Montreal Canadiens",
    date: "2025-02-12",
    venue: "Rogers Arena",
    expectedAttendance: 18200,
    puckDropTime: "19:00",
    status: "upcoming",
  },
];

// --- Stands ---
export const MOCK_STANDS: Stand[] = [
  { id: "s1", name: "Section 100 Beer", category: "beer", location: "Lower Concourse", staffCount: 4, avgTransactionValue: 14.5, serviceRatePerStaff: 6 },
  { id: "s2", name: "Section 200 Beer", category: "beer", location: "Upper Concourse", staffCount: 3, avgTransactionValue: 14.5, serviceRatePerStaff: 6 },
  { id: "s3", name: "Main Concourse Pizza", category: "food", location: "Main Concourse", staffCount: 5, avgTransactionValue: 12.0, serviceRatePerStaff: 5 },
  { id: "s4", name: "Hot Dog Stand A", category: "food", location: "Lower Concourse", staffCount: 3, avgTransactionValue: 8.5, serviceRatePerStaff: 7 },
  { id: "s5", name: "Hot Dog Stand B", category: "food", location: "Upper Concourse", staffCount: 2, avgTransactionValue: 8.5, serviceRatePerStaff: 7 },
  { id: "s6", name: "Sushi Bar", category: "premium", location: "Club Level", staffCount: 3, avgTransactionValue: 22.0, serviceRatePerStaff: 4 },
  { id: "s7", name: "Nacho Stand", category: "food", location: "Lower Concourse", staffCount: 3, avgTransactionValue: 11.0, serviceRatePerStaff: 6 },
  { id: "s8", name: "Team Store", category: "merchandise", location: "Main Concourse", staffCount: 4, avgTransactionValue: 45.0, serviceRatePerStaff: 3 },
  { id: "s9", name: "Craft Beer Bar", category: "beer", location: "Club Level", staffCount: 3, avgTransactionValue: 16.0, serviceRatePerStaff: 5 },
  { id: "s10", name: "Coffee & Dessert", category: "food", location: "Upper Concourse", staffCount: 2, avgTransactionValue: 9.0, serviceRatePerStaff: 6 },
];

// --- Demand Curve Generation ---
// Hockey game demand pattern (relative multiplier per bucket position)
function hockeyDemandCurve(bucketIndex: number, totalBuckets: number, puckDropIndex: number): number {
  const relativePos = bucketIndex - puckDropIndex;

  // Pre-game ramp: gates open to puck drop
  if (relativePos < -3) return 0.2 + (bucketIndex / puckDropIndex) * 0.3;
  if (relativePos >= -3 && relativePos < 0) return 0.6 + (3 + relativePos) * 0.15; // ramping up

  // Puck drop: dip
  if (relativePos === 0) return 0.3;

  // 1st period (buckets 1-5 after puck drop)
  if (relativePos >= 1 && relativePos <= 5) return 0.25 + relativePos * 0.02;

  // 1st intermission (buckets 6-7): biggest spike
  if (relativePos === 6 || relativePos === 7) return 1.0;

  // 2nd period (buckets 8-13)
  if (relativePos >= 8 && relativePos <= 13) return 0.35;

  // 2nd intermission (buckets 14-15)
  if (relativePos === 14 || relativePos === 15) return 0.85;

  // 3rd period (buckets 16-21): tapering
  if (relativePos >= 16 && relativePos <= 21) return 0.25 - (relativePos - 16) * 0.02;

  // Post game
  if (relativePos > 21) return 0.15 - Math.min(0.12, (relativePos - 21) * 0.03);

  return 0.2;
}

// Per-stand popularity weights (how busy relative to base)
const STAND_POPULARITY: Record<string, number> = {
  s1: 1.3, // Section 100 Beer: very popular
  s2: 0.9,
  s3: 1.2, // Pizza: popular
  s4: 1.0,
  s5: 0.7,
  s6: 0.8, // Sushi: smaller but premium
  s7: 0.9,
  s8: 0.6, // Team Store: lower volume
  s9: 1.1, // Craft Beer: popular
  s10: 0.5,
};

function generateDemandForStand(
  stand: Stand,
  timeBuckets: string[],
  puckDropIndex: number,
  attendanceScale: number
): number[] {
  const baseDemand = stand.staffCount * stand.serviceRatePerStaff * 1.4; // demand exceeds capacity during peaks
  const popularity = STAND_POPULARITY[stand.id] || 1.0;

  return timeBuckets.map((_, i) => {
    const curve = hockeyDemandCurve(i, timeBuckets.length, puckDropIndex);
    const noise = 0.9 + Math.random() * 0.2; // ±10% noise
    return Math.round(baseDemand * curve * popularity * attendanceScale * noise);
  });
}

// --- Forecast Generation ---
export function generateForecast(gameId: string): ForecastResponse {
  const game = MOCK_GAMES.find((g) => g.id === gameId) ?? MOCK_GAMES[0];
  const timeBuckets = generateTimeBuckets(17, 30, 22, 0);

  // Find puck drop bucket index
  const puckDropIndex = timeBuckets.indexOf(game.puckDropTime);
  const attendanceScale = game.expectedAttendance / 18000;

  // Game events
  const events: GameEvent[] = [
    { bucket: game.puckDropTime, label: "Puck Drop", type: "puck_drop" },
  ];
  if (puckDropIndex + 6 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[puckDropIndex + 6], label: "1st Intermission", type: "intermission" });
  }
  if (puckDropIndex + 14 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[puckDropIndex + 14], label: "2nd Intermission", type: "intermission" });
  }
  if (puckDropIndex + 22 < timeBuckets.length) {
    events.push({ bucket: timeBuckets[puckDropIndex + 22], label: "Game End", type: "game_end" });
  }

  // Generate forecasts per stand
  // Seed random for consistency per game
  const stands: StandForecast[] = MOCK_STANDS.map((stand) => {
    const demand = generateDemandForStand(stand, timeBuckets, puckDropIndex, attendanceScale);
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
      `Service rate: varies by stand (${MOCK_STANDS[0].serviceRatePerStaff}-${MOCK_STANDS[MOCK_STANDS.length - 1].serviceRatePerStaff} tx/staff/10min)`,
      `Attendance: ${game.expectedAttendance.toLocaleString()}`,
      "Demand model: historical hockey game pattern with noise",
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
