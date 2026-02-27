"use client";

import { useGameContext } from "@/lib/game-context";
import KPICard from "@/components/shared/KPICard";

function OverloadBadge({ ratio }: { ratio: number }) {
  const pct = (ratio * 100).toFixed(0);
  let color = "bg-green-900 text-green-300";
  if (ratio > 1.5) color = "bg-red-900 text-red-300";
  else if (ratio > 1.2) color = "bg-orange-900 text-orange-300";
  else if (ratio > 1.0) color = "bg-yellow-900 text-yellow-300";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}

export default function DashboardPage() {
  const { forecast, isLoading, selectedGameId } = useGameContext();

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

  const { summary, assumptions } = forecast;
  const topBottleneck = summary.topBottleneckStands[0];

  return (
    <div className="space-y-8 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          {forecast.game.opponent} &mdash; {forecast.game.date} &middot; {forecast.game.venue}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue at Risk"
          value={summary.totalRevenueAtRisk}
          sublabel="Across all stands"
          variant="danger"
          tooltip="Estimated dollar value of transactions lost when predicted demand exceeds stand service capacity across the entire game"
        />
        <KPICard
          label="Recovery Potential"
          value={summary.recoveryPotential}
          sublabel="With optimal staff reallocation"
          variant="success"
          tooltip="How much revenue could be recovered by optimally redistributing staff from underloaded to overloaded stands"
        />
        <KPICard
          label="Top Bottleneck"
          value={topBottleneck ? topBottleneck.stand.name : "N/A"}
          sublabel={
            topBottleneck
              ? `$${topBottleneck.totalRevenueAtRisk.toLocaleString()} at risk`
              : undefined
          }
          variant="warning"
          tooltip="The stand with the highest total revenue at risk across all time buckets during the game"
        />
        <KPICard
          label="Expected Attendance"
          value={forecast.game.expectedAttendance.toLocaleString()}
          sublabel={forecast.game.venue}
          tooltip="Scanned attendance used as a scaling factor for demand forecasting"
        />
      </div>

      {/* Two-column layout for bottleneck stands and stress windows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Bottleneck Stands */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top 3 Bottleneck Stands</h2>
          <div className="space-y-3">
            {summary.topBottleneckStands.slice(0, 3).map((sf, i) => (
              <div
                key={sf.stand.id}
                className="flex items-center justify-between py-3 px-4 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm font-mono w-5">{i + 1}.</span>
                  <div>
                    <p className="text-white font-medium">{sf.stand.name}</p>
                    <p className="text-xs text-gray-400">
                      {sf.stand.location} &middot; {sf.stand.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-red-400 font-semibold text-sm">
                    ${sf.totalRevenueAtRisk.toLocaleString()}
                  </span>
                  <OverloadBadge ratio={sf.peakOverloadRatio} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 3 Stress Windows */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top 3 Stress Windows</h2>
          <div className="space-y-3">
            {summary.topStressWindows.slice(0, 3).map((sw, i) => {
              const matchingEvent = forecast.events.find((e) => e.bucket === sw.bucket);
              return (
                <div
                  key={sw.bucket}
                  className="flex items-center justify-between py-3 px-4 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm font-mono w-5">{i + 1}.</span>
                    <div>
                      <p className="text-white font-medium font-mono">{sw.bucket}</p>
                      {matchingEvent && (
                        <p className="text-xs text-blue-400">{matchingEvent.label}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-400 font-semibold text-sm">
                      {sw.totalOverload.toFixed(2)} overload
                    </p>
                    <p className="text-xs text-gray-500">aggregate ratio above 1.0</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Assumptions</h2>
        <ul className="space-y-1.5">
          {assumptions.map((a, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-gray-500 mt-0.5">&#8226;</span>
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
