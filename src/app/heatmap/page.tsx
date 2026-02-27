"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useGameContext } from "@/lib/game-context";
import HeatmapGrid from "@/components/heatmap/HeatmapGrid";
import { generateRecommendedMoves } from "@/lib/calculations";

const LEGEND_STEPS = [
  { label: "<50%", color: "bg-green-900" },
  { label: "50-75%", color: "bg-green-700" },
  { label: "75-90%", color: "bg-yellow-700" },
  { label: "90-100%", color: "bg-yellow-500" },
  { label: "100-120%", color: "bg-orange-500" },
  { label: "120-150%", color: "bg-red-500" },
  { label: ">150%", color: "bg-red-700" },
];

export default function HeatmapPage() {
  const { forecast, isLoading, mode } = useGameContext();
  const [elapsedBuckets, setElapsedBuckets] = useState(0);

  useEffect(() => {
    if (mode !== "live") return;
    setElapsedBuckets(0);
    const interval = setInterval(() => {
      setElapsedBuckets((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  if (!forecast || forecast.stands.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-400 text-lg">No forecast data available</p>
          <p className="text-gray-600 text-sm mt-1">
            Select a game to view the stress heatmap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Stand Stress Heatmap</h1>
        <p className="text-gray-400 text-sm mt-1">
          Visualize predicted demand vs. capacity across all stands and time
          windows. Hover over cells for details.
        </p>
      </div>

      {/* Heatmap Grid */}
      <HeatmapGrid
        stands={forecast.stands}
        timeBuckets={forecast.timeBuckets}
        events={forecast.events}
        currentBucketIndex={mode === "live" ? elapsedBuckets : null}
      />

      {/* Top Actions */}
      {(() => {
        const moves = generateRecommendedMoves(forecast.stands, forecast.timeBuckets).slice(0, 3);
        if (moves.length === 0) return null;
        return (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Recommended Actions</h2>
            <div className="space-y-3">
              {moves.map((move, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-300">
                    Move <span className="text-white font-semibold">{move.staffCount}</span> staff from{" "}
                    <span className="text-white font-semibold">{move.fromStandName}</span> to{" "}
                    <span className="text-white font-semibold">{move.toStandName}</span> at{" "}
                    <span className="text-white font-semibold">{move.window}</span> &mdash; saves{" "}
                    <span className="text-green-400 font-semibold">${move.revenueImpact.toLocaleString()}</span>
                  </span>
                  <Link
                    href="/simulator"
                    className="shrink-0 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                  >
                    Simulate
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          Capacity Utilization
        </span>
        <div className="flex items-center gap-1">
          {LEGEND_STEPS.map((step) => (
            <div key={step.label} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-4 rounded-sm ${step.color}`} />
              <span className="text-[10px] text-gray-500">{step.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-800">
          <div className="w-4 h-4 rounded-sm ring-2 ring-blue-400 bg-gray-800" />
          <span className="text-[10px] text-gray-500">Game Event</span>
        </div>
      </div>
    </div>
  );
}
