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
//        joins the parts without re-encoding, lays the sound on the picture's own start time, sets the loudness
//   node scripts/frames.mjs check [out/main-preview.mp4] [--lockup 2]
//        measures a rendered film against the bar: air (how much of the frame is sharp detail, how many separate things,
//        how often the frame edge cuts them), pace (how much changes in every half second), empty frames, how long the
//        ending is, the sound. Flags what fails; LOOK lines name frames to look at. Thresholds: CINETIC_CHECK_* env.
//   node scripts/frames.mjs strip out/film.mp4 --at 4.5 [--dur 2] [--fps 15] [--out out/strip.jpg]
//        a dense contact strip of a moment of a rendered video (motion check: an entrance, a turn, a morph)
//
// GL: set CINETIC_GL=swangle to render on the CPU (software GL) when the GPU is unstable; otherwise Remotion's default.
// Concurrency: CINETIC_CONCURRENCY (default 2). CINETIC_BROWSER: a Chrome Headless Shell shared by every film project.
// Nothing here uploads anything.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

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

const cli = (() => {
  try {
    return path.join(path.dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');
  } catch {
    console.error('Remotion is not installed here: run npm install in the film project first.');
    process.exit(1);
  }
})();

const run = (bin, a) => {
  const r = spawnSync(bin, a, { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const remotion = (a) => run(process.execPath, [cli, ...a, ...browser]);
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
  run('ffmpeg', ['-v', 'error', '-y', '-i', video, ...a, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
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
/** Measure a rendered film: coverage, pace, empty frames, the length of its ending (low-res analysis via ffmpeg). */
function checkFilm(file, lockupS) {
  const FPS = 4;
  // sample at the film's own aspect (a vertical film is measured vertical): the long side 192 px
  const dims = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim().split(',').map(Number);
  const [vw, vh] = dims.length === 2 && dims.every((v) => v > 0) ? dims : [1920, 1080];
  const W = vw >= vh ? 192 : Math.round((192 * vw) / vh / 2) * 2;
  const H = vw >= vh ? Math.round((192 * vh) / vw / 2) * 2 : 192;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const dur = parseFloat(probe.stdout);
  if (!Number.isFinite(dur)) throw new Error(`cannot read ${file}`);
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
  let endStill = 0;
  for (let i = pace.length - 1; i >= 0 && pace[i].d < 0.02; i--) endStill += 0.5;
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
  console.log(`  air        sharp detail (type, UI, hard edges) covers ${pc(detailMed)} of the frame at the median (references: 12 %); 3+ separate things in ${pc(share(air.filter((x) => x.things >= 3)))} of samples (references: 26 %); cut on 2+ sides in ${pc(share(cut))} (references: 14 %)`);
  console.log(`  coverage   mean subject width ${(avgW * 100).toFixed(0)} % of the frame; ${sparse.length} of ${body.length} samples under 45 %  (information, not a target: references 44-100 %, median 75 %)`);
  console.log(`  pace       ${slow.length} of ${pace.length} half-seconds with almost nothing changing${slow.length ? `  [from ${fmt(slow)} s]` : ''}`);
  console.log(`  stretches  longest sparse run ${sparseRun.s.toFixed(1)} s${sparseRun.s ? ` (from ${sparseRun.at.toFixed(1)} s)` : ''}; longest still stretch ${stillRun.s.toFixed(1)} s${stillRun.s ? ` (from ${stillRun.at.toFixed(1)} s)` : ''}`);
  console.log(`  empty      ${empty.length} near-empty samples${empty.length ? `  [at ${fmt(empty)} s]` : ''}${frames[0] && frames[0].fill < EMPTY_FILL ? '  FRAME 0 IS EMPTY' : ''}`);
  console.log(`  ending     the last ${endStill.toFixed(1)} s are nearly still (${((endStill / dur) * 100).toFixed(0)} % of the film)`);
  const snd = loudness(file);
  if (Number.isFinite(snd.I)) console.log(`  sound      ${snd.I.toFixed(1)} LUFS, true peak ${snd.TP.toFixed(1)} dBTP`);
  const fails = [];
  // coverage is no gate: it rises with clutter, and it did not tell a calm film from a crowded one
  if (share(crowded) > CROWD) fails.push(`crowded: sharp detail covers 35 %+ of the frame in ${pc(share(crowded))} of the samples (36 of 40 references stay under ${pc(CROWD)}) [at ${fmt(crowded)} s]: give most frames one subject on calm ground, keep density for one beat`);
  if (slow.length > pace.length * 0.2) fails.push('pace: something visible must change every half second (a word, a block, a crop, a value)');
  // limits set generously (2.5 s still, 3.5 s sparse): this catches a true freeze or a long stretch of small things, not a slow
  // creep over a finished state (pixels still change there): judge that by eye with the rubric
  if (stillRun.s > 2.5) fails.push(`a ${stillRun.s.toFixed(1)} s stretch from ${stillRun.at.toFixed(1)} s where almost nothing changes`);
  // 37 of 40 references never hold small, sparse frames longer than 3.5 s (a calm frame holds 2-3 s)
  if (sparseRun.s > 3.5) fails.push(`${sparseRun.s.toFixed(1)} s of small, sparse frames from ${sparseRun.at.toFixed(1)} s: a calm frame holds 2-3 s, this long reads as a gap`);
  if ((frames[0] && frames[0].fill < EMPTY_FILL) || longest / FPS >= 1) fails.push(`empty frames: ${frames[0] && frames[0].fill < EMPTY_FILL ? 'frame 0 is empty' : `${(longest / FPS).toFixed(1)} s of nothing from ${runAt.toFixed(1)} s`}`);
  if (endStill > Math.max(2.5, dur * 0.12)) fails.push('the ending is too long: lockup at most 2 s, all end type at most 15 % of the film');
  const isPreview = /preview/i.test(path.basename(file));
  if (isPreview && Number.isFinite(snd.TP) && snd.TP > -1) console.log('  (a preview is not limited: judge loudness and true peak on the muxed master)');
  if (!isPreview && Number.isFinite(snd.TP) && snd.TP > -1) fails.push(`sound: true peak ${snd.TP.toFixed(1)} dBTP clips; re-mux (frames.mjs mux) or lower the loudest cue`);
  if (!isPreview && Number.isFinite(snd.I) && (snd.I > -13 || snd.I < -20)) fails.push(`sound: ${snd.I.toFixed(1)} LUFS is off the -16 LUFS target`);
  fails.push(...musicRunsOut(dur));
  // LOOK lines name the frames; the share at which they speak is where 3 in 4 references stay (a small subject alone on calm
  // ground is NOT flagged: 28 of 40 references hold one)
  if (busy.length && share(busy) > BUSY) console.log(`  LOOK       3+ separate things with 20 %+ of the frame in detail at ${fmt(busy)} s (${pc(share(busy))} of samples; 3 in 4 references stay under ${pc(BUSY)}): one subject, at most one supporting element`);
  if (cut.length && share(cut) > CUT) console.log(`  LOOK       the frame edge cuts detail on 2+ sides at ${fmt(cut)} s (${pc(share(cut))} of samples; 3 in 4 references stay under ${pc(CUT)}): crop only a lone giant word, or one component off one side`);
  console.log(fails.length ? `  FIX: ${fails.join('\n  FIX: ')}` : '  pass');
  if (!fails.length) console.log('  (passing is necessary, not sufficient: check cannot see a finished state that only creeps, a repeated layout, a second full demo, faint or blurred text used as texture, or a weak idea; score the sheet with the rubric)');
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

if (cmd === 'sheet') {
  const out = opt('out', opt('frames') ? `out/${film}-moment.png` : `out/${film}-sheet.png`);
  ensureDir(out);
  const props = { film };
  if (opt('grid')) props.cols = Number(opt('grid'));
  if (opt('frames')) props.frames = opt('frames').split(',').map(Number);
  if (opt('from')) props.from = Number(opt('from'));
  if (opt('to')) props.to = Number(opt('to'));
  const scale = has('half') ? 0.5 : 1;
  remotion(['still', 'src/index.ts', 'Sheet', out, `--props=${JSON.stringify(props)}`, '--frame=0', `--scale=${scale}`, ...gl, '--log=error']);
  if (has('safe')) safeMargins(out, props, scale);
  console.log(`sheet: ${out}`);
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
  const parts = args.slice(1).filter((a) => a.endsWith('.mp4') && a !== opt('out'));
  const out = opt('out', `out/${film}.mp4`);
  const audio = opt('audio', 'out/audio.wav');
  if (!parts.length) throw new Error('mux needs the video parts');
  if (!fs.existsSync(audio)) throw new Error(`no ${audio}: run node scripts/frames.mjs audio first`);
  ensureDir(out);
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
  checkFilm(args[1] && !args[1].startsWith('--') ? args[1] : `out/${film}-preview.mp4`, Number(opt('lockup', '2')));
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
