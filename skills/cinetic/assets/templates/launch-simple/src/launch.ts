// The film's script: everything the frames say, and nothing else. Write it first (copy-check.py reads it through the
// timeline), then build the product's scenes in src/product.tsx. Keep this file free of React and CSS imports.
//
// The shape is fixed and simple: a line alone in the middle of a clean ground, then the product doing what the line
// said, then the next line, then the product again ... then the lockup, built from the last picture, with the one fact
// under it. Each pair below is one line and one picture beat; three or four pairs make a 15-25 s film.
//
//   line     one short sentence, 2-7 words (1-5 is typical), plain words, centred, alone on the ground. Line 1 says
//            what the product is or does, by name ("[Name] turns [input] into [output]."). Mark one key word with
//            *stars* on at most 60 % of the lines: it takes the accent colour (never a box, an underline or a marker)
//   scene    the id of the picture beat in src/product.tsx: the product acting (input becoming output, a click and
//            its result, a count rising), full frame, centred, no statement over it. The first picture shows the
//            product's core change literally
//   seconds  the picture beat's length, 1-3.5 s; vary them, a long one beside a short one (unset: 2.6, 1.6, 2.2, 3.0 in
//            turn); the timeline rounds it to the music's beats
//   over     true only when the line names exactly what the picture is doing: the line stays over the picture's start
//            (a statement over a picture; at most 40 % of the beats)
//   hits     where the picture's own moments land, as shares of its beat (the click, the result): the timeline puts
//            them on the music's grid as CUE `a<pair>h<k>`, product.tsx animates on them, sync.ts sounds them
//   ui       every string the picture shows (labels, rows, a typed request): real words the product would show, no
//            sample names, no filler rows. The timeline lists them as the product's own strings (kind 'ui')
//   close    the one fact under the lockup (where to get it, when, the price): 2-6 words
import { IDENTITY } from './brand/identity';

export type Pair = { line: string; scene: string; seconds?: number; over?: boolean; hits?: number[]; ui?: string[] };
export type Launch = { name: string; pairs: Pair[]; close: string; seed?: string; pin?: Partial<Record<string, string>> };

// cinetic:placeholder - the template's stand-in script: write the product's own lines, scenes and strings, then delete this line.
export const LAUNCH: Launch = {
  name: IDENTITY.name,
  pairs: [
    { line: `${IDENTITY.name} turns notes into *plans*.`, scene: 'input', seconds: 2.8, hits: [0.3, 0.62], ui: ['[the input the product takes]', '[the output it makes]'] },
    { line: 'Every step finds its place.', scene: 'steps', seconds: 1.8, hits: [0.12, 0.38, 0.62], ui: ['[step one]', '[step two]', '[step three]'] },
    { line: 'You just start.', scene: 'result', seconds: 2.4, hits: [0.35], ui: ['[the result]', '[what it shows]'] },
  ],
  close: '[Where to get it]',
};
