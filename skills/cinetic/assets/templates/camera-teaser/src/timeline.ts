// The single source of truth for time, for a camera-led teaser on a dark stage: every shot is one layout under one
// camera path (lib/camera camPath), the moves chained with no hold. The request box rising, a whip with one flash
// frame, its close-up and the send button launching, the app window streaming code under a zoom-out whip and a 3D push,
// cards landing and fanning, the page it made with a modal toast, the product's stages rolling in corner brackets, two
// comets meeting on the end mark. Picture (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts)
// all import this file. The facts live in src/teaser.ts. Think in beats, never in seconds. Keep it free of React and CSS
// imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { TEASER } from './teaser';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. A teaser is cut to its track's hits: choose it first.
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
 * Where each act starts, in beats (10 bars at 120 BPM: 21 s with the tail). Every act line sits on a bar line, so with
 * a track in each one lands on a downbeat (grid-check structural-on-music): the 2-bar request box, the 1-bar
 * close-up, the 2-bar window, the 1-bar cards, the 2-bar page and its modal, the 1-bar stages and the 1-bar end.
 * Retime in whole bars.
 */
export const BEATS = { input: 0, launch: 8, window: 12, cards: 20, page: 24, stages: 32, end: 36, last: 40 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['input', 'launch', 'window', 'cards', 'page', 'stages', 'end'] as const;
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
  // input: the box rises with an expo tail, focus trailing position; a rim light sweeps; the line over it; the typing;
  // a whip left, a whip right into the cut with one flash frame
  rise: bt(0),
  what: bt(0.5),
  sweep: bt(1),
  type: bt(3.5),
  whipL: bt(6),
  whipR: bt(7.25),
  // launch: the close-up slides in at x2.3 and pulls back x0.65 on the frame the slide settles; a slow push; the send
  // button launches up and right on a J-curve and leaves the frame
  slide: bt(8),
  pull: bt(8.5),
  push: bt(9),
  fly: bt(10.5),
  // window: the app window rises with an expo tail; the code streams; a zoom-out whip into a blur peak, a 3D push on
  // the frame it settles, a whip out into the cut
  window: bt(12),
  build: bt(12.5),
  stream: bt(13),
  zoomOut: bt(16),
  push3d: bt(16.5),
  settle3d: bt(17.75),
  drift3d: bt(18.75),
  whipOut: bt(19.5),
  // cards: a card lands by shrinking, two more fan out from behind it, they collapse and leave up
  cards: bt(20),
  connect: bt(20),
  fan: bt(21),
  collapse: bt(22.5),
  cardsOut: bt(23.5),
  // page: the title's letters swing in, the main card rises, the camera pulls back, the siblings slide in; the page dims
  // and blurs under a push, the toast pops at its midpoint; a pull-out to black
  page: bt(24),
  sib1: bt(25.25),
  sib2: bt(26.5),
  dim: bt(28.5),
  toast: bt(28.5) + f60(21), // offgrid: the toast pops at the modal push's midpoint (lib/camera-moves MODAL.push60 / 2)
  blackout: bt(31.5),
  // stages: the first word decodes in corner brackets, rolls to the second under a zoom in, to the third receding
  stage1: bt(32),
  stage2: bt(33.5),
  stage3: bt(35),
  // end: two comets spiral out and in; on their meeting the mark spins in; the name, the close
  comets: bt(36),
  mark: bt(37.5),
  name: bt(37.5),
  close: bt(39.25),
  lockup: bt(39.25),
  last: bt(40),
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

/** A crisp film: the camera's whips smear along their own travel (fx/Defocus DirBlur from lib/camera camVel). */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam is the camera's: a whip with one flash frame, a cut on the launch, a whip-out at a blur peak, momentum up, through black, a light. */
export const SEAMS: Seam[] = [
  { at: ACT.launch.from, kind: 'whip', carry: 'x', dir: 1, signature: true, id: 'whip-right-with-a-flash' },
  { at: ACT.window.from, kind: 'hard', id: 'cut-as-the-button-leaves' },
  { at: ACT.cards.from, kind: 'whip', carry: 'y', dir: -1, id: 'whip-out-at-a-blur-peak' },
  { at: ACT.page.from, kind: 'velocity', carry: 'y', dir: -1, id: 'cards-leave-up' },
  { at: ACT.stages.from, kind: 'colour', carry: 'colour', id: 'through-black' },
  { at: ACT.end.from, kind: 'light', id: 'comets-out-of-the-last-word' },
  { at: CUE.mark, kind: 'hard', id: 'cut-on-the-comets-meeting' },
];
/** The designed steps: none declared here (the decode's glyph steps come from fx/Scramble in src/sync.ts). */
export const STEPPED: SteppedRange[] = [];
/** The one flash: a single near-white frame inside the whip right. */
export const FLASHES: Flash[] = [{ f: ACT.launch.from - 1, frames: 1, id: 'flash-in-the-whip' }];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events: none; the stage stays near-black and the accent sits on the button, the keywords and the mark. */
export const COLOUR: ColourRange[] = [];
/** The one lock: the mark, the name and the close hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** No underdamped spring: cards land by shrinking, critically. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'slide', 'window', 'cards' and 'mark'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  rise: 'cut', what: 'copy', sweep: 'life', type: 'life', whipL: 'move', whipR: 'move',
  slide: 'cut', pull: 'move', push: 'life', fly: 'hit',
  window: 'cut', build: 'copy', stream: 'life', zoomOut: 'move', push3d: 'move', settle3d: 'life', drift3d: 'life', whipOut: 'move',
  cards: 'cut', connect: 'copy', fan: 'move', collapse: 'move', cardsOut: 'move',
  page: 'cut', sib1: 'hit', sib2: 'hit', dim: 'move', toast: 'hit', blackout: 'move',
  stage1: 'cut', stage2: 'hit', stage3: 'hit',
  comets: 'cut', mark: 'hit', name: 'hit', close: 'copy', lockup: 'hit', last: 'cut',
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

/** A line revealed word by word at the film's pace. */
const said = (id: string, text: string, inF: number, out: number): Copy => ({ id, text, in: inF, resolved: inF + f60(revealFor(wordCount(text), pace)), out });
/** A line whose words pop on at full ink, the pace's stagger apart. */
const popped = (id: string, text: string, inF: number, out: number): Copy => ({ id, text, in: inF, resolved: inF + Math.floor(((wordCount(text) - 1) * pace.stagger * FPS) / 60) + 1, out });

// Every on-screen word of the film. The request, the window, the code, the cards, the page, the toast and the stages
// are the product's own strings (UI).
export const COPY: Copy[] = [
  said('what', TEASER.lines.what, CUE.what, CUE.whipL),
  { id: 'request', text: TEASER.request.text, kind: 'ui', in: CUE.type, resolved: CUE.whipR, out: ACT.window.from },
  said('build', TEASER.lines.build, CUE.build, Math.round(CUE.whipOut - (CUE.whipOut - CUE.drift3d) / 3)), // it leaves a little before the whip, so it is gone when the next line arrives
  { id: 'status', text: TEASER.window.status, kind: 'ui', in: CUE.window + f60(20), resolved: CUE.window + f60(30), out: ACT.cards.from },
  popped('connect', TEASER.lines.connect, CUE.connect, CUE.cardsOut),
  ...TEASER.cards.map((c, i): Copy => ({ id: `card${i + 1}`, text: `${c.app} ${c.event}`, kind: 'ui', in: i === 0 ? CUE.cards : CUE.fan, resolved: (i === 0 ? CUE.cards : CUE.fan) + f60(16), out: ACT.page.from })),
  { id: 'title', text: TEASER.page.title, kind: 'ui', in: CUE.page, resolved: CUE.page + f60(24), out: CUE.blackout },
  { id: 'toast', text: `${TEASER.page.toast.title} ${TEASER.page.toast.body}`, kind: 'ui', in: CUE.toast, resolved: CUE.toast + f60(11), out: CUE.blackout },
  ...TEASER.stages.map((s, i): Copy => ({ id: `stage${i + 1}`, text: s, kind: 'ui', in: [CUE.stage1, CUE.stage2, CUE.stage3][i], resolved: [CUE.stage1 + f60(24), CUE.stage2 + f60(10), CUE.stage3 + f60(10)][i], out: [CUE.stage2, CUE.stage3, ACT.end.from + f60(20)][i] })),
  { id: 'wordmark', text: TEASER.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(8), out: TOTAL },
  { id: 'close', text: TEASER.lines.close, in: CUE.close, resolved: CUE.close + f60(12), out: TOTAL, reveal: 'focus' },
];

// A cue placed in beats never shortens a read: at a faster track the beats shrink, so a line leaves on its read instead
// of its cue (the acts take each line's exit from COPY). Where an act line comes first, the cut takes the line.
for (const c of COPY) {
  if (c.kind || c.out >= TOTAL) continue;
  c.out = Math.min(TOTAL, Math.max(c.out, c.resolved + f60(holdFor(wordCount(c.text), pace))));
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
