# Remotion engine: the starter project, verified API facts, config and CLI

What the Remotion side of cinetic looks like: the starter's files and compositions, the Remotion 4.0.529 APIs a film actually uses (checked against the installed type definitions and source), the `remotion.config.ts` template, render recipes and the traps. Read it when you start a Remotion film (after `scripts/new-film.sh`), and again whenever an API behaves differently from what you expected. Numbers here are proven defaults and starting points, not dogma.

## Contents

1. [The starter project](#1-the-starter-project)
2. [How a film is wired](#2-how-a-film-is-wired)
3. [Verified API facts](#3-verified-api-facts-remotion-40529)
4. [remotion.config.ts](#4-remotionconfigts)
5. [CLI recipes](#5-cli-recipes)
6. [Traps](#6-traps)

## 1. The starter project

`bash scripts/new-film.sh <dir> [--fps 60] [--bpm 120] [--size 1920x1080] [--name x] [--link-modules <node_modules>] [--font <name>]` copies `assets/remotion-starter`, sets FPS, BPM, W and H in `src/timeline.ts`, copies every cinetic script into `<dir>/scripts`, and installs (or symlinks) `node_modules`. It refuses a BPM whose beat is not a whole number of frames and lists the ones that are. `--font` vendors a family into the project (below).

The starter's palette, mark and demo name carry `// cinetic:placeholder` markers, and `npm run check` fails (`lint-film.mjs` rule `placeholder`) until they are replaced by the film's own brand (`references/brand-and-color.md`). That is deliberate: the demo renders as is, but a film cannot ship on the starter's look.

| Path | Job | Change it? |
|---|---|---|
| `src/timeline.ts` | `FPS BPM W H BEAT BAR b() f60() TAIL ACT TOTAL CUE COPY copy()`: the only source of time | always: your acts, cues and copy |
| `src/brand/tokens.ts` | `C` colours, `FONT`, `FACES`, `TYPE`, `typeStyle()`, `U`, `SAFE`, `safeArea()` | always: the brand (placeholder palette: ink/paper, one signal-green accent `#08965A`; marked `cinetic:placeholder`) |
| `src/brand/Mark.tsx` | `MARK` geometry (100-unit box), `<Mark>` with per-piece poses, `placeMark()` | always: your mark (the starter's is a marked placeholder); keep the per-piece API |
| `src/brand/fonts.ts` | the font CSS imports (browser-only): the starter's `@fontsource-variable/geist*`, or the vendored `./fonts/<name>/index.css` that `scripts/add-font.mjs` writes | when the family changes (`node scripts/add-font.mjs <name>`) |
| `src/lib/anim.ts` | `E` easings, `SPR` springs, `tw prog mix lmix clamp spr hitPulse squash blurIn blurOut arrive depart rand fd` | add named tokens; never inline curves in acts |
| `src/lib/sync.ts` | `peak delayTo hit settleOf`: sync frames computed from curves | rarely |
| `src/lib/camera.ts` | `Shot`, `lc`, `camera()`, `toScreen`, `breath`, `dip` (`references/camera.md`) | rarely |
| `src/lib/measure.ts` | `measureTracked fitSize inkBox baselineOf` (DOM/canvas, after fonts) | rarely |
| `src/lib/color.ts` | `mixColor(a, b, t)` in OKLab | rarely |
| `src/lib/FontGate.tsx` | blocks rendering until every face in `FACES` is decoded | never (edit `FACES`) |
| `src/lib/Audit.tsx` | `audit` prop: logs and draws text boxes against the safe zone (`safe` prop), overlaps, minimum size, and text covered by a `data-mover` | never |
| `src/lib/safe.ts` | safe-zone presets (`wide16x9`, `feed9x16`, `feed9x16Strict`, `square1x1`, `portrait4x5`, `title`), `safeInsets()`, `safeBox()`, `presetFor()`; Node-safe | rarely (a destination with other overlays) |
| `src/fx/RackFocus.tsx` `Words.tsx` `Cursor.tsx` | rack focus without stepped blur; word reveal; transform-only cursor with `cursorArc`, `pressAt` | use as needed |
| `src/acts/Act1.tsx`, `Act2.tsx` | the demo (below): replace with your acts | always |
| `src/Film.tsx` | one `<Sequence>` per act, `<FontGate>`, optional `<Audit>`, the soundtrack in the Studio | per act added |
| `src/FilmSub.tsx`, `src/blur.ts` | sub-frame stream for the motion-blurred master | never |
| `src/Root.tsx` | compositions (below) | per act or variant added |
| `src/Stills.tsx` | style frames of the mark | when the mark changes |
| `src/sync.ts`, `audio/score.json` | sound events and the score (`references/sound.md`) | always, after the picture |

Compositions registered in `src/Root.tsx`:

| Id | What | Used by |
|---|---|---|
| `Film` | the whole film, props `{audit?: boolean, safe?: SafeSpec}` | Studio, `scripts/render.sh Film ...`, `scripts/layout-audit.sh Film` |
| `FilmSub` | the film as sub-frames, props `{groups: number[]}`, length from `calculateMetadata` | `scripts/render.sh --blur` |
| `Acts/Act1`, `Acts/Act2` | each act alone under `FontGate`; `ActN` is the Nth entry of `ACT` | iteration, per-act re-renders, `layout-audit.sh ActN` |
| `Stills/Mark16`, `MarkLarge`, `MarkSizes` | the mark at 16 px, full screen, and 16-256 px on paper and ink | `npm run stills` (look at them before animating) |

npm scripts: `studio`, `check` (tsc + `lint-film.mjs` + `grid-check.ts`), `stills`, `cues` (`export-cues.ts`), `audio` (`score.py`, writing `out/stems/` and `out/qa/score.json` too), `render` (`render.sh --blur`), `render:preview`, `qa` (probe, forensics, `av-audit --stems`, sheet on `out/film.mp4`).

**The demo** is a 4-bar placeholder that exercises the system; replace every act, keep the patterns. Its dot, dome and block are the placeholder's vocabulary, not a template for your device or mark (`references/brand-and-color.md` §4). Act 1: the accent dot waits where the period will be and ticks on each beat of bar 1, each tick calling in one word (it pops on the beat, arrives in the accent and relaxes to ink); the spread line closes on `E.contact` and locks on the downbeat of bar 2 with the dot seated as its period; after the read hold the words leave last-first and the dot flies to its slot in the mark, its velocity peak on a beat (`CUE.fly`) and arriving at rest on the act seam. Act 2 opens on exactly that pose; the dome and the block are born on their first frames of travel and land on beats 2 and 3 (springs started `delayTo()` early, stopped dead at contact, squashed against the contact edge, and kept under about 70 px/f); the mark settles into the lockup while the name rides out from behind its moving edge and locks on the downbeat of bar 4; a 20% dolly and the dot's clock ticks keep the hold alive to the last frame. The words rise on `arrive()` so they do not settle in whole-pixel ticks (`references/chromium-rendering.md` §15).

## 2. How a film is wired

- **Acts are pure functions of `useCurrentFrame()`.** Inside an act, convert cues once: `const L = (abs: number) => abs - ACT.mark.from`. Inside a `<Sequence>` the frame is local (it starts at 0).
- **Durations inside a move use `f60()`**, cues use `b()`. `f60(22)` is 22 frames at 60 fps and 11 at 30, so choreography keeps its timing if the fps changes; `hitPulse` attack and decay are in 60 fps frames for the same reason.
- **Text reads its words from `COPY`** (`copy('statement').text`), never a second literal, so `grid-check.ts` counts what is on screen.
- **Everything the sound needs is exported from the act** (`DOT_TRAVEL`, `LOCKUP_MOVE`, `HERO` in the demo) and `src/sync.ts` computes events from it (`references/timing-grid.md`, `references/sound.md`).
- **Seams are designed inside the acts**: the outgoing act ends on the pose the incoming act opens with, computed from shared constants (`DOT_SLOT`, `HERO`), never a crossfade in `Film.tsx`.
- **Tag readable text** with `data-text="<id>"` on the element whose box is the text, so `layout-audit.sh` can check it.
- **Place by transform**: `left: 0; top: 0; transform-origin: 0 0; transform: translate() scale()`. Render marks at a fixed `size` and scale them with `placeMark(x, y, k)`, so nothing relayouts or snaps per frame.

## 3. Verified API facts (Remotion 4.0.529)

Checked against `node_modules/remotion/dist/cjs/*.d.ts` and the source. Installed with the starter: `remotion`, `@remotion/cli`, `layout-utils`, `noise`, `paths`, `shapes`. Add others with `npx remotion add <pkg>`, which pins them to the same version (mixed versions break React context).

**Animation**

| API | Fact |
|---|---|
| `interpolate(input, inRange, outRange, opts)` | `extrapolateLeft/Right: 'extend' \| 'identity' \| 'clamp' \| 'wrap'`, default **extend**: an unclamped tween keeps going past its range. Use `tw()`/`prog()` (clamped both sides). `easing` takes one function or an array of n-1 functions for n keyframes. `posterize: n` steps the output every n frames. `output: 'perceptual-scale'` interpolates area (s²), so 1→4 has its midpoint at 2.92; zoom in log space with `lmix()` instead. |
| `Easing.bezier(x1,y1,x2,y2)` | the only way curves enter the film, via named `E` tokens in `lib/anim.ts` |
| `Easing.spring(cfg)` | a curve normalised to t∈[0,1], not physics; clamps at t ≥ 1 unless `allowTail`. `{damping: 200}` gives 0.057 at t=0.05 and 0.453 at t=0.2 (it starts from zero velocity), against 0.281 / 0.752 for `E.out`, so it is no substitute for an expo-out |
| `spring({frame, fps, config, from, to, durationInFrames, durationRestThreshold, delay, reverse})` | real physics, `config: {damping, stiffness, mass, overshootClamping}`. Use via `spr(frame, start, SPR.x)` |
| `measureSpring({fps, config, threshold})` | frames until the spring settles within `threshold` |
| `interpolateColors` | mixes in gamma sRGB and rounds each channel per frame: slow ramps step, hue mixes go grey. Use `mixColor()` (OKLab) |
| `random(seed)` | deterministic 0..1 (`seed: number \| string \| null`); the starter's `rand(seed)` does the same without React |

**Structure**

| API | Fact |
|---|---|
| `<Sequence from durationInFrames name layout>` | also `width`, `height` (override `useVideoConfig` inside), `trimBefore`, `playbackRate`, `freeze`, `hidden`. Children get a local frame. `layout` is `'absolute-fill'` (default) or `'none'` |
| `premountFor` / `postmountFor` | only active outside renders (`!isRendering`): they freeze and hide the child in the Studio while it loads. With `layout="none"` they are silently ignored in 4.0.529: no error, no warning (verified by render; `lint-film.mjs` warns). Never rely on them for correctness |
| `useVideoConfig()` inside a `<Sequence>` | `durationInFrames` is the **Sequence's** length, `width/height` its overrides; `id` and `fps` stay the composition's |
| `<Series><Series.Sequence durationInFrames offset>` | back-to-back scenes; negative `offset` overlaps them |
| `<Folder name>` | groups compositions in the Studio; ids stay global and unique (letters, digits, hyphens) |
| `<Composition id component durationInFrames fps width height defaultProps calculateMetadata schema>` | `defaultProps` must be JSON-serialisable (declare props with `type`, not `interface`). A `schema` must be a top-level `z.object` |
| `<Still id component width height>` | a one-frame composition for style frames |
| `calculateMetadata({props, defaultProps, abortSignal, compositionId, isRendering})` | may return `durationInFrames, fps, width, height, props, defaultCodec, defaultOutName, defaultVideoImageFormat, defaultPixelFormat, defaultProResProfile, defaultSampleRate`. `FilmSub` uses it to size itself from `props.groups` |
| `<Freeze frame active>` | renders children at a fixed, possibly **fractional**, frame. `FilmSub` uses it for sub-frames, which is why discrete state must use `fd(frame)` |
| `<Loop durationInFrames times>` | repeats children; `Loop.useLoop()` gives the iteration |

**Assets, async, fonts, text**

| API | Fact |
|---|---|
| `staticFile('audio/x.wav')` | URL of a file in `public/`. `getStaticFiles()` lists them (`{name, src, sizeInBytes}`); `Film.tsx` mounts the soundtrack only once it exists |
| `<Img src>` | waits for the image before the frame is captured (a plain `<img>` does not) |
| `delayRender(label, {timeoutInMilliseconds, retries})` / `continueRender(h)` / `cancelRender(err)` | block capture until async work finishes. In components prefer `useDelayRender()`, which returns all three. Timeout default comes from `Config.setDelayRenderTimeoutInMilliseconds` |
| `useCurrentScale()` | the Studio's canvas zoom: divide `getBoundingClientRect()` values by it (renders are 1 unless `--scale`) |
| fonts | `@fontsource-variable/<family>` CSS imports give the whole weight axis offline. `FontGate` calls `document.fonts.load()` for each entry of `FACES`, waits for `document.fonts.ready`, verifies `document.fonts.check()`, then continues the render one animation frame later; a missing face cancels the render with its name |
| `@remotion/layout-utils` `measureText fitText fillTextBox fitTextOnNLines` | accept `fontFamily fontSize fontWeight letterSpacing fontVariantNumeric textTransform validateFontIsLoaded`. The module-level cache key is text, family, weight, size, letterSpacing, textTransform and additionalStyles, **not** `fontVariantNumeric`, and it is never cleared: a measurement taken before the font loads stays wrong. The starter's `measureTracked()` measures a hidden DOM span (exact variable weight and em tracking) and is only called under `FontGate` |
| negative tracking | CSS adds letter-spacing after the last glyph too, so a measured width ends `-track × size` short of the last letter; add it back before placing anything after the text (the demo's period does) |
| `inkBox()` / `baselineOf()` | canvas `measureText` ink and font metrics: sit a mark on the ascender line and a dot on the baseline from the font, not by eye |

**Media and extras (not installed by the starter)**

- `@remotion/media` `<Audio>`/`<Video>`: `trimBefore`/`trimAfter` are in **frames**; in `volume={(f) => ...}`, f starts at 0 when the media starts. `Audio` from `remotion` is a deprecated alias of `Html5Audio`. Renders are muted anyway: ffmpeg muxes the soundtrack (`scripts/render.sh`).
- Audio visualisation (`@remotion/media-utils` `useWindowedAudioData` + `visualizeAudio`): pass `frame` down from the parent; calling `useCurrentFrame()` inside an offset child Sequence makes it jump.
- Captions (`@remotion/captions`): paginate with its page helper (option `combineTokensWithinMilliseconds`, about 1200) and render with `whiteSpace: 'pre'` (tokens carry their leading spaces).
- `@remotion/noise` `noise2D/3D/4D(seed, ...)`, `@remotion/paths` (`evolvePath`, `getLength`, `getPointAtLength`, `getTangentAtLength`, `interpolatePath`), `@remotion/shapes` (`makeRect`, `makeCircle`, `makeStar`, ... return `{path, width, height}`).
- 3D: `@remotion/three` `<ThreeCanvas width height>`; drive everything from `useCurrentFrame()`, never R3F's `useFrame()`.
- `@remotion/effects` are WebGL2 (needs the ANGLE renderer). `<HtmlInCanvas>` and `@remotion/motion-blur`'s `HtmlInCanvasMotionBlur` need Chromium 149 or newer; sandbox headless shells are often older. In-browser blur accumulates in 8 bits anyway: use `scripts/render.sh --blur` (`references/finishing.md`).

## 4. remotion.config.ts

The starter's config (read by every `npx remotion` command; CLI flags override; restart the Studio after edits):

```ts
import { existsSync, readdirSync } from 'node:fs';
import { Config } from '@remotion/cli/config';

const PINNED_BROWSER: string | null = null; // new-film.sh --browser writes a path here
const sandboxBrowser = (): string | null => {
  const root = '/opt/pw-browsers';
  if (!existsSync(root)) return null;
  const found = readdirSync(root)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((d) => `${root}/${d}/chrome-linux/headless_shell`)
    .find((p) => existsSync(p));
  return found ?? null;
};
const browser = process.env.REMOTION_BROWSER || process.env.CHROMIUM_PATH || PINNED_BROWSER || sandboxBrowser();
if (browser) Config.setBrowserExecutable(browser);

Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setColorSpace('bt709');
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setOverwriteOutput(true);
```

| Setting | Why | Remotion default |
|---|---|---|
| browser: env, pinned, sandbox shell, else download | sandboxes often block the download but ship a headless shell | downloads its own Chromium |
| `setChromiumOpenGlRenderer('angle')` | a working GL backend headless (WebGL, effects) | platform default |
| `setVideoImageFormat('jpeg')` + `setJpegQuality(95)` | q80 blocks up soft gradients; use `--image-format=png` for dark gradients or alpha | jpeg, q80 |
| `setColorSpace('bt709')` | tags and converts as HD players decode; `'default'` writes untagged BT.601, so a preview's colour differs from the master. `render.sh --blur` overrides it with `--color-space=default` for its two intermediates only (`references/finishing.md` §4) | `'default'` (also `bt601`, `bt2020-ncl`) |
| `setDelayRenderTimeoutInMilliseconds(120000)` | font loading and measurement on a cold, busy machine | 30000 |
| concurrency | left at the default `round(min(8, max(1, cpus/2)))`; pass `--concurrency` | same |

Encoder defaults you override per render: h264 CRF 18 and x264 preset `medium` (`scripts/render.sh` uses CRF 14 `slow` for masters).

## 5. CLI recipes

| Task | Command |
|---|---|
| Studio | `npx remotion studio` (`--no-open` prints the URL; open `/<CompositionId>`) |
| one still | `npx remotion still src/index.ts Film out/f120.png --frame=120` |
| several exact frames, one browser | `npx remotion render src/index.ts Film out/frames --sequence --frames=0,45,120,239 --image-format=png` (a comma list; cannot be combined with `--every-nth-frame`) |
| every Nth frame of a range | `... --sequence --frames=240-479 --every-nth-frame=5` (or `python3 scripts/sheet.py --comp Act2 --every 2`) |
| props from a file | `--props=out/samples.json` (a JSON string works too) |
| muted picture for ffmpeg muxing | `--muted --crf=14 --x264-preset=slow` (what `scripts/render.sh` does) |
| bundle once, render many | `npx remotion bundle` (writes `build/`, or `--out-dir`), then pass the bundle folder instead of `src/index.ts` (`scripts/render-chunks.sh`) |
| list compositions and lengths | `npx remotion compositions src/index.ts [--props=...]` |
| find the fastest concurrency | `npx remotion benchmark --concurrencies=1,2,4 --runs=2` |
| transparent master | `--image-format=png --pixel-format=yuva444p10le --codec=prores --prores-profile=4444` (`scripts/deliver.sh`) |
| override size/fps/length | `--width --height --fps --duration`, e.g. a quick half-size check with `--scale=0.5` |
| see browser console output | `--log=verbose` (the layout audit reads `CINETIC_AUDIT` lines this way) |

Keep test renders short on a shared machine: frame lists and ranges, `--concurrency=2`.

## 6. Traps

- **CSS `transition`/`animation`/`@keyframes` and utility `animate-*` classes** play on wall-clock time and render as garbage or not at all. `lint-film.mjs` fails them.
- **`Math.random`, `Date.now`, `performance.now`**: each render tab would draw a different film. Use `rand(seed)`.
- **Fractional frames.** `FilmSub` renders sub-frames through `<Freeze>`, so `useCurrentFrame()` is fractional there. Decide typed characters, carets, counters and layout switches with `fd(frame)`.
- **`prog()` is 0 on its first frame.** A change that must show on a hit frame starts at `cue - 1`.
- **`E.out` as the default of `prog()`/`tw()`** is for arrivals. Fades and exits pass `E.smooth` or `E.in`, or they pop in one frame.
- **Overshoot into geometry.** Clamp springs at the rest pose and feed only clamped values to SVG attributes: a negative radius or scale is rejected and the stale value stays on screen. `Mark` clamps piece scales at 0.
- **Fractional `left`/`top` plus a transform** snaps to whole pixels and slow moves stair-step: all motion goes in the transform (`lint-film.mjs` flags frame-driven left/top).
- **`will-change` on a layer whose blur animates** leaves stale ghost frames; animated `filter: blur()` on big layers steps. Use `RackFocus`.
- **Audio in the render.** Remotion's AAC mux leaves about 2048 samples of encoder priming (audio 2-3 frames late). Render `--muted`; `render.sh` muxes with ffmpeg and checks sync.
- **`npm install` in a project whose `node_modules` is a symlink** (`new-film.sh --link-modules`) writes into the shared folder, changing every film that links it, and can break its pinned Remotion versions. Add a font family with `node scripts/add-font.mjs <name>` (it vendors the files into `src/brand/fonts/` via `npm pack`, `references/copy-and-type.md` §6); for any other package, give the project its own install (`rm node_modules && npm install`).
- **The timeline must stay Node-loadable.** `grid-check.ts`, `export-cues.ts` and `layout-audit.sh` import `src/timeline.ts` with tsx: no React, CSS or `staticFile` imports in it. `src/sync.ts` may import acts, which import React, since tsx handles TSX, but never CSS: keep font imports in `brand/fonts.ts`, which only `FontGate` loads.
- **Upstream doc slips** to ignore: trim values are frames, not seconds; a transparent-video example sets `defaultCodec: 'vp8'` while its CLI uses `vp9`; "always premount" is a no-op in renders.

Related: `references/chromium-rendering.md` (rasterisation traps and detection), `references/finishing.md` (blur, colour, encode, mux), `references/timing-grid.md` (the timeline pattern), `scripts/render.sh`, `scripts/lint-film.mjs`, `scripts/grid-check.ts`, `scripts/layout-audit.sh`.
