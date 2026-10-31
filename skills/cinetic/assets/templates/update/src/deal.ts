// The update film's choices, dealt per film. The structure never changes (the name and the version centred, each change
// a picture and a line, the recap of every change, the version mark built from it); how each part looks does. The seed
// is the product's name (src/brand/identity.ts: the same name, the same deal, on any machine); SEED re-deals without
// renaming, PIN fixes a slot by hand. The unnamed scaffold ('[Product]') plays the floor; a named film never replays it.
// Print what this film plays: the command in template.json deal.print.
// Node-safe (no React, no CSS, nothing from the starter): the timeline, the sound and the tests read it.
//
// The camera never floats: it moves only when the story moves (a card arriving, a creative device's own move, the
// pointer it follows), and a hold is still. Nothing bobs or sways, and no card rests tilted: the cards face the lens.
//
//   slot     choices          what each does
//   ground   nearWhite ...    one of the eleven lit, still families (fx/Grounds FamilyGround) for the whole film, never
//            (all eleven)     cut; its colour event (FamilyGround event: the accent lobe, the key taking the accent, the
//                             glow rising, the band flooding, the turn to dark) is the film's one, under the 'after'
//                             change's field. The deck's direction sets it when deck.py dealt one (src/dealt.ts)
//   (cards)  light, dark      the cards' material (kit/card Card): light on a light family; on a dark one dealt light or
//                             dark (a card 8-12 L* over the ground with a rim of light), CARD_TONE
//   hook     roll             "[Name] [old version]" centred; the changed numerals roll on a drum to the new version
//            rise             the name, then the version rising out of a mask beside it (the pair centred from frame 0)
//            badge            the name alone, centred; a dot lands after it and grows into the pill carrying the version
//   arrive   rise, open       how a card comes in that no creative device brings: it rises into place, or a hairline at
//                             the centre opens into it
//   order    (the shapes)     each change is a picture and a line, in its own shape:
//            show             the picture first (the card arrives and works), then the card folds shut into a bar of
//                             light and its line rises from it, alone in the middle of the frame
//            after            the picture first, then the element that changed (the pressed button, the block, the row,
//                             the last bar) grows into the frame's colour field and the line reads on it (once a film:
//                             the colour event)
//            split            the line first, parted round the card, which sits small in the gap between its words; the
//                             words leave and the card grows out of the gap as the new screen and works
//            lead             the line first, alone (the card before it folds into the bar it rises from), then the
//                             picture
//                             A line never follows a line: once a change opens on its picture, the later ones do too
//   recap    deal, rise       the carried card lands in the recap row and the others slide out from behind it, or rise
//   end      stack, fold      the recap's cards pile (or tuck behind the last) and shrink into the mark; the name slides
//                             out of it and the version lands on the last bar line, apart from the name
//   (creative)                the film's creative devices (fx/creative), CREATIVE below: the deck's (src/dealt.ts) or
//                             dealt from the name, each played on the change it shows best (cursor-follow on a tap,
//                             bubble-swarm on the pings a change ends, split-compare on a before -> after, photo-arc on
//                             photos, logo-orbit on the products it works with; pixel-assemble, shape-morph, object-turn
//                             bring any card in), two or more a film
//   (lines)  voice            every line on one move (mask, fall or crisp) and one whole-line exit (lift or recede);
//                             the field line is the library's scale-contrast (its key word huge); a line device the deck
//                             dealt (letter-swing, word-swap) takes a line of its own; every other line's key word is
//                             set in the accent
import { IDENTITY } from './brand/identity';
import { DEALT } from './dealt';
import { RECENT } from './recent';
import { beforeOf, type Change, photosOf, UPDATE } from './update';

export type Shape = 'show' | 'after' | 'split' | 'lead';
/** A shape that opens on its picture (the line comes after it). */
export const pictureFirst = (s: Shape) => s === 'show' || s === 'after';

/**
 * Every order of shapes for n changes: one 'after' (the colour event); a line never follows a line, so the shapes that
 * open on their line (split, lead) come only before every shape that opens on its picture; 'lead' never opens the film
 * (the name and the version are its first words) and never twice in a row; 'split' never twice in a row.
 */
export const ordersFor = (n: number): Shape[][] => {
  const out: Shape[][] = [];
  const all: Shape[] = ['show', 'after', 'split', 'lead'];
  const walk = (seq: Shape[]) => {
    if (seq.length === n) {
      if (seq.filter((s) => s === 'after').length === 1) out.push(seq);
      return;
    }
    for (const s of all) {
      const last = seq[seq.length - 1];
      if (!seq.length && s === 'lead') continue;
      if (last && pictureFirst(last) && !pictureFirst(s)) continue;
      if (last === s && !pictureFirst(s)) continue;
      if (s === 'after' && seq.includes('after')) continue;
      walk([...seq, s]);
    }
  };
  walk([]);
  return out;
};

/** Whether change i's card comes in on its own (after the name, a line or the colour field): a creative device may bring it. */
export const entranceAt = (order: readonly Shape[], i: number) => (pictureFirst(order[i]) ? i === 0 || pictureFirst(order[i - 1]) : order[i] === 'lead');

// ---- The creative library, as far as this template plays it (the ids, roles and families of fx/creative/meta.ts,
// written out so this file stays standalone; timeline.ts checks them against the starter's library at load).
//   entrance  a picture device that brings the card in and ends on it at rest (the card arrives after a line)
//   scene     a picture device that plays on the card at rest (cursor-follow: the camera rides the pointer to its button)
//   line      a line device (the field line's scale-contrast; letter-swing and word-swap on a line of their own)
//   none      a device this template does not play (its part is the carried card's own: zoom-wall, data-sculpture,
//             colour-flood, dot-button, type-object, type-window, split-around): the next one in the deal takes its place
export type CreativePlay = 'entrance' | 'scene' | 'line' | 'none';
export const CREATIVE_PLAYS: Record<string, { family: string; play: CreativePlay }> = {
  'word-swap': { family: 'type-swap', play: 'line' },
  'scale-contrast': { family: 'type-scale', play: 'line' },
  'type-window': { family: 'type-image', play: 'none' },
  'type-object': { family: 'type-object', play: 'none' },
  'letter-swing': { family: 'type-swing', play: 'line' },
  'split-around': { family: 'type-split', play: 'none' },
  'pixel-assemble': { family: 'system', play: 'entrance' },
  'shape-morph': { family: 'shape', play: 'entrance' },
  'object-turn': { family: 'object', play: 'entrance' },
  'logo-orbit': { family: 'logos', play: 'entrance' },
  'split-compare': { family: 'compare', play: 'entrance' },
  'data-sculpture': { family: 'data', play: 'none' },
  'colour-flood': { family: 'colour', play: 'none' },
  'zoom-wall': { family: 'scale', play: 'none' },
  'photo-arc': { family: 'river', play: 'entrance' },
  'cursor-follow': { family: 'pointer', play: 'scene' },
  'bubble-swarm': { family: 'swarm', play: 'entrance' },
  'dot-button': { family: 'point', play: 'none' },
};
const CREATIVE_IDS = Object.keys(CREATIVE_PLAYS);

/**
 * How well picture device `id` shows change c (0: it cannot; 1: it brings any card in; 3: it shows this change), with
 * `entrance` whether the change's card comes in on its own there.
 */
export const creativeFit = (id: string, c: Change, entrance: boolean): number => {
  const s = c.show;
  const before = beforeOf(c);
  switch (id) {
    case 'cursor-follow':
      return s.kind === 'tap' ? 3 : 0;
    case 'split-compare':
      return entrance && before.length >= 2 && before.length <= 4 ? 3 : 0;
    case 'bubble-swarm':
      return entrance && (c.before?.length ?? 0) >= 4 ? 3 : 0;
    case 'photo-arc':
      return entrance && photosOf(c).length >= 5 ? 3 : 0;
    case 'logo-orbit':
      return entrance && (c.logos?.length ?? 0) >= 3 ? 3 : 0;
    case 'pixel-assemble':
    case 'shape-morph':
    case 'object-turn':
      return entrance ? 1 : 0;
    default:
      return 0;
  }
};

/**
 * The film's picture devices, one per change at most, from the deal's order (`order`: the dealt devices first, then the
 * reserve), so each device shows its change: first every dealt device that shows a change outright (fit 3) takes it;
 * then each change still without one takes the first device of the reserve that shows it; then a dealt device that only
 * brings a card in (fit 1) takes a change still without one, else the reserve's. When none of the dealt devices found a
 * change, the first dealt one that can bring a card in takes the place of the reserve entrance the deal's order put last
 * (the deal is the film's own: one of it always plays when it can). Never two devices of one family.
 */
export const planCreative = (order: readonly string[], shapes: readonly Shape[], changes: readonly Change[], dealt = 3): (string | null)[] => {
  const n = changes.length;
  const out: (string | null)[] = Array(n).fill(null);
  const E = changes.map((_, i) => entranceAt(shapes, i));
  const pics = order.filter((id) => CREATIVE_PLAYS[id]?.play === 'entrance' || CREATIVE_PLAYS[id]?.play === 'scene');
  const head = order.slice(0, dealt).filter((id) => pics.includes(id));
  const rest = pics.filter((id) => !head.includes(id));
  const fam = (id: string) => CREATIVE_PLAYS[id].family;
  const free = (id: string) => !out.includes(id) && !out.some((u) => u && fam(u) === fam(id));
  const fit = (id: string, i: number) => creativeFit(id, changes[i], E[i]);
  const place = (ids: readonly string[], want: number) => {
    for (const id of ids) {
      if (!free(id)) continue;
      const i = changes.findIndex((_, k) => !out[k] && fit(id, k) >= want);
      if (i >= 0) out[i] = id;
    }
  };
  place(head, 3);
  for (let i = 0; i < n; i++) if (!out[i]) out[i] = rest.find((id) => free(id) && fit(id, i) >= 3) ?? null;
  place(head, 1);
  place(rest, 1);
  if (!out.some((id) => id && head.includes(id))) {
    const id = head.find((d) => CREATIVE_PLAYS[d].play === 'entrance');
    const slots = out.map((u, i) => (u && CREATIVE_PLAYS[u].play === 'entrance' && id && fit(id, i) >= 1 ? i : -1)).filter((i) => i >= 0);
    if (id && slots.length) out[slots.reduce((a, b) => (order.indexOf(out[b]!) > order.indexOf(out[a]!) ? b : a))] = id;
  }
  return out;
};
/** How many changes a creative device can show in an order (a card that comes in on its own, or a tap). */
const coverage = (order: readonly Shape[]) => UPDATE.changes.filter((c, i) => entranceAt(order, i) || c.show.kind === 'tap').length;

/**
 * The orders this film can play: a change whose line carries another product's mark ("[]") is never split round the card
 * (its gap holds the mark); the film never opens on a split whose card would sit empty in the gap (a fill before it has
 * filled); and at least two changes can take a creative device.
 */
const ORDERS = ordersFor(UPDATE.changes.length)
  .filter((o) => o.every((shape, i) => shape !== 'split' || (!UPDATE.changes[i].words.includes('[]') && (i > 0 || UPDATE.changes[0].show.kind !== 'fill'))))
  .filter((o) => coverage(o) >= Math.min(2, UPDATE.changes.length))
  .map((o) => o.join('-'));
if (!ORDERS.length) throw new Error('deal.ts: no order of shapes fits these changes (write a change whose card can come in on its own, or a tap)');

/** The eleven ground families (fx/Grounds GROUND_FAMILIES), written out so this file stays standalone. */
export const GROUNDS = ['nearWhite', 'lightStudio', 'softSky', 'gradientField', 'whiteBand', 'blackField', 'studio', 'deepPool', 'duskMesh', 'floorGlow', 'lightDark'] as const;

export const DEVICES = {
  ground: [...GROUNDS],
  hook: ['roll', 'rise', 'badge'],
  arrive: ['rise', 'open'],
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
  arrive: { rise: 'the card rising into place', open: 'a hairline opening into the card' },
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
  const used = ((RECENT as Partial<Record<string, readonly string[]>>)[s] ?? []).filter((c) => typeof c === 'string' && all.includes(c));
  const left = all.filter((c) => !used.includes(c));
  return left.length ? left : [used[used.length - 1]];
};

const isPlaceholder = (name: string) => /^\[.*\]$/.test(name.trim());
const UNNAMED = SEED === null && isPlaceholder(IDENTITY.name);

/** The deck's ground family (src/dealt.ts deal.ground), when deck.py dealt a direction: the film stands on it. */
const DECK_GROUND: string | undefined = (() => {
  const g = DEALT?.deal?.ground;
  if (!g) return undefined;
  if (!(GROUNDS as readonly string[]).includes(g)) throw new Error(`deal: src/dealt.ts deals the ground "${g}"; the update template stands on ${GROUNDS.join(', ')} (re-deal with scripts/deck.py)`);
  return g;
})();

/**
 * The deal for a seed: one choice per slot, re-drawn (deterministically) until at least half the dealt slots differ from
 * the floor, and half of those that compose the frame (COMPOSITION).
 */
export const dealApart = (seed: number, pin: Partial<Deal> = { ...(DECK_GROUND ? { ground: DECK_GROUND } : {}), ...PIN }): Deal => {
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
export const DEAL: Deal = UNNAMED ? { ...FLOOR, ...PIN } : dealApart(DEAL_SEED);
/** The dark ground families (fx/Grounds GROUND_FAMILIES tone 'dark'): only on these are the cards dealt light or dark. */
export const DARK_GROUNDS: readonly string[] = ['blackField', 'studio', 'deepPool', 'duskMesh', 'floorGlow'];
export const CARD_TONES = ['light', 'dark'] as const;
/** The cards' tone (kit/card): light on a light family (and on lightDark, which turns); on a dark one dealt from the seed. */
export const CARD_TONE: (typeof CARD_TONES)[number] = DARK_GROUNDS.includes(DEAL.ground) && !UNNAMED ? CARD_TONES[Math.floor(rng((DEAL_SEED ^ 0x27d4eb2f) >>> 0)() * 2)] : 'light';
/** The shape of each change, in film order. */
export const SHAPES_OF = (d: Deal): Shape[] => d.order.split('-') as Shape[];
export const SHAPES: Shape[] = SHAPES_OF(DEAL);

// ---- The creative devices (fx/creative): the deck's (src/dealt.ts creative, then its reserve) or a seeded,
// recency-weighted shuffle of the whole library from the name (a device the last films played comes late: x0.12, 0.3,
// 0.55, 0.8 for each of the last four films that played it), so every film plays its own.
const RECENT_WEIGHT = [0.12, 0.3, 0.55, 0.8];
const recentSets: readonly (readonly string[])[] = (((RECENT as { creative?: unknown }).creative ?? []) as unknown[]).filter((x): x is string[] => Array.isArray(x));
/** The library in a film's own order: a weighted shuffle (each device's key u^(1/w), largest first) seeded by the name. */
export const creativeOrder = (name: string, recent: readonly (readonly string[])[] = []): string[] => {
  const r = rng(hashSeed(`${name.trim().toLowerCase()}#creative`));
  const w = (id: string) => recent.slice(0, RECENT_WEIGHT.length).reduce((a, s, k) => (s.includes(id) ? a * RECENT_WEIGHT[k] : a), 1);
  return CREATIVE_IDS.map((id) => ({ id, k: r() ** (1 / w(id)) })).sort((a, b) => b.k - a.k).map((x) => x.id);
};
/** What the unnamed scaffold plays (a named film never replays it whole). */
export const FLOOR_CREATIVE: string[] = ['cursor-follow', 'pixel-assemble', 'letter-swing', 'shape-morph'];
const DECK_CREATIVE: string[] | null = (() => {
  const c = DEALT?.creative;
  if (!c?.length) return null;
  const all = [...c, ...(DEALT?.reserve ?? [])];
  const bad = all.filter((x) => !CREATIVE_PLAYS[x]);
  if (bad.length) throw new Error(`deal: src/dealt.ts names ${bad.join(', ')}, not a creative element of fx/creative/meta.ts (re-deal with scripts/deck.py)`);
  return [...all, ...CREATIVE_IDS.filter((x) => !all.includes(x))];
})();
/** The film's creative order (dealt first, then the reserve), where it came from, and how many of it were dealt. */
export const CREATIVE = (() => {
  const order = DECK_CREATIVE ?? (UNNAMED ? [...FLOOR_CREATIVE, ...CREATIVE_IDS.filter((x) => !FLOOR_CREATIVE.includes(x))] : creativeOrder(IDENTITY.name, recentSets));
  const dealt = DECK_CREATIVE ? DEALT?.creative?.length ?? 3 : 3;
  return { order, dealt, deal: order.slice(0, dealt), source: DECK_CREATIVE ? 'deck.py' : UNNAMED ? 'the floor (unnamed scaffold)' : `the name "${IDENTITY.name}"` };
})();
/** Each change's picture device (null: none fits it there), in film order. */
export const PICTURE: (string | null)[] = planCreative(CREATIVE.order, SHAPES, UPDATE.changes, CREATIVE.dealt);

/** The line devices this template plays, and each change line's: the field line the scale-contrast (its key word huge;
 * a line carrying a mark keeps the voice), the first of letter-swing / word-swap in the deal's order on the first other
 * line it fits (word-swap needs the change's `swap`; neither takes a line with a mark). */
export type LineDevice = 'scale-contrast' | 'letter-swing' | 'word-swap';
export const LINE_DEVICE: (LineDevice | null)[] = (() => {
  const out: (LineDevice | null)[] = UPDATE.changes.map((c, i) => (SHAPES[i] === 'after' && !c.words.includes('[]') ? 'scale-contrast' : null));
  const lineIds = CREATIVE.order.filter((id) => id === 'letter-swing' || id === 'word-swap');
  for (const id of lineIds) {
    const i = UPDATE.changes.findIndex((c, k) => !out[k] && SHAPES[k] !== 'split' && !c.words.includes('[]') && (id !== 'word-swap' || (c.swap?.length ?? 0) >= 2));
    if (i >= 0) {
      out[i] = id as LineDevice;
      break;
    }
  }
  return out;
})();
/** Where the deal came from, for the print. */
export const DEAL_SOURCE = `${SEED !== null ? `SEED ${SEED}` : UNNAMED ? 'the floor (the name slot is still [Product])' : `the name "${IDENTITY.name}"`}${DECK_GROUND ? ', ground from deck.py' : ''}${Object.keys(PIN).length ? `, pinned: ${Object.keys(PIN).join(', ')}` : ''}; creative from ${CREATIVE.source}`;
/** The creative devices that play, in film order (pictures and lines), for the print and the history. */
export const PLAYED: string[] = [...new Set([...PICTURE.flatMap((p, i) => [p, LINE_DEVICE[i]]).filter((x): x is string => !!x)])];

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
  const voice: Move = UNNAMED ? 'mask' : moves[Math.floor(r() * moves.length)];
  const exitVoice: Exit = UNNAMED ? 'lift' : EXITS[Math.floor(r() * EXITS.length)];
  return { voice, exitVoice, move: Object.fromEntries(LINE_IDS.map((id) => [id, voice])) as Record<string, Move>, exit: Object.fromEntries(LINE_IDS.map((id) => [id, exitVoice])) as Record<string, Exit> };
})();
