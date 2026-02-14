import { type TokenDetail, type ListedToken, type PriceChange } from './mintclub';
import { CACHE_TTL_MS } from './constants';

export interface TokenSignals {
  curvePosition: number; // 0-1 (percentage of max supply minted)
  momentum: number | null; // 24h price change %
  reserveDepth: bigint; // reserve balance
  stepJump: number | null; // % increase to next step price
  spread: number | null; // buy/sell spread as fraction
  ageHours: number; // hours since creation
  isEarly: boolean; // < 20% curve
  isHot: boolean; // > 10% 24h change
  isBreakout: boolean; // near steep step
  isNew: boolean; // < 24h old
  isGraduating: boolean; // > 90% curve filled
  isDormant: boolean; // zero supply
  isRising: boolean; // positive 24h change 0-10%
  opportunityScore: number; // composite 0-100
}

export interface ScannedToken {
  detail: TokenDetail;
  signals: TokenSignals;
  priceChange: PriceChange | null;
}

// Fast signal computation from ListedToken (no extra RPC calls)
export function computeSignalsFromListed(listed: ListedToken): TokenSignals {
  const currentSupply = BigInt(listed.currentSupply);
  const maxSupply = BigInt(listed.maxSupply);
  const reserveBalance = BigInt(listed.reserveBalance);

  let curvePosition = 0;
  if (maxSupply > 0n) {
    curvePosition = Number(currentSupply * 10000n / maxSupply) / 10000;
  }

  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = now - listed.createdAt;
  const ageHours = ageSeconds / 3600;

  const isEarly = curvePosition < 0.2;
  const isNew = ageHours < 24;
  const isGraduating = curvePosition > 0.9;
  const isDormant = currentSupply === 0n;

  // Score without momentum/steps/spread (enriched later)
  let score = 50;
  if (isEarly) score += 20;
  if (isNew) score += 5;
  if (isGraduating) score += 10;
  if (reserveBalance > 1000000000000000000n) score += 5;
  if (isDormant) score -= 10;
  score = Math.min(100, Math.max(0, score));

  return {
    curvePosition,
    momentum: null,
    reserveDepth: reserveBalance,
    stepJump: null,
    spread: null,
    ageHours,
    isEarly,
    isHot: false,
    isBreakout: false,
    isNew,
    isGraduating,
    isDormant,
    isRising: false,
    opportunityScore: score,
  };
}

// Convert ListedToken to a lightweight TokenDetail (no steps)
export function listedToDetail(listed: ListedToken): TokenDetail {
  return {
    symbol: listed.symbol,
    name: listed.name,
    address: listed.token,
    bond: {
      creator: listed.creator,
      mintRoyalty: 0,
      burnRoyalty: 0,
      createdAt: listed.createdAt,
      reserveToken: listed.reserveToken,
      reserveBalance: BigInt(listed.reserveBalance),
    },
    maxSupply: BigInt(listed.maxSupply),
    currentSupply: BigInt(listed.currentSupply),
    steps: [],
    currentPrice: BigInt(listed.priceForNextMint),
    reserveSymbol: listed.reserveSymbol,
  };
}

// Full signal computation (when steps + price data available)
export function computeSignals(
  detail: TokenDetail,
  priceChange: PriceChange | null,
  buyEstimate: { cost: bigint; royalty: bigint } | null,
  sellEstimate: { returns: bigint; royalty: bigint } | null,
): TokenSignals {
  const { steps, currentPrice, maxSupply, currentSupply } = detail;

  let curvePosition = 0;
  if (maxSupply > 0n) {
    curvePosition = Number(currentSupply * 10000n / maxSupply) / 10000;
  }

  const momentum = priceChange?.changePercent ?? null;
  const reserveDepth = detail.bond.reserveBalance;

  let stepJump: number | null = null;
  for (let i = 0; i < steps.length - 1; i++) {
    if (steps[i].price >= currentPrice) {
      const nextPrice = steps[i + 1]?.price ?? steps[i].price;
      if (steps[i].price > 0n) {
        stepJump = Number((nextPrice - steps[i].price) * 10000n / steps[i].price) / 100;
      }
      break;
    }
  }

  let spread: number | null = null;
  if (buyEstimate && sellEstimate && buyEstimate.cost > 0n) {
    spread = Number((buyEstimate.cost - sellEstimate.returns) * 10000n / buyEstimate.cost) / 10000;
  }

  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = now - detail.bond.createdAt;
  const ageHours = ageSeconds / 3600;

  const isEarly = curvePosition < 0.2;
  const isHot = momentum !== null && Math.abs(momentum) > 10;
  const isBreakout = stepJump !== null && stepJump > 20;
  const isNew = ageHours < 24;
  const isGraduating = curvePosition > 0.9;
  const isDormant = currentSupply === 0n;
  const isRising = momentum !== null && momentum > 0 && momentum <= 10;

  let score = 50;
  if (isEarly) score += 20;
  if (isHot && momentum !== null && momentum > 0) score += 15;
  if (isRising) score += 5;
  if (isBreakout) score += 10;
  if (isGraduating) score += 10;
  if (isNew) score += 5;
  if (spread !== null && spread < 0.1) score += 5;
  if (reserveDepth > 1000000000000000000n) score += 5;
  if (isDormant) score -= 10;
  score = Math.min(100, Math.max(0, score));

  return {
    curvePosition,
    momentum,
    reserveDepth,
    stepJump,
    spread,
    ageHours,
    isEarly,
    isHot,
    isBreakout,
    isNew,
    isGraduating,
    isDormant,
    isRising,
    opportunityScore: score,
  };
}

// Simple in-memory cache
let cachedTokens: ScannedToken[] = [];
let cacheTimestamp = 0;

export function getCachedTokens(): ScannedToken[] {
  if (Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedTokens;
  }
  return [];
}

export function setCachedTokens(tokens: ScannedToken[]): void {
  cachedTokens = tokens;
  cacheTimestamp = Date.now();
}

export function filterHot(tokens: ScannedToken[]): ScannedToken[] {
  return tokens.filter(t => t.signals.isHot).sort((a, b) => {
    const am = Math.abs(a.signals.momentum ?? 0);
    const bm = Math.abs(b.signals.momentum ?? 0);
    return bm - am;
  });
}

export function filterEarly(tokens: ScannedToken[]): ScannedToken[] {
  return tokens.filter(t => t.signals.isEarly).sort((a, b) => a.signals.curvePosition - b.signals.curvePosition);
}

export function filterBreakout(tokens: ScannedToken[]): ScannedToken[] {
  return tokens.filter(t => t.signals.isBreakout).sort((a, b) => (b.signals.stepJump ?? 0) - (a.signals.stepJump ?? 0));
}

export function rankByOpportunity(tokens: ScannedToken[]): ScannedToken[] {
  return [...tokens].sort((a, b) => b.signals.opportunityScore - a.signals.opportunityScore);
}
