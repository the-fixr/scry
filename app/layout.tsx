import type { Metadata } from 'next';
import './globals.css';

// ============================================
// CUSTOMIZE YOUR APP METADATA HERE
// ============================================
const APP_NAME = 'Scry';
const APP_DESCRIPTION = 'Bonding curve scanner for Base. Find early tokens, track momentum, spot breakouts — trade in one tap.';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://scry.fixr.nexus';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [`${APP_URL}/og-image.png`],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/og-image.png`,
      button: {
        title: 'Scry the Curves',
        action: {
          type: 'launch_miniapp',
          name: APP_NAME,
          url: APP_URL,
          splashImageUrl: `${APP_URL}/icon.png`,
          splashBackgroundColor: '#0a0b14',
        },
      },
    }),
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: `${APP_URL}/og-image.png`,
      button: {
        title: 'Scry the Curves',
        action: {
          type: 'launch_frame',
          name: APP_NAME,
          url: APP_URL,
          splashImageUrl: `${APP_URL}/icon.png`,
          splashBackgroundColor: '#0a0b14',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

/**
 * NOTES:
 * - Uses @farcaster/miniapp-sdk for native mini app features
 * - Mini app manifest at public/.well-known/farcaster.json
 * - SDK is imported in app/components/FrameSDK.tsx
 * - When running outside Farcaster, the app works in standalone mode
 */
