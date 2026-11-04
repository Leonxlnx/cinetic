// The walkthrough's device slots, dealt per film. The template keeps its structure, its timing and its copy slots;
// what each slot shows is one of two or three devices, dealt from a seed (the product's name, or SEED below), so two
// films made from this template never play one fixed signature sequence. Pin a slot in PIN to choose it by hand;
// template.json "slots" says what each device does. Print the deal: npx tsx -e "import { DEAL } from './src/deal'; console.log(DEAL)"
// Node-safe: the timeline and the sound read it.
import { IDENTITY } from './brand/identity';
import { compositionApart } from './fx/TypeSystem';

/** Each slot and the devices it can take (the first is no more the default than the others). */
export const SLOTS = {
  /** where the film stands: paper until the claim and the slate from it on, all paper (the claim on the slate), or all slate (the claim on paper) */
  stage: ['mixed', 'light', 'dark'],
  /** the promise: the sentence with the input's mark inside it in a slow push; the same line pushed through by the camera onto the mark; the line over the input's own card rising into the frame from below */
  open: ['line', 'push', 'card'],
  /** how the input card becomes the output: it turns over (its back is the output); a lit band develops the output across it; the content slides through the card's window */
  turn: ['flip', 'sheen', 'slide'],
  /** the proof: notices stacking in front; a river of notices flowing up through depth; a wall of result tiles the camera pushes through */
  proof: ['stack', 'river', 'wall'],
  /** the claim: on the accent, flush left at poster size; pushed through by the camera on a lit ground; set with its object inside the line */
  claim: ['accent', 'push', 'object'],
  /** the product reading: a dense screen whose focus line travels the rows; a feed flicked past; the items flowing past in depth */
  read: ['lens', 'flick', 'ticker'],
  /** the output building: a progress pill over the build; its sections assembling into the page in depth; the output streaming in */
  build: ['pill', 'assemble', 'stream'],
  /** the output live: one lit page landing and scrolling; the page between its siblings in a depth stack */
  page: ['lit', 'stack'],
  /** the end card: the lockup centred over the output, live behind it and stepping back; the lockup alone in the middle of a clean ground */
  end: ['side', 'centre'],
} as const;

/**
 * What each device does to the frame, for the slots whose devices change the composition (where the type sits, where
 * the picture sits, which leads): a film's deal must move the frame, not only rename the devices (dealApart). The
 * stage (a palette), the turn and the build (one card or panel in the middle whatever plays) change none.
 */
export const COMPOSITION: { [S in keyof typeof SLOTS]?: Record<string, string> } = {
  open: { line: 'type centre, the mark inside the line, type leads', push: 'type centre, the mark inside the line, the mark leads', card: 'type high, the card below, the card leads' },
  proof: { stack: 'a stack of notices in the middle', river: 'a column of notices through depth', wall: 'tiles fill the frame' },
  claim: { accent: 'type flush left at poster size, no picture', push: 'type centre pushed into, no picture', object: 'type centre, an object inside the line' },
  read: { lens: 'one dense screen fills the frame', flick: 'one column in the middle', ticker: 'rows across the frame in depth' },
  page: { lit: 'one page in the middle', stack: 'the page between its siblings in depth' },
  end: { side: 'type centre, the output live behind it, stepped back', centre: 'type centre on a clean ground' },
};

export type SlotName = keyof typeof SLOTS;
export type DeviceOf<S extends SlotName> = (typeof SLOTS)[S][number];
export type Deal = { [S in SlotName]: DeviceOf<S> };

/** Choose a slot's device by hand ({ claim: 'push' }); pinned slots are not dealt. */
export const PIN: Partial<Deal> = {};
/** The deal's seed: null deals from the product's name; any integer re-deals without renaming the product. */
export const SEED: number | null = null;

/** FNV-1a: a name as a 32-bit seed. */
export const hashSeed = (s: string): number => {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};
/** mulberry32: the same seed, the same deal, in any render order. */
const rng = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * One device per slot from `seed` (pins win). The promise always sets the input's mark inside its line (acts/Open
 * MarkLine), so the claim right after it never deals the object inside the line too (two lines in a row in one
 * headline system, fx/TypeSystem); a film may still pin it. Pure.
 */
export const dealDevices = (seed: number, pin: Partial<Deal> = {}): Deal => {
  const r = rng(seed);
  const out: Record<string, string> = {};
  for (const [slot, all] of Object.entries(SLOTS) as [string, readonly string[]][]) {
    const devices = slot === 'claim' ? all.filter((d) => d !== 'object') : all;
    const dealt = devices[Math.floor(r() * devices.length)];
    const p = (pin as Record<string, string | undefined>)[slot];
    if (p !== undefined && !all.includes(p)) throw new Error(`deal.ts: PIN.${slot} is "${p}"; the slot takes ${all.join(', ')}`);
    out[slot] = p ?? dealt;
  }
  return out as Deal;
};

/** The template's own deal: what its scaffold plays before the product's name is in (the placeholder name). */
const FLOOR_SEED = hashSeed('[Product]');
export const FLOOR: Deal = dealDevices(FLOOR_SEED);
/**
 * A film is never the template replayed: of the slots it deals (pins aside), at least half play another device than
 * the floor's, and at least half of those that carry a composition (COMPOSITION) play another composition, so the
 * frame moves (where the type and the picture sit, which leads), not only the devices' names; else it re-deals from
 * the next seed (the first seed that differs keeps its deal). The unnamed scaffold keeps the floor. On the pixels:
 * render the untouched template once (out/scaffold.mp4) and run `python3 scripts/like.py guard --film out/film.mp4
 * --scaffold out/scaffold.mp4` before delivery: no frame retold, no composition re-skinned.
 */
export const dealApart = (seed: number, pin: Partial<Deal> = {}): Deal => {
  const free = (Object.keys(SLOTS) as SlotName[]).filter((s) => pin[s] === undefined);
  for (let k = 0; seed !== FLOOR_SEED && k < 64; k++) {
    const d = dealDevices(k ? (seed + k * 104729) >>> 0 : seed, pin);
    if (2 * free.filter((s) => d[s] !== FLOOR[s]).length >= free.length && compositionApart(d, FLOOR, COMPOSITION, free).ok) return d;
  }
  return dealDevices(seed, pin);
};
/** The deal a product of this name gets, unpinned: the same name, the same deal, never the floor's. */
export const dealOf = (name: string): Deal => dealApart(hashSeed(name));

/** This film's seed and deal. */
export const DEAL_SEED = SEED ?? hashSeed(IDENTITY.name);
export const DEAL: Deal = dealApart(DEAL_SEED, PIN);

// ---- The lines' moves: the film speaks in one voice, every line of the script arriving on the same confident move and
// leaving on the same exit, dealt once per film from the seed. Node-safe: the timeline reads how long each move takes
// to resolve from RESOLVE60 below (fx/TypePresets typeLineFrames at the house numbers, 60 fps frames).

/**
 * The moves a line takes (fx/TypePresets HERO_PRESETS: solid ink within a few frames, moving while it lands, every word
 * in its place from its first frame). Left out: snap and room (their one-frame jump spends the film's one declared
 * snap), fly and open (words land touching and the spaces open after: a sentence over UI reads as run together), build
 * and punch (slow, or one word alone), crisp (the plain arrival: a film that wants it pins it).
 */
export const MOVES = ['mask', 'land', 'fall', 'glide'] as const;
export type Move = (typeof MOVES)[number] | 'crisp';
/** The exits a line leaves on, at speed and cut on their fastest frame (none fades a statement out). */
export const EXITS = ['slide', 'spread', 'collapse', 'push', 'drop'] as const;
export type Exit = (typeof EXITS)[number];
/** Frames (60 fps) from a move's start until a line of n words (index n - 1, 1-8 words) is read: typeLineFrames().resolved. */
export const RESOLVE60: Record<Move, readonly number[]> = {
  crisp: [6, 13, 20, 27, 34, 41, 48, 55],
  mask: [12, 32, 40, 48, 56, 64, 72, 80],
  land: [34, 34, 34, 34, 34, 34, 34, 34],
  fall: [12, 21, 30, 39, 48, 57, 66, 75],
  glide: [8, 24, 27, 31, 34, 38, 41, 45],
};
/** Frames (60 fps) an exit takes from its start until the line is gone (drop: 14 f, 4 f more a word). */
export const EXIT60 = (e: Exit, words: number): number => ({ slide: 22, spread: 26, collapse: 10, push: 28, drop: 10 + 4 * Math.max(1, words) })[e];

/** Pin a line's move or exit by hand ({ promise: 'mask' }); the others take the film's voice. */
export const MOVE_PIN: Partial<Record<string, Move>> = {};
export const EXIT_PIN: Partial<Record<string, Exit>> = {};

/** The quick moves (a line of up to 6 words read in under 50 f at 60 fps): the end card's line takes one, so the lock still holds. */
export const QUICK: readonly Move[] = ['land', 'fall', 'glide'];

/**
 * The film's voice: ONE move and ONE exit for every line id, from `seed` (a film that reuses one entry reads as one
 * voice; a new move on every line reads as a template). Ids in `quick` need a QUICK move, so the voice is dealt from
 * QUICK when there are any. `hero` may name the film's one contrasting line (its own move, any but the voice: at most one
 * per 30 s of film). Pins win. Pure.
 */
export const dealLines = (seed: number, ids: readonly string[], pin: { move?: Partial<Record<string, Move>>; exit?: Partial<Record<string, Exit>> } = {}, quick: readonly string[] = [], hero?: string) => {
  const r = rng((seed ^ 0x5bd1e995) >>> 0);
  const [dm, de, dh] = [r(), r(), r()];
  const pool: readonly Move[] = ids.some((id) => quick.includes(id)) ? QUICK : MOVES;
  const voice = pool[Math.floor(dm * pool.length)];
  const exitVoice = EXITS[Math.floor(de * EXITS.length)];
  const others = MOVES.filter((m) => m !== voice);
  const move: Record<string, Move> = {};
  const exit: Record<string, Exit> = {};
  for (const id of ids) {
    move[id] = pin.move?.[id] ?? (id === hero && !quick.includes(id) ? others[Math.floor(dh * others.length)] : voice);
    exit[id] = pin.exit?.[id] ?? exitVoice;
  }
  return { move, exit, voice, exitVoice };
};

/** The script's lines in film order and the voice (move and exit) this film was dealt. */
export const LINE_IDS = ['promise', 'claim', 'step1', 'insight', 'pick', 'payoff'] as const;
export const LINES = dealLines(DEAL_SEED, LINE_IDS, { move: MOVE_PIN, exit: EXIT_PIN }, ['payoff']);
/** The name's move on the end card: a rise out of its mask, or a landing when the payoff took the mask. */
export const NAME_MOVE: Move = LINES.move.payoff === 'mask' ? 'land' : 'mask';
