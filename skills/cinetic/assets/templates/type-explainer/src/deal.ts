// The devices this film plays. Each slot of the template tells its beat one of two or three ways, and the film's seed
// deals one per slot, so two films from this template never run one fixed sequence of signatures: the structure,
// the timing and the clear-copy slots stay, the devices change. The seed is the product's name (the same name, the
// same deal, on any machine); explain.ts `seed` re-deals and `devices` pins a slot. template.json `deal` lists the
// same table. Keep this file free of React and CSS imports: the timeline and the sound import it.
//
//   slot     devices    what each does
//   open     band       the name as one giant word, a band of the accent running through it; the camera pulls back
//                       as the mark arrives as the next word
//            push       the name and its mark set as one line; the camera pushes through it onto the mark
//            focus      the name lands oversized and settles, crisp in a few frames; the mark slides out from behind it
//   voice    said       what it is, said word by word at the pace of speech (uneven onsets, the crisp entry)
//            mask       what it is, each word rising out of a mask on its baseline, solid as it rises (TypeLine mask)
//            build      what it is, built word by word on the beat, each word cut on solid in a tint of the accent and
//                       darkening to ink while the line re-centres (TypeLine build)
//   pain     land       the line cuts in oversized in the accent and lands crisp, cooling to ink (TypeLine land)
//            push       the line enters crisp, then the camera pushes through it onto its last word
//            crowd      the line in front of the tools it names: app icons and tiles in three planes, a push through
//   promise  pill       the product opens as a pill between the halves and grows into the next shot
//            roll       the slot rolls through the products it works with (or its parts) before the pill opens
//            lens       the pill opens; the camera pushes through the line into it (the type crosses the frame)
//   picture  turn       the product's screen as a lit, tilted panel; the film's one 3D turn of the camera
//            stack      the screen between cards in three planes; the camera moves through them
//   system   wipe       the one soft feathered wipe from the right
//            push       the push-wipe: a hard edge from the right that pushes the picture along, settles at half the
//                       frame, creeps and leaves at speed (fx/Wipe push, the measured numbers)
//            sheet      a lit sheet slides over the picture from the right, its shadow edge leading
//   grid     hive       the parts born round the mark in a radial wave of content tiles
//            ring       the parts as content tiles on a ring round the mark, tumbling in and orbiting
//            stack      the parts in three planes round the mark, the camera pushing through them
//   end      lockup     the mark steps into the lockup, the name beside it; the close rises under them out of a mask
//            claim      the accent floods from the mark; the close is set as the claim, the lockup small
import { EXPLAIN } from './explain';
import { compositionApart, declareHeadlines } from './fx/TypeSystem';

export const DEVICES = {
  open: ['band', 'push', 'focus'],
  voice: ['said', 'mask', 'build'],
  pain: ['land', 'push', 'crowd'],
  promise: ['pill', 'roll', 'lens'],
  picture: ['turn', 'stack'],
  system: ['wipe', 'push', 'sheet'],
  grid: ['hive', 'ring', 'stack'],
  end: ['lockup', 'claim'],
} as const;

/**
 * What each device does to the frame, for the slots whose devices change the composition (where the type sits, where
 * the picture sits, which leads): a film's deal must move the frame, not only rename the devices (dealApart). The voice
 * (one line in the middle however it arrives) and the system (a wipe between pictures) change none.
 */
export const COMPOSITION: { [S in keyof typeof DEVICES]?: Record<string, string> } = {
  open: { band: 'the name as one giant word across the frame', push: 'the name and its mark as one line, the mark leads', focus: 'the name oversized in the middle, the mark beside it' },
  pain: { land: 'one line in the middle', push: 'one line pushed into until its last word leads', crowd: 'the line in front of planes of tools' },
  promise: { pill: 'a pill opening between the halves', roll: 'objects rolling inside the line', lens: 'the camera through the line into the pill' },
  picture: { turn: 'one lit tilted screen', stack: 'the screen between cards in three planes' },
  grid: { hive: 'tiles round the mark', ring: 'tiles round the mark', stack: 'tiles on three planes the camera passes' },
  end: { lockup: 'the lockup in the middle, the close under it', claim: 'type at poster size on the accent, the lockup small' },
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
 * One device per slot from `seed`; `pinned` wins for its slots. A deal that would give every slot its first device
 * (the template's plainest sequence) re-deals the promise, so no seed reproduces it.
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
  if (!SLOTS.some((s) => pinned[s] !== undefined) && SLOTS.every((s) => out[s] === DEVICES[s][0])) out.promise = DEVICES.promise[1 + Math.floor(r() * (DEVICES.promise.length - 1))];
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

/** The film's seed: explain.ts `seed`, else its name's. */
export const SEED: number = EXPLAIN.seed ?? seedOf(EXPLAIN.name);
/** The devices this film plays, slot by slot. */
export const DEAL: Dealt = dealApart(SEED, EXPLAIN.devices);

/**
 * The lines this film's acts set another way than the film's voice (fx/TypeSystem filmSystems reads this for the film's
 * seed): the pain pushed into (acts/Pain TypePush), the close at poster size on the accent, centred (acts/End
 * AccentClaim). What it is reads as one centred line like the rest.
 */
export const HEADLINES_SET = declareHeadlines(SEED, {
  pain: DEAL.pain === 'push' ? 'push' : undefined,
  close: DEAL.end === 'claim' ? 'giant' : undefined,
});
