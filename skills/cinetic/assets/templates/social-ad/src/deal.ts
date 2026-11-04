// The devices this ad plays. Each slot of the template tells its beat one of two or three ways, and the film's seed
// deals one per slot, so two ads from this template never run one fixed sequence of signatures: the structure, the
// timing and the clear-copy slots stay, the devices change. The seed is the product's name (the same name, the same
// deal, on any machine); ad.ts `seed` re-deals and `devices` pins a slot. template.json `deal` lists the same table.
// Keep this file free of React and CSS imports: the timeline and the sound import it.
//
//   slot      devices   what each does
//   open      land      the opener: the name cuts in oversized and lands, each next word appended in the accent and
//                       cooling to ink while the line re-centres (TypeLine land, lead 1)
//             build     the opener built word by word on the beat, each word cut on solid in a tint of the accent,
//                       darkening to ink while the line re-centres (TypeLine build)
//   stack     pile      "Save [what it holds] everything": the product's items dealt onto a hero tile, one every 6 f
//             fan       the hero tile eases aside and the items behind it fan out in 3D
//   brand     spin      the mark spins in over the stack receding into the far plane; the name slides out of it
//             tile      the hero tile carries across the cut and grows into the app's own tile holding the mark;
//                       the name slides out from behind it
//   field     wall      the claim in a wall of the product's content tiles settling round it from the centre
//             ring      the claim inside a ring of content tiles tumbling in and orbiting
//             depth     the claim on the middle of three planes of content (fx/DepthStack), the camera pushing through
//   label     rivers    the label over two diagonal streams of tiles running opposite ways, rushing out
//             ticker    the label over rows of tiles flowing past on two depths, curved toward the camera
//             screen    the label as a chip over the product's own dense screen, its lens gliding row to row
//   taglines  panel     two imperatives beside the product's screen as a lit tilted panel: the film's one 3D turn
//             claim     the accent floods; the imperatives set as the claim on it, one after the other
//   end       spin      the mark spins in, steps aside, the name slides out; the close rises under them
//             rise      the mark and the name rise out of a mask on their baseline; the close rises under them
import { AD } from './ad';
import { compositionApart, declareHeadlines } from './fx/TypeSystem';

export const DEVICES = {
  open: ['land', 'build'],
  stack: ['pile', 'fan'],
  brand: ['spin', 'tile'],
  field: ['wall', 'ring', 'depth'],
  label: ['rivers', 'ticker', 'screen'],
  taglines: ['panel', 'claim'],
  end: ['spin', 'rise'],
} as const;

/**
 * What each device does to the frame, for the slots whose devices change the composition (where the type sits, where
 * the picture sits, which leads): a film's deal must move the frame, not only rename the devices (dealApart). The open
 * (one line in the middle either way), the brand and the end (the mark in the middle) change none.
 */
export const COMPOSITION: { [S in keyof typeof DEVICES]?: Record<string, string> } = {
  stack: { pile: 'the items dealt onto one hero tile in the middle', fan: 'the hero tile aside, the items fanned across in 3D' },
  field: { wall: 'the claim inside a wall of tiles', ring: 'the claim inside a ring of tiles in orbit', depth: 'the claim on the middle of three planes in depth' },
  label: { rivers: 'the label over two diagonal streams of tiles', ticker: 'the label over rows of tiles across in depth', screen: 'the label as a chip over one dense screen' },
  taglines: { panel: 'type beside a tilted screen panel', claim: 'type at poster size on the accent, no picture' },
};

export type Slot = keyof typeof DEVICES;
export type Dealt = { [S in Slot]: (typeof DEVICES)[S][number] };
const SLOTS = Object.keys(DEVICES) as Slot[];

/** FNV-1a over a string: a name's seed. */
export const seedOf = (s: string): number => {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** A small seeded generator (mulberry32). */
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * One device per slot from `seed`; `pinned` wins for its slots. The mark spins once a film at most: a spin dealt to
 * the brand sends the end to the rise (unless the end is pinned), so no seed bookends the ad with the same move.
 */
export const deal = (seed: number, pinned: Partial<Record<string, string>> = {}): Dealt => {
  const r = rng(seed);
  const out = {} as Record<Slot, string>;
  for (const s of SLOTS) {
    const list = DEVICES[s] as readonly string[];
    const pick = list[Math.floor(r() * list.length)];
    const pin = pinned[s];
    if (pin !== undefined && !list.includes(pin)) throw new Error(`deal: "${pin}" is not a device of the ${s} slot (${list.join(', ')})`);
    out[s] = pin ?? pick;
  }
  if (out.brand === 'spin' && out.end === 'spin' && pinned.end === undefined) out.end = 'rise';
  return out as Dealt;
};

/** The template's own deal: what its scaffold plays before the product's name is in (the placeholder name). */
const FLOOR_SEED = seedOf('[Product]');
export const FLOOR: Dealt = deal(FLOOR_SEED);
/**
 * A film is never the template replayed: of the slots it deals (pins aside), at least half play another device than
 * the floor's, and at least half of those that carry a composition (COMPOSITION) play another composition, so the
 * frame moves (where the type and the picture sit, which leads), not only the devices' names; else it re-deals from
 * the next seed (the first seed that differs keeps its deal). The unnamed scaffold keeps the floor. On the pixels:
 * render the untouched template once (out/scaffold.mp4) and run `python3 scripts/like.py guard --film out/film.mp4
 * --scaffold out/scaffold.mp4` before delivery: no frame retold, no composition re-skinned.
 */
export const dealApart = (seed: number, pinned: Partial<Record<string, string>> = {}): Dealt => {
  const free = SLOTS.filter((s) => pinned[s] === undefined);
  for (let k = 0; seed !== FLOOR_SEED && k < 64; k++) {
    const d = deal(k ? (seed + k * 104729) >>> 0 : seed, pinned);
    if (2 * free.filter((s) => d[s] !== FLOOR[s]).length >= free.length && compositionApart(d, FLOOR, COMPOSITION, free).ok) return d;
  }
  return deal(seed, pinned);
};
/** The deal a product of this name gets, unpinned: the same name, the same deal, never the floor's. */
export const dealOf = (name: string): Dealt => dealApart(seedOf(name));

/** The film's seed: ad.ts `seed`, else its name's. */
export const SEED: number = AD.seed ?? seedOf(AD.name);
/** The devices this film plays, slot by slot. */
export const DEAL: Dealt = dealApart(SEED, AD.devices);

/**
 * The lines this ad's acts set another way than the film's voice (fx/TypeSystem filmSystems reads this for the film's
 * seed): the taglines at poster size on the accent, centred, when the claim plays them (acts/Taglines AccentClaim),
 * the label's swapped word (acts/Label). The opener is one centred line like the rest.
 */
export const HEADLINES_SET = declareHeadlines(SEED, {
  'tag.1': DEAL.taglines === 'claim' ? 'giant' : undefined,
  'tag.2': DEAL.taglines === 'claim' ? 'giant' : undefined,
  swap: 'swap',
});
