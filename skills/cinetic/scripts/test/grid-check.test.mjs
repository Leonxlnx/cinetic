#!/usr/bin/env node
/**
 * grid-check.test.mjs: regression tests for the timing and text-flow checks in grid-check.ts and
 * for the starters' timing helpers.
 *
 *   1. Every timeline in grid-fixtures/ declares what it must produce in its first lines
 *      (`expect: check=N check:warn=N`, or `expect: (none)`); every other check must stay silent.
 *      A fixture may add arguments on an `args:` line (files resolve next to the fixture), e.g.
 *      `args: --cues declares-cover.cues.json`. Music mode: music-124 (a 124 BPM track whose first
 *      downbeat is at 0.37 s) passes every music check (it fails only scene-length: its lockup holds 7.7 s, the house
 *      2 s); music-errors and music-metronome fail and warn as declared. A film that declares its LOOK is held to
 *      scene-length (no shot over 3.2 s, the lockup 2.5 s and gone 2 s after its mark); the bare timing fixtures are not.
 *      The script: script-pile (a keyword pile) and script-lines (two lines at once, a declared swap, a
 *      sentence on two lines, the script's reading budget) warn and fail as declared. The spine (SPINE_PLAN, most
 *      with `args: --part spine`): spine-flow (one action, one case, one element carrying every change) passes clean;
 *      spine-beats (a line, a card, a cut, again) fails the carry, bare, lines, case, end, checklist and
 *      text-then-cards rules; spine-long (40 s) holds the carry family as warnings; spine-shape fails the plan's
 *      shape; spine-timeline is read by the default run. A template film with no SPINE_PLAN warns, a film that plays
 *      the spine (src/spine.ts) without one fails, and so does --part spine. The starter's planSpine() output is read
 *      as it is: a planned spine that flows passes clean, a planned beat film fails.
 *   2. The HyperFrames starter: grid-check reads its timeline.js (FILM, with the pace from
 *      motion.js) and passes it as calm with no finding, at its own 120 BPM and at 100 BPM; the
 *      accent's fall always lands on CUE.hit (DUR.fall comes from the grid); chain() in replace
 *      mode lets a fragment's exit finish before the next one rises; with a music.js carrying a
 *      124 BPM track it is checked on the music's grid (music mode), both when Node can require it
 *      and when it runs in a vm (motion.js, music.js, timeline.js, as the browser loads them).
 *   3. The Remotion starter (needs its tsx: npm install in assets/remotion-starter):
 *      - it passes as calm with no finding; --pace crisp overrides its PACE_NAME and holds it to
 *        the crisp numbers, where at most its gaps are flagged (event-gap, chain-gap);
 *      - with a track in (124, 104 and 128 BPM, the first downbeat 0.25 s in, a stop ending 0.4 s after the last bar
 *        line) every act starts on a downbeat with no error, and its TAIL holds the stop's gap before the 1 s tail;
 *      - its statement rewritten as a replace chain passes too (chain() times each exit to end
 *        before the next fragment rises);
 *      - each fragment's `text` sound (src/sync.ts) lands within 1 f of the frame its last word
 *        visibly stops (the drawn rise, through arrive(), at the statement's size);
 *      - new-film.sh --pace crisp --template none scaffolds a film that passes grid-check, and new-film.sh --format update
 *        one whose changes are short sentences with no error or script warning, and every film template in
 *        assets/templates one with no error and no script warning, which with a track in (104 and 136 BPM, the
 *        first downbeat 0.25 s in, a stop ending 0.4 s after the last bar line) still has every act line on a
 *        downbeat, no error and a tail that holds the stop's element and 1 s after it; each template's end card
 *        holds 1.2-1.8 s from the frame it is whole (a stop ending's gap more at most); and a template that deals
 *        its devices never replays its own deal (its floor, what the unnamed scaffold plays): for 24 product names
 *        every deal differs from the floor in at least half its slots, the names deal many sequences, and the
 *        scaffold keeps the floor (needs bash; on Windows, Git for Windows' bash).
 *
 * grid-check.ts runs under Node's TypeScript type stripping (Node 22.18+, or older 22.x with
 * --experimental-strip-types), so the fixtures are self-contained timelines with no imports. The
 * Remotion starter's timeline imports src/lib/pace.ts without an extension, which plain Node cannot
 * resolve: that part runs only when the starter has tsx installed (npm install in the starter).
 *
 * Usage (from the skill root):  node scripts/test/grid-check.test.mjs [--verbose] [--part fixtures|hf|starter|films|templates] [--template NAME]
 * (--part runs one section, so a shared machine's job limit holds each run; --template narrows the templates part.)
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const argAt = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const part = argAt('--part') ?? 'all';
const onlyTemplate = argAt('--template');
if (!['all', 'fixtures', 'hf', 'starter', 'films', 'templates'].includes(part)) throw new Error(`--part ${part}: fixtures, hf, starter, films or templates`);
const runs = (k) => part === 'all' || part === k;
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
for (const f of runs('fixtures') ? readdirSync(FIX).filter((x) => x.endsWith('.ts')).sort() : []) {
  const lines = readFileSync(join(FIX, f), 'utf8').split('\n').slice(0, 3);
  const head = lines.filter((l) => !/\bargs:/.test(l)).join(' ');
  const expect = {};
  for (const m of head.matchAll(/\b([a-z-]+(?::warn)?)=(\d+)/g)) expect[m[1]] = Number(m[2]);
  // extra arguments from an `// args: --cues x.json` line; file names resolve next to the fixture
  const extra = (lines.find((l) => /\bargs:/.test(l)) ?? '').replace(/^.*\bargs:\s*/, '').split(/\s+/).filter(Boolean)
    .map((a) => (!a.startsWith('-') && existsSync(join(FIX, a)) ? join(FIX, a) : a));
  // timing fixtures skip the wording (copy-check.py) unless their args line asks for it with --copy
  const r = run(process.execPath, [...strip, '--no-warnings', GRID, join(FIX, f), '--json', ...(extra.includes('--copy') ? [] : ['--no-copy']), ...extra]);
  const got = count(r.findings ?? []);
  const keys = new Set([...Object.keys(expect), ...Object.keys(got)]);
  const diffs = [...keys].filter((k) => (expect[k] ?? 0) !== (got[k] ?? 0)).map((k) => `${k}: want ${expect[k] ?? 0}, got ${got[k] ?? 0}`);
  const wantFail = Object.keys(expect).some((k) => !k.endsWith(':warn'));
  if (r.error) diffs.push(r.error);
  else if ((r.code === 1) !== wantFail) diffs.push(`exit ${r.code}, want ${wantFail ? 1 : 0}`);
  result(!diffs.length, `fixture ${f}`, diffs.join('; ') || Object.entries(expect).map(([k, v]) => `${k}=${v}`).join(' ') || 'clean');
  if (verbose || diffs.length) for (const x of r.findings ?? []) console.log(`      ${x.severity} ${x.check}: ${x.message.slice(0, 140)}`);
}
// the spine's declaration: a template film with no SPINE_PLAN warns, one that plays the spine and exports none fails,
// --part spine on a timeline with no plan fails, and a plan in a film over 35 s holds the carry family as warnings
if (runs('fixtures')) {
  const dir = join(TMP, 'spine-film');
  mkdirSync(join(dir, 'src'), { recursive: true });
  copyFileSync(join(FIX, 'beats-loop-meets.ts'), join(dir, 'src', 'timeline.ts'));
  const spineOf = (args = []) => {
    const r = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir, 'src', 'timeline.ts'), '--json', '--no-copy', ...args]);
    return { code: r.code, d: (r.findings ?? []).filter((x) => x.check === 'spine-declared').map((x) => x.severity), error: r.error };
  };
  const plain = spineOf();
  writeFileSync(join(dir, 'film.json'), JSON.stringify({ template: 'launch-simple' }));
  const tmpl = spineOf();
  writeFileSync(join(dir, 'src', 'spine.ts'), 'export const SPINE = {};\n');
  const played = spineOf();
  const part = spineOf(['--part', 'spine']);
  result(plain.code === 0 && !plain.d.length && tmpl.code === 0 && tmpl.d.join() === 'warn' && played.code === 1 && played.d.join() === 'error' && part.code === 1 && part.d.join() === 'error',
    'spine-declared: silent without a template, a warning in a template film with no SPINE_PLAN, an error beside src/spine.ts and with --part spine',
    JSON.stringify({ plain, tmpl, played, part }));
  // the starter's planSpine() output is what grid-check reads: a spine that flows passes clean, a beat film fails
  const LIBSPINE = join(STARTER, 'src', 'lib', 'spine.ts');
  if (!existsSync(LIBSPINE)) console.log('skip  planned spines: no src/lib/spine.ts in the starter');
  else {
    const gen = join(TMP, 'plan-spines.mts');
    writeFileSync(gen, `import { writeFileSync } from 'node:fs';
import { planSpine } from ${JSON.stringify(new URL(`file:///${LIBSPINE.replace(/\\/g, '/')}`).href)};
const b = (bar, beat = 0) => Math.round(((bar - 1) * 4 + beat) * 30);
const flow = { sentence: 'Fernway turns one sentence into a booking page that fills itself.', element: 'request',
  case: { request: 'A booking page for my Sunday choir rehearsal', names: ['Sunday Choir'], numbers: ['42'] },
  acts: [
    { verb: 'asks', scenes: ['word', 'pill'], line: { text: 'Fernway writes your booking page.', becomes: 'pill' }, strings: ['A booking page for my Sunday choir rehearsal'], devices: [{ id: 'macro-type' }] },
    { verb: 'writes', scenes: ['page'], strings: ['Sunday Choir', 'Book a seat'] },
    { verb: 'publishes', scenes: ['button', 'pill'], line: { text: 'Live at fernway.page/choir', place: 'inside' }, strings: ['Live at fernway.page/choir'] },
    { verb: 'fills', scenes: ['notice', 'count', 'mark'], line: { text: 'It tells you who booked.', place: 'around' }, strings: ['42 booked', 'Sunday Choir'] },
  ], claim: { text: 'Your page fills itself.', join: { in: 'element' } } };
const beats = { sentence: 'Ledger plans your lessons.', element: 'card', case: { request: 'Plan my week of lessons' },
  acts: [
    { verb: 'asks', scenes: ['pill'], line: { text: 'Ledger plans your lessons.' }, strings: ['Plan my week of lessons'] },
    { verb: 'shows', scenes: [{ form: 'card', via: 'cut' }, { form: 'photo', via: 'cut' }], line: { text: 'It fills your week.', place: 'alone' } },
    { verb: 'reminds', scenes: [{ form: 'notice', via: 'cut' }], line: { text: 'It reminds your class.', place: 'alone' } },
    { verb: 'ends', scenes: [{ form: 'mark', via: 'cut' }] },
  ] };
for (const [name, s] of [['flow', flow], ['beats', beats]]) writeFileSync(${JSON.stringify(TMP.replace(/\\/g, '/'))} + '/planned-' + name + '.ts', 'export const FPS = 60;\\nexport const SPINE_PLAN = ' + JSON.stringify(planSpine(s, { fps: 60, b, bars: 10 })) + ';\\n');
`);
    const g = spawnSync(process.execPath, [...strip, '--no-warnings', gen], { encoding: 'utf8' });
    if (g.status !== 0) result(false, 'planned spines: planSpine() runs on two spines', (g.stderr || '').trim().split('\n').slice(-2).join(' | '));
    else {
      const chk = (name) => run(process.execPath, [...strip, '--no-warnings', GRID, join(TMP, `planned-${name}.ts`), '--part', 'spine', '--json']);
      const flow = chk('flow');
      const beats = chk('beats');
      const errs = new Set((beats.findings ?? []).filter((x) => x.severity === 'error').map((x) => x.check));
      const want = ['spine-carry', 'spine-bare', 'spine-lines', 'text-then-cards', 'spine-case', 'spine-end'];
      result(flow.code === 0 && !(flow.findings ?? []).length && beats.code === 1 && want.every((k) => errs.has(k)),
        'planned spines (lib/spine planSpine): one that flows passes --part spine clean, a beat film fails carry, bare, lines, text-then-cards, case and end',
        flow.error ?? beats.error ?? `flow ${flow.code} ${why(flow)}; beats ${beats.code} [${[...errs].join(', ')}]`);
    }
  }
}

// 2. the HyperFrames starter (plain node: timeline.js and motion.js are classic scripts)
const hfAt = (bpm, o = {}) => {
  // a copy of motion.js + timeline.js at another tempo, as new-film.sh --bpm writes it; with o.music a
  // music.js carrying that track (as track.py grid writes it); with o.esm an ES-module package, where
  // grid-check cannot import timeline.js and runs motion.js, music.js and timeline.js in a vm
  const dir = join(TMP, `hf-${bpm}${o.music ? '-music' : ''}${o.esm ? '-esm' : ''}`);
  mkdirSync(dir, { recursive: true });
  const motion = readFileSync(join(HF, 'motion.js'), 'utf8').replace(/^(\s*const BPM = )[^;]+;/m, (_, head) => `${head}${bpm};`);
  writeFileSync(join(dir, 'motion.js'), motion);
  copyFileSync(join(HF, 'timeline.js'), join(dir, 'timeline.js'));
  if (o.music) {
    const src = readFileSync(join(HF, 'music.js'), 'utf8');
    if (!src.includes('const MUSIC = null;')) throw new Error('music.js no longer carries the stub line');
    writeFileSync(join(dir, 'music.js'), src.replace('const MUSIC = null;', `const MUSIC = ${JSON.stringify(o.music)};`));
  }
  writeFileSync(join(dir, 'package.json'), o.esm ? '{ "private": true, "type": "module" }\n' : '{ "private": true }\n'); // CommonJS, like the starter's
  const ctx = {};
  ctx.window = ctx;
  createContext(ctx);
  for (const f of ['motion.js', ...(o.music ? ['music.js'] : []), 'timeline.js']) runInContext(readFileSync(join(dir, f), 'utf8'), ctx, { filename: f });
  return { dir, FILM: ctx.FILM, MOTION: ctx.MOTION };
};
if (runs('hf')) {
for (const bpm of [120, 100]) {
  const { dir, FILM } = hfAt(bpm);
  const r = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir, 'timeline.js'), '--json']);
  result(clean(r, 'calm') && r.summary?.bpm === bpm, `the HyperFrames starter's timeline.js passes as calm with no finding at ${bpm} BPM`, why(r));
  result(FILM.CUE.fall + FILM.DUR.fall === FILM.CUE.hit, `the HyperFrames accent's fall lands on CUE.hit at ${bpm} BPM`, `fall ${FILM.CUE.fall} + ${FILM.DUR.fall} vs hit ${FILM.CUE.hit}`);
}
{
  // music mode: a 124 BPM track, first downbeat at 0.37 s, two bars of body, a 0.3 s stop before the reveal
  const BEATF = (60 / 124) * 60;
  const T0 = 0.37 * 60;
  const d = Array.from({ length: 4 }, (_, i) => T0 + i * 4 * BEATF);
  const reveal = T0 + 7 * BEATF; // CUE.word2 = b(2, 3), the starter's REVEAL
  const music = { bpm: 124, beatS: 60 / 124, fps: 60, t0: T0, bars: 2, phraseLen: 4, downbeats: d, accents: [{ f: T0 + 0.3, db: 9, band: 'low' }],
    phrases: [T0], entries: [], breaks: [], stops: [{ from: reveal - 18, to: reveal }], end: { mode: 'stop', f: d[2] } };
  for (const esm of [false, true]) {
    const { dir, FILM } = hfAt(120, { music, esm });
    const r = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir, 'timeline.js'), '--json']);
    result(clean(r, 'calm') && r.summary?.bpm === 124 && r.summary?.music?.bpm === 124 && FILM.b(1) === Math.round(T0),
      `the HyperFrames starter with a 124 BPM music.js is checked on the music grid (${esm ? 'in a vm: motion.js, music.js, timeline.js' : 'required by timeline.js'})`,
      why(r) || `bpm ${r.summary?.bpm}, music ${JSON.stringify(r.summary?.music)}`);
  }
  // no stop in the track before the reveal: reveal-dip warns, until audio/score.json adds a stop-down that ends on it
  const { dir } = hfAt(100, { music: { ...music, stops: [] } });
  const bare = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir, 'timeline.js'), '--json']);
  const dipWarn = (r) => (r.findings ?? []).some((x) => x.check === 'reveal-dip');
  mkdirSync(join(dir, 'audio'), { recursive: true });
  writeFileSync(join(dir, 'audio', 'score.json'), JSON.stringify({ stopdowns: { auto: 'kit', add: [{ at: '@word2', depth: 'stop' }] } }));
  const added = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir, 'timeline.js'), '--json']);
  result(dipWarn(bare) && !dipWarn(added), "reveal-dip counts a score.json stop-down that ends on the reveal (stopdowns.add, depth 'stop')",
    `without it: ${dipWarn(bare) ? 'warns' : 'no warning'}; with it: ${dipWarn(added) ? 'still warns' : 'clean'}`);
  // the kit's own stop-down, placed by plan.py (out/qa/sfx_plan.json), ends on the reveal too
  const { dir: dir2 } = hfAt(100, { music: { ...music, stops: [] } });
  mkdirSync(join(dir2, 'out', 'qa'), { recursive: true });
  writeFileSync(join(dir2, 'out', 'qa', 'sfx_plan.json'), JSON.stringify({ stopdowns: [
    { for: 'a:hit', t: reveal / 60, from: reveal / 60 - 0.4, status: 'added' }, { for: 'a:far', t: 0.5, status: 'skipped' }] }));
  const planned = run(process.execPath, [...strip, '--no-warnings', GRID, join(dir2, 'timeline.js'), '--json']);
  result(!dipWarn(planned), "reveal-dip counts the kit's stop-down that plan.py placed on the reveal (out/qa/sfx_plan.json)",
    dipWarn(planned) ? 'still warns' : '');
}
{
  const { FILM, MOTION } = hfAt(120);
  const [a, b] = FILM.chain('t', 'replace', [['One move', 0], ['then the next', 200]]);
  const want = 200 - Math.round(((MOTION.pace.exitDur + 6) * MOTION.FPS) / 60);
  result(a.out === want && b.in - a.out >= MOTION.pace.exitDur, "the HyperFrames chain() lets a replace fragment's exit end before the next rises", `out ${a.out}, want ${want}`);
}
}

// 3. the Remotion starter (needs its tsx: npm install in assets/remotion-starter)
const calm = !(runs('starter') || runs('films') || runs('templates')) ? { error: 'skipped' } : existsSync(join(STARTER, 'node_modules', '.bin')) ? (runs('starter') ? run('npx', ['tsx', GRID, 'src/timeline.ts', '--json'], STARTER) : {}) : null;
if (calm?.error === 'skipped') {
  // another part was asked for
} else if (!calm || /another platform/.test(calm.error ?? '')) {
  // no install, or one made for another OS (a Windows node_modules seen from WSL): nothing to run it with
  console.log('skip  the Remotion starter (run npm install in assets/remotion-starter, on this OS, to include it)');
} else {
  if (runs('starter')) {
  result(clean(calm, 'calm'), 'the Remotion starter passes as calm with no finding', why(calm));
  const crisp = run('npx', ['tsx', GRID, 'src/timeline.ts', '--json', '--pace', 'crisp'], STARTER);
  const checks = new Set((crisp.findings ?? []).map((x) => x.check));
  result(crisp.summary?.pace === 'crisp' && [...checks].every((c) => c === 'event-gap' || c === 'chain-gap'), '--pace crisp overrides PACE_NAME (the summary reads crisp; at most its gaps are flagged)',
    crisp.error ?? `pace ${crisp.summary?.pace}, ${[...checks].join(', ')}`);

  // the statement as a replace chain: chain() must time each exit to end before the next fragment rises
  const rep = join(TMP, 'replace');
  mkdirSync(join(rep, 'lib'), { recursive: true });
  copyFileSync(join(STARTER, 'src', 'lib', 'pace.ts'), join(rep, 'lib', 'pace.ts'));
  if (existsSync(join(STARTER, 'src', 'music.ts'))) copyFileSync(join(STARTER, 'src', 'music.ts'), join(rep, 'music.ts')); // timeline.ts imports ./music
  const tl = readFileSync(join(STARTER, 'src', 'timeline.ts'), 'utf8');
  writeFileSync(join(rep, 'timeline.ts'), tl.replace("chain('statement', 'build',", "chain('statement', 'replace',"));
  const r = run('npx', ['tsx', GRID, join(rep, 'timeline.ts'), '--json', '--no-copy'], STARTER); // timing only: its fragments become lines of two words
  const timing = { ...r, findings: (r.findings ?? []).filter((x) => x.check !== 'script') };
  result(!tl.includes("chain('statement', 'build',") ? false : clean(timing, 'calm'),
    'the starter statement as a replace chain passes as calm (each exit ends before the next fragment)', why(timing));

  // the starter with a track in: a steady bed whose first downbeat is 0.25 s in, accented on every beat, ending on a
  // stop 0.4 s after the bar line where the bed ends. Every act starts on a downbeat (structural-on-music), the
  // statement's picture beat holds (chain-gap), and the tail makes room for the stop: TOTAL is the stop's element
  // plus 1 s (no error, at the planned 124 BPM and at 104 and 128)
  {
    const sw = join(TMP, 'starter-music');
    mkdirSync(join(sw, 'lib'), { recursive: true });
    copyFileSync(join(STARTER, 'src', 'lib', 'pace.ts'), join(sw, 'lib', 'pace.ts'));
    copyFileSync(join(STARTER, 'src', 'timeline.ts'), join(sw, 'timeline.ts'));
    const stub = readFileSync(join(STARTER, 'src', 'music.ts'), 'utf8');
    const bars = 7;
    for (const bpm of [124, 104, 128]) {
      const beatF = (60 / bpm) * 60;
      const t0 = 0.25 * 60;
      const D = Array.from({ length: bars + 1 }, (_, k) => +(t0 + k * 4 * beatF).toFixed(3));
      const accents = Array.from({ length: bars * 4 }, (_, k) => ({ f: +(t0 + k * beatF).toFixed(3), db: k % 4 ? 6 : 9, band: 'low' }));
      const endF = +(D[bars] + 0.4 * 60).toFixed(3);
      const M = `export const MUSIC: Music | null = { bpm: ${bpm}, beatS: ${60 / bpm}, fps: 60, t0: ${t0}, bars: ${bars}, phraseLen: 4, downbeats: ${JSON.stringify(D)}, accents: ${JSON.stringify(accents)}, phrases: [${t0}], entries: [], breaks: [], stops: [], end: { mode: 'stop', f: ${endF} } };`;
      if (!stub.includes('export const MUSIC: Music | null = null;')) throw new Error('src/music.ts no longer carries the stub line');
      writeFileSync(join(sw, 'music.ts'), stub.replace('export const MUSIC: Music | null = null;', M));
      const g = run('npx', ['tsx', GRID, join(sw, 'timeline.ts'), '--json'], STARTER);
      // the starter's demo is bar-locked (its shots are bars of the track): slower than its own 120 BPM a shot runs past
      // 3.2 s, which scene-length fails in a real film (checked on the scaffolds above and below); this run checks the music
      const errs = (g.findings ?? []).filter((x) => x.severity === 'error' && !(x.check === 'scene-length' && bpm < 120));
      const total = Math.ceil(endF) + 60;
      result(!g.error && !errs.length && g.summary?.bpm === bpm && g.summary?.total === total,
        `the starter with a ${bpm} BPM track and a stop ending: acts on downbeats, no error, the tail holds the stop (TOTAL ${total})`,
        g.error ?? (errs.map((x) => `${x.check}: ${x.message.slice(0, 90)}`).join('; ') || `bpm ${g.summary?.bpm}, total ${g.summary?.total}`));
    }
  }

  // each fragment's text sound meets the frame its last word visibly stops
  const probe = join(TMP, 'probe.mts'); // .mts: an ES module (top-level await) wherever it sits
  writeFileSync(probe, `import { pathToFileURL } from 'node:url';
const S = process.argv[2];
const at = (p: string) => import(pathToFileURL(S + p).href);
const { chainOf, copy, f60 } = await at('/src/timeline.ts');
const A = await at('/src/lib/anim.ts');
const { STATEMENT_SIZE } = await at('/src/acts/Act1.tsx');
const cues = (await at('/src/sync.ts')).default();
const p = A.pace, ease = A.easeOf(p);
const text = cues.filter((e: any) => e.kind === 'text').map((e: any) => e.f);
const rest = [...chainOf('statement'), copy('frame')].map((c: any) => { // the demo's text sounds: the statement's fragments, then the frame line
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

  }
  // new-film.sh --pace crisp: the starter's own acts (--template none; a launch is the simple launch by default, tested
  // with the templates below) pass grid-check as they come
  const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
  const bash = process.platform === 'win32' ? (existsSync(gitBash) ? gitBash : null) : 'bash';
  if (!bash) console.log('skip  new-film.sh --pace crisp (no bash: install Git for Windows)');
  else if (runs('films') || runs('templates')) {
    if (runs('films')) {
    const film = join(TMP, 'crisp-film').split('\\').join('/');
    const nf = spawnSync(bash, [join(SKILL, 'scripts', 'new-film.sh').split('\\').join('/'), film, '--pace', 'crisp', '--template', 'none', '--no-install'], { encoding: 'utf8' });
    const g = nf.status === 0 ? run('npx', ['tsx', GRID, join(film, 'src', 'timeline.ts'), '--json'], STARTER) : { error: (nf.stderr || nf.stdout).trim().slice(0, 300) };
    result(clean(g, 'crisp') && g.summary?.bpm === 120, 'new-film.sh --pace crisp scaffolds a film that passes grid-check (120 BPM, crisp)', why(g));
    // new-film.sh --format update: the template's changes are short sentences, one line at a time
    const upd = join(TMP, 'update-film').split('\\').join('/');
    const nu = spawnSync(bash, [join(SKILL, 'scripts', 'new-film.sh').split('\\').join('/'), upd, '--format', 'update', '--no-install'], { encoding: 'utf8' });
    const gu = nu.status === 0 ? run('npx', ['tsx', GRID, join(upd, 'src', 'timeline.ts'), '--json'], STARTER) : { error: (nu.stderr || nu.stdout).trim().slice(0, 300) };
    const bad = (gu.findings ?? []).filter((x) => x.severity === 'error' || x.check === 'script');
    result(gu.code === 0 && !gu.error && !bad.length, 'new-film.sh --format update scaffolds an update film whose changes are sentences (no error, no script warning)',
      gu.error ?? bad.map((x) => `${x.check}: ${x.message.slice(0, 90)}`).join('; '));
    }
    // new-film.sh --template <name>: every film template scaffolds a film whose script passes as it comes, and with a
    // track in (a steady fake one whose first downbeat is 0.25 s in, at a slow and a fast tempo, ending on a stop whose
    // element sounds 0.4 s after the bar line where the bed stops) every act line still lands on a downbeat, the first
    // act starts on frame 0, no line loses its read (no error) and the tail holds the stop: its element and 1 s after it
    const templates = !runs('templates') ? [] : readdirSync(join(SKILL, 'assets', 'templates')).filter((n) => existsSync(join(SKILL, 'assets', 'templates', n, 'template.json')) && (!onlyTemplate || n === onlyTemplate)).sort();
    const holds = [];
    for (const name of templates) {
      const dir = join(TMP, `tpl-${name}`).split('\\').join('/');
      const nt = spawnSync(bash, [join(SKILL, 'scripts', 'new-film.sh').split('\\').join('/'), dir, '--template', name, '--no-install'], { encoding: 'utf8' });
      const gt = nt.status === 0 ? run('npx', ['tsx', GRID, join(dir, 'src', 'timeline.ts'), '--json'], STARTER) : { error: (nt.stderr || nt.stdout).trim().slice(0, 300) };
      const worse = (gt.findings ?? []).filter((x) => x.severity === 'error' || x.check === 'script');
      result(gt.code === 0 && !gt.error && !worse.length, `new-film.sh --template ${name} scaffolds a film that passes grid-check (no error, no script warning)`,
        gt.error ?? worse.map((x) => `${x.check}: ${x.message.slice(0, 90)}`).join('; '));
      const sm = gt.summary;
      if (!sm) continue;
      const musicTs = join(dir, 'src', 'music.ts');
      const stub = readFileSync(musicTs, 'utf8');
      const bars = Math.round((sm.total - sm.fps) / sm.bar);
      const t0 = 0.25 * sm.fps;
      const stopTrack = (bpm, n = bars) => {
        const beatF = (60 / bpm) * sm.fps;
        const D = Array.from({ length: n + 1 }, (_, k) => +(t0 + k * 4 * beatF).toFixed(3));
        const endF = +(D[n] + 0.4 * sm.fps).toFixed(3);
        const M = `export const MUSIC: Music | null = { bpm: ${bpm}, beatS: ${60 / bpm}, fps: ${sm.fps}, t0: ${t0}, bars: ${n}, phraseLen: 4, downbeats: ${JSON.stringify(D)}, accents: [], phrases: [${t0}], entries: [], breaks: [], stops: [], end: { mode: 'stop', f: ${endF} } };`;
        return { endF, music: stub.replace('export const MUSIC: Music | null = null;', M) };
      };
      for (const bpm of [104, 136]) {
        let { endF, music } = stopTrack(bpm);
        writeFileSync(musicTs, music);
        let gm = run('npx', ['tsx', GRID, join(dir, 'src', 'timeline.ts'), '--json'], STARTER);
        // a template whose acts grow a bar where a read needs it (src/timeline.ts BARS) has its own bar count at this
        // tempo: the edit is cut to it (track.py edit --bars BARS), so the fake track is too
        const body = (gm.findings ?? []).map((x) => x.check === 'music-grid' && /TOTAL - TAIL = (\d+) f/.exec(x.message)).find(Boolean);
        if (body) {
          ({ endF, music } = stopTrack(bpm, Math.round((Number(body[1]) - t0) / ((240 / bpm) * sm.fps))));
          writeFileSync(musicTs, music);
          gm = run('npx', ['tsx', GRID, join(dir, 'src', 'timeline.ts'), '--json'], STARTER);
        }
        const errs = (gm.findings ?? []).filter((x) => x.severity === 'error');
        const room = gm.summary ? gm.summary.total - Math.ceil(endF) : NaN;
        result(!gm.error && !errs.length && gm.summary?.bpm === bpm && room >= sm.fps,
          `--template ${name} with a ${bpm} BPM track (first downbeat 0.25 s in) and a stop ending: acts on downbeats, no error, the tail holds the stop's element and 1 s after it`,
          gm.error ?? (errs.map((x) => `${x.check}: ${x.message.slice(0, 90)}`).join('; ') || `total ${gm.summary?.total}, ${room} f after the stop's element`));
      }
      writeFileSync(musicTs, stub);
      // the end hold, read below in one process: the scaffold as it comes, and a copy with the stop-ending track at its own tempo
      const stopDir = `${dir}-stop`;
      cpSync(join(dir, 'src'), join(stopDir, 'src'), { recursive: true });
      const own = stopTrack(sm.bpm);
      writeFileSync(join(stopDir, 'src', 'music.ts'), own.music);
      holds.push({ name, dir, stopDir, endF: own.endF });
    }
    // the end hold: from the frame the end card is whole (the lock begins and every line that stays to the end is
    // resolved) to the last frame, about 1.2-1.8 s, creeping (the acts keep the hold alive); a stop ending adds its gap
    const holdProbe = join(TMP, 'hold.mts');
    writeFileSync(holdProbe, `import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const out: Record<string, unknown> = {};
for (const [key, dir] of JSON.parse(readFileSync(process.argv[2], 'utf8')) as [string, string][]) {
  try {
    const T = await import(pathToFileURL(dir + '/src/timeline.ts').href);
    const body = T.TOTAL - T.TAIL;
    const whole = Math.max(T.END.from, ...T.COPY.filter((c: any) => (c.out ?? T.TOTAL) >= body).map((c: any) => c.resolved));
    out[key] = { fps: T.FPS, total: T.TOTAL, body, whole };
  } catch (e: any) { out[key] = { error: String(e?.message ?? e).split(String.fromCharCode(10))[0].slice(0, 200) }; }
}
console.log(JSON.stringify(out));
`);
    const dirs = join(TMP, 'hold-dirs.json');
    writeFileSync(dirs, JSON.stringify(holds.flatMap((h) => [[h.name, h.dir], [`${h.name}-stop`, h.stopDir]])));
    const hp = spawnSync('npx', ['tsx', holdProbe, dirs], { encoding: 'utf8', cwd: STARTER, shell: process.platform === 'win32' });
    let H = null;
    try {
      H = JSON.parse(hp.stdout.trim().split('\n').pop());
    } catch {
      /* reported below */
    }
    // the deal: a film made from a template never replays the template's own deal (src/deal.ts FLOOR, what the unnamed
    // scaffold plays): for 24 product names every deal differs from the floor in at least half its slots and the names
    // deal many different sequences; the scaffold itself, still unnamed, keeps the floor
    const dealProbe = join(TMP, 'deal.mts');
    writeFileSync(dealProbe, `import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const NAMES = ['Tessel', 'Plinth', 'Northwind', 'Loomly', 'Quarry', 'Brightdesk', 'Halyard', 'Orbitly', 'Fernway', 'Glint', 'Parcel', 'Corvid',
  'Lumen', 'Basalt', 'Driftwood', 'Keel', 'Marlow', 'Sable', 'Verity', 'Waypoint', 'Zephyr', 'Ledgerly', 'Cobalt Notes', 'Pine & Post'];
const out: Record<string, unknown> = {};
for (const [key, dir] of JSON.parse(readFileSync(process.argv[2], 'utf8')) as [string, string][]) {
  if (!existsSync(dir + '/src/deal.ts')) { out[key] = null; continue; }
  try {
    const D = await import(pathToFileURL(dir + '/src/deal.ts').href);
    if (typeof D.dealOf !== 'function' || !D.FLOOR) throw new Error('deal.ts exports no dealOf(name) and FLOOR');
    const slots = Object.keys(D.FLOOR);
    const deals = NAMES.map((n) => D.dealOf(n));
    out[key] = { slots: slots.length, floorKept: JSON.stringify(D.DEAL) === JSON.stringify(D.FLOOR),
      minApart: Math.min(...deals.map((d: Record<string, string>) => slots.filter((s) => d[s] !== D.FLOOR[s]).length)),
      distinct: new Set(deals.map((d: unknown) => JSON.stringify(d))).size };
  } catch (e: any) { out[key] = { error: String(e?.message ?? e).split(String.fromCharCode(10))[0].slice(0, 200) }; }
}
console.log(JSON.stringify(out));
`);
    const dealDirs = join(TMP, 'deal-dirs.json');
    writeFileSync(dealDirs, JSON.stringify(holds.map((h) => [h.name, h.dir])));
    const dp = spawnSync('npx', ['tsx', dealProbe, dealDirs], { encoding: 'utf8', cwd: STARTER, shell: process.platform === 'win32' });
    let DL = null;
    try {
      DL = JSON.parse(dp.stdout.trim().split('\n').pop());
    } catch {
      /* reported below */
    }
    for (const h of holds) {
      const d = DL?.[h.name];
      if (DL && d === null) {
        console.log(`skip  --template ${h.name} deals no devices (one sequence: its film is told apart from the floor by its direction and the guard)`);
        continue;
      }
      result(!!d && !d.error && d.floorKept && 2 * d.minApart >= d.slots && d.distinct >= 6,
        `--template ${h.name}: no product's deal replays the template's own (at least half its slots differ from the floor; many sequences)`,
        d?.error ?? (d ? `${d.slots} slots, at least ${d.minApart} apart, ${d.distinct} deals of 24 names, scaffold keeps the floor: ${d.floorKept}` : (dp.stderr || dp.stdout).trim().slice(0, 300)));
    }
    for (const h of holds) {
      const a = H?.[h.name];
      const z = H?.[`${h.name}-stop`];
      const s = (x) => (x.total - x.whole) / x.fps;
      const gap = z ? (Math.ceil(h.endF) - z.body) / z.fps : NaN;
      // a template may state its own hold (template.json end_hold: [lo, hi] s; the simple launch holds its lockup 2-3 s), and
      // that a provisional stop ending is not held (end_stop: the update film's lockup ends 2 s after it forms, whatever
      // the track; track.py fit writes its real ending, a hit on the version mark faded under the tail)
      const tpl = JSON.parse(readFileSync(join(SKILL, 'assets', 'templates', h.name, 'template.json'), 'utf8'));
      const band = tpl.end_hold ?? [1.2, 1.8];
      const holdStop = tpl.end_stop === undefined;
      const [lo, hi] = band;
      const ok = !!a && !!z && !a.error && !z.error && s(a) >= lo - 1e-9 && s(a) <= hi + 1e-9 && s(z) >= lo - 1e-9 && s(z) <= hi + (holdStop ? gap : 0) + 1e-9 && (!holdStop || z.total - Math.ceil(h.endF) >= z.fps);
      result(ok, holdStop ? `--template ${h.name}: the end card holds ${lo}-${hi} s (a stop ending's gap more at most), the stop's element 1 s or more before the end` : `--template ${h.name}: the end card holds ${lo}-${hi} s, a provisional stop ending or not (its lockup's limit wins)`,
        a?.error ?? z?.error ?? (a && z ? `${s(a).toFixed(2)} s; with the stop ${s(z).toFixed(2)} s (gap ${gap.toFixed(2)} s, ${z.total - Math.ceil(h.endF)} f after the element)` : (hp.stderr || hp.stdout).trim().slice(0, 300)));
    }
  }
}

rmSync(TMP, { recursive: true, force: true });
console.log(failed ? `grid-check tests: ${failed} failed` : 'grid-check tests: all pass');
process.exit(failed ? 1 : 0);
