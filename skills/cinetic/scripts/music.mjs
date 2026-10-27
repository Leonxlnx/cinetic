#!/usr/bin/env node
/**
 * music.mjs: find the film's track (and, where the earshot bank is weak, a real sound effect) in free
 * catalogs whose licence needs no credit, audition a few, download one with its licence record.
 *
 * Every film gets a track chosen for its own mood and pace, never the last film's track and never the same
 * handful of files. This searches the catalogs by mood, genre, tempo and length, reads each candidate's
 * energy curve from the catalog's own waveform data, keeps a per-user history so the same track is never
 * offered first twice in a row, downloads the chosen file into the film and writes the licence record the
 * sound route expects (audio/music/<name>.licence.json, the record of `track.py add`).
 *
 *   node scripts/music.mjs search --mood "<words>" [--bpm 118-128] [--length 30] [--kind music|sfx]
 *        [--source all|mixkit|commons|ccmixter|openverse[,...]] [--limit 8] [--pages 4] [--out out/music/search.json]
 *        [--json] [--no-history]
 *   node scripts/music.mjs sheet [results.json] [--pick 1,2,3] [--measure] [--json]
 *   node scripts/music.mjs get <#n|<source>:<id>> --to <film>/audio/music [--from results.json] [--name stem]
 *        [--film <dir>] [--no-history]
 *   node scripts/music.mjs history [--json]          node scripts/music.mjs licences
 *
 * search    reads the catalog pages the words name (a genre such as "tech house", a mood such as "calm" or
 *           "driving", an instrument, or Mixkit's own search for any other word; a few house synonyms:
 *           "precise" reads as mechanical and minimal), then ranks the tracks: the words their tags match,
 *           length (never shorter than the film; at least 1.5 times it, so the best bars and a natural
 *           ending both fit), tempo (--bpm; Mixkit states none: a tempo measured before, else the genre's usual
 *           range, marked "estimated"), and the energy curve (a break followed by an entry for the reveal,
 *           contrast; a flat track loses). The last film's track is held back, tracks of the five films
 *           before lose ground, so do the tracks of assets/music/shortlist.json (the example films used them), and the first track offered is never the one offered first by the previous
 *           search (~/.cinetic/music-history.json, or $CINETIC_HOME). Writes the results (out/music/).
 *           --kind sfx searches Mixkit's free sound effects the same way (by category words: whoosh, paper,
 *           click, camera, lock, thud ...), for an action the earshot bank sounds weakly (references/sound.md).
 *           --source picks the catalogs (default all that serve the kind: music from Mixkit, Wikimedia
 *           Commons and ccMixter; effects from Mixkit and Openverse); a catalog that cannot be used answers
 *           with its reason and is never requested.
 * sheet     the candidates as a list: mood, tempo, length, the energy curve (a strip of levels over the
 *           track), the intro, breaks with their entries, the ending, the contrast. --measure downloads the
 *           picked ones (default the first three) into a temporary folder, measures a quick tempo (and, for a
 *           catalog without waveform data, the energy curve) from the audio (ffmpeg decodes it), keeps the
 *           tempo (~/.cinetic/music-tempo.json) and deletes the file.
 *           The full analysis is still `track.py analyze` on the track you keep.
 * get       downloads the full file (never a preview, except an Openverse effect whose origin serves only
 *           one: noted) into the film's audio/music/ (audio/sfx/ for an effect), reads the item's licence
 *           again (Mixkit's licence page; for a CC0 item its own page or record) and refuses when it changed,
 *           and writes <name>.licence.json: file, sha256, bytes, title, artist, source, page, file_url, the
 *           licence and its quote as read now (licence_seen), credit (none required), limits. The track
 *           becomes the film's in the history, so the next film's search holds it back. Then: track.py analyze.
 * history   the searches and the tracks films used. licences: the licences known, as read on their pages.
 *
 * Catalogs (each licence read on its own page; a catalog is used only when a script may search it and
 * download the item without a login or a bot check, and its licence allows a commercial film with no credit):
 *   mixkit    Mixkit: free stock music and free sound effects (Mixkit Stock Music Free License, Mixkit Sound
 *             Effects Free License); the item's licence is read from the page it is listed on.
 *   commons   Wikimedia Commons: audio files whose own page says CC0 with no attribution required (the API's
 *             file metadata); anything else on Commons is refused.
 *   ccmixter  ccMixter: uploads under CC0 only (its query API); a cappellas and vocals refused.
 *   openverse Openverse: its audio index, CC0 only (anonymous API, 20 requests a minute; Openverse does not
 *             verify licences, so get reads the item's own page again). Made using Openverse, not endorsed or
 *             certified by Openverse.
 * Not used, with the reason each answers (`licences` lists them): Pixabay Music and Chosic (a bot check),
 * Free Music Archive (its download needs a login), YouTube Audio Library (a login), Uppbeat's free plan (a
 * credit, and a paid plan for commercial work), freepd.com (closed), the Internet Archive (its terms grant
 * access for scholarship and research), CC BY catalogs (a credit). Download such a track from its page
 * yourself where its licence allows it and record it with `track.py add`. A track whose listing names
 * another licence, or a vocal, is refused.
 *
 * Needs Node 18+ (built-in fetch); ffmpeg for sheet --measure. No API keys.
 * Exit codes: 0 done, 1 nothing usable, a refused licence or a failed download, 2 bad arguments.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const UA = 'cinetic-music/1.2 (film music search; +https://github.com/Leonxlnx/cinetic)';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------ licences
/** The licences the finder may download under, each read once on its own page (quote, url, date). */
export const LICENCES = {
  'mixkit-music': {
    name: 'Mixkit Stock Music Free License', url: 'https://mixkit.co/license/#musicFree', credit: false, kind: 'music',
    limits: 'web, social, ads and VOD; no TV or radio broadcast, CD/DVD or video games; never remix it into a music-only track, redistribute the file or register it with a rights service',
    seen: { quote: 'Items under the Mixkit Stock Music Free License can be used in your commercial and non-commercial projects for free.',
      url: 'https://mixkit.co/license/modal/musicFree/', date: '2026-10-26' },
    notice: /Mixkit Stock Music Free License/i,
  },
  'mixkit-sfx': {
    name: 'Mixkit Sound Effects Free License', url: 'https://mixkit.co/license/#sfxFree', credit: false, kind: 'sfx',
    limits: 'inside a larger work only (a film, a video, a broadcast); never redistribute the file on its own, as stock or in a template; never register it with a rights service',
    seen: { quote: 'Items under the Mixkit Sound Effects Free License can be used in your commercial and non-commercial projects for free.',
      url: 'https://mixkit.co/license/modal/sfxFree/', date: '2026-10-26' },
    notice: /data-license="sfxFree"|free sound effects license|Sound Effects Free License/i,
  },
  cc0: {
    name: 'CC0 1.0 Universal (public domain dedication)', url: 'https://creativecommons.org/publicdomain/zero/1.0/', credit: false, kind: 'any',
    limits: 'never imply that the author endorses the film; rights the dedication does not cover (trademarks, a person\'s publicity) stay with their holders; the item\'s own page is the proof, read again before every download',
    seen: { quote: 'You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/', date: '2026-10-27' },
    notice: /publicdomain\/zero|\bcc0\b|cc-zero|creative commons (?:zero|0)\b/i,
  },
};
/**
 * Catalogs: what the finder reads (kinds, the licence ids it takes from each) and the ones it cannot, each
 * with the reason found when its pages were read (2026-10-27): no request is ever made to those.
 */
export const SOURCES = {
  mixkit: { name: 'Mixkit', kinds: ['music', 'sfx'], licences: ['mixkit-music', 'mixkit-sfx'], reachable: true },
  commons: { name: 'Wikimedia Commons', kinds: ['music', 'sfx'], licences: ['cc0'], reachable: true },
  ccmixter: { name: 'ccMixter', kinds: ['music'], licences: ['cc0'], reachable: true },
  openverse: { name: 'Openverse', kinds: ['sfx', 'music'], licences: ['cc0'], reachable: true, defaultFor: ['sfx'],
    note: 'made using Openverse, not endorsed or certified by Openverse' },
  pixabay: { name: 'Pixabay Music', kinds: ['music'], reachable: false,
    why: 'pixabay.com answers scripts with a bot check (HTTP 403, "Just a moment...") and the Pixabay API serves images and video, not music; download from the track\'s page yourself and record it with track.py add (Pixabay Content License, no credit)' },
  fma: { name: 'Free Music Archive', kinds: ['music'], reachable: false,
    why: 'its download link answers with a login page (HTTP 302 to /login); CC0 albums it hosted are often on Wikimedia Commons too (--source commons)' },
  chosic: { name: 'Chosic', kinds: ['music'], reachable: false, why: 'chosic.com answers scripts with a bot check (HTTP 403, "Just a moment...")' },
  uppbeat: { name: 'Uppbeat', kinds: ['music'], reachable: false,
    why: 'the free plan needs an account and a credit in the description, and company, client or advertising work needs a paid plan' },
  youtube: { name: 'YouTube Audio Library', kinds: ['music'], reachable: false, why: 'it sits inside YouTube Studio behind a Google login' },
  freepd: { name: 'FreePD', kinds: ['music'], reachable: false, why: 'freepd.com has closed (its home page says so)' },
  archive: { name: 'Internet Archive', kinds: ['music', 'sfx'], reachable: false,
    why: 'its terms grant access to the collections for scholarship and research, and an item\'s licence is only its uploader\'s claim' },
};
/** The catalogs a search reads when --source is all (or not given). */
export const defaultSources = (kind) => Object.entries(SOURCES)
  .filter(([id, s]) => s.reachable && s.kinds.includes(kind) && (!s.defaultFor || s.defaultFor.includes(kind))).map(([id]) => id);
/** --source to catalog ids: "all", one id or a list ("mixkit,commons"); an unusable one is returned apart, with its reason. */
export function sourcesFor(value, kind = 'music') {
  const v = String(value || 'all').toLowerCase().trim();
  if (v === 'all') return { use: defaultSources(kind), refused: [] };
  const use = [], refused = [];
  for (const id of v.split(/[\s,]+/).filter(Boolean)) {
    const s = SOURCES[id];
    if (!s) throw new Usage(`unknown --source ${id}: ${Object.keys(SOURCES).filter((k) => SOURCES[k].reachable).join(', ')} or all`);
    if (!s.reachable) refused.push({ id, name: s.name, why: s.why });
    else if (!s.kinds.includes(kind)) throw new Usage(`--source ${id} serves ${s.kinds.join(' and ')}, not ${kind}`);
    else if (!use.includes(id)) use.push(id);
  }
  return { use, refused };
}

// ------------------------------------------------------------------------------------------------ the catalog's words
/** Mixkit's music moods, genres and instruments (the slugs of its listing pages). */
export const MOODS = ['affectionate', 'aggressive', 'anxious', 'atmospheric', 'beautiful', 'calm', 'carefree', 'cautious', 'cheerful', 'confident',
  'contented', 'dangerous', 'dark', 'determined', 'dramatic', 'dreamy', 'driving', 'dynamic', 'eerie', 'elegant', 'emotional', 'energetic', 'epic',
  'ethereal', 'euphoric', 'exciting', 'festive', 'friendly', 'fun', 'futuristic', 'glamorous', 'glorious', 'graceful', 'happy', 'hectic', 'heroic',
  'hopeful', 'hypnotic', 'innocent', 'insistent', 'joyful', 'lazy', 'lighthearted', 'lively', 'magical', 'majestic', 'mechanical', 'meditative',
  'melancholic', 'mellow', 'mischievous', 'motivating', 'mysterious', 'mystical', 'neutral', 'nostalgic', 'ominous', 'passionate', 'peaceful',
  'playful', 'positive', 'powerful', 'propulsive', 'proud', 'quirky', 'reflective', 'relaxed', 'restless', 'romantic', 'sad', 'serene', 'serious',
  'smooth', 'sombre', 'soothing', 'stealth', 'suspenseful', 'tender', 'tension', 'triumphant', 'upbeat', 'uplifting', 'warm', 'whimsical'];
export const GENRES = ['acid-jazz', 'ambient', 'atmospheres', 'breakbeat', 'chillout', 'chiptune', 'cinematic', 'classical', 'corporate-music', 'dance-pop',
  'deep-house', 'disco', 'downtempo', 'dream-pop', 'drum-and-bass', 'dubstep', 'easy-listening', 'edm', 'electro-house', 'electronic', 'electronica',
  'electropop', 'film-score', 'folk', 'folktronica', 'funk', 'future-bass', 'hip-hop', 'house', 'indie-folk', 'indie-pop', 'jazz', 'jazz-funk', 'lo-fi-beats',
  'lounge', 'minimalism', 'neo-soul', 'new-age', 'nu-jazz', 'orchestral-hybrid', 'orchestral-pop', 'percussion-trailer', 'pop', 'post-rock', 'rhythmic-underscore',
  'rock', 'soul', 'synthpop', 'synthwave', 'tech-house', 'techno', 'trailer-music', 'trance', 'trap', 'tropical-house', 'underscore', 'world-fusion'];
export const INSTRUMENTS = ['acoustic-guitar', 'bass', 'bells', 'brass', 'cello', 'drums', 'electric-guitar', 'flute', 'harp', 'keyboard', 'mallets', 'organ',
  'percussion', 'piano', 'plucked', 'rhodes', 'saxophone', 'strings', 'synth', 'trumpet', 'violin', 'woodwinds', 'xylophone'];
/** Mixkit's sound-effect categories the film actions use (references/sound.md, the action table). */
export const SFX_CATEGORIES = ['camera', 'click', 'ding', 'drop', 'glass', 'hit', 'impact', 'interface', 'key', 'keyboard', 'laptop', 'lock', 'metal', 'mouse',
  'notification', 'page', 'paper', 'pop', 'slide', 'sweep', 'swell', 'swish', 'swoosh', 'tap', 'technology', 'thud', 'transition', 'type', 'typewriter', 'whoosh',
  'wood', 'woosh', 'zoom'];
/** House words read as catalog words (a brief speaks in personality, the catalog in moods and genres). */
export const SYNONYMS = {
  precise: ['mechanical', 'minimalism'], exact: ['mechanical', 'minimalism'], minimal: ['minimalism'], techy: ['futuristic', 'electronic'],
  tech: ['futuristic', 'electronic'], crisp: ['driving', 'tech-house'], punchy: ['energetic', 'driving'], fast: ['energetic', 'driving'],
  confident: ['confident'], bright: ['upbeat', 'positive'], friendly: ['friendly', 'cheerful'], literary: ['reflective', 'calm'],
  unhurried: ['calm', 'relaxed'], soft: ['calm', 'mellow'], gentle: ['calm', 'tender'], expensive: ['elegant', 'minimalism'], premium: ['elegant'],
  raw: ['mechanical', 'aggressive'], machine: ['mechanical'], machined: ['mechanical'], stepped: ['mechanical'], dry: ['minimalism'],
  groove: ['funk', 'house'], bouncy: ['playful', 'upbeat'], warm: ['warm'], night: ['dark', 'atmospheric'], tense: ['tension', 'suspenseful'],
  launch: ['upbeat', 'motivating'], corporate: ['corporate-music'], chill: ['chillout'], lofi: ['lo-fi-beats'],
  // effects
  whooshes: ['whoosh'], swipe: ['swish', 'swoosh'], card: ['paper', 'slide'], shutter: ['camera'], snap: ['camera', 'click'], toggle: ['click', 'interface'],
  switch: ['click', 'interface'], button: ['click', 'interface'], typing: ['keyboard', 'type'], keys: ['keyboard'], landing: ['thud', 'hit'],
  logo: ['impact', 'hit'], ui: ['interface', 'click'],
};
/** Usual tempo ranges of Mixkit genres (BPM), for a track nobody has measured yet: "estimated". */
export const TEMPO_PRIORS = {
  'tech-house': [120, 128], 'deep-house': [118, 125], house: [120, 128], 'electro-house': [124, 130], 'tropical-house': [100, 115], techno: [124, 135],
  trance: [128, 140], edm: [124, 130], 'drum-and-bass': [160, 178], dubstep: [138, 145], 'future-bass': [130, 160], breakbeat: [120, 140], synthwave: [80, 118],
  synthpop: [100, 125], electropop: [100, 128], 'dance-pop': [108, 128], pop: [95, 125], 'indie-pop': [100, 130], chillout: [80, 110], downtempo: [80, 105],
  'lo-fi-beats': [70, 92], 'hip-hop': [80, 100], trap: [130, 150], cinematic: [70, 120], 'corporate-music': [95, 125], funk: [95, 120], disco: [110, 125],
  lounge: [90, 115], electronic: [100, 130], electronica: [90, 125], minimalism: [90, 125], 'rhythmic-underscore': [100, 125], underscore: [80, 120],
  'trailer-music': [80, 130], 'percussion-trailer': [90, 130], rock: [100, 140], 'nu-jazz': [90, 125], 'acid-jazz': [95, 120], 'jazz-funk': [95, 120],
};
const VOCAL = /\b(vocals?|voice|vocal|singing|singer|choir|rap|spoken|lyrics?)\b/i;
/** Effects whose names promise decoration a film's UI sound never wants (the house bans laser zaps and game blips). */
const DECOR = /\b(fire|laser|magic|magical|fairy|spell|spellcaster|ghost|cartoon|arcade|game|sci-?fi|horror|monster|zombie|explosion|gun|sword)\b/i;
const SKIP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'and', 'or', 'for', 'with', 'from', 'to', 'by', 'music', 'track', 'song']);

export const words = (q) => String(q || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !SKIP.has(w));
export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const mmss = (s) => (s == null ? '?' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
export function text(v) {
  return String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&#8217;/g, '\'').replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

/**
 * The listing pages a query names, in reading order: genres (also two words joined: "tech house"), moods,
 * instruments, then the catalog's own search for a word that names none. {url, what, slug}
 */
export function pagesFor(query, kind = 'music') {
  const ws = words(query);
  const out = []; const seen = new Set();
  const add = (url, what, s) => { if (!seen.has(url)) { seen.add(url); out.push({ url, what, slug: s }); } };
  if (kind === 'sfx') {
    const base = 'https://mixkit.co/free-sound-effects/';
    for (const w of ws) {
      const cats = [w, ...(SYNONYMS[w] || [])].filter((c) => SFX_CATEGORIES.includes(c));
      if (cats.length) cats.forEach((c) => add(`${base}${c}/`, 'category', c));
      else add(`${base}discover/${slug(w)}/`, 'search', slug(w));
    }
    return out;
  }
  const base = 'https://mixkit.co/free-stock-music/';
  const used = new Set();
  for (let i = 0; i + 1 < ws.length; i++) {
    const pair = `${ws[i]}-${ws[i + 1]}`;
    if (GENRES.includes(pair)) { add(`${base}${pair}/`, 'genre', pair); used.add(i); used.add(i + 1); }
  }
  const later = [];
  ws.forEach((w, i) => {
    if (used.has(i)) return;
    const cands = [w, ...(SYNONYMS[w] || [])];
    let hit = false;
    for (const c of cands) {
      if (GENRES.includes(c)) { add(`${base}${c}/`, 'genre', c); hit = true; }
      else if (MOODS.includes(c)) { add(`${base}mood/${c}/`, 'mood', c); hit = true; }
      else if (INSTRUMENTS.includes(c)) { later.push([`${base}instrument/${c}/`, 'instrument', c]); hit = true; }
    }
    if (!hit) later.push([`${base}discover/${slug(w)}/`, 'search', slug(w)]);
  });
  [...later.filter((x) => x[1] === 'instrument'), ...later.filter((x) => x[1] !== 'instrument')].forEach(([u, w, s]) => add(u, w, s));
  return out;
}

// ------------------------------------------------------------------------------------------------ parsing
const attr = (chunk, name) => (chunk.match(new RegExp(`${name}="([^"]*)"`)) || [])[1] || '';
/** "1:54" -> 114 */
export const seconds = (s) => { const m = String(s || '').trim().match(/^(\d+):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
/** ISO 8601 "PT1M54S" -> 114 */
export const isoSeconds = (s) => { const m = String(s || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/); return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : null; };

/** The JSON-LD records of a listing page, by the item id in their file URL: {id: {notice, genre, seconds, published}} */
export function parseLd(html) {
  const out = {};
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (!o || typeof o !== 'object') return;
      if (o.copyrightNotice && o.url) {
        const id = (String(o.url).match(/\/(?:music|sfx)\/(\d+)\//) || [])[1];
        if (id) out[id] = { notice: o.copyrightNotice, genre: o.genre || null, seconds: isoSeconds(o.duration), published: o.datePublished || null, artist: o.byArtist || null };
      }
      Object.values(o).forEach(walk);
    };
    walk(j);
  }
  return out;
}

/**
 * One Mixkit listing page (music or sound effects) to items: id, title, artist, tags by family, length, the
 * full file's URL, its waveform data and the licence the page names for it.
 */
export function parseMixkit(html, pageUrl = '', kind = 'music') {
  const ld = parseLd(html);
  const pageSfxLicence = kind === 'sfx' && LICENCES['mixkit-sfx'].notice.test(html);
  const out = []; const seen = new Set();
  for (const chunk of html.split('<div class="item-grid__item">').slice(1)) {
    const id = attr(chunk, 'data-audio-player-item-id-value');
    const type = attr(chunk, 'data-audio-player-item-type-value');
    if (!id || seen.has(id) || (type && type !== kind)) continue;
    seen.add(id);
    const title = text((chunk.match(/<h2 class="item-grid-card__title">([\s\S]*?)<\/h2>/) || [])[1]);
    const artist = text((chunk.match(/__author">\s*by ([\s\S]*?)<\/p>/) || [])[1]) || ld[id]?.artist || null;
    const tags = { genre: [], mood: [], instrument: [], tag: [], category: [] };
    for (const m of chunk.matchAll(/class="meta-links__link"[^>]*href="(\/free-(?:stock-music|sound-effects)\/[^"]+)"[^>]*>([^<]*)</g)) {
      const href = m[1]; const label = text(m[2]).toLowerCase();
      const p = href.split('/').filter(Boolean);
      if (p[0] === 'free-sound-effects') tags.category.push(p[1]);
      else if (p[1] === 'mood') tags.mood.push(p[2]);
      else if (p[1] === 'instrument') tags.instrument.push(p[2]);
      else if (p[1] === 'tag') tags.tag.push(p[2]);
      else if (p.length === 2) tags.genre.push(p[1]);
      else tags.tag.push(slug(label));
    }
    const dur = seconds(text((chunk.match(/data-test-id="duration">([\s\S]*?)<\/div>/) || [])[1])) ?? ld[id]?.seconds ?? null;
    const notice = ld[id]?.notice || null;
    let licence = 'unknown';
    if (kind === 'music') licence = notice && LICENCES['mixkit-music'].notice.test(notice) && !/restricted/i.test(notice) ? 'mixkit-music' : 'unknown';
    else licence = pageSfxLicence ? 'mixkit-sfx' : 'unknown';
    const fileUrl = kind === 'music' ? `https://assets.mixkit.co/music/${id}/${id}.mp3` : `https://assets.mixkit.co/active_storage/sfx/${id}/${id}.wav`;
    const it = { ref: `mixkit:${id}`, source: 'mixkit', id, kind, title, artist, genre: tags.genre[0] || (ld[id]?.genre ? slug(ld[id].genre) : null), tags, seconds: dur,
      file_url: fileUrl, preview_url: attr(chunk, 'data-audio-player-preview-url-value') || null, waveform_url: attr(chunk, 'data-audio-player-waveform-url-value') || null,
      page: pageUrl, licence, notice, published: ld[id]?.published || null, notes: [] };
    if (licence === 'unknown') it.notes.push(kind === 'music' ? 'the page names no Mixkit Stock Music Free License for it' : 'the page names no free sound effects licence');
    if (VOCAL.test([title, ...tags.tag, ...tags.instrument, ...tags.genre].join(' '))) { it.vocals = true; it.notes.push('tagged with a voice: refused (no lead vocal under on-screen text)'); }
    out.push(it);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the CC0 catalogs
/** The brief's words and their catalog synonyms, as plain search words ("tech-house" -> "tech house"), at most n. */
export function searchWords(query, n = 8) {
  const ws = words(query); const out = []; const used = new Set();
  const add = (c) => { const p = c.replace(/-/g, ' '); if (!out.includes(p)) out.push(p); };
  for (let i = 0; i + 1 < ws.length; i++) if (GENRES.includes(`${ws[i]}-${ws[i + 1]}`)) { add(`${ws[i]}-${ws[i + 1]}`); used.add(i); used.add(i + 1); }
  ws.forEach((w, i) => { if (!used.has(i)) [w, ...(SYNONYMS[w] || [])].forEach(add); });
  return out.slice(0, n);
}
/** Not a film track whatever its licence: speech, a pronunciation, an anthem, a hymn, a ringtone. */
const UNFIT = /\b(pronunciation|spoken|speech|anthem|hymn|national|ringtone|poem|poetry|interview|lecture|audiobook)\b/i;
const audioExt = (u) => (String(u || '').split('?')[0].match(/\.(mp3|ogg|oga|opus|wav|flac|m4a)$/i) || [])[1]?.toLowerCase() || null;

export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const II_META = 'LicenseShortName|License|LicenseUrl|UsageTerms|AttributionRequired|Artist|ImageDescription|Categories';
const commonsQuery = (extra) => `${COMMONS_API}?${new URLSearchParams({ action: 'query', ...extra, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata|mediatype',
  iiextmetadatafilter: II_META, format: 'json', formatversion: '2' })}`;
/** Commons' search for CC0 audio files: the words joined by OR (its search ANDs plain words), "music" for a track. */
export function commonsUrl(query, kind = 'music', limit = 40) {
  const ws = searchWords(query).map((w) => (w.includes(' ') ? `"${w}"` : w));
  const q = `filetype:audio incategory:"CC-Zero"${kind === 'music' ? ' music' : ''}${ws.length ? ` (${ws.join(' OR ')})` : ''}`;
  return commonsQuery({ generator: 'search', gsrsearch: q, gsrnamespace: '6', gsrlimit: String(limit) });
}
export const commonsFileUrl = (pageid) => commonsQuery({ pageids: String(pageid) });

/**
 * Commons API answers (generator=search or pageids, imageinfo with extmetadata) to items. CC0 only: the file's
 * own page must say CC0 with no attribution required; anything else is "unknown" and refused. Genres from its
 * categories ("Electronic music from Free Music Archive" -> electronic).
 */
export function parseCommons(json, kind = 'music') {
  const pages = json?.query?.pages || [];
  const out = [];
  for (const p of (Array.isArray(pages) ? pages : Object.values(pages)).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    const ii = p?.imageinfo?.[0];
    if (!ii || (ii.mediatype && ii.mediatype !== 'AUDIO')) continue;
    const m = ii.extmetadata || {};
    const v = (k) => text(m[k]?.value);
    const cats = String(m.Categories?.value || '').split('|').filter(Boolean);
    const short = v('LicenseShortName'), lic = v('License'), attr = v('AttributionRequired').toLowerCase();
    const cc0 = (/^cc0\b/i.test(short) || /^cc0$/i.test(lic)) && attr === 'false';
    const fname = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '');
    const parts = fname.match(/^(.+?) - (?:\d+\s*-\s*)?(.+)$/);
    const genres = [...new Set(cats.map((c) => (c.match(/^(.+?) music from /i) || [])[1]).filter(Boolean).map(slug))];
    const tags = { genre: genres, mood: [], instrument: [], tag: cats.map(slug).filter((c) => c !== 'cc-zero').slice(0, 12), category: kind === 'sfx' ? cats.map(slug).slice(0, 12) : [] };
    const it = { ref: `commons:${p.pageid}`, source: 'commons', id: String(p.pageid), kind, title: parts ? parts[2] : fname, artist: v('Artist') || (parts ? parts[1] : null),
      genre: genres[0] || null, tags, seconds: Number.isFinite(ii.duration) ? Math.round(ii.duration) : null, file_url: String(ii.url || '').split('?')[0] || null,
      page: ii.descriptionurl || null, licence: cc0 ? 'cc0' : 'unknown', notice: short ? `${short}${v('UsageTerms') ? `: ${v('UsageTerms')}` : ''} (attribution required: ${attr || 'not stated'})` : null,
      published: null, notes: [] };
    if (!cc0) it.notes.push(`its page names ${short || 'no licence'}${attr === 'true' ? ' with attribution' : ''}: only CC0 with no attribution is taken from Commons`);
    if (cats.some((c) => /license review needed/i.test(c))) it.notes.push('Commons has not reviewed its licence yet: the artist\'s own release names it too');
    if (VOCAL.test([it.title, ...cats].join(' ')) || cats.some((c) => /\bsongs?\b|singers?\b/i.test(c))) { it.vocals = true; it.notes.push('a voice (title or category): refused'); }
    if (UNFIT.test([it.title, ...cats].join(' '))) { it.unfit = true; it.notes.push('speech, an anthem or a hymn: not a film track'); }
    out.push(it);
  }
  return out;
}

const CCM_API = 'https://ccmixter.org/api/query';
/** ccMixter's query API, CC0 uploads only, the words matched by any. */
export function ccmixterUrl(query, { offset = 0, limit = 20 } = {}) {
  const p = new URLSearchParams({ f: 'json', lic: 'zero', limit: String(limit), offset: String(offset) });
  const ws = searchWords(query);
  if (ws.length) { p.set('search', ws.join(' ')); p.set('search_type', 'any'); }
  return `${CCM_API}?${p}`;
}
export const ccmixterUploadUrl = (id) => `${CCM_API}?${new URLSearchParams({ f: 'json', ids: String(id) })}`;
const CCM_VOICE = /^(acappella|a_cappella|male_vocals|female_vocals|vocals?|singing|spoken_word|rap|poetry|lyrics)$/;
const CCM_INSTR = { synthesizer: 'synth', synth: 'synth', piano: 'piano', guitar: 'electric-guitar', acoustic: 'acoustic-guitar', bass: 'bass', drums: 'drums', strings: 'strings', organ: 'organ', rhodes: 'rhodes' };

/** ccMixter query results to items: CC0 only, the audio file (mp3 first), length, tags, a stated tempo. */
export function parseCcmixter(arr) {
  const out = [];
  for (const u of Array.isArray(arr) ? arr : []) {
    const all = String(u.upload_tags || '').split(',').filter(Boolean);
    const user = String(u.upload_extra?.usertags || '').split(',').filter(Boolean);
    const files = (u.files || []).filter((f) => f?.file_format_info?.['media-type'] === 'audio' && f.download_url);
    const f = files.find((x) => /mp3/i.test(x.file_format_info?.['default-ext'] || x.file_nicname || '')) || files[0];
    if (!f) continue;
    const cc0 = /publicdomain\/zero/i.test(u.license_url || '');
    const range = all.map((t) => t.match(/^bpm_(\d+)_(\d+)$/)).find(Boolean);
    const stated = Number(u.upload_extra?.bpm);
    const tags = { genre: user.filter((t) => GENRES.includes(t.replace(/_/g, '-'))).map((t) => t.replace(/_/g, '-')), mood: user.filter((t) => MOODS.includes(t)),
      instrument: [...new Set(user.map((t) => CCM_INSTR[t]).filter(Boolean))], tag: user.map((t) => slug(t)), category: [] };
    const it = { ref: `ccmixter:${u.upload_id}`, source: 'ccmixter', id: String(u.upload_id), kind: 'music', title: text(u.upload_name), artist: text(u.user_real_name || u.user_name) || null,
      genre: tags.genre[0] || null, tags, seconds: seconds(f.file_format_info?.ps), file_url: f.download_url, page: u.file_page_url || null,
      licence: cc0 ? 'cc0' : 'unknown', notice: u.license_name ? `${u.license_name} (${u.license_url})` : null, published: null, notes: [] };
    if (stated >= 40 && stated <= 220) it.stated_bpm = stated; else if (range) it.stated_range = [Number(range[1]), Number(range[2])];
    if (!cc0) it.notes.push(`its licence is ${u.license_name || 'not stated'}: only CC0 is taken from ccMixter`);
    if (all.some((t) => CCM_VOICE.test(t)) || VOCAL.test(it.title)) { it.vocals = true; it.notes.push('a voice (its tags): refused'); }
    if (UNFIT.test(it.title) || all.includes('spoken_word')) { it.unfit = true; it.notes.push('speech or poetry: not a film track'); }
    if (/\b(presets?|loops?|samples?|hits|pack|stems|one.?shots?|kit)\b/i.test(it.title) || all.includes('loops')) { it.unfit = true; it.notes.push('a sample pack or loops, not a track'); }
    if (/\.zip$/i.test(f.download_url)) continue;
    out.push(it);
  }
  return out;
}

export const OPENVERSE_API = 'https://api.openverse.org/v1/audio/';
/** Openverse's audio search, CC0 only (its anonymous limit: 20 requests a minute; its length filter answered HTTP 500). */
export function openverseUrl(query, kind = 'sfx', pageSize = 20) {
  const p = new URLSearchParams({ q: searchWords(query, 6).join(' '), license: 'cc0', page_size: String(pageSize) });
  return `${OPENVERSE_API}?${p}`;
}
/** Openverse results (a search page, or one item) to items; a Freesound item's file is its public preview (noted). */
export function parseOpenverse(json, kind = 'sfx') {
  const rows = Array.isArray(json?.results) ? json.results : json?.id ? [json] : [];
  return rows.map((r) => {
    const tagNames = (r.tags || []).map((t) => slug(t.name || t)).filter(Boolean).slice(0, 15);
    const cc0 = String(r.license || '').toLowerCase() === 'cc0';
    const it = { ref: `openverse:${r.id}`, source: 'openverse', origin: r.source || r.provider || null, id: String(r.id), kind, title: text(r.title), artist: text(r.creator) || null,
      genre: (r.genres || [])[0] ? slug(r.genres[0]) : null, tags: { genre: (r.genres || []).map(slug), mood: [], instrument: [], tag: tagNames, category: kind === 'sfx' ? tagNames : [] },
      seconds: Number.isFinite(r.duration) ? Math.round(r.duration / 100) / 10 : null, file_url: r.url || null, page: r.foreign_landing_url || null,
      licence: cc0 ? 'cc0' : 'unknown', notice: r.license ? `${String(r.license).toUpperCase()} ${r.license_version || ''}`.trim() : null, published: null, notes: [] };
    if (!cc0) it.notes.push(`Openverse lists it as ${r.license || 'no licence'}: only CC0 is taken from Openverse`);
    if (it.origin === 'freesound') it.notes.push('the file is Freesound\'s public preview (an mp3 near 128 kbps; the original needs a Freesound account): fine for an effect, thin for a track');
    if (VOCAL.test([it.title, ...tagNames].join(' '))) { it.vocals = true; it.notes.push('a voice (title or tags): refused'); }
    if (UNFIT.test(it.title)) { it.unfit = true; it.notes.push('speech: not a film sound'); }
    return it;
  });
}

// ------------------------------------------------------------------------------------------------ energy
/**
 * A catalog waveform file ({sample_rate, samples_per_pixel, bits, length, channels, data: [min, max, ...]}) to the
 * track's energy: a curve of `bins` levels (dB), the intro, the breaks with their entries, the ending, the contrast.
 */
export function energyOf(wf, bins = 24) {
  if (!wf || !Array.isArray(wf.data) || !wf.length || !wf.sample_rate || !wf.samples_per_pixel) return null;
  const ch = Math.max(1, wf.channels || 1); const full = 2 ** ((wf.bits || 8) - 1);
  const n = Math.floor(wf.data.length / (2 * ch));
  const px = wf.samples_per_pixel / wf.sample_rate;
  const amp = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let a = 0;
    for (let c = 0; c < ch; c++) { const k = 2 * (i * ch + c); a = Math.max(a, Math.abs(wf.data[k]), Math.abs(wf.data[k + 1])); }
    amp[i] = a / full;
  }
  const db = (a) => 20 * Math.log10(Math.max(a, 1e-4));
  const secondsTotal = n * px;
  // a one-second smoothed level (RMS of the peaks), and the curve
  const w = Math.max(1, Math.round(1 / px));
  const smooth = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - (w >> 1)); j < Math.min(n, i + (w >> 1) + 1); j++) { s += amp[j] * amp[j]; c++; }
    smooth[i] = db(Math.sqrt(s / c));
  }
  const curve = [];
  for (let b = 0; b < bins; b++) {
    const a = Math.floor((b * n) / bins), z = Math.max(a + 1, Math.floor(((b + 1) * n) / bins));
    let s = 0; for (let i = a; i < z; i++) s += amp[i] * amp[i];
    curve.push(Math.round(db(Math.sqrt(s / (z - a))) * 10) / 10);
  }
  const sorted = (arr) => [...arr].sort((x, y) => x - y);
  const q = (arr, p) => { const s = sorted(arr); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))] : null; };
  const mid = Array.from(smooth).slice(Math.floor(n * 0.2), Math.max(Math.floor(n * 0.2) + 1, Math.floor(n * 0.85)));
  const body = q(mid, 0.5);
  let intro = 0;
  for (let i = 0; i < n; i++) { if (smooth[i] >= body - 3) { intro = i * px; break; } }
  // breaks: 1.5 s or more at least 5 dB under the body (gaps under 2 s merged), with the entry after each
  const lows = [];
  let start = -1;
  const a0 = Math.floor(n * 0.12), a1 = Math.floor(n * 0.9);
  for (let i = a0; i <= a1; i++) {
    const low = i < a1 && smooth[i] <= body - 5;
    if (low && start < 0) start = i;
    if (!low && start >= 0) { lows.push([start, i]); start = -1; }
  }
  const merged = [];
  for (const [a, z] of lows) {
    const last = merged.at(-1);
    if (last && (a - last[1]) * px < 2) last[1] = z; else merged.push([a, z]);
  }
  const breaks = [];
  for (const [a, z] of merged) {
    if ((z - a) * px < 1.5) continue;
    let entry = null;
    for (let j = z; j < Math.min(n, z + Math.round(4 / px)); j++) if (smooth[j] >= body - 1) { entry = j * px; break; }
    let depth = 0; for (let j = a; j < z; j++) depth = Math.max(depth, body - smooth[j]);
    breaks.push({ from: +(a * px).toFixed(1), to: +(z * px).toFixed(1), depth_db: +depth.toFixed(1), entry_s: entry == null ? null : +entry.toFixed(1) });
  }
  const tail = (s) => smooth[Math.max(0, Math.min(n - 1, Math.round(n - s / px)))];
  const steps = [15, 8, 3, 0.5].map(tail);
  const falling = steps.every((v, k) => k === 0 || steps[k - 1] - v >= 1.5);
  let ending = 'ring';
  if (falling && steps[0] - steps[3] >= 10 && body - steps[0] < 6) ending = 'fade';
  else if (body - steps[2] < 4 && steps[2] - steps[3] > 8) ending = 'button';
  const playing = Array.from(smooth).slice(0, Math.max(1, n - Math.round(3 / px)));
  const range = q(playing, 0.9) - q(playing, 0.1);
  return { seconds: +secondsTotal.toFixed(1), curve, body_db: +body.toFixed(1), intro_s: +intro.toFixed(1), breaks, ending, range_db: +range.toFixed(1) };
}

const BARS = '▁▂▃▄▅▆▇█';
/** The curve as a strip of eight levels (the quietest bin to the loudest). */
export function strip(curve) {
  if (!curve?.length) return '';
  const lo = Math.min(...curve), hi = Math.max(...curve);
  return curve.map((v) => BARS[hi - lo < 1e-9 ? 3 : Math.round(((v - lo) / (hi - lo)) * 7)]).join('');
}

/** Mono samples to the waveform data a catalog serves (min/max pairs every 50 ms, 16 bit), then energyOf: for a catalog without waveform data. */
export function energyFromPcm(pcm, sr, bins = 24) {
  const spp = Math.max(1, Math.round(sr * 0.05));
  const n = Math.floor(pcm.length / spp);
  if (n < 20) return null;
  const data = new Array(2 * n);
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = 0;
    for (let j = i * spp; j < (i + 1) * spp; j++) { const x = pcm[j]; if (x < lo) lo = x; if (x > hi) hi = x; }
    data[2 * i] = Math.round(Math.max(-1, lo) * 32767); data[2 * i + 1] = Math.round(Math.min(1, hi) * 32767);
  }
  return energyOf({ sample_rate: sr, samples_per_pixel: spp, bits: 16, channels: 1, length: n, data }, bins);
}

// ------------------------------------------------------------------------------------------------ tempo
/** "118-128" or "124" -> [lo, hi]; null for nothing */
export function bpmRange(v) {
  if (v === undefined || v === null || v === '') return null;
  const m = String(v).match(/^\s*(\d+(?:\.\d+)?)\s*(?:[-:]\s*(\d+(?:\.\d+)?))?\s*$/);
  if (!m) throw new Usage('--bpm is a tempo or a range such as 118-128');
  const a = Number(m[1]), b = m[2] ? Number(m[2]) : Number(m[1]);
  if (!(a >= 40 && b <= 220 && a <= b)) throw new Usage('--bpm must lie within 40-220, low to high');
  return m[2] ? [a, b] : [a - 2, a + 2];
}

/** The tempo the finder knows for an item: measured before (cache), else the genre's usual range. */
export function tempoOf(it, cache = {}) {
  const c = cache[it.ref];
  if (c && Number.isFinite(c.bpm)) return { value: c.bpm, kind: c.kind || 'measured' };
  if (Number.isFinite(it.stated_bpm)) return { value: it.stated_bpm, kind: 'stated' };
  if (Array.isArray(it.stated_range)) return { range: it.stated_range, kind: 'tagged', from: 'the uploader\'s tag' };
  for (const g of [it.genre, ...(it.tags?.genre || [])]) if (g && TEMPO_PRIORS[g]) return { range: TEMPO_PRIORS[g], kind: 'estimated', from: g };
  return { kind: 'unknown' };
}

/** A small real FFT (radix 2), magnitudes of the first n/2 bins. */
function fftMag(re) {
  const n = re.length; const im = new Float64Array(n); const x = Float64Array.from(re);
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [x[i], x[j]] = [x[j], x[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ur = x[i + k], ui = im[i + k];
        const vr = x[i + k + len / 2] * wr - im[i + k + len / 2] * wi, vi = x[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        x[i + k] = ur + vr; im[i + k] = ui + vi; x[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      }
    }
  }
  const out = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(x[i], im[i]);
  return out;
}

/**
 * A quick tempo from mono samples: spectral flux (512-point frames, hop 128), its autocorrelation over 60-200 BPM
 * weighted toward 120 (one octave either side), refined between lags, folded into 80-170 BPM (film music's usual span:
 * a half-time reading of a 124 BPM track reads 124). Good enough to shortlist; track.py measures.
 */
export function quickTempo(pcm, sr) {
  const N = 512, H = 128; const frames = Math.floor((pcm.length - N) / H);
  if (frames < 64) return null;
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  let prev = null; const flux = new Float64Array(frames);
  const buf = new Float64Array(N);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) buf[i] = pcm[f * H + i] * win[i];
    const mag = fftMag(buf);
    for (let i = 0; i < mag.length; i++) mag[i] = Math.log1p(1000 * mag[i]);
    if (prev) { let s = 0; for (let i = 1; i < mag.length; i++) s += Math.max(0, mag[i] - prev[i]); flux[f] = s; }
    prev = mag;
  }
  const mean = flux.reduce((a, b) => a + b, 0) / frames;
  for (let i = 0; i < frames; i++) flux[i] = Math.max(0, flux[i] - mean);
  const fps = sr / H;
  const ac = (lag) => { let s = 0; for (let i = lag; i < frames; i++) s += flux[i] * flux[i - lag]; return s / (frames - lag); };
  const lo = Math.floor((60 / 200) * fps), hi = Math.ceil((60 / 60) * fps);
  let best = null;
  for (let lag = lo; lag <= hi; lag++) {
    const bpm = (60 * fps) / lag;
    const w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 1.0) ** 2);
    const v = ac(lag) * w;
    if (!best || v > best.v) best = { lag, v };
  }
  if (!best) return null;
  const y0 = ac(best.lag - 1), y1 = ac(best.lag), y2 = ac(best.lag + 1);
  const d = y0 - 2 * y1 + y2;
  const lag = best.lag + (d !== 0 ? (0.5 * (y0 - y2)) / d : 0);
  let bpm = (60 * fps) / lag;
  while (bpm < 80) bpm *= 2;
  while (bpm > 170) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

// ------------------------------------------------------------------------------------------------ ranking
/** {score, why[]} of one item against the brief: the words, length, tempo, energy, history. */
export function scoreItem(it, want = {}) {
  const why = []; let s = 0;
  if (it.licence === 'unknown') return { score: -Infinity, why: ['no licence the finder can use'] };
  if (it.vocals) return { score: -Infinity, why: ['tagged with a voice'] };
  if (it.unfit) return { score: -Infinity, why: ['speech, an anthem or a hymn: not a film track'] };
  if (it.kind === 'music' && it.seconds != null && it.seconds < 30) return { score: -Infinity, why: [`${it.seconds} s: a sample or a bumper, not a track`] };
  const tagset = new Set([...(it.tags?.genre || []), ...(it.tags?.mood || []), ...(it.tags?.instrument || []), ...(it.tags?.tag || []),
    ...(it.tags?.category || []), ...words(it.title)]);
  const hits = [];
  for (const w of want.words || []) {
    const cands = [w, ...(SYNONYMS[w] || [])];
    const strong = cands.find((c) => (it.tags?.genre || []).includes(c) || (it.tags?.mood || []).includes(c) || (it.tags?.category || []).includes(c)
      || (it.found || []).includes(c));
    const weak = cands.find((c) => tagset.has(c));
    if (strong) { s += 2; hits.push(strong); } else if (weak) { s += 1; hits.push(weak); }
  }
  for (let i = 0; i + 1 < (want.words || []).length; i++) {
    const pair = `${want.words[i]}-${want.words[i + 1]}`;
    if ((it.tags?.genre || []).includes(pair)) { s += 2; hits.push(pair); }
  }
  if (hits.length) why.push(`matches ${[...new Set(hits)].join(', ')}`);
  if (it.kind === 'sfx') {
    if (DECOR.test([it.title, ...(it.tags?.category || [])].join(' '))) { s -= 2; why.push('decorated (fire, laser, magic, game ...): not a film UI sound'); }
    if (it.seconds != null) {
      if (it.seconds <= 1) { s += 0.5; why.push('short'); } else if (it.seconds > (want.maxS || 2)) { s -= 1; why.push(`${it.seconds} s: longer than an effect needs`); }
    }
  }
  const L = want.length;
  if (L && it.seconds != null && it.kind === 'music') {
    if (it.seconds < L + 4) return { score: -Infinity, why: [`${it.seconds} s: shorter than the film plus its ending`] };
    const r = it.seconds / L;
    if (r >= 1.5) { s += 1; why.push('long enough for the best bars and an ending'); }
  }
  if (want.bpm && it.kind === 'music') {
    const t = it.tempo || {};
    const [a, b] = want.bpm;
    if (t.value != null) {
      const inside = [t.value, t.value * 2, t.value / 2].some((v) => v >= a - 0.5 && v <= b + 0.5);
      s += inside ? 3 : -3; why.push(`${t.value} BPM ${t.kind}${inside ? ' fits' : ' outside the brief'}`);
    } else if (t.range) {
      const overlap = Math.min(b, t.range[1]) - Math.max(a, t.range[0]);
      s += overlap >= 0 ? 1.5 : -3; why.push(`${t.range[0]}-${t.range[1]} BPM estimated (${t.from})${overlap >= 0 ? '' : ': outside the brief'}`);
    } else why.push('tempo unknown');
  }
  if (it.kind === 'music' && want.shortlist?.has(it.ref)) { s -= 1.5; why.push('a shortlist track the example films used'); }
  const e = it.energy;
  if (e && it.kind === 'music') {
    const entry = (e.breaks || []).find((x) => x.entry_s != null && x.entry_s > 0.15 * e.seconds && x.entry_s < 0.8 * e.seconds);
    if (entry) { s += 1.5; why.push(`a break and an entry at ${mmss(entry.entry_s)} (a reveal)`); }
    if (e.range_db >= 5) { s += 1; why.push(`contrast ${e.range_db} dB`); } else if (e.range_db < 2.5) { s -= 1; why.push('flat energy'); }
  }
  return { score: Math.round(s * 100) / 100, why };
}

/** The home of the per-user files: $CINETIC_HOME, else ~/.cinetic. */
export const homeDir = (env = process.env) => env.CINETIC_HOME || path.join(os.homedir(), '.cinetic');
const histPath = (env) => path.join(homeDir(env), 'music-history.json');
const tempoPath = (env) => path.join(homeDir(env), 'music-tempo.json');
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const writeJson = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(o, null, 1)}\n`); };
export const readHistory = (env = process.env) => {
  const h = readJson(histPath(env), null);
  return h && h.history === 1 ? { searches: [], used: [], ...h } : { history: 1, searches: [], used: [] };
};
export const writeHistory = (h, env = process.env) => writeJson(histPath(env), { ...h, searches: h.searches.slice(-50), used: h.used.slice(-50) });

/** The Mixkit refs of assets/music/shortlist.json (tracks the example films used). */
export function shortlistRefs() {
  const sl = readJson(path.join(HERE, '..', 'assets', 'music', 'shortlist.json'), {});
  return new Set((sl.tracks || []).map((t) => (String(t.file_url || '').match(/assets\.mixkit\.co\/music\/(\d+)\//) || [])[1]).filter(Boolean).map((id) => `mixkit:${id}`));
}

/** Measured tempos: the shortlist's measured rows (by their Mixkit file id) and the user's own measurements. */
export function tempoCache(env = process.env) {
  const out = {};
  const sl = readJson(path.join(HERE, '..', 'assets', 'music', 'shortlist.json'), {});
  for (const t of sl.tracks || []) {
    const id = (String(t.file_url || '').match(/assets\.mixkit\.co\/music\/(\d+)\//) || [])[1];
    if (id && t.bpm?.kind === 'measured' && Number.isFinite(t.bpm.value)) out[`mixkit:${id}`] = { bpm: t.bpm.value, kind: 'measured' };
  }
  return { ...out, ...readJson(tempoPath(env), {}) };
}

/**
 * The history's rules on a ranked list: the last film's track is held back (never reused), the tracks of the
 * five films before lose 2 points, and the first offer never repeats the previous search's first offer.
 * Returns {items, held}.
 */
export function applyHistory(items, hist) {
  const used = (hist?.used || []).filter((u) => u.kind !== 'sfx');
  const last = used.at(-1)?.ref;
  const recent = new Set(used.slice(-6, -1).map((u) => u.ref));
  const held = [];
  let list = [];
  for (const it of items) {
    if (it.kind === 'music' && it.ref === last) { held.push({ ...it, why: [...(it.why || []), "your last film's track: held back"] }); continue; }
    if (it.kind === 'music' && recent.has(it.ref)) { it.score -= 2; it.why = [...(it.why || []), 'used by one of your recent films']; }
    list.push(it);
  }
  list = list.sort((a, b) => b.score - a.score || String(a.ref).localeCompare(String(b.ref)));
  const prevFirst = (hist?.searches || []).filter((s) => (s.kind || 'music') === (items[0]?.kind || 'music')).at(-1)?.first;
  if (list.length > 1 && list[0].ref === prevFirst) {
    const [a, b] = list; list[0] = b; list[1] = a;
    a.why = [...(a.why || []), 'offered first last time: second now'];
  }
  return { items: list, held };
}

/** The catalog's name as the record gives it ("Openverse (freesound)" for an Openverse item: where the file lives). */
export const sourceName = (it) => {
  const n = SOURCES[it.source || 'mixkit']?.name || String(it.source || 'Mixkit');
  return it.source === 'openverse' && it.origin ? `${n} (${it.origin})` : n;
};

/**
 * The licence record of a downloaded item (the record track.py add writes; references/music.md §3). seen is the
 * licence as read again now on the item's own page or record ({quote, url}); for a Mixkit item, the licence page.
 * A CC0 item also keeps the dedication's own sentence (licence_deed).
 */
export function licenceRecord(it, { file, sha256, bytes, date, seenQuote, seenUrl, query = null }) {
  const L = LICENCES[it.licence];
  if (!L) throw new Error(`${it.ref}: licence ${it.licence} is not one the finder may download under`);
  if (L.kind !== 'any' && L.kind !== it.kind) throw new Error(`${it.ref}: ${L.name} covers ${L.kind}, not ${it.kind}`);
  const music = it.kind === 'music';
  const src = sourceName(it);
  const cc0 = it.licence === 'cc0';
  if (cc0 && !(seenQuote && seenUrl)) throw new Error(`${it.ref}: a CC0 item's record needs its own page's licence as read now (seenQuote, seenUrl)`);
  const rec = {
    record: 1, kind: music ? 'music' : 'sfx', file, sha256, bytes, title: it.title, artist: it.artist || (music ? null : src), source: src,
    page: it.page, file_url: it.file_url, licence: L.name, licence_id: it.licence, licence_url: L.url, credit_required: false,
    credit: music ? `Music: "${it.title}" by ${it.artist || 'unknown'} (${src}${cc0 ? ', CC0' : ''})` : null,
    content_id: 'unknown', ai_generated: false, vocals: false, checked: date, certificate: null,
    licence_seen: { quote: seenQuote || L.seen.quote, url: seenUrl || L.seen.url, date },
    limits: L.limits, modifications: music ? 'edited at bar lines for the film; levels adjusted' : 'trimmed and levelled for the film',
    found: { by: 'music.mjs', query, listed_notice: it.notice || null, ai_marked: false, vocal_tags: false },
  };
  if (cc0) rec.licence_deed = { quote: L.seen.quote, url: L.seen.url, date: L.seen.date };
  if ((it.notes || []).length) rec.found.notes = it.notes;
  return rec;
}

// ------------------------------------------------------------------------------------------------ network
async function http(url, { ms = 40000, json = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html,*/*' }, signal: AbortSignal.timeout(ms), redirect: 'follow' }); }
    catch (e) {
      const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
      if (!timedOut && attempt < 2) { await sleep(800); continue; }
      throw new Error(timedOut ? `no answer within ${Math.round(ms / 1000)} s (${url})` : `could not connect (${e.cause?.code || 'network error'}) (${url})`);
    }
    if ([502, 503, 504].includes(r.status) && attempt < 2) { await sleep(1500); continue; }
    if (r.status === 429) { if (attempt < 3) { await sleep(8000 * attempt); continue; } throw new Error('rate limited (HTTP 429): wait a minute'); }
    if (r.status === 403) throw new Error(`refused (HTTP 403): the site answers scripts with a bot check (${url})`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status} (${url})`);
    const body = await r.text();
    if (!json) return body;
    if (!body.trim()) return undefined; // an empty answer (ccMixter gives one for a page it cannot encode)
    try { return JSON.parse(body); } catch { throw new Error(`not JSON (${url})`); }
  }
}

/**
 * A GET for a host whose answer carries headers larger than fetch accepts (ccMixter repeats its whole JSON answer
 * in an X-JSON header): node's https with a 1 MB header limit. {status, body}. Replaceable (tests: no network).
 */
export const transport = {
  large: (url, ms = 40000, hops = 0) => new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, maxHeaderSize: 1 << 20, timeout: ms }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && hops < 3) {
        res.resume(); resolve(transport.large(new URL(res.headers.location, url).href, ms, hops + 1)); return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`no answer within ${Math.round(ms / 1000)} s (${url})`)));
    req.on('error', (e) => reject(new Error(`could not connect (${e.code || e.message}) (${url})`)));
  }),
};
async function httpLarge(url) {
  const r = await transport.large(url);
  if (r.status === 404) return null;
  if (r.status === 403) throw new Error(`refused (HTTP 403) (${url})`);
  if (r.status === 429) throw new Error('rate limited (HTTP 429): wait a minute');
  if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status} (${url})`);
  if (!String(r.body || '').trim()) return undefined;
  try { return JSON.parse(r.body); } catch { throw new Error(`not JSON (${url})`); }
}

/** ccMixter serves a file only to a request that comes from its page (as a browser's click does): the item's page as referer. */
const refererOf = (it) => (it?.source === 'ccmixter' && it.page ? it.page : null);
async function download(url, dest, minBytes, referer = null) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}) }, signal: AbortSignal.timeout(180000), redirect: 'follow' });
  if (!r.ok) throw new Error(`download failed: HTTP ${r.status} (${url})`);
  const type = r.headers.get('content-type') || '';
  const buf = Buffer.from(await r.arrayBuffer());
  if (!/audio|octet-stream|application\/ogg/i.test(type) && !/^(ID3|RIFF|\xff[\xf2\xf3\xfa\xfb]|fLaC|OggS)/.test(buf.subarray(0, 4).toString('latin1'))) throw new Error(`not an audio file (${type || 'no type'}): ${url}`);
  if (buf.length < minBytes) throw new Error(`only ${buf.length} bytes: a preview or an error page, not the file (${url})`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return { bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

// ------------------------------------------------------------------------------------------------ commands
export class Usage extends Error {}
export function parseArgs(argv) {
  const VALUED = new Set(['mood', 'query', 'bpm', 'length', 'kind', 'limit', 'pages', 'out', 'pick', 'to', 'from', 'name', 'film', 'source']);
  const FLAGS = new Set(['json', 'measure', 'no-history', 'help']);
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') { args.help = true; continue; }
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const eq = a.indexOf('='); const k = a.slice(2, eq === -1 ? undefined : eq);
    if (VALUED.has(k)) {
      const v = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (v === undefined || v === '' || (eq === -1 && v.startsWith('--'))) throw new Usage(`--${k} needs a value`);
      args[k] = v;
    } else if (FLAGS.has(k)) args[k] = true;
    else throw new Usage(`unknown option --${k}`);
  }
  return args;
}
const num = (v, def, lo, hi, name) => {
  if (v === undefined) return def;
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new Usage(`--${name} must be a number from ${lo} to ${hi}`);
  return n;
};
const kindOf = (args) => { const k = String(args.kind || 'music').toLowerCase(); if (!['music', 'sfx'].includes(k)) throw new Usage('--kind is music or sfx'); return k; };

/** One catalog's candidates for a query: {items, urls, notes}. Network errors become notes (the other catalogs still answer). */
async function fetchSource(id, q, kind, pagesN) {
  const items = [], urls = [], notes = [];
  const get = async (u, json = true) => { urls.push(u); return http(u, { json }); };
  if (id === 'mixkit') {
    const map = new Map();
    for (const [k, p] of pagesFor(q, kind).slice(0, pagesN).entries()) {
      if (k) await sleep(400); // gentle on a site without an API
      let html = null;
      try { html = await get(p.url, false); } catch (e) { notes.push(`${p.url}: ${e.message}`); continue; }
      if (!html) { notes.push(`${p.url}: no such page`); continue; }
      // a card shows only some of its tags: the page it was listed on counts as one of them (found)
      for (const it of parseMixkit(html, p.url, kind)) {
        const had = map.get(it.ref);
        if (had) { if (!had.found.includes(p.slug)) had.found.push(p.slug); } else map.set(it.ref, { ...it, found: [p.slug] });
      }
    }
    items.push(...map.values());
  } else if (id === 'commons') {
    try { items.push(...parseCommons(await get(commonsUrl(q, kind)), kind)); } catch (e) { notes.push(`Wikimedia Commons: ${e.message}`); }
  } else if (id === 'ccmixter') {
    // pages of 20; an empty answer (a record the server cannot encode) is read again in fives, the broken five skipped
    for (let off = 0; off < 40; off += 20) {
      let got;
      const u = ccmixterUrl(q, { offset: off, limit: 20 }); urls.push(u);
      try { got = await httpLarge(u); } catch (e) { notes.push(`ccMixter: ${e.message}`); break; }
      if (got === undefined) {
        for (let o = off; o < off + 20; o += 5) {
          await sleep(250);
          let part; try { part = await httpLarge(ccmixterUrl(q, { offset: o, limit: 5 })); } catch { part = undefined; }
          if (Array.isArray(part)) items.push(...parseCcmixter(part)); else notes.push(`ccMixter: results ${o + 1}-${o + 5} could not be read`);
        }
        continue;
      }
      if (!Array.isArray(got) || !got.length) break;
      items.push(...parseCcmixter(got));
      if (got.length < 20) break;
      await sleep(300);
    }
  } else if (id === 'openverse') {
    try { items.push(...parseOpenverse(await get(openverseUrl(q, kind)), kind)); } catch (e) { notes.push(`Openverse: ${e.message}`); }
  }
  return { items, urls, notes };
}

export async function search(args, { env = process.env, log = console.log } = {}) {
  const kind = kindOf(args);
  const q = args.mood || args.query || args._.join(' ');
  if (!q.trim()) throw new Usage('search needs --mood "<words>" (for --kind sfx, the action in words: "paper slide", "camera shutter")');
  const { use, refused } = sourcesFor(args.source, kind);
  for (const r of refused) log(`${r.name}: not used: ${r.why}`);
  if (!use.length) return { items: [], held: [], unreachable: refused.map((r) => r.name).join(', '), refused };
  const want = { words: words(q), bpm: bpmRange(args.bpm), length: num(args.length, null, 1, 3600, 'length'), shortlist: shortlistRefs() };
  const limit = num(args.limit, 8, 1, 40, 'limit');
  const pagesN = num(args.pages, kind === 'sfx' ? 3 : 4, 1, 8, 'pages');
  const items = new Map(); const notes = []; const pages = [];
  for (const id of use) {
    const r = await fetchSource(id, q, kind, pagesN);
    pages.push(...r.urls); notes.push(...r.notes);
    for (const it of r.items) if (!items.has(it.ref)) items.set(it.ref, it);
  }
  const cache = tempoCache(env);
  let list = [...items.values()];
  for (const it of list) it.tempo = kind === 'music' ? tempoOf(it, cache) : null;
  for (const it of list) Object.assign(it, scoreItem(it, want));
  list = list.filter((it) => it.score > -Infinity).sort((a, b) => b.score - a.score);
  // one entry per recording (Commons keeps some albums twice): artist, title and length
  const once = new Set();
  list = list.filter((it) => { const k = `${slug(it.artist)}|${slug(it.title)}|${Math.round((it.seconds || 0) / 3)}`; if (once.has(k)) return false; once.add(k); return true; });
  // the energy curve of the leading candidates (the catalog's own waveform data: small files)
  for (const it of list.slice(0, Math.min(list.length, Math.max(12, limit + 4)))) {
    if (!it.waveform_url) continue;
    try { it.energy = energyOf(await http(it.waveform_url, { json: true, ms: 20000 })); } catch (e) { it.notes.push(`waveform: ${e.message}`); }
    Object.assign(it, scoreItem(it, want));
  }
  const hist = readHistory(env);
  const { items: ranked, held } = applyHistory(list, args['no-history'] ? {} : hist);
  const out = ranked.slice(0, limit);
  if (!args['no-history'] && out.length) {
    hist.searches.push({ date: new Date().toISOString().slice(0, 10), kind, query: { mood: q, bpm: args.bpm || null, length: want.length, sources: use }, first: out[0].ref, offered: out.slice(0, 5).map((x) => x.ref) });
    writeHistory(hist, env);
  }
  const notUsed = Object.values(SOURCES).filter((s) => !s.reachable && s.kinds.includes(kind)).map((s) => `${s.name}: ${s.why}`);
  return { query: { mood: q, kind, bpm: want.bpm, length: want.length }, sources: use, pages, items: out, held, notes, refused, unreachable: notUsed };
}

function row(it, k) {
  const t = it.tempo || {};
  const tempo = t.value != null ? `${t.value} BPM ${t.kind}` : t.range ? `~${t.range[0]}-${t.range[1]} BPM (${t.from}, ${t.kind === 'tagged' ? 'tagged' : 'estimated'})` : it.kind === 'music' ? 'tempo ?' : '';
  const moods = [...(it.tags?.genre || []), ...(it.tags?.mood || []), ...(it.tags?.category || [])].slice(0, 5).join(', ');
  const e = it.energy;
  const shape = e ? `${strip(e.curve)}  intro ${e.intro_s} s${e.breaks.length ? `; break ${e.breaks.map((b) => `${mmss(b.from)}-${mmss(b.to)}${b.entry_s != null ? ` entry ${mmss(b.entry_s)}` : ''}`).join(', ')}` : '; no break'}; ends ${e.ending}; contrast ${e.range_db} dB` : '';
  const lic = it.licence === 'cc0' ? '  CC0' : '';
  return [`#${k + 1}  ${it.ref}  "${it.title}"${it.artist ? ` by ${it.artist}` : ''}  ${mmss(it.seconds)}  ${moods}${lic}`,
    `     ${[tempo, it.score != null ? `score ${it.score}` : ''].filter(Boolean).join('  ')}${(it.why || []).length ? `  (${it.why.join('; ')})` : ''}`,
    ...(shape ? [`     ${shape}`] : []), ...(it.plan ? [`     cut: ${it.plan.text}`] : []), ...(it.notes || []).map((n) => `     note: ${n}`)].join('\n');
}

async function cmdSearch(args) {
  const r = await search(args);
  const kind = r.query?.kind || 'music';
  const out = args.out || path.join('out', 'music', kind === 'sfx' ? 'sfx-search.json' : 'search.json');
  if (r.items.length) writeJson(out, r);
  if (args.json) { console.log(JSON.stringify(r, null, 1)); return r.items.length ? 0 : 1; }
  for (const n of r.notes || []) console.log(`note: ${n}`);
  if (!r.items.length) { console.log(`music: nothing usable found${r.sources ? ` in ${r.sources.map((s) => SOURCES[s].name).join(', ')}` : ''}; try other words (a genre, a mood), a wider --bpm or another --source`); return 1; }
  console.log(`music: ${r.items.length} ${kind === 'sfx' ? 'sound effects' : 'tracks'} for "${r.query.mood}"${r.query.bpm ? ` at ${r.query.bpm.join('-')} BPM` : ''}${r.query.length ? `, film ${r.query.length} s` : ''} from ${r.sources.map((s) => SOURCES[s].name).join(', ')} (${out})`);
  r.items.forEach((it, k) => console.log(row(it, k)));
  for (const h of r.held) console.log(`held back: ${h.ref} "${h.title}": ${h.why.at(-1)}`);
  if (r.sources.includes('openverse')) console.log(`Openverse: ${SOURCES.openverse.note}`);
  if (kind === 'music') console.log(`not searched (licence or access): ${Object.values(SOURCES).filter((s) => !s.reachable && s.kinds.includes('music')).map((s) => s.name).join(', ')}; see licences`);
  console.log(kind === 'sfx'
    ? `next: get '#n' --kind sfx --from ${out} --to <film>/audio/sfx, then kit.py real <file> --action <action> and kit.py listen (judge it)`
    : `next: node scripts/music.mjs sheet ${out} --measure   (audition the first three), then get '#n' --to <film>/audio/music`);
  return 0;
}

function decode(file, sr = 11025, maxS = 120) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-t', String(maxS), '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.error || r.status !== 0) throw new Error(`ffmpeg could not decode ${path.basename(file)}: ${r.error?.message || String(r.stderr).trim().split('\n').at(-1)}`);
  const b = r.stdout; return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
}

async function cmdSheet(args, env = process.env) {
  const file = args._[0] || path.join('out', 'music', 'search.json');
  const r = readJson(file, null);
  if (!r?.items) throw new Usage(`no search results at ${file}: run search first`);
  const picks = args.pick ? String(args.pick).split(',').map((x) => Number(x.replace('#', '')) - 1) : r.items.map((_, k) => k);
  const chosen = picks.filter((k) => r.items[k]).map((k) => [k, r.items[k]]);
  if (args.measure) {
    const tc = readJson(tempoPath(env), {});
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-music-'));
    try {
      for (const [k, it] of chosen.slice(0, args.pick ? chosen.length : 3)) {
        if (it.kind !== 'music') continue;
        const f = path.join(tmp, `${slug(it.ref)}.${audioExt(it.file_url) || 'mp3'}`);
        try {
          await download(it.file_url, f, 100000, refererOf(it));
          const pcm = decode(f, 11025, 480);
          const bpm = quickTempo(pcm.subarray(0, 11025 * 120), 11025);
          if (bpm) { it.tempo = { value: bpm, kind: 'quick' }; tc[it.ref] = { bpm, kind: 'quick', date: new Date().toISOString().slice(0, 10) }; }
          if (!it.energy) it.energy = energyFromPcm(pcm, 11025);
        } catch (e) { it.notes = [...(it.notes || []), `measure: ${e.message}`]; }
        finally { fs.rmSync(f, { force: true }); }
        r.items[k] = it;
      }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    writeJson(tempoPath(env), tc);
    const want = { words: words(r.query?.mood), bpm: r.query?.bpm || null, length: r.query?.length || null, shortlist: shortlistRefs() };
    for (const [k, it] of chosen) if (!it.plan) r.items[k] = Object.assign(it, scoreItem(it, want));
    writeJson(file, r);
  }
  if (args.json) { console.log(JSON.stringify(chosen.map(([, it]) => it), null, 1)); return 0; }
  for (const [k, it] of chosen) console.log(row(it, k));
  return 0;
}

export function resolveRef(ref, results) {
  const s = String(ref || '').trim();
  if (/^#?\d+$/.test(s) && results?.items) return results.items[Number(s.replace('#', '')) - 1] || null;
  return (results?.items || []).find((it) => it.ref === s) || null;
}

/**
 * The item's licence read again now, before a download: {ok, quote, url} or {ok: false, why}. Mixkit: its
 * licence page must still carry the sentence; a CC0 item: its own Commons page (file metadata), its ccMixter
 * upload record, or its Openverse record and the page it comes from (Openverse does not verify licences).
 */
export async function verifyLicence(it) {
  const L = LICENCES[it.licence];
  if (!L) return { ok: false, why: (it.notes || []).join('; ') || 'no licence the finder can use' };
  const src = it.source || 'mixkit';
  try {
    if (src === 'mixkit') {
      const seen = text(await http(L.seen.url, { ms: 30000 }) || '');
      if (!seen.includes(L.seen.quote.replace(/'/g, '’')) && !seen.includes(L.seen.quote)) {
        return { ok: false, why: `the licence page ${L.seen.url} no longer says "${L.seen.quote}": read it, and record the track by hand (track.py add) if it still allows a film` };
      }
      return { ok: true, quote: L.seen.quote, url: L.seen.url };
    }
    if (src === 'commons') {
      const now = parseCommons(await http(commonsFileUrl(it.id), { json: true }), it.kind)[0];
      if (!now || now.licence !== 'cc0') return { ok: false, why: `its Commons page no longer says CC0 with no attribution (${now?.notice || 'the file is gone'})` };
      if (it.file_url && now.file_url !== it.file_url) return { ok: false, why: 'its file changed since the search: search again' };
      return { ok: true, quote: now.notice, url: now.page };
    }
    if (src === 'ccmixter') {
      const now = parseCcmixter(await httpLarge(ccmixterUploadUrl(it.id)) || []).find((x) => x.id === String(it.id));
      if (!now || now.licence !== 'cc0') return { ok: false, why: `its ccMixter record no longer says CC0 (${now?.notice || 'the upload is gone'})` };
      return { ok: true, quote: now.notice, url: now.page };
    }
    if (src === 'openverse') {
      const now = parseOpenverse(await http(`${OPENVERSE_API}${encodeURIComponent(it.id)}/`, { json: true }) || {}, it.kind)[0];
      if (!now || now.licence !== 'cc0') return { ok: false, why: `Openverse no longer lists it as CC0 (${now?.notice || 'the item is gone'})` };
      if (!now.page) return { ok: false, why: 'it has no page of its own to confirm the licence on' };
      const m = String(await http(now.page, { ms: 30000 }) || '').match(/creativecommons\.org\/publicdomain\/zero\/1\.0\/?/i);
      if (!m) return { ok: false, why: `its own page (${now.page}) does not link the CC0 dedication` };
      return { ok: true, quote: `CC0: its page links the dedication (${m[0]})`, url: now.page };
    }
  } catch (e) { return { ok: false, why: `could not read its licence again (${e.message})` }; }
  return { ok: false, why: `no licence check for the catalog ${src}` };
}

async function cmdGet(args, env = process.env) {
  const ref = args._[0];
  if (!ref) throw new Usage('get needs a ref (#n from the last search, or <source>:<id>)');
  if (!args.to) throw new Usage('get needs --to <film>/audio/music (or <film>/audio/sfx for an effect)');
  const from = args.from || path.join('out', 'music', /sfx/.test(String(args.kind || '')) ? 'sfx-search.json' : 'search.json');
  const results = readJson(from, null);
  const it = resolveRef(ref, results);
  if (!it) throw new Usage(`${ref} is not in ${from}: search first, or pass --from`);
  const L = LICENCES[it.licence];
  if (!L) { console.error(`music.mjs: ${it.ref} refused: ${(it.notes || []).join('; ') || 'no licence the finder can use'}`); return 1; }
  if (it.vocals || it.unfit) { console.error(`music.mjs: ${it.ref} refused: ${it.vocals ? 'tagged with a voice' : 'not a film track'}`); return 1; }
  const v = await verifyLicence(it); // read again now: the record quotes what the page says today
  if (!v.ok) { console.error(`music.mjs: ${it.ref}: ${v.why}: nothing downloaded`); return 1; }
  const src = it.source || 'mixkit';
  const stem = slug(args.name || `${it.title}_${src}`).replace(/-/g, '_') || `${src}_${it.id}`;
  const ext = `.${audioExt(it.file_url) || (it.kind === 'music' ? 'mp3' : 'wav')}`;
  const dest = path.join(args.to, stem + ext);
  const d = await download(it.file_url, dest, it.kind === 'music' ? 100000 : 2000, refererOf(it));
  const date = new Date().toISOString().slice(0, 10);
  const rec = licenceRecord(it, { file: path.basename(dest), sha256: d.sha256, bytes: d.bytes, date, seenQuote: v.quote, seenUrl: v.url, query: results?.query?.mood || null });
  const recPath = path.join(args.to, `${stem}.licence.json`);
  writeJson(recPath, rec);
  if (!args['no-history']) {
    const h = readHistory(env);
    h.used.push({ date, ref: it.ref, title: it.title, kind: it.kind, film: path.resolve(args.film || path.join(args.to, '..', '..')) });
    writeHistory(h, env);
  }
  console.log(`get: ${dest} (${(d.bytes / 1e6).toFixed(1)} MB) and ${recPath} (${L.name}, no credit needed; its licence read again now at ${v.url})`);
  if (it.kind === 'music') {
    console.log(`  next: python3 scripts/audio/track.py analyze ${dest} --profile <calm|crisp|punchy>`);
    console.log(`        python3 scripts/audio/listen.py --track ${dest}   (possible vocals, tempo against track.py's)`);
    console.log('  keep it out of git: audio/music/* is ignored, only the .json files are committed');
  } else {
    console.log(`  next: python3 scripts/audio/kit.py real ${dest} --action <action>   (then kit.py listen judges it)`);
  }
  return 0;
}

function cmdHistory(args, env = process.env) {
  const h = readHistory(env);
  if (args.json) { console.log(JSON.stringify(h, null, 1)); return 0; }
  console.log(`music history (${histPath(env)}): ${h.searches.length} search(es), ${h.used.length} track(s) used`);
  for (const u of h.used.slice(-8)) console.log(`  used ${u.date}  ${u.ref}  "${u.title}"  ${u.kind || 'music'}  ${u.film || ''}`);
  const s = h.searches.at(-1);
  if (s) console.log(`  last search ${s.date}: "${s.query?.mood}", offered first ${s.first}`);
  return 0;
}

function cmdLicences() {
  for (const [id, L] of Object.entries(LICENCES)) {
    console.log(`${id}: ${L.name} (${L.url}), credit ${L.credit ? 'required' : 'not required'}\n  limits: ${L.limits}\n  read ${L.seen.date} at ${L.seen.url}: "${L.seen.quote}"`);
  }
  for (const [id, s] of Object.entries(SOURCES)) {
    if (s.reachable) console.log(`--source ${id}: ${s.name} (${s.kinds.join(', ')}; ${s.licences.join(', ')})${s.note ? `; ${s.note}` : ''}`);
  }
  for (const s of Object.values(SOURCES)) if (!s.reachable) console.log(`${s.name}: not used: ${s.why}`);
  return 0;
}

const USAGE = `music.mjs: the film's track (and a real effect where the bank is weak) from free no-credit catalogs.

  search   --mood "<words>" [--bpm 118-128] [--length <film s>] [--kind music|sfx]
           [--source all|mixkit|commons|ccmixter|openverse[,...]] [--limit 8] [--pages 4]
           [--out out/music/search.json] [--json] [--no-history]
  sheet    [results.json] [--pick 1,2,3] [--measure] [--json]     (mood, tempo, length, energy curve)
  get      <#n|<source>:<id>> --to <film>/audio/music [--from results.json] [--name stem] [--film dir] [--no-history]
  history  [--json]        licences   (the licences, the catalogs, and why the others are not used)

Choose by the film's mood and pace (references/sound.md §5.5a gives the brief), audition three (sheet --measure,
then listen), keep one, never the last film's track: search holds it back, and never offers the same track first
twice in a row (~/.cinetic/music-history.json, or $CINETIC_HOME). get reads the item's licence again and writes
the licence record; then track.py analyze / edit / grid (references/music.md).
Catalogs: Mixkit, Wikimedia Commons (CC0 files), ccMixter (CC0 uploads); for effects Mixkit, Commons and
Openverse (CC0; made using Openverse, not endorsed or certified by Openverse). Pixabay Music and Chosic answer
scripts with a bot check and Free Music Archive's download needs a login: download such a track from its page
yourself and record it with track.py add.

  --help, -h   print this help`;

export async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(`${e.message}\n\n${USAGE}`); return 2; }
  const cmd = args._.shift();
  if (args.help || !cmd || cmd === 'help') { console.log(USAGE); return cmd || args.help ? 0 : 2; }
  try {
    switch (cmd) {
      case 'search': return await cmdSearch(args);
      case 'sheet': return await cmdSheet(args);
      case 'get': return await cmdGet(args);
      case 'history': return cmdHistory(args);
      case 'licences': case 'licenses': return cmdLicences();
      default: throw new Usage(`unknown command ${cmd}: search, sheet, get, history, licences`);
    }
  } catch (e) {
    if (e instanceof Usage) { console.error(`${e.message}\n\n${USAGE}`); return 2; }
    console.error(`music.mjs: ${e.message}`); return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
