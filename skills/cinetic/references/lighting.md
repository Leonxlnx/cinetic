# Lighting: the key, living light, light events and baked plates

A cinetic film is lit. Every raised thing casts a shadow from one key, sits on a contact shadow and has faces that are
lighter toward the key; the ground carries light that moves; every act has a light event. Light is how a code-made
picture stops looking flat. A radial glow behind the subject or the lockup is not light: it is the stock look.

**Light is motivated and subtle.** Every light has a source the picture could have (the key, a window, a lamp, the
product's own screen) and you feel it more than you see it: a ground is flat or a key falloff from one side of
0.02-0.10 L, a face lifts 5 % toward the key at most, a lift on arrival stays inside the arriving element. No white
haze over the frame, no pool of light behind a line or a lockup, no vignette that reads as fog, no glow pill behind a
line unless it is a real part of the product's UI. **Every element in frame has a job:** no plate, box, pill or shape
floats on the ground unless it carries text, an icon, a mark or the product's real state. `look-audit.py` fails a
pool or haze over the ground (`ground-haze`) and faint shapes that carry nothing (`filler-shape`).

**Every product shot stands on a place, never a flat grey field.** A flat neutral ground is a clean page (L* 88 or
more) or a black void (under 12); the grey and charcoal between them reads as a field with no place. A UI shot stands
on the key's lit gradient (`fx/Grounds` `key`: the key side lifted, the far side falling deep, 12 L* or more across the
frame) or on a plate of the film's own picture (`plate`: a photo or a still of its footage, blurred 24-40 px, veiled
toward the base, the key's gradient over it, breathing slowly). A template's stage turns its product shots into
places with `placeGrounds(grounds, ui, { src })` and names the film's picture in `PLATE_SRC`. A dark card is lit too:
8 L* or more over its ground (the kit's dark themes hold it), a rim on its key-side edges and an inner top highlight
(kit `Surface`, `CARD_LIGHT`). `look-audit.py` fails a film on flat grey or charcoal grounds (`ground-plate`) and dark
cards one step off their ground (`card-separation`).

Every primitive here is a pure state function of the frame (`xxxState(frame, props, film)`, closed form, any order,
any fps) plus a thin component drawn with transforms, opacity, clip paths and SVG polygons. Blur radii are fixed props
(one shadow group, two ladder copies at most), never animated. Every fx exports `declares(props, film)`. Numbers are
60 fps frames (`f@60`) and pixels at 1080p unless they say otherwise.

Contents: 1. The key (`fx/KeyLight`) · 2. Lit worlds · 3. Living light (`fx/LightField`) · 4. Light events ·
5. Glow, spectral light and materials as devices · 6. Baked plates (`dither-gradient.py`) · 7. Product UI in a lit
place (`lib/light`, `fx/Lit`, `fx/Grounds`) · 8. A world and light that reads it (`fx/world`, `fx/light`) · 9. Checks

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
0.05-0.20 across the field at chroma 0.13 or less, at one hue (`lib/look.ts LIGHT`); behind UI keep it near neutral
(C ≤ 0.025), and a field that fills the frame at full chroma is a declared colour event, not the stage. A field at a
few percent of accent alpha reads as a flat ground and does nothing. A light field is a place's light (a lit floor, a
window, a lamp the film shows) or a light event, never the default ground behind type and UI: there the ground stays
flat or keyed from one side, and a pool sitting behind a line reads as haze (`ground-haze`).

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
- **An exposure event** (`fx/Exposure`, `references/transitions.md`): the arriving element lifts one step and settles,
  the frame passes through light on a declared light seam, or a light front sweeps across and reveals; it never
  leaves a white haze held over the picture.
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

## 7. Product UI in a lit place (`lib/light`, `fx/Lit`, `fx/Grounds`)

A product placed in a lit space with depth reads as crafted; a front-on card on one flat ground reads as a template.
Three primitives fix that without a photograph, all read the same light and all are pure functions of the frame.

**The film's one light (`lib/light.ts` `FILM_LIGHT`).** One token for the whole film: `azimuth` (where the key comes
from on the layout: 0 top, 90 right, 180 from below the frame, 270 left; house 315, the upper left), `elevation` (house
34), the rim's peak alpha (house 0.8) and the ground spill (house 0.14). Set it once from the brief (an upper-left
window, a floor glow from below at azimuth 180-210 and elevation 15-25, a raking side key) and never per shot: a panel's
rim, its shadow, the ground's lit side and the beams of a window ground all follow it. The maths (`toKey`, `keyDir`,
`awayAngle`, `panelNormal`, `faceLight`, `faceShift`, `keyLocal`, `onGround`) follows the CSS axes of a panel turned by
`rotateZ rotateX rotateY` and the fx/KeyLight conventions, so relief scenes and lit panels share one sun.

**A lit panel (`fx/Lit`).** The default for a product screen that is not full-frame:

| Number | House | Range |
|---|---|---|
| tilt | 0 / 0: the panel faces the camera at rest | a declared turn only (an entry from a turned pose, a turn the shot is about, landing face-on): 8-14 on each axis while it turns |
| perspective | 2200 px | 1800-2600 |
| lift off its backing | 36 px | 24-60 |
| rim | 1 px on the edges facing the key, peak alpha 0.8 | the gradient runs to nothing on the far side |
| face | lift (light colour) or shade by n . l against front-on, gain 0.35: the lift at most 0.05, the shade at most 0.22 | no veil over the product |
| sheen | the light's colour at 0.03 along the key-side edge, gone by 40 % across | never a white wash over the face |
| spill | the ground colour at 0.14 from the far side to 55 % across | 0.08-0.22 |
| shadow | on a backing plane parallel to the panel, thrown lift x in-plane light / facing light (at most 3 x lift), penumbra 2 + 0.34 x throw between two fixed levels (6 and 20 px), alpha 0.55, the ground 0.26 darker | |
| contact | the footprint grown 6 px, a fixed 14 px blur, 0.38 | |
| life | none at rest: the panel holds still between its moves (no sway, no float, no bob: lint `idle-bob`); it moves when it enters, when its content changes and when it leaves | the old sway only as an object (`sway={{ ... }}`), which lint fails |
| entry | from tilt 24 / -18, 90 px low, lift 0, on E.settleOut over 48 f, landing face-on | the one place a lit panel is turned |

```tsx
<LitGround frame={f} spec={{ kind: 'wash', base: theme.ground }} />
<Lit frame={f} x={1010} y={560} w={1160} h={740} r={56} ground={theme.ground} enter={{ at: CUE.panel }}>
  <ProjectPanel frame={f} theme={theme} w={1160} h={740} lift={0} />
</Lit>
```

Draw the panel at (0, 0) in its own box (a kit surface with `lift` 0-6: Lit draws the shadow its real pose throws).
The light is the rim and the shadow; the product's own colours and type stay as designed (no bloom, no haze).
Under a coloured key (a floor glow in the accent's lift) pass `rim={{ color }}`: the rim, the sheen and the lift take
the light's colour. `RimEdge` and `rimLine()` give any other turned box the same rim (fx/DepthStack uses them).
A glass card, a pill or a prompt box that stands frontal still has a side: `fx/Rim` `KeyRim` draws its border brightest
toward the key (`light`, degrees: 0 from the right, -90 from above; house -35) and thinning to 12 % on the far side,
with a soft spill just past the lit edge (18 px at 0.18). One key per film, so every rim in it faces the same way.
`litFrames()` gives the entry and its landing for the sound; Lit declares nothing.

**Grounds (`fx/Grounds`).** The place behind the product, built in code and clean: the flat base, or a very subtle
lit falloff keyed to the film's light (the key side a little lighter, the far side a little into the ground's shade).
Plates are for a film whose place has that light and asks for it by name; each is a signed-distance falloff baked
once as a dithered half-size sprite and moved by transform (no animated blur, no banding, no bokeh discs).

| kind | what it draws | reads as |
|---|---|---|
| `flat` | the base colour alone | a clean field (house, with wash) |
| `wash` | the base and the key falloff, nothing else | a lit wall, studio paper (house) |
| `pools` (asked) | the wash, one broad pool on the key side and 2-3 pools at different depths | lamplight falling through a space |
| `bars` (asked) | the wash and 3-5 tall bars defocused by about their own width, tapering at both ends | a lit room behind the product, out of focus |
| `floor` (asked) | a rise of light from the bottom edge and bars standing in it, brighter at their foot | a stage lit from below |
| `window` (asked) | 2-3 beams slanting along the key, brighter at the key end | sun through a window |
| `tint` (asked) | the base, then the accent's tint gathering along one tilted edge (`fx/Washes` `tilted`) | a lit page with a direction: the film's one colour ground, under nodes, pills or a diagram |

- **Strength:** a lightness swing of 0.06 across the frame (0.02-0.10: the key is felt, never seen); a kind the film
  asked for keeps its plates within its gain x the swing (pools 0.9, bars 1.1, window 1.0, floor 1.6). Name the light
  in the file (`cinetic:light <a lamp, a lit room, sun through a window>`): lint-film warns on plates with no light
  named for them (`filler-light`).
  On paper light has nowhere to go: the swing comes from the shade and the shapes become soft shadows (bars widen into
  shadow bands, there is no pool). A `floor` in the accent's lift (`light: C.accentLift`) is a coloured light field:
  chroma 0.13 or less, and behind UI keep it low or white.
- **Light, not motion:** a ground's key plate may drift slowly (7-12 px/s on a 14 s loop) as light, never as a moving
  object; a hold over it may be still. With a declared camera move (`cam: { shot, base }`) the ground rides at the
  background weight.
- **Variety:** never the same ground on more than 2 consecutive shots. `groundKey()` names a ground (kind and base: a
  re-seeded field of the same kind is the same ground), `groundRuns()` lists the runs that break the rule and
  `dealGrounds(n, { bases, seed })` deals a film's grounds with holds of at most 2 shots (a held ground keeps its seed:
  the same place across the cut): the clean kinds on the film's bases, unless `kinds` names the ones its place has.

**Composition in planes.** `<Planes base shot bg mid fg />` draws three sibling layers under one camera at the weights
bg 0.25, mid 0.6, fg 1.0 (`layerShot()`, lib/camera `weighShot()`); at least one element is cropped by the frame edge
(`croppedByEdge()`: 12 % of its own size past an edge, `cropCheck()` on a frame's boxes). A frame that holds everything
whole inside the margins reads as a slide. The multi-object beat in three scaled, defocused planes is `fx/DepthStack`
(`references/camera.md` §8): every item in it says what it carries (`carries`: ui, text, mark, icon, photo, data) and
shows it, a far tile softer and smaller but still a real screen or mark, never a blank card at depth.

## 8. A world, and light that reads it (`fx/world`, `fx/light`)

A film stands in one place, and its light comes from somewhere in that place. `<World>` draws the place (a real
photograph or clip graded for the film, or a lit field baked once) and shares its key light and its ground with the
light parts inside it: `Glass` frosts exactly what is behind it, a rim is brightest on the side that faces the key and
has a glint where the edge meets the light, a sweep is that light crossing the edge, glowing type takes the world's
light. A gradient behind a card is a backdrop; a world with a key is a place. One world per film, dealt from the
film's name (`dealWorld(name, { from, avoid })`), never cut inside the film: one `<World>` under the whole film, or
one per scene of the same kind with the shot's camera inside it.

```tsx
import { Reveal, World } from './fx/world';
import { Bloom, Glass, GlowType } from './fx/light';

<World kind="clouds" src={staticFile('plates/clouds.jpg')} soft={staticFile('plates/clouds-soft.jpg')}
       push={{ from: 0, to: 90, scale: 1.06, y: -18 }}>
  <Glass x={420} y={520} w={1080} h={112} at={10} sweep={30}>{the input: plus, typed text, send}</Glass>
</World>
<World kind="blackField">
  <Bloom strength={0.4} box={{ x: 460, y: 420, w: 1000, h: 220 }}>
    <Glass x={460} y={420} w={1000} h={220} r={40} at={0} sweep={[16, 70]}>{the prompt}</Glass>
  </Bloom>
</World>
<World kind="deepField"><GlowType text="Find the right one" role="display" at={12} /></World>
```

**The worlds** (`worldOf(kind, { accent })` gives each one's colours, key, type and glass for the film):

| kind | the place | its key light | type | glass on it |
|---|---|---|---|---|
| `clouds` | a sea of clouds from above, the horizon high | a low sun, top right | white, a soft shadow | frost smoked in the plate's deep tone, white rim |
| `aerial` | land or coast from high above | top left | white | smoked frost |
| `sea` | open water to a far horizon | above | white | smoked frost |
| `nightCity` | a city at night, its lights soft | from below, the street | white | dark smoke |
| `macro` | a close natural surface: leaves, drops, moss | top left | white | smoked frost |
| `sky` | a pale sky with soft clouds, looking up | top right | ink | milky |
| `studio` | a seamless studio sweep under a softbox | top left | ink | milky |
| `blackField` | near-black under a softbox, a fine woven surface where the light falls | above | white | dark glass lit by its rims, glints and sweeps |
| `electric` | a saturated blue stage, lit from the top | top left | white | a light veil, a deep blue shadow |
| `deepField` | a deep navy, light rising from the floor | the floor | white or glowing | dark, a tinted rim |
| `paleSky` | a pale sky built in code, the sun's side bright | top right | ink | milky |
| `nearWhite` | paper lit from the top left, for real photos in cards | top left | ink | milky |

The first seven are plate worlds (a picture, `src`); the last five are built (no picture: a lit field baked once at
half size, dithered). The hue windows (`WORLD_HUE`) keep a green, red or yellow accent out of the ground: the
electric stage takes the accent's hue only when it is a blue, the deep field a blue or teal, a plate's tint a sky's
blue; anything else gives the world's cool default (brand-and-color.md §9b, worlds).

**Plates.** `node scripts/assets.mjs plate clouds` runs the preset's searches (keyless sources, landscape, no people,
no text) and saves a contact sheet. Choose for light and for a calm area where the line and the glass will sit, then
`node scripts/assets.mjs plate clouds --pick 3 --to public/plates --accent '#2F6BFF'` writes `clouds.jpg` (16:9 on
the preset's focus, warm light drained, cool, the film's hue in the split) and `clouds-soft.jpg` (blurred 40 px at
1080p: what glass frosts, and the far depth); `--from <file>` grades a picture you already have; a clip gets a 960 px
`-soft.mp4`. The grade is baked, so in film the plate draws with no filter at all. `depth="far"` blurs a plate behind
UI in focus, but the soft copy given as `src` costs nothing: prefer it.

**The parts** (each a pure state of the frame, `glassState`, `sweepState`, `igniteState`, `revealState`, `plateMove`):

| part | what it is | the props a shot sets | cost per frame |
|---|---|---|---|
| `World` | the place: plate or field, haze toward the horizon, the corners falling off; the black field's woven surface where its key falls; shares its key and ground | `kind`, `src` and `soft` (plates), `push` | one image, two or three baked overlays |
| `Glass` | a pane of frosted glass: the world behind it blurred, a veil lighter toward the key, a line of light inside the top edge, the bottom edge's shade, a rim with a glint | `x y w h`, `at` (rises 26 px and clears in 30 f), `sweep`, `sweepKind` | one clipped copy of the soft plate, gradients |
| `RimLight` | the lit edge alone: brightest toward the key, a white-hot glint where it faces the light and its bloom past the edge | `w h` (`x y` in frame px; 0 inside a placed box) | one masked element |
| `LightSweep` | a light crossing the pane once (54 f, `E.stdInOut`). On a bar or an input (w ≥ 2.5 h) a band: a tilted bar of light catches the top and bottom edges together, two white-hot streaks with a fan of light off each, the face lit along the bar. On a card an edge light: a head running along the rim, a flare, a fading tail, turning the corner | `w h at`, `kind` (`band` or `edge`; the default follows the box) | four sprites (band) or one SVG and two sprites (edge), while it runs |
| `GlowPool` | a pool of light the place has (under a pane, a screen's spill, a floor), turned on once | `x y r ry at` | one image |
| `GlowType` | a line that is a light: tinted white-hot letters, a tight glow and a wide one; words ignite in a phrased run | `text role at` | three copies of the line, two blurred |
| `Bloom` | the bright parts of its children blurred and added | `strength`, `box` (where the light is) | one blurred copy of its box |
| `Reveal` | the world opening out of a shape: a sparkle on the dark becomes a cloud-edged iris (lobes of different widths, the seed turning a quarter as it opens), a pressed button grows into the frame, the camera flies through the mark | `at shape` (+ `box` or `path`) | a clip path while it opens |

**Recipes** (catalogue style: pick for what the line says; the product's own UI goes inside):

| id | what it is | built with |
|---|---|---|
| `glass-input-over-plate` | the product's input as frosted glass over a real sea of clouds; the line above it, the input types, a band of light crosses it when it lands | `World clouds` (one `push`) + `Glass at sweep` |
| `black-glass` | a dark glass pane on the black field's woven surface, white type; a band of light crosses it when it lands and again when it sends, its top and bottom edges flaring together | `World blackField` + `Bloom box` + `Glass r={40} sweep={[land, send]}` |
| `electric-card` | one big glass card (1000 px wide or more) on a saturated blue stage: a real thumbnail, a title, rows that complete | `World electric` + `Glass w={1120} h={740}` |
| `glowing-line` | words that ignite as light on a deep field, then the name ignites | `World deepField` + `GlowType at` |
| `iris-into-world` | a sparkle on the dark field opens in a cloud-edged iris into the plate; it turns ink and stays as the product's button | `World deepField` + `Reveal shape="scallop" seedAfter={ink}` round `World clouds` |
| `iris-into-input` | the same open, then the seed hands over to the product's button and the input grows out of it: a white disc arrives under the ink sparkle as the seed fades (the sparkle drawn at the seed's point, turned by `REVEAL.seedTurn * revealState(f, ...).e`, so nothing jumps), then a glass pill widens from the disc and the button rides to its right end, the placeholder fading in last | `Reveal` as above + inside the plate world a disc and sparkle at the frame centre + `Glass` whose `w` grows on `E.stdInOut` over 20 f |
| `button-opens-world` | the pressed button grows into the frame and becomes the next place | `Reveal shape="button" box={button}` |
| `through-the-mark` | the camera flies through the product's mark into the world | `Reveal shape="path" path={{ d, w, h, origin }}` |

**Rules.** The world holds still: its one move is `push` (it starts, travels, lands and holds) or the shot's own
camera; no drift, no breathing. A sweep is an event (the pane lands, the input sends), never a loop. A glow pool is a
light the place has, never behind a line or a lockup. Glowing type and bloom live on dark worlds (`deepField`,
`blackField`, `nightCity`); on a pale world type is ink and nothing blooms. Bloom wraps only what emits light and gets
a `box`. Type on glass takes `useWorld()?.spec.glass.text`; a white line on a plate takes `spec.typeShadow`. Glass
frosts the world, not other UI: keep panes apart or make the nearer one opaque. Content is big: a card on a stage is
1000 px wide or more, an input 1000 px or more with 36 px type. The older `fx/Glass` modes (refract, flute,
thin-film), `fx/Glow` and `fx/Iris` stay devices; inside a world, use these.

**Cost.** Measured on software GL on a shared CPU (no GPU; a GPU renders several times faster), at 1080p: a glass
input over a cloud plate with its push and a band sweep about 1.0 s a frame, a black glass pane with bloom and a
band sweep on the woven surface about 0.63 s, an iris opening into a plate about 0.77 s, a glowing line while its
words ignite about 0.7 s (settled, its blurred copies are cached), a big glass card on the electric stage with its
edge light about 0.34 s; at half size the proof
shots take 0.3-0.6 s a frame including the browser's start. No filter animates; every blur radius is fixed; the
plate's grade is baked; a soft plate replaces live frost; the black field's surface is one image baked once (a CSS
mask over a tiled background, redrawn under moving UI, cost six times as much).

### Light on the right surface

- A glow on a press falls on what was pressed: added light (plus-lighter) shows only where the surface under it is dark,
  so on a white card in a dark world it vanishes on the card and glows on the world past its edge (a glow behind the
  card). Light a press on a light surface with the accent in normal blend, clip it to the card, and size it to the button
  (0.8x its longest side); launch-simple's `Bloom1 on="any"` does both when the shot does not know the surface.
- A light card in a dark world is lit by the world: kit/card gives it a 3 L* vertical sheen and its top edge catching the
  key (`CARD.edge`: a hairline of light just outside it); never a halo of haze round it.
- Type on a photograph stands on a soft pool of the place's own deep tone (`TYPE_POOL`: 0.42 at its middle, 1.6x the
  line's width, 3x its height, fading in with the first word): a line over a bright band of cloud or haze reads at 3:1
  or better; a text-shadow halo round each letter only muddies them.

## 9. Checks

- A key light, a light field and stepped layers `declare()` what they do on purpose (light seams, stepped ranges);
  Lit, Grounds and DepthStack are continuous and declare nothing (DepthStack a camera-blur range when given one);
  forensics and the blur sampler treat declared ranges as craft.
- `look-audit.py`: `living-ground` (the ground's light moves), the floor's light event per act, `clean-finish`
  (no banding), `ground-haze` (the ground's light rising to a pool inside the frame more than 0.025 L over its
  brightest edge: a haze, a pool behind the content, a fog vignette), `filler-shape` (faint shapes on the ground that
  carry no text, icon or mark), and the one-hue gate `--trajectory` for a light field, a hue sweep or a cooling glyph.
- `palette.py --ramp 'c1,c2,...'` checks the stops of a light field or a sweep against the accent's hue.
- `lint-film.mjs`: a coloured radial falloff outside `fx/` and `lib/` is a glow and is flagged, unless the line or the
  file's leading comment declares it (`cinetic:light <what>`); element halos (box, text and drop shadows with blur in
  a light colour) are flagged everywhere; `filler-light` warns on a baked pool, haze or glow asset and on ground
  plates with no light named for them, `filler-plate` on blank boxes generated at depth and depth-stack items with no
  `carries`; `gpu-cost` flags large blurs, animated filters and `backdrop-filter`.
