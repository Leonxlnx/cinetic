/**
 * Headline systems: how a film sets its hero lines, dealt per film. A system is more than the device on the key words:
 * it is the line's whole build (one line, a stack, a giant word, a typed line, an object inside the sentence, a word that
 * swaps, a push through the type), and a film that sets three of six lines in one system reads as a template however its
 * devices are named. So a film deals its lines from this set, the same way it deals its emphasis devices:
 *
 *   plain    one sentence, the key words at the emphasis weight in the accent (weight, accent): the quiet one
 *   front    one sentence; once it lands, the accent crosses the key words (sweep) or they fill from an outline (outline)
 *   marker   one sentence; a bar or the inverted box wipes on behind the key words (marker, box)
 *   rule     one sentence; a rule draws under the key words, skipping the descenders (under)
 *   swell    one sentence; the key words grow a step once landed, or sit a step up (swell, scale)
 *   stack    a stacked statement: the lead small over the key words big (fx/TypeStack StatementLine)
 *   giant    poster type: the line at poster size flush to an edge on the accent (fx/TypeClaim AccentClaim), or one
 *            giant word with the rest hung small beside it (fx/TypeStack, STACK_LOOK's giant plus small)
 *   inline   inline media: a picture, mark or glyph set inside the sentence as one of its words (acts/type MarkLine)
 *   typed    a typed line: letters typed on behind a caret (fx/TypeOn)
 *   swap     a word swap: the key word changes in place, the line re-flowing round it (TypePresets wheel, erode)
 *   push     a scale push: the camera pushes through the line onto its key word (fx/TypePush)
 *
 * The rules (dealSystems): no system on two lines in a row, and none on more than two lines of a film (MAX_PER_FILM; a
 * film with more lines than its pool can hold at two each spreads them as evenly as it can). A line the act sets one way
 * (an object inside the sentence, a push) is `given`: it counts, and the lines round it are dealt apart from it. A line
 * placed by its measured width (a label in a pill, a line beside a mark) is `fixed`: only the systems that keep the
 * width (plain, front, rule). Pins win. A template's deal declares the lines its acts set one way for its seed
 * (declareHeadlines): fx/TypeEmphasis deals the devices round them. Pure and import-free (a template's deal.ts, which
 * the timeline and the sound read in Node, imports it): no DOM, no Remotion.
 */
import type { EmphasisName } from './TypeEmphasis';

/** lib/anim's rand (the same numbers), here so this file imports nothing a Node deal file cannot. */
const rand = (seed: number | string) => {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export type HeadlineSystem = 'plain' | 'front' | 'marker' | 'rule' | 'swell' | 'stack' | 'giant' | 'inline' | 'typed' | 'swap' | 'push';
export const HEADLINE_SYSTEMS: HeadlineSystem[] = ['plain', 'front', 'marker', 'rule', 'swell', 'stack', 'giant', 'inline', 'typed', 'swap', 'push'];

/** A system on at most this many lines of one film. */
export const MAX_PER_FILM = 2;

/** The emphasis devices each system may put on its key words (the first is its own). */
export const SYSTEM_DEVICES: Record<HeadlineSystem, EmphasisName[]> = {
  plain: ['weight', 'accent'],
  front: ['sweep', 'outline'],
  marker: ['marker', 'box'],
  rule: ['under'],
  swell: ['swell', 'scale'],
  stack: ['weight', 'accent'],
  giant: ['weight', 'accent'],
  inline: ['weight', 'accent', 'scale'],
  typed: ['accent', 'weight'],
  swap: ['accent', 'weight'],
  push: ['weight', 'accent', 'sweep'],
};

/** The systems one line of type can play by its emphasis device alone (any template's TypeLine). */
export const DEVICE_SYSTEMS: HeadlineSystem[] = ['plain', 'front', 'marker', 'rule', 'swell'];
/** The systems that keep a line's measured width (a line placed by its width takes only these). */
export const WIDTH_HELD: HeadlineSystem[] = ['plain', 'front', 'rule'];

/** The system an emphasis device plays on a plain line. */
export const systemOfDevice = (d: EmphasisName | false | undefined): HeadlineSystem | null => {
  if (!d) return null;
  for (const s of DEVICE_SYSTEMS) if (SYSTEM_DEVICES[s].includes(d)) return s;
  return null;
};

export type SystemDealOpts = {
  pool?: readonly HeadlineSystem[]; // the systems this film can set (default DEVICE_SYSTEMS)
  given?: Partial<Record<string, HeadlineSystem>>; // lines the act sets one way: they count and are never re-dealt
  pin?: Partial<Record<string, HeadlineSystem>>; // lines pinned by hand (they win over `given`)
  fixed?: readonly string[]; // lines placed by their measured width: WIDTH_HELD only
  first?: boolean; // the first line reads in its plainest contrast (plain) when nothing pins it
};

/**
 * One system per line id, in film order, from `seed`: never the same system on two lines in a row, none on more than
 * MAX_PER_FILM lines (when the pool can hold the film at that; else spread as evenly as it can), the systems used least
 * so far first, the first line plain when `first`. `given` and `pin` lines keep theirs (two given lines side by side in
 * one system are the act's, and stay). A small search, so a line placed by its width late in the film still finds a
 * system that keeps it. Pure: the same seed, the same deal.
 */
export const dealSystems = (ids: readonly string[], seed: string | number, o: SystemDealOpts = {}): Record<string, HeadlineSystem> => {
  const pool = [...(o.pool ?? DEVICE_SYSTEMS)];
  const set: Record<string, HeadlineSystem> = {};
  for (const id of ids) {
    const s = o.pin?.[id] ?? o.given?.[id];
    if (s) set[id] = s;
  }
  const base: Partial<Record<HeadlineSystem, number>> = {};
  for (const s of Object.values(set)) base[s] = (base[s] ?? 0) + 1;
  const free = ids.filter((id) => !set[id]).length;
  const room = pool.reduce((a, s) => a + Math.max(0, MAX_PER_FILM - (base[s] ?? 0)), 0);
  const allowedOf = (id: string) => {
    const a = pool.filter((s) => !(o.fixed ?? []).includes(id) || WIDTH_HELD.includes(s));
    return a.length ? a : pool;
  };
  const solve = (cap: number, apartNext: boolean): Record<string, HeadlineSystem> | null => {
    const out: Record<string, HeadlineSystem> = {};
    const count: Partial<Record<HeadlineSystem, number>> = { ...base };
    let budget = 20000;
    const go = (i: number): boolean => {
      if (i === ids.length) return true;
      if (--budget < 0) return false;
      const id = ids[i];
      if (set[id]) {
        out[id] = set[id];
        return go(i + 1);
      }
      const prev = i ? out[ids[i - 1]] : undefined;
      const next = apartNext && i + 1 < ids.length ? set[ids[i + 1]] : undefined;
      const opts = allowedOf(id).filter((s) => s !== prev && s !== next && (count[s] ?? 0) < cap);
      const order = opts
        .map((s) => ({ s, k: (i === 0 && o.first && s === 'plain' ? -1 : (count[s] ?? 0)) + rand(`${seed}:system:${i}:${s}`) * 0.5 }))
        .sort((a, b) => a.k - b.k)
        .map((x) => x.s);
      for (const s of order) {
        out[id] = s;
        count[s] = (count[s] ?? 0) + 1;
        if (go(i + 1)) return true;
        count[s] = (count[s] ?? 0) - 1;
      }
      delete out[id];
      return false;
    };
    return go(0) ? out : null;
  };
  const cap = room >= free ? MAX_PER_FILM : Math.max(MAX_PER_FILM, Math.ceil(ids.length / Math.max(1, pool.length)));
  return solve(cap, true) ?? solve(cap + 1, true) ?? solve(Infinity, true) ?? solve(Infinity, false) ?? Object.fromEntries(ids.map((id, i) => [id, set[id] ?? allowedOf(id)[i % allowedOf(id).length]]));
};

export type SystemCheck = { ok: boolean; repeats: { at: number; system: HeadlineSystem }[]; over: { system: HeadlineSystem; lines: number }[] };

/**
 * A film's headline systems in film order (null for a line that sets none: a name, a caption): the lines that repeat
 * the system of the line before, and the systems on more than MAX_PER_FILM lines. Pure.
 */
export const checkSystems = (seq: readonly (HeadlineSystem | null | undefined)[]): SystemCheck => {
  const live = seq.filter((s): s is HeadlineSystem => !!s);
  const repeats: SystemCheck['repeats'] = [];
  live.forEach((s, i) => {
    if (i && s === live[i - 1]) repeats.push({ at: i, system: s });
  });
  const n: Partial<Record<HeadlineSystem, number>> = {};
  for (const s of live) n[s] = (n[s] ?? 0) + 1;
  const over = (Object.entries(n) as [HeadlineSystem, number][]).filter(([, k]) => k > MAX_PER_FILM).map(([system, lines]) => ({ system, lines }));
  return { ok: !repeats.length && !over.length, repeats, over };
};

/** A device for a line in `system`: from the devices the family deals that the system allows, never `prev` when another fits. Pure. */
export const deviceOfSystem = (system: HeadlineSystem, familyPool: readonly EmphasisName[], seed: string, prev?: EmphasisName | false): EmphasisName => {
  const own = SYSTEM_DEVICES[system];
  const can = own.filter((d) => familyPool.includes(d));
  const list = can.length ? can : own;
  const opts = list.length > 1 ? list.filter((d) => d !== prev) : list;
  return opts[Math.floor(rand(seed) * opts.length) % opts.length];
};

// ---- What a template's acts set one way, per film

const DECLARED = new Map<string, Partial<Record<string, HeadlineSystem>>>();
/**
 * A template's deal file declares, for its film's seed, the lines its acts set in one system whatever is dealt (the
 * opener as a stack, a request typed into a box, a claim on the accent at poster size, a push through a line): the
 * template's line deal (fx/TypeEmphasis dealLineHeadlines, dealLineEmphasis) counts them and deals the other lines
 * round them. Returns what it declared.
 */
export const declareHeadlines = (seed: string | number, systems: Partial<Record<string, HeadlineSystem | undefined>>) => {
  const clean: Partial<Record<string, HeadlineSystem>> = {};
  for (const [id, s] of Object.entries(systems)) if (s) clean[id] = s;
  DECLARED.set(String(seed), { ...(DECLARED.get(String(seed)) ?? {}), ...clean });
  return clean;
};
/** The lines declared for `seed` (declareHeadlines). */
export const declaredHeadlines = (seed: string | number): Partial<Record<string, HeadlineSystem>> => DECLARED.get(String(seed)) ?? {};

// ---- Composition: what a dealt device does to the frame

/**
 * Whether a film's deal moves the frame away from the template's own (its scaffold, FLOOR): `table` gives, per slot
 * whose devices change the composition, each device's composition in words (where the type sits, where the picture
 * sits, which of them leads); slots left out of it (a palette, a transition, a type move) change no composition.
 * Two devices with the same words are one composition, whatever their names. A deal is apart when at least half the
 * free slots that carry a composition play another composition than the floor. Pure.
 */
export const compositionApart = <D extends Record<string, string>>(
  d: D,
  floor: D,
  table: { [K in keyof D]?: Record<string, string> },
  free: readonly (keyof D)[],
): { bearing: number; moved: number; ok: boolean } => {
  const bearing = free.filter((s) => table[s]);
  const moved = bearing.filter((s) => {
    const t = table[s] as Record<string, string>;
    return (t[d[s]] ?? d[s]) !== (t[floor[s]] ?? floor[s]);
  }).length;
  return { bearing: bearing.length, moved, ok: 2 * moved >= bearing.length };
};
