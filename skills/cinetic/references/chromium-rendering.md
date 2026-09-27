# Chromium rendering traps: symptom, cause, fix, detection

Covers the ways Chromium's rasteriser makes a correct-looking composition render wrong: pixel-snapped stairs, text that settles in whole-pixel ticks, soft text under perspective, stepped blurs, ghost frames, stale SVG, aliasing, paint order, banding, faux italics and seam shimmer. Both engines render through Chromium, so all of it applies to Remotion and HyperFrames alike. Read it before building camera moves and 3D, and whenever a render shows something the code does not explain.

Every item here was hit on a real film and fixed. The numbers are what was measured then; treat them as orders of magnitude, not thresholds.

## The table

| # | Symptom | Cause | Fix | Detect |
|---|---|---|---|---|
| 1 | Slow drifts move in 1 px stairs; text shimmers on slow pushes | fractional `left`/`top` combined with a transform: the layer's paint offset is rounded | all translation inside one `transform` matrix | `forensics.py` judder (phase-correlated patches, `--track x,y,w,h`); `lint-film` `frame-left-top` |
| 2 | Text goes soft when scaled up under `perspective` / `preserve-3d` | 3D layers are rasterised at a capped, rounded scale | lay out at shot scale with CSS `zoom: Z`, camera `scale3d(k/Z, k/Z, 1/Z)`; switch Z on a velocity-peak frame | 1:1 crops (`grab.sh --crop`); `forensics.py` sharpness |
| 3 | A defocus snaps from sharp to soft in one frame | animated `filter: blur()` on a large layer ramps in steps (Laplacian variance 1416 → 83 in one frame) | cross-fade a sharp copy and a constant-blur copy (`src/fx/RackFocus.tsx`) | `forensics.py` sharpness step; MAD spike during the rack |
| 4 | A stale copy of an element flashes on single frames, different frames each render | `will-change` (layer promotion) on a layer whose `filter: blur()` animates | remove `will-change` wherever blur animates | `forensics.py --against` a second render; ghost check; `lint-film` `will-change-blur` |
| 5 | A shape freezes in an old pose for a few frames after an overshoot | a negative SVG attribute (`rx`, `r`, `width`) is rejected and the previous value stays | clamp every geometric input ≥ 0 | stills at overshoot frames |
| 6 | Thin gaps and strokes crawl as dashes when small | no mipmaps: sub-pixel features alias under minification | gaps ≥ 8 units, strokes ≥ 1.5 px at final scale, fade hairlines out | 1:1 crops; every-frame sheet of the small section |
| 7 | Lifted cards draw under grounded ones | `preserve-3d` is flattened by `overflow: hidden` (and other grouping properties), so depth sorting stops | paint in z order yourself | stills during lifts |
| 8 | Contour rings in soft glows and falloffs | CSS gradients are 8-bit | dithered PNG backdrops (`scripts/dither-gradient.py`) | ×12 contrast stretch (`forensics.py` banding sheet) |
| 9 | UI type looks italic on a tilted plane | roll applied before the tilt shears the content | keep the roll rigid and outside the tilt: `perspective() rotateZ() rotateX()` | look at text on tilted shots at 1:1 |
| 10 | The whole UI shimmers ~0.4 px on a cut | the same element placed by layout on one side and by transform on the other | identical placement method and transform on both sides of the seam | `forensics.py` seam pop; phase correlation across the cut |
| 11 | Doubled carets, half-opacity letters in the blurred master | discrete state computed from fractional sub-frame times | discrete state from `fd(frame)` (`Math.round`) | crops of typing in the master |
| 12 | A fallback font on early frames, or text boxes sized for the wrong font | rendering or measuring before the web font loaded | `<FontGate>`: `delayRender` until every face is loaded | first frames of each render tab; `--against` |
| 13 | Animations differ between renders or ignore the timeline | CSS `transition`/`animation`, `Math.random`, `Date.now` run on wall-clock time | everything is a function of the frame; seeded `random()` | `lint-film` `css-animation`, `nondeterminism`; `--against` |
| 14 | WebGL canvases render blank or very slowly | no GPU GL backend in headless Linux | `Config.setChromiumOpenGlRenderer('angle')` (the starter sets it); concurrency 1 while validating | a still of the canvas frame |
| 15 | A word settles in 1 px ticks at the end of its rise; a slow vertical drift of text stair-steps even inside one transform | the headless shell snaps a text layer's **vertical** position to whole pixels (horizontal stays sub-pixel) | end vertical text moves on `arrive(p)` / start exits on `depart(q)` (`src/lib/anim.ts`); for a long slow vertical drift of text, move it horizontally, by scale, or promote the layer (no animated blur inside) | `forensics.py` judder on the text region |
| 16 | Text snaps from slightly soft to sharp a few frames after it has stopped | CSS `blur()` radii render in ~0.5 px steps and anything under ~0.75 px renders fully sharp | clear entrance blur by 60% of the move (`blurIn`), start exit blur once moving (`blurOut`) | `forensics.py` sharpness step |

## Details and code

### 1. Pixel-snap stairs

Chromium rounds a layer's paint offset when a fractional `left`/`top` is combined with a non-translate transform. A 0.05 px/f drift then jumps −1 px on 40% of frames, and a descriptor line climbs in visible 1 px stairs every 6–8 frames. Put every translation inside the one transform, laid out from the origin:

```tsx
// wrong: left/top carry the motion
<div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})` }} />
// right: one matrix, origin at the top-left
<div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
              transform: `translate(${x}px, ${y}px) scale(${s})` }} />
```

Lay text out statically and animate one wrapper's transform. Place dots, cursors and badges by transform, never by `left`/`top` (the starter's `Cursor.tsx` does this).

### 2. Perspective raster cap

Layers inside a 3D context are rasterised once at a scale Chromium chooses (capped and rounded, large layers at about 1×) and then transformed as a texture. Scale such a layer up by 2× and its text is visibly soft. Lay the content out at the shot's scale with CSS `zoom`, and divide the camera's scale by the same factor:

```tsx
const Z = fd(f) >= CUE.split && fd(f) < CUE.close ? 2.1 : 1;      // switch on whole frames
<div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
  transform: `translate(${sx}px, ${sy}px) perspective(2400px) rotateY(${yaw}deg) ` +
             (Z === 1 ? `scale(${k})` : `scale3d(${k / Z}, ${k / Z}, ${1 / Z})`) +
             ` translate(${-ax * Z}px, ${-ay * Z}px)`,
  transformStyle: fd(f) >= CUE.close ? 'flat' : 'preserve-3d' }}>
  <div style={{ zoom: Z, width: APP_W, height: APP_H }}>{/* the UI */}</div>
</div>
```

The geometry is identical either way; only the raster resolution changes. Switch `Z` (and `preserve-3d` → `flat`) only on a frame at a velocity peak, where the tiny re-raster difference hides inside the motion. The anchor camera itself is in `references/camera.md`.

### 3. Stepped blur ramps

Animating `filter: blur()` on a large layer does not ramp smoothly: the rendered blur jumps between a few discrete strengths, so the image goes from sharp to soft between two frames. Render the layer twice and cross-fade:

```tsx
<RackFocus t={prog(f, CUE.rackIn - 1, CUE.rackIn + 20, E.smooth)} blur={11} mid
           render={() => <Background />} />
```

- Constant blur of 10–12 px reads as "background"; the optional middle copy at 0.35× the radius hides the double image on slow racks.
- Both copies are overscanned by 80 px, so the blur never pulls transparent pixels in at the frame edge (a dark or light rim).
- Small layers (a word, a chip) can animate `filter: blur()` directly, as long as the blur is gone while the element still moves fast (item 16): the radius itself is quantised, so the last step to sharp is always visible if it happens on a still word. The frame-to-frame jump problem is large layers.
- Never leave landed text blurred; blur belongs to entrances (see `references/copy-and-type.md`).

### 4. `will-change` ghosts

`will-change: transform` promotes a layer to its own compositor surface. When a `filter: blur()` inside it animates, some frames are captured from a stale surface: a larger copy of the mark appeared over the wordmark on single frames, on different frames in each render, spaced by the render concurrency. Remove `will-change` from any subtree where blur animates; Remotion renders do not need it for speed. Nondeterminism like this is only caught by rendering the same range twice and comparing (`forensics.py out/a.mp4 --against out/b.mp4`).

### 5. Negative SVG attributes

A spring rebound pushed `shut` above 1, so `rx = 30 * (1 - shut)` went negative. Chromium rejects the invalid attribute and keeps drawing the previous value, so the shape freezes for a few frames and then jumps. Clamp every value derived from an overshooting curve before it reaches geometry:

```tsx
<rect rx={Math.max(0, 30 * (1 - shut))} width={Math.max(0, w)} />
// the same for CSS: blur, scale, border radius, clip insets
filter: `blur(${Math.max(0, b)}px)`
```

### 6. Minification aliasing

There are no mipmaps for DOM layers. At about 0.2 scale under `rotateX`, 0.6 px gaps and 2 px strokes shimmer as crawling dashes. Keep designed gaps ≥ 8 units in a 100-unit mark, drop or thicken strokes that would fall under 1.5 px at their final scale, and fade hairlines (grid lines, dividers) out as the camera pulls back. Check a pull-back at 1:1 on an every-frame contact sheet (`scripts/sheet.py --from A --to B --every 1`).

### 7. Paint order under `preserve-3d`

`transform-style: preserve-3d` only depth-sorts while no ancestor between the element and the 3D context applies a grouping property: `overflow` other than visible, `opacity` below 1, `filter`, `clip-path` or `mask`. Any of them flattens the subtree, and siblings then paint in DOM order, so a card lifted toward the camera can draw under a grounded one. Do not rely on 3D sorting: sort the list by z before rendering.

```tsx
{cards.slice().sort((a, b) => a.z - b.z).map((c) => <Card key={c.id} {...c} />)}
```

### 8. Gradient banding

Covered in `references/finishing.md` §3: compute the ramp in float, dither, quantise once, and load it as a PNG. Dither added after Chromium has quantised the gradient cannot remove the bands.

### 9. Faux italics

In a transform string the rightmost function applies to the element first. `perspective(2400px) rotateX(48deg) rotateZ(-26deg)` rolls the content inside the plane and then tilts it, which shears the type into a fake oblique. Roll the tilted plane rigidly instead, in screen space, and keep it small:

```ts
transform: `perspective(2400px) rotateZ(${roll}deg) rotateX(${tilt}deg)`   // roll outside the tilt
```

Keep the roll within about 11° and the total visible shear within about 7° (`references/camera.md`).

### 10. Seam shimmer from placement

When one act places the UI by layout (`left`, flex position) and the next places the same UI by transform, the two rasterise with different sub-pixel offsets; the whole UI shifted 0.42 px on the cut. On both sides of a seam, place the shared element with the same method and the same transform string, so the first frame of the new act is pixel-identical to the last frame of the old one. `forensics.py` reports a seam pop on the act boundary.

### 11. Discrete state under sub-frames

The motion-blur pass renders fractional frames (`<Freeze frame={t}>`). Anything discrete must agree across one output frame's samples, so compute it from `fd(frame)`: typed character counts, carets, counters, label text, layout thresholds, raster-scale switches (item 2). Continuous motion stays on the fractional frame. Details in `references/finishing.md` §2.

### 12. Fonts

The first frames a render tab captures can show the fallback face, and any measurement taken then is wrong, and `@remotion/layout-utils` caches it for the rest of the render. The starter's `<FontGate>` holds a `delayRender` handle until `document.fonts.load()` has resolved for every face and weight, then `document.fonts.ready`, then continues on the next animation frame. Render and measure nothing before it. Measurement helpers and the cache gotcha are in `references/copy-and-type.md`.

### 13. Wall-clock animation

Renders seek frame by frame in several tabs at once. CSS `transition`/`animation`, `@keyframes`, Tailwind `animate-*`, `Math.random()`, `Date.now()` and `performance.now()` all run on wall-clock time, so frames disagree between tabs and between renders. Drive everything from the frame and use seeded randomness (`random(seed)` in Remotion, the starter's `rand(seed)`). `lint-film.mjs` catches the patterns.

### 14. WebGL

Canvases using WebGL (effects, 3D, maps) need a working GL backend in headless Linux: set `Config.setChromiumOpenGlRenderer('angle')` or pass `--gl=angle`. Validate at `--concurrency=1` first, render a still of the canvas frame, and keep canvases at most 4096 px per side, moving a pre-rendered plate with CSS rather than re-rendering the canvas every frame.

### 15. Vertical text snaps to whole pixels

Measured in the headless shell that renders Remotion and HyperFrames (Chromium 141): a word rising 40 px on `E.out`, placed by one `transform`, lands on whole-pixel rows on every frame. Horizontal moves of the same word stay sub-pixel. So the ease-out's slow tail (the last 3–4 px of a 26 f reveal) arrives as 1 px ticks separated by 1–3 frame holds, which reads as the word "clicking" into place, and `forensics.py` reports judder there. `rotate()`, `translate3d()`, `perspective()`, a constant filter and `opacity` do not change it; only a promoted layer (`will-change: transform`, or a real 3D transform such as `rotateX(0.01deg)`) positions text in 1/16 px steps.

- **Reveals:** finish the vertical part of the move while it still travels ~0.5–1 px/f, then stop. `arrive(p, k = 0.94)` rescales eased progress so the move completes at 94% of its curve; `depart(q, k = 0.06)` skips the slow start of an exit. Opacity, blur and horizontal motion keep the plain progress. `src/fx/Words.tsx` and the starter's Act 1 do this; HyperFrames has `BF.arriving(ease)` for GSAP.

```tsx
const p = prog(f, s, s + 26, E.out);
<span style={{ transform: `translateY(${(1 - arrive(p)) * 0.32}em)`, opacity: p,
               filter: `blur(${blurIn(p, 14)}px)` }}>{word}</span>
```

- **Slow vertical drifts of text** (a caption creeping up 8 px over 2 s): drift it sideways, push it with scale about its own centre, or promote its wrapper with `will-change: transform` for its whole life. Never toggle promotion mid-move (the raster changes for a frame), and never promote a layer that has a blur animating inside it (item 4).
- **Camera moves** that carry text vertically at more than ~1 px/f are unaffected in practice; the ticks only show when the text is nearly still.

### 16. Blur radii are quantised

`filter: blur(r)` renders in steps of about 0.5–0.6 px of radius, and any radius under about 0.75 px renders exactly sharp (measured: 0.1–0.7 px identical to no blur; 0.8–1.3 px one level; 1.4–1.8 px the next). A blur ramp that eases to 0 alongside a slowing move therefore spends its last frames at "slightly soft", then snaps to sharp once the word has already stopped. Clear entrance blur early with `blurIn(p, px)` (gone by 60% of the eased move, when the word is still fast and half transparent) and start exit blur only once the element moves (`blurOut(q, px)`); both are in `src/lib/anim.ts`. Large defocus goes through `RackFocus` (item 3).

## When something looks wrong and none of these fit

1. Render the frame as a still and the same frame inside a short video; if they differ, suspect items 4, 12 or 13.
2. Render the range twice (`render.sh ... --frames A-B --no-audio --no-check`) and run `forensics.py a.mp4 --against b.mp4`; any difference is nondeterminism.
3. Grab the exact frames with `scripts/grab.sh video.mp4 <frame>...` and compare at 1:1 before reading code, because contact sheets hide sub-pixel problems.
4. Bisect by removing layers in the composition until the artifact disappears; the last layer removed is where the fix goes.
