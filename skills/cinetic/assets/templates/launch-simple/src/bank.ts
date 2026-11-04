// The scene bank as this template plays it: each house scene (src/scenes) is one moment of 1.5-3 s that shows a point
// and is understood (a request typed at macro scale, a page that writes itself, a send pressed with a pointer, a stack of
// payments, a title that decodes, a mark born from two blobs ...). A film is 8-12 of them, each point a line on clean
// ground and then its scene, the spine's one element carried from each scene's last form into the next. This file is
// the timeline's side of the bank: what each scene takes and hands on, how long it runs, which verbs ask for it, what it
// needs, the ground it was designed on, and the deal that casts the film's scenes from the bank at random.
// Kept free of React, the brand tokens and the scene modules (the timeline imports it; the scenes import the timeline
// through the tokens): the numbers mirror each scene's meta entry, and acts/bank.tsx checks them against the real metas
// and fits each scene to its slot at draw time, so a scene always plays whole, never cut and never frozen early.
import * as CONTENT_FILE from './content';
import { DEAL_SOURCE } from './deal';
import { DEALT } from './dealt';
import { RECENT } from './recent';
import type { Form } from './lib/spine';
import { stemVerb } from './lib/spine';

/** The value a scene was designed on (its source's ground): the film's palette fills it, adapted to the brand. */
export type Ground = 'light' | 'dark' | 'field';
/**
 * What a scene needs from the film before it can be dealt: pictures of the brief's own subject, official partner marks, a
 * price table, a cut-out product, the product's site (src/content.ts CONTENT.site), street photographs with the corners of
 * their boards or a room photograph with the corners of its screen (src/content.ts SCENE_CONTENT.plates).
 */
export type Need = 'picture' | 'pictures' | 'logos' | 'plans' | 'product' | 'hero' | 'site' | 'street' | 'room';
export type Box = { form: Form; x: number; y: number; w: number; h: number; r?: number };
export type BankEntry = {
  id: string;
  dur: number; // frames at 30 fps with the default content (acts/bank.tsx reads the real length from the scene)
  handIn: Box | null; // the element it takes over on its first frame (null: it opens on its own picture)
  handOut: Box; // the element it hands on at its last frame
  big: boolean; // a big moment (a film plays two at least)
  ground: Ground;
  verbs: readonly string[]; // the verb stems that ask for it ('line': it carries a statement; 'end': it is the lockup)
  needs?: readonly Need[];
  /** a lockup: where its mark lands whole and where its name is read, as shares of its length */
  lock?: number;
  name?: number;
  /** the scene's text read from its props for a length that depends on it (frames at 30 fps) */
  durOf?: (p: Record<string, unknown>) => number;
};

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Every house scene the template deals, by id. Boxes are px of 1920 x 1080 at the scene's first or last frame; the
 * verbs are lib/spine stems (`asks` -> 'ask'). A scene that needs pictures is dealt only when the spine lists them.
 */
export const BANK: Record<string, BankEntry> = {
  'macro-type': {
    id: 'macro-type', dur: 87, big: true, ground: 'light', verbs: ['ask', 'type', 'prompt', 'request', 'tell', 'describe', 'message', 'chat'],
    handIn: { form: 'pill', x: 591, y: 568, w: 1329, h: 194, r: 97 }, handOut: { form: 'button', x: 813, y: 340, w: 386, h: 386, r: 193 },
    // the typing sets it: about 1.05 s for 25-42 characters, at 24 a second under it and 40 over it
    durOf: (p) => {
      const n = str(p.text).length || 31;
      const cps = Math.min(40, Math.max(24, n / 1.05));
      return Math.ceil(58 + (n / cps) * 30);
    },
  },
  'glass-prompt': { id: 'glass-prompt', dur: 56, big: false, ground: 'dark', verbs: ['ask', 'type', 'prompt', 'request', 'tell', 'describe'], handIn: null, handOut: { form: 'pill', x: 457, y: 455, w: 975, h: 182, r: 42 } },
  'iris-input': { id: 'iris-input', dur: 86, big: true, ground: 'dark', verbs: ['ask', 'search', 'find', 'plan'], needs: ['picture'], handIn: null, handOut: { form: 'pill', x: 320, y: 470, w: 1290, h: 144, r: 72 } },
  'page-fly': { id: 'page-fly', dur: 72, big: true, ground: 'dark', verbs: ['write', 'make', 'build', 'create', 'generate', 'draft', 'design', 'turn', 'summarize', 'plan'], handIn: { form: 'page', x: 288, y: 260, w: 1344, h: 1740, r: 14 }, handOut: { form: 'page', x: 288, y: -900, w: 1344, h: 1740, r: 14 } },
  'scan-grid': { id: 'scan-grid', dur: 66, big: false, ground: 'dark', verbs: ['find', 'search', 'scan', 'import', 'collect', 'choose', 'pick'], needs: ['pictures'], handIn: { form: 'pill', x: 264, y: 460, w: 1392, h: 156, r: 78 }, handOut: { form: 'list', x: 588, y: 252, w: 744, h: 540, r: 12 } },
  'decode-title': { id: 'decode-title', dur: 50, big: true, ground: 'dark', verbs: ['send', 'press', 'publish', 'ship', 'launch', 'submit', 'book', 'join', 'tap', 'start', 'line'], handIn: null, handOut: { form: 'button', x: 588, y: 565, w: 744, h: 183 } }, // its words move it: acts/bank.tsx reads decodeTitleOut
  'porthole-line': { id: 'porthole-line', dur: 78, big: true, ground: 'light', verbs: ['send', 'press', 'publish', 'ship', 'submit', 'book', 'meet', 'call', 'line'], needs: ['picture'], handIn: { form: 'button', x: 813, y: 340, w: 386, h: 386, r: 193 }, handOut: { form: 'photo', x: 673, y: 258, w: 574, h: 574, r: 287 } },
  'gloss-orbit': { id: 'gloss-orbit', dur: 54, big: true, ground: 'dark', verbs: ['launch', 'ship', 'press', 'start'], needs: ['hero'], handIn: null, handOut: { form: 'mark', x: 787, y: 337, w: 390, h: 465 } },
  'prism-light': { id: 'prism-light', dur: 84, big: true, ground: 'dark', verbs: ['launch', 'ship', 'start', 'open', 'turn'], handIn: { form: 'button', x: 884, y: 464, w: 152, h: 152, r: 76 }, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 } },
  'toast-stack': { id: 'toast-stack', dur: 48, big: false, ground: 'field', verbs: ['fill', 'arrive', 'notify', 'collect', 'land', 'report', 'pay', 'get', 'earn', 'sell', 'grow', 'count', 'tell'], handIn: null, handOut: { form: 'notice', x: 272, y: 110, w: 1376, h: 215, r: 72 } },
  'key-glow': { id: 'key-glow', dur: 72, big: true, ground: 'dark', verbs: ['connect', 'work', 'run', 'automate', 'do', 'handle', 'fill'], handIn: null, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 } },
  'word-cards': { id: 'word-cards', dur: 64, big: true, ground: 'dark', verbs: ['sell', 'price', 'choose', 'pick', 'start', 'count'], needs: ['plans'], handIn: null, handOut: { form: 'card', x: 737, y: 322, w: 444, h: 601, r: 32 } },
  'photo-counters': { id: 'photo-counters', dur: 52, big: false, ground: 'light', verbs: ['count', 'grow', 'measure', 'track', 'earn', 'save'], needs: ['picture'], handIn: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 }, handOut: { form: 'count', x: 550, y: 260, w: 820, h: 560 } },
  'photo-river': { id: 'photo-river', dur: 81, big: true, ground: 'light', verbs: ['show', 'see', 'shoot', 'picture', 'view', 'preview', 'browse', 'find'], needs: ['pictures'], handIn: { form: 'photo', x: 625, y: 90, w: 670, h: 900 }, handOut: { form: 'photo', x: 744, y: 250, w: 432, h: 579 } },
  'held-product-word': { id: 'held-product-word', dur: 64, big: true, ground: 'light', verbs: ['show', 'carry', 'hold', 'wear', 'use'], needs: ['product', 'pictures'], handIn: { form: 'photo', x: 790, y: 200, w: 340, h: 680 }, handOut: { form: 'photo', x: 770, y: 160, w: 380, h: 760 } },
  'ring-dive': { id: 'ring-dive', dur: 78, big: true, ground: 'light', verbs: ['show', 'browse', 'find', 'choose', 'collect'], needs: ['pictures'], handIn: null, handOut: { form: 'word', x: 820, y: 503, w: 280, h: 74 } },
  'orbit-chips': { id: 'orbit-chips', dur: 60, big: false, ground: 'light', verbs: ['connect', 'integrate', 'sync', 'link', 'import', 'work'], needs: ['logos'], handIn: { form: 'word', x: 516, y: 497, w: 888, h: 86 }, handOut: { form: 'card', x: 560, y: 200, w: 800, h: 680, r: 64 } },
  'type-flip': { id: 'type-flip', dur: 56, big: true, ground: 'light', verbs: ['line', 'claim', 'start'], handIn: null, handOut: { form: 'word', x: 110, y: 70, w: 1700, h: 910 } },
  // the newer scenes: each one point of the body, filled from the line, the pictures and src/content.ts (acts/bank.tsx fillOf)
  'cloud-dome': { id: 'cloud-dome', dur: 84, big: true, ground: 'light', verbs: ['line', 'connect', 'integrate', 'sync', 'work', 'run', 'automate', 'launch', 'open'], handIn: { form: 'word', x: 330, y: 430, w: 1260, h: 202 }, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 } },
  'photo-orbit': { id: 'photo-orbit', dur: 69, big: true, ground: 'dark', verbs: ['line', 'show', 'see', 'shoot', 'picture', 'browse', 'collect', 'share'], needs: ['pictures'], handIn: null, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 } },
  'card-rivers': { id: 'card-rivers', dur: 87, big: true, ground: 'light', verbs: ['show', 'browse', 'find', 'collect', 'sort', 'organize', 'search', 'save', 'curate'], needs: ['pictures'], handIn: null, handOut: { form: 'word', x: 836, y: 516, w: 249, h: 50 } },
  'site-flip': { id: 'site-flip', dur: 62, big: true, ground: 'dark', verbs: ['build', 'make', 'design', 'publish', 'launch', 'create', 'generate', 'ship', 'write'], needs: ['site'], handIn: null, handOut: { form: 'page', x: -114, y: 79, w: 1346, h: 980 } },
  'ribbon-ring': { id: 'ribbon-ring', dur: 56, big: false, ground: 'light', verbs: ['line', 'claim', 'say', 'tell', 'write', 'promise'], handIn: null, handOut: { form: 'word', x: 683, y: 504, w: 553, h: 72 } },
  'phone-pullback': { id: 'phone-pullback', dur: 84, big: true, ground: 'light', verbs: ['tap', 'open', 'add', 'create', 'start', 'use', 'book', 'plan', 'post'], handIn: { form: 'mark', x: 534, y: 469, w: 173, h: 118 }, handOut: { form: 'card', x: 649, y: 491, w: 575, h: 222, r: 24 } },
  'street-poster': {
    id: 'street-poster', dur: 60, big: true, ground: 'dark', verbs: ['publish', 'launch', 'ship', 'share', 'show', 'print', 'promote', 'sell', 'advertise', 'reach'], needs: ['picture', 'street'], handIn: null, handOut: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 },
    // 18 f a plate, the last 24, never under 45 f (scenes/street-poster streetPosterDur)
    durOf: (p) => Math.max(45, 18 * (Math.max(1, Array.isArray(p.plates) && p.plates.length ? p.plates.length : 3) - 1) + 24),
  },
  'room-push': { id: 'room-push', dur: 66, big: true, ground: 'light', verbs: ['show', 'open', 'see', 'use', 'work', 'view', 'present', 'meet', 'run'], needs: ['picture', 'room'], handIn: null, handOut: { form: 'window', x: 0, y: 0, w: 1920, h: 1080 } },
  'crystal-hall': { id: 'crystal-hall', dur: 78, big: true, ground: 'dark', verbs: ['launch', 'start', 'ship', 'turn', 'open', 'make', 'unlock'], handIn: null, handOut: { form: 'mark', x: 765, y: 338, w: 390, h: 524 } },
  'object-window': { id: 'object-window', dur: 84, big: true, ground: 'dark', verbs: ['choose', 'pick', 'mark', 'select', 'edit', 'design', 'make', 'save', 'place'], handIn: { form: 'window', x: 440, y: 311, w: 1031, h: 687, r: 82 }, handOut: { form: 'window', x: 270, y: 82, w: 1390, h: 926, r: 110 } },
  'blobs-to-mark': { id: 'blobs-to-mark', dur: 74, big: true, ground: 'light', verbs: ['end'], lock: 0.49, name: 0.74, handIn: null, handOut: { form: 'mark', x: 596, y: 431, w: 728, h: 217 } },
  'line-to-wordmark': {
    id: 'line-to-wordmark', dur: 76, big: false, ground: 'light', verbs: ['end'], lock: 0.53, name: 0.58, handIn: null, handOut: { form: 'mark', x: 660, y: 474, w: 600, h: 138 },
    durOf: (p) => 1 + (Math.max(1, words(str(p.line, 'What if your team'))) - 1) * 9 + 10 + 2 + (p.tag ? 36 : 24),
  },
  'word-build-badge': {
    id: 'word-build-badge', dur: 82, big: false, ground: 'light', verbs: ['end'], lock: 0.61, name: 0.7, handIn: { form: 'word', x: 800, y: 471, w: 320, h: 151 }, handOut: { form: 'mark', x: 630, y: 450, w: 660, h: 163 },
    durOf: (p) => (words(str(p.line)) ? 82 + (words(str(p.line)) - 3) * 12 : 45),
  },
  'bar-flood': { id: 'bar-flood', dur: 54, big: true, ground: 'dark', verbs: ['end'], lock: 0.6, name: 0.64, handIn: { form: 'card', x: 540, y: 305, w: 840, h: 470, r: 18 }, handOut: { form: 'mark', x: 637, y: 355, w: 653, h: 369 } },
};

/** A scene's length in frames at 30 fps for the props it plays (the default content's when it has no text rule). */
export const durOf = (id: string, props: Record<string, unknown> = {}) => {
  const e = BANK[id];
  if (!e) throw new Error(`bank: no house scene "${id}" (src/bank.ts BANK: ${Object.keys(BANK).join(', ')})`);
  return Math.max(30, e.durOf ? e.durOf(props) : e.dur);
};
/** True when a box shows enough of itself on screen to hand an element over (a page rising in from below does not). */
export const onScreen = (b: Box | null, W = 1920, H = 1080) => {
  if (!b) return false;
  const vis = Math.max(0, Math.min(b.x + b.w, W) - Math.max(b.x, 0)) * Math.max(0, Math.min(b.y + b.h, H) - Math.max(b.y, 0));
  return vis >= 0.3 * b.w * b.h && vis > 0.01 * W * H;
};

// ---------------------------------------------------------------------------------------------------- the deal

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
/**
 * What the film's content gives beyond the spine's pictures and props (src/timeline.ts HAVE): the product's site
 * (CONTENT.site), the street photographs with their boards' corners and the room photograph with its screen's corners
 * (SCENE_CONTENT.plates: scripts/assets.mjs at film time). A brief without them never deals the scenes that stand on them.
 */
export const CONTENT_HAVE: readonly Need[] = (() => {
  const f = CONTENT_FILE as unknown as { CONTENT?: { site?: unknown }; SCENE_CONTENT?: { plates?: { street?: readonly unknown[]; room?: unknown } } };
  const plates = f.SCENE_CONTENT?.plates;
  const out: Need[] = [];
  if (f.CONTENT?.site) out.push('site');
  if (Array.isArray(plates?.street) && plates.street.length) out.push('street');
  if (plates?.room) out.push('room');
  return out;
})();
/** The deal's rules: most of a film's scenes from the bank, one of its own at most, two shared with the last film at most. */
export const DEAL_RULES = { bankShare: 0.75, ownMax: 1, sharedMax: 2, ownSeconds: [1.5, 3] } as const;
/**
 * The house scenes each of the last films played, newest first (new-film.sh writes RECENT.hero from the film history,
 * where film-diff.mjs --record keeps each film's PLAYED; an older RECENT.scenes counts as one film). Empty: a first film.
 */
export const HISTORY: readonly (readonly string[])[] = (() => {
  const r = RECENT as { hero?: unknown; scenes?: unknown };
  const films = (Array.isArray(r.hero) ? r.hero : []).filter((x): x is string[] => Array.isArray(x)).map((f) => f.filter((x) => typeof x === 'string'));
  return films.length ? films : Array.isArray(r.scenes) && r.scenes.length ? [r.scenes.filter((x): x is string => typeof x === 'string')] : [];
})();
/** The seed the film's look starts from: the deck's direction when one is dealt, else the product's name. */
export const SCENE_SEED = DEALT ? `direction:${DEALT.direction}` : DEAL_SOURCE;
/** The seed the scene deal draws from: SCENE_SEED with the films before this one (the same name after another film deals anew). */
export const DEAL_SEED = `${SCENE_SEED}#${HISTORY.slice(0, 3).map((f) => f.join('+')).join('|')}`;
/** What the unnamed scaffold plays, slot by slot (a named film is dealt). */
export const FLOOR_CAST = ['macro-type', 'page-fly', 'decode-title', 'toast-stack', 'blobs-to-mark'] as const;
/** How a scene's weight falls when one of the last films played it (the last film first). */
const RECENT_WEIGHT = [0.08, 0.3, 0.55, 0.8];
/** The pull of a scene whose verbs hold the act's verb, of one that hands on the spine's form, of a big one. */
const PULL = { verb: 3, form: 1.5, big: 1.8 } as const;

export type DealAsk = { act: number; k: number; verb: string; form?: Form; last: boolean; line?: boolean; have: readonly Need[]; used: readonly string[]; seed?: string; history?: readonly (readonly string[])[]; floor?: string };
/** A scene's weight in an act's deal: its verb, its form, its size, and how lately the last films played it. */
export const dealWeight = (e: BankEntry, stem: string, form: Form | undefined, history: readonly (readonly string[])[] = HISTORY) =>
  (e.verbs.some((v) => v === stem || stem.startsWith(v)) ? PULL.verb : 1) *
  (form && e.handOut.form === form ? PULL.form : 1) *
  (e.big ? PULL.big : 1) *
  history.slice(0, RECENT_WEIGHT.length).reduce((a, f, j) => (f.includes(e.id) ? a * RECENT_WEIGHT[j] : a), 1);
/**
 * The house scene a slot is dealt: a seeded weighted draw (DEAL_SEED: the film's name or direction and the films before
 * it) over every scene the film can show (the lockup from the 'end' scenes; a scene that carries the act's line from the
 * 'line' scenes), weighted toward the act's verb, toward big scenes and away from the last films' scenes; never one this
 * film already plays, and none of the last film's once the film shares DEAL_RULES.sharedMax with it. The same seed and
 * the same spine deal the same scenes; another product, another direction or another history deals others.
 */
export const dealScene = (q: DealAsk): string => {
  const history = q.history ?? HISTORY;
  const stem = q.last ? 'end' : q.line ? 'line' : stemVerb(q.verb);
  const have = [...q.have, ...CONTENT_HAVE];
  const fits = (e: BankEntry) => (e.needs ?? []).every((n) => have.includes(n));
  const all = Object.values(BANK).filter((e) => fits(e) && (q.last ? e.verbs.includes('end') : !e.verbs.includes('end')));
  const lines = q.line && !q.last ? all.filter((e) => e.verbs.includes('line')) : all;
  const pool0 = lines.length ? lines : all;
  const free = pool0.filter((e) => !q.used.includes(e.id));
  const last = history[0] ?? [];
  const shared = q.used.filter((id) => last.includes(id)).length;
  const fresh = shared >= DEAL_RULES.sharedMax ? free.filter((e) => !last.includes(e.id)) : free;
  const pool = fresh.length ? fresh : free.length ? free : pool0;
  if (q.floor && pool.some((e) => e.id === q.floor)) return q.floor;
  const seed = q.seed ?? DEAL_SEED;
  let best = pool[0];
  let top = -Infinity;
  for (const e of pool) {
    // the weighted draw (log u / w, the largest wins): a scene of twice the weight wins about twice as often
    const u = (hash(`${seed}:${q.act}:${q.k}:${e.id}`) + 0.5) / 4294967296;
    const key = Math.log(u) / dealWeight(e, stem, q.form, history);
    if (key > top) [top, best] = [key, e];
  }
  return best.id;
};
