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
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [mode, setMode] = useState<"forecast" | "live">("forecast");
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    fetch(`/api/forecast/${selectedGameId}`)
      .then((r) => r.json())
      .then((data) => {
        setForecast(data);
        setIsLoading(false);
      });
  }, [selectedGameId]);

  return (
    <GameContext.Provider
      value={{ games, selectedGameId, setSelectedGameId, mode, setMode, forecast, isLoading }}
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
