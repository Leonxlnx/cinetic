// The demo's facts: the script's lines and every string the product shows (the request, the model, the status, the
// steps it runs, the result). The timeline, the acts and the sound read this file; nothing else holds the content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, each next
// line one thing it does, 2-7 words, scripts/copy-check.py) and the product's own request, steps and result in place
// of every [bracket], then delete these four lines.
import type { GlyphName } from './kit';
import { IDENTITY } from './brand/identity';

/** A request goes in, the product works through it in steps, the result comes out. */
export const RUN = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each). */
  lines: {
    what: '[Product] works across your [tools].', // what it is, by 3 s: the pill's label among the tools it connects
    ask: 'Ask it for any [task].', // the pill's second label, on the kick as the tools fly off
    tell: 'Type what you need.', // over the request box, inked by a front while the request types
    done: 'Your [result] is ready.', // over the result
    close: 'Try it at [product.com].', // under the lockup: what to do
  },
  /** The tools round the pill (4-7 line glyphs). */
  tools: ['doc', 'table', 'chat', 'globe', 'code', 'team'] as GlyphName[],
  /** The request as the user types it (one plain sentence, 6-14 words; an @mention reads as the product's own). */
  request: '[Plan the launch with @team for next week]',
  /** The model chip in the request box. */
  chip: '[Model]',
  /** The status line while it works. */
  status: '[Working]',
  /** The steps it runs (3-5): a verb and its object, the last one still running when the act cuts. */
  steps: [
    { verb: '[Read]', detail: '[the brief and the calendar]' },
    { verb: '[Draft]', detail: '[the launch plan]' },
    { verb: '[Assign]', detail: '[tasks to the team]' },
    { verb: '[Schedule]', detail: '[the review]' },
  ],
  /** The result card: what it made. */
  result: { title: '[Launch plan]', body: '[4 tasks, 3 owners, 1 review]', meta: '[now]', glyph: 'check' as GlyphName },
} as const;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
for (const [k, s] of Object.entries(RUN.lines)) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`run.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (RUN.steps.length < 3 || RUN.steps.length > 5) throw new Error('run.ts: 3-5 steps');
if (RUN.tools.length < 4 || RUN.tools.length > 7) throw new Error('run.ts: 4-7 tools round the pill');
if (RUN.request.length > 72) throw new Error('run.ts: the request is one sentence that fits the box (72 characters at most)');
