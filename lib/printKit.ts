import { qrPngDataUrl } from './qrPng';

export function popupOpened(popup: { closed?: boolean } | null | undefined) {
  return !!popup && popup.closed !== true;
}

export function qrDownloadName(businessName: string) {
  return `${fileSlug(businessName)}-qr.png`;
}

export function posterDownloadName(businessName: string) {
  return `${fileSlug(businessName)}-poster.pdf`;
}

export function posterHtml(input: { name: string; reward: string; staff: string; qrDataUrl: string }) {
  if (!input.qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('QR image is not a PNG');
  }
  const name = escapeHtml(input.name);
  const reward = escapeHtml(input.reward);
  const staff = escapeHtml(input.staff);
  return `<!doctype html><html><head><title>${name} poster</title><style>body{font-family:sans-serif;text-align:center;padding:32px}h1{font-size:32px;margin:0 0 8px}p{font-size:18px}img{width:280px;height:280px}</style></head><body><h1>${name}</h1><p>${reward}</p><img src="${input.qrDataUrl}" alt="QR code"/><p>${staff}</p></body></html>`;
}

export function posterHtmlForQr(input: { name: string; reward: string; staff: string; qrUrl: string }) {
  return posterHtml({ ...input, qrDataUrl: qrPngDataUrl(input.qrUrl) });
}

export async function deliverWebPng(dataUrl: string, filename: string): Promise<boolean> {
  if (typeof document === 'undefined' || !dataUrl.startsWith('data:image/png;base64,')) return false;
  const blob = dataUrlToBlob(dataUrl);
  if (blob.size === 0) return false;

  const file = webFile(blob, filename);
  if (file && canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch {
      return false;
    }
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function fileSlug(businessName: string) {
  const slug = businessName
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[\\/:*?"<>|]+/g, '');
  return slug || 'scan-perks';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataUrlToBlob(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  const mime = /data:(.*?);base64/.exec(dataUrl.slice(0, comma))?.[1] || 'image/png';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function webFile(blob: Blob, filename: string) {
  if (typeof File === 'undefined') return null;
  try {
    return new File([blob], filename, { type: 'image/png' });
  } catch {
    return null;
  }
}

function canShareFile(file: File) {
  try {
    return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
  } catch {
    return false;
  }
}
