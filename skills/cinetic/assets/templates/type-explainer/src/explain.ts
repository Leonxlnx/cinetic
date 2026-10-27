// The explainer's facts: the script's lines, the product moment, the parts of the product round its mark and the
// products it really works with. The timeline, the acts, the deal and the sound read this file; nothing else holds
// the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (the what line says what the product is,
// each next line one thing about it, 2-7 words, scripts/copy-check.py), the product's own module names, world and
// marks in place of every [bracket], then delete these four lines.
import type { GlyphName, WorldKind } from './kit';
import { IDENTITY } from './brand/identity';

/** One short sentence at a time on a lit page: the name, what it is, the problem, the promise, the product, how it fits together, its parts, the close. */
export const EXPLAIN = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each; 3-5 keep the airy sentence under 75 % of the frame). */
  lines: {
    what: '[Product] runs your [work].', // what it is, by 3 s: said word by word at the pace of speech (3-5 words read best)
    pain: 'It takes [N] apps now.', // the problem in the user's words: one line
    promise: ['[Product] puts', 'them in one app.'] as const, // the promise in two halves: the product opens in the line between them and becomes the next shot
    system: ['Each [part]', 'shares one [record].'] as const, // how it fits together: the mark stands between the halves
    close: 'Try it at [product.com].', // the close beside the name: what to do
  },
  /**
   * The product moment the promise opens onto. 'ui' (the default): the product's own screen built in code (kit
   * DenseScreen: a dense, real-feeling screen from a sample world of `world`, seeded by the name; rebuild it from the
   * product's real screens before shipping). 'photo': a supplied picture of the product in use in public/ (`src`),
   * only when the brief supplies one; never stock.
   */
  picture: { kind: 'ui' as 'ui' | 'photo', src: undefined as string | undefined, world: 'billing' as WorldKind, layout: 'table' as 'table' | 'board' },
  /**
   * The product's parts round its mark (6-10): a label, a line glyph, and `logo` when the part IS another product
   * (the slug of its real mark: node scripts/logos.mjs get <name> --film .). The first three are read, one a beat.
   */
  modules: [
    { label: '[Module one]', glyph: 'doc' },
    { label: '[Module two]', glyph: 'table' },
    { label: '[Module three]', glyph: 'globe' },
    { label: '[Module four]', glyph: 'chat' },
    { label: '[Module five]', glyph: 'pen' },
    { label: '[Module six]', glyph: 'cart' },
    { label: '[Module seven]', glyph: 'clock' },
    { label: '[Module eight]', glyph: 'team' },
  ] as { label: string; glyph: GlyphName; logo?: string }[],
  /**
   * The products it really reads from, works with or runs on: slugs of their real marks (node scripts/logos.mjs get
   * <name> --film .). With two or more, the promise's slot rolls through them and the crowded problem shows them as
   * app icons. Empty: the product's own glyphs stand in. Never a mark for a product it does not touch.
   */
  integrations: [] as string[],
  /** Re-deal the devices (src/deal.ts): any number. Undefined: the deal is seeded by the name. */
  seed: undefined as number | undefined,
  /** Pin a device per slot instead of the deal, e.g. { promise: 'lens' } (src/deal.ts DEVICES lists them). */
  devices: {} as Partial<Record<string, string>>,
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const L = EXPLAIN.lines;
for (const [k, s] of Object.entries({ what: L.what, pain: L.pain, promise: L.promise.join(' '), system: L.system.join(' '), close: L.close })) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`explain.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if ([...L.promise, ...L.system].some((f) => words(f) > 4)) throw new Error('explain.ts: each half of the promise and the system line holds at most 4 words');
if (EXPLAIN.modules.length < 6 || EXPLAIN.modules.length > 10) throw new Error('explain.ts: 6-10 modules round the mark');
if (EXPLAIN.picture.kind === 'photo' && !EXPLAIN.picture.src) throw new Error("explain.ts: picture.kind 'photo' needs picture.src (a supplied file in public/); the default 'ui' builds the product's screen in code");
