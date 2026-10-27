# The social-ad template

A 15 s ad on a white page, laid over the Remotion starter by `bash scripts/new-film.sh <dir> --template social-ad`
(template.json lists the files it copies and the starter acts it removes). Crisp pace, 150 BPM until the track's grid
is in; 9 bars, 15.4 s as written. Every seam is hidden inside a motion: a spread, a rise, a wall leaving, a rush.

**The shape.** What it is, everything it holds, the mark, what you find in it, what you use it for, two imperatives, the
lockup. Pictures carry the colour mass; the type stays a regular-weight grotesk in ink with the newest word in the
accent.

| # | act | shot | in | what happens | the slot |
|---|---|---|---|---|---|
| 1 | `open` | the opener built word by word, then the pile | cold open | the first word (the name) cuts in at x2.67 defocused and settles in 24 f, snapping sharp when the second word lands; each new word lands at the line's end in the accent and cools to ink when the next arrives, the line gliding to stay centred and relaxing 7 %; the finished line breathes apart (6.6 px/f) through the cut; on the pile the two words carry on along the same paths, grey to ink, either side of a hero card settling from x1.16 while pictures are dealt onto it every 6 f, up-right, tilts alternating | `lines.what`, `lines.save`, cards |
| 2 | `brand` | the mark on a picture | a hard cut | the plate pulls back from x1.13 on a circ-out (no drift); the mark spins in from x2.06 over more than a turn (`spinInState`, `SpinBlur`), steps aside, the name slides out from behind it; lockup and plate rise on a quad-in | the name, `pictures.plate` |
| 3 | `wall` | the claim in a wall of pictures | the rise carried up | the wall enters scrolling up, every tile on its own depth and lag (`masonryState`); the claim rides the hero tile, its words popping on, its last word on the accent pill (62 % to full in 2 f, no spring); the wall leaves up together | `lines.find`, cards |
| 4 | `rivers` | two rivers of pictures under a label | the wall leaving up | two diagonal streams in opposite directions (`Conveyor`), cards upright in a staircase, sizes varied by depth, smeared along their travel; the label recedes the whole time and swaps its last word once (a x1.18 pop); the streams rush out x6 | `lines.plan` (two lines, the last word swapping), cards |
| 5 | `taglines` | the hero picture and two imperatives | the rush | one long circ-out pull-back (x1.183 with a drift on the same curve), then a quad-in push into the cut; the taglines take turns over it | `lines.taglines`, `pictures.hero` |
| 6 | `end` | the lockup | a hard cut | the mark spins in again, steps aside, the name slides out; the close settles under them into focus and holds | the name, `lines.close` |

**What to write.**
- `src/ad.ts`: the script (the opener 3-5 words with the name first: what it is; one word either side of the pile; the
  claim 3-5 words; the label twice, only its last word different; two 2-4 word imperatives, the verb first; the close),
  and the ad's own pictures in `public/` (the plate, the hero and 20 or more cards: the pile, the wall and the rivers
  draw from them in turn). Delete its placeholder lines.
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; the spin-in needs a mark that reads at
  190 px while turning.
- The direction: deal it and retell this floor in its world: its ground and type replace `acts/stage.tsx`.

**Timing.** `src/timeline.ts` places every act on a bar line and every state change as a CUE on the 16th grid; `BUILD`
holds the opener's word gaps, `POP_GAP` the popped lines', `DEALS` the pile. A line cut before its read fails at import.
At a vertical size (`--size 1080x1920`) re-lay the wall's tiles and the rivers' angle for the tall frame.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): driving, 140-160 BPM
(or half-time); then `track.py edit`, `grid` and `check`. `src/sync.ts` places the effects from the picture's own frames:
each word of the opener, every other card dealt, the mark's spin and name, the rise, the pill, the swap, the rush, each
tagline, ONE element at the lockup.
