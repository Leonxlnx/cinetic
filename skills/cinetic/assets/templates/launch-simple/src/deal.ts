// The choices this film is dealt. The structure never changes (lines that meet their pictures alone, with or over them,
// every change of picture carried, the lockup built from the last picture); how each part looks does: the text voice,
// the world, the seams, the end card, the camera on the picture beats, the hero shots and the creative elements. ONE source: when scripts/deck.py has dealt a direction in this project it writes
// src/dealt.ts, and the film plays that deal (out/DIRECTION.md section 0 says why each); with none dealt, the seed is
// the product's name (the same name, the same deal, on any machine) and launch.ts `seed` re-deals. launch.ts `pin`
// fixes a slot by hand over either. Keep this file free of React and CSS imports: the timeline and the sound import it.
//
//   slot     choices        what each does
//   voice    build          every line built word by word (20 f fades, 6 f apart), re-centring as it grows (15 f expo)
//            blur           every line arrives whole out of a 12 px blur, settling from 104 % on a glide (34 f)
//            ink            every word arrives pale a touch below its place, rises into it and inks to its colour in
//                           10 f, 6 f apart
//   ground   the film's world (fx/world WORLD_DEAL, src/world.tsx draws it): the place the film stands in, with its key
//            light that glass, rims, type and the product pick up; one for the whole film, never cut, never a bare
//            gradient. Built worlds: nearWhite (paper lit from the top left, for real photos), paleSky (a pale sky built
//            in code), blackField (near-black on a woven surface under a soft key: glass lit by its rims), deepField (a
//            deep night with light rising from the floor), electric (a saturated stage in a blue). Plate worlds (a real
//            photograph: `node scripts/assets.mjs plate <kind>`, then `--pick <n> --to public/plates`): clouds,
//            sky, aerial, sea, nightCity, studio, macro; until the plate is in public/plates a built world of the
//            same tone stands in (src/world.tsx PLATE_FALLBACK)
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
  ground: ['nearWhite', 'paleSky', 'blackField', 'deepField', 'electric', 'clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro'],
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
  return { ...FLOOR, voice: 'blur', ground: 'deepField', seamTA: 'velocityCut', seamAA: 'matchCut' };
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
// scripts/deck.py deals them with the direction the agent picked (src/dealt.ts creative, from the film's name, the
// direction and the film history); else the name deals them here, the same way: a recency-weighted shuffle (a device a
// recent film played is drawn late, RECENT_WEIGHT), at least one device no recent film played, and only devices the
// script can feed (logos, a real figure, the old way's steps, alternatives for the key word, five photos or more).
// The deal keeps a reserve in its order: the timeline draws from it only when a long film needs more creative beats (at
// least half the beats are creative scenes). launch.ts `creative.swap` trades one for another with a reason; a pair's
// `creative` pins a device to it.
/** How many creative elements a film is dealt. */
export const CREATIVE_N = 3;
/** A device's weight in the shuffle for each recent film that played it, newest first (deck.py CREATIVE_RECENT_WEIGHT). */
export const RECENT_WEIGHT = [0.12, 0.3, 0.55, 0.8] as const;
/** The photos a photo device needs at least (photo-arc streams them: fewer read as a sparse row). */
export const PHOTOS_MIN = 5;
export type CreativeDeal = { deal: CreativeId[]; reserve: CreativeId[] };
const META = CREATIVE_META as readonly CreativeMeta[];
const ALL = META.map((m) => m.id as CreativeId);
const isId = (x: string): x is CreativeId => META.some((m) => m.id === x);
/** What the script can feed a device (launch.ts pairs): its needs met somewhere in the film. */
export const scriptFeeds = (pairs: readonly { alts?: string[]; logos?: string[]; before?: string[]; count?: unknown; photos?: string[] }[] = LAUNCH.pairs) => ({
  swap: pairs.some((p) => (p.alts?.length ?? 0) >= 2),
  logos: pairs.some((p) => (p.logos?.length ?? 0) >= 3),
  count: pairs.some((p) => p.count !== undefined),
  before: pairs.some((p) => (p.before?.length ?? 0) >= 2),
  photos: new Set(pairs.flatMap((p) => p.photos ?? [])).size >= PHOTOS_MIN,
});
/**
 * The creative elements for a name: a seeded, recency-weighted shuffle of the devices the script can feed (each
 * device's key u^(1/w), w the product of RECENT_WEIGHT over the recent films that played it), its first line device,
 * its first picture device, then the next of another family; re-drawn (deterministically) until it repeats no recent
 * set, shares nothing with the last film (one device at most after half the draws) and, while one is left, holds a
 * device no recent film played.
 */
export const creativeOf = (name: string, recent: readonly (readonly string[])[] = [], n = CREATIVE_N, feeds = scriptFeeds()): CreativeDeal => {
  const last = recent[0] ?? [];
  const played = new Set(recent.flat());
  const ok = META.filter((m) => m.needs.every((x) => (feeds as Record<string, boolean>)[x]));
  const weight = (id: string) => recent.slice(0, RECENT_WEIGHT.length).reduce((w, set, i) => (set.includes(id) ? w * RECENT_WEIGHT[i] : w), 1);
  const freshLeft = ok.some((m) => !played.has(m.id));
  for (let salt = 0; salt < 64; salt++) {
    const r = rng(hash(`${name.trim().toLowerCase()}#creative#${salt}`));
    const order = ok.map((m) => ({ m, k: r() ** (1 / weight(m.id)) })).sort((a, b) => b.k - a.k).map((x) => x.m);
    const pick: CreativeMeta[] = [];
    const take = (cond: (m: CreativeMeta) => boolean) => {
      const m = order.find((x) => !pick.includes(x) && !pick.some((p) => p.family === x.family) && cond(x));
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
    const same = (set: readonly string[]) => set.length === ids.length && ids.every((x) => set.includes(x));
    if (recent.some(same) || ids.filter((x) => last.includes(x)).length > (salt < 32 ? 0 : 1)) continue;
    if (freshLeft && salt < 48 && ids.every((x) => played.has(x))) continue;
    return { deal: ids, reserve: [...order.map((m) => m.id as CreativeId).filter((x) => !ids.includes(x)), ...ALL.filter((x) => !ok.some((m) => m.id === x))] };
  }
  const fall: CreativeId[] = ['split-around', 'shape-morph', 'object-turn'];
  return { deal: fall, reserve: ALL.filter((x) => !fall.includes(x)) };
};
/** What the unnamed scaffold plays (a named film never replays it whole). */
export const FLOOR_CREATIVE: CreativeId[] = ['scale-contrast', 'letter-swing', 'zoom-wall'];
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

// ---- The hero shots (src/hero). The shots that carry a film's production value: each a designed 3D or light shot of the
// product's own content (src/content.ts, written by scripts/content.mjs from the brief) standing in the film's world,
// with one sharp plane and a graded blur ladder, one camera move that has a job and lands, glass as a lens on the world,
// light sized to its source and timed, real content in quantity and a scale jump. scripts/deck.py deals at least three
// at random with fit (the brief's words, the world's tone, the photos, the brand's mark), never the last film's set,
// into src/dealt.ts `hero` (and `heroReserve`); the unnamed scaffold plays FLOOR_HERO; without a deck deal the name
// deals them and they take the beats the creative elements leave. timeline.ts HERO_PLAN puts each where its role says:
//   picture  a picture beat (the pair plays alone: its line, then the shot)
//   over     a line held over its own picture: the shot sets the line in its composition (one beat, T+A)
//   line     a line beat: the shot draws the line (the picture follows)
//   end      the end card: the lockup arrives through it
// A pair's `hero` (launch.ts) pins one; launch.ts `heroes.swap` trades one for another with a reason. `min`: the seconds
// the shot's beat needs (line: what it adds to the line's beat); `fits`: words that make it fit the product.
export type HeroRole = 'picture' | 'over' | 'line' | 'end';
export type HeroMeta = { id: string; role: HeroRole; family: string; needs: readonly string[]; prefer: 'first' | 'middle' | 'proof'; min: number; dark?: boolean; fits: readonly string[]; about: string };
export const HERO_META = [
  { id: 'glass-input', role: 'over', family: 'input', needs: [], prefer: 'first', min: 3.2, fits: ['ask', 'search', 'prompt', 'type', 'message', 'chat', 'assistant', 'agent', 'request', 'describe', 'write', 'find', 'query'], about: 'the line over the world and under it the product\'s input as frosted glass: the camera pushes in once as the request types, a band of light crosses the glass as it lands and again as it sends' },
  { id: 'macro-type', role: 'picture', family: 'input', needs: [], prefer: 'first', min: 3.0, fits: ['ask', 'type', 'prompt', 'message', 'write', 'compose', 'command', 'search', 'chat', 'reply', 'draft'], about: 'the input at macro scale: the camera pushes onto the first characters and rides the caret as the request types, the world soft behind; a soft pointer clicks send and a glow the size of the button blooms' },
  { id: 'black-glass', role: 'picture', family: 'input', needs: [], prefer: 'first', min: 2.6, dark: true, fits: ['agent', 'code', 'build', 'command', 'terminal', 'deploy', 'run', 'prompt', 'automate', 'workflow', 'developer'], about: 'the product\'s composer as a frosted pane focusing in out of the dark (a rack from soft to sharp in 9 frames), glints running along its rim, one push that lands, the request typing once it is sharp' },
  { id: 'page-fly', role: 'picture', family: 'page', needs: [], prefer: 'middle', min: 2.8, fits: ['page', 'doc', 'document', 'report', 'site', 'website', 'article', 'invoice', 'brief', 'proposal', 'contract', 'plan', 'summary', 'post', 'landing', 'resume', 'guide'], about: 'the page the product makes flies in lying back in perspective and the camera travels it from the headline to the table, the far edge soft, a thin light along its near edge' },
  { id: 'toast-stack', role: 'picture', family: 'stack', needs: [], prefer: 'proof', min: 2.2, fits: ['notif', 'alert', 'payment', 'paid', 'order', 'sale', 'sign', 'booking', 'reminder', 'message', 'event', 'invoice', 'subscri', 'inbox', 'join', 'waitlist'], about: 'what the product sets off arrives as notifications dropping into the front slot and pushing the stack back into depth: the front one sharp, each one further back softer (a graded blur ladder), real names, amounts and times' },
  { id: 'fan-focus', role: 'picture', family: 'stack', needs: [], prefer: 'middle', min: 2.6, fits: ['results', 'sources', 'options', 'matches', 'candidates', 'listings', 'comments', 'reviews', 'picks', 'choose', 'compare', 'feedback', 'leads'], about: 'many results as cards fanned back in depth, the camera to one side closing on the one that matters while the focus racks to it' },
  { id: 'rise-behind', role: 'over', family: 'word', needs: [], prefer: 'proof', min: 2.8, fits: ['plan', 'plans', 'pricing', 'price', 'tier', 'option', 'lineup', 'choose', 'compare', 'collection', 'set', 'every'], about: 'the line\'s key word giant in the middle of the frame, glass cards of the product\'s own content rising behind it while the camera pulls back; the focus racks from the word to the cards as the reveal lands' },
  { id: 'porthole', role: 'line', family: 'word', needs: [], prefer: 'middle', min: 1.0, fits: ['people', 'team', 'creator', 'customer', 'person', 'friend', 'coach', 'client', 'patient', 'student', 'guest', 'host', 'face', 'voice', 'family', 'member'], about: 'once the line is read its words part and a porthole opens in the gap, a real face (or the product) inside, a soft shadow ring round it and a band of light on its rim; the words re-centre round it, then it all goes soft into the next shot' },
  { id: 'carousel', role: 'picture', family: 'media', needs: ['pictures'], prefer: 'middle', min: 2.8, fits: ['photo', 'video', 'image', 'thumbnail', 'design', 'gallery', 'listing', 'clip', 'reel', 'album', 'channel', 'portfolio', 'catalog', 'shop', 'product'], about: 'a ring of the product\'s real pictures turning in depth; the camera cranes down from above to eye level as the ring slows and lands the chosen one facing the camera, a smear only while it turns fast' },
  { id: 'push-press', role: 'picture', family: 'press', needs: ['button'], prefer: 'proof', min: 2.0, fits: ['book', 'pay', 'send', 'merge', 'publish', 'approve', 'buy', 'order', 'confirm', 'sign', 'submit', 'launch', 'ship', 'deploy', 'checkout'], about: 'the product\'s screen, then one push into its button at macro scale as a pointer reaches it and presses: a glow the size of the button blooms and the screen answers' },
  { id: 'logo-3d', role: 'end', family: 'mark', needs: ['mark'], prefer: 'proof', min: 1.6, fits: [], about: 'the end card arrives through the brand\'s mark as a solid: an extreme close-up of its bevelled edge, one pull-back that turns it to face the camera and lands it exactly on the flat lockup' },
] as const satisfies readonly HeroMeta[];
export type HeroId = (typeof HERO_META)[number]['id'];
const HMETA = HERO_META as readonly HeroMeta[];
/** A hero shot's entry. */
export const heroMeta = (id: string): HeroMeta | undefined => HMETA.find((m) => m.id === id);
/** How many hero shots a film is dealt (at least: deck.py may deal one more for a long film). */
export const HERO_N = 3;
/** What the unnamed scaffold plays: a glass input over the world, a line parted by a porthole, a notification stack. */
export const FLOOR_HERO: string[] = ['glass-input', 'porthole', 'toast-stack'];
/**
 * The hero shots for a name (the fallback when the deck dealt none): a seeded, recency-weighted shuffle of the shots a
 * name deal can feed (the ones that need pictures, the brand's mark or the product's button are the deck's to deal: it
 * knows what the film has), at least one picture shot, one shot of a family and one of each other role at most, never a
 * recent film's set and one shot shared with the last film at most (two after half the draws).
 */
export const heroOf = (name: string, recent: readonly (readonly string[])[] = [], n = HERO_N): { deal: string[]; reserve: string[] } => {
  const ok = HMETA.filter((m) => !m.needs.length && m.role !== 'end');
  const last = recent[0] ?? [];
  const weight = (id: string) => recent.slice(0, RECENT_WEIGHT.length).reduce((w, set, i) => (set.includes(id) ? w * RECENT_WEIGHT[i] : w), 1);
  for (let salt = 0; salt < 64; salt++) {
    const r = rng(hash(`${name.trim().toLowerCase()}#hero#${salt}`));
    const order = ok.map((m) => ({ m, k: r() ** (1 / weight(m.id)) })).sort((a, b) => b.k - a.k).map((x) => x.m);
    const pick: HeroMeta[] = [];
    const take = (cond: (m: HeroMeta) => boolean) => {
      const m = order.find((x) => !pick.includes(x) && !pick.some((p) => p.family === x.family) && !(x.role !== 'picture' && pick.some((p) => p.role === x.role)) && cond(x));
      if (m) pick.push(m);
    };
    take((m) => m.role === 'picture');
    while (pick.length < n) {
      const had = pick.length;
      take(() => true);
      if (pick.length === had) break;
    }
    const ids = pick.map((m) => m.id);
    const same = (set: readonly string[]) => set.length === ids.length && ids.every((x) => set.includes(x));
    if (recent.some(same) || ids.filter((x) => last.includes(x)).length > (salt < 32 ? 1 : 2)) continue;
    return { deal: ids, reserve: order.map((m) => m.id).filter((x) => !ids.includes(x)) };
  }
  return { deal: [...FLOOR_HERO], reserve: [] };
};
const recentHero = ((RECENT as { hero?: readonly (readonly string[])[] }).hero ?? []).filter((x) => Array.isArray(x));
const heroSwapped = (h: { deal: string[]; reserve: string[] }) => {
  const sw = LAUNCH.heroes?.swap ?? {};
  const keys = Object.keys(sw);
  if (!keys.length) return h;
  if (!(LAUNCH.heroes?.reason ?? '').trim()) throw new Error('deal: launch.ts heroes.swap needs a reason (what in the product rules the dealt shot out)');
  if (keys.length > 1) throw new Error(`deal: launch.ts swaps ${keys.length} hero shots; swap one at most`);
  if (!keys.every((x) => h.deal.includes(x))) throw new Error(`deal: launch.ts heroes.swap trades ${keys.join(', ')}, which this film was not dealt (${h.deal.join(', ')})`);
  const deal = h.deal.map((x) => sw[x] ?? x);
  const bad = deal.filter((x) => !heroMeta(x));
  if (bad.length) throw new Error(`deal: launch.ts heroes.swap names ${bad.join(', ')}, not a hero shot (deal.ts HERO_META)`);
  return { deal, reserve: h.reserve.filter((x) => !deal.includes(x)) };
};
/**
 * The film's hero shots in the deal's order, the reserve the timeline draws from when fewer than HERO_N find a beat,
 * where they came from, and whether they take their beats before the creative elements (`first`: a deck deal and the
 * scaffold; a name deal fills the beats the creative elements leave). A deck deal without hero shots (an older deal)
 * plays none: re-deal with deck.py.
 */
export const HERO_DEAL: { deal: string[]; reserve: string[]; source: string; first: boolean } = (() => {
  const d = DEALT as { hero?: string[]; heroReserve?: string[] } | null;
  if (d) {
    if (!d.hero?.length) return { deal: [], reserve: [], source: 'none (src/dealt.ts deals no hero shots: re-deal with scripts/deck.py)', first: true };
    const bad = [...d.hero, ...(d.heroReserve ?? [])].filter((x) => !heroMeta(x));
    if (bad.length) throw new Error(`deal: src/dealt.ts names ${bad.join(', ')}, not a hero shot of this template (deal.ts HERO_META; re-deal with scripts/deck.py)`);
    const h = heroSwapped({ deal: [...d.hero], reserve: (d.heroReserve ?? []).filter((x) => !(d.hero as string[]).includes(x)) });
    return { ...h, source: `deck.py${LAUNCH.heroes?.swap ? `, swapped (${LAUNCH.heroes.reason})` : ''}`, first: true };
  }
  if (UNNAMED) return { deal: [...FLOOR_HERO], reserve: [], source: 'the floor (unnamed scaffold)', first: true };
  return { ...heroSwapped(heroOf(NAME, recentHero)), source: `the name "${NAME}" (the beats the creative elements leave)`, first: false };
})();

