// The update film's choices, dealt per film. The structure never changes: the hook (the name and the version on a clean
// ground), then each change as a line (in and read in 1.2 s at most) and its house scene (src/scenes: one moment each,
// 1.5-3 s, filled with this product's words, pictures and mark) in 2-4 s (a typed change in 3 s), then the mark pulling
// back into the lockup (2 s at most to the last frame) and the version landing on the bar line that ends the body. How each part looks is dealt. The seed is the product's name (src/brand/identity.ts: the
// same name, the same deal, on any machine); SEED re-deals without renaming, PIN fixes a slot by hand. The unnamed
// scaffold ('[Product]') plays the floor; a named film never replays it. When scripts/deck.py dealt a direction in this
// project (src/dealt.ts) the film takes its scenes (`hero`) first. Print what this film plays: the command in
// template.json deal.print.
// Node-safe (no React, no CSS, no brand tokens): the timeline, the sound and the tests read it.
//
//   slot     choices          what each does
//   palette  (10 designed)    the film's colours when the brand brings none (src/brand/tokens.ts still the starter's
//                             stand-in): a near-black or a white ground, one strong accent, never a tinted wash, never the
//                             starter's green, never a scene's own demo colours (acts/look.tsx takes the brand's first)
//   hook     pill             "[Name]" builds centred; the version's pill lands beside it, the pair re-centring
//            roll             the name with the pill beside it from the first frame; the old numerals roll to the new
//            tag              the name lands alone, slides aside, and the version cuts on in the accent at its fastest
//   voice    whole | chunks | track   the move every line arrives on (acts/type.tsx), one per film: the line lands
//                             whole (a focus pull), in 2-3 phrase chunks (each rising out of its mask), or whole with
//                             its tracking closing; never word by word, read in 1.2 s at most
//   set      line | statement the size the change lines are set at: big (cap 8 % of the frame), or a statement (11 %)
//   (scenes)                  each change's scene (HERO_META below): the deck's (src/dealt.ts hero) or dealt from the
//                             name, the first in the film's order that films the change (sceneFit), at least one big one
import { IDENTITY } from './brand/identity';
import { holdFor, PACE } from './lib/pace';
import { DEALT } from './dealt';
import { RECENT } from './recent';
import { type Change, photosOf, pictureOf, rowsOf, spokenChange, UPDATE } from './update';

// ---------------------------------------------------------------------------------------------- the palettes
/**
 * A designed palette: the dark and the light ground (a scene plays on the one its picture needs, the film's lines on the
 * ground of the scene they lead into), one accent and its light end. Every accent reads on both grounds as large type.
 */
export type FilmPalette = { id: string; base: 'dark' | 'light'; dark: string; light: string; accent: string; lift: string };
export const PALETTES: readonly FilmPalette[] = [
  { id: 'ink-cobalt', base: 'dark', dark: '#0B0C0F', light: '#F3F4F6', accent: '#2F62FF', lift: '#9DB6FF' },
  { id: 'paper-cobalt', base: 'light', dark: '#0E1013', light: '#F4F5F7', accent: '#2350F0', lift: '#A9BCFF' },
  { id: 'ink-vermilion', base: 'dark', dark: '#0C0B0B', light: '#F5F4F3', accent: '#F2472C', lift: '#FFA595' },
  { id: 'paper-vermilion', base: 'light', dark: '#111012', light: '#F6F5F4', accent: '#E33A21', lift: '#FFB0A3' },
  { id: 'ink-tangerine', base: 'dark', dark: '#0B0B0C', light: '#F5F4F2', accent: '#FF7417', lift: '#FFC08F' },
  { id: 'paper-tangerine', base: 'light', dark: '#121110', light: '#F6F5F3', accent: '#F06A0F', lift: '#FFC59A' },
  { id: 'ink-azure', base: 'dark', dark: '#0A0C10', light: '#F3F5F8', accent: '#1E8BFF', lift: '#A3D0FF' },
  { id: 'paper-azure', base: 'light', dark: '#0D1117', light: '#F3F5F8', accent: '#0A72F0', lift: '#9CCBFF' },
  { id: 'ink-crimson', base: 'dark', dark: '#0D0B0C', light: '#F5F3F4', accent: '#F0304E', lift: '#FF9DAD' },
  { id: 'paper-crimson', base: 'light', dark: '#120F10', light: '#F6F4F5', accent: '#D21F3C', lift: '#F7A3B0' },
];
export const paletteById = (id: string): FilmPalette => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

// ---------------------------------------------------------------------------------------------- the deal
export const DEVICES = {
  palette: PALETTES.map((p) => p.id),
  hook: ['pill', 'roll', 'tag'],
  voice: ['whole', 'chunks', 'track'],
  set: ['line', 'statement'],
} as const;
export type Slot = keyof typeof DEVICES;
export type Deal = { palette: string; hook: string; voice: string; set: string };

/**
 * What each composing slot does to the frame, in words (fx/TypeSystem compositionApart): two devices with the same words
 * are one composition. The palette and the voice are colour and motion, not a composition, and are left out.
 */
export const COMPOSITION: { [S in Slot]?: Record<string, string> } = {
  hook: { pill: 'the name, then a pill landing beside it', roll: 'the name and the pill together from the first frame, the numerals rolling in it', tag: 'the name alone, sliding aside for the version' },
  set: { line: 'each change line big, a cap of 8 % of the frame', statement: 'each change line a statement, a cap of 11 % of the frame' },
};

/** What the template plays before the product's name is in (its name slot, '[Product]'): a product's deal never replays it. */
export const FLOOR: Deal = { palette: 'ink-cobalt', hook: 'pill', voice: 'whole', set: 'line' };
/** Choose a slot by hand ({ hook: 'tag' }); a pinned slot is not dealt. */
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
/** mulberry32 on the mixed seed: the same seed, the same deal, in any render order. */
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
  const key = s === 'palette' ? 'ground' : s;
  const used = ((RECENT as Partial<Record<string, readonly string[]>>)[key] ?? []).filter((c) => typeof c === 'string' && all.includes(c));
  const left = all.filter((c) => !used.includes(c));
  return left.length ? left : [used[used.length - 1]];
};

const isPlaceholder = (name: string) => /^\[.*\]$/.test(name.trim());
const UNNAMED = SEED === null && isPlaceholder(IDENTITY.name);

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
export const DEAL: Deal = UNNAMED ? { ...FLOOR, ...PIN } : dealApart(DEAL_SEED);
/** The film's designed palette (acts/look.tsx takes the brand's own first, when src/brand/tokens.ts carries one). */
export const PALETTE: FilmPalette = paletteById(DEAL.palette);

// ---------------------------------------------------------------------------------------------- the scenes
/**
 * The house scenes this template plays (src/scenes; their own meta entries hold the same numbers: acts/scenes.tsx
 * checks them). Keep each entry on one line: scripts/deck.py reads them (it deals a film's set with fit into
 * src/dealt.ts `hero`). `role`: picture (a change's scene) or end (the lockup's); `needs`: what the film must have for
 * the deck to deal it; `min`: its seconds.
 */
export type HeroRole = 'picture' | 'over' | 'line' | 'end';
export type HeroMeta = { id: string; role: HeroRole; family: string; needs: readonly string[]; prefer: 'first' | 'middle' | 'proof'; min: number; dark?: boolean; fits: readonly string[]; about: string };
export const HERO_META = [
  { id: 'porthole-line', role: 'picture', family: 'press', needs: ['button', 'pictures'], prefer: 'proof', min: 2.6, fits: ['join', 'send', 'call', 'book', 'share', 'invite', 'open', 'meet', 'tap', 'one', 'start', 'see'], about: 'a real pointer presses send at macro scale; the button drains into a porthole holding the change\'s picture while its line, set giant on two lines, parts round it' },
  { id: 'decode-title', role: 'picture', family: 'title', needs: ['button'], prefer: 'first', min: 1.9, dark: true, fits: ['start', 'try', 'get', 'go', 'now', 'live', 'ready', 'unlock', 'turn', 'switch'], about: 'the change\'s short line decodes out of a swirl of the accent on a dark dot grid; its button flies into the line and a real pointer clicks it' },
  { id: 'macro-type', role: 'picture', family: 'input', needs: [], prefer: 'first', min: 1.8, fits: ['ask', 'type', 'prompt', 'message', 'write', 'search', 'chat', 'reply', 'draft', 'find', 'say', 'tell'], about: 'a giant pointer turns into a text cursor and clicks the product\'s input; a short request types in at macro scale with the camera on the caret, then runs on to send and presses it' },
  { id: 'glass-prompt', role: 'picture', family: 'glass', needs: [], prefer: 'middle', min: 1.9, dark: true, fits: ['ask', 'prompt', 'describe', 'command', 'run', 'generate', 'build', 'make', 'create'], about: 'a dark frosted prompt box rises out of blur with light running along its rims; the stage whips aside and the request types in' },
  { id: 'toast-stack', role: 'picture', family: 'stack', needs: [], prefer: 'proof', min: 1.6, fits: ['notif', 'alert', 'payment', 'paid', 'order', 'booking', 'reminder', 'message', 'arrive', 'land', 'update', 'every', 'list', 'live'], about: 'the change\'s rows land as notifications one after another and pile into a depth stack on the accent field, the newest sharp in front' },
  { id: 'page-fly', role: 'picture', family: 'page', needs: [], prefer: 'middle', min: 2.4, dark: true, fits: ['page', 'doc', 'document', 'report', 'note', 'notes', 'brief', 'plan', 'summary', 'write', 'draft'], about: 'the change\'s page rises in on a tilted plane out of a dark void and the camera dives onto its headline and travels down it as the rows write on' },
  { id: 'photo-river', role: 'picture', family: 'media', needs: ['pictures'], prefer: 'middle', min: 2.7, fits: ['photo', 'video', 'image', 'picture', 'gallery', 'album', 'clip', 'every', 'all', 'library'], about: 'one card pumps through the change\'s pictures faster and faster, leaves a deck and unfolds into a row receding in depth' },
  { id: 'photo-counters', role: 'picture', family: 'figure', needs: ['pictures'], prefer: 'proof', min: 1.7, fits: ['count', 'save', 'saved', 'earn', 'hours', 'minutes', 'faster', 'more', 'less', 'grow', 'track'], about: 'the change\'s picture develops from a duotone in the accent while glass cards over it count the figure up' },
  { id: 'orbit-chips', role: 'picture', family: 'logos', needs: [], prefer: 'middle', min: 2.0, fits: ['works', 'with', 'connect', 'sync', 'import', 'integrat', 'apps', 'tools', 'plug'], about: 'the change\'s line sits on hairline orbits; the products it works with fly in as accent pills and land as their official marks on chips that orbit' },
  { id: 'photo-orbit', role: 'picture', family: 'media', needs: ['pictures'], prefer: 'first', min: 2.3, dark: true, fits: ['photo', 'picture', 'image', 'gallery', 'album', 'share', 'see', 'every', 'all', 'shoot'], about: 'the change\'s line builds word by word in caps at the centre of a near-black ground while square tiles of its pictures dive in and orbit it in depth, flaring to white' },
  { id: 'card-rivers', role: 'picture', family: 'media', needs: ['pictures'], prefer: 'middle', min: 2.9, fits: ['photo', 'picture', 'library', 'collect', 'sort', 'find', 'browse', 'save', 'all', 'every'], about: 'one word at the centre of two curved rivers of the change\'s picture cards streaming past in depth; the word swaps mid-flow and the rivers accelerate into streaks' },
  { id: 'site-flip', role: 'picture', family: 'page', needs: [], prefer: 'middle', min: 2.1, dark: true, fits: ['page', 'site', 'website', 'publish', 'design', 'build', 'landing', 'store', 'shop', 'live'], about: 'two white blocks step in and turn into the product\'s page in 3D on a dotted black stage; it orbits round while it builds section by section, then whips out' },
  { id: 'ribbon-ring', role: 'picture', family: 'title', needs: [], prefer: 'proof', min: 1.9, fits: ['now', 'one', 'every', 'always', 'never', 'just', 'simple', 'clean', 'quiet', 'calm'], about: 'white on white: the change\'s words cut on in the hole of a pleated paper ring seen from above; the camera rises and whips up to a sunflower of rays that fades, leaving the line' },
  { id: 'phone-pullback', role: 'picture', family: 'press', needs: ['button'], prefer: 'middle', min: 2.8, fits: ['tap', 'add', 'new', 'create', 'post', 'open', 'phone', 'mobile', 'app', 'menu', 'start'], about: 'a macro on the product\'s name in its phone app pulls back into the whole phone tilted in 3D; a chunky pointer presses the + and the change\'s two-row menu pops' },
  { id: 'object-window', role: 'picture', family: 'press', needs: ['button'], prefer: 'proof', min: 2.8, dark: true, fits: ['pick', 'choose', 'mark', 'select', 'place', 'pin', 'save', 'edit', 'confirm', 'done'], about: 'a glass app window rises holding the brand\'s mark as a solid; it turns to face us, the camera pushes in, a pointer marks a spot on it and presses the change\'s confirm pill' },
  { id: 'crystal-hall', role: 'picture', family: 'mark', needs: [], prefer: 'first', min: 2.6, dark: true, fits: ['new', 'launch', 'start', 'unlock', 'live', 'ready', 'turn', 'faster', 'power', 'open'], about: 'a sphere in the accent flies into a dark hall of glowing grid walls and lands; a glass octahedron forms round it under a cone of light and fills with light, the mark inside' },
  { id: 'cloud-dome', role: 'picture', family: 'logos', needs: ['logos'], prefer: 'middle', min: 2.8, fits: ['works', 'with', 'connect', 'sync', 'apps', 'tools', 'integrat', 'everywhere', 'cloud', 'plug'], about: 'the change\'s line on a pale sky; the camera tilts down through a rushing cloud onto the product under a glass dome above a cloud sea, the tools it works with orbiting as glass tiles' },
  { id: 'street-poster', role: 'picture', family: 'world', needs: ['picture', 'street'], prefer: 'proof', min: 2.0, dark: true, fits: ['publish', 'share', 'print', 'poster', 'post', 'everywhere', 'world', 'city', 'out', 'promote'], about: 'real street photographs cut one after another, each pulling back, every billboard carrying the change\'s picture in its perspective' },
  { id: 'room-push', role: 'picture', family: 'world', needs: ['picture', 'room'], prefer: 'middle', min: 2.2, fits: ['see', 'show', 'screen', 'present', 'meet', 'room', 'tv', 'big', 'share', 'open'], about: 'a real room appears as a render pass in the brand\'s colours and resolves to the photograph; the camera punches in and pushes into its screen until the change\'s picture is the frame' },
  { id: 'mark-pullback', role: 'end', family: 'mark', needs: [], prefer: 'proof', min: 2.0, fits: [], about: 'the end: the brand\'s mark as a solid pulls back from an extreme close-up with a roll, one snap cut to the lockup assembling, which keeps a slow push; the version lands under it on the bar line' },
] as const satisfies readonly HeroMeta[];
export type HeroId = (typeof HERO_META)[number]['id'];
const HMETA = HERO_META as readonly HeroMeta[];
export const heroMeta = (id: string): HeroMeta | undefined => HMETA.find((m) => m.id === id);
/** The change scenes (every scene but the end's). */
export const PICTURE_HEROES: string[] = HMETA.filter((m) => m.role === 'picture').map((m) => m.id);

/** The element a scene takes over on its first frame or hands on at its last (src/scenes meta handIn / handOut, px of 1920 x 1080). */
export type Box = { form: string; x: number; y: number; w: number; h: number };
/**
 * Each scene's numbers as this template plays it (frames at 30 fps): `dur`, its length with the default content;
 * `big`: one of the moments that carry a film; `carries`: it sets the change's own line inside it (no line card);
 * `tone`: the ground its picture needs (`either`: the film's base; `field`: the accent); `rest`: a frame inside its
 * held result where the film may give it more time (played slower, never frozen); `endless`: the prop that ends it
 * on its element without its own last action (the next scene's pointer takes it); `exit`: the seam its own last frames
 * make into what follows (a defocus, a whip, the page leaving at speed); a scene without one is wiped away by the next
 * part's clean ground; `skip`: the frames the film enters it after (it cuts into the scene's move already travelling:
 * macro-type's pointer already turned to a text cursor and nearing the field, so a typed change runs 3 s at most).
 */
export type SceneSpec = { dur: number; big: boolean; carries: boolean; tone: 'dark' | 'light' | 'either' | 'field'; rest?: number; skip?: number; handIn: Box | null; handOut: Box; endless?: Record<string, boolean>; exit?: { kind: 'defocus' | 'whip' | 'velocity'; carry?: 'x' | 'y'; dir?: 1 | -1 } };
export const SCENE_SPEC: Record<string, SceneSpec> = {
  'porthole-line': { dur: 78, big: true, carries: true, tone: 'either', rest: 64, handIn: { form: 'button', x: 813, y: 340, w: 386, h: 386 }, handOut: { form: 'photo', x: 673, y: 258, w: 574, h: 574 }, exit: { kind: 'defocus' } },
  'decode-title': { dur: 56, big: true, carries: true, tone: 'dark', handIn: null, handOut: { form: 'button', x: 1180, y: 499, w: 360, h: 80 } },
  'macro-type': { dur: 77, big: true, carries: false, tone: 'light', skip: 20, handIn: { form: 'pill', x: 591, y: 568, w: 1329, h: 194 }, handOut: { form: 'button', x: 813, y: 340, w: 386, h: 386 }, endless: { click: false } },
  'glass-prompt': { dur: 56, big: false, carries: false, tone: 'dark', handIn: null, handOut: { form: 'pill', x: 457, y: 455, w: 975, h: 182 }, exit: { kind: 'whip', carry: 'x', dir: 1 } },
  'toast-stack': { dur: 48, big: false, carries: false, tone: 'field', rest: 40, skip: 4, handIn: null, handOut: { form: 'notice', x: 272, y: 110, w: 1376, h: 215 } },
  'page-fly': { dur: 72, big: true, carries: false, tone: 'dark', handIn: { form: 'page', x: 288, y: 260, w: 1344, h: 1740 }, handOut: { form: 'page', x: 288, y: -900, w: 1344, h: 1740 }, exit: { kind: 'velocity', carry: 'y', dir: -1 } },
  'photo-river': { dur: 81, big: true, carries: false, tone: 'either', handIn: { form: 'photo', x: 625, y: 90, w: 670, h: 900 }, handOut: { form: 'photo', x: 744, y: 250, w: 432, h: 579 } },
  'photo-counters': { dur: 52, big: false, carries: false, tone: 'light', rest: 40, handIn: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 }, handOut: { form: 'count', x: 550, y: 260, w: 820, h: 560 } },
  'orbit-chips': { dur: 60, big: false, carries: true, tone: 'light', handIn: { form: 'word', x: 516, y: 497, w: 888, h: 86 }, handOut: { form: 'card', x: 560, y: 200, w: 800, h: 680 } },
  'photo-orbit': { dur: 69, big: true, carries: false, tone: 'dark', handIn: null, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 } },
  'card-rivers': { dur: 87, big: true, carries: false, tone: 'light', handIn: null, handOut: { form: 'word', x: 836, y: 516, w: 249, h: 50 }, exit: { kind: 'velocity', carry: 'x', dir: 1 } },
  'site-flip': { dur: 62, big: true, carries: false, tone: 'dark', handIn: null, handOut: { form: 'page', x: -114, y: 79, w: 1346, h: 980 }, exit: { kind: 'whip', carry: 'x', dir: -1 } },
  'ribbon-ring': { dur: 56, big: false, carries: false, tone: 'light', handIn: null, handOut: { form: 'word', x: 683, y: 504, w: 553, h: 72 } },
  'phone-pullback': { dur: 84, big: true, carries: false, tone: 'light', handIn: { form: 'mark', x: 534, y: 469, w: 173, h: 118 }, handOut: { form: 'card', x: 649, y: 491, w: 575, h: 222 } },
  'object-window': { dur: 84, big: true, carries: false, tone: 'dark', handIn: { form: 'window', x: 440, y: 311, w: 1031, h: 687 }, handOut: { form: 'window', x: 270, y: 82, w: 1390, h: 926 } },
  'crystal-hall': { dur: 78, big: true, carries: false, tone: 'dark', handIn: null, handOut: { form: 'mark', x: 765, y: 338, w: 390, h: 524 } },
  'cloud-dome': { dur: 84, big: true, carries: false, tone: 'light', handIn: { form: 'word', x: 330, y: 430, w: 1260, h: 202 }, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 }, exit: { kind: 'defocus' } },
  'street-poster': { dur: 60, big: true, carries: false, tone: 'dark', handIn: null, handOut: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 } },
  'room-push': { dur: 66, big: true, carries: false, tone: 'either', handIn: null, handOut: { form: 'window', x: 0, y: 0, w: 1920, h: 1080 } },
  'mark-pullback': { dur: 60, big: true, carries: false, tone: 'either', rest: 21, handIn: null, handOut: { form: 'mark', x: 630, y: 471, w: 660, h: 137 } },
};
/** The lockup's own frames (30 fps, scenes/mark-pullback PULLBACK): the one snap cut to the lockup assembling, settled. */
export const PULLBACK30 = { cut: 28, lockup: 28, settled: 43 } as const;

// ---------------------------------------------------------------------------------------------- the limits
/**
 * The film's hard limits (seconds): a lone line is in and read in LINE_S, a scene runs SCENE_S at most, a change (its
 * line and its scene) CHANGE_S, a typed change TYPE_S, the hook HOOK_S, the lockup (its first frame to the film's last)
 * LOCK_S with TAIL_S at least after the version mark, the film FILM_S. src/timeline.ts builds the plan inside them and
 * fails loudly (grid-check, the Studio, the render) on a plan outside them.
 */
export const LIMITS = { LINE_S: 1.2, SCENE_S: 3.0, CHANGE_S: 4.0, TYPE_S: 3.0, HOOK_S: 1.6, LOCK_S: 2.5, TAIL_S: 1.5, FILM_S: [8, 20] as const } as const;
/** A lone line of n words holds this long once read (60 fps frames, the crisp pace's read: grid-check's text-hold). */
export const readHold60 = (n: number): number => holdFor(n, PACE.crisp);
/**
 * macro-type's length for a request (frames at 30 fps): the house scene's own formula (scenes/macro-type macroTypeDur:
 * its last key lands (n - 1) / cps seconds after the first, whatever the cadence's jitter).
 */
export const macroTypeDur30 = (text: string) => {
  const cps = Math.min(40, Math.max(24, text.length / 1.05));
  const last = Math.max(0, text.length - 1) * (60 / cps);
  return Math.ceil(37 + last / 2 + 2 + 11 + 6);
};
/** The fastest a lone line arrives (60 fps frames): whole in 4 f. */
export const LINE_MIN60 = 4;
/**
 * Whether a typed change fits macro-type: its line (the read of its words, arriving whole) and the scene entered at its
 * skip run TYPE_S at most (about 20 characters). A longer request types in glass-prompt.
 */
export const macroFits = (c: Change): boolean => {
  if (c.show.kind !== 'type') return false;
  const scene60 = (macroTypeDur30(c.show.text) - (SCENE_SPEC['macro-type'].skip ?? 0)) * 2;
  return scene60 + readHold60(spokenChange(c).split(/\s+/).length) + LINE_MIN60 + 8 <= LIMITS.TYPE_S * 60;
};

/** The words of a line a scene parts (porthole-line): the top line and the bottom, the key words kept on the bottom. */
export const splitLine = (c: Change): [string, string] => {
  const w = spokenChange(c).split(/\s+/);
  const bare = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (c.key ?? '').split(/\s+/).map(bare).filter(Boolean);
  const k0 = key.length ? w.map(bare).indexOf(key[0]) : -1;
  let n = c.split ?? Math.ceil(w.length / 2);
  if (c.split === undefined && k0 > 0 && k0 < n) n = k0; // the key words open the bottom line
  n = Math.min(w.length - 1, Math.max(1, n));
  return [w.slice(0, n).join(' '), w.slice(n).join(' ')];
};

/**
 * How well scene `id` films change c: 0 it cannot, 1 it can carry it (used when the film needs a big scene or a second
 * kind), 2 it shows this change.
 */
export const sceneFit = (id: string, c: Change): number => {
  const s = c.show;
  const n = spokenChange(c).split(/\s+/).length;
  const pic = !!pictureOf(c);
  switch (id) {
    case 'porthole-line':
      return s.kind === 'tap' && pic && n >= 2 ? 2 : 0;
    case 'decode-title':
      return s.kind === 'tap' ? (n <= 3 ? 2 : n <= 4 ? 1 : 0) : 0;
    case 'macro-type':
      return macroFits(c) ? 2 : 0;
    case 'glass-prompt':
      return s.kind === 'type' ? 2 : 0;
    case 'toast-stack':
      return s.kind === 'fill' && s.layout === 'list' ? 2 : rowsOf(c).length >= 3 ? 1 : 0;
    case 'page-fly':
      return s.kind === 'page' ? 2 : 0;
    case 'photo-river':
      return photosOf(c).length >= 8 ? 2 : 0;
    case 'photo-counters':
      return s.kind === 'count' && pic ? 2 : 0;
    case 'orbit-chips':
      return (c.logos?.length ?? 0) >= 3 ? 2 : 0;
    // the newer scenes: a grid of 4 or more photos orbits the line, 8 or more stream as rivers; a page plays as the
    // product's site; a press opens the app's menu or marks a spot and confirms; tools orbit a dome; a picture goes on
    // the street's boards or into a room's screen (PLATES); the ring and the hall carry any short change
    case 'photo-orbit':
      return photosOf(c).length >= 4 && n <= 6 ? (s.kind === 'fill' && s.layout === 'grid' ? 2 : 1) : 0;
    case 'card-rivers':
      return photosOf(c).length >= 8 ? 2 : 0;
    case 'site-flip':
      return s.kind === 'page' ? 2 : 0;
    case 'ribbon-ring':
      return n >= 2 && n <= 7 ? 1 : 0;
    case 'phone-pullback':
      return s.kind === 'tap' ? 2 : 0;
    case 'object-window':
      return s.kind === 'tap' && n <= 6 ? 2 : 0;
    case 'crystal-hall':
      return n <= 6 ? (asks('crystal-hall', c) ? 2 : 1) : 0;
    case 'cloud-dome':
      return (c.logos?.length ?? 0) >= 3 ? 2 : n <= 7 ? 1 : 0;
    case 'street-poster':
      return pic && PLATES.street.length ? 2 : 0;
    case 'room-push':
      return pic && PLATES.room ? 2 : 0;
    default:
      return 0;
  }
};

/** A change's verb: its own, else its line's first word. */
export const verbOf = (c: Change): string => (c.verb ?? c.words.replace(/\[\]/g, '').trim().split(/\s+/)[0] ?? '').toLowerCase();
/** How many of a scene's `fits` words the change's verb and line touch. */
const asks = (id: string, c: Change): number => {
  const words = `${verbOf(c)} ${spokenChange(c)}`.toLowerCase();
  return (heroMeta(id)?.fits ?? []).filter((w) => words.includes(w)).length;
};
/** Do two scenes join on one element: the first hands on the very box the second takes over (a match cut). */
export const joins = (a: string, b: string): boolean => {
  const o = SCENE_SPEC[a]?.handOut;
  const i = SCENE_SPEC[b]?.handIn;
  if (!o || !i || o.form !== i.form) return false;
  const ix = Math.max(0, Math.min(o.x + o.w, i.x + i.w) - Math.max(o.x, i.x));
  const iy = Math.max(0, Math.min(o.y + o.h, i.y + i.h) - Math.max(o.y, i.y));
  return (ix * iy) / Math.max(o.w * o.h, i.w * i.h) > 0.8;
};

/**
 * The real photographs street-poster and room-push stand on, fetched at film time (scripts/assets.mjs: open
 * collections, no credit needed) and written here with their corners in the photograph's own pixels, read off a gridded
 * copy: `street` 1-4 street or wall photographs with the four corners of each board (the change's picture goes on
 * them), `room` a room photograph with the four corners of its screen (the change's picture fills it). Empty: neither
 * scene is dealt. `clouds`: a cloud-sea plate for cloud-dome (`node scripts/assets.mjs plate clouds`); none: it paints
 * its own.
 */
type Pt = readonly [number, number];
export const PLATES: { clouds?: string; street: readonly { src: string; w: number; h: number; boards: readonly (readonly [Pt, Pt, Pt, Pt])[]; night?: boolean }[]; room: { src: string; w: number; h: number; screen: readonly [Pt, Pt, Pt, Pt] } | null } = { street: [], room: null };

/** What the unnamed scaffold plays first. */
export const FLOOR_HERO: string[] = ['macro-type', 'toast-stack', 'porthole-line', 'page-fly', 'photo-river', 'decode-title', 'glass-prompt', 'photo-counters', 'orbit-chips'];
/** The end's scene: the brand's mark as a solid pulling back into the lockup. */
export const HERO_END = 'mark-pullback';
const RECENT_WEIGHT = [0.08, 0.3, 0.55, 0.8];
/** The deal's rules: every change scene from the bank (an update film has no scene of its own), two change scenes shared with the last film at most. */
export const DEAL_RULES = { bankShare: 0.75, ownMax: 1, sharedMax: 2 } as const;
/** The pull of a big scene in the deal, and how many places in the order each of a change's words that ask for a scene is worth. */
const BIG_PULL = 1.8;
const ASK_PULL = 1.5;
/** The scenes each of the last films played, newest first (src/recent.ts hero, from the film history). */
export const HISTORY: readonly (readonly string[])[] = (((RECENT as { hero?: unknown }).hero ?? []) as unknown[]).filter((x): x is string[] => Array.isArray(x));
const recentHero = HISTORY;
/**
 * The change scenes in a film's own order: a weighted shuffle seeded by the name and the films before it (the same name
 * after another film deals anew), big scenes early, the last films' scenes late.
 */
export const heroOrder = (name: string, recent: readonly (readonly string[])[] = []): string[] => {
  const r = rng(hashSeed(`${name.trim().toLowerCase()}#scene#${recent.slice(0, 3).map((f) => f.join('+')).join('|')}`));
  const w = (id: string) => (SCENE_SPEC[id]?.big ? BIG_PULL : 1) * recent.slice(0, RECENT_WEIGHT.length).reduce((a, s, k) => (s.includes(id) ? a * RECENT_WEIGHT[k] : a), 1);
  return PICTURE_HEROES.map((id) => ({ id, k: r() ** (1 / w(id)) })).sort((a, b) => b.k - a.k).map((x) => x.id);
};
/** The deck's scenes (src/dealt.ts hero, then heroReserve), checked against HERO_META. */
const DECK_HERO: string[] | null = (() => {
  const d = DEALT as { hero?: string[]; heroReserve?: string[] } | null;
  if (!d?.hero?.length) return null;
  const all = [...d.hero, ...(d.heroReserve ?? [])].filter((x) => heroMeta(x));
  if (!all.length) return null; // a direction dealt for another template's shots: the name deals
  return [...all.filter((x) => PICTURE_HEROES.includes(x)), ...PICTURE_HEROES.filter((x) => !all.includes(x))];
})();
/** The film's scene order (the deck's, else the name's, else the floor's) and where it came from. */
export const HERO_ORDER: { order: string[]; source: string } = DECK_HERO
  ? { order: DECK_HERO, source: 'deck.py' }
  : UNNAMED
    ? { order: [...FLOOR_HERO], source: 'the floor (unnamed scaffold)' }
    : { order: heroOrder(IDENTITY.name, recentHero), source: `the name "${IDENTITY.name}"` };

/**
 * Each change's scene, in film order: a change that names one keeps it; the changes with the fewest scenes that show
 * them choose first, each the first in the film's order (the ones its words ask for first) that no other change took;
 * then a film with no big scene among its changes gives one change a big scene that can carry it; then where a change's
 * scene takes over an element the scene before can hand on (a send button pressed), the change before takes that scene
 * when it shows it too, so the two join on one element (a match cut, no line card between them).
 */
export const planScenes = (order: readonly string[], changes: readonly Change[], last: readonly string[] = recentHero[0] ?? []): string[] => {
  const out: (string | null)[] = changes.map((c) => {
    if (!c.scene) return null;
    if (!heroMeta(c.scene) || heroMeta(c.scene)!.role !== 'picture') throw new Error(`update.ts: ${c.id} names the scene "${c.scene}"; the change scenes are ${PICTURE_HEROES.join(', ')}`);
    if (sceneFit(c.scene, c) < 1) throw new Error(`update.ts: ${c.id}'s scene "${c.scene}" cannot film a ${c.show.kind} (src/deal.ts sceneFit)`);
    return c.scene;
  });
  const opts = changes.map((c) => {
    const fit = order.filter((id) => sceneFit(id, c) >= 2);
    // the change's words pull a scene ASK_PULL places forward in the dealt order, never past the deal itself
    return fit.slice().sort((a, b) => fit.indexOf(a) - ASK_PULL * asks(a, c) - (fit.indexOf(b) - ASK_PULL * asks(b, c)));
  });
  // two of the last film's change scenes at most (the lockup every update film ends on is not counted): past that, a
  // scene it played only when nothing else films the change
  const shared = () => out.filter((id) => id && last.includes(id)).length;
  const fresh = (id: string) => !out.includes(id) && (shared() < DEAL_RULES.sharedMax || !last.includes(id));
  const turn = changes.map((_, i) => i).filter((i) => !out[i]).sort((a, b) => opts[a].length - opts[b].length || a - b);
  for (const i of turn)
    out[i] =
      opts[i].find(fresh) ?? opts[i].find((id) => !out.includes(id)) ?? order.find((id) => sceneFit(id, changes[i]) >= 1 && fresh(id)) ?? order.find((id) => sceneFit(id, changes[i]) >= 1 && !out.includes(id)) ?? opts[i][0] ?? null;
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) {
      const c = changes[i];
      const hint = c.show.kind === 'tap' ? 'a press opens a picture: give it `picture` (a face, a place, the product\'s shot)' : c.show.kind === 'count' ? 'a count stands on a picture: give it `picture`' : 'see src/deal.ts sceneFit';
      throw new Error(`update.ts: no scene can film ${c.id} (a ${c.show.kind}); ${hint}`);
    }
  }
  if (!out.some((id) => SCENE_SPEC[id as string].big)) {
    for (let i = 0; i < changes.length; i++) {
      if (changes[i].scene) continue;
      const big = order.find((id) => SCENE_SPEC[id].big && sceneFit(id, changes[i]) >= 1 && fresh(id));
      if (big) {
        out[i] = big;
        break;
      }
    }
  }
  for (let i = 0; i + 1 < changes.length; i++) {
    const next = out[i + 1] as string;
    if (changes[i].scene || !SCENE_SPEC[next].carries || joins(out[i] as string, next)) continue;
    const link = opts[i].find((id) => joins(id, next) && fresh(id));
    if (link && (SCENE_SPEC[link].big || !SCENE_SPEC[out[i] as string].big)) out[i] = link;
  }
  return out as string[];
};
/** Each change's scene, in film order. */
export const HEROES: string[] = planScenes(HERO_ORDER.order, UPDATE.changes);
/** Where change i hands its element straight into change i + 1's scene (a match cut: no line card for i + 1). */
export const LINKED: boolean[] = HEROES.map((id, i) => i + 1 < HEROES.length && joins(id, HEROES[i + 1]) && SCENE_SPEC[HEROES[i + 1]].carries);

// ---------------------------------------------------------------------------------------------- the lines
/**
 * The moves a line takes (acts/type.tsx LineText): each sets the line CENTRED and big, and brings it whole or in 2-3
 * chunks, never word by word: `whole` lands the line at once on a focus pull, `chunks` raises its 2-3 phrases out of
 * their masks a few frames apart, `track` lands it whole as its tracking closes. One per film: every line arrives the
 * same way, so the scenes are what change.
 */
export const MOVES = ['whole', 'chunks', 'track'] as const;
export type Move = (typeof MOVES)[number];
/** The phrases a line arrives in on `chunks`: 1 for one word, 2 for 2-4 words, 3 for 5-6. */
export const chunkCount = (n: number): number => (n <= 1 ? 1 : n <= 4 ? 2 : 3);
/** Frames (60 fps) from a move's start until a line of n words is read, at its natural speed (the plan may make it faster, never slower). */
export const RESOLVE60: Record<Move, (n: number) => number> = {
  whole: () => 10,
  chunks: (n) => 10 + 7 * (chunkCount(n) - 1),
  track: () => 14,
};
/** The film's lines: the hook's and one per change. */
export const LINE_IDS = ['change1', 'change2', 'change3', 'change4'] as const;
export const LINES = { voice: (DEAL.voice as Move) ?? 'whole', move: Object.fromEntries(LINE_IDS.map((id) => [id, DEAL.voice as Move])) as Record<string, Move> };
/**
 * The size the change lines are set at (px at 1080): big, a cap of 8.4 % of the frame's height (a statement 11.4 %); a
 * line too wide for 84 % of the frame breaks onto two lines before it would shrink under LINE_MIN.
 */
export const LINE_SIZE = DEAL.set === 'statement' ? 168 : 124;
/** The smallest a line may be set (px at 1080): a cap of 6.5 % of the frame's height. */
export const LINE_MIN = 96;

/** Where the deal came from, for the print. */
export const DEAL_SOURCE = `${SEED !== null ? `SEED ${SEED}` : UNNAMED ? 'the floor (the name slot is still [Product])' : `the name "${IDENTITY.name}"`}${Object.keys(PIN).length ? `, pinned: ${Object.keys(PIN).join(', ')}` : ''}; scenes from ${HERO_ORDER.source}`;
/** The scenes that play, in film order (the changes' and the end's), for the print and the film history. */
export const PLAYED: string[] = [...new Set([...HEROES, HERO_END])];
/**
 * The deal as the checks read it (scripts/grid-check.ts deal-*): each scene in film order with its house scene, whether
 * the deal gave it or the change named it (and why), and the last film's scenes (the lockup every update film ends on
 * is left out of them). Every scene of an update film is a house scene; none plays twice; two at most are the last film's.
 */
export const DEAL_PLAN = {
  template: 'update',
  seed: HERO_ORDER.source,
  scenes: [
    ...HEROES.map((id, i) => ({ name: UPDATE.changes[i].id, bank: id, own: false, line: false, dealt: !UPDATE.changes[i].scene, ...(UPDATE.changes[i].scene ? { why: UPDATE.changes[i].why ?? '' } : {}) })),
    { name: 'lockup', bank: HERO_END, own: false, line: false, dealt: true },
  ],
  last: (recentHero[0] ?? []).filter((id) => id !== HERO_END),
};
