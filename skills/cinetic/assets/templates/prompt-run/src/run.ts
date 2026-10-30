// The demo's facts: the script's lines and every string the product shows (the request, the model, the status, the
// steps it runs, the result), the tools it really connects (as their real marks) and the people it works for. The
// timeline, the acts and the sound read this file; nothing else holds the content.
//
// cinetic:placeholder - slots, not copy: write the script in plain words (line 1 says what the product is, each next
// line one thing it does, 2-7 words, scripts/copy-check.py) and the product's own request, steps and result in place
// of every [bracket], then delete these four lines.
import type { GlyphName, WorldSpec } from './kit';
import { IDENTITY } from './brand/identity';

/** A request goes in, the product works through it in steps, the result comes out. */
export const RUN = {
  name: IDENTITY.name,
  /** The script, plain words, one clean line on screen at a time (2-7 words each). */
  lines: {
    what: '[Product] works across your tools.', // what it is, by 3 s: the pill's label among the tools it connects
    ask: 'Ask it for any [task].', // the pill's second label, on the kick
    tell: 'Type what you need.', // over the request box while the request types
    done: 'Your [result] is ready.', // over the result
    close: 'Try it at [product.com].', // under the lockup: what to do
  },
  /**
   * Each line's key words, as they read in the line: the line's emphasis device lands on them (acts/stage.tsx EMPH). Name
   * the words that carry the claim (the result, the task, the tools), never the product's name; copy-check.py names one
   * for a line that has none. A key that is not in its line falls back to the line's last word.
   */
  keys: { what: 'your tools', ask: '[task]', tell: 'what you need', done: '[result]', close: '[product.com]' } as Record<string, string>,
  /**
   * The tools it really connects (4-7): `logo` is the slug of a real mark fetched with node scripts/logos.mjs get <name>
   * --film . (its app-icon tile), `glyph` the generic glyph drawn when there is no mark. Only what the product really
   * reads from or writes to.
   */
  tools: [
    { logo: undefined as string | undefined, glyph: 'doc' as GlyphName },
    { logo: undefined as string | undefined, glyph: 'table' as GlyphName },
    { logo: undefined as string | undefined, glyph: 'chat' as GlyphName },
    { logo: undefined as string | undefined, glyph: 'globe' as GlyphName },
    { logo: undefined as string | undefined, glyph: 'code' as GlyphName },
  ],
  /** The request as the user types it (one plain sentence, 6-14 words; an @mention reads as the product's own). */
  request: '[Plan the launch with @team for next week]',
  /** The model chip in the request box. */
  chip: '[Model]',
  /** The people the work is for (2-4 initials; their faces are photos.people, else these initials): the @mention's team. */
  people: ['[AK]', '[JM]', '[RS]'],
  /** The status line while it works. */
  status: '[Working]',
  /** The steps it runs (3-5): a verb and its object, the last one still running when the act cuts. */
  steps: [
    { verb: '[Read]', detail: '[the brief and the calendar]' },
    { verb: '[Draft]', detail: '[the launch plan]' },
    { verb: '[Assign]', detail: '[tasks to the team]' },
    { verb: '[Schedule]', detail: '[the review]' },
  ],
  /**
   * The product's own records behind the work: the split run's live screen, one row per step it runs and more
   * (kit/data.ts filmWorld; the counts derive from the rows, nothing is invented). Every bracket is a slot.
   */
  screen: {
    workspace: '[Workspace]',
    screen: '[Screen]',
    noun: ['[task]', '[tasks]'],
    statuses: [{ label: '[Done]', tone: 'accent' }, { label: '[Running]', tone: 'wait' }, { label: '[Queued]', tone: 'quiet' }],
    records: [
      { title: '[Record one]', sub: '[detail]', status: 0 },
      { title: '[Record two]', sub: '[detail]', status: 1 },
      { title: '[Record three]', sub: '[detail]', status: 2 },
      { title: '[Record four]', sub: '[detail]', status: 0 },
      { title: '[Record five]', sub: '[detail]', status: 1 },
      { title: '[Record six]', sub: '[detail]', status: 2 },
    ],
  } as WorldSpec,
  /** The result card: what it made. */
  result: { title: '[Launch plan]', body: '[4 tasks, 3 owners, 1 review]', meta: '[now]', glyph: 'check' as GlyphName },
  /**
   * Real photographs, public/ paths (node scripts/assets.mjs search "<subject>" --kind photo [--people] [--fit 1:1], get
   * '#n' --to public/assets, grade): `people` are the faces of the people the work is for, in order (one real portrait
   * each); `result` the picture the product made when its result is a picture (an edited photo, a generated image, a
   * product shot), shown on the result card. Empty, the people show as their initials and the result card as the
   * product's own glyph: never a drawn face.
   */
  photos: { people: [] as string[], result: '' as string },
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
for (const [k, s] of Object.entries(RUN.lines)) {
  if (words(s) < 2 || words(s) > 7) throw new Error(`run.ts: line "${k}" ("${s}") is ${words(s)} words; a line is one short sentence of 2-7 words`);
}
if (RUN.steps.length < 3 || RUN.steps.length > 5) throw new Error('run.ts: 3-5 steps');
if (RUN.tools.length < 4 || RUN.tools.length > 7) throw new Error('run.ts: 4-7 tools round the pill');
if (RUN.people.length < 2 || RUN.people.length > 4) throw new Error('run.ts: 2-4 people');
if (RUN.request.length > 72) throw new Error('run.ts: the request is one sentence that fits the box (72 characters at most)');
