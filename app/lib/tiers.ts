import { TIERS, type TierKey } from './constants';

export interface TierInfo {
  key: TierKey;
  label: string;
  color: string;
  features: readonly string[];
  minBalance: number;
}

export function getTier(balance: number): TierInfo {
  // Check tiers from highest to lowest
  if (balance >= TIERS.alpha.minBalance) return { key: 'alpha', ...TIERS.alpha };
  if (balance >= TIERS.pro.minBalance) return { key: 'pro', ...TIERS.pro };
  if (balance >= TIERS.scout.minBalance) return { key: 'scout', ...TIERS.scout };
  return { key: 'free', ...TIERS.free };
}

export function hasFeature(tier: TierInfo, feature: string): boolean {
  return (tier.features as readonly string[]).includes(feature);
}

export function getRequiredTierForFeature(feature: string): TierInfo | null {
  const tierOrder: TierKey[] = ['free', 'scout', 'pro', 'alpha'];
  for (const key of tierOrder) {
    if ((TIERS[key].features as readonly string[]).includes(feature)) {
      return { key, ...TIERS[key] };
    }
  }
  return null;
}

export function getUpgradePrompt(feature: string): { tier: string; tokensNeeded: number } | null {
  const required = getRequiredTierForFeature(feature);
  if (!required) return null;
  return { tier: required.label, tokensNeeded: required.minBalance };
}
