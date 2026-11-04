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
 *        [--tile own|none] [--allow-credit] [--refresh] [--file <brand's own svg>] [--allow-outdated]
 *   node scripts/logos.mjs list [--film .] [--json] [--write]
 *   node scripts/logos.mjs check [<film>] [--json]
 *
 * The newest mark, never a retired one: brands redraw their marks (the 2026 Workspace icons, the 2025 Microsoft 365
 * icons, the gradient G, the X for the bird) and the collections lag or keep the old file under the brand's name.
 * The brand table (logo-brands.json, beside this script) holds, for the 100 or so brands a launch film shows most,
 * the current mark (the month it changed, what it looks like, the brand page it was checked against) with its
 * fingerprint, the collections that carry it in the order to take it from, and the marks and colours the brand
 * retired. get takes the current file first, never takes a retired one (said in a note), prints the mark's version
 * and records it; when no open collection draws the current mark it stops and names the brand page: pass the file
 * downloaded there with --file (the brand's own file, used nominatively like every mark) or keep the old one
 * knowingly with --allow-outdated. check flags every retired mark in a film: the files of its record and any other
 * .svg under public/; and it fails a brand whose row has no brand page, was never verified on it ("verified": null)
 * or was verified over 12 months ago (the row's "verified", else the table's "checked"). A brand the table does not
 * list is taken as before, unchecked.
 *
 * Never a drawn stand-in: check also fails a look-alike of a listed brand's mark drawn in the film's code (a component
 * named for the brand's logo that draws SVG inline, a map key named for it holding path data, an inline <svg> labelled
 * with it) and an image named for the brand that the record does not list. The official file comes through get (an
 * open collection, or the brand's own press-kit file with --file); the film's own mark in src/brand/ is its own.
 *
 * Collections (each checked on its own page, 2026-10-27):
 *   gilbarbara  gilbarbara/logos, the SVG Logos set: full-colour marks and wordmarks, CC0 1.0 (LICENSE.txt).
 *   svgl        svgl.app: marks, light and dark variants and wordmarks; the repository is MIT; its API asks
 *               for cached responses and for no copy of svgl built from it (the full list is cached a week).
 *               An svgl entry is named by its file (svgl:messenger), never by its number: svgl numbers its
 *               list by position, so every logo added moves the numbers after it.
 *   simple-icons  Simple Icons: one-colour marks with the brand's official hex; CC0 1.0 for the project, and
 *               an icon under another licence names it (that licence is read and gated per icon).
 *   commons     Wikimedia Commons, the fallback for marks it hosts: public domain (simple text and shape
 *               logos) and CC0 only, read from the file's own page.
 * The licence of the collection is not a trademark licence: every mark stays its owner's trademark. A film
 * shows a mark only for what the product really works with, imports from, runs on or names, never as an
 * endorsement or partnership; the record names the owner; nothing is credited on screen.
 *
 * Variants (files in <film>/public/logos/, the brand's colours unaltered):
 *   <slug>.svg                 the full-colour mark (for light grounds): the brand's official mark or app tile in
 *                              colour wins over a one-colour glyph or an older drawing in another collection, unless
 *                              the brand's own colour is black or white; --source forces one collection's file
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
import { fileURLToPath, pathToFileURL } from 'node:url';
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
/** A mark passed with --file: the brand's own file from its brand or press page, used nominatively like every mark. */
export const OWN_FILE = { name: "the brand's own file (from its brand or press page)", page: null, licence: 'owner-supplied', licenceUrl: null };
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
  'threads.net': 'Meta Platforms, Inc.', 'threads.com': 'Meta Platforms, Inc.', 'messenger.com': 'Meta Platforms, Inc.', 'oculus.com': 'Meta Platforms, Inc.',
  'icloud.com': 'Apple Inc.', 'outlook.com': 'Microsoft Corporation', 'live.com': 'Microsoft Corporation', 'skype.com': 'Microsoft Corporation',
  'xbox.com': 'Microsoft Corporation', 'visualstudio.com': 'Microsoft Corporation', 'microsoft365.com': 'Microsoft Corporation',
  'tiktok.com': 'ByteDance Ltd.', 'snapchat.com': 'Snap Inc.', 'snap.com': 'Snap Inc.', 'twitch.tv': 'Twitch Interactive, Inc.',
  'netflix.com': 'Netflix, Inc.', 'uber.com': 'Uber Technologies, Inc.', 'airbnb.com': 'Airbnb, Inc.', 'ebay.com': 'eBay Inc.', 'etsy.com': 'Etsy, Inc.',
  'booking.com': 'Booking.com B.V.', 'duolingo.com': 'Duolingo, Inc.', 'medium.com': 'A Medium Corporation', 'substack.com': 'Substack Inc.',
  'gitlab.com': 'GitLab Inc.', 'atlassian.net': 'Atlassian', 'trello.com': 'Atlassian', 'bitbucket.org': 'Atlassian', 'asana.com': 'Asana, Inc.',
  'monday.com': 'monday.com Ltd.', 'canva.com': 'Canva Pty Ltd', 'zapier.com': 'Zapier, Inc.', 'webflow.com': 'Webflow, Inc.', 'framer.com': 'Framer B.V.',
  'sketch.com': 'Sketch B.V.', 'evernote.com': 'Evernote Corporation', 'box.com': 'Box, Inc.', 'grammarly.com': 'Grammarly, Inc.',
  'zendesk.com': 'Zendesk, Inc.', 'twilio.com': 'Twilio Inc.', 'okta.com': 'Okta, Inc.', 'datadoghq.com': 'Datadog, Inc.', 'cloudflare.com': 'Cloudflare, Inc.',
  'netlify.com': 'Netlify, Inc.', 'heroku.com': 'Salesforce, Inc.', 'docker.com': 'Docker, Inc.', 'mongodb.com': 'MongoDB, Inc.', 'supabase.com': 'Supabase, Inc.',
  'elastic.co': 'Elasticsearch B.V.', 'redis.io': 'Redis Ltd.', 'jetbrains.com': 'JetBrains s.r.o.', 'mozilla.org': 'Mozilla Foundation', 'firefox.com': 'Mozilla Foundation',
  'brave.com': 'Brave Software, Inc.', 'intuit.com': 'Intuit Inc.', 'squareup.com': 'Block, Inc.', 'cash.app': 'Block, Inc.', 'mastercard.com': 'Mastercard International Incorporated',
  'huggingface.co': 'Hugging Face, Inc.', 'perplexity.ai': 'Perplexity AI, Inc.', 'cursor.com': 'Anysphere, Inc.', 'ibm.com': 'International Business Machines Corporation',
  'intel.com': 'Intel Corporation', 'amd.com': 'Advanced Micro Devices, Inc.', 'samsung.com': 'Samsung Electronics Co., Ltd.', 'sony.com': 'Sony Group Corporation',
  'tesla.com': 'Tesla, Inc.',
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
/**
 * An svgl entry's name: its file's name (svgl.app/library/<name>.svg). svgl numbers its list by position, so an
 * entry's number moves whenever a logo is added before it: the brand table, a search result and get name an entry
 * by its file, never by its number (a number is still read, against the index of the day, for an old command).
 */
export const svglKey = (x) => {
  const r = x && (typeof x.route === 'object' && x.route ? x.route.light || x.route.dark : x.route);
  return r ? decodeURIComponent(String(r).split('?')[0].split('/').pop()).replace(/\.svg$/i, '') : String(x?.id ?? '');
};
/** The svgl entry a reference names: its file's name first, else (all digits) its number in this index. */
export const svglFind = (list, ref) => {
  const arr = Array.isArray(list) ? list : [];
  const id = String(ref);
  return arr.find((x) => svglKey(x) === id) || (/^\d+$/.test(id) ? arr.find((x) => String(x.id) === id) : undefined);
};
/** Whether a member (or a row's reference) is the same svgl entry: by file name, or by the number it was found under. */
const sameMember = (m, ref) => String(m.id) === String(ref) || (m.num !== undefined && String(m.num) === String(ref));
/** svgl entries ({id, title, route, wordmark, url, brandUrl}). */
export function searchSvgl(list, q) {
  return (Array.isArray(list) ? list : []).map((x) => ({ x, s: nameScore(q, x.title) })).filter((r) => r.s >= 30)
    .map(({ x, s }) => ({ collection: 'svgl', id: svglKey(x), num: String(x.id), name: x.title, site: x.url || '', score: s, route: x.route, wordmark: x.wordmark || null, guidelines: x.brandUrl || null }));
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
    case 'rect': {
      const x = f('x'), y = f('y'), w = f('width'), h = f('height');
      if (!(w > 0 && h > 0)) return [];
      let rx = parseFloat(attr(tag, 'rx')), ry = parseFloat(attr(tag, 'ry'));
      if (!(rx > 0)) rx = ry > 0 ? ry : 0;
      if (!(ry > 0)) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx) return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
      const pts = [];
      for (const [cx, cy, a0] of [[x + w - rx, y + ry, -0.5], [x + w - rx, y + h - ry, 0], [x + rx, y + h - ry, 0.5], [x + rx, y + ry, 1]]) {
        for (let k = 0; k <= 6; k++) { const a = (a0 + k / 12) * Math.PI; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
      }
      return [pts];
    }
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

// ------------------------------------------------------------------------------------------------ fingerprints
// A mark's fingerprint is what it looks like at a glance: the SVG drawn at 128 px (paths, shapes, strokes, groups,
// transforms, <use>, clip paths, masks, CSS classes; a gradient paints the mean of its stops), cropped to the art and
// read as an 8 x 8 grid of coverage and colour class, with its proportions, its palette and how much of it is painted
// in multi-hue gradients. Two files of one drawing in different collections score 0.75-1; a redrawn mark (the flat G
// and the gradient G, the envelope and the M) scores under 0.7. The brand table (logo-brands.json) keeps the
// fingerprint of each brand's current mark and of the marks it retired.
//   fp1 a<aspect> p<class><share>.… g<0-9> c<64 coverage digits 0-f> h<64 colour classes> [f<flags>]
// Colour classes: k g w (dark, mid, light neutrals), A-L (OKLCH hue in 30 degree steps from 0), . (empty cell).

/** An SVG as a tree of elements ({ name, tag, kids, parent, text }); text is kept only inside <style>. */
export function svgTree(svg) {
  const root = { name: '#root', tag: '', kids: [], parent: null };
  let cur = root, last = 0, m;
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  while ((m = re.exec(svg))) {
    const [whole, close, rawName, , self] = m;
    const name = rawName.toLowerCase();
    if (cur.name === 'style' && !close) continue;
    if (close) {
      if (cur.name === 'style') cur.text = (cur.text || '') + svg.slice(last, m.index);
      let n = cur;
      while (n && n.name !== name && n.parent) n = n.parent;
      if (n && n.parent) cur = n.parent;
    } else {
      const el = { name, tag: whole, kids: [], parent: cur };
      cur.kids.push(el);
      if (!self) cur = el;
    }
    last = re.lastIndex;
  }
  return root;
}
const walkTree = (n, fn) => { fn(n); for (const k of n.kids) walkTree(k, fn); };
/** The simple CSS rules of an SVG's <style> blocks (tag, .class, #id and their compounds), lowest specificity first. */
function cssRules(root) {
  const rules = [];
  walkTree(root, (n) => {
    if (n.name !== 'style' || !n.text) return;
    const t = n.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!\[CDATA\[|\]\]>/g, '');
    for (const [, sels, body] of t.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const decl = {};
      for (const d of body.split(';')) { const i = d.indexOf(':'); if (i > 0) decl[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).replace(/!important/i, '').trim(); }
      for (const s of sels.split(',')) {
        const sel = s.trim();
        if (!sel || !/^[a-zA-Z]*(?:[.#][\w-]+)*$/.test(sel)) continue;
        rules.push({ sel, spec: (sel.match(/#/g) || []).length * 100 + (sel.match(/\./g) || []).length * 10 + (/^[a-zA-Z]/.test(sel) ? 1 : 0), decl });
      }
    }
  });
  return rules.sort((a, b) => a.spec - b.spec);
}
const selMatch = (sel, n) => {
  const tag = (sel.match(/^[a-zA-Z]+/) || [''])[0];
  if (tag && tag.toLowerCase() !== n.name) return false;
  const cls = ` ${(attr(n.tag, 'class') || '').trim().split(/\s+/).join(' ')} `;
  for (const [, k, v] of sel.matchAll(/([.#])([\w-]+)/g)) if (k === '.' ? !cls.includes(` ${v} `) : attr(n.tag, 'id') !== v) return false;
  return true;
};
const PAINT_PROPS = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'display', 'visibility', 'clip-path', 'mask', 'stop-color', 'stop-opacity', 'color'];
const INHERITED = ['fill', 'stroke', 'stroke-width', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'visibility', 'color'];
/** An element's own paint properties: attributes, then CSS rules, then its style attribute. */
function ownStyle(n, rules) {
  if (n.style) return n.style;
  const s = {};
  for (const p of PAINT_PROPS) { const v = attr(n.tag, p); if (v != null) s[p] = v.trim(); }
  for (const r of rules) if (selMatch(r.sel, n)) for (const p of PAINT_PROPS) if (r.decl[p] != null) s[p] = r.decl[p];
  for (const d of String(attr(n.tag, 'style') || '').split(';')) { const i = d.indexOf(':'); const k = d.slice(0, i).trim().toLowerCase(); if (i > 0 && PAINT_PROPS.includes(k)) s[k] = d.slice(i + 1).trim(); }
  n.style = s;
  return s;
}
/** Polygons filled at pixel centres (nonzero or even-odd): a W x H coverage of 0 and 1. */
function fillPolys(polys, W, H, evenodd = false) {
  const rows = Array.from({ length: H }, () => []);
  for (const P of polys) {
    for (let i = 0; i < P.length && P.length > 1; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
      if (y0 === y1) continue;
      const r0 = Math.max(0, Math.ceil(Math.min(y0, y1) - 0.5)), r1 = Math.min(H - 1, Math.ceil(Math.max(y0, y1) - 0.5) - 1);
      for (let r = r0; r <= r1; r++) rows[r].push([x0 + ((r + 0.5 - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
    }
  }
  const cov = new Float32Array(W * H);
  for (let r = 0; r < H; r++) {
    const xs = rows[r].sort((a, b) => a[0] - b[0]);
    let wind = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      wind += xs[i][1];
      if (evenodd ? i % 2 === 1 : wind === 0) continue;
      for (let c = Math.max(0, Math.ceil(xs[i][0] - 0.5)); c <= Math.min(W - 1, Math.ceil(xs[i + 1][0] - 0.5) - 1); c++) cov[r * W + c] = 1;
    }
  }
  return cov;
}
/** Polylines stroked `hw` either side (square ends): a W x H coverage. */
function strokePolys(polys, hw, W, H) {
  const cov = new Float32Array(W * H);
  for (const P of polys) for (let i = 0; i + 1 < P.length; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0) || 1e-9, nx = (-(y1 - y0) / L) * hw, ny = ((x1 - x0) / L) * hw, ex = ((x1 - x0) / L) * hw * 0.5, ey = ((y1 - y0) / L) * hw * 0.5;
    const q = [[x0 + nx - ex, y0 + ny - ey], [x1 + nx + ex, y1 + ny + ey], [x1 - nx + ex, y1 - ny + ey], [x0 - nx - ex, y0 - ny - ey]];
    const c = fillPolys([q], W, H);
    const yLo = Math.max(0, Math.floor(Math.min(...q.map((p) => p[1])))), yHi = Math.min(H - 1, Math.ceil(Math.max(...q.map((p) => p[1]))));
    for (let k = yLo * W; k < (yHi + 1) * W; k++) if (c[k]) cov[k] = 1;
  }
  return cov;
}
/** The colour class of an [r, g, b]: k g w neutrals, A-L the OKLCH hue in 30 degree steps. */
export function colourClass(rgb) {
  const { L, C } = lc(rgb);
  if (C < 0.045) return L < 0.4 ? 'k' : L < 0.8 ? 'g' : 'w';
  const [R, G, B] = rgb.map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const h = ((Math.atan2(0.0259040371 * l + 0.7827717662 * m - 0.808688894 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * 180) / Math.PI + 360) % 360;
  return 'ABCDEFGHIJKL'[Math.floor(h / 30) % 12];
}

/** An SVG drawn into W x H premultiplied RGBA buffers over its viewBox (`size` px on the long side); null when it has no size. */
export function rasterize(svg, size = 128) {
  const root = svgTree(svg);
  const top = root.kids.find((k) => k.name === 'svg');
  if (!top) return null;
  let vb = nums(attr(top.tag, 'viewBox'));
  if (!(vb.length === 4 && vb[2] > 0 && vb[3] > 0)) { const w = parseFloat(attr(top.tag, 'width')), h = parseFloat(attr(top.tag, 'height')); if (!(w > 0 && h > 0)) return null; vb = [0, 0, w, h]; }
  const k = size / Math.max(vb[2], vb[3]);
  const W = Math.max(1, Math.round(vb[2] * k)), H = Math.max(1, Math.round(vb[3] * k));
  const ids = new Map();
  walkTree(root, (n) => { const id = attr(n.tag, 'id'); if (id && !ids.has(id)) ids.set(id, n); });
  const rules = cssRules(root), flags = new Set();
  const buffer = (q) => ({ r: new Float32Array(W * H), g: new Float32Array(W * H), b: new Float32Array(W * H), a: new Float32Array(W * H), ...(q ? { q: new Float32Array(W * H) } : {}) });
  const NONRENDER = new Set(['defs', 'clippath', 'mask', 'symbol', 'lineargradient', 'radialgradient', 'pattern', 'marker', 'filter', 'style', 'title', 'desc', 'metadata']);
  const stopsOf = (id, depth = 0) => {
    const g = ids.get(id);
    if (!g || depth > 4) return [];
    const own = g.kids.filter((x) => x.name === 'stop').map((x) => { const st = ownStyle(x, rules); const op = parseFloat(st['stop-opacity'] ?? '1'); return { rgb: rgbOf(st['stop-color'] ?? 'black') || [0, 0, 0], a: Number.isFinite(op) ? op : 1 }; });
    const href = (attr(g.tag, 'xlink:href') || attr(g.tag, 'href') || '').replace(/^#/, '');
    return own.length || !href ? own : stopsOf(href, depth + 1);
  };
  const paint = (v, colour) => {
    const s = String(v ?? '').trim();
    if (!s || s === 'none' || s === 'transparent') return null;
    if (/^currentcolor$/i.test(s)) return paint(colour || 'black');
    const u = s.match(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/i);
    if (u) {
      const stops = stopsOf(u[1]);
      if (!stops.length) { const fb = s.replace(/url\([^)]*\)/i, '').trim(); return fb ? paint(fb) : { rgb: [128, 128, 128], a: 1 }; }
      const w = stops.reduce((t, x) => t + x.a, 0);
      if (!(w > 0)) return null;
      const rgb = [0, 1, 2].map((i) => stops.reduce((t, x) => t + x.rgb[i] * x.a, 0) / w);
      return { rgb, a: w / stops.length, grad: new Set(stops.filter((x) => x.a > 0.2).map((x) => colourClass(x.rgb))).size > 1 };
    }
    const rgb = rgbOf(s);
    if (!rgb) return null;
    const am = s.match(/^rgba\([^)]*,\s*([\d.]+)\s*\)$/i), h8 = s.match(/^#([0-9a-f]{8})$/i);
    return { rgb, a: am ? Number(am[1]) : h8 ? parseInt(h8[1].slice(6), 16) / 255 : 1 };
  };
  const comp = (dst, cov, p, alpha, clip) => {
    const a0 = p.a * alpha;
    if (!(a0 > 0)) return;
    for (let i = 0; i < cov.length; i++) {
      if (!cov[i]) continue;
      const a = a0 * cov[i] * (clip ? clip[i] : 1);
      if (a <= 0) continue;
      if (dst.q) dst.q[i] = (p.grad ? a : 0) + dst.q[i] * (1 - a);
      dst.r[i] = p.rgb[0] * a + dst.r[i] * (1 - a); dst.g[i] = p.rgb[1] * a + dst.g[i] * (1 - a); dst.b[i] = p.rgb[2] * a + dst.b[i] * (1 - a); dst.a[i] = a + dst.a[i] * (1 - a);
    }
  };
  const maskOf = (ref, m, depth) => {
    const node = ids.get((String(ref).match(/url\(\s*['"]?#([^'")\s]+)/i) || [])[1]);
    if (!node || (node.name !== 'mask' && node.name !== 'clippath')) return null;
    const tmp = buffer(false), clipMode = node.name === 'clippath';
    const inh = {};
    if (!clipMode) { const ms = ownStyle(node, rules); for (const p of INHERITED) if (ms[p] != null) inh[p] = ms[p]; }
    const mt = mul(m, parseTransform(attr(node.tag, 'transform')));
    for (const kid of node.kids) draw(kid, mt, inh, tmp, null, depth + 1, clipMode);
    const out = new Float32Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = clipMode ? tmp.a[i] : (0.2126 * tmp.r[i] + 0.7152 * tmp.g[i] + 0.0722 * tmp.b[i]) / 255;
    return out;
  };
  const draw = (n, m, inh, dst, clip, depth, clipMode = false) => {
    if (depth > 24 || NONRENDER.has(n.name)) return;
    const own = ownStyle(n, rules);
    if (own.display === 'none') return;
    const st = {};
    for (const p of INHERITED) if (inh[p] != null) st[p] = inh[p];
    Object.assign(st, own);
    const op = parseFloat(own.opacity ?? '1');
    const alpha = (inh.alpha ?? 1) * (Number.isFinite(op) ? op : 1);
    st.alpha = alpha;
    let mt = mul(m, parseTransform(attr(n.tag, 'transform')));
    let cl = clip;
    for (const key of ['clip-path', 'mask']) {
      if (!own[key] || own[key] === 'none') continue;
      const c = maskOf(own[key], mt, depth);
      if (c) cl = cl ? cl.map((v, i) => v * c[i]) : c;
    }
    const kids = (mm) => { for (const kid of n.kids) draw(kid, mm, st, dst, cl, depth + 1, clipMode); };
    if (n.name === 'g' || n.name === 'a' || n.name === 'switch') return kids(mt);
    if (n.name === 'svg') {
      const x = parseFloat(attr(n.tag, 'x')) || 0, y = parseFloat(attr(n.tag, 'y')) || 0, v = nums(attr(n.tag, 'viewBox')), w = parseFloat(attr(n.tag, 'width')), h = parseFloat(attr(n.tag, 'height'));
      if (v.length === 4 && w > 0 && h > 0) { const s = Math.min(w / v[2], h / v[3]); return kids(mul(mt, [s, 0, 0, s, x - v[0] * s + (w - v[2] * s) / 2, y - v[1] * s + (h - v[3] * s) / 2])); }
      return kids(mul(mt, [1, 0, 0, 1, x, y]));
    }
    if (n.name === 'use') {
      const ref = ids.get((attr(n.tag, 'xlink:href') || attr(n.tag, 'href') || '').replace(/^#/, ''));
      if (!ref || ref === n) return;
      const um = mul(mt, [1, 0, 0, 1, parseFloat(attr(n.tag, 'x')) || 0, parseFloat(attr(n.tag, 'y')) || 0]);
      if (ref.name === 'symbol') for (const kid of ref.kids) draw(kid, um, st, dst, cl, depth + 1, clipMode);
      else draw(ref, um, st, dst, cl, depth + 1, clipMode);
      return;
    }
    if (n.name === 'text') { flags.add('text'); return; }
    let subs = null;
    try { subs = shapePoints(n.name, n.tag); } catch { flags.add('unread'); return; }
    if (!subs) return;
    if (n.name === 'image') flags.add('raster');
    const polys = subs.map((sp) => sp.map(([px, py]) => apply(mt, px, py)));
    const fill = clipMode ? { rgb: [0, 0, 0], a: 1 } : n.name === 'image' ? { rgb: [128, 128, 128], a: 1 } : paint(st.fill ?? 'black', st.color);
    if (fill && n.name !== 'line') {
      const fo = clipMode ? 1 : parseFloat(st['fill-opacity'] ?? '1');
      comp(dst, fillPolys(polys, W, H, String(st['fill-rule'] || attr(n.tag, 'clip-rule') || '').trim() === 'evenodd'), fill, alpha * (Number.isFinite(fo) ? fo : 1), cl);
    }
    const stroke = clipMode || n.name === 'image' ? null : paint(st.stroke, st.color);
    if (stroke) {
      const sw = parseFloat(st['stroke-width'] ?? '1'), so = parseFloat(st['stroke-opacity'] ?? '1');
      const hw = ((Number.isFinite(sw) ? sw : 1) * Math.sqrt(Math.abs(mt[0] * mt[3] - mt[1] * mt[2]))) / 2;
      const closed = n.name !== 'line' && n.name !== 'polyline';
      if (hw > 0.05) comp(dst, strokePolys(polys.map((P) => (closed && P.length > 2 ? [...P, P[0]] : P)), Math.max(hw, 0.5), W, H), stroke, alpha * (Number.isFinite(so) ? so : 1), cl);
    }
  };
  const buf = buffer(true);
  const rs = ownStyle(top, rules), rootInh = {};
  for (const p of INHERITED) if (rs[p] != null) rootInh[p] = rs[p];
  for (const kid of top.kids) draw(kid, [k, 0, 0, k, -vb[0] * k, -vb[1] * k], rootInh, buf, null, 0);
  return { W, H, buf, flags: [...flags], viewBox: vb };
}

/** A mark's fingerprint (see above); null when nothing is drawn. */
export function fingerprint(svg) {
  const R = rasterize(svg, 128);
  if (!R) return null;
  const { W, H, buf } = R, G = 8;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf.a[y * W + x] > 0.25) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return null;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cov = [], cls = [], hist = {};
  let total = 0, qa = 0, qs = 0;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    let a = 0, r = 0, g = 0, b = 0, n = 0;
    const ya = Math.floor(y0 + (j * bh) / G), yb = Math.max(ya + 1, Math.ceil(y0 + ((j + 1) * bh) / G)), xa = Math.floor(x0 + (i * bw) / G), xb = Math.max(xa + 1, Math.ceil(x0 + ((i + 1) * bw) / G));
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { const p = Math.min(H - 1, y) * W + Math.min(W - 1, x); a += buf.a[p]; r += buf.r[p]; g += buf.g[p]; b += buf.b[p]; n++; }
    const ca = a / n;
    cov.push(Math.round(Math.min(1, ca) * 15).toString(16));
    if (ca < 0.12) { cls.push('.'); continue; }
    const c = colourClass([r / a, g / a, b / a]);
    cls.push(c);
    hist[c] = (hist[c] || 0) + ca; total += ca;
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { qa += buf.a[y * W + x]; qs += buf.q[y * W + x]; }
  const pal = Object.entries(hist).sort((p, q) => q[1] - p[1]).filter(([, v]) => v / total >= 0.04).slice(0, 4).map(([c, v]) => `${c}${Math.round((v / total) * 100)}`);
  return `fp1 a${Math.round((bw / bh) * 100) / 100} p${pal.join('.')} g${qa > 0 ? Math.min(9, Math.round((qs / qa) * 10)) : 0} c${cov.join('')} h${cls.join('')}${R.flags.length ? ` f${R.flags.join('.')}` : ''}`;
}
/** A fingerprint string read back: { aspect, pal: [[class, share]], grad, cov: [0..1 x 64], cls: [64] }; null when it is not one. */
export function parseFp(s) {
  const m = String(s ?? '').match(/^fp1 a([\d.]+) p(\S*) g(\d) c([0-9a-f]{64}) h(\S{64})/);
  if (!m) return null;
  return { aspect: Number(m[1]), pal: m[2] ? m[2].split('.').map((x) => [x[0], Number(x.slice(1))]) : [], grad: Number(m[3]) / 10, cov: [...m[4]].map((x) => parseInt(x, 16) / 15), cls: [...m[5]] };
}
const HUE_CLASSES = 'ABCDEFGHIJKL';
const classNear = (a, b) => {
  if (a === b) return 1;
  const i = HUE_CLASSES.indexOf(a), j = HUE_CLASSES.indexOf(b);
  if (i >= 0 && j >= 0) return Math.min((i - j + 12) % 12, (j - i + 12) % 12) === 1 ? 0.7 : 0;
  return i < 0 && j < 0 ? 0.5 : 0;
};
/** Is a fingerprint one colour (a glyph in one hex, white or black)? */
export const monoFp = (f) => !!f && f.grad < 0.2 && (f.pal.length <= 1 || f.pal[0][1] >= 90);
/**
 * How alike two marks look, 0..1: their proportions (a wordmark is never a mark), the drawn area cell by cell and,
 * when both are in colour, each cell's colour class, less when one is flat and the other a multi-hue gradient. A one-colour
 * file is compared by its shape alone.
 */
export function similarity(fa, fb) {
  const a = typeof fa === 'string' ? parseFp(fa) : fa, b = typeof fb === 'string' ? parseFp(fb) : fb;
  if (!a || !b) return 0;
  const ar = Math.abs(Math.log(a.aspect / b.aspect));
  if (ar > 0.4) return 0;
  let mn = 0, mx = 0;
  for (let i = 0; i < 64; i++) { mn += Math.min(a.cov[i], b.cov[i]); mx += Math.max(a.cov[i], b.cov[i]); }
  const shape = mx > 0 ? mn / mx : 0;
  let sim = shape;
  if (!monoFp(a) && !monoFp(b)) {
    let s = 0, n = 0;
    for (let i = 0; i < 64; i++) if (a.cls[i] !== '.' && b.cls[i] !== '.') { s += classNear(a.cls[i], b.cls[i]); n++; }
    sim = (0.5 * shape + 0.5 * (n ? s / n : 0)) * (1 - (0.4 * Math.max(0, Math.abs(a.grad - b.grad) - 0.2)) / 0.8);
  }
  return Math.round(sim * Math.exp(-ar * 1.2) * 1000) / 1000;
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

// ------------------------------------------------------------------------------------------------ the brand table
/**
 * logo-brands.json (beside this script): for the brands a film shows most, the brand's current mark (the month it
 * changed, what it looks like, its fingerprint, the brand page it was checked against), the collections that carry
 * it in the order to take it from, the marks it retired (dates and fingerprints) and retired colours. A file that
 * draws a retired mark is never taken; `check` flags one already in a film. CINETIC_LOGO_BRANDS points at another
 * table (tests).
 */
export const BRANDS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'logo-brands.json');
const brandTables = new Map();
export function loadBrands(file = process.env.CINETIC_LOGO_BRANDS || BRANDS_FILE) {
  if (brandTables.has(file)) return brandTables.get(file);
  let t = { checked: null, same: 0.72, margin: 0.04, brands: {} };
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    t = { checked: j.checked || null, same: j.threshold?.same ?? 0.72, margin: j.threshold?.margin ?? 0.04, brands: j.brands || {} };
    for (const [slug, b] of Object.entries(t.brands)) b.slug = slug;
  } catch { /* no table: no version checks */ }
  brandTables.set(file, t);
  return t;
}
const brandKeys = (b) => [b.slug, b.name, ...(b.aka || [])].flatMap((x) => [norm(x), bare(x)]);
/** The brand table's row for a name (its slug, name or another name it goes by), or null. */
export function brandFor(name, table = loadBrands()) {
  const q = norm(name), qb = bare(name);
  if (!q) return null;
  return Object.values(table.brands).find((b) => brandKeys(b).some((k) => k === q || k === qb)) || null;
}
/** The row for a search group: by its name, its members' names, or a member the row lists. */
export function brandOfGroup(group, table = loadBrands()) {
  const byName = brandFor(group.name, table);
  if (byName) return byName;
  for (const m of group.members || []) {
    const b = Object.values(table.brands).find((x) => {
      const ms = x.members?.[m.collection];
      return ms && [].concat(ms).some((r) => sameMember(m, r));
    }) || brandFor(m.name, table);
    if (b) return b;
  }
  return null;
}
const hexOf = (c) => { const rgb = rgbOf(c); return rgb ? `#${rgb.map((v) => hex2(v)).join('')}` : null; };
const range = (v) => `${v.since || '?'} to ${v.until || '?'}`;
/**
 * Which of a brand's marks a file draws: { status: 'current' | 'outdated' | 'unknown', since, until, what, sim, by }.
 * Outdated: it looks like a retired mark (at least `same` alike, and `margin` more alike than the current one), or
 * it paints with a retired colour of the brand and none of its current colours. Current: it looks like the current
 * mark. Unknown: neither (a wordmark against a mark, a drawing the table does not know).
 */
export function versionOf(brand, svg, table = loadBrands()) {
  const f = parseFp(fingerprint(svg));
  if (!f) return { status: 'unknown', sim: 0, by: 'unread' };
  const cur = brand.mark?.fp ? similarity(f, brand.mark.fp) : 0;
  let old = null;
  for (const o of brand.outdated || []) { const s = similarity(f, o.fp); if (!old || s > old.sim) old = { ...o, sim: s }; }
  if (old && old.sim >= table.same && old.sim > cur + table.margin) return { status: 'outdated', since: old.since, until: old.until, what: old.what, sim: old.sim, by: 'drawing' };
  const cols = new Set(coloursOf(svg).map(hexOf).filter(Boolean));
  const retired = (brand.retired || []).map(hexOf).filter((c) => cols.has(c));
  if (retired.length && !(brand.hex || []).map(hexOf).some((c) => cols.has(c))) {
    return { status: 'outdated', since: null, until: brand.mark?.since || null, what: brand.retiredWhat || `a retired colour (${retired.join(', ')})`, sim: cur, by: 'colour', colours: retired };
  }
  if (cur >= table.same) return { status: 'current', since: brand.mark.since, what: brand.mark.what, sim: cur, by: 'drawing' };
  return { status: 'unknown', sim: cur, by: 'drawing' };
}
/**
 * How fresh a brand row is: it names the brand's own page (page) and the date the mark was compared with it
 * (verified; the table's checked date when the row has none). No page, "verified": null (a mark nobody could confirm on
 * the brand's page) or a check over 12 months old is not current: check fails a film that shows the brand until the
 * row is checked again. CINETIC_TODAY (YYYY-MM-DD) pins today for tests.
 */
export function verification(brand, table = loadBrands(), now = process.env.CINETIC_TODAY ? Date.parse(process.env.CINETIC_TODAY) : Date.now()) {
  const page = brand?.page || null;
  const verified = brand && Object.prototype.hasOwnProperty.call(brand, 'verified') ? brand.verified : table.checked;
  if (!page) return { ok: false, page, verified: verified || null, why: 'no brand page in the table to check the mark against' };
  if (!verified) return { ok: false, page, verified: null, why: `not verified against ${page}${brand.verifyNote ? ` (${brand.verifyNote})` : ''}: compare the mark with the brand's page, then set "verified" (YYYY-MM-DD) in scripts/logo-brands.json` };
  const age = (now - Date.parse(verified)) / 86400000;
  if (!(age <= 366)) return { ok: false, page, verified, why: `checked ${verified}, over 12 months ago: compare the mark with ${page} again and update "verified"` };
  return { ok: true, page, verified };
}

/** One line about a mark's version, for get and check. */
export function versionLine(brand, v, checked) {
  if (!brand) return 'no row in the brand table: its version is not checked';
  if (v.status === 'current') return `the current mark: ${v.what}${v.since ? `, since ${v.since}` : ''}${checked ? ` (checked ${checked})` : ''}`;
  if (v.status === 'outdated') return `a retired mark: ${v.what}${v.by === 'drawing' ? ` (${range(v)})` : ''}; the current one${brand.mark?.since ? ` (since ${brand.mark.since})` : ''}: ${brand.mark?.what || 'see the brand page'}`;
  return `not a drawing the brand table knows (its current mark: ${brand.mark?.what || '?'}${brand.mark?.since ? `, since ${brand.mark.since}` : ''})`;
}

// ------------------------------------------------------------------------------------------------ plan a brand
/**
 * gilbarbara files sorted into roles by their names: { mark, markDark, word, wordDark } lists, newest version first.
 * The set keeps a brand's current drawing under the plain name and files the drawing it replaced under the year it
 * began (google-gmail.svg is the 2026 icon, google-gmail-2020.svg the 2020 one): the plain name leads, then years down.
 */
export function gilbarbaraRoles(shortname, files) {
  const roles = { mark: [], markDark: [], base: [], baseDark: [] };
  const year = (f) => Number((f.match(/-(\d{4})(?:-|\.svg$)/) || [])[1] || 9999);
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

/** A Commons file by its title: { url, page, licence, notes } from its own page's metadata, or null. */
export async function commonsFile(title, { refresh = false } = {}) {
  const t = String(title).startsWith('File:') ? String(title) : `File:${title}`;
  const file = path.join(cacheDir(), 'commons', `${t.replace(/[^\w.-]+/g, '_')}.json`);
  let j = !refresh && readCache(file, WEEK);
  if (j) { try { j = JSON.parse(j); } catch { j = null; } }
  if (!j) {
    j = await http(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', titles: t, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiextmetadatafilter: 'License|LicenseShortName|Restrictions|UsageTerms' })}`, { as: 'json' });
    if (j) writeCache(file, JSON.stringify(j));
  }
  const ii = (j?.query?.pages?.[0]?.imageinfo || [])[0];
  if (!ii || !/svg/.test(ii.mime || '')) return null;
  const meta = Object.fromEntries(Object.entries(ii.extmetadata || {}).map(([k, v]) => [k, v?.value]));
  const { id: lic, notes } = commonsLicence(meta);
  return { url: ii.url, page: ii.descriptionurl, licence: lic === 'cc0' ? 'CC0-1.0' : lic === 'pd' ? 'PD' : lic, notes };
}

/** The candidates a brand row prefers, in its order (the collections that carry its current mark), each marked `preferred`. */
export async function preferredCands(brand, o = {}, notes = []) {
  const out = [];
  for (const ref of brand.prefer || []) {
    const i = ref.indexOf(':');
    const col = ref.slice(0, i), id = ref.slice(i + 1);
    try {
      if (col === 'gilbarbara') {
        const short = [].concat(brand.members?.gilbarbara || []).filter((s) => id.startsWith(`${s}-`) || id === `${s}.svg`).sort((a, b) => b.length - a.length)[0] || id.replace(/(-icon)?(-\d{4})?(-dark)?\.svg$/i, '');
        const r = gilbarbaraRoles(short, [id]);
        const role = r.mark.length ? 'mark' : r.markDark.length ? 'markDark' : r.baseDark.length ? 'baseDark' : 'base';
        out.push(pick(role, col, COLLECTIONS.gilbarbara.file(id), { file: id, licence: 'CC0-1.0', preferred: true }));
      } else if (col === 'svgl') {
        const [sid, theme] = id.split(':');
        const e = svglFind(await index('svgl', o), sid);
        const url = e && themed(e.route, theme === 'dark' ? 'dark' : 'light');
        if (url) out.push(pick(theme === 'dark' ? 'baseDark' : 'base', col, url, { licence: 'MIT', guidelines: e.brandUrl || null, preferred: true }));
      } else if (col === 'simple-icons') {
        const list = await index('simple-icons', o);
        const e = (Array.isArray(list) ? list : list?.icons || []).find((x) => x.slug === id);
        const ok = e && licenceOk(e.license?.type || 'CC0-1.0', o);
        if (ok?.ok) out.push(pick('mono', col, COLLECTIONS['simple-icons'].file(id), { licence: e.license?.type || 'CC0-1.0', licenceUrl: e.license?.url || null, hex: e.hex ? `#${String(e.hex).toUpperCase()}` : null, guidelines: e.guidelines || null, source: e.source || '', preferred: true }));
        else if (e) notes.push(`simple-icons ${id}: ${ok.why}`);
      } else if (col === 'commons') {
        const f = await commonsFile(id, o);
        const ok = f && licenceOk(f.licence, o);
        if (ok?.ok) out.push(pick('base', col, f.url, { licence: f.licence, page: f.page, notes: f.notes, preferred: true }));
        else if (f) notes.push(`commons ${id}: ${ok.why}`);
      }
    } catch (e) { if (e instanceof Blocked) throw e; notes.push(`${ref}: ${e.message}`); }
  }
  return out;
}
/** A search group cut to the members a brand row lists (a name or host match can pull in another brand's files). */
export function brandMembers(group, brand) {
  if (!brand?.members) return group;
  const keep = group.members.filter((m) => [].concat(brand.members[m.collection] || []).some((r) => sameMember(m, r)));
  return { ...group, members: keep };
}

/** Fetch, clean and write one brand's files; returns the record entry. */
export async function getBrand(group, film, o = {}) {
  const variants = new Set(o.variant === 'all' || !o.variant ? ['mark', 'wordmark', 'mono'] : String(o.variant).split(','));
  const table = loadBrands();
  const brand = o.brand !== undefined ? o.brand : brandOfGroup(group, table);
  const { cands, notes } = planBrand(o.source ? group : brandMembers(group, brand), o);
  if (brand && !o.source) {
    const pref = await preferredCands(brand, o, notes);
    const seen = new Set(pref.map((c) => c.url));
    cands.splice(0, cands.length, ...pref, ...cands.filter((c) => !seen.has(c.url)));
  }
  const slug = o.as ? slugOf(o.as) : brand ? brand.slug : slugOf(group.name);
  const dir = path.join(film, 'public', 'logos');
  const got = {};
  const loaded = new Map();
  const retired = [];
  const load = async (c) => {
    if (loaded.has(c.url)) return loaded.get(c.url) && { ...c, ...loaded.get(c.url) };
    let p = null;
    try {
      const raw = await svgAt(c.url, { refresh: o.refresh });
      if (!raw) notes.push(`${c.collection}: ${c.url} is gone`);
      else { p = prepare(raw, { tile: o.tile }); if (brand) p.version = versionOf(brand, c.role === 'mono' && c.hex ? oneColour(p.svg, c.hex) : p.svg, table); }
    } catch (e) { if (e instanceof Blocked) throw e; notes.push(`${c.collection}: ${c.url}: ${e.message}`); }
    loaded.set(c.url, p);
    return p && { ...c, ...p };
  };
  // a file that draws a retired mark is never taken (unless --allow-outdated): said once per file
  const refused = new Set();
  const isRetired = (p) => {
    if (p?.version?.status !== 'outdated' || o.allowOutdated) return false;
    if (!refused.has(p.url)) {
      refused.add(p.url);
      retired.push(p);
      notes.push(`${p.collection} ${p.file || p.url.split('/').pop()}: ${p.version.what}${p.version.by === 'drawing' ? ` (${range(p.version)})` : ''}, a retired mark: skipped`);
    }
    return true;
  };
  // the brand's own file, passed with --file (downloaded from its brand or press page)
  if (o.file) {
    const raw = fs.readFileSync(o.file, 'utf8');
    const p = { ...prepare(raw, { tile: o.tile }), collection: 'file', url: `file:${path.basename(o.file)}`, file: path.basename(o.file), licence: 'owner-supplied', page: brand?.page || null };
    if (brand) p.version = versionOf(brand, p.svg, table);
    if (isRetired(p)) throw new Error(`${o.file} draws ${brand.name}'s retired mark (${p.version.what}); the current one${brand.mark?.since ? ` (since ${brand.mark.since})` : ''}: ${brand.mark?.what}${brand.page ? ` on ${brand.page}` : ''}`);
    got[p.aspect > 1.6 ? 'wordmark' : 'mark'] = p;
  }
  // The mark first: the brand's official full-colour mark or app tile wins over a one-colour glyph or an older
  // drawing (one collection draws a brand as a black glyph, another as its colour app tile). When the brand's own
  // colour (Simple Icons' hex) is a colour, or not known, the first candidate in colour is the mark; a brand whose
  // colour is black or white keeps the collections' order. --source keeps that collection's file. A brand row puts
  // the collections that carry its current mark first.
  const siHex = by(group, 'simple-icons')?.hex;
  if (!got.mark && !o.source && (!rgbOf(siHex) || lc(rgbOf(siHex)).C >= 0.04)) {
    for (const c of cands.filter((x) => x.role === 'mark' || (x.role === 'base' && !x.wordOnly))) {
      const p = await load(c);
      if (p && !isRetired(p) && p.aspect <= 1.6 && toneOf(p.svg) === 'colour') { got.mark = p; break; }
    }
  }
  // The full-colour mark (always) and the wordmark (when asked): named roles first, then base files by their
  // proportions (wider than 1.6:1 is a wordmark). A dark version pairs only with a light one of its own collection.
  const wanted = (r) => (r.startsWith('word') ? variants.has('wordmark') : true);
  const open = (r) => wanted(r) && !got[r] && (!r.endsWith('Dark') || got[r.slice(0, -4)]);
  for (const c of cands.filter((x) => x.role !== 'mono')) {
    const roles = c.role === 'base' ? (c.wordOnly ? ['wordmark'] : ['mark', 'wordmark']) : c.role === 'baseDark' ? (c.wordOnly ? ['wordmarkDark'] : ['markDark', 'wordmarkDark']) : [c.role];
    const fits = (r) => open(r) && (!r.endsWith('Dark') || got[r.slice(0, -4)].collection === c.collection);
    if (!roles.some(fits)) continue;
    const p = await load(c);
    if (!p || isRetired(p)) continue;
    const r = roles.length === 1 ? roles[0] : roles[p.aspect > 1.6 ? 1 : 0];
    if (r.startsWith('word') && p.aspect <= 1.2) continue; // a stacked lockup is neither a mark nor a wordmark
    if (fits(r)) got[r] = p;
  }
  const mono = cands.find((x) => x.role === 'mono');
  let monoFile = null;
  if (mono && (variants.has('mono') || !got.mark)) {
    monoFile = await load(mono);
    if (monoFile?.version?.status === 'outdated' && !o.allowOutdated) {
      if (monoFile.version.by === 'drawing') { isRetired(monoFile); monoFile = null; }
      else { monoFile.retiredHex = true; notes.push(`simple-icons ${mono.url.split('/').pop()}: its hex ${monoFile.hex} is ${monoFile.version.what}: no one-colour file in it (white and black only)`); }
    }
  }
  if (!got.mark && monoFile && !monoFile.retiredHex) {
    got.mark = { ...monoFile, svg: oneColour(monoFile.svg, monoFile.hex || '#111111'), derived: 'the one-colour mark in the brand\'s official hex (no full-colour file in the open collections)' };
    notes.push('no full-colour mark in the open collections: the mark is the one-colour one in the brand\'s official hex');
  }
  if (!got.mark && !got.wordmark) {
    if (retired.length && brand) {
      throw new Error(`only retired marks of ${brand.name} in the open collections (${[...new Set(retired.map((p) => `${p.collection} ${p.file || p.url.split('/').pop()}: ${p.version.what}`))].join('; ')}). `
        + `The current mark${brand.mark?.since ? ` (since ${brand.mark.since})` : ''}: ${brand.mark?.what || 'see the brand page'}. Download it from ${brand.page || 'the brand\'s press page'} and pass --file <svg>, or pass --allow-outdated to keep the old one knowingly`);
    }
    throw new Error(`no usable file for ${group.name}${notes.length ? `:\n  ${notes.join('\n  ')}` : ''}`);
  }
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
      if (monoFile?.hex && !monoFile.retiredHex) got.mono = { ...base, svg: oneColour(base.svg, monoFile.hex) };
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
  const owner = o.owner || brand?.owner || group.owner || ownerOf(site);
  if (!owner) notes.push(`trademark owner unknown: confirm it on the brand's own site and pass --owner "<owner>"`);
  const si = monoFile || by(group, 'simple-icons');
  const v = got.mark?.version || got.wordmark?.version || null;
  const entry = {
    name: o.name || brand?.name || group.name, owner: owner || null, site: site || null,
    hex: si?.hex || null,
    guidelines: Object.values(got).map((f) => f.guidelines).find(Boolean) || si?.guidelines || brand?.page || null,
    tone: got.mark ? toneOf(got.mark.svg) : 'colour', tile: got.mark?.tile ? 'own' : 'none',
    files,
    sources: Object.fromEntries(used.map((c) => {
      const f = Object.values(got).find((x) => x.collection === c);
      const C = COLLECTIONS[c] || OWN_FILE;
      return [c, { collection: C.name, page: f.page || C.page, licence: f.licence || C.licence, licenceUrl: f.licenceUrl || C.licenceUrl, ...(C.seen ? { seen: C.seen } : {}), ...(C.terms ? { terms: C.terms } : {}), ...(f.notes?.length ? { notes: f.notes } : {}) }];
    })),
    ...(brand ? { version: v ? { status: v.status, ...(v.status === 'current' ? { since: brand.mark?.since || null, what: brand.mark?.what || null } : { what: v.what, ...(v.since ? { since: v.since } : {}), ...(v.until ? { until: v.until } : {}) }), checked: table.checked, page: brand.page || null } : null } : {}),
    trademark: `${o.name || brand?.name || group.name} is a trademark of ${owner || 'its owner'}. Shown only for what the product works with, imports from, runs on or names; no endorsement or partnership implied. Colours and proportions as published.`,
    fetched: new Date().toISOString().slice(0, 10),
  };
  return { slug, entry, notes, brand, version: v };
}
const by = (group, c) => group.members.find((m) => m.collection === c);

// ------------------------------------------------------------------------------------------------ CLI
export class Usage extends Error {}
export function parseArgs(argv) {
  const VALUED = new Set(['source', 'limit', 'variant', 'film', 'as', 'name', 'owner', 'tile', 'file']);
  const FLAGS = new Set(['json', 'help', 'allow-credit', 'refresh', 'write', 'allow-outdated']);
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

/** A search group built from a brand row's members (no name guessing across collections). */
export async function groupForBrand(brand, { refresh = false } = {}) {
  const members = [];
  const M = brand.members || {};
  for (const c of ['gilbarbara', 'svgl', 'simple-icons']) {
    const ids = [].concat(M[c] || []).map(String);
    if (!ids.length) continue;
    let list;
    try { list = await index(c, { refresh }); } catch (e) { if (e instanceof Blocked) throw e; continue; }
    if (c === 'gilbarbara') for (const x of list) { if (ids.includes(x.shortname)) members.push(...searchGilbarbara([x], x.name).map((m) => ({ ...m, score: 100 }))); }
    if (c === 'svgl') for (const id of ids) { const x = svglFind(list, id); if (x && !members.some((m) => m.collection === 'svgl' && m.id === svglKey(x))) members.push(...searchSvgl([x], x.title).map((m) => ({ ...m, score: 100 }))); }
    if (c === 'simple-icons') { const arr = Array.isArray(list) ? list : list?.icons || []; for (const x of arr) if (ids.includes(x.slug)) members.push(...searchSimpleIcons([x], x.title).map((m) => ({ ...m, score: 100 }))); }
  }
  const site = (members.find((m) => m.collection === 'svgl') || members.find((m) => m.collection === 'gilbarbara') || {}).site || '';
  return { name: brand.name, site, owner: brand.owner || ownerOf(site), score: 100, members, brand };
}

async function resolveGroup(ref, args) {
  const row = !/^#\d+$/.test(ref) && !/^(gilbarbara|svgl|simple-icons|commons):/.test(ref) && !args.source ? brandFor(ref) : null;
  if (row) return groupForBrand(row, { refresh: args.refresh });
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
      const hit = col === 'svgl' ? svglFind(arr, id) : arr.find((x) => String(col === 'gilbarbara' ? x.shortname : x.slug) === id);
      if (!hit) throw new Error(`${ref}: not found in ${col}`);
      name = hit.name || hit.title;
    }
    const sources = col === 'commons' ? ['commons'] : [...new Set([col, ...sourcesOf({})])];
    const { groups } = await search(name, { sources, refresh: args.refresh });
    const g = groups.find((x) => x.members.some((y) => y.collection === col && (sameMember(y, id) || (col === 'commons' && norm(y.id) === norm(id)))));
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
  if (args.file && !fs.existsSync(args.file)) throw new Usage(`--file ${args.file}: no such file`);
  const { slug, entry, notes, brand, version } = await getBrand(group, film, { variant: args.variant, source: src, as: args.as, name: args.name, owner: args.owner, tile: args.tile, allowCredit: args['allow-credit'], refresh: args.refresh, file: args.file, allowOutdated: args['allow-outdated'] });
  const record = readRecord(film);
  record.logos[slug] = entry;
  writeRecord(film, record);
  console.log(`${entry.name} -> public/logos/ (${Object.keys(entry.files).join(', ')}); ${entry.owner ? `owner ${entry.owner}` : 'owner unknown'}; ${Object.entries(entry.sources).map(([k, s]) => `${k} ${s.licence}`).join(', ')}`);
  if (brand) console.log(`mark: ${versionLine(brand, version || { status: 'unknown' }, loadBrands().checked)}${brand.page ? `; brand page ${brand.page}` : ''}`);
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
/** Every .svg under a folder (node_modules, out and dot folders left out). */
function svgFiles(dir, out = [], depth = 0) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of list) {
    if (d.name.startsWith('.') || d.name === 'node_modules' || d.name === 'out') continue;
    const p = path.join(dir, d.name);
    if (d.isDirectory() && depth < 6) svgFiles(p, out, depth + 1);
    else if (d.isFile() && /\.svg$/i.test(d.name)) out.push(p);
  }
  return out;
}
/**
 * The marks a film shows, each against the brand table: the files of its record (by the brand of the entry) and any
 * other .svg under public/ (a mark placed by hand, matched against every brand's retired marks in colour). Rows:
 * { file, brand, status: 'current' | 'outdated' | 'unknown' | 'unchecked', line }.
 */
export function checkMarks(film, table = loadBrands()) {
  const rec = readRecord(film);
  const pub = path.join(film, 'public');
  const rows = [];
  const seen = new Set();
  for (const [slug, e] of Object.entries(rec.logos)) {
    const brand = brandFor(slug, table) || brandFor(e.name, table);
    for (const [kind, fl] of Object.entries(e.files || {})) {
      const p = path.join(pub, fl.path);
      seen.add(path.resolve(p));
      if (!fs.existsSync(p)) continue;
      if (!brand) { rows.push({ file: fl.path, kind, brand: e.name, status: 'unchecked', line: versionLine(null) }); continue; }
      let v;
      try { v = versionOf(brand, sanitizeSvg(fs.readFileSync(p, 'utf8')), table); } catch (err) { v = { status: 'unknown', by: err.message }; }
      rows.push({ file: fl.path, kind, brand: brand.name, slug: brand.slug, status: v.status, version: v, line: versionLine(brand, v, table.checked) });
    }
  }
  const brands = Object.values(table.brands);
  for (const p of svgFiles(pub)) {
    if (seen.has(path.resolve(p))) continue;
    let f = null, svg = null;
    try { svg = sanitizeSvg(fs.readFileSync(p, 'utf8')); f = parseFp(fingerprint(svg)); } catch { continue; }
    if (!f || monoFp(f)) continue; // a one-colour shape is too plain to name a brand by
    let best = null;
    for (const b of brands) {
      for (const o of b.outdated || []) { const sim = similarity(f, o.fp); if (sim >= 0.82 && (!best || sim > best.sim)) best = { b, sim }; }
      if (b.mark?.fp) { const sim = similarity(f, b.mark.fp); if (sim >= 0.82 && (!best || sim > best.sim)) best = { b, sim }; }
    }
    if (!best) continue;
    const v = versionOf(best.b, svg, table);
    if (v.status === 'unknown') continue;
    rows.push({ file: path.relative(pub, p).split(path.sep).join('/'), kind: 'file', brand: best.b.name, slug: best.b.slug, status: v.status, version: v, line: versionLine(best.b, v, table.checked) });
  }
  return rows;
}

// ------------------------------------------------------------------------------------------------ stand-ins
/** Brand words too common to name a brand on their own after Icon / Mark / Glyph (a close X, a zoom glyph, a cursor). */
const AMBIGUOUS = new Set(['x', 'box', 'zoom', 'linear', 'meta', 'cursor', 'threads', 'messenger', 'safari', 'android', 'apple', 'notion', 'framer', 'loom', 'canva', 'miro']);
const LOGO_WORDS = /(Logo|Logomark|Wordmark|Brandmark|Brand|Mark|Icon|Glyph|Badge|Symbol)/;
const DRAWS = /<svg\b|<path\b|<circle\b|<polygon\b|<ellipse\b|\bd=\{?["'`]\s*[Mm]\s*-?[\d.]|["'`][Mm]\s*-?[\d.]+[\s,]+-?[\d.]+\s*[LlCcHhVvQqSsAaZz]/;
const OFFICIAL = /staticFile\(|['"`/]logos\/|<AppIcon\b|<LogoChip\b|<InlineLogo\b|\blogo=\{?["'`]|<Img\b/;
const compact = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
/** Every brand word of the table (name, slug, aliases) compacted, to its brand row, plus former names (twitter, vscode). */
function brandWords(table) {
  const m = new Map();
  for (const b of Object.values(table.brands)) for (const k of [b.name, b.slug, ...(b.aliases || [])]) if (compact(k)) m.set(compact(k), b);
  const extra = { twitter: 'x', vscode: 'visual-studio-code', gdrive: 'google-drive', gcal: 'google-calendar', youtubemusic: 'youtube', msteams: 'microsoft-teams', teams: 'microsoft-teams', outlook: 'microsoft-outlook', excel: 'microsoft-excel', powerpoint: 'microsoft-powerpoint', onedrive: 'microsoft-onedrive', chrome: 'google-chrome', copilot: 'github-copilot' };
  for (const [k, slug] of Object.entries(extra)) if (table.brands[slug] && !m.has(k)) m.set(k, table.brands[slug]);
  return m;
}
/** The brand an identifier names with a logo word (SlackLogo, logoFigma, GithubMark, IconNotion), or null. */
function brandOfIdent(id, words) {
  const mm = id.match(new RegExp(`^(.*?)${LOGO_WORDS.source}(.*)$`, "i"));
  if (!mm) return null;
  const word = mm[2];
  for (const part of [mm[1], mm[3]]) {
    const k = compact(part);
    if (!k || !words.has(k)) continue;
    if (AMBIGUOUS.has(k) && !/logo|wordmark|brand/i.test(word)) continue;
    return words.get(k);
  }
  return null;
}
function codeFiles(dir, out = [], depth = 0) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of list) {
    if (d.name.startsWith('.') || d.name === 'node_modules' || d.name === 'out') continue;
    const p = path.join(dir, d.name);
    if (d.isDirectory() && depth < 8) codeFiles(p, out, depth + 1);
    else if (d.isFile() && /\.(tsx|ts|jsx|js|mjs)$/i.test(d.name)) out.push(p);
  }
  return out;
}
/**
 * Drawn or inline stand-ins for real companies' marks in a film: a mark of a brand the table lists must be its official
 * file (an open collection through `get`, or the brand's own press-kit file through `get --file`), never a look-alike
 * drawn in code or a file of unknown origin. Reads the film's src/ (its own mark in src/brand/ and the kit's file reader
 * are left out) and its public/ and src/ asset files. Rows: { file, line, brand, slug, why }.
 *   - a component or constant named for a brand's logo (SlackLogo, GithubMark, logoFigma) that draws SVG inline;
 *   - an object key named for a brand whose value is SVG markup or path data (a map of hand-drawn marks);
 *   - an inline <svg> labelled with a brand (aria-label, title, data-logo, data-brand, <title>);
 *   - an image or SVG file named for a brand that the film's logo record does not list (no provenance).
 */
export function standIns(film, table = loadBrands()) {
  const words = brandWords(table);
  const rows = [];
  const src = path.join(film, 'src');
  const skip = (p) => {
    const r = path.relative(src, p).split(path.sep).join('/');
    return r.startsWith('brand/') || r === 'logos.ts' || r === 'kit/logos.tsx';
  };
  for (const p of codeFiles(src)) {
    if (skip(p)) continue;
    let text = '';
    try { text = fs.readFileSync(p, 'utf8'); } catch { continue; }
    if (!DRAWS.test(text)) continue;
    const rel = path.relative(film, p).split(path.sep).join('/');
    const lines = text.split(/\r?\n/);
    const lineOf = (i) => text.slice(0, i).split('\n').length;
    // 1. a declaration named for a brand's logo whose body draws inline (up to the next top-level declaration)
    const decl = /^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(decl);
      if (!m) continue;
      const brand = brandOfIdent(m[1], words);
      if (!brand) continue;
      let j = i + 1;
      while (j < lines.length && !decl.test(lines[j])) j++;
      const body = lines.slice(i, j).join('\n');
      if (DRAWS.test(body) && !OFFICIAL.test(body)) rows.push({ file: rel, line: i + 1, brand: brand.name, slug: brand.slug, why: `${m[1]} draws ${brand.name}'s mark inline` });
    }
    // 2. an object key named for a brand whose value is SVG markup or path data
    const key = /(?:^|[{,\s])(?:(['"])([^'"\n]{1,40})\1|([A-Za-z_$][\w$]*))\s*:\s*/g;
    let km;
    while ((km = key.exec(text))) {
      const k = compact(km[2] || km[3]);
      if (!k || !words.has(k) || AMBIGUOUS.has(k)) continue;
      const value = text.slice(km.index + km[0].length, km.index + km[0].length + 400).split(/\n\s*[\w'"]+\s*:/)[0];
      if (DRAWS.test(value.slice(0, 300)) && !OFFICIAL.test(value.slice(0, 300))) {
        const b = words.get(k);
        rows.push({ file: rel, line: lineOf(km.index + 1), brand: b.name, slug: b.slug, why: `the key "${km[2] || km[3]}" holds a drawn ${b.name} mark (SVG markup or path data)` });
      }
    }
    // 3. an inline <svg> labelled with a brand
    const lab = /<svg\b[^>]*?\b(?:aria-label|title|data-logo|data-brand)=\{?["'`]([^"'`]{1,40})["'`]|<title>([^<]{1,40})<\/title>/g;
    let lm;
    while ((lm = lab.exec(text))) {
      const k = compact(lm[1] || lm[2]);
      if (!words.has(k)) continue;
      const b = words.get(k);
      rows.push({ file: rel, line: lineOf(lm.index + 1), brand: b.name, slug: b.slug, why: `an inline <svg> labelled "${lm[1] || lm[2]}" draws ${b.name}'s mark` });
    }
  }
  // 4. an image or SVG file named for a brand that the logo record does not list
  const rec = readRecord(film);
  const listed = new Set(Object.values(rec.logos).flatMap((e) => Object.values(e.files || {}).map((f) => path.resolve(film, 'public', f.path))));
  const assets = (dir, out = [], depth = 0) => {
    let list = [];
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const d of list) {
      if (d.name.startsWith('.') || d.name === 'node_modules' || d.name === 'out' || d.name === 'baked') continue;
      const p = path.join(dir, d.name);
      if (d.isDirectory() && depth < 6) assets(p, out, depth + 1);
      else if (d.isFile() && /\.(svg|png|webp|jpe?g|avif)$/i.test(d.name)) out.push(p);
    }
    return out;
  };
  for (const p of [...assets(path.join(film, 'public')), ...assets(src)]) {
    if (listed.has(path.resolve(p)) || (p.startsWith(src) && skip(p))) continue;
    const toks = path.basename(p).replace(/\.[^.]+$/, '').toLowerCase().split(/[-_.\s]+/).filter(Boolean);
    const joined = compact(path.basename(p).replace(/\.[^.]+$/, '').replace(/[-_.\s]+(logo|icon|mark|wordmark|dark|light|white|black|mono|color|colour)$/i, ''));
    const hit = [joined, ...toks.filter((t) => !AMBIGUOUS.has(t) && t.length > 2)].find((t) => words.has(t));
    if (!hit || (AMBIGUOUS.has(hit) && !toks.some((t) => /^(logo|wordmark|brand)$/.test(t)))) continue;
    const b = words.get(hit);
    rows.push({ file: path.relative(film, p).split(path.sep).join('/'), line: 0, brand: b.name, slug: b.slug, why: `a file named for ${b.name} that the logo record does not list (no provenance: a drawn copy or an unchecked download)` });
  }
  return rows;
}

function cmdCheck(args) {
  const film = path.resolve(args._[0] || args.film || '.');
  if (!fs.existsSync(path.join(film, 'public'))) throw new Usage(`${film} has no public/ folder: name a film project (check <film>)`);
  const { record, problems } = checkRecord(film);
  const fakes = standIns(film);
  for (const s of fakes) problems.push(`STAND-IN ${s.file}${s.line ? `:${s.line}` : ''}: ${s.why}. A real company's mark is its official file: node scripts/logos.mjs get ${s.slug} --film <film> `
    + `(open collections: svgl, Simple Icons, SVG Logos, Wikimedia Commons), or the brand's own press-kit file with get ${s.slug} --file <svg>; then <AppIcon logo="${s.slug}" /> or <LogoChip logo="${s.slug}" /> (kit/logos.tsx)`);
  const rows = checkMarks(film);
  const old = rows.filter((r) => r.status === 'outdated');
  const table = loadBrands();
  const stale = [...new Set(rows.map((r) => r.slug).filter(Boolean))].map((slug) => ({ slug, brand: table.brands[slug]?.name || slug, ...verification(table.brands[slug], table) })).filter((v) => !v.ok);
  if (args.json) { console.log(JSON.stringify({ film, marks: rows, problems, stale }, null, 1)); return problems.length || old.length || stale.length ? 1 : 0; }
  // one line per mark of the record when its files agree; a retired file always on its own line
  const groups = new Map();
  for (const r of rows) groups.set(r.slug && r.kind !== 'file' ? `rec:${r.slug}` : `file:${r.file}`, [...(groups.get(r.slug && r.kind !== 'file' ? `rec:${r.slug}` : `file:${r.file}`) || []), r]);
  for (const list of groups.values()) {
    const bad = list.filter((r) => r.status === 'outdated');
    for (const r of bad) console.log(`OUTDATED  ${r.file}  ${r.brand}: ${r.line}${r.slug ? `. Fix: node scripts/logos.mjs get ${r.slug} --refresh --film <film>` : ''}`);
    const ok = list.filter((r) => r.status !== 'outdated');
    if (!ok.length) continue;
    const marks = ok.filter((r) => !/^wordmark/.test(r.kind));
    const lead = marks.find((r) => r.status === 'current') || marks[0] || ok[0];
    const words = ok.length - marks.length;
    console.log(`${lead.status.padEnd(9)} ${ok.length > 1 ? `${lead.slug || lead.file} (${ok.length} files)` : lead.file}  ${lead.brand}: ${lead.line}${words ? `; ${words} wordmark file${words === 1 ? '' : 's'} not fingerprinted` : ''}`);
  }
  for (const v of stale) console.log(`STALE     ${v.brand}: ${v.why}`);
  for (const p of problems) console.log(`FAIL      ${p}`);
  console.log(`${Object.keys(record.logos).length} marks in the record, ${rows.length} files checked against the brand table (${loadBrands().checked || 'no table'}): ${old.length} outdated, ${stale.length} unverified, ${problems.length} record problem${problems.length === 1 ? '' : 's'}`);
  return problems.length || old.length || stale.length ? 1 : 0;
}

export const USAGE = `logos.mjs: real company and product marks in their official colours, from open collections.

  search <name> [--source all|gilbarbara,svgl,simple-icons,commons] [--limit 8] [--json] [--refresh]
  get    <name|#n|collection:id> [--variant all|mark|wordmark|mono] [--film .] [--source <collection>]
         [--as <slug>] [--name "Shown name"] [--owner "Trademark owner"] [--tile own|none] [--allow-credit] [--refresh]
         writes <film>/public/logos/<slug>[.dark|.wordmark|.wordmark.dark|.mono|.white|.black].svg, the record
         <film>/public/logos/logos.json (source, licence, owner) and the kit's index <film>/src/logos.ts
  list   [--film .] [--json] [--write]      the film's marks (--write rewrites src/logos.ts from the record)
  check  [<film>] [--json]                  every file present, every source with its licence, every owner named,
                                            no retired mark (record files and any .svg under public/), and every brand
                                            shown verified on its own page within 12 months, and no drawn stand-in
                                            for a listed brand (inline SVG named or labelled for it, or an unlisted file
                                            named for it): exit 1 if one fails
  --file <svg>       get: the brand's own file from its brand page (when no open collection draws the current mark)
  --allow-outdated   get: keep a retired mark knowingly (check still flags it)

Collections: gilbarbara (SVG Logos, CC0), svgl (MIT; light, dark and wordmark files), simple-icons (CC0 unless an
icon names its own licence; one colour plus the brand's hex), commons (public domain and CC0 only; the fallback).
A mark is shown only for what the product works with, imports from, runs on or names: never an endorsement or a
partnership; colours and proportions as published; nothing is credited on screen. The brand table
(logo-brands.json) names each listed brand's current mark and the marks it retired: get takes the current one and
prints its version, never a retired one. Never works around a bot check,
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
