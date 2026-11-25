#!/usr/bin/env node
// sfx.mjs: real, licensed sound effects and music for a film. Audio is fetched into public/ and never committed.
//
//   node scripts/sfx.mjs roles                      the roles and how many judged sounds each has
//   node scripts/sfx.mjs list [role] [--all]        sounds of a role (strong/plausible verdicts first; --all adds weak)
//   node scripts/sfx.mjs get <id> [<id> ...]        download to public/sfx/<id>.<ext>; writes public/sfx/sfx.json
//                                                   ({ id: { src, leadMs, durS, title, role, licence, page } })
//   node scripts/sfx.mjs pick <role> [n] [--seed s] get n sounds of a role, a different pick per seed (film name)
//   node scripts/sfx.mjs shortlist [--vibe v] [--energy 3] [--bpm 100-125] [--for "ai product"]
//                                                   licensed tracks measured for launch films: tempo, the second the
//                                                   beat is going (start the bed there), energy, mood (music-shortlist.json)
//   node scripts/sfx.mjs music <shortlist id> [--as bed]  fetch a shortlist track with its licence and credit
//   node scripts/sfx.mjs music <url> --as <name> --page <url> --licence <id> [--credit "..."]
//                                                   any other track whose licence page you have read (recorded in
//                                                   public/music/music.json)
//   node scripts/sfx.mjs analyze public/music/bed.mp3   the track's tempo (from its kicks) and sections: where it is quiet,
//                                                   where it lifts or drops; put the film's turns on them
//   node scripts/sfx.mjs fit public/music/bed.mp3 --hit 104 --len 284 [--enter 8] [--cuts 12,44,182]
//                                                   where to start the track so the film's main hit lands on a beat
//                                                   where the music lifts, and which cuts sit off the beat
//   node scripts/sfx.mjs credits [--film main]     the CREDITS.md block for the sounds, music, pictures and marks the
//                                                   film's source (src/films/<film>) uses
//
// The catalogue (scripts/sfx-catalogue.json) lists recordings whose licence allows commercial films, each with
// its onset (lead) measured so <Sfx at={frame}> can land the transient exactly on the frame.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const film = process.cwd();
const cat = JSON.parse(fs.readFileSync(path.join(here, 'sfx-catalogue.json'), 'utf8'));
const shortlist = JSON.parse(fs.readFileSync(path.join(here, 'music-shortlist.json'), 'utf8'));
const LICENCE_URLS = {
  'mixkit-sfx': 'https://mixkit.co/license/#sfxFree',
  'mixkit-music-free': 'https://mixkit.co/license/#musicFree',
  'mixkit-music': 'https://mixkit.co/license/#musicFree',
  'cc-by-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'cc0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'pixabay': 'https://pixabay.com/service/license-summary/',
  'kenney-cc0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  ...Object.fromEntries(Object.entries(shortlist.licences ?? {}).map(([k, v]) => [k, v.url])),
};
const allSounds = cat.sounds;
// hidden entries are only sources of a transform (a hit that is reversed into a swell), never cast on their own
const sounds = allSounds.filter((x) => !x.hidden);
const rank = { strong: 0, plausible: 1, weak: 2 };
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const verdict = (s) => s.ear?.verdict ?? 'plausible';

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const ensure = (d) => fs.mkdirSync(d, { recursive: true });

// A track's tempo and beat phase, measured from the file itself: autocorrelation of the onset envelope finds the tempo,
// then a comb over the whole track refines it (a grid that is 1 % off drifts half a beat in 25 s).
function measureTrack(file) {
  const SR = 4000;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg could not read ${file}`);
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
  const hop = 40; // 10 ms
  const n = Math.floor(x.length / hop);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < hop; k++) { const v = x[i * hop + k]; s += v * v; } e[i] = Math.sqrt(s / hop); }
  const on = new Float32Array(n);
  for (let i = 1; i < n; i++) on[i] = Math.max(0, Math.log1p(e[i] * 50) - Math.log1p(e[i - 1] * 50));
  const score = (lag) => { let s = 0; for (let i = 0; i + lag < n; i++) s += on[i] * on[i + lag]; return s; };
  let best = 0, bestLag = 0;
  for (let bpm = 70; bpm <= 180; bpm += 0.1) {
    const lag = 6000 / bpm; // hops per beat (100 hops a second)
    const l0 = Math.floor(lag), fr = lag - l0;
    const s = score(l0) * (1 - fr) + score(l0 + 1) * fr + 0.5 * (score(Math.round(lag * 2)) + score(Math.round(lag * 4)));
    if (s > best) { best = s; bestLag = bpm; }
  }
  let bpm = bestLag;
  while (bpm < 85) bpm *= 2;
  while (bpm > 170) bpm /= 2;
  // refine: the tempo and phase whose beat grid, laid over the whole track, collects the most onsets
  const wide = new Float32Array(n);
  for (let i = 1; i < n - 1; i++) wide[i] = on[i - 1] + on[i] + on[i + 1];
  const comb = (b) => {
    const bh = 6000 / b;
    let top = -1, ph = 0;
    for (let q = 0; q < bh; q += 1) { let s = 0; for (let t = q; t < n; t += bh) s += wide[Math.round(t)] || 0; if (s > top) { top = s; ph = q; } }
    return { top, ph };
  };
  let fine = bpm, fineTop = -1, bestPh = 0;
  for (let b = bpm * 0.985; b <= bpm * 1.015; b += 0.01) { const c = comb(b); if (c.top > fineTop) { fineTop = c.top; fine = b; bestPh = c.ph; } }
  bpm = Math.round(fine * 100) / 100;
  const secs = Math.floor(n / 100);
  const lvl = [];
  for (let s = 0; s < secs; s++) { let m = 0; for (let i = s * 100; i < (s + 1) * 100; i++) m += e[i] * e[i]; lvl.push(10 * Math.log10(m / 100 + 1e-10)); }
  return { x, SR, n, e, on, bpm, beatHops: 6000 / bpm, bestPh, secs, lvl, peak: Math.max(...lvl) };
}
const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);

async function download(url, out) {
  const res = await fetch(url, { headers: { 'User-Agent': 'cinetic-film/2 (sound fetch)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) throw new Error(`file too small (${buf.length} B) from ${url}`);
  fs.writeFileSync(out, buf);
  return buf.length;
}

/** One file out of a zip (stored or deflated), read from its central directory: no unzip tool needed. */
function unzipMember(zipBuf, member) {
  const eocd = zipBuf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip file');
  const count = zipBuf.readUInt16LE(eocd + 10);
  let p = zipBuf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = zipBuf.readUInt16LE(p + 10);
    const csize = zipBuf.readUInt32LE(p + 20);
    const nlen = zipBuf.readUInt16LE(p + 28);
    const elen = zipBuf.readUInt16LE(p + 30);
    const clen = zipBuf.readUInt16LE(p + 32);
    const local = zipBuf.readUInt32LE(p + 42);
    const name = zipBuf.toString('utf8', p + 46, p + 46 + nlen);
    if (name === member || name.endsWith(`/${member}`)) {
      const lnlen = zipBuf.readUInt16LE(local + 26);
      const lelen = zipBuf.readUInt16LE(local + 28);
      const data = zipBuf.subarray(local + 30 + lnlen + lelen, local + 30 + lnlen + lelen + csize);
      return method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data);
    }
    p += 46 + nlen + elen + clen;
  }
  throw new Error(`${member} is not in the archive`);
}

/** Fetch one catalogue sound's file to `out`: a direct file, a member of an archive, or a transform of another sound. */
async function fetchSound(s, out, dir) {
  if (s.transform === 'reverse') {
    // a real hit reversed: the first transform_s seconds of the source, played backwards, swell into the frame
    // the source hit: its own catalogue entry, or the file this entry names
    const src = allSounds.find((x) => x.id === s.of) ?? { id: s.of ?? `${s.id}-src`, file_url: s.file_url };
    if (!src.file_url && !src.archive_url) throw new Error(`${s.id}: no source file for the transform`);
    const tmp = path.join(dir, `.src-${src.id}${extOf(src)}`);
    if (!fs.existsSync(tmp)) await fetchSound(src, tmp, dir);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', `atrim=0:${s.transform_s ?? 2},areverse`, out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`${s.id}: ffmpeg could not reverse ${src.id}: ${r.stderr}`);
    fs.rmSync(tmp);
    return fs.statSync(out).size;
  }
  if (s.archive_url) {
    const cache = path.join(dir, '.cache');
    ensure(cache);
    const zipPath = path.join(cache, `${hash(s.archive_url).toString(16)}.zip`);
    if (!fs.existsSync(zipPath)) await download(s.archive_url, zipPath);
    const buf = unzipMember(fs.readFileSync(zipPath), s.member);
    fs.writeFileSync(out, buf);
    return buf.length;
  }
  return download(s.file_url, out);
}

const extOf = (s) => (s.transform ? '.wav' : path.extname(s.member ?? new URL(s.file_url).pathname) || '.wav');

async function get(ids) {
  const dir = path.join(film, 'public', 'sfx');
  ensure(dir);
  const indexPath = path.join(dir, 'sfx.json');
  const index = readJson(indexPath, {});
  for (const id of ids) {
    const s = sounds.find((x) => x.id === id);
    if (!s) {
      const r = (cat.rejected ?? []).find((x) => x.id === id);
      console.error(r ? `${id} is rejected: ${r.why}. Pick a dry sound instead (node scripts/sfx.mjs list <role>)` : `unknown id ${id} (node scripts/sfx.mjs list <role>)`);
      process.exitCode = 1;
      continue;
    }
    const file = `${id}${extOf(s)}`;
    const out = path.join(dir, file);
    if (!fs.existsSync(out)) {
      const n = await fetchSound(s, out, dir);
      console.log(`got ${id}  ${s.title}  (${Math.round(n / 1024)} kB)`);
    } else console.log(`have ${id}  ${s.title}`);
    index[id] = {
      src: `sfx/${file}`,
      // onset sounds land their attack on the frame; peak sounds (whooshes, swells, risers) land their peak
      leadMs: Math.round(s.align === 'peak' ? s.peak_ms ?? 0 : s.lead_ms ?? s.onset_ms ?? 0),
      align: s.align,
      durS: s.dur_s,
      title: s.title,
      role: s.role,
      licence: s.licence,
      page: s.page,
    };
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  writeTs(index);
  console.log(`index: public/sfx/sfx.json + src/sfx.ts (${Object.keys(index).length} sounds). Use: <Sfx at={frame} {...sfx['${ids[0]}']} />`);
}

/** src/sfx.ts: the fetched sounds as a typed object, so a film writes <Sfx at={f} {...sfx['mixkit-168']} volume={0.5} />. */
function writeTs(index) {
  const src = path.join(film, 'src');
  if (!fs.existsSync(src)) return;
  const body = Object.entries(index)
    .map(([id, x]) => `  '${id}': { src: '${x.src}', leadMs: ${x.leadMs} }, // ${x.role}: ${x.title.replace(/\*\//g, '')}`)
    .join('\n');
  const head = '// Written by scripts/sfx.mjs get: the sounds in public/sfx (never committed). Credits: node scripts/sfx.mjs credits';
  fs.writeFileSync(path.join(src, 'sfx.ts'), `${head}\nexport const sfx = {\n${body}\n} as const;\n`);
}



if (cmd === 'roles') {
  const by = {};
  for (const s of sounds) (by[s.role] ??= []).push(s);
  for (const [r, list] of Object.entries(by)) {
    const good = list.filter((s) => verdict(s) !== 'weak').length;
    const ex = list.find((s) => verdict(s) === 'strong') ?? list.find((s) => verdict(s) !== 'weak') ?? list[0];
    console.log(`${r.padEnd(14)} ${String(good).padStart(2)} good / ${list.length}   e.g. ${ex.title} (${ex.id})`);
  }
} else if (cmd === 'list') {
  const role = args[1] && !args[1].startsWith('--') ? args[1] : null;
  const all = args.includes('--all');
  const list = sounds
    .filter((s) => (!role || s.role === role) && (all || verdict(s) !== 'weak'))
    .sort((a, b) => rank[verdict(a)] - rank[verdict(b)]);
  for (const s of list) console.log(`${s.id.padEnd(14)} ${s.role.padEnd(13)} ${verdict(s).padEnd(9)} ${String(s.dur_s).padEnd(6)}s  ${s.title}  [${(s.tags || []).slice(0, 4).join(', ')}]`);
} else if (cmd === 'get') {
  await get(args.slice(1).filter((a) => !a.startsWith('--')));
} else if (cmd === 'pick') {
  const role = args[1];
  const n = Number(args[2] && !args[2].startsWith('--') ? args[2] : 1);
  const seed = flag('seed', path.basename(film));
  const list = sounds.filter((s) => s.role === role && verdict(s) !== 'weak');
  if (!list.length) throw new Error(`no good sounds for role ${role}${sounds.some((s) => s.role === role) ? '' : ': the palette has none on purpose (bells, chimes, tones, swells, risers and trailer hits are rejected; see references/sound-design.md). Use a dry sound or let the music carry it'}`);
  const start = hash(seed) % list.length;
  const ids = Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(start + i) % list.length].id);
  await get(ids);
} else if (cmd === 'shortlist') {
  const vibe = flag('vibe');
  const energy = flag('energy');
  const bpm = flag('bpm');
  const forWhat = flag('for');
  const [lo, hi] = bpm ? bpm.split('-').map(Number) : [0, 999];
  const list = shortlist.tracks.filter((t) => {
    const b = t.bpm_measured ?? Number(t.bpm) ?? 0;
    return (!vibe || (t.vibe ?? '').includes(vibe)) && (!energy || String(t.energy) === energy) && (!bpm || (b >= lo && b <= (hi ?? lo))) && (!forWhat || (t.good_for ?? []).join(' ').toLowerCase().includes(forWhat.toLowerCase()));
  });
  for (const t of list)
    console.log(`${t.id.padEnd(40)} ${String(t.bpm_measured ?? t.bpm).padStart(6)} bpm  energy ${t.energy}  starts ${String(t.good_from_s ?? '?').padStart(5)} s  ${t.vibe ?? ''}  ${(t.mood ?? []).join(', ')}  "${t.title}"${t.credit ? '  CREDIT REQUIRED' : ''}`);
  console.log(`
${list.length} tracks. Fetch one: node scripts/sfx.mjs music <id>. Audition it before you lock the edit.`);
} else if (cmd === 'music') {
  const ref = args[1];
  const t = shortlist.tracks.find((x) => x.id === ref);
  const url = t ? t.file_url : ref;
  const name = flag('as', t ? 'bed' : undefined);
  if (!url || !name) throw new Error('usage: sfx.mjs music <shortlist id> [--as bed] | sfx.mjs music <url> --as <name> --page <url> --licence <id>');
  const licence = t ? t.licence : flag('licence');
  if (!t && (!licence || !flag('page'))) throw new Error('a track outside the shortlist needs --page <the page you read> and --licence <id>');
  const dir = path.join(film, 'public', 'music');
  ensure(dir);
  const ext = path.extname(new URL(url).pathname) || '.mp3';
  const out = path.join(dir, `${name}${ext}`);
  if (!fs.existsSync(out)) console.log(`got ${name} (${Math.round((await download(url, out)) / 1024)} kB)`);
  const idxPath = path.join(dir, 'music.json');
  const idx = readJson(idxPath, {});
  idx[name] = {
    src: `music/${name}${ext}`,
    title: t?.title,
    artist: t?.artist,
    url,
    page: t ? t.page_url : flag('page'),
    licence,
    licenceUrl: LICENCE_URLS[licence],
    credit: t ? t.credit ?? '' : flag('credit', ''),
    bpm: t?.bpm_measured,
    startFrom: t?.good_from_s,
    firstBeat: t?.first_beat_s,
    fetched: new Date().toISOString().slice(0, 10),
  };
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  // measure the tempo and the beat from the file itself (the shortlist's tempo is rough: fine for choosing, not for a grid)
  let m = null;
  try { m = measureTrack(out); } catch { /* no ffmpeg: keep the shortlist's values */ }
  const bpm = m ? m.bpm : t?.bpm_measured;
  const first = m ? m.bestPh / 100 : t?.first_beat_s;
  // start on a beat four-beat steps from the first detected beat, at or after the point the track gets going
  let st = t?.good_from_s ?? 0;
  if (bpm && first !== undefined && first !== null) {
    const bar = (60 / bpm) * 4;
    st = +(first + Math.ceil((st - first) / bar) * bar).toFixed(2);
  }
  Object.assign(idx[name], { bpm, firstBeat: first, startFrom: st });
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  const steady = bpm && Math.abs(bpm - Math.round(bpm)) <= 0.07;
  console.log(`use: <Music src="music/${name}${ext}" startFrom={${st}} />` + (steady ? `  (${bpm} BPM measured from the file; beat grid: beats(${bpm}, 0) when the bed starts at frame 0)` : bpm ? `  (no steady beat grid found in the file${t?.bpm ? `; the composer states ${t.bpm} BPM` : ''}: place it by its sections)` : ''));
  console.log(`then: node scripts/sfx.mjs fit public/music/${name}${ext} --hit <frame of the film's main hit> --len <frames>   (the start that lands the hit on a lift)`);
} else if (cmd === 'analyze' || cmd === 'fit') {
  // tempo by autocorrelation of the onset envelope; sections from 1 s loudness (dB)
  const file = args[1];
  if (!file) throw new Error(`usage: sfx.mjs ${cmd} <audio file>${cmd === 'fit' ? ' --hit <frame> --len <frames> [--cuts 12,44,104] [--fps 30]' : ''}`);
  const { x, SR, n, e, on, bpm, beatHops, bestPh, secs, lvl, peak } = measureTrack(file);
  if (cmd === 'fit') {
    // where to start the track so the film's main hit lands on a beat where the music lifts, with music under the whole film
    const fps = Number(flag('fps', 30));
    // --enter: the frame the bed enters (<Music enterAt>); the track plays from startFrom at that frame
    const enter = Number(flag('enter', 0));
    const hit = Number(flag('hit')) - enter;
    const len = Number(flag('len')) - enter;
    if (!Number.isFinite(hit) || !Number.isFinite(len)) throw new Error('usage: sfx.mjs fit <audio file> --hit <frame of the main hit> --len <film length in frames> [--cuts 12,44,104] [--fps 30]');
    const dB = (a, b) => { let m = 0, c = 0; for (let i = Math.max(0, Math.round(a * 100)); i < Math.min(n, Math.round(b * 100)); i++) { m += e[i] * e[i]; c++; } return c ? 10 * Math.log10(m / c + 1e-10) : -100; };
    const onMax = Math.max(...on) || 1;
    const cands = [];
    for (let t = bestPh; t < n; t += beatHops) {
      const b = t / 100; // a beat, in seconds of the track
      const S = b - hit / fps;
      if (S < 0 || S + len / fps > x.length / SR - 0.5) continue;
      const lift = dB(b, b + 2) - dB(b - 2, b);
      const body = dB(S, S + len / fps) - peak;
      const open = dB(S, S + 1) - peak;
      let kick = 0;
      for (let i = Math.round(t) - 2; i <= Math.round(t) + 2; i++) kick = Math.max(kick, on[i] || 0);
      const rank = Math.min(lift, 12) + 3 * (kick / onMax) + 1.5 * Math.min(0, body + 8) + 0.5 * Math.min(0, open + 22);
      cands.push({ S, lift, body, open, rank });
    }
    cands.sort((a, b) => b.rank - a.rank);
    const beatF = (60 / bpm) * fps;
    console.log(`${path.basename(file)}: ${bpm.toFixed(2)} BPM, a beat every ${beatF.toFixed(2)} frames. Starts that put frame ${hit + enter} on a beat (best first):`);
    if (Math.abs(bpm - Math.round(bpm)) > 0.07) console.log('  (the measured tempo is not a clean number: this track may have no steady grid. Trust the lift, not the beat positions.)');
    for (const c of cands.slice(0, 6)) console.log(`  startFrom={${c.S.toFixed(2)}}  the music ${c.lift >= 0 ? 'lifts +' : 'falls '}${c.lift.toFixed(0)} dB at the hit; under the film it sits ${c.body.toFixed(0)} dB below the track's loudest, the first second ${c.open.toFixed(0)} dB`);
    if (!cands.length) console.log('  none: the track is shorter than the film from any beat');
    const off = (hit + enter) % beatF;
    console.log(`Beat grid in the film: beats(${bpm.toFixed(2)}, ${off.toFixed(1)}) (frame ${hit + enter} is a beat). Listen that it is the bar's first beat; if not, move startFrom by one beat (${(60 / bpm).toFixed(3)} s).`);
    const cuts = (flag('cuts', '') || '').split(',').map(Number).filter((v) => Number.isFinite(v) && String(v) !== '');
    if (cuts.length) {
      const rows = cuts.map((c) => { const k = Math.round((c - off) / (beatF / 2)); const g = off + k * (beatF / 2); return { c, d: Math.round(g) - c, half: k % 2 !== 0 }; });
      const onGrid = rows.filter((v) => Math.abs(v.d) <= 1).length;
      console.log(`Cuts against the grid (beats and half beats): ${onGrid} of ${rows.length} within a frame.`);
      for (const v of rows) console.log(`  frame ${String(v.c).padStart(4)}  ${v.d === 0 ? 'on' : `${v.d > 0 ? '+' : ''}${v.d} f to`} the ${v.half ? 'half beat' : 'beat'}${Math.abs(v.d) > 1 ? '  (move it, or leave it if a sound carries it)' : ''}`);
    }
    process.exit(0);
  }
  if (Math.abs(bpm - Math.round(bpm)) > 0.07) console.log('(no steady beat grid in this file: the tempo below is the closest fit; place cuts on its sections and lifts, not on beats)');
  console.log(`${path.basename(file)}: ${(x.length / SR).toFixed(1)} s, ${bpm.toFixed(2)} BPM (a beat every ${(60 / bpm).toFixed(3)} s = ${((60 / bpm) * 30).toFixed(2)} frames at 30 fps), first beat at ${(bestPh / 100).toFixed(2)} s`);
  console.log('level by second (dB below the loudest; # = loud):');
  for (let s = 0; s < secs; s += 10) console.log(`  ${String(s).padStart(4)} s  ${lvl.slice(s, s + 10).map((v) => (v > peak - 3 ? '#' : v > peak - 8 ? '=' : v > peak - 16 ? '-' : '.')).join('')}`);
  const events = [];
  for (let s = 4; s < secs; s++) {
    const before = (lvl[s - 1] + lvl[s - 2] + lvl[s - 3]) / 3;
    if (lvl[s] < before - 8) events.push(`${s} s quiet (${(lvl[s] - before).toFixed(0)} dB): a breath, put a turn or a reveal after it`);
    if (lvl[s] > before + 6) events.push(`${s} s lifts (+${(lvl[s] - before).toFixed(0)} dB): a drop, land the reveal on it`);
  }
  console.log(events.length ? events.map((v) => `  ${v}`).join('\n') : '  no clear gaps or drops: the track is even; cut on bars');
  console.log('The tempo is measured from this file (the shortlist values are rough, for choosing). Next: sfx.mjs fit <file> --hit <frame> --len <frames>.');
} else if (cmd === 'credits') {
  // only what the film's own source uses: src/films/<film> (--film, default main), or all of src/ outside the kit
  const filmName = flag('film', 'main');
  const filmDir = path.join(film, 'src', 'films', filmName);
  const srcFiles = [];
  const walk = (d) => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'kit') walk(p); }
      else if (/\.(tsx?|jsx?)$/.test(e.name) && !['sfx.ts', 'logos.ts'].includes(e.name)) srcFiles.push(fs.readFileSync(p, 'utf8'));
    }
  };
  walk(fs.existsSync(filmDir) ? filmDir : path.join(film, 'src'));
  const allSrc = srcFiles.join('\n');
  const literals = new Set([...allSrc.matchAll(/['"`]([^'"`\n]{1,60})['"`]/g)].map((m) => m[1]));
  // sounds: the ids the code plays (sfx['id'])
  const all = readJson(path.join(film, 'public', 'sfx', 'sfx.json'), {});
  const s = Object.fromEntries(Object.entries(all).filter(([id]) => literals.has(id)));
  // music: the tracks the code plays (music/<file>), recorded or not
  const mAll = readJson(path.join(film, 'public', 'music', 'music.json'), {});
  const m = Object.fromEntries(Object.entries(mAll).filter(([, t]) => t.src && allSrc.includes(t.src)));
  const recorded = new Set(Object.values(m).map((t) => t.src));
  const played = new Set([...allSrc.matchAll(/<Music\b[\s\S]*?\bsrc=\{?\s*(?:staticFile\()?['"`]([^'"`]+)['"`]/g)].map((x) => x[1].replace(/^\//, '')));
  for (const lit of literals) if (/^\/?music\/[^\s]+\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(lit)) played.add(lit.replace(/^\//, ''));
  const unrecorded = [...played].filter((f) => !recorded.has(f));
  console.log('## Sound\n');
  for (const [name, t] of Object.entries(m))
    console.log(`- Music: "${t.title ?? name}"${t.artist ? ` by ${t.artist}` : ''} (${t.page}). Licence: ${t.licence} ${t.licenceUrl ?? LICENCE_URLS[t.licence] ?? ''}${t.credit ? `\n  Credit (required, keep it in the video description): ${t.credit}` : ''}`);
  for (const f of unrecorded) {
    const hit = shortlist.tracks?.find?.((t) => f.includes(t.id));
    console.log(hit
      ? `- Music: "${hit.title ?? hit.id}"${hit.artist ? ` by ${hit.artist}` : ''} (${hit.page ?? ''}). Licence: ${hit.licence ?? ''} ${LICENCE_URLS[hit.licence] ?? ''}`
      : `- Music: public/${f} (TODO: not recorded in public/music/music.json: write its title, artist, page and licence here, or fetch it with sfx.mjs music so it is recorded)`);
  }
  if (!Object.keys(m).length && !unrecorded.length) console.log('- Music: none found in the film\'s code (no <Music src="music/...">)');
  for (const [, x] of Object.entries(s)) console.log(`- Sound: "${x.title}" (${x.page}). Licence: ${x.licence} ${LICENCE_URLS[x.licence] ?? ''}`);
  // photos, footage and marks recorded by assets.mjs and logos.mjs
  const pics = readJson(path.join(film, 'assets', 'licences.json'), readJson(path.join(film, 'public', 'assets', 'licences.json'), null));
  if (pics) {
    console.log('\n## Pictures\n');
    for (const p of Array.isArray(pics) ? pics : Object.values(pics.items ?? pics)) if (p && typeof p === 'object') console.log(`- ${p.title ?? p.file ?? p.name ?? 'picture'}${p.author ? ` by ${p.author}` : ''} (${p.page ?? p.url ?? ''}). Licence: ${p.licence ?? p.license ?? ''}`);
  }
  // marks: only those the film's code names (<Brand name="github" />, a name in its data), and the marks a library host
  // screen it imports draws (GitHub's pages, VS Code's window)
  const slug = (v) => String(v).toLowerCase().replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  // a name in the data counts from three letters (a one-letter 'X' is a close icon, not the X mark); <Brand name> always
  const named = new Set([...literals].map(slug).filter((n) => n.length >= 3));
  for (const mm of allSrc.matchAll(/<Brand(?:Tile)?\b[^>]*?\bname=["']([^"']+)["']/g)) named.add(slug(mm[1]));
  const HOST_MARKS = { GitHubPullRequest: 'github', GitHubIssueCard: 'github', GitHubIssueColumn: 'github', VSCodeWindow: 'visualstudiocode' };
  for (const [comp, mark] of Object.entries(HOST_MARKS)) if (new RegExp(`<${comp}\\b`).test(allSrc)) named.add(mark);
  const marks = readJson(path.join(film, 'public', 'logos', 'logos.json'), null);
  const shown = Object.entries(marks?.logos ?? {}).filter(([k, e]) => [k, e.name, ...(e.keys ?? [])].some((n) => named.has(slug(n))));
  const known = new Set(Object.entries(marks?.logos ?? {}).flatMap(([k, e]) => [k, e.name, ...(e.keys ?? [])].map(slug)));
  const drawn = new Set();
  for (const mm of allSrc.matchAll(/<Brand(?:Tile)?\b[^>]*?\bname=["']([a-z0-9 .+-]+)["'][^>]*>/gi)) if (!/\bfile=/.test(mm[0]) && !known.has(slug(mm[1]))) drawn.add(mm[1]);
  if (shown.length || drawn.size) console.log('\n## Marks\n');
  for (const [, e] of shown) {
    const f = e.files?.mark ?? Object.values(e.files ?? {})[0] ?? {};
    console.log(`- ${e.name}: trademark of ${e.owner ?? 'its owner'}; mark file from ${f.from ?? 'an open collection'}${f.url ? ` (${f.url})` : ''}. Shown to say the product works with it.`);
  }
  for (const n of drawn) console.log(`- ${n}: trademark of its owner; mark drawn from Simple Icons (path data CC0, https://simpleicons.org). Shown to say the product works with it.`);
} else {
  const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  console.log(head.slice(1, head.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
}
