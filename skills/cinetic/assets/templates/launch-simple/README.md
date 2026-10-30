# launch-simple: the default launch film

A line alone in the middle of a clean ground, then the product doing what the line said, then the next line, then the
product again, then a centred lockup built from the last picture with the one fact under it. 15-30 s, one text voice,
one ground family, three or four seam kinds. `new-film.sh` lays it over the Remotion starter for every launch
(`--template none` keeps the starter's own acts).

## What you write

1. **The script, `src/launch.ts`.** Three or four pairs; each pair is one line and the picture that proves it.
   - `line`: one short sentence, 2-7 words (1-5 typical), plain words. Line 1 says what the product does, by name.
     Mark one key word with `*stars*` on at most 60 % of the lines: it takes the accent ink.
   - `scene`: the id of the picture beat in `src/product.tsx`; `seconds` (1-3.5; vary them, a long one beside a short one; unset they run 2.6, 1.6, 2.2, 3.0 in turn); `hits` (where its own
     moments land, as shares of the beat); `ui` (every string the picture shows: real words, no sample names).
   - `over: true` only when the line names exactly what the picture is doing (a line over a picture, at most 40 %).
   - `close`: the one fact under the lockup (where, when, the price), 2-6 words.
   - The name goes in `src/brand/identity.ts`.
2. **The product's scenes, `src/product.tsx`.** One component per scene id, drawn full frame and centred in the
   ground family's inks (`SceneProps`: `f` frames since the beat began, `dur`, `hits`, `inks`). The first scene shows the
   product's core change literally (input -> output). The last one names its `hero` box: the element the end card is
   built from (`fill: 'accent'` when the result is in the brand colour). `src/acts/ui.tsx` has a card, a typed field, a
   row that checks itself and a count. Keep what a scene shows mounted for the whole beat (show and hide it with
   opacity), land its arrivals on its `hits`, ease its state changes, and give the picture colour where the product has
   it: a calm picture never pops, and the checks read it frame by frame.

Everything else is derived: `src/timeline.ts` fits each line beat (its build, its read, its exit) and each picture beat
to the track's 8ths and each pair to whole bars at any tempo from 90 to 140 BPM, and puts the end on a downbeat with the
lockup held 2-3 s; `src/deal.ts` deals the text voice, the ground family, the seams, the end card and the camera from
the name (`launch.ts` `pin` fixes a slot, `seed` re-deals); `src/sync.ts` sounds each line once whole, each picture's
hits, the seams that move and one hit on the lockup.

## The beats

| Beat | On screen | Length |
|---|---|---|
| T | one line, centred in the middle band, alone on the ground | 0.5-2.4 s |
| A | the product acting, full frame, centred, no statement over it | 1-3.5 s |
| T+A | a line over the start of a picture (only when it names what the picture does) | as T |
| end | the centred lockup built from the last picture's element, the one fact under it | held 2-3 s |

`grid-check.ts` checks the plan (`BEAT_PLAN`): type-only beats >= 15 % of the shots and >= 2, T+A <= 40 %, the first line
on screen by 1 s, every line beat holding its line, no statement over a picture beat.

## The deal

| Slot | Choices |
|---|---|
| voice | build (word by word, re-centring), blur (the whole line out of a blur), ink (each word pale, inking in) |
| ground | nearWhite, blackField, whiteBand, deepPool, softSky, lightDark, gradientField (`references/brand-and-color.md` §9b) |
| seamTA | matchCut, blurThrough, velocityCut (line -> picture) |
| seamAT | blurThrough, zoomThrough (picture -> line: the picture blurs away, or the camera pushes through it; the line builds from nothing, so no speed carries into it) |
| end | element (the last picture's element becomes the mark), badge (the element turns into the mark, a spin blur on the fast frames); the name slides out beside it |
| camera | drift (sideways), rise (on the picture beats; the camera travels, re-frames on the beat where a picture's moments leave a gap, and cuts once to a closer frame) |

Print it: `npx tsx -e "import { DEAL } from './src/deal'; import { SEAM_PLAN, BEAT_PLAN } from './src/timeline'; console.log(DEAL, SEAM_PLAN.map((s) => s.recipe), BEAT_PLAN.map((b) => b.kind))"`.

## Then

The music (`template.json` `music`: `music.mjs pick`, `track.py edit --bars <BARS> --end auto`, `track.py grid`),
`npm run check`, a preview render, and one review round on a 30-cell contact sheet against the checklist in
`references/checks.md`: every line centred and alone, every picture showing what the product does, every seam carrying
something, the end card centred and built from the last element.
