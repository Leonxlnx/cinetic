// The update film's facts: the version, the version before it and the changes, each with the product screen that shows
// it working. The timeline, the acts and the sound all read this file; it is the one file a film fills.
//
// cinetic:placeholder - an invented release of an invented product: write the real version, 2-4 real changes (each one
// plain sentence of 2-6 words that says the result the user sees, never a feature name: scripts/copy-check.py) and,
// for each, the screen that shows it and the moment it plays (below), in the product's own words; then delete these lines.
import { IDENTITY } from './brand/identity';

/**
 * One line of a product screen: its words, a quiet detail beside it, and optionally a real photo (a public/ path from
 * `node scripts/assets.mjs get`: a person's face, a place, a thing; every photo in the film gets the same grade, radius
 * and frame) or the accent (the row the change is about). People are real photos or absent: a row never draws initials.
 */
export type Row = { label: string; meta?: string; photo?: string; accent?: boolean };
/** A block on a week grid: its day (0-based column), its start and length in rows of the grid (fractions allowed). */
export type Slot = { day: number; at: number; len: number; label: string; accent?: boolean };

/**
 * How a change is shown working (pick the one the change really is; each plays 1-3.5 s on the screen):
 *   tap    a tap on the screen's one action and the state it changes to: the button pressed, its new label, and what
 *          appears (`result`: the people in the call, the room booked, the file shared); `you`: the viewer's own entry
 *          that the tap adds to the result (the state changes because of the viewer's action: two here, then you)
 *   fill   a list, a grid or a week that fills: the rows, tiles or blocks land one by one, the last (`accent`) lands
 *          in the accent (the free hour, the found note, the new photo)
 *   swap   before -> after: the screen as it was (`before`), a wipe, the screen as it is now (`after`), its tag
 *          turning from tag[0] to tag[1] (a messy note tidied, a list sorted, a draft made final)
 *   count  a figure that rises from `from` to `to` (with `unit`), the bars under it growing (hours saved, files synced)
 */
export type Show =
  | { kind: 'tap'; rows?: Row[]; action: string; done: string; result?: Row[]; you?: Row }
  | { kind: 'fill'; layout: 'list'; items: Row[]; noun?: [one: string, many: string] }
  | { kind: 'fill'; layout: 'grid'; items: Row[]; cols?: number; noun?: [one: string, many: string] }
  | { kind: 'fill'; layout: 'week'; days: string[]; hours?: string[]; items: Slot[] }
  | { kind: 'swap'; before: Row[]; after: Row[]; tag: [before: string, after: string] }
  | { kind: 'count'; label: string; from: number; to: number; unit?: string; bars?: number[]; sub?: string };

/**
 * One change. `words`: one plain sentence, 2-6 words as read, the result the user sees. `title` and `sub`: the screen's
 * own header (the event, the note, the list it is). `show`: the moment that proves the line. `key`: the words the
 * line's accent lands on (every line names one: the key word is set apart by colour, weight or scale). `recap`: the few
 * words the change's card shows in the recap (default: the state it ends in). A change that works with another product
 * names it with "[]" where its real mark sits in the sentence: `logo` is the mark's slug (node scripts/logos.mjs get
 * <name> --film .), `logoName` the product's name as written.
 *
 * What the film's creative devices (src/deal.ts CREATIVE) can show, when the change really has it:
 *   before  the old way, short and real: 2-4 steps done by hand (split-compare sets them beside the product), or 4-7
 *           pings and questions the change ends (bubble-swarm pops them round the screen, then the screen draws them in)
 *   photos  5 or more pictures the change is about (photo-arc streams them and opens the chosen one, the first, into
 *           the screen); a grid of 5 or more photos gives its own
 *   logos   3 or more products it works with (logo-orbit: their official marks in the film's ink)
 *   swap    2-3 words the key word rolls through before it lands on the real one (word-swap)
 */
export type Change = {
  id: string;
  words: string;
  key?: string;
  title: string;
  sub?: string;
  show: Show;
  recap?: string;
  logo?: string;
  logoName?: string;
  before?: string[];
  photos?: string[];
  logos?: string[];
  swap?: string[];
};

export const UPDATE: { name: string; from: string; version: string; changes: Change[] } = {
  name: IDENTITY.name,
  from: '[2.3]', // the version before this one: the hook may roll its changed numerals to the new one
  version: '[2.4]',
  changes: [
    {
      id: 'first',
      words: '[First change in plain words]',
      key: '[words]',
      title: '[Screen title]',
      sub: '[detail]',
      show: { kind: 'tap', rows: [{ label: '[Row]', meta: '[detail]' }, { label: '[Row]', meta: '[detail]' }], action: '[Action]', done: '[Done]', result: [{ label: '[Result]' }, { label: '[Result]' }] },
    },
    {
      id: 'second',
      words: '[Second change in plain words]',
      key: '[words]',
      title: '[Screen title]',
      show: { kind: 'fill', layout: 'list', items: [{ label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]', accent: true }], noun: ['[item]', '[items]'] },
    },
    {
      id: 'third',
      words: '[Third change in plain words]',
      key: '[words]',
      title: '[Screen title]',
      show: { kind: 'swap', before: [{ label: '[Before]' }, { label: '[Before]' }, { label: '[Before]' }], after: [{ label: '[After]' }, { label: '[After]' }, { label: '[After]' }], tag: ['[Draft]', '[Done]'] },
    },
  ],
};

/** A change's sentence as it is read: its mark read as the product's name. */
export const spokenChange = (c: Change): string => c.words.replace(/\s*\[\]\s*/g, ` ${c.logoName ?? ''} `).replace(/\s+/g, ' ').trim();

/** The few words a change's card shows in the recap: `recap`, else the state the moment ends in. */
export const recapOf = (c: Change): string => {
  if (c.recap) return c.recap;
  const s = c.show;
  if (s.kind === 'tap') return s.done;
  if (s.kind === 'swap') return s.tag[1];
  if (s.kind === 'count') return `${s.to.toLocaleString('en-US')}${s.unit ?? ''}`;
  const items = s.items as { label: string; accent?: boolean }[];
  const hit = items.find((x) => x.accent) ?? items[items.length - 1];
  return hit?.label ?? '';
};

/** The pictures a change can stream (photo-arc): its `photos`, else a grid's photos with the accent one first. */
export const photosOf = (c: Change): string[] => {
  if (c.photos?.length) return c.photos;
  const s = c.show;
  if (s.kind !== 'fill' || s.layout !== 'grid') return [];
  const withPhoto = s.items.filter((x) => x.photo);
  const hit = withPhoto.filter((x) => x.accent);
  return [...hit, ...withPhoto.filter((x) => !x.accent)].map((x) => x.photo as string);
};
/** The old way a change can set beside the product (split-compare): its `before`, else a swap's rows as they were. */
export const beforeOf = (c: Change): string[] => c.before ?? (c.show.kind === 'swap' ? c.show.before.map((r) => r.label) : []);

// ---- checks: the scaffold fails loudly on a content file a moment cannot draw
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const need = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(`update.ts: ${msg}`);
};
need(UPDATE.changes.length >= 2 && UPDATE.changes.length <= 4, `an update film shows 2-4 changes (it has ${UPDATE.changes.length})`);
need(!!UPDATE.version.trim() && !!UPDATE.from.trim(), 'give the version and the version before it');
need(new Set(UPDATE.changes.map((c) => c.id)).size === UPDATE.changes.length, 'every change needs its own id');
for (const c of UPDATE.changes) {
  const n = words(spokenChange(c));
  need(n >= 2 && n <= 6, `"${spokenChange(c)}" is ${n} words; a change is one short sentence of 2-6 words`);
  need(!c.words.includes('[]') || !!c.logoName, `"${c.words}" holds a mark ([]): give its logoName (and its logo slug once fetched)`);
  need(!!c.title.trim(), `${c.id}: the screen needs its title (the product's own header)`);
  need(!c.before || (c.before.length >= 2 && c.before.length <= 7), `${c.id}: before holds 2-4 steps of the old way (or 4-7 pings)`);
  need(!c.photos || c.photos.length >= 5, `${c.id}: photos streams 5 or more pictures (it has ${c.photos?.length})`);
  need(!c.logos || c.logos.length >= 3, `${c.id}: logos names 3 or more products it works with`);
  need(!c.swap || (c.swap.length >= 2 && c.swap.length <= 3), `${c.id}: swap gives 2-3 words the key word rolls through`);
  const s = c.show;
  const rows = (s.kind === 'tap' ? [...(s.rows ?? []), ...(s.result ?? []), ...(s.you ? [s.you] : [])] : s.kind === 'swap' ? [...s.before, ...s.after] : s.kind === 'fill' && s.layout !== 'week' ? s.items : []) as (Row & { initials?: string })[];
  need(!rows.some((r) => r.initials), `${c.id}: people are real photos or absent (a row's photo), never initials`);
  if (s.kind === 'tap') {
    need(!!s.action.trim() && !!s.done.trim(), `${c.id}: a tap needs the action's label and the label it changes to`);
    need((s.rows ?? []).length <= 3 && (s.result ?? []).length + (s.you ? 1 : 0) <= 4, `${c.id}: a tap screen shows at most 3 rows and 4 results (you among them)`);
  } else if (s.kind === 'fill') {
    const max = s.layout === 'week' ? 14 : s.layout === 'grid' ? 9 : 6;
    need(s.items.length >= 3 && s.items.length <= max, `${c.id}: a ${s.layout} that fills shows 3-${max} items (it has ${s.items.length})`);
    if (s.layout === 'week') need(s.days.length >= 3 && s.days.length <= 7 && s.items.every((x) => x.day >= 0 && x.day < s.days.length && x.len > 0), `${c.id}: a week needs 3-7 days and every block on one of them`);
  } else if (s.kind === 'swap') {
    need(s.before.length >= 2 && s.before.length <= 4 && s.after.length >= 2 && s.after.length <= 4, `${c.id}: before and after show 2-4 rows each`);
  } else if (s.kind === 'count') {
    need(Number.isFinite(s.from) && Number.isFinite(s.to) && s.to !== s.from, `${c.id}: a count rises from one number to another`);
  }
}
