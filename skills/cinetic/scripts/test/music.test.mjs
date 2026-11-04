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
 *   6. The history: every earlier film's track held back (the last film's and those before), the previous first
 *      offer never first again; read and write under $CINETIC_HOME.
 *   7. The licence record: every field of the starter's licence.template.json; credits.py accepts it (with a
 *      Python 3 on the PATH).
 *   8. The CLI contract: --help, usage errors (exit 2), Pixabay named as unreachable without a request.
 *   9. The CC0 catalogs (Wikimedia Commons, ccMixter, Openverse; hand-written answers in music-fixtures/, every
 *      value invented): --source, the query URLs, CC0 only (an attribution licence, a voice, speech, a sample
 *      pack refused), a stated tempo, a whole search across catalogs on a stand-in network (one entry per
 *      recording, a refused catalog never requested), the licence read again before a download, the CC0 record
 *      (credits.py accepts it), the energy curve from samples.
 *  10. The music library (music-fixtures/music-library.json, every value invented): where it is (--library,
 *      $CINETIC_MUSIC_LIBRARY, a link under $CINETIC_HOME, none), what is read (no unknown licence, no voice,
 *      the local copy under its root), the brief's words as moods, the ranking (its own mood over a second mood
 *      over another, too short refused, tempo with double and half time, a drop over an entry), every earlier
 *      film's track held back, the cut points line, pick on the CLI (results get reads, the history), and get
 *      taking the library's copy (sha256) with the licence page read again on a stand-in answer.
 *  11. Coverr (music-fixtures/coverr-audios.json, every value invented): the free track with its Coverr License and
 *      full-length download, the energy from its waveform, vocals and premium items refused, the URLs, the record.
 *  12. The library ranks by the launch profile (earshot z) and by a real ending over a fade; the cut line names it.
 *  13. A launch prefers 115-136 BPM (146 BPM loses to 124 BPM by the launch range) and the film's energy (a punchy track
 *      under a calm film loses); a launch-simple film.json makes pick a launch.
 *   No test touches the network (fetch and the large-header transport are replaced by functions that fail the run).
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
import { findPython } from '../py.mjs';

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
const offlineLarge = async (u) => { fetched++; throw new Error(`network used in an offline test: ${String(u).slice(0, 60)}`); };
M.transport.large = offlineLarge;

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
  const hist = { used: [{ ref: 'mixkit:2', film: '/films/first', date: '2026-10-01' }, { ref: 'mixkit:1' }], searches: [{ first: 'mixkit:3' }] };
  const r = M.applyHistory([mk('mixkit:1', 9), mk('mixkit:3', 8), mk('mixkit:4', 7), mk('mixkit:2', 6.5)], hist);
  check(r.held.length === 2 && r.held[0].ref === 'mixkit:1' && /last film/.test(r.held[0].why.at(-1)), "the last film's track is held back", r.held.map((x) => x.ref).join(','));
  check(r.held[1].ref === 'mixkit:2' && /earlier film \(first, 2026-10-01\)/.test(r.held[1].why.at(-1)), 'every earlier film\'s track is held back too, with the film named', r.held[1]?.why.at(-1));
  check(r.items[0].ref === 'mixkit:4' && r.items[1].ref === 'mixkit:3', 'the previous first offer is never first again', r.items.map((x) => x.ref).join(','));
  const fx = M.applyHistory([mk('mixkit:8', 2)], { used: [{ ref: 'mixkit:8', kind: 'sfx' }] });
  check(fx.items.length === 1 && !fx.held.length, 'an effect a film used does not hold a track back');
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
    const py = findPython({ numpy: false, quiet: true });
    if (py) {
      const r = spawnSync(py[0], [...py.slice(1), path.join(SKILL, 'scripts', 'audio', 'credits.py'), '--check', rp], { encoding: 'utf8' });
      check(r.status === 0, 'credits.py --check accepts the record', (r.stdout + r.stderr).trim().split('\n').slice(-2).join(' | '));
      const sfx = M.parseMixkit(fs.readFileSync(path.join(FIX, 'mixkit-sfx-list.html'), 'utf8'), 'https://mixkit.co/free-sound-effects/paper/', 'sfx')[0];
      fs.writeFileSync(path.join(tmp, 'paper_slide_mixkit.wav'), buf);
      const rs = path.join(tmp, 'paper_slide_mixkit.licence.json');
      fs.writeFileSync(rs, JSON.stringify(M.licenceRecord(sfx, { file: 'paper_slide_mixkit.wav', sha256: sha, bytes: buf.length, date: '2026-10-26' })));
      const r2 = spawnSync(py[0], [...py.slice(1), path.join(SKILL, 'scripts', 'audio', 'credits.py'), '--check', rs], { encoding: 'utf8' });
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
// 9. the CC0 catalogs
const fixJson = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
{
  check(eq(M.sourcesFor('all', 'music').use, ['mixkit', 'commons', 'ccmixter', 'coverr']) && eq(M.sourcesFor(undefined, 'sfx').use, ['mixkit', 'commons', 'openverse']),
    'the default catalogs per kind', `${M.sourcesFor('all', 'music').use} / ${M.sourcesFor('all', 'sfx').use}`);
  const fma = M.sourcesFor('mixkit,fma', 'music');
  check(eq(fma.use, ['mixkit']) && fma.refused[0]?.id === 'fma' && /login/.test(fma.refused[0].why), 'a catalog that needs a login is refused with its reason');
  let bad = 0;
  for (const [v, k] of [['bogus', 'music'], ['ccmixter', 'sfx']]) { try { M.sourcesFor(v, k); } catch (e) { if (e instanceof M.Usage) bad++; } }
  check(bad === 2, 'an unknown catalog, or one that does not serve the kind, is a usage error');
  const cu = decodeURIComponent(M.commonsUrl('tech house driving', 'music').replace(/\+/g, ' '));
  check(/incategory:"CC-Zero" music \(/.test(cu) && /"tech house" OR driving/.test(cu) && /iiextmetadatafilter=LicenseShortName/.test(cu), 'Commons: CC0 files, the words joined by OR', cu.slice(0, 160));
  const xu = M.ccmixterUrl('calm piano', { offset: 20, limit: 20 });
  check(/lic=zero/.test(xu) && /search_type=any/.test(xu) && /offset=20/.test(xu), 'ccMixter: CC0 uploads, any word', xu);
  check(/license=cc0/.test(M.openverseUrl('paper slide')), 'Openverse: CC0 only');
}
const commons = M.parseCommons(fixJson('commons-search.json'), 'music');
{
  const [a, , c, d, e] = commons;
  check(commons.length === 5 && a.ref === 'commons:5101' && a.title === 'Glass Engine' && a.artist === 'Example Collective' && a.seconds === 151,
    'Commons: id, title and artist from the file name and its page, length', JSON.stringify([a.ref, a.title, a.artist, a.seconds]));
  check(a.licence === 'cc0' && a.file_url.endsWith('Glass_Engine.ogg') && !a.file_url.includes('?') && eq(a.tags.genre, ['electronic', 'techno']),
    'Commons: CC0 with no attribution, the original file, genres from its categories', JSON.stringify(a.tags.genre));
  check(a.notes.some((n) => /not reviewed/.test(n)), 'Commons: a licence not yet reviewed is noted');
  check(c.licence === 'unknown' && M.scoreItem({ ...c, tempo: {} }, {}).score === -Infinity, 'Commons: an attribution licence (CC BY-SA) is refused');
  check(d.unfit === true && M.scoreItem({ ...d, tempo: {} }, {}).score === -Infinity, 'Commons: a pronunciation is not a film track');
  check(e.genre === 'ambient' && e.notice.startsWith('CC0'), 'Commons: the notice quotes the page');
}
const ccm = M.parseCcmixter(fixJson('ccmixter-query.json'));
{
  const [a, b, c, d] = ccm;
  check(ccm.length === 4 && a.ref === 'ccmixter:7101' && a.file_url.endsWith('.mp3') && a.seconds === 192 && a.licence === 'cc0' && a.artist === 'Ada Example',
    'ccMixter: the audio file (not the zip), length, CC0', JSON.stringify([a.ref, a.file_url.slice(-20), a.seconds]));
  check(eq(M.tempoOf(a, {}), { value: 122, kind: 'stated' }) && eq(a.tags.instrument, ['synth', 'drums']), 'ccMixter: the uploader\'s tempo, instruments from tags', JSON.stringify(a.tags.instrument));
  check(b.vocals === true && b.artist === 'ben_s', 'ccMixter: an a cappella is a voice (refused)');
  check(c.licence === 'unknown' && eq(M.tempoOf(c, {}).range, [95, 100]), 'ccMixter: an attribution licence is refused; a tempo tag reads as a range');
  check(d.unfit === true, 'ccMixter: a sample pack of loops is not a track');
}
const ov = M.parseOpenverse(fixJson('openverse-search.json'), 'sfx');
{
  check(ov.length === 2 && ov[0].licence === 'cc0' && ov[0].origin === 'freesound' && ov[0].seconds === 1.2 && ov[0].notes.some((n) => /preview/.test(n)),
    'Openverse: CC0, its origin, length, the preview noted', JSON.stringify([ov[0].licence, ov[0].seconds]));
  check(ov[1].licence === 'unknown' && M.sourceName(ov[0]) === 'Openverse (freesound)', 'Openverse: CC BY refused; the record names where the file lives');
  const sfxScore = M.scoreItem({ ...ov[0], seconds: 1 }, { words: ['paper', 'slide'] });
  check(sfxScore.score >= 4, 'Openverse: its tags count as the effect\'s categories', String(sfxScore.score));
}
{
  // a whole search on a stand-in network: Mixkit pages, the Commons API, ccMixter (large headers), Openverse
  const mixHtml = fs.readFileSync(path.join(FIX, 'mixkit-music-list.html'), 'utf8');
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => {
    const s = String(u); seen.push(s);
    const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } });
    if (s.startsWith(M.COMMONS_API)) return json(fixJson('commons-search.json'));
    if (s.startsWith('https://mixkit.co/free-stock-music/')) return new Response(mixHtml, { status: 200 });
    return new Response('', { status: 404 });
  };
  M.transport.large = async (u) => { seen.push(String(u)); return { status: 200, body: JSON.stringify(fixJson('ccmixter-query.json')) }; };
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-home-'));
  const logs = [];
  let r;
  try {
    r = await M.search({ _: [], mood: 'electronic driving', source: 'mixkit,commons,ccmixter,pixabay', length: '60', 'no-history': true }, { env: { CINETIC_HOME: home }, log: (x) => logs.push(x) });
  } finally { globalThis.fetch = realFetch; M.transport.large = offlineLarge; fs.rmSync(home, { recursive: true, force: true }); }
  const refs = r.items.map((x) => x.ref);
  check(eq(r.sources, ['mixkit', 'commons', 'ccmixter']) && logs.some((l) => /Pixabay Music: not used/.test(l)) && !seen.some((u) => /pixabay/.test(u)),
    'search: the catalogs asked for, a refused one named and never requested', `${r.sources} | ${logs.join(' ')}`);
  check(refs.includes('mixkit:9001') && refs.includes('commons:5101') && refs.includes('ccmixter:7101'), 'search: tracks from every catalog', refs.join(','));
  check(!refs.includes('commons:5102'), 'search: one entry per recording (the same track twice on Commons)');
  check(!refs.some((x) => ['commons:5103', 'commons:5104', 'ccmixter:7102', 'ccmixter:7103', 'ccmixter:7104', 'mixkit:9003', 'mixkit:9004'].includes(x)), 'search: refused items never offered');
  check(r.items.every((x) => x.seconds >= 64), 'search: nothing shorter than the film plus its ending');
}
{
  // the licence read again before a download, on the stand-in network
  const realFetch = globalThis.fetch;
  let commonsAnswer = fixJson('commons-search.json');
  const landing = fs.readFileSync(path.join(FIX, 'openverse-landing.html'), 'utf8');
  let landingAnswer = landing;
  globalThis.fetch = async (u) => {
    const s = String(u);
    const json = (o) => new Response(JSON.stringify(o), { status: 200 });
    if (s.startsWith(M.COMMONS_API)) return json({ query: { pages: commonsAnswer.query.pages.filter((p) => s.includes(`pageids=${p.pageid}`)) } });
    if (s.startsWith(M.OPENVERSE_API)) return json(fixJson('openverse-search.json').results.find((x) => s.includes(x.id)) || {});
    if (s.startsWith('https://freesound.org/')) return new Response(landingAnswer, { status: 200 });
    return new Response('', { status: 404 });
  };
  M.transport.large = async (u) => ({ status: 200, body: JSON.stringify(fixJson('ccmixter-query.json').filter((x) => String(u).includes(`ids=${x.upload_id}`))) });
  let ok1, ok2, ok3, bad1, bad2;
  try {
    ok1 = await M.verifyLicence(commons[0]);
    ok2 = await M.verifyLicence(ccm[0]);
    ok3 = await M.verifyLicence(ov[0]);
    commonsAnswer = JSON.parse(JSON.stringify(commonsAnswer));
    commonsAnswer.query.pages[0].imageinfo[0].extmetadata.AttributionRequired.value = 'true';
    bad1 = await M.verifyLicence(commons[0]);
    landingAnswer = landing.replace(/publicdomain\/zero\/1\.0\//, 'licenses/by/4.0/');
    bad2 = await M.verifyLicence(ov[0]);
  } finally { globalThis.fetch = realFetch; M.transport.large = offlineLarge; }
  check(ok1.ok && /CC0/.test(ok1.quote) && ok1.url === commons[0].page, 'get: a Commons file\'s page read again (CC0, no attribution)', JSON.stringify(ok1));
  check(ok2.ok && /CC0/.test(ok2.quote) && ok2.url === ccm[0].page, 'get: a ccMixter upload\'s record read again', JSON.stringify(ok2));
  check(ok3.ok && ok3.url === ov[0].page, 'get: an Openverse item and its own page read again', JSON.stringify(ok3));
  check(!bad1.ok && /no longer/.test(bad1.why), 'get: a Commons page that now asks for attribution is refused', bad1.why);
  check(!bad2.ok && /does not link the CC0/.test(bad2.why), 'get: an origin page without the CC0 dedication is refused', bad2.why);
  check((await M.verifyLicence(ccm[2])).ok === false, 'get: an item with no usable licence is refused before any request');
}
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-rec-'));
  try {
    let threw = false;
    try { M.licenceRecord(commons[0], { file: 'x.ogg', sha256: '', bytes: 0, date: '2026-10-27' }); } catch { threw = true; }
    check(threw, 'a CC0 record needs the item\'s own page as read now');
    const buf = Buffer.from('OggS a stand-in for the downloaded file');
    fs.writeFileSync(path.join(tmp, 'glass_engine_commons.ogg'), buf);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const rec = M.licenceRecord(commons[0], { file: 'glass_engine_commons.ogg', sha256: sha, bytes: buf.length, date: '2026-10-27', seenQuote: 'CC0: Creative Commons Zero, Public Domain Dedication (attribution required: false)', seenUrl: commons[0].page });
    check(rec.licence_id === 'cc0' && rec.source === 'Wikimedia Commons' && rec.licence_seen.url === commons[0].page && /even for commercial purposes/.test(rec.licence_deed.quote) && rec.credit_required === false,
      'the CC0 record: the page as read, the dedication\'s sentence, no credit required');
    const tpl = JSON.parse(fs.readFileSync(path.join(SKILL, 'assets', 'remotion-starter', 'audio', 'music', 'licence.template.json'), 'utf8'));
    check(Object.keys(tpl).every((k) => k in rec), 'the CC0 record has every field of the template');
    const rp = path.join(tmp, 'glass_engine_commons.licence.json');
    fs.writeFileSync(rp, JSON.stringify(rec));
    const py = findPython({ numpy: false, quiet: true });
    if (py) {
      const r = spawnSync(py[0], [...py.slice(1), path.join(SKILL, 'scripts', 'audio', 'credits.py'), '--check', rp], { encoding: 'utf8' });
      check(r.status === 0, 'credits.py --check accepts the CC0 record', (r.stdout + r.stderr).trim().split('\n').slice(-2).join(' | '));
    } else console.log('skip  credits.py cross-check of the CC0 record: no Python 3.10+ on the PATH');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
{
  const sr = 2000; const pcm = new Float32Array(sr * 60);
  for (let i = 0; i < pcm.length; i++) { const t = i / sr; const a = t < 4 ? 0.1 : t >= 30 && t < 36 ? 0.08 : 0.6; pcm[i] = a * Math.sin(2 * Math.PI * 110 * t); }
  const e = M.energyFromPcm(pcm, sr);
  check(e && Math.abs(e.seconds - 60) < 0.5 && e.breaks.length === 1 && Math.abs(e.breaks[0].entry_s - 36) < 1.5, 'the energy curve from samples: length, the break and its entry', JSON.stringify(e?.breaks));
}
{
  const logs = []; const errs = [];
  const ol = console.log, oe = console.error;
  console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => errs.push(a.join(' '));
  let fmaCode, badCode;
  try {
    fmaCode = await M.main(['search', '--mood', 'calm', '--source', 'fma', '--no-history']);
    badCode = await M.main(['search', '--mood', 'calm', '--source', 'soundcloud']);
  } finally { console.log = ol; console.error = oe; }
  check(fmaCode === 1 && logs.some((l) => /Free Music Archive: not used/.test(l)), 'CLI: --source fma names its reason, exit 1, no request', logs.join(' | '));
  check(badCode === 2 && errs.some((l) => /unknown --source soundcloud/.test(l)), 'CLI: an unknown --source is a usage error (exit 2)');
}
// 10. the music library
{
  const LIBF = path.join(FIX, 'music-library.json');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-lib-'));
  const saved = { home: process.env.CINETIC_HOME, lib: process.env.CINETIC_MUSIC_LIBRARY, fetch: globalThis.fetch };
  const quiet = async (argv) => {
    const logs = [], errs = []; const ol = console.log, oe = console.error;
    console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => errs.push(a.join(' '));
    try { return { code: await M.main(argv), logs, errs }; } finally { console.log = ol; console.error = oe; }
  };
  try {
    const env0 = { CINETIC_HOME: home };
    check(M.libraryPath({}, env0) === null, 'library: none found is null (pick then points at search)');
    check(M.libraryPath({ library: LIBF }, env0) === LIBF, 'library: --library names it');
    check(M.libraryPath({}, { ...env0, CINETIC_MUSIC_LIBRARY: LIBF }) === LIBF, 'library: $CINETIC_MUSIC_LIBRARY names it');
    fs.writeFileSync(path.join(home, 'music-library.json'), JSON.stringify({ link: LIBF }));
    check(path.resolve(M.libraryPath({}, env0)) === path.resolve(LIBF), 'library: a link under $CINETIC_HOME is followed');
    fs.rmSync(path.join(home, 'music-library.json'));
    let threw = false;
    try { M.libraryPath({ library: path.join(home, 'none.json') }, env0); } catch { threw = true; }
    check(threw, 'library: a named library that is not there is an error');
    threw = false;
    try { fs.writeFileSync(path.join(home, 'bad.json'), '{"tracks": 3}'); M.readLibrary(path.join(home, 'bad.json')); } catch { threw = true; }
    check(threw, 'library: a file without library 1 and a track list is refused');

    const tracks = M.readLibrary(LIBF);
    check(tracks.length === 5 && !tracks.some((t) => t.ref === 'pixabay:1' || t.ref === 'mixkit:9105'), 'library: an unknown licence and a voice are not read', tracks.map((t) => t.ref).join(','));
    check(tracks[0].local === path.join(FIX, 'lib', 'glass_pulse.mp3') && tracks[1].local === null, "library: a track's copy resolved under the library's root", String(tracks[0].local));
    check(eq(M.moodsOfWords(M.words('precise premium driving')), { driving: 2.5, elegant: 1 }), 'library: brief words as moods (a name 1.5, a word 1)', JSON.stringify(M.moodsOfWords(M.words('precise premium driving'))));
    check(eq(M.moodsOfWords(M.words('calm soft keys')), { calm: 2.5 }), 'library: other words name no mood');

    const want = { words: ['driving'], moods: M.moodsOfWords(['driving']), bpm: [118, 128], length: 30 };
    const s = Object.fromEntries(tracks.map((t) => [t.ref, M.scoreLibraryTrack(t, want)]));
    check(s['mixkit:9103'].score === -Infinity, 'library: shorter than the film plus its ending is refused');
    check(s['mixkit:9101'].score > s['commons:99990001'].score && s['commons:99990001'].score > s['mixkit:9104'].score && s['mixkit:9104'].score > s['mixkit:9102'].score,
      'library: its own mood over a second mood over another mood; tempo outside the brief last', ['mixkit:9101', 'commons:99990001', 'mixkit:9104', 'mixkit:9102'].map((r) => s[r].score).join(' > '));
    check(s['commons:99990001'].why.some((w) => /61 BPM fits/.test(w)), 'library: half time counts as the tempo (61 for 118-128)');
    const asEntry = M.scoreLibraryTrack({ ...tracks[0], cuts: { ...tracks[0].cuts, reveal: { ...tracks[0].cuts.reveal, kind: 'entry' } } }, want).score;
    check(Math.abs(s['mixkit:9101'].score - asEntry - 0.5) < 1e-9, 'library: a drop for the reveal counts over an entry', `${s['mixkit:9101'].score} vs ${asEntry}`);
    check(Math.abs(s['mixkit:9101'].score - M.scoreLibraryTrack(tracks[0], { ...want, shortlist: new Set(['mixkit:9101']) }).score - 1.5) < 1e-9, 'library: a shortlist track loses ground');

    const rk = M.rankLibrary(tracks, want, { used: [{ ref: 'mixkit:9101', film: '/f/one' }, { ref: 'commons:99990001' }], searches: [{ kind: 'music', first: 'mixkit:9104' }] });
    check(eq(rk.held.map((x) => x.ref).sort(), ['commons:99990001', 'mixkit:9101']), 'library: every earlier film\'s track is held back, not only the last', rk.held.map((x) => x.ref).join(','));
    check(eq(rk.items.map((x) => x.ref), ['mixkit:9102', 'mixkit:9104']), 'library: the previous first offer is not first again', rk.items.map((x) => x.ref).join(','));
    const same = [{ ...tracks[0], ref: 'mixkit:9201', title: 'One' }, { ...tracks[0], ref: 'mixkit:9202', title: 'Two' }, { ...tracks[0], ref: 'mixkit:9203', title: 'Three' }];
    const sr = M.rankLibrary(same, want, {});
    check(eq(sr.items.map((x) => x.score), [s['mixkit:9101'].score, s['mixkit:9101'].score - 1, s['mixkit:9101'].score - 2]), 'library: each higher offer by the same artist costs 1', sr.items.map((x) => x.score).join(','));
    const ra = M.rankLibrary([tracks[0]], want, { used: [{ ref: 'mixkit:1', artist: 'Ada Example' }] });
    check(ra.items[0].score === s['mixkit:9101'].score - 1, 'library: an artist a recent film used costs 1');
    check(M.planText(tracks[1]) === 'reveal on the entry at 1:03 (bar 25); body from bar 5; ends on a fade: track.py edit --end fade; key F major; analyse with --phase 2', 'library: the cut points line', M.planText(tracks[1]));

    // pick on the CLI, under a temporary home
    process.env.CINETIC_HOME = home; delete process.env.CINETIC_MUSIC_LIBRARY;
    const none = await quiet(['pick', '--mood', 'driving']);
    check(none.code === 1 && none.logs.some((l) => /no music library/.test(l)), 'pick: no library says so and points at search (exit 1)', none.logs.join(' | '));
    const out = path.join(home, 'out', 'search.json');
    const p1 = await quiet(['pick', '--mood', 'driving', '--length', '30', '--bpm', '118-128', '--library', LIBF, '--out', out]);
    const res = JSON.parse(fs.readFileSync(out, 'utf8'));
    check(p1.code === 0 && res.items[0].ref === 'mixkit:9101' && res.items[0].plan.text.startsWith('reveal on the drop at 1:02 (bar 33)') && res.items[0].tempo.kind === 'measured',
      'pick: results with cut points where search writes them', `${p1.code} ${res.items[0]?.ref} ${res.items[0]?.plan?.text}`);
    check(M.readHistory().searches.at(-1)?.first === 'mixkit:9101', 'pick: the offer is in the history');
    const h = M.readHistory(); h.used.push({ ref: 'mixkit:9101', kind: 'music', date: '2026-10-27', film: '/f/two' }); M.writeHistory(h);
    const p2 = await quiet(['pick', '--mood', 'driving', '--length', '30', '--bpm', '118-128', '--library', LIBF, '--out', out, '--json']);
    const res2 = JSON.parse(p2.logs.join('\n'));
    check(p2.code === 0 && res2.items[0].ref !== 'mixkit:9101' && res2.held.some((x) => x.ref === 'mixkit:9101'), 'pick: the track an earlier film used is never offered again', res2.items.map((x) => x.ref).join(','));
    const bad = await quiet(['pick', '--library', LIBF]);
    check(bad.code === 2, 'pick: without words is a usage error (exit 2)');

    // get takes the library's copy, the licence page read again (a stand-in answer)
    const libdir = path.join(home, 'lib'); fs.mkdirSync(libdir, { recursive: true });
    const buf = Buffer.from('ID3 a stand-in for the library copy');
    fs.writeFileSync(path.join(libdir, 'glass_pulse.mp3'), buf);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const item = M.libraryItem({ ...tracks[0], local: path.join(libdir, 'glass_pulse.mp3'), sha256: sha });
    check(M.libraryCopy(item) === item.library.file && M.libraryCopy({ ...item, library: { ...item.library, sha256: '0'.repeat(64) } }) === null, 'get: the copy is used only while its sha256 matches');
    const from = path.join(home, 'out', 'lib-search.json');
    fs.writeFileSync(from, JSON.stringify({ query: { mood: 'driving' }, items: [item] }));
    const seenUrl = M.LICENCES['mixkit-music'].seen.url;
    globalThis.fetch = async (u) => {
      if (String(u) === seenUrl) return { status: 200, ok: true, headers: { get: () => 'text/html' }, text: async () => `<p>${M.LICENCES['mixkit-music'].seen.quote}</p>` };
      fetched++; throw new Error(`network used in an offline test: ${String(u).slice(0, 60)}`);
    };
    const to = path.join(home, 'film', 'audio', 'music');
    const g = await quiet(['get', '#1', '--from', from, '--to', to, '--film', path.join(home, 'film')]);
    globalThis.fetch = saved.fetch;
    const recf = path.join(to, 'glass_pulse_mixkit.licence.json');
    const rec = fs.existsSync(recf) ? JSON.parse(fs.readFileSync(recf, 'utf8')) : {};
    check(g.code === 0 && fs.readFileSync(path.join(to, 'glass_pulse_mixkit.mp3')).equals(buf) && rec.sha256 === sha && rec.licence_seen?.url === seenUrl,
      "get: the library's copy, its record with the licence read again now", `${g.code} ${g.errs.join(' ')} ${rec.sha256 === sha}`);
    check(g.logs.some((l) => /the library's copy/.test(l)) && g.logs.some((l) => /cut points .*reveal on the drop/.test(l)), 'get: says it used the copy and prints the cut points');
    check(M.readHistory().used.at(-1)?.ref === 'mixkit:9101', 'get: the track becomes the film\'s in the history');
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.home === undefined) delete process.env.CINETIC_HOME; else process.env.CINETIC_HOME = saved.home;
    if (saved.lib === undefined) delete process.env.CINETIC_MUSIC_LIBRARY; else process.env.CINETIC_MUSIC_LIBRARY = saved.lib;
    fs.rmSync(home, { recursive: true, force: true });
  }
}
// 11. Coverr (music-fixtures/coverr-audios.json: hand-written in the catalog's shape, every value invented)
{
  const cv = M.parseCoverr(fixJson('coverr-audios.json'));
  const [a, b, c] = cv;
  check(cv.length === 3 && a.ref === 'coverr:T3st1AbCd' && a.licence === 'coverr' && a.source === 'coverr' && a.kind === 'music'
    && a.file_url.endsWith('preview.mp3?download=true') && a.tags.genre.includes('electronic') && a.tags.mood.includes('confident') && a.seconds === 124.5,
    'coverr: a free published track parses with the Coverr License and its full-length download', JSON.stringify(a).slice(0, 160));
  check(a.energy && a.energy.curve.length === 24 && a.notes.some((n) => /128 kbps/.test(n)), 'coverr: the energy curve from its waveform, the 128 kbps note');
  check(b.vocals === true && M.scoreItem(b).score === -Infinity, 'coverr: backing vocals refused');
  check(c.licence === 'unknown' && c.notes.some((n) => /premium/.test(n)), 'coverr: a premium item refused');
  check(M.coverrUrl(2, 50) === 'https://coverr.co/papi/audios?page=2&page_size=50' && M.coverrItemUrl('T3st1AbCd') === 'https://coverr.co/papi/audios/T3st1AbCd', 'coverr: the catalog and item URLs');
  const rec = M.licenceRecord(a, { file: 'glass_avenue_coverr.mp3', sha256: '0'.repeat(64), bytes: 2e6, date: '2026-10-28', seenQuote: M.LICENCES.coverr.seen.quote, seenUrl: M.LICENCES.coverr.seen.url });
  check(rec.licence === 'Coverr License' && rec.credit_required === false && /Coverr/.test(rec.credit) && rec.licence_seen.url === 'https://coverr.co/license', 'coverr: the licence record, no credit needed');
}
// 12. The library ranks by the launch profile and by a real ending
{
  const base = { ref: 'mixkit:1', title: 'T', artist: 'A', seconds: 150, file_url: 'x', licence: 'mixkit-music', mood: 'driving', moods: [], bpm: 120,
    cuts: { reveal: { kind: 'drop', bar: 9, t: 20 }, ending: { kind: 'ring', final_bar: 60, ring_s: 2.1 } }, quality: 5 };
  const want = { moods: { driving: 1.5 }, words: ['driving'], length: 30, bpm: [118, 124] };
  const own = M.scoreLibraryTrack(base, want);
  const fade = M.scoreLibraryTrack({ ...base, cuts: { ...base.cuts, ending: { kind: 'fade' } } }, want);
  check(Math.abs(own.score - fade.score - 4.5) < 1e-9 && own.why.some((w) => /a real ending: its final hit \(bar 60\) rings 2\.1 s/.test(w))
    && fade.why.some((w) => /no ending of its own \(fade\)/.test(w)), 'library: a real ending outranks a fade', `${own.score} ${fade.score}`);
  const near = M.scoreLibraryTrack({ ...base, profile: { ref_z: 1.5 } }, want), far = M.scoreLibraryTrack({ ...base, profile: { ref_z: -1 } }, want);
  check(Math.abs(near.score - far.score - 3) < 1e-9 && near.why.some((w) => /close to the launch sound/.test(w)), 'library: closer to the launch films ranks higher', `${near.score} ${far.score}`);
  check(/ends on its own final hit at bar 60 \(rings 2\.1 s\): track\.py edit --end own/.test(M.planText(base)) && /track\.py edit --end fade/.test(M.planText({ ...base, cuts: { ending: { kind: 'fade' } } })),
    'library: the cut line names the ending and its edit', M.planText(base));
}
// 13. A launch prefers 115-136 BPM and the film's energy
{
  const t = (ref, bpm, mood) => ({ ref, title: ref, artist: ref, seconds: 150, file_url: 'x', licence: 'mixkit-music', mood, moods: [], bpm,
    cuts: { reveal: { kind: 'drop', bar: 9, t: 20 }, ending: { kind: 'ring', final_bar: 60, ring_s: 2.1 } }, quality: 5 });
  const dnb = t('mixkit:dnb', 146, 'driving'), house = t('mixkit:house', 124, 'driving'), slow = t('mixkit:slow', 92, 'elegant');
  const launch = { moods: { driving: 1.5 }, words: ['driving'], length: 30, bpm: M.LAUNCH_BPM, launch: true, launchBpm: true, energy: 1 };
  const plain = { moods: { driving: 1.5 }, words: ['driving'], length: 30 };
  const gap = (w) => M.scoreLibraryTrack(house, w).score - M.scoreLibraryTrack(dnb, w).score;
  check(gap(launch) >= 8 && gap(plain) === 0 && M.scoreLibraryTrack(dnb, launch).why.some((w) => /146 BPM outside the launch range \(115-136 for a launch\)/.test(w)),
    'launch: a 146 BPM track loses to a 124 BPM one by the launch range (with no range given they tie)', `launch gap ${gap(launch)}, plain gap ${gap(plain)}`);
  check(M.trackEnergy(dnb) === 2 && M.trackEnergy(house) === 2 && M.trackEnergy(slow) === 0 && M.trackEnergy(t('x', 120, 'uplifting')) === 1, 'launch: a track\'s energy from its mood and tempo');
  const calmFilm = { ...launch, energy: 0 };
  check(M.scoreLibraryTrack(dnb, calmFilm).why.some((w) => /punchy energy under a calm film/.test(w)) && M.scoreLibraryTrack(slow, calmFilm).why.some((w) => /calm energy, like the film/.test(w)),
    'launch: a punchy track under a calm film loses ground, a calm one gains');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-fmt-'));
  fs.writeFileSync(path.join(dir, 'film.json'), JSON.stringify({ template: 'launch-simple' }));
  check(M.filmFormat(dir) === 'launch' && M.filmFormat(os.tmpdir()) === null, 'launch: a launch-simple film.json here makes pick a launch');
  fs.rmSync(dir, { recursive: true, force: true });
}
check(fetched === 0, 'no network used', `${fetched} request(s)`);

console.log(`music.test.mjs: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
