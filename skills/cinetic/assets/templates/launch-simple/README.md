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
2. **The input shot, `public/assets/input.mp4`.** The core action as real footage: a person giving the input
   (speaking into the phone, typing, paying). `node scripts/assets.mjs recipe "<the input in your words>"` prints the
   matching shot and its checked no-credit picks; `sheet`, then `get #n --to public/assets --name input --trim
   <start>,3`, then set `INPUT` in `src/product.tsx` (its size and rate from `assets.mjs probe`, the framing point).
   The first scene plays it in a lit window graded into the film (a tint at the ground's hue: a soft stock clip shown
   smaller reads sharp and belongs to the film), the product's listening pill (light, the accent's live dot and
   waveform) on the window's lower edge; on the cut the window rises away, the lit phone rises in and the pill flies
   into the top of its screen: one element carried across, the words of the input arriving under it as they are said,
   the task rising out of them. No clip fits: delete the file and the scene plays its code-built fallback (the phone
   alone, the pill already in its screen). Declare the clip's span to `look-audit.py` with `--imagery`.
3. **The product's scenes, `src/product.tsx`.** One component per scene id, drawn full frame and centred in the
   ground family's inks (`SceneProps`: `f` frames since the beat began, `dur`, `hits`, `inks`, `cut`). The first scene
   shows the product's core change literally (input -> output); each picture proves the line before it ("lands on its
   day" shows the tasks dropping into their days: the steps' `ui` lists one item per hit, then the slots they land in).
   The scene before the claim names its `field` (the element the claim's colour field grows out of); the last one
   names its `hero` box: the element the end card is built from. Show the product as a lit object, whole in the frame:
   the kit's `Phone` or `Laptop` (`src/kit/device.tsx`: a silver rim, glass, thickness when tilted, a contact shadow)
   with a light screen, or a lit `Card` from `src/acts/ui.tsx` (a white card on a dark ground: the film's second value;
   `surfaceInks()` for what it holds), sized by what it holds (never an empty slab). UI type at film size: 44 px and
   up, titles 60 and up. `ui.tsx` also has a typed field, a row that checks itself, a count, a live waveform, a
   listening pill, a lit `Window` onto footage and `Plane` (a part nearer or farther than the stage, so the planes
   part as the camera travels). Keep what a scene shows mounted for the whole
   beat (show and hide it with opacity), land its arrivals on its `hits`, ease its state changes, and give the picture
   colour where the product has it: a calm picture never pops, and the checks read it frame by frame.
4. **The signature, `SIGNATURE` in `src/product.tsx`.** One move a film, the shot people remember, picked from
   `references/catalogue.md` §2 for the payoff, carried through the film; the scaffold's: the camera pushes into the
   last task chip until it is the frame (the claim's colour field), and the result's progress ring closes into the
   mark that flies into the lockup.
5. **The mark.** `scripts/brand.py` with the brand's SVG writes `src/brand/logo.ts`. Until then the lockup shows the
   product's own element as a mark (`HERO_MARK` in `src/product.tsx`: the scaffold's is the result's ring closed into a
   disc with a check cut through it, one colour, its long stroke breaking the edge) or, without one, a letter mark, and
   lint fails on the marker: keep it on purpose for an invented brand by deleting the marker, never swap in a sparkle,
   star or AI glyph, never a letter that repeats the wordmark's first letter beside it.

## Premium by default (simple is not flat)

One dominant thing a frame, and every frame lit and alive:
- **Ground.** The dealt family's field under a key light from above (`acts/stage.tsx` `KEY_LIGHT`): the top edge
  lifted in a lighter tone of the ground's own hue (never a grey lift, never a pool or glow behind the content: that is
  haze), falling off by two thirds down, at one level all film (it never brightens under a beat or outshines the
  subject), swaying on a 13 s loop and lagging the camera float, the bottom corners falling into the family's far tone
  (dithered plates, no grain: a grain over a held frame pops on every I-frame of the render).
- **Colour.** Three values, one accent: the dark ground, light surfaces (white cards, a light phone screen) and the
  claim on a colour field in the accent (`FIELD_ON`, `EVENT_FROM`): the seam into the claim pushes into the scene's
  `field` element until it is the frame, the claim resolves on it in white, the field leaves with it on the next seam
  (one run under 2 s; the band's flood and the turn to dark are their families' own events).
- **Type.** Statements at a 7.4 % cap height a step under the type family's weight, the claim (the last line) 8.6 % and
  a step over it, the wordmark heavier and tighter again (`WORDMARK_TYPE`), tracking tightening with size; a long line
  keeps one row at a sentence cap (6-6.4 %) or breaks into two balanced rows that part as they are read; never under 6 %.
- **Depth.** A card's content creeps against its edge, a phone's screen against its body, the pill rides a nearer plane:
  look-audit floor-depth reads two planes in at least half the shots.
- **Life.** Nothing holds still for more than 0.8 s: the camera travels on every picture, the lines creep and drift,
  the light keeps moving; the last picture falls back behind the lockup for a second while its element flies in (the
  product stays on screen into the end), and the fact under the lockup drifts slower than the name (two planes).

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
| end | element (the last picture's element flies into the lockup and becomes the mark), badge (the element turns into the mark, a spin blur on the fast frames); the name slides out beside it |
| camera | drift (sideways), rise (on the picture beats; the camera travels, re-frames on the beat where a picture's moments leave a gap, and cuts once to a closer frame) |

Print it: `npx tsx -e "import { DEAL } from './src/deal'; import { SEAM_PLAN, BEAT_PLAN } from './src/timeline'; console.log(DEAL, SEAM_PLAN.map((s) => s.recipe), BEAT_PLAN.map((b) => b.kind))"`.

## Then

The music (`template.json` `music`: `music.mjs pick`, `track.py edit --bars <BARS> --end auto`, `track.py grid`),
`npm run check`, a preview render, and one review round on a 30-cell contact sheet against the checklist in
`references/checks.md`: every line centred and alone, every picture showing what the product does, every seam carrying
something, the end card centred and built from the last element.
