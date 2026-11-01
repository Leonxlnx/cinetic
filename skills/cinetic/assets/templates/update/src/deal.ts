// The update film's choices, dealt per film. The structure never changes (the name and the version centred, each change
// filmed by a hero shot and said in one line, the 3D mark pulling back into the lockup with the version); how each part
// looks does. The seed is the product's name (src/brand/identity.ts: the same name, the same deal, on any machine); SEED
// re-deals without renaming, PIN fixes a slot by hand. The unnamed scaffold ('[Product]') plays the floor; a named film
// never replays it. When scripts/deck.py dealt a direction in this project (src/dealt.ts) the film stands in its world and
// takes its hero shots first. Print what this film plays: the command in template.json deal.print.
// Node-safe (no React, no CSS, nothing from the starter): the timeline, the sound and the tests read it.
//
// The camera never floats: it moves only inside a hero shot, one move that starts, travels with its subject and lands;
// a hold is still. Nothing bobs or sways, and no card rests tilted: the perspective comes from where the camera stands.
//
//   slot     choices          what each does
//   ground   the world        the place the film stands in (fx/world): one for the whole film, never cut, with its key
//            (twelve)         light that the glass, the rims, the type and the product pick up. Built (no picture):
//                             nearWhite, paleSky, blackField, deepField, electric. Plates (a real photograph, `node
//                             scripts/assets.mjs plate <kind>`): clouds, sky, aerial, sea, nightCity, studio, macro;
//                             until the plate is in public/plates a built world of the same tone stands in
//   hook     roll             "[Name] [old version]" centred; the changed numerals roll on a drum to the new version
//            rise             the name, then the version rising out of a mask beside it (the pair centred from frame 0)
//            badge            the name alone, centred; a dot lands after it and grows into the pill carrying the version
//   arrive   rack             each hero shot opens out of focus and racks sharp (7.5 -> 1.4 px in 9 frames at 30 fps)
//            whip             each hero shot arrives on a fast move that brakes into its framing, smeared on the fast frames
//            bloom            each hero shot opens out of a soft bloom of the world's light that settles
//   order    (the shapes)     each change is a hero shot and a line, in its own shape:
//            show             the hero shot first; then the shot goes soft and dims (a focus isolate) and the line lands
//                             centred in front of it
//            lead             the line first, alone in the world; it leaves and the hero shot arrives
//            split            the line first, parted round a porthole that opens in its gap with the hero shot inside;
//                             the words leave and the porthole opens into the frame as the shot plays
//                             A line never follows a line: once a change opens on its picture, the later ones do too
//   end      beside           the mark's solid pulls back into the flat mark; the name slides out beside it, the pair
//                             re-centred, and the version lands after the name on the last bar line
//            stack            the same pull-back; the name rises under the mark and the version lands beside the name
//   (heroes)                  each change's hero shot (HERO_META below): the deck's (src/dealt.ts hero) or dealt from the
//                             name, each on the change it can film (heroFit), at least two different shots a film
//   (lines)  voice            every line on one move (mask, fall or crisp) and one whole-line exit (lift or recede)
import { IDENTITY } from './brand/identity';
import { DEALT } from './dealt';
import { RECENT } from './recent';
import { type Change, photosOf, UPDATE } from './update';

export type Shape = 'show' | 'lead' | 'split';
/** A shape that opens on its picture (the line comes after it). */
export const pictureFirst = (s: Shape) => s === 'show';

/**
 * Every order of shapes for n changes: a line never follows a line, so the shapes that open on their line (lead, split)
 * come only before every 'show'; 'lead' never opens the film (the name and the version are its first words), no
 * line-first shape comes twice in a row, and the porthole (split) plays once a film at most.
 */
export const ordersFor = (n: number): Shape[][] => {
  const out: Shape[][] = [];
  const all: Shape[] = ['show', 'lead', 'split'];
  const walk = (seq: Shape[]) => {
    if (seq.length === n) {
      if (seq.filter((s) => s === 'split').length <= 1) out.push(seq); // the porthole once a film at most
      return;
    }
    for (const s of all) {
      const last = seq[seq.length - 1];
      if (!seq.length && s === 'lead') continue;
      if (last && pictureFirst(last) && !pictureFirst(s)) continue;
      if (last === s && !pictureFirst(s)) continue;
      walk([...seq, s]);
    }
  };
  walk([]);
  return out;
};

/**
 * A change whose line carries another product's mark ("[]") is never split round the porthole (its gap holds the mark).
 * Every film plays the porthole once where a change can take it: one line meets its picture (the line parted round the
 * shot), never only a line alone, then its picture, change after change (grid-check `beats`: the text-then-cards loop).
 */
const FITTING = ordersFor(UPDATE.changes.length)
  .filter((o) => o.every((shape, i) => shape !== 'split' || !UPDATE.changes[i].words.includes('[]')))
  .map((o) => o.join('-'));
const SPLIT_ORDERS = FITTING.filter((o) => o.split('-').includes('split'));
const ORDERS = SPLIT_ORDERS.length ? SPLIT_ORDERS : FITTING;
if (!ORDERS.length) throw new Error('deal.ts: no order of shapes fits these changes');

/** The worlds (fx/world WORLD_DEAL), written out so this file stays standalone (and scripts/deck.py reads them). */
export const WORLDS = ['nearWhite', 'paleSky', 'blackField', 'deepField', 'electric', 'clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro'] as const;
/** The worlds that need no picture. */
export const BUILT_WORLDS: readonly string[] = ['nearWhite', 'paleSky', 'blackField', 'deepField', 'electric'];

export const DEVICES = {
  ground: ['nearWhite', 'paleSky', 'blackField', 'deepField', 'electric', 'clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro'],
  hook: ['roll', 'rise', 'badge'],
  arrive: ['rack', 'whip', 'bloom'],
  order: ORDERS,
  end: ['beside', 'stack'],
} as const;

export type Slot = keyof typeof DEVICES;
export type Deal = { ground: string; hook: string; arrive: string; order: string; end: string };

/**
 * What each composing slot does to the frame, in words (fx/TypeSystem compositionApart): two devices with the same words
 * are one composition. The world is the place and its palette, not a composition, and is left out.
 */
export const COMPOSITION: { [S in Slot]?: Record<string, string> } = {
  hook: { roll: 'the name and the version together from the first frame, the numerals rolling', rise: 'the name, then the version rising beside it', badge: 'the name, then the version in a pill beside it' },
  arrive: { rack: 'each shot racking sharp out of focus', whip: 'each shot arriving on a fast move', bloom: 'each shot opening out of a bloom of light' },
  order: Object.fromEntries(ORDERS.map((o) => [o, o])),
  end: { beside: 'the name sliding out beside the mark', stack: 'the name rising under the mark' },
};

/** What the template plays before the product's name is in (its name slot, '[Product]'): a product's deal never replays it. */
export const FLOOR: Deal = { ground: 'blackField', hook: 'rise', arrive: 'rack', order: ORDERS[0], end: 'beside' };

/** Choose a slot by hand ({ ground: 'clouds' }); a pinned slot is not dealt. */
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

/** The deck's world (src/dealt.ts deal.ground), when deck.py dealt a direction: the film stands in it. */
const DECK_GROUND: string | undefined = (() => {
  const g = DEALT?.deal?.ground;
  if (!g) return undefined;
  if (!(WORLDS as readonly string[]).includes(g)) throw new Error(`deal: src/dealt.ts deals the ground "${g}"; the update template stands in a world: ${WORLDS.join(', ')} (re-deal with scripts/deck.py)`);
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
/** The shape of each change, in film order. */
export const SHAPES_OF = (d: Deal): Shape[] => d.order.split('-') as Shape[];
export const SHAPES: Shape[] = SHAPES_OF(DEAL);

// ---- The hero shots. The shots that carry the film's production value: each a designed 3D or light shot of the
// product's own screen (its content from src/update.ts and src/content.ts) standing in the film's world, with one sharp
// plane and a graded blur ladder, one camera move that has a job and lands, glass as a lens on the world, light sized
// to its source and timed, real content at density and a jump in scale. Keep each entry on one line: scripts/deck.py
// reads them (it deals the film's set at random with fit into src/dealt.ts `hero`). `role`: picture (a change's shot)
// or end (the end card's); `needs`: what the film must have for the deck to deal it; `min`: the seconds its beat needs.
export type HeroRole = 'picture' | 'over' | 'line' | 'end';
export type HeroMeta = { id: string; role: HeroRole; family: string; needs: readonly string[]; prefer: 'first' | 'middle' | 'proof'; min: number; dark?: boolean; fits: readonly string[]; about: string };
export const HERO_META = [
  { id: 'push-press', role: 'picture', family: 'press', needs: ['button'], prefer: 'proof', min: 2.4, fits: ['book', 'pay', 'send', 'join', 'merge', 'publish', 'approve', 'buy', 'order', 'confirm', 'sign', 'submit', 'share', 'invite', 'reserve', 'tap', 'one'], about: 'the change\'s screen; a pointer travels to its button with the camera following it in, landing at macro scale as it presses: a glow the size of the button blooms, the label turns and the camera rises to what the screen answers' },
  { id: 'macro-type', role: 'picture', family: 'input', needs: [], prefer: 'first', min: 3.0, fits: ['ask', 'type', 'prompt', 'message', 'write', 'compose', 'command', 'search', 'chat', 'reply', 'draft', 'find'], about: 'the product\'s input at macro scale: the camera pushes onto the first characters and rides the caret as the request types, the world soft behind; it travels on to the send button and lands as it is pressed, a glow the size of the button blooming' },
  { id: 'toast-stack', role: 'picture', family: 'stack', needs: [], prefer: 'proof', min: 2.4, fits: ['notif', 'alert', 'payment', 'paid', 'order', 'sale', 'booking', 'reminder', 'message', 'event', 'invoice', 'inbox', 'join', 'update', 'list'], about: 'the change\'s rows arrive as cards dropping into the front slot and pushing the stack back into depth: the front one sharp, each one further back softer (a graded blur ladder), real names, faces and times; the camera closes in once and lands as the last one drops' },
  { id: 'fan-focus', role: 'picture', family: 'fan', needs: [], prefer: 'middle', min: 2.6, fits: ['results', 'sources', 'options', 'matches', 'listings', 'comments', 'reviews', 'picks', 'choose', 'compare', 'feedback', 'every', 'all'], about: 'the change\'s rows as cards fanned back in depth, the camera to one side closing on the one that matters while the focus racks to it' },
  { id: 'carousel', role: 'picture', family: 'media', needs: ['pictures'], prefer: 'middle', min: 2.8, fits: ['photo', 'video', 'image', 'picture', 'gallery', 'listing', 'clip', 'album', 'room', 'place', 'portfolio', 'catalog', 'see'], about: 'a ring of the change\'s real pictures turning in depth; the camera cranes down from above to eye level as the ring slows and lands the chosen one facing the camera, which opens toward the lens; a smear only while it turns fast' },
  { id: 'photo-develop', role: 'picture', family: 'photo', needs: [], prefer: 'middle', min: 2.6, fits: ['photo', 'picture', 'image', 'scan', 'see', 'look', 'room', 'place', 'preview', 'face', 'camera'], about: 'the change\'s picture develops from a duotone in the world\'s light to full colour while a glass card with what it says rises in front of it and the focus racks to the card; one slow push that hands over to the line' },
  { id: 'glass-counter', role: 'picture', family: 'figure', needs: [], prefer: 'proof', min: 2.6, fits: ['fast', 'faster', 'speed', 'time', 'hours', 'minutes', 'seconds', 'save', 'saved', 'count', 'more', 'less', 'percent', 'twice'], about: 'the change\'s figure in a slab of glass catching the world\'s key: the camera pushes onto it while it counts, the bars beside it rising, and lands as the figure does; a band of light crosses the glass on the landing' },
  { id: 'page-fly', role: 'picture', family: 'page', needs: [], prefer: 'middle', min: 2.8, fits: ['page', 'doc', 'document', 'report', 'site', 'website', 'article', 'note', 'notes', 'brief', 'plan', 'summary', 'post', 'week', 'calendar', 'schedule', 'board'], about: 'the change\'s page (a document, its site, a week) flies in lying back in perspective and the camera travels it from the headline to what changed, the far edge soft, a thin light along its near edge' },
  { id: 'focus-swap', role: 'picture', family: 'swap', needs: [], prefer: 'proof', min: 2.4, fits: ['tidy', 'clean', 'sort', 'fix', 'before', 'after', 'final', 'clear', 'organize', 'merge', 'turn', 'change'], about: 'the screen as it was, sharp; on the change it goes soft and dims as the screen as it is now rises in front of it, the focus racking forward onto it and a light running its edge as it lands' },
  { id: 'glass-tiles', role: 'picture', family: 'logos', needs: [], prefer: 'middle', min: 2.6, fits: ['works', 'with', 'connect', 'sync', 'import', 'integrat', 'apps', 'tools', 'slack', 'drive'], about: 'the products it works with as official marks in milky glass tiles on an arc in depth: they rise turning to face the camera while it pushes in once and lands after them' },
  { id: 'logo-3d', role: 'end', family: 'mark', needs: [], prefer: 'proof', min: 1.6, fits: [], about: 'the end card arrives through the brand\'s mark as a solid: an extreme close-up of its bevelled edge already turning, one pull-back that turns it to face the camera and lands it exactly on the flat mark, the name and the version building beside it' },
] as const satisfies readonly HeroMeta[];
export type HeroId = (typeof HERO_META)[number]['id'];
const HMETA = HERO_META as readonly HeroMeta[];
/** A hero shot's entry. */
export const heroMeta = (id: string): HeroMeta | undefined => HMETA.find((m) => m.id === id);
/** The change shots (every hero shot but the end card's). */
export const PICTURE_HEROES: string[] = HMETA.filter((m) => m.role === 'picture').map((m) => m.id);

/**
 * How well hero shot `id` films change c: 0 it cannot, 1 it can carry it (used when the film needs a second kind of
 * shot), 2 it shows this change. Each shot films one kind of moment: a tap's button, a typed request, a list's rows, the
 * pictures, a figure, a page or a week, a before and an after, the products it works with.
 */
export const heroFit = (id: string, c: Change): number => {
  const s = c.show;
  const photos = photosOf(c).length;
  switch (id) {
    case 'push-press':
      return s.kind === 'tap' ? 2 : s.kind === 'type' ? 1 : 0;
    case 'macro-type':
      return s.kind === 'type' ? 2 : 0;
    case 'toast-stack':
      return s.kind === 'fill' && s.layout === 'list' ? 2 : s.kind === 'tap' && (s.result ?? []).length + (s.you ? 1 : 0) >= 3 ? 1 : 0;
    case 'fan-focus':
      return s.kind === 'fill' && s.layout === 'list' && s.items.length >= 3 ? 2 : s.kind === 'swap' ? 1 : 0;
    case 'carousel':
      return photos >= 5 ? 2 : 0;
    case 'photo-develop':
      return photos >= 1 ? 2 : 0;
    case 'glass-counter':
      return s.kind === 'count' ? 2 : 0;
    case 'page-fly':
      return s.kind === 'page' || (s.kind === 'fill' && s.layout === 'week') ? 2 : 0;
    case 'focus-swap':
      return s.kind === 'swap' ? 2 : s.kind === 'tap' ? 1 : 0;
    case 'glass-tiles':
      return (c.logos?.length ?? 0) >= 3 ? 2 : 0;
    default:
      return 0;
  }
};

/** What the unnamed scaffold plays first (its changes: a tap, a list, a count). */
export const FLOOR_HERO: string[] = ['push-press', 'toast-stack', 'glass-counter', 'fan-focus', 'focus-swap', 'macro-type', 'page-fly', 'photo-develop', 'carousel', 'glass-tiles'];
const RECENT_WEIGHT = [0.12, 0.3, 0.55, 0.8];
const recentHero: readonly (readonly string[])[] = (((RECENT as { hero?: unknown }).hero ?? []) as unknown[]).filter((x): x is string[] => Array.isArray(x));
/** The change shots in a film's own order: a weighted shuffle (each shot's key u^(1/w), largest first) seeded by the name, the last films' shots late. */
export const heroOrder = (name: string, recent: readonly (readonly string[])[] = []): string[] => {
  const r = rng(hashSeed(`${name.trim().toLowerCase()}#hero`));
  const w = (id: string) => recent.slice(0, RECENT_WEIGHT.length).reduce((a, s, k) => (s.includes(id) ? a * RECENT_WEIGHT[k] : a), 1);
  return PICTURE_HEROES.map((id) => ({ id, k: r() ** (1 / w(id)) })).sort((a, b) => b.k - a.k).map((x) => x.id);
};
/** The deck's hero shots (src/dealt.ts hero, then heroReserve), checked against HERO_META. */
const DECK_HERO: string[] | null = (() => {
  const d = DEALT as { hero?: string[]; heroReserve?: string[] } | null;
  if (!d?.hero?.length) return null;
  const all = [...d.hero, ...(d.heroReserve ?? [])];
  const bad = all.filter((x) => !heroMeta(x));
  if (bad.length) throw new Error(`deal: src/dealt.ts names ${bad.join(', ')}, not a hero shot of the update template (deal.ts HERO_META; re-deal with scripts/deck.py)`);
  return [...all.filter((x) => PICTURE_HEROES.includes(x)), ...PICTURE_HEROES.filter((x) => !all.includes(x))];
})();
/** The film's hero order (the deck's, else the name's, else the floor's) and where it came from. */
export const HERO_ORDER: { order: string[]; source: string } = DECK_HERO
  ? { order: DECK_HERO, source: 'deck.py' }
  : UNNAMED
    ? { order: [...FLOOR_HERO], source: 'the floor (unnamed scaffold)' }
    : { order: heroOrder(IDENTITY.name, recentHero), source: `the name "${IDENTITY.name}"` };

/**
 * Each change's hero shot, in film order: a change that names one by hand keeps it; every other change takes the first
 * shot in the film's order that shows it (fit 2) and no other change has taken; then, when every change got the same
 * kind of shot, the change with a second shot that can carry it (fit 1, else another that shows it) takes that one, so
 * a film plays at least two different hero shots whenever its changes allow it.
 */
export const planHeroes = (order: readonly string[], changes: readonly Change[]): string[] => {
  const out: (string | null)[] = changes.map((c) => {
    if (!c.hero) return null;
    if (!heroMeta(c.hero) || heroMeta(c.hero)!.role !== 'picture') throw new Error(`update.ts: ${c.id} names the hero shot "${c.hero}"; the change shots are ${PICTURE_HEROES.join(', ')}`);
    if (heroFit(c.hero, c) < 1) throw new Error(`update.ts: ${c.id}'s hero shot "${c.hero}" cannot film a ${c.show.kind} (src/deal.ts heroFit)`);
    return c.hero;
  });
  // the changes with the fewest shots that show them choose first, so a change with one choice is never left without it
  const opts = changes.map((c) => order.filter((id) => heroFit(id, c) >= 2));
  const turn = changes.map((_, i) => i).filter((i) => !out[i]).sort((a, b) => opts[a].length - opts[b].length || a - b);
  for (const i of turn) out[i] = opts[i].find((id) => !out.includes(id)) ?? opts[i][0] ?? order.find((id) => heroFit(id, changes[i]) >= 1) ?? null;
  for (let i = 0; i < out.length; i++) if (!out[i]) throw new Error(`update.ts: no hero shot can film ${changes[i].id} (a ${changes[i].show.kind}); src/deal.ts heroFit says what each one films`);
  if (new Set(out).size === 1 && changes.length > 1) {
    for (let i = changes.length - 1; i >= 0; i--) {
      if (changes[i].hero) continue;
      const alt = order.find((id) => id !== out[i] && heroFit(id, changes[i]) >= 1);
      if (alt) {
        out[i] = alt;
        break;
      }
    }
  }
  return out as string[];
};
/** Each change's hero shot, in film order. */
export const HEROES: string[] = planHeroes(HERO_ORDER.order, UPDATE.changes);
/** The end card's shot: the brand's mark as a solid pulling back into the lockup. */
export const HERO_END = 'logo-3d';

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
  // headline systems rotate: the dealt move is the first change line's and each line after takes the next move in turn,
  // so no two lines in a row arrive the same way (every line on one move, one size and one accent word is the template
  // look); the face stays the film's one pairing
  const v0 = MOVES.indexOf(voice);
  return { voice, exitVoice, move: Object.fromEntries(LINE_IDS.map((id, i) => [id, MOVES[(v0 + i) % MOVES.length]])) as Record<string, Move>, exit: Object.fromEntries(LINE_IDS.map((id) => [id, exitVoice])) as Record<string, Exit> };
})();

/** Where the deal came from, for the print. */
export const DEAL_SOURCE = `${SEED !== null ? `SEED ${SEED}` : UNNAMED ? 'the floor (the name slot is still [Product])' : `the name "${IDENTITY.name}"`}${DECK_GROUND ? ', world from deck.py' : ''}${Object.keys(PIN).length ? `, pinned: ${Object.keys(PIN).join(', ')}` : ''}; hero shots from ${HERO_ORDER.source}`;
/** The hero shots that play, in film order (the change shots and the end card's), for the print and the film history. */
export const PLAYED: string[] = [...new Set([...HEROES, HERO_END])];
