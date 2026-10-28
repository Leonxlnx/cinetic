// The update film's device slots, dealt per film. The template keeps its structure, its timing and its copy slots;
// what each slot shows is one of two devices, dealt from a seed (the product's name, or SEED below), so two films made
// from this template never play one fixed signature sequence. Pin a slot in PIN to choose it by hand; template.json
// "slots" says what each device does. Print the deal: npx tsx -e "import { DEAL, LINES } from './src/deal'; console.log(DEAL, LINES)"
// Node-safe: the timeline and the sound read it.
import { IDENTITY } from './brand/identity';

/** Each slot and the devices it can take (the first is no more the default than the others). */
export const SLOTS = {
  /** where the film stands: the mid slate, or the tinted paper */
  stage: ['slate', 'paper'],
  /** the hook: the old version's last numeral rolling to the new one; the new version rising out of a mask under the name */
  hook: ['roll', 'mask'],
  /** the film's one 3D camera move: the strip yaws as the camera travels into the second change; or the pull-back pitches down over the strip */
  turn: ['yaw', 'pitch'],
  /** the payoff: the camera pulls back over every change as the version swings in front; or the last change recedes out of focus and the version rises in front of it */
  payoff: ['pull', 'rise'],
  /** the end card: the version recedes into the set and the lockup is set before it; or the version settles beside the name as one lockup */
  end: ['set', 'beside'],
} as const;

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

/** One device per slot from `seed` (pins win). Pure. */
export const dealDevices = (seed: number, pin: Partial<Deal> = {}): Deal => {
  const r = rng(seed);
  const out: Record<string, string> = {};
  for (const [slot, devices] of Object.entries(SLOTS) as [string, readonly string[]][]) {
    const dealt = devices[Math.floor(r() * devices.length)];
    const p = (pin as Record<string, string | undefined>)[slot];
    if (p !== undefined && !devices.includes(p)) throw new Error(`deal.ts: PIN.${slot} is "${p}"; the slot takes ${devices.join(', ')}`);
    out[slot] = p ?? dealt;
  }
  return out as Deal;
};

/** This film's seed and deal. */
export const DEAL_SEED = SEED ?? hashSeed(IDENTITY.name);
export const DEAL: Deal = dealDevices(DEAL_SEED, PIN);

// ---- The lines' moves: each line of the script arrives on one confident move and leaves on one exit, dealt per line
// from the same seed, never the same move (or exit) on two lines in a row. Node-safe: the timeline reads how long each
// move takes to resolve from RESOLVE60 below (fx/TypePresets typeLineFrames at the house numbers, 60 fps frames).

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

/** Pin a line's move or exit by hand ({ promise: 'mask' }); the others are dealt. */
export const MOVE_PIN: Partial<Record<string, Move>> = {};
export const EXIT_PIN: Partial<Record<string, Exit>> = {};

/** The quick moves (a line of up to 6 words read in under 50 f at 60 fps): the end card's line takes one, so the lock still holds. */
export const QUICK: readonly Move[] = ['land', 'fall', 'glide'];

/** One move and one exit per line id, in film order, from `seed`: no move or exit twice in a row; ids in `quick` take a QUICK move. Pure. */
export const dealLines = (seed: number, ids: readonly string[], pin: { move?: Partial<Record<string, Move>>; exit?: Partial<Record<string, Exit>> } = {}, quick: readonly string[] = []) => {
  const r = rng((seed ^ 0x5bd1e995) >>> 0);
  const move: Record<string, Move> = {};
  const exit: Record<string, Exit> = {};
  let pm: string | null = null;
  let pe: string | null = null;
  for (const id of ids) {
    const ms = MOVES.filter((m) => m !== pm && (!quick.includes(id) || QUICK.includes(m)));
    const es = EXITS.filter((e) => e !== pe);
    move[id] = pin.move?.[id] ?? ms[Math.floor(r() * ms.length)];
    exit[id] = pin.exit?.[id] ?? es[Math.floor(r() * es.length)];
    pm = move[id];
    pe = exit[id];
  }
  return { move, exit };
};

/** The script's lines in film order and the moves and exits this film was dealt. */
export const LINE_IDS = ['change1', 'change2', 'change3', 'change4'] as const;
export const LINES = dealLines(DEAL_SEED, LINE_IDS, { move: MOVE_PIN, exit: EXIT_PIN });
/**
 * The name's move on the end card, dealt: a rise out of its mask, a landing, or a glide (the hook's name is on screen
 * from frame 0: the set's subject). Beside the version ('beside' end) it rises in place out of its mask: a landing or a
 * glide would cross the version waiting after it.
 */
export const NAME_MOVE: Move = MOVE_PIN.wordmark ?? (DEAL.end === 'beside' ? 'mask' : (['mask', 'land', 'glide'] as const)[DEAL_SEED % 3]);
