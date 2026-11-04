#!/usr/bin/env node
/**
 * assets.test.mjs: offline tests for scripts/assets.mjs (imagery search, licences, record, sheet and grade math).
 *
 *   1. Licences: Creative Commons codes, Wikimedia Commons metadata and NASA records map to the right licence;
 *      the default takes only licences that need no credit; --allow-credit adds CC BY; share-alike,
 *      non-commercial, no-derivatives, Mixkit's restricted licence and unknown licences are always refused.
 *   2. Every source's parser on hand-written responses (assets-fixtures/: JSON only, no images, no recorded data;
 *      each follows its source's response shape): fields, renditions, licences, refusals. Burst, ISO Republic and
 *      Coverr from their pages' shapes (Coverr+ and AI-generated clips refused).
 *   2b. The vet: people and text from a record's words and a thumbnail read, --people / --no-people / --clean /
 *      --fit, soft pictures; natural tones (skin, wood) are never a banned region in a picture; the src line.
 *   3. Filtering (licence, size, shape, near-duplicates), interleaving, search options (keyed sources only with
 *      their key), the colour filter's scoring.
 *   4. The private licence record: where it lives (outside public/), what an entry holds, replacement.
 *   5. Contact-sheet geometry, the focus crop, the source a plate --pick grades (the newest of its slugged stem), the
 *      grade's filter chain (natural keeps the picture's colour,
 *      night puts the median at 0.18, --strength 0 is the picture), the picture check (banned colours, the
 *      saturated floor, the set's match, steady text), file-type sniffing, key redaction. With ffmpeg on the
 *      PATH, real pixels: a vivid picture keeps its colour through natural; a daylight one reads as night.
 *   6. The CLI contract: --help, usage errors, exit codes. No test touches the network (fetch is replaced by a
 *      function that fails the run).
 *
 * Usage (from the skill root):  node scripts/test/assets.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, 'assets-fixtures');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/assets.test.mjs [--verbose]   (offline: hand-written responses in scripts/test/assets-fixtures)');
  process.exit(0);
}

// no network in these tests: any fetch fails the run
let fetched = 0;
globalThis.fetch = async (u) => { fetched++; throw new Error(`network used in an offline test: ${String(u).slice(0, 60)}`); };
const A = await import(pathToFileURL(path.join(HERE, '..', 'assets.mjs')).href);

let failed = 0; let passed = 0;
const ok = (cond, name, detail = '') => {
  if (cond) passed++; else failed++;
  if (!cond || verbose) console.log(`${cond ? 'pass' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, JSON.stringify(a) === JSON.stringify(b) ? '' : `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const throws = (fn, re, name) => { try { fn(); ok(false, name, 'did not throw'); } catch (e) { ok(re.test(e.message), name, re.test(e.message) ? '' : e.message); } };
const fx = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
const opts = (o = {}) => ({ kind: 'photo', limit: 8, minWidth: 0, orientation: null, allowCredit: false, width: 2400, res: 1080, ...o });

// ---------------------------------------------------------------- 1. licences
eq(['cc0', 'pdm', 'by', 'BY-SA', 'cc-by-nc-4.0', 'by-nd', 'by-nc-sa', 'by-nc-nd', 'sampling+', '', 'cc-by-4.0', 'publicdomain'].map(A.ccLicence),
  ['cc0', 'pd', 'by', 'by-sa', 'by-nc', 'by-nd', 'by-nc-sa', 'by-nc-nd', 'unknown', 'unknown', 'by', 'pd'], 'ccLicence maps codes, versions and marks');
eq(A.commonsLicence({ License: 'cc0', LicenseShortName: 'CC0' }).id, 'cc0', 'Commons CC0');
eq(A.commonsLicence({ License: 'pd', LicenseShortName: 'Public domain' }).id, 'pd', 'Commons public domain');
{ const r = A.commonsLicence({ License: 'PD-USGov-NASA', LicenseShortName: 'Public domain' }); ok(r.id === 'pd' && /United States/.test(r.notes.join(' ')), 'Commons PD-US keeps a "United States" note'); }
{ const r = A.commonsLicence({ License: '', LicenseShortName: 'No known copyright restrictions' }); ok(r.id === 'unknown' && /not a licence/.test(r.notes.join(' ')), '"no known copyright restrictions" is refused as unknown'); }
eq(A.commonsLicence({ License: 'cc-by-sa-4.0', LicenseShortName: 'CC BY-SA 4.0' }).id, 'by-sa', 'Commons CC BY-SA');
eq(A.commonsLicence({ License: 'cc-by-4.0', LicenseShortName: 'CC BY 4.0' }).id, 'by', 'Commons CC BY');
ok(/restrictions named/.test(A.commonsLicence({ License: 'cc0', LicenseShortName: 'CC0', Restrictions: 'personality' }).notes.join(' ')), 'Commons restrictions become a note');
eq(A.nasaLicence({ title: 'Aurora over Earth', description: 'Seen from orbit.' }).id, 'pd', 'NASA record: public domain');
eq(A.nasaLicence({ title: 'Comet', description: 'Image © 2019 J. Smith, used with permission' }).id, 'unknown', 'NASA record naming a third-party copyright is refused');
ok(/people/.test(A.nasaLicence({ title: 'Astronaut on a spacewalk', keywords: ['astronaut'] }).notes.join(' ')), 'NASA record with people carries the clearance note');
for (const id of A.NO_CREDIT) ok(A.licenceAllowed(id).ok && !A.LICENCES[id].credit, `${id} needs no credit and is allowed by default`);
ok(!A.licenceAllowed('by').ok && A.licenceAllowed('by', { allowCredit: true }).ok, 'CC BY only with --allow-credit');
for (const id of ['by-sa', 'by-nc', 'by-nd', 'by-nc-sa', 'by-nc-nd', 'mixkit-restricted', 'unknown', 'made-up']) {
  ok(!A.licenceAllowed(id, { allowCredit: true }).ok, `${id} refused even with --allow-credit`);
}
ok(/commercial/.test(A.licenceAllowed('by-nc').why) && /personal/.test(A.licenceAllowed('mixkit-restricted').why) && /share-alike/.test(A.licenceAllowed('by-sa').why), 'refusals say why');
ok(A.NO_CREDIT.every((id) => A.LICENCES[id].seen?.quote && /^https:/.test(A.LICENCES[id].seen.url)), 'every credit-free licence carries the licence as read (quote + page)');

// ---------------------------------------------------------------- 2. parsers on hand-written responses
{
  const items = A.parseOpenverse(fx('openverse-cc0.json'));
  ok(items.length >= 3 && items.every((it) => ['cc0', 'pd'].includes(it.licence) && it.image && it.page && it.ref.startsWith('openverse:')), 'Openverse: cc0/public-domain items with image, page and ref', `${items.length}`);
  ok(items.every((it) => /^Openverse \/ /.test(it.provider)), 'Openverse: the provider names the collection behind it');
  const mixed = A.parseOpenverse(fx('openverse-mixed.json'));
  eq(A.filterItems(mixed, opts()).keep.length, 0, 'Openverse mixed licences: nothing passes the default filter');
  const credit = A.filterItems(mixed, opts({ allowCredit: true })).keep;
  ok(credit.length >= 1 && credit.every((it) => it.licence === 'by'), '--allow-credit keeps CC BY only (never SA, NC, ND)', credit.map((x) => x.licence).join(','));
  const sk = A.filterItems(mixed, opts()).skipped;
  ok(sk.licence === mixed.length && Object.keys(sk.reasons).some((r) => /share-alike/.test(r)), 'refusals are counted with their reasons');
}
{
  const mixed = A.parseCommons(fx('commons-mixed.json'));
  const kept = A.filterItems(mixed, opts()).keep;
  ok(mixed.length >= 6 && kept.every((it) => ['cc0', 'pd'].includes(it.licence)) && kept.length < mixed.length, 'Commons: share-alike and CC BY files dropped by default', `${kept.length}/${mixed.length}`);
  const cc0 = A.parseCommons(fx('commons-cc0.json'));
  ok(cc0.length >= 3 && cc0.every((it) => it.licence === 'cc0' && /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//.test(it.image)), 'Commons (Cc-zero template search): all CC0 with a file URL');
  ok(cc0.every((it) => /\/500px-/.test(it.thumb)), 'Commons previews use the 500 px thumbnail step (originals too)', cc0.map((x) => x.thumb.slice(-24)).join(' '));
  const vid = A.parseCommons(fx('commons-video.json'), { kind: 'video', res: 1080 });
  ok(vid.length >= 1 && vid.every((it) => it.kind === 'video' && /\.(webm|mp4)$/.test(it.image)), 'Commons video: a playable rendition', vid.map((v) => v.image.slice(-12)).join(' '));
  ok(/ hastemplate:Cc-zero$/.test(new URL(A.commonsUrl('basalt', opts(), 'Cc-zero')).searchParams.get('gsrsearch')) && A.COMMONS_TEMPLATES.includes('PD-USGov'), 'Commons searches by credit-free licence templates');
}
{
  const items = A.parseNasaSearch(fx('nasa-image-search.json'), { query: 'aurora' });
  ok(items.length >= 2 && items.every((it) => it.licence === 'pd' && it.manifest && /images\.nasa\.gov\/details/.test(it.page)), 'NASA search: public domain, a manifest and a page');
  ok(A.parseNasaSearch(fx('nasa-image-search.json'), { query: 'volcano lava' }).length === 0, 'NASA search: records off the subject are dropped');
  const man = A.parseNasaManifest(fx('nasa-image-manifest.json'));
  ok(/~orig\.jpg$/.test(man.orig) && /~large\.jpg$/.test(man.large) && /~small\.jpg$/.test(man.small), 'NASA manifest: orig, large and small renditions');
  const vm = A.parseNasaManifest(fx('nasa-video-manifest.json'), 'video');
  const pick = A.pickRendition(vm.renditions.filter((r) => !r.orig), 1080);
  ok(/~large\.mp4$/.test(pick?.url || ''), 'NASA video: the 1080p rendition is picked at --res 1080', pick?.url?.slice(-14));
  ok(/~medium\.mp4$/.test(A.pickRendition(vm.renditions.filter((r) => !r.orig), 720)?.url || ''), 'NASA video: 720p at --res 720');
}
{
  const aic = A.parseAic(fx('aic-search.json'), { width: 1600 });
  ok(aic.length >= 2 && aic.every((it) => it.licence === 'cc0' && /\/full\/1600,\/0\/default\.jpg$/.test(it.image) && /\/full\/400,\//.test(it.thumb)), 'Art Institute: CC0, IIIF at the asked width, 400 px preview');
  ok(aic[0].width === 1600 && aic[0].full?.[0] === 3000 && aic[0].full?.[1] === 2000, 'Art Institute: the record promises the asked width and keeps the original size', JSON.stringify([aic[0].width, aic[0].full]));
  eq(A.aicWidths(2400, 4536), [2400, 1686, 843], 'AIC widths to try: the asked width, the 1686 px large size, the 843 px default');
  eq(A.aicWidths(2400, 1200), [1200, 843], 'AIC widths stay within the original');
  eq(A.aicWidths(1686, null), [1686, 843], 'AIC widths without a known original');
}
// AIC redirects a width it has not rendered to its 843 px default: the ladder is asked without following redirects
{
  const asked = [];
  const stub = (served) => async (url, init) => { asked.push(`${init?.redirect}:${url.match(/\/full\/(\d+),/)[1]}`); const w = Number(url.match(/\/full\/(\d+),/)[1]); return { status: served.includes(w) ? 200 : 307, body: null }; };
  const it = A.parseAic(fx('aic-search.json'), { width: 2400 })[0];
  const w = await A.aicServe(it, 2400, stub([1686, 843]));
  ok(w === 1686 && /\/full\/1686,\/0\/default\.jpg$/.test(it.image) && it.width === 1686 && it.height === Math.round((2000 * 1686) / 3000), 'AIC: a redirected 2400 falls back to the served 1686, image and size follow', `${w} ${it.image.slice(-30)} ${it.width}x${it.height}`);
  ok(asked.every((a) => a.startsWith('manual:')) && asked.join(' ') === 'manual:2400 manual:1686', 'AIC: each width is asked without following the redirect, largest first', asked.join(' '));
  const it2 = A.parseAic(fx('aic-search.json'), { width: 2400 })[0]; const before = it2.image;
  const none = await A.aicServe(it2, 2400, async () => { throw new Error('offline'); });
  ok(none === null && it2.image === before, 'AIC: no answer leaves the item as it was');
  ok(A.shortfall(843, 2400, 2400) && /843 px/.test(A.shortfall(843, 2400, 2400)) && A.shortfall(2400, 3000, 2400) === null && A.shortfall(1686, null, 2400) === null, 'a saved image narrower than promised is reported; one at the asked width or with no promise is not');
  const met = fx('met-objects.json').objects.map((o) => A.parseMetObject(o, {}));
  ok(met.length >= 1 && met.every((it) => it.licence === 'cc0' && it.image && it.thumb), 'The Met: CC0 objects with image and preview');
  eq(A.parseMetObject({ ...fx('met-objects.json').objects[0], isPublicDomain: false }, {}), null, 'The Met: a non-public-domain object is dropped');
}
{
  const list = A.parseMixkitList(fx('mixkit-list.json').html);
  ok(list.length >= 3 && list.every((it) => /^mixkit:\d+$/.test(it.ref) && /^https:\/\/mixkit\.co\/free-stock-video\//.test(it.page) && it.licence === 'unknown'), 'Mixkit grid: items with id and page, licence unread until the item page');
  ok(list.every((it) => /-thumb-720-0\.jpg$/.test(it.thumb)), 'Mixkit grid: 720 px previews for the sheet');
  const free = A.parseMixkitItem(fx('mixkit-item-free.json').html, '44370');
  ok(free.licence === 'mixkit-video' && free.duration === 30 && free.renditions.some((r) => r.h === 1080), 'Mixkit item: the free licence, its length and a 1080p rendition');
  const res = A.parseMixkitItem(fx('mixkit-item-restricted.json').html, '48525');
  ok(res.licence === 'mixkit-restricted' && !A.licenceAllowed(res.licence, { allowCredit: true }).ok, 'Mixkit item under the restricted licence is refused');
  const tall = A.parseMixkitItem('<a href="/license/#videoFree">l</a><span class="download-resolution">1080 x 1920</span>', '1', { known: 'https://assets.mixkit.co/videos/1/1-360.mp4' });
  ok(tall.renditions.length === 2 && tall.renditions.every((r) => r.h > r.w) && tall.renditions[1].h === 1920, 'Mixkit item: a portrait clip read from its download resolution', JSON.stringify(tall.renditions.map((r) => [r.w, r.h])));
  // the files as the page names them: a newer clip lives under active_storage/, and an address built from the id 403s
  eq(free.renditions.map((r) => r.url), ['720', '1080'].map((p) => `https://assets.mixkit.co/active_storage/video_items/44370/1700000000/44370-video-${p}.mp4`), "Mixkit item: renditions named after the page's own 720p file, never videos/<id>/<id>-<p>.mp4");
  eq(list.map((it) => it.image), list.map((it) => it.preview.replace('-360.mp4', '-720.mp4')), "Mixkit grid: the 720p file is named after the grid's own preview");
  eq(A.parseMixkitItem('<a href="/license/#videoFree">l</a><span class="download-resolution">1920 x 1080</span>', '7').renditions, [], 'Mixkit item: no file named on the page and none known: no rendition (never a guessed address)');
  const k4 = A.parseMixkitItem('"contentUrl":"https://assets.mixkit.co/videos/9/9-720.mp4" <i class="download-resolution">1080x720</i><i class="download-resolution">1920x1080</i><i class="download-resolution">4096x2160</i> type=2160p', '9');
  eq(k4.renditions.map((r) => [r.w, r.h]), [[1280, 720], [1920, 1080], [4096, 2160]], 'Mixkit item: the sizes the page offers (its 4K at the width it lists, its 720p at 16:9)');
  ok(free.seen && free.seen.quote === 'Example licence line, under the example free licence.' && /^\d{4}-\d{2}-\d{2}$/.test(free.seen.date) && free.seen.date === new Date().toISOString().slice(0, 10),
    'Mixkit item: the licence line beside the download, read today (a link whose attributes hold ">" too)', JSON.stringify(free.seen));
  const rec = A.recordEntry(A.item('mixkit', '44370', { kind: 'video', title: 'Waves', licence: free.licence, seen: { ...free.seen, url: 'https://mixkit.co/free-stock-video/example-44370/' } }), { file: 'v.mp4', sha256: 'd'.repeat(64), bytes: 1 });
  ok(rec.licence_seen.quote === free.seen.quote && rec.licence_seen.url.endsWith('-44370/') && rec.licence_seen.date === free.seen.date, "the record keeps the item page's licence line and the day it was read", JSON.stringify(rec.licence_seen));
}
{
  // a phrase Mixkit holds no page for: its words one at a time, ranked by the words a title carries; all failing throws
  const pages = { tide: [{ ref: 'mixkit:2', title: 'Tide pool with rocks' }, { ref: 'mixkit:3', title: 'Tide rising' }], pool: [{ ref: 'mixkit:1', title: 'Swimming pool' }, { ref: 'mixkit:2', title: 'Tide pool with rocks' }] };
  const got = await A.mixkitWords('tide pool rocks', async (w) => { if (!pages[w]) throw new Error('HTTP 404'); return pages[w]; });
  eq(got.map((it) => it.ref), ['mixkit:2', 'mixkit:3', 'mixkit:1'], 'Mixkit: a phrase with no page is searched word by word, the title with most words first');
  let why = '';
  try { await A.mixkitWords('tide pool', async () => { throw new Error('rate limited (HTTP 429)'); }); } catch (e) { why = e.message; }
  ok(/429/.test(why), 'Mixkit: when every word fails the search reports why (not "nothing usable")', why);
  const two = { sources: ['mixkit', 'coverr'] };
  ok(/no source answered.*429.*Wait a minute/.test(A.emptyHint(two, { mixkit: { found: 0, error: 'rate limited (HTTP 429)', skipped: {} }, coverr: { found: 0, error: 'HTTP 503', skipped: {} } })), 'an empty search where no source answered says so, not "use fewer words"');
  const dropped = A.emptyHint(two, { mixkit: { found: 6, skipped: { small: 4, licence: 2, reasons: {} } }, coverr: { found: 0, skipped: {} } });
  ok(/dropped/.test(dropped) && /--min-width/.test(dropped) && !/fewer words/.test(dropped), 'an empty search where everything was dropped names the drop, not the words', dropped);
  ok(/fewer words/.test(A.emptyHint(two, { mixkit: { found: 0, skipped: {} }, coverr: { found: 0, skipped: {} } })), "an empty search that found nothing asks for the subject's own words");
}
{
  const list = A.parseBurstList(fx('burst-list.json').html, { width: 2400 });
  eq(list.map((it) => it.ref), ['burst:example-barista-pours-milk', 'burst:example-desk-by-a-window'], 'Burst grid: one item per photo (a repeat and an img without a photo id are left out), the slug is the ref');
  ok(list.every((it) => it.licence === 'unknown' && /^https:\/\/burst\.shopify\.com\/photos\//.test(it.page) && /width=2400&/.test(it.image) && /width=500&/.test(it.thumb)), 'Burst grid: page, the asked width from the CDN, a 500 px preview; licence unread until the photo page');
  eq(list[1].title, 'example desk by a window', 'Burst grid: the alt text stands in for a missing title');
  const it = A.parseBurstItem(fx('burst-item.json').html);
  ok(it.licence === 'burst' && it.author === 'Example Person' && it.title === 'Example Barista Pours Milk' && A.licenceAllowed('burst').ok, 'Burst photo page: Burst Some Rights Reserved (no credit), photographer, title', JSON.stringify(it));
  const other = A.parseBurstItem(fx('burst-item-other.json').html);
  ok(other.licence === 'unknown' && other.licenceSlug === 'editorial-only' && !A.licenceAllowed(other.licence).ok, 'Burst photo page naming another licence: unknown, refused');
}
{
  const list = A.parseIsoList(fx('iso-list.json').html);
  eq(list.map((it) => it.ref), ['isorepublic:example-woman-reading', 'isorepublic:example-harbour-fog'], 'ISO Republic grid: photos only, one each');
  ok(list[0].image === 'https://isorepublic.com/wp-content/uploads/2024/01/example-woman-reading.jpg' && Math.abs(list[0].aspect - 2 / 3) < 1e-9 && list[0].title === 'Example Woman Reading', 'ISO Republic grid: the original upload from the thumbnail, the thumbnail\'s shape, the title');
  const p = A.parseIsoItem(fx('iso-item.json').html, 2400);
  ok(p.licence === 'cc0' && p.download === 'https://isorepublic.com/wp-content/uploads/2024/01/example-woman-reading.jpg' && p.rendition.w === 1365 && p.renditions.length === 3, 'ISO Republic page: CC0 stated, the download link, its own renditions only, the largest within the width', JSON.stringify(p.rendition));
  eq(A.isoPick({ ...p, rendition: { url: 'u-2048x1365.jpg', w: 2048, h: 1365 } }, 2400), { image: 'u-2048x1365.jpg', width: 2048, height: 1365 }, 'ISO Republic: a rendition of at least 1600 px within the width is taken');
  ok(A.isoPick({ ...p, rendition: { url: 'x-1024x683.jpg', w: 1024, h: 683 } }, 2400).image === p.download, 'ISO Republic: under 1600 px the original upload is taken');
  ok(A.parseIsoItem('<h1>x</h1>').licence === 'unknown', 'ISO Republic page without the CC0 line: unknown');
}
{
  const recs = A.coverrRecords(fx('coverr-page.json').html, { search: true });
  eq(recs.map((r) => r.id), ['AbcFree01', 'AbcPlus02', 'AbcGen003'], 'Coverr search: only the search hits, once each, nested ones too, never the promoted clips beside them');
  eq(A.coverrRecords(fx('coverr-page.json').html).map((r) => r.id).sort(), ['AbcFree01', 'AbcGen003', 'AbcPlus02', 'AbcPromo4'], 'Coverr clip page: every record (the lookup finds its clip by id)');
  const [free, plus, gen] = recs.map((r) => A.parseCoverrRecord(r, { res: 1080 }));
  ok(free.licence === 'coverr' && free.width === 1920 && /1080p\.mp4$/.test(free.image) && !free.renditions.some((r) => /2160p|original/.test(r.url)) && free.duration === 8.5 && free.fps === 25 && /360p\.mp4$/.test(free.preview), 'Coverr free clip: 1080p, never the Coverr+ 4K or the original, its length, fps and preview stream', JSON.stringify(free.renditions.map((r) => r.w)));
  ok(free.page === 'https://coverr.co/videos/example-hands-pouring-tea-abcfree01', 'Coverr clip page from its slug');
  ok(plus.licence === 'coverr-plus' && !A.licenceAllowed(plus.licence, { allowCredit: true }).ok, 'a Coverr+ clip is refused');
  ok(gen.ai === true && /AI-generated/.test(gen.notes.join(' ')), 'an AI-generated clip is flagged');
  const { keep, skipped } = A.filterItems([free, plus, gen], opts({ kind: 'video' }));
  ok(keep.length === 1 && keep[0] === free && skipped.licence === 1 && skipped.ai === 1, 'filter: the free clip stays; Coverr+ refused by licence, the generated clip dropped', JSON.stringify(skipped));
  eq(A.coverrRecords('<html>no state</html>'), [], 'a page without the state script: no records');
}
{
  const page = { pageid: 7, index: 1, title: 'File:Example.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Example.jpg', width: 4000, height: 3000, mime: 'image/jpeg', extmetadata: { ObjectName: { value: 'Tide pools at dawn title QS:P1476,en:"Tide pools at dawn"' }, LicenseShortName: { value: 'CC0' }, License: { value: 'cc0' } } }] };
  eq(A.parseCommons({ query: { pages: [page] } })[0]?.title, 'Tide pools at dawn', 'Commons: the structured-data tail is cut from the title');
}
{
  const ph = A.parsePexels(fx('pexels-photos.json'), opts());
  ok(ph.length === 2 && ph.every((it) => it.licence === 'pexels') && /w=2400/.test(ph[0].image), 'Pexels photos: licence and a 2400 px rendition URL');
  eq(A.filterItems(ph, opts({ minWidth: 1600 })).keep.map((x) => x.ref), ['pexels:1001'], 'Pexels: the 1200 px photo is dropped at --min-width 1600');
  const pv = A.parsePexels(fx('pexels-videos.json'), opts({ kind: 'video' }));
  ok(pv.length === 1 && pv[0].height === 1080 && /hd\.mp4$/.test(pv[0].image) && pv[0].fps === 25, 'Pexels video: the 1080p file at --res 1080 (not the 4K)');
  const un = A.parseUnsplash(fx('unsplash-search.json'), opts());
  ok(un.length === 1 && un[0].licence === 'unsplash' && /&w=2400/.test(un[0].image) && /download/.test(un[0].downloadLocation), 'Unsplash: licence, sized raw URL, the download event URL');
  const pi = A.parsePixabay(fx('pixabay-images.json'), opts());
  ok(pi[0].licence === 'pixabay' && /_1280\.jpg$/.test(pi[0].image), 'Pixabay images: licence and the large rendition');
  const pvv = A.parsePixabay(fx('pixabay-videos.json'), opts({ kind: 'video' }));
  ok(pvv[0].licence === 'pixabay' && pvv[0].height === 1080 && pvv[0].duration === 21, 'Pixabay video: the 1080p file and its length');
  ok(!/key=/.test(JSON.stringify([...ph, ...pv, ...un, ...pi, ...pvv])), 'no key in any parsed item');
}

// ---------------------------------------------------------------- 3. filtering, options, colour
{
  const mk = (id, w, h, title, lic = 'cc0', image = `https://x/${id}.jpg`) => A.item('openverse', id, { width: w, height: h, title, licence: lic, image });
  const items = [mk(1, 3000, 2000, 'Sea'), mk(2, 1000, 700, 'Small'), mk(3, 2000, 3000, 'Tall'), mk(4, 3000, 2000, 'Same'), mk(5, 3000, 2000, 'Same'), mk(6, 3000, 2000, 'Same'), mk(7, 3000, 2000, 'Dup', 'cc0', 'https://x/1.jpg'), mk(8, 3000, 2000, 'NC', 'by-nc')];
  const r = A.filterItems(items, opts({ minWidth: 1600, orientation: 'landscape' }));
  eq(r.keep.map((x) => x.ref.split(':')[1]), ['1', '4', '5'], 'filter: size, shape, two per near-identical title, one per file, licence');
  ok(r.skipped.small === 1 && r.skipped.shape === 1 && r.skipped.alike === 1 && r.skipped.licence === 1, 'filter: every drop is counted by reason');
  const il = A.interleave([[mk('a1', 1, 1, 'a'), mk('a2', 1, 1, 'b'), mk('a3', 1, 1, 'c')], [mk('b1', 1, 1, 'd')], [mk('c1', 1, 1, 'e'), mk('c2', 1, 1, 'f')]], 2);
  eq(il.map((x) => `${x.n}${x.ref.split(':')[1]}`), ['1a1', '2b1', '3c1', '4a2', '5c2'], 'interleave: one per source in turn, numbered from 1, at most `limit` each');
  eq(A.shapeOf(1920, 1080), 'landscape', 'shapeOf landscape');
  eq(A.shapeOf(1000, 1000), 'square', 'shapeOf square');
}
{
  const none = A.searchOptions({ kind: 'photo' }, {});
  eq(none.sources, ['burst', 'isorepublic', 'openverse', 'commons', 'nasa'], 'photo search without keys: the keyless photo sources (the stock photo sites first)');
  const keyed = A.searchOptions({ kind: 'photo' }, { PEXELS_API_KEY: 'k', UNSPLASH_ACCESS_KEY: 'k' });
  ok(keyed.sources.includes('pexels') && keyed.sources.includes('unsplash') && !keyed.sources.includes('pixabay'), 'keyed sources join when their key is in the environment');
  eq(A.searchOptions({ kind: 'video' }, {}).sources, ['coverr', 'commons', 'nasa', 'mixkit'], 'video search without keys: Coverr, Commons, NASA, Mixkit');
  const v = A.searchOptions({ kind: 'photo', people: true, clean: true, fit: '4:5' }, {});
  ok(v.people === true && v.clean && Math.abs(v.fit - 0.8) < 1e-9 && v.vet, 'vet options: --people, --clean, --fit 4:5, the thumbnail read on by default');
  ok(A.searchOptions({ kind: 'photo', 'no-people': true, 'no-vet': true }, {}).people === false && !A.searchOptions({ kind: 'photo', 'no-vet': true }, {}).vet && A.searchOptions({ kind: 'photo' }, {}).people === null, 'vet options: --no-people, --no-vet, people unasked = either');
  throws(() => A.searchOptions({ kind: 'photo', people: true, 'no-people': true }, {}), /choose one/, '--people with --no-people is a usage error');
  throws(() => A.searchOptions({ kind: 'photo', fit: 'tall' }, {}), /--fit/, 'a bad --fit is a usage error');
  eq(A.searchOptions({ kind: 'art' }, {}).sources, ['openverse', 'aic', 'met'], 'art search: Openverse, the two museums');
  throws(() => A.searchOptions({ kind: 'photo', source: 'pexels' }, {}), /PEXELS_API_KEY/, 'asking for a keyed source without its key is a usage error');
  throws(() => A.searchOptions({ kind: 'photo', source: 'mixkit' }, {}), /no photo search/, 'Mixkit has no photo search');
  const art = A.searchOptions({ kind: 'art', source: 'met,aic,commons' }, {});
  ok(art.sources.join() === 'met,aic' && art.skipped.length === 1 && /Wikimedia Commons has no art search/.test(art.skipped[0]), 'a named source without the kind is skipped with a note while others answer', JSON.stringify(art.skipped));
  ok(A.searchOptions({ kind: 'photo' }, {}).skipped.length === 0, 'no note when no source was named');
  throws(() => A.searchOptions({ kind: 'gif' }, {}), /--kind/, 'unknown --kind');
  throws(() => A.searchOptions({ kind: 'photo', source: 'flickrx' }, {}), /unknown source/, 'unknown source');
  eq(A.searchOptions({ kind: 'video' }, {}).minWidth, 1280, 'video defaults to 1280 px wide at least, photos to 1600');
  eq(A.searchQuery('basalt', 'texture'), 'basalt texture', 'texture search asks for the surface');
  eq(A.searchQuery('basalt macro', 'texture'), 'basalt macro', 'texture search keeps a query that already says so');
  ok(/aspect_ratio=wide/.test(A.openverseUrl('sea', opts({ orientation: 'landscape' }))) && /license=cc0%2Cpdm/.test(A.openverseUrl('sea', opts())), 'Openverse URL: credit-free licences and the shape');
  ok(/page_size=(1\d|20)\b/.test(A.openverseUrl('sea', opts({ limit: 30 }))), 'Openverse URL: at most 20 a page (its anonymous limit)');
  ok(/license=cc0%2Cpdm%2Cby/.test(A.openverseUrl('sea', opts({ allowCredit: true }))), 'Openverse URL with --allow-credit adds by');
}
{
  ok(A.colourOf('mono').mono && A.colourOf('teal').hue === 190 && A.colourOf('teal').pixabay === 'turquoise', 'colour names map to hues and native filters');
  const hex = A.colourOf('#2e8c9e');
  ok(Math.abs(hex.hue - 213) < 2 && hex.native === '2e8c9e', 'a #hex colour gives its OKLCH hue');
  throws(() => A.colourOf('purple'), /--colour/, 'a banned or unknown colour name is refused');
  const teal = Buffer.from(Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? 30 : i % 3 === 1 ? 140 : 160)));
  const grey = Buffer.from(Array.from({ length: 30 }, () => 128));
  ok(A.colourScore(teal, A.colourOf('teal')) === 1 && A.colourScore(grey, A.colourOf('teal')) === 0, 'colour score: a teal grid scores 1 for teal, a grey one 0');
  ok(A.colourScore(grey, A.colourOf('mono')) === 1, 'colour score: grey reads as mono');
}

// ---------------------------------------------------------------- 4. the private record
{
  const film = path.join(os.tmpdir(), `cinetic-assets-test-${process.pid}`);
  const sep = path.sep;
  eq(A.recordPath(path.join(film, 'public', 'assets')), path.join(film, 'assets', 'licences.json'), 'record path: <film>/public/assets -> <film>/assets/licences.json');
  eq(A.recordPath(path.join(film, 'public', 'assets', 'photos')), path.join(film, 'assets', 'licences.json'), 'record path: nested folders under public/ still go to <film>/assets');
  eq(A.recordPath(path.join(film, 'media')), path.join(film, 'media', 'licences.json'), 'record path: outside a public/ folder, next to the files');
  eq(A.recordPath(path.join(film, 'public', 'assets'), path.join(film, 'x.json')), path.join(film, 'x.json'), 'record path: --record overrides');
  eq(A.publicPath(path.join(film, 'public', 'assets', 'sea.jpg')), 'assets/sea.jpg', 'publicPath: what staticFile() takes');
  const it = A.item('commons', 123, { title: 'Basalt cliff', author: 'Someone', page: 'https://commons.wikimedia.org/wiki/File:x.jpg', image: 'https://upload.wikimedia.org/x.jpg', licence: 'cc0', width: 4000, height: 3000 });
  const e1 = A.recordEntry(it, { file: 'public/assets/basalt-cliff.jpg', sha256: 'a'.repeat(64), bytes: 1000, width: 2400, height: 1800 });
  ok(e1.credit_required === false && e1.credit === null && e1.shown_on_screen === false && e1.licence_id === 'cc0' && e1.licence_seen?.quote, 'record entry (cc0): no credit, never shown, the licence as read');
  ok(e1.page && e1.source === 'Wikimedia Commons' && e1.author === 'Someone' && e1.file_url && e1.width === 2400, 'record entry: source, author, page, file URL, real size');
  const e2 = A.recordEntry({ ...it, licence: 'by', licenceVersion: '4.0', kind: 'video' }, { file: 'public/assets/v.mp4', sha256: 'b'.repeat(64), bytes: 9, duration: 6, fps: 25 });
  ok(e2.credit_required && /^Footage: "Basalt cliff" by Someone, CC BY 4\.0, via Wikimedia Commons$/.test(e2.credit) && e2.duration === 6 && e2.fps === 25, 'record entry (CC BY, --allow-credit): the credit line, video length and rate', e2.credit);
  const e3 = A.recordEntry(A.item('nasa', 'x1', { title: 'Coast from orbit', licence: 'pd', page: 'https://images.nasa.gov/details/x1' }), { file: 'a.jpg', sha256: 'c'.repeat(64), bytes: 1 });
  ok(/nasa\.gov/.test(e3.licence_seen.url) && /insignia/.test(e3.limits) && e3.credit_required === false, 'record entry (NASA): NASA\'s own terms as read, the no-insignia limit, no credit');
  const rec = A.recordPath(path.join(film, 'public', 'assets'));
  A.writeRecord(rec, e1);
  A.writeRecord(rec, { ...e1, bytes: 2000 });
  A.writeRecord(rec, e2);
  const doc = A.readRecord(rec);
  ok(doc.items.length === 2 && doc.items[0].bytes === 2000 && /Never shown on screen/.test(doc.about), 'record file: one entry per file (replaced), the about line');
  ok(!fs.existsSync(path.join(film, 'public', 'assets', 'licences.json')), 'record file is not written inside public/');
  eq(A.readRecord(path.join(film, 'missing.json')).items, [], 'a missing record reads as empty');
  eq(A.resolveRefs(['#2', 'nasa:abc'], { items: [{ n: 1, ref: 'mixkit:1' }, { n: 2, ref: 'commons:9' }] }).map((r) => r.ref), ['commons:9', 'nasa:abc'], '#n refs resolve against the results file');
  throws(() => A.resolveRefs(['#9'], { items: [] }), /not in the results/, 'an unknown #n is a usage error');
  fs.rmSync(film, { recursive: true, force: true });
  void sep;
}

// ---------------------------------------------------------------- 5. sheet, crop, grade, files
{
  const L = A.sheetLayout(10, { cols: 4, cellW: 400 });
  ok(L.cols === 4 && L.rows === 3 && L.cellH === 225 && L.cells.length === 10, 'sheet: 10 cells in 4 columns = 3 rows of 400 x 225');
  ok(L.W % 2 === 0 && L.H % 2 === 0 && L.W === 12 + 4 * 412 && L.cells[5].x === 12 + 412 && L.cells[5].y === 12 + 225 + 30 + 12, 'sheet: even size, gutters and label strips in the positions', `${L.W}x${L.H} ${L.cells[5].x},${L.cells[5].y}`);
  ok(L.cells.every((c) => c.x + c.w <= L.W && c.labelY + 20 <= L.H), 'sheet: every cell and label inside the canvas');
  const one = A.sheetLayout(1, { cols: 4 });
  ok(one.cols === 1 && one.rows === 1, 'sheet: one cell is one column');
  ok(A.sheetLayout(0).cells.length === 0, 'sheet: no cells, no crash');
  eq(A.scanTimes(10, 3).map((t) => +t.toFixed(2)), [0.3, 5, 9.7], 'sheet --scan: frames spread across a clip with 0.3 s margins');
  eq(A.scanTimes(10, 1), [1], 'sheet: one frame of a clip is at 1 s (the middle of a short one)');
}
{
  eq(A.focusCrop(4000, 3000, 16 / 9, 0.5, 0.5), { x: 0, y: 375, w: 4000, h: 2250 }, 'focus crop: 16:9 out of 4:3, centred');
  eq(A.focusCrop(4000, 3000, 16 / 9, 0.5, 0), { x: 0, y: 0, w: 4000, h: 2250 }, 'focus crop: a focus at the top clamps inside');
  eq(A.focusCrop(3000, 3000, 16 / 9, 0.9, 0.5), { x: 0, y: 656, w: 3000, h: 1688 }, 'focus crop: square source, width-bound');
  const z = A.focusCrop(4000, 2250, 16 / 9, 0.8, 0.2, 2);
  ok(z.w === 2000 && z.h === 1124 && z.x === 2000 && z.y === 0, 'focus crop: x2 zoom toward the focus, clamped', JSON.stringify(z));
}
{
  // plate --pick grades the source get just wrote: get slugs --name (nightCity -> nightcity-source) and keeps an earlier
  // pick of another picture beside the new one (sky-source.jpg, then sky-source-2.jpg)
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-plate-'));
  const put = (f, s) => { fs.writeFileSync(path.join(d, f), 'x'); fs.utimesSync(path.join(d, f), s, s); };
  put('nightcity-source.jpg', 1000);
  put('sky-source.jpg', 1000);
  put('sky-source-2.jpg', 2000);
  put('sky.jpg', 3000);
  put('sky-soft.jpg', 3000);
  const base = (f) => (f ? path.basename(f) : null);
  ok(base(A.plateSource(d, 'nightCity')) === 'nightcity-source.jpg', 'plate --pick: a camel-case preset finds the source get saved in lower case', base(A.plateSource(d, 'nightCity')));
  ok(base(A.plateSource(d, 'sky')) === 'sky-source-2.jpg', 'plate --pick: a second pick grades the new source, never the earlier one', base(A.plateSource(d, 'sky')));
  ok(A.plateSource(d, 'clouds') === null, 'plate --pick: no source of that preset, none found');
  fs.rmSync(d, { recursive: true, force: true });
}
{
  throws(() => A.gradeFilter('sepia'), /unknown look/, 'grade: unknown look is a usage error');
  const d = A.duotoneCurves(213, [0.2, 0.08], [0.96, 0.03]);
  const [sL, sC, sH] = A.hexToOklch(d.shadowHex);
  ok(Math.abs(sL - 0.2) < 0.02 && sC <= 0.085 && sC > 0.02 && Math.abs(sH - 213) < 8, 'duotone: the shadow sits at the asked L and hue, chroma cut to the sRGB gamut', `${sL.toFixed(3)} ${sC.toFixed(3)} ${sH.toFixed(1)}`);
  ok(d.r.split(' ').length === 5 && /^0\//.test(d.r) && /^1\//.test(d.r.split(' ')[4]), 'duotone: five knots per channel from 0 to 1');
  const m = A.duotoneCurves(213, A.LOOKS.tint.shadow, A.LOOKS.tint.highlight, A.LOOKS.tint.mid);
  const mid = [m.r, m.g, m.b].map((c) => Number(c.split(' ')[2].split('/')[1]) * 255);
  ok(A.rgbToOklch(...mid)[1] >= 0.07, 'tint look: the mid-tones keep colour mass (C >= .07 at the ramp\'s middle; the picture floor counts C >= .06)', A.rgbToOklch(...mid)[1].toFixed(3));
  const crop = A.focusCrop(3000, 2000, 16 / 9, 0.5, 0.5);
  const tint = A.gradeFilter('tint', { accent: '#2e8c9e', stats: { lo: 0.12, hi: 0.8, sat: 0.2 }, crop, width: 2400 });
  ok(tint.startsWith(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=2400:-2`) && /split\[a\]\[b\]/.test(tint) && /blend=all_mode=normal:all_opacity=0\.3/.test(tint), 'grade tint: crop, scale, the photo on top at 30 % over the duotone');
  ok(/colorbalance=/.test(A.gradeFilter('matte', { accent: '#2e8c9e' })) && /eq=saturation=/.test(A.gradeFilter('matte', { accent: '#2e8c9e' })), 'grade matte: saturation and a split-tone shadow push');
  // the split-tone hue is apart from the accent: a red accent must not redden celadon shadows
  const cb = (o) => A.gradeFilter('natural', o).match(/colorbalance=[^,]+/)[0];
  const rs = (s) => Number(s.match(/rs=(-?[\d.]+)/)[1]); const bs = (s) => Number(s.match(/bs=(-?[\d.]+)/)[1]);
  ok(cb({ accent: '#e9504d' }) === cb({ accent: '#2e8c9e' }) && cb({}) === cb({ accent: '#e9504d' }), 'split tone: the accent does not move the shadows (natural, red or teal accent)');
  ok(rs(cb({})) < 0 && bs(cb({})) >= 0, 'split tone: cool by default (shadows lose red, keep blue)', cb({}));
  const warm = cb({ splitHue: A.hueOf('#e9504d') });
  ok(rs(warm) > 0 && warm !== cb({}) && cb({ splitHue: 213 }) === cb({}), '--split-hue moves the shadows (a #hex or degrees; 213 is the default)', warm);
  ok(A.hueOf('240') === 240 && Math.abs(A.hueOf('#2f7d8c') - A.SPLIT_HUE) < 1, 'hueOf reads degrees and #hex; SPLIT_HUE is the hue of #2f7d8c');
  throws(() => A.hueOf('teal'), /--split-hue/, 'a --split-hue that is not degrees or #hex');
  throws(() => A.hueOf('400'), /--split-hue/, 'a --split-hue above 360');
  const v = A.gradeFilter('duotone', { accent: '#2e8c9e', video: true, speed: 0.5 });
  ok(/setpts=PTS\/0\.5/.test(v) && /allf=t\+u/.test(v) && /format=yuv420p$/.test(v), 'grade video: speed, temporal grain, yuv420p');
  ok(!/noise=/.test(A.gradeFilter('silver', { grain: 0 })), 'grade: --grain 0 removes the grain');
  const flat = A.exposureMap({ lo: 0.14, hi: 0.38 }, A.LOOKS.tint);
  ok(flat.slope <= 1.45 + 1e-9 && flat.hi - flat.lo <= 1.45 * 0.24 + 1e-9, 'exposure: a flat source is stretched at most x1.45', `slope ${flat.slope.toFixed(2)}`);
  const hard = A.exposureMap({ lo: 0.01, hi: 0.99 }, A.LOOKS.tint);
  ok(hard.slope >= 1 / 1.3 - 1e-9 && flat.slope <= 1.3 + 1e-9, 'exposure: never stretched or flattened past x1.3', `${flat.slope.toFixed(3)} ${hard.slope.toFixed(3)}`);
  const bright = A.exposureMap({ lo: 0.19, hi: 0.99 }, A.LOOKS.natural); const dark = A.exposureMap({ lo: 0.04, hi: 0.38 }, A.LOOKS.natural);
  ok((bright.lo + bright.hi) / 2 > 0.53 && (dark.lo + dark.hi) / 2 < 0.3, 'natural keeps a bright still bright and a night one dark (re-centred a quarter of the way)', `${((bright.lo + bright.hi) / 2).toFixed(2)} ${((dark.lo + dark.hi) / 2).toFixed(2)}`);
  const bc = A.gradeFilter('natural', { stats: { lo: 0.19, hi: 0.99, sat: 0.2 } }).match(/curves=all='([^']+)'/)[1].split(' ').map((q) => q.split('/').map(Number));
  const slopes = bc.slice(1).map((q, i) => (q[1] - bc[i][1]) / (q[0] - bc[i][0]));
  ok(Math.max(...slopes) / Math.min(...slopes.filter((v) => v > 0)) < 1.6, 'natural on a bright still: the curve stays one line to the ends (no crushed shadows, no clipped top)', bc.map((q) => q.join('/')).join(' '));
  ok(A.satFactor({ sat: 0.02 }, 1, 1) === 1.25 && A.satFactor({ sat: 0.9 }, 1, 1) === 0.25 && A.satFactor(null, 0.55) === 0.55, 'saturation factor: bounded 0.25-1.25, the look\'s own without stats');
}
// the film's look is natural; one-hue washes are one-shot devices; a graded set is measured
{
  ok(Object.keys(A.LOOKS)[0] === 'natural', 'natural is the first look (and the grade default)');
  ok(['tint', 'duotone', 'deep'].every((k) => A.LOOKS[k].device) && ['natural', 'matte', 'silver', 'night'].every((k) => !A.LOOKS[k].device), 'tint, duotone and deep are marked as one-shot device looks; natural, matte, silver and night are whole-film looks');
  const nat = A.gradeFilter('natural', { accent: '#2e8c9e', stats: { lo: 0.1, hi: 0.8, sat: 0.2 } });
  ok(!/eq=saturation=/.test(nat) && /vibrance=intensity=-0\.1(,|$)/.test(nat), 'natural keeps the picture\'s own colour (no saturation change) and only holds the strongest back a little', nat);
  const vivid = Number((A.gradeFilter('natural', { stats: { lo: 0.1, hi: 0.8, sat: 0.6 } }).match(/eq=saturation=([\d.]+)/) || [0, 1])[1]);
  ok(vivid >= 0.8 && vivid < 1 && A.keepFactor({ sat: 0.3 }) === 1, 'natural on a very vivid picture pulls its colour down at most to x0.8', `${vivid}`);
  const c07 = Number(A.gradeFilter('natural', { stats: { lo: 0.1, hi: 0.8, sat: 0.2 }, colour: 0.7 }).match(/eq=saturation=([\d.]+)/)[1]);
  ok(Math.abs(c07 - 0.7) < 1e-9, '--chroma scales the colour after the look', `${c07}`);
  const raw = A.gradeFilter('matte', { stats: { lo: 0.1, hi: 0.8, sat: 0.2, med: 0.4 }, strength: 0 });
  ok(!/curves=|eq=|vibrance=|colorbalance=|noise=|huesaturation=/.test(raw), '--strength 0 is the picture as it is (only crop, scale and format)', raw);
  const m1 = Number(A.gradeFilter('matte', { stats: { lo: 0.1, hi: 0.8, sat: 0.2 } }).match(/eq=saturation=([\d.]+)/)[1]);
  const m05 = Number(A.gradeFilter('matte', { stats: { lo: 0.1, hi: 0.8, sat: 0.2 }, strength: 0.5 }).match(/eq=saturation=([\d.]+)/)[1]);
  ok(m05 > m1 && m05 < 1 && Math.abs(m05 - (1 + (m1 - 1) / 2)) < 0.002, '--strength 0.5 goes half way from the picture toward the look', `${m1} -> ${m05}`);
  // night: the median luma to 0.18 through the exposure line and a gamma, warm colours drained
  const nightAt = (st, o = {}) => {
    const vf = A.gradeFilter('night', { stats: st, ...o });
    const pts = vf.match(/curves=all='([^']+)'/)[1].split(' ').map((q) => q.split('/').map(Number));
    const lin = (x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return pts[i - 1][1] + ((x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])) * (pts[i][1] - pts[i - 1][1]); return pts[pts.length - 1][1]; };
    const gm = vf.match(/eq=gamma=([\d.]+)/); const g = gm ? 1 / Number(gm[1]) : 1;
    return { vf, med: lin(st.med) ** g };
  };
  const day = nightAt({ lo: 0.2, hi: 0.92, sat: 0.3, med: 0.56 }); const dim = nightAt({ lo: 0.02, hi: 0.3, sat: 0.2, med: 0.09 });
  ok(Math.abs(day.med - 0.18) < 0.01, 'night: a daylight picture\'s median luma lands at about 0.18', day.med.toFixed(3));
  ok(dim.med >= 0.09 && dim.med <= 0.19, 'night: a dark picture is not crushed (its median is kept or lifted toward 0.18)', dim.med.toFixed(3));
  ok(/huesaturation=saturation=-0\.8:colors=r\+y/.test(day.vf) && !/huesaturation/.test(nightAt({ lo: 0.2, hi: 0.92, sat: 0.3, med: 0.56 }, { hueSat: false }).vf), 'night drains reds and yellows (orange skies, tan wood); without huesaturation a plain desaturation', day.vf);
  ok(Math.abs(A.medianGamma(0.5, 0.18) - Math.log(0.18) / Math.log(0.5)) < 1e-9 && A.medianGamma(0.99) === 2.8 && A.medianGamma(0.01) === 0.7, 'medianGamma: the exponent for the target, held to 0.7-2.8');
  const tintKeep = A.gradeFilter('tint', { accent: '#2e8c9e', stats: { lo: 0.1, hi: 0.8, sat: 0.2 }, colour: 0.5 });
  ok(/split\[a\]\[b\]/.test(tintKeep), 'a device look still grades when asked for (one shot)');
  // pixels: a neutral grey, a strong teal (the accent's hue), a strong red
  const px = (rgb, n) => Buffer.from(Array.from({ length: n }, () => rgb).flat());
  const grey = px([120, 122, 121], 60); const teal = px([40, 150, 165], 30); const red = px([220, 60, 50], 10);
  const sh = A.colourShares(Buffer.concat([grey, teal, red]), '#2e8c9e');
  ok(Math.abs(sh.neutral - 0.6) < 1e-9 && Math.abs(sh.saturated - 0.4) < 1e-9 && Math.abs(sh.accent - 0.3) < 1e-9, 'colour shares: neutral (C < .03), saturated (C >= .06) and accent-hued pixels counted apart', JSON.stringify(sh));
  ok(A.colourShares(Buffer.alloc(0)).neutral === 0, 'colour shares of an empty buffer are zero, not NaN');
  const wash = A.pictureVerdict([{ neutral: 0.02, saturated: 0.8, accent: 0.6 }, { neutral: 0.05, saturated: 0.7, accent: 0.5 }]);
  ok(!wash.ok && wash.notes.length === 3 && /matte/.test(wash.notes[0]) && /--chroma/.test(wash.notes[1]) && !wash.notes.some((n) => /--strength/.test(n)), 'a one-hue wash fails the neutral floor and gets all three notes (matte, --chroma; never --strength, which now means how far toward the look)', JSON.stringify(wash.notes.map((n) => n.slice(0, 40))));
  const px1 = (rgb) => A.rgbToOklch(...rgb);
  ok(A.bannedRegion(...px1([210, 120, 40])) && A.bannedRegion(...px1([150, 70, 200])) && A.bannedRegion(...px1([225, 205, 175])), 'banned regions: orange, violet and a cream are banned (look-audit\'s numbers)');
  ok(!A.bannedRegion(...px1([40, 150, 165])) && !A.bannedRegion(...px1([128, 128, 128])) && !A.bannedRegion(...px1([220, 60, 50])), 'banned regions: a teal, a grey and a red are not');
  const shB = A.colourShares(Buffer.concat([px([128, 128, 128], 95), px([210, 120, 40], 5)]));
  ok(Math.abs(shB.banned - 0.05) < 1e-9 && shB.L > 0.55 && shB.L < 0.65 && shB.C > 0, 'colour shares: banned share, median lightness and mean chroma', JSON.stringify(shB));
  const banF = [{ neutral: 0.6, saturated: 0.1, accent: 0, banned: 0.012, file: 'bus.jpg' }, { neutral: 0.6, saturated: 0.1, accent: 0, banned: 0 }];
  const banV = A.pictureVerdict(banF);
  ok(!banV.ok && banV.banned === 1 && /bus\.jpg/.test(banV.notes.join(' ')) && A.pictureVerdict(banF, { allowBanned: true }).ok, 'a banned colour on 0.5 % of a frame fails the check (the film\'s banned-hue test); --brand-supplied lets the brand\'s own pass', banV.notes[0]?.slice(0, 80));
  // natural tones: skin, hair and wood are the world's colour in a picture, never a banned region; a saturated orange object still is
  ok(A.naturalTone(...px1([224, 172, 138])) && A.naturalTone(...px1([107, 68, 48])) && A.naturalTone(...px1([180, 138, 94])), 'natural tones: light skin, dark skin, tan wood');
  ok(A.naturalTone(...px1([38, 40, 92])) && !A.naturalTone(...px1([160, 110, 220])), 'natural tones: a navy shadow is natural, a lit violet is not');
  ok(!A.naturalTone(...px1([232, 112, 26])) && !A.naturalTone(...px1([150, 70, 200])) && !A.naturalTone(...px1([225, 215, 150])) && !A.naturalTone(...px1([40, 150, 165])), 'not natural: a saturated orange, a violet, a cream-yellow, a teal');
  ok(A.naturalTone(...px1([205, 195, 150])) && A.naturalTone(...px1([240, 214, 180])) && A.naturalTone(0.62, 0.11, 92) && A.naturalTone(...px1([200, 190, 215])) && A.naturalTone(...px1([120, 100, 150])),
    'natural tones: light wood (hue 97), a skin highlight, sunlit olive foliage (hue 92, C .11), a pale lavender shirt and a dusk sky');
  ok(!A.naturalTone(...px1([230, 200, 40])) && !A.naturalTone(0.86, 0.09, 100) && !A.naturalTone(0.64, 0.165, 303), 'not natural: a saturated yellow, a cream-yellow field (L .86, C .09) and a lit violet still count');
  const skin = A.colourShares(Buffer.concat([px([128, 128, 128], 60), px([224, 172, 138], 30), px([107, 68, 48], 10)]));
  ok(skin.banned === 0 && Math.abs(skin.natural - 0.4) < 1e-9 && A.pictureVerdict([{ ...skin, file: 'portrait.jpg' }]).banned === 0, 'a portrait\'s skin is natural colour: no banned frame', JSON.stringify(skin));
  const bus = A.colourShares(Buffer.concat([px([128, 128, 128], 95), px([232, 112, 26], 5)]));
  ok(Math.abs(bus.banned - 0.05) < 1e-9 && bus.natural === 0, 'a saturated orange object still counts as a banned region', JSON.stringify(bus));
  // the vet
  const rec = (o) => ({ ref: 'x:1', source: 'burst', title: '', tags: [], ...o });
  ok(A.peopleWords(rec({ title: 'Woman reading by a window' })) && A.peopleWords(rec({ tags: ['hands', 'clay'] })) && !A.peopleWords(rec({ title: 'Harbour in fog' })), 'people from the record\'s words (title, tags)');
  ok(A.textWords(rec({ title: 'Neon sign on a wall' })) && !A.textWords(rec({ title: 'Quiet street at dawn' })), 'text from the record\'s words');
  const read = (o) => ({ faces: null, face: 0, lines: [], lap: 300, ...o });
  ok(A.vetItem(rec({ title: 'Harbour' }), read({ faces: 2 })).people && A.vetItem(rec({ title: 'Harbour' }), read({ faces: 2 })).faces === 2, 'a detected face marks people even when the words do not');
  ok(A.vetItem(rec({ title: 'Harbour' }), read({ lines: [[10, 10, 200, 20]] })).textLines === 1 && A.vetItem(rec({ title: 'Harbour' }), read({ lines: [[10, 10, 20, 20]] })).textLines === 0, 'a steady text line (wide, or lines on one baseline) marks text; a lone square is not text');
  ok(A.vetItem(rec({}), read({ lap: 20 })).soft && !A.vetItem(rec({}), read({ lap: 400 })).soft && !A.vetItem(rec({}), null).soft, 'soft under the Laplacian floor; nothing read is not soft');
  const P = A.vetItem(rec({ title: 'Barista smiling' }), null); const N = A.vetItem(rec({ title: 'Kiln at night' }), null); const T = A.vetItem(rec({ title: 'Shop sign' }), null);
  ok(A.vetKeeps(P, { people: true }) && !A.vetKeeps(N, { people: true }) && !A.vetKeeps(P, { people: false }) && A.vetKeeps(N, { people: false }) && A.vetKeeps(N, { people: null }), '--people keeps people, --no-people drops them, unasked keeps both');
  ok(!A.vetKeeps(T, { people: null, clean: true }) && A.vetKeeps(T, { people: null, clean: false }), '--clean drops text, signs and logos');
  eq([A.fitWidth(3000, 2000, 0.8), A.fitWidth(1200, 3000, 0.8)], [1600, 1200], 'fitWidth: the width kept after a crop to 4:5');
  const fitK = A.filterItems([{ ref: 'a:1', title: 'wide', image: 'a', width: 3000, height: 1800, licence: 'cc0' }, { ref: 'a:2', title: 'tall', image: 'b', width: 2000, height: 3000, licence: 'cc0' }], opts({ minWidth: 1600, fit: 0.8 }));
  ok(fitK.keep.length === 1 && fitK.keep[0].ref === 'a:2' && fitK.skipped.fit === 1, 'filter --fit 4:5 at 1600 px: a 3000x1800 crops to 1440 wide and is dropped, a 2000x3000 stays', JSON.stringify(fitK.skipped));
  ok(/^\{ src: staticFile\('assets\/a\.jpg'\), w: 2400, h: 1600 \}/.test(A.srcLine('assets/a.jpg', { width: 2400, height: 1600 })) && A.srcLine('assets/c.mp4', { width: 1920, height: 1080, fps: 25, duration: 6.004 }, 'video') === "{ src: staticFile('assets/c.mp4'), w: 1920, h: 1080, fps: 25, dur: 6 }", 'get prints the source line the kit takes');
  const greySet = A.pictureVerdict([{ neutral: 0.9, saturated: 0.01, accent: 0 }, { neutral: 0.8, saturated: 0.02, accent: 0 }]);
  ok(greySet.ok && greySet.notes.length === 1 && /saturated floor/.test(greySet.notes[0]), 'a grey set passes with a note: under the film\'s saturated floor (4.5 %)', greySet.notes[0]?.slice(0, 60));
  const outl = A.setOutliers([{ file: 'a', L: 0.5, C: 0.05 }, { file: 'b', L: 0.55, C: 0.06 }, { file: 'c', L: 0.52, C: 0.05 }, { file: 'night.jpg', L: 0.15, C: 0.05 }, { file: 'neon.jpg', L: 0.5, C: 0.2 }]);
  ok(outl.length === 2 && outl[0].file === 'night.jpg' && /darker/.test(outl[0].why) && /more colour/.test(outl[1].why), 'set match: a much darker picture and a much more colourful one are outliers', JSON.stringify(outl));
  ok(A.setOutliers([{ file: 'a', L: 0.1, C: 0.1 }, { file: 'b', L: 0.9, C: 0.01 }]).length === 0, 'set match: two pictures are no set to measure');
  const dayArc = [0.91, 0.88, 0.86, 0.55, 0.5, 0.52, 0.2, 0.19, 0.17].map((L, i) => ({ file: `t${i}`, L, C: 0.05 }));
  const dayOut = A.setOutliers(dayArc);
  const arcOut = A.setOutliers(dayArc, { arc: true });
  const arcNeon = A.setOutliers([...dayArc, { file: 'neon-night.jpg', L: 0.18, C: 0.2 }], { arc: true });
  ok(dayOut.length >= 3 && arcOut.length === 0 && arcNeon.length === 1 && arcNeon[0].file === 'neon-night.jpg' && /in its light/.test(arcNeon[0].why),
    'set match --arc: a day from morning to night is one shoot; a night picture far more colourful than the other night pictures is not', `${dayOut.length} / ${arcOut.length} / ${JSON.stringify(arcNeon)}`);
  const sign = [[[40, 50, 200, 30]], [[42, 51, 198, 29]], [[300, 200, 80, 30]]];
  ok(A.steadyText(sign).length === 2 && A.steadyText([[[10, 10, 60, 30]], [[200, 120, 60, 30]], [[400, 220, 60, 30]]]).length === 0, 'steady text: a line in the same place in two frames of a clip counts; one that moves does not');
  ok(A.steadyText([[[10, 100, 90, 20], [120, 102, 60, 19]]]).length === 2 && A.steadyText([[[10, 100, 30, 20]]]).length === 0 && A.steadyText([[[10, 100, 120, 20]]]).length === 1, 'steady text in a still: two lines on one baseline, or one at least 4 x as wide as tall');
  const good = A.pictureVerdict([{ neutral: 0.6, saturated: 0.1, accent: 0.01 }, { neutral: 0.4, saturated: 0.55, accent: 0.02 }, { neutral: 0.7, saturated: 0.05, accent: 0 }]);
  ok(good.ok && Math.abs(good.neutral - 17 / 30) < 1e-9 && Math.abs(good.satFrames - 1 / 3) < 1e-9 && good.notes.length === 0, 'a natural set passes: mean neutral, the share of frames over half saturated', JSON.stringify(good));
  ok(A.pictureVerdict([{ neutral: 0.5, saturated: 0.2, accent: 0.2 }]).ok && A.pictureVerdict([{ neutral: 0.5, saturated: 0.2, accent: 0.2 }]).notes.length === 1, 'only the neutral floor fails; the accent ceiling is a note');
  ok(A.PICTURE.minNeutral === 0.3 && A.PICTURE.saturatedC === 0.06, 'the picture check uses the look audit\'s saturation line and a 30 % neutral floor');
  const enc = A.videoEncode({ scrub: true }).join(' ');
  ok(/-g 1/.test(enc) && /-bf 0/.test(enc) && !/-g /.test(A.videoEncode().join(' ')), '--scrub encodes every frame as a key frame with no reordered frames; the default keeps a normal group', enc);
}
{
  const png = Buffer.alloc(32); png[0] = 0x89; png.write('PNG', 1, 'ascii'); png.writeUInt32BE(2400, 16); png.writeUInt32BE(1350, 20);
  eq(A.sniff(png), { ext: 'png', media: 'image' }, 'sniff PNG');
  eq(A.dims(png), { w: 2400, h: 1350 }, 'PNG size from its header');
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x05, 0x46, 0x09, 0x60, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  eq(A.sniff(jpg), { ext: 'jpg', media: 'image' }, 'sniff JPEG');
  eq(A.dims(jpg), { w: 2400, h: 1350 }, 'JPEG size from its SOF marker');
  const mp4 = Buffer.alloc(16); mp4.write('ftypisom', 4, 'ascii');
  eq(A.sniff(mp4), { ext: 'mp4', media: 'video' }, 'sniff MP4');
  const avif = Buffer.alloc(16); avif.write('ftypavif', 4, 'ascii');
  eq(A.sniff(avif), { ext: 'avif', media: 'image' }, 'sniff AVIF is an image, not a video');
  eq(A.sniff(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])), { ext: 'webm', media: 'video' }, 'sniff WebM');
  eq(A.sniff(Buffer.from('<!doctype html><html>')), null, 'an HTML error page is not an image');
}
{
  const s = A.redact('https://pixabay.com/api/?key=SECRET123&q=sea and Authorization: Client-ID ABCDEF');
  ok(!/SECRET123|ABCDEF/.test(s) && /key=<hidden>/.test(s), 'keys never reach a message');
  ok(A.LICENCES.pexels.limits && A.LICENCES['mixkit-video'].limits, 'each stock licence records its limits');
}

// ---------------------------------------------------------------- 6. CLI contract (no network)
{
  const log = console.log; const err = console.error; let out = '';
  console.log = (...a) => { out += `${a.join(' ')}\n`; }; console.error = (...a) => { out += `${a.join(' ')}\n`; };
  const help = await A.main(['--help']);
  const helpOut = out; out = '';
  const none = await A.main([]);
  const bad = await A.main(['search', '--bogus']);
  const noq = await A.main(['search']);
  const noTo = await A.main(['get', 'commons:1']);
  const badLook = await A.main(['grade', HERE, '--look', 'sepia']);
  const noCheck = await A.main(['check']);
  const badAccent = await A.main(['check', HERE, '--accent', 'teal']);
  const looksOut = (() => { out = ''; return A.main(['looks']); })();
  const looksCode = await looksOut;
  const looksText = out;
  console.log = log; console.error = err;
  ok(noCheck === 2 && badAccent === 2, 'check without files, or with a non-hex accent, is a usage error', `${noCheck} ${badAccent}`);
  ok(looksCode === 0 && /natural \(the default\)/.test(looksText) && !/--look tint/.test(looksText) && /one shot/.test(looksText), 'looks names natural as the default and keeps tint for one shot (no tint example)');
  ok(help === 0 && /search/.test(helpOut) && /--allow-credit/.test(helpOut) && /PEXELS_API_KEY/.test(helpOut), '--help prints the commands, the licence switch and the keys; exit 0');
  ok(none === 2 && bad === 2 && noq === 2 && noTo === 2, 'usage errors exit 2 (no command, unknown option, no query, get without --to)', `${none} ${bad} ${noq} ${noTo}`);
  ok(badLook === 2 || badLook === 1, 'grade with an unknown look stops before any work', `${badLook}`);
  throws(() => A.parseArgs(['search', '--limit']), /needs a value/, 'a valued option without its value');
}
// refs by name: a film often knows a famous file by its title (titles hold commas)
{
  const r = A.splitRefs('#3,#7,commons:File:A man is recording sound effects, 1930s.jpg,met:436535,4');
  ok(r.length === 5 && r[2] === 'commons:File:A man is recording sound effects, 1930s.jpg' && r[3] === 'met:436535' && r[4] === '4', 'a ref list splits only where a new ref starts (a title keeps its commas)', JSON.stringify(r));
  ok(A.splitRefs('commons:File:Foo, 2.jpg').length === 1 && A.splitRefs('3, 5 ,openverse:abc-1').length === 3, 'a number after a comma inside a title is not a new ref; spaces around commas are fine');
  ok(A.commonsRefParam('12345').pageids === '12345', 'a numeric Commons ref is a page id');
  ok(A.commonsRefParam('File:Waves_009.jpg').titles === 'File:Waves 009.jpg' && A.commonsRefParam('Waves 009.jpg').titles === 'File:Waves 009.jpg', 'a Commons title ref takes File: or not, underscores or spaces');
  ok(A.commonsRefParam('File%3AWaves%20009.jpg').titles === 'File:Waves 009.jpg', 'a URL-encoded title (copied from a page address) decodes');
  throws(() => A.commonsRefParam('File:'), /Commons ref/, 'an empty Commons title');
}
// a ref as search printed it is found in the saved searches; a Mixkit ref no saved search holds says --from
{
  const dir = path.join(os.tmpdir(), `cinetic-assets-saved-${process.pid}`);
  const saved = path.join(dir, 'out', 'assets');
  fs.mkdirSync(saved, { recursive: true });
  const page = 'https://mixkit.co/free-stock-video/example-tide-4242/';
  fs.writeFileSync(path.join(saved, 'tide-video.json'), JSON.stringify({ query: 'tide', kind: 'video', items: [{ n: 1, ref: 'mixkit:4242', source: 'mixkit', kind: 'video', page, licence: 'mixkit-video' }] }));
  fs.writeFileSync(path.join(saved, 'notes.json'), '{ not json');
  ok(A.findSaved('mixkit:4242', saved)?.page === page, 'a ref is found in a saved search (a broken file beside it is skipped)');
  ok(A.findSaved('mixkit:999', saved) === null && A.findSaved('mixkit:4242', path.join(dir, 'nowhere')) === null, 'no saved search holds the ref, or there is no folder: null');
  const cwd = process.cwd(); const log = console.log; const err = console.error; let out = '';
  console.log = (...a) => { out += `${a.join(' ')}\n`; }; console.error = (...a) => { out += `${a.join(' ')}\n`; };
  process.chdir(dir);
  const code = await A.main(['get', 'mixkit:999', '--to', path.join(dir, 'public', 'assets')]);
  process.chdir(cwd); console.log = log; console.error = err;
  ok(code === 1 && /--from/.test(out) && !/unknown licence/.test(out), 'get mixkit:<id> with no saved search says pass --from (not "unknown licence"), without a fetch', out.split('\n')[0]);
  fs.rmSync(dir, { recursive: true, force: true });
}

// real pixels (ffmpeg on the PATH): natural keeps a vivid picture's colour; night makes a daylight one read as night
if (A.ffmpegOk()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-grade-'));
  const { spawnSync } = await import('node:child_process');
  const make = (name, src) => { const f = path.join(dir, name); spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', src, '-frames:v', '1', '-y', f]); return f; };
  // a vivid rock pool: turquoise water over a coral band, a little grey stone
  const pool = make('pool.png', "color=c=0x14b4b4:s=640x360,drawbox=x=0:y=250:w=640:h=110:color=0xd2503c:t=fill,drawbox=x=0:y=0:w=640:h=40:color=0x8a8c8e:t=fill");
  // a daylight harbour: pale blue sky, a warm sunset band and tan wood, mid-grey water
  const day = make('day.png', "color=c=0x9cc4e4:s=640x360,drawbox=x=0:y=120:w=640:h=40:color=0xe8963c:t=fill,drawbox=x=0:y=160:w=640:h=120:color=0x6e7478:t=fill,drawbox=x=0:y=280:w=640:h=80:color=0xb48c5a:t=fill");
  const log = console.log; let out = ''; console.log = (...a) => { out += `${a.join(' ')}\n`; };
  await A.main(['grade', pool, '--out', path.join(dir, 'g'), '--aspect', 'none', '--grain', '0', '--no-check']);
  await A.main(['grade', day, '--look', 'night', '--out', path.join(dir, 'g'), '--aspect', 'none', '--grain', '0', '--no-check']);
  console.log = log;
  const share = (f) => A.colourShares(A.frameGrid(f));
  const before = share(pool); const after = share(path.join(dir, 'g', 'pool.natural.jpg'));
  ok(after.saturated >= 0.85 * before.saturated && after.C >= 0.75 * before.C, 'natural keeps a vivid picture\'s colour (saturated share and chroma)', `saturated ${(before.saturated * 100).toFixed(0)} -> ${(after.saturated * 100).toFixed(0)} %, C ${before.C.toFixed(3)} -> ${after.C.toFixed(3)}`);
  const nb = share(day); const na = share(path.join(dir, 'g', 'day.night.jpg'));
  const lumaMed = (f) => { const g = A.frameGrid(f); const ys = []; for (let i = 0; i + 2 < g.length; i += 3) ys.push((0.2126 * g[i] + 0.7152 * g[i + 1] + 0.0722 * g[i + 2]) / 255); ys.sort((a, b) => a - b); return ys[ys.length >> 1]; };
  const ln = lumaMed(path.join(dir, 'g', 'day.night.jpg'));
  ok(ln > 0.12 && ln < 0.24, 'night: a daylight picture\'s median luma lands near 0.18', `${lumaMed(day).toFixed(2)} -> ${ln.toFixed(3)}`);
  ok(na.banned < 0.5 * nb.banned, 'night: the orange band and tan wood lose most of their banned colour', `${(nb.banned * 100).toFixed(1)} -> ${(na.banned * 100).toFixed(1)} %`);
  fs.rmSync(dir, { recursive: true, force: true });
} else console.log('skip  real-pixel grade tests: no ffmpeg on the PATH');

ok(fetched === 0, 'no test touched the network', `${fetched} fetch calls`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
