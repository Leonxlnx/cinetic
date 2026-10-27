#!/usr/bin/env node
/**
 * primitives.test.mjs: the measured-motion helpers and the UI primitives of the Remotion starter
 * against their house numbers.
 *
 *   1. lib/anim.ts curveOf(), track(), trackLinear(): a measured curve passes through its samples, a
 *      track through its keys, monotone between them (no overshoot), held outside them.
 *   2. fx/Defocus dirBlurMix(): sharp under 120 px/s, sigma = px/s x 0.0048 s on the defocus ladder, at most
 *      two copies, the same smear for the same px/s at 30 and 60 fps.
 *   3. fx/Cursor cursorRise(): 75 % of the travel in the first 8 f at 60 fps, home at the end; the hand shape exists.
 *   4. fx/Scroll flickFeed(): peaks at 5280 px/s at 30 and 60 fps alike and lands.
 *   5. fx/TypeOn eraseSchedule(): last character first, gaps that shrink to one frame, fps-scaled.
 *   6. fx/Stack stackState(): the newest rises into the front slot, older ones step back (smaller, softer), the
 *      stack re-centres by 92 px an item.
 *   7. fx/Reels maskListState(): hard one-row steps every 10 f, the mask's alphas, the selected row at 1.
 *   8. fx/Resize carry: no creep, front-loaded from the cut frame, home by 20 f.
 *   9. fx/Grids radiateState(): bornAt, per-ring speeds and the flood.
 *  10. lib/handoff counterCreep(), fx/Roll growthSteps() (house cadence, and `within`: a one-bar window).
 *  11. fx/DitherBands ditherBandsState(): the switched share follows E.stdInOut over 16 f at 60 fps (8 at 30),
 *      cells only ever switch on, the runs hold exactly the switched cells, declares() a stepped run and a seam.
 *  12. lib/camera camPath(), camVel(): moves add and chain without a hold, zoom in log space, the velocity of the
 *      framed point; fx/Defocus dirBlurMix shutter: 180 degrees at 30 fps = the house smear, 360 = twice it.
 *  13. lib/measure solveTracking(): the least-squares em tracking that matches measured widths.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/primitives.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/primitives.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as A from '${url('lib/anim.ts')}';
import * as D from '${url('fx/Defocus.tsx')}';
import * as Cu from '${url('fx/Cursor.tsx')}';
import * as Sc from '${url('fx/Scroll.tsx')}';
import * as Ty from '${url('fx/TypeOn.tsx')}';
import * as St from '${url('fx/Stack.tsx')}';
import * as Re from '${url('fx/Reels.tsx')}';
import * as Rz from '${url('fx/Resize.tsx')}';
import * as Gr from '${url('fx/Grids.tsx')}';
import * as Ho from '${url('lib/handoff.ts')}';
import * as Ro from '${url('fx/Roll.tsx')}';
import * as Db from '${url('fx/DitherBands.tsx')}';
import * as Cm from '${url('lib/camera.ts')}';
import * as Me from '${url('lib/measure.ts')}';
const camBase = { ax: 960, ay: 540, sx: 960, sy: 540, k: 1 };
const camMoves = [{ at: 0, frames: 20, zoom: 0.5, ease: A.E.glideOut }, { at: 15, frames: 20, pan: { x: -400 }, ease: A.E.launchIn }];
const panOnly = [{ at: 0, frames: 10, pan: { x: 100 }, ease: A.E.linear }];
const zoomOnly = [{ at: 0, frames: 20, zoom: 0.5, ease: A.E.linear }];
const film60 = { fps: 60, width: 1920, height: 1080 };
const film30 = { fps: 30, width: 1920, height: 1080 };
const box = (w: number, h: number) => ({ x: 0, y: 0, w, h });
const range = (a: number, b: number, s = 1) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);
const keys: [number, number][] = [[10, 0], [14, 300], [20, 380], [30, 400]];
const samples = [0, 0.5, 0.72, 0.84, 0.91, 0.95, 0.97, 0.985, 0.993, 0.998, 1];
const c = A.curveOf(samples);
console.log(JSON.stringify({
  curve: range(0, 10).map((i) => c(i / 10)),
  curveDense: range(0, 1, 0.01).map((t) => c(t)),
  track: range(0, 40, 0.25).map((f) => A.track(f, keys)),
  trackAt: keys.map(([f]) => A.track(f, keys)),
  lin: [A.trackLinear(12, keys), A.trackLinear(5, keys), A.trackLinear(35, keys)],
  rise: range(100, 140).map((f) => Cu.cursorRise(f, 100, { x: 500, y: 600 }, {}, film60)),
  feed: [Sc.flickFrames(Sc.flickFeed(0, film60), film60), Sc.flickFrames(Sc.flickFeed(0, film30), film30)],
  erase: [Ty.eraseSchedule(12, { start: 100 }, film60), Ty.eraseSchedule(12, { start: 100 }, film30)],
  stack: [St.stackState(101, { arrivals: [0, 40, 100] }, film60), St.stackState(140, { arrivals: [0, 40, 100] }, film60)],
  list: [Re.maskListState(99, { n: 12, pitch: 100, start: 100 }, film60), Re.maskListState(121, { n: 12, pitch: 100, start: 100 }, film60)],
  carry: range(100, 125).map((f) => Rz.resizeState(f, { at: 100, from: box(600, 420), to: box(600, 250), mode: 'carry' }, film60).box.h),
  radiate: [Gr.radiateState(100, { start: 100, births: [100, 110], bornAt: 54, speeds: [12] }, film60), Gr.radiateState(120, { start: 100, births: [100, 110], bornAt: 54, speeds: [12] }, film60), Gr.radiateState(122, { start: 100, births: [100], flood: { at: 100 } }, film60)],
  creep: Ho.counterCreep(160, 100, {}, 60),
  growth: Ro.growthSteps(0, 3412, {}, 60),
  growthBar: [Ro.growthSteps(100, 12840, { within: 100 }, 60), Ro.growthSteps(100, 12840, { within: 100 }, 30), Ro.growthSteps(100, 40, { within: 100 }, 60)],
  bands: range(38, 58).map((f) => { const s = Db.ditherBandsState(f, { at: 40 }, film60); return { f, share: s.share, count: s.count, n: s.cells, cols: s.cols, rows: s.rows, done: s.done, cellsInRuns: s.runs.reduce((a, r) => a + Math.round(r.w / s.cell), 0), want: A.E.stdInOut(Math.min(1, Math.max(0, (f - 40) / 16))) }; }),
  bands30: [Db.ditherBandsFrames({ at: 20 }, film30), Db.ditherBandsState(28, { at: 20 }, film30).done, Db.ditherBandsState(27, { at: 20 }, film30).done],
  bandsSubset: (() => { const o = Db.ditherOrder(192, 108, {}); const a = Db.ditherBandsState(44, { at: 40 }, film60).count; const b = Db.ditherBandsState(45, { at: 40 }, film60).count; let ok = a <= b; for (let i = 0; i < o.rank.length; i++) if (o.rank[i] < a && !(o.rank[i] < b)) ok = false; return { ok, unique: new Set(Array.from(o.rank)).size === o.rank.length }; })(),
  bandsDecl: Db.declares({ at: 40 }, film60),
  cam: { k: [0, 20, 40].map((f) => Cm.camPath(f, camBase, camMoves).k), sx: [0, 35, 60].map((f) => Cm.camPath(f, camBase, camMoves).sx),
    moving: range(1, 34).map((f) => { const v = Cm.camVel(f, camBase, camMoves); return v.speed + Math.abs(v.vk); }), still: Cm.camVel(36, camBase, camMoves),
    pan: Cm.camVel(5, camBase, panOnly), zoom: Cm.camVel(5, camBase, zoomOnly) },
  shutter: { house30: D.dirBlurMix(20, film30), s180: D.dirBlurMix(20, film30, { shutter: 180 }), s360: D.dirBlurMix(20, film30, { shutter: 360 }), h60: D.dirBlurMix(20, film60), s360at60: D.dirBlurMix(20, film60, { shutter: 360 }) },
  trackFit: Me.solveTracking([{ w0: 100, n: 5, size: 80, target: 124 }, { w0: 200, n: 6, size: 80, target: 228.8 }]),
  dir: { slow: D.dirBlurMix(1, { fps: 60 }), v10: D.dirBlurMix(-10, { fps: 60 }), v20at30: D.dirBlurMix(20, { fps: 30 }), fast: D.dirBlurMix(200, { fps: 60 }) },
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-primitives-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const monotone = (xs) => xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-9);

// 1. measured curves and tracks
{
  const samples = [0, 0.5, 0.72, 0.84, 0.91, 0.95, 0.97, 0.985, 0.993, 0.998, 1];
  result(P.curve.every((y, i) => close(y, samples[i], 1e-9)), 'curveOf: passes through every sample');
  result(monotone(P.curveDense) && P.curveDense.every((y) => y >= 0 && y <= 1), 'curveOf: monotone between samples, inside 0..1');
  result(P.trackAt.every((y, i) => close(y, [0, 300, 380, 400][i])), 'track: passes through every key');
  result(monotone(P.track) && Math.max(...P.track) <= 400 + 1e-9, 'track: monotone keys give a monotone track with no overshoot', `max ${Math.max(...P.track).toFixed(3)}`);
  result(P.track[0] === 0 && P.track[P.track.length - 1] === 400, 'track: holds the first and last value outside its keys');
  result(close(P.lin[0], 150) && P.lin[1] === 0 && P.lin[2] === 400, 'trackLinear: straight between keys, held outside');
}

// 2. directional smear
{
  const sig = (cs) => cs.reduce((a, c) => a + c.level * c.weight, 0);
  result(P.dir.slow.length === 1 && P.dir.slow[0].level === 0, 'dirBlurMix: a layer under 120 px/s stays sharp');
  result(Math.abs(sig(P.dir.v10) - 2.88) < 1e-6 && P.dir.v10.length <= 2, 'dirBlurMix: 600 px/s smears sigma 2.88 on two ladder levels (sign ignored)', JSON.stringify(P.dir.v10));
  result(JSON.stringify(P.dir.v10) === JSON.stringify(P.dir.v20at30), 'dirBlurMix: the same px/s smears the same at 30 and 60 fps');
  result(P.dir.fast.length === 1 && P.dir.fast[0].level === 32, 'dirBlurMix: past the ladder the top level alone', JSON.stringify(P.dir.fast));
}

// 3. cursor rise
{
  const ys = P.rise.map((p) => p.y);
  result(Math.abs((ys[0] - ys[8]) / 400 - 0.75) < 0.02 && Math.abs(ys[30] - 600) < 1e-6, 'cursorRise: 75 % of 400 px in the first 8 f, home at 30 f', `${((ys[0] - ys[8]) / 400).toFixed(3)}`);
  result(P.rise.every((p) => p.x === 500) && P.rise[0].opacity === 0 && P.rise[10].opacity === 1, 'cursorRise: straight up, fading in over 4 f');
}
// 4. feed flick
{
  const [a, b] = P.feed;
  result(Math.abs(a.peak * 60 - 5280) < 1 && Math.abs(b.peak * 30 - 5280) < 1, 'flickFeed: peaks at 5280 px/s at 60 and at 30 fps', `${(a.peak * 60).toFixed(1)} / ${(b.peak * 30).toFixed(1)}`);
  result(a.end > a.peakLast && a.distance > 0, 'flickFeed: brakes and lands after its peak');
}
// 5. erase
{
  const [e60, e30] = P.erase;
  result(e60[11] < e60[10] && e60.every((f, i) => i === 0 || f <= e60[i - 1]), 'eraseSchedule: the last character goes first, then backwards', e60.join(','));
  const gaps = e60.slice().reverse().map((f, i, a) => (i ? f - a[i - 1] : f - 100));
  result(gaps[0] === 4 && gaps[1] === 6 && gaps.slice(-4).every((g) => g === 1), 'eraseSchedule: 4 f to the first key, a 6 f repeat delay, then a key a frame', gaps.join(','));
  result(Math.abs(e30[0] - 100 - (e60[0] - 100) / 2) <= 1, 'eraseSchedule: the same time at 30 fps', `${e30[0]} vs ${e60[0]}`);
}
// 6. stack
{
  const [s1, s2] = P.stack;
  const front = s2.items[s2.items.length - 1];
  const back = s2.items.find((it) => it.i === 0);
  result(front.i === 2 && Math.abs(front.slot) < 1e-9 && Math.abs(front.y) < 1e-6 && Math.abs(front.scale - 1) < 1e-9, 'stack: the newest lands in the front slot at full size');
  result(back && Math.abs(back.slot - 2) < 1e-9 && Math.abs(back.scale - (1 - 2 * 0.045)) < 1e-9 && Math.abs(back.sigma - 4.8) < 1e-9 && Math.abs(back.y - 374) < 1e-6, 'stack: two arrivals later an item sits two slots back (0.91 scale, 4.8 px soft, 374 px down)');
  const arriving = s1.items.find((it) => it.i === 2);
  result(arriving && arriving.y > 0 && arriving.y < 144 && s1.items[s1.items.length - 1].i === 2, 'stack: the newest rises from below and draws in front');
  result(Math.abs(s2.shift - 2 * 92) < 1e-6, 'stack: re-centres by 92 px an item', s2.shift.toFixed(1));
}
// 7. mask list
{
  const [l0, l1] = P.list;
  result(l0.index === 0 && l1.index === 3, 'maskList: one row every 10 f, hard', `${l0.index}, ${l1.index}`);
  const at = (l, d) => l.rows.find((r) => r.i === l.index + d)?.opacity;
  result(at(l1, 0) === 1 && at(l1, 1) > 0.1 && at(l1, 1) < 0.62 && Math.abs(at(l1, 2) - 0.05) < 1e-9 && Math.abs(at(l1, -3) - 0.05) < 1e-9 && at(l1, 4) === 0, 'maskList: 1 on the selected row, faint neighbours, the 0.05 floor out to 3 rows, gone at 4', l1.rows.map((r) => r.opacity.toFixed(2)).join(' '));
}
// 8. resize carry
{
  const h = P.carry;
  result(h[0] === 420 && Math.abs(h[20] - 250) < 1e-6, 'resize carry: starts at the outgoing box on the cut, home by 20 f');
  result((h[0] - h[3]) / 170 > 0.4, 'resize carry: front-loaded (over 40 % in the first 3 f)', ((h[0] - h[3]) / 170).toFixed(3));
}
// 9. radiate
{
  const [r0, r1, rf] = P.radiate;
  result(Math.abs(r0.rings[0].r - 54) < 1e-9, 'radiate: a ring is born at bornAt');
  result(Math.abs(r1.rings[0].r - (54 + 20 * 12)) < 1e-9 && Math.abs(r1.rings[1].r - (54 + 10 * 15)) < 1e-9, 'radiate: per-ring speeds, the rest at the house speed');
  result(Math.abs(rf.flood - 70 * 1.0915 ** 22) < 1e-6, 'radiate: the flood grows x1.0915 a frame from 70 px', rf.flood.toFixed(1));
}
// 10. counter-creep and growth
{
  result(Math.abs(P.creep.text - 1.02) < 1e-9 && Math.abs(P.creep.ground - 0.984) < 1e-9, 'counterCreep: +2 %/s in, -1.6 %/s out');
  const g = P.growth;
  const vals = g.map((s) => s.value);
  result(vals[0] === 0 && vals.every((v, i) => i === 0 || v > vals[i - 1]) && vals[vals.length - 1] === 3412, 'growthSteps: 0, rising every step, ending on the total', vals.join(','));
  result(g.every((s, i) => i === 0 || s.at - g[i - 1].at === 6) && g[g.length - 1].at <= 90, 'growthSteps: a step every 6 f at 60 fps, 3,412 inside 1.5 s', `last at ${g[g.length - 1].at}`);
  const fits = P.growthBar.map((x) => ({ last: x[x.length - 1], rising: x.every((s, i) => i === 0 || s.value > x[i - 1].value) }));
  result(fits.every((x, i) => x.rising && x.last.value === [12840, 12840, 40][i] && x.last.at <= 200), 'growthSteps within: 12,840 in a one-bar window at 60 and 30 fps, a small total too, rising to the total inside it', fits.map((x) => `${x.last.value}@${x.last.at}`).join(', '));
}
// 11. dither bands
{
  const b = P.bands;
  const n = b[0].n;
  result(b[0].cols === 192 && b[0].rows === 108, 'ditherBands: 10 px cells at 1080p (192 x 108)', `${b[0].cols} x ${b[0].rows}`);
  result(b[0].share === 0 && b[1].share === 0 && b.every((s) => Math.abs(s.share - s.want) <= 1 / n + 1e-12), 'ditherBands: nothing before at, then the switched share is E.stdInOut over 16 f');
  result(!b.find((s) => s.f === 55).done && b.find((s) => s.f === 56).done, 'ditherBands: whole on the 16th frame at 60 fps');
  result(b.every((s) => s.done || s.cellsInRuns === s.count), 'ditherBands: the runs hold exactly the switched cells');
  result(P.bandsSubset.ok && P.bandsSubset.unique, 'ditherBands: one fixed order, a switched cell stays switched');
  const [fr30, done28, done27] = P.bands30;
  result(fr30.end === 28 && done28 && !done27, 'ditherBands: 8 f at 30 fps');
  const d = P.bandsDecl;
  result(d.stepped.length === 1 && d.stepped[0].from === 40 && d.stepped[0].to === 57 && d.seams[0].at === 56 && d.seams[0].kind === 'wipe', 'ditherBands declares: every frame a step, a wipe seam when whole', JSON.stringify(d));
}

{
  const c = P.cam; // 12. camera path, camera velocity, shutter smear
  result(close(c.k[0], 1) && close(c.k[1], 0.5) && close(c.k[2], 0.5) && close(c.sx[0], 960) && close(c.sx[1], 560) && close(c.sx[2], 560), 'camPath: every move lands on its amount (zoom as a ratio, pan in px)', JSON.stringify(c));
  result(c.moving.every((v) => v > 1e-6) && c.still.speed === 0 && c.still.vk === 0, 'camPath: overlapping moves chain with no held frame, still after the last');
  result(close(c.pan.vx, 10) && close(c.pan.vy, 0) && close(c.pan.angle, 0), 'camVel: a 100 px pan over 10 f moves 10 px a frame along +x');
  result(close(c.zoom.vk, Math.log(0.5) / 20) && close(c.zoom.speed, 0, 1e-9), 'camVel: a zoom about the framed point: ln k per frame, no travel there');
  const lv = (m) => m.map((x) => x.level).join(',');
  const sig = (m) => m.reduce((a, x, i) => a + (i === 0 && m.length > 1 ? x.level * (1 - (m[1]?.weight ?? 0)) : x.level * x.weight), 0);
  const sh = P.shutter;
  result(lv(sh.house30) === lv(sh.s180) && Math.abs(sig(sh.house30) - sig(sh.s180)) < 0.1, 'dirBlurMix shutter: 180 degrees at 30 fps is the house smear', `${JSON.stringify(sh.house30)} vs ${JSON.stringify(sh.s180)}`);
  result(sig(sh.s360) > 1.8 * sig(sh.s180) && lv(sh.s360at60) === lv(sh.h60), 'dirBlurMix shutter: 360 doubles it at 30 fps; at 60 fps it is the house smear', `${JSON.stringify(sh.s360)} ${JSON.stringify(sh.s360at60)}`);
}
// 13. tracking fit
{
  const t = P.trackFit;
  result(close(t.em, 0.06, 1e-12) && t.residue.every((r) => Math.abs(r) < 1e-12), 'solveTracking: recovers +0.06 em from two measured widths', JSON.stringify(t));
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
