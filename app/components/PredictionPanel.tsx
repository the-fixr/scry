'use client';

import { useState } from 'react';
import { useWallet } from './WalletProvider';
import { PREDICTION_CONFIG } from '../lib/constants';
import {
  createPrediction,
  getActivePredictionForToken,
  type Prediction,
} from '../lib/predictions';

interface PredictionPanelProps {
  tokenSymbol: string;
  currentPrice: number | null; // USD price
  scryBalance: number;
  onPredictionMade?: (prediction: Prediction) => void;
}

export function PredictionPanel({
  tokenSymbol,
  currentPrice,
  scryBalance,
  onPredictionMade,
}: PredictionPanelProps) {
  const { isConnected } = useWallet();
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [stake, setStake] = useState(PREDICTION_CONFIG.minStake);

  const existingPrediction = getActivePredictionForToken(tokenSymbol);

  if (existingPrediction) {
    const timeLeft = existingPrediction.expiresAt - Date.now();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000));
    const minsLeft = Math.max(0, Math.floor((timeLeft % 3600000) / 60000));

    return (
      <div className="bg-surface border border-border rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">Active Prediction</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${existingPrediction.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {existingPrediction.direction === 'up' ? '▲ Up' : '▼ Down'}
            </span>
            <span className="text-xs text-gray-500">{existingPrediction.stake} $SCRY</span>
          </div>
          <div className="text-[10px] text-gray-500">
            {hoursLeft}h {minsLeft}m left
          </div>
        </div>
        <div className="mt-1 text-[10px] text-gray-600">
          Entry: ${existingPrediction.entryPrice.toFixed(6)}
        </div>
      </div>
    );
  }

  const handlePredict = () => {
    if (!direction || !currentPrice || !isConnected) return;
    const prediction = createPrediction(tokenSymbol, direction, stake, currentPrice);
    onPredictionMade?.(prediction);
    setDirection(null);
    setStake(PREDICTION_CONFIG.minStake);
  };

  const canAfford = scryBalance >= stake;

  return (
    <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
      <div className="text-xs text-gray-400">Predict 24h</div>

      {/* Direction */}
      <div className="flex gap-2">
        <button
          onClick={() => setDirection('up')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            direction === 'up' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'bg-slate-950 text-gray-500 hover:text-gray-300'
          }`}
        >
          ▲ Up
        </button>
        <button
          onClick={() => setDirection('down')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
            direction === 'down' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50' : 'bg-slate-950 text-gray-500 hover:text-gray-300'
          }`}
        >
          ▼ Down
        </button>
      </div>

      {/* Stake slider */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Stake</span>
          <span>{stake} $SCRY</span>
        </div>
        <input
          type="range"
          min={PREDICTION_CONFIG.minStake}
          max={Math.min(PREDICTION_CONFIG.maxStake, scryBalance || PREDICTION_CONFIG.minStake)}
          value={stake}
          onChange={e => setStake(Number(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
          <span>{PREDICTION_CONFIG.minStake}</span>
          <span>{PREDICTION_CONFIG.maxStake}</span>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handlePredict}
        disabled={!direction || !isConnected || !canAfford || !currentPrice}
        className="w-full py-2 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {!isConnected ? 'Connect Wallet' :
         !canAfford ? 'Insufficient $SCRY' :
         !direction ? 'Select Direction' :
         `Stake ${stake} $SCRY`}
      </button>
    </div>
  );
}
