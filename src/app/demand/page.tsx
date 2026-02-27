"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useGameContext } from "@/lib/game-context";
import { LiveStatusResponse } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STAND_COLORS = [
  "#f97316", // orange
  "#22c55e", // green
  "#a855f7", // purple
  "#eab308", // yellow
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f43f5e", // rose
  "#6366f1", // indigo
  "#84cc16", // lime
  "#06b6d4", // cyan
];

const TOTAL_LINE_COLOR = "#3b82f6";
const ACTUAL_LINE_COLOR = "#ef4444";
const GRID_COLOR = "#374151";
const EVENT_LINE_COLOR = "#9ca3af";
const NOW_LINE_COLOR = "#eab308";

interface ChartDataPoint {
  bucket: string;
  total: number;
  totalDollars: number;
  actual?: number | null;
  actualDollars?: number | null;
  [standId: string]: number | string | null | undefined;
}

export default function DemandPage() {
  const { forecast, isLoading, selectedGameId, mode, setMode } = useGameContext();
  const [enabledStands, setEnabledStands] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"transactions" | "dollars">("transactions");

  // Live mode state
  const [elapsedBuckets, setElapsedBuckets] = useState(0);
  const [liveSnapshots, setLiveSnapshots] = useState<LiveStatusResponse[]>([]);
  const [currentBucketLabel, setCurrentBucketLabel] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset live state when switching modes or games
  useEffect(() => {
    if (mode === "forecast") {
      setElapsedBuckets(0);
      setLiveSnapshots([]);
      setCurrentBucketLabel(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [mode, selectedGameId]);

  // Fetch live data function
  const fetchLiveData = useCallback(
    async (elapsed: number) => {
      if (!selectedGameId) return;
      try {
        const res = await fetch(`/api/live-status/${selectedGameId}?elapsed=${elapsed}`);
        if (!res.ok) return;
        const data: LiveStatusResponse = await res.json();
        setCurrentBucketLabel(data.currentBucket);
        setLiveSnapshots((prev) => {
          const updated = [...prev];
          updated[elapsed] = data;
          return updated;
        });
      } catch {
        // silently ignore fetch errors
      }
    },
    [selectedGameId]
  );

  // Live mode interval
  useEffect(() => {
    if (mode !== "live" || !selectedGameId) return;

    // Fetch immediately for bucket 0
    fetchLiveData(0);

    intervalRef.current = setInterval(() => {
      setElapsedBuckets((prev) => {
        const next = prev + 1;
        fetchLiveData(next);
        return next;
      });
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode, selectedGameId, fetchLiveData]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!forecast) return [];

    const points = forecast.timeBuckets.map((bucket, bucketIdx) => {
      const point: ChartDataPoint = { bucket, total: 0, totalDollars: 0 };
      for (const sf of forecast.stands) {
        const txCount = sf.buckets[bucketIdx]?.predictedTransactions ?? 0;
        const dollarValue = txCount * sf.stand.avgTransactionValue;
        point.total += txCount;
        point.totalDollars += dollarValue;
        point[sf.stand.id] = txCount;
        point[sf.stand.id + "_dollars"] = dollarValue;
      }

      // Add actual data from live snapshots
      if (mode === "live") {
        if (bucketIdx <= elapsedBuckets) {
          // Find the snapshot for this bucket index
          const snapshot = liveSnapshots[bucketIdx];
          if (snapshot) {
            let actualTotal = 0;
            let actualTotalDollars = 0;
            for (const ls of snapshot.stands) {
              actualTotal += ls.actualTransactions;
              const stand = forecast.stands.find((sf) => sf.stand.id === ls.standId);
              const avgVal = stand?.stand.avgTransactionValue ?? 0;
              actualTotalDollars += ls.actualTransactions * avgVal;
            }
            point.actual = actualTotal;
            point.actualDollars = actualTotalDollars;
          } else {
            point.actual = null;
            point.actualDollars = null;
          }
        } else {
          point.actual = null;
          point.actualDollars = null;
        }
      }

      return point;
    });

    return points;
  }, [forecast, mode, elapsedBuckets, liveSnapshots]);

  function toggleStand(standId: string) {
    setEnabledStands((prev) => ({
      ...prev,
      [standId]: !prev[standId],
    }));
  }

  function toggleAll(on: boolean) {
    if (!forecast) return;
    const next: Record<string, boolean> = {};
    for (const sf of forecast.stands) {
      next[sf.stand.id] = on;
    }
    setEnabledStands(next);
  }

  if (!selectedGameId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 text-lg">Select a game to view forecast</p>
      </div>
    );
  }

  if (isLoading || !forecast) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 text-lg">Loading...</p>
      </div>
    );
  }

  const anyStandEnabled = Object.values(enabledStands).some(Boolean);

  const isDollars = viewMode === "dollars";
  const isLive = mode === "live";
  const totalDataKey = isDollars ? "totalDollars" : "total";
  const actualDataKey = isDollars ? "actualDollars" : "actual";
  const yAxisLabel = isDollars ? "Predicted Revenue ($)" : "Predicted Transactions";

  const formatValue = (value: number) => {
    if (isDollars) {
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Demand Curve</h1>
          <p className="text-sm text-gray-400 mt-1">
            Predicted transaction volume over time &mdash; {forecast.game.opponent} on{" "}
            {forecast.game.date}
          </p>
        </div>
        <div className="flex gap-3">
          {/* Forecast / Live Toggle */}
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setMode("forecast")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "forecast"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Forecast
            </button>
            <button
              onClick={() => setMode("live")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "live"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Live
            </button>
          </div>
          {/* Transactions / Dollars Toggle */}
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("transactions")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "transactions"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setViewMode("dollars")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "dollars"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Dollars
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey="bucket"
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                fill: "#6b7280",
                fontSize: 12,
                dy: 60,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#e5e7eb",
              }}
              labelStyle={{ color: "#9ca3af", fontWeight: 600 }}
              formatter={(value: number, name: string) => {
                const formatted = formatValue(value);
                if (name === totalDataKey) return [formatted, isDollars ? "Total Revenue" : "Total Transactions"];
                if (name === actualDataKey) return [formatted, isDollars ? "Actual Revenue" : "Actual Transactions"];
                // Stand line names
                const standId = isDollars ? name.replace(/_dollars$/, "") : name;
                const stand = forecast.stands.find((sf) => sf.stand.id === standId);
                return [formatted, stand?.stand.name ?? name];
              }}
              labelFormatter={(label: string) => `Time: ${label}`}
            />

            {/* Game event reference lines */}
            {forecast.events.map((evt) => (
              <ReferenceLine
                key={`${evt.bucket}-${evt.type}`}
                x={evt.bucket}
                stroke={EVENT_LINE_COLOR}
                strokeDasharray="4 4"
                label={{
                  value: evt.label,
                  position: "top",
                  fill: "#d1d5db",
                  fontSize: 11,
                }}
              />
            ))}

            {/* NOW reference line in live mode */}
            {isLive && currentBucketLabel && (
              <ReferenceLine
                x={currentBucketLabel}
                stroke={NOW_LINE_COLOR}
                strokeWidth={2}
                label={{
                  value: "NOW",
                  position: "top",
                  fill: NOW_LINE_COLOR,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Total demand line (always visible) */}
            <Line
              type="monotone"
              dataKey={totalDataKey}
              stroke={TOTAL_LINE_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: TOTAL_LINE_COLOR }}
              name={totalDataKey}
            />

            {/* Actual line in live mode */}
            {isLive && (
              <Line
                type="monotone"
                dataKey={actualDataKey}
                stroke={ACTUAL_LINE_COLOR}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: ACTUAL_LINE_COLOR }}
                name={actualDataKey}
                connectNulls={false}
              />
            )}

            {/* Per-stand overlay lines */}
            {forecast.stands.map((sf, i) =>
              enabledStands[sf.stand.id] ? (
                <Line
                  key={sf.stand.id}
                  type="monotone"
                  dataKey={isDollars ? `${sf.stand.id}_dollars` : sf.stand.id}
                  stroke={STAND_COLORS[i % STAND_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  name={isDollars ? `${sf.stand.id}_dollars` : sf.stand.id}
                />
              ) : null
            )}

            {anyStandEnabled && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stand Toggle Section */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Stand Overlays</h2>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-3 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Show All
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-3 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Hide All
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {forecast.stands.map((sf, i) => {
            const color = STAND_COLORS[i % STAND_COLORS.length];
            const checked = !!enabledStands[sf.stand.id];
            return (
              <label
                key={sf.stand.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  checked ? "bg-gray-800 border border-gray-600" : "bg-gray-800/50 border border-transparent"
                } hover:bg-gray-800`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStand(sf.stand.id)}
                  className="sr-only"
                />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                  style={{
                    backgroundColor: checked ? color : "transparent",
                    borderColor: color,
                  }}
                />
                <span className="text-sm text-gray-300 truncate">{sf.stand.name}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
