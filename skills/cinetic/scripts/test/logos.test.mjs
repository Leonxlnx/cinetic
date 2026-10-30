#!/usr/bin/env node
/**
 * logos.test.mjs: offline tests for scripts/logos.mjs (real marks from open collections).
 *
 *   1. Cleaning: scripts, event handlers, external references, entities and text metadata go; a file that is not
 *      an SVG is refused.
 *   2. Geometry: the painted box through group transforms, the viewBox trimmed to the art (never past the original),
 *      the brand's own tile told from a round or white mark.
 *   3. Paint: fills inherited from groups, masks left out, faint shadows ignored; the tone (dark, light, colour); the
 *      neutrals reversed for dark grounds with the colours untouched; one-colour files.
 *   4. Names and brands: scores, members of several collections grouped by name (with or without the parent's
 *      word) and home host; gilbarbara's file roles; licences (CC0 and MIT pass, CC BY only with --allow-credit,
 *      share-alike refused); trademark owners by domain.
 *   5. The whole get on hand-written collections (logos-fixtures/: made-up brands, no real mark): files per variant,
 *      the record (source, licence, owner, trademark line), the kit's index (no colours), list and check; a black
 *      mark gets a dark-ground version; a mark that is its own tile; a refused licence; an unknown owner; the brand's
 *      full-colour app tile wins over another collection's black glyph (--source still forces the glyph), and a brand
 *      whose own colour is black keeps the collections' order.
 *   6. Stops: a 403, repeated 429s and a challenge page end the run with what to do (never worked around).
 *   7. The CLI contract: --help, usage errors, exit codes; the starter's src/logos.ts is the empty index.
 *   8. Fingerprints: one drawing written two ways (a rect and a path, a group transform, a CSS class, a clip path)
 *      reads alike; a recoloured or redrawn mark does not; a flat mark against its gradient redraw; a one-colour file
 *      by its shape alone; proportions keep a wordmark from matching a mark.
 *   9. The brand table (a fixture table through CINETIC_LOGO_BRANDS): the collection that carries the current mark is
 *      taken first; a file that draws a retired mark is skipped with a note (a retired colour too) and kept only with
 *      --allow-outdated; only retired files stop the run and name the brand page; --file takes the brand's own file;
 *      the version is printed and recorded; check <film> flags a retired mark in the record and one placed by hand.
 *  10. The shipped table (logo-brands.json): every row has its mark (what, a fingerprint or a stated gap), owner and
 *      brand page, every preferred file names a collection, every retired mark its dates and fingerprint.
 * No test touches the network: fetch is replaced by a map of collection URLs to fixture files that fails the run
 * on any other request.
 *
 * Usage (from the skill root):  node scripts/test/logos.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, 'logos-fixtures');
const SKILL = path.resolve(HERE, '..', '..');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/logos.test.mjs [--verbose]   (offline: no network)');
  process.exit(0);
}
let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
const fx = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');

// the network, replaced: collection URLs map to fixtures; anything else fails the run
const ROUTES = {
  'https://raw.githubusercontent.com/gilbarbara/logos/main/logos.json': 'gilbarbara-index.json',
  'https://api.svgl.app': 'svgl-index.json',
  'https://cdn.jsdelivr.net/npm/simple-icons@16/data/simple-icons.json': 'simple-icons-index.json',
  'https://svgl.app/library/tidepool.svg': 'svgl-tidepool.svg',
  'https://svgl.app/library/tidepool_dark.svg': 'svgl-tidepool_dark.svg',
  'https://svgl.app/library/tidepool_wordmark.svg': 'svgl-tidepool_wordmark.svg',
  'https://svgl.app/library/sharecrop.svg': 'svgl-sharecrop.svg',
  'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/tidepool.svg': 'si-tidepool.svg',
  'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/squarecap.svg': 'si-squarecap.svg',
  'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/sharecrop.svg': 'si-sharecrop.svg',
  'https://svgl.app/library/glowbox.svg': 'svgl-glowbox.svg',
  'https://svgl.app/library/slatework.svg': 'svgl-slatework.svg',
  'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/glowbox.svg': 'si-glowbox.svg',
  'https://cdn.jsdelivr.net/npm/simple-icons@16/icons/slatework.svg': 'si-slatework.svg',
};
for (const f of ['tidepool-icon.svg', 'tidepool.svg', 'tidepool-monochrome-icon.svg', 'inkwell.svg', 'squarecap-icon.svg', 'tidepool-studio.svg', 'glowbox-icon.svg', 'slatework-icon.svg']) ROUTES[`https://raw.githubusercontent.com/gilbarbara/logos/main/logos/${f}`] = f;
let stray = [];
let override = null;
const requested = [];
globalThis.fetch = async (u) => {
  const url = String(u);
  requested.push(url);
  if (override) { const r = override(url); if (r) return r; }
  const f = ROUTES[url];
  if (!f) { stray.push(url); return new Response('not here', { status: 404 }); }
  return new Response(fx(f), { status: 200, headers: { 'content-type': f.endsWith('.json') ? 'application/json' : 'image/svg+xml' } });
};
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-home-'));
process.env.CINETIC_HOME = home;
process.env.CINETIC_LOGO_BRANDS = path.join(home, 'no-table.json'); // sections 1-7: no brand table (the made-up brands are in none)
const L = await import(pathToFileURL(path.join(SKILL, 'scripts', 'logos.mjs')).href);

/** Run the CLI in-process with console captured: { code, out, err }. */
async function cli(args) {
  const out = [], err = [];
  const [log, error] = [console.log, console.error];
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => err.push(a.join(' '));
  try { return { code: await L.main(args), out: out.join('\n'), err: err.join('\n') }; } finally { console.log = log; console.error = error; }
}

try {
  // 1. cleaning
  {
    const s = L.sanitizeSvg(fx('unsafe.svg'));
    result(!/<script|onload|onclick|foreignObject|tracker\.example|@import/i.test(s), 'sanitize: scripts, handlers, foreignObject, external references and @import go', s.slice(0, 160));
    result(/<rect/.test(s) && /\.a\{fill:#123456\}/.test(s), 'sanitize: the drawing and its own styles stay');
    let threw = '';
    try { L.sanitizeSvg('<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"></svg>'); } catch (e) { threw = e.message; }
    result(/entities/.test(threw), 'sanitize: an SVG that declares entities is refused', threw);
    threw = '';
    try { L.sanitizeSvg('<html><body>no</body></html>'); } catch (e) { threw = e.message; }
    result(/not an SVG/.test(threw), 'sanitize: a page that is not an SVG is refused', threw);
    const t = L.sanitizeSvg(fx('tidepool-icon.svg'));
    result(!/<title|<\?xml|<!--/.test(t), 'sanitize: the XML declaration, comments and <title> go (no text rides along)');
  }

  // 2. geometry
  {
    const g = L.geometry(L.sanitizeSvg(fx('tidepool-icon.svg')));
    const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;
    result(!!g.box && near(g.box[0], 20) && near(g.box[1], 30) && near(g.box[2], 60) && near(g.box[3], 40), 'geometry: the painted box through a group transform (20,30 60x40)', JSON.stringify(g.box));
    const p = L.prepare(fx('tidepool-icon.svg'));
    result(p.trimmed && near(p.viewBox[2], 60) && near(p.aspect, 1.5, 0.02) && /width="60"/.test(p.svg), 'prepare: the viewBox is trimmed to the art; width and height follow it', `${p.viewBox} ${p.aspect}`);
    const bleed = L.prepare('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="-5" y="2" width="20" height="6" fill="#123456"/></svg>');
    result(bleed.viewBox[0] === 0 && bleed.viewBox[2] === 10 && bleed.viewBox[3] === 6, 'prepare: art past the viewBox is never revealed (trimmed inside the original)', bleed.viewBox.join(' '));
    const unread = L.prepare('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><use href="#a"/><rect x="2" y="2" width="2" height="2"/></svg>');
    result(!unread.trimmed && unread.viewBox.join(' ') === '0 0 10 10', 'prepare: a file with <use> keeps its viewBox (not read, never guessed)');
    result(L.prepare(fx('squarecap-icon.svg')).tile === true, 'tile: a coloured rounded square behind the mark is the brand\'s own tile');
    result(L.prepare(fx('tidepool-studio.svg')).tile === false, 'tile: a round mark is not a tile');
    result(L.prepare('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ffffff"/><rect x="3" y="3" width="4" height="4" fill="#111"/></svg>').tile === false, 'tile: a white square is the mark\'s own face, not a tile');
    result(L.prepare(fx('squarecap-icon.svg'), { tile: 'none' }).tile === false && L.prepare(fx('tidepool-studio.svg'), { tile: 'own' }).tile === true, 'tile: --tile own|none wins');
    const pts = L.pathPoints('M0 0h10v10H0z M20 20a5 5 0 1 0 10 0a5 5 0 1 0 -10 0');
    result(pts.length === 2 && Math.max(...pts[1].map((q) => q[1])) <= 25.01 && Math.min(...pts[1].map((q) => q[1])) >= 14.99, 'pathPoints: subpaths, relative commands and arcs sampled on the circle');
    result(L.pathPoints('M0 0a1 1 0 011 1').length === 1, 'pathPoints: arc flags written without separators');
  }

  // 3. paint
  {
    const ink = L.sanitizeSvg(fx('inkwell.svg'));
    const cs = L.coloursOf(ink);
    result(cs.includes('#111111') && !cs.includes('white') && !cs.includes('#ffffff'), 'paint: the group\'s fill counts; the mask\'s white is alpha, not colour', cs.join(' '));
    result(!cs.includes('#000000'), 'paint: a faint shadow (12 %) is not the mark\'s colour', cs.join(' '));
    result(L.toneOf(ink) === 'dark' && L.toneOf(fx('tidepool-studio.svg')) === 'colour' && L.toneOf('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z" fill="#fff"/></svg>') === 'light',
      'tone: dark neutrals -> dark, a colour -> colour, white only -> light');
    result(L.toneOf(L.sanitizeSvg(fx('si-tidepool.svg'))) === 'dark', 'tone: a shape with no fill anywhere paints black');
    const rev = L.reverseNeutrals(ink);
    result(/fill="#ffffff"/.test(rev.split('</mask>')[1]) && /<mask id="m"><rect[^>]*fill="white"/.test(rev), 'reverse: dark parts turn white; the mask is untouched', rev.slice(0, 200));
    const tide = L.reverseNeutrals(fx('tidepool.svg'));
    result(/#1A73E8/i.test(tide) && /#ffffff/.test(tide) && !/#202124/.test(tide), 'reverse: the colour stays, the dark wordmark turns white');
    const one = L.oneColour('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#f00"/></linearGradient></defs><path fill="url(#g)"/><path fill="none" stroke="#0f0"/><path fill="#00f"/></svg>', '#ffffff');
    result(/stop-color="#ffffff"/.test(one) && /fill="url\(#g\)"/.test(one) && /fill="none"/.test(one) && /stroke="#ffffff"/.test(one) && !/#00f"/.test(one) && /<svg[^>]*fill="#ffffff"/.test(one),
      'one colour: every paint and stop, the gradient reference and none kept, the root\'s default too');
  }

  // 4. names, brands, roles, licences, owners
  {
    result(L.nameScore('gmail', 'Gmail') === 100 && L.nameScore('tidepool', 'Google Tidepool') === 95 && L.nameScore('tide', 'Tidepool') >= 60 && L.nameScore('zzz', 'Tidepool') === 0, 'nameScore: exact 100, without the parent\'s word 95, a prefix 60-80, none 0');
    const groups = L.groupBrands([
      { collection: 'gilbarbara', id: 'google-tidepool', name: 'Google Tidepool', site: 'https://tidepool.example/', score: 95 },
      { collection: 'svgl', id: '7', name: 'Tidepool', site: 'https://www.tidepool.example', score: 100 },
      { collection: 'simple-icons', id: 'tidepool', name: 'Tidepool', site: '', score: 100 },
      { collection: 'svgl', id: '9', name: 'Sharecrop', site: 'https://sharecrop.example', score: 40 },
    ]);
    result(groups.length === 2 && groups[0].members.length === 3 && groups[0].name === 'Tidepool', 'groupBrands: one brand across collections (name without the parent\'s word, same host); the plain name shown', JSON.stringify(groups.map((g) => [g.name, g.members.length])));
    const r = L.gilbarbaraRoles('acme', ['acme.svg', 'acme-icon.svg', 'acme-icon-2020.svg', 'acme-dark.svg', 'acme-icon-dark.svg', 'acme-monochrome-icon.svg', 'acme-2021.svg']);
    result(r.mark[0] === 'acme-icon.svg' && r.mark[1] === 'acme-icon-2020.svg' && r.markDark[0] === 'acme-icon-dark.svg' && r.base[0] === 'acme.svg' && r.base[1] === 'acme-2021.svg' && r.baseDark[0] === 'acme-dark.svg',
      'gilbarbara roles: the plain name (the current drawing) first, then the dated ones it replaced; dark versions apart, monochrome left out', JSON.stringify(r));
    result(L.licenceOk('CC0-1.0').ok && L.licenceOk('MIT').ok && /notice/.test(L.licenceOk('MIT').why), 'licence: CC0 passes, MIT passes with its notice kept');
    result(!L.licenceOk('CC-BY-4.0').ok && L.licenceOk('CC-BY-4.0', { allowCredit: true }).ok && !L.licenceOk('CC-BY-SA-4.0', { allowCredit: true }).ok && !L.licenceOk(undefined).ok,
      'licence: CC BY only with --allow-credit; share-alike and unknown refused');
    result(L.ownerOf('https://mail.google.com/x') === 'Google LLC' && L.ownerOf('https://www.claude.ai') === 'Anthropic PBC' && L.ownerOf('https://tidepool.example/') === null, 'owners: the host, then its parent domains; unknown is null');
    result(L.ownerOf('https://www.instagram.com/') === 'Meta Platforms, Inc.' && L.ownerOf('https://www.threads.net/') === 'Meta Platforms, Inc.' && L.ownerOf('https://www.tiktok.com/') === 'ByteDance Ltd.'
      && L.ownerOf('https://trello.com/b/x') === 'Atlassian' && L.ownerOf('https://huggingface.co/') === 'Hugging Face, Inc.', 'owners: the common brands a film shows (social, work tools, models)');
  }

  // 5. the whole get, offline
  const film = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-film-'));
  fs.mkdirSync(path.join(film, 'public'), { recursive: true });
  fs.mkdirSync(path.join(film, 'src'), { recursive: true });
  {
    const s = await cli(['search', 'tidepool']);
    result(s.code === 0 && /#1\s+Tidepool/.test(s.out) && /gilbarbara:tidepool/.test(s.out) && /svgl:tidepool/.test(s.out) && /simple-icons:tidepool/.test(s.out), 'search: one brand, its members in three collections', s.out.split('\n').slice(0, 5).join(' | '));
    const g = await cli(['get', 'tidepool', '--film', film, '--owner', 'Tidepool Inc.']);
    result(g.code === 0, 'get tidepool: exit 0', `${g.out} ${g.err}`.slice(0, 300));
    const pub = (f) => fs.existsSync(path.join(film, 'public', 'logos', f));
    result(pub('tidepool.svg') && pub('tidepool.wordmark.svg') && pub('tidepool.mono.svg') && pub('tidepool.white.svg') && pub('tidepool.black.svg'), 'get: the mark, the wordmark and the one-colour files', fs.readdirSync(path.join(film, 'public', 'logos')).join(' '));
    result(!pub('tidepool.dark.svg'), 'get: a colour mark needs no dark-ground version (svgl\'s dark file pairs only with svgl\'s light one)');
    const rec = JSON.parse(fs.readFileSync(path.join(film, 'public', 'logos', 'logos.json'), 'utf8'));
    const e = rec.logos.tidepool;
    result(e && e.owner === 'Tidepool Inc.' && e.hex === '#1A73E8' && e.files.mark.from === 'gilbarbara' && e.files.wordmark.from === 'gilbarbara' && e.files.mono.from === 'simple-icons',
      'record: the owner, the official hex, each file\'s collection', JSON.stringify(e?.files?.mark));
    result(e.sources.gilbarbara.licence === 'CC0-1.0' && e.sources['simple-icons'].licence === 'CC0-1.0' && e.sources.gilbarbara.seen?.url && /no endorsement or partnership/.test(e.trademark) && /Tidepool Inc\./.test(e.trademark),
      'record: each source\'s licence as read, the trademark line');
    result(e.files.mark.trimmed === true && Math.abs(e.files.mark.aspect - 1.5) < 0.02, 'record: the mark trimmed to its art, its proportions', String(e.files.mark.aspect));
    const mark = fs.readFileSync(path.join(film, 'public', 'logos', 'tidepool.svg'), 'utf8');
    result(/#1A73E8/i.test(mark) && /#34A853/i.test(mark) && !/<title/.test(mark), 'files: the brand\'s colours unaltered, no text metadata');
    const mono = fs.readFileSync(path.join(film, 'public', 'logos', 'tidepool.mono.svg'), 'utf8');
    result(/fill="#1A73E8"/.test(mono) && /fill="#ffffff"/.test(fs.readFileSync(path.join(film, 'public', 'logos', 'tidepool.white.svg'), 'utf8')), 'files: one colour in the official hex, and white for dark grounds');
    const idx = fs.readFileSync(path.join(film, 'src', 'logos.ts'), 'utf8');
    result(/"tidepool": \{ name: "Tidepool", tone: "colour", tile: "none", files: \{ mark: \{ src: "logos\/tidepool\.svg", aspect: 1\.5 \}/.test(idx) && !/#[0-9a-fA-F]{3,8}\b/.test(idx),
      'index: src/logos.ts lists the files and proportions, no colour (the lint palette stays the film\'s)', idx.split('\n').find((l) => l.includes('tidepool')) || '');

    const ink = await cli(['get', 'inkwell', '--film', film]);
    const ie = JSON.parse(fs.readFileSync(path.join(film, 'public', 'logos', 'logos.json'), 'utf8')).logos.inkwell;
    result(ink.code === 0 && ie.tone === 'dark' && ie.files.markDark && /neutrals reversed/.test(ie.files.markDark.derived), 'get inkwell: a black mark gets a dark-ground version (its neutrals reversed)', JSON.stringify(ie?.files?.markDark));
    result(ie.files.white && /silhouette/.test(ie.files.white.derived) && ie.owner === null && /owner unknown/.test(ink.out), 'get inkwell: one-colour files from its silhouette; the owner unknown, said so', ink.out.split('\n').filter((l) => /note/.test(l)).join(' | '));
    const sq = await cli(['get', 'squarecap', '--film', film, '--owner', 'Squarecap Ltd.']);
    const se = JSON.parse(fs.readFileSync(path.join(film, 'public', 'logos', 'logos.json'), 'utf8')).logos.squarecap;
    result(sq.code === 0 && se.tile === 'own' && se.files.white?.from === 'simple-icons', 'get squarecap: its own tile; the one-colour files from the glyph inside it', JSON.stringify({ tile: se?.tile, white: se?.files?.white?.from }));
    const sc = await cli(['get', 'sharecrop', '--film', film, '--owner', 'Sharecrop Co.']);
    const sce = JSON.parse(fs.readFileSync(path.join(film, 'public', 'logos', 'logos.json'), 'utf8')).logos.sharecrop;
    result(sc.code === 0 && sce.files.mark.from === 'svgl' && !sce.files.mono && /simple-icons sharecrop: licence CC-BY-SA-4.0/.test(sc.out) && !Object.keys(sce.sources).includes('simple-icons'),
      'get sharecrop: a share-alike icon is refused; the mark comes from the collection that allows it', JSON.stringify(Object.keys(sce?.sources || {})));
    const ref = await cli(['get', 'svgl:7', '--film', film, '--as', 'tidepool-svgl', '--owner', 'Tidepool Inc.']);
    const re = JSON.parse(fs.readFileSync(path.join(film, 'public', 'logos', 'logos.json'), 'utf8')).logos['tidepool-svgl'];
    result(ref.code === 0 && re.files.mark.from === 'svgl' && re.files.markDark?.from === 'svgl' && re.files.wordmark?.from === 'svgl', 'get svgl:7 --as: that collection\'s mark, its own dark version and wordmark', ref.err.slice(0, 200) + JSON.stringify(re?.files && Object.fromEntries(Object.entries(re.files).map(([k, v]) => [k, v.from]))));
    const rec2 = () => JSON.parse(fs.readFileSync(path.join(film, 'public', 'logos', 'logos.json'), 'utf8')).logos;
    const gb = await cli(['get', 'glowbox', '--film', film, '--owner', 'Glowbox Inc.']);
    const ge = rec2().glowbox;
    result(gb.code === 0 && ge.files.mark.from === 'svgl' && ge.tone === 'colour' && ge.tile === 'own' && ge.files.mono?.from === 'simple-icons',
      "get glowbox: the brand's full-colour app tile wins over another collection's black glyph", JSON.stringify({ mark: ge?.files?.mark?.from, tone: ge?.tone, tile: ge?.tile }));
    const gg = await cli(['get', 'glowbox', '--film', film, '--source', 'gilbarbara', '--as', 'glowbox-glyph', '--owner', 'Glowbox Inc.']);
    result(gg.code === 0 && rec2()['glowbox-glyph'].files.mark.from === 'gilbarbara' && rec2()['glowbox-glyph'].tone === 'dark', "get glowbox --source gilbarbara: the forced collection's file, glyph and all");
    const sw = await cli(['get', 'slatework', '--film', film, '--owner', 'Slatework Ltd.']);
    result(sw.code === 0 && rec2().slatework.files.mark.from === 'gilbarbara' && rec2().slatework.tone === 'dark', "get slatework: a brand whose own colour is black keeps the collections' order (no colour variant preferred)", rec2().slatework?.files?.mark?.from);
    const list = await cli(['list', '--film', film]);
    result(list.code === 0 && /tidepool\s+Tidepool\s+Tidepool Inc\./.test(list.out) && /inkwell: no trademark owner/.test(list.out), 'list: every mark with its owner and licences; the unknown owner noted', list.out.split('\n')[0]);
    const chk = await cli(['check', '--film', film]);
    result(chk.code === 1 && /FAIL\s+inkwell: no trademark owner/.test(chk.out), 'check: a mark without its owner fails', chk.out.split('\n').pop());
    await cli(['get', 'inkwell', '--film', film, '--owner', 'Inkwell GmbH']);
    fs.rmSync(path.join(film, 'src', 'logos.ts'));
    const w = await cli(['list', '--film', film, '--write']);
    const chk2 = await cli(['check', '--film', film]);
    result(w.code === 0 && fs.existsSync(path.join(film, 'src', 'logos.ts')) && chk2.code === 0, 'list --write rewrites src/logos.ts from the record; check passes', chk2.out.split('\n').pop());
    result(stray.length === 0, 'no request left the fixtures', stray.join(', '));
    fs.rmSync(film, { recursive: true, force: true });
  }

  // 6. stops
  {
    const film2 = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-film-'));
    fs.mkdirSync(path.join(film2, 'public'));
    fs.rmSync(path.join(home, 'logos'), { recursive: true, force: true });
    override = (u) => (u.includes('gilbarbara') ? new Response('no', { status: 403 }) : null);
    const r403 = await cli(['get', 'tidepool', '--film', film2, '--refresh']);
    result(r403.code === 1 && /never works around/.test(r403.err), 'a 403 stops the run: open it in a browser, never worked around', r403.err.split('\n')[0]);
    override = (u) => (u.includes('svgl') ? new Response(fx('challenge.html'), { status: 200, headers: { 'content-type': 'text/html' } }) : null);
    const rch = await cli(['search', 'tidepool', '--refresh']);
    result(rch.code === 1 && /check page/.test(rch.err), 'a challenge page stops the run', rch.err.split('\n')[0]);
    override = null;
    fs.rmSync(film2, { recursive: true, force: true });
  }

  // 7. the CLI contract
  {
    const h = await cli(['--help']);
    result(h.code === 0 && /search <name>/.test(h.out) && /get\s+<name\|#n\|collection:id>/.test(h.out) && /never an endorsement/.test(h.out), '--help: exit 0, the commands and the rule');
    result((await cli(['get', 'x', '--bogus'])).code === 2 && (await cli(['frob'])).code === 2 && (await cli(['get', 'x', '--variant', 'nope'])).code === 2, 'usage errors exit 2');
    const nopub = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-nopub-'));
    const np = await cli(['get', 'tidepool', '--film', nopub]);
    result(np.code === 2 && /no public\//.test(np.err), 'get outside a film project: exit 2, says where', np.err.split('\n')[0]);
    fs.rmSync(nopub, { recursive: true, force: true });
    const film3 = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-film-'));
    fs.mkdirSync(path.join(film3, 'public'));
    const amb = await cli(['get', 'tide', '--film', film3]);
    result(amb.code === 1 && /no brand named exactly "tide"/.test(amb.err) && /#1 Tidepool/.test(amb.err), 'a name that is not exact: exit 1 with the nearest brands', amb.err.split('\n')[0]);
    fs.rmSync(film3, { recursive: true, force: true });
    const starter = path.join(SKILL, 'assets', 'remotion-starter', 'src', 'logos.ts');
    if (fs.existsSync(starter)) result(fs.readFileSync(starter, 'utf8') === L.indexSource({ logos: {} }), 'the starter\'s src/logos.ts is logos.mjs\'s empty index');
    else console.log('skip  the starter has no src/logos.ts');
  }

  // 8. fingerprints
  {
    const svgOf = (body, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
    const a = L.fingerprint(svgOf('<rect x="10" y="20" width="80" height="60" fill="#1A73E8"/><circle cx="50" cy="50" r="15" fill="#ffffff"/>'));
    const b = L.fingerprint(svgOf('<style>.k{fill:#1a73e8}</style><g transform="translate(5 10)"><path class="k" d="M5 10h80v60H5z"/></g><circle cx="50" cy="50" r="15" fill="#fff"/>'));
    const c = L.fingerprint(svgOf('<defs><clipPath id="c"><rect x="10" y="20" width="80" height="60"/></clipPath></defs><rect width="100" height="100" fill="#1A73E8" clip-path="url(#c)"/><circle cx="50" cy="50" r="15" fill="#ffffff"/>'));
    result(/^fp1 a1\.3\d? p/.test(a) && L.parseFp(a)?.cov.length === 64, 'fingerprint: proportions, palette, 64 cells of coverage and colour', a.slice(0, 40));
    result(L.similarity(a, b) >= 0.9 && L.similarity(a, c) >= 0.9, 'fingerprint: one drawing written as a rect or a path in a moved group with a CSS class, or clipped, reads alike', `${L.similarity(a, b)} ${L.similarity(a, c)}`);
    const red = L.fingerprint(svgOf('<rect x="10" y="20" width="80" height="60" fill="#E8341A"/><circle cx="50" cy="50" r="15" fill="#ffffff"/>'));
    const tri = L.fingerprint(svgOf('<path d="M10 80L50 20l40 60z" fill="#1A73E8"/>', '0 0 100 100'));
    result(L.similarity(a, red) < 0.7 && L.similarity(a, tri) < 0.7, 'fingerprint: the same shape recoloured, or another shape, does not', `${L.similarity(a, red)} ${L.similarity(a, tri)}`);
    const flat = L.fingerprint(svgOf('<rect width="50" height="100" fill="#1A73E8"/><rect x="50" width="50" height="100" fill="#E8341A"/>'));
    const grad = L.fingerprint(svgOf('<defs><linearGradient id="g"><stop offset="0" stop-color="#1A73E8"/><stop offset="1" stop-color="#E8341A"/></linearGradient></defs><rect width="50" height="100" fill="url(#g)"/><rect x="50" width="50" height="100" fill="url(#g)"/>'));
    result(L.parseFp(grad).grad > 0.8 && L.parseFp(flat).grad === 0 && L.similarity(flat, grad) < 0.7, 'fingerprint: a flat mark against its multi-hue gradient redraw', `${L.similarity(flat, grad)}`);
    const glyph = L.fingerprint(L.sanitizeSvg(fx('si-glowbox.svg')));
    const ring = L.fingerprint(L.sanitizeSvg(fx('glowbox-icon.svg')));
    result(L.monoFp(L.parseFp(glyph)) && L.similarity(glyph, ring) >= 0.72, 'fingerprint: a one-colour file is compared by its shape alone', String(L.similarity(glyph, ring)));
    const wide = L.fingerprint(svgOf('<rect x="0" y="40" width="100" height="20" fill="#1A73E8"/>'));
    result(L.similarity(a, wide) === 0, 'fingerprint: a wordmark never matches a mark (proportions)');
    result(L.fingerprint(svgOf('')) === null && L.similarity(null, a) === 0, 'fingerprint: nothing drawn is null, and alike nothing');
  }

  // 9. the brand table
  {
    process.env.CINETIC_TODAY = '2026-10-30'; // the fixture table was checked the day before
    const fpOf = (file) => L.fingerprint(L.sanitizeSvg(fx(file)));
    const table = path.join(home, 'brands.json');
    fs.writeFileSync(table, JSON.stringify({ checked: '2026-10-29', threshold: { same: 0.72, margin: 0.04 }, brands: {
      glowbox: { name: 'Glowbox', owner: 'Glowbox Inc.', page: 'https://glowbox.example/brand', mark: { since: '2026-03', what: 'the white ring on the warm tile', fp: fpOf('svgl-glowbox.svg') },
        prefer: ['svgl:glowbox'], outdated: [{ since: '2019', until: '2026-03', what: 'the black ring', fp: fpOf('glowbox-icon.svg') }], members: { gilbarbara: ['glowbox'], svgl: ['glowbox'], 'simple-icons': 'glowbox' } },
      tidepool: { name: 'Tidepool', owner: 'Tidepool Inc.', page: 'https://tidepool.example/brand', mark: { since: '2025-01', what: 'the blue disc', fp: fpOf('svgl-tidepool.svg') },
        outdated: [{ since: '2018', until: '2025-01', what: 'the disc and the green bar', fp: fpOf('tidepool-icon.svg') }], members: { gilbarbara: ['tidepool'], svgl: ['7'], 'simple-icons': 'tidepool' } },
      slatework: { name: 'Slatework', owner: 'Slatework Ltd.', page: 'https://slatework.example/brand', mark: { since: '2024-06', what: 'the three coloured slabs', fp: fpOf('svgl-slatework.svg') },
        prefer: ['svgl:slatework'], members: { gilbarbara: ['slatework'], svgl: ['slatework'], 'simple-icons': 'slatework' } },
      sharecrop: { name: 'Sharecrop', owner: 'Sharecrop Co.', page: 'https://sharecrop.example/press', mark: { since: '2026-01', what: 'the triangle in blue', fp: null },
        retired: ['#00aa55'], retiredWhat: 'the green of the 2020-2026 triangle', members: { svgl: ['9'], 'simple-icons': 'sharecrop' } },
    } }));
    process.env.CINETIC_LOGO_BRANDS = table;
    const idx = JSON.parse(fx('svgl-index.json'));
    const moved = idx.map((x) => ({ ...x, id: x.id + 4 })); // svgl numbers its list by position: a logo added before shifts the rest
    result(L.svglKey(idx[0]) === 'tidepool' && L.svglFind(idx, 'slatework')?.title === 'Slatework' && L.svglFind(moved, 'slatework')?.title === 'Slatework' && L.svglFind(moved, '12')?.title !== 'Slatework' && L.svglFind(idx, '7')?.title === 'Tidepool',
      'svgl: an entry named by its file survives the list being renumbered (a number is read against the day\'s index only)');
    const film4 = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-film-'));
    fs.mkdirSync(path.join(film4, 'public'));
    const rec4 = () => JSON.parse(fs.readFileSync(path.join(film4, 'public', 'logos', 'logos.json'), 'utf8')).logos;
    result(L.brandFor('glowbox')?.slug === 'glowbox' && L.brandFor('Tidepool')?.slug === 'tidepool' && L.brandFor('nope') === null, 'brand table: a row by its name');
    const tp = await cli(['get', 'tidepool', '--film', film4]);
    result(tp.code === 0 && rec4().tidepool.files.mark.from === 'svgl' && /gilbarbara tidepool-icon\.svg: the disc and the green bar \(2018 to 2025-01\), a retired mark: skipped/.test(tp.out),
      'get with a brand row: a file that draws a retired mark is skipped with a note; the current one is taken', tp.out.split('\n').filter((l) => /retired|mark:/.test(l)).join(' | '));
    result(/mark: the current mark: the blue disc, since 2025-01 \(checked 2026-10-29\); brand page https:\/\/tidepool\.example\/brand/.test(tp.out), 'get: the version printed with the brand page', tp.out.split('\n').find((l) => l.startsWith('mark:')));
    result(rec4().tidepool.version?.status === 'current' && rec4().tidepool.version.since === '2025-01' && rec4().tidepool.version.page === 'https://tidepool.example/brand', 'record: the version, its date and the brand page', JSON.stringify(rec4().tidepool.version));
    const sw4 = await cli(['get', 'slatework', '--film', film4]);
    result(sw4.code === 0 && rec4().slatework.files.mark.from === 'svgl', "get: the row's preferred collection first (svgl's colour slabs over the collections' order)", rec4().slatework?.files?.mark?.from);
    const gs = await cli(['get', 'glowbox', '--film', film4, '--source', 'gilbarbara']);
    result(gs.code === 1 && /only retired marks of Glowbox/.test(gs.err) && /gilbarbara glowbox-icon\.svg: the black ring/.test(gs.err),
      'get --source: a collection that holds only a retired mark is not taken from', gs.err.split('\n')[0].slice(0, 160));
    const ga = await cli(['get', 'glowbox', '--film', film4, '--source', 'gilbarbara', '--allow-outdated', '--as', 'glowbox-old']);
    result(ga.code === 0 && rec4()['glowbox-old'].files.mark.from === 'gilbarbara' && /a retired mark: the black ring/.test(ga.out), '--allow-outdated keeps the retired mark knowingly (and says so)', ga.out.split('\n').find((l) => l.startsWith('mark:')));
    const sc = await cli(['get', 'sharecrop', '--film', film4]);
    result(sc.code === 1 && /only retired marks of Sharecrop/.test(sc.err) && /the green of the 2020-2026 triangle/.test(sc.err) && /https:\/\/sharecrop\.example\/press/.test(sc.err) && /--file/.test(sc.err),
      'get: only retired files (a retired colour) stop the run and name the brand page, --file and --allow-outdated', sc.err.split('\n')[0].slice(0, 160));
    const own = path.join(home, 'sharecrop-own.svg');
    fs.writeFileSync(own, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 90L50 10l40 80z" fill="#2255DD"/></svg>');
    const sf = await cli(['get', 'sharecrop', '--film', film4, '--file', own]);
    result(sf.code === 0 && rec4().sharecrop.files.mark.from === 'file' && rec4().sharecrop.sources.file.licence === 'owner-supplied', "--file: the brand's own file is the mark, recorded as the owner's file", JSON.stringify(rec4().sharecrop?.sources?.file));
    const c0 = await cli(['check', film4]);
    result(c0.code === 1 && /OUTDATED\s+logos\/glowbox-old\.svg\s+Glowbox: a retired mark: the black ring/.test(c0.out) && /current\s+tidepool/.test(c0.out), 'check <film>: the retired mark kept with --allow-outdated is flagged; the current ones pass', c0.out.split('\n').find((l) => /OUTDATED/.test(l)));
    await cli(['get', 'glowbox', '--film', film4, '--as', 'glowbox-old']);
    fs.copyFileSync(path.join(FIX, 'glowbox-icon.svg'), path.join(film4, 'public', 'hand-placed.svg'));
    fs.writeFileSync(path.join(film4, 'public', 'hand-placed.svg'), fx('glowbox-icon.svg').replace('#111111', '#C23C8F'));
    const c1 = await cli(['check', film4]);
    const c1Old = c1.out.split('\n').filter((l) => /^OUTDATED/.test(l));
    result(c1Old.length === 0 && /0 outdated/.test(c1.out), 'check: a mark fetched again passes; a recoloured ring placed by hand is not taken for the brand\'s retired black one', c1Old.join(' | ') || c1.out.split('\n').pop());
    fs.mkdirSync(path.join(film4, 'public', 'img'));
    fs.copyFileSync(path.join(FIX, 'tidepool-icon.svg'), path.join(film4, 'public', 'img', 'old-tidepool.svg'));
    const c2 = await cli(['check', film4, '--json']);
    const j2 = JSON.parse(c2.out);
    result(c2.code === 1 && j2.marks.some((m) => m.file === 'img/old-tidepool.svg' && m.status === 'outdated' && m.brand === 'Tidepool'), 'check: an .svg placed by hand under public/ that draws a retired mark is flagged (--json)', JSON.stringify(j2.marks.filter((m) => m.status === 'outdated').map((m) => m.file)));
    const v = L.versionOf(L.brandFor('glowbox'), L.sanitizeSvg(fx('glowbox-icon.svg')));
    result(v.status === 'outdated' && v.since === '2019' && v.until === '2026-03' && v.by === 'drawing', 'versionOf: the retired drawing with its dates', JSON.stringify(v));
    // verified on the brand's own page within 12 months, else check fails the brand
    const T9 = L.loadBrands();
    const day = (d) => Date.parse(d);
    const vFresh = L.verification(T9.brands.tidepool, T9, day('2027-06-01'));
    const vOld = L.verification(T9.brands.tidepool, T9, day('2027-11-15'));
    const vOwn = L.verification({ ...T9.brands.tidepool, verified: '2027-10-01' }, T9, day('2027-11-15'));
    const vNever = L.verification({ ...T9.brands.tidepool, verified: null, verifyNote: 'the page draws its files in script' }, T9, day('2026-11-01'));
    const vNoPage = L.verification({ ...T9.brands.tidepool, page: '' }, T9, day('2026-11-01'));
    result(vFresh.ok && !vOld.ok && /over 12 months/.test(vOld.why) && vOwn.ok && !vNever.ok && /not verified against https:\/\/tidepool\.example\/brand \(the page draws/.test(vNever.why) && !vNoPage.ok,
      "verification: the table's date within 12 months passes, older fails, a row's own verified date wins, verified null and no brand page fail", [vFresh, vOld, vOwn, vNever, vNoPage].map((x) => x.ok).join());
    const tb = JSON.parse(fs.readFileSync(table, 'utf8'));
    tb.brands.tidepool.verified = null;
    fs.writeFileSync(table, JSON.stringify(tb));
    const table2 = path.join(home, 'brands-2.json');
    fs.writeFileSync(table2, JSON.stringify(tb));
    process.env.CINETIC_LOGO_BRANDS = table2;
    const c3 = await cli(['check', film4, '--json']);
    const j3 = JSON.parse(c3.out);
    result(c3.code === 1 && j3.stale.some((x) => x.slug === 'tidepool' && !x.ok) && !j3.stale.some((x) => x.slug === 'slatework'),
      'check: a brand never verified on its page fails the film that shows it (--json stale), the verified ones pass', JSON.stringify(j3.stale));
    process.env.CINETIC_LOGO_BRANDS = table;
    fs.rmSync(film4, { recursive: true, force: true });
    process.env.CINETIC_LOGO_BRANDS = path.join(home, 'no-table.json');
  }

  // 10. the shipped table
  {
    const T = JSON.parse(fs.readFileSync(path.join(SKILL, 'scripts', 'logo-brands.json'), 'utf8'));
    const rows = Object.entries(T.brands);
    const bad = [];
    for (const [slug, b] of rows) {
      if (!b.name || !b.owner || !/^https:\/\//.test(b.page || '')) bad.push(`${slug}: name, owner or page`);
      if (!b.mark?.what || (b.mark.fp !== null && !L.parseFp(b.mark.fp))) bad.push(`${slug}: mark`);
      if (b.mark.since !== null && !/^\d{4}(-\d{2})?$/.test(b.mark.since)) bad.push(`${slug}: since`);
      if (!b.mark.fp && !(b.prefer || []).length && !(b.retired || []).length) bad.push(`${slug}: no current mark, no preferred file and no retired colour`);
      for (const r of b.prefer || []) if (!/^(gilbarbara|svgl|simple-icons|commons):./.test(r)) bad.push(`${slug}: prefer ${r}`);
      for (const o of b.outdated || []) if (!o.what || !o.until || !L.parseFp(o.fp)) bad.push(`${slug}: outdated ${o.what}`);
      for (const c of [...(b.retired || []), ...(b.hex || [])]) if (!L.rgbOf(c)) bad.push(`${slug}: colour ${c}`);
    }
    result(rows.length >= 70 && T.checked && T.threshold?.same > 0 && bad.length === 0, `the shipped table: ${rows.length} brands, each with its mark, owner, page and versions`, bad.slice(0, 6).join('; '));
    const named = ['gmail', 'google', 'microsoft-teams', 'microsoft-word', 'slack', 'x', 'youtube', 'zoom', 'figma', 'notion', 'github', 'stripe', 'chatgpt', 'claude', 'gemini'].filter((k) => !T.brands[k]);
    result(named.length === 0, 'the shipped table: the brands a launch film shows most', named.join(', '));
    const nums = rows.flatMap(([slug, b]) => [...[].concat(b.members?.svgl || []), ...[...(b.prefer || []), b.mark?.from || '', ...(b.outdated || []).map((o) => o.from || '')].filter((r) => r.startsWith('svgl:')).map((r) => r.split(':')[1])].filter((r) => /^\d+$/.test(String(r))).map((r) => `${slug}: svgl ${r}`));
    result(nums.length === 0, 'the shipped table: svgl entries by file name, never by number (svgl renumbers its list as it grows)', nums.slice(0, 6).join('; '));
    const vbad = rows.filter(([, b]) => 'verified' in b && b.verified !== null && !/^\d{4}-\d{2}-\d{2}$/.test(b.verified)).map(([k]) => k);
    const unverified = rows.filter(([, b]) => b.verified === null && !b.verifyNote).map(([k]) => k);
    result(/^\d{4}-\d{2}-\d{2}$/.test(T.checked) && !vbad.length && !unverified.length, "the shipped table: a checked date, every row's own verified date a day, and a row never verified says why (verifyNote)", [...vbad, ...unverified].join(', '));
    process.env.CINETIC_LOGO_BRANDS = path.join(SKILL, 'scripts', 'logo-brands.json');
    result(L.brandFor('Google Gmail')?.slug === 'gmail' && L.brandFor('Twitter')?.slug === 'x' && L.brandFor('Outlook')?.slug === 'microsoft-outlook', 'the shipped table: a brand by another name it goes by');
    process.env.CINETIC_LOGO_BRANDS = path.join(home, 'no-table.json');
  }
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
if (verbose) console.log(`requests answered from fixtures: ${requested.length}`);
process.exit(failed ? 1 : 0);
