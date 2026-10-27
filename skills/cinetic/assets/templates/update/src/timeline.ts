// The single source of truth for time, for an update film ("vX is out"): a hook on the version, one act
// per change (each a product moment), the payoff and the end card with the version. Picture (src/acts),
// sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts
// live in src/update.ts; this file only places them on the grid. Think in bars and beats, never in
// seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { UPDATE } from './update';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own
 * BPM grid below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the
 * track's and b() follows the music's bars. An update film is music-led: choose the track first.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites
 * the `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The film's pace (src/lib/pace.ts): an update film is short and runs at the crisp launch tempo. */
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

/** After the last bar the picture holds while the audio decays to digital silence. */
export const TAIL = FPS;

/** How many changes the film shows (2-4, from src/update.ts). */
export const N = UPDATE.changes.length;
/** Absolute frame of the n-th beat from the film's first downbeat (sub = 16ths): a whole frame on the grid. */
export const beat = (n: number, sub = 0) => b(1 + Math.floor(n / 4), n % 4, sub);
/** The end card's beats: one bar, so every act line is a bar line (with a track, a downbeat); the tail holds it. */
const END_BEATS = 4;
/**
 * Where each part starts, in beats: the hook is one bar, each change two bars (the product moment, then its words read
 * in the quiet), the payoff one bar, the end card one bar, then the tail. Every act line sits on a bar line, so with a
 * track in each lands on a downbeat (grid-check structural-on-music).
 */
export const BEATS = { hook: 0, change: (i: number) => 4 + 8 * i, payoff: 4 + 8 * N, end: 8 + 8 * N, last: 8 + 8 * N + END_BEATS } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). Every change
// starts on a bar line; its hit and its words land off the downbeat, so the cuts inside it stay off a metronome.
export const ACT: Record<string, { from: number; dur: number }> = {
  hook: { from: 0, dur: beat(BEATS.change(0)) }, // the version is the set; its last numeral rolls on (frame 0 on: with a track, beat 0 is its first downbeat)
  ...Object.fromEntries(UPDATE.changes.map((_c, i) => [`change${i + 1}`, { from: beat(BEATS.change(i)), dur: beat(BEATS.change(i + 1)) - beat(BEATS.change(i)) }])),
  payoff: { from: beat(BEATS.payoff), dur: beat(BEATS.end) - beat(BEATS.payoff) }, // the camera pulls back; the version returns in front of every change
  end: { from: beat(BEATS.end), dur: beat(BEATS.last) + TAIL - beat(BEATS.end) }, // the mark and the name set beside the version; the lock holds
};

export const TOTAL = beat(BEATS.last) + TAIL;

/** The act of change i (0-based). */
export const changeAct = (i: number) => ACT[`change${i + 1}`];

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns
// them into sound events. Per change i: c<i> the act seam (the camera's peak speed), hit<i> the product
// doing the new thing (its contact frame), say<i> the sentence that says it rising in, life<i> the product
// still living under the read (a counter, a cursor, a list settling: no new event for the eye).
export const CUE: Record<string, number> = {
  roll: beat(0, 2), // the version's last numeral rolls from the old value to the new one
  ...Object.fromEntries(
    UPDATE.changes.flatMap((_c, i) => [
      [`c${i}`, beat(BEATS.change(i))],
      [`hit${i}`, beat(BEATS.change(i) + 1, 1)],
      [`say${i}`, beat(BEATS.change(i) + 2)],
      [`life${i}`, beat(BEATS.change(i) + 5)],
    ]),
  ),
  gather: beat(BEATS.payoff), // the pull back begins: every change at once, the version swinging back in front
  swing: beat(BEATS.payoff + 1), // the version swings into the frame as the strip finishes softening
  land: beat(BEATS.payoff + 2), // the version lands as the subject, on the beat
  lockup: beat(BEATS.end + 1), // the mark and the name are set: the payoff of the end card
  light: beat(BEATS.end + 2), // the key passes across the version behind the name (the end card's light event)
  glint: beat(BEATS.end + 2, 3), // the mark's last part catches the key
  rest: beat(BEATS.end + 3, 2), // the slow push reaches the name: the lock keeps living
  end: beat(BEATS.last), // last bar line; TAIL follows
};

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band (lib/look.ts GRAMMAR.shot.band; grammar-score --format update reads the update band). */
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

/** One camera carries the whole film along one strip (no hard cut): a one-take film. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: true, whiteWorld: false };
/** Every seam: the camera is at its fastest on each act line, so speed carries across every one. */
export const SEAMS: Seam[] = [
  ...UPDATE.changes.map((c, i): Seam => ({ at: beat(BEATS.change(i)), kind: i ? 'whip' : 'velocity', carry: 'x', dir: 1, id: `to-${c.id}` })),
  { at: beat(BEATS.payoff), kind: 'velocity', carry: 'scale', dir: -1, id: 'pull-back' },
  { at: beat(BEATS.end), kind: 'velocity', carry: 'x', dir: 1, id: 'make-room' },
];
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events (a deep field, an accent flood, a colour cut, up to 2 s each): written to cues declared.colour. */
export const COLOUR: ColourRange[] = [];
/** The one lock: the version, the mark and the name hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** The one element class allowed an underdamped spring: the version landing in front. */
export const SPRING_CLASS = 'version-land';
/** CUE names that must land on a music event. None without a track; with one, add 'gather' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  roll: 'hit',
  ...Object.fromEntries(UPDATE.changes.flatMap((_c, i) => [[`c${i}`, 'cut' as Salience], [`hit${i}`, 'hit' as Salience], [`say${i}`, 'copy' as Salience], [`life${i}`, 'life' as Salience]])),
  gather: 'move', swing: 'move', land: 'hit', lockup: 'hit', light: 'life', glint: 'life', rest: 'life', end: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name'; // 'ui': a string the product shows, not budgeted; 'name': the name or the version, not a line of the script
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus'; // the phrase comes into focus whole (fx/FocusWord): grid-check reads its hold, not a per-word rate
  swap?: string | boolean; // a deliberate swap: this line takes the named line's place in one move
};

const pace = PACE[PACE_NAME];

/** How the words of a line or fragment arrive, as fx/Chain draws them with the same `ink`. */
export type Ink = 'reveal' | 'pop' | 'partial';
/**
 * Frames from a fragment's first frame to every word in: the pace's reveal, or for a line cut on ('pop')
 * the frame after its last word's start, or part-inked ('partial') that start plus the 10 f ink, so a
 * caption the act cuts on is not held as long as a calm reveal.
 */
const revealSpan = (n: number, ink: Ink = 'reveal'): number => {
  const last = (Math.max(0, n - 1) * pace.stagger * FPS) / 60;
  return ink === 'pop' ? Math.floor(last) + 1 : ink === 'partial' ? Math.ceil(last + (10 * FPS) / 60) : f60(revealFor(n, pace));
};

/** One line of copy revealed word by word with this film's pace; `out` defaults to the pace's hold. */
export const line = (id: string, text: string, inF: number, out?: number, o: { ink?: Ink } = {}): Copy => {
  const n = wordCount(text);
  const resolved = inF + revealSpan(n, o.ink);
  return { id, text, in: inF, resolved, out: out ?? resolved + f60(holdFor(n, pace)) };
};

/** How long the version's last numeral takes to roll (60 fps frames). */
export const ROLL = 26;
/** Frames before the next act line at which a change's words leave (they launch into the camera move). */
export const SAY_OUT = 16;

// Every on-screen word. The name and the version open the film ("[Name] [version]": a stranger knows which product
// by 3 s), the version is the set (giant numerals), each change one short sentence (2-6 words) that says the result
// the picture just showed, one line at a time, then the version again and the name.
export const COPY: Copy[] = [
  { ...line('product', UPDATE.name, 0, beat(BEATS.change(0)) - f60(SAY_OUT)), kind: 'name' },
  { id: 'from', text: UPDATE.from, kind: 'ui', in: 0, resolved: 0, out: CUE.roll },
  { id: 'version', text: UPDATE.version, kind: 'name', in: CUE.roll, resolved: CUE.roll + f60(ROLL), out: beat(BEATS.change(0)) - f60(SAY_OUT) },
  ...UPDATE.changes.map((c, i) => line(`change${i + 1}`, c.words, CUE[`say${i}`], beat(BEATS.change(i + 1)) - f60(SAY_OUT))),
  { id: 'release', text: UPDATE.version, in: CUE.gather + f60(6), resolved: CUE.land, out: TOTAL },
  { id: 'wordmark', text: UPDATE.name, in: CUE.lockup - f60(30), resolved: CUE.lockup, out: TOTAL },
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
