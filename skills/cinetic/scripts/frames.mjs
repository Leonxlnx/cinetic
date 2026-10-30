#!/usr/bin/env node
// frames.mjs: look at the film fast. Stills of several frames in one call, a labelled contact sheet in one call,
// both from one bundle that is built once per state of the source and reused by every call (and by render.sh),
// rendered with the GL backend this machine renders fastest and correctly.
//
//   node scripts/frames.mjs still 120,480,1000            # out/stills/f0120.png ... at half size, one browser
//   node scripts/frames.mjs still 600 --scale 1            # one frame at full size
//   node scripts/frames.mjs sheet                          # out/qa/sheet.png: about 36 frames over the film, 6 across
//   node scripts/frames.mjs sheet --every 30               # every 30th frame (a 60 fps film: two tiles a second)
//   node scripts/frames.mjs sheet --frames 840-1079 --every 4 --out out/qa/field.png   # one act, every 4th frame
//   node scripts/frames.mjs sheet --frames 358-364,1796 --scale 0.5                      # a cue and its neighbours
//   node scripts/frames.mjs bundle                         # build or reuse the bundle; prints its folder
//   node scripts/frames.mjs gl                             # the GL backend renders use here (probed once, cached)
//
// The bundle. `npx remotion bundle` costs from half a minute to several minutes on a laptop, and `npx remotion still
// src/index.ts` pays it on every call. Here the bundle lives in out/.bundle/<key>/, where the key hashes everything a
// bundle is made of: every file under the entry's folder (src/), remotion.config.ts, package.json, tsconfig.json, the
// Remotion version and public/ (path, size, mtime). An unchanged source reuses it in well under a second; any edit
// builds a new one (with Remotion's webpack cache, so only the changed modules compile). The newest 3 bundles and
// any used in the last 2 hours stay; older ones are removed. render.sh takes its frozen copy from here (--copy-to).
//
// The frames. One `npx remotion render <bundle> <comp> --sequence --frames=<list>` call: one browser, one evaluation
// of the composition list, the frames rendered in parallel tabs. It reads remotion.config.ts like every npx remotion
// command (browser, JPEG quality, colour, timeouts), so a still here is the frame the film renders.
//
// The GL backend. remotion.config.ts asks for 'angle' (the GPU through ANGLE). `gl` renders the same frames with
// each backend this platform offers (angle and swangle everywhere; angle-egl and egl on Linux), keeps the ones that
// finish and match the software reference (swangle, PSNR >= 32 dB, so a GPU path that draws black or garbage is
// refused), and picks the fastest; out/.bundle/gl.json caches the answer per machine and Remotion version
// (CINETIC_GL=<backend> overrides it, --force probes again). still and sheet use the cached pick when there is one,
// else the config's backend, and when a render fails with it they retry once with swangle (software, always works)
// and record that. render.sh runs `gl` before a final render.
//
// Options (still, sheet):
//   --comp ID          composition (default Film)
//   --frames SEL       frames: a list 12,40,96, a range 240-479, or both (0-100,400); still takes it positionally
//   --every N          sheet: every Nth frame of the range (default: N that gives about 36 tiles)
//   --scale S          still 0.5, sheet 0.25 (a 480 px tile from a 1920 px film)
//   --cols N           sheet columns (default 6)
//   --out PATH         still: a folder (default out/stills); sheet: the PNG (default out/qa/sheet.png)
//   --format F         png (still default) or jpeg (sheet tiles, default)
//   --props JSON|FILE  input props for the composition
//   --concurrency N    parallel tabs (default: the frame count, at most Remotion's default of half the cores, max 8)
//   --gl X             this backend for this call (angle, swangle, angle-egl, egl, vulkan)
//   --entry FILE       entry point (default src/index.ts)
//   --fresh            rebuild the bundle even when one matches
//   -- ARGS            passed to `remotion render` as they are
// bundle: --entry FILE, --fresh, --copy-to DIR (also copy it there: render.sh's frozen bundle), --quiet.
// gl:     --force (probe again), --comp ID, --bundle DIR (probe on this bundle), --quiet (print only the backend).
//
// Prints the files it wrote. Exit 0 ok, 1 a bundle or render failed, 2 usage. Needs node, npx with @remotion/cli
// (the project's), and ffmpeg/ffprobe for the sheet and the probe. Run it from the project root.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const dd = argv.indexOf('--');
const PASS = dd < 0 ? [] : argv.slice(dd + 1);
const ARGS = dd < 0 ? argv : argv.slice(0, dd);
const help = () => {
  const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  console.log(lines.slice(1, lines.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
};
if (!ARGS.length || ARGS.includes('-h') || ARGS.includes('--help')) { help(); process.exit(ARGS.length ? 0 : 2); }
const CMD = ARGS[0];
const FLAGS = new Set(['fresh', 'quiet', 'force']);
const opt = { _: [] };
for (let i = 1; i < ARGS.length; i++) {
  const a = ARGS[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split(/=(.*)/s);
    if (FLAGS.has(k)) opt[k] = true;
    else if (v !== undefined) opt[k] = v;
    else if (i + 1 < ARGS.length) opt[k] = ARGS[++i];
    else usage(`--${k} needs a value`);
  } else opt._.push(a);
}
function usage(msg) { console.error(`frames.mjs: ${msg} (see --help)`); process.exit(2); }
function die(msg) { console.error(`frames.mjs: ${msg}`); process.exit(1); }
const say = (msg) => { if (!opt.quiet) console.error(`frames: ${msg}`); };
const t0 = Date.now();
const secs = (t = t0) => ((Date.now() - t) / 1000).toFixed(1);

// project root: the folder holding the entry (the current folder, else the one above this script)
const ENTRY = opt.entry || 'src/index.ts';
if (!fs.existsSync(ENTRY)) {
  if (fs.existsSync(path.join(HERE, '..', ENTRY))) process.chdir(path.join(HERE, '..'));
  else die(`no ${ENTRY} here: run from the project root or pass --entry`);
}
const ROOT = process.cwd();
const CACHE = path.join(ROOT, 'out', '.bundle');
const isWin = process.platform === 'win32';
// Image sequences go to a fresh folder named relative to the project root: the Remotion CLI refuses a sequence folder
// whose path holds a dot anywhere (it reads the text after the last dot as an extension), so never out/.bundle/...
const tmpDir = (name) => path.join('out', name);

// The project's Remotion CLI, run by node itself: `npx remotion` spends 5-20 s starting npm on every call (18 s
// measured on a busy laptop, against 4 s for node on the CLI file). npx only when the CLI cannot be resolved.
// args[0] is always 'remotion'.
const REMOTION_JS = (() => {
  try {
    const pj = createRequire(path.join(ROOT, 'package.json')).resolve('@remotion/cli/package.json');
    const bin = JSON.parse(fs.readFileSync(pj, 'utf8')).bin;
    const js = path.join(path.dirname(pj), typeof bin === 'string' ? bin : bin.remotion);
    return fs.existsSync(js) ? js : null;
  } catch { return null; }
})();
const q = (a) => (/[\s"&|<>^%,;=()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a); // cmd.exe quoting for npx.cmd
function npx(args, { quiet = true } = {}) {
  const o = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 };
  const r = REMOTION_JS ? spawnSync(process.execPath, [REMOTION_JS, ...args.slice(1)], o)
    : isWin ? spawnSync(['npx', ...args].map(q).join(' '), { ...o, shell: true }) : spawnSync('npx', args, o);
  if (!quiet) process.stderr.write(r.stdout || '');
  return { code: r.status ?? 1, out: r.stdout || '', err: r.stderr || '' };
}
// a failed run's message: ANSI colours and stack frames dropped, the end kept
const errText = (r, n = 1800) => (r.err || r.out || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter((l) => !/^\s+at /.test(l)).join('\n').trim().slice(-n);
const tool = (bin, args) => spawnSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });

// ---------- the bundle ----------
const sha = () => crypto.createHash('sha1');
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push([p, st]);
  }
  return out;
}
function sourceKey() {
  const h = sha();
  const srcDir = path.dirname(path.resolve(ENTRY));
  h.update(`entry ${path.relative(ROOT, path.resolve(ENTRY))}\n`);
  for (const [p, st] of walk(srcDir)) { h.update(`${path.relative(ROOT, p)} ${st.size}\n`); h.update(fs.readFileSync(p)); }
  for (const f of ['remotion.config.ts', 'remotion.config.js', 'package.json', 'tsconfig.json']) if (fs.existsSync(f)) { h.update(`${f}\n`); h.update(fs.readFileSync(f)); }
  for (const [p, st] of walk('public')) h.update(`${path.relative(ROOT, p)} ${st.size} ${Math.round(st.mtimeMs)}\n`);
  try { h.update(`remotion ${JSON.parse(fs.readFileSync('node_modules/remotion/package.json', 'utf8')).version}\n`); } catch { /* no local install: npx finds one */ }
  return h.digest('hex').slice(0, 16);
}
function prune(keep) {
  let dirs = [];
  try { dirs = fs.readdirSync(CACHE).filter((d) => /^[0-9a-f]{16}$/.test(d)); } catch { return; }
  const used = (d) => { try { return fs.statSync(path.join(CACHE, d, '.used')).mtimeMs; } catch { return 0; } };
  const order = dirs.map((d) => [d, used(d)]).sort((a, b) => b[1] - a[1]);
  for (const [d, t] of order.slice(3)) {
    if (d === keep || Date.now() - t < 2 * 3600e3) continue;
    try { fs.rmSync(path.join(CACHE, d), { recursive: true, force: true }); } catch { /* in use on Windows: next time */ }
  }
  // half-built bundles of runs that died
  for (const d of fs.readdirSync(CACHE).filter((x) => /^[0-9a-f]{16}\-tmp/.test(x))) {
    try { if (Date.now() - fs.statSync(path.join(CACHE, d)).mtimeMs > 3600e3) fs.rmSync(path.join(CACHE, d), { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
function ensureBundle() {
  const t = Date.now();
  const key = sourceKey();
  const dir = path.join(CACHE, key);
  if (!opt.fresh && fs.existsSync(path.join(dir, 'index.html'))) {
    fs.writeFileSync(path.join(dir, '.used'), new Date().toISOString());
    say(`bundle ${key} reused (source unchanged, ${secs(t)} s)`);
    return dir;
  }
  fs.mkdirSync(CACHE, { recursive: true });
  const tmp = path.join(CACHE, `${key}-tmp${process.pid}`);
  say(`bundling ${ENTRY} (source changed: ${key}); later calls on this source reuse it`);
  const r = npx(['remotion', 'bundle', ENTRY, '--out-dir', tmp, '--log=error']);
  if (r.code !== 0 || !fs.existsSync(path.join(tmp, 'index.html'))) {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
    die(`npx remotion bundle failed:\n${errText(r)}`);
  }
  if (opt.fresh && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  try { fs.renameSync(tmp, dir); } catch { fs.rmSync(tmp, { recursive: true, force: true }); } // another call won the race
  fs.writeFileSync(path.join(dir, '.used'), new Date().toISOString());
  say(`bundle ${key} built in ${secs(t)} s`);
  prune(key);
  return dir;
}

// ---------- the GL backend ----------
const GLJSON = path.join(CACHE, 'gl.json');
function machineKey() {
  let rv = '';
  try { rv = JSON.parse(fs.readFileSync('node_modules/remotion/package.json', 'utf8')).version; } catch { /* ignore */ }
  const browser = process.env.REMOTION_BROWSER || process.env.CHROMIUM_PATH || '';
  return [os.hostname(), process.platform, os.arch(), os.cpus()[0]?.model || '', rv, browser].join('|');
}
function readGl() { try { const g = JSON.parse(fs.readFileSync(GLJSON, 'utf8')); return g.key === machineKey() ? g : null; } catch { return null; } }
function writeGl(g) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(GLJSON, `${JSON.stringify({ key: machineKey(), at: new Date().toISOString(), ...g }, null, 1)}\n`); }
function glForCall() {
  if (opt.gl) return opt.gl;
  if (process.env.CINETIC_GL) return process.env.CINETIC_GL;
  return readGl()?.gl ?? null; // null: the config's backend
}

// ---------- frame selections ----------
function parseSel(sel) {
  const out = [];
  for (const part of String(sel).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) usage(`bad frame selection '${part}' (want 12,40 or 240-479)`);
    const a = +m[1], b = m[2] === undefined ? a : +m[2];
    if (b < a) usage(`bad range ${part}`);
    out.push([a, b]);
  }
  return out;
}
function compositions(bundle) {
  const meta = path.join(bundle, '.compositions.txt');
  let list = '';
  if (fs.existsSync(meta) && fs.statSync(meta).size > 0 && !opt.props) list = fs.readFileSync(meta, 'utf8');
  else {
    const args = ['remotion', 'compositions', bundle]; // the table prints at the default log level
    if (opt.props) args.push(`--props=${opt.props}`);
    const r = npx(args);
    if (r.code !== 0) die(`npx remotion compositions failed:\n${errText(r)}`);
    list = r.out;
    if (!opt.props) fs.writeFileSync(meta, list);
  }
  const comps = {};
  for (const line of list.split('\n')) {
    const m = /^\s*(\S+)\s+([\d.]+)\s+(\d+)x(\d+)\s+(\d+)/.exec(line);
    if (m) comps[m[1]] = { fps: +m[2], w: +m[3], h: +m[4], frames: +m[5] };
  }
  return comps;
}

// Render a frame selection to images in a fresh folder. Returns [{frame, file}] in frame order.
function renderFrames(bundle, comp, { frames, every = 1, scale, format, outDir, gl }) {
  fs.mkdirSync(outDir, { recursive: true });
  const n = frames.reduce((s, [a, b]) => s + Math.floor((b - a) / every) + 1, 0);
  const cores = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  const conc = opt.concurrency || String(Math.max(1, Math.min(n, 8, Math.round(cores / 2))));
  const sel = every > 1 ? `${frames[0][0]}-${frames[0][1]}` : frames.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(',');
  const args = ['remotion', 'render', bundle, comp, outDir, '--sequence', `--frames=${sel}`, `--image-format=${format}`,
    `--scale=${scale}`, `--concurrency=${conc}`, '--image-sequence-pattern=[frame].[ext]', '--log=error'];
  if (every > 1) args.push(`--every-nth-frame=${every}`);
  if (opt.props) args.push(`--props=${opt.props}`);
  const run = (g) => npx([...args, ...(g ? [`--gl=${g}`] : []), ...PASS]);
  const t = Date.now();
  let r = run(gl);
  // a GPU-path failure (the browser or its GPU process died, a GL context, a hung frame) retries once in software; an
  // error in the film's own code fails the same way on every backend, so it is reported at once
  const gpuish = /WebGL|GPU|EGL|ANGLE|context lost|Target closed|Session closed|crash|Browser (?:closed|disconnected|has disconnected)|Protocol error|timed out|Timeout/i;
  if (r.code !== 0 && gl !== 'swangle' && !opt.gl && !/--gl[= ]/.test(PASS.join(' ')) && gpuish.test(errText(r, 4000))) {
    say(`the render failed with ${gl || "the config's backend"}; retrying once with swangle (software GL)`);
    const r2 = run('swangle');
    if (r2.code === 0) { writeGl({ gl: 'swangle', why: `${gl || 'config backend'} failed: ${errText(r, 200)}` }); r = r2; }
  }
  if (r.code !== 0) die(`remotion render failed:\n${errText(r)}`);
  const files = fs.readdirSync(outDir).map((f) => [/^(?:element-)?(\d+)\.(png|jpe?g)$/i.exec(f), f]).filter(([m]) => m)
    .map(([m, f]) => ({ frame: +m[1], file: path.join(outDir, f) })).sort((a, b) => a.frame - b.frame);
  if (!files.length) die(`remotion render wrote no images to ${outDir}`);
  // with --every-nth-frame Remotion numbers the files 0, 1, 2 ... in output order, not by film frame
  if (every > 1) {
    const want = [];
    for (let f = frames[0][0]; f <= frames[0][1]; f += every) want.push(f);
    if (want.length !== files.length) say(`warning: ${files.length} images for ${want.length} frames (every ${every})`);
    files.forEach((x, i) => { x.frame = want[i] ?? x.frame; });
  }
  say(`${files.length} frame(s) of ${comp} at scale ${scale} in ${secs(t)} s (concurrency ${conc}, gl ${gl || 'from remotion.config.ts'})`);
  return files;
}

// ---------- labels for the sheet: a 5x7 pixel font drawn into an RGBA PAM, so no font file is needed ----------
const GLYPH = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], 3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  f: ['00110', '01001', '01000', '11100', '01000', '01000', '01000'], s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};
function labelLayer(W, H, labels, k) {
  const px = Buffer.alloc(W * H * 4); // transparent
  const put = (x, y, r, g, b, a) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a; };
  for (const { x, y, text } of labels) {
    const tw = text.length * 6 * k + k, th = 9 * k;
    for (let yy = 0; yy < th; yy++) for (let xx = 0; xx < tw; xx++) put(x + xx, y + yy, 0, 0, 0, 170);
    [...text].forEach((ch, ci) => {
      const g = GLYPH[ch] || GLYPH[' '];
      for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) if (g[gy][gx] === '1')
        for (let sy = 0; sy < k; sy++) for (let sx = 0; sx < k; sx++) put(x + k + ci * 6 * k + gx * k + sx, y + k + gy * k + sy, 255, 255, 255, 255);
    });
  }
  return Buffer.concat([Buffer.from(`P7\nWIDTH ${W}\nHEIGHT ${H}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n`), px]);
}

// ---------- commands ----------
function cmdBundle() {
  const dir = ensureBundle();
  if (opt['copy-to']) {
    const to = path.resolve(opt['copy-to']);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(dir, to, { recursive: true });
    fs.rmSync(path.join(to, '.used'), { force: true });
    console.log(to);
  } else console.log(dir);
}

function cmdStill() {
  const sel = opt.frames || opt._.join(',');
  if (!sel) usage('still wants frames: node scripts/frames.mjs still 120,480,1000');
  const comp = opt.comp || 'Film';
  const scale = opt.scale || '0.5';
  const format = opt.format || 'png';
  const bundle = ensureBundle();
  const outDir = path.resolve(opt.out || 'out/stills');
  const tmp = tmpDir(`frames-tmp-${process.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const files = renderFrames(bundle, comp, { frames: parseSel(sel), scale, format, outDir: tmp, gl: glForCall() });
  fs.mkdirSync(outDir, { recursive: true });
  const pad = Math.max(4, String(files[files.length - 1].frame).length);
  for (const f of files) {
    const to = path.join(outDir, `${comp === 'Film' ? '' : `${comp}-`}f${String(f.frame).padStart(pad, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    fs.copyFileSync(f.file, to);
    console.log(path.relative(ROOT, to).split(path.sep).join('/'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  say(`done in ${secs()} s`);
}

function cmdSheet() {
  const comp = opt.comp || 'Film';
  const scale = opt.scale || '0.25';
  const cols = Math.max(1, Number(opt.cols || 6));
  const bundle = ensureBundle();
  const meta = compositions(bundle)[comp];
  if (!meta) die(`no composition '${comp}' in the bundle`);
  let frames = opt.frames ? parseSel(opt.frames) : [[0, meta.frames - 1]];
  frames = frames.map(([a, b]) => [a, Math.min(b, meta.frames - 1)]).filter(([a, b]) => a <= b);
  if (!frames.length) usage(`--frames outside ${comp} (0-${meta.frames - 1})`);
  let every = Number(opt.every || 0);
  if (frames.length > 1 && every > 1) usage('--every works on one range (or pass a list without --every)');
  if (!every) every = frames.length === 1 ? Math.max(1, Math.ceil((frames[0][1] - frames[0][0] + 1) / 36)) : 1;
  const tmp = tmpDir(`sheet-tmp-${process.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const files = renderFrames(bundle, comp, { frames, every, scale, format: opt.format || 'jpeg', outDir: tmp, gl: glForCall() });
  // tiles in order, numbered for ffmpeg's image2 reader
  files.forEach((f, i) => fs.renameSync(f.file, path.join(tmp, `t${String(i).padStart(5, '0')}${path.extname(f.file)}`)));
  const ext = path.extname(files[0].file);
  const pr = tool('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(tmp, `t00000${ext}`)]);
  const [tw, th] = (pr.stdout || '').trim().split(',').map(Number);
  if (!tw || !th) die(`ffprobe could not read the tiles (${(pr.stderr || '').trim()})`);
  const n = files.length, rows = Math.ceil(n / cols), pad = 4, m = 4;
  const W = 2 * m + cols * tw + (cols - 1) * pad, H = 2 * m + rows * th + (rows - 1) * pad;
  const k = Math.max(1, Math.round(tw / 240));
  const labels = files.map((f, i) => ({ x: m + (i % cols) * (tw + pad) + 3 * k, y: m + Math.floor(i / cols) * (th + pad) + 3 * k,
    text: `f${f.frame} ${(f.frame / meta.fps).toFixed(2)}s` }));
  fs.writeFileSync(path.join(tmp, 'labels.pam'), labelLayer(W, H, labels, k));
  const out = path.resolve(opt.out || 'out/qa/sheet.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = tool('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, `t%05d${ext}`), '-i', path.join(tmp, 'labels.pam'),
    '-filter_complex', `[0:v]tile=${cols}x${rows}:padding=${pad}:margin=${m}:color=0x202024[s];[s][1:v]overlay=0:0:format=auto,format=rgb24`,
    '-frames:v', '1', '-update', '1', out]);
  if (ff.status !== 0 || !fs.existsSync(out)) die(`ffmpeg could not tile the sheet: ${(ff.stderr || '').trim().slice(-800)}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(path.relative(ROOT, out).split(path.sep).join('/'));
  say(`sheet: ${n} tiles (${cols} x ${rows}, every ${every} f = ${(every / meta.fps).toFixed(2)} s) of ${comp} @ ${meta.fps} fps, ${W}x${H}, done in ${secs()} s`);
}

function psnr(a, b) {
  const r = tool('ffmpeg', ['-v', 'info', '-hide_banner', '-i', a, '-i', b, '-lavfi', '[0:v]format=rgb24[x];[1:v]format=rgb24[y];[x][y]psnr', '-f', 'null', '-']);
  const m = /average:(inf|[\d.]+)/.exec(r.stderr || '');
  return m ? (m[1] === 'inf' ? Infinity : +m[1]) : null;
}

function cmdGl() {
  const env = process.env.CINETIC_GL;
  if (env) { console.log(env); return; }
  const have = readGl();
  if (have && !opt.force) { if (!opt.quiet) say(`gl ${have.gl} (cached ${have.at}${have.why ? `: ${have.why}` : ''}; --force probes again)`); console.log(have.gl); return; }
  const bundle = opt.bundle ? path.resolve(opt.bundle) : ensureBundle();
  const comp = opt.comp || 'Film';
  const meta = compositions(bundle)[comp];
  if (!meta) die(`no composition '${comp}' to probe with`);
  // a few frames spread over the film, at half size: enough to time the steady state, and to see wrong pixels
  const n = 8;
  const frames = Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) * meta.frames) / n)).map((f) => [f, f]);
  const cands = process.platform === 'linux' ? ['angle', 'angle-egl', 'egl', 'swangle'] : ['angle', 'swangle'];
  const res = {};
  for (const g of cands) {
    const dir = tmpDir(`gl-tmp-${process.pid}/${g}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const t = Date.now();
    const r = npx(['remotion', 'render', bundle, comp, dir, '--sequence', `--frames=${frames.map(([a]) => a).join(',')}`, '--image-format=png',
      '--scale=0.5', '--concurrency=2', '--image-sequence-pattern=[frame].[ext]', `--gl=${g}`, '--log=error']);
    res[g] = { ok: r.code === 0, s: +((Date.now() - t) / 1000).toFixed(1), dir };
    say(`probe ${g}: ${r.code === 0 ? `${res[g].s} s for ${n} frames` : `failed (${errText(r, 160)})`}`);
  }
  const ref = res.swangle?.ok ? 'swangle' : null;
  for (const [g, v] of Object.entries(res)) {
    if (!v.ok || !ref || g === ref) continue;
    let worst = Infinity;
    for (const f of fs.readdirSync(res[ref].dir)) {
      const other = path.join(v.dir, f);
      if (!fs.existsSync(other)) { worst = 0; break; }
      const p = psnr(path.join(res[ref].dir, f), other);
      worst = Math.min(worst, p ?? 0);
    }
    v.psnr = worst === Infinity ? 'identical' : +worst.toFixed(1);
    if (worst < 32) { v.ok = false; say(`probe ${g}: refused, its frames differ from the software reference (PSNR ${v.psnr} dB)`); }
  }
  const ok = Object.entries(res).filter(([, v]) => v.ok).sort((a, b) => a[1].s - b[1].s);
  fs.rmSync(tmpDir(`gl-tmp-${process.pid}`), { recursive: true, force: true });
  if (!ok.length) die('no GL backend rendered the probe frames (see above)');
  const pick = ok[0][0];
  writeGl({ gl: pick, probe: Object.fromEntries(Object.entries(res).map(([g, v]) => [g, { ok: v.ok, s: v.s, psnr: v.psnr }])) });
  say(`gl ${pick} (${ok.map(([g, v]) => `${g} ${v.s} s`).join(', ')}); cached in out/.bundle/gl.json`);
  console.log(pick);
}

if (CMD === 'bundle') cmdBundle();
else if (CMD === 'still' || CMD === 'stills') cmdStill();
else if (CMD === 'sheet') cmdSheet();
else if (CMD === 'gl') cmdGl();
else usage(`unknown command '${CMD}'`);
