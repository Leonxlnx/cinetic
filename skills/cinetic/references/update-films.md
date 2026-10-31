# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story with
one signature shot. An update film says that a new version exists and shows what changed: the name and the version,
then each change as a picture of the product doing the new thing and one short centred line that says the result, a
recap, and the version mark. The update template (`assets/templates/update`) builds all of it from one file; this page
is its shape, what you write, what it deals and how to look at it early.

Contents: 1. The shape · 2. Start · 3. Writing the changes · 4. The creative devices · 5. Picture rules · 6. Sound ·
7. Timing · 8. Look early, render in parts · 9. Gates and traps

## 1. The shape

| Beat | What happens | Length |
|---|---|---|
| Name and version | the product's name and the version, centred, as one pair from frame 0 (`roll`: the old numerals roll to the new; `rise`: the version rises beside the name; `badge`: a dot lands and grows into the pill carrying it) | 1 bar |
| Change × 2-4 | a picture and a line: the product's card comes in (its creative device, section 4), works on its beat (a tap and the state it changes to, a list, grid or week that fills, a before -> after, a figure that rises) and holds its result; the line says that result in 2-6 words | 2-3.5 bars each, on half bars |
| Recap | every change's card in one row, each with its own picture (the chosen photo, the faces the tap added, the rows it ended with) | 1 bar |
| End card | the cards pile into the mark, the name comes out of it first letter first, the version lands on the last bar line apart from the name; held to the end | 1 bar and the tail (1.5 s or the track's ring-out) |

Each change takes its own shape (`src/deal.ts` order):

- `show`: the picture first, then the card folds shut into a bar of light and its line rises from it, alone in the
  middle of the frame.
- `after` (once a film): the picture first, then the element that changed (the pressed button, the block, the row,
  the bar) grows into the frame's lit colour field and the line reads on it, its key word huge (scale-contrast); under
  the field the ground takes its own colour event and settles after it. The field closes into the next card, or into
  the dot the next card's device starts from.
- `split`: the line first, parted round the card, which sits small in the gap between its words; the words leave and
  the card grows out of the gap as the new screen and works.
- `lead`: the line first, alone (the card before it folds into the bar it rises from), then the picture.

A line never follows a line: once a change opens on its picture, the later ones do too. A picture hands over to the
next by a carried element (the element that changed grows into the next card), never two screens crossing at size.
Never "text on top, picture below": the line and the card take turns in the middle of the frame.

## 2. Start

```bash
bash scripts/new-film.sh <dir> --format update --name "<Product>" [--brand <kit>] [--music <file> --record <licence.json>]
cd <dir>
npx tsx scripts/type-deal.ts --seed "<Product>"        # the type pairing (fx/TypePairs), unless the brand has a face
python3 scripts/deck.py --creative --have photos,ui     # optional: the deck deals the creative devices (src/dealt.ts)
```

Then write `src/update.ts` (section 3), replace the brand placeholders (palette, mark), and print the deal (template.json
`deal.print`): the ground family, the hook, the shapes, the recap and end, the cards' tone, each change's picture
device (`PICTURE`) and line device (`LINE_DEVICE`). `PIN` fixes a slot, `SEED` re-deals.

## 3. Writing the changes

`src/update.ts` holds the facts: the version, the one before it, and 2-4 changes. Each change:

| field | what it is |
|---|---|
| `words` | one plain sentence of 2-6 words, the result the user sees ("Book a desk in one tap"), never a feature name |
| `key` | the words set apart: the accent, or the line device's emphasis (every line names one) |
| `title`, `sub` | the screen's own header, in the product's words |
| `show` | `tap` (rows, `action`, `done`, `result`, and `you`: the viewer the tap adds), `fill` (`list`, `grid` or `week`, the `accent` item landing last), `swap` (before, after, a tag), `count` (from, to, unit, bars) |
| `recap` | the few words its recap card shows |
| `before` | the old way, when the change has one: 2-4 hand steps (split-compare) or 4-7 pings and questions it ends (bubble-swarm) |
| `photos` | 5 or more pictures the change is about (photo-arc; a grid of 5+ photos gives its own) |
| `logos` | 3 or more products it works with (logo-orbit), official marks in the film's ink |
| `swap` | 2-3 words the key word rolls through before the real one (word-swap) |
| `logo`, `logoName` | a change that names another product: "[]" in `words` where its mark sits |

- **People are real photos or absent**, never initials on a disc: a row's `photo`, the tap's `result` and `you`.
  Places and things the change is about are photos too (`node scripts/assets.mjs get`).
- **The data holds up when paused.** One label per state (the button says "Booked"; nothing repeats it); the viewer's
  own action changes what the screen holds (two people, then you); a count on the screen matches what is on it, and
  a number the tap would change is either changed or not shown; a week shows its blocks.
- **Test it muted:** would a stranger say what changed in the same words? If a change cannot be shown as a state
  change (a fix, a speed-up), show its consequence: the waiting that no longer happens, the number that changed.

A whole update (Nook 2.5, three changes, about 25 s): "See every room before you go" (a grid of six photographed
rooms fills), "Book a desk in one tap" (the pointer presses Book desk, it turns to Booked and you join the two already
there), "Every answer in one note" (`before`: five questions people kept asking; the morning note's rows land as the
questions are drawn in).

## 4. The creative devices

The template plays the library's devices (`fx/creative`, `references/catalogue.md` §0) on the change beats, each on the
change it shows, two or more a film:

| the change has | device | on screen |
|---|---|---|
| a tap | cursor-follow | the camera pushes onto the pointer resting on the card, rides it to the button, clicks on the hit and pulls back to the card reacting |
| `before`: 4-7 pings | bubble-swarm | the pings pop round the frame, faster and faster; the screen arrives and draws them in as its rows land |
| `before`: 2-4 steps, or a swap | split-compare | the old way waiting on its spinners beside the product working, then the product takes the frame |
| `photos`: 5+ | photo-arc | the photos stream through in one level row and slow; the chosen one (the first) opens into the screen |
| `logos`: 3+ | logo-orbit | the products it works with orbit, then collapse into the screen |
| any card coming in after a line | pixel-assemble, shape-morph, object-turn | tiles assemble it, a dot morphs into its frame, or it turns to face the lens and lands |
| the field line | scale-contrast | its key word huge, the rest small above and under it |
| a line of its own | letter-swing, word-swap (`swap`) | the key word's letters swing into place; the key word rolls through its alternatives |

The deck's devices play first (`src/dealt.ts` creative, then its reserve; without a deck the name deals a
recency-weighted shuffle of the whole library, so the next film plays others): each dealt device takes a change it
shows outright, then the reserve fills the changes still bare, then a dealt device that only brings a card in takes
what is left (one dealt device always plays when it can). zoom-wall, data-sculpture, colour-flood, dot-button,
type-object, type-window and split-around pass to the next device in the deal (the carried card already plays their
part). To get a device, give the change what it shows: `before` for the swarm or the split, `photos` for the arc.

## 5. Picture rules

- **A lit place.** One of the eleven lit, still ground families (fx/Grounds FamilyGround: nearWhite, lightStudio,
  softSky, gradientField, whiteBand, blackField, studio, deepPool, duskMesh, floorGlow, lightDark), never cut; its colour
  event once, under the colour field (lightDark turns dark there). The deck's direction sets it when one was dealt.
- **The changed UI fills the frame on its beat:** the card at two thirds of the frame's height (up to 86 %), or
  cursor-follow's close-up. Never a small card parked in half an empty frame.
- **Cards are kit/card `Card`**: light (standing a little off a light ground), or dealt dark on a dark ground (8-12 L*
  over it), facing the lens, never translucent, never a hand-drawn grey box.
- **Type from the pairing**: the voice and the text face type-deal wrote; every line centred, one move and one exit a
  film, its key word set apart; the end card's name in the pairing's wordmark weight, tracked so no two letters touch
  (fx/TypePairs `wordmarkStyle`, `safeTrack`), the version apart from it by a real gap, lighter, in the accent.
- **The camera moves only with a device** (the push onto the pointer, the pull back, a turn that lands); every hold is
  still; nothing bobs or breathes; no card rests tilted.

## 6. Sound

An update film is cut to a licensed, human-made, instrumental track (`references/music.md`): `node scripts/music.mjs
search --mood "<the film's mood words>" --bpm 112-128 --length <s>`, `sheet --measure`, `get '#n' --to audio/music`,
then `python3 scripts/audio/track.py fit --end auto` once `update.ts` is written (its entry on the recap's bar, its
final hit on the version mark). `src/sync.ts` places the effects on the picture's own frames: every tap, landing,
state change and line, each device's own beats (the pings popping and being drawn in, the row of photos landing, the
divider, the push and the pull), the field's swell, the card's moves as quiet air, the lockup's hit (`npm run cues`,
then the kit and the mix: `references/sound.md`).

## 7. Timing

Every change takes whole half bars (two bars at least), the last one squaring the changes to a bar line so the recap
and the version mark land on bar lines: the card's arrival (a device as long as its own steps, 0.9-2.5 s), the
moment's action, the result held (1.6 s when the picture ends the change, 1.05 s when its line follows), the line at
the pace; the slack goes to the result while the picture beat is under 3.6 s, then to the line. What comes next starts
as a line leaves. At 120 BPM: two changes about 20 s, three about 25 s, four about 30 s (keep four for a real need).

## 8. Look early, render in parts

A render that runs out of time loses the ending, the lockup and the logo. So:

1. The end card first: `npx remotion still src/index.ts Film out/stills/end.png --frame=<TOTAL - 1> --scale=0.5`.
2. A sampled sheet of the whole film: `npx remotion render src/index.ts FilmEvery out/sheet --sequence
   --image-format=jpeg --props='{"step":24}' --scale=0.5` (about 30 frames in under two minutes), tiled into one
   contact sheet; judge it against section 5 and fix before any full render.
3. The film in two or three parts (`npx remotion render src/index.ts Film out/part-a.mp4 --frames=0-389 --scale=0.5`,
   then the rest), joined with ffmpeg's concat demuxer, then `scripts/render.sh` for the master.

## 9. Gates and traps

- `npm run check` (tsc, lint-film, grid-check) and the ship gate apply as for any film; `grammar-score.mjs --format
  update` reads the update band. grid-check warns that inner changes start off a bar line (half bars, on purpose).
- Traps: no name in the first 3 s; a feature list in text, or a keyword per change instead of a sentence; a change
  with no `before` or `photos` when it has them (its device cannot show it); initials instead of faces; a label
  repeated on one card; a count that the viewer's action should change and does not; the version shown twice as the
  same still; a music bed added after the cut; rendering the whole film before looking at the end card.
