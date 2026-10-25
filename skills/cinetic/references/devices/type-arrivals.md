# Type arrivals

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

How a word, a line or a letter comes onto the screen. Pick the arrival by the job of the copy: a calm statement fades and rises, a hit pops or lands oversized, a product string decodes, typed text types like a person or a machine.

[Letters swing in along an arc](#letters-swing-in-along-an-arc) · [Title decodes from the centre outward](#title-decodes-from-the-centre-outward) · [Each word arrives on its own torn layer](#each-word-arrives-on-its-own-torn-layer) · [Typeface cycles while the line steps larger](#typeface-cycles-while-the-line-steps-larger) · [Giant word rises in, cropped by the frame](#giant-word-rises-in-cropped-by-the-frame) · [Masked roll swap with a pre-zoom](#masked-roll-swap-with-a-pre-zoom) · [Anagrams reshuffle and lock](#anagrams-reshuffle-and-lock) · [Caption resolves out of a light streak](#caption-resolves-out-of-a-light-streak) · [Old word erodes while new letters rise](#old-word-erodes-while-new-letters-rise) · [Scattered letters assemble into the word](#scattered-letters-assemble-into-the-word) · [Words fly in from behind the camera](#words-fly-in-from-behind-the-camera) · [Words jump through positions, leaving fading stamps](#words-jump-through-positions-leaving-fading-stamps) · [Word shown first as a block of its own size](#word-shown-first-as-a-block-of-its-own-size) · [Whole line snaps larger on the payoff word](#whole-line-snaps-larger-on-the-payoff-word) · [Centred line builds word by word](#centred-line-builds-word-by-word) · [Oversized landing, defocused start](#oversized-landing-defocused-start) · [Typing with an accent trail on the newest characters](#typing-with-an-accent-trail-on-the-newest-characters) · [Word lands soft and pulls into focus](#word-lands-soft-and-pulls-into-focus) · [Answer streams and its card grows line by line](#answer-streams-and-its-card-grows-line-by-line) · [Fade-and-rise word, front-loaded](#fade-and-rise-word-front-loaded) · [In-place ink-up from partial strength](#in-place-ink-up-from-partial-strength) · [Line whose stagger and fade shrink word by word](#line-whose-stagger-and-fade-shrink-word-by-word) · [Prompt typing that slows on its last word](#prompt-typing-that-slows-on-its-last-word) · [Typing by a person, with word-end pauses](#typing-by-a-person-with-word-end-pauses) · [Typing that starts mostly done after a cut](#typing-that-starts-mostly-done-after-a-cut) · [Line written on behind a soft moving edge](#line-written-on-behind-a-soft-moving-edge) · [Cut on low at full ink, slide home](#cut-on-low-at-full-ink-slide-home) · [Word rises out of a baseline mask](#word-rises-out-of-a-baseline-mask) · [Colour front sweeps a set line to ink](#colour-front-sweeps-a-set-line-to-ink) · [Word inks along a colour path](#word-inks-along-a-colour-path) · [A highlight walks the line, parks on the keyword, new words type hot](#a-highlight-walks-the-line-parks-on-the-keyword-new-words-type-hot) · [Typing that accelerates into a whip](#typing-that-accelerates-into-a-whip) · [Typing whose newest characters arrive smeared](#typing-whose-newest-characters-arrive-smeared) · [A label rises in gradient ink, then a blink wave turns it white](#a-label-rises-in-gradient-ink-then-a-blink-wave-turns-it-white) · [Glyph scramble that locks into the word](#glyph-scramble-that-locks-into-the-word) · [Handwritten line writes on at pen speed](#handwritten-line-writes-on-at-pen-speed) · [Letters appear in random order](#letters-appear-in-random-order) · [Sans line with a contrasting-voice payoff word](#sans-line-with-a-contrasting-voice-payoff-word) · [Typewriter on an ease-out progress](#typewriter-on-an-ease-out-progress) · [Word decodes from a low-res pixel version](#word-decodes-from-a-low-res-pixel-version) · [Line opens room, then the key word types in](#line-opens-room-then-the-key-word-types-in) · [Pre-centred words switch on every two frames](#pre-centred-words-switch-on-every-two-frames) · [Letter-by-letter fade across a word](#letter-by-letter-fade-across-a-word) · [Set line resolves from blur left to right](#set-line-resolves-from-blur-left-to-right) · [Word flips up from a flat line](#word-flips-up-from-a-flat-line) · [Word halves slide out from behind a plate](#word-halves-slide-out-from-behind-a-plate) · [Field fills a word at a time, each word lit for one frame](#field-fills-a-word-at-a-time-each-word-lit-for-one-frame) · [Placeholder deletes, the real value types in bursts](#placeholder-deletes-the-real-value-types-in-bursts) · [Words added into a pill that resizes instantly](#words-added-into-a-pill-that-resizes-instantly) · [Letter spacing snaps to normal](#letter-spacing-snaps-to-normal) · [Ticker words slam in, old words cut off the edge](#ticker-words-slam-in-old-words-cut-off-the-edge) · [Words rise and drop onto one baseline with overshoot](#words-rise-and-drop-onto-one-baseline-with-overshoot) · [Word cuts on and drifts, then leaves the same way](#word-cuts-on-and-drifts-then-leaves-the-same-way) · [Taglines swap on the second with a small pop](#taglines-swap-on-the-second-with-a-small-pop)

### Letters swing in along an arc

`dv-letters-arc-swing` · signature · energy medium · launch, sting · primitive: Letters

Each letter of a title enters from the upper right, small and rotated, and swings up into place one frame after the last, with a tiny overshoot. **When:** A product name or title that lands on a thud. **Avoid:** Long words.

- **Anatomy:** Letters 0.45x and 25 deg, motion-blurred, around a pivot below-right; 4 % overshoot.
- **Timing:** 2 f stagger, 10 f per letter; complete 18 f after the first.
- **Sound:** A heavy thud after a whoosh run.
- **Build:** `<Letters mode="arc">`.

### Title decodes from the centre outward

`dv-centre-out-decode` · signature · energy medium · launch, sting · primitive: Scramble

A wide title materialises from its centre outward both ways; the 1-2 newest glyphs at each front are accent mosaic blocks. **When:** The title of the product, once. **Avoid:** Glow or bloom on the blocks.

- **Anatomy:** Two fronts travelling linearly, a band of accent blocks riding each front, the title bright inside the open span.
- **Timing:** About 3 f per glyph at 60 fps (an 11-glyph title in about 0.5 s).
- **Sound:** Voice line or a soft riser.
- **Build:** `<Scramble title edge="mosaic">`.
- **Conditions:** light built into the device (core, body, falloff), never a uniform halo.

### Each word arrives on its own torn layer

`dv-torn-layer-carrier` · signature · energy medium · launch, sting · primitive: no primitive yet (recipe below)

Each new word is printed on its own torn-paper image layer, which tears into view in stop-motion steps; the sentence builds across a stack of torn images. **When:** A crafted, editorial film with images; a statement that grows over several pictures. **Avoid:** Product UI films.

- **Anatomy:** Layer = image + word; the tear edge advances in 4 held steps (15, 45, 72, 100 %); layers stack.
- **Timing:** Tear steps every 10 f (30-40 f per layer), layers 50-65 f apart.
- **Sound:** Paper tears within ±80 ms of beats.
- **Build:** Recipe: an SVG torn-edge mask whose reveal advances in held steps inside `<Stepped>`.
- **Materials and numbers:** Each torn layer carries its own copy of the growing sentence, so where a new layer has torn in partway the text on it and below it sit a few pixels apart and words break across the tear (the offset = half the width of the newly added word); tear edges irregular 3-6 px with hard alpha; a new layer every 20 f.

### Typeface cycles while the line steps larger

`dv-typeface-cycle` · signature · energy high · launch, sting · primitive: TypeFx (FontCycle)

Every 3 frames the typeface of a title swaps (serif, mono, light grotesk, heavy), while the line steps larger; it lands on the brand face. **When:** A launch about type, image or style; a title once. **Avoid:** Any film whose brand face must be respected from the first frame.

- **Anatomy:** Hard swaps of the face, the line re-centred each swap, scale stepping up.
- **Timing:** 8 swaps a second (every 7-8 f); 38 f in all.
- **Sound:** None needed; or a tick per swap.
- **Build:** `<FontCycle text at states={[{ wght, track, family }]} every60={7.5} scale={[1, 1.2]}>` (fx/TypeFx): the word steps through font styles (regular, black, thin wide-tracked, mono, black wide, landing on the brand style) on whole frames, re-measured and re-centred on each state frame while it steps larger; no slant axis. fontCycleFrames() gives the state frames; declares() the stepped run.
- **Materials and numbers:** Only the brand word shuffles through font styles every 4-6 f (regular, black, thin extended, black extended, back to regular) while the rest of the line stays still; cap height constant, the extended styles pushing the word about 25 % wider. With a variable font this is a wght and wdth change per state; the house bans italic, so leave the slant axis out.
- **Ban-safe default:** Cycle between weights and widths of the brand family only. (the full look relies on serif; use it only when the brand supplies it)

### Giant word rises in, cropped by the frame

`dv-giant-cropped-rise` · signature · energy medium · launch, feature, sting, vertical · primitive: Words

One word so large the frame crops it (cap height 31-55 % of the frame) rises or drops into place on a steep expo-out; often the layout pans at the same time, so the path is a J-shaped swoop, or the product swaps underneath it. **When:** Opening a film or a section with one word; a word that rides over a product shot. **Avoid:** Words whose meaning depends on the cropped letters.

- **Anatomy:** A single display word at 3-6x body size; rise 330-740 px; variants: on every third frame held (stepped); with the whole layout panning left as it rises; dropping from above while a one-hue band about 1.5 letters wide travels through the letters.
- **Timing:** 17-60 f expo-out (tau about 15 f); pan 55 f on 16 fps steps; band crosses in 16 f.
- **Sound:** A spacebar-like click, or sub-bass plus kick when the product swaps under it.
- **Build:** `<Words>` at display size with rise 0.8-1 em and dur 20-60 on E.snapOut inside a cropping frame; stepped variant inside `<Stepped fps={16}>`; the band is a LightSweep clipped to the text.

### Masked roll swap with a pre-zoom

`dv-roll-swap-bracket` · signature · energy high · launch, feature, sting · primitive: MaskRise

A word inside a bracket rolls up out of the mask while the next word rolls in from below (vertical blur on the roll), after a small anticipation zoom; the bracket grows to the new width. **When:** Swapping the key noun of a held line on a beat. **Avoid:** Swaps faster than every 1.5 s.

- **Anatomy:** Pre-zoom (anticipation), roll up/out and up/in, box 175 -> 327 px, cubic-out settle.
- **Timing:** Pre-zoom 8 f; roll 10 f; settle 14 f.
- **Sound:** A key or kick on the roll.
- **Build:** MaskRise for the incoming word, an upward launch exit for the outgoing one inside one clip; the bracket width via a 14 f tween; SnapZoom pre with a 4 % build.

### Anagrams reshuffle and lock

`dv-anagram-converge` · signature · energy medium · launch, sting · primitive: Scramble

Two jumbled words sit apart and every 2-3 frames their letters reshuffle (real anagrams of the target words) while they converge and lock; or one word becomes another by swapping letters one at a time. **When:** A name or a claim that is "made" in front of the viewer. **Avoid:** Long words (beyond about 8 letters it reads as noise).

- **Anatomy:** Letters re-ordered in steps, colour shifting each step; convergence on the last step; letter-swap variant: letters drop or rise a few px as they change.
- **Timing:** Steps every 4-6 f at 60 fps; 34 f; letter swap about 2 f per letter.
- **Sound:** Ticks on the steps.
- **Build:** `<Scramble steps>` (anagram stages); letter swap with Scramble order 'ltr' and steps of one letter.

### Caption resolves out of a light streak

`dv-streak-resolve` · signature · energy medium · launch, sting, vertical · primitive: StreakResolve

The next caption first exists as a thin bright horizontal streak (letters unreadable), widens, turns into a heavily smeared word, then snaps sharp: the caption is born from light rather than faded in. The exit is the same device reversed: the caption dims, gains a horizontal ghost and collapses into a wide bright streak (or a thin grey line) that vanishes. **When:** Voice-led films where captions follow the narration; the first caption after a section break; a word that grows out of the one before it. **Avoid:** Long lines; anything that must be read on its first frames.

- **Anatomy:** Stage 1 streak (a 1-4 px tall bar, 200-660 px wide, front-loaded widening), stage 2 a horizontally smeared word for 2 f, stage 3 sharp. Variant: the smear grows rightward out of the previous word on twos, then a 2-frame scramble, then sharp. Exit: dim to 40 %, ghost, collapse to a 330-600 px streak on twos, accelerating.
- **Timing:** Streak 3-15 f, smear 5 f, sharp: 8-20 f in all, stepped, front-loaded; the caption leads the spoken word by 2-16 f.
- **Sound:** No hit of its own; it rides the voice onset.
- **Build:** `<StreakResolve at text x y font light>` (fx/Streak): the caption through a heavy sideways blur squeezed to a hairline with a bright core, opening over the first half of 15 f on E.whipBuild (width 0.89 -> 1.03 of the caption, height to the line: measured), then the word smeared sideways for 5 f, then sharp, one sample a frame; `exit={{ at }}` dims to 40 %, ghosts, and collapses into a widening streak on twos (18 f).
- **Materials and numbers:** Relay construction: the outgoing caption gets a trailing ghost (4 f), blurs sideways into a doubled bar (4 f), becomes a bright horizontal streak about 1100 px wide with a fainter offset copy (+40, +12 px at 35 %) for 6 f, breaks for one frame into blocky glyph fragments (a decode) and lands sharp as the next caption; on twos except the decode frame.

### Old word erodes while new letters rise

`dv-erode-and-rise` · signature · energy medium · launch, feature · primitive: TypeFx (ErodeRise)

The old word disappears from its end, letter by letter, each blurring out horizontally, while the new word's letters rise into place behind it. **When:** Swapping one key word in a held line. **Avoid:** Words the viewer has not read yet.

- **Anatomy:** Exit letters right to left, 1-2 f each with a horizontal smear; entry letters 3 f stagger, expo-out, full opacity in 3 f.
- **Timing:** 40 f in all; new letters 20 f each.
- **Sound:** Voice.
- **Build:** `<ErodeRise from to at every60={3} frames60={6}>` (fx/TypeFx): the old letters go right to left, each fading through one fixed horizontal blur copy (10 px), while the new word's letters rise half an em into place behind it (20 f each on E.snapOut, 2 f apart, starting 6 f in); erodeRiseState() is pure.

### Scattered letters assemble into the word

`dv-letters-scatter-assemble` · signature · energy medium · launch, sting · primitive: TypeFx (ScatterAssemble)

The letters of the payoff word start scattered (random offsets above and below, grey, almost still), accelerate gently and snap into the word together, usually during a camera push. **When:** The payoff word of an act; a word in a mono or brand face. **Avoid:** Fast films (the drift needs a beat to read).

- **Anatomy:** Per letter a seeded offset (up to 330 px), slow float, then an ease-in convergence with a hard landing; grey to ink on arrival.
- **Timing:** 34-60 f; float 40 f, final convergence 13 f; each glyph expo-out when it lands.
- **Sound:** Voice; or a soft lock on the landing.
- **Build:** `<ScatterAssemble text at radius={330} float60={40} land60={13} seed>` (fx/TypeFx): seeded offsets that drift 18 % inward over the float, then land together on a 13 f E.snapOut, grey turning to ink on landing; scatterState() is pure.

### Words fly in from behind the camera

`dv-fly-past-lens-word` · signature · energy high · launch, sting · primitive: Oversize

Each word starts about 10x its size (one letter fills the frame), blurred and off-centre, and shrinks into its slot: the words seem to come from behind the viewer. **When:** A tagline or a closing line on a strong beat; once per film. **Avoid:** Calm films; more than 4 words.

- **Anatomy:** Per word: scale 10x to 1, a lateral start (left, centre, right in turn), blur clearing as it shrinks; staggered.
- **Timing:** About 23 f per word, stagger 10 f, sharp by the last word's landing.
- **Sound:** The first word on a kick (+19 ms); a soft air pass per word.
- **Build:** `<Oversize from={10} dur={23} defocus={14} defocusDur={18}>` per word with an x offset that converges; stagger 10.

### Words jump through positions, leaving fading stamps

`dv-jump-echo-stamp` · signature · energy high · launch, sting, vertical · primitive: EchoStamp

Words teleport on ones through about five converging positions on their way to the final line; every visited position leaves a stamp of the word that fades out, with corner ticks riding along. **When:** A hook line that should feel like a camera-less glitch of motion; a title in a techno film. **Avoid:** Calm films; more than once.

- **Anatomy:** Positions on a converging path (progress 0, .40, .60, .66, .75, hold, 1); each stamp a copy at that position fading 0.2 per frame.
- **Timing:** 12 f at 60 fps for the jumps; stamps fade over 10 f; first jump 227-292 px.
- **Sound:** An impact on the landing.
- **Build:** `<EchoStamp at x y from={{ x: 640, y: -250 }} ticks={{ color }}>{word}</EchoStamp>` (fx/Echoes): on ones at 30 fps through progress 0, .40, .60, .66, .75, hold, 1 (12 f at 60); each left position leaves a stamp from 75 % that fades in 10 f; the hold leaves none; two L ticks ride the live word.

### Word shown first as a block of its own size

`dv-word-block-placeholder` · signature · energy high · launch, feature, vertical · primitive: BlockStep

Each word first appears as a solid colour block exactly its size, then becomes the word, which drops 25 px onto the baseline; blocks can rotate through the accents' tints. **When:** A voice-led headline in a bold, graphic film. **Avoid:** Calm films; more than one line.

- **Anatomy:** Block (the word's box, one colour, 3 f) -> word; alternate words rise or drop; 1-2 words per step.
- **Timing:** 4 f per word at 60 fps; block 6 f; 4-5 f per word in a run.
- **Sound:** Voice words; a ding on the line's completion.
- **Build:** BlockStep silhouette per word (the incoming element's flat silhouette steps to the real word), or HardStep on/off frames with a rect of the measured word box.

### Whole line snaps larger on the payoff word

`dv-line-scale-snap` · signature · energy high · launch, feature, vertical · primitive: LineSnap

On the frame the last word lands, the whole line jumps 2.2x larger in one frame, defocused, and the read words settle while the new word fades up: the payoff is a cut inside a line. **When:** The spoken payoff word ("now", the product's verb) of a hook. **Avoid:** Lines that are still being read when the snap comes.

- **Anatomy:** One-frame scale (cap 5.6 % -> 12.5 % of the frame height), defocus 3.1 px that clears on a half cosine, read words settle about 31 px, new word 16 % -> full with an 11 px rise.
- **Timing:** Snap 1 f; defocus clears over 14 f; word fade 10 f.
- **Sound:** On the spoken word.
- **Build:** `<LineSnap mode="snap">` (or snapLast on Chain/Words); origin 'right' lets the read words bleed out the left edge.

### Centred line builds word by word

`dv-chain-build-recentre` · workhorse · energy calm · any · primitive: Chain

A centred line grows one word at a time, re-centring as it grows; each new word arrives soft and in the accent and darkens to ink, so the eye always knows the newest word. **When:** The main statement of a launch film; speech-paced copy. **Avoid:** Lines that must be read before they are complete.

- **Anatomy:** Re-centre on each word (a jump or a glide), the new word blur-in vivid then ink; variant: the new word slides 45 px into the gap while the line recedes; variant: every word has its own high tick 0-30 ms after it shows.
- **Timing:** Word starts 10-14 f apart, a 28 f gap before the last word; colour and blur 20-30 f each; re-centre about 22 f.
- **Sound:** Soft high ticks on word onsets, or one chime on the completing word.
- **Build:** `<Chain recentre="jump" accent="transient" focusIn cadence="reading">`.

### Oversized landing, defocused start

`dv-oversize-landing` · workhorse · energy medium · any · primitive: Oversize

The word cuts in larger than its rest size (and often defocused or in the accent) and settles down to it, never below: weight instead of a scale-up from nothing. **When:** The first word of a film, a title that overflows its pane, a label swap, any word that should feel close to the lens. **Avoid:** Every word of a line (one oversized landing per act).

- **Anatomy:** Scale from 1.28-2.7x to 1 on one front-loaded curve; optional colour accent (or a signal red) to ink; optional defocus held until the next word lands, then snapped sharp in one frame (the focus snap is the hit). Variants: a big headline that fades from light grey while shrinking, then scale-cuts; a label replaced in one frame by a longer word that appears larger and settles.
- **Timing:** 10-40 f (house 36 f), 31-38 % of the travel on the first frame, peak 37 px/f; colour home 12 f before the scale; a defocus snap is one frame.
- **Sound:** A soft pluck or water-drop on the first frame; a label swap sits 5 f before the strongest kick.
- **Build:** `<Oversize from={1.6} dur={36} cool="sweep">` or Words oversize; defocus with defocus px + defocusUntil = the next word's onset.
- **Materials and numbers:** The landed word cools from a hot accent to ink as a sweep: a band about 30 % of the word wide (hot -> a dark shade -> ink) crosses left to right in 40 f, expo-out, while the word shrinks, so the first letters are ink while the last are still hot.

### Typing with an accent trail on the newest characters

`dv-typing-colour-trail` · workhorse · energy calm · any · primitive: TypeOn

While text types or streams, its newest characters (or words) wear the accent and age to ink behind the caret: a colour trail that shows where the writing is. **When:** Prompts, AI answers, streamed replies, any product typing. **Avoid:** Two accents at once; trails longer than about 12 characters.

- **Anatomy:** Trail of 6-12 characters (about 600 px) fading accent -> ink; variants: the last 2-4 characters grey on a pale highlight block (typing in word bursts); a streamed answer with a grey leading tail; a mention token that types in its own colour and keeps it; a pink caret matching the trail.
- **Timing:** 24-90 characters a second; word bursts every 6 f; streams at about 30 words a second; trail ages over 10 characters.
- **Sound:** Keypress ticks for a person; none for a machine stream; a chat pop when a mention completes.
- **Build:** `<TypeOn kind="human"|"stream" trail={{ color: C.accent, chars: 10 }}>`; a mention is a span with its own colour.
- **Materials and numbers:** A colour wave runs through the typed answer behind the caret: once about 8 characters exist a band about 5 characters wide (the accent at the centre, soft to white over 2 characters each side) starts at the first letter and travels more slowly than the typing (0.75 of its speed), so it ends after the typing does.

### Word lands soft and pulls into focus

`dv-focus-in-word` · workhorse · energy calm · any · primitive: FocusWord

The word is in its slot (or a few px off) on its first frame but defocused, and its blur shrinks by a constant ratio each frame until it snaps sharp; focus reads like a lens, not a fade. **When:** First word after a cut to black, placeholder text in a field, an end line, a large line that types while focusing. **Avoid:** Small UI text under 30 px (the blur just looks smeared).

- **Anatomy:** Blur, opacity and an optional settle (a 1.28x scale settle, a 5-58 px slide, or a dip of 5 px then a float up 28 px that relaxes back 6 px). Variant: a big line keeps typing while its focus pulls in and the camera follows the caret, then whips away sharp.
- **Timing:** Sigma 4-45 px at 1080p, falling x0.65 a frame at 30 fps (x0.80 at 60): sharp in 6-18 f; settle 14-22 f expo-out; placeholders 6 f apart, 8 f each.
- **Sound:** A soft tick on the first frame, or the cut sound; the whip variant takes a whoosh on the whip.
- **Build:** `<FocusWord mode="word">` or Words focusIn; the type-while-focusing variant is TypeOn under a DefocusCut-style focus ramp with a typeOn() caret camera.

### Answer streams and its card grows line by line

`dv-stream-card-grow` · workhorse · energy calm · launch, feature, walkthrough · primitive: TypeOn+HardStep

A reply streams in 5-6 characters a frame, line by line, and its card grows a line at a time to hold it; several text blocks of one card can stream at once. **When:** Showing an AI answer or a generated document. **Avoid:** Text the viewer must read in full.

- **Anatomy:** Stream text; the container height snaps (or eases 6-10 f) per new line; variant: headline, outline and body blocks stream simultaneously with live re-wrapping.
- **Timing:** 60-150 characters a second; card fills in 29-50 f.
- **Sound:** None per line; one soft pop when the card completes.
- **Build:** `<TypeOn kind="stream">` inside a container whose height is snapBox() of the line count (HardStep) or an E.snapOut tween per line.
- **Materials and numbers:** A tiny caret blinks, becomes an empty outlined pill (1 px white at 50 %, about 70 px placeholder), then a small caps label types into it (about 1 character a frame at 60) while the pill snaps wider with every character, no ease.

### Fade-and-rise word, front-loaded

`dv-word-fade-rise` · workhorse · energy calm · any · primitive: Words

The default way a word arrives: it is already a third visible on its first frame and rises a third of its line box as it fades, so it reads as present at once and lands softly. **When:** Any calm statement, voice-clocked captions, the body copy of a launch or update film. **Avoid:** A beat that needs a hit (use a pop or an oversized landing), or a line already moving with the camera.

- **Anatomy:** One tween per word on opacity (from about 35 %) and y (0.2-0.8 em, house 0.33 line box). Variants: a drop from above with a short vertical smear for an energetic headline; a diagonal entry (from 54 px low and 68 px right) for a new line that rides a camera move; a second word starting one frame after the first on the same curve so a two-word opener reads as one object.
- **Timing:** Fade 32 f on a steep ease-out (50 % at 10 % of the time, 90 % by 15 f), rise 22-25 f. Stagger 8-14 f on a reading cadence; 2 f for a two-word opener; 8-14 f for a voice-clocked caption. Travel 23-77 px at 1080p.
- **Sound:** Words sit on voice onsets; with no voice, one soft tick per fragment on the last word's landing, never one per word.
- **Build:** `<Words>` at house numbers (dur 32, rise 0.33 line, stagger 12, cadence 'reading'); a drop uses riseDir up with a 2-frame vertical ghost; a diagonal entry offsets x by 1.2x the rise.
- **Materials and numbers:** Floor-reflection variant: each word rises into place trailing a faded, vertically flipped copy under it (blur 1 px, 40 % decaying to 0 in 8 f) as if it rose out of a glossy floor, the word itself going from 50 to 100 % white.

### In-place ink-up from partial strength

`dv-ink-in-place` · workhorse · energy calm · any · primitive: Words

Words or rows appear exactly in their final place, already 29-60 % strong on the first frame, and ink up to full with no movement at all; several words are often mid-fade together. **When:** Dense layouts (a page, a card, data rows, captions on photos) where motion would fight the layout, and small UI copy. **Avoid:** A hero line that needs energy; long lines that would all be half-inked at once.

- **Anatomy:** Opacity only (or a colour from the panel tint or a light grey to the ink). Variants: words land grey and snap to full ink on the frame the next word lands (the recency snap); data rows dim then bright 1-2 f apart; pairs of two words at a time for small UI copy; side words fading in 7 f after a hit.
- **Timing:** First frame 29-60 % (house 38 %); 90 % by 10-20 f, full by 20-32 f on an expo-out. Stagger 4-12 f per word; lines 5-8 f apart; rows 2-4 f apart; a recency snap is one frame.
- **Sound:** Key or click ticks on word onsets for a typed feel, otherwise none.
- **Build:** `<Words rise={0} dur={20} stagger={8}>` with the first-frame strength set by the ease (E.snapOut gives about 35 %); colour-from-tint via accent = the panel tint and accentHold 0.

### Line whose stagger and fade shrink word by word

`dv-accelerating-cadence` · workhorse · energy medium · any · primitive: Words

Each later word starts sooner and fades faster than the one before, so the line gathers speed into its payoff (often the brand name). **When:** A payoff line, the last line of an act. **Avoid:** Every line (one accelerating run per act).

- **Anatomy:** Geometric gaps (0.30, 0.23, 0.13, 0.10 s), fades shortening with them; variant: words cut on and slide only their last 10-12 px.
- **Timing:** Gaps 18 -> 6 f at 60 fps; second line fades 12 f with 6-8 f stagger.
- **Sound:** A stab on word 1; or none.
- **Build:** `<Words cadence="accelerate" accelTo={0.4}>`.

### Prompt typing that slows on its last word

`dv-typing-prompt-decel` · workhorse · energy calm · launch, feature, walkthrough · primitive: TypeOn

A prompt types at a steady rate and slows on its last word, letter by letter, so the request lands with intent. **When:** The question that triggers the product's answer. **Avoid:** Typing that is cut before it ends.

- **Anatomy:** Steady about 30-33 characters a second, then one character every 4-8 f on the last word.
- **Timing:** Whole prompt 50-90 f; last word 1.6-3x slower.
- **Sound:** Typing ticks, the last key softer.
- **Build:** `<TypeOn kind="prompt">` (last word x1.6 house; raise to x2.5 for emphasis).
- **Materials and numbers:** When the text outgrows the field it scrolls left under a feathered left edge (a 50-70 px mask) instead of a hard clip; once typing stops the caret blinks slowly (12 f on, 20 f off).

### Typing by a person, with word-end pauses

`dv-typing-human` · workhorse · energy calm · any · primitive: TypeOn

Text types the way a person types: runs inside words, a pause of 1-2 frames at word ends, an I-beam caret; the UI around it reacts (a send button pops before the sentence ends, icons pop when it is done). **When:** A prompt or search typed into the product, a title on a device screen, any line that should feel human. **Avoid:** Machine output (use a stream); long paragraphs.

- **Anatomy:** Characters cut on (optionally a 4 f fade each); variants: a line typing above the previous one so the stack builds upward; a first word that pops whole and a second that types; a wrap onto a second line.
- **Timing:** 24-45 characters a second inside words, +2-4 f per space; human kind: 30 cps in runs, one key pause at commas.
- **Sound:** Key clicks per keystroke at -13 to -24 dBFS, or none.
- **Build:** `<TypeOn kind="human">`; a send button pop is press/springBox started 4-6 f before the last key.

### Typing that starts mostly done after a cut

`dv-typing-elided` · workhorse · energy medium · launch, feature, walkthrough, vertical · primitive: TypeOn

After a cut, the prompt is already 50-80 % typed and the rest types with deceleration: the film skips the boring part. **When:** Several prompts in a row, montages of requests. **Avoid:** The first prompt of a film (show one typed in full first).

- **Anatomy:** First frame 50-80 % typed; the rest decelerates.
- **Timing:** About 93 cps for 5 f, then 59, 51... slowing; 75 f for 51 characters.
- **Sound:** A keypress bed rather than per-key clicks.
- **Build:** `<TypeOn from={0.65} kind="stream" ease={E.type}>`.

### Line written on behind a soft moving edge

`dv-soft-edge-write-on` · workhorse · energy calm · any · primitive: Wipe

A line is revealed left to right by a soft travelling edge, near-constant speed, so it washes on; glyphs can be born in a hot accent and cool; a status line can end with a spinner turning into a check. **When:** Status lines, single lines over a picture. **Avoid:** Edges narrower than a letter (that reads as a hard wipe).

- **Anatomy:** Soft alpha ramp about 70 % of the element; glyphs accent -> ink as the edge passes.
- **Timing:** 6-24 f across 880 px (first 4 f slower); fall-off 56 f.
- **Sound:** A soft notification ding mid-reveal, or a kick at the end.
- **Build:** `<Wipe kind="gradient">` on the line; accent via HueSweep or Words accent.

### Cut on low at full ink, slide home

`dv-pop-low-slide` · workhorse · energy medium · any · primitive: Words

A word cuts on at full opacity a little below (or beside) its slot and slides home on an exponential, so the first frame is a clean hit and the motion is pure settle. **When:** Punchier copy on a beat, headline words on a coloured field, a word that should touch the one before it. **Avoid:** Very large type (the cut-on jump reads as a glitch above about 60 px of offset).

- **Anatomy:** Opacity 1 from frame one; offset 0.27-0.45 of the cap height (18-56 px at 1080p) below or 66 px to the right; variant: two linear frames of 104 px before the expo tail for a word that must travel far (259 px); variant: slide left until it touches the previous word.
- **Timing:** Settle 10-38 f expo-out; stagger 2-5 f; a far travel uses 2 linear frames then 20 f expo.
- **Sound:** Each word on a kick or a soft tick; a run of words gets one sound.
- **Build:** `<Words dur={1} rise={0.45} riseUnit="em" riseDur={22} riseEase={E.snapOut} stagger={5}>`; for a side entry rotate the rise direction.

### Word rises out of a baseline mask

`dv-mask-rise-word` · workhorse · energy medium · any · primitive: MaskRise

Each word rises from behind an invisible baseline mask while going grey to ink; the last word takes twice as long; verb-plus-object lines can follow with a 3 f lag. **When:** Short commands, verbs on hits, any line that should feel cut and precise. **Avoid:** Long lines (the masked rise loses its snap).

- **Anatomy:** Rise of about 90 px from under the baseline, ink from grey; variant: staggered hard exit.
- **Timing:** Rise 18-20 f; second word 6 f behind; exit 14 f; lines 60 f apart.
- **Sound:** Hits on each verb.
- **Build:** `<MaskRise lastScale={2} ink>`.

### Colour front sweeps a set line to ink

`dv-sweep-set-line` · accent · energy calm · launch, feature · primitive: TypeFill

A line is revealed (or already set) in a pale state and a soft colour front sweeps across it into the ink; a second slower sweep can stop short so the last words keep the accent. **When:** A status title, a sentence whose last words are the point, a giant word inked from the bottom up. **Avoid:** Multi-hue fronts in a film that already has its spectral accent.

- **Anatomy:** Reveal (2-22 f) then a sweep front; variants: a fast reveal in 2 f right to left; a giant word that inks bottom-first through a vertical gradient (top 35 % ink at first).
- **Timing:** Reveal 2-22 f; sweep 24-94 f; vertical ink 10 f ease-out.
- **Sound:** A water-drop or sub hit on the cut into it.
- **Build:** `<TypeFill mode="develop" text fronts={developFronts(ink, accent)}>` (fx/TypeFill): a feathered reveal head (5 letters) and fronts each slower than the last (44, 72, 120, 260 f), the ink stalling at 85 % before the end catches up; the fronts are baked dithered plates moved by transform (fx/plates).
- **Materials and numbers:** The sentence develops through several hues before it settles: a transparent head (feathered about 5 letters) followed by fronts of peach, pink, lilac and blue, each slower than the one before, so mid-move the line shows several hues at once; the ink front eases out (power about 2.1) and stalls at 85 % of the line before the end catches up. Reveal head about 1.2 letters per drawing (44 f to the end), the blue front about 120 f, the ink 260 f.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Word inks along a colour path

`dv-hue-path-ink` · accent · energy calm · launch, feature · primitive: TypeFill / HueSweep

Each new word appears at full size but pale and walks along a colour path into the ink, letter by letter from one end; the colour change is the reveal. **When:** A text-led opener, an AI line that should feel generated, a keyword. **Avoid:** More than one per act; a full rainbow walk (it reads as a template).

- **Anatomy:** Lightness held first, then darkened through the accent into the ink; the front crosses the word with the right end leading (or right to left for a cooling ramp); variant: the first word nudges 18 px into centre while it colours.
- **Timing:** 18-20 f per word, onsets 20-24 f apart; a ramp front of 13 f with a 30 f tail; AI lines 28-44 f each.
- **Sound:** A soft whoosh on the first word; word cadence off the beat.
- **Build:** `<TypeFill mode="band" text stops={spectralInk(ink)} from={1} to={0} dur={48}>` (fx/TypeFill): a spectral run that leaves ink behind it; the default run is the cool side of the wheel, FULL_SPECTRUM (fx/plates) for a brand that owns a rainbow; `<HueSweep>` stays the one-hue path.
- **Materials and numbers:** A wide spectral band slides right to left through the label and leaves ink behind: the line arrives as a horizontal rainbow (yellow, orange, magenta, red, olive), the band (about three times the label's width) slides left on a bezier (0.37, 0.13, 0.26, 0.95) at about 12 px/f, so mid-move the line reads warm at its end and cool at its start, and the tail of the band is ink. Ten stops from warm to green, teal, blue, navy and ink.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform; the film's one spectral accent.

### A highlight walks the line, parks on the keyword, new words type hot

`dv-highlight-walk-park` · accent · energy medium · launch, feature · primitive: TypeFill

A grey line lights up in the accent as a whole, then the colour narrows to a window that walks word by word and parks on the keyword; new words then type in, each born in the accent and cooling to grey, while the keyword keeps its colour. **When:** A line inside a UI (a subtitle, a result) that carries the claim; two colours only. **Avoid:** Big display copy (use a tint wave or an ink path).

- **Anatomy:** Whole-line flash 8 f; the window steps about every 8 f; park 24 f; typing about one character per 2 f with word-end pauses; typed letters cool accent -> grey over 12 f; every colour change is a linear lerp over 12-16 f, never a cut.
- **Timing:** About 90 f for the whole move.
- **Sound:** None needed.
- **Build:** `<TypeFill mode="window" text park step={8} flash={18} then>` (fx/TypeFill): pure per-word colour state, the typed continuation born hot and cooling in 24 f; declares the stepped window; typeFillFrames() gives each step, the park and the first typed letter.

### Typing that accelerates into a whip

`dv-typing-accelerate-whip` · accent · energy high · launch, feature, walkthrough · primitive: TypeOn

The gaps between keys shrink (5, 2, 2, 1, 1, 1 frames) while the camera follows the caret on a decaying push, then whips away before the line ends. **When:** Handing off from a typed request to the product's reaction. **Avoid:** A line the viewer must read to the end.

- **Anatomy:** Accelerating key gaps; camera tracks the caret (decay power 2.6) in close-up; the whip hides the last keys.
- **Timing:** Gaps 5, 2, 2, 1, 1, 1 f at 60 fps (20 f in all); close-up runs 12, 12, 7, 5, 7, 5, 5, 5 f per character.
- **Sound:** One click per keystroke; the music drops out for 0.3 s before the next hit.
- **Build:** `<TypeOn kind="prompt" gaps={ACCEL.typing} skip>` with typeOn() caret camera into whip().

### Typing whose newest characters arrive smeared

`dv-typing-smear-lead` · accent · energy medium · launch, feature, walkthrough · primitive: TypeFx (CodeType smear)

Text types fast while its newest 2-30 characters arrive as a horizontal smear (or a soft accent ghost running ahead of the white text) that sharpens behind the caret: speed you can see. **When:** A prompt or URL typed fast into the product, especially just before a cut hides the end of the sentence. **Avoid:** Slow, readable typing (the smear then looks like a rendering fault).

- **Anatomy:** Committed text sharp; a trailing window of the last 2-3 characters (or a 10-30 character ghost in the accent ahead of the text) with horizontal blur; typing in bursts.
- **Timing:** 60-130 characters a second (1 char a frame at 60 fps); each character sharpens over 6 f; bursts over 22-34 f.
- **Sound:** Keypress ticks only when the typing is slow enough to hear; a fast run takes none.
- **Build:** `<CodeType tokens at cps smear={{ chars: 3, frames60: 6 }}>` (fx/TypeFx): each new character is drawn twice for its first 6 f, a sharp copy fading in and a copy through one fixed horizontal blur, stretched ahead of it, fading out, so the newest characters arrive as a smear that sharpens behind the caret; codeTypeState() gives each character's smear share.

### A label rises in gradient ink, then a blink wave turns it white

`dv-tinted-then-white-blink` · accent · energy medium · launch, feature · primitive: MaskRise / TypeFill

A small label rises from a baseline mask filled with the same gradient as the card behind it, so it is almost camouflaged; then a wave passes left to right: each letter blinks out for a few frames and comes back pure white, so for a moment the word reads white, gap, tinted. **When:** A label on a gradient or tinted card; a product name inside a UI card. **Avoid:** Long copy; plain grounds (the camouflage needs the gradient behind).

- **Anatomy:** Rise 12 f; tinted hold 16 f (text clipped to the card's gradient at about 0.8); dropout wave about 4 f apart per letter, each letter off for 4 f, then white.
- **Timing:** About 76 f in all.
- **Sound:** A soft tick per letter, or none.
- **Build:** `<MaskRise>` for the rise, then `<TypeFill mode="swap" text stops stagger={4} gap={4} color="white">` (fx/TypeFill); the dropouts are declared stepped.

### Glyph scramble that locks into the word

`dv-glyph-scramble-lock` · accent · energy medium · launch, feature, sting · primitive: Scramble

Random glyphs (letters, digits, symbols) cycle in each slot and lock into the word, left to right or out of order, with exactly one accent glyph at a time; a sentence can scramble out the same way. **When:** A product name, a code, a version, a title once per film. **Avoid:** Running copy; more than once per film.

- **Anatomy:** Per slot 10 changes a second, locking in order; one glyph in the accent; variants: arrow or symbol glyphs decoding into a wordmark, each new letter accent first then all ink; a sentence dropping out to random glyphs while the title resolves in the accent and flips to ink.
- **Timing:** A state every 6 f (10 Hz); 7 states over 38 f; decode out 13 f, in 10 f, colour flip 1 f.
- **Sound:** A UI pop on the scramble's start; the title can land in a stop-down silence.
- **Build:** `<Scramble rateHz={10} order="ltr">` (or 'random'); accent glyph via the accent prop; declares the span stepped.
- **Materials and numbers:** Two constructions. Halo scramble: the word cycles through whole random glyph sets, each held exactly 6 f (10 Hz), inside a soft white halo (a blurred copy at 20 px, 45 %, screen) with the scrambling accent glyphs carrying a smaller accent glow; the halo switches off on the lock frame as a cut, while the word settles from 1.2x to 1.0. Positional scramble: letters keep their slots, random letters drop out, foreign glyphs and ligatures appear in the gaps, then the new string resolves through a pale tint for one state before the ink (about 4 f per state).

### Handwritten line writes on at pen speed

`dv-signature-write-on` · accent · energy calm · launch, feature · primitive: Stepped.strokeDrawn

A monoline handwritten signature draws left to right at a constant pen speed on a card; it can write twice as cards swap. **When:** Personal, signed, approved moments. **Avoid:** Fonts pretending to be handwriting.

- **Anatomy:** One SVG stroke, dash offset at constant speed.
- **Timing:** 52-67 f linear per write; card swap 37 f overlapping by 12 f.
- **Sound:** A soft pen scratch.
- **Build:** SVG path with stroke-dashoffset from strokeDrawn() (65 px a frame at 60 fps) or a linear tween.

### Letters appear in random order

`dv-random-order-letters` · accent · energy calm · feature, walkthrough · primitive: TypeFx (ScatterAssemble order)

The letters of a label or status line appear one by one in a shuffled order (each faint first, then full) until the word is whole. **When:** A button label appearing, an "Analyzing..." status line. **Avoid:** Headlines.

- **Anatomy:** Seeded permutation of letter onsets; each letter faint -> full in 2-4 f.
- **Timing:** 24-32 f for a line (about one letter a frame) on an ease-in count.
- **Sound:** Voice or none.
- **Build:** `<ScatterAssemble text at order="random" radius={0} stagger60={2}>` (fx/TypeFx): each letter appears faint (35 %) at its own shuffled onset and turns full as it lands; orderRanks() gives ltr, rtl, centre or a seeded random order.

### Sans line with a contrasting-voice payoff word

`dv-contrast-voice-pair` · accent · energy calm · launch, feature · primitive: Words

A short phrase pairs a plain sans word with a payoff word in a contrasting voice (a handwritten script, a serif italic, small caps); the contrasting word enters 5-7 frames later. **When:** "No X." style lists; editorial films. **Avoid:** Films whose brand has one family only.

- **Anatomy:** Sans word blur-fade-rise; contrasting word later; varied exits; a one-frame blank between phrases; variant: display caps fading in while a small italic connector types.
- **Timing:** Entry 10-16 f; contrasting word +10-14 f; hold creeping 146 f.
- **Sound:** A quiet breath before each cut.
- **Build:** `<Words>` with the payoff word in the second face and its own start.
- **Ban-safe default:** Contrast by weight and size within the brand family (light vs heavy, or a mono payoff word). (the full look relies on serif, italic; use it only when the brand supplies it)

### Typewriter on an ease-out progress

`dv-typing-ease-progress` · accent · energy calm · launch, feature · primitive: TypeOn

A line types at full opacity, character-quantised but on an ease-out: 41 % of its width after one frame, 66 % after two, then slowing; contrasting accent words type in the same pass. **When:** A line that should feel written in one stroke. **Avoid:** Prompts (people do not type on an ease).

- **Anatomy:** Character count follows an ease-out; accent words in a contrasting face inline.
- **Timing:** 54 f at 60 fps.
- **Sound:** Voice.
- **Build:** `<TypeOn kind="stream" ease={E.snapOut}>`.

### Word decodes from a low-res pixel version

`dv-resolution-ladder-decode` · accent · energy medium · launch, sting · primitive: Pixelate

A word appears as a coarse low-resolution pixel version in the accent, then half-resolved in a pale tone, then crisp in the ink, one frame each, and settles with a small posterised overshoot. **When:** Words in a film about images, rendering or AI generation. **Avoid:** Small type (the low-res stage is unreadable mush below about 60 px).

- **Anatomy:** Three resolution states, colour accent -> pale -> ink; a stepped spring settle.
- **Timing:** Decode 7 f (one state per 2-3 f at 60 fps); settle 7 f on twos.
- **Sound:** A drum on the decode, a kick on the settle.
- **Build:** `<Pixelate>` in-phase only on the word with a three-size ladder (pixelLadder of 3 sizes) and the colour stepped per state.

### Line opens room, then the key word types in

`dv-room-then-type` · accent · energy calm · launch, feature · primitive: LineSnap+TypeOn

A held line accelerates sideways to open room, then the key word types in letter by letter in the accent, and the line leaves with blur. **When:** The key word of a statement. **Avoid:** Room moves slower than the typing.

- **Anatomy:** Pre-shift accelerating (-2 -> -36 px/f), typing about one letter a frame, exit left with blur.
- **Timing:** Pre-shift 20 f; typing 20 f; exit 12 f.
- **Sound:** Voice.
- **Build:** `<LineSnap mode="room">` then `<TypeOn kind="human">` in the opened slot; exit 'launch'.

### Pre-centred words switch on every two frames

`dv-slot-pop-on-twos` · accent · energy high · launch, feature, sting, vertical · primitive: Words

Words appear in one frame each, at full ink, in the slots of a line that is already laid out and centred, one every 2 frames (12 words a second); they can be erased in the same order. **When:** A fast opener, a title that rides a camera move, hit captions over footage, huge words on a full accent field. **Avoid:** Calm films; lines longer than 5 words (the build becomes a flicker).

- **Anatomy:** Final layout solved first, words cut on in reading order, no fade, no scale; variants: huge left-aligned words (66 % of the frame width, 190 px tall) on the accent field; 10-frame steps for a slow caption; hit captions held 12-25 f and cut off in one frame.
- **Timing:** 5 f at 60 fps per word (2 f at 24-30 fps); erase 5 f apart in the same order; slow version 10 f per word; hit captions hold 30-60 f.
- **Sound:** The completed phrase lands on a kick; hit captions sit on hits or in a stop-down silence.
- **Build:** `<Words dur={1} rise={0} stagger={5}>` (Words lays out the final centred line); erase with exit 'words' at 5 f; hit captions are HardStep on/off frames.

### Letter-by-letter fade across a word

`dv-letter-fade-sweep` · accent · energy calm · launch, feature · primitive: Letters / TypeFill

A word fades in letter by letter from left to right, about one letter a frame, each with a short fade; trailing letters can rise in one at a time while the line moves. **When:** An "Introducing" over a photo; the end of a line entering at the frame edge. **Avoid:** Body copy.

- **Anatomy:** Each letter a 4-8 f fade (and optionally a 60 px rise at 50 % white); 1-2 f apart.
- **Timing:** 30 f for 11 letters; trailing letters 13 f with 1.5 f stagger.
- **Sound:** A water-drop on the start.
- **Build:** `<Letters mode="pop">`, or on huge words `<TypeFill mode="develop" fronts={[{ color: pale }, { color: mid }, { color: ink }]}>` for the soft luminance front.
- **Materials and numbers:** On huge words the newest letters develop through a soft luminance front rather than whole-word fades: a ramp ink -> mid grey -> pale over 4-5 letters (about 350 px at a 150 px cap height) runs across the line at 12-20 px/f, matching the camera pan, while new words still rise about a third of a line.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.

### Set line resolves from blur left to right

`dv-focus-travel-line` · accent · energy calm · launch, feature · primitive: FocusWord

The whole line is laid out at once but only the first words are sharp; sharpness travels across it left to right, and the last word closes a gap as it sharpens. **When:** A sentence that reads in one sweep; a calm opener. **Avoid:** Lines the viewer has to wait for.

- **Anatomy:** Per-word blur and opacity by position; last word gap close.
- **Timing:** Sweep 34 f; gap close 16 f; continuous drift.
- **Sound:** None.
- **Build:** `<FocusWord mode="ui">` with the line split into words.
- **Materials and numbers:** An address bar built from separate soft pills the colour of the canvas, defined only by a drop shadow (0 6px 18px at 8 %) and an inner top highlight (0 -2px 6px white at 90 %), with thin black line icons; no borders.

### Word flips up from a flat line

`dv-flip-up-word` · accent · energy medium · launch, feature · primitive: no primitive yet (recipe below)

A word flips up about its baseline from a flat line (rotateX) while rising and darkening. **When:** A word that should feel lifted off the page. **Avoid:** Thin type (the flat phase disappears).

- **Anatomy:** Glyph height 12 -> 57 px in 3 frames, rise 66 px, grey to ink.
- **Timing:** Height 8 f, position 25 f, colour 20 f.
- **Sound:** None.
- **Build:** Recipe: rotateX(90deg -> 0) about the baseline with perspective 800 px plus the Words rise.

### Word halves slide out from behind a plate

`dv-split-word-emerge` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

The two halves of one word emerge from under a plate (masked by it) and drift outward, the word opening around the object. **When:** A word that wraps a product or a dock. **Avoid:** Words that split badly.

- **Anatomy:** Two halves clipped by the plate's edge, drifting apart.
- **Timing:** 40 f ease-out.
- **Sound:** None.
- **Build:** Recipe: two Words spans inside a clip-path that excludes the plate, translated outward on E.snapOut.

### Field fills a word at a time, each word lit for one frame

`dv-field-word-flash` · accent · energy medium · launch, feature, walkthrough · primitive: TypeOn

A query field fills one whole word every 2 frames, each new word in the accent for exactly one frame; a prompt card can fill one line per frame. **When:** Showing that the product understands a request instantly; a montage of prompts. **Avoid:** Text the viewer must read word by word.

- **Anatomy:** Words cut on whole; one-frame accent flash per word; variant: a 3-line prompt in 3 frames.
- **Timing:** 12 words a second (one every 5 f at 60 fps); a line per frame for a prompt card.
- **Sound:** Typing ticks or a bubble pop when the card completes.
- **Build:** `<TypeOn kind="field" accent>`.

### Placeholder deletes, the real value types in bursts

`dv-typing-backspace-retype` · accent · energy calm · feature, walkthrough · primitive: TypeOn

A placeholder in a field deletes quickly, then the real value types in irregular 1-2 character bursts: the field is being edited, not filled. **When:** A URL, a name or a setting being changed in the product. **Avoid:** Fields the viewer has not seen filled before.

- **Anatomy:** Backspace run (about 11 characters in 10 f), a beat, then bursts.
- **Timing:** Delete about 33 characters a second; retype about 26 a second in bursts; 48 f in all.
- **Sound:** A chat pop mid-typing if a reply comes in.
- **Build:** Two TypeOn runs: the first with its count reversed (characters shown = n - count), the second human kind.

### Words added into a pill that resizes instantly

`dv-pill-resizes-per-word` · accent · energy calm · launch, feature · primitive: HardStep

Words appear one at a time inside a pill and the pill takes its new width in one frame each time, with uneven gaps that feel like thinking. **When:** A prompt or idea being formed; a chip that grows. **Avoid:** Eased container growth next to it (keep it hard).

- **Anatomy:** Pill width = snapBox of the text width; words cut on.
- **Timing:** Word gaps 15, 33, 8 f (uneven).
- **Sound:** None, or a soft tick per word.
- **Build:** `<HardStep>` snapBox of the measured text widths; words pop.

### Letter spacing snaps to normal

`dv-tracking-snap` · accent · energy medium · launch, feature, sting · primitive: Letters

A word appears too tight (letters overlapping) or too loose and snaps or tracks in to its normal spacing. **When:** Words on cards in a fast cut sequence; a small subtitle settling under a figure. **Avoid:** Long sentences.

- **Anatomy:** Tracking from 78-83 % or 102-128 % of the word's width to 100 %, on 16 fps steps or an ease-out.
- **Timing:** 8-15 f on steps; a slow track-in 20 f.
- **Sound:** The hard cut.
- **Build:** `<Letters tracking>` (house +0.024 em closing over 20 f) or Wordmark trackingState.

### Ticker words slam in, old words cut off the edge

`dv-ticker-slam` · accent · energy high · launch, sting · primitive: Chain

Each new word enters from the right with a huge first-frame jump (135-290 px) and an expo tail; the older words are pushed left and cut off by the frame. **When:** A rapid list of verbs or features on hits. **Avoid:** Copy that must be read in full.

- **Anatomy:** Jump frame + tail per word, the line shifts by the new word's width; exits on single frames at the left edge.
- **Timing:** 2 f jump + 12 f tail per word.
- **Sound:** A hit per word.
- **Build:** `<Chain recentre="jump" ink="pop" edgeMask={{ left: 0 }}>` with the line anchored right.

### Words rise and drop onto one baseline with overshoot

`dv-baseline-converge-overshoot` · accent · energy medium · launch, feature, sting · primitive: recipe (plain layers)

One word rises from below and the next drops from above onto a shared baseline, each landing with a real overshoot, while the background pans with a pulse. **When:** A playful two-word title on a coloured field. **Avoid:** A film that already spends its one spring elsewhere.

- **Anatomy:** Alternate directions; landing overshoot 11-19 %, zeta 0.46-0.57; a 2-step rise.
- **Timing:** Landings 12-22 f; pan 72 f.
- **Sound:** A kick on the first landing, onsets per word.
- **Build:** Recipe: per word a damped spring on y (SPR.landing) from ±0.8 em.

### Word cuts on and drifts, then leaves the same way

`dv-cut-on-drift` · accent · energy calm · any · primitive: Words

Labels appear in one frame at full ink and keep drifting (diagonally apart, or sideways on an expo-out), hold briefly and accelerate out along the same line. **When:** Two labels that relate (a pair of words apart in the frame); a single word between scenes. **Avoid:** Text that must sit still to be read.

- **Anatomy:** Cut-on (1 f fade), drift 60-70 px, short hold, launch exit.
- **Timing:** Drift 26-68 f; hold 8 f; exit 16 f accelerating (2, 4, 8, 14 px...).
- **Sound:** Each label near a beat.
- **Build:** `<Words dur={1} rise={0}>` inside a drift transform; exit 'launch' along the drift.

### Taglines swap on the second with a small pop

`dv-tagline-metronome` · accent · energy calm · launch, vertical · primitive: HardStep

Small taglines replace each other exactly every second; the new one appears slightly small and pops to size in 2 frames while its contrast rises. **When:** A run of short claims over a photo. **Avoid:** More than about four swaps.

- **Anatomy:** Hard swap; scale 0.88 -> 1 in 2 f; contrast up over 16-28 f.
- **Timing:** Every 60 f; pop 2 f.
- **Sound:** On round seconds, not on beats.
- **Build:** HardStep swaps every 60 f; scale via a 2 f tween; opacity contrast over 20 f.
