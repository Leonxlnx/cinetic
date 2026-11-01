// The single source of truth for time, for a simple launch: lines that meet their pictures (alone, with or over
// them), every change of picture carried, then the lockup. The script lives in src/launch.ts, the choices in src/deal.ts; everything below is
// derived from them and from the music, so a new script, a new track or a new tempo needs no edit here. Picture
// (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. Think in beats,
// never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { LAUNCH } from './launch';
import { CREATIVE, DEAL, HERO_DEAL, HERO_N, heroMeta, type HeroMeta, type HeroRole } from './deal';
import { type CreativeMeta, lineResolve, metaOf } from './fx/creative/meta';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/** The film-time music grid (src/music.ts): null until track.py grid writes the track's; then b() follows its bars. */
export { MUSIC } from './music';
export { CREATIVE, DEAL, HERO_DEAL } from './deal';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites the
 * `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** One line at a time, said and gone: the crisp word tempo. */
export const PACE_NAME: PaceName = 'crisp';
const pace = PACE[PACE_NAME];

/** Frames per beat (a whole number without a track: 60 fps -> 90, 100, 120, 144, 150 BPM). */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/** Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat. */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
/** A choreography length written in 60 fps frames, converted to this film's fps (rounded). */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
/** The fractional twin of f60, for durations inside a move. */
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;
/** Absolute frame `x` beats from the film's first downbeat, on the 16th grid (x in quarter beats). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  const n = Math.floor(q / 4);
  return b(1 + Math.floor(n / 4), n % 4, q % 4);
};

/**
 * After the last bar the picture holds while the music ends, never on a cut: at least 1 s, or the ending's own hold
 * (track.py grid writes it); a grid that only names a stop's element (end.f) holds that element and 1 s after it.
 */
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, MUSIC && MUSIC.end.hold === undefined ? Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1) + FPS : 0); // whole frames as the body ends (b rounds)

// ---- The text voice (deal.ts voice): when a line of n words is whole, in 60 fps frames from its first frame.
/** The voice's house numbers (f@60): word fade, stagger, re-centre (a glide); the blur-in; the ink-in. */
export const VOICE = {
  build: { fade: 20, stagger: 6, recentre: 24 },
  blur: { dur: 34, blur: 12, from: 1.04 },
  ink: { stagger: 6, ink: 10, fade: 8 },
} as const;
/**
 * Headline systems rotate: the dealt voice is the first line's, and each line after it takes the next voice in turn
 * (build -> blur -> ink -> build), so no two lines in a row arrive the same way; the face stays the film's one pairing.
 * The same entry on every line, one size and one highlighted last word, is the template look the user named.
 */
export type Voice = 'build' | 'blur' | 'ink';
const VOICES: Voice[] = ['build', 'blur', 'ink'];
/** The voice of pair i's line (0-based pair index; pairs without a line are skipped in the turn). */
export const voiceOf = (i: number): Voice => {
  const nth = LAUNCH.pairs.slice(0, i).filter((p) => !!p.line?.trim()).length;
  const v0 = Math.max(0, VOICES.indexOf(DEAL.voice as Voice));
  return VOICES[(v0 + nth) % VOICES.length];
};
export const resolveOf = (n: number, voice: Voice = DEAL.voice as Voice): number =>
  voice === 'build' ? VOICE.build.stagger * (n - 1) + Math.max(VOICE.build.fade, VOICE.build.recentre) : voice === 'blur' ? VOICE.blur.dur : VOICE.ink.stagger * (n - 1) + VOICE.ink.ink;
/**
 * The hero line (the claim, the film's last line) takes the film's one contrasting entry: its words arrive in the voice,
 * centred on their own; the words glide over to open its room (`recentre` f@60, ending on the snap), then after a
 * `pause` its last word snaps into the open slot from its left edge, one frame at `from` x its size, settling in
 * `settle` (f@60). From its left edge, at x1.6, into a slot already open, the snapping word never covers the word
 * before it nor leaves the frame on its big frame.
 */
export const HERO = { pause: 8, settle: 7, from: 1.6, recentre: 12 } as const;
/** When the hero line's last word snaps in, f@60 from the line's first frame (n words). */
export const heroSnapAt = (n: number, voice: Voice = voiceOf(LAUNCH.pairs.length - 1)): number =>
  (voice === 'blur' ? Math.round(VOICE.blur.dur * 0.6) : (voice === 'build' ? VOICE.build.stagger : VOICE.ink.stagger) * Math.max(0, n - 1)) + HERO.pause;
/** When a line of n words is whole, f@60 from its first frame: the hero line once its last word has settled. */
export const resolveLine = (n: number, hero: boolean, voice?: Voice): number => (hero ? Math.max(n > 1 ? resolveOf(n - 1, voice) : 0, heroSnapAt(n, voice) + HERO.settle) : resolveOf(n, voice));

/** The script's words on screen: the stars that mark a key word are not drawn. */
export const plain = (s: string) => s.replace(/\*/g, '');
/** The words of a line and which of them are the key (marked *like this* in launch.ts). */
export const keyWords = (s: string): { word: string; key: boolean }[] => {
  const out: { word: string; key: boolean }[] = [];
  let on = false;
  for (const w of s.split(/\s+/).filter(Boolean)) {
    const opens = w.startsWith('*');
    if (opens) on = true;
    out.push({ word: w.replace(/\*/g, ''), key: on });
    if (w.replace(/[.,!?;:]+$/, '').endsWith('*')) on = false;
  }
  return out;
};

// ---- The beat plan. Never a slideshow: a line meets its picture one of three ways (launch.ts `beat`):
//   alone  T then A: the line alone on the ground (it builds over the last picture as that one leaves, so the frame is
//          never empty), then its picture
//   with   TA then A: the line arrives with its picture's first motion, in front of it (the picture behind, soft and
//          low), and leaves as the picture racks into focus and plays on alone: one shot, no cut
//   over   TA: the line holds over its whole picture, the picture composed round the line's band (logos round a line,
//          footage under it)
// Unset: the first line and the claim (the last line) stand alone, the lines between arrive with their pictures, so the
// beats mix about T 20-33 % / T+A 17-30 % / A 50 % (one `over` brings A to about 37 %). Each beat sits on the track's
// 8ths; the pairs together end on a bar line, then the end in whole bars, then the tail. Two acts: the pairs and the end
// (an act line re-draws the whole frame, so it never falls on a seam's cut).
const SEC = (s: number) => s * FPS;
const LINE = { min: 0.5, max: 2.4 } as const; // a line beat holds 0.5-2.4 s (house: about 1.3)
const PIC = { min: 1, max: 3.5, house: [2.6, 1.6, 2.2, 3.0] } as const; // a picture beat runs 1-3.5 s; unset, they vary (a long one beside a short one)
const SEAM_OUT = 24; // f@60 the outgoing line needs inside its beat for the seam (the longest line exit, the velocity cut's whip)
/** f@60: a line over a picture leaves on its own (it lifts and softens away) while the picture racks into focus. */
export const LINE_EXIT = 16;
/** f@60 a line after a hero shot waits for the shot to fall back and go soft before its first word. */
export const HERO_LATE = 10;
const LEAD = 0; // f@60 between a line's beat and its first word: the seam brings the line in, its first word on the cue
/** f@60 a line held over its whole picture (over) is gone before the picture's seam out begins. */
const OVER_TAIL = 6;
/**
 * The opening on a photographic world (src/world.tsx): the place is seen sharp for its first `at` f@60, then the lens
 * racks to the type over `rack` f@60 and the place stays soft behind. The first line waits for `read` of the rack, so
 * its first words never build over the sharp, bright picture (white words over a sharp city's lights).
 */
export const OPEN_RACK = { at: 10, rack: 22, read: 0.7 } as const;
const PLATE_KINDS = new Set(['clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro']);
/** f@60 from the first frame to the first line's first word: after the opening rack on a photographic world. */
export const FIRST_WORD = PLATE_KINDS.has(DEAL.ground) ? Math.round(OPEN_RACK.at + OPEN_RACK.rack * OPEN_RACK.read) : 0;

export type BeatKind = 'T' | 'TA' | 'A' | 'end';
/** `meets`: a line beat whose line joins its picture on its own (a type device opening into it, a porthole parting it). */
export type BeatPlan = { id: string; kind: BeatKind; from: number; to: number; pair: number; meets?: true };
export type Mode = 'alone' | 'with' | 'over' | 'none';

const P = LAUNCH.pairs;
if (P.length < 2 || P.length > 7) throw new Error(`timeline: launch.ts has ${P.length} pairs; a simple launch has 2-7 (3-5 is typical)`);
/** Whether pair i has a line: a picture-only pair (no `line`) plays its picture on from the last one, no words. */
export const hasLine = (i: number) => !!P[i]?.line?.trim();
// the first line says what the product is and the claim closes: those two always have their words
if (!hasLine(0) || !hasLine(P.length - 1)) throw new Error('timeline: the first pair and the last (the claim) need a line; a pair between may leave its line out (a picture-only beat)');
// fewer words than pictures: at most two lines before the claim, the pictures between carry the rest
const LINES_MAX = 4;
if (P.filter((_, i) => hasLine(i)).length > LINES_MAX) throw new Error(`timeline: ${P.filter((_, i) => hasLine(i)).length} lines; a launch says at most ${LINES_MAX} (the first, the claim and two between): leave the line out of a pair whose picture says it (launch.ts: a pair with no line plays its picture alone)`);
// a key word on at most two lines, about 40 % of them (one of two or three lines, two of four): the accent ink is the
// emphasis; one word in the accent on line after line is a template's tic, not emphasis
const LINES = P.filter((_, i) => hasLine(i)).length;
export const KEYED_MAX = Math.max(1, Math.min(2, Math.round(0.4 * LINES)));
const keyed = P.filter((p) => /\*/.test(p.line ?? '')).length;
if (keyed > KEYED_MAX) throw new Error(`timeline: ${keyed} of ${LINES} lines mark a key word; at most ${KEYED_MAX} in a film of ${LINES} lines (launch.ts: keep the stars on the line whose word matters most, drop the others)`);
// ---- The creative plan. The film's creative elements (deal.ts CREATIVE: dealt at random from fx/creative) each take a
// whole beat, so the film is never "a line, then a card": a line device draws a line's beat (never the claim's: the claim
// keeps its hero entry and its colour field), a picture device draws a picture's beat with the product's scene inside.
// Each goes where it says the most (its `prefer`), on a pair whose script gives it what it needs (alts, logos, count,
// before), never a picture device on the last pair unless it ends on the product at rest (the end card is built from
// that picture's hero), never a picture device after a line device that hands over (its last frame is that picture's
// first). At least half the body's beats are creative scenes: a long film draws more from the deal's reserve. A pair's
// `creative` pins a device by hand.
/** A line device's beat may run longer than a plain line's (it carries its own picture in): at most this, s. */
export const LINE_DEVICE_MAX = 3.4;
/** The share of the body's beats that must be creative scenes. */
export const CREATIVE_MIN = 0.5;
export type CreativeSlot = { pair: number; id: string; role: 'line' | 'picture' };
const LAST = P.length - 1;
const needsMet = (i: number, m: CreativeMeta) =>
  m.needs.every((n) => (n === 'swap' ? (P[i].alts?.length ?? 0) >= 1 : n === 'logos' ? (P[i].logos?.length ?? 0) >= 3 : n === 'count' ? !!P[i].count : n === 'before' ? (P[i].before?.length ?? 0) >= 2 : n === 'photos' ? (P[i].photos?.length ?? 0) >= 5 : true));
// ---- The hero plan. The film's hero shots (deal.ts HERO_DEAL, src/hero) carry its production value, so a deck deal and the
// scaffold place them first: each on the beat its role says (a picture beat, a line held over its own picture, a line, or
// the end card), where it says the most (`prefer`), then the creative elements take the beats left (a dealt creative
// element with no beat left is benched, not lost: the next film may play it). A hero picture plays alone (its line,
// then the shot) and never the last picture unless the end card is a hero shot too (the end card is built from the last
// picture's element); a line shot never takes the claim; a line held over its picture leaves the film at least two
// type-only beats. Fewer than HERO_N placed: the reserve fills in. A name deal (no deck) fills the beats the creative
// elements leave. A pair's `hero` pins one.
export type HeroSlot = { pair: number; id: string; role: HeroRole };
type Taken = { line: Set<number>; pic: Set<number> };
const planHeroes = (taken: Taken): { slots: HeroSlot[]; end: string | null; benched: string[] } => {
  const pic = new Map<number, HeroMeta>();
  const over = new Map<number, HeroMeta>();
  const line = new Map<number, HeroMeta>();
  let end: string | null = null;
  const slots: HeroSlot[] = [];
  const free = (i: number, what: 'line' | 'pic') => !taken[what].has(i) && !over.has(i) && !(what === 'pic' ? pic : line).has(i);
  // the type-only beats left once pair j is held over its picture: pairs alone by default or by a shot (never fewer later)
  const typeOnly = (j: number) =>
    P.filter((p, i) => hasLine(i) && i !== j && !over.has(i) && (p.beat === 'alone' || (p.beat === undefined && (i === 0 || i === LAST || line.has(i) || taken.line.has(i) || taken.pic.has(i))))).length;
  const ok: Record<HeroRole, (i: number) => boolean> = {
    picture: (i) => free(i, 'pic') && P[i].beat !== 'over' && (i !== LAST || !!end),
    over: (i) => hasLine(i) && free(i, 'pic') && free(i, 'line') && (P[i].beat === undefined || P[i].beat === 'over') && (i !== LAST || !!end) && typeOnly(i) >= 2,
    line: (i) => hasLine(i) && i !== LAST && free(i, 'line') && (P[i].beat === undefined || P[i].beat === 'alone'),
    end: () => !end,
  };
  const mid = LAST / 2;
  const orderOf = (m: HeroMeta): number[] => {
    const all = P.map((_, i) => i);
    if (m.prefer === 'first') return all;
    if (m.prefer === 'proof') return [...all].reverse();
    return [...all].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
  };
  const place = (id: string, at?: number) => {
    const m = heroMeta(id);
    if (!m) throw new Error(`timeline: "${id}" is not a hero shot (deal.ts HERO_META lists them)`);
    if (slots.some((x) => x.id === id) || end === id) return false;
    if (m.role === 'end') {
      if (!ok.end(0)) return false;
      end = id;
      return true;
    }
    const i = (at !== undefined ? [at] : orderOf(m)).find((x) => ok[m.role](x));
    if (i === undefined) {
      if (at !== undefined) throw new Error(`timeline: pair ${at + 1} pins the hero shot ${id}, which cannot play there (a picture shot plays alone and never the last picture unless the end card is a hero shot; a shot over its line needs a line and two type-only beats left; a line shot never takes the claim)`);
      return false;
    }
    (m.role === 'picture' ? pic : m.role === 'over' ? over : line).set(i, m);
    slots.push({ pair: i + 1, id, role: m.role });
    return true;
  };
  // the end card first (a hero end frees the last picture for a shot), then the pins, then the deal by role (pictures and
  // lines before the shots that hold a line over their picture: those need two type-only beats left), the reserve last
  const rank: Record<HeroRole, number> = { end: 0, picture: 1, line: 2, over: 3 };
  for (const id of HERO_DEAL.deal) if (heroMeta(id)?.role === 'end') place(id);
  P.map((p, i) => ({ id: p.hero, i })).filter((x): x is { id: string; i: number } => !!x.id).sort((a, b) => rank[heroMeta(a.id)?.role ?? 'picture'] - rank[heroMeta(b.id)?.role ?? 'picture']).forEach((x) => place(x.id, x.i));
  const benched: string[] = [];
  const byRole = [...HERO_DEAL.deal].sort((a, b) => rank[heroMeta(a)?.role ?? 'picture'] - rank[heroMeta(b)?.role ?? 'picture']);
  for (const id of byRole) if (heroMeta(id)?.role !== 'end' && !place(id) && !slots.some((x) => x.id === id)) benched.push(id);
  for (const id of HERO_DEAL.reserve) {
    if (slots.length + (end ? 1 : 0) >= HERO_N) break;
    if (heroMeta(id)?.needs.length) continue;
    if (slots.some((x) => heroMeta(x.id)?.family === heroMeta(id)?.family)) continue;
    place(id);
  }
  slots.sort((a, b) => a.pair - b.pair || (a.role === 'line' ? -1 : 1));
  return { slots, end, benched };
};
const takenBy = (slots: readonly { pair: number; role: string }[]): Taken => ({
  line: new Set(slots.filter((x) => x.role === 'line' || x.role === 'over').map((x) => x.pair - 1)),
  pic: new Set(slots.filter((x) => x.role === 'picture' || x.role === 'over').map((x) => x.pair - 1)),
});
/** The creative elements on the beats `taken` leaves, `extra` beats already counting as creative (the hero shots'). */
const planCreative = (taken: Taken, extra: number): CreativeSlot[] & { benched: string[] } => {
  const plan: CreativeSlot[] = [];
  const line = new Map<number, CreativeMeta>();
  const pic = new Map<number, CreativeMeta>();
  const benched: string[] = [];
  const lineOk = (i: number, m: CreativeMeta) => hasLine(i) && i !== LAST && !line.has(i) && !taken.line.has(i) && P[i].beat !== 'over' && P[i].beat !== 'with' && !(m.handover && (pic.has(i) || taken.pic.has(i)));
  const picOk = (i: number, m: CreativeMeta) => !pic.has(i) && !taken.pic.has(i) && P[i].beat !== 'over' && !(i === LAST && m.ends !== 'scene') && !line.get(i)?.handover;
  // one line meets its picture (grid-check's text-then-cards loop): unless the script sets a with or over beat, a hero
  // shot holds a line over its picture or parts it, or a device that opens the line into its picture is placed, the last
  // middle pair that could play its line with its picture keeps it free of a device that would leave the line alone (a
  // line device that keeps its own beat, a picture device); a dealt device that loses its beat to it is benched, not lost
  const joins = () => P.some((p, i) => hasLine(i) && (p.beat === 'with' || p.beat === 'over')) || taken.line.size > 0 || [...line.values()].some((m) => m.handover);
  const free = (i: number) => i > 0 && i < LAST && hasLine(i) && P[i].beat === undefined && !line.has(i) && !pic.has(i) && !taken.line.has(i);
  const keepsJoin = (i: number, m: CreativeMeta) => (m.role === 'line' && !!m.handover) || joins() || !free(i) || P.some((_, j) => j !== i && free(j));
  const mid = (LAST) / 2;
  const orderOf = (m: CreativeMeta): number[] => {
    const all = P.map((_, i) => i);
    if (m.role === 'line') {
      const mids = all.filter((i) => i > 0 && i < LAST);
      return m.prefer === 'middle' ? [...mids, 0] : [0, ...mids];
    }
    if (m.prefer === 'first') return all;
    if (m.prefer === 'proof') return [...all].reverse();
    if (m.prefer === 'middle') return [...all].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    return [1, 0, ...all.slice(2)].filter((i) => i < P.length);
  };
  const place = (id: string, at?: number) => {
    const m = metaOf(id);
    if (!m) throw new Error(`timeline: "${id}" is not a creative element (fx/creative/meta.ts lists them)`);
    const ok = m.role === 'line' ? lineOk : picOk;
    // the pairs it may take, those whose script already gives it what it needs first
    const cands = (at !== undefined ? [at] : orderOf(m)).filter((i) => ok(i, m));
    const kept = at !== undefined ? cands : cands.filter((x) => keepsJoin(x, m));
    const i = [...kept.filter((x) => needsMet(x, m)), ...kept.filter((x) => !needsMet(x, m))][0];
    if (i === undefined) {
      if (at !== undefined) throw new Error(`timeline: pair ${at + 1} pins ${id}, which cannot play there (a line device takes a line that is not the claim, alone; a picture device never sits under an over line, after a line device that hands over, on a hero shot's beat, or on the last pair unless it ends on the product)`);
      if (cands.length) benched.push(id);
      return false;
    }
    (m.role === 'line' ? line : pic).set(i, m);
    plan.push({ pair: i + 1, id, role: m.role });
    return true;
  };
  P.forEach((p, i) => p.creative && place(p.creative, i));
  for (const id of CREATIVE.deal) if (!plan.some((c) => c.id === id)) place(id);
  // at least half the body's beats creative (a hero shot counts): a pair with a line plays two beats (one when it is
  // held over its picture), a pair with no line one; each device makes one of them creative
  const beats = P.reduce((n, p, i) => n + (!hasLine(i) || p.beat === 'over' ? 1 : 2), 0);
  for (const id of CREATIVE.reserve) {
    if (plan.length + extra >= Math.ceil(CREATIVE_MIN * beats)) break;
    const m = metaOf(id);
    if (!m || plan.some((c) => metaOf(c.id)?.family === m.family) || m.needs.length) continue;
    place(id);
  }
  return Object.assign(plan.sort((a, b) => a.pair - b.pair || (a.role === 'line' ? -1 : 1)), { benched });
};
const NONE: Taken = { line: new Set(), pic: new Set() };
const HEROES_FIRST = HERO_DEAL.first ? planHeroes(NONE) : null;
const PLANNED = HEROES_FIRST ? planCreative(takenBy(HEROES_FIRST.slots), HEROES_FIRST.slots.length) : planCreative(NONE, 0);
/** The creative elements on the film's pairs, and what each draws. */
export const CREATIVE_PLAN: CreativeSlot[] = [...PLANNED];
const HEROES = HEROES_FIRST ?? planHeroes(takenBy(CREATIVE_PLAN));
/** The hero shots on the film's pairs (role: what each draws). */
export const HERO_PLAN: HeroSlot[] = HEROES.slots;
/** The end card's hero shot, if any (the lockup arrives through it). */
export const HERO_END: string | null = HEROES.end;
/** Dealt hero shots that found no beat (a short film): the plan print names them. */
export const HERO_BENCHED: string[] = HEROES.benched;
/** Dealt creative elements a hero shot took the beat of (they would have played without it), or that left the one line
 * meeting its picture its beat: benched, not a fault. */
export const CREATIVE_BENCHED: string[] = [...new Set([
  ...(HEROES_FIRST && HERO_PLAN.length ? planCreative(NONE, 0).map((c) => c.id) : []),
  ...PLANNED.benched,
])].filter((id) => CREATIVE.deal.includes(id as never) && !CREATIVE_PLAN.some((c) => c.id === id));
const heroAt = (role: HeroRole) => P.map((_, i) => heroMeta(HERO_PLAN.find((h) => h.pair === i + 1 && h.role === role)?.id ?? ''));
/** The hero shot on pair i's picture (0-based), on its line held over its picture, on its line, if any. */
export const HERO_PIC: (HeroMeta | undefined)[] = heroAt('picture');
export const HERO_OVER: (HeroMeta | undefined)[] = heroAt('over');
export const HERO_LINE: (HeroMeta | undefined)[] = heroAt('line');
/** Dealt creative elements that found no beat (a self-ending picture device with only the last picture free, a line
 * device with no line but the claim): precheck names them, the ship gate fails them; add a pair (a picture-only pair
 * works) or swap the device with a reason. */
export const CREATIVE_UNPLACED: string[] = CREATIVE.deal.filter((id) => !CREATIVE_PLAN.some((c) => c.id === id) && !CREATIVE_BENCHED.includes(id));
/** The line device of pair i (0-based), if any. */
export const LINE_DEV: (CreativeMeta | undefined)[] = P.map((_, i) => metaOf(CREATIVE_PLAN.find((c) => c.pair === i + 1 && c.role === 'line')?.id ?? ''));
/** The picture device of pair i (0-based), if any. */
export const PIC_DEV: (CreativeMeta | undefined)[] = P.map((_, i) => metaOf(CREATIVE_PLAN.find((c) => c.pair === i + 1 && c.role === 'picture')?.id ?? ''));
/** Whether a creative element is the film's colour event (the claim's colour field then stays off). */
export const CREATIVE_COLOUR = CREATIVE_PLAN.some((c) => metaOf(c.id)?.colour);
/** The script a device needs and the pair does not give: the agent writes it (or swaps the device, with a reason). */
export const CREATIVE_MISSING: string[] = CREATIVE_PLAN.flatMap((c) => {
  const m = metaOf(c.id) as CreativeMeta;
  if (needsMet(c.pair - 1, m)) return [];
  const what: Record<string, string> = { swap: 'alts: 2-3 alternatives its key word rolls through', logos: 'logos: 3-8 products it works with (scripts/logos.mjs get <name>)', count: "count: a real figure ({ to: 3.2, suffix: 'x' })", before: 'before: 2-4 steps of the old way', photos: 'photos: 5 or more public/ paths (pictures worth showing; fewer: swap the device)' };
  return [`pair ${c.pair} plays ${c.id}: write ${m.needs.filter((n) => !needsMet(c.pair - 1, { ...m, needs: [n] })).map((n) => what[n]).join('; ')} on it, or swap it in launch.ts creative.swap with the reason`];
});
/** When line i (0-based) is whole, f@60 from its first frame: its device's arithmetic, else the voice's. */
export const resolveAt = (i: number): number => {
  const words = keyWords(P[i].line ?? '');
  const dev = LINE_DEV[i];
  if (dev) {
    const key = words.find((w) => w.key) ?? words[words.length - 1];
    return lineResolve(dev.id, words.length, key?.word.length ?? 6, P[i].alts?.length ?? 0) ?? resolveLine(words.length, false);
  }
  return resolveLine(wordCount(plain(P[i].line ?? '')), i === P.length - 1, voiceOf(i));
};
/** How each line meets its picture: launch.ts `beat`, else the first line, the claim and every pair a creative element
 * takes alone, the lines between with. */
// a hero picture between the first line and the claim arrives with its line (the shot standing back, soft and dark,
// its first frame held under the line, then coming up and racking in as the line leaves, its own clock starting there):
// a hero shot after every line alone made every film "a line, then a card", line after line
export const MODES: Mode[] = P.map((p, i): Mode => (!hasLine(i) ? 'none' : HERO_OVER[i] ? 'over' : p.beat ?? (i === 0 || i === P.length - 1 || LINE_DEV[i] || PIC_DEV[i] || HERO_LINE[i] ? 'alone' : 'with')));
CREATIVE_PLAN.forEach((c) => {
  if (c.role === 'line' && MODES[c.pair - 1] !== 'alone') throw new Error(`timeline: pair ${c.pair} plays the line device ${c.id}, which draws the line on its own beat: leave its \`beat\` unset (or alone)`);
  if (c.role === 'picture' && MODES[c.pair - 1] === 'over') throw new Error(`timeline: pair ${c.pair} plays the picture device ${c.id} under a line held over it (beat over): a creative picture takes the frame; set beat alone or with`);
});
// lengths in half beats (8ths): a line's beat is its build, its read and its exit, rounded up; a picture's is its seconds
// (with: the picture alone after the line; over: the line and the picture together, the longer of the two)
const HALF = BEAT / 2;
const beatsOf = P.map((p, i) => {
  const mode = MODES[i];
  if (mode === 'none') {
    // a picture-only pair: its picture alone, carried on from the last picture
    const want = Math.min(PIC.max, Math.max(PIC.min, PIC_DEV[i]?.min ?? 0, HERO_PIC[i]?.min ?? 0, p.seconds ?? PIC.house[i % PIC.house.length]));
    let a = Math.max(2, Math.round(SEC(want) / HALF));
    while (a * HALF < SEC(Math.max(PIC.min, PIC_DEV[i]?.min ?? 0, HERO_PIC[i]?.min ?? 0))) a++;
    return { t: 0, a, mode };
  }
  const n = wordCount(plain(p.line ?? ''));
  const dev = LINE_DEV[i];
  const tail = (dev ? (dev.handover ? dev.tail ?? 0 : SEAM_OUT) : mode === 'alone' ? SEAM_OUT : mode === 'over' ? LINE_EXIT + OVER_TAIL : LINE_EXIT) + (HERO_LINE[i] ? Math.round(60 * HERO_LINE[i].min) : 0);
  // a line after a hero shot starts HERO_LATE f@60 after the cut (the shot goes soft first): its beat holds that too
  const late = i > 0 && mode === 'alone' && (HERO_PIC[i - 1] || HERO_OVER[i - 1]) ? HERO_LATE : 0;
  // the first line on a photograph starts after the opening rack (FIRST_WORD): its beat holds the wait too (the world's
  // moment, not the line's, so the line's own limit below leaves it out)
  const wait = i === 0 ? Math.max(0, FIRST_WORD - LEAD) : 0;
  const need = f60(LEAD + late + wait + resolveAt(i)) + f60(holdFor(n, pace)) + f60(tail);
  const max = dev || HERO_LINE[i] ? LINE_DEVICE_MAX : LINE.max;
  if (need - f60(wait) > SEC(max)) throw new Error(`timeline: "${plain(p.line ?? '')}" needs ${((need - f60(wait)) / FPS).toFixed(2)} s; a line beat holds at most ${max} s${dev ? ` (${dev.id})` : ''}: shorten it`);
  const want = Math.min(PIC.max, Math.max(PIC.min, PIC_DEV[i]?.min ?? 0, HERO_PIC[i]?.min ?? 0, HERO_OVER[i]?.min ?? 0, p.seconds ?? PIC.house[i % PIC.house.length]));
  let a = Math.max(2, Math.round(SEC(want) / HALF));
  while (a * HALF < SEC(Math.max(PIC.min, HERO_PIC[i]?.min ?? 0, HERO_OVER[i]?.min ?? 0))) a++;
  let t = Math.max(Math.ceil(need / HALF), Math.ceil(SEC(LINE.min) / HALF));
  // over: one beat, the line held over the whole picture (never shorter than the line needs)
  if (mode === 'over') (t = Math.max(t, a)), (a = 0);
  return { t, a, mode };
});
// the pairs end on a bar line (the end starts on a downbeat): the spare 8ths go to the pictures, last first, while they
// stay under 3.5 s, then to the last picture (never to a line: a finished line held longer only freezes)
{
  let spare = (8 - (beatsOf.reduce((n, x) => n + x.t + x.a, 0) % 8)) % 8;
  for (let i = beatsOf.length - 1; i >= 0 && spare > 0; i--) {
    const x = beatsOf[i];
    if (x.a > 0 && (x.a + 1) * HALF <= SEC(PIC.max) + 0.5) (x.a++, spare--);
  }
  const last = beatsOf[beatsOf.length - 1];
  if (last.a > 0) last.a += spare;
  else last.t += spare;
}
// the end: the element lands as the mark (18 f), the name slides out (30 f) and is read (24 + 36 f), the fact under it
// is built and read; from the frame all of it is whole the lockup holds 2-3 s (house 2.5) to the end
const END_HOLD = { min: 2, house: 2.5, max: 3 } as const;
const END_PRE = { name: 20, slide: 30, read: 54, named: 18 } as const; // f@60: the end's first frame to the name; its slide; the fact after the name; the name readable
/** f@60 from the end's first frame to the name: the element lands as the mark in 18 f; a hero end card's mark lands with its move (logo-3d: a 76 f pull-back). */
export const END_NAME = HERO_END ? 82 : END_PRE.name;
const endWhole = f60(END_NAME + END_PRE.read + 22) + Math.ceil(BEAT / 4);
let endBars = 1;
while (endBars * BAR + TAIL < endWhole + SEC(END_HOLD.min)) endBars++;

const startH: number[] = [];
let acc = 0;
for (const x of beatsOf) {
  startH.push(acc);
  acc += x.t + x.a;
}
const endBeat = acc / 2;
const lastBeat = endBeat + endBars * 4;
/**
 * Each pair: its first frame (the line), the end of its line beat (alone: the cut to the picture; with: the line gone,
 * the picture racked into focus and playing on alone; over: the pair's end), its last frame, how the line meets the
 * picture and the picture's first frame (alone: the cut; with and over: the line's first frame, the picture under it).
 */
export const PAIRS = P.map((_, i) => {
  const from = i === 0 ? 0 : bt(startH[i] / 2);
  const ta = bt((startH[i] + beatsOf[i].t) / 2);
  return { k: i + 1, from, ta, to: bt((startH[i] + beatsOf[i].t + beatsOf[i].a) / 2), mode: MODES[i], pic: MODES[i] === 'alone' ? ta : from };
});
export const TOTAL = bt(lastBeat) + TAIL;

/**
 * The acts: the pairs, from frame 0, and the end on its downbeat. An act line re-draws the whole frame, so it never
 * falls on a seam's cut: the pairs play as one act (their seams are declared like any other) and the end's line falls
 * on the element carried into the mark, which has no cut.
 */
export const ACT: Record<string, { from: number; dur: number }> = {
  p1: { from: 0, dur: bt(endBeat) },
  end: { from: bt(endBeat), dur: TOTAL - bt(endBeat) },
};
export type ActName = string;
/** Bars in the body: track.py edit --bars takes this number. */
export const BARS = lastBeat / 4;

/**
 * The push closer (CUE a<pair>cut): a real camera move, never a one-frame jump. `dur` f@60 on E.strongInOut from the
 * cue, to `max` at most (and `min` at least, or no push), framing the scene's focus box with `margin` of the frame on
 * every side (the safe area); its text re-drawn sharp once it lands.
 */
export const PUSH = { dur: 24, max: 1.22, min: 1.08, margin: 0.05 } as const;

// ---- Cues (absolute frames on the 16th grid). Picture code reads these; src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {};
P.forEach((p, i) => {
  const k = i + 1;
  const pr = PAIRS[i];
  if (hasLine(i)) CUE[`line${k}`] = i === 0 ? (b(1) <= f60(54) ? b(1) : 0) : pr.from; // the first line is on screen by 1 s (frame 0 when the track's first downbeat comes later)
  CUE[`ta${k}`] = pr.ta; // alone: line -> picture; with: the line leaves, the picture racks into focus
  // the picture's own moments land where it is seen whole: after its line (alone, with), or across it (over)
  const over = MODES[i] === 'over';
  const a0 = (startH[i] + (over ? 0 : beatsOf[i].t)) / 2; // the first beat the picture plays alone (over: the pair's first)
  const len = (over ? beatsOf[i].t : beatsOf[i].a) / 2;
  const hitBeats = (p.hits ?? [0.35]).map((h) => Math.max(0.25, Math.min(len - 0.5, Math.round(h * len * 4) / 4)));
  hitBeats.forEach((x, j) => (CUE[`a${k}h${j + 1}`] = bt(a0 + x)));
  // a picture beat over 2.2 s takes the camera closer once: an eased push (PUSH: 24 f@60 on a strong in-out, about the
  // scene's focus box, which stays inside the safe area), starting on the beat nearest its middle that keeps 0.6 s each
  // side: two framings of the product's moment, never a one-frame jump. A line over the picture keeps the wide frame.
  const cuts: number[] = [];
  // a picture behind its line (with) already comes up to the camera as it racks into focus: a push after that is the
  // same scale-up twice; and never two pictures in a row with a push (every picture sharpening, then scaling up 10-20
  // %, is a template's tic): the one between keeps the wide frame and re-frames on its beats
  const pushed = i > 0 && CUE[`a${i}cut`] !== undefined;
  if (!over && MODES[i] !== 'with' && !pushed && !PIC_DEV[i] && !HERO_PIC[i] && len * BEAT > SEC(2.2)) {
    // on a beat that sounds (a track accent or a downbeat within 100 ms; any beat before the track is in), the one
    // nearest the middle that keeps 0.6 s each side and is not the picture's own moment; none: no cut, the push goes on
    const lo = SEC(0.6) / BEAT;
    const sounds = MUSIC ? [...(MUSIC.accents ?? []).map((x) => x.f), ...(MUSIC.downbeats ?? [])] : null;
    const onBeat: number[] = [];
    for (let x = Math.ceil(a0 + lo); x <= a0 + len - lo + 1e-9; x++) onBeat.push(x - a0);
    onBeat.sort((p, q) => Math.abs(p - len / 2) - Math.abs(q - len / 2));
    const c = onBeat.find((x) => !hitBeats.includes(x) && (!sounds || sounds.some((f) => Math.abs(bt(a0 + x) - f) <= 0.1 * FPS)));
    if (c !== undefined) {
      cuts.push(c);
      CUE[`a${k}cut`] = bt(a0 + c);
    }
  }
  // the picture's beats wherever its own moments leave more than 0.7 s empty: the scene and a creative element phrase
  // their steps on them (SceneProps beats); the camera never moves on them (no re-frame back and forth: it moves only
  // with a purpose)
  const edges = [0, ...hitBeats, ...cuts, len].sort((x, y) => x - y);
  let m = 0;
  for (let j = 0; j + 1 < edges.length; j++) {
    const gap = (edges[j + 1] - edges[j]) * BEAT;
    const n = Math.floor(gap / f60(42));
    for (let q = 1; q <= n; q++) {
      const x = Math.round((edges[j] + ((edges[j + 1] - edges[j]) * q) / (n + 1)) * 4) / 4;
      if (x > edges[j] && x < edges[j + 1]) CUE[`a${k}m${++m}`] = bt(a0 + x);
    }
  }
});
/** An offgrid reason for a cue a track's pickup pushes off its grid (grid-check reads OFFGRID). */
export const OFFGRID: Record<string, string> = MUSIC && b(1) > f60(54) ? { line1: 'the first line is on screen by 1 s, before the first downbeat of the track' } : {};
CUE.end = ACT.end.from; // the last picture's element starts becoming the mark
const onGrid = (f: number) => {
  let lo = 0;
  while (bt((lo + 1) / 4) <= f && lo < 4 * 400) lo++;
  return bt(lo / 4);
};
const onGridUp = (f: number) => {
  const g = onGrid(f);
  return g >= f ? g : onGrid(f + BEAT / 4 + 0.5);
};
// a long end lets the name be read longer before the fact arrives (inside the name's own reading window), so the
// lockup never holds past 3 s
const rest = Math.min(f60(72), Math.max(0, ACT.end.dur - endWhole - SEC(END_HOLD.house)));
CUE.name = onGridUp(ACT.end.from + f60(END_NAME)); // the name slides out from behind the mark
CUE.lockup = onGridUp(CUE.name + f60(END_PRE.slide)); // the lockup is whole and centred: the payoff
CUE.close = onGridUp(CUE.name + f60(END_PRE.read) + rest); // the one fact rises under it, once the name is read
CUE.last = bt(lastBeat);
// a line device that carries its picture in: its words leave and it turns into the picture (dev<k>a), and the move
// that lands it (dev<k>b): the beats its transformation plays on (sync.ts sounds them)
P.forEach((_, i) => {
  const d = LINE_DEV[i];
  if (!d?.handover) return;
  const k = i + 1;
  const out = CUE[`ta${k}`] - f60(d.tail ?? 0);
  CUE[`dev${k}a`] = onGridUp(out);
  const mid = onGrid(Math.round((out + CUE[`ta${k}`]) / 2));
  if (mid > CUE[`dev${k}a`] && mid < CUE[`ta${k}`]) CUE[`dev${k}b`] = mid;
});

//** The beat plan (grid-check `beats`): what each stretch of the film is, a line alone, a line over a picture, a picture, the end. */
export const BEAT_PLAN: BeatPlan[] = [];
P.forEach((_, i) => {
  const k = i + 1;
  const pr = PAIRS[i];
  if (pr.mode === 'over') return void BEAT_PLAN.push({ id: `line${k}`, kind: 'TA', from: pr.from, to: pr.to, pair: k });
  if (pr.mode === 'none') return void BEAT_PLAN.push({ id: `pic${k}`, kind: 'A', from: pr.from, to: pr.to, pair: k });
  // a line its own device opens into the picture (type-window, type-object, split-around) or a porthole parts is no
  // text-then-cards beat even alone: grid-check's loop rule reads `meets`
  const meets = pr.mode === 'alone' && (LINE_DEV[i]?.handover || HERO_LINE[i]) ? { meets: true as const } : {};
  BEAT_PLAN.push({ id: `line${k}`, kind: pr.mode === 'with' ? 'TA' : 'T', from: pr.from, to: pr.ta, pair: k, ...meets });
  BEAT_PLAN.push({ id: `pic${k}`, kind: 'A', from: pr.ta, to: pr.to, pair: k });
});
BEAT_PLAN.push({ id: 'end', kind: 'end', from: ACT.end.from, to: TOTAL, pair: 0 });
/** The share of each beat kind in the body (T, TA, A, in %), for the plan print and the review: about 25 / 30 / 37. */
export const BEAT_MIX = (() => {
  const body = BEAT_PLAN.filter((x) => x.kind !== 'end');
  const share = (k: BeatKind) => Math.round((100 * body.filter((x) => x.kind === k).length) / Math.max(1, body.length));
  return { T: share('T'), TA: share('TA'), A: share('A') };
})();

// The seam plan: every change of picture carries something, and the frame is never empty between two scenes.
//   line -> picture (T -> A)      seamTA: velocityCut (the line leaves at speed, smeared along its travel, the picture
//                                 arrives on it), blurThrough (a dealt matchCut plays as blurThrough: a line and a
//                                 picture share no shape to hold across a one-frame cut)
//   picture -> line (A -> T)      seamAT: recede (the picture falls back, softening, while the line builds over it) or
//                                 zoomThrough (the camera pushes into the picture's focus, the line building over the
//                                 push); never a picture blurred away to an empty ground
//   picture -> picture (A -> TA)  seamAA: velocityCut (one camera move carried across the cut), matchCut (the focus
//                                 point holds its place, the ground kept), blurThrough (the cut inside a blur); the
//                                 film's carried element (product.tsx IDEA) flies between the two scenes over any of
//                                 them (a push through would fill the frame with the outgoing picture and lose the
//                                 ground: the incoming picture rises in under its line, never at the push's anchor)
//   out of the claim              velocityCut: the claim's colour field sweeps off at speed (a ground flip carried by
//                                 motion, never a match cut across it)
//   into the end                  the last picture's element carried into the mark
// A line over its picture (with) leaves on its own and the picture racks into focus: one shot, no seam. The dealt kind
// and its next choice take turns at each kind of change, and no kind runs over 45 % of them.
export type SeamRecipe = 'exitEnter' | 'textSwap' | 'matchCut' | 'velocityCut' | 'blurThrough' | 'zoomThrough' | 'sharedElement' | 'recede' | 'handover';
export type SeamClass = 'TA' | 'AT' | 'AA' | 'end';
export type SeamPlan = { recipe: SeamRecipe; at: number; dir?: 'left' | 'right' | 'up' | 'down'; id: string; from: number; to: number; cls: SeamClass };
type Change = Exclude<SeamClass, 'end'>;
// line -> picture: a line and a picture share no shape, so a match cut there holds nothing across its one-frame cut (a
// hard cut from type to a picture): a dealt TA matchCut plays as blurThrough, and the turns go between the two that
// carry (the speed, the blur)
const TA_PLAYS: Record<string, SeamRecipe> = { matchCut: 'blurThrough', velocityCut: 'velocityCut', blurThrough: 'blurThrough' };
const ALT: Record<Change, Record<string, SeamRecipe>> = {
  TA: { velocityCut: 'blurThrough', blurThrough: 'velocityCut' },
  AT: { recede: 'zoomThrough', zoomThrough: 'recede' },
  // picture -> picture: a match cut only where it was dealt (it needs the carried element over it: stage.tsx reports a
  // match cut with nothing carried), never as another kind's turn
  AA: { velocityCut: 'blurThrough', matchCut: 'velocityCut', blurThrough: 'velocityCut' },
};
const OPTIONS: Record<Change, SeamRecipe[]> = { TA: ['velocityCut', 'blurThrough'], AT: ['recede', 'zoomThrough'], AA: ['velocityCut', 'blurThrough', ...(DEAL.seamAA === 'matchCut' ? (['matchCut'] as SeamRecipe[]) : [])] };
const KIND: Record<SeamRecipe, SeamKind> = { exitEnter: 'breath', textSwap: 'defocus', matchCut: 'morph', velocityCut: 'velocity', blurThrough: 'defocus', zoomThrough: 'zoomThrough', sharedElement: 'morph', recede: 'breath', handover: 'morph' };
/** Every change of picture and how it is carried: the stage draws each, SEAMS declares them. */
export const SEAM_PLAN: SeamPlan[] = [];
{
  const list: SeamPlan[] = [];
  const fixed = new Set<string>(); // seams no kind count may move (out of a hero shot into a line: always the recede)
  const turn: Record<Change, number> = { TA: 0, AT: 0, AA: 0 };
  const deal = { TA: TA_PLAYS[DEAL.seamTA] ?? 'blurThrough', AT: DEAL.seamAT, AA: DEAL.seamAA } as Record<Change, SeamRecipe>;
  const pick = (c: Change) => (turn[c]++ % 2 === 0 ? deal[c] : ALT[c][deal[c]]);
  const beat = (id: string) => BEAT_PLAN.findIndex((x) => x.id === id);
  // every whip of a film travels the same way (the film moves on, like a page turned): whips that alternate sides read
  // as a camera panning here and then back
  const dirOf = (r: SeamRecipe): SeamPlan['dir'] => (r === 'velocityCut' ? 'left' : 'up');
  P.forEach((_, i) => {
    const k = i + 1;
    const pr = PAIRS[i];
    if (i > 0) {
      const into = beat(pr.mode === 'none' ? `pic${k}` : `line${k}`);
      const cls: Change = pr.mode === 'alone' ? 'AT' : 'AA';
      // a match cut holds a shape across one frame: into or out of a creative picture (which brings its own entrance)
      // there is no shared shape to hold, so it plays as the blur
      const r0 = pick(cls);
      // out of a hero shot into a line the shot falls back (recede): a push through it would fill the frame with the
      // shot's own surface under the line's first words
      const heroOut = !!(HERO_PIC[i - 1] || HERO_OVER[i - 1]);
      const r = cls === 'AT' && heroOut ? 'recede' : cls === 'AA' && r0 === 'matchCut' && (PIC_DEV[i] || PIC_DEV[i - 1] || HERO_PIC[i] || HERO_PIC[i - 1] || HERO_OVER[i] || HERO_OVER[i - 1]) ? 'blurThrough' : r0;
      if (cls === 'AT' && heroOut) fixed.add(`pic${i}-line${k}`);
      list.push({ recipe: r, at: pr.from, dir: dirOf(r), id: cls === 'AT' ? `pic${i}-line${k}` : `pic${i}-pic${k}`, from: into - 1, to: into, cls });
    }
    if (pr.mode === 'alone') {
      // out of the claim: its colour field sweeps off at speed
      // a line device that hands over: its last frame is the picture's first (no seam to draw, one shot)
      const r: SeamRecipe = k === P.length ? 'velocityCut' : LINE_DEV[i]?.handover ? 'handover' : HERO_LINE[i] ? 'blurThrough' : pick('TA');
      list.push({ recipe: r, at: CUE[`ta${k}`], dir: dirOf(r), id: `line${k}-pic${k}`, from: beat(`line${k}`), to: beat(`pic${k}`), cls: 'TA' });
    }
  });
  // into the end (on the act line, so never a cut there): the last picture's element carried into the mark (turning
  // as it goes, for the badge)
  // (a hero end card: the last picture goes soft and the mark's close-up resolves out of the same blur)
  list.push({ recipe: HERO_END ? 'blurThrough' : 'sharedElement', at: ACT.end.from, id: 'into-the-lockup', from: BEAT_PLAN.length - 2, to: BEAT_PLAN.length - 1, cls: 'end' });
  // no kind over 45 %: the most used one gives way to another choice of its class where it repeats
  const cap = Math.floor(0.45 * list.length);
  const ACT_LINES = new Set(Object.values(ACT).map((a) => a.from));
  for (let guard = 0; guard < 8; guard++) {
    const n = new Map<string, number>();
    for (const s of list) n.set(KIND[s.recipe], (n.get(KIND[s.recipe]) ?? 0) + 1);
    const [top, c] = [...n.entries()].sort((x, y) => y[1] - x[1])[0];
    if (c <= cap) break;
    // the latest seam of the top kind that can take another kind
    // the least used kind its class offers (never the top one; a push through never cuts on an act line)
    const nextOf = (x: SeamPlan) => (x.cls === 'end' || x.recipe === 'handover' || fixed.has(x.id) || x.id === `line${P.length}-pic${P.length}` ? undefined : OPTIONS[x.cls].filter((r) => KIND[r] !== top && (r !== 'zoomThrough' || !ACT_LINES.has(x.at))).sort((a, b) => (n.get(KIND[a]) ?? 0) - (n.get(KIND[b]) ?? 0))[0]);
    const s = [...list].reverse().find((x) => KIND[x.recipe] === top && nextOf(x));
    if (!s) break;
    s.recipe = nextOf(s) as SeamRecipe;
    s.dir = dirOf(s.recipe);
  }
  SEAM_PLAN.push(...list);
}

// ---- Every on-screen word of the film.
export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name';
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};
/**
 * What a seam carries beyond its recipe (fx/Seam SeamOpts), so a cut between two full-frame pictures is never seen: a
 * velocity cut is a whip whose outgoing shot travels `travel` of the frame by the cut on an accelerating curve (mostly
 * gone and smeared at about 260 px a frame on the cut frame at 30 fps, where the house launch moved a picture 270 px and
 * left it in frame); a blur-through cuts inside a `peak` px blur with both shots dimmed to `dim` on the cut frame
 * (light passing, never a sharp-edged card swapped for a mark).
 */
export const SEAM_CARRY = { travel: 0.75, peak: 48, dim: 0.55 } as const;
export const seamExtra = (recipe: string, dir?: 'left' | 'right' | 'up' | 'down'): { travel?: number; peak?: number; dim?: number } =>
  recipe === 'velocityCut' ? { travel: SEAM_CARRY.travel * (dir === 'up' || dir === 'down' ? H : W) } : recipe === 'blurThrough' ? { peak: SEAM_CARRY.peak, dim: SEAM_CARRY.dim } : {};
/** The seam out of a line beat starts this many frames before its cut (its exit, fx/Seam seamSpan; the whip is 24 f@60). */
export const SEAM_LEAD: Record<string, number> = { matchCut: f60(10), exitEnter: f60(18), blurThrough: f60(14), velocityCut: f60(24) };
/** A line after a push through starts building this many frames before the cut, over the push: never an empty frame. */
export const LINE_EARLY: Partial<Record<SeamRecipe, number>> = { zoomThrough: f60(10) };
const leadOf = (k: number) => SEAM_LEAD[SEAM_PLAN.find((s) => s.id === `line${k}-pic${k}`)?.recipe ?? 'exitEnter'] ?? f60(18);
/** The frame a line starts to leave: alone, its seam's lead before the cut; with and over, its own exit, as it ends. */
const lineOut = (i: number) => (LINE_DEV[i]?.handover ? CUE[`ta${i + 1}`] - f60(LINE_DEV[i]?.tail ?? 0) : PAIRS[i].mode === 'alone' ? CUE[`ta${i + 1}`] - leadOf(i + 1) : PAIRS[i].mode === 'with' ? PAIRS[i].ta - f60(LINE_EXIT) : PAIRS[i].to - f60(LINE_EXIT + OVER_TAIL));
export const COPY: Copy[] = [];
P.forEach((p, i) => {
  const k = i + 1;
  if (!hasLine(i)) {
    // a picture-only pair: only its picture's strings, read from its first frame
    (p.ui ?? []).forEach((u, j) => COPY.push({ id: `ui${k}.${j + 1}`, text: u, kind: 'ui', in: PAIRS[i].pic, resolved: PAIRS[i].pic + f60(20), out: PAIRS[i].to }));
    return;
  }
  const text = plain(p.line ?? '');
  const into = SEAM_PLAN.find((s) => s.at === PAIRS[i].from && s.cls === 'AT');
  const early = i > 0 && into ? LINE_EARLY[into.recipe] ?? 0 : 0;
  // after a hero shot the line waits until the shot has gone soft (its own words never read under the line's first)
  const late = i > 0 && into && (HERO_PIC[i - 1] || HERO_OVER[i - 1]) ? f60(HERO_LATE) : 0;
  const inF = i === 0 ? Math.max(CUE[`line${k}`], f60(FIRST_WORD)) : CUE[`line${k}`] + f60(LEAD) - early + late;
  // the blur voice brings a line into focus whole: its hold is read, not a per-word rate
  COPY.push({ id: `line${k}`, text, in: inF, resolved: inF + f60(resolveAt(i)), out: lineOut(i), ...((voiceOf(i) === 'blur' && !LINE_DEV[i]) || LINE_DEV[i]?.id === 'scale-contrast' ? { reveal: 'focus' as const } : {}) });
  // the alternatives a word-swap rolls through are on screen too (counted apart, as the product's own words are)
  if (LINE_DEV[i]?.id === 'word-swap') (p.alts ?? []).forEach((w, j) => COPY.push({ id: `alt${k}.${j + 1}`, text: w, kind: 'ui', in: inF, resolved: inF + f60(resolveAt(i)) - f60(8), out: inF + f60(resolveAt(i)) }));
  const pr = PAIRS[i];
  // the picture's strings are read once it is sharp: alone, from the cut; with, from the rack (soft under the line, they
  // are not readable); over, once the line is whole
  const read = pr.mode === 'with' ? pr.ta : pr.mode === 'over' ? COPY[COPY.length - 1].resolved : pr.pic;
  (p.ui ?? []).forEach((u, j) => COPY.push({ id: `ui${k}.${j + 1}`, text: u, kind: 'ui', in: read, resolved: read + f60(20), out: pr.to }));
});
// the words a creative picture shows (the old way's steps, the figure, the result's word, the button's label)
P.forEach((p, i) => {
  const dev = PIC_DEV[i];
  if (!dev) return;
  const k = i + 1;
  const from = PAIRS[i].mode === 'with' ? PAIRS[i].ta : PAIRS[i].pic;
  const add = (id: string, text: string | undefined, at = from) => text && COPY.push({ id: `${dev.id}${k}.${id}`, text, kind: 'ui', in: at, resolved: at + f60(20), out: PAIRS[i].to });
  if (dev.id === 'split-compare') (p.before ?? []).slice(0, 4).forEach((b, j) => add(`${j + 1}`, b));
  if (dev.id === 'data-sculpture' && p.count) add('figure', `${p.count.prefix ?? ''}${p.count.to.toFixed(p.count.decimals ?? (Number.isInteger(p.count.to) ? 0 : 1))}${p.count.suffix ?? ''}`);
  if (dev.id === 'colour-flood') add('word', p.word, CUE[`a${k}h1`] ?? from);
  if (dev.id === 'dot-button') add('label', p.label ?? p.ui?.[0]);
});
COPY.push({ id: 'wordmark', text: LAUNCH.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(END_PRE.named), out: TOTAL });
COPY.push({ id: 'close', text: LAUNCH.close, in: CUE.close, resolved: CUE.close + f60(22), out: TOTAL, reveal: 'focus' });

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).
export type BlurPolicy = 'crisp' | 'camera';
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
export type Flash = { f: number; frames: 1 | 2; id: string };
export type CameraBlurRange = { from: number; to: number; id: string };
export type EndLock = { from: number; to: number };
export type ColourRange = { from: number; to: number; id: string };
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[]; colour?: ColourRange[] };
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };

/**
 * The seams, as fx/Seam seamDeclares writes them (kind from the recipe, the recipe in the id), and the focus pulls: a
 * line over its picture (with) leaves and the picture racks into focus, one shot changing from the line beat to the
 * picture beat without a cut (a defocus seam, `rack:`). The push closer is a camera move inside its shot (PUSH), not a
 * seam.
 */
const RACKS: Seam[] = PAIRS.filter((p) => p.mode === 'with').map((p) => ({ at: p.ta, kind: 'defocus', carry: 'scale', id: `rack:line${p.k}-pic${p.k}` }));
/**
 * The film's ending: the lockup lands, holds still while it is read (no drift: a hold may be still), then the whole
 * frame settles out over the last `fade` f@60 into the world's deep tone with the music's ring-out, never a last frame
 * caught mid-move at full brightness.
 */
export const END_FADE = { fade: 36 } as const;
export const SEAMS: Seam[] = [...RACKS, { at: TOTAL - f60(END_FADE.fade), kind: 'fadeEnd' as SeamKind, id: 'fadeEnd:settle-out' }, ...SEAM_PLAN.map((s) => {
  const axis = s.dir === 'left' || s.dir === 'right' ? 'x' : 'y';
  const carry = ({ matchCut: 'scale', velocityCut: axis, blurThrough: 'scale', zoomThrough: 'scale', sharedElement: 'shape', recede: 'scale', handover: 'shape' } as Partial<Record<SeamRecipe, Seam['carry']>>)[s.recipe];
  const out: Seam = { at: s.at, kind: KIND[s.recipe], id: `${s.recipe}:${s.id}` };
  if (carry) out.carry = carry;
  if (s.recipe === 'velocityCut' || s.recipe === 'exitEnter') out.dir = s.dir === 'left' || s.dir === 'up' ? -1 : 1;
  if (s.id === 'into-the-lockup') out.signature = true;
  return out;
})].sort((x, y) => x.at - y.at);
export const STEPPED: SteppedRange[] = [];
/** The hero line's snap (its last word one frame at HERO.from x, timeline HERO): the film's one designed flash. */
export const FLASHES: Flash[] = (() => {
  const c = COPY.find((x) => x.id === `line${P.length}`) as Copy;
  return [{ f: c.in + Math.round(f60x(heroSnapAt(wordCount(c.text)))), frames: 1, id: 'hero-snap' }];
})();
export const CAMERA_BLUR: CameraBlurRange[] = [];
/**
 * The film's colour event: a creative element that is one (colour-flood), else the claim's colour field (stage.tsx
 * FIELD), declared by the stage. The world itself never changes colour: one place, never cut.
 */
export const COLOUR: ColourRange[] = CREATIVE_COLOUR
  ? CREATIVE_PLAN.filter((c) => metaOf(c.id)?.colour).map((c) => ({ from: CUE[`a${c.pair}h1`] ?? PAIRS[c.pair - 1].pic, to: PAIRS[c.pair - 1].to, id: c.id }))
  : [];
/** The frame the film turns dark (the night worlds are dark from the first frame; the others never turn). */
export const DARK_FROM = DEAL.ground === 'blackField' || DEAL.ground === 'deepField' || DEAL.ground === 'nightCity' ? 0 : Infinity;
/** The one lock: from the frame the lockup and the fact are whole, they hold to the end, creeping. */
export const END: EndLock = { from: (COPY.find((c) => c.id === 'close') as Copy).resolved, to: TOTAL };
export const REVEAL = CUE.lockup;
export const SPRING_CLASS = '';
/** CUE names that must land on a music event: none (every act line already does). */
export const STRUCTURAL: string[] = [];
export const SALIENCE: Record<string, Salience> = Object.fromEntries(
  Object.keys(CUE).map((k) => [k, /^line/.test(k) ? 'copy' : /^ta/.test(k) ? (MODES[Number(k.slice(2)) - 1] === 'alone' ? 'cut' : 'move') : /^a\d+cut$/.test(k) ? 'move' : /^a\d+h/.test(k) ? 'hit' : /^a\d+m/.test(k) || /^dev\d/.test(k) ? 'move' : k === 'close' ? 'copy' : k === 'end' ? 'cut' : k === 'last' ? 'cut' : 'hit'] as const),
);

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
/** The fragments of one chain, in order of arrival (none in this template: every line is whole). */
export const chainOf = (id: string): Copy[] => COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
