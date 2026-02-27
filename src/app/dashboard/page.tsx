"use client";

import { useGameContext } from "@/lib/game-context";
import KPICard from "@/components/shared/KPICard";
import AIInsights from "@/components/shared/AIInsights";
import DataContextBadge from "@/components/shared/DataContextBadge";

function OverloadBadge({ ratio }: { ratio: number }) {
  let color = "bg-green-900 text-green-300";
  if (ratio > 1.5) color = "bg-red-900 text-red-300";
  else if (ratio > 1.2) color = "bg-orange-900 text-orange-300";
  else if (ratio > 1.0) color = "bg-yellow-900 text-yellow-300";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {ratio.toFixed(1)}x capacity
    </span>
  );
}

export default function DashboardPage() {
  const { forecast, isLoading, selectedGameId, fetchDurationMs, lastUpdatedAt } = useGameContext();

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
      {/* Page header with hero attendance */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
            <DataContextBadge status={forecast.game.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {forecast.game.opponent} &mdash; {forecast.game.date} &middot; {forecast.game.venue}
          </p>
          {lastUpdatedAt && (
            <span className="text-xs text-gray-400 font-mono mt-1 inline-block">
              Last updated: {lastUpdatedAt}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-lg px-6 py-4">
          {/* People icon */}
          <svg
            className="w-10 h-10 text-gray-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Attendance</p>
            <p className="text-5xl font-bold text-white leading-tight">
              {forecast.game.expectedAttendance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">{forecast.game.venue}</p>
          </div>
        </div>
      </div>

      {/* Processing timer badge */}
      {fetchDurationMs !== null && (
        <div>
          <span className="bg-gray-800 text-green-400 text-xs font-mono px-2 py-1 rounded">
            Data processed in {fetchDurationMs.toFixed(2)}ms
          </span>
        </div>
      )}

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
          label="Stands Monitored"
          value={forecast.stands.length}
          sublabel={
            (() => {
              const cats: Record<string, number> = {};
              forecast.stands.forEach((s) => {
                cats[s.stand.category] = (cats[s.stand.category] || 0) + 1;
              });
              return Object.entries(cats)
                .map(([cat, count]) => `${count} ${cat}`)
                .join(", ");
            })()
          }
          tooltip="Total number of concession and retail stands included in the forecast model"
        />
      </div>

      {/* Two-column layout for bottleneck stands and stress windows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Bottleneck Stands */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">
            Top 3 {forecast.game.status === "completed" ? "" : "Predicted "}Bottlenecks
          </h2>
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
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-semibold text-sm">
                      ${sf.totalRevenueAtRisk.toLocaleString()}
                    </span>
                    <OverloadBadge ratio={sf.peakOverloadRatio} />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    Overloaded in {sf.buckets.filter(b => b.overloadRatio > 1).length} of {sf.buckets.length} time slots
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 3 Stress Windows */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">
            Top 3 {forecast.game.status === "completed" ? "" : "Predicted "}Stress Windows
          </h2>
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
                      ${sw.revenueAtRisk.toLocaleString()} at risk
                    </p>
                    <p className="text-xs text-gray-500">{sw.overloadedStandCount} stand{sw.overloadedStandCount !== 1 ? "s" : ""} overloaded</p>
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

      {/* AI Insights */}
      <AIInsights gameId={selectedGameId} />
    </div>
  );
}
