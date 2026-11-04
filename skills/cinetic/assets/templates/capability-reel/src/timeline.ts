// The single source of truth for time, for a capability reel: the close of a launch film. A ring of sources around
// one line, the ring tightening as one ring becomes a disc that grows into a real record, a statement on a light card
// that squashes round its line, a ticker through what the product returns, the big claim on the accent, a graphic
// transition out of its full stop, and the end card. Picture (src/acts), sound (src/sync.ts -> out/cues.json) and
// QA (scripts/grid-check.ts) all import this file. The facts live in src/reel.ts. Think in beats, never in seconds.
// Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { REEL } from './reel';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. The reel's cuts and swaps sit on the track's drum onsets: choose the track first.
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
/** The film's pace (src/lib/pace.ts): a launch close runs at the crisp tempo. */
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

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body: the track's own final hit ringing out (1.5-2.5 s), a hit that
 * rings, or a 2-3 s fade under the end card. The tail is that, and at least 1 s.
 */
/** A grid written before the endings (end.mode 'stop', no hold) names only the stop's element: hold it and 1 s after it. */
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1)) : 0;
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);

/**
 * Where each act starts, in beats (10 bars at 120 BPM: 21 s with the tail). Every act line sits on a bar line, so with a
 * track in each one lands on a downbeat (grid-check structural-on-music). The shape is the template: a 2-bar ring of
 * sources, a 1-bar record, a 1-bar statement, a 1-bar ticker, the 2-bar claim, a 1-bar transition, a 2-bar end card.
 */
export const BEATS = { sources: 0, record: 8, statement: 12, ticker: 16, claim: 20, rings: 28, end: 32, last: 40 } as const;

// Acts: contiguous, [from, from + dur). The first act starts on frame 0 even when the track's first downbeat comes
// later (a pickup): its own cues start on that downbeat.
const order = ['sources', 'record', 'statement', 'ticker', 'claim', 'rings', 'end'] as const;
export type ActName = (typeof order)[number];
// Each act is its own composition in Root.tsx (in this order).
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;

export const TOTAL = bt(BEATS.last) + TAIL;

/** The ticker's steps: one row every 10 f at 60 fps (hard), from its first step; closer when they would not fit the act (TICKS). */
export const TICK_GAP = 10;

/** The end card's title: its name pops, the rest types over this many 60 fps frames from TITLE_LEAD after it. */
export const TITLE_TYPE = 36;
export const TITLE_LEAD = 6;
/** The first quarter-beat position at or after `from` whose frame is at least `f`: a cue that waits for a read. */
export const beatAfter = (f: number, from: number) => {
  let q = Math.ceil(from * 4);
  while (bt(q / 4) < f && q < 4096) q++;
  return q / 4;
};
/** The end card: the title at beat 32.25; the tagline takes its place once the title is read, at beat 38.25 (later if a
 *  track is fast enough that the read needs it, so the read never shrinks with the beats): the lockup on it then holds
 *  about a second and a half with the tail, creeping. */
const TITLE_AT = 32.25;
const TAGLINE_AT = beatAfter(bt(TITLE_AT) + f60(TITLE_LEAD + TITLE_TYPE + holdFor(wordCount(REEL.lines.title), PACE[PACE_NAME])), 38.25);

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye.
export const CUE: Record<string, number> = {
  // sources: the line, the sources popping in round it, a slow orbit; the ring tightens and the inner ring becomes a disc
  line: bt(0.25),
  chips: bt(0),
  chipsIn: bt(2),
  orbit: bt(3.5),
  exitLine: bt(6.25),
  darken: bt(6.5),
  disc: bt(7.25),
  // record: the disc grows into the card, the accent rises through its picture, a whip pan reveals its fields; the
  // grid cells under it hop on the kicks; a hard cut on a kick
  card: bt(8),
  grad: bt(8.25),
  pan: bt(9.5),
  hop1: bt(10.25),
  rows: bt(10.5),
  hop2: bt(10.75),
  hop3: bt(11.25),
  hold: bt(11.5),
  hop4: bt(11.75),
  // statement: the light card opens at the record's height and squashes round its line; counter-creep; zoom out
  statement: bt(12),
  squashed: bt(12.75),
  creep: bt(13.5),
  turn: bt(14.5),
  exitStatement: bt(15.5),
  // ticker: an icon tile and a word wheel stepping one row every 10 f; the exit launches left
  ticker: bt(16),
  tick0: bt(16.25),
  tick1: bt(17),
  tick2: bt(17.75),
  tick3: bt(18.5),
  tick4: bt(19),
  exitTicker: bt(19.5),
  // claim: on the accent, two fragments; the first pushes up and dims as the second rises; the full stop; the erase
  claim: bt(20),
  dim: bt(22.5),
  frag2: bt(23),
  stop: bt(23.5),
  drift: bt(24.5),
  erase: bt(26.5),
  zoomIn: bt(27),
  // rings: inverted, squares radiate from the full stop at one speed, then the centre floods
  rings: bt(28),
  born1: bt(28.25),
  born2: bt(28.75),
  born3: bt(29.25),
  born4: bt(29.75),
  born5: bt(30.25),
  flood: bt(31),
  // end: the title's name pops and the rest types, the mark rises beside it once the title is typed, the key passes;
  // the tagline takes the title's place
  end: bt(32),
  title: bt(TITLE_AT),
  mark: bt(34.75),
  key: bt(36),
  tagline: bt(TAGLINE_AT),
  lockup: bt(TAGLINE_AT + 0.5),
  rest: bt(Math.max(37, TAGLINE_AT + 1.25)),
  last: bt(40),
};

/**
 * A timing assert at import (a line read past its act's cut at this tempo): a warning in dev, recorded where
 * scripts/precheck.mjs lists it, an error only under the ship gate (CINETIC_GATE=ship, or REMOTION_CINETIC_GATE=ship for a
 * render). lib/continuity timingFail's twin, inline: this file stays free of React and remotion imports.
 */
const timingFail = (rule: string, message: string): void => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (env?.CINETIC_GATE === 'ship' || env?.REMOTION_CINETIC_GATE === 'ship') throw new Error(message);
  const g = globalThis as unknown as Record<string, { rule: string; message: string }[] | undefined>;
  const list = (g.__cineticGateIssues ??= []);
  if (list.some((x) => x.rule === rule && x.message === message)) return;
  list.push({ rule, message });
  console.warn(`warn ${message} (dev: a warning; the ship gate fails it, CINETIC_GATE=ship)`);
};
/**
 * The ticker's step frames (whole frames): one fewer than the capabilities, TICK_GAP apart from tick0, or closer
 * (whole 60 fps frames, never under 6) so the last step lands 2 f before the claim: the act shrinks with the tempo.
 */
const TICK_EVERY = (() => {
  const gaps = REEL.capabilities.length - 2;
  const room = ((ACT.claim.from - CUE.tick0) * 60) / FPS - 2;
  const g = gaps > 0 ? Math.min(TICK_GAP, Math.floor(room / gaps)) : TICK_GAP;
  if (g < 6) timingFail('tick-room', `timeline: ${REEL.capabilities.length} capabilities need a step every ${g} f at 60 fps to fit the ticker act; cut the list or choose a slower track`);
  return Math.max(1, g);
})();
export const TICKS = Array.from({ length: REEL.capabilities.length - 1 }, (_, k) => CUE.tick0 + f60(TICK_EVERY * k));
/** The record grid's hops (the accent cells change place on the kicks). */
export const HOPS = [CUE.hop1, CUE.hop2, CUE.hop3, CUE.hop4];

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

/** A crisp film on a grid: state changes are hard steps, only the camera and the containers ease. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam: one container carried into the next, a hard cut on a kick, zooms and momentum carried, a zoom through the claim's full stop. */
export const SEAMS: Seam[] = [
  { at: ACT.record.from, kind: 'morph', carry: 'shape', id: 'ring-becomes-record' },
  { at: CUE.pan, kind: 'whip', carry: 'x', dir: -1, id: 'pan-opens-the-record' },
  { at: ACT.statement.from, kind: 'hard', id: 'cut-on-the-kick' },
  { at: ACT.ticker.from, kind: 'velocity', carry: 'scale', dir: -1, id: 'zoom-out-carried' },
  { at: ACT.claim.from, kind: 'velocity', carry: 'x', dir: -1, id: 'momentum-left' },
  { at: ACT.rings.from, kind: 'zoomThrough', carry: 'scale', signature: true, id: 'through-the-full-stop' },
  { at: ACT.end.from, kind: 'colour', carry: 'colour', id: 'flood-to-end' },
];
/** The designed steps: the ticker's rows, the record grid's hops. */
export const STEPPED: SteppedRange[] = [
  ...TICKS.map((f, i) => ({ from: f, to: f + 1, id: `tick-${i}` })),
  ...HOPS.map((f, i) => ({ from: f, to: f + 1, id: `hop-${i}` })),
];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** The film's one colour event: the claim on the accent. */
export const COLOUR: ColourRange[] = [{ from: ACT.claim.from, to: ACT.rings.from, id: 'claim-on-the-accent' }];
/** The one lock: the mark and the tagline hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** The one element class allowed an underdamped spring: the record card's height landing. */
export const SPRING_CLASS = 'record-card';
/** CUE names that must land on a music event. None without a track; with one, add 'statement', 'claim' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  line: 'copy', chips: 'hit', chipsIn: 'hit', orbit: 'life', exitLine: 'copy', darken: 'move', disc: 'move',
  card: 'cut', grad: 'move', pan: 'move', rows: 'hit', hop1: 'hit', hop2: 'hit', hop3: 'hit', hop4: 'hit', hold: 'life',
  statement: 'cut', squashed: 'hit', creep: 'life', turn: 'life', exitStatement: 'copy',
  ticker: 'cut', tick0: 'hit', tick1: 'life', tick2: 'life', tick3: 'life', tick4: 'life', exitTicker: 'move',
  claim: 'cut', dim: 'move', frag2: 'copy', stop: 'hit', drift: 'life', erase: 'copy', zoomIn: 'move',
  rings: 'cut', born1: 'life', born2: 'life', born3: 'life', born4: 'life', born5: 'life', flood: 'move',
  end: 'cut', title: 'copy', mark: 'hit', key: 'life', tagline: 'copy', lockup: 'hit', rest: 'life', last: 'cut',
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

/** One line of copy revealed word by word with this film's pace; `out` defaults to the pace's hold. */
export const line = (id: string, text: string, inF: number, out?: number, o: { ink?: Ink } = {}): Copy => {
  const n = wordCount(text);
  const resolved = inF + revealSpan(n, o.ink);
  const read = resolved + f60(holdFor(n, pace)); // a cue placed in beats never cuts the read short at a faster track
  return { id, text, in: inF, resolved, out: Math.max(out ?? read, read) };
};

/** One line built in beats (fx/Chain's contract): `<id>.1`, `<id>.2` ... one sentence for the script rule. */
export const chain = (id: string, mode: 'build' | 'replace', fragments: [text: string, inF: number][], o: { out?: number; ink?: Ink } = {}): Copy[] => {
  const base = fragments.map(([text, inF], i) => ({ id: `${id}.${i + 1}`, text, in: inF, resolved: inF + revealSpan(wordCount(text), o.ink), chain: id, mode }));
  const last = base[base.length - 1];
  if (!last) throw new Error(`timeline: chain "${id}" has no fragments`);
  const words = (list: { text: string }[]) => list.reduce((n, c) => n + wordCount(c.text), 0);
  if (mode === 'build') {
    const out = o.out ?? last.resolved + f60(holdFor(words(base), pace));
    return base.map((c) => ({ ...c, out }));
  }
  const leave = f60(pace.exitDur) + f60(6);
  return base.map((c, i) => ({ ...c, out: base[i + 1] ? base[i + 1].in - leave : (o.out ?? c.resolved + f60(holdFor(wordCount(c.text), pace))) }));
};

/**
 * The claim's words pop 9 f then 7 f apart (60 fps frames: quickening, and never under the house 8 f a word over a
 * fragment of 3-5 words), each in over CLAIM_POP f. acts/Claim.tsx draws them on claimStarts().
 */
export const CLAIM_POP = 2;
export const CLAIM_GAPS = { first: 9, then: 7 } as const;
export const claimStarts = (text: string, inF: number) => text.trim().split(/\s+/).map((_, i) => inF + Math.floor(f60x(i ? CLAIM_GAPS.first + CLAIM_GAPS.then * (i - 1) : 0)));
/** A claim fragment is read once its last word is in, on the act's own cadence (not the pace's stagger). */
const claimRead = (c: Copy): Copy => ({ ...c, resolved: Math.ceil(Math.max(...claimStarts(c.text, c.in)) + f60x(CLAIM_POP)) });

// Every on-screen word of the film. The product's own strings (reel.ts sources, record, capabilities) are UI.
export const COPY: Copy[] = [
  line('sources', REEL.lines.sources, CUE.line, CUE.exitLine),
  line('statement', REEL.lines.statement, CUE.statement, CUE.exitStatement, { ink: 'pop' }),
  ...chain('claim', 'build', [[REEL.lines.claim[0], CUE.claim], [REEL.lines.claim[1], CUE.frag2]], { ink: 'pop', out: CUE.zoomIn }).map(claimRead),
  { id: 'title', text: REEL.lines.title, in: CUE.title, resolved: CUE.title + f60(TITLE_LEAD + TITLE_TYPE), out: CUE.tagline },
  { id: 'tagline', text: REEL.lines.tagline, in: CUE.tagline, resolved: CUE.tagline + f60(14), out: TOTAL, reveal: 'focus', swap: 'title' },
];

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
