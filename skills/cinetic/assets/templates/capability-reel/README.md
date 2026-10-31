# The capability-reel template

A 15-25 s launch close (the back half of a launch film, or a short launch film on its own), laid over the Remotion
starter by `bash scripts/new-film.sh <dir> --template capability-reel` (template.json lists the files it copies and
the starter acts it removes). Crisp pace, 120 BPM until the track's grid is in; 10 bars, 21 s as written.

**The shape.** Breadth, then one real proof, then the claim and the name: what it connects to, one record it
returns, what that means, everything it can return, the one sentence to remember, the transition out of that
sentence's full stop, the end card. State changes are hard steps; only the camera and the containers ease.

| # | act | shot | in | what happens | the slot |
|---|---|---|---|---|---|
| 1 | `sources` | one line inside a ring of sources | cold open | words arrive, the sources (their real marks on app-icon tiles) pop in on a stagger and orbit; the ring tightens fast on the same paper, the sources shrink out one by one, the outer ring stretches into a stadium, the inner one closes into a disc | `lines.sources`, `sources` |
| 2 | `record` | one real record, a lit card on the paper | the disc grows into the card | width and height lead, the height overshoots once and lands, the fill catches up late; the accent rises through its picture; a whip pan opens the card into its fields (one per two or three frames, top down); the page grid is the card's own and two accent cells hop on the kicks | `record` |
| 3 | `statement` | the statement on a light card | a hard cut on a kick | the card opens at the record's size and squashes round its line (`Resize` carry), the words pop a word gap apart; the line creeps in while the card and its grid creep out (`counterCreep`); it zooms out, accelerating into the cut | `lines.statement` |
| 4 | `ticker` | what it returns | the zoom carried across | an icon tile and a word wheel stepping one row every 10 f (closer when a fast track shortens the act), hard and unblurred (`MaskList`), the icon swapping on the same frame; the exit launches left | `capabilities` |
| 5 | `claim` | the big claim on the accent (the film's one colour event) | momentum carried left | the first fragment's words pop; it pushes up and dims to a third as the second rises in from low and right; the full stop is its own square; the words erase and the camera zooms into the stop | `lines.claim` (two fragments, the second ending on its full stop) |
| 6 | `rings` | the graphic transition, inverted | through the full stop | the stop is the first ring; square rings leave it at one speed on the beats (`Radiate` with `bornAt`, `speeds`); the centre floods with the ink until it covers the frame | |
| 7 | `end` | the end card on the ink | the flood | the title's name pops and the rest types on as it rises; the mark's parts rise beside it; the key passes once; the title shrinks out and the tagline settles from 108 % into focus | `lines.title`, `lines.tagline`, the name |

**What to write.**
- `src/reel.ts`: the script (the sources line, the statement, the claim in two fragments, the end card's title and
  tagline: 2-7 words each, plain sentences: the first says what the product is, the tagline what to do) and the product's own sources, one real record and 12-14 capabilities
  with their glyphs. Delete its placeholder lines.
- The sources' real marks: each source names the slug of its mark (`logo`); fetch them with
  `node scripts/logos.mjs get <name> --film .` (official colours, the record in `public/logos/logos.json`). When every
  source has its mark the ring is app-icon tiles; a source without one stays a pill with its name. Marks only for what
  the product really reads from or works with; a capability that is another product takes its mark in the ticker too.
  Look at `npx remotion still KitLogos` at half size first.
- The record: `acts/Record.tsx` draws kit parts (`DataRow`, `Chip`, `Meter`, a `Photo`) as the floor; rebuild the
  product's real output at film size (every web size x1.9, nothing under 36 px). Its picture is `record.photo`, a real
  photograph of the record's subject (the product's own, or `node scripts/assets.mjs search "<subject>" --kind photo
  --no-people --fit 4:5`, `get`, `grade`); until it is in, the slot shows the file it is, never a drawn object. The
  statement's page carries the tilted tint (`fx/Washes` `tilted`): the accent's colour along one edge.
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name. The claim sits on the brand's accent
  (declared in `COLOUR`); every other ground is neutral.
- The direction: deal it (`python3 scripts/deck.py --brief "..." --format launch --have ui --options 3`) and retell
  this floor in its world: its grounds and type replace `acts/stage.tsx`.

**Timing.** `src/timeline.ts` places every act on a bar line (`BEATS`, whole bars: with a track in, every act line lands
on a downbeat; the first act starts on frame 0 and its cues on the track's first downbeat) and every state change as a
CUE on the 16th grid (the tagline waits for the title's read at a faster track);
`TICKS` and `HOPS` are declared steps. Keep the grammar when you retime: cuts and swaps on the track's drum onsets,
no overshoot on type, holds that counter-creep into an exit, speed and zoom carried across every act line, the
transition born from something already on screen (the full stop), one colour event.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): 118-134 BPM with
a punchy kick; then `track.py edit`, `grid` and `check`, and move the cuts onto its onsets (`snapToAccent`).
`src/sync.ts` places the effects from the picture's own frames: a few of the sources popping, the disc becoming the
card, the fields, the cut on the kick, the ticker's first and last steps, the claim's two beats and its full stop,
the zoom through it, the flood, the name, ONE element at the lockup.
