# Lighting: the key, living light, light events and baked plates

A cinetic film is lit. Every raised thing casts a shadow from one key, sits on a contact shadow and has faces that are
lighter toward the key; the ground carries light that moves; every act has a light event. Light is how a code-made
picture stops looking flat. A radial glow behind the subject or the lockup is not light: it is the stock look.

Every primitive here is a pure state function of the frame (`xxxState(frame, props, film)`, closed form, any order,
any fps) plus a thin component drawn with transforms, opacity, clip paths and SVG polygons. Blur radii are fixed props
(one shadow group, two ladder copies at most), never animated. Every fx exports `declares(props, film)`. Numbers are
60 fps frames (`f@60`) and pixels at 1080p unless they say otherwise.

Contents: 1. The key (`fx/KeyLight`) · 2. Lit worlds · 3. Living light (`fx/LightField`) · 4. Light events ·
5. Glow, spectral light and materials as devices · 6. Baked plates (`dither-gradient.py`) · 7. Checks

## 1. The default light of a film: a directional key (`fx/KeyLight`)

One key, like a sun or a high window. House key (`KEY`): elevation 34°, azimuth 315 (from the upper left: shadows
fall down and to the right, 1.48 × the height). Azimuth is where the key comes from on the floor: 0 from the top of
the layout, 90 from the right, 180 from the viewer's side, 270 from the left.

| Number | House | Range |
|---|---|---|
| shadow offset | height × cot(elevation), away from the key | exact |
| shadow group opacity | 0.18 of ink (or a baked shadow plate) | 0.14-0.24; up to 0.45 on a deep ground at night |
| penumbra | a fixed 1.5 px blur on the one shadow group (a sun) | 4-10 px for a large soft key |
| contact shadow | footprint grown 3 px, fixed 5 px blur, 0.32 | |
| face shade | overlay k (1 − (a + (1 − a) max(0, n·l))), a 0.62, k 0.72 | a 0.55-0.70, k 0.5-0.8 |
| raking key | elevation 3-15° | |
| noon lift | elevation 8 → 72° over 1.2 s | |

All shadows and faces stay in the ground's own hue (`shadowTone(ground, dL)`, `faceTones(base)`): a shadow is the
ground darker, never grey or black on a tinted ground.

API:
- `keyLightState(frame, { elevation, azimuth, intensity, events }, film)` → `{ elevation, azimuth, intensity }`.
  Events fold in order and stay continuous when they overlap: `{ kind: 'noon', at, dur?, from?, to?, ease? }` (house
  8 → 72 over 1.2 s on `E.strongInOut`), `{ kind: 'rake', at, dur, toAz, fromAz?, elevation? }` (a raking key swinging
  across a panel), `{ kind: 'arc', at, dur, azimuth: [from, to], elevation: [low, high, low] }` (a sun crossing a
  whole film), `{ kind: 'move', at, dur, elevation?, azimuth?, intensity? }`. `keyLightFrames()` gives each event's
  frames (for sound cues).
- Geometry: `shadowLength(h, e)`, `shadowOffset(h, key)`, `castShadow(foot, h, key, z)` (convex footprints),
  `sweepShadow(foot, h, key, z)` (any footprint: a glyph, a logo part), `hull`, `rectFoot`, `polyPath`,
  `faceShade(n, key)`, `floorShade(key)` (a low key darkens the floor and every top face together).
- `<ReliefScene blocks camera keyLight floor ink shadowAlpha penumbra shadowPlate contact />`: extruded blocks
  (`{ id, rect | foot, h, z?, top, side, content? }`, a unique `id` per block) seen through `reliefProjector(camera)`
  (perspective or `ortho`: `target`, `dist`, `pitch` 90 = straight down, `yaw`, `focal`). It draws the floor, contact
  shadows, one shadow path (overlaps never darken twice), then each block back to front: its visible side faces, its
  top, its HTML `content` mapped onto the top face exactly (`quadMatrix`, a matrix3d homography), and the shadows of
  taller blocks falling across that top. A negative `h` is a well cut into the floor. `reliefState()` returns all of
  it without drawing.
- `<FloatShadow box z keyLight />`: the cast and contact shadow of one flat element lifted z px above a top-down
  layout (a card picked up, a chip rising); the penumbra grows with the lift between two fixed blur levels.
- `projectOnWall(points, light, radius)`: a point light throwing silhouettes on a wall; the shadow grows and softens
  as the object nears the light.
- The product kit's surfaces (`src/kit`) are lit by the same key: a lit face, a contact shadow, a cast shadow away
  from the key.

## 2. Lit worlds

The deck's light-led directions are built from the key, without a 3D library:

- **Relief:** the product's interface cast as blocks 4-40 px high by importance, `ReliefScene` with a high
  three-quarter camera (pitch 50-62), a raking `rake` event per shot; HTML content on the top faces.
- **Sundial:** day blocks on a floor, an `arc` event over the film; tie a floor exposure plate to `floorShade(key)`.
- **Shadow play:** objects on their own planes between a point light and the wall, `projectOnWall` per frame.
- **Wells:** a slab with rect wells (`h < 0`), a 20-30° key; a rising floor is a block whose `h` goes from the well's
  depth to above the slab.
- **Face shade:** matte faces shaded by their angle to the fixed key: real faces, never a stack of thin layers faking
  an edge.

Type on a relief floor is printed raised 4-10 px (a face mapped with `quadMatrix` and its cast shadow: the same text
in ink at 0.5 offset by `shadowOffset(raise, key)` with the fixed penumbra), so its shadow follows the light event too.
It stays at film size: 36 px or more on screen whenever it is in focus for more than 6 f (blur far rows: two depth
bands, a fixed blur on the far one).

## 3. Living light that moves (`fx/LightField`)

A one-hue light field made of baked, dithered plates moved by transform and opacity only: a floor glow, pools on
closed loops, flowing bands, a rise into a reveal. **Strength is visible, not a tint:** a lightness swing of
0.05-0.20 across the field at chroma 0.13 or less, at one hue (`lib/look.ts LIGHT`). A field at a few percent of
accent alpha reads as a flat ground and does nothing.

- `floor: { plate, height, top?, strength, breathe?, rises?, lift? }`: a glow over the bottom of the frame (house 25 %
  of the height). `breathe` is a seamless sine (whole-number harmonics) on its opacity; `rises` brighten it into a
  reveal; `lift` moves a taller plate up and down: a light source climbing reads as the glow reaching higher up the
  frame, which an opacity change alone does not give.
- `pools: [{ plate, size, centre, radius?, period?, freq?, phase?, opacity? }]`: sprites on Lissajous loops with
  whole-number frequencies, so every pool repeats exactly after its period; house 240 px/s (8 px a frame at 30 fps),
  period 1-4 s.
- `bands: [{ plate, width, height, y, period?, dir? }]`: a horizontally seamless band flowing one tile per period
  (house 2 s).
- `glowRise: { at, gain, dur, hold, fall, rest }`: the whole field brightens into a reveal (house ×2 over 0.9 s,
  peaking on the hit). A rise that carries a cut sets `seam` (a `light` seam).
- `lightFieldState()`, `lightFieldFrames()` (peaks for sound cues, loop periods), `poolSpeed()`, `riseShape()`,
  `floorLift()`, `breathe()`.

Living light is one of the ways a hold stays alive (a hold over moving light passes the hold rule without moving
the type), and it counts toward the picture floor's living ground.

## 4. Light events (one per act)

The floor against a flat film asks for one light event in every act. Any of these counts:

- **The noon lift.** The key climbs from a raking 8° to 72° in about 1.2 s; every shadow collapses (cot falls fast at
  first, so the collapse front-loads); the floor and the top faces brighten together; one element keeps rising (its
  height 40 → 260 px over about 1.2 s on `E.glideOut`) and keeps the only long shadow (260 × cot 72 = 84 px against
  6-12 px). Put the reveal of the product's point on it.
- **A raking swing.** Elevation 3-15°, azimuth swinging 20-40° over a shot, so every raised thing shows by its shadow
  before it shows as a screen.
- **A glow rise** of the light field into the hit, or a pool travelling onto the subject.
- **An exposure event** (`fx/Exposure`, `references/transitions.md`): the whole frame blooms into light and settles
  out of it, or a light front sweeps across and reveals.
- **A colour event** declared in `FLASHES` (a one-frame ground flip on a hit, colour withheld until the mark lands).

## 5. Glow, spectral light and materials as devices

Light and glow, rainbow and spectral accents, iridescence, glass and multi-hue gradients are allowed when they are
**part of a device that does a job**: a tile lit from beneath that spills onto its neighbours, a border where colour
bleeds into one spectral ring, a word seen through fluted glass, a frame that blooms into light. The rules that keep
them premium:

- **One dominant accent per film.** A spectral object is the film's one signal (one object, one border, one band,
  one plate); everything else stays in the film's inks over neutral grounds.
- **Glow is physical.** A light is three stops: a near-white core, a body in the accent, a falloff to transparent; it
  comes from something visible and moves with it. It is never a uniform halo round an element, never bloom on type
  as decoration, never a radial plate behind the lockup.
- **Baked and dithered.** Every gradient, glow and spectral band is a baked, dithered plate (section 6) or a
  `ditherPlate()` at render time, moved by transform and opacity. No animated blur radius, no animated SVG filter,
  no `backdrop-filter`.
- **No neon.** Saturated colour on a dark ground with bloom around it is still a tell; a light is bright because its
  core is near-white, not because its body is pushed to full chroma.

The device book holds the builds: the [materials and VFX notes](devices/INDEX.md#materials-and-vfx) (gradients and
dither, type built from gradients, spectral and iridescent, glass and refraction, glow anatomy, glyph textures,
grades as transitions, coloured shadows) and the families [colour and light](devices/colour-and-light.md) and
[glass, glow and spectral](devices/glass-glow-and-spectral.md). The starter's primitives for them are `fx/Glow`,
`fx/Spectral`, `fx/Glass`, `fx/Gradients`, `fx/Grades`, `fx/Fringe`, `fx/BorderBleed`, `fx/TypeFill` and
`fx/Textures`.

## 6. Baked plates (`scripts/dither-gradient.py`)

8-bit CSS gradients band, and a moving gradient re-rasterises every frame. Bake every soft field once, dithered, and
move it by transform and opacity. Kinds besides the CSS-like `radial` / `linear` layers (one colour each, so each
plate is one hue by construction):

| kind | what | key fields |
|---|---|---|
| `pool` | a square sprite, alpha falling smoothly to 0 at its edge | size, color, peak, soft |
| `floor` | a full-width strip rising toward its bottom edge (`profile: smooth` for a smoothstep start) | height, color, peak, curve, sides |
| `loop` | a horizontally seamless tile (it meets itself at x = 0 and x = width) | width, height, stops, cycles, fade |
| `shadow` | an opaque plate in the ground's own hue, lightness lowered by dL (optional lift away from a point) | ground, dL, lift |
| `contact` | a soft rounded-rect sprite for a contact or lifted-card shadow | w, h, r, blur, alpha, pad |

Give a translucent plate the ground it sits on (`"over": "#..."`): the alpha dither is then scaled so the composite,
not just the alpha, is dithered by one code value. `--check` verifies the light rules on every plate: one hue within
7° (multi-hue plates belong to a declared device), chroma 0.13 or less for a light field, a lightness swing of
0.05-0.20 over its ground, and no band (runs of one 8-bit value inside a monotone stretch: p99.5 at most 24 px,
longest at most 64); `"brand": true` exempts a supplied brand colour from the hue and chroma rules. Exit 3 when a
plate fails.

## 7. Checks

- A key light, a light field and stepped layers `declare()` what they do on purpose (light seams, stepped ranges);
  forensics and the blur sampler treat declared ranges as craft.
- `look-audit.py`: `living-ground` (the ground's light moves), the floor's light event per act, `clean-finish`
  (no banding), and the one-hue gate `--trajectory` for a light field, a hue sweep or a cooling glyph.
- `palette.py --ramp 'c1,c2,...'` checks the stops of a light field or a sweep against the accent's hue.
- `lint-film.mjs`: a coloured radial falloff outside `fx/` and `lib/` is a glow and is flagged, unless the line or the
  file's leading comment declares it (`cinetic:light <what>`); element halos (box, text and drop shadows with blur in
  a light colour) are flagged everywhere; `gpu-cost` flags large blurs, animated filters and `backdrop-filter`.
