#!/usr/bin/env node
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function encodePNG(pixels, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = y * rowLen + 1 + x * 4;
      raw[ri] = pixels[pi]; raw[ri+1] = pixels[pi+1]; raw[ri+2] = pixels[pi+2]; raw[ri+3] = pixels[pi+3];
    }
  }
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Smooth signed-distance helpers
function sdRoundRect(x, y, cx, cy, w, h, r) {
  const qx = Math.abs(x - cx) - w / 2 + r;
  const qy = Math.abs(y - cy) - h / 2 + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdCircle(x, y, cx, cy, r) { return Math.sqrt((x-cx)**2+(y-cy)**2) - r; }

function createAppIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const s = size;

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // Normalized coords 0–1
      const nx = x / s, ny = y / s;
      const cx = s / 2, cy = s / 2;

      // Background: dark zinc rounded square
      const bgSDF = sdRoundRect(x, y, cx, cy, s * 0.92, s * 0.92, s * 0.22);
      const bgAlpha = clamp(0.5 - bgSDF, 0, 1);

      // Blue inner rounded square
      const blueSDF = sdRoundRect(x, y, cx, cy, s * 0.62, s * 0.62, s * 0.14);
      const blueAlpha = clamp(0.5 - blueSDF, 0, 1);

      // Mic capsule (upper part)
      const micW = s * 0.15, micH = s * 0.28;
      const micCX = cx, micCY = cy - s * 0.04;
      const capSDF = sdRoundRect(x, y, micCX, micCY - micH * 0.05, micW, micH, micW / 2);
      const capAlpha = clamp(0.5 - capSDF, 0, 1);

      // Mic arc (outer path drawn as thick ring bottom half)
      const arcR = s * 0.17, arcThick = s * 0.04;
      const arcCY = cy - s * 0.04;
      const distToArcCenter = sdCircle(x, y, micCX, arcCY, arcR);
      const arcSDF = Math.abs(distToArcCenter) - arcThick / 2;
      // Only lower half (y >= arcCY)
      const arcHalf = y >= arcCY ? 1 : 0;
      const arcAlpha = clamp(0.5 - arcSDF, 0, 1) * arcHalf;

      // Mic stand (vertical line below arc)
      const standW = s * 0.04, standH = s * 0.07;
      const standCX = micCX, standCY = arcCY + arcR + standH / 2 - s * 0.01;
      const standSDF = sdRoundRect(x, y, standCX, standCY, standW, standH, standW / 2);
      const standAlpha = clamp(0.5 - standSDF, 0, 1);

      // Base line
      const baseW = s * 0.18, baseH = s * 0.04;
      const baseCY = standCY + standH / 2 + baseH / 2 - s * 0.005;
      const baseSDF = sdRoundRect(x, y, micCX, baseCY, baseW, baseH, baseH / 2);
      const baseAlpha = clamp(0.5 - baseSDF, 0, 1);

      // Composite
      let r = 0x12, g = 0x12, b = 0x14, a = 0; // transparent base

      // dark bg
      r = lerp(r, 0x18, bgAlpha); g = lerp(g, 0x18, bgAlpha); b = lerp(b, 0x1c, bgAlpha); a = lerp(a, 255, bgAlpha);
      // blue square
      const blendBlue = blueAlpha * bgAlpha;
      r = lerp(r, 0x25, blendBlue); g = lerp(g, 0x6d, blendBlue); b = lerp(b, 0xef, blendBlue);
      // white mic parts
      const micMask = Math.max(capAlpha, arcAlpha, standAlpha, baseAlpha);
      const blendMic = micMask * blendBlue;
      r = lerp(r, 255, blendMic); g = lerp(g, 255, blendMic); b = lerp(b, 255, blendMic);

      const idx = (y * s + x) * 4;
      pixels[idx]   = Math.round(clamp(r, 0, 255));
      pixels[idx+1] = Math.round(clamp(g, 0, 255));
      pixels[idx+2] = Math.round(clamp(b, 0, 255));
      pixels[idx+3] = Math.round(clamp(a, 0, 255));
    }
  }

  return encodePNG(pixels, size, size);
}

// Tray icon: simple black circle (template image)
function createTrayIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2 - 0.5, cy = size / 2 - 0.5;
  const r = size / 2 - 1.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x-cx)**2+(y-cy)**2);
      const alpha = dist <= r ? 255 : dist <= r + 1 ? Math.round(255 * (r + 1 - dist)) : 0;
      const idx = (y * size + x) * 4;
      pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = alpha;
    }
  }
  return encodePNG(pixels, size, size);
}

const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), createTrayIcon(16));
fs.writeFileSync(path.join(assetsDir, 'tray-icon@2x.png'), createTrayIcon(32));
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createAppIcon(512));
fs.writeFileSync(path.join(assetsDir, 'icon@2x.png'), createAppIcon(1024));
console.log('Assets created (tray icons + app icon).');
