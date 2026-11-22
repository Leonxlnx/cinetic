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
//   node scripts/sfx.mjs credits                    print the CREDITS.md block for every sound and track used
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
      console.error(`unknown id ${id} (node scripts/sfx.mjs list <role>)`);
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
  if (!list.length) throw new Error(`no good sounds for role ${role}`);
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
  // start on a bar: the first downbeat (a multiple of 4 beats from the first detected beat) at or after the point it gets going
  let st = t?.good_from_s ?? 0;
  if (t?.bpm_measured && t.first_beat_s !== undefined && t.first_beat_s !== null) {
    const bar = (60 / t.bpm_measured) * 4;
    st = +(t.first_beat_s + Math.ceil((st - t.first_beat_s) / bar) * bar).toFixed(2);
  }
  idx[name].startFrom = st;
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  console.log(`use: <Music src="music/${name}${ext}" startFrom={${st}} />` + (t?.bpm_measured ? `  (starts on a bar; beat grid in the film: beats(${t.bpm_measured}, 0) when the bed starts at frame 0)` : ''));
} else if (cmd === 'credits') {
  const all = readJson(path.join(film, 'public', 'sfx', 'sfx.json'), {});
  // only the sounds the film's code actually plays (sfx['id'] in src/)
  const used = new Set();
  const walk = (d) => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'kit') walk(p); }
      else if (/\.(tsx?|jsx?)$/.test(e.name) && e.name !== 'sfx.ts') for (const m of fs.readFileSync(p, 'utf8').matchAll(/sfx\[['"]([^'"]+)['"]\]/g)) used.add(m[1]);
    }
  };
  walk(path.join(film, 'src'));
  const s = Object.fromEntries(Object.entries(all).filter(([id]) => used.size === 0 || used.has(id)));
  const m = readJson(path.join(film, 'public', 'music', 'music.json'), {});
  console.log('## Sound\n');
  for (const [name, t] of Object.entries(m))
    console.log(`- Music: "${t.title ?? name}"${t.artist ? ` by ${t.artist}` : ''} (${t.page}). Licence: ${t.licence} ${t.licenceUrl ?? LICENCE_URLS[t.licence] ?? ''}${t.credit ? `\n  Credit (required, keep it in the video description): ${t.credit}` : ''}`);
  for (const [, x] of Object.entries(s)) console.log(`- Sound: "${x.title}" (${x.page}). Licence: ${x.licence} ${LICENCE_URLS[x.licence] ?? ''}`);
  // photos, footage and marks recorded by assets.mjs and logos.mjs
  const pics = readJson(path.join(film, 'assets', 'licences.json'), readJson(path.join(film, 'public', 'assets', 'licences.json'), null));
  if (pics) {
    console.log('\n## Pictures\n');
    for (const p of Array.isArray(pics) ? pics : Object.values(pics.items ?? pics)) if (p && typeof p === 'object') console.log(`- ${p.title ?? p.file ?? p.name ?? 'picture'}${p.author ? ` by ${p.author}` : ''} (${p.page ?? p.url ?? ''}). Licence: ${p.licence ?? p.license ?? ''}`);
  }
  const marks = readJson(path.join(film, 'public', 'logos', 'logos.json'), null);
  if (marks?.logos) {
    console.log('\n## Marks\n');
    for (const [, e] of Object.entries(marks.logos)) console.log(`- ${e.name}: trademark of ${e.owner ?? 'its owner'}; file from ${e.source ?? e.collection ?? 'an open collection'} (${e.licence ?? ''}). Used to show the product works with it.`);
  }
} else {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
}
