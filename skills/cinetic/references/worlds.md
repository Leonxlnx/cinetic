# Worlds: the graphic languages a film can live in

A film lives in **one world**: one ground system, one palette, one type pairing, one family of materials, one motion
character and a small set of signature devices. Switching worlds mid-film is the fastest way to look generated, unless
the concept is two worlds (before and after) or a montage: then each world is complete (its own ground, light and
grade) and the type voice stays the same across all of them. A world may have two or three grounds, but a film changes
ground only when its story changes place or state, the whole frame at once ([joins](film-grammar.md#joins)); a film
may stay on one ground.

Each world below lists: when it fits, ground (and how it is lit), palette rules, type, materials, motion character, signature devices (with
links to recipes), the effect budget, the kit pieces that build it, and what to avoid. A film takes one of its world's
signature devices as its own and repeats it; the others may appear once each (`film-grammar.md` devices).

## Palette rules (all worlds)

1. **If the product has a brand, derive everything from it**: its accent, its neutrals, its face. Read the real values from
   the live site or the press kit; a slightly wrong shade is noticeable.
2. **For an invented brand: no purple, no violet, no green, and no default "AI" gradient** (purple-to-blue, rainbow, neon on
   near-black). Take the one accent's hue from the product's own object or domain: name three candidate
   objects with their hues in `BRIEF.md`, then pick the one this product alone could own (a blueprint's blue, a pool's
   cyan, a buoy's orange, a highlighter's yellow, a darkroom's red, a peony's pink, sealing wax, honey, terracotta,
   sand, graphite). No hue family is the safe pick: orange on cream, cobalt on cool white and wine red on white are the
   three commonest looks and need the strongest reason. A film may also carry no accent at all: ink, white and one
   grey. Then two neutrals and at most one secondary.
3. **Neutral grounds by default.** The light ground is neutral or cool white (#FFFFFF to #F4F5F7); cream and warm paper
   only for paper and print products. The dark ground is a deep tone of the accent's own hue (navy for a blue, a deep
   teal for a cyan, an oxblood for a red), not warm black or brown.
4. **One accent, used only for meaning** (the newest word, the selected item, the live state, the mark), on about a
   tenth of the frame or less. Never on punctuation; at most one emphasised word or phrase a statement. An object never
   turns the accent without a reason the viewer sees (it was selected, it went live). If the accent is everywhere, it
   means nothing.
5. **Gradients carry light or meaning, never decoration**: a colour ramp that encodes a state, the light on a 3D
   object, one gradient token reused by every beam, a bold designed sweep of a brand's own colour. Never a faint gradient
   as a ground (a pale gradient field, a dark ground with a soft bloom), never a saturated swirl of distant hues, never a
   gradient "because it looks nice".
6. **Dark grounds are never pure black** while content is visible (#08090C-#141414 or a deep tone of the accent), and
   flat: the light belongs to the objects in the scene, not to a soft bloom on the ground.
7. Real third-party logos keep their own colours (or their sanctioned mono version) inside the world's UI.
8. **Clean grounds.** A ground is a flat clean colour (`<Ground>` is flat by default), a real picture (a licensed
   photograph or footage plate), or a bold designed scene (a lit 3D stage, a full brand field, the product's own
   surface). Never a faint gradient field, never a dark ground with a soft bloom, no vignette, no dark corners, no
   visible grain on a flat ground; the film's one texture family (grain on photographs, halftone, dither, a lens) lives
   on pictures and in joins ([effects](motion/effects.md)). `<Ground light>` is opt-in, for a 3D stage whose object needs
   a floor of light. Each world's **Ground** line below says what its grounds are. Never dimmed or blurred UI used as a
   ground. A line may be a hairline when it
   is structure (construction lines, circles, a curve to a label); a line that is the subject carries a filled object
   riding it, not a glow.

**Light and material (all worlds).** One light direction for the whole film: every shadow falls the same way, soft and
layered (`softShadow`: several shadows with offsets and blurs doubling, each faint, tinted to the ground). Cards and
objects sit in that light with a contact shadow, or on a clean flat rule in flat worlds. 3D is soft-lit, rounded and matte
or frosted (`softStudio` for `GLView`, `Box` with `bevel` and `material`), never flat unlit boxes or chrome lit by hard
strips. Glow and glass at most once a shot, and only on the accent, and light that is timed. Depth of field blurs shapes
(`Defocus`: cards, icons, photographs, objects), never text. Depth comes from layers of real things (a photograph behind
the UI, the product's surfaces, secondary elements that react), one light direction, soft layered shadows, depth of
field on shapes and scale jumps (a giant word cut to a small one, a dive). Every beat has two planes moving at different
rates; the second is a picture, a layer of the product or a reacting element.
White or frosted cards on a coloured ground are fine.

Kit fonts (`fonts`): `inter` (the default voice for statements and UI, with optical sizing), `geist` (a tighter
technical sans for a developer brand, then the whole voice), `serif` (Newsreader: only for a brand whose voice is a serif,
then every statement, or a serif wordmark), `mono` (Geist Mono: code and data inside UI or a terminal, never a statement,
never uppercase labels), `hand` (Caveat: a sketch inside a product only). A brand's own face replaces the statement face
when provided. Every world sets its words by [type.md](type.md): sentence case, statements at 430-550 sized by word
count, one spectacle size, labels in the UI face; the **Type** lines below give each world's face and character.

---

## 1. Block grid

**Fits:** infrastructure, developer platforms, data and security products: anything that is a "system".
**Ground:** colour fields, each place in the story owning one colour; a ground may carry a crisp 1 px grid (6-10 % contrast; e.g. 80 px
pitch), sometimes a coarser second grid of section lines. White, a deep tone of the accent and the accent alternate as
grounds, each flat; the blocks carry the light.
**Palette:** a deep ink #0E1420 / white #F4F5F7 as the two main grounds; one accent (e.g. signal blue #2F5BFF, or a
signal red #FF3B30) as the "live" colour and, when the story arrives somewhere new, a full-frame ground; 1-2 quiet secondaries for the hub
objects (e.g. pale grey #DADDE3, sky #CFE0FF); spot red for alerts only. No gradients except one light beam and each
object's own light.
**Type:** one neo-grotesk (`inter`, or `geist` for a developer brand, 450-550, tracking by size), sentence case, printed
on floors and block faces or centred; object names on white chips with a small coloured square bullet, sentence case in
the same face at tracking 0 (40 px or more when the viewer must read them, 20-28 px as texture); `mono` only for code and
data inside a terminal or on a block's face.
**Materials:** isometric blocks with a small bevel, a top-lit face gradient (top lightest, left mid, right darkest) and a
soft contact shadow (`Box bevel material="matte"`), in an orderly grid with air round the cluster; slabs, cubes, voxels;
hairline connectors with travelling dots; halftone patches as texture.
**Motion character:** two clocks. Digital things (mosaics, cell growth, voxels, the mark) step on twos/threes with no easing;
the camera eases smoothly. Orthographic for system diagrams, perspective for emotional beats.
**Signature devices:** cell bloom into a dive (`turns.md` 4.4); type printed on tilted floors and on object faces (`text.md`
6.1-6.2); hub and dive chapters (`turns.md` 10); tile flood between grounds (`turns.md` 4.2); cipher decode on labels and the
URL (`text.md` 5.1); cells growing by notched steps; corner collapse; UI shown flat, big, one component at a time with state
changes and no cursor; selection boxes with corner handles; a mosaic bookend.
**Effects:** none. One 3-frame glow in the whole film at most. No grain, no blur, no vignette.
**Kit:** `Ground`, `GridLines`, `Box`, `shade`, `Camera` (iso: huge perspective), `At`, `Words`, `Scramble`, `Row`, `Chip`,
`Terminal`, `Tiles`.

```tsx
<Ground color="#F4F5F7">
  <GridLines size={80} color="rgba(0,0,0,.08)" />
  <Camera perspective={20000} cam={{ rx: 54.7, rz: -45 }}>
    <At x={820} y={540}><Box w={200} d={200} h={70} color="#FFFFFF" bevel={6} material="matte" topContent={<Label>Index 1</Label>} /></At>
    <At x={1100} y={540}><Box w={200} d={200} h={140} color="#2F5BFF" bevel={6} material="matte" /></At>
  </Camera>
</Ground>
```
**Avoid:** flat unlit boxes, a random scatter of blocks cropping every edge, glows, glass, labels on faces under 40 px.

---

## 2. Editorial paper

**Fits:** image, design, publishing, creative tools; products whose output is pictures or pages.
**Ground:** clean white (#FFFFFF) or, for a print or paper product, an off-white paper (#F2F1EE), flat, no grain and no
darkened edges, sometimes a 1 px grey graph grid (120 px pitch); full-bleed
photographs as the alternate ground.
**Palette:** paper, near-black ink #0D0D0D, white type on pictures; **one accent saved for the tool grammar** (handles, corner
squares, the brand tile): e.g. vermilion #E4472B or ultramarine #2A3FD6. The pictures carry all other colour.
**Type:** statements in one sans (`inter` 430-500), centred, sentence case. When the brand's own voice is a serif (a
publisher, a magazine), that serif sets every statement instead: `serif` (Newsreader) 400-600 or the brand's licensed
serif, tracking 0 to -0.01 em, never mixed with sans statements. Large and confident, no shadows, no outlines, no glow;
optional letterpress speckle on a serif; `inter` for UI and for labels, sentence case.
**Materials:** bare picture cards (no radius, border or shadow) on a grid; cut-outs used for layer order; print mock-ups.
**Motion character:** graphics on a **stepped clock** (on twos, 15 fps) with hard expo-out steps, nothing fades, scale changes
are cuts; photographs and footage on every frame; hard cuts every 9-30 f; slow pushes as breaths.
**Signature devices:** tracking snap with corner markers (`text.md`); orthogonal-step grid with tint develop (`imagery.md` 2.1,
3.1); glyph reroll and font cycle for names; staircase settle over a picture montage; type hides the swap; canvas return
(`turns.md` 8.5); letters as windows; outpaint window; selection handles that blink, stretch and converge into the mark;
before/after by cut on one picture; the artefact in the world (pull-backs on print and screens).
**Effects:** grain on photographs only, never on the paper; a texture montage once if the claim needs it. No glow, no motion blur.
**Kit:** `Ground`, `GridLines`, `Photo`, `Words` (cut/rise), `Scramble`, `Camera`, `CornerMarks`; stepped clock `Math.floor(frame / 2) * 2`.

```tsx
const fe = Math.floor(frame / 2) * 2;     // graphics on twos
<Ground color="#FFFFFF">
  <GridLines size={120} color="#DADDE3" />
  <Photo src="img/still-04.jpg" x={keys(fe, [[0, 1500], [4, 1380], [12, 1380], [16, 1260]], ease.snap)} y={300} w={360} h={450} />
</Ground>
```
**Avoid:** rounded shadowed photo cards, glass, gradients in UI, tweens on graphics, a different grade per feature.

---

## 3. Paper collage

**Fits:** brand identities, creative and "idea" products, manifestos; when the film should feel handmade.
**Ground:** white or cream paper with its real fibre, flat; a flat deep tone of the accent for the mark; photographic
layers torn over each other.
**Palette:** white #FFFFFF (cream #F8F1E6 only for a paper or print product), ink #16181C, one accent (e.g. ultramarine
#2A3FD6 or vermilion #E4412B); all imagery through **one**
gradient-map grade derived from the palette (`imagery.md` 1).
**Type:** one voice for every statement: `inter` 430-550, or, when the brand's voice is a serif, that serif (`serif`
400-600) and never both; sentence case, no caps lines. Resting lines stay modest next to the pieces (84-100 px for a
5-6 word line), with one giant word as the spectacle; the cream label strip carries one sentence-case line in the same
face.
**Materials:** cut-out engravings recoloured into the palette, one 3D render, torn paper with white fibre fringes, a cream label
strip, frosted glass for the one UI moment.
**Motion character:** **mixed clocks**: pieces on 6 fps steps (hold 5 f), sprites on 2-3 f per cel, a smooth camera on every
frame; pieces cut on, never slide.
**Signature devices:** paper build (`imagery.md` 4.1); torn steps with text on each layer (`turns.md` 9); develop from white;
edge dots; pixel bridge if the mark has pixel heritage; glyph-append wordmark with re-centring by cuts; orbit tiles with bloom
ends; card flip swap for stationery.
**Effects:** grain on photos only; flat grounds; glow only on the end card, if at all.
**Kit:** `Photo`, `Words` (cut), `Camera`, `Pixelate`, stop-motion clock, `Grain` scoped to photos.
**Avoid:** drop shadows on pieces, smooth slides of paper, a different grade per picture.

---

## 4. Soft air

**Fits:** personal assistants, consumer AI, calm productivity, wellbeing; products that should feel light and kind.
**Ground:** licensed daylight photographs (sky, rooms, people at ease) graded pale, with the UI over them, and a flat
pale ground (#F4F6F8) between them; never a blurred-blob sky field.
**Palette:** sky, white, charcoal ink #2B2F33, **one accent that is born light and deepens** (e.g. a clear blue #2F7BF6
born at #A9CBFB, or a rose #E8576F born at #F6B5C0), one cool secondary (a pale sky blue) used sparingly.
**Type:** one soft neo-grotesk for everything (`inter` 450-500 statements, 400 UI) in the ink, centred; accent words
born light; resting lines at the low end of their size range.
**Materials:** white pills, bubbles and cards with very soft layered blue-grey shadows (`softShadow`); white glass tiles
with a 1 px rim (one a shot); matte clay or soft CG objects under `softStudio`, with shallow depth of field
(`Defocus`); no device chrome.
**Motion character:** few cuts (6-10 in 35 s), one continuous camera through morphs; cut-on words with rising second lines;
ease-out arrivals with no overshoot; depth of field as recency.
**Signature devices:** cut-on stack; occluder crane; orbit with per-object focus; bottom-anchored chat with recency blur;
thinking-to-answer morph; caret-follow camera; button-to-window; iris under the UI; type fly-through; mark drawn during its own
entrance. A recurring shape (the circle) as the through-line.
**Effects:** depth of field, one click glow bloom, one rim light; motion blur on fast moves only. No grain, no vignette.
**Kit:** `Photo`, `Ground`, `Card`, `Bubble`, `Thinking`, `InputBar`, `Cursor`, `Words`, `Typing`, `Camera`, the library's UI
pieces, `lightUI` with the brand accent.

```tsx
<Photo src="img/morning-room.jpg" grade={{ dark: '#2B2F33', light: '#F4F6F8' }} zoom={1.04} />
```
**Avoid:** phone mocks, blurred-blob or gradient fields, dark gradients, neon, glass with heavy blur, many cuts.

---

## 5. Dark stage, shaped light and glass

**Fits:** brand films for platforms and tools that want spectacle; launches of a "flagship"; wordless films with a voice-over.
**Ground:** a flat deep tone of the brand's hue (a navy #0A1226 for a blue brand, never #000); the light is the hero's
own (shaped beams, the object's glow, a lit floor under it in a 3D stage), never a soft bloom on the ground.
**Palette:** one **gradient token** (three neighbouring hues from the brand, e.g. cobalt #2F5BFF -> sky #7FB2FF -> ice
#E3F0FF, or red #FF3B30 -> coral #FF7A66 -> blush #FFE1DA) reused in every beam, bar and glow; white for light cores; the
dark ground. For invented brands avoid the magenta-violet "synthwave" family entirely.
**Type:** almost none on screen: the one word or the wordmark in `inter` or `geist` 600-700, sentence case; any other
line at 430-550. Restraint is the point after the spectacle.
**Materials:** one hero object, soft-lit (`softStudio`), smooth and rounded, matte or frosted glass (per-face tints, a
fresnel rim, interior light, frost-to-clear states), with a real contact shadow; additive shaped light (pillars,
hard-edged cones, arcs that thin with distance); no faceted chrome, no wireframe edges.
**Motion character:** one continuous flight; few hard cuts, each on motion; pull-backs establish, accelerating pushes leave;
light timed as events (a charge, a dock, a beam opening).
**Signature devices:** hero relay (one object in every scene, `film-grammar.md` 3.4); light first (glow, solid, rig); z-fly
entrance; two-shape lens iris; snap morph hidden in motion blur; docking flow bar; locked hero over a drifting world
(night, then day, when the story's time changes); screen becomes world; lights-out exit; the mark assembled from the
motifs.
**Effects:** bloom on each light source in its own hue, glows sized to source (one a shot), motion blur on the 4-6
fastest frames; no flash; dither, never visible grain.
**Kit:** `Ground`, `GLView` + `softStudio`, `Defocus`, `Camera`, `At`, `Sheen`, `Card glass`, `darkUI` with the brand accent.

```tsx
<Ground color="#0A1226">
  <Camera keys={[{ f: 0, zoom: 1 }, { f: 70, zoom: 0.9, curve: ease.out }]}><StageLights /><Hero /></Camera>
</Ground>
```
**Avoid:** white glows on coloured light, fog cones, a different hero per scene, pure black, warm black or brown stages,
neon on black, text on every beat.

---

## 6. Footage + glass UI

**Fits:** consumer and health/finance apps with a human story; products used in real life.
**Ground:** real footage or aerial plates (low saturation, always slowly pushing), shown through masks and glass; flat
deep or pale grounds between plates; the ground changes when the story changes place.
**Palette:** a deep tone of the accent (e.g. #0A1622) and a bright pale (#F6F7F9) as the two poles; one accent family
(e.g. cyan #22B8E8 -> deep teal-blue #0E6E9C, or amber when the product's object is warm); colour temperature contrast
comes from the footage (one warm human shot is the warmest frame in the film).
**Type:** one sans (`inter` 430-550, 600-700 only for the one headline word), centred, sentence case, sized by word count
(most lines 84-150 px); key lines with a light left-to-right gradient that sweeps and parks on the key word (lit from one
side); a blurred copy as glow only on hero words.
**Materials:** frosted glass pills, bubbles, cards and windows, each blurring **what is really behind it** (6-28 px scaled to
the slab), rims lit from above, the primary control opaque (black); thin outline icons (`Icon`).
**Motion character:** every hold drifts; transitions motivated by motion or light; UI planes are objects (rise, yaw, whip) and
square up only to be read; 3D only for one model inside an app card.
**Signature devices:** iris from a seed glyph onto a plate; velocity-matched jump cut; accelerating example cycle; tint band
headline; carried word; staged push wipe from footage to product; light flood cut; decode + beat shimmer status; skeleton cards
that develop; selection by growth; white fly-through panel; manifesto line built word by word; wordmark slam and swell.
**Effects:** backdrop blur scaled to slab size, lit rims, text glow on hero words, sheens on the beat, motion blur on fast
frames. No flash, no vignette; grain only on the footage.
**Kit:** `OffthreadVideo`, `Photo`, `Card glass`, `InputBar`, `Cursor`, `Words`, `Swap`, `Iris`, `Push`, `Sheen`.
**Avoid:** footage as wallpaper; glass over flat colour; a flat screenshot sliding in; gradient fields as grounds.

---

## 7. Swiss poster type

**Fits:** bold launches, developer tools with attitude, events, short social spots; when copy is the hero.
**Ground:** white and full-bleed colour fields, flat; no texture; strict margins and a visible or implied column grid.
**Palette:** black, white, and **one loud colour** (red-orange #FF3B1F, cobalt #1F3BFF or yellow #FFD400) used as full grounds
and for one word per scene.
**Type:** a neo-grotesk at extremes: the spectacle word giant and cropped by the frame (`inter` or `geist` 600-700,
tracking -0.03 to -0.05 em, line height 0.85-0.95), statements at 500-550; captions 40 px or more when they carry
meaning, 20-28 px only as texture; sentence case; flush-left on the column grid (the one world where lines leave the
centre); numbers in tabular figures.
**Materials:** none beyond type, rules (2-4 px), solid blocks and real logos.
**Motion character:** hard cuts on the beat, masked rises, marquee pans, size steps as cuts; fast cadence in lists (6-12 f
beats, every word still readable) and a long final hold.
**Signature devices:** masked rise (`Words arrive="rise"`); marquee pair (`text.md` 8.1); giant type pan; size steps
as cuts; colour wave on the payoff word; a full colour field when the story turns; push turns between same-tone grounds; corner collapse.
**Effects:** none. No blur except smear on the 2-3 fastest frames of a pan.
**Kit:** `Ground`, `Words`, `Swap`, `Push`, `Marker`, `Camera` (pans), `Brand`.

```tsx
<Ground color="#FF3B1F">
  <Camera keys={[{ f: 0, x: -400 }, { f: 60, x: 400, curve: ease.glide }]}>
    <At x={960} y={540}><Words text="Ship it" arrive="rise" style={{ fontFamily: fonts.inter, fontSize: 620, fontWeight: 660, letterSpacing: '-0.045em', lineHeight: 0.9, color: '#0E0E0E' }} /></At>
  </Camera>
</Ground>
```
**Avoid:** centring everything, decorative gradients, glass, soft shadows, more than one accent.

---

## 8. Terminal

**Fits:** CLIs, APIs, SDKs, databases, infrastructure; audiences that live in a terminal.
**Ground:** flat graphite (#111214), optionally a crisp 1 px grid or a dot screen; panes and windows as the shapes;
optional halftone patches as the film's texture.
**Palette:** off-white text #E8E6E1, dim grey #7C8391, **one accent** (amber #FFB000 or cyan #4FD1FF); status colours chosen
off-green for invented brands (cyan for ok, amber for warn, coral for error); real syntax colours inside code.
**Type:** statements in one sans (`geist` or `inter` 450-550, sentence case), centred on the graphite or set beside the
window they answer; `mono` only inside the terminal and windows (commands, output, file names, numbers), as written,
26-40 px on screen after the push. Never a mono statement, never uppercase labels.
**Materials:** windows (`Window` or chrome-less panes), block carets, ASCII rules and boxes, progress bars, real command output.
**Motion character:** stepped: characters, carets, spinners (45 deg steps), counters by cuts; the camera smooth (push 1.4-1.8x
to make text legible, pull back after).
**Signature devices:** commands typed with real cadence; cipher-settle labels; multi-select checklists ticking; output bursts;
random-order status reveals; cut counters; hidden cuts inside zoom whips; a URL that decodes on the end card.
**Effects:** none, or a faint scanline/halftone texture. A glow only on the cursor block if the brand wants it.
**Kit:** `Terminal`, `Typing`, `Scramble`, `Odometer`, `Progress`, `Window`, `Camera`, `GridLines`.

```tsx
<Ground color="#111214">
  <Camera keys={[{ f: 0, zoom: 1 }, { f: 24, zoom: 1.6, x: -220, y: 120, curve: ease.out }]}>
    <At><Terminal t={{ ...darkUI, accent: '#FFB000' }} w={1180} h={620} lines={lines} size={26} /></At>
  </Camera>
</Ground>
```
**Avoid:** matrix rain, green-on-black hacker clichés, fake commands, unreadable tiny output.

---

## 9. Pixel and dither

**Fits:** products with pixel or retro heritage, creative AI, games, identity reels.
**Ground:** flat graphite (#121212) or a deep tone of the accent; clean white for collage; photographs graded into one
world.
**Palette:** off-white, graphite, one hot accent (electric blue #2D5BFF or signal red #FF3B30); the image world's gradient map
derived from the palette; a light glow colour reserved for the end card.
**Type:** one clean sans for every statement (`geist` or `inter` 450-550, sentence case); a serif only when the brand's
wordmark is one; pixel faces rendered at 1/6-1/9 scale and upscaled without smoothing for single moments (a word
resolving, the mark), never a whole statement.
**Materials:** 1-bit sprites on a cel clock (2-3 f per cel), mosaics, ring-dot edges, halftone; one glass panel for UI.
**Motion character:** mixed clocks: sprites and mosaics stepped, camera smooth; mosaic bridges as the cut.
**Signature devices:** sprite resolve from coarse blocks in bursts; pixel bridge (`turns.md` 4.3); dither flare before a
mosaic; develop from white; glyph-append wordmark; glyph birth in a travelling glow on the end card; an exact replay of the
mark's clip as the bookend.
**Effects:** pixel devices, grain on photos only, one end-card glow.
**Kit:** `Pixelate`, `Photo`, `Words`, `Camera`, `Grain`, canvas upscaling for pixel faces.
**Avoid:** generic "glitch" (RGB tearing, VHS noise), square-only mosaics on non-pixel brands, dither on flat UI.

---

## 10. Ink on white

**Fits:** AI products that should feel serious and quiet; explainers with a voice-over; abstract products (agents, indexing,
understanding).
**Ground:** white and nothing else: #FFFFFF, flat. No texture, no shapes. Chapters end on white, never on black.
**Palette:** black ink #000/#111 and **colour only as state**: a ramp derived from the brand
that every new word cools through on arrival and every outgoing element heats through on exit (for a blue brand: pale sky ->
cobalt -> navy -> ink); pictures in a brand duotone while "processing", true colour when "found", washed out as "the archive".
**Type:** one neo-grotesk at a regular weight (`inter` 430-450 or the brand face), black, centred captions sized by word
count; text never scales, bounces or blurs; only colour moves.
**Materials:** real UI on one canvas; rounded 16:9 picture cards; design-tool metaphors (selection boxes with handles,
segmentation silhouettes, wireframes); an optional branded cursor as a character.
**Motion character:** front-loaded: lead-heavy re-centres (60-70 % on the first frame), whips that creep then burst and cut at
peak, entries already moving; one camera over one UI canvas in the demo act.
**Signature devices:** ramp print (`text.md` 2.3); lead-heavy re-centre; hinge drum swaps; collapse to icon; doors part; loaded
snap; skeleton cascade resolved by a colour band; send glow; lens-only demo with hidden cuts; state grade on footage; a
scale-out finale; a hard music stop and silent end card.
**Effects:** none: no grain, no bloom, no vignette, no motion blur. Light effects are colour (ramps, warm pulses, shimmers).
**Kit:** `Ground`, `Words` (cut + `born`), `Swap`, `Typing`, `InputBar`, `Cursor`, `Camera`, `lightUI` with soft shadows.

```tsx
<Ground color="#FFFFFF">
  <Words text="Know what your team knows" arrive="cut" gap={6} born="#3D6BFF" settle={7} style={{ fontFamily: fonts.inter, fontSize: 88, fontWeight: 430, letterSpacing: '-0.015em', color: '#000000' }} />
</Ground>
```
**Avoid:** any decoration; colour that does not mean a state; easing that is symmetric (it looks late on white).

---

## 11. Photo plates

**Fits:** consumer, travel, food, health and place products; manifesto and brand films; any brief with real photographs
and no footage.
**Ground:** licensed stills as full-bleed plates, all through one gradient-map grade (`Photo grade`), each slowly
pushing (0.2-0.6 % a frame); clean white or a deep tone of the accent as the base between them.
**Palette:** the grade's two or three tones plus one accent for the line's key word; the pictures carry the colour.
**Type:** one sans, centred on a calm area of the plate or on a clean band across it, never over detail; or in a thin
pill or ring over the picture.
**Materials:** pictures masked into rounded shapes (pills, circles, squircles) beside flat colour shapes; one glass bar
blurring the plate under it when UI appears.
**Signature devices:** an organic iris (a cloud or scallop mask) opening from a glyph onto a plate; letters as windows;
a duotone that develops to true colour; a slow push carried across a hard cut.
**Avoid:** pictures from different shoots and grades; type over faces or busy detail; stock as wallpaper.

## 12. Daylight set

**Fits:** consumer AI, assistants, playful products, brand films that want warmth without paper.
**Ground:** a three.js diorama under overcast light (`GLView` + `softStudio`): a flat pale backdrop or a sky photograph
behind, a floor that catches soft contact shadows.
**Palette:** pastel neighbours of the accent (sky, peach, rose; never lilac or mint for an invented brand) on white.
**Type:** one soft sans, centred above or beside the object with air; never on the object.
**Materials:** matte clay, frosted glass and rounded solids with ambient occlusion and shallow depth of field
(`Defocus`); one character or hero object at a time.
**Signature devices:** the object turning to show a new face for each benefit; a camera orbit that stops on the name;
a 3D mark built from small solids, then flattened into the 2D glyph.
**Avoid:** hard shadows, chrome, black rooms, more than one hero in frame.

## 13. Brand field

**Fits:** a supplied brand with one strong colour; bold launches where the colour is the identity.
**Ground:** the brand colour as a full, bold field: flat and saturated, or a crisp designed sweep from white at the top
into the saturated colour below (a designed scene, never a faint wash).
**Palette:** the brand colour, white, and one ink; nothing else.
**Type:** white or ink, centred, at 7:1 against the part of the field it sits on.
**Materials:** white or frosted glass cards and pills on the colour, soft layered shadows tinted to the field.
**Signature devices:** cards rising out of the field's light; reflective light bands with cropped giant type over them;
the field's arc becoming the mark's curve.
**Avoid:** for an invented brand, a purple or green field; a second saturated colour; type on the brightest band.

## 14. Marker on grid

**Fits:** planning, education, analytics and note products; films that should feel thought through by a person.
**Ground:** clean white with a precise grid (1 px, 6-10 % contrast) or hairline construction lines.
**Palette:** ink, one accent for the marker strokes, a pale tint of it for highlight blocks.
**Type:** one sans, centred or on the grid; `fonts.hand` only for the marks a person makes inside the product.
**Materials:** a ragged marker stroke (circles, underlines, arrows, a flat highlight block behind one word, a little
offset) over precise type and UI.
**Signature devices:** the marker circling the one thing that matters; a highlight block wiping behind the key word;
the grid folding into a chart.
**Avoid:** handwriting as a statement, more than one marker colour, scribbles as decoration.

## 15. Design canvas

**Fits:** design, whiteboard, no-code and editing tools; products whose world is a canvas.
**Ground:** a light-grey canvas (#F4F5F7) or a deep tone of the accent, flat, with guides appearing only while used.
**Palette:** canvas, ink, one selection accent; the user's content carries other colour.
**Type:** one sans for statements; labels on handles in the UI face at 40 px or more when they must be read.
**Materials:** frames, selection boxes with corner handles, measurement guides, multiplayer pointers with names, all
pixel-real at film size.
**Signature devices:** a selection that resizes into the next scene; guides snapping as an object lands; handles that
converge into the mark; `CornerMarks` framing a line.
**Avoid:** dashed wireframes as the opening, overlapping tilted editor windows, a dozen pointers at once.

---

## Looks inside a world

A world sets the rules; a look is one way to make it. Pick one look for a film, from its world or from this list:
- licensed photographs of the hero's world (a desk at dusk, a kitchen at 4 am, a ward corridor) with the product's UI
  over them;
- a sky or cloud plate as the ground, with a glass bar blurring it;
- a clay or plush hero in soft key light and shallow focus;
- glossy app tiles standing on a frosted shelf, shallow focus, cool grey ground;
- graded editorial photographs of people at work, the line in a thin pill over them;
- a flat deep navy with glossy outlined pills and a lit 3D object as the only light;
- cool white falling into a saturated brand colour, white glass cards on it;
- hairline construction: thin circles and guides as structure behind a short line;
- liquid light bands: reflective stripes in one hue family, cropped giant type over them;
- a field of small squares in tints of the accent, filling and draining;
- a wall of identical soft objects in perspective with depth of field, one pointer among them;
- a calm architectural room where the product's screen lives;
- engraving and photo collage on white, recoloured into the palette;
- the product's own surface (a paper rota, a bake list, a code diff) filling the frame, detailed and real;
- a highlight block in the accent behind one word, slightly offset;
- the mark assembled from small solids in 3D, then flattened into the 2D glyph.

---

## Choosing a world

| Product / brief | First choice | Second choice |
|---|---|---|
| infra, platform, security, data | block grid | terminal |
| developer tool, CLI, API | terminal | Swiss poster type |
| image / design / publishing tool | editorial paper | paper collage |
| brand identity reel, creative AI | paper collage | pixel and dither |
| personal assistant, consumer AI | soft air | footage + glass UI |
| flagship platform brand film | dark stage, light and glass | block grid |
| app with a human use case | footage + glass UI | soft air |
| abstract AI (agents, indexing) | ink on white | block grid |
| bold short social launch | Swiss poster type | brand field |
| consumer, travel, food, place; brand film | photo plates | daylight set |
| playful consumer AI, assistants | daylight set | soft air |
| a supplied brand with one strong colour | brand field | ink on white |
| planning, education, notes | marker on grid | ink on white |
| design, whiteboard, editing tools | design canvas | editorial paper |

If the brand already has a strong visual system, the world is the brand's system translated into motion with these rules;
the table is for when it does not.

---

## Not in the kit yet (build these by hand from the recipes above)

- **`World` presets:** a `world` object per language (ground, palette roles, fonts, radius, shadow, effect budget) that the
  `Theme`, `Ground` and effects read from, so a film cannot drift between worlds.
- **Fonts:** the kit bundles five families (Inter, Geist, Geist Mono, Newsreader, Caveat). Missing: a rounder geometric
  sans for friendlier consumer brands (e.g. Manrope), a tight display grotesk for poster worlds (e.g. Inter Tight) and a
  pixel face for pixel worlds. Add licensed open faces (e.g. via `@fontsource`) and say in `fonts.ts` when each is allowed.
- **`Grade` (a gradient map), `HorizonGlow`, `LightCone`, `Halftone`, `EdgeDots`, `TileFlood`:** world-defining pieces listed in the
  motion files' kit gaps.
- **Palette guard:** a check that warns when an invented brand's palette contains purple/violet or green hues, or a default
  purple-to-blue gradient.
- **`lightUI` / `darkUI` defaults:** the default accent is a generic blue; worlds should require an explicit accent.
