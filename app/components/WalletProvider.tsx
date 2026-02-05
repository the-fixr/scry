'use client';

/**
 * WalletProvider - Farcaster Native Wallet Integration
 *
 * ============================================
 * DO NOT MODIFY THIS FILE (except where noted)
 * ============================================
 * This component uses miniapp-wagmi-connector for native
 * Farcaster wallet access. It's the secure, recommended way
 * to connect wallets in Farcaster mini apps.
 *
 * SECURITY FEATURES:
 * - Uses Farcaster's native wallet connector (no external popups)
 * - Validates all addresses before use
 * - Handles disconnection gracefully
 * - No private keys are ever exposed
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createConfig, http, WagmiProvider, useAccount, useConnect, useDisconnect } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterFrame } from '@farcaster/miniapp-wagmi-connector';

// ============================================
// CONFIGURATION - SAFE TO MODIFY
// ============================================

/**
 * Configure your supported chains here.
 * Default: Base (recommended for Farcaster) and Ethereum Mainnet
 *
 * TO ADD MORE CHAINS:
 * 1. Import from 'wagmi/chains' (e.g., arbitrum, optimism)
 * 2. Add to the chains array below
 * 3. Add RPC transport in the transports object
 */
const SUPPORTED_CHAINS = [base, mainnet] as const;

// ============================================
// WAGMI CONFIG - DO NOT MODIFY
// ============================================

const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors: [
    farcasterFrame(),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Security: Don't retry failed queries indefinitely
      retry: 2,
      // Don't refetch on window focus (prevents unexpected transactions)
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================
// WALLET CONTEXT
// ============================================

interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | undefined;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

// ============================================
// INTERNAL WALLET HOOK
// ============================================

function WalletState({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);

  // Clear error on successful connection
  useEffect(() => {
    if (isConnected) {
      setError(null);
    }
  }, [isConnected]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await connectAsync({
        connector: wagmiConfig.connectors[0],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      console.error('[WalletProvider] Connection error:', message);
      setError(message);
    }
  }, [connectAsync]);

  const disconnect = useCallback(() => {
    try {
      wagmiDisconnect();
    } catch (err) {
      console.error('[WalletProvider] Disconnect error:', err);
    }
  }, [wagmiDisconnect]);

  // SECURITY: Validate address format
  const validatedAddress = address && isValidAddress(address) ? address : undefined;

  const value: WalletContextType = {
    address: validatedAddress,
    isConnected: isConnected && !!validatedAddress,
    isConnecting,
    chainId,
    connect,
    disconnect,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ============================================
// PUBLIC PROVIDER
// ============================================

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletState>
          {children}
        </WalletState>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// ============================================
// PUBLIC HOOK
// ============================================

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);

  if (!context) {
    // Return safe defaults when used outside provider
    return {
      address: undefined,
      isConnected: false,
      isConnecting: false,
      chainId: undefined,
      connect: async () => {
        console.warn('[useWallet] WalletProvider not found in tree');
      },
      disconnect: () => {},
      error: 'WalletProvider not found',
    };
  }

  return context;
}

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Validates an Ethereum address format.
 * Does NOT validate checksum - use viem for that if needed.
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ============================================
// EXPORTS
// ============================================

export { wagmiConfig, SUPPORTED_CHAINS };
export default WalletProvider;
