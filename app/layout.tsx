import type { Metadata } from 'next';
import './globals.css';

// ============================================
// CUSTOMIZE YOUR APP METADATA HERE
// ============================================
const APP_NAME = 'My Mini App';
const APP_DESCRIPTION = 'A Farcaster mini app';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';

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
  // Farcaster Frame metadata
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${APP_URL}/og-image.png`,
    'fc:frame:button:1': `Launch ${APP_NAME}`,
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': APP_URL,
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
 * - SDK is imported in app/components/FrameSDK.tsx
 * - When running outside Farcaster, the app works in standalone mode
 * - See README.md for full documentation
 */
