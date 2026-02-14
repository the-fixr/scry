'use client';

export type BadgeType = 'early' | 'hot' | 'breakout' | 'new' | 'deep_liquidity' | 'featured' | 'graduating' | 'dormant' | 'rising' | 'low_fee' | 'high_fee';

const BADGE_CONFIG: Record<BadgeType, { label: string; bg: string; text: string }> = {
  early: { label: 'Early', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  hot: { label: 'Hot', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  breakout: { label: 'Breakout', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  new: { label: 'New', bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  deep_liquidity: { label: 'Deep Liq', bg: 'bg-teal-500/15', text: 'text-teal-400' },
  featured: { label: 'Featured', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  graduating: { label: 'Graduating', bg: 'bg-rose-500/15', text: 'text-rose-400' },
  dormant: { label: 'Dormant', bg: 'bg-gray-500/15', text: 'text-gray-400' },
  rising: { label: 'Rising', bg: 'bg-lime-500/15', text: 'text-lime-400' },
  low_fee: { label: 'Low Fee', bg: 'bg-sky-500/15', text: 'text-sky-400' },
  high_fee: { label: 'High Fee', bg: 'bg-red-500/15', text: 'text-red-400' },
};

export function SignalBadge({ type }: { type: BadgeType }) {
  const config = BADGE_CONFIG[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function SignalBadges({ badges }: { badges: BadgeType[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map(b => <SignalBadge key={b} type={b} />)}
    </div>
  );
}
