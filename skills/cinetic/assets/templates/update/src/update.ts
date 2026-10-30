// The update film's facts: the version, the changes and the product moment that shows each one. The
// timeline, the acts and the sound all read this file; nothing else holds the film's content.
//
// cinetic:placeholder - an invented release of an invented product: write the real version, 2-4 real
// changes (each one plain sentence of 2-6 words that says the result the user sees, never a feature name
// or a fancy word: scripts/copy-check.py) and the product moment each one uses (rebuild the product's own
// UI for it, src/kit is the floor), then delete these four lines.
import { IDENTITY } from './brand/identity';
import type { BudgetData, ReviewData, WorldSpec } from './kit';

/**
 * How a change is shown: a product surface doing the new thing, on its beat. The five kit moments are the
 * floor until the product's own screens are rebuilt: a review that gets approved, a thread whose answer
 * lands, a figure that starts to climb, a budget that takes a new entry, a dense table whose readable row
 * travels to the row the change touched (kit DenseScreen).
 */
export type Moment = 'approve' | 'chat' | 'count' | 'budget' | 'table';
/**
 * One change. `words`: one plain sentence (2-6 words as read). A change that works with another product names it
 * with "[]" where its real mark sits inside the sentence: `logo` is the slug of that mark (node scripts/logos.mjs get
 * <name> --film .), `logoName` how the product's name is written (read in the mark's place; shown as a chip with the
 * name until the mark is fetched).
 */
/** photos: the real pictures the moment shows (public/ paths): the four selects an 'approve' review approves. Empty, they show as the files they are. */
/** key: the change's key words as they read in it (the line's emphasis lands on them; else its last word). */
export type Change = { id: string; words: string; moment: Moment; logo?: string; logoName?: string; photos?: string[]; key?: string };

export const UPDATE: { name: string; from: string; version: string; changes: Change[] } = {
  name: IDENTITY.name,
  from: '2.3', // the version the film starts on: its last numeral rolls to the new one (hook device 'roll')
  version: '2.4',
  changes: [
    { id: 'approve', words: 'Approvals take one tap', moment: 'approve', key: 'one tap' },
    { id: 'threads', words: 'Replies land in []', moment: 'chat', logo: '[source-slug]', logoName: '[Source]', key: 'Replies' },
    { id: 'live', words: 'View counts run live', moment: 'table', key: 'live' },
  ],
};

/**
 * What each product moment shows, in the product's own words (every bracket is a slot): the review a change approves
 * or replies in ('approve', 'chat'), the figure a 'count' counts, the rows of a 'table' (kit/data.ts filmWorld: the
 * counts derive from the rows) and the categories of a 'budget'. The kit draws only what is given here; a moment given
 * nothing draws an empty box and fails precheck. The numbers are stand-ins too: the product's own before the first still.
 */
export const MOMENTS: { review: ReviewData; count: { label: string; from: number; perSec: number }; table: WorldSpec; budget: BudgetData } = {
  review: {
    team: [{ initials: '[AB]', name: '[Name]' }, { initials: '[CD]', name: '[Name]' }, { initials: '[EF]', name: '[Name]' }],
    project: {
      title: '[Project]',
      meta: '[what it is]',
      shots: 4,
      approved: 0,
      status: { open: '[In review]', done: '[Approved]' },
      label: '[Selects]',
      files: [{ name: '[file one]', size: '[size]' }, { name: '[file two]', size: '[size]' }, { name: '[file three]', size: '[size]' }, { name: '[file four]', size: '[size]' }],
    },
    actions: { approve: '[Approve]', done: '[Approved]', count: (n: number, of: number) => `${n} / ${of}` },
    chat: { title: '[Thread]', draft: '[Reply]', lines: [{ text: '[A question]', side: 'in' }, { text: '[The answer]', side: 'out' }, { text: '[A thank-you]', side: 'in' }] },
    feed: { title: '[Comments]', count: 0, rows: [] },
    stats: { approved: { label: '[Approved]', value: 0, of: 4 }, saves: { label: '[Saves]', from: 0, perSec: 0 }, views: { label: '[Views]', from: 0, perSec: 0, since: '[since]' } },
  },
  count: { label: '[What it counts]', from: 18240, perSec: 140 },
  table: {
    workspace: '[Workspace]',
    screen: '[Screen]',
    noun: ['[row]', '[rows]'],
    statuses: [{ label: '[Live]', tone: 'accent' }, { label: '[Updated]', tone: 'done' }, { label: '[Draft]', tone: 'quiet' }],
    records: [
      { title: '[Row one]', sub: '[detail]', status: 1 },
      { title: '[Row two]', sub: '[detail]', status: 1 },
      { title: '[Row three]', sub: '[detail]', status: 2 },
      { title: '[Row four]', sub: '[detail]', status: 1 },
      { title: '[Row five]', sub: '[detail]', status: 2 },
      { title: '[Row six]', sub: '[detail]', status: 0 },
      { title: '[Row seven]', sub: '[detail]', status: 1 },
    ],
  },
  budget: {
    team: '[Team]',
    period: '[Month]',
    categories: [
      { name: '[Category one]', glyph: 'cart', budget: 1200, spent: 640 },
      { name: '[Category two]', glyph: 'doc', budget: 800, spent: 310 },
      { name: '[Category three]', glyph: 'team', budget: 500, spent: 420 },
    ],
    weeks: [],
    toast: { amount: 86, category: '[Category one]', when: '[when]' },
    report: { title: '[Report]', meta: '[period]' },
    people: [],
  },
};

/** A change's sentence as it is read: its mark read as the product's name. */
export const spokenChange = (c: Change): string => c.words.replace(/\s*\[\]\s*/g, ` ${c.logoName ?? ''} `).replace(/\s+/g, ' ').trim();

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
if (UPDATE.changes.length < 2 || UPDATE.changes.length > 4) throw new Error(`update.ts: an update film shows 2-4 changes (it has ${UPDATE.changes.length})`);
// one short sentence per change: at the template's 120 BPM a change is two bars, the product moment and then its words read
// in full under the push (a longer sentence needs a slower track or a longer change)
for (const c of UPDATE.changes) {
  const n = words(spokenChange(c));
  if (n < 2 || n > 6) throw new Error(`update.ts: "${spokenChange(c)}" is ${n} words; a change is one short sentence of 2-6 words`);
  if (c.words.includes('[]') && !c.logoName) throw new Error(`update.ts: "${c.words}" holds a mark ([]): give its logoName (and its logo slug once fetched)`);
}
if (UPDATE.from.length !== UPDATE.version.length) throw new Error('update.ts: from and version need the same number of characters (pad the old one, e.g. 1.9 -> 2.0)');
