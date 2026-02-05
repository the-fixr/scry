'use client';

import { useEffect, useState } from 'react';
import { FrameSDKProvider, useFrameSDK } from './components/FrameSDK';
import { WalletProvider, useWallet } from './components/WalletProvider';

// ============================================
// MAIN APP COMPONENT
// Customize this to build your mini app!
// ============================================

function AppContent() {
  const { context, isLoaded, actions } = useFrameSDK();
  const { address, isConnected, connect, disconnect } = useWallet();
  const [greeting, setGreeting] = useState('Welcome!');

  useEffect(() => {
    if (context?.user) {
      setGreeting(`Hey ${context.user.displayName || 'builder'}!`);
    }
  }, [context]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{greeting}</h1>
          <p className="text-gray-400 text-sm">
            Your Farcaster mini app is ready
          </p>
        </header>

        {/* User Info Card */}
        {context?.user && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              {context.user.pfpUrl && (
                <img
                  src={context.user.pfpUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{context.user.displayName}</p>
                <p className="text-sm text-gray-500">@{context.user.username}</p>
                <p className="text-xs text-gray-600">FID: {context.user.fid}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Connection */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Wallet</h2>
          {isConnected ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 font-mono break-all">
                {address}
              </p>
              <button
                onClick={disconnect}
                className="w-full py-2 px-4 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => actions.viewProfile(context?.user?.fid || 0)}
            disabled={!context?.user?.fid}
            className="py-3 px-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            View Profile
          </button>
          <button
            onClick={() => actions.openUrl('https://fixr.nexus')}
            className="py-3 px-4 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors"
          >
            Open Link
          </button>
        </div>

        {/* Your App Content Goes Here */}
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-gray-400 text-sm">
            Start building your mini app here!
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Edit <code className="text-primary">app/page.tsx</code> to customize
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 pt-4">
          Built with{' '}
          <a
            href="https://github.com/the-fixr/farcaster-miniapp-template"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Fixr Template
          </a>
        </footer>
      </div>
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
