# Scry

**Bonding curve opportunity scanner for Base.** A Farcaster mini app that surfaces early, breakout, and high-momentum tokens from the Mint Club ecosystem — then lets you trade in one tap.

Scry reads every bonding curve token on Base via the MCV2_Bond contract, computes opportunity signals (curve position, 24h momentum, step jumps, spread, creator reputation), and ranks them so you can find alpha before the crowd.

---

## How It Works

1. **Scan** — Fetches all bonding curve tokens on Base, computes signals from on-chain data
2. **Filter** — Sort by opportunity score, curve stage, reserve depth, reserve type
3. **Research** — Tap any token for full details: creator profile (via Farcaster/Neynar), curve chart, royalties, metadata, distribution plan
4. **Trade** — Buy or sell directly inside the app via Mint Club SDK
5. **Predict** — Stake $SCRY on 24h directional calls (Alpha tier)

---

## $SCRY Token

$SCRY is a Hunt Town Co-Op bonding curve token on Base. It's not a governance token or a speculative asset — it's the access key that unlocks scanner features. Revenue comes from trading royalties, not token sales.

### Tokenomics

| Parameter | Value |
|-----------|-------|
| **Supply** | 100,000,000 (bonding curve, minted on demand) |
| **Reserve** | HUNT |
| **Curve** | Exponential (cheap early, expensive late) |
| **Buy Royalty** | 5% |
| **Sell Royalty** | 5% |

Royalties flow to the Fixr treasury automatically on every trade. No staking contracts, no vesting, no VC allocation.

### Distribution

- **100% bonding curve** — all tokens are minted by buyers on the curve
- No pre-mine, no team allocation, no airdrop
- First buyers get the lowest price (exponential curve)
- Royalties are the only revenue mechanism

### Utility Tiers

Hold $SCRY to unlock features. No staking required — just hold in your wallet.

| Tier | Hold | Unlocks |
|------|------|---------|
| **Free** | 0 | Browse all tokens, basic cards, trade |
| **Scout** | 1,000 | Signal badges, curve charts, Early + Hot filters |
| **Pro** | 5,000 | Breakout detection, spread analysis, advanced curves |
| **Alpha** | 25,000 | Predictions game, portfolio tracking, alerts, export |

### Additional Token Sinks

- **Prediction Game** — Stake 10-100 $SCRY on 24h price calls. Winners split losers' stakes minus 10% house cut
- **Featured Listings** — Project creators pay 50 $SCRY per 24h to pin their token at the top

---

## Signals

| Signal | How It's Computed |
|--------|-------------------|
| **Curve Position** | `currentSupply / maxSupply` — Early (<20%), Mid, Late (>80%), Graduating (>90%) |
| **24h Momentum** | `get24HoursUsdRate().changePercent` — Hot (>10%), Rising (0-10%) |
| **Reserve Depth** | `reserveBalance` — flags deep liquidity pools |
| **Step Jump** | Price increase to next curve step — Breakout if >20% |
| **Spread** | `(buyCost - sellReturn) / buyCost` — real round-trip cost |
| **Creator Rating** | FID age + followers + token count + verified address (via Neynar) |
| **Royalties** | Low Fee (<5% total) or High Fee (>15% total) |
| **Age** | Hours since creation — New (<24h), Dormant (zero supply) |

---

## Stack

- **Next.js 15** + React 19 + Tailwind CSS
- **Mint Club V2 SDK** — token list, enrichment, trading
- **Farcaster Mini App SDK** — frame context, wallet connector
- **Neynar API** — creator profile lookup by ETH address
- **wagmi + viem** — Base chain interaction
- **Vercel** — deployment

---

## Setup

```bash
npm install
cp .env.example .env.local
# Add your NEYNAR_API_KEY to .env.local
npm run dev
```

---

## License

MIT

---

Built by [Fixr](https://fixr.nexus)
