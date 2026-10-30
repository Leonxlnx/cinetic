// The walkthrough's facts: the script's lines and every string and number the product UI shows. The timeline, the
// acts and the sound read this file; nothing else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, each next
// line one thing it does, 2-7 words, scripts/copy-check.py) and the product's own strings and numbers in place of
// every [bracket], rebuild the product's real screens where the kit stands in, then delete these four lines.
import { IDENTITY } from './brand/identity';
import type { IconName } from './kit/icons';

/** The story the UI tells: the input goes in, the product reads it, finds what matters, the user picks, it builds the output. */
export const WALK = {
  name: IDENTITY.name,
  /**
   * The script, plain words, one clean line on screen at a time (2-7 words each, counted as read); the end card's line
   * holds to the end. "[]" in the promise is where the input's source mark sits inside the sentence (it is read as
   * `input.sourceName`); in the claim it is where the claim's object sits (the device 'object'; at the line's head when
   * the claim has none).
   */
  lines: {
    promise: '[Product] turns [] [inputs] into [outputs].', // what it is, by 3 s, with the source's mark in the line
    claim: 'Setup takes [N] minutes.', // the speed claim, with a verb: on the accent, pushed through, or with its object
    step1: 'Paste in [your input].', // step one, over the field
    insight: 'It finds what [people] ask for.', // what the product found
    pick: '[Product] builds the [output] you chose.', // step three, over the choice: what it makes from the pick
    payoff: 'Try it free at [product.com].', // the close, beside the name: what to do
  },
  /**
   * Each line's key words, as they read in the line: the line's emphasis device lands on them (acts/type.tsx EMPH). Name
   * the words that carry the claim (the output, the number, the result), never the product's name; copy-check.py names
   * one for a line that has none. A key that is not in its line falls back to the line's last word.
   */
  keys: { promise: '[outputs]', claim: '[N] minutes', step1: '[your input]', insight: '[people]', pick: '[output]', payoff: '[product.com]' } as Record<string, string>,
  /**
   * The user's input as one object (a channel, a store, a repository, a document): it becomes the output in place.
   * `source` is the slug of the real mark of the product it lives on (node scripts/logos.mjs get <name> --film .): the
   * card shows it on an app-icon tile, the field leads with it and the promise holds it in its line; until it is fetched,
   * a chip with `sourceName`, the way that product's name is written (the word its mark stands for).
   */
  input: { title: '[Your input]', handle: '[@your-handle]', stats: ['[N] [items]', '[N] [people]'], source: '[source-slug]', sourceName: '[Source]' },
  /** The claim's object (claim device 'object'): the generic glyph of what the claim measures (a clock for time). */
  claimObject: 'clock',
  /** The output the product makes from it, and the three steps it shows while it works. */
  output: { title: '[Your output]', sub: '[What it does for you]', steps: ['[Reading the input]', '[Finding the pattern]', '[Building the result]'] },
  /** Proof: results arriving as notices, faster and faster. `glyph` (optional, a kit icon name) only when it is the item's own sign. */
  proof: [
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
  ] as { title: string; body: string; meta: string; glyph?: IconName }[],
  /** Step one: the field's placeholder (erased), the value typed in, the action and its busy label. */
  field: { placeholder: '[Paste a link here]', value: '[your-input.link]', action: '[Go]', busy: '[Reading]' },
  /** What the product found for the input: six results that develop in. */
  results: [
    { title: '[First result title]', meta: '[meta]', badge: '[0:42]' },
    { title: '[Second result title]', meta: '[meta]', badge: '[1:10]' },
    { title: '[Third result title]', meta: '[meta]', badge: '[0:58]' },
    { title: '[Fourth result title]', meta: '[meta]', badge: '[2:04]' },
    { title: '[Fifth result title]', meta: '[meta]', badge: '[0:37]' },
    { title: '[Sixth result title]', meta: '[meta]', badge: '[1:26]' },
  ],
  /**
   * Step two: what the product reads (a count of it beside), landing on the item that matters. Each row is a real person and
   * what they wrote. `total` is the product's own count, written as it reads ("3,412"): the counter climbs to it.
   */
  feed: {
    label: '[Reading]',
    unit: '[items]',
    total: '[3,412]',
    key: 6, // the row the read lands on: the insight
    rows: [
      { who: '[Name]', initials: '[AB]', text: '[A reply, a review, a request]' },
      { who: '[Name]', initials: '[CD]', text: '[Another one, a little longer]' },
      { who: '[Name]', initials: '[EF]', text: '[A question about the product]' },
      { who: '[Name]', initials: '[GH]', text: '[Something people keep asking]' },
      { who: '[Name]', initials: '[IJ]', text: '[A short one]' },
      { who: '[Name]', initials: '[KL]', text: '[A detail worth reading]' },
      { who: '[Name]', initials: '[MN]', text: '[The thing everyone wants]' },
      { who: '[Name]', initials: '[OP]', text: '[One more voice]' },
      { who: '[Name]', initials: '[QR]', text: '[And another]' },
    ],
  },
  /** The insight pill: what the product found and how often. */
  insight: { text: '[The insight]', count: '[N]x' },
  /** Step three: what the product can make from it; the user picks one. `glyph` (optional) only when it is the option's own sign. */
  options: [
    { title: '[Option one]', meta: '[what it is]', value: '[price]' },
    { title: '[Option two]', meta: '[what it is]', value: '[price]' },
    { title: '[Option three]', meta: '[what it is]', value: '[price]' },
  ] as { title: string; meta: string; value: string; glyph?: IconName }[],
  pick: 1,
  build: { label: '[Building your output]' },
  /** The output, live: the page the product made. */
  page: { headline: '[Your page headline]', sub: '[The promise in one line]', cta: '[Get it]', rows: ['[Section one]', '[Section two]', '[Section three]'] },
  /**
   * Real photographs, public/ paths (node scripts/assets.mjs search "<subject>" --kind photo [--people | --no-people]
   * [--fit 1:1], then get '#n' --to public/assets and grade): `people` are the feed's faces in row order (one real
   * portrait per person, --people --fit 1:1; the first two also stand beside the card), `results` the found items'
   * pictures when they are pictures (a clip's frame, a product, a place: --no-people), `input` the input's own picture
   * when its source has no mark. Empty, the people show as the product's initials, the results as its own tiles and the
   * input as its initials: never a drawn face or thing (lint-film and the layout audit fail one).
   */
  photos: { people: [] as string[], results: [] as string[], input: '' as string },
} as const;

/** A line as it is read: its object slot "[]" read as the word it stands for (`object`; none: the slot is a picture). */
export const spoken = (s: string, object = ''): string => s.replace(/\s*\[\]\s*/g, object ? ` ${object} ` : ' ').replace(/\s+/g, ' ').trim();
/** The promise as it is read (its COPY text): the mark read as the source's name. */
export const PROMISE = spoken(WALK.lines.promise, WALK.input.sourceName);
/** The claim as it is read: its object is a picture, not a word. */
export const CLAIM = spoken(WALK.lines.claim);
/** A line with its object slot: the slot where the line has one, else at its head. */
export const withSlot = (s: string): string => (s.includes('[]') ? s : `[] ${s}`);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
for (const [k, raw] of Object.entries(WALK.lines)) {
  const s = k === 'promise' ? PROMISE : spoken(raw);
  if (words(s) < 2 || words(s) > 7) throw new Error(`walk.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (WALK.feed.key >= WALK.feed.rows.length) throw new Error('walk.ts: feed.key must name one of the feed rows');
if (WALK.pick >= WALK.options.length) throw new Error('walk.ts: pick must name one of the options');
