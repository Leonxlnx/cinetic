#!/usr/bin/env node
/**
 * font-match.mjs: pick the free face closest to a target by measured width and x-height, never by eye.
 *
 * A stand-in face matched by cap height alone runs 10-26 % too narrow or too wide, and the line's rhythm goes with
 * it; the closest free face changes from film to film. This script sets one test line in every candidate face, in
 * the same Chrome the film renders in (Remotion's own), and measures each render exactly the way it measures the
 * target: the ink width, the x-height (the dense band between the x-line and the baseline), the ascender height
 * above the baseline and the stem thickness. For each face it takes the weight whose stems match the target's, the
 * size whose x-height matches, and the letter-spacing that closes the width still left, then ranks the faces by
 * their natural width (at tracking 0): the less tracking a face needs, the closer its letters are to the target's.
 *
 * Targets (one of):
 *   --crop <png|jpg> [--box x0,y0,x1,y1] [--frame-h N]
 *        a reference frame, or a crop of one, holding the test line on a plain ground. --box is in px or in 0-1
 *        shares of the image; --frame-h is the height of the frame the crop came from (default: the image's own
 *        height when --box is given), so sizes print at 1080p.
 *   --like <font file | name> [--like-weight 500] [--like-track 0]
 *        a brand's own face that cannot ship (licensed, desktop only): the closest free stand-in, sized relative to it.
 *   --width <px> --xh <px> [--asc <px>] [--stem <px>] [--frame-h N]
 *        numbers measured elsewhere (ink width, x-height, ascender height, stem width of the test line).
 *
 * Candidates: --candidates a,b,c, each an @fontsource-variable name (looked up in src/brand/fonts/<name>/, then
 * node_modules/@fontsource-variable/<name>/; --fetch npm-packs the rest into a temp folder, nothing installed) or a
 * font file (.woff2, .woff, .ttf, .otf). The default list is the face set's match pool (scripts/faces.json: the
 * set's faces first, Inter the default, then a few more neutral sans); --pool mono or --pool serif ranks the set's
 * mono or serif stand-ins instead (a serif only stands in for a brand-supplied serif). An optical-size face (Inter,
 * DM Sans) is measured from its opsz file, at the cut its size takes. Names it cannot find are skipped and listed.
 *
 * Other options:
 *   --text "..."      the test line, exactly as it reads in the target (required; 2-6 words, lowercase-led)
 *   --pool sans|mono|serif  which of the face set's match pools to rank when --candidates is not given (default sans)
 *   --weights a,b,..  the weights tried per face (default 300-700 every 50); --weight N fixes one (no stem match)
 *   --top N           rows printed (default 8)
 *   --json <file>     every measurement as JSON
 *   --sheet <file>    a PNG: the target on top, then each face set at its matched weight, size and tracking
 *   --dir <project>   the film project (default .); Remotion's browser is taken from its node_modules
 *
 * Read the result: under 3 % natural width the face fits as it is; up to 10 % with tracking of 0.08 em or less it
 * fits with that tracking (write it into TYPE); past that try the next face. Optical-size faces (Inter) are measured
 * at their display cut. Then vendor the pick with add-font.mjs and set TYPE's weight and track from the printed line
 * (references/copy-and-type.md §6).
 *
 * Usage:
 *   node scripts/font-match.mjs --crop ref/frame.png --box 400,420,1480,580 --text "plans change but people stay"
 *   node scripts/font-match.mjs --like brand/Brand-Medium.otf --text "Ship it on Friday" --candidates geist,inter,manrope --fetch
 *   node scripts/font-match.mjs --width 1012 --xh 41 --asc 58 --text "plans change but people stay" --frame-h 1080 --weight 500
 * Exit codes: 0 ranked, 1 failed (the message says why), 2 bad arguments.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HELP = readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, '');
// the face set's match pools (scripts/faces.json); the fallback list keeps the script usable without it
const SET = (() => { try { return JSON.parse(readFileSync(join(HERE, 'faces.json'), 'utf8')); } catch { return null; } })();
const POOLS = { sans: ['inter', 'inter-tight', 'geist', 'dm-sans', 'google-sans-flex', 'urbanist', 'manrope', 'plus-jakarta-sans', 'public-sans', 'hanken-grotesk', 'instrument-sans', 'mona-sans', 'outfit'], mono: ['geist-mono', 'jetbrains-mono'], serif: ['literata', 'newsreader', 'source-serif-4'], ...(SET?.match ?? {}) };
const WIN = process.platform === 'win32';
let tmp = null;
const cleanup = () => { if (tmp) rmSync(tmp, { recursive: true, force: true }); tmp = null; };
const die = (msg, code = 1) => { cleanup(); console.error(`font-match: ${msg}`); process.exit(code); };

// ---- arguments -------------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP.trim()); process.exit(0); }
const A = {};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i];
  if (!k.startsWith('--')) die(`unexpected argument "${k}"`, 2);
  const key = k.slice(2);
  if (key === 'fetch') { A.fetch = true; continue; }
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) die(`${k} needs a value`, 2);
  A[key] = v;
  i++;
}
const known = ['crop', 'box', 'frame-h', 'like', 'like-weight', 'like-track', 'width', 'xh', 'asc', 'stem', 'candidates', 'pool', 'text', 'weights', 'weight', 'top', 'json', 'sheet', 'dir', 'fetch'];
for (const k of Object.keys(A)) if (!known.includes(k)) die(`unknown option --${k} (see --help)`, 2);
if (!A.text) die('--text is required: the test line exactly as it reads in the target', 2);
const kinds = [A.crop && 'crop', A.like && 'like', A.width && 'numbers'].filter(Boolean);
if (kinds.length !== 1) die('give one target: --crop <image>, --like <font> or --width/--xh', 2);
if (kinds[0] === 'numbers' && !A.xh) die('--width needs --xh (the x-height in px)', 2);
const num = (v, name) => { const n = Number(v); if (!Number.isFinite(n)) die(`${name} must be a number`, 2); return n; };
const DIR = resolve(A.dir ?? '.');
const weights = A.weight ? [num(A.weight, '--weight')] : (A.weights ?? '300,350,400,450,500,550,600,650,700').split(',').map((w) => num(w, '--weights'));
const TOP = A.top ? num(A.top, '--top') : 8;

// ---- fonts -----------------------------------------------------------------------------------
const FONT_EXT = /\.(woff2|woff|ttf|otf)$/i;
const pickFile = (files, name) => {
  const up = files.filter((f) => FONT_EXT.test(f) && !/italic/i.test(f));
  return up.find((f) => /latin-opsz-normal/.test(f)) ?? up.find((f) => /-latin-wght-normal/.test(f)) ?? up.find((f) => new RegExp(`${name}.*latin.*normal`).test(f)) ?? up[0];
};
const fromDir = (d, name) => {
  if (!existsSync(d)) return null;
  const files = readdirSync(d, { recursive: true }).map(String).map((f) => join(d, f));
  const f = pickFile(files, name);
  return f ? f : null;
};
const npm = (args, opts) => (WIN ? execFileSync('npm', args.map((a) => `"${a}"`), { ...opts, shell: true }) : execFileSync('npm', args, opts));
const fetchFace = (name) => {
  tmp ??= mkdtempSync(join(tmpdir(), 'cinetic-fontmatch-'));
  const d = join(tmp, name);
  execFileSync(WIN ? 'cmd' : 'mkdir', WIN ? ['/c', 'mkdir', d] : ['-p', d]);
  const out = npm(['pack', `@fontsource-variable/${name}`, '--pack-destination', d, '--silent'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').pop().trim();
  execFileSync('tar', ['-xzf', basename(out)], { cwd: d }); // relative: GNU tar reads "C:\..." as a remote host
  return fromDir(join(d, 'package', 'files'), name);
};
const findFace = (spec) => {
  if (FONT_EXT.test(spec)) return existsSync(resolve(spec)) ? { name: basename(spec).replace(FONT_EXT, '').replace(/-latin.*$/, ''), file: resolve(spec) } : null;
  const name = spec.replace(/^@fontsource-variable\//, '');
  const file = fromDir(join(DIR, 'src', 'brand', 'fonts', name), name) ?? fromDir(join(DIR, 'node_modules', '@fontsource-variable', name, 'files'), name) ??
    fromDir(join(HERE, '..', 'assets', 'remotion-starter', 'node_modules', '@fontsource-variable', name, 'files'), name);
  if (file) return { name, file };
  if (!A.fetch) return null;
  try { const f = fetchFace(name); return f ? { name, file: f } : null; } catch { return null; }
};
const b64 = (f) => readFileSync(f).toString('base64');
if (A.pool && !POOLS[A.pool]) die(`--pool is one of ${Object.keys(POOLS).join(', ')}`, 2);
if (A.pool && A.candidates) die('give --candidates or --pool, not both', 2);
const specs = (A.candidates ? A.candidates.split(',') : POOLS[A.pool ?? 'sans']).map((s) => s.trim()).filter(Boolean);
const faces = [];
const missing = [];
for (const s of specs) {
  const f = findFace(s);
  if (f) faces.push({ ...f, axes: /opsz/.test(f.file) ? 'opsz' : '', data: b64(f.file) });
  else missing.push(s);
}
if (!faces.length) die(`no candidate face found (${missing.join(', ')}): vendor some with add-font.mjs, pass font files, or add --fetch`);

// ---- the target ------------------------------------------------------------------------------
const target = { kind: kinds[0] };
if (target.kind === 'crop') {
  const f = resolve(A.crop);
  if (!existsSync(f)) die(`${A.crop} not found`);
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extname(f).toLowerCase()];
  if (!mime) die('--crop takes a .png, .jpg or .webp image', 2);
  target.image = `data:${mime};base64,${b64(f)}`;
  if (A.box) {
    target.box = A.box.split(',').map((v) => num(v, '--box'));
    if (target.box.length !== 4) die('--box is x0,y0,x1,y1', 2);
  }
} else if (target.kind === 'like') {
  const f = findFace(A.like);
  if (!f) die(`--like ${A.like}: no such font file or face (add --fetch for an @fontsource-variable name)`);
  target.face = { name: `like:${f.name}`, file: f.file, data: b64(f.file) };
  target.weight = A['like-weight'] ? num(A['like-weight'], '--like-weight') : 500;
  target.track = A['like-track'] ? num(A['like-track'], '--like-track') : 0;
} else {
  target.m = { width: num(A.width, '--width'), xh: num(A.xh, '--xh'), asc: A.asc ? num(A.asc, '--asc') : null, stem: A.stem ? num(A.stem, '--stem') : null };
}

// ---- the page: render, measure, fit (one function, run inside Chrome) --------------------------
/* eslint-disable no-undef */
async function inPage(P) {
  const M = 200; // the size every face is rendered and measured at
  // the measure: ink box, the x-height band (rows dense in ink), ascender height above the baseline, stem width
  const analyse = (img, w, h) => {
    const n = w * h;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = (0.2126 * img[4 * i] + 0.7152 * img[4 * i + 1] + 0.0722 * img[4 * i + 2]) / 255;
    const border = [];
    for (let x = 0; x < w; x++) border.push(L[x], L[(h - 1) * w + x]);
    for (let y = 0; y < h; y++) border.push(L[y * w], L[y * w + w - 1]);
    border.sort((a, b) => a - b);
    const bg = border[border.length >> 1];
    const d = new Float32Array(n);
    const strong = [];
    for (let i = 0; i < n; i++) { d[i] = Math.abs(L[i] - bg); if (d[i] > 0.08) strong.push(d[i]); }
    if (strong.length < 20) return null;
    strong.sort((a, b) => a - b);
    const ink = strong[Math.floor(strong.length * 0.9)];
    const on = new Uint8Array(n);
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] / ink >= 0.5) { on[i] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const rows = [];
    for (let y = y0; y <= y1; y++) { let c = 0; for (let x = x0; x <= x1; x++) c += on[y * w + x]; rows.push(c); }
    const nz = rows.filter((c) => c > 0).sort((a, b) => a - b);
    const p90 = nz[Math.floor(nz.length * 0.9)];
    const dense = rows.map((c, i) => (c >= 0.4 * p90 ? i : -1)).filter((i) => i >= 0);
    const xTop = y0 + dense[0];
    const base = y0 + dense[dense.length - 1] + 1;
    const runs = [];
    for (let y = Math.round(xTop + 0.4 * (base - xTop)); y <= Math.round(xTop + 0.6 * (base - xTop)); y++) {
      let r = 0;
      for (let x = x0; x <= x1 + 1; x++) {
        if (x <= x1 && on[y * w + x]) r++;
        else if (r) { runs.push(r); r = 0; }
      }
    }
    runs.sort((a, b) => a - b);
    return { width: x1 - x0 + 1, xh: base - xTop, asc: base - y0, stem: runs.length ? runs[runs.length >> 1] : null, left: x0, top: y0, base };
  };
  const loadFace = async (name, data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const ff = new FontFace(name, bytes, { weight: '1 1000' });
    await ff.load();
    document.fonts.add(ff);
  };
  const render = (family, weight, size, track, text, ink = '#000', scale = 1) => {
    const c = document.createElement('canvas');
    const g0 = c.getContext('2d');
    g0.font = `${weight} ${size}px "${family}"`;
    g0.letterSpacing = `${track}em`;
    const tw = g0.measureText(text).width;
    c.width = Math.ceil((tw + size * 1.2) * scale);
    c.height = Math.ceil(size * 1.8 * scale);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.scale(scale, scale);
    g.font = `${weight} ${size}px "${family}"`;
    g.letterSpacing = `${track}em`;
    g.fillStyle = ink;
    g.textBaseline = 'alphabetic';
    g.fillText(text, size * 0.6, size * 1.25);
    return c;
  };
  // a line set at font-size `size` (so an optical-size axis takes that size's cut, as the film's DOM text does),
  // drawn at M px of resolution, measured in px at `size`
  const measure = (family, weight, size, track, text) => {
    const k = M / size;
    const c = render(family, weight, size, track, text, '#000', k);
    const a = analyse(c.getContext('2d').getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    return a && { width: a.width / k, xh: a.xh / k, asc: a.asc / k, stem: a.stem === null ? null : a.stem / k };
  };

  // the target
  let T;
  let crop = null; // the target's own pixels, for the sheet
  if (P.target.kind === 'crop') {
    const im = new Image();
    im.src = P.target.image;
    await im.decode();
    let [bx0, by0, bx1, by1] = P.target.box ?? [0, 0, im.naturalWidth, im.naturalHeight];
    if (P.target.box && Math.max(bx0, by0, bx1, by1) <= 1) [bx0, by0, bx1, by1] = [bx0 * im.naturalWidth, by0 * im.naturalHeight, bx1 * im.naturalWidth, by1 * im.naturalHeight];
    const cw = Math.round(bx1 - bx0), ch = Math.round(by1 - by0);
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    g.drawImage(im, Math.round(bx0), Math.round(by0), cw, ch, 0, 0, cw, ch);
    T = analyse(g.getImageData(0, 0, cw, ch).data, cw, ch);
    if (!T) return { error: 'no ink found in the crop: give a --box around one line on a plain ground' };
    crop = c;
    T.imageH = im.naturalHeight;
  } else if (P.target.kind === 'like') {
    await loadFace('target', P.target.face.data);
    T = measure('target', P.target.weight, M, P.target.track, P.text);
    if (!T) return { error: 'the --like face rendered no ink' };
  } else T = { ...P.target.m };
  const nGaps = Math.max(1, [...P.text].length - 1); // letter-spacing after every character; the ink spans n-1 of them

  // every face: the weight whose stems match, the size whose x-height matches, the tracking that closes the width
  const rows = [];
  for (const [fi, f] of P.faces.entries()) {
    const fam = `cand${fi}`; // every face loads under its own family, so two files of one family never mix
    try { await loadFace(fam, f.data); } catch (e) { rows.push({ name: f.name, error: `the face did not load: ${String(e).slice(0, 80)}` }); continue; }
    const mid = P.weights.includes(500) ? 500 : P.weights[Math.floor(P.weights.length / 2)];
    const m0 = measure(fam, mid, M, 0, P.text);
    if (!m0) { rows.push({ name: f.name, error: 'no ink rendered' }); continue; }
    const s1 = (M * T.xh) / m0.xh; // the size its x-height matches at, first guess
    const per = P.weights.map((w) => ({ w, m: measure(fam, w, s1, 0, P.text) })).filter((r) => r.m);
    if (!per.length) { rows.push({ name: f.name, error: 'no ink rendered' }); continue; }
    let weight = per[0].w;
    let stemErr = null;
    const tStem = T.stem && T.xh ? T.stem / T.xh : null;
    if (tStem && per.length > 1) {
      const ratio = per.map((r) => (r.m.stem ?? 0) / r.m.xh);
      let best = 0;
      for (let i = 1; i < per.length; i++) if (Math.abs(ratio[i] - tStem) < Math.abs(ratio[best] - tStem)) best = i;
      weight = per[best].w;
      const nb = ratio[best] < tStem ? best + 1 : best - 1; // interpolate toward the bracketing weight
      if (nb >= 0 && nb < per.length && (ratio[nb] - tStem) * (ratio[best] - tStem) < 0) {
        const k = (tStem - ratio[best]) / (ratio[nb] - ratio[best]);
        weight = Math.round((per[best].w + k * (per[nb].w - per[best].w)) / 10) * 10;
      }
    } else if (P.weights.length > 1) weight = mid;
    const m = measure(fam, weight, s1, 0, P.text);
    if (!m) { rows.push({ name: f.name, error: 'no ink rendered' }); continue; }
    if (tStem && m.stem) stemErr = m.stem / m.xh / tStem - 1;
    const size = (s1 * T.xh) / m.xh; // px in the target's pixels
    const natural = (m.width * size) / s1;
    const natErr = natural / T.width - 1;
    const track = (T.width - natural) / (nGaps * size);
    const v = measure(fam, weight, size, track, P.text); // the fitted line, measured again at its size
    const residue = v ? v.width / T.width - 1 : null;
    const ascErr = T.asc && m.asc ? m.asc / m.xh / (T.asc / T.xh) - 1 : null;
    const score = Math.abs(natErr) + 0.5 * Math.abs(ascErr ?? 0) + 0.25 * Math.abs(stemErr ?? 0) + 2 * Math.max(0, Math.abs(track) - 0.08);
    rows.push({ name: f.name, fam, axes: f.axes, weight, size, natErr, track, residue, ascErr, stemErr, xhPerEm: m.xh / s1, ascPerEm: m.asc / s1, score,
      fit: Math.abs(natErr) <= 0.03 ? 'as is' : Math.abs(natErr) <= 0.1 && Math.abs(track) <= 0.08 ? 'with tracking' : 'far' });
  }
  const ok = rows.filter((r) => !r.error).sort((a, b) => a.score - b.score);

  // the sheet: the target, then each face at its matched weight, size and tracking, at the target's scale
  let sheet = null;
  if (P.sheet && ok.length) {
    const shown = ok.slice(0, P.top);
    // every row shares the target's baseline and ink left edge, so widths compare by eye too
    const left = crop ? T.left : 10;
    const asc = T.asc ?? T.xh * 1.4;
    const base = crop ? T.base : Math.ceil(asc * 1.25);
    const boxH = crop ? crop.height : Math.ceil(base + T.xh * 0.6);
    const rowH = Math.max(boxH, Math.ceil(asc * 1.7)) + 26;
    const W = Math.max(crop ? crop.width : 0, left + T.width * 1.25) + 40;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W); c.height = rowH * (shown.length + 1) + 6;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    const label = (s, i) => { g.font = '14px sans-serif'; g.fillStyle = '#666'; g.letterSpacing = '0px'; g.fillText(s, 20, i * rowH + 16); };
    if (crop) g.drawImage(crop, 20, 22);
    else { g.strokeStyle = '#08965A'; g.lineWidth = 2; g.strokeRect(20 + left, 22 + base - asc, T.width, asc); }
    label(`target: ink width ${T.width} px, x-height ${T.xh} px`, 0);
    shown.forEach((r, i) => {
      const top = (i + 1) * rowH + 22;
      g.save();
      g.beginPath(); g.rect(0, top - 4, c.width, rowH - 22); g.clip();
      g.drawImage(render(r.fam, r.weight, r.size, r.track, P.text, '#111'), 20 + left - r.size * 0.6, top + base - r.size * 1.25);
      g.restore();
      label(`${i + 1}. ${r.name}${r.axes ? ' (opsz)' : ''}  weight ${r.weight}  natural ${(r.natErr * 100).toFixed(1)} %  track ${r.track >= 0 ? '+' : ''}${r.track.toFixed(3)} em`, i + 1);
    });
    sheet = c.toDataURL('image/png');
  }
  return { T, rows, ok, sheet };
}

// ---- run it in Remotion's browser --------------------------------------------------------------
const req = (base) => { try { return createRequire(join(base, 'package.json')).resolve('@remotion/renderer'); } catch { return null; } };
const rendererPath = req(DIR) ?? req(join(HERE, '..', 'assets', 'remotion-starter'));
if (!rendererPath) die('@remotion/renderer not found: run this from a film project (npm install, or new-film.sh --link-modules)');
const Rmod = await import(pathToFileURL(rendererPath).href);
const openBrowser = Rmod.openBrowser ?? Rmod.default?.openBrowser;
let browser;
let res;
try {
  browser = await openBrowser('chrome', { logLevel: 'error', chromiumOptions: { gl: 'swangle' } });
  const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => undefined });
  res = await page.evaluate(inPage, { text: A.text, target, faces: faces.map(({ name, axes, data }) => ({ name, axes, data })), weights, sheet: Boolean(A.sheet), top: TOP });
} catch (e) {
  if (browser) await browser.close({ silent: true }).catch(() => undefined);
  die(`the browser run failed: ${String(e?.message ?? e).split('\n')[0]}`);
}
await browser.close({ silent: true }).catch(() => undefined);
cleanup();
if (res.error) die(res.error);

// ---- report ------------------------------------------------------------------------------------
const T = res.T;
const frameH = A['frame-h'] ? num(A['frame-h'], '--frame-h') : target.kind === 'crop' && A.box ? T.imageH : null;
const k1080 = frameH ? 1080 / frameH : null;
const pct = (v) => (v === null || v === undefined ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} %`);
const pad = (s, n) => String(s).padEnd(n);
console.log(`target (${target.kind}): "${A.text}"  ink width ${T.width} px, x-height ${T.xh} px${T.asc ? `, ascender ${T.asc} px (asc/xh ${(T.asc / T.xh).toFixed(2)})` : ''}${T.stem ? `, stem ${T.stem} px` : ''}${frameH ? `, frame ${frameH} high` : ''}`);
console.log(`${pad('face', 22)}${pad('weight', 8)}${pad(k1080 ? 'size@1080' : target.kind === 'like' ? 'size/brand' : 'size px', 12)}${pad('natural', 10)}${pad('track em', 10)}${pad('asc/xh', 9)}${pad('stems', 9)}fit`);
for (const r of res.ok.slice(0, TOP)) {
  const size = k1080 ? (r.size * k1080).toFixed(1) : target.kind === 'like' ? `${((r.size / 200) * 100).toFixed(1)} %` : r.size.toFixed(1);
  console.log(`${pad(r.name + (r.axes ? ' (opsz)' : ''), 22)}${pad(r.weight, 8)}${pad(size, 12)}${pad(pct(r.natErr), 10)}${pad((r.track >= 0 ? '+' : '') + r.track.toFixed(3), 10)}${pad(pct(r.ascErr), 9)}${pad(pct(r.stemErr), 9)}${r.fit}`);
}
for (const r of res.rows.filter((x) => x.error)) console.log(`${pad(r.name, 22)}skipped: ${r.error}`);
if (missing.length) console.log(`not found${A.fetch ? '' : ' (add --fetch to npm-pack them)'}: ${missing.join(', ')}`);
const best = res.ok[0];
if (best) {
  const sz = k1080 ? `, ${(best.size * k1080).toFixed(0)} px at 1080p` : target.kind === 'like' ? `, at ${((best.size / 200) * 100).toFixed(1)} % of the brand face's size` : '';
  console.log(`pick: ${best.name}, weight ${best.weight}${sz}, tracking ${best.track >= 0 ? '+' : ''}${best.track.toFixed(3)} em (${best.fit}; natural width ${pct(best.natErr)}, fitted residue ${pct(best.residue)})`);
  console.log(`  TYPE role for this line: { weight: ${best.weight}, track: ${Number(best.track.toFixed(3))} }  ->  node scripts/add-font.mjs ${best.name}`);
  const looks = (SET?.looks ?? []).filter((l) => [l.display, l.text, l.mono, ...(l.alternates ?? [])].includes(best.name)).map((l) => l.id);
  if (SET) console.log(looks.length ? `  in the face set: ${looks.join(', ')} (scripts/faces.json)` : '  outside the face set (scripts/faces.json): keep it only for a stated reason in TREATMENT.md');
}
if (A.json) writeFileSync(resolve(A.json), JSON.stringify({ text: A.text, target: { kind: target.kind, ...T, frameH }, ranked: res.ok, skipped: res.rows.filter((x) => x.error), missing }, null, 1));
if (A.sheet && res.sheet) writeFileSync(resolve(A.sheet), Buffer.from(res.sheet.split(',')[1], 'base64'));
process.exit(0);
