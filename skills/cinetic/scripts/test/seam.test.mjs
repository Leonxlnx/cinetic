#!/usr/bin/env node
/**
 * seam.test.mjs: fx/Seam (the seam helper) at its house numbers, and lib/cadence restAfter.
 *
 *   1. exitEnter: the outgoing layer accelerates away along the travel (each step bigger than the last), fades and blurs
 *      to 11 px, is gone during the 3 f of empty ground; the incoming layer rises into place from 20 px and a blur and
 *      lands at rest (offset 0, opacity 1, sharp) 20 f@60 after the seam frame; the same in seconds at 30 fps.
 *   2. textSwap: blur swap (the old line gone 3 f@60 after the seam frame, the new line sharp in 13 f, the slot kept:
 *      no offset); push (the old line ends one pitch up at 40 % and stays, the new one lands in the slot); ink (the new
 *      word inks from 0 to 1 at the same place).
 *   3. velocityCut: the exit's step grows x1.15-1.35 a frame over the last 8-12 f@60 and is fastest on the last frame;
 *      the incoming step is 0.7 of it in the same direction and decays to a fifth in 12-24 f@60, never reversing; the
 *      layer is home 24 f@60 after the cut; both sides smear only above 9 px/f@60.
 *   4. matchCut and zoomThrough: the outgoing shot pushes in (zoomThrough at about x1.07 a frame at the cut), the
 *      incoming shot opens smaller than its rest, grows without reversing and settles at scale 1; the first incoming
 *      log step continues the outgoing one (match cut: equal; zoom through: a third).
 *   5. blurThrough: the outgoing blur peaks at 32 px on the last frame, the incoming one starts at 32 px and is sharp in
 *      13 f@60; sharedElement: the element's box runs from `from` to `to` (log size), the surroundings cross under it.
 *   6. seamDeclares: the timeline seam names the recipe in its id (exitEnter:..., velocityCut:...), the kind the checks
 *      know, the direction, and for a velocity cut its cut speed in px per film frame and the 0.7 ratio.
 *   7. lib/cadence restAfter: a float lock on the landing frame, held 8-15 f@60 (house 12), the ramp given.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/seam.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/seam.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as S from '${url('fx/Seam.tsx')}';
import * as C from '${url('lib/cadence.ts')}';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const f60 = { fps: 60, width: 1920, height: 1080 } as any;
const f30 = { fps: 30, width: 1920, height: 1080 } as any;
const at = 100;
const st = (recipe: any, film: any, a: number, b: number, more: any = {}) => range(a, b).map((f) => S.seamState(f, { recipe, at, ...more }, film));
const ee60 = st('exitEnter', f60, 70, 125);
const ee30 = st('exitEnter', f30, 85, 112);
const tsBlur = st('textSwap', f60, 90, 120);
const tsPush = st('textSwap', f60, 95, 125, { variant: 'push', pitch: 120 });
const tsInk = st('textSwap', f60, 98, 120, { variant: 'ink' });
const vc = st('velocityCut', f60, 70, 140, { dir: 'left', v: 48 });
const mc = st('matchCut', f60, 85, 140);
const zt = st('zoomThrough', f60, 70, 150);
const bt = st('blurThrough', f60, 80, 120);
const se = st('sharedElement', f60, 80, 130, { fromBox: { x: 100, y: 100, w: 100, h: 100 }, toBox: { x: 900, y: 500, w: 400, h: 200 } });
const decl = {
  ee: S.seamDeclares({ recipe: 'exitEnter', at, id: 'line-2' }, f60),
  vc: S.seamDeclares({ recipe: 'velocityCut', at, dir: 'up', v: 48, id: 'rise' }, f30),
  ts: S.seamDeclares({ recipe: 'textSwap', at, id: 'swap' }, f60),
  mc: S.seamDeclares({ recipe: 'matchCut', at }, f60),
};
const span = S.seamSpan({ recipe: 'exitEnter', at }, f60);
const rests = [C.restAfter(240.4), C.restAfter(240, { frames60: 30 }), C.restAfter(240, { frames60: 4, rampS: 0.1 })];
console.log(JSON.stringify({ ee60, ee30, tsBlur, tsPush, tsInk, vc, mc, zt, bt, se, decl, span, rests, SEAM: S.SEAM, REST: C.REST }));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-seam-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 32 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const AT = 100;

// 1. exitEnter
{
  const S = P.ee60; // frames 70..125
  const g = (f) => S[f - 70];
  const outY = [];
  for (let f = 82; f < 97; f++) outY.push(g(f).out.y);
  const steps = outY.slice(1).map((y, i) => outY[i] - y); // travel up: y falls
  result(steps.every((d) => d >= -1e-9) && steps.slice(-4).every((d, i, a) => i === 0 || d >= a[i - 1] - 1e-9), 'exitEnter: the outgoing layer moves away along the travel, faster each frame into its end', JSON.stringify(steps.map((x) => +x.toFixed(2))));
  result(g(96).out.blur > 0.6 * P.SEAM.exitEnter.blur && g(96).out.blur < P.SEAM.exitEnter.blur && g(96).out.opacity < 0.1, 'exitEnter: the outgoing layer ends blurred toward 11 px and faded', JSON.stringify(g(96).out));
  result(!g(97).out.show && !g(99).out.show && !g(99).in.show, 'exitEnter: 3 f@60 of empty ground between the two (only the ground shows)');
  const land = g(120).in;
  result(g(100).in.show && g(100).in.y > 19 && g(100).in.blur > 10 && close(land.y, 0, 1e-6) && close(land.opacity, 1, 1e-6) && land.blur < 1e-6, 'exitEnter: the incoming layer rises 20 px from a blur and lands at rest 20 f@60 after the seam frame', JSON.stringify([g(100).in, land]));
  const T = P.ee30; // frames 85..112 at 30 fps: the same seconds
  result(T[110 - 85].in.y === 0 && T[100 - 85].in.y > 19 && !T[99 - 85].out.show, 'exitEnter at 30 fps: the same seam in seconds (lands 10 frames after the seam frame)');
  result(P.span[0] === 82 && P.span[1] === 120, 'seamSpan: an exit-then-enter spans exit + gap before the seam frame and the entry after it', JSON.stringify(P.span));
}

// 2. textSwap
{
  const B = P.tsBlur; // 90..120
  const g = (f) => B[f - 90];
  result(g(94).out.show && g(94).out.blur < 0.5 && !g(103).out.show && g(101).out.blur > 6, 'textSwap blur: the old line blurs out over 8 f@60, 3 of them under the new line', JSON.stringify([g(94).out, g(101).out]));
  result(close(g(100).in.blur, 12, 1e-6) && g(113).in.blur < 1e-6 && close(g(113).in.opacity, 1, 1e-6), 'textSwap blur: the new line from a 12 px blur to sharp in 13 f@60');
  result(B.every((s) => s.out.x === 0 && s.out.y === 0 && s.in.x === 0 && s.in.y === 0), 'textSwap blur: the slot is kept (no offset on either line)');
  const Pu = P.tsPush; // 95..125
  const end = Pu[125 - 95];
  result(close(end.out.y, -120, 1e-3) && close(end.out.opacity, 0.4, 1e-3) && end.out.show && close(end.in.y, 0, 1e-6), 'textSwap push: the old line ends one pitch up at 40 % and stays, the new line lands in the slot', JSON.stringify(end));
  const I = P.tsInk; // 98..120
  result(!I[0].in.show && I[2].in.ink === 0 && close(I[118 - 98].in.ink, 1, 1e-6) && I.every((s) => s.in.x === 0 && s.in.y === 0), 'textSwap ink: the new word inks from pale to its colour in 16 f@60 at the same place');
}

// 3. velocityCut
{
  const V = P.vc; // 70..140
  const g = (f) => V[f - 70];
  const x = (f) => (f < AT ? g(f).out.x : g(f).in.x);
  const step = (f) => x(f) - x(f - 1);
  const outSteps = [];
  for (let f = 88; f <= 99; f++) outSteps.push(step(f));
  const growth = outSteps.slice(1).map((s, i) => s / outSteps[i]);
  result(outSteps.every((s) => s < 0) && growth.every((q) => q >= 1.15 && q <= 1.35), 'velocityCut: the exit step grows x1.15-1.35 a frame over the last 12 f@60', JSON.stringify(growth.map((q) => +q.toFixed(3))));
  result(close(-outSteps[outSteps.length - 1], 48, 0.5), 'velocityCut: the last outgoing step is the cut speed (48 px/f@60)', String(outSteps[outSteps.length - 1]));
  // the incoming steps, the first one into the seam frame (the incoming state is defined before it too)
  const inSteps = range(100, 140).map((f) => g(f).in.x - g(f - 1).in.x);
  result(inSteps.every((s) => s < 0) && inSteps.slice(1).every((s, i) => Math.abs(s) <= Math.abs(inSteps[i]) + 1e-9), 'velocityCut: the incoming shot moves the same way and its step decays without reversing', JSON.stringify(inSteps.slice(0, 6).map((s) => +s.toFixed(2))));
  const s0 = Math.abs(inSteps[0]);
  const fifth = inSteps.findIndex((s) => Math.abs(s) <= 0.2 * s0);
  result(close(s0 / 48, 0.7, 0.01) && fifth >= 12 && fifth <= 24, 'velocityCut: the incoming step opens at 0.7 of the cut speed and falls to a fifth in 12-24 f@60', `first ${s0.toFixed(2)} (x${(s0 / 48).toFixed(2)}), fifth after ${fifth} f`);
  result(close(g(124).in.x, 0, 1e-6), 'velocityCut: the incoming layer is home 24 f@60 after the cut (then creeps on)', String(g(124).in.x));
  const sm = V.filter((s) => s.out.smear !== 0 || s.in.smear !== 0);
  result(sm.every((s) => Math.abs(s.out.smear || s.in.smear) > 9 && (s.out.smear || s.in.smear) < 0) && sm.length > 0 && sm.length < 30, 'velocityCut: the smear runs only above 9 px/f@60, signed along the travel', `${sm.length} frames`);
}

// 4. matchCut and zoomThrough
{
  const M = P.mc; // 85..140
  const g = (f) => M[f - 85];
  const ls = (f) => Math.log(f < AT ? g(f).out.scale : g(f).in.scale);
  const lastOut = ls(99) - ls(98);
  const firstIn = ls(101) - ls(100); // the incoming shot's own first step
  const ratio = firstIn / lastOut;
  result(g(99).out.scale > 1.03 && g(100).in.scale < 1 && ratio > 0.9 && ratio < 1.6 && range(101, 140).every((f) => ls(f) >= ls(f - 1) - 1e-12) && close(g(140).in.scale, 1, 1e-3), 'matchCut: the push in carries across the cut (the incoming shot grows at the outgoing step) and settles into its rest without reversing', `out ${lastOut.toFixed(5)} in ${firstIn.toFixed(5)}`);
  const Z = P.zt; // 70..150
  const z = (f) => Z[f - 70];
  const lz = (f) => Math.log(f < AT ? z(f).out.scale : z(f).in.scale);
  const rate = Math.exp(lz(99) - lz(98));
  const third = (lz(101) - lz(100)) / (lz(99) - lz(98));
  result(rate > 1.06 && rate < 1.08 && Math.abs(third - 1 / 3) < 0.02 && close(z(150).in.scale, 1, 1e-3), 'zoomThrough: the push runs x1.07 a frame into the cut, the next shot continues at a third of it and settles', `rate ${rate.toFixed(4)}, ratio ${third.toFixed(3)}`);
}

// 5. blurThrough and sharedElement
{
  const B = P.bt; // 80..120
  const g = (f) => B[f - 80];
  result(close(g(99).out.blur, 32 * (1 - 1 / 14) ** 2, 1e-6) && g(99).out.blur > 27 && close(g(100).in.blur, 32, 1e-6) && g(113).in.blur < 1e-6, 'blurThrough: the outgoing blur peaks near 32 px into the cut, the incoming one starts at 32 px and is sharp in 13 f@60');
  result(g(100).in.scale > 1 && range(101, 120).every((f) => g(f).in.scale <= g(f - 1).in.scale + 1e-12), 'blurThrough: the incoming shot still shrinks after the cut and settles (the outgoing move carried)');
  const E = P.se; // 80..130
  const e = (f) => E[f - 80];
  const b0 = e(88).box;
  const b1 = e(118).box;
  const mid = e(103).box;
  result(close(b0.x, 100, 1e-6) && close(b1.x, 900, 1e-6) && close(b1.w, 400, 1e-6) && mid.w > 100 && mid.w < 400, 'sharedElement: the element runs from fromBox to toBox over 30 f@60, never cut', JSON.stringify([b0, mid, b1]));
  result(e(99).out.opacity < 0.1 && e(112).in.opacity > 0.99 && e(100).in.show && !e(100).out.show, 'sharedElement: the old surroundings leave in 12 f, the new ones arrive in 12 f');
}

// 6. declarations
{
  const ee = P.decl.ee.seams[0];
  const vc = P.decl.vc.seams[0];
  result(ee.id === 'exitEnter:line-2' && ee.kind === 'breath' && ee.at === AT, 'seamDeclares: the id names the recipe (exitEnter:line-2), on the seam frame', JSON.stringify(ee));
  result(vc.id === 'velocityCut:rise' && vc.kind === 'velocity' && vc.carry === 'y' && vc.dir === -1 && close(vc.v, 96, 1e-6) && vc.ratio === 0.7, 'seamDeclares: a velocity cut declares its axis, direction, cut speed in px per film frame (96 at 30 fps) and ratio', JSON.stringify(vc));
  result(P.decl.ts.seams[0].id === 'textSwap:swap' && P.decl.mc.seams[0].id === 'matchCut:seam' && P.decl.mc.seams[0].carry === 'scale', 'seamDeclares: textSwap and matchCut name their recipe');
}

// 7. restAfter
{
  const [a, b, c] = P.rests;
  result(a.at === 240 && close(a.holdS, 12 / 60) && close(a.rampS, P.REST.rampS), 'restAfter: a lock on the landing frame, held the house 12 f@60', JSON.stringify(a));
  result(close(b.holdS, 15 / 60) && close(c.holdS, 8 / 60) && c.rampS === 0.1, 'restAfter: the hold is kept to 8-15 f@60, the ramp as given', JSON.stringify([b, c]));
}

console.log(failed ? `seam.test: ${failed} failed` : 'seam.test: all pass');
process.exit(failed ? 1 : 0);

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
