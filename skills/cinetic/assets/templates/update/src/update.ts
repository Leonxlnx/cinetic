// The update film's facts: the version, the changes and the product moment that shows each one. The
// timeline, the acts and the sound all read this file; nothing else holds the film's content.
//
// cinetic:placeholder - an invented release of an invented product: write the real version, 2-4 real
// changes (each one plain sentence of 2-6 words that says the result the user sees, never a feature name
// or a fancy word: scripts/copy-check.py) and the product moment each one uses (rebuild the product's own
// UI for it, src/kit is the floor), then delete these four lines.
import { IDENTITY } from './brand/identity';

/**
 * How a change is shown: a product surface doing the new thing, on its beat. The four kit moments are the
 * floor until the product's own screens are rebuilt: a review that gets approved, a thread whose answer
 * lands, a figure that starts to climb, a budget that takes a new entry.
 */
export type Moment = 'approve' | 'chat' | 'count' | 'budget';
export type Change = { id: string; words: string; moment: Moment };

export const UPDATE: { name: string; from: string; version: string; changes: Change[] } = {
  name: IDENTITY.name,
  from: '2.3', // the version the film starts on: its last numeral rolls to the new one
  version: '2.4',
  changes: [
    { id: 'approve', words: 'Approvals take one tap', moment: 'approve' },
    { id: 'threads', words: 'Replies land in place', moment: 'chat' },
    { id: 'live', words: 'View counts run live', moment: 'count' },
  ],
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
if (UPDATE.changes.length < 2 || UPDATE.changes.length > 4) throw new Error(`update.ts: an update film shows 2-4 changes (it has ${UPDATE.changes.length})`);
// one short sentence per change: at the template's 120 BPM a change's bar holds 3-4 words read in full (more needs a slower track or a longer change)
for (const c of UPDATE.changes) if (words(c.words) < 2 || words(c.words) > 6) throw new Error(`update.ts: "${c.words}" is ${words(c.words)} words; a change is one short sentence of 2-6 words`);
if (UPDATE.from.length !== UPDATE.version.length) throw new Error('update.ts: from and version need the same number of characters (pad the old one, e.g. 1.9 -> 2.0)');
