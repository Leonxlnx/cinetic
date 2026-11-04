// The reel's facts: the script's lines and every string the product UI shows. The timeline, the acts and the sound
// read this file; nothing else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, 2-7 words
// a line, scripts/copy-check.py) and the product's own sources, record fields and capabilities in place of every
// [bracket], rebuild the product's real record where the kit stands in, then delete these four lines.
import type { GlyphName } from './kit';
import { IDENTITY } from './brand/identity';

/** A launch close: what it connects to, one real record, the statement, what it can do, the claim, the name. */
export const REEL = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line at a time (2-7 words each); the claim is built in two fragments; the tagline holds to the end. */
  lines: {
    sources: '[Product] turns [sources] into [data].', // what it is, by 3 s (up to 5 words fit the act): centred inside the ring of sources
    statement: 'Every [record] gets [its fields filled].', // the result the user sees on each record, on the light card that squashes round it
    claim: ['It exports to', '[N] formats.'] as const, // what it does, on the accent, in two beats
    title: '[Product] is out today.', // the end card's title: the name (from IDENTITY, whole) pops, the rest types
    tagline: 'Try it at [product.com].', // what to do: takes the title's place and holds to the end
  },
  /**
   * The sources around the first line (8-12): the products it really reads from or works with. `logo` is the slug of
   * the source's real mark (node scripts/logos.mjs get <name> --film .): when every source has its mark the ring is
   * app-icon tiles; a source without one is a pill with its name (and `glyph`, a generic stand-in) until it is fetched.
   */
  sources: [
    { label: '[Source one]', logo: '[source-one]', glyph: 'globe' },
    { label: '[Source two]', logo: '[source-two]', glyph: 'doc' },
    { label: '[Source three]', logo: '[source-three]', glyph: 'table' },
    { label: '[Source four]', logo: '[source-four]', glyph: 'image' },
    { label: '[Source five]', logo: '[source-five]', glyph: 'chat' },
    { label: '[Source six]', logo: '[source-six]', glyph: 'cart' },
    { label: '[Source seven]', logo: '[source-seven]', glyph: 'play' },
    { label: '[Source eight]', logo: '[source-eight]', glyph: 'link' },
    { label: '[Source nine]', logo: '[source-nine]', glyph: 'braces' },
    { label: '[Source ten]', logo: '[source-ten]', glyph: 'search' },
  ] as { label: string; logo?: string; glyph: GlyphName }[],
  /**
   * One real record the product returns: a picture, its fields, three tags and one measure. `photo` is the record's
   * real picture, a public/ path (the product's own, or node scripts/assets.mjs search "<the record's subject>" --kind
   * photo --no-people [--fit 4:5], get '#n' --to public/assets, grade): a person, a place or a product is a photograph,
   * never drawn. Empty, the picture slot shows the file it is (kit FileThumb) until the photo is in.
   */
  record: {
    photo: '' as string,
    /** Without a photo, the record shows as its file: the file's own name and size as the product lists them. */
    file: { name: '[record-file.pdf]', size: '[size]' },
    rows: [
      { label: '[Field]', value: '[Value]' },
      { label: '[Field]', value: '[Value]' },
      { label: '[Field]', value: '[Value]' },
      { label: '[Field]', value: '[Value]' },
      { label: '[Field]', value: '[Value]' },
      { label: '[Field]', value: '[Value]' },
    ],
    tags: ['[Tag]', '[Tag]', '[Tag]'],
    measure: { label: '[Measure]', value: 0.82 },
  },
  /** What it can return, one noun each with its generic glyph (12-14): the ticker steps through them. A capability that
   *  is another product (an export to it, a model it runs) takes that product's mark too (`logo`, as for the sources). */
  capabilities: [
    { word: '[Format one]', glyph: 'braces' },
    { word: '[Format two]', glyph: 'doc' },
    { word: '[Format three]', glyph: 'table' },
    { word: '[Format four]', glyph: 'image' },
    { word: '[Format five]', glyph: 'link' },
    { word: '[Format six]', glyph: 'list' },
    { word: '[Format seven]', glyph: 'search' },
    { word: '[Format eight]', glyph: 'star' },
    { word: '[Format nine]', glyph: 'monitor' },
    { word: '[Format ten]', glyph: 'pen' },
    { word: '[Format eleven]', glyph: 'speaker' },
    { word: '[Format twelve]', glyph: 'camera' },
    { word: '[Format thirteen]', glyph: 'code' },
  ] as { word: string; glyph: GlyphName; logo?: string }[],
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
for (const [k, s] of Object.entries({ ...REEL.lines, claim: REEL.lines.claim.join(' ') })) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`reel.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (REEL.lines.claim.some((f) => words(f) > 5)) throw new Error('reel.ts: each claim fragment holds at most 5 words');
const claimEnd: string = REEL.lines.claim[1];
if (!claimEnd.endsWith('.')) throw new Error(`reel.ts: the claim's second fragment ("${claimEnd}") ends on a full stop: the camera zooms through that square into the rings`);
if (REEL.sources.length < 6 || REEL.sources.length > 12) throw new Error('reel.ts: 6-12 sources around the first line');
if (REEL.capabilities.length < 8) throw new Error('reel.ts: the ticker needs 8 or more capabilities');
