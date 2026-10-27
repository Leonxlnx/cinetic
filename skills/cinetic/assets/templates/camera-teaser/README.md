# The camera-teaser template

A 20 s product teaser told by the camera on a near-black stage, laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --template camera-teaser` (template.json lists the files it copies and the starter acts
it removes). Crisp pace, 120 BPM until the track's grid is in; 10 bars, 21 s as written.

**The shape.** The camera is the animator: every shot is one layout under one camera path (`lib/camera` `camPath`,
`World` in `acts/stage.tsx`), the moves chained so the next starts on the frame the last one slows, never a hold; fast
moves smear along the camera's own travel (`camVel` into `DirBlur`), pushes stay crisp. Hard cuts only where motion
peaks, each dressed: a flash frame inside a whip, a launch leaving frame, a whip-out at a blur peak, two comets meeting.

| # | act | shot | in | what happens | the slot |
|---|---|---|---|---|---|
| 1 | `input` | the request box on the stage | cold open | it rises with an expo tail that never quite stops, focus trailing position; a rim light glides along it; the line says what the product is; the request types; the camera creeps, whips left, then whips right on an ease-in into the cut through one near-white flash frame | `lines.what`, `request` |
| 2 | `launch` | its close-up | the whip, carried | the camera slides in at x2.3 and pulls back x0.65 on the frame the slide settles; a slow push; the send button launches on a J-curve (x cubic-out, y cubic-in, x1.74) and leaves | |
| 3 | `window` | the product working | a hard cut as the button leaves | the app window rises with an expo tail; its status pulses; the code streams by line cadence (kit `CodePanel`); a zoom-out whip into a blur peak, a 3D push on the frame it settles, a whip out | `lines.build`, `window`, `code` |
| 4 | `cards` | proof | the whip-out | a card lands by shrinking from x1.13; two fan out from behind it in 3D (`fanState`), collapse, and the stack leaves up, smeared | `lines.connect`, `cards` |
| 5 | `page` | what it made, and the modal | momentum up | the title's letters swing in on an arc, the main card rises, the camera pulls back, the siblings slide in left then right; the page blurs and dims under a x1.43 push, the toast pops sharp at its midpoint; a circ-in pull-out to black | `page` |
| 6 | `stages` | the product's stages | through black | the first decodes in corner brackets (`Scramble`), the second rolls in under a x1.9 zoom after a short anticipation, the third rolls in receding and dimming, the brackets flip | `stages` |
| 7 | `end` | the end mark | comets out of the last word | two comets spiral out and in (`Comets`); on their meeting a hard cut to the mark turning in from 50 degrees; the name, the close | the name, `lines.close` |

**What to write.**
- `src/teaser.ts`: the script (2-7 words a line: what it is over the box, what it does under the window, what it works
  with over the cards, the close), and the product's own strings: the request and model chip, the window's title and
  status, real code (a dozen lines), three proof cards, the page it made (a title word, three cards, the done toast),
  its three stages. Delete its placeholder lines. Only the product's own words are single nouns.
- The product's own screens: the acts draw kit `Composer`, `CodePanel`, `Notice` and glass cards as the floor; rebuild
  the product's real screens at film size (every web size x1.9).
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; ask for the logo file, never draw one.
- The direction: deal it and retell this floor in its world: its stage, glass and type replace `acts/stage.tsx`.

**Timing.** `src/timeline.ts` places every act on a bar line and every state change as a CUE on the 16th grid; each act
keeps its camera moves beside its layout (`inputMoves`, `windowMoves`, the moves in `Launch`, `Page`) so a retime moves
the camera with the cues. The one flash frame is declared in `FLASHES`.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): dark and driving,
110-130 BPM, with hits to cut on; then `track.py edit`, `grid` and `check`. `src/sync.ts` rides the camera: the rise,
the whips (sound a frame ahead of the flash cut), the launch, the zoom-out and the whip-out, the landing and the fan,
the siblings, the toast, the pull-out, the decode and the rolls, the comets, ONE element at the mark.
