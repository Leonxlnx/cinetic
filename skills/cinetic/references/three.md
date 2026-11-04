# Three: 3D hero objects

`src/fx/three` gives a film real 3D objects for the shots where depth, light and material carry the idea: the brand's
mark as a solid that pulls back into the lockup, official icons as glass tiles in depth, a small world under a glass
dome, one product object in physical materials. Each part is one component with a few props and sane defaults, lit by
the film's world light, a pure function of the frame, and rendered like a film camera: motion blur from the shutter,
depth of field from a real lens, clean edges. Numbers are f@60 and px@1080 (`dur` in f@60; positions and sizes in px of
a 1920 x 1080 frame); every part converts them to the film's rate and size.

Use one of them where a picture needs a hero, not everywhere: one 3D shot (two at most) in a 20-40 s film. Around it the
film stays 2D. The camera rule holds inside 3D too: one move that starts, travels with its subject and lands; holds are
still; nothing bobs or spins idly; a card or tile faces the camera at rest (the only tilt is the designed move itself).

## Setup

The starter's `package.json` carries `three`, `@react-three/fiber` and `@remotion/three` (the same Remotion version as
the rest). `npm install` once. Import from `src/fx/three`:

```tsx
import { Logo3D, FlatMark, logo3DEnd, GlassTiles, GlassDome, HeroObject } from './fx/three';
```

## The parts

| id | component | what the viewer sees | when |
|---|---|---|---|
| `logo-3d` | `<Logo3D lockup={...}/>` | an extreme close-up of the extruded, bevelled mark already turning: a corner fills the frame, the near edge sharp and the far ones soft, bright lines travelling along the bevels, light top faces on dark gloss; one pull-back turns it to face the camera, presses its depth flat and lands it exactly on the 2D mark, so the swap is invisible; the lockup then builds in 2D (the mark re-centring as the wordmark slides out from behind it) | the open or the end card: the mark arriving as an object |
| `glass-tiles` | `<GlassTiles icons={[...]}/>` | official icons, crisp and in their exact colours, in thick milky glass blocks with fully rounded edges and bright rims, on an arc that opens toward the camera: the middle tiles sharp, the outer ones nearer, bigger and soft, framing them; they rise from below and behind, turning to face the camera, while the camera pushes in once and lands after them; or the camera tracks past them and lands on one as the focus pulls to it | "works with the tools you use": integrations, sources, apps |
| `glass-dome` | `<GlassDome inside="laptop" screen={...}/>` | a small world under a thin glass dome (clear, bright rims, a soft soap-film sheen) on a thick white platform with a grey bowl beneath, floating over the film's plate, big in frame and seen from the platform's own height; inside, the product's screen on a laptop on a wooden desk (or the mark on a plinth, or a hero object); icons as glass tiles on both sides, the near ones soft in the lens, the far ones seen beside and through the glass; one camera move: a push in, an orbit that lands face-on, or a dive from the whole dome into a macro of the screen | the product's world in one picture; the dive hands over to the product's UI |
| `hero-object` | `<HeroObject kind="card"/>` | one object of the idea (a phone with the product's screen, a payment card with the mark, a coin with the mark struck in, a parcel, a leaf) in physical materials, arriving with one move (turn, rise, drop with one small bounce, flip) while the light settles on it, landing still and facing the camera | payments (card, coin), delivery (parcel), mobile (phone), nature or growth (leaf) |

## Props (all optional except the first)

**Logo3D**: `lockup` `{ x, y, size }` (where the flat mark lands: the top-left of its 100-unit box and its size, as
`Mark` size + `placeMark(x, y)`); `logo` (`logoParts(svgText)` of the brand's SVG; fills are extruded); `at` (the
move's first frame: open the shot on it, the close-up is already turning), `dur` (96); `finish` `gloss | satin |
metal | glass` (`gloss`); `depth` (28) and `bevel` (2.4) in mark units (keep the bevel under half the thinnest
stroke); `from` (the close-up: `scale` 7, `yaw` -62, `pitch` 17, `roll` -8, `focus` the point of the mark at the
frame's centre); `light`; `seed` (mirrors the turn). From `logo3DEnd(at, dur, fps)` on the part returns `FlatMark` at
the lockup (the same pixels); to move the lockup on (re-centre it beside the wordmark), draw `FlatMark` yourself from
that frame.

**GlassTiles**: `icons` (staticFile paths of official SVG or PNG marks); `move` `arrive | pass | hold`; `layout` `row`
(the arc opening toward the camera) or `flank` (both sides of an empty centre for a centred line); `places` (your own:
px from the centre, y up, z toward the camera); `size` (330); `frost` (0.5: 0 clear, 1 milky); `focus` (the tile the
camera lands on and the lens focuses); `at`, `dur` (150); `light`; `backdrop`.

**GlassDome**: `inside` `laptop | mark | phone | card | coin | parcel | leaf | none`; `screen` (the product's own
screen as an image: what the laptop or phone shows); `mark`; `icons` (tiles on both sides of the dome); `move` `push |
orbit | dive | hold`; `size` (1080, the dome's diameter); `x`, `y` (where the dome sits at rest); `at`, `dur` (150);
`light` (default the `sky` stage); `backdrop`.

**HeroObject**: `kind`; `move` `turn | rise | drop | flip | hold`; `x`, `y`, `size` (phone 760 tall, card 720 wide,
coin 440, parcel 520, leaf 600); `color` (the object's own colour: the card in the brand colour, the coin's metal);
`screen` (phone); `mark` (card, coin, parcel label); `ground` `shadow | none`; `light`; `backdrop`.

Every part also takes `samples` (exactly this many samples a frame; leave it unset: 12 while something moves, more when
a wide lens asks, 4 at rest, 3 in the Studio) and `gl` (`auto`, `force`, `fallback`, below).

## Light: match the world

Pass the film's world light as `light` so the object agrees with the plate, the lit panels and the ground:

```tsx
light={{ stage: 'sky', azimuth: 312, elevation: 38 }}
```

- `azimuth` / `elevation`: where the key comes from (azimuth 0 top, 90 right; elevation toward the viewer, negative
  behind the subject for a rim or a backlit plate). Defaults: `FILM_LIGHT` in `lib/light.ts`, the same light the 2D
  lit panels use. Read it off the plate: where its sun or its brightest side is.
- `stage`: what glossy faces reflect. `studio` (a key softbox, bands overhead and on the key's side that glossy bevels
  read as bright lines, a big top light behind that top faces catch at grazing angles, a rim strip: a mark or a product
  on any ground), `sky` (a pale dome, a small sun, a bright band overhead and thin side strips: cloud and daylight
  plates), `night` (deep blue with cool strips: a navy field), `black` (near black with thin strips: glass and marks on
  black, crisp rim lines).
- `sky` / `ground`: the colours the faces reflect above and below: take them from the plate (its sky, its lower part).
- `backdrop`: the same picture the film shows behind (staticFile path) or `{ top, bottom }` colours, drawn inside the
  canvas so the glass refracts and reflects the real plate. Without it the canvas is transparent over the 2D world.

## Recipes (house numbers, f@60, px@1080)

- **logo-3d**: the mark 28 deep in its 100 box, bevel 2.4, a gloss finish, a 40 deg lens (stronger perspective than the
  stage's 30 deg; the lockup plane stays 1:1); the close-up 7x the lockup, turned 62 deg and
  turning (settleOut) while the light stage turns 120 deg, so bright lines travel along the bevels; the pull-back is one
  strongInOut over 96 f; the depth presses flat at 60-97 %, the colour settles to the flat fill at 82-100 %; the lens
  opens at 2.2 % of the focus distance on the close-up (the near edge sharp) and closes by 78 %. Land the mark alone at
  the centre, then build the lockup in 2D: the mark glides aside (glideOut, 22 f) as the wordmark slides out from
  behind it, the pair re-centred.
- **glass-tiles**: tiles 330 px, 42 % deep with fully rounded edges, corners 27 %, icon 60 % of the tile, frost 0.5; the
  row is an arc 78 % of the frame wide whose outer tiles come 360 px toward the camera; arrive: each rises from below
  and 560 px behind, turning 34 deg to face, outward from the focus tile 6 f apart, 48 f each (glideOut); the camera
  pushes from x1.3 over the whole shot (150 f, stdInOut), landing after the tiles; lens 1.8 % of the focus distance.
- **glass-dome**: dome 1080 px across; platform 1.16 R, 0.24 R thick with a rounded rim, a grey bowl 0.42 R deep; the
  rest view from the platform's height (looking down 1.5 deg at a point 0.1 R above it); tiles 0.3 R on a ring of
  1.3 R, from 26 deg (in front, over the dome's edge) round to 150 deg (behind) on each side, the side one highest;
  push: in from x1.5 and lower (settleOut); orbit: a 32 deg arc landing face-on (strongInOut), the highlights
  travelling over the glass; dive: from the whole dome to a x4.2 macro of the screen through the glass with a 16 deg
  arc (strongInOut, log-scale distance); lens 1.2 % of the focus distance. 150 f each.
- **hero-object**: turn 60 f (from 17 % aside and 420 px back, turned 72 deg; glideOut travel, settleOut turn); rise
  54 f; drop 48 f (contact at 72 %, one 3.5 % bounce); flip 72 f (1.5 turns); the light stage turns 40 deg to rest over
  the move (settleOut). Lands still.

Each part's `RECIPE` and house-number object (`LOGO3D`, `TILES`, `DOME`, `HERO`) carry these numbers.

## Composing each shot

- **logo-3d**: open the shot on the close-up (its first frame is already turning; never a still close-up waiting).
  Ground: white with one brand band, or the film's field. Keep the mark's real colours: the gloss reads them as lit
  plastic and the flat blend lands on them exactly.
- **glass-tiles**: a bright plate (sky and clouds, a pale field) keeps the milky glass luminous; on a black field use the
  `black` stage: the tiles read as glass by their rims. Five to seven tiles; a centred line above or below the row, or
  the `flank` layout round the line itself.
- **glass-dome**: the film's sky plate as `backdrop` and the `sky` stage lit from the plate's sun; the product's real
  screen on the laptop; four to six icons. The dive is the hand-over: cut or match into the product's UI on its last
  frame.
- **hero-object**: big in frame (the defaults fill a third to a half of the frame), on the film's ground with the
  `shadow` ground; one move, then let the line or the next shot take over.

## How it renders (why it looks like film, and what it costs)

`Stage3D` (`stage.tsx`) draws each frame as an average of samples: every sample poses the scene at its own instant
inside a 180 deg shutter (true motion blur), looks through its own point of the lens (depth of field, the focus plane
held still) and shifts by a fraction of a pixel (clean edges); the sample pattern turns each frame while something
moves, so a wide blur reads smooth in motion. Lit surfaces keep their exact colour up to 0.8 linear and roll highlights
off without hue shifts; unlit decals (icons, screens, plates) keep their exact sRGB colours. Glass: the tiles read the
scene behind at half resolution; the dome is a thin shell whose reflections add in full while what is behind is dimmed
only by the share it reflects.

Cost: each sample is one render of the scene. Measured without a GPU (software GL on the CPU) at 960 x 540: the logo
1.5 s a frame at 8 samples, the tiles 1.7 s at 8, the dome 2.2 s at 6 (0.2 to 0.37 s a sample); a 1080p frame costs
about four times that on the CPU. A hardware GPU draws the same samples many times faster. Measure on your machine
with a short render of the shot (30 frames, `--gl=angle`) and keep a 1080p frame under a second: 8 samples are clean for
most moves, a wide lens on a close-up wants 16 or more, a hold needs 4.

## Without WebGL: the 2D fallback

`gl="auto"` (default) draws 3D on a hardware GPU and the clean 2D version otherwise: software GL or no WebGL at all never
fails and never draws a black frame. Logo3D: the same move as a CSS-3D solid (`SolidMark`, `SOLID2D`): the mark's face
over 6-30 slices of its own silhouette receding along its depth (a slice per 2.4 px), each darker toward the back (the
side walls, 0.38-0.62 toward black), turned by the pose in a real CSS perspective, a light gradient across the face from
the key's side masked by the mark, a soft shadow under it; the depth presses to nothing and the light fades as it lands,
so the last frame is the flat lockup. While the machine renders on software GL this is the film's mark: an extruded
object, never a big flat logo shrinking (a flat logo clamped big and then shrinking read as a stall, then a pop).
GlassTiles: flat frosted tiles
in the same layout and arrival; GlassDome: a flat dome on its platform with the screen and tiles; HeroObject: the
object's flat silhouette with the same move. `gl="force"` renders 3D on software GL too (slow: for a check at half
size); `gl="fallback"` always draws 2D.

## Rules that keep it deterministic

Everything is a function of the frame: parts register an applier with `useSampler((t) => lens)` that poses their
objects at film frame `t` (fractional for the shutter's samples) and returns the lens. No clocks, no randomness outside
seeded `rand()`, no simulation that accumulates. Geometry is built once per prop change (never per frame); textures load
through `useTextures` (one delayRender, released only after the canvas that uses them has mounted). For your own 3D
object inside a part's stage, build it with `markSolid`, `slabGeometry`, `heroSolid` or `laptopSolid`, light it with
`filmLit(material, flatColour)` (glass with `thinGlass`), and pose it in a `useSampler` applier.
