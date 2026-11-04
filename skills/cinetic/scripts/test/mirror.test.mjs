#!/usr/bin/env node
/**
 * mirror.test.mjs: the copies of the motion vocabulary stay equal to their source.
 *
 *   1. The HyperFrames starter's motion.js carries the same easing tokens (same shapes to 1e-6, same
 *      family and replacement names), special curves, springs, tables and pace as the Remotion
 *      starter's src/lib/anim.ts and src/lib/pace.ts.
 *   2. The pace blocks copied by scripts/gen-pace.mjs are current: grid-check.ts BUILTIN,
 *      export-cues.ts READ_PACE and motion.js PACE (gen-pace.mjs --check), and their numbers equal
 *      pace.ts field by field.
 *
 * It runs src/lib through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/mirror.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const MOTION = join(SKILL, 'assets', 'hyperframes-starter', 'motion.js');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/mirror.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
if (!existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const N = 200;
const PROBE = `
import * as A from '${pathToFileURL(join(STARTER, 'src', 'lib', 'anim.ts')).href}';
const grid = (fn: (t: number) => number) => Array.from({ length: ${N} + 1 }, (_, i) => fn(i / ${N}));
const tok = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, e]) => {
  const t = e as A.Token;
  return [k, { family: t.family, token: t.token, deprecated: t.deprecated ?? null, grid: grid(t) }];
}));
console.log(JSON.stringify({
  E: tok(A.E), M: tok(A.M), E_DEPRECATED: A.E_DEPRECATED, SPR: A.SPR, SPR_DEPRECATED: A.SPR_DEPRECATED,
  DUR: A.DUR, PRESS: A.PRESS, TAU: A.TAU, STAG: A.STAG, ACCEL: A.ACCEL, CPS: A.CPS, SPEED: A.SPEED, CARRY: A.CARRY, BREATH: A.BREATH, OVERSIZE: A.OVERSIZE,
  STD_IN_OUT: A.STD_IN_OUT, WHIP_BUILD: A.WHIP_BUILD, PACE: A.PACE,
  expIn: grid(A.expIn(2.66)), expOut: grid(A.expOut(6)), perFrame: A.perFrame(0.89, 60, 24),
}));
`;
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-mirror-'));
const probeFile = join(TMP, 'probe.ts');
writeFileSync(probeFile, PROBE);
const r = spawnSync(process.execPath, [TSX, probeFile], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the anim.ts probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 6).join(' | ')}`);
  process.exit(1);
}
const R = JSON.parse(r.stdout.trim().split('\n').pop());
const H = createRequire(import.meta.url)(MOTION);

const grid = (fn) => Array.from({ length: N + 1 }, (_, i) => fn(i / N));
const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

// 1. motion.js vs anim.ts / pace.ts
for (const group of ['E', 'M']) {
  const keysR = Object.keys(R[group]).sort();
  const keysH = Object.keys(H[group]).sort();
  result(same(keysR, keysH), `motion.js ${group} has the same names as anim.ts`, same(keysR, keysH) ? `${keysR.length}` : `only in anim.ts: ${keysR.filter((k) => !keysH.includes(k)).join(', ')}; only in motion.js: ${keysH.filter((k) => !keysR.includes(k)).join(', ')}`);
  const shape = [];
  const tags = [];
  for (const k of keysR) {
    const h = H[group][k];
    if (!h) continue;
    const d = maxDiff(R[group][k].grid, grid(h));
    if (d > 1e-6) shape.push(`${k} ${d.toExponential(1)}`);
    if (h.family !== R[group][k].family || h.token !== R[group][k].token || (h.deprecated ?? null) !== R[group][k].deprecated) tags.push(k);
  }
  result(shape.length === 0, `motion.js ${group} shapes equal anim.ts (max diff 1e-6 over ${N + 1} points)`, shape.join(', '));
  result(tags.length === 0, `motion.js ${group} families, names and replacements equal anim.ts`, tags.join(', '));
}
result(same(R.E_DEPRECATED, H.E_DEPRECATED), 'motion.js E_DEPRECATED equals anim.ts');
for (const name of ['SPR', 'SPR_DEPRECATED', 'DUR', 'PRESS', 'TAU', 'STAG', 'ACCEL', 'CPS', 'SPEED', 'CARRY', 'BREATH', 'OVERSIZE', 'STD_IN_OUT', 'WHIP_BUILD', 'PACE']) {
  const ok = same(R[name], H[name]);
  result(ok, `motion.js ${name} equals ${name === 'PACE' ? 'pace.ts' : 'anim.ts'}`, ok ? '' : 'differs');
}
result(maxDiff(R.expIn, grid(H.expIn(2.66))) < 1e-12 && maxDiff(R.expOut, grid(H.expOut(6))) < 1e-12 && Math.abs(R.perFrame - H.perFrame(0.89, 60, 24)) < 1e-12, 'motion.js expIn, expOut and perFrame equal anim.ts');
result(H.pace === H.PACE[H.PACE_NAME], 'motion.js pace is PACE[PACE_NAME]');

// 2. the generated pace blocks
const gen = spawnSync(process.execPath, [join(SKILL, 'scripts', 'gen-pace.mjs'), '--check'], { encoding: 'utf8' });
result(gen.status === 0, 'gen-pace.mjs --check: grid-check BUILTIN, export-cues READ_PACE and motion.js PACE are current', gen.status === 0 ? '' : gen.stdout.trim().split('\n').filter((l) => /differs|not found/.test(l)).join(' | ') || gen.stderr.trim());
const block = (file) => {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/\/\/ <gen-pace>\n[^\n]*=\s*\{\n([\s\S]*?)\n\};\n\/\/ <\/gen-pace>/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const lm = line.match(/^\s*(\w+):\s*\{(.*)\},?\s*$/);
    if (!lm) continue;
    out[lm[1]] = Object.fromEntries([...lm[2].matchAll(/(\w+):\s*([-\d.]+)/g)].map((x) => [x[1], Number(x[2])]));
  }
  return out;
};
for (const [label, file] of [['grid-check.ts BUILTIN', join(SKILL, 'scripts', 'grid-check.ts')], ['export-cues.ts READ_PACE', join(SKILL, 'scripts', 'export-cues.ts')]]) {
  const b = block(file);
  if (!b) { result(false, `${label}: block found between the gen-pace markers`); continue; }
  const bad = [];
  for (const pace of ['calm', 'crisp']) for (const [k, v] of Object.entries(b[pace] ?? {})) if (R.PACE[pace][k] !== v) bad.push(`${pace}.${k} ${v} vs ${R.PACE[pace][k]}`);
  const n = Object.keys(b.calm ?? {}).length;
  result(n > 0 && bad.length === 0, `${label} numbers equal pace.ts`, bad.length ? bad.join(', ') : `${n} fields x 2 paces`);
}

if (verbose) console.log(gen.stdout);
process.exit(failed ? 1 : 0);
