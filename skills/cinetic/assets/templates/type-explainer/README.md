# The type-explainer template

A 20-30 s explainer told in type on a lit page, one short sentence at a time, laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --template type-explainer` (template.json lists the files it copies and the starter
acts it removes). Crisp word pace, the calm type family (small, airy sentence lines at the face's own letter fit),
90 BPM until the track's grid is in; 9 bars in the house plan, grown where a line's read needs it.

**The shape.** The name, what it is, the problem, the promise, the product, how it fits together, its parts, the close.
The product and the mark stand in for words, and every transition is made of content (the product that is a word
becomes the shot; the mark that is a word becomes the hub), with one wipe in the whole film.

**The devices.** Each slot tells its beat one of two or three ways, dealt per film from the name (`src/deal.ts`,
template.json `deal`), so no two films from this template run one fixed sequence. `explain.ts` `seed` re-deals,
`devices` pins a slot (`{ promise: 'lens' }`). See the deal with
`npx tsx -e "const t = require('./src/timeline.ts'); console.log(t.BARS, t.DEAL)"`.

| # | act | slot: devices | in | what happens |
|---|---|---|---|---|
| 1 | `open` | open: band, push, focus; voice: said, mask, build | cold open | the name (one giant word with an accent band and a pull-back as the mark arrives as its next word; the name and mark as one line with a push through onto the mark; or the name landing from x1.35, crisp in 8 f, the mark sliding out from behind it); then what it is, said at the pace of speech (uneven onsets, the crisp entry), risen out of a mask, or built word by word in a tint of the accent; it leaves right at full ink into a cut at speed |
| 2 | `pain` | land, push, crowd | the last line's speed carried | the problem as one line: landing oversized in the accent and cooling to ink; said, then a type push through it onto its last word (1.0-2.2x, crossing the frame); or in front of the tools it names, the real marks of what the product works with in three planes |
| 3 | `promise` | pill, roll, lens | a cut at speed | the first half said; the product opens in the line as a pill (or the slot first rolls through the real marks of what it works with); the second half appended; the pill grows into the next shot (or the camera pushes through the line into it) |
| 4 | `picture` | turn, stack | the pill becomes the shot (the signature) | the product's own screen built in code (kit `DenseScreen` from `explain.ts` `screen`: the product's own rows), a lit panel on the film's one 3D turn, landing face-on, or between content cards in three planes; it recedes out of focus as the mark and the name arrive |
| 5 | `system` | wipe, push, sheet | the one wipe | the soft feathered wipe, the push-wipe parked by the mark until the second half, or a lit sheet; the first half with the mark standing after it as a word; the second half appended; a push in on the mark; the words float off and the mark stays |
| 6 | `grid` | hive, ring, stack | the mark stays: it is the hub | the product's parts round it as content tiles (kit `ContentTile`: a glyph or the real mark, its name, a preview of what it holds) in one radial wave, on a ring, or in three planes; three read one a second, their tile lifting; they gather back into the mark |
| 7 | `end` | lockup, claim | the gather | the mark steps into the lockup, the name beside it, the close rising under them out of a mask; or the accent floods from the mark and the close is set as the claim on it, the lockup small; about 1.5 s of hold, then the tail |

**What to write.**
- `src/explain.ts`: the script (2-7 words a line, 3-5 read best at this small airy size; the halves of the promise and
  the system line at most 4 words each; plain sentences: the what line says what the product is, the close what to
  do), the product's 6-10 modules with their glyphs (`logo` when a part IS another product), the world its screen is
  drawn from, and `integrations`: the slugs of the real marks of the products it really works with
  (`node scripts/logos.mjs get <name> --film .`; never a mark for a product it does not touch). Delete its placeholder
  lines.
- The product's screen: `acts/product.tsx` draws the kit's dense screen from `explain.ts` `screen`; fill it from the
  product's real screens (its own rows, names and numbers) before shipping. A supplied photograph is a fallback only
  when the brief gives one (`picture.kind: 'photo'`); never stock.
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name. The mark is used as a word, so it must
  read at 90 px.
- The direction: deal it and retell this floor in its world: its ground and type replace `acts/stage.tsx`.

**Look.** The page is clean: two paper tones, each flat or a very subtle wash lit from the film's one key, dealt so no
ground holds more than two shots, and one colour ground where the product's parts gather round the mark (the grid on
the tilted tint, `fx/Grounds` `tint`: the accent's colour along one edge of the page); once per act the light on the page changes (a cloud crossing the window, a shade
across the whole frame, a second after the cut). No beams, pools, haze or floating plates; every depth item says what
it carries. Hero lines take confident presets (`fx/TypePresets`: every word solid within a few frames and moving while
it lands), never a soft, half-faded run.

**Timing.** `src/timeline.ts` places every act on a bar line (`BEATS`, whole bars) and every state change as a CUE on the
16th grid; `SPEECH` holds the uneven word gaps of a said line, `APPEND_GAP` the gap of an appended half, `HERO_END`
when a preset's line is whole. An act whose line cannot be read inside its bars at the track's tempo gets a bar more
(`ACT_BARS`, `BARS`), and a line that cannot be read at all fails at import: shorten it. Keep the grammar when you
retime: one sentence on screen at a time, cuts at speed, the product and the mark carry the seams, the one wipe, holds
that keep moving.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): calm and even, 88-110
BPM; then `track.py edit --bars <BARS>`, `grid` and `check`. `src/sync.ts` places the effects from the picture's own
frames, each device its own: the name, the mark arriving, each line once it is whole, the product opening and becoming
the shot, the name over it, the seam off the product, one sound for the parts' wave, the three parts read, the gather,
the name and ONE element at the lockup. The cuts get nothing: the track carries them.
