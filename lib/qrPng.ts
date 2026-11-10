import QRCode from 'qrcode';

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export type QrPngImage = {
  bytes: Uint8Array;
  scale: number;
  margin: number;
  count: number;
  size: number;
};

export function qrPngImage(value: string, targetWidth = 512): QrPngImage {
  const matrix = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules;
  const count = matrix.size;
  const margin = 2;
  const scale = Math.max(1, Math.floor(targetWidth / (count + margin * 2)));
  const size = (count + margin * 2) * scale;
  const raw = new Uint8Array((size + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const row = y * (size + 1);
    raw[row] = 0;
    const moduleY = Math.floor(y / scale) - margin;
    for (let x = 0; x < size; x += 1) {
      const moduleX = Math.floor(x / scale) - margin;
      const dark =
        moduleY >= 0 &&
        moduleX >= 0 &&
        moduleY < count &&
        moduleX < count &&
        matrix.get(moduleY, moduleX);
      raw[row + 1 + x] = dark ? 0 : 255;
    }
  }

  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, size);
  header.setUint32(4, size);
  ihdr[8] = 8;

  const bytes = concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStore(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);

  return { bytes, scale, margin, count, size };
}

export function qrPngBase64(value: string, targetWidth = 512) {
  return bytesToBase64(qrPngImage(value, targetWidth).bytes);
}

export function qrPngDataUrl(value: string, targetWidth = 512) {
  return `data:image/png;base64,${qrPngBase64(value, targetWidth)}`;
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0);
  return bytes;
}

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const name = Uint8Array.from(type, (char) => char.charCodeAt(0));
  return concat([u32(data.length), name, data, u32(crc32(concat([name, data])))]);
}

function adler32(data: Uint8Array) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i += 1) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(data: Uint8Array) {
  const parts: Uint8Array[] = [Uint8Array.of(0x78, 0x01)];
  const max = 65535;
  let offset = 0;
  do {
    const end = Math.min(offset + max, data.length);
    const block = data.subarray(offset, end);
    const header = new Uint8Array(5);
    header[0] = end === data.length ? 1 : 0;
    header[1] = block.length & 0xff;
    header[2] = (block.length >>> 8) & 0xff;
    const complement = block.length ^ 0xffff;
    header[3] = complement & 0xff;
    header[4] = (complement >>> 8) & 0xff;
    parts.push(header, block);
    offset = end;
  } while (offset < data.length);
  parts.push(u32(adler32(data)));
  return concat(parts);
}

export function bytesToBase64(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64[(triple >> 18) & 63];
    out += BASE64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64[triple & 63] : '=';
  }
  return out;
}
