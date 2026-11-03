#!/usr/bin/env node
/**
 * moves.test.mjs: the signature moves of the Remotion starter (src/lib/moves.ts) against their measured numbers.
 *
 *   1. snapSettle: 0 before the event, 0.69 one 30 fps frame later (0.63-0.70 for a line re-centre), 1 after six; the
 *      same seconds at 24, 30 and 60 fps; snapShare keeps its first share and never overshoots.
 *   2. wordRise: half the rise gone by frame 2, frame 1 already reads (opacity 0.6-0.8), full by frame 3, the smear only on
 *      the first frames (6 -> 3 -> 0 px for a 40 px rise), at rest after 16 frames; it scales with the frame (960 wide: half).
 *   3. arrivalTint: the accent for 2 frames, the ink after 8; popIn: 0.2 -> 1.03 overshoot -> 1, opacity full by 4 f@60.
 *   4. whipExit / whipEntry: the speed doubles every 30 fps frame and peaks on the frame before the cut; the entry starts
 *      at 0.9-1.0 of that speed in the same direction and brakes to rest; smear = half the frame's travel.
 *   5. landIn: starts at its scale and offset with full opacity, springs home; flyFromLens: shrinks on a log scale with
 *      the blur resolving, never below 1; pressSquash: down on the press, back to 1.
 *   6. holdTail: one way only (never turns back, never stops before `until`), 0.3-2 px per 30 fps frame; scaleCreep
 *      compounds; nothing in the module is periodic (no idle bob).
 *   7. ladder, makeRoom (59-73 % on the first frame), clickBloom, selectRing, glyphSweep (<= 25 frames), rimStreak.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/moves.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/moves.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as M from '${url('lib/moves.ts')}';
import * as X from '${url('fx/Moves.tsx')}';
const f30 = { fps: 30, width: 1920, height: 1080 };
const f60 = { fps: 60, width: 1920, height: 1080 };
const f24 = { fps: 24, width: 1920, height: 1080 };
const half = { fps: 30, width: 960, height: 540 };
const R = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
console.log(JSON.stringify({
  snap30: R(0, 12).map((f) => M.snapSettle(100 + f - 1, 100, f30)),
  snap60: R(0, 24).map((f) => M.snapSettle(200 + f - 2, 200, f60)),
  snap24: [M.snapSettle(10 + 0.8, 10, f24), M.snapSettle(10 + 4.8, 10, f24)],
  share: R(0, 20).map((f) => M.snapShare(50 + f, 50, f30, 0.4)),
  rise: R(0, 20).map((f) => M.wordRise(10 + f, 10, { rise: 40 }, f30)),
  riseBefore: M.wordRise(9, 10, { rise: 40 }, f30),
  riseHalf: M.wordRise(11, 10, { rise: 40 }, half),
  riseFor: [M.riseFor(80), M.riseFor(80, 'voice')],
  tint: R(0, 12).map((f) => M.arrivalTint(20 + f, 20, { accent: '#ff0000', ink: '#000000' }, f30)),
  heat: M.arrivalTint(20 + 5, 20, { accent: '#ffcc00', ink: '#000000', via: ['#ff5522'] }, f30),
  pop: R(0, 20).map((f) => M.popIn(30 + f, 30, f60)),
  popModal: R(0, 20).map((f) => M.popIn(30 + f, 30, f60, { from: 0.69, over: 0 })),
  exit: R(0, 12).map((f) => M.whipExit(100 - 11 + f, 100, f30)),
  exit60: R(0, 24).map((f) => M.whipExit(200 - 23 + f, 200, f60)),
  entry: R(0, 20).map((f) => M.whipEntry(100 + f, 100, f30)),
  land: R(0, 30).map((f) => M.landIn(40 + f, 40, { scale: 1.17, offset: { x: 70 } }, f30)),
  lens: R(0, 24).map((f) => M.flyFromLens(5 + f, 5, f30)),
  press: R(0, 20).map((f) => M.pressSquash(60 + f, 60, f30)),
  pressBtn: M.pressSquash(61, 60, f30, { kind: 'button' }),
  tail: R(0, 120).map((f) => M.holdTail(10 + f, 10, f30, { until: 100 })),
  tail60: [M.holdTail(10 + 40, 10, f60), M.holdTail(5 + 20, 5, f30)],
  creep: [M.scaleCreep(0, 0, f30), M.scaleCreep(10, 0, f30), M.scaleCreep(10, 0, f30, { pct: -0.4 })],
  ladder: R(0, 5).map((n) => M.ladder(n, f30)),
  arrive: R(0, 8).map((f) => M.ladderArrive(f, 0, f30)),
  room: R(0, 10).map((f) => M.makeRoom(f, 0, 100, f30)),
  bloom: R(0, 20).map((f) => M.clickBloom(f, 0, f30)),
  ring: R(0, 10).map((f) => M.selectRing(f, 0, f30)),
  sweep: R(0, 40).map((f) => M.glyphSweep(f, 0, 900, f30)),
  sweepLong: R(0, 40).map((f) => M.glyphSweep(f, 0, 3000, f30)),
  streak: R(0, 26).map((f) => M.rimStreak(f, 0, { w: 400, h: 200 }, f30)),
  house: M.MOVES,
  build30: X.buildFrames({ at: 6, every: 7, words: ['a', 'b', 'c'] }, 30),
  build60: X.buildFrames({ at: 12, every: 7, words: ['a', 'b', 'c'] }, 60),
  buildAts: X.buildFrames({ at: 0, ats: [3, 9, 20], words: ['a', 'b', 'c'] }, 30),
  decl: X.declares({ cut: 40, dir: 'left', id: 'w' }),
  declUp: X.declares({ cut: 10, dir: 'down' }),
  declNone: X.declares(),
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-moves-'));
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
const mono = (xs, dir = 1) => xs.every((x, i) => i === 0 || dir * (x - xs[i - 1]) >= -1e-9);

// 1. snap
{
  const s = P.snap30; // s[k] = frame at + k - 1
  result(s[0] === 0 && close(s[2], 0.69) && s[7] === 1 && mono(s), 'snapSettle: 0 before, 0.69 on the first 30 fps frame, 1 after six, never back', s.slice(0, 9).join(' '));
  result(close(P.snap60[4], 0.69) && close(P.snap60[2], 0) && P.snap60[14] === 1, 'snapSettle: the same seconds at 60 fps', P.snap60.slice(0, 8).join(' '));
  result(P.snap24[0] > 0.6 && P.snap24[1] > 0.96, 'snapSettle: the same seconds at 24 fps', P.snap24.join(' '));
  result(close(P.share[1], 0.4) && mono(P.share) && P.share.every((x) => x <= 1) && P.share[20] === 1, 'snapShare: its first share on frame 1, a geometric tail, no overshoot', P.share.slice(0, 6).join(' '));
}
// 2. word rise
{
  const w = P.rise;
  result(!P.riseBefore.visible && w[0].visible && close(w[0].dy, 40), 'wordRise: hidden before its frame, at the full rise on its first frame');
  result(w[2].dy <= 20 && w[1].opacity >= 0.6 && w[0].opacity >= 0.6 && w[0].opacity <= 0.8 && w[3].opacity === 1, 'wordRise: half the rise gone by frame 2; frame 1 already reads; full by frame 3',
    w.slice(0, 4).map((x) => `${x.dy.toFixed(1)}/${x.opacity.toFixed(2)}`).join(' '));
  result(close(w[0].smear, 6) && close(w[1].smear, 3) && w[2].smear === 0 && w.slice(2).every((x) => x.smear === 0), 'wordRise: the vertical smear 6 -> 3 -> 0 px for a 40 px rise, first frames only');
  result(w[16].dy === 0 && mono(w.map((x) => x.dy), -1), 'wordRise: at rest after 16 frames, rising only');
  result(close(P.riseHalf.dy, w[1].dy / 2, 1e-6), 'wordRise: px scale with the frame (half size, half the rise)');
  result(close(P.riseFor[0], 41.6) && close(P.riseFor[1], 19.2), 'riseFor: statement 0.52 x size, voice 0.24 x size');
}
// 3. tint, pop
{
  const t = P.tint;
  result(t[0] === '#ff0000' && t[2] === '#ff0000' && t[8] === '#000000' && t[5] !== t[2] && t[5] !== t[8], 'arrivalTint: the accent holds 2 frames, drains over 6, ink after 8', t.join(' '));
  result(typeof P.heat === 'string' && P.heat !== '#000000' && P.heat !== '#ffcc00', 'arrivalTint: a heat ramp walks its stops', P.heat);
  const s = P.pop.map((p) => p.scale);
  const peak = Math.max(...s);
  result(close(s[0], 0.2) && close(peak, 1.03, 0.002) && close(s[19], 1) && P.pop[4].opacity === 1, 'popIn: 0.2 -> one 3 % overshoot -> 1.0 over 14 f@60, opacity full by 4 f', s.map((x) => x.toFixed(3)).join(' '));
  const m = P.popModal.map((p) => p.scale);
  result(close(m[0], 0.69) && Math.max(...m) <= 1 + 1e-9 && close(m[19], 1), 'popIn: a modal from 0.69 with no overshoot');
}
// 4. whips
{
  const e = P.exit; // e[11] = the frame before the cut... e[k] = frame cut - 11 + k; cut-1 = k 10
  const v = e.map((x) => x.v);
  const peakAt = v.indexOf(Math.max(...v));
  result(peakAt === 10 && close(v[10], 140, 1e-6), 'whipExit: the speed peaks (140 px/f at 1080p) on the frame before the cut', v.map((x) => x.toFixed(1)).join(' '));
  result(close(v[10] / v[9], 2, 1e-6) && close(v[9] / v[8], 2, 1e-6), 'whipExit: the speed doubles every 30 fps frame');
  result(close(P.exit60[22].v * 2, 140, 1e-6) && close(P.exit60[22].v / P.exit60[20].v, 2, 1e-6), 'whipExit: at 60 fps the same speed per second, doubling every 2 frames');
  result(close(e[10].smear, e[10].v / 2), 'whipExit: smear = half the frame travel');
  const n = P.entry;
  result(n[0].v / v[10] >= 0.9 && n[0].v / v[10] <= 1.0 && n[0].x < 0, 'whipEntry: enters at 0.9-1.0 of the exit speed, short of its place, in the same direction', `${(n[0].v / v[10]).toFixed(3)}`);
  result(mono(n.map((x) => x.x)) && n[19].x === 0 && mono(n.map((x) => x.v), -1), 'whipEntry: brakes on an expo to rest, never overshooting');
}
// 5. land, lens, press
{
  const l = P.land;
  result(close(l[0].scale, 1.17) && close(l[0].x, 70) && l[0].opacity === 1, 'landIn: cuts in at 1.17x and 70 px off, opacity full on frame 1');
  result(Math.abs(l[29].scale - 1) < 0.002 && Math.abs(l[29].x) < 0.5, 'landIn: springs home within a second', `${l[29].scale} ${l[29].x}`);
  result(l.some((x) => x.smear > 0) && l.slice(15).every((x) => x.smear === 0), 'landIn: smear on the fast frames only');
  const z = P.lens;
  result(close(z[0].scale, 3) && close(z[0].blur, 20) && close(z[0].opacity, 0.45) && z[23].scale === 1 && z[23].blur === 0 && z[23].yaw === 0,
    'flyFromLens: 3x, 20 px blur, 0.45 opacity, 18 deg yaw at the lens; home and sharp after 20 frames');
  result(mono(z.map((x) => x.scale), -1) && z.every((x) => x.scale >= 1) && z[2].scale / z[1].scale < z[12].scale / z[11].scale, 'flyFromLens: shrinks on a log scale, decelerating, never below 1');
  const p = P.press;
  result(p[0] === 0.8 && p[2] === 0.8 && p[19] > 0.995 && P.pressBtn === 0.9, 'pressSquash: cursor 0.8 for 3 frames (button 0.9), springs back to 1', p.slice(0, 8).map((x) => x.toFixed(3)).join(' '));
}
// 6. the hold tail: one way, never still before until, in the measured band; no periodic move in the module
{
  const t = P.tail;
  const d = t.slice(1).map((x, i) => x - t[i]);
  result(mono(t) && t[0] === 0, 'holdTail: one way only (never turns back)');
  result(d.slice(0, 89).every((x) => x >= 0.3 - 1e-9 && x <= 2 + 1e-9), 'holdTail: 0.3-2 px per 30 fps frame until the next event', `${d[0].toFixed(2)} .. ${d[88].toFixed(2)}`);
  result(d.slice(90).every((x) => x === 0), 'holdTail: holds its offset after `until` for the next move to take over');
  result(close(P.tail60[0], P.tail60[1], 1e-9), 'holdTail: the same seconds at 60 fps');
  result(P.creep[0] === 1 && P.creep[1] > 1.019 && P.creep[1] < 1.021 && P.creep[2] < 1, 'scaleCreep: 0.2 %/f compounds (x1.02 after 10 f); a negative creep shrinks');
}
// 7. ladder, room, light
{
  const L = P.ladder;
  result(L[0].blur === 0 && L[1].blur === 2.5 && L[4].blur === 9 && L[4].brightness === 0.7 && close(L[2].scale, 0.943 ** 2), 'ladder: blur 0/2.5/3/3.5/9, light 1/.92/.85/.78/.70, scale .943^n');
  result(close(P.arrive[0], 6) && P.arrive[6] === 0 && mono(P.arrive, -1), 'ladderArrive: 6 px to 0 in 6 frames');
  result(P.room[1] >= 59 && P.room[1] <= 73 && P.room[9] === 100 && mono(P.room), 'makeRoom: 59-73 % on the first frame, then the tail', P.room.join(' '));
  const b = P.bloom;
  result(b[0] && close(b[0].r, 150) && close(b[0].opacity, 0.5) && b[18] === null && b[17].r < 580, 'clickBloom: 150 px at half intensity, growing toward 580 px, gone after 18 frames');
  const g = P.ring;
  result(g[0] && close(g[0].out, 6) && g[9].out > 23.5 && g[9].width === 2 && g[9].glow === 14 && g[9].glowAlpha === 0.35, 'selectRing: 6 -> 24 px out, 2 px wide, a 14 px glow at 0.35');
  const sw = P.sweep.filter(Boolean);
  result(sw.length > 0 && sw.length <= 26 && mono(sw.map((x) => x.x)) && Math.max(...sw.map((x) => x.opacity)) <= 0.5 + 1e-9, 'glyphSweep: one pass left to right, peak 0.5', `${sw.length} frames`);
  result(P.sweepLong.filter(Boolean).length <= 26, 'glyphSweep: never longer than 25 frames (faster on a long span)');
  const st = P.streak.filter(Boolean);
  result(st.length >= 20 && st.every((x) => x.x >= 0 && x.x <= 400 && x.y >= 0 && x.y <= 200) && st[st.length - 1].x === 400, 'rimStreak: travels the top edge, then down the right edge, on the rim');
}

// 8. fx/Moves: the build's word frames and what a WhipCut declares
{
  result(P.build30.join() === '6,13,20' && P.build60.join() === '12,26,40' && P.buildAts.join() === '3,9,20', 'BuildLine: a word every 7 frames at 30 fps (the same seconds at 60), or explicit frames');
  const s = P.decl.seams[0];
  result(s && s.at === 40 && s.kind === 'velocity' && s.carry === 'x' && s.dir === -1 && P.declUp.seams[0].carry === 'y' && P.declUp.seams[0].dir === 1 && P.declNone.seams.length === 0,
    'WhipCut declares a velocity seam at its cut (carry and direction from dir)');
}

process.exit(failed ? 1 : 0);
