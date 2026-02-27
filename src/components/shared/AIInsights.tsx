"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Insight {
  id: string;
  type: "risk" | "opportunity" | "pattern";
  title: string;
  body: string;
  confidence: number;
}

const TYPE_CONFIG = {
  risk: {
    borderColor: "border-l-red-500",
    badgeBg: "bg-red-900/50 text-red-300",
    label: "Risk",
  },
  opportunity: {
    borderColor: "border-l-green-500",
    badgeBg: "bg-green-900/50 text-green-300",
    label: "Opportunity",
  },
  pattern: {
    borderColor: "border-l-blue-500",
    badgeBg: "bg-blue-900/50 text-blue-300",
    label: "Pattern",
  },
};

function SparkleIcon() {
  return (
    <svg
      className="w-5 h-5 text-purple-400"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
    </svg>
  );
}

function TypingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current <= text.length) {
        setDisplayed(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, 8);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-1.5 h-4 bg-purple-400 ml-0.5 animate-pulse align-text-bottom" />
      )}
    </span>
  );
}

export default function AIInsights({ gameId }: { gameId: string }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTypingIndex, setActiveTypingIndex] = useState(0);

  useEffect(() => {
    if (!gameId) return;

    setLoading(true);
    setError(null);
    setInsights([]);
    setActiveTypingIndex(0);

    // Simulate a brief "thinking" delay for demo effect
    const timer = setTimeout(() => {
      fetch(`/api/insights/${gameId}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch insights (${r.status})`);
          return r.json();
        })
        .then((data: { insights: Insight[] }) => {
          setInsights(data.insights);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }, 1200);

    return () => clearTimeout(timer);
  }, [gameId]);

  if (!gameId) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <SparkleIcon />
        <h2 className="text-lg font-semibold text-white">AI Analysis</h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-purple-900/50 text-purple-300 border border-purple-700/50">
          Beta
        </span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 py-6">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-gray-400">
            Generating insights from forecast data...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-4">
          <p className="text-sm text-red-400">Failed to generate insights: {error}</p>
        </div>
      )}

      {/* Insights */}
      {!loading && !error && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const config = TYPE_CONFIG[insight.type];
            const isTypingThis = index === activeTypingIndex;
            const hasTyped = index < activeTypingIndex;

            return (
              <div
                key={insight.id}
                className={`border-l-4 ${config.borderColor} bg-gray-800/50 rounded-r-lg p-4 transition-opacity duration-300 ${
                  index > activeTypingIndex ? "opacity-0" : "opacity-100"
                }`}
              >
                {/* Insight header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${config.badgeBg}`}
                    >
                      {config.label}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      {insight.title}
                    </h3>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-gray-800 border border-gray-700">
                    {(insight.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>

                {/* Insight body with typing effect */}
                <p className="text-sm text-gray-300 leading-relaxed">
                  {isTypingThis ? (
                    <TypingText
                      text={insight.body}
                      onComplete={() => setActiveTypingIndex((prev) => prev + 1)}
                    />
                  ) : hasTyped ? (
                    insight.body
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
