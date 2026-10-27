// The single source of truth for time, for a prompt-to-result demo: one object through many states. A pill holding
// what the product is among the tools it connects; on the kick the tools fly off and the label swaps; a wind-up opens an
// iris onto a colour field where the request box pushes in and the request types; a punch-in to the box, the pointer
// clicks send; a whip up into the run (the request as a bubble, the steps ticking in); the result; the lockup. Picture
// (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts live
// in src/run.ts. Think in beats, never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { RUN } from './run';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. A demo is cut to its track: choose it first.
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
/** The film's pace (src/lib/pace.ts): the crisp launch tempo. */
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
 * Where each act starts, in beats (9 bars at 120 BPM: 19 s with the tail). Every act line sits on a bar line, so with a
 * track in each one lands on a downbeat (grid-check structural-on-music): the 2-bar pill, the 2-bar request, the 1-bar
 * click, the 2-bar run, the 1-bar result and the 1-bar lockup. Retime in whole bars.
 */
export const BEATS = { pill: 0, ask: 8, click: 16, run: 20, done: 28, end: 32, last: 36 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['pill', 'ask', 'click', 'run', 'done', 'end'] as const;
export type ActName = (typeof order)[number];
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;

export const TOTAL = bt(BEATS.last) + TAIL;

/** A line inked by a front crossing it (fx/HueSweep frontFill): at least this many 60 fps frames, 8 a word (each word read). */
export const INK_FRONT = 22;
export const inkFrames = (text: string) => Math.max(INK_FRONT, 8 * (wordCount(text) - 1) + 4);
/** The request's typing: a fast wide-shot rate, a burst of characters on one frame, a slower close-up rate (cps). */
export const TYPING = { wide: 84, burstAt: 0.45, burst: 10, close: 36 } as const;

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye.
export const CUE: Record<string, number> = {
  // pill: the label among the tools; on the kick the tools fly off along their own vectors, the label swaps and inks,
  // the rim starts to turn; a wind-up widens the pill into the iris
  pill: bt(0),
  what: bt(0.25),
  kick: bt(4),
  windup: bt(7.5),
  // ask: the iris opens big onto a colour field; the request box pushes in while its width unfolds; the line over it
  // inks; the request types fast with a burst; the field fades to the stage; a hard punch-in on the act line
  iris: bt(8),
  tell: bt(9),
  type: bt(9.5),
  fieldOut: bt(10),
  burst: bt(11.5),
  creep: bt(13),
  settle: bt(14.5),
  // click: the close-up breathes back; the typing slows; the pointer glides in, clicks, the send button swells; the
  // pointer spins out; an ease-in whip up into the cut
  close: bt(16),
  cursor: bt(16.75),
  press: bt(18),
  away: bt(18.5),
  whip: bt(19.5),
  // run: the request rises as a bubble, the status line, the steps ticking in, the last one still running
  bubble: bt(20),
  status: bt(20.75),
  step1: bt(21.5),
  step2: bt(22.5),
  step3: bt(23.5),
  step4: bt(24.5),
  checked: bt(26),
  pending: bt(27),
  // done: the run steps back and the result card rises; the line over it
  done: bt(28),
  doneLine: bt(28.5),
  // end: the lockup, the close
  end: bt(32),
  name: bt(32.25),
  closeLine: bt(34.25),
  lockup: bt(34.5),
  last: bt(36),
};

/** The step rows' onsets (one per step in run.ts, 4 cues at most). */
export const STEPS = [CUE.step1, CUE.step2, CUE.step3, CUE.step4];

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

/** A crisp film: the whip and the punch-in smear through fx/Defocus (DirBlur, blurBridge), no shutter pass. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** One object through many states: the pill becomes the iris, the box is punched into, a whip up into the run, the run becomes the result. */
export const SEAMS: Seam[] = [
  { at: CUE.kick, kind: 'stepped', id: 'label-swaps-on-the-kick' },
  { at: ACT.ask.from, kind: 'mask', carry: 'scale', signature: true, id: 'pill-opens-the-iris' },
  { at: ACT.click.from, kind: 'snapZoom', carry: 'scale', id: 'punch-in-with-a-blur-bridge' },
  { at: ACT.run.from, kind: 'whip', carry: 'y', dir: -1, id: 'whip-up-into-the-run' },
  { at: ACT.done.from, kind: 'morph', carry: 'shape', id: 'run-becomes-the-result' },
  { at: ACT.end.from, kind: 'defocus', id: 'result-to-lockup' },
];
/** The designed steps: the label swapping on the kick. */
export const STEPPED: SteppedRange[] = [{ from: CUE.kick, to: CUE.kick + 1, id: 'label-swap' }];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** The one colour event: the field behind the iris, in the accent's hue, under a second. */
export const COLOUR: ColourRange[] = [{ from: CUE.iris, to: CUE.fieldOut + f60(18), id: 'field-behind-the-iris' }];
/** The one lock: the mark, the name and the close hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** No underdamped spring: the click swells and settles critically. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'kick', 'iris', 'press' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  pill: 'cut', what: 'copy', kick: 'hit', windup: 'move',
  iris: 'cut', tell: 'copy', type: 'life', fieldOut: 'move', burst: 'hit', creep: 'life', settle: 'life',
  close: 'cut', cursor: 'move', press: 'hit', away: 'move', whip: 'move',
  bubble: 'cut', status: 'life', step1: 'hit', step2: 'hit', step3: 'hit', step4: 'hit', checked: 'hit', pending: 'life',
  done: 'cut', doneLine: 'copy',
  end: 'cut', name: 'hit', closeLine: 'copy', lockup: 'hit', last: 'cut',
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

/** A line inked by a front: resolved when the front has crossed it. */
const inked = (id: string, text: string, inF: number, out: number, o: Partial<Copy> = {}): Copy => ({ id, text, in: inF, resolved: inF + f60(inkFrames(text)), out, ...o });

// Every on-screen word of the film. The request, the model, the status, the steps and the result are the product's
// own strings (UI).
export const COPY: Copy[] = [
  inked('what', RUN.lines.what, CUE.what, CUE.kick),
  inked('ask', RUN.lines.ask, CUE.kick, ACT.ask.from, { swap: 'what' }),
  inked('tell', RUN.lines.tell, CUE.tell, ACT.click.from),
  { id: 'request', text: RUN.request, kind: 'ui', in: CUE.type, resolved: CUE.press, out: ACT.done.from },
  { id: 'status', text: RUN.status, kind: 'ui', in: CUE.status, resolved: CUE.status + f60(10), out: ACT.done.from },
  ...RUN.steps.map((s, i): Copy => ({ id: `step${i + 1}`, text: `${s.verb} ${s.detail}`, kind: 'ui', in: STEPS[i], resolved: STEPS[i] + f60(20), out: ACT.done.from })),
  { id: 'result', text: `${RUN.result.title} ${RUN.result.body}`, kind: 'ui', in: CUE.done, resolved: CUE.done + f60(16), out: ACT.end.from },
  inked('done', RUN.lines.done, CUE.doneLine, ACT.end.from),
  { id: 'wordmark', text: RUN.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(14), out: TOTAL },
  { id: 'close', text: RUN.lines.close, in: CUE.closeLine, resolved: CUE.closeLine + f60(12), out: TOTAL, reveal: 'focus' },
];

// A line must stay readable for its hold before it leaves: a longer line or a faster track that cuts a read short
// fails here, so the timeline is retimed, not the read.
for (const c of COPY) {
  if (c.kind || c.out >= TOTAL) continue;
  const need = f60(holdFor(wordCount(c.text), pace));
  if (c.out - c.resolved < need)
    throw new Error(`timeline: "${c.id}" holds ${c.out - c.resolved} f after it resolves; it needs about ${need} f: move its exit cue a beat later or shorten the line`);
}
if (RUN.steps.length > STEPS.length) throw new Error('timeline: one STEPS cue per step (add cues for a fifth step)');

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
