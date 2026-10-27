// The teaser's facts: the script's lines and every string the product shows (the request, the status, the code, the
// cards, the page, the toast, the stages). The timeline, the acts and the sound read this file; nothing else holds the
// film's content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, each next
// line one thing it does, 2-7 words, scripts/copy-check.py) and the product's own strings and code in place of every
// [bracket], then delete these four lines.
import type { CodeToken, GlyphName } from './kit';
import { IDENTITY } from './brand/identity';

/** A product teaser told by the camera on a dark stage: one layout per shot, the camera the animator. */
export const TEASER = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each). */
  lines: {
    what: '[Product] builds apps from a sentence.', // what it is, by 3 s: over the request box as it rises
    build: 'It writes the code for you.', // under the app window while the code streams
    connect: 'It works with your [tools].', // over the cards fanning out
    close: 'Try it at [product.com].', // under the end mark: what to do
  },
  /** The request box: its placeholder, what the user types (one plain sentence), the model chip. */
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
  /** The proof: three things it connects to, each a notification (app glyph, app, event). */
  cards: [
    { glyph: 'cart', app: '[Payments]', event: '[New booking paid]' },
    { glyph: 'chat', app: '[Messages]', event: '[Reminder sent]' },
    { glyph: 'clock', app: '[Calendar]', event: '[Session added]' },
  ] as { glyph: GlyphName; app: string; event: string }[],
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
  /** The product's own stages, one word each, rolled through in corner brackets. */
  stages: ['[Code]', '[Build]', '[Deploy]'],
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
for (const [k, s] of Object.entries(TEASER.lines)) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`teaser.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (TEASER.stages.length !== 3) throw new Error('teaser.ts: three stages roll through the brackets');
if (TEASER.cards.length !== 3) throw new Error('teaser.ts: three cards fan out');
if (TEASER.code.length < 8) throw new Error('teaser.ts: the window streams at least 8 lines of code');
