// The update film's facts: the version, the version before it, the ONE session the film follows (one person doing one
// task that uses each change in turn: the spine, lib/spine.ts) with its case (the same names and numbers in every act),
// and the changes, each an act of that session with the product screen that shows it working. The timeline, the hero
// shots and the sound all read this file; it is the one file a film fills (with src/content.ts, the people, pictures
// and screens scripts/content.mjs writes from the brief).
//
// cinetic:placeholder - an invented release of an invented product: write the real version, the session and its case,
// 2-3 real changes in the order the session meets them (each one plain sentence of 2-6 words that says the result the
// user sees, never a feature name: scripts/copy-check.py, its verb, and the screen that shows it and the moment it plays,
// below), in the product's own words; then delete these lines.
import { IDENTITY } from './brand/identity';

/**
 * One line of a product screen: its words, a quiet detail beside it, and optionally a real photo (a person's face from
 * src/content.ts, `CONTENT.people[k].photo`, or a public/ path from `node scripts/assets.mjs get`: a place, a thing) or
 * the accent (the row the change is about). People are real photos or absent: a row never draws initials.
 */
export type Row = { label: string; meta?: string; photo?: string; accent?: boolean };
/** A block on a week grid: its day (0-based column), its start and length in rows of the grid (fractions allowed). */
export type Slot = { day: number; at: number; len: number; label: string; accent?: boolean };

/**
 * How a change is shown working (pick the one the change really is; the hero shot that films it is dealt from the ones
 * that fit, src/deal.ts HERO_META and heroFit):
 *   tap    a tap on the screen's one action and the state it changes to: the button pressed, its new label, and what
 *          appears (`result`: the people in the call, the room booked, the file shared); `you`: the viewer's own entry
 *          that the tap adds to the result (two here, then you)
 *   type   a request typed into the product's input and sent (`text`, the words a person types; `placeholder`, the
 *          input's faint prompt; `model`, a chip beside the mic)
 *   fill   a list, a grid or a week that fills: the rows, tiles or blocks land one by one, the last (`accent`) lands
 *          in the accent (the free hour, the found note, the new photo); a grid's tiles are real photos
 *   swap   before -> after: the screen as it was (`before`), the screen as it is now (`after`), its tag turning from
 *          tag[0] to tag[1] (a messy note tidied, a list sorted, a draft made final)
 *   count  a figure that rises from `from` to `to` (with `unit`), the bars under it growing (hours saved, files synced)
 *   page   the page the product makes or shows: `doc` (a document: src/content.ts CONTENT.doc, its title the change's
 *          `title` unless `heading` says otherwise) or `site` (its site or the app it built: CONTENT.site)
 */
export type Show =
  | { kind: 'tap'; rows?: Row[]; action: string; done: string; result?: Row[]; you?: Row }
  | { kind: 'type'; text: string; placeholder?: string; model?: string }
  | { kind: 'fill'; layout: 'list'; items: Row[]; noun?: [one: string, many: string] }
  | { kind: 'fill'; layout: 'grid'; items: Row[]; cols?: number; noun?: [one: string, many: string] }
  | { kind: 'fill'; layout: 'week'; days: string[]; hours?: string[]; items: Slot[] }
  | { kind: 'swap'; before: Row[]; after: Row[]; tag: [before: string, after: string] }
  | { kind: 'count'; label: string; from: number; to: number; unit?: string; bars?: number[]; sub?: string }
  | { kind: 'page'; page: 'doc' | 'site'; heading?: string; accentWord?: string };

/**
 * One change. `words`: one plain sentence, 2-6 words as read, the result the user sees. `title` and `sub`: the screen's
 * own header (the event, the note, the list it is). `show`: the moment that proves the line. `key`: the words the
 * line's accent lands on (every line names one: the key word is set apart by colour, weight or scale). A change that
 * works with another product names it with "[]" where its real mark sits in the sentence: `logo` is the mark's slug
 * (node scripts/logos.mjs get <name> --film .), `logoName` the product's name as written.
 *
 * What the hero shots can show, when the change really has it:
 *   photos  5 or more pictures the change is about (a ring of them turning in depth, or the chosen one developing); a
 *           grid of 5 or more photos gives its own
 *   logos   3 or more products it works with: their official marks as glass tiles in depth (public/ paths of the
 *           marks `node scripts/logos.mjs get <name> --film .` saved)
 *   hero    one hero shot by hand (a src/deal.ts HERO_META id that fits the change), with `why` (what rules the dealt
 *           one out); otherwise the deal picks
 */
export type Change = {
  id: string;
  words: string;
  key?: string;
  /** the act's verb in the session's sentence ('see', 'arrive', 'join'): it picks the hero shots that can film it (lib/spine devicesFor); default the line's first word */
  verb?: string;
  /** how its line meets the element (else dealt, src/deal.ts PLACES): 'part' the line parts round a porthole holding the element, which opens into the shot (once a film, never a line with "[]"); 'head' the line rides over the element in the shot's own space */
  place?: 'part' | 'head';
  title: string;
  sub?: string;
  show: Show;
  logo?: string;
  logoName?: string;
  photos?: string[];
  logos?: string[];
  hero?: string;
  why?: string;
};

/**
 * The case the session works on: `request` the one record every act touches (the task, the item, the place: real words
 * from the brief, as the screens write them), `names` and `numbers` as they appear on screen (a person, a place, a time,
 * a figure). The checks follow them through the acts (grid-check spine-case, data-check): the same ones in 2-4 acts.
 */
export type Case = { request: string; result?: string; who?: string; names?: string[]; numbers?: string[] };

export const UPDATE: { name: string; from: string; version: string; session: string; case: Case; changes: Change[] } = {
  name: IDENTITY.name,
  from: '2.3', // the version before this one (the hook may roll its changed numerals to the new one): write the real one
  version: '2.4', // the new version: write the real one
  session: '[does the one task the film follows]', // the session as a verb phrase ("plans Saturday's hike on Ridge Loop"): the film's sentence
  case: { request: '[Row]', names: ['[Row]'], numbers: [] }, // the record every act touches, as its screens write it
  changes: [
    {
      id: 'first',
      words: '[First change in plain words]',
      key: '[words]',
      verb: 'tap',
      title: '[Screen title]',
      sub: '[detail]',
      show: { kind: 'tap', rows: [{ label: '[Row]', meta: '[detail]' }, { label: '[Row]', meta: '[detail]' }], action: '[Action]', done: '[Done]', result: [{ label: '[Result]' }, { label: '[Result]' }] },
    },
    {
      id: 'second',
      words: '[Second change in plain words]',
      key: '[words]',
      verb: 'fill',
      title: '[Screen title]',
      show: { kind: 'fill', layout: 'list', items: [{ label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]', accent: true }], noun: ['[item]', '[items]'] },
    },
    {
      id: 'third',
      words: '[Third change in plain words]',
      key: '[words]',
      verb: 'count',
      title: '[Screen title]',
      show: { kind: 'count', label: '[What is counted]', from: 12, to: 48, unit: '[unit]', sub: '[detail]' },
    },
  ],
};

/** A change's sentence as it is read: its mark read as the product's name. */
export const spokenChange = (c: Change): string => c.words.replace(/\s*\[\]\s*/g, ` ${c.logoName ?? ''} `).replace(/\s+/g, ' ').trim();

/** The pictures a change can show (a ring of them, or the chosen one developing): its `photos`, else a grid's photos with the accent one first. */
export const photosOf = (c: Change): string[] => {
  if (c.photos?.length) return c.photos;
  const s = c.show;
  if (s.kind !== 'fill' || s.layout !== 'grid') return [];
  const withPhoto = s.items.filter((x) => x.photo);
  const hit = withPhoto.filter((x) => x.accent);
  return [...hit, ...withPhoto.filter((x) => !x.accent)].map((x) => x.photo as string);
};
/** The rows a change's list holds (a list or a grid that fills; the rows of a swap's after), front first. */
export const rowsOf = (c: Change): Row[] => {
  const s = c.show;
  if (s.kind === 'fill' && s.layout !== 'week') return s.items;
  if (s.kind === 'swap') return s.after;
  if (s.kind === 'tap') return [...(s.result ?? []), ...(s.you ? [s.you] : [])];
  return [];
};

// ---- checks: the scaffold fails loudly on a content file a moment cannot draw
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const need = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(`update.ts: ${msg}`);
};
need(UPDATE.changes.length >= 2 && UPDATE.changes.length <= 3, `an update film plays the hook and 2-3 changes as the acts of one session (it has ${UPDATE.changes.length}); a fourth change is a second film`);
need(!!UPDATE.session.trim() && !!UPDATE.case.request.trim(), 'give the session (the one task the film follows) and its case (the record every act touches)');
need(UPDATE.changes.filter((c) => c.place === 'part').length <= 1, 'one change at most parts its line round the porthole (place: part)');
need(UPDATE.changes.every((c) => c.place !== 'part' || !c.words.includes('[]')), 'a line that carries a mark ([]) never parts round the porthole (its gap holds the mark)');
need(!!UPDATE.version.trim() && !!UPDATE.from.trim(), 'give the version and the version before it');
need(new Set(UPDATE.changes.map((c) => c.id)).size === UPDATE.changes.length, 'every change needs its own id');
// a face is a person: one photo carries one name through the film (the name content.ts cast with it: its people come
// with their names), never one stock face as two people (a named member in one change and the author of a report in
// another): a varied cast gives each its own face
{
  const named = new Map<string, Set<string>>();
  const other = new Map<string, string>();
  for (const c of UPDATE.changes) {
    const s = c.show;
    const people = (s.kind === 'tap' ? [...(s.result ?? [])] : []) as Row[];
    const rest = (s.kind === 'tap' ? s.rows ?? [] : s.kind === 'swap' ? [...s.before, ...s.after] : s.kind === 'fill' && s.layout !== 'week' ? s.items : []) as Row[];
    for (const r of people) if (r.photo && /people\//.test(r.photo)) named.set(r.photo, new Set([...(named.get(r.photo) ?? []), r.label.trim()]));
    for (const r of rest) if (r.photo && /people\//.test(r.photo) && !other.has(r.photo)) other.set(r.photo, r.label);
  }
  for (const [photo, names] of named) {
    need(names.size <= 1, `${photo} is ${[...names].join(' and ')}: one face is one person (take people from src/content.ts people, each with the name it was cast with)`);
    need(!other.has(photo), `${photo} is ${[...names][0]} and also posts "${other.get(photo)}": give the row its own face (a varied cast, src/content.ts people)`);
  }
}
for (const c of UPDATE.changes) {
  const n = words(spokenChange(c));
  need(n >= 2 && n <= 6, `"${spokenChange(c)}" is ${n} words; a change is one short sentence of 2-6 words`);
  need(!c.words.includes('[]') || !!c.logoName, `"${c.words}" holds a mark ([]): give its logoName (and its logo slug once fetched)`);
  need(!!c.title.trim(), `${c.id}: the screen needs its title (the product's own header)`);
  need(!c.photos || c.photos.length >= 5, `${c.id}: photos holds 5 or more pictures (it has ${c.photos?.length})`);
  need(!c.logos || c.logos.length >= 3, `${c.id}: logos names 3 or more products it works with`);
  need(!c.hero || !!(c.why ?? '').trim(), `${c.id}: a hero shot chosen by hand needs its why (what in the change rules the dealt one out)`);
  const s = c.show;
  const rows = (s.kind === 'tap' ? [...(s.rows ?? []), ...(s.result ?? []), ...(s.you ? [s.you] : [])] : s.kind === 'swap' ? [...s.before, ...s.after] : s.kind === 'fill' && s.layout !== 'week' ? s.items : []) as (Row & { initials?: string })[];
  need(!rows.some((r) => r.initials), `${c.id}: people are real photos or absent (a row's photo), never initials`);
  if (s.kind === 'tap') {
    need(!!s.action.trim() && !!s.done.trim(), `${c.id}: a tap needs the action's label and the label it changes to`);
    need((s.rows ?? []).length <= 3 && (s.result ?? []).length + (s.you ? 1 : 0) <= 4, `${c.id}: a tap screen shows at most 3 rows and 4 results (you among them)`);
  } else if (s.kind === 'type') {
    need(words(s.text) >= 2 && s.text.length <= 64, `${c.id}: a typed request is 2 words to 64 characters (it has ${s.text.length})`);
  } else if (s.kind === 'fill') {
    const max = s.layout === 'week' ? 14 : s.layout === 'grid' ? 9 : 6;
    need(s.items.length >= 3 && s.items.length <= max, `${c.id}: a ${s.layout} that fills shows 3-${max} items (it has ${s.items.length})`);
    if (s.layout === 'week') need(s.days.length >= 3 && s.days.length <= 7 && s.items.every((x) => x.day >= 0 && x.day < s.days.length && x.len > 0), `${c.id}: a week needs 3-7 days and every block on one of them`);
    if (s.layout === 'grid') need(s.items.every((x) => !!x.photo), `${c.id}: a grid shows pictures: every tile its real photo (a list holds items without one)`);
  } else if (s.kind === 'swap') {
    need(s.before.length >= 2 && s.before.length <= 4 && s.after.length >= 2 && s.after.length <= 4, `${c.id}: before and after show 2-4 rows each`);
  } else if (s.kind === 'count') {
    need(Number.isFinite(s.from) && Number.isFinite(s.to) && s.to !== s.from, `${c.id}: a count rises from one number to another`);
  }
}
