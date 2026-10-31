# The update template

A 20-27 s update film ("vX is out", 2-4 changes) laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter acts it
removes). The film fills one file, `src/update.ts`; everything else is dealt from the product's name (or from the deck,
`src/dealt.ts`).

**The shape.** The name and the version, centred, as one pair from the first frame. Then each change is a picture and
a line, in its own shape (`src/deal.ts` order):

- `show`: the picture first (the card comes in and works), then the card folds shut into a bar of light and its line
  rises from it, alone in the middle of the frame.
- `after`: the picture first, then the element that changed (the pressed button, the block, the row, the last bar)
  grows into the frame's lit colour field and the line reads on it; under it the ground takes its own colour event
  (fx/Grounds FamilyGround `event`). Once a film.
- `split`: the line first, parted round the card, which sits small in the gap between its words; the words leave and
  the card grows out of the gap as the new screen and works.
- `lead`: the line first, alone (the card before it folds into the bar it rises from), then the picture.

A line never follows a line: once a change opens on its picture, the later ones do too. One picture hands over to the
next by a carried element (the element that changed grows into the next card; the colour field closes into the next
card or into the dot its device starts from), never two screens crossing at size.

**The creative devices** (`fx/creative`, `src/deal.ts` CREATIVE and PICTURE). Each change's card is brought in, or
played, by the device that shows that change:

| the change has | device | what the viewer sees |
|---|---|---|
| a tap | `cursor-follow` | the camera pushes onto the pointer, rides it to the button, clicks on the hit, pulls back to the card reacting |
| `before`: 4-7 pings or questions | `bubble-swarm` | the pings pop round the frame, then the screen arrives and draws them in as its rows land |
| `before`: 2-4 hand steps, or a swap | `split-compare` | the old way waiting on its spinners beside the product doing it, then the product takes the frame |
| `photos`: 5 or more (a grid's photos count) | `photo-arc` | the photos stream through in one row, slow, and the chosen one (the first) opens into the screen |
| `logos`: 3 or more | `logo-orbit` | the products it works with orbit, then collapse into the screen |
| anything that comes in after a line | `pixel-assemble`, `shape-morph`, `object-turn` | tiles assemble it, a dot morphs into its frame, or it turns to face the lens |

The deck's devices play first (`python3 scripts/deck.py --creative --have <...>` writes `src/dealt.ts`), each on the
change it shows outright, then the reserve's; a dealt device that only brings a card in takes a change nothing shows
better (one dealt device always plays when it can). Two or more a film. The line devices: the field line is the
library's `scale-contrast` (its key word huge); a dealt `letter-swing` or `word-swap` (needs `swap`) takes a line of
its own; every other line's key word is set in the accent. The devices this template does not play (zoom-wall,
data-sculpture, colour-flood, dot-button, type-object, type-window, split-around) pass to the next in the deal.

Then the recap (every change's card in a row with its own picture: the chosen photo, the faces the tap added, the rows
it ended with), and the end card built from it: the cards pile and shrink into the mark, the name comes out of the
mark first letter first (the pairing's wordmark weight, tracked so no two letters touch), the version lands on the last
bar line apart from it, and the lockup holds to the end (1.5 s or the track's ring-out).

**The rules it keeps.** The camera never floats: it moves only with a device (the push onto the pointer, the pull back,
a turn that lands) and every hold is still. Nothing bobs or breathes, no card rests tilted (object-turn's turn lands
facing the lens). The changed screen fills the frame on its beat (two thirds of its height, or cursor-follow's close-up).
Cards are kit/card `Card` (light; dealt dark on a dark ground), never a translucent or hand-drawn box. People are real
photos or absent, never initials; a week shows its blocks. Lines are centred, never sit over a sharp card, never travel
sideways and leave whole. Another product's mark in a line is its official mark in the line's own ink.

**The deal** (`src/deal.ts`, seeded by the name; `PIN` a slot or `SEED` to re-deal; the last three films' choices are
left out through `src/recent.ts`): the ground (all eleven lit, still families of fx/Grounds; the deck's when it dealt a
direction), the hook (`roll`, `rise` or `badge`), the arrival of a card no device brings (`rise`, `open`), the order of
shapes, the recap (`deal` or `rise`), the end (`stack` or `fold`), the cards' tone (kit/card: light, or dealt dark on a
dark ground), the creative devices and the lines' voice (one move and one whole-line exit). Print it: the command in
template.json `deal.print`.

**What to write.**
- `src/update.ts`: the version and the one before it, and 2-4 changes. Each: `words`, one plain sentence of 2-6 words
  saying the result the user sees (copy-check fails a feature name); `key`, the words set apart; `title` and `sub`, the
  screen's own header; `show`, the moment that proves it (`tap` with `you` when the tap adds the viewer, `fill` as list,
  grid or week, `swap`, `count`), in the product's own words, its numbers holding up when paused (a count on the screen
  changes with the tap, or is not there); `recap`, the few words its recap card shows; and what a device can show when
  the change really has it: `before`, `photos`, `logos`, `swap`. A change that works with another product writes "[]"
  where its mark sits, with `logo` (the slug from `node scripts/logos.mjs get <name> --film .`) and `logoName`. Real
  photos: `node scripts/assets.mjs get`.
- The brand: `--brand <kit>` writes the tokens, the logo's parts (`src/brand/logo.ts`) and the name; the type pairing
  comes from `npx tsx scripts/type-deal.ts --seed "<name>"`. Without a kit, replace the placeholders by hand.

**Look early, render in parts.** The end card first: `npx remotion still src/index.ts Film out/stills/end.png
--frame=<TOTAL - 1> --scale=0.5`; then a sampled sheet: `npx remotion render src/index.ts FilmEvery out/sheet --sequence
--image-format=jpeg --props='{"step":24}' --scale=0.5` (about 30 frames, under two minutes); then the film in two or
three `--frames=a-b` parts joined with ffmpeg's concat, so a job limit never costs the ending.

**Music (the slot every film fills).** Cut to a licensed, human-made, instrumental track, never effects only
(template.json `music`). Find it (`node scripts/music.mjs search --mood "<words>" --bpm 112-128`), bring it in with
`--music <file> --record <licence.json>`, and once `update.ts` is written `python3 scripts/audio/track.py fit --end
auto` cuts it to the film's bars (its entry on the recap, its final hit on the version mark).

**Timing.** Every change takes whole half bars (two bars at least), the last one squaring the changes to a bar line so
the recap and the version mark land on bar lines: the card's arrival (a device as long as its own steps), the moment's
1-3.5 s, the result held (1.6 s when the picture ends the change, 1.05 s when its line follows), the line's read at the
pace; the slack goes to the result while the picture beat is under 3.6 s, then the line. What comes next starts as a
line leaves. `src/sync.ts` places the sounds on the picture's own frames: every tap, landing, state change and line,
each device's own beats (the pings popping, the row of photos landing, the divider, the push and the pull), the field's
swell, the card's moves as quiet air, the lockup's hit.
