// The walkthrough's facts: the script's lines and every string and number the product UI shows. The timeline, the
// acts and the sound read this file; nothing else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, each next
// line one thing it does, 2-7 words, scripts/copy-check.py) and the product's own strings and numbers in place of
// every [bracket], rebuild the product's real screens where the kit stands in, then delete these four lines.
import { IDENTITY } from './brand/identity';

/** The story the UI tells: the input goes in, the product reads it, finds what matters, the user picks, it builds the output. */
export const WALK = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each); the end card's line holds to the end. */
  lines: {
    promise: '[Product] is a [category].', // what it is, by 3 s (4-5 words fit the act): word by word, the last word snapping the line larger
    claim: 'Setup takes [N] minutes.', // the speed claim, with a verb: its first word giant, then the line
    step1: 'Paste in [your input].', // step one, over the field
    insight: 'It finds what [people] ask for.', // what the product found
    pick: '[Product] builds your pick.', // step three, over the choice
    payoff: 'Try it free at [product.com].', // the close, beside the name: what to do
  },
  /** The user's input as one object (a channel, a store, a repository, a document): it becomes the output in place. */
  input: { title: '[Your input]', handle: '[@your-handle]', stats: ['[N] [items]', '[N] [people]'] },
  /** The output the product makes from it, and the three steps it shows while it works. */
  output: { title: '[Your output]', sub: '[What it does for you]', steps: ['[Reading the input]', '[Finding the pattern]', '[Building the result]'] },
  /** Proof: results arriving as notices, faster and faster. */
  proof: [
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
    { title: '[New result]', body: '[Detail] [amount]', meta: '[now]' },
  ],
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
  /** Step two: the feed the product reads (a counter climbing beside it), landing on the item that matters. */
  feed: {
    label: '[Reading]',
    unit: '[items]',
    total: 3412,
    key: 6, // the row the flick lands on: the insight
    rows: [
      { who: '[Name]', initials: 'AB', text: '[A reply, a review, a request]' },
      { who: '[Name]', initials: 'CD', text: '[Another one, a little longer]' },
      { who: '[Name]', initials: 'EF', text: '[A question about the product]' },
      { who: '[Name]', initials: 'GH', text: '[Something people keep asking]' },
      { who: '[Name]', initials: 'IJ', text: '[A short one]' },
      { who: '[Name]', initials: 'KL', text: '[A detail worth reading]' },
      { who: '[Name]', initials: 'MN', text: '[The thing everyone wants]' },
      { who: '[Name]', initials: 'OP', text: '[One more voice]' },
      { who: '[Name]', initials: 'QR', text: '[And another]' },
    ],
  },
  /** The insight pill: what the product found and how often. */
  insight: { text: '[The insight]', count: '[N]x' },
  /** Step three: what the product can make from it; the user picks one. */
  options: [
    { title: '[Option one]', meta: '[what it is]', value: '[price]' },
    { title: '[Option two]', meta: '[what it is]', value: '[price]' },
    { title: '[Option three]', meta: '[what it is]', value: '[price]' },
  ],
  pick: 1,
  build: { label: '[Building your output]' },
  /** The output, live: the page the product made. */
  page: { headline: '[Your page headline]', sub: '[The promise in one line]', cta: '[Get it]', rows: ['[Section one]', '[Section two]', '[Section three]'] },
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
for (const [k, s] of Object.entries(WALK.lines)) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`walk.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (WALK.feed.key >= WALK.feed.rows.length) throw new Error('walk.ts: feed.key must name one of the feed rows');
if (WALK.pick >= WALK.options.length) throw new Error('walk.ts: pick must name one of the options');
