# Library: type

Finished animations that make words an event: lines that land with weight, type with a texture or a treatment,
playful letters, a statement typed into a product, and clean exits. Import them from the kit
(`import { WeightLine, BarStack, LightWord } from '../../kit';`). The reel `library-type` shows every piece with its name
in the corner; `frames.mjs library --category type` lists them.

Every piece reads the frame itself and takes `at` (its first frame), its content, size (`size` is the font size in px),
position (`x`, `y`, the centre; default the frame's centre), colours, a timing control (`dur`, `gap`, `per`, `cps` or
`speed`) and a `seed` where there is randomness. Statements are in `fonts.inter`, sentence case, without a full stop
unless the sentence needs one; punctuation is never animated and never marked.

Never: letters that start widely spaced and pull together; a line that leaves by fading while it rises (use one of the
exits below or a hard cut on the beat); a typed line that lands its rest at once; a counter that blurs or smears; a
flash or an inverted frame; a label in uppercase mono; an eyebrow line over a statement.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [WeightLine](#weightline) | enter, emphasis | 40 f | words land one or two at a time with weight: big, blurred and warm, dropping to size while the line re-centres | a statement said word by word on the beats; optionally one word set on a block |
| [BarStack](#barstack) | enter, exit | 25 f | three big lines slide in staggered, a solid bar wipes behind one so it reads reversed, then they drift apart | a short three-line claim with one word to stress |
| [ScaleJump](#scalejump) | enter, emphasis | 30 f | one word giant and cropped, pushing in; hard cuts to a middle size, then to line size, the rest of the line joining | size as meaning: one word that should hit before its sentence |
| [BlockOut](#blockout) | exit, join | 14 f | the line is replaced by a solid block of its width, which grows to cover the frame or snaps shut to the right | an exit that is also a turn into a shot on the cover colour |
| [RiseLine](#riseline) | enter, exit | 20 f | each word rises from behind its own baseline mask; a word can roll to another in place; the mask closes to leave | the clean default entrance for a line; a word swapped in place; a clean exit |
| [MarkPhrase](#markphrase) | emphasis | 14 f | a flat highlight sweeps behind a phrase (the words turn to its ink as it passes) or an underline draws under it | a line already on screen that needs one phrase marked |
| [BlurSweep](#blursweep) | enter | 45 f | a line comes into focus left to right, each letter sharpening from a heavy blur inside a soft front | a message, a quote, a line that should feel spoken |
| [RollType](#rolltype) | enter, emphasis | 30 f | a line typed unevenly in place, then its last digit rolls like a counter in whole steps and lands with a dash | a year becoming the next, a version, a count |
| [TrackedType](#trackedtype) | enter, idle | 40 f | a word on a shallow crest, each letter in a turning outlined box with live coordinates, dashed loops between them | motion tracking laid over type: a technical, analytic voice |
| [LightWord](#lightword) | enter, emphasis | 60 f | a bulging wall of coloured lights pulls back while a label decodes in the middle, then falls away to white lights | a year, a number or one short word, once, loud |
| [TileWord](#tileword) | enter, emphasis | 30 f | a giant word builds out of a lattice of outlined cells on a tilted plane, then cuts flat, every tile dotted | the turn of an argument, full width, one or two short words |
| [DotWord](#dotword) | enter | 20 f | a word in dot-matrix typed letter by letter, the dots soft square LEDs; glitch frames slip rows sideways | a short word with a digital, signal-like voice |
| [DotDive](#dotdive) | join, exit | 34 f | one plain letter cuts to dot-matrix, grows toward the lens and becomes a deep field of dots the camera flies through | a letter as the way into the next shot |
| [HostType](#hosttype) | build, enter | 60 f | one statement typed into a prompt field while the product around it changes by hard cut every few frames | a statement that is also the product in use, across many hosts |
| [DropWord](#dropword) | enter, exit | 40 f | heavy lowercase letters fall in one by one, squash and bounce, small characters pop in around them; they scatter | a playful brand word with characters of its own |
| [ArcToss](#arctoss) | enter, exit | 20 f | a word tossed in: letters drop on curves in a quick wave, a ribbon unrolling into place, then ease back | one word that should arrive lightly, a title |
| [PushApart](#pushapart) | exit, join | 28 f | the gap in a short line prises open while a dot grows in it, then a cut to the object whole, the halves sliding off | a line that gives way to the product's icon, character or device |
| [InkLine](#inkline) | enter, build | 45 f | a centred line built word by word: each word cuts on in a tint (grey, a hue path, warm light) and inks while the line re-centres, most of the move on the arrival frame | the voice-over line: a statement said word by word on the voice or the beat |
| [ScrambleType](#scrambletype) | enter, emphasis | 20 f | wrong glyphs change every few frames and lock into the word letter by letter, optionally inside corner brackets that roll it to the next word | a word that is computed, decoded or chosen: a status, a label, a step name |
| [FaceCycle](#facecycle) | enter, emphasis | 30 f | each new word of a caption arrives in a pixel face, cuts to an italic serif, then lands in the sans; one word may flip back to the serif | a caption with a playful maker voice beside pictures or products |
| [CornerLine](#cornerline) | enter, build | 40 f | a line built word by word inside four small corner marks that jump outward as it widens; the marks arrive as doubled dashes that collapse to squares | one framed statement: a tagline, a definition, the line the film is about |
| [CutAway](#cutaway) | exit | 4 f | a held line loses whole words by cut from its end (re-centring) or from its start (the rest in place), a step every frame or two | a line taken apart so the next phrase can take its spot |
| [GradientPass](#gradientpass) | enter, emphasis | 60 f | a colour gradient clipped to the glyphs passes along the line: letters appear at a soft front in warm colours, run to cool and settle to the ink behind a slower front | a closing line or a title that should feel lit as it is said |
| [TypeHead](#typehead) | enter | 30 f | a line typed letter by letter whose newest letters (or the word being typed) are in an accent that cools to the ink, a coloured head running with the caret | a query, a name or a title being typed, outside or inside a product |
| [CaretFollow](#caretfollow) | enter | 60 f | a prompt typed at a giant size after two caret blinks, centred while it fits; then the camera holds the caret in short smeared jumps so the start of the line leaves the frame | the one prompt or question a film is about, said big |
| [InlineChip](#inlinechip) | emphasis | 30 f | a rounded picture opens inside a sentence from a sliver to its width, pushing the words apart; its picture swaps every few frames and it can grow | a sentence that names something worth seeing: the photos, the product, the people |
| [EchoStack](#echostack) | emphasis, exit | 40 f | one word repeated into a stack of echoes, each nearer copy hiding the ones behind; labels pop around it; then the centre copy zooms by cuts until a letter fragment fills the frame | a word that means growth or quantity, said once and loud, leading into the next scene |
| [TagSlap](#tagslap) | emphasis | 40 f | small tilted label tags slap across a big word one after another, each opening from its centre in three frames | attributes of one thing (what a studio makes, what a product does) laid on it |
| [GatherLine](#gatherline) | enter | 30 f | the words or letters of a line sit scattered across the frame and drift, then gather into one set line on a single frame or by a short slide | a line that comes together: sorting, collecting, a scattered idea made one |
| [LightStreak](#lightstreak) | enter, exit | 8 f | a caption born from a horizontal streak of light: streak lines, the word doubled and smeared sideways, then sharp; it dies back into the streak | a caption over footage or a dark scene that should feel broadcast or remembered |
| [ClipExit](#clipexit) | exit, join | 8 f | an object slides across a held line and the letters are cut at its leading edge, so the line disappears behind it | a line that hands the frame to the product: its icon, a window, a card the story goes into |
| [SplitWord](#splitword) | enter, emphasis | 12 f | a big word split around a picture: the halves slide out from behind it, inner letters tucked under its edges, while the picture smears and swaps | a word whose subject is a picture: places, people, work being shown |
| [HingeWord](#hingeword) | enter, emphasis | 10 f | a word flips up from lying flat on its baseline, rising and darkening to ink; to swap, it heats along a colour path, tips back and the next one flips up | one word in a slot beside a picture or a device that changes two or three times |
| [StepWhip](#stepwhip) | enter | 30 f | each word cuts on far right of its place and jumps left in halving steps on a 12 fps clock until it sits; the line never re-centres and its spacing breathes | a hand-made, stepped voice for a short line said in phrases |
| [PartStack](#partstack) | emphasis | 24 f | two words of a held line part to open a slot and small pictures cut on into it one after another, overlapping in a loose cluster | a line about people, places or things that should be seen: the pictures arrive inside the sentence |
| [SlideOff](#slideoff) | exit | 10 f | a held line slides off sideways, accelerating and smearing more as it goes, cut on the move; two lines can shear apart | an exit into a shot that starts moving the same way |
| [EatSquares](#eatsquares) | exit, join | 18 f | a name is eaten from the left a glyph a frame while a row of solid squares grows in its place, each from a speck, until only the squares remain | a name that becomes a mark or a grid made of squares |
| [OutlineFill](#outlinefill) | enter | 90 f | a title writes itself as a thin double contour glyph by glyph at a hand pace, then fills left to right, each glyph blooming in from a blur while its contour fades | a title or a name that should feel drawn before it is set |
| [WordTicker](#wordticker) | enter, build | 40 f | each new word slides in from the right and pushes the line left, the oldest words dropping off; now and then a glowing block flashes over a word | a sentence said fast as a running ticker, keeping only its last words |
| [RandomFill](#randomfill) | enter | 10 f | a short line appears letter by letter in a shuffled order, the newest letters in a tint | a status or a label that comes up as if computed |
| [LetterRewrite](#letterrewrite) | emphasis | 24 f | a word is rewritten in place: its letters go from the end one by one, then the new word rises in letter by letter, the line re-centring | one word becoming another (a state, a version, a name) |
| [TokenBlocks](#tokenblocks) | enter | 30 f | code grows as blocks becoming words: each token appears as a tinted box its own width, then its text cuts on inside and the box clears | code or a query being written by the product |
| [GiantTruck](#gianttruck) | enter, join | 30 f | a cut to a giant line cropped by the frame, already moving: the camera trucks along it, fast and smeared at first, settling on its last word | a claim read as it passes, big, after a cut |

<!-- /library:pieces -->

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

### GiantTruck
A cut to a giant line, cropped by the frame and already moving: the camera trucks along it right to left, fast and
smeared at first, slowing until its last word sits in the frame.
```tsx
<GiantTruck text="Plan any trip" at={T.claim} />
```
- Props: `text`, `at`, `start` (0.15 of the width: the line's left edge on the cut), `v0` (0.1 of the width a frame),
  `decay` (0.86 a frame), `drift` (0.022), `size` (62 % of the height), `color`, `leaveAt`, `y`, `font`, `weight` (600).
- Numbers: cap height about 45 % of the frame; the speed falls from 10 % to about 2.5 % of the width a frame by 10 f; the
  smear 0.12 of the speed in px, up to 2 % of the width.
- Caution: three to six short words, one idea; hold on the last word.

## Type with a texture

### RollType
A line typed in place, character by character at an uneven pace, without a caret; its last digit then rolls like a
counter, one crisp whole step a frame with its neighbours faint above and below, holds the digit before last, and lands
on its value as a cut with a 2-frame settle while a low dash appears after it. A year becoming the next ("Spring
2027"), a version, a count.
```tsx
<RollType text="Spring 2027" from="3" at={T.year} size={160} />
```
- Props: `text`, `at`, `from` (the starting digits of the rolling tail), `per` (frames per typed character, 1.6),
  `rollDur` (frames of the last, slowing step, 5), `whole` (true: whole digits on every frame; false: the old last step
  that travels through fractions of a digit), `size`, `color`, `ghosts` (0.42), `caret`, `x`, `y`, `font`, `weight`,
  `seed`.
- Numbers: typing gaps of 0.45 to 1.75 of `per`, 1.8x after a space; the roll starts about 2 f after the last typed
  character; neighbours sit 1.08 em above and below.
- Caution: never blur the digits, never hold a frame with a digit half-rolled (`whole={false}` only for a roll that
  never rests); a roll of more than 6 steps reads as a slot machine.

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

### CutAway
A held line taken apart by cut: from `at` it loses whole words from its end, two a frame, the rest re-centring on every
step, or from its start, one every two frames, the rest staying where it was. The next phrase then cuts on alone.
```tsx
<CutAway text="Your files sit in six different apps" at={T.out} />
<CutAway text="Get data from anywhere" at={T.out} from="start" per={2} />
```
- Props: `text`, `at`, `per` (1), `step` (2 from the end, 1 from the start), `from` (`end`, `start`), `size`, `color`,
  `x`, `y`, `font`, `weight`.
- Numbers: a five-word line is gone in 3 frames from the end; from the start a word every 2-3 frames, nothing moves.
- Caution: a hard cut is still the default exit; use this when the taking apart is the point.

### SlideOff
A held line leaves sideways at speed: it creeps, then accelerates (each frame's step 1.3 times the last) and smears more as it
goes, and the cut comes while it moves. Two lines can shear apart, the first to the left and the second to the right.
```tsx
<SlideOff lines={['Plan less', 'ship more']} at={T.out} dur={14} dir="shear" size={150} />
```
- Props: `lines` (one or two), `at`, `dur` (14), `dir` (`left`, `right`, `shear`), `leaveAt` (default `at + dur`),
  `size`, `color`, `x`, `y`, `font`, `weight` (600).
- Numbers: 45 % of the width over 14 f; the smear 0.15 of the speed in px, up to 0.35 em on the last frames.
- Caution: an exit at speed belongs where the next shot starts moving the same way; before a still shot it stumbles.

### EatSquares
A name eaten from the left, a glyph a frame, while a row of solid squares grows in its place, each from a speck to full
size, until only the squares remain: the word becomes a mark or the start of a grid.
```tsx
<EatSquares text="Gridwork Studio" at={T.eat} size={96} color={ACCENT} />
```
- Props: `text`, `at`, `per` (1), `count` (4), `size`, `color`, `square`, `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: a square starts when the eaten front passes its place and grows 22, 50, 80, 100 % over 4 f; squares 0.62
  em, 0.45 em apart, the row centred where the word was.
- Caution: the squares must lead somewhere (a mark, a grid of results).

### ClipExit
An object slides across a held line and the letters are cut at its leading edge: the line goes behind the thing the
film shows next. Sideways, the object and the line travel toward each other (the line slides into the icon while the
icon moves over it); from below, a window rises over a heading and cuts it at its top edge.
```tsx
<ClipExit text="Your team in one view" at={T.out} w={150} h={150} node={<AppIcon size={150} ... />} />
```
- Props: `text`, `at`, `dur` (2 frames a word sideways, 6 from below), `from` (`left`, `right`, `below`), `node`, `w`,
  `h`, `meet` (0.5), `rest` (from below: where the object stops), `objectAt`, `size`, `color`, `x`, `y`, `font`,
  `weight`.
- Numbers: linear sideways, as if pushed; the object starts a quarter em clear of the line's first letter (show it from
  the start with `objectAt`); from below 6 f ease-in.
- Caution: the object must be what the film shows next; a plain shape crossing the line reads as a wipe.

## Voice lines and captions

### InkLine
The voice-over line: words join a centred line one at a time, each cut on in a tint that becomes the ink, while the
line re-centres with most of the move on the frame the word lands. The tint is a grey (the default), an accent, a path
of hues walked one a frame (`HUE_PATH`: sand, cyan, sky, blue, deep blue; any path may be passed, kept clear of
violet and green), or `'heat'`: the word printed in warm light that sweeps in from the right. The
new word lands with 40 % of its space, which opens (`space="open"`), or lands wide and closes (`"close"`).
```tsx
<InkLine text="Your plans live in one place" times={[T.a, T.b, T.c, T.d, T.e]} size={104} color={INK} />
<InkLine text="What if your week planned itself" at={T.q} gap={7} tint={HUE_PATH} />
<InkLine text="Notes that write themselves" at={T.n} tint="heat" space="close" />
```
- Props: `text`, `at`, `gap` (9) or `times`, `size` (110), `color`, `accents` (`{ index: colour }`), `tint`, `settle`
  (4), `inkOn` (`age`, `next`), `enter` (`cut`, `smear`, `blur`, `rise`), `space`, `lead` (0.55), `tau` (2.6),
  `anticipate` (0), `fit` (0: share of the width past which the line shrinks), `leaveAt`, `x`, `y`, `font`, `weight`
  (500), `tracking`. `inkLineLayout` gives the words' places for anything that frames the line.
- Numbers: 55 % of the re-centre on the arrival frame, then an exponential glide with a 2.6 f time constant (about
  10 f); grey to ink in 4 f; the hue path 9 steps, one a frame; the heat sweep 6 f, sine in-out. For a line that slides
  before the word comes, `anticipate={2} lead={0.39} tau={4.5}`; for a word that shoves in from the right, `enter="smear"`.
- Caution: one word every 6-12 frames; faster than 4 frames the tint never shows. Pass `fit` when the line could outgrow
  the frame.

### CornerLine
InkLine framed by four small corner marks that jump outward with the line as each word lands. On the first frames each
mark is a doubled dash in a flash colour that drops to one bar, then settles to a small square (or an L bracket).
```tsx
<CornerLine text="Plans that keep themselves" at={T.tag} gap={9} size={92} flash={ACCENT} />
```
- Props: `text`, `at`, `gap` (8) or `times`, `size` (84), `color`, `tint` (a deep rose settling over 18 f), `settle`,
  `mark` (`square`, `bracket`), `markColor`, `flash`, `lead` (0.65), `space` (`still`), `anticipate` (1), `leaveAt`,
  `x`, `y`, `font`, `weight`.
- Numbers: marks 0.35 em beside and 0.25 em above and below the ink; doubled dash 2 f (two 10 x 3 px bars in a row, 4 px
  apart, at 1080 p),
  one bar 2 f, then a 7 px square (at 1080 p); the gap opens one frame before the word and 65 % of the move lands on
  its frame.
- Caution: structure for one framed line at a time; never frame every line of a film.

### FaceCycle
A caption that tries on faces: each new word arrives in a pixel face in the accent, cuts to an italic serif in the
accent, then lands in the sans and the ink. `flip` turns one word back to the italic serif later, the accent of the
finished line.
```tsx
<FaceCycle text="Every draft finds its reader" at={T.cap} gap={4} size={72} accent={ACCENT} flip={{ index: 1, at: T.cap + 40 }} />
```
- Props: `text`, `at`, `gap` (4) or `times`, `size` (64), `color`, `accent`, `holds` (`[2, 4]` frames in the pixel face
  and the serif), `align` (`center`, `left`), `flip` `{ index, at }`, `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: a word every 3-4 f; 2 f pixel (the sans in a heavier weight rasterised to cells of 0.085 em), 4 f italic serif, then the sans; all
  by cut.
- Caution: a caption device for small and middle sizes; the faces change by cut, never blend, and the serif appears
  as a passing state (the line's voice stays the sans).

### TypeHead
Typed text with a coloured head: the line types at the kit's believable cadence and each new letter lands in the accent
and cools to the ink a few frames later (`by="letter"`), or the word being typed stays in the accent until it is done
(`by="word"`).
```tsx
<TypeHead text="Find the slides from Tuesday" at={T.q} size={84} accent={ACCENT} caret />
```
- Props: `text`, `at`, `cps` (25), `typed` (characters shown as already typed), `by`, `accent`, `hold`, `settle`,
  `caret`, `align`, `size`, `color`, `leaveAt`, `x`, `y`, `font`, `weight`, `seed`.
- Numbers: a letter about every 1.2 f; its first frame 40 % of the accent, then the accent for 4 f, cooled over 3 f; by
  word: cools 6 f after the word ends, over 4 f.
- Caution: never a burst; when time is short show a prefix as already typed (`typed`).

### CaretFollow
The prompt said big: the caret blinks twice at the centre, then the line types at a giant size, centred and growing from
the middle; once it is as wide as the frame the camera holds the caret instead, jumping with it in short smeared moves,
so the start of the line leaves the frame.
```tsx
<CaretFollow text="Plan a dinner for twelve on Friday" at={T.prompt} accentFrom={5} accent={ACCENT} />
```
- Props: `text`, `at`, `cps` (11), `blinks` (2), `fill` (0.95), `edge` (0.6), `follow` (0.6), `accentFrom`, `accent`,
  `size` (52 % of the height), `color`, `caretColor`, `leaveAt`, `y`, `font`, `weight` (350), `seed`.
- Numbers: blinks on 10 f, off 6 f; the caret half the frame's height (cap height 38 %); a letter every 2-4 f; centred
  until 95 % of the width, then the caret held at 60 %, the camera closing 60 % of its gap a frame (about 0.15 of the
  width over 2 f) with a smear of 6 % of its speed in px.
- Caution: one per film; keep the prompt under about 40 characters.

### LightStreak
A caption born from a horizontal streak of light: thin streak lines the width of the word, the word inside them, the
word doubled and smeared sideways, then sharp; it dies back the same way (a ghost to the left, a smeared band, the
streak, gone). Stepped like a tube settling.
```tsx
<LightStreak text="Everyone has a story" at={T.cap} leaveAt={T.capOut} size={76} />
```
- Props: `text`, `at`, `leaveAt`, `size` (64), `color`, `glow`, `x`, `y`, `font`, `weight`.
- Numbers: in 7 f (a dim streak 3 f, a bright one 1 f, the word smeared and doubled 3 f), out 8 f in reverse after a
  2 f ghost; the streak is three lines 0.025 em thick, 0.06 em apart, smeared 0.3 em and fading to both ends; the
  word's smear 0.18 em.
- Caution: on dark grounds and footage; on paper the streak reads as a smudge.

### StepWhip
A stepped, hand-made entrance: each word cuts on far to the right of its place and jumps left in halving steps on a
12 fps clock until it sits; the words keep fixed places (the line never re-centres) and the spacing breathes a little
while it holds.
```tsx
<StepWhip text="Your inbox is a little full" times={[T.a, T.a + 2, T.a + 4, T.b, T.b + 2, T.b + 4]} still={T.b + 30} />
```
- Props: `text`, `at`, `gap` (2) or `times`, `breathe`, `still`, `size` (80), `color`, `leaveAt`, `x`, `y`, `font`,
  `weight`, `seed`.
- Numbers: offsets 5.3, 2, 1, 0.5, 0.25, 0.12, 0 em, held 2 or 3 f each, a 0.08 em sideways smear on the second step
  only; the gaps move by up to 0.08 em every 2 f while holding.
- Caution: one line of short words; never on a calm brand.

### WordTicker
A sentence said as a running ticker: each new word comes in from the right and slides into place, pushing the words
before it to the left; once more than a few words are on, the oldest drop off by cut. Now and then a glowing block
flashes over a word for 2 frames, as if it were selected.
```tsx
<WordTicker text="Sorting every note by hand" times={[T.a, T.b, T.c, T.d, T.e]} keep={3} flashes={[{ at: T.d + 4, index: 3 }]} />
```
- Props: `text`, `at`, `gap` (8) or `times`, `keep` (3), `flashes` (`[{ at, index }]`), `flash` (colour), `size` (120),
  `color`, `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: a word lands in 5 f from 0.45 of the width to the right (ease-out, 70 % in the first 2 f); the line
  re-centres on the same curve; a flash is 2 f with a glow of 0.12 em.
- Caution: short words on the beat; the flash at most twice in a line.

### TokenBlocks
Code (or a structured line) grows as blocks becoming words: each token first appears as a box of its colour at 35 %, the
width of the token, then its text cuts on inside and the box clears.
```tsx
<TokenBlocks lines={[[{ text: 'const', color: KEYWORD }, { text: ' ' }, { text: 'route', color: NAME }]]} at={T.code} size={48} />
```
- Props: `lines` (rows of `{ text, color }` tokens; spaces are tokens too), `at`, `rate` (1.5 tokens a frame), `size`
  (44), `color`, `lineHeight` (1.6), `x`, `y` (the top-left), `font` (the mono), `weight`, `seed`.
- Numbers: a box holds 3-6 f before its text, then clears 2-4 f later (seeded); boxes rounded 0.08 em.
- Caution: code, a query or structured lines; in prose the boxes read as redaction.

## Words with a treatment

### OutlineFill
A title that is drawn before it is set: its glyphs write themselves one after another as a thin double contour, at an
uneven hand pace; then they fill from left to right, each glyph blooming in from a blur while its contour fades.
```tsx
<OutlineFill text="Field notes" at={T.title} size={240} color={ACCENT} ground={PAPER} />
```
- Props: `text`, `at`, `fillAt` (default 12 f after the last glyph is drawn), `gapMin` (3), `gapMax` (9), `fillEvery`
  (2), `size` (220), `color` (the fill), `line` (the contour), `ground` (must be the flat ground behind it), `leaveAt`,
  `x`, `y`, `font`, `weight` (700), `seed`. `drawTimes` gives the frame each glyph starts.
- Numbers: each glyph's contour draws in 4 f from its foot up; two lines 0.02 em thick, 0.03 em apart; the fill one
  glyph every 2 f, each 5 f from a 0.06 em blur, the contour fading over the same frames.
- Caution: one per film, a title or a name in a heavy face; a ten-letter word takes 2-3 s to draw.

### RandomFill
A short line that comes up as if computed: its letters appear in a shuffled order across its whole length, two or three
a frame, the newest ones in a tint for 2 frames.
```tsx
<RandomFill text="Syncing your calendars" at={T.status} size={70} />
```
- Props: `text`, `at`, `rate` (2.5 letters a frame), `hold` (2), `tint`, `size` (64), `color`, `leaveAt`, `x`, `y`,
  `font`, `weight`, `seed`.
- Numbers: a 20-letter status is whole in about 8 f; no letter moves.
- Caution: up to about 30 letters; longer lines read as noise before they read as words.

### LetterRewrite
One word rewritten into the next in place: its letters go from the end, one every 2 frames, then the new word's letters
rise in from just under the baseline one by one, the line re-centring on every letter.
```tsx
<LetterRewrite from="Draft" to="Final" at={T.swap} size={150} />
```
- Props: `from`, `to`, `at`, `out` (2), `per` (2.5), `keep` (letters of a common start that stay), `size` (120),
  `color`, `toColor`, `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: each new letter rises 0.12 em over 4 f (ease-out); the line re-centres by cut.
- Caution: short words where the change of word is the point; not for a sentence.

### ScrambleType
A decode: wrong glyphs change every few frames and lock into the real letters one by one, one or two of the wrong ones
in the accent, a soft glow behind while it scrambles. With `brackets` two corner brackets frame it and resize to the
word; `swaps` roll it to the next word inside them (the old word up and out, the new one up from below, both with a
vertical blur); `closeAt` shrinks the brackets' legs and dims the word.
```tsx
<ScrambleType text="Draft" at={T.step} brackets swaps={[{ at: T.s2, text: 'Review', size: 132 }]} closeAt={T.end} />
<ScrambleType text="Routing" at={T.label} step={1} per={1} lockAfter={2} order="left" glow={false} size={40} />
```
- Props: `text`, `at`, `step` (3), `lockAfter` (8), `per` (3), `order` (`random`, `left`), `grow` (build the string
  from the left, a glyph every n frames), `size` (90), `color`, `accent`, `glow`, `brackets`, `bracketColor`, `swaps`
  (up to three, `{ at, text, size }`), `closeAt`, `leaveAt`, `x`, `y`, `font`, `weight`, `seed`. `scrambleAt` gives the
  string at a frame.
- Numbers: glyphs every 3 f; the first two letters lock after 8 f, then one every 3 f; the roll 7 f, 70 % in the first
  3 f; brackets' legs 0.5 em, padding 0.42 em round the cap band; the close 6 f to 25 %.
- Caution: short words and labels (up to about 12 letters); a long line of noise reads as a fault.

### GradientPass
A colour gradient clipped to the glyphs passes along a line: letters appear at a soft leading edge in the first colour,
run through the colours, and a second, slower front turns them to the ink. With `from` the line is already there and
the fronts recolour it (a coloured title swept to white).
```tsx
<GradientPass text="Keep every idea without losing the thread" at={T.close} size={78} />
```
- Props: `text`, `at`, `speed` (1.4 letters a frame), `inkAfter` (18; -1 keeps the colours), `inkSpeed` (0.8), `stops`
  (`PASS_STOPS`: peach, pink, sky, blue), `soft` (3 letters), `slide` (0.4 em), `from`, `size` (96), `color`,
  `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: a 40-letter line is revealed in about 28 f and inked by about 70 f; the ink front eases out at the end.
- Caution: one per film, on a closing line or a title; it needs a calm ground to read.

### TagSlap
Small tilted label tags slap across a big word one after another, each opening from its centre in three frames with its
text cropped by the opening edges.
```tsx
<TagSlap tags={[{ text: 'Launch films', at: T.a, x: 0.34, y: 0.44 }, { text: 'Product demos', at: T.b, x: 0.6, y: 0.58, rot: 2 }]} />
```
- Props: `tags` (`[{ text, at, x, y, rot }]`, places as shares of the frame), `color`, `ink`, `size` (0.075 of the
  height), `arrow`, `leaveAt`, `font`, `weight`.
- Numbers: 40 %, 75 %, 100 % of the width on the first three frames, no ease; tilted -3 to 3 degrees; a tag every 15-20 f.
- Caution: two or three tags, each a real attribute of what it sits on; sentence case, never uppercase mono.

### EchoStack
One word repeated into a stack of echoes: rows above and below and copies behind it to the left and right, each nearer
copy hiding the ones behind it, so only their ends show; small labels pop around it; then the centre copy zooms by cuts
inside its own box until a fragment of one letter fills the frame (the way into the next scene).
```tsx
<EchoStack text="Growing" at={T.grow} labels={['team of four', 'first hundred users']} zoomAt={T.grow + 33} ground={DARK} />
```
- Props: `text`, `at`, `labels`, `labelsAt`, `zoomAt`, `size` (150), `color`, `ground` (must be the real ground),
  `leaveAt`, `x`, `y`, `font`, `weight` (600).
- Numbers: rows at 0.7 em; side copies show 27 %, 20 % and 10 % of the word, sliding out over 3 f; layers at 0, +4, +6
  f; labels in pairs every 3 f; the zoom 1.7x, then 2.7x 3 f later, then a 14x fragment from 5 f.
- Caution: one short word in a heavy sans on a flat ground.

## Words and pictures

### InlineChip
A rounded picture opens inside a sentence between two words, from a sliver to its width, pushing the words apart while
the line stays centred; its picture changes every few frames and it can grow later, the picture taking over.
```tsx
<InlineChip text="We map the coast from above every morning" after={3} at={T.chip} pictures={['img/a.jpg', 'img/b.jpg']} every={12} />
```
- Props: `text`, `after` (the word before the chip), `at`, `open` (4), `w` (1.4 em), `h` (0.8 em), `pictures` (files
  under `public/` or nodes), `every` (11) or `times`, `grow` `{ at, dur, w, h }`, `words` (a frame per word), `size`,
  `color`, `chip`, `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: opens in 4 f ease-out from 0.08 em; radius 22 % of its height; swaps by cut.
- Caution: the chip shows what the sentence names, never a decoration; one chip a line.

### PartStack
Two words of a held line part to open a slot and small pictures cut on into it one after another, overlapping in a
loose cluster: the people, places or things the line is about arrive inside the sentence.
```tsx
<PartStack text="Every coast matters" after={0} at={T.part} pictures={['img/a.jpg', 'img/b.jpg', 'img/c.jpg']} />
```
- Props: `text`, `after` (the word before the slot), `at`, `pictures` (files under `public/` or nodes), `every` (2.5),
  `gap` (2.6 em), `size` (90), `color`, `edge`, `leaveAt`, `x`, `y`, `font` (the serif), `weight`, `seed`.
- Numbers: the words part 2.6 em in 9 f (expo out), the left word taking 45 % of it; the first picture 2 f in, then one
  every 2-3 f; tiles 1 x 1.15 em with a light edge, reaching above and below the words; once full the slot narrows
  0.2 em over 10 f.
- Caution: four to seven real pictures of the subject; never icons or grey blanks.

### SplitWord
A big word split in two around a picture: the halves cut on either side of it, the left first, their inner letters
tucked under its edges, while the picture smears vertically and swaps to the next one (`slide`: the halves slide out
from behind it instead).
```tsx
<SplitWord text="Mapping" split={3} at={T.word} pictures={['img/a.jpg', 'img/b.jpg']} swaps={[T.word + 30]} size={210} />
```
- Props: `text`, `split` (letters in the left half), `at`, `stagger` (5), `slide`, `pictures`, `swaps`, `w` (1.3 em), `h` (1 em),
  `size` (190), `color`, `leaveAt`, `x`, `y`, `font`, `weight` (600).
- Numbers: the right half 5 f after the left, each tucked 0.12 em under the picture; the picture smears 5 f before a
  swap and 1 f after.
- Caution: one word of 6-10 letters, split where both halves read; the picture is the word's subject.

### HingeWord
A word in a slot that arrives hinged on its baseline, flipping up from lying flat while it rises a little and darkens
from grey to ink; to swap, it heats along a colour path, tips back and rises out while the next word flips up.
```tsx
<HingeWord words={['Coastlines', 'Harbours', 'Islands']} times={[T.a, T.b, T.c]} x={940} size={84} />
```
- Props: `words`, `times`, `heat` (paths used in turn: `HEAT_GOLD`, `HEAT_ROSE`), `size` (72), `color`, `grey`, `align`
  (`left`), `leaveAt`, `x`, `y`, `font`, `weight`.
- Numbers: 70 to 0 degrees over 7 f (expo out), rising 0.35 em; the heat 9 f, a step every 2 f; out over 3 f to -60
  degrees.
- Caution: one word in a slot, not a whole line.

### GatherLine
The words (or letters) of a line sit scattered across the frame and drift slowly, then gather into one set line: on a
single frame, or by a short ease-in slide.
```tsx
<GatherLine text="Every note finds its place" at={T.a} gatherAt={T.a + 26} size={84} />
```
- Props: `text`, `at`, `gatherAt`, `by` (`word`, `letter`), `mode` (`snap`, `slide`), `dur` (4), `spread` (`[0.5,
  0.32]`), `drift` (4 px a frame at 1080 p), `colors` (scattered pieces shuffle colours every 3 f), `size`, `color`,
  `leaveAt`, `x`, `y`, `font`, `weight`, `seed`.
- Numbers: drift 3-5 px a frame for 15-25 f; the snap is one frame; the slide 4 f ease-in.
- Caution: the scattered pieces are already the line's size and face, or the snap reads as a jump.

## In the reel

Every piece's frames in the reel (`--film library-type`), and the one command that shows just that piece: its frames in
one still (run it in a film project; `render --film library-type --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| WeightLine | `library-type` | 0-89 | `node scripts/frames.mjs library --strip WeightLine` |
| BarStack | `library-type` | 90-169 | `node scripts/frames.mjs library --strip BarStack` |
| ScaleJump | `library-type` | 170-249 | `node scripts/frames.mjs library --strip ScaleJump` |
| BlockOut | `library-type` | 250-295 | `node scripts/frames.mjs library --strip BlockOut` |
| RiseLine | `library-type` | 296-387 | `node scripts/frames.mjs library --strip RiseLine` |
| MarkPhrase | `library-type` | 388-471 | `node scripts/frames.mjs library --strip MarkPhrase` |
| BlurSweep | `library-type` | 472-541 | `node scripts/frames.mjs library --strip BlurSweep` |
| RollType | `library-type` | 542-603 | `node scripts/frames.mjs library --strip RollType` |
| TrackedType | `library-type` | 604-673 | `node scripts/frames.mjs library --strip TrackedType` |
| LightWord | `library-type` | 674-753 | `node scripts/frames.mjs library --strip LightWord` |
| TileWord | `library-type` | 754-823 | `node scripts/frames.mjs library --strip TileWord` |
| DotWord | `library-type` | 824-893 | `node scripts/frames.mjs library --strip DotWord` |
| DotDive | `library-type` | 894-938 | `node scripts/frames.mjs library --strip DotDive` |
| HostType | `library-type` | 939-1038 | `node scripts/frames.mjs library --strip HostType` |
| DropWord | `library-type` | 1039-1134 | `node scripts/frames.mjs library --strip DropWord` |
| ArcToss | `library-type` | 1135-1204 | `node scripts/frames.mjs library --strip ArcToss` |
| PushApart | `library-type` | 1205-1280 | `node scripts/frames.mjs library --strip PushApart` |
| InkLine | `library-type` | 1281-1520 | `node scripts/frames.mjs library --strip InkLine` |
| ScrambleType | `library-type` | 1521-1604 | `node scripts/frames.mjs library --strip ScrambleType` |
| FaceCycle | `library-type` | 1605-1668 | `node scripts/frames.mjs library --strip FaceCycle` |
| CornerLine | `library-type` | 1669-1738 | `node scripts/frames.mjs library --strip CornerLine` |
| CutAway | `library-type` | 1739-1778 | `node scripts/frames.mjs library --strip CutAway` |
| GradientPass | `library-type` | 1779-1862 | `node scripts/frames.mjs library --strip GradientPass` |
| TypeHead | `library-type` | 1863-1918 | `node scripts/frames.mjs library --strip TypeHead` |
| CaretFollow | `library-type` | 1919-2008 | `node scripts/frames.mjs library --strip CaretFollow` |
| InlineChip | `library-type` | 2009-2092 | `node scripts/frames.mjs library --strip InlineChip` |
| EchoStack | `library-type` | 2093-2135 | `node scripts/frames.mjs library --strip EchoStack` |
| TagSlap | `library-type` | 2136-2199 | `node scripts/frames.mjs library --strip TagSlap` |
| GatherLine | `library-type` | 2200-2255 | `node scripts/frames.mjs library --strip GatherLine` |
| LightStreak | `library-type` | 2256-2315 | `node scripts/frames.mjs library --strip LightStreak` |
| ClipExit | `library-type` | 2316-2365 | `node scripts/frames.mjs library --strip ClipExit` |
| SplitWord | `library-type` | 2366-2425 | `node scripts/frames.mjs library --strip SplitWord` |
| HingeWord | `library-type` | 2426-2501 | `node scripts/frames.mjs library --strip HingeWord` |
| StepWhip | `library-type` | 2502-2561 | `node scripts/frames.mjs library --strip StepWhip` |
| PartStack | `library-type` | 2562-2611 | `node scripts/frames.mjs library --strip PartStack` |
| SlideOff | `library-type` | 2612-2643 | `node scripts/frames.mjs library --strip SlideOff` |
| EatSquares | `library-type` | 2644-2687 | `node scripts/frames.mjs library --strip EatSquares` |
| OutlineFill | `library-type` | 2688-2787 | `node scripts/frames.mjs library --strip OutlineFill` |
| WordTicker | `library-type` | 2788-2847 | `node scripts/frames.mjs library --strip WordTicker` |
| RandomFill | `library-type` | 2848-2883 | `node scripts/frames.mjs library --strip RandomFill` |
| LetterRewrite | `library-type` | 2884-2933 | `node scripts/frames.mjs library --strip LetterRewrite` |
| TokenBlocks | `library-type` | 2934-2983 | `node scripts/frames.mjs library --strip TokenBlocks` |
| GiantTruck | `library-type` | 2984-3033 | `node scripts/frames.mjs library --strip GiantTruck` |

<!-- /library:reel -->
