# The ui-walkthrough template

A 25-40 s walkthrough of a product's flow, laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --template ui-walkthrough` (template.json lists the files it copies and the starter
acts it removes). Crisp pace, 120 BPM until the track's grid is in; 17 bars, 35 s as written.

**The shape.** The UI tells the story (the input goes in, the product reads it, finds what matters, the user picks,
it builds the output), so the viewer always knows what the product does; six short lines say what each step means,
one clean line at a time. Every slot deals one of two or three devices per film from the product's name
(`src/deal.ts`, template.json `slots`; `PIN` chooses by hand, `SEED` re-deals), so two films from this template never
play one fixed sequence. Print the deal: `npx tsx -e "import { DEAL, LINES } from './src/deal'; console.log(DEAL, LINES)"`.

| # | act | what happens | the dealt devices | the slot |
|---|---|---|---|---|
| 1 | `open` | the promise with the input's real mark inside the line (`acts/type.tsx` MarkLine), already moving on frame 0; the frame launches up | `line` (slow push), `push` (the camera through the line onto the mark), `card` (the input's card rising into the frame from below) | `lines.promise` |
| 2 | `card` | the input as one lit card carried on the launch, the film's one 3D turn; it becomes the output in place, three steps check | `flip`, `sheen`, `slide` | `input`, `output` |
| 3 | `proof` | results arriving faster and faster; a panel of the claim's ground wipes up | `stack`, `river`, `wall` | `proof` |
| 4 | `claim` | the speed claim, creeping, then a push into the cut | `accent` (the poster on the accent, fx/TypeClaim), `push` (fx/TypePush), `object` (its glyph inside the line) | `lines.claim` |
| 5 | `field` | step one on the lit product window: the placeholder erased, the value typed, the press, the results; a whip up | | `lines.step1`, `field`, `results` |
| 6 | `feed` | step two: the product reads every item and lands on the one that matters, which collapses into a pill | `lens` (a dense screen, kit DenseScreen), `flick`, `ticker` | `feed` |
| 7 | `insight` | the pill, the count chip, the line; the words people wrote rise below; a whip left | | `lines.insight`, `insight` |
| 8 | `pick` | step three: the options arrive, one is chosen and glides into the build's head | `pill`, `assemble`, `stream` | `lines.pick`, `options`, `build` |
| 9 | `page` | the output, live, lit and facing the camera | `lit`, `stack` | `page` |
| 10 | `end` | the mark's parts, the name on a confident move, the payoff line; it holds about a second and a half | `side` (the output live beside the lockup), `centre` | `lines.payoff`, the name |

The stage (`mixed`, `light`, `dark`) says which acts stand on paper and which on the slate, with at most two ground flips
a film, both at the claim (`mixed` turns from paper to the slate there once); each act gets a clean ground
of its own (`acts/stage.tsx` GROUNDS: the flat base or the key gradient on one of two bases, never one ground for more
than two acts in a row; no plates, no pools, no haze). Each line of the script arrives on one confident move dealt per
line (`LINES`: mask, land, fall or glide, never the same twice in a row; the payoff takes a quick one) and leaves at
speed on a dealt exit (slide, spread, collapse, push or drop); `MOVE_PIN` and `EXIT_PIN` choose by hand.

**What to write.**
- `src/walk.ts`: the script in plain words (line 1 says what the product is, with `[]` where the input's source mark
  sits; then one thing it does a line; the close says what to do; 2-7 words each; `copy-check.py` reads it through
  `grid-check.ts`) and the product's own strings and numbers in every `[slot]`. Delete its placeholder lines.
- The input's source: `input.source` is the slug of the real mark of the product the input lives on; fetch it with
  `node scripts/logos.mjs get <name> --film .` (a chip with `input.sourceName` stands in until then). Only a product
  the input really comes from.
- The product: the acts draw kit parts (dense screens, notices, rows, content tiles) as the floor; rebuild the
  product's real screens at film size where they differ. The UI is built in code, with the product's real words.
- The people and pictures: `photos.people` are real portraits of the feed's people in row order (`node scripts/assets.mjs
  search "<person> portrait" --people --fit 1:1`, `get`, `grade`); the first two also stand beside the card.
  `photos.results` are the found items' pictures when they are pictures (a clip's frame, a product, a place), and
  `photos.input` the input's own picture when its source has no mark. Empty, people show as the product's initials
  and results as the product's own tiles: never a drawn face (lint-film and the layout audit fail one).
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; without a kit, replace the
  placeholders by hand.
- The direction: deal it (`python3 scripts/deck.py --brief "..." --format launch --have ui --options 3`) and retell
  this floor in its world: its grounds, light and type replace `acts/stage.tsx`'s two stages.

**Timing.** `src/timeline.ts` places every act on a bar line (`BEATS`, in whole bars) and every state change as a CUE on
the 16th grid; with a track in, every act line lands on a downbeat, and a line never leaves before its read at a
faster tempo (`line()` keeps the hold; the import fails if a line would still be on screen at its act's cut). No
one-frame step anywhere: lists, zooms and swaps glide (16 f@60 or more), holds rest (no drift), moves land before the cut
or are carried across it at speed (`SEAMS`). A step that needs more time gets it in whole bars.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): 116-132 BPM with
a clear kick; then `track.py edit`, `grid` and `check`. `src/sync.ts` places the effects from the picture's own
frames: the card landing, the transformation, each check, each notice, the keys, the press, the count locking, the
choice, the page landing, the moves across act lines, one text sound per line, ONE element at the lockup.
