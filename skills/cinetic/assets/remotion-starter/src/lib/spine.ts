// The spine: a film as ONE sentence played as 3-5 acts. Each act is one verb of the sentence, done to ONE case (the same
// request, names and numbers from the input to the result) by ONE element whose form changes from act to act (word,
// pill, page, button, notice, count, mark ...). Every change of scene hands the element on (a handover: it grows,
// shrinks, swells and swaps, opens, flies, converges ...), lines stand alone only for the promise and the claim (the
// lines between live inside the product's own words or around the element), the world changes one step per act, and
// the lockup grows out of the element's last form. references/spine.md is the guide; this file is the grammar as code.
// Pure and Node-safe: no React, no DOM, no clock.
//
// ------------------------------------------------------------------------------------------------------------------
// THE CONTRACT: SPINE_PLAN. A template that plays a spine exports, from its timeline:
//
//     export const SPINE_PLAN: SpinePlan = planSpine(SPINE, { fps: FPS, b, bars: 8 });
//
// The checks (grid-check --part spine) read it without running anything else; every field is plain data (frames are
// absolute film frames, shares 0..1):
//
//   { v: 1, format: 'launch' | 'update', sentence, element,
//     case: { request, result?, who?, names: string[], numbers: string[] },
//     fps, from, to,                                   the body: acts cover [from, to)
//     acts:    [{ i, id, verb, from, to, bars, share, world, scenes: [scene i], strings: string[], case: boolean }],
//     scenes:  [{ i, act, k, form, name, from, to }],   every state of the element, in order (k: its place in the act)
//     changes: [{ i, at, span: [a, b], kind, id, from: { scene, act, form }, to: { ... }, boundary, carries, element,
//                 house, downbeat }],                    scene i -> i + 1; kind a handover ('grow' ...), 'cut' (a bare
//                                                       section break) or 'entry' (the mark's own entry on the kept
//                                                       ground); id 'H1'..'H14', 'cut', 'entry'; carries the channels
//                                                       ('E' element, 'A' anchor, 'G' ground, 'M' motion, 'O' optics)
//     lines:   [{ id, text, act, position: 'first' | 'middle' | 'last', place, join: { in, out } }],
//     end:     { kind, from, at, scene },               how the lockup arrives (a handover into 'mark', or 'entry')
//     world:   [{ act, step, at }],                     the world's one step per act (enter, closer, light, turn, pull-back, hold)
//     devices: [{ act, id, verb, form, signature, fits }],
//     kinds:   { grow: 2, ... },                        handover kinds used, with counts
//     share:   { element, withinAct, momentum, bare },  shares of the changes (withinAct: of the changes inside acts)
//     issues:  { errors: string[], warnings: string[] } validateSpine() on the spine and this plan }
//
// spineDeclares(plan) lists one seam per change (kind and carry for the seam checks, the handover in the seam's id:
// 'spine:H1-grow:request:pill>page', plus handover, element, forms, span, boundary and act fields) for SEAMS / sync.ts.
// ------------------------------------------------------------------------------------------------------------------
import type { Declares, Seam, SeamKind } from '../timeline';

// ---------------------------------------------------------------------------------------------------- vocabulary

/** The element's forms: what it is in a scene. A fixed vocabulary the kit draws (kit/screens forms). */
export const FORMS = ['word', 'pill', 'chip', 'button', 'card', 'page', 'window', 'list', 'notice', 'thread', 'photo', 'count', 'world', 'mark'] as const;
export type Form = (typeof FORMS)[number];

/** Where a line sits: alone (type only), over (a picture it does not touch), around (with the element), inside (the product's own words). */
export const PLACES = ['alone', 'over', 'around', 'inside'] as const;
export type Place = (typeof PLACES)[number];

/** The world's one change at an act's start: enter (act 1), closer, light, turn (the film's one colour or value event), pull-back (for the claim), hold. */
export const WORLD_STEPS = ['enter', 'closer', 'light', 'turn', 'pull-back', 'hold'] as const;
export type WorldStep = (typeof WORLD_STEPS)[number];

/** What carries over a change: E the element, A an anchor (a point or slot held), G the ground, M motion (speed), O optics (blur, light, flash). */
export type Channel = 'E' | 'A' | 'G' | 'M' | 'O';

export type SpineFormat = 'launch' | 'update';

/** The fourteen handovers, H1-H14 (references/spine.md has the recipes). */
export const HANDOVER_KINDS = ['grow', 'shrink', 'swell', 'press-open', 'iris', 'zoom-into', 'pull-out', 'fly', 'stay', 'word', 'part', 'converge', 'same-surface', 'momentum'] as const;
export type HandoverKind = (typeof HANDOVER_KINDS)[number];

/** How a handover's content changes: fade (A out over the first 35 %, B in over the last 40 %), swap (one frame, at the smallest or most blurred frame), keep (A until the end), none (the scenes draw it). */
export type ContentMode = 'fade' | 'swap' | 'keep' | 'none';

export type HandoverHouse = {
  id: string; // 'H1' ...
  what: string; // what carries
  when: string; // use it when
  frames: readonly [number, number]; // the house range, f@60
  lead: number; // house frames before the cut (the incoming scene's first frame), f@60
  leadMin?: number; // the fewest film frames the lead may take at any rate: a collapse of a large picture in fewer reads as a
  //                   dissolve squeezed into a frame or two (at 30 fps a 10 f@60 converge is 5 frames: forensics ghost-cut)
  land: number; // house frames from the cut to the landing, f@60
  channels: readonly Channel[]; // what it carries by itself (the ground is added when the world holds)
  seam: SeamKind; // the seam kind the checks know: what the handover really is (references/transitions.md section 3): a
  //                 shape becoming the next (morph), a collapse under a blur (defocus), a reveal through an opening or a
  //                 gap (mask), a push through the element (zoomThrough), an exit into a point and an entry out of it
  //                 (breath), speed alone (velocity)
  carry: NonNullable<Seam['carry']>;
  content: ContentMode;
  /** who draws the element: 'handover' (fx/Handover draws it across the cut), 'scene' (scene-internal: the scene draws it, the handover only declares) */
  draws: 'handover' | 'scene';
};

/**
 * The house handovers: frames f@60 (lead + land = the house length, inside `frames` unless a
 * note says the range counts one phase). The first recipe of a form pair (FORM_PAIRS) is the house default.
 */
export const HANDOVERS: Record<HandoverKind, HandoverHouse> = {
  grow: { id: 'H1', what: "the element's rect, radius and fill become the next screen; the content cross-blurs mid-way", when: 'the request becomes the result; a notice opens', frames: [24, 36], lead: 12, land: 18, channels: ['E'], seam: 'morph', carry: 'shape', content: 'fade', draws: 'handover' },
  shrink: { id: 'H2', what: 'the whole scene or card collapses into a chip or card under a 12-20 px blur', when: 'the whole becomes one item, a scene becomes a token', frames: [10, 20], lead: 12, land: 8, channels: ['E', 'A', 'O'], seam: 'defocus', carry: 'shape', content: 'swap', draws: 'handover' },
  swell: { id: 'H3', what: 'a small thing swells +40-60 % and is replaced at its pre-swell size, colour kept', when: 'a state becomes the next control: chip -> word, icon -> pill, status -> button', frames: [24, 46], lead: 12, land: 17, channels: ['E', 'A'], seam: 'morph', carry: 'shape', content: 'swap', draws: 'handover' },
  'press-open': { id: 'H4', what: 'a pressed button drains and opens as a window (a porthole); a line parts on the same spring', when: 'the press reveals who or what does the work', frames: [50, 70], lead: 22, land: 36, channels: ['E', 'A'], seam: 'mask', carry: 'shape', content: 'fade', draws: 'handover' },
  iris: { id: 'H5', what: "a circle (or the brand's shape) from the element opens onto the next world", when: 'a turn: into the product, out to the world', frames: [14, 76], lead: 0, land: 28, channels: ['E', 'A', 'O'], seam: 'mask', carry: 'shape', content: 'fade', draws: 'handover' },
  'zoom-into': { id: 'H6', what: 'an exponential push into the element until it is the frame; the next scene keeps scaling at a third of the last step', when: 'going inside: the screen, the photo, the app', frames: [36, 66], lead: 22, land: 28, channels: ['E', 'M'], seam: 'zoomThrough', carry: 'scale', content: 'none', draws: 'scene' },
  'pull-out': { id: 'H7', what: 'the detail is revealed as part of the next, bigger thing (a log-scale pull)', when: 'the macro type is the whole request; the 3D mark is the lockup', frames: [4, 78], lead: 30, land: 48, channels: ['E', 'M'], seam: 'zoomThrough', carry: 'scale', content: 'none', draws: 'scene' },
  fly: { id: 'H8', what: "the element launches on an arc and lands as the next scene's first element", when: 'something is sent or delivered', frames: [36, 56], lead: 14, land: 22, channels: ['E', 'M'], seam: 'morph', carry: 'shape', content: 'swap', draws: 'handover' },
  stay: { id: 'H9', what: 'the element holds while its surroundings change (others fade, the world swaps, a label changes)', when: 'choosing one of many; the same request, a new answer', frames: [16, 22], lead: 0, land: 18, channels: ['E', 'A'], seam: 'morph', carry: 'shape', content: 'keep', draws: 'scene' },
  word: { id: 'H10', what: 'a word survives the cut and becomes the next line, the name or the mark', when: "the case's key word becomes the claim or the name", frames: [1, 37], lead: 0, land: 36, channels: ['E', 'A'], seam: 'morph', carry: 'shape', content: 'keep', draws: 'handover' },
  part: { id: 'H11', what: "the line parts; the element appears in the gap or takes a word's slot", when: 'the line names the thing; the thing arrives in it', frames: [6, 36], lead: 0, land: 18, channels: ['E', 'A'], seam: 'mask', carry: 'shape', content: 'keep', draws: 'scene' },
  converge: { id: 'H12', what: 'many collapse to a point; the next element grows from it', when: 'many become one: results -> the count -> the mark', frames: [30, 60], lead: 10, leadMin: 8, land: 26, channels: ['E', 'A'], seam: 'breath', carry: 'shape', content: 'swap', draws: 'handover' },
  'same-surface': { id: 'H13', what: 'the camera makes one move across the same screen to the next state', when: 'the next step happens in the same product', frames: [34, 40], lead: 0, land: 36, channels: ['E', 'G', 'M'], seam: 'morph', carry: 'shape', content: 'keep', draws: 'scene' },
  momentum: { id: 'H14', what: 'speed only: a velocity cut or a whip, the same direction', when: 'a run of consequences of the same case; never between two subjects', frames: [20, 40], lead: 16, land: 18, channels: ['M'], seam: 'velocity', carry: 'x', content: 'none', draws: 'scene' },
};

/** A kind from its name or its catalogue id ('grow', 'H1', 'h1'); null when it is neither. */
export const kindOf = (x: string | undefined | null): HandoverKind | null => {
  if (!x) return null;
  const s = String(x).trim();
  if ((HANDOVER_KINDS as readonly string[]).includes(s)) return s as HandoverKind;
  const byId = HANDOVER_KINDS.find((k) => HANDOVERS[k].id.toLowerCase() === s.toLowerCase());
  return byId ?? null;
};

// ---------------------------------------------------------------------------------------------------- the form table

/** The rows of the form table: what the element is before a change (a window keeps its own row). */
export type FormRow = 'word' | 'pill' | 'card' | 'window' | 'button' | 'notice' | 'thread' | 'photo' | 'count' | 'world' | 'mark';
/** The columns: what it becomes (a window is a card here). */
export type FormCol = 'word' | 'pill' | 'card' | 'button' | 'notice' | 'thread' | 'photo' | 'count' | 'world' | 'mark';
export const ROW_OF: Record<Form, FormRow> = {
  word: 'word', pill: 'pill', chip: 'pill', button: 'button', card: 'card', page: 'card', window: 'window', list: 'notice', notice: 'notice', thread: 'thread', photo: 'photo', count: 'count', world: 'world', mark: 'mark',
};
export const COL_OF: Record<Form, FormCol> = {
  word: 'word', pill: 'pill', chip: 'pill', button: 'button', card: 'card', page: 'card', window: 'card', list: 'notice', notice: 'notice', thread: 'thread', photo: 'photo', count: 'count', world: 'world', mark: 'mark',
};

/** A cell's recipe: one handover, or two in a row through an intermediate form (`through`: add that scene). */
export type PairRecipe = HandoverKind | { via: readonly [HandoverKind, HandoverKind]; through: Form };

/**
 * Defaults by form pair: the first recipe is the house one, the others are dealt for variety. A pair with no cell needs
 * a chip or a point first: shrink it into a chip (shrink) or converge it through a point (converge), which are always
 * allowed. The word, world and pill -> word cells follow the catalogue's own "use it when" (a chip becoming a word, an
 * iris out to the world).
 */
export const FORM_PAIRS: Record<FormRow, Partial<Record<FormCol, readonly PairRecipe[]>>> = {
  word: { pill: ['swell', 'part'], card: [{ via: ['part', 'grow'], through: 'pill' }], button: ['part'], photo: ['part'], world: ['part'], mark: ['word'] },
  pill: { word: ['swell'], pill: ['same-surface'], card: ['grow', 'fly'], button: ['swell'], notice: ['fly'], thread: ['fly'], photo: ['grow'], count: ['shrink'], world: ['iris'], mark: ['converge', 'swell'] },
  card: { pill: ['shrink'], card: ['grow', 'same-surface'], button: ['same-surface'], notice: ['stay'], photo: ['zoom-into'], world: ['iris'], mark: ['pull-out', 'converge'] },
  window: { pill: ['swell'], card: ['iris'], thread: ['swell'], photo: ['iris'], world: ['iris'], mark: [{ via: ['iris', 'converge'], through: 'world' }] },
  button: { pill: ['swell'], card: ['press-open'], notice: ['fly', 'swell'], thread: ['fly'], photo: ['press-open'], world: ['press-open', 'iris'], mark: ['swell'] },
  notice: { pill: ['shrink'], card: [{ via: ['stay', 'grow'], through: 'notice' }], notice: ['momentum'], count: ['converge'], mark: ['converge'] },
  thread: {},
  photo: { pill: ['shrink'], card: ['shrink', 'zoom-into'], photo: ['stay'], world: ['zoom-into'], mark: ['converge'] },
  count: { pill: ['shrink'], mark: ['converge', 'pull-out'] },
  world: { pill: ['shrink'], world: ['stay'] },
  mark: {},
};

/** The recipes of a form pair (first: the house one); [] when the pair has no cell. */
export const pairRecipes = (from: Form, to: Form): readonly PairRecipe[] => FORM_PAIRS[ROW_OF[from]]?.[COL_OF[to]] ?? [];
/** The single handovers a pair allows directly (two-step recipes left out), house first. */
export const handoversFor = (from: Form, to: Form): HandoverKind[] => pairRecipes(from, to).filter((r): r is HandoverKind => typeof r === 'string');
/** True when `kind` may join `from` to `to`: a recipe of the pair, or one of the always-allowed ways through a chip (shrink into a pill or chip) or a point (converge). */
export const allows = (from: Form, to: Form, kind: HandoverKind) =>
  handoversFor(from, to).includes(kind) || kind === 'converge' || (kind === 'shrink' && COL_OF[to] === 'pill');

// ---------------------------------------------------------------------------------------------------- devices by verb

/** Devices by need: an act's verb picks its device, and the device must draw the element in that act's form. */
export const VERB_DEVICES: readonly { verbs: readonly string[]; devices: readonly string[] }[] = [
  { verbs: ['type', 'ask', 'prompt', 'request', 'tell', 'describe'], devices: ['macro-type', 'glass-input', 'black-glass'] },
  { verbs: ['write', 'make', 'build', 'create', 'generate', 'draft', 'design', 'turn'], devices: ['page-fly'] },
  { verbs: ['send', 'press', 'publish', 'ship', 'launch', 'submit', 'book', 'join', 'tap'], devices: ['push-press', 'porthole'] },
  { verbs: ['fill', 'arrive', 'notify', 'collect', 'land', 'report'], devices: ['toast-stack'] },
  { verbs: ['choose', 'find', 'match', 'pick', 'search', 'select', 'sort'], devices: ['fan-focus', 'focus-swap'] },
  { verbs: ['count', 'grow', 'measure', 'track', 'earn', 'sell'], devices: ['glass-counter', 'data-sculpture'] },
  { verbs: ['show', 'see', 'shoot', 'picture', 'view', 'preview'], devices: ['carousel', 'photo-develop'] },
  { verbs: ['connect', 'work', 'integrate', 'sync', 'link', 'import'], devices: ['glass-tiles', 'logo-orbit'] },
];
/** A verb's stem: lower case, its first word, -ing / -es / -s off ('publishes' -> 'publish', 'asks' -> 'ask'). */
export const stemVerb = (v: string) => {
  const w = String(v).trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && /(sh|ch|ss|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
};
/** The devices an act's verb asks for ([] when no family names it: then no device). */
export const devicesFor = (verb: string): string[] => {
  const s = stemVerb(verb);
  return VERB_DEVICES.filter((d) => d.verbs.some((v) => v === s || v === `${s}e` || s.startsWith(v))).flatMap((d) => [...d.devices]);
};

// ---------------------------------------------------------------------------------------------------- bands

/** The numbers the spine is checked against (from mapping product films of 7-35 s as chains). Shares 0..1. */
export const SPINE_BANDS = {
  acts: { launch: [3, 5], update: [3, 4] },
  firstShare: [0.2, 0.32], // the first act's share of the body (warn outside)
  lastShare: [0.12, 0.31], // the last act's
  scenes: [1, 3], // states of the element in one act
  carry: { fail: 0.5, warn: 0.65 }, // changes the element carries
  carryWithin: { fail: 0.6, warn: 0.75 }, // ... of the changes inside acts
  momentum: { fail: 0.3, warn: 0.2 }, // speed-only joins
  kinds: 3, // at least this many handover kinds a film
  leadKind: 0.6, // one kind may lead up to this share
  lines: 4, // statements in a 15-30 s film, besides the product's own words
} as const;

// ---------------------------------------------------------------------------------------------------- the spine

/** The case: the one request, record or person every act works on, in real words from the brief. */
export type SpineCase = { request: string; result?: string; who?: string; names?: string[]; numbers?: string[] };
/** How a line joins the chain on one side: through the element, an anchor (a slot or point held), or a swap in its slot. */
export type Join = 'element' | 'anchor' | 'swap';
export type Line = {
  text: string;
  place?: Place; // default: alone in the first and last act, inside between
  /** the line turns into the element's next form (its key word swells into the pill, parts for it, letter-swaps into the name): an out-join through the element */
  becomes?: Form;
  join?: { in?: Join; out?: Join };
  id?: string;
};
/** One state of the element: its form, the scene that draws it, and how it arrives there (else the form table's house recipe). */
export type Scene = { form: Form; name?: string; via?: HandoverKind | 'cut' | `H${number}`; dir?: 'left' | 'right' | 'up' | 'down' };
export type Device = { id: string; signature?: boolean; form?: Form };
export type Act = {
  id?: string;
  verb: string; // the act's verb in the sentence ('asks', 'writes', 'publishes', 'fills')
  scenes: (Scene | Form)[]; // 1-3 states of the element
  line?: Line;
  world?: WorldStep; // default: enter, closer, light, turn, pull-back by position
  bars?: number; // its length in bars (else shared: the first act about a quarter, the last about a fifth)
  share?: number;
  strings?: string[]; // the case's words this act shows (the request typed, a name, a number): the checks follow the case through them
  devices?: Device[];
};
export type Spine = {
  format?: SpineFormat; // default 'launch'
  sentence: string; // "[Name] [verb 1]s [the case], [verb 2]s it, ..."
  element: string; // the one element's id
  case: SpineCase;
  acts: Act[];
  claim?: Line; // the last line (alone, joined), in the last act
  /** the lockup: built from the last form (a handover into the mark), or 'entry' (the mark's own entry on the claim's kept ground) */
  end?: { via?: HandoverKind | 'entry' | `H${number}`; share?: number };
};

// ---------------------------------------------------------------------------------------------------- the plan

export type PlanAct = { i: number; id: string; verb: string; from: number; to: number; bars: number; share: number; world: WorldStep; scenes: number[]; strings: string[]; case: boolean };
export type PlanScene = { i: number; act: number; k: number; form: Form; name: string; from: number; to: number };
export type PlanEndpoint = { scene: number; act: number; form: Form };
export type PlanChange = {
  i: number;
  at: number; // the incoming scene's first frame
  span: [number, number]; // the handover's frames [at - lead, at + land)
  kind: HandoverKind | 'cut' | 'entry';
  id: string; // 'H1'..'H14', 'cut', 'entry'
  from: PlanEndpoint;
  to: PlanEndpoint;
  boundary: boolean; // an act boundary
  carries: Channel[];
  element: boolean; // the element carries it
  house: boolean; // the pair's house recipe
  downbeat: boolean; // on a bar line
  dir?: 'left' | 'right' | 'up' | 'down';
};
export type PlanLine = { id: string; text: string; act: number; position: 'first' | 'middle' | 'last'; place: Place; join: { in: Join | null; out: Join | null } };
export type PlanEnd = { kind: HandoverKind | 'entry' | 'cut'; from: Form; at: number; scene: number };
export type PlanWorld = { act: number; step: WorldStep; at: number };
export type PlanDevice = { act: number; id: string; verb: string; form: Form; signature: boolean; fits: boolean };
export type SpineIssues = { errors: string[]; warnings: string[] };
export type SpinePlan = {
  v: 1;
  format: SpineFormat;
  sentence: string;
  element: string;
  case: Required<Pick<SpineCase, 'request'>> & { result?: string; who?: string; names: string[]; numbers: string[] };
  fps: number;
  from: number;
  to: number;
  acts: PlanAct[];
  scenes: PlanScene[];
  changes: PlanChange[];
  lines: PlanLine[];
  end: PlanEnd;
  world: PlanWorld[];
  devices: PlanDevice[];
  kinds: Partial<Record<HandoverKind, number>>;
  share: { element: number; withinAct: number; momentum: number; bare: number };
  issues: SpineIssues;
};

/** The music grid planSpine lays acts on: b(bar, beat) -> absolute frame (the timeline's own b()), the body's bars, its first bar. */
export type SpineGrid = { fps: number; b: (bar: number, beat?: number, sub?: number) => number; bars: number; start?: number };

const sceneOf = (s: Scene | Form): Scene => (typeof s === 'string' ? { form: s } : s);
const isForm = (x: unknown): x is Form => typeof x === 'string' && (FORMS as readonly string[]).includes(x);
const words = (s: string) => String(s).split(/\s+/).filter(Boolean);

/** The world steps by position when an act names none: enter first, pull-back last, the turn on the last middle act. */
export const defaultWorld = (n: number): WorldStep[] => {
  if (n <= 1) return ['enter'];
  if (n === 2) return ['enter', 'pull-back'];
  if (n === 3) return ['enter', 'turn', 'pull-back'];
  if (n === 4) return ['enter', 'closer', 'turn', 'pull-back'];
  return ['enter', 'closer', ...Array.from({ length: n - 4 }, () => 'light' as WorldStep), 'turn', 'pull-back'];
};

/** The default act shares: the first a quarter, the last a fifth, the middle acts the rest equally. */
export const defaultShares = (n: number): number[] => {
  if (n <= 1) return [1];
  if (n === 2) return [0.55, 0.45];
  const mid = (1 - 0.25 - 0.18) / (n - 2);
  return Array.from({ length: n }, (_, i) => (i === 0 ? 0.25 : i === n - 1 ? 0.18 : mid));
};

/** Whole bars for weights summing to `total` (largest remainder, at least 1 each; fixed entries kept). */
const allocate = (total: number, weights: number[], fixed: (number | undefined)[]): number[] => {
  const out = fixed.map((v) => (v !== undefined ? Math.max(1, Math.round(v)) : 0));
  const free = weights.map((_, i) => fixed[i] === undefined);
  const left = Math.max(0, total - out.reduce((a, v) => a + v, 0));
  const wsum = weights.reduce((a, w, i) => a + (free[i] ? Math.max(1e-6, w) : 0), 0);
  const nFree = free.filter(Boolean).length;
  if (!nFree) return out;
  const raw = weights.map((w, i) => (free[i] ? (left * Math.max(1e-6, w)) / wsum : 0));
  const base = raw.map((r, i) => (free[i] ? Math.max(1, Math.floor(r)) : 0));
  let rest = left - base.reduce((a, v) => a + v, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).filter((o) => free[o.i]).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (let k = 0; rest > 0 && order.length; k = (k + 1) % order.length, rest--) base[order[k].i]++;
  for (let k = order.length - 1; rest < 0 && k >= 0; k--) if (base[order[k].i] > 1) { base[order[k].i]--; rest++; }
  return out.map((v, i) => (free[i] ? base[i] : v));
};

/** The frames of a handover kind at a film's rate: [lead, land] in film frames (a lead never under the kind's leadMin). */
export const handoverFrames = (kind: HandoverKind, fps: number): [number, number] => {
  const H = HANDOVERS[kind];
  const k = fps / 60;
  return [H.lead ? Math.max(1, H.leadMin ?? 1, Math.round(H.lead * k)) : 0, Math.max(1, Math.round(H.land * k))];
};

/** The case's words to look for in an act's strings: the request, the result, every name and number, the request's content words. */
const caseTerms = (c: SpineCase) => {
  const terms = [c.request, c.result, ...(c.names ?? []), ...(c.numbers ?? [])].filter((s): s is string => !!s && !!String(s).trim()).map((s) => s.toLowerCase());
  const content = words(c.request).map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')).filter((w) => w.length >= 5);
  return { terms, content };
};
/** True when `strings` show the case: a whole case string, or two of the request's content words. */
const showsCase = (strings: string[], c: SpineCase) => {
  const { terms, content } = caseTerms(c);
  const hay = strings.join(' • ').toLowerCase();
  if (terms.some((t) => hay.includes(t))) return true;
  return content.filter((w) => hay.includes(w)).length >= Math.min(2, content.length);
};

type FlatScene = { act: number; k: number; form: Form; name: string; via?: string; dir?: Scene['dir']; mark?: boolean };
const flatten = (spine: Spine): FlatScene[] => {
  const out: FlatScene[] = [];
  spine.acts.forEach((a, i) => (a.scenes ?? []).map(sceneOf).forEach((s, k) => out.push({ act: i, k, form: s.form, name: s.name ?? `${s.form}${i + 1}`, via: s.via, dir: s.dir })));
  const last = out[out.length - 1];
  if (last && last.form !== 'mark' && spine.acts.length) out.push({ act: spine.acts.length - 1, k: (spine.acts[spine.acts.length - 1].scenes ?? []).length, form: 'mark', name: 'lockup', via: spine.end?.via, mark: true });
  return out;
};

const choose = (from: Form, to: Form, used: Partial<Record<string, number>>): HandoverKind | null => {
  const opts = handoversFor(from, to);
  if (!opts.length) return null;
  // variety from the deal: the least used of the pair's recipes, house first on a tie
  return opts.slice().sort((a, b) => (used[a] ?? 0) - (used[b] ?? 0) || opts.indexOf(a) - opts.indexOf(b))[0];
};

/**
 * The spine on the music grid: acts on whole bars (the first about a quarter, the last about a fifth, or each act's
 * `bars` / `share`), each act's scenes on whole beats inside it, one change per scene boundary with its handover (the
 * scene's `via`, else the form table's recipe, the least used one first so a film plays several kinds), the lockup
 * as the last act's last scene (added when the spine ends on another form), lines placed, world steps, devices, and
 * validateSpine() on the result in `issues`. Throws only when it cannot plan at all (no acts, fewer bars than acts).
 */
export const planSpine = (spine: Spine, grid: SpineGrid): SpinePlan => {
  const n = spine.acts?.length ?? 0;
  if (!n) throw new Error('planSpine: the spine has no acts');
  if (!(grid.bars >= n)) throw new Error(`planSpine: ${grid.bars} bars for ${n} acts: every act needs a bar at least`);
  const start = grid.start ?? 1;
  const fps = grid.fps;
  const weights = spine.acts.map((a, i) => a.share ?? defaultShares(n)[i]);
  const bars = allocate(grid.bars, weights, spine.acts.map((a) => a.bars));
  const total = bars.reduce((x, v) => x + v, 0);
  const worlds = defaultWorld(n);
  const flat = flatten(spine);
  let bar = start;
  const acts: PlanAct[] = spine.acts.map((a, i) => {
    const from = grid.b(bar);
    const to = grid.b(bar + bars[i]);
    const strings = (a.strings ?? []).map(String);
    const act: PlanAct = { i, id: a.id ?? `act${i + 1}`, verb: a.verb, from, to, bars: bars[i], share: bars[i] / total, world: a.world ?? worlds[i], scenes: [], strings, case: strings.length ? showsCase(strings, spine.case) : false };
    (act as PlanAct & { bar0: number }).bar0 = bar;
    bar += bars[i];
    return act;
  });
  const bodyFrom = acts[0].from;
  const bodyTo = acts[n - 1].to;
  const downbeats = new Set<number>();
  for (let k = start; k <= start + total; k++) downbeats.add(grid.b(k));

  // scenes on whole beats inside their act (the lockup takes the last ~40 % of the last act, at least two beats)
  const scenes: PlanScene[] = [];
  acts.forEach((act) => {
    const own = flat.filter((s) => s.act === act.i);
    const beats = act.bars * 4;
    const hasMark = own.some((s) => s.mark);
    const plain = own.filter((s) => !s.mark);
    const markBeats = hasMark ? Math.max(1, Math.min(beats - plain.length, Math.max(2, Math.round(beats * (spine.end?.share ?? 0.4))))) : 0;
    const restBeats = beats - markBeats;
    const b0 = (act as PlanAct & { bar0: number }).bar0;
    const at = (beat: number) => grid.b(b0 + Math.floor(beat / 4), beat % 4);
    own.forEach((s) => {
      const j = plain.indexOf(s);
      const off = s.mark ? restBeats : Math.round((j * restBeats) / Math.max(1, plain.length));
      const end = s.mark ? beats : j + 1 < plain.length ? Math.round(((j + 1) * restBeats) / plain.length) : restBeats;
      const i = scenes.length;
      scenes.push({ i, act: act.i, k: s.k, form: s.form, name: s.name, from: off === 0 ? act.from : at(off), to: end >= beats ? act.to : at(end) });
      act.scenes.push(i);
    });
  });
  for (const a of acts) delete (a as Partial<PlanAct & { bar0: number }>).bar0;

  // changes, one per scene boundary
  const used: Partial<Record<string, number>> = {};
  const changes: PlanChange[] = [];
  for (let i = 0; i + 1 < scenes.length; i++) {
    const A = scenes[i];
    const B = scenes[i + 1];
    const fb = flat[i + 1];
    const boundary = A.act !== B.act;
    const pinned = fb.via;
    let kind: HandoverKind | 'cut' | 'entry';
    if (pinned === 'cut' || pinned === 'entry') kind = pinned;
    else kind = kindOf(pinned) ?? choose(A.form, B.form, used) ?? (COL_OF[B.form] === 'pill' ? 'shrink' : 'converge');
    if (kind !== 'cut' && kind !== 'entry') used[kind] = (used[kind] ?? 0) + 1;
    const turn = boundary && acts[B.act].world === 'turn';
    const own: Channel[] = kind === 'cut' || kind === 'entry' ? [] : [...HANDOVERS[kind].channels];
    // the ground carries unless this act boundary is the world's turn (its one value event)
    if (turn) own.splice(0, own.length, ...own.filter((x) => x !== 'G'));
    else if (!own.includes('G')) own.push('G');
    const [lead, land] = kind === 'cut' || kind === 'entry' ? [0, 1] : handoverFrames(kind, fps);
    const at = B.from;
    const house = kind !== 'cut' && kind !== 'entry' && handoversFor(A.form, B.form)[0] === kind;
    const ch: PlanChange = {
      i,
      at,
      span: [at - lead, at + land],
      kind,
      id: kind === 'cut' || kind === 'entry' ? kind : HANDOVERS[kind].id,
      from: { scene: A.i, act: A.act, form: A.form },
      to: { scene: B.i, act: B.act, form: B.form },
      boundary,
      carries: own,
      element: own.includes('E'),
      house,
      downbeat: downbeats.has(at),
    };
    if (kind === 'momentum') ch.dir = fb.dir ?? 'left';
    changes.push(ch);
  }

  // lines
  const lines: PlanLine[] = [];
  const position = (i: number): PlanLine['position'] => (i === 0 ? 'first' : i === n - 1 ? 'last' : 'middle');
  const lineOf = (l: Line, act: number, id: string): PlanLine => {
    const pos = position(act);
    const place: Place = l.place ?? (pos === 'middle' ? 'inside' : 'alone');
    const out: Join | null = l.join?.out ?? (l.becomes ? 'element' : null);
    return { id: l.id ?? id, text: l.text, act, position: pos, place, join: { in: l.join?.in ?? null, out } };
  };
  spine.acts.forEach((a, i) => {
    if (a.line?.text) lines.push(lineOf(a.line, i, `line${lines.length + 1}`));
  });
  if (spine.claim?.text) lines.push(lineOf(spine.claim, n - 1, 'claim'));

  const world: PlanWorld[] = acts.map((a) => ({ act: a.i, step: a.world, at: a.from }));
  const devices: PlanDevice[] = spine.acts.flatMap((a, i) =>
    (a.devices ?? []).map((d) => {
      const form = d.form ?? scenes.find((s) => s.act === i)?.form ?? 'card';
      return { act: i, id: d.id, verb: a.verb, form, signature: !!d.signature, fits: devicesFor(a.verb).includes(d.id) };
    }),
  );
  const kinds: Partial<Record<HandoverKind, number>> = {};
  for (const c of changes) if (c.kind !== 'cut' && c.kind !== 'entry') kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
  const within = changes.filter((c) => !c.boundary);
  const momentumOnly = (c: PlanChange) => c.carries.includes('M') && !c.carries.includes('E') && !c.carries.includes('A');
  const share = {
    element: changes.length ? changes.filter((c) => c.element).length / changes.length : 1,
    withinAct: within.length ? within.filter((c) => c.element).length / within.length : 1,
    momentum: changes.length ? changes.filter(momentumOnly).length / changes.length : 0,
    bare: changes.length ? changes.filter((c) => c.kind === 'cut').length / changes.length : 0,
  };
  const lastChange = changes[changes.length - 1];
  const lastScene = scenes[scenes.length - 1];
  const end: PlanEnd = lastScene.form === 'mark' && lastChange
    ? { kind: lastChange.kind, from: lastChange.from.form, at: lastChange.at, scene: lastScene.i }
    : { kind: 'entry', from: lastScene.form, at: lastScene.from, scene: lastScene.i };
  const c = spine.case ?? { request: '' };
  const plan: SpinePlan = {
    v: 1,
    format: spine.format ?? 'launch',
    sentence: spine.sentence,
    element: spine.element,
    case: { request: c.request, ...(c.result ? { result: c.result } : {}), ...(c.who ? { who: c.who } : {}), names: [...(c.names ?? [])], numbers: [...(c.numbers ?? [])] },
    fps,
    from: bodyFrom,
    to: bodyTo,
    acts,
    scenes,
    changes,
    lines,
    end,
    world,
    devices,
    kinds,
    share,
    issues: { errors: [], warnings: [] },
  };
  plan.issues = validateSpine(spine, plan);
  return plan;
};

// ---------------------------------------------------------------------------------------------------- validation

const pct = (x: number) => `${Math.round(x * 100)} %`;

/**
 * The spine's rules, before anything renders. Errors break the grammar (the checks fail them); warnings are where a
 * film leaves the house ranges. With a plan (planSpine's), the measured ones too: act shares, handover variety,
 * the element's share of the changes, speed-only joins. Pure.
 */
export const validateSpine = (spine: Spine, plan?: SpinePlan): SpineIssues => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const format: SpineFormat = spine.format ?? 'launch';
  const acts = spine.acts ?? [];
  const n = acts.length;
  if (!spine.element || !String(spine.element).trim()) errors.push('element: name the one element every act carries (one id: "request", "hike-card")');
  if (!spine.sentence || !String(spine.sentence).trim()) errors.push('sentence: write the film as one sentence ("[Name] [verb]s [the case], [verb]s it ...")');
  else {
    if (/\band also\b/i.test(spine.sentence)) errors.push(`sentence: "${spine.sentence}" needs "and also": that is two films; cut one idea`);
    if (words(spine.sentence).length > 22) warnings.push(`sentence: ${words(spine.sentence).length} words; one action reads in 8-16`);
  }
  const [lo, hi] = SPINE_BANDS.acts[format];
  if (n < lo || n > hi) errors.push(`acts: ${n} acts; a ${format} spine plays ${lo}-${hi} (one verb each)`);

  // the case
  const c = spine.case;
  if (!c || !c.request || !String(c.request).trim()) errors.push('case: give the one request (real words from the brief: the sentence typed, the record, the person) every act works on');
  for (const k of ['names', 'numbers'] as const) if (c && c[k] !== undefined && !(Array.isArray(c[k]) && (c[k] as unknown[]).every((s) => typeof s === 'string' && s.trim()))) errors.push(`case.${k}: a list of the case's ${k} as they appear on screen`);
  if (c && c.request) {
    const withStrings = acts.filter((a) => (a.strings ?? []).length);
    if (!withStrings.length) warnings.push('case: no act lists its strings; give each act the case words it shows (strings) so the checks can follow the case');
    else {
      const showing = acts.filter((a) => (a.strings ?? []).length && showsCase((a.strings ?? []).map(String), c)).length;
      if (showing < 2) errors.push(`case: the case shows in ${showing} act${showing === 1 ? '' : 's'}; the same request, names and numbers recur from the input to the result (2-4 acts)`);
    }
  }

  // acts, scenes and the forms chain
  const flat = flatten(spine);
  acts.forEach((a, i) => {
    const where = `act ${i + 1}${a.verb ? ` (${a.verb})` : ''}`;
    if (!a.verb || !String(a.verb).trim()) errors.push(`act ${i + 1}: give its verb (one verb of the sentence)`);
    const sc = (a.scenes ?? []).map(sceneOf);
    if (!sc.length) errors.push(`${where}: no scene; give 1-3 states of the element`);
    if (sc.length > SPINE_BANDS.scenes[1]) warnings.push(`${where}: ${sc.length} scenes; an act holds 1-3 states of the element (a scene that does not move the case is cut)`);
    sc.forEach((s, k) => {
      if (!isForm(s.form)) errors.push(`${where} scene ${k + 1}: form "${s.form}" is not one of ${FORMS.join(', ')}`);
      if (s.via !== undefined && s.via !== 'cut' && !kindOf(s.via)) errors.push(`${where} scene ${k + 1}: via "${s.via}" is not a handover (${HANDOVER_KINDS.join(', ')}, H1-H14) or 'cut'`);
    });
    if (a.world !== undefined && !(WORLD_STEPS as readonly string[]).includes(a.world)) errors.push(`${where}: world "${a.world}" is not one of ${WORLD_STEPS.join(', ')}`);
  });
  if (spine.end?.via !== undefined && spine.end.via !== 'entry' && !kindOf(spine.end.via)) errors.push(`end: via "${spine.end.via}" is neither a handover into the mark nor 'entry'`);
  let cuts = 0;
  let cutBounds = 0;
  for (let i = 0; i + 1 < flat.length; i++) {
    const A = flat[i];
    const B = flat[i + 1];
    if (!isForm(A.form) || !isForm(B.form)) continue;
    const where = `${A.form} -> ${B.form}${B.mark ? ' (the lockup)' : ` (act ${B.act + 1})`}`;
    const pinned = B.via;
    if (pinned === 'cut') {
      cuts++;
      if (A.act === B.act) errors.push(`${where}: a bare cut inside an act; carry the element (a cut only as a section break between acts, at most once)`);
      else cutBounds++;
      continue;
    }
    if (pinned === 'entry') {
      if (!B.mark) errors.push(`${where}: 'entry' is only for the lockup (the mark's own entry on the kept ground)`);
      continue;
    }
    const k = kindOf(pinned ?? null);
    const recipes = pairRecipes(A.form, B.form);
    const two = recipes.find((r) => typeof r !== 'string') as Exclude<PairRecipe, HandoverKind> | undefined;
    if (k) {
      if (!allows(A.form, B.form, k)) warnings.push(`${where}: ${k} is not a recipe of this pair${recipes.length ? ` (house: ${recipes.map((r) => (typeof r === 'string' ? r : `${r.via.join(' then ')} through a ${r.through}`)).join(', ')})` : ''}`);
    } else if (!handoversFor(A.form, B.form).length) {
      if (two) errors.push(`${where}: this pair goes ${two.via.join(' then ')} through a ${two.through}: add a ${two.through} scene between them`);
      else if (COL_OF[B.form] !== 'pill') errors.push(`${where}: no handover joins these forms; go through a chip first (shrink into a chip scene) or a point (via: 'converge')`);
    }
  }
  if (cutBounds > 1) errors.push(`cuts: ${cutBounds} bare act boundaries; at most one section break a film`);
  if (cuts > cutBounds + 1) errors.push(`cuts: ${cuts} bare cuts; at most one, at an act boundary`);

  // lines
  const lines: { l: Line; act: number }[] = [];
  acts.forEach((a, i) => a.line?.text && lines.push({ l: a.line, act: i }));
  if (spine.claim?.text) lines.push({ l: spine.claim, act: n - 1 });
  let middleAlone = 0;
  let over = 0;
  let near = 0;
  for (const { l, act } of lines) {
    const pos = act === 0 ? 'first' : act === n - 1 ? 'last' : 'middle';
    const place = l.place ?? (pos === 'middle' ? 'inside' : 'alone');
    if (!(PLACES as readonly string[]).includes(place)) { errors.push(`line "${l.text}": place "${place}" is not one of ${PLACES.join(', ')}`); continue; }
    const joined = !!(l.becomes || l.join?.in || l.join?.out);
    if (place === 'alone' && pos === 'middle') {
      middleAlone++;
      if (!joined) errors.push(`line "${l.text}" (act ${act + 1}): an alone line in a middle act must come in or go out through the element, an anchor or a swap in its slot (becomes / join); else put it inside the product's words or around the element`);
    }
    if (place === 'alone' && !joined) warnings.push(`line "${l.text}": alone and joined on neither side (let it be born from the element or turn into it: becomes)`);
    if (place === 'over') over++;
    if (place === 'inside' || place === 'around') near++;
    if (l.becomes !== undefined && !isForm(l.becomes)) errors.push(`line "${l.text}": becomes "${l.becomes}" is not a form`);
  }
  if (middleAlone > 2) errors.push(`lines: ${middleAlone} alone lines in middle acts; at most one joined pair between the promise and the claim`);
  if (over > 1) warnings.push(`lines: ${over} lines over a picture they do not touch; once a film at most`);
  if (lines.length >= 2 && near < lines.length / 2) warnings.push(`lines: ${near} of ${lines.length} lines inside the product's words or around the element; aim for half or more`);
  if (lines.length > SPINE_BANDS.lines + 1) warnings.push(`lines: ${lines.length} statements; a 15-30 s film holds about ${SPINE_BANDS.lines} besides the product's own words`);

  // world
  const steps = acts.map((a, i) => a.world ?? defaultWorld(n)[i]);
  if (n && steps[0] !== 'enter') warnings.push(`world: act 1 steps "${steps[0]}"; the first act enters the world (seen sharp, then the lens racks to the element)`);
  const turns = steps.filter((s) => s === 'turn').length;
  if (turns > 1) errors.push(`world: ${turns} turns; the film has one colour or value event`);
  steps.forEach((s, i) => s === 'pull-back' && i !== n - 1 && warnings.push(`world: act ${i + 1} pulls back; the place goes wide again for the claim and the lockup (the last act)`));

  // devices
  const devs = acts.flatMap((a, i) => (a.devices ?? []).map((d) => ({ d, a, i })));
  if (devs.length > n + 1) errors.push(`devices: ${devs.length} for ${n} acts; no more than acts + 1`);
  const sigs = devs.filter((x) => x.d.signature).length;
  if (sigs > 1) errors.push(`devices: ${sigs} signature events; one a film, at the turn`);
  for (const { d, a, i } of devs) if (!devicesFor(a.verb).includes(d.id)) warnings.push(`devices: ${d.id} in act ${i + 1} serves no verb of "${a.verb}" (${devicesFor(a.verb).join(', ') || 'no device'}): a device with no verb is out`);

  // the plan: measured
  if (plan) {
    const P = plan;
    if (P.acts.length) {
      const f = P.acts[0].share;
      const l = P.acts[P.acts.length - 1].share;
      if (f < SPINE_BANDS.firstShare[0] || f > SPINE_BANDS.firstShare[1]) warnings.push(`shares: the first act is ${pct(f)} of the body (20-32 %)`);
      if (l < SPINE_BANDS.lastShare[0] || l > SPINE_BANDS.lastShare[1]) warnings.push(`shares: the last act is ${pct(l)} (12-31 %)`);
    }
    const used = Object.entries(P.kinds).filter(([, v]) => (v ?? 0) > 0);
    const totalK = used.reduce((a, [, v]) => a + (v ?? 0), 0);
    if (P.changes.length >= 4 && used.length < SPINE_BANDS.kinds) warnings.push(`handovers: ${used.length} kind${used.length === 1 ? '' : 's'} (${used.map(([k]) => k).join(', ')}); play at least ${SPINE_BANDS.kinds}`);
    for (const [k, v] of used) if (totalK >= 4 && (v ?? 0) / totalK > SPINE_BANDS.leadKind) warnings.push(`handovers: ${k} carries ${pct((v ?? 0) / totalK)} of the changes; one house kind may lead up to 60 %`);
    if (P.share.element < SPINE_BANDS.carry.fail) errors.push(`carry: the element carries ${pct(P.share.element)} of the changes (50 % at least, 65 % or more reads as one chain)`);
    else if (P.share.element < SPINE_BANDS.carry.warn) warnings.push(`carry: the element carries ${pct(P.share.element)} of the changes (65 % or more)`);
    if (P.share.withinAct < SPINE_BANDS.carryWithin.fail) errors.push(`carry: ${pct(P.share.withinAct)} of the changes inside acts carry the element (60 % at least)`);
    else if (P.share.withinAct < SPINE_BANDS.carryWithin.warn) warnings.push(`carry: ${pct(P.share.withinAct)} of the changes inside acts carry the element (75 % or more)`);
    if (P.share.momentum > SPINE_BANDS.momentum.fail) errors.push(`momentum: ${pct(P.share.momentum)} of the changes join by speed alone (30 % at most)`);
    else if (P.share.momentum > SPINE_BANDS.momentum.warn) warnings.push(`momentum: ${pct(P.share.momentum)} of the changes join by speed alone (20 % or less)`);
    for (const ch of P.changes) if (ch.kind === 'cut' && ch.boundary && !ch.downbeat) warnings.push(`cuts: the section break at f${ch.at} is off the downbeat`);
    for (const s of P.scenes) if (!(s.to > s.from)) errors.push(`scenes: ${s.name} (act ${s.act + 1}) has no frames: give the act more bars or fewer scenes`);
  }
  return { errors, warnings };
};

// ---------------------------------------------------------------------------------------------------- declares

/** A spine seam: the timeline's seam plus what the spine knows about it (export-cues keeps the seam fields; the id names the handover). */
export type SpineSeam = Seam & { handover: HandoverKind | 'cut'; hid: string; element: string; forms: [Form, Form]; span: [number, number]; boundary: boolean; act: number };

/**
 * The plan's changes as seams, for the timeline's SEAMS or src/sync.ts declares(): one per change (the mark's own entry
 * declares nothing), its kind and carry for the seam checks, the handover in its id ('spine:H1-grow:request:pill>page',
 * 'spine:cut:...'), and a momentum seam's direction.
 */
export const spineDeclares = (plan: SpinePlan): Declares & { seams: SpineSeam[] } => {
  const seams: SpineSeam[] = [];
  for (const c of plan.changes) {
    if (c.kind === 'entry') continue;
    const forms: [Form, Form] = [c.from.form, c.to.form];
    const tag = `${plan.element}:${forms[0]}>${forms[1]}`;
    if (c.kind === 'cut') {
      seams.push({ at: c.at, kind: 'hard', id: `spine:cut:${tag}`, handover: 'cut', hid: 'cut', element: plan.element, forms, span: c.span, boundary: c.boundary, act: c.to.act });
      continue;
    }
    const H = HANDOVERS[c.kind];
    const s: SpineSeam = { at: c.at, kind: H.seam, carry: H.carry, id: `spine:${H.id}-${c.kind}:${tag}`, handover: c.kind, hid: H.id, element: plan.element, forms, span: c.span, boundary: c.boundary, act: c.to.act };
    if (c.kind === 'momentum') {
      const d = c.dir ?? 'left';
      s.carry = d === 'left' || d === 'right' ? 'x' : 'y';
      s.dir = d === 'left' || d === 'up' ? -1 : 1;
    }
    seams.push(s);
  }
  return { stepped: [], flashes: [], cameraBlur: [], colour: [], seams };
};

/**
 * The chain sentence of a plan, for review: "request: word -swell-> pill -grow-> page ... -converge-> mark". Every
 * arrow is a join that must be designed; a film that needs "and also" is two films.
 */
export const chainSentence = (plan: SpinePlan): string => {
  if (!plan.scenes.length) return `${plan.element}:`;
  const parts = [plan.scenes[0].form as string];
  plan.changes.forEach((c) => parts.push(`-${c.kind}-> ${c.to.form}${c.boundary ? ` |${plan.acts[c.to.act]?.verb ?? ''}|` : ''}`));
  return `${plan.element}: ${parts.join(' ')}`;
};

/** The change running at frame f (its span holds f), or null: which handover a frame belongs to. */
export const changeAt = (plan: SpinePlan, f: number): PlanChange | null => plan.changes.find((c) => f >= c.span[0] && f < c.span[1]) ?? null;
/** The scene showing at frame f (the last one started), and its act. */
export const sceneAt = (plan: SpinePlan, f: number): PlanScene => {
  let s = plan.scenes[0];
  for (const x of plan.scenes) if (f >= x.from) s = x;
  return s;
};
