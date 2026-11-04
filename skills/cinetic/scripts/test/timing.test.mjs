#!/usr/bin/env node
/**
 * timing.test.mjs: timing that phrases instead of ticking (lib/cadence phrase, fx/Words and fx/TypePresets onsets,
 * fx/Roll countTo, lint-film even-stagger and linear-count).
 *
 *   1. phrase(): settle, rush and group keep the spread of their gaps (std / mean) at PHRASE.cv or more for 3-8 items
 *      10 f or more apart in all, hold the span of an even stagger exactly ((n - 1) x gap), never step back, and name
 *      their accent (settle: the last, rush: the lead, group: the first of the last group); groups are 2-3 items, a group
 *      of one only ever leads; the same seed gives the same run.
 *   2. fx/Words cadence 'phrase' (the house when nothing is named): the span of the even cadence, phrased; crispWords
 *      takes it.
 *   3. fx/TypePresets: mask, fall, glide and fly onsets phrased with the span (and the end frame) an even stagger had.
 *   4. fx/Roll countTo(): a count eases out (over half its value in the first fifth of its time), lands its last value
 *      on the end frame and holds it, counts tenths with `decimals`, never steps back.
 *   5. lint-film: a reveal timed `start + i * gap` warns even-stagger; countLinear capped at a value and a count on
 *      E.linear warn linear-count; the phrased reveal and countTo pass.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/timing.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  console.log('usage: node scripts/test/timing.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
import * as Cd from '${url('lib/cadence.ts')}';
import * as Wd from '${url('fx/Words.tsx')}';
import * as Tp from '${url('fx/TypePresets.tsx')}';
import * as Rl from '${url('fx/Roll.tsx')}';
const shapes = ['settle', 'rush', 'group'] as const;
const runs: any[] = [];
for (const shape of shapes) for (const n of [3, 4, 5, 6, 7, 8]) for (const gap of [6, 8, 10, 14]) {
  if ((n - 1) * gap < 10) continue;
  const p = Cd.phrase(n, gap, { shape, seed: 'run' + n });
  runs.push({ shape, n, gap, on: p.onsets, accent: p.accent, groups: p.groups, cv: Cd.gapSpread(p.onsets) });
}
const again = JSON.stringify(Cd.phrase(6, 8, { shape: 'group', seed: 'x' })) === JSON.stringify(Cd.phrase(6, 8, { shape: 'group', seed: 'x' }));
const groups = [4, 5, 6, 7, 8, 9, 10, 11].map((n) => ({ n, g: [1, 2, 3, 4, 5].map((s) => Cd.phraseGroups(n, s)) }));
const words = ['It', 'watches', 'every', 'clip', 'you', 'shoot'];
const ph = Wd.cadenceOffsets(words, 'phrase', 8, 60);
const ev = Wd.cadenceOffsets(words, 'even', 8, 60);
const crisp = Tp.crispWords({ fps: 60, width: 1920, height: 1080 } as any);
const film = { fps: 60, width: 1920, height: 1080 } as any;
const spec = (preset: string) => ({ preset, text: 'Your reel arrives every Sunday', at: 100 } as any);
const presets = { mask: Tp.maskFrames(spec('mask'), film), fall: Tp.fallFrames(spec('fall'), film), glide: Tp.glideFrames(spec('glide'), film), fly: Tp.flyFrames(spec('fly'), film) };
const house = { mask: Tp.TYPE_PRESETS.mask.stagger60, fall: Tp.TYPE_PRESETS.fall.gap60, glide: Tp.TYPE_PRESETS.glide.step60, fly: Tp.TYPE_PRESETS.fly.gap60 };
const count = Array.from({ length: 100 }, (_, i) => Rl.countTo(100 + i, { from: 0, to: 83, start: 110, dur: 60 }));
const tenths = [110, 140, 170, 190].map((f) => Rl.countTo(f, { from: 0, to: 1.86, start: 110, dur: 60, decimals: 2 }));
console.log(JSON.stringify({ P: Cd.PHRASE, runs, again, groups, ph, ev, crisp: crisp.cadence, presets, house, count, tenths }));
`;
const tmp = mkdtempSync(join(tmpdir(), 'cinetic-timing-'));
let P;
try {
  const probe = join(tmp, 'probe.ts');
  writeFileSync(probe, PROBE);
  const r = spawnSync(process.execPath, [TSX, probe], { cwd: STARTER, encoding: 'utf8' });
  if (r.status !== 0) {
    console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).slice(-900)}`);
    process.exit(1);
  }
  P = JSON.parse(r.stdout.trim().split('\n').pop());

  // 1. phrase
  const low = P.runs.filter((x) => x.cv < P.P.cv - 1e-9);
  result(!low.length, `phrase(): settle, rush and group keep the gaps' spread at ${P.P.cv} or more (3-8 items, 10 f or more in all)`, JSON.stringify(low.slice(0, 3)));
  const span = P.runs.filter((x) => x.on[x.n - 1] !== Math.round((x.n - 1) * x.gap) || x.on[0] !== 0);
  result(!span.length, 'phrase(): the span of an even stagger exactly ((n - 1) x gap), the first onset at 0', JSON.stringify(span.slice(0, 2)));
  const back = P.runs.filter((x) => x.on.some((v, i) => i > 0 && v - x.on[i - 1] < P.P.minGap));
  result(!back.length, 'phrase(): never steps back; whole-frame gaps of at least PHRASE.minGap', JSON.stringify(back.slice(0, 2)));
  const acc = P.runs.filter((x) => (x.shape === 'settle' && x.accent !== x.n - 1) || (x.shape === 'rush' && x.accent !== 0) || (x.shape === 'group' && x.accent !== x.n - x.groups[x.groups.length - 1]));
  result(!acc.length, 'phrase(): the accent is the last (settle), the lead (rush), the first of the last group (group)', JSON.stringify(acc.slice(0, 2)));
  const settleHold = P.runs.filter((x) => x.shape === 'settle').every((x) => { const g = x.on.slice(1).map((v, i) => v - x.on[i]); return g[g.length - 1] === Math.max(...g); });
  const rushLead = P.runs.filter((x) => x.shape === 'rush').every((x) => { const g = x.on.slice(1).map((v, i) => v - x.on[i]); return g[0] === Math.max(...g); });
  result(settleHold && rushLead, 'phrase(): settle holds longest before its last item, rush after its lead');
  const badGroups = P.groups.filter((x) => x.g.some((g) => g.reduce((a, b) => a + b, 0) !== x.n || g.some((s, i) => s > 3 || (s < 2 && i > 0))));
  result(!badGroups.length && P.again, 'phraseGroups(): 2-3 items a group (a group of one only leads), summing to n; the same seed, the same run', JSON.stringify(badGroups.slice(0, 2)));

  // 2. words
  const spread = (on) => { const g = on.slice(1).map((v, i) => v - on[i]); const m = g.reduce((a, b) => a + b, 0) / g.length; return Math.sqrt(g.reduce((a, b) => a + (b - m) ** 2, 0) / g.length) / m; };
  result(P.ph.onsets[5] === P.ev.onsets[5] && spread(P.ph.onsets) >= P.P.cv && spread(P.ev.onsets) === 0 && P.crisp === 'phrase',
    "fx/Words cadence 'phrase': the even cadence's span, phrased; crispWords takes it", `${P.ph.onsets.join(',')} vs ${P.ev.onsets.join(',')}, crisp ${P.crisp}`);

  // 3. type presets
  const pre = Object.entries(P.presets).map(([k, v]) => ({ k, on: v.on, cv: spread(v.on), span: v.on[v.on.length - 1] - v.on[0], want: (v.on.length - 1) * P.house[k] }));
  const preBad = pre.filter((x) => x.cv < P.P.cv - 1e-9 || Math.abs(x.span - x.want) > 1e-6);
  result(!preBad.length, 'fx/TypePresets: mask, fall, glide and fly onsets phrased, with the span (and end) of the even stagger', JSON.stringify(preBad.length ? preBad : pre.map((x) => [x.k, x.on.map((v) => +(v - 100).toFixed(2)).join('/')])));

  // 4. countTo
  const c = P.count; // frames 100..199: start 110, end 170
  const at = (f) => c[f - 100];
  const mono = c.every((v, i) => i === 0 || v >= c[i - 1]);
  result(at(109) === 0 && at(122) > 83 * 0.5 && at(169) < 83 && at(170) === 83 && at(199) === 83 && mono,
    'fx/Roll countTo(): eases out (over half its value in the first fifth), lands its last value on the end frame and holds, never steps back', `f122 ${at(122)}, f169 ${at(169)}, f170 ${at(170)}`);
  result(P.tenths[0] === 0 && P.tenths[3] === 1.86 && P.tenths[1] > 0.93 && Math.abs(P.tenths[2] * 100 - Math.round(P.tenths[2] * 100)) < 1e-9, 'fx/Roll countTo({ decimals: 2 }): 0.00 -> 1.86, eased, in hundredths', P.tenths.join(' '));

  // 5. lint-film
  const film2 = join(tmp, 'film');
  mkdirSync(join(film2, 'src', 'acts'), { recursive: true });
  writeFileSync(join(film2, 'src', 'acts', 'Rows.tsx'), [
    "import React from 'react';",
    "import { countLinear, countSteps } from '../fx/Roll';",
    "import { E, prog } from '../lib/anim';",
    "export const Rows: React.FC<{ F: number; rows: string[] }> = ({ F, rows }) => {",
    '  const pct = Math.min(99, countLinear(F, { from: 0, perSec: 38, start: 10 }).shown);',
    '  const steps = countSteps(0, 83, 10, 60, E.linear);',
    '  return <>{rows.map((r, i) => { const at = CUE.rows + f60x(6) * i; return <div key={i} style={{ opacity: prog(F, at, at + 12, E.snapOut) }}>{pct}{steps.length}</div>; })}</>;',
    '};',
  ].join('\n'));
  writeFileSync(join(film2, 'src', 'acts', 'Good.tsx'), [
    "import React from 'react';",
    "import { countTo } from '../fx/Roll';",
    "import { phraseOnsets } from '../lib/cadence';",
    "import { E, prog } from '../lib/anim';",
    "export const Good: React.FC<{ F: number; rows: string[] }> = ({ F, rows }) => {",
    '  const pct = countTo(F, { from: 0, to: 99, start: 10, dur: 150 });',
    "  const on = phraseOnsets(CUE.rows, rows.length, f60x(6), { shape: 'group', seed: 'rows' });",
    '  return <>{rows.map((r, i) => <div key={i} style={{ opacity: prog(F, on[i], on[i] + 12, E.snapOut) }}>{pct}</div>)}</>;',
    '};',
  ].join('\n'));
  const lr = spawnSync(process.execPath, [join(SKILL, 'scripts', 'lint-film.mjs'), 'src', '--json'], { cwd: film2, encoding: 'utf8' });
  let issues = [];
  try {
    issues = JSON.parse(lr.stdout).issues ?? [];
  } catch {
    issues = (lr.stdout || '').split('\n').filter((l) => /even-stagger|linear-count/.test(l)).map((l) => ({ file: l.includes('Good') ? 'Good' : 'Rows', rule: l.includes('even-stagger') ? 'even-stagger' : 'linear-count' }));
  }
  const of = (f, rule) => issues.filter((x) => String(x.file).includes(f) && x.rule === rule).length;
  result(of('Rows', 'even-stagger') >= 1 && of('Rows', 'linear-count') >= 2, 'lint-film: a reveal on a metronome warns even-stagger; countLinear capped at a value and a count on E.linear warn linear-count',
    JSON.stringify(issues.filter((x) => /even-stagger|linear-count/.test(x.rule)).map((x) => `${x.file}:${x.rule}`)));
  result(of('Good', 'even-stagger') === 0 && of('Good', 'linear-count') === 0, 'lint-film: the phrased reveal and countTo pass');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? `timing tests: ${failed} failed` : 'timing tests: all pass');
process.exit(failed ? 1 : 0);
