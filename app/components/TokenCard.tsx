'use client';

import { SignalBadges, type BadgeType } from './SignalBadges';

interface TokenCardProps {
  symbol: string;
  name: string;
  reserveSymbol: string;
  curvePosition: number; // 0-1
  reserveDepth: string; // formatted
  age: string; // formatted age
  badges: BadgeType[];
  isFeatured: boolean;
  imageUrl: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export function TokenCard({
  symbol,
  name,
  reserveSymbol,
  curvePosition,
  reserveDepth,
  age,
  badges,
  isFeatured,
  imageUrl,
  isSelected,
  onClick,
}: TokenCardProps) {
  const curvePercent = Math.round(curvePosition * 100);
  const curveColor = curvePercent < 20 ? '#10B981' : curvePercent < 80 ? '#06B6D4' : '#EF4444';
  const curveLabel = curvePercent < 20 ? 'Early' : curvePercent < 80 ? 'Mid' : 'Late';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isFeatured ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border bg-surface'
      } ${isSelected ? 'ring-1 ring-primary' : 'hover:border-gray-600'}`}
    >
      {/* Top row: logo + name + badges */}
      <div className="flex items-center gap-2.5 mb-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={symbol}
            className="w-8 h-8 rounded-full bg-slate-800 object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div
          className={`w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0 ${imageUrl ? 'hidden' : ''}`}
        >
          {symbol.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">${symbol}</span>
            <SignalBadges badges={badges} />
          </div>
          {name !== symbol && (
            <div className="text-[10px] text-gray-500 truncate">{name}</div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-medium" style={{ color: curveColor }}>{curvePercent}%</div>
          <div className="text-[10px] text-gray-600">{curveLabel}</div>
        </div>
      </div>

      {/* Curve position bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${curvePercent}%`, backgroundColor: curveColor }}
          />
        </div>
      </div>

      {/* Bottom row: reserve type + depth + age */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-gray-400">{reserveSymbol}</span>
          <span className="text-[10px] text-gray-500">{reserveDepth}</span>
        </div>
        <span className="text-[10px] text-gray-600">{age}</span>
      </div>
    </button>
  );
}
