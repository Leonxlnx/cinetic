#!/usr/bin/env node
/**
 * lint-film.test.mjs: regression tests for the hard-ban rules in lint-film.mjs and palette.py.
 *
 *   1. Every fixture in lint-fixtures/ declares what it must produce in its first lines
 *      (`expect: rule=N rule:warn=N`); the hard-ban rules it does not name must stay silent.
 *   2. Both starters fail only on their placeholder markers, and lint clean once the markers are gone.
 *   3. palette.py refuses banned accents and papers (exit 1) and accepts allowed ones, and
 *      --brand-supplied lets the user's own colour through.
 *
 * Usage (from the skill root):  node scripts/test/lint-film.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const LINT = join(SKILL, 'scripts', 'lint-film.mjs');
const PALETTE = join(SKILL, 'scripts', 'palette.py');
const verbose = process.argv.includes('--verbose');
const HARD = ['banned-color', 'serif', 'italic', 'glass', 'glow', 'gradient-multihue', 'emoji', 'stock-decoration', 'brand-supplied'];

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const lint = (path) => {
  const r = spawnSync('node', [LINT, path, '--json'], { encoding: 'utf8' });
  try {
    return { code: r.status, ...JSON.parse(r.stdout) };
  } catch {
    return { code: r.status, issues: [], error: r.stderr || r.stdout };
  }
};
const count = (issues) => {
  const c = {};
  for (const x of issues) {
    const k = x.severity === 'error' ? x.rule : `${x.rule}:warn`;
    c[k] = (c[k] ?? 0) + 1;
  }
  return c;
};

// 1. fixtures
const FIX = join(HERE, 'lint-fixtures');
for (const f of readdirSync(FIX).sort()) {
  const path = join(FIX, f);
  const head = readFileSync(path, 'utf8').split('\n').slice(0, 3).join(' ');
  const expect = {};
  for (const m of head.matchAll(/\b([a-z-]+(?::warn)?)=(\d+)/g)) expect[m[1]] = Number(m[2]);
  const r = lint(path);
  const got = count(r.issues);
  const keys = new Set([...Object.keys(expect), ...HARD, ...HARD.map((h) => `${h}:warn`)]);
  const diffs = [...keys].filter((k) => (expect[k] ?? 0) !== (got[k] ?? 0)).map((k) => `${k}: want ${expect[k] ?? 0}, got ${got[k] ?? 0}`);
  result(!diffs.length, `fixture ${f}`, diffs.join('; ') || Object.entries(expect).map(([k, v]) => `${k}=${v}`).join(' ') || 'silent');
  if (verbose || diffs.length) for (const x of r.issues.filter((x) => HARD.includes(x.rule))) console.log(`      ${x.line}: ${x.rule} ${x.severity} ${x.excerpt}`);
}

// 2. starters: placeholders are the only errors, and removing the markers leaves them clean
for (const [name, sub] of [
  ['remotion starter', 'remotion-starter/src'],
  ['hyperframes starter', 'hyperframes-starter'],
]) {
  const tmp = mkdtempSync(join(tmpdir(), 'cinetic-lint-'));
  const dst = join(tmp, 'p');
  cpSync(join(SKILL, 'assets', sub), dst, { recursive: true, filter: (s) => !s.includes('node_modules') });
  const before = lint(dst);
  const other = before.issues.filter((x) => x.rule !== 'placeholder' && x.severity === 'error');
  const nPlace = before.issues.filter((x) => x.rule === 'placeholder').length;
  result(before.code === 1 && nPlace > 0 && !other.length, `${name} fails only on placeholders`, `${nPlace} placeholder errors, ${other.length} other errors`);
  const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((e) => walk(join(p, e))) : [p]);
  for (const f of walk(dst)) {
    const s = readFileSync(f, 'utf8');
    if (s.includes('cinetic:placeholder')) writeFileSync(f, s.replaceAll('cinetic:placeholder', 'chosen'));
  }
  const after = lint(dst);
  result(after.code === 0 && after.errors === 0, `${name} lints clean once the markers are replaced`, `${after.errors} errors, ${after.warnings} warnings`);
  if (after.errors) for (const x of after.issues) console.log(`      ${x.file}:${x.line} ${x.rule} ${x.message.slice(0, 90)}`);
  if (sub.startsWith('remotion')) {
    // a glow built from a token: the colour resolves through src/brand/tokens.ts
    writeFileSync(join(dst, 'Glow.tsx'), "import { C } from './brand/tokens';\nexport const s = { boxShadow: `0 0 40px ${C.accent}`, textShadow: `0 2px 8px ${C.ink}` };\n");
    const g = lint(dst);
    const n = g.issues.filter((x) => x.rule === 'glow').length;
    result(n === 1, 'a token-coloured glow is caught through tokens.ts (and an ink shadow is not)', `${n} glow errors`);
  }
  rmSync(tmp, { recursive: true, force: true });
}

// 3. palette.py
for (const [args, want, why] of [
  [['--accent', '#F2461E'], 1, 'red-orange refused'],
  [['--accent', '#E14921'], 1, 'vermilion refused'],
  [['--accent', '#FFA500', '--stage', 'dark'], 1, 'orange refused'],
  [['--accent', '#7C3AED'], 1, 'violet refused'],
  [['--accent', '#39FF14', '--stage', 'dark'], 1, 'neon refused'],
  [['--accent', '#1F86CD', '--temp', 'warm'], 1, 'warm (beige) paper refused'],
  [['--accent', '#1F86CD', '--paper', '#F5F0E6'], 1, 'beige paper refused'],
  [['--accent', '#08965A'], 0, 'green accepted'],
  [['--accent', '#EC2A3A'], 0, 'red accepted'],
  [['--accent', 'oklch(0.86 0.165 100)', '--stage', 'dark'], 0, 'yellow on ink accepted'],
  [['--accent', '#F2461E', '--brand-supplied'], 0, "the brand's own orange accepted with --brand-supplied"],
]) {
  const r = spawnSync('python3', [PALETTE, ...args], { encoding: 'utf8' });
  result(r.status === want, `palette.py ${why}`, `exit ${r.status}, want ${want}`);
  if (verbose || r.status !== want) console.log((r.stderr || '').split('\n').slice(0, 3).map((l) => '      ' + l).join('\n'));
}

console.log(failed ? `lint-film tests: ${failed} failed` : 'lint-film tests: all pass');
process.exit(failed ? 1 : 0);
