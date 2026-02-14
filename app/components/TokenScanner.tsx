'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenCard } from './TokenCard';
import { CurveChart } from './CurveChart';
import { TradePanel } from './TradePanel';
import { PredictionPanel } from './PredictionPanel';
import { PredictionHistory } from './PredictionHistory';
import { TierGate } from './TierGate';
import { BottomSheet } from './BottomSheet';
import { Modal } from './Modal';
import { type BadgeType } from './SignalBadges';
import { type TierInfo, hasFeature } from '../lib/tiers';
import {
  listTokens,
  enrichToken,
  getTokenPriceChange,
  getTokenMetadata,
  getCreatorTokenCount,
  getTokenRoyalties,
  isZapAvailable,
  fetchCreatorProfile,
  estimateBuy,
  estimateSell,
  type TokenMetadata,
  type CreatorProfile,
} from '../lib/mintclub';
import {
  computeSignals,
  computeSignalsFromListed,
  listedToDetail,
  getCachedTokens,
  setCachedTokens,
  type ScannedToken,
} from '../lib/scanner';

type SortKey = 'newest' | 'score' | 'curve_asc' | 'curve_desc' | 'reserve';
type FilterKey = 'early' | 'mid' | 'late' | 'graduating' | 'deep' | 'active' | 'dormant';
type ReserveFilter = 'all' | 'WETH' | 'USDC' | 'DEGEN' | 'member' | 'other';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'score', label: 'Opportunity' },
  { key: 'curve_asc', label: 'Earliest' },
  { key: 'curve_desc', label: 'Most Filled' },
  { key: 'reserve', label: 'Deepest Reserve' },
];

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'early', label: 'Early (<20%)' },
  { key: 'mid', label: 'Mid (20-80%)' },
  { key: 'late', label: 'Late (>80%)' },
  { key: 'graduating', label: 'Graduating' },
  { key: 'deep', label: 'Deep Reserve' },
  { key: 'active', label: 'Has Supply' },
  { key: 'dormant', label: 'Dormant' },
];

const RESERVE_OPTIONS: { key: ReserveFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'WETH', label: 'ETH' },
  { key: 'USDC', label: 'USDC' },
  { key: 'DEGEN', label: 'DEGEN' },
  { key: 'member', label: 'Member' },
  { key: 'other', label: 'Other' },
];

interface TokenScannerProps {
  tier: TierInfo;
  scryBalance: number;
}

export function TokenScanner({ tier, scryBalance }: TokenScannerProps) {
  const [tokens, setTokens] = useState<ScannedToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ScannedToken | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'trade' | 'predict'; message: string } | null>(null);
  const [tokenMeta, setTokenMeta] = useState<TokenMetadata | null>(null);
  const [creatorTokenCount, setCreatorTokenCount] = useState<number>(0);
  const [royalties, setRoyalties] = useState<{ mintRoyalty: number; burnRoyalty: number } | null>(null);
  const [zapAvailable, setZapAvailable] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [reserveFilter, setReserveFilter] = useState<ReserveFilter>('all');
  const [showPredictions, setShowPredictions] = useState(false);
  const enrichedCache = useRef<Map<string, ScannedToken>>(new Map());

  // Phase 1: Fast load — single RPC call, instant render
  const loadTokens = useCallback(async () => {
    const cached = getCachedTokens();
    if (cached.length > 0) {
      setTokens(cached);
      return;
    }

    setLoading(true);
    try {
      const listed = await listTokens();
      const scanned: ScannedToken[] = listed.map(item => ({
        detail: listedToDetail(item),
        signals: computeSignalsFromListed(item),
        priceChange: null,
      }));
      setCachedTokens(scanned);
      setTokens(scanned);
    } catch (err) {
      console.error('[scanner] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Phase 2: Lazy enrich — only when user taps a token
  const enrichAndSelect = useCallback(async (token: ScannedToken) => {
    const addr = token.detail.address;

    const cached = enrichedCache.current.get(addr);
    if (cached) {
      setSelectedToken(cached);
      setSheetOpen(true);
      return;
    }

    setSelectedToken(token);
    setSheetOpen(true);
    setEnriching(true);
    setTokenMeta(null);
    setCreatorTokenCount(0);
    setRoyalties(null);
    setZapAvailable(false);
    setCreatorProfile(null);

    try {
      const supply = token.detail.currentSupply;
      const oneToken = 1000000000000000000n;
      const estAmount = supply > 0n
        ? (supply / 100n > oneToken ? oneToken : supply > 100n ? supply / 100n : 1n)
        : oneToken;

      const [enriched, priceChange, buyEst, sellEst, meta, creatorCount, royaltyInfo] = await Promise.all([
        enrichToken({
          creator: token.detail.bond.creator,
          token: addr,
          decimals: 18,
          symbol: token.detail.symbol,
          name: token.detail.name,
          createdAt: token.detail.bond.createdAt,
          currentSupply: token.detail.currentSupply.toString(),
          maxSupply: token.detail.maxSupply.toString(),
          priceForNextMint: token.detail.currentPrice.toString(),
          reserveToken: token.detail.bond.reserveToken,
          reserveDecimals: 18,
          reserveSymbol: token.detail.reserveSymbol,
          reserveName: token.detail.reserveSymbol,
          reserveBalance: token.detail.bond.reserveBalance.toString(),
        }),
        getTokenPriceChange(addr),
        estimateBuy(addr, estAmount),
        supply > 0n ? estimateSell(addr, estAmount) : Promise.resolve(null),
        getTokenMetadata(addr),
        getCreatorTokenCount(token.detail.bond.creator as `0x${string}`),
        getTokenRoyalties(addr),
      ]);

      setTokenMeta(meta);
      setCreatorTokenCount(creatorCount);
      setRoyalties(royaltyInfo);
      setZapAvailable(isZapAvailable(token.detail.reserveSymbol));

      // Fetch Farcaster profile (Alpha tier only)
      if (hasFeature(tier, 'predictions')) {
        fetchCreatorProfile(token.detail.bond.creator, creatorCount).then(profile => {
          setCreatorProfile(profile);
        });
      }

      if (enriched) {
        const signals = computeSignals(enriched, priceChange, buyEst, sellEst);
        const enrichedToken: ScannedToken = { detail: enriched, signals, priceChange };
        enrichedCache.current.set(addr, enrichedToken);
        setSelectedToken(enrichedToken);
        setTokens(prev => prev.map(t =>
          t.detail.address === addr ? enrichedToken : t
        ));
      }
    } catch (err) {
      console.error('[scanner] enrich error:', err);
    } finally {
      setEnriching(false);
    }
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  useEffect(() => {
    const interval = setInterval(loadTokens, 60000);
    return () => clearInterval(interval);
  }, [loadTokens]);

  // Toggle a filter chip
  const toggleFilter = (key: FilterKey) => {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Apply filters + sort
  const getFilteredTokens = (): ScannedToken[] => {
    let result = tokens;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.detail.symbol.toLowerCase().includes(q) ||
        t.detail.name.toLowerCase().includes(q) ||
        t.detail.address.toLowerCase().includes(q)
      );
    }

    // Reserve filter
    if (reserveFilter !== 'all') {
      const knownSymbols = ['WETH', 'USDC', 'DEGEN', 'member'];
      if (reserveFilter === 'other') {
        result = result.filter(t => !knownSymbols.includes(t.detail.reserveSymbol));
      } else {
        result = result.filter(t => t.detail.reserveSymbol === reserveFilter);
      }
    }

    // Filters (union within curve stage, intersection with others)
    if (filters.size > 0) {
      result = result.filter(t => {
        const cp = t.signals.curvePosition;
        const hasCurveFilter = filters.has('early') || filters.has('mid') || filters.has('late') || filters.has('graduating');
        let passesCurve = !hasCurveFilter;
        if (hasCurveFilter) {
          if (filters.has('early') && cp < 0.2) passesCurve = true;
          if (filters.has('mid') && cp >= 0.2 && cp < 0.8) passesCurve = true;
          if (filters.has('late') && cp >= 0.8) passesCurve = true;
          if (filters.has('graduating') && cp > 0.9) passesCurve = true;
        }

        let passesOther = true;
        if (filters.has('active') && t.detail.currentSupply <= 0n) passesOther = false;
        if (filters.has('deep') && t.signals.reserveDepth <= 1000000000000000000n) passesOther = false;
        if (filters.has('dormant') && t.detail.currentSupply > 0n) passesOther = false;

        return passesCurve && passesOther;
      });
    }

    // Sort (newest = default, already in order from API)
    if (sortBy === 'newest') return result;

    const sorted = [...result];
    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => b.signals.opportunityScore - a.signals.opportunityScore);
        break;
      case 'curve_asc':
        sorted.sort((a, b) => a.signals.curvePosition - b.signals.curvePosition);
        break;
      case 'curve_desc':
        sorted.sort((a, b) => b.signals.curvePosition - a.signals.curvePosition);
        break;
      case 'reserve':
        sorted.sort((a, b) => {
          if (b.signals.reserveDepth > a.signals.reserveDepth) return 1;
          if (b.signals.reserveDepth < a.signals.reserveDepth) return -1;
          return 0;
        });
        break;
    }

    return sorted;
  };

  const getBadges = (t: ScannedToken, tokenRoyalties?: { mintRoyalty: number; burnRoyalty: number } | null): BadgeType[] => {
    const badges: BadgeType[] = [];
    if (t.signals.isEarly) badges.push('early');
    if (t.signals.isGraduating) badges.push('graduating');
    if (t.signals.isHot) badges.push('hot');
    if (t.signals.isRising) badges.push('rising');
    if (t.signals.isBreakout) badges.push('breakout');
    if (t.signals.isNew) badges.push('new');
    if (t.signals.isDormant) badges.push('dormant');
    if (t.signals.reserveDepth > 1000000000000000000n) badges.push('deep_liquidity');
    if (tokenRoyalties) {
      const totalFee = tokenRoyalties.mintRoyalty + tokenRoyalties.burnRoyalty;
      if (totalFee > 0 && totalFee < 500) badges.push('low_fee');
      if (totalFee > 1500) badges.push('high_fee');
    }
    return badges;
  };

  const formatPrice = (price: bigint): string => {
    const val = Number(price) / 1e18;
    if (val < 0.000001) return '<0.000001';
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    return val.toFixed(2);
  };

  const formatReserve = (reserve: bigint): string => {
    const val = Number(reserve) / 1e18;
    if (val < 1) return val.toFixed(4);
    if (val < 1000) return val.toFixed(0);
    if (val < 1000000) return `${(val / 1000).toFixed(1)}K`;
    return `${(val / 1000000).toFixed(1)}M`;
  };

  const formatSupply = (supply: bigint): string => {
    const val = Number(supply) / 1e18;
    if (val < 1) return val.toFixed(4);
    if (val < 1000) return val.toFixed(0);
    if (val < 1000000) return `${(val / 1000).toFixed(1)}K`;
    if (val < 1000000000) return `${(val / 1000000).toFixed(1)}M`;
    return `${(val / 1000000000).toFixed(1)}B`;
  };

  const formatAge = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m ago`;
    if (hours < 24) return `${Math.round(hours)}h ago`;
    if (hours < 720) return `${Math.round(hours / 24)}d ago`;
    return `${Math.round(hours / 720)}mo ago`;
  };

  const handleTokenClick = (token: ScannedToken) => {
    enrichAndSelect(token);
  };

  const handleTradeComplete = () => {
    setConfirmModal({ type: 'trade', message: 'Trade executed successfully!' });
    loadTokens();
  };

  const filteredTokens = getFilteredTokens();

  return (
    <div className="space-y-3 pb-16">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or symbol..."
        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-primary focus:outline-none"
      />

      {/* Sort + Reserve + Predictions row */}
      <div className="flex items-center gap-1.5">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-surface border border-border rounded-lg px-1.5 py-1 text-[11px] text-gray-300 focus:border-primary focus:outline-none shrink-0"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <div className="flex gap-1 overflow-x-auto">
          {RESERVE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setReserveFilter(opt.key)}
              className={`px-2 py-1 text-[10px] font-medium rounded-full border whitespace-nowrap transition-all ${
                reserveFilter === opt.key
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-surface border-border text-gray-500 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {hasFeature(tier, 'predictions') && (
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`px-2 py-1 text-[10px] font-medium rounded-full border whitespace-nowrap transition-all shrink-0 ${
              showPredictions
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-surface border-border text-gray-500 hover:text-gray-300'
            }`}
          >
            Calls
          </button>
        )}
        <div className="text-[10px] text-gray-600 shrink-0">
          {filteredTokens.length}
        </div>
      </div>

      {/* Curve + state filters */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {FILTER_OPTIONS.map(opt => {
          const isActive = filters.has(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggleFilter(opt.key)}
              className={`px-2 py-1 text-[10px] font-medium rounded-full border whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-surface border-border text-gray-400 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {showPredictions ? (
        <TierGate tier={tier} feature="predictions">
          <div className="space-y-3">
            <div className="text-xs text-gray-400 font-medium">Your Predictions</div>
            <PredictionHistory onResolve={loadTokens} />
          </div>
        </TierGate>
      ) : (
        <>
          {loading && tokens.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-3 animate-pulse">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-800 rounded w-24 mb-1" />
                      <div className="h-2 bg-slate-800 rounded w-16" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center text-gray-600 text-xs py-8">
              {search ? 'No tokens match your search' : filters.size > 0 ? 'No tokens match these filters' : 'No tokens found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTokens.map(token => (
                <TokenCard
                  key={token.detail.address}
                  symbol={token.detail.symbol}
                  name={token.detail.name}
                  reserveSymbol={token.detail.reserveSymbol}
                  curvePosition={token.signals.curvePosition}
                  reserveDepth={formatReserve(token.signals.reserveDepth)}
                  age={formatAge(token.signals.ageHours)}
                  badges={getBadges(token)}
                  isFeatured={false}
                  imageUrl={`https://fc.hunt.town/tokens/logo/8453/${token.detail.address}/image`}
                  isSelected={selectedToken?.detail.address === token.detail.address}
                  onClick={() => handleTokenClick(token)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom Sheet — Token Detail */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={selectedToken ? `$${selectedToken.detail.symbol}` : undefined}
      >
        {selectedToken && (
          <div className="space-y-3">
            {enriching && (
              <div className="text-[10px] text-gray-500 text-center animate-pulse">Loading details...</div>
            )}

            {/* Header: logo + name + reserve */}
            <div className="flex items-start gap-3">
              <img
                src={`https://fc.hunt.town/tokens/logo/8453/${selectedToken.detail.address}/image`}
                alt=""
                className="w-10 h-10 rounded-full bg-slate-800"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{selectedToken.detail.name}</div>
                <div className="text-[10px] text-gray-500 font-mono truncate">
                  {selectedToken.detail.bond.creator.slice(0, 6)}...{selectedToken.detail.bond.creator.slice(-4)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {zapAvailable && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">ETH Zap</span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-gray-400">
                  {selectedToken.detail.reserveSymbol}
                </span>
              </div>
            </div>

            {/* Creator info */}
            {hasFeature(tier, 'predictions') && creatorProfile ? (
              <div className="bg-slate-950 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500 mb-1.5">Creator</div>
                <div className="flex items-center gap-2.5">
                  <img
                    src={creatorProfile.pfpUrl}
                    alt=""
                    className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{creatorProfile.displayName}</span>
                      <span className="text-[10px] text-gray-500">@{creatorProfile.username}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500">FID #{creatorProfile.fid}</span>
                      <span className="text-[10px] text-gray-500">{creatorProfile.followerCount.toLocaleString()} followers</span>
                      {creatorTokenCount > 1 && (
                        <span className="text-[10px] text-gray-500">{creatorTokenCount} tokens</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      creatorProfile.rating >= 80 ? 'bg-emerald-500/15 text-emerald-400' :
                      creatorProfile.rating >= 60 ? 'bg-cyan-500/15 text-cyan-400' :
                      creatorProfile.rating >= 40 ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-gray-500/15 text-gray-400'
                    }`}>
                      {creatorProfile.ratingLabel}
                    </span>
                    <span className="text-[9px] text-gray-600 mt-0.5">{creatorProfile.rating}/100</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Description (from creator) */}
            {tokenMeta?.creatorComment && (
              <div className="bg-slate-950 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500 mb-1">About</div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  {tokenMeta.creatorComment}
                </div>
              </div>
            )}

            {/* Links */}
            {(tokenMeta?.website || tokenMeta?.externalDexUrl) && (
              <div className="flex gap-2">
                {tokenMeta.website && (
                  <a
                    href={tokenMeta.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                  >
                    Website
                  </a>
                )}
                {tokenMeta.externalDexUrl && (
                  <a
                    href={tokenMeta.externalDexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                  >
                    DEX
                  </a>
                )}
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500">Curve</div>
                <div className="text-xs font-medium">
                  {Math.round(selectedToken.signals.curvePosition * 100)}%
                </div>
              </div>
              <div className="bg-slate-950 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500">24h</div>
                <div className={`text-xs font-medium ${
                  (selectedToken.signals.momentum ?? 0) > 0 ? 'text-emerald-400' :
                  (selectedToken.signals.momentum ?? 0) < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {selectedToken.signals.momentum !== null
                    ? `${selectedToken.signals.momentum > 0 ? '+' : ''}${selectedToken.signals.momentum.toFixed(1)}%`
                    : '--'}
                </div>
              </div>
              <div className="bg-slate-950 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-500">Score</div>
                <div className="text-xs font-medium text-cyan-400">
                  {selectedToken.signals.opportunityScore}
                </div>
              </div>
            </div>

            {/* Detail rows */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] px-1">
                <span className="text-gray-500">Mint price</span>
                <span className="text-gray-300">
                  {formatPrice(selectedToken.detail.currentPrice)} {selectedToken.detail.reserveSymbol}
                  {selectedToken.priceChange?.currentUsdRate != null && (
                    <span className="text-gray-500 ml-1">(${selectedToken.priceChange.currentUsdRate.toFixed(6)})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] px-1">
                <span className="text-gray-500">Reserve locked</span>
                <span className="text-gray-300">{formatReserve(selectedToken.signals.reserveDepth)} {selectedToken.detail.reserveSymbol}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] px-1">
                <span className="text-gray-500">Supply</span>
                <span className="text-gray-300">
                  {formatSupply(selectedToken.detail.currentSupply)} / {formatSupply(selectedToken.detail.maxSupply)}
                </span>
              </div>
              {royalties && (
                <div className="flex items-center justify-between text-[10px] px-1">
                  <span className="text-gray-500">Royalties</span>
                  <span className="text-gray-300">
                    {(royalties.mintRoyalty / 100).toFixed(1)}% buy / {(royalties.burnRoyalty / 100).toFixed(1)}% sell
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] px-1">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">
                  {new Date(selectedToken.detail.bond.createdAt * 1000).toLocaleDateString()}
                </span>
              </div>
              {hasFeature(tier, 'spread') && selectedToken.signals.spread !== null && (
                <div className="flex items-center justify-between text-[10px] px-1">
                  <span className="text-gray-500">Spread (round-trip)</span>
                  <span className="text-gray-400">{(selectedToken.signals.spread * 100).toFixed(1)}%</span>
                </div>
              )}
              {selectedToken.signals.stepJump !== null && (
                <div className="flex items-center justify-between text-[10px] px-1">
                  <span className="text-gray-500">Next step jump</span>
                  <span className={`${selectedToken.signals.stepJump > 20 ? 'text-purple-400' : 'text-gray-300'}`}>
                    +{selectedToken.signals.stepJump.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Distribution plan */}
            {tokenMeta?.distributionPlan && (
              <div className="bg-slate-950 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500 mb-1">Distribution Plan</div>
                <div className="text-[10px] text-gray-400 leading-relaxed">
                  {tokenMeta.distributionPlan}
                </div>
              </div>
            )}

            {/* Curve chart */}
            <TierGate tier={tier} feature="curves">
              <CurveChart
                steps={selectedToken.detail.steps}
                currentPrice={selectedToken.detail.currentPrice}
                maxSupply={selectedToken.detail.maxSupply}
              />
            </TierGate>

            {/* Trade panel */}
            <TradePanel
              tokenSymbol={selectedToken.detail.symbol}
              currentPrice={formatPrice(selectedToken.detail.currentPrice)}
              onTradeComplete={handleTradeComplete}
            />

            {/* Prediction panel (Alpha only) */}
            {hasFeature(tier, 'predictions') && (
              <PredictionPanel
                tokenSymbol={selectedToken.detail.symbol}
                currentPrice={selectedToken.priceChange?.currentUsdRate ?? null}
                scryBalance={scryBalance}
              />
            )}
          </div>
        )}
      </BottomSheet>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.type === 'trade' ? 'Trade Complete' : 'Prediction Set'}
      >
        <div className="text-center space-y-3">
          <div className="text-3xl">
            {confirmModal?.type === 'trade' ? '✓' : '🎯'}
          </div>
          <p className="text-sm text-gray-300">{confirmModal?.message}</p>
          <button
            onClick={() => setConfirmModal(null)}
            className="w-full py-2 text-sm font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
