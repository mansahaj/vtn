"use client";

interface DataContextBadgeProps {
  status: "upcoming" | "live" | "completed";
}

export default function DataContextBadge({ status }: DataContextBadgeProps) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Live Data
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
        Historical
      </span>
    );
  }

  // upcoming
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16l4-8 4 4 5-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Predictive Forecast
    </span>
  );
}
