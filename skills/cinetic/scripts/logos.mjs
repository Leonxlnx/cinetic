#!/usr/bin/env node
/**
 * logos.mjs: real company and product marks in their official colours, from open collections.
 *
 * A film about a product that works with other products shows them as they are: the mail app's own
 * four-colour mark, the model's own spark, the store's own bag, never a generic envelope standing in. This
 * finds the official marks in open collections whose terms allow use, keeps the brand's own colours and
 * proportions, writes the variants a film needs into <film>/public/logos/ and keeps a record of each one
 * (source, licence, trademark owner) in <film>/public/logos/logos.json. The kit (src/kit/logos.tsx) reads
 * the index this writes beside the starter's code (<film>/src/logos.ts: names, files, proportions, tone).
 *
 *   node scripts/logos.mjs search <name> [--source all|gilbarbara,svgl,simple-icons,commons] [--limit 8] [--json]
 *   node scripts/logos.mjs get <name|#n|collection:id> [--variant all|mark|wordmark|mono] [--film .]
 *        [--source <collection>] [--as <slug>] [--name "Shown name"] [--owner "Trademark owner"]
 *        [--tile own|none] [--allow-credit] [--refresh]
 *   node scripts/logos.mjs list [--film .] [--json] [--write]
 *   node scripts/logos.mjs check [--film .]
 *
 * Collections (each checked on its own page, 2026-10-27):
 *   gilbarbara  gilbarbara/logos, the SVG Logos set: full-colour marks and wordmarks, CC0 1.0 (LICENSE.txt).
 *   svgl        svgl.app: marks, light and dark variants and wordmarks; the repository is MIT; its API asks
 *               for cached responses and for no copy of svgl built from it (the full list is cached a week).
 *   simple-icons  Simple Icons: one-colour marks with the brand's official hex; CC0 1.0 for the project, and
 *               an icon under another licence names it (that licence is read and gated per icon).
 *   commons     Wikimedia Commons, the fallback for marks it hosts: public domain (simple text and shape
 *               logos) and CC0 only, read from the file's own page.
 * The licence of the collection is not a trademark licence: every mark stays its owner's trademark. A film
 * shows a mark only for what the product really works with, imports from, runs on or names, never as an
 * endorsement or partnership; the record names the owner; nothing is credited on screen.
 *
 * Variants (files in <film>/public/logos/, the brand's colours unaltered):
 *   <slug>.svg                 the full-colour mark (for light grounds)
 *   <slug>.dark.svg            the mark for dark grounds: the collection's own dark version, else the mark with
 *                              its neutrals reversed (black parts white, white parts ink; colours untouched)
 *   <slug>.wordmark[.dark].svg the wordmark or horizontal lockup, when a collection has one
 *   <slug>.mono.svg            one colour, the brand's official hex (Simple Icons), for a quiet row
 *   <slug>.white.svg / .black.svg  one colour on dark / on light grounds
 * Every file is cleaned (no script, no event handler, no external reference, no text metadata), keeps its
 * proportions, and its viewBox is trimmed to the drawn art when the geometry can be read (padding only goes).
 *
 * Never works around a bot check or a login: a challenge page, a 401/403 or repeated 429s stop the run with
 * what to do. Cache: $CINETIC_HOME/logos (~/.cinetic/logos): collection indexes for a week, files for good.
 * Needs Node 18+ (built-in fetch).
 * Exit codes: 0 done, 1 nothing usable / a step failed, 2 bad arguments.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { commonsLicence } from './assets.mjs';

export const UA = 'cinetic-logos/1.2 (official marks for films; +https://github.com/Leonxlnx/cinetic)';
export const CHECKED = '2026-10-27';
const WEEK = 7 * 24 * 3600 * 1000;
const MAX_SVG = 512 * 1024;
const SI_VERSION = '16';

// ------------------------------------------------------------------------------------------------ collections
/** The open collections, their licences as read on their own pages, and where their files live. */
export const COLLECTIONS = {
  gilbarbara: {
    name: 'SVG Logos (gilbarbara/logos)', page: 'https://github.com/gilbarbara/logos', licence: 'CC0-1.0',
    licenceUrl: 'https://github.com/gilbarbara/logos/blob/main/LICENSE.txt',
    seen: { quote: 'CC0 1.0 Universal', url: 'https://raw.githubusercontent.com/gilbarbara/logos/main/LICENSE.txt' },
    index: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos.json',
    file: (f) => `https://raw.githubusercontent.com/gilbarbara/logos/main/logos/${encodeURIComponent(f)}`,
  },
  svgl: {
    name: 'svgl', page: 'https://svgl.app', licence: 'MIT', licenceUrl: 'https://github.com/pheralb/svgl/blob/main/LICENSE',
    seen: { quote: 'ensure you have the right to use it and that its license permits adding it to svgl', url: 'https://github.com/pheralb/svgl#readme' },
    terms: 'the API asks for cached responses and for no copy of svgl built from it',
    index: 'https://api.svgl.app',
  },
  'simple-icons': {
    name: 'Simple Icons', page: 'https://simpleicons.org', licence: 'CC0-1.0', licenceUrl: 'https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md',
    seen: { quote: 'Please see individual licenses where available.', url: 'https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md' },
    index: `https://cdn.jsdelivr.net/npm/simple-icons@${SI_VERSION}/data/simple-icons.json`,
    file: (slug) => `https://cdn.jsdelivr.net/npm/simple-icons@${SI_VERSION}/icons/${encodeURIComponent(slug)}.svg`,
  },
  commons: {
    name: 'Wikimedia Commons', page: 'https://commons.wikimedia.org', licence: 'per file (public domain or CC0 only)',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing',
  },
};
/** The order a full-colour mark is taken in (CC0 sets first); one-colour marks come from Simple Icons. */
export const COLOUR_ORDER = ['gilbarbara', 'svgl', 'commons', 'simple-icons'];

/** Licences a mark's file may carry. `notice`: a permissive licence whose notice is kept in the record. */
export const LICENCES = {
  'CC0-1.0': { ok: true }, 'PD': { ok: true }, 'MIT': { ok: true, notice: true }, 'Apache-2.0': { ok: true, notice: true },
  'ISC': { ok: true, notice: true }, 'BSD-2-Clause': { ok: true, notice: true }, 'BSD-3-Clause': { ok: true, notice: true },
  'OFL-1.1': { ok: true, notice: true }, 'CC-BY-4.0': { ok: false, credit: true }, 'CC-BY-3.0': { ok: false, credit: true },
};
/** May a file under licence `id` go into a film? { ok, why }: CC BY only with --allow-credit (credit kept in the record, never on screen). */
export function licenceOk(id, { allowCredit = false } = {}) {
  const L = LICENCES[id];
  if (!L) return { ok: false, why: `licence ${id || 'unknown'} is not one a film can rely on (share-alike, non-commercial, no-derivatives or unknown)` };
  if (L.ok) return { ok: true, why: L.notice ? `${id}: notice kept in the record` : '' };
  if (L.credit && allowCredit) return { ok: true, why: `${id}: credit kept in the record (delivery notes, never on screen)` };
  return { ok: false, why: `${id} asks for a credit (pass --allow-credit to keep it in the record)` };
}

/** Trademark owners by the brand's home domain (the brand's own site names them); --owner wins, unknown says so. */
export const OWNERS = {
  'google.com': 'Google LLC', 'gmail.com': 'Google LLC', 'youtube.com': 'Google LLC', 'android.com': 'Google LLC', 'withgoogle.com': 'Google LLC',
  'google': 'Google LLC', 'chrome.com': 'Google LLC', 'firebase.google.com': 'Google LLC', 'deepmind.google': 'Google LLC',
  'openai.com': 'OpenAI', 'chatgpt.com': 'OpenAI', 'anthropic.com': 'Anthropic PBC', 'claude.ai': 'Anthropic PBC', 'claude.com': 'Anthropic PBC',
  'microsoft.com': 'Microsoft Corporation', 'office.com': 'Microsoft Corporation', 'azure.com': 'Microsoft Corporation', 'bing.com': 'Microsoft Corporation',
  'github.com': 'GitHub, Inc.', 'linkedin.com': 'LinkedIn Corporation', 'apple.com': 'Apple Inc.',
  'meta.com': 'Meta Platforms, Inc.', 'facebook.com': 'Meta Platforms, Inc.', 'instagram.com': 'Meta Platforms, Inc.', 'whatsapp.com': 'Meta Platforms, Inc.',
  'amazon.com': 'Amazon.com, Inc.', 'slack.com': 'Slack Technologies, LLC', 'salesforce.com': 'Salesforce, Inc.', 'notion.so': 'Notion Labs, Inc.',
  'notion.com': 'Notion Labs, Inc.', 'figma.com': 'Figma, Inc.', 'spotify.com': 'Spotify AB', 'stripe.com': 'Stripe, Inc.', 'dropbox.com': 'Dropbox, Inc.',
  'discord.com': 'Discord Inc.', 'adobe.com': 'Adobe Inc.', 'atlassian.com': 'Atlassian', 'shopify.com': 'Shopify Inc.', 'x.com': 'X Corp.',
  'linear.app': 'Linear Orbit, Inc.', 'vercel.com': 'Vercel Inc.', 'hubspot.com': 'HubSpot, Inc.', 'mistral.ai': 'Mistral AI', 'nvidia.com': 'NVIDIA Corporation',
  'paypal.com': 'PayPal, Inc.', 'reddit.com': 'Reddit, Inc.', 'zoom.us': 'Zoom Communications, Inc.', 'dribbble.com': 'Dribbble Holdings Ltd.',
};
/** The home host of a URL without www. ('' when it is not a URL). */
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
/** The owner for a site: its host, then each parent domain; null when unknown. */
export function ownerOf(site) {
  let h = hostOf(site);
  while (h) {
    if (OWNERS[h]) return OWNERS[h];
    const i = h.indexOf('.');
    if (i < 0) break;
    h = h.slice(i + 1);
  }
  return null;
}

// ------------------------------------------------------------------------------------------------ names
export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
const PARENTS = ['google', 'microsoft', 'apple', 'adobe', 'amazon', 'aws', 'meta', 'atlassian', 'jetbrains', 'mozilla'];
/** A name without its parent company's word ("Google Gmail" -> "gmail"). */
export const bare = (s) => { const n = norm(s); const p = PARENTS.find((w) => n.startsWith(w) && n.length > w.length + 2); return p ? n.slice(p.length) : n; };
export const slugOf = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'logo';

/** How well a brand name answers the query: 100 exact, 95 without the parent's word, 60-80 a prefix, 40 inside, 0 none. */
export function nameScore(query, name, extra = []) {
  const q = norm(query);
  if (!q) return 0;
  let best = 0;
  for (const cand of [name, ...extra]) {
    const n = norm(cand);
    if (!n) continue;
    if (n === q) return 100;
    if (bare(cand) === q || n === bare(query)) best = Math.max(best, 95);
    else if (n.startsWith(q)) best = Math.max(best, 60 + Math.round((q.length / n.length) * 20));
    else if (n.includes(q) && q.length >= 3) best = Math.max(best, 40);
    else if (q.includes(n) && n.length >= 4) best = Math.max(best, 30);
  }
  return best;
}

// ------------------------------------------------------------------------------------------------ http and cache
export const homeDir = (env = process.env) => env.CINETIC_HOME || path.join(os.homedir(), '.cinetic');
const cacheDir = () => path.join(homeDir(), 'logos');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A stop the user has to resolve in a browser: never worked around. */
export class Blocked extends Error {}
/** A challenge or login page instead of the file asked for. */
export const looksLikeChallenge = (text) => /captcha|cf-chl|challenge-platform|verify you are human|<form[^>]+(login|signin)/i.test(String(text).slice(0, 20000));

async function http(url, { as = 'text', ms = 25000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': UA, Accept: as === 'json' ? 'application/json' : 'image/svg+xml,text/plain,*/*' }, signal: AbortSignal.timeout(ms), redirect: 'follow' }); }
    catch (e) {
      const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError';
      if (!timedOut && attempt < 2) { await sleep(800); continue; }
      throw new Error(timedOut ? `no answer within ${Math.round(ms / 1000)} s (${url})` : `could not connect (${e?.cause?.code || e?.message || 'network error'})`);
    }
    if ([502, 503, 504].includes(r.status) && attempt < 2) { await sleep(1200); continue; }
    if (r.status === 429) {
      const wait = Math.min(20, Number(r.headers?.get?.('retry-after')) || 6 * attempt);
      if (attempt < 3) { await sleep(wait * 1000); continue; }
      throw new Blocked(`rate limited (HTTP 429) by ${hostOf(url)}: wait a few minutes; logos.mjs never works around a limit`);
    }
    if (r.status === 401 || r.status === 403) throw new Blocked(`${hostOf(url)} refused the request (HTTP ${r.status}): it wants a login or a check; open it in a browser yourself, logos.mjs never works around one`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${hostOf(url)}`);
    const text = await r.text();
    if (text.length > 8 * 1024 * 1024) throw new Error(`answer too large from ${hostOf(url)}`);
    const type = String(r.headers?.get?.('content-type') || '');
    if (/text\/html/i.test(type) && looksLikeChallenge(text)) throw new Blocked(`${hostOf(url)} answered with a check page: open it in a browser yourself; logos.mjs never works around one`);
    if (as === 'json') { try { return JSON.parse(text); } catch { throw new Error(`the answer from ${hostOf(url)} was not JSON`); } }
    return text;
  }
}

function readCache(file, maxAge) {
  try {
    const st = fs.statSync(file);
    if (maxAge && Date.now() - st.mtimeMs > maxAge) return null;
    return fs.readFileSync(file, 'utf8');
  } catch { return null; }
}
function writeCache(file, text) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); } catch { /* the cache is a convenience */ }
}
/** A collection's index, from the week's cache or the network. */
async function index(name, { refresh = false } = {}) {
  const file = path.join(cacheDir(), `index-${name}.json`);
  const hit = !refresh && readCache(file, WEEK);
  if (hit) { try { return JSON.parse(hit); } catch { /* refetch */ } }
  const j = await http(COLLECTIONS[name].index, { as: 'json' });
  if (!j) throw new Error(`${COLLECTIONS[name].name}: the index is gone (${COLLECTIONS[name].index})`);
  writeCache(file, JSON.stringify(j));
  return j;
}
/** An SVG by URL, from the cache (files never change under their URL here) or the network. */
async function svgAt(url, { refresh = false } = {}) {
  const file = path.join(cacheDir(), 'files', `${hostOf(url)}${new URL(url).pathname}`.replace(/[^\w./-]+/g, '_'));
  const hit = !refresh && readCache(file);
  if (hit) return hit;
  const t = await http(url);
  if (t === null) return null;
  if (t.length > MAX_SVG) throw new Error(`${url}: larger than ${MAX_SVG / 1024} KB, not a logo file`);
  writeCache(file, t);
  return t;
}

// ------------------------------------------------------------------------------------------------ search
/** gilbarbara/logos index entries ({name, shortname, url, files}) answering the query. */
export function searchGilbarbara(list, q) {
  return (Array.isArray(list) ? list : []).map((x) => ({ x, s: nameScore(q, x.name, [x.shortname]) })).filter((r) => r.s >= 30)
    .map(({ x, s }) => ({ collection: 'gilbarbara', id: x.shortname, name: x.name, site: x.url || '', score: s, files: x.files || [] }));
}
/** svgl entries ({id, title, route, wordmark, url, brandUrl}). */
export function searchSvgl(list, q) {
  return (Array.isArray(list) ? list : []).map((x) => ({ x, s: nameScore(q, x.title) })).filter((r) => r.s >= 30)
    .map(({ x, s }) => ({ collection: 'svgl', id: String(x.id), name: x.title, site: x.url || '', score: s, route: x.route, wordmark: x.wordmark || null, guidelines: x.brandUrl || null }));
}
/** Simple Icons data ({title, slug, hex, source, guidelines, license, aliases}). */
export function searchSimpleIcons(data, q) {
  const list = Array.isArray(data) ? data : data?.icons || [];
  return list.map((x) => {
    const al = x.aliases || {};
    const extra = [x.slug, ...(al.aka || []), ...(al.old || []), ...Object.values(al.loc || {}), ...Object.values(al.dup || {}).map((d) => d?.title).filter(Boolean)];
    return { x, s: nameScore(q, x.title, extra) };
  }).filter((r) => r.s >= 30).map(({ x, s }) => ({
    collection: 'simple-icons', id: x.slug || slugOf(x.title).replace(/-/g, ''), name: x.title, site: '', source: x.source || '', score: s,
    hex: x.hex ? `#${String(x.hex).toUpperCase()}` : null, guidelines: x.guidelines || null, licence: x.license?.type || 'CC0-1.0', licenceUrl: x.license?.url || null,
  }));
}
/** Commons search results (generator=search over File: pages, imageinfo with extmetadata). */
export function parseCommonsLogos(j, q) {
  const pages = j?.query?.pages || [];
  return pages.map((p) => {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !/svg/.test(ii.mime || '')) return null;
    const meta = Object.fromEntries(Object.entries(ii.extmetadata || {}).map(([k, v]) => [k, v?.value]));
    const { id: lic, notes } = commonsLicence(meta);
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.svg$/i, '');
    const name = title.replace(/[_-]+/g, ' ').replace(/\b(logo|icon|wordmark|mark|svg)\b|\(.*?\)|\d{4}/gi, ' ').replace(/\s+/g, ' ').trim();
    return { collection: 'commons', id: String(p.title), name: name || title, site: '', score: Math.min(80, nameScore(q, name || title)), url: ii.url, page: ii.descriptionurl,
      licence: lic === 'cc0' ? 'CC0-1.0' : lic === 'pd' ? 'PD' : lic, notes };
  }).filter((r) => r && r.score >= 30);
}
export const commonsSearchUrl = (q) => `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*',
  generator: 'search', gsrnamespace: '6', gsrlimit: '12', gsrsearch: `${q} logo filemime:image/svg+xml`, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata',
  iiextmetadatafilter: 'License|LicenseShortName|Restrictions|UsageTerms' })}`;

/** Members of several collections grouped into brands: one name (with or without the parent's word) or one home host. */
export function groupBrands(members) {
  const groups = [];
  const GENERIC = new Set(['github.com', 'wikipedia.org', 'en.wikipedia.org', 'fonts.gstatic.com', 'commons.wikimedia.org', '']);
  for (const m of [...members].sort((a, b) => b.score - a.score)) {
    const keys = new Set([norm(m.name), bare(m.name)]);
    const host = hostOf(m.site);
    const g = groups.find((x) => [...keys].some((k) => x.keys.has(k)) || (host && !GENERIC.has(host) && x.hosts.has(host)));
    if (g) {
      if (!g.members.some((y) => y.collection === m.collection)) g.members.push(m);
      keys.forEach((k) => g.keys.add(k)); if (host) g.hosts.add(host);
      g.score = Math.max(g.score, m.score);
    } else groups.push({ keys, hosts: new Set(host ? [host] : []), members: [m], score: m.score });
  }
  return groups.map((g) => {
    const by = (c) => g.members.find((m) => m.collection === c);
    const name = (by('simple-icons') || by('svgl') || by('gilbarbara') || g.members[0]).name;
    const site = (by('svgl') || by('gilbarbara') || {}).site || '';
    return { name, site, owner: ownerOf(site), score: g.score, members: g.members };
  }).sort((a, b) => b.score - a.score || b.members.length - a.members.length);
}

/** Search the collections; Commons only when named or when nothing else answers. { groups, notes }. */
export async function search(q, { sources = ['gilbarbara', 'svgl', 'simple-icons'], refresh = false } = {}) {
  const notes = [];
  const members = [];
  const tryOne = async (name, fn) => { try { members.push(...(await fn())); } catch (e) { if (e instanceof Blocked) throw e; notes.push(`${COLLECTIONS[name].name}: ${e.message}`); } };
  await Promise.all(sources.filter((s) => s !== 'commons').map((s) => tryOne(s, async () => {
    const list = await index(s, { refresh });
    return s === 'gilbarbara' ? searchGilbarbara(list, q) : s === 'svgl' ? searchSvgl(list, q) : searchSimpleIcons(list, q);
  })));
  const exact = members.some((m) => m.score >= 95);
  if (sources.includes('commons') || !exact) {
    if (sources.includes('commons') || members.length === 0) await tryOne('commons', async () => parseCommonsLogos(await http(commonsSearchUrl(q), { as: 'json' }), q));
  }
  return { groups: groupBrands(members), notes };
}

// ------------------------------------------------------------------------------------------------ svg
/** Remove what an image file must never carry: scripts, handlers, external references, entities, metadata and text blocks. */
export function sanitizeSvg(src) {
  let s = String(src ?? '').replace(/^﻿/, '');
  if (/<!ENTITY/i.test(s)) throw new Error('the SVG declares entities: refused');
  s = s.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|foreignObject|metadata|title|desc|sodipodi:namedview|iframe|object|embed|audio|video)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|foreignObject|metadata|title|desc|sodipodi:namedview|iframe|object|embed|audio|video)\b[^>]*\/>/gi, '');
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s+(xlink:href|href)\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, attr, q, a, b) => {
    const v = (a ?? b ?? '').trim();
    return v.startsWith('#') || /^data:image\/(png|jpeg|webp);base64,/i.test(v) ? m : '';
  });
  s = s.replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, 'none').replace(/@import[^;]+;/gi, '');
  s = s.replace(/\s+(inkscape|sodipodi):[\w-]+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  const open = s.match(/<svg\b[^>]*>/i);
  if (!open || !/<\/svg\s*>\s*$/i.test(s.trim())) throw new Error('not an SVG document');
  s = s.slice(s.indexOf(open[0])).trim();
  return s;
}

const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3]) : null; };
const styleProp = (tag, name) => { const st = attr(tag, 'style'); if (!st) return null; const m = st.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i')); return m ? m[1].trim() : null; };
const prop = (tag, name) => styleProp(tag, name) ?? attr(tag, name);
const nums = (s) => (String(s ?? '').match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || []).map(Number);

/** The root's viewBox [x, y, w, h] (from width/height when it has none), or null. */
export function viewBoxOf(svg) {
  const open = (svg.match(/<svg\b[^>]*>/i) || [''])[0];
  const vb = nums(attr(open, 'viewBox'));
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return vb;
  const w = parseFloat(attr(open, 'width')), h = parseFloat(attr(open, 'height'));
  return w > 0 && h > 0 ? [0, 0, w, h] : null;
}

// 2D affine matrices [a, b, c, d, e, f]
const IDENT = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** A transform attribute as one matrix. */
export function parseTransform(s) {
  let m = IDENT;
  for (const [, fn, args] of String(s ?? '').matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = nums(args);
    let t = IDENT;
    if (fn === 'matrix' && a.length === 6) t = a;
    else if (fn === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (fn === 'scale') t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (fn === 'rotate') {
      const r = ((a[0] || 0) * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
      t = [cs, sn, -sn, cs, 0, 0];
      if (a.length >= 3) t = mul(mul([1, 0, 0, 1, a[1], a[2]], t), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (fn === 'skewX') t = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
    else if (fn === 'skewY') t = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = mul(m, t);
  }
  return m;
}

/** Points along a path's outline (curves and arcs sampled), one list per subpath, in user units. */
export function pathPoints(d) {
  const s = String(d ?? '');
  let i = 0;
  const ws = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
  const num = () => {
    ws();
    const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(s.slice(i, i + 40));
    if (!m) throw new Error('bad path');
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = () => { ws(); const c = s[i++]; if (c !== '0' && c !== '1') throw new Error('bad arc flag'); return c === '1' ? 1 : 0; };
  const subs = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = '';
  const add = (px, py) => { if (!cur) { cur = []; subs.push(cur); } cur.push([px, py]); };
  const N = 12;
  while (true) {
    ws();
    if (i >= s.length) break;
    if (/[a-zA-Z]/.test(s[i])) cmd = s[i++];
    else if (!cmd) throw new Error('bad path');
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { x = sx; y = sy; if (cur) cur.push([x, y]); cur = null; prev = 'Z'; continue; }
    if (C === 'M') { x = num() + ox; y = num() + oy; sx = x; sy = y; cur = null; add(x, y); cmd = rel ? 'l' : 'L'; prev = 'M'; continue; }
    if (C === 'L') { x = num() + ox; y = num() + oy; add(x, y); }
    else if (C === 'H') { x = num() + ox; add(x, y); }
    else if (C === 'V') { y = num() + oy; add(x, y); }
    else if (C === 'C' || C === 'S') {
      let x1, y1;
      if (C === 'C') { x1 = num() + ox; y1 = num() + oy; } else { x1 = /[CS]/.test(prev) ? 2 * x - lcx : x; y1 = /[CS]/.test(prev) ? 2 * y - lcy : y; }
      const x2 = num() + ox, y2 = num() + oy, ex = num() + ox, ey = num() + oy;
      for (let k = 1; k <= N; k++) { const t = k / N, u = 1 - t; add(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey); }
      lcx = x2; lcy = y2; x = ex; y = ey;
    } else if (C === 'Q' || C === 'T') {
      let qx, qy;
      if (C === 'Q') { qx = num() + ox; qy = num() + oy; } else { qx = /[QT]/.test(prev) ? 2 * x - lqx : x; qy = /[QT]/.test(prev) ? 2 * y - lqy : y; }
      const ex = num() + ox, ey = num() + oy;
      for (let k = 1; k <= N; k++) { const t = k / N, u = 1 - t; add(u * u * x + 2 * u * t * qx + t * t * ex, u * u * y + 2 * u * t * qy + t * t * ey); }
      lqx = qx; lqy = qy; x = ex; y = ey;
    } else if (C === 'A') {
      let rx = Math.abs(num()), ry = Math.abs(num());
      const rot = (num() * Math.PI) / 180, large = flag(), sweep = flag();
      const ex = num() + ox, ey = num() + oy;
      if (!rx || !ry) add(ex, ey);
      else {
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const dx = (x - ex) / 2, dy = (y - ey) / 2;
        const x1 = cs * dx + sn * dy, y1 = -sn * dx + cs * dy;
        const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
        if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
        const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
        const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
        const cx = cs * cx1 - sn * cy1 + (x + ex) / 2, cy = sn * cx1 + cs * cy1 + (y + ey) / 2;
        const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const th1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
        let dth = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
        if (!sweep && dth > 0) dth -= 2 * Math.PI; else if (sweep && dth < 0) dth += 2 * Math.PI;
        for (let k = 1; k <= N; k++) { const th = th1 + (dth * k) / N; add(cx + rx * Math.cos(th) * cs - ry * Math.sin(th) * sn, cy + rx * Math.cos(th) * sn + ry * Math.sin(th) * cs); }
      }
      x = ex; y = ey;
    } else throw new Error(`path command ${cmd}`);
    prev = C;
  }
  return subs;
}

/** How far an outline reaches into its box's corners: the smallest of the four, 1 for a square, 0.71 for a circle. */
export const cornerReach = (pts, [x0, y0, x1, y1]) => {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
  if (!(hw > 0 && hh > 0)) return 0;
  return Math.min(...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sy]) => Math.max(...pts.map(([px, py]) => ((px - cx) / hw * sx + (py - cy) / hh * sy) / 2))));
};
const shoelace = (pts) => { let a = 0; for (let k = 0; k < pts.length; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };

/** The outline points of one shape element (its own coordinates), one list per subpath; null when it cannot be read. */
function shapePoints(name, tag) {
  const f = (k) => parseFloat(attr(tag, k)) || 0;
  switch (name) {
    case 'rect': { const x = f('x'), y = f('y'), w = f('width'), h = f('height'); return w > 0 && h > 0 ? [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]] : []; }
    case 'circle': { const cx = f('cx'), cy = f('cy'), r = f('r'); return r > 0 ? [Array.from({ length: 24 }, (_, k) => [cx + r * Math.cos((k * Math.PI) / 12), cy + r * Math.sin((k * Math.PI) / 12)])] : []; }
    case 'ellipse': { const cx = f('cx'), cy = f('cy'), rx = f('rx'), ry = f('ry'); return rx > 0 && ry > 0 ? [Array.from({ length: 24 }, (_, k) => [cx + rx * Math.cos((k * Math.PI) / 12), cy + ry * Math.sin((k * Math.PI) / 12)])] : []; }
    case 'line': return [[[f('x1'), f('y1')], [f('x2'), f('y2')]]];
    case 'polyline': case 'polygon': { const p = nums(attr(tag, 'points')); const pts = []; for (let k = 0; k + 1 < p.length; k += 2) pts.push([p[k], p[k + 1]]); return [pts]; }
    case 'path': return pathPoints(attr(tag, 'd'));
    case 'image': { const x = f('x'), y = f('y'), w = f('width'), h = f('height'); return w > 0 && h > 0 ? [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]] : []; }
    default: return null;
  }
}

const SKIP = new Set(['defs', 'clippath', 'mask', 'symbol', 'lineargradient', 'radialgradient', 'pattern', 'marker', 'filter', 'style']);
const SHAPES = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'image']);

/**
 * What an SVG draws: the bounding box of its painted shapes in viewBox units (transforms applied, strokes
 * included; null when it uses <use> or <text>, which are not read), the first painted shape's box and how much of
 * that box its outline fills (a coloured tile behind the mark: a rounded square fills more than 0.8 of it and reaches past 0.74 into each corner, a circle
 * fills 0.785 and reaches 0.71).
 */
export function geometry(svg) {
  const stack = [{ m: IDENT, skip: false, paint: true }];
  let box = null, first = null, unreadable = false;
  const grow = (b, x, y) => (b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)] : [x, y, x, y]);
  for (const t of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [whole, close, rawName, , selfClose] = t;
    const name = rawName.toLowerCase();
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const top = stack[stack.length - 1];
    const m = mul(top.m, parseTransform(attr(whole, 'transform')));
    const skip = top.skip || SKIP.has(name) || prop(whole, 'display') === 'none' || prop(whole, 'visibility') === 'hidden';
    if (!skip && (name === 'use' || name === 'text')) unreadable = true;
    if (!skip && SHAPES.has(name)) {
      let subs = null;
      try { subs = shapePoints(name, whole); } catch { unreadable = true; }
      const fill = prop(whole, 'fill'), stroke = prop(whole, 'stroke'), op = parseFloat(prop(whole, 'opacity') ?? prop(whole, 'fill-opacity') ?? '1');
      const painted = !(fill === 'none' && (!stroke || stroke === 'none')) && op > 0.01;
      if (subs && painted) {
        const sw = stroke && stroke !== 'none' ? (parseFloat(prop(whole, 'stroke-width')) || 1) / 2 : 0;
        let b = null;
        for (const sp of subs) for (const [px, py] of sp) for (const [ddx, ddy] of sw ? [[-sw, -sw], [sw, sw], [-sw, sw], [sw, -sw]] : [[0, 0]]) { const [X, Y] = apply(m, px + ddx, py + ddy); b = grow(b, X, Y); }
        if (b) {
          box = grow(grow(box, b[0], b[1]), b[2], b[3]);
          if (!first && fill !== 'none' && subs[0]?.length > 2) {
            const outline = subs[0].map(([px, py]) => apply(m, px, py));
            const area = (b[2] - b[0]) * (b[3] - b[1]);
            first = { box: b, cover: area > 0 ? shoelace(outline) / area : 0, corners: cornerReach(outline, b), fill: fill ?? 'black' };
          }
        }
      }
    }
    if (name === 'svg' && stack.length > 1) unreadable = true; // a nested viewport is not read
    if (!selfClose) stack.push({ m, skip });
  }
  return { box: unreadable || !box ? null : [box[0], box[1], box[2] - box[0], box[3] - box[1]], first, unreadable };
}

// ------------------------------------------------------------------------------------------------ colour
const NAMED = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080', silver: '#c0c0c0', yellow: '#ffff00', orange: '#ffa500' };
/** [r, g, b] 0..255 for a CSS colour (hex, rgb(), a few names); null for none, currentColor, url() and unknowns. */
export function rgbOf(c) {
  const s = String(c ?? '').trim().toLowerCase();
  if (NAMED[s]) return rgbOf(NAMED[s]);
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((x) => x + x).join('');
    if (h.length < 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = s.match(/^rgba?\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
/** OKLab lightness and chroma of an [r, g, b]. */
export function lc([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808688894 * s;
  return { L, C: Math.hypot(A, Bb) };
}
/** The SVG with `fn` applied outside its <mask> and <clipPath> blocks (their black and white are alpha, not colour). */
export const outsideMasks = (svg, fn) => svg.split(/(<(mask|clipPath)\b[\s\S]*?<\/\2\s*>)/i).map((part, k) => (k % 3 === 0 ? fn(part) : k % 3 === 1 ? part : '')).join('');
const PAINT_RE = /((?:fill|stroke|stop-color|color)\s*(?:=\s*["']|:\s*))([^"';}]+)/gi;
/**
 * What an SVG paints with: { colour, alpha } for every shape's fill and stroke (inherited from its groups; a
 * shape with no fill anywhere paints black), every gradient stop and every colour in a <style> block. Masks
 * and clip paths are left out (their black and white are alpha).
 */
export function paints(svg) {
  const out = [];
  const body = outsideMasks(svg, (x) => x);
  const styled = /<style\b/i.test(body);
  for (const m of (body.match(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi) || []).join('').matchAll(/(?:fill|stroke|stop-color)\s*:\s*([^;}]+)/gi)) if (rgbOf(m[1])) out.push({ colour: m[1].trim().toLowerCase(), alpha: 1 });
  const stack = [{ skip: false, fill: null, stroke: null, alpha: 1 }];
  for (const t of body.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [whole, close, rawName, , selfClose] = t;
    const name = rawName.toLowerCase();
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const top = stack[stack.length - 1];
    const op = parseFloat(prop(whole, 'opacity') ?? '1');
    const node = { skip: top.skip || (SKIP.has(name) && !/gradient/.test(name)), fill: prop(whole, 'fill') ?? top.fill, stroke: prop(whole, 'stroke') ?? top.stroke, alpha: top.alpha * (Number.isFinite(op) ? op : 1) };
    if (name === 'stop') {
      const c = prop(whole, 'stop-color') ?? 'black';
      if (rgbOf(c)) out.push({ colour: c.trim().toLowerCase(), alpha: node.alpha * (parseFloat(prop(whole, 'stop-opacity') ?? '1') || 0) });
    } else if (!node.skip && SHAPES.has(name) && name !== 'image') {
      const fa = node.alpha * (parseFloat(prop(whole, 'fill-opacity') ?? '1'));
      const fill = node.fill ?? (styled && attr(whole, 'class') ? null : 'black');
      if (fill && rgbOf(fill)) out.push({ colour: fill.trim().toLowerCase(), alpha: Number.isFinite(fa) ? fa : 1 });
      if (node.stroke && rgbOf(node.stroke)) out.push({ colour: node.stroke.trim().toLowerCase(), alpha: node.alpha * (parseFloat(prop(whole, 'stroke-opacity') ?? '1') || 0) });
    }
    if (!selfClose) stack.push(node);
  }
  return out;
}
/** The colours an SVG shows (alpha 0.35 or more; a faint shadow is not the mark's colour). */
export const coloursOf = (svg) => [...new Set(paints(svg).filter((p) => p.alpha >= 0.35).map((p) => (p.colour === 'black' ? '#000000' : p.colour === 'white' ? '#ffffff' : p.colour)))];
/**
 * The mark's tone: 'dark' when it paints with dark neutrals (it needs a dark-ground version), 'light' when it
 * paints only with light neutrals (it is the dark-ground version), else 'colour'.
 */
export function toneOf(svg) {
  const cs = coloursOf(svg).map(rgbOf).filter(Boolean).map(lc);
  if (!cs.length) return 'colour';
  const neutral = cs.filter((c) => c.C < 0.04);
  if (neutral.some((c) => c.L < 0.45)) return 'dark';
  if (neutral.length === cs.length && cs.every((c) => c.L > 0.85)) return 'light';
  return 'colour';
}
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
/** The SVG with its neutrals reversed (dark parts light, light parts ink); saturated colours untouched. */
export function reverseNeutrals(svg) {
  const flip = (v) => {
    const rgb = rgbOf(v);
    if (!rgb) return v;
    const { L, C } = lc(rgb);
    if (C >= 0.04) return v;
    if (L < 0.45) return '#ffffff';
    if (L > 0.85) return '#141414';
    const g = 255 * (1 - L);
    return `#${hex2(g)}${hex2(g)}${hex2(g)}`;
  };
  let out = outsideMasks(svg, (x) => x.replace(PAINT_RE, (m, k, v) => k + flip(v.trim())));
  if (!/<svg\b[^>]*\sfill\s*=/i.test(out)) out = out.replace(/<svg\b/i, '<svg fill="#ffffff"'); // shapes with no fill anywhere paint black: white here
  return out;
}
/** The SVG in one colour: every paint (fill, stroke, gradient stop) becomes `colour`; 'none' stays none. */
export function oneColour(svg, colour) {
  let out = outsideMasks(svg, (x) => x.replace(PAINT_RE, (m, k, v) => {
    const t = v.trim().toLowerCase();
    return t === 'none' || t === 'transparent' || t.startsWith('url(') ? m : k + colour;
  }));
  out = out.replace(/<svg\b([^>]*)>/i, (m, a) => `<svg${a.replace(/\s(fill|color)\s*=\s*("[^"]*"|'[^']*')/gi, '')} fill="${colour}" color="${colour}">`);
  return out;
}

const paleOrNone = (c) => {
  if (/^(none|transparent)$/i.test(String(c).trim())) return true;
  const rgb = rgbOf(c);
  if (!rgb) return false;
  const { L, C } = lc(rgb);
  return L > 0.9 && C < 0.04;
};
/** A cleaned file: its viewBox trimmed to the art (inside the original), its size attributes set to it. { svg, viewBox, aspect, trimmed, tile }. */
export function prepare(raw, { tile } = {}) {
  let svg = sanitizeSvg(raw);
  const vb0 = viewBoxOf(svg);
  if (!vb0) throw new Error('the SVG has no viewBox or size');
  const g = geometry(svg);
  let vb = vb0, trimmed = false;
  if (g.box && g.box[2] > 0 && g.box[3] > 0) {
    const x0 = Math.max(vb0[0], g.box[0]), y0 = Math.max(vb0[1], g.box[1]);
    const x1 = Math.min(vb0[0] + vb0[2], g.box[0] + g.box[2]), y1 = Math.min(vb0[1] + vb0[3], g.box[1] + g.box[3]);
    if (x1 > x0 && y1 > y0 && (x1 - x0) * (y1 - y0) < vb0[2] * vb0[3] * 0.995) { vb = [x0, y0, x1 - x0, y1 - y0]; trimmed = true; }
  }
  const r = (n) => Number(n.toFixed(3));
  vb = vb.map(r);
  const isTile = tile === 'own' ? true : tile === 'none' ? false
    : !!(g.first && g.first.cover > 0.8 && g.first.corners > 0.74 && g.first.box[2] - g.first.box[0] >= vb[2] * 0.9 && g.first.box[3] - g.first.box[1] >= vb[3] * 0.9
      && Math.abs(Math.log(vb[2] / vb[3])) < 0.12 && !paleOrNone(g.first.fill)); // a square, coloured shape behind everything: the brand's own tile
  svg = svg.replace(/<svg\b([^>]*)>/i, (m, a) => {
    const rest = a.replace(/\s(viewBox|width|height|x|y|preserveAspectRatio)\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/\s+xmlns\s*=\s*("[^"]*"|'[^']*')/i, '');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}"${rest}>`;
  });
  return { svg, viewBox: vb, aspect: r(vb[2] / vb[3]), trimmed, tile: isTile };
}

// ------------------------------------------------------------------------------------------------ plan a brand
/** gilbarbara files sorted into roles by their names: { mark, markDark, word, wordDark } lists, newest version first. */
export function gilbarbaraRoles(shortname, files) {
  const roles = { mark: [], markDark: [], base: [], baseDark: [] };
  const year = (f) => Number((f.match(/-(\d{4})(?:-|\.svg$)/) || [])[1] || 0);
  for (const f of files) {
    const rest = f.replace(/\.svg$/i, '').slice(shortname.length);
    if (/monochrome|-alt|-classic|-pirate|-octocat|-tomster|-vertical/.test(rest)) continue;
    if (/^-icon(-\d{4})?-dark$/.test(rest)) roles.markDark.push(f);
    else if (/^-icon(-\d{4})?$/.test(rest)) roles.mark.push(f);
    else if (/^(-\d{4})?-dark$/.test(rest)) roles.baseDark.push(f);
    else if (/^(-\d{4})?$/.test(rest)) roles.base.push(f);
  }
  for (const k of Object.keys(roles)) roles[k].sort((a, b) => year(b) - year(a));
  return roles;
}
const themed = (v, k) => (v && typeof v === 'object' ? v[k] || null : k === 'light' ? v || null : null);

/** A file chosen for a role: where it comes from and under which licence. */
const pick = (role, collection, url, extra = {}) => ({ role, collection, url, ...extra });

/**
 * The files to fetch for a brand group, per role (mark, markDark, wordmark, wordmarkDark, mono): candidates in
 * order; the roles of a base file (mark or wordmark) are settled by its proportions once fetched.
 */
export function planBrand(group, { source = null, allowCredit = false } = {}) {
  const notes = [];
  const by = (c) => group.members.find((m) => m.collection === c);
  const order = source ? [source, ...COLOUR_ORDER.filter((c) => c !== source)] : COLOUR_ORDER;
  const cands = [];
  for (const c of order) {
    const m = by(c);
    if (!m) continue;
    if (c === 'gilbarbara') {
      const r = gilbarbaraRoles(m.id, m.files);
      for (const f of r.mark) cands.push(pick('mark', c, COLLECTIONS.gilbarbara.file(f), { file: f, licence: 'CC0-1.0' }));
      for (const f of r.markDark) cands.push(pick('markDark', c, COLLECTIONS.gilbarbara.file(f), { file: f, licence: 'CC0-1.0' }));
      for (const f of r.base) cands.push(pick('base', c, COLLECTIONS.gilbarbara.file(f), { file: f, licence: 'CC0-1.0', wordOnly: r.mark.length > 0 }));
      for (const f of r.baseDark) cands.push(pick('baseDark', c, COLLECTIONS.gilbarbara.file(f), { file: f, licence: 'CC0-1.0', wordOnly: r.mark.length > 0 }));
    } else if (c === 'svgl') {
      const L = { licence: 'MIT', guidelines: m.guidelines };
      if (themed(m.route, 'light')) cands.push(pick('base', c, themed(m.route, 'light'), L));
      if (themed(m.route, 'dark')) cands.push(pick('baseDark', c, themed(m.route, 'dark'), L));
      if (themed(m.wordmark, 'light')) cands.push(pick('wordmark', c, themed(m.wordmark, 'light'), L));
      if (themed(m.wordmark, 'dark')) cands.push(pick('wordmarkDark', c, themed(m.wordmark, 'dark'), L));
    } else if (c === 'commons') {
      const ok = licenceOk(m.licence, { allowCredit });
      if (ok.ok) cands.push(pick('base', c, m.url, { licence: m.licence, page: m.page, notes: m.notes }));
      else notes.push(`commons ${m.id}: ${ok.why}`);
    } else if (c === 'simple-icons') {
      const ok = licenceOk(m.licence, { allowCredit });
      if (ok.ok) cands.push(pick('mono', c, COLLECTIONS['simple-icons'].file(m.id), { licence: m.licence, licenceUrl: m.licenceUrl, hex: m.hex, guidelines: m.guidelines, source: m.source }));
      else notes.push(`simple-icons ${m.id}: ${ok.why}`);
    }
  }
  return { cands, notes };
}

// ------------------------------------------------------------------------------------------------ the film's record
export const recordPath = (film) => path.join(film, 'public', 'logos', 'logos.json');
export function readRecord(film) {
  try { const j = JSON.parse(fs.readFileSync(recordPath(film), 'utf8')); if (j && typeof j.logos === 'object') return j; } catch { /* new */ }
  return { about: 'The real marks this film shows: where each file came from, its licence and its trademark owner. A private record for the film and its delivery notes: never shown on screen. Written by scripts/logos.mjs.', logos: {} };
}
const VARIANT_FILES = { mark: '', markDark: '.dark', wordmark: '.wordmark', wordmarkDark: '.wordmark.dark', mono: '.mono', white: '.white', black: '.black' };

/** The kit's index (src/logos.ts): names, files, proportions, tone and tile per mark; no colours, no record. */
export function indexSource(record) {
  const rows = Object.entries(record.logos).sort(([a], [b]) => a.localeCompare(b)).map(([slug, e]) => {
    const files = Object.entries(e.files || {}).filter(([k]) => VARIANT_FILES[k] !== undefined)
      .map(([k, f]) => `${k}: { src: ${JSON.stringify(f.path)}, aspect: ${f.aspect} }`).join(', ');
    return `  ${JSON.stringify(slug)}: { name: ${JSON.stringify(e.name)}, tone: ${JSON.stringify(e.tone || 'colour')}, tile: ${JSON.stringify(e.tile || 'none')}, files: { ${files} } },`;
  });
  return `// The real marks this film shows, for the kit (src/kit/logos.tsx): written by scripts/logos.mjs from
// public/logos/logos.json, which keeps each mark's source, licence and trademark owner. Do not edit by hand:
// node scripts/logos.mjs get <name> adds a mark; node scripts/logos.mjs list --write rewrites this file.
import type { LogoEntry } from './kit/logos';

export const LOGOS: Record<string, LogoEntry> = {
${rows.join('\n')}${rows.length ? '\n' : ''}};
`;
}
function writeRecord(film, record) {
  fs.mkdirSync(path.dirname(recordPath(film)), { recursive: true });
  fs.writeFileSync(recordPath(film), `${JSON.stringify(record, null, 1)}\n`);
  const src = path.join(film, 'src');
  if (fs.existsSync(src)) fs.writeFileSync(path.join(src, 'logos.ts'), indexSource(record));
}

/** Fetch, clean and write one brand's files; returns the record entry. */
export async function getBrand(group, film, o = {}) {
  const variants = new Set(o.variant === 'all' || !o.variant ? ['mark', 'wordmark', 'mono'] : String(o.variant).split(','));
  const { cands, notes } = planBrand(group, o);
  const slug = o.as ? slugOf(o.as) : slugOf(group.name);
  const dir = path.join(film, 'public', 'logos');
  const got = {};
  const load = async (c) => {
    try {
      const raw = await svgAt(c.url, { refresh: o.refresh });
      if (!raw) { notes.push(`${c.collection}: ${c.url} is gone`); return null; }
      return { ...c, ...prepare(raw, { tile: o.tile }) };
    } catch (e) { if (e instanceof Blocked) throw e; notes.push(`${c.collection}: ${c.url}: ${e.message}`); return null; }
  };
  // The full-colour mark (always) and the wordmark (when asked): named roles first, then base files by their
  // proportions (wider than 1.6:1 is a wordmark). A dark version pairs only with a light one of its own collection.
  const wanted = (r) => (r.startsWith('word') ? variants.has('wordmark') : true);
  const open = (r) => wanted(r) && !got[r] && (!r.endsWith('Dark') || got[r.slice(0, -4)]);
  for (const c of cands.filter((x) => x.role !== 'mono')) {
    const roles = c.role === 'base' ? (c.wordOnly ? ['wordmark'] : ['mark', 'wordmark']) : c.role === 'baseDark' ? (c.wordOnly ? ['wordmarkDark'] : ['markDark', 'wordmarkDark']) : [c.role];
    const fits = (r) => open(r) && (!r.endsWith('Dark') || got[r.slice(0, -4)].collection === c.collection);
    if (!roles.some(fits)) continue;
    const p = await load(c);
    if (!p) continue;
    const r = roles.length === 1 ? roles[0] : roles[p.aspect > 1.6 ? 1 : 0];
    if (r.startsWith('word') && p.aspect <= 1.2) continue; // a stacked lockup is neither a mark nor a wordmark
    if (fits(r)) got[r] = p;
  }
  const mono = cands.find((x) => x.role === 'mono');
  let monoFile = null;
  if (mono && (variants.has('mono') || !got.mark)) monoFile = await load(mono);
  if (!got.mark && monoFile) {
    got.mark = { ...monoFile, svg: oneColour(monoFile.svg, monoFile.hex || '#111111'), derived: 'the one-colour mark in the brand\'s official hex (no full-colour file in the open collections)' };
    notes.push('no full-colour mark in the open collections: the mark is the one-colour one in the brand\'s official hex');
  }
  if (!got.mark && !got.wordmark) throw new Error(`no usable file for ${group.name}${notes.length ? `:\n  ${notes.join('\n  ')}` : ''}`);
  // dark-ground versions: the collection's own, else the neutrals reversed
  for (const [light, dark] of [['mark', 'markDark'], ['wordmark', 'wordmarkDark']]) {
    const L = got[light];
    if (!L || got[dark]) continue;
    const tone = toneOf(L.svg);
    if (tone === 'dark') got[dark] = { ...L, svg: reverseNeutrals(L.svg), derived: `${light} with its neutrals reversed for dark grounds` };
    else if (tone === 'light') { got[dark] = L; got[light] = { ...L, svg: reverseNeutrals(L.svg), derived: `${light} with its neutrals reversed for light grounds` }; }
  }
  if (variants.has('mono')) {
    // Simple Icons' file when it draws the same shape as the mark (or the glyph inside the brand's own tile), else
    // a silhouette of the mark (never of a tile: that would be a plain square)
    const same = monoFile && got.mark && (got.mark.tile || Math.abs(Math.log(monoFile.aspect / got.mark.aspect)) < 0.22);
    if (monoFile && got.mark && !same) notes.push(`simple-icons draws a different shape for ${group.name} (${monoFile.aspect}:1 against the mark's ${got.mark.aspect}:1): the one-colour files are the mark's silhouette`);
    const silhouette = got.mark && !got.mark.tile ? { ...got.mark, derived: 'a silhouette of the full-colour mark (no matching one-colour file in the open collections)' } : null;
    const base = same || (monoFile && !got.mark) ? monoFile : silhouette;
    if (!base && got.mark?.tile) notes.push(`${group.name}'s mark is its own tile and no one-colour glyph was found: no one-colour files`);
    if (base) {
      if (monoFile?.hex) got.mono = { ...base, svg: oneColour(base.svg, monoFile.hex) };
      got.white = { ...base, svg: oneColour(base.svg, '#ffffff') };
      got.black = { ...base, svg: oneColour(base.svg, '#111111') };
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const files = {};
  for (const [k, f] of Object.entries(got)) {
    const rel = `logos/${slug}${VARIANT_FILES[k]}.svg`;
    fs.writeFileSync(path.join(film, 'public', rel), `${f.svg}\n`);
    files[k] = { path: rel, aspect: f.aspect, from: f.collection, url: f.url, ...(f.file ? { file: f.file } : {}), ...(f.trimmed ? { trimmed: true } : {}), ...(f.derived ? { derived: f.derived } : {}) };
  }
  const used = [...new Set(Object.values(got).map((f) => f.collection))];
  const site = group.site || '';
  const owner = o.owner || group.owner || ownerOf(site);
  if (!owner) notes.push(`trademark owner unknown: confirm it on the brand's own site and pass --owner "<owner>"`);
  const si = monoFile || by(group, 'simple-icons');
  const entry = {
    name: o.name || group.name, owner: owner || null, site: site || null,
    hex: si?.hex || null,
    guidelines: Object.values(got).map((f) => f.guidelines).find(Boolean) || si?.guidelines || null,
    tone: got.mark ? toneOf(got.mark.svg) : 'colour', tile: got.mark?.tile ? 'own' : 'none',
    files,
    sources: Object.fromEntries(used.map((c) => {
      const f = Object.values(got).find((x) => x.collection === c);
      const C = COLLECTIONS[c];
      return [c, { collection: C.name, page: f.page || C.page, licence: f.licence || C.licence, licenceUrl: f.licenceUrl || C.licenceUrl, ...(C.seen ? { seen: C.seen } : {}), ...(C.terms ? { terms: C.terms } : {}), ...(f.notes?.length ? { notes: f.notes } : {}) }];
    })),
    trademark: `${o.name || group.name} is a trademark of ${owner || 'its owner'}. Shown only for what the product works with, imports from, runs on or names; no endorsement or partnership implied. Colours and proportions as published.`,
    fetched: new Date().toISOString().slice(0, 10),
  };
  return { slug, entry, notes };
}
const by = (group, c) => group.members.find((m) => m.collection === c);

// ------------------------------------------------------------------------------------------------ CLI
export class Usage extends Error {}
export function parseArgs(argv) {
  const VALUED = new Set(['source', 'limit', 'variant', 'film', 'as', 'name', 'owner', 'tile']);
  const FLAGS = new Set(['json', 'help', 'allow-credit', 'refresh', 'write']);
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
      args[k] = v;
    } else if (FLAGS.has(k)) args[k] = true;
    else throw new Usage(`unknown option --${k}`);
  }
  if (args.tile && !['own', 'none'].includes(args.tile)) throw new Usage('--tile is own or none');
  if (args.variant && !String(args.variant).split(',').every((v) => ['all', 'mark', 'wordmark', 'mono'].includes(v))) throw new Usage('--variant is all, mark, wordmark or mono (comma-separated)');
  return args;
}
const sourcesOf = (args) => {
  if (!args.source || args.source === 'all') return args.source === 'all' ? Object.keys(COLLECTIONS) : ['gilbarbara', 'svgl', 'simple-icons'];
  const s = String(args.source).split(',').map((x) => x.trim()).filter(Boolean);
  for (const x of s) if (!COLLECTIONS[x]) throw new Usage(`unknown collection ${x}: ${Object.keys(COLLECTIONS).join(', ')}`);
  return s;
};
const lastSearch = () => path.join(cacheDir(), 'last-search.json');

function describe(g, i) {
  const lines = [`#${i + 1}  ${g.name}${g.owner ? `  (${g.owner})` : ''}${g.site ? `  ${g.site}` : ''}`];
  for (const m of g.members) {
    let what = '';
    if (m.collection === 'gilbarbara') { const r = gilbarbaraRoles(m.id, m.files); what = [r.mark.length && 'mark', r.base.length && 'logo', (r.markDark.length || r.baseDark.length) && 'dark'].filter(Boolean).join(', '); }
    else if (m.collection === 'svgl') what = ['mark', themed(m.route, 'dark') && 'dark', m.wordmark && 'wordmark'].filter(Boolean).join(', ');
    else if (m.collection === 'simple-icons') what = `one colour ${m.hex || ''}${m.licence !== 'CC0-1.0' ? `, ${m.licence}` : ''}`;
    else what = `${m.licence}${m.notes?.length ? `; ${m.notes.join('; ')}` : ''}`;
    lines.push(`     ${`${m.collection}:${m.id}`.padEnd(34)} ${what}`);
  }
  return lines.join('\n');
}

async function cmdSearch(args) {
  const q = args._.join(' ').trim();
  if (!q) throw new Usage('search needs a name');
  const { groups, notes } = await search(q, { sources: sourcesOf(args), refresh: args.refresh });
  const limit = Math.max(1, Math.min(30, Number(args.limit) || 8));
  const top = groups.slice(0, limit);
  writeCache(lastSearch(), JSON.stringify({ q, groups: top }));
  if (args.json) { console.log(JSON.stringify({ q, groups: top, notes }, null, 1)); return top.length ? 0 : 1; }
  if (!top.length) { console.log(`nothing for "${q}" in ${sourcesOf(args).join(', ')}${notes.length ? `\n  ${notes.join('\n  ')}` : ''}\ntry the brand's own name, or --source commons`); return 1; }
  console.log(top.map(describe).join('\n'));
  for (const n of notes) console.log(`note: ${n}`);
  console.log(`\nget one: node scripts/logos.mjs get '#1' (or a name, or collection:id) --film <film>`);
  return 0;
}

async function resolveGroup(ref, args) {
  if (/^#\d+$/.test(ref)) {
    let j = null;
    try { j = JSON.parse(fs.readFileSync(lastSearch(), 'utf8')); } catch { /* none */ }
    const g = j?.groups?.[Number(ref.slice(1)) - 1];
    if (!g) throw new Usage(`${ref}: no such result in the last search (run search first)`);
    return g;
  }
  const m = ref.match(/^(gilbarbara|svgl|simple-icons|commons):(.+)$/);
  if (m) {
    // the member's own name finds its brand in the other collections; its collection gives the colour files
    const [, col, id] = m;
    let name = id.replace(/^File:/, '').replace(/\.svg$/i, '');
    if (col !== 'commons') {
      const list = await index(col, { refresh: args.refresh });
      const arr = Array.isArray(list) ? list : list?.icons || [];
      const hit = arr.find((x) => String(col === 'gilbarbara' ? x.shortname : col === 'svgl' ? x.id : x.slug) === id);
      if (!hit) throw new Error(`${ref}: not found in ${col}`);
      name = hit.name || hit.title;
    }
    const sources = col === 'commons' ? ['commons'] : [...new Set([col, ...sourcesOf({})])];
    const { groups } = await search(name, { sources, refresh: args.refresh });
    const g = groups.find((x) => x.members.some((y) => y.collection === col && (y.id === id || (col === 'commons' && norm(y.id) === norm(id)))));
    if (!g) throw new Error(`${ref}: not found in ${col}`);
    args.source = col;
    return g;
  }
  const { groups } = await search(ref, { sources: sourcesOf(args), refresh: args.refresh });
  const g = groups[0];
  if (!g || g.score < 95) {
    const list = groups.slice(0, 5).map((x, i) => `  #${i + 1} ${x.name}`).join('\n');
    throw new Error(`no brand named exactly "${ref}"${list ? `; the nearest:\n${list}\nname one of them, or run search and get '#n'` : ''}`);
  }
  return g;
}

async function cmdGet(args) {
  const ref = args._.join(' ').trim();
  if (!ref) throw new Usage('get needs a name, #n or collection:id');
  const film = path.resolve(args.film || '.');
  if (!fs.existsSync(path.join(film, 'public'))) throw new Usage(`${film} has no public/ folder: run inside a film project or pass --film <film>`);
  const group = await resolveGroup(ref, args);
  const src = args.source && args.source !== 'all' ? args.source : null;
  const { slug, entry, notes } = await getBrand(group, film, { variant: args.variant, source: src, as: args.as, name: args.name, owner: args.owner, tile: args.tile, allowCredit: args['allow-credit'], refresh: args.refresh });
  const record = readRecord(film);
  record.logos[slug] = entry;
  writeRecord(film, record);
  console.log(`${entry.name} -> public/logos/ (${Object.keys(entry.files).join(', ')}); ${entry.owner ? `owner ${entry.owner}` : 'owner unknown'}; ${Object.entries(entry.sources).map(([k, s]) => `${k} ${s.licence}`).join(', ')}`);
  for (const n of notes) console.log(`note: ${n}`);
  console.log(`use it: <AppIcon logo="${slug}" />, <LogoChip logo="${slug}" />, <InlineLogo logos={['${slug}', ...]} /> (src/kit/logos.tsx); the record: public/logos/logos.json`);
  return 0;
}

/** Problems with a film's record: files missing, no licence, no owner. */
export function checkRecord(film) {
  const rec = readRecord(film);
  const problems = [];
  for (const [slug, e] of Object.entries(rec.logos)) {
    for (const [k, f] of Object.entries(e.files || {})) if (!fs.existsSync(path.join(film, 'public', f.path))) problems.push(`${slug}: ${k} file ${f.path} is missing`);
    if (!e.sources || !Object.values(e.sources).every((s) => s.licence)) problems.push(`${slug}: a source without its licence`);
    if (!e.owner) problems.push(`${slug}: no trademark owner (logos.mjs get ${slug} --owner "<owner>")`);
  }
  return { record: rec, problems };
}

function cmdList(args) {
  const film = path.resolve(args.film || '.');
  const { record, problems } = checkRecord(film);
  if (args.write) { writeRecord(film, record); console.log(`rewrote ${path.join('src', 'logos.ts')} from public/logos/logos.json`); }
  if (args.json) { console.log(JSON.stringify(record, null, 1)); return 0; }
  const rows = Object.entries(record.logos);
  if (!rows.length) { console.log('no marks yet: node scripts/logos.mjs get <name>'); return 0; }
  for (const [slug, e] of rows) console.log(`${slug.padEnd(20)} ${e.name.padEnd(22)} ${(e.owner || 'owner unknown').padEnd(26)} ${Object.keys(e.files).join(',')}  ${Object.entries(e.sources).map(([k, s]) => `${k}:${s.licence}`).join(' ')}`);
  for (const p of problems) console.log(`note: ${p}`);
  return 0;
}
function cmdCheck(args) {
  const { record, problems } = checkRecord(path.resolve(args.film || '.'));
  for (const p of problems) console.log(`FAIL  ${p}`);
  console.log(`${Object.keys(record.logos).length} marks, ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  return problems.length ? 1 : 0;
}

export const USAGE = `logos.mjs: real company and product marks in their official colours, from open collections.

  search <name> [--source all|gilbarbara,svgl,simple-icons,commons] [--limit 8] [--json] [--refresh]
  get    <name|#n|collection:id> [--variant all|mark|wordmark|mono] [--film .] [--source <collection>]
         [--as <slug>] [--name "Shown name"] [--owner "Trademark owner"] [--tile own|none] [--allow-credit] [--refresh]
         writes <film>/public/logos/<slug>[.dark|.wordmark|.wordmark.dark|.mono|.white|.black].svg, the record
         <film>/public/logos/logos.json (source, licence, owner) and the kit's index <film>/src/logos.ts
  list   [--film .] [--json] [--write]      the film's marks (--write rewrites src/logos.ts from the record)
  check  [--film .]                         every file present, every source with its licence, every owner named

Collections: gilbarbara (SVG Logos, CC0), svgl (MIT; light, dark and wordmark files), simple-icons (CC0 unless an
icon names its own licence; one colour plus the brand's hex), commons (public domain and CC0 only; the fallback).
A mark is shown only for what the product works with, imports from, runs on or names: never an endorsement or a
partnership; colours and proportions as published; nothing is credited on screen. Never works around a bot check,
a login or a rate limit. Cache: $CINETIC_HOME/logos (~/.cinetic/logos).

  --help, -h   print this help`;

export async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(`${e.message}\n\n${USAGE}`); return 2; }
  const cmd = args._.shift();
  if (args.help || !cmd || cmd === 'help') { console.log(USAGE); return cmd || args.help ? 0 : 2; }
  try {
    switch (cmd) {
      case 'search': return await cmdSearch(args);
      case 'get': return await cmdGet(args);
      case 'list': return cmdList(args);
      case 'check': return cmdCheck(args);
      default: throw new Usage(`unknown command ${cmd}: search, get, list, check`);
    }
  } catch (e) {
    if (e instanceof Usage) { console.error(`${e.message}\n\n${USAGE}`); return 2; }
    console.error(`logos.mjs: ${e.message}`); return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
