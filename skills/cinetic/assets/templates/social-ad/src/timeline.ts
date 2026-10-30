// The single source of truth for time, for a 15 s social ad: the opener said in one confident move onto a stack of
// what the product holds, the mark, the claim inside a field of the product's own content, a label that swaps its
// last word over moving content, two imperatives, the lockup. The devices each slot plays are dealt per film
// (src/deal.ts); the structure and the timing below hold for every deal. Picture (src/acts), sound (src/sync.ts ->
// out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts live in src/ad.ts. Think in beats,
// never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { AD } from './ad';
import { DEAL } from './deal';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. An ad is cut to a driving track: choose it first.
 */
export { MUSIC } from './music';
export { DEAL } from './deal';

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
/** The latest 16th-grid frame at or before `f` (never before `floor`). */
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

const order = ['open', 'brand', 'field', 'label', 'taglines', 'end'] as const;
export type ActName = (typeof order)[number];
const L = AD.lines;
const w = (s: string) => wordCount(s);

/**
 * When a line set with a confident preset (fx/TypePresets TypeLine, its house numbers in TYPE_PRESETS) is whole, in
 * 60 fps frames from its first frame: land (the leading words in 34 f, then each next word 12 f apart, solid 6 f after
 * it cuts on), build (the house voice: words 6 f apart, each fading in over 20 f),
 * glide (words resolving 3.5 f apart, the last 2.5x slower, while the line slides in), mask (words
 * 8 f apart, each head 8 f, the last 2.5x slower), fall (words 9 f apart, each dropping in 12 f), crisp (7 f apart,
 * read 16 f after the last starts).
 */
export const HERO_END = {
  land: (n: number, lead = 1) => (lead >= n ? 34 : 34 + 12 * (n - 1 - lead) + 6),
  build: (n: number) => 6 * Math.max(0, n - 1) + 20,
  glide: (n: number) => 3.5 * (n - 1) + 20,
  mask: (n: number) => 8 * (n - 1) + (n > 1 ? 20 : 8),
  fall: (n: number) => 9 * (n - 1) + 12,
  crisp: (n: number) => 7 * (n - 1) + 16,
} as const;
/** The spread exit (fx/TypePresets exit spread, 26 f at 60 fps): the cut takes it 18 f in, its words still tracking apart at speed. */
export const SPREAD = 18;
/** The pile: a card dealt every DEAL_EVERY frames (60 fps), this many. */
export const DEAL_EVERY = 6;
export const PILE_CARDS = 7;
/** The label's last word rolls to its new word over SWAP frames (60 fps): a glide, never a pop. */
export const SWAP = 16;

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

/** A line on a confident preset: resolved when the preset has set it whole. */
const set = (id: string, preset: keyof typeof HERO_END, text: string, inF: number, out: number, o: Partial<Copy> = {}): Copy => ({ id, text, in: inF, resolved: inF + f60(HERO_END[preset](w(text))), out, ...o });
/** The read of a line of `n` words (film frames). */
const hold = (n: number) => f60(holdFor(n, pace));

type Plan = Record<ActName, number>;
/**
 * The house plan: 9 bars (a 2-bar open, a 1-bar mark, a 1-bar field, the 2-bar label, the 2-bar taglines (1 bar for the
 * claim's one line), the 1-bar lockup). Every exit cue waits for its line's read, so a longer line or a faster track grows the act that needs it by
 * a bar: at 150 BPM the field and the lockup take 2 (17 s with the tail; a 3-word opener keeps the open at 2), at
 * 104-120 BPM the house holds (18-21 s). Inside an act the beats spread to fill it, so nothing waits dead.
 */
const HOUSE: Plan = { open: 2, brand: 1, field: 1, label: 2, taglines: DEAL.taglines === 'claim' ? 1 : 2, end: 1 }; // the claim's one line takes a bar

/** Places the acts on a bar plan and every cue and line inside them; `late` lists acts whose line would be cut before its read. */
const build = (plan: Plan) => {
  const BEATS = {} as Record<ActName | 'last', number>;
  let acc = 0;
  for (const k of order) {
    BEATS[k] = acc;
    acc += 4 * plan[k];
  }
  BEATS.last = acc;
  const ACT = Object.fromEntries(
    order.map((k, i) => {
      const from = i === 0 ? 0 : bt(BEATS[k]);
      const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
      return [k, { from, dur: to - from }];
    }),
  ) as Record<ActName, { from: number; dur: number }>;
  const TOTAL = bt(BEATS.last) + TAIL;
  // a cue x beats into its act (an act given a bar more keeps its cues; the reads and exits below place the rest)
  const at = (act: ActName, x: number) => bt(BEATS[act] + x);
  const cut = (act: ActName) => ACT[act].from + ACT[act].dur;
  const C: Record<string, number> = {};
  // every exit cue waits for its line's read (a cue never shortens a read); an act that cannot hold its reads in
  // its bars gets a bar more (late, below)
  const tagPreset = 'crisp'; // the film's voice: the script's lines arrive on the crisp entry (the opener is the one contrast)
  const readEnd = (preset: keyof typeof HERO_END, text: string, inF: number, lead?: number) => inF + f60(HERO_END[preset](w(text), lead)) + hold(w(text));
  // open: the opener in one confident move; its words spread apart into the cut onto the stack, dealt or fanned
  C.what = at('open', 0);
  // land builds word by word (the first word leading) when the open holds it, else the whole line lands at once
  const fits = (lead: number) => onGridUp(onGridUp(Math.max(at('open', 4), readEnd(DEAL.open, L.what, C.what, lead))) + f60(SPREAD)) + f60(4) + hold(w(L.save.join(' '))) <= cut('open');
  const lead = DEAL.open === 'land' && !fits(1) ? w(L.what) : 1;
  C.spread = onGridUp(Math.max(at('open', 4), readEnd(DEAL.open, L.what, C.what, lead)));
  C.pile = onGridUp(C.spread + f60(SPREAD));
  C.deal = onGridUp(C.pile + f60(6));
  // the two words leave outward once read; the stack holds the frame alone (a beat with no copy)
  const saveRead = C.pile + f60(4) + hold(w(L.save.join(' ')));
  C.saveOut = saveRead + f60(6) <= cut('open') - f60(16) ? onGridUp(saveRead + f60(6)) : cut('open');
  // then the stack's own second beat (the fan closing, the pile pushed in), within 40 f of the words leaving
  C.gather = onGrid(Math.min(C.saveOut + f60(40), (C.saveOut + f60(16) + cut('open')) / 2));
  // brand: the mark arrives (spin or tile), the name slides out of it, the lockup rises into the cut
  C.brand = at('brand', 0);
  C.mark = DEAL.brand === 'tile' ? C.brand : at('brand', 0.25);
  C.rise = at('brand', 3);
  // field: the claim in the product's content; the field leaves up
  C.field = at('field', 0);
  C.find = at('field', 0.5);
  C.fieldOut = onGrid(cut('field') - f60(14));
  // once the claim is read the camera leans into its pill (a type push), then the field leaves up
  C.fieldPush = onGrid(Math.max(C.find + f60(30), Math.min(C.fieldOut - f60(30), (readEnd('crisp', L.find, C.find) + C.fieldOut) / 2)));
  // label: the label over moving content, its last word swapping once; the content rushes out
  C.label = at('label', 0);
  C.plan = at('label', 0.25);
  const planRead = readEnd('crisp', L.plan[0], C.plan);
  C.swap = onGridUp(Math.max(planRead, Math.min(at('label', 2 * plan.label), planRead + f60(40)))); // toward the act's middle, once read
  C.rushOut = onGridUp(Math.max(cut('label') - Math.max(f60(30), BEAT), C.swap + f60(SWAP) + hold(w(L.plan[1]))));
  // taglines: panel: two imperatives taking turns in front of the screen; claim: the first one alone at poster size on
  // the accent, held to the cut (one line at a time: never two poster lines in a row); a push into the cut
  C.taglines = at('taglines', 0);
  C.tag1 = at('taglines', 0.25);
  const oneTag = DEAL.taglines === 'claim';
  if (!oneTag) {
    C.tagOut = onGridUp(readEnd(tagPreset, L.taglines[0], C.tag1));
    // the first one's 14 f drop is over first
    C.tag2 = onGridUp(Math.max(C.tagOut + f60(20), Math.min(at('taglines', 2 * plan.taglines), C.tagOut + f60(44))));
  }
  // (the claim's push is a camera move under its one line, inside the act: it never waits for the read)
  C.push = onGrid(Math.max((oneTag ? C.tag1 : C.tag2) + f60(20), cut('taglines') - Math.min(f60(46), Math.max(f60(30), BEAT))));
  // end: the mark and the name, the close under them; the lockup holds about a second and a half with a creep, the
  // tail included: the close waits for the name's read and, where the act has room, comes up to a second later, so the
  // lockup is whole about half a second before the last bar line (an act grown a bar does not hold it for three)
  C.end = at('end', 0);
  C.endMark = C.end;
  const nameIn = DEAL.end === 'spin' ? C.endMark + f60(30) : C.endMark + f60(8);
  const closeGlide = f60(HERO_END.crisp(w(L.close)));
  const closeFirst = Math.max(at('end', 1.5), nameIn + f60(16) + hold(1));
  C.close = onGridUp(Math.max(closeFirst, Math.min(onGrid(cut('end') - TAIL - f60(30) - closeGlide), closeFirst + f60(60))));
  C.lockup = onGridUp(C.close + closeGlide);
  C.last = bt(BEATS.last);
  const nameAt = C.mark + (DEAL.brand === 'tile' ? f60(40) : f60(30));
  const COPY: Copy[] = [
    { id: 'what', text: L.what, in: C.what, resolved: C.what + f60(HERO_END[DEAL.open](w(L.what), lead)), out: C.spread },
    { id: 'save', text: L.save.join(' '), in: C.pile, resolved: C.pile + f60(4), out: C.saveOut },
    { id: 'brandName', text: AD.name, kind: 'name', in: nameAt, resolved: nameAt + f60(12), out: cut('brand') },
    set('find', 'crisp', L.find, C.find, C.fieldOut),
    set('plan', 'crisp', L.plan[0], C.plan, C.swap),
    { id: 'swap', text: L.plan[1], in: C.swap, resolved: C.swap + f60(SWAP), out: C.rushOut + f60(12), swap: 'plan' },
    set('tag.1', tagPreset, L.taglines[0], C.tag1, oneTag ? cut('taglines') : C.tagOut, { chain: 'tag', mode: 'replace' }),
    ...(oneTag ? [] : [set('tag.2', tagPreset, L.taglines[1], C.tag2, cut('taglines'), { chain: 'tag', mode: 'replace' })]), // cut on the push, still read
    { id: 'wordmark', text: AD.name, kind: 'name', in: nameIn, resolved: nameIn + f60(16), out: TOTAL },
    set('close', 'crisp', L.close, C.close, TOTAL),
  ];
  // a cue never shortens a read: a line whose read runs past its exit cue makes its act late (it gets a bar more)
  const late: ActName[] = [];
  for (const c of COPY) {
    if (c.kind || c.out >= TOTAL) continue;
    if (c.resolved + hold(w(c.text)) > c.out) late.push(order[order.findIndex((k) => cut(k) > c.in)] ?? 'end');
  }
  // the stack holds its two words' read, the field and the label leave in time, the lockup is whole before the bar ends
  if (saveRead > cut('open')) late.push('open');

  if (C.rushOut > cut('label') - f60(20)) late.push('label');
  if (!oneTag && C.push < C.tag2) late.push('taglines');
  if (C.lockup > cut('end') - TAIL - f60(12)) late.push('end'); // whole 0.2 s before the bar ends at least: the lock holds 1.2 s with the tail
  return { BEATS, ACT, TOTAL, C, COPY, late, lead };
};

// An act whose line cannot be read inside its bars at this tempo gets a bar more until it can (a faster track).
const plan: Plan = { ...HOUSE };
let made = build(plan);
for (let i = 0; i < 12 && made.late.length; i++) {
  for (const a of new Set(made.late)) plan[a] += 1;
  made = build(plan);
}
if (made.late.length) throw new Error(`timeline: the ${made.late.join(', ')} line cannot be read at ${BPM} BPM: shorten it (ad.ts)`);

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
/** How many words of the opener land together (land: the first leads when the open holds it, else all of them). */
export const OPEN_LEAD = made.lead;

/** The pile's deals: one card every DEAL_EVERY frames from the deal cue. */
export const DEALS = Array.from({ length: PILE_CARDS }, (_, i) => CUE.deal + f60(DEAL_EVERY * i));

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

/** A crisp film: fast tiles smear along their own travel (fx/Defocus DirBlur, SpinBlur), no shutter pass. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam is hidden inside a motion: the spread carried through the cut, the stack carried into the mark, the rise, the rush. */
export const SEAMS: Seam[] = [
  { at: CUE.pile, kind: 'morph', carry: 'scale', dir: 1, id: 'the-spread-carries-into-the-stack' },
  DEAL.brand === 'tile' ? { at: ACT.brand.from, kind: 'morph', carry: 'shape', id: 'the-tile-becomes-the-mark' } : { at: ACT.brand.from, kind: 'morph', carry: 'scale', id: 'the-stack-recedes-behind-the-mark' },
  { at: ACT.field.from, kind: 'velocity', carry: 'y', dir: -1, id: 'rise-into-the-field' },
  { at: ACT.label.from, kind: 'velocity', carry: 'y', dir: -1, id: 'field-leaves-up' },
  // the rush carried into the panel; on the claim the accent wipes in on it and covers the frame on the cut
  DEAL.taglines === 'claim' ? { at: ACT.taglines.from, kind: 'wipe', carry: 'x', dir: 1, signature: true, id: 'the-accent-wipes-in-on-the-rush' } : { at: ACT.taglines.from, kind: 'velocity', carry: 'x', dir: 1, signature: true, id: 'the-rush' },
  { at: ACT.end.from, kind: 'hard', id: 'push-into-the-lockup' },
];
/** No designed one-frame steps: every change glides (lib/continuity). */
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events: the taglines' claim floods the frame with the accent; otherwise the accent stays on words, pills and the mark. */
export const COLOUR: ColourRange[] = DEAL.taglines === 'claim' ? [{ from: ACT.taglines.from - f60(20), to: ACT.end.from, id: 'claim-on-the-accent' }] : [];
/** The one lock: the mark, the name and the close hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** No underdamped spring: every landing settles critically. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'pile', 'brand' and 'lockup'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  what: 'copy', spread: 'move', pile: 'cut', deal: 'hit', saveOut: 'move', gather: 'move',
  brand: 'cut', mark: 'hit', rise: 'move',
  field: 'cut', find: 'copy', fieldPush: 'move', fieldOut: 'move',
  label: 'cut', plan: 'copy', swap: 'copy', rushOut: 'move',
  taglines: 'cut', tag1: 'copy', ...(DEAL.taglines === 'claim' ? {} : { tagOut: 'move' as const, tag2: 'copy' as const }), push: 'move',
  end: 'cut', endMark: 'hit', close: 'copy', lockup: 'hit', last: 'cut',
};

/** Every on-screen word of the film. */
export const COPY: Copy[] = made.COPY;

/**
 * Each act's light event (acts/stage.tsx LightEvent: the light on the page changes once) in the act's longest
 * stretch where nothing arrives or leaves, a second or more after its cut where the act is long enough (look-audit
 * skips the second after a cut), on the 16th grid.
 */
const lightCue = (act: ActName) => {
  const a = ACT[act].from;
  const z = a + ACT[act].dur - (act === 'end' ? TAIL : 0);
  const marks = [...Object.values(CUE), ...COPY.flatMap((c) => [c.in, c.resolved, c.out])].filter((f) => f > a && f < z).sort((p, q) => p - q);
  let best: [number, number] = [a, z];
  let edge = a;
  let len = 0;
  for (const f of [...marks, z]) {
    if (f - edge > len) {
      len = f - edge;
      best = [edge, f];
    }
    edge = f;
  }
  const want = Math.max(a + Math.min(f60(60), ACT[act].dur * 0.4), Math.round((best[0] + best[1]) / 2));
  const g = onGridUp(want);
  return g < z ? g : onGrid(z - 1, a);
};
for (const act of order) {
  CUE[`${act}Light`] = lightCue(act);
  SALIENCE[`${act}Light`] = 'life';
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
