#!/usr/bin/env node
/**
 * assets.mjs: real photographs, footage, textures and art for a film, under licences that need no credit.
 *
 * A film made only of drawn shapes on a flat ground looks like a demo. Open collections hold the subject's
 * world (its places, materials, weather, tools, history) in photographs and footage that anyone may use,
 * and several of them ask for no credit at all. This finds them, lets you look before you choose, downloads
 * the chosen ones into the film, keeps a private licence record, and grades a set into one look.
 *
 *   node scripts/assets.mjs search "<query>" [--kind photo|video|texture|art] [--source all|<list>]
 *        [--orientation landscape|portrait|square] [--min-width 1600] [--colour blue|teal|mono|#2f6f8f]
 *        [--limit 8] [--allow-credit] [--out out/assets/<name>.json] [--json] [--no-check]
 *   node scripts/assets.mjs sheet <results.json | image files | folders> [--pick 1,4,7] [--scan 6] [--cols 4] [--cell 400] [--out x.png]
 *   node scripts/assets.mjs get <ref|#n>[,<ref|#n>...] --to <film>/public/assets [--from results.json] [--name stem]
 *        [--width 2400] [--res 1080] [--trim start,seconds] [--max-mb 150] [--allow-credit] [--record path]
 *   node scripts/assets.mjs grade <files...> [--look natural] [--strength 1] [--accent #hex] [--split-hue deg|#hex] [--focus x,y]
 *        [--aspect 16:9|none] [--width 2400] [--grain 0.3] [--out dir] [--trim start,seconds] [--speed 1] [--scrub] [--dry-run] [--no-check]
 *   node scripts/assets.mjs check <graded files...> [--accent #hex]
 *   node scripts/assets.mjs probe <files...> [--json]
 *   node scripts/assets.mjs looks | licences [--to <film>/public/assets]
 *
 * Sources without keys: Openverse (cc0 and public-domain marks only: StockSnap, the WordPress photo directory,
 * rawpixel, Flickr, museums), Wikimedia Commons (public domain and CC0 only, stills and video), NASA's image and
 * video library (public domain), the Art Institute of Chicago and The Metropolitan Museum of Art open access
 * (CC0), Mixkit stock video (its free licence; items under its restricted licence are refused). With a key in
 * the environment: PEXELS_API_KEY (photos and video), UNSPLASH_ACCESS_KEY (photos), PIXABAY_API_KEY (photos and
 * video). Keys are read from the environment only and never printed or written anywhere.
 *
 * Licences. The default takes only licences that need no credit: cc0, public domain, the Pexels, Unsplash and
 * Pixabay licences and Mixkit's free video licence, so a film never has to show credits. --allow-credit adds
 * CC BY (any version) and then writes the credit line into the record. Share-alike, non-commercial,
 * no-derivatives, Mixkit's restricted licence and unknown licences are always refused. `get` writes
 * <film>/assets/licences.json (source, licence, author, page, the licence as read): a private record kept
 * outside public/, never shown on screen.
 *
 * Grade. `natural` is the default and the film's look: every picture keeps its own colour and range; black
 * level and contrast move a quarter of the way toward the set's (never stretched past x1.3) and only the
 * strongest colours are held back a little, so the accent stays free for live data. `matte`, `silver` and
 * `night` (the median luma to about 0.18, warm colours drained) are whole-film looks too; `tint`, `duotone`
 * and `deep` are device looks for one shot (a whole film in one wash reads as a filter). --strength is how far
 * toward the look (0 = the picture as it is, 1 = the look); --chroma scales the colour after it.
 * After grading, the set is measured (`check` runs the same on any set): the share of neutral pixels (OKLCH
 * C < .03) must be at least 30 %, and no picture may show a banned colour region (orange/amber, beige/cream,
 * purple/violet, neon: the film's banned-hue test) on 0.5 % of a frame, or grade exits 3 with what to change;
 * frames more than half saturated, the pictures' own share of the accent's hue, a set under the film's
 * saturated floor (4.5 %), pictures that do not match the set and readable text or logos in the pictures
 * are reported as notes.
 *
 * Needs Node 18+ (built-in fetch); ffmpeg and ffprobe for sheet, grade, probe and --trim.
 * Exit codes: 0 done, 1 nothing usable / a step failed, 2 bad arguments, 3 the graded set is a colour wash.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const UA = 'cinetic-assets/1.2 (film imagery search; +https://github.com/Leonxlnx/cinetic)';
const AIC_HEADERS = { 'AIC-User-Agent': UA };
const CHECKED = '2026-10-24';

// ------------------------------------------------------------------------------------------------ licences
/**
 * Every licence the tool knows. `credit` = the licence asks for a credit; `refuse` = never usable in a film
 * (with the reason); `seen` = the licence as read on its own page (a short quote, kept in the record).
 */
export const LICENCES = {
  cc0: { name: 'CC0 1.0 (public domain dedication)', url: 'https://creativecommons.org/publicdomain/zero/1.0/', credit: false,
    seen: { quote: 'You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.', url: 'https://creativecommons.org/publicdomain/zero/1.0/' } },
  pd: { name: 'public domain', url: 'https://creativecommons.org/publicdomain/mark/1.0/', credit: false,
    seen: { quote: 'This work has been identified as being free of known restrictions under copyright law.', url: 'https://creativecommons.org/publicdomain/mark/1.0/' } },
  pexels: { name: 'Pexels License', url: 'https://www.pexels.com/license/', credit: false,
    limits: 'identifiable people never in a bad light; no unaltered resale; no endorsement or trademark use',
    seen: { quote: 'All photos and videos on Pexels are free to use. Attribution is not required.', url: 'https://www.pexels.com/license/' } },
  unsplash: { name: 'Unsplash License', url: 'https://unsplash.com/license', credit: false,
    limits: 'no unaltered resale; never compile the photos into a similar or competing service',
    seen: { quote: 'free, including for commercial purposes, without permission from or attributing the photographer or Unsplash', url: 'https://unsplash.com/license' } },
  pixabay: { name: 'Pixabay Content License', url: 'https://pixabay.com/service/license-summary/', credit: false,
    limits: 'no standalone resale; recognisable people, logos and brands need their own clearance',
    seen: { quote: 'Use Content without having to attribute the author (although giving credit is always appreciated by our community!)', url: 'https://pixabay.com/service/license-summary/' } },
  'mixkit-video': { name: 'Mixkit Stock Video Free License', url: 'https://mixkit.co/license/#videoFree', credit: false,
    limits: 'no standalone redistribution of the clip; the limits in Mixkit\'s user terms apply',
    seen: { quote: 'Items under the Mixkit Stock Video Free License can be used in your commercial and non-commercial projects, for free ... Attribution is not required', url: 'https://mixkit.co/license/modal/videoFree/' } },
  by: { name: 'CC BY', url: 'https://creativecommons.org/licenses/by/4.0/', credit: true },
  'by-sa': { name: 'CC BY-SA', credit: true, refuse: 'share-alike: a graded or combined film would have to carry the same licence' },
  'by-nc': { name: 'CC BY-NC', credit: true, refuse: 'non-commercial only: a launch or product film is commercial' },
  'by-nd': { name: 'CC BY-ND', credit: true, refuse: 'no derivatives: grading, cropping or cutting it is not allowed' },
  'by-nc-sa': { name: 'CC BY-NC-SA', credit: true, refuse: 'non-commercial and share-alike' },
  'by-nc-nd': { name: 'CC BY-NC-ND', credit: true, refuse: 'non-commercial, no derivatives' },
  'mixkit-restricted': { name: 'Mixkit Stock Video Restricted License', credit: false, refuse: 'personal projects only: never advertising, a company\'s posts or a film' },
  unknown: { name: 'unknown licence', credit: true, refuse: 'no licence a film can rely on' },
};
/** A source whose own page states the public-domain terms (read once; kept in the record instead of the generic mark). */
export const SOURCE_SEEN = {
  nasa: { quote: 'NASA content - images, audio, video, and media files ... generally are not subject to copyright in the United States.', url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    limits: 'no NASA insignia or logos, nothing that implies NASA endorses the product, identifiable people need their own clearance' },
};
/** The licences a film may use without showing a credit (the default). */
export const NO_CREDIT = ['cc0', 'pd', 'pexels', 'unsplash', 'pixabay', 'mixkit-video'];

/** May this licence go into the film? { ok, why } with --allow-credit adding CC BY. */
export function licenceAllowed(id, { allowCredit = false } = {}) {
  const L = LICENCES[id] || LICENCES.unknown;
  if (L.refuse) return { ok: false, why: L.refuse };
  if (!L.credit) return { ok: true, why: '' };
  if (id === 'by' && allowCredit) return { ok: true, why: 'credit required: the record carries the credit line' };
  return { ok: false, why: 'needs a credit on screen (pass --allow-credit to take CC BY and keep the credit line)' };
}

/** A Creative Commons code (cc0, pdm, by, by-sa-4.0, cc-by-nc ...) to a licence id. */
export function ccLicence(code) {
  const s = String(code || '').toLowerCase().trim().replace(/^cc[-_ ]?/, '').replace(/[ _]/g, '-');
  if (!s) return 'unknown';
  if (/^(0|zero)\b/.test(s) || s === 'cc0') return 'cc0';
  if (/^(pdm|pd|public-?domain)\b/.test(s)) return 'pd';
  const m = s.match(/^by(-nc)?(-sa|-nd)?(?:-[\d.]+)?$/);
  if (m) return `by${m[1] || ''}${m[2] || ''}`;
  return 'unknown';
}

/** Wikimedia Commons extmetadata (License, LicenseShortName, Restrictions) to { id, notes }. */
export function commonsLicence(meta = {}) {
  const l = String(meta.License || '').toLowerCase();
  const s = String(meta.LicenseShortName || '').toLowerCase();
  const notes = [];
  if (meta.Restrictions) notes.push(`restrictions named on the page (${String(meta.Restrictions).replace(/<[^>]+>/g, '').trim()}): read it before use`);
  let id = 'unknown';
  if (/^cc0|^cc-zero/.test(l) || /^cc0|cc zero/.test(s)) id = 'cc0';
  else if (/no (known )?(copyright )?restrictions/.test(s) || /no restrictions/.test(l)) {
    id = 'unknown';
    notes.push('"no known copyright restrictions" is a statement, not a licence: refused');
  } else if (/^pd\b|^pd-/.test(l) || /public domain/.test(s)) {
    id = 'pd';
    if (/^pd-us|pd-usgov/.test(l)) notes.push('public domain in the United States (a US government or pre-1930 work)');
  } else {
    const cc = l.match(/^cc-(by(?:-nc)?(?:-sa|-nd)?)(?:-|$)/) || s.match(/^cc (by(?:-nc)?(?:-sa|-nd)?)\b/);
    if (cc) id = cc[1];
  }
  return { id, notes };
}

/** NASA records: public domain unless the record names a third party's copyright. */
export function nasaLicence(d = {}) {
  const text = [d.description, d.photographer, d.secondary_creator, d.title, d.description_508].filter(Boolean).join(' ');
  if (/©|\(c\)\s*\d{4}|copyright|all rights reserved/i.test(text)) return { id: 'unknown', notes: ['the record names a copyright holder other than NASA: refused'] };
  const notes = ['public domain (US government work). In a promotional film: no NASA logos or insignia, no NASA people, nothing that implies endorsement'];
  if (/astronaut|crew member|portrait|\bcrew\b/i.test([d.title, ...(d.keywords || [])].join(' '))) notes.push('shows people: identifiable people need their own clearance in a commercial film');
  return { id: 'pd', notes };
}

// ------------------------------------------------------------------------------------------------ helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const short = (s, n) => { const t = String(s ?? ''); return t.length > n ? `${t.slice(0, n - 1).replace(/[\s,;:.-]+$/, '')}…` : t; };
const noQuery = (u) => (u ? String(u).split('?')[0] : u);
export function text(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
export function slug(s, words = 7) {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').slice(0, words).join('-').slice(0, 60).replace(/-+$/, '');
}
export const shapeOf = (w, h) => (!w || !h ? null : w / h >= 1.15 ? 'landscape' : w / h <= 0.87 ? 'portrait' : 'square');
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const clock = (s) => (s || s === 0 ? `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}` : '');
async function mapLimit(items, n, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k], k); } }));
  return out;
}
const QWORDS_SKIP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'and', 'or', 'for', 'with', 'from', 'to', 'by']);
export const queryWords = (q) => String(q).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w && !QWORDS_SKIP.has(w));
/** Does a record's own text carry the query (all words, or all but one of three or more)? */
export function onSubject(words, about) {
  if (!words.length) return true;
  const hay = String(about).toLowerCase();
  const hits = words.filter((w) => hay.includes(w) || (w.length > 4 && hay.includes(w.replace(/(es|s)$/, '')))).length;
  return hits >= (words.length >= 3 ? words.length - 1 : words.length);
}

/** Never let a key reach a message: strip key-like query parameters and Authorization values. */
export const redact = (s) => String(s).replace(/([?&](key|client_id|api_key|access_key)=)[^&\s]+/gi, '$1<hidden>').replace(/(Client-ID\s+)\S+/g, '$1<hidden>');

async function http(url, { ms = 25000, headers = {}, json = true } = {}) {
  for (let attempt = 1; ; attempt++) {
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html,*/*', ...headers }, signal: AbortSignal.timeout(ms), redirect: 'follow' }); }
    catch (e) {
      const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError';
      if (!timedOut && attempt < 2) { await sleep(800); continue; }
      throw new Error(timedOut ? `no answer within ${Math.round(ms / 1000)} s` : `could not connect (${e.cause?.code || 'network error'})`);
    }
    if ([502, 503, 504].includes(r.status) && attempt < 2) { await sleep(1200); continue; }
    if (r.status === 429) {
      const wait = Math.min(30, Number(r.headers.get('retry-after')) || 8 * attempt);
      if (attempt < 3) { r.body?.cancel().catch(() => {}); await sleep(wait * 1000); continue; }
      throw new Error('rate limited (HTTP 429): wait a minute or search another --source');
    }
    if (r.status === 401 || r.status === 403) throw new Error(`refused (HTTP ${r.status})${headers.Authorization ? ': check the key in the environment' : ''}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!json) return r.text();
    try { return await r.json(); } catch { throw new Error('the answer was not JSON'); }
  }
}
const getJson = (url, o = {}) => http(url, { ...o, json: true });
const getText = (url, o = {}) => http(url, { ...o, json: false });

// ------------------------------------------------------------------------------------------------ files
const IMAGE_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
const VIDEO_TYPES = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
/** The real type of a file from its first bytes: { ext, media } or null. */
export function sniff(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', media: 'image' };
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { ext: 'png', media: 'image' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', media: 'image' };
  if (b.toString('ascii', 0, 3) === 'GIF') return { ext: 'gif', media: 'image' };
  if (b.toString('ascii', 4, 8) === 'ftyp') {
    const brand = b.toString('ascii', 8, 12);
    if (/^avi[fs]/.test(brand)) return { ext: 'avif', media: 'image' };
    if (brand === 'qt  ') return { ext: 'mov', media: 'video' };
    return { ext: 'mp4', media: 'video' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ext: 'webm', media: 'video' };
  return null;
}
/** Width and height from the head of a JPEG, PNG, GIF or WebP. */
export function dims(b) {
  if (!b || b.length < 26) return {};
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && b.length >= 30) {
    const f = b.toString('ascii', 12, 16);
    if (f === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (f === 'VP8L') { const bits = b.readUInt32LE(21); return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) }; }
    if (f === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return {};
}
const imageHeaders = (url) => ({ 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,video/*,*/*;q=0.8', ...(/artic\.edu\//.test(url) ? AIC_HEADERS : {}) });
/** Range-read the head of a file: does it load, its real type, size and pixel dimensions. */
async function probeUrl(url, ms = 15000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { ...imageHeaders(url), Range: 'bytes=0-262143' }, signal: ac.signal, redirect: 'follow' });
    if (!r.ok) { r.body?.cancel().catch(() => {}); return { ok: false, why: `HTTP ${r.status}` }; }
    const reader = r.body.getReader(); const chunks = []; let n = 0;
    while (n < 262144) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
    reader.cancel().catch(() => {});
    const head = Buffer.concat(chunks);
    const kind = sniff(head);
    if (!kind) return { ok: false, why: 'not an image or video file' };
    const bytes = r.status === 206 ? Number((r.headers.get('content-range') || '').split('/')[1]) || null : Number(r.headers.get('content-length')) || null;
    return { ok: true, ...kind, bytes, ...(kind.media === 'image' ? dims(head) : {}) };
  } catch (e) { return { ok: false, why: e.name === 'AbortError' ? 'timed out' : 'could not load' }; }
  finally { clearTimeout(t); }
}

// ------------------------------------------------------------------------------------------------ items
/** One candidate, the same shape from every source. */
export function item(source, id, fields = {}) {
  return { ref: `${source}:${id}`, source, provider: SOURCES[source]?.name ?? source, kind: 'photo', title: '', author: '', authorUrl: null, page: null,
    thumb: null, image: null, width: null, height: null, bytes: null, duration: null, fps: null, licence: 'unknown', licenceVersion: null, notes: [], tags: [], ...fields };
}
export const SOURCES = {
  openverse: { name: 'Openverse', kinds: ['photo', 'texture', 'art'], keyless: true },
  commons: { name: 'Wikimedia Commons', kinds: ['photo', 'texture', 'video'], keyless: true },
  nasa: { name: 'NASA Image and Video Library', kinds: ['photo', 'texture', 'video'], keyless: true },
  aic: { name: 'Art Institute of Chicago', kinds: ['art'], keyless: true },
  met: { name: 'The Metropolitan Museum of Art', kinds: ['art'], keyless: true },
  mixkit: { name: 'Mixkit', kinds: ['video'], keyless: true },
  pexels: { name: 'Pexels', kinds: ['photo', 'texture', 'video'], env: 'PEXELS_API_KEY' },
  unsplash: { name: 'Unsplash', kinds: ['photo', 'texture'], env: 'UNSPLASH_ACCESS_KEY' },
  pixabay: { name: 'Pixabay', kinds: ['photo', 'texture', 'video'], env: 'PIXABAY_API_KEY' },
};
const OPENVERSE_PROVIDERS = { flickr: 'Flickr', wikimedia: 'Wikimedia Commons', stocksnap: 'StockSnap', wordpress: 'WordPress Photo Directory', rawpixel: 'rawpixel',
  met: 'The Metropolitan Museum of Art', nypl: 'New York Public Library', clevelandmuseum: 'Cleveland Museum of Art', brooklynmuseum: 'Brooklyn Museum',
  smithsonian: 'Smithsonian', sciencemuseum: 'Science Museum Group', europeana: 'Europeana', nappy: 'Nappy', geographorguk: 'Geograph' };
const hasKey = (src) => !SOURCES[src].env || Boolean(process.env[SOURCES[src].env]);
const key = (src) => process.env[SOURCES[src].env] || '';

// ---------- Openverse
export function openverseUrl(q, o) {
  const lic = (o.allowCredit ? ['cc0', 'pdm', 'by'] : ['cc0', 'pdm']).join(',');
  const p = new URLSearchParams({ q, license: lic, page_size: String(Math.min(20, Math.max(12, o.limit * 3))), mature: 'false' }); // anonymous calls take at most 20
  p.set('category', o.kind === 'art' ? 'digitized_artwork,illustration' : 'photograph');
  if (o.orientation) p.set('aspect_ratio', { landscape: 'wide', portrait: 'tall', square: 'square' }[o.orientation]);
  if (o.minWidth >= 1000) p.set('size', 'large');
  return `https://api.openverse.org/v1/images/?${p}`;
}
export function parseOpenverse(j, o = {}) {
  return (j?.results || []).map((r) => {
    const via = String(r.source || r.provider || '');
    return item('openverse', r.id, {
      kind: o.kind || 'photo', provider: `Openverse / ${OPENVERSE_PROVIDERS[via] || (via.startsWith('smithsonian') ? 'Smithsonian' : via.replace(/_/g, ' ') || 'Openverse')}`,
      title: text(r.title).replace(/^File:/, '').replace(/\.(jpe?g|png|tiff?|gif|webp)$/i, '') || 'Untitled', author: text(r.creator), authorUrl: r.creator_url || null,
      page: r.foreign_landing_url || r.detail_url || null, thumb: r.thumbnail || null, image: r.url || null, width: r.width || null, height: r.height || null,
      bytes: r.filesize || null, licence: ccLicence(r.license), licenceVersion: r.license_version || null, tags: (r.tags || []).map((t) => t.name).slice(0, 12),
    });
  }).filter((it) => it.image);
}
async function searchOpenverse(q, o) {
  const items = parseOpenverse(await getJson(openverseUrl(q, o), { ms: 40000 }), o);
  await commonsSizes(items.filter((it) => /upload\.wikimedia\.org/.test(it.image || '')), o.width);
  return items;
}
// Openverse points at Wikimedia originals (often huge or TIFF): use a web-sized rendition instead.
async function commonsSizes(items, width) {
  if (!items.length) return;
  const title = (it) => { let n = noQuery(it.image).split('/').pop(); try { n = decodeURIComponent(n); } catch { /* keep */ } return `File:${n.replace(/_/g, ' ')}`; };
  const j = await getJson(commonsApi({ titles: items.map(title).join('|'), prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: String(width) })).catch(() => null);
  const pages = new Map((j?.query?.pages || []).map((pg) => [pg.title, pg.imageinfo?.[0]]));
  const norm = new Map((j?.query?.normalized || []).map((x) => [x.from, x.to]));
  for (const it of items) { const ii = pages.get(norm.get(title(it)) || title(it)); if (ii?.thumburl) { it.image = noQuery(ii.thumburl); it.thumb = commonsThumb(ii.thumburl); } }
}

// ---------- Wikimedia Commons
export function commonsApi(params) { return `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params })}`; }
const COMMONS_META = 'ObjectName|Artist|LicenseShortName|License|LicenseUrl|Restrictions|DateTimeOriginal|ImageDescription';
/** Licence templates a credit-free file carries: one search each (most files on Commons are share-alike). */
export const COMMONS_TEMPLATES = ['Cc-zero', 'PD-self', 'PD-USGov', 'PD-old'];
export function commonsUrl(q, o, template = null) {
  const video = o.kind === 'video';
  let s = `${q} filetype:${video ? 'video' : 'bitmap'}`;
  if (!video && o.minWidth > 1) s += ` filew:>${o.minWidth - 1}`;
  if (template) s += ` hastemplate:${template}`;
  return commonsApi({ generator: 'search', gsrnamespace: '6', gsrsearch: s, gsrlimit: template ? '20' : '40', prop: video ? 'imageinfo|videoinfo' : 'imageinfo',
    iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(video ? 1280 : o.width || 2400), iiextmetadatafilter: COMMONS_META, iiextmetadatalanguage: 'en', ...(video ? { viprop: 'derivatives' } : {}) });
}
/**
 * A Commons ref is the page id search prints (commons:12345) or the file's title, as a film often knows a
 * famous file by name (commons:File:Waves_009.jpg, commons:"File:Waves 009.jpg"; underscores or spaces).
 */
export function commonsRefParam(id) {
  const v = decodeURIComponent(String(id)).trim();
  if (/^\d+$/.test(v)) return { pageids: v };
  const t = v.replace(/^(file|image):/i, '').replace(/_/g, ' ').trim();
  if (!t) throw new Usage('a Commons ref is commons:<page id> or commons:File:<name>');
  return { titles: `File:${t}` };
}
/** Commons serves fixed thumbnail steps; 500 px is one of them (the sheet's preview size). */
export const commonsThumb = (u) => {
  if (!u) return null;
  const v = noQuery(u);
  if (/\/\d+px-[^/]+$/.test(v)) return v.replace(/\/(\d+)px-([^/]+)$/, '/500px-$2');
  const m = v.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(?:jpe?g|png|webp|gif))$/i);
  return m ? `${m[1]}/thumb/${m[2]}/${m[3]}/500px-${m[3]}` : v; // an original: its 500 px thumbnail
};
export function parseCommons(j, o = {}) {
  const pages = (j?.query?.pages || []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map((pg) => {
    const ii = pg?.imageinfo?.[0]; if (!ii) return null;
    const m = (k) => text(ii.extmetadata?.[k]?.value);
    const lic = commonsLicence({ License: m('License'), LicenseShortName: m('LicenseShortName'), Restrictions: m('Restrictions') });
    const video = /^video\//.test(ii.mime || '') || o.kind === 'video';
    const it = item('commons', pg.pageid, {
      kind: video ? 'video' : o.kind || 'photo', title: m('ObjectName').replace(/\s*\b(?:title|label) QS:.*$/s, '').replace(/^"|"$/g, '') || String(pg.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''),
      author: short(m('Artist'), 80), page: ii.descriptionurl || null, width: ii.width || null, height: ii.height || null, bytes: ii.size || null,
      duration: Number(ii.duration) || null, licence: lic.id, notes: lic.notes,
    });
    if (video) {
      const ders = (pg.videoinfo?.[0]?.derivatives || []).map((d) => ({ url: noQuery(d.src), type: String(d.type || '').split(';')[0], w: Number(d.width) || null, h: Number(d.height) || null }));
      const pick = pickRendition(ders.filter((d) => /video\/(mp4|webm)/.test(d.type)), o.res || 1080);
      if (!pick) return null;
      Object.assign(it, { image: pick.url, renditions: ders, thumb: ii.thumburl ? noQuery(ii.thumburl) : null });
    } else {
      const tw = Number(String(ii.thumburl || '').match(/\/(\d+)px-[^/]+$/)?.[1]) || 0;
      it.image = ii.thumburl && tw && tw < (ii.width || 0) ? noQuery(ii.thumburl) : noQuery(ii.url);
      it.thumb = commonsThumb(ii.thumburl || ii.url);
    }
    return it;
  }).filter(Boolean);
}
/** Of a list of renditions, the largest whose short side is at most `res` (else the smallest). */
export function pickRendition(list, res = 1080) {
  const side = (r) => (r.w && r.h ? Math.min(r.w, r.h) : Infinity);
  const fit = list.filter((r) => r.url && side(r) <= res).sort((a, b) => side(b) - side(a));
  return fit[0] || list.filter((r) => r.url).sort((a, b) => side(a) - side(b))[0] || null;
}
async function searchCommons(q, o) {
  const temps = o.allowCredit ? [null] : COMMONS_TEMPLATES;
  const all = await Promise.all(temps.map((t) => getJson(commonsUrl(q, o, t)).then((j) => parseCommons(j, o)).catch(() => [])));
  const seen = new Set();
  return interleave(all, 40).map(({ n, ...it }) => it).filter((it) => !seen.has(it.ref) && seen.add(it.ref));
}

// ---------- NASA
export const nasaSearchUrl = (q, o) => `https://images-api.nasa.gov/search?${new URLSearchParams({ q, media_type: o.kind === 'video' ? 'video' : 'image', page_size: String(Math.min(100, o.limit * 4 + 8)) })}`;
export function parseNasaSearch(j, o = {}) {
  const words = queryWords(o.query || '');
  return (j?.collection?.items || []).map((x) => {
    const d = x?.data?.[0]; if (!d?.nasa_id) return null;
    if (!onSubject(words, [d.title, d.description, ...(d.keywords || [])].join(' '))) return null;
    const lic = nasaLicence(d);
    return item('nasa', encodeURIComponent(d.nasa_id), {
      kind: d.media_type === 'video' ? 'video' : o.kind === 'video' ? 'video' : o.kind || 'photo', title: text(d.title) || d.nasa_id,
      author: text(d.photographer || d.secondary_creator) || `NASA${d.center ? ` ${d.center}` : ''}`, page: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`,
      thumb: (x.links || []).find((l) => /thumb|preview/.test(`${l.rel} ${l.href}`))?.href || x.links?.[0]?.href || null, manifest: x.href || null,
      licence: lic.id, notes: lic.notes, tags: (d.keywords || []).slice(0, 12), date: String(d.date_created || '').slice(0, 10) || null,
    });
  }).filter(Boolean);
}
const nasaHref = (u) => (u ? encodeURI(String(u).replace(/^http:/, 'https:')).replace(/%25([0-9a-f]{2})/gi, '%$1') : null);
/** A NASA asset manifest (a list of file URLs) to the renditions of one item. */
export function parseNasaManifest(files, kind = 'photo') {
  const list = (Array.isArray(files) ? files : (files?.collection?.items || []).map((f) => f.href)).map(String);
  const find = (s) => nasaHref(list.find((f) => f.endsWith(s)));
  if (kind === 'video') {
    const r = [['~orig.mp4', null, null], ['~large.mp4', 1920, 1080], ['~medium.mp4', 1280, 720], ['~small.mp4', 640, 360], ['~mobile.mp4', 320, 180]]
      .map(([s, w, h]) => ({ url: find(s), type: 'video/mp4', w, h, orig: s === '~orig.mp4' })).filter((x) => x.url);
    return { renditions: r, poster: find('~large.jpg') || find('~medium.jpg') || find('~thumb.jpg') };
  }
  return { orig: find('~orig.jpg') || find('~orig.png'), large: find('~large.jpg'), medium: find('~medium.jpg'), small: find('~small.jpg'), thumb: find('~thumb.jpg') };
}
async function searchNasa(q, o) {
  const items = parseNasaSearch(await getJson(nasaSearchUrl(q, o)), { ...o, query: q }).slice(0, o.limit * 2 + 4);
  await mapLimit(items, 6, async (it) => {
    const m = await getJson(nasaHref(it.manifest), { ms: 15000 }).catch(() => null);
    if (!m) return;
    const r = parseNasaManifest(m, it.kind);
    if (it.kind === 'video') { const pick = pickRendition(r.renditions.filter((x) => !x.orig), o.res || 1080); if (pick) Object.assign(it, { image: pick.url, renditions: r.renditions, thumb: r.poster || it.thumb, width: pick.w, height: pick.h }); }
    else { it.image = (o.width > 1600 ? r.orig : null) || r.large || r.medium; it.original = r.orig; it.thumb = r.small || r.thumb || it.thumb; }
  });
  return items.filter((it) => it.image);
}

// ---------- Art Institute of Chicago
const AIC_FIELDS = ['id', 'title', 'artist_title', 'artist_display', 'date_display', 'image_id', 'thumbnail', 'medium_display', 'artwork_type_title', 'is_public_domain'];
export function aicUrl(q, o) {
  const words = queryWords(q);
  return `https://api.artic.edu/api/v1/artworks/search?params=${encodeURIComponent(JSON.stringify({
    query: { bool: { must: [{ multi_match: { query: words.join(' ') || q, type: 'cross_fields', operator: 'and', fields: ['title^3', 'subject_titles^2', 'term_titles^2', 'classification_titles', 'medium_display', 'artist_title', 'place_of_origin'] } }],
      filter: [{ term: { is_public_domain: true } }, { exists: { field: 'image_id' } }] } }, fields: AIC_FIELDS, limit: Math.min(40, o.limit * 3) }))}`;
}
export function parseAic(j, o = {}) {
  const iiif = j?.config?.iiif_url || 'https://www.artic.edu/iiif/2';
  return (j?.data || []).map((d) => {
    if (!d?.image_id || d.is_public_domain === false) return null;
    const W = d.thumbnail?.width || null; const H = d.thumbnail?.height || null;
    const cap = W ? Math.min(W, 3000) : 3000; const w = Math.min(o.width || 2400, cap);
    return item('aic', d.id, { kind: 'art', title: text(d.title) || 'Untitled', author: text(d.artist_title) || text(String(d.artist_display || '').split('\n')[0]),
      page: `https://www.artic.edu/artworks/${d.id}`, thumb: `${iiif}/${d.image_id}/full/400,/0/default.jpg`, image: `${iiif}/${d.image_id}/full/${w},/0/default.jpg`,
      width: W && H ? w : null, height: W && H ? Math.round((H * w) / W) : null, full: W && H ? [W, H] : null, licence: 'cc0', tags: [text(d.artwork_type_title), text(d.medium_display)].filter(Boolean) });
  }).filter(Boolean);
}
async function searchAic(q, o) { return parseAic(await getJson(aicUrl(q, o), { headers: AIC_HEADERS }), o); }
/**
 * AIC's IIIF server renders a width it has ready and answers any other with a redirect to its 843 px default, so a
 * plain fetch saves 843 px whatever the record says. The widths to try, largest first: the asked width within the
 * original, AIC's 1686 px large size, 843. Pure.
 */
export const aicWidths = (asked, original = null) => {
  const top = Math.max(1, Math.round(Math.min(asked, original || asked)));
  return [...new Set([top, 1686, 843])].filter((w) => w <= top).sort((a, b) => b - a);
};
/**
 * The largest width AIC serves for an item, asked without following its redirect; sets the item's image, width and
 * height to it and returns the width (null when no answer came: the item is left as it was). `f` is fetch.
 */
export async function aicServe(it, asked, f = fetch) {
  const base = String(it.image || '').replace(/\/full\/[^/]+\/0\/default\.jpg$/, '');
  const [W, H] = it.full || [null, null];
  for (const w of aicWidths(asked, W)) {
    const url = `${base}/full/${w},/0/default.jpg`;
    const r = await f(url, { headers: imageHeaders(url), redirect: 'manual', signal: AbortSignal.timeout(30000) }).catch(() => null);
    if (r?.body) r.body.cancel().catch(() => {});
    if (r && r.status >= 200 && r.status < 300) {
      Object.assign(it, { image: url, width: w, height: W && H ? Math.round((H * w) / W) : it.height });
      return w;
    }
  }
  return null;
}

// ---------- The Met
export const metSearchUrl = (q, o) => `https://collectionapi.metmuseum.org/public/collection/v1.1/search?${new URLSearchParams({ q, hasImages: 'true', limit: String(Math.min(40, o.limit * 4 + 8)), offset: '0' })}`;
export const metObjectUrl = (id) => `https://collectionapi.metmuseum.org/public/collection/v1/objects/${encodeURIComponent(id)}`;
export function parseMetObject(x, o = {}) {
  if (!x || !x.isPublicDomain || !x.primaryImage) return null;
  const words = queryWords(o.query || '');
  const about = [x.title, x.objectName, x.medium, x.classification, x.culture, x.period, x.artistDisplayName, x.department, ...(x.tags || []).map((t) => t.term)].filter(Boolean).join(' ');
  if (o.query && !onSubject(words, about)) return null;
  const fix = (u) => (u ? encodeURI(u).replace(/%25([0-9a-f]{2})/gi, '%$1') : null);
  return item('met', x.objectID, { kind: 'art', title: text(x.title) || text(x.objectName) || 'Untitled', author: text(x.artistDisplayName) || (x.culture ? `${text(x.culture)} maker` : ''),
    page: x.objectURL || null, thumb: fix(x.primaryImageSmall) || fix(x.primaryImage), image: fix(x.primaryImage), licence: 'cc0', tags: (x.tags || []).map((t) => t.term).slice(0, 12) });
}
async function searchMet(q, o) {
  const s = await getJson(metSearchUrl(q, o));
  const ids = (s.objectIDs || []).slice(0, o.limit * 4 + 8);
  const objs = await mapLimit(ids, 8, (id) => getJson(metObjectUrl(id), { ms: 15000 }).catch(() => null));
  return objs.map((x) => parseMetObject(x, { ...o, query: q })).filter(Boolean);
}

// ---------- Mixkit (stock video, scraped from its public pages: it has no API)
export const mixkitUrl = (q, page = 1) => `https://mixkit.co/free-stock-video/discover/${slug(q, 6)}/${page > 1 ? `?page=${page}` : ''}`;
/** Mixkit's grid page to items (id, title, preview); the licence is read from each item's own page. */
export function parseMixkitList(html) {
  const out = []; const seen = new Set();
  const re = /data-item-grid--video-player-item-id-value="(\d+)"[\s\S]*?<img src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<video src="([^"]+)"[\s\S]*?<a href="(\/free-stock-video\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const [, id, thumb, alt, preview, href] = m;
    if (seen.has(id)) continue; seen.add(id);
    out.push(item('mixkit', id, { kind: 'video', title: text(alt).replace(/\.$/, ''), page: `https://mixkit.co${href}`, thumb: thumb.replace('-thumb-360-0', '-thumb-720-0'),
      preview, image: `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`, licence: 'unknown', notes: ['licence not read yet'] }));
  }
  return out;
}
/** A Mixkit item page: its licence (free or restricted), length and renditions. */
export function parseMixkitItem(html, id) {
  const notice = (html.match(/"copyrightNotice":"([^"]*)"/) || [])[1] || '';
  const link = (html.match(/href="\/license\/#(video[A-Za-z]+)"/) || [])[1] || '';
  let licence = 'unknown';
  if (/restricted/i.test(notice) || link === 'videoRestricted') licence = 'mixkit-restricted';
  else if (/^free$/i.test(notice) || link === 'videoFree' || /Mixkit Stock Video Free License/.test(html)) licence = 'mixkit-video';
  const dur = (html.match(/"duration":"PT(\d+)M(\d+)S"/) || []);
  const res = [...html.matchAll(/download-resolution">\s*(\d+)\s*x\s*(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const big = res.sort((a, b) => b[0] * b[1] - a[0] * a[1])[0] || [1920, 1080];
  const portrait = big[1] > big[0];
  const has1080 = /type=1080p/.test(html) || res.some(([a, b]) => Math.max(a, b) >= 1920);
  const renditions = [{ url: `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`, type: 'video/mp4', w: portrait ? 720 : 1280, h: portrait ? 1280 : 720 }];
  if (has1080) renditions.push({ url: `https://assets.mixkit.co/videos/${id}/${id}-1080.mp4`, type: 'video/mp4', w: portrait ? 1080 : 1920, h: portrait ? 1920 : 1080 });
  return { licence, duration: dur.length ? Number(dur[1]) * 60 + Number(dur[2]) : null, renditions, title: text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '') };
}
async function searchMixkit(q, o) {
  const items = parseMixkitList(await getText(mixkitUrl(q))).slice(0, o.limit + 4);
  await mapLimit(items, 2, async (it, k) => {
    await sleep(300 * (k % 2)); // gentle on a site without an API
    const html = await getText(it.page, { ms: 20000 }).catch(() => null);
    if (!html) return;
    const r = parseMixkitItem(html, it.ref.split(':')[1]);
    const pick = pickRendition(r.renditions, o.res || 1080);
    Object.assign(it, { licence: r.licence, duration: r.duration, renditions: r.renditions, image: pick.url, width: pick.w, height: pick.h, notes: [] });
  });
  return items;
}

// ---------- keyed sources (only with their key in the environment)
export const pexelsUrl = (q, o) => (o.kind === 'video'
  ? `https://api.pexels.com/videos/search?${new URLSearchParams({ query: q, per_page: String(Math.min(40, o.limit * 2)), ...(o.orientation ? { orientation: o.orientation } : {}), size: 'large' })}`
  : `https://api.pexels.com/v1/search?${new URLSearchParams({ query: q, per_page: String(Math.min(40, o.limit * 2)), ...(o.orientation ? { orientation: o.orientation } : {}), ...(o.colour ? { color: o.colour.native } : {}), size: o.minWidth >= 1600 ? 'large' : 'medium' })}`);
export function parsePexels(j, o = {}) {
  if (o.kind === 'video') {
    return (j?.videos || []).map((v) => {
      const files = (v.video_files || []).filter((f) => f.file_type === 'video/mp4').map((f) => ({ url: f.link, type: 'video/mp4', w: f.width, h: f.height, fps: f.fps }));
      const pick = pickRendition(files, o.res || 1080);
      return pick && item('pexels', v.id, { kind: 'video', title: slug(String(v.url || '').split('/').filter(Boolean).pop() || `pexels ${v.id}`).replace(/-\d+$/, '').replace(/-/g, ' '),
        author: v.user?.name || '', authorUrl: v.user?.url || null, page: v.url, thumb: v.image, image: pick.url, renditions: files, width: pick.w, height: pick.h, fps: pick.fps || null, duration: v.duration || null, licence: 'pexels' });
    }).filter(Boolean);
  }
  return (j?.photos || []).map((p) => {
    const w = o.width || 2400;
    const image = p.src?.original ? `${noQuery(p.src.original)}?auto=compress&cs=tinysrgb&w=${w}` : p.src?.large2x;
    return item('pexels', p.id, { kind: o.kind || 'photo', title: p.alt || `pexels ${p.id}`, author: p.photographer || '', authorUrl: p.photographer_url || null, page: p.url,
      thumb: p.src?.medium || p.src?.small, image, width: p.width, height: p.height, licence: 'pexels', colour: p.avg_color || null });
  });
}
async function searchPexels(q, o) { return parsePexels(await getJson(pexelsUrl(q, o), { headers: { Authorization: key('pexels') } }), o); }

const UNSPLASH_COLOURS = ['black_and_white', 'black', 'white', 'yellow', 'orange', 'red', 'purple', 'magenta', 'green', 'teal', 'blue'];
export const unsplashUrl = (q, o) => `https://api.unsplash.com/search/photos?${new URLSearchParams({ query: q, per_page: String(Math.min(30, o.limit * 2)), content_filter: 'high',
  ...(o.orientation ? { orientation: o.orientation === 'square' ? 'squarish' : o.orientation } : {}), ...(o.colour && UNSPLASH_COLOURS.includes(o.colour.unsplash) ? { color: o.colour.unsplash } : {}) })}`;
export function parseUnsplash(j, o = {}) {
  return (j?.results || []).map((p) => item('unsplash', p.id, { kind: o.kind || 'photo', title: p.alt_description || p.description || `unsplash ${p.id}`, author: p.user?.name || '',
    authorUrl: p.user?.links?.html || null, page: p.links?.html || null, thumb: p.urls?.small || p.urls?.thumb, image: p.urls?.raw ? `${p.urls.raw}&w=${o.width || 2400}&q=85&fm=jpg&fit=max` : p.urls?.full,
    width: p.width, height: p.height, licence: 'unsplash', colour: p.color || null, downloadLocation: p.links?.download_location || null }));
}
async function searchUnsplash(q, o) { return parseUnsplash(await getJson(unsplashUrl(q, o), { headers: { Authorization: `Client-ID ${key('unsplash')}`, 'Accept-Version': 'v1' } }), o); }

export const pixabayUrl = (q, o, k = '') => (o.kind === 'video'
  ? `https://pixabay.com/api/videos/?${new URLSearchParams({ key: k, q, per_page: String(Math.min(50, Math.max(3, o.limit * 2))), safesearch: 'true' })}`
  : `https://pixabay.com/api/?${new URLSearchParams({ key: k, q, image_type: 'photo', per_page: String(Math.min(50, Math.max(3, o.limit * 2))), safesearch: 'true', min_width: String(o.minWidth || 0),
    ...(o.orientation === 'landscape' ? { orientation: 'horizontal' } : o.orientation === 'portrait' ? { orientation: 'vertical' } : {}), ...(o.colour?.pixabay ? { colors: o.colour.pixabay } : {}) })}`);
export function parsePixabay(j, o = {}) {
  if (o.kind === 'video') {
    return (j?.hits || []).map((h) => {
      const files = ['large', 'medium', 'small', 'tiny'].map((k) => h.videos?.[k]).filter((v) => v?.url).map((v) => ({ url: v.url, type: 'video/mp4', w: v.width, h: v.height, bytes: v.size }));
      const pick = pickRendition(files, o.res || 1080);
      return pick && item('pixabay', h.id, { kind: 'video', title: h.tags || `pixabay ${h.id}`, author: h.user || '', page: h.pageURL, thumb: h.videos?.medium?.thumbnail || h.videos?.small?.thumbnail || null,
        image: pick.url, renditions: files, width: pick.w, height: pick.h, bytes: pick.bytes || null, duration: h.duration || null, licence: 'pixabay' });
    }).filter(Boolean);
  }
  return (j?.hits || []).map((h) => item('pixabay', h.id, { kind: o.kind || 'photo', title: h.tags || `pixabay ${h.id}`, author: h.user || '', page: h.pageURL, thumb: h.webformatURL || h.previewURL,
    image: h.largeImageURL || h.webformatURL, width: h.imageWidth, height: h.imageHeight, licence: 'pixabay' }));
}
async function searchPixabay(q, o) { return parsePixabay(await getJson(pixabayUrl(q, o, key('pixabay'))), o); }

const RUNNERS = { openverse: searchOpenverse, commons: searchCommons, nasa: searchNasa, aic: searchAic, met: searchMet, mixkit: searchMixkit, pexels: searchPexels, unsplash: searchUnsplash, pixabay: searchPixabay };

// ------------------------------------------------------------------------------------------------ colour
const HUES = { red: 25, yellow: 100, green: 145, teal: 190, cyan: 200, blue: 250, pink: 355 };
/** A --colour value to native filters and a target for thumbnail scoring. */
export function colourOf(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (['mono', 'bw', 'black_and_white', 'grey', 'gray', 'greyscale', 'grayscale'].includes(s)) return { name: 'mono', mono: true, native: 'gray', unsplash: 'black_and_white', pixabay: 'grayscale' };
  if (/^#?[0-9a-f]{6}$/.test(s)) { const hex = s.startsWith('#') ? s : `#${s}`; const [, C, h] = hexToOklch(hex); return { name: hex, hue: h, chroma: C, native: hex.slice(1), unsplash: nearestNamed(h), pixabay: nearestPixabay(h) }; }
  if (HUES[s] !== undefined) return { name: s, hue: HUES[s], native: s, unsplash: s === 'cyan' ? 'teal' : s, pixabay: s === 'teal' || s === 'cyan' ? 'turquoise' : s };
  throw new Error(`--colour ${v}: use mono, red, yellow, green, teal, cyan, blue, pink or a #hex`);
}
const nearestNamed = (h) => Object.entries({ red: 25, yellow: 100, green: 145, teal: 190, blue: 250 }).sort((a, b) => hueDist(a[1], h) - hueDist(b[1], h))[0][0];
const nearestPixabay = (h) => ({ red: 'red', yellow: 'yellow', green: 'green', teal: 'turquoise', blue: 'blue' })[nearestNamed(h)];
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/** Share of an RGB pixel grid that carries the colour (or reads as mono). */
export function colourScore(rgb, target) {
  let hit = 0; let n = 0;
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const [, C, h] = rgbToOklch(rgb[i], rgb[i + 1], rgb[i + 2]); n++;
    if (target.mono ? C < 0.035 : C >= 0.04 && hueDist(h, target.hue) <= 35) hit++;
  }
  return n ? hit / n : 0;
}

// sRGB <-> OKLab / OKLCH (for grades and colour scoring)
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function rgbToOklab(r, g, b) {
  const R = toLin(r); const G = toLin(g); const B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function rgbToOklch(r, g, b) { const [L, a, bb] = rgbToOklab(r, g, b); return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360]; }
export function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3; const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3; const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s; const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s; const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [R, G, B].map((c) => toGam(c));
}
/** OKLCH to sRGB 0..1, chroma reduced until it fits the gamut. */
export function oklchToRgb(L, C, h) {
  for (let c = C; c >= 0; c -= 0.002) {
    const rgb = oklabToRgb(L, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180));
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return rgb.map((v) => Math.min(1, Math.max(0, v)));
  }
  return oklabToRgb(L, 0, 0).map((v) => Math.min(1, Math.max(0, v)));
}
export function hexToOklch(hex) { const n = parseInt(String(hex).replace('#', ''), 16); return rgbToOklch((n >> 16) & 255, (n >> 8) & 255, n & 255); }
export const rgbHex = (rgb) => `#${rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;

// ------------------------------------------------------------------------------------------------ search
export function parseArgs(argv) {
  const VALUED = new Set(['kind', 'source', 'orientation', 'min-width', 'colour', 'color', 'limit', 'out', 'pick', 'cols', 'cell', 'to', 'from', 'name', 'width', 'res', 'trim', 'max-mb',
    'record', 'look', 'accent', 'split-hue', 'focus', 'aspect', 'grain', 'speed', 'fps', 'suffix', 'strength', 'chroma', 'scan']);
  const FLAGS = new Set(['allow-credit', 'json', 'no-check', 'dry-run', 'help', 'force', 'keep', 'scrub', 'brand-supplied', 'no-text']);
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') { args.help = true; continue; }
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const eq = a.indexOf('=');
    const k = a.slice(2, eq === -1 ? undefined : eq);
    if (VALUED.has(k)) {
      const v = eq === -1 ? argv[++i] : a.slice(eq + 1);
      if (v === undefined || v === '' || (eq === -1 && v.startsWith('--'))) throw new Usage(`--${k} needs a value`);
      args[k === 'color' ? 'colour' : k] = v;
    } else if (FLAGS.has(k)) args[k] = true;
    else throw new Usage(`unknown option --${k}`);
  }
  return args;
}
export class Usage extends Error {}
const num = (args, k, def, lo, hi) => {
  if (args[k] === undefined) return def;
  const n = Number(args[k]);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new Usage(`--${k} must be a number from ${lo} to ${hi}`);
  return n;
};

/**
 * Search options from the arguments (kind, sources, filters). A named source without a search for the kind is
 * skipped with a note in `skipped` (--kind art --source met,aic,commons searches the museums); only when no named
 * source is left is it a usage error.
 */
export function searchOptions(args, env = process.env) {
  const kind = String(args.kind || 'photo').toLowerCase();
  if (!['photo', 'video', 'texture', 'art'].includes(kind)) throw new Usage('--kind is photo, video, texture or art');
  const orientation = args.orientation ? ({ landscape: 'landscape', wide: 'landscape', portrait: 'portrait', tall: 'portrait', square: 'square' }[String(args.orientation).toLowerCase()]) : null;
  if (args.orientation && !orientation) throw new Usage('--orientation is landscape, portrait or square');
  const usable = Object.keys(SOURCES).filter((s) => SOURCES[s].kinds.includes(kind) && (!SOURCES[s].env || Boolean(env[SOURCES[s].env])));
  let sources = usable; const skipped = [];
  if (args.source && args.source !== 'all') {
    const named = String(args.source).toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    for (const s of named) if (!SOURCES[s]) throw new Usage(`unknown source ${s}: ${Object.keys(SOURCES).join(', ')}`);
    sources = named.filter((s) => SOURCES[s].kinds.includes(kind));
    for (const s of named) if (!sources.includes(s)) skipped.push(`${SOURCES[s].name} has no ${kind} search (it serves ${SOURCES[s].kinds.join(', ')})`);
    if (!sources.length) throw new Usage(skipped.join('; '));
    for (const s of sources) if (SOURCES[s].env && !env[SOURCES[s].env]) throw new Usage(`${SOURCES[s].name} needs ${SOURCES[s].env} in the environment`);
  }
  return { kind, sources, skipped, orientation, minWidth: num(args, 'min-width', kind === 'video' ? 1280 : 1600, 0, 20000), limit: Math.round(num(args, 'limit', 8, 1, 30)),
    width: Math.round(num(args, 'width', 2400, 400, 4000)), res: Math.round(num(args, 'res', 1080, 240, 2160)), allowCredit: Boolean(args['allow-credit']),
    colour: colourOf(args.colour), check: !args['no-check'] };
}
/** A texture search asks for the surface itself. */
export const searchQuery = (q, kind) => (kind === 'texture' && !/\b(texture|macro|surface|pattern|close[- ]?up|detail)\b/i.test(q) ? `${q} texture` : q);

/** Keep what a film may use: licence, size, shape; one picture per near-duplicate title. Returns { keep, skipped }. */
export function filterItems(items, o) {
  const skipped = { licence: 0, small: 0, shape: 0, alike: 0, reasons: {} };
  const titles = new Map(); const seen = new Set();
  const keep = items.filter((it) => {
    const lic = licenceAllowed(it.licence, o);
    if (!lic.ok) { skipped.licence++; const r = `${LICENCES[it.licence]?.name || it.licence}: ${lic.why}`; skipped.reasons[r] = (skipped.reasons[r] || 0) + 1; return false; }
    const k = String(it.image || it.ref).toLowerCase().split('?')[0];
    if (seen.has(k)) return false; seen.add(k);
    if (it.width && it.width < o.minWidth) { skipped.small++; return false; }
    if (o.orientation && it.width && it.height && shapeOf(it.width, it.height) !== o.orientation) { skipped.shape++; return false; }
    const t = String(it.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 32);
    const n = (titles.get(t) || 0) + 1; titles.set(t, n);
    if (t && n > 2) { skipped.alike++; return false; }
    return true;
  });
  return { keep, skipped };
}
/** Interleave the sources (one from each in turn) so a sheet shows the range, and number them from 1. */
export function interleave(groups, limit) {
  const lists = groups.map((g) => g.slice(0, limit)); const out = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out.map((it, k) => ({ n: k + 1, ...it }));
}

async function cmdSearch(args) {
  const query = args._.join(' ').trim();
  if (!query) throw new Usage('search needs a query, e.g. search "basalt cliff"');
  const o = searchOptions(args);
  for (const n of o.skipped) console.error(`note: ${n}; skipped, searching ${o.sources.map((s) => SOURCES[s].name).join(', ')}`);
  const q = searchQuery(query, o.kind);
  const cap = (ms, msg) => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms).unref());
  const results = await Promise.all(o.sources.map(async (s) => {
    try { return { s, items: await Promise.race([RUNNERS[s](q, o), cap(60000, 'no complete answer within 60 s')]) }; }
    catch (e) { return { s, items: [], error: redact(e.message) }; }
  }));
  const groups = []; const report = {};
  for (const r of results) {
    const { keep, skipped } = filterItems(r.items, o);
    report[r.s] = { found: r.items.length, kept: keep.length, skipped, error: r.error || null };
    groups.push(keep.slice(0, o.limit + 3));
  }
  let items = groups.flat();
  if (o.check) {
    await Promise.race([mapLimit(items.filter((it) => it.kind !== 'video' && (!it.width || ['nasa', 'openverse', 'aic'].includes(it.source))), 6, async (it) => {
      if (it.source === 'aic') { await aicServe(it, o.width); return; } // the width AIC really serves (it redirects others to 843 px)
      const p = await probeUrl(it.image, 12000); it.checked = p.ok ? 'ok' : p.why;
      if (p.ok && p.w) { it.width = p.w; it.height = p.h; }
      if (p.ok && p.bytes) it.bytes = p.bytes;
    }), sleep(40000)]);
    for (const g of groups) for (let i = g.length - 1; i >= 0; i--) {
      const it = g[i];
      if (it.checked && it.checked !== 'ok') { report[it.source].skipped.dead = (report[it.source].skipped.dead || 0) + 1; g.splice(i, 1); }
      else if (it.width && it.width < o.minWidth) { report[it.source].skipped.small++; g.splice(i, 1); }
    }
  }
  if (o.colour && ffmpegOk()) {
    items = groups.flat();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-assets-'));
    await mapLimit(items.filter((it) => it.thumb), 6, async (it) => { const f = await fetchThumb(it, tmp); if (f) it.colourScore = Number(colourScore(pixelGrid(f, 24), o.colour).toFixed(3)); });
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const g of groups) g.sort((a, b) => (b.colourScore ?? 0) - (a.colourScore ?? 0));
  }
  items = interleave(groups, o.limit);
  const out = path.resolve(args.out || path.join('out', 'assets', `${slug(query, 5) || 'search'}-${o.kind}.json`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const doc = { query, searched: q, kind: o.kind, created: new Date().toISOString(), options: { sources: o.sources, orientation: o.orientation, minWidth: o.minWidth, limit: o.limit, allowCredit: o.allowCredit, colour: o.colour?.name || null }, report, items };
  fs.writeFileSync(out, JSON.stringify(doc, null, 1));
  try { fs.writeFileSync(path.join(path.dirname(out), '.last'), out); } catch { /* optional */ }
  if (args.json) { console.log(JSON.stringify(doc, null, 1)); return items.length ? 0 : 1; }
  console.log(`ASSETS · ${o.kind} · "${q}" · ${o.allowCredit ? 'no-credit licences + CC BY' : 'licences that need no credit'} · at least ${o.minWidth}px${o.orientation ? ` · ${o.orientation}` : ''}${o.colour ? ` · colour ${o.colour.name}` : ''}`);
  for (const s of o.sources) {
    const r = report[s]; const sk = r.skipped;
    const dropped = [sk.licence && `${sk.licence} licence`, sk.small && `${sk.small} too small`, sk.shape && `${sk.shape} other shape`, sk.alike && `${sk.alike} alike`, sk.dead && `${sk.dead} did not load`].filter(Boolean);
    console.log(`  ${SOURCES[s].name.padEnd(32)} ${r.error ? `could not search (${r.error})` : `${items.filter((it) => it.source === s).length} shown of ${r.found}${dropped.length ? ` (dropped: ${dropped.join(', ')})` : ''}`}`);
  }
  const keyed = Object.keys(SOURCES).filter((s) => SOURCES[s].env && SOURCES[s].kinds.includes(o.kind) && !hasKey(s));
  if (keyed.length) console.log(`  (more with a key: ${keyed.map((s) => SOURCES[s].env).join(', ')})`);
  const noteCount = {}; for (const it of items) for (const n of it.notes || []) noteCount[n] = (noteCount[n] || 0) + 1;
  const shared = Object.keys(noteCount).filter((n) => noteCount[n] > 2);
  console.log('');
  for (const it of items) {
    const px = it.width && it.height ? `${it.width}x${it.height}` : 'size ?';
    const extra = it.kind === 'video' ? ` ${it.duration ? `${Math.round(it.duration)}s` : ''}` : '';
    console.log(`#${String(it.n).padEnd(3)} ${it.ref.padEnd(Math.min(48, Math.max(...items.map((x) => x.ref.length))))} ${px.padEnd(10)}${extra.padEnd(5)} ${(it.licence).padEnd(13)} ${short(it.title, 60)}${it.colourScore !== undefined ? `  [colour ${it.colourScore}]` : ''}`);
    if (it.author && ['pexels', 'unsplash', 'pixabay'].includes(it.source)) console.log(`     by ${short(it.author, 50)} on ${SOURCES[it.source].name}`);
    for (const n of it.notes || []) if (!shared.includes(n)) console.log(`     note: ${n}`);
  }
  for (const n of shared) console.log(`note (${noteCount[n]} items): ${n}`);
  console.log('');
  console.log(`Saved ${path.relative(process.cwd(), out) || out}`);
  if (!items.length) { console.log('Nothing usable. Name the subject\'s own things ("basalt", "tide pool", "kiln"), use fewer words, a smaller --min-width, or another --kind.'); return 1; }
  console.log(`Next. Look before you choose:  node scripts/assets.mjs sheet ${path.relative(process.cwd(), out) || out}`);
  console.log('Then: node scripts/assets.mjs get #3,#7 --to public/assets   (the private licence record goes to assets/licences.json)');
  return 0;
}

// ------------------------------------------------------------------------------------------------ sheet
/**
 * Contact-sheet geometry: n cells of cellW x round(cellW / aspect) in `cols` columns, a label strip under
 * each, a gutter around everything. Pure (tested).
 */
export function sheetLayout(n, { cols = 4, cellW = 400, aspect = 16 / 9, gutter = 12, label = 30 } = {}) {
  const c = Math.max(1, Math.min(cols, n || 1));
  const rows = Math.max(1, Math.ceil((n || 0) / c));
  const cellH = Math.round(cellW / aspect);
  const W = gutter + c * (cellW + gutter); const H = gutter + rows * (cellH + label + gutter);
  const cells = Array.from({ length: n }, (_, i) => ({ i, col: i % c, row: Math.floor(i / c), x: gutter + (i % c) * (cellW + gutter), y: gutter + Math.floor(i / c) * (cellH + label + gutter), w: cellW, h: cellH, labelY: gutter + Math.floor(i / c) * (cellH + label + gutter) + cellH + 6 }));
  return { cols: c, rows, cellW, cellH, W: W + (W % 2), H: H + (H % 2), cells };
}
const FONTS = ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf', '/usr/share/fonts/TTF/DejaVuSans.ttf'];
const labelFont = () => FONTS.find((f) => { try { return fs.statSync(f).isFile(); } catch { return false; } }) || null;
const ffEsc = (s) => String(s).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, '');
const labelText = (s, max = 52) => String(s).replace(/[^A-Za-z0-9 #.x/+-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
let FF = null;
export function ffmpegOk() { if (FF === null) FF = spawnSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' }).status === 0; return FF; }
function ff(argv, what) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${what}: ffmpeg failed (${short((r.stderr || '').trim().split('\n').pop(), 200)})`);
  return r;
}
/** N times spread across a clip of `dur` seconds (0.3 s margins; one frame = the middle, at most 1 s in). Pure. */
export const scanTimes = (dur, n) => {
  if (n <= 1) return [Math.min(1, dur / 2)];
  const a = Math.min(0.3, dur / 4);
  const b = Math.max(a, dur - a);
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
};
/** Mean colours of a w x w grid of an image (via ffmpeg), as a flat RGB byte array. */
export function pixelGrid(file, w = 24) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', `scale=${w}:${w}:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
  return r.status === 0 ? r.stdout : Buffer.alloc(0);
}
async function fetchThumb(it, dir) {
  const url = it.thumb || it.image; if (!url) return null;
  const file = path.join(dir, `${slug(it.ref.replace(':', '-'), 12) || 'x'}.img`);
  if (fs.existsSync(file)) return file;
  try {
    const r = await fetch(url, { headers: imageHeaders(url), signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    if (!sniff(b) || sniff(b).media !== 'image') return null;
    fs.writeFileSync(file, b); return file;
  } catch { return null; }
}
function listLocal(paths) {
  const out = [];
  for (const p of paths) {
    const st = fs.existsSync(p) ? fs.statSync(p) : null;
    if (!st) throw new Usage(`no such file or folder: ${p}`);
    if (st.isDirectory()) for (const f of fs.readdirSync(p).sort()) { if (/\.(jpe?g|png|webp|avif|mp4|webm|mov)$/i.test(f)) out.push(path.join(p, f)); }
    else out.push(p);
  }
  return out;
}
async function cmdSheet(args) {
  if (!ffmpegOk()) throw new Error('sheet needs ffmpeg on the PATH');
  if (!args._.length) throw new Usage('sheet needs a results file from search, or image/video files or folders');
  const fromResults = args._.length === 1 && /\.json$/i.test(args._[0]);
  let cells = []; let out;
  const cellW = Math.round(num(args, 'cell', 400, 120, 960));
  if (fromResults) {
    const doc = JSON.parse(fs.readFileSync(args._[0], 'utf8'));
    let items = doc.items || [];
    if (args.pick) { const want = new Set(String(args.pick).split(',').map((s) => Number(s.replace('#', '')))); items = items.filter((it) => want.has(it.n)); }
    if (!items.length) throw new Usage('nothing to show (an empty search, or --pick matched none)');
    const cache = `${args._[0].replace(/\.json$/i, '')}.thumbs`; fs.mkdirSync(cache, { recursive: true });
    const files = await mapLimit(items, 6, (it) => fetchThumb(it, cache));
    const scan = Math.round(num(args, 'scan', 1, 1, 8));
    const label = (it) => `#${it.n} ${it.source} ${it.width ? `${it.width}x${it.height}` : ''} ${it.kind === 'video' ? `video ${it.duration ? `${Math.round(it.duration)}s` : ''}` : ''} ${it.licence}`;
    // --scan N on a video search: N frames read straight from each clip's preview stream (nothing is downloaded whole)
    const scanned = scan > 1 ? await mapLimit(items, 2, async (it, k) => {
      const url = it.kind === 'video' ? it.preview || it.image : null;
      if (!url) return null;
      return scanTimes(it.duration || 10, scan).map((t, j) => {
        const f = path.join(cache, `${slug(it.ref.replace(':', '-'), 12)}-s${j}.jpg`);
        if (!fs.existsSync(f)) { try { ff(['-ss', t.toFixed(2), '-i', url, '-frames:v', '1', '-vf', 'scale=480:-2', f], 'scan'); } catch { return { file: k === 0 && j === 0 ? files[k] : null, label: '' }; } }
        return { file: f, label: j === 0 ? label(it) : `#${it.n} ${t.toFixed(1)}s` };
      });
    }) : [];
    cells = items.flatMap((it, k) => scanned[k] || [{ file: files[k], label: label(it) }]);
    out = args.out || `${args._[0].replace(/\.json$/i, '')}.sheet.png`;
  } else {
    const files = listLocal(args._);
    if (!files.length) throw new Usage('no images or videos in those paths');
    // a clip shows one frame, or --scan N frames spread across it (choose the seconds before trimming)
    const scan = Math.round(num(args, 'scan', 1, 1, 12));
    cells = files.flatMap((f, k) => {
      if (!/\.(mp4|webm|mov)$/i.test(f)) return [{ file: f, label: `${k + 1} ${path.basename(f)}` }];
      const dur = probeFile(f)?.duration || 2;
      return scanTimes(dur, scan).map((t, j) => {
        const tmp = path.join(os.tmpdir(), `cinetic-sheet-${process.pid}-${k}-${j}.png`);
        try { ff(['-ss', t.toFixed(2), '-i', f, '-frames:v', '1', '-vf', 'scale=640:-2', tmp], 'frame'); } catch { return { file: null, label: '' }; }
        return { file: tmp, label: `${k + 1} ${path.basename(f).slice(0, 28)} ${t.toFixed(1)}s` };
      });
    });
    out = args.out || path.join(path.dirname(files[0]), 'sheet.png');
  }
  const L = sheetLayout(cells.length, { cols: Math.round(num(args, 'cols', 4, 1, 8)), cellW });
  const font = labelFont();
  const inputs = []; const chains = [`color=c=0x15171a:s=${L.W}x${L.H}:d=1[bg]`]; let last = 'bg'; let k = 0;
  cells.forEach((c, i) => {
    if (!c.file) return;
    inputs.push('-i', c.file);
    const cl = L.cells[i];
    chains.push(`[${k}:v]scale=${cl.w}:${cl.h}:force_original_aspect_ratio=decrease,pad=${cl.w}:${cl.h}:(ow-iw)/2:(oh-ih)/2:color=0x0b0c0e,setsar=1,format=rgb24[c${k}]`);
    chains.push(`[${last}][c${k}]overlay=${cl.x}:${cl.y}[o${k}]`); last = `o${k}`; k++;
  });
  if (font) {
    const draws = cells.map((c, i) => `drawtext=fontfile='${ffEsc(font)}':text='${labelText(c.label, Math.floor(L.cellW / 8.6))}':x=${L.cells[i].x + 2}:y=${L.cells[i].labelY}:fontsize=16:fontcolor=0xd8dade`).join(',');
    chains.push(`[${last}]${draws}[out]`); last = 'out';
  }
  ff([...inputs, '-filter_complex', chains.join(';'), '-map', `[${last}]`, '-frames:v', '1', out], 'sheet');
  console.log(`Sheet ${out} · ${cells.length} cells (${cells.filter((c) => !c.file).length} missing) · ${L.cols} x ${L.rows}${font ? '' : ' · no label font found: cells run left to right, top to bottom'}`);
  console.log('Look at it. Choose for light, depth and one idea, not for the subject alone; refuse stock gestures.');
  return 0;
}

// ------------------------------------------------------------------------------------------------ get
/** Where the private licence record of a download folder lives: <film>/assets/licences.json, outside public/. */
export function recordPath(to, override) {
  if (override) return path.resolve(override);
  const abs = path.resolve(to); const parts = abs.split(path.sep);
  const i = parts.lastIndexOf('public');
  if (i > 0) return path.join(parts.slice(0, i).join(path.sep) || path.sep, 'assets', 'licences.json');
  return path.join(abs, 'licences.json');
}
/** A file's path inside the nearest public/ folder (what staticFile() takes), or null. */
export function publicPath(file) {
  const parts = path.resolve(file).split(path.sep); const i = parts.lastIndexOf('public');
  return i >= 0 ? parts.slice(i + 1).join('/') : null;
}
export function readRecord(file) {
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(j.items) ? j : { items: [] }; } catch { return { items: [] }; }
}
/** One record entry (the shape scripts/audio/track.py keeps for music, for imagery). */
export function recordEntry(it, f) {
  const L = LICENCES[it.licence] || LICENCES.unknown;
  const seen = SOURCE_SEEN[it.source] && it.licence === 'pd' ? SOURCE_SEEN[it.source] : L.seen;
  const credit = L.credit ? `${it.kind === 'video' ? 'Footage' : 'Photo'}: "${short(it.title, 80)}"${it.author ? ` by ${short(it.author, 60)}` : ''}, ${L.name}${it.licenceVersion ? ` ${it.licenceVersion}` : ''}, via ${it.provider}` : null;
  return {
    file: f.file, sha256: f.sha256, bytes: f.bytes, kind: it.kind, width: f.width ?? it.width ?? null, height: f.height ?? it.height ?? null,
    ...(it.kind === 'video' ? { duration: f.duration ?? it.duration ?? null, fps: f.fps ?? it.fps ?? null } : {}),
    title: it.title, author: it.author || null, source: SOURCES[it.source]?.name || it.source, provider: it.provider, ref: it.ref, page: it.page, file_url: it.image,
    licence: L.name, licence_id: it.licence, licence_url: L.url || null, credit_required: Boolean(L.credit), credit,
    licence_seen: seen ? { quote: seen.quote, url: seen.url, date: CHECKED } : null,
    limits: (it.source === 'nasa' ? SOURCE_SEEN.nasa.limits : L.limits) || null, notes: it.notes || [], checked: new Date().toISOString().slice(0, 10),
    modifications: f.modifications || null, shown_on_screen: false,
  };
}
export function writeRecord(file, entry) {
  const doc = readRecord(file);
  doc.about = 'Private licence record of this film\'s imagery (scripts/assets.mjs). Never shown on screen. Licences marked credit_required false need no credit.';
  doc.items = [...doc.items.filter((x) => x.file !== entry.file), entry];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(doc, null, 1));
  return doc;
}
/** Split a ref list on the commas that start a new ref (#n, n, or <source>:), so a file title may hold commas. */
export const splitRefs = (s) => String(s).split(/,(?=\s*(?:#?\d+\s*(?:,|$)|[a-z]+:))/).map((x) => x.trim()).filter(Boolean);
/** Resolve "#n" refs against a results file (or the last search), else keep "<source>:<id>". */
export function resolveRefs(list, doc) {
  return list.map((r) => {
    const m = String(r).match(/^#?(\d+)$/);
    if (!m) return { ref: r, hint: doc?.items?.find((it) => it.ref === r) || null };
    const it = doc?.items?.find((x) => x.n === Number(m[1]));
    if (!it) throw new Usage(`#${m[1]} is not in the results${doc ? '' : ' (no results file: pass --from <results.json>)'}`);
    return { ref: it.ref, hint: it };
  });
}
/**
 * The item a saved search found for a ref (the results files in `dir`, newest first), or null: a ref given as
 * search printed it, after another search, still finds its page (Mixkit has no lookup by id).
 */
export function findSaved(ref, dir = path.join('out', 'assets')) {
  let files;
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f)); } catch { return null; }
  const mtime = (f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };
  for (const f of files.sort((a, b) => mtime(b) - mtime(a))) {
    try { const it = JSON.parse(fs.readFileSync(f, 'utf8'))?.items?.find?.((x) => x?.ref === ref); if (it) return it; } catch { /* not a results file */ }
  }
  return null;
}
/** Fresh metadata and licence for one ref, read from its source (never trusted from a results file). */
async function lookup(ref, o, hint) {
  const m = String(ref).match(/^([a-z]+):(.+)$/);
  if (!m || !SOURCES[m[1]]) throw new Error(`a ref looks like <source>:<id> (${Object.keys(SOURCES).join(', ')}), as search prints it`);
  const [, src, id] = m;
  if (SOURCES[src].env && !hasKey(src)) throw new Error(`${SOURCES[src].name} needs ${SOURCES[src].env} in the environment`);
  const kind = hint?.kind || o.kind || 'photo';
  if (src === 'openverse') { const it = parseOpenverse({ results: [await getJson(`https://api.openverse.org/v1/images/${encodeURIComponent(id)}/`, { ms: 40000 })] }, { kind })[0]; await commonsSizes(it && /upload\.wikimedia/.test(it.image) ? [it] : [], o.width); return it; }
  if (src === 'commons') {
    const j = await getJson(commonsApi({ ...commonsRefParam(id), prop: 'imageinfo|videoinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(o.width), iiextmetadatafilter: COMMONS_META, iiextmetadatalanguage: 'en', viprop: 'derivatives' }));
    const pg = j?.query?.pages?.[0]; const video = /^video\//.test(pg?.imageinfo?.[0]?.mime || '');
    return parseCommons({ query: { pages: [pg] } }, { kind: video ? 'video' : kind, width: o.width, res: o.res })[0];
  }
  if (src === 'nasa') {
    const nid = decodeURIComponent(id);
    const j = await getJson(`https://images-api.nasa.gov/search?${new URLSearchParams({ nasa_id: nid })}`);
    const it = parseNasaSearch(j, { kind })[0]; if (!it) return null;
    const man = parseNasaManifest(await getJson(nasaHref(it.manifest)), it.kind);
    if (it.kind === 'video') { const pick = pickRendition(man.renditions.filter((x) => !x.orig), o.res); Object.assign(it, { image: pick?.url, width: pick?.w, height: pick?.h }); }
    else it.image = (o.width > 1600 ? man.orig : null) || man.large || man.medium;
    return it;
  }
  if (src === 'aic') {
    const j = await getJson(`https://api.artic.edu/api/v1/artworks/${encodeURIComponent(id)}?fields=${AIC_FIELDS.join(',')}`, { headers: AIC_HEADERS });
    const it = parseAic({ data: [j.data], config: j.config }, o)[0]; if (!it) return null;
    const w = await aicServe(it, o.width);
    if (w && w < Math.min(o.width, it.full?.[0] || o.width)) it.notes = [...it.notes, `AIC serves this work at ${w} px wide only (asked ${o.width}${it.full ? `, the original is ${it.full[0]}` : ''}): use it small or behind a defocus, or choose another work`];
    return it;
  }
  if (src === 'met') return parseMetObject(await getJson(metObjectUrl(id)), {});
  if (src === 'mixkit') {
    // a Mixkit page address needs the clip's name, which only a search records (an id alone lands on a search page)
    if (!hint?.page) throw new Error(`no saved search holds ${ref}: pass --from <the results.json that found it> (Mixkit pages need their name, and the licence is read there)`);
    const { page } = hint;
    const html = await getText(page);
    const r = parseMixkitItem(html, id); const pick = pickRendition(r.renditions, o.res);
    return item('mixkit', id, { kind: 'video', title: r.title || hint?.title || `mixkit ${id}`, page, image: pick.url, width: pick.w, height: pick.h, duration: r.duration, licence: r.licence });
  }
  if (src === 'pexels') {
    const video = kind === 'video';
    const j = await getJson(video ? `https://api.pexels.com/videos/videos/${id}` : `https://api.pexels.com/v1/photos/${id}`, { headers: { Authorization: key('pexels') } });
    return parsePexels(video ? { videos: [j] } : { photos: [j] }, { kind, width: o.width, res: o.res })[0];
  }
  if (src === 'unsplash') { const j = await getJson(`https://api.unsplash.com/photos/${encodeURIComponent(id)}`, { headers: { Authorization: `Client-ID ${key('unsplash')}`, 'Accept-Version': 'v1' } }); return parseUnsplash({ results: [j] }, { kind, width: o.width })[0]; }
  if (src === 'pixabay') {
    const video = kind === 'video';
    const j = await getJson(`https://pixabay.com/api/${video ? 'videos/' : ''}?${new URLSearchParams({ key: key('pixabay'), id })}`);
    return parsePixabay(j, { kind, res: o.res })[0];
  }
  return null;
}
async function download(url, file, capBytes) {
  const r = await fetch(url, { headers: imageHeaders(url), signal: AbortSignal.timeout(900000), redirect: 'follow' });
  if (!r.ok) throw new Error(`the file did not load (HTTP ${r.status})`);
  const out = fs.createWriteStream(file); const hash = crypto.createHash('sha256'); let n = 0; const head = [];
  try {
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      n += value.length;
      if (n > capBytes) { reader.cancel().catch(() => {}); throw new Error(`over the ${Math.round(capBytes / 1048576)} MB cap: pass a larger --max-mb, a smaller --res, or choose a shorter clip`); }
      if (n <= 262144 + value.length) head.push(value);
      hash.update(value);
      if (!out.write(value)) await new Promise((res) => out.once('drain', res));
    }
    await new Promise((res, rej) => out.end((e) => (e ? rej(e) : res())));
  } catch (e) { out.destroy(); try { fs.unlinkSync(file); } catch { /* gone */ } throw e; }
  return { bytes: n, sha256: hash.digest('hex'), head: Buffer.concat(head) };
}
export function probeFile(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { encoding: 'utf8', maxBuffer: 8 << 20 });
  if (r.status !== 0) return null;
  const j = JSON.parse(r.stdout); const v = (j.streams || []).find((s) => s.codec_type === 'video');
  if (!v) return null;
  const rate = (s) => { const [a, b] = String(s || '0/1').split('/').map(Number); return b ? a / b : 0; };
  const isStill = /^(mjpeg|png|webp|gif|av1|bmp|tiff)$/.test(v.codec_name) && (!j.format?.duration || Number(j.format.duration) < 0.05 || /image2|png_pipe|jpeg_pipe|webp_pipe/.test(j.format?.format_name || ''));
  return { width: v.width, height: v.height, codec: v.codec_name, pix_fmt: v.pix_fmt, still: isStill, duration: isStill ? null : Number(j.format?.duration || v.duration) || null,
    fps: isStill ? null : Number(rate(v.avg_frame_rate || v.r_frame_rate).toFixed(3)) || null, frames: Number(v.nb_frames) || null, bitrate: Number(j.format?.bit_rate) || null, bytes: Number(j.format?.size) || null,
    colour: [v.color_primaries, v.color_transfer, v.color_space].filter(Boolean).join('/') || null, audio: (j.streams || []).some((s) => s.codec_type === 'audio') };
}
/** A saved image narrower than the record promised (within the asked width) by more than 10 %: what to say, or null. Pure. */
export function shortfall(saved, promised, asked) {
  const want = promised ? Math.min(promised, asked || promised) : null;
  if (!saved || !want || saved >= want * 0.9) return null;
  return `saved ${saved} px wide, but the record promised ${want} px: the server sent a smaller rendition (use it small or behind a defocus, or choose another)`;
}
const parseTrim = (s) => { if (!s) return null; const [a, b] = String(s).split(',').map(Number); if (!(a >= 0) || !(b > 0)) throw new Usage('--trim is start,seconds (e.g. 3.5,6)'); return { start: a, dur: b }; };
async function cmdGet(args) {
  const list = splitRefs(args._.join(','));
  if (!list.length) throw new Usage('get needs one or more refs (openverse:<id>, mixkit:<id> ...) or #n from the last search');
  if (!args.to) throw new Usage('get needs --to <film>/public/assets (where the files go)');
  let doc = null;
  const from = args.from || (() => { try { return fs.readFileSync(path.join('out', 'assets', '.last'), 'utf8').trim(); } catch { return null; } })();
  if (from && fs.existsSync(from)) doc = JSON.parse(fs.readFileSync(from, 'utf8'));
  const o = { kind: doc?.kind, width: Math.round(num(args, 'width', 2400, 400, 4000)), res: Math.round(num(args, 'res', 1080, 240, 2160)), allowCredit: Boolean(args['allow-credit']) };
  const cap = num(args, 'max-mb', 150, 1, 2000) * 1048576; const trim = parseTrim(args.trim);
  const to = path.resolve(args.to); const rec = recordPath(to, args.record);
  fs.mkdirSync(to, { recursive: true });
  let failed = 0;
  for (const { ref, hint: known } of resolveRefs(list, doc)) {
    try {
      const hint = known || findSaved(ref);
      const it = await lookup(ref, o, hint);
      if (!it || !it.image) throw new Error('no usable file on the record (removed, or no rendition)');
      const lic = licenceAllowed(it.licence, o);
      if (!lic.ok) throw new Error(`refused: ${LICENCES[it.licence]?.name || it.licence}: ${lic.why}`);
      if (it.source === 'unsplash' && it.downloadLocation) await getJson(it.downloadLocation, { headers: { Authorization: `Client-ID ${key('unsplash')}` } }).catch(() => null); // the API's download event
      const stem = slug(args.name && list.length === 1 ? args.name : it.title, 6) || slug(ref.replace(':', '-'), 6);
      const part = path.join(to, `.${stem}.part`);
      const d = await download(it.image, part, cap);
      const kind = sniff(d.head);
      if (!kind) { fs.unlinkSync(part); throw new Error('the file is not an image or a video'); }
      if ((it.kind === 'video') !== (kind.media === 'video')) { fs.unlinkSync(part); throw new Error(`expected ${it.kind === 'video' ? 'a video' : 'an image'}, got ${kind.ext}`); }
      let file = path.join(to, `${stem}.${kind.ext}`);
      for (let k = 2; fs.existsSync(file) && readRecord(rec).items.find((x) => x.file === path.relative(path.dirname(rec), file).split(path.sep).join('/'))?.ref !== ref; k++) file = path.join(to, `${stem}-${k}.${kind.ext}`);
      fs.renameSync(part, file);
      const f = { bytes: d.bytes, sha256: d.sha256, ...(kind.media === 'image' ? (({ w, h }) => ({ width: w, height: h }))(dims(d.head)) : {}) };
      if (kind.media === 'video' && ffmpegOk()) {
        const p = probeFile(file); if (p) Object.assign(f, { width: p.width, height: p.height, duration: p.duration, fps: p.fps });
        if (trim) {
          const cut = file.replace(/\.[^.]+$/, `.cut.mp4`);
          ff(['-ss', String(trim.start), '-i', file, '-t', String(trim.dur), '-an', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', cut], 'trim');
          fs.unlinkSync(file); file = file.replace(/\.[^.]+$/, '.mp4'); fs.renameSync(cut, file);
          const b = fs.readFileSync(file); const p2 = probeFile(file);
          Object.assign(f, { bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex'), duration: p2?.duration ?? trim.dur, fps: p2?.fps ?? f.fps, modifications: `trimmed to ${trim.dur} s from ${trim.start} s, audio removed` });
        }
      }
      f.file = path.relative(path.dirname(rec), file).split(path.sep).join('/');
      writeRecord(rec, recordEntry(it, f));
      const small = kind.media === 'image' && f.width && f.width < 1920;
      const short = kind.media === 'image' ? shortfall(f.width, it.width, o.width) : null;
      if (short) console.error(`WARNING  ${ref}: ${short}`);
      console.log(`Saved ${path.relative(process.cwd(), file)} · ${f.width ? `${f.width}x${f.height}` : ''}${f.duration ? ` · ${f.duration.toFixed(1)} s @ ${f.fps} fps` : ''} · ${size(f.bytes)} · ${LICENCES[it.licence].name}${LICENCES[it.licence].credit ? ' (credit line in the record)' : ', no credit needed'}`);
      console.log(`  use      ${publicPath(file) ? `staticFile('${publicPath(file)}')` : path.relative(process.cwd(), file)}`);
      if (small) console.log('  note     under 1920 px wide: use it small, as a texture, or behind a defocus; never full frame sharp');
      if (kind.media === 'video' && !trim && f.duration > 12) console.log('  note     a long clip: keep only the seconds you use (--trim start,seconds) to keep the project lean');
      for (const n of it.notes || []) console.log(`  note     ${n}`);
    } catch (e) { failed++; console.error(`Could not get ${ref}: ${redact(e.message)}`); }
  }
  console.log(`Licence record: ${path.relative(process.cwd(), rec)} (private; nothing here is shown on screen)`);
  return failed ? 1 : 0;
}

// ------------------------------------------------------------------------------------------------ grade
/**
 * Named looks: one grade for a whole set, so stills from different sources read as one shoot. Every look
 * normalises exposure (the 10th and 90th luma percentiles toward `lo` / `hi`, `recentre` of the way, the
 * contrast change held to x0.77-1.3) and colour strength (mean saturation to `sat`; `keep` holds the picture's
 * own, only pulling a mean above `satCap` down a little) first; `median` then puts the median luma there (night);
 * `warm` drains reds and yellows (orange skies, tan wood); then colours: `vib` < 0 is a vibrance ceiling (strong colours
 * lose more than weak ones, so a turquoise bay does not outshout the set), `mode` duotone maps luma between
 * two colours at the accent hue (shadow and highlight as OKLCH L/C), `tint` keeps `keep` of the photo's own
 * colour under a duotone wash, `split` pushes shadows a step toward the split hue (--split-hue, a cool teal-slate
 * by default and never tied to the accent: a red accent must not redden celadon shadows, and the accent stays
 * free for live data), `mono` is a neutral black and white. `device: true` marks a look for one shot, never a
 * whole film.
 */
export const LOOKS = {
  natural: { about: 'the default: each picture keeps its own colour and range; black level and contrast a quarter of the way toward the whole set (never stretched past x1.3), only the strongest colours held back a little, a faint cool shadow', lo: 0.07, hi: 0.86, recentre: 0.25, keep: true, satCap: 0.36, vib: -0.1, mode: 'split', split: 0.02, grain: 0.18 },
  matte: { about: 'editorial matte: lifted blacks, rolled highlights, colour at 55 %, shadows a step toward the split hue (cool by default)', lo: 0.12, hi: 0.84, black: 0.06, white: 0.94, sat: 0.55, vib: -0.25, mode: 'split', split: 0.05, grain: 0.25 },
  silver: { about: 'neutral black and white, a firm curve and stronger grain (archives, a quiet film, the pieces of a collage)', lo: 0.05, hi: 0.9, sat: 0, mode: 'mono', grain: 0.4 },
  night: { about: 'low key: the median luma to about 0.18 (a daylight picture reads as night, a dark one is not crushed), warm colours (orange skies, tan wood) drained, shadows a step toward the split hue (cool by default)', lo: 0.03, hi: 0.72, sat: 0.6, vib: -0.25, mode: 'split', split: 0.07, median: 0.18, warm: -0.8, grain: 0.3 },
  tint: { device: true, about: 'a device look for one shot: 30 % of the photo\'s own colour under a one-hue wash at the accent hue', lo: 0.08, hi: 0.88, sat: 0.3, mode: 'tint', keep: 0.3, shadow: [0.2, 0.06], mid: [0.55, 0.085], highlight: [0.95, 0.025], grain: 0.25 },
  duotone: { device: true, about: 'a device look for one shot: deep accent-hued shadows to a pale tinted white', lo: 0.06, hi: 0.9, sat: 0, mode: 'duotone', shadow: [0.2, 0.08], mid: [0.55, 0.075], highlight: [0.96, 0.03], grain: 0.3 },
  deep: { device: true, about: 'a device look for one shot: the photo becomes a colour field, shadows at L .14, highlights at the accent lifted to L .82', lo: 0.05, hi: 0.86, sat: 0, mode: 'duotone', shadow: [0.14, 0.05], mid: [0.46, 0.1], highlight: [0.82, 0.1], grain: 0.3 },
};
/** The picture check's thresholds (OKLCH chroma): neutral below, saturated at or above (the look audit's line). */
export const PICTURE = { neutralC: 0.03, saturatedC: 0.06, accentDeg: 20, minNeutral: 0.3, maxSatFrames: 0.35, maxAccent: 0.1, banned: 0.005, minSaturated: 0.045, lumaGap: 0.25, chromaX: 2.5 };
/**
 * The banned OKLCH regions, the same numbers as look-audit.py's banned_mask, lint-film.mjs and palette.py:
 * neon, beige/cream, orange/amber, purple/violet. Counted on pixels of C >= .03 (as look-audit samples). Pure.
 */
export function bannedRegion(L, C, h) {
  if (C < 0.03) return false;
  const yellow = h >= 96 && h < 118;
  const neon = (yellow ? L >= 0.91 && C >= 0.15 : (L >= 0.85 && C >= 0.15) || (L >= 0.8 && C >= 0.18)) || C >= 0.27;
  const beige = h >= 31 && h < 118 && L >= 0.7 && C >= 0.007 && C < 0.1;
  const orange = h >= 31 && h < 96 && C >= 0.05;
  const purple = h >= 270 && h < 340 && C >= 0.02;
  return neon || beige || orange || purple;
}
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/**
 * Shares of neutral, saturated, accent-hued and banned-region pixels in an rgb24 buffer (accent = a #hex or
 * null), with the median OKLCH lightness and the mean chroma (for the set's match). Pure.
 */
export function colourShares(buf, accent = null) {
  const ah = accent ? hexToOklch(accent)[2] : null;
  let n = 0; let neutral = 0; let saturated = 0; let acc = 0; let banned = 0; let csum = 0;
  const Ls = [];
  for (let i = 0; i + 2 < buf.length; i += 3) {
    const [L, C, h] = rgbToOklch(buf[i], buf[i + 1], buf[i + 2]);
    n++; csum += C; Ls.push(L);
    if (C < PICTURE.neutralC) neutral++;
    if (C >= PICTURE.saturatedC) { saturated++; if (ah !== null && hueGap(h, ah) <= PICTURE.accentDeg) acc++; }
    if (bannedRegion(L, C, h)) banned++;
  }
  if (!n) return { neutral: 0, saturated: 0, accent: 0, banned: 0, L: 0, C: 0 };
  Ls.sort((a, b) => a - b);
  return { neutral: neutral / n, saturated: saturated / n, accent: acc / n, banned: banned / n, L: Ls[n >> 1], C: csum / n };
}
/**
 * The verdict on a graded set from per-frame shares ([{ neutral, saturated, accent }], every still once, every
 * clip three times): mean neutral share against the floor, the share of frames more than half saturated and
 * the mean accent share against their ceilings. Only the neutral floor fails. Pure.
 */
export function pictureVerdict(frames, o = {}) {
  const P = { ...PICTURE, ...o };
  const m = (k) => (frames.length ? frames.reduce((s, f) => s + (f[k] ?? 0), 0) / frames.length : 0);
  const neutral = m('neutral'); const accent = m('accent'); const saturated = m('saturated');
  const satFrames = frames.length ? frames.filter((f) => f.saturated > 0.5).length / frames.length : 0;
  const bannedFrames = frames.filter((f) => (f.banned ?? 0) >= P.banned);
  const bannedOk = P.allowBanned || !bannedFrames.length;
  const notes = [];
  if (neutral < P.minNeutral) notes.push(`neutral ${Math.round(neutral * 100)} % is under the ${Math.round(P.minNeutral * 100)} % floor: the set reads as one colour wash and the accent will not read on live data; grade matte (colour at 55 %) or silver, or --chroma 0.7; keep tint, duotone and deep for one shot`);
  if (bannedFrames.length) notes.push(`${bannedFrames.length} frame(s) show a banned colour region (orange/amber, beige/cream, purple/violet or neon) on ${Math.round(Math.max(...bannedFrames.map((f) => f.banned)) * 1000) / 10} % of the frame at most (the film's banned-hue test fails at ${P.banned * 100} %)${bannedFrames[0].file ? `: ${[...new Set(bannedFrames.map((f) => f.file))].slice(0, 4).join(', ')}` : ''}: crop it out, grade night or silver, or pick another picture${P.allowBanned ? ' (passed: --brand-supplied)' : '; the brand\'s own colour? --brand-supplied, and declare it in the tokens'}`);
  if (satFrames > P.maxSatFrames) notes.push(`${Math.round(satFrames * 100)} % of frames are more than half saturated (ceiling ${Math.round(P.maxSatFrames * 100)} %): --chroma 0.8, matte, or pictures with grey, white or dark in them`);
  if (frames.length && saturated < P.minSaturated) notes.push(`saturated pixels ${Math.round(saturated * 1000) / 10} % of the set, under the film's saturated floor (${P.minSaturated * 100} %): the pictures read grey; grade natural (it keeps their colour), raise --chroma, or let the accent and a support hue carry larger masses`);
  if (accent > P.maxAccent) notes.push(`the pictures themselves carry the accent's hue on ${Math.round(accent * 100)} % of their pixels (ceiling ${Math.round(P.maxAccent * 100)} %): the accent will not stand out on them; --chroma 0.8, matte, or move the accent's hue away from the pictures'`);
  return { neutral, satFrames, accent, saturated, banned: bannedFrames.length, ok: neutral >= P.minNeutral && bannedOk, notes };
}

/**
 * Pictures that do not read as one shoot: per file the median OKLCH lightness and the mean chroma (of its
 * frames) against the set's medians; a file more than `lumaGap` lighter or darker, or with more than `chromaX`
 * times (or under 1 / chromaX of) the set's colour strength, is an outlier. rows = [{ file, L, C }]. Pure.
 */
export function setOutliers(rows, o = {}) {
  const P = { ...PICTURE, ...o };
  if (rows.length < 3) return [];
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const mL = med(rows.map((r) => r.L)); const mC = med(rows.map((r) => r.C));
  const out = [];
  for (const r of rows) {
    const why = [];
    if (Math.abs(r.L - mL) > P.lumaGap) why.push(`${r.L > mL ? 'lighter' : 'darker'} (median L ${r.L.toFixed(2)} vs ${mL.toFixed(2)})`);
    if (mC > 0.02 && (r.C > mC * P.chromaX || r.C < mC / P.chromaX)) why.push(`${r.C > mC ? 'more' : 'less'} colour (C ${r.C.toFixed(3)} vs ${mC.toFixed(3)})`);
    if (why.length) out.push({ file: r.file, why: why.join(', ') });
  }
  return out;
}

/**
 * Readable text or a logo in the pictures (someone else's brand on a bus, a shop sign): text-like lines that
 * stay put. like.py's text reader finds the lines in each frame; a clip's line counts when it sits in the
 * same place (box overlap >= 0.5) in at least two of its frames, a still's when two or more lines share a
 * baseline band or one line is at least 4 x as wide as tall. regions = [[x, y, w, h], ...] per frame. Pure.
 */
export function steadyText(framesRegions) {
  const iou = (a, b) => {
    const x = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])); const y = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
    const i = x * y; return i / (a[2] * a[3] + b[2] * b[3] - i || 1);
  };
  if (framesRegions.length >= 2) {
    const hits = [];
    framesRegions.forEach((rs, i) => rs.forEach((a) => { if (framesRegions.some((other, j) => j !== i && other.some((b) => iou(a, b) >= 0.5))) hits.push(a); }));
    return hits;
  }
  const rs = framesRegions[0] || [];
  return rs.filter((a) => a[2] >= 4 * a[3] || rs.some((b) => b !== a && Math.abs(a[3] - b[3]) <= 0.25 * a[3] && Math.abs(a[1] + a[3] - (b[1] + b[3])) <= 0.5 * a[3]));
}
/** The crop of a w x h source at `aspect` (w/h), `zoom` x tighter, centred on focus (fx, fy in 0..1) and clamped inside. */
export function focusCrop(w, h, aspect, fx = 0.5, fy = 0.5, zoom = 1) {
  let cw = w; let ch = Math.round(w / aspect);
  if (ch > h) { ch = h; cw = Math.round(h * aspect); }
  cw = Math.round(cw / Math.max(1, zoom)); ch = Math.round(ch / Math.max(1, zoom));
  cw -= cw % 2; ch -= ch % 2;
  const x = Math.round(Math.min(Math.max(fx * w - cw / 2, 0), w - cw)); const y = Math.round(Math.min(Math.max(fy * h - ch / 2, 0), h - ch));
  return { x, y, w: cw, h: ch };
}
const f3 = (v) => Number(v).toFixed(3).replace(/\.?0+$/, '') || '0';
/** The most any look stretches or flattens a picture's range (x1.3 either way). */
export const STRETCH = 1.3;
/**
 * Where the 10th / 90th luma percentiles go: toward the look's, the slope held to 1/1.3-1.3, re-centred
 * `recentre` of the way to the look's middle (house 0.75; natural 0.25, so a bright still stays bright and a
 * night one stays dark).
 */
export function exposureMap(stats, L) {
  const p10 = stats ? Math.min(0.45, Math.max(0.01, stats.lo)) : 0.1;
  const p90 = stats ? Math.min(0.99, Math.max(p10 + 0.15, stats.hi)) : 0.9;
  const slope = Math.min(STRETCH, Math.max(1 / STRETCH, (L.hi - L.lo) / (p90 - p10)));
  const midIn = (p10 + p90) / 2;
  const mid = midIn + (((L.lo + L.hi) / 2) - midIn) * (L.recentre ?? 0.75);
  const lo = Math.max(0.005, mid - (slope * (p90 - p10)) / 2);
  const hi = Math.min(0.995, mid + (slope * (p90 - p10)) / 2);
  return { p10, p90, lo, hi, slope, black: L.black ?? 0, white: L.white ?? 1 };
}
/** The saturation factor that brings a source's colour strength to the look's (after the contrast change). */
export function satFactor(stats, target, slope = 1) {
  if (!stats?.sat) return target;
  return Math.min(1.25, Math.max(0.25, (0.16 * target) / (Math.max(0.02, stats.sat) * slope)));
}
/** natural's colour: the picture's own, a mean saturation above `cap` pulled down a little (never under x0.8). */
export function keepFactor(stats, cap = 0.36) {
  if (!stats?.sat || stats.sat <= cap) return 1;
  return Math.max(0.8, cap / stats.sat);
}
/** The gamma exponent that puts a median luma `m` (after the exposure map) at `target`, held to 0.7-2.8. */
export function medianGamma(m, target = 0.18) {
  const x = Math.min(0.98, Math.max(0.02, m));
  return Math.min(2.8, Math.max(0.7, Math.log(target) / Math.log(x)));
}
/** Curves points for a duotone: luma 0..1 mapped through OKLab from the shadow to the highlight colour (5 knots). */
export function duotoneCurves(hue, shadow, highlight, mid = null) {
  const A = oklchToRgb(shadow[0], shadow[1], hue); const B = oklchToRgb(highlight[0], highlight[1], hue);
  const la = rgbToOklab(...A.map((v) => v * 255)); const lb = rgbToOklab(...B.map((v) => v * 255));
  // with a mid colour the ramp bends through it at t = 0.5 (the mid-tones keep colour mass instead of greying out)
  const lm = mid ? rgbToOklab(...oklchToRgb(mid[0], mid[1], hue).map((v) => v * 255)) : la.map((v, i) => (v + lb[i]) / 2);
  const at = (t) => (t <= 0.5 ? la.map((v, i) => v + (lm[i] - v) * (t / 0.5)) : lm.map((v, i) => v + (lb[i] - v) * ((t - 0.5) / 0.5)));
  const knots = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ t, rgb: oklabToRgb(...at(t)).map((v) => Math.min(1, Math.max(0, v))) }));
  const ch = (i) => knots.map((k) => `${f3(k.t)}/${f3(k.rgb[i])}`).join(' ');
  return { r: ch(0), g: ch(1), b: ch(2), shadowHex: rgbHex(A), highlightHex: rgbHex(B) };
}
/** The split-tone hue when none is asked for: the hue of #2f7d8c (OKLCH ~213, a cool teal-slate). */
export const SPLIT_HUE = 213;
/** A --split-hue value (degrees 0-360 or a #rrggbb colour) to degrees. */
export function hueOf(v) {
  const s = String(v ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return hexToOklch(s)[2];
  const n = Number(s);
  if (s !== '' && Number.isFinite(n) && n >= 0 && n <= 360) return n;
  throw new Usage('--split-hue is a hue in degrees (0-360, OKLCH) or a #rrggbb colour');
}
/**
 * The ffmpeg filter chain of one file for a look. stats = { lo, hi, sat, med } of the source (luma percentiles,
 * mean saturation and median luma, 0..1) or null; crop = focusCrop() or null; width = output width; accent =
 * the wash hue of the device looks; splitHue = the shadow hue of the split looks (degrees, SPLIT_HUE when null);
 * strength = how far toward the look (0 = the picture as it is, 1 = the look, up to 1.5); colour = a saturation
 * multiplier after it (--chroma); hueSat = ffmpeg has the huesaturation filter (night's warm drain). Pure (tested).
 */
export function gradeFilter(lookName, { accent = '#2f7d8c', splitHue = null, stats = null, crop = null, width = 2400, grain, video = false, speed = 1, colour = 1, strength = 1, hueSat = true } = {}) {
  const L = LOOKS[lookName];
  if (!L) throw new Usage(`unknown look ${lookName}: ${Object.keys(LOOKS).join(', ')}`);
  const hue = hexToOklch(accent)[2];
  const f = [];
  if (crop) f.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
  f.push(`scale=${width}:-2:flags=lanczos`);
  if (speed !== 1) f.push(`setpts=PTS/${f3(speed)}`);
  f.push('format=gbrp');
  // how far toward the look: every move below is a blend from the picture (s = 0) to the look (s = 1)
  const s = Math.min(1.5, Math.max(0, strength));
  const toward = (from, to) => from + (to - from) * s;
  const c01 = (v) => Math.min(1, Math.max(0, v));
  // exposure: the source's 10th / 90th luma percentiles toward the look's, the contrast change held to
  // x1/1.3-1.3; the ends continue the same line (no spline overshoot that crushes a bright still)
  const ex = exposureMap(stats, L);
  const lo = c01(toward(ex.p10, ex.lo)); const hi = c01(toward(ex.p90, ex.hi));
  const k1 = (hi - lo) / (ex.p90 - ex.p10);
  const y0 = Math.max(toward(0, ex.black), lo - k1 * ex.p10); const y1 = Math.min(toward(1, ex.white), hi + k1 * (1 - ex.p90));
  const ident = Math.abs(lo - ex.p10) < 1e-4 && Math.abs(hi - ex.p90) < 1e-4 && y0 < 1e-4 && y1 > 1 - 1e-4;
  if (!ident) f.push(`curves=all='0/${f3(y0)} ${f3(ex.p10)}/${f3(lo)} ${f3(ex.p90)}/${f3(hi)} 1/${f3(y1)}'`);
  // night: the median to `median` (a monotonic curve moves the median exactly), held to gamma 0.7-2.8
  if (L.median) {
    const m = stats?.med ?? (stats ? (ex.p10 + ex.p90) / 2 : 0.45);
    const g = toward(1, medianGamma(lo + k1 * (m - ex.p10), L.median));
    if (Math.abs(g - 1) > 1e-3) f.push(`eq=gamma=${f3(1 / g)}`);
  }
  if (L.gamma) f.push(`eq=gamma=${f3(toward(1, L.gamma))}`);
  if (L.mode === 'duotone' || L.mode === 'mono' || L.mode === 'tint') {
    const luma = 'colorchannelmixer=rr=.2126:rg=.7152:rb=.0722:gr=.2126:gg=.7152:gb=.0722:br=.2126:bg=.7152:bb=.0722';
    const amount = Math.min(1, s);
    if (L.mode === 'mono') f.push(amount >= 1 ? luma : `eq=saturation=${f3(1 - amount)}`);
    else {
      const d = duotoneCurves(hue, L.shadow, L.highlight, L.mid);
      const tone = `${luma},curves=r='${d.r}':g='${d.g}':b='${d.b}'`; // blend: the first input (the photo) on top
      const keep = L.mode === 'duotone' ? 1 - amount : 1 - (1 - L.keep) * amount;
      const sat = toward(1, satFactor(stats, 1, ex.slope)) * colour;
      if (keep <= 1e-6) f.push(tone);
      else f.push(`split[a][b];[b]${tone}[t];[a]eq=saturation=${f3(sat)}[k];[k][t]blend=all_mode=normal:all_opacity=${f3(keep)}`);
    }
  } else {
    const look = L.keep ? keepFactor(stats, L.satCap) : satFactor(stats, L.sat, ex.slope);
    const sat = Math.max(0, toward(1, look)) * colour;
    if (Math.abs(sat - 1) > 1e-3) f.push(`eq=saturation=${f3(sat)}`);
    if (L.vib && s > 0) f.push(`vibrance=intensity=${f3(L.vib * s)}`);
    if (L.warm && s > 0) f.push(hueSat ? `huesaturation=saturation=${f3(Math.max(-1, L.warm * s))}:colors=r+y` : `eq=saturation=${f3(1 + L.warm * 0.4 * Math.min(1, s))}`);
    const split = L.split * s;
    if (split > 0) {
      const [r, g, b] = oklchToRgb(0.5, 0.12, splitHue ?? SPLIT_HUE).map((v) => v - 0.5);
      const k = split / Math.max(0.001, Math.max(Math.abs(r), Math.abs(g), Math.abs(b)));
      f.push(`colorbalance=rs=${f3(r * k)}:gs=${f3(g * k)}:bs=${f3(b * k)}:rm=${f3(r * k * 0.3)}:gm=${f3(g * k * 0.3)}:bm=${f3(b * k * 0.3)}`);
    }
  }
  const gr = (grain ?? L.grain) * Math.min(1, s);
  if (gr > 0) f.push(`noise=alls=${Math.round(gr * 20)}:allf=${video ? 't+u' : 'u'}`);
  f.push(video ? 'format=yuv420p' : 'format=rgb24');
  return f.join(',');
}
/**
 * The encoder arguments of a graded clip. scrub: every frame a key frame and no reordered frames, for a clip whose
 * time the film drives (a clock, a ping-pong, a ramp): a renderer then lands on any frame exactly. Pure.
 */
export const videoEncode = ({ scrub = false } = {}) => ['-c:v', 'libx264', '-crf', scrub ? '18' : '17', '-preset', 'medium', ...(scrub ? ['-g', '1', '-bf', '0'] : [])];
/** Luma percentiles and saturation of a file (ffmpeg signalstats on a small copy): { lo, hi, avg, sat } in 0..1. */
export function measure(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-i', file, '-vf', 'scale=320:-2,signalstats,metadata=mode=print', '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8' });
  const g = (k) => Number((`${r.stderr}${r.stdout}`.match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`)) || [])[1]);
  if (!Number.isFinite(g('YLOW'))) return null;
  const grid = frameGrid(file);
  const ys = [];
  for (let i = 0; i + 2 < grid.length; i += 3) ys.push((0.2126 * grid[i] + 0.7152 * grid[i + 1] + 0.0722 * grid[i + 2]) / 255);
  ys.sort((a, b) => a - b);
  return { lo: g('YLOW') / 255, hi: g('YHIGH') / 255, avg: g('YAVG') / 255, sat: g('SATAVG') / 181, med: ys.length ? ys[ys.length >> 1] : g('YAVG') / 255 };
}
let HUESAT = null;
/** ffmpeg has the huesaturation filter (5.1+): night drains warm colours with it, else with a plain desaturation. */
export function hasHueSat() { if (HUESAT === null) HUESAT = /\bhuesaturation\b/.test(spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || ''); return HUESAT; }
async function cmdGrade(args) {
  if (!ffmpegOk()) throw new Error('grade needs ffmpeg and ffprobe on the PATH');
  const files = listLocal(args._).filter((f) => !/\.(json|txt|md)$/i.test(f));
  if (!files.length) throw new Usage('grade needs image or video files (or folders)');
  const look = args.look || 'natural';
  if (!LOOKS[look]) throw new Usage(`unknown look ${look}: ${Object.keys(LOOKS).join(', ')} (node scripts/assets.mjs looks)`);
  const accent = args.accent || '#2f7d8c';
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new Usage('--accent is a #rrggbb colour (the film\'s accent from brand/tokens.ts)');
  const width = Math.round(num(args, 'width', 2400, 320, 3840)); const grain = args.grain !== undefined ? num(args, 'grain', 0.3, 0, 1) : undefined;
  const aspect = !args.aspect || args.aspect === 'none' ? (args.aspect === 'none' ? null : 16 / 9) : (() => { const [a, b] = String(args.aspect).split(/[:/x]/).map(Number); if (!(a > 0 && b > 0)) throw new Usage('--aspect is w:h (16:9) or none'); return a / b; })();
  const [fx, fy] = args.focus ? String(args.focus).split(',').map(Number) : [0.5, 0.5];
  const trim = parseTrim(args.trim); const speed = num(args, 'speed', 1, 0.1, 8); const strength = num(args, 'strength', 1, 0, 1.5); const colour = num(args, 'chroma', 1, 0.2, 1.5);
  const hueSat = hasHueSat();
  if (LOOKS[look].warm && !hueSat) console.log(`${look}: this ffmpeg has no huesaturation filter (5.1+): warm colours are drained with a plain desaturation instead.`);
  const splitHue = args['split-hue'] !== undefined ? hueOf(args['split-hue']) : null;
  if (LOOKS[look].device) console.log(`${look} is a device look: grade the one shot that uses it this way and the rest of the film natural (or matte, silver).`);
  const graded = [];
  const outDir = path.resolve(args.out || path.join(path.dirname(files[0]), 'graded'));
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of files) {
    const p = probeFile(file); if (!p) { console.error(`skip ${file}: not an image or video ffprobe can read`); continue; }
    const video = !p.still;
    const stats = measure(file);
    const crop = aspect ? focusCrop(p.width, p.height, aspect, fx, fy) : null;
    const w = Math.min(width, crop ? crop.w : p.width) - (Math.min(width, crop ? crop.w : p.width) % 2);
    const vf = gradeFilter(look, { accent, splitHue, stats, crop, width: w, grain, video, speed, colour, strength, hueSat });
    const out = path.join(outDir, `${path.basename(file).replace(/\.[^.]+$/, '')}.${args.suffix || look}.${video ? 'mp4' : 'jpg'}`);
    const argv = video
      ? [...(trim ? ['-ss', String(trim.start)] : []), '-i', file, ...(trim ? ['-t', String(trim.dur / speed)] : []), '-an', '-filter_complex', `[0:v]${vf}[v]`, '-map', '[v]', ...videoEncode({ scrub: Boolean(args.scrub) }),
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out]
      : ['-i', file, '-filter_complex', `[0:v]${vf}[v]`, '-map', '[v]', '-frames:v', '1', '-q:v', '2', out];
    if (args['dry-run']) { console.log(`ffmpeg ${argv.map((a) => (/[\s;'[\]]/.test(a) ? `"${a}"` : a)).join(' ')}`); continue; }
    ff(argv, `grade ${path.basename(file)}`);
    graded.push({ file: out, video });
    console.log(`Graded ${path.relative(process.cwd(), out)} · ${look}${crop ? ` · crop ${crop.w}x${crop.h} at ${crop.x},${crop.y}` : ''} · source luma ${stats ? `${stats.lo.toFixed(2)}-${stats.hi.toFixed(2)}` : '?'}`);
  }
  if (args['dry-run'] || !graded.length) return 0;
  console.log(`Check the set as one shoot: node scripts/assets.mjs sheet ${path.relative(process.cwd(), outDir) || outDir}`);
  if (args['no-check']) return 0;
  return pictureCheck(graded, args.accent ? accent : null, { allowBanned: Boolean(args['brand-supplied']) });
}
/** Pixels of one frame (a still, or a clip at t seconds) as a small rgb24 grid at 16:9. */
export function frameGrid(file, t = null, w = 96, h = 54) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...(t !== null ? ['-ss', String(t)] : []), '-i', file, '-vf', `scale=${w}:${h}:flags=area`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
  return r.status === 0 ? r.stdout : Buffer.alloc(0);
}
/**
 * like.py's text reader over frames of the set (480 px wide): [{ file, t, regions }] or null when the project's
 * Python cannot run it (it needs numpy and opencv-python). The frames go to a private temp folder, removed after.
 */
export function readText(graded) {
  const like = path.join(path.dirname(fileURLToPath(import.meta.url)), 'like.py');
  if (!fs.existsSync(like)) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-text-'));
  try {
    const jobs = [];
    graded.forEach((g, i) => {
      const times = g.video ? scanTimes(probeFile(g.file)?.duration || 1, 3) : [null];
      times.forEach((t, j) => {
        const png = path.join(tmp, `f${i}_${j}.png`);
        const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...(t !== null ? ['-ss', String(t)] : []), '-i', g.file, '-vf', 'scale=480:-2', '-frames:v', '1', png]);
        if (r.status === 0) jobs.push({ file: g.file, i, t, png });
      });
    });
    const code = `import sys, json, importlib.util\nimport cv2\nspec = importlib.util.spec_from_file_location('like_mod', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); m.need()\nprint(json.dumps([m.text_regions(cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY)) for p in sys.argv[2:]]))`;
    const py = spawnSync(process.execPath, [path.join(path.dirname(like), 'py.mjs'), '--which'], { encoding: 'utf8' });
    const which = (py.stdout || '').trim();
    const cmd = fs.existsSync(which) ? [which] : which.split(/\s+/).filter(Boolean); // a path with spaces, or "py -3"
    if (py.status !== 0 || !cmd.length || !jobs.length) return null;
    const r = spawnSync(cmd[0], [...cmd.slice(1), '-c', code, like, ...jobs.map((j) => j.png)], { encoding: 'utf8', maxBuffer: 16 << 20 });
    if (r.status !== 0) return null;
    const regions = JSON.parse(r.stdout.trim().split('\n').pop());
    return jobs.map((j, k) => ({ file: j.file, t: j.t, regions: regions[k] || [] }));
  } catch { return null; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/**
 * Measures a set (every still once, every clip at three times) and prints the verdict: 3 when the set is a
 * colour wash or shows a banned colour region (o.allowBanned: the banned colour is the brand's own). Notes: the
 * saturated floor, frames over half saturated, the accent's hue in the pictures, pictures that do not match the
 * set, and readable text or logos (o.text false skips the text reader).
 */
export function pictureCheck(graded, accent = null, o = {}) {
  const frames = []; const perFile = [];
  console.log(`\nPicture check (OKLCH: neutral C < ${PICTURE.neutralC}, saturated C >= ${PICTURE.saturatedC}, banned regions on C >= .03${accent ? `, accent within ${PICTURE.accentDeg} deg of ${accent}` : ''}):`);
  for (const g of graded) {
    const times = g.video ? scanTimes(probeFile(g.file)?.duration || 1, 3) : [null];
    const rows = times.map((t) => ({ ...colourShares(frameGrid(g.file, t), accent), file: path.basename(g.file) }));
    frames.push(...rows);
    const mean = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
    perFile.push({ file: path.basename(g.file), L: mean('L'), C: mean('C') });
    const m = (k) => String(Math.round(mean(k) * 100)).padStart(3);
    const ban = Math.max(...rows.map((r) => r.banned));
    console.log(`  ${path.basename(g.file).padEnd(46)} neutral ${m('neutral')} %  saturated ${m('saturated')} %${accent ? `  accent ${m('accent')} %` : ''}${ban >= PICTURE.banned ? `  BANNED ${(ban * 100).toFixed(1)} %` : ''}`);
  }
  const v = pictureVerdict(frames, { allowBanned: Boolean(o.allowBanned) });
  for (const x of setOutliers(perFile)) v.notes.push(`${x.file} does not read as the same shoot: ${x.why}; regrade it on its own (--strength, --chroma) or replace it`);
  if (o.text !== false) {
    const read = readText(graded);
    if (!read) v.notes.push('text and logos: not read (the project\'s Python needs numpy and opencv-python for like.py\'s reader); look at the sheet for signs, adverts and labels');
    else {
      const byFile = new Map();
      for (const r of read) { if (!byFile.has(r.file)) byFile.set(r.file, []); byFile.get(r.file).push(r); }
      for (const [file, rs] of byFile) {
        const steady = steadyText(rs.map((r) => r.regions));
        if (steady.length) v.notes.push(`${path.basename(file)} may show readable text or a logo (${steady.length} steady text-like line(s), e.g. ${steady[0].join(',')} at 480 px): someone else's brand never appears in a film; crop, defocus or replace it (the reader can mistake stripes for text: look)`);
      }
    }
  }
  const pc = (x) => Math.round(x * 100);
  console.log(`Set: neutral ${pc(v.neutral)} % (floor ${pc(PICTURE.minNeutral)} %), saturated ${(v.saturated * 100).toFixed(1)} % (film floor ${PICTURE.minSaturated * 100} %), frames over half saturated ${pc(v.satFrames)} % (ceiling ${pc(PICTURE.maxSatFrames)} %)${accent ? `, accent ${pc(v.accent)} % (ceiling ${pc(PICTURE.maxAccent)} %)` : ''}, banned-colour frames ${v.banned}: ${v.ok ? (v.notes.length ? 'passes, with notes' : 'passes') : 'FAILS'}`);
  for (const n of v.notes) console.log(`  - ${n}`);
  return v.ok ? 0 : 3;
}

// ------------------------------------------------------------------------------------------------ check, probe, looks, licences
function cmdCheck(args) {
  if (args.accent && !/^#[0-9a-f]{6}$/i.test(args.accent)) throw new Usage('--accent is a #rrggbb colour');
  const files = listLocal(args._).filter((f) => !/\.(json|txt|md)$/i.test(f));
  if (!files.length) throw new Usage('check needs graded image or video files (or folders)');
  if (!ffmpegOk()) throw new Error('check needs ffmpeg and ffprobe on the PATH');
  const graded = files.map((f) => ({ file: f, video: /\.(mp4|webm|mov)$/i.test(f) }));
  return pictureCheck(graded, args.accent || null, { allowBanned: Boolean(args['brand-supplied']), text: !args['no-text'] });
}
function cmdProbe(args) {
  const files = listLocal(args._); if (!files.length) throw new Usage('probe needs files');
  const all = files.map((f) => ({ file: f, ...(probeFile(f) || { error: 'not readable by ffprobe' }) }));
  if (args.json) { console.log(JSON.stringify(all, null, 1)); return 0; }
  for (const p of all) {
    if (p.error) { console.log(`${p.file}: ${p.error}`); continue; }
    console.log(`${p.file}: ${p.width}x${p.height} ${p.codec}${p.still ? ' still' : ` · ${p.duration?.toFixed(2)} s · ${p.fps} fps${p.frames ? ` · ${p.frames} frames` : ''}${p.audio ? ' · has audio' : ''}`}${p.colour ? ` · ${p.colour}` : ''}${p.bytes ? ` · ${size(p.bytes)}` : ''}`);
  }
  return 0;
}
function cmdLooks() {
  for (const [k, L] of Object.entries(LOOKS)) console.log(`${k.padEnd(9)} ${L.about}`);
  console.log('\nThe film grades natural (the default), which keeps the pictures\' colour; matte, silver and night are whole-film looks too; tint, duotone and deep are for one shot.');
  console.log('--strength 0..1.5: how far toward the look (0 = the picture as it is); --chroma 0.2..1.5: the colour after it.');
  console.log('node scripts/assets.mjs grade public/assets --accent "#2f7d8c" --out public/assets/graded');
  return 0;
}
function cmdLicences(args) {
  const rec = recordPath(args.to || path.join('public', 'assets'), args.record);
  const doc = readRecord(rec);
  if (!doc.items.length) { console.log(`No imagery recorded in ${rec} yet.`); return 1; }
  for (const x of doc.items) console.log(`${x.file}: ${x.licence}${x.credit_required ? ` · CREDIT: ${x.credit}` : ' · no credit needed'} · ${x.source} · ${x.page}`);
  const credits = doc.items.filter((x) => x.credit_required);
  console.log(credits.length ? `\n${credits.length} item(s) need a credit (taken with --allow-credit).` : '\nNothing here needs a credit: the film shows none.');
  return 0;
}

// ------------------------------------------------------------------------------------------------ main
export const USAGE = `assets.mjs: photographs, footage, textures and art a film may use without credits.

  search "<query>" [--kind photo|video|texture|art] [--source all|${Object.keys(SOURCES).join(',')}]
         [--orientation landscape|portrait|square] [--min-width 1600] [--colour mono|blue|teal|#hex]
         [--limit 8] [--allow-credit] [--out out/assets/<name>.json] [--json] [--no-check]
  sheet  <results.json> [--pick 1,4,7] | <files or folders> [--scan 6] [--cols 4] [--cell 400] [--out sheet.png]
  get    <ref|#n>[,...] --to <film>/public/assets [--from results.json] [--name stem] [--width 2400]
         [--res 1080] [--trim start,seconds] [--max-mb 150] [--allow-credit] [--record path]
  grade  <files or folders> [--look ${Object.keys(LOOKS).join('|')}] [--strength 0..1.5] [--chroma 0.2..1.5]
         [--accent #hex] [--split-hue deg|#hex] [--focus x,y] [--aspect 16:9|none] [--width 2400] [--grain 0..1]
         [--out dir] [--trim start,seconds] [--speed 1] [--scrub] [--dry-run] [--no-check] [--brand-supplied]
         (natural is the default and keeps the pictures' colour; --strength: how far toward the look, 0 = the
         picture as it is; --chroma: the colour after it; a graded set keeps >= 30 % neutral pixels and no banned
         colour region; --split-hue: the shadows' hue in natural, matte and night, cool by default and apart from
         --accent; --scrub: every frame a key frame, for a clip the film's clock drives)
  check  <files or folders> [--accent #hex] [--brand-supplied] [--no-text]   (the picture check grade runs, on
         any set: neutral floor, banned colours, saturated floor, the set's match, readable text and logos)
  probe  <files> [--json]          looks          licences [--to <film>/public/assets]

Refs: #n from the last search, or <source>:<id> as search prints it (a ref is looked up in the saved searches
under out/assets/; a Mixkit ref needs one, or --from); a known work by name or number also works:
commons:File:<file name>, met:<object id>, aic:<artwork id>, nasa:<nasa id>.

Keyless: Openverse (cc0 / public domain), Wikimedia Commons (public domain / CC0), NASA, the Art Institute of
Chicago and the Met (CC0), Mixkit video (free licence only). With a key in the environment: PEXELS_API_KEY,
UNSPLASH_ACCESS_KEY, PIXABAY_API_KEY. Default licences need no credit; --allow-credit adds CC BY. Refused:
share-alike, non-commercial, no-derivatives, Mixkit restricted, unknown.

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
      case 'grade': return await cmdGrade(args);
      case 'probe': return cmdProbe(args);
      case 'check': return cmdCheck(args);
      case 'looks': return cmdLooks();
      case 'licences': case 'licenses': return cmdLicences(args);
      default: throw new Usage(`unknown command ${cmd}: search, sheet, get, grade, check, probe, looks, licences`);
    }
  } catch (e) {
    if (e instanceof Usage) { console.error(`${e.message}\n\n${USAGE}`); return 2; }
    console.error(`assets.mjs: ${redact(e.message)}`); return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
