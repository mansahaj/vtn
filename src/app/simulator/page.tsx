"use client";

import { useGameContext } from "@/lib/game-context";
import KPICard from "@/components/shared/KPICard";
import AIInsights from "@/components/shared/AIInsights";
import { useState, useEffect, useCallback, useRef } from "react";
import { SimulationResponse, PortableStationRecommendation } from "@/lib/types";
import DataContextBadge from "@/components/shared/DataContextBadge";

function HeaderTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-gray-500 text-gray-500 text-[9px] cursor-help leading-none hover:border-gray-300 hover:text-gray-300"
      >
        ?
      </span>
      {show && (
        <span className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-52 px-3 py-2 text-xs text-gray-200 bg-gray-800 border border-gray-600 rounded-lg shadow-xl normal-case tracking-normal font-normal">
          {text}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px border-4 border-transparent border-b-gray-600" />
        </span>
      )}
    </span>
  );
}

export default function SimulatorPage() {
  const { forecast, isLoading, selectedGameId } = useGameContext();

  const [staffConfig, setStaffConfig] = useState<Record<string, number>>({});
  const [serviceRateConfig, setServiceRateConfig] = useState<Record<string, number>>({});
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simTimestamp, setSimTimestamp] = useState<string | null>(null);
  const [simDurationMs, setSimDurationMs] = useState<number | null>(null);
  const [appliedMoves, setAppliedMoves] = useState<Map<string, { rec: PortableStationRecommendation; deployedAt: number }>>(new Map());
  const [deployingKeys, setDeployingKeys] = useState<Map<string, { rec: PortableStationRecommendation; countdown: number }>>(new Map());
  const [, setUndoTick] = useState(0); // force re-render for undo countdowns
  const initializedGameId = useRef<string | null>(null);
  const prevSimResultRef = useRef<SimulationResponse | null>(null);

  // Staff cap: 120% of baseline
  const originalTotalStaff = forecast
    ? forecast.stands.reduce((sum, sf) => sum + sf.stand.staffCount, 0)
    : 0;

  // Initialize configs from forecast when it loads or game changes
  useEffect(() => {
    if (!forecast || initializedGameId.current === selectedGameId) return;
    const staff: Record<string, number> = {};
    const rates: Record<string, number> = {};
    for (const sf of forecast.stands) {
      staff[sf.stand.id] = sf.stand.staffCount;
      rates[sf.stand.id] = sf.stand.serviceRatePerStaff;
    }
    setStaffConfig(staff);
    setServiceRateConfig(rates);
    setSimResult(null);
    setSimError(null);
    setAppliedMoves(new Map());
    initializedGameId.current = selectedGameId;
  }, [forecast, selectedGameId]);

  // Track simResult changes (keep appliedMoves across re-simulations)
  useEffect(() => {
    if (simResult && simResult !== prevSimResultRef.current) {
      prevSimResultRef.current = simResult;
    }
  }, [simResult]);

  // Deploy countdown interval (1s tick)
  useEffect(() => {
    if (deployingKeys.size === 0) return;
    const interval = setInterval(() => {
      setDeployingKeys((prev) => {
        const next = new Map(prev);
        const entries = Array.from(next.entries());
        for (const [key, val] of entries) {
          if (val.countdown <= 1) {
            next.delete(key);
            setAppliedMoves((am) => new Map(am).set(key, { rec: val.rec, deployedAt: Date.now() }));
            setStaffConfig((sc) => ({
              ...sc,
              [val.rec.targetStandId]: (sc[val.rec.targetStandId] ?? 0) + val.rec.staffCount,
            }));
          } else {
            next.set(key, { ...val, countdown: val.countdown - 1 });
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deployingKeys.size]);

  // Undo countdown tick (1s) for deployed stations
  useEffect(() => {
    if (appliedMoves.size === 0) return;
    const interval = setInterval(() => {
      setUndoTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [appliedMoves.size]);

  // Debounced simulation call
  useEffect(() => {
    if (!selectedGameId || Object.keys(staffConfig).length === 0) return;

    const timer = setTimeout(() => {
      setSimLoading(true);
      setSimError(null);
      const start = performance.now();
      fetch(`/api/simulate/${selectedGameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffConfig,
          serviceRateConfig,
        }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Simulation failed (${r.status})`);
          return r.json();
        })
        .then((data: SimulationResponse) => {
          const duration = performance.now() - start;
          setSimResult(data);
          setSimDurationMs(parseFloat(duration.toFixed(2)));
          setSimTimestamp(new Date().toLocaleTimeString("en-US", { hour12: false }));
          setSimLoading(false);
        })
        .catch((err) => {
          setSimError(err.message);
          setSimLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [staffConfig, serviceRateConfig, selectedGameId]);

  const updateStaff = useCallback((standId: string, value: number) => {
    setStaffConfig((prev) => {
      const clamped = Math.max(0, value);
      const othersTotal = Object.entries(prev).reduce((sum, [id, n]) => id === standId ? sum : sum + n, 0);
      const capForStand = Math.ceil(originalTotalStaff * 1.2) - othersTotal;
      return { ...prev, [standId]: Math.min(clamped, capForStand) };
    });
  }, [originalTotalStaff]);

  const updateServiceRate = useCallback((standId: string, value: number) => {
    setServiceRateConfig((prev) => ({ ...prev, [standId]: Math.max(0, value) }));
  }, []);

  const startDeploy = useCallback(
    (rec: PortableStationRecommendation, recKey: string) => {
      setDeployingKeys((prev) => new Map(prev).set(recKey, { rec, countdown: 3 }));
    },
    []
  );

  const cancelDeploy = useCallback(
    (recKey: string) => {
      setDeployingKeys((prev) => {
        const next = new Map(prev);
        next.delete(recKey);
        return next;
      });
    },
    []
  );

  const undoRecommendation = useCallback(
    (recKey: string, rec: PortableStationRecommendation) => {
      setAppliedMoves((prev) => {
        const next = new Map(prev);
        next.delete(recKey);
        return next;
      });
      setStaffConfig((prev) => ({
        ...prev,
        [rec.targetStandId]: Math.max(0, (prev[rec.targetStandId] ?? 0) - rec.staffCount),
      }));
    },
    []
  );

  // Build a lookup for post-simulation stand overload status
  const overloadedStandIds = new Set<string>();
  if (simResult) {
    for (const sf of simResult.stands) {
      if (sf.peakOverloadRatio > 1.0) {
        overloadedStandIds.add(sf.stand.id);
      }
    }
  }

  // Calculate total staff to detect net changes
  const maxStaff = Math.ceil(originalTotalStaff * 1.2);
  const currentTotalStaff = Object.values(staffConfig).reduce((sum, n) => sum + n, 0);
  const staffDelta = currentTotalStaff - originalTotalStaff;
  const atStaffCap = currentTotalStaff >= maxStaff;

  // --- Render ---

  if (!selectedGameId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 text-lg">Select a game to begin simulation</p>
      </div>
    );
  }

  if (isLoading || !forecast) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-3" />
          <p className="text-gray-400 text-lg">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  if (forecast.stands.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 text-lg">No stands available for this game</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Staff Redeployment Simulator</h1>
            <DataContextBadge status={forecast.game.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {forecast.game.opponent} &mdash; {forecast.game.date} &middot; {forecast.game.venue}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {simTimestamp && !simLoading && (
            <span className="text-xs text-gray-400 font-mono">
              Last recalculated: {simTimestamp}
            </span>
          )}
          {simDurationMs !== null && !simLoading && (
            <span className="bg-gray-800 text-green-400 text-xs font-mono px-2 py-1 rounded">
              {simDurationMs.toFixed(2)}ms
            </span>
          )}
          {simLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Recalculating...
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Original Revenue at Risk"
          value={simResult?.originalRevenueAtRisk ?? forecast.summary.totalRevenueAtRisk}
          sublabel="Before staff changes"
          variant="danger"
          tooltip="Baseline revenue at risk with the current staff configuration before any changes"
        />
        <KPICard
          label="New Revenue at Risk"
          value={simResult?.newRevenueAtRisk ?? forecast.summary.totalRevenueAtRisk}
          sublabel={simResult ? "After simulation" : "Awaiting changes"}
          variant={simResult && simResult.newRevenueAtRisk < simResult.originalRevenueAtRisk ? "success" : "danger"}
          tooltip="Projected revenue at risk after your proposed staff redeployment changes"
        />
        <KPICard
          label="Recovery / Delta"
          value={simResult ? simResult.delta : 0}
          sublabel={
            simResult
              ? simResult.delta > 0
                ? "Revenue recovered"
                : simResult.delta < 0
                ? "Additional risk added"
                : "No change"
              : "Make changes to simulate"
          }
          variant={
            simResult
              ? simResult.delta > 0
                ? "success"
                : simResult.delta < 0
                ? "danger"
                : "default"
              : "default"
          }
        />
        <KPICard
          label="Total Staff Deployed"
          value={`${currentTotalStaff} / ${maxStaff}`}
          sublabel={
            atStaffCap
              ? "At maximum capacity"
              : staffDelta === 0
              ? "No net change"
              : staffDelta > 0
              ? `+${staffDelta} from baseline`
              : `${staffDelta} from baseline`
          }
          variant={atStaffCap ? "danger" : staffDelta !== 0 ? "warning" : "default"}
        />
      </div>

      {/* Simulation Error */}
      {simError && (
        <div className="bg-red-950/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-400 text-sm font-medium">Simulation Error</p>
          <p className="text-red-300 text-sm mt-1">{simError}</p>
        </div>
      )}

      {/* Staff Editor Table */}
      <div className="bg-gray-900 border border-gray-700 border-l-2 border-l-blue-500 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Staff Configuration</h2>
          <button
            onClick={() => {
              const staff: Record<string, number> = {};
              const rates: Record<string, number> = {};
              for (const sf of forecast.stands) {
                staff[sf.stand.id] = sf.stand.staffCount;
                rates[sf.stand.id] = sf.stand.serviceRatePerStaff;
              }
              setStaffConfig(staff);
              setServiceRateConfig(rates);
            }}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded border border-gray-600 hover:border-gray-500 transition-colors"
          >
            Reset to Default
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">
                  Stand Name
                  <HeaderTooltip text="Concession stand location within Save-On-Foods Memorial Centre" />
                </th>
                <th className="text-left px-5 py-3 font-medium">
                  Category
                  <HeaderTooltip text="Type of service: food, beer, or premium" />
                </th>
                <th className="text-center px-5 py-3 font-medium">
                  Current Staff
                  <HeaderTooltip text="Baseline staff count assigned to this stand before any changes" />
                </th>
                <th className="text-center px-5 py-3 font-medium">
                  New Staff
                  <HeaderTooltip text="Adjusted staff count — use +/- buttons or type a number to simulate redeployment" />
                </th>
                <th className="text-center px-5 py-3 font-medium">
                  Service Rate
                  <HeaderTooltip text="Transactions one staff member can process per 10-minute window (tx/staff/10min)" />
                </th>
                <th className="text-center px-5 py-3 font-medium">
                  $ Saved
                  <HeaderTooltip text="Revenue recovered at this stand compared to baseline staffing" />
                </th>
                <th className="text-center px-5 py-3 font-medium">
                  Status
                  <HeaderTooltip text="Peak demand-to-capacity ratio across all time buckets. Below 100% means demand is within capacity" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {forecast.stands.map((sf) => {
                const standId = sf.stand.id;
                const newStaff = staffConfig[standId] ?? sf.stand.staffCount;
                const serviceRate = serviceRateConfig[standId] ?? sf.stand.serviceRatePerStaff;
                const isOverloaded = overloadedStandIds.has(standId);
                const staffChanged = newStaff !== sf.stand.staffCount;
                const rateChanged = serviceRate !== sf.stand.serviceRatePerStaff;

                // Find post-sim stand data for this stand
                const simStand = simResult?.stands.find((s) => s.stand.id === standId);
                const peakRatio = simStand?.peakOverloadRatio ?? sf.peakOverloadRatio;
                const baselineRatio = sf.peakOverloadRatio;

                // Per-stand revenue delta
                const baselineRisk = sf.totalRevenueAtRisk;
                const simRisk = simStand?.totalRevenueAtRisk ?? baselineRisk;
                const revenueDelta = baselineRisk - simRisk;

                // Multi-tier status
                let statusLabel: string;
                let statusColor: string;
                let dotColor: string;
                if (peakRatio > 2.0) {
                  statusLabel = "Critical";
                  statusColor = "bg-red-900/50 text-red-300";
                  dotColor = "bg-red-400";
                } else if (peakRatio > 1.2) {
                  statusLabel = "Overloaded";
                  statusColor = "bg-orange-900/50 text-orange-300";
                  dotColor = "bg-orange-400";
                } else if (peakRatio > 1.0) {
                  statusLabel = "Near Capacity";
                  statusColor = "bg-yellow-900/50 text-yellow-300";
                  dotColor = "bg-yellow-400";
                } else {
                  statusLabel = "OK";
                  statusColor = "bg-green-900/50 text-green-300";
                  dotColor = "bg-green-400";
                }

                const CATEGORY_COLORS: Record<string, string> = {
                  beer: "bg-amber-900/50 text-amber-300",
                  food: "bg-orange-900/50 text-orange-300",
                  merchandise: "bg-purple-900/50 text-purple-300",
                  premium: "bg-blue-900/50 text-blue-300",
                };

                return (
                  <tr
                    key={standId}
                    className={`transition-colors ${
                      isOverloaded
                        ? "bg-red-950/20 hover:bg-red-950/30"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    {/* Stand Name */}
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{sf.stand.name}</p>
                      <p className="text-xs text-gray-500">{sf.stand.location}</p>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          CATEGORY_COLORS[sf.stand.category] ?? "bg-gray-800 text-gray-300"
                        }`}
                      >
                        {sf.stand.category}
                      </span>
                    </td>

                    {/* Current Staff (readonly) */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-gray-400 font-mono">{sf.stand.staffCount}</span>
                    </td>

                    {/* New Staff (editable) */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateStaff(standId, newStaff - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium"
                          aria-label={`Decrease staff for ${sf.stand.name}`}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={newStaff}
                          onChange={(e) =>
                            updateStaff(standId, parseInt(e.target.value, 10) || 0)
                          }
                          min={0}
                          className={`w-14 h-7 text-center text-sm font-mono rounded border bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            staffChanged
                              ? "border-blue-500 bg-blue-950/30"
                              : "border-gray-600"
                          }`}
                        />
                        <button
                          onClick={() => updateStaff(standId, newStaff + 1)}
                          disabled={atStaffCap}
                          className={`w-7 h-7 flex items-center justify-center rounded bg-gray-800 border border-gray-600 transition-colors text-sm font-medium ${
                            atStaffCap
                              ? "text-gray-600 cursor-not-allowed"
                              : "text-gray-300 hover:bg-gray-700 hover:text-white"
                          }`}
                          aria-label={`Increase staff for ${sf.stand.name}`}
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Service Rate (editable) */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          value={serviceRate}
                          onChange={(e) =>
                            updateServiceRate(
                              standId,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min={0}
                          step={0.5}
                          className={`w-20 h-7 text-center text-sm font-mono rounded border bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            rateChanged
                              ? "border-blue-500 bg-blue-950/30"
                              : "border-gray-600"
                          }`}
                        />
                      </div>
                    </td>

                    {/* $ Saved */}
                    <td className="px-5 py-3 text-center">
                      {simResult ? (
                        <span className={`text-sm font-mono font-medium ${
                          revenueDelta > 0 ? "text-green-400" :
                          revenueDelta < 0 ? "text-red-400" :
                          "text-gray-500"
                        }`}>
                          {revenueDelta > 0 ? `+$${Math.round(revenueDelta).toLocaleString()}` :
                           revenueDelta < 0 ? `-$${Math.round(Math.abs(revenueDelta)).toLocaleString()}` :
                           "$0"}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">--</span>
                      )}
                    </td>

                    {/* Status — multi-tier */}
                    <td className="px-5 py-3 text-center">
                      {simResult ? (
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            {statusLabel} ({(peakRatio * 100).toFixed(0)}%)
                          </span>
                          {peakRatio < baselineRatio && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              &darr; from {(baselineRatio * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Deployed Portable Stations divider + rows */}
              {appliedMoves.size > 0 && (
                <>
                  <tr>
                    <td colSpan={7} className="px-5 py-3 bg-gray-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-sm font-semibold text-white">Deployed Portable Stations</span>
                        <span className="text-xs text-gray-400">({appliedMoves.size})</span>
                      </div>
                    </td>
                  </tr>
                  {Array.from(appliedMoves.entries()).map(([recKey, { rec, deployedAt }]) => {
                    const elapsed = Date.now() - deployedAt;
                    const UNDO_WINDOW = 300000; // 5 minutes
                    const canUndo = elapsed < UNDO_WINDOW;
                    const remainingSec = Math.max(0, Math.ceil((UNDO_WINDOW - elapsed) / 1000));
                    const remainingMin = Math.floor(remainingSec / 60);
                    const remainingSecPart = remainingSec % 60;
                    const undoLabel = `Undo (${remainingMin}:${remainingSecPart.toString().padStart(2, "0")})`;

                    return (
                      <tr key={`deployed-${recKey}`} className="bg-green-950/20 hover:bg-green-950/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">
                            Portable {rec.targetCategory} station
                          </p>
                          <p className="text-xs text-gray-500">Near {rec.targetStandName}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-300">
                            {rec.targetCategory}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-gray-500 font-mono">—</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-green-400 font-mono font-medium">+{rec.staffCount}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-gray-400 font-mono text-xs">{rec.window}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-green-400 text-sm font-mono font-medium">
                            +${rec.revenueImpact.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {canUndo ? (
                            <button
                              onClick={() => undoRecommendation(recKey, rec)}
                              className="px-3 py-1 text-xs font-medium rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                            >
                              {undoLabel}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
                              Locked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Portable Stations */}
      {simResult && (() => {
        const pendingRecs = simResult.recommendedMoves.filter((rec) => {
          const recKey = `${rec.targetStandId}-${rec.window}`;
          return !appliedMoves.has(recKey) && !deployingKeys.has(recKey);
        });
        return pendingRecs.length > 0 ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Recommended Portable Stations</h2>
            <div className="space-y-3">
              {pendingRecs.map((rec, i) => {
                const recKey = `${rec.targetStandId}-${rec.window}`;
                return (
                  <div
                    key={`${recKey}-${i}`}
                    className="flex items-center justify-between gap-4 py-3 px-4 bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        Deploy portable <span className="font-semibold text-amber-400">{rec.targetCategory}</span> station near{" "}
                        <span className="font-semibold text-blue-400">
                          {rec.targetStandName}
                        </span>{" "}
                        <span className="text-gray-400">({rec.targetLocation})</span>{" "}
                        during{" "}
                        <span className="font-mono text-yellow-400">{rec.window}</span>
                        {" "}&mdash;{" "}recovers{" "}
                        <span className="font-semibold text-green-400">
                          ${rec.revenueImpact.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                    </div>
                    <button
                      onClick={() => startDeploy(rec, recKey)}
                      disabled={atStaffCap}
                      className={`shrink-0 px-4 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        atStaffCap
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500"
                      }`}
                    >
                      Deploy
                    </button>
                  </div>
                );
              })}
              {/* Deploying countdown items */}
              {Array.from(deployingKeys.entries()).map(([recKey, { rec, countdown }]) => (
                <div
                  key={`deploying-${recKey}`}
                  className="flex items-center justify-between gap-4 py-3 px-4 bg-green-950/30 border border-green-900/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      Deploying portable <span className="font-semibold text-amber-400">{rec.targetCategory}</span> station near{" "}
                      <span className="font-semibold text-blue-400">{rec.targetStandName}</span>{" "}
                      <span className="text-gray-400">({rec.targetLocation})</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm font-semibold">Deployed ({countdown}s)</span>
                    <button
                      onClick={() => cancelDeploy(recKey)}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : simResult.recommendedMoves.length === 0 ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white mb-2">Recommended Portable Stations</h2>
            <p className="text-gray-400 text-sm">
              No portable station deployments recommended. The current configuration
              appears optimal.
            </p>
          </div>
        ) : null;
      })()}

      {/* AI Insights */}
      <AIInsights gameId={selectedGameId} />
    </div>
  );
}
