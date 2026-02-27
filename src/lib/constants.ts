// Generate time buckets from start to end in 10-minute intervals
export function generateTimeBuckets(startHour: number, startMin: number, endHour: number, endMin: number): string[] {
  const buckets: string[] = [];
  let h = startHour;
  let m = startMin;
  while (h < endHour || (h === endHour && m <= endMin)) {
    buckets.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    m += 10;
    if (m >= 60) {
      m = 0;
      h++;
    }
  }
  return buckets;
}

// Default game window: gates open 17:30, game ends ~22:00
export const DEFAULT_BUCKETS = generateTimeBuckets(17, 30, 22, 0);

export const HEATMAP_COLORS: Record<string, string> = {
  safe: "bg-green-900",
  low: "bg-green-700",
  moderate: "bg-yellow-700",
  atCapacity: "bg-yellow-500",
  overloaded: "bg-orange-500",
  critical: "bg-red-500",
  severe: "bg-red-700",
};

export function getHeatColor(overloadRatio: number): string {
  if (overloadRatio <= 0.5) return HEATMAP_COLORS.safe;
  if (overloadRatio <= 0.75) return HEATMAP_COLORS.low;
  if (overloadRatio <= 0.9) return HEATMAP_COLORS.moderate;
  if (overloadRatio <= 1.0) return HEATMAP_COLORS.atCapacity;
  if (overloadRatio <= 1.2) return HEATMAP_COLORS.overloaded;
  if (overloadRatio <= 1.5) return HEATMAP_COLORS.critical;
  return HEATMAP_COLORS.severe;
}

export const ALERT_THRESHOLD_PERCENT = 15;
export const DEFAULT_SERVICE_RATE = 6; // transactions per staff per 10-min bucket
