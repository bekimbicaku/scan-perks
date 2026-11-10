import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateSync, crc32 } from 'node:zlib';
import QRCode from 'qrcode';
import { buildPrintedQrValue } from '../lib/qrLink';
import { posterHtml, popupOpened, qrDownloadName } from '../lib/printKit';
import { qrPngImage } from '../lib/qrPng';
import { firstScanStampCount } from '../lib/scanStamp';

const qrUrl = buildPrintedQrValue('owner_123', 'https://app.scan-perks.com');
const image = qrPngImage(qrUrl);
const png = Buffer.from(image.bytes);

assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

let offset = 8;
const idat: Buffer[] = [];
let width = 0;
let height = 0;
while (offset < png.length) {
  const length = png.readUInt32BE(offset);
  const type = png.subarray(offset + 4, offset + 8);
  const data = png.subarray(offset + 8, offset + 8 + length);
  const storedCrc = png.readUInt32BE(offset + 8 + length);
  assert.equal(storedCrc, crc32(Buffer.concat([type, data])));
  const name = type.toString('ascii');
  if (name === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    assert.equal(data[8], 8);
    assert.equal(data[9], 0);
  }
  if (name === 'IDAT') idat.push(data);
  offset += 12 + length;
  if (name === 'IEND') break;
}

assert.equal(width, image.size);
assert.equal(height, image.size);
assert.ok(width > 0);

const raw = inflateSync(Buffer.concat(idat));
assert.equal(raw.length, (width + 1) * height);

const matrix = QRCode.create(qrUrl, { errorCorrectionLevel: 'M' }).modules;
assert.equal(matrix.size, image.count);
const stride = width + 1;
for (let row = 0; row < matrix.size; row += 1) {
  for (let col = 0; col < matrix.size; col += 1) {
    const x = (col + image.margin) * image.scale + Math.floor(image.scale / 2);
    const y = (row + image.margin) * image.scale + Math.floor(image.scale / 2);
    const pixel = raw[y * stride + 1 + x];
    assert.equal(pixel, matrix.get(row, col) ? 0 : 255);
  }
}
assert.equal(raw[1], 255);

const poster = posterHtml({
  name: 'A & B <Cafe>',
  reward: '8 stamps, then "A free item"',
  staff: 'Point your phone camera at this code.',
  qrDataUrl: `data:image/png;base64,${png.toString('base64')}`,
});
assert.match(poster, /A &amp; B &lt;Cafe&gt;/);
assert.match(poster, /data:image\/png;base64,/);
assert.doesNotMatch(poster, /A & B <Cafe>/);

assert.equal(popupOpened(null), false);
assert.equal(popupOpened(undefined), false);
assert.equal(popupOpened({ closed: true }), false);
assert.equal(popupOpened({ closed: false }), true);

assert.equal(qrDownloadName('Blue Harbor'), 'blue-harbor-qr.png');
assert.equal(qrDownloadName('  '), 'scan-perks-qr.png');
assert.equal(qrDownloadName('A/B Cafe'), 'ab-cafe-qr.png');

assert.equal(firstScanStampCount(false, 2, true), 1);
assert.equal(firstScanStampCount(false, 2, false), 1);
assert.equal(firstScanStampCount(true, 2, true), 1);
assert.equal(firstScanStampCount(true, 2, false), 2);

const scanSource = readFileSync(path.join(process.cwd(), 'lib/scan.ts'), 'utf8');
assert.match(
  scanSource,
  /const scanIncrement = firstScanStampCount\(happyHourActive, happyHour\.multiplier, welcomeStampApplied\);/
);
const ownerSource = readFileSync(path.join(process.cwd(), 'lib/ownerTestScan.ts'), 'utf8');
assert.match(ownerSource, /firstScanStampCount\(/);
assert.doesNotMatch(ownerSource, /statistics/);
assert.match(ownerSource, /users', user\.uid, 'scans'/);
const kit = readFileSync(path.join(process.cwd(), 'components/GoLiveKit.tsx'), 'utf8');
assert.match(kit, /if \(!popupOpened\(popup\) \|\| !popup\)/);
assert.match(kit, /shareBase64File/);
assert.match(kit, /sharePosterPdf/);
assert.match(kit, /runOwnerTestScan/);
assert.doesNotMatch(kit, /copyToClipboard\(qrUrl\)/);

console.log('print kit checks passed');
