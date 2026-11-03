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
 *   node scripts/music.mjs pick --mood "<words>" [--length 30] [--bpm 100-120] [--format launch] [--energy calm|crisp|punchy]
 *        [--library PATH] [--limit 8] [--out out/music/search.json] [--json] [--no-history]
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
 *           contrast; a flat track loses). A track any earlier film used is held back (never offered
 *           again), the tracks of assets/music/shortlist.json lose ground (the example films used them), and
 *           the first track offered is never the one offered first by the previous search
 *           (~/.cinetic/music-history.json, or $CINETIC_HOME). Writes the results (out/music/).
 *           --kind sfx searches Mixkit's free sound effects the same way (by category words: whoosh, paper,
 *           click, camera, lock, thud ...), for an action the earshot bank sounds weakly (references/sound.md).
 *           --source picks the catalogs (default all that serve the kind: music from Mixkit, Wikimedia
 *           Commons and ccMixter; effects from Mixkit and Openverse); a catalog that cannot be used answers
 *           with its reason and is never requested.
 * pick      ranks a music library instead of the catalogs: tracks chosen as launch-fit beforehand, analysed
 *           (track.py: tempo, a clear downbeat grid, sections, the lift for the reveal, cut points) and
 *           listened to (earshot: modern for the mood, no voice, no lo-fi hiss), each with its no-credit
 *           licence. Library moods: calm, cinematic, dark, driving, elegant, energetic, playful, uplifting (a
 *           brief's words name them: "precise" is driving, "premium" elegant, "bright" uplifting ...). Ranked by
 *           mood (its own mood first, a second mood next), length (never shorter than the film plus its ending),
 *           tempo (--bpm; double or half time counts), the lift for the reveal and the library's quality mark;
 *           a second track by one artist, or an artist a recent film used, loses ground; a track earshot hears as
 *           generic corporate stock (its nearest descriptions) loses 4 (1.5 when it is only third or fourth); the dealt
 *           direction (out/direction.json: its feel joins the moods, its tempo is the range without --bpm, a track
 *           ending the way it asks gains; --no-direction leaves it out) steers the character; a track any earlier
 *           film used is held back, the previous first offer is never first again. A launch (--format launch, or a
 *           film.json here whose template is launch-simple) prefers 115-136 BPM when --bpm is not given, and a tempo
 *           outside it loses more than the brief's own range would (146 BPM drum and bass under calm cards is the
 *           miss it prevents); --energy (calm, crisp, punchy; else the brief's mood words, else crisp for a
 *           launch) weighs the track's energy
 *           (its mood and tempo: calm, cinematic and elegant are calm; uplifting and playful crisp; driving,
 *           energetic and dark, or 140 BPM and up, punchy) against the film's: the same +1.5, two apart -3. Writes
 *           the results where search does (each with its cut points: the reveal's bar and time, the body, the
 *           ending, the key, a --phase to analyse with), so sheet and get read them. The library: --library
 *           PATH, $CINETIC_MUSIC_LIBRARY, else $CINETIC_HOME/music-library.json (a library or {"link": path});
 *           with none, pick says so and search is the route.
 * sheet     the candidates as a list: mood, tempo, length, the energy curve (a strip of levels over the
 *           track), the intro, breaks with their entries, the ending, the contrast. --measure downloads the
 *           picked ones (default the first three) into a temporary folder, measures a quick tempo (and, for a
 *           catalog without waveform data, the energy curve) from the audio (ffmpeg decodes it), keeps the
 *           tempo (~/.cinetic/music-tempo.json), has earshot listen to it (what it hears it nearest to; a track it
 *           hears as generic corporate stock loses 4, --no-listen skips it; earshot is the one kit.py found) and
 *           deletes the file.
 *           The full analysis is still `track.py analyze` on the track you keep.
 * get       downloads the full file (never a preview, except an Openverse effect whose origin serves only
 *           one: noted; a library track: the library's copy while its sha256 still matches) into the film's audio/music/ (audio/sfx/ for an effect), reads the item's licence
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
 *   coverr    Coverr: its free stock music (the Coverr License: commercial use, no credit; its public catalog
 *             JSON, 263 tracks), produced tracks with real endings; the free download is the full-length MP3
 *             (128 kbps; the WAV master needs an account and is never fetched). Premium items are refused.
 * Not used, with the reason each answers (`licences` lists them): Pixabay Music (a bot check), Chosic (an
 * aggregator: its no-credit tracks are the CC0 albums Commons serves, the rest need a credit), Free Music
 * Archive (its download needs a login), YouTube Audio Library (a login), Uppbeat's free plan (a credit, and a
 * paid plan for commercial work), Videvo music (now Freepik: a security filter, and a credit on the free
 * licence), StreamBeats (its licence covers streams and creators' videos, not advertising), freepd.com
 * (closed), the Internet Archive (its terms grant access for scholarship and research), CC BY catalogs (a
 * credit). Download such a track from its page yourself where its licence allows it and record it with
 * `track.py add`. A track whose listing names another licence, or a vocal, is refused.
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
  coverr: {
    name: 'Coverr License', url: 'https://coverr.co/license', credit: false, kind: 'music',
    limits: 'free for commercial and non-commercial films, no credit; never compile Coverr items into a similar or competing service, never use them to train AI, and trademarks that appear in an item need their owner\'s permission',
    seen: { quote: 'All videos and music tracks published on Coverr.co are available for free for both commercial and non-commercial purposes.',
      also: 'You are not required to seek permission from or provide credit to the content creator or Coverr.co',
      url: 'https://coverr.co/license', date: '2026-10-28' },
    notice: /Coverr License/i,
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
  coverr: { name: 'Coverr', kinds: ['music'], licences: ['coverr'], reachable: true,
    note: 'the free download is the full-length 128 kbps MP3; Coverr names no composer' },
  pixabay: { name: 'Pixabay Music', kinds: ['music'], reachable: false,
    why: 'pixabay.com answers scripts with a bot check (HTTP 403, "Just a moment...") and the Pixabay API serves images and video, not music; download from the track\'s page yourself and record it with track.py add (Pixabay Content License, no credit)' },
  fma: { name: 'Free Music Archive', kinds: ['music'], reachable: false,
    why: 'its download link answers with a login page (HTTP 302 to /login); CC0 albums it hosted are often on Wikimedia Commons too (--source commons)' },
  chosic: { name: 'Chosic', kinds: ['music'], reachable: false,
    why: 'an aggregator, never the authority for a licence: most of its tracks need a credit (CC BY) and its no-credit ones are the CC0 albums Wikimedia Commons serves (--source commons); it also answered scripts with a bot check (HTTP 403) on 2026-10-27' },
  videvo: { name: 'Videvo music', kinds: ['music'], reachable: false,
    why: 'videvo.net music now redirects to Freepik audio, which answers scripts with a security filter (HTTP 403), and its free licence needs a credit' },
  streambeats: { name: 'StreamBeats', kinds: ['music'], reachable: false,
    why: 'its Sync License covers videos on Twitch, YouTube, podcasts and similar platforms, not advertising or client work, and its downloads go through Bandcamp' },
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

// ------------------------------------------------------------------------------------------------ Coverr
export const COVERR_API = 'https://coverr.co/papi/audios';
/** A page of Coverr's public music catalog (JSON, no key), or one item by id. */
export const coverrUrl = (page = 0, size = 50) => `${COVERR_API}?${new URLSearchParams({ page: String(page), page_size: String(size) })}`;
export const coverrItemUrl = (id) => `${COVERR_API}/${encodeURIComponent(id)}`;
/** Coverr's waveform (an array of peaks 0..1 over the whole track) as the catalog waveform energyOf reads. */
export function coverrWave(peaks, seconds) {
  if (!Array.isArray(peaks) || peaks.length < 8 || !(seconds > 0)) return null;
  const data = [];
  for (const p of peaks) { const v = Math.round(Math.max(0, Math.min(1, Number(p) || 0)) * 127); data.push(-v, v); }
  return { sample_rate: 1000, samples_per_pixel: (seconds * 1000) / peaks.length, bits: 8, channels: 1, length: peaks.length, data };
}
/** Coverr catalog hits ({hits: [...]}, or one item) as result items (licence 'coverr' for a published, non-premium item). */
export function parseCoverr(json) {
  const hits = Array.isArray(json?.hits) ? json.hits : json?.id ? [json] : [];
  return hits.map((h) => {
    const free = h.status === 'published' && h.is_premium === false;
    const tags = { genre: (h.genres || []).map(slug), mood: (h.moods || []).map(slug), instrument: (h.instruments || []).map(slug), tag: (h.video_themes || []).map(slug), category: [] };
    const urls = h.urls || {};
    const seconds = Number.isFinite(h.duration) ? Math.round(h.duration * 10) / 10 : null;
    const it = { ref: `coverr:${h.id}`, source: 'coverr', id: String(h.id), kind: 'music', title: h.title || h.name || String(h.id), artist: 'Coverr',
      genre: tags.genre[0] || null, tags, seconds, file_url: urls.preview_download || urls.preview || null, preview_url: urls.preview || null,
      page: 'https://coverr.co/free-stock-music', licence: free ? 'coverr' : 'unknown', notice: free ? 'Coverr License' : null,
      published: (h.published_at || h.created_at || '').slice(0, 10) || null, created: (h.created_at || '').slice(0, 10) || null,
      energy: energyOf(coverrWave(h.waveform, seconds)), notes: ['Coverr\'s free download: the full-length MP3 (128 kbps); the WAV master needs an account'] };
    if (!free) it.notes.push(h.is_premium ? 'a premium item (Coverr+ only): refused' : `status ${h.status || 'unknown'}: refused`);
    if (VOCAL.test([it.title, ...tags.instrument, ...tags.genre].join(' '))) { it.vocals = true; it.notes.push('vocals among its instruments: refused (no voice under on-screen text)'); }
    if (/\bai[- ]generated|\bgenerated by ai\b|\blyria\b|\bsuno\b|\budio\b/i.test([h.description, h.meta && JSON.stringify(h.meta)].filter(Boolean).join(' '))) {
      it.unfit = true; it.notes.push('marked as AI-generated: refused');
    }
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

/**
 * The presence of a track: the share of its power at 2-5 kHz against the whole (dB, 2048-point frames over the first two
 * minutes of mono samples at `sr` >= 11025). A low-passed pad reads under -35: it masks every click laid over it and
 * reads as a murk (score.py fails such a bed: no EQ adds what the file does not hold).
 */
export function presenceDb(pcm, sr) {
  const N = 2048;
  const frames = Math.min(Math.floor(pcm.length / N), Math.floor((120 * sr) / N));
  if (frames < 8 || sr < 11000) return null;
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const buf = new Float64Array(N);
  let all = 0, band = 0;
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) buf[i] = pcm[f * N + i] * win[i];
    const mag = fftMag(buf);
    for (let i = 1; i < mag.length; i++) {
      const hz = (i * sr) / N, p = mag[i] * mag[i];
      if (hz >= 30) all += p;
      if (hz >= 2000 && hz < 5000) band += p;
    }
  }
  return all > 0 ? Math.round(100 * 10 * Math.log10(band / all + 1e-24)) / 100 : null;
}
export const MUFFLED_DB = -35;

// ------------------------------------------------------------------------------------------------ ranking
/** {score, why[]} of one item against the brief: the words, length, tempo, energy, presence, history. */
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
  if (it.kind === 'music' && Number.isFinite(it.presence_db) && it.presence_db < MUFFLED_DB) { s -= 4; why.push(`muffled (2-5 kHz ${it.presence_db} dB under the whole): a low-passed pad masks every click`); }
  if (it.kind === 'music' && !(want.words || []).some((w) => STOCK_RE.test(w))) {
    const st = stockPenalty({ tags: it.tags, genre: it.genre, listen: it.listen });
    if (st.penalty) { s -= st.penalty; why.push(st.why); }
  }
  const e = it.energy;
  if (e && it.kind === 'music') {
    const entry = (e.breaks || []).find((x) => x.entry_s != null && x.entry_s > 0.15 * e.seconds && x.entry_s < 0.8 * e.seconds);
    if (entry) { s += 1.5; why.push(`a break and an entry at ${mmss(entry.entry_s)} (a reveal)`); }
    if (e.range_db >= 5) { s += 1; why.push(`contrast ${e.range_db} dB`); } else if (e.range_db < 2.5) { s -= 1; why.push('flat energy'); }
    if (e.ending === 'button' || e.ending === 'ring') { s += 1; why.push(`a real ending (${e.ending}, from the waveform)`); }
    else if (e.ending === 'fade') { s -= 1; why.push('ends on a fade (from the waveform): the film would fade it out under the end card'); }
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
// every track a film used stays in the history (a track is never used twice); searches keep the last 50
export const writeHistory = (h, env = process.env) => writeJson(histPath(env), { ...h, searches: h.searches.slice(-50), used: h.used.slice(-5000) });

// the skill's assets/music/shortlist.json, or a film's copy in scripts/music/ (new-film.sh puts it there)
const shortlistFile = () => [path.join(HERE, '..', 'assets', 'music', 'shortlist.json'), path.join(HERE, 'music', 'shortlist.json')].find((f) => fs.existsSync(f));

/** The Mixkit refs of assets/music/shortlist.json (tracks the example films used). */
export function shortlistRefs() {
  const sl = readJson(shortlistFile(), {});
  return new Set((sl.tracks || []).map((t) => (String(t.file_url || '').match(/assets\.mixkit\.co\/music\/(\d+)\//) || [])[1]).filter(Boolean).map((id) => `mixkit:${id}`));
}

/** Measured tempos: the shortlist's measured rows (by their Mixkit file id) and the user's own measurements. */
export function tempoCache(env = process.env) {
  const out = {};
  const sl = readJson(shortlistFile(), {});
  for (const t of sl.tracks || []) {
    const id = (String(t.file_url || '').match(/assets\.mixkit\.co\/music\/(\d+)\//) || [])[1];
    if (id && t.bpm?.kind === 'measured' && Number.isFinite(t.bpm.value)) out[`mixkit:${id}`] = { bpm: t.bpm.value, kind: 'measured' };
  }
  return { ...out, ...readJson(tempoPath(env), {}) };
}

/**
 * The history's rules on a ranked list: a track any earlier film used is held back (never reused: the last
 * film's, and every one before it), and the first offer never repeats the previous search's first offer.
 * Returns {items, held}.
 */
export function applyHistory(items, hist) {
  const used = (hist?.used || []).filter((u) => u.kind !== 'sfx');
  const last = used.at(-1)?.ref;
  const earlier = new Map(used.map((u) => [u.ref, u]));
  const held = [];
  let list = [];
  for (const it of items) {
    if (it.kind === 'music' && earlier.has(it.ref)) {
      const u = earlier.get(it.ref);
      const film = u.film ? ` (${path.basename(String(u.film))}${u.date ? `, ${u.date}` : ''})` : u.date ? ` (${u.date})` : '';
      held.push({ ...it, why: [...(it.why || []), it.ref === last ? `your last film's track${film}: held back` : `used by an earlier film${film}: held back`] });
      continue;
    }
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

// ------------------------------------------------------------------------------------------------ the library
/*
 * A music library: tracks already chosen as launch-fit, analysed (track.py: tempo, a clear downbeat grid,
 * sections, the lift for the name reveal, best cut points) and listened to (earshot: modern for its mood, no
 * voice, no lo-fi hiss), each with its catalog licence (no credit). `pick` ranks it for a film by mood, length
 * and tempo, never offering a track an earlier film used; `get` then takes the copy the library holds (same
 * sha256) or downloads the file, and reads its licence again either way.
 * A library is a JSON file: {library: 1, root?, tracks: [{ref, source, id, title, artist, seconds, file?,
 * sha256?, file_url, page, licence, tags, mood, moods, mood_fit?, bpm, key?, contrast_db?, energy: {curve,
 * intro_s, ending}, cuts: {reveal: {kind, bar, t}, body_bar, phase?, ending, edit?}, quality}]}.
 * Where it is, first that applies: --library PATH, $CINETIC_MUSIC_LIBRARY, $CINETIC_HOME/music-library.json
 * (~/.cinetic/music-library.json): a library itself, or {"link": "<path to library.json>"}.
 */
export const LIB_MOODS = ['calm', 'cinematic', 'dark', 'driving', 'elegant', 'energetic', 'playful', 'uplifting'];
/** The words of a brief that name each library mood (the mood's own name counts more). */
export const MOOD_WORDS = {
  calm: ['relaxed', 'soft', 'gentle', 'quiet', 'mellow', 'peaceful', 'serene', 'chill', 'chillout', 'ambient', 'downtempo', 'slow', 'meditative', 'dreamy', 'airy', 'reflective', 'tender'],
  cinematic: ['epic', 'dramatic', 'grand', 'trailer', 'majestic', 'heroic', 'emotional', 'orchestral', 'score', 'film', 'anthemic', 'sweeping'],
  dark: ['tense', 'tension', 'mysterious', 'moody', 'night', 'ominous', 'suspense', 'suspenseful', 'serious', 'brooding', 'noir', 'stealth', 'gritty'],
  driving: ['mechanical', 'precise', 'steady', 'hypnotic', 'focused', 'minimal', 'pulse', 'pulsing', 'propulsive', 'insistent', 'techno', 'engineered', 'machine', 'determined'],
  elegant: ['smooth', 'premium', 'luxury', 'sleek', 'refined', 'polished', 'sophisticated', 'stylish', 'cool', 'lounge', 'sensual', 'soulful', 'fashion', 'classy', 'warm'],
  energetic: ['fast', 'punchy', 'bold', 'aggressive', 'hype', 'intense', 'powerful', 'loud', 'edm', 'rush', 'exciting', 'dynamic', 'hard'],
  playful: ['fun', 'quirky', 'bouncy', 'funky', 'funk', 'cheeky', 'groovy', 'groove', 'whimsical', 'lively', 'disco', 'friendly', 'witty'],
  uplifting: ['bright', 'hopeful', 'positive', 'optimistic', 'happy', 'joyful', 'inspiring', 'confident', 'sunny', 'upbeat', 'fresh', 'motivating', 'euphoric'],
};
/** The brief's words as library moods, {mood: weight}: a mood's name counts 1.5, one of its words 1. */
export function moodsOfWords(ws) {
  const out = {};
  for (const w of ws || []) {
    for (const [m, list] of Object.entries(MOOD_WORDS)) if (w === m || list.includes(w)) out[m] = (out[m] || 0) + (w === m ? 1.5 : 1);
  }
  return out;
}

/** The library file to read (--library, $CINETIC_MUSIC_LIBRARY, $CINETIC_HOME/music-library.json; a {"link"} followed), or null. */
export function libraryPath(args = {}, env = process.env) {
  const named = [args.library, env.CINETIC_MUSIC_LIBRARY].filter(Boolean);
  for (const p of [...named, path.join(homeDir(env), 'music-library.json')]) {
    const j = readJson(p, null);
    if (!j) { if (named.includes(p)) throw new Error(`no music library at ${p}`); continue; }
    if (j.link && !j.tracks) {
      const q = path.resolve(path.dirname(p), String(j.link));
      if (!readJson(q, null)) throw new Error(`${p} links ${q}: no library there`);
      return q;
    }
    return p;
  }
  return null;
}

/** The library's tracks with a licence the finder knows; each one's local copy resolved (its root, else beside the file). */
export function readLibrary(p) {
  const j = readJson(p, null);
  if (!j || j.library !== 1 || !Array.isArray(j.tracks)) throw new Error(`${p} is not a music library ({"library": 1, "tracks": [...]})`);
  const root = path.resolve(path.dirname(p), j.root || '.');
  return j.tracks.filter((t) => t && t.ref && t.file_url && LICENCES[t.licence] && (t.kind || 'music') === 'music' && !t.vocals)
    .map((t) => ({ ...t, kind: 'music', local: t.file ? path.resolve(root, t.file) : null }));
}

/**
 * {score, why[]} of a library track for a film: its mood against the brief's (its own mood 4, a second mood 2.5,
 * a mood it fits a little 1, none of the brief's -2), the words its tags carry (a genre such as "tech house"),
 * the length (never shorter than the film plus its ending; 1.5 times it so the best bars and an ending fit), the
 * tempo (--bpm, double or half time counts; near it +1, outside -3), the lift for the reveal (a drop counts most),
 * the launch profile (profile.ref_z: how close earshot hears it to the house launch sound, x 1.2
 * within -2..+2.5), a real ending (cuts.ending: the track's own final hit that rings out +2; a fade or a loop -2.5,
 * the film would have to fade it) and the library's quality mark (x 0.5); the example films' tracks lose 1.5.
 */
/** The launch tempo range (BPM) a launch film's track prefers when the brief names none. */
export const LAUNCH_BPM = [115, 136];
export const ENERGIES = ['calm', 'crisp', 'punchy'];
/** A library track's energy from its mood and tempo: 0 calm, 1 crisp, 2 punchy. */
export const trackEnergy = (t) => {
  const m = t.mood;
  let e = ['calm', 'cinematic', 'elegant'].includes(m) ? 0 : ['driving', 'energetic', 'dark'].includes(m) ? 2 : 1;
  if (Number.isFinite(t.bpm) && t.bpm >= 140) e = 2;
  return e;
};

/** Generic stock: what earshot names a track nearest to when it hears corporate background music, and the catalog tags
 *  that sell a track as such (corporate, business, motivational, inspirational presentation). */
export const STOCK_RE = /corporate|business|presentation|stock background/i;
/** {penalty, why} of a track that sounds like generic corporate stock: earshot's nearest descriptions (listen.near, the
 *  first two cost 4, the next two 1.5), else a catalog tag that sells it as such (corporate music, business: 2). */
export function stockPenalty(t) {
  const near = (t.listen?.near || []).map(String);
  const k = near.findIndex((d) => STOCK_RE.test(d));
  if (k >= 0 && k < 2) return { penalty: 4, why: `earshot hears generic corporate stock ("${near[k]}")` };
  if (k >= 2 && k < 4) return { penalty: 1.5, why: `earshot hears a touch of corporate stock ("${near[k]}")` };
  const tags = [...(t.tags?.genre || []), ...(t.tags?.mood || []), ...(t.tags?.tag || []), ...(t.tags?.category || []), t.genre].filter(Boolean).map(String);
  const tg = tags.find((x) => STOCK_RE.test(x.replace(/-/g, ' ')));
  return tg ? { penalty: 2, why: `tagged ${tg}: generic stock` } : { penalty: 0, why: null };
}

/** The dealt direction's music (out/direction.json from deck.py: music.bpm, music.feel, music.ending), or null. */
export function dealtMusic(dir = '.') {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, 'out', 'direction.json'), 'utf8'));
    const m = d?.direction?.music;
    if (!m || typeof m !== 'object') return null;
    return { id: d.direction.id || null, bpm: Array.isArray(m.bpm) && m.bpm.length === 2 ? m.bpm.map(Number) : null, feel: String(m.feel || ''),
      ending: m.ending || null };
  } catch {
    return null;
  }
}

export function scoreLibraryTrack(t, want = {}) {
  const why = []; let s = 0;
  const L = want.length;
  if (L && t.seconds != null && t.seconds < L + 4) return { score: -Infinity, why: [`${Math.round(t.seconds)} s: shorter than the film plus its ending`] };
  const wm = want.moods || {};
  if (Object.keys(wm).length) {
    let ms = 0; const hits = [];
    for (const [m, w] of Object.entries(wm)) {
      const v = t.mood === m ? 4 : (t.moods || []).includes(m) ? 2.5 : (t.mood_fit?.[m] || 0) >= 0.3 ? 1 : 0;
      if (v) { ms += v * w; hits.push(t.mood === m ? `${m} (its own mood)` : (t.moods || []).includes(m) ? `${m} (a second mood)` : `${m} (a little)`); }
    }
    if (hits.length) { s += Math.min(7, ms); why.push(`mood ${hits.join(', ')}`); } else { s -= 2; why.push(`its mood is ${t.mood}, not the brief's`); }
  }
  const tagset = new Set([...(t.tags?.genre || []), ...(t.tags?.mood || []), ...(t.tags?.instrument || []), ...(t.tags?.tag || []), t.genre].filter(Boolean));
  const moodWords = new Set(Object.entries(MOOD_WORDS).flatMap(([m, l]) => [m, ...l]));
  const ws = (want.words || []).filter((w) => !moodWords.has(w));
  const tagHits = ws.filter((w) => tagset.has(w) || (SYNONYMS[w] || []).some((x) => tagset.has(x)));
  for (let i = 0; i + 1 < (want.words || []).length; i++) { const pair = `${want.words[i]}-${want.words[i + 1]}`; if (tagset.has(pair)) tagHits.push(pair); }
  if (tagHits.length) { s += 1.5 * tagHits.length; why.push(`matches ${[...new Set(tagHits)].join(', ')}`); }
  if (L && t.seconds != null && t.seconds / L >= 1.5) { s += 1; why.push('long enough for the best bars and an ending'); }
  if (want.bpm && t.bpm != null) {
    const [a, b] = want.bpm;
    const reads = [t.bpm, t.bpm * 2, t.bpm / 2];
    const tag = want.launchBpm ? 'the launch range' : 'the brief';
    if (reads.some((v) => v >= a - 0.5 && v <= b + 0.5)) { s += 3; why.push(`${Math.round(t.bpm)} BPM fits`); }
    else if (reads.some((v) => v >= a - 4 && v <= b + 4)) { s += 1; why.push(`${Math.round(t.bpm)} BPM near ${tag}`); }
    else { s -= want.launch ? 6 : 3; why.push(`${Math.round(t.bpm)} BPM outside ${tag}${want.launch ? ` (${a}-${b} for a launch)` : ''}`); }
  }
  if (Number.isFinite(want.energy)) {
    const d = Math.abs(trackEnergy(t) - want.energy);
    if (d === 0) { s += 1.5; why.push(`${ENERGIES[want.energy]} energy, like the film`); }
    else if (d === 2) { s -= 3; why.push(`${ENERGIES[trackEnergy(t)]} energy under a ${ENERGIES[want.energy]} film`); }
  }
  const rv = t.cuts?.reveal;
  if (rv) { s += rv.kind === 'drop' ? 1 : 0.5; why.push(`${/^[aeiou]/.test(rv.kind) ? 'an' : 'a'} ${rv.kind} at ${mmss(rv.t)} for the reveal`); }
  const z = t.profile?.ref_z;
  if (Number.isFinite(z)) {
    s += 1.2 * Math.max(-2, Math.min(2.5, z));
    if (z >= 0.5) why.push(`close to the launch sound (earshot z ${z >= 0 ? '+' : ''}${z.toFixed(1)})`);
    else if (z <= -0.5) why.push(`far from the launch sound (earshot z ${z.toFixed(1)})`);
  }
  const en = t.cuts?.ending;
  if (en?.kind === 'button' || en?.kind === 'ring') {
    s += 2; why.push(`a real ending: its final hit${en.final_bar ? ` (bar ${en.final_bar})` : ''} rings ${Number(en.ring_s ?? en.ring_out_s ?? 0).toFixed(1)} s`);
  } else if (en?.kind === 'fade' || en?.kind === 'loop') { s -= 2.5; why.push(`no ending of its own (${en.kind}): the film would fade it out under the end card`); }
  if (Number.isFinite(t.quality)) s += 0.5 * t.quality;
  if (want.shortlist?.has(t.ref)) { s -= 1.5; why.push('a shortlist track the example films used'); }
  const st = stockPenalty(t);
  if (st.penalty) { s -= st.penalty; why.push(st.why); }
  if (want.dealt?.ending && en?.kind && (en.kind === want.dealt.ending || (want.dealt.ending === 'ring' && en.kind === 'button'))) {
    s += 1; why.push(`ends the way the dealt direction asks (${want.dealt.ending})`);
  }
  return { score: Math.round(s * 100) / 100, why };
}

/** One line of cut points from the library's analysis: the reveal, the body, the ending, the key, a phase to set. */
export function planText(t) {
  const c = t.cuts || {};
  const rv = c.reveal;
  const en = c.ending || {};
  const endText = !en.kind ? null : (en.kind === 'button' || en.kind === 'ring')
    ? `ends on its own final hit${en.final_bar ? ` at bar ${en.final_bar}` : ''}${en.ring_s ?? en.ring_out_s ? ` (rings ${Number(en.ring_s ?? en.ring_out_s).toFixed(1)} s)` : ''}: track.py edit --end own`
    : `ends on a ${en.kind}: track.py edit --end fade`;
  return [rv ? `reveal on the ${rv.kind} at ${mmss(rv.t)} (bar ${rv.bar})` : null, c.body_bar ? `body from bar ${c.body_bar}` : null,
    endText, t.key ? `key ${t.key}` : null,
    c.phase != null ? `analyse with --phase ${c.phase}` : null].filter(Boolean).join('; ');
}

/** A library track as a result row (the shape search writes, so sheet and get read it). */
export function libraryItem(t, r = scoreLibraryTrack(t)) {
  return {
    ref: t.ref, source: t.source || 'mixkit', id: String(t.id ?? t.ref.split(':').slice(1).join(':')), kind: 'music', title: t.title, artist: t.artist || null,
    seconds: t.seconds, file_url: t.file_url, preview_url: t.file_url, page: t.page, licence: t.licence, notice: t.notice || null,
    published: t.published || null, tags: t.tags || {}, found: [t.mood, ...(t.moods || [])].filter(Boolean), genre: t.genre || null,
    tempo: t.bpm != null ? { value: t.bpm, kind: 'measured' } : null,
    energy: t.energy ? { seconds: t.seconds, curve: t.energy.curve || [], intro_s: t.energy.intro_s ?? 0, breaks: [], ending: t.energy.ending || 'unknown',
      range_db: t.contrast_db ?? null } : null,
    notes: [], score: r.score, why: r.why,
    library: { file: t.local || null, sha256: t.sha256 || null, mood: t.mood || null, moods: t.moods || [], key: t.key || null, quality: t.quality ?? null, cuts: t.cuts || null },
    plan: { text: planText(t) },
  };
}

/**
 * The library ranked for a film: scored, too-short tracks dropped; so the offers are not one artist's, each track
 * loses 1 for every higher-ranked track by the same artist and 1 when one of the last five films used that artist;
 * then the history's rules (applyHistory). {items, held}.
 */
/** launch when the film project here (film.json) is made from a launch template, else null. */
export function filmFormat(dir = '.') {
  try {
    const fj = JSON.parse(fs.readFileSync(path.join(dir, 'film.json'), 'utf8'));
    return /^launch/.test(String(fj.template || fj.format || '')) ? 'launch' : null;
  } catch {
    return null;
  }
}

export function rankLibrary(tracks, want = {}, hist = {}) {
  const list = [];
  for (const t of tracks) {
    const r = scoreLibraryTrack(t, want);
    if (r.score > -Infinity) list.push(libraryItem(t, r));
  }
  const key = (a) => String(a || '').trim().toLowerCase();
  const recent = new Set((hist?.used || []).filter((u) => (u.kind || 'music') === 'music').slice(-5).map((u) => key(u.artist)).filter(Boolean));
  const seen = {};
  const catalogs = new Set(Object.values(SOURCES).map((x) => key(x.name)));  // a catalog named as the artist (Coverr) is no one artist
  for (const it of list.sort((a, b) => b.score - a.score || String(a.ref).localeCompare(String(b.ref)))) {
    const a = key(it.artist);
    if (!a || catalogs.has(a)) continue;
    const n = seen[a] || 0;
    if (n) { it.score = Math.round((it.score - n) * 100) / 100; it.why = [...it.why, `${n} higher offer${n > 1 ? 's' : ''} by the same artist`]; }
    if (recent.has(a)) { it.score = Math.round((it.score - 1) * 100) / 100; it.why = [...it.why, 'an artist one of your recent films used']; }
    seen[a] = n + 1;
  }
  return applyHistory(list, hist);
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
    record: 1, kind: music ? 'music' : 'sfx', file, sha256, bytes, title: it.title, artist: it.artist || (it.source === 'coverr' ? 'Coverr' : music ? null : src), source: src,
    page: it.page, file_url: it.file_url, licence: L.name, licence_id: it.licence, licence_url: L.url, credit_required: false,
    credit: music ? (it.artist ? `Music: "${it.title}" by ${it.artist} (${src}${cc0 ? ', CC0' : ''})` : `Music: "${it.title}" (${src}${cc0 ? ', CC0' : ''})`) : null,
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
  const VALUED = new Set(['mood', 'query', 'bpm', 'length', 'kind', 'limit', 'pages', 'out', 'pick', 'to', 'from', 'name', 'film', 'source', 'library', 'format', 'energy']);
  const FLAGS = new Set(['json', 'measure', 'no-history', 'no-direction', 'no-listen', 'help']);
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
  } else if (id === 'coverr') {
    // the whole catalog is a few pages of JSON: read it all (gently) and let the ranking match the words to its tags
    for (let p = 0; p < 8; p++) {
      if (p) await sleep(300);
      let got;
      try { got = await get(coverrUrl(p, 50)); } catch (e) { notes.push(`Coverr: ${e.message}`); break; }
      const hits = parseCoverr(got || {});
      items.push(...hits);
      if (hits.length < 50) break;
    }
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
  const shape = e ? `${strip(e.curve)}  intro ${e.intro_s} s${e.breaks.length ? `; break ${e.breaks.map((b) => `${mmss(b.from)}-${mmss(b.to)}${b.entry_s != null ? ` entry ${mmss(b.entry_s)}` : ''}`).join(', ')}` : it.plan ? '' : '; no break'}; ends ${e.ending}; contrast ${e.range_db} dB` : '';
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

/** The earshot interpreter kit.py found and remembered ($CINETIC_HOME/tools.json earshot: python, pythonpath), else
 *  $EARSHOT_PYTHON: {python, env} or null. */
export function earshotOf(env = process.env) {
  const t = readJson(path.join(homeDir(env), 'tools.json'), {}).earshot || {};
  const py = (env.EARSHOT_PYTHON && !/^(none|off)$/i.test(env.EARSHOT_PYTHON) && env.EARSHOT_PYTHON) || t.python;
  if (!py || !fs.existsSync(py)) return null;
  const e = { ...env, PYTHONUTF8: '1' };
  if (t.pythonpath && py === t.python && fs.existsSync(t.pythonpath)) e.PYTHONPATH = [t.pythonpath, env.PYTHONPATH].filter(Boolean).join(path.delimiter);
  if (t.home && py === t.python && !env.EARSHOT_HOME && fs.existsSync(t.home)) e.EARSHOT_HOME = t.home;  // its models' cache
  return { python: py, env: e };
}

/** earshot's nearest music descriptions of each file (describe: music_hints, 30 s from the first third), one process
 *  for all: {file: [terms]} ({} without earshot). */
export function listenFiles(files, env = process.env) {
  const es = earshotOf(env);
  if (!es || !files.length) return {};
  const code = ['import json, sys', 'from earshot.describe import describe', 'out = {}', 'for f in sys.argv[1:]:', '    try:',
    '        import soundfile as sf', '        d = sf.info(f).duration', '        a = max(0.0, min(d / 3, d - 30))',
    '        r = describe(f, start=a, end=min(d, a + 30), top=4)', "        out[f] = [h['term'] for h in (r.get('music_hints') or [])[:4]]",
    '    except Exception as e:', "        out[f] = {'error': str(e)[:200]}", 'print(json.dumps(out))'].join('\n');
  const r = spawnSync(es.python, ['-c', code, ...files], { encoding: 'utf8', env: es.env, timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  try { return JSON.parse(String(r.stdout || '').trim().split(/\r?\n/).pop()); } catch { return {}; }
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
    const heard = [];  // [k, file]: earshot listens to these in one process before the files go
    try {
      for (const [k, it] of chosen.slice(0, args.pick ? chosen.length : 3)) {
        if (it.kind !== 'music' || it.library) continue; // a library track is measured already (track.py)
        const f = path.join(tmp, `${slug(it.ref)}.${audioExt(it.file_url) || 'mp3'}`);
        try {
          await download(it.file_url, f, 100000, refererOf(it));
          const pcm = decode(f, 11025, 480);
          const bpm = quickTempo(pcm.subarray(0, 11025 * 120), 11025);
          if (bpm) { it.tempo = { value: bpm, kind: 'quick' }; tc[it.ref] = { bpm, kind: 'quick', date: new Date().toISOString().slice(0, 10) }; }
          if (!it.energy) it.energy = energyFromPcm(pcm, 11025);
          const pr = presenceDb(pcm, 11025);
          if (pr != null) it.presence_db = pr;
          heard.push([k, f]);
        } catch (e) { it.notes = [...(it.notes || []), `measure: ${e.message}`]; fs.rmSync(f, { force: true }); }
        r.items[k] = it;
      }
      // earshot's ears on the downloaded candidates: what it hears them nearest to (a generic corporate bed loses ground)
      if (heard.length && !args['no-listen']) {
        const near = listenFiles(heard.map(([, f]) => f), env);
        if (!Object.keys(near).length) console.log('note: earshot not found (python3 scripts/audio/kit.py where): the candidates are not listened to');
        for (const [k, f] of heard) if (Array.isArray(near[f])) r.items[k].listen = { near: near[f] };
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
    if (src === 'coverr') {
      const now = parseCoverr(await http(coverrItemUrl(it.id), { json: true }) || {})[0];
      if (!now || now.licence !== 'coverr') return { ok: false, why: `Coverr no longer lists it as a free published track (${(now?.notes || []).slice(1).join('; ') || 'the item is gone'})` };
      if (now.vocals || now.unfit) return { ok: false, why: now.notes.slice(1).join('; ') };
      const page = text(await http(L.seen.url, { ms: 40000 }) || '');
      for (const q of [L.seen.quote, L.seen.also]) {
        if (!page.includes(q)) return { ok: false, why: `the licence page ${L.seen.url} no longer says "${q}": read it, and record the track by hand (track.py add) if it still allows a film` };
      }
      return { ok: true, quote: `${L.seen.quote} ${L.seen.also}.`, url: L.seen.url };
    }
  } catch (e) { return { ok: false, why: `could not read its licence again (${e.message})` }; }
  return { ok: false, why: `no licence check for the catalog ${src}` };
}

/** The library's copy of a library track when it is still the file the library analysed (same sha256), else null. */
export function libraryCopy(it) {
  const f = it?.library?.file, sha = it?.library?.sha256;
  if (!f || !sha || !fs.existsSync(f)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') === sha ? f : null;
}

async function cmdPick(args, env = process.env) {
  const p = libraryPath(args, env);
  if (!p) {
    console.log('pick: no music library (--library PATH, $CINETIC_MUSIC_LIBRARY or ~/.cinetic/music-library.json); search the catalogs instead: node scripts/music.mjs search --mood "<words>"');
    return 1;
  }
  const tracks = readLibrary(p);
  const q = args.mood || args.query || args._.join(' ');
  if (!q.trim()) throw new Usage('pick needs --mood "<words>" (with --length <film s> and --bpm <lo-hi>)');
  const ws = words(q);
  const fmt = args.format || filmFormat();
  if (fmt && !['launch', 'other'].includes(fmt)) throw new Usage('--format is launch (or other)');
  const launch = fmt === 'launch';
  // the film's energy: --energy, else the brief's first library mood (calm words calm, driving words punchy), else a
  // launch's crisp
  const top = Object.entries(moodsOfWords(ws)).sort((x, y) => y[1] - x[1])[0]?.[0];
  const en = args.energy || (top ? ENERGIES[trackEnergy({ mood: top })] : launch ? 'crisp' : null);
  if (en && !ENERGIES.includes(en)) throw new Usage(`--energy is one of ${ENERGIES.join(', ')}`);
  // the dealt direction (deck.py, out/direction.json): its feel joins the brief's moods at a lower weight, its tempo is
  // the range when --bpm names none, and a track that ends the way it asks (ring, button) gains
  const dealt = args['no-direction'] ? null : dealtMusic();
  const moods = moodsOfWords(ws);
  if (dealt?.feel) for (const [m, w] of Object.entries(moodsOfWords(words(dealt.feel)))) moods[m] = (moods[m] || 0) + 0.6 * w;
  const dealtBpm = !args.bpm && dealt?.bpm && dealt.bpm.every(Number.isFinite) ? dealt.bpm : null;
  const want = { words: ws, moods, bpm: bpmRange(args.bpm) || dealtBpm || (launch ? LAUNCH_BPM : null), launch, launchBpm: launch && !args.bpm && !dealtBpm,
    energy: en ? ENERGIES.indexOf(en) : null, length: num(args.length, null, 1, 3600, 'length'), shortlist: shortlistRefs(), dealt };
  const limit = num(args.limit, 8, 1, 40, 'limit');
  const hist = readHistory(env);
  const { items, held } = rankLibrary(tracks, want, args['no-history'] ? {} : hist);
  const out = items.slice(0, limit);
  const notes = Object.keys(want.moods).length ? [] : [`no library mood in "${q}": the library's moods are ${LIB_MOODS.join(', ')} (and their words)`];
  if (want.launchBpm) notes.push(`a launch: ${LAUNCH_BPM.join('-')} BPM preferred (--bpm sets another range)`);
  if (dealt) notes.push(`the dealt direction${dealt.id ? ` (${dealt.id})` : ''}: "${dealt.feel}"${dealtBpm ? `, ${dealtBpm.join('-')} BPM` : ''}${dealt.ending ? `, ends on a ${dealt.ending}` : ''} (--no-direction leaves it out)`);
  const r = { query: { mood: q, kind: 'music', bpm: want.bpm, length: want.length, moods: want.moods, format: fmt || null, energy: en }, library: p, sources: ['library'], items: out, held, notes };
  if (!args['no-history'] && out.length) {
    hist.searches.push({ date: new Date().toISOString().slice(0, 10), kind: 'music', query: { mood: q, bpm: args.bpm || null, length: want.length, sources: ['library'] }, first: out[0].ref, offered: out.slice(0, 5).map((x) => x.ref) });
    writeHistory(hist, env);
  }
  const file = args.out || path.join('out', 'music', 'search.json');
  if (out.length) writeJson(file, r);
  if (args.json) { console.log(JSON.stringify(r, null, 1)); return out.length ? 0 : 1; }
  for (const n of notes) console.log(`note: ${n}`);
  if (!out.length) { console.log(`pick: nothing in the library fits${want.length ? ` a ${want.length} s film` : ''} that an earlier film has not used (${held.length} held back); search the catalogs: node scripts/music.mjs search --mood "${q}"`); return 1; }
  console.log(`pick: ${out.length} of ${tracks.length} library tracks for "${q}"${want.bpm ? ` at ${want.bpm.join('-')} BPM` : ''}${want.length ? `, film ${want.length} s` : ''} (${file})`);
  out.forEach((it, k) => console.log(row(it, k)));
  if (held.length) console.log(`held back (an earlier film used them): ${held.length}${held.length <= 4 ? `: ${held.map((h) => `${h.ref} "${h.title}"`).join(', ')}` : ''}`);
  console.log(`next: listen to the first three, then node scripts/music.mjs get '#n' --to <film>/audio/music (the library's copy when it holds one; the licence read again), then track.py analyze (with the --phase the cut line names)`);
  return 0;
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
  const local = libraryCopy(it); // a library track: its copy, when it is the file the library analysed (sha256)
  const ext = `.${(local && path.extname(local).slice(1).toLowerCase()) || audioExt(it.file_url) || (it.kind === 'music' ? 'mp3' : 'wav')}`;
  const dest = path.join(args.to, stem + ext);
  let d;
  if (local) {
    const buf = fs.readFileSync(local);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    d = { bytes: buf.length, sha256: it.library.sha256 };
  } else d = await download(it.file_url, dest, it.kind === 'music' ? 100000 : 2000, refererOf(it));
  const date = new Date().toISOString().slice(0, 10);
  const rec = licenceRecord(it, { file: path.basename(dest), sha256: d.sha256, bytes: d.bytes, date, seenQuote: v.quote, seenUrl: v.url, query: results?.query?.mood || null });
  const recPath = path.join(args.to, `${stem}.licence.json`);
  writeJson(recPath, rec);
  if (!args['no-history']) {
    const h = readHistory(env);
    h.used.push({ date, ref: it.ref, title: it.title, artist: it.artist || null, kind: it.kind, film: path.resolve(args.film || path.join(args.to, '..', '..')) });
    writeHistory(h, env);
  }
  console.log(`get: ${dest} (${(d.bytes / 1e6).toFixed(1)} MB${local ? ', the library\'s copy' : ''}) and ${recPath} (${L.name}, no credit needed; its licence read again now at ${v.url})`);
  if (it.plan?.text) console.log(`  cut points (the library's analysis): ${it.plan.text}`);
  if (it.kind === 'music') {
    // a muffled track (a low-passed pad) masks every effect over it and fails the sound gate: say so before the edit
    let pr = null;
    try { pr = presenceDb(decode(dest, 11025, 120), 11025); } catch { pr = null; }
    if (pr != null && pr < MUFFLED_DB) console.log(`  WARNING: this track is muffled (2-5 kHz ${pr} dB under the whole, under ${MUFFLED_DB}): every click sinks into it and score.py fails its bed; get another`);
  }
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
  pick     --mood "<words>" [--length <film s>] [--bpm 100-120] [--library PATH] [--limit 8]
           [--out out/music/search.json] [--json] [--no-history]      (rank a curated music library)
  sheet    [results.json] [--pick 1,2,3] [--measure] [--json]     (mood, tempo, length, energy curve)
  get      <#n|<source>:<id>> --to <film>/audio/music [--from results.json] [--name stem] [--film dir] [--no-history]
  history  [--json]        licences   (the licences, the catalogs, and why the others are not used)

Choose by the film's mood and pace (references/sound.md §5.5a gives the brief), audition three (sheet --measure,
then listen), keep one, never the last film's track: search holds it back, and never offers the same track first
twice in a row (~/.cinetic/music-history.json, or $CINETIC_HOME); a track an earlier film used is never
offered again. pick ranks a music library of analysed, listened tracks (--library, $CINETIC_MUSIC_LIBRARY or
~/.cinetic/music-library.json) by mood, length and tempo, with each track's cut points. get reads the item's licence again and writes
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
      case 'pick': return await cmdPick(args);
      case 'sheet': return await cmdSheet(args);
      case 'get': return await cmdGet(args);
      case 'history': return cmdHistory(args);
      case 'licences': case 'licenses': return cmdLicences();
      default: throw new Usage(`unknown command ${cmd}: search, pick, sheet, get, history, licences`);
    }
  } catch (e) {
    if (e instanceof Usage) { console.error(`${e.message}\n\n${USAGE}`); return 2; }
    console.error(`music.mjs: ${e.message}`); return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
