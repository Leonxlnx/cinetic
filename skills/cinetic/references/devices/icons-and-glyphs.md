# Icons and glyphs

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Icons that draw, pop, stand in for words and grow out of dots.

[Blob launches, stretches, hangs and falls](#blob-launches-stretches-hangs-and-falls) · [An icon stands in for a word in the sentence](#an-icon-stands-in-for-a-word-in-the-sentence) · [A single glyph grows, spins upright and opens the film](#a-single-glyph-grows-spins-upright-and-opens-the-film) · [Icons and badges pop in with a small life](#icons-and-badges-pop-in-with-a-small-life) · [Line icon draws itself on](#line-icon-draws-itself-on) · [A row of icons arrives staggered, the chosen one last](#a-row-of-icons-arrives-staggered-the-chosen-one-last) · [A dot grows into an icon](#a-dot-grows-into-an-icon) · [Arrows as motion motifs](#arrows-as-motion-motifs) · [Companion icon swaps on every tick](#companion-icon-swaps-on-every-tick)

### Blob launches, stretches, hangs and falls

`dv-blob-launch-arc` · signature · energy medium · launch, feature · primitive: Flight

A blob pops off a bar as a small dot, rises above it stretched along its travel during the fastest frames, hangs at the top, and falls back: squash and stretch used once, on the one object that jumps. **When:** A playful launch of a single element (an idea leaving the bar). **Avoid:** Stretch on type or UI panels.

- **Anatomy:** Stretch 1.38:1 along travel for the fastest 4 f; hang 8 f; cubic up and down.
- **Timing:** Up 29 f, hang 8 f, down 21 f.
- **Sound:** Launch on a kick; land on the next kick.
- **Build:** launchHangFall(f, { at, height }) (fx/Flight): up 29 f on E.glideOut, hang 8 f, down 21 f on E.buildIn; stretchOf(speed) gives the 1.38 : 1 stretch along the travel on the fastest frames only; anim squash() on the landing.

### An icon stands in for a word in the sentence

`dv-icon-in-sentence` · signature · energy calm · launch, feature · primitive: Words

An icon takes a word's place inside the line: a mascot pops in where the next word would be while the giant word re-sets smaller; an outlined chip with an app logo sits inside the sentence, arriving in the accent and cooling, heating up before it swaps; a round clock icon between two words pops from 0.7 from defocus, saturates, then its hand ticks. **When:** Product names, apps, time, anything the viewer knows as an icon. **Avoid:** Icons that are unreadable at line size (at least 1.33x the cap height).

- **Anatomy:** Icon 1.3-2x cap height; pop 7-30 f; colour cool 10 f, heat 15 f before a swap.
- **Timing:** 10-30 f.
- **Sound:** The spoken word.
- **Build:** Words with an inline element slot (a span with an icon), entering with Oversize from 0.7.
- **Materials and numbers:** An inline brand chip changes brand by rolling: the old content warms and fades, then rolls up out of the pill while the new name rolls in from below (both visible for 2 f), the pill's 1 px border following the text colour; 16 f in all.

### A single glyph grows, spins upright and opens the film

`dv-glyph-seed-open` · signature · energy calm · launch, sting · primitive: no primitive yet (recipe below)

A single small mark appears at the frame centre on a dark ground, grows (half size within 2-3 f) and spins to upright on a longer, softer curve, landing exactly when the next device (a mask) starts; later it turns into a hole of the ground's colour and shrinks out spinning. **When:** Cold opens; a mark that seeds an iris. **Avoid:** A sparkle as decoration (use the brand's own mark or a neutral shape).

- **Anatomy:** Scale on a steep ease-out over 40 f; rotation 65 -> 180 deg on a longer tail; invert in 1 f; exit shrink on an ease-in.
- **Timing:** 64 f in; exit 52 f.
- **Sound:** The first music note at 0.05 s.
- **Build:** Recipe: an SVG mark with scale and rotate on separate curves.
- **Ban-safe default:** The brand's mark or a plain dot as the seed. (the full look relies on sparkle; use it only when the brand supplies it)

### Icons and badges pop in with a small life

`dv-icon-pop` · workhorse · energy calm · any · primitive: Oversize

Small icons arrive with character: a crown badge pops tilted onto the corner of the top icon; an emoji pops a beat after its bubble (40 % -> 100 %); a pixel icon flips in from a 1 px line in one frame, breathes and flashes white; pixel blocks pop one by one and land with a small overshoot; a drawn clock's second hand ticks. **When:** Badges, emoji, small rewards and states. **Avoid:** Every icon popping at once.

- **Anatomy:** Pops front-loaded 6-8 f; flips 1 f; breath +5-8 %; overshoot small.
- **Timing:** 5-30 f.
- **Sound:** A chat pop or none.
- **Build:** Oversize from 0.4-0.7 on E.snapOut (allowed for small icons), HardStep for flips.
- **Materials and numbers:** Pictorial elements arrive at full size but out of focus and sharpen over 4-6 f (blur 8 -> 3 -> 0 px, no scale), while saturation goes pale to full; text never does this. A block can also be born inside a letter of the word and slide to its slot as the word shrinks (6 f).

### Line icon draws itself on

`dv-icon-draw-on` · workhorse · energy calm · any · primitive: Stepped.strokeDrawn

A line icon draws its strokes on (a paper plane while its bubble slides in; icons drawing onto objects, then updating; an icon rising inside a sphere as it blooms; an icon that breathes +12 % while its stroke inks in). **When:** Icons in UI moments; labelling objects. **Avoid:** Filled icons (the draw-on needs strokes).

- **Anatomy:** Draw-on 8-17 f roughly linear; 5 px stroke at about 70 px icons.
- **Timing:** 8-34 f.
- **Sound:** Soft ticks; the voice onset.
- **Build:** SVG paths with strokeDrawn() or a dash tween.

### A row of icons arrives staggered, the chosen one last

`dv-icon-row-stagger` · workhorse · energy calm · any · primitive: Cards

Toolbar icons fade in one after another and the chosen one gets a filled tile behind it last; app icons develop into some slots in random order on the strongest hit. **When:** Toolbars, app grids, options. **Avoid:** Even stagger for the chosen item (give it a beat more).

- **Anatomy:** Stagger 3, 3, 9 f; fades 5 f; random-order develop 1 f apart.
- **Timing:** 20-30 f.
- **Sound:** The strongest hit for the develop.
- **Build:** Cards / kit Glyph with starts; Develop for the slots.

### A dot grows into an icon

`dv-dot-grows-into-icon` · accent · energy medium · any · primitive: MorphChain

A 4 px dot appears, becomes a rounded blob, then a thick plus already rotated that spins -90 deg into place; a point grows over 3 frames, jumps 4x in one frame on a note, settles and shrinks to a point; tiny dots scattered around a folder grow into file icons in a quick stagger while the folder pops. **When:** Building icons from nothing; motifs on a musical note. **Avoid:** Icons fading in.

- **Anatomy:** Growth 12 f; snap 85 % in 1 f; settle 15 f; icons 10 f each staggered.
- **Timing:** 12-48 f.
- **Sound:** A soft UI pop; the snap on an arpeggio note; pop SFX.
- **Build:** MorphChain dot -> blob -> icon; SnapZoom-style one-frame jump on the note.

### Arrows as motion motifs

`dv-arrow-motifs` · accent · energy medium · launch, feature · primitive: recipe (plain layers)

An arrow splits into a row of arrow glyphs pointing in different directions (each new glyph ink for one frame, then the accent); outlined chevrons rise past a word; pale arrows drift outward from a hero icon; a white arrow shoots from the frame edge into its target in 2 frames and holds. **When:** Direction, growth, uploads, "go". **Avoid:** Decorative arrows that point nowhere.

- **Anatomy:** Glyph row tightening on an ease-out; chevrons decelerating; drift 120 px; shoot 2 f.
- **Timing:** 5-25 f.
- **Sound:** The voice onset on the shoot.
- **Build:** Recipe: SVG arrow glyphs with HardStep colour and simple transforms.

### Companion icon swaps on every tick

`dv-ticking-icon-swap` · accent · energy medium · launch, feature · primitive: HardStep

A square icon tile beside a list changes its outline icon on every tick of the list (code, document, data, crop, image, link), one state every 4 frames. **When:** Showing formats or types passing through. **Avoid:** Icons that are hard to read at speed.

- **Anatomy:** One-frame swaps; 4 f per state.
- **Timing:** 10 f per state.
- **Sound:** Ticks.
- **Build:** HardStep over an icon list.
