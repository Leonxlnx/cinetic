// The single source of truth for time, for a type-led explainer: one short sentence at a time on a lit page. The
// name, what the product is said at the pace of speech, the problem, the promise with the product opening inside it
// and becoming the next shot, the product's screen, how it fits together with the mark between the words, the mark
// becoming the hub of its parts, and the close. The devices each slot plays are dealt per film (src/deal.ts); the
// structure and the timing below hold for every deal. Picture (src/acts), sound (src/sync.ts -> out/cues.json) and QA
// (scripts/grid-check.ts) all import this file. The facts live in src/explain.ts. Think in beats, never in seconds.
// Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { EXPLAIN } from './explain';
import { DEAL } from './deal';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. An explainer rides a calm, even track: choose it first.
 */
export { MUSIC } from './music';
export { DEAL } from './deal';

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
const pace = PACE[PACE_NAME];

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
/** The latest 16th-grid frame at or before `f` (never before `floor`): a cue derived from a read stays on the grid. */
export const onGrid = (f: number, floor = 0) => {
  let lo = 0;
  let hi = 4 * 200;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bt(mid / 4) <= f) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(floor, bt(lo / 4));
};

/** The earliest 16th-grid frame at or after `f`. */
export const onGridUp = (f: number) => {
  const g = onGrid(f);
  if (g >= f) return g;
  let x = 0;
  while (bt(x / 4) < f && x < 4 * 200) x++;
  return bt(x / 4);
};

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body: the track's own final hit ringing out (1.5-2.5 s), a hit that
 * rings, or a 2-3 s fade under the end card. The tail is that, and at least 1 s.
 */
/** A grid written before the endings (end.mode 'stop', no hold) names only the stop's element: hold it and 1 s after it. */
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1)) : 0;
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);


const order = ['open', 'pain', 'promise', 'picture', 'system', 'grid', 'end'] as const;
export type ActName = (typeof order)[number];
const L = EXPLAIN.lines;
const w = (s: string) => wordCount(s);

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
/** Appended words start this far apart (60 fps frames) and rise into place on the crisp entry. */
export const APPEND_GAP = 6;
/** The crisp entry (60 fps frames, fx/TypePresets crisp): a word is whole after ENTRY and reads from READ_AT (E.out is 97 % home by then). */
export const ENTRY = 26;
export const READ_AT = 16;
/**
 * When a line set with a confident preset (fx/TypePresets TypeLine, its house numbers in TYPE_PRESETS) is whole,
 * in 60 fps frames from its first frame: mask (words 8 f apart, each head 8 f, the last 2.5x slower), build (the house
 * voice: words 6 f apart, each fading in over 20 f), land (the whole line in 34 f).
 */
export const HERO_END = {
  mask: (n: number) => 8 * (n - 1) + (n > 1 ? 20 : 8),
  build: (n: number) => 6 * Math.max(0, n - 1) + 20,
  land: (_n: number) => 34,
} as const;

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

/** One line said at the pace of speech on the crisp entry: resolved when its last word reads, out on its exit cue. */
const said = (id: string, text: string, inF: number, out: number): Copy => {
  const starts = speechStarts(inF, wordCount(text));
  return { id, text, in: inF, resolved: starts[starts.length - 1] + f60(READ_AT), out };
};
/** One line on a confident preset (HERO_END): resolved when the preset has set it whole. */
const hero = (id: string, preset: keyof typeof HERO_END, text: string, inF: number, out: number): Copy => ({ id, text, in: inF, resolved: inF + f60(HERO_END[preset](wordCount(text))), out });

/**
 * One sentence in two halves with something standing between them (the product, the mark): the first half said at
 * the pace of speech, the second appended later, its words APPEND_GAP apart, each on the crisp entry. One COPY entry
 * (one sentence for the script rule and the read), with the frame the second half starts.
 */
export const halvesIn = (text: readonly [string, string], inA: number, inB: number) => {
  const a = speechStarts(inA, wordCount(text[0]));
  const n = wordCount(text[1]);
  return { first: a, second: Array.from({ length: n }, (_, i) => inB + f60(APPEND_GAP * i)), resolved: inB + f60(APPEND_GAP * (n - 1) + READ_AT) };
};
const halves = (id: string, text: readonly [string, string], inA: number, inB: number, out: number): Copy => ({ id, text: `${text[0]} ${text[1]}`, in: inA, resolved: halvesIn(text, inA, inB).resolved, out });
/** The read of a line of `n` words (film frames). */
const hold = (n: number) => f60(holdFor(n, pace));

type Plan = Record<ActName, number>;
/**
 * Places the acts on a bar plan and every cue and line inside them; `late` lists the acts whose line would leave
 * before its read is over at this tempo (the plan below gives each one bar more until none is).
 */
const build = (plan: Plan) => {
  const BEATS = {} as Record<ActName | 'last', number>;
  let acc = 0;
  for (const k of order) {
    BEATS[k] = acc;
    acc += 4 * plan[k];
  }
  BEATS.last = acc;
  // Acts: contiguous, [from, from + dur). The first starts on frame 0 even when the track's first downbeat comes later
  // (a pickup): its own cues start on that downbeat.
  const ACT = Object.fromEntries(
    order.map((k, i) => {
      const from = i === 0 ? 0 : bt(BEATS[k]);
      const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
      return [k, { from, dur: to - from }];
    }),
  ) as Record<ActName, { from: number; dur: number }>;
  const TOTAL = bt(BEATS.last) + TAIL;
  // An act given more bars than the house plan stretches its own beats by the same factor, so its moves slow with it
  // and its line arrives later rather than holding dead (a read runs at most pace.readMax).
  const stretch = (act: ActName) => plan[act] / HOUSE[act];
  const at = (act: ActName, x: number) => bt(BEATS[act] + x * stretch(act));
  const cut = (act: ActName) => ACT[act].from + ACT[act].dur;
  /** The second half of a sentence starts at its beat, or earlier when its read would not fit before `by`. */
  const halfAt = (want: number, first: number, by: number, text: readonly [string, string]) =>
    onGrid(Math.min(want, by - hold(w(text.join(' '))) - f60(APPEND_GAP * (w(text[1]) - 1) + READ_AT)), onGridUp(first + f60(12)));
  const tail = (act: ActName, beats: number, lo: number, hi: number) => Math.min(f60(hi), Math.max(f60(lo), BEAT * beats * stretch(act)));
  // Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
  // sound events. SALIENCE below says what each asks of the eye.
  const C: Record<string, number> = {};
  // open: the name (the dealt device), the mark arriving as its next word; a cut at speed to what it is, said
  C.giant = at('open', 0);
  C.what = Math.max(at('open', 2), onGridUp(C.giant + f60(READ_AT) + hold(1))); // the name is read before the cut
  C.mark = onGrid(C.giant + (C.what - C.giant) / 2);
  C.glide = onGrid(C.giant + ((C.what - C.giant) * 3) / 4);
  C.whatPush = onGrid(C.what + 2.5 * BEAT * stretch('open'));
  C.exitWhat = onGrid(cut('open') - tail('open', 1.5, 24, 60));
  C.vanish = onGrid(cut('open') - tail('open', 0.5, 16, 30));
  // pain: the problem as one line (drift, push or crowd), an ease-in exit the same way, cut at speed
  C.pain = at('pain', 0);
  C.painPush = onGrid(C.pain + Math.max(f60(36), BEAT) * stretch('pain'));
  C.exitPain = onGrid(cut('pain') - tail('pain', 0.5, 12, 30));
  // promise: the first half said, the product opening in the line after it, the second half appended, the slot
  // growing (pill, roll) or the camera pushing through it (lens) into the product; the growth reaches the words in
  // its second half, so the read may run until then
  C.promise = at('promise', 0);
  C.pill = at('promise', 0.5);
  C.grow = onGrid(cut('promise') - tail('promise', 0.5, 18, 36));
  const covered = Math.round((C.grow + cut('promise')) / 2);
  C.promise2 = halfAt(at('promise', DEAL.promise === 'roll' ? 2 : 1), C.promise, covered, L.promise);
  // picture: the product's screen in its light; the name over it
  C.picture = at('picture', 0);
  C.title = at('picture', 1);
  // system: the one wipe (or the sheet), the first half with the mark standing after it, the second half appended,
  // a push centred on the mark; the words float off and the mark stays
  C.wipe = at('system', 0);
  // the line is already arriving under the wipe and the sheet; under the push-wipe it waits for the edge to park
  C.system = onGridUp(C.wipe + f60(DEAL.system === 'push' ? 30 : 6));
  C.floatOff = onGrid(cut('system') - tail('system', 0.5, 18, 30));
  C.system2 = halfAt(at('system', 1.25), C.system, C.floatOff, L.system);
  C.hubPush = onGrid(Math.min(at('system', 2), C.floatOff - f60(20)));
  // grid: the parts born round the mark, three read one a second, gathering back into it
  C.tiles = at('grid', 0);
  C.glyphs = at('grid', 0.25);
  C.gather = bt(BEATS.end - 1);
  C.label1 = onGrid(at('grid', 1));
  const labelGap = Math.min(Math.max(f60(54), BEAT * 1.5), (C.gather - f60(READ_AT) - hold(1) - C.label1) / 2 - BEAT / 4);
  C.label2 = onGridUp(C.label1 + labelGap);
  C.label3 = onGridUp(C.label2 + labelGap);
  // end: the hub steps into the lockup (or the accent floods from it), the name, the close; the lockup holds
  C.end = at('end', 0);
  if (DEAL.end === 'claim') {
    // the claim first (the accent floods as it arrives), the lockup once it has been read
    C.close = at('end', 0.5);
    C.name = Math.min(onGridUp(C.close + f60(READ_AT + 7 * (w(L.close) - 1)) + hold(w(L.close))), onGrid(cut('end') - TAIL - f60(40)));
    C.lockup = onGridUp(C.name + f60(READ_AT));
  } else {
    C.name = at('end', 0.5);
    C.close = onGrid(Math.min(cut('end') - TAIL - f60(60), onGridUp(C.name + f60(READ_AT) + hold(1)))); // once the name is read
    C.lockup = onGridUp(C.close + f60(READ_AT + 7 * (w(L.close) - 1))); // the close is whole (the crisp entry)
  }
  // the end holds about 1.5 s before the tail: a lockup that would come earlier moves later, its lines with it (at most 48 f)
  const first = Math.min(C.close, C.name); // and the end's first line still comes within 46 f of its cut
  const shift = Math.max(0, Math.min(f60(48), C.end + f60(40) - first, cut('end') - TAIL - f60(90) - C.lockup));
  if (shift > 0) for (const k of ['close', 'name', 'lockup']) C[k] = onGridUp(C[k] + shift);
  C.rest = onGrid(Math.min(at('end', 3.5), C.lockup + BEAT));
  C.last = bt(BEATS.last);
  const LABELS = [C.label1, C.label2, C.label3];
  // Every on-screen word of the film. The module labels are the product's own strings (UI).
  const COPY: Copy[] = [
    { id: 'name', text: EXPLAIN.name, kind: 'name', in: C.giant, resolved: C.giant + f60(READ_AT), out: C.what },
    DEAL.voice === 'said' ? said('what', L.what, C.what, C.exitWhat) : hero('what', DEAL.voice, L.what, C.what, C.exitWhat),
    DEAL.pain === 'land' ? hero('pain', 'land', L.pain, C.pain, C.exitPain) : said('pain', L.pain, C.pain, C.exitPain),
    halves('promise', L.promise, C.promise, C.promise2, covered),
    { id: 'title', text: EXPLAIN.name, kind: 'name', in: C.title, resolved: C.title + f60(READ_AT), out: ACT.system.from },
    halves('system', L.system, C.system, C.system2, C.floatOff),
    ...EXPLAIN.modules.slice(0, 3).map((m, i): Copy => ({ id: `label${i + 1}`, text: m.label, kind: 'ui', in: LABELS[i], resolved: LABELS[i] + f60(16), out: i < 2 ? LABELS[i + 1] : C.gather })),
    { id: 'wordmark', text: EXPLAIN.name, kind: 'name', in: C.name, resolved: C.name + f60(READ_AT), out: TOTAL },
    { id: 'close', text: L.close, in: C.close, resolved: C.close + f60(READ_AT + 7 * (w(L.close) - 1)), out: TOTAL }, // the film's voice: the crisp entry, as the halves are said
  ];
  // A cue never shortens a read: a line whose read runs past its exit cue makes its act late.
  const late: ActName[] = [];
  const why: string[] = [];
  for (const c of COPY) {
    if (c.kind || c.out >= TOTAL) continue;
    const need = c.resolved + hold(wordCount(c.text));
    if (need > c.out) {
      late.push(order[order.findIndex((k) => cut(k) > c.in)] ?? 'end');
      why.push(`${c.id} +${need - c.out} f`);
    }
  }
  // one line at a time: the close arrives once the name beside it has been read (the claim: the lockup once the claim has)
  if (DEAL.end === 'claim' ? C.name < C.close + f60(READ_AT + 7 * (w(L.close) - 1)) + hold(w(L.close)) : C.close < C.name + f60(READ_AT) + hold(1)) {
    late.push('end');
    why.push('end: the close and the name');
  }
  return { BEATS, ACT, TOTAL, C, LABELS, COPY, late, why };
};

// ---- The bar plan. Each act takes whole bars: the house plan is 9 bars (2-1-1-1-1-2-1, 24 s at 90 BPM); an act whose
// line cannot be read inside its bars at this tempo gets a bar more until it can, and a body under 19.5 s (a fast
// track) grows the promise, the system line, the problem and the close, in that order. So every line keeps its read
// at 85-140 BPM and the film stays 20-30 s. track.py edit --bars takes BARS.
const HOUSE: Plan = { open: 2, pain: 1, promise: 1, picture: 1, system: 1, grid: 2, end: 1 };
const plan: Plan = { ...HOUSE };
if (DEAL.promise === 'roll') plan.promise += 1; // the roll needs its bar: the act's beats stretch with it
let made = build(plan);
/** Why acts grew: each round of the plan, the lines that could not be read in their act's bars (and by how much). */
export const GROWN: string[][] = [];
for (let i = 0; i < 12 && made.late.length; i++) {
  GROWN.push(made.why);
  for (const a of new Set(made.late)) plan[a] += 1;
  made = build(plan);
}
for (const k of ['promise', 'system', 'pain', 'end'] as ActName[]) {
  if ((order.reduce((s, a) => s + plan[a], 0) * BAR) / FPS >= 19.5) break;
  if (plan[k] === HOUSE[k]) plan[k] += 1;
  made = build(plan);
}
if (made.late.length) throw new Error(`timeline: the ${made.late.join(', ')} line cannot be read at ${BPM} BPM: shorten it (explain.ts)`);

/** Bars per act at this tempo (the house plan, grown where a read needs it). */
export const ACT_BARS: Readonly<Plan> = plan;
/** Bars in the body: track.py edit --bars takes this number. */
export const BARS = order.reduce((s, a) => s + plan[a], 0);
/** Where each act starts, in beats (every act line on a bar line: with a track each lands on a downbeat). */
export const BEATS: Readonly<Record<ActName | 'last', number>> = made.BEATS;
/** The acts, contiguous; each is its own composition in Root.tsx (in this order). */
export const ACT = made.ACT;
export const TOTAL = made.TOTAL;
export const CUE: Record<string, number> = made.C;
/** The three labelled parts' frames (one a second). */
export const LABELS = made.LABELS;

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

/** A crisp film on a lit page: no shutter pass, type sharp even at speed. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'explainer', oneTake: false, whiteWorld: false };
/**
 * Every seam carries something: speed through the cuts, the product that is a word becoming the shot, one soft wipe
 * (or the sheet), the mark that is a word becoming the hub of the parts and then the lockup.
 */
export const SEAMS: Seam[] = [
  DEAL.open === 'push' ? { at: CUE.what, kind: 'zoomThrough', carry: 'scale', dir: 1, id: 'through-the-name-into-what' } : { at: CUE.what, kind: 'velocity', carry: 'x', dir: -1, id: 'name-glides-into-what' },
  { at: ACT.pain.from, kind: 'velocity', carry: 'x', dir: 1, id: 'what-leaves-right' },
  { at: ACT.promise.from, kind: 'velocity', carry: 'x', dir: 1, id: 'pain-leaves-right' },
  DEAL.promise === 'lens'
    ? { at: ACT.picture.from, kind: 'zoomThrough', carry: 'scale', signature: true, id: 'through-the-word-into-the-product' }
    : { at: ACT.picture.from, kind: 'morph', carry: 'scale', signature: true, id: 'the-word-becomes-the-product' },
  { at: ACT.system.from, kind: DEAL.system === 'sheet' ? 'mask' : 'wipe', carry: 'x', dir: DEAL.system === 'push' ? 1 : -1, id: DEAL.system === 'sheet' ? 'the-sheet' : DEAL.system === 'push' ? 'the-push-wipe' : 'the-one-wipe' },
  { at: ACT.grid.from, kind: 'morph', carry: 'shape', id: 'mark-becomes-the-hub' },
  { at: ACT.end.from, kind: 'morph', carry: 'shape', id: 'parts-gather-into-the-mark' },
];
/** No designed one-frame steps: every change glides (lib/continuity). */
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events: the claim end floods the frame with the accent from the mark; otherwise the page keeps its light. */
export const COLOUR: ColourRange[] = DEAL.end === 'claim' ? [{ from: ACT.end.from, to: TOTAL, id: 'claim-on-the-accent' }] : [];
/** The one lock: the close and the lockup hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** No underdamped spring: every landing settles critically. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'what', 'picture' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  giant: 'cut', mark: 'hit', glide: 'move', what: 'copy', whatPush: 'move', exitWhat: 'move', vanish: 'move',
  pain: 'copy', painPush: 'move', exitPain: 'move',
  promise: 'copy', pill: 'hit', promise2: 'copy', grow: 'move',
  picture: 'cut', title: 'hit',
  wipe: 'cut', system: 'copy', system2: 'copy', hubPush: 'life', floatOff: 'move',
  tiles: 'hit', glyphs: 'life', label1: 'hit', label2: 'hit', label3: 'hit', gather: 'move',
  end: 'move', name: 'hit', close: 'copy', lockup: 'hit', rest: 'life', last: 'cut',
};

/** Every on-screen word of the film; each line leaves on its read when that comes later than its cue. */
export const COPY: Copy[] = made.COPY;
for (const c of COPY) {
  if (c.kind || c.out >= TOTAL) continue;
  c.out = Math.min(TOTAL, Math.max(c.out, c.resolved + hold(wordCount(c.text))));
}

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
/**
 * Each page act's light event (acts/stage.tsx LightEvent: the light on the page changes once) sits in the act's longest
 * stretch where nothing arrives, leaves or is read, a second or more after its cut (look-audit skips the second after
 * a cut): the act's quiet part gets its designed change, at every tempo and bar plan.
 */
const lightCue = (act: ActName) => {
  const a = ACT[act].from;
  const z = a + ACT[act].dur - (act === 'end' ? TAIL : 0);
  const busy: [number, number][] = [];
  for (const f of Object.values(CUE)) if (f >= a && f < z) busy.push([f, f + 1]);
  for (const c of COPY) for (const f of [c.in, c.resolved, c.out]) if (f >= a && f < z) busy.push([f, f + 1]);
  for (const [x, y] of Object.values(readingWindows(COPY, pace, FPS, TOTAL)).flat()) if (y > a && x < z) busy.push([Math.max(a, x), Math.min(z, y)]);
  busy.push([z, z + 1]);
  busy.sort((p, q) => p[0] - q[0]);
  let best: [number, number] = [a + f60(66), a + f60(66)];
  let edge = a + f60(60);
  for (const [x, y] of busy) {
    if (x > edge && x - edge > best[1] - best[0]) best = [edge, x];
    edge = Math.max(edge, y);
  }
  // on the 16th grid, a second or more after the cut, inside the act
  const g = Math.max(onGridUp(a + f60(60)), onGrid(Math.round((best[0] + best[1]) / 2)));
  return g < z ? g : onGrid(z - 1, a);
};
for (const act of ['open', 'pain', 'promise', 'picture', 'system', 'grid', 'end'] as ActName[]) {
  CUE[`${act}Light`] = lightCue(act);
  SALIENCE[`${act}Light`] = 'life';
}

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
