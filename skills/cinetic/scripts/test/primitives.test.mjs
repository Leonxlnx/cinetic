#!/usr/bin/env node
/**
 * primitives.test.mjs: the measured-motion helpers and the UI primitives of the Remotion starter
 * against their house numbers.
 *
 *   1. lib/anim.ts curveOf(), track(), trackLinear(): a measured curve passes through its samples, a
 *      track through its keys, monotone between them (no overshoot), held outside them.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/primitives.test.mjs [--verbose]
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
  console.log('usage: node scripts/test/primitives.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
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
const range = (a: number, b: number, s = 1) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);
const keys: [number, number][] = [[10, 0], [14, 300], [20, 380], [30, 400]];
const samples = [0, 0.5, 0.72, 0.84, 0.91, 0.95, 0.97, 0.985, 0.993, 0.998, 1];
const c = A.curveOf(samples);
console.log(JSON.stringify({
  curve: range(0, 10).map((i) => c(i / 10)),
  curveDense: range(0, 1, 0.01).map((t) => c(t)),
  track: range(0, 40, 0.25).map((f) => A.track(f, keys)),
  trackAt: keys.map(([f]) => A.track(f, keys)),
  lin: [A.trackLinear(12, keys), A.trackLinear(5, keys), A.trackLinear(35, keys)],
}));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-primitives-'));
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
const monotone = (xs) => xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-9);

// 1. measured curves and tracks
{
  const samples = [0, 0.5, 0.72, 0.84, 0.91, 0.95, 0.97, 0.985, 0.993, 0.998, 1];
  result(P.curve.every((y, i) => close(y, samples[i], 1e-9)), 'curveOf: passes through every sample');
  result(monotone(P.curveDense) && P.curveDense.every((y) => y >= 0 && y <= 1), 'curveOf: monotone between samples, inside 0..1');
  result(P.trackAt.every((y, i) => close(y, [0, 300, 380, 400][i])), 'track: passes through every key');
  result(monotone(P.track) && Math.max(...P.track) <= 400 + 1e-9, 'track: monotone keys give a monotone track with no overshoot', `max ${Math.max(...P.track).toFixed(3)}`);
  result(P.track[0] === 0 && P.track[P.track.length - 1] === 400, 'track: holds the first and last value outside its keys');
  result(close(P.lin[0], 150) && P.lin[1] === 0 && P.lin[2] === 400, 'trackLinear: straight between keys, held outside');
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall pass');
