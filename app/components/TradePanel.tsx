'use client';

import { useState, useEffect } from 'react';
import { encodeFunctionData, erc20Abi } from 'viem';
import { useSendCalls } from 'wagmi/experimental';
import { useWallet } from './WalletProvider';
import { estimateBuy, estimateSell } from '../lib/mintclub';
import { BOND_ADDRESS } from '../lib/constants';

const mcv2MintAbi = [{
  name: 'mint',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'token', type: 'address' },
    { name: 'tokensToMint', type: 'uint256' },
    { name: 'maxReserveAmount', type: 'uint256' },
    { name: 'receiver', type: 'address' },
  ],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

const mcv2BurnAbi = [{
  name: 'burn',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'token', type: 'address' },
    { name: 'tokensToBurn', type: 'uint256' },
    { name: 'minRefund', type: 'uint256' },
    { name: 'receiver', type: 'address' },
  ],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

interface TradePanelProps {
  tokenSymbol: string;
  tokenAddress: string;
  reserveToken: string;
  reserveSymbol: string;
  currentPrice: string;
  onTradeComplete?: () => void;
}

export function TradePanel({ tokenSymbol, tokenAddress, reserveToken, reserveSymbol, currentPrice, onTradeComplete }: TradePanelProps) {
  const { address, isConnected } = useWallet();
  const { sendCalls, isPending: isBatchPending } = useSendCalls();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [estimation, setEstimation] = useState<string | null>(null);
  const [estCost, setEstCost] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [slippage, setSlippage] = useState(500); // 5% default

  // Debounced estimation
  useEffect(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setEstimation(null);
      setEstCost(null);
      return;
    }

    const amountBigInt = BigInt(Math.floor(Number(amount) * 1e18));
    const timer = setTimeout(async () => {
      if (mode === 'buy') {
        const est = await estimateBuy(tokenAddress, amountBigInt);
        if (est) {
          setEstCost(est.cost);
          setEstimation(`Cost: ${(Number(est.cost) / 1e18).toFixed(6)} ${reserveSymbol}`);
        }
      } else {
        const est = await estimateSell(tokenAddress, amountBigInt);
        if (est) {
          setEstCost(null);
          setEstimation(`Receive: ${(Number(est.returns) / 1e18).toFixed(6)} ${reserveSymbol}`);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, mode, tokenAddress, reserveSymbol]);

  const handleTrade = async () => {
    if (!address || !amount) return;
    const amountBigInt = BigInt(Math.floor(Number(amount) * 1e18));
    const wallet = address as `0x${string}`;

    setLoading(true);
    setTxStatus('pending');

    if (mode === 'buy') {
      // Batch approve + mint via EIP-5792 (single confirmation)
      if (!estCost) {
        setTxStatus('error');
        setLoading(false);
        return;
      }

      // Apply slippage to max cost
      const maxCost = estCost + (estCost * BigInt(slippage) / 10000n);

      try {
        sendCalls({
          calls: [
            {
              to: reserveToken as `0x${string}`,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: 'approve',
                args: [BOND_ADDRESS, maxCost],
              }),
            },
            {
              to: BOND_ADDRESS,
              data: encodeFunctionData({
                abi: mcv2MintAbi,
                functionName: 'mint',
                args: [tokenAddress as `0x${string}`, amountBigInt, maxCost, wallet],
              }),
            },
          ],
        }, {
          onSuccess: () => {
            setTxStatus('success');
            setLoading(false);
            setAmount('');
            setEstimation(null);
            setEstCost(null);
            onTradeComplete?.();
          },
          onError: (err: unknown) => {
            console.error('[trade] batch buy error:', err);
            setTxStatus('error');
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('[trade] batch buy error:', err);
        setTxStatus('error');
        setLoading(false);
      }
    } else {
      // Sell — burn tokens (no approval needed, user owns the tokens)
      try {
        const est = await estimateSell(tokenAddress, amountBigInt);
        if (!est) {
          setTxStatus('error');
          setLoading(false);
          return;
        }
        const minRefund = est.returns - (est.returns * BigInt(slippage) / 10000n);

        sendCalls({
          calls: [
            {
              to: BOND_ADDRESS,
              data: encodeFunctionData({
                abi: mcv2BurnAbi,
                functionName: 'burn',
                args: [tokenAddress as `0x${string}`, amountBigInt, minRefund, wallet],
              }),
            },
          ],
        }, {
          onSuccess: () => {
            setTxStatus('success');
            setLoading(false);
            setAmount('');
            setEstimation(null);
            onTradeComplete?.();
          },
          onError: (err: unknown) => {
            console.error('[trade] sell error:', err);
            setTxStatus('error');
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('[trade] sell error:', err);
        setTxStatus('error');
        setLoading(false);
      }
    }
  };

  const isProcessing = loading || isBatchPending;

  return (
    <div className="bg-surface border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">Trade ${tokenSymbol}</div>
        <div className="text-xs text-gray-500">Price: {currentPrice}</div>
      </div>

      {/* Buy/Sell toggle */}
      <div className="flex gap-1 bg-slate-950 rounded-lg p-0.5">
        <button
          onClick={() => { setMode('buy'); setEstimation(null); setEstCost(null); }}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setMode('sell'); setEstimation(null); setEstCost(null); }}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'sell' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount input */}
      <div>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount of tokens"
          className="w-full bg-slate-950 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-primary focus:outline-none"
          min="0"
          step="any"
        />
        {estimation && (
          <div className="mt-1 text-[10px] text-gray-400">{estimation}</div>
        )}
      </div>

      {/* Slippage */}
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>Slippage</span>
        <div className="flex gap-1">
          {[100, 300, 500, 1000].map(s => (
            <button
              key={s}
              onClick={() => setSlippage(s)}
              className={`px-1.5 py-0.5 rounded ${slippage === s ? 'bg-primary/20 text-primary' : 'hover:text-gray-300'}`}
            >
              {s / 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Trade button */}
      <button
        onClick={handleTrade}
        disabled={!isConnected || !amount || isProcessing || Number(amount) <= 0}
        className={`w-full py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          mode === 'buy'
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        {isProcessing ? 'Processing...' :
         txStatus === 'success' ? 'Done!' :
         txStatus === 'error' ? 'Try Again' :
         !isConnected ? 'Connect Wallet' :
         mode === 'buy' ? 'Buy' : 'Sell'}
      </button>

      {txStatus === 'success' && (
        <div className="text-[10px] text-emerald-400 text-center">Transaction confirmed</div>
      )}
      {txStatus === 'error' && (
        <div className="text-[10px] text-red-400 text-center">Transaction failed</div>
      )}
    </div>
  );
}
