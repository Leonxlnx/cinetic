# Depth and 3D

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Depth from timing and focus: parallax rates, foreground bokeh, type placed between layers, selective focus, objects with physical arcs.

[Type sits between layers of the picture](#type-sits-between-layers-of-the-picture) · [Hero objects fly with physical arcs](#hero-objects-fly-with-physical-arcs) · [Only what matters stays in focus](#only-what-matters-stays-in-focus) · [Layers move at different rates](#layers-move-at-different-rates) · [Shadows and rims tinted with the accent](#shadows-and-rims-tinted-with-the-accent) · [Cards fly in and drift in depth forever](#cards-fly-in-and-drift-in-depth-forever) · [Tiles orbit a hero on a ring](#tiles-orbit-a-hero-on-a-ring) · [A pixel glyph swings in as an extruded voxel solid](#a-pixel-glyph-swings-in-as-an-extruded-voxel-solid) · [Tiny word in front of a giant ghost of itself](#tiny-word-in-front-of-a-giant-ghost-of-itself) · [Soft foreground objects pass close to the lens](#soft-foreground-objects-pass-close-to-the-lens)

### Type sits between layers of the picture

`dv-type-depth-interleave` · signature · energy medium · any · primitive: recipe (plain layers)

Type is placed in depth: a near tile slides over the headline and clears; across a cut the caption stays put but the product is now in front of it; a headline sits behind a circle and rises out from behind it; a large phrase fades in behind a card that overlaps it; words are uncovered by tiles sliding away. **When:** Making type and product share one space. **Avoid:** Occluding the key word for long.

- **Anatomy:** Z-order changes on cuts; occluding objects moving across the type.
- **Timing:** Occlusions 38-66 f; cut 0 f.
- **Sound:** A drum on the cut.
- **Build:** Recipe: render the type between two picture layers (a matte of the foreground object above it).
- **Materials and numbers:** Captions move through the plates like props: over the subject, then behind her after the mask, a product standing in front of two letters, a giant word rising behind the product; one plane change per beat, always on a cut or the mask-confirm frame. During a fast pull-back the headline can tuck behind the rising panel's top rim (the panel moving about 1.8x the headline's speed, a vertical blur of 40-60 px on both).

### Hero objects fly with physical arcs

`dv-object-flight-3d` · signature · energy medium · launch, sting · primitive: Flight

Objects move like objects: a glossy sphere is thrown in on a parabola (x and y on different ease-outs) and the camera tracks and overtakes it; a sphere enters huge and rolls to the vanishing point; a disc, a ring and a cylinder fly past along a diagonal axis toward the camera; small cubes rain out of a tile with the near ones defocused; a cube rides through a cylinder seen refracted; two spheres slide in from both sides and spring-land. **When:** 3D brand worlds; a hero object reveal. **Avoid:** UI films; objects moving on straight eased lines.

- **Anatomy:** Parabolic paths; scale by depth (422 -> 71 px); fly-bys 120 -> 900 px in 5 f; rain 2 f apart at 15-30 px/f; spring zeta 0.70 with 7 % overshoot.
- **Timing:** 12-120 f.
- **Sound:** A snare on the rain; a bubble pop at the landing peak.
- **Build:** `<Flight at from to apex scale={[a, b]} stretch orient>{object}</Flight>` (fx/Flight): x on E.glideOut and the lift on its own curve (a parabola-like arc in closed form), stretched along the velocity at speed; scale by depth through `scale`; RackFocus by depth for the near ones.
- **Materials and numbers:** Glossy objects share one shading recipe: a pale highlight upper-left, the accent through the middle, a deep shade at the base and a large soft halo of the accent around them on light grounds (radial gradient at 35 % 30 %: near-white, light tint 30 %, accent 65 %, deep 100 %; halo blur about 60 px at 60 %). Pills get an extrusion: a duplicate in the deep shade offset (-8, +10) px behind, and a 1 px light inner top edge.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Only what matters stays in focus

`dv-selective-focus` · workhorse · energy calm · any · primitive: RackFocus

Focus does the pointing: the layout blurs and darkens while the camera pushes and a toast appears sharp over it (the defocus leading the toast by 4-6 f); older chat messages blur and grey as they scroll under the header; the second word of a pair is held soft; a window zooms in while its wallpaper pulls into focus. **When:** Directing attention without moving things. **Avoid:** Blurring the copy the viewer must read.

- **Anatomy:** Background defocus 19-28 px plus a 15 % darken; hero sharp above.
- **Timing:** 20-42 f.
- **Sound:** Whooshes leading the toast.
- **Build:** `<RackFocus levels hero>`.
- **Materials and numbers:** Fake lens depth on flat UI: in a list only the focused row is sharp and each row further away is softer (blur proportional to the distance from a focus band, isotropic, no bokeh shapes); foreground icons in the corners are huge and fully defocused; plain colour tiles placed in a grid as blurred out-of-focus depth (4-6 px, growing toward the edge) make sharp icons read nearer.

### Layers move at different rates

`dv-parallax-depth-planes` · workhorse · energy calm · any · primitive: camera-moves

Text, tiles and the paper grid push at three different rates (text x1.16, tiles x1.08, grid not at all); walking silhouettes at five sizes move at speeds matching their depth; defocused tiles drift slowly behind a close-up. **When:** Any flat frame that should read with depth. **Avoid:** Equal rates (it reads as one flat layer).

- **Anatomy:** Rates 1 : 0.5 : 0 (type, cards, ground); far layers blurred one level.
- **Timing:** Over the move (35-63 f); background drift 1-3 px/f.
- **Sound:** A stop-down under a fast push.
- **Build:** parallax(layers, move) with w 1, 0.5, 0.

### Shadows and rims tinted with the accent

`dv-tinted-shadows` · workhorse · energy calm · launch, feature · primitive: recipe (plain layers)

Cards and objects cast shadows in a dark tint of the accent instead of grey, and a round window carries a soft rim of the accent's light on one side, so the whole layout feels lit by the brand's world. **When:** Light grounds with a strong accent; floating cards; a portal or porthole. **Avoid:** Dark grounds, where tinted shadows vanish; mixing with grey shadows in one film.

- **Anatomy:** Card shadow 0 20px 50px in the accent at 35 %; a porthole rim 6px 8px 18px in the accent at 45 % on one arc (4 to 7 o'clock); card rim 1 px white; backdrop blur 10 px when the card is translucent.
- **Timing:** Static material; the rim intensifies as the object defocuses into the next scene.
- **Sound:** None.
- **Build:** Recipe: box-shadow with an accent rgba; an offset coloured shadow for a lit rim.
- **Materials and numbers:** The shadow hue is the accent pulled toward its darker neighbour, never black; keep its alpha 0.3-0.45.

### Cards fly in and drift in depth forever

`dv-floating-card-field` · accent · energy calm · launch, feature · primitive: Cards

About twenty tilted 3D cards fly in from all edges in a third of a second and decelerate to a slow drift that never stops; each tile keeps its own arc, one approaching, one receding, others drifting across. **When:** Galleries, templates, examples as a world. **Avoid:** Straight-line drifts (give each an arc).

- **Anatomy:** Fly-in p90 34-41 px/f decelerating to 1.15 px/f (half-life about 0.2 s); per-tile depth arcs (206 -> 397 px, 375 -> 129 px).
- **Timing:** Fly-in 85 f; drift 285 f.
- **Sound:** The music drops out under the drift.
- **Build:** Cards cardArrive per card with a seeded tilt, then a closed-form drift with a slow z term.

### Tiles orbit a hero on a ring

`dv-ring-orbit` · accent · energy calm · launch, feature · primitive: OrbitRing

Six or seven app tiles orbit a horizontal ring around a hero object at constant angular speed; front tiles pass in front of it, back tiles behind. **When:** Integrations or features around a product. **Avoid:** Fast orbits (about 60 deg/s).

- **Anatomy:** Ring in perspective; z-order by angle.
- **Timing:** Constant over 128 f.
- **Sound:** None.
- **Build:** `<OrbitRing x y n r speed tilt render hero>` (fx/Orbit): items on a tilted ring (ringPoint: depth scale 0.72-1.08) at constant angular speed, back items drawn behind `hero` and front items in front.

### A pixel glyph swings in as an extruded voxel solid

`dv-voxel-glyph-swing` · accent · energy high · launch, sting · primitive: no primitive yet (recipe below)

A giant pixel numeral or symbol first shows as a sliver of grey side faces, then swings to face the camera as a voxel solid (white front cells, light grey extruded sides on every step) and settles flat into a slow pan. **When:** A pixel-font identity; one hero glyph (a currency sign, a number, a mark). **Avoid:** Soft, organic brands.

- **Anatomy:** One box per on-cell of a 7 x 9 bitmap; front faces white, side faces 78-83 % grey, extrusion 0.4 of a cell; cells about 60 px at 1080p; perspective rotateY 70 -> 0 deg.
- **Timing:** 12 f expo-out, then the pan.
- **Sound:** Music onset just before; a whoosh under whatever reveals it.
- **Build:** CSS 3D: a preserve-3d group of cell boxes (front and side faces) under one perspective rotation; a flat SVG once the angle reaches 0.
- **Materials and numbers:** Side faces #C8C8C8 to #D4D4D4; edges keep 1-2 px of grey anti-alias so the solid stays crisp.

### Tiny word in front of a giant ghost of itself

`dv-giant-ghost-backdrop` · accent · energy medium · launch, feature · primitive: Words

A huge light-grey ghost of a word fills the frame behind a small black version of the same word, which doubles in size in one frame. **When:** A word about size or scale ("Big"). **Avoid:** Ghosts dark enough to compete.

- **Anatomy:** Ghost at 3-5 % contrast; foreground step x2 in 1 f.
- **Timing:** Step 1 f; hold 70 f.
- **Sound:** None needed.
- **Build:** Two Words layers (ghost at display size, foreground small) + HardStep scale.

### Soft foreground objects pass close to the lens

`dv-foreground-bokeh` · accent · energy calm · any · primitive: RackFocus

Out-of-focus objects in the foreground (warning signs in the corners, big soft black dots drifting in, a dark silhouette across the bottom) give the frame a near layer. **When:** Tabletop sets, data scenes, a zoom that needs depth. **Avoid:** Bokeh over the subject's face or the copy.

- **Anatomy:** Foreground blur 10-20 px; drift along curved paths settling around the subject.
- **Timing:** Arrivals 40 f sine-out; static blur moving with parallax.
- **Sound:** None.
- **Build:** Foreground layer at a fixed ladder blur level, moved by parallax w > 1.
