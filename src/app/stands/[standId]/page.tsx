"use client";

import { useParams } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import KPICard from "@/components/shared/KPICard";
import Link from "next/link";

export default function StandDetailPage() {
  const { standId } = useParams<{ standId: string }>();
  const { forecast, isLoading } = useGameContext();

  if (isLoading) return <div className="text-gray-400">Loading...</div>;
  if (!forecast) return <div className="text-gray-400">Select a game to view forecast</div>;

  const standForecast = forecast.stands.find((sf) => sf.stand.id === standId);
  if (!standForecast) return <div className="text-gray-400">Stand not found</div>;

  const { stand, buckets, totalRevenueAtRisk, peakOverloadRatio } = standForecast;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/heatmap" className="text-blue-400 hover:text-blue-300 text-sm">&larr; Back to Heatmap</Link>
        <h2 className="text-xl font-bold text-white">{stand.name}</h2>
        <span className="text-sm px-2 py-0.5 rounded bg-gray-800 text-gray-400">{stand.category}</span>
        <span className="text-sm text-gray-500">{stand.location}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Revenue at Risk" value={Math.round(totalRevenueAtRisk)} variant="danger" tooltip="Total estimated revenue lost at this stand when demand exceeds capacity" />
        <KPICard label="Peak Overload" value={`${(peakOverloadRatio * 100).toFixed(0)}%`} variant={peakOverloadRatio > 1 ? "danger" : "success"} tooltip="Highest demand-to-capacity ratio across all time buckets. Over 100% means demand exceeds capacity" />
        <KPICard label="Staff" value={String(stand.staffCount)} tooltip="Number of staff currently assigned to this stand" />
        <KPICard label="Avg Transaction" value={stand.avgTransactionValue} tooltip="Average dollar value per transaction at this stand based on historical data" />
        <KPICard label="Service Rate" value={`${stand.serviceRatePerStaff}/staff/10min`} tooltip="Number of transactions one staff member can process per 10-minute window" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-3 text-gray-400 font-medium">Time Bucket</th>
              <th className="text-right p-3 text-gray-400 font-medium">Predicted Tx</th>
              <th className="text-right p-3 text-gray-400 font-medium">Capacity</th>
              <th className="text-right p-3 text-gray-400 font-medium">Overload</th>
              <th className="text-right p-3 text-gray-400 font-medium">Revenue at Risk</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.bucket} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-3 text-white font-mono">{b.bucket}</td>
                <td className="p-3 text-right text-white">{b.predictedTransactions}</td>
                <td className="p-3 text-right text-gray-400">{Math.round(b.capacity)}</td>
                <td className="p-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    b.overloadRatio > 1.2 ? "bg-red-900 text-red-300" :
                    b.overloadRatio > 1.0 ? "bg-orange-900 text-orange-300" :
                    b.overloadRatio > 0.9 ? "bg-yellow-900 text-yellow-300" :
                    "bg-green-900 text-green-300"
                  }`}>
                    {(b.overloadRatio * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="p-3 text-right text-white">
                  {b.revenueAtRisk > 0 ? `$${Math.round(b.revenueAtRisk).toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
