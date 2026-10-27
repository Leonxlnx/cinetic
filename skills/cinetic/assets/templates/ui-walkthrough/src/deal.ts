// The walkthrough's device slots, dealt per film. The template keeps its structure, its timing and its copy slots;
// what each slot shows is one of two or three devices, dealt from a seed (the product's name, or SEED below), so two
// films made from this template never play one fixed signature sequence. Pin a slot in PIN to choose it by hand;
// template.json "slots" says what each device does. Print the deal: npx tsx -e "import { DEAL } from './src/deal'; console.log(DEAL)"
// Node-safe: the timeline and the sound read it.
import { IDENTITY } from './brand/identity';

/** Each slot and the devices it can take (the first is no more the default than the others). */
export const SLOTS = {
  /** where the film stands: statements on paper and the product on the slate, all paper, or all slate */
  stage: ['mixed', 'light', 'dark'],
  /** the promise: the sentence with the input's mark inside it; the same line pushed through by the camera; the line inside a depth stack of the input's items */
  open: ['line', 'push', 'stack'],
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
  /** the end card: the lockup beside the output as a soft far plane; the lockup over a soft wall of the film's screens */
  end: ['side', 'wall'],
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
