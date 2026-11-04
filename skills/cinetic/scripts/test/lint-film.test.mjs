#!/usr/bin/env node
/**
 * lint-film.test.mjs: regression tests for the hard-ban and text-flow rules in lint-film.mjs and
 * for palette.py.
 *
 *   1. Every fixture in lint-fixtures/ declares what it must produce in its first lines
 *      (`expect: rule=N rule:warn=N`); the hard-ban and text-flow rules it does not name must stay
 *      silent. lint-fixtures/timeline.ts makes the fixtures a calm film (for text-pace). A
 *      followed type-on reports its real rate (typing-follow.tsx: 180 chars/s, not 60).
 *   2. Both starters fail only on their placeholder markers, raise no text-flow warning, and lint
 *      clean once the markers are gone; with another palette in tokens.ts no primitive's default
 *      fails as an off-token colour.
 *   3. palette.py refuses banned accents and papers (exit 1) and accepts allowed ones, and
 *      --brand-supplied lets the user's own colour through; its recipes, the token check and the
 *      one-hue ramp gate.
 *   4. The rendered checks' own fixtures: look-audit.py, forensics.py, measure-speed.py and
 *      grammar-score.mjs each run --self-test (synthetic clips and reports built in code).
 *
 * A fixture can be a folder (a small film): it is linted as one, and its expect.txt says what it must
 * produce. Python: the one scripts/py.mjs finds ($PYTHON, else $CINETIC_PYTHON, else python3, python or
 * py -3, each only after it runs; 4 also needs numpy and opencv, and is skipped with a note when they are missing).
 *
 * Usage (from the skill root):  node scripts/test/lint-film.test.mjs [--verbose] [--part static|rendered|forensics|look-a|look-b|look-c|speed]
 * --part static runs 1-3 and the grammar-score self-test; --part rendered runs only 4 (the slow,
 * clip-making self-tests), so a machine with a job time limit can run the suite in two halves; on a
 * slow machine 4 splits further: forensics, look-a (look-audit's floor, colour and picture cases),
 * look-b and look-c (its look rules) and speed (measure-speed), one run each.
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPython } from '../py.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const LINT = join(SKILL, 'scripts', 'lint-film.mjs');
const PALETTE = join(SKILL, 'scripts', 'palette.py');
const verbose = process.argv.includes('--verbose');
const part = process.argv.includes('--part') ? process.argv[process.argv.indexOf('--part') + 1] : 'all';
const RENDERED_PARTS = ['forensics', 'look-a', 'look-b', 'look-c', 'speed'];
if (!['all', 'static', 'rendered', ...RENDERED_PARTS].includes(part)) {
  console.error(`lint-film tests: --part takes static, rendered or one of ${RENDERED_PARTS.join(', ')}`);
  process.exit(2);
}
const STATIC = part === 'all' || part === 'static';
const RENDERED = part !== 'static';
const runs = (k) => part === 'all' || part === 'rendered' || part === k; // one clip-making self-test of section 4
const HARD = ['banned-color', 'serif', 'italic', 'glass', 'glow', 'gradient-multihue', 'emoji', 'stock-decoration', 'star-mark', 'brand-supplied'];
const TEXT = ['copy-literal', 'text-spring', 'text-pace', 'typing-rate', 'per-letter'];
// the grammar rules: silent unless a fixture names them
const GRAMMAR = ['ease-family', 'token-drift', 'whip-shape', 'spring-budget', 'spring-range', 'scale-from-zero', 'fade-exit', 'linear-opacity',
  'crossfade', 'shutter', 'blur-on-crisp', 'pure-ink', 'accent-count', 'gradient-shape', 'type-role', 'deprecated-token', 'timeline-constant', 'gpu-cost',
  'card-content', 'small-text', 'giant-watermark', 'giant-once', 'end-card-template', 'clip-text', 'svg-text',
  'snap-step', 'camera-float', 'camera-shot', 'idle-bob', 'card-tilt', 'unmount-moving', 'drift-toggle', 'move-queue', 'filler-plate', 'filler-light', 'placeholder-copy', 'bar-text', 'drawn-figure', 'logo-chip', 'ui-accent-bar', 'text-estimate',
  'emphasis-share', 'emphasis-signature', 'tight-tracking'];
const [PY, ...PY_PRE] = findPython({ quiet: true }) ?? ['python3']; // python3 only to report that none runs
const py = (args, opts) => spawnSync(PY, [...PY_PRE, ...args], opts);

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
for (const f of STATIC ? readdirSync(FIX).sort() : []) {
  const dir = statSync(join(FIX, f)).isDirectory();
  const path = dir ? join(FIX, f, 'src') : join(FIX, f);
  const head = readFileSync(dir ? join(FIX, f, 'expect.txt') : path, 'utf8').split('\n').slice(0, 3).join(' ');
  const expect = {};
  for (const m of head.matchAll(/\b([a-z-]+(?::warn)?)=(\d+)/g)) expect[m[1]] = Number(m[2]);
  const r = lint(path);
  const got = count(r.issues);
  const keys = new Set([...Object.keys(expect), ...HARD, ...HARD.map((h) => `${h}:warn`), ...TEXT.map((t) => `${t}:warn`), ...GRAMMAR, ...GRAMMAR.map((g) => `${g}:warn`)]);
  const diffs = [...keys].filter((k) => (expect[k] ?? 0) !== (got[k] ?? 0)).map((k) => `${k}: want ${expect[k] ?? 0}, got ${got[k] ?? 0}`);
  result(!diffs.length, `fixture ${f}`, diffs.join('; ') || Object.entries(expect).map(([k, v]) => `${k}=${v}`).join(' ') || 'silent');
  if (f === 'typing-follow.tsx') {
    const msg = r.issues.find((x) => x.rule === 'typing-rate')?.message ?? '';
    result(/about 180 chars\/s/.test(msg), 'a type-on built from other names reports its real rate (180 chars/s)', msg.slice(0, 60));
  }
  if (verbose || diffs.length) for (const x of r.issues.filter((x) => HARD.includes(x.rule) || TEXT.includes(x.rule) || GRAMMAR.includes(x.rule))) console.log(`      ${x.line}: ${x.rule} ${x.severity} ${x.excerpt}`);
}

// linear-motion: the house scenes and the launch-simple and update acts move on curves, never at a constant rate
for (const sub of STATIC ? ['remotion-starter/src/scenes', 'templates/launch-simple/src/acts', 'templates/update/src/acts'] : []) {
  const lin = lint(join(SKILL, 'assets', sub)).issues.filter((x) => x.rule === 'linear-motion');
  result(!lin.length, `${sub} moves on curves (no linear-motion)`, lin.map((x) => `${x.file}:${x.line}`).join('; ') || 'clean');
}

// 2. starters: placeholders are the only errors, and removing the markers leaves them clean
for (const [name, sub] of STATIC
  ? [
      ['remotion starter', 'remotion-starter/src'],
      ['hyperframes starter', 'hyperframes-starter'],
    ]
  : []) {
  const tmp = mkdtempSync(join(tmpdir(), 'cinetic-lint-'));
  const dst = join(tmp, 'p');
  cpSync(join(SKILL, 'assets', sub), dst, { recursive: true, filter: (s) => !s.includes('node_modules') });
  const before = lint(dst);
  const other = before.issues.filter((x) => x.rule !== 'placeholder' && x.severity === 'error');
  const nPlace = before.issues.filter((x) => x.rule === 'placeholder').length;
  result(before.code === 1 && nPlace > 0 && !other.length, `${name} fails only on placeholders`, `${nPlace} placeholder errors, ${other.length} other errors`);
  const flow = before.issues.filter((x) => TEXT.includes(x.rule));
  result(!flow.length, `${name} raises no text-flow warning`, flow.map((x) => `${x.file}:${x.line} ${x.rule}`).join('; '));
  const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((e) => walk(join(p, e))) : [p]);
  for (const f of walk(dst)) {
    const s = readFileSync(f, 'utf8');
    if (s.includes('cinetic:placeholder')) writeFileSync(f, s.replaceAll('cinetic:placeholder', 'chosen'));
  }
  const after = lint(dst);
  result(after.code === 0 && after.errors === 0, `${name} lints clean once the markers are replaced`, `${after.errors} errors, ${after.warnings} warnings`);
  if (after.errors) for (const x of after.issues) console.log(`      ${x.file}:${x.line} ${x.rule} ${x.message.slice(0, 90)}`);
  if (sub.startsWith('remotion')) {
    // the primitives' own colour helpers (lab(m.color), rgb(mix(...))) are code, not literals: --strict passes too
    const warns = after.issues.filter((x) => x.severity === 'warn');
    result(!warns.length, `${name} raises no warning once the markers are replaced (--strict passes)`, warns.map((x) => `${x.file}:${x.line} ${x.rule}`).join('; '));
    // a glow built from a token: the colour resolves through src/brand/tokens.ts
    writeFileSync(join(dst, 'Glow.tsx'), "import { C } from './brand/tokens';\nexport const s = { boxShadow: `0 0 40px ${C.accent}`, textShadow: `0 2px 8px ${C.ink}` };\n");
    const g = lint(dst);
    const n = g.issues.filter((x) => x.rule === 'glow').length;
    result(n === 1, 'a token-coloured glow is caught through tokens.ts (and an ink shadow is not)', `${n} glow errors`);
    // a film's own palette (as brand.py writes it; white stays): no primitive's default may be a starter colour as a hex
    const tokPath = join(dst, 'brand', 'tokens.ts');
    const tok = readFileSync(tokPath, 'utf8');
    writeFileSync(tokPath, tok.replace(/export const C = \{[\s\S]*?\n\};/, (blk) => blk.replace(/'#([0-9A-Fa-f]{6})'/g, (m, h) => h.toUpperCase() === 'FFFFFF' ? m :
      `'#${h.slice(0, 4)}${(parseInt(h.slice(4), 16) ^ 0x05).toString(16).padStart(2, '0').toUpperCase()}'`)));
    const own = lint(dst).issues.filter((x) => x.rule === 'off-token-color' && x.severity === 'error');
    result(!own.length, "with the film's own palette in tokens.ts, no starter primitive fails off-token-color", own.map((x) => `${x.file}:${x.line}`).join(', '));
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
  [['--accent', 'oklch(0.72 0.13 250)', '--recipe', 'inkStage'], 0, 'the ink-stage recipe with a light accent'],
  [['--accent', '#1F86CD', '--recipe', 'inkStage'], 1, 'an accent too dark for the ink stage refused (L 0.63-0.85)'],
  [['--accent', '#C92F33', '--recipe', 'deepField'], 1, 'a red deep field refused (blue, teal or green only)'],
  [['--accent', 'oklch(0.42 0.15 250)', '--recipe', 'stoneMid'], 0, 'the stone recipe with a deep accent'],
  [['--accent', 'oklch(0.80 0.10 210)', '--recipe', 'stoneMid', '--stage', 'dark'], 2, 'a light recipe asked for a dark stage refused (not built light)'],
  [['--accent', '#1F86CD', '--paper', '#FFFFFF'], 1, 'a pure white paper refused outside the white-world recipe'],
  [['--accent', '#1F86CD', '--ramp', '#EEF3F9,#D3E2F2,#A9C7E8'], 0, 'a one-hue light field passes the ramp gate'],
  [['--accent', '#1F86CD', '--ramp', '#EEF3F9,#B5E3D5,#A9C7E8'], 1, 'a field that leans to another hue fails the ramp gate'],
  [['--accent', '#1F86CD', '--ramp', '#EEF3F9,#B5E3D5', '--brand-supplied'], 0, "the brand's own two-hue field passes with --brand-supplied"],
  [['--check-tokens', join(SKILL, 'assets', 'remotion-starter', 'src', 'brand', 'tokens.ts')], 0, "the starter's tokens pass the token check"],
  [['--check-tokens', join(FIX, 'film', 'src', 'brand', 'tokens.ts')], 1, 'tokens with pure black ink and a second accent fail the token check'],
  [['--check-tokens', join(FIX, 'brand-kit', 'src', 'brand', 'tokens.ts')], 0, "a supplied brand's orange passes: contrast and one accent only"],
].filter(() => STATIC)) {
  const r = py([PALETTE, ...args], { encoding: 'utf8' });
  result(r.status === want, `palette.py ${why}`, `exit ${r.status}, want ${want}`);
  if (verbose || r.status !== want) console.log((r.stderr || '').split('\n').slice(0, 3).map((l) => '      ' + l).join('\n'));
}
// --stage-hue sets every hue a ground family names (its field, its stage, a fixed sky hue), and the field tokens
// pass the bans like the rest: a teal accent on a deep pool at an ink-navy 245, a soft sky at 200, a warm field refused
for (const [args, want, why] of [
  [['--accent', '#34C3B0', '--family', 'deepPool', '--stage', 'dark', '--stage-hue', '245'], { ink: 245, field: 245, fieldFar: 245 }, 'deepPool takes --stage-hue for its stage and field'],
  [['--accent', '#0E8F80', '--family', 'softSky', '--stage-hue', '200'], { paper: 200, field: 200 }, 'softSky takes --stage-hue over its fixed sky hue'],
  [['--accent', '#0E8F80', '--family', 'lightDark', '--stage-hue', '160'], { darkStage: 160 }, 'lightDark takes --stage-hue for its dark stage'],
  [['--accent', '#0E8F80', '--family', 'blackField', '--stage', 'dark', '--stage-hue', '160'], { ink: 160 }, 'blackField takes --stage-hue'],
].filter(() => STATIC)) {
  const tmp = mkdtempSync(join(tmpdir(), 'cinetic-pal-'));
  const out = join(tmp, 'p.json');
  const r = py([PALETTE, ...args, '--json', out], { encoding: 'utf8' });
  let j = null;
  try {
    j = JSON.parse(readFileSync(out, 'utf8'));
  } catch {}
  const got = Object.fromEntries(Object.keys(want).map((k) => [k, Math.round((j?.tokens?.[k] ?? j?.field?.[k])?.oklch?.[2] ?? -1)]));
  const ok = Object.entries(want).every(([k, h]) => got[k] === h);
  result(ok, `palette.py ${why}`, JSON.stringify(got));
  if (!ok) console.log((r.stderr || '').split('\n').slice(0, 3).map((l) => '      ' + l).join('\n'));
  rmSync(tmp, { recursive: true, force: true });
}
if (STATIC) {
  const r = py([PALETTE, '--accent', '#0E8F80', '--family', 'gradientField', '--stage-hue', '80'], { encoding: 'utf8' });
  result(r.status === 1 && /hard ban: field\b/.test(r.stderr || ''), 'palette.py a family field at a warm stage hue is refused as beige', `exit ${r.status}`);
}

// 4. the rendered checks' own fixtures (synthetic clips made in code; needs numpy, opencv and ffmpeg)
const probe = py(['-c', 'import cv2, numpy'], { encoding: 'utf8' });
const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (!RENDERED) {
  /* --part static */
} else if (probe.status !== 0 || ff.status !== 0) {
  console.log(`skip  the rendered checks' self-tests: ${probe.status !== 0 ? `${[PY, ...PY_PRE].join(' ')} has no numpy/opencv (set PYTHON)` : 'no ffmpeg on PATH'}`);
} else {
  for (const [key, script, sub] of [['forensics', 'forensics.py'], ['look-a', 'look-audit.py', 'a'], ['look-b', 'look-audit.py', 'b'], ['look-c', 'look-audit.py', 'c'], ['speed', 'measure-speed.py']].filter(([k]) => runs(k))) {
    const r = py([join(SKILL, 'scripts', script), '--self-test', ...(sub ? [sub] : [])], { encoding: 'utf8', timeout: 600000 });
    const lines = (r.stdout || '').split('\n').filter((l) => /^(pass|FAIL)\s/.test(l));
    for (const l of lines) result(l.startsWith('pass'), l.replace(/^(pass|FAIL)\s+/, ''));
    if (r.status !== 0 && !lines.some((l) => l.startsWith('FAIL'))) result(false, `${script} --self-test ${sub ?? ''} ran (${key})`, (r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' | '));
  }
}
{
  const r = spawnSync(process.execPath, [join(SKILL, 'scripts', 'grammar-score.mjs'), '--self-test'], { encoding: 'utf8' });
  const lines = (r.stdout || '').split('\n').filter((l) => /^(pass|FAIL)\s/.test(l));
  for (const l of lines) result(l.startsWith('pass'), l.replace(/^(pass|FAIL)\s+/, ''));
  if (r.status !== 0 && !lines.some((l) => l.startsWith('FAIL'))) result(false, 'grammar-score.mjs --self-test ran', (r.stderr || '').trim().split('\n').slice(-1)[0]);
}

console.log(failed ? `lint-film tests: ${failed} failed` : 'lint-film tests: all pass');
process.exit(failed ? 1 : 0);
