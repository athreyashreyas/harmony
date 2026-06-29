// Generates the PWA icons with zero dependencies: a soft iris "h" mark on
// parchment, rendered from signed-distance fields with one-pass anti-aliasing,
// encoded to PNG using only Node's built-in zlib. Run with `node
// scripts/generate-icons.mjs`. The mark stays within the central 30% so it
// survives maskable cropping (section 18).

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'icons');

// Warm paper (parchment-100) and terracotta primary, matching the app theme.
const PARCHMENT = [251, 241, 228];
const IRIS = [181, 83, 47];
const WHITE = [255, 255, 255];

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy);
}

// Distance to the lowercase "h": a tall left stem, a top shoulder arc, and a
// shorter right stem. All in unit [0,1] space, y pointing down.
function sdH(px, py) {
  const stroke = 0.05;
  const leftStem = sdSegment(px, py, 0.4, 0.27, 0.4, 0.73) - stroke;
  const rightStem = sdSegment(px, py, 0.6, 0.5, 0.6, 0.73) - stroke;
  // Top half of a ring centred at (0.5, 0.5) joins the two stems.
  let shoulder = Infinity;
  if (py <= 0.5) {
    shoulder = Math.abs(Math.hypot(px - 0.5, py - 0.5) - 0.1) - stroke;
  }
  return Math.min(leftStem, rightStem, shoulder);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// fg/bg are [r,g,b]; when transparent is true the background is clear and the
// foreground fades in over alpha (for the Android badge).
function renderIcon(size, fg, bg, transparent) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const d = sdH(u, v);
      const coverage = Math.max(0, Math.min(1, 0.5 - d * size));
      const i = (y * size + x) * 4;
      if (transparent) {
        rgba[i] = fg[0];
        rgba[i + 1] = fg[1];
        rgba[i + 2] = fg[2];
        rgba[i + 3] = Math.round(coverage * 255);
      } else {
        rgba[i] = lerp(bg[0], fg[0], coverage);
        rgba[i + 1] = lerp(bg[1], fg[1], coverage);
        rgba[i + 2] = lerp(bg[2], fg[2], coverage);
        rgba[i + 3] = 255;
      }
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512, 1024]) {
  writeFileSync(join(OUT_DIR, `icon-${size}.png`), renderIcon(size, IRIS, PARCHMENT, false));
}
writeFileSync(join(OUT_DIR, 'badge.png'), renderIcon(96, WHITE, PARCHMENT, true));
console.log('Icons written to', OUT_DIR);
