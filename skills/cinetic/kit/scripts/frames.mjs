#!/usr/bin/env node
// frames.mjs: every picture a film makes, from one command. Run it inside a film project.
//
//   node scripts/frames.mjs sheet [--film main] [--grid 6] [--from 0 --to 599 | --frames 0,40,90] [--out out/main-sheet.png]
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
//        Every frame is also scanned for brief flat-black unpainted patches; those produce FIX lines.
//        Every frame's motion is summed up (pops, dead stops, hard starts, stepping, tail; as information) and dead
//        holds fail: a stretch of more than 15 still frames before the last 1.5 s, or over 15 % of frames fully still.
//   node scripts/frames.mjs motion <file.mp4> [--range a-b] [--out <image.png>] [--cuts f1,f2,...] [--json]
//        every frame: cuts, pops, dead stops, hard starts, stepping, stillness and settling tails.
//        Zero-based inclusive frame numbers, native timestamps and fps; no project needed. --cuts declares joins.
//        Writes a 1600x500 PNG beside the video by default (<name>-motion.png); --json emits the full measurements.
//        Stillness excludes the file's final 1.5 seconds; tail medians omit incomplete bursts.
//        Good motion targets: median tail about 9.5 f at 30 fps, still share about 6.9 %,
//        about 46.5 pop candidates/minute. These are typical measurements, not pass/fail limits.
//        Tail median: complete bursts in four disjoint regions; cuts do not contribute to tail change.
//        Pixel changes locate candidates for inspection; they cannot measure perceived speed or design intent.
//   node scripts/frames.mjs strip out/film.mp4 --at 4.5 [--dur 2] [--fps 15] [--out out/strip.jpg]
//        a dense contact strip of a moment of a rendered video (motion check: an entrance, a turn, a morph)
//   node scripts/frames.mjs joins [--film main] [--at 120+14,245+8,390] [--pad 4] [--full] [--file out/main.mp4] [--out out/joins]
//        every join at real size, the whole move: for a join given as its move's first frame and length (120+14, or
//        { at: 120, len: 14 } in JOINS) every frame from 2 before the move to 4 after it, in rows of six 960 px cells
//        (--full: rows of three at 1920; a vertical film 540 / 1080), one image a join (out/joins/<film>-join-<at>.png),
//        the frame number on each cell, the move outlined. A move over 36 f is sampled evenly (the image says so). A bare
//        frame (390) still gives the 9 frames round it (--pad sets how many); the command lists the joins given that way.
//        Without --at it reads the film's exported JOINS (beside T). One browser, one render call.
//        Look at every cell before the final and after every fix that touches the join.
//        --file out/main.mp4: the same images cut from the rendered file (decoded frame numbers), so a fix is checked
//        on the final: out/joins/main-final-join-<at>.png. ffmpeg only, no browser.
//   node scripts/frames.mjs library [words] [--category turn] [--purpose join] [--subject card] [--mood calm] [--json]
//        the motion library's pieces that match (src/kit/library/catalog/), one line each: name, category, purpose,
//        frames, what it looks like. A filter takes one value or several joined by commas (any of them matches). Words
//        search name, summary, use, subject, purpose and mood (every word must match; none: the nearest subjects).
//   node scripts/frames.mjs library --show DiveInto
//        one piece in full: when to use it, its caution, its import line, its file and the command for its strip
//   node scripts/frames.mjs library --strip DiveInto [--out out/library/DiveInto.png]
//        the piece's frames from its reel as one still (16 frames, 4x4)
//
// GL: set CINETIC_GL=swangle to render on the CPU (software GL) when the GPU is unstable; otherwise Remotion's default.
// Concurrency: CINETIC_CONCURRENCY (default 2; set 1 when the machine offers one thread: "concurrency 2 > 1 core").
// CINETIC_BROWSER: a Chrome Headless Shell shared by every film project. CINETIC_TIMEOUT: milliseconds a frame may wait
// for its assets (Remotion's --timeout, default 30000); raise it when footage frames time out under load.
// Nothing here uploads anything.
import { spawn, spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { CATEGORIES, loadLibrary } from './library-catalog.mjs';
import { staleKitWarning } from './kit-version.mjs';

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
// CINETIC_TIMEOUT: Remotion's per-frame wait for assets (a footage frame under a loaded CPU), in ms
const timeout = /^\d+$/.test(process.env.CINETIC_TIMEOUT ?? '') ? [`--timeout=${process.env.CINETIC_TIMEOUT}`] : [];

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
const remotion = (a) => run(process.execPath, [cli(), ...a, ...browser, ...timeout]);
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

const GROUND_LIT = process.env.CINETIC_CHECK_OLDGROUND ? false : true; // switch for the older ground measure
// a frame is empty when almost nothing differs from the ground (a single clean line of type is NOT empty)
const EMPTY_FILL = Number(process.env.CINETIC_CHECK_EMPTY || 0.006);
// air: sharp detail = type, UI, hard edges; soft light, gradients and blur are not
const CROWD = Number(process.env.CINETIC_CHECK_CROWD || 0.27); // FAIL: share of samples with 35 %+ of the frame in sharp detail
const BUSY = Number(process.env.CINETIC_CHECK_BUSY || 0.25); // LOOK: share of samples with 3+ separate things and 20 %+ detail
const CUT = Number(process.env.CINETIC_CHECK_CUT || 0.25); // LOOK: share of samples where the frame edge cuts detail on 2+ sides
// a picture under the interface: one connected textured region (a photograph, footage) of this share of the frame or more
// is a picture, and its own texture is not crowding (CINETIC_CHECK_PICTURE=0 counts it as before)
const PICTURE = Number(process.env.CINETIC_CHECK_PICTURE ?? 0.4);

/**
 * Air: 2 samples a second, grey, the long side 640 px, cut into 20-px cells (60 px of a 1080p frame). A cell is detail when
 * 4 %+ of its pixels sit on a hard edge. Per sample: the share of the frame in detail, the number of separate things (8-connected
 * detail of 1 %+ of the frame) and the number of frame sides where 15 %+ of the border is detail.
 * A cell is textured when fewer than a third of its pixels are flat (gradient under 3): a photograph or footage, never a
 * flat ground, a card or type on a card. When one connected textured region covers PICTURE of the frame or more, the
 * sample has a picture under it, and `crowd` (what the crowded line counts) is the detail of the cells that are NOT
 * textured: the layer above the picture (cards, plates, type on a ground), not the petals of the picture itself.
 */
function airSamples(file, vw, vh) {
  const L = 640, C = 20;
  const W = vw >= vh ? L : Math.round((L * vw) / vh / 5) * 5;
  const H = vw >= vh ? Math.round((L * vh) / vw / 5) * 5 : L;
  const buf = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', `fps=2,scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 }).stdout;
  const FS = W * H, n = Math.floor(buf.length / FS);
  const cw = Math.floor(W / C), ch = Math.floor(H / C), N = cw * ch;
  const cnt = new Uint16Array(N), flat = new Uint16Array(N), lab = new Int32Array(N);
  const out = [];
  for (let f = 0; f < n; f++) {
    const o = f * FS;
    cnt.fill(0);
    flat.fill(0);
    for (let y = 0; y < ch * C; y++) {
      const up = y > 0 ? W : 0, dn = y < H - 1 ? W : 0, row = Math.floor(y / C) * cw;
      for (let x = 0; x < cw * C; x++) {
        const i = o + y * W + x;
        const g = Math.abs(buf[i + (x < W - 1 ? 1 : 0)] - buf[i - (x > 0 ? 1 : 0)]) / 2 + Math.abs(buf[i + dn] - buf[i - up]) / 2;
        if (g > 40) cnt[row + Math.floor(x / C)]++;
        else if (g < 3) flat[row + Math.floor(x / C)]++;
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
    // the picture: the largest 4-connected region of textured cells
    const tex = Array.from(flat, (c) => c < (C * C) / 3);
    const seen = new Uint8Array(N);
    let pic = 0, picLab = null;
    for (let s = 0; s < N; s++) {
      if (!tex[s] || seen[s]) continue;
      const reg = [s];
      seen[s] = 1;
      for (let r = 0; r < reg.length; r++) {
        const k = reg[r], x = k % cw;
        for (const q of [k - cw, k + cw, x > 0 ? k - 1 : -1, x < cw - 1 ? k + 1 : -1]) if (q >= 0 && q < N && tex[q] && !seen[q]) { seen[q] = 1; reg.push(q); }
      }
      if (reg.length > pic) { pic = reg.length; picLab = reg; }
    }
    const isPic = PICTURE > 0 && pic / N >= PICTURE;
    const inPic = new Uint8Array(N);
    if (isPic) for (const k of picLab) inPic[k] = 1;
    const crowd = det.filter((d, k) => d && !inPic[k]).length / N;
    const side = (cells) => cells.filter((k) => det[k]).length / cells.length >= 0.15;
    const top = [], bot = [], lef = [], rig = [];
    for (let x = 0; x < cw; x++) { top.push(x); bot.push((ch - 1) * cw + x); }
    for (let y = 0; y < ch; y++) { lef.push(y * cw); rig.push(y * cw + cw - 1); }
    out.push({ t: f / 2, detail: det.filter(Boolean).length / N, crowd: isPic ? crowd : det.filter(Boolean).length / N, picture: isPic, things, cut: [top, bot, lef, rig].filter(side).length });
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

/**
 * One join, from JOINS or --at: a bare frame (`245`: the nine frames round it, the old form), or the move's first frame
 * and its length (`{ at: 245, len: 14 }`, `{ at: 245, to: 258 }`, `"245+14"` on the command line). null when unreadable.
 */
function joinSpec(v) {
  const n = (x) => (Number.isFinite(Number(x)) && String(x).trim() !== '' ? Math.round(Number(x)) : null);
  if (v && typeof v === 'object') {
    const at = n(v.at ?? v.from);
    if (at === null) return null;
    const len = v.len != null ? n(v.len) : v.to != null && n(v.to) !== null ? n(v.to) - at + 1 : null;
    return { at, len: len !== null && len > 0 ? len : null };
  }
  const m = /^\s*(-?\d+)\s*\+\s*(\d+)\s*$/.exec(String(v));
  if (m) return { at: Number(m[1]), len: Math.max(1, Number(m[2])) };
  const at = n(v);
  return at === null ? null : { at, len: null };
}

/** The film's lockup frame: an exported LOCKUP, else T.lockup; null when it has neither (or they cannot be read). */
function lockupFrame() {
  const texts = filmTexts();
  for (const [label, read] of [['LOCKUP', () => filmConst('LOCKUP', texts)], ['T.lockup', () => filmConst('T', texts)?.lockup]]) {
    try { const f = frameList(read())[0]; if (Number.isFinite(f)) return { f, label }; } catch { /* not there, or not plain */ }
  }
  return null;
}

/** Every decoded picture, without resampling time. Only small measurements survive the stream. */
async function motionFrames(file, range) {
  const pr = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,r_frame_rate,duration,start_time,nb_frames', '-of', 'json', file], { encoding: 'utf8' });
  if (pr.status !== 0) throw new Error(`cannot probe ${file}: ${pr.stderr || pr.error?.message}`);
  const s = JSON.parse(pr.stdout).streams?.[0];
  const rate = (v) => { const [a, b = 1] = String(v).split('/').map(Number); return a / b; };
  const fps = rate(s?.avg_frame_rate) || rate(s?.r_frame_rate);
  if (!s?.width || !s.height || !(fps > 0)) throw new Error(`no readable video stream: ${file}`);
  const match = range === undefined ? null : /^(\d+)-(\d+)$/.exec(range);
  if (range !== undefined && (!match || Number(match[2]) < Number(match[1]))) throw new Error('--range needs inclusive zero-based frames a-b');
  const from = match ? Number(match[1]) : 0, to = match ? Number(match[2]) : Infinity;
  const first = Math.max(0, from - 8), W = 160, H = Math.max(16, Math.round(W * s.height / s.width));
  const size = W * H, sizes = new Uint32Array(256), cellSizes = new Uint32Array(64), ids = new Uint16Array(size), cells = new Uint8Array(size);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = Math.floor(y * 16 / H) * 16 + Math.floor(x * 16 / W);
    const c = Math.floor(y * 8 / H) * 8 + Math.floor(x * 8 / W);
    ids[i] = k; cells[i] = c; sizes[k]++; cellSizes[c]++;
  }
  const frames = [], times = [];
  let previous, pending = Buffer.alloc(0), logs = '', line = '';
  const consume = (buf) => {
    const sums = new Float64Array(256), sq = new Float64Array(256), black = new Uint32Array(256), changes = new Float64Array(64), tileChanges = new Float64Array(256);
    let total = 0;
    for (let i = 0; i < size; i++) {
      const v = buf[i], k = ids[i]; sums[k] += v; sq[k] += v * v; if (v <= 6) black[k]++;
      if (previous) { const d = Math.abs(v - previous[i]); total += d; changes[cells[i]] += d; tileChanges[k] += d; }
    }
    frames.push({ frame: first + frames.length, mean: previous ? total / size : null,
      cells: previous ? Array.from(changes, (v, i) => v / cellSizes[i]) : null,
      tiles: Array.from(sums, (v, i) => { const mean = v / sizes[i]; return { mean, black: black[i] / sizes[i], flat: mean <= 4 && sq[i] / sizes[i] - mean * mean <= 3 && black[i] / sizes[i] >= 0.98, change: previous ? tileChanges[i] / sizes[i] : null }; }) });
    previous = Buffer.from(buf);
  };
  const trim = `trim=start_frame=${first}${Number.isFinite(to) ? `:end_frame=${to + 1}` : ''}`;
  await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'info', '-copyts', '-hwaccel', 'none', '-threads', '2', '-i', file, '-an', '-sn', '-dn', '-vf', `${trim},scale=${W}:${H}:flags=area,format=gray,showinfo`, '-filter_threads', '1', '-fps_mode', 'passthrough', '-threads', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { windowsHide: true });
    child.stdout.on('data', (chunk) => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      let i = 0; for (; i + size <= pending.length; i += size) consume(pending.subarray(i, i + size));
      pending = Buffer.from(pending.subarray(i));
    });
    child.stderr.on('data', (chunk) => {
      logs = (logs + chunk).slice(-6000); line += chunk;
      const lines = line.split(/\r?\n/); line = lines.pop();
      for (const l of lines) { const m = /\bn:\s*(\d+).*?pts_time:([\d.e+\-]+)/.exec(l); if (m) times[Number(m[1])] = Number(m[2]); }
    });
    child.on('error', reject);
    child.on('close', (code) => code === 0 && !pending.length && frames.length ? resolve() : reject(new Error(`motion decode failed (${code}): ${logs}`)));
  });
  const start = Number(s.start_time) || 0;
  frames.forEach((f, i) => { f.time = Number.isFinite(times[i]) ? times[i] - start : f.frame / fps; });
  const duration = Number(s.duration) || (Number(s.nb_frames) / fps) || (frames.at(-1).time + 1 / fps);
  return { file, fps, width: s.width, height: s.height, sampleWidth: W, sampleHeight: H, from, to: frames.at(-1).frame, duration, frames };
}

const motionQuantile = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), n = (b.length - 1) * p, i = Math.floor(n); return b[i] + (b[Math.ceil(n)] - b[i]) * (n - i); };
const motionWhere = (e) => `frames ${e.from}${e.to !== e.from ? `-${e.to}` : ''} (${e.start.toFixed(3)}-${e.end.toFixed(3)} s)`;
function motionGroups(mask, width = 8) {
  const seen = new Set(), out = [];
  for (let k = 0; k < mask.length; k++) if (mask[k] && !seen.has(k)) {
    const group = [], todo = [k]; seen.add(k);
    while (todo.length) {
      const p = todo.pop(); group.push(p);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p % width + dx, y = Math.floor(p / width) + dy, q = y * width + x;
        if (x >= 0 && x < width && y >= 0 && q < mask.length && mask[q] && !seen.has(q)) { seen.add(q); todo.push(q); }
      }
    }
    out.push(group);
  }
  return out;
}
function motionPosition(group, width = 8) {
  const xs = group.map((k) => k % width), ys = group.map((k) => Math.floor(k / width));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { position: `${['left', 'centre', 'right'][Math.min(2, Math.floor((x0 + x1 + 1) / (2 * width) * 3))]}, ${['top', 'middle', 'bottom'][Math.min(2, Math.floor((y0 + y1 + 1) / (2 * width) * 3))]}`, share: group.length / (width * width), box: [x0 / width, y0 / width, (x1 + 1) / width, (y1 + 1) / width] };
}
function motionEvent(data, a, b, extra = {}) {
  return { from: data.frames[a].frame, to: data.frames[b].frame, start: data.frames[a].time, end: data.frames[b].time, ...extra };
}

/** Brief flat-black patches, including interrupted runs in the same damaged region. */
function unpaintedRegions(data) {
  const f = data.frames, byFrame = Array.from({ length: f.length }, () => new Set());
  for (let k = 0; k < 256; k++) for (let i = 1; i < f.length - 1; i++) {
    const dark = (t) => (f[t].tiles[k].black ?? (f[t].tiles[k].flat ? 1 : 0)) >= 0.35;
    if (!dark(i) || dark(i - 1)) continue;
    let j = i; while (j + 1 < f.length && dark(j + 1)) j++;
    if (j - i < 12 && j + 1 < f.length && [i - 1, j + 1].every((t) => f[t].tiles[k].mean >= 12 && (f[t].tiles[k].black ?? 0) < 0.1) && f[i].tiles[k].change >= 10 && f[j + 1].tiles[k].change >= 10) {
      for (let t = i; t <= j; t++) byFrame[t].add(k);
    }
    i = j;
  }
  const hits = [];
  for (let i = 1; i < f.length - 1; i++) {
    const all = [...byFrame[i]], blackShare = all.reduce((s, k) => s + (f[i].tiles[k].black ?? 1), 0) / 256;
    if (blackShare < 0.045) continue;
    const groups = motionGroups(Array.from({ length: 256 }, (_, k) => byFrame[i].has(k)), 16);
    // Partial cells describe the edges; the interval must also contain a truly flat core.
    const good = groups.filter((g) => g.length >= 2).flat();
    if (good.reduce((s, k) => s + (f[i].tiles[k].black ?? 1), 0) / 256 < 0.045) continue;
    const pos = motionPosition(good, 16), [x0, y0, x1, y1] = pos.box;
    if ((x1 - x0) * (y1 - y0) > 0.85) continue;
    hits.push({ i, good, ...pos });
  }
  const out = [];
  for (let h = 0; h < hits.length; h++) {
    const a = hits[h].i, group = new Set(hits[h].good); let b = a;
    while (h + 1 < hits.length && hits[h + 1].i <= b + 2) { h++; b = hits[h].i; hits[h].good.forEach((k) => group.add(k)); }
    const interval = hits.filter((x) => x.i >= a && x.i <= b);
    const solid = interval.some((x) => x.good.some((k) => [[2, 3], [3, 2]].some(([w, h]) => k % 16 + w <= 16 && Math.floor(k / 16) + h <= 16 && Array.from({ length: w * h }, (_, j) => k + Math.floor(j / w) * 16 + j % w).every((p) => x.good.includes(p) && f[x.i].tiles[p].flat))));
    if (!solid) continue;
    const pos = motionPosition([...group], 16), [x0, y0, x1, y1] = pos.box;
    const outside = Array.from({ length: 256 }, (_, k) => k).filter((k) => k % 16 < x0 * 16 - 1 || k % 16 > x1 * 16 || Math.floor(k / 16) < y0 * 16 - 1 || Math.floor(k / 16) > y1 * 16);
    if (outside.length < 24) continue;
    const calm = [a, b + 1].every((t) => outside.filter((k) => f[t].tiles[k].change > 12).length / outside.length < 0.2 && outside.reduce((s, k) => s + f[t].tiles[k].change, 0) / outside.length < 6);
    if (calm) out.push(motionEvent(data, a, b, { ...pos, blackFrames: hits.filter((x) => x.i >= a && x.i <= b).map((x) => f[x.i].frame) }));
  }
  return out;
}

/** Pixel change is evidence to inspect, not optical velocity or a verdict on the choreography. */
function measureMotion(data, declared = []) {
  const f = data.frames, n = f.length;
  const noise = motionQuantile(f.flatMap((x) => x.cells || []), 0.2) || 0;
  const threshold = Math.max(0.35, Math.min(3, noise * 4 + 0.2));
  const active = f.map((x) => x.cells ? x.cells.some((v) => v > threshold) : null);
  const cuts = [], cutSet = new Set();
  for (let i = 1; i < n; i++) {
    const near = declared.some((v) => Math.abs(f[i].frame - v) <= 2);
    const context = f.slice(Math.max(1, i - 3), Math.min(n, i + 4)).filter((_, k) => Math.max(1, i - 3) + k !== i).map((x) => x.mean);
    const broad = f[i].cells.filter((v) => v > 12).length >= 45;
    if ((near && f[i].mean > Math.max(1, threshold * 2)) || (broad && f[i].mean > 16 && f[i].mean > 2.5 * (motionQuantile(context, 0.5) || 0.1))) {
      cuts.push(motionEvent(data, i, i, { declared: near })); cutSet.add(i);
    }
  }
  for (const frame of declared) {
    const i = f.findIndex((x) => x.frame === frame);
    if (i >= 0 && !cutSet.has(i)) { cuts.push(motionEvent(data, i, i, { declared: true })); cutSet.add(i); }
  }
  cuts.sort((a, b) => a.from - b.from);
  const atCut = (i) => [...cutSet].some((v) => Math.abs(v - i) <= 2);
  const pops = [], deadStops = [], hardStarts = [], stepping = [], tails = [];
  const addGroups = (list, mask, a, b, extra = {}, min = 2) => {
    for (const group of motionGroups(mask)) if (group.length >= min) {
      const pos = motionPosition(group);
      const halo = Array.from({ length: 64 }, (_, k) => k).filter((k) => group.some((g) => Math.abs(g % 8 - k % 8) <= 1 && Math.abs(Math.floor(g / 8) - Math.floor(k / 8)) <= 1));
      const value = (i) => halo.reduce((s, k) => s + f[i].cells[k], 0) / halo.length;
      if (list === deadStops && Math.max(value(a), value(a + 1), value(a + 2)) > value(a - 1) * 0.25) continue;
      if (list === hardStarts && (Math.max(...Array.from({ length: 6 }, (_, j) => value(a - j - 1))) > value(a) * 0.2 || value(a) < Math.max(...Array.from({ length: 5 }, (_, j) => value(a + j + 1))) * 0.95)) continue;
      const prior = list.find((e) => (list === stepping || f[a].frame <= e.from + 2) && f[a].frame <= e.to + 2 && f[a].frame >= e.from && pos.box[0] <= e.box[2] && pos.box[2] >= e.box[0] && pos.box[1] <= e.box[3] && pos.box[3] >= e.box[1]);
      if (prior) { if (f[b].frame > prior.to) { prior.to = f[b].frame; prior.end = f[b].time; } prior.members = [...new Set([...prior.members, ...group])]; Object.assign(prior, motionPosition(prior.members)); }
      else list.push(motionEvent(data, a, b, { ...pos, members: group, ...extra }));
    }
  };
  for (let i = 4; i < n - 3; i++) {
    if (atCut(i)) continue;
    for (let len = 1; len <= 3; len++) {
      const end = i + len - 1; if (end + 3 >= n || atCut(end)) continue;
      const mask = Array.from({ length: 64 }, (_, k) => {
        const pre = Math.max(...f.slice(i - 3, i).map((x) => x.cells[k])), post = Math.max(...f.slice(end + 1, end + 4).map((x) => x.cells[k]));
        const peak = Math.max(...f.slice(i, end + 1).map((x) => x.cells[k]));
        return peak > Math.max(3, threshold * 5, pre * 5, post * 5) && f[i].cells[k] > peak * 0.35 && f[end].cells[k] > peak * 0.35 && (len < 3 || f[i + 1].cells[k] < peak * 0.25);
      });
      addGroups(pops, mask, i, end, { pattern: len === 3 ? 'two-frame flash / paired spike' : `${len}-frame change spike` });
    }
    if (i >= 5) addGroups(deadStops, Array.from({ length: 64 }, (_, k) => {
      const prior = f.slice(i - 4, i).map((x) => x.cells[k]);
      return prior.every((v) => v > threshold) && prior.at(-1) > Math.max(threshold * 3, Math.max(...prior) * 0.6) && f.slice(i, i + 3).every((x) => x.cells[k] <= threshold);
    }), i, i);
    if (i >= 7 && i + 5 < n) addGroups(hardStarts, Array.from({ length: 64 }, (_, k) => f.slice(i - 6, i).every((x) => x.cells[k] <= threshold) && f[i].cells[k] > Math.max(2, threshold * 4) && f[i].cells[k] >= Math.max(...f.slice(i + 1, i + 6).map((x) => x.cells[k])) * 0.95), i, i);
  }
  // Four disjoint spatial groups plus the whole picture: fewer grid-edge artefacts than single cells.
  const regions = [Array.from({ length: 64 }, (_, k) => k), ...Array.from({ length: 4 }, (_, q) => Array.from({ length: 64 }, (_, k) => k).filter((k) => (k % 8 >= 4 ? 1 : 0) + (k >= 32 ? 2 : 0) === q))];
  for (const group of regions) {
    const values = f.map((x, i) => x.cells && !cutSet.has(i) ? group.reduce((s, k) => s + x.cells[k], 0) / group.length : 0);
    for (let i = 1; i + 9 < n; i++) {
      const v = values.slice(i, i + 10), hi = motionQuantile(v, 0.8), lo = motionQuantile(v, 0.2);
      if (hi < 0.12 || hi > 12 || lo > hi * 0.3 || v.some((_, j) => atCut(i + j))) continue;
      const bits = v.map((x) => x > hi * 0.5), flips = bits.slice(1).filter((x, j) => x !== bits[j]).length;
      if (flips < 8) continue;
      let j = i + 9;
      while (j + 1 < n && !atCut(j + 1) && (values[j + 1] > hi * 0.5) !== (values[j] > hi * 0.5)) j++;
      addGroups(stepping, Array.from({ length: 64 }, (_, k) => group.includes(k)), i, j, { pattern: lo <= threshold ? 'move/still alternating' : 'quantised high/low alternating' });
      i = j;
    }
    // A calm boundary is three consecutive frames below the regional floor.
    const floor = Math.max(0.12, threshold * 0.5);
    for (let i = 1; i < n; i++) {
      if (values[i] <= floor || (values[i - 1] > floor && !cutSet.has(i))) continue;
      const a = i; let j = i;
      while (j + 1 < n && !cutSet.has(j + 1) && !(values[j + 1] <= floor && values[j + 2] <= floor && values[j + 3] <= floor)) j++;
      if (j - a >= 3) {
        let peak = a; for (let k = a; k <= j; k++) if (values[k] >= values[peak]) peak = k;
        const total = values.slice(a, j + 1).reduce((s, v) => s + v, 0), third = a + Math.floor((j - a + 1) * 2 / 3);
        const complete = j + 3 < n && !cutSet.has(j + 1) && (a >= 4 && values.slice(a - 3, a).every((v) => v <= floor) || cutSet.has(a - 1));
        tails.push(motionEvent(data, a, j, { ...motionPosition(group), peak: f[peak].frame, peakTime: f[peak].time, tailFrames: j + 1 - peak, lastThirdShare: total ? values.slice(third, j + 1).reduce((s, v) => s + v, 0) / total : 0, complete }));
      }
      i = j;
    }
  }
  const stretches = [], excluded = [], eligible = f.map((x) => x.frame >= data.from && x.mean !== null && x.time < data.duration - 1.5);
  for (let i = 1; i < n; i++) if (!active[i] && f[i].frame >= data.from) {
    const a = i; while (i + 1 < n && !active[i + 1] && eligible[i + 1] === eligible[a]) i++;
    if (i - a + 1 > 8) (eligible[a] ? stretches : excluded).push(motionEvent(data, a, i, { frames: i - a + 1 }));
  }
  const bodyCount = eligible.filter(Boolean).length, stillCount = eligible.filter((v, i) => v && !active[i]).length;
  // Four disjoint regions give small subjects equal weight; whole-picture tails are shown separately.
  const complete = tails.filter((x) => x.share === 0.25 && x.complete && x.from >= data.from);
  const medianTail = motionQuantile(complete.map((x) => x.tailFrames), 0.5);
  const visible = (list) => list.filter((x) => x.from >= data.from);
  const report = { file: data.file, fps: data.fps, duration: data.duration, range: [data.from, data.to], thresholds: { noisePercentile: 0.2, noiseFloor: noise, movingCell: threshold, units: 'mean absolute grayscale change, 0-255' }, frames: f.filter((x) => x.frame >= data.from).map(({ tiles, ...x }) => x), cuts: visible(cuts), pops: visible(pops), deadStops: visible(deadStops), hardStarts: visible(hardStarts), stepping: visible(stepping), stillness: { stretches, longest: stretches.reduce((a, b) => !a || b.frames > a.frames ? b : a, null), stillFrames: stillCount, measuredFrames: bodyCount, share: bodyCount ? stillCount / bodyCount : 0, excludedFinalSeconds: 1.5, excludedStretches: excluded, excludedStillFrames: f.filter((x, i) => x.frame >= data.from && x.mean !== null && !eligible[i] && !active[i]).length }, tails: visible(tails), medianTail, shortTails: complete.filter((x) => x.tailFrames < 4).length, unpainted: unpaintedRegions(data) };
  report.summaryLine = `motion: ${path.basename(data.file)} | pops ${report.pops.length}, dead stops ${report.deadStops.length}, hard starts ${report.hardStarts.length}, stepping ${report.stepping.length}, still ${(report.stillness.share * 100).toFixed(1)} %, median tail ${medianTail === null ? 'n/a' : medianTail.toFixed(1)} f`;
  return report;
}

// Five by seven pixels, enlarged to keep labels sharp (the motion chart, joins from a file).
const GLYPHS = {
  ' ': '00000/00000/00000/00000/00000/00000/00000',
  A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',
  C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',
  E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',
  G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',
  I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/00010/10010/01100',
  K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',
  M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',
  O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',
  Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',
  S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',
  U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',
  W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',
  Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111',
  '0':'01110/10001/10011/10101/11001/10001/01110','1':'00100/01100/00100/00100/00100/00100/01110',
  '2':'01110/10001/00001/00010/00100/01000/11111','3':'11110/00001/00001/01110/00001/00001/11110',
  '4':'00010/00110/01010/10010/11111/00010/00010','5':'11111/10000/10000/11110/00001/00001/11110',
  '6':'01110/10000/10000/11110/10001/10001/01110','7':'11111/00001/00010/00100/01000/01000/01000',
  '8':'01110/10001/10001/01110/10001/10001/01110','9':'01110/10001/10001/01111/00001/00001/01110',
  '.':'00000/00000/00000/00000/00000/00110/00110',',':'00000/00000/00000/00000/00110/00100/01000',
  ':':'00000/00110/00110/00000/00110/00110/00000',';':'00000/00110/00110/00000/00110/00100/01000',
  '-':'00000/00000/00000/11111/00000/00000/00000','_':'00000/00000/00000/00000/00000/00000/11111',
  '/':'00001/00001/00010/00100/01000/10000/10000','%':'11001/11010/00010/00100/01000/01011/10011',
  '(':'00010/00100/01000/01000/01000/00100/00010',')':'01000/00100/00010/00010/00010/00100/01000',
  '+':'00000/00100/00100/11111/00100/00100/00000','=':'00000/00000/11111/00000/11111/00000/00000',
  '|':'00100/00100/00100/00100/00100/00100/00100','[':'01110/01000/01000/01000/01000/01000/01110',']':'01110/00010/00010/00010/00010/00010/01110','?':'01110/10001/00001/00010/00100/00000/00100',
};
/** An RGB buffer (W x H x 3) as a PNG file, dependency free. */
function writePng(out, W, H, rgb) {
  // PNG uses a filter byte before each RGB scanline; CRC covers the chunk type and payload.
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const chunk = (type, data) => {
    const kind = Buffer.from(type), payload = Buffer.concat([kind, data]);
    let crc = 0xffffffff;
    for (const b of payload) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
    const head = Buffer.alloc(4), tail = Buffer.alloc(4);
    head.writeUInt32BE(data.length); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([head, payload, tail]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  const scan = Buffer.alloc((W * 3 + 1) * H);
  for (let yy = 0; yy < H; yy++) rgb.copy(scan, yy * (W * 3 + 1) + 1, yy * W * 3, (yy + 1) * W * 3);
  ensureDir(out);
  fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(scan)), chunk('IEND', Buffer.alloc(0))]));
}

/**
 * joins --file: the same join images cut from a RENDERED file (the final), so a polish fix is checked on what ships.
 * Every frame named by the rows is decoded in one ffmpeg pass (zero-based decoded frame numbers), scaled to the cell and
 * laid out as the Joins composition does: a band naming the join, the frame number on each cell, the move outlined.
 */
function joinsFromFile(file, rows, plan, cols, cellW, dir, base) {
  const pr = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=width,height,avg_frame_rate,r_frame_rate,nb_read_packets', '-of', 'json', file], { encoding: 'utf8' });
  const st = pr.status === 0 ? JSON.parse(pr.stdout).streams?.[0] : null;
  if (!st?.width) { console.error(`joins: cannot read a video stream from ${file}`); process.exit(1); }
  const rate = (v) => { const [a, b = 1] = String(v).split('/').map(Number); return a / b; };
  const fps = rate(st.avg_frame_rate) || rate(st.r_frame_rate) || 30;
  const total = Number(st.nb_read_packets) || Infinity;
  const cw = cellW % 2 ? cellW + 1 : cellW;
  const ch = Math.round((cw * st.height) / st.width / 2) * 2;
  const clampF = (f) => Math.max(0, Math.min(total - 1, f));
  const want = [...new Set(rows.flatMap((r) => r.frames.map(clampF)))].sort((a, b) => a - b);
  const pics = new Map();
  const size = cw * ch * 3;
  // select keeps the named frames in order, scaled to the cell (a long list goes in parts to keep the expression short)
  for (let i = 0; i < want.length; i += 120) {
    const part = want.slice(i, i + 120);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `select='${part.map((f) => `eq(n\\,${f})`).join('+')}',scale=${cw}:${ch}:flags=lanczos`, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 2 ** 31 - 1 });
    const got = r.stdout ? Math.floor(r.stdout.length / size) : 0;
    if (r.status !== 0 && !got) { console.error(`joins: ffmpeg could not decode ${file}: ${String(r.stderr || r.error?.message).trim()}`); process.exit(1); }
    for (let k = 0; k < Math.min(got, part.length); k++) pics.set(part[k], r.stdout.subarray(k * size, (k + 1) * size));
  }
  const band = Math.max(32, Math.round((cols * cw) / 120));
  const label = Math.max(16, Math.round(Math.max(cw, ch) / 40));
  const outs = [];
  for (const { sp, first, n } of plan) {
    const rs = rows.slice(first, first + n);
    const W = Math.min(cols, Math.max(...rs.map((r) => r.frames.length))) * cw;
    const H = n * (band + ch);
    const rgb = Buffer.alloc(W * H * 3, 17);
    const rect = (x, y, w, h, c) => {
      for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) { const o = (yy * W + xx) * 3; rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2]; }
    };
    const box = (x, y, w, h, t, c) => { rect(x, y, w, t, c); rect(x, y + h - t, w, t, c); rect(x, y, t, h, c); rect(x + w - t, y, t, h, c); };
    const text = (value, x, y, px, c, maxW) => {
      const sc = Math.max(1, Math.round(px / 8));
      const len = Math.min(String(value).length, Math.floor(maxW / (6 * sc)));
      rect(x - sc * 2, y - sc * 2, len * 6 * sc + sc * 3, 7 * sc + sc * 4, [0, 0, 0]);
      let xx = x;
      for (const chr of String(value).toUpperCase().slice(0, len)) {
        (GLYPHS[chr] || GLYPHS['?']).split('/').forEach((row, j) => [...row].forEach((v, k) => { if (v === '1') rect(xx + k * sc, y + j * sc, sc, sc, c); }));
        xx += 6 * sc;
      }
    };
    const yellow = [255, 255, 0], grey = [204, 204, 204];
    rs.forEach((row, r) => {
      const top = r * (band + ch);
      const bs = Math.max(1, Math.round((band * 0.5) / 8));
      text(`${row.title} | from ${path.basename(file)}`, 14, top + Math.round((band - 7 * bs) / 2), band * 0.5, yellow, W - 28);
      const single = row.start === row.end;
      row.frames.forEach((fr, k) => {
        const f = clampF(fr);
        const x0 = k * cw, y0 = top + band;
        const pic = pics.get(f);
        if (pic) for (let y = 0; y < ch; y++) pic.copy(rgb, ((y0 + y) * W + x0) * 3, y * cw * 3, (y + 1) * cw * 3);
        const inMove = fr >= row.start && fr <= row.end;
        const tag = !pic ? ' (not in the file)' : f !== fr ? ' (film edge)' : single ? (fr === row.start ? ' - join' : '') : fr === row.start ? ' - move starts' : fr === row.end ? ' - move ends' : inMove ? '' : fr < row.start ? ' - before' : ' - after';
        if (fr === row.start) box(x0, y0, cw, ch, Math.max(3, Math.round(label / 5)), yellow);
        else if (inMove && !single) box(x0, y0, cw, ch, 2, yellow);
        else box(x0, y0, cw, ch, 1, [0, 0, 0]);
        text(`${f} | ${(f / fps).toFixed(2)}s${tag}`, x0 + 10, y0 + 10, label, inMove ? yellow : grey, cw - 20);
      });
    });
    const to = path.join(dir, `${base}-join-${sp.at}.png`);
    writePng(to, W, H, rgb);
    outs.push(to);
  }
  return { outs, cell: cw };
}

/** A readable, dependency-free RGB chart: every frame, with a separate lane for each kind of finding. */
function motionChart(report, out) {
  const W = 1600, H = 500, rgb = Buffer.alloc(W * H * 3);
  const ink = [221, 229, 239], muted = [151, 166, 186], grid = [48, 59, 76];
  for (let i = 0; i < rgb.length; i += 3) { rgb[i] = 19; rgb[i + 1] = 26; rgb[i + 2] = 38; }
  const pixel = (x, y, c, alpha = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) rgb[i + k] = Math.round(rgb[i + k] * (1 - alpha) + c[k] * alpha);
  };
  const rect = (x, y, w, h, c, alpha = 1) => {
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(H, Math.ceil(y + h)); yy++)
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(W, Math.ceil(x + w)); xx++) pixel(xx, yy, c, alpha);
  };
  const line = (x0, y0, x1, y1, c, thick = 1, alpha = 1) => {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) rect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), thick, thick, c, alpha);
  };

  const text = (value, x, y, c = ink, scale = 2, maxWidth = W - x - 14) => {
    let xx = x;
    for (const ch of String(value).toUpperCase()) {
      if (xx + 5 * scale > x + maxWidth) break;
      const rows = (GLYPHS[ch] || GLYPHS['?']).split('/');
      rows.forEach((row, j) => [...row].forEach((v, k) => { if (v === '1') rect(xx + k * scale, y + j * scale, scale, scale, c); }));
      xx += 6 * scale;
    }
  };
  const frames = report.frames;
  if (!frames.length) throw new Error('motion chart needs at least one frame');
  const first = frames[0].frame, last = frames.at(-1).frame;
  const left = 150, right = 1570, top = 96, bottom = 300;
  const x = (frame) => left + (frame - first) / Math.max(1, last - first) * (right - left);
  const highest = frames.reduce((peak, f) => Math.max(peak, f.mean), 1);
  const maxY = Math.log1p(highest) * 1.06;
  const y = (mean) => bottom - Math.log1p(Math.max(0, mean)) / maxY * (bottom - top);
  text(`MOTION / ${String(report.file).split(/[\\/]/).pop()}`, 22, 18);
  text(`${Number(report.fps).toFixed(3)} FPS | FRAMES ${first}-${last} | CHANGE IN GREY LEVELS (0-255), LOG SCALE`, 22, 43, muted);
  text(report.summaryLine || '', 22, 67, ink, 1);
  let lastLabelY = Infinity;
  for (const v of [0, 0.1, 0.3, 1, 3, 10, 30, 100, 255]) {
    if (v > highest * 1.05 && v !== 0) continue;
    const yy = y(v);
    line(left, yy, right, yy, grid);
    if (lastLabelY - yy >= 18) {
      text(String(v), left - 12 - String(v).length * 12, yy - 6, muted);
      lastLabelY = yy;
    }
  }
  const fps = report.fps;
  const startSecond = Math.ceil(first / fps), endSecond = Math.floor(last / fps);
  const secondWidth = fps / Math.max(1, last - first) * (right - left);
  const labelEvery = 1;
  for (let s = startSecond; s <= endSecond; s++) {
    const f = Math.round(s * fps), xx = x(f);
    line(xx, bottom, xx, bottom + 7, muted);
    if (s % labelEvery === 0) {
      line(xx, top, xx, bottom, grid, 1, 0.6);
      const label = String(f);
      text(label, Math.min(right - label.length * 3, Math.max(left, xx - label.length * 3)), bottom + 13 + (secondWidth < 40 ? (s % 2) * 10 : 0), muted, 1);
    }
  }
  text('FRAME', 22, bottom + 13, muted);
  for (let i = 1; i < frames.length; i++) line(x(frames[i - 1].frame), y(frames[i - 1].mean), x(frames[i].frame), y(frames[i].mean), [226, 238, 250], 2);
  if (frames.length === 1) rect(x(first), y(frames[0].mean), 3, 3, ink);
  const lanes = [
    ['CUT', report.cuts, [109, 164, 255]], ['POP', report.pops, [255, 105, 128]],
    ['DEAD STOP', report.deadStops, [255, 172, 86]], ['HARD START', report.hardStarts, [207, 136, 244]],
    ['STEPPING', report.stepping, [243, 215, 105]], ['STILL', report.stillness.stretches, [92, 198, 180]],
  ];
  lanes.forEach(([label, findings, colour], k) => {
    const yy = 349 + k * 18;
    text(label, 22, yy - 2, colour);
    rect(left, yy, right - left, 9, grid, 0.35);
    for (const finding of findings || []) {
      const from = finding.from ?? finding.frame, to = finding.to ?? from;
      if (!Number.isFinite(from) || to < first || from > last) continue;
      const xx = x(Math.max(first, from)), end = x(Math.min(last, to));
      rect(xx, yy, Math.max(3, end - xx + 1), 10, colour);
      line(xx, top, xx, bottom, colour, 1, 0.23);
    }
  });
  text('CURVE: EVERY FRAME | COLOURED LANES: FINDING FRAME OR STRETCH | TICKS: EVERY SECOND', 22, 476, muted);
  writePng(out, W, H, rgb);
}

async function motionCommand() {
  const file = args[1]; if (!file || file.startsWith('--')) throw new Error('motion needs a rendered video file');
  const declared = opt('cuts', '').split(',').filter(Boolean).map((v) => { if (!/^\d+$/.test(v.trim())) throw new Error('--cuts needs comma-separated zero-based frame numbers'); return Number(v); });
  const data = await motionFrames(file, opt('range')), report = measureMotion(data, declared);
  const out = opt('out', path.join(path.dirname(file), `${path.parse(file).name}-motion.png`));
  if (path.resolve(out) === path.resolve(file)) throw new Error('--out must not overwrite the video');
  motionChart(report, out); report.chart = out;
  if (has('json')) { console.log(JSON.stringify(report, null, 2)); return; }
  console.log(`motion: ${file}, ${report.fps.toFixed(3)} fps, zero-based inclusive frames ${report.range.join('-')}; cell floor ${report.thresholds.movingCell.toFixed(3)} / 255`);
  for (const [label, rows] of [['cuts', report.cuts], ['pops', report.pops], ['dead stops', report.deadStops], ['hard starts', report.hardStarts], ['stepping', report.stepping]]) {
    console.log(`  ${label}: ${rows.length}`);
    for (const e of rows) console.log(`    ${motionWhere(e)}${e.position ? `, ${e.position}, ${(e.share * 100).toFixed(1)} %` : ''}${e.pattern ? `, ${e.pattern}` : ''}${e.declared ? ', declared join' : ''}`);
  }
  console.log(`  stillness: ${(report.stillness.share * 100).toFixed(1)} % (${report.stillness.stillFrames}/${report.stillness.measuredFrames} measured transitions); longest ${report.stillness.longest ? motionWhere(report.stillness.longest) : 'none over 8 frames'}`);
  for (const e of report.stillness.stretches) console.log(`    ${motionWhere(e)}, ${e.frames} f`);
  console.log(`  final 1.5 s excluded: ${report.stillness.excludedStillFrames} still frames`);
  for (const e of report.stillness.excludedStretches) console.log(`    ${motionWhere(e)}, ${e.frames} f`);
  console.log(`  tails: median ${report.medianTail ?? 'n/a'} f; ${report.shortTails} under 4 f (complete bursts in four disjoint regions)`);
  for (const e of report.tails) console.log(`    ${motionWhere(e)}, ${e.position} ${(e.share * 100).toFixed(0)} %, peak ${e.peak} (${e.peakTime.toFixed(3)} s), tail ${e.tailFrames} f, last third ${(e.lastThirdShare * 100).toFixed(1)} %${e.complete ? '' : ', boundary incomplete: excluded from median'}`);
  console.log(`  chart: ${out}`);
  console.log(report.summaryLine);
}

async function checkFilm(file, lockupS, format = 'launch', silentOk = false, lockupGiven = false) {
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
  const crowded = air.filter((x) => x.crowd >= 0.35);
  // samples whose detail is mostly one picture under the interface: crowded by the old count, not by the layer above it
  const spared = air.filter((x) => x.picture && x.detail >= 0.35 && x.crowd < 0.35);
  const busy = air.filter((x) => x.detail >= 0.2 && x.things >= 3);
  const cut = air.filter((x) => x.cut >= 2);
  const detailMed = air.length ? air.map((x) => x.detail).sort((a, b) => a - b)[Math.floor(air.length / 2)] : 0;
  console.log(`check: ${file} (${dur.toFixed(1)} s)`);
  // a project scaffolded from an older kit: information only, never a failure
  const stale = staleKitWarning();
  if (stale) console.log(`  WARN       ${stale}`);
  // information, not a target: a rich frame (a picture, a detailed UI, texture) is right when the eye knows where to look
  console.log(`  air        sharp detail (type, UI, hard edges) covers ${pc(detailMed)} of the frame at the median; 3+ separate things in ${pc(share(air.filter((x) => x.things >= 3)))} of samples; cut on 2+ sides in ${pc(share(cut))}  (information, not a target: richness is not crowding)`);
  if (spared.length) console.log(`  picture    one full-bleed picture or footage under the interface in ${pc(share(air.filter((x) => x.picture)))} of samples; its own texture is not counted as crowding (${spared.length} sample${spared.length === 1 ? '' : 's'} at ${fmt(spared)} s would count by the picture's detail alone): keep the picture sharp, and judge the layer above it`);
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
  const mdata = await motionFrames(file);
  const painted = unpaintedRegions(mdata);
  console.log(`  unpainted  ${painted.length} transient black regions (every frame)`);
  // every frame's motion (frames.mjs motion): information lines, and one gate on dead stillness. Well-made films hold
  // fully still on about 7 % of their frames, in stretches of at most about half a second; ours failed at 20-28 %.
  const mrep = measureMotion(mdata, []);
  const mstill = mrep.stillness;
  console.log(`  motion     ${mrep.pops.length} pops, ${mrep.deadStops.length} dead stops, ${mrep.hardStarts.length} hard starts, ${mrep.stepping.length} stepping, median tail ${mrep.medianTail === null ? 'n/a' : `${mrep.medianTail.toFixed(1)} f`} (good motion: tail about 9-10 f, no stepping; pops and stops are frames to look at: frames.mjs motion draws them)`);
  console.log(`  stillness  ${(mstill.share * 100).toFixed(1)} % of frames fully still before the last 1.5 s (good motion: about 7 %); longest ${mstill.longest ? `${mstill.longest.frames} f at ${motionWhere(mstill.longest)}` : 'none over 8 f'}`);
  const deadHolds = mstill.stretches.filter((e) => e.frames > Number(process.env.CINETIC_CHECK_STILL_RUN || 15));
  const stillLimit = Number(process.env.CINETIC_CHECK_STILL_SHARE || 0.15);
  if (!noPace && (deadHolds.length || mstill.share > stillLimit))
    fails.push(`dead holds: ${deadHolds.length ? `nothing moves for ${deadHolds.map((e) => `${e.frames} f at ${e.from}`).join(', ')}` : ''}${deadHolds.length && mstill.share > stillLimit ? '; ' : ''}${mstill.share > stillLimit ? `${(mstill.share * 100).toFixed(0)} % of frames fully still (well-made films about 7 %)` : ''}: every hold keeps a slow idle (live, a camera drift) and a scene hands its motion to the next; only the ending may freeze`);
  else if (!noPace && mstill.stretches.length) console.log(`  LOOK       still stretches of 9-15 f at ${mstill.stretches.map((e) => e.from).join(', ')}: give each hold an idle (live)`);
  for (const p of painted) fails.push(`unpainted: ${motionWhere(p)}, ${p.position}, flat-black patches in cells covering ${(p.share * 100).toFixed(1)} % of the frame${p.blackFrames.length < p.to - p.from + 1 ? ` (intermittent: ${p.blackFrames.join(', ')})` : ''}`);
  // coverage is no gate: it rises with clutter, and it did not tell a calm film from a crowded one
  if (share(crowded) > CROWD) fails.push(`crowded: sharp detail covers 35 %+ of the frame in ${pc(share(crowded))} of the samples (36 of 40 references stay under ${pc(CROWD)}) [at ${fmt(crowded)} s]: the eye has nowhere to land: keep one focal subject in each frame and set the rest behind it by scale or depth, or give it its own beat; show one component, larger, in steps; over a photograph or footage, move the text to the ground or drop the picture, never a blur, dim or card on it (the texture of one full-bleed picture is not counted here: what crowds is the layer above it)`);
  // holds that are read (a statement, a result) are fine; past a quarter the frames are named, past 40 % it fails
  const stillShare = slow.length / Math.max(1, pace.length);
  // the dead-hold gate above replaces the old 40 % gate on still half-seconds; the share stays as a LOOK line
  if (!noPace && stillShare > Number(process.env.CINETIC_CHECK_STILL_LOOK || 0.25)) console.log(`  LOOK       ${pc(stillShare)} of the half-seconds hold still [from ${fmt(slow)} s]: each hold must have something to read (a statement, a result held until read), never a wait`);
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
  // cut on 2+ sides, in stretches: a resting interface line cut by the frame for longer than a move is a fault to look at
  // (a camera ride passes in under a second); named whatever the share, never failed on the measure alone
  const cutRuns = [];
  for (let i = 0, s = -1; i <= air.length; i++) {
    const on = i < air.length && air[i].cut >= 2 && (i === 0 || air[i].t - air[i - 1].t <= 0.51);
    if (on && s < 0) s = i;
    if (!on && s >= 0) {
      const from = air[s].t, to = air[i - 1].t + 0.5;
      if (to - from > 1) {
        const still = pace.filter((x) => x.t >= from && x.t < to);
        const rest = still.length && still.reduce((a, x) => a + x.d, 0) / still.length < 0.03;
        cutRuns.push(`${from.toFixed(1)}-${to.toFixed(1)} s${rest ? ' (at rest)' : ''}`);
      }
      s = on ? i : -1;
    }
  }
  if (cutRuns.length) console.log(`  LOOK       cut on 2+ sides for over 1 s at ${cutRuns.slice(0, 10).join(', ')}${cutRuns.length > 10 ? ' ...' : ''}: an interface line or resting statement cut by the frame for longer than a move is a FIX (look at a full-size still of each stretch; a lone giant word or one component off one side is fine)`);
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
  // free text (`library route`, `library card grow`): every word must appear in the piece's name, summary, use, subject,
  // purpose or mood (case insensitive); the words are what is left after the flags and their values
  const valued = new Set(['category', 'purpose', 'subject', 'mood', 'show', 'strip', 'out', 'film']);
  const words = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (valued.has(args[i].slice(2)) && i + 1 < args.length && !args[i + 1].startsWith('--')) i++;
      continue;
    }
    words.push(...args[i].toLowerCase().split(/[\s,]+/).filter(Boolean));
  }
  const text = (e) => [e.name, e.summary, e.use, e.subject, e.purpose, e.mood].flat().filter(Boolean).join(' ').toLowerCase();
  const matches = lib.filter((e) => filters.every(([k, v]) => v.split(',').some((x) => [e[k]].flat().includes(x.trim()))) && words.every((w) => text(e).includes(w)));
  if (has('json')) return console.log(JSON.stringify(matches, null, 2));
  const asked = [...filters.map(([k, v]) => `${k} ${v}`), ...(words.length ? [`"${words.join(' ')}"`] : [])];
  if (!matches.length) {
    const vals = (k) => [...new Set(lib.flatMap((e) => [e[k]].flat()))].sort();
    if (words.length) {
      // the subjects (and purposes) nearest the words: contained either way, else the smallest edit distance
      const dist = (a, b) => {
        const d = Array.from({ length: b.length + 1 }, (_, j) => j);
        for (let i = 1; i <= a.length; i++) {
          let prev = d[0];
          d[0] = i;
          for (let j = 1; j <= b.length; j++) {
            const t = d[j];
            d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = t;
          }
        }
        return d[b.length];
      };
      const score = (v) => Math.min(...words.map((w) => (v.includes(w) || w.includes(v) ? 0 : dist(w, v) / Math.max(w.length, v.length))));
      const near = [...vals('subject'), ...vals('purpose')].filter((v, i, a) => a.indexOf(v) === i).map((v) => [v, score(v)]).sort((a, b) => a[1] - b[1]).slice(0, 6).map(([v]) => v);
      console.log(`no piece matches ${asked.join(', ')} (every word must appear in a piece's name, summary, use, subject, purpose or mood).`);
      console.log(`nearest subjects and purposes: ${near.join(', ')}  (try: library --subject ${near[0]}, or fewer words)`);
      return;
    }
    console.log(`no piece matches. categories: ${vals('category').join(', ')}; purposes: ${vals('purpose').join(', ')}; subjects: ${vals('subject').join(', ')}; moods: ${vals('mood').join(', ')}`);
    return;
  }
  const w = Math.max(...matches.map((e) => e.name.length));
  const pw = Math.max(...matches.map((e) => e.purpose.join(',').length));
  for (const e of matches) console.log(`${e.name.padEnd(w)}  ${e.category.padEnd(6)}  ${e.purpose.join(',').padEnd(pw)}  ${String(e.frames).padStart(3)} f  ${e.summary}`);
  console.log(`${matches.length} of ${lib.length} pieces${asked.length ? ` match ${asked.join(', ')}` : ''}. One in full: library --show <Name>; its frames: library --strip <Name>`);
}

if (cmd === 'sheet') {
  const props = { film };
  if (opt('grid')) props.cols = Number(opt('grid'));
  if (opt('frames')) props.frames = opt('frames').split(',').map(Number);
  if (opt('from')) props.from = Number(opt('from'));
  if (opt('to')) props.to = Number(opt('to'));
  sheet(props, opt('out', opt('frames') ? `out/${film}-moment.png` : `out/${film}-sheet.png`), has('half') ? 0.5 : 1, has('safe'));
} else if (cmd === 'motion') {
  await motionCommand();
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
  await checkFilm(args[1] && !args[1].startsWith('--') ? args[1] : `out/${film}-preview.mp4`, Number(opt('lockup', format === 'loop' ? '0' : '2')), format, has('silent'), opt('lockup') !== undefined);
} else if (cmd === 'joins') {
  // every join at real size, the whole move: one render call (one browser); the Joins composition draws one row of six
  // frames on each of its frames, and the rows of a join are stacked into one image
  let raw;
  if (opt('at')) raw = opt('at').split(',');
  else {
    try { raw = [filmConst('JOINS')].flat(Infinity); } catch (e) {
      console.error(`joins: no --at and the film's JOINS could not be read (${e.message}). Export the joins beside T (export const JOINS = [{ at: T.turn, len: 14 }, T.cut, ...]: the move's first frame and its length, or a bare frame) or pass --at 120+14,245,390+20`);
      process.exit(1);
    }
  }
  const specs = [];
  for (const v of raw) {
    const s = joinSpec(v);
    if (s && s.at >= 0 && !specs.some((x) => x.at === s.at && x.len === s.len)) specs.push(s);
  }
  specs.sort((x, y) => x.at - y.at);
  if (!specs.length) { console.error('joins: no joins (JOINS is empty and no --at)'); process.exit(1); }
  const pad = Math.max(1, Math.min(6, Number(opt('pad', '4'))));
  // --file out/main.mp4: cut the join images from the rendered file (the final), not from the composition
  const fromFile = opt('file');
  if (fromFile && !fs.existsSync(fromFile)) { console.error(`joins: no file ${fromFile}`); process.exit(1); }
  const probeSize = (f) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);
  const { width: FW, height: FH } = fromFile ? (([w, h]) => ({ width: w, height: h }))(probeSize(fromFile)) : filmEntry();
  const full = has('full');
  const cols = full ? 3 : 6;
  const cell = (FW >= FH ? 960 : 540) * (full ? 2 : 1);
  const MAX = 36; // frames of a move shown one by one; a longer move is sampled evenly
  const rows = [], plan = [];
  for (const sp of specs) {
    let frames, start, end, title;
    if (sp.len === null) {
      start = end = sp.at;
      frames = Array.from({ length: 2 * pad + 1 }, (_, k) => sp.at - pad + k);
      title = `join ${sp.at} (no length given): frames ${sp.at - pad}-${sp.at + pad} round it, not the whole move`;
    } else {
      start = sp.at;
      end = sp.at + sp.len - 1;
      const move = sp.len <= MAX ? Array.from({ length: sp.len }, (_, k) => start + k) : Array.from({ length: MAX }, (_, k) => Math.round(start + ((sp.len - 1) * k) / (MAX - 1)));
      frames = [start - 2, start - 1, ...move, end + 1, end + 2, end + 3, end + 4];
      title = `join ${start}: move ${start}-${end} (${sp.len} f)${sp.len > MAX ? `, SAMPLED: ${MAX} of its ${sp.len} frames, every ${((sp.len - 1) / (MAX - 1)).toFixed(1)}th; split it (--at ${start}+${MAX},${start + MAX}+${sp.len - MAX}) to see every frame` : ', every frame'}; 2 before, 4 after`;
    }
    const n = Math.ceil(frames.length / cols);
    plan.push({ sp, first: rows.length, n });
    for (let r = 0; r < n; r++) rows.push({ frames: frames.slice(r * cols, (r + 1) * cols), start, end, title: `${title}${n > 1 ? `  [row ${r + 1}/${n}]` : ''}` });
  }
  const dir = opt('out', 'out/joins');
  if (fromFile) {
    const base = `${path.basename(fromFile).replace(/\.[^.]+$/, '')}-final`;
    const { outs, cell: cw } = joinsFromFile(fromFile, rows, plan, cols, cell, dir, base);
    for (const o of outs) console.log(`join: ${o}`);
    console.log(`${outs.length} join image${outs.length === 1 ? '' : 's'} cut from ${fromFile} (rows of ${cols}, ${cw} px cells, decoded frame numbers): each move from 2 frames before its first to 4 after its last. A polish row closes only on these images of the final.`);
    const bare = specs.filter((s) => s.len === null).map((s) => s.at);
    if (bare.length) console.log(`  given without a length: ${bare.join(', ')}: only the ${2 * pad + 1} frames round each. Give each move's first frame and length (--at ${bare[0]}+14)`);
    process.exit(0);
  }
  const seq = path.join(dir, `_frames_${process.pid}`); // no dot: Remotion reads a dot as an extension
  fs.mkdirSync(seq, { recursive: true });
  const props = { film, rows, cols, cell };
  remotion(['render', 'src/index.ts', 'Joins', seq, '--sequence', '--image-format=png', `--frames=0-${rows.length - 1}`, `--props=${JSON.stringify(props)}`, ...gl, ...conc, '--log=error']);
  const files = fs.readdirSync(seq).filter((f) => /\.png$/i.test(f)).sort((a, b) => Number(a.match(/(\d+)\D*$/)?.[1] ?? 0) - Number(b.match(/(\d+)\D*$/)?.[1] ?? 0)).map((f) => path.join(seq, f));
  const outs = [];
  for (const { sp, first, n } of plan) {
    const parts = files.slice(first, first + n);
    if (parts.length < n) continue;
    const to = path.join(dir, `${film}-join-${sp.at}.png`);
    fs.rmSync(to, { force: true });
    if (n === 1) fs.renameSync(parts[0], to);
    else run('ffmpeg', ['-v', 'error', '-y', ...parts.flatMap((p) => ['-i', p]), '-filter_complex', `vstack=inputs=${n}`, '-frames:v', '1', '-update', '1', to]);
    outs.push(to);
  }
  fs.rmSync(seq, { recursive: true, force: true });
  for (const o of outs) console.log(`join: ${o}`);
  const bare = specs.filter((s) => s.len === null).map((s) => s.at);
  const long = specs.filter((s) => s.len > MAX).map((s) => `${s.at}+${s.len}`);
  console.log(`${outs.length} join image${outs.length === 1 ? '' : 's'} (rows of ${cols}, ${cell} px cells): each move from 2 frames before its first to 4 after its last.`);
  if (bare.length) console.log(`  given without a length: ${bare.join(', ')}: only the ${2 * pad + 1} frames round each (a fault before or after them is not on the image). Give each move's first frame and length: JOINS = [{ at: ${bare[0]}, len: 14 }, ...] or --at ${bare[0]}+14`);
  if (long.length) console.log(`  sampled, not every frame (longer than ${MAX} f): ${long.join(', ')}; split a long move into parts to see every frame`);
  console.log('  Look at every cell, one by one: anything cut by the frame or its box, overlapping or overprinted text, an empty slab or a plate without its text, a one-frame pop or flip of ground, the old scene left round the new one, a camera snap, misaligned parts, a thing leaving before the cut.');
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
