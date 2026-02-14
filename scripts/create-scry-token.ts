/**
 * Create $SCRY token on Mint Club V2 (Base) as a Hunt Town Co-Op Project
 *
 * Token: $SCRY
 * Supply: 100,000,000
 * Reserve: HUNT (0x37f0c2915CeCC7e977183B8543Fc0864d03E064C)
 * Curve: Exponential
 * Royalties: 5% buy / 5% sell
 * Initial price: 0.0001 HUNT (~$0.00001)
 * Final price: 1.0 HUNT (~$0.10)
 *
 * Run: PRIVATE_KEY=0x... npx tsx scripts/create-scry-token.ts
 *
 * Or use these parameters in the Hunt Town UI at hunt.town
 */

import { mintclub } from 'mint.club-v2-sdk';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const HUNT_ADDRESS = '0x37f0c2915CeCC7e977183B8543Fc0864d03E064C' as const;

const SCRY_CONFIG = {
  name: 'Scry',
  symbol: 'SCRY',
  maxSupply: 100_000_000, // 100M
  reserveToken: {
    address: HUNT_ADDRESS,
    decimals: 18,
  },
  curveData: {
    curveType: 'EXPONENTIAL' as const,
    stepCount: 100,
    maxSupply: 100_000_000,
    initialMintingPrice: 0.0001,  // 0.0001 HUNT per token at start
    finalMintingPrice: 1.0,       // 1.0 HUNT per token at full supply
  },
  buyRoyalty: 0.05,  // 5%
  sellRoyalty: 0.05,  // 5%
};

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.log('\n=== $SCRY Token Parameters ===\n');
    console.log('Name:', SCRY_CONFIG.name);
    console.log('Symbol:', SCRY_CONFIG.symbol);
    console.log('Max Supply:', SCRY_CONFIG.maxSupply.toLocaleString());
    console.log('Reserve: HUNT');
    console.log('Curve: Exponential (100 steps)');
    console.log('Initial Price: 0.0001 HUNT (~$0.00001)');
    console.log('Final Price: 1.0 HUNT (~$0.10)');
    console.log('Buy Royalty: 5%');
    console.log('Sell Royalty: 5%');
    console.log('\nFDV Range:');
    console.log('  At start: 100M × $0.00001 = $1,000');
    console.log('  At end:   100M × $0.10    = $10,000,000');
    console.log('\nTier costs (estimated at ~30% filled):');
    console.log('  Scout  (1,000 SCRY):  ~$0.50');
    console.log('  Pro    (5,000 SCRY):  ~$2.50');
    console.log('  Alpha (25,000 SCRY):  ~$5.00+');
    console.log('\nTo deploy, run with PRIVATE_KEY env var:');
    console.log('  PRIVATE_KEY=0x... npx tsx scripts/create-scry-token.ts');
    console.log('\nOr use these same params in the Hunt Town UI at https://hunt.town');
    return;
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log('Deploying $SCRY from:', account.address);

  // The SDK needs a wallet client for write operations
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  try {
    await mintclub
      .withWalletClient(walletClient)
      .network('base')
      .token('SCRY')
      .create({
        name: SCRY_CONFIG.name,
        reserveToken: SCRY_CONFIG.reserveToken,
        curveData: SCRY_CONFIG.curveData,
        buyRoyalty: SCRY_CONFIG.buyRoyalty,
        sellRoyalty: SCRY_CONFIG.sellRoyalty,
        onSuccess: (receipt: { transactionHash: string }) => {
          console.log('\n$SCRY token created!');
          console.log('TX:', receipt.transactionHash);
          console.log('View on BaseScan: https://basescan.org/tx/' + receipt.transactionHash);
          console.log('\nNext steps:');
          console.log('1. Get the token address from the TX receipt');
          console.log('2. Upload logo via mint.club metadata API');
          console.log('3. Update SCRY_TOKEN in scanner/app/lib/constants.ts');
          console.log('4. Token will auto-appear on hunt.town as a Co-Op Project');
        },
        onError: (error: unknown) => {
          console.error('Creation failed:', error);
        },
      });
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
