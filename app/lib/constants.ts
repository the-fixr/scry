// Scry — Mint Club Base Token Scanner
// Scans ALL bonding curve tokens on Base via MCV2_Bond contract

export const BOND_ADDRESS = '0xc5a076cad94176c2996B32d8466Be1cE757FAa27' as const; // MCV2_Bond (same across chains)
export const HUNT_ADDRESS = '0x37f0c2915CeCC7e977183B8543Fc0864d03E064C' as const; // HUNT token on Base
export const SCRY_TOKEN = '0x0000000000000000000000000000000000000000' as const; // TODO: Set after deploying $SCRY
export const SCRY_TREASURY = '0x0000000000000000000000000000000000000000' as const; // TODO: Treasury wallet
export const BASE_CHAIN_ID = 8453;
export const LATEST_TOKEN_COUNT = 200; // How many newest tokens to fetch
export const CACHE_TTL_MS = 60_000; // 1 min

// Known reserve token symbols for filter chips
export const KNOWN_RESERVES: Record<string, string> = {
  'WETH': 'ETH',
  'USDC': 'USDC',
  'DEGEN': 'DEGEN',
  'HUNT': 'HUNT',
  'member': 'Member',
};

export const TIERS = {
  free:  { minBalance: 0,      label: 'Free',  color: '#6B7280', features: ['all_tab', 'basic_cards', 'trade'] },
  scout: { minBalance: 1000,   label: 'Scout', color: '#10B981', features: ['all_tab', 'basic_cards', 'trade', 'early_tab', 'hot_tab', 'signals', 'curves'] },
  pro:   { minBalance: 5000,   label: 'Pro',   color: '#8B5CF6', features: ['all_tab', 'basic_cards', 'trade', 'early_tab', 'hot_tab', 'signals', 'curves', 'breakout_tab', 'spread', 'advanced_curves'] },
  alpha: { minBalance: 25000,  label: 'Alpha', color: '#F59E0B', features: ['all_tab', 'basic_cards', 'trade', 'early_tab', 'hot_tab', 'signals', 'curves', 'breakout_tab', 'spread', 'advanced_curves', 'alerts', 'portfolio', 'export', 'predictions'] },
} as const;

export type TierKey = keyof typeof TIERS;

export const PREDICTION_CONFIG = {
  minStake: 10,
  maxStake: 100,
  durationMs: 24 * 60 * 60 * 1000, // 24 hours
  houseCutBps: 1000, // 10%
};

export const FEATURED_COST = 50; // SCRY tokens per 24h
