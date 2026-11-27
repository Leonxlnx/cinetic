# The kit: API reference

Everything lives in `src/kit/` of a film project and is imported from one place:

```tsx
import { Words, Camera, At, ease, at, mix, springAt, springs, Card, Brand, Cues, Music } from '../../kit';
import { sfx } from '../../sfx'; // written by scripts/sfx.mjs get
```

The motion library (finished type moves, turns, effects, product UI and host screens, imported from the same place) is
the default vocabulary: see [library.md](library.md), and find a piece with `node scripts/frames.mjs library`. This file
is the API of the building blocks under it.

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
11. Deprecated

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
- `arrive`: `rise` (masked rise with a few degrees of tilt), `blur`, `scale`, `drop` (spring), `slide` (the line slides in as
  one; its spacing never changes), `flip` (3D), `cut` (each unit appears on its frame, no ramp: for rhythm on the music).
- `gap` (frames between units, compressing), `dur` (frames per unit), `times` (exact start frame per unit).
- `born="#hex"` + `settle`: each unit is born in a colour and settles to the line colour (fresh words glow).
- `accent={['word']}` + `accentStyle`: style chosen words (the accent colour; an italic serif word at most once a film).
  Punctuation is never coloured: an accented or born-tinted word's trailing `. , ! ? : ;` keeps the line's colour
  (`tintPunctuation` turns that off).
- `<Words>` lays out the whole line from the start (words not yet arrived keep their space), so a line that builds sits
  off-centre until it is complete: for a centred line that grows word by word use `<Build>`, which re-centres.
- `leaveAt`, `leave: 'cut' | 'rise' | 'fall' | 'blur' | 'scale'`, `leaveDur`: from `leaveAt` the words go and stay gone. The
  default is `cut` (gone on that frame); `rise` and `fall` travel out behind a mask that closes; `blur` and `scale` fade
  and are not for statements (text never fades out while it rises). Without `leaveAt` the words stay.
- `style` must carry the colour when you use `born`. `align`, `width`.

```tsx
<div style={{ fontFamily: fonts.inter, fontWeight: 500, fontSize: 140, letterSpacing: '-0.02em' }}>
  <Words text="Ship it tonight" start={T.title} arrive="rise" gap={4} style={{ color: INK }} accent={['tonight']} accentStyle={{ color: ACCENT }} />
</div>
```

**`<Build words={['Your', 'work,', 'handled.']} times={[T.a, T.b, T.c]} born="#hex" style={{ fontSize, color }} />`** an append
build: each word joins the centred line on its frame (put them on the music's plucks) and the line re-centres with most of
the travel in the first frames, the new word riding in with it. Widths are measured from the real face. A word may be a slot
that holds an object in the line: `{ slot: 190, node: <Brand name="claude" size={170} /> }` (width in px; the mark joins the
sentence like a word). `swaps={[{ at: T.draw, index: 0, word: 'Draw' }]}` replaces a word in place on its frame ("Snap it"
becomes "Draw it"): the old word rolls out as in `<Swap>`, the new one rolls in (`swapDur`, default 10 f) and the line
re-centres to the new width; a slot can swap too. As in `<Words>`, a tinted word's punctuation keeps the line's colour.
**`<SlotLine before="Lands in" items={[{ mark, name }]} times after="." nameStyle slot enter style />`** a sentence whose slot
swaps marks, the integration form: the words before the slot stay, and on each of `times` the mark and the name roll to
the next item while the line re-centres (`times[0]` is the frame the line is there; `enter` builds the words before the
slot first). Size the marks to about 0.85 of the font size (`slot` defaults to 1.15 of it).
**`<Swap items={['design', 'code', 'ship']} start every={24} dur={12} times />`** one slot whose word rolls to the next (items may
be nodes: a mark plus a name; `times` sets the frame each item takes over; `enter` brings the first item in).
**`<Typing text start cps={17} caret placeholder />`** and **`useTyped(text, start, cps)`** (returns `{ shown, done, doneAt }`):
a believable cadence to the end (17 nominal, about 15 characters a second with the seeded hesitations and the pauses
after spaces and punctuation); when time is short, show a prefix as already typed and type the rest, or shorten the
line. `burst` (the rest landing at once) is deprecated ([section 11](#11-deprecated)): never use it. `keyFrames` is the frame of every key (put a key
sound on some of them, drive a caret-following camera from them).
**`typingTimes(text, start, fps, cps)`** the same cadence as a pure function (key sounds, cameras outside the component).
**`<Scramble text start per={1.5} flicker={8} />`** letters decode from glyphs, left to right: short labels only.
**`<Odometer value from start dur prefix suffix sep decimals roll />`** a count on reels; low digits change fast, high digits
tick over last, every digit sharp. `roll="step"` (the default) shows whole digits on every frame, so no frame holds a
digit clipped mid-roll; `roll="smooth"` is the old continuous reel (`blur` adds motion blur to it; leave it at 0: a
smeared number reads as a fault) (`decimals={1}` for 92.4).
**`<Marker start dur color>`** a highlight sweeping in behind a word.
**`<Output text start hold travel from={{ x, y, size }} to={{ x, y, size }} born style />`** the product's result seen big once:
its key words cut on giant (`from`), hold while they creep, then travel into their place in the UI at UI size (`to`); draw the
UI's own copy from `outputLanded(start, hold, travel)`.
**`useTextWidth(text, style)`** the laid-out width of a piece of text in the real face (place a tile, a mark or an underline
exactly after a word).
**`useGlyphBox(text, style, index)`**, **`useWordBox(text, style, index)`** where a character or a word sits in a set line,
measured in the browser like `useTextWidth` (the render waits for it): `{ x, y, width, height, cx, cy, ink, baseline,
xMid }` in px from the line box's top-left corner; `ink` is the drawn shape (the bowl of an o), `xMid` the y of
the x-height's centre (centre an object on a lowercase letter at `cx, xMid`). A negative index counts from the end
(`-1`: the last character). Pass the `lineHeight` the line is drawn with (`<Words>` sets 1.04). **`useTextLayout(text,
style)`** gives the whole line at once (`width, height, baseline, xHeight, xMid, chars, words`). For "the camera dives
into the o" or "the last word travels into the mark" (never punctuation turned into an object): for a line centred at
(X, Y) the glyph is at `X - L.width / 2 + g.cx, Y - L.height / 2 + g.cy`.
**One line carried across a cut at the same place and size** ("the word still being read"): draw the line once, in a
layer above the turn (a sibling after the turn or the two Sequences, never inside `from` and `to`), with one style
object and fixed coordinates; what is behind it swaps. When each scene must own the line (it moves with scene B
afterwards), render both from one component with the same `style`, `left` and `top`, and place anything that docks to
it from `useTextLayout(text, style)` with the formula above; the second half of a sentence arrives on scene B at the
first half's baseline. `ScaleJump` (library-type.md) carries a word across a change of size.
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
**A CSS 3D box in a close-up:** `Camera` zooms with a 2D `scale()`, so a `<Box>`'s height (its depth toward the lens)
does not grow with the zoom: the footprint triples, the height does not, and the top face drifts and skews against the
sides. Place the box so its top face lies on the world plane (`<At z={-h}>`: the top at z 0, the sides receding below
it); that face then scales exactly like the flat world and stays flat in any zoom. For a close-up of the sides, build
the box at the close-up size and frame it by pan, or bring it toward the lens with `z`, never by zooming the camera.
**`safeBox(frameW, frameH)`** the box type and the subject stay inside (vertical films: clear of the platform's UI at the top
and bottom). **`camSmear(frame, keys)`** motion blur in px from the camera's own speed (apply to the world group on fast moves).
**`fillZoom(w, h, frac = 0.8)`** the zoom that makes a w x h box fill the frame. **`diveZoom(w, h)`** the zoom at which a box
exactly covers the frame (dive into an element, cut to its inside at that frame). **`toScreen(cam, x, y, z?, { perspective, frameW, frameH })`** where a world
point lands on screen under a `<Camera>`, tilted or turned too (returns `{ x, y, scale }`: start a flying card, a flood, a
`Relay enter` or a pointer exactly where an object sits). **`drift(frame, dur, push, turn)`** a living
push and turn to add to a held camera. `shake()` is deprecated ([section 11](#11-deprecated)): never shake the screen, not even on a landing.

```tsx
<Camera keys={[{ f: 0, zoom: 1.6, rx: 18 }, { f: 30, zoom: 1, rx: 8, curve: ease.out }, { f: 90, zoom: 1.04, rx: 6, curve: ease.glide }]}>
  <At x={960} y={540}><Card t={ui} w={900}>...</Card></At>
  <At x={1500} y={300} z={-400}><Chip t={ui}>Synced</Chip></At>
</Camera>
```

## 4. World

- **`<Ground color light tint>`** a ground in one flat, clean colour (the default). `light` is opt-in, for a 3D stage
  whose object needs a floor of light: it lifts a broad area in the ground's own hue and falls to exactly the ground's
  colour (never dark corners; a dark ground lifts 14 %, a light one 2.5 %; `light={{ x, y, size, amount }}` places it;
  `tint` gives the lift a neighbouring hue). Never a faint gradient as a film's ground.
- **`<Field colors points drift speed seed>`** and **`<Aura base blobs speed>`**: soft drifting fields of neighbouring
  hues, kept so older films compile. Never a ground (a pale gradient field reads as cheap); at most light inside a
  designed scene.
- **`softShadow(level = 3, ground)`** a CSS box-shadow: a contact line plus 5 layers whose offset and blur double, a few %
  alpha each, tinted to `ground`'s hue, light from above. `level` is the height: 1 a chip, 2 a resting card, 3 a raised
  card (the themes' default), 4-5 a hero object, 6-8 a device or a modal. Give it the real ground
  (`{ ...lightUI, shadow: softShadow(3, PAPER) }`); never a single hard black shadow.
- **`<CornerMarks w h inset size color shape="dot" | "bracket" appear x y>`** four small marks framing a line or a
  component without a box (crisp squares or brackets at the corners of w x h, in the parent's box). From `appear` they
  arrive one by one with a short slide. Structure for one framed thing at a time, not every element.
- **`<Defocus z focusZ aperture max>`** depth of field for SHAPES: blurs its child by its distance from the plane in focus
  (`aperture` px per 100 units, `max` the cap); animate `focusZ` to pull focus. For cards, icons, photographs and
  objects; never for a block of text (blurred words read as a mistake; dim or move text instead).
- **`<GridLines size color thickness start reveal>`** a line grid; inside a `Camera` with `rx` it becomes a floor.
- **`<Box w d h color top front side topContent frontContent sideContent radius edge shadow bevel material ground>`** a
  solid CSS 3D block lit from above: top-lit face gradients, a 1 px light edge where faces meet, and a two-part contact
  shadow (tight at the base, wider and softer with height; `ground` tints it). `material`: `matte` (default), `gloss` (a
  specular band, brighter edges), `glass` (tinted see-through faces). `bevel` (px) rounds the edges by light only;
  a truly rounded solid is `glRoundedBox` in a `GLView`. A face given as a CSS gradient is used as it is; `flat` paints
  every face one solid colour (no top-lit gradient; the light edges stay).
  `shade(hex, amt)`, `mixLab(a, b, p)`, `liftColor(c, amt, tint)` mix colours (the last two in OKLab).
- **`<DepthStack items={[{ f, node }]} x y scale lift blur dim push rise sharp>`** a depth ladder: each arrival pushes the older
  items back a slot (smaller, lifted, and by default blurred and dimmer). Caution: the default blur and dim break "text
  is readable or absent" as soon as the items carry words; pass `sharp` (older items stay sharp and full strength, depth
  from scale and lift only): `<DepthStack sharp items={msgs} y={600} />`. Keep the blurred default for shapes only.
- **`<Beam open color x w0 w1 floor>`** a hard-edged beam from above; **`<Pool open color x y>`** its pool on the floor;
  **`<GlassPanel w h tint lit sheenAt>`** glass on a dark or flat ground made of a lit gradient, a top rim and an inner edge.
- **`lerpBox(p, a, b)`** (motion) one box becoming another: position, size and radius together, so a plate visibly becomes a
  bar that becomes a card.
- **`<Glow x y r color strength pulse>`** a light sized to its source. **`<Sheen start dur angle>`** a light crossing glass once.
- **`<Grain amount still force ground>`** film grain, the top layer, 0.03-0.06: for photographs and footage. On a light
  ground (luma 0.6 or more, found from the mounted Ground, Field or Paper, or from `ground`) it draws nothing unless
  `force`: grain on a flat light ground reads as mud, not film. Banding is `<Dither>`'s job (Ground and Field carry it).
  **`<Paper color fibre>`** a still paper ground (without `color`: only the fibre, to lay over other layers),
  **`<Stroke d start dur color width wobble>`** a hand-drawn line that draws itself (sketches, underlines, circles),
  **`<Vignette amount color>`** darkened edges: rare, on a photograph or footage plate only, never on a ground.

## 5. Product UI

Themes: `lightUI`, `darkUI`; spread one and set the brand: `const ui: Theme = { ...lightUI, accent: '#E8572A', font: fonts.inter }`.
Fields: `surface ink muted line fill accent accentInk radius font mono shadow`. The accent defaults to the ink (set the
brand's); `shadow` is `softShadow(3)` on a neutral ground: pass the film's ground (`shadow: softShadow(3, GROUND)`).
Every surface (Card, Window, Bubble, Toast, Chip, InputBar) takes the theme's shadow; `Phone` and `Laptop` take a
`ground` for theirs.

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
- **`<Phone w frame screen>`** and **`<Laptop w frame base screen>`**: flat, precise device frames whose screen is a slot for
  any UI (`children` at the screen's size: phone `w x w * 2.167` inside a 2.8 % bezel, laptop `w x w * 0.625`). Pose them
  with a transform or in a `<Camera>`; cut to one when a footage shot has no screen facing the lens.
- **`<LockSwap anchor artefact hosts={[{ f, node }]} end push>`**: an object-lock swap: the artefact fixed and still while
  hosts hard-cut behind it on the beat, each pushing in a touch; `artefact` may be `(i) => node` to re-tint per host.
- **`<Relay anchor={{ x, y }} artefact={node} hosts={[{ f, node }]} lift>`**: integrations as a relay: the artefact pinned at
  one screen point, the hosts (each a full-frame composition you build: a full-bleed page, a tilted plane, a macro crop)
  changing behind it on their frames, a small settle at each cut (`pose` on a host tilts the artefact with a tilted host).
  `enter={{ f, from: { x, y, scale } }}` flies the artefact in from where the product made it, landing on the first host.
  The artefact is scaled up to span `minWidth` of the frame (default 0.55; 0 turns it off): it is the thing to read. See [cards-ui.md](motion/cards-ui.md#relay).
- **`<PartnerSurface t brand file kind="chat|tracker|mail|doc" title items={[{ f, who, text, meta }]} landAt>`**: the
  product's artefact landing inside another product (a message in a channel, an issue in a tracker): a generic surface
  with that product's real mark in the header; the item at `landAt` arrives lit. Integrations as use, not logo rows.
- **`<Spinner start doneAt size color done>`**: working -> done: an arc stepping 45 degrees a frame that closes into a check.
- **`<Wall cols rows w h gap start wave from event={{ at }} render={(i, e) => ...}>`**: the same thing in quantity, filling in a compressing
  wave from the centre; for a quantity claim, pair it with a camera pull-back (one spectacle among several, see
  [cards-ui.md](motion/cards-ui.md#wall); not the default). Every item must be real content
  (a real title, real lines), never grey placeholder bars. `event={{ at, wave }}` starts a second wave from the same origin and
  `render(i, e)` receives the item's progress in it (0-1): every item does one thing (flips from sketch to real, takes the
  accent, lights its line), which is what makes the quantity mean something. `start` far in the past shows the wall whole.
- **`<ChatStack t msgs={[{ f, from, text }]} w bottom size fadeAbove>`**: a bottom-anchored chat; each message cuts on and rises,
  older ones move up and blur by recency.
- **`focusStyles(p, accent)`** returns `{ chosen, rest }` styles to isolate one element (ring + lift vs blur + dim).

Sizes that read on a phone screen: UI text 26-40 px, rows 30+ px, cards 900-1300 px wide, the camera 1.1-1.5x on the subject.
For premium, detailed UI start from the library's pieces and its design bar ([library-ui.md](library-ui.md)); these
components are the plain building blocks.

## 6. Turns

Each takes `from` and `to` (the two shots as nodes), `start`, `dur`, and renders the right one outside the turn.
- **`<Iris x y shape="circle" | "rounded" | svgPath ring>`** the next shot opens in a growing shape (log-space). Any SVG path
  drawn in a 100 x 100 box can be the shape, centred on (x, y): `shape={squirclePath(100)}` opens an app-icon squircle,
  a mark's own path opens the mark (`ring` draws only round the circle).
- **`<Tiles cols rows order="diagonal" | "center" | "random" | "left" color>`** tiles sweep from the old shot to the new.
- **`<Pixelate max>`** mosaic up, swap at the peak, resolve (a full-frame turn: its filter does not work on a small clipped
  element). **`<Push dir smear>`** both shots travel as one strip.
- **`<ZoomThrough x y depth>`** fly into a point until it fills the frame, then the next shot settles from slightly zoomed in.
- **`<TileFlip front back w h start cols rows wave bg>`** one element turning into another tile by tile (a sketch into the real
  card).
- **`<Flood from={{ x, y, w, h, r }} start dur color under to>`** a join grown from an object's own box (a button, a
  card) until it fills the frame; `to` (the next shot) appears inside it (`reveal` shows it at full opacity, a window
  opening); `source` keeps the object (a URL, a label)
  readable on top while it floods. One flood in a film at most, only when the story changes place, and only when it
  covers the whole frame ([film-grammar.md](film-grammar.md#ground-changes)).
  `gather` runs it backwards: the ground drains into the box and becomes the object (a chip, a button, a tile; draw that
  object in `under` at the same box), uncovering `under`.
- `<Flash>` is deprecated ([section 11](#11-deprecated)): never flash the screen to hide a cut.
The library's turns come first ([library-turns.md](library-turns.md)); the strongest hand-built turns carry the scene's
own subject (the card that becomes the next screen, the phone the camera dives into): see [turns.md](motion/turns.md).

## 6b. Imagery (`imagery.tsx`)

- **`<Photo src w h grade={{ dark, light, look }} develop zoom panX panY start dur radius position>`**: a picture that covers its
  box, graded into the film's one look (`look` is a CSS filter for every picture); `develop` (0..1) cross-fades it from the
  grade's duotone to true colour, the way a found or generated picture arrives; it drifts slowly (`zoom`, `panX/Y`).
- **`<TextWindow text src reveal zoom position panX panY style>`**: letters as windows onto a picture (heavy faces, big sizes).
- **`<Compare before after split w h line handle labels dividerLabel dividerLabelY dividerLabelStyle>`**: a before/after with a
  divider at `split` (0..1); `dividerLabel` rides the divider (one node on the line, or `['1998', '2024']` either side of
  it) at `dividerLabelY` of the height (default 0.86).
- **`<Selection x y w h start dur color label labelStyle labelAt handles>`**: a box with corner handles that draws itself around
  what the product found; `labelAt` `top-left` (default), `top`, `bottom-left`, `bottom` or `inside`; `handles="soft"` round
  handles with a light fill and a thinner line (`"none"`: the box alone).
- Pictures live in `public/` (`img/...`): the user's, or licensed and recorded (`assets.mjs`, see [assets.md](assets.md)).

## 6c. A hero object in 3D (`gl.tsx`)

**`<GLView id build draw state width height ss>`** draws a three.js world (a ring, a device, a glass solid) with ONE
shared WebGL renderer into each view's own canvas, so the 36-frame sheet never runs out of WebGL contexts (a
`<ThreeCanvas>` per view does). `build(renderer)` makes the scene once; `draw(world, state, renderer)` poses it for a
frame; keep `state` a small plain object.
**`softStudio(renderer, scene, { intensity, exposure, floorY, shadowSize, shadowOpacity, tint, background, toneMapping })`** the default
light for new 3D: a large soft room (RoomEnvironment through PMREM), ACES tone mapping (`toneMapping: 'aces'`, the
default; it greys a saturated colour, so when the object carries the brand's accent use `'neutral'`, which keeps the
accent's hue and strength; `'none'` is linear; the renderer is shared, so two worlds that differ set
`r.toneMapping` in their own `draw`), and a baked soft contact shadow on
a floor plane at `floorY` (returns `{ env, plane, shadow(x, z, size, opacity) }`: move it under the object, fade it as
the object lifts). Matte, clay and satin read best (`MeshPhysicalMaterial` roughness 0.35-0.7, a little clearcoat).
**`glRoundedBox(w, h, d, radius, segments)`** a rounded box geometry: the real bevelled solid CSS `Box` only suggests.
**`studioEnvironment(renderer, accent)`** the older dark studio of hard strip lights, kept for existing films: it gives
hard stripes on black chrome, the look of cheap 3D; do not start new films from it.
For glass use `transmission` on a `MeshPhysicalMaterial`; anything meant to show inside the glass (a beam, a glow sprite) needs
`depthTest: false`, or the glass reads opaque. GL frames render slowly on the CPU: keep `ss` at 1-1.25 and split finals into
short parts.
**`glRay(scene, color, { width, opacity, through })`** a ray of light: a ribbon that faces the lens with a soft hot core and
halo (a tube shows hard edges). Add it in `build`; in `draw` call `ray.place(from, to, camera, strength)` and grow `to` to shoot
it (`through: true` shows it inside glass).
**`orbitCamera({ yaw, pitch, dist, tx, ty }, aspect, fov)`** a camera on an orbit, pure, so `draw` and the DOM pose the same
camera for a frame. **`glPoint(camera, [x, y, z], width, height)`** where a 3D point lands in the frame (px): pin a label, a
number or a line of type to a spot on the object.
Light it from an environment, never flat; dive through it (a tunnel of the same object), tip it into a line or a dial: the
object carries the film.

## 7. Marks and icons

- **`<Brand name="gmail" size on="light" | "dark" color="brand" | "white" | "black" file>`**: a company mark, by default its
  real full-colour file from `public/logos/` (the kit ships the most used ones; `src/logos.ts` finds a mark by any of its
  names). `on="dark"` (or `color="white"`) takes the white file of a mark drawn in black (GitHub, Notion, X, Vercel); a
  full-colour mark is never recoloured. `file` names an official file by hand (a wordmark). A name with no file falls back
  to Simple Icons' one-colour glyph (black or white by ground, else the brand's hex). Missing mark:
  `node scripts/logos.mjs get <name...>`, then the same `<Brand name>`; `logos.mjs verify` lists the fallbacks left.
- **`brandHex(name)`** the brand colour (for a glow, never a tile). **`<BrandTile name size bg radius shadow>`**: the mark
  as its app icon looks: a mark that is its own tile (Jira, Trello, Stripe) fills it, any other sits on a white tile
  (`bg`, default white); never a coloured tile the product does not have. **`logoFor(name)`** the mark's index entry or null.
- **`<AppIcon size colors={[top, bottom]} glyph gloss depth rim>`**: a crafted app icon: a true squircle
  (`squirclePath(s)`), a two-stop gradient blended in OKLab, a soft top highlight (`gloss` 0-1, default 0.6), a 1 px rim lit
  at the top and shaded below (`rim`), a layered drop shadow in the tile's own hue (`depth` 0-1) and the glyph centred
  (`glyph={<Icon name="Mic" size={size * 0.46} color="#fff" />}`, a mark, or a drawn SVG). Show it at 96 px or more;
  keep the two colours one step apart (a lighter and a deeper shade of one hue), never two hues.
- **`<Icon name="Calendar" size color stroke>`**: interface glyphs from Lucide (lucide.dev/icons), by component name.

## 8. Sound

- **`<Cues cues={[{ at, src, leadMs, volume, rate, maxS }]}>`**: each effect starts `leadMs` early so its transient (or, for
  whooshes and swells, its peak) lands exactly on frame `at`. Spread the entries of `src/sfx.ts`: `{ at: T.press, ...sfx['mixkit-3124'], volume: 0.5 }`.
- **`db(-6)`** dB to gain; **`beats(bpm, offsetFrame)`** a beat grid (`.at(n)`, `.bar(n)`, `.snap(f)`, `.half(f)`).
- **`<Music src startFrom volume fadeIn fadeOut duck breaths breathLen enterAt endAt>`**: the bed (`endAt`: the frame it has
  faded out by, for a silent last beat under the mark). `startFrom` (s) skips the intro,
  `enterAt` (frame) starts it later (the track plays from `startFrom` at that frame: to keep the track's beats on the film's
  grid, the beat grid starts at `enterAt`), `duck` dips it under hits, `breaths` cuts it out for `breathLen` frames before a hit.

## 9. Fonts

`fonts.inter` (Inter with optical sizing, so large lines render in its display cut: the default voice for statements and
UI), `fonts.geist` (a tighter technical sans for a developer brand, then the whole voice), `fonts.mono` (Geist Mono: code
and data only), `fonts.serif` (Newsreader, with italic and optical sizing: only for a brand whose voice is a serif, or a
wordmark), `fonts.hand` (Caveat: a sketch or note inside a product only). All local. When each is allowed, and the
sizes, weights and tracking: [type.md](type.md). To add a face,
`npm install @fontsource/<name>` and import it in `src/kit/fonts.ts`; for a brand font, put the woff2 in `public/fonts` and use
`@font-face` with `staticFile`.

## 10. Project layout and scripts

```
src/films/main/Film.tsx   the film (timeline T + sections)      src/films.ts    registers films (id, component, duration, fps, size)
src/kit/                  the kit                                src/Sheet.tsx   the 36-frame storyboard composition
src/sfx.ts                fetched sounds (generated)             public/         sfx/, music/, logos/, images (never commit audio)
scripts/frames.mjs        sheet | still | render | final | audio | mux | strip | joins | check | library   (mux without audio joins muted
                          parts silent; joins: every join at real size, frames J-4 .. J+4; check --format launch | loop | sting,
                          --silent)
src/kit/library/          the motion library: a folder a category (type, turns, fx, camera, ui, hosts, objects, grounds,
                          designs), one file a piece; catalog/<category>.ts lists each category's pieces (frames.mjs
                          library [--category --purpose --subject --mood] | --show <Name> | --strip <Name>)
src/films/library/        the motion library's reels, one a category (--film library-type | library-turns | library-fx |
                          library-camera | library-ui | library-hosts | library-objects | library-grounds |
                          library-designs), each a list of segments
scripts/library-docs.mjs  writes the library's section tables from the catalogue; --check: docs, exports, catalogue and
                          reel segments agree
scripts/library-props.mjs --props <Name>: a piece's props from its types (frames.mjs library --show prints them);
                          --check: every prop a usage line in the library's docs names exists on the piece
scripts/sfx.mjs           roles | list | get | pick | shortlist | music | analyze | fit | credits   (music/analyze/fit decode audio: light, seconds)
scripts/logos.mjs         search | get | list | check | verify   scripts/new-film.mjs  start a project
```

**What the film exports for the scripts** (beside `T`, in `src/films/main/Film.tsx`):
- `export const JOINS = [{ at: T.turn, len: 14 }, { at: T.dive, len: 20 }];` every join as its move's first frame and
  its length (or `{ at, to }`). `frames.mjs joins` reads it when no `--at` is given (`--at 120+14,245+20`) and exports
  every frame from 2 before the move to 4 after it; a bare number still means the nine frames round it, and the command
  lists those joins. Plain numbers, or fields of a `T` made of plain numbers and arithmetic; a value from an imported
  helper such as a beat grid cannot be read: write the number, or pass `--at`.
- The lockup's first frame: `lockup` in `T` (`T.lockup`), or `export const LOCKUP = 1210;` (LOCKUP wins when both are
  there). `frames.mjs check` measures "the ending holds still" from that frame on, so a held payoff picture before the
  claim counts as a hold (judged by the pace lines), not as the ending; without either, the ending is the still stretch
  before the last frame, as before. `--lockup <s>` still sets how much of the end the body measures leave out.

## 11. Deprecated

Kept so older films compile; never use them in a new film. Each was retired by the never list.

| Deprecated | Why | Use instead |
|---|---|---|
| `shake()` (`camera.tsx`) | a screen shake reads as an error, even a small one on a landing | the object's own landing (a scale from 1.2 to 1 over 6 f, `ease.back`), or `ChromaHit` on the object that lands |
| `<Flash>` (`turns.tsx`) | a flash of light hides a cut instead of making one | a turn that carries the subject through the cut: `DotReveal`, `GrowIris`, `DiveInto`, `WindowOpen` ([library-turns.md](library-turns.md)) |
| `<Aura>` (and `<Field>` as a ground, `world.tsx`) | a pale drifting gradient field reads as cheap | a flat `<Ground>` in the world's colour; depth from objects, light and pictures |
| `<Typing burst>` (`type.tsx`) | the rest of a line landing at once breaks the typing | the believable cadence to the end: show a prefix as already typed and type the rest, or shorten the line |
