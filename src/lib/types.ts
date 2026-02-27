export type TimeBucket = string; // e.g. "17:00", "17:10"

export interface Game {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  expectedAttendance: number;
  puckDropTime: string; // "19:00"
  status: "upcoming" | "live" | "completed";
}

export interface Stand {
  id: string;
  name: string;
  category: "beer" | "food" | "merchandise" | "premium";
  location: string;
  staffCount: number;
  avgTransactionValue: number;
  serviceRatePerStaff: number; // transactions per staff per 10-min bucket
}

export interface BucketForecast {
  bucket: TimeBucket;
  predictedTransactions: number;
  capacity: number;
  overloadRatio: number;
  revenueAtRisk: number;
}

export interface StandForecast {
  stand: Stand;
  buckets: BucketForecast[];
  totalRevenueAtRisk: number;
  peakOverloadRatio: number;
}

export interface GameEvent {
  bucket: TimeBucket;
  label: string;
  type: "puck_drop" | "intermission" | "period_end" | "game_end";
}

export interface ForecastResponse {
  gameId: string;
  game: Game;
  stands: StandForecast[];
  timeBuckets: TimeBucket[];
  events: GameEvent[];
  summary: {
    totalRevenueAtRisk: number;
    topBottleneckStands: StandForecast[];
    topStressWindows: { bucket: TimeBucket; totalOverload: number; revenueAtRisk: number; overloadedStandCount: number }[];
    recoveryPotential: number;
  };
  assumptions: string[];
}

export interface SimulationRequest {
  staffConfig: Record<string, number>;
  serviceRateConfig: Record<string, number>;
}

export interface SimulationResponse {
  originalRevenueAtRisk: number;
  newRevenueAtRisk: number;
  delta: number;
  stands: StandForecast[];
  recommendedMoves: PortableStationRecommendation[];
}

export interface PortableStationRecommendation {
  targetStandId: string;
  targetStandName: string;
  targetLocation: string;
  targetCategory: string;
  staffCount: number;
  window: TimeBucket;
  revenueImpact: number;
  reason: string;
}

export interface LiveStatusResponse {
  gameId: string;
  currentBucket: TimeBucket;
  elapsedBuckets: number;
  stands: LiveStandStatus[];
  alerts: Alert[];
}

export interface LiveStandStatus {
  standId: string;
  standName: string;
  actualTransactions: number;
  predictedTransactions: number;
  variance: number;
  variancePercent: number;
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  standId: string;
  standName: string;
  message: string;
  bucket: TimeBucket;
  timestamp: string;
}
