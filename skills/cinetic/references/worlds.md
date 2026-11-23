# Worlds: the graphic languages a film can live in

A film lives in **one world**: one ground system, one palette, one type pairing, one family of materials, one motion
character and a small set of signature devices. Switching worlds mid-film is the fastest way to look generated. A world
may have two or three grounds that alternate as act markers (a colour script), but they share everything else.

Each world below lists: when it fits, ground, palette rules, type, materials, motion character, signature devices (with
links to recipes), the effect budget, the kit pieces that build it, and what to avoid. A film takes one of its world's
signature devices as its own and repeats it; the others may appear once each (`film-grammar.md` devices).

## Palette rules (all worlds)

1. **If the product has a brand, derive everything from it**: its accent, its neutrals, its face. Read the real values from
   the live site or the press kit; a slightly wrong shade is noticeable.
2. **For an invented brand: no purple, no violet, no green, and no default "AI" gradient** (purple-to-blue, rainbow, neon on
   near-black). Build from one decided accent (signal orange, vermilion, cobalt, ultramarine, sky, amber, coral, pink, yellow,
   teal-free cyan) plus two neutrals and at most one secondary.
3. **One accent, used for meaning** (the newest word, the selected item, the live state, the mark). If the accent is
   everywhere, it means nothing.
4. **Gradients carry meaning or light, never decoration**: a colour ramp that encodes a state, a light falloff, one gradient
   token reused by every beam. Never a gradient as a background "because it looks nice".
5. **Dark grounds are never pure black** while content is visible (#08090C-#141414 with a lift, a glow or grain).
6. Real third-party logos keep their own colours (or their sanctioned mono version) inside the world's UI.

Kit fonts (`fonts`): `inter` (UI, neutral statements), `geist` (technical display), `mono` (code and data only, never uppercase labels), `serif`
(Instrument Serif, editorial accents and display). A brand's own face replaces the display face when provided.

---

## 1. Block grid

**Fits:** infrastructure, developer platforms, data and security products: anything that is a "system".
**Ground:** flat colour fields, each act owning one colour; every ground carries a faint 1 px grid (6-10 % contrast; e.g. 80 px
pitch), sometimes a coarser second grid of section lines. White, near-black and the accent alternate as grounds.
**Palette:** black #101010 / paper white #F6F5F2 as the two main grounds; one hot accent (e.g. signal orange #FF5A1F) as a
full-frame ground for the opener and as the "live" colour; 2-3 flat secondaries for the hub objects (e.g. cobalt #2E4BFF,
sand #E9DCC4, butter #FFE07A); spot red for alerts only. No gradients except one light beam.
**Type:** one neo-grotesk at large sizes (`geist` 500-600, cap 90-150 px, tight tracking) + tiny all-caps mono labels
(`mono`, 10-14 px, +0.12 em) on white chips with a small coloured square bullet: the "technical footnote" voice.
**Materials:** flat-shaded isometric blocks (top lightest, left mid, right darkest; no lighting gradients, no shadows),
slabs, cubes, voxels; hairline connectors with travelling dots; halftone patches as texture.
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
<Ground color="#F6F5F2">
  <GridLines size={80} color="rgba(0,0,0,.08)" />
  <Camera perspective={20000} cam={{ rx: 54.7, rz: -45 }}>
    <At x={820} y={540}><Box w={200} d={200} h={70} color="#FFFFFF" topContent={<Label>INDEX #1</Label>} /></At>
    <At x={1100} y={540}><Box w={200} d={200} h={140} color="#FF5A1F" /></At>
  </Camera>
</Ground>
```
**Avoid:** soft shadows, glows, gradients on blocks, rounded corners on blocks, glass.

---

## 2. Editorial paper

**Fits:** image, design, publishing, creative tools; products whose output is pictures or pages.
**Ground:** off-white paper (#F0EFEC) with a fine monochrome grain and static paper fibre, sometimes a 1 px grey graph grid
(120 px pitch); full-bleed photographs as the alternate ground.
**Palette:** paper, near-black ink #0D0D0D, white type on pictures; **one accent saved for the tool grammar** (handles, corner
squares, the brand tile): e.g. vermilion #E4472B or ultramarine #2A3FD6. The pictures carry all other colour.
**Type:** a sturdy text serif at display sizes, weight 500-600 (`serif` for accents; a licensed text serif if the brand has one),
large and confident, no shadows, no outlines, no glow; optional letterpress speckle; `inter` for UI; `mono` for small labels.
**Materials:** bare picture cards (no radius, border or shadow) on a grid; cut-outs used for layer order; print mock-ups.
**Motion character:** graphics on a **stepped clock** (on twos, 15 fps) with hard expo-out steps, nothing fades, scale changes
are cuts; photographs and footage on every frame; hard cuts every 9-30 f; slow pushes as breaths.
**Signature devices:** tracking snap with corner markers (`text.md`); orthogonal-step grid with tint develop (`imagery.md` 2.1,
3.1); glyph reroll and font cycle for names; staircase settle over a picture montage; type hides the swap; canvas return
(`turns.md` 8.5); letters as windows; outpaint window; selection handles that blink, stretch and converge into the mark;
before/after by cut on one picture; the artefact in the world (pull-backs on print and screens).
**Effects:** grain and speckle; one white flash cut; a texture montage once if the claim needs it. No glow, no motion blur.
**Kit:** `Ground`, `GridLines`, `Photo`, `Words` (cut/rise), `Scramble`, `Camera`, `Grain`; stepped clock `Math.floor(frame / 2) * 2`.

```tsx
const fe = Math.floor(frame / 2) * 2;     // graphics on twos
<Ground color="#F0EFEC">
  <GridLines size={120} color="#CDCDCD" />
  <Photo src="img/still-04.jpg" x={keys(fe, [[0, 1500], [4, 1380], [12, 1380], [16, 1260]], ease.snap)} y={300} w={360} h={450} />
  <Grain amount={0.03} />
</Ground>
```
**Avoid:** rounded shadowed photo cards, glass, gradients in UI, tweens on graphics, a different grade per feature.

---

## 3. Paper collage

**Fits:** brand identities, creative and "idea" products, manifestos; when the film should feel handmade.
**Ground:** white or cream paper; flat warm-dark (#1C1712) and graphite (#1A1A1A) grounds for the mark; photographic layers torn
over each other.
**Palette:** cream #F8F1E6, warm ink #1A1612, one hot accent (e.g. vermilion #E4412B or ultramarine #2A3FD6); all imagery through **one**
gradient-map grade derived from the palette (`imagery.md` 1).
**Type:** a book serif in caps and italics for manifesto lines (`serif`, plus a licensed caps serif if available), a clean grotesk
(`inter` 600 caps) for short promises, small type in a big frame.
**Materials:** cut-out engravings recoloured into the palette, one 3D render, torn paper with white fibre fringes, a cream label
strip, frosted glass for the one UI moment.
**Motion character:** **mixed clocks**: pieces on 6 fps steps (hold 5 f), sprites on 2-3 f per cel, a smooth camera on every
frame; pieces cut on, never slide.
**Signature devices:** paper build (`imagery.md` 4.1); torn steps with text on each layer (`turns.md` 9); develop from white;
edge dots; pixel bridge if the mark has pixel heritage; glyph-append wordmark with re-centring by cuts; orbit tiles with bloom
ends; card flip swap for stationery.
**Effects:** grain on photos only; flat grounds perfectly clean; glow only on the end card.
**Kit:** `Photo`, `Words` (cut), `Camera`, `Pixelate`, stop-motion clock, `Grain` scoped to photos.
**Avoid:** drop shadows on pieces, smooth slides of paper, a different grade per picture.

---

## 4. Soft air

**Fits:** personal assistants, consumer AI, calm productivity, wellbeing; products that should feel light and kind.
**Ground:** a pale, out-of-focus sky field (#EAF0F5 with soft white lobes and a slightly deeper bottom band, kit `Aura`);
photographic plates graded pale to match it, so switching from plate to field is invisible.
**Palette:** sky, white, warm charcoal ink #2B2F33, **one accent that is born light and deepens** (e.g. coral #E8573A born at
#F5AE97), one cool secondary (a pale sky blue) used sparingly.
**Type:** one Apple-like sans for everything (`inter` 500 display, 400 UI) in the warm ink; accent words born light; small
statements.
**Materials:** white pills, bubbles and cards with very soft blue-grey shadows (6-10 %, 18-50 px blur); white glass tiles with a
1 px rim and a faint iridescent inner edge; matte clay or soft CG objects; no device chrome.
**Motion character:** few cuts (6-10 in 35 s), one continuous camera through morphs; cut-on words with rising second lines;
ease-out arrivals with no overshoot; depth of field as recency.
**Signature devices:** cut-on stack; occluder crane; orbit with per-object focus; bottom-anchored chat with recency blur;
thinking-to-answer morph; caret-follow camera; button-to-window; iris under the UI; type fly-through; mark drawn during its own
entrance. A recurring shape (the circle) as the through-line.
**Effects:** depth of field, one click glow bloom, one rim light; motion blur on fast moves only. No grain, no vignette.
**Kit:** `Aura`, `Card`, `Bubble`, `Thinking`, `InputBar`, `Cursor`, `Words`, `Typing`, `Iris`, `Camera`, `lightUI` with the
brand accent.

```tsx
<Aura base="#EAF0F5" blobs={[{ color: '#FFFFFF', x: 520, y: 300, r: 520 }, { color: '#DCE6EE', x: 1400, y: 820, r: 640 }]} speed={0.6} />
```
**Avoid:** phone mocks, dark gradients, neon, glass with heavy blur, many cuts.

---

## 5. Dark stage, shaped light and glass

**Fits:** brand films for platforms and tools that want spectacle; launches of a "flagship"; wordless films with a voice-over.
**Ground:** near-black (#08090C or a deep tone of the brand, never #000) with a lift: a radial glow under the hero, a horizon
or floor glow, soft rotating light lobes, fine grain against banding.
**Palette:** one **gradient token** (three related hues from the brand, e.g. coral #FF6B4A -> amber #FFB347 -> cream #FFE7C2, or
cobalt -> sky -> ice) reused in every beam, bar and glow; white for light cores; the dark ground. For invented brands avoid
the magenta-violet "synthwave" family entirely.
**Type:** almost none on screen. `geist` 600-700 for the one word or wordmark; restraint is the point after the spectacle.
**Materials:** designer glass (per-face tints, white edges, fresnel rims, interior light, frost-to-clear states); dark glass by
rim alone; additive shaped light (pillars, hard-edged cones, neon arcs that thin with distance); one glossy hero object.
**Motion character:** one continuous flight; few hard cuts, each on motion; pull-backs establish, accelerating pushes leave;
light timed as events (charge, dock flash, impact wash).
**Signature devices:** hero relay (one object in every scene, `film-grammar.md` 3.4); light first (glow, solid, rig); z-fly
entrance; two-shape lens iris; snap morph licensed by a flash; docking flow bar; dot-drop-flash-bloom; locked hero over a
drifting world (night, then day); screen becomes world; lights-out exit; the mark assembled from the motifs.
**Effects:** grain (anti-banding), bloom in each light's own hue, glows sized to source, motion blur on the 4-6 fastest frames,
2-3 flashes.
**Kit:** `Ground`, `Glow`, `Aura`, `Box`, `Camera`, `At`, `Flash`, `Grain`, `Sheen`, `Card glass`, `darkUI` with the brand accent.

```tsx
<Ground color="#08090C">
  <Glow x={960} y={620} r={360} color="#FF8A4A" strength={0.35} pulse={0.06} />
  <Camera keys={[{ f: 0, zoom: 1 }, { f: 70, zoom: 0.9, curve: ease.out }]}><StageLights /><Hero /></Camera>
  <Grain amount={0.05} />
</Ground>
```
**Avoid:** white glows on coloured light, fog cones, a different hero per scene, pure black, text on every beat.

---

## 6. Footage + glass UI

**Fits:** consumer and health/finance apps with a human story; products used in real life.
**Ground:** real footage or aerial plates (low saturation, always slowly pushing), shown through masks and glass; deep dark
fields with a floor light; bright pale fields with drifting soft blobs; the grounds rotate by act.
**Palette:** a deep graphite (#0B0D10) and a bright pale (#F8F7F4) as the two poles; one accent family (e.g. amber #FFB547 ->
burnt orange #E8742C); colour temperature contrast comes from the footage (one warm human shot is the warmest frame in the film).
**Type:** one sans (`inter` 400-700), centred, mid sizes (cap 50-90 px); key lines with a light left-to-right gradient fill (lit
from one side); a blurred copy as glow only on hero words.
**Materials:** frosted glass pills, bubbles, cards and windows, each blurring **what is really behind it** (6-28 px scaled to
the slab), rims lit from above, the primary control opaque (black); thin outline icons (`Icon`).
**Motion character:** every hold drifts; transitions motivated by motion or light; UI planes are objects (rise, yaw, whip) and
square up only to be read; 3D only for one model inside an app card.
**Signature devices:** iris from a seed glyph onto a plate; velocity-matched jump cut; accelerating example cycle; tint band
headline; carried word; staged push wipe from footage to product; light flood cut; decode + beat shimmer status; skeleton cards
that develop; selection by growth; white fly-through panel; manifesto line built word by word; wordmark slam and swell.
**Effects:** backdrop blur scaled to slab size, lit rims, text glow on hero words, sheens on the beat, motion blur on fast frames,
one dip-then-flash. No grain, no vignette.
**Kit:** `OffthreadVideo`, `Card glass`, `InputBar`, `Cursor`, `Words`, `Swap`, `Iris`, `Push`, `Flash`, `Aura`, `Sheen`.
**Avoid:** footage as wallpaper; glass over flat colour; a flat screenshot sliding in; similar gradient fields in two
consecutive scenes (they merge in memory).

---

## 7. Swiss poster type

**Fits:** bold launches, developer tools with attitude, events, short social spots; when copy is the hero.
**Ground:** flat white or off-white and flat full-bleed colour fields; no texture; strict margins and a visible or implied
column grid.
**Palette:** black, white, and **one loud colour** (red-orange #FF3B1F, cobalt #1F3BFF or yellow #FFD400) used as full grounds
and for one word per scene.
**Type:** a neo-grotesk at extremes (`inter` or `geist` 700-800, tracking -0.03 to -0.04 em), giant and cropped by the frame, or
small captions at 24-32 px; flush-left more than centred; numbers in tabular figures.
**Materials:** none beyond type, rules (2-4 px), solid blocks and real logos.
**Motion character:** hard cuts on the beat, masked rises, marquee pans, size steps as cuts; very fast cadence (6-12 f beats in
lists) and a long final hold.
**Signature devices:** masked rise (`Words arrive="rise"`); marquee pair (`text.md` 8.1); giant type pan; ghost type; size steps
as cuts; colour wave on the payoff word; ground cuts on the beat; push turns between same-tone grounds; corner collapse.
**Effects:** none. No blur except smear on the 2-3 fastest frames of a pan.
**Kit:** `Ground`, `Words`, `Swap`, `Push`, `Marker`, `Camera` (pans), `Brand`.

```tsx
<Ground color="#FF3B1F">
  <Camera keys={[{ f: 0, x: -400 }, { f: 60, x: 400, curve: ease.glide }]}>
    <At x={960} y={540}><Words text="Ship it" arrive="rise" style={{ fontFamily: fonts.inter, fontSize: 620, fontWeight: 800, letterSpacing: '-0.04em', color: '#0E0E0E' }} /></At>
  </Camera>
</Ground>
```
**Avoid:** centring everything, gradients, glass, soft shadows, more than one accent.

---

## 8. Terminal and mono

**Fits:** CLIs, APIs, SDKs, databases, infrastructure; audiences that live in a terminal.
**Ground:** graphite (#111214) with a subtle 1 px grid or a dot screen; panes and windows as the only shapes; optional halftone
patches.
**Palette:** off-white text #E8E6E1, dim grey #7C8391, **one accent** (amber #FFB000 or cyan #4FD1FF); status colours chosen
off-green for invented brands (cyan for ok, amber for warn, coral for error); real syntax colours inside code.
**Type:** `mono` for everything (sizes 18-120 px), weights for hierarchy; `geist` only for the lockup if the brand uses a sans.
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
**Ground:** graphite (#121212) for the mark; white for collage; photographs graded into one world.
**Palette:** off-white, graphite, one hot accent (electric blue #2D5BFF or signal red #FF3B30); the image world's gradient map
derived from the palette; a light glow colour reserved for the end card.
**Type:** a clean grotesk (`geist` 500-600) + a serif italic accent (`serif` italic) in the wordmark or one key word; pixel
faces rendered at 1/6-1/9 scale and upscaled without smoothing for moments.
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
**Ground:** pure #FFFFFF, nothing else. Chapters end by fading to white, never to black.
**Palette:** black ink #000/#111 and **colour only as state**: a ramp derived from the brand
that every new word cools through on arrival and every outgoing element heats through on exit (for a blue brand: pale sky ->
cobalt -> navy -> ink); pictures in a brand duotone while "processing", true colour when "found", washed out as "the archive".
**Type:** one neo-grotesk at a light-regular weight (`inter` 400-450 or the brand face), black, centred captions; text never
scales, bounces or blurs; only colour moves.
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
  <Words text="Know what your team knows" arrive="cut" gap={6} born="#3D6BFF" settle={7} style={{ fontSize: 77, fontWeight: 430, color: '#000000' }} />
</Ground>
```
**Avoid:** any decoration; colour that does not mean a state; easing that is symmetric (it looks late on white).

---

## Choosing a world

| Product / brief | First choice | Second choice |
|---|---|---|
| infra, platform, security, data | block grid | terminal and mono |
| developer tool, CLI, API | terminal and mono | Swiss poster type |
| image / design / publishing tool | editorial paper | paper collage |
| brand identity reel, creative AI | paper collage | pixel and dither |
| personal assistant, consumer AI | soft air | footage + glass UI |
| flagship platform brand film | dark stage, light and glass | block grid |
| app with a human use case | footage + glass UI | soft air |
| abstract AI (agents, indexing) | ink on white | block grid |
| bold short social launch | Swiss poster type | ink on white |

If the brand already has a strong visual system, the world is the brand's system translated into motion with these rules;
the table is for when it does not.

---

## Not in the kit yet (build these by hand from the recipes above)

- **`World` presets:** a `world` object per language (ground, palette roles, fonts, radius, shadow, effect budget) that the
  `Theme`, `Ground` and effects read from, so a film cannot drift between worlds.
- **Fonts:** the kit bundles four families; editorial worlds need a sturdy text serif with weights 500-600 and caps (Instrument
  Serif has a single weight), Swiss posters benefit from a grotesk with 800-900, pixel worlds need a pixel face. Add licensed
  open faces (e.g. via `@fontsource`) and document pairings.
- **`Grade` (a gradient map), `HorizonGlow`, `LightCone`, `Halftone`, `EdgeDots`, `TileFlood`:** world-defining pieces listed in the
  motion files' kit gaps.
- **Palette guard:** a check that warns when an invented brand's palette contains purple/violet or green hues, or a default
  purple-to-blue gradient.
- **`lightUI` / `darkUI` defaults:** the default accent is a generic blue; worlds should require an explicit accent.
