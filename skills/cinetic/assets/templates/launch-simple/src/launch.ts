// The film's script: everything the frames say, and nothing else. Write it first (copy-check.py reads it through the
// timeline), then build the product's scenes in src/product.tsx. Keep this file free of React and CSS imports.
//
// The shape: lines and pictures that meet, never a slideshow. Each pair below is a picture and, mostly, the line it
// proves; three to six pairs make a 15-30 s film, then the lockup, built from the last picture, with the one fact under
// it. Fewer words than pictures: at most four lines, the pictures between carry the rest.
// A line meets its picture one of three ways (`beat`), and every change of picture carries something (src/timeline.ts
// SEAM_PLAN: the picture falls back as the next line builds over it, one camera move carried across a cut, the film's
// element flying from one scene into the next): the frame is never empty between two scenes.
//
//   line     one short sentence, 2-7 words (1-5 is typical), plain words, centred. Line 1 says what the product is or
//            does, by name ("[Name] turns [input] into [output]."). A line says what its picture cannot (who it is for,
//            why it matters), never what the picture shows (copy-check repeats): leave `line` out of a pair between the
//            first and the claim and the pair plays its picture alone, carried on from the last. Mark one key word with
//            *stars* on at most two lines (one in a film of two or three): it takes the accent colour (never a box, an
//            underline or a marker). The last line is the claim, the film's hero line: set larger, with the film's one
//            contrasting entry
//   beat     alone  the line alone on the ground (it builds over the last picture as that one falls back), then its
//                   picture                                                   (T, then A)
//            with   the line arrives with its picture's first motion, in front of it (the picture far behind,
//                   centred, soft and dim), then leaves as the picture comes up and racks into focus  (T+A, then A)
//            over   the line holds over its whole picture: a picture composed round the line's band (SceneProps
//                   `band`: footage under a line, marks beside it, acts/ui.tsx MarksRound)   (T+A)
//            unset: the first line and the claim `alone`, the lines between `with`. Aim for about T 25 % / T+A 30 % /
//            A 37 % of the beats (timeline.ts BEAT_MIX prints it): one `over` in a film of four or five lines gets there
//   scene    the id of the picture beat in src/product.tsx: the product acting (input becoming output, a click and
//            its result, a count rising), full frame, centred. The first picture shows the product's core change
//            literally
//   seconds  how long the picture plays on its own, 1-3.5 s; vary them, a long one beside a short one (unset: 2.6, 1.6,
//            2.2, 3.0 in turn); over: how long the picture and its line hold together. Rounded to the music's beats
//   hits     where the picture's own moments land, as shares of the time it plays on its own (the click, the result):
//            the timeline puts them on the music's grid as CUE `a<pair>h<k>`, product.tsx animates on them, sync.ts
//            sounds them. With and over, the picture's first moves (the product arriving) play under the line
//   ui       every string the picture shows (labels, rows, a typed request): real words the product would show, no
//            sample names, no filler rows. The timeline lists them as the product's own strings (kind 'ui')
//   close    the one fact under the lockup (where to get it, when, the price): 2-6 words
//   input    the core action in the brief's words ("a person speaking into a phone", "a hiker on a trail"): `node
//            tools/input.mjs` fetches the input shot from it (src/input.ts), the first scene's real footage
import { IDENTITY } from './brand/identity';

export type Pair = { line?: string; scene: string; beat?: 'alone' | 'with' | 'over'; seconds?: number; hits?: number[]; ui?: string[] };
export type Launch = { name: string; pairs: Pair[]; close: string; input?: string; seed?: string; pin?: Partial<Record<string, string>> };

// cinetic:placeholder - the template's stand-in script: write the product's own lines, scenes and strings, then delete this line.
export const LAUNCH: Launch = {
  name: IDENTITY.name,
  pairs: [
    { line: `${IDENTITY.name} turns notes into *plans*.`, scene: 'input', seconds: 2.8, hits: [0.3, 0.62], ui: ['[the input the product takes]', '[the output it makes]'] },
    { line: 'Every step finds its place.', scene: 'steps', seconds: 1.8, hits: [0.12, 0.38, 0.62], ui: ['[step one]', '[step two]', '[step three]', '[its place]', '[the next]', '[the last]'] },
    { line: 'You just start.', scene: 'result', seconds: 2.4, hits: [0.35], ui: ['[the result]', '[what it shows]'] },
  ],
  close: '[Where to get it]',
  input: '[the core action]',
};
