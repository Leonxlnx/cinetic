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
 *      mark gets a dark-ground version; a mark that is its own tile; a refused licence; an unknown owner.
 *   6. Stops: a 403, repeated 429s and a challenge page end the run with what to do (never worked around).
 *   7. The CLI contract: --help, usage errors, exit codes; the starter's src/logos.ts is the empty index.
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
};
for (const f of ['tidepool-icon.svg', 'tidepool.svg', 'tidepool-monochrome-icon.svg', 'inkwell.svg', 'squarecap-icon.svg', 'tidepool-studio.svg']) ROUTES[`https://raw.githubusercontent.com/gilbarbara/logos/main/logos/${f}`] = f;
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
    result(r.mark[0] === 'acme-icon-2020.svg' && r.mark.length === 2 && r.markDark[0] === 'acme-icon-dark.svg' && r.base[0] === 'acme-2021.svg' && r.baseDark[0] === 'acme-dark.svg',
      'gilbarbara roles: marks newest first, dark versions apart, monochrome left out', JSON.stringify(r));
    result(L.licenceOk('CC0-1.0').ok && L.licenceOk('MIT').ok && /notice/.test(L.licenceOk('MIT').why), 'licence: CC0 passes, MIT passes with its notice kept');
    result(!L.licenceOk('CC-BY-4.0').ok && L.licenceOk('CC-BY-4.0', { allowCredit: true }).ok && !L.licenceOk('CC-BY-SA-4.0', { allowCredit: true }).ok && !L.licenceOk(undefined).ok,
      'licence: CC BY only with --allow-credit; share-alike and unknown refused');
    result(L.ownerOf('https://mail.google.com/x') === 'Google LLC' && L.ownerOf('https://www.claude.ai') === 'Anthropic PBC' && L.ownerOf('https://tidepool.example/') === null, 'owners: the host, then its parent domains; unknown is null');
  }

  // 5. the whole get, offline
  const film = fs.mkdtempSync(path.join(os.tmpdir(), 'cinetic-logos-film-'));
  fs.mkdirSync(path.join(film, 'public'), { recursive: true });
  fs.mkdirSync(path.join(film, 'src'), { recursive: true });
  {
    const s = await cli(['search', 'tidepool']);
    result(s.code === 0 && /#1\s+Tidepool/.test(s.out) && /gilbarbara:tidepool/.test(s.out) && /svgl:7/.test(s.out) && /simple-icons:tidepool/.test(s.out), 'search: one brand, its members in three collections', s.out.split('\n').slice(0, 5).join(' | '));
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
    result(ref.code === 0 && re.files.mark.from === 'svgl' && re.files.markDark?.from === 'svgl' && re.files.wordmark?.from === 'svgl', 'get svgl:7 --as: that collection\'s mark, its own dark version and wordmark', JSON.stringify(re?.files && Object.fromEntries(Object.entries(re.files).map(([k, v]) => [k, v.from]))));
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
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
if (verbose) console.log(`requests answered from fixtures: ${requested.length}`);
process.exit(failed ? 1 : 0);
