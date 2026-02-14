'use client';

import sdk from '@farcaster/miniapp-sdk';
import { useFrameSDK } from './FrameSDK';
import { type TierInfo } from '../lib/tiers';
import { HUNT_ADDRESS } from '../lib/constants';

interface PortfolioBarProps {
  huntBalance: string; // formatted
  scryBalance: string; // formatted
  tier: TierInfo;
  totalUsd: string | null; // formatted USD value
}

// CAIP-19 asset IDs for Base
const ETH_BASE = 'eip155:8453/native';
const HUNT_BASE = `eip155:8453/erc20:${HUNT_ADDRESS}`;

export function PortfolioBar({ huntBalance, scryBalance, tier, totalUsd }: PortfolioBarProps) {
  const { actions, isInMiniApp } = useFrameSDK();

  const handleGetHunt = async () => {
    if (isInMiniApp) {
      try {
        await sdk.actions.swapToken({
          sellToken: ETH_BASE,
          buyToken: HUNT_BASE,
        });
      } catch {
        // User cancelled or swap unavailable — fall back
        actions.openUrl('https://hunt.town');
      }
    } else {
      actions.openUrl('https://hunt.town');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-sm border-t border-border px-4 py-2.5 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Balances */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] text-gray-500">HUNT</div>
            <div className="text-xs font-medium">{huntBalance}</div>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <div className="text-[10px] text-gray-500">$SCRY</div>
            <div className="text-xs font-medium">{scryBalance}</div>
          </div>
          {totalUsd && (
            <>
              <div className="w-px h-6 bg-border" />
              <div>
                <div className="text-[10px] text-gray-500">Value</div>
                <div className="text-xs font-medium">{totalUsd}</div>
              </div>
            </>
          )}
        </div>

        {/* Tier badge + actions */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[10px] font-bold rounded-full"
            style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
          >
            {tier.label}
          </span>
          <button
            onClick={handleGetHunt}
            className="text-[10px] text-gray-500 hover:text-primary transition-colors"
          >
            Get HUNT
          </button>
        </div>
      </div>
    </div>
  );
}
