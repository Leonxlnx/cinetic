// The demo's device slots, dealt per film. The template keeps its structure, its timing and its copy slots; how each
// beat moves is one of two or three devices, dealt from a seed (the product's name, or SEED below), so two films made
// from this template never play one fixed signature sequence. Pin a slot in PIN to choose it by hand; template.json
// "deal" says what each device does. Print the deal: npx tsx -e "import { DEAL } from './src/deal'; console.log(DEAL)"
// Node-safe: the timeline and the sound read it (the declarations follow the deal: the colour event belongs to the
// iris or to the claim, never both).
import { IDENTITY } from './brand/identity';
import { compositionApart, declareHeadlines } from './fx/TypeSystem';

/** Each slot and the devices it can take, in act order. */
export const SLOTS = {
  /** how the script's lines arrive (fx/TypePresets, confident hero moves): out of a mask on their baseline, landing from oversized, or dropping word by word */
  voice: ['mask', 'land', 'fall'],
  /** the cold open: the tools ring the pill and fly off on the kick; the tools dock inside the pill as a row of marks; the tools as a soft far wall behind it */
  open: ['ring', 'dock', 'wall'],
  /** into the request: the iris opens out of the pill onto the accent (the colour event); the pill itself stretches into the request box */
  ask: ['iris', 'stretch'],
  /** the send: the pointer glides in and clicks; a tap lands on the button (a press ring, no pointer) */
  click: ['pointer', 'tap'],
  /** the work, under the film's one 3D turn: the steps in a lit panel; the steps as cards in a depth stack; the steps beside the product's own screen */
  run: ['list', 'stack', 'split'],
  /** the result: the running row grows into the result card; the result line set as the claim on the accent (the colour event) */
  done: ['morph', 'claim'],
  /** the lockup: the mark pops and the name slides out of it; the mark assembles from its parts */
  end: ['pop', 'assemble'],
} as const;

/**
 * What each device does to the frame, for the slots whose devices change the composition (where the type sits, where
 * the picture sits, which leads): a film's deal must move the frame, not only rename the devices (dealApart). The
 * voice, the click and the end change none.
 */
export const COMPOSITION: { [S in keyof typeof SLOTS]?: Record<string, string> } = {
  open: { ring: 'tools in a ring round the pill', dock: 'tools in a row inside the pill', wall: 'tools as a far wall behind the pill' },
  ask: { iris: 'the accent floods the frame out of the pill', stretch: 'the pill stretches into the box in the middle' },
  run: { list: 'the steps in one lit panel', stack: 'the steps as cards in depth', split: 'the steps beside the product screen, two panes' },
  done: { morph: 'the result card in the middle', claim: 'type at poster size on the accent' },
};

export type SlotName = keyof typeof SLOTS;
export type DeviceOf<S extends SlotName> = (typeof SLOTS)[S][number];
export type Deal = { [S in SlotName]: DeviceOf<S> };

/** Each voice's exit: it leaves at speed, never a fade (fx/TypePresets exits). */
export const VOICE_EXIT = { mask: 'drop', land: 'slide', fall: 'drop' } as const;

/** Choose a slot's device by hand ({ run: 'split' }); pinned slots are not dealt. */
export const PIN: Partial<Deal> = {};
/** The deal's seed: null deals from the product's name; any integer re-deals without renaming the product. */
export const SEED: number | null = null;

/**
 * What every deal keeps: one colour event per film (the iris's accent field or the claim's flood, never both); the
 * stretch keeps the pill on screen into the box, so the open that docks the tools inside the pill reads best before it
 * (any open works; this rule only keeps the two floods apart).
 */
export const RULES: { id: string; ok: (d: Deal) => boolean }[] = [{ id: 'one-colour-event', ok: (d) => !(d.ask === 'iris' && d.done === 'claim') }];

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

/** One device per slot from `seed` (pins win), re-dealt until every rule holds. Pure. */
export const dealDevices = (seed: number, pin: Partial<Deal> = {}): Deal => {
  let last: Record<string, string> = {};
  for (let attempt = 0; attempt < 64; attempt++) {
    const r = rng(seed + attempt * 7919);
    const out: Record<string, string> = {};
    for (const [slot, devices] of Object.entries(SLOTS) as [string, readonly string[]][]) {
      const dealt = devices[Math.floor(r() * devices.length)];
      const p = (pin as Record<string, string | undefined>)[slot];
      if (p !== undefined && !devices.includes(p)) throw new Error(`deal.ts: PIN.${slot} is "${p}"; the slot takes ${devices.join(', ')}`);
      out[slot] = p ?? dealt;
    }
    last = out;
    if (RULES.every((x) => x.ok(out as Deal))) return out as Deal;
  }
  const broken = RULES.filter((x) => !x.ok(last as Deal)).map((x) => x.id);
  throw new Error(`deal.ts: the pinned devices break ${broken.join(', ')}; pin another device (template.json "deal")`);
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

/**
 * The lines this demo's acts set another way than the film's voice (fx/TypeSystem filmSystems reads this for the film's
 * seed): the result at poster size on the accent, centred, when the claim plays it (acts/Done AccentClaim).
 */
export const HEADLINES_SET = declareHeadlines(DEAL_SEED, { done: DEAL.done === 'claim' ? 'giant' : undefined });
