// The demo's device slots, dealt per film. The template keeps its structure, its timing and its copy slots; how each
// beat moves is one of two or three devices, dealt from a seed (the product's name, or SEED below), so two films made
// from this template never play one fixed signature sequence. Pin a slot in PIN to choose it by hand; template.json
// "deal" says what each device does. Print the deal: npx tsx -e "import { DEAL } from './src/deal'; console.log(DEAL)"
// Node-safe: the timeline and the sound read it (the declarations follow the deal: the colour event belongs to the
// iris or to the claim, never both).
import { IDENTITY } from './brand/identity';

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

/** This film's seed and deal. */
export const DEAL_SEED = SEED ?? hashSeed(IDENTITY.name);
export const DEAL: Deal = dealDevices(DEAL_SEED, PIN);
