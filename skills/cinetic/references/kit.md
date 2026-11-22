# The kit: API reference

Everything lives in `src/kit/` of a film project and is imported from one place:

```tsx
import { Words, Camera, At, ease, at, mix, springAt, springs, Card, Brand, Cues, Music } from '../../kit';
import { sfx } from '../../sfx'; // written by scripts/sfx.mjs get
```

Frames are 30 fps unless you change `src/films.ts`. Positions are px in the film's frame (1920x1080 unless the film sets
`width`/`height` in `src/films.ts`; `useVideoConfig()` gives them). Every component reads the
current frame itself; you pass **start frames** taken from the film's timeline object `T`.

## Contents
1. Motion core (`motion.ts`)
2. Type (`type.tsx`)
3. Camera (`camera.tsx`)
4. World (`world.tsx`)
5. Product UI (`ui.tsx`)
6. Turns (`turns.tsx`)
7. Marks and icons (`icons.tsx`)
8. Sound (`sound.tsx`)
9. Fonts (`fonts.ts`)
10. Project layout and scripts

---

## 1. Motion core

| Function | What it does |
|---|---|
| `ease.out` | expo out, `cubic-bezier(0.16, 1, 0.3, 1)`: the default arrival |
| `ease.soft` | quint out `(0.22, 1, 0.36, 1)`: heavy arrivals (hero card, lockup) |
| `ease.snap` | `(0.05, 0.9, 0.1, 1)`: tiny UI pops, chips, cursor targets |
| `ease.inOut` | expo in-out `(0.87, 0, 0.13, 1)`: travel that starts and ends at rest |
| `ease.glide` | quart in-out `(0.76, 0, 0.24, 1)`: gentle long pans |
| `ease.in` | expo in `(0.7, 0, 0.84, 0)`: leaving, ends at full speed |
| `ease.back` | `(0.34, 1.36, 0.64, 1)`: ~6 % overshoot for things that land with weight |
| `ease.linear` | colour, clocks and real rates only |
| `at(frame, start, dur, curve = ease.out)` | progress 0..1 of a move, clamped |
| `mix(p, from, to)` | map progress to a value (not clamped, so springs may overshoot) |
| `springAt(frame, fps, start, config)` | spring progress from `start`; configs in `springs.ui / card / pop / heavy` |
| `envelope(frame, start, end, inDur, outDur)` | 0 -> 1 -> 0 for a thing that comes and goes |
| `stagger(i, base = 3, jitter = 0)` | compressing delay for item `i` (`base * i^0.82`) so lists accelerate into place |
| `accel(frame, start, dur, r = 1.45)` | accelerating exit (each frame's step `r` times the last), ends at peak speed |
| `creep(frame, start, dur)` | 0..1 expo-out over a hold: `scale(1 + 0.012 * creep(...))` keeps a held shot alive |
| `landBlur(frame, start, px = 6, frames = 4)` | blur that clears as a shot arrives already moving |
| `carry(frame, cutAt, v, dur)` | offset for a shot that enters at the outgoing shot's speed `v` and settles to 0 |
| `logScale(from, to, p)` | exponential zoom (equal visual speed at every scale): use for every zoom over 1.5x |
| `keys(frame, [[f, v], ...], curve)` | keyframed value |
| `onTwos(frame, n = 2)` | stepped clock for digital things (pixels, glyphs, stop-motion) |
| `rand(seed)` | deterministic 0..1 |
| `sec(s, fps)`, `clamp(v)` | helpers |

Pattern:
```tsx
const f = useCurrentFrame();
const p = at(f, T.card, 18, ease.out);            // arrive
const q = accel(f, T.cardOut - 10, 10);           // leave at speed
const style = { transform: `translateY(${mix(p, 80, 0) - q * 900}px) scale(${mix(p, 0.94, 1)})`, filter: `blur(${mix(p, 8, 0) + q * 20}px)` };
```

## 2. Type

**`<Words>`** builds a line unit by unit.
- `text`, `start`, `by: 'word' | 'char' | 'line'` (use `\n` for line breaks with `by="line"`).
- `arrive`: `rise` (masked rise with a few degrees of tilt), `blur`, `scale`, `drop` (spring), `slide`, `flip` (3D), `cut` (each unit
  appears on its frame, no ramp: for rhythm on the music).
- `gap` (frames between units, compressing), `dur` (frames per unit), `times` (exact start frame per unit).
- `born="#hex"` + `settle`: each unit is born in a colour and settles to the line colour (fresh words glow).
- `accent={['word']}` + `accentStyle`: style chosen words (colour, italic serif).
- `leaveAt`, `leave: 'rise' | 'fall' | 'blur' | 'scale'`, `leaveDur`.
- `style` must carry the colour when you use `born`. `align`, `width`.

```tsx
<div style={{ fontFamily: fonts.geist, fontWeight: 620, fontSize: 180, letterSpacing: '-0.045em' }}>
  <Words text="Ship it tonight" start={T.title} arrive="rise" gap={4} style={{ color: INK }} accent={['tonight']} accentStyle={{ color: ACCENT }} />
</div>
```

**`<Build words={['Your', 'work,', 'handled.']} times={[T.a, T.b, T.c]} born="#hex" style={{ fontSize, color }} />`** an append
build: each word joins the centred line on its frame (put them on the music's plucks) and the line re-centres with most of
the travel in the first frames, the new word riding in with it. Widths are measured from the real face. A word may be a slot
that holds an object in the line: `{ slot: 190, node: <Brand name="claude" size={170} /> }` (width in px; the mark joins the
sentence like a word).
**`<Swap items={['design', 'code', 'ship']} start every={24} dur={12} times />`** one slot whose word rolls to the next (items may
be nodes: a mark plus a name; `times` sets the frame each item takes over; `enter` brings the first item in).
**`<Typing text start cps={16} caret placeholder />`** and **`useTyped(text, start, cps)`** (returns `{ shown, done, doneAt }`):
human cadence with seeded hesitations and pauses after punctuation; `burst={3}` types three words and lands the rest at
once (use it: reading along at typing speed is dead time); `keyFrames` is the frame of every key (put a key
sound on some of them, drive a caret-following camera from them).
**`typingTimes(text, start, fps, cps)`** the same cadence as a pure function (key sounds, cameras outside the component).
**`<Scramble text start per={1.5} flicker={8} />`** letters decode from glyphs, left to right: short labels only.
**`<Odometer value from start dur prefix suffix sep decimals />`** digits on reels; low digits spin and blur, high digits tick over last
(`decimals={1}` for 92.4).
**`<Marker start dur color>`** a highlight sweeping in behind a word.
**`useTextWidth(text, style)`** the laid-out width of a piece of text in the real face (place a tile, a mark or an underline
exactly after a word).
**`mixColor(a, b, p)`** blend two colours.

## 3. Camera

**`<Camera keys={[{ f, x, y, zoom, rx, ry, rz, curve, cut }]} perspective={2200}>`** wraps a 1920x1080 world in a 3D stage.
`x, y` pan (px), `zoom` (log-space), `rx` tilts the world back (look down), `ry` turns, `rz` rolls. Each key's `curve` shapes the
travel into it (default `ease.inOut`), or `curves: { pan, zoom, rot }` separately (a dive that swings in-out and zooms
ease-in); `cut: true` jumps on that frame (punch-in, hard reframe). `cam={...}` sets a fixed camera;
`origin="x% y%"` sets the point the zoom and orbit pivot on (default the centre); `perspective` (default 2200 px) sets how
strongly depth reads: a large object hinged inside the world (a door, a lid) swings toward the lens with a short
perspective, so give it its own layer with a longer one. To add an offset to a keyframed camera, add to the values
`camAt(frame, keys)` returns (`cam={{ ...c, x: c.x + dx }}`); replacing `x`/`y` throws the keyframed pan away.
**`<At x y z rx ry rz scale anchor>`** places a child in the world (z toward the camera).
**`safeBox(frameW, frameH)`** the box type and the subject stay inside (vertical films: clear of the platform's UI at the top
and bottom). **`camSmear(frame, keys)`** motion blur in px from the camera's own speed (apply to the world group on fast moves).
**`fillZoom(w, h, frac = 0.8)`** the zoom that makes a w x h box fill the frame. **`diveZoom(w, h)`** the zoom at which a box
exactly covers the frame (dive into an element, cut to its inside at that frame). **`toScreen(cam, x, y)`** where a world
point lands on screen under a flat camera (start a flying card or a flood exactly where an object sits). **`drift(frame, dur, push, turn)`** a living
push and turn to add to a held camera. **`shake(frame, start, dur, amp)`** an impact shake.

```tsx
<Camera keys={[{ f: 0, zoom: 1.6, rx: 18 }, { f: 30, zoom: 1, rx: 8, curve: ease.out }, { f: 90, zoom: 1.04, rx: 6, curve: ease.glide }]}>
  <At x={960} y={540}><Card t={ui} w={900}>...</Card></At>
  <At x={1500} y={300} z={-400}><Chip t={ui}>Synced</Chip></At>
</Camera>
```

## 4. World

- **`<Ground color>`** flat ground. **`<Aura base blobs={[{ color, x, y, r }]} speed>`** a slow living gradient of soft fields.
- **`<GridLines size color thickness start reveal>`** a line grid; inside a `Camera` with `rx` it becomes a floor.
- **`<Box w d h color top front side topContent frontContent sideContent radius edge shadow>`** a solid CSS 3D block with a
  contact shadow on the floor (`shadow={0}` for none); content sits *on*
  its faces (type and UI printed on objects). Light from the top-left. `shade(hex, amt)` darkens or lightens.
- **`<DepthStack items={[{ f, node }]} x y scale lift blur dim push rise>`** a depth ladder: each arrival pushes the older items back
  a slot (smaller, lifted, blurred, dimmer).
- **`<Beam open color x w0 w1 floor>`** a hard-edged beam from above; **`<Pool open color x y>`** its pool on the floor;
  **`<GlassPanel w h tint lit sheenAt>`** glass on a dark or flat ground made of a lit gradient, a top rim and an inner edge.
- **`lerpBox(p, a, b)`** (motion) one box becoming another: position, size and radius together, so a plate visibly becomes a
  bar that becomes a card.
- **`<Glow x y r color strength pulse>`** a light sized to its source. **`<Sheen start dur angle>`** a light crossing glass once.
- **`<Grain amount still>`** (always the top layer, 0.03-0.08; `still` for paper fibre), **`<Paper color fibre>`** a still paper
  ground, **`<Stroke d start dur color width wobble>`** a hand-drawn line that draws itself (sketches, underlines, circles),
  **`<Vignette amount color>`**.

## 5. Product UI

Themes: `lightUI`, `darkUI`; spread one and set the brand: `const ui: Theme = { ...lightUI, accent: '#E8572A', font: fonts.inter }`.
Fields: `surface ink muted line fill accent accentInk radius font mono shadow`.

- **`useArrive(start, kind = 'card' | 'pop' | 'ui' | 'heavy', from)`** returns `{ p, style }`: rise, scale and de-blur on a spring.
- **`<Card t w h pad glass>`**, **`<Window t w h title>`** (app chrome), **`<Bubble t from="me|them" start size>`** (springs from its
  corner), **`<Thinking color size>`** (three bouncing dots), **`<InputBar t text start w size placeholder cps leading sendAt>`**
  (types, lights the send button, presses it), **`<Row t icon title sub trail size>`**, **`<Chip t icon tone>`**, **`<Toast t start icon
  title body>`**, **`<Terminal t w h lines={[{ f, text, kind: 'cmd' | 'out' | 'ok' | 'dim' }]} chrome>`** (`chrome={false}`
  for a full-frame terminal in macro), **`<Progress t start dur>`**,
  **`<Button t label pressAt primary icon>`** (dips and brightens on the press), **`<Avatar name color size src>`**.
- **`<StatePill t states={[{ f, label, bg, ink, icon }]}>`**: a label that changes state on its frames (Connect -> Synced): a cut
  with a pop and a colour change. Show UI by state changes when a pointer would be fussy.
- **`<Cursor keys={[{ f, x, y, curve }]} clicks={[frame]} size start exitAt>`**: a real arrow pointer; paths arc (never straight lines),
  it leans into fast travel, idles with a 2 px drift at rest, presses dip it; `follow={{ from, to, at: (f) => ({ x, y }) }}` makes it ride a dragged
  object's own path. `cursorAt(frame, keys)` gives its position for
  things that follow it; `<CursorShadow keys size>` adds a landing shadow that converges as an oversized cursor lands.
- **`<Relay anchor={{ x, y }} artefact={node} hosts={[{ f, node }]} lift>`**: integrations as a relay: the artefact pinned at
  one screen point, the hosts (each a full-frame composition you build: a full-bleed page, a tilted plane, a macro crop)
  changing behind it on their frames, a small settle at each cut (`pose` on a host tilts the artefact with a tilted host). See [cards-ui.md](motion/cards-ui.md#relay).
- **`<PartnerSurface t brand file kind="chat|tracker|mail|doc" title items={[{ f, who, text, meta }]} landAt>`**: the
  product's artefact landing inside another product (a message in a channel, an issue in a tracker): a generic surface
  with that product's real mark in the header; the item at `landAt` arrives lit. Integrations as use, not logo rows.
- **`<Spinner start doneAt size color done>`**: working -> done: an arc stepping 45 degrees a frame that closes into a check.
- **`<Wall cols rows w h gap start wave from render={(i) => ...}>`**: the same thing in quantity, filling in a compressing
  wave from the centre; pair it with a camera pull-back for the "all of it" scale jump. Every item must be real content
  (a real title, real lines), never grey placeholder bars.
- **`<ChatStack t msgs={[{ f, from, text }]} w bottom size fadeAbove>`**: a bottom-anchored chat; each message cuts on and rises,
  older ones move up and blur by recency.
- **`focusStyles(p, accent)`** returns `{ chosen, rest }` styles to isolate one element (ring + lift vs blur + dim).

Sizes that read on a phone screen: UI text 26-40 px, rows 30+ px, cards 900-1300 px wide, the camera 1.1-1.5x on the subject.

## 6. Turns

Each takes `from` and `to` (the two shots as nodes), `start`, `dur`, and renders the right one outside the turn.
- **`<Iris x y shape="circle" | "rounded" | svgPath ring>`** the next shot opens in a growing shape (log-space).
- **`<Tiles cols rows order="diagonal" | "center" | "random" | "left" color>`** tiles sweep from the old shot to the new.
- **`<Pixelate max>`** mosaic up, swap at the peak, resolve (a full-frame turn: its filter does not work on a small clipped
  element). **`<Push dir smear>`** both shots travel as one strip.
- **`<ZoomThrough x y depth>`** fly into a point until it fills the frame, then the next shot settles from slightly zoomed in.
- **`<TileFlip front back w h start cols rows wave>`** one element turning into another tile by tile (a sketch into the real
  card).
- **`<Flood from={{ x, y, w, h, r }} start dur color under to>`** a ground cut grown from an object's own box (a button, a
  card) until it fills the frame; `to` (the next shot) appears inside it (`reveal` shows it at full opacity, a window
  opening); `source` keeps the object (a URL, a label)
  readable on top while it floods.
- **`<Flash start dur color>`** a burst of light that hides a swap at its peak.
The strongest turns are built by hand from the scene's own objects (the full stop that grows, the card that becomes the next
screen): see [turns.md](motion/turns.md).

## 6b. Imagery (`imagery.tsx`)

- **`<Photo src w h grade={{ dark, light, look }} develop zoom panX panY start dur radius position>`**: a picture that covers its
  box, graded into the film's one look (`look` is a CSS filter for every picture); `develop` (0..1) cross-fades it from the
  grade's duotone to true colour, the way a found or generated picture arrives; it drifts slowly (`zoom`, `panX/Y`).
- **`<TextWindow text src reveal zoom position panX panY style>`**: letters as windows onto a picture (heavy faces, big sizes).
- **`<Compare before after split w h line handle labels>`**: a before/after with a divider at `split` (0..1).
- **`<Selection x y w h start dur color label>`**: a box with corner handles that draws itself around what the product found.
- Pictures live in `public/` (`img/...`): the user's, or licensed and recorded (`assets.mjs`, see [assets.md](assets.md)).

## 6c. A hero object in 3D (`gl.tsx`)

**`<GLView id build draw state width height ss>`** draws a three.js world (a ring, a device, a glass solid) with ONE
shared WebGL renderer into each view's own canvas, so the 36-frame sheet never runs out of WebGL contexts (a
`<ThreeCanvas>` per view does). `build(renderer)` makes the scene once; `draw(world, state, renderer)` poses it for a
frame; keep `state` a small plain object. **`studioEnvironment(renderer, accent)`** is a dark studio of strip lights for
metal and glass (`scene.environment = ...`, a `MeshPhysicalMaterial` with metalness 1, roughness 0.25-0.35).
For glass use `transmission` on a `MeshPhysicalMaterial`; anything meant to show inside the glass (a beam, a glow sprite) needs
`depthTest: false`, or the glass reads opaque. A light ray is a camera-facing ribbon with a soft hot-core and halo texture, not
a cylinder (tubes show hard edges). GL frames render slowly on the CPU: keep `ss` at 1-1.25 and split finals into short parts.
Light it from an environment, never flat; dive through it (a tunnel of the same object), tip it into a line or a dial: the
object carries the film.

## 7. Marks and icons

- **`<Brand name="github" size color="brand" | "#fff" file>`**: a company mark. Without `file`, from Simple Icons (CC0 path data; the
  marks remain their owners' trademarks) in the brand's own colour. Some brands are not in Simple Icons (their owners asked for
  removal, e.g. OpenAI, Slack, Microsoft products, AWS): fetch the official file with
  `node scripts/logos.mjs get <name> --film .` and pass `file="logos/<slug>.svg"`.
- **`brandHex(name)`** the brand colour. **`<BrandTile name size bg radius>`** a mark on an app-icon tile.
- **`<Icon name="Calendar" size color stroke>`**: interface glyphs from Lucide (lucide.dev/icons), by component name.

## 8. Sound

- **`<Cues cues={[{ at, src, leadMs, volume, rate, maxS }]}>`**: each effect starts `leadMs` early so its transient (or, for
  whooshes and swells, its peak) lands exactly on frame `at`. Spread the entries of `src/sfx.ts`: `{ at: T.press, ...sfx['mixkit-2568'], volume: 0.5 }`.
- **`db(-6)`** dB to gain; **`beats(bpm, offsetFrame)`** a beat grid (`.at(n)`, `.bar(n)`, `.snap(f)`, `.half(f)`).
- **`<Music src startFrom volume fadeIn fadeOut duck breaths breathLen enterAt>`**: the bed. `startFrom` (s) skips the intro,
  `enterAt` (frame) starts it later (the track plays from `startFrom` at that frame: to keep the track's beats on the film's
  grid, the beat grid starts at `enterAt`), `duck` dips it under hits, `breaths` cuts it out for `breathLen` frames before a hit.

## 9. Fonts

`fonts.inter`, `fonts.geist`, `fonts.mono` (Geist Mono), `fonts.serif` (Instrument Serif, with italic), `fonts.hand`
(Caveat, handwriting for sketches and annotations). All local. To add a face,
`npm install @fontsource/<name>` and import it in `src/kit/fonts.ts`; for a brand font, put the woff2 in `public/fonts` and use
`@font-face` with `staticFile`.

## 10. Project layout and scripts

```
src/films/main/Film.tsx   the film (timeline T + sections)      src/films.ts    registers films (id, component, duration, fps, size)
src/kit/                  the kit                                src/Sheet.tsx   the 36-frame storyboard composition
src/sfx.ts                fetched sounds (generated)             public/         sfx/, music/, logos/, images (never commit audio)
scripts/frames.mjs        sheet | still | render | final | audio | mux | strip
scripts/sfx.mjs           roles | list | get | pick | shortlist | music | analyze | credits
scripts/logos.mjs         search | get | list | check            scripts/new-film.mjs  start a project
```
