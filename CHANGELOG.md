# Changelog

All notable changes to cinetic are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 0.1.0 to 0.5.0 were development versions, and 1.0.0-beta was the first public release. Each was run against the briefs in `evals/evals.json` (the round on 0.2.0 was invalidated by a harness problem and is not reported), and the findings of each reported round became rules in the next version (see [docs/evaluation.md](docs/evaluation.md)). Each version up to 0.5.0 was committed from the snapshot that was evaluated, so every tag's tree is exactly the version that was tested; commit times between two tags are approximate.

## [Unreleased]

## [1.1.0] - 2026-10-18

### Calm pace by default and fragment chains

cinetic's films now move at a calm pace, and their copy arrives as short fragments, one at a time, instead of whole sentences. A frame-by-frame study of eight professional films (how they split sentences, how long a fragment stays readable, how text and picture take turns) became the copy grammar; the house default keeps that grammar and holds each fragment about 1.5× longer than the references did.

- **Fragment chains.** A fragment is 1–4 words. A longer thought is a chain of fragments, in build mode (appending to one held line) or replace mode (each leaving whole before the next rises in its place), with a picture beat of 30–90 f between them, in which the picture really moves: "here is the newest" → the product arrives → "earshot." `references/copy-and-type.md` §2b gives the break rules, eleven recipes (the animation as the verb, the cliffhanger cut, a stem with a rotating slot, an image as a word, a giant keyword with a small continuation, edit instead of replace, a persistent container, emphasis by colour, text-free stretches, quiet after the text), a timing template in frames and six before-and-after examples.
- **Calm by default, crisp on request.** `PACE.calm` and `PACE.crisp` drive word timing, reading holds and the checks. Calm words enter over 36 f, 11 f apart, rise 0.2 em without blur, hold max(60, 42 + 8 f per word) and leave together over 24 f; crisp keeps the 1.0 timing. Text-led films run at 100 BPM, one fragment per 1–1.5 bars of 2.4 s, with 24–36 events per 30 s instead of 45–60, shots of 100–160 f and a visible change about every second.
- **Holds alive, not frozen.** A reading hold with a 0.3–1 px/f drift or a 1–3% creep counts as life, so a film no longer has to plant a tick inside a read to pass the gates. Calm never turns static: the energy arc, the moving frame 0, the moving last third and the building end card all stay.
- **No springs on type.** Words settle on eases or the critically damped `SPR.calm`; overshoot and per-letter tricks on copy join the hard bans.

### Sound from earshot kits

A film's effects now come from an [earshot](https://github.com/Leonxlnx/earshot) sound kit instead of cinetic's own synth voices: one sound per role, designed in code, rendered into takes with measured sync points, audited by measurement, and placed on the cue frames by `score.py`, which keeps the timing, typing plan, levels and master. The synth voices stay as the fallback, with a loud warning. Calm text-led films play effects only, and the scoring rules for text come from a frame-measured study of professional text-led films: one soft sound per fragment, near-silence while it is read, a big hit only for the one reveal, and a lockup that is a stop-down and one clean element.

### Added

- `src/fx/Chain.tsx` in the Remotion starter renders a chain in build or replace mode from `COPY`, set in a new quiet `line` type role, and gives the frame each fragment visibly lands for its sound (`chainResolves(id, { size })`: its last word's drawn rise, through `arrive()`, 97% home at the size the act sets it at). `chain(id, mode, [[text, inFrame], …], { out })` in `timeline.ts` writes one `COPY` entry per fragment (`<id>.1`, `<id>.2`, …) with its `chain` and `mode`, timed from the pace; `line()` does the same for a single fragment and `chainOf()` reads a chain back.
- `src/lib/pace.ts` with `PACE.calm` and `PACE.crisp`, picked by `PACE_NAME` in `timeline.ts`; `pace`, `easeOf`, `durFor`, `E.expo` and `SPR.calm` in `src/lib/anim.ts`; the same profiles in the HyperFrames starter's `motion.js`.
- One reading-window rule for every check: `readingWindows()` in `src/lib/pace.ts` (and `motion.js`), exported by the timeline as `READ`. A fragment is read from `resolved` for at most `readMax`; an earlier fragment of a chain only for its own hold, so the picture beat between two fragments is never taken for a read; a build line once more after its last fragment. `grid-check.ts`, `layout-audit.sh`, `measure-speed.py` and `forensics.py` read it (the scripts through `out/cues.json`), and the layout audit's word cap is 5 when every word on screen belongs to a replace chain.
- `export-cues.ts` writes a `copy` block (every `COPY` entry as `{id, text, in, resolved, out, words, kind, chain?, mode?, read}`) and the film's `pace` to `out/cues.json`, and the sound gets one soft `text` event per fragment landing instead of one per word.
- `grid-check.ts` checks the text flow against the film's own pace: `fragment`, `copy-concurrent` (a leaving fragment counts until its exit is over), `read-first` (two separate lines arriving together), `reveal-rate`, `chain-gap`, `chain-beat` (a cue inside every picture beat), `read-quiet` (no cue starting inside a read), `word-rate` and `text-share`; in a calm film a short or empty picture beat, lines arriving together and copy on more than 75% of the body are errors. Its event-gap check counts a reading hold as covered. It also reads a HyperFrames `timeline.js` (with the pace from `motion.js`): `node scripts/grid-check.ts timeline.js`.
- `lint-film.mjs` rules `copy-literal` (also a sentence written one word per element), `text-spring` (followed by name, never through object keys, strings or `.property` names, and any element given an overshooting `cfg`/`config`/`spring` preset around text), `text-pace`, `typing-rate` (followed through the names a count is built from) and `per-letter` (strings only, not arrays).
- `references/hyperframes-engine.md` §11.6: a GSAP recipe for fragment chains and the timeline check.
- `scripts/test/grid-check.test.mjs`: the timeline checks on fixtures, both starters (at 120 and 100 BPM for HyperFrames, the Remotion statement as a replace chain, each text sound against its words' visible stop) and a `new-film.sh --pace crisp` scaffold. CI installs the Remotion starter, type-checks it and runs this test and `score.test.py` (against main's `score.py`, bit for bit on the synth engine).
- `taste-and-slop.md` names B8 Sentence dump, B9 Subtitle film, K7 Hurry and F11 Springs on type.
- `craft-rules.md` adds the eight-film study of fragment flow (words per beat, hold, entry and exit, beats that continue a sentence, frames with text) beside the calm default.
- A fifth eval, a calm 20 s update film for X, and text-flow expectations (words per frame, fragments, reading time, no overshoot on copy) on every brief.
- `scripts/audio/kit.py`: the film's sound kit. `init --preset calm|crisp|minimal` (from earshot, tuned to the film's key), `tune`, `render` (cached, into `audio/kit/` with `kit.lock.json`), `vendor`, `check` (the kit against the film's cues plus earshot's audit of every take), `audition`, `listen` and `where`. It finds earshot through `--python`, `score.json` `sfx.python`, `EARSHOT_PYTHON` (`none` turns it off), an importable earshot, or `earshot` on `PATH`.
- `scripts/audio/listen.py`: earshot's timeline with the cues, its annotated sound sheet and its critique in one process, into `out/qa/listen.json` and `out/qa/sound_sheet.png`; `--kit` listens to each kit role against cheap-synth alternatives. Without earshot or its models it records why and exits 0.
- `score.json` `"sfx": {"engine": "auto" | "earshot" | "synth", "kit", "python"}`. `auto` renders the kit when it changed and earshot is found, else plays the rendered takes as they are, else the synth voices with a warning; `earshot` fails instead of falling back.
- `score.json` `"music": "none" | "synth" | <track>`. `none` (effects only) needs no chords and masters at −18 LUFS by default, so a few accents keep their dynamics; `synth` is the built-in band, the default for a score that has chords.
- Cue kind `text`: the soft sound of a copy fragment resolving, in `export-cues.ts` and the starter's `sync.ts`. A chain's fragments step through the chord's tones.
- A stack guard in `score.py`: a warning, and a `stacks` row in the report, when a second sound lands within ±3 f of the payoff or the `lockup` cue (a score.json motif counts) or a whoosh, riser, swell or suck runs into it, and when two heavy sounds or three kinds start within ±3 f anywhere.
- The report's `sfx` block (where every effect came from: the kit's roles with their takes, the cues of roles the kit leaves off, the kinds still on synth voices) and `target_lufs`; the console prints the source and the limiter's gain reduction. Warnings for a kit role whose pitch climbs or whose hit stacks attacks (earshot's audit), and for every synth riser.
- `npm run kit` and `npm run listen` in both starters; each starter ships the calm kit as `audio/kit.json`.
- `scripts/test/score.test.py`: the synth engine renders bit for bit as before, a kit's takes land on their frames, the fallbacks, the stack guard, effects-only scores, tuning; with `EARSHOT_PYTHON` set, a real kit render.
- `references/sound.md` §1 (where the sounds come from: the kit, its roles, the fallback), §5.7 (scoring a text-led film) and §9.1 (listening with earshot); new rows in the report table, the failure modes and the sound-slop table (a rising synth whip, a stacked sting, a sound on every word, a synth pad bed under quiet type).
- `docs/setup.md`: "Sound from earshot" (installing earshot in its own environment, `EARSHOT_PYTHON`) and sound troubleshooting rows.
- CI parses every shell script with bash 3.2.57, the version macOS ships, and runs the HyperFrames preflight (`npm run cues`) under it. A macOS job does the same with the real `/bin/bash`, scaffolds a HyperFrames project and refreshes its scripts with BSD `sed` and `tar`, and runs the encode-tags test on Homebrew's ffmpeg (7.1 or newer). CI also fails on a heredoc inside `$( )`, backticks or `<( )`, found by a multi-line scan (`scripts/test/bash32.test.py`), and checks the syntax of the Node scripts (`node --check`).
- `scripts/test/encode-tags.test.py`, run in CI: every BT.709-tagged encode in the scripts sets `setparams`, and the `hf-finish.sh` and `accumulate.py` encodes write `bt709/bt709/bt709/tv` on the local ffmpeg.
- `scripts/test/scripts-docs.test.mjs`, run in CI: every script but the two internal helpers handles `--help`, `hf-preflight.cjs` exits 2 with its pointer, the docs name the same helpers, and `docs/setup.md` refreshes a project's scripts with `new-film.sh`'s own copy.

### Changed

- SKILL.md bans full sentences dumped at once, gives each format its total words, new words per fragment and words visible at once, gates Step 1 on fragments, chains and text share, and adds a "Text flow" subsection. The timing and motion systems state both profiles. Text and the hero action take turns, and fast moves are rare and never run while text is read.
- Word budgets: launch films 15–25 words, capped at 30 (was 35); product videos 12 (was 15); loops 6 (was 8); stings the name plus 3 (was 4); walkthrough captions 5 (was 6).
- The starter film runs at 100 BPM, and its statement is a two-fragment build chain with a picture beat between the fragments and no pulse planted in the read: the dot is born only after the first fragment has been read, lands on the downbeat, and the second fragment answers on the off-beat. Its flight sets off on a beat and peaks half-way, on the grid, so `new-film.sh --pace crisp` (120 BPM) gives a starter that passes `grid-check.ts` too.
- `chain()` in replace mode (both starters) ends a fragment's 24 f exit 6 f before the next one rises, so two fragments never share the spot.
- The HyperFrames starter's fall takes its length from the grid (`DUR.fall = CUE.hit - CUE.fall`), so its contact meets the hit at any `--bpm`.
- The treatment template's beat sheet carries each fragment with its mode and picture beat. The Plumb example runs at the calm pace and splits its 7-word UI note into a replace chain.
- The director lens counts words per frame on the sheets and checks the text flow, the art lens checks the fragment rules, and the verifier checks text-flow issues on sheet frames rather than by eye at speed. Critics may propose splitting a sentence into a chain.
- Motion characters per brand personality run about 1.4× longer, calm moves follow 0.5 s + 1.6 ms per px, and a line read as it types runs at about 20 characters per second.
- The starters' lockup is a stop-down and one clean hit: no whoosh into it, no drop, snap or motif bells on it, no ticks through the hold. Their statements get one `text` sound per fragment instead of a pop and a tick per word, and their `score.json` plays effects only.
- `render.sh --build-audio` renders the kit before the score; `new-film.sh` lists `npm run kit` and `npm run listen` in its next steps and says whether earshot was found.
- `av-audit.py`: the loudness target follows score.py's default for the score (−18 for an effects-only film), the loudness range for an effects-only film is 3–14 LU, and events score.py's report lists as skipped (a role the kit leaves off) are not expected to sound.
- The sound critic reads `listen.json` and the report's `sfx` and `stacks`; its fixes name a kit change, a new sound from earshot (a forge run, or a fit of a public-domain or owned recording), a cue or a score parameter. A stacked lockup, a rising synth whip and shipping on the synth fallback are P1.
- SKILL.md Step 5 renders and checks the kit, scores text one fragment at a time, keeps the music off for calm text-led films, and listens with earshot; the spec line names the kit.

### Fixed

- macOS ([#2](https://github.com/Leonxlnx/cinetic/issues/2)). `hf-finish.sh` parses with the stock `/bin/bash` 3.2: its preflight was a heredoc inside `$( )`, which bash 3.2 scans as shell code, and now lives in `scripts/hf-preflight.cjs` (same checks, same cues). The other heredocs inside `$( )`, in `deliver.sh` and `render.sh`, became shell functions. The frame-count check compares numbers, so BSD `wc`'s padded count passes; colour codes are stripped from the HyperFrames logs with BSD `sed` too; `render-chunks.sh` counts cores with `sysctl` where there is no `nproc`; `new-film.sh` matches `motion.js` with a POSIX character class instead of `\s`.
- BT.709 tags with ffmpeg 7.1 and newer, which take a file's colour tags from the frames over `-color_primaries` and `-color_trc`. The HyperFrames encode came out without primaries and transfer (`bt709/None/None/tv`) and failed `probe.py`; `hf-finish.sh`, `accumulate.py` and the WebM in `deliver.sh` now end their filters with `setparams`. In `accumulate.py`, the encoder of every `--blur` master, the unlabelled raw planes also made ffmpeg insert a matrix conversion that shifted the colours; they now pass through bit-exact. With ffmpeg 6 the files are identical to before.
- A project keeps its own copy of the scripts, so a project made with 1.0.0 gets these fixes when you copy the skill's scripts into it the way `new-film.sh` does, without the skill's own tests (`docs/setup.md`, "Updating a project's scripts").
- `hf-preflight.cjs`, which `hf-finish.sh` runs, answers `--help` or a missing environment with a pointer to `hf-finish.sh --help` and exit 2 instead of a stack trace, and `SKILL.md` names it with `brand-svg.ts` as the scripts without a `--help` of their own.
- `.gitattributes` checks every text file out with LF line endings. A Windows clone with `core.autocrlf` (the Git for Windows default) gave CRLF scripts, which WSL's bash refuses (`set: pipefail: invalid option name`).
- `docs/setup.md`: removed a stale macOS row about `date %N`; `render.sh` uses only `date +%s`, which BSD `date` has, and times the sharp pass with `python3`.
- `new-film.sh --link-modules` makes a directory junction on Windows (Git Bash, MSYS2, Cygwin), where `ln -s` copied the whole `node_modules`.
- `add-font.mjs` starts npm on Windows (it failed with `spawnSync npm ENOENT`), extracts the package with a relative path, and replaces the import it supersedes in `fonts.ts` (the starter's stand-in or a family vendored before) on a CRLF checkout too.

## [1.0.0] - 2026-10-04

First tagged v1.1.0 on 2026-10-04 and retagged v1.0.0 on 2026-10-18, so the files inside the v1.0.0 tag still call themselves 1.1.0.

This version teaches cinetic what top-tier launch films measurably do. Their pictures and soundtracks were measured frame by frame, and the results became a technique library the agent draws from at random, a reference of craft norms, a recalibrated sound engine and a set of tested motion primitives in the starter.

Two snapshots of this version went through judged rounds against the same agent working without cinetic but with the official Remotion agent skills, and, new in these rounds, against the films 0.5.0 made for the same briefs. In round 7 the cinetic films met 54 of 56 of the written expectations against 41 of 56, won 2 of 4 blind comparisons with the neutral judge, 4 of 4 with the house-style judge and 3 of 4 against the 0.5.0 films. The fixes from round 7's findings are in this release but were not judged again; see [docs/evaluation.md](docs/evaluation.md).

### Highlights

- **A technique library, drawn at random.** `assets/library/techniques.json` holds 273 techniques in 14 categories (opening hooks, transitions, camera, typography, UI choreography, data, product demo, end cards, colour and light, texture, layout, pacing, micro-interactions, depth). Each has a build recipe in the starter's tokens and helpers, default timing at 60 fps, when to use and avoid it, the formats and energy it suits, and a ban-safe variant where the original look touches a hard ban. `scripts/pick.py` draws about one technique per 2.5 s of film, in the order the film's format needs them and weighted toward proven workhorses and its energy, so films stop converging on the same fade-up, push-in and end card. `references/technique-library.md` is generated from the JSON.
- **Craft rules from measurement.** `references/craft-rules.md` gives measured norms for pacing, smoothness, text timing, transitions, camera, UI in motion, colour over time and layout, plus what separates the top tier from good films.
- **Sound that stops sounding stock.** Keys are a short, dark modal tock instead of band-passed noise; typing defaults to `auto` (soft per-key typing over a 10 dB music duck up to 25 characters a second, one tuned blip per word above); the UI click is one bright, very short press-and-release voice per film; effects go on discrete state changes, about 5 per 10 s, and most cuts are carried by the music; the ending subtracts instead of slamming. `sound.md` gains measured norms and a sound-slop table.
- **Tested motion primitives.** The Remotion starter ships `TypeOn`, `Scramble`, `Roll`, `Morph`, `Iris` and `MaskRise` next to `Words`, `Cursor` and `RackFocus`, plus `E.type`, `E.exit`, `stagger`, `inertia`, `arriveK`, `zoomSpeed` and `zoomHandoff`, each rendered frame by frame at 60 and 30 fps and at blur sub-frames.

### Added

- `scripts/pick.py`: weighted random draws from the technique library (`--format`, `--energy`, `--seconds`, `--category`, `--n`, `--seed`, `--exclude`, `--avoid`, `--brand-supplied`, `--json`), `--list`, `--show <id>`, `--validate` and `--markdown`. A plan prints its seed so it can be reproduced and recorded in the treatment.
- `assets/library/techniques.json` and the generated `references/technique-library.md`.
- `references/craft-rules.md`.
- The treatment template gains a "Drawn techniques" section and a gate line for it.
- Starter primitives in `src/fx/` and helpers in `src/lib/anim.ts` and `src/lib/camera.ts` (see Highlights); `references/motion-tokens.md` lists them with their defaults.
- `score.py`: typing styles `auto` (default), `soft`, `mechanical`, `pitched`, `muted`, `word` and `off`; a music duck under per-key typing (`mix.typing_duck_db`); levelling of keys, clicks, crisp ticks and word blips against the music; a `crisp` tick variant; a typing block, effect levels and the loudest moment's position in the report.
- `synth.py`: `key_click` styles and kinds with a secondary transient, `word_blip`, `crisp_tick`, a new `ui_click`, and a small room for tiny sounds.
- `render.sh --loop` renders lossless PNG intermediates, so a loop's seam survives the encode, and `deliver.sh --loop` encodes the WebM at CRF 26.
- `render.sh --blur` stops before the sub-frame pass while a move is faster than clean blur allows (80 px/f), or on an unexplained full-frame change away from an act boundary, which would be a cut its sub-frames blend into a double exposure. `--accept-fast A-B` and `--accept-cut A-B` waive a range you checked at full size (a frame-filling wipe, a flood, a flash, a zoom-through).
- `av-audit.py` warns when a landing sound (land, pop, tock, bell, snap, hit, drop) comes after the picture has already stopped moving.
- `forensics.py` gates a still opening, measured on the film's own scale (a warning when the first visible change comes after 1.0 s, a failure after 2.5 s), and runs the hook check on films of 6 s or less with 1 s windows.
- `brand-svg.ts` writes a `LockupSvg` exported from `src/brand/Mark.tsx` as is, for marks that are part of the word, so `brand-kit.sh` no longer assumes a mark beside a typed name.
- `sheet.py --images` tiles stills or frames you already have, labelled by file name.
- `COPY` entries can be `kind: 'ui'` (a typed command, code, a URL, an app label): `grid-check.ts` counts them apart instead of against the word budget.
- `grid-check.ts` accepts one declared designed hold (`export const HOLD = {from, to}`, at most 96 f at 60 fps).
- Tests for `pick.py` (`scripts/test/pick.test.py`), run in CI, including a check that the generated library page matches the JSON.

### Changed

- SKILL.md Step 1 draws the film's techniques with `pick.py` before the beat sheet. The agent builds the picks the concept can carry and rerolls (at most twice) or drops the rest with a written reason; it never adds an undrawn technique.
- Measured norms replace several defaults: one designed near-still hold of 60–96 f per film; an end card that assembles over 60–80 f and then holds 36–80 f still or creeping ≤ 6%; exits into a cut on `E.exit` and entrances decaying ×0.89–0.94 per frame; text being read at most about 3 px/f; entry blur 6–8 px or none (`Words` defaults to 8); standalone hero words up to 5× the statement size; frame-filling edges allowed 150–300 px/f for a few frames; secondary moves starting at 55–75% of the leading move; continuous takes up to 560 f; one lull of 1–4 s at 55–85% of the runtime and the biggest peak at 75–90%; large centred product windows; 12–20 f cursor travel with a 60 f dwell; time-boxed prompts.
- Sound rules: the drop on the hero reveal is the loudest moment, and the lockup is the most resolved one; effects sit within ±0.15 pan except whooshes and risers; whooshes (about 2 a film) only on camera-scale moves and logo zooms; risers end on a hard stop, a filter drop or a gap.
- `av-audit.py` suggests a sound only for the 3 biggest picture changes, instead of warning on every strong change without one.
- Product UI: push in 2–5× on every interaction that carries the story, hold a wide shot of readable UI at most about 1.7 s, and label every bar or chart that carries meaning. A text reveal never shows part of a glyph.
- `taste-and-slop.md` names haze behind the hero and the stock tech palette.
- Sound goes on the frame an arrival becomes readable (its `settleOf`), never on the tween's last frame or a later bar line; every arrival of the lockup is sounded where it happens. Frame-0 sound assumes a moving frame 0.
- Anything posted to a feed masters at −14 LUFS whatever the brand's temperament; −16 is only for a sting that plays at the head of other videos.
- `brand-and-color.md` adds the word test for a mark that is a letter of the name, and how to export such a lockup.
- A loop's frame 0 is its poster and names the product; numbers stay true in every in-between state; every number on screen carries its label or unit.
- The 9:16 feed zone keeps the bottom 420 px clear (was 384), matching current overlays.
- The static end tail `forensics.py` allows is 2 s at the film's frame rate instead of a fixed 120 frames.
- `finishing.md`: run long renders in the background and read the log.
- On a tight usage budget, the review runs the director and art lenses inline on the sheets and leaves forensics and sync to the scripts.
- README notes Remotion's own licence.
- The hook names the product on screen by about a quarter of the runtime. The oversize opening line (`oh-oversize-fly-then-small`) travels every frame and hands straight to the small one, and becomes a signature move.

### Fixed

- `av-audit.py` picks onsets in numpy. librosa's cached numba peak picker could segfault the whole process.
- A key event on frame 0 could start before the film and lose its attack.
- `mixColor` accepts the `rgb()` strings it returns, so nested mixes no longer fall back to black.
- A loop rendered from JPEG intermediates failed its seam gate even when its frames matched.
- `pick.py` failed inside a film project: `new-film.sh` now copies the library to `scripts/library/`, and `pick.py` finds it there. When a category has run out for the format, it says so instead of blaming `--energy`.
- `lint-film.mjs` flagged a build number such as "#2187" as a purple hex; an all-digit #NNN(N) in running text is now a number label.
- A sub boom dropped onto true silence, and a silence opening again, clicked; both now ramp over a few milliseconds.
- A hard cut inside an act blurred into one double-exposed frame: `measure-speed.py` now renders every hard cut it measures with one sample.

## [1.0.0-beta] - 2026-09-28

First published as v1.0.0 on 2026-09-28 and renamed 1.0.0-beta on 2026-10-18, when the measured technique library (first tagged v1.1.0) took the 1.0.0 tag. The v1.0.0-beta tag points at the same commit, so the files inside it still call themselves 1.0.0.

cinetic is an agent skill that has your coding agent direct, score and render short films from code: launch films and teasers, product and feature videos, looping feature animations, logo stings, UI walkthroughs and social cut-downs. One beat grid in `timeline.ts` drives the picture, a synthesized soundtrack and the QA scripts, and a film counts as done only after its render has been measured and reviewed.

Install it with the skills CLI (`npx skills add Leonxlnx/cinetic`), or in Claude Code with `/plugin marketplace add Leonxlnx/cinetic` followed by `/plugin install cinetic@cinetic`. To install by hand, download `cinetic.skill` from the [release page](https://github.com/Leonxlnx/cinetic/releases/tag/v1.0.0-beta) (a zip whose top folder is `cinetic/`; the four demo films are attached next to it) and unzip it into `~/.claude/skills/`.

Changes since 0.5.0 are listed under Added and Changed below. The rule and check changes come from the fifth evaluation round, which tested 0.5.0 against the same agent working without cinetic but with the official Remotion agent skills. In that round the cinetic runs met 54 of 56 written expectations (96%) against 41 of 56 (73%), won 2 of 4 blind comparisons with a neutral judge, and won 4 of 4 with a second blind judge applying the house style guide (the hard bans). The neutral judge's remaining craft points, such as quiet stretches, end cards without a descriptor and a loud sound on a still frame, fed the new rules. The plugin manifests, the license and CI were added for the public release. 1.0.0-beta itself has not been through a separate blind round; see the [evaluation](https://github.com/Leonxlnx/cinetic/blob/main/docs/evaluation.md) for the method and every round.

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

[Unreleased]: https://github.com/Leonxlnx/cinetic/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Leonxlnx/cinetic/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Leonxlnx/cinetic/compare/v1.0.0-beta...v1.0.0
[1.0.0-beta]: https://github.com/Leonxlnx/cinetic/compare/v0.5.0...v1.0.0-beta
[0.5.0]: https://github.com/Leonxlnx/cinetic/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Leonxlnx/cinetic/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Leonxlnx/cinetic/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Leonxlnx/cinetic/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Leonxlnx/cinetic/tree/v0.1.0
