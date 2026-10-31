# The camera-teaser template

A 22 s product teaser told by the camera on a dark, lit stage, laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --template camera-teaser` (template.json lists the files it copies and the starter acts
it removes). Crisp pace, bold type, 120 BPM until the track's grid is in; 10 bars and a 1.9 s tail as written.

**The shape.** The camera is the animator: every shot is one layout under one camera path (`lib/camera` `camPath`,
`World` in `acts/stage.tsx`) on a clean lit ground of its own (`fx/Grounds` `LitGround`, wash or flat on the stage's two
darks, dealt so no ground holds more than two shots, keyed to the film's one light: no pools, bars or haze behind the
words; every element in frame carries the product, a mark or a line). Each shot has one carrying move; its secondaries start while it is still moving,
never queued after it. Holds rest (a sub-pixel creep at most), moves land before the cut, the camera smears only
inside fast moves. The product's panels face the camera in the film's light (`fx/Lit`). The window act has the film's one 3D turn (`swing3d`). Real marks of
the products it works with ride the proof (`kit/logos.tsx`, `kit/inline.tsx` `ObjectLine`). The script's lines land on
the film's dealt voice (`fx/TypePresets` `TypeLine`: `mask`, `land` or `fall`, each leaving at speed on its own exit),
confident hero moves: no line reads half-faded or blurred for long.

**The deal.** Each act is a slot with two or three devices on the same cues and the same words (`src/deal.ts`,
`template.json` "deal"). `DEAL` picks one per slot from a seed (the product's name, or `teaser.ts` `deal.seed`) under
the rules in `RULES`, so two films never play one sequence; `teaser.ts` `deal.devices` pins a device once the direction
asks for it. The timeline's declarations follow the deal (the flash frame only with the flash cut, the colour event
only with the claim, the seams by device).

| # | act | the beat | devices | the slot |
|---|---|---|---|---|
| 0 | the voice | every script line (what, build, close) | `mask` (out of a mask on its baseline, leaves dropping), `land` (lands from x1.35 on a glide, leaves sliding), `fall` (word by word from above, the last in the accent) | |
| 1 | `input` | the request box arrives, tilted and lit; the what line on the voice; a rim light; the request types and the send button arms; a whip right into the close-up | `rise` (out of a steeper tilt, focus trailing), `drop` (a long pull back from the send corner), `track` (a truck past three soft near tiles of the products it works with, cropped by the frame edge; the other devices draw nothing round the box); the cut: `flash` (one near-white frame, the film's one snap) or `smear` | `lines.what`, `request` |
| 2 | `launch` | the whip carried into the close-up, settling on one glide; a slow push | `jcurve` (the send button leaves on a J-curve; the cut takes it still accelerating out of the frame), `dive` (the camera dives into the button; the window opens from inside it through an iris) | |
| 3 | `window` | the window arrives on the one 3D turn; the code streams; a lens strip follows the line being written, then glides back to the first line; the whip out | `yaw`, `pitch` (a tabletop turn), `split` (the code beside the live app, a dense screen with one row readable) | `lines.build`, `window`, `code`, `world` |
| 4 | `cards` | the whip carried down; the connect line with the integrations' real marks rolling in its slot; three notifications carrying the marks; the stack leaves up still crossing the frame | `stack` (a depth stack: one tile per product on the far wall, one soft tile crossing the near plane), `wall` (in front of a wall of large tiles that keeps the centre column clear), `ring` (inside a ring of eight tiles) | `lines.connect`, `integrations`, `cards` |
| 5 | `page` | arrives moving up, the main card on screen from the cut, the others rising in a cascade; the modal: blur, dim, push, the light toast at the push's midpoint; a pull-out to black | `cascade` (the title's letters on an arc), `panel` (the page in one lit browser panel) | `page` |
| 6 | `stages` | the product's three stages on glides; out soft into the end (or the accent wipes up) | `brackets`, `push` (a row the camera pushes through, `TypePush`), `claim` (each stage as the claim on the accent: the colour event) | `stages` |
| 7 | `end` | the mark, the name, the close on the voice; the lockup creeps while the last hit rings | `comets` (two comets collapse at full speed; the cut lands as they meet, onto the mark turning in), `assemble` (the mark's parts glide in and lock) | the name, `lines.close` |

**What to write.**
- `src/teaser.ts`: the script (2-7 words a line: what it is over the box, what it does under the window, where it
  works over the proof with its `[]` slot, the close), the product's own strings (the request and model chip, the
  window's title and status, real code, three proof cards, the page it made, its three stages) and its records for the
  split window (`world`, kit/data.ts shape). Delete its placeholder lines.
- The real marks: `node scripts/logos.mjs get <name> --film .` for each product it really sends to or reads from; their
  slugs go in `integrations` (they roll in the connect line's slot and fill the tiles) and on the cards (`logo`). Without
  marks the slot rolls the cards' glyphs. Look at `npx remotion still KitLogos` at half size first.
- The product's own screens: the acts draw kit `Composer`, `CodePanel`, `DenseScreen` and glass cards as the floor;
  rebuild the product's real screens at film size (every web size x1.9).
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; ask for the logo file, never draw one.
- The direction: deal it (`deck.py`, a dark direction keeps the stage) and retell this floor in its world: its grounds,
  light (`lib/light` `FILM_LIGHT`) and type replace `acts/stage.tsx`.

**Timing.** `src/timeline.ts` places every act on a bar line and every state change as a CUE on the 16th grid; each act
keeps its camera moves beside its layout (`inputMoves`, `launchMoves`, `windowMoves`, `pageMoves`) so a retime moves the
camera with the cues. `lockup` sits on the mark (with a track: its last hit), the end lock runs from the close, and the
1.9 s tail lets the name and the close be read while the hit rings.

**Checks a filled scaffold passes.** `tsc`, `lint-film` (only the brand's and the content file's placeholders left),
`grid-check` (with a 104, 120 or 136 BPM track) and copy-check; on a half-size render, `forensics.py`'s motion gates
(no undeclared snap, no frozen run, settles of 3.5 f@30 or more, at most 2 primary moves per 3 s, no cut into a
braking move). The act lines that cut
on a whip's blur peak or a hard cut, and the cut inside the end, are designed cuts: pass them with `--cuts`, printed by
`npx tsx -e "import('./src/timeline.ts').then((t) => console.log((t.CUTS ?? t.default.CUTS).join(',')))"`. Check the
master at full size too: a slow push that passes at half size can stair-step at 1080p.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): dark and driving,
104-136 BPM, with hits to cut on; then `track.py edit`, `grid` and `check`. `src/sync.ts` rides the camera: the arrival,
the send button arming, the whip (a hit a frame ahead of the flash), the launch or the dive, the turn, the whip out, the landings, the cascade,
the toast, the pull-out, the stages, the comets or the parts, ONE element at the mark.
