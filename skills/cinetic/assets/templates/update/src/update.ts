// The update film's facts: the version, the version before it, the ONE session the film follows (one person doing one
// task that uses each change in turn) with its case (the same names and numbers on every screen), and the changes, each
// a line and the house scene that shows it working (src/scenes, picked per change in src/deal.ts). The timeline, the
// scenes and the sound all read this file; it is the one file a film fills (with src/content.ts, the people, pictures
// and screens scripts/content.mjs writes from the brief).
//
// cinetic:placeholder - an invented release of an invented product: write the real version, the session and its case,
// 2-3 real changes in the order the session meets them (each one plain sentence of 2-6 words that says the result the
// user sees, never a feature name: scripts/copy-check.py, its verb, and the moment that proves it, below), in the
// product's own words; then delete these lines. Two changes run 9-14 s; a third keeps the film inside 20 s.
import { IDENTITY } from './brand/identity';

/**
 * One line of a product screen: its words, a quiet detail beside it, and optionally a real photo (a person's face from
 * src/content.ts, `CONTENT.people[k].photo`, or a public/ path from `node scripts/assets.mjs get`: a place, a thing) or
 * the accent (the row the change is about). People are real photos or absent: a row never draws initials.
 */
export type Row = { label: string; meta?: string; photo?: string; accent?: boolean };

/**
 * How a change is shown working (pick the one the change really is; the scene that plays it is dealt from the ones that
 * fit, src/deal.ts sceneFit):
 *   tap    a press on the screen's one action and what it opens: `action` the button's label, `done` what it says after,
 *          `result` the rows it brings (the people in the call, the room booked); with `picture` (below) the press opens
 *          a porthole onto it while the line parts round it
 *   type   a request typed into the product's input and sent (`text`, the words a person types, up to 40 characters
 *          read best; `placeholder`, the input's faint prompt; `model`, a chip beside the send button)
 *   fill   a list or a grid that fills: the rows land one by one as notifications stacking in depth (a list), or a
 *          grid's real photos pump into a row receding in depth (8 or more photos)
 *   count  a figure that rises from `from` to `to` (with `unit`) on glass cards over the change's `picture`
 *   page   the page the product makes or shows: `doc` (a document: src/content.ts CONTENT.doc, its title the change's
 *          `title` unless `heading` says otherwise) flies in and the camera travels it
 */
export type Show =
  | { kind: 'tap'; action: string; done: string; result?: Row[] }
  | { kind: 'type'; text: string; placeholder?: string; model?: string }
  | { kind: 'fill'; layout: 'list'; items: Row[]; noun?: [one: string, many: string] }
  | { kind: 'fill'; layout: 'grid'; items: Row[]; noun?: [one: string, many: string] }
  | { kind: 'count'; label: string; from: number; to: number; unit?: string; sub?: string }
  | { kind: 'page'; page: 'doc'; heading?: string; accentWord?: string };

/**
 * One change. `words`: one plain sentence, 2-6 words as read, the result the user sees. `key`: the words its accent lands
 * on. `title` and `sub`: the screen's own header (the case's names and numbers belong here). `show`: the moment that
 * proves the line.
 *
 * What the scenes can show, when the change really has it:
 *   picture  one real picture the change opens onto (a person's face, a place, the product's own shot): a press opens a
 *            porthole onto it, a count stands its cards on it
 *   photos   8 or more pictures the change is about (they pump through one card and unfold into a row in depth)
 *   logos    3 or more products it works with: official marks (`node scripts/logos.mjs get <name> --film .`, their slugs)
 *            landing as chips on orbits round the line
 *   scene    one scene by hand (a src/deal.ts HERO_META id that fits the change), with `why` (what rules the dealt one out)
 *   split    where a line that a scene parts (porthole-line) breaks: the number of words on its top line
 */
export type Change = {
  id: string;
  words: string;
  key?: string;
  /** the change's verb ('ask', 'join', 'see'): it weighs the scenes that film it; default the line's first word */
  verb?: string;
  title: string;
  sub?: string;
  show: Show;
  picture?: string;
  photos?: string[];
  logos?: string[];
  scene?: string;
  why?: string;
  split?: number;
};

/**
 * The case the session works on: `request` the one record every screen touches (the task, the item, the place: real
 * words from the brief, as the screens write them), `names` and `numbers` as they appear on screen.
 */
export type Case = { request: string; result?: string; who?: string; names?: string[]; numbers?: string[] };

export const UPDATE: { name: string; from: string; version: string; session: string; case: Case; changes: Change[] } = {
  name: IDENTITY.name,
  from: '2.3', // the version before this one (the hook may roll its changed numerals to the new one): write the real one
  version: '2.4', // the new version: write the real one
  session: '[does the one task the film follows]', // the session as a verb phrase ("plans Saturday's hike on Ridge Loop")
  case: { request: '[Row]', names: ['[Row]'], numbers: [] }, // the record every screen touches, as its screens write it
  changes: [
    {
      id: 'first',
      words: '[First change in plain words]',
      key: '[words]',
      verb: 'ask',
      title: '[Screen title]',
      sub: '[detail]',
      show: { kind: 'type', text: '[What a person types]', placeholder: '[Ask anything]' },
    },
    {
      id: 'second',
      words: '[Second change in plain words]',
      key: '[words]',
      verb: 'fill',
      title: '[Screen title]',
      show: { kind: 'fill', layout: 'list', items: [{ label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]' }, { label: '[Item]', meta: '[detail]', accent: true }], noun: ['[item]', '[items]'] },
    },
    // a third change, e.g. a press that opens a picture (a face from src/content.ts people, a place, the product's shot):
    // { id: 'third', words: '[Third change in plain words]', key: '[words]', verb: 'join', title: '[Screen title]',
    //   show: { kind: 'tap', action: '[Action]', done: '[Done]' }, picture: '[people/p01.jpg]' },
  ],
};

/** A change's sentence as it is read. */
export const spokenChange = (c: Change): string => c.words.replace(/\s*\[\]\s*/g, ' ').replace(/\s+/g, ' ').trim();

/** The pictures a change can show in a row: its `photos`, else a grid's photos with the accent one last (it ends the scene). */
export const photosOf = (c: Change): string[] => {
  if (c.photos?.length) return c.photos;
  const s = c.show;
  if (s.kind !== 'fill' || s.layout !== 'grid') return [];
  const withPhoto = s.items.filter((x) => x.photo);
  return [...withPhoto.filter((x) => !x.accent), ...withPhoto.filter((x) => x.accent)].map((x) => x.photo as string);
};
/** The one picture a change opens onto: its `picture`, else the first result's or row's photo. */
export const pictureOf = (c: Change): string | undefined => {
  if (c.picture) return c.picture;
  const s = c.show;
  const rows = s.kind === 'tap' ? s.result ?? [] : s.kind === 'fill' ? s.items : [];
  return rows.find((r) => r.accent && r.photo)?.photo ?? rows.find((r) => r.photo)?.photo ?? c.photos?.[0];
};
/** The rows a change's list holds (a list or a grid that fills; a tap's results), oldest first. */
export const rowsOf = (c: Change): Row[] => {
  const s = c.show;
  if (s.kind === 'fill') return s.items;
  if (s.kind === 'tap') return s.result ?? [];
  return [];
};

// ---- checks: the scaffold fails loudly on a content file a scene cannot draw
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const need = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(`update.ts: ${msg}`);
};
need(UPDATE.changes.length >= 2 && UPDATE.changes.length <= 3, `an update film plays the hook and 2-3 changes (it has ${UPDATE.changes.length}); a fourth change is a second film`);
need(!!UPDATE.session.trim() && !!UPDATE.case.request.trim(), 'give the session (the one task the film follows) and its case (the record every screen touches)');
need(!!UPDATE.version.trim() && !!UPDATE.from.trim(), 'give the version and the version before it');
need(new Set(UPDATE.changes.map((c) => c.id)).size === UPDATE.changes.length, 'every change needs its own id');
for (const c of UPDATE.changes) {
  const n = words(spokenChange(c));
  need(n >= 2 && n <= 6, `"${spokenChange(c)}" is ${n} words; a change is one short sentence of 2-6 words`);
  need(!!c.title.trim(), `${c.id}: the screen needs its title (the product's own header)`);
  need(!c.photos || c.photos.length >= 8, `${c.id}: photos holds 8 or more pictures (it has ${c.photos?.length}); one picture is \`picture\``);
  need(!c.logos || c.logos.length >= 3, `${c.id}: logos names 3 or more products it works with`);
  need(!c.scene || !!(c.why ?? '').trim(), `${c.id}: a scene chosen by hand needs its why (what in the change rules the dealt one out)`);
  need(c.split === undefined || (c.split >= 1 && c.split < n), `${c.id}: split is the number of words on the top line (1-${n - 1})`);
  const s = c.show;
  const rows = rowsOf(c) as (Row & { initials?: string })[];
  need(!rows.some((r) => r.initials), `${c.id}: people are real photos or absent (a row's photo), never initials`);
  if (s.kind === 'tap') need(!!s.action.trim() && !!s.done.trim() && (s.result ?? []).length <= 5, `${c.id}: a tap needs the action's label and the label it changes to (and at most 5 results)`);
  else if (s.kind === 'type') need(words(s.text) >= 2 && s.text.length <= 48, `${c.id}: a typed request is 2 words to 48 characters (it has ${s.text.length})`);
  else if (s.kind === 'fill') {
    const max = s.layout === 'grid' ? 14 : 5;
    need(s.items.length >= 3 && s.items.length <= max, `${c.id}: a ${s.layout} that fills shows 3-${max} items (it has ${s.items.length})`);
    if (s.layout === 'grid') need(s.items.every((x) => !!x.photo), `${c.id}: a grid shows pictures: every tile its real photo (a list holds items without one)`);
  } else if (s.kind === 'count') need(Number.isFinite(s.from) && Number.isFinite(s.to) && s.to !== s.from, `${c.id}: a count rises from one number to another`);
}
