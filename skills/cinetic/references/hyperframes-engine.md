# HyperFrames engine

Covers HyperFrames 0.8.79 as cinetic uses it: how it renders, the composition and timeline contract, the CLI, the traps its linter misses, and how to carry the beat grid, easing tokens, springs, sync and finishing over from the Remotion kit. Read it at Step 4 when the film is built in HyperFrames (HTML plus one paused GSAP timeline), and before the first render.

Everything here was checked against the 0.8.79 source and by rendering `assets/hyperframes-starter/` with a sandbox headless Chromium. The numbers are proven defaults and starting points; the craft rules in the other references apply unchanged.

**Contents**
1. [Render model](#1-render-model)
2. [Setup](#2-setup)
3. [Composition anatomy](#3-composition-anatomy)
4. [The timeline contract](#4-the-timeline-contract)
5. [Sub-compositions: one file per act](#5-sub-compositions-one-file-per-act)
6. [Fonts](#6-fonts)
7. [Media and audio](#7-media-and-audio)
8. [Variables and batch renders](#8-variables-and-batch-renders)
9. [CLI](#9-cli)
10. [Traps the linter does not catch](#10-traps-the-linter-does-not-catch)
11. [Translating cinetic](#11-translating-cinetic)

---

## 1. Render model

Nothing ever plays. For every output frame the engine seeks every registered timeline to a quantized time and captures the page.

| Stage | What happens | What it means for you |
|---|---|---|
| Seek | `t = frame / fps` on an integer grid; each timeline is paused, then `totalTime(t)` | motion must be a pure function of `t`; workers seek frames out of order |
| Capture | opaque MP4: JPEG q95 (q80 for `draft`); PNG when the output keeps alpha (`png-sequence`, `mov`, `webm`) | the MP4 path compresses twice; cinetic renders PNGs and encodes once (§11.7) |
| Capture mode | BeginFrame on Linux headless shell for opaque output; alpha outputs fall back to screenshots | PNG capture is slower: 15 s for the 5 s starter at 1080p60 with 2 workers |
| Encode | H.264 `yuv420p`, BT.709-tagged; CRF by `--quality` (§9) | the default `looks` is CRF 16 on `medium`, softer than a CRF 14 master |
| Audio | every `<audio id>` mixed at 48 kHz, AAC 192k, no loudness stage or limiter | bring a mastered WAV and mux it yourself |
| Length | root `data-duration`, read once at compile time | scripts and variables cannot change the film's length |

## 2. Setup

- **Pin the CLI**: `npx -y hyperframes@0.8.79 <command>`. The starter's `package.json` scripts do this.
- **Browser**: set `HYPERFRAMES_BROWSER_PATH` (alias `PRODUCER_HEADLESS_SHELL_PATH`) to a local headless shell, for example `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell` in a sandbox. Without it HyperFrames downloads its own pinned build. Chromium 141 rendered the starter correctly.
- **Privacy and side effects**: export `HYPERFRAMES_NO_TELEMETRY=1`. `init` installs the vendor's own agent skills into your home directory (`~/.agents/skills`, `~/.claude/skills`) unless `HYPERFRAMES_SKIP_SKILLS=1` is set, and those instructions would compete with this skill. `scripts/hf-finish.sh` sets both.
- **Start from the starter, not `init`.** `bash scripts/new-film.sh <dir> --engine hyperframes [--fps --bpm --size]` copies `assets/hyperframes-starter/` and the cinetic scripts, sets `FPS`, `BPM`, `W` and `H` in `motion.js`, then rewrites `index.html` to match: the root's `data-fps`, `data-width`, `data-height` and `data-duration` (= `TOTAL / FPS` from `timeline.js`, also on every clip that ran the whole film), the viewport meta and the `html, body` size. It then runs `npm install`, whose `postinstall` (`setup.mjs`) copies `vendor/gsap.min.js` and the fonts in from npm; with `--link-modules` it runs `setup.mjs` itself.
- **The starter's palette and mark are placeholders.** The `:root` block in `index.html` carries a `cinetic:placeholder` comment, and `node scripts/lint-film.mjs .` reports an error until you replace the palette and mark with the film's own (`references/brand-and-color.md`) and delete it. In a HyperFrames project `lint-film.mjs` reads the `:root` custom properties as the palette (any other hex is an error), treats `motion.js` as the easing module (raw beziers allowed there only) and skips `vendor/` and `scripts/`. `init` (`--non-interactive --example=blank`) refuses a non-empty folder, loads GSAP from a public CDN, and transcribes any `--audio`/`--video` you pass unless you add `--skip-transcribe`.

| Starter file | Role |
|---|---|
| `index.html` | the composition: root, clips, one paused timeline registered last |
| `motion.js` | grid (`FPS`, `BPM`, `b`, `sec`, `at`), `E`, `SPR`, `spring()`, `pulse()`, `hitPulse`, `squash`, `arrive`/`depart` and their GSAP-ease forms `arriving`/`departing`, sync helpers, `rand`; same names and numbers as the Remotion kit |
| `timeline.js` | the film's `ACT`, `DUR`, `CUE`, `COPY`, `TOTAL` in frames, `WORD_EASE`, and `FILM.cues()` for the sound |
| `audio/score.json` | the demo's music (key, chords, sections) for `scripts/audio/score.py` |
| `setup.mjs`, `package.json` | local GSAP and fonts; `npm run` scripts `lint`, `check`, `snapshot`, `cues`, `audio`, `render:preview`, `render` |
| `fonts/README.md` | how to add or swap faces |

## 3. Composition anatomy

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="5"
     data-fps="60" data-width="1920" data-height="1080">
  <div id="bg" class="clip" data-start="0" data-duration="5" data-track-index="0"></div>
  <div id="stage" class="clip" data-start="0" data-duration="5" data-track-index="1">…</div>
</div>
```

| Attribute | Where | Meaning |
|---|---|---|
| `data-composition-id` | root (required) | the key the timeline is registered under |
| `data-width`, `data-height` | root (required) | frame size; the runtime sizes `#root`, so style it `100%`, not in pixels |
| `data-duration` | root | film length in seconds, fixed at compile time; keep it equal to `TOTAL / FPS` |
| `data-fps` | root | default for `render --fps` (otherwise 30) |
| `data-start`, `data-duration` | any element | makes it a clip, visible on the half-open window `[start, start + duration)` |
| `data-start="intro + 2"` | clip | relative to another clip's end; the spaces are required (`intro-0.5` reads as an id) |
| `data-track-index` | clip | a Studio lane only; the renderer ignores it, so layer with `z-index` |
| `data-hidden` | any | hidden in preview and render |

- **Give every clip `class="clip"`** with `.clip { position: absolute; inset: 0 }`. Lint warns without the class, and the box is what makes the clip a frame-sized layer.
- **The window is half-open.** A clip with `data-duration="2"` is gone at exactly 2.000 s, so resolve end states a frame early.
- **Build the end state in static HTML and CSS first**, then animate from offsets towards it. The starter lays the lockup out with flex and tweens the mark from its measured centre offset back to `x: 0`.

## 4. The timeline contract

Each rule costs a broken render when ignored:

- **One `gsap.timeline({ paused: true })` per composition, stored at `window.__timelines["<data-composition-id>"]`.** The registry exists before your scripts run. With two or more timelines registered, a key that does not match its composition leaves the render frozen at t = 0.
- **Register last.** Building inside `document.fonts.load(...).then(build)` is fine, but the assignment is the final line of `build()`; an empty timeline registered early is taken as ready and renders blank (lint: `gsap_timeline_registered_before_async_build`). Optionally call `window.__hfForceTimelineRebind()` afterwards.
- **Only `fromTo`.** `from()` records its start state at creation and desyncs on seek-back; a `from()` whose CSS start is `opacity: 0` animates 0 to 0. When a later tween takes over a property an earlier one set, give it `immediateRender: false`.
- **Every tween lives on the timeline.** A stand-alone `gsap.to()` never renders, and nothing calls `tl.play()`.
- **One transform owner per node.** A CSS `transform` plus a GSAP transform on the same element conflict (lint: `gsap_css_transform_conflict`); two overlapping transform tweens on one element kill the entrance. Nest wrappers: position on the parent, squash on the child, recoil on a grandparent. Static placement with whole-pixel `left`/`top` is fine; animated `left`/`top` is not.
- **Never tween `display`, `visibility` or `autoAlpha` on a `.clip`** (lint: `gsap_animates_clip_element`); the clip's window owns visibility. Animate a child.
- **No `repeat: -1`.** Use `repeat: Math.max(0, Math.floor(dur / cycle) - 1)`; `ceil` overshoots (`gsap_repeat_ceil_overshoot`).
- **No clocks or chance**: no `Date.now()`, `performance.now()`, unseeded `Math.random()`, `requestAnimationFrame` loops, `setTimeout`, CSS `transition`, or network fetches at render time. Use `BF.rand(seed)`.
- **Transforms need a block box.** A transform on an inline `<span>` does nothing, and scaling an auto-width element shows nothing; use `inline-block` or `block` with a size.
- **Other runtimes** (CSS keyframes, Web Animations, vector-animation players, WebGL scenes) have seek adapters. Keep a film on GSAP so every move shares one clock and one set of eases. A WebGL layer renders from the `hf-seek` event's `e.detail.time` and needs an explicit root `data-duration`.

## 5. Sub-compositions: one file per act

A single-file film works (the starter is one), but lint then warns `nested_structure_needs_subcomposition`, a Studio-lane preference that does not affect the render. Past two acts, give each act its own file:

```html
<!-- index.html: a thin host. motion.js, timeline.js and GSAP load once in its <head>. -->
<div id="act2" data-composition-id="act2" data-composition-src="compositions/act2.html"
     data-start="4" data-duration="6" data-track-index="1" data-width="1920" data-height="1080"></div>
<script>window.__timelines["main"] = gsap.timeline({ paused: true });</script>
```

```html
<!-- compositions/act2.html: only the <template> contents are cloned into the host -->
<!doctype html><html><head><meta charset="UTF-8" /></head><body>
<template>
  <style>
    @font-face { font-family: "Geist"; src: url("fonts/geist-latin-wght-normal.woff2") format("woff2"); font-weight: 100 900; }
    #root { position: absolute; inset: 0; font-family: "Geist", sans-serif; }
    #act2-title { /* prefix ids with the act */ }
  </style>
  <div id="root" data-composition-id="act2" data-width="1920" data-height="1080">…</div>
  <script>
    (function () {
      const { sec, E } = window.BF, { ACT, CUE } = window.FILM;
      const L = (f) => sec(f - ACT.act2.from); // sub-composition time starts at 0
      const tl = gsap.timeline({ paused: true });
      // … tweens at L(CUE.x) …
      window.__timelines["act2"] = tl;
    })();
  </script>
</template>
</body></html>
```

- **Three ids must match**: the host's `data-composition-id`, the inner root's, and the `__timelines` key. A mismatch waits 45 s per slot ("Sub-composition timelines not registered after 45000ms") and then renders the act frozen.
- **`<style>`, `<script>` and `@font-face` go inside `<template>`.** The `<head>` is discarded, so styles there leave the act unstyled with no error.
- **Style the inner root as `#root`, never by class** (lint: `subcomposition_root_styled_by_class`).
- **The host's `data-duration` is the visible window.** A shorter inner timeline holds its last frame; a slot that ends before the film blanks (`subcomposition_blanks_before_host`).
- **Never add an act's timeline to the host timeline.** The runtime nests them; doing it yourself double-seeks.
- **An act cannot reach host elements.** Anything that crosses acts (the story device, the camera) lives on the host timeline at global time, which is how a device survives every cut without blinking.
- **Paths resolve from the project root**, so `url("fonts/…")` and `src="assets/…"` work unchanged inside acts.

## 6. Fonts

- **Ship every face as a local `.woff2` with an `@font-face`**, in the file that uses it (inside the `<template>` for acts). The renderer embeds a small set of common families and silently aliases well-known system names to one of them, so a family you name but don't ship can render as a different face with no warning. A hosted web-font link is fetched at build time and fails offline.
- **Lint errors** on any `font-family` it cannot resolve (`font_family_without_font_face`). It skips `var(...)` values, so write family names literally in `font-family`.
- **Load before you measure.** `document.fonts.ready` can resolve before a face has even started loading; call `document.fonts.load('600 144px "Geist"')` first, as the starter does, or measurements use the fallback's widths.
- Swapping faces, variable fonts and brand files: `assets/hyperframes-starter/fonts/README.md`. Type choice: `references/copy-and-type.md`.

## 7. Media and audio

- **Every `<audio>` and `<video>` needs an `id`**; an `<audio>` without one is silently left out of the mix (`media_missing_id`). Never put `crossorigin` on media, and never call `play()` or seek media yourself.
- **Video is muted picture**: `<video id muted playsinline data-start data-duration data-media-start>`; its sound goes on a separate `<audio id>` with the same timing. Use `--video-frame-format png` on renders of UI recordings.
- **Gain**: `data-volume` (0–3.98) and `data-automation` lanes (`{"version":1,"lanes":[{"target":"volume","points":[{"t":0,"v":0},{"t":1,"v":1}]}]}`, `t` in clip seconds).
- **There is no master bus, no loudness target and no audio-to-picture sync.** Score and master from the cues (`references/sound.md`), then mux the WAV with `scripts/hf-finish.sh --audio`. For preview only, you can mount it as one `<audio id="score" src="…" data-start="0" data-duration="…">`; `hf-finish.sh` ignores that mix when `--audio` is given.

## 8. Variables and batch renders

```html
<html data-composition-variables='[{"id":"title","type":"string","label":"Title","default":"Hello"}]'>
…<h1 id="title" data-var-text="title">Hello</h1>
```

- **Types**: `string`, `number`, `color`, `boolean`, `enum` (with `options`). Bind with `data-var-text` or `data-var-src`; each scalar is also the CSS variable `--title`; scripts read `window.__hyperframes.getVariables()`.
- **Per render**: `render --variables '{"title":"Hi"}' --strict-variables` (verified). Per act instance: `data-variable-values` on the host slot.
- **Batch**: `render --batch rows.json -o "renders/{index}-{name}.mp4"`, where each `{key}` is a row field. Batch goes through the JPEG/MP4 path; for masters, loop the rows through `hf-finish.sh <project> out/<name>.mp4 --variables "<row json>"`.
- **Length is not a variable.** The root `data-duration` is read before scripts run; variants of different lengths need different root files.

## 9. CLI

| Command | Use it for | Key flags |
|---|---|---|
| `lint [dir]` | static contract check; must show 0 errors | `--json` (`errorCount`, findings), `--verbose` |
| `check [dir]` | lint, runtime errors, layout (overflow, occlusion), motion sidecars and WCAG AA contrast in one Chromium pass | `--at 1.5,4` (seconds; use your cues), `--samples 9`, `--tolerance 2`, `--strict` (warnings fail), `--no-contrast`, `--snapshots`, `--json` |
| `snapshot [dir]` | PNG stills into `snapshots/` | `--at t1,t2`, `--frames 5`, `--zoom "#sel"` or `x,y,w,h`, `--zoom-scale 3`, `--angle iso` |
| `keyframes [dir]` | onion-skin proof of a move | `--selector "#mark" --shot out.png --samples 9 --layout path\|strip --from --to` |
| `timeline --json` | every clip's absolute start and end | |
| `preview` | Studio on port 3002 | `--background`, `--status`, `--stop` |
| `render [dir]` | frames or video | see below |
| `doctor`, `browser` | environment and Chromium problems | |

`render` flags: `-o`, `-c compositions/x.html`, `--fps` (1–240, or a rational like `30000/1001`), `--format mp4|webm|mov|gif|png-sequence|hls`, `--quality`, `--crf` or `--video-bitrate`, `--resolution landscape-4k` (supersamples by an integer device scale at the same aspect), `--workers N` (each a Chrome process, about 256 MB), `--strict` (fail on lint errors; without it a broken composition still renders), `--variables`, `--batch`.

| `--quality` | x264 preset | CRF | Capture |
|---|---|---|---|
| `draft` | ultrafast | 28 | JPEG q80 |
| `looks` (default) | medium | 16 | JPEG q95 |
| `standard` | medium | 18 | JPEG q95 |
| `delivery` / `high` | slow | 15 | JPEG q95 |

`mov` is always ProRes 4444 with alpha and `webm` is VP9 with alpha. `png-sequence` writes `frame_000001.png…` (1-based) plus an `audio.m4a` sidecar when the composition has audio. Engine sub-frame motion blur exists but is not exposed by the CLI; §11.8 does it outside.

## 10. Traps the linter does not catch

| Symptom | Cause | Fix |
|---|---|---|
| Act renders unstyled, tiny text top-left | `<style>` in the act file's `<head>` | move it inside `<template>` |
| 45 s stall, then a frozen act | host id, inner id and `__timelines` key differ | make all three identical |
| Entrance animates 0 → 0 | `from()` against a CSS `opacity: 0` start | `fromTo` with both ends |
| Entrance missing, the other move fine | two transform tweens on one node | parent/child wrappers |
| Tween never renders | stand-alone `gsap.to()` | put it on `tl` |
| Background turns black in the master | PNG capture drops the `html`/`body` background (alpha 0), and encoding makes it black | put the fill on a full-bleed `.clip` layer; `hf-finish.sh` fails on transparent pixels |
| `check` flags text "occluded" or "overflowing" while a mask hides it | the audit reads DOM boxes, not clipping | mark masked reveals `data-layout-allow-overflow data-layout-allow-occlusion`, or fade opacity with the reveal |
| `check` reports "0 samples" and looks clean | a lint error disables the layout audit | get lint to 0 errors first |
| Measured layout off by a few pixels | measured before the face loaded | `document.fonts.load(...)` before measuring |
| Clip starts at 0 | relative start typo (`intro-0.5`) or a target with no duration resolves silently | spaces around `+`/`-`; check `timeline --json` |
| Untimed background has no height | an untimed layer gets no clip box | `position: absolute; inset: 0` |
| Iframe content is static | iframes do not seek | rebuild it as DOM |
| Render fails offline or in CI | GSAP or fonts from a CDN | local `vendor/gsap.min.js` and woff2 (`setup.mjs`) |
| Film ends early, or its last frame freezes | root `data-duration` differs from `TOTAL / FPS` | keep them equal; `hf-finish.sh` checks |

## 11. Translating cinetic

`motion.js` gives HyperFrames the Remotion kit's vocabulary with identical numbers: `E`, `SPR`, `hitPulse`, `squash`, `lmix`, `rand`, `peak`, `settleOf`, `delayTo` and `hit` match `src/lib/anim.ts` and `src/lib/sync.ts` (checked to 1e-5 for eases and 0.1% of travel for springs). Token tables and when to use each: `references/motion-tokens.md`. Grid, cues and holds: `references/timing-grid.md`.

### 11.1 Frames on the grid, seconds at the call site

`timeline.js` keeps `ACT`, `CUE`, `DUR` and `TOTAL` in frames, so grid rules, `COPY` holds and the cue export read the same integers as the Remotion kit. Convert only where GSAP needs seconds:

```js
const { E, sec, at, startFor } = window.BF;
const { CUE, DUR } = window.FILM;
tl.fromTo("#pcA", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: sec(DUR.rise), ease: E.out }, sec(CUE.rise));
tl.fromTo("#flash", { opacity: 0 }, { opacity: 1, duration: sec(12), ease: E.out }, sec(CUE.hit - 1));
```

A tween placed at `sec(cue)` is at progress 0 on the cue frame, so the first visible change arrives a frame late. Start changes that must show on a hit at `cue − 1`, exactly as with `prog()` in Remotion. A tween that ends on the cue (a contact) is already right.

### 11.2 Easing tokens

`E.out` and the rest are plain functions built by `bez()` (a cubic-bezier solver), and GSAP accepts any function as `ease`. Never type a bezier or a GSAP ease string (`"power3.out"`, `"back.out"`) in a composition: one set of named curves is what makes the motion read as one brand. Add a token to `motion.js` if the film needs a new one.

### 11.3 Springs

GSAP has no spring, and `elastic` is not one. `BF.spring(cfg)` returns a closed-form, seek-safe ease plus its settle time:

```js
const S = BF.spring(BF.SPR.snap);                     // S.durF = 33: settled to 0.1% of travel
const start = CUE.lock - BF.delayTo(BF.SPR.snap, 1);  // 10 f early, so it touches its slot on the beat
tl.fromTo("#chip", { y: 80 }, { y: 0, duration: S.dur, ease: S.ease }, sec(start));
```

`spring({ response, dampingFraction })` also works. Overshooting presets (`snap`, `pop`, `land`) go on transforms only, with opacity on its own short tween, and wherever overshoot could collide, pick a critically damped preset instead (`firm`, `soft`, `heavy`).

### 11.4 Pulses and contact squash

`BF.pulse(attack, tau)` turns `hitPulse` into an ease that goes 0 → 1 → 0, so the tween's `to` value is the peak and the property returns exactly to rest:

```js
const sq = BF.pulse(1, 4); // BF.squash's envelope: 10% flatter, 8% wider, anchored at the contact edge
tl.fromTo("#pcC > span", { scaleX: 1, scaleY: 1 }, { scaleX: 1.08, scaleY: 0.9, duration: sq.dur, ease: sq.ease }, sec(CUE.hit));
```

Started on the cue, it peaks `attack` frames later (2 f with the default `pulse()`), the "picture answers the sound" lag from `references/motion-tokens.md` §5. Amplitudes are in the same section. Several pulses on one property need one wrapper each.

### 11.5 Sync and the sound export

- **Arrivals that lock on a beat**: `startFor(cue, durF, ease)` returns the start frame at which the tween reaches 97% of its travel exactly on the cue (the `settleOf` threshold, where the settle sound goes). An `E.out` word over 30 f starts 14.8 f early.
- **Vertical text** snaps to whole pixels in the headless shell, so a rise on plain `E.out` settles in 1 px ticks (`references/chromium-rendering.md` §15). Rise text on `BF.arriving(E.out)`, as the starter's `FILM.WORD_EASE` does, and pass the same ease to `startFor`.
- **Springs**: start at `cue - delayTo(cfg, thr)` (`thr` 1 for impacts, 0.5 for pops).
- **Sound events** come from `FILM.cues()` in `timeline.js`, computed with `peak`, `settleOf` and `delayTo` from the same constants the picture uses. `bash scripts/hf-finish.sh . --export-cues out/cues.json` writes the standard `out/cues.json` (`{fps, bpm, total, acts, cue, events}`) for `scripts/audio/score.py`. Event kinds and fields: `references/sound.md`.

### 11.6 Discrete state and DOM work

- **Counters and typed text**: tween a proxy and write the whole-frame value in `onUpdate`. It renders correctly under out-of-order seeks (verified: 0 / 50 / 97 at frames 0, 15 and 29 of a one-second linear 0 → 100 count at 30 fps):

```js
const n = { v: 0 }, el = document.getElementById("count"); // HTML starts with the from-value
tl.fromTo(n, { v: 0 }, { v: 100, duration: sec(40), ease: E.ui, onUpdate: () => { el.textContent = String(Math.round(n.v)); } }, sec(CUE.count));
```

- **Measure once, at build time**, after fonts load, and only for layout that will not change; multi-act films keep positions as constants in `timeline.js`.
- **Camera**: one world wrapper per shot owns the camera transform (`references/camera.md`); scale in log space with `BF.lmix` when you compute values yourself.

### 11.7 Finishing

```bash
bash scripts/hf-finish.sh . out/preview.mp4 --preview                               # fast look: CRF 20, no check
bash scripts/hf-finish.sh . --export-cues out/cues.json                             # npm run cues
python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json \
    --out public/audio/soundtrack.wav --stems out/stems --json out/qa/score.json    # npm run audio
bash scripts/hf-finish.sh . out/film.mp4 --audio public/audio/soundtrack.wav         # npm run render
```

The script runs: preflight (root `data-duration` equals `TOTAL / FPS`, `data-fps` equals `FPS`, every `@font-face` file and local script exists) → `lint` at 0 errors → `check` → `render --format png-sequence --strict` → a frame count and transparent-pixel gate → one x264 encode at CRF 14 `slow`, BT.709 limited range and tagged → mux the WAV as AAC 320k at 48 kHz, cut to the picture's exact length → `check-sync.py` → `probe.py`. It prints a JSON report and writes QA logs to `out/qa/`. Run on the starter, the three commands produce a 5 s master in under a minute on 2 workers: −14.0 LUFS, −2.2 dBTP after AAC, 0-sample lag. Encoding and deliverables in general: `references/finishing.md`.

### 11.8 Motion blur

`--blur K` renders at `fps × K` and hands the frames to `scripts/accumulate.py --uniform K`, which averages the sub-frames centred on each frame (a 240° shutter by default, `--shutter` to change) in float and quantizes once:

```bash
bash scripts/hf-finish.sh . out/film.mp4 --audio public/audio/soundtrack.wav --blur 4   # 240 fps render, 2 min for 5 s
```

- **K is capped at 240 / fps** (4 at 60 fps), so the samples always sit a quarter frame apart and a moving edge becomes a few bands `speed / 4` px wide. Measured on the starter: at 14 px/f the three 3.5 px bands read as a soft edge at speed but show on pause; at 27 px/f they separate into three distinct copies. Treat about 18 px/f as the ceiling, and build faster films in Remotion, whose adaptive sampling (`render.sh --blur`) adds samples with speed.
- **Under about 12 px/f, skip blur**: the sharp master reads clean at 60 fps. The starter keeps its fastest move, the 277 px glide, at 11 px/f by giving it 72 f.
- Measure speed on a sharp render with `scripts/measure-speed.py` before deciding.
