# The social-ad template

A short ad for a feed (about 17-22 s), laid over the Remotion starter by `bash scripts/new-film.sh <dir> --template
social-ad` (template.json lists the files it copies and the starter acts it removes). Crisp pace, the bold type family,
150 BPM until the track's grid is in; 9 bars in the house plan (8 when the claim plays the taglines), grown where a line's read needs it (at 150 BPM the
field and the lockup take two). Every seam is hidden inside a motion: a spread, the stack carried into the mark, a rise,
the field leaving, a rush.

**The shape.** What it is, everything it holds, the mark, what you find in it, what you use it for, one or two imperatives,
the lockup. The picture is the product's own content built in code: its items as content tiles (kit `ContentTile`: a
glyph or the real mark of a product it works with, a label, a sub line, a preview of what it holds), its own dense
screen, the real marks of what it touches. Where that content is pictures (a recipe, an outfit, a room, a trip), the cards are real photographs (`ad.ts` `pictures`: the product's own, the user's, or free ones that need no credit, `scripts/assets.mjs`), never drawn: rounded photo cards with a rim and a contact shadow (`fx/Pictures` `PhotoCard`), and the label's rivers run them on two curves round the chip, sharp near it and soft away from it (`ArcRiver`).

**The devices.** Each slot tells its beat one of two or three ways, dealt per film from the name (`src/deal.ts`,
template.json `deal`), so no two ads from this template run one fixed sequence. `ad.ts` `seed` re-deals, `devices`
pins a slot (`{ field: 'ring' }`); the mark spins once a film at most. See the deal with
`npx tsx -e "const t = require('./src/timeline.ts'); console.log(t.BARS, t.DEAL)"`.

| # | act | slot: devices | in | what happens |
|---|---|---|---|---|
| 1 | `open` | open: land, fly; stack: pile, fan | cold open | the opener in one confident move (the name landing oversized and the rest appended in the accent, cooling as the line re-centres; or every word flying in from the lens); it spreads apart into the cut and "Save" and its last word carry on outward either side of a hero tile while the product's items are dealt onto it or fan out behind it in 3D; the words leave once read, then the stack's second beat (a push in, the fan closing) |
| 2 | `brand` | spin, tile | the stack carried | the mark spins in over the stack receding into the far plane, or the hero tile grows into the app's own tile holding the mark; the name slides out from behind it; the lockup rises into the cut |
| 3 | `field` | wall, ring, depth | the rise carried up | the claim inside the product's content (a wall settling round a clear box, a ring orbiting it, or three planes with the camera pushing through), its words rising out of a mask, its last word on the accent pill growing round it in 10 f; once read, a type push into the pill; the field leaves up |
| 4 | `label` | rivers, ticker, screen | the field leaving up | a chip whose last word rolls once (out of the chip upward, the new word in from below, 16 f) over two diagonal streams of tiles, rows of tiles flowing past, or the product's own screen with its lens gliding to a new row; the content rushes out right |
| 5 | `taglines` | panel, claim | the rush carried | two imperatives taking turns beside the product's screen as a lit panel on the film's one 3D turn, landing face-on (falling into place, the first dropping off), or the first one alone as the claim on the accent swept in from the left (one poster line, never two in a row); a push into the cut |
| 6 | `end` | spin, rise | a designed hard cut | the mark spins in (when the brand did not spin) or rises out of a mask with the name; the close rises under them; the lockup holds about a second and a half with a creep, the tail included |

**What to write.**
- `src/ad.ts`: the script (the opener 3-4 words with the name first: what it is; one word either side of the stack; the
  claim 3-5 words, its last word on the pill; the label twice, only its last word different; two 2-4 word imperatives,
  the verb first; the close), the product's own items (4 or more: what people keep in it, with a glyph and a preview
  kind, or `logo` when an item IS another product's), its world (`kind`: the sample data that fills the rest), and
  `integrations`: the slugs of the real marks of the products it really works with (`node scripts/logos.mjs get
  <name> --film .`; never a mark for a product it does not touch). Delete its placeholder lines.
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; the spin needs a mark that reads at
  190 px while turning, the tile a mark that sits in a 240 px app tile.
- The direction: deal it and retell this floor in its world: its ground and type replace `acts/stage.tsx`; rebuild the
  items and the screen from the product's real ones. At a vertical size (`--size 1080x1920`) re-lay the field, the
  streams' angle and the panel for the tall frame.

**Look.** Clean grounds (two paper tones, flat or a very subtle wash lit from the film's one key, never the same on more
than two shots; one light event per act, a shade across the frame); the panel stands on the slate. Hero lines take
confident presets (`fx/TypePresets`: land, fly, mask, fall; the claim's crisp words), never a soft, half-faded run; the
accent only on the newest word, the pill, the swapped word and the mark.

**Timing.** `src/timeline.ts` places every act on a bar line and every state change as a CUE on the 16th grid. Each exit
cue waits for its line's read (`HERO_END` says when a preset's line is whole), the beats inside an act spread to fill
it (so nothing waits dead), and an act that cannot hold its reads in its bars gets a bar more (`ACT_BARS`, `BARS`); a
line that cannot be read at all fails at import: shorten it.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): driving, 140-160 BPM
(or half-time); then `track.py edit --bars <BARS>`, `grid` and `check`. `src/sync.ts` places few effects from the
picture's own frames, each device its own: the opener landing and whole, the stack, the mark and its name, the rise,
the field and the pill, the label and its swap, the rush, each tagline, ONE element at the lockup. The cuts get
nothing: the track carries them.
