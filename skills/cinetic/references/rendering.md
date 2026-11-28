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
| every join at real size | `node scripts/frames.mjs joins` (the film's `JOINS`, or `--at 120+14,245+20`; `--full` for 1920 px cells) | one render call: ~1-3 min with bundling for a few joins (every frame of each move) |
| every join, from the final | `node scripts/frames.mjs joins --file out/main.mp4` (same joins, cut from the rendered file: what ships) | ffmpeg only, seconds to a minute |
| final | `node scripts/frames.mjs final` (picture + sound + loudness in one pass) | ~0.5-2.5 s per frame on software GL (textures, blurs and photos are the slow ones) |

Read every sheet and strip you make (they are images): that is how you see the film. A sheet of many frames is a
preview: small cells hide small faults, so a full-size still (`still --frame N --full`) or a join image is the proof of a
frame. Each cell of a sheet or join image keeps its own SVG ids (gradients, masks, clips, filters), so a cell draws
what a still of that frame draws; if a cell and a still ever differ, the still is right.

A project remembers the kit it was made from (`cinetic-kit.json`, written by `new-film.mjs`). When the skill's kit has
changed since, `check` prints a WARN line (never a failure): copy the skill's `src/kit`, `src/Sheet.tsx` and `scripts`
over the project's to take the fixes, or scaffold a new project. Judge motion from strips of a rendered
preview, not from single frames.
- `sheet` renders the whole film as 36 frozen frames in one still; `--safe` outlines the 8 % margin in every cell.
  `--frames` zooms in on one moment (a turn, a morph). The sheet shows composition and rhythm, not small type: for any
  beat with UI text or a label, also render `still --frame N` at full size and read the words.
- `strip` shows a moment of the preview at 15 frames a second, so you can judge motion, not just layout.
- `joins` renders, for each join given as its move's first frame and length (`{ at, len }` in `JOINS`, `120+14` with
  `--at`), every frame from 2 before the move to 4 after it at 960 px, in rows of six (one image a join, frame numbers on
  the cells, the move outlined; over 36 f the move is sampled and the image says so) from the source in one browser:
  what a strip is too small to show (a sliver left by a turn, a one-frame pop, overprinted text, a claim spilling out of
  a shrinking plate). A bare frame gives the nine frames round it and is listed as given without a length. Look at
  every cell before the final and after every fix that touches a join.
- `check` measures the preview (how crowded the frames are, change every half second, empty frames, ending length) and
  prints what to fix. Its `air` line says how much of the frame is sharp detail, how often three or more things share a
  frame and how often the frame cuts on two sides: information, never a target (a rich frame is not a crowded one; a film
  fails as crowded only when detail covers 35 % or more of the frame in over a quarter of its samples; the texture of
  one full-bleed photograph or footage is not counted, only the layer above it (a `picture` line says where), so the
  payoff picture stays sharp: never blur it to pass, move the text to the ground or drop what crowds it). A LOOK line names
  every stretch over 1 s cut on 2+ sides: an interface line cut on two sides is a bug at any length (look on a
  full-size still), though the measure alone fails nothing. The coverage
  figure is information too. Still half-seconds are named past a quarter (each hold must have something to read). It
  fails a still run of more than 15 frames or more than 15 % of frames still
  ([stay in motion](film-grammar.md#stay-in-motion)). `--format loop` drops the sound, ending and music lines and fails when the last
  frame does not match the first; `--format sting` has no pace gate under 8 s and lets the ending hold. Its `library`
  line counts the motion-library pieces the film's source imports and how often each is placed (a LOOK line when none,
when a type or turn piece is placed more than twice, and when a words-led `BRIEF.md` imports no type piece). The
ending is measured from the film's `LOCKUP` or `T.lockup` frame when it has one ([kit.md](kit.md#10-project-layout-and-scripts)). It fails a file that is
  silent (under about -45 LUFS, or no sound at all) while the film's code plays cues or music: the sound insert failed;
  `--silent` for a film meant to be silent.
- `mux` joins parts and lays one sound under them, cut to the picture's length (joining never lengthens the film); an
  mp4 passed as `--audio` is the sound source, not a picture part.

## Safety

- **One render at a time.** Never start a second render while one runs; never run renders in parallel agents.
- **Half size while iterating**, the full-size final once, when the rubric (scored on stills, join images and strips)
  reaches 17.
- **Unstable GPU** (driver resets, blue screens, a laptop iGPU): render on the CPU with `CINETIC_GL=swangle`. It is slower and
  safe. If the user tells you their machine has such a rule or a wrapper for heavy jobs, use it for every render.
- **Concurrency:** `CINETIC_CONCURRENCY` (default 2). Higher is faster and hotter; keep 1-2 on laptops. A render that
  fails at once with "concurrency 2 > 1 core" runs on a machine (or a wrapper) that offers one thread: set it to 1.
- **A failed job is retried, not fixed.** A browser start that times out ("Timed out ... connect to the browser") or a
  footage frame that misses its wait under load is the machine, not the film: run the same job again without changing
  code. When footage frames keep timing out, raise the wait with `CINETIC_TIMEOUT` (milliseconds, default 30000).
- **Batch frames into one job.** Each job pays the start-up (a bundle and a browser, a minute or more on a shared
  queue): one `sheet --frames a,b,c,...` (or one `sheet --film library-<category> --frames ...` for library pieces)
  shows many moments for the cost of one, where seven separate `--strip` or `still` jobs cost seven waits.
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
  measured speed: time the first part and keep each one under ~70 % of any per-job limit (150-250 frames on a CPU
alone). Under a shared CPU queue (several agents or jobs taking turns on one machine) a part of 100-140 frames is the
safe size.

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
