'use client';

import { type ReactNode } from 'react';
import { type TierInfo, hasFeature, getUpgradePrompt } from '../lib/tiers';

interface TierGateProps {
  tier: TierInfo;
  feature: string;
  children: ReactNode;
}

export function TierGate({ tier, feature, children }: TierGateProps) {
  if (hasFeature(tier, feature)) {
    return <>{children}</>;
  }

  const upgrade = getUpgradePrompt(feature);

  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-surface/95 border border-border rounded-xl p-4 text-center max-w-[200px]">
          <div className="text-sm font-medium mb-1">
            {upgrade?.tier} Required
          </div>
          <div className="text-[10px] text-gray-400 mb-3">
            Hold {upgrade?.tokensNeeded ?? 0}+ tokens to unlock
          </div>
          <button className="px-3 py-1.5 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">
            Buy $SCRY
          </button>
        </div>
      </div>
    </div>
  );
}
