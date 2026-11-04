#!/usr/bin/env node
/**
 * drift.test.mjs: the stage helpers of the Remotion starter (lib/drift.ts, fx/Float.tsx) against the house rule that
 * the camera is still unless a shot declares a move (no float, no drift, no idle loop; holds may be still).
 *
 *   1. stageAt() (floatAt): without moves the camera is still on every frame, whatever the old float options say
 *      (seed, amp, omega, push, locks are ignored); withLocks() returns the options, lockOn() the read's middle.
 *   2. a declared move (stageMove push / pull / track): starts from rest, travels, lands at rest on its last frame, holds
 *      after it; one function of film time (30 and 60 fps agree); px scale with the frame; moves add; a track runs one way.
 *   3. bleedFor(): 1 on a still camera; under a track or a pull the act covers the frame on every frame.
 *   4. planeOf(): a plane at depth z moves z times the move on screen (z 0 holds still, z 1 rides it); still camera, still planes.
 *   5. scrollBy(): starts from rest, reaches its speed after easeS with no step in speed, eases back to rest on `to`.
 *   6. tail(): zero before the landing, leaves at pxS, decays, travels pxS x tauS in all, then rests.
 *   7. breathe(): inside [-1, 1], smooth, never a visible loop over 20 s.
 *   8. settleAmp() / dipAmp(): deprecated, always 1; DRIFT.creep is sub-pixel (0.2 px/f@60) and DRIFT.dead mirrors forensics.py (2.5 s).
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/drift.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/drift.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as D from '${url('lib/drift.ts')}';
import * as F from '${url('fx/Float.tsx')}';
const film60 = { fps: 60, width: 1920, height: 1080 };
const film30 = { fps: 30, width: 1920, height: 1080 };
const half60 = { fps: 60, width: 960, height: 540 };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const old = { seed: 'test', amp: 1, omega: 1.3, push: 0.03, locks: [{ at: 600 }] };
const push = { moves: [D.stageMove(120, 'push', {}, film60)] };
const push30 = { moves: [D.stageMove(60, 'push', {}, film30)] };
const track = { moves: [D.stageMove(120, 'track', { pan: { x: -160, y: 40 } }, film60)] };
const both = { moves: [D.stageMove(120, 'pull', { frames60: 90 }, film60), D.stageMove(300, 'track', {}, film60)] };
console.log(JSON.stringify({
  still: range(0, 1200).filter((f) => f % 7 === 0).map((f) => D.floatAt(f, old, film60)),
  stillNone: D.stageAt(300, {}, film60),
  withLocks: D.withLocks({ seed: 'x', amp: 2 }, [{ resolved: 300, out: 420 }], film60),
  lockOn: D.lockOn({ resolved: 300, out: 420 }, film60),
  push: range(0, 400).map((f) => D.stageAt(f, push, film60)),
  push30: range(0, 200).map((f) => D.stageAt(f, push30, film30)),
  pushHalf: D.stageAt(300, { moves: [D.stageMove(120, 'push', {}, half60)] }, half60),
  track: range(0, 400).map((f) => D.stageAt(f, track, film60)),
  trackHalf: D.stageAt(300, { moves: [D.stageMove(120, 'track', { pan: { x: -160, y: 40 } }, half60)] }, half60),
  both: range(0, 600).map((f) => D.stageAt(f, both, film60)),
  speed: [D.floatSpeed(100, track, film60), D.floatSpeed(156, track, film60), D.floatSpeed(250, track, film60)],
  bleed: [D.bleedFor({}, film60), D.bleedFor(old, film60), D.bleedFor(track, film60), D.bleedFor(both, film60), D.bleedFor(track, film60, 0.6)],
  planes: [0, 0.6, 1, 1.35].map((z) => range(0, 400).filter((f) => f % 13 === 0).map((f) => { const s = D.stageAt(f, both, film60); return { s, p: D.planeOf(s, z) }; })),
  stillPlane: D.planeOf(D.stageAt(500, {}, film60), 1.35),
  scroll: range(0, 240).map((f) => D.scrollBy(f, 60, { pxS: 24, to: 180 }, film60)),
  scroll30: range(0, 120).map((f) => D.scrollBy(f, 30, { pxS: 24 }, film30)),
  tail: range(0, 300).map((f) => D.tail(f, 60, { angle: 0 }, film60)),
  breathe: range(0, 1200).map((f) => D.breathe(f, { seed: 4 }, film60)),
  settle: [0, 30, 60, 120].map((F0) => F.settleAmp(1000, 60, 0)(1000 + F0)),
  dip: [100, 124, 200, 276, 300].map((f) => F.dipAmp(100, 300, 0.4, 24)(f)),
  house: D.DRIFT,
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-drift-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const W = 1920, H = 1080;

// 1. still by default
{
  result(P.still.every((x) => x.x === 0 && x.y === 0 && x.k === 1), 'stageAt: no declared move, no motion: the old float options (seed, amp, omega, push, locks) are ignored');
  result(P.stillNone.x === 0 && P.stillNone.y === 0 && P.stillNone.k === 1, 'stageAt: {} is the still camera');
  result(P.withLocks.amp === 2 && !P.withLocks.locks, 'withLocks: deprecated, returns the options unchanged (no lock: the camera is still on every read)');
  result(P.lockOn.at === 360, "lockOn: deprecated, the read's middle frame", JSON.stringify(P.lockOn));
}
// 2. a declared move: from rest to rest
{
  const S = P.push; // a push of x1.06 from 120 over 72 f
  result(S.slice(0, 121).every((x) => x.k === 1 && x.x === 0), 'stageMove push: still before its start');
  result(close(S[192].k, 1.06, 1e-9) && S.slice(192).every((x) => close(x.k, 1.06, 1e-12)), 'stageMove push: lands at x1.06 on its last frame and holds', `${S[192].k}`);
  const lv = S.slice(1).map((b, i) => Math.log(b.k) - Math.log(S[i].k));
  const peak = Math.max(...lv);
  result(lv[120] < 0.1 * peak && lv[190] < 0.1 * peak, 'stageMove push: starts from rest and lands at rest (eased both ends)', `first ${(lv[120] / peak).toFixed(3)}, last ${(lv[190] / peak).toFixed(3)} of its peak`);
  result(P.push30.every((x, i) => close(x.k, S[2 * i].k, 1e-9)), 'stageMove: one function of film time (frame 2n at 60 fps = frame n at 30 fps)');
  result(close(P.pushHalf.k, 1.06, 1e-9) && close(P.trackHalf.x, P.track[300].x / 2, 1e-9), "stageMove: a push is a share; a track's px scale with the frame");
  const T = P.track;
  result(close(T[300].x, -160, 1e-9) && close(T[300].y, 40, 1e-9) && T[300].k === 1, 'stageMove track: travels its pan and holds there', JSON.stringify(T[300]));
  const v = P.speed;
  result(v[0] === 0 && v[1] > 50 && v[2] === 0, 'floatSpeed: 0 before and after the move, moving in it', v.map((x) => x.toFixed(1)).join(' '));
  const B = P.both;
  result(close(B[599].k, 0.94, 1e-9) && close(B[599].x, 120, 1e-9), 'stageMove: moves add (a pull then a track)', JSON.stringify(B[599]));
  const dx = T.slice(1).map((b, i) => b.x - T[i].x);
  result(dx.every((d) => d <= 1e-12), 'stageMove: a track runs one way (never back)');
}
// 3. bleed
{
  const [b0, bOld, bT, bB, bT6] = P.bleed;
  result(b0 === 1 && bOld === 1, 'bleedFor: 1 on a still camera (the old float options add nothing)', `${b0} ${bOld}`);
  result(close(bT, 1 + Math.max(320 / W, 80 / H), 1e-9) && close(bT6, 1 + 0.6 * Math.max(320 / W, 80 / H), 1e-9), 'bleedFor: a track needs 1 + twice its travel over the frame, z scales it', `${bT} ${bT6}`);
  const bad = P.both.filter((s) => {
    const k = s.k * bB;
    const left = W / 2 - (W / 2) * k + s.x, right = W / 2 + (W / 2) * k + s.x, top = H / 2 - (H / 2) * k + s.y, bottom = H / 2 + (H / 2) * k + s.y;
    return left > 1e-6 || right < W - 1e-6 || top > 1e-6 || bottom < H - 1e-6;
  });
  result(!bad.length, 'bleedFor: under a pull and a track the act covers the frame on every frame', `${bad.length} frames`);
}
// 4. planes
{
  const names = [0, 0.6, 1, 1.35];
  let ok = true;
  const detail = [];
  P.planes.forEach((rows, zi) => {
    const z = names[zi];
    for (const { s, p } of rows) {
      for (const q of [[0, 0], [600, 300], [-800, -400]]) {
        const sx = s.x + s.k * (p.x + p.k * q[0]);
        const sy = s.y + s.k * (p.y + p.k * q[1]);
        const kz = 1 + z * (s.k - 1);
        const ex = z * s.x + kz * q[0], ey = z * s.y + kz * q[1];
        if (!close(sx, ex, 1e-6) || !close(sy, ey, 1e-6)) { ok = false; detail.push(`z ${z}: ${sx.toFixed(3)} vs ${ex.toFixed(3)}`); }
      }
    }
  });
  result(ok, 'planeOf: a plane at depth z moves z times the declared move on screen (0 holds still, 1 rides it, 1.35 leads)', detail.slice(0, 3).join('; '));
  const sp = P.stillPlane;
  result(sp.x === 0 && sp.y === 0 && sp.k === 1, 'planeOf: on a still camera every plane is still');
}
// 5. scrollBy
{
  const S = P.scroll; // from 60, to 180 at 24 px/s, easeS 0.6 (36 f)
  const d = S.map((x) => x.d);
  const v = d.slice(1).map((x, i) => (x - d[i]) * 60);
  result(d[60] === 0 && d[59] === 0 && v[60] < 1, 'scrollBy: still until `from`, then starts from rest', `${v[60]}`);
  result(close(v[120], 24, 1e-6), 'scrollBy: runs at pxS after easeS', `${v[120]}`);
  const acc = v.slice(1).map((x, i) => Math.abs(x - v[i]));
  result(Math.max(...acc) <= 24 / 36 + 1e-6, 'scrollBy: no step in speed (it eases in and out over easeS)', `${Math.max(...acc).toFixed(3)} px/s a frame`);
  result(v.slice(181).every((x) => Math.abs(x) < 1e-6) && S[100].y < 0 && close(S[100].x, 0, 1e-9), 'scrollBy: at rest from `to` on; angle 90 runs up the screen');
  const S3 = P.scroll30;
  result(close((S3[100].d - S3[99].d) * 30, 24, 1e-6), 'scrollBy: the same px/s at 30 fps');
}
// 6. tail
{
  const T = P.tail; // lands at 60
  const x = T.map((p) => p.x);
  const v = x.slice(1).map((a, i) => (a - x[i]) * 60);
  result(x[60] === 0 && x[59] === 0, 'tail: zero before and on the landing frame');
  result(v[60] > 30 && v[60] <= 36 && v.slice(61, 200).every((a, i) => a <= v[60 + i] + 1e-9), 'tail: leaves at pxS (36 px/s) and only slows', `${v[60].toFixed(2)}`);
  result(close(x[300], 36 * 0.45, 0.2), 'tail: travels pxS x tauS (16 px) in all', `${x[300].toFixed(2)}`);
}
// 7. breathe
{
  const B = P.breathe;
  const step = Math.max(...B.slice(1).map((b, i) => Math.abs(b - B[i])));
  result(B.every((b) => b >= -1 && b <= 1), 'breathe: inside [-1, 1]');
  result(step < 0.02, 'breathe: smooth (no frame changes it by 2 % of its range)', `${step.toFixed(4)}`);
  const lag = 6.5 * 60;
  const corr = B.slice(0, B.length - lag).reduce((m, b, i) => Math.max(m, Math.abs(b - B[i + lag])), 0);
  result(corr > 0.1, 'breathe: one period later it is somewhere else (two incommensurate sines, no visible loop)', `${corr.toFixed(3)}`);
}
// 8. deprecated amplitudes, the creep and the dead stretch
{
  result(P.settle.every((x) => x === 1) && P.dip.every((x) => x === 1), 'settleAmp / dipAmp: deprecated, always 1 (there is no float)');
  result(P.house.creep.maxPx60 <= 0.2 && !('float' in P.house) && !('energy' in P.house), 'DRIFT: no float, no motion-energy band; the creep is sub-pixel (0.2 px/f@60 at most)');
  result(P.house.dead.s === 2.5, 'DRIFT.dead mirrors forensics.py DEAD_S (2.5 s where nothing at all changes)');
}

process.exit(failed ? 1 : 0);
