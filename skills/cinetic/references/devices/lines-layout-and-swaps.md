# Lines, layout and swaps

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

How a held line grows, makes room, re-centres and swaps a word, and how copy is placed around objects. The rule under all of them: nothing slides under a word being read; room appears decisively.

[Line opens a gap for an inline object](#line-opens-a-gap-for-an-inline-object) · [Echo copies slide out from behind the word](#echo-copies-slide-out-from-behind-the-word) · [Braces jump apart and the words swap inside](#braces-jump-apart-and-the-words-swap-inside) · [Words swap on an accelerating cadence](#words-swap-on-an-accelerating-cadence) · [Neighbouring words show as dim ghosts around the slot](#neighbouring-words-show-as-dim-ghosts-around-the-slot) · [Words hop between grid cells](#words-hop-between-grid-cells) · [Type cut into strips that slide apart](#type-cut-into-strips-that-slide-apart) · [Line re-centres with most of the move on frame one](#line-re-centres-with-most-of-the-move-on-frame-one) · [Only the last word swaps](#only-the-last-word-swaps) · [The tagline is set as a string inside the product UI](#the-tagline-is-set-as-a-string-inside-the-product-ui) · [Make room: creep, one big frame, settle](#make-room-creep-one-big-frame-settle) · [The gap opens before the word arrives](#the-gap-opens-before-the-word-arrives) · [Line moves through: arrive, drift, leave as one move](#line-moves-through-arrive-drift-leave-as-one-move) · [Line re-centres on a long exponential](#line-re-centres-on-a-long-exponential) · [Left-aligned stack builds downward beside the product](#left-aligned-stack-builds-downward-beside-the-product) · [One word set apart in the line](#one-word-set-apart-in-the-line) · [Small plain caption directly on the picture](#small-plain-caption-directly-on-the-picture) · [One huge word fills the panel and pushes in](#one-huge-word-fills-the-panel-and-pushes-in) · [Word cuts on touching, then the space opens](#word-cuts-on-touching-then-the-space-opens) · [Headline set so large the frame crops it](#headline-set-so-large-the-frame-crops-it) · [Two words part around the subject, then converge](#two-words-part-around-the-subject-then-converge) · [Words land from four directions](#words-land-from-four-directions) · [Old line pushes up and dims in one frame](#old-line-pushes-up-and-dims-in-one-frame) · [Old line shrinks out, new line swaps in large](#old-line-shrinks-out-new-line-swaps-in-large) · [Sentence placed around an object](#sentence-placed-around-an-object) · [Hero word shrinks in hard scale steps](#hero-word-shrinks-in-hard-scale-steps) · [Sentence lands with a ribbon tail](#sentence-lands-with-a-ribbon-tail) · [Re-centre jumps on its own cadence](#re-centre-jumps-on-its-own-cadence) · [Twin discs grow and hold words](#twin-discs-grow-and-hold-words) · [Tiny labels in the empty corners](#tiny-labels-in-the-empty-corners) · [Two type voices with fixed jobs](#two-type-voices-with-fixed-jobs)

### Line opens a gap for an inline object

`dv-inline-gap-object` · signature · energy medium · launch, feature · primitive: InlineGap

A sentence splits between two words, the halves part and an object grows in the gap: an image chip that hard-cuts through several clips, a thumbnail that swaps content while the line reflows, or a pill that grows and types a sub-line. **When:** Showing what a word means ("[images]", "your [product]"); the product inside the copy. **Avoid:** Gaps that break the read (split at a natural pause).

- **Anatomy:** Halves part 44-410 px (expo, slow 4 f start); the object grows from a 1 px bar; content swaps inside on hard cuts; the line reflows and the block zooms up to x1.76.
- **Timing:** Part 16-76 f; object grows 7-18 f; swaps every 6-20 f; reflow 10 f; squeeze 8 f.
- **Sound:** On the big hit; a toggle click on the pill.
- **Build:** `<InlineGap leftText rightText at gap h swaps={[...]} items={[...]}>` (fx/InlineGap): the halves part on E.glideOut (16 f; up to 76 for a wide gap), the chip grows from a 3 px bar once the gap is a third open (7 f) and its content hard-cuts on `swaps`; `close={{ at }}` shuts the gap (5 f, E.buildIn); `anchor="left"` moves only the right half; `halves` lets each half arrive on its own. inlineGapFrames() for the cues.
- **Materials and numbers:** The object can be a photo-real character: a tiny dot in the word gap grows 6 -> 30 px in 6 f, then into a round white portrait (soft drop shadow) while the halves fly apart past the frame edges, blurring up to 25 px as the camera pushes; the portrait then rises into the next UI's header.

### Echo copies slide out from behind the word

`dv-echo-copies-knockout` · signature · energy high · launch, sting · primitive: EchoCopies

Copies of a word, each on its own solid knock-out box so the nearer copies hide the farther ones, slide out from behind the word in rings, then contract back. **When:** A key word that should feel multiplied or scaled ("Scaling"). **Avoid:** Long words; more than once.

- **Anatomy:** Rings at +1, +3, +4 f, each expo-out (t50 0.04 s, t90 0.20 s); contraction 20 f.
- **Timing:** 72 f in all.
- **Sound:** The full bed enters on the drop.
- **Build:** `<EchoCopies at offset={{ x, y }} x y ground back={{ at }}>{word}</EchoCopies>` (fx/Echoes): rings at +1, +3, +4 f (25 fps) slide out on E.snapOut over 27 f (half way in 0.05 s, 90 % in 0.2 s), each on a box of the ground's colour so nearer rings hide farther ones; contract back in 20 f.

### Braces jump apart and the words swap inside

`dv-brace-jump-insert` · signature · energy high · launch, feature, sting · primitive: Brackets

To insert or swap a word between braces, the closing brace jumps outward one frame before the new word cuts on (59-73 % of its travel in that frame); for a swap, the braces accelerate apart during the last 0.4 s of the hold and the words change exactly at peak velocity. **When:** Swapping the key word of a held statement; code-like or product-like copy. **Avoid:** Serif or decorative braces outside a supplied brand.

- **Anatomy:** Braces are separate glyphs with their own motion; jump frame, expo settle (k 7-12); a 14 f drift; swap at the fastest frame.
- **Timing:** Settle 10-12 f; swap run 60 f (in-out with the peak at the swap).
- **Sound:** The audio onset with the word (-2 ms); the biggest hit (kick + sub-drop) on a swap.
- **Build:** `<Brackets phrases={[{ at, text }...]} x y font braceColor mode="insert"|"peak">` (fx/Brackets): insert: the closing brace jumps 66 % of its travel one frame before the word, then settles (10 f); peak: the braces run apart on an in-out (60 f) and the words swap on its fastest frame (a velocity seam).

### Words swap on an accelerating cadence

`dv-accelerating-swap-run` · signature · energy high · launch, feature, sting · primitive: HardStep

Placeholder queries in a field, or full-frame word cards over changing backdrops, swap faster and faster (14, 10, 6 f) until the last one holds: a rush built from copy. **When:** Showing breadth: categories, example prompts, use cases. **Avoid:** More than one per film; text the viewer must read.

- **Anatomy:** Hard swaps, gaps shrinking; cards 20-30 f each on kicks; the last one lands and holds.
- **Timing:** Gaps 14 f x5, 10 f x3, 6 f x6 at 60 fps (144 f); card run mean 26 f at 60 fps.
- **Sound:** Cuts on kicks; UI pops on the fastest swaps.
- **Build:** HardStep with ACCEL.montage gaps; cards as full-frame swaps.

### Neighbouring words show as dim ghosts around the slot

`dv-ghost-reel` · signature · energy medium · launch, feature · primitive: GhostReel

While a word sits in a slot, blurred dim copies of the previous and next words remain visible just outside the mask, like a slot-machine reel; a new line can cut in at 79 % defocused and grow while ghost copies spread above and below. **When:** Word swaps that should feel like a reel or a list; a line that is one of many. **Avoid:** Ghosts strong enough to be read (keep them under 25 %).

- **Anatomy:** Main word sharp in the slot; ghosts blurred, 10-25 % strength, moving with the roll; spreading ghosts on an ease-out.
- **Timing:** Grow 56 f; ghosts 52 f ease-out; exit 40 f ease-in.
- **Sound:** A kick on the swap.
- **Build:** `<GhostReel n pitch swaps x y width slotH render>` (fx/Reels): the slot sharp, the neighbours outside it through one fixed blur (6 px) at 20 %; each roll exits on E.buildIn (26 f) and settles on E.snapOut (16 f).

### Words hop between grid cells

`dv-grid-hop-words` · signature · energy high · launch, sting · primitive: GridHop

Words on small label boxes move one or two grid cells at a time, alternating axes like Manhattan routes, then all jump into the final sentence in one frame. **When:** A sentence assembled from parts; layout tools, grids, editing products. **Avoid:** Long sentences.

- **Anatomy:** Hops of 120 px on 16 fps steps (progress 0, 0.19, 0.36, 0.78, 0.95, 1); the final jump is one frame.
- **Timing:** Each hop 8-10 f; run 75 f; final jump 1 f.
- **Sound:** Plastic clicks on the hops; a big click on the final jump.
- **Build:** `<GridHop words={[{ path: manhattan(from, to), at }]} origin texts font box final={{ at, positions: sentencePositions(texts, x, y, font) }}>` (fx/Echoes): one cell per hop on the stepped progress 0, .19, .36, .78, .95, 1 (9 f), axes alternating, then every word jumps into the sentence on one frame.

### Type cut into strips that slide apart

`dv-strip-slice-type` · signature · energy high · launch, sting · primitive: Slices

A number and a word are cut into horizontal strips (8-10 per glyph) that slide sideways at different offsets until they span the full width. **When:** A big number becoming a field; a transition out of a stat. **Avoid:** Text that must stay readable.

- **Anatomy:** Strips with seeded offsets, expanding sideways; full width by 3 frames in.
- **Timing:** 43 f.
- **Sound:** None needed.
- **Build:** `<Slices kind="strips" at x y w h n={9}>{type}</Slices>` (fx/Slices): each strip a clipped copy sliding sideways by a seeded share of the frame width on E.jump (spread by 3 f at 24 fps; 43 f); `back={{ at }}` gathers them.

### Line re-centres with most of the move on frame one

`dv-recentre-jump` · workhorse · energy medium · any · primitive: Chain

When a word is appended to a centred line, the whole line jumps 44-88 % of the way to its new centre on the very frame the word appears and eases the rest; nothing slides under a word being read. A small icon can anchor the line and ride along. **When:** Every centred build line; captions appended word by word to the voice. **Avoid:** A slow glide under a word being read; jumping before the word exists.

- **Anatomy:** First-frame share 55-84 % (house 66 % in the first 30 fps frame), the rest over 3-8 frames; the first frames may carry a short horizontal smear; variant: the pair re-centres in exactly one frame; variant: a stacked block of lines re-centres 6 f after each addition.
- **Timing:** 10-24 f in all; first-frame speed 21-77 px/f.
- **Sound:** Word onsets.
- **Build:** `<Chain recentre="jump">` (22 f on E.jump).

### Only the last word swaps

`dv-slot-word-swap` · workhorse · energy medium · any · primitive: LineSnap

A held line keeps its start and swaps only its last word, several times ("for writers / editors / teams"): the outgoing word heats in colour while the line creeps, the swap lands with two big frames and a settle; small camera nudges alternate direction with each swap. **When:** Listing audiences, use cases or outcomes in one held sentence. **Avoid:** More than three or four swaps.

- **Anatomy:** Creep 1, 2, 6 px/f; swap; two big frames; settle; variant: the last word rolls vertically while gap tiles turn into icons.
- **Timing:** Swap 20-30 f; nudges 26-32 f in-out; roll 8 f.
- **Sound:** Voice.
- **Build:** `<LineSnap mode="room">` for the creep-jump plus a slot that HardSteps the word; colour heat via HueSweep back.

### The tagline is set as a string inside the product UI

`dv-copy-inside-ui` · workhorse · energy calm · launch, feature, update · primitive: recipe (plain layers)

The line of copy is not laid over the UI: it is a real string inside it (the subtitle of the top result, a field's text, a notification) at UI size, typed by the same typing primitive as the rest of the film and marked only by being the one line in a second voice. **When:** Update films and UI-led launches, where overlaid copy would fight the UI. **Avoid:** Lines longer than the field; UI sizes that become illegible in vertical.

- **Anatomy:** One metadata string replaced by the copy; marked by a second type voice or the accent; it continues by typing later in the shot.
- **Timing:** Present from the row's arrival; highlighted about 52 f; the continuation typed in about 30 f.
- **Sound:** Key ticks, if any.
- **Build:** Recipe: put the copy into the UI mock's data and animate it with TypeOn or Chain.

### Make room: creep, one big frame, settle

`dv-make-room-creep-jump` · workhorse · energy medium · any · primitive: LineSnap

Before something arrives, the held element creeps with rising speed, then covers most of the distance on a single frame (60-75 %), then settles on a decaying tail; it can relocate a title to a corner header with a 1 -> 0.7 scale on the jump frame, or open the letter spacing. **When:** Making room for the next word; turning a title into a list header; any repositioning that should feel decisive. **Avoid:** A long linear slide.

- **Anatomy:** Creep 7 f (1-24 px/f), one frame of 192 px (67 %), 6 f tail; relocate variant: ease-in -5, -10, -18 px/f, one 70 % frame with scale 1 -> 0.7, 6 f settle; tracking variant: letters open +15-39 % with the same shape.
- **Timing:** 17-48 f at 60 fps in all; the jump is one frame.
- **Sound:** A glockenspiel note or a kick on the jump frame.
- **Build:** `<LineSnap mode="room">` / makeRoomState() (creep 0.28 s, jump 67.5 %, tail 0.24 s).

### The gap opens before the word arrives

`dv-make-room-early` · workhorse · energy calm · any · primitive: Chain

The line starts sliding 3-6 frames before the next word (or avatar, or version token) appears, so the gap is already open when it lands; the newcomer can pop in at the slide's peak speed or shove the previous word aside. **When:** Builds where the new element is visual (an avatar, a token, an icon). **Avoid:** Opening the gap so early that it reads as a mistake (over 8 f).

- **Anatomy:** Lead 3-6 f; the token appears at peak slide speed; a shove of 70 px in 2 blurred frames plus a 3 f settle; an icon pushed back in two pushes.
- **Timing:** Lead 6-12 f at 60 fps; slides 30-80 f quint-out.
- **Sound:** The token on a kick (+39 ms); a note or click on the avatar pop.
- **Build:** `<Chain recentre="slot" recentreLead={10}>`.

### Line moves through: arrive, drift, leave as one move

`dv-through-move-line` · workhorse · energy medium · any · primitive: Words

A line enters already moving (77 px/f) and decelerating, drifts at a constant slow speed while it is read, and leaves on an expo-in: one continuous move, never parked; a card can shrink fast-slow-fast and cut at the fastest point; a label can recede steadily like it is moving away; the frame can contract a few px a side during a silent hold. **When:** Openers, statements between scenes, loops (elements already moving on the first frame). **Avoid:** Parking the line between its entrance and exit.

- **Anatomy:** Expo-out arrival, linear drift (0.3 %/f or a few px/f), expo-in exit; a receding label shrinks to 0.59x over 2 s.
- **Timing:** Arrival 20-30 f, drift for the read, exit 14-20 f.
- **Sound:** A sub-bass hit on the arrival; silence under the contraction.
- **Build:** Words (rise from the side) + a drift transform + exit 'launch'.

### Line re-centres on a long exponential

`dv-recentre-glide` · workhorse · energy calm · any · primitive: Chain

The line keeps re-centring on a long soft exponential while words arrive (each sliding in a little from the right, or rising into place), so the whole line drifts to its centre as one tween. **When:** Calm, speech-paced lines; a second half appended after a pause. **Avoid:** Fast builds (the glide lags behind the words).

- **Anatomy:** Left edge decaying about 0.75 a frame; the line itself sliding in 150-275 px from the right while words rise every 7 f; an appended half arrives grey and darkens in 3 f.
- **Timing:** Re-centre 30-60 f (t50 0.17 s, t90 0.47 s); words 14-18 f each, 6-14 f apart.
- **Sound:** Chat pop or voice phrase onsets.
- **Build:** `<Chain recentre="glide">` (E.expo, recentreDur 46).

### Left-aligned stack builds downward beside the product

`dv-left-stack-build` · workhorse · energy calm · launch, feature · primitive: Words

Beside a tilted phone, a top-anchored left-aligned stack builds line by line every 5-7 f, each line rising about 50 px from a third strength. **When:** Feature lists next to a device. **Avoid:** Centred stacks next to off-centre products.

- **Anatomy:** Left margin about 158 px; lines added below; the last line in the accent.
- **Timing:** Lines 10-14 f apart; each 30 f.
- **Sound:** Voice.
- **Build:** `<Words>` per line with starts 12 f apart, left-aligned.

### One word set apart in the line

`dv-one-word-emphasis` · workhorse · energy calm · any · primitive: Words

One word of a line is set heavier, or in the accent, from the moment it appears; ranked rows can carry medal tones on their numerals. **When:** The key word of a closing line; the top three of a ranking. **Avoid:** More than one emphasised word per line.

- **Anatomy:** Weight step (regular to semibold or bold), or the accent colour; medal tones only on rank numerals.
- **Timing:** Static.
- **Sound:** None.
- **Build:** Words with a span override (accentOn index, or a weight).

### Small plain caption directly on the picture

`dv-plain-caption-on-picture` · workhorse · energy calm · any · primitive: Words

A short white sans caption (cap 2.3-2.8 % of the frame) sits centred on live footage or a photo's mid-tone, no box, no shadow, no scrim; the picture's shallow depth of field keeps it legible. **When:** Voice-locked subtitles; taglines over a photo. **Avoid:** Busy, sharp backgrounds behind the caption.

- **Anatomy:** Centred, thin to regular weight, slight negative tracking.
- **Timing:** Present from the cut; held per tagline.
- **Sound:** The voice; the caption already on screen at the first syllable.
- **Build:** `<Words>` with no entrance (cut-on) at caption size over `<Footage>`/`<Photo>`.

### One huge word fills the panel and pushes in

`dv-hero-word-push` · accent · energy medium · launch, feature · primitive: Words

One key verb alone fills the panel (15-19 % of its height) and pushes in +24 % on an expo-out. **When:** The verb of the claim, after a zoom-through. **Avoid:** Two words.

- **Anatomy:** Single word, push on expo-out.
- **Timing:** 28 f.
- **Sound:** On the swap after the zoom.
- **Build:** Words + camera push (E.snapOut, +24 %).

### Word cuts on touching, then the space opens

`dv-space-opens-after` · accent · energy medium · launch, feature · primitive: Chain

Each appended word cuts on with no word space (the line reads run-together for a frame or two), then the spaces open and the line re-centres: the word visibly docks. **When:** Taglines built word by word; a brand line. **Avoid:** Long words that become unreadable when run together.

- **Anatomy:** Spaces open over 3-4 f; re-centre 65-68 % in the first frame, x0.7 a frame after.
- **Timing:** Spaces 7-8 f; re-centre about 24 f.
- **Sound:** One soft tick per word (±45 ms).
- **Build:** `<Chain recentre="jump">` with a word-space tween from 0 to the font space over 8 f (letter-spacing on the gap span). Recipe: each word's margin-left = space x k with k 0 -> 1 over 12 f (cubic out); negative start values give the overlap version.
- **Materials and numbers:** Tight append: the new word lands touching the previous one (zero word space, or even overlapping it when it flies in large, glyphs compositing darker where they cross); over the next 8-16 f only the newcomer slides right and the normal space opens on an ease-out while earlier words stay put (left-aligned lines), or the line re-centres once the colour has cooled from the accent to ink.

### Headline set so large the frame crops it

`dv-bleed-headline` · accent · energy calm · launch, feature · primitive: Words

A light headline (ascenders 20 % of the frame height) runs off the right edge, its last letter half cut, while its words fade in and the frame drifts. **When:** Openers on a misty plate; editorial covers. **Avoid:** Cropping a letter that changes the word.

- **Anatomy:** Static crop; words ink in place; drift under it.
- **Timing:** Held 68 f.
- **Sound:** A breath swell; key-click ticks on word onsets.
- **Build:** Words at a size wider than the frame, ink-in-place entrance.

### Two words part around the subject, then converge

`dv-words-part-converge` · accent · energy medium · launch, feature, sting · primitive: Words

Two caption words either side of the subject slide apart with an expo-out (the maximum split on the strongest kick), hold, then converge on an expo-in. **When:** Framing a person or product with two words. **Avoid:** Subjects that move a lot.

- **Anatomy:** Split 180 px; 77 px/f first frame; hold; converge.
- **Timing:** Part 28 f, hold 18 f, converge 24 f at 60 fps.
- **Sound:** Kick + sub-drop on the maximum split.
- **Build:** Two Words with mirrored x on E.snapOut, exit 'launch' toward each other.

### Words land from four directions

`dv-kinetic-stack-directions` · accent · energy high · launch, sting · primitive: Words

On grid paper, lines and words land with an expo-out from left, right, top and bottom in turn, with a small arrow: a kinetic poster. **When:** Poster-style title cards. **Avoid:** Calm films.

- **Anatomy:** Entries 2-4 f apart, each from a different side, 15 f each.
- **Timing:** 33 f in all.
- **Sound:** None needed.
- **Build:** Words with a per-word rise direction, stagger 6 f.

### Old line pushes up and dims in one frame

`dv-old-line-push-dim` · accent · energy medium · any · primitive: HardStep

When the second line arrives, the first moves up on a fast S-curve and drops to about a third of its strength in a single frame. **When:** Two-line statements where the second line is the point. **Avoid:** Keeping both lines at full strength.

- **Anatomy:** Move 111 px; opacity step 1 -> 0.36 on one frame.
- **Timing:** Move 28 f (peak 39 px/f); dim 1 f.
- **Sound:** A kick.
- **Build:** Words move on E.strongInOut + HardStep opacity.

### Old line shrinks out, new line swaps in large

`dv-scale-out-swap-in` · accent · energy medium · any · primitive: Oversize

The old line shrinks a little on an ease-in, then on one frame the new line replaces it at 104-108 % and eases down to size: a swap with a breath. **When:** Status lines, a title swapping to a tagline. **Avoid:** Big scale ranges (keep it under 10 %).

- **Anatomy:** Shrink to 95.6 %, hard swap, 108 % -> 100 % ease-out.
- **Timing:** Out 14-20 f, in 20 f, swap 0 f.
- **Sound:** A whoosh pair, or on the beat.
- **Build:** Words exit 'launchFade' on scale + Oversize from 1.08 on the swap frame.

### Sentence placed around an object

`dv-words-around-object` · accent · energy calm · launch, feature · primitive: Words

A sentence is distributed around a picture or card instead of sitting on one line: the first half top-left and the second bottom-right of a growing image cluster, words as tiles in the gaps of a masonry wall, one word above and one below the newest card riding its perspective, or one word cut on while a pull-back brings the other in from the frame edge. **When:** When copy and imagery share a frame and the layout should feel designed. **Avoid:** Read order that becomes ambiguous.

- **Anatomy:** Words placed on the object's corners or in its gaps; they share its plane and drift; the next card can occlude them.
- **Timing:** Words 10 f apart; cut on with the card; pull-back -4.3 % in 2 f.
- **Sound:** A fast air whoosh; a soft UI tap then silence.
- **Build:** Words placed in the object's coordinate space (inside its transform); pull-back via camera.

### Hero word shrinks in hard scale steps

`dv-hard-scale-steps` · accent · energy high · launch, sting · primitive: HardStep

A hero word shrinks from 3.3x to rest in a few hard scale cuts with 0-2 frame holds and no tween (3.32 -> 1.71 -> 1.045 -> 1.0). **When:** A word arriving on key-click transients. **Avoid:** Smooth films.

- **Anatomy:** Steps on single frames, each about half the remaining scale.
- **Timing:** 10 f at 60 fps.
- **Sound:** Key-click transients on the steps.
- **Build:** HardStep on scale.

### Sentence lands with a ribbon tail

`dv-ribbon-tail-sentence` · accent · energy medium · launch, feature · primitive: Words

After a whip cut the sentence is still travelling and each later word sits progressively lower and later, so the line lands like a ribbon settling from its head. **When:** The first line after a whip. **Avoid:** Long sentences.

- **Anatomy:** Per-word delay and a vertical offset growing with the index; the head word lands first.
- **Timing:** 45 f expo-out; the second word half-way at 5 f.
- **Sound:** The cut on a hit (+48 ms).
- **Build:** Words with stagger 2-3 f and rise growing per index (rises[]), carried from the whip speed.

### Re-centre jumps on its own cadence

`dv-recentre-stepped` · accent · energy medium · launch, sting · primitive: Chain+Stepped

A growing lockup or caption re-centres in one-frame jumps (about half a letter width) on a different cadence from the letters landing (jumps every 8 f, letters every 6 f), creeping between jumps; the re-centre can lead the word's resolve by 6 f. **When:** Logo lockups built letter by letter; stepped, graphic films. **Avoid:** Smooth films.

- **Anatomy:** Jumps of 11-83 px; creep 2-3 px/f between; on twos for a stepped look.
- **Timing:** Jumps every 8 f; letters every 6 f; two 2-frame moves of 20 px.
- **Sound:** None of its own.
- **Build:** `<Chain recentre="jump" recentreDur={1}>` inside `<Stepped fps={7.5}>` for the line, letters on their own grid via hotGlyphState.

### Twin discs grow and hold words

`dv-twin-disc-words` · accent · energy calm · launch, feature · primitive: Cards

Two touching discs scale up on an expo-out and thin words appear inside them one at a time. **When:** A two-part idea (before / after, you / us). **Avoid:** Long words that crowd the discs.

- **Anatomy:** Discs about 180 px, touching; words at f+4, +7, +13.
- **Timing:** Discs 16 f expo-out; words 6-12 f apart.
- **Sound:** None.
- **Build:** Cards springBox or enterState on two circles; Words inside.

### Tiny labels in the empty corners

`dv-corner-micro-labels` · accent · energy calm · launch, feature · primitive: Words

Three or four very small all-caps labels (10-12 px) and a contact line sit in the empty corners around a headline, arriving 1-2 frames apart and leaving with it. **When:** Poster-like frames; an editorial end card. **Avoid:** Labels that need reading (they are texture).

- **Anatomy:** Corner placement, all caps, tracked out.
- **Timing:** 3-5 f apart in; out with the line.
- **Sound:** None.
- **Build:** Words at the ui role, pop entrance, staggered 4 f.
- **Materials and numbers:** A tiny label decodes through random letters of the same width (2 + 2 + resolve, 10 f) as its tick dot appears under it.

### Two type voices with fixed jobs

`dv-two-type-voices` · accent · energy calm · any · primitive: Words

A film gives two faces two jobs: statements in a high-contrast display face, UI in a small grotesk; a wide bold title face for one act and a light weight for the next; big caps with a tiny connector word between them. **When:** Editorial launches; films with an act structure. **Avoid:** More than two voices; a second face that fights the brand.

- **Anatomy:** Size contrast 3-5x between the voices; the display face never appears inside UI.
- **Timing:** Static choice; the connector word can type while the caps fade.
- **Sound:** None.
- **Build:** Two font roles in brand/tokens; Words for statements, kit Text for UI.
- **Ban-safe default:** Two weights and widths of the brand family (heavy display, light UI). (the full look relies on serif, italic; use it only when the brand supplies it)
