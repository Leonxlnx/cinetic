// The update film's choices, dealt per film. The structure never changes (the name and the version centred, each change
// on its own beat shape, the recap of every change, the version mark built from it); how each part looks does. The seed
// is the product's name (src/brand/identity.ts: the same name, the same deal, on any machine); SEED re-deals without
// renaming, PIN fixes a slot by hand. The unnamed scaffold ('[Product]') plays the floor; a named film never replays it.
// Print what this film plays: npx tsx -e "import { DEAL, DEAL_SOURCE, LINES } from './src/deal'; console.log(DEAL_SOURCE, DEAL, LINES.voice, LINES.exitVoice)"
// Node-safe (no React, no CSS): the timeline and the sound read it.
//
// The camera never floats: it moves only when the story moves (a card arriving, reshaping, expanding), and a hold is
// still. Nothing bobs or sways, and no card is tilted: the cards face the lens.
//
//   slot     choices          what each does
//   ground   nearWhite        (fx/Grounds GROUND_FAMILIES) one lit, still family for the whole film, never cut: a paper
//            lightStudio      sweep, a light grey studio, a pale sky, a pale tinted mesh, studio black under one key, a
//            softSky          slate cyclorama, a deep field at the accent's hue with a glow rising, a deep tinted night,
//            gradientField    near-black with one glow rising from the floor. The film's one colour event is the field
//            blackField       one line stands on (timeline.ts COLOUR)
//            studio
//            deepPool
//            duskMesh
//            floorGlow
//   (cards)  light, dark      the cards' material (kit/card): light on a light family; on a dark family dealt light or
//                             dark (a card 8-12 L* over the ground with a rim of light), CARD_TONE
//   (field)  voice            how the 'after' line stands on its colour field (FIELD_TYPE): in the film's voice, or as
//            scale-contrast   the creative library's composition (fx/creative): its key word huge, the rest small above
//                             and under it (a line carrying another product's mark keeps the voice)
//   hook     roll             "[Name] [old version]" centred; once the name is read the changed numerals roll on a
//                             drum to the new version (whole glyphs, never squashed)
//            rise             the name, then the version rising out of a mask in its place beside it (the pair is
//                             centred from the first frame, so the name never slides while it is read)
//            badge            the name alone, centred; a dot lands after it and grows into the pill that carries the
//                             version (the end card sets the version in the same pill)
//   arrive   rise             how the first card comes in as the name lifts away: it rises into place; a hairline at
//            open             the centre opens into it; or one of the creative library's opening pictures (fx/creative:
//            pixel-assemble   tiles assemble it from its centre outward; a dot morphs through a pill and a square into
//            shape-morph      its frame, which opens; it enters edge-on and turns to face the lens on one move, landing
//            object-turn      still). A change that opens on 'split' grows in its line's gap instead
//   order    (the beat shapes) each change gets its own shape, none twice in a row:
//            after            the change works first (1-3.5 s), then the element that changed (the pressed button, the
//                             block that landed, the row, the last bar) grows into the frame's colour field, the line
//                             reads on it, and the field closes into the next card (the film's one colour event)
//            split            the line arrives parted round the card, which sits small in the gap between its words;
//                             the words leave and the card grows out of the gap to full size and works
//            with             the card works in the upper half while its line reads centred under it (the film's one
//                             split frame)
//   recap    deal             the carried card lands in the recap row and the other changes slide out from behind it
//            rise             the carried card lands in the recap row as the other changes rise into their places
//   end      stack            the recap's cards slide onto each other at the centre and the top one shrinks into the
//                             mark; the name slides out of it, then the version lands on the last bar line
//            fold             the recap's cards fold inward to the centre one, which shrinks into the mark; then the
//                             name and the version, as in stack
//   (lines)  voice            every line on one move (mask, fall or crisp: none travels sideways, so a long line is
//                             never cut by the frame as it enters) and one whole-line exit (lift or recede: the line
//                             leaves as one, never word by word)
import { IDENTITY } from './brand/identity';
import { RECENT } from './recent';
import { UPDATE } from './update';

export type Shape = 'after' | 'split' | 'with';

/** Every order of beat shapes for n changes: one 'after' (the colour event), at most one 'with' (the film's one split frame), no shape twice in a row, never 'after' then 'split' (two lines in a row). */
export const ordersFor = (n: number): Shape[][] => {
  const out: Shape[][] = [];
  const all: Shape[] = ['after', 'split', 'with'];
  const walk = (seq: Shape[]) => {
    if (seq.length === n) {
      if (seq.filter((s) => s === 'after').length === 1 && seq.filter((s) => s === 'with').length <= 1) out.push(seq);
      return;
    }
    for (const s of all) {
      const last = seq[seq.length - 1];
      if (s === last) continue;
      if (last === 'after' && s === 'split') continue;
      walk([...seq, s]);
    }
  };
  walk([]);
  return out;
};
/**
 * The orders this film can play: a change whose line carries another product's mark ("[]") is never split round the card
 * (its gap holds the mark), and the film never opens on a split whose card would sit empty in the gap (a fill before it
 * has filled).
 */
const ORDERS = ordersFor(UPDATE.changes.length)
  .filter((o) => o.every((shape, i) => shape !== 'split' || (!UPDATE.changes[i].words.includes('[]') && (i > 0 || UPDATE.changes[0].show.kind !== 'fill'))))
  .map((o) => o.join('-'));

/**
 * The first card's arrivals: the template's own two, then the creative library's picture devices (fx/creative/meta ids)
 * that open a film, need nothing from the script and end on the product at rest (dot-button presses a button, which an
 * update's first change may not have, so it stays out). Written out here so this file stays standalone (Node, no starter).
 */
export const ARRIVALS: readonly string[] = ['rise', 'open', 'pixel-assemble', 'shape-morph', 'object-turn'];

export const DEVICES = {
  ground: ['nearWhite', 'lightStudio', 'softSky', 'gradientField', 'blackField', 'studio', 'deepPool', 'duskMesh', 'floorGlow'],
  hook: ['roll', 'rise', 'badge'],
  arrive: ARRIVALS,
  order: ORDERS,
  recap: ['deal', 'rise'],
  end: ['stack', 'fold'],
} as const;

export type Slot = keyof typeof DEVICES;
export type Deal = { ground: string; hook: string; arrive: string; order: string; recap: string; end: string };

/**
 * What each composing slot does to the frame, in words (fx/TypeSystem compositionApart): two devices with the same words
 * are one composition. The ground and the cards' tone are palette, not composition, and are left out.
 */
export const COMPOSITION: { [S in Slot]?: Record<string, string> } = {
  hook: { roll: 'the name and the version together from the first frame, the numerals rolling', rise: 'the name, then the version rising beside it', badge: 'the name, then the version in a pill beside it' },
  arrive: { rise: 'the card rising into place', open: 'a hairline opening into the card', 'pixel-assemble': 'tiles assembling the card from its centre', 'shape-morph': 'a dot becoming the frame of the card', 'object-turn': 'the card turning to face the lens' },
  order: Object.fromEntries(ORDERS.map((o) => [o, o])),
  recap: { deal: 'the other cards sliding out from behind the last', rise: 'the other cards rising into the row' },
  end: { stack: 'the cards piling at the centre into the mark', fold: 'the cards folding behind the last into the mark' },
};

/** What the template plays before the product's name is in (its name slot, '[Product]'): a product's deal never replays it. */
export const FLOOR: Deal = { ground: 'blackField', hook: 'rise', arrive: 'rise', order: ORDERS[0], recap: 'rise', end: 'stack' };

/** Choose a slot by hand ({ ground: 'softSky' }); a pinned slot is not dealt. */
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
/** murmur3's finaliser: every bit of the seed reaches every bit, so names that differ in one letter deal apart. */
const fmix = (h: number): number => {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
/** mulberry32 on the mixed seed: the same seed, the same deal, in any render order; every choice of a slot equally likely. */
const rng = (seed: number) => {
  let a = fmix(seed) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A slot's choices without the last three films' (src/recent.ts, written by new-film.sh from the film history). */
const fresh = (s: Slot): readonly string[] => {
  const all = DEVICES[s] as readonly string[];
  const used = ((RECENT as Partial<Record<string, readonly string[]>>)[s] ?? []).filter((c) => all.includes(c));
  const left = all.filter((c) => !used.includes(c));
  return left.length ? left : [used[used.length - 1]];
};

const isPlaceholder = (name: string) => /^\[.*\]$/.test(name.trim());

/**
 * The deal for a seed: one choice per slot, re-drawn (deterministically) until at least half the dealt slots differ from
 * the floor, and half of those that compose the frame (COMPOSITION).
 */
export const dealApart = (seed: number, pin: Partial<Deal> = PIN): Deal => {
  const slots = Object.keys(DEVICES) as Slot[];
  const free = slots.filter((s) => pin[s] === undefined);
  const bearing = free.filter((s) => COMPOSITION[s]);
  let d: Deal = { ...FLOOR };
  for (let salt = 0; salt < 64; salt++) {
    const r = rng((seed + salt * 104729) >>> 0);
    d = Object.fromEntries(slots.map((s) => {
      const opts = fresh(s);
      return [s, pin[s] ?? opts[Math.floor(r() * opts.length)]];
    })) as Deal;
    if (2 * free.filter((s) => d[s] !== FLOOR[s]).length >= free.length && 2 * bearing.filter((s) => d[s] !== FLOOR[s]).length >= bearing.length) return d;
  }
  return d;
};
/** A product's deal from its name (the same name, the same deal, on any machine). */
export const dealOf = (name: string): Deal => dealApart(hashSeed(name));

for (const [s, v] of Object.entries(PIN)) {
  if (v !== undefined && !(DEVICES[s as Slot] as readonly string[]).includes(v)) throw new Error(`deal.ts: PIN.${s} is "${v}"; the slot takes ${(DEVICES[s as Slot] as readonly string[]).join(', ')}`);
}

/** This film's seed and deal: the unnamed scaffold keeps the floor; a named film is dealt from its name (or SEED). */
export const DEAL_SEED = SEED ?? hashSeed(IDENTITY.name);
export const DEAL: Deal = SEED === null && isPlaceholder(IDENTITY.name) ? { ...FLOOR, ...PIN } : dealApart(DEAL_SEED);
/** Where the deal came from, for the print. */
export const DEAL_SOURCE = `${SEED !== null ? `SEED ${SEED}` : isPlaceholder(IDENTITY.name) ? 'the floor (the name slot is still [Product])' : `the name "${IDENTITY.name}"`}${Object.keys(PIN).length ? `, pinned: ${Object.keys(PIN).join(', ')}` : ''}`;
/** The dark ground families (fx/Grounds GROUND_FAMILIES tone 'dark'): only on these are the cards dealt light or dark. */
export const DARK_GROUNDS: readonly string[] = ['blackField', 'studio', 'deepPool', 'duskMesh', 'floorGlow'];
export const CARD_TONES = ['light', 'dark'] as const;
/** The cards' tone (kit/card): light on a light family; on a dark one dealt from the seed (the floor keeps light cards). */
export const CARD_TONE: (typeof CARD_TONES)[number] = DARK_GROUNDS.includes(DEAL.ground) && !(SEED === null && isPlaceholder(IDENTITY.name)) ? CARD_TONES[Math.floor(rng((DEAL_SEED ^ 0x27d4eb2f) >>> 0)() * 2)] : 'light';
/** The beat shape of each change, in film order. */
export const SHAPES_OF = (d: Deal): Shape[] => d.order.split('-') as Shape[];
/** The 'after' line's setting on its field: the voice or the library's scale-contrast, dealt from the seed (the floor keeps the voice). */
export const FIELD_TYPES = ['voice', 'scale-contrast'] as const;
export const FIELD_TYPE: (typeof FIELD_TYPES)[number] = (() => {
  const i = SHAPES_OF(DEAL).indexOf('after');
  if (i < 0 || UPDATE.changes[i].words.includes('[]') || (SEED === null && isPlaceholder(IDENTITY.name))) return 'voice';
  return FIELD_TYPES[Math.floor(rng((DEAL_SEED ^ 0x165667b1) >>> 0)() * FIELD_TYPES.length)];
})();
export const SHAPES: Shape[] = DEAL.order.split('-') as Shape[];

// ---- The lines' voice: every line arrives on one move and leaves on one whole-line exit, dealt once per film.

/** The moves a line takes (fx/TypePresets): none travels sideways or cuts in oversized, so no line is cut by the frame as it enters. */
export const MOVES = ['mask', 'fall', 'crisp'] as const;
export type Move = (typeof MOVES)[number];
/** The exits: the whole line leaves as one (lift: up 0.3 em into a 0.1 em blur; recede: back to 94 % out of focus), gone before its travel ends, never word by word. */
export const EXITS = ['lift', 'recede'] as const;
export type Exit = (typeof EXITS)[number];
/** Frames (60 fps) from a move's start until a line of n words (index n - 1, 1-8 words) is read (fx/TypePresets typeLineFrames().resolved). */
export const RESOLVE60: Record<Move, readonly number[]> = {
  crisp: [6, 13, 20, 27, 34, 41, 48, 55],
  mask: [12, 32, 40, 48, 56, 64, 72, 80],
  fall: [12, 21, 30, 39, 48, 57, 66, 75],
};
/** Frames (60 fps) an exit takes. */
export const EXIT60: Record<Exit, number> = { lift: 24, recede: 26 };

/** The film's change lines and its voice. */
export const LINE_IDS = ['change1', 'change2', 'change3', 'change4'] as const;
export const LINES = (() => {
  const r = rng((DEAL_SEED ^ 0x5bd1e995) >>> 0);
  const used = (RECENT as Partial<Record<string, readonly string[]>>).voice ?? [];
  const pool = MOVES.filter((m) => !used.includes(m));
  const moves = pool.length ? pool : MOVES;
  const voice: Move = isPlaceholder(IDENTITY.name) && SEED === null ? 'mask' : moves[Math.floor(r() * moves.length)];
  const exitVoice: Exit = isPlaceholder(IDENTITY.name) && SEED === null ? 'lift' : EXITS[Math.floor(r() * EXITS.length)];
  return { voice, exitVoice, move: Object.fromEntries(LINE_IDS.map((id) => [id, voice])) as Record<string, Move>, exit: Object.fromEntries(LINE_IDS.map((id) => [id, exitVoice])) as Record<string, Exit> };
})();
