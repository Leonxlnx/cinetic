// The single source of truth for time, for a 15 s social ad on a white page: the opener built word by word (its
// first word, the name, landing oversized and defocused; each new word landing in the accent at the line's end while
// the line re-centres), the words spreading through the cut around a pile of pictures dealt on a hero card, the mark
// spinning in over a picture that pulls back, a wall of pictures settling tile by tile round the claim, two rivers of
// pictures under a label that recedes and swaps its last word, the taglines over the hero picture, the lockup.
// Picture (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The
// facts live in src/ad.ts. Think in beats, never in seconds. Keep it free of React and CSS imports: Node scripts load
// it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { AD } from './ad';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. An ad is cut to a driving track: choose it first.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites the
 * `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 150;
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
 * Where each act starts, in beats (9 bars at 150 BPM: 15.4 s with the tail). Every act line sits on a bar line, so with
 * a track in each one lands on a downbeat (grid-check structural-on-music): the 2-bar open (the opener, then the
 * pile), a 1-bar mark, a 1-bar wall, the 2-bar rivers, the 2-bar taglines and the 1-bar lockup. Retime in whole bars.
 */
export const BEATS = { open: 0, brand: 8, wall: 12, rivers: 16, taglines: 24, end: 32, last: 36 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['open', 'brand', 'wall', 'rivers', 'taglines', 'end'] as const;
export type ActName = (typeof order)[number];
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;

export const TOTAL = bt(BEATS.last) + TAIL;

/** The opener's word gaps (60 fps frames): the first word's settle, then quicker. */
export const BUILD = [18, 12, 12, 10] as const;
/** The onset of each of `n` words from `start` on the build gaps. */
export const buildStarts = (start: number, n: number): number[] => {
  const out = [start];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + f60(BUILD[Math.min(i - 1, BUILD.length - 1)]));
  return out;
};
/** Words that pop on at full ink, this far apart (60 fps frames): the claim, the label, the taglines (8: each word read). */
export const POP_GAP = 8;
/** The pile: a card dealt every DEAL frames (60 fps), this many. */
export const DEAL = 6;
export const PILE_CARDS = 7;

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye.
export const CUE: Record<string, number> = {
  // open: the opener built word by word; its words spread apart through the cut onto the pile
  what: bt(0),
  spread: bt(4.75),
  pile: bt(5),
  deal: bt(5.25),
  // brand: the mark spins in over a picture pulling back, the name slides out of it; the lockup and plate rise into the cut
  brand: bt(8),
  mark: bt(8.25),
  rise: bt(11),
  // wall: the pictures settle tile by tile, the claim in the gap, its last word on the accent pill; the wall leaves up
  wall: bt(12),
  find: bt(12),
  wallOut: bt(15.75),
  // rivers: two streams of pictures, a label receding over them, its last word swapping; the streams rush out
  rivers: bt(16),
  plan: bt(16.5),
  swap: bt(20),
  rushOut: bt(22.5),
  // taglines: the hero picture pulling back, two taglines, a push into the cut
  taglines: bt(24),
  tag1: bt(24.25),
  tagOut: bt(27),
  tagGone: bt(27.75),
  tag2: bt(28.5),
  push: bt(31),
  // end: the mark spins in on white, the name slides out, the close under them; the lockup holds
  end: bt(32),
  endMark: bt(32),
  close: bt(35.5),
  lockup: bt(35.5),
  last: bt(36),
};

/** The pile's deals: one card every DEAL frames from the deal cue. */
export const DEALS = Array.from({ length: PILE_CARDS }, (_, i) => CUE.deal + f60(DEAL * i));

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

/** A crisp film: fast pictures smear along their own travel (fx/Defocus DirBlur, SpinBlur), no shutter pass. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam is hidden inside a motion: the spread carried through the cut, the rise into the wall, the speed cuts. */
export const SEAMS: Seam[] = [
  { at: CUE.pile, kind: 'velocity', carry: 'x', id: 'spread-carries-across' },
  { at: ACT.brand.from, kind: 'hard', id: 'cut-to-the-mark' },
  { at: ACT.wall.from, kind: 'velocity', carry: 'y', dir: -1, id: 'rise-into-the-wall' },
  { at: ACT.rivers.from, kind: 'velocity', carry: 'y', dir: -1, id: 'wall-leaves-up' },
  { at: ACT.taglines.from, kind: 'velocity', carry: 'x', dir: 1, signature: true, id: 'rivers-rush-out' },
  { at: ACT.end.from, kind: 'hard', id: 'push-into-the-lockup' },
];
/** The designed steps: none (the pill's 2-frame pop is a scale, not a step). */
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events: none; the accent lands on each new word, the pill and the mark. */
export const COLOUR: ColourRange[] = [];
/** The one lock: the mark, the name and the close hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** No underdamped spring: pops land without overshoot. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'pile', 'brand' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  what: 'copy', spread: 'move', pile: 'cut', deal: 'hit',
  brand: 'cut', mark: 'hit', rise: 'move',
  wall: 'cut', find: 'copy', wallOut: 'move',
  rivers: 'cut', plan: 'copy', swap: 'copy', rushOut: 'move',
  taglines: 'cut', tag1: 'copy', tagOut: 'move', tagGone: 'life', tag2: 'copy', push: 'move',
  end: 'cut', endMark: 'hit', close: 'copy', lockup: 'hit', last: 'cut',
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

/** A line whose words pop on at full ink POP_GAP apart: resolved a few frames after its last word. */
const popped = (id: string, text: string, inF: number, out: number, o: Partial<Copy> = {}): Copy => ({ id, text, in: inF, resolved: inF + f60(POP_GAP * (wordCount(text) - 1)) + f60(4), out, ...o });

const what = buildStarts(CUE.what, wordCount(AD.lines.what));
const tagLeave = f60(pace.exitDur) + f60(6);

// Every on-screen word of the film.
export const COPY: Copy[] = [
  { id: 'what', text: AD.lines.what, in: CUE.what, resolved: what[what.length - 1] + f60(4), out: CUE.spread },
  popped('save', AD.lines.save.join(' '), CUE.pile, ACT.brand.from),
  { id: 'brandName', text: AD.name, kind: 'name', in: CUE.mark + f60(30), resolved: CUE.mark + f60(42), out: ACT.wall.from },
  popped('find', AD.lines.find, CUE.find, CUE.wallOut),
  popped('plan', AD.lines.plan[0], CUE.plan, CUE.swap),
  { id: 'swap', text: AD.lines.plan[1], in: CUE.swap, resolved: CUE.swap + f60(10), out: CUE.rushOut + f60(12), swap: 'plan', reveal: 'focus' },
  popped('tag.1', AD.lines.taglines[0], CUE.tag1, Math.min(CUE.tagOut, CUE.tag2 - tagLeave), { chain: 'tag', mode: 'replace' }),
  popped('tag.2', AD.lines.taglines[1], CUE.tag2, ACT.end.from, { chain: 'tag', mode: 'replace' }), // cut on the push, still read
  { id: 'wordmark', text: AD.name, kind: 'name', in: CUE.endMark + f60(30), resolved: CUE.endMark + f60(42), out: TOTAL },
  { id: 'close', text: AD.lines.close, in: CUE.close, resolved: CUE.close + f60(10), out: TOTAL, reveal: 'focus' },
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
