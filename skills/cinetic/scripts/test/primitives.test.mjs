#!/usr/bin/env node
/**
 * primitives.test.mjs: the measured-motion helpers and the UI primitives of the Remotion starter
 * against their house numbers.
 *
 *   1. lib/anim.ts curveOf(), track(), trackLinear(): a measured curve passes through its samples (normalised to
 *      start at 0 and land on 1), a track through its keys, monotone between them (no overshoot), held outside them.
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
 *  10. lib/handoff counterCreep(), fx/Roll growthSteps() (house cadence, and `within`: a one-bar window), countSteps() (an
 *      eased count lands its last value on the end frame instead of flipping it alone in the slow tail; a linear one keeps its steps).
 *  11. fx/DitherBands ditherBandsState(): the switched share follows E.stdInOut over 16 f at 60 fps (8 at 30),
 *      cells only ever switch on, the runs hold exactly the switched cells, declares() a stepped run and a seam.
 *  12. lib/camera camPath(), camVel(): moves add and chain without a hold, zoom in log space, the velocity of the
 *      framed point; fx/Defocus dirBlurMix shutter: 180 degrees at 30 fps = the house smear, 360 = twice it.
 *  13. lib/measure solveTracking(): the least-squares em tracking that matches measured widths.
 *  14. fx/Words exitDistanceEm(): a launch's fastest frame moves readable type at most 20 px/f at 1080p (a small line
 *      keeps the house 1.25 em, a launchFade 0.6 em, a given distance wins).
 *  15. cards and marks: fx/Stack pileState() (each card lands on top, alternating tilt, the origin walks), fanState()
 *      (opens on E.in, collapses back to closed), fx/Scroll masonryState() (tiles settle on their own depth and lag,
 *      exit together), fx/Wordmark spinInState() (more than a turn unwound, the turn settled before the scale, the name
 *      sliding out after), fx/Defocus spinBlurCopies() (sharp under 1 deg/f, copies over half the turn).
 *  16. reveals, cuts and UI: fx/Iris irisReveal() (opens at 37 % of the height, covers in 10 f at 60 fps), fx/CutFx
 *      blurBridge() (1.2, 4 | 3, 1.2 around the cut), fx/Gather scatterState() (own vectors, quad-in, x1.45),
 *      fx/Cursor cursorExit() (spins and flies out), fx/MicroUI swellState() (x1.38, walks to the held colour, back),
 *      fx/TypeOn rates (a fast run slowing on a given character, a burst on one frame), fx/Loaders rows that rise inside
 *      the stack and a pending row that never checks.
 *  17. type fills: fx/HueSweep clipText() pads the clipped box (descenders), bandFill() and frontFill() give stops in
 *      increasing px (a band ink | accent | ink; a front with the ink behind it).
 *  19. entrances and exits: lib/handoff expoTail() (x0.938 a frame, a residual drift past home), fx/Flight jLaunch()
 *      (x on a cubic-out, y on a cubic-in, growing x1.74), lib/camera-moves modalPush() (blur and veil over 20 f, x1.43,
 *      the toast at the push's midpoint), fx/MicroUI popScale() (62 % to full in 2 f, no overshoot), fx/Oversize
 *      OVERSIZE_FIRST (x2.67 over 24 f, 6 px defocus).
 *  20. rims: fx/BorderBleed spinRim() (a closed conic turning 3 deg a 60 fps frame from its cue, the same turn at 30 fps).
 *  21. fx/Pixel mosaicIrisState(): done (no cells, the outgoing scene gone) on the frame the ring passes the far
 *      corner, with the eased radius and with explicit radii.
 *  22. fx/Develop declares(): its blend as a light seam mid-develop (forensics accepts the cross-fade there), a stepped
 *      range only with steps; lib/anim lmix(): linear when an end is 0, never NaN.
 *  18. fx/Words arriveX: each word lands beside its slot and settles home on an expo-out (half of it in 8 f at 60 fps,
 *      home by arriveDur), one value per word when given a list.
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
import * as Wo from '${url('fx/Words.tsx')}';
import * as Wm from '${url('fx/Wordmark.tsx')}';
import * as Ir from '${url('fx/Iris.tsx')}';
import * as Cf from '${url('fx/CutFx.tsx')}';
import * as Ga from '${url('fx/Gather.tsx')}';
import * as Mu from '${url('fx/MicroUI.tsx')}';
import * as Lo from '${url('fx/Loaders.tsx')}';
import * as Hs from '${url('fx/HueSweep.tsx')}';
import * as Fl from '${url('fx/Flight.tsx')}';
import * as Cmv from '${url('lib/camera-moves.ts')}';
import * as Ov from '${url('fx/Oversize.tsx')}';
import * as Bb from '${url('fx/BorderBleed.tsx')}';
import * as Px from '${url('fx/Pixel.tsx')}';
import * as Dv from '${url('fx/Develop.tsx')}';
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
const noisy = A.curveOf([0.05, 0.5, 0.97]);
let flat = 'ok'; try { A.curveOf([0.4, 0.6, 0.4]); } catch { flat = 'threw'; }
console.log(JSON.stringify({
  curve: range(0, 10).map((i) => c(i / 10)),
  curveNoisy: [noisy(0), noisy(0.5), noisy(1)],
  curveFlat: flat,
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
  floodOff: [Gr.radiateState(300, { start: 100, births: [100], flood: { at: 100 }, x: 300, y: 540 }, film60).flood, Gr.radiateState(300, { start: 100, births: [100], flood: { at: 100 } }, film60).flood],
  creep: Ho.counterCreep(160, 100, {}, 60),
  growth: Ro.growthSteps(0, 3412, {}, 60),
  count: [Ro.countSteps(0, 100, 0, 60, A.E.out, 3), Ro.countSteps(0, 20, 0, 60, A.E.linear, 3)],
  growthBar: [Ro.growthSteps(100, 12840, { within: 100 }, 60), Ro.growthSteps(100, 12840, { within: 100 }, 30), Ro.growthSteps(100, 40, { within: 100 }, 60)],
  bands: range(38, 58).map((f) => { const s = Db.ditherBandsState(f, { at: 40 }, film60); return { f, share: s.share, count: s.count, n: s.cells, cols: s.cols, rows: s.rows, done: s.done, cellsInRuns: s.runs.reduce((a, r) => a + Math.round(r.w / s.cell), 0), want: A.E.stdInOut(Math.min(1, Math.max(0, (f - 40) / 16))) }; }),
  bands30: [Db.ditherBandsFrames({ at: 20 }, film30), Db.ditherBandsState(28, { at: 20 }, film30).done, Db.ditherBandsState(27, { at: 20 }, film30).done],
  bandsSubset: (() => { const o = Db.ditherOrder(192, 108, {}); const a = Db.ditherBandsState(44, { at: 40 }, film60).count; const b = Db.ditherBandsState(45, { at: 40 }, film60).count; let ok = a <= b; for (let i = 0; i < o.rank.length; i++) if (o.rank[i] < a && !(o.rank[i] < b)) ok = false; return { ok, unique: new Set(Array.from(o.rank)).size === o.rank.length }; })(),
  bandsDecl: Db.declares({ at: 40 }, film60),
  cam: { k: [0, 20, 40].map((f) => Cm.camPath(f, camBase, camMoves).k), sx: [0, 35, 60].map((f) => Cm.camPath(f, camBase, camMoves).sx),
    moving: range(1, 34).map((f) => { const v = Cm.camVel(f, camBase, camMoves); return v.speed + Math.abs(v.vk); }), still: Cm.camVel(36, camBase, camMoves),
    pan: Cm.camVel(5, camBase, panOnly), zoom: Cm.camVel(5, camBase, zoomOnly),
    zoomTall: Cm.camVel(5, { ax: 540, ay: 960, sx: 540, sy: 960, k: 1 }, zoomOnly, undefined, { fps: 60, width: 1080, height: 1920 }) },
  shutter: { house30: D.dirBlurMix(20, film30), s180: D.dirBlurMix(20, film30, { shutter: 180 }), s360: D.dirBlurMix(20, film30, { shutter: 360 }), h60: D.dirBlurMix(20, film60), s360at60: D.dirBlurMix(20, film60, { shutter: 360 }) },
  pile: [0, 20, 40, 60].map((f) => St.pileState(f, { arrivals: [0, 6, 12, 18] }, film60)),
  pileLate: St.pileState(200, { arrivals: [0, 6, 12, 18] }, film60),
  fan: [0, 10, 20, 40, 50, 80].map((f) => St.fanState(f, { open: 0, close: 40 }, film60).q),
  masonry: [0, 30, 70, 90, 140, 160].map((f) => Sc.masonryState(f, { at: 0, out: 140, tiles: [{ x: 0, y: 0, w: 100, h: 100, depth: 0.6 }, { x: 0, y: 0, w: 100, h: 100, depth: 1.4, lag: 1 }] }, film60).map((t) => t.y)),
  spin: range(0, 120, 4).map((f) => Wm.spinInState(f, { at: 0, room: -200 }, film60)),
  spinCopies: [D.spinBlurCopies(0.5), D.spinBlurCopies(30), D.spinBlurCopies(-90)],
  iris: [0, 2, 4, 10, 12].map((f) => Ir.irisRadius(f, Ir.irisReveal(0, {}, film60), film60)),
  bridge: range(96, 104).map((f) => Cf.blurBridge(f, 100, {}, film60)),
  bridge4k: range(96, 104).map((f) => Cf.blurBridge(f, 100, {}, { fps: 60, width: 3840, height: 2160 })),
  scatter: [0, 13, 26].map((f) => Ga.scatterState(f, { at: 0, items: [{ vx: 100, vy: 0 }, { vx: 0, vy: -50 }] }, film60)),
  cursorOut: [0, 10, 20].map((f) => Cu.cursorExit(f, 0, {}, film60)),
  swell: [-1, 6, 20, 40].map((f) => Mu.swellState(f, { at: 0, stops: ['#ff0000', '#00ff00', '#0000ff'] }, film60)),
  rates: Ty.typeSchedule('abcdefghij', { start: 0, kind: 'stream', cps: 60, rates: [{ at: 5, cps: 20 }], skip: [{ at: 2, count: 3 }] }, film60),
  steps: [10, 20, 40, 120].map((f) => Lo.stepListState(f, { rows: [{ at: 0 }, { at: 10 }, { at: 20, pending: true }], rise: 18 }, film60).rows),
  fills: { clip: Hs.clipText('linear-gradient(red, blue)'), band: Hs.bandFill({ tail: 150, head: 700, ink: '#111', band: '#06c' }), rtl: Hs.frontFill({ front: 676, ink: '#111', ramp: [[60, '#222'], [720, '#999'], [220, '#555']] }), ltr: Hs.frontFill({ front: 100, ink: '#111', ramp: [[60, '#222']], dir: 'ltr' }) },
  arrive: [1, 8, 28, 50].map((f) => Wo.wordState(100 + f, { text: 'one two', start: 100, starts: [100, 104], arriveX: [0.3, 0.1], size: 80 }, film60).words.map((w) => w.x)),
  tailIn: [0, 1, 36, 200].map((f) => Ho.expoTail(100 + f, 100, 400, {}, 60)),
  tail30: Ho.expoTail(118, 100, 400, {}, 30),
  jl: [0, 18, 36].map((f) => Fl.jLaunch(f, { at: 0, x: 500, y: -800 }, film60)),
  modal: [0, 10, 20, 21, 31, 42, 80].map((f) => Cmv.modalPush(f, 0, film60)),
  pop: [-1, 0, 1, 2, 5].map((f) => Mu.popScale(f, 0, {}, film60)),
  first: Ov.OVERSIZE_FIRST,
  mosaic: [17, 18, 19, 40].map((f) => { const m = Px.mosaicIrisState(f, { at: 0, origin: [400, 300] }, film60); return { done: m.done, active: m.active, cells: m.cells.length }; }),
  mosaicRadii: Px.mosaicIrisState(3, { at: 0, origin: [960, 540], radii: [100, 600, Math.hypot(960, 540) + 195] }, film60).done,
  develop: [Dv.declares({ start: 100, id: 'dv' }, film60), Dv.declares({ start: 100, index: 2, steps: { animFps: 16 } }, film60), Dv.declares(undefined, film60)],
  lmix: [A.lmix(0, 1, 1), A.lmix(0, 0, 0.5), A.lmix(1, 4, 0.5), A.lmix(2, 0, 0)],
  rim: [Bb.spinRim(5, 10, ['red', 'blue']), Bb.spinRim(30, 10, ['red', 'blue'], {}, film60), Bb.spinRim(20, 10, ['red', 'blue'], {}, film30)],
  launchCap: (() => { const big = Wo.exitDistanceEm('launch', A.E.launchIn, 14, 120, 1); const last = (1 - A.E.launchIn(13 / 14)) * big * 120; return { big, last, small: Wo.exitDistanceEm('launch', A.E.launchIn, 14, 30, 1), fade: Wo.exitDistanceEm('launchFade', A.E.buildIn, 14, 120, 1), given: Wo.exitDistanceEm('launch', A.E.launchIn, 14, 120, 1, 2) }; })(),
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
  result(P.curveNoisy[0] === 0 && close(P.curveNoisy[1], 0.45 / 0.92, 1e-9) && P.curveNoisy[2] === 1 && P.curveFlat === 'threw',
    'curveOf: samples that start above 0 or end below 1 are normalised (starts at 0, lands on 1); equal ends throw', JSON.stringify(P.curveNoisy));
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
  const [off, mid] = P.floodOff;
  result(off >= Math.hypot(1620, 540) && Math.abs(mid - (Math.hypot(960, 540) + 75)) < 1e-6, 'radiate: an off-centre flood grows to the farthest corner; the centred one stops at the half-diagonal', `${off.toFixed(0)} ${mid.toFixed(0)}`);
}
// 10. counter-creep and growth
{
  result(Math.abs(P.creep.text - 1.02) < 1e-9 && Math.abs(P.creep.ground - 0.984) < 1e-9, 'counterCreep: +2 %/s in, -1.6 %/s out');
  const g = P.growth;
  const vals = g.map((s) => s.value);
  result(vals[0] === 0 && vals.every((v, i) => i === 0 || v > vals[i - 1]) && vals[vals.length - 1] === 3412, 'growthSteps: 0, rising every step, ending on the total', vals.join(','));
  result(g.every((s, i) => i === 0 || s.at - g[i - 1].at === 6) && g[g.length - 1].at <= 90, 'growthSteps: a step every 6 f at 60 fps, 3,412 inside 1.5 s', `last at ${g[g.length - 1].at}`);
  const fits = P.growthBar.map((x) => ({ last: x[x.length - 1], rising: x.every((s, i) => i === 0 || s.value > x[i - 1].value) }));
  const [eased, lin] = P.count;
  result(eased[eased.length - 1].at === 60 && eased[eased.length - 1].value === 100 && eased[eased.length - 2].at < 50 && lin.every((s, i) => i === 0 || s.at - lin[i - 1].at === 3),
    'countSteps: an eased count holds 99 through its tail and lands 100 on the end frame; a linear count keeps a step every 3 f', `${eased.slice(-3).map((s) => `${s.value}@${s.at}`).join(' ')} | linear ${lin.length} steps`);
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
  result(close(c.zoomTall.speed, 0, 1e-9), 'camVel: measured at the centre of a 1080x1920 frame by default', String(c.zoomTall.speed));
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
// 15. cards and marks
{
  const pl = P.pile[3].cards;
  result(pl.length === 4 && pl[3].x > pl[0].x && pl[3].y < pl[0].y && Math.sign(pl[0].rot) !== Math.sign(pl[1].rot) && P.pileLate.shift.x < 0 && P.pileLate.shift.y > 0 && P.pileLate.cards.every((c) => c.v === 0),
    'pileState: newer cards up-right on top, alternating tilt, the origin walks down-left, landed cards rest', JSON.stringify(P.pileLate.shift));
  const fq = P.fan;
  result(fq[0] === 0 && fq[1] < 0.2 && Math.abs(fq[2] - 1) < 1e-9 && Math.abs(fq[3] - 1) < 1e-9 && fq[4] < 1 && fq[5] === 0, 'fanState: opens on E.in to 1, collapses back to closed', fq.join(','));
  const m = P.masonry;
  result(m[0][1] > m[0][0] && m[1][1] > m[1][0] && m[3].every((y) => Math.abs(y) < 1) && m[4].every((y) => Math.abs(y) < 1e-6) && m[5][0] === m[5][1] && m[5][0] < -100,
    'masonryState: the deeper, later tile travels further, all at rest after the entry, the exit shared', JSON.stringify(m));
  const sp = P.spin;
  const rotDone = sp.findIndex((x) => Math.abs(x.rot) < 0.5);
  const scaleDone = sp.findIndex((x) => Math.abs(x.scale - 1) < 0.005);
  result(sp[0].rot < -360 && sp[0].scale > 2 && rotDone > 0 && scaleDone > rotDone && sp[sp.length - 1].x < -199 && sp[sp.length - 1].name.opacity === 1 && sp[2].name.opacity === 0 && Math.abs(sp[1].omega) > 20,
    'spinInState: over a turn unwound, the turn settles before the scale, then the mark makes room and the name slides out', `rot0 ${sp[0].rot.toFixed(0)} rot@${rotDone * 4} scale@${scaleDone * 4}`);
  const sc = P.spinCopies;
  result(sc[0].length === 1 && sc[1].length >= 3 && Math.abs(sc[1][sc[1].length - 1] + 15) < 1e-9 && sc[2][sc[2].length - 1] === 45 && sc[2].length <= 10, 'spinBlurCopies: sharp under 1 deg/f, copies over half the turn (180 deg shutter), at most 10', JSON.stringify(sc));
}
// 16. reveals, cuts and UI
{
  const ir = P.iris;
  result(Math.abs(ir[0] - 0.37 * 1080) < 1e-6 && ir[1] / ir[0] > 1.6 && ir[3] >= Math.hypot(960, 540) && ir[4] === ir[3], 'irisReveal: opens at 37 % of the height, most growth first, covers the frame in 10 f', ir.map((r) => r.toFixed(0)).join(','));
  result(JSON.stringify(P.bridge) === JSON.stringify([1.2, 1.2, 4, 4, 3, 3, 1.2, 1.2, 0]), 'blurBridge: 1.2, 4 out | 3, 1.2 in, two 60 fps frames each', JSON.stringify(P.bridge));
  result(JSON.stringify(P.bridge4k) === JSON.stringify(P.bridge), 'blurBridge: px at 1080p at any size (Defocus scales it with the frame)', JSON.stringify(P.bridge4k));
  const sct = P.scatter;
  result(sct[0][0].dx === 0 && Math.abs(sct[1][0].dx - 25) < 1 && sct[2][0].dx === 100 && sct[2][1].dy === -50 && Math.abs(sct[2][0].scale - 1.45) < 1e-9 && sct[2][0].gone, 'scatterState: each along its own vector on a quad-in, growing x1.45', JSON.stringify(sct[1]));
  const co = P.cursorOut;
  result(co[0].dx === 0 && co[1].dx > 0 && co[1].dy < 0 && co[2].angle <= -400 && co[2].gone, 'cursorExit: flies up-right on a quad-in, spinning', JSON.stringify(co[2]));
  const sw = P.swell;
  result(sw[0].scale === 1 && sw[1].scale > 1.37 && /^(#0000ff|rgb\(0, 0, 255\))$/.test(sw[2].fill) && sw[3].scale === 1 && /^(#ff0000|rgb\(255, 0, 0\))$/.test(sw[3].fill), 'swellState: x1.38 in 6 f, walks to the held colour, back to the first', JSON.stringify(sw.map((x) => [x.scale.toFixed(3), x.fill])));
  const r = P.rates;
  result(r[2] === r[3] && r[3] === r[4] && r[5] - r[4] >= 3 && r[1] - r[0] === 1, 'typeSchedule rates: 1 frame a key at 60 cps, a 3-key burst on one frame, 3 frames a key from character 5', r.join(','));
  const st = P.steps;
  result(st[0][1].y > st[0][0].y + 76 && Math.abs(st[2][1].y - 76) < 0.5 && st[3][2].check === 0 && st[3][2].pending === 1 && st[3][0].check === 1, 'stepListState: a new row rises inside the stack, a pending row never checks and pales', JSON.stringify(st[3].map((x) => [x.y, x.check, x.pending])));
}
// 17. type fills
{
  const F = P.fills;
  const px = (g) => [...g.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
  const inc = (a) => a.every((v, i) => i === 0 || v >= a[i - 1]);
  result(F.clip.padding === '0.18em 0 0.32em' && F.clip.marginTop === '-0.18em' && F.clip.backgroundClip === 'text', 'clipText: the clipped box is padded for descenders and the margin taken back', JSON.stringify(F.clip));
  result(inc(px(F.band)) && px(F.band).length === 4 && inc(px(F.rtl)) && px(F.rtl).pop() === 676 && /#111 676/.test(F.rtl) && inc(px(F.ltr)) && /^linear-gradient\(90deg, #111 100/.test(F.ltr),
    'bandFill and frontFill: stops in increasing px, the ink behind the front', `${F.band} | ${F.rtl}`);
}
// 18. words at the pace of speech
{
  const a = P.arrive;
  result(a[0][0] > 0.27 && a[0][0] < 0.3 && Math.abs(a[1][0] / 0.3 - 0.52) < 0.06 && a[2][0] > 0.02 && a[2][0] < 0.035 && a[3][0] === 0 && a[3][1] === 0 && a[1][1] > a[1][0] / 3 && a[1][1] < 0.1,
    'Words arriveX: lands 0.3 em right, half home in 8 f, 90 % by 28 f, home by 45 f; a second word on its own distance', JSON.stringify(a));
}
// 19. entrances and exits
{
  const [t0, t1, t36, t200] = P.tailIn;
  result(t0 === 400 && Math.abs(t1 - (400 * 0.938 - 0.06)) < 1e-9 && t36 < 40 && t36 > 0 && t200 < 0, 'expoTail: from 400 px, x0.938 a frame, about 90 % home by 36 f, drifting past home', JSON.stringify(P.tailIn));
  result(Math.abs(P.tail30 - t36) < 1e-9, 'expoTail: the same tail at 30 fps', `${P.tail30} vs ${t36}`);
  const [j0, j1, j2] = P.jl;
  result(j0.dx === 0 && j0.dy === 0 && j1.dx > 400 && j1.dy > -120 && j2.dx === 500 && j2.dy === -800 && Math.abs(j2.scale - 1.74) < 1e-9 && j2.gone, 'jLaunch: sideways first (cubic-out x), rising late (cubic-in y), x1.74, gone at 36 f', JSON.stringify(j1));
  const m = P.modal;
  result(m[0].blur === 0 && m[2].blur === 14 && Math.abs(m[2].veil - 0.45) < 1e-9 && !m[1].toast.shown && m[3].toast.shown && m[4].toast.opacity === 1 && Math.abs(m[5].k - 1.43) < 1e-9 && m[6].toast.blur === 0 && m[6].toast.scale === 1,
    'modalPush: blur 14 and veil .45 by 20 f, the toast from the midpoint (21 f), sharp and full size, x1.43 at 42 f', JSON.stringify(m[3]));
  result(JSON.stringify(P.pop.map((x) => +x.toFixed(3))) === JSON.stringify([0.62, 0.62, 0.81, 1, 1]), 'popScale: 62 % to full in 2 f, never over', JSON.stringify(P.pop));
  result(P.first.from === 2.67 && P.first.dur60 === 24 && P.first.defocus === 6, 'OVERSIZE_FIRST: x2.67 over 24 f, 6 px defocus');
}
// 20. rims
{
  const [r0, r1, r2] = P.rim;
  result(r0 === 'conic-gradient(from 0.00deg, red, blue, red)' && r1 === 'conic-gradient(from 60.00deg, red, blue, red)' && r2 === r1, 'spinRim: still before its cue, 3 deg a 60 fps frame after, the same turn at 30 fps, the stops closed', `${r1} | ${r2}`);
}
// 21. the mosaic iris finishes: once the ring has passed the far corner the outgoing scene is gone
{
  const m = P.mosaic;
  result(!m[0].done && m[0].cells > 0 && m[1].done && !m[1].active && m[1].cells === 0 && m[3].done && P.mosaicRadii,
    'mosaicIrisState: done on the frame the ring passes the far corner (18 f at 60 fps), and with explicit radii', JSON.stringify(m));
}
// 22. Develop declares its blend (a light seam mid-develop, where forensics accepts the cross-fade), and lmix never NaN
{
  const [d0, d1, d2] = P.develop;
  result(d0.seams.length === 1 && d0.seams[0].kind === 'light' && d0.seams[0].at === 112 && !d0.stepped.length
    && d1.seams[0].at === 120 && d1.stepped.length === 1 && !d2.seams.length,
    'Develop declares: a light seam in the middle of the develop (24 f from start + index x 4 f), a stepped range only on steps', JSON.stringify(P.develop));
  result(P.lmix.every((v) => Number.isFinite(v)) && Math.abs(P.lmix[2] - 2) < 1e-9 && P.lmix[0] === 1 && P.lmix[3] === 2,
    'lmix: log-space between positives, linear when an end is 0 (never NaN)', JSON.stringify(P.lmix));
}
// 14. a launch keeps readable type under the audit's 20 px/f
{
  const L = P.launchCap;
  result(L.last <= 20 + 1e-9 && L.last > 19 && L.big < 1.25, 'exitDistanceEm: a 120 px launch moves at most 20 px on its fastest frame', JSON.stringify(L));
  result(L.small === 1.25 && L.fade === 0.6 && L.given === 2, 'exitDistanceEm: a small line keeps 1.25 em, a launchFade 0.6, a given distance wins', JSON.stringify(L));
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
