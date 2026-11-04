#!/usr/bin/env node
// frames.mjs: look at the film fast. Stills of several frames in one call, a labelled contact sheet in one call,
// both from one bundle that is built once per state of the source and reused by every call (and by render.sh),
// rendered with the GL backend this machine renders fastest and correctly.
//
//   node scripts/frames.mjs still 120,480,1000            # out/stills/f0120.png ... at half size, one browser
//   node scripts/frames.mjs still 600 --scale 1            # one frame at full size
//   node scripts/frames.mjs sheet                          # out/qa/sheet.png: 16 frames over the film, 4 across
//   node scripts/frames.mjs sheet --every 30               # every 30th frame (a 60 fps film: two tiles a second)
//   node scripts/frames.mjs sheet --frames 840-1079 --every 4 --out out/qa/field.png   # one act, every 4th frame
//   node scripts/frames.mjs sheet --frames 358-364,1796 --scale 0.5                      # a cue and its neighbours
//   node scripts/frames.mjs end                            # the ending as stills: out/stills/end-f*.png (the lockup, early)
//   node scripts/frames.mjs sheet --from out/draft.mp4     # a sheet from a rendered video (ffmpeg only: no bundle, no browser)
//   node scripts/frames.mjs sheet --from out/draft.mp4 --frames 600-839 --every 6   # one act of the draft
//   node scripts/frames.mjs grab --from out/draft.mp4 120,480   # review frames from the video: out/stills/draft-f0120.png
//   node scripts/frames.mjs python                         # which Python runs the checks and sheets (numpy scipy soundfile cv2)
//   node scripts/frames.mjs bundle                         # build or reuse the bundle; prints its folder
//   node scripts/frames.mjs gl                             # the GL backend renders use here (probed once, cached)
//
// The bundle. `npx remotion bundle` costs from half a minute to several minutes on a laptop, and `npx remotion still
// src/index.ts` pays it on every call. Here the bundle lives in out/.bundle/<key>/, where the key hashes everything a
// bundle is made of: every file under the entry's folder (src/), remotion.config.ts, package.json, tsconfig.json, the
// Remotion version and public/ (path, size, mtime) but public/audio (the soundtrack is muxed by ffmpeg; frames render
// muted, so a new mix never rebuilds the bundle). An unchanged source reuses it in well under a second; any edit
// builds a new one (remotion.config.ts bundles with Rspack: seconds, where webpack took minutes on a busy laptop). The
// newest 3 bundles and any used in the last 2 hours stay; older ones are removed. render.sh takes its frozen copy from
// here (--copy-to). Build it once per state of the source: stills, sheets, the draft and the final all reuse it.
//
// The frames. One `npx remotion render <bundle> <comp> --sequence --frames=<list>` call: one browser, one evaluation
// of the composition list, the frames rendered in parallel tabs. It reads remotion.config.ts like every npx remotion
// command (browser, JPEG quality, colour, timeouts), so a still here is the frame the film renders.
//
// The GL backend. remotion.config.ts asks for 'angle' (the GPU through ANGLE). `gl` renders the same frames with
// each backend this platform offers (angle and swangle everywhere; angle-egl and egl on Linux), keeps the ones that
// finish and match the software reference (swangle, PSNR >= 32 dB, so a GPU path that draws black or garbage is
// refused), and picks the fastest from the first frame written to the last (the start-up every call pays alike is
// left out: on a busy laptop it is 10-30 s and decided the race by noise), keeping angle unless another backend is
// 1.25x faster; software GL beating a GPU path that draws correctly means the GPU was busy, so swangle then gets an
// hour's fallback and the GPU path stays the answer. out/.bundle/gl.json caches it per machine and Remotion version (and ~/.cinetic/gl.json, so the next film starts from it)
// (CINETIC_GL=<backend> overrides it, --force probes again). still and sheet use the cached pick when there is one,
// else the config's backend, and when a render fails with it they retry once with swangle (software, always works)
// and keep swangle for an hour (gl.json 'fallback'), then try the measured pick again: a GPU path that failed once
// under load is not taken as broken for good (swangle renders a 1080p frame 5-8x slower). render.sh runs `gl` before
// a final render.
//
// The video. Once a draft exists (render.sh --draft), look at the film through it: sheet --from and grab --from cut
// frames out of the video with ffmpeg in seconds, with no bundle and no browser. Stills from the bundle are for a
// frame you are fixing now (still) and for the ending before the draft (end).
//
// Python. `python` asks every interpreter it can find (the one scripts/py.mjs picks, a .venv here, py -0p on Windows,
// python3 and python on the PATH) which of numpy, scipy, soundfile and cv2 it imports, and says which one to use (set
// PYTHON to it) when the pick misses one; the answer is cached in ~/.cinetic/python.json for a day (--fresh asks
// again). --need a,b names other modules; --print prints only the interpreter that has them (exit 1: none has).
//
// Options (still, sheet):
//   --comp ID          composition (default Film)
//   --frames SEL       frames: a list 12,40,96, a range 240-479, or both (0-100,400); still takes it positionally
//   --every N          sheet: every Nth frame of the range (default: N that gives 16 tiles; --tiles N another count)
//   --scale S          still 0.5, sheet 0.25 (a 480 px tile from a 1920 px film; --from: tiles 480 px wide)
//   --cols N           sheet columns (default 4)
//   --from VIDEO       sheet, grab: frames cut from this video instead of rendered (out/draft.mp4, out/film.mp4)
//   --out PATH         still: a folder (default out/stills); sheet: the PNG (default out/qa/sheet.png)
//   --format F         png (still default) or jpeg (sheet tiles, default)
//   --props JSON|FILE  input props for the composition
//   --concurrency N    parallel tabs (default: the frame count, at most Remotion's default of half the cores, max 8;
//                      never above the cores Remotion sees, which OMP_NUM_THREADS lowers through nproc)
//   --gl X             this backend for this call (angle, swangle, angle-egl, egl, vulkan)
//   --entry FILE       entry point (default src/index.ts)
//   --fresh            rebuild the bundle even when one matches
//   -- ARGS            passed to `remotion render` as they are
// end:    --comp ID, --scale S (0.5), --at N (stills over the last N seconds, default 3).
// bundle: --entry FILE, --fresh, --copy-to DIR (also copy it there: render.sh's frozen bundle), --quiet.
// gl:     --force (probe again), --comp ID, --bundle DIR (probe on this bundle), --quiet (print only the backend),
//         --cached (the cached pick or nothing, never a probe).
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
import { findPython } from './py.mjs';

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
const FLAGS = new Set(['fresh', 'quiet', 'force', 'print', 'cached']);
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

// project root: the folder holding the entry (the current folder, else the one above this script); python and the
// commands that read a video (--from) need no project
const ENTRY = opt.entry || 'src/index.ts';
const NO_PROJECT = CMD === 'python' || ((CMD === 'sheet' || CMD === 'grab') && !!opt.from);
if (!fs.existsSync(ENTRY)) {
  if (fs.existsSync(path.join(HERE, '..', ENTRY))) process.chdir(path.join(HERE, '..'));
  else if (!NO_PROJECT) die(`no ${ENTRY} here: run from the project root or pass --entry`);
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
  // public/ but public/audio: the soundtrack is muxed by ffmpeg after the frames (renders are muted), so a new mix
  // keeps the bundle
  for (const [p, st] of walk('public')) {
    const r = path.relative(ROOT, p).split(path.sep).join('/');
    if (!r.startsWith('public/audio/')) h.update(`${r} ${st.size} ${Math.round(st.mtimeMs)}\n`);
  }
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
// the machine's copy: a new film on this machine starts from it instead of probing again (written only by a real
// Remotion install, whose version is in the key)
const MACHINE_GL = path.join(os.homedir(), '.cinetic', 'gl.json');
let remotionVersion = '';
function machineKey() {
  let rv = '';
  try { rv = JSON.parse(fs.readFileSync('node_modules/remotion/package.json', 'utf8')).version; } catch { /* ignore */ }
  remotionVersion = rv;
  const browser = process.env.REMOTION_BROWSER || process.env.CHROMIUM_PATH || '';
  return [os.hostname(), process.platform, os.arch(), os.cpus()[0]?.model || '', rv, browser].join('|');
}
const readKeyed = (p) => { try { const g = JSON.parse(fs.readFileSync(p, 'utf8')); return g.key === machineKey() ? g : null; } catch { return null; } };
function readGl() { const g = readKeyed(GLJSON); if (g) return g; machineKey(); return remotionVersion ? readKeyed(MACHINE_GL) : null; }
function writeGl(g) {
  const text = `${JSON.stringify({ key: machineKey(), at: new Date().toISOString(), ...g }, null, 1)}\n`;
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(GLJSON, text);
  if (remotionVersion) try { fs.mkdirSync(path.dirname(MACHINE_GL), { recursive: true }); fs.writeFileSync(MACHINE_GL, text); } catch { /* a read-only home */ }
}
// a swangle fallback after a GPU-path failure holds for an hour; after that the probe's pick (or the config's) again
const FALLBACK_MS = 3600e3;
const fallbackOf = (g) => (g?.fallback && Date.now() - Date.parse(g.fallback.at) < FALLBACK_MS ? g.fallback : null);
const glOf = (g) => fallbackOf(g)?.gl ?? g?.gl ?? null; // null: the config's backend
function glForCall() {
  if (opt.gl) return opt.gl;
  if (process.env.CINETIC_GL) return process.env.CINETIC_GL;
  return glOf(readGl());
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

// The cores Remotion lets a render use: the lower of the machine's and `nproc`'s, and nproc honours OMP_NUM_THREADS and
// OMP_THREAD_LIMIT (set in many ML, CI and shared-machine shells). Remotion refuses a --concurrency above it outright
// ("concurrency is set higher than the amount of CPU cores available"), so every count here stays at or under it.
function cpuCount() {
  const n = [typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length];
  for (const v of [process.env.OMP_NUM_THREADS, process.env.OMP_THREAD_LIMIT]) { const k = parseInt(v || '', 10); if (k > 0) n.push(k); }
  return Math.max(1, Math.min(...n));
}
function concurrencyFor(n) {
  const cores = cpuCount();
  if (!opt.concurrency) return String(Math.max(1, Math.min(n, 8, Math.round(cores / 2))));
  if (/^\d+$/.test(opt.concurrency) && +opt.concurrency > cores) {
    say(`--concurrency ${opt.concurrency} is above the ${cores} core(s) Remotion sees here; using ${cores}`);
    return String(cores);
  }
  return opt.concurrency;
}

// Render a frame selection to images in a fresh folder. Returns [{frame, file}] in frame order.
function renderFrames(bundle, comp, { frames, every = 1, scale, format, outDir, gl }) {
  fs.mkdirSync(outDir, { recursive: true });
  const n = frames.reduce((s, [a, b]) => s + Math.floor((b - a) / every) + 1, 0);
  const conc = concurrencyFor(n);
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
    if (r2.code === 0) {
      const { key, at, fallback, ...kept } = readGl() || {}; // the probe's pick stays; the fallback rides on it for an hour
      writeGl({ ...kept, fallback: { gl: 'swangle', at: new Date().toISOString(), why: `${gl || 'config backend'} failed: ${errText(r, 200)}` } });
      say('swangle kept for this machine for an hour (out/.bundle/gl.json), then the GPU path is tried again');
      r = r2;
    }
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
  say(`${files.length} frame(s) of ${comp} at scale ${scale} in ${secs(t)} s${steadyOf(files)} (concurrency ${conc}, gl ${gl || 'from remotion.config.ts'})`);
  return files;
}
// the pace once the browser runs: from the first file written to the last (the start-up every call pays is left out)
function steadyOf(files) {
  if (files.length < 3) return '';
  try {
    const ts = files.map((f) => fs.statSync(f.file).mtimeMs).sort((a, b) => a - b);
    const per = (ts[ts.length - 1] - ts[0]) / 1000 / (files.length - 1);
    return per > 0 ? `, ${per.toFixed(2)} s a frame once running` : '';
  } catch { return ''; }
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

// a range's frames for a sheet: every Nth, or N spread evenly (the default sheet: 16 tiles over the range)
const TILES = () => Math.max(1, Number(opt.tiles || 16));
function sheetFrames(total, label) {
  let frames = opt.frames ? parseSel(opt.frames) : [[0, total - 1]];
  frames = frames.map(([a, b]) => [a, Math.min(b, total - 1)]).filter(([a, b]) => a <= b);
  if (!frames.length) usage(`--frames outside ${label} (0-${total - 1})`);
  let every = Number(opt.every || 0);
  if (frames.length > 1 && every > 1) usage('--every works on one range (or pass a list without --every)');
  if (!every) every = frames.length === 1 ? Math.max(1, Math.ceil((frames[0][1] - frames[0][0] + 1) / TILES())) : 1;
  return { frames, every };
}

// a video's rate and frame count (ffprobe; the count from the stream header, else duration x rate)
function videoMeta(file) {
  const r = tool('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_frames,width,height:format=duration', '-of', 'json', file]);
  if (r.status !== 0) die(`ffprobe could not read ${file}: ${(r.stderr || '').trim().slice(-300)}`);
  const j = JSON.parse(r.stdout || '{}');
  const st = (j.streams || [])[0] || {};
  const [n, d] = String(st.r_frame_rate || '30/1').split('/').map(Number);
  const fps = n / (d || 1);
  const frames = Number(st.nb_frames) > 0 ? Number(st.nb_frames) : Math.round(Number(j.format?.duration || 0) * fps);
  if (!frames) die(`${file} has no video frames`);
  return { fps: +fps.toFixed(3), frames, w: Number(st.width), h: Number(st.height) };
}

// frames cut from a video with ffmpeg (one decode pass, the selected frames only), as [{frame, file}]
function cutFrames(video, list, { width, format, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const sel = [];
  // runs of consecutive frames as between(), the rest as eq(): the select expression stays short
  for (let i = 0; i < list.length;) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    sel.push(j > i ? `between(n\\,${list[i]}\\,${list[j]})` : `eq(n\\,${list[i]})`);
    i = j + 1;
  }
  const vf = [`select='${sel.join('+')}'`, ...(width ? [`scale=${width}:-2:flags=area`] : [])].join(',');
  const ext = format === 'png' ? 'png' : 'jpg';
  const r = tool('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', vf, '-fps_mode', 'passthrough', ...(ext === 'jpg' ? ['-q:v', '3'] : []), path.join(outDir, `c%05d.${ext}`)]);
  const out = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((f) => /^c\d{5}\./.test(f)).sort() : [];
  if (r.status !== 0 || !out.length) die(`ffmpeg could not cut frames from ${video}: ${(r.stderr || '').trim().slice(-400)}`);
  if (out.length !== list.length) say(`warning: ${out.length} frames cut for ${list.length} asked`);
  return out.map((f, i) => ({ frame: list[i] ?? i, file: path.join(outDir, f) }));
}

function cmdSheet() {
  const comp = opt.comp || 'Film';
  const cols = Math.max(1, Number(opt.cols || 4));
  const tmp = tmpDir(`sheet-tmp-${process.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  let files;
  let meta;
  if (opt.from) {
    // a sheet from a rendered video (the draft): ffmpeg only, seconds, no bundle and no browser
    if (!fs.existsSync(opt.from)) die(`--from ${opt.from}: no such video (render it: bash scripts/render.sh Film out/draft.mp4 --draft)`);
    meta = videoMeta(opt.from);
    const { frames, every } = sheetFrames(meta.frames, opt.from);
    const list = [];
    for (const [a, b] of frames) for (let f = a; f <= b; f += every) list.push(f);
    const width = opt.scale ? Math.round((meta.w * Number(opt.scale)) / 2) * 2 : Math.min(meta.w, 480);
    files = cutFrames(opt.from, list, { width, format: 'jpeg', outDir: tmp });
  } else {
    const bundle = ensureBundle();
    meta = compositions(bundle)[comp];
    if (!meta) die(`no composition '${comp}' in the bundle`);
    const { frames, every } = sheetFrames(meta.frames, comp);
    files = renderFrames(bundle, comp, { frames, every, scale: opt.scale || '0.25', format: opt.format || 'jpeg', outDir: tmp, gl: glForCall() });
  }
  const every = files.length > 1 ? files[1].frame - files[0].frame : 1;
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
  say(`sheet: ${n} tiles (${cols} x ${rows}, every ${every} f = ${(every / meta.fps).toFixed(2)} s) of ${opt.from || comp} @ ${meta.fps} fps, ${W}x${H}, done in ${secs()} s`);
}

// review frames from a rendered video at its own size (the draft, the final): out/stills/<name>-fNNNN.png
function cmdGrab() {
  const sel = opt.frames || opt._.join(',');
  if (!opt.from || !sel) usage('grab wants --from <video> and frames: node scripts/frames.mjs grab --from out/draft.mp4 120,480');
  if (!fs.existsSync(opt.from)) die(`--from ${opt.from}: no such video`);
  const meta = videoMeta(opt.from);
  const list = [...new Set(parseSel(sel).flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)))].filter((x) => x < meta.frames).sort((x, y) => x - y);
  if (!list.length) usage(`frames outside ${opt.from} (0-${meta.frames - 1})`);
  const tmp = tmpDir(`grab-tmp-${process.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const files = cutFrames(opt.from, list, { width: opt.scale ? Math.round((meta.w * Number(opt.scale)) / 2) * 2 : 0, format: 'png', outDir: tmp });
  const outDir = path.resolve(opt.out || 'out/stills');
  fs.mkdirSync(outDir, { recursive: true });
  const stem = path.basename(opt.from).replace(/\.[^.]+$/, '');
  const pad = Math.max(4, String(list[list.length - 1]).length);
  for (const x of files) {
    const to = path.join(outDir, `${stem}-f${String(x.frame).padStart(pad, '0')}.png`);
    fs.copyFileSync(x.file, to);
    console.log(path.relative(ROOT, to).split(path.sep).join('/'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  say(`${files.length} frame(s) from ${opt.from} in ${secs()} s`);
}

// the ending as stills, early in the run (before any draft): the lockup's landing, its hold and the last frame. The
// last act starts at out/cues.json's last act line when there is one; the stills spread over the last --at seconds.
function cmdEnd() {
  const comp = opt.comp || 'Film';
  const bundle = ensureBundle();
  const meta = compositions(bundle)[comp];
  if (!meta) die(`no composition '${comp}' in the bundle`);
  const last = meta.frames - 1;
  const span = Math.round(Number(opt.at || 3) * meta.fps);
  const pick = new Set([Math.max(0, last - span), Math.max(0, last - Math.round(span / 2)), Math.max(0, last - Math.round(meta.fps / 2)), last]);
  try {
    const c = JSON.parse(fs.readFileSync('out/cues.json', 'utf8'));
    const starts = Object.values(c.acts || {}).map((x) => Math.round(x.from)).filter((x) => x > 0 && x < last).sort((x, y) => x - y);
    if (starts.length) pick.add(Math.min(last, starts[starts.length - 1] + Math.round(meta.fps * 0.8)));
  } catch { /* no cues yet: the spread alone */ }
  const frames = [...pick].sort((x, y) => x - y);
  const tmp = tmpDir(`end-tmp-${process.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  const files = renderFrames(bundle, comp, { frames: frames.map((x) => [x, x]), scale: opt.scale || '0.5', format: 'png', outDir: tmp, gl: glForCall() });
  const outDir = path.resolve(opt.out || 'out/stills');
  fs.mkdirSync(outDir, { recursive: true });
  for (const x of files) {
    const to = path.join(outDir, `end-f${String(x.frame).padStart(4, '0')}.png`);
    fs.copyFileSync(x.file, to);
    console.log(path.relative(ROOT, to).split(path.sep).join('/'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  say(`the ending: ${files.length} still(s) of the last ${(span / meta.fps).toFixed(1)} s (frames ${frames.join(', ')} of ${meta.frames}) in ${secs()} s: the lockup, the name and the mark must read here`);
}

// ---------- python: which interpreter runs the checks ----------
// Every interpreter this machine offers is asked once which modules it imports; the answer is cached for a day.
function cmdPython() {
  const need = String(opt.need || 'numpy,scipy,soundfile,cv2').split(',').map((x) => x.trim()).filter(Boolean);
  const cacheFile = path.join(os.homedir(), '.cinetic', 'python.json');
  const key = need.join(',');
  const fmt = (c) => (c || []).map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' ');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* none yet */ }
  let res = cache[key];
  // a day-old answer whose interpreters are still there is reused as it is (asking py.mjs again costs a Python start
  // per candidate); --fresh asks again (after setting PYTHON to another interpreter, say)
  const fresh = res && !opt.fresh && Date.now() - Date.parse(res.at) < 24 * 3600e3
    && res.list.every((x) => !/[\\/]/.test(x.cmd[0]) || fs.existsSync(x.cmd[0]));
  if (!fresh) {
    const pickNow = findPython({ quiet: true });
    const cands = [];
    const addC = (c) => { if (c && c.length && !cands.some((x) => fmt(x) === fmt(c))) cands.push(c); };
    addC(pickNow);
    // the sound kit's interpreter (earshot's own environment) often has the rest too
    if (process.env.EARSHOT_PYTHON && fs.existsSync(process.env.EARSHOT_PYTHON)) addC([process.env.EARSHOT_PYTHON]);
    for (const d of [process.env.VIRTUAL_ENV, path.join(process.cwd(), '.venv'), path.join(process.cwd(), 'venv')].filter(Boolean)) {
      const p = path.join(d, isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');
      if (fs.existsSync(p)) addC([p]);
    }
    if (isWin) {
      const r = tool('py', ['-0p']);
      for (const l of (r.stdout || '').split(/\r?\n/)) {
        const m = /([A-Za-z]:\\.*?pythonw?\.exe)\s*$/i.exec(l.trim());
        if (m && fs.existsSync(m[1])) addC([m[1]]);
      }
    }
    // python3 and python on the PATH, by full path (a Store alias under WindowsApps runs nothing: left out)
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      if (!dir || /WindowsApps/i.test(dir)) continue;
      for (const n of isWin ? ['python.exe', 'python3.exe'] : ['python3', 'python']) {
        const p = path.join(dir, n);
        try { if (fs.statSync(p).isFile()) addC([fs.realpathSync(p)]); } catch { /* not here */ }
      }
    }
    const code = 'import importlib, sys\nmiss = []\nfor m in sys.argv[1:]:\n    try:\n        importlib.import_module(m)\n    except Exception:\n        miss.append(m)\nprint(sys.version.split()[0])\nprint(" ".join(miss))';
    const list = [];
    for (const c of cands.slice(0, 8)) {
      const [exe, ...pre] = c;
      const r = spawnSync(exe, [...pre, '-c', code, ...need], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 90000 });
      if (r.status !== 0) continue;
      const [ver = '?', miss = ''] = (r.stdout || '').split(/\r?\n/);
      if (!/^3\.(1\d|[2-9]\d)/.test(ver)) continue; // 3.10 and newer
      list.push({ cmd: c, version: ver, missing: miss.split(' ').filter(Boolean) });
    }
    res = { at: new Date().toISOString(), pick: pickNow, list };
    cache[key] = res;
    try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, `${JSON.stringify(cache, null, 1)}\n`); } catch { /* a read-only home: no cache */ }
  }
  const full = res.list.find((x) => !x.missing.length);
  const pick = res.list.find((x) => fmt(x.cmd) === fmt(res.pick));
  if (opt.print) {
    if (!full) { console.error(`frames.mjs: no Python here imports ${need.join(', ')}`); process.exit(1); }
    console.log(fmt(full.cmd));
    return;
  }
  if (pick && !pick.missing.length) console.log(`${fmt(pick.cmd)} (Python ${pick.version}) imports ${need.join(', ')}: every script uses it (node scripts/py.mjs)`);
  else if (full) {
    console.log(`${fmt(full.cmd)} (Python ${full.version}) imports ${need.join(', ')}${pick ? `; the default pick ${fmt(pick.cmd)} misses ${pick.missing.join(', ')}` : ''}.`);
    console.log(`set PYTHON to it once for every step (render.sh, sheets, forensics): export PYTHON="${full.cmd.join(' ')}"`);
  } else if (res.list.length) {
    const best = [...res.list].sort((x, y) => x.missing.length - y.missing.length)[0];
    console.log(`no interpreter here imports all of ${need.join(', ')}: ${res.list.map((x) => `${fmt(x.cmd)} misses ${x.missing.join(', ')}`).join('; ')}`);
    console.log(`install the rest into the closest one: ${fmt(best.cmd)} -m pip install -r scripts/requirements.txt (then export PYTHON="${best.cmd.join(' ')}")`);
  } else console.log('no Python 3.10+ found: install Python 3.11+ and scripts/requirements.txt, then set PYTHON to it');
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
  // --cached: the machine's pick when there is one, else nothing (the config's backend): never a probe (render.sh --draft)
  if (opt.cached) { const g = glOf(have); if (g) console.log(g); return; }
  const fb = fallbackOf(have);
  if (have && (have.gl || fb) && !opt.force) {
    if (!opt.quiet) say(fb ? `gl swangle until an hour after ${fb.at} (${fb.why}); then ${have.gl || "the config's backend"} again`
      : `gl ${have.gl} (cached ${have.at}; --force probes again)`);
    console.log(glOf(have) ?? 'angle');
    return;
  }
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
      '--scale=0.5', `--concurrency=${Math.min(2, cpuCount())}`, '--image-sequence-pattern=[frame].[ext]', `--gl=${g}`, '--log=error']);
    // the steady state: from the first frame written to the last (file times), without the 10-30 s of node, browser
    // and bundle start-up that every call pays alike and that, under load, swamps the difference between backends
    let run = null;
    try {
      const ts = fs.readdirSync(dir).map((x) => fs.statSync(path.join(dir, x)).mtimeMs).sort((a, b) => a - b);
      if (ts.length >= 2 && ts[ts.length - 1] > ts[0]) run = +((ts[ts.length - 1] - ts[0]) / 1000).toFixed(2);
    } catch { /* no files */ }
    res[g] = { ok: r.code === 0, s: +((Date.now() - t) / 1000).toFixed(1), run, dir };
    say(`probe ${g}: ${r.code === 0 ? `${res[g].s} s for ${n} frames (${run ?? '?'} s from the first to the last)` : `failed (${errText(r, 160)})`}`);
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
  // ranked on the steady state when every backend that drew has one (else on the whole call); the config's backend
  // (angle) stays unless another is clearly faster (1.25x), so a tie decided by noise never moves the film off the GPU
  const ok = Object.entries(res).filter(([, v]) => v.ok);
  fs.rmSync(tmpDir(`gl-tmp-${process.pid}`), { recursive: true, force: true });
  if (!ok.length) die('no GL backend rendered the probe frames (see above)');
  const steady = ok.every(([, v]) => v.run > 0);
  const cost = (v) => (steady ? v.run : v.s);
  ok.sort((a, b) => cost(a[1]) - cost(b[1]));
  let pick = ok[0][0];
  if (pick !== 'angle' && res.angle?.ok && cost(res.angle) < 1.25 * cost(res[pick])) pick = 'angle';
  const probe = Object.fromEntries(Object.entries(res).map(([g, v]) => [g, { ok: v.ok, s: v.s, run: v.run, psnr: v.psnr }]));
  const listing = ok.map(([g, v]) => `${g} ${cost(v)} s`).join(', ');
  // software GL beating a GPU backend that draws correctly means the GPU was busy at that moment: it gets the hour of a
  // fallback, and the GPU backend stays the machine's answer (swangle renders a quiet 1080p frame 5-8x slower)
  const gpu = ok.find(([g]) => g !== 'swangle');
  if (pick === 'swangle' && gpu) {
    const at = new Date().toISOString();
    writeGl({ gl: gpu[0], probe, fallback: { gl: 'swangle', at, why: `faster than ${gpu[0]} at the probe (${listing}): the GPU was busy` } });
    say(`gl swangle for an hour (${listing}; the GPU looked busy), then ${gpu[0]}; cached in out/.bundle/gl.json`);
  } else {
    writeGl({ gl: pick, probe });
    say(`gl ${pick} (${listing}${steady ? ', first to last frame' : ', whole calls'}); cached in out/.bundle/gl.json`);
  }
  console.log(glOf(readGl()) ?? pick);
}

if (CMD === 'bundle') cmdBundle();
else if (CMD === 'still' || CMD === 'stills') cmdStill();
else if (CMD === 'sheet') cmdSheet();
else if (CMD === 'gl') cmdGl();
else if (CMD === 'grab') cmdGrab();
else if (CMD === 'end') cmdEnd();
else if (CMD === 'python') cmdPython();
else usage(`unknown command '${CMD}'`);
