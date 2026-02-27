"use client";

import { useState } from "react";
import { getHeatColor } from "@/lib/constants";

interface HeatmapCellProps {
  overloadRatio: number;
  revenueAtRisk: number;
  predictedTransactions: number;
  capacity: number;
  serviceRatePerStaff: number;
  onClick?: () => void;
}

export default function HeatmapCell({
  overloadRatio,
  revenueAtRisk,
  predictedTransactions,
  capacity,
  serviceRatePerStaff,
  onClick,
}: HeatmapCellProps) {
  const [hovered, setHovered] = useState(false);
  const bgColor = getHeatColor(overloadRatio);

  return (
    <div
      className={`relative w-12 h-10 ${bgColor} cursor-pointer transition-all duration-150 hover:brightness-125 hover:scale-110 hover:z-20`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap text-xs">
            <div className="text-gray-300 space-y-1">
              <div>
                <span className="text-gray-500">Overload:</span>{" "}
                <span className="text-white font-semibold">
                  {(overloadRatio * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Revenue at Risk:</span>{" "}
                <span className="text-red-400 font-semibold">
                  ${revenueAtRisk.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Predicted Tx:</span>{" "}
                <span className="text-white">{predictedTransactions}</span>
              </div>
              <div>
                <span className="text-gray-500">Capacity:</span>{" "}
                <span className="text-white">{capacity}</span>
              </div>
              {overloadRatio > 1.0 && serviceRatePerStaff > 0 && (
                <div>
                  <span className="text-yellow-400 font-semibold">
                    +{Math.ceil((predictedTransactions - capacity) / serviceRatePerStaff)} portable stations needed
                  </span>
                </div>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}
