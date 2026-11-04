#!/usr/bin/env node
/**
 * tokens.test.mjs: the house motion vocabulary of the Remotion starter (src/lib/anim.ts and the
 * lib/ helpers built on it) against the house numbers.
 *
 *   1. Easing tokens: every role token within MAE 0.005 of its house curve at t = .1 ... .9 (and at
 *      least 7 of the 9 points inside the house band); E.linear exactly t; whipBuild's peak speed at
 *      t .55-.62; buildIn and launchIn accelerating like expIn at x1.11 (26 f) and x1.16 (29 f) a
 *      frame (+-0.02); jump 0.42 and 0.66 (+-0.02) after one and two frames of 22 f; every token
 *      carries a family; the 1.1 names keep their 1.1 shapes and name a replacement that exists.
 *   2. Special curves (M): job names only, each with a family, at most 20.
 *   3. Springs: every 1.2 preset's zeta (+-0.01), overshoot (+-1 pp of its range) and 2 % settle
 *      (+-2 f at 60 fps) as Remotion's spring() renders them; the 1.1 presets keep their configs.
 *   4. Tables and the retuned pace: the house numbers the components default to; the type roles are the calm family
 *      (TYPE_FAMILY), the measured numbers of lib/look.ts TYPE_LOOK, with the bold family beside it.
 *   5. Helpers: perFrame, expIn/expOut, the velocity-carry halves (launch, carry: closed form against
 *      their frame-by-frame sums), creep, intoCut, overlapAt, leadBy, the cadence helpers, defocusMix,
 *      the colour additions, and the film context (filmDefaults() throws under CINETIC_STRICT_FILM=1,
 *      and a helper given its fps does not).
 *
 * It runs src/lib through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/tokens.test.mjs [--verbose]
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
const REMOTION = join(STARTER, 'node_modules', 'remotion', 'dist', 'esm', 'index.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/tokens.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
if (!existsSync(TSX) || !existsSync(REMOTION)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

// ---- the house curve table: progress at t = .1 ... .9, with the band each point should sit in ----
const HOUSE = {
  snapOut: { median: [0.497, 0.725, 0.826, 0.884, 0.924, 0.949, 0.965, 0.978, 0.989], low: [0.469, 0.695, 0.802, 0.871, 0.914, 0.94, 0.964, 0.978, 0.989], high: [0.517, 0.734, 0.837, 0.895, 0.933, 0.959, 0.975, 0.986, 0.995] },
  glideOut: { median: [0.331, 0.547, 0.701, 0.794, 0.861, 0.911, 0.947, 0.971, 0.988], low: [0.282, 0.516, 0.669, 0.77, 0.839, 0.895, 0.928, 0.957, 0.98], high: [0.373, 0.588, 0.736, 0.831, 0.889, 0.932, 0.96, 0.983, 0.995] },
  settleOut: { median: [0.249, 0.433, 0.581, 0.694, 0.778, 0.845, 0.9, 0.943, 0.974], low: [0.208, 0.404, 0.549, 0.664, 0.75, 0.824, 0.882, 0.928, 0.967], high: [0.274, 0.465, 0.61, 0.716, 0.806, 0.871, 0.923, 0.96, 0.985] },
  softOut: { median: [0.163, 0.314, 0.45, 0.554, 0.652, 0.733, 0.818, 0.89, 0.947], low: [0.138, 0.276, 0.405, 0.522, 0.617, 0.708, 0.785, 0.857, 0.927], high: [0.197, 0.364, 0.478, 0.593, 0.687, 0.77, 0.847, 0.919, 0.963] },
  liftOut: { median: [0.09, 0.279, 0.539, 0.737, 0.845, 0.911, 0.952, 0.976, 0.99], low: [0.044, 0.244, 0.486, 0.684, 0.8, 0.88, 0.929, 0.96, 0.983], high: [0.126, 0.339, 0.598, 0.785, 0.879, 0.939, 0.967, 0.985, 0.995] },
  stdInOut: { median: [0.04, 0.127, 0.316, 0.55, 0.756, 0.871, 0.924, 0.962, 0.986], low: [0.02, 0.076, 0.232, 0.489, 0.695, 0.837, 0.897, 0.944, 0.975], high: [0.063, 0.169, 0.358, 0.577, 0.812, 0.909, 0.948, 0.975, 0.992] },
  strongInOut: { median: [0.021, 0.059, 0.123, 0.281, 0.552, 0.78, 0.891, 0.953, 0.984], low: [0.012, 0.042, 0.096, 0.221, 0.494, 0.737, 0.856, 0.933, 0.973], high: [0.036, 0.087, 0.18, 0.331, 0.603, 0.823, 0.92, 0.967, 0.991] },
  whipBuild: { median: [0.017, 0.041, 0.083, 0.143, 0.279, 0.522, 0.757, 0.902, 0.976], low: [0.01, 0.029, 0.057, 0.107, 0.195, 0.451, 0.691, 0.839, 0.942], high: [0.029, 0.07, 0.105, 0.174, 0.336, 0.578, 0.816, 0.944, 0.983] },
  softIn: { median: [0.046, 0.1, 0.154, 0.24, 0.318, 0.415, 0.541, 0.68, 0.837], low: [0.03, 0.079, 0.135, 0.205, 0.287, 0.382, 0.505, 0.631, 0.809], high: [0.069, 0.14, 0.202, 0.274, 0.359, 0.453, 0.585, 0.737, 0.871] },
  buildIn: { median: [0.018, 0.042, 0.08, 0.133, 0.194, 0.286, 0.412, 0.571, 0.77], low: [0.01, 0.03, 0.061, 0.104, 0.17, 0.256, 0.371, 0.531, 0.734], high: [0.026, 0.058, 0.099, 0.157, 0.231, 0.33, 0.441, 0.621, 0.814] },
  launchIn: { median: [0.011, 0.025, 0.047, 0.076, 0.117, 0.178, 0.27, 0.407, 0.627], low: [0.005, 0.017, 0.032, 0.059, 0.097, 0.152, 0.231, 0.362, 0.573], high: [0.018, 0.036, 0.062, 0.091, 0.141, 0.207, 0.309, 0.444, 0.669] },
  anticipate: { median: [-0.052, -0.034, 0.046, 0.365, 0.609, 0.77, 0.865, 0.927, 0.967], low: [-0.079, -0.053, -0.003, 0.283, 0.477, 0.634, 0.73, 0.803, 0.896], high: [-0.013, 0.001, 0.104, 0.409, 0.674, 0.798, 0.881, 0.949, 0.982] },
};
const FAMILY = {
  snapOut: 'arrive', glideOut: 'arrive', settleOut: 'arrive', softOut: 'arrive', liftOut: 'arrive', jump: 'arrive',
  stdInOut: 'reposition', strongInOut: 'reposition', whipBuild: 'reposition', anticipate: 'reposition',
  softIn: 'leave', buildIn: 'leave', launchIn: 'leave', linear: 'linear',
};
// the 1.1 names and their 1.1 shapes (cubic beziers; expo is expOut(6))
const LEGACY = {
  out: [0.16, 1, 0.3, 1], outSoft: [0.22, 1, 0.36, 1], in: [0.7, 0, 0.84, 0], exit: [0.55, 0.055, 0.675, 0.19],
  inOut: [0.87, 0, 0.13, 1], smooth: [0.65, 0, 0.35, 1], ui: [0.4, 0, 0.2, 1], cam: [0.48, 0.1, 0, 0.9],
  glide: [0.47, 0.2, 0.15, 1], rest: [0.45, 0, 0.1, 1], contact: [0.55, 0, 0.9, 0.55], whip: [0.6, 0, 0.15, 1],
  dolly: [0.35, 0, 0.65, 1], type: [0.5, 1, 0.89, 1], expo: 'expOut6',
};
const SPR11 = {
  snap: { damping: 18, stiffness: 260, mass: 0.7 }, pop: { damping: 11, stiffness: 180, mass: 0.6 }, soft: { damping: 26, stiffness: 120, mass: 1 },
  heavy: { damping: 30, stiffness: 90, mass: 1.4 }, firm: { damping: 24, stiffness: 140, mass: 1 }, micro: { damping: 30, stiffness: 500, mass: 0.6 },
  land: { damping: 14.5, stiffness: 200, mass: 1 }, word: { damping: 20, stiffness: 170, mass: 0.9 }, detent: { damping: 24, stiffness: 380, mass: 0.6 },
  calm: { damping: 16, stiffness: 64, mass: 1 },
};
// the 1.2 presets: zeta, overshoot range and 2 % settle at 60 fps (the house table)
const SPR12 = {
  critical: { k: 170, c: 26, zeta: 1.0, os: [0, 0], settle: 27 }, criticalFast: { k: 400, c: 40, zeta: 1.0, os: [0, 0], settle: 18 },
  criticalSlow: { k: 60, c: 15.5, zeta: 1.0, os: [0, 0], settle: 45 }, landing: { k: 244, c: 18.3, zeta: 0.59, os: [0.09, 0.11], settle: 23 },
  softLanding: { k: 145, c: 16, zeta: 0.66, os: [0.04, 0.07], settle: 30 }, menu: { k: 910, c: 39, zeta: 0.65, os: [0.06, 0.1], settle: 12 },
  containerPop: { k: 4274, c: 71, zeta: 0.54, os: [0.12, 0.13], settle: 6 }, wordDrop: { k: 864, c: 33.3, zeta: 0.57, os: [0.11, 0.12], settle: 12 },
  lazyWheel: { k: 100, c: 10.1, zeta: 0.5, os: [0.15, 0.17], settle: 49 }, logoSwing: { k: 68, c: 8.24, zeta: 0.5, os: [0.16, 0.18], settle: 59 },
};

// ---- the probe: runs inside the starter's TypeScript, prints numbers as JSON --------------------
const url = (p) => pathToFileURL(join(SRC, p)).href;
const PROBE = `
import * as A from '${url('lib/anim.ts')}';
import * as F from '${url('lib/film.ts')}';
import * as H from '${url('lib/handoff.ts')}';
import * as C from '${url('lib/cadence.ts')}';
import * as D from '${url('lib/defocus.ts')}';
import * as K from '${url('lib/color.ts')}';
import * as L from '${url('lib/look.ts')}';
import * as PC from '${url('lib/pace.ts')}';
import * as T from '${url('brand/tokens.ts')}';
import { Easing } from '${pathToFileURL(REMOTION).href}';
const mode = process.argv[2];
const grid = (fn: (t: number) => number, n = 100) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
const tryIt = (fn: () => unknown) => { try { fn(); return 'ok'; } catch (e) { return 'threw: ' + String((e as Error).message).slice(0, 80); } };
if (mode === 'strict') {
  console.log(JSON.stringify({
    filmDefaults: tryIt(() => F.filmDefaults()),
    hitPulseNoFps: tryIt(() => A.hitPulse(5)),
    hitPulseFps: tryIt(() => A.hitPulse(5, 2, 5, 30)),
    carryNoFps: tryIt(() => H.carry(10, 0, { v0: 10 })),
    carryFps: tryIt(() => H.carry(10, 0, { v0: 10, fps: 30 })),
    springNoFps: tryIt(() => A.spr(10, 0, A.SPR.critical)),
    stepFrameFps: tryIt(() => C.stepFrame(10, { animFps: 16, filmFps: 24 })),
    fpsOfGiven: tryIt(() => F.fpsOf({ fps: 25 })),
  }));
} else {
  const tok = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, e]) => {
    const t = e as A.Token;
    return [k, { family: t.family, token: t.token, deprecated: t.deprecated ?? null, grid: grid(t), dense: grid(t, 2000) }];
  }));
  const springs = Object.fromEntries(Object.keys(A.SPR).map((k) => [k, Array.from({ length: 600 }, (_, f) => A.spr(f, 0, (A.SPR as Record<string, A.Spr>)[k], 60))]));
  const legacy = { out: [0.16, 1, 0.3, 1], outSoft: [0.22, 1, 0.36, 1], in: [0.7, 0, 0.84, 0], exit: [0.55, 0.055, 0.675, 0.19], inOut: [0.87, 0, 0.13, 1], smooth: [0.65, 0, 0.35, 1], ui: [0.4, 0, 0.2, 1], cam: [0.48, 0.1, 0, 0.9], glide: [0.47, 0.2, 0.15, 1], rest: [0.45, 0, 0.1, 1], contact: [0.55, 0, 0.9, 0.55], whip: [0.6, 0, 0.15, 1], dolly: [0.35, 0, 0.65, 1], type: [0.5, 1, 0.89, 1] } as Record<string, number[]>;
  const legacyRef = Object.fromEntries(Object.entries(legacy).map(([k, p]) => [k, grid(Easing.bezier(p[0], p[1], p[2], p[3]))]));
  legacyRef.expo = grid(A.expOut(6));
  // velocity carry: closed form vs frame-by-frame sums
  const series = [1.5, 2, 3, 4.5, 7, 11, 18, 30, 60]; // an accelerating build into a cut (px/f), oldest first
  const ratios = series.slice(1).map((v, i) => v / series[i]);
  const launchSteps = Array.from({ length: 12 }, (_, i) => { const f = 100 - 11 + i; return H.launch(f, 100, { vCut: 60, ratios, fps: 24, fpsRef: 24 }); });
  const launchFrac = H.launch(99.5, 100, { vCut: 60, ratios, fps: 24, fpsRef: 24 });
  const launchGeo = Array.from({ length: 30 }, (_, i) => H.launch(100 - i, 100, { vCut: 40, ratio: 1.15, fps: 60 }).x);
  const launchExp = Array.from({ length: 10 }, (_, i) => H.launch(100 - i, 100, { vCut: 50, a: 0.8, p: 0.8, fps: 24, fpsRef: 24 }).v);
  const carryX = Array.from({ length: 100 }, (_, n) => H.carry(100 + n, 100, { v0: 40, decay: 0.89, fast: { share: 0.6, decay: 0.4 }, residual: 0.75, fps: 60 }));
  const carryFrac = H.carry(103.5, 100, { v0: 40, fps: 60 });
  const carry30 = Array.from({ length: 60 }, (_, n) => H.carry(100 + n, 100, { v0: 40, residual: 0.75, fps: 30 }).v); // a residual given explicitly (the house lands: CARRY.residual60 0)
  console.log(JSON.stringify({
    E: tok(A.E), M: tok(A.M), E_DEPRECATED: A.E_DEPRECATED, legacyRef,
    SPR: A.SPR, SPR_META: A.SPR_META, SPR_DEPRECATED: A.SPR_DEPRECATED, springs,
    DUR: A.DUR, PRESS: A.PRESS, TAU: A.TAU, STAG: A.STAG, ACCEL: A.ACCEL, CPS: A.CPS, SPEED: A.SPEED, CARRY: A.CARRY, BREATH: A.BREATH, OVERSIZE: A.OVERSIZE,
    PACE: A.PACE, READ_WPS: PC.READ_WPS, holds: Object.fromEntries(Object.entries(A.PACE).map(([k, p]) => [k, [2, 3, 4, 5, 6, 7].map((n) => [A.revealFor(n, p), A.holdFor(n, p)])])), TYPE: T.TYPE, TYPE_FAMILY: T.TYPE_FAMILY, TYPE_LOOK: L.TYPE_LOOK, LIGHT: L.LIGHT, RECIPE_GROUND: L.RECIPE.tintedPaper.ground,
    perFrame: A.perFrame(0.89, 60, 30), expIn: grid(A.expIn(2.66), 10), expOut: grid(A.expOut(6), 10),
    hitPulse30: A.hitPulse(4, 2, 5, 30), hitPulse60: A.hitPulse(8, 2, 5, 60),
    series, launchSteps, launchFrac, launchGeo, launchExp, carryX, carryFrac, carry30,
    creepPct: H.creep(90, 30, { pctPerSec: 0.06 }, 60), creepPx: H.creep(90, 30, { pxPerSec: 30 }, 60), drift: H.drift(90, 30, 30, 60),
    intoCut: [H.intoCut(84, 100, 16, 60), H.intoCut(92, 100, 16, 60), H.intoCut(100, 100, 16, 60)],
    overlapAt: H.overlapAt({ from: 0, to: 30, ease: A.E.linear }, 0.9), leadBy: H.leadBy(100, 20, 30),
    stepFrame16in24: Array.from({ length: 24 }, (_, f) => C.stepFrame(f, { animFps: 16, filmFps: 24 })),
    onTwos: Array.from({ length: 6 }, (_, f) => C.onTwos(f)),
    accel: C.accel(7, 18, 6), reading: C.reading(['Built', 'on', 'the', 'beat'], 12), readingLong: C.reading(['a', 'extraordinary', 'b'], 10, { whole: false }),
    irregular: C.irregular('collage', 12, 4, 1, 10), irregularAgain: C.irregular('collage', 12, 4, 1, 10),
    defocus: [D.defocusMix(0.3), D.defocusMix(1.25), D.defocusMix(5), D.defocusMix(100)], defocusLevels: D.DEFOCUS_LEVELS,
    mixRgb: [K.mixRgb('#000000', '#ffffff', 0.5), K.mixRgb('#08965a', '#0d0e10', 0), K.mixRgb('#08965a', '#0d0e10', 1)],
    accentT: [K.accentT(17, 0, { fps: 60 }), K.accentT(18, 0, { fps: 60 }), K.accentT(24.5, 0, { fps: 60 }), K.accentT(31, 0, { fps: 60 }), K.accentT(9, 0, { fps: 30 })],
    pathColor: [K.pathColor(['#000000', '#808080', '#ffffff'], 0), K.pathColor(['#000000', '#808080', '#ffffff'], 0.5), K.pathColor(['#000000', '#808080', '#ffffff'], 1)],
    oklchRound: K.toOklch(K.oklch(0.6, 0.1, 150)),
  }));
}
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-tokens-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const run = (mode, env = {}) => {
  const r = spawnSync(process.execPath, [TSX, probeFile, mode], { encoding: 'utf8', cwd: STARTER, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log(`FAIL  the probe (${mode}) did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
    rmSync(TMP, { recursive: true, force: true });
    process.exit(1);
  }
  return JSON.parse(r.stdout.trim().split('\n').pop());
};
const P = run('normal', { CINETIC_STRICT_FILM: '' });
const S = run('strict', { CINETIC_STRICT_FILM: '1' });
rmSync(TMP, { recursive: true, force: true });

const at = (g, t) => g[Math.round(t * 100)];
const mae = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const close = (a, b, tol) => Math.abs(a - b) <= tol;
const T9 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

// 1. easing tokens
for (const [name, h] of Object.entries(HOUSE)) {
  const e = P.E[name];
  if (!e) { result(false, `E.${name} exists`); continue; }
  const got = T9.map((t) => at(e.grid, t));
  const m = mae(got, h.median);
  const inBand = got.filter((v, i) => v >= h.low[i] - 1e-9 && v <= h.high[i] + 1e-9).length;
  result(m <= 0.005, `E.${name} within MAE 0.005 of the house curve`, `MAE ${m.toFixed(5)}`);
  result(inBand >= 7, `E.${name} inside the house band at >= 7 of 9 points`, `${inBand}/9`);
}
{
  const lin = P.E.linear;
  const worst = Math.max(...lin.grid.map((v, i) => Math.abs(v - i / 100)));
  result(worst < 1e-12, 'E.linear is exactly t', `max |e(t) - t| ${worst}`);
}
{
  const d = P.E.whipBuild.dense;
  let best = 0;
  let bv = -1;
  for (let i = 0; i < d.length - 1; i++) if (d[i + 1] - d[i] > bv) { bv = d[i + 1] - d[i]; best = (i + 0.5) / (d.length - 1); }
  result(best >= 0.55 && best <= 0.62, 'E.whipBuild peaks at t .55-.62', `peak at ${best.toFixed(3)}`);
}
{
  // growth a frame of the best-fitting expIn: k from least squares over t = .1 ... .9, growth e^(k / frames)
  const expIn = (k) => (t) => (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  const fitK = (g) => {
    let best = 0;
    let bv = Infinity;
    for (let k = 0.5; k <= 10; k += 0.0005) {
      const s = T9.reduce((a, t) => a + (expIn(k)(t) - at(g, t)) ** 2, 0);
      if (s < bv) { bv = s; best = k; }
    }
    return best;
  };
  const gb = Math.exp(fitK(P.E.buildIn.grid) / 26);
  const gl = Math.exp(fitK(P.E.launchIn.grid) / 29);
  result(close(gb, 1.11, 0.02), 'E.buildIn accelerates x1.11 a frame at 26 f (+-0.02)', `x${gb.toFixed(4)}`);
  result(close(gl, 1.16, 0.02), 'E.launchIn accelerates x1.16 a frame at 29 f (+-0.02)', `x${gl.toFixed(4)}`);
}
{
  const j = P.E.jump.dense;
  const one = j[Math.round((1 / 22) * 2000)];
  const two = j[Math.round((2 / 22) * 2000)];
  result(close(one, 0.42, 0.02) && close(two, 0.66, 0.02), 'E.jump: 0.42 after one frame of 22, 0.66 after two (+-0.02)', `${one.toFixed(3)}, ${two.toFixed(3)}`);
}
for (const [name, fam] of Object.entries(FAMILY)) result(P.E[name]?.family === fam && P.E[name]?.token === name, `E.${name} is tagged ${fam}`, `${P.E[name]?.family}/${P.E[name]?.token}`);
{
  const untagged = Object.entries(P.E).filter(([, e]) => !['arrive', 'reposition', 'leave', 'linear'].includes(e.family));
  result(untagged.length === 0, 'every E token carries a family', untagged.map(([k]) => k).join(', '));
}
for (const [name, shape] of Object.entries(LEGACY)) {
  const e = P.E[name];
  const ref = P.legacyRef[name];
  const worst = e ? Math.max(...e.grid.map((v, i) => Math.abs(v - ref[i]))) : Infinity;
  result(worst < 1e-9, `E.${name} keeps its 1.1 shape`, `${shape === 'expOut6' ? 'expOut(6)' : `bezier(${shape.join(', ')})`}, max diff ${worst}`);
}
{
  const bad = Object.entries(P.E_DEPRECATED).filter(([k, v]) => !P.E[v] || P.E[v].deprecated || !LEGACY[k]);
  const expected = Object.keys(LEGACY).filter((k) => k !== 'type' && k !== 'expo');
  const missing = expected.filter((k) => !P.E_DEPRECATED[k]);
  result(bad.length === 0 && missing.length === 0, 'every deprecated 1.1 name points at a current token', [...bad.map(([k, v]) => `${k}->${v}`), ...missing.map((k) => `${k}: none`)].join(', '));
}

// 2. special curves
{
  const names = Object.keys(P.M);
  const bad = names.filter((k) => !/^[a-z][a-zA-Z]+$/.test(k) || !['arrive', 'reposition', 'leave', 'linear'].includes(P.M[k].family) || P.M[k].token !== `M.${k}`);
  result(names.length > 0 && names.length <= 20, 'M holds at most 20 special curves', `${names.length}`);
  result(bad.length === 0, 'every M curve has a job name (letters only) and a family', bad.join(', '));
  const flat = names.filter((k) => Math.abs(P.M[k].grid[0]) > 1e-9 || Math.abs(P.M[k].grid[100] - 1) > 1e-9);
  result(flat.length === 0, 'every M curve runs from 0 to 1', flat.join(', '));
}

// 3. springs
for (const [name, s] of Object.entries(SPR12)) {
  const cfg = P.SPR[name];
  if (!cfg) { result(false, `SPR.${name} exists`); continue; }
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * (cfg.mass ?? 1)));
  const xs = P.springs[name];
  const os = Math.max(0, Math.max(...xs) - 1);
  let settle = 0;
  for (let f = 0; f < xs.length; f++) if (Math.abs(xs[f] - 1) > 0.02) settle = f + 1;
  result(cfg.stiffness === s.k && cfg.damping === s.c && (cfg.mass ?? 1) === 1, `SPR.${name} is ${s.k} / ${s.c}`, JSON.stringify(cfg));
  result(close(zeta, s.zeta, 0.01), `SPR.${name} zeta ${s.zeta} (+-0.01)`, zeta.toFixed(3));
  result(os >= s.os[0] - 0.01 && os <= s.os[1] + 0.01, `SPR.${name} overshoot ${s.os.map((v) => `${v * 100}%`).join('-')} (+-1 pp)`, `${(os * 100).toFixed(2)}%`);
  result(Math.abs(settle - s.settle) <= 2, `SPR.${name} settles (2 %) in ${s.settle} f at 60 fps (+-2 f)`, `${settle} f`);
  const meta = P.SPR_META[name];
  result(!!meta && close(meta.zeta, s.zeta, 0.01) && meta.settle60 === s.settle && meta.overshoot[0] === s.os[0] && meta.overshoot[1] === s.os[1], `SPR_META.${name} documents the same numbers`);
}
for (const [name, cfg] of Object.entries(SPR11)) {
  const got = P.SPR[name];
  result(!!got && got.damping === cfg.damping && got.stiffness === cfg.stiffness && (got.mass ?? 1) === cfg.mass, `SPR.${name} keeps its 1.1 config`);
  result(!!P.SPR[P.SPR_DEPRECATED[name]] && !SPR11[P.SPR_DEPRECATED[name]], `SPR.${name} names a 1.2 replacement`, P.SPR_DEPRECATED[name]);
}

// 4. tables and the retuned pace
result(P.DUR.word[2] === 32 && P.DUR.exit[2] === 24 && P.DUR.whip[2] === 32 && P.DUR.hold[2] === 76, 'DUR medians (word 32, exit 24, whip 32, hold 76)');
result(P.PRESS.squeeze === 9 && P.PRESS.hold === 3 && P.PRESS.release === 10, 'PRESS 9 / 3 / 10');
result(P.TAU.marker === 3 && P.TAU.element === 8 && P.TAU.hero === 17 && P.TAU.world === 30 && P.TAU.exitUi === 6 && P.TAU.exitCamera === 19, 'TAU 3 / 8 / 17 / 30 / 6 / 19');
result(P.STAG.word[2] === 10 && P.STAG.letter[2] === 4 && P.ACCEL.rows.join() === '18,18,14,10,8,6,6' && P.ACCEL.typing.join() === '5,2,2,1,1,1', 'STAG and ACCEL');
result(P.CPS.human.house === 30 && P.CPS.prompt.start === 5 && P.CPS.prompt.end === 19 && P.CPS.stream.max === 150, 'CPS: human 30, prompt 5 -> 19, stream <= 150');
result(P.CARRY.ratio[1] === 0.7 && P.CARRY.decay60[1] === 0.89 && P.CARRY.residual60 === 0 && P.SPEED.residualAfterCut === 45 && P.OVERSIZE.from[0] === 1.28, 'CARRY (a carry lands: residual 0), SPEED, OVERSIZE');
{
  const c = P.PACE.calm;
  const k = P.PACE.crisp;
  const okCalm = c.wordDur === 28 && c.ease === 'snapOut' && c.rise === 0.33 && c.riseUnit === 'line' && c.riseDur === 22 && c.blur === 0 && c.stagger === 11 && c.cadence === 'reading'
    && c.exit === 'auto' && c.exitDur === 15 && c.exitFade === 9 && c.recentre === 'jump' && c.recentreDur === 19 && c.recentreLead === 0
    && c.accentHold === 16 && c.accentCool === 12 && c.accentSpace === 'oklab' && c.fx.typeFPerChar === 2 && c.fx.iris === 16 && c.fx.irisMode.ratio === 1.28;
  const okCrisp = k.wordDur === 23 && k.riseDur === 19 && k.stagger === 8 && k.blur === 0 && k.exitDur === 12 && k.exitFade === 7 && k.recentreDur === 14 && k.accentHold === 6 && k.accentCool === 12 && k.fx.mask.stagger === 7;
  const holds = c.holdBase === 36 && c.holdPerWord === 7 && c.holdMin === 52 && c.readMax === 150 && k.holdBase === 28 && k.holdPerWord === 6 && k.holdMin === 36 && k.readMax === 120;
  result(okCalm, 'pace calm: 28 f on snapOut, rise a third of the line over 22 f, 11 f apart on the reading cadence, exit 15 f, jump 19 f, accent 16 + 12 f');
  result(okCrisp, 'pace crisp: 23 f, 19 f rise, 8 f apart, no blur, exit 12 f, jump 14 f, accent 6 + 12 f');
  result(holds, 'pace holds about 12 % under 1.1 (calm max(52, 36 + 7 f a word), crisp max(36, 28 + 6 f a word)); the check bound readMax stays 150 / 120');
  // the reading floor: a line of n words (2-7) is on screen from its first word to its exit for n / READ_WPS seconds or more
  const short = [];
  for (const [name, rows] of Object.entries(P.holds)) rows.forEach(([reveal, hold], i) => {
    const n = i + 2;
    if (reveal + hold < (n * 60) / P.READ_WPS) short.push(`${name} ${n} words: ${reveal + hold} f`);
  });
  result(P.READ_WPS === 3 && short.length === 0, 'every pace keeps the reading floor: reveal + hold >= n words at 3 a second, for 2-7 words', short.join('; '));
  // faster than 1.1, by about 10-15 % on a typical line (4 words), and the stagger never under reveal-rate's 8 f a word
  const v11 = { calm: 32 + 36 + 74, crisp: 26 + 24 + 60 };
  const gain = Object.fromEntries(Object.entries(P.holds).map(([name, rows]) => [name, +(1 - (rows[2][0] + rows[2][1]) / v11[name]).toFixed(3)]));
  result(Object.values(gain).every((g) => g >= 0.08 && g <= 0.16) && Object.values(P.PACE).every((p) => p.stagger >= 8), 'a 4-word line is 8-16 % quicker than 1.1, staggers >= 8 f', JSON.stringify(gain));
}
{
  const t = P.TYPE;
  const sizes = (o) => ['ui', 'caption', 'line', 'display', 'hero', 'giant'].map((k) => o[k].size).join();
  result(sizes(t) === '40,46,84,160,200,640' && t.secondary.size === 48, 'TYPE roles (calm) ui 40, caption 46, line 84, display 160, hero 200, giant 640 (secondary kept)', sizes(t));
  const same = ['ui', 'caption', 'line', 'display', 'hero', 'giant'].every((k) => JSON.stringify(t[k]) === JSON.stringify(P.TYPE_LOOK[P.TYPE_FAMILY][k]));
  result(P.TYPE_FAMILY === 'calm' && same, 'TYPE is TYPE_LOOK[TYPE_FAMILY], the calm family, number for number');
  const c = P.TYPE_LOOK.calm, b = P.TYPE_LOOK.bold;
  result(c.line.track === 0 && c.line.weight === 450 && c.line.lead === 1.2 && Math.abs(c.ui.track) <= 0.02 && Math.abs(c.giant.track) <= 0.03,
    'calm: a regular-weight sentence line at the letter fit of its face (track 0, lead 1.2); small and giant sizes within 0.03 em of it');
  result(sizes(b) === '40,46,120,200,240,900' && b.line.weight === 600 && ['line', 'display', 'hero', 'giant'].every((k, i, a) => b[k].track < 0 && (i === 0 || b[k].track <= b[a[i - 1]].track)),
    'bold: line 120 / display 200 / hero 240 / giant 900, semibold, tracking tightening with size', sizes(b));
  result([c, b].every((f) => new Set(Object.values(f).map((r) => r.weight)).size === 2), 'each family uses two weights');
  result(P.LIGHT.dL[0] === 0.05 && P.LIGHT.dL[1] === 0.2 && P.LIGHT.maxC === 0.13 && P.LIGHT.poolSpeedPxS === 240, 'LIGHT band: dL 0.05-0.20, C <= 0.13, pools 240 px/s');
  result(P.RECIPE_GROUND[0] >= 0.93 && P.RECIPE_GROUND[0] <= 0.99 && P.RECIPE_GROUND[1] <= 0.015, 'RECIPE tinted paper ground in L .93-.99, C <= .015');
}

// 5. helpers
result(close(P.perFrame, 0.89 ** 2, 1e-12), 'perFrame: a 60 fps ratio at 30 fps is squared', P.perFrame.toFixed(4));
result(P.expIn[0] === 0 && P.expIn[10] === 1 && close(P.expIn[5], (Math.exp(1.33) - 1) / (Math.exp(2.66) - 1), 1e-9) && close(P.expOut[1], (1 - Math.exp(-0.6)) / (1 - Math.exp(-6)), 1e-9), 'expIn / expOut closed forms');
result(close(P.hitPulse30, P.hitPulse60, 1e-12), 'hitPulse lasts the same time at 30 and 60 fps');
{
  // launch with explicit ratios reproduces its series step for step, and the cut frame is the fastest
  const steps = P.launchSteps.map((s) => s.v);
  const want = [P.series[0], ...P.series].slice(-12); // frames 89 .. 100: the earlier frames repeat the first ratio backwards
  const tail = steps.slice(-9);
  const worst = Math.max(...tail.map((v, i) => Math.abs(v - P.series[i])));
  const pos = P.launchSteps.map((s) => s.x);
  const contiguous = pos.slice(1).every((x, i) => Math.abs(x - pos[i] - steps[i + 1]) < 1e-9);
  result(worst < 1e-9 && P.launchSteps[11].x === 0 && contiguous, 'launch(ratios) reproduces a build into the cut frame for frame', `steps ${tail.map((v) => v.toFixed(1)).join(', ')}`);
  result(close(P.launchFrac.x, -0.5 * 60, 1e-9), 'launch: half a frame before the cut sits half the cut step back', P.launchFrac.x.toFixed(2));
  const geoSteps = P.launchGeo.slice(0, -1).map((x, i) => x - P.launchGeo[i + 1]);
  const ratiosOk = geoSteps.slice(0, 20).every((s, i) => i === 0 || close(geoSteps[i - 1] / s, 1.15, 1e-9));
  result(ratiosOk && close(geoSteps[0], 40, 1e-9), 'launch(ratio 1.15): a geometric build ending at vCut');
  const e = P.launchExp;
  result(e.every((v, i) => close(v, 50 * Math.exp(-0.8 * i ** 0.8), 1e-9)), 'launch(a, p): steps vCut * exp(-a k^p)');
  void want;
}
{
  // carry: closed form equals the frame-by-frame sum; first step v0; decays to the residual
  const c = P.carryX;
  const step = (n) => 0.75 + (40 - 0.75) * (0.6 * 0.4 ** (n - 1) + 0.4 * 0.89 ** (n - 1));
  let sum = 0;
  let worst = 0;
  for (let n = 1; n < c.length; n++) { sum += step(n); worst = Math.max(worst, Math.abs(c[n].x - sum), Math.abs(c[n].v - step(n))); }
  result(worst < 1e-9 && c[0].x === 0 && close(c[1].v, 40, 1e-9), 'carry: closed form = frame-by-frame sum, first step v0', `max diff ${worst.toExponential(2)}`);
  result(close(c[99].v, 0.75, 0.01), 'carry: settles to the residual drift (0.75 px/f at 60 fps)', c[99].v.toFixed(3));
  result(c[3].x < P.carryFrac.x && P.carryFrac.x < c[4].x, 'carry: fractional frames sit between their neighbours');
  // at 30 fps the 60 fps shape converts: residual 1.5 px a frame, the slow tail decaying 0.89^2 a frame
  const v30 = P.carry30;
  const tailRatio = (v30[51] - 1.5) / (v30[50] - 1.5);
  result(close(tailRatio, 0.89 ** 2, 1e-6) && close(v30[59], 1.5, 0.01), 'carry at 30 fps: the 60 fps decays and residual converted per frame', `tail x${tailRatio.toFixed(4)}, residual ${v30[59].toFixed(3)}`);
}
result(close(P.creepPct, 1.06, 1e-12) && close(P.creepPx, 30, 1e-12) && close(P.drift, 30, 1e-12), 'creep 6 %/s and 30 px/s, drift 30 px/s over 1 s');
result(P.intoCut[0] === 0 && P.intoCut[1] > 0 && P.intoCut[1] < 0.2 && P.intoCut[2] === 1, 'intoCut: 0 at the lead, launchIn to 1 on the cut', P.intoCut.map((v) => v.toFixed(3)).join(', '));
result(close(P.overlapAt, 27, 1e-6) && close(P.leadBy, 90, 1e-12), 'overlapAt 90 % of a linear 30 f move = 27; leadBy 20 f@60 at 30 fps = 10 f');
{
  const s = P.stepFrame16in24;
  const h = s.map((v, i) => (i > 0 && v === s[i - 1] ? 1 : 0));
  let held = 0;
  let windows = 0;
  for (let i = 1; i + 3 <= s.length; i++) { windows++; if (h[i] + h[i + 1] + h[i + 2] === 1) held++; }
  const holds = h.reduce((a, b) => a + b, 0);
  result(holds === 8 && held === windows, 'stepFrame 16 in 24: one held frame in every 3', `${holds} held of 24, ${held}/${windows} windows with exactly one`);
  result(P.onTwos.join() === '0,0,2,2,4,4', 'onTwos holds every pose for 2 frames');
}
{
  const a = P.accel;
  const gaps = a.onsets.slice(1).map((v, i) => v - a.onsets[i]);
  result(a.onsets[0] === 0 && gaps[0] === 18 && gaps[gaps.length - 1] === 6 && gaps.every((g, i) => i === 0 || g <= gaps[i - 1]), 'accel: gaps 18 -> 6, never growing', gaps.join(', '));
  const r = P.reading;
  result(r[0] === 0 && r.length === 4 && r.every((v) => Number.isInteger(v)), 'reading: whole-frame onsets from 0', r.join(', '));
  const rl = P.readingLong;
  result(close(rl[2] - rl[1], 14, 1e-9) && close(rl[1], 7, 1e-9), 'reading: gaps clamp to 0.7-1.4x of the base', rl.map((v) => v.toFixed(1)).join(', '));
  const ir = P.irregular;
  const mean = ir.reduce((x, y) => x + y, 0) / ir.length;
  result(ir.every((g) => Number.isInteger(g) && g >= 1 && g <= 10) && close(mean, 4, 0.5) && ir.join() === P.irregularAgain.join() && new Set(ir).size > 2, 'irregular: whole frames 1-10, mean 4, the same every time', ir.join(','));
}
{
  const [d03, d125, d5, d100] = P.defocus;
  const sum = (m) => m.reduce((s, c) => s + c.weight, 0);
  result([d03, d125, d5, d100].every((m) => m.length >= 1 && m.length <= 2 && close(sum(m), 1, 1e-9)), 'defocusMix: one or two copies, weights sum to 1');
  result(d100.length === 1 && d100[0].level === P.defocusLevels[P.defocusLevels.length - 1], 'defocusMix: above the ladder, the top level alone');
  result(d03.some((c) => c.level === 0), 'defocusMix: under the first level it mixes with the sharp layer');
}
result(P.mixRgb[0] === 'rgb(128, 128, 128)' && P.mixRgb[1] === 'rgb(8, 150, 90)' && P.mixRgb[2] === 'rgb(13, 14, 16)', 'mixRgb: linear in gamma sRGB, exact ends', P.mixRgb.join(' '));
result(P.accentT[0] === 0 && P.accentT[1] === 0 && close(P.accentT[2], 0.5, 1e-9) && P.accentT[3] === 1 && P.accentT[4] === 0, 'accentT: holds 18 f, cools linearly over 13 f (60 fps; the same seconds at 30)', P.accentT.map((v) => v.toFixed(2)).join(', '));
result(P.pathColor[0] === 'rgb(0, 0, 0)' && P.pathColor[1] === 'rgb(128, 128, 128)' && P.pathColor[2] === 'rgb(255, 255, 255)', 'pathColor: passes through its stops', P.pathColor.join(' '));
result(close(P.oklchRound[0], 0.6, 0.01) && close(P.oklchRound[1], 0.1, 0.01) && close(P.oklchRound[2], 150, 2), 'oklch -> rgb -> oklch round trip', P.oklchRound.map((v) => v.toFixed(3)).join(', '));
// the film context
result(S.filmDefaults.startsWith('threw') && S.hitPulseNoFps.startsWith('threw') && S.carryNoFps.startsWith('threw') && S.springNoFps.startsWith('threw'), 'CINETIC_STRICT_FILM=1: a helper without its film context throws', `${S.filmDefaults}`);
result(S.hitPulseFps === 'ok' && S.carryFps === 'ok' && S.stepFrameFps === 'ok' && S.fpsOfGiven === 'ok', 'CINETIC_STRICT_FILM=1: a helper given its fps runs');

if (verbose) console.log(JSON.stringify({ M: Object.keys(P.M), deprecated: P.E_DEPRECATED }, null, 1));
process.exit(failed ? 1 : 0);
