// The choices this film is dealt. The structure never changes (lines that meet their pictures alone, with or over them,
// every change of picture carried, the lockup built from the last picture); how each part looks does: the text voice,
// the ground family, the seams, the end card and the camera on the picture beats. ONE source: when scripts/deck.py has dealt a direction in this project it writes
// src/dealt.ts, and the film plays that deal (out/DIRECTION.md section 0 says why each); with none dealt, the seed is
// the product's name (the same name, the same deal, on any machine) and launch.ts `seed` re-deals. launch.ts `pin`
// fixes a slot by hand over either. Keep this file free of React and CSS imports: the timeline and the sound import it.
//
//   slot     choices        what each does
//   voice    build          every line built word by word (20 f fades, 6 f apart), re-centring as it grows (15 f expo)
//            blur           every line arrives whole out of a 12 px blur, settling from 104 % on a glide (34 f)
//            ink            every word arrives pale a touch below its place, rises into it and inks to its colour in
//                           10 f, 6 f apart
//   ground   (fx/Grounds GROUND_FAMILIES) nearWhite, blackField, whiteBand, deepPool, softSky, lightDark, gradientField:
//            one family for the whole film, never cut; its one colour event (a band flood, the turn to dark) is declared
//   seamTA   matchCut       line -> picture: played as blurThrough (a line and a picture share no shape to hold across a
//                           one-frame cut: a match cut there is a hard cut from type to a picture)
//            velocityCut    the line leaves at speed, the picture arrives on the same speed and settles
//            blurThrough    the line blurs away to 32 px, the picture resolves out of the same blur
//   seamAT   recede         picture -> line: the picture falls back (shrinking, softening, fading) while the line
//                           builds over it on the kept ground: never an empty frame
//            zoomThrough    the camera pushes through the picture's focus (x1.07 a frame) and the line builds over the
//                           push, settling as the picture is gone
//   seamAA   velocityCut    picture -> picture (into a line that arrives with its picture): one camera move carried
//                           across the cut, the next picture arriving on the same speed
//            matchCut       the focus point holds its place across the cut on the kept ground, the next picture
//                           growing on from it: only under the carried element (precheck reports a match cut with
//                           nothing carried over it); never another kind's turn
//            blurThrough    the cut inside a blur, the next picture resolving out of it
//                           (over any of them, the film's carried element, product.tsx IDEA, flies from its place in one
//                           picture to its place in the next: the object that becomes the next scene)
//   end      element        the last picture's hero element becomes the mark; the name slides out beside it, centred
//            badge          the last picture's hero element turns a little over a full turn as it shrinks into the mark
//                           (a spin blur on the fast frames); the name slides out from behind it, centred
//   camera   still          the picture beats hold still: the camera moves only with a purpose (a long picture's one
//                           eased push closer, timeline.ts PUSH; a creative element's own move), never a float or a
//                           drift that wanders off and back
//            land           every product picture takes one slow push that starts, travels and lands (x1.035 over the
//                           first 60 % of the beat, strongInOut), then holds still
//   creative (two or three, CREATIVE below) the film's creative elements, dealt at random from fx/creative: each takes a
//            whole beat (a line or a picture) with the product inside it; never the set of the last films
// The seams alternate between the dealt kind and its next choice at each kind of change, so no kind passes 45 % of the
// scene changes.
import { DEALT } from './dealt';
import { CREATIVE_META, type CreativeId, type CreativeMeta, metaOf } from './fx/creative/meta';
import { LAUNCH } from './launch';
import { RECENT } from './recent';

export const DEVICES = {
  voice: ['build', 'blur', 'ink'],
  ground: ['nearWhite', 'blackField', 'whiteBand', 'deepPool', 'softSky', 'lightDark', 'gradientField'],
  seamTA: ['matchCut', 'velocityCut', 'blurThrough'],
  seamAT: ['recede', 'zoomThrough'],
  seamAA: ['velocityCut', 'matchCut', 'blurThrough'],
  end: ['element', 'badge'],
  camera: ['still', 'land'],
} as const;

export type Slot = keyof typeof DEVICES;
export type Deal = { [S in Slot]: (typeof DEVICES)[S][number] };

/** What the template plays when nothing is dealt (the unnamed scaffold): a product's deal never replays it. */
export const FLOOR: Deal = { voice: 'build', ground: 'nearWhite', seamTA: 'matchCut', seamAT: 'recede', seamAA: 'velocityCut', end: 'element', camera: 'still' };

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed: number) => {
  let a = seed || 1;
  return () => {
    a = (Math.imul(a ^ (a >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
    a ^= a + Math.imul(a ^ (a >>> 7), 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A slot's choices without the last three films' (src/recent.ts, written by new-film.sh from the film history): never
 * a repeat while another choice is free; when the last films used every choice, the least recent one.
 */
const fresh = (s: Slot): readonly string[] => {
  const all = DEVICES[s] as readonly string[];
  const used = ((RECENT as Partial<Record<string, readonly string[]>>)[s] ?? []).filter((c) => all.includes(c)); // newest first
  const left = all.filter((c) => !used.includes(c));
  return left.length ? left : [used[used.length - 1]];
};

/** The deal for a name: one choice per slot from the seed, re-drawn (deterministically) until at least half the slots differ from the floor. */
export const dealOf = (name: string): Deal => {
  const slots = Object.keys(DEVICES) as Slot[];
  for (let salt = 0; salt < 64; salt++) {
    const r = rng(hash(`${name.trim().toLowerCase()}#${salt}`));
    const d = Object.fromEntries(slots.map((s) => {
      const opts = fresh(s);
      return [s, opts[Math.floor(r() * opts.length)]];
    })) as Deal;
    if (2 * slots.filter((s) => d[s] !== FLOOR[s]).length >= slots.length) return d;
  }
  return { ...FLOOR, voice: 'blur', ground: 'deepPool', seamTA: 'velocityCut', seamAA: 'matchCut' };
};

const NAME = LAUNCH.seed ?? LAUNCH.name;
/** The deck's deal (src/dealt.ts) when deck.py dealt one, its slots checked against DEVICES; else null. */
const deckDeal = (): Deal | null => {
  // a deal the deck left empty (deck.py --creative dealt only the creative elements) is no deal: the name deals the slots
  if (!DEALT?.deal || !Object.keys(DEALT.deal).length) return null;
  const d = DEALT.deal;
  const slots = Object.keys(DEVICES) as Slot[];
  const bad = slots.filter((s) => !(DEVICES[s] as readonly string[]).includes(d[s]));
  if (bad.length) throw new Error(`deal: src/dealt.ts names ${bad.map((s) => `${s} "${d[s]}"`).join(', ')}, not a choice of this template (re-deal with scripts/deck.py)`);
  return Object.fromEntries(slots.map((s) => [s, d[s]])) as Deal;
};
const DECK = deckDeal();
/** The deck's deal when deck.py dealt one; else the unnamed scaffold keeps the floor and a named film is dealt from its
 * name; launch.ts `pin` fixes slots by hand over either. */
export const DEAL: Deal = { ...(DECK ?? (/^\[.*\]$/.test(NAME.trim()) ? FLOOR : dealOf(NAME))), ...(LAUNCH.pin ?? {}) } as Deal;
/** Where the deal came from, for the print: the deck's direction, the name, or the floor (and the slots pinned by hand). */
export const DEAL_SOURCE = `${DECK ? `deck.py (${DEALT?.direction})` : /^\[.*\]$/.test(NAME.trim()) ? 'the floor (unnamed scaffold)' : `the name "${NAME}"`}${LAUNCH.pin && Object.keys(LAUNCH.pin).length ? `, pinned: ${Object.keys(LAUNCH.pin).join(', ')}` : ''}`;
/** The film's seed as a number (floats, grounds and the small variations inside the acts). */
export const SEED = hash(NAME) % 100000;

// ---- The creative elements (fx/creative). A film plays two or three, dealt at random from the whole library, so no
// two films share their devices: at least one that draws a line and one that draws a picture, never two of one family,
// never the set of a recent film (src/recent.ts creative, newest first) and at most one device shared with the last.
// scripts/deck.py deals them with the direction (src/dealt.ts creative, from the film's name and the film history);
// else the name deals them here. The deal keeps a reserve in its order: the timeline draws from it only when a long
// film needs more creative beats (at least half the beats are creative scenes). launch.ts `creative.swap` trades one
// for another with a reason; a pair's `creative` pins a device to it.
/** How many creative elements a film is dealt. */
export const CREATIVE_N = 3;
export type CreativeDeal = { deal: CreativeId[]; reserve: CreativeId[] };
const META = CREATIVE_META as readonly CreativeMeta[];
const ALL = META.map((m) => m.id as CreativeId);
const isId = (x: string): x is CreativeId => META.some((m) => m.id === x);
/**
 * The creative elements for a name: a seeded shuffle of the library, its first line device, its first picture device,
 * then the next of another family; re-drawn (deterministically) until it repeats no recent set and shares at most one
 * device with the last film.
 */
export const creativeOf = (name: string, recent: readonly (readonly string[])[] = [], n = CREATIVE_N): CreativeDeal => {
  const last = recent[0] ?? [];
  for (let salt = 0; salt < 64; salt++) {
    const r = rng(hash(`${name.trim().toLowerCase()}#creative#${salt}`));
    const order = META.map((m) => ({ m, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.m);
    const pick: CreativeMeta[] = [];
    const take = (ok: (m: CreativeMeta) => boolean) => {
      const m = order.find((x) => !pick.includes(x) && !pick.some((p) => p.family === x.family) && ok(x));
      if (m) pick.push(m);
    };
    take((m) => m.role === 'line');
    take((m) => m.role === 'picture');
    while (pick.length < n) {
      const had = pick.length;
      take(() => true);
      if (pick.length === had) break;
    }
    const ids = pick.map((m) => m.id as CreativeId);
    const same = (s: readonly string[]) => s.length === ids.length && ids.every((x) => s.includes(x));
    // the first half of the draws shares nothing with the last film; then one device at most
    if (recent.some(same) || ids.filter((x) => last.includes(x)).length > (salt < 32 ? 0 : 1)) continue;
    return { deal: ids, reserve: order.map((m) => m.id as CreativeId).filter((x) => !ids.includes(x)) };
  }
  const fall: CreativeId[] = ['split-around', 'shape-morph', 'photo-arc'];
  return { deal: fall, reserve: ALL.filter((x) => !fall.includes(x)) };
};
/** What the unnamed scaffold plays (a named film never replays it whole). */
export const FLOOR_CREATIVE: CreativeId[] = ['type-object', 'pixel-assemble', 'zoom-wall'];
const recentSets = ((RECENT as { creative?: readonly (readonly string[])[] }).creative ?? []).filter((x) => Array.isArray(x));
const dealtCreative = (): CreativeDeal | null => {
  const d = DEALT as { creative?: string[]; reserve?: string[] } | null;
  if (!d?.creative?.length) return null;
  const bad = [...d.creative, ...(d.reserve ?? [])].filter((x) => !isId(x));
  if (bad.length) throw new Error(`deal: src/dealt.ts names ${bad.join(', ')}, not a creative element of fx/creative/meta.ts (re-deal with scripts/deck.py)`);
  const deal = d.creative as CreativeId[];
  return { deal, reserve: ((d.reserve as CreativeId[] | undefined) ?? ALL).filter((x) => !deal.includes(x)) };
};
const swapped = (c: CreativeDeal): CreativeDeal => {
  const sw = LAUNCH.creative?.swap ?? {};
  const keys = Object.keys(sw);
  if (!keys.length) return c;
  if (!(LAUNCH.creative?.reason ?? '').trim()) throw new Error('deal: launch.ts creative.swap needs a reason (what in the product or the script rules the dealt device out)');
  if (keys.length > 1) throw new Error(`deal: launch.ts swaps ${keys.length} creative elements; swap one at most (the deal is the film's own, not a menu)`);
  if (!keys.every((x) => (c.deal as string[]).includes(x))) throw new Error(`deal: launch.ts creative.swap trades ${keys.join(', ')}, which this film was not dealt (${c.deal.join(', ')})`);
  const deal = c.deal.map((x) => sw[x] ?? x);
  const bad = deal.filter((x) => !isId(x));
  if (bad.length) throw new Error(`deal: launch.ts creative.swap names ${bad.join(', ')}, not a creative element (fx/creative/meta.ts)`);
  return { deal: deal as CreativeId[], reserve: c.reserve.filter((x) => !deal.includes(x)) };
};
const DEALT_CREATIVE = dealtCreative();
const UNNAMED = /^\[.*\]$/.test(NAME.trim());
/** The film's creative elements in the deal's order, the reserve the timeline may draw from, and where they came from. */
export const CREATIVE: CreativeDeal & { source: string } = (() => {
  const base = DEALT_CREATIVE ?? (UNNAMED ? { deal: FLOOR_CREATIVE, reserve: ALL.filter((x) => !FLOOR_CREATIVE.includes(x)) } : creativeOf(NAME, recentSets));
  const src = DEALT_CREATIVE ? 'deck.py' : UNNAMED ? 'the floor (unnamed scaffold)' : `the name "${NAME}"`;
  return { ...swapped(base), source: `${src}${LAUNCH.creative?.swap ? `, swapped (${LAUNCH.creative.reason})` : ''}` };
})();
/** A creative element's entry (fx/creative/meta.ts). */
export const creativeMeta = (id: string) => metaOf(id);

