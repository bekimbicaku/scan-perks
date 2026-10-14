export interface ParsedQRData {
  businessId: string;
  type?: 'static' | 'dynamic' | 'reward';
  transactionId?: string;
  timestamp?: string;
  expiresAt?: string;
}

const BUSINESS_PATH = /\/business\/([^/?#]+)/i;

export function buildPrintedQrValue(businessId: string, origin = 'https://app.scan-perks.com'): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/business/${encodeURIComponent(businessId)}`;
}

export function parseQRData(data: string): ParsedQRData {
  const trimmed = data.trim();
  if (!trimmed) {
    throw new Error('Invalid QR code');
  }

  if (trimmed.startsWith('{')) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid QR code');
    }
    if (typeof parsed.businessId !== 'string' || !parsed.businessId) {
      throw new Error('Invalid QR code format');
    }
    return parsed as unknown as ParsedQRData;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Invalid QR code');
  }

  let businessId = '';
  const pathMatch = `${url.pathname}${url.hash}`.match(BUSINESS_PATH) || url.pathname.match(BUSINESS_PATH);
  if (pathMatch?.[1]) {
    businessId = decodeURIComponent(pathMatch[1]);
  } else if (url.protocol === 'scanperks:' && url.hostname === 'business') {
    businessId = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ''));
  }

  if (!businessId) {
    throw new Error('Invalid QR code');
  }

  const typeParam = url.searchParams.get('type');
  const transactionId = url.searchParams.get('transactionId') || undefined;
  const type =
    typeParam === 'dynamic' || typeParam === 'static' || typeParam === 'reward'
      ? typeParam
      : transactionId
        ? 'dynamic'
        : 'static';

  return {
    businessId,
    type,
    ...(transactionId ? { transactionId } : {}),
  };
}
