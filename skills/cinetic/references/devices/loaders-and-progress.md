# Loaders and progress

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Waiting made watchable: step lists that tick, thinking indicators, shimmer, loaders built from the film's own graphics, images resolving through stages.

[Image resolves through representations](#image-resolves-through-representations) · [Grid loader of blocks: lit row steps, copies in phase](#grid-loader-of-blocks-lit-row-steps-copies-in-phase) · [Loader arc grows into a ring and the core swells](#loader-arc-grows-into-a-ring-and-the-core-swells) · [Agent step list: spinner rows that tick to checks](#agent-step-list-spinner-rows-that-tick-to-checks) · [A shine passes through text while it loads](#a-shine-passes-through-text-while-it-loads) · [Thinking indicator: icon, label and pulsing dots](#thinking-indicator-icon-label-and-pulsing-dots) · [Bubble charges with colour, then snaps wide](#bubble-charges-with-colour-then-snaps-wide) · [Progress line builds with counter-motion](#progress-line-builds-with-counter-motion) · [Status labels swap faster and faster](#status-labels-swap-faster-and-faster) · [Brand mark rises alone and spins as the loader](#brand-mark-rises-alone-and-spins-as-the-loader) · [Corner handles turn on one after another: a loading chase](#corner-handles-turn-on-one-after-another-a-loading-chase) · [Ellipsis dots arrive one by one](#ellipsis-dots-arrive-one-by-one) · [Segmented tick gauge](#segmented-tick-gauge)

### Image resolves through representations

`dv-representation-cascade` · signature · energy medium · launch, feature · primitive: Cascade

An image is generated in front of the viewer: coloured dots pop into a grid with accelerating density, recolour toward the photo, then one frame of halftone, one frame of pixel mosaic, then the sharp photo; or a post image fills like a progressive render on twos (blank, a soft blob, rough shapes, final). **When:** Image generation, rendering, any "it makes the picture" beat. **Avoid:** Without a final image that rewards the wait.

- **Anatomy:** Dot fill power-in (0.6 -> 58 % coverage), recolour 6 f, final stages 1 f each; progressive stages on twos.
- **Timing:** Fill 38 f, recolour 14 f, stages 2-3 f each at 60 fps; progressive 46 f.
- **Sound:** A chat pop, a bubble pop, a cork pop on the reveal.
- **Build:** `<Cascade at src x y w h cols rows unlit palette>` (fx/Cascade): round dots pop in power-in 2.3 over 38 f up to 58 % of the cells (each 1.4x large, settling in 4 f) in seeded `palette` tints (or vivid picture colours), recolour to the picture (14 f), then one beat each of halftone, mosaic and the photo (2.4 f each); `ghost` lets the empty grid carry the picture; the grid is sampled from `src` once (useImageGrid) or passed as `grid`; `mode="progressive"` loads blank, three fixed blur levels, sharp, on twos (46 f). Start it from a QuadLoader on the grid's centre cells.
- **Materials and numbers:** The generated image grows from a speck to full width on twos while its content evolves like a diffusion render: pastel blobs (blur 12 px), then coloured clouds over dunes, then candy-coloured hills, then the final picture, each state about 6 f and sharper than the last.

### Grid loader of blocks: lit row steps, copies in phase

`dv-block-loader` · signature · energy medium · launch, feature · primitive: BlockLoader

A tiny grid of accent squares is the loader: one row lit at full strength with a dimmer trail row behind it steps down the block on drum onsets (irregular holds 7, 3, 1, 3, 1 f), the other rows step down to a faint level in four linear frames, the loader zooms in until its grid becomes the screen's grid, and tiled copies each run in their own phase so the field shimmers. **When:** Openers and loading moments in grid-based brands. **Avoid:** Smooth fades between rows.

- **Anatomy:** 4 columns, cells 22 px on a 46 px pitch at the start; lit row 100 %, trail 38 %, others 17 %; zoom expo-in.
- **Timing:** Zoom 18 f; row steps on onsets; dims 10 f in 4 steps; copies on their own 1-7 f schedules.
- **Sound:** A water-drop or sub hit at the start; row steps on kicks.
- **Build:** `<BlockLoader start x y steps={onsets} color>` (fx/Loaders): 4 x 4 accent squares (22 px on a 46 px pitch), the lit row and a 38 % trail step down on the onsets (house holds 17.5, 7.5, 2.5, 7.5, 2.5 f), the rest steps down to 17 % in four frames; tiled copies take a `seed` (own 1-7 f schedule) or a `phase`; `zoom={{ at, to }}` pushes in until its grid is the screen's. The 2 x 2 version is `<QuadLoader>` (clockwise head at 100 / 38 / 17 %, a step every 7.26 f; `tile(step)` puts a picture in the head cell).

### Loader arc grows into a ring and the core swells

`dv-loader-arc-ring` · signature · energy medium · launch, feature · primitive: ArcLoader

Inside a screen a dot becomes a short dash, then an arc that grows 30, 60, 90, 160 deg, accelerating to about 300 deg, closes into a ring, and the dot at the centre swells into the hero button. **When:** The moment between a request and the result; turning a loader into the next object. **Avoid:** A spinner that loops more than once before resolving.

- **Anatomy:** Arc length on an accelerating curve while it rotates; ring closure; core swell.
- **Timing:** Arc 0 -> 300 deg in 18 f; close + swell 10 f (30 f in all at 60 fps).
- **Sound:** The beat (+7 ms) on the first frame.
- **Build:** `<ArcLoader at r x y color core={{ to }}>{icon}</ArcLoader>` (fx/Loaders): a dot (3 f), an arc growing to 300 deg on E.buildIn while it turns 6 deg/f (15 f), closing (4 f), and the core swelling into the button on E.snapOut (8 f): 30 f in all.

### Agent step list: spinner rows that tick to checks

`dv-agent-step-list` · workhorse · energy medium · any · primitive: StepList

The product shows its work as a list of steps: each row starts with a small spinner (a dashed ring or an arc) and its words step in at partial ink, then the line fades up and the spinner turns into a check; rows cut on with a coloured verb that drains to ink as the next row arrives; the list jumps up a row (or half a row) unanimated, or pushes up in 3-frame expo steps; the cadence of rows shortens toward the end (9, 9, 7, 5, 4, 3, 3 f). **When:** AI agents, builds, workflows, any "it is doing it" moment. **Avoid:** Smooth scrolling lists (the steps should feel like software); more than about seven rows.

- **Anatomy:** Row = spinner + verb (accent tint) + grey detail + optional right icon; thin thread line on the left; status line eases down 12 px before a new row (anticipation); list jump 93-94 px in one frame.
- **Timing:** Rows every 14-50 f (shortening); spinner about 120 deg per 3 f; check swap 2-4 f; line fade 12-16 f; verb drain 4-6 f.
- **Sound:** Rows within 60 ms of wood-block or drum hits; dings on rows; a glockenspiel on the last.
- **Build:** `<StepList rows={stepCadence(start, n).map((at) => ({ at }))} labels x y width font colors>` (fx/Loaders): rows cut on with a spinner (120 deg per 3 f at 30 fps) and the verb in the accent at 45 % ink, the line fades up (14 f), the spinner swaps to a check (3 f) and the verb drains to ink as the next row arrives (6 f); the list jumps a row unanimated past `window` (or `jump="expo"`); house cadence 18, 18, 14, 10, 8, 6, 6 f. StepList for the rows; the arc icon is an SVG circle with pathLength 1 and a growing dash (0.05 -> 1 over 12 f), the check a second dashed path.
- **Materials and numbers:** Each step's icon draws itself: a short arc grows clockwise to about 270 deg and closes into a circle (12 f), the check draws in 4 f; icon 16 px, stroke 1.5 px in the row's current colour; the row text walks through a short hue path to ink as it completes (28-44 f), or each verb takes its own pastel tint and slides in 10 px over 16 f before cooling to white; a 2 px guide line pre-draws down the left 12 f before the first row; pending steps stay a dashed ring of 8 dashes.

### A shine passes through text while it loads

`dv-loading-shimmer` · workhorse · energy calm · any · primitive: TypeFill / LightSweep

A soft band (about one word wide) sweeps left to right across a status line on every beat, turning the letters it covers white; a single word glows and returns to grey; skeleton cards pulse a diagonal shine twice; a textured shimmer passes over a filled prompt box before the press; an idle slider label shimmers letter by letter. **When:** Loading states; an idle call to action. **Avoid:** Shimmer on headlines; glow halos.

- **Anatomy:** Band 150 px moving about 86 px/f near-linearly, then a rest; period = one beat (40 f, 90 BPM).
- **Timing:** Sweep 20-26 f; rest 18 f; pulses 22 + 20 f.
- **Sound:** The beat grid exactly.
- **Build:** `<TypeFill mode="shimmer" text period={40} width={6} feather={2.5} band={white} color={grey}>` (fx/TypeFill); on a light UI pass a darker band and a 16-20 f period; `<LightSweep>` for shines across skeleton cards.
- **Materials and numbers:** Anatomy of a type shimmer: the text is clipped to a gradient three times its width whose position slides one width per period. On a dark or tinted ground the band is white, about one word (5-7 letters) wide with 2.5 letters of feather each side, travelling about 0.7 letters/f and restarting at once (period about 40 f), with a slight bloom on the white letters. On a light UI invert it: a band darker than the grey base, about 40 % of the word wide, period 16-20 f; a dim band on near-white letters reads as a skeleton loader on type. Include the ellipsis in the sweep.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Thinking indicator: icon, label and pulsing dots

`dv-thinking-indicator` · workhorse · energy calm · any · primitive: ThinkingDots

A small status line says the product is working: an icon (a sparkle, a ring of circles, a face bubble), a word ("Thinking", "Searching") and three dots that pulse in turn (each darkening and growing about 1.4x, the wave passing left to right), sometimes with a token count. **When:** Every wait in a product demo. **Avoid:** Long waits (cut away after about one cycle).

- **Anatomy:** Dot wave: each dot up 20 f + down 20 f, stagger 25 f at 60 fps (or a 12 f cycle); icon rises 14 f circ-out.
- **Timing:** Cycle 24-60 f.
- **Sound:** None, or a soft tick per cycle.
- **Build:** `<ThinkingDots start size color>` (fx/MicroUI) beside the icon and label: three dots darken and grow 1.4x in turn (20 f up, 20 f down, 25 f apart); `ellipsis` brings them on one by one first.
- **Materials and numbers:** The assistant icon is a line drawing of a brilliant-cut gem (outer circle, eight kite facets, an octagon table) stroked with a vertical three-hue gradient, still, the only multi-hue element on a dark panel.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Bubble charges with colour, then snaps wide

`dv-charge-and-snap` · accent · energy medium · launch, feature · primitive: MorphChain

A typing pill fills with the accent on an expo-in while its dots fade and its width creeps, then snaps wide in one frame into a bar that eases to its final width. **When:** The answer arriving after a typing indicator. **Avoid:** Snapping without the charge.

- **Anatomy:** Fill expo-in 28 f; width creep 185 -> 223 px; snap to 466 px in 1 f; ease 13 f.
- **Timing:** 44 f in all.
- **Sound:** None needed; a soft hit on the snap.
- **Build:** MorphChain with a one-frame CHAIN_STEP after a fill window.

### Progress line builds with counter-motion

`dv-progress-line-build` · accent · energy calm · any · primitive: recipe (plain layers)

A dash becomes a line whose left end races left while the right end creeps; a short dash slides against the build direction under the bar; a coloured band scrolls once along the line. **When:** Progress, search bars forming, a line that becomes a field. **Avoid:** A second multi-hue band in the same film.

- **Anatomy:** Width 42 -> 262 px cubic-out (peak 32 px/f at 20 %); counter-dash 13 -> 6 px/f.
- **Timing:** 33-42 f.
- **Sound:** With the bar.
- **Build:** Recipe: rect ends animated separately (left on E.snapOut, right slow); the counter dash a second rect.
- **Materials and numbers:** A stepper advances as a 3D cursor passes under it: the next node goes from an empty ring (2 px, about 22 px) to a ring with a filled centre dot that scales in over 8 f, and the button dims to a pale tint over 16 f.

### Status labels swap faster and faster

`dv-status-label-swaps` · accent · energy medium · any · primitive: TypeOn

A status label fast-types (3-4 characters a frame), then swaps to the next; phrases change at shrinking intervals (15, 12, 18, 15, then 3, 3, 3, 3 f) before the cut, with giant cropped numbers beside them swapping too. **When:** Showing a process speeding to completion. **Avoid:** Text the viewer must read.

- **Anatomy:** TypeOn stream per label; HardStep swaps; intervals shrinking.
- **Timing:** Labels 16 f each; final swaps 6 f apart at 60 fps.
- **Sound:** A cut at the end.
- **Build:** TypeOn kind="stream" per label with starts from an ACCEL list.

### Brand mark rises alone and spins as the loader

`dv-mark-spin-loader` · accent · energy medium · launch, feature · primitive: Flip3D spin

On black, the brand mark rises into place alone, sits for 5 frames, then words append beside it and the mark spins on its vertical axis as the loader. **When:** Product moments where the brand is the system. **Avoid:** Spinning the wordmark.

- **Anatomy:** Rise 123 px in 8 f; rotateY spin about 26 f per turn.
- **Timing:** Rise 8 f; spin 26 f/turn.
- **Sound:** A riser.
- **Build:** `<Flip3D angle={spinAngle(f, start)} front={mark}>` (fx/Flip): the mark turns on its vertical axis, a turn every 26 f, its back face hidden; Words appends the name beside it.

### Corner handles turn on one after another: a loading chase

`dv-corner-chase-loader` · accent · energy medium · launch, feature · primitive: Corners

The four corner handles of a selection turn dark in sequence (TL, then TR and BL, then BR) and back: a six-frame loading chase built from the frame itself. **When:** A selection or a card processing. **Avoid:** Long chases (one or two cycles).

- **Anatomy:** 2-3 f per corner; colour swap only.
- **Timing:** 15 f at 60 fps per cycle.
- **Sound:** None needed.
- **Build:** `<Corners chase={{ at, color }}>` (fx/Corners): the corners turn dark TL, then TR and BL, then BR and back, a step every 2.5 f (15 f a cycle; `cycles` to repeat).

### Ellipsis dots arrive one by one

`dv-ellipsis-dots-arrive` · accent · energy calm · any · primitive: ThinkingDots

The "..." after a status word arrives as three separate dots, accelerating (14 f, then 6-8 f gaps); a placeholder gains its dots one at a time while a more-button's dots resolve. **When:** Status lines and placeholders. **Avoid:** All three at once.

- **Anatomy:** Dots cut on with shrinking gaps.
- **Timing:** 22-24 f for three dots.
- **Sound:** None.
- **Build:** `<ThinkingDots ellipsis start>` (fx/MicroUI): the dots cut on 14 f, then 7 f apart (22 f for three), then pulse; or HardStep visibility per dot.

### Segmented tick gauge

`dv-tick-gauge` · accent · energy calm · any · primitive: TickGauge

Under a small label, a gauge of about 32 thin vertical ticks (3 px wide, 25 px tall) shows a value: most dark, the rest light. **When:** A percentage that should read at a glance. **Avoid:** Animating every tick at once (fill left to right if it moves).

- **Anatomy:** Ticks with 2-3 px gaps; filled share = the value.
- **Timing:** Static, or a fill of 1 tick a frame.
- **Sound:** None.
- **Build:** `<TickGauge value on off>` (fx/MicroUI): 32 ticks 3 px wide, 25 px tall, 3 px gaps; with `at` (and `from`) it fills one tick a frame.
