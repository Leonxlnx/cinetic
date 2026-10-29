#!/usr/bin/env node
/**
 * drift.test.mjs: the shot-life helpers of the Remotion starter (lib/drift.ts, fx/Float.tsx) against the motion
 * energy band they answer (forensics.py motion-energy: under 30 % of the picture moving 15 px/s or more for at most
 * 1.5 s).
 *
 *   1. floatAt(): one continuous function of film time: sideways at most 31.2 px/s (1080p), the push between x1 and
 *      x1.03, the same px/s at 30 and 60 fps, scaled with the frame; no frame steps; the drift under 15 px/s at most
 *      0.8 s at a time (a turn), and there the push carries the frame's edges; a seed changes the phase.
 *   2. locks: the camera eases to rest on the lock frame (under 1 px/s for the hold), drifts on after, never steps.
 *   3. bleedFor(): x1.025 at 1080p; the floated act covers the frame on every frame (no edge shows).
 *   4. planeOf(): a plane at depth z inside the float moves z times it on screen (z 0 holds still, z 1 rides it).
 *   5. scrollBy(): starts from rest, reaches its speed after easeS with no step in speed, eases back to rest on `to`.
 *   6. tail(): zero before the landing, leaves at pxS, decays, travels pxS x tauS in all.
 *   7. breathe(): inside [-1, 1], smooth, never a visible loop over 20 s.
 *   8. settleAmp() / dipAmp(): 1 on the act's seams, the low value inside.
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
const o = { seed: 'test' };
const lock = { seed: 'test', locks: [{ at: 600 }] };
console.log(JSON.stringify({
  f60: range(0, 1200).map((f) => D.floatAt(f, o, film60)),
  f30: range(0, 600).map((f) => D.floatAt(f, o, film30)),
  half: range(0, 1200, ).filter((f) => f % 50 === 0).map((f) => D.floatAt(f, o, half60)),
  other: D.floatAt(0, { seed: 'other' }, film60),
  off: D.floatAt(300, { seed: 'test', amp: 0 }, film60),
  lk: range(400, 900).map((f) => D.floatAt(f, lock, film60)),
  lockOn: D.lockOn({ resolved: 300, out: 420 }, film60),
  // a phase-aware lock on a long read, the float's speed on its rest's way in, and two locks in order
  placed: (() => {
    const read = { resolved: 300, out: 600 };
    const L = D.lockOn(read, film60, o);
    const ph = D.withLocks(o, [read], film60);
    const near = range(L.at - 18 - 30, L.at - 18).map((f) => D.floatAt(f, ph, film60));
    const mid = D.lockOn(read, film60);
    const two = D.withLocks(o, [read, { resolved: 900, out: 1100 }], film60);
    return { at: L.at, same: ph.locks?.[0]?.at === L.at, near, mid: mid.at, two: two.locks?.map((l) => l.at), off: D.lockOn(read, film60, { seed: 'test', amp: 0 }).at };
  })(),
  bleed: [D.bleedFor(o, film60), D.bleedFor(o, film60, 0.6), D.bleedFor({ amp: 0.4 }, film60)],
  planes: [0, 0.6, 1, 1.35].map((z) => range(0, 1200).filter((f) => f % 97 === 0).map((f) => { const s = D.floatAt(f, o, film60); return { s, p: D.planeOf(s, z) }; })),
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
// the speed (px/s) of a point at (px, py) from the frame's centre between two float states, dt seconds apart
const speedAt = (a, b, dt, px = 0, py = 0) => Math.hypot(b.x - a.x + px * (b.k - a.k), b.y - a.y + py * (b.k - a.k)) / dt;
const W = 1920, H = 1080;

// 1. floatAt
{
  const s = P.f60;
  const v = s.slice(1).map((b, i) => speedAt(s[i], b, 1 / 60));
  const vmax = Math.max(...v);
  result(vmax <= 31.3 && vmax >= 30.5, 'floatAt: the sideways drift peaks at 31.2 px/s at 1080p (ampX 24 x omega 1.3)', `max ${vmax.toFixed(2)} px/s`);
  result(s.every((x) => x.y === 0 && x.k >= 1 - 1e-9 && x.k <= 1.03 + 1e-9), 'floatAt: never a vertical translation; the push stays between x1 and x1.03');
  const acc = v.slice(1).map((x, i) => Math.abs(x - v[i]) * 60);
  result(Math.max(...acc) < 60, 'floatAt: continuous (no frame steps in speed)', `max change ${Math.max(...acc).toFixed(1)} px/s per s`);
  const s30 = P.f30;
  const same = s30.every((x, i) => close(x.x, s[2 * i].x, 1e-6) && close(x.k, s[2 * i].k, 1e-9));
  result(same, 'floatAt: one function of film time (frame 2n at 60 fps = frame n at 30 fps)');
  result(P.half.every((x, i) => close(x.x, s[i * 50].x / 2, 1e-6) && close(x.k, s[i * 50].k, 1e-9)), 'floatAt: px scale with the frame (half the offset at 960x540)');
  // where the drift turns, the push carries the frame: a point 0.42 of the half-width from the centre and beyond keeps moving
  let run = 0, worst = 0, edgeLow = 0;
  for (let i = 1; i < s.length; i++) {
    const c = speedAt(s[i - 1], s[i], 1 / 60);
    run = c < 15 ? run + 1 : 0;
    worst = Math.max(worst, run);
    const edge = Math.max(speedAt(s[i - 1], s[i], 1 / 60, -0.42 * W, 0.42 * H), speedAt(s[i - 1], s[i], 1 / 60, 0.42 * W, 0.42 * H));
    if (c < 15 && edge < 8) edgeLow++;
  }
  result(worst / 60 <= 0.8, 'floatAt: the drift goes under 15 px/s for at most 0.8 s at a time (a turn)', `${(worst / 60).toFixed(2)} s`);
  result(edgeLow === 0, 'floatAt: at a turn the push moves the outer frame at 8 px/s or more', `${edgeLow} frames`);
  result(!close(P.other.x, s[0].x, 1e-3), 'floatAt: another seed floats from another phase');
  result(P.off.x === 0 && P.off.k === 1, 'floatAt: amp 0 switches the float off');
}
// 2. locks
{
  const L = P.lk; // frames 400..900, lock at 600
  const at = (f) => L[f - 400];
  const v = (f) => speedAt(at(f - 1), at(f), 1 / 60, 0.42 * W, 0.42 * H);
  const hold = [600, 610, 620, 629].map(v);
  result(hold.every((x) => x < 1), 'lock: the camera rests on the lock frame for holdS (0.5 s)', hold.map((x) => x.toFixed(2)).join(' '));
  const after = Math.max(...[700, 720, 760, 800].map(v));
  result(after > 10, 'lock: it drifts on after the hold', `${after.toFixed(1)} px/s`);
  const vs = Array.from({ length: 499 }, (_, i) => v(401 + i));
  const jumps = vs.slice(1).map((x, i) => Math.abs(x - vs[i]));
  result(Math.max(...jumps) < 3.12, 'lock: it eases into and out of the rest over rampS (no frame changes the speed by a tenth of the drift)', `max change ${Math.max(...jumps).toFixed(2)} px/s a frame`);
  result(P.lockOn.at === Math.round(300 + (120 - 30) / 2), 'lockOn: without the float the rest sits in the middle of the read', JSON.stringify(P.lockOn));
  const Q = P.placed;
  result(Q.at >= 300 + 18 && Q.at + 30 + 18 <= 600 && Q.same, 'lockOn with the float: the rest and its ramps stay inside the read; withLocks places the same lock', JSON.stringify({ at: Q.at, mid: Q.mid }));
  const v0 = speedAt(Q.near[29], Q.near[30], 1 / 60);
  result(v0 > 28, 'lockOn with the float: the drift comes into the rest at full speed (never beside a turn)', `${v0.toFixed(1)} px/s just before the ramp`);
  result(Q.two.length === 2 && Q.two[0] === Q.at && Q.two[1] >= 900 + 18 && Q.two[1] + 48 <= 1100, 'withLocks: one lock a read, in order, each inside its read', JSON.stringify(Q.two));
  result(Q.off === Q.mid, 'lockOn: a float switched off (amp 0) keeps the middle', `${Q.off} vs ${Q.mid}`);
}
// 3. bleed covers the frame
{
  const [b1, b06, b04] = P.bleed;
  result(close(b1, 1.025, 1e-9) && close(b06, 1 + 0.025 * 0.6, 1e-9) && close(b04, 1 + 0.025 * 0.4, 1e-9), 'bleedFor: x1.025 at the house float, z and amp scale it', `${b1} ${b06} ${b04}`);
  const bad = P.f60.filter((s) => {
    const k = s.k * b1;
    const left = W / 2 - (W / 2) * k + s.x, right = W / 2 + (W / 2) * k + s.x, top = H / 2 - (H / 2) * k, bottom = H / 2 + (H / 2) * k;
    return left > 1e-6 || right < W - 1e-6 || top > 1e-6 || bottom < H - 1e-6;
  });
  result(!bad.length, 'bleedFor: the floated act covers the frame on every frame (its edges never show)', `${bad.length} frames`);
}
// 4. planes
{
  const names = [0, 0.6, 1, 1.35];
  let ok = true;
  const detail = [];
  P.planes.forEach((rows, zi) => {
    const z = names[zi];
    for (const { s, p } of rows) {
      // a point q (from the centre) in the plane lands at s + s.k * (p + p.k * q) on screen: z times the float
      for (const q of [[0, 0], [600, 300], [-800, -400]]) {
        const sx = s.x + s.k * (p.x + p.k * q[0]);
        const sy = s.y + s.k * (p.y + p.k * q[1]);
        const kz = 1 + z * (s.k - 1);
        const ex = z * s.x + kz * q[0], ey = z * s.y + kz * q[1];
        if (!close(sx, ex, 1e-6) || !close(sy, ey, 1e-6)) { ok = false; detail.push(`z ${z}: ${sx.toFixed(3)} vs ${ex.toFixed(3)}`); }
      }
    }
  });
  result(ok, 'planeOf: a plane at depth z moves z times the float on screen (0 holds still, 1 rides it, 1.35 leads)', detail.slice(0, 3).join('; '));
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
// 8. amplitudes
{
  result(close(P.settle[0], 1) && close(P.settle[3], 0) && P.settle[1] < 1 && P.settle[1] > 0, 'settleAmp: 1 on the seam, eased to rest', JSON.stringify(P.settle));
  result(close(P.dip[0], 1) && close(P.dip[4], 1) && close(P.dip[2], 0.4) && close(P.dip[1], 0.4) && close(P.dip[3], 0.4), 'dipAmp: 1 on both seams, the low value inside', JSON.stringify(P.dip));
  const E = P.house.energy;
  result(E.px === 15 && E.low === 0.3 && E.warnS === 1.5 && E.failS === 2.0 && E.share === 0.25, 'DRIFT.energy mirrors forensics.py ENERGY (15 px/s, 30 %, 1.5 s / 2.0 s, 25 %)');
}

process.exit(failed ? 1 : 0);
