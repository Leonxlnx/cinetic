// The ad's facts: the script's lines, the product's own items (what people keep in it), the products it works with,
// and the photographs its cards may be. The timeline, the acts, the deal and the sound read this file;
// nothing else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (the opener says what the product is with
// its name first, each next line one thing about it, 2-7 words, scripts/copy-check.py) and the product's own items in
// place of every [bracket], then delete these four lines.
import type { GlyphName, TilePreview, WorldSpec } from './kit';
import { IDENTITY } from './brand/identity';

/** A short ad: the opener onto a stack of what it holds, the mark, a field round the claim, a label that swaps, two imperatives, the lockup. */
export const AD = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time. */
  lines: {
    what: '[Product] saves your [ideas].', // the opener, 3-4 words read best (5 at most), the name first: what it is, by 3 s
    save: ['Save', '[everything].'] as const, // one word either side of the stack of what it holds
    find: 'Find your next [idea].', // the claim in the field (3-5 words); its last word stands on the accent pill
    plan: ['Plan your [meals].', 'Plan your [trips].'] as const, // the label: only its last word swaps
    taglines: ['Save [the idea].', 'Make [the thing].'] as const, // two short imperatives (2-4 words, the verb first); the claim device sets the first alone
    close: 'Get it at [product.com].', // under the lockup: what to do
  },
  /**
   * Each line's key words, as they read in the line: the line's emphasis device lands on them (acts/stage.tsx EMPH). Name
   * the words that carry the claim (what it saves, what you make), never the product's name; copy-check.py names one for
   * a line that has none. A key that is not in its line falls back to the line's last word. The claim's last word stands
   * on the accent pill and the label's last word swaps: those need no key.
   */
  keys: { what: '[ideas]', 'tag.1': '[the idea]', 'tag.2': '[the thing]', close: '[product.com]' } as Record<string, string>,
  /**
   * What people keep in the product, as content tiles (kit ContentTile): a label, a sub line, a glyph and a preview of
   * what it holds (doc, chart, bars, list, person, table, code); `logo` when the item IS another product's (the slug of
   * its real mark). The stack, the field and the streams draw from these first, then from the screen's rows below.
   */
  items: [
    { label: '[Item one]', sub: '[detail]', glyph: 'doc', preview: 'doc' },
    { label: '[Item two]', sub: '[detail]', glyph: 'chart', preview: 'chart' },
    { label: '[Item three]', sub: '[detail]', glyph: 'list', preview: 'list' },
    { label: '[Item four]', sub: '[detail]', glyph: 'user', preview: 'person' },
    { label: '[Item five]', sub: '[detail]', glyph: 'table', preview: 'table' },
    { label: '[Item six]', sub: '[detail]', glyph: 'calendar', preview: 'bars' },
  ] as { label: string; sub?: string; glyph: GlyphName; preview: TilePreview; logo?: string }[],
  /**
   * The product's own screen (kit DenseScreen: the label's board and the taglines' table, and the tiles after the
   * items): its rows and statuses as the product shows them (kit/data.ts filmWorld; the counts and totals derive from
   * the rows, nothing is invented). Every bracket is a slot for the product's own words; people are optional.
   */
  screen: {
    workspace: '[Workspace]',
    screen: '[Screen]',
    noun: ['[item]', '[items]'],
    statuses: [{ label: '[Saved]', tone: 'accent' }, { label: '[In progress]', tone: 'wait' }, { label: '[New]', tone: 'quiet' }],
    records: [
      { title: '[Record one]', sub: '[detail]', status: 0 },
      { title: '[Record two]', sub: '[detail]', status: 1 },
      { title: '[Record three]', sub: '[detail]', status: 2 },
      { title: '[Record four]', sub: '[detail]', status: 0 },
      { title: '[Record five]', sub: '[detail]', status: 1 },
      { title: '[Record six]', sub: '[detail]', status: 0 },
      { title: '[Record seven]', sub: '[detail]', status: 2 },
      { title: '[Record eight]', sub: '[detail]', status: 0 },
    ],
  } as WorldSpec,
  /**
   * The products it really works with: slugs of their real marks (node scripts/logos.mjs get <name> --film .). With
   * two or more, the field and the streams carry them as app icons among the items. Never a mark for a product it does not touch.
   */
  integrations: [] as string[],
  /**
   * Photographs, when what people keep in the product is pictures, people, places or things (a recipe, an outfit, a
   * room, a trip): files in public/ (e.g. 'ad/01.jpg') that take the cards' places in turn, as rounded photo cards
   * (fx/Pictures PhotoCard: radius, rim, contact shadow) under the stack's tilt, depth and blur; the label's 'rivers'
   * then run them along two curved streams round the chip, sharp near it and soft away from it, smeared along their
   * travel (fx/Pictures ArcRiver). Real photographs only, never drawn: the product's own, the user's, or free ones whose
   * licence needs no credit (node scripts/assets.mjs search "<subject>" --fit 4:5 --clean, then get and grade them to
   * one look). Empty (the default): every card is the product's own content built in code.
   */
  pictures: [] as string[],
  /** Re-deal the devices (src/deal.ts): any number. Undefined: the deal is seeded by the name. */
  seed: undefined as number | undefined,
  /** Pin a device per slot instead of the deal, e.g. { field: 'ring' } (src/deal.ts DEVICES lists them). */
  devices: {} as Partial<Record<string, string>>,
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const L = AD.lines;
for (const [k, s] of Object.entries({ what: L.what, save: L.save.join(' '), find: L.find, plan: L.plan[0], swap: L.plan[1], close: L.close, ...Object.fromEntries(L.taglines.map((t, i) => [`tagline${i + 1}`, t])) })) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`ad.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (words(L.what) > 5 || words(L.find) > 5) throw new Error('ad.ts: the opener and the claim hold at most 5 words (each is one confident move inside a 2-3 s shot)');
if (L.save.some((w) => words(w) !== 1)) throw new Error('ad.ts: save is one word either side of the stack');
const [p0, p1] = L.plan.map((s) => s.trim().split(/\s+/));
if (p0.length !== p1.length || p0.slice(0, -1).join(' ') !== p1.slice(0, -1).join(' ')) throw new Error('ad.ts: the two plan lines share every word but the last (only the last word swaps)');
if (AD.items.length < 4) throw new Error('ad.ts: 4 or more items (the product\'s own content as tiles)');
