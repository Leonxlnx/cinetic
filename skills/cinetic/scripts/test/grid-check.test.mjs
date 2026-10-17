#!/usr/bin/env node
/**
 * grid-check.test.mjs: regression tests for the timing and text-flow checks in grid-check.ts.
 *
 *   1. Every timeline in grid-fixtures/ declares what it must produce in its first lines
 *      (`expect: check=N check:warn=N`, or `expect: (none)`); every other check must stay silent.
 *   2. The Remotion starter's timeline passes as calm with no finding; --pace crisp overrides its
 *      PACE_NAME and holds it to the crisp gap limit (48 f), which its 72 f picture beats exceed.
 *
 * grid-check.ts runs under Node's TypeScript type stripping (Node 22.18+, or older 22.x with
 * --experimental-strip-types), so the fixtures are self-contained timelines with no imports. The
 * starter's timeline imports src/lib/pace.ts without an extension, which plain Node cannot
 * resolve: that part runs only when the starter has tsx installed (npm install in the starter).
 *
 * Usage (from the skill root):  node scripts/test/grid-check.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const GRID = join(SKILL, 'scripts', 'grid-check.ts');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const verbose = process.argv.includes('--verbose');
const strip = process.features?.typescript ? [] : ['--experimental-strip-types'];

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd, shell: process.platform === 'win32' && cmd === 'npx' });
  try {
    return { code: r.status, ...JSON.parse(r.stdout) };
  } catch {
    return { code: r.status, findings: [], error: (r.stderr || r.stdout || '').trim().slice(0, 400) };
  }
};
const count = (findings) => {
  const c = {};
  for (const x of findings) {
    const k = x.severity === 'error' ? x.check : `${x.check}:warn`;
    c[k] = (c[k] ?? 0) + 1;
  }
  return c;
};

// 1. fixtures
const FIX = join(HERE, 'grid-fixtures');
for (const f of readdirSync(FIX).filter((x) => x.endsWith('.ts')).sort()) {
  const head = readFileSync(join(FIX, f), 'utf8').split('\n').slice(0, 3).join(' ');
  const expect = {};
  for (const m of head.matchAll(/\b([a-z-]+(?::warn)?)=(\d+)/g)) expect[m[1]] = Number(m[2]);
  const r = run(process.execPath, [...strip, '--no-warnings', GRID, join(FIX, f), '--json']);
  const got = count(r.findings ?? []);
  const keys = new Set([...Object.keys(expect), ...Object.keys(got)]);
  const diffs = [...keys].filter((k) => (expect[k] ?? 0) !== (got[k] ?? 0)).map((k) => `${k}: want ${expect[k] ?? 0}, got ${got[k] ?? 0}`);
  const wantFail = Object.keys(expect).some((k) => !k.endsWith(':warn'));
  if (r.error) diffs.push(r.error);
  else if ((r.code === 1) !== wantFail) diffs.push(`exit ${r.code}, want ${wantFail ? 1 : 0}`);
  result(!diffs.length, `fixture ${f}`, diffs.join('; ') || Object.entries(expect).map(([k, v]) => `${k}=${v}`).join(' ') || 'clean');
  if (verbose || diffs.length) for (const x of r.findings ?? []) console.log(`      ${x.severity} ${x.check}: ${x.message.slice(0, 140)}`);
}

// 2. the starter (needs its tsx: npm install in assets/remotion-starter)
const calm = existsSync(join(STARTER, 'node_modules', '.bin')) ? run('npx', ['tsx', GRID, 'src/timeline.ts', '--json'], STARTER) : null;
if (!calm || /another platform/.test(calm.error ?? '')) {
  // no install, or one made for another OS (a Windows node_modules seen from WSL): nothing to run it with
  console.log('skip  the Remotion starter (run npm install in assets/remotion-starter, on this OS, to include it)');
} else {
  result(calm.code === 0 && !(calm.findings ?? []).length && calm.summary?.pace === 'calm', 'the Remotion starter passes as calm with no finding',
    calm.error ?? (calm.findings ?? []).map((x) => x.check).join(', '));
  const crisp = run('npx', ['tsx', GRID, 'src/timeline.ts', '--json', '--pace', 'crisp'], STARTER);
  const checks = new Set((crisp.findings ?? []).map((x) => x.check));
  result(crisp.summary?.pace === 'crisp' && checks.size === 1 && checks.has('event-gap'), '--pace crisp overrides PACE_NAME (only the crisp 48 f gap limit fails)',
    crisp.error ?? `pace ${crisp.summary?.pace}, ${[...checks].join(', ')}`);
}

console.log(failed ? `grid-check tests: ${failed} failed` : 'grid-check tests: all pass');
process.exit(failed ? 1 : 0);
