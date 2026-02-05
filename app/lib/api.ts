/**
 * API Utilities
 *
 * ============================================
 * SAFE TO MODIFY
 * ============================================
 * Add your API calls and data fetching logic here.
 *
 * SECURITY RULES:
 * 1. Never expose API keys in client-side code
 * 2. Use API routes for sensitive operations
 * 3. Validate all inputs before sending
 * 4. Handle errors gracefully
 */

// ============================================
// TOKEN ANALYSIS (Example)
// ============================================

export interface TokenAnalysis {
  address: string;
  symbol: string;
  name: string;
  score: number;
  network: string;
  risks: string[];
}

/**
 * Analyze a token for security risks.
 * Uses GeckoTerminal for data (free, no API key needed for basic use).
 */
export async function analyzeToken(address: string): Promise<TokenAnalysis | null> {
  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.error('[API] Invalid token address format');
    return null;
  }

  try {
    // Detect network from address (simplified)
    const network = 'base'; // Default to Base

    // Fetch from GeckoTerminal (public API)
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.error('[API] Token not found');
      return null;
    }

    const data = await res.json();
    const token = data.data?.attributes;

    if (!token) {
      return null;
    }

    return {
      address,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || 'Unknown Token',
      score: 50, // Placeholder - implement real scoring
      network,
      risks: [], // Placeholder - implement risk detection
    };
  } catch (error) {
    console.error('[API] Token analysis error:', error);
    return null;
  }
}

// ============================================
// FARCASTER HELPERS
// ============================================

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
}

/**
 * Fetch Farcaster user by FID.
 * Note: For production, use your own API route with Neynar.
 */
export async function getFarcasterUser(fid: number): Promise<FarcasterUser | null> {
  if (!Number.isInteger(fid) || fid <= 0) {
    console.error('[API] Invalid FID');
    return null;
  }

  try {
    // This is a placeholder - implement with your Neynar API key
    // via a server-side API route to keep the key secure
    console.log('[API] getFarcasterUser not implemented - use API route');
    return null;
  } catch (error) {
    console.error('[API] Farcaster user fetch error:', error);
    return null;
  }
}

// ============================================
// GENERIC FETCH WRAPPER
// ============================================

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with timeout and error handling.
 */
export async function safeFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T | null> {
  const { timeout = 10000, ...fetchOptions } = options;

  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      console.error('[API] Invalid URL protocol');
      return null;
    }
  } catch {
    console.error('[API] Invalid URL');
    return null;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[API] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[API] Request timed out');
    } else {
      console.error('[API] Fetch error:', error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// CONSTANTS
// ============================================

export const SUPPORTED_NETWORKS = {
  base: {
    name: 'Base',
    chainId: 8453,
    geckoId: 'base',
  },
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    geckoId: 'eth',
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    geckoId: 'arbitrum',
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    geckoId: 'optimism',
  },
} as const;

export type NetworkId = keyof typeof SUPPORTED_NETWORKS;
