#!/usr/bin/env node
/**
 * assets.test.mjs: offline tests for scripts/assets.mjs (imagery search, licences, record, sheet and grade math).
 *
 *   1. Licences: Creative Commons codes, Wikimedia Commons metadata and NASA records map to the right licence;
 *      the default takes only licences that need no credit; --allow-credit adds CC BY; share-alike,
 *      non-commercial, no-derivatives, Mixkit's restricted licence and unknown licences are always refused.
 *   2. Every source's parser on hand-written responses (assets-fixtures/: JSON only, no images, no recorded data;
 *      each follows its source's response shape): fields, renditions, licences, refusals.
 *   3. Filtering (licence, size, shape, near-duplicates), interleaving, search options (keyed sources only with
 *      their key), the colour filter's scoring.
 *   4. The private licence record: where it lives (outside public/), what an entry holds, replacement.
 *   5. Contact-sheet geometry, the focus crop, the grade's filter chain, file-type sniffing, key redaction.
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
  eq(none.sources, ['openverse', 'commons', 'nasa'], 'photo search without keys: the keyless photo sources');
  const keyed = A.searchOptions({ kind: 'photo' }, { PEXELS_API_KEY: 'k', UNSPLASH_ACCESS_KEY: 'k' });
  ok(keyed.sources.includes('pexels') && keyed.sources.includes('unsplash') && !keyed.sources.includes('pixabay'), 'keyed sources join when their key is in the environment');
  eq(A.searchOptions({ kind: 'video' }, {}).sources, ['commons', 'nasa', 'mixkit'], 'video search without keys: Commons, NASA, Mixkit');
  eq(A.searchOptions({ kind: 'art' }, {}).sources, ['openverse', 'aic', 'met'], 'art search: Openverse, the two museums');
  throws(() => A.searchOptions({ kind: 'photo', source: 'pexels' }, {}), /PEXELS_API_KEY/, 'asking for a keyed source without its key is a usage error');
  throws(() => A.searchOptions({ kind: 'photo', source: 'mixkit' }, {}), /no photo search/, 'Mixkit has no photo search');
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
  ok(/colorbalance=/.test(A.gradeFilter('matte', { accent: '#2e8c9e' })) && /eq=saturation=/.test(A.gradeFilter('matte', { accent: '#2e8c9e' })), 'grade matte: saturation and a shadow push toward the accent');
  const v = A.gradeFilter('duotone', { accent: '#2e8c9e', video: true, speed: 0.5 });
  ok(/setpts=PTS\/0\.5/.test(v) && /allf=t\+u/.test(v) && /format=yuv420p$/.test(v), 'grade video: speed, temporal grain, yuv420p');
  ok(!/noise=/.test(A.gradeFilter('silver', { grain: 0 })), 'grade: --grain 0 removes the grain');
  const flat = A.exposureMap({ lo: 0.14, hi: 0.38 }, A.LOOKS.tint);
  ok(flat.slope <= 1.45 + 1e-9 && flat.hi - flat.lo <= 1.45 * 0.24 + 1e-9, 'exposure: a flat source is stretched at most x1.45', `slope ${flat.slope.toFixed(2)}`);
  const hard = A.exposureMap({ lo: 0.01, hi: 0.99 }, A.LOOKS.tint);
  ok(hard.slope >= 0.75, 'exposure: a contrasty source is flattened at most to x0.75');
  ok(A.satFactor({ sat: 0.02 }, 1, 1) === 1.25 && A.satFactor({ sat: 0.9 }, 1, 1) === 0.25 && A.satFactor(null, 0.55) === 0.55, 'saturation factor: bounded 0.25-1.25, the look\'s own without stats');
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
  console.log = log; console.error = err;
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

ok(fetched === 0, 'no test touched the network', `${fetched} fetch calls`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
