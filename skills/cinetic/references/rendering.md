# Rendering: previews, finals, and keeping the machine alive

Rendering a film is the heaviest thing the skill does: a headless browser draws every frame, then ffmpeg encodes them.
Treat the user's machine with care.

## The loop

| Step | Command | Cost |
|---|---|---|
| storyboard | `node scripts/frames.mjs sheet` | one still: 36 frozen frames, ~1-2 min with bundling |
| a moment | `node scripts/frames.mjs sheet --frames 200,203,206,...` (up to 36 frames of one turn) | same |
| one frame, full size | `node scripts/frames.mjs still --frame 240 --full` | seconds |
| motion preview | `node scripts/frames.mjs render` (half size) | ~0.2-0.4 s per frame on a laptop CPU |
| motion check | `node scripts/frames.mjs strip out/main-preview.mp4 --at 7.5 --dur 2` | seconds |
| final | `node scripts/frames.mjs final` (picture + sound + loudness in one pass) | ~0.5-2.5 s per frame on software GL (textures, blurs and photos are the slow ones) |

Read every sheet and strip you make (they are images): that is how you see the film. Judge motion from strips of a rendered
preview, not from single frames.
- `sheet` renders the whole film as 36 frozen frames in one still; `--safe` outlines the 8 % margin in every cell.
  `--frames` zooms in on one moment (a turn, a morph). The sheet shows composition and rhythm, not small type: for any
  beat with UI text or a label, also render `still --frame N` at full size and read the words.
- `strip` shows a moment of the preview at 15 frames a second, so you can judge motion, not just layout.
- `check` measures the preview (how crowded the frames are, change every half second, empty frames, ending length) and
  prints what to fix. Its `air` line says how much of the frame is sharp detail, how often three or more things share a
  frame and how often the frame cuts on two sides; a crowded film fails. The coverage figure is information, never a
  target: do not add things to raise it. `--format loop` drops the sound, ending and music lines and fails when the last
  frame does not match the first; `--format sting` has no pace gate under 8 s and lets the ending hold.

## Safety

- **One render at a time.** Never start a second render while one runs; never run renders in parallel agents.
- **Half size while iterating**, the full-size final once, when the sheet passes the rubric.
- **Unstable GPU** (driver resets, blue screens, a laptop iGPU): render on the CPU with `CINETIC_GL=swangle`. It is slower and
  safe. If the user tells you their machine has such a rule or a wrapper for heavy jobs, use it for every render.
- **Concurrency:** `CINETIC_CONCURRENCY` (default 2). Higher is faster and hotter; keep 1-2 on laptops.
- **Long finals** (or a machine that limits how long one job may run): render the picture in silent parts, the sound once,
  and mux them:
  ```
  node scripts/frames.mjs render --final --muted --range 0-199   --out out/part-a.mp4
  node scripts/frames.mjs render --final --muted --range 200-399 --out out/part-b.mp4
  node scripts/frames.mjs audio                                   # out/audio.wav, the whole mix
  node scripts/frames.mjs mux out/part-a.mp4 out/part-b.mp4      # out/main.mp4
  ```
  `audio` still steps through every frame (about as long as a half-size preview, ~0.3-0.5 s a frame on a CPU): give it
  its own job. `mux` joins the parts without re-encoding, lays the sound on the picture's own start time (encoders shift the first
  frame by a few ms; joined parts with their own sound drift and click at every seam), and sets the loudness to -16 LUFS
  with true peaks under -1.5 dBTP. It prints the master's loudness. Split on a scene's first frame, and size parts by
  measured speed: time the first part and keep each one under ~70 % of any per-job limit (150-250 frames on a CPU).

## Master settings

`remotion.config.ts`: H.264, CRF 16, yuv420p, BT.709, JPEG frames at quality 92. 1920x1080, 30 fps by default; use 60 fps
only if the film has fast UI scrolling and the machine can afford twice the frames. For vertical films give the film
`width: 1080, height: 1920` in `src/films.ts` (and lay the film out for it).

## Cost of effects (software GL)

Cheap: transforms, opacity, solid fills, gradients, text, SVG. Moderate: `filter: blur()` on large layers (keep blurs under
~30 px and on as few layers as possible), `backdrop-filter`, many shadows. Expensive: blurs on full-frame layers every frame,
hundreds of DOM nodes with filters, WebGL scenes. If a preview crawls, find the full-frame blur first.

## Delivery

`out/main.mp4` (the master), the latest sheet, `BRIEF.md`, `BEATS.md`, `CREDITS.md`. Never commit `public/sfx`,
`public/music` or rendered videos to a repository.
