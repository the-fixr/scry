'use client';

import { useState, useEffect } from 'react';
import {
  getAllPredictions,
  getExpiredUnresolved,
  resolvePrediction,
  type Prediction,
} from '../lib/predictions';

interface PredictionHistoryProps {
  onResolve?: () => void;
}

export function PredictionHistory({ onResolve }: PredictionHistoryProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    setPredictions(getAllPredictions());
  }, []);

  // Auto-resolve expired predictions (simplified — uses current price = entry price as placeholder)
  useEffect(() => {
    const expired = getExpiredUnresolved();
    if (expired.length > 0) {
      // In real app, we'd fetch current prices. For MVP, mark as needing resolution.
      // The user clicks "Resolve" to trigger price check.
    }
  }, []);

  const handleResolve = (id: string, currentPrice: number) => {
    resolvePrediction(id, currentPrice);
    setPredictions(getAllPredictions());
    onResolve?.();
  };

  if (predictions.length === 0) {
    return (
      <div className="text-center text-gray-600 text-xs py-6">
        No predictions yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {predictions.slice(0, 10).map(p => {
        const isExpired = !p.resolved && Date.now() >= p.expiresAt;
        const timeLeft = p.expiresAt - Date.now();
        const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));

        return (
          <div key={p.id} className="bg-surface border border-border rounded-lg p-2.5 text-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">${p.tokenSymbol}</span>
                <span className={p.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                  {p.direction === 'up' ? '▲' : '▼'}
                </span>
                <span className="text-gray-500">{p.stake} $SCRY</span>
              </div>
              {p.resolved ? (
                <span className={`font-medium ${p.result === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.result === 'win' ? `+${p.payout}` : `-${p.stake}`}
                </span>
              ) : isExpired ? (
                <button
                  onClick={() => handleResolve(p.id, p.entryPrice * 1.05)} // placeholder
                  className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30"
                >
                  Resolve
                </button>
              ) : (
                <span className="text-gray-500">{hoursLeft}h left</span>
              )}
            </div>
            <div className="text-[10px] text-gray-600">
              Entry: ${p.entryPrice.toFixed(6)}
              {p.exitPrice && ` → Exit: $${p.exitPrice.toFixed(6)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
