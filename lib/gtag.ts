import { Platform } from 'react-native';

const SIGN_UP_EVENT = 'ads_conversion_Sign_up_1';
const EVENT_TIMEOUT_MS = 2000;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function canSendGtag(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function'
  );
}

/**
 * Google Ads sign-up conversion. Waits for gtag (or 2s) before navigating
 * so the hit is not dropped by a route change.
 */
export function gtagSendEvent(onComplete: () => void): boolean {
  if (!canSendGtag()) {
    onComplete();
    return false;
  }

  let finished = false;
  const callback = () => {
    if (finished) return;
    finished = true;
    onComplete();
  };

  window.gtag?.('event', SIGN_UP_EVENT, {
    event_callback: callback,
    event_timeout: EVENT_TIMEOUT_MS,
  });

  return false;
}

export function trackSignUpConversion(): Promise<void> {
  return new Promise((resolve) => {
    gtagSendEvent(resolve);
  });
}
