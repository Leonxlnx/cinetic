// The film's script, written FIRST: one sentence played as 3-5 acts. Each act is one verb of that sentence, done to ONE
// case (the request, the record, the person: the brief's real words, names and numbers, the same ones in every act) by
// ONE element whose form changes from act to act (word, pill, page, button, notice, count ... and at the end the mark).
// Every change of scene hands the element on (src/timeline.ts HANDOVER_PLAN: it swells, grows, flies, converges ...),
// so the film never cuts from a line to a card. Lines stand alone only for the promise (act 1) and the claim; between
// them a line lives inside the product's own words (a status, a label, the request typed) or around the element (it
// parts for it, the element rises behind it). The world takes one step per act (enter, closer, turn, pull-back) and
// the lockup grows out of the element's last form. references/spine.md is the guide; lib/spine.ts the grammar.
//
// The chain test before you build: say the film as "A becomes B becomes C ...". Every scene change is a "becomes"
// (a handover the form table knows); a film that needs "and also" is two films: cut one.
//
//   sentence  "[Name] [verb 1]s [the case], [verb 2]s it, ..." (8-16 words)
//   element   the one element's id ("request", "order", "trip")
//   case      the request typed or said, the result it makes, who, the names and numbers that recur (copy-check and
//             data-check follow them from act to act)
//   acts      3-5 (4 for 15-35 s): { verb, scenes, line?, strings, world?, devices? }
//     verb      one verb of the sentence ("asks", "writes", "publishes", "fills"): it picks the act's device
//               (lib/spine VERB_DEVICES: types -> macro-type, writes -> page-fly, presses -> push-press, fills ->
//               toast-stack, counts -> glass-counter ...), and the house scene that draws it (src/product.tsx)
//     scenes    1-3 states of the element: { form, name, beats?, via?, ui? }. `form` from the vocabulary (word pill
//               chip button card page window list notice thread photo count world mark); `name` the scene in
//               src/product.tsx SCENES; `beats` its weight inside the act (default 1); `via` pins the handover that
//               brings it in (else the form table's recipe, dealt for variety); `ui` every string it shows
//     line      { text, place?, becomes? }: place alone (act 1 and the claim only), inside (the product's own words:
//               the scene draws them), around (the scene draws the line with the element in it or behind it).
//               `becomes`: the line's starred word turns into the next form (a 'word' scene swells into the pill).
//               Star one key word (*page*): it takes the accent and, in a word scene, it is the element
//     strings   the case's words this act shows (the request, a name, the number): the checks follow the case
//     world     its world step (default enter, closer, turn, pull-back by position)
//     devices   [{ id, signature? }]: the device the verb asks for (one signature a film, at the turn)
//   end       { via }: how the last form becomes the mark (converge, swell, pull-out ...)
//   BARS      the body's length in bars of the track, the lockup included (10 bars at 120 BPM = 20 s)
//   CLOSE     the one fact under the lockup (where, when, the price): 2-6 words
import type { Act, Form, HandoverKind, Line, Scene, Spine } from './lib/spine';

/** A scene as this template plays it: a state of the element, its weight in its act, the strings it shows, its own moments. */
export type FilmScene = Scene & { form: Form; name: string; beats?: number; ui?: string[]; via?: HandoverKind | 'cut' };
export type FilmAct = Omit<Act, 'scenes' | 'line'> & { scenes: FilmScene[]; line?: Line };
export type FilmSpine = Omit<Spine, 'acts'> & { acts: FilmAct[] };

// cinetic:placeholder - the template's stand-in spine: write the product's own sentence, case, acts and strings, then delete this line.
export const SPINE: FilmSpine = {
  sentence: '[Name] takes your request, makes the result, ships it and tells you who came.',
  element: 'request',
  case: { request: '[the request, in the user\'s own words]', result: '[the result it makes]', names: ['[a person]'], numbers: ['[the count]'] },
  acts: [
    {
      verb: 'asks',
      scenes: [
        { form: 'word', name: 'promise', beats: 1 },
        { form: 'pill', name: 'ask', beats: 2, ui: ['[the request, in the user\'s own words]'] },
      ],
      line: { text: '[Name] makes your *result*.', becomes: 'pill' },
      strings: ['[the request, in the user\'s own words]'],
      devices: [{ id: 'macro-type' }],
    },
    {
      verb: 'writes',
      scenes: [
        { form: 'page', name: 'result', beats: 3, ui: ['[the result it makes]'] },
        { form: 'button', name: 'press', beats: 2, ui: ['[the button]'] },
      ],
      strings: ['[the result it makes]'],
      devices: [{ id: 'page-fly' }],
    },
    {
      verb: 'publishes',
      scenes: [{ form: 'pill', name: 'live', ui: ['[the live state]'] }],
      line: { text: '[the live state]', place: 'inside' },
      strings: ['[the result it makes]'],
      devices: [{ id: 'push-press', signature: true }],
    },
    {
      verb: 'fills',
      scenes: [
        { form: 'notice', name: 'arrivals', beats: 3, ui: ['[a person]'] },
        { form: 'count', name: 'count', beats: 2, ui: ['[the count]'] },
      ],
      line: { text: 'It tells you who *came*.', place: 'around' },
      strings: ['[a person]', '[the count]'],
      devices: [{ id: 'toast-stack' }],
    },
  ],
  end: { via: 'converge', share: 0.42 },
};

/** The body's length in bars (the lockup included): 10 bars at 120 BPM = 20 s, then the music's tail. */
export const BARS = 10;
/** The act shares in bars (whole bars, first 20-32 %, last 12-31 %); unset, lib/spine shares them. */
export const ACT_BARS: number[] | undefined = [3, 3, 1, 3];
/** The one fact under the lockup. */
export const CLOSE = '[Where to get it]';
