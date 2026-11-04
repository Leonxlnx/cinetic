#!/usr/bin/env node
/**
 * logo-kit.test.mjs: the kit's logo parts (src/kit/logos.tsx) and the stills that show them.
 *
 *   1. The file for a ground: a mark that paints dark neutrals is never set dark on dark (its dark-ground version,
 *      else its white one-colour file); one-colour files by ground; unknown names fall back.
 *   2. Optical size: the same area as a square mark, held inside the box's limits.
 *   3. The inline swap: a new mark every `every` frames, the roll over 6 f at 60 fps (3 at 30), held or looped.
 *   4. Walls and rings: the marks take the slots nearest the centre on the near bands, none in the clear box, one
 *      arrival order out from the centre; tumbles of 20-60 degrees that land flat; the ring's far side is far; marks
 *      stay sharp on the near half (depth softening only behind it); the squircle is a closed path inside its box.
 *   5. With --render: the KitLogos and KitLogoWall stills of the starter rendered at half size with made-up marks
 *      (logos-fixtures/, cleaned by logos.mjs): each mark's colour is on the paper and on the ink, the brand's own
 *      tile keeps its colour, the white tiles hold on the ink, the wall shows its marks.
 *
 * It runs src through the starter's own tsx and, with --render, its Remotion CLI (npm install in
 * assets/remotion-starter first; --render opens a headless Chrome for two stills).
 * Usage (from the skill root):  node scripts/test/logo-kit.test.mjs [--render] [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..', '..');
const FIX = path.join(HERE, 'logos-fixtures');
const STARTER = path.join(SKILL, 'assets', 'remotion-starter');
const SRC = path.join(STARTER, 'src');
const TSX = path.join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const CLI = path.join(STARTER, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const verbose = process.argv.includes('--verbose');
const render = process.argv.includes('--render');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/logo-kit.test.mjs [--render] [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!fs.existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const url = (p) => pathToFileURL(path.join(SRC, p)).href;
const PROBE = `
import * as K from '${url('kit/logos.tsx')}';
const f = (src: string, aspect = 1) => ({ src, aspect });
const TIDE = { name: 'Tidepool', tone: 'colour', tile: 'none', files: { mark: f('logos/tidepool.svg', 1.5), mono: f('logos/tidepool.mono.svg', 1.5), white: f('logos/tidepool.white.svg', 1.5), black: f('logos/tidepool.black.svg', 1.5) } } as const;
const INK = { name: 'Inkwell', tone: 'dark', tile: 'none', files: { mark: f('logos/inkwell.svg'), markDark: f('logos/inkwell.dark.svg'), white: f('logos/inkwell.white.svg') } } as const;
const BARE = { name: 'Bare', tone: 'dark', tile: 'none', files: { mark: f('logos/bare.svg'), white: f('logos/bare.white.svg') } } as const;
const src = (x: { src: string } | null) => (x ? x.src : null);
const inline: Record<string, unknown> = {};
for (const fps of [60, 30]) {
  const at = (fr: number) => K.inlineLogoState(fr, 3, { start: 100, every: 30, swap: 6, fps });
  const e = 30 * fps / 60;
  inline[fps] = { before: at(99), first: at(100), swapStart: at(100 + e), mid: at(100 + e + (3 * fps / 60)), settled: at(100 + e + (6 * fps / 60)), held: at(100 + 10 * e),
    looped: K.inlineLogoState(100 + 4 * e, 3, { start: 100, every: 30, swap: 6, fps, loop: true }) };
}
const wall = K.wallSlots(14, { cols: 9, rows: 5, cell: 200, w: 1920, h: 1080, seed: 't', clear: { w: 600, h: 240 } });
const ring = K.ringSlots(12, { rx: 640, ry: 330, w: 1920, h: 1080 });
const tilt = wall[0].tilt;
const arr = (fr: number) => K.tileArrival(fr, 50, { dur: 28, tilt, fps: 60 });
console.log(JSON.stringify({
  files: {
    tideDark: src(K.logoFile(TIDE as any, 'mark', 'dark')), inkDark: src(K.logoFile(INK as any, 'mark', 'dark')), bareDark: src(K.logoFile(BARE as any, 'mark', 'dark')),
    inkLight: src(K.logoFile(INK as any, 'mark', 'light')), monoDark: src(K.logoFile(TIDE as any, 'mark', 'dark', true)), monoLight: src(K.logoFile(TIDE as any, 'mark', 'light', true)),
    wordFallback: src(K.logoFile(TIDE as any, 'wordmark', 'light')),
  },
  unknown: { has: K.hasLogo('no-such-mark'), of: K.logoOf('no-such-mark'), name: K.logoName('no-such-mark'), entry: K.hasLogo(TIDE as any) },
  optical: [K.opticalSize(1, 100), K.opticalSize(4, 100), K.opticalSize(0.4, 100), K.opticalSize(1.5, 100)],
  inline, wall, ring, tilt,
  arrival: { before: arr(49), start: arr(50), end: arr(50 + 28), after: arr(200) },
  blur: [K.depthBlur(0), K.depthBlur(0.42), K.depthBlur(0.5), K.depthBlur(0.85), K.depthBlur(1)],
  squircle: K.squirclePath(100), DEPTH: K.DEPTH,
}));
`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logokit-'));
try {
  const probeFile = path.join(TMP, 'probe.tsx');
  fs.writeFileSync(probeFile, PROBE);
  const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
    process.exit(1);
  }
  const P = JSON.parse(r.stdout.trim().split('\n').pop());

  // 1. files for a ground
  const F = P.files;
  result(F.tideDark === 'logos/tidepool.svg' && F.inkDark === 'logos/inkwell.dark.svg' && F.bareDark === 'logos/bare.white.svg' && F.inkLight === 'logos/inkwell.svg',
    'logoFile: a colour mark as it is on dark; a dark mark\'s dark-ground version, else its white file', JSON.stringify(F));
  result(F.monoDark === 'logos/tidepool.white.svg' && F.monoLight === 'logos/tidepool.black.svg' && F.wordFallback === null, 'logoFile: one colour by ground; no wordmark is null (BrandLogo falls back to the mark)');
  result(P.unknown.has === false && P.unknown.of === null && P.unknown.name === 'no-such-mark' && P.unknown.entry === true, 'an unfetched name is no mark (the parts fall back to the text pill or a glyph tile)');

  // 2. optical size
  const [sq, wide, tall, gm] = P.optical;
  const area = (o) => o.w * o.h;
  result(Math.abs(sq.w - 100) < 1e-6 && Math.abs(area(gm) - 10000) < 1 && wide.w <= 130.0001 && tall.h <= 112.0001 && Math.abs(wide.w / wide.h - 4) < 1e-6,
    'opticalSize: a square mark fills the box, a 1.5:1 one keeps the area, wide and tall ones held inside the box\'s limits', JSON.stringify(P.optical.map((o) => [o.w.toFixed(1), o.h.toFixed(1)])));

  // 3. the inline swap
  for (const fps of ['60', '30']) {
    const s = P.inline[fps];
    const ok = s.before.i === 0 && s.first.i === 0 && s.first.k === 1 && s.swapStart.i === 1 && s.swapStart.prev === 0 && s.swapStart.k === 0
      && Math.abs(s.mid.k - 0.5) < 1e-9 && s.settled.k === 1 && s.held.i === 2 && s.held.k === 1 && s.looped.i === 1;
    result(ok, `inlineLogoState at ${fps} fps: a mark every 30 f (60 fps frames), the roll over 6 f, the last one held, or looped`, JSON.stringify(s));
  }

  // 4. walls and rings
  const W = P.wall;
  const marks = W.filter((s) => s.logo !== null);
  const inClear = W.some((s) => Math.abs(s.x - 960) < 300 && Math.abs(s.y - 540) < 120);
  const orders = W.map((s) => s.order).sort((a, b) => a - b);
  result(marks.length === 14 && marks.every((s) => s.depth <= P.DEPTH.bands[1]) && !inClear && orders.every((o, i) => o === i),
    'wallSlots: 14 marks on the near bands, nothing in the clear box, one arrival order', `${marks.length} marks of ${W.length}`);
  const d = (s) => Math.hypot((s.x - 960) / 1920, (s.y - 540) / 1080);
  const firstFive = W.filter((s) => s.order < 5).map(d), lastFive = W.filter((s) => s.order >= W.length - 5).map(d);
  result(Math.max(...firstFive) < Math.min(...lastFive), 'wallSlots: the arrivals run out from the centre');
  const tilts = W.flatMap((s) => s.tilt.map(Math.abs));
  result(tilts.every((a) => a >= 20 && a <= 60) && W.some((s) => s.tilt[0] < 0) && W.some((s) => s.tilt[0] > 0), 'tumbles: 20-60 degrees about x and y, either way');
  const A = P.arrival;
  result(A.before.opacity === 0 && A.start.rx === P.tilt[0] && A.start.z < 0 && A.end.p === 1 && A.end.rx === 0 && A.end.z === 0 && A.after.y === 0,
    'tileArrival: invisible before its frame, from its tumble and pushed back, flat and home when it lands', JSON.stringify(A.start));
  const R = P.ring;
  result(R[0].depth > 0.99 && R[6].depth < 0.01 && R.length === 12, 'ringSlots: the top of the ring is far, the bottom near', `${R[0].depth} ${R[6].depth}`);
  const [b0, b42, b5, b85, b1] = P.blur;
  result(b0 === 0 && b42 === 0 && b5 === 0 && b85 > 3 && b1 === P.DEPTH.blur[1], 'depthBlur: every mark on the near half sharp; softening behind it, at most DEPTH.blur', P.blur.join(', '));
  const nums = P.squircle.match(/-?[\d.]+/g).map(Number);
  result(P.squircle.startsWith('M') && P.squircle.endsWith('Z') && Math.min(...nums) >= 0 && Math.max(...nums) <= 100, 'squirclePath: a closed path inside its box');

  // 5. the stills
  if (!render) console.log('skip  the stills (pass --render: two half-size stills in a headless Chrome)');
  else if (!fs.existsSync(CLI)) result(false, 'the starter has no Remotion CLI (npm install in assets/remotion-starter)');
  else {
    const L = await import(pathToFileURL(path.join(SKILL, 'scripts', 'logos.mjs')).href);
    const pub = path.join(TMP, 'public', 'logos');
    fs.mkdirSync(pub, { recursive: true });
    const entry = (slug, file, extra = {}) => {
      const p = L.prepare(fs.readFileSync(path.join(FIX, file), 'utf8'));
      fs.writeFileSync(path.join(pub, `${slug}.svg`), p.svg);
      const files = { mark: { src: `logos/${slug}.svg`, aspect: p.aspect } };
      if (L.toneOf(p.svg) === 'dark') { fs.writeFileSync(path.join(pub, `${slug}.dark.svg`), L.reverseNeutrals(p.svg)); files.markDark = { src: `logos/${slug}.dark.svg`, aspect: p.aspect }; }
      return { name: slug, tone: L.toneOf(p.svg), tile: p.tile ? 'own' : 'none', files, ...extra };
    };
    const logos = [entry('tidepool', 'tidepool-icon.svg'), entry('inkwell', 'inkwell.svg'), entry('squarecap', 'squarecap-icon.svg'), entry('sharecrop', 'svgl-sharecrop.svg'), entry('tidepool-studio', 'tidepool-studio.svg')];
    const still = (id, props, out) => {
      const pf = path.join(TMP, `${id}.json`);
      fs.writeFileSync(pf, JSON.stringify(props));
      const rr = spawnSync(process.execPath, [CLI, 'still', 'src/index.ts', id, out, `--props=${pf}`, `--public-dir=${path.join(TMP, 'public')}`, '--scale=0.5', '--log=error'],
        { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024, timeout: 300000 });
      if (rr.status !== 0 && verbose) console.log((rr.stderr || rr.stdout).slice(0, 800));
      return rr.status === 0 && fs.existsSync(out) ? decodePng(fs.readFileSync(out)) : null;
    };
    const sheet = still('KitLogos', { logos }, path.join(TMP, 'sheet.png'));
    result(!!sheet && sheet.w === 960 && sheet.h === 540, 'KitLogos renders at half size', sheet ? `${sheet.w}x${sheet.h}` : 'no image');
    if (sheet) {
      const top = { y0: 0, y1: 270 }, bottom = { y0: 270, y1: 540 };
      const blue = [0x1a, 0x73, 0xe8], red = [0xe5, 0x48, 0x4d], green = [0x00, 0xaa, 0x55];
      for (const [name, c] of [['the mark\'s blue', blue], ['the own tile\'s red', red], ['the triangle\'s green', green]]) {
        result(count(sheet, c, top) > 40 && count(sheet, c, bottom) > 40, `KitLogos: ${name} on the paper and on the ink, unaltered`, `${count(sheet, c, top)} / ${count(sheet, c, bottom)} px`);
      }
      result(count(sheet, [255, 255, 255], bottom, 6) > 2000, 'KitLogos: the white tiles hold on the ink', `${count(sheet, [255, 255, 255], bottom, 6)} px`);
    }
    const wall = still('KitLogoWall', { logos: [...logos, ...logos, ...logos].slice(0, 14), frame: 200, ground: 'light' }, path.join(TMP, 'wall.png'));
    result(!!wall && count(wall, [0x1a, 0x73, 0xe8], { y0: 0, y1: 540 }) > 100 && count(wall, [0xe5, 0x48, 0x4d], { y0: 0, y1: 540 }) > 100, 'KitLogoWall: the marks on the settled wall', wall ? `${count(wall, [0x1a, 0x73, 0xe8], { y0: 0, y1: 540 })} blue px` : 'no image');
  }
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

/** Pixels within `tol` (per channel) of colour c in rows y0..y1. */
function count(img, c, { y0, y1 }, tol = 14) {
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4;
    if (Math.abs(img.px[i] - c[0]) <= tol && Math.abs(img.px[i + 1] - c[1]) <= tol && Math.abs(img.px[i + 2] - c[2]) <= tol) n++;
  }
  return n;
}
/** A PNG (8-bit RGB or RGBA, not interlaced) to { w, h, px: RGBA bytes }. */
function decodePng(buf) {
  let p = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12] !== 0) return null; }
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    p += 12 + len;
  }
  const ch = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!ch) return null;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(w * h * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      cur[x] = (cur[x] + (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0)) & 255;
    }
    for (let x = 0; x < w; x++) { for (let k = 0; k < 3; k++) out[(y * w + x) * 4 + k] = cur[x * ch + k]; out[(y * w + x) * 4 + 3] = ch === 4 ? cur[x * ch + 3] : 255; }
    cur.copy(prev);
  }
  return { w, h, px: out };
}

process.exit(failed ? 1 : 0);
