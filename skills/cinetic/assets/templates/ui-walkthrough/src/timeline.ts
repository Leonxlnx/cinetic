// The single source of truth for time, for a UI walkthrough: a promise, the user's input as one object that becomes
// the output in place, proof piling up, a speed claim, then the product's own flow in steps (the input goes in,
// the product reads, finds what matters, the user picks, it builds), the output live and the end card. Picture
// (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts
// live in src/walk.ts; this file only places them on the grid. Think in beats, never in seconds. Keep it free of
// React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { WALK } from './walk';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. Choose the track first: a walkthrough is cut to it.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites the
 * `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The film's pace (src/lib/pace.ts): a walkthrough of a fast product runs at the crisp launch tempo. */
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

/** The promise's words arrive this far apart (60 fps frames: the crisp word gap); its last word snaps the line larger. */
export const PROMISE_GAP = 8;

/** After the last bar the picture holds while the audio decays to digital silence. */
export const TAIL = FPS;

/**
 * Where each act starts, in beats (18 bars at 120 BPM: 37 s with the tail). Every act line sits on a bar line, so with
 * a track in each one lands on a downbeat (grid-check structural-on-music): a 1-bar promise, the object's 3-bar
 * transformation, a 1-bar proof, a 2-bar claim, then one 2-bar act per step of the flow, the 1-bar output and the
 * 2-bar end card. The shape, not the numbers, is the template: move a step's length with its content, in whole bars.
 */
export const BEATS = { open: 0, card: 4, proof: 16, claim: 20, field: 28, feed: 36, insight: 44, pick: 52, page: 60, end: 64, last: 72 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['open', 'card', 'proof', 'claim', 'field', 'feed', 'insight', 'pick', 'page', 'end'] as const;
export type ActName = (typeof order)[number];
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;

export const TOTAL = bt(BEATS.last) + TAIL;

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye.
export const CUE: Record<string, number> = {
  // open: the promise, word by word; the last word snaps the line larger; the line launches up into the cut
  line: bt(0),
  snap: bt(0) + f60(PROMISE_GAP * (wordCount(WALK.lines.promise) - 1)), // offgrid: the last word snaps on its own reveal frame, a word gap after the one before

  exitOpen: bt(3.25),
  // card: the input rises as a tilted card while the ground turns to the stage; a hidden cut swaps it for the output
  rise: bt(4),
  creep: bt(5),
  turn: bt(6),
  zoomIn: bt(7),
  jump: bt(7.5), // the one jump frame of the hidden cut: scale, tilt and a tinted swell hide the swap
  swap: bt(7.75), // the output's title types on in the same card
  sub: bt(8.25),
  row1: bt(9),
  punch1: bt(10),
  row2: bt(10.25),
  done1: bt(10.5),
  row3: bt(11.5),
  done2: bt(11.75),
  punch2: bt(12.5),
  done3: bt(13),
  hold: bt(14.25),
  outCard: bt(15.25),
  // proof: notices pile up, faster and faster
  proof: bt(16),
  toast0: bt(16.25),
  toast1: bt(17.25),
  toast2: bt(18),
  toast3: bt(18.5),
  toast4: bt(18.75),
  wipe: bt(19.75),
  // claim: the first word giant, then the line; a push that accelerates into the cut
  claim: bt(20),
  claimSnap: bt(20.5),
  push: bt(22.25),
  claimLight: bt(23.75), // the key swells once across the claim while it is read
  pushOut: bt(26.25),
  exitClaim: bt(27.5),
  // field (step one): the field, its placeholder erased, the value typed, the hand presses, the results develop
  field: bt(28),
  step1: bt(28.25),
  erase: bt(29.5),
  typeIn: bt(30.5),
  cursor: bt(31),
  step1Out: bt(32.25),
  press: bt(32.5),
  busy: bt(32.75),
  develop: bt(33.25),
  pullBack: bt(34.25),
  whipUp: bt(35.5),
  // feed (step two): the product reads every item, a counter climbing; the flick lands on the one that matters
  feed: bt(36),
  count: bt(36.25),
  flick: bt(37),
  rows: bt(38.25),
  peak: bt(39.25),
  brake: bt(40.25),
  slow: bt(41),
  land: bt(42),
  total: bt(42.5),
  lift: bt(43),
  morph: bt(43.5),
  // insight: the item collapses into a pill; the count chip; the line says what was found
  insight: bt(44),
  say4: bt(44.75),
  chip: bt(47.75), // the count chip pops once the line is in: its proof
  glow: bt(50.25), // the key swells once before the whip
  exitInsight: bt(51.5),
  whipLeft: bt(51.75),
  // pick (step three): the options arrive, one is chosen, it becomes the progress pill and the output builds
  pick: bt(52),
  options: bt(52.25),
  say5: bt(53),
  select: bt(55.5),
  chosen: bt(56),
  exitPick: bt(57.25),
  toPill: bt(57.5),
  build: bt(58),
  pct: bt(59),
  // page: the output, live, flies in over the build, flattens, its picture develops, it scrolls
  page: bt(60),
  pageLand: bt(60.75),
  art: bt(61),
  scroll: bt(62),
  sections: bt(62.75),
  recede: bt(63.25),
  // end: the mark assembles, the name is set, the payoff line rises beside it; the lock lives on the key
  end: bt(64),
  mark: bt(64.5),
  lockup: bt(65.5),
  payoff: bt(67),
  light: bt(67.5),
  rest: bt(69.5),
  last: bt(72),
};

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

/** A crisp film: the feed's flick smears through fx/Defocus DirBlur, no shutter pass. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'explainer', oneTake: false, whiteWorld: false };
/**
 * Every seam: speed carried through each act line, scale hidden inside one-frame jumps, the content morphing from
 * one container into the next. Exits ease in and cut on their fastest frame; the next shot opens moving the same way.
 */
export const SEAMS: Seam[] = [
  { at: ACT.card.from, kind: 'velocity', carry: 'y', dir: -1, id: 'promise-launches-up' },
  { at: CUE.jump, kind: 'snapZoom', carry: 'scale', dir: -1, signature: true, id: 'input-becomes-output' },
  { at: CUE.punch1, kind: 'snapZoom', carry: 'scale', id: 'punch-row-1' },
  { at: CUE.punch2, kind: 'snapZoom', carry: 'scale', id: 'punch-row-3' },
  { at: ACT.proof.from, kind: 'defocus', carry: 'scale', id: 'blur-snap-into-proof' },
  { at: ACT.claim.from, kind: 'wipe', carry: 'y', dir: -1, id: 'wipe-up' },
  { at: CUE.claimSnap, kind: 'snapZoom', carry: 'scale', dir: -1, id: 'claim-opens' },
  { at: ACT.field.from, kind: 'velocity', carry: 'scale', id: 'push-across' },
  { at: ACT.feed.from, kind: 'velocity', carry: 'y', dir: -1, id: 'whip-up' },
  { at: ACT.insight.from, kind: 'morph', carry: 'shape', id: 'item-to-pill' },
  { at: ACT.pick.from, kind: 'whip', carry: 'x', dir: -1, id: 'whip-left' },
  { at: CUE.toPill, kind: 'morph', carry: 'shape', id: 'row-to-pill' },
  { at: ACT.page.from, kind: 'mask', carry: 'y', dir: -1, id: 'page-flies-over' },
  { at: ACT.end.from, kind: 'defocus', id: 'page-to-lockup' },
];
/** The designed one-frame steps: the promise's snap, the hidden cut's jump, the claim's snap. */
export const STEPPED: SteppedRange[] = [
  { from: CUE.snap, to: CUE.snap + 1, id: 'promise-snap' },
  { from: CUE.jump, to: CUE.jump + 1, id: 'hidden-cut' },
  { from: CUE.claimSnap, to: CUE.claimSnap + 1, id: 'claim-snap' },
];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events (a deep field, an accent flood, a colour cut, up to 2 s each): none; the accent stays on what matters. */
export const COLOUR: ColourRange[] = [];
/** The one lock: the mark, the name and the payoff line hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** The one element class allowed an underdamped spring: the chosen row landing in its ring. */
export const SPRING_CLASS = 'chosen-row';
/** CUE names that must land on a music event. None without a track; with one, add 'rise', 'feed' and 'end' (downbeats). */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  line: 'copy', snap: 'hit', exitOpen: 'copy',
  rise: 'cut', creep: 'life', turn: 'life', zoomIn: 'move', jump: 'cut', swap: 'hit', sub: 'move', row1: 'hit', punch1: 'cut', row2: 'hit', done1: 'hit', row3: 'hit', done2: 'hit', punch2: 'cut', done3: 'hit', hold: 'life', outCard: 'move',
  proof: 'cut', toast0: 'hit', toast1: 'hit', toast2: 'hit', toast3: 'hit', toast4: 'hit', wipe: 'move',
  claim: 'cut', claimSnap: 'cut', push: 'move', claimLight: 'life', pushOut: 'move', exitClaim: 'copy',
  field: 'cut', step1: 'copy', erase: 'hit', typeIn: 'hit', cursor: 'move', step1Out: 'copy', press: 'hit', busy: 'hit', develop: 'hit', pullBack: 'move', whipUp: 'move',
  feed: 'cut', count: 'life', flick: 'move', rows: 'life', peak: 'move', brake: 'life', slow: 'life', land: 'hit', total: 'hit', lift: 'move', morph: 'move',
  insight: 'cut', say4: 'copy', chip: 'hit', glow: 'life', exitInsight: 'copy', whipLeft: 'move',
  pick: 'cut', options: 'hit', say5: 'copy', select: 'move', chosen: 'hit', exitPick: 'copy', toPill: 'move', build: 'hit', pct: 'life',
  page: 'cut', pageLand: 'hit', art: 'hit', scroll: 'move', sections: 'life', recede: 'move',
  end: 'cut', mark: 'hit', lockup: 'hit', payoff: 'copy', light: 'life', rest: 'life', last: 'cut',
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

/** How the words of a line arrive: the pace's reveal, or cut on ('pop'), or part-inked ('partial'). */
export type Ink = 'reveal' | 'pop' | 'partial';
const revealSpan = (n: number, ink: Ink = 'reveal'): number => {
  const last = (Math.max(0, n - 1) * pace.stagger * FPS) / 60;
  return ink === 'pop' ? Math.floor(last) + 1 : ink === 'partial' ? Math.ceil(last + (10 * FPS) / 60) : f60(revealFor(n, pace));
};

/**
 * One line of copy revealed word by word with this film's pace; `out` defaults to the pace's hold, and a cue placed
 * in beats never cuts that hold short: at a faster track the beats shrink, so the line leaves on its read instead.
 */
export const line = (id: string, text: string, inF: number, out?: number, o: { ink?: Ink } = {}): Copy => {
  const n = wordCount(text);
  const resolved = inF + revealSpan(n, o.ink);
  const read = resolved + f60(holdFor(n, pace));
  return { id, text, in: inF, resolved, out: Math.max(out ?? read, read) };
};

/** The claim's words after its giant first one arrive this far apart (60 fps frames), from the snap. */
export const CLAIM_GAP = 8;
/** Each claim word's first frame (acts/Claim.tsx draws them on these): the giant first word a second before the act, word i a gap x i after the snap. */
export const CLAIM_STARTS = Array.from({ length: wordCount(WALK.lines.claim) }, (_, i) => (i === 0 ? CUE.claim - f60(60) : CUE.claimSnap + f60(CLAIM_GAP * i)));

// Every on-screen word of the film. The product's own strings (walk.ts) are UI, drawn by the kit, not budgeted.
export const COPY: Copy[] = [
  line('promise', WALK.lines.promise, CUE.line, CUE.exitOpen, { ink: 'pop' }),
  { id: 'claim', text: WALK.lines.claim, in: CUE.claim, resolved: CLAIM_STARTS[CLAIM_STARTS.length - 1] + f60(pace.wordDur), out: CUE.exitClaim },
  line('step1', WALK.lines.step1, CUE.step1, CUE.step1Out),
  line('insight', WALK.lines.insight, CUE.say4, CUE.exitInsight),
  line('pick', WALK.lines.pick, CUE.say5, CUE.exitPick),
  { ...line('payoff', WALK.lines.payoff, CUE.payoff), out: TOTAL },
  { id: 'wordmark', text: WALK.name, kind: 'name', in: CUE.mark, resolved: CUE.lockup, out: TOTAL },
];

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};

/** The fragments of one chain, in order of arrival (kept for the starter's helpers). */
export const chainOf = (id: string): Copy[] => {
  const list = COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
  if (!list.length) throw new Error(`timeline: no COPY chain "${id}"`);
  return list;
};
