#!/usr/bin/env node
/**
 * music.test.mjs: offline tests for scripts/music.mjs (the music finder).
 *
 *   1. The words of a brief to catalog pages: genres (two words joined), moods, house synonyms, instruments,
 *      the catalog's search for any other word; sound-effect categories for --kind sfx.
 *   2. The listing parser on hand-written pages (music-fixtures/: written by hand in the catalog's shape, every
 *      value invented): ids, titles, artists, tags by family, length, the full file's URL, the licence the page
 *      names (the free licence passes, a restricted or missing one is unknown and refused), a voice tag refused.
 *   3. The energy curve from waveform data (made in the test): the intro, a break with its entry, the ending
 *      (fade, button), the contrast, the strip.
 *   4. Tempo: --bpm ranges, a measured tempo before a genre's range, the quick tempo of a click track.
 *   5. Ranking: shorter than the film refused, the words, tempo inside or outside the brief, a break and an
 *      entry, the shortlist's tracks lose ground.
 *   6. The history: the last film's track held back, the previous first offer never first again, recent films'
 *      tracks lose ground; read and write under $CINETIC_HOME.
 *   7. The licence record: every field of the starter's licence.template.json; credits.py accepts it (with a
 *      Python 3 on the PATH).
 *   8. The CLI contract: --help, usage errors (exit 2), Pixabay named as unreachable without a request.
 *   No test touches the network (fetch is replaced by a function that fails the run).
 *
 * Usage (from the skill root):  node scripts/test/music.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, 'music-fixtures');
const SKILL = path.resolve(HERE, '..', '..');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/music.test.mjs [--verbose]   (offline: hand-written pages in scripts/test/music-fixtures)');
  process.exit(0);
}
let fetched = 0;
globalThis.fetch = async (u) => { fetched++; throw new Error(`network used in an offline test: ${String(u).slice(0, 60)}`); };
const M = await import(pathToFileURL(path.join(HERE, '..', 'music.mjs')).href);

let failed = 0, passed = 0;
const check = (ok, name, detail = '') => {
  if (ok) passed++; else failed++;
  if (!ok || verbose) console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. words to pages
{
  const p = M.pagesFor('mechanical driving tech house precise');
  const urls = p.map((x) => x.url);
  check(urls[0] === 'https://mixkit.co/free-stock-music/tech-house/', 'a two-word genre comes first', urls[0]);
  check(urls.includes('https://mixkit.co/free-stock-music/mood/mechanical/') && urls.includes('https://mixkit.co/free-stock-music/mood/driving/'), 'moods read their mood pages');
  check(urls.includes('https://mixkit.co/free-stock-music/minimalism/'), 'a house synonym reads as the catalog word (precise -> minimalism)');
  check(urls.filter((u) => u.endsWith('/mood/mechanical/')).length === 1, 'a page is read once');
  const q = M.pagesFor('kalimba piano');
  check(q[0].what === 'instrument' && q[0].url.endsWith('/instrument/piano/') && q[1].what === 'search' && q[1].url.endsWith('/discover/kalimba/'),
    'an instrument page, then the catalog search for an unknown word', q.map((x) => x.what).join(','));
  const s = M.pagesFor('paper swipe', 'sfx').map((x) => x.url);
  check(s.includes('https://mixkit.co/free-sound-effects/paper/') && s.includes('https://mixkit.co/free-sound-effects/swish/'), 'sfx: category pages, synonyms included', s.join(' '));
}

// 2. the listing parser
const musicHtml = fs.readFileSync(path.join(FIX, 'mixkit-music-list.html'), 'utf8');
const items = M.parseMixkit(musicHtml, 'https://mixkit.co/free-stock-music/tech-house/', 'music');
{
  check(items.length === 4, 'four cards parsed', String(items.length));
  const a = items[0];
  check(a.ref === 'mixkit:9001' && a.title === 'Quiet Engine' && a.artist === 'Ada Example' && a.seconds === 130, 'id, title, artist, length', JSON.stringify([a.ref, a.title, a.artist, a.seconds]));
  check(eq(a.tags.genre, ['tech-house']) && eq(a.tags.mood, ['mechanical', 'driving']) && eq(a.tags.instrument, ['drums']) && eq(a.tags.tag, ['background']), 'tags by family', JSON.stringify(a.tags));
  check(a.file_url === 'https://assets.mixkit.co/music/9001/9001.mp3' && a.waveform_url.endsWith('9001-waveform.json'), 'the full file and its waveform data');
  check(a.licence === 'mixkit-music' && a.notice === 'Mixkit Stock Music Free License', 'the free licence the page names for it');
  check(items[2].licence === 'unknown' && M.scoreItem(items[2], {}).score === -Infinity, 'a restricted licence is unknown and refused');
  check(items[3].vocals === true && M.scoreItem(items[3], {}).score === -Infinity, 'a voice tag is refused');
  const sfx = M.parseMixkit(fs.readFileSync(path.join(FIX, 'mixkit-sfx-list.html'), 'utf8'), 'https://mixkit.co/free-sound-effects/paper/', 'sfx');
  check(sfx.length === 1 && sfx[0].licence === 'mixkit-sfx' && sfx[0].file_url === 'https://assets.mixkit.co/active_storage/sfx/7001/7001.wav' && eq(sfx[0].tags.category, ['paper', 'slide']),
    'sfx: the WAV, the page\'s free licence, categories', JSON.stringify(sfx[0] && [sfx[0].licence, sfx[0].file_url]));
  check(M.parseMixkit(musicHtml, '', 'sfx').length === 0, 'music cards are not sound effects');
  const plain = M.scoreItem({ ...sfx[0], seconds: 1 }, { words: ['paper'] }).score;
  const decor = M.scoreItem({ ...sfx[0], seconds: 1, title: 'Magic fire swoosh' }, { words: ['paper'] }).score;
  const long = M.scoreItem({ ...sfx[0], seconds: 5 }, { words: ['paper'] }).score;
  check(plain - decor === 2 && plain - long === 1.5, 'sfx: a decorated or long effect loses ground', `${plain} / ${decor} / ${long}`);
  const linked = M.parseMixkit('<p>under the <a href="/license/#sfxFree" data-license="sfxFree">Mixkit License</a></p>' + fs.readFileSync(path.join(FIX, 'mixkit-sfx-list.html'), 'utf8').replace(/free sound effects license/g, 'licence'), '', 'sfx');
  check(linked[0]?.licence === 'mixkit-sfx', 'sfx: the page\'s licence link names the free licence');
}

// 3. energy from waveform data
function waveform(levels, px = 0.2, sr = 44100) {
  // levels: [[seconds, amplitude 0..1], ...] held piecewise; 8-bit min/max pairs
  const data = [];
  for (const [secs, amp] of levels) for (let i = 0; i < Math.round(secs / px); i++) { const v = Math.round(amp * 127); data.push(-v, v); }
  return { version: 2, channels: 1, sample_rate: sr, samples_per_pixel: Math.round(px * sr), bits: 8, length: data.length / 2, data };
}
{
  const e = M.energyOf(waveform([[6, 0.12], [40, 0.6], [4, 0.1], [40, 0.65], [2, 0.6], [3, 0.3], [3, 0.12], [3, 0.04], [3, 0.01]]));
  check(e && Math.abs(e.seconds - 104) < 0.5, 'length from pixels', String(e?.seconds));
  check(e.intro_s >= 5 && e.intro_s <= 7, 'the intro ends where the body starts', String(e.intro_s));
  check(e.breaks.length === 1 && Math.abs(e.breaks[0].from - 46) < 1 && Math.abs(e.breaks[0].entry_s - 50) < 1, 'one break, its entry after it', JSON.stringify(e.breaks));
  check(e.ending === 'fade', 'a falling tail reads as a fade', e.ending);
  check(e.range_db >= 10 && e.curve.length === 24 && M.strip(e.curve).length === 24, 'contrast, a 24-bin curve and its strip', `${e.range_db} dB`);
  const b = M.energyOf(waveform([[30, 0.6], [30, 0.62], [0.6, 0.6], [1.0, 0.01]]));
  check(b.ending === 'button' && b.breaks.length === 0, 'a body that stops dead is a button ending, no break', `${b.ending}, ${b.breaks.length}`);
  check(M.energyOf({}) === null, 'no waveform data: no energy');
}

// 4. tempo
{
  check(eq(M.bpmRange('118-128'), [118, 128]) && eq(M.bpmRange('124'), [122, 126]) && M.bpmRange(undefined) === null, '--bpm ranges');
  let threw = false; try { M.bpmRange('fast'); } catch (e) { threw = e instanceof M.Usage; }
  check(threw, '--bpm in words is a usage error');
  check(eq(M.tempoOf(items[0], { 'mixkit:9001': { bpm: 123.5, kind: 'measured' } }), { value: 123.5, kind: 'measured' }), 'a measured tempo comes first');
  const t = M.tempoOf(items[0], {});
  check(t.kind === 'estimated' && eq(t.range, [120, 128]) && t.from === 'tech-house', 'else the genre\'s usual range, estimated', JSON.stringify(t));
  check(M.tempoOf({ ref: 'x', genre: 'ambient', tags: {} }).kind === 'unknown', 'a genre without a range: unknown');
  const sr = 11025, bpm = 124, secs = 20;
  const pcm = new Float32Array(sr * secs);
  for (let b = 0; b * (60 / bpm) < secs; b++) {
    const at = Math.round(b * (60 / bpm) * sr);
    for (let i = 0; i < 300 && at + i < pcm.length; i++) pcm[at + i] += Math.exp(-i / 40) * Math.sin(i * 0.9) * (b % 4 === 0 ? 1 : 0.6);
  }
  const q = M.quickTempo(pcm, sr);
  check(q && Math.abs(q - bpm) < 1.5, 'the quick tempo of a 124 BPM click track', String(q));
}

// 5. ranking
{
  const want = { words: ['mechanical', 'tech', 'house'], bpm: [118, 128], length: 20 };
  const a = { ...items[0], tempo: M.tempoOf(items[0], {}) };
  const sa = M.scoreItem(a, want);
  check(sa.score > 0 && sa.why.some((w) => /mechanical/.test(w)) && sa.why.some((w) => /tech-house/.test(w)), 'the words and the two-word genre match', sa.why.join('; '));
  const listed = M.scoreItem({ ...items[1], tempo: {}, found: ['mechanical'] }, { words: ['mechanical'] });
  const unlisted = M.scoreItem({ ...items[1], tempo: {} }, { words: ['mechanical'] });
  check(listed.score - unlisted.score === 2, 'listed on a mood page counts as that mood (a card shows only some tags)', `${listed.score} vs ${unlisted.score}`);
  const short = M.scoreItem({ ...items[1], tempo: {} }, { length: 60 });
  check(short.score === -Infinity && /shorter than the film/.test(short.why[0]), 'a track shorter than the film is refused');
  const slow = M.scoreItem({ ...a, tempo: { value: 96, kind: 'quick' } }, want).score;
  const fits = M.scoreItem({ ...a, tempo: { value: 124, kind: 'quick' } }, want).score;
  const half = M.scoreItem({ ...a, tempo: { value: 62, kind: 'quick' } }, want).score;
  check(fits - slow >= 5 && half === fits, 'tempo inside the brief wins; half or double time counts', `${fits} / ${slow} / ${half}`);
  const withBreak = M.scoreItem({ ...a, energy: { seconds: 130, breaks: [{ from: 40, to: 46, entry_s: 46 }], range_db: 7 } }, want).score;
  const flat = M.scoreItem({ ...a, energy: { seconds: 130, breaks: [], range_db: 1.5 } }, want).score;
  check(withBreak - flat >= 3, 'a break with an entry and contrast beat a flat track', `${withBreak} vs ${flat}`);
  const sl = M.scoreItem(a, { ...want, shortlist: new Set(['mixkit:9001']) }).score;
  check(sa.score - sl === 1.5, 'a shortlist track the example films used loses ground', `${sa.score} -> ${sl}`);
}

// 6. history
{
  const mk = (ref, score) => ({ ref, kind: 'music', score, why: [] });
  const hist = { used: [{ ref: 'mixkit:2' }, { ref: 'mixkit:1' }], searches: [{ first: 'mixkit:3' }] };
  const r = M.applyHistory([mk('mixkit:1', 9), mk('mixkit:3', 8), mk('mixkit:4', 7), mk('mixkit:2', 6.5)], hist);
  check(r.held.length === 1 && r.held[0].ref === 'mixkit:1', "the last film's track is held back", r.held.map((x) => x.ref).join(','));
  check(r.items[0].ref === 'mixkit:4' && r.items[1].ref === 'mixkit:3', 'the previous first offer is never first again', r.items.map((x) => x.ref).join(','));
  check(r.items.find((x) => x.ref === 'mixkit:2').score === 4.5, 'a recent film\'s track loses two points');
  const again = M.applyHistory([mk('mixkit:5', 3)], { used: [], searches: [{ first: 'mixkit:5' }] });
  check(again.items[0].ref === 'mixkit:5', 'a single result stays first');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-home-'));
  try {
    const env = { CINETIC_HOME: home };
    const h = M.readHistory(env);
    check(eq(h, { history: 1, searches: [], used: [] }), 'an empty history to start');
    h.used.push({ ref: 'mixkit:7', date: '2026-10-26' });
    M.writeHistory(h, env);
    check(M.readHistory(env).used[0].ref === 'mixkit:7' && fs.existsSync(path.join(home, 'music-history.json')), 'written under $CINETIC_HOME');
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
}

// 7. the licence record
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-rec-'));
  try {
    const buf = Buffer.from('ID3 a stand-in for the downloaded file');
    fs.writeFileSync(path.join(tmp, 'quiet_engine_mixkit.mp3'), buf);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const rec = M.licenceRecord(items[0], { file: 'quiet_engine_mixkit.mp3', sha256: sha, bytes: buf.length, date: '2026-10-26', query: 'mechanical' });
    const tpl = JSON.parse(fs.readFileSync(path.join(SKILL, 'assets', 'remotion-starter', 'audio', 'music', 'licence.template.json'), 'utf8'));
    const missing = Object.keys(tpl).filter((k) => !(k in rec));
    check(!missing.length, 'every field of the starter\'s licence template', missing.join(','));
    check(rec.licence_id === 'mixkit-music' && rec.credit_required === false && rec.ai_generated === false && rec.vocals === false && rec.licence_seen.url.endsWith('/musicFree/'),
      'the licence, no credit, the quote and where it was read');
    let threw = false; try { M.licenceRecord(items[2], { file: 'x', sha256: '', bytes: 0, date: '2026-10-26' }); } catch { threw = true; }
    check(threw, 'no record for an unknown licence');
    const rp = path.join(tmp, 'quiet_engine_mixkit.licence.json');
    fs.writeFileSync(rp, JSON.stringify(rec));
    const py = [process.env.PYTHON, 'python3', 'python', ...(process.platform === 'win32' ? ['py'] : [])].filter(Boolean)
      .find((c) => spawnSync(c, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore' }).status === 0);
    if (py) {
      const r = spawnSync(py, [path.join(SKILL, 'scripts', 'audio', 'credits.py'), '--check', rp], { encoding: 'utf8' });
      check(r.status === 0, 'credits.py --check accepts the record', (r.stdout + r.stderr).trim().split('\n').slice(-2).join(' | '));
      const sfx = M.parseMixkit(fs.readFileSync(path.join(FIX, 'mixkit-sfx-list.html'), 'utf8'), 'https://mixkit.co/free-sound-effects/paper/', 'sfx')[0];
      fs.writeFileSync(path.join(tmp, 'paper_slide_mixkit.wav'), buf);
      const rs = path.join(tmp, 'paper_slide_mixkit.licence.json');
      fs.writeFileSync(rs, JSON.stringify(M.licenceRecord(sfx, { file: 'paper_slide_mixkit.wav', sha256: sha, bytes: buf.length, date: '2026-10-26' })));
      const r2 = spawnSync(py, [path.join(SKILL, 'scripts', 'audio', 'credits.py'), '--check', rs], { encoding: 'utf8' });
      check(r2.status === 0, 'credits.py --check accepts a sound effect\'s record', (r2.stdout + r2.stderr).trim().split('\n').slice(-2).join(' | '));
    } else console.log('skip  credits.py cross-check: no Python 3.10+ on the PATH');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// 8. the CLI contract
{
  const logs = []; const errs = [];
  const ol = console.log, oe = console.error;
  console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => errs.push(a.join(' '));
  let help, bad, none, pix, unknown;
  try {
    help = await M.main(['--help']);
    bad = await M.main(['search', '--colour', 'blue']);
    none = await M.main(['search']);
    unknown = await M.main(['remix']);
    pix = await M.search({ _: [], mood: 'calm', source: 'pixabay' }, { log: (s) => logs.push(s) });
  } finally { console.log = ol; console.error = oe; }
  check(help === 0 && logs.some((l) => /search\s+--mood/.test(l)), '--help prints the usage, exit 0');
  check(bad === 2 && none === 2 && unknown === 2, 'usage errors exit 2', `${bad} ${none} ${unknown}`);
  check(pix.items.length === 0 && pix.unreachable === 'Pixabay Music' && logs.some((l) => /bot check/.test(l)), 'Pixabay is named as unreachable, no request made');
  const r = spawnSync(process.execPath, [path.join(HERE, '..', 'music.mjs'), '--help'], { encoding: 'utf8' });
  check(r.status === 0 && /music\.mjs/.test(r.stdout), 'the script answers --help as a process');
}
check(fetched === 0, 'no network used', `${fetched} request(s)`);

console.log(`music.test.mjs: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
