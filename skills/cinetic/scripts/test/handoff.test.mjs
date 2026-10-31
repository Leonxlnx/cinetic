#!/usr/bin/env node
/**
 * handoff.test.mjs: the velocity-carry curves of the Remotion starter (src/lib/handoff.ts) in both
 * directions, and the settle that lets a carried camera lock for a read.
 *
 *   1. launch(): a leftward or upward build (vCut < 0) is the mirror image of the rightward one, step
 *      for step, with ratios, a geometric build and a floor; it moves on every frame before the cut.
 *   2. carry(): a negative v0 mirrors a positive one, and its residual drift continues in the carried
 *      direction (never back); carriedCut() moves the same way on both sides of a leftward cut.
 *   3. settle: the speed eases to exactly 0 by `settle` (60 fps frames, converted at 30 fps), with no
 *      step in speed on the way (every frame's change of step under 2 % of v0), x stays put after it,
 *      and frames before the ease match the unsettled curve; carryShot() locks the same way.
 *
 * It runs src/lib through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/handoff.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/handoff.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as H from '${url('lib/handoff.ts')}';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const L = (o: H.LaunchOpts) => range(60, 100).map((f) => H.launch(f, 100, { fps: 60, ...o }));
const C = (o: H.CarryOpts, fps = 60, n = 140) => range(0, n).map((k) => H.carry(100 + k, 100, { fps, ...o }));
const base = { scale: 1, k: 1, sx: 0, sy: 0, ax: 0, ay: 0, roll: 0 } as any;
console.log(JSON.stringify({
  launchHouse: [L({ vCut: 40 }), L({ vCut: -40 })],
  launchRatios: [L({ vCut: 60, ratios: [1.5, 1.6, 1.7, 2] }), L({ vCut: -60, ratios: [1.5, 1.6, 1.7, 2] })],
  launchGeo: [L({ vCut: 30, ratio: 1.15 }), L({ vCut: -30, ratio: 1.15 })],
  launchFloor: [L({ vCut: 40, floor: 2 }), L({ vCut: -40, floor: 2 }), L({ vCut: -40, floor: -2 })],
  launchFrac: [H.launch(99.5, 100, { vCut: 40, fps: 60 }), H.launch(99.5, 100, { vCut: -40, fps: 60 })],
  carry: [C({ v0: 40 }), C({ v0: -40 }), C({ vCut: -50, ratio: 0.7 })],
  cut: range(80, 160).map((f) => H.carriedCut(f, 100, { vCut: -40, fps: 60 }, {})),
  settle: [C({ v0: 40, settle: 60 }), C({ v0: -40, settle: 60 }), C({ v0: 40, settle: 90, settleOver: 30 }, 30, 70), C({ v0: 40, settle: 8 })],
  shot: range(0, 120).map((k) => H.carryShot(base, 100 + k, 100, { x: { v0: -30, settle: 50 }, fps: 60 }).sx),
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-handoff-'));
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
const mirrored = (pos, neg) => pos.every((p, i) => close(p.x, -neg[i].x) && close(p.v, -neg[i].v));

// 1. launch, both signs
for (const [name, [pos, neg]] of Object.entries({ house: P.launchHouse, ratios: P.launchRatios, geometric: P.launchGeo })) {
  result(mirrored(pos, neg), `launch (${name}): vCut < 0 is the mirror image of vCut > 0`);
}
{
  const [, neg] = P.launchHouse;
  const steps = neg.slice(1).map((s, i) => s.x - neg[i].x); // frame 61..100
  const tail = steps.slice(-12);
  result(tail.every((d) => d < 0) && neg[neg.length - 1].x === 0 && close(neg[neg.length - 1].v, -40), 'launch: a leftward build moves left on each of its last 12 frames and is fastest on the cut', tail.map((d) => d.toFixed(2)).join(', '));
  result(tail.every((d, i) => i === 0 || Math.abs(d) > Math.abs(tail[i - 1])), 'launch: a leftward build accelerates into the cut');
  const [pf, nf, nf2] = P.launchFloor;
  result(mirrored(pf, nf) && mirrored(pf, nf2), 'launch: the floor holds the step\'s size in either direction', `${nf[0].v.toFixed(3)}`);
  result(close(P.launchFrac[0].x, -20) && close(P.launchFrac[1].x, 20), 'launch: half a frame before a leftward cut sits half a step to the right');
}

// 2. carry, both signs
{
  const [pos, neg, byCut] = P.carry;
  result(mirrored(pos, neg), 'carry: v0 < 0 is the mirror image of v0 > 0');
  result(close(neg[1].v, -40) && Math.abs(neg[140].v) < 0.01, 'carry: a leftward carry opens at v0 and comes to rest (no residual drift: CARRY.residual60 0)', `${neg[140].v.toFixed(4)}`);
  result(neg.slice(1).every((s) => s.v <= 0) && byCut.slice(1).every((s) => s.v <= 0), 'carry: it never drifts back against the carried move');
  result(close(byCut[1].v, -35), 'carry: ratio x a negative vCut opens leftward', byCut[1].v.toFixed(2));
  const xs = P.cut.map((s) => s.x);
  const d = xs.slice(1).map((x, i) => x - xs[i]);
  result(d.every((s) => s < 0), 'carriedCut: a leftward cut moves left on every frame either side of the cut', `min step ${Math.max(...d).toFixed(3)}`);
}

// 3. settle
{
  const [s60, s60n, s30, s8] = P.settle;
  const vs = s60.map((s) => s.v);
  const at = (k) => s60[k];
  result(vs.slice(61).every((v) => v === 0) && s60.slice(60).every((s) => s.x === at(60).x), 'settle 60: still from frame 60 on, x stays put', `v59 ${vs[59].toExponential(2)}`);
  const free = P.carry[0];
  result(s60.slice(0, 37).every((s, i) => close(s.x, free[i].x) && close(s.v, free[i].v)), 'settle 60: before its 24 f ease the curve is the free carry');
  const jumps = vs.slice(2).map((v, i) => Math.abs(v - vs[i + 1]));
  const easeJumps = jumps.slice(34);
  result(Math.max(...easeJumps) < 0.02 * 40, 'settle: no step in speed on the way to rest (< 2 % of v0 a frame)', `max ${Math.max(...easeJumps).toFixed(3)}`);
  result(vs.slice(37, 61).every((v, i, a) => i === 0 || v <= a[i - 1] + 1e-12) && vs.slice(37, 61).every((v) => v >= 0), 'settle: the speed falls monotonically to 0 without reversing');
  result(mirrored(s60, s60n), 'settle: a leftward carry settles as the mirror image');
  const v30 = s30.map((s) => s.v);
  result(v30.slice(46).every((v) => v === 0) && v30[44] > 0, 'settle at 30 fps: 90 frames at 60 fps = rest at frame 45', `v44 ${v30[44].toFixed(4)}`);
  result(s8.slice(9).every((s) => s.v === 0) && close(s8[1].v, 40, 40 * 0.1), 'settle shorter than its ease: the ease shrinks to fit and the first step stays near v0', s8[1].v.toFixed(2));
  const sx = P.shot;
  result(sx.slice(50).every((x) => x === sx[50]) && sx[49] < sx[1] && sx[1] < 0, 'carryShot: a settled channel locks the camera (x still from its settle on)');
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
