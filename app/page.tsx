'use client';

import { useEffect, useState } from 'react';
import { FrameSDKProvider, useFrameSDK } from './components/FrameSDK';
import { WalletProvider, useWallet } from './components/WalletProvider';
import { TokenScanner } from './components/TokenScanner';
import { PortfolioBar } from './components/PortfolioBar';
import { Modal } from './components/Modal';
import { getTier, type TierInfo } from './lib/tiers';
import { TIERS, HUNT_ADDRESS, SCRY_TOKEN } from './lib/constants';
import { getTokenBalance } from './lib/mintclub';

function AppContent() {
  const { context, isLoaded, actions } = useFrameSDK();
  const { address, isConnected, connect } = useWallet();
  const [scryBalance, setScryBalance] = useState(0);
  const [huntBalance, setHuntBalance] = useState('0');
  const [tier, setTier] = useState<TierInfo>({ key: 'free', ...TIERS.free });
  const [showWelcome, setShowWelcome] = useState(false);

  // Update tier when balance changes
  useEffect(() => {
    setTier(getTier(scryBalance));
  }, [scryBalance]);

  // Fetch token balances when wallet connects
  useEffect(() => {
    if (!isConnected || !address) return;
    const wallet = address as `0x${string}`;

    const fetchBalances = async () => {
      const [huntRaw, scryRaw] = await Promise.all([
        getTokenBalance(HUNT_ADDRESS as `0x${string}`, wallet),
        getTokenBalance(SCRY_TOKEN as `0x${string}`, wallet),
      ]);
      const huntVal = Number(huntRaw) / 1e18;
      setHuntBalance(huntVal < 0.01 && huntVal > 0 ? huntVal.toFixed(6) : huntVal.toFixed(2));
      setScryBalance(Number(scryRaw) / 1e18);
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 30_000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  // Show welcome modal for new users
  useEffect(() => {
    if (isLoaded && !localStorage.getItem('scry_welcomed')) {
      setShowWelcome(true);
    }
  }, [isLoaded]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('scry_welcomed', '1');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-2xl font-bold text-primary animate-pulse">◈</div>
          <div className="text-gray-500 text-xs">Scrying...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/icon.png"
              alt="Scry"
              className="w-7 h-7 rounded-full"
            />
            <div>
              <h1 className="text-sm font-bold">
                <span className="text-primary">Scry</span>
              </h1>
              {context?.user && (
                <p className="text-[10px] text-gray-500">@{context.user.username}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tier badge */}
            <span
              className="px-2 py-0.5 text-[10px] font-bold rounded-full"
              style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
            >
              {tier.label}
            </span>

            {/* Connect / Address */}
            {isConnected ? (
              <span className="text-[10px] text-gray-500 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            ) : (
              <button
                onClick={connect}
                className="px-3 py-1 text-[10px] font-medium bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </header>

        {/* Scanner */}
        <TokenScanner tier={tier} scryBalance={scryBalance} />

        {/* Portfolio bar */}
        {isConnected && (
          <PortfolioBar
            huntBalance={huntBalance}
            scryBalance={String(scryBalance)}
            tier={tier}
            totalUsd={null}
          />
        )}
      </div>

      {/* Welcome Modal */}
      <Modal isOpen={showWelcome} onClose={dismissWelcome} title="Scry">
        <div className="space-y-3">
          <p className="text-xs text-gray-300">
            Scry the bonding curves. Find tokens that are early, trending, or near breakout — before the crowd.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full">Early</span>
              <span className="text-gray-400">Tokens under 20% of their curve</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 bg-orange-500/15 text-orange-400 rounded-full">Hot</span>
              <span className="text-gray-400">10%+ price change in 24h</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full">Breakout</span>
              <span className="text-gray-400">Near a steep step on the curve</span>
            </div>
          </div>
          <div className="bg-slate-950 rounded-lg p-2 text-[10px] text-gray-400">
            Hold <span className="text-primary font-medium">$SCRY</span> tokens to unlock premium tabs, predictions, and advanced analytics.
          </div>
          <button
            onClick={dismissWelcome}
            className="w-full py-2.5 text-sm font-medium bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-colors"
          >
            Begin Scrying
          </button>
        </div>
      </Modal>
    </main>
  );
}

export default function Home() {
  return (
    <FrameSDKProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </FrameSDKProvider>
  );
}
