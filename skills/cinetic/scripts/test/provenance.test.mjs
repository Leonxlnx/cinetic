#!/usr/bin/env node
/**
 * provenance.test.mjs: public text speaks as house craft, and the repository carries no audio.
 *
 *   1. The phrase guard knows its own patterns: each catches its example and lets the house wording
 *      that looks like it pass (one spring class per film, a loudness target per film, references/).
 *   2. No public file ties a number to an outside source: every tracked or untracked (not ignored)
 *      text file of the repository (a licence's own verbatim text, OFL.txt or LICENSE.txt, aside) and the
 *      _drafts folders are scanned with generic phrases (claims
 *      of outside research, counts of other people's work, generated music) and, case-sensitive,
 *      technique ids (T plus two digits). Numbers are house defaults and normal ranges.
 *   3. No audio in git (wav, mp3, flac, ogg, m4a, aac, aif, aiff, opus), no images outside the asset
 *      folders that may hold them (fonts, brand, docs/brand), and no tracked video with an audio
 *      stream (ffprobe, when it is on PATH).
 *
 * Files still waiting for their rewrite at integration are listed in PENDING: their hits print as
 * "pending" and pass, until --release (or CINETIC_RELEASE=1), where every hit fails. The list must
 * be empty before a release.
 *
 * Usage (from the skill root):  node scripts/test/provenance.test.mjs [--verbose] [--release]
 *                               node scripts/test/provenance.test.mjs --files a.md b.ts   (scan only these)
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose');
const release = argv.includes('--release') || process.env.CINETIC_RELEASE === '1';
const only = argv.includes('--files') ? argv.slice(argv.indexOf('--files') + 1).filter((a) => !a.startsWith('--')) : null;

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

// ---- the generic phrases. Written with character classes so this file never matches its own list.
const CI = [
  ['tier claim', /\btop-t[i]er\b/i, 'the ' + 'top' + '-tier films', 'a top-level folder'],
  ['frame-meas claim', /\bframe-meas[u]red\b/i, 'frame' + '-measured curves', 'a frame-accurate seek'],
  ['meas-films claim', /\bmeas[u]red (professional |launch |motion |text-led )?fil[m]s?\b/i, 'meas' + 'ured launch films', 'measured on the render'],
  ['pro-films claim', /\bprofess[i]onal (motion |launch |text-led )?fil[m]s\b/i, 'profes' + 'sional films', 'a professional finish'],
  ['research claim', /\b(the|a|our|this) st[u]dy\b/i, 'the ' + 'study', 'a steady drift'],
  ['past-research claim', /\bstud[i]ed\b/i, 'stud' + 'ied', 'a studio light'],
  ['first-person research claim', /\bwe (analy[sz]ed|meas[u]red|stud[i]ed)\b/i, 'we ' + 'analysed', 'we measure the render'],
  ['sourcing claim', /\blearn[e]d from\b/i, 'learn' + 'ed from', 'learn the grid'],
  ['refs claim', /\breferenc[e] (films?|clips?|videos?|set|c[o]rpus)\b/i, 'refer' + 'ence films', 'references/camera.md'],
  ['collection claim', /\bc[o]rpus\b/i, 'the cor' + 'pus', 'a corporate film'],
  ['count claim', /\b[0-9]+ ?(of|\/) ?[0-9]+ (fil[m]s|vid[e]os|cl[i]ps)\b/i, '22 of 2' + '6 fil' + 'ms', '2 of 3 shots'],
  ['number claim', /\b(2[0-9]|seven|eight|nine) (fil[m]s|vid[e]os|cl[i]ps)\b/i, 'eight ' + 'films', 'eight frames'],
  ['across claim', /\bacr[o]ss films\b/i, 'acr' + 'oss films', 'across frames'],
  ['raising claim', /\bfilms rai[s]ing\b/i, 'films ' + 'raising it', 'raising the floor'],
  ['music claim', /\bsynth b[a]nd\b|\bsynthesi[sz]ed (soundtrack|sc[o]re|mus[i]c)\b/i, 'a synth' + 'esized soundtrack', 'synthesized effect voices'],
  ['frame-by-frame claim', /\bmeas[u]red frame by frame\b/i, 'meas' + 'ured frame by frame', 'stepped frame by frame'],
  ['best-work claim', /\b(real|shipped|award|studio|best) (launch |motion )?(fil[m]s|vid[e]os|w[o]rk)\b/i, 'what real ' + 'launch films do', 'the best take'],
  ['studio claim', /\bstudi[o]s? do\b/i, 'what studios ' + 'do', 'studio lights'],
];
const CS = [['a technique id', /\bT[0-5][0-9]\b/, 'T' + '05 exit', 'TYPE.line']];
const ALL = [...CI, ...CS];

// 1. the guard knows its own patterns
for (const [name, re, hit, miss] of ALL) result(re.test(hit) && !re.test(miss), `guard: ${name}`, `catches "${hit}", passes "${miss}"`);
for (const ok of ['one spring class per film', 'per' + '-film loudness target', 'a signature cap per film', 'references/brand-and-color.md'])
  result(!ALL.some(([, re]) => re.test(ok)), `guard passes house wording: "${ok}"`);

// ---- the repository
const git = (args, cwd = SKILL) => spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
const top = git(['rev-parse', '--show-toplevel']);
if (top.status !== 0) {
  console.log('skip  not inside a git checkout: the scan and the git checks need one');
  console.log(failed ? `provenance tests: ${failed} failed` : 'provenance tests: all pass');
  process.exit(failed ? 1 : 0);
}
const REPO = top.stdout.trim();
const listed = git(['ls-files', '-co', '--exclude-standard', '-z'], REPO).stdout.split('\0').filter(Boolean);
const drafts = [];
const walk = (p) => {
  if (!existsSync(p)) return;
  for (const e of readdirSync(p)) {
    const q = join(p, e);
    if (statSync(q).isDirectory()) walk(q);
    else drafts.push(relative(REPO, q).split('\\').join('/'));
  }
};
for (const d of ['references/_drafts', 'assets/library/_drafts']) walk(join(SKILL, d));

// Files waiting for their rewrite at integration (house wording for older text). Empty before a release.
const PENDING = new Set([]);

const TEXT_EXT = /\.(md|mdx|txt|ts|tsx|js|jsx|mjs|cjs|json|py|sh|html|htm|css|ya?ml|toml|cfg|ini)$/i;
const SELF = relative(REPO, fileURLToPath(import.meta.url)).split('\\').join('/');
// a licence's own text travels verbatim with what it licenses (the fonts' OFL.txt names the uses it grants): not ours to word
const LICENCE_TEXT = /(^|\/)(OFL|LICEN[CS]E|NOTICE|COPYING)(\.(txt|md))?$/i;
const scope = (only ? only.map((f) => relative(REPO, resolve(f)).split('\\').join('/')) : [...new Set([...listed, ...drafts])])
  .filter((f) => TEXT_EXT.test(f) && f !== SELF && !LICENCE_TEXT.test(f));
const hits = [];
for (const f of scope) {
  const abs = join(REPO, f);
  if (!existsSync(abs) || statSync(abs).size > 4 << 20) continue;
  const text = readFileSync(abs, 'utf8');
  if (text.includes('\0')) continue;
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of ALL) if (re.test(line)) hits.push({ f, line: i + 1, name, text: line.trim().slice(0, 140) });
  });
}
const pending = hits.filter((h) => PENDING.has(h.f) && !release);
const live = hits.filter((h) => !pending.includes(h));
result(live.length === 0, `no provenance phrase in ${scope.length} public files${release ? ' (release: pending files count)' : ''}`, `${live.length} hit(s)`);
for (const h of live.slice(0, 60)) console.log(`      ${h.f}:${h.line}  [${h.name}]  ${h.text}`);
if (pending.length) {
  const files = [...new Set(pending.map((h) => h.f))];
  console.log(`note  ${pending.length} pending hit(s) in ${files.length} file(s) awaiting their integration rewrite (--release fails them)`);
  if (verbose) for (const h of pending) console.log(`      pending ${h.f}:${h.line}  [${h.name}]  ${h.text}`);
}
const stale = [...PENDING].filter((f) => !hits.some((h) => h.f === f));
if (stale.length && verbose) console.log(`note  clean now, drop from PENDING: ${stale.join(', ')}`);

// 3. no audio, no stray images, no video with sound
if (!only) {
  const tracked = git(['ls-files', '-z'], REPO).stdout.split('\0').filter(Boolean);
  const audio = tracked.filter((f) => /\.(wav|mp3|flac|ogg|m4a|aac|aif|aiff|opus)$/i.test(f));
  result(audio.length === 0, 'no audio file in git', audio.slice(0, 8).join(', '));
  const images = tracked.filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f) && !/(^|\/)(fonts|brand)\//.test(f));
  result(images.length === 0, 'no image outside fonts/, brand/ and docs/brand/', images.slice(0, 8).join(', '));
  const videos = tracked.filter((f) => /\.(mp4|mov|m4v|webm|mkv)$/i.test(f));
  const probe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
  if (!videos.length) result(true, 'no tracked video carries an audio stream', 'no tracked videos');
  else if (probe.status !== 0) console.log(`skip  ${videos.length} tracked video(s), no ffprobe on PATH to check their streams`);
  else {
    const loud = videos.filter((f) => {
      const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', join(REPO, f)], { encoding: 'utf8' });
      return r.stdout.trim() !== '';
    });
    result(loud.length === 0, 'no tracked video carries an audio stream (music never ships in the repository)', loud.slice(0, 8).join(', '));
  }
}

console.log(failed ? `provenance tests: ${failed} failed` : 'provenance tests: all pass');
process.exit(failed ? 1 : 0);
