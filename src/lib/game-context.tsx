"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Game, ForecastResponse } from "./types";

interface GameContextValue {
  games: Game[];
  selectedGameId: string | null;
  setSelectedGameId: (id: string) => void;
  mode: "forecast" | "live";
  setMode: (mode: "forecast" | "live") => void;
  forecast: ForecastResponse | null;
  isLoading: boolean;
  fetchDurationMs: number | null;
  lastUpdatedAt: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [mode, setMode] = useState<"forecast" | "live">("forecast");
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchDurationMs, setFetchDurationMs] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Load games on mount
  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        if (data.length > 0 && !selectedGameId) {
          setSelectedGameId(data[0].id);
        }
      });
  }, []);

  // Fetch forecast when game changes
  useEffect(() => {
    if (!selectedGameId) return;
    setIsLoading(true);
    setFetchDurationMs(null);
    const start = performance.now();
    fetch(`/api/forecast/${selectedGameId}`)
      .then((r) => r.json())
      .then((data) => {
        const duration = performance.now() - start;
        setForecast(data);
        setFetchDurationMs(parseFloat(duration.toFixed(2)));
        setLastUpdatedAt(new Date().toLocaleTimeString("en-US", { hour12: false }));
        setIsLoading(false);
      });
  }, [selectedGameId]);

  return (
    <GameContext.Provider
      value={{ games, selectedGameId, setSelectedGameId, mode, setMode, forecast, isLoading, fetchDurationMs, lastUpdatedAt }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProvider");
  return ctx;
}
