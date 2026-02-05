# Farcaster Mini App Template

A secure, production-ready template for building Farcaster mini apps.

Built by [Fixr](https://fixr.nexus) | [Shipyard Launchpad](https://shipyard.fixr.nexus)

---

## Quick Start

```bash
# Clone the template
git clone https://github.com/the-fixr/farcaster-miniapp-template.git my-app
cd my-app

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

---

## What to Change vs What NOT to Change

### ✅ SAFE TO MODIFY

| File | What to Change |
|------|----------------|
| `app/page.tsx` | Your app's main content and UI |
| `app/layout.tsx` | App name, description, metadata |
| `public/manifest.json` | App name, URLs, colors, icons |
| `tailwind.config.ts` | Colors, fonts, theme |
| `.env.local` | Your environment variables |
| `public/*.png` | Your app icons and images |

### ⚠️ MODIFY WITH CAUTION

| File | Notes |
|------|-------|
| `app/components/WalletProvider.tsx` | Only modify `SUPPORTED_CHAINS` if needed |
| `next.config.ts` | Only add to existing config, don't remove headers |

### ❌ DO NOT MODIFY

| File | Reason |
|------|--------|
| `app/components/FrameSDK.tsx` | Security-critical SDK wrapper |
| `package.json` (core deps) | Tested dependency versions |

---

## Deployment Checklist

### Before You Deploy

- [ ] Update `public/manifest.json` with your URLs
- [ ] Update `app/layout.tsx` with your app metadata
- [ ] Add your icons to `/public` (icon.png, splash.png, og-image.png)
- [ ] Set `NEXT_PUBLIC_APP_URL` in environment variables
- [ ] Test in Warpcast using their developer tools

### Security Checklist

- [ ] `.env.local` is in `.gitignore` (it is by default)
- [ ] No API keys have `NEXT_PUBLIC_` prefix
- [ ] All external URLs use HTTPS
- [ ] Reviewed all user inputs for XSS vectors

---

## Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/the-fixr/farcaster-miniapp-template)

1. Click the button above
2. Connect your GitHub account
3. Set environment variables:
   - `NEXT_PUBLIC_APP_URL`: Your Vercel URL (e.g., `https://my-app.vercel.app`)
4. Deploy!

### After Deploying

1. Update `public/manifest.json` with your production URL
2. Re-deploy to apply changes
3. Register your app at [farcaster.xyz/~/developers](https://farcaster.xyz/~/developers)

---

## Project Structure

```
├── app/
│   ├── page.tsx              # 👈 YOUR MAIN APP CODE
│   ├── layout.tsx            # 👈 App metadata (change this)
│   ├── globals.css           # Global styles
│   ├── components/
│   │   ├── FrameSDK.tsx      # ⛔ Don't modify
│   │   └── WalletProvider.tsx # ⚠️ Modify chains only
│   └── lib/
│       └── api.ts            # Your API helpers
├── public/
│   ├── manifest.json         # 👈 MUST UPDATE for deployment
│   ├── icon.png              # 👈 Your app icon (512x512)
│   ├── splash.png            # 👈 Splash screen (512x512)
│   └── og-image.png          # 👈 Social preview (1200x630)
├── .env.example              # Template for env vars
├── .env.local                # ⛔ Your secrets (git-ignored)
└── README.md                 # This file
```

---

## Security Best Practices

### 1. Environment Variables

```bash
# ❌ WRONG - Exposes key to client
NEXT_PUBLIC_API_KEY=secret123

# ✅ CORRECT - Server-side only
API_KEY=secret123
```

### 2. URL Validation

The FrameSDK already validates URLs, but in your own code:

```typescript
// ❌ WRONG - XSS vulnerability
window.location.href = userInput;

// ✅ CORRECT - Validate first
if (isValidHttpsUrl(userInput)) {
  window.open(userInput, '_blank', 'noopener,noreferrer');
}
```

### 3. User Input

```typescript
// ❌ WRONG - XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT - React auto-escapes
<div>{userInput}</div>
```

### 4. Wallet Transactions

```typescript
// ✅ ALWAYS show the user what they're signing
// ✅ NEVER auto-sign transactions
// ✅ ALWAYS validate addresses before sending
```

---

## Adding Features

### Token Analysis

Create `app/components/TokenAnalyzer.tsx`:

```typescript
'use client';

import { useState } from 'react';

export function TokenAnalyzer() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);

  const analyze = async () => {
    // Call your API route (keeps keys server-side)
    const res = await fetch(`/api/analyze?address=${address}`);
    setResult(await res.json());
  };

  return (
    <div>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Token address..."
      />
      <button onClick={analyze}>Analyze</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

### NFT Display

```typescript
import { useWallet } from './WalletProvider';

export function NFTGallery() {
  const { address } = useWallet();
  // Fetch NFTs for connected address...
}
```

---

## Manifest.json Reference

```json
{
  "version": "1",
  "name": "Your App Name",           // 👈 Change this
  "homeUrl": "https://your-url",     // 👈 Your deployed URL
  "imageUrl": "https://your-url/og-image.png",
  "iconUrl": "https://your-url/icon.png",
  "button": {
    "title": "Launch App",           // 👈 Button text
    "action": {
      "type": "launch_frame",
      "name": "Your App Name",       // 👈 Same as above
      "url": "https://your-url",     // 👈 Your deployed URL
      "splashImageUrl": "https://your-url/splash.png",
      "splashBackgroundColor": "#0a0a0a"  // 👈 Your brand color
    }
  }
}
```

---

## Testing Your App

### Local Development

```bash
npm run dev
# Opens at http://localhost:3000
```

### In Warpcast

1. Deploy to Vercel (or any HTTPS host)
2. Go to Warpcast > Settings > Developer Tools
3. Paste your manifest.json URL
4. Test the frame

### Common Issues

| Issue | Solution |
|-------|----------|
| "Frame not loading" | Check manifest.json URLs match your domain |
| "Wallet not connecting" | Ensure you're testing in Warpcast |
| "Images not showing" | Use absolute HTTPS URLs |

---

## Resources

- [Farcaster Mini Apps Docs](https://docs.farcaster.xyz/mini-apps)
- [Frames v2 Specification](https://docs.farcaster.xyz/frames-v2)
- [miniapp-wagmi-connector](https://github.com/farcaster/miniapp-wagmi-connector)
- [Shipyard Launchpad](https://shipyard.fixr.nexus)

---

## Support

- [Fixr on Farcaster](https://farcaster.xyz/fixr)
- [GitHub Issues](https://github.com/the-fixr/farcaster-miniapp-template/issues)

---

Built with 💜 by Fixr
