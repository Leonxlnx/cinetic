// The single source of truth for time, for a UI walkthrough: a promise, the user's input as one object that becomes
// the output in place, proof piling up, a speed claim, then the product's own flow in steps (the input goes in,
// the product reads, finds what matters, the user picks, it builds), the output live and the end card. Picture
// (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. The facts
// live in src/walk.ts and the dealt devices in src/deal.ts; this file only places them on the grid. Think in beats,
// never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { DEAL, EXIT60, LINES, type Move, NAME_MOVE, RESOLVE60 } from './deal';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { CLAIM, PROMISE, WALK } from './walk';

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

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body: the track's own final hit ringing out (1.5-2.5 s), a hit that
 * rings, or a 2-3 s fade under the end card. The tail is that, and at least 1 s.
 */
/** A grid written before the endings (end.mode 'stop', no hold) names only the stop's element: hold it and 1 s after it. */
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1)) : 0;
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);

/**
 * Where each act starts, in beats (17 bars at 120 BPM: 35 s with the tail). Every act line sits on a bar line, so with
 * a track in each one lands on a downbeat (grid-check structural-on-music): a 2-bar promise, the object's 2-bar
 * transformation, a 1-bar proof, a 2-bar claim, one 2-bar act per step of the flow, the 1-bar output and the 1-bar end
 * card (its lock holds about a second and a half, then the tail). A line is read inside its act at 104-136 BPM (the check below fails the import when a track's bars are too
 * short for one). The shape, not the numbers, is the template: move a step's length with its content, in whole bars.
 */
export const BEATS = { open: 0, card: 8, proof: 16, claim: 20, field: 28, feed: 36, insight: 44, pick: 52, page: 60, end: 64, last: 68 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['open', 'card', 'proof', 'claim', 'field', 'feed', 'insight', 'pick', 'page', 'end'] as const;
export type ActName = (typeof order)[number];
export const ACT_ORDER: readonly ActName[] = order;
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;
/** The act's last frame + 1 (its cut). */
export const actEnd = (a: ActName) => ACT[a].from + ACT[a].dur;

export const TOTAL = bt(BEATS.last) + TAIL;

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye. Every state change is a move of 16 f@60 or more (no
// one-frame snap anywhere in the template), and every hold drifts.
export const CUE: Record<string, number> = {
  // open: the promise with the source's mark in it, crisp word by word; held (pushed through, or inside its stack);
  // the camera launches up into the cut
  line: bt(0),
  object: bt(1), // the source's mark lands in its slot in the line
  push: bt(4.5),
  held: bt(5.5), // the promise holds on its push (or its stack): the hold drifts on
  exitOpen: bt(6.5),
  launch: bt(7.25), // the whole frame starts its launch up into the card
  // card: the input rises as a lit card while the camera makes the film's one 3D turn; it becomes the output in place
  rise: bt(8),
  turned: bt(9.25), // the 3D turn is most of the way round
  swap: bt(10), // the transformation starts (flip, sheen or slide: 40-48 f)
  sub: bt(10.75),
  row1: bt(11.25),
  done1: bt(12),
  row2: bt(12),
  done2: bt(12.75),
  row3: bt(12.75),
  done3: bt(13.5),
  lean: bt(11.25), // the camera leans in on the rows as they build (overlapping them)
  leaned: bt(14.25), // the lean has settled; the built card holds, drifting, before the push
  outCard: bt(15), // the push into the card, accelerating into the zoom-through
  // proof: results arriving, faster and faster
  proof: bt(16),
  toast0: bt(16.25),
  toast1: bt(16.75),
  toast2: bt(17.25),
  toast3: bt(17.5),
  toast4: bt(17.75),
  wipe: bt(19), // a panel of the claim's ground wipes up into the claim
  // claim: on the accent (or pushed through, or with its object), creeping; a push into the cut
  claim: bt(20.25),
  claimPush: bt(22.25), // device 'push': the camera pushes through the line
  claimHold: bt(23.5), // the claim holds on its creep (the poster's margin creep, or the push landed and creeping)
  claimBreath: bt(25), // the creep carries on toward the push out: the hold never parks
  pushOut: bt(26.25),
  exitClaim: bt(27.25), // the push is at speed
  // field (step one): the field, its placeholder erased, the value typed, the hand presses, the results develop
  field: bt(28),
  step1: bt(28.25),
  erase: bt(29.5),
  typeIn: bt(30.5),
  cursor: bt(31),
  press: bt(32.5),
  busy: bt(32.75),
  develop: bt(33),
  pullBack: bt(33.5),
  rows2: bt(34.25), // the second row of results has developed
  whipUp: bt(35.25),
  // feed (step two): the product reads every item; the read lands on the one that matters
  feed: bt(36),
  count: bt(36.25),
  flick: bt(37),
  rows: bt(38),
  peak: bt(39),
  brake: bt(40.25),
  land: bt(41.5),
  lift: bt(42.25),
  morph: bt(43),
  // insight: the item is the pill; the line says what was found; the count chip
  insight: bt(44),
  say4: bt(44.5),
  chip: bt(47), // the count chip glides in once the line is in: its proof
  pillGlint: bt(49.5), // the pill's ring catches the light before the whip: the held pill keeps living at a slow track
  exitInsight: bt(50.5),
  whipLeft: bt(51.25),
  // pick (step three): the options arrive, one is chosen, it becomes the build's head and the output builds
  pick: bt(52),
  options: bt(52),
  say5: bt(52.75),
  select: bt(55),
  chosen: bt(55.75),
  toPill: bt(56.75),
  build: bt(57.25),
  pct: bt(58),
  built: bt(59), // the output's last section is in
  // page: the output, live, rises over the build, lands on its lit tilt, its preview develops, it scrolls
  page: bt(60),
  pageLand: bt(60.75),
  art: bt(61),
  scroll: bt(61.75),
  recede: bt(63),
  // end: the mark assembles, the name lands beside it (lockup: the name read), the payoff line arrives under it; it holds
  end: bt(64),
  mark: bt(64),
  lockup: bt(64.5),
  payoff: bt(66.25),
  rest: bt(67),
  last: bt(68),
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

/**
 * Where each act stands, by the dealt stage: 'mixed' (paper until the claim, the slate from the claim on: the claim
 * turns the film once), 'light' (all paper, the claim on the slate) or 'dark' (all slate, the claim on paper). At most
 * two ground flips a film (paper <-> slate), each a declared colour event (COLOUR, or a 'colour' seam): the claim is the
 * film's one turn; the page and the end keep the stage. The feed and the insight share one ground: the found item
 * morphs into the pill across that act line.
 */
const PLAN: Record<(typeof DEAL)['stage'], Record<ActName, 'light' | 'dark'>> = {
  mixed: { open: 'light', card: 'light', proof: 'light', claim: 'dark', field: 'dark', feed: 'dark', insight: 'dark', pick: 'dark', page: 'dark', end: 'dark' },
  light: { open: 'light', card: 'light', proof: 'light', claim: 'dark', field: 'light', feed: 'light', insight: 'light', pick: 'light', page: 'light', end: 'light' },
  dark: { open: 'dark', card: 'dark', proof: 'dark', claim: 'light', field: 'dark', feed: 'dark', insight: 'dark', pick: 'dark', page: 'dark', end: 'dark' },
};
export const TONE: Record<ActName, 'light' | 'dark'> = PLAN[DEAL.stage];
/** A cut into act `a`: a colour cut where the stage turns between paper and slate, else a hard cut (the moves still run into it at speed). */
const cutInto = (a: ActName): SeamKind => (TONE[a] !== TONE[order[order.indexOf(a) - 1]] ? 'colour' : 'hard');

/** A crisp film: the read's fast moves smear through fx/Defocus DirBlur, no shutter pass. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'explainer', oneTake: false, whiteWorld: false };
/**
 * Every seam: the whole frame's speed carried through three act lines (the promise's launch, the two whips; measured:
 * the incoming shot opens moving the same way at 0.6-0.8 of the outgoing speed and decays), the content morphing from one container into the next, a wipe
 * of the claim's ground; where the picture is new, a cut taken at the top of an accelerating push or whip (hard, or a colour cut where
 * the stage turns between paper and slate), the next shot opening on the same motion.
 */
export const SEAMS: Seam[] = [
  { at: ACT.card.from, kind: 'velocity', carry: 'y', dir: -1, id: 'promise-launches-up' },
  { at: CUE.swap, kind: 'morph', carry: 'shape', signature: true, id: 'input-becomes-output' },
  { at: ACT.proof.from, kind: cutInto('proof'), carry: 'scale', dir: 1, id: 'push-into-the-card' },
  { at: ACT.claim.from, kind: 'wipe', carry: 'y', dir: -1, id: 'wipe-up' },
  { at: ACT.field.from, kind: cutInto('field'), carry: 'scale', dir: 1, id: 'push-through-the-claim' },
  { at: ACT.feed.from, kind: 'velocity', carry: 'y', dir: -1, id: 'whip-up' },
  { at: ACT.insight.from, kind: 'morph', carry: 'shape', id: 'item-to-pill' },
  { at: ACT.pick.from, kind: 'velocity', carry: 'x', dir: -1, id: 'whip-left' },
  { at: CUE.toPill, kind: 'morph', carry: 'shape', id: 'row-to-head' },
  { at: ACT.page.from, kind: cutInto('page'), carry: 'y', dir: -1, id: 'page-rises' },
  { at: ACT.end.from, kind: cutInto('end'), id: 'page-to-lockup' },
];
/** No one-frame step anywhere: every list, zoom and swap glides (forensics motion-snap allows one declared snap a film; this one keeps none). */
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
/** The flick's fast travel smears through DirBlur: declared as camera blur (the lens and the ticker glide and flow). */
export const CAMERA_BLUR: CameraBlurRange[] = DEAL.read === 'flick' ? [{ from: CUE.flick, to: CUE.brake, id: 'read-flick' }] : [];
/**
 * The colour events: the claim on the accent (claim device 'accent'), up to 2 s past its build; else the claim's turn of
 * the stage (paper <-> slate) where it stands on the other one. The flip back (or on) at the field is its 'colour' seam.
 */
export const COLOUR: ColourRange[] =
  DEAL.claim === 'accent' ? [{ from: ACT.claim.from, to: Math.min(ACT.field.from, ACT.claim.from + 2 * FPS + f60(54)), id: 'claim-on-the-accent' }]
  : TONE.claim !== TONE.proof ? [{ from: ACT.claim.from, to: ACT.field.from, id: 'claim-turns-the-stage' }]
  : [];
/** The one lock: the mark, the name and the payoff line hold to the end. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal: the lockup. */
export const REVEAL = CUE.lockup;
/** The one element class allowed an underdamped spring: none (the template's landings are all eased). */
export const SPRING_CLASS = 'chosen-row';
/** CUE names that must land on a music event. None without a track; with one, add 'rise', 'feed' and 'end' (downbeats). */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  line: 'copy', object: 'hit', push: 'move', exitOpen: 'move', launch: 'move', held: 'life', leaned: 'life', claimHold: 'life', claimBreath: 'life',
  rise: 'cut', turned: 'move', swap: 'hit', sub: 'move', row1: 'hit', done1: 'hit', row2: 'hit', done2: 'hit', row3: 'hit', done3: 'hit', lean: 'move', outCard: 'move',
  proof: 'cut', toast0: 'hit', toast1: 'hit', toast2: 'hit', toast3: 'hit', toast4: 'hit', wipe: 'move',
  claim: 'copy', claimPush: 'move', pushOut: 'move', exitClaim: 'move',
  field: 'cut', step1: 'copy', erase: 'hit', typeIn: 'hit', cursor: 'move', press: 'hit', busy: 'hit', develop: 'hit', pullBack: 'move', rows2: 'life', whipUp: 'move',
  feed: 'cut', count: 'life', flick: 'move', rows: 'life', peak: 'move', brake: 'life', land: 'hit', lift: 'move', morph: 'move',
  insight: 'cut', say4: 'copy', chip: 'hit', pillGlint: 'life', exitInsight: 'copy', whipLeft: 'move',
  pick: 'cut', options: 'hit', say5: 'copy', select: 'move', chosen: 'hit', toPill: 'move', build: 'hit', pct: 'life', built: 'hit',
  page: 'cut', pageLand: 'hit', art: 'hit', scroll: 'move', recede: 'move',
  end: 'cut', mark: 'hit', lockup: 'hit', payoff: 'copy', rest: 'life', last: 'cut',
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

/** Frames from a move's start until a line of `n` words is read (src/deal.ts RESOLVE60, at this film's fps). */
export const resolveSpan = (move: Move, n: number): number => Math.ceil(f60x(RESOLVE60[move][Math.min(8, Math.max(1, n)) - 1])) + 1;
/** The move and exit this film dealt a line (src/deal.ts LINES; the wordmark and UI strings take none). */
export const moveOf = (id: string): Move => LINES.move[id] ?? 'crisp';

/**
 * One line of copy on its dealt move (src/deal.ts LINES); `out` defaults to the pace's hold, and a cue placed in beats
 * never cuts that hold short: at a faster track the beats shrink, so the line leaves on its read.
 */
export const line = (id: string, text: string, inF: number, out?: number, o: { move?: Move } = {}): Copy => {
  const n = wordCount(text);
  const resolved = inF + resolveSpan(o.move ?? moveOf(id), n);
  const read = resolved + f60(holdFor(n, pace));
  return { id, text, in: inF, resolved, out: Math.max(out ?? read, read) };
};

/** Frames (60 fps) the line `id` takes to leave on its dealt exit. */
export const lineExit = (id: string, text: string): number => (LINES.exit[id] ? EXIT60(LINES.exit[id], wordCount(text)) : 24);

// Every on-screen word of the film. The product's own strings (walk.ts) are UI, drawn by the kit, not budgeted.
export const COPY: Copy[] = [
  line('promise', PROMISE, CUE.line, CUE.exitOpen),
  line('claim', CLAIM, CUE.claim, CUE.pushOut, { move: DEAL.claim === 'accent' ? 'crisp' : undefined }), // the poster builds on the crisp entry (fx/TypeClaim)
  line('step1', WALK.lines.step1, CUE.step1, CUE.press - f60(12)),
  line('insight', WALK.lines.insight, CUE.say4, CUE.exitInsight),
  line('pick', WALK.lines.pick, CUE.say5, CUE.toPill),
  { ...line('payoff', WALK.lines.payoff, CUE.payoff), out: TOTAL },
  { id: 'wordmark', text: WALK.name, kind: 'name', in: CUE.lockup - resolveSpan(NAME_MOVE, wordCount(WALK.name)), resolved: CUE.lockup, out: TOTAL },
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
// A line is read inside its own act: at a faster track the act's bars shrink while the read does not, so a line that
// would still be on screen at its act's cut is reported here, at import, with the fix (a slower track, a shorter line, a
// bar more): a warning in dev, an error under the ship gate (lib/continuity timingFail; scripts/precheck.mjs lists it).
const ACT_OF: Record<string, ActName> = { promise: 'open', claim: 'claim', step1: 'field', insight: 'insight', pick: 'pick' };
for (const [id, act] of Object.entries(ACT_OF)) {
  const c = copy(id);
  const end = actEnd(act);
  if (c.out + f60(lineExit(id, c.text)) > end)
    timingFail('line-cut', `timeline: the ${id} line ("${c.text}") is read until f${c.out} and leaves by f${c.out + f60(lineExit(id, c.text))}, after its act's cut (f${end}) at ${BPM} BPM: shorten the line, give the act a bar more, or cut to a slower track`);
}
