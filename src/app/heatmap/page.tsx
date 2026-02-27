"use client";

import { useGameContext } from "@/lib/game-context";
import HeatmapGrid from "@/components/heatmap/HeatmapGrid";

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
  const { forecast, isLoading } = useGameContext();

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
      />

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
