# Library: finishing effects

The finishing layers that make a frame rich: light crossing a surface, a bloom on a light source, tracking marks over a
moving object, a dot screen, a channel split on a landing, and one rounded shape that becomes the next. Import them from
the kit (`import { LightSweep, Bloom, MorphBox } from '../../kit';`). The reel `library-fx` shows every piece with its
name; `frames.mjs library --category fx` lists them.

An effect finishes something that is already right; it never carries a scene on its own. Once per surface, on the
moment that matters, and never as a way to hide a cut: a flash of light, a screen shake or a strobe are never effects.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [LightSweep](#lightsweep) | emphasis | 12 f | a band of light crosses a surface once, a soft glow with a thin hot line at its leading edge, clipped to the box | a card, a button or a glass panel at the moment it matters |
| [Bloom](#bloom) | emphasis, idle | 17 f | light that spills in its own colour: a blurred copy added on top, swelling once on a hit | a bright thing on a dark ground that should glow, or pulse once |
| [TrackOverlay](#trackoverlay) | idle, emphasis | 60 f | motion tracking over a moving object: turning boxes, centre dots, live coordinates and dashed arcs between targets | an analytic, technical layer over something that moves |
| [DotScreen](#dotscreen) | idle, join | 30 f | the content seen through a grid of round dots, an LED board or a coarse halftone; animate the dot size to turn | a big word or a picture as an LED board; a turn between two through the same grid |
| [ChromaHit](#chromahit) | emphasis | 2 f | on an impact the colour channels split for two frames and snap back | a landing the viewer sees: wrap the thing that lands |
| [MorphBox](#morphbox) | build, join | 14 f | one rounded shape becomes the next (a pill, a card, a window), each stage's content wiping in behind a soft edge | thinking becoming an answer, a pill becoming a card becoming a window |

<!-- /library:pieces -->

## The effects

### LightSweep
A band of light crosses a surface once: a broad soft glow with a thin hot line at its leading edge, clipped to the
surface's rounded box. On a card, a button, a glass panel.
```tsx
<LightSweep at={T.sweep} dur={12} w={1000} h={150} radius={36} angle={18} color="#FFFFFF" strength={0.75} width={0.35}><Prompt /></LightSweep>
```
- Numbers: 10-14 f on expo in-out, the band 35 % of the surface, tilted 18 deg; `blend` screen (on a white surface use a
  tinted `color` and `blend="multiply"`).
- Caution: once per surface; a sweep on everything is wallpaper.

### Bloom
Light that spills in its own colour: a blurred copy of the content added on top, so bright parts glow; `pulse` swells it
once on a hit.
```tsx
<Bloom radius={36} strength={0.45} pulse={{ at: T.live, up: 3, down: 14, gain: 2.2 }}>{orbAndWord}</Bloom>
```
- Numbers: blur 18-40 px at 30-45 %; a pulse to about 2x over 3 f and back over 12-14 f.
- Caution: dark grounds only; on a light ground it greys the picture.

### TrackOverlay
Motion tracking laid over a moving object: a thin box round each target that turns with it, a dot at its centre, the live
coordinates above it (they count every frame), dashed arcs that draw between the targets and sweep past them with an
arrowhead; optional guide lines to the frame edges or corner brackets instead of boxes.
```tsx
<TrackOverlay at={T.track} track={(f) => glyphs.map((g) => ({ x: g.x(f), y: g.y(f), w: g.w, h: g.h, rot: g.rot(f) }))} color="#FF3B4E" dot="#FFB020" corners={false} guides={false} size={24} />
```
- Numbers: 1.8 px boxes, a 10 px dot, labels 24 px set 1.5 lines above the box, arcs 1.6 px dashed 10/8 drawing in over
  10 f; it cuts on.
- Caution: the target must move (a drift, a tilt); tracking a still object looks like a template.

### DotScreen
The content seen through a grid of round dots: an LED board or a coarse halftone; unlit dots show faintly on dark.
`amount` blends it with the plain content, to key it on for a few frames or hold it.
```tsx
<DotScreen pitch={15} dot={0.8} amount={1} off="rgba(255,255,255,0.09)"><BigWord /></DotScreen>
```
- Numbers: an 11-16 px pitch, dots 0.8 of it, unlit dots about 9 % on black.
- As a turn (the reel): the word's dots shrink to nothing over 6 f (ease in), the next picture lights up in the same grid
  as its dots grow from 0.05 to 0.86 of the pitch over 10 f (ease out), then `amount` relaxes to 0.55 over 14 f. Animate
  `dot`, never toggle `amount` on and off: a keyed flicker reads as a strobe.
- Caution: words through it need weight 700 or more and 300 px or more, or they break up.

### ChromaHit
On an impact the colour channels split for two frames and snap back. Wrap the thing that lands, not the frame.
```tsx
<ChromaHit at={T.land} px={14} frames={2} angle={0}><PhotoCard /></ChromaHit>
```
- Numbers: 2 f at 14 px then 10 px, clean on the third. No push and no shake: the object's own landing (a scale from
  1.2 to 1 over 6 f) does the moving.
- Caution: one or two hits a film, on a landing the viewer sees; wrap the object, never the whole frame.

### MorphBox
One rounded shape that becomes the next (a thinking pill, a reply pill, a card, a window) with no pop: position, size,
radius and colour move together, each stage's colour and content wipe in left to right behind a soft lead edge, the old
content clears in the first frames.
```tsx
<MorphBox shadow={softShadow(4, GROUND)} stages={[
  { at: 0, box: { x: 960, y: 560, w: 140, h: 72, r: 36 }, color: '#EEF1F6', content: <Dots /> },
  { at: 16, box: { x: 960, y: 560, w: 520, h: 84, r: 42 }, color: '#FFFFFF', content: <Title />, dur: 10 },
  { at: 32, box: { x: 960, y: 560, w: 720, h: 320, r: 34 }, color: '#FFFFFF', content: <Reply />, dur: 14 },
  { at: 64, box: { x: 960, y: 560, w: 1240, h: 500, r: 28 }, color: '#FFFFFF', content: <Window />, dur: 14 },
]} />
```
- Numbers: 10-14 f per stage on a quint out; the wipe starts 8 % into the stage and is done at 70 % (expo in-out), so no
  soft band lingers on the far edge; old content gone in a quarter of the stage.
- Caution: lay each stage's content out at that stage's size; content wider than its box is cut. Keep the stages in one
  surface colour (grey thinking pill, then white): a stage that turns the accent colour reads as a sudden colour change.

## Helpers
The effects use the library's SVG filters (`PixelFilter`, `SmearFilter`, `SplitFilter`, in
`src/kit/library/_shared.tsx`; see [library-turns.md](library-turns.md#helpers)).

## In the reel

Every piece's frames in the reel (`--film library-fx`), and the one command that shows just that piece: its frames in
one still (run it in a film project; `render --film library-fx --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| LightSweep | `library-fx` | 0-65 | `node scripts/frames.mjs library --strip LightSweep` |
| Bloom | `library-fx` | 66-129 | `node scripts/frames.mjs library --strip Bloom` |
| TrackOverlay | `library-fx` | 130-209 | `node scripts/frames.mjs library --strip TrackOverlay` |
| DotScreen | `library-fx` | 210-293 | `node scripts/frames.mjs library --strip DotScreen` |
| ChromaHit | `library-fx` | 294-365 | `node scripts/frames.mjs library --strip ChromaHit` |
| MorphBox | `library-fx` | 366-465 | `node scripts/frames.mjs library --strip MorphBox` |

<!-- /library:reel -->
