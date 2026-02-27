"use client";

import { useRouter } from "next/navigation";
import { StandForecast, GameEvent } from "@/lib/types";
import HeatmapCell from "./HeatmapCell";

interface HeatmapGridProps {
  stands: StandForecast[];
  timeBuckets: string[];
  events: GameEvent[];
  currentBucketIndex?: number | null;
}

export default function HeatmapGrid({ stands, timeBuckets, events, currentBucketIndex }: HeatmapGridProps) {
  const router = useRouter();

  const eventBuckets = new Set(events.map((e) => e.bucket));

  const eventLabelMap = new Map<string, string>();
  for (const e of events) {
    eventLabelMap.set(e.bucket, e.label);
  }

  const columnCount = timeBuckets.length;

  return (
    <div className="overflow-x-auto overflow-y-visible rounded-lg border border-gray-800 pt-16 -mt-16">
      <div
        className="inline-grid gap-px bg-gray-800 min-w-fit"
        style={{
          gridTemplateColumns: `180px repeat(${columnCount}, 48px)`,
        }}
      >
        {/* Top-left corner cell */}
        <div className="sticky left-0 z-20 bg-gray-950 flex items-end p-2">
          <span className="text-xs text-gray-500 font-medium">Stand</span>
        </div>

        {/* Time bucket header labels */}
        {timeBuckets.map((bucket, idx) => (
          <div
            key={bucket}
            className={`bg-gray-950 flex items-end justify-center pb-1 h-16 ${
              currentBucketIndex != null && currentBucketIndex === idx
                ? "ring-2 ring-yellow-400 ring-inset"
                : eventBuckets.has(bucket)
                  ? "ring-2 ring-blue-400 ring-inset"
                  : ""
            }`}
          >
            <span
              className="text-[10px] text-gray-400 font-mono origin-bottom-left whitespace-nowrap inline-block"
              style={{ transform: "rotate(-45deg)", transformOrigin: "center" }}
            >
              {bucket}
            </span>
          </div>
        ))}

        {/* Event label row */}
        <div className="sticky left-0 z-20 bg-gray-950 flex items-center p-2">
          <span className="text-[10px] text-gray-500 font-medium">Events</span>
        </div>
        {timeBuckets.map((bucket, idx) => (
          <div
            key={`event-${bucket}`}
            className={`bg-gray-950 flex items-center justify-center h-6 ${
              currentBucketIndex != null && currentBucketIndex === idx
                ? "ring-2 ring-yellow-400 ring-inset"
                : eventBuckets.has(bucket)
                  ? "ring-2 ring-blue-400 ring-inset"
                  : ""
            }`}
          >
            {currentBucketIndex != null && currentBucketIndex === idx ? (
              <span className="text-[8px] text-yellow-400 font-bold">NOW</span>
            ) : eventLabelMap.has(bucket) ? (
              <span className="text-[8px] text-blue-400 font-medium truncate px-0.5">
                {eventLabelMap.get(bucket)}
              </span>
            ) : null}
          </div>
        ))}

        {/* Stand rows */}
        {stands.map((sf) => (
          <>
            {/* Stand name (sticky left) */}
            <div
              key={`name-${sf.stand.id}`}
              className="sticky left-0 z-10 bg-gray-950 flex items-center px-3 py-1 cursor-pointer hover:bg-gray-900 transition-colors"
              onClick={() => router.push(`/stands/${sf.stand.id}`)}
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-200 font-medium truncate">
                  {sf.stand.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {sf.stand.location}
                </div>
              </div>
            </div>

            {/* Data cells for each bucket */}
            {timeBuckets.map((bucket, bucketIdx) => {
              const bucketData = sf.buckets[bucketIdx];
              if (!bucketData) {
                return (
                  <div
                    key={`${sf.stand.id}-${bucket}`}
                    className="bg-gray-900 w-12 h-10"
                  />
                );
              }

              return (
                <div
                  key={`${sf.stand.id}-${bucket}`}
                  className={
                    currentBucketIndex != null && currentBucketIndex === bucketIdx
                      ? "ring-2 ring-yellow-400 ring-inset"
                      : eventBuckets.has(bucket)
                        ? "ring-2 ring-blue-400 ring-inset"
                        : ""
                  }
                >
                  <HeatmapCell
                    overloadRatio={bucketData.overloadRatio}
                    revenueAtRisk={bucketData.revenueAtRisk}
                    predictedTransactions={bucketData.predictedTransactions}
                    capacity={bucketData.capacity}
                    serviceRatePerStaff={sf.stand.serviceRatePerStaff}
                    onClick={() => router.push(`/stands/${sf.stand.id}`)}
                  />
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
