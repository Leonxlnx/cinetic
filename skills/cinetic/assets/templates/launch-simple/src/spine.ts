// The film's script, written FIRST: one sentence played as 3-5 acts, each act one verb of it done to ONE case (the
// request, the record, the person: the brief's real words, names and numbers, the same in every act) by ONE element
// whose form changes from scene to scene. The scenes are DEALT from the bank (src/bank.ts dealScene, src/scenes): each one
// moment of 1.5-3 s that shows its point and is understood (the request typed at macro scale, the page writing itself,
// send pressed with a pointer, the payments stacking up, the mark born), drawn at random for this film (its name, the
// films before it), weighted toward the act's verb and big scenes, never one twice, two of the last film's at most; you
// fill them with the product's content. 75 % of the picture scenes or more come from the bank: ONE scene of your own at
// most (`own: true`, `seconds` 1.5-3, drawn in src/product.tsx OWN); a dealt slot is redrawn (`bank`) only with its
// reason (`why`), printed in the plan (grid-check fails a redraw without one). Each scene 1.5-3 s (the timeline refuses
// a longer one by name; the lockup 2.5 s at most). A film is 8-12 scenes, at least two of them
// big; each point is a line on clean ground (big, read in 1.2 s at most), then its scene. Every change of scene hands the element on (the out scene's
// last form becomes the in scene's first: src/timeline.ts HANDOVER_PLAN, drawn by fx/Handover), so the film never cuts
// from a line to a card. references/spine.md is the guide; lib/spine.ts the grammar.
//
// The chain test before you build: say the film as "A becomes B becomes C ...". A film that needs "and also" is two
// films: cut one.
//
//   sentence  "[Name] [verb 1]s [the case], [verb 2]s it, ..." (8-16 words)
//   element   the one element's id ("request", "invoice", "trip")
//   case      the request typed or said, the result it makes, who, the names and numbers that recur
//   acts      3-5 (4 for 15-30 s): { verb, scenes, line?, strings, world?, devices? }
//     verb      one verb of the sentence ("asks", "writes", "sends", "fills"): it pulls the deal toward the house scenes
//               this verb asks for (src/bank.ts dealScene: another film, other scenes)
//     scenes    1-3 a scene: { form, name, props?, beats?, via?, ui?, bank? + why?, own? + seconds? }
//                 form   the element's form as the scene hands it on (word for a line; a bank scene's own: macro-type
//                        hands on a button, page-fly a page, toast-stack a notice, a lockup the mark)
//                 bank   leave it out: the deal casts it. Name one (src/bank.ts BANK) only to redraw a dealt slot,
//                        with `why` (what in the product rules the dealt scene out: "no request is typed")
//                 own    true: the film's one scene of its own (`seconds` 1.5-3; src/product.tsx OWN draws it)
//                 props  the scene's content, the case's own words (its props: src/scenes/<id>.tsx); left out, the
//                        scene fills itself from the case, `ui`, the act's line and src/content.ts
//                 via    pin the handover that brings it in; left out it is dealt (the form table's recipe, a converge, a
//                        flight, a porthole, an iris, a grow): no kind on more than 40 % of the changes, pinned or not
//                 ui     every string it shows (the checks follow the case through them)
//     line      { text, place?, becomes? }: 2-7 words, set big (a cap of 9 % of the frame, two rows when long) and read
//               in 1.2 s, arriving whole or in 2-3 chunks, never typed word by word; alone for the promise (act 1: a line on clean ground whose starred key word
//               becomes the next scene's element: `becomes: 'pill'`) and the claim; between them the scenes carry the
//               statements themselves (a decoding title, a two-line statement round a porthole, a type poster: place
//               'around', the line given to the scene) or the product's own words ('inside'). At most four lines.
//     world     its step (enter, closer, light, pull-back); the scenes bring their own grounds, so no turn is needed
//     devices   [{ id }]: the device the verb asks for (lib/spine VERB_DEVICES), for the checks
//   PICTURES  the brief's own pictures (public/ paths): a scene that needs pictures is dealt only when they exist
//   BARS      unset: the scenes' own lengths set the film (the timeline rounds the body to whole bars of the track)
//   CLOSE     the one fact under the lockup (where, when, the price): 2-6 words
import type { Act, Form, HandoverKind, Line, Scene, Spine } from './lib/spine';

/** A scene as this template plays it: a state of the element, the house scene that draws it and its content. */
export type FilmScene = Scene & { form: Form; name: string; subject?: string; bank?: string; why?: string; own?: boolean; seconds?: number; props?: Record<string, unknown>; beats?: number; ui?: string[]; via?: HandoverKind | 'cut' };
export type FilmAct = Omit<Act, 'scenes' | 'line'> & { scenes: FilmScene[]; line?: Line };
export type FilmSpine = Omit<Spine, 'acts'> & { acts: FilmAct[] };

// cinetic:placeholder - the template's stand-in spine: write the product's own sentence, case, acts and strings, then delete this line.
export const SPINE: FilmSpine = {
  sentence: '[Name] takes your request, makes the result, sends it and tells you who answered.',
  element: 'request',
  case: { request: '[the request, in the user\'s own words]', result: '[the result it makes]', names: ['[a person]'], numbers: ['[the count]'] },
  acts: [
    {
      verb: 'asks',
      scenes: [
        { form: 'word', name: 'promise' },
        { form: 'button', name: 'ask', ui: ['[the request, in the user\'s own words]'] },
      ],
      line: { text: '[Name] makes your *result*.', becomes: 'pill' },
      strings: ['[the request, in the user\'s own words]'],
      devices: [{ id: 'macro-type' }],
      world: 'enter',
    },
    {
      verb: 'writes',
      scenes: [
        { form: 'page', name: 'result', ui: ['[the result it makes]'] },
        { form: 'button', name: 'press', ui: ['[Send it.]', '[the button]'] },
      ],
      strings: ['[the result it makes]'],
      devices: [{ id: 'page-fly' }],
      world: 'closer',
    },
    {
      verb: 'fills',
      scenes: [
        { form: 'notice', name: 'arrivals', ui: ['[a person]', '[the count]'] },
        { form: 'mark', name: 'lockup' },
      ],
      line: { text: '[a person] answered', place: 'inside' },
      strings: ['[a person]', '[the count]'],
      devices: [{ id: 'toast-stack' }],
      world: 'pull-back',
    },
  ],
  end: { via: 'converge' },
};

/** The brief's own pictures, public/ paths (a face, the product, the page's hero): none, and no scene that needs one is dealt. */
export const PICTURES: string[] = [];
/** Unused by the bank's timing (each act takes the whole bars its scenes need); kept for older readers. */
export const BARS: number | undefined = undefined;
/** The act shares in bars; unset, each act is as long as its scenes. */
export const ACT_BARS: number[] | undefined = undefined;
/** The one fact under the lockup. */
export const CLOSE = '[Where to get it]';
