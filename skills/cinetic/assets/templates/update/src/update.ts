// The update film's facts: the version, the changes and the product moment that shows each one. The
// timeline, the acts and the sound all read this file; nothing else holds the film's content.
//
// cinetic:placeholder - an invented release of an invented product: write the real version, 2-4 real
// changes (each a product fact in 1-3 words, never a feature list) and the product moment each one uses
// (rebuild the product's own UI for it, src/kit is the floor), then delete these three lines.
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
    { id: 'approve', words: 'One-tap approvals', moment: 'approve' },
    { id: 'threads', words: 'Replies in place', moment: 'chat' },
    { id: 'live', words: 'Live view counts', moment: 'count' },
  ],
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
if (UPDATE.changes.length < 2 || UPDATE.changes.length > 4) throw new Error(`update.ts: an update film shows 2-4 changes (it has ${UPDATE.changes.length})`);
for (const c of UPDATE.changes) if (words(c.words) < 1 || words(c.words) > 3) throw new Error(`update.ts: "${c.words}" is ${words(c.words)} words; a change is 1-3 words`);
if (UPDATE.from.length !== UPDATE.version.length) throw new Error('update.ts: from and version need the same number of characters (pad the old one, e.g. 1.9 -> 2.0)');
