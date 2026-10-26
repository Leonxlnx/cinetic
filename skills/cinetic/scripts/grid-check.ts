/**
 * grid-check.ts: checks a film's timeline against the timing rules before anything renders.
 *
 * Imports the project's src/timeline.ts (FPS, BPM, TOTAL, ACT, CUE, COPY; optional BEAT, BAR, TAIL,
 * PACE_NAME, PACE, READ), or a HyperFrames project's timeline.js (its FILM object; PACE_NAME and
 * PACE from the timeline or the motion.js beside it), and checks, with the 60 fps numbers scaled
 * to the film's fps:
 *   beat-whole     one beat is a whole number of frames (60*FPS/BPM)
 *   acts           acts are contiguous from 0 to TOTAL with positive lengths
 *   acts-on-bar    every act starts on a bar line (warning)
 *   cue-grid       every CUE is a frame in [0, TOTAL) on the 16th grid, or its line carries a
 *                  trailing `// offgrid: <reason>` comment (or an entry in an exported OFFGRID map)
 *   copy           every COPY entry has in <= resolved <= out inside the film
 *   text-hold      resolved text holds >= max(holdMin, holdBase + holdPerWord * words) before it
 *                  leaves (calm: 60 f, or 42 f + 8 f/word; crisp: 36 f + 6 f/word); a build chain's
 *                  line holds that long for all its words after its last fragment resolves
 *   script         the film's words are a script of short real sentences, one clean line on screen at a
 *                  time. A line is a COPY entry, a build chain (its fragments joined) or one fragment of a
 *                  replace chain; ui strings, `kind: 'name'` entries and the end card (an entry that holds
 *                  to the end of the body or resolves inside END) are not lines. Every line holds 3-8
 *                  words (over 8: an error, say it in two sentences; 1-2: a warning, and a single word is
 *                  a keyword, not a line); more than half the lines under 3 words is a keyword pile
 *                  (warning); two lines on screen at once (one arrives before the other starts to leave,
 *                  after its read) is an error unless the later one declares `swap: '<id>'` (or true):
 *                  a deliberate swap that takes the old line's place in one move. A film whose lines are
 *                  mostly sentences (60 % or more of 3-8 words) is held to the script's reading budget:
 *                  50 words, 2.4 words a second in any 5 s, 1.6 over the body, text on 85 % of it
 *   fragment       words per chain fragment: a warning above maxNewWords (calm 4, crisp 5), an error
 *                  above maxNewWords + 2 when calm or above 10 when crisp; a line that is not a chain is
 *                  held to the script rule instead; kind: 'ui' entries are exempt
 *   copy-lines     <= 2 lines per entry (warning)
 *   copy-concurrent film words on screen at once (in <= f < out + exitDur: a leaving fragment is
 *                  still seen until its exit is over): an error above maxVisibleBuild (calm 8), or
 *                  above maxVisibleReplace (calm 5) when every entry on screen is a replace-mode
 *                  fragment; a warning when film and ui words together pass 14
 *   read-first     two film entries that are not one chain: the later one arrives only after the
 *                  earlier one, still on screen, has resolved and held its read (an error when
 *                  calm, a warning when crisp): two lines arriving together are a sentence dump
 *   reveal-rate    an entry of 3+ words revealed faster than 8 f per word, (resolved - in) /
 *                  (words - 1): a sentence dumped at once (warning). An entry with reveal: 'focus' (the
 *                  whole line coming into focus at once, fx/FocusWord) is read by its hold instead
 *   chain-gap      inside a chain (COPY entries sharing `chain`): each fragment arrives only after
 *                  the previous one has resolved and held its read (error), with a picture beat of
 *                  gapMin..gapMax frames (calm 30-90 f) after that read (shorter: an error when
 *                  calm, a warning when crisp; longer: a warning); in replace mode the previous
 *                  fragment's exit (the pace's exitDur: calm 17 f, crisp 14 f) is over >= 6 f before the next
 *                  arrives (error); a chain keeps one mode and a build chain clears at one `out`
 *   chain-beat     the picture beat between two fragments really happens: at least one CUE (or,
 *                  with --cues, a sound event other than a `text` sound) in [read, next.in) (an
 *                  error when calm, a warning when crisp)
 *   read-quiet     calm: no CUE starts inside a reading window (READ) other than a text's own
 *                  frames: what was just said is read in the quiet (warning)
 *   word-rate      film words resolving in any 5 s window <= 5 * maxWordsPerSec (calm 6), and the
 *                  body's average <= avgWordsPerSec (calm 0.9 w/s) (warnings); a script's budget is wider
 *                  (see script)
 *   text-share     film copy on screen on <= textShare of the body's frames (calm 65%; a warning,
 *                  an error when calm and more than 10 points over), and every 10 s of body (all
 *                  of it, if shorter) holds a text-free run >= freeRun frames (calm 90 f): the
 *                  picture gets its turns (warning)
 *   word-total     on-screen words <= --max-words (default: the pace's maxWords, calm 30, crisp 35; a script 50);
 *                  entries with kind: 'ui' (terminal commands, code, URLs, app labels the product
 *                  shows) are counted apart, not budgeted
 *   event-gap      no stretch without an event (cue, copy change, act change, or a cues.json event
 *                  with --cues) longer than --max-gap frames (default: the pace's maxGap, calm 72 f,
 *                  crisp 48 f), tail excluded. A line's words arriving through its reveal are events,
 *                  and a reading window counts as alive: a hold being read
 *                  needs a slow drift, not a tick planted in it. The windows are the timeline's
 *                  READ (src/lib/pace.ts readingWindows(): from `resolved` for at most readMax, calm
 *                  150 f; an earlier fragment of a chain only for its own hold, so a chain's picture
 *                  beat is not a read; a build line once more after its last fragment), else a
 *                  cues.json copy block's `read`, else the same rule computed here. One designed
 *                  near-still hold may be declared with `export const HOLD = {from, to}` (60-96 f
 *                  at 60 fps, on the key claim under a music dropout), and gaps inside it pass
 *   tail           >= 1 s after the last cue so the audio can decay (warning)
 *   whole-bars     the body (TOTAL - TAIL) is whole bars; loops need it (warning)
 *
 * Salience (timeline SALIENCE, missing = 'hit'): read-quiet guards only CUEs whose salience is
 * `copy`, `hit` or `cut`. `life` (creep, light, drift, a carried decay) and `move` (a camera move
 * away from the text) may run during a read and count toward the picture's density. A fast move
 * over the text being read is a `hit`: mark it so.
 *
 * Music mode (the timeline exports a non-null MUSIC, src/music.ts written by track.py grid):
 *   music-grid     replaces beat-whole and whole-bars: BPM == MUSIC.bpm, MUSIC.fps == FPS,
 *                  b(1) == round(MUSIC.t0), and the body (TOTAL - TAIL) ends within 0.5 f of the
 *                  downbeat after MUSIC.bars bars
 *   cue-grid       a CUE lands on a music 16th (within 0.5 f) or on a sound: an analysed accent, an
 *                  entry, a downbeat attack, a stop's end or a designed effect (--cues, --onsets),
 *                  inside the picture-lead window (the picture may lead its sound by up to 3 f and
 *                  trail it by 1 f: --lead -3,1); the 16th grid is the fallback, not the target
 *   structural-on-music  every act boundary and every CUE named in STRUCTURAL sits within 1 f of a
 *                  measured downbeat, an entry, a stop's end or the ending (error)
 *   anti-metronome outside reel and social films: at most 60 % of the ordinary cuts on downbeats,
 *                  and the cut intervals vary (coefficient of variation >= 0.25) (warnings)
 *   reveal-dip     a stop or dip of 0.2-0.5 s ends within 2 f of REVEAL (warning): the track's own stops and
 *                  breaks, stop or dip events in --cues, audio/score.json stopdowns.add (a depth 'stop'
 *                  lasts stop_len, 0.2-0.7 s, default 0.4; a dip about 0.4 s) and the stop-downs the kit
 *                  adds (out/qa/sfx_plan.json, written by plan.py)
 *
 * Declarations (LOOK, SEAMS, STEPPED, FLASHES, CAMERA_BLUR, END, REVEAL, SPRING_CLASS, STRUCTURAL,
 * SALIENCE; all optional, a timeline without them is checked exactly as before):
 *   declarations   shapes and places: seams, steps, flashes and camera-blur ranges inside the film,
 *                  known kinds, to > from, flashes of 1-2 frames, step cadences below the film fps,
 *                  no duplicates or overlaps, STRUCTURAL and SALIENCE naming real CUEs (errors); a
 *                  range crossing an act boundary, a step range shorter than two steps (a 1-frame
 *                  range is one discrete frame, a snap such as fx/Loaders' row ticks) or a
 *                  camera-blur range over 2 s (warnings)
 *   declares-cover with --cues: what the primitives declare about themselves (cues.json
 *                  declared.fx, from each fx's declares()) is covered by the timeline's own
 *                  declarations: every step inside a STEPPED range, every flash in FLASHES, every
 *                  camera-blur range inside CAMERA_BLUR (or LOOK.blur 'camera'), every seam in
 *                  SEAMS at the same frame and kind (error)
 * Grammar (only for timelines that make the declarations above):
 *   shot-length    shots between act boundaries, seams and `cut` CUEs, for films of 3+ shots that
 *                  are not LOOK.oneTake: median inside the film type's band (launch 1.3-2.2 s, update
 *                  0.8-1.6 s, explainer 2.0-3.0 s, reel and social 0.5-1.0 s), q75/q25 >= 1.6 (not
 *                  metronomic; aim for 1.9-3.1), longest >= 2x shortest, shots under 0.25 s only as declared punches, few
 *                  shots over 4 s (launch <= 15 %, others <= 30 %) (warnings)
 *   long-take      a take over 15 s (a shot, or the whole body of a LOOK.oneTake film) holds at least two
 *                  picture changes per 10 s inside it (warning)
 *   cut-mix        5+ picture changes (act boundaries, seams, `cut` CUEs): at least 14 % of them happen
 *                  without a hard cut (a morph, mask, wipe, zoom-through, breath, defocus or UI dissolve)
 *                  (warning)
 *   picture-change a layout or type change at least every 2.5 s outside the end lock and the tail: a cut
 *                  or seam, a COPY entry arriving or leaving, or a CUE whose salience is hit, cut, copy or
 *                  move (a creep, light or drift is `life`, not a change) (warning)
 *   opener         at least two picture changes in the first 2.5 s (warning)
 *   seam-plan      `fadeEnd` only as the last seam, `dissolveUi` never across an act boundary or
 *                  longer than 8 f@60 (errors); one kind more than 3 times (the signature move
 *                  exempt), carried seams under 40 % of 3+ seams, a cut film over 20 s with no
 *                  velocity seam (warnings)
 *   cut-on-sound   when onsets exist (MUSIC, --cues events, --onsets): >= 50 % of the hard cuts
 *                  (hard and punch seams, act boundaries with no carried seam, `cut` CUEs) within the
 *                  picture-lead window of an onset and >= 80 % within 100 ms (warning); under 30 %
 *                  within 100 ms (error). Continuity seams (velocity, morph, breath, zoom-through,
 *                  whip, snap zoom, mask, defocus, wipe, UI dissolve) may float off the accents
 *   stagger-shape  CUE lists of 4+ starts: uniform gaps (CV < 0.1) unless tagged `// stagger: list`;
 *                  a list tagged `payoff` whose last three gaps grow; the median of a list tagged
 *                  word (7-14 f@60), letter (3-8) or ui (5-18); the pace's word stagger (7-14 f@60)
 *                  when it carries a cadence (warnings)
 *   exit-length    the pace's text exit <= 0.75 x its entrance and <= 33 f@60 (warning)
 *   recentre       the pace's re-centre: 12-44 f@60, lead <= 12 f@60, a jump >= 55 % home after
 *                  1/30 s (warning)
 *   accent-time    the pace's accent: hold <= 1.2 s, a linear cool <= 28 f@60 (warning)
 *   end-lock       END holds 1-5 s and runs to the end of the body (warning)
 *   density-plan   with a MOTION registry ([{from, to}], timeline or cues.json `motion`): 1.4-3.6
 *                  starts/s, 1.3-2.7 moves running at once on average, no 1 s without a start
 *                  outside HOLD and END (warnings)
 *
 * The pace: --pace calm|crisp, else the timeline's PACE_NAME, else crisp (a timeline written before
 * paces existed). The numbers come from the timeline's exported PACE (src/lib/pace.ts) when it has
 * one, so a retuned token moves the checks with the picture; otherwise from the copy below.
 *
 * Usage:
 *   npx tsx scripts/grid-check.ts [src/timeline.ts | timeline.js] [--pace calm|crisp] [--strict]
 *                                 [--json] [--max-words N] [--max-gap N] [--cues out/cues.json]
 *                                 [--onsets onsets.json] [--lead -3,1]
 *   Without a path: src/timeline.ts, else timeline.js. Node 22.18+ runs it without tsx too, when
 *   the timeline has no extensionless imports (a HyperFrames timeline.js):
 *   node scripts/grid-check.ts timeline.js
 *   --strict  warnings fail too.   --json  machine-readable report on stdout.
 *   --onsets  extra sound onsets: a JSON array of film frames, or {"frames": [...]} or
 *             {"seconds": [...]} (an analysed effects or voice track).
 *   --lead    the picture-lead window in film frames, as `min,max` of (picture - sound): -3,1.
 * Exit codes: 0 pass, 1 a check failed (or a warning with --strict), 2 bad arguments / import error.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';

type Act = { from: number; dur: number };
type Copy = { id: string; text: string; in: number; resolved: number; out?: number | null; kind?: string; chain?: string; mode?: string; reveal?: string; swap?: string | boolean };
/**
 * The script (house numbers): a line is one short sentence of 3-8 words, one clean line on screen at a time.
 * A film whose lines are mostly sentences (modeShare) reads at the script's budget: total words, words a second
 * in any 5 s and over the body, and the share of the body with a line on screen.
 */
const SCRIPT = { minWords: 3, maxWords: 8, modeShare: 0.6, words: 50, wordsPerSec: 2.4, avgWordsPerSec: 1.6, textShare: 0.85 };
type Finding = { check: string; severity: 'error' | 'warn'; message: string };
type Span = { from: number; to: number; label?: string };
type Music = {
  bpm: number; beatS: number; fps: number; t0: number; bars: number; downbeats: number[];
  accents?: { f: number; db?: number }[]; entries?: number[]; stops?: Span[]; breaks?: Span[];
  end?: { mode?: string; f: number };
};
type Seam = { at: number; kind: string; carry?: string; dir?: number; signature?: boolean; id?: string; dur?: number };
type Range = { from: number; to: number; id?: string; fps?: number; on?: number };
type FlashDecl = { f: number; frames: number; id?: string };
type Declares = { id?: string; seams?: Seam[]; stepped?: Range[]; flashes?: FlashDecl[]; cameraBlur?: Range[] };
type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';
const SALIENCES = ['copy', 'hit', 'cut', 'move', 'life'];
const SEAM_KINDS = ['velocity', 'morph', 'hard', 'mask', 'whip', 'defocus', 'light', 'snapZoom', 'breath', 'zoomThrough', 'stepped', 'colour', 'dissolveUi', 'fadeEnd', 'wipe'];
/** Seams that carry something across (speed, shape, scale): the film reads as one move through them. */
const CARRIED = new Set(['velocity', 'morph', 'breath', 'zoomThrough', 'whip', 'snapZoom', 'mask']);
/** Seams that make a designed punch: a shot shorter than 0.25 s next to one of them is intended. */
const PUNCH = new Set(['snapZoom', 'stepped', 'colour', 'light']);
/** Seams that change the picture without a hard cut: the next picture is revealed by a moving shape (cut-mix). */
const CUT_FREE = new Set(['morph', 'mask', 'wipe', 'zoomThrough', 'breath', 'defocus', 'dissolveUi']);
/** Seams that carry the eye through on their own: they may float off the music's accents (cut-on-sound skips them). */
const CONTINUITY = new Set([...CARRIED, 'defocus', 'wipe', 'dissolveUi', 'fadeEnd']);
const TEXTURES = ['clean', 'paper', 'grid', 'halftone', 'dither'];
const FILM_TYPES = ['launch', 'update', 'explainer', 'reel', 'social'];
/** House shot-length bands in seconds (median shot), by film type. */
const SHOT_BAND: Record<string, [number, number]> = { launch: [1.3, 2.2], update: [0.8, 1.6], explainer: [2.0, 3.0], reel: [0.5, 1.0], social: [0.5, 1.0] };
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN;
};
const quantile = (a: number[], q: number) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const p = (s.length - 1) * q;
  const i = Math.floor(p);
  return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i);
};
const cv = (a: number[]) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return m > 0 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m : 0;
};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
type Pace = {
  holdBase: number; holdPerWord: number; holdMin: number; readMax: number; gapMin: number; gapMax: number;
  maxNewWords: number; maxVisibleBuild: number; maxVisibleReplace: number; maxWordsPerSec: number;
  avgWordsPerSec: number; maxWords: number; textShare: number; freeRun: number; maxGap: number; exitDur: number;
};
type Windows = Record<string, [number, number][]>;

// The check numbers of src/lib/pace.ts (60 fps frames), for timelines that do not export PACE.
// <gen-pace>
const BUILTIN: Record<'calm' | 'crisp', Pace> = {
  calm: { holdBase: 42, holdPerWord: 8, holdMin: 60, readMax: 150, gapMin: 30, gapMax: 90, maxNewWords: 4, maxVisibleBuild: 8, maxVisibleReplace: 5, maxWordsPerSec: 1.2, avgWordsPerSec: 0.9, maxWords: 30, textShare: 0.65, freeRun: 90, maxGap: 72, exitDur: 17 },
  crisp: { holdBase: 36, holdPerWord: 6, holdMin: 42, readMax: 120, gapMin: 18, gapMax: 90, maxNewWords: 5, maxVisibleBuild: 10, maxVisibleReplace: 10, maxWordsPerSec: 2, avgWordsPerSec: 1.2, maxWords: 35, textShare: 0.8, freeRun: 60, maxGap: 48, exitDur: 14 },
};
// </gen-pace>

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
if (has('-h') || has('--help')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}
const valued = new Set(['--max-words', '--max-gap', '--cues', '--pace', '--onsets', '--lead']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1]));
const tlPath = resolve(positional[0] ?? (!existsSync('src/timeline.ts') && existsSync('timeline.js') ? 'timeline.js' : 'src/timeline.ts'));
const json = has('--json');
const strict = has('--strict');

const die = (msg: string): never => {
  if (json) console.log(JSON.stringify({ tool: 'grid-check', pass: false, fatal: msg }));
  else console.error(`grid-check: ${msg}`);
  process.exit(2);
};

const wordsOf = (text: unknown) => String(text ?? '').split(/\s+/).filter(Boolean).length;

/**
 * src/lib/pace.ts readingWindows(), for a timeline that exports no READ (and no cues.json `read`):
 * the same rule, so every check reads text the same way.
 */
const readingWindows = (copy: Copy[], P: Pace, fps: number, total: number): Windows => {
  const s = fps / 60;
  const cap = Math.round(P.readMax * s);
  const hold = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const w: Windows = {};
  for (const c of copy) {
    const end = c.out ?? total;
    const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, b) => a.in - b.in) : [c];
    const last = chain[chain.length - 1];
    const next = chain[chain.indexOf(c) + 1];
    const own: [number, number] = next ? [c.resolved, Math.min(next.in, c.resolved + hold(wordsOf(c.text)), end)] : [c.resolved, Math.min(end, c.resolved + cap)];
    const line: [number, number] | null = next && (c.mode ?? 'build') === 'build' ? [last.resolved, Math.min(last.out ?? total, last.resolved + cap)] : null;
    const list: [number, number][] = line ? [own, line] : [own];
    w[String(c.id)] = list.filter(([a, b]) => b > a);
  }
  return w;
};
const isWindows = (v: unknown): v is Windows =>
  !!v && typeof v === 'object' && Object.values(v as object).every((l) => Array.isArray(l) && l.every((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite)));

/**
 * The timeline module. A Remotion timeline.ts is an ES module. A HyperFrames timeline.js is a classic
 * script that sets FILM (CommonJS under Node, so the import gives it as `default`), with PACE_NAME
 * and PACE in the motion.js beside it; one that cannot be imported (in an ES-module package) runs
 * in a vm after its motion.js and music.js (when present), as the browser loads them.
 */
async function loadTimeline(path: string): Promise<Record<string, unknown>> {
  let T: Record<string, unknown>;
  let M: Record<string, unknown> | undefined;
  const motion = join(dirname(path), 'motion.js');
  const music = join(dirname(path), 'music.js');
  try {
    const mod = (await import(pathToFileURL(path).href)) as Record<string, unknown>;
    T = mod.default && mod.FPS === undefined ? { ...(mod.default as object) } : mod;
  } catch (e) {
    if (!/\.c?js$/.test(path)) throw e;
    const ctx: Record<string, unknown> = {};
    ctx.window = ctx;
    createContext(ctx);
    if (existsSync(motion)) runInContext(readFileSync(motion, 'utf8'), ctx, { filename: motion });
    // the music grid sits between them (window.MUSIC_GRID), so a film with a track is checked on its music
    if (existsSync(music)) runInContext(readFileSync(music, 'utf8'), ctx, { filename: music });
    runInContext(readFileSync(path, 'utf8'), ctx, { filename: path });
    if (!ctx.FILM) throw e;
    T = { ...(ctx.FILM as object) };
    M = ctx.MOTION as Record<string, unknown> | undefined;
  }
  if (T.PACE_NAME === undefined && !M && existsSync(motion)) {
    try {
      M = createRequire(path)(motion) as Record<string, unknown>;
    } catch {
      /* an ES-module motion.js: the pace falls back to crisp, as for a timeline written before paces */
    }
  }
  if (T.PACE_NAME === undefined && M && typeof M.PACE_NAME === 'string') Object.assign(T, { PACE_NAME: M.PACE_NAME, PACE: T.PACE ?? M.PACE });
  return T;
}

async function main() {
  if (!existsSync(tlPath)) die(`${tlPath} not found`);
  let T: Record<string, unknown>;
  try {
    T = await loadTimeline(tlPath);
  } catch (e) {
    return die(`importing ${tlPath} failed (keep timeline.ts free of React/CSS imports): ${(e as Error).message}`);
  }
  const src = readFileSync(tlPath, 'utf8');
  const FPS = Number(T.FPS);
  const BPM = Number(T.BPM);
  const TOTAL = Number(T.TOTAL);
  const ACT = T.ACT as Record<string, Act> | undefined;
  const CUE = T.CUE as Record<string, number | number[]> | undefined;
  const COPY = (T.COPY as Copy[] | undefined) ?? [];
  for (const [k, v] of Object.entries({ FPS, BPM, TOTAL })) if (!(v > 0)) die(`timeline must export a positive number ${k}`);
  if (!ACT || typeof ACT !== 'object') die('timeline must export ACT ({name: {from, dur}})');
  if (!CUE || typeof CUE !== 'object') die('timeline must export CUE ({name: frame})');
  if (!Array.isArray(COPY)) die('COPY must be an array of {id, text, in, resolved, out}');

  const paceName = (val('--pace') ?? (typeof T.PACE_NAME === 'string' ? T.PACE_NAME : 'crisp')) as 'calm' | 'crisp';
  if (!(paceName in BUILTIN)) die(`--pace must be calm or crisp (got ${paceName})`);
  const exported = (T.PACE as Record<string, Partial<Pace>> | undefined)?.[paceName];
  const P: Pace = { ...BUILTIN[paceName], ...(exported ?? {}) };

  const s = FPS / 60; // the 60 fps rules, scaled to this film
  const maxGap = Number(val('--max-gap') ?? Math.round(P.maxGap * s));
  const BEAT = (60 / BPM) * FPS;
  const BAR = BEAT * 4;
  const S16 = BEAT / 4;
  const TAIL = T.TAIL !== undefined ? Number(T.TAIL) : 0;
  const bodyEnd = TOTAL - TAIL;

  // The script's lines: entries, build chains joined, replace fragments; never ui strings, names or the end card.
  type Line = { id: string; text: string; n: number; in: number; resolved: number; out: number; ids: string[]; chain?: string; swap?: string | boolean };
  const endDecl = T.END as { from?: number } | undefined;
  const endFrom = endDecl && isNum(endDecl.from) && endDecl.from > 0 ? endDecl.from : Infinity;
  const isCard = (c: Copy) => c.kind === 'name' || (c.out ?? TOTAL) >= bodyEnd || c.resolved >= endFrom;
  const lines: Line[] = [];
  const joined = new Set<string>();
  for (const c of COPY) {
    if (!c || c.kind === 'ui' || !isNum(c.in) || !isNum(c.resolved) || isCard(c)) continue;
    const frags = c.chain ? COPY.filter((x) => x && x.chain === c.chain && isNum(x.in)).sort((a, b) => a.in - b.in) : [c];
    if (c.chain && (frags[0].mode ?? 'build') === 'build') {
      // a build chain is one line, however many fragments build it
      if (joined.has(c.chain)) continue;
      joined.add(c.chain);
      const text = frags.map((x) => String(x.text)).join(' ');
      lines.push({ id: c.chain, text, n: wordsOf(text), in: frags[0].in, resolved: frags[frags.length - 1].resolved, out: Math.max(...frags.map((x) => x.out ?? TOTAL)), ids: frags.map((x) => x.id), chain: c.chain, swap: frags[0].swap });
    } else lines.push({ id: c.id, text: String(c.text), n: wordsOf(c.text), in: c.in, resolved: c.resolved, out: c.out ?? TOTAL, ids: [c.id], chain: c.chain, swap: c.swap });
  }
  const scriptMode = lines.length > 0 && lines.filter((l) => l.n >= SCRIPT.minWords && l.n <= SCRIPT.maxWords).length >= SCRIPT.modeShare * lines.length;
  const maxWords = Number(val('--max-words') ?? (scriptMode ? Math.max(P.maxWords, SCRIPT.words) : P.maxWords));
  const out: Finding[] = [];
  const err = (check: string, message: string) => out.push({ check, severity: 'error', message });
  const warn = (check: string, message: string) => out.push({ check, severity: 'warn', message });

  // Off-grid reasons: `name: value, // offgrid: why` on the declaring line, or export OFFGRID = {name: 'why'}.
  const offgrid = new Map<string, string>();
  for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:.*\/\/.*\boffgrid:\s*(.+)$/gm)) offgrid.set(m[1], m[2].trim());
  for (const [k, v] of Object.entries((T.OFFGRID as Record<string, string>) ?? {})) offgrid.set(k, String(v));
  // Stagger tags for CUE lists: `name: [...], // stagger: list | payoff | word | letter | ui`.
  const staggerTag = new Map<string, string>();
  for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:.*\/\/.*\bstagger:\s*([a-z]+)/gm)) staggerTag.set(m[1], m[2]);

  // --- cues.json (--cues): sound events, reading windows, the primitives' declarations
  const soundEvents: { f: number; kind: string; dur?: number }[] = [];
  const cuesPath = val('--cues');
  let cuesDoc: {
    events?: { f: number; kind?: string; dur?: number }[];
    copy?: { id: string; read?: unknown }[];
    declared?: { fx?: Declares[] };
    motion?: { from: number; to: number }[];
  } | null = null;
  if (cuesPath) {
    if (!existsSync(cuesPath)) die(`--cues ${cuesPath} not found (run npx tsx scripts/export-cues.ts)`);
    cuesDoc = JSON.parse(readFileSync(cuesPath, 'utf8'));
    for (const e of cuesDoc!.events ?? []) if (Number.isFinite(e.f)) soundEvents.push({ f: e.f, kind: String(e.kind ?? ''), dur: isNum(e.dur) ? e.dur : undefined });
  }

  // --- music mode: src/music.ts carries a licensed track's grid, every number a film frame
  const MUSIC = T.MUSIC && typeof T.MUSIC === 'object' ? (T.MUSIC as Music) : null;
  const leadArg = (val('--lead') ?? '-3,1').split(',').map(Number);
  if (leadArg.length !== 2 || !leadArg.every(Number.isFinite) || leadArg[0] > leadArg[1]) die(`--lead must be min,max in frames, e.g. -3,1 (got ${val('--lead')})`);
  const [leadMin, leadMax] = leadArg;
  const mBeat = MUSIC && isNum(MUSIC.beatS) && isNum(MUSIC.fps) ? MUSIC.beatS * MUSIC.fps : MUSIC && MUSIC.bpm > 0 ? (60 / MUSIC.bpm) * FPS : BEAT;
  const mDown: number[] = MUSIC && Array.isArray(MUSIC.downbeats) ? MUSIC.downbeats.filter(isNum) : [];
  /** src/music.ts bar(): film frame of a position `pos` beats after bar 1's downbeat. */
  const musicAt = (pos: number) => {
    const d = mDown;
    const i = Math.floor(pos / 4);
    if (i >= 0 && i + 1 < d.length) return d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i]);
    if (d.length && i >= d.length - 1) return d[d.length - 1] + (pos - 4 * (d.length - 1)) * mBeat;
    return (d.length ? d[0] : (MUSIC?.t0 ?? 0)) + pos * mBeat;
  };
  // the music's 16ths and bar lines over the film (a pickup before bar 1 included)
  const grid16: number[] = [];
  const barLines: number[] = [];
  if (MUSIC && mBeat > 0) {
    for (let pos = -16; ; pos += 0.25) {
      const f = musicAt(pos);
      if (f > TOTAL + mBeat) break;
      if (f >= -mBeat) grid16.push(f);
      if (Math.abs(pos / 4 - Math.round(pos / 4)) < 1e-9 && f >= 0 && f <= TOTAL) barLines.push(f);
      if (grid16.length > 200000) break; // a runaway grid (a broken MUSIC): the checks below say why
    }
  }
  const nearest = (list: number[], f: number) => list.reduce((best, x) => (Math.abs(x - f) < Math.abs(best - f) ? x : best), Infinity);
  /** audio/score.json stopdowns.add as film-frame spans ending on their time (plan.py builds them): a depth 'stop'
   *  lasts stop_len (0.2-0.7 s, default 0.4), a dip about 0.4 s. Times as score.py reads them: a frame, "@cue",
   *  "@cue+6" or "bar:beat:16th" on the music grid. */
  const scoreStopdowns = (): Span[] => {
    const dir = dirname(tlPath);
    const p = [join(dir, '..', 'audio', 'score.json'), join(dir, 'audio', 'score.json')].find((x) => existsSync(x));
    let sd: { add?: unknown[]; stop_len?: number } | undefined;
    try {
      sd = p ? JSON.parse(readFileSync(p, 'utf8'))?.stopdowns : undefined;
    } catch {
      return [];
    }
    if (!sd || !Array.isArray(sd.add)) return [];
    const stopLen = Math.min(0.7, Math.max(0.2, isNum(sd.stop_len) ? sd.stop_len : 0.4));
    const frameOf = (x: unknown): number | undefined => {
      if (isNum(x)) return x;
      const s = String(x).trim();
      let m = s.match(/^@([A-Za-z_]\w*)\s*([+-]\s*\d+(?:\.\d+)?)?$/);
      if (m) {
        const c = CUE?.[m[1]];
        const f = Array.isArray(c) ? c[0] : c;
        return isNum(f) ? f + Number((m[2] ?? '0').replace(/\s/g, '')) : undefined;
      }
      m = s.match(/^(\d+)(?::(\d+(?:\.\d+)?))?(?::(\d+(?:\.\d+)?))?$/);
      return m ? musicAt((Number(m[1]) - 1) * 4 + Number(m[2] ?? 0) + Number(m[3] ?? 0) / 4) : undefined;
    };
    const out: Span[] = [];
    for (const a of sd.add) {
      const obj = a && typeof a === 'object' ? (a as { at?: unknown; depth?: string }) : null;
      const f = frameOf(obj ? obj.at : a);
      if (isNum(f)) out.push({ from: f - (obj?.depth === 'stop' ? stopLen : 0.4) * FPS, to: f, label: 'score.json stop-down' });
    }
    return out;
  };
  /** The stop-downs plan.py placed (out/qa/sfx_plan.json: the kit's own and score.json's), as film-frame spans. */
  const planStopdowns = (): Span[] => {
    const dir = dirname(tlPath);
    const p = [join(dir, '..', 'out', 'qa', 'sfx_plan.json'), join(dir, 'out', 'qa', 'sfx_plan.json')].find((x) => existsSync(x));
    try {
      const rows = p ? JSON.parse(readFileSync(p, 'utf8'))?.stopdowns : undefined;
      if (!Array.isArray(rows)) return [];
      return rows.filter((r) => r && ['added', 'arrangement'].includes(r.status) && isNum(r.from) && isNum(r.t))
        .map((r) => ({ from: r.from * FPS, to: r.t * FPS, label: 'sfx_plan.json stop-down' }));
    } catch {
      return [];
    }
  };
  // Sound onsets a cut or a cue can land on: the track's accents, entries, measured downbeats, stop
  // ends and ending; the designed effects (--cues); an analysed onset list (--onsets).
  const onsets: number[] = [];
  if (MUSIC) {
    for (const a of MUSIC.accents ?? []) if (a && isNum(a.f)) onsets.push(a.f);
    for (const e of MUSIC.entries ?? []) if (isNum(e)) onsets.push(e);
    for (const sp of MUSIC.stops ?? []) if (sp && isNum(sp.to)) onsets.push(sp.to);
    if (MUSIC.end && isNum(MUSIC.end.f)) onsets.push(MUSIC.end.f);
    onsets.push(...mDown);
  }
  for (const e of soundEvents) onsets.push(e.f);
  const onsetsPath = val('--onsets');
  if (onsetsPath) {
    if (!existsSync(onsetsPath)) die(`--onsets ${onsetsPath} not found`);
    const o = JSON.parse(readFileSync(onsetsPath, 'utf8'));
    const frames = Array.isArray(o) ? o : Array.isArray(o.frames) ? o.frames : Array.isArray(o.seconds) ? o.seconds.map((x: number) => x * FPS) : null;
    if (!frames || !frames.every(isNum)) die(`--onsets ${onsetsPath}: want a JSON array of frames, {"frames": [...]} or {"seconds": [...]}`);
    onsets.push(...(frames as number[]));
  }
  onsets.sort((a, b) => a - b);
  /** picture minus sound for the nearest onset (frames), or null without onsets */
  const toOnset = (f: number) => (onsets.length ? f - nearest(onsets, f) : null);
  const inLead = (f: number) => {
    // any onset whose (picture - sound) falls inside the lead window
    for (const o of onsets) if (f - o >= leadMin - 1e-9 && f - o <= leadMax + 1e-9) return true;
    return false;
  };

  // --- beat (music mode: music-grid)
  if (!MUSIC) {
    if (Math.abs(BEAT - Math.round(BEAT)) > 1e-9) {
      const ok = [];
      for (let b = 60; b <= 200; b++) if (Number.isInteger((60 / b) * FPS)) ok.push(b);
      err('beat-whole', `a beat is ${BEAT.toFixed(3)} f at ${BPM} BPM / ${FPS} fps; use a BPM with whole beats: ${ok.join(', ')}`);
    }
    if (T.BEAT !== undefined && Math.abs(Number(T.BEAT) - BEAT) > 1e-9) err('beat-whole', `exported BEAT ${T.BEAT} != 60/BPM*FPS = ${BEAT}`);
    if (T.BAR !== undefined && Math.abs(Number(T.BAR) - BAR) > 1e-9) err('beat-whole', `exported BAR ${T.BAR} != 4 beats = ${BAR}`);
  } else {
    const M = MUSIC;
    const shape: string[] = [];
    if (!(isNum(M.bpm) && M.bpm > 0)) shape.push('bpm must be a positive number');
    if (!isNum(M.t0)) shape.push('t0 must be a frame');
    if (!(isNum(M.bars) && M.bars > 0)) shape.push('bars must be a positive number');
    if (!Array.isArray(M.downbeats) || !M.downbeats.every(isNum) || M.downbeats.some((f, i, a) => i > 0 && f <= a[i - 1])) shape.push('downbeats must be increasing film frames');
    for (const x of shape) err('music-grid', `MUSIC.${x} (src/music.ts is written by track.py grid)`);
    if (M.fps !== FPS) err('music-grid', `MUSIC.fps is ${M.fps} but the film runs at ${FPS} fps: rerun track.py grid at this fps`);
    if (isNum(M.bpm) && Math.abs(BPM - M.bpm) > 1e-9) err('music-grid', `BPM is ${BPM} but the track's is ${M.bpm}: write BPM = MUSIC?.bpm ?? <grid tempo>`);
    if (Array.isArray(M.downbeats) && M.downbeats.length && isNum(M.t0) && Math.abs(M.downbeats[0] - M.t0) > 1e-6)
      err('music-grid', `MUSIC.downbeats[0] (${M.downbeats[0]}) must be t0 (${M.t0}): the first downbeat is bar 1`);
    if (typeof T.b === 'function' && isNum(M.t0)) {
      const b1 = (T.b as (n: number) => number)(1);
      if (b1 !== Math.round(M.t0)) err('music-grid', `b(1) is ${b1} but bar 1's downbeat is f${M.t0.toFixed(2)}: b() must follow the music (Math.round(bar(...)))`);
    }
    if (!shape.length) {
      const endF = musicAt(4 * M.bars);
      if (Math.abs(bodyEnd - endF) > 0.5 + 1e-9)
        err('music-grid', `the body (TOTAL - TAIL = ${bodyEnd} f) should end on the downbeat after bar ${M.bars} (f${endF.toFixed(2)}), ${(bodyEnd - endF).toFixed(2)} f off: rerun track.py grid after changing the edit or TOTAL`);
    }
    if (T.BEAT !== undefined && Math.abs(Number(T.BEAT) - BEAT) > 1e-9) err('music-grid', `exported BEAT ${T.BEAT} != 60/BPM*FPS = ${BEAT}`);
  }

  // --- acts
  const acts = Object.entries(ACT!).sort((a, b) => a[1].from - b[1].from);
  let at = 0;
  for (const [name, a] of acts) {
    if (!(a.dur > 0)) err('acts', `ACT.${name} has dur ${a.dur}`);
    if (a.from !== at) err('acts', `ACT.${name} starts at ${a.from}, expected ${at} (${a.from > at ? 'gap' : 'overlap'} of ${Math.abs(a.from - at)} f)`);
    const off = Math.abs(a.from - Math.round(a.from / BAR) * BAR);
    if (!MUSIC && off > 0.5 && !offgrid.has(name)) warn('acts-on-bar', `ACT.${name} starts at ${a.from}, ${off.toFixed(1)} f off a bar line`);
    at = a.from + a.dur;
  }
  if (acts.length && at !== TOTAL) err('acts', `acts end at ${at} but TOTAL is ${TOTAL}`);

  // --- cues
  const cueFrames: { name: string; f: number }[] = [];
  for (const [name, v] of Object.entries(CUE!)) {
    const list = Array.isArray(v) ? v : [v];
    list.forEach((f, i) => {
      const label = Array.isArray(v) ? `${name}[${i}]` : name;
      if (typeof f !== 'number' || !Number.isFinite(f)) return err('cue-grid', `CUE.${label} is not a frame number (${f})`);
      if (!Number.isInteger(f)) err('cue-grid', `CUE.${label} = ${f} is fractional; cues are whole frames`);
      if (f < 0 || f >= TOTAL) err('cue-grid', `CUE.${label} = ${f} is outside the film [0, ${TOTAL})`);
      if (MUSIC) {
        // music mode: on a sound (lead window) or, as the fallback, on a music 16th
        const off = Math.abs(f - nearest(grid16, f));
        if (off > 0.5 + 1e-9 && !inLead(f) && !offgrid.has(name))
          err('cue-grid', `CUE.${label} = ${f} is ${Number.isFinite(off) ? off.toFixed(2) : '?'} f off the music's 16ths and on no sound (an accent, entry, downbeat, stop end or designed effect, picture ${leadMin}..+${leadMax} f from it): move it onto the accent it belongs to, snap it with b(), or add "// offgrid: <reason>"`);
      } else {
        const off = Math.abs(f - Math.round(f / S16) * S16);
        if (off > 0.5 + 1e-9 && !offgrid.has(name) && !(onsets.length && inLead(f)))
          err('cue-grid', `CUE.${label} = ${f} is ${off.toFixed(2)} f off the 16th grid (${S16} f); snap it with b() or add "// offgrid: <reason>"`);
      }
      cueFrames.push({ name: label, f });
    });
  }
  const baseName = (label: string) => label.replace(/\[\d+\]$/, '');
  const SAL = (T.SALIENCE && typeof T.SALIENCE === 'object' ? T.SALIENCE : {}) as Record<string, string>;
  const salienceOf = (label: string): Salience => (SALIENCES.includes(SAL[baseName(label)]) ? (SAL[baseName(label)] as Salience) : 'hit');

  // --- copy: one entry at a time
  let words = 0;
  let uiWords = 0;
  const holdNeed = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const fragErr = paceName === 'calm' ? P.maxNewWords + 2 : 10;
  const valid: (Copy & { out: number; n: number; ui: boolean })[] = [];
  for (const c of COPY) {
    const id = c.id ?? '?';
    const n = wordsOf(c.text);
    const ui = c.kind === 'ui'; // product strings: a typed command, code, a URL, an app label
    if (ui) uiWords += n;
    else words += n;
    const o = c.out ?? TOTAL;
    if (![c.in, c.resolved, o].every(Number.isFinite)) {
      err('copy', `COPY ${id}: in/resolved/out must be frames`);
      continue;
    }
    if (!(c.in <= c.resolved && c.resolved <= o)) err('copy', `COPY ${id}: needs in <= resolved <= out (got ${c.in}, ${c.resolved}, ${o}); unresolved text never exits`);
    if (c.in < 0 || o > TOTAL) err('copy', `COPY ${id}: [${c.in}, ${o}] is outside the film [0, ${TOTAL}]`);
    valid.push({ ...c, out: o, n, ui });
    const hold = o - c.resolved;
    if (hold < holdNeed(n) && ui) warn('text-hold', `COPY ${id} (ui) "${c.text}" holds ${hold} f resolved; ${n} word(s) want >= ${holdNeed(n)} f if it must be read`);
    else if (hold < holdNeed(n)) err('text-hold', `COPY ${id} "${c.text}" holds ${hold} f resolved; ${n} word(s) need >= ${holdNeed(n)} f`);
    if (ui) continue; // UI strings keep the product's own layout
    if (!c.chain) {
      // a line that is not a chain: the script rule holds it to 3-8 words
    } else if (n > fragErr) err('fragment', `COPY ${id} "${c.text}" shows ${n} words at once; a thought longer than ${P.maxNewWords} words arrives as a chain of fragments (timeline.ts chain())`);
    else if (n > P.maxNewWords) warn('fragment', `COPY ${id} "${c.text}" has ${n} words; a fragment holds 1-${P.maxNewWords} (split it into a chain)`);
    const lines = String(c.text).split('\n');
    if (lines.length > 2) warn('copy-lines', `COPY ${id}: ${lines.length} lines on screen at once (keep <= 2)`);
    const rate = (c.resolved - c.in) / Math.max(1, n - 1);
    if (n >= 3 && rate < 8 * s && c.reveal !== 'focus') warn('reveal-rate', `COPY ${id} "${c.text}" reveals ${n} words in ${c.resolved - c.in} f (${rate.toFixed(1)} f per word < ${8 * s}): a block, not a read; stagger the words or split the line`);
  }
  // --- script: every line one short sentence (3-8 words); one clean line on screen at a time
  for (const l of lines) {
    if (l.n > SCRIPT.maxWords) err('script', `line ${l.id} "${l.text}" has ${l.n} words; a line holds ${SCRIPT.minWords}-${SCRIPT.maxWords}: say it in two sentences, each its own line`);
    else if (l.n === 1) warn('script', `line ${l.id} "${l.text}" is a single keyword: write a sentence that says something (${SCRIPT.minWords}-${SCRIPT.maxWords} words: a claim, a turn or a payoff)`);
    else if (l.n < SCRIPT.minWords) warn('script', `line ${l.id} "${l.text}" has ${l.n} words: a label, not a sentence; a line holds ${SCRIPT.minWords}-${SCRIPT.maxWords} words that say something`);
    if (l.ids.length === 1 && /\n/.test(l.text)) warn('script', `line ${l.id} "${l.text.replace(/\n/g, ' / ')}" is set on ${l.text.split('\n').length} lines: one clean line, sized to fit (copy-and-type.md, the script)`);
  }
  const shortLines = lines.filter((l) => l.n < SCRIPT.minWords);
  if (lines.length >= 3 && shortLines.length > lines.length / 2)
    warn('script', `${shortLines.length} of ${lines.length} lines are under ${SCRIPT.minWords} words: a pile of keywords, not a script. Write short sentences that tell the story in order (hook, problem, turn, product, proof, payoff), one line at a time`);
  const lineOrder = [...lines].sort((a, b) => a.in - b.in);
  for (let i = 0; i < lineOrder.length; i++)
    for (let j = i + 1; j < lineOrder.length; j++) {
      const [a, b] = [lineOrder[i], lineOrder[j]];
      if (a.chain && a.chain === b.chain) continue; // a chain's own fragments: chain-gap times them
      if (b.in >= a.out) continue; // a starts to leave before b arrives: a clean handover, or a swap in motion
      if (b.in < a.resolved + holdNeed(a.n)) continue; // before a's read: read-first reports it
      if (b.swap === true || (typeof b.swap === 'string' && (b.swap === a.id || a.ids.includes(b.swap)))) continue;
      err('script', `lines ${a.id} "${a.text}" and ${b.id} "${b.text}" are on screen together (f${b.in}-f${Math.min(a.out, b.out)}): one clean line at a time. Let ${a.id} leave before ${b.id} arrives, or mark ${b.id} swap: '${a.id}' when it takes ${a.id}'s place in one move (an erode, a redaction, a wheel, a make-room)`);
    }
  if (words > maxWords) err('word-total', `${words} on-screen words; the budget is ${maxWords} (--max-words). Typed commands, code, URLs and app labels belong in COPY with kind: 'ui' and are not budgeted`);

  // --- reading windows: the timeline's READ, else the cues.json copy block's `read`, else the same rule here
  const fromCues = (() => {
    const p = val('--cues');
    if (!p || !existsSync(p)) return null;
    const w: Windows = {};
    for (const c of JSON.parse(readFileSync(p, 'utf8')).copy ?? []) if (isWindows({ x: c.read })) w[String(c.id)] = c.read;
    return Object.keys(w).length ? w : null;
  })();
  const READ: Windows = isWindows(T.READ) ? (T.READ as Windows) : (fromCues ?? readingWindows(valid, P, FPS, TOTAL));

  // --- chains: fragments of one thought
  const chains = new Map<string, typeof valid>();
  for (const c of valid) if (c.chain) chains.set(c.chain, [...(chains.get(c.chain) ?? []), c]);
  const exitF = Math.round(P.exitDur * s); // a leaving entry is seen until its exit is over
  const calm = paceName === 'calm';
  const sev = (check: string, message: string) => (calm ? err : warn)(check, message);
  for (const [name, list] of chains) {
    list.sort((a, b) => a.in - b.in);
    const modes = new Set(list.map((c) => c.mode ?? 'build'));
    if (modes.size > 1) err('chain-gap', `chain ${name} mixes modes (${[...modes].join(', ')}); a chain either builds one line or replaces in place`);
    const mode = list[0].mode ?? 'build';
    if (mode === 'build') {
      const outs = new Set(list.map((c) => c.out));
      if (outs.size > 1) err('chain-gap', `build chain ${name} leaves at ${[...outs].join(', ')}; a built line clears as a whole (one out for every fragment)`);
      const last = list[list.length - 1];
      const total = list.reduce((n, c) => n + c.n, 0);
      if (list.length > 1 && last.out - last.resolved < holdNeed(total))
        err('text-hold', `build chain ${name} holds ${last.out - last.resolved} f after its last fragment; its ${total} words need >= ${holdNeed(total)} f`);
    }
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1], list[i]];
      const read = a.resolved + holdNeed(a.n);
      const gap = b.in - read;
      if (gap < 0) err('chain-gap', `${b.id} arrives at f${b.in}, ${-gap} f before ${a.id} has been read (resolved f${a.resolved} + ${holdNeed(a.n)} f)`);
      else if (gap < Math.round(P.gapMin * s)) sev('chain-gap', `${a.id} -> ${b.id}: ${gap} f of picture between the read and the next fragment; give the picture its beat (${Math.round(P.gapMin * s)}-${Math.round(P.gapMax * s)} f)`);
      else if (gap > Math.round(P.gapMax * s)) warn('chain-gap', `${a.id} -> ${b.id}: ${gap} f between the read and the next fragment; past ${Math.round(P.gapMax * s)} f the thought breaks in two`);
      if (gap >= Math.round(P.gapMin * s)) {
        // the picture beat must be something the picture does: a cue, or a sound that is not a text sound
        const beat = cueFrames.some((c) => c.f >= read && c.f < b.in) || soundEvents.some((e) => e.kind !== 'text' && e.f >= read && e.f < b.in);
        if (!beat)
          sev('chain-beat', `${a.id} -> ${b.id}: nothing happens between the read (f${read}) and the next fragment (f${b.in}): no CUE${cuesPath ? ' and no sound other than text' : ''} there. The picture takes its turn between fragments (the product does what the fragment set up): give it a cue`);
      }
      const clear = Math.round((P.exitDur + 6) * s);
      if (mode === 'replace' && b.in < a.out + clear)
        err('chain-gap', `replace chain ${name}: ${b.id} arrives at f${b.in} while ${a.id} is still leaving (out f${a.out} + a ${exitF} f exit); start it >= ${clear} f after ${a.id}'s out, so its exit is over first`);
    }
  }

  // --- separate entries that arrive together (not one chain): the earlier one is read first
  const film = valid.filter((c) => !c.ui);
  const byIn = [...film].sort((a, b) => a.in - b.in);
  for (let i = 0; i < byIn.length; i++)
    for (let j = i + 1; j < byIn.length; j++) {
      const [a, b] = [byIn[i], byIn[j]];
      if (a.chain && a.chain === b.chain) continue; // chain-gap checks a chain's own fragments
      if (b.in >= a.out) continue; // a has left before b arrives
      const read = a.resolved + holdNeed(a.n);
      if (b.in < read)
        sev('read-first', `${b.id} "${b.text}" arrives at f${b.in} while ${a.id} "${a.text}" is on screen and not yet read (resolved f${a.resolved} + ${holdNeed(a.n)} f): two lines at once read as one sentence dumped. Write them as one chain() so they take turns, or bring ${b.id} in after f${read}`);
    }

  // --- what is on screen, frame by frame (film copy; ui counted apart)
  let maxVisible = 0;
  let worst: { f: number; ids: string[]; n: number; limit: number } | null = null;
  let textFrames = 0;
  let maxBoth = 0;
  const free: boolean[] = [];
  for (let f = 0; f < TOTAL; f++) {
    const on = film.filter((c) => c.in <= f && f < c.out); // on screen until its exit begins (text-share)
    const seen = film.filter((c) => c.in <= f && f < c.out + exitF); // ... and until its exit is over (concurrency)
    const n = seen.reduce((m, c) => m + c.n, 0);
    const both = n + valid.filter((c) => c.ui && c.in <= f && f < c.out + exitF).reduce((m, c) => m + c.n, 0);
    const limit = seen.length && seen.every((c) => c.mode === 'replace') ? P.maxVisibleReplace : P.maxVisibleBuild;
    maxVisible = Math.max(maxVisible, n);
    maxBoth = Math.max(maxBoth, both);
    if (n > limit && (!worst || n - limit > worst.n - worst.limit)) worst = { f, ids: seen.map((c) => c.id), n, limit };
    if (f < bodyEnd) {
      if (on.length) textFrames++;
      free.push(!on.length);
    }
  }
  if (worst) err('copy-concurrent', `${worst.n} film words on screen at f${worst.f} (${worst.ids.join(', ')}); at most ${worst.limit} at once: one fragment at a time`);
  if (maxBoth > 14) warn('copy-concurrent', `up to ${maxBoth} words (film copy and ui) readable at once; past 14 the frame reads as a page`);

  // --- copy rate and text share
  const win5 = Math.round(5 * FPS);
  const resolves = film.map((c) => ({ f: c.resolved, n: c.n })).sort((a, b) => a.f - b.f);
  let peak = { n: 0, f: 0 };
  for (const r of resolves) {
    const n = resolves.filter((x) => x.f >= r.f && x.f < r.f + win5).reduce((m, x) => m + x.n, 0);
    if (n > peak.n) peak = { n, f: r.f };
  }
  const perSec = scriptMode ? Math.max(P.maxWordsPerSec, SCRIPT.wordsPerSec) : P.maxWordsPerSec; // a script reads faster
  const avgMax = scriptMode ? Math.max(P.avgWordsPerSec, SCRIPT.avgWordsPerSec) : P.avgWordsPerSec;
  const shareMax = scriptMode ? Math.max(P.textShare, SCRIPT.textShare) : P.textShare;
  const maxIn5 = Math.round(5 * perSec);
  if (peak.n > maxIn5) warn('word-rate', `${peak.n} film words resolve in the 5 s from f${peak.f}; keep <= ${maxIn5} (${perSec} w/s): fewer words, or let the picture take the time`);
  const bodySec = bodyEnd / FPS;
  const avg = bodySec > 0 ? words / bodySec : 0;
  if (avg > avgMax) warn('word-rate', `${avg.toFixed(2)} film words per second over the body; keep <= ${avgMax}`);
  const share = bodyEnd > 0 ? textFrames / bodyEnd : 0;
  if (film.length && share > shareMax)
    (calm && share > shareMax + 0.1 ? err : warn)('text-share', `film copy is on screen on ${(100 * share).toFixed(1)}% of the body; keep <= ${Math.round(100 * shareMax)}%: give the picture beats with no copy`);
  // the longest text-free run inside every 10 s window of the body (the whole body when shorter)
  const freeNeed = Math.round(P.freeRun * s);
  const win10 = Math.min(bodyEnd, Math.round(10 * FPS));
  const runIn = (a: number, b: number) => {
    let best = 0;
    let cur = 0;
    for (let f = a; f < b; f++) best = Math.max(best, (cur = free[f] ? cur + 1 : 0));
    return best;
  };
  let longestFree = runIn(0, bodyEnd);
  if (film.length && freeNeed > 0 && win10 > 0) {
    for (let a = 0; a + win10 <= bodyEnd; a += Math.max(1, Math.round(FPS / 2))) {
      const run = runIn(a, a + win10);
      if (run < freeNeed) {
        warn('text-share', `no text-free stretch of ${freeNeed} f between f${a} and f${a + win10} (longest ${run} f): every 10 s needs a picture beat with no copy`);
        break;
      }
    }
  }

  // --- event gaps (the tail is for the audio to decay, so it is excluded)
  const events = new Set<number>([0, bodyEnd]);
  // One designed near-still hold per film (the key claim, under a music dropout) may run past the gap limit.
  const HOLD = T.HOLD as { from: number; to: number } | undefined;
  const holdMax = Math.round(96 * s);
  let hold: { from: number; to: number } | null = null;
  if (HOLD !== undefined) {
    if (!HOLD || !Number.isFinite(HOLD.from) || !Number.isFinite(HOLD.to) || HOLD.to <= HOLD.from) {
      err('hold', 'HOLD must be {from, to} frames with to > from');
    } else if (HOLD.to - HOLD.from > holdMax) {
      err('hold', `HOLD runs ${HOLD.to - HOLD.from} f; a designed hold is at most ${holdMax} f (96 f at 60 fps)`);
    } else {
      hold = HOLD;
      events.add(HOLD.from);
      events.add(HOLD.to);
    }
  }
  for (const c of cueFrames) events.add(c.f);
  for (const [, a] of acts) events.add(a.from);
  for (const c of valid) for (const f of [c.in, c.resolved, c.out]) events.add(f);
  // a line's words arriving through its reveal are events too: a 6-word sentence builds for a second or more
  for (const c of valid) for (let k = 1; k < c.n; k++) events.add(Math.round(c.in + (k * (c.resolved - c.in)) / c.n));
  for (const e of soundEvents) events.add(Math.round(e.f));
  // Reading windows: a resolved line being read is alive, so it fills the gap it sits in.
  const reading = Object.values(READ).flat();
  const uncovered = (a: number, b: number) => {
    // the longest run of frames in (a, b) that no reading window covers
    let best = 0;
    let cur = 0;
    for (let f = a + 1; f < b; f++) best = Math.max(best, (cur = reading.some(([x, y]) => f >= x && f < y) ? 0 : cur + 1));
    return best + 1; // + 1: a run of k uncovered frames between two events spans k + 1 frame steps
  };
  const ev = [...events].filter((f) => f >= 0 && f <= bodyEnd).sort((a, b) => a - b);
  let longestGap = 0;
  for (let i = 1; i < ev.length; i++) {
    const gap = ev[i] - ev[i - 1];
    if (hold && ev[i - 1] >= hold.from && ev[i] <= hold.to) continue; // the declared hold
    const live = gap > maxGap ? uncovered(ev[i - 1], ev[i]) : gap;
    longestGap = Math.max(longestGap, Math.min(gap, live));
    if (gap > maxGap && live > maxGap) {
      const near = cueFrames.filter((c) => c.f === ev[i - 1] || c.f === ev[i]).map((c) => c.name);
      err('event-gap', `${live} f without an event or a line being read between f${ev[i - 1]} and f${ev[i]}${near.length ? ` (${near.join(', ')})` : ''}; add the beat that keeps it alive (a move, a peak, a drift under a read) or --max-gap`);
    }
  }

  // --- read-quiet: nothing new that asks for the eye starts while a fragment is read (calm). Only
  // copy, hit and cut CUEs are guarded; life and moves away from the text keep the picture alive.
  if (calm) {
    const textFrames = new Set(valid.flatMap((c) => [c.in, c.resolved, c.out]));
    const loud = new Set<string>();
    for (const c of valid) {
      if (c.ui) continue;
      for (const [a, b] of READ[String(c.id)] ?? [])
        for (const q of cueFrames) {
          const sal = salienceOf(q.name);
          if (sal === 'life' || sal === 'move') continue;
          if (q.f >= a && q.f < b && q.f < bodyEnd && !textFrames.has(q.f) && !loud.has(q.name)) {
            loud.add(q.name);
            warn('read-quiet', `CUE.${q.name} (f${q.f}, ${sal}) starts while ${c.id} "${c.text}" is being read (f${a}-${b}): nothing that asks for the eye starts during a reading hold; move it after the read, where the picture takes its turn (life and camera moves away from the text may run: SALIENCE 'life' | 'move')`);
          }
        }
    }
  }

  // ---- declarations: what the picture does on purpose (all optional; absent = the 1.1 checks only)
  const DECL_KEYS = ['LOOK', 'SEAMS', 'STEPPED', 'FLASHES', 'CAMERA_BLUR', 'END', 'REVEAL', 'SPRING_CLASS', 'STRUCTURAL', 'SALIENCE'];
  const declared = DECL_KEYS.some((k) => T[k] !== undefined) || !!MUSIC;
  const arr = <X>(k: string): X[] => {
    const v = T[k];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      err('declarations', `${k} must be an array`);
      return [];
    }
    return v as X[];
  };
  const LOOK = (T.LOOK && typeof T.LOOK === 'object' ? T.LOOK : {}) as { blur?: string; texture?: string; filmType?: string; oneTake?: boolean; whiteWorld?: boolean };
  const filmType = String(LOOK.filmType ?? 'launch');
  const SEAMS = arr<Seam>('SEAMS').filter((x, i) => {
    if (!x || !isNum(x.at)) return (err('declarations', `SEAMS[${i}]: at must be a frame`), false);
    return true;
  });
  const STEPPED = arr<Range>('STEPPED');
  const FLASHES = arr<FlashDecl>('FLASHES');
  const CAMERA_BLUR = arr<Range>('CAMERA_BLUR');
  const END0 = T.END as { from?: number; to?: number } | undefined;
  const END = END0 && isNum(END0.from) && isNum(END0.to) && !(END0.from === 0 && END0.to === 0) ? { from: END0.from, to: END0.to } : null;
  const REVEAL = isNum(T.REVEAL) && T.REVEAL > 0 ? (T.REVEAL as number) : null;
  const actStarts = acts.map(([, a]) => a.from).filter((f) => f > 0);
  const crossesAct = (from: number, to: number) => actStarts.find((x) => x > from && x < to);
  if (declared) {
    if (T.LOOK !== undefined) {
      if (!T.LOOK || typeof T.LOOK !== 'object') err('declarations', 'LOOK must be {blur, texture, filmType, oneTake, whiteWorld}');
      else {
        if (LOOK.blur !== undefined && !['crisp', 'camera'].includes(LOOK.blur)) err('declarations', `LOOK.blur must be 'crisp' or 'camera' (got ${LOOK.blur})`);
        if (LOOK.texture !== undefined && !TEXTURES.includes(LOOK.texture)) err('declarations', `LOOK.texture must be one of ${TEXTURES.join(', ')} (got ${LOOK.texture})`);
        if (LOOK.filmType !== undefined && !FILM_TYPES.includes(LOOK.filmType)) err('declarations', `LOOK.filmType must be one of ${FILM_TYPES.join(', ')} (got ${LOOK.filmType})`);
      }
    }
    const seen = new Map<number, string>();
    SEAMS.forEach((x, i) => {
      const id = x.id ?? `SEAMS[${i}]`;
      if (!SEAM_KINDS.includes(x.kind)) err('declarations', `seam ${id}: kind "${x.kind}" is not one of ${SEAM_KINDS.join(', ')}`);
      if (!(x.at > 0 && x.at < TOTAL)) err('declarations', `seam ${id} at f${x.at} is outside the film (0, ${TOTAL})`);
      if (!Number.isInteger(x.at)) err('declarations', `seam ${id} at f${x.at}: seams sit on whole frames`);
      if (seen.has(x.at)) err('declarations', `seams ${seen.get(x.at)} and ${id} are both at f${x.at}: one seam per cut`);
      seen.set(x.at, id);
      if (x.dir !== undefined && x.dir !== 1 && x.dir !== -1) err('declarations', `seam ${id}: dir must be 1 or -1`);
    });
    const rangeCheck = (list: Range[], name: string, extra: (r: Range, id: string) => void) => {
      const ok: Range[] = [];
      list.forEach((r, i) => {
        const id = r?.id ?? `${name}[${i}]`;
        if (!r || !isNum(r.from) || !isNum(r.to)) return err('declarations', `${name} ${id}: from and to must be frames`);
        if (!(r.to > r.from)) return err('declarations', `${name} ${id}: to (f${r.to}) must be after from (f${r.from})`);
        if (r.from < 0 || r.to > TOTAL) return err('declarations', `${name} ${id} [f${r.from}, f${r.to}) is outside the film [0, ${TOTAL}]`);
        const over = ok.find((o) => r.from < o.to && o.from < r.to);
        if (over) err('declarations', `${name} ${id} overlaps ${over.id ?? 'another range'}: one declaration per frame`);
        const x = crossesAct(r.from, r.to);
        if (x !== undefined) warn('declarations', `${name} ${id} [f${r.from}, f${r.to}) crosses the act boundary at f${x}: declare one range per act`);
        extra(r, id);
        ok.push(r);
      });
    };
    rangeCheck(STEPPED, 'STEPPED', (r, id) => {
      if (r.fps !== undefined && ![12, 16, 20, 30].includes(r.fps)) err('declarations', `STEPPED ${id}: fps must be 12, 16, 20 or 30`);
      else if (r.fps !== undefined && r.fps >= FPS) err('declarations', `STEPPED ${id}: a ${r.fps} fps cadence is not a step in a ${FPS} fps film`);
      if (r.on !== undefined && ![2, 3].includes(r.on)) err('declarations', `STEPPED ${id}: on must be 2 or 3`);
      const step = r.on ?? (r.fps ? FPS / r.fps : 2);
      if (r.to - r.from > 1 && r.to - r.from < 2 * step) warn('declarations', `STEPPED ${id} lasts ${r.to - r.from} f, under two steps of ${step.toFixed(2)} f: a step nobody sees is a dropped frame`);
    });
    rangeCheck(CAMERA_BLUR, 'CAMERA_BLUR', (r, id) => {
      if (r.to - r.from > 2 * FPS) warn('declarations', `CAMERA_BLUR ${id} lasts ${((r.to - r.from) / FPS).toFixed(2)} s: a camera-blur moment is a flick or a whip; for a whole camera film set LOOK.blur = 'camera'`);
    });
    const flashAt = new Map<number, string>();
    FLASHES.forEach((x, i) => {
      const id = x?.id ?? `FLASHES[${i}]`;
      if (!x || !isNum(x.f)) return err('declarations', `flash ${id}: f must be a frame`);
      if (x.frames !== 1 && x.frames !== 2) err('declarations', `flash ${id} lasts ${x.frames} frames: a designed flash is 1 or 2 frames (a longer one is a fade or an exposure event)`);
      if (x.f < 0 || x.f + (x.frames || 1) > TOTAL) err('declarations', `flash ${id} at f${x.f} is outside the film`);
      if (flashAt.has(x.f)) err('declarations', `flashes ${flashAt.get(x.f)} and ${id} are both at f${x.f}`);
      flashAt.set(x.f, id);
    });
    if (END0 !== undefined && !END) {
      if (!END0 || !isNum(END0.from) || !isNum(END0.to)) err('declarations', 'END must be {from, to} frames');
    }
    if (END) {
      if (!(END.to > END.from)) err('declarations', `END: to (f${END.to}) must be after from (f${END.from})`);
      if (END.from < 0 || END.to > TOTAL) err('declarations', `END [f${END.from}, f${END.to}) is outside the film [0, ${TOTAL}]`);
    }
    if (T.REVEAL !== undefined && !(isNum(T.REVEAL) && T.REVEAL >= 0 && T.REVEAL < TOTAL)) err('declarations', `REVEAL must be a frame inside the film (got ${T.REVEAL})`);
    if (T.SPRING_CLASS !== undefined && typeof T.SPRING_CLASS !== 'string') err('declarations', 'SPRING_CLASS must be a string');
    if (T.STRUCTURAL !== undefined) {
      if (!Array.isArray(T.STRUCTURAL)) err('declarations', 'STRUCTURAL must be an array of CUE names');
      else for (const n of T.STRUCTURAL as unknown[]) if (!(String(n) in CUE!)) err('declarations', `STRUCTURAL names "${n}", which is not a CUE`);
    }
    if (T.SALIENCE !== undefined) {
      if (!T.SALIENCE || typeof T.SALIENCE !== 'object') err('declarations', 'SALIENCE must be {cueName: salience}');
      else
        for (const [k, v] of Object.entries(T.SALIENCE as Record<string, unknown>)) {
          if (!(k in CUE!)) err('declarations', `SALIENCE names "${k}", which is not a CUE`);
          else if (!SALIENCES.includes(String(v))) err('declarations', `SALIENCE.${k} must be one of ${SALIENCES.join(', ')} (got ${v})`);
        }
    }
  }

  // ---- declares-cover: the primitives' own declarations (cues.json declared.fx) are in the timeline's
  const fxDecl = (cuesDoc?.declared?.fx ?? []) as Declares[];
  if (fxDecl.length) {
    const inside = (r: Range, list: Range[]) => list.some((o) => isNum(o.from) && isNum(o.to) && r.from >= o.from && r.to <= o.to);
    for (const [i, d] of fxDecl.entries()) {
      const who = `fx ${d.id ?? i}`;
      for (const r of d.stepped ?? []) {
        const host = STEPPED.find((o) => r.from >= o.from && r.to <= o.to);
        if (!host) err('declares-cover', `${who} steps [f${r.from}, f${r.to})${r.fps ? ` at ${r.fps} fps` : ''} but no STEPPED range covers it: declare it in the timeline, or the blur sampling and forensics treat the steps as dropped frames`);
        else if ((r.fps && host.fps && r.fps !== host.fps) || (r.on && host.on && r.on !== host.on))
          err('declares-cover', `${who} steps [f${r.from}, f${r.to}) ${r.fps ? `at ${r.fps} fps` : `on ${r.on}s`} inside STEPPED ${host.id ?? ''} declared ${host.fps ? `at ${host.fps} fps` : `on ${host.on}s`}: one cadence per range`);
      }
      for (const x of d.flashes ?? [])
        if (!FLASHES.some((o) => o.f === x.f && (o.frames ?? 1) >= (x.frames ?? 1)))
          err('declares-cover', `${who} flashes at f${x.f} for ${x.frames} frame(s) but FLASHES has no such flash: declare it, or forensics fails it as a pop`);
      for (const r of d.cameraBlur ?? [])
        if (LOOK.blur !== 'camera' && !inside(r, CAMERA_BLUR))
          err('declares-cover', `${who} needs camera blur over [f${r.from}, f${r.to}) but no CAMERA_BLUR range covers it in this crisp film: declare it, or the move renders without its blur`);
      for (const x of d.seams ?? [])
        if (!SEAMS.some((o) => o.at === x.at && o.kind === x.kind))
          err('declares-cover', `${who} makes a ${x.kind} seam at f${x.at} but SEAMS has no ${x.kind} seam there: declare it in the timeline`);
    }
  }

  // ---- cuts: act boundaries, seams and CUEs whose salience is `cut` (inside the body)
  const cutMap = new Map<number, string>();
  for (const [name, a] of acts) if (a.from > 0 && a.from < bodyEnd) cutMap.set(a.from, `ACT.${name}`);
  for (const x of SEAMS) if (x.kind !== 'fadeEnd' && x.at > 0 && x.at < bodyEnd) cutMap.set(x.at, x.id ? `seam ${x.id}` : `${x.kind} seam`);
  for (const q of cueFrames) if (salienceOf(q.name) === 'cut' && q.f > 0 && q.f < bodyEnd && !cutMap.has(q.f)) cutMap.set(q.f, `CUE.${q.name}`);
  const cuts = [...cutMap.keys()].sort((a, b) => a - b);
  const structuralNames = Array.isArray(T.STRUCTURAL) ? (T.STRUCTURAL as unknown[]).map(String) : [];
  const structuralFrames = new Set<number>([...actStarts, ...cueFrames.filter((q) => structuralNames.includes(baseName(q.name))).map((q) => q.f)]);

  // ---- music: structure on the music's events, no metronome editing, a dip before the reveal
  if (MUSIC && mDown.length) {
    const targets = [...mDown, ...(MUSIC.entries ?? []).filter(isNum), ...(MUSIC.stops ?? []).map((x) => x?.to).filter(isNum), ...(MUSIC.breaks ?? []).map((x) => x?.to).filter(isNum)];
    if (MUSIC.end && isNum(MUSIC.end.f)) targets.push(MUSIC.end.f);
    const check = (f: number, what: string) => {
      const n = nearest(targets, f);
      if (Math.abs(f - n) > 1 + 1e-9)
        err('structural-on-music', `${what} at f${f} is ${(f - n).toFixed(2)} f from the nearest music event (f${n.toFixed(2)}): structure lands within 1 f of a downbeat attack, an entry, a stop's end or the ending`);
    };
    for (const [name, a] of acts) if (a.from > 0) check(a.from, `ACT.${name}`);
    for (const q of cueFrames) if (structuralNames.includes(baseName(q.name))) check(q.f, `CUE.${q.name} (STRUCTURAL)`);
    if (!['reel', 'social'].includes(filmType)) {
      const ordinary = cuts.filter((f) => !structuralFrames.has(f));
      if (ordinary.length >= 3) {
        const onDown = ordinary.filter((f) => Math.abs(f - nearest(mDown.length ? [...mDown, ...barLines] : barLines, f)) <= 1 + 1e-9).length;
        if (onDown / ordinary.length > 0.6)
          warn('anti-metronome', `${onDown} of ${ordinary.length} ordinary cuts (${Math.round((100 * onDown) / ordinary.length)} %) sit on downbeats; keep <= 60 %: cut on the track's accents and designed sounds, skip some downbeats, use the 16th before one (a ${filmType} film is not a grid reel)`);
      }
      if (cuts.length >= 4) {
        const gaps = cuts.slice(1).map((f, i) => f - cuts[i]);
        const c = cv(gaps);
        if (c < 0.25) warn('anti-metronome', `the ${cuts.length} cuts come at near-even intervals (coefficient of variation ${c.toFixed(2)} < 0.25): vary the shot lengths with the music's phrasing, not the bar count`);
      }
    }
    if (REVEAL !== null) {
      const dips: Span[] = [...(MUSIC.stops ?? []), ...(MUSIC.breaks ?? [])].filter((x) => x && isNum(x.from) && isNum(x.to));
      for (const e of soundEvents) if (/^(stop|dip|stopdown)$/i.test(e.kind) && isNum(e.dur)) dips.push({ from: e.f, to: e.f + e.dur });
      dips.push(...scoreStopdowns(), ...planStopdowns());
      const near = dips.filter((x) => Math.abs(x.to - REVEAL) <= 2 + 1e-9);
      const good = near.filter((x) => (x.to - x.from) / FPS >= 0.2 - 1e-9 && (x.to - x.from) / FPS <= 0.5 + 1e-9);
      if (!near.length) warn('reveal-dip', `no stop or dip ends within 2 f of REVEAL (f${REVEAL}): before the biggest reveal, stop the track (or dip it) for 0.2-0.5 s and land the reveal on its return`);
      else if (!good.length) warn('reveal-dip', `the stop before REVEAL lasts ${((near[0].to - near[0].from) / FPS).toFixed(2)} s; 0.2-0.5 s reads as a held breath, longer as a break`);
    }
  }

  // ---- grammar: only for timelines that declare what they do
  const s60 = (f60n: number) => f60n * s; // a 60 fps number at this film's fps
  let shotInfo: { shots: number; median: number } | null = null;
  if (declared) {
    // shot-length
    const bounds = [0, ...cuts, bodyEnd];
    const shots = bounds.slice(1).map((f, i) => f - bounds[i]).filter((d) => d > 0);
    const sec = shots.map((d) => d / FPS);
    shotInfo = { shots: shots.length, median: +median(sec).toFixed(3) };
    if (!LOOK.oneTake && shots.length >= 3) {
      const band = SHOT_BAND[filmType] ?? [0.5, 3.0];
      const med = median(sec);
      if (med < band[0] || med > band[1]) warn('shot-length', `the median shot is ${med.toFixed(2)} s; a ${filmType} film sits at ${band[0]}-${band[1]} s (LOOK.filmType)${med > band[1] ? ': cut more, or carry the shot with the camera and declare it LOOK.oneTake' : ''}`);
      if (shots.length >= 4) {
        const spread = quantile(sec, 0.75) / quantile(sec, 0.25);
        if (spread < 1.6) warn('shot-length', `shot lengths barely vary (q75/q25 ${spread.toFixed(2)} < 1.6; aim for 1.9-3.1): the cuts read as a metronome; mix long holds with short punches (a 0.6 s insert beside a 4 s hold)`);
      }
      if (Math.max(...sec) < 2 * Math.min(...sec)) warn('shot-length', `the longest shot (${Math.max(...sec).toFixed(2)} s) is under twice the shortest (${Math.min(...sec).toFixed(2)} s)`);
      for (let i = 0; i < shots.length; i++) {
        if (sec[i] >= 0.25) continue;
        const [a, b] = [bounds[i], bounds[i + 1]];
        const punch = FLASHES.some((x) => x.f >= a && x.f < b) || STEPPED.some((r) => r.from < b && a < r.to) || SEAMS.some((x) => (x.at === a || x.at === b) && PUNCH.has(x.kind));
        if (!punch) warn('shot-length', `the shot f${a}-f${b} lasts ${sec[i].toFixed(2)} s; under 0.25 s only as a declared punch (a flash, a step, a snap zoom, a colour or light seam)`);
      }
      const long = sec.filter((x) => x > 4).length / sec.length;
      const longMax = filmType === 'launch' || filmType === 'update' ? 0.15 : 0.3;
      if (long > longMax) warn('shot-length', `${Math.round(100 * long)} % of the shots run over 4 s; keep <= ${Math.round(100 * longMax)} % in a ${filmType} film, or declare LOOK.oneTake`);
    }

    // picture changes: cuts and seams, copy arriving or leaving, and CUEs that change the picture (hit, cut, copy,
    // move); `life` (creep, light, drift) keeps a hold alive but is not a change
    const endFrom = END ? Math.min(END.from, bodyEnd) : bodyEnd;
    const changeSet = new Set<number>(cuts);
    for (const c of COPY) for (const f of [c.in, c.out]) if (isNum(f) && f > 0 && f < endFrom) changeSet.add(f);
    for (const q of cueFrames) if (q.f > 0 && q.f < endFrom && salienceOf(q.name) !== 'life') changeSet.add(q.f);
    const changes = [...changeSet].filter((f) => f > 0 && f < endFrom).sort((a, b) => a - b);
    // long-take: a take over 15 s keeps changing inside (two picture changes per 10 s)
    const takes: [number, number][] = LOOK.oneTake ? [[0, endFrom]] : bounds.slice(1).map((f, i) => [bounds[i], Math.min(f, endFrom)] as [number, number]);
    for (const [a, b] of takes) {
      const len = (b - a) / FPS;
      if (len <= 15) continue;
      const inside = changes.filter((f) => f > a && f < b && !cuts.includes(f)).length;
      if (inside / (len / 10) < 2) warn('long-take', `the take f${a}-f${b} runs ${len.toFixed(1)} s with ${inside} picture change(s) inside it; a take over 15 s changes its layout or type at least twice every 10 s (a word, a chip, a reframe), or cut it`);
    }
    // cut-mix: some changes happen without a hard cut
    if (cuts.length >= 5) {
      const seamAt = new Map(SEAMS.map((x) => [x.at, x.kind] as [number, string]));
      const soft = cuts.filter((f) => CUT_FREE.has(seamAt.get(f) ?? '')).length;
      if (soft / cuts.length < 0.14 - 1e-9) warn('cut-mix', `${soft} of ${cuts.length} picture changes happen without a hard cut (${Math.round((100 * soft) / cuts.length)} %); carry at least one in seven on a morph, mask, wipe or zoom-through`);
    }
    // picture-change: a layout or type change at least every 2.5 s outside the end lock
    {
      const marks = [0, ...changes, endFrom];
      let worst: [number, number] | null = null;
      for (let i = 1; i < marks.length; i++) if (!worst || marks[i] - marks[i - 1] > worst[1] - worst[0]) worst = [marks[i - 1], marks[i]];
      if (worst && worst[1] - worst[0] > 2.5 * FPS + 1e-9)
        warn('picture-change', `f${worst[0]}-f${worst[1]}: ${((worst[1] - worst[0]) / FPS).toFixed(2)} s with no layout or type change (no cut, copy arriving or leaving, or hit, cut, copy or move cue); change the picture at least every 2.5 s outside the end lock: a creep alone reads as a held frame`);
    }
    // opener: two picture changes in the first 2.5 s
    {
      const early = changes.filter((f) => f <= 2.5 * FPS + 1e-9).length;
      if (endFrom > 2.5 * FPS && early < 2) warn('opener', `${early} picture change(s) in the first 2.5 s; open with at least two (a cut, a word arriving, a reframe), the subject readable from frame 0`);
    }

    // seam-plan
    if (SEAMS.length) {
      const sorted = [...SEAMS].sort((a, b) => a.at - b.at);
      const lastAct = acts.length ? acts[acts.length - 1][1].from : 0;
      sorted.forEach((x, i) => {
        const id = x.id ?? `${x.kind}@f${x.at}`;
        if (x.kind === 'fadeEnd' && (i !== sorted.length - 1 || x.at < lastAct)) err('seam-plan', `seam ${id}: a fade only ends the film (the last seam, in the last act); between shots it reads as a dissolve`);
        if (x.kind === 'dissolveUi' && actStarts.includes(x.at)) err('seam-plan', `seam ${id}: a dissolve only lives inside UI under camera motion; across the act boundary at f${x.at} it joins unrelated shots (carry something: velocity, morph, mask)`);
        if (x.kind === 'dissolveUi' && isNum(x.dur) && x.dur > s60(8) + 1e-9) err('seam-plan', `seam ${id}: a ${x.dur} f dissolve; keep UI dissolves <= ${s60(8)} f (8 f@60)`);
      });
      const counts = new Map<string, number>();
      for (const x of SEAMS) if (!x.signature) counts.set(x.kind, (counts.get(x.kind) ?? 0) + 1);
      for (const [k, n] of counts) if (n > 3) warn('seam-plan', `${n} ${k} seams; any one kind <= 3 times except the signature move (mark it signature: true)`);
      if (SEAMS.length >= 3) {
        const carried = SEAMS.filter((x) => CARRIED.has(x.kind)).length / SEAMS.length;
        if (carried < 0.4) warn('seam-plan', `${Math.round(100 * carried)} % of the seams carry something across (velocity, morph, breath, zoom-through, whip, snap zoom, mask); keep >= 40 %`);
      }
      if (TOTAL / FPS > 20 && SEAMS.some((x) => x.kind === 'hard') && !SEAMS.some((x) => x.kind === 'velocity'))
        warn('seam-plan', `a ${(TOTAL / FPS).toFixed(1)} s cut film with no velocity seam: carry the speed through at least one cut`);
    }

    // cut-on-sound (when there are onsets to land on). Continuity seams (speed, shape or scale carried
    // through: velocity, morph, breath, zoom-through, whip, mask, defocus, wipe, a UI dissolve) may float
    // off the accents; hard cuts, graphic punches and undeclared act cuts land on a sound.
    const soundCuts = cuts.filter((f) => !SEAMS.some((x) => x.at === f && CONTINUITY.has(x.kind)));
    if (onsets.length && soundCuts.length) {
      const d = soundCuts.map((f) => ({ f, lead: inLead(f), near: Math.abs(toOnset(f) ?? Infinity) <= 0.1 * FPS + 1e-9 }));
      const inWin = d.filter((x) => x.lead).length / d.length;
      const in100 = d.filter((x) => x.near).length / d.length;
      const off = d.filter((x) => !x.near).map((x) => `${cutMap.get(x.f)} f${x.f}`);
      if (in100 < 0.3) err('cut-on-sound', `only ${Math.round(100 * in100)} % of the ${d.length} cuts land within 100 ms of a sound (${off.slice(0, 4).join(', ')}${off.length > 4 ? ', ...' : ''}): cut on an accent or a designed effect`);
      else if (inWin < 0.5 || in100 < 0.8)
        warn('cut-on-sound', `${Math.round(100 * inWin)} % of the ${d.length} cuts sit on a sound (picture ${leadMin}..+${leadMax} f from it) and ${Math.round(100 * in100)} % within 100 ms; want >= 50 % and >= 80 %${off.length ? ` (off: ${off.slice(0, 4).join(', ')})` : ''}`);
    }

    // stagger-shape: CUE lists of starts, and the pace's word stagger when it carries a cadence
    const BANDS: Record<string, [number, number]> = { word: [7, 14], letter: [3, 8], ui: [5, 18] };
    for (const [name, v] of Object.entries(CUE!)) {
      if (!Array.isArray(v) || v.length < 4 || !v.every(isNum)) continue;
      const tag = staggerTag.get(name) ?? '';
      const f = [...(v as number[])].sort((a, b) => a - b);
      const gaps = f.slice(1).map((x, i) => (x - f[i]) / s);
      if (tag !== 'list' && cv(gaps) < 0.1)
        warn('stagger-shape', `CUE.${name}: ${f.length} starts at even ${median(gaps).toFixed(1)} f@60 gaps (CV ${cv(gaps).toFixed(2)}); stagger by the reading rhythm, or tag a real list with "// stagger: list"`);
      if (tag === 'payoff' && gaps.length >= 3 && gaps[gaps.length - 3] < gaps[gaps.length - 2] && gaps[gaps.length - 2] < gaps[gaps.length - 1])
        warn('stagger-shape', `CUE.${name} is a payoff but its last gaps grow (${gaps.slice(-3).map((g) => g.toFixed(0)).join(', ')} f@60): accelerate into the payoff`);
      const band = BANDS[tag];
      if (band && (median(gaps) < band[0] || median(gaps) > band[1])) warn('stagger-shape', `CUE.${name}: a ${tag} stagger of ${median(gaps).toFixed(1)} f@60 (median); ${tag}s stagger ${band[0]}-${band[1]} f@60`);
    }
    const PX = exported as Record<string, unknown> | undefined;
    if (PX && typeof PX.cadence === 'string' && isNum(PX.stagger) && (PX.stagger < 7 || PX.stagger > 14))
      warn('stagger-shape', `the ${paceName} pace staggers words ${PX.stagger} f@60; words stagger 7-14 f@60`);

    // exit-length: the pace's text exit against its entrance
    if (PX && isNum(PX.exitDur) && isNum(PX.wordDur) && (PX.exitDur > 0.75 * PX.wordDur + 1e-9 || PX.exitDur > 33))
      warn('exit-length', `the ${paceName} pace exits text over ${PX.exitDur} f@60 against a ${PX.wordDur} f entrance; an exit is <= 0.75 x the entrance and <= 33 f@60 (leave faster than you arrive)`);

    // recentre: the pace's re-centre (1.2 knobs: recentre, recentreDur, recentreLead)
    if (PX && typeof PX.recentre === 'string') {
      const dur = Number(PX.recentreDur);
      const lead = Number(PX.recentreLead ?? 0);
      if (isNum(dur) && (dur < 12 || dur > 44)) warn('recentre', `the ${paceName} pace re-centres over ${dur} f@60; a re-centre jump takes 12-44 f@60 (house 22)`);
      if (isNum(lead) && lead > 12) warn('recentre', `the ${paceName} pace starts its re-centre ${lead} f@60 early; a lead over 12 f@60 reads as drift`);
      if (PX.recentre === 'jump' && isNum(dur) && dur > 0) {
        const k = isNum(PX.recentreK) ? PX.recentreK : 12;
        const t = Math.min(1, 2 / dur);
        const p = (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
        if (p < 0.55) warn('recentre', `the ${paceName} re-centre is ${Math.round(100 * p)} % home after 1/30 s; a jump is >= 55 % there (house ~67 %)`);
      }
    }

    // accent-time: the pace's transient accent (1.2 knobs: accentHold, accentCool)
    if (PX && (isNum(PX.accentHold) || isNum(PX.accentCool))) {
      if (isNum(PX.accentHold) && PX.accentHold > 72) warn('accent-time', `the ${paceName} pace holds the accent ${PX.accentHold} f@60 (${(PX.accentHold / 60).toFixed(2)} s); hold it 0.2-1.2 s`);
      if (isNum(PX.accentCool) && PX.accentCool > 28) warn('accent-time', `the ${paceName} pace cools the accent over ${PX.accentCool} f@60; cool it in <= 28 f@60 (house 13)`);
      if (typeof PX.accentEase === 'string' && PX.accentEase !== 'linear') warn('accent-time', `the ${paceName} pace cools the accent on ${PX.accentEase}; the cool is linear`);
    }

    // end-lock
    if (END && END.to > END.from) {
      const len = (END.to - END.from) / FPS;
      if (len < 1 - 1e-9 || len > 5 + 1e-9) warn('end-lock', `END holds ${len.toFixed(2)} s; the one end lock holds 1-5 s`);
      if (END.to < bodyEnd) warn('end-lock', `END stops at f${END.to}, before the body ends (f${bodyEnd}): the lock holds to the end`);
    }

    // density-plan (optional): a MOTION registry of moves
    const MOTION = (Array.isArray(T.MOTION) ? T.MOTION : Array.isArray(cuesDoc?.motion) ? cuesDoc!.motion : null) as { from: number; to: number }[] | null;
    if (MOTION && MOTION.length) {
      const moves = MOTION.filter((m) => m && isNum(m.from) && isNum(m.to) && m.to > m.from);
      const quiet = (f: number) => (hold && f >= hold.from && f < hold.to) || (END && f >= END.from && f < END.to);
      const span = Math.max(1, (END ? Math.min(END.from, bodyEnd) : bodyEnd));
      const starts = moves.filter((m) => m.from < span).map((m) => m.from).sort((a, b) => a - b);
      const rate = starts.length / (span / FPS);
      if (rate < 1.4 || rate > 3.6) warn('density-plan', `${rate.toFixed(2)} moves start per second before the end lock; a living film runs 1.4-3.6 (house ~2.3)`);
      let running = 0;
      for (let f = 0; f < span; f++) running += moves.filter((m) => m.from <= f && f < m.to).length;
      const conc = running / span;
      if (conc < 1.3 || conc > 2.7) warn('density-plan', `${conc.toFixed(2)} moves run at once on average; keep 1.3-2.7 (house ~1.7)`);
      const win = FPS;
      for (let a = 0; a + win <= span; a += Math.max(1, Math.round(FPS / 4))) {
        if (quiet(a)) continue;
        if (!starts.some((f) => f >= a && f < a + win)) {
          warn('density-plan', `nothing starts between f${a} and f${a + win}: no second without a new move outside HOLD and END`);
          break;
        }
      }
    }
  }

  // --- tail and bars
  const lastCue = cueFrames.reduce((m, c) => Math.max(m, c.f), 0);
  if (TOTAL - lastCue < FPS) warn('tail', `only ${TOTAL - lastCue} f after the last cue; leave >= ${FPS} f (1 s) for the audio to decay`);
  if (T.TAIL !== undefined && TAIL < FPS) warn('tail', `TAIL is ${TAIL} f; use >= ${FPS} f (1 s)`);
  if (!MUSIC && Math.abs(bodyEnd / BAR - Math.round(bodyEnd / BAR)) > 1e-6) warn('whole-bars', `the body (TOTAL - TAIL = ${bodyEnd} f) is ${(bodyEnd / BAR).toFixed(2)} bars; whole bars loop and end cleanly`);

  // --- report
  const errors = out.filter((x) => x.severity === 'error').length;
  const warnings = out.length - errors;
  const pass = errors === 0 && !(strict && warnings > 0);
  const summary = {
    fps: FPS,
    bpm: BPM,
    beat: BEAT,
    bar: BAR,
    total: TOTAL,
    seconds: +(TOTAL / FPS).toFixed(3),
    acts: acts.length,
    cues: cueFrames.length,
    pace: paceName,
    words,
    uiWords,
    maxWords,
    maxVisible,
    wordsPerSec: +avg.toFixed(2),
    peakWordsIn5s: peak.n,
    textShare: +share.toFixed(3),
    longestTextFree: longestFree,
    maxGap,
    longestGap,
    music: MUSIC ? { bpm: MUSIC.bpm, t0: MUSIC.t0, bars: MUSIC.bars, accents: (MUSIC.accents ?? []).length } : null,
    declared,
    cuts: cuts.length,
    onsets: onsets.length,
    shots: shotInfo,
  };
  if (json) console.log(JSON.stringify({ tool: 'grid-check', timeline: tlPath, pass, errors, warnings, summary, findings: out }, null, 1));
  else {
    for (const f of out) console.log(`${f.severity === 'error' ? 'FAIL' : 'warn'}  ${f.check}  ${f.message}`);
    console.log(
      `grid-check: ${summary.seconds} s, ${BPM} BPM @ ${FPS} fps (beat ${+BEAT.toFixed(3)} f, bar ${+BAR.toFixed(3)} f${MUSIC ? `, music grid from f${+Number(MUSIC.t0).toFixed(2)}` : ''}), ${paceName} pace, ${summary.acts} acts, ${summary.cues} cues, ` +
        `${words}/${maxWords} words${uiWords ? ` (+${uiWords} ui)` : ''}, <= ${maxVisible} on screen, ${summary.wordsPerSec} w/s, ` +
        `text on ${Math.round(100 * share)}% (longest text-free ${longestFree} f), longest gap ${longestGap}/${maxGap} f -> ${pass ? 'pass' : 'FAIL'} (${errors} errors, ${warnings} warnings)`,
    );
  }
  process.exit(pass ? 0 : 1);
}

main();
