# Finishing: motion blur, banding, colour, encode, mux and deliverables

Covers everything between "the picture code is done" and "the files are shipped": the render modes, true motion blur as a render pass, banding, BT.709 colour, encoder settings, the audio mux, splicing, and every deliverable format. Read it before Step 6 (Render and finish) and Step 8 (Deliver), and whenever a render looks different from the Studio.

The numbers here are proven defaults from shipped films, Tessel among them. Start from them; change one when a measurement tells you to.

**Contents**
1. [Render modes at a glance](#1-render-modes-at-a-glance)
2. [Motion blur is a render pass](#2-motion-blur-is-a-render-pass)
3. [Banding](#3-banding)
4. [Colour: BT.709 everywhere](#4-colour-bt709-everywhere)
5. [Encoder settings](#5-encoder-settings)
6. [Audio mux](#6-audio-mux)
7. [Chunked renders and splices](#7-chunked-renders-and-splices)
8. [Deliverables](#8-deliverables)
9. [Gates](#9-gates)

---

## 1. Render modes at a glance

Remotion always renders the picture muted; ffmpeg attaches the sound; two scripts gate the result. `scripts/render.sh` does all of it and exits 1 if a gate fails.

| Mode | Command | What happens | Relative cost |
|---|---|---|---|
| Preview | `bash scripts/render.sh Film out/preview.mp4 --preview` | CRF 20, x264 veryfast, BT.709 tags | 1× |
| Sharp master | `bash scripts/render.sh Film out/film.mp4` | CRF 14, x264 slow, BT.709 tags | ~1.2× |
| Blurred master | `bash scripts/render.sh Film out/film.mp4 --blur` | sharp pass → speed → sub-frames → float accumulate | 5–15× |
| One act | `... --blur --frames 600-839` | the same, on a film-frame range; audio from the same range | per act |
| Chunked | `bash scripts/render-chunks.sh Film out/film.mp4 4` | N browsers at concurrency 1, joined with `-c copy` | often faster on GPU-heavy scenes |

Useful flags: `--no-audio` for silent loops, `--audio FILE`, `--build-audio` (reruns `scripts/export-cues.ts` and `scripts/audio/score.py` first, stems included), `--concurrency N`, `--keep` (keeps `sharp.mp4`, `sub.mp4` and `picture.mp4` for inspection), and `-- <args>` to pass anything through to every `remotion render` call (for example `-- --image-format=png`). `render.sh` warns when a file in `src/` is newer than the soundtrack, because a retimed picture with an old WAV is the most common sync bug.

Use the preview for every review round. Render the blurred master when the round's picture changes are done, not after each fix.

## 2. Motion blur is a render pass

Anything that moves faster than about 12 px per frame at 60 fps strobes without blur: the eye sees discrete copies instead of motion. Launch films almost always have such moments (whips, floods, flying cards, drops). `measure-speed.py` prints the peak speed, so you do not have to guess.

### Why not in the browser

- **`CameraMotionBlur`** (`@remotion/motion-blur`) stacks N copies of the scene, each at `opacity(1/N)` with `mix-blend-mode: plus-lighter`, frozen at `f − shutter·i/N + 1`. The shutter therefore sits *ahead* of the frame instead of centred on it, and every layer is quantised to 8 bits before it is added. You get posterised plateaus in soft gradients, light greys tinted cyan or pink, rings with coloured fringes, and a frame that darkens a little per sample. It also spends N renders on frames that do not move.
- **`HtmlInCanvasMotionBlur`** centres the shutter correctly but accumulates on an 8-bit 2D canvas (`globalAlpha = 1/N`, `lighter`), so it quantises the same way, and it needs Chromium ≥ 149. Sandboxes often ship an older headless shell.

Average outside the browser, in float, and quantise once.

### The pass

`render.sh --blur` runs these steps. Each one is a script you can run alone.

1. **Sharp render** of the composition (CRF 12, native colour), used only for measurement.
2. **`measure-speed.py sharp.mp4 out/samples.json`** decides the samples per frame (`groups`) from optical flow.
3. **Sub-frame render.** The `FilmSub` composition renders the film once per sub-frame: `--props=out/samples.json --crf=6 --pixel-format=yuv444p`. Its length comes from `calculateMetadata` summing `groups`.
4. **`accumulate.py sub.mp4 out/samples.json picture.mp4`** averages each frame's group in float and encodes BT.709 CRF 14.
5. **Mux**, then **`check-sync.py`** and **`probe.py`** (§6, §9).

`FilmSub` and `src/blur.ts` ship in the starter. The core of it:

```ts
export const SHUTTER = 240; // degrees; measure-speed.py --shutter must match
export const sampleTimes = (f: number, n: number): number[] => {
  if (n <= 1) return [f];
  const a = ACTS.find((x) => f >= x.from && f < x.from + x.dur) ?? { from: 0, dur: TOTAL };
  const span = SHUTTER / 360, lo = a.from, hi = a.from + a.dur - 1e-3;
  return Array.from({ length: n }, (_, i) => Math.min(hi, Math.max(lo, f + span * ((i + 0.5) / n - 0.5))));
};
// FilmSub: frame j = the film frozen at the j-th sub-frame time
<Freeze frame={subs[j].t}><Film /></Freeze>
```

The shutter is centred on the frame (a 240° shutter spans f ± 1/3). Samples are clamped inside the frame's act, so the frame before a cut never averages in the next shot.

### How many samples

```
n = 1                                             if speed < 2 px/f   (renders once)
n = clamp(ceil((shutter/360) · speed / step), 4, 48)   otherwise; shutter 240°, step 3 px
```

| Peak speed (px/f) | 2–18 | 30 | 60 | 120 | ≥ 216 |
|---|---|---|---|---|---|
| Samples | 4 | 7 | 14 | 27 | 48 (cap) |

Above the cap (216 px/f with a 3 px step), neighbouring samples sit more than 3 px apart and edges show faint steps; the script prints a note. Either raise `--max` or accept it on a 1–3 frame whip, where nobody sees it.

### Measuring speed (`measure-speed.py`)

- **Robust maximum, not a percentile.** Dense Farneback flow reports the k-th fastest moving pixel (k = max(30 px, 0.1% of moving pixels)); pyramidal Lucas–Kanade corner tracks with a forward-backward check under 1 px report the 2nd-fastest track. The larger wins. A 95th percentile under-reads small fast objects (a dot, a caret, one word) by about 2×, and that is exactly where stamped copies show.
- **The shutter straddles the frame**, so frame f takes the faster of its incoming and outgoing move.
- **A ±2 frame temporal max filter** stops the count flickering (4 → 34 → 4 reads as blur strobing on and off).
- **Floors** for ranges you know are fast but flow cannot see: `--floor 1210-1260:16`, or `render.sh --floor ...`. Flow's blind spots are an edge with no 2D structure (a flat band wiping across the full frame reads about 0) and a small flat object jumping more than about 300 px/f at 1080p (both trackers lose it). It sometimes over-reads flat regions next to edges; that only costs time.
- **Analytic speed**: if the timeline can export true screen velocity, pass `--analytic out/speed.json` (`{"speed": [px/f per frame]}` or `{"ranges": [{"from", "to", "speed"}]}`); the larger of flow and analytic wins.
- **Suspect cuts.** Big changes the flow cannot explain (hard cuts, floods, flashes) keep their measured speed, because a flood edge really is fast and over-sampling a cut only costs time. With `--cues out/cues.json`, the ones away from act boundaries are listed so you can check them.

### Rules the picture code must follow

- **Every hard cut is an act boundary.** Sub-frames only stay on one side of a cut because `sampleTimes` clamps to the act. A cut inside an act blends the next shot into the last frame of the previous one.
- **Discrete state reads `fd(frame)` (`Math.round`).** `<Freeze>` hands the film fractional frames. A caret that blinks on `Math.floor(f / 16)`, a typed-character count or a counter would disagree across one frame's samples and show doubled carets and half-opacity letters. Typed text, carets, counters, labels, layout switches and raster-scale switches all use `fd`.
- **Grain and noise are keyed to `fd`**, or they average away into mush.
- **Everything is deterministic.** Seeded `random()` only; sub-frames are rendered by several browser tabs in any order.

### Cost

| Film | Frames | Sub-frames | Ratio | Time |
|---|---|---|---|---|
| Tessel master (33 s, 60 fps) | 1,980 | 19,841 | 10.0× | 3,387 s at concurrency 4 |
| Tessel's fastest 2 s (robust stats) | 120 | 3,033 | 25× | — |
| Starter demo, 1.5 s with `--max 16` | 90 | 504 | 5.6× | 70 s at concurrency 2 |
| Starter demo, whole 9 s | 540 | 2,531 | 4.7× | 277 s end to end on 4 CPUs (default concurrency) |

Still frames cost one render, so the ratio depends on how much of the film moves. To save time, cap `--max` for previews of the blur (`--measure "--max 12"`), and re-render only the acts that changed (§7).

### HyperFrames

HyperFrames seeks `t = frame/fps` and has no adaptive sub-frame stream, so render at `fps × K` and average uniformly: `python3 scripts/accumulate.py 'frames/*.png' out/picture.mp4 --uniform 4 --in-fps 240`. Each output frame averages the `ceil(K·240/360)` sub-frames centred on it (K = 4 gives 3 samples, 0.25 f apart). HyperFrames renders at most 240 fps, so at 60 fps K ≤ 4; that is clean to roughly 12–18 px/f. Faster films belong in the Remotion path. `scripts/hf-finish.sh --blur 4` wires this up; see `references/hyperframes-engine.md`.

## 3. Banding

Chromium renders CSS gradients in 8 bits. A ramp that spans only a few code values (a glow on ink going 11 → 29, a tabletop going 231 → 247) shows as contour rings, about one per code value. Nothing downstream can fix it: motion blur, a better encoder or grain added later all start from the already-quantised ramp.

- **Rule of thumb:** a CSS gradient whose channels change by fewer than about 30 code values across the frame will band. `lint-film.mjs` flags low-span gradients.
- **Fix:** compute the gradient in float, add ±1 LSB triangular dither, quantise once, and load it as an image:

```json
{"size": [1920, 1080], "seed": 11, "backdrops": [
  {"name": "glow-ink", "type": "radial", "at": [0.5, 0.45], "radius": [0.7, 0.6],
   "stops": [["rgba(255,255,255,0.075)", 0], ["transparent", 0.7]]},
  {"name": "table", "base": "#E7E8EC", "type": "radial", "at": [0.5, 0.4], "radius": [0.65, 0.6],
   "stops": [["#F7F8FA", 0], ["#F7F8FA00", 0.75]]},
  {"name": "floor", "type": "linear", "angle": 180, "space": "oklab", "stops": [["#0B0C0E", 0], ["#16181C", 1]]}]}
```

```bash
python3 scripts/dither-gradient.py --spec backdrops.json --out public/fx --preview out/qa/bands
```

```tsx
<Img src={staticFile('fx/table.png')} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
```

- `type` follows CSS: `radial` is `ellipse RX RY at CX CY` in fractions of the frame; `linear` takes a CSS angle (180 = top to bottom). `space` is `srgb` (CSS default), `linear` or `oklab` (the smoothest ramp between two neutrals).
- With `base` the PNG is opaque RGB. Without it, it is RGBA, and the alpha carries the dither (a white glow over ink is one alpha step per output level).
- **Detection:** the `--preview` folder holds a ×12 contrast-stretched copy of each backdrop; bands are obvious there. On renders, the banding sheet from `scripts/forensics.py` does the same stretch on dark frames.
- Slow colour ramps done with `interpolateColors` step for a different reason (gamma sRGB with integer rounding); see `references/brand-and-color.md`.

## 4. Colour: BT.709 everywhere

HD players decode with BT.709. Remotion 4's default colour space (`'default'`) writes untagged BT.601 from its JPEG frames (`yuvj420p`, full range, `bt470bg`), so a preview judged on one player differs from the master on another, and banding judgements carry over badly.

This section is the one place the colour pipeline is defined; the other files point here.

| Encode | Colour space | Why |
|---|---|---|
| Previews, sharp masters, variants, alpha (`render.sh`, `deliver.sh`, any `npx remotion render`) | `bt709`: the starter's `remotion.config.ts` sets `Config.setColorSpace('bt709')`, and the scripts pass `--color-space=bt709` too | converts to BT.709 limited range and writes the four tags, so every player decodes it the same way |
| Intermediates inside `render.sh --blur` (the speed-measurement pass and the `FilmSub` sub-frame stream) | `default`, passed as `--color-space=default`, which overrides the config for those two calls | Chromium's JPEG frames stay as captured (`yuvj444p`/`yuvj420p`, full range, `bt470bg`) with no range squeeze before averaging; `accumulate.py` decodes by those tags and converts to BT.709 once |
| `accumulate.py`, `hf-finish.sh`, splices and re-encodes | explicit ffmpeg conversion (below) | quantised once, tagged |

Verified on the starter demo: paper, ink and accent pixels decode within 1 code value of their tokens in both the preview and the blurred master. Do not set `setColorSpace('default')` in the config to "match" the intermediates; that would leave every other render untagged BT.601.

- **In your own ffmpeg encodes** (accumulate, splices, re-encodes), convert and tag explicitly:

```bash
-vf scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int \
-pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
```

- **When decoding for QA or stills,** convert with the file's own matrix and accurate rounding, not ffmpeg's implicit conversion: `-vf scale=in_color_matrix=auto:in_range=auto:flags=accurate_rnd+full_chroma_int,format=rgb24`. Measured on a Tessel frame against a PNG still, the explicit path is within 0.2–0.4 code values; the implicit one is off by about 0.6.
- `bt2020-ncl` in Remotion tags HLG (`arib-std-b67`), which is wrong for SDR graphics. Do not use it.
- `probe.py` fails any file without `bt709/bt709/bt709/tv`.

## 5. Encoder settings

| Stage | Format | Settings | Why |
|---|---|---|---|
| Frame capture | JPEG q95 (starter default) | `--image-format=png` for dark gradient-heavy shots, fine colour edges or alpha | Remotion's default q80 blocks up soft gradients |
| Preview | H.264 yuv420p | CRF 20, veryfast | fast, same tags as the master |
| Sharp master | H.264 yuv420p | CRF 14, slow | transparent quality for flat colour and hairlines |
| Sharp pass (for measuring) | H.264 | CRF 12, veryfast | only read by optical flow |
| Sub-frame stream | H.264 yuv444p | CRF 6, veryfast | near-lossless; no extra chroma loss before averaging |
| Blurred master | H.264 yuv420p (or `--10bit`) | CRF 14, slow, via `accumulate.py` | quantised once |
| Web loop | VP9 | CRF 32, `-b:v 0` | about half the size of the H.264 master |

Remotion's defaults are JPEG q80, CRF 18 and x264 `medium`; each is visibly worse on flat colour and gradients. `accumulate.py --10bit` writes High 10 for masters that will be graded or re-encoded; ship 8-bit to the web.

## 6. Audio mux

Render the picture with `--muted` and mux with ffmpeg. Remotion's own AAC encode leaves 2,048 samples of encoder priming in the stream (42.7 ms, 2.6 frames at 60 fps), so the sound lands late, and late sound reads as sloppy even when nobody can say why.

```bash
ffmpeg -i picture.mp4 -ss <offset> -i public/audio/soundtrack.wav -map 0:v:0 -map 1:a:0 -c:v copy \
  -af apad -c:a aac -b:a 320k -ar 48000 -ac 2 -t <frames/fps> -movflags +faststart out/film.mp4
```

- `-af apad -t` makes the audio exactly as long as the picture: padded with silence if the WAV is short, trimmed if it is long. `-shortest` alone would cut the *picture* when the WAV is short.
- `-ss <offset>` takes the audio from the matching point for excerpt and per-act renders (`render.sh` sets it from `--frames` or `--audio-offset`).
- **Check after the encode.** AAC raises peaks by 0.5–1 dB (a WAV at −1.41 dBTP measured −0.5 dBTP after encoding), so `check-sync.py` measures true peak on the decoded MP4 (4× oversampled) and cross-correlates the decoded audio with the WAV at 12%, 45% and 85% of the film. The gates are ≤ 48 samples of lag (1 ms) and ≤ −1 dBTP. The mastering chain that keeps the peak there lives in `references/sound.md`.
- `+faststart` puts the index at the front so web players start before the download finishes.

## 7. Chunked renders and splices

- **`render-chunks.sh <Comp> <out> [chunks] [crf]`** bundles once, renders N frame ranges as N separate browsers at concurrency 1, and joins them with the concat demuxer (`-c copy`, lossless, since each chunk starts on a keyframe with identical settings). On scenes limited by the GPU or compositor this often beats one browser with N tabs. Sharp renders only.
- **Re-render only what changed.** Render the master as act-sized parts with no audio, join them, and mux once. After a late fix, re-render only that part. Act boundaries are safe splice points by construction, because blur samples never cross them.

```bash
bash scripts/render.sh Film out/parts/p1.mp4 --blur --frames 0-599   --no-audio --samples out/samples-p1.json --no-check
bash scripts/render.sh Film out/parts/p2.mp4 --blur --frames 600-839 --no-audio --samples out/samples-p2.json --no-check
printf "file '%s'\n" "$PWD"/out/parts/p*.mp4 > out/parts/list.txt   # check the order
ffmpeg -f concat -safe 0 -i out/parts/list.txt -i public/audio/soundtrack.wav -map 0:v -map 1:a -c:v copy \
  -af apad -c:a aac -b:a 320k -ar 48000 -ac 2 -t <TOTAL/fps> -movflags +faststart out/film.mp4
python3 scripts/check-sync.py out/film.mp4 && python3 scripts/probe.py out/film.mp4 --spec 1920x1080@60 --frames <TOTAL>
```

- If you must splice inside an act, cut on a frame where nothing moves (a static seam frame), so the two renders cannot disagree on screen.

## 8. Deliverables

`scripts/deliver.sh <master>` writes the set into `out/deliver/` with a `manifest.json` of every file and check, and exits 1 if a check fails.

| Deliverable | How | Spec and budget |
|---|---|---|
| Poster | always: the final frame (`--poster-frame N` to override) | `poster.png` (exact) + `poster.jpg`; the final frame is designed to be the poster (see `references/concept-and-story.md` for the recall trade-off) |
| Web loop, MP4 | `--loop` | muted, `+faststart`, loop-seam check |
| Web loop, WebM | `--webm` | VP9 CRF 32, BT.709 tagged, Opus audio unless `--loop` |
| GIF | `--gif` | 25 fps, 960 px wide, two-pass palette; warns above 8 MB |
| Alpha for editors | `--alpha StingAlpha` (+ `--alpha-webm`) | ProRes 4444 `.mov` with alpha; VP9 alpha `.webm` |
| Aspect variants | `--variants Film9x16,Film1x1` | each through `render.sh`, own spec |

- **Loop seam.** The step from the last frame back to frame 0 must look like the steps around it: seam difference ≤ max(0.4, 1.5× the median of the 8 steps at each end), the same rule as `forensics.py --loop`. Design the loop so the last frame's state flows into frame 0 (the length is whole bars; see `references/formats.md`), and do not repeat frame 0 as the last frame, which reads as a hitch.
- **GIF.** Frame delays are whole hundredths of a second, so 25 fps (4 cs) and 50 fps (2 cs) play at the true rate while 30 fps plays 11% fast. A GIF of busy full-frame UI is large (4 s at 960 px measured 26 MB); keep GIFs to short, simple loops at 480–960 px and ship WebM or MP4 wherever the page allows video. `--gif-dither bayer` gives a steadier pattern on large flat areas than the default `sierra2_4a`.
- **Alpha.** The composition must paint no background, usually through a prop such as `{transparent: true}` that skips the paper fill; `deliver.sh` warns if the first frame is fully opaque. The Remotion recipe is `--codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png`. `ffprobe` reports the result as `yuva444p12le` (the decoder's format), so check for `yuva444p*` and profile 4444. VP9 alpha is `--codec=vp9 --pixel-format=yuva420p --image-format=png` and carries `alpha_mode=1`.
- **Aspect variants** (9:16, 1:1, 4:5) are separate compositions re-laid out from the same timeline, never crops of the 16:9 master, because a crop cuts type and moves the focal point. Platform safe zones and type sizes are in `references/formats.md` and `references/copy-and-type.md`.
- **Sound-off viewing.** Feeds autoplay muted: if the film needs its words, burn them in as designed type, not as a default caption pill.
- **Size budgets.** Check with `probe.py --max-mb`: a landing-page loop in the low single-digit MB, a social upload within the platform's limit; a 30 s 1080p60 master at CRF 14 is typically 20–30 MB.

## 9. Gates

| Check | Script | Pass |
|---|---|---|
| Size, fps, frame count | `probe.py --spec 1920x1080@60 --frames N` (or `--dur s`) | exact size and fps; ±1 frame |
| Pixel format and tags | `probe.py` | `yuv420p`; `bt709/bt709/bt709/tv` |
| Audio stream | `probe.py` (`--audio none` for silent loops) | AAC, 48 kHz, stereo, length within one frame plus one AAC frame of the picture |
| Sync | `check-sync.py film.mp4 soundtrack.wav` | ≤ 48 samples at every sample point, correlation ≥ 0.5 |
| True peak | `check-sync.py` | ≤ −1 dBTP after decode |
| Loudness (optional) | `probe.py --lufs -14 --tp-max -1` or `check-sync.py --lufs -14` | −14 ± 1 LUFS integrated |
| Loop seam | `deliver.sh --loop` or `forensics.py --loop` | seam ≤ max(0.4, 1.5× median step at the ends) |
| Alpha | `deliver.sh --alpha` / `probe.py --vcodec prores --pix-fmt yuva444p10le,yuva444p12le` | ProRes 4444 with alpha |

All of them print JSON on stdout (probe and check-sync also take `--json FILE`) and exit 0 on pass, 1 on fail. `render.sh` writes its reports to `out/qa/probe-<name>.json` and `out/qa/sync-<name>.json`. Pixel-level QA (pops, ghosts, judder, banding sheets) is `scripts/forensics.py`; see `references/review-loop.md`. Chromium-specific artifacts and their fixes are in `references/chromium-rendering.md`.
