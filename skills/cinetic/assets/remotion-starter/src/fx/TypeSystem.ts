/**
 * Headline systems: how a film sets its lines. A film speaks in ONE system, its voice: by default `plain`, one centred
 * line whose key words take the film's one emphasis kind on some lines (fx/TypeEmphasis filmEmphasis). Its acts may set
 * a few lines another way on purpose (an object inside the sentence, a typed request, a push through the line); a
 * two-voice stack (a small lead line over big key words) is at most one line a film, and the voice holds at least half
 * the lines (one-line statements are the norm: 80 % of a film's statements or more).
 *
 *   plain    one sentence, centred (the voice of most films)
 *   front    one sentence; once it lands, the accent crosses the key words (sweep) or they fill from an outline (outline)
 *   marker   one sentence; a bar or the inverted box wipes on behind the key words: a declared signature, one line a film
 *   rule     one sentence; a rule draws under the key words, skipping the descenders: a declared signature, one line a film
 *   swell    one sentence; the key words grow a step once landed, or sit a step up (swell, scale)
 *   stack    a stacked statement: the lead small over the key words big (fx/TypeStack StatementLine stack): one a film
 *   giant    poster type: the line at poster size, centred (fx/TypeClaim AccentClaim), or one giant word
 *   inline   inline media: a picture, mark or glyph set inside the sentence as one of its words (acts/type MarkLine)
 *   typed    a typed line: letters typed on behind a caret (fx/TypeOn)
 *   swap     a word swap: the key word changes in place, the line re-flowing round it (TypePresets wheel, erode)
 *   push     a scale push: the camera pushes through the line onto its key word (fx/TypePush)
 *
 * filmSystems sets every line in the voice but the lines a template's acts set one way (`given`, or declared for the
 * film's seed by its deal: declareHeadlines) and the pins; checkSystems measures a film's systems: stacks (<= 1) and
 * the voice's share of the lines (>= half). Pure and import-free (a template's deal.ts, which the timeline and the
 * sound read in Node, imports it): no DOM, no Remotion.
 */
import type { EmphasisName } from './TypeEmphasis';

export type HeadlineSystem = 'plain' | 'front' | 'marker' | 'rule' | 'swell' | 'stack' | 'giant' | 'inline' | 'typed' | 'swap' | 'push';
export const HEADLINE_SYSTEMS: HeadlineSystem[] = ['plain', 'front', 'marker', 'rule', 'swell', 'stack', 'giant', 'inline', 'typed', 'swap', 'push'];

/** At most this many two-voice stacks in one film. */
export const MAX_STACKS = 1;
/** The voice holds at least this share of a film's lines. */
export const VOICE_SHARE = 0.5;

/** The emphasis devices each system may put on its key words (the first is its own). */
export const SYSTEM_DEVICES: Record<HeadlineSystem, EmphasisName[]> = {
  plain: ['accent', 'weight'],
  front: ['sweep', 'outline'],
  marker: ['marker', 'box'],
  rule: ['under'],
  swell: ['swell', 'scale'],
  stack: ['weight', 'accent'],
  giant: ['weight', 'accent'],
  inline: ['accent', 'weight', 'scale'],
  typed: ['accent', 'weight'],
  swap: ['accent', 'weight'],
  push: ['weight', 'accent', 'sweep'],
};

export type FilmSystemOpts = {
  voice?: HeadlineSystem; // the film's voice (default plain)
  given?: Partial<Record<string, HeadlineSystem>>; // lines the act sets one way
  pin?: Partial<Record<string, HeadlineSystem>>; // lines pinned by hand (they win over `given`)
};

/**
 * One system per line id: the film's voice, except the lines the act sets one way (`given`, else declared for `seed`
 * by the template's deal) and the pins. Pure: the same seed, the same systems.
 */
export const filmSystems = (ids: readonly string[], seed: string | number, o: FilmSystemOpts = {}): Record<string, HeadlineSystem> => {
  const declared = declaredHeadlines(seed);
  const voice = o.voice ?? 'plain';
  return Object.fromEntries(ids.map((id) => [id, o.pin?.[id] ?? o.given?.[id] ?? declared[id] ?? voice]));
};

export type SystemCheck = { ok: boolean; voice: HeadlineSystem | null; voiceShare: number; stacks: number; contrasts: { system: HeadlineSystem; lines: number }[] };

/**
 * A film's headline systems in film order (null for a line that sets none: a name, a caption): the voice (the system
 * of most lines, `voice` when given), its share of the lines (>= VOICE_SHARE), the stacks (<= MAX_STACKS) and the other
 * systems with their line counts. Pure.
 */
export const checkSystems = (seq: readonly (HeadlineSystem | null | undefined)[], voice?: HeadlineSystem): SystemCheck => {
  const live = seq.filter((s): s is HeadlineSystem => !!s);
  const n: Partial<Record<HeadlineSystem, number>> = {};
  for (const s of live) n[s] = (n[s] ?? 0) + 1;
  const ranked = (Object.entries(n) as [HeadlineSystem, number][]).sort((a, b) => b[1] - a[1]);
  const v = voice ?? ranked[0]?.[0] ?? null;
  const voiceShare = live.length && v ? Math.round(((n[v] ?? 0) / live.length) * 1000) / 1000 : 1;
  const stacks = n.stack ?? 0;
  const contrasts = ranked.filter(([s]) => s !== v).map(([system, lines]) => ({ system, lines }));
  return { ok: stacks <= MAX_STACKS && voiceShare >= VOICE_SHARE, voice: v, voiceShare, stacks, contrasts };
};

// ---- What a template's acts set one way, per film

const DECLARED = new Map<string, Partial<Record<string, HeadlineSystem>>>();
/**
 * A template's deal file declares, for its film's seed, the lines its acts set another way than the voice (a request
 * typed into a box, a claim on the accent at poster size, a push through a line): filmSystems sets them so and every
 * other line in the voice. Returns what it declared.
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
