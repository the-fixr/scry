import { PREDICTION_CONFIG } from './constants';

export interface Prediction {
  id: string;
  tokenSymbol: string;
  direction: 'up' | 'down';
  stake: number; // SCRY tokens staked
  entryPrice: number; // USD price at prediction time
  createdAt: number; // timestamp ms
  expiresAt: number; // timestamp ms
  resolved: boolean;
  result: 'win' | 'loss' | null;
  exitPrice: number | null;
  payout: number | null; // SCRY tokens won (0 if loss)
}

const STORAGE_KEY = 'scanner_predictions';

function loadPredictions(): Prediction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Prediction[];
  } catch {
    return [];
  }
}

function savePredictions(predictions: Prediction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
  } catch (err) {
    console.error('[predictions] save error:', err);
  }
}

export function createPrediction(
  tokenSymbol: string,
  direction: 'up' | 'down',
  stake: number,
  currentPrice: number,
): Prediction {
  const now = Date.now();
  const prediction: Prediction = {
    id: `${tokenSymbol}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    tokenSymbol,
    direction,
    stake: Math.min(Math.max(stake, PREDICTION_CONFIG.minStake), PREDICTION_CONFIG.maxStake),
    entryPrice: currentPrice,
    createdAt: now,
    expiresAt: now + PREDICTION_CONFIG.durationMs,
    resolved: false,
    result: null,
    exitPrice: null,
    payout: null,
  };

  const all = loadPredictions();
  all.push(prediction);
  savePredictions(all);
  return prediction;
}

export function getActivePredictions(): Prediction[] {
  return loadPredictions().filter(p => !p.resolved && Date.now() < p.expiresAt);
}

export function getExpiredUnresolved(): Prediction[] {
  return loadPredictions().filter(p => !p.resolved && Date.now() >= p.expiresAt);
}

export function getPredictionHistory(): Prediction[] {
  return loadPredictions().filter(p => p.resolved).sort((a, b) => b.createdAt - a.createdAt);
}

export function resolvePrediction(id: string, currentPrice: number): Prediction | null {
  const all = loadPredictions();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const prediction = all[idx];
  if (prediction.resolved) return prediction;

  const priceWentUp = currentPrice > prediction.entryPrice;
  const win = (prediction.direction === 'up' && priceWentUp) ||
              (prediction.direction === 'down' && !priceWentUp);

  const houseCut = prediction.stake * PREDICTION_CONFIG.houseCutBps / 10000;

  prediction.resolved = true;
  prediction.exitPrice = currentPrice;
  prediction.result = win ? 'win' : 'loss';
  // Win: get your stake back + opponent's stake minus house cut
  // Simplified for MVP: payout = stake * 2 - houseCut (as if matched 1:1)
  prediction.payout = win ? Math.floor(prediction.stake * 2 - houseCut) : 0;

  all[idx] = prediction;
  savePredictions(all);
  return prediction;
}

export function getActivePredictionForToken(tokenSymbol: string): Prediction | null {
  return getActivePredictions().find(p => p.tokenSymbol === tokenSymbol) ?? null;
}

export function getAllPredictions(): Prediction[] {
  return loadPredictions().sort((a, b) => b.createdAt - a.createdAt);
}
