# Imagery: photos, footage and 3D renders

Pictures in a launch film are either **the product's content** (what it makes, finds, sells, edits) or **the world it lives
in**. In both cases they must look like one shoot, and they must be *acted on*: masked, pushed, developed, selected,
re-coloured by state. Random stock with mixed grades, used as wallpaper behind text, is the clearest template tell there is.
All numbers at 30 fps, 1920x1080.

Kit: Remotion's `Img`, `OffthreadVideo`, `staticFile`; `Camera`, `At` (camera); `Card`, `Box`, `Grain`, `Vignette`
(world); motion helpers. Most image treatments here are SVG filters or CSS layers; the reusable ones are listed as kit gaps.

## House rules

1. **One image world.** Every picture, including the ones inside UI mock-ups and billboards, goes through the same grade (a
   gradient map derived from the palette), or every picture is shot/curated to the same light and palette. 30 images must
   read as one universe.
2. **Content is the colour.** When pictures are the product, keep the layout quiet (white or paper ground, one ink, small
   type) and let the photos carry all the colour.
3. **Curate like a mood board, not a stock search.** One casting, one light (e.g. bright daylight, faces large), 2-3 dominant
   hues; every image must read at 250 px wide; reject dark or off-palette pictures.
4. **Colour state means something.** If pictures arrive tinted, the tint always means the same thing (processing, generated,
   claimed by the brand) and the true colour always means "found / real / done".
5. **Pictures are acted on.** Masked by an iris, pushed by a panel, shrunk back into a card, developed, selected with a
   chime. A full-bleed photo that just sits there gets at most 1.5 s and a slow move.
6. **Licences.** Use your own, licensed stock, generated imagery the client owns, or public-domain material; never pictures
   lifted from someone else's film.

---

## 1. One image world (grade)

**What:** a gradient map on luminance applied to every picture: 5-7 stops from the palette's darkest tone (never below a
lifted black) through its mids to a warm or cool near-white, mixed ~80/20 with the original, plus a light screen tint at
~18 % and contrast -10 %.
**When:** any film with more than ~5 pictures from different sources; mandatory for generated imagery.
**How:** an SVG filter with `feColorMatrix` (to luminance) and `feComponentTransfer type="table"` per channel, applied with
`filter: url(#world)`. Derive the stops from the brand (for invented brands: no purple, no green, no default AI gradient).

```tsx
const lut = { r: [0.10, 0.22, 0.62, 0.93, 0.98, 1.0], g: [0.08, 0.20, 0.42, 0.55, 0.72, 0.96], b: [0.10, 0.25, 0.40, 0.48, 0.55, 0.92] };
<svg width={0} height={0}><filter id="world" colorInterpolationFilters="sRGB">
  <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="l" />
  <feComponentTransfer in="l" result="m"><feFuncR type="table" tableValues={lut.r.join(' ')} />
    <feFuncG type="table" tableValues={lut.g.join(' ')} /><feFuncB type="table" tableValues={lut.b.join(' ')} /></feComponentTransfer>
  <feComposite in="m" in2="SourceGraphic" operator="arithmetic" k2={0.8} k3={0.2} />
</filter></svg>
<Img src={staticFile('img/coast.jpg')} style={{ filter: 'url(#world) contrast(0.9)' }} />
```
**Avoid:** a different grade per scene; a LUT that crushes blacks to 0; grading UI along with the pictures.

---

## 2. Develop and materialise

The "generated / found" moment without a progress bar. Pick one family per film.

### 2.1 Tint develop
Cards enter in one **shared tint** (a screen layer of the tint at opacity `1 - p` plus a multiply at `0.6 x (1 - p)`) and
develop to their own colours at **different speeds** (12-30 f, ease-out, seeded per card), so the grid comes alive unevenly.
The shared tint unifies the entry; the variety appears as it develops.

```tsx
const p = at(frame, arrive, dur, ease.out);   // dur seeded 12..30
<div style={{ position: 'relative' }}>
  <Img src={src} style={{ width: 360, height: 450, objectFit: 'cover', display: 'block' }} />
  <div style={{ position: 'absolute', inset: 0, background: tint, mixBlendMode: 'screen', opacity: 1 - p }} />
  <div style={{ position: 'absolute', inset: 0, background: tint, mixBlendMode: 'multiply', opacity: 0.6 * (1 - p) }} />
</div>
```

### 2.2 Develop from white
A white veil fades 0.76 -> 0 over 21 f (`cubic-bezier(0.2,0.6,0.35,1)`: half of it in the first 6 f) while saturation climbs
0.4 -> 1.0. Like an instant photo developing. Portraits inside cards: luma from near-white down to normal over 8 f.

### 2.3 Brand duotone, then colour
Every new image or page appears first as a duotone in the brand colour (shadows the deep brand tone, highlights white, ~70 %
opacity), slightly blurred, then crossfades to full colour **per tile in reading order** (3 f per tile, 2-3 f apart: a grid of
six in ~14 f). For a page, the colour sweeps top-left to bottom-right over ~10 f. Combine with a 186 px expo-out rise and a
vertical blur 30 -> 0 px for grids. Every picture is first "claimed" by the brand, then becomes real.

### 2.4 Colour states as meaning
Three filters per thumbnail: **warm or brand duotone** = in the library, being processed; **true colour** = found, selected,
understood; **wash-out** (saturation 0.2, contrast 0.25 over white) = the background archive. Optional category gradient maps
(one hue family per kind of understanding) with true-colour faces inside white detection boxes. A library arrives duotone,
deepens to colour over ~36 f, recedes to wash over 15 f; a selected clip returns to true colour with a 4 % bump for 4 f and a
bright chime. Switching category: a hard text cut + a 3 f crossfade of the map through a 50 % desaturated midpoint.
**Avoid:** random per-clip grades; a state colour that sometimes means something else.

### 2.5 Printing reveal
A cover or page is revealed top-down behind a soft 40 px edge, its colours starting washed and saturating as the edge passes.
For "your product is being made".

### 2.6 Seed, tile, colour
**What:** each picture starts as a 4 px seed in the accent, springs to its tile size already showing the brand duotone, and
cuts to true colour in 3 f. A grid of found or generated pictures arrives as a printed sheet, not a fade.
**Numbers:** seed 4 px -> tile size over 6 f on `ease.out` (no overshoot); the duotone held 4-8 f; `develop` 0 -> 1 over 3 f;
tiles 2 f apart in reading order; a click per tile at about -28 dB. The camera creeps over the grid.
**Sells it:** the brand claiming every picture before it becomes real (2.3), at a pace no fade could keep.

```tsx
const s = start + i * 2, k = mix(at(frame, s, 6, ease.out), 4 / 420, 1);   // a 4 px seed to the full tile
<div style={{ transform: `scale(${k})`, background: ACCENT }}>
  <Photo src={staticFile(`img/${i}.jpg`)} w={420} h={525} grade={{ dark: INK, light: PAPER }} develop={at(frame, s + 12, 3, ease.out)} />
</div>
```

---

## 3. Picture cards and layouts

### 3.1 Bare picture cards
Sharp rectangles, **no radius, no border, no shadow**, 240-480 px, square or portrait, each a tight crop of one strong colour
shape, aligned to a 120 px grid on paper with paper breathing between them. They read like prints without a frame: pure picture.
Motion in **orthogonal steps only** (purely horizontal or vertical, 40-200 px per step, each step 4 f with most of it on the
first frame, holds of 4-10 f), staggered so 1-2 things move at a time; cards above words, so a word slides out from under a
photo. Pair with the tint develop (2.1) and a silent bed with a click per step.
**Avoid:** rounded, bordered, shadowed "UI cards" for photographs on paper.

### 3.2 Content-as-colour feed
On pure white with one small ink, photo cards (~4:5, radius ~24 px, no border) carry all the colour; curated to 2-3 hues.
A fanned deck that deals itself (`entrances.md` 2.7), a layout that rises through the frame, streams of cards.

### 3.3 Streams (rivers) of cards
Two point-symmetric arcs (circle radius ~1040 px; one arm from the top edge to the left edge, the other from the bottom edge to
the right edge) flow away from a centred word. Card i sits at arc length `s0 + i x spacing - D(f)`, wrapping off-screen; `D` is
the integral of a speed profile (px/f): 100 at the cut -> 50 at f3 -> 30 at f25 -> 27 cruise to f45 -> 42 at f77 -> 56 at f81 ->
100 at f90 -> 166 at the cut f95. Size and focus by position (240 x 300 near the word, 290 x 363 and 4-8 px blur at the outer
ends); later cards on top; soft shadow (24 px, y 8, 12 %); motion blur only above ~80 px/f. The centre word stays sharp and is
never covered.

### 3.4 Mosaic of thumbnails
~100-150 rounded thumbnails materialise as a diagonal wave from the top-left (onset = start + column + 1.4 x row, a 2 f pop in
the tint), deepen to full colour over ~30 f, then wash out to become the backdrop for the next idea (a graph, a selection).

### 3.5 Orbit tiles
Four square photo tiles (~330 px, no radius, no shadow) on a ring of radius ~520 px around a small caps line, viewed from ~18 deg
above; they dive in from the camera side at the top glowing white (bloom 1, 0.7, 0.45, 0.25, 0.1, 0 over 6 f) and orbit ~250 deg
over 68 f, front-loaded; one passes in front of the line. The reverse bloom over the last 7 f into a cut to white.

---

## 4. Collage and paper

### 4.1 Paper build (stop-motion collage)
On white or paper, 6-10 cut-out pieces (recoloured public-domain engravings, one 3D render, one tinted photo with a torn edge)
and one label strip with a small bold serif line that is always on top. Clock: hold 5 f (6 fps). Every piece **cuts on** (never
slides or fades), several in 2-3 steps (a torn fragment first, the whole a step later), 1-2 steps apart; the label adds a word
every 2-3 steps and re-centres by a cut; on 3-4 steps every piece jitters by a seeded 1-2 px (re-placement wobble); a drawn
line or contour "boils" (redrawn with a 2-4 px drift each step). The camera runs smooth on every frame: 0.96 -> 1.0 linear,
then 1.0 -> 1.27 sine in-out over 30 f, hold, ease-in back to ~1.08 into the exit. Optional 3-8 f full-frame texture flashes at
15-25 % opacity (a handwriting wash, a giant pale sketch).

```tsx
const step = Math.floor(frame / 5);
const wobble = [7, 12, 15, 21].includes(step) ? (rand(step * 3.1 + i) - 0.5) * 3 : 0;
{pieces.filter((p) => step >= p.step).map((p, i) => (
  <Img key={i} src={staticFile(step >= p.full ? p.src : p.fragment)} style={{ position: 'absolute', left: p.x + wobble, top: p.y }} />
))}
```
**Avoid:** drop shadows on pieces; smooth slides; scaling pieces individually.

### 4.2 Torn layers
Each new picture tears in over the last through a clip path whose edge advances in 4-5 steps held 5 f each, alternating sides;
edge = seeded 1-D noise (amplitude 40-90 px, wavelength 30-120 px, plus 20-60 px jaggies) with a 4 px white fibre fringe on
paper, or a band of edge dots between photos. Text lives on each layer (`text.md` 7.2).

---

## 5. Cut-outs

Cut-outs exist to change **layer order or ground**, never as stickers.
- **Type behind the subject:** a word in front of a person until the "mask" moment, then between the backdrop and the cut-out.
- **Product locked, world swaps:** the product cut-out stays at frame centre with a slow push (1.00 -> 1.12, every frame)
  while the ground cuts every 7-8 f (white with a soft drop shadow, then 2-3 saturated textures shot from above); a giant word
  rises in front to hide a variant swap (`text.md` 7.4). With host products behind the artefact instead of textures, this
  is the object-lock swap (`cards-ui.md`).
- **Before / after on one picture:** pose fixed, one property changed by a cut (backdrop, garment colour, a label line). The
  most convincing way to show an edit is no transition at all.

```tsx
<AbsoluteFill><Img src={staticFile(grounds[Math.floor((frame - s) / 7) % grounds.length])} /></AbsoluteFill>
<AbsoluteFill style={{ transform: `scale(${1 + 0.12 * (frame - s) / 90})` }}><Img src={staticFile('product-cutout.png')} /></AbsoluteFill>
```

---

## 6. Parallax and depth with flat pictures

- **Counter-zoom:** the plate pulls back (authored at ~1.19x; 1.0 -> 0.843 quad-out over ~38 f, then a creep; a last 12 f
  push-in to hand energy to the cut) while centred text grows (`camera.md` 1.3).
- **Two-depth push:** type layer 1.157x, picture layer 1.083x over 20 f.
- **Occluder crane:** far plate slow, title mid, a big blurred foreground element 10x faster passing in front (`turns.md` 8.1).
- **Depth by size and focus:** cards further "away" are smaller and blurred 4-8 px; no 3D needed.
- **Plates breathe:** a full-bleed still is never static: 0.2-0.6 %/f push, or a 20 px drift; footage gets the same push under
  UI so the world always breathes.

---

## 7. Pictures inside type and windows

- **Letters as windows** onto the hero picture, filled on one frame on a hit (`text.md` 7.1).
- **Outpaint window:** a card is an `overflow: hidden` window over a wider layout (a banner with a headline at one end and text at
  the other); the window widens in **two eased steps** (570 -> 1135 px over 8 f with `cubic-bezier(0.3,0,0.2,1)`, then -> 1725 px
  while the inner layout scales 0.87 so the whole banner fits), handles stretching into bars during each step; hard edges, no
  feather; a hit on each step. The reveal of the layout's text is the payoff.
- **Picture through a mask from the film's shapes:** an iris from a seed glyph onto a world plate (`turns.md` 3.1); a picture
  window that the pressed button became (`turns.md` 5.2).
- **The same picture framed three ways** (inside type, inside a growing window, full bleed) reads as one campaign.

---

## 8. Full-bleed stills and footage

### 8.1 Stills as type grounds
For a fast list hook: one word per still, 12-18 f each, hard cuts on hits. Choose stills with **one strong mass** (an arc, a
disc, a horizon) and a quiet horizontal band (y ~420-660) where the word sits; repeat a shape across the set (every still has
an arc) for continuity between unrelated images. The stills are static; only the grain lives.

### 8.2 Footage, acted on
Real footage appears briefly and is used by the product: seen only through an iris, pushed off by the product's panel (the
human moment hands the action to the product), or masked inside glass. A warm human shot in a cool film is the warmest frame in
it, which is why it reads. Enter it pre-punched (1.406 -> 1.0 over 15 f) with a low boom; hold it clean ~15 f; then act on it.
24 fps footage in a 30 fps film is fine under a push.

```tsx
const s = mix(at(frame, 0, 15, ease.out), 1.406, 1);
<AbsoluteFill style={{ transform: `scale(${s})` }}><OffthreadVideo src={staticFile('footage/desk.mp4')} muted /></AbsoluteFill>
```

### 8.3 In the world (mock-up run)
3-4 photographic mock-ups (a wall poster in a street, a printed piece on a table, a screen in a room), 70-90 f each, hard
cuts:
the art corner-pinned flat (`matrix3d`), graded slightly down to sit in the photo (contrast -5 %, a touch warmer), surroundings
in contrasting palettes so the brand art pops, one live element (a passer-by crossing as a dark silhouette). Moves are tiny
(0.2-1.5 % push or a ~140 px pan): motion exposes fakery. For "it is big in the world", pull back instead (`camera.md` 3.3).
**Avoid:** drop-shadowed floating devices; fast moves on mock-ups.

### 8.4 Texture montage
When a claim needs energy rather than content (precision, imagination), pictures can become texture: blurred 15-30 px,
gradient-mapped, with a chromatic offset (red +20-30 px right, blue -20-30 px left), horizontal smears on 10-25 % of rows, grain,
cut every 2-8 f under a **static** title. Once per film, never as a house look.

---

## 9. 3D renders

- **Build from primitives.** A whole film can be made of ~10 primitives (sphere, cube, slab, drum, torus, disc, cone, grid
  plane, line, octahedron); variety comes from **material and light**, not model complexity. In code, most of it is 2D layers
  and CSS 3D (`Box`, `At`, `Camera`); reserve real 3D for one or two objects.
- **Flat-shaded isometric** for system worlds: each face one flat colour (top lightest, left mid, right darkest), no lighting
  gradients, no shadows, no reflections. `Box` does this with `shade()`.

```tsx
<Camera perspective={20000} cam={{ rx: 54.7, rz: -45 }}>
  <At x={760} y={540}><Box w={220} d={220} h={60} color="#F4F1EC" topContent={<Mono>INDEX #1</Mono>} /></At>
  <At x={1040} y={540}><Box w={220} d={220} h={140} color={accent} /></At>
</Camera>
```
- **Designer glass** for light worlds: per-face tints (2-3 related hues at alpha 0.45-0.7), white 2 px edges, a fresnel-strong
  rim, an interior light (the hero's halo inside), no refraction. A frost-to-clear state change is a beat (`effects.md`).
- **One soft organic thing** inside a hard system world (a blurred photo texture inside a glass object) stands for the human or
  intelligent part.
- **A 3D render inside UI** (a model in an app card) is app content: it turns once (e.g. 180 deg in 14 f ease-in-out), then
  serves the interaction.
- **The hero object looks identical in every scene** (same gradient, specular spot, halo) so it is recognised instantly.

---

## Not in the kit yet (build these by hand from the recipes above)

- **`Grade`:** a gradient-map LUT component (SVG filter from a list of stops + mix + screen tint + contrast), shared by every
  picture via one id.
- **`Develop`:** tint / white / brand-duotone develop with per-item seeded speeds and reading-order offsets.
- **`StateGrade`:** duotone / true / wash / category map states with crossfades through a desaturated midpoint.
- **`PictureCard`:** a bare picture card (no radius, border or shadow) with orthogonal step motion on the stepped clock.
- **`StopMotion`:** a clock helper (`hold` frames, wobble steps, fragment-then-full reveals) for collage pieces.
- **`TornEdge` / `TearStep`:** seeded torn clip paths with fringe or edge-dot band, stepped advance.
- **`EdgeDots` (ring-dot dither):** an offline script (CPU, Node) that turns a graded picture's edges into a static SVG overlay of
  rings and dots, plus a `flare` exit (see `effects.md`).
- **`Rivers`:** cards along arcs with a speed profile, size/blur by arc position and smear above a threshold.
- **`ThumbMosaic`:** diagonal-wave materialise, state colours, select bump.
- **`CornerPin`:** `matrix3d` from four corner points for compositing art into photos.
- **`OutpaintWindow`:** stepped widening clip window with handles.
- **`HoloTexture`:** blur + gradient map + RGB offset + row smears for texture montages.
- **`Cutout`:** convention + helper for a full picture plus its cut-out PNG, with a layer slot between them for type.
