# Changelog

All notable changes to cinetic are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 0.1.0 to 0.5.0 were development versions. Each was run against the briefs in `evals/evals.json` (the round on 0.2.0 was invalidated by a harness problem and is not reported), and the findings of each reported round became rules in the next version (see [docs/evaluation.md](docs/evaluation.md)). Each version up to 0.5.0 was committed from the snapshot that was evaluated, so every tag's tree is exactly the version that was tested; commit times between two tags are approximate.

## [Unreleased]

## [1.0.0] - 2026-09-28

cinetic is an agent skill that has your coding agent direct, score and render short films from code: launch films and teasers, product and feature videos, looping feature animations, logo stings, UI walkthroughs and social cut-downs. One beat grid in `timeline.ts` drives the picture, a synthesized soundtrack and the QA scripts, and a film counts as done only after its render has been measured and reviewed.

Install it with the skills CLI (`npx skills add Leonxlnx/cinetic`), or in Claude Code with `/plugin marketplace add Leonxlnx/cinetic` followed by `/plugin install cinetic@cinetic`. To install by hand, download `cinetic.skill` from the [release page](https://github.com/Leonxlnx/cinetic/releases/tag/v1.0.0) (a zip whose top folder is `cinetic/`; the four demo films are attached next to it) and unzip it into `~/.claude/skills/`.

Changes since 0.5.0 are listed under Added and Changed below. The rule and check changes come from the fifth evaluation round, which tested 0.5.0 against the same agent working without cinetic but with the official Remotion agent skills. In that round the cinetic runs met 54 of 56 written expectations (96%) against 41 of 56 (73%), won 2 of 4 blind comparisons with a neutral judge, and won 4 of 4 with a second blind judge applying the house style guide (the hard bans). The neutral judge's remaining craft points, such as quiet stretches, end cards without a descriptor and a loud sound on a still frame, fed the new rules. The plugin manifests, the license and CI were added for the public release. 1.0.0 itself has not been through a separate blind round; see the [evaluation](https://github.com/Leonxlnx/cinetic/blob/main/docs/evaluation.md) for the method and every round.

### Highlights

- **A directed workflow from brief to delivery.** Steps 0 to 8 each write a file, every gate is a check you run, and the review loop ends at the ship gate. The concept step writes three concepts through different lenses, runs the ownership, deletion, specificity and feature-word tests, picks one story device the film owns, and writes a treatment with a beat sheet. Stings, loops and short clips take a scaled-down path.
- **A brand built from three personality adjectives.** They set the typeface (vendored with `add-font.mjs`), the stage, the accent and the motion character. Marks are explored on a sheet of 6-10 directions with a 64 px misread test, lockups are compared in three settings, and `palette.py` builds and checks the palette in OKLCH. A brand you supply always wins.
- **One beat grid for picture, sound and QA.** `src/timeline.ts` holds FPS, BPM, `b(bar, beat, sub)`, acts, cues and copy, and `grid-check.ts` checks it. Starters for Remotion 4 (React, the default) and HyperFrames (HTML and GSAP) are scaffolded by `new-film.sh`, which also copies every script into the project.
- **Sound computed from the picture.** `export-cues.ts` takes sync frames from the same springs and eases as the picture. `score.py` synthesizes a tuned score and effects with stems, and `master.py` masters to −14 LUFS (−16 for calm brands and short stings) with true peak at or under −1.5 dBTP on the WAV and a 3 ms fade-in at sample 0. `check-sync.py` holds true peak at or under −1 dBTP after encoding.
- **Finishing.** `render.sh` makes previews, sharp masters and motion-blurred masters. With `--blur`, `measure-speed.py` reads on-screen speed with optical flow and picks the sub-frames per frame, and `accumulate.py` averages them in float and quantizes once to BT.709 yuv420p, dithering only smooth ramps. `--budget` caps the cost and `--10bit` writes a High 10 master. `probe.py` and `check-sync.py` gate every file.
- **Measured review.** `lint-film.mjs` and `layout-audit.sh` (safe zones including 9:16 feed presets, covered text, text speed) run while you build. `forensics.py` checks pops, stalls, holds, ghosts, borders, judder, banding, compression smear, hook energy and loop seams. `av-audit.py` checks onsets against cues per stem, whoosh apexes, the loudness target, a click at the head and loud sounds on a still picture. Contact sheets (`sheet.py`) feed five critic prompts, and a ship gate on an 11-dimension rubric decides when a film is done.
- **Hard bans against the generated look.** No eyebrow labels, stacked taglines or filler text; no serif or italic; no orange, amber, beige or cream; no neon or glow; no purple, violet or indigo, and no multi-hue gradients; no glassmorphism, emoji, sparkles, particles or confetti; no bouncy overshoot except on a true landing. `lint-film.mjs` and `palette.py` enforce the bans, and regression tests cover both. A supplied brand is recorded in `BRIEF.md`, and a `cinetic:brand-supplied <what>` comment exempts its own line and the next, or the whole file when it sits in the file's leading comment.
- **Deliverables.** `deliver.sh` writes a poster from a clean still, MP4, WebM and GIF loops with a loop-seam check, ProRes 4444 alpha stings, 9:16 and 1:1 re-layouts (never crops of the master) and a manifest in `qa/`. For an invented brand, `brand-kit.sh` exports SVG and PNG marks and lockups, favicons, an avatar and an X header.
- **Guides.** 17 files in `references/` cover concept, copy and type, brand and color, timing, motion tokens, camera, transitions, product UI, sound, finishing, Chromium rendering traps, both engines, formats, the review loop and a catalog of generated-look tells. A worked example follows Tessel, a 33 s launch film, from idea to master, including 15 mistakes and their fixes.

### Added

- Text-speed check in `layout-audit.sh`: with `--speed` it also renders the frame after each audited frame and fails readable text (effective opacity at least 0.5, at least the minimum size) whose center moves more than 20 px per frame (px/f), measured in a 1080 px tall frame. `--max-text-speed` sets the limit. It is on by default with `--cues`, and `--no-speed` turns it off. The Step 4 gate and `review-loop.md` use the same limit.
- `av-audit.py` warns when a loud effect (within 6 dB of the loudest) lands on a picture that barely changes from 3 frames before it to 6 frames after, and lists these as `visual.still_hits`.
- Hook check in `forensics.py`: a film over 6 s that starts at frame 0 and is not a loop gets a warning when its first 2 s move less than max(0.5, 0.5× the film's median 2 s window). `review-loop.md` documents it.
- Claude Code plugin marketplace (`.claude-plugin/marketplace.json` and `plugin.json`), MIT license, and `license` and `compatibility` fields in the SKILL.md frontmatter.
- CI checks the SKILL.md frontmatter and the JSON manifests, confirms the skills CLI discovers the skill, and runs the lint regression tests and Python and shell syntax checks. A release workflow packages `cinetic.skill` on each version tag, checks that `plugin.json` matches the tag, and takes the release notes from CHANGELOG.md.

### Changed

- Launch films and product videos end on a card that says what the product is in one short line under the name ("The build cache for CI.") when the brief gives no practical fact to carry. A bare name is for stings.
- When a gate flags a quiet stretch, the fix is motion, not a looser threshold.
- The master check covers the fastest frames of every act at full size, including the lockup's entrance and exit, where a sliding wordmark most often shows stepped copies. The fix is `measure-speed.py --floor a-b:n`.
- The Step 5 gate asks for each sound's loudness to match the size of its visible cause.
- `sound.md` adds "Scale each sound to its cause": a caret blink or small tick sits 12-18 dB under the landing hit, set through each event's `weight` in `src/sync.ts`.
- `product-ui.md`: a changed digit rolls (a masked vertical slide) or cuts. Two numbers are never crossfaded in place, because the half-and-half frames read as a ghosted double image, worse after motion blur.
- `brand-and-color.md`: a letter redrawn inside a wordmark is traced from the typeface's own glyph with `outline-text.py`, and only the feature that carries the idea changes, so it matches the font's stroke weight, terminals and curve tension.

## [0.5.0] - 2026-09-28

Blind reviews found films sparse, static at the end and quiet at the payoff. This version fills the frame, keeps the end moving, lets the music lead, and removes a compression smear from blurred masters.

### Added

- Compression smear check in `forensics.py`. Flat fields (at least 1% of the frame, 98% within ±2 of one code value) are split into 16 px blocks of the exact luma plane and sampled twice per second. A smeared share over 0.2 of the frame fails on two samples and warns on one, and a ×25 `smear.png` sheet is written. `finishing.md` §5 documents the cause and the fix.
- `render.sh --10bit` encodes a blurred master as High 10 (yuv420p10le), for masters that will be graded or re-encoded.
- `palette.py --stage-hue` and `--stage-chroma` give the stage a hue from the brand's world (pine-black 160, deep teal 200, ink-navy 235). A purple stage hue (270-340) is refused and a warm one (31-118) gets a warning. A dark stage at h 235-270 with C < 0.02 gets a note that it is the stock dev-tool theme.
- Per-film loudness target: the gate reads `master.lufs` from `audio/score.json` and accepts −14 or −16 LUFS when none is set. −16 is allowed for calm brands and stings.
- `av-audit.py` warns when the first 5 ms of audio peak above −40 dBFS.
- `brand-svg.ts` reads an optional `LOCKUP` token (ratio, gap, weight, track) from `tokens.ts`, so the brand kit's SVG lockups match the film's lockup. It prefers a font vendored by `add-font.mjs` over `node_modules`.
- Lint regression tests: `scripts/test/lint-film.test.mjs` runs `lint-film.mjs` on 11 fixtures that declare their expected hits. It also checks that both starters fail only on their placeholder markers and lint clean without them, and that `palette.py` refuses banned accents and papers unless `--brand-supplied` is passed.

### Changed

- Films fill the frame. The hero covers about 40-70% of a product shot, no region larger than about a quarter of the frame stays empty outside designed negative space, and in vertical feeds the platform's caption and button zones get background instead of empty bands.
- The last third keeps moving. The lockup appears once, at the end, and brand logo time stays at or under about 12% of the runtime.
- The music leads the picture with a progress motif and resolves on a lockup chord. A feature video lands its value in one short payoff line.
- Text in flight stays under about 20 px/f.
- Renders are stopped by their own PID, never with a `pkill -f` pattern that can kill other renders on a shared machine.
- Step 1 adds the feature-word test: watching muted, a stranger should use the brief's word for the feature.

### Fixed

- Flat backgrounds in blurred masters no longer smear under compression. swscale's 8×8 ordered dither turned a flat paper that fell between two code values into a 228/229 checker that x264 kept in some blocks and flattened in others. `accumulate.py` now does the BT.709 conversion in float and quantizes once, so flat fields round exactly, and TPDF dither goes only into smooth ramps, with one fixed pattern.
- Posters come from a clean lossless still instead of a frame decoded from the H.264 master, which baked 4:2:0 chroma and block smear into the image. `deliver.sh` uses `--poster-from`, else a Remotion still of `--comp`, else the last frame kept by `hf-finish.sh`. If the still does not match the master's frame (mean absolute difference at most 2, at most 0.25% of pixels more than 32 levels off), it warns and uses the master's frame.
- The soundtrack no longer clicks on its first sample. `master.py` applies a 3 ms raised-cosine fade-in from zero at sample 0 and a fade-out of at least 10 ms after the limiter.

## [0.4.0] - 2026-09-27

Blind review read the logo sting's mark as a minus sign and the launch teaser's blue on slate as a stock dev-tool look. This version adds checks for both, lays out vertical video for real feeds and sharpens the sound's opening.

### Added

- Lopsided feed safe zones. `src/lib/safe.ts` holds per-edge presets, and 9:16 frames default to `feed9x16` (top 270, right 120, bottom 384, left 64 px) instead of a symmetric margin. `layout-audit.sh --safe` takes a preset or explicit insets, readable text in 9:16 must be at least 32 px, and `formats.md` §7 covers filling the tall frame.
- Covered-text audit: `layout-audit.sh` fails text painted under a moving element tagged `data-mover` (z-order counts).
- `scripts/add-font.mjs` and `new-film.sh --font` vendor a `@fontsource-variable/*` family into the project: `npm pack` in a temp folder, the upright `.woff2` files and license copied in, imported from `fonts.ts`, and `FONT`/`FACES` set with weights clamped to the font's axis. Nothing is installed into a shared `node_modules`.
- Mark misread test: the mark sheet gains a 64 px column and a misread score (0 when the mark reads first as a common symbol).
- A lockup sheet that compares three settings (`brand-and-color.md` §6), and palettes derived from the world of the name (`brand-and-color.md` §9). `palette.py` notes an accent in the `#3B82F6`/`#2563EB` framework-blue family.
- Progress motif: a `progress` block in `score.json` climbs matching events one scale step each, up to the tonic. A personality table in `sound.md` matches the score's energy to the brand.
- `score.py` warns on a soft hook (first 0.5 s more than 12 dB under the median) and names any effect that starts inside the end fade.
- New tells in `taste-and-slop.md`: anonymous product, end card without the brief's fact, default palette, colorless film, misread mark, empty vertical frame, covered text, soft hook, wrong sound energy and soft first second. The director and art/copy/UI critics check them at P0 or P1.

### Changed

- The score opens at full intent: a 20 ms chord attack with the intro drone already at level. Effects fade with the music at the end.
- New rules in SKILL.md: name the feature once; keep moving elements off text; restraint still shows color, with the accent carrying the key beats; the end card carries the brief's practical fact, and a still end card holds no longer than about 2.5 s; state changes on the frame its cause lands; energy builds toward the payoff.
- A brand named for heat or fire goes red-hot or white-hot, never orange.

### Fixed

- Word exits no longer pop. `Words.tsx` and the starter's demo faded each exiting word on the same `E.in` curve as its move, which dropped the last half of the opacity in 2-3 frames. The move still accelerates away on `E.in`; the opacity now follows `E.smooth`.

## [0.3.0] - 2026-09-27

Hard bans against the fastest tells of generated work, enforced by the linter, the palette builder and the critics.

### Added

- A Hard bans section in SKILL.md: no eyebrow or kicker labels, stacked taglines or filler text; no serif or italic; no orange, amber, beige or cream; no neon or glow; no purple, violet or indigo, and no multi-hue gradients; no glassmorphism, emoji, sparkles, particles or confetti; no bouncy overshoot off a landing. A brand you supply still wins and is recorded in `BRIEF.md`. `taste-and-slop.md` lists the bans as HB1-HB11.
- New `lint-film.mjs` rules: `banned-color`, `glass`, `glow`, `emoji` and `stock-decoration`. A `cinetic:brand-supplied <what>` comment, for a brand's own color or face, exempts its own line and the next, or a whole file when it sits in the file's leading comment block.
- `palette.py` shares the banned OKLCH regions and refuses an accent, a `--paper` or `--temp warm` inside them unless `--brand-supplied` is passed. `--paper` checks a paper you choose, and the default neutral tint stays at a chroma too low to read as warm.
- A smoothness gate in `motion-tokens.md`: zero `forensics.py` fails and the Finish dimension at 5.
- Evals: every brief asserts the hard bans. The feature loop and the launch teaser check proof specificity, and the teaser also checks blur artifacts, cut sync and a brand kit. A fourth brief covers a 9:16 video in a supplied brand.

### Changed

- The `serif` rule matches more families, and the `italic` rule also flags a skew on type (a faux italic).
- Spring overshoot is reserved for true landings, where an object arrives at a surface or a lock, at most 2 per film, and `motion-tokens.md` keeps it to 1-7% on a contact. The `pop` (14% overshoot) and `land` (about 15%) presets in `anim.ts` and `motion.js` are marked as true landings only.
- The critics run an HB1-HB11 checklist on the sheets first and measure borderline colors with `palette.py`. Any hit is P0 unless `BRIEF.md` lists it as brand-supplied, and the verifier may not lower or reject one for being brief or small.
- Every personality in `brand-and-color.md` is now a sans on a neutral or cool stage with a red, green, teal, blue or yellow accent. A banned-region table and one accent per hue family were added, the worked palettes moved inside the bans, and the HyperFrames starter's paper became `#f5f6f7`.
- `copy-and-type.md` loads Schibsted Grotesk in its font example and lists eyebrows, stacked taglines, "Introducing", text walls and filler text as hard bans.

## [0.2.0] - 2026-09-27

The first blind review, of 0.1.0, found films that would be just as true of a simpler product, and story devices that drifted to a bare dot. This version puts product specificity and brand personality first.

### Added

- A specificity test in the first law and the Step 1 gate: the proof shows what this product does that a simpler one would not. `concept-and-story.md` and `TREATMENT.md` start from the name and the product's non-obvious behavior, and `product-ui.md` asserts the story's facts in `data.ts`.
- `scripts/palette.py`: neutrals tinted from one accent for a light or dark stage, contrast and neon checks, and accent coverage on a still.
- Personality-first brand choices in `brand-and-color.md`: three adjectives map to a fontsource family, a stage, an accent and a motion character. Marks are explored on a scored `MarkSheet` of 6-10 directions, "block plus accent dot" marks are warned against, and the lockup spans 28-45% of the frame width.
- Brand kit export: `brand-kit.sh`, `brand-svg.ts` and `outline-text.py` write SVG and PNG marks and lockups with the name outlined through HarfBuzz, plus favicons, an avatar and an X header.
- `render.sh --budget` caps the blur pass, and `render.sh` prints the sub-frame multiple and an estimate in minutes before it renders.
- Sound checks: `score.py` warns when a film of 20 s or more has a loudness range under 5 LU, and when the payoff sits less than 2 LU above the median momentary loudness. `av-audit.py` warns on strong picture changes with no sound within ±3 frames (`--peak-tol`).
- Review: the director and art/copy/UI critics ask whether the film is true of a simpler product, looks like the starter or the Tessel worked example, has an ownable mark and data that agrees with the story. The director also checks the fastest blurred frames. `taste-and-slop.md` adds ten tells.

### Changed

- The starter's typeface is a placeholder: `fonts.ts`, `tokens.ts` and the HyperFrames `@font-face` carry `cinetic:placeholder`, so `lint-film.mjs` fails until a family is chosen. `FONT.sans` is renamed `FONT.text`.
- `copy-and-type.md` shows how to install a family, and letter or sweep reveals must never spell a different word partway through.
- `deliver.sh` writes its manifest and loop-seam report to `qa/` and takes several `--alpha` compositions. `formats.md` sets the sting lockup scale, held and cleared alpha versions, and a product-first hook.
- `measure-speed.py` counts only forward-backward consistent flow and supported tracks, gives cuts no speed, defaults `--max` to 32 and flags moves over 80 px/f. Frames the samples cannot cover get a shorter shutter through `blur.ts`, and the starter's demo travel stays under 80 px/f.
- `timing-grid.md` puts every cut and velocity peak on a beat with a hit, and `sound.md` raises the loudness-range target to 5-8 LU.
- `review-loop.md`: review rounds run on previews, and the master gets one check.

## [0.1.0] - 2026-09-27

First version: a skill for directing, building and rendering launch films, product videos, feature loops, logo stings and UI walkthroughs from code.

### Added

- `SKILL.md`: five laws, a Step 0-8 workflow with gates you run, a scaled-down path for stings and loops, and the ship gate (every rubric dimension at least 3, the Finish and "Sound and sync" dimensions at 5, mean at least 4.2). `formats.md` holds one recipe per format, and `worked-example.md` follows Tessel, a 33 s launch film, from idea to master with 15 mistakes and their fixes.
- Remotion starter (Remotion 4.0.529): `src/timeline.ts` is the only source of timing (`FPS`, `BPM`, `b()`, `f60()`, `ACT`, `CUE`, `COPY`) for a 9 s two-act demo. `lib/anim.ts` holds the easing and spring tokens, `lib/sync.ts` computes sync frames, and `blur.ts` with `FilmSub` splits frames over a 240-degree shutter. The demo palette, mark and wordmark are marked `cinetic:placeholder`.
- HyperFrames starter (HyperFrames 0.8.79): one paused GSAP timeline, `motion.js` with the same tokens, and GSAP and Geist copied locally by `setup.mjs`. `hf-finish.sh` lints, checks `data-duration`, renders PNGs, encodes BT.709 once, muxes and runs the sync and spec gates.
- Scaffold and static checks: `new-film.sh` copies a starter and every script into a project and rejects a BPM whose beat is not a whole number of frames. `lint-film.mjs` bans CSS animation, randomness, raw easings, off-token colors and leftover placeholders. `grid-check.ts` checks the 16th grid, text holds and gaps of more than 48 frames without an event, and `layout-audit.sh` checks every text box on rendered stills.
- Sound: `export-cues.ts` writes `out/cues.json` from the picture code, `score.py` renders a 48 kHz score plus tuned effects per cue with stems, and `master.py` masters to −14 LUFS under a 0.77 ceiling and zeroes the tail.
- Render and delivery: `render.sh` renders muted, muxes the WAV with ffmpeg and gates on `probe.py` and `check-sync.py` (lag at most 48 samples). `--blur` picks samples per frame from optical flow (`measure-speed.py`) and averages sub-frames in float (`accumulate.py`). `deliver.sh` writes a poster, GIF, WebM and ProRes alpha.
- Review: `forensics.py` flags pops, stalls, dead holds, ghosts, border slivers, judder, banding and loop seams, and `av-audit.py` checks onsets per stem within ±2 frames. `sheet.py` and `grab.sh` make labeled contact sheets and exact frame grabs. `review-loop.md` defines rounds, the 11-dimension rubric and the ship gate, with five critic prompts in `assets/critics/`.
- Guides: timing grid, motion tokens, camera, transitions, product UI, concept and story, copy and type, brand and color, sound, finishing, the Remotion and HyperFrames engines, 16 Chromium rendering traps, and 80 generated-look tells with fixes. `assets/TREATMENT.md` is the Step 1 template.
- Evals: three briefs (a feature loop, a launch teaser and a logo sting), each with objective checks (size, duration, 60 fps and BT.709 tags, plus true peak on the two with sound and loudness on the teaser) and visual ones, used to compare runs with and without the skill.

[Unreleased]: https://github.com/Leonxlnx/cinetic/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Leonxlnx/cinetic/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/Leonxlnx/cinetic/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Leonxlnx/cinetic/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Leonxlnx/cinetic/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Leonxlnx/cinetic/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Leonxlnx/cinetic/tree/v0.1.0
