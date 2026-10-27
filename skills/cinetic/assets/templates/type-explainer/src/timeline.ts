// The single source of truth for time, for a type-led explainer: one short sentence at a time on a white page. The
// name as one giant word with the mark arriving as the next word, what the product is built at the pace of speech,
// the problem as one drifting line, the promise with a picture inside it that becomes the next shot, the name over
// that picture, one soft wipe, how it fits together with the mark between the words, the mark becoming the hub of its
// parts, and the close. Picture (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all
// import this file. The facts live in src/explain.ts. Think in beats, never in seconds. Keep it free of React and CSS
// imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { EXPLAIN } from './explain';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. An explainer rides a calm, even track: choose it first.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites the
 * `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 90;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The film's pace (src/lib/pace.ts): one sentence at a time, at the crisp word tempo, each line said and gone. */
export const PACE_NAME: PaceName = 'crisp';

/** Frames per beat (a whole number without a track: 60 fps -> 90, 100, 120, 144, 150 BPM). */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/** Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat. */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
/** A choreography length written in 60 fps frames, converted to this film's fps (rounded). */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
/** The fractional twin of f60, for durations inside a move. */
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;
/** Absolute frame `x` beats from the film's first downbeat, on the 16th grid (x in quarter beats). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  const n = Math.floor(q / 4);
  return b(1 + Math.floor(n / 4), n % 4, q % 4);
};

/** After the last bar the picture holds while the audio decays to digital silence. */
export const TAIL = FPS;

/**
 * Where each act starts, in beats (9 bars at 90 BPM: 25 s with the tail). Every act line sits on a bar line, so with
 * a track in each one lands on a downbeat (grid-check structural-on-music): the 2-bar open (the name for half a bar,
 * then what it is), a 1-bar problem, a 1-bar promise, the 1-bar picture, a 1-bar line of how it fits, the 2-bar grid
 * of its parts and the 1-bar close. Retime in whole bars.
 */
export const BEATS = { open: 0, pain: 8, promise: 12, picture: 16, system: 20, grid: 24, end: 32, last: 36 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['open', 'pain', 'promise', 'picture', 'system', 'grid', 'end'] as const;
export type ActName = (typeof order)[number];
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;

export const TOTAL = bt(BEATS.last) + TAIL;

/**
 * Words said at the pace of speech: the gaps between word onsets, in 60 fps frames (2, 5, 3, 4 frames at 30 fps,
 * repeating). Uneven on purpose: a line built on a stagger rule reads typed, a line on speech gaps reads said.
 */
export const SPEECH = [4, 10, 6, 8] as const;
/** The onset of each of `n` words from `start` (absolute frames) on the speech gaps. */
export const speechStarts = (start: number, n: number): number[] => {
  const out = [start];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + f60(SPEECH[(i - 1) % SPEECH.length]));
  return out;
};
/** Appended words cut on 1 frame after the other at this gap (60 fps frames) and rise into place. */
export const APPEND_GAP = 4;

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye.
export const CUE: Record<string, number> = {
  // open: the name drops in as one giant word, a band of the accent running through it; the mark arrives as the next
  // word (the name re-set smaller in one frame) and both glide left; a cut at speed to what it is, built word by word
  giant: bt(0),
  mark: bt(1),
  glide: bt(1.5),
  what: bt(2),
  whatPush: bt(4.5),
  exitWhat: bt(6.5),
  vanish: bt(7.5),
  // pain: the problem in one frame, coming into focus as it drifts, a hold, an ease-in exit the same way, cut at speed
  pain: bt(8),
  exitPain: bt(11),
  // promise: the first half said, the picture opening as a pill after it, the second half appended with a one-frame
  // re-fit inside the push; the pill grows into the frame
  promise: bt(12),
  pill: bt(12.5),
  promise2: bt(13),
  grow: bt(15.5),
  // picture: the picture full bleed under a slow push; the mark pops, the name's letters cascade after it
  picture: bt(16),
  title: bt(17),
  // system: one soft wipe from the right onto the white page; the first half slides in with the mark, the second half
  // appended; a push centred on the mark; the words float off, the mark stays
  wipe: bt(20),
  system: bt(20.5),
  system2: bt(21.25),
  hubPush: bt(22),
  floatOff: bt(23.5),
  // grid: the parts born round the mark by distance, their glyphs a beat later, three labels one a second
  tiles: bt(24),
  glyphs: bt(24.25),
  label1: bt(25),
  label2: bt(26.5),
  label3: bt(28),
  gather: bt(31),
  // end: the mark steps aside, the name sets beside it, the close settles into focus under them and holds
  end: bt(32),
  name: bt(32.5),
  close: bt(34.25),
  lockup: bt(34.75),
  rest: bt(35.5),
  last: bt(36),
};

/** The three labelled parts' frames (one a second). */
export const LABELS = [CUE.label1, CUE.label2, CUE.label3];

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band (lib/look.ts GRAMMAR.shot.band). */
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
/** One surface material per film, or none. */
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
/** How one shot hands over to the next. `hard` is a designed cut; `fadeEnd` only closes a film. */
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
export type Flash = { f: number; frames: 1 | 2; id: string };
export type CameraBlurRange = { from: number; to: number; id: string };
export type EndLock = { from: number; to: number };
export type ColourRange = { from: number; to: number; id: string };
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[]; colour?: ColourRange[] };
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

/** A crisp white-page film: no blur anywhere, type sharp even at speed. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'explainer', oneTake: false, whiteWorld: false };
/**
 * Every seam: speed carried through each cut, the picture that is a word becoming the shot, one soft wipe, the mark
 * that is a word becoming the hub of the grid and then the lockup.
 */
export const SEAMS: Seam[] = [
  { at: CUE.what, kind: 'velocity', carry: 'x', dir: -1, id: 'name-glides-into-what' },
  { at: ACT.pain.from, kind: 'velocity', carry: 'x', dir: 1, id: 'what-leaves-right' },
  { at: ACT.promise.from, kind: 'velocity', carry: 'x', dir: 1, id: 'pain-leaves-right' },
  { at: ACT.picture.from, kind: 'morph', carry: 'scale', signature: true, id: 'picture-word-becomes-the-shot' },
  { at: ACT.system.from, kind: 'wipe', carry: 'x', dir: -1, id: 'the-one-wipe' },
  { at: ACT.grid.from, kind: 'morph', carry: 'shape', id: 'mark-becomes-the-hub' },
  { at: ACT.end.from, kind: 'morph', carry: 'shape', id: 'parts-gather-into-the-mark' },
];
/** The designed one-frame steps: the name re-set as the mark arrives, the promise re-fit as its second half lands. */
export const STEPPED: SteppedRange[] = [
  { from: CUE.mark, to: CUE.mark + 1, id: 'name-reset' },
  { from: CUE.promise2, to: CUE.promise2 + 1, id: 'promise-refit' },
];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events: none. The page stays white; the accent is only on the band, the mark and the parts. */
export const COLOUR: ColourRange[] = [];
/** The one lock: the mark, the name and the close hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** No underdamped spring: every landing settles critically on a white page. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'what', 'picture' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  giant: 'cut', mark: 'hit', glide: 'move', what: 'copy', whatPush: 'move', exitWhat: 'move', vanish: 'move',
  pain: 'copy', exitPain: 'move',
  promise: 'copy', pill: 'hit', promise2: 'copy', grow: 'move',
  picture: 'cut', title: 'hit',
  wipe: 'cut', system: 'copy', system2: 'copy', hubPush: 'life', floatOff: 'move',
  tiles: 'hit', glyphs: 'life', label1: 'hit', label2: 'hit', label3: 'hit', gather: 'move',
  end: 'move', name: 'hit', close: 'copy', lockup: 'hit', rest: 'life', last: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name'; // 'ui': a string the product shows, not budgeted; 'name': the name, not a line of the script
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};

const pace = PACE[PACE_NAME];

/** One line said at the pace of speech: resolved when its last word has faded in, out on its exit cue. */
const said = (id: string, text: string, inF: number, out: number): Copy => {
  const starts = speechStarts(inF, wordCount(text));
  return { id, text, in: inF, resolved: starts[starts.length - 1] + f60(pace.wordDur), out };
};

/**
 * One sentence in two halves with something standing between them (the picture, the mark): the first half said at the
 * pace of speech, the second appended later, each word cut on APPEND_GAP apart. One COPY entry (one sentence for the
 * script rule and the read), with the frame the second half starts.
 */
export const halvesIn = (text: readonly [string, string], inA: number, inB: number) => {
  const a = speechStarts(inA, wordCount(text[0]));
  const n = wordCount(text[1]);
  return { first: a, second: Array.from({ length: n }, (_, i) => inB + f60(APPEND_GAP * i)), resolved: inB + f60(APPEND_GAP * (n - 1)) + f60(12) };
};
const halves = (id: string, text: readonly [string, string], inA: number, inB: number, out: number): Copy => ({ id, text: `${text[0]} ${text[1]}`, in: inA, resolved: halvesIn(text, inA, inB).resolved, out });

// Every on-screen word of the film. The module labels are the product's own strings (UI).
export const COPY: Copy[] = [
  { id: 'name', text: EXPLAIN.name, kind: 'name', in: CUE.giant, resolved: CUE.giant + f60(12), out: CUE.what },
  said('what', EXPLAIN.lines.what, CUE.what, CUE.exitWhat),
  { id: 'pain', text: EXPLAIN.lines.pain, in: CUE.pain, resolved: CUE.pain + f60(10), out: CUE.exitPain, reveal: 'focus' },
  halves('promise', EXPLAIN.lines.promise, CUE.promise, CUE.promise2, CUE.grow),
  { id: 'title', text: EXPLAIN.name, kind: 'name', in: CUE.title, resolved: CUE.title + f60(30), out: ACT.system.from },
  halves('system', EXPLAIN.lines.system, CUE.system, CUE.system2, CUE.floatOff),
  ...EXPLAIN.modules.slice(0, 3).map((m, i): Copy => ({ id: `label${i + 1}`, text: m.label, kind: 'ui', in: LABELS[i], resolved: LABELS[i] + f60(12), out: CUE.gather })),
  { id: 'wordmark', text: EXPLAIN.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(24), out: TOTAL },
  { id: 'close', text: EXPLAIN.lines.close, in: CUE.close, resolved: CUE.close + f60(18), out: TOTAL, reveal: 'focus' },
];

// A line must stay readable for its hold before it leaves: the cues above are set for the template's 2-7 word lines at
// 90 BPM; a longer line or a faster track that cuts a read short fails here, so the timeline is retimed, not the read.
for (const c of COPY) {
  if (c.kind || c.out >= TOTAL) continue;
  const need = f60(holdFor(wordCount(c.text), pace));
  if (c.out - c.resolved < need)
    throw new Error(`timeline: "${c.id}" holds ${c.out - c.resolved} f after it resolves; it needs about ${need} f: move its exit cue a beat later or shorten the line`);
}

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};

/** The fragments of one chain, in order of arrival. */
export const chainOf = (id: string): Copy[] => {
  const list = COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
  if (!list.length) throw new Error(`timeline: no COPY chain "${id}"`);
  return list;
};
