// The ad's facts: the script's lines and the pictures. The timeline, the acts and the sound read this file; nothing
// else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (the opener says what the product is with
// its name first, each next line one thing about it, 2-7 words, scripts/copy-check.py) and put the ad's own pictures
// in public/ (every [bracket] replaced), then delete these four lines.
import { IDENTITY } from './brand/identity';

/** A 15 s ad on a white page: the opener built word by word, a pile of pictures, the mark, a wall, two rivers, the taglines, the lockup. */
export const AD = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time. */
  lines: {
    what: '[Product] saves your [ideas].', // the opener, 3-5 words, the name first (it lands oversized): what it is, by 3 s
    save: ['Save', '[everything].'] as const, // one word either side of the pile of pictures
    find: 'Find your next [idea].', // the claim in the wall's gap (3-5 words); its last word stands on the accent pill
    plan: ['Plan your [meals].', 'Plan your [trips].'] as const, // the label over the rivers: only its last word swaps
    taglines: ['Save [the idea].', 'Make [the thing].'] as const, // two short imperatives over the hero picture (2-4 words, the verb first)
    close: 'Get it at [product.com].', // under the lockup: what to do
  },
  /**
   * The ad's own pictures, files in public/ (e.g. 'ad/01.jpg'): the plate behind the mark, the hero behind the taglines,
   * then the cards (the pile, the wall and the rivers draw from them in turn). The kit's still life fills an empty slot.
   */
  pictures: { plate: undefined as string | undefined, hero: undefined as string | undefined, cards: [] as string[] },
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const L = AD.lines;
for (const [k, s] of Object.entries({ what: L.what, save: L.save.join(' '), find: L.find, plan: L.plan[0], swap: L.plan[1], close: L.close, ...Object.fromEntries(L.taglines.map((t, i) => [`tagline${i + 1}`, t])) })) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`ad.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (words(L.what) > 5 || words(L.find) > 5) throw new Error('ad.ts: the opener and the claim hold at most 5 words (they are built word by word inside a 2 s shot)');
if (L.save.some((w) => words(w) !== 1)) throw new Error('ad.ts: save is one word either side of the pile');
const [p0, p1] = L.plan.map((s) => s.trim().split(/\s+/));
if (p0.length !== p1.length || p0.slice(0, -1).join(' ') !== p1.slice(0, -1).join(' ')) throw new Error('ad.ts: the two plan lines share every word but the last (only the last word swaps)');
