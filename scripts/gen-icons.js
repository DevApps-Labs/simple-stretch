#!/usr/bin/env node
// Generates PWA icons using only Node.js built-ins (no external packages)
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
}
const CRC = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([tb, data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  tb.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(crcInput), 8 + data.length);
  return out;
}

function createPNG(size) {
  // Dark bg: #111111 = rgb(17,17,17)
  // Teal ring: #14b8a6 = rgb(20,184,166)
  const BG = [17, 17, 17];
  const RING = [20, 184, 166];

  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(size * rowBytes);

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outerR = size * 0.36;
  const innerR = size * 0.24;
  const dotR = size * 0.1;

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0; // None filter
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const px = y * rowBytes + 1 + x * 3;
      // Teal ring + center dot on dark bg
      const isRing = d >= innerR && d <= outerR;
      const isDot = d <= dotR;
      const col = isRing || isDot ? RING : BG;
      raw[px] = col[0];
      raw[px + 1] = col[1];
      raw[px + 2] = col[2];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, "icon-192.png"), createPNG(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), createPNG(512));

console.log("✓ Generated public/icons/icon-192.png and icon-512.png");
