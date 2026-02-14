import { mintclub } from 'mint.club-v2-sdk';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { BOND_ADDRESS, LATEST_TOKEN_COUNT } from './constants';

// ============================================
// Types
// ============================================

export interface TokenBondInfo {
  creator: string;
  mintRoyalty: number;
  burnRoyalty: number;
  createdAt: number;
  reserveToken: string;
  reserveBalance: bigint;
}

export interface TokenDetail {
  symbol: string;
  name: string;
  address: string;
  bond: TokenBondInfo;
  maxSupply: bigint;
  currentSupply: bigint;
  steps: { rangeTo: bigint; price: bigint }[];
  currentPrice: bigint;
  reserveSymbol: string;
}

export interface PriceChange {
  currentUsdRate: number | null;
  previousUsdRate: number | null;
  changePercent: number | null;
}

export interface TokenMetadata {
  creatorComment: string | null;
  website: string | null;
  distributionPlan: string | null;
  logo: string | null;
  backgroundImage: string | null;
  externalDexUrl: string | null;
}

export interface CreatorProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
  verifiedAddresses: string[];
  tokenCount: number;
  rating: number; // 0-100
  ratingLabel: string;
}

export interface ListedToken {
  creator: string;
  token: string;
  decimals: number;
  symbol: string;
  name: string;
  createdAt: number;
  currentSupply: string;
  maxSupply: string;
  priceForNextMint: string;
  reserveToken: string;
  reserveDecimals: number;
  reserveSymbol: string;
  reserveName: string;
  reserveBalance: string;
}

// ============================================
// Clients
// ============================================

const network = () => mintclub.network('base');

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

const tokenCountAbi = [{
  name: 'tokenCount',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

const erc20BalanceAbi = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

// ============================================
// Token List (newest first)
// ============================================

/** Get total number of bonding curve tokens on Base */
export async function getTokenCount(): Promise<number> {
  try {
    const count = await publicClient.readContract({
      address: BOND_ADDRESS,
      abi: tokenCountAbi,
      functionName: 'tokenCount',
    });
    return Number(count);
  } catch (err) {
    console.error('[mintclub] getTokenCount error:', err);
    return 0;
  }
}

/** Read ERC20 balance for a wallet */
export async function getTokenBalance(tokenAddress: `0x${string}`, wallet: `0x${string}`): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20BalanceAbi,
      functionName: 'balanceOf',
      args: [wallet],
    });
    return balance;
  } catch (err) {
    console.error('[mintclub] getTokenBalance error:', err);
    return 0n;
  }
}

/** Fetch latest N tokens (newest first, all reserves) */
export async function listTokens(fetchCount = LATEST_TOKEN_COUNT): Promise<ListedToken[]> {
  try {
    const total = await getTokenCount();
    if (total === 0) return [];

    const start = Math.max(0, total - fetchCount);
    const tokens = await network().bond.getList({ start, end: total });
    const listed = tokens as unknown as ListedToken[];

    // Reverse so newest are first
    return listed.reverse();
  } catch (err) {
    console.error('[mintclub] listTokens error:', err);
    return [];
  }
}

// ============================================
// Token Enrichment
// ============================================

export async function enrichToken(listed: ListedToken): Promise<TokenDetail | null> {
  try {
    const token = network().token(listed.token);
    const steps = await token.getSteps();
    return {
      symbol: listed.symbol,
      name: listed.name,
      address: listed.token,
      bond: {
        creator: listed.creator,
        mintRoyalty: 0,
        burnRoyalty: 0,
        createdAt: listed.createdAt,
        reserveToken: listed.reserveToken,
        reserveBalance: BigInt(listed.reserveBalance),
      },
      maxSupply: BigInt(listed.maxSupply),
      currentSupply: BigInt(listed.currentSupply),
      steps: steps as { rangeTo: bigint; price: bigint }[],
      currentPrice: BigInt(listed.priceForNextMint),
      reserveSymbol: listed.reserveSymbol,
    };
  } catch (err) {
    console.error('[mintclub] enrichToken error:', err);
    return null;
  }
}

/** Fetch off-chain metadata (description, website, etc.) from Mint Club API */
export async function getTokenMetadata(tokenAddress: string): Promise<TokenMetadata | null> {
  try {
    const meta = await network().token(tokenAddress).getMintClubMetadata();
    const m = meta as Record<string, unknown>;
    return {
      creatorComment: (m.creatorComment as string) || null,
      website: (m.website as string) || null,
      distributionPlan: (m.distributionPlan as string) || null,
      logo: (m.logo as string) || null,
      backgroundImage: (m.backgroundImage as string) || null,
      externalDexUrl: (m.externalDexUrl as string) || null,
    };
  } catch (err) {
    console.error('[mintclub] getTokenMetadata error:', err);
    return null;
  }
}

/** Get count of other tokens created by the same creator */
export async function getCreatorTokenCount(creator: `0x${string}`): Promise<number> {
  try {
    const tokens = await network().bond.getTokensByCreator({
      creator,
      start: 0,
      end: 1000,
    });
    return (tokens as unknown[]).length;
  } catch (err) {
    console.error('[mintclub] getCreatorTokenCount error:', err);
    return 0;
  }
}

/** Get royalty info (mint + burn) from getDetail() */
export async function getTokenRoyalties(tokenAddress: string): Promise<{ mintRoyalty: number; burnRoyalty: number } | null> {
  try {
    const detail = await network().token(tokenAddress).getDetail();
    const d = detail as { mintRoyalty?: number; burnRoyalty?: number };
    return {
      mintRoyalty: d.mintRoyalty ?? 0,
      burnRoyalty: d.burnRoyalty ?? 0,
    };
  } catch (err) {
    console.error('[mintclub] getTokenRoyalties error:', err);
    return null;
  }
}

/** Check if native ETH zap is available (reserve is WETH) */
export function isZapAvailable(reserveSymbol: string): boolean {
  return reserveSymbol === 'WETH';
}

export async function getTokenPriceChange(symbolOrAddress: string): Promise<PriceChange | null> {
  try {
    const result = await network().token(symbolOrAddress).get24HoursUsdRate();
    return {
      currentUsdRate: result.currentUsdRate ?? null,
      previousUsdRate: result.previousUsdRate ?? null,
      changePercent: result.changePercent ?? null,
    };
  } catch (err) {
    console.error('[mintclub] getTokenPriceChange error:', err);
    return null;
  }
}

export async function estimateBuy(symbolOrAddress: string, amount: bigint): Promise<{ cost: bigint; royalty: bigint } | null> {
  try {
    const [cost, royalty] = await network().token(symbolOrAddress).getBuyEstimation(amount);
    return { cost, royalty };
  } catch (err) {
    console.error('[mintclub] estimateBuy error:', err);
    return null;
  }
}

export async function estimateSell(symbolOrAddress: string, amount: bigint): Promise<{ returns: bigint; royalty: bigint } | null> {
  try {
    const [returns, royalty] = await network().token(symbolOrAddress).getSellEstimation(amount);
    return { returns, royalty };
  } catch (err) {
    console.error('[mintclub] estimateSell error:', err);
    return null;
  }
}

export async function executeBuy(symbolOrAddress: string, params: {
  amount: bigint;
  slippage?: number;
  recipient?: `0x${string}`;
  walletClient?: unknown;
  onApproving?: () => void;
  onMinting?: () => void;
  onSuccess?: (receipt: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  try {
    // Configure SDK with Farcaster wallet if provided
    if (params.walletClient) {
      mintclub.withWalletClient(params.walletClient as import('viem').WalletClient);
    }

    const token = network().token(symbolOrAddress);
    let wasApproval = false;

    // First call — may be approval or mint
    params.onApproving?.();
    await token.buy({
      amount: params.amount,
      slippage: params.slippage ?? 500,
      recipient: params.recipient,
      onAllowanceSignatureRequest: () => params.onApproving?.(),
      onAllowanceSuccess: () => { wasApproval = true; },
      onSignatureRequest: () => params.onMinting?.(),
      onSuccess: params.onSuccess,
      onError: params.onError,
    });

    // If first call was approval, call again to mint
    if (wasApproval) {
      params.onMinting?.();
      await token.buy({
        amount: params.amount,
        slippage: params.slippage ?? 500,
        recipient: params.recipient,
        onSignatureRequest: () => params.onMinting?.(),
        onSuccess: params.onSuccess,
        onError: params.onError,
      });
    }
  } catch (e) {
    params.onError?.(e);
  }
}

export async function executeSell(symbolOrAddress: string, params: {
  amount: bigint;
  slippage?: number;
  recipient?: `0x${string}`;
  walletClient?: unknown;
  onApproving?: () => void;
  onSelling?: () => void;
  onSuccess?: (receipt: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  try {
    if (params.walletClient) {
      mintclub.withWalletClient(params.walletClient as import('viem').WalletClient);
    }

    const token = network().token(symbolOrAddress);
    let wasApproval = false;

    params.onApproving?.();
    await token.sell({
      amount: params.amount,
      slippage: params.slippage ?? 500,
      recipient: params.recipient,
      onAllowanceSignatureRequest: () => params.onApproving?.(),
      onAllowanceSuccess: () => { wasApproval = true; },
      onSignatureRequest: () => params.onSelling?.(),
      onSuccess: params.onSuccess,
      onError: params.onError,
    });

    if (wasApproval) {
      params.onSelling?.();
      await token.sell({
        amount: params.amount,
        slippage: params.slippage ?? 500,
        recipient: params.recipient,
        onSignatureRequest: () => params.onSelling?.(),
        onSuccess: params.onSuccess,
        onError: params.onError,
      });
    }
  } catch (e) {
    params.onError?.(e);
  }
}

// ============================================
// Creator Profile (Neynar / Farcaster)
// ============================================

function computeCreatorRating(fid: number, followerCount: number, tokenCount: number, verified: boolean): { rating: number; label: string } {
  let score = 0;

  // FID age (lower FID = OG, max 30 pts)
  if (fid < 1000) score += 30;
  else if (fid < 10000) score += 25;
  else if (fid < 50000) score += 20;
  else if (fid < 200000) score += 10;
  else score += 5;

  // Followers (max 30 pts)
  if (followerCount >= 10000) score += 30;
  else if (followerCount >= 1000) score += 25;
  else if (followerCount >= 100) score += 15;
  else if (followerCount >= 10) score += 5;

  // Token track record (max 20 pts)
  if (tokenCount >= 5) score += 20;
  else if (tokenCount >= 3) score += 15;
  else if (tokenCount >= 2) score += 10;
  else score += 5;

  // Verified ETH address (20 pts)
  if (verified) score += 20;

  const rating = Math.min(100, score);

  let label: string;
  if (rating >= 80) label = 'Trusted';
  else if (rating >= 60) label = 'Established';
  else if (rating >= 40) label = 'Active';
  else if (rating >= 20) label = 'New';
  else label = 'Unknown';

  return { rating, label };
}

export async function fetchCreatorProfile(
  creatorAddress: string,
  tokenCount: number,
): Promise<CreatorProfile | null> {
  try {
    const res = await fetch(`/api/creator?address=${creatorAddress}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.fid) return null;

    const verified = (data.verifiedAddresses as string[])?.some(
      (a: string) => a.toLowerCase() === creatorAddress.toLowerCase()
    ) ?? false;

    const { rating, label } = computeCreatorRating(
      data.fid,
      data.followerCount ?? 0,
      tokenCount,
      verified,
    );

    return {
      fid: data.fid,
      username: data.username,
      displayName: data.displayName,
      pfpUrl: data.pfpUrl,
      followerCount: data.followerCount ?? 0,
      verifiedAddresses: data.verifiedAddresses ?? [],
      tokenCount,
      rating,
      ratingLabel: label,
    };
  } catch (err) {
    console.error('[mintclub] fetchCreatorProfile error:', err);
    return null;
  }
}
