#!/usr/bin/env node
// frames.mjs: every picture a film makes, from one command. Run it inside a film project.
//
//   node scripts/frames.mjs sheet [--film main] [--grid 6] [--from 0 --to 599 | --frames 0,40,90] [--out out/sheet.png]
//        the whole film as 36 frozen frames in ONE still (6x6, 320 px cells; --grid 4 or 3 for bigger cells, --half for a
//        faster, smaller sheet). The fastest look at a film: use it after every change. --safe outlines the 8 % safe
//        margin in every cell: what sits outside it is cut or crowding an edge.
//   node scripts/frames.mjs still --frame 120 [--film main] [--out out/f120.png] [--full]
//        one frame (half size unless --full)
//   node scripts/frames.mjs render [--film main] [--final] [--range 0-449] [--muted] [--out out/film.mp4]
//        a video. Preview: half size (fast). --final: 1920x1080. --range renders part of it, --muted without sound
//   node scripts/frames.mjs final [--film main]
//        the master in one pass: picture and sound, then loudness to -16 LUFS / -1.5 dBTP -> out/main.mp4
//   For a film too long to render in one go (or a machine with a time limit per job), the same master in steps:
//   node scripts/frames.mjs render --final --muted --range 0-399 --out out/part-a.mp4      (one per part)
//   node scripts/frames.mjs audio [--film main]                                           (out/audio.wav)
//   node scripts/frames.mjs mux out/part-a.mp4 out/part-b.mp4 ... [--audio out/audio.wav] [--out out/main.mp4]
//        joins the parts without re-encoding, lays the sound on the picture's own start time, sets the loudness.
//        Without --audio and without out/audio.wav it joins muted parts into a silent file (a loop, a preview in parts)
//   node scripts/frames.mjs check [out/main-preview.mp4] [--film main] [--lockup 2] [--format launch|loop|sting] [--silent]
//        measures a rendered film against the bar: air (how much of the frame is sharp detail, how many separate things,
//        how often the frame edge cuts them), pace (how much changes in every half second), empty frames, how long the
//        ending is (from the film's exported LOCKUP or T.lockup frame when it has one), the sound, and which
//        motion-library pieces the film's source (src/films/<film>) imports and how often it uses each. Flags
//        what fails; LOOK lines name frames to look at. Thresholds: CINETIC_CHECK_* env. Fails a file that is silent
//        while the film's source plays sound cues or music (the sound insert failed); --silent for a film meant silent.
//        --format loop: no sound, ending or music lines; fails when the last frame does not match the first.
//        --format sting: no pace gate on a film under 8 s; the ending may hold. Default launch.
//   node scripts/frames.mjs strip out/film.mp4 --at 4.5 [--dur 2] [--fps 15] [--out out/strip.jpg]
//        a dense contact strip of a moment of a rendered video (motion check: an entrance, a turn, a morph)
//   node scripts/frames.mjs joins [--film main] [--at 120,245,390] [--pad 4] [--full] [--out out/joins]
//        every join at real size: for each join frame J the frames J-4 .. J+4, each 960 px wide (--full: 1920), tiled
//        into one image a join (out/joins/<film>-join-<J>.png), the frame number on each cell, the join frame outlined.
//        Without --at it reads the film's exported JOINS (frame numbers, beside T). One browser, one render call.
//        Look at every cell before the final and after every fix that touches the join.
//   node scripts/frames.mjs library [--category turn] [--purpose join] [--subject card] [--mood calm] [--json]
//        the motion library's pieces that match (src/kit/library/catalog/), one line each: name, category, purpose,
//        frames, what it looks like. A filter takes one value or several joined by commas (any of them matches).
//   node scripts/frames.mjs library --show DiveInto
//        one piece in full: when to use it, its caution, its import line, its file and the command for its strip
//   node scripts/frames.mjs library --strip DiveInto [--out out/library/DiveInto.png]
//        the piece's frames from its reel as one still (16 frames, 4x4)
//
// GL: set CINETIC_GL=swangle to render on the CPU (software GL) when the GPU is unstable; otherwise Remotion's default.
// Concurrency: CINETIC_CONCURRENCY (default 2). CINETIC_BROWSER: a Chrome Headless Shell shared by every film project.
// Nothing here uploads anything.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { CATEGORIES, loadLibrary } from './library-catalog.mjs';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : dflt;
};
const has = (name) => args.includes(`--${name}`);
const film = opt('film', 'main');
const gl = process.env.CINETIC_GL ? [`--gl=${process.env.CINETIC_GL}`] : [];
const conc = [`--concurrency=${process.env.CINETIC_CONCURRENCY || 2}`];
// CINETIC_BROWSER: a Chrome Headless Shell to share between film projects (otherwise Remotion downloads ~300 MB into each)
const browser = process.env.CINETIC_BROWSER ? [`--browser-executable=${process.env.CINETIC_BROWSER}`] : [];

// resolved on first use: check, strip, join and mux need only ffmpeg, not Remotion
let cliPath;
const cli = () => {
  if (cliPath) return cliPath;
  try {
    cliPath = path.join(path.dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');
    return cliPath;
  } catch {
    console.error('Remotion is not installed here: run npm install in the film project first.');
    process.exit(1);
  }
};

const run = (bin, a) => {
  const r = spawnSync(bin, a, { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const remotion = (a) => run(process.execPath, [cli(), ...a, ...browser]);
const ensureDir = (p) => fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });

/** Start time (s) of the first video stream: an encoder delay or edit list shifts it from 0. */
const videoStart = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=start_time', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const t = parseFloat((r.stdout || '').trim());
  return Number.isFinite(t) ? t : 0;
};

/** Picture from `video`, sound from `audioSrc` laid on the picture's own start time, loudness -16 LUFS / -1.5 dBTP. */
const loudMux = (video, audioSrc, out) => {
  const off = videoStart(video);
  const a = off > 0.0005 ? ['-itsoffset', off.toFixed(4), '-i', audioSrc] : ['-i', audioSrc];
  // Pass 1: measure the mix. Pass 2: ONE static gain to -16 LUFS (the quiet opener stays quiet, the dynamics stay), then
  // an oversampled true-peak limiter with headroom for the AAC encode (which overshoots sharp transients).
  const m = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', audioSrc, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const I = parseFloat(((m.stderr || '').match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)?.[0] ?? '-16');
  const gain = Number.isFinite(I) ? Math.max(-20, Math.min(20, -16 - I)) : 0;
  const af = `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.74:attack=1:release=60:level=false,aresample=48000`;
  // the sound is cut to the picture's length: joining parts with sound never lengthens the film (AAC priming and
  // -shortest alone leave up to a tenth of a second of sound past the last frame)
  const vd = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' }).stdout);
  const len = Number.isFinite(vd) && vd > 0 ? ['-t', vd.toFixed(4)] : [];
  run('ffmpeg', ['-v', 'error', '-y', '-i', video, ...a, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '256k', '-shortest', ...len, '-movflags', '+faststart', out]);
};

/** Loudness and true peak of a file's sound: { I, TP } (LUFS, dBTP). */
const loudness = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const txt = r.stderr || '';
  const num = (re) => parseFloat(((txt.match(re) || []).pop() || '').match(/-?[\d.]+/)?.[0] ?? 'NaN');
  return { I: num(/I:\s+-?[\d.]+ LUFS/g), TP: num(/Peak:\s+-?[\d.]+ dBFS/g) };
};

/**
 * A bed that runs out before the film does is silence no render reports. Reads the film's <Music> tags (literal src,
 * startFrom and enterAt only) and compares the track's length with the film's.
 */
function musicRunsOut(dur) {
  const dir = path.join(process.cwd(), 'src', 'films', film);
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.tsx?$/.test(f)) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/<Music\b[\s\S]*?\/>/g)) {
      const file = m[0].match(/src=["']([^"']+)["']/)?.[1];
      const start = m[0].match(/startFrom=\{\s*([\d.]+)\s*\}/)?.[1];
      if (!file || start === undefined) continue;
      const track = path.join(process.cwd(), 'public', file);
      if (!fs.existsSync(track)) continue;
      const len = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', track], { encoding: 'utf8' }).stdout);
      if (!Number.isFinite(len)) continue;
      const enter = Number(m[0].match(/enterAt=\{\s*([\d.]+)\s*\}/)?.[1] ?? 0) / 30;
      const until = enter + len - Number(start);
      if (until < dur - 0.4) out.push(`music: ${file} runs out at ${Math.max(0, until).toFixed(1)} s of the ${dur.toFixed(1)} s film (the track is ${len.toFixed(0)} s long and starts at ${start} s): start it earlier (sfx.mjs fit finds the start)`);
    }
  }
  return out;
}

const GROUND_LIT = process.env.CINETIC_CHECK_OLDGROUND ? false : true; // private calibration switch
// a frame is empty when almost nothing differs from the ground (a single clean line of type is NOT empty)
const EMPTY_FILL = Number(process.env.CINETIC_CHECK_EMPTY || 0.006);
// air (calibrated on 40 reference launch films): sharp detail = type, UI, hard edges; soft light, gradients and blur are not
const CROWD = Number(process.env.CINETIC_CHECK_CROWD || 0.27); // FAIL: share of samples with 35 %+ of the frame in sharp detail
const BUSY = Number(process.env.CINETIC_CHECK_BUSY || 0.25); // LOOK: share of samples with 3+ separate things and 20 %+ detail
const CUT = Number(process.env.CINETIC_CHECK_CUT || 0.25); // LOOK: share of samples where the frame edge cuts detail on 2+ sides

/**
 * Air: 2 samples a second, grey, the long side 640 px, cut into 20-px cells (60 px of a 1080p frame). A cell is detail when
 * 4 %+ of its pixels sit on a hard edge. Per sample: the share of the frame in detail, the number of separate things (8-connected
 * detail of 1 %+ of the frame) and the number of frame sides where 15 %+ of the border is detail.
 */
function airSamples(file, vw, vh) {
  const L = 640, C = 20;
  const W = vw >= vh ? L : Math.round((L * vw) / vh / 5) * 5;
  const H = vw >= vh ? Math.round((L * vh) / vw / 5) * 5 : L;
  const buf = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', `fps=2,scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 }).stdout;
  const FS = W * H, n = Math.floor(buf.length / FS);
  const cw = Math.floor(W / C), ch = Math.floor(H / C), N = cw * ch;
  const cnt = new Uint16Array(N), lab = new Int32Array(N);
  const out = [];
  for (let f = 0; f < n; f++) {
    const o = f * FS;
    cnt.fill(0);
    for (let y = 0; y < ch * C; y++) {
      const up = y > 0 ? W : 0, dn = y < H - 1 ? W : 0, row = Math.floor(y / C) * cw;
      for (let x = 0; x < cw * C; x++) {
        const i = o + y * W + x;
        const g = Math.abs(buf[i + (x < W - 1 ? 1 : 0)] - buf[i - (x > 0 ? 1 : 0)]) / 2 + Math.abs(buf[i + dn] - buf[i - up]) / 2;
        if (g > 40) cnt[row + Math.floor(x / C)]++;
      }
    }
    const det = Array.from(cnt, (c) => c >= 0.04 * C * C);
    let things = 0;
    lab.fill(-1);
    for (let s = 0; s < N; s++) {
      if (!det[s] || lab[s] >= 0) continue;
      let a = 0;
      const st = [s];
      lab[s] = s;
      while (st.length) {
        const k = st.pop(); a++;
        const x = k % cw, y = Math.floor(k / cw);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
          const q = yy * cw + xx;
          if (det[q] && lab[q] < 0) { lab[q] = s; st.push(q); }
        }
      }
      if (a / N >= 0.01) things++;
    }
    const side = (cells) => cells.filter((k) => det[k]).length / cells.length >= 0.15;
    const top = [], bot = [], lef = [], rig = [];
    for (let x = 0; x < cw; x++) { top.push(x); bot.push((ch - 1) * cw + x); }
    for (let y = 0; y < ch; y++) { lef.push(y * cw); rig.push(y * cw + cw - 1); }
    out.push({ t: f / 2, detail: det.filter(Boolean).length / N, things, cut: [top, bot, lef, rig].filter(side).length });
  }
  return out;
}
/**
 * A loop's seam: the last frame against the first (at the check's size, RGB). Returns the mean difference and the
 * largest difference of any 8x8-px cell (0..1), for the seam and for the film's own last step (the next-to-last frame
 * against the last), so a fast loop is judged against its own motion.
 */
function loopSeam(file, W, H) {
  const FS = W * H * 3;
  const grab = (pre, post) => spawnSync('ffmpeg', ['-v', 'error', ...pre, '-i', file, '-an', '-vf', `scale=${W}:${H}:flags=area`, ...post, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 }).stdout;
  const head = grab([], ['-frames:v', '1']);
  const tail = grab(['-sseof', '-1'], []);
  const n = Math.floor(tail.length / FS);
  if (!head || head.length < FS || n < 2) return null;
  const last = tail.subarray((n - 1) * FS, n * FS);
  const prev = tail.subarray((n - 2) * FS, (n - 1) * FS);
  const diff = (a, b) => {
    const C = 8, cw = Math.floor(W / C), ch = Math.floor(H / C);
    let sum = 0, cell = 0;
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      let d = 0;
      for (let y = cy * C; y < cy * C + C; y++) for (let x = cx * C; x < cx * C + C; x++) {
        const i = (y * W + x) * 3;
        d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      }
      sum += d;
      cell = Math.max(cell, d / (C * C * 3 * 255));
    }
    return { mean: sum / (cw * ch * C * C * 3 * 255), cell };
  };
  return { seam: diff(last, head), step: diff(prev, last) };
}

/** Measure a rendered film: coverage, pace, empty frames, the length of its ending (low-res analysis via ffmpeg). */
/** Every source file of the film (src/films/<film>, recursively). */
function filmSources() {
  const dir = path.join(process.cwd(), 'src', 'films', film);
  const out = [];
  const walk = (d) => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push({ file: p, src: fs.readFileSync(p, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

/** The motion library's pieces, read from its catalogue (src/kit/library/catalog/): name -> category. */
function libraryPieces() {
  const names = new Map();
  for (const e of loadLibrary() ?? []) names.set(e.name, e.category);
  return names;
}

/**
 * The library pieces the film's source imports from the kit (named value imports whose path reaches the kit), and how
 * often each is placed (`<Piece` in the source, under the name it was imported as).
 */
function libraryUse(sources) {
  const pieces = libraryPieces();
  const local = new Map(); // the name in the film's code -> the piece
  for (const { src } of sources)
    for (const m of src.matchAll(/import\s*(type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]*kit[^'"]*)['"]/g)) {
      if (m[1]) continue;
      for (const n of m[2].split(',')) {
        const [k, as] = n.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
        if (pieces.has(k)) local.set(as || k, k);
      }
    }
  const count = new Map();
  for (const [name, k] of local) count.set(k, (count.get(k) || 0) + placements(sources, name));
  const used = [...new Set(local.values())].sort();
  return { used, known: pieces.size, count, section: (k) => pieces.get(k) };
}

/**
 * How often the code at `index` of `src` is placed: once, or as often as the local component it sits in is placed
 * (a Statement helper holding one <Words>, placed five times, places it five times). One level deep.
 */
function hostUses(sources, src, index) {
  const host = [...src.slice(0, index).matchAll(/(?:const|function)\s+([A-Z]\w*)\b/g)].pop()?.[1];
  let uses = 0;
  if (host) for (const t of sources) uses += (t.src.match(new RegExp(`<${host}\\b`, 'g')) || []).length;
  return Math.max(1, uses);
}
/** How often a component is placed in the film (each `<Name`, counted through the local component that holds it). */
function placements(sources, name) {
  let n = 0;
  for (const { src } of sources) for (const m of src.matchAll(new RegExp(`<${name}\\b`, 'g'))) n += hostUses(sources, src, m.index);
  return n;
}

/** The film's entry in src/films.ts: its component's source file (resolved from the import), fps and size. */
function filmEntry() {
  const reg = fs.existsSync('src/films.ts') ? fs.readFileSync('src/films.ts', 'utf8') : '';
  const entry = reg.match(new RegExp(`['"]?${film.replace(/[-]/g, '\\-')}['"]?\\s*:\\s*\\{[^}]*\\}`))?.[0] ?? '';
  const comp = entry.match(/component:\s*(\w+)/)?.[1];
  let file = null;
  if (comp) {
    const imp = [...reg.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)].find((m) => m[1].split(',').some((n) => n.trim().split(/\s+as\s+/).pop() === comp));
    if (imp) for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) { const p = path.join('src', imp[2] + ext); if (fs.existsSync(p)) { file = p; break; } }
  }
  return {
    file,
    fps: Number(entry.match(/fps:\s*(\d+)/)?.[1] ?? 30),
    width: Number(entry.match(/width:\s*(\d+)/)?.[1] ?? 1920),
    height: Number(entry.match(/height:\s*(\d+)/)?.[1] ?? 1080),
  };
}

/** The film's own source texts: its registered component's file first, then every file under src/films/<film>. */
function filmTexts() {
  const { file } = filmEntry();
  const out = [];
  if (file) out.push(fs.readFileSync(file, 'utf8'));
  for (const { file: f, src } of filmSources()) if (!file || path.resolve(f) !== path.resolve(file)) out.push(src);
  return out;
}

/** The initialiser of a top-level `const NAME = ...` (exported or not) in a source text, comments dropped; null if none. */
function constText(src, name) {
  const m = new RegExp(`^(?:export\\s+)?const\\s+${name}\\b\\s*(?::[^=\\n]+)?=\\s*`, 'm').exec(src);
  if (!m) return null;
  let i = m.index + m[0].length, depth = 0, str = null, out = '';
  for (; i < src.length; i++) {
    const c = src[i];
    if (str) { out += c; if (c === '\\') { out += src[++i]; continue; } if (c === str) str = null; continue; }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = (e < 0 ? src.length : e) - 1; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = (e < 0 ? src.length : e + 2) - 1; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; out += c; continue; }
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth--;
    if (depth <= 0 && c === ';') break;
    if (depth <= 0 && c === '\n' && out.trim()) {
      // the expression continues when the next line starts with an operator
      const rest = src.slice(i + 1).replace(/^\s+/, '');
      if (!/^[.?:+\-*/|&,]/.test(rest)) break;
    }
    out += c;
  }
  return out.replace(/\bas\s+const\b/g, '').replace(/\bsatisfies\s+[\w<>[\], ]+/g, '').trim();
}

/**
 * The value of a plain constant of the film (JOINS, LOCKUP, T): numbers, arrays, objects and arithmetic on other plain
 * constants of the film's files. Throws when it calls something that is not one (an imported helper).
 */
function filmConst(name, texts = filmTexts(), env = {}, depth = 0) {
  if (Object.prototype.hasOwnProperty.call(env, name)) return env[name];
  if (depth > 16) throw new Error(`${name}: too many nested constants`);
  let expr = null;
  for (const s of texts) { expr = constText(s, name); if (expr !== null) break; }
  if (expr === null) throw new Error(`no plain const ${name} in the film's files`);
  for (let k = 0; k < 40; k++) {
    try {
      const keys = Object.keys(env);
      const v = new Function(...keys, `"use strict"; return (${expr});`)(...keys.map((x) => env[x]));
      env[name] = v;
      return v;
    } catch (e) {
      const miss = /^(\w+) is not defined/.exec(e.message)?.[1];
      if (!miss || miss === name) throw e;
      env[miss] = filmConst(miss, texts, env, depth + 1);
    }
  }
  throw new Error(`${name} could not be read`);
}

/** Frame numbers out of a value (a number, or arrays of them, nested). */
const frameList = (v) => [v].flat(Infinity).map(Number).filter(Number.isFinite).map(Math.round);

/** The film's lockup frame: an exported LOCKUP, else T.lockup; null when it has neither (or they cannot be read). */
function lockupFrame() {
  const texts = filmTexts();
  for (const [label, read] of [['LOCKUP', () => filmConst('LOCKUP', texts)], ['T.lockup', () => filmConst('T', texts)?.lockup]]) {
    try { const f = frameList(read())[0]; if (Number.isFinite(f)) return { f, label }; } catch { /* not there, or not plain */ }
  }
  return null;
}

function checkFilm(file, lockupS, format = 'launch', silentOk = false, lockupGiven = false) {
  const loop = format === 'loop';
  const sting = format === 'sting';
  // the film's own lockup frame (LOCKUP or T.lockup), when its source is here: the ending is measured from it, so a held
  // picture before the claim is judged as a hold, not as the ending
  const lock = loop ? null : lockupFrame();
  const lockFps = filmEntry().fps || 30;
  const FPS = 4;
  // sample at the film's own aspect (a vertical film is measured vertical): the long side 192 px
  const dims = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);
  const [vw, vh] = dims.length === 2 && dims.every((v) => v > 0) ? dims : [1920, 1080];
  const W = vw >= vh ? 192 : Math.round((192 * vw) / vh / 2) * 2;
  const H = vw >= vh ? Math.round((192 * vh) / vw / 2) * 2 : 192;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const dur = parseFloat(probe.stdout);
  if (!Number.isFinite(dur)) throw new Error(`cannot read ${file}`);
  const lockT = lock && lock.f / lockFps < dur - 0.2 ? lock.f / lockFps : null;
  // without an explicit --lockup the body runs to the film's own lockup frame
  if (lockT !== null && !lockupGiven) lockupS = Math.max(0, dur - lockT);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `fps=${FPS},scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
  const buf = r.stdout;
  const n = Math.floor(buf.length / (W * H * 3));
  const px = (f, x, y) => { const i = (f * W * H + y * W + x) * 3; return [buf[i], buf[i + 1], buf[i + 2]]; };
  const frames = [];
  for (let f = 0; f < n; f++) {
    // ground = the most common colour on the frame border (quantised)
    const counts = new Map();
    const add = (x, y) => { const c = px(f, x, y).map((v) => v >> 4).join(','); counts.set(c, (counts.get(c) || 0) + 1); };
    for (let x = 0; x < W; x += 2) { add(x, 0); add(x, H - 1); }
    for (let y = 0; y < H; y += 2) { add(0, y); add(W - 1, y); }
    const g = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map((v) => Number(v) * 16 + 8);
    let minX = W, maxX = -1, minY = H, maxY = -1, fg = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = px(f, x, y);
      // ground: the border's colour, or the same colour lit or shaded a little (a lit ground's glow is not a subject)
      const d = Math.abs(p[0] - g[0]) + Math.abs(p[1] - g[1]) + Math.abs(p[2] - g[2]);
      const lp = (p[0] + p[1] + p[2]) / 3, lg = (g[0] + g[1] + g[2]) / 3;
      const chroma = Math.abs(p[0] - lp - (g[0] - lg)) + Math.abs(p[1] - lp - (g[1] - lg)) + Math.abs(p[2] - lp - (g[2] - lg));
      const litGround = Math.abs(lp - lg) <= 34 && chroma <= 22;
      if (d > 42 && !(GROUND_LIT && litGround)) { fg++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    const width = maxX >= 0 ? (maxX - minX + 1) / W : 0;
    const height = maxY >= 0 ? (maxY - minY + 1) / H : 0;
    frames.push({ t: f / FPS, width, height, fill: fg / (W * H) });
  }
  // pace: mean absolute difference between samples 0.5 s apart (0..1 of the full range)
  const step = Math.round(FPS * 0.5);
  const pace = [];
  for (let f = 0; f + step < n; f += step) {
    let d = 0;
    const a = f * W * H * 3, b = (f + step) * W * H * 3;
    for (let i = 0; i < W * H * 3; i += 3) d += Math.abs(buf[a + i] - buf[b + i]) + Math.abs(buf[a + i + 1] - buf[b + i + 1]) + Math.abs(buf[a + i + 2] - buf[b + i + 2]);
    pace.push({ t: f / FPS, d: d / (W * H * 3 * 255) });
  }
  const body = frames.filter((x) => x.t > 0.1 && x.t < dur - lockupS);
  const sparse = body.filter((x) => Math.max(x.width, x.height * 0.8) < 0.45);
  const empty = frames.filter((x) => x.t < dur - 0.6 && x.fill < EMPTY_FILL);
  const slow = pace.filter((x) => x.t > 0.2 && x.t < dur - lockupS - 0.5 && x.d < 0.012);
  const avgW = body.reduce((a, x) => a + x.width, 0) / Math.max(1, body.length);
  // the ending: from the last big change, how long the film stays nearly still
  // (from the lockup frame on, when the film exports one: what holds before it is a hold, judged by the pace lines)
  let endStill = 0;
  for (let i = pace.length - 1; i >= 0 && pace[i].d < 0.02 && (lockT === null || pace[i].t >= lockT - 0.25); i--) endStill += 0.5;
  // empty runs: references have brief designed blanks (a flash, a breath); a blank that lasts is a hole
  let run = 0, longest = 0, runAt = 0;
  for (const x of frames) {
    if (x.t < dur - 0.6 && x.fill < EMPTY_FILL) { run++; if (run > longest) { longest = run; runAt = x.t - (run - 1) / FPS; } } else run = 0;
  }
  // the longest stretches: an average hides 2-3 s of small centred cards or a finished state that just sits there
  const longestRun = (list, isBad, step) => {
    let r = 0, best = 0, at = 0;
    for (const x of list) {
      if (isBad(x)) { r++; if (r > best) { best = r; at = x.t - (r - 1) * step; } } else r = 0;
    }
    return { s: best * step, at };
  };
  const sparseRun = longestRun(body, (x) => Math.max(x.width, x.height * 0.8) < 0.45, 1 / FPS);
  const stillRun = longestRun(pace.filter((x) => x.t > 0.2 && x.t < dur - lockupS - 0.5), (x) => x.d < 0.012, 0.5);
  const fmt = (list) => list.slice(0, 12).map((x) => x.t.toFixed(1)).join(', ') + (list.length > 12 ? ' ...' : '');
  // air: the body's samples (the first 0.5 s and the lockup excluded)
  const air = airSamples(file, vw, vh).filter((x) => x.t >= 0.5 && x.t <= dur - lockupS);
  const share = (list) => list.length / Math.max(1, air.length);
  const pc = (v) => `${(v * 100).toFixed(0)} %`;
  const crowded = air.filter((x) => x.detail >= 0.35);
  const busy = air.filter((x) => x.detail >= 0.2 && x.things >= 3);
  const cut = air.filter((x) => x.cut >= 2);
  const detailMed = air.length ? air.map((x) => x.detail).sort((a, b) => a - b)[Math.floor(air.length / 2)] : 0;
  console.log(`check: ${file} (${dur.toFixed(1)} s)`);
  // information, not a target: a rich frame (a picture, a detailed UI, texture) is right when the eye knows where to look
  console.log(`  air        sharp detail (type, UI, hard edges) covers ${pc(detailMed)} of the frame at the median; 3+ separate things in ${pc(share(air.filter((x) => x.things >= 3)))} of samples; cut on 2+ sides in ${pc(share(cut))}  (information, not a target: richness is not crowding)`);
  console.log(`  coverage   mean subject width ${(avgW * 100).toFixed(0)} % of the frame; ${sparse.length} of ${body.length} samples under 45 %  (information, not a target: references 44-100 %, median 75 %)`);
  console.log(`  pace       ${slow.length} of ${pace.length} half-seconds with almost nothing changing${slow.length ? `  [from ${fmt(slow)} s]` : ''}`);
  console.log(`  stretches  longest sparse run ${sparseRun.s.toFixed(1)} s${sparseRun.s ? ` (from ${sparseRun.at.toFixed(1)} s)` : ''}; longest still stretch ${stillRun.s.toFixed(1)} s${stillRun.s ? ` (from ${stillRun.at.toFixed(1)} s)` : ''}`);
  console.log(`  empty      ${empty.length} near-empty samples${empty.length ? `  [at ${fmt(empty)} s]` : ''}${frames[0] && frames[0].fill < EMPTY_FILL / 4 ? '  FRAME 0 IS EMPTY' : ''}`);
  if (!loop) console.log(`  ending     the last ${endStill.toFixed(1)} s are nearly still (${((endStill / dur) * 100).toFixed(0)} % of the film)${lockT !== null ? `, measured from the lockup at frame ${lock.f} (${lock.label})` : ''}${sting ? '  (a sting may hold its mark)' : ''}`);
  const snd = loop ? { I: NaN, TP: NaN } : loudness(file);
  if (Number.isFinite(snd.I)) console.log(`  sound      ${snd.I.toFixed(1)} LUFS, true peak ${snd.TP.toFixed(1)} dBTP`);
  // the film's own source (when this project has it): does it play sound, and which library pieces does it take
  const sources = filmSources();
  const wantsSound = sources.some(({ src }) => /<(Cues|Music|Sfx|Audio)\b/.test(src));
  const lib = sources.length ? libraryUse(sources) : null;
  if (lib && lib.known) {
    const times = (k) => (lib.count.get(k) > 1 ? ` x${lib.count.get(k)}` : '');
    console.log(`  library    ${lib.used.length} motion-library piece${lib.used.length === 1 ? '' : 's'} imported by src/films/${film}${lib.used.length ? ` (${lib.used.map((k) => k + times(k)).join(', ')})` : ''}  (information: BEATS.md's Devices block names the piece behind each join, type move and UI move, or why none fits)`);
    if (!lib.used.length) console.log('  LOOK       the film imports no library piece: the library is the default (references/library.md); take the turn, type move or UI piece that does each job and adapt it, and write in BEATS.md why none fits where you build by hand');
    // the same arrival or the same turn more than twice is a pattern the eye counts
    for (const k of lib.used) {
      const n = lib.count.get(k) || 0;
      const sec = lib.section(k);
      if (n > 2 && (sec === 'type' || sec === 'turn')) console.log(`  LOOK       ${k} is placed ${n} times: ${sec === 'type' ? 'every line arrives the same way' : 'every join turns the same way'}; at most twice, and the claim arrives differently from the statements (references/film-grammar.md#devices)`);
    }
    // a words-led brief with no type piece: the words were set by hand, usually mid-weight on an empty ground
    const brief = ['BRIEF.md', path.join('src', 'films', film, 'BRIEF.md')].find((p) => fs.existsSync(p));
    const wordsLed = brief && /words[- ]led|mostly words|type[- ]led|all type|kinetic type/i.test(fs.readFileSync(brief, 'utf8'));
    if (wordsLed && !lib.used.some((k) => lib.section(k) === 'type')) console.log(`  LOOK       ${brief} says the film is led by words, and it imports no library type piece: take the type moves that do the job (references/library-type.md) and make the brief's adjectives choices (references/type.md#4-weight)`);
  }
  // one word arrival repeated: <Words arrive="..."> with the same arrival on more than two lines
  const arrivals = new Map();
  for (const { src } of sources)
    for (const m of src.matchAll(/<Words\b[\s\S]*?\/>/g)) {
      const a = m[0].match(/\barrive=["'](\w+)["']/)?.[1] ?? 'default';
      arrivals.set(a, (arrivals.get(a) || 0) + hostUses(sources, src, m.index));
    }
  for (const [a, n] of arrivals) if (n > 2) console.log(`  LOOK       ${n} lines arrive by ${a === 'default' ? '<Words> with its default arrival' : `<Words arrive="${a}">`}: every line arrives the same way; vary it (a library type move, a line built from its object) and keep one arrival for the claim`);
  // a loop: the last frame must lead back into the first (frame N would equal frame 0)
  const seam = loop ? loopSeam(file, W, H) : null;
  const seamOpen = !!seam && (seam.seam.mean > Math.max(0.012, 2 * seam.step.mean + 0.004) || seam.seam.cell > Math.max(0.1, 2 * seam.step.cell + 0.03));
  if (seam) console.log(`  loop seam  last frame against the first: ${(seam.seam.mean * 100).toFixed(1)} % mean, ${(seam.seam.cell * 100).toFixed(0)} % in the most changed cell (the film's last step: ${(seam.step.mean * 100).toFixed(1)} %, ${(seam.step.cell * 100).toFixed(0)} %)`);
  // a sting under 8 s builds and then holds the mark: no pace gate
  const noPace = sting && dur < 8;
  const fails = [];
  // coverage is no gate: it rises with clutter, and it did not tell a calm film from a crowded one
  if (share(crowded) > CROWD) fails.push(`crowded: sharp detail covers 35 %+ of the frame in ${pc(share(crowded))} of the samples (36 of 40 references stay under ${pc(CROWD)}) [at ${fmt(crowded)} s]: the eye has nowhere to land: keep one focal subject in each frame and set the rest behind it by scale, focus or depth, or give it its own beat`);
  // holds that are read (a statement, a result) are fine; past a quarter the frames are named, past 40 % it fails
  const stillShare = slow.length / Math.max(1, pace.length);
  if (!noPace && stillShare > Number(process.env.CINETIC_CHECK_STILL || 0.4)) fails.push('pace: more than 40 % of the half-seconds hold still. A hold that is read (a statement, a result) is fine; a hold with nothing to read is not: between holds something visible changes every half second (a word, a block, a crop, a value)');
  else if (!noPace && stillShare > Number(process.env.CINETIC_CHECK_STILL_LOOK || 0.25)) console.log(`  LOOK       ${pc(stillShare)} of the half-seconds hold still [from ${fmt(slow)} s]: each hold must have something to read (a statement, a result held until read), never a wait`);
  // limits set generously (2.5 s still, 3.5 s sparse): this catches a true freeze or a long stretch of small things, not a slow
  // creep over a finished state (pixels still change there): judge that by eye with the rubric
  if (!noPace && stillRun.s > 2.5) fails.push(`a ${stillRun.s.toFixed(1)} s stretch from ${stillRun.at.toFixed(1)} s where almost nothing changes`);
  // 37 of 40 references never hold small, sparse frames longer than 3.5 s (a calm frame holds 2-3 s)
  if (sparseRun.s > 3.5) fails.push(`${sparseRun.s.toFixed(1)} s of small, sparse frames from ${sparseRun.at.toFixed(1)} s: a calm frame holds 2-3 s, this long reads as a gap`);
  if ((frames[0] && frames[0].fill < EMPTY_FILL / 4) || longest / FPS >= 1) fails.push(`empty frames: ${frames[0] && frames[0].fill < EMPTY_FILL / 4 ? 'frame 0 is empty' : `${(longest / FPS).toFixed(1)} s of nothing from ${runAt.toFixed(1)} s`}`);
  if (!loop && !sting && endStill > Math.max(2.5, dur * 0.12)) fails.push('the ending is too long: lockup at most 2.5 s, claim and lockup together at most a fifth of the film (3.5 s under 18 s)');
  if (loop && !seam) fails.push('the loop seam could not be read (is the file shorter than two frames?)');
  if (seamOpen) fails.push('the loop does not close: the last frame differs visibly from the first (render frames 0 to N-1, where frame N equals frame 0, and give every cycle a period that divides N)');
  const isPreview = /preview/i.test(path.basename(file));
  if (isPreview && Number.isFinite(snd.TP) && snd.TP > -1) console.log('  (a preview is not limited: judge loudness and true peak on the muxed master)');
  if (!isPreview && Number.isFinite(snd.TP) && snd.TP > -1) fails.push(`sound: true peak ${snd.TP.toFixed(1)} dBTP clips; re-mux (frames.mjs mux) or lower the loudest cue`);
  if (!isPreview && Number.isFinite(snd.I) && (snd.I > -13 || snd.I < -20)) fails.push(`sound: ${snd.I.toFixed(1)} LUFS is off the -16 LUFS target`);
  if (!loop) fails.push(...musicRunsOut(dur));
  // a film whose code plays sound but whose file is silent: the sound never reached the render
  const silentFile = !Number.isFinite(snd.I) || snd.I < -45;
  if (!loop && !silentOk && wantsSound && silentFile) fails.push(`silent: src/films/${film} plays sound (Cues, Music or Sfx) but ${path.basename(file)} is silent (${Number.isFinite(snd.I) ? `${snd.I.toFixed(1)} LUFS` : 'no audio stream'}): the sound insert failed (a part rendered --muted, parts joined without --audio, a file missing from public/sfx or public/music); render the sound (frames.mjs audio) and mux it, or pass --silent for a film meant to be silent`);
  // LOOK lines name the frames; the share at which they speak is where 3 in 4 references stay (a small subject alone on calm
  // ground is NOT flagged: 28 of 40 references hold one)
  if (busy.length && share(busy) > BUSY) console.log(`  LOOK       3+ separate things with 20 %+ of the frame in detail at ${fmt(busy)} s (${pc(share(busy))} of samples; 3 in 4 references stay under ${pc(BUSY)}): make sure one of them is the focal subject the eye goes to first and the rest support it`);
  if (cut.length && share(cut) > CUT) console.log(`  LOOK       the frame edge cuts detail on 2+ sides at ${fmt(cut)} s (${pc(share(cut))} of samples; 3 in 4 references stay under ${pc(CUT)}): crop only a lone giant word, or one component off one side`);
  console.log(fails.length ? `  FIX: ${fails.join('\n  FIX: ')}` : '  pass');
  if (!fails.length) console.log('  (passing is necessary, not sufficient: check cannot see a hold with nothing to read, a join that carries a token instead of the subject, a repeated layout, a second full demo, faint or blurred text used as texture, or a weak idea; score the sheet with the rubric)');
}

/**
 * sheet --safe: a thin outline of the 8 % safe margin in every cell, drawn by ffmpeg over the finished sheet. The cells are
 * found the way Sheet.tsx lays them out (the grid that shows the film's aspect biggest in 1920x1080).
 */
function safeMargins(out, props, scale) {
  const src = fs.existsSync('src/films.ts') ? fs.readFileSync('src/films.ts', 'utf8') : '';
  const entry = src.match(new RegExp(`['"]?${film}['"]?\\s*:\\s*\\{[^}]*\\}`))?.[0] ?? '';
  const FW = Number(entry.match(/width:\s*(\d+)/)?.[1] ?? 1920);
  const FH = Number(entry.match(/height:\s*(\d+)/)?.[1] ?? 1080);
  const cols = props.cols ?? 6;
  const count = props.frames ? props.frames.length : cols * cols;
  let best = { c: cols, r: Math.ceil(count / cols), s: 0 };
  for (let c = 1; c <= count; c++) {
    const r = Math.ceil(count / c);
    const s = Math.min(1920 / (c * FW), 1080 / (r * FH));
    if (s > best.s) best = { c, r, s };
  }
  const w = FW * best.s * scale, h = FH * best.s * scale;
  const boxes = [];
  for (let i = 0; i < count; i++) {
    const x = (i % best.c) * w, y = Math.floor(i / best.c) * h;
    boxes.push(`drawbox=x=${Math.round(x + w * 0.08)}:y=${Math.round(y + h * 0.08)}:w=${Math.round(w * 0.84)}:h=${Math.round(h * 0.84)}:color=0x00e5ff@0.8:t=1`);
  }
  const tmp = out.replace(/(\.\w+)$/, '.safe$1');
  run('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', boxes.join(','), '-frames:v', '1', '-update', '1', tmp]);
  fs.renameSync(tmp, out);
}

/** Print the master's length, size and loudness. */
const report = (file) => {
  const { I, TP } = loudness(file);
  console.log(`master: ${file}  ${I.toFixed(1)} LUFS  true peak ${TP.toFixed(1)} dBTP${TP > -1 ? '  WARNING: true peak over -1 dBTP (it will clip on some players): lower the loudest cue or re-mux' : ''}`);
};

/** One still of frozen frames of a film (props: film, cols, frames or from/to), written to `out`. */
const sheet = (props, out, scale = 1, safe = false) => {
  ensureDir(out);
  remotion(['still', 'src/index.ts', 'Sheet', out, `--props=${JSON.stringify(props)}`, '--frame=0', `--scale=${scale}`, ...gl, '--log=error']);
  if (safe) safeMargins(out, props, scale);
  console.log(`sheet: ${out}`);
};

/** The `library` command: find pieces in the catalogue, show one, or render one's frames from its reel. */
function library() {
  const lib = loadLibrary();
  if (!lib) {
    console.error('library: no src/kit/library/catalog/ here (run it in a film project or in the kit)');
    process.exit(1);
  }
  const byName = (n) => {
    const e = lib.find((x) => x.name.toLowerCase() === String(n).toLowerCase());
    if (!e) {
      const near = lib.filter((x) => x.name.toLowerCase().includes(String(n).toLowerCase())).map((x) => x.name);
      console.error(`library: no piece "${n}"${near.length ? ` (did you mean ${near.join(', ')}?)` : ''}`);
      process.exit(1);
    }
    return e;
  };
  const stripCmd = (e) => `node scripts/frames.mjs library --strip ${e.name}`;
  if (opt('strip')) {
    const e = byName(opt('strip'));
    sheet({ film: e.reel.film, from: e.reel.from, to: e.reel.to, cols: 4 }, opt('out', `out/library/${e.name}.png`));
    return;
  }
  if (opt('show')) {
    const e = byName(opt('show'));
    const where = CATEGORIES[e.category] ?? { folder: e.category, doc: `library-${e.category}.md` };
    if (has('json')) return console.log(JSON.stringify(e, null, 2));
    console.log(`${e.name}  (${e.category}; ${e.purpose.join(', ')}; ${e.subject.join(', ')}; ${e.mood.join(', ')}; about ${e.frames} f)`);
    console.log(`  looks     ${e.summary}`);
    console.log(`  use       ${e.use}`);
    if (e.caution) console.log(`  caution   ${e.caution}`);
    console.log(`  import    import { ${e.name} } from '../../kit';`);
    // its props, read from the types (a few seconds); silent when TypeScript is not installed
    const propsTool = new URL('./library-props.mjs', import.meta.url);
    if (fs.existsSync(propsTool)) {
      const r = spawnSync(process.execPath, [propsTool.pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--props', e.name], { encoding: 'utf8' });
      const rows = r.status === 0 ? r.stdout.split(/\r?\n/).slice(1).filter((l) => l.trim()) : [];
      for (const l of rows) console.log(`  ${l.trim().replace(/^(required|optional)\s+/, (m, k) => (k === 'required' ? 'props     required: ' : '          optional: '))}`);
    }
    console.log(`  file      src/kit/library/${where.folder}/${e.name}.tsx`);
    console.log(`  docs      references/${where.doc}, the section on ${e.name} (its props, numbers and a usage line)`);
    console.log(`  reel      --film ${e.reel.film}, frames ${e.reel.from}-${e.reel.to}${e.reel.shownIn ? ` (inside ${e.reel.shownIn}'s segment)` : ''}`);
    console.log(`  strip     ${stripCmd(e)}`);
    return;
  }
  const filters = ['category', 'purpose', 'subject', 'mood'].map((k) => [k, opt(k)]).filter(([, v]) => v);
  const matches = lib.filter((e) => filters.every(([k, v]) => v.split(',').some((x) => [e[k]].flat().includes(x.trim()))));
  if (has('json')) return console.log(JSON.stringify(matches, null, 2));
  if (!matches.length) {
    const vals = (k) => [...new Set(lib.flatMap((e) => [e[k]].flat()))].sort().join(', ');
    console.log(`no piece matches. categories: ${vals('category')}; purposes: ${vals('purpose')}; subjects: ${vals('subject')}; moods: ${vals('mood')}`);
    return;
  }
  const w = Math.max(...matches.map((e) => e.name.length));
  const pw = Math.max(...matches.map((e) => e.purpose.join(',').length));
  for (const e of matches) console.log(`${e.name.padEnd(w)}  ${e.category.padEnd(6)}  ${e.purpose.join(',').padEnd(pw)}  ${String(e.frames).padStart(3)} f  ${e.summary}`);
  console.log(`${matches.length} of ${lib.length} pieces${filters.length ? ` (${filters.map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}. One in full: library --show <Name>; its frames: library --strip <Name>`);
}

if (cmd === 'sheet') {
  const props = { film };
  if (opt('grid')) props.cols = Number(opt('grid'));
  if (opt('frames')) props.frames = opt('frames').split(',').map(Number);
  if (opt('from')) props.from = Number(opt('from'));
  if (opt('to')) props.to = Number(opt('to'));
  sheet(props, opt('out', opt('frames') ? `out/${film}-moment.png` : `out/${film}-sheet.png`), has('half') ? 0.5 : 1, has('safe'));
} else if (cmd === 'library') {
  library();
} else if (cmd === 'still') {
  const frame = opt('frame', '0');
  const out = opt('out', `out/${film}-f${frame}.png`);
  ensureDir(out);
  remotion(['still', 'src/index.ts', film, out, `--frame=${frame}`, `--scale=${has('full') ? 1 : 0.5}`, ...gl, '--log=error']);
  console.log(`still: ${out}`);
} else if (cmd === 'render') {
  const final = has('final');
  const range = opt('range');
  const out = opt('out', `out/${film}${final ? '' : '-preview'}${range ? `-${range}` : ''}.mp4`);
  ensureDir(out);
  remotion(['render', 'src/index.ts', film, out, `--scale=${final ? 1 : 0.5}`, ...(range ? [`--frames=${range}`] : []), ...(has('muted') ? ['--muted'] : []), ...gl, ...conc, '--log=error']);
  console.log(`video: ${out}`);
} else if (cmd === 'audio') {
  const out = opt('out', 'out/audio.wav');
  ensureDir(out);
  remotion(['render', 'src/index.ts', film, out, '--codec=wav', '--scale=0.1', ...gl, ...conc, '--log=error']);
  console.log(`audio: ${out}`);
} else if (cmd === 'final') {
  const raw = 'out/.final-raw.mp4';
  ensureDir(raw);
  remotion(['render', 'src/index.ts', film, raw, '--scale=1', ...gl, ...conc, '--log=error']);
  const out = opt('out', `out/${film}.mp4`);
  loudMux(raw, raw, out);
  fs.rmSync(raw);
  report(out);
} else if (cmd === 'mux') {
  // an mp4 given as the sound source (--audio out/preview.mp4) is not a picture part
  const parts = args.slice(1).filter((a) => a.endsWith('.mp4') && a !== opt('out') && a !== opt('audio'));
  const out = opt('out', `out/${film}.mp4`);
  const audio = opt('audio', 'out/audio.wav');
  if (!parts.length) throw new Error('mux needs the video parts');
  // no sound given and none rendered: join the muted parts into a silent file (a loop, a preview in parts)
  const silent = !opt('audio') && !fs.existsSync(audio);
  if (!silent && !fs.existsSync(audio)) throw new Error(`no ${audio}: run node scripts/frames.mjs audio first`);
  ensureDir(out);
  if (silent) {
    const list = path.resolve(path.dirname(path.resolve(out)), '.join.txt');
    fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
    run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-map', '0:v:0', '-c', 'copy', '-an', '-movflags', '+faststart', out]);
    fs.rmSync(list);
    console.log(`silent: ${out} (no --audio and no ${audio}: the parts joined without sound)`);
    process.exit(0);
  }
  let video = parts[0];
  if (parts.length > 1) {
    fs.mkdirSync('out', { recursive: true });
    const list = path.resolve('out', '.join.txt');
    video = 'out/.joined.mp4';
    fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
    run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-an', video]);
    fs.rmSync(list);
  }
  loudMux(video, audio, out);
  if (video !== parts[0]) fs.rmSync(video);
  report(out);
} else if (cmd === 'join') {
  console.log('note: join copies the parts as they are; for a master with sound use render --muted parts + audio + mux');
  const parts = args.slice(1).filter((a) => a.endsWith('.mp4') && a !== opt('out'));
  const out = opt('out', `out/${film}.mp4`);
  if (parts.length < 2) throw new Error('join needs two or more parts');
  ensureDir(out);
  const list = path.resolve('out', '.join.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  fs.rmSync(list);
  console.log(`joined: ${out}`);
} else if (cmd === 'check') {
  const format = opt('format', 'launch');
  if (!['launch', 'loop', 'sting'].includes(format)) throw new Error('--format is launch, loop or sting');
  // a loop has no lockup: its body runs to the last frame
  checkFilm(args[1] && !args[1].startsWith('--') ? args[1] : `out/${film}-preview.mp4`, Number(opt('lockup', format === 'loop' ? '0' : '2')), format, has('silent'), opt('lockup') !== undefined);
} else if (cmd === 'joins') {
  // every join at real size: one render call (one browser); the Joins composition draws join i on its frame i
  let joins;
  if (opt('at')) joins = frameList(opt('at').split(','));
  else {
    try { joins = frameList(filmConst('JOINS')); } catch (e) {
      console.error(`joins: no --at and the film's JOINS could not be read (${e.message}). Export the join frames beside T (export const JOINS = [T.turn, T.dive, ...], plain numbers or T's fields) or pass --at 120,245,390`);
      process.exit(1);
    }
  }
  joins = [...new Set(joins)].filter((j) => j >= 0).sort((a, b) => a - b);
  if (!joins.length) { console.error('joins: no join frames (JOINS is empty and no --at)'); process.exit(1); }
  const pad = Math.max(1, Math.min(6, Number(opt('pad', '4'))));
  const cell = has('full') ? 1920 : 960;
  const dir = opt('out', 'out/joins');
  const seq = path.join(dir, `_frames_${process.pid}`); // no dot: Remotion reads a dot as an extension
  fs.mkdirSync(seq, { recursive: true });
  const props = { film, joins, pad, cell };
  remotion(['render', 'src/index.ts', 'Joins', seq, '--sequence', '--image-format=png', `--frames=0-${joins.length - 1}`, `--props=${JSON.stringify(props)}`, ...gl, ...conc, '--log=error']);
  const files = fs.readdirSync(seq).filter((f) => /\.png$/i.test(f)).sort((a, b) => Number(a.match(/(\d+)\D*$/)?.[1] ?? 0) - Number(b.match(/(\d+)\D*$/)?.[1] ?? 0));
  const outs = [];
  files.forEach((f, i) => {
    if (i >= joins.length) return;
    const to = path.join(dir, `${film}-join-${joins[i]}.png`);
    fs.rmSync(to, { force: true });
    fs.renameSync(path.join(seq, f), to);
    outs.push(to);
  });
  fs.rmSync(seq, { recursive: true, force: true });
  for (const o of outs) console.log(`join: ${o}`);
  console.log(`${outs.length} join image${outs.length === 1 ? '' : 's'} (frames J-${pad} .. J+${pad}, ${cell} px cells). Look at every cell: anything cut by the frame or its box, overlapping or overprinted text, an empty slab, a one-frame pop or flip of ground, a camera snap, misaligned parts, a thing leaving before the cut.`);
} else if (cmd === 'strip') {
  const src = args[1];
  const at = opt('at', '0');
  const dur = opt('dur', '2');
  const fps = opt('fps', '15');
  const out = opt('out', `out/strip-${at}s.jpg`);
  ensureDir(out);
  // the grid fits the frames: few frames are drawn larger, never a sheet that is half black
  const count = Math.max(1, Math.min(36, Math.ceil(Number(dur) * Number(fps))));
  const cols = count <= 12 ? Math.min(4, count) : 6;
  const rows = Math.ceil(count / cols);
  run('ffmpeg', ['-v', 'error', '-y', '-ss', at, '-t', dur, '-i', src, '-vf', `fps=${fps},scale=${cols === 6 ? 320 : 480}:-2,tile=${cols}x${rows}:padding=2`, '-frames:v', '1', '-q:v', '4', '-threads', '2', out]);
  console.log(`strip: ${out}`);
} else {
  const head = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n');
  console.log(head.slice(1, head.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
}
