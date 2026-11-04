#!/usr/bin/env node
/**
 * transitions.test.mjs: the carried seams of the Remotion starter, at their measured house numbers.
 *
 *   1. fastRanges() / blurRanges(): only frames over the smear threshold (px/s, the same at 30 and 60 fps), padded
 *      and merged; a house whip declares its middle, never its holds.
 *   2. Wipe: a feather wipe whose edge lands a hair short of the frame still finishes on its last frame; the push
 *      wipe moves the outgoing shot before its edge enters, at 0.62 of the edge's travel in the arrival and not at
 *      all after it, peaks early and settles at 0.483 of the extent, leaves at speed, streaks its edge 0.3 of its
 *      step, never runs backwards and finishes; it declares a wipe seam (camera blur only with smear 'shutter').
 *   3. FlashCut: the slide opens at several times the whip's last speed and decays; smear 'shutter' declares the
 *      fast frames as camera blur, the house 'draw' declares none (it draws them).
 *   4. doorSplitState(): the doors follow the measured path (half their travel in the last two 24 fps frames); the
 *      element peeks before the doors move, rides up through the gap from the bottom edge a third into the doors'
 *      run with 7 % of the rise in its first 24 fps frame, never backs down, lands home.
 *   5. MatchCut: the incoming object opens one outgoing step on (position and log size), settles on its rest box
 *      with zero speed on the settle frame, its speed decays without reversing for a push into it, and it declares
 *      a morph seam carrying scale on the incoming first frame.
 *   6. IRIS_CARRY: an iris inside a moving line carries its speed: the inner line opens at 1.15 x and decays x0.65
 *      a 30 fps frame in the same direction.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/transitions.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/transitions.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as M from '${url('lib/camera-moves.ts')}';
import * as W from '${url('fx/Wipe.tsx')}';
import * as X from '${url('fx/CutFx.tsx')}';
import * as MC from '${url('fx/MatchCut.tsx')}';
import * as IR from '${url('fx/Iris.tsx')}';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const film30 = { fps: 30, width: 1920, height: 1080 } as any;
const film24 = { fps: 24, width: 1920, height: 1080 } as any;
const odd = { fps: 30, width: 1350, height: 760 } as any; // u = 0.7037...: an edge that lands a hair short
// 1. smear ranges
const speed = (f: number) => (f >= 40 && f <= 44 ? 30 : f === 46 ? 30 : 5);
const fr30 = H.fastRanges(speed, 0, 80, { fps: 30 });
const fr60 = H.fastRanges((f) => speed(f) / 2, 0, 80, { fps: 60 });
const A = { ax: 960, ay: 540, sx: 960, sy: 540, k: 1 };
const B = { ax: 2960, ay: 540, sx: 960, sy: 540, k: 1 };
const wh = M.whip({ from: A, to: B, start: 100, frames: 16, fps: 30 });
const whipBlur = M.blurRanges(wh, 80, 140, { film: film30 });
const whipSpeed = range(100, 117).map((f) => M.shotSpeed(wh, f, film30));
// 2. wipes
const fp = { start: 10, kind: 'feather' as const, to: undefined as any };
const featherOdd = W.wipeState(10 + 15, fp, odd);
const s0 = W.wipeState(10, fp, odd);
const shortP = { start: 10, kind: 'feather' as const, frames: 15, to: s0.length + s0.feather / 2 - 1e-7 };
const featherShort = range(10, 30).map((f) => W.wipeState(f, shortP, film30).done);
const push = { start: 20, kind: 'push' as const };
const pushS = range(18, 70).map((f) => W.wipeState(f, push, film30));
const pushEnd = W.wipeEnd(push, film30);
const decl = W.declares(push, film30);
const declSh = W.declares({ ...push, smear: 'shutter' }, film30);
// 3. flash cut
const fc = { cut: 60 };
const fcS = range(40, 90).map((f) => X.flashCutState(f, fc, film30));
const fcFr = X.flashCutFrames(fc, film30);
const fcDraw = X.declares(fc, film30);
const fcShut = X.declares({ ...fc, smear: 'shutter' }, film30);
// 4. door split
const door = { start: 30 };
const doorS = range(10, 70).map((f) => X.doorSplitState(f, door, film24));
const ra = doorS[0].riseAt;
const doorFirst = [X.doorSplitState(ra, door, film24).rise, X.doorSplitState(ra + 1, door, film24).rise, X.doorSplitState(ra + 3, door, film24).rise];
// 5. match cut
const from = (f: number) => { const k = Math.pow(1.09, Math.max(0, f - 80)); return { x: 900 - 50 * (k - 1), y: 300 - 130 * (k - 1), w: 100 * k, h: 260 * k }; };
const to = { x: 790, y: 60, w: 300, h: 780 }; // the packshot's rest: a little bigger than the inherited box, so the push lands
const mp = { cut: 90, from, to };
const mcS = range(85, 140).map((f) => MC.matchCutState(f, mp, film24));
const mcDecl = MC.declares(mp, film24);
const irisCarry = range(20, 34).map((f) => H.carriedCut(f, 24, { vCut: -54.8, fps: 30 }, { ratio: IR.IRIS_CARRY.ratio, decay: IR.IRIS_CARRY.decay60, fast: { share: 0, decay: 0.4 }, fps: 30 }));
console.log(JSON.stringify({ irisCarry, fr30, fr60, whipBlur, whipSpeed, featherOdd, featherShort, pushS, pushEnd, decl, declSh, fcS, fcFr, fcDraw, fcShut, doorS, doorFirst, from: range(88, 91).map(from), to, mcS, mcDecl, PUSH: W.PUSH }));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-transitions-'));
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

// 1. smear ranges
{
  const same = JSON.stringify(P.fr30.map((x) => [x.from, x.to])) === JSON.stringify(P.fr60.map((x) => [x.from, x.to]));
  result(same && P.fr30.length === 1 && P.fr30[0].from === 39 && P.fr30[0].to === 48, 'fastRanges: frames over 720 px/s, padded by one and merged; the same px/s at 30 and 60 fps', JSON.stringify(P.fr30));
  const peak = P.whipSpeed.indexOf(Math.max(...P.whipSpeed)) + 100;
  const covers = P.whipBlur.length === 1 && P.whipBlur[0].from <= peak && P.whipBlur[0].to > peak;
  result(covers && P.whipBlur[0].from > 100 && P.whipBlur[0].to < 118, 'blurRanges: a house whip declares its fast middle around the peak, not its ends', `${JSON.stringify(P.whipBlur)} peak f${peak}`);
}

// 2. wipes
{
  result(P.featherOdd.done === true, 'Wipe feather: finished on its last frame at a frame size where the edge lands a hair short');
  const firstDone = P.featherShort.indexOf(true) + 10;
  result(firstDone === 25 && P.featherShort.slice(firstDone - 10).every(Boolean), 'Wipe feather: an edge that ends short of the frame still finishes when its run ends (and stays finished)', `first done f${firstDone}`);
  const S = P.pushS; // frames 18..70
  const at = (f) => S[f - 18];
  const L = at(20).length;
  const early = S.filter((s) => s.edge < 0 && s.outX > 0);
  result(early.length >= 2, 'Wipe push: the outgoing shot is already moving before the edge enters the frame', `${early.length} frames`);
  const arrive = S.filter((s) => s.stage === 0 && s.v > 0.5);
  result(arrive.every((s) => close(s.outV, 0.62 * s.v, 1e-6)), 'Wipe push: the outgoing shot rides 0.62 of the edge step in the arrival');
  const leave = S.filter((s) => s.stage === 1);
  result(leave.length > 0 && leave.every((s) => close(s.outV, 0, 1e-9)), 'Wipe push: the outgoing shot holds still while the edge leaves');
  const arrEnd = S.find((s) => s.stage === 1);
  const prev = S[S.indexOf(arrEnd) - 1];
  result(close(prev.edge / L, 0.483, 0.01), 'Wipe push: the arrival settles at 0.483 of the extent', (prev.edge / L).toFixed(3));
  const vs = S.filter((s) => s.stage === 0).map((s) => s.v);
  const iPeak = vs.indexOf(Math.max(...vs));
  result(iPeak > 0 && iPeak < 0.35 * vs.length, 'Wipe push: the arrival builds for a few frames and peaks in its first third', `peak at ${iPeak} of ${vs.length}`);
  result(S.every((s, i) => i === 0 || s.edge >= S[i - 1].edge - 1e-9), 'Wipe push: the edge never runs backwards');
  const lv = leave.map((s) => s.v).filter((v) => v > 0);
  result(lv.length > 3 && lv[lv.length - 1] === Math.max(...lv), 'Wipe push: it leaves at speed (the last leaving step is the fastest)', lv.map((v) => v.toFixed(0)).join(','));
  const fast = S.filter((s) => s.v > 20);
  result(fast.every((s) => close(s.feather, 0.3 * s.v, 1e-6)) && S.every((s) => s.feather >= 1.5 - 1e-9), 'Wipe push: the edge streaks 0.3 of its step and never goes below 1.5 px');
  const doneAt = S.findIndex((s) => s.done) + 18;
  result(doneAt === P.pushEnd && S.slice(doneAt - 18).every((s) => s.done), 'Wipe push: finished from wipeEnd() on', `done f${doneAt} end f${P.pushEnd}`);
  result(P.decl.seams.length === 1 && P.decl.seams[0].kind === 'wipe' && P.decl.seams[0].at === 20 && P.decl.cameraBlur.length === 0, 'Wipe push: a wipe seam on its first frame; drawn smear declares no camera blur');
  result(P.declSh.cameraBlur.length > 0 && P.declSh.cameraBlur[0].from >= 19, "Wipe push: smear 'shutter' declares the pushed shot's fast frames as camera blur", JSON.stringify(P.declSh.cameraBlur));
}

// 3. flash cut
{
  const S = P.fcS; // frames 40..90
  const whip = S.filter((s) => s.phase === 'whip');
  const slide = S.filter((s) => s.phase === 'slide');
  const lastWhip = whip[whip.length - 1].v;
  result(whip.every((s, i) => i === 0 || s.v >= whip[i - 1].v - 1e-9) && lastWhip > 0, 'FlashCut: the whip accelerates into the flash');
  result(slide[0].v > 2 * lastWhip, 'FlashCut: the slide opens at several times the whip\'s last speed', `${slide[0].v.toFixed(1)} vs ${lastWhip.toFixed(1)}`);
  result(slide.slice(1).every((s, i) => s.v <= slide[i].v + 1e-9), 'FlashCut: the slide decays as it lands');
  result(P.fcDraw.cameraBlur.length === 0 && P.fcShut.cameraBlur.length >= 1 && P.fcShut.cameraBlur.every((x) => x.from < P.fcFr.flash || x.to > P.fcFr.slideFrom), "FlashCut: smear 'shutter' declares the fast frames as camera blur, 'draw' none", JSON.stringify(P.fcShut.cameraBlur));
}

// 4. door split
{
  const S = P.doorS; // frames 10..70 at 24 fps, doors start f30
  const at = (f) => S[f - 10];
  const H = 1080;
  result(close(at(10).rise, 0.817 * H, 1e-6), 'doorSplit: the element waits 0.82 of the height below its rest (its top on the bottom edge)');
  result(at(29).rise < at(10).rise - 30 && at(29).offset === 0, 'doorSplit: it peeks (rises 32 px and creeps) before the doors move', (at(10).rise - at(29).rise).toFixed(1));
  const ra = S[0].riseAt;
  const [y0, y1, y3] = P.doorFirst;
  const share1 = (y0 - y1) / y0;
  const share3 = (y0 - y3) / y0;
  result(close(ra, 30 + 12 / 3, 1e-9) && close(share1, 0.0726, 0.01) && close(share3, 0.2313, 0.01), "doorSplit: the rise starts a third into the doors' run, 7 % of it in its first 24 fps frame, 23 % by the third", `riseAt ${ra.toFixed(2)} shares ${share1.toFixed(3)} ${share3.toFixed(3)}`);
  const half = 960;
  result(close(at(40).offset / half, 0.501, 1e-3) && close(at(39).offset / half, 0.2344, 1e-3) && at(42).offset === half, 'doorSplit: the doors build geometrically and cover half their travel in the last two frames', `${(at(39).offset / half).toFixed(3)} ${(at(40).offset / half).toFixed(3)}`);
  result(S.every((s, i) => i === 0 || s.rise <= S[i - 1].rise + 1e-9) && at(70).rise === 0, 'doorSplit: the rise never backs down and lands home');
}

// 5. match cut
{
  const S = P.mcS; // frames 85..140 at 24 fps, cut 90
  const at = (f) => S[f - 85];
  const [, b89, b90] = P.from;
  const c = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, s: Math.log(Math.sqrt(b.w * b.h)) });
  const A0 = c(b89);
  const A = c(b90);
  const exp = { x: 2 * A.x - A0.x, y: 2 * A.y - A0.y, s: 2 * A.s - A0.s };
  const got = c(at(91).box);
  result(!at(90).incoming && at(91).incoming && close(got.x, exp.x, 1e-6) && close(got.y, exp.y, 1e-6) && close(got.s, exp.s, 1e-9), 'MatchCut: the incoming object opens one outgoing step on, in position and log size', `${got.x.toFixed(2)},${got.y.toFixed(2)},${Math.exp(got.s).toFixed(2)} vs ${exp.x.toFixed(2)},${exp.y.toFixed(2)},${Math.exp(exp.s).toFixed(2)}`);
  const T = 36 * 24 / 60; // 14.4 frames
  const restF = Math.ceil(91 + T);
  const rb = at(restF).box;
  result(close(rb.x, P.to.x, 1e-6) && close(rb.w, P.to.w, 1e-6) && at(restF + 1).v === 0 && at(restF).k === 1, 'MatchCut: at rest on its own layout, with zero speed, from the settle frame', `f${restF}`);
  const ks = S.slice(6).map((s) => s.k);
  const dk = ks.slice(1).map((k, i) => Math.log(k / ks[i]));
  result(dk.slice(0, 12).every((d, i) => i === 0 || d <= dk[i - 1] + 1e-12), 'MatchCut: the inherited zoom decays without reversing', dk.slice(0, 6).map((d) => d.toFixed(4)).join(','));
  const sm = P.mcDecl;
  result(sm.seams.length === 1 && sm.seams[0].at === 91 && sm.seams[0].kind === 'morph' && sm.seams[0].carry === 'scale', 'MatchCut: declares a morph seam carrying scale on the incoming first frame', JSON.stringify(sm.seams));
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
