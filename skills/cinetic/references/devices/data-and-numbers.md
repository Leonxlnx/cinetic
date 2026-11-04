# Data and numbers

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Numbers that count like software and charts that build from cells and lines, with one number landing as the payoff.

[Chart built from tiny cells that fill](#chart-built-from-tiny-cells-that-fill) · [A ring of dots orbits a falling counter and contracts](#a-ring-of-dots-orbits-a-falling-counter-and-contracts) · [Node graph draws its links](#node-graph-draws-its-links) · [Counters run linear and are cut mid-count](#counters-run-linear-and-are-cut-mid-count) · [Result card pops and fills in sequence](#result-card-pops-and-fills-in-sequence) · [Digits roll or resolve into place](#digits-roll-or-resolve-into-place) · [Line chart draws with the voice](#line-chart-draws-with-the-voice) · [Big statistic lands oversized with tiny labels](#big-statistic-lands-oversized-with-tiny-labels) · [Small data glyphs inside cards](#small-data-glyphs-inside-cards) · [Counter lands in decelerating steps](#counter-lands-in-decelerating-steps) · [Word wheel advances like a picker](#word-wheel-advances-like-a-picker) · [Spec drawing with breathing dimension bars](#spec-drawing-with-breathing-dimension-bars) · [Tag the chosen data, wash out the rest](#tag-the-chosen-data-wash-out-the-rest) · [One full-spectrum object in a one-hue film](#one-full-spectrum-object-in-a-one-hue-film) · [Count grows geometrically, then jumps to the total](#count-grows-geometrically-then-jumps-to-the-total) · [A row of dots rides a wave in stop-go pulses](#a-row-of-dots-rides-a-wave-in-stop-go-pulses) · [Small bevelled metal numerals for rank](#small-bevelled-metal-numerals-for-rank)

### Chart built from tiny cells that fill

`dv-cell-chart-fill` · signature · energy medium · launch, feature · primitive: CellChart

A bar chart made of small rounded squares (about 22 px with 4 px gaps): the first column fills from pale to full, the grey grid fades in, then the cells fill in column bursts (about one column a frame) while a cut to a wider framing keeps filling; a hexagon map of dots fills with coloured dots, scattered then dense, in sync with a counter, then snaps grey. **When:** Any metric that grows; the payoff number of a product film. **Avoid:** Smooth bars next to it; more than one colour per series.

- **Anatomy:** Cells on a grid; fill order by column (bursts) or scattered-then-dense; the accent area grows about 40x in 8 f; a button can shrink into the first cell.
- **Timing:** First column 14 f; grid fade 12 f; bursts 16 f; scattered fill 60 f with the counter; desaturate 8 f.
- **Sound:** Pops and ticks on the bursts.
- **Build:** `<CellChart at cols rows values color empty>` (fx/Charts): 22 px cells with 4 px gaps; `order="column"`: the first column fills pale to full (14 f), the empty grid fades in (12 f), then one column bursts on every 2 f; `order="scatter"` fills seeded cells sparse then dense (60 f, E.buildIn) with cellChartCount() driving the counter; `desat={{ at }}` snaps the fill grey (8 f); `mask` shapes the grid (a hexagon map).

### A ring of dots orbits a falling counter and contracts

`dv-orbit-ring-counter` · signature · energy medium · launch, feature · primitive: OrbitRing + Roll

Dots on a tilted ring (sized by depth, white ones outlined) rotate around a small counter that rolls down; the ring contracts and collapses into the counter. **When:** A total that gathers many parts. **Avoid:** Busy rings with labels.

- **Anatomy:** Dots 55-85 px by depth; contraction 90 f; collapse 12 f circ-in.
- **Timing:** Counter 60 f; contraction 90 f; collapse 12 f.
- **Sound:** None needed.
- **Build:** `<OrbitRing r={contracting radius} tilt={60} depth={[0.65, 1]} hero={`<Roll>`}>` (fx/Orbit, fx/Roll): dots sized by depth orbit the rolling counter; shrink r over 90 f, then collapse 12 f on E.buildIn.
- **Materials and numbers:** The ring is a tilted perspective orbit of black and white dots: near dots big and soft (up to 44 px, blur 3-5 px), far dots small and sharp (16 px); it shrinks 40 % while orbiting, then in the last 8 f the dots crowd into a clump that becomes a button arriving with a horizontal smear (20 px, then 8, then sharp).

### Node graph draws its links

`dv-node-graph` · workhorse · energy medium · launch, feature · primitive: Stepped.strokeDrawn

Relations drawn as a graph: right-angled connector lines draw from thumbnails (with small chips) while a table goes from skeleton bars to rows; scattered nodes fade in, spokes draw out from a hub, then the nodes morph into an even fan row on an over-damped spring; video thumbnails connected by thin lines sit around a title and ride the whip pans; selected thumbnails pop back to colour one by one as the cursor clicks and dashed links with small labels draw between them. **When:** Integrations, knowledge graphs, connected data, workflows. **Avoid:** Graphs with more than about 12 nodes on screen.

- **Anatomy:** Links drawn at pen speed; nodes about 10-60 px; spokes in 12 f; morph about 32 f over-damped.
- **Timing:** Links 28-50 f; nodes 13 f each; morph 32 f.
- **Sound:** Onsets on the links; a ding on the last.
- **Build:** SVG paths with strokeDrawn(); node positions blended between two layouts (scatter, row) on an over-damped curve.

### Counters run linear and are cut mid-count

`dv-linear-counters` · workhorse · energy medium · any · primitive: Roll

Several counters climb linearly at different rates (687, 241, 48 a second), never landing, and the shot cuts while they still count; a count chip ticks up inside a pill; a KPI steps every 3 frames inside a scrolling column of cards. **When:** Live data, savings, usage. **Avoid:** Counters that ease to a stop (save that for the one payoff number).

- **Anatomy:** Rates in ratios like 14 : 5 : 1; stepped on a source cadence if needed.
- **Timing:** 18-100 f.
- **Sound:** A notification ding; a heavy thud on the chip.
- **Build:** countLinear({ perSec }) + Roll (hard digits).

### Result card pops and fills in sequence

`dv-result-card-assemble` · workhorse · energy calm · any · primitive: Cards

A result card pops in one frame, its price types in digit by digit in grey, then its actions and sources follow a few frames later. **When:** The product's output (a quote, a report, an answer). **Avoid:** Everything inside the card arriving at once.

- **Anatomy:** Card 1 f; price 1 char per 1-2 f; icons 2 f; sources +4 f.
- **Timing:** 22 f.
- **Sound:** A chat pop.
- **Build:** Cards pop + TypeOn for the price + kit parts with starts.

### Digits roll or resolve into place

`dv-rolling-digits` · workhorse · energy medium · any · primitive: Roll

Huge numbers cropped by the edge roll down into place with a fast decay, up to three rows stacking; a thin big score resolves digit by digit behind a leading dash, its label following. **When:** Big numbers, scores, amounts. **Avoid:** Digits rolling at different speeds without reason.

- **Anatomy:** Roll 12 f expo-out per swap; digit-by-digit resolve over 32 f.
- **Timing:** 12-34 f.
- **Sound:** A glockenspiel.
- **Build:** `<Roll>` (rolling) or Roll hard with a per-digit start.

### Line chart draws with the voice

`dv-line-chart-draw` · workhorse · energy calm · any · primitive: kit

A line chart extends one segment per spoken word, with dots at vertices and faint drop lines; three thin curves converge at a node and continue as one line drawing right on a very long expo-out under a roaming light. **When:** Growth, convergence, a trend behind a statement. **Avoid:** Glow on the line in house films.

- **Anatomy:** Segment per word (4-8 f); single line 50 % drawn in 10 % of 120 f.
- **Timing:** 4-8 f per segment; 120 f draw.
- **Sound:** Voice words.
- **Build:** kit Sparkline with draw = segments shown; the long draw on E.snapOut.
- **Materials and numbers:** Dark-mode chart construction: a smooth spline line 3 px in the accent with a glow copy (8 px blur at 50 %), the area under it a vertical gradient from the accent at 70 % to transparent, every vertex a bright 12 px dot with a lighter core and a 1 px hairline drop to the baseline at 40 %; ground black fading to a deep tint at the bottom.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Big statistic lands oversized with tiny labels

`dv-big-stat-landing` · workhorse · energy medium · any · primitive: Oversize

A huge stat (216-256 px tall) appears at 118 % and settles to size, with small labels above and below ("over", "views"). **When:** The headline number of a film. **Avoid:** Labels as large as the number.

- **Anatomy:** Scale 1.185 -> 1 quad-out; labels at the ui role.
- **Timing:** 38 f.
- **Sound:** None needed; or a hit.
- **Build:** Oversize from 1.18 + Words labels.

### Small data glyphs inside cards

`dv-micro-data-viz` · workhorse · energy calm · any · primitive: kit

Cards carry tiny data visualisations: a dotted world map with one accent square at the location, a row of dots as a level meter, three small colour chips with counts as a status panel. **When:** Profiles, dashboards, rows of results. **Avoid:** Unreadable micro text.

- **Anatomy:** Dots about 6 px; one accent element per glyph.
- **Timing:** Appear with their rows.
- **Sound:** None.
- **Build:** kit parts (Meter, Badge) and small SVG dot maps.

### Counter lands in decelerating steps

`dv-stepped-tail-counter` · workhorse · energy medium · any · primitive: Roll

A big number counts one unit a frame, then one every 2 frames, then every 3, landing exactly as the scroll settles. **When:** The payoff number. **Avoid:** Easing the digits smoothly.

- **Anatomy:** Step durations 2, 2, 2, 2, 2, 4, 6 f.
- **Timing:** 20 f at 60 fps.
- **Sound:** A stab or an impact on the landing.
- **Build:** steppedTail(to, end) from Roll.
- **Materials and numbers:** With proportional digits and a fixed suffix the gap breathes (a narrow one opens a visible gap); use tabular figures or place the suffix after the measured digits every frame.

### Word wheel advances like a picker

`dv-picker-wheel` · accent · energy medium · launch, feature · primitive: GhostReel

An inline chip rolls like a drum picker through options (neighbours above and below faded and blurred); a vertical list in a card advances one row every 4 frames with hard jumps through formats. **When:** Options, formats, apps that the product supports. **Avoid:** More than about 12 options.

- **Anatomy:** Pitch about 56-120 px; neighbours 30-50 % and blurred; exit quad-in, settle cubic-out; hard jumps at 6 Hz.
- **Timing:** 48 f per roll; jumps every 10 f at 60 fps.
- **Sound:** Ticks on percussion onsets.
- **Build:** `<GhostReel mode="step" swaps={every 10 f}>` (fx/Reels) for the hard-jumping card list; the default mode rolls like a drum picker (26 f exit, 16 f settle) with the neighbours softened above and below.

### Spec drawing with breathing dimension bars

`dv-blueprint-dimensions` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

A construction drawing (hairline guides, a dashed centre line, a hatched shape, circles with anchor handles, ratio labels like "x" and "0.5x") where only the dimension bars move: they contract, hold 4 frames and expand back, opposing bars in counter-phase. **When:** Brand or product construction; precision claims. **Avoid:** Labels that are fake numbers.

- **Anatomy:** Hairlines 1 px; bars contract 124 px in-out, hold 4 f, expand with a long tail.
- **Timing:** 54 f per breath; 76 f in counter-phase.
- **Sound:** A kick on the drawing's arrival.
- **Build:** Recipe: static SVG drawing; bars as rects with an in-out width tween.

### Tag the chosen data, wash out the rest

`dv-tag-and-wash` · accent · energy calm · launch, feature · primitive: Develop

A grid of thumbnails switches to a warm duotone in a few frames, column labels fade in, tag pills grow on the chosen items and the untagged items wash out. **When:** Filtering, classification, search results. **Avoid:** Tagging too many items.

- **Anatomy:** Tint 15 f; labels 6-10 f apart; pills 18 f each; washout 35 f.
- **Timing:** 160 f in all.
- **Sound:** None needed.
- **Build:** Develop reversed (colour to tint) for the untagged items; pill-label-build for the tags.

### One full-spectrum object in a one-hue film

`dv-spectral-accent-object` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

In an otherwise one-hue film one small object runs through the whole hue wheel: a pie of about 24 thin wedges with hairline separators, or a tiny concentric target icon. It is the only multi-hue thing on screen, so it reads as data or as a signal, never as decoration. **When:** A dashboard widget, a category chart or an icon that must stand out; the film's one spectral accent. **Avoid:** Any other multi-hue element in the same film.

- **Anatomy:** Pie: a wedge every 15 deg round the wheel, 1 px separators at 20 % white, about 320 px across. Target: four near-hard rings with a 1-2 px blend. Entry: one frame at 1.15x and 1.3 brightness, then rest.
- **Timing:** Cuts on in one frame with its widget; holds.
- **Sound:** None.
- **Build:** Recipe: a CSS conic gradient with hard stops (pie) or a radial gradient with hard stops (target); hard stops do not band.
- **Materials and numbers:** Wheel order cyan, azure, blue, violet, magenta, pink, red, orange, amber, yellow, green, teal.
- **Conditions:** the film's one spectral accent.

### Count grows geometrically, then jumps to the total

`dv-exponential-count` · accent · energy medium · launch, feature · primitive: Roll

A small header chip counts in quarter-second steps that grow x1.6-1.9 each (23, 43, 72, 125, 201, 360, 661), then jumps straight to the total (3,412). **When:** "Reading N items" moments; scale reveals. **Avoid:** Linear counting for big totals.

- **Anatomy:** Steps every 15 f; the final jump on a beat.
- **Timing:** 200 f.
- **Sound:** Under the scroll.
- **Build:** Roll with explicit steps (a geometric list, then the total).

### A row of dots rides a wave in stop-go pulses

`dv-dot-wave` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

A row of dots (larger in the troughs, a few hollow rings) rides a sine wave that travels right in pulses: moves, stops, moves. **When:** Signal, activity, rhythm. **Avoid:** Continuous motion (the stops are the look).

- **Anatomy:** Pulses 60 f with 12 f holds at 7-10 px/f.
- **Timing:** 60 f per pulse.
- **Sound:** None.
- **Build:** Recipe: dot y = A sin(kx - phase(f)), phase stepping by pulses.

### Small bevelled metal numerals for rank

`dv-metal-numerals` · accent · energy calm · feature · primitive: TypeFill

Rank numbers beside list rows are tiny bevelled metal glyphs (the first gold, the second silver, the third bronze) while lower ranks stay plain grey. **When:** Leaderboards and rankings inside UI; one list. **Avoid:** Big display numbers.

- **Anatomy:** A vertical four-stop gradient with a dark middle band (the classic chrome) clipped to the glyph, plus a 1 px bright top-edge shadow.
- **Timing:** Static; scrolls with the list.
- **Sound:** None.
- **Build:** `<TypeFill mode="fill" grow={0} vertical glow="none" text stops={[light, mid, dark, light]}>` (fx/TypeFill): a dithered four-stop vertical plate behind the glyphs, static; gold, silver and bronze stops for the first three ranks only.
- **Ban-safe default:** Silver only for the first rank, plain grey below. (the full look relies on orange; use it only when the brand supplies it)
