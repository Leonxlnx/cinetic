#!/usr/bin/env node
/**
 * pictures.test.mjs: the photo and footage treatments of the Remotion starter (src/fx/Pictures.tsx) and the colour
 * washes (src/fx/Washes.tsx) against their house numbers. Pure state only; nothing renders.
 *
 *   1. appearState(): settle x1.16 -> 1 with a 6 px defocus over 24 f at 60 fps (12 at 30), pop 62 % -> 100 % in 2 f
 *      and never over, clip uncovered from the bottom while the photo settles x1.12 -> 1, rise 6 % of the card's height,
 *      flip edge-on to face; hidden before its cue, at rest after.
 *   2. cardFinish(), tiltTransform(), cardBlurCopies(): radius 8.5 % of the short side, two shadows (none at 0), a
 *      perspective scaled with the frame, a defocus as at most two fixed levels with the smear added along the travel.
 *   3. arcPath(), pathAt(), mirrorPath(): the curve passes through its points, a straight path has angle 0 and its
 *      chord as length, the mirror turns half round the frame's centre.
 *   4. arcRiverState(): cards evenly spaced along the curve (the spacing follows the curve, so they part on the
 *      straight and close on the bend), the conveyor's travel, the same travel at 30 and 60 fps, sharp near the focus
 *      and soft far from it, the smear from the speed, neighbours never the same photo, the lower card on top.
 *   4b. the level river (ArcRiver's default): one y, one card size, one way, slowing until it lands and holds.
 *   5. wallLayout(): columns that never overlap, heights from the photos' shapes (held to 0.66-1.5), a depth and lag
 *      per tile. pictureTrack(): look-audit --imagery-track rows with the box and the next box.
 *   6. washStops(), washField(): a rise is paper to 32 % then gathers the tint at the bottom edge; the radial kinds
 *      put the tint at the centre; modes and angles.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/pictures.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SRC = join(STARTER, 'src');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/pictures.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}
const url = (p) => pathToFileURL(join(SRC, p)).href;
const PROBE = `
import * as P from '${url('fx/Pictures.tsx')}';
import * as W from '${url('fx/Washes.tsx')}';
import * as Cv from '${url('fx/Conveyor.tsx')}';
const film60 = { fps: 60, width: 1920, height: 1080 };
const film30 = { fps: 30, width: 1920, height: 1080 };
const half = { fps: 60, width: 960, height: 540 };
const ap = (f, a, film = film60, h = 400) => P.appearState(f, a, film, h);
const river = { photos: Array.from({ length: 12 }, (_, i) => ({ src: 'p' + i, w: 1000, h: 1300 })), start: 0, points: P.ARC_PATHS.rise, seed: 2 };
const st60 = P.arcRiverState(90, river, film60);
const st30 = P.arcRiverState(45, river, film30);
const straight = P.arcPath([[0, 0], [100, 0], [200, 0]]);
const curve = P.arcPath(P.ARC_PATHS.rise);
const near = (pt) => Math.min(...curve.pts.map((q) => Math.hypot(q[0] - pt[0], q[1] - pt[1])));
const tiles = P.wallLayout(river.photos.map((p, i) => ({ ...p, w: 1000, h: i % 2 ? 2000 : 500 })), { cols: 4, gap: 28, x: 120, width: 1680 });
console.log(JSON.stringify({
  settle: [ap(-1, { at: 0 }), ap(0, { at: 0 }), ap(12, { at: 0 }), ap(24, { at: 0 }), ap(12, { at: 0 }, film30)],
  pop: [0, 1, 2, 3].map((f) => ap(f, { at: 0, kind: 'pop' }).scale),
  pop30: [0, 1].map((f) => ap(f, { at: 0, kind: 'pop' }, film30).scale),
  clip: [ap(-1, { at: 0, kind: 'clip' }), ap(0, { at: 0, kind: 'clip' }), ap(26, { at: 0, kind: 'clip' })],
  rise: [ap(0, { at: 0, kind: 'rise' }), ap(30, { at: 0, kind: 'rise' })],
  flip: [ap(0, { at: 0, kind: 'flip' }).rotY, ap(22, { at: 0, kind: 'flip' }).rotY],
  none: P.appearState(5, undefined, film60),
  fin: P.cardFinish(300, 400, film60),
  finHalf: P.cardFinish(150, 200, half),
  noShadow: P.cardFinish(300, 400, film60, { shadow: 0 }).shadow,
  tilt: [P.tiltTransform({ rx: 20 }, film60), P.tiltTransform({ rx: 20 }, half), P.tiltTransform(undefined, film60)],
  blur: [P.cardBlurCopies(0, 0), P.cardBlurCopies(0, 10), P.cardBlurCopies(5, 0), P.cardBlurCopies(5, 3)],
  straight: { length: straight.length, mid: P.pathAt(straight, 50), end: P.pathAt(straight, 999) },
  through: P.ARC_PATHS.rise.slice(1, -1).map(near),
  mirror: P.mirrorPath([[100, 200]]),
  river60: { n: st60.cards.length, length: st60.length, s: st60.s, v: st60.v, cards: st60.cards },
  river30: { s: st30.s, v: st30.v },
  conveyor: Cv.conveyorTravel(90, { start: 0, n: 1, pitch: 1 }, film60),
  photoFor: [P.photoFor(0, 12), P.photoFor(1, 12), P.photoFor(2, 12), P.photoFor(0, 7), P.photoFor(1, 7), P.photoFor(3, 1)],
  tiles,
  track: P.pictureTrack(0, 12, (f) => [[f, 0, 100, 50]], 6),
  washRise: W.washStops('rise', '#ffffff', '#8899fe'),
  level: [0, 30, 60, 96, 140].map((f) => { const r = P.arcRiverState(f, { ...river, level: true }, film60); return { s: r.s, v: r.v, ys: [...new Set(r.cards.map((c) => Math.round(c.y * 100) / 100))], hs: [...new Set(r.cards.map((c) => Math.round(c.h)))] }; }),
  focused: (() => { const c = st60.cards[0]; return P.arcRiverState(90, { ...river, focus: [c.x, c.y] }, film60).cards[0].sigma; })(),
  halo: W.washStops('halo', '#0d0e10', '#22303a'),
  fields: [W.washField('rise', { tint: '#8899fe' }), W.washField('corner', { tint: '#8899fe' }), W.washField('sky', { tint: '#8899fe', deep: '#2e5264' }), W.washField('side', { tint: '#8899fe', drift: 0.02 })],
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-pictures-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const X = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1. appear
{
  const [before, at, mid, end, mid30] = X.settle;
  result(before.opacity === 0 && !before.done && close(at.scale, 1.16) && close(at.blur, 6) && end.done && close(end.scale, 1) && close(end.blur, 0) && mid.scale < 1.16 && mid.scale > 1, 'settle: hidden before its cue, x1.16 with a 6 px defocus on it, at rest by 24 f', JSON.stringify([at.scale, mid.scale, end.scale]));
  result(close(mid30.scale, X.settle[3].scale) || mid30.done, 'settle: 12 f at 30 fps is the end of the same 24 f at 60', JSON.stringify(mid30));
  result(JSON.stringify(X.pop.map((v) => +v.toFixed(3))) === JSON.stringify([0.62, 0.81, 1, 1]), 'pop: 62 % to full in 2 f at 60 fps, never over', JSON.stringify(X.pop));
  result(close(X.pop30[0], 0.62) && close(X.pop30[1], 1), 'pop: one frame at 30 fps', JSON.stringify(X.pop30));
  const [cb, c0, c1] = X.clip;
  result(cb.clip === 1 && c0.clip === 1 && close(c0.inner, 1.12) && c1.clip === 0 && close(c1.inner, 1) && c1.done, 'clip: covered before and at its cue, the photo x1.12 settling to 1 as it is uncovered (26 f)');
  result(close(X.rise[0].dy, 24) && close(X.rise[0].blur, 6) && X.rise[1].dy === 0 && X.rise[1].done, 'rise: 6 % of a 400 px card and a 6 px defocus, home by 30 f', JSON.stringify(X.rise[0]));
  result(X.flip[0] === 90 && X.flip[1] === 0, 'flip: edge-on (90 deg) to face over 22 f');
  result(X.none.done && X.none.opacity === 1 && X.none.scale === 1, 'no appear: the card is at rest');
}
// 2. card finish, tilt, blur copies
{
  const f = X.fin;
  result(close(f.radius, 0.085 * 300) && /rgba\(0,0,0,0\.140\)/.test(f.shadow) && /rgba\(0,0,0,0\.160\)/.test(f.shadow) && f.rim === 1, 'card: radius 8.5 % of the short side, a contact and a lift shadow, a 1 px rim', f.shadow);
  result(close(X.finHalf.radius, 0.085 * 150) && X.finHalf.rim === 1 && X.noShadow === 'none', 'card: the finish scales with the frame (a 1 px rim never thinner); shadow 0 is none');
  result(/^perspective\(1800\.0px\) rotateX\(20\.000deg\)/.test(X.tilt[0]) && /^perspective\(900\.0px\)/.test(X.tilt[1]) && X.tilt[2] === '', 'tilt: perspective 1800 px at 1080p (900 at half size), none without a tilt', X.tilt[0]);
  const [b0, bs, bd, bds] = X.blur;
  result(b0.length === 1 && b0[0].along === 0 && bs.length === 1 && bs[0].along === 10 && bs[0].across === 0, 'blur copies: none; a smear of 10 px along the travel only');
  result(bd.length === 2 && bd[0].level === 4 && bd[1].level === 6 && close(bd[0].weight + bd[1].weight, 1) && close(bds[0].along, Math.hypot(3, 4)) && bds[0].across === 4, 'blur copies: a 5 px defocus as levels 4 and 6 cross-faded; a smear adds along the travel', JSON.stringify(bds));
}
// 3. paths
{
  result(close(X.straight.length, 200, 1e-6) && close(X.straight.mid.x, 50, 1e-6) && close(X.straight.mid.angle, 0) && close(X.straight.end.x, 200), 'arcPath: a straight path is its chord, angle 0, clamped at its end', JSON.stringify(X.straight));
  result(X.through.every((d) => d < 4), 'arcPath: the curve passes through its points (within 4 px)', JSON.stringify(X.through.map((d) => +d.toFixed(2))));
  result(X.mirror[0][0] === 1820 && X.mirror[0][1] === 880, 'mirrorPath: half a turn round the frame\'s centre');
}
// 4. the river
{
  const R = X.river60;
  const pitch = R.length / R.n;
  const sorted = R.cards.map((c) => c.along).sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((a, i) => a - sorted[i]);
  result(R.n >= 6 && gaps.every((g) => g > pitch - 2 * 30 - 1 && g < pitch + 2 * 30 + 1), 'river: cards evenly spaced along the curve (pitch +- the along jitter)', `n ${R.n}, pitch ${pitch.toFixed(1)}, gaps ${gaps.map((g) => g.toFixed(0)).join(',')}`);
  result(close(R.s, X.conveyor.s, 1e-6) && close(R.v, X.conveyor.v, 1e-6), 'river: the travel is the conveyor\'s (65 in, 18 cruise px per 60 fps frame)', `${R.s.toFixed(1)} px, ${R.v.toFixed(2)} px/f`);
  result(close(X.river30.s, R.s, 1e-6) && close(X.river30.v * 0.5, R.v, 1e-6), 'river: the same travel at 30 fps (frame 45) as at 60 (frame 90), twice the step per frame', `${X.river30.s} vs ${R.s}`);
  const sharp = R.cards.filter((c) => Math.hypot(c.x - 960, c.y - 540) < 0.3 * Math.hypot(960, 540));
  const soft = R.cards.filter((c) => Math.hypot(c.x - 960, c.y - 540) > 0.95 * Math.hypot(960, 540));
  result(X.focused === 0 && sharp.every((c) => c.sigma === 0) && soft.every((c) => close(c.sigma, 9)) && R.cards.some((c) => c.sigma > 0 && c.sigma < 9), 'river: sharp near the focus, 9 px far from it, a smooth ramp between', `${sharp.length} sharp, ${soft.length} soft`);
  result(R.cards.every((c) => close(c.smear, (R.v * 300) / 360 / Math.sqrt(12), 1e-9)), 'river: the smear from the speed at a 300-degree shutter');
  result(R.cards.every((c) => c.z === Math.round(c.y)) && R.cards.every((c) => c.w >= 280 * 0.85 - 1e-9 && c.w <= 280 * 1.18 + 1e-9), 'river: the lower card on top; sizes x0.85-1.18 of 280 px');
  const [a, b, c, d, e, one] = X.photoFor;
  result(a !== b && b !== c && d !== e && one === 0, 'photoFor: neighbours never show the same photo (a step coprime with the set)');
}
// 4b. the level river (ArcRiver's default): one y, one card size, one way, slowing to rest and holding
{
  const L = X.level;
  result(L.every((x) => x.ys.length === 1 && x.hs.length === 1) && L.every((x, i) => i === 0 || x.s >= L[i - 1].s) && Math.abs(L[3].v) < 1e-9 && Math.abs(L[4].s - L[3].s) < 1e-6 && L[0].v > L[1].v,
    'level river: one y and one card size, travels one way, slows and lands at rest (then holds)', JSON.stringify(L.map((x) => [Math.round(x.s), Math.round(x.v * 100) / 100, x.ys.length])));
}

// 5. wall, imagery track
{
  const T = X.tiles;
  const cols = [...new Set(T.map((t) => t.x))].sort((p, q) => p - q);
  const w = T[0].w;
  result(cols.length === 4 && cols.every((x, i) => i === 0 || close(x - cols[i - 1], w + 28, 1e-6)), 'wallLayout: four columns a gap apart', JSON.stringify(cols));
  const byCol = cols.map((x) => T.filter((t) => t.x === x).sort((p, q) => p.y - q.y));
  result(byCol.every((col) => col.every((t, i) => i === 0 || t.y >= col[i - 1].y + col[i - 1].h + 28 - 1e-6)), 'wallLayout: tiles in a column never overlap');
  result(T.every((t) => t.h / t.w >= 0.66 - 1e-9 && t.h / t.w <= 1.5 + 1e-9) && T.some((t) => close(t.h / t.w, 1.5)) && T.some((t) => close(t.h / t.w, 0.66)), 'wallLayout: heights from the photos\' shapes, held to 0.66-1.5');
  result(T.every((t) => t.depth >= 0.8 && t.depth <= 1.25 && t.lag >= 0 && t.lag <= 2), 'wallLayout: a depth (0.8-1.25) and a lag per tile');
  result(X.track.length === 2 && X.track[0].from === 0 && X.track[0].to === 6 && X.track[0].box[0] === 0 && X.track[0].toBox[0] === 6 && X.track[1].to === 12, 'pictureTrack: rows of [from, to] with the box and the next box', JSON.stringify(X.track));
}
// 6. washes
{
  const S = X.washRise;
  result(S[0].at === 0 && S[0].color === '#ffffff' && close(S[1].at, 0.32) && S[S.length - 1].at === 1 && /rgb\(136, 153, 254\)/.test(S[S.length - 1].color), 'rise: paper to 32 % of the height, the tint at the bottom edge', JSON.stringify([S[1], S[S.length - 1]]));
  result(/rgb\(34, 48, 58\)/.test(X.halo[0].color) && /rgb\(13, 14, 16\)/.test(X.halo[X.halo.length - 1].color), 'halo: the tint at the centre falling to the ground');
  const [rise, corner, sky, side] = X.fields;
  result(rise.mode === 'linear' && rise.angle === 90 && corner.mode === 'radial' && corner.centre[0] === 1 && sky.angle === 90 && side.angle === 0 && side.drift === 0.02 && rise.drift === undefined, 'washField: linear and radial modes, angles, drift only when asked');
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
