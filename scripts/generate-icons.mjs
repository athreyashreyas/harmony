// Generates Harmony's PWA icons and notification badge.
//
// Home-screen tiles (icon-192/512/1024): the watercolour flower lifted off its
// cream tile and set on Harmony's espresso ground (#241D17, from tokens.css) —
// a solid brand field (a la Hisaab) that lets every petal separate, while the
// multi-colour flower, which can't be a single light knockout, is preserved.
// The cream ground is removed with a
// border-connected flood-fill so the enclosed centre "h" disc survives. Needs
// `sharp` resolvable (e.g. `pnpm add -Dw sharp`); reads the untouched master at
// scripts/flower-master-1024.png.
//
// Badge (badge.png): a white "h" on transparent, drawn from a signed-distance
// field and encoded with only Node's zlib (zero deps), for Android
// notifications. Run with `node scripts/generate-icons.mjs`.

import sharp from 'sharp';
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'apps', 'web', 'public', 'icons');
const MASTER = join(HERE, 'flower-master-1024.png');

const ESPRESSO = [36, 29, 23]; // #241D17 — Harmony's dark ground, the tile field
const WHITE = [255, 255, 255]; // the notification badge mark

mkdirSync(OUT_DIR, { recursive: true });

// ---- Home-screen tiles: flower on terracotta -------------------------------

// Read the master flower (opaque, on a white/cream tile) as raw RGBA.
const { data, info } = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const ch = info.channels;

// A pixel is "background" if it is light and unsaturated — this catches both the
// white rounded corners and the cream field, but not the saturated petals.
const isBgCandidate = (i) => {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  return mn > 196 && mx - mn < 38;
};

// Flood-fill inward from the border. The centre "h" disc is cream too, but it is
// enclosed by petals and never reached, so it stays.
const bg = new Uint8Array(W * H);
const stack = [];
const pushIf = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const p = y * W + x;
  if (bg[p] || !isBgCandidate(p * ch)) return;
  bg[p] = 1;
  stack.push(p);
};
for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1); }
for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y); }
while (stack.length) {
  const p = stack.pop();
  const x = p % W, y = (p / W) | 0;
  pushIf(x - 1, y); pushIf(x + 1, y); pushIf(x, y - 1); pushIf(x, y + 1);
}

// Flower on transparent ground, then flattened onto the terracotta field.
const flower = Buffer.from(data);
for (let p = 0; p < W * H; p++) flower[p * ch + 3] = bg[p] ? 0 : 255;
const flowerPng = await sharp(flower, { raw: { width: W, height: H, channels: 4 } })
  .blur(0.6) // soften the cut edge a hair before downscaling
  .png()
  .toBuffer();

for (const size of [192, 512, 1024]) {
  await sharp(flowerPng)
    .flatten({ background: { r: ESPRESSO[0], g: ESPRESSO[1], b: ESPRESSO[2] } })
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toFile(join(OUT_DIR, `icon-${size}.png`));
}
console.log('Tiles written to', OUT_DIR);

// ---- Notification badge: white "h", zero-dependency --------------------------

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
  let shoulder = Infinity;
  if (py <= 0.5) {
    shoulder = Math.abs(Math.hypot(px - 0.5, py - 0.5) - 0.1) - stroke;
  }
  return Math.min(leftStem, rightStem, shoulder);
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

function renderBadge(size, fg) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = sdH((x + 0.5) / size, (y + 0.5) / size);
      const coverage = Math.max(0, Math.min(1, 0.5 - d * size));
      const i = (y * size + x) * 4;
      rgba[i] = fg[0];
      rgba[i + 1] = fg[1];
      rgba[i + 2] = fg[2];
      rgba[i + 3] = Math.round(coverage * 255);
    }
  }
  return encodePng(size, rgba);
}

writeFileSync(join(OUT_DIR, 'badge.png'), renderBadge(96, WHITE));
console.log('Badge written to', OUT_DIR);
