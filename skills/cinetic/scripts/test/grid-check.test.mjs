#!/usr/bin/env node
/**
 * grid-check.test.mjs: regression tests for the timing and text-flow checks in grid-check.ts and
 * for the starters' timing helpers.
 *
 *   1. Every timeline in grid-fixtures/ declares what it must produce in its first lines
 *      (`expect: check=N check:warn=N`, or `expect: (none)`); every other check must stay silent.
 *   2. The HyperFrames starter: grid-check reads its timeline.js (FILM, with the pace from
 *      motion.js) and passes it as calm with no finding, at its own 120 BPM and at 100 BPM; the
 *      accent's fall always lands on CUE.hit (DUR.fall comes from the grid); chain() in replace
 *      mode lets a fragment's exit finish before the next one rises.
 *   3. The Remotion starter (needs its tsx: npm install in assets/remotion-starter):
 *      - it passes as calm with no finding; --pace crisp overrides its PACE_NAME and holds it to
 *        the crisp gap limit (48 f), which only its 54 f flight stretches exceed;
 *      - its statement rewritten as a replace chain passes too (chain() times each exit to end
 *        before the next fragment rises);
 *      - each fragment's `text` sound (src/sync.ts) lands within 1 f of the frame its last word
 *        visibly stops (the drawn rise, through arrive(), at the statement's size);
 *      - new-film.sh --pace crisp scaffolds a film that passes grid-check (needs bash; on Windows,
 *        Git for Windows' bash).
 *
 * grid-check.ts runs under Node's TypeScript type stripping (Node 22.18+, or older 22.x with
 * --experimental-strip-types), so the fixtures are self-contained timelines with no imports. The
 * Remotion starter's timeline imports src/lib/pace.ts without an extension, which plain Node cannot
 * resolve: that part runs only when the starter has tsx installed (npm install in the starter).
 *
 * Usage (from the skill root):  node scripts/test/grid-check.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const GRID = join(SKILL, 'scripts', 'grid-check.ts');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const HF = join(SKILL, 'assets', 'hyperframes-starter');
const verbose = process.argv.includes('--verbose');
const strip = process.features?.typescript ? [] : ['--experimental-strip-types'];
const TMP = mkdtempSync(join(tmpdir(), 'cinetic-grid-'));

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
const clean = (r, pace) => r.code === 0 && !(r.findings ?? []).length && r.summary?.pace === pace;
const why = (r) => r.error ?? (r.findings ?? []).map((x) => `${x.check}: ${x.message.slice(0, 90)}`).join('; ');

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

// 2. the HyperFrames starter (plain node: timeline.js and motion.js are classic scripts)
const hfAt = (bpm) => {
  // a copy of motion.js + timeline.js at another tempo, as new-film.sh --bpm writes it
  const dir = join(TMP, `hf-${bpm}`);
  mkdirSync(dir, { recursive: true });
  const motion = readFileSync(join(HF, 'motion.js'), 'utf8').replace(/^(\s*const BPM = )[^;]+;/m, (_, head) => `${head}${bpm};`);
  writeFileSync(join(dir, 'motion.js'), motion);
  copyFileSync(join(HF, 'timeline.js'), join(dir, 'timeline.js'));
  writeFileSync(join(dir, 'package.json'), '{ "private": true }\n'); // CommonJS, like the starter's
  const ctx = {};
  ctx.window = ctx;
  createContext(ctx);
  for (const f of ['motion.js', 'timeline.js']) runInContext(readFileSync(join(dir, f), 'utf8'), ctx, { filename: f });
  return { dir, FILM: ctx.FILM, MOTION: ctx.MOTION };
};
for (const bpm of [120, 100]) {
  const { dir, FILM } = hfAt(bpm);
  const r = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir, 'timeline.js'), '--json']);
  result(clean(r, 'calm') && r.summary?.bpm === bpm, `the HyperFrames starter's timeline.js passes as calm with no finding at ${bpm} BPM`, why(r));
  result(FILM.CUE.fall + FILM.DUR.fall === FILM.CUE.hit, `the HyperFrames accent's fall lands on CUE.hit at ${bpm} BPM`, `fall ${FILM.CUE.fall} + ${FILM.DUR.fall} vs hit ${FILM.CUE.hit}`);
}
{
  const { FILM, MOTION } = hfAt(120);
  const [a, b] = FILM.chain('t', 'replace', [['One move', 0], ['then the next', 200]]);
  const want = 200 - Math.round(((MOTION.pace.exitDur + 6) * MOTION.FPS) / 60);
  result(a.out === want && b.in - a.out >= MOTION.pace.exitDur, "the HyperFrames chain() lets a replace fragment's exit end before the next rises", `out ${a.out}, want ${want}`);
}

// 3. the Remotion starter (needs its tsx: npm install in assets/remotion-starter)
const calm = existsSync(join(STARTER, 'node_modules', '.bin')) ? run('npx', ['tsx', GRID, 'src/timeline.ts', '--json'], STARTER) : null;
if (!calm || /another platform/.test(calm.error ?? '')) {
  // no install, or one made for another OS (a Windows node_modules seen from WSL): nothing to run it with
  console.log('skip  the Remotion starter (run npm install in assets/remotion-starter, on this OS, to include it)');
} else {
  result(clean(calm, 'calm'), 'the Remotion starter passes as calm with no finding', why(calm));
  const crisp = run('npx', ['tsx', GRID, 'src/timeline.ts', '--json', '--pace', 'crisp'], STARTER);
  const checks = new Set((crisp.findings ?? []).map((x) => x.check));
  result(crisp.summary?.pace === 'crisp' && checks.size === 1 && checks.has('event-gap'), '--pace crisp overrides PACE_NAME (only the crisp 48 f gap limit fails)',
    crisp.error ?? `pace ${crisp.summary?.pace}, ${[...checks].join(', ')}`);

  // the statement as a replace chain: chain() must time each exit to end before the next fragment rises
  const rep = join(TMP, 'replace');
  mkdirSync(join(rep, 'lib'), { recursive: true });
  copyFileSync(join(STARTER, 'src', 'lib', 'pace.ts'), join(rep, 'lib', 'pace.ts'));
  const tl = readFileSync(join(STARTER, 'src', 'timeline.ts'), 'utf8');
  writeFileSync(join(rep, 'timeline.ts'), tl.replace("chain('statement', 'build',", "chain('statement', 'replace',"));
  const r = run('npx', ['tsx', GRID, join(rep, 'timeline.ts'), '--json'], STARTER);
  result(!tl.includes("chain('statement', 'build',") ? false : clean(r, 'calm'), 'the starter statement as a replace chain passes as calm (each exit ends before the next fragment)', why(r));

  // each fragment's text sound meets the frame its last word visibly stops
  const probe = join(TMP, 'probe.mts'); // .mts: an ES module (top-level await) wherever it sits
  writeFileSync(probe, `import { pathToFileURL } from 'node:url';
const S = process.argv[2];
const at = (p: string) => import(pathToFileURL(S + p).href);
const { chainOf, f60 } = await at('/src/timeline.ts');
const A = await at('/src/lib/anim.ts');
const { STATEMENT_SIZE } = await at('/src/acts/Act1.tsx');
const cues = (await at('/src/sync.ts')).default();
const p = A.pace, ease = A.easeOf(p);
const text = cues.filter((e: any) => e.kind === 'text').map((e: any) => e.f);
const rest = chainOf('statement').map((c: any) => {
  const n = c.text.split(/\\s+/).filter(Boolean).length;
  const s = c.in + f60((n - 1) * p.stagger), e = s + f60(p.wordDur);
  const k = A.arriveK(p.rise * STATEMENT_SIZE, e - s, ease);
  for (let F = Math.ceil(s); F <= e; F++) if (1 - A.arrive(ease((F - s) / (e - s)), k) <= 0.03) return F;
  return e;
});
console.log(JSON.stringify({ text, rest }));
`);
  const pr = spawnSync('npx', ['tsx', probe, STARTER], { encoding: 'utf8', cwd: STARTER, shell: process.platform === 'win32' });
  let got = null;
  try {
    got = JSON.parse(pr.stdout.trim().split('\n').pop());
  } catch {
    /* reported below */
  }
  result(!!got && got.text.length === got.rest.length && got.text.every((f, i) => Math.abs(f - got.rest[i]) <= 1),
    "each fragment's text sound lands within 1 f of its last word's visible stop", got ? `sounds ${got.text.join(', ')}, at rest ${got.rest.join(', ')}` : (pr.stderr || pr.stdout).trim().slice(0, 300));

  // new-film.sh --pace crisp: the scaffold passes grid-check as it comes
  const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
  const bash = process.platform === 'win32' ? (existsSync(gitBash) ? gitBash : null) : 'bash';
  if (!bash) console.log('skip  new-film.sh --pace crisp (no bash: install Git for Windows)');
  else {
    const film = join(TMP, 'crisp-film').split('\\').join('/');
    const nf = spawnSync(bash, [join(SKILL, 'scripts', 'new-film.sh').split('\\').join('/'), film, '--pace', 'crisp', '--no-install'], { encoding: 'utf8' });
    const g = nf.status === 0 ? run('npx', ['tsx', GRID, join(film, 'src', 'timeline.ts'), '--json'], STARTER) : { error: (nf.stderr || nf.stdout).trim().slice(0, 300) };
    result(clean(g, 'crisp') && g.summary?.bpm === 120, 'new-film.sh --pace crisp scaffolds a film that passes grid-check (120 BPM, crisp)', why(g));
  }
}

rmSync(TMP, { recursive: true, force: true });
console.log(failed ? `grid-check tests: ${failed} failed` : 'grid-check tests: all pass');
process.exit(failed ? 1 : 0);
