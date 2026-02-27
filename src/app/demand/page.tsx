"use client";

import { useState, useMemo } from "react";
import { useGameContext } from "@/lib/game-context";
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
const GRID_COLOR = "#374151";
const EVENT_LINE_COLOR = "#9ca3af";

interface ChartDataPoint {
  bucket: string;
  total: number;
  [standId: string]: number | string;
}

export default function DemandPage() {
  const { forecast, isLoading, selectedGameId } = useGameContext();
  const [enabledStands, setEnabledStands] = useState<Record<string, boolean>>({});

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!forecast) return [];

    return forecast.timeBuckets.map((bucket, bucketIdx) => {
      const point: ChartDataPoint = { bucket, total: 0 };
      for (const sf of forecast.stands) {
        const txCount = sf.buckets[bucketIdx]?.predictedTransactions ?? 0;
        point.total += txCount;
        point[sf.stand.id] = txCount;
      }
      return point;
    });
  }, [forecast]);

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Demand Curve</h1>
        <p className="text-sm text-gray-400 mt-1">
          Predicted transaction volume over time &mdash; {forecast.game.opponent} on{" "}
          {forecast.game.date}
        </p>
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
                value: "Predicted Transactions",
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
                if (name === "total") return [value, "Total Transactions"];
                const stand = forecast.stands.find((sf) => sf.stand.id === name);
                return [value, stand?.stand.name ?? name];
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

            {/* Total demand line (always visible) */}
            <Line
              type="monotone"
              dataKey="total"
              stroke={TOTAL_LINE_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: TOTAL_LINE_COLOR }}
              name="total"
            />

            {/* Per-stand overlay lines */}
            {forecast.stands.map((sf, i) =>
              enabledStands[sf.stand.id] ? (
                <Line
                  key={sf.stand.id}
                  type="monotone"
                  dataKey={sf.stand.id}
                  stroke={STAND_COLORS[i % STAND_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  name={sf.stand.id}
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
