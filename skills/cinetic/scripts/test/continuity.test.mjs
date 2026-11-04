#!/usr/bin/env node
/**
 * continuity.test.mjs: the continuous-motion helpers of the Remotion starter (lib/continuity.ts, fx/GlideStep.tsx)
 * against the motion gates they answer (forensics.py motion-snap, motion-frozen, motion-decay, motion-stop).
 *
 *   1. glideValue(): still before its step, the first frame of motion on `at`, no frame moves more than a quarter of
 *      the step (a hard step moves all of it in one), home after 16 f at 60 fps (8 at 30); steps closer than a glide
 *      blend without a jump (their speeds add: at most 1.5x one glide's fastest frame).
 *   2. glideList(): rows glide, the list rests between steps by default (a creep only when given, at most 0.2 px a
 *      60 fps frame, the same px/s at 30 fps), its speed v is the frame-to-frame travel, index counts the steps started.
 *   3. holdDrift(): still by default (0), a creep clamped into 0-0.2 px a 60 fps frame at 1080p (sub-pixel), along its
 *      angle, scaled with the frame, ended by `to`.
 *   4. landedAt() / landBeforeCut() / latestStart(): an arrival lands inside its span, a leave curve ends at speed; a
 *      cut mid-ease throws under the ship gate (CINETIC_GATE=ship or REMOTION_CINETIC_GATE=ship) and only warns in dev
 *      (the cut is returned, the problem recorded in gateIssues() once), a landed cut or a declared whip passes,
 *      latestStart() is the edge that passes.
 *   5. glideBox(): a box glides between states and lands on each; GlideStep declares nothing (it is continuous).
 *   6. E.glideOut is the curve forensics.py's self-test glides on (cubic-bezier .172, .687, .393, .943).
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/continuity.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/continuity.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as C from '${url('lib/continuity.ts')}';
import * as G from '${url('fx/GlideStep.tsx')}';
const film60 = { fps: 60, width: 1920, height: 1080 };
const film30 = { fps: 30, width: 1920, height: 1080 };
const half60 = { fps: 60, width: 960, height: 540 };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const throws = (fn: () => unknown) => { try { fn(); return ''; } catch (e) { return String((e as Error).message); } };
const env = (globalThis as any).process.env;
const gated = <T,>(mode: string | undefined, fn: () => T, key = 'CINETIC_GATE'): T => {
  const prev = env[key];
  if (mode === undefined) delete env[key]; else env[key] = mode;
  try { return fn(); } finally { if (prev === undefined) delete env[key]; else env[key] = prev; }
};
const ship = (fn: () => unknown) => gated('ship', () => throws(fn));
const steps = [{ at: 100, value: 96 }];
const list = { at: [100, 140, 180], jump: 96 };
const bz = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  let lo = 0, hi = 1;
  for (let k = 0; k < 60; k++) { const u = (lo + hi) / 2; const x = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3; if (x < t) lo = u; else hi = u; }
  const u = (lo + hi) / 2; return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
const ref = bz(0.172, 0.687, 0.393, 0.943);
const boxA = { x: 0, y: 0, w: 200, h: 40, r: 8 };
const boxB = { x: 0, y: 60, w: 320, h: 40, r: 8 };
const boxC = { x: 0, y: 120, w: 160, h: 40, r: 8 };
console.log(JSON.stringify({
  glide60: range(97, 120).map((f) => C.glideValue(f, steps, 0, {}, film60)),
  glide30: range(97, 110).map((f) => C.glideValue(f, steps, 0, {}, film30)),
  chained: range(98, 140).map((f) => C.glideValue(f, [{ at: 100, value: 96 }, { at: 106, value: 192 }, { at: 112, value: 288 }], 0, {}, film60)),
  list60: range(90, 230).map((f) => C.glideList(f, list, film60)),
  list30: range(45, 115).map((f) => C.glideList(f, { at: [50, 70, 90], jump: 96, drift: 0.2 }, film30)),
  creep60: range(130, 139).map((f) => C.glideList(f, { ...list, drift: 0.2 }, film60).y),
  over: [C.glideList(135, { ...list, drift: 0.5 }, film60).y, C.glideList(134, { ...list, drift: 0.5 }, film60).y],
  listHalf: [C.glideList(170, { ...list, drift: 0.2 }, half60).y, C.glideList(170, { ...list, drift: 0.2 }, film60).y],
  drift: {
    still: [C.holdDrift(10, 0, {}, film60), C.holdDrift(500, 0, {}, film30)],
    d60: [C.holdDrift(10, 0, { px: 0.2 }, film60), C.holdDrift(11, 0, { px: 0.2 }, film60)],
    d30: [C.holdDrift(10, 0, { px: 0.2 }, film30), C.holdDrift(11, 0, { px: 0.2 }, film30)],
    fast: C.holdDrift(10, 0, { px: 2 }, film60).x, slow: C.holdDrift(10, 0, { px: 0.1 }, film60).x,
    down: C.holdDrift(10, 0, { px: 0.2, angle: 90 }, film60), half: C.holdDrift(10, 0, { px: 0.2 }, half60).x,
    ended: [C.holdDrift(50, 0, { px: 0.2, to: 20 }, film60).x, C.holdDrift(20, 0, { px: 0.2, to: 20 }, film60).x], before: C.holdDrift(-5, 0, { px: 0.2 }, film60).x,
  },
  land: {
    glide: C.landedAt({ from: 100, dur: 34, ease: A.E.glideOut }), build: C.landedAt({ from: 100, dur: 26, ease: A.E.buildIn }),
    mid: ship(() => C.landBeforeCut({ from: 100, dur: 34, ease: A.E.glideOut, id: 'slide' }, 110)),
    remotionShip: gated('ship', () => throws(() => C.landBeforeCut({ from: 100, dur: 34, ease: A.E.glideOut, id: 'slide' }, 110)), 'REMOTION_CINETIC_GATE'),
    dev: gated(undefined, () => {
      const before = C.gateIssues().length;
      const a = throws(() => C.landBeforeCut({ from: 100, dur: 34, ease: A.E.glideOut, id: 'dev-slide' }, 110));
      const b = C.landBeforeCut({ from: 100, dur: 34, ease: A.E.glideOut, id: 'dev-slide' }, 110);
      const issues = C.gateIssues().slice(before);
      return { threw: a, returned: b, issues, mode: C.gateMode() };
    }),
    late: C.landBeforeCut({ from: 100, dur: 34, ease: A.E.glideOut }, 140),
    whip: C.landBeforeCut({ from: 100, dur: 26, ease: A.E.buildIn }, 126, { whip: true }),
    leave: ship(() => C.landBeforeCut({ from: 100, dur: 26, ease: A.E.buildIn }, 126)),
    before: C.landBeforeCut({ from: 100, dur: 34, ease: A.E.glideOut }, 90),
    edge: (() => { const s = C.latestStart(200, 34, A.E.glideOut); return { s, ok: ship(() => C.landBeforeCut({ from: s, dur: 34, ease: A.E.glideOut }, 200)), late: ship(() => C.landBeforeCut({ from: s + 1, dur: 34, ease: A.E.glideOut }, 200)) }; })(),
  },
  box: range(98, 200).map((f) => G.glideBox(f, [{ at: 100, value: boxB }, { at: 150, value: boxC }], boxA, {}, film60)),
  decl: G.declares({}, film60),
  house: { frames60: C.GLIDE.frames60, drift: C.GLIDE.driftPx60, band: C.GLIDE.driftBand, same: G.GLIDE === C.GLIDE },
  curve: range(1, 9).map((i) => [A.E.glideOut(i / 10), ref(i / 10)]),
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-continuity-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 16 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const steps = (xs) => xs.slice(1).map((x, i) => x - xs[i]);
const monotone = (xs) => xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-9);

// 1. glideValue
{
  const g = P.glide60; // frames 97..120
  const d = steps(g);
  result(g[0] === 0 && g[2] === 0 && g[3] > 0, 'glideValue: still before its step, the first frame of motion on `at`', JSON.stringify(g.slice(0, 5)));
  result(Math.max(...d) <= 0.25 * 96 && monotone(g), 'glideValue: no frame moves more than a quarter of the step (a hard step moves it all in one)', `max ${Math.max(...d).toFixed(2)} of 96`);
  result(close(g[3 + 15], 96) && g[3 + 13] < 96, 'glideValue: home 16 f after its first frame at 60 fps', JSON.stringify(g.slice(14, 20)));
  const g3 = P.glide30; // frames 97..110 at 30 fps: 8 f
  result(g3[3] > 0 && close(g3[3 + 7], 96) && g3[3 + 6] < 96, 'glideValue: the same glide covers 8 f at 30 fps', JSON.stringify(g3.slice(2, 12).map((x) => +x.toFixed(1))));
  const c = P.chained;
  const one = Math.max(...d);
  result(monotone(c) && Math.max(...steps(c)) <= 1.5 * one && close(c[c.length - 1], 288), 'glideValue: steps closer than a glide blend (overlapping speeds add, no jump) and land on the last', `max step ${Math.max(...steps(c)).toFixed(2)}, one glide ${one.toFixed(2)}`);
}
// 2. glideList
{
  const L = P.list60; // frames 90..230
  const y = L.map((s) => s.y);
  const at = (f) => L[f - 90];
  const drift = at(135).y - at(134).y;
  result(monotone(y) && close(drift, 0, 1e-9), 'glideList: rows glide, and the list rests between steps (house creep 0)', `drift ${drift}`);
  result(L.every((s, i) => i === 0 || close(s.v, s.y - L[i - 1].y)), 'glideList: v is the frame-to-frame travel (for DirBlur)');
  result(at(99).index === 0 && at(100).index === 1 && at(185).index === 3 && close(at(229).y - at(99).y - 3 * 96, 0, 1e-6), 'glideList: index counts the steps started; three rows travelled, nothing more', `${at(229).y.toFixed(2)}`);
  const L3 = P.list30;
  const d3 = L3[(80 - 45)].y - L3[(79 - 45)].y;
  result(close(d3, 0.4, 1e-6), 'glideList: a given creep is the same px/s at 30 fps (0.4 px a frame for 0.2 at 60)', `${d3}`);
  result(close(P.creep60[1] - P.creep60[0], 0.2, 1e-6), 'glideList: a creep of 0.2 px a 60 fps frame between steps when given', JSON.stringify(P.creep60.slice(0, 2)));
  result(close(P.over[0] - P.over[1], 0.2, 1e-6), 'glideList: a creep over the band is clamped to 0.2 px a 60 fps frame (sub-pixel)', JSON.stringify(P.over));
  result(close((P.listHalf[0] - 192) * 2, P.listHalf[1] - 192), 'glideList: the creep scales with the frame (jump is in frame px as given)', JSON.stringify(P.listHalf));
}
// 3. holdDrift
{
  const D = P.drift;
  result(D.still.every((s) => s.x === 0 && s.y === 0), 'holdDrift: still by default (a hold may be completely still)', JSON.stringify(D.still));
  result(close(D.d60[1].x - D.d60[0].x, 0.2) && close(D.d30[1].x - D.d30[0].x, 0.4) && close(D.d60[0].y, 0), 'holdDrift: a creep of 0.2 px a 60 fps frame at 1080p (12 px/s), 0.4 px a frame at 30 fps', JSON.stringify(D.d60));
  result(close(D.fast, 2) && close(D.slow, 1), 'holdDrift: clamped into 0-0.2 px a 60 fps frame (sub-pixel)', `${D.fast} ${D.slow}`);
  result(close(D.down.y, 2) && Math.abs(D.down.x) < 1e-9 && close(D.half, 1), 'holdDrift: along its angle, scaled with the frame', JSON.stringify(D.down));
  result(close(D.ended[0], D.ended[1]) && D.before === 0, 'holdDrift: `to` ends it (the offset stays); nothing before `from`');
}
// 4. landing before the cut
{
  const L = P.land;
  result(!L.glide.atSpeed && L.glide.frame > 100 && L.glide.frame < 134 && L.build.atSpeed, 'landedAt: an arrival lands inside its span, a leave curve ends at speed', JSON.stringify([L.glide, L.build]));
  result(/still above 10 % of its peak speed on f110/.test(L.mid) && /still above/.test(L.remotionShip) && L.late === 140 && L.before === 90, 'landBeforeCut: under the ship gate a cut mid-ease throws (with the frame it lands on), a landed or earlier cut passes', L.mid.slice(0, 90));
  result(L.dev.mode === 'dev' && L.dev.threw === '' && L.dev.returned === 110 && L.dev.issues.length === 1 && L.dev.issues[0].rule === 'landBeforeCut' && /f110/.test(L.dev.issues[0].message), 'landBeforeCut: in dev a cut mid-ease warns once and returns the cut (a module-load assert never crashes a dev render)', JSON.stringify(L.dev).slice(0, 160));
  result(L.whip === 126 && /ends at speed/.test(L.leave), 'landBeforeCut: a leave curve into the cut needs a declared whip', L.leave.slice(0, 80));
  result(L.edge.ok === '' && L.edge.late !== '', 'latestStart: the latest start that lands by the cut passes, a frame later throws', JSON.stringify(L.edge.s));
}
// 5. boxes and declarations
{
  const B = P.box; // frames 98..200
  const ys = B.map((b) => b.y);
  const dy = steps(ys).map(Math.abs);
  result(B[0].y === 0 && close(B[118 - 98].y, 60) && close(B[199 - 98].y, 120) && Math.max(...dy) <= 0.25 * 60 + 1e-9, 'glideBox: glides between states (never a quarter of a step in one frame) and lands on each', `max ${Math.max(...dy).toFixed(2)}`);
  const d = P.decl;
  result(!d.stepped.length && !d.flashes.length && !d.cameraBlur.length && !d.seams.length, 'GlideStep declares nothing: it is continuous');
  result(P.house.frames60 === 16 && P.house.drift === 0 && P.house.band[0] === 0 && P.house.band[1] === 0.2 && P.house.same, 'GLIDE: 16 f at 60 fps; holds still (creep 0, at most 0.2 px a 60 fps frame)');
}
// 6. the curve forensics.py's self-test measures
result(P.curve.every(([a, b]) => Math.abs(a - b) < 2e-3), 'E.glideOut is cubic-bezier(.172, .687, .393, .943), the glide forensics.py measures', JSON.stringify(P.curve.map(([a]) => +a.toFixed(3))));

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
