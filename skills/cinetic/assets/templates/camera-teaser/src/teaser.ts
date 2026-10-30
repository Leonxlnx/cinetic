// The teaser's facts: the script's lines and every string the product shows (the request, the status, the code, the
// cards, the page, the toast, the stages), the products it really works with, and the deal. The timeline, the acts
// and the sound read this file; nothing else holds the film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, each next
// line one thing it does, 2-7 words, scripts/copy-check.py) and the product's own strings and code in place of every
// [bracket], then delete these four lines.
import type { CodeToken, GlyphName, WorldSpec } from './kit';
import { IDENTITY } from './brand/identity';
import type { Deal } from './deal';

/** A product teaser told by the camera on a dark stage: one layout per shot, the camera the animator. */
export const TEASER = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each). */
  lines: {
    what: '[Product] builds apps from a sentence.', // what it is, by 3 s: over the request box as it arrives
    build: 'It writes the code for you.', // under the app window while the code streams
    connect: 'It sends updates to [].', // over the proof: [] is the slot where the integrations' real marks roll
    close: 'Try it at [product.com].', // under the end mark: what to do
  },
  /**
   * Each line's key words, as they read in the line: the line's emphasis device lands on them (acts/stage.tsx EMPH). Name
   * the words that carry the claim, never the product's name; copy-check.py names one for a line that has none. A key
   * that is not in its line falls back to the line's last word.
   */
  keys: { what: 'a sentence', build: 'the code', close: '[product.com]' } as Record<string, string>,
  /**
   * The products it really works with, as the slugs of their real marks (node scripts/logos.mjs get <name> --film .):
   * they roll in the connect line's slot, sit on the proof cards and fill the tiles round them. Only what the product
   * really sends to or reads from; leave it empty and the slot rolls the cards' glyphs.
   */
  integrations: [] as string[],
  /** The request box: what the user types (one plain sentence) and the model chip. */
  request: { text: '[Build a booking page for my studio]', chip: '[Model]' },
  /** The app window: its title and the status chip while it works. */
  window: { title: '[booking-page]', status: '[Building the app]' },
  /** Real code from the product, streamed by line (a dozen lines or more; keywords in the accent). */
  code: [
    [{ k: 'kw', s: 'export' }, { k: 'txt', s: ' ' }, { k: 'kw', s: 'function' }, { k: 'txt', s: ' ' }, { k: 'fn', s: '[Booking]' }, { k: 'txt', s: '() {' }],
    [{ k: 'txt', s: '  ' }, { k: 'kw', s: 'const' }, { k: 'txt', s: ' [slots] = ' }, { k: 'fn', s: '[useSlots]' }, { k: 'txt', s: '(' }, { k: 'str', s: "'[studio]'" }, { k: 'txt', s: ');' }],
    [{ k: 'txt', s: '  ' }, { k: 'kw', s: 'return' }, { k: 'txt', s: ' (' }],
    [{ k: 'txt', s: '    <[Page] title=' }, { k: 'str', s: '"[Book a session]"' }, { k: 'txt', s: '>' }],
    [{ k: 'txt', s: '      <[Calendar] days={' }, { k: 'num', s: '14' }, { k: 'txt', s: '} />' }],
    [{ k: 'txt', s: '      {[slots].map((s) => (' }],
    [{ k: 'txt', s: '        <[Slot] key={s.id} time={s.time} />' }],
    [{ k: 'txt', s: '      ))}' }],
    [{ k: 'txt', s: '      <[Pay] amount={' }, { k: 'num', s: '40' }, { k: 'txt', s: '} />' }],
    [{ k: 'txt', s: '    </[Page]>' }],
    [{ k: 'txt', s: '  );' }],
    [{ k: 'txt', s: '}' }],
    [{ k: 'com', s: '// [deployed to booking.studio]' }],
  ] as CodeToken[][],
  /**
   * The product's own records behind the app: the split window's live screen (kit/data.ts filmWorld; the counts derive
   * from the rows, nothing is invented). Every bracket is a slot for the product's own words.
   */
  screen: {
    workspace: '[Workspace]',
    screen: '[Screen]',
    noun: ['[record]', '[records]'],
    statuses: [{ label: '[Live]', tone: 'accent' }, { label: '[Building]', tone: 'wait' }, { label: '[Queued]', tone: 'quiet' }],
    records: [
      { title: '[Record one]', sub: '[detail]', status: 0 },
      { title: '[Record two]', sub: '[detail]', status: 1 },
      { title: '[Record three]', sub: '[detail]', status: 2 },
      { title: '[Record four]', sub: '[detail]', status: 0 },
      { title: '[Record five]', sub: '[detail]', status: 1 },
      { title: '[Record six]', sub: '[detail]', status: 2 },
    ],
  } as WorldSpec,
  /**
   * The proof: three things it does elsewhere, each a notification. `logo` is the slug of the product it lands in
   * (its real mark on the card); without one the card shows the glyph. `when` is the time the product prints on it.
   */
  cards: [
    { logo: undefined as string | undefined, glyph: 'cart' as GlyphName, app: '[Payments]', event: '[New booking paid]', when: '[when]' },
    { logo: undefined as string | undefined, glyph: 'chat' as GlyphName, app: '[Messages]', event: '[Reminder sent]', when: '[when]' },
    { logo: undefined as string | undefined, glyph: 'clock' as GlyphName, app: '[Calendar]', event: '[Session added]', when: '[when]' },
  ],
  /** The page it made: a title word and three cards (a name, a value, two rows), then the done toast. */
  page: {
    title: '[Plans]',
    cards: [
      { name: '[Starter]', value: '[$0]', rows: ['[1 studio]', '[Online booking]'] },
      { name: '[Studio]', value: '[$19]', rows: ['[3 rooms]', '[Payments]'] },
      { name: '[Team]', value: '[$49]', rows: ['[10 rooms]', '[Reports]'] },
    ],
    toast: { title: '[App is live]', body: '[booking.studio]' },
  },
  /** The product's own stages, one word each. */
  stages: ['[Code]', '[Build]', '[Deploy]'],
  /**
   * The deal (src/deal.ts): the seed the devices come from (default the name) and any device pinned once the
   * direction asks for it, e.g. { stages: 'claim' }.
   */
  deal: { seed: undefined as string | number | undefined, devices: {} as Partial<Deal> },
};

const words = (s: string) => s.replace('[]', 'X').trim().split(/\s+/).filter(Boolean).length;
for (const [k, s] of Object.entries(TEASER.lines)) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`teaser.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (!TEASER.lines.connect.includes('[]')) throw new Error('teaser.ts: the connect line keeps its [] slot (the integrations roll in it)');
if (TEASER.stages.length !== 3) throw new Error('teaser.ts: three stages');
if (TEASER.cards.length !== 3) throw new Error('teaser.ts: three proof cards');
if (TEASER.code.length < 8) throw new Error('teaser.ts: the window streams at least 8 lines of code');
