// The single source of truth for time. Picture (src/acts), sound (src/sync.ts -> out/cues.json)
// and QA (scripts/grid-check.ts) all import this file, so a change here moves everything together.
// Think in bars and beats, never in seconds. Keep this file free of React and CSS imports:
// Node scripts load it directly.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track (effects only, or before the
 * track is chosen), and the timeline runs on its own BPM grid below. With a track, scripts/audio/
 * track.py grid writes src/music.ts, BPM becomes the track's and b() follows the music's bars.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites
 * the `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 100;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/**
 * The film's pace (src/lib/pace.ts). calm: text arrives as short fragments that take turns with
 * the picture, held about 1-1.5 s (the default for text-led films, at 90-100 BPM). crisp: the
 * denser launch-film tempo, for briefs that ask for energy (at 120 BPM).
 */
export const PACE_NAME: PaceName = 'calm';

/**
 * Frames per beat. Without a track it must be a whole number (grid-check fails otherwise): 60 fps ->
 * 90, 100, 120, 144, 150 BPM. With a track it is fractional (124 BPM = 29.03 f) and b() rounds.
 */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/**
 * Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat.
 * b(3) is the downbeat of bar 3; b(2, 1, 2) is the "and" of beat 2 in bar 2. With a track (MUSIC
 * set) it is the music's grid from its first downbeat, rounded: a whole frame within 0.5 f of the
 * music. Its fractional twin is bar() in src/music.ts, for the rare place that needs it.
 */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));

/**
 * A choreography length written in 60 fps frames (the unit every number in the cinetic
 * references uses), converted to this film's fps (or to `fps`, for a composition at another
 * rate). Cues come from b(); durations inside a move use f60(), so the film keeps its timing if
 * --fps changes. It rounds (copy timing, Sequence lengths); f60x() is the fractional twin, for
 * durations inside a move, where rounding would bend the curve at 24, 25 or 30 fps.
 */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;

/** After the last bar the picture holds while the audio decays to digital silence. */
export const TAIL = FPS;

// Acts: contiguous, bar-aligned, [from, from + dur). Each act is its own composition in Root.tsx.
export const ACT = {
  statement: { from: b(1), dur: b(4) - b(1) }, // the line builds in two fragments around a picture beat
  mark: { from: b(4), dur: b(6) + TAIL - b(4) }, // the dot becomes the mark; lockup builds to the end
};

export const TOTAL = b(6) + TAIL;

// Named sync points (absolute frames), all on the 16th grid. A cue that must sit off the grid
// carries a trailing `// offgrid: <reason>` comment, which grid-check accepts.
// Picture code reads these; src/sync.ts turns them into sound events.
export const CUE = {
  fragA: b(1), // "Built on" rises into the frame (the camera is already creeping in); then it is read, alone
  drop: b(1, 3), // picture beat, once "Built on" has been read: the dot is born above the line and falls...
  land: b(2), // ...and lands where the line will end: contact, on the downbeat. The line is opening to make room
  fragB: b(2, 0, 2), // "the beat" answers on the off-beat, rising into the opening; the dot is its period
  exit: b(3), // the whole line leaves together, the dot staying behind
  depart: b(3, 1), // the dot sets off for its slot (E.smooth, so its speed peaks half-way)...
  fly: b(3, 2, 2), // ...top speed half-way there, on the grid (the whoosh apex)...
  handoff: b(4), // ...and it arrives at rest in its slot; act 2 opens on exactly this pose
  pieceA: b(4, 1), // the dome lands (contact frame)
  pieceB: b(4, 2), // the block lands (contact frame)
  lockup: b(5), // the mark settles into the lockup and the name locks beside it: the payoff
  end: b(6), // last bar line; TAIL follows
};

// ---- Declarations: what the picture does on purpose -------------------------------------------
// Every export from here to COPY is optional: a timeline without them keeps the 1.1 behaviour.
// With them, grid-check validates them, scripts/export-cues.ts writes them into out/cues.json
// (`look`, `declared`, `salience`), and the blur sampling, forensics and the speed checks treat a
// declared step, flash, seam or camera-blur moment as craft while still failing undeclared pops.
// Frames are absolute film frames, like CUE.

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band and whether a grid-locked edit is allowed (reel, social). */
export type FilmType = 'launch' | 'explainer' | 'reel' | 'social';
/** One surface material per film, or none. */
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
/** How one shot hands over to the next. `hard` is a designed cut; `fadeEnd` only closes a film. */
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
/** A seam at frame `at`: what carries across it (`carry`), its direction, and whether it is the film's signature move. */
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
/** Frames [from, to) animated on a lower cadence (`fps`) or held `on` 2s / 3s: a designed step, not a dropped frame. */
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
/** A designed flash: 1 or 2 frames from `f`. */
export type Flash = { f: number; frames: 1 | 2; id: string };
/** Frames [from, to) rendered with camera blur inside a crisp film (a flick, a whip). */
export type CameraBlurRange = { from: number; to: number; id: string };
/** The film's one end lock: frames [from, to), 1-5 s. */
export type EndLock = { from: number; to: number };
/**
 * What one primitive instance does on purpose, from its own props: every fx exports
 * `declares(props, film): Declares`. src/sync.ts `declares()` lists them for the instances the acts
 * use; export-cues writes them under `declared.fx`, and grid-check fails when the timeline's own
 * declarations below do not cover them.
 */
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[] };
/**
 * What a CUE asks of the eye. read-quiet guards `copy`, `hit` and `cut` (and fast moves over the
 * text being read); `life` (creep, light, drift, a carried decay) and camera moves away from the
 * text may run during a read and count toward the picture's density. A CUE without one is `hit`.
 */
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam of the film. Designed cuts are seams of kind `hard`. */
export const SEAMS: Seam[] = [
  // the dot arrives at rest in its slot and act 2 opens on exactly that pose: the dot becomes the mark
  { at: ACT.mark.from, kind: 'morph', carry: 'shape', id: 'dot-becomes-mark' },
];
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** The one lock: the name holds beside the mark to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal (its stop-down or dip ends here): the lockup. */
export const REVEAL = CUE.lockup;
/** The one element class allowed an underdamped spring: the mark's pieces landing. */
export const SPRING_CLASS = 'mark-piece';
/** CUE names that must land on a music event (a downbeat attack, an entry, a stop's end, the ending). None without a track. */
export const STRUCTURAL: (keyof typeof CUE)[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Partial<Record<keyof typeof CUE, Salience>> = {
  fragA: 'copy', drop: 'move', land: 'hit', fragB: 'copy', exit: 'copy', depart: 'move', fly: 'move',
  handoff: 'cut', pieceA: 'hit', pieceB: 'hit', lockup: 'hit', end: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui'; // 'ui': a string the product shows (a typed command, code, a URL, an app label); not budgeted
  chain?: string; // the thought this fragment belongs to (fx/Chain renders a chain; grid-check checks its gaps)
  mode?: 'build' | 'replace'; // build: fragments append to one held line; replace: each takes the last one's place
};

const pace = PACE[PACE_NAME];

/**
 * One line of copy revealed word by word with this film's pace (the numbers <Words> uses), so
 * `resolved` is the frame its last word is fully in. `out` defaults to the pace's hold.
 */
export const line = (id: string, text: string, inF: number, out?: number): Copy => {
  const n = wordCount(text);
  const resolved = inF + f60(revealFor(n, pace));
  return { id, text, in: inF, resolved, out: out ?? resolved + f60(holdFor(n, pace)) };
};

/**
 * One thought as a chain of fragments, one COPY entry each (`<id>.1`, `<id>.2`, ...), rendered by
 * fx/Chain. A thought longer than 4 words arrives this way: 1-4 words per fragment, never a whole
 * sentence at once, with a picture beat between fragments (the product does what the fragment set
 * up). Give each fragment its first frame; `resolved` follows from the pace.
 *   build    fragments append to one held line, which re-centres; the line clears as a whole, at
 *            `out` (default: the last fragment's resolve plus the hold of the full line)
 *   replace  each fragment leaves (as a whole, over pace.exitDur: 24 f when calm) and has gone
 *            6 f before the next one rises in its place, so two fragments never share the spot;
 *            the last one leaves at `out` (default: its resolve plus its hold)
 * grid-check checks the result: every fragment is read before the next arrives, the picture beat
 * between them, the words on screen at once and the copy rate.
 */
export const chain = (id: string, mode: 'build' | 'replace', fragments: [text: string, inF: number][], o: { out?: number } = {}): Copy[] => {
  const base = fragments.map(([text, inF], i) => ({ id: `${id}.${i + 1}`, text, in: inF, resolved: inF + f60(revealFor(wordCount(text), pace)), chain: id, mode }));
  const last = base[base.length - 1];
  if (!last) throw new Error(`timeline: chain "${id}" has no fragments`);
  const words = (list: { text: string }[]) => list.reduce((n, c) => n + wordCount(c.text), 0);
  if (mode === 'build') {
    const out = o.out ?? last.resolved + f60(holdFor(words(base), pace));
    return base.map((c) => ({ ...c, out }));
  }
  // replace: the outgoing fragment's exit (exitDur) is over 6 f before the next one starts to rise
  const leave = f60(pace.exitDur) + f60(6);
  return base.map((c, i) => ({ ...c, out: base[i + 1] ? base[i + 1].in - leave : (o.out ?? c.resolved + f60(holdFor(wordCount(c.text), pace))) }));
};

// Every on-screen word: the word budget (kind: 'ui' entries are counted apart), the hold check,
// and the text-flow checks (fragments, words on screen at once, copy rate, text share) read this.
export const COPY: Copy[] = [
  // "Built on" (read alone) -> the dot falls and lands where the line will end -> "the beat". The dot is the period.
  ...chain('statement', 'build', [['Built on', CUE.fragA], ['the beat', CUE.fragB]], { out: CUE.exit }),
  // cinetic:placeholder - the demo's invented name: use the product's, then delete this line.
  { id: 'wordmark', text: 'plinth', in: CUE.lockup - f60(34), resolved: CUE.lockup, out: TOTAL },
];

/**
 * When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts
 * readingWindows(): from `resolved` for at most readMax, an earlier fragment of a build chain only
 * for its own hold, then the whole line again). The one rule every check uses: export-cues.ts
 * writes it into out/cues.json, and grid-check, layout-audit, measure-speed and forensics read it.
 * Nothing new should start inside a window: the read happens in the quiet.
 */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id; acts read their text and timing from here so the budget stays true. */
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
