"use client";

import { useState } from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  tooltip?: string;
  variant?: "default" | "danger" | "success" | "warning";
  dataType?: "predictive" | "live";
}

const VARIANT_STYLES = {
  default: "border-gray-700",
  danger: "border-red-700 bg-red-950/30",
  success: "border-green-700 bg-green-950/30",
  warning: "border-yellow-700 bg-yellow-950/30",
};

export default function KPICard({ label, value, sublabel, tooltip, variant = "default", dataType }: KPICardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`bg-gray-900 border rounded-lg p-4 ${VARIANT_STYLES[variant]} ${dataType === "predictive" ? "border-l-2 border-l-blue-500" : dataType === "live" ? "border-l-2 border-l-green-500" : ""}`}>
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="w-4 h-4 rounded-full border border-gray-500 text-gray-500 hover:border-gray-300 hover:text-gray-300 flex items-center justify-center text-[10px] font-medium transition-colors cursor-help"
            >
              ?
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                <p className="text-xs text-gray-200 leading-relaxed">{tooltip}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-600" />
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white mt-1">{typeof value === "number" ? `$${value.toLocaleString()}` : value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
      {dataType && (
        <span className={`inline-block text-[10px] font-medium mt-1.5 ${dataType === "predictive" ? "text-blue-400" : "text-green-400"}`}>
          {dataType === "predictive" ? "Predicted" : "Live"}
        </span>
      )}
    </div>
  );
}
