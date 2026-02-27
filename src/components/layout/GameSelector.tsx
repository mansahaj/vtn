"use client";

import { useGameContext } from "@/lib/game-context";

export default function GameSelector() {
  const { games, selectedGameId, setSelectedGameId, mode, setMode, forecast } = useGameContext();

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-400">Game:</label>
        <select
          value={selectedGameId ?? ""}
          onChange={(e) => setSelectedGameId(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.date} — vs {g.opponent}
            </option>
          ))}
        </select>
        {forecast && (
          <span className="text-sm text-gray-500">
            Attendance: <span className="text-white font-medium">{forecast.game.expectedAttendance.toLocaleString()}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("forecast")}
          className={`px-3 py-1 text-sm rounded ${
            mode === "forecast" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Forecast
        </button>
        <button
          onClick={() => setMode("live")}
          className={`px-3 py-1 text-sm rounded ${
            mode === "live" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Live
        </button>
      </div>
    </div>
  );
}
