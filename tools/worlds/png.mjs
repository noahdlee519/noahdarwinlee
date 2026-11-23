// A small PNG encoder (indexed palette, or RGB for debugging), on node:zlib.

import { deflateSync } from 'node:zlib';

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(data.buffer, data.byteOffset, data.length).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// encodeIndexedPng(width, height, indices, palette) => Buffer.
// indices: one palette index per pixel; palette: [[r, g, b], ...] (up to 256).
// Packs to 1, 2, 4, or 8 bits per pixel, whichever the palette allows.
export function encodeIndexedPng(width, height, indices, palette) {
  const bits = palette.length <= 2 ? 1 : palette.length <= 4 ? 2 : palette.length <= 16 ? 4 : 8;
  const rowBytes = Math.ceil((width * bits) / 8);
  const raw = new Uint8Array((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const base = y * (rowBytes + 1) + 1; // filter byte 0 (none) leads each row
    if (bits === 8) {
      raw.set(indices.subarray(y * width, (y + 1) * width), base);
    } else {
      const per = 8 / bits;
      for (let x = 0; x < width; x++) {
        raw[base + ((x / per) | 0)] |= indices[y * width + x] << (8 - bits - (x % per) * bits);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bits; ihdr[9] = 3; // colour type 3: palette
  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((c, i) => plte.set(c, i * 3));
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

// encodeRgbPng(width, height, rgb) => Buffer. For debugging pictures.
export function encodeRgbPng(width, height, rgb) {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', new Uint8Array(0))]);
}

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
