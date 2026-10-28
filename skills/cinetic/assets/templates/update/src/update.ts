// The update film's facts: the version, the changes and the product moment that shows each one. The
// timeline, the acts and the sound all read this file; nothing else holds the film's content.
//
// cinetic:placeholder - an invented release of an invented product: write the real version, 2-4 real
// changes (each one plain sentence of 2-6 words that says the result the user sees, never a feature name
// or a fancy word: scripts/copy-check.py) and the product moment each one uses (rebuild the product's own
// UI for it, src/kit is the floor), then delete these four lines.
import { IDENTITY } from './brand/identity';

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
