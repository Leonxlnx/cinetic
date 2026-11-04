// The teaser's devices, dealt per film. Every act (a slot) offers two or three devices that tell the same beat on the
// same cues with the same words: a film made from this template plays one of them per slot, picked from a seed (the
// product's name unless src/teaser.ts pins `deal.seed`), so two films never reproduce one fixed sequence of moves.
// The structure, the timing and the copy slots stay the template's; only the way each beat moves changes.
// template.json "deal" lists the same slots with what each device does. Node-safe: the timeline and src/sync.ts
// import it (the declarations follow the deal: the flash frame only with the flash cut, the colour event only with
// the claim). Pin a device in src/teaser.ts `deal.devices` once the direction asks for it.
import { TEASER } from './teaser';
import { compositionApart, declareHeadlines } from './fx/TypeSystem';

/** The slots and their devices, in act order. The first device of each slot is the template's own. */
export const SLOTS = {
  /** how the script's lines arrive (fx/TypePresets, all confident hero moves): out of a mask on their baseline, landing from
   *  oversized, or dropping word by word into place; each leaves at speed on its own exit (VOICE_EXIT) */
  voice: ['mask', 'land', 'fall'],
  /** the request box arriving under the what line */
  input: ['rise', 'drop', 'track'],
  /** the whip into the close-up: one near-white frame in it (the film's one declared snap) or a pure smear */
  cut: ['flash', 'smear'],
  /** the close-up: the send button leaves on a J-curve, or the camera dives into it */
  launch: ['jcurve', 'dive'],
  /** the window streaming code under the film's one 3D turn: a yaw, a pitch over the desk, or code beside the live app */
  window: ['yaw', 'pitch', 'split'],
  /** the proof: notifications stacked in depth, landing on a wall of tiles, or riding a ring of tiles */
  cards: ['stack', 'wall', 'ring'],
  /** what it made: cards cascading up a page, or the page as one lit panel */
  page: ['cascade', 'panel'],
  /** the product's stages: in corner brackets, pushed through by the camera, or set as a claim on the accent */
  stages: ['brackets', 'push', 'claim'],
  /** the end mark: two comets meeting, or the mark assembling from its parts */
  end: ['comets', 'assemble'],
} as const;

/**
 * What each device does to the frame, for the slots whose devices change the composition (where the type sits, where
 * the picture sits, which leads): a film's deal must move the frame, not only rename the devices (dealApart). The
 * voice, the input, the cut and the launch (one line, one box, one close-up in the middle) and the end (the mark in the
 * middle) change none.
 */
export const COMPOSITION: { [S in keyof typeof SLOTS]?: Record<string, string> } = {
  window: { yaw: 'one window turning in 3D', pitch: 'one window turning in 3D', split: 'code beside the live app, two panes' },
  cards: { stack: 'notices stacked in depth in the middle', wall: 'notices landing on a wall of tiles', ring: 'notices riding a ring of tiles' },
  page: { cascade: 'cards climbing a page', panel: 'one lit panel front on' },
  stages: { brackets: 'the stages in corner brackets', push: 'the stages in a row the camera pushes through', claim: 'type at poster size on the accent' },
};

export type Slot = keyof typeof SLOTS;
export type Device<S extends Slot> = (typeof SLOTS)[S][number];
export type Deal = { [S in Slot]: Device<S> };

/** Each voice's exit: it leaves at speed, never a fade (fx/TypePresets exits). */
export const VOICE_EXIT = { mask: 'drop', land: 'slide', fall: 'drop' } as const;

/** FNV-1a over a string (or a number's digits): the seed of a deal. */
export const hashSeed = (s: string | number): number => {
  let h = 0x811c9dc5;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** A small seeded generator (mulberry32): the same seed, the same deal, in any process. */
const seeded = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * What every deal keeps: the dive opens the window from inside the button, so it needs a whip with no flash before
 * it (two declared cuts in four bars read as a stutter); the claim floods the frame with the accent, so the page's
 * panel (the other bright, front-on frame) does not sit right before it.
 */
export const RULES: { id: string; ok: (d: Deal) => boolean }[] = [
  { id: 'dive-after-a-smear', ok: (d) => d.launch !== 'dive' || d.cut === 'smear' },
  { id: 'claim-not-after-the-panel', ok: (d) => d.stages !== 'claim' || d.page !== 'panel' },
];

/** The film's deal from a seed: one device per slot, `pin` kept as given, re-dealt until every rule holds. Pure. */
export const dealDevices = (seed: string | number, pin: Partial<Deal> = {}): Deal => {
  const slots = Object.keys(SLOTS) as Slot[];
  let last: Deal | null = null;
  for (let attempt = 0; attempt < 64; attempt++) {
    const rnd = seeded(hashSeed(seed) + attempt * 7919);
    const d = Object.fromEntries(slots.map((k) => {
      const list = SLOTS[k] as readonly string[];
      const pick = list[Math.floor(rnd() * list.length) % list.length];
      return [k, (pin as Record<string, string | undefined>)[k] ?? pick];
    })) as Deal;
    last = d;
    if (RULES.every((r) => r.ok(d))) return d;
  }
  const broken = RULES.filter((r) => last && !r.ok(last)).map((r) => r.id);
  throw new Error(`deal.ts: the pinned devices break ${broken.join(', ')}; pin another device (template.json "deal")`);
};

/** The template's own deal: what its scaffold plays before the product's name is in (the placeholder name). */
const FLOOR_SEED = hashSeed('[Product]');
export const FLOOR: Deal = dealDevices('[Product]');
/**
 * A film is never the template replayed: of the slots it deals (pins aside), at least half play another device than
 * the floor's, and at least half of those that carry a composition (COMPOSITION) play another composition, so the
 * frame moves (where the type and the picture sit, which leads), not only the devices' names; else it re-deals from
 * the next seed (the first seed that differs keeps its deal). The unnamed scaffold keeps the floor. On the pixels:
 * render the untouched template once (out/scaffold.mp4) and run `python3 scripts/like.py guard --film out/film.mp4
 * --scaffold out/scaffold.mp4` before delivery: no frame retold, no composition re-skinned.
 */
export const dealApart = (seed: string | number, pin: Partial<Deal> = {}): Deal => {
  const s0 = hashSeed(seed);
  const free = (Object.keys(SLOTS) as Slot[]).filter((s) => pin[s] === undefined);
  for (let k = 0; s0 !== FLOOR_SEED && k < 64; k++) {
    const d = dealDevices(k ? (s0 + k * 104729) >>> 0 : seed, pin);
    if (2 * free.filter((s) => d[s] !== FLOOR[s]).length >= free.length && compositionApart(d, FLOOR, COMPOSITION, free).ok) return d;
  }
  return dealDevices(seed, pin);
};
/** The deal a product of this name gets, unpinned: the same name, the same deal, never the floor's. */
export const dealOf = (name: string): Deal => dealApart(name);

/** The seed the film's deal comes from (a number, for the grounds and anything else seeded per film). */
export const DEAL_SEED = hashSeed(TEASER.deal.seed ?? TEASER.name);

/** This film's devices. */
export const DEAL: Deal = dealApart(TEASER.deal.seed ?? TEASER.name, TEASER.deal.devices);

for (const [k, v] of Object.entries(DEAL)) {
  if (!(SLOTS[k as Slot] as readonly string[]).includes(v)) throw new Error(`deal.ts: "${v}" is not a device of slot "${k}" (${SLOTS[k as Slot].join(', ')})`);
}

/**
 * The lines this teaser's acts set another way than the film's voice (fx/TypeSystem filmSystems reads this for the
 * film's seed): none. Every line is one centred line on the voice; a film that wants its one stack declares it here
 * ({ what: 'stack' }) and passes `stack` to its StatementLine.
 */
export const HEADLINES_SET = declareHeadlines(DEAL_SEED, {});
