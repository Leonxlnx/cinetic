# Library: type

Finished animations that make words an event: lines that land with weight, type with a texture or a treatment,
playful letters, a statement typed into a product, and clean exits. Import them from the kit
(`import { WeightLine, BarStack, LightWord } from '../../kit';`). The reel `library-type` shows every piece with its name
in the corner: render it to see them move.

Every piece reads the frame itself and takes `at` (its first frame), its content, size (`size` is the font size in px),
position (`x`, `y`, the centre; default the frame's centre), colours, a timing control (`dur`, `gap`, `per`, `cps` or
`speed`) and a `seed` where there is randomness. Statements are in `fonts.inter`, sentence case, without a full stop
unless the sentence needs one; punctuation is never animated and never marked.

Never: letters that start widely spaced and pull together; a line that leaves by fading while it rises (use one of the
exits below or a hard cut on the beat); a typed line that lands its rest at once; a counter that blurs or smears; a
flash or an inverted frame; a label in uppercase mono; an eyebrow line over a statement.

## Lines that land

### WeightLine
Words arrive one or two at a time and land with weight: the first comes in at twice its size, blurred and in a born
colour, and drops to size in 8 frames; each word that joins comes in a little larger, sharpens and cools to the line's
colour, while the line re-centres. Optionally one word sits on a solid block that wipes in behind it. For a statement
that should feel said, word by word, on the music's beats.
```tsx
<WeightLine text="Every invoice sent tonight" times={[T.a, T.b, T.b, T.c]} size={130} color={INK} born={ACCENT}
  block={{ index: 3, color: INK, ink: '#fff', at: T.c + 16 }} />
```
- Props: `text`, `at`, `gap` (9) or `times` (words that share a frame land together), `size`, `color`, `born`, `land`
  (2), `blur` (18), `dur` (8), `recentre` (9), `block` `{ index, color, ink, at, dur }`, `leaveAt` (a hard cut), `x`, `y`,
  `font`, `weight` (600).
- Numbers: the size decays like a fall-off, about 2.0, 1.65, 1.43, 1.3, 1.17, 1.09, 1.04, 1.0 over 8 frames; blur 18 px
  to 0 over the same frames; the colour cools over the next 10 frames; joining words start at 1.18x, pinned at their left
  edge; the block wipes from the left in 8 frames (expo out) and the word turns to the block's ink exactly where it has
  passed.
- Caution: two words per beat at most; a block on more than one word per film stops meaning anything.

### RiseLine
The clean masked rise: each word rises into place from behind its own baseline mask, no fade and no tilt, 3 frames
after the one before. `swap` replaces one word in place (it rolls up out of its mask with the new word a line below it,
the line re-centring), `leaveAt` closes the mask: the words sink back behind their baseline, the last word first.
```tsx
<RiseLine text="Made for designers" at={T.line} swap={{ at: T.swap, index: 2, word: 'founders' }} swapColor={ACCENT} leaveAt={T.out} size={130} />
```
- Props: `text`, `at`, `gap` (3), `dur` (14), `swap` `{ at, index, word }`, `swapColor`, `leaveAt`, `size`, `color`, `x`,
  `y`, `font`, `weight` (550).
- Numbers: rise 14 f expo out; the swap roll 12 f in-out with the re-centre 12 f in-out from 2 f later; the sink 9 f
  expo in, 1 f between words.
- Caution: the mask is the line box (line height 1.25): keep other things clear of the line's own box or they get cut.

### MarkPhrase
A line that is already there gets marked: a flat highlight sweeps in behind a phrase from the left and the words turn
to its ink exactly where it has passed; an underline draws itself under a phrase from the left, round-ended. A mark
never covers punctuation.
```tsx
<MarkPhrase text="Reviews take minutes, not days" at={T.line} size={110} marks={[
  { from: 2, to: 2, at: T.mark, kind: 'highlight', color: INK, ink: '#fff' },
  { from: 3, to: 4, at: T.under, kind: 'underline', color: ACCENT },
]} />
```
- Props: `text`, `at` (the line cuts on: put a `RiseLine` before it, same size and weight, for an entrance), `marks`
  `[{ from, to, at, kind, color, ink, dur }]`, `size`, `color`, `x`, `y`, `font`, `weight` (550).
- Numbers: highlight 12 f in-out, padded 0.09 em, 1.12 em tall from 0.9 em above the baseline; underline 14 f in-out,
  0.07 em thick, 0.13 em under the baseline.
- Caution: at most two marks in a line, and colour emphasis in at most two statements of a film.

### BlurSweep
A line that comes into focus from left to right: a soft front a few letters wide in which each letter sharpens from a
heavy blur. Calm, for a message, a quote, a line that should feel spoken.
```tsx
<BlurSweep text="See you at the studio at nine?" at={T.msg} speed={0.8} soft={7} size={96} />
```
- Props: `text`, `at`, `speed` (letters per frame, 0.8), `soft` (7), `blur` (14), `size`, `color`, `x`, `y`, `font`,
  `weight`, `style`.
- Caution: one per film; it is slow by nature (a 30-letter line takes about 45 frames).

## Size as meaning

### ScaleJump
One word giant, filling the frame edge to edge and cropped by the bottom edge, pushing in and rising for 9 frames; a hard
cut to the same word at a middle size for 2 frames; a cut again to it at line size; then the rest of the line joins
word by word, the line jumping to its new centre on each word.
```tsx
<ScaleJump text="Shipping every week" at={T.jump} times={[T.every, T.week]} size={150} />
```
- Props: `text` (the first word jumps), `at`, `big` (3.9), `mid` (1.7), `hold` (9), `midFor` (2), `times`, `recentre`
  (0: a jump; give 5 for a short glide), `size`, `color`, `x`, `y`, `font`, `weight` (600).
- Numbers: the giant scales 1 to 1.12 (expo out) while its centre rises from 0.38 to 0.15 of its own size below the
  frame's centre; the line's first word is 0.26 of the giant.
- Caution: the giant word must be short (one word up to about 9 letters) or it reads as noise, not a word.

## Type with a texture

### RollType
A line typed in place, character by character at an uneven pace, without a caret; its last digit then rolls like a
counter, one crisp step a frame with its neighbours faint above and below, and slows onto its value while a low dash
appears after it. A year becoming the next ("Spring 2027"), a version, a count.
```tsx
<RollType text="Spring 2027" from="3" at={T.year} size={160} />
```
- Props: `text`, `at`, `from` (the starting digits of the rolling tail), `per` (frames per typed character, 1.6),
  `rollDur` (frames of the last, slowing step, 5), `size`, `color`, `ghosts` (0.42), `caret`, `x`, `y`, `font`, `weight`,
  `seed`.
- Numbers: typing gaps of 0.45 to 1.75 of `per`, 1.8x after a space; the roll starts about 2 f after the last typed
  character; neighbours sit 1.08 em above and below.
- Caution: never blur the digits; a roll of more than 6 steps reads as a slot machine.

### TrackedType
A word bent on a shallow crest, each letter in a thin outlined box that turns with it, its live screen coordinates
printed small above the box, a dot at its centre, and dashed loops with arrowheads running between the letters: the look
of motion tracking laid over type. `glitch` frames slice the letters for one frame each.
```tsx
<TrackedType text="Signal" at={T.word} size={400} glitch={[T.word + 44, T.word + 46]} />
```
- Props: `text`, `at`, `size`, `color`, `box`, `dot`, `path`, `bend` (-130 px at the ends), `dur` (40, the bend relaxing
  from 1.3x), `labels`, `paths` (5), `glitch`, `x`, `y`, `font`, `weight`, `seed`.
- Numbers: one box a frame; loops draw over 8 f, 1 f apart, their dashes crawling 2.2 px a frame.
- Caution: the coordinates are texture, not copy: keep them small and never put a message in them.

### TileWord
A giant word that builds itself out of a lattice: outlined cells (crosses, rings, slashes) sweep in on a tilted,
rippling plane and fill solid into a blocky word; it holds tilted, then a hard cut shows it flat and whole, every tile
with a dot at its centre, creeping. The turn of an argument, full width.
```tsx
<TileWord text="Next" at={T.turn} size={720} cell={28} />
```
- Props: `text`, `at`, `size`, `cell` (24), `color`, `ink` (the dots and grid: the ground), `dur` (14), `hold` (6),
  `leaveAt` (the tiles dissolve over 6 f), `x`, `y`, `font`, `weight` (700), `seed`.
- Numbers: the plane goes from rotateX 58, rotateY -38, rotateZ 26 and 2.3x to 24, -16, 9 and 1.32x (expo out, 14 f);
  cells appear as outlines over the first third and fill left to right; the flat word creeps 3 % over 60 f.
- Caution: one or two short words; give it the whole frame and a dark ground.

### DotWord
A word in dot-matrix, typed in letter by letter (each letter's dots pop in over two frames in a scatter), the dots soft
square LEDs. `glitch` frames slip bands of dot rows sideways for one frame.
```tsx
<DotWord text="slow" at={T.word} size={460} cell={22} glitch={[T.word + 39]} />
```
- Props: `text`, `at`, `per` (3, uneven), `size`, `cell` (22), `color`, `glitch`, `shape` (`square` or `round`), `x`,
  `y`, `font` (geist), `weight`, `seed`.
- Caution: a glitch frame is a seasoning: two in a shot at most, never on every word.

### LightWord
A wall of round lights in saturated colours, bulging like a screen seen through a lens, twinkling on twos; the camera
pulls back from big square pixels to a field of small dots while, on a dark plate in the middle, the label scrambles
through stray glyphs and finds its characters left to right. Then the coloured lights fall away column by column and
the label is redrawn in white lights on black.
```tsx
<LightWord text="2030" at={T.year} resolveAt={T.year + 40} size={260} />
```
- Props: `text`, `at`, `resolveAt` (at + 36), `decode` (24), `size`, `pitch` (34), `hues` (no purple or green in the
  default), `ground`, `bulge` (0.22), `x`, `y`, `font`, `weight`, `seed`.
- Numbers: big pixels at 3.2x the pitch hold 4 f, then pull back over 14 f (in-out); glyphs hold two frames; the fall
  is gravity with up to 4 f of stagger by column, gone in about 7 f.
- Caution: it fills the frame and is loud: a year, a number or one short word, once.

### DotDive
One letter becomes the way in: a small plain letter holds for 3 frames, cuts to the same letter in dot-matrix that grows
toward the lens, tilts back and turns into a deep field of dots the camera flies through. Cut to the next shot on its
last frame.
```tsx
<DotDive char="o" at={T.dive} dur={34} size={460} />
```
- Props: `char`, `at`, `dur` (34), `size`, `cell` (18), `color`, `dim`, `x`, `y`, `font`, `weight`, `seed`.
- Caution: the next shot must start on its last frame (`at + dur`); held longer it is an empty starfield.

## Playful letters

### DropWord
A heavy lowercase word whose letters fall in one at a time from different sides (spinning, blurred by their speed),
land with a squash and a bounce and settle a little crooked, while small characters pop in on and around them and stay
alive (bob, blink, look at the word). From `leaveAt` the letters fall apart, each flying off the frame in its own
direction, while the characters stay. `leave="push"`: the first character runs along the baseline and knocks the letters
away.
```tsx
<DropWord text="blip" at={T.mark} size={600} leaveAt={T.out} />
```
- Props: `text`, `at`, `gap` (6), `size`, `color`, `actors` (`[{ node, color, shape, size }]`, default three), `leaveAt`,
  `leave` (`scatter` or `push`), `x`, `y`, `font`, `weight` (800), `seed`.
- Numbers: a 6 f fall (quadratic), a squash to 0.84 / 1.1 decaying over 3 f, a bounce of 7 % of the size; characters pop
  on their letter's landing (spring); the scatter accelerates over 16 f, starts staggered by up to 4 f.
- Caution: the characters are the product's (pass your own `node`); never invent a mascot for a brand that has none.

### ArcToss
A word tossed in: its letters arrive in a quick wave from left to right, each dropping from above on a curve, turned and
smaller, blurred by its speed, landing with a small overshoot, so for a few frames the word reads as a ribbon unrolling
into place; then it eases back a touch.
```tsx
<ArcToss text="Schedule" at={T.title} size={230} />
```
- Props: `text`, `at`, `lag` (1.2 f between letters), `dur` (9), `size`, `color`, `x`, `y`, `font`, `weight` (600),
  `leaveAt` (the letters fly out up and right, accelerating over 10 f).
- Caution: one word; on a long line the wave takes too long to read.

### BarStack
Three big lines stacked tight and staggered to the right: the first slides in from the left, the others from the right,
and a solid bar wipes in from the right behind one line and runs on past the left edge, so that line reads reversed out
of the bar. Then the lines drift apart in a slow cross-parallax. `leaveAt` carries the block up and out at speed.
```tsx
<BarStack lines={['plan', 'your', 'launch']} at={T.stack} size={270} leaveAt={T.out} />
```
- Props: `lines`, `bar` (1), `at`, `size` (230), `color`, `barColor`, `barInk`, `offsets` (em), `drift` (px per frame),
  `dur` (9), `leaveAt`, `x`, `y`, `font`, `weight` (700).
- Numbers: lines settle in 9 f (expo out), the bar's edge travels for 16 f; drift 12, -10.5, -12 px a frame at first,
  slowing over a second; the exit is 10 f, accelerating.
- Caution: one or two words a line; the bar bleeds off both edges, so nothing else may sit on its row.

## Words inside a product

### HostType
One statement typed into a product's prompt field at a steady, believable pace, while the product around it changes by
hard cut every 4-6 frames: the field stays at the same spot on screen and the text carries on across every cut. Each
host is a whole page (the product's name, a heading, the field with its mode and send button, chips or a sidebar) on a
flat ground, pushed in by its own amount.
```tsx
<HostType text="Anyone can build a shop tonight" at={T.type} hosts={myHosts} />
```
- Props: `text`, `at`, `cps` (characters a frame, 0.62), `every` (5), `hosts` (`[{ ground, card, ink, muted, line,
  accent, accentInk, app, glyph, title, sub, radius, chips, mode, zoom, side }]`), `w` (1240), `size` (54), `x`, `y`,
  `font`, `seed`.
- Numbers: characters every 1/cps frames with 0.8-1.2 of unevenness, 1.5x after a space; each host pushes in 0.4 % a
  frame about the text's first letter, so the typed words never move.
- Caution: the default hosts are invented products; for real products use their real pages and marks (`<Brand>`), never
  a look-alike of a real one.

## Exits

### PushApart
An exit made by what arrives: the gap between the two halves of a short line prises open while a dot grows in it and the
camera creeps in, then a cut in: the object whole in the middle with a small settle, the halves pushed to the frame's
edges, out of focus, sliding off.
```tsx
<PushApart left="Meet" right="Pico" from={T.line} at={T.push} objSize={420} size={130} node={<AppIcon size={420} ... />} />
```
- Props: `left`, `right`, `from` (the line cuts on), `at` (the push starts), `node` (drawn at `objSize`), `objSize` (420),
  `dur` (16), `size`, `color`, `x`, `y`, `font`, `weight`.
- Numbers: phase one 16 f: the camera 1 to 1.3x, the dot 1.5 % to 16 % of the object (log space); on the cut the camera
  is 1.75x, about 40 % of each half shows at the edges, blurred 9 px, sliding off over 12 f.
- Caution: the object must be worth the frame (the product's icon, its character, its device); a generic shape wastes the
  move.

### BlockOut
An exit that is also a turn: on `at` the line is replaced by a solid block of its own width, as if the words were
selected; two frames later the block grows to cover the whole frame (the next shot starts on its colour) or snaps shut to
the right.
```tsx
<BlockOut text="Done in seconds" from={T.line} at={T.out} block={INK} cover={NIGHT} size={130} />
```
- Props: `text`, `from`, `at`, `mode` (`cover` or `collapse`), `block`, `cover`, `dur` (12 cover, 7 collapse), `size`,
  `color`, `x`, `y`, `font`, `weight`.
- Numbers: the block is the line's ink width plus 0.06 em a side and 0.86 em tall from the cap line; the cover grows in
  log space (in-out, 12 f) from the block's box to the frame.
- Caution: the next shot must start on exactly the cover's colour, or the turn reads as a colour jump.

The mask that closes is `RiseLine`'s `leaveAt`; the hard cut on the beat is `WeightLine`'s `leaveAt` (or the end of a
Sequence).
