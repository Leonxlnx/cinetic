#!/usr/bin/env node
/**
 * film-diff.test.mjs: films differ from the last films and from their template (scripts/film-diff.mjs), and the
 * history reaches the next film (new-film.sh film.json, launch-simple src/recent.ts).
 *
 *   1. diff(): a ground, voice, signature or end card of one of the last three films fails; film.json allow (or
 *      --allow) lets the brief's repeat through; a template slot whose every choice the last three films used allows
 *      its least recent choice (warn); emphasis and logo warn on the last film's only; a move set sharing more than
 *      25 % (Jaccard) with one of the last three films fails, 25 % passes; a deal on the template's floor in more than
 *      half its slots fails; unnamed slots warn.
 *   2. The CLI on a film folder: film.json read, out/cues.json seams added by recipe, --record writes the history
 *      (newest first) and refuses a failing film, the next film repeating a ground fails, --history lists them.
 *   3. Every template that deals ships floor.json, and it is the deal of its unnamed scaffold's FLOOR shape.
 *   4. new-film.sh writes film.json (template, start time, the last three films) and, for launch-simple, the last films'
 *      dealt choices into src/recent.ts; the deal then leaves them out while another choice is free.
 *
 * Usage (from the skill root):  node scripts/test/film-diff.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const FD = join(SKILL, 'scripts', 'film-diff.mjs');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/film-diff.test.mjs [--verbose]');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (!ok || verbose) ? `  (${detail})` : ''}`);
};

const { diff, jaccard } = await import(pathToFileURL(FD).href);
const TMP = mkdtempSync(join(tmpdir(), 'film-diff-test-'));
const dev = (o) => ({ ground: '', voice: '', emphasis: '', signature: '', end: '', logo: '', moves: [], seams: [], ...o });
const H = [
  { name: 'A', devices: dev({ ground: 'deepPool', voice: 'build', emphasis: 'colour', signature: 'split-around', end: 'element', logo: 'element-becomes-mark', moves: ['push', 'counter', 'step-list'], seams: ['matchCut', 'blurThrough'] }) },
  { name: 'B', devices: dev({ ground: 'softSky', voice: 'blur', emphasis: 'none', signature: 'card-expand', end: 'badge', moves: ['whip', 'fan'], seams: ['velocityCut', 'zoomThrough'] }) },
  { name: 'C', devices: dev({ ground: 'blackField', voice: 'ink', emphasis: 'colour', signature: 'focus-isolate', end: 'element', moves: ['mask-grow', 'connectors'], seams: ['exitEnter', 'textSwap'] }) },
  { name: 'D (four back)', devices: dev({ ground: 'nearWhite', voice: 'decode' }) },
];
const fresh = dev({ ground: 'whiteBand', voice: 'decode', emphasis: 'scale', signature: 'slot-roll', end: 'wordmark', logo: 'badge-spins', moves: ['carousel', 'light-sweep', 'typing'], seams: ['sharedElement', 'exitEnter', 'blurThrough'] });
const checks = (f) => f.map((x) => `${x.severity}:${x.check}`);
const film = (d, extra = {}) => ({ devices: d, allow: [], deal: null, template: null, ...extra });

// 1. diff()
{
  const f0 = diff(film(fresh), H);
  result(!f0.some((x) => x.severity === 'error'), 'a film that repeats nothing of the last three passes', checks(f0).join(', '));
  result(!diff(film(dev({ ...fresh, voice: 'nearWhite', ground: 'nearWhite' })), H).some((x) => x.check === 'repeat'), 'the film four back does not count (the last three only)');
  for (const s of ['ground', 'voice', 'signature', 'end']) {
    const f = diff(film(dev({ ...fresh, [s]: H[1].devices[s] })), H);
    result(f.some((x) => x.check === 'repeat' && x.severity === 'error' && x.message.startsWith(s)), `a repeated ${s} (two films back) fails`, checks(f).join(', '));
  }
  const allowed = diff(film(dev({ ...fresh, ground: 'softSky' }), { allow: ['ground'] }), H);
  const flagAllowed = diff(film(dev({ ...fresh, ground: 'softSky' })), H, { allow: ['ground'] });
  result(!allowed.some((x) => x.check === 'repeat') && !flagAllowed.some((x) => x.check === 'repeat'), 'film.json allow and --allow let the brief\'s repeat through');
  const ch = { voice: ['build', 'blur', 'ink'] };
  const least = diff(film(dev({ ...fresh, voice: 'ink' })), H, { choices: ch });
  const notLeast = diff(film(dev({ ...fresh, voice: 'build' })), H, { choices: ch });
  result(least.some((x) => x.check === 'repeat' && x.severity === 'warn') && !least.some((x) => x.severity === 'error')
    && notLeast.some((x) => x.check === 'repeat' && x.severity === 'error'),
    'every template choice used by the last three films: the least recent one passes with a warning, a newer one fails', `${checks(least)} / ${checks(notLeast)}`);
  const soft = diff(film(dev({ ...fresh, emphasis: 'colour' })), H);
  const soft2 = diff(film(dev({ ...fresh, emphasis: 'none' })), H);
  result(soft.some((x) => x.check === 'repeat' && x.severity === 'warn' && x.message.startsWith('emphasis')) && !soft.some((x) => x.severity === 'error')
    && !soft2.some((x) => x.message.startsWith('emphasis')), 'emphasis warns on the last film\'s only, never fails');
  // jaccard: fresh vs A shares seam:blurThrough only
  const near = dev({ ...fresh, moves: ['push', 'counter', 'step-list'], seams: ['matchCut', 'blurThrough'], signature: 'split-around' });
  const j = jaccard(near, H[0].devices);
  const fj = diff(film(near), H);
  result(j > 0.25 && fj.some((x) => x.check === 'overlap' && x.severity === 'error'), 'a move set sharing more than 25 % with a recent film fails', `${j.toFixed(2)}`);
  // exactly 25 %: 2 shared of 8
  const a = dev({ voice: 'v1', moves: ['m1', 'm2'], seams: ['s1', 's2'] });
  const b = dev({ voice: 'v1', moves: ['m1', 'm3', 'm4'], seams: ['s3'] });
  result(Math.abs(jaccard(a, b) - 0.25) < 1e-9 && !diff(film(a), [{ devices: b }]).some((x) => x.check === 'overlap'), 'a move set sharing 25 % passes', jaccard(a, b).toFixed(3));
  const floor = { deal: { voice: 'build', ground: 'nearWhite', seamTA: 'matchCut', seamAT: 'blurThrough', end: 'element', camera: 'drift' } };
  const onFloor = diff(film(fresh, { template: 'launch-simple', deal: { ...floor.deal, voice: 'blur', ground: 'deepPool' } }), [], { floor });
  const offFloor = diff(film(fresh, { template: 'launch-simple', deal: { ...floor.deal, voice: 'blur', ground: 'deepPool', seamTA: 'velocityCut' } }), [], { floor });
  result(onFloor.some((x) => x.check === 'floor' && x.severity === 'error') && !offFloor.some((x) => x.check === 'floor'),
    'a deal on the template\'s floor in more than half its slots fails; half apart passes');
  const bare = diff(film(dev({})), []);
  result(bare.filter((x) => x.check === 'declared').length === 5, 'unnamed ground, voice, signature, end and too few moves warn', checks(bare).join(', '));
}

// 2. the CLI on film folders
const hist = join(TMP, 'history.json');
const env = { ...process.env, CINETIC_FILM_HISTORY: hist };
const fd = (...a) => spawnSync(process.execPath, [FD, ...a], { encoding: 'utf8', env });
const mkFilm = (name, devices, cues) => {
  const d = join(TMP, name);
  mkdirSync(join(d, 'src'), { recursive: true });
  mkdirSync(join(d, 'out'), { recursive: true });
  writeFileSync(join(d, 'package.json'), JSON.stringify({ name }));
  writeFileSync(join(d, 'film.json'), JSON.stringify({ template: null, devices, allow: [] }));
  if (cues) writeFileSync(join(d, 'out', 'cues.json'), JSON.stringify(cues));
  return d;
};
{
  const one = mkFilm('one', dev({ ground: 'deepPool', voice: 'build', signature: 'split-around', end: 'element', moves: ['push', 'counter'] }),
    { declared: { seams: [{ at: 100, kind: 'morph', id: 'matchCut:line-1' }, { at: 300, kind: 'defocus', id: 'blurThrough:pic-1' }, { at: 500, kind: 'hard', id: 'punchIn:pic1' }] } });
  const r1 = fd(one, '--record', '--json', '--no-tsx');
  const j1 = JSON.parse(r1.stdout || '{}');
  result(r1.status === 0 && JSON.stringify(j1.film?.devices?.seams) === JSON.stringify(['matchCut', 'blurThrough', 'hard']), 'cues.json seams join film.json by recipe (the id prefix), else by kind', r1.stdout.slice(0, 200) + r1.stderr);
  const h1 = JSON.parse(readFileSync(hist, 'utf8'));
  result(h1.length === 1 && h1[0].name === 'one' && h1[0].devices.ground === 'deepPool', '--record writes the film into the history');
  const r3 = fd(one, '--no-tsx');
  result(r3.status === 0, 'a film is never compared with its own earlier record', r3.stdout.slice(0, 300));
  const two = mkFilm('two', dev({ ground: 'deepPool', voice: 'blur', signature: 'card-expand', end: 'badge', moves: ['whip', 'fan'] }));
  const r2 = fd(two, '--record', '--no-tsx');
  result(r2.status === 1 && /FAIL\s+repeat: ground deepPool/.test(r2.stdout) && JSON.parse(readFileSync(hist, 'utf8')).length === 1,
    'the next film on the same ground fails and is not recorded', r2.stdout.slice(0, 300));
  const r2b = fd(two, '--record', '--allow', 'ground', '--no-tsx');
  const h2 = JSON.parse(readFileSync(hist, 'utf8'));
  result(r2b.status === 0 && h2.length === 2 && h2[0].name === 'two', '--allow ground records it, newest first', r2b.stdout.slice(0, 200));
  const lh = fd('--history');
  result(lh.status === 0 && /1\. two/.test(lh.stdout) && /2\. one/.test(lh.stdout), '--history lists the films, newest first', lh.stdout.slice(0, 200));
  const bad = fd(join(TMP, 'nothing-here'));
  result(bad.status === 2, 'a folder that is not a film exits 2');
}

// 3. floors
{
  const T = join(SKILL, 'assets', 'templates');
  const missing = [];
  for (const t of readdirSync(T)) {
    if (!existsSync(join(T, t, 'src', 'deal.ts'))) continue;
    let f = null;
    try {
      f = JSON.parse(readFileSync(join(T, t, 'floor.json'), 'utf8'));
    } catch {
      /* missing */
    }
    const src = readFileSync(join(T, t, 'src', 'deal.ts'), 'utf8');
    const ok = f && f.template === t && f.deal && Object.keys(f.deal).length >= 3 && Object.keys(f.deal).every((k) => src.includes(k));
    if (!ok) missing.push(t);
  }
  result(!missing.length, 'every template that deals ships floor.json (its unnamed scaffold\'s deal, slot names from its deal.ts)', missing.join(', '));
}

// 4. new-film.sh carries the history into the next film
{
  const bash = process.platform === 'win32' ? (process.env.BASH || 'bash') : 'bash';
  const nf = join(TMP, 'next');
  const r = spawnSync(bash, [join(SKILL, 'scripts', 'new-film.sh').split('\\').join('/'), nf.split('\\').join('/'), '--no-install'], { encoding: 'utf8', env });
  let fj = null;
  try {
    fj = JSON.parse(readFileSync(join(nf, 'film.json'), 'utf8'));
  } catch {
    /* reported */
  }
  result(r.status === 0 && fj?.template === 'launch-simple' && fj.started && fj.recent?.length === 2 && fj.recent[0].name === 'two' && fj.devices?.emphasis === 'colour',
    'new-film.sh writes film.json: the template, the start time, the last films (newest first), colour as the default emphasis', (r.stderr || '').slice(-300));
  const rec = existsSync(join(nf, 'src', 'recent.ts')) ? readFileSync(join(nf, 'src', 'recent.ts'), 'utf8') : '';
  result(/"ground":\["deepPool","deepPool"\]/.test(rec) && /"voice":\["blur","build"\]/.test(rec), 'launch-simple gets the last films\' dealt choices in src/recent.ts', rec.slice(-200));
  if (existsSync(TSX)) {
    const probe = join(TMP, 'deal-probe.mts');
    writeFileSync(probe, `import { pathToFileURL } from 'node:url';
const D = await import(pathToFileURL(${JSON.stringify(join(nf, 'src', 'deal.ts'))}).href);
const names = ['Tessel', 'Plinth', 'Northwind', 'Loomly', 'Quarry', 'Brightdesk', 'Halyard', 'Orbitly', 'Fernway', 'Glint', 'Parcel', 'Corvid'];
console.log(JSON.stringify(names.map((n) => D.dealOf(n))));
`);
    const p = spawnSync(process.execPath, [TSX, probe], { encoding: 'utf8', cwd: nf });
    let deals = null;
    try {
      deals = JSON.parse(p.stdout.trim().split('\n').pop());
    } catch {
      /* reported */
    }
    result(Array.isArray(deals) && deals.every((d) => d.ground !== 'deepPool' && d.voice === 'ink'),
      'the deal leaves the last films\' ground and voices out while another choice is free (12 names)', deals ? JSON.stringify(deals.map((d) => `${d.voice}/${d.ground}`)) : (p.stderr || '').slice(0, 300));
  } else console.log('skip  the deal probe: npm install in assets/remotion-starter first');
}

rmSync(TMP, { recursive: true, force: true });
console.log(failed ? `film-diff tests: ${failed} failed` : 'film-diff tests: all pass');
process.exit(failed ? 1 : 0);
