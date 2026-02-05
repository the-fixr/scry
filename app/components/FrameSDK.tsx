'use client';

/**
 * MiniappSDK - Farcaster Mini App SDK Wrapper
 *
 * ============================================
 * DO NOT MODIFY THIS FILE
 * ============================================
 * This component handles the @farcaster/miniapp-sdk integration.
 * It provides secure access to Farcaster mini app features.
 *
 * If you need custom functionality, extend it in your own components
 * rather than modifying this file directly.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import sdk, { Context } from '@farcaster/miniapp-sdk';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface FrameSDKContextType {
  context: Context.MiniAppContext | null;
  isLoaded: boolean;
  isInMiniApp: boolean;
  error: string | null;
  actions: {
    viewProfile: (fid: number) => void;
    openUrl: (url: string) => void;
    close: () => void;
    ready: () => void;
    setPrimaryButton: (text: string, callback: () => void) => (() => void) | undefined;
    clearPrimaryButton: () => void;
  };
}

// ============================================
// SECURITY: URL VALIDATION
// ============================================

const ALLOWED_URL_PROTOCOLS = ['https:', 'http:'];
const BLOCKED_URL_PATTERNS = [
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
  /file:/i,
];

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (!ALLOWED_URL_PROTOCOLS.includes(url.protocol)) {
      console.warn('[MiniappSDK] Blocked URL with invalid protocol:', url.protocol);
      return false;
    }

    // Check for malicious patterns
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(urlString)) {
        console.warn('[MiniappSDK] Blocked URL matching dangerous pattern');
        return false;
      }
    }

    return true;
  } catch {
    console.warn('[MiniappSDK] Invalid URL format:', urlString);
    return false;
  }
}

// ============================================
// CONTEXT & PROVIDER
// ============================================

const FrameSDKContext = createContext<FrameSDKContextType | null>(null);

export function FrameSDKProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<Context.MiniAppContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        // Check if we're in a Farcaster mini app
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Get context from SDK - use directly, SDK handles validation
          const ctx = await sdk.context;
          setContext(ctx);

          // Signal ready to Farcaster client
          sdk.actions.ready();
        } else {
          // Not in a mini app - running standalone
          console.log('[MiniappSDK] Running outside Farcaster mini app');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[MiniappSDK] Initialization error:', message);
        setError(message);
      } finally {
        setIsLoaded(true);
      }
    };

    initSDK();
  }, []);

  // ============================================
  // ACTIONS (with security validation)
  // ============================================

  const viewProfile = useCallback((fid: number) => {
    // Validate FID is a positive integer
    if (!Number.isInteger(fid) || fid <= 0) {
      console.error('[MiniappSDK] Invalid FID:', fid);
      return;
    }

    try {
      sdk.actions.viewProfile({ fid });
    } catch (err) {
      console.error('[MiniappSDK] viewProfile error:', err);
    }
  }, []);

  const openUrl = useCallback((url: string) => {
    // SECURITY: Validate URL before opening
    if (!isValidUrl(url)) {
      console.error('[MiniappSDK] Blocked invalid URL:', url);
      return;
    }

    try {
      sdk.actions.openUrl({ url });
    } catch (err) {
      console.error('[MiniappSDK] openUrl error:', err);
      // Fallback to window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const close = useCallback(() => {
    try {
      sdk.actions.close();
    } catch (err) {
      console.error('[MiniappSDK] close error:', err);
    }
  }, []);

  const ready = useCallback(() => {
    try {
      sdk.actions.ready();
    } catch (err) {
      console.error('[MiniappSDK] ready error:', err);
    }
  }, []);

  const setPrimaryButton = useCallback((text: string, callback: () => void): (() => void) | undefined => {
    try {
      sdk.actions.setPrimaryButton({
        text,
        disabled: false,
        hidden: false,
      });

      // Listen for button click
      const handleClick = () => {
        callback();
      };

      sdk.on('primaryButtonClicked', handleClick);

      // Return cleanup function
      return () => {
        sdk.off('primaryButtonClicked', handleClick);
      };
    } catch (err) {
      console.error('[MiniappSDK] setPrimaryButton error:', err);
      return undefined;
    }
  }, []);

  const clearPrimaryButton = useCallback(() => {
    try {
      sdk.actions.setPrimaryButton({
        text: '',
        hidden: true,
      });
    } catch (err) {
      console.error('[MiniappSDK] clearPrimaryButton error:', err);
    }
  }, []);

  const value: FrameSDKContextType = {
    context,
    isLoaded,
    isInMiniApp,
    error,
    actions: {
      viewProfile,
      openUrl,
      close,
      ready,
      setPrimaryButton,
      clearPrimaryButton,
    },
  };

  return (
    <FrameSDKContext.Provider value={value}>
      {children}
    </FrameSDKContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useFrameSDK(): FrameSDKContextType {
  const context = useContext(FrameSDKContext);

  if (!context) {
    // Return safe defaults when used outside provider
    return {
      context: null,
      isLoaded: true,
      isInMiniApp: false,
      error: null,
      actions: {
        viewProfile: () => console.warn('MiniappSDK not initialized'),
        openUrl: (url) => {
          if (isValidUrl(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        },
        close: () => {},
        ready: () => {},
        setPrimaryButton: () => undefined,
        clearPrimaryButton: () => {},
      },
    };
  }

  return context;
}

export default FrameSDKProvider;
