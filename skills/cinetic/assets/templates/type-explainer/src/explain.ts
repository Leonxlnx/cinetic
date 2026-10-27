// The explainer's facts: the script's lines, the picture and the parts of the product round its mark. The timeline,
// the acts and the sound read this file; nothing else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (the what line says what the product is,
// each next line one thing about it, 2-7 words, scripts/copy-check.py), the product's own module names and picture in
// place of every [bracket], then delete these four lines.
import type { GlyphName } from './kit';
import { IDENTITY } from './brand/identity';

/** One short sentence at a time on a white page: the name, what it is, the problem, the promise, the picture, how it fits together, its parts, the close. */
export const EXPLAIN = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each; 3-5 keep the small airy line under 61 % of the frame). */
  lines: {
    what: '[Product] runs your [work].', // what it is, by 3 s: said word by word at the pace of speech (3-5 words read best)
    pain: 'It takes [N] apps now.', // the problem in the user's words: one line, a drift, gone
    promise: ['[Product] puts', 'them in one app.'] as const, // the promise in two halves: the picture opens between them and becomes the next shot
    system: ['Each [part]', 'shares one [record].'] as const, // how it fits together: the mark stands between the halves
    close: 'Try it at [product.com].', // the close beside the name: what to do
  },
  /** The picture the promise opens onto: the product in use, or the people it is for (a supplied src; the kit's still life until then). */
  picture: { src: undefined as string | undefined, seed: 7 },
  /** The product's parts round its mark (6-10), each with a line glyph; the first three get a label, one a beat. */
  modules: [
    { label: '[Module one]', glyph: 'doc' },
    { label: '[Module two]', glyph: 'table' },
    { label: '[Module three]', glyph: 'globe' },
    { label: '[Module four]', glyph: 'chat' },
    { label: '[Module five]', glyph: 'pen' },
    { label: '[Module six]', glyph: 'cart' },
    { label: '[Module seven]', glyph: 'clock' },
    { label: '[Module eight]', glyph: 'team' },
  ] as { label: string; glyph: GlyphName }[],
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const L = EXPLAIN.lines;
for (const [k, s] of Object.entries({ what: L.what, pain: L.pain, promise: L.promise.join(' '), system: L.system.join(' '), close: L.close })) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`explain.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if ([...L.promise, ...L.system].some((f) => words(f) > 4)) throw new Error('explain.ts: each half of the promise and the system line holds at most 4 words');
if (EXPLAIN.modules.length < 6 || EXPLAIN.modules.length > 10) throw new Error('explain.ts: 6-10 modules round the mark');
