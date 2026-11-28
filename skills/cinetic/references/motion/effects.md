# Effects, with a job

Effects are where generated films drown: glow on everything, a gradient behind everything, grain on white, blur on every
move, particles in every gap. Premium work uses **effects with a job**: optics (motion blur on fast moves, focus that
directs the eye, depth by layers moving at different rates), one texture family that is the film's material, and light
that is timed and shaped. Richness comes from real product detail, that one material and pictures only when they are
good (the product's or the user's own), never from haze or stock. All numbers at 30 fps, 1920x1080.

Kit (`world.tsx`): `Glow`, `Sheen`, `Grain`, `Defocus`, `softShadow`, `GridLines`; motion helpers `landBlur`, `speedOf`.
The library's effects ([library-fx.md](../library-fx.md): `LightSweep`, `Bloom`, `TrackOverlay`, `DotScreen`,
`ChromaHit`, `MorphBox`) are finished layers: start from them. `Flash` and `shake()` are deprecated: the screen never flashes and
never shakes. `Field` and `Aura` are not grounds (no faint gradient grounds).

Across every world: one light direction for the whole film; glow and glass at most once a shot, only with a meaning (the
accent, a real light source); blur on shapes and on fast frames, never on words a viewer should read; no vignette, no
muddy noise on a flat ground. A ground is a flat clean colour, a picture that passes the bar or a bold designed scene: never a pale
gradient field and never a dark ground with a soft bloom.

## Effect budget by world

| World | Texture family | Glow | Motion blur | Glass | Signature device |
|---|---|---|---|---|---|
| block grid | halftone patches, dither cells | one moment | none (stepped jumps instead) | none | stepped mosaic, halftone |
| ink on white | none, or tracking marks | none | none | none | colour state (born tint, ramps) |
| editorial paper | grain on photographs, print speckle | none | none | none | corner markers |
| soft air | grain on photographs | one rim | short, fast moves only | white glass, real backdrop | depth of field |
| dark stage, light and glass | dither (invisible) | where light exists, in its own hue, one a shot | peaks only | lit rims, frosted states | shaped light |
| footage + glass | grain on footage | text light on hero words | peaks only | backdrop blur scaled to slab | footage behind glass |
| pixel / dither | dither, mosaic, LED dots | end card only | none | one glass panel | mosaic, edge dots |

Flashes: none in any world. Pick the row before you add anything. If an effect is not in your row, it needs a reason you
can say in one sentence.

---

## 1. Glow and bloom

### 1.1 Glow sized to its source, in its own hue
**What:** a soft light behind or under a hero element. A glow is **never bigger than ~2x its object** and is the object's own
colour (a coloured light blooms in its hue, never in white). It belongs to a light source the viewer can name (a lit
screen, a beam, the accent object), never to the ground: no soft bloom spread under the hero as a lit ground.
**Kit:** `Glow` (radial gradient, blurred 20 px, breathing `pulse` ±8 % on a ~4.5 s period).

```tsx
<Glow x={960} y={600} r={300} color={accent} strength={0.4} pulse={0.06} />  // object ~300 px wide
```
**Avoid:** a white `box-shadow` glow on cards and text; a glow that is the biggest thing in the frame; glow on every element.

### 1.2 Bloom on bright things only
**What:** only elements that are actually bright (luma > ~200: specular streaks, white buttons, light cores, a logo on dark)
bloom: a blurred copy of the element (radius 18-40 px) added with `mix-blend-mode: screen` at 0.30-0.45.

```tsx
const Bloom: React.FC<{ r?: number; k?: number; children: React.ReactNode }> = ({ r = 24, k = 0.38, children }) => (
  <div style={{ position: 'relative' }}>{children}
    <div style={{ position: 'absolute', inset: 0, filter: `blur(${r}px)`, opacity: k, mixBlendMode: 'screen' }}>{children}</div>
  </div>);
```

### 1.3 Text glow
A blurred copy of the same text behind it (r 20-30 px, in the accent) only on the hero word of a scene, often blooming as the
word's colour changes. Never on body copy, never as a default text style.

### 1.4 Glow as an event
Light timed as a beat, not a constant, and on the object, never over the frame: an object **charges** (fills with white
from one end, 10 f, settling at ~70 %); a docked object's rim lights for 3 f; a warning state turns a band of glyphs the
alert colour with a ~20 px glow for exactly 3 f (the only glow in a flat film). Never a wash over the whole frame.

---

## 2. Rim light

**What:** the line of light along an object's edge that makes it read as a solid in space.
**Numbers:** 1-3 px; the **top edge brightest** (80-95 % white), sides ~50 %, bottom 60-70 % (light from above). A dark bar may
have a glint only along the middle of its top edge (90 % fading to 20 % over ~240 px). 3D planes: white 2-3 px plus a 30-40 px
glow in the world's colour along the leading edge. A circle may carry a crescent rim on its inner lower edge (~35 px) in the
accent.

```tsx
<div style={{ borderRadius: 64, background: 'rgba(20,22,28,.72)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(255,255,255,.35), inset 1px 0 0 rgba(255,255,255,.18), inset -1px 0 0 rgba(255,255,255,.18)' }} />
```
**Avoid:** an even 1 px white border all round (reads as a sticker, not a lit edge).

---

## 3. Glass done right

Glass is the most abused material in generated films: a translucent rounded rectangle with a blur. Real-feeling glass has
**something behind it, a lit rim, a moving highlight, and a state**.

### 3.1 Blur what is really behind
Use `backdrop-filter` only when a picture, footage or a busy world is behind the glass, and scale the blur with the slab: ~6 px
for small bubbles, ~12 px for pills, ~24 px for big panels, ~28 px for frame-sized cards (bigger glass looks thicker, so the
world behind is softer). The interior may flatten toward a uniform tint + 10 % white. Primary controls on glass are **opaque**
(a solid dark send disc) so the action reads. No drop shadows on glass in a dark world.

```tsx
<Card t={lightUI} w={1140} h={128} glass style={{ backdropFilter: 'blur(12px) saturate(1.2)',
  background: 'rgba(255,255,255,0.10)', borderRadius: 64,
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,.8), inset 0 -1px 0 rgba(255,255,255,.55)' }} />
```

### 3.2 Glass on a flat ground: a lit gradient, not a blur
On a flat colour ground there is nothing to blur, so backdrop blur adds nothing. Fake the glass with light:
`linear-gradient(225deg, ...)` of 4-5 close tones of the ground (lighter in the middle band), plus a `radial-gradient(at 0% 0%,
rgba(255,255,255,0.10), transparent 40%)` highlight, a 1 px rim at ~16 % white, radius ~7 % of the width, no shadow.

### 3.3 The moving specular streak
**What:** what makes a dark rectangle read as glass: a short white streak on the rim that **slides**. A 3 x 170 px white core
whose opacity along its length is a Gaussian (sigma ~45 px), plus a 10 px soft glow, additive, clipped to the rim band (±8 px).
One streak parked on the top rim at ~55 % of the width; one on the bottom rim sliding right to left ~25 px/f over ~24 f
(`ease.inOut`), its brightness flickering 0.4-1.0 slowly. Bloom the core; dither it so it does not band.
**Avoid:** a full-width shine sweeping across the face (cheap), a streak brighter than the text.

### 3.4 Glass solids (3D)
Per-face tints (2-3 related hues at alpha 0.45-0.7, never uniform), white 2 px edges, a fresnel-strong rim (tint stronger at
the silhouette, clearer in the middle), and an **interior light** (the hero's halo inside the object). Dark glass can be glass by
rim alone (a 3-5 px coloured rim with a 20 px inner glow and a second faint rim 40 px inside for thickness).

### 3.5 Frost to clear (a state change as a beat)
A frosted object (bright bevel edges, milky inside) clears over ~12-15 f into transparent glass while it straightens and recedes
~10 %. Pair with a snap morph hidden in blur (`turns.md` 5.6).

---

## 4. Texture: one family in a film

A film may carry **one texture family** as its material, and that is a sign of care, not noise: grain on photographs and
footage, a halftone or dot screen, dither cells, a lens (a slight barrel, a CRT curve), tracking marks with x/y tags,
print speckle on paper. Pick one from the world's row, use it on its surfaces, and use it as transition material at least
twice (the dots that rebuild the next picture, the halftone that eats a layer): a texture that builds the next image is
a bespoke join ([film-grammar.md](../film-grammar.md#joins), material bridge).
- **Grain** (animated, fine, re-seeded each frame) on photographs and footage (~2.5 % luma), scoped to that layer. Never
  on a flat ground or on UI: there it reads as mud.
- **Dither** against banding is invisible (under 1 % luma); the kit adds it where a gradient needs it.
- **Halftone, dots, tracking marks:** crisp and deliberate, on a grid, static per picture or stepped on twos; never
  boiling, never generic glitch (RGB tearing, VHS noise).

**Kit:** `Grain` (SVG turbulence, overlay blend, 0.03-0.05), scoped to the photographic layer; the library's `DotScreen`,
`TrackOverlay` and `DotReveal` for dots and marks.

```tsx
<div style={{ position: 'relative', overflow: 'hidden' }}><Photo src={src} w={1200} h={800} /><Grain amount={0.04} /></div>
```
**Avoid:** two texture families in one film; grain on white, paper or a flat dark ground; texture as a "cinematic" default
with no surface under it.

---

## 5. Motion blur only at real speed

**What:** blur that follows real velocity, on the frames that need it.
**Rules:**
- Blur only frames moving faster than ~15 px/f (or ~3 %/f in scale), typically the 4-6 fastest frames of a whip, a fall, a
  zoom-through or a fast pan. Everything else is razor sharp; that contrast is what makes the fast moves feel fast.
- 180-degree shutter: smear length ≈ half the per-frame displacement.
- Directional, not isotropic: CSS `blur()` is round, so for a real smear render 4-6 copies offset along the velocity at 1/n
  opacity each (or a scale-stretch along the axis, as the kit's `Push` does, plus a light blur).
- **Blur pulses**: a Gaussian blur on the stage group only (never the background) that peaks at velocity peaks (2 -> 26 px) and
  is zero on holds.
- **Landing blur**: 3-6 px clearing in 3-4 f after a carried cut (`landBlur`).
- Remotion's motion-blur components exist but are expensive; budget render time and reserve them for a few shots.

```tsx
const pos = (f: number) => 960 - 420 * accel(f, 50, 8, 1.5);
const v = speedOf(pos, frame);                    // px per frame
const n = v > 15 ? 5 : 1;
{Array.from({ length: n }, (_, k) => (
  <div key={k} style={{ position: 'absolute', opacity: 1 / n, transform: `translateX(${pos(frame) + (k / n) * v * 0.5}px)` }}>{card}</div>
))}
```
**Avoid:** blur on every move; blur on slow frames; motion blur on text that must be read.

---

## 6. Depth of field

Depth of field is a storytelling tool, not a filter, and it blurs shapes (cards, icons, photographs, objects), never a
block of text (`Defocus` wraps children placed at a depth and blurs each by its distance from the focus):
- **as focus** (a rack focus between two layers says which one matters now; the other stays readable as a shape);
- **as depth** in an orbit (front-centre 1-3 px, sides 4-8, nearest 8-12, background 3-4);
- **as an entrance** (focus pull: 40 -> 0 px over 22 f decoupled from position);
- **as isolation** (unchosen options blur 4-12 px).
Never blanket-blur a whole UI for "cinematic depth", and never set a statement over blurred UI.

---

## 7. Chromatic, pixel and dither: devices, not filters

- **Chromatic fringe:** 1-2 px red/blue on the outer letters of large type, or ±20-30 px offsets inside a texture montage. Never
  on UI, never as a global "lens" effect.
- **Pixel mosaic:** the transition of a digital or pixel brand (`turns.md` 4.3). Non-square blocks, mean colour, anchored grid.
- **Ring-dot edges (data leaking out of a picture):** along strong edges and over the darkest third of a graded picture, tiny
  white rings (7-9 px, 1.5 px stroke) and dots (2-3 px) on a 10-12 px pitch, opacity 0.55-0.9, chosen per cell by a hash. Static
  per picture (it moves with it; it must not boil). Generate offline (CPU: Sobel on a 192 x 108 copy, threshold ~0.18). Exit
  variant: 4 f before a mosaic, double the marks' size and opacity ("pixels escape"). Never on flat UI.
- **Halftone patches:** fine dot screens in margins and behind tables: texture without noise, ideal for flat grid worlds.
- **Stepped time as an effect:** mosaics, voxels, cell growth and sprites on twos or threes inside a smooth film.
- **Pixel notches:** a square tile gets a small square bite at each corner on one frame: a nod to a pixel heritage.

```tsx
<div style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.22) 1.2px, transparent 1.6px)',
  backgroundSize: '7px 7px', width: 420, height: 260 }} />   // halftone patch
```

---

## 8. Light sweeps

- **Sheen on glass:** a diagonal band that crosses an object once (kit `Sheen`, 22 f, 20 deg). Once per object, on a cue (the
  object lands, a state completes). A completed row may get a 120 px white 35 % screen band at ~60 px/f.
- **Beat-locked shimmer** on a status line (`text.md` 2.5): period = one beat.
- **Synced sheen pulses** across skeleton cards (135 deg, twice, ~25 f each).
- **One sheen on the wordmark** during its settle. Then nothing.
- **A travelling bright section** along a bar or rail (data flowing).

```tsx
<div style={{ position: 'relative', overflow: 'hidden', borderRadius: 34 }}>
  <Card t={darkUI} w={688} h={313} glass>{content}</Card>
  <Sheen start={236} dur={22} angle={20} strength={0.35} />
</div>
```
**Avoid:** looping sheens; a sheen on every card; a sheen as an "idle animation".

---

## 9. No flashes

The screen never flashes: no white or tinted flash to hide a swap, no flash gate, no dip-then-flash, no impact wash, no
release flash on a button. A swap is hidden by something the viewer watches covering the frame (`turns.md` 6); an impact
is sold by the object (`camera.md` 7.3); a press is answered by its target (the button's own fill and state change).

---

## 10. Shaped light (dark-stage worlds)

**What:** light as a set of shapes that are built and retired on cue. Every light is an absolutely positioned element with
`mix-blend-mode: screen` and a blurred copy of itself as bloom (blur 24-40 px, opacity 0.35-0.45) in its own hue.
- **Pillar:** a quad with a horizontal Gaussian profile (`linear-gradient(90deg, transparent, #fff 45%, #fff 55%, transparent)`) and
  a halo copy blurred 40 px in a light tint; grows from an edge (`entrances.md` 1.6).
- **Cone:** an inverted triangle with **sharp edges** (2-4 px) and a 30-60 px inner falloff (a blurred inner polygon), dropping from
  above in 3 f and widening slowly for 2 s; its fill hue drifts over ~60 f. Reads as stage light, not fog.
- **Neon arc:** an SVG arc with a 30 px blurred copy; as the camera pulls back its stroke thins 40 -> 4 px and its opacity falls to
  0.4 over 12 f: glow that behaves like a real object at a distance.
- **A lit set, not a lit ground:** shaped light falls on objects and a floor in a designed 3D scene (`softStudio`); the
  ground itself stays a flat clean colour. No soft light fields, drifting lobes or broad blooms as the ground.
**Avoid:** soft fog cones; white bloom on coloured light; lights that pop in at full size; a dark ground with a soft bloom.

---

## 11. Vignette, lens and particles

- **Vignette:** none. No dark corners; a ground light lifts the centre instead of darkening the edges.
- **Barrel bulge:** only during a push into dense UI (edges bow ~14 px, k up to 0.06), crisp at the peak (`camera.md` 2.4).
- **Particles:** almost never. Allowed: small dots travelling along lines (data flow), ~40 star dots of 1-2 px in a deep-space
  transit, 6-10 speed lines (2-3 px x 80-300 px at 60 %) when an object flies between two others, and a few light-painting curls
  (2 px, 6 px glow, 40-110 px, each living 2-4 f, redrawn every frame) around converging comets before a logo. No bokeh, no dust,
  no confetti, no lens flares.

---

## 12. Finish

- **Never pure black while content is visible** on a dark stage (a flat deep tone of the accent's hue); true black only
  after the last beat.
- **Idle life:** things that have landed keep a small life (a bob, a blink, a sheen travelling along an edge, a counter, a
  caret); stripes scroll. "Never two identical frames" until the lockup's final hold.
- **Banding check:** every dark gradient on a contact sheet at 100 %; add dither (never visible grain) where it bands.
- **Colour:** render and deliver in BT.709; check the darkest and brightest frames after encoding.

---

## 13. Shadows and 3D light

- **Layered soft shadows** from the film's one light (`softShadow`): 4-6 shadows whose offset and blur double (1, 2, 4, 8,
  16 px ...), each at about 7-12 % alpha, tinted toward the ground's hue at lower lightness. One grey `box-shadow` looks
  flat; shadows falling different ways on different objects look pasted.
- **Contact shadow:** a short, darker shadow where an object meets its surface, spreading and softening with height.
- **3D:** soft area light on a mid-grey environment (`softStudio`), rounded or bevelled forms, matte, clay or frosted
  materials, depth of field on the background. Never a black room with hard light strips, never faceted chrome.
- **Icons with depth** (`AppIcon`): 2-4 layers lit from the same side as the scene's shadows (a base fill, a lighter top,
  a 1 px inner highlight on the lit edge, a tinted contact shadow), shown large and few, one meaningful part animated.

---

## Not in the kit yet (build these by hand from the recipes above)

- **`Bloom`:** a component that adds a blurred screen copy of its children (thresholding is not possible in CSS; the convention
  is "wrap only bright elements").
- **`RimLight`** (per-side rim from a light direction) and **`RimGlint`** (the sliding specular streak clipped to a rim band).
- **`GlassSolid`:** per-face tinted CSS 3D glass with edges, fresnel rim and an interior glow (the kit's `Box` is opaque).
- **`Smear`:** directional motion blur by ghost copies driven by a position function, active above a speed threshold.
- **`BlurPulse`:** a stage-group blur driven by camera speed.
- **`HorizonGlow`**, **`LightPillar`**, **`NeonArc`**: the rest of the shaped-light set (the kit has `Beam`, a hard-edged cone,
  `Pool` and `GlassPanel` for lit flat-ground glass), each with its own-hue bloom.
- **`Halftone`** and **`EdgeDots`** (offline generator + static overlay + flare exit).
- **`ChromaticSplit`:** an RGB offset wrapper for large type and texture montages.
- **`SpeedLines`**, **`TravelDots`** (dots along a path), **`Comets`** (twin heads on a spiral with tapered trails).
- **`Grain` scope and seed:** a sigma-style amount for photographs.
- **`Glow` events:** `Glow` only breathes; a `charge` envelope (rise, peak, decay frames) on an object would cover
  charge-ups and rim lights on contact.
