# The ui-walkthrough template

A 25-40 s walkthrough of a product's flow, laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --template ui-walkthrough` (template.json lists the files it copies and the starter
acts it removes). Crisp pace, 120 BPM until the track's grid is in; 18 bars, 37 s as written.

**The shape.** The UI tells the story (the input goes in, the product reads it, finds what matters, the user picks,
it builds the output), so the viewer always knows what the product does; six short lines say what each step means.

| # | act | shot | in | what happens | the slot |
|---|---|---|---|---|---|
| 1 | `open` | statement on the paper | cold open, already moving | words a word gap apart, the last one snaps the line x2.2 in one frame; launches up | `lines.promise` ("[Product] is a [category].": what it is, by 3 s) |
| 2 | `card` | the input as one tilted card (the signature), its source's real mark on an app-icon tile | carried up on the line's speed | it rises while the ground turns edges-first; ease into a zoom; ONE jump frame (scale, tilt, a tinted swell) and the same card is the output: title wipes on, subtitle swaps, three steps check, two punch-ins | `input`, `output` |
| 3 | `proof` | notices piling up | a blur-snap zoom | `fx/Stack`, arrivals speeding up; a light panel wipes up into the claim | `proof` |
| 4 | `claim` | the claim, its first word giant | the wipe | the giant word reveals bottom-up, one frame snaps out to the line, the hold pushes in and accelerates into the cut | `lines.claim` |
| 5 | `field` | step one in the product | the push carried across the cut | a held backspace clears the placeholder, the value types in bursts, the hand rises and presses, results develop tile by tile, pull-back about the upper third, whip up | `lines.step1`, `field`, `results` |
| 6 | `feed` | step two: the product reads | the whip's speed | a hard flick (`flickFeed`, smeared by `DirBlur`) lands on the item that matters while the count grows faster and jumps to the total; the item lifts and collapses into a pill | `feed` |
| 7 | `insight` | what it found | the item morphs into the pill | the count chip pops, the line says it, the key swells once; whip left | `lines.insight`, `insight` |
| 8 | `pick` | step three: the choice | the whip carried in | the camera zooms onto the chosen row (two frames carry most of it), the others vanish, it rings, then collapses into the progress pill while the output builds top-down | `lines.pick`, `options`, `build` |
| 9 | `page` | the output, live | flies up over the build | it flattens as it lands, its picture develops, it scrolls, then recedes | `page` |
| 10 | `end` | the lockup | the page softening | the mark's parts, the name, the payoff line; the key passes once; a slow push | `lines.payoff`, the name |

**What to write.**
- `src/walk.ts`: the script in plain words (line 1 says what the product is, then one thing it does a line, the
  close says what to do; 2-7 words each; `python3 scripts/copy-check.py` reads it with the timeline's `COPY` through
  `grid-check.ts`) and the product's own strings and numbers in every `[slot]`. Delete its placeholder lines.
- The product: the acts draw kit parts (`kit/flow.tsx`: `Field`, `Tile`, `Row`, `Pill`, `Notice`, `Chip`,
  `DataRow`) as the floor. Rebuild the product's real screens at film size (every web size x1.9, nothing under
  36 px) where they differ; keep each step one cause, one action, one result.
- The input's source: `input.source` names the slug of the real mark of the product the input lives on (a video
  site, a store, a code host); fetch it with `node scripts/logos.mjs get <name> --film .` and the card and the field
  show it (initials and a link glyph until then). Only a product the input really comes from.
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; without a kit, replace the
  placeholders by hand. The pictures are the kit's still life until the product's own imagery is supplied
  (`Photo src=`).
- The direction: deal it (`python3 scripts/deck.py --brief "..." --format launch --have ui --options 3`) and retell
  this floor in its world: its grounds, light and type replace `acts/stage.tsx`'s two stages.

**Timing.** `src/timeline.ts` places every act on a bar line (`BEATS`, in whole bars) and every state change as a CUE on
the 16th grid; with a track in, every act line lands on a downbeat, the first act starts on frame 0 and its own cues
on the track's first downbeat, and a line never leaves before its read at a faster tempo (`line()` keeps the hold).
The grammar to keep when you retime: exits ease in and cut on their fastest frame, and the next shot opens moving
the same way; scale changes hide inside one frame with a short defocus; every hold creeps and accelerates into its
exit; cadences speed up into a payoff (notices, the count, the backspace); UI arrives front-loaded (`E.snapOut`);
one springy landing at most, never on type. A step that needs more time gets it in whole bars.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): 110-128 BPM with
a clear kick; then `track.py edit`, `grid` and `check`. `src/sync.ts` places the effects from the picture's own
frames: the card landing, each check, each notice, the keys, the press, the count locking, the choice, the page
landing, three whooshes (the hidden cut and the two whips), one text sound per line, ONE element at the lockup.
