<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-dark.svg">
    <img src="docs/brand/lockup-light.svg" alt="cinetic" width="340">
  </picture>
</h1>

<p align="center">Cinematic launch films, update videos and motion design from code, directed by your coding agent.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f2328" alt="License: MIT"></a>
  <a href="#install"><img src="https://img.shields.io/badge/npx%20skills%20add-Leonxlnx%2Fcinetic-1f2328" alt="npx skills add Leonxlnx/cinetic"></a>
  <a href="https://github.com/Leonxlnx/cinetic/releases/latest"><img src="https://img.shields.io/github/v/release/Leonxlnx/cinetic?color=1f2328" alt="Latest release"></a>
</p>

<!-- TODO(gallery-hero): the user-approved 1.2 launch film (E1): a GIF excerpt linking to its MP4 on the media branch, with alt text, and one caption line under it (length, format, "made by an agent with cinetic 1.2 from the brief below"). -->

cinetic (cinema + kinetic) is an agent skill that makes your coding agent direct a short film instead of arranging animation components. It is built for the two films a product team makes most: the **launch film** and the **update video** ("v2 is out", with the three things that changed).

- **A direction per film.** Before any code, the agent is dealt three complete art directions that fit the brief (space, light, camera language, cut grammar, type behaviour, story shape, lockup and one signature shot) and chooses the one that can carry something only this product has. Two films from cinetic don't look alike.
- **The device book.** 466 devices in 25 families, big and small: carried cuts, iris reveals, type that makes room for an image, light that switches on inside an object, four tiny corner squares that blink around a word. `pick.py` draws a film's devices from many families, weighted for its format and energy, so no film is a sampler of one trick.
- **Calm copy over a rich picture.** Words arrive as short fragments, one at a time, split around what the product does ("here is the newest" → the product → its name), held long enough to read, while the picture keeps moving: a camera that never stops, living light, depth, real imagery.
- **Real imagery, no credits on screen.** `assets.mjs` finds photographs, footage, textures and art under licences that need no credit, downloads the chosen ones with a private licence record, and grades them into one look the motion system then moves.
- **Your brand, or one it makes.** Hand it a brand kit (logo, colours, fonts, screenshots) and `brand.py` writes it into the film: the logo split into parts for the lockup, the colours and type in their roles, the screens rebuilt as live UI where it can. Without one, it designs a brand from three personality words.
- **"Make it feel like this clip."** `like.py` measures a clip you supply (shot lengths, cut rhythm, camera activity, curve families, type scale, density, palette proportions, tempo) and gives the film those targets, borrowing the grammar and never the content, with a guard that the result does not read as a copy.
- **Music-led sound.** Every film is cut to a licensed, human-made instrumental track, edited only at bar lines, with sound effects from an [earshot](https://github.com/Leonxlnx/earshot) kit levelled over it. No music is generated, nothing copyrighted enters a repository, and credits never appear in the picture: delivery writes them for the post.
- **Finished and measured.** Neutral grounds with one accent on what matters, true motion blur, no banding, BT.709 and a sync-checked mux, then floors against a flat film, pixel forensics, an audio-sync audit, contact sheets and critic passes against a ship gate.

It builds with Remotion (React) by default, or HyperFrames (HTML and GSAP).

[Quick start](#quick-start) · [Gallery](#gallery) · [Directions and devices](#directions-and-devices) · [Install](#install) · [Requirements](#requirements) · [Use](#use) · [How it works](#how-it-works) · [Sound](#sound) · [Look](#look) · [What's inside](#whats-inside) · [Evaluation](#evaluation)

## Quick start

```bash
npx skills add Leonxlnx/cinetic
```

Then ask your agent for a film, for example: "Make a 25-second launch film with music for our database branching tool. Invent the brand." It works with Claude Code, Codex, Cursor and the other agents the skills CLI supports.

Before the first film, check your machine with [a first test render](docs/setup.md#4-a-first-test-render). It needs Node 22+, ffmpeg 6+, Python 3.11+ and a headless Chromium, plus [earshot](https://github.com/Leonxlnx/earshot) 0.4 for the sound; see [Requirements](#requirements).

## Gallery

<!-- TODO(gallery): the user-approved 1.2 examples, one cell each, in this order: E2 the update video ("v1.2 is out", three changes), E3 the launch film built from a supplied brand kit, E4 the film made with clip match, E5 the sign-off sting. Each cell: a GIF linking to its MP4 on the media branch, a bold title, two or three sentences on its idea and devices, and "Download MP4 (size, sound, MB)". Then the briefs word for word in a <details> block, as before. -->

Every film in the gallery was made by an agent with cinetic 1.2 from a one-paragraph brief, cut to a licensed music track. The brands are invented unless the brief supplied one. Clicking a GIF downloads its MP4. The films live on the repo's `media` branch, so installs stay small.

## Directions and devices

An agent left to choose makes the same film every time: calm fragments on a plain ground, a push-in, an end card. cinetic's agent is dealt and drawn instead.

**The direction deck.** In Step 1 the agent runs

```bash
python3 scripts/deck.py --brief "a docs map for scattered teams" --format launch --pace calm --options 3
```

and gets three complete directions from 33 (24 built on drawn space, light and type, 9 where real photographs and footage are the world), each fitted to the format: its space (flat, layered, perspective planes or a lit relief), light, camera language, cut grammar, type behaviour, story shape, lockup, palette proportions and one signature shot, and for an update film its hook, change and payoff beats. It writes an idea sentence for each, keeps the one a competitor could not claim, and deals the full sheet for it, which becomes the art direction in `TREATMENT.md`.

**The device book.** `references/devices/` holds 466 devices in 25 family files (type arrivals and exits, lines and swaps, marks and markers, icons and glyphs, colour and light, glass, glow and spectral, texture and grids, photos and footage, collage and composition, camera, camera transitions, cuts and seams, morphs and handoffs, wipes, masks and irises, speed and rush, depth and 3D, UI choreography, micro-interactions, cursor, loaders, data and numbers, logo and end card, sound and timing, cadence and grammar), with an index that picks by job: opening hook, reveal, emphasis, transition, proof, product moment, update change, lockup. Each entry gives what it is and when it earns its place, its anatomy, house timing at 60 fps, the sound that goes with it, and how to build it: a tested primitive in the starter's `src/fx/` with its props, or a recipe in plain layers.

**The draw.** `pick.py` draws the film's devices from 721 entries in 27 families:

```bash
python3 scripts/pick.py --format launch --energy high --seconds 25 --json out/qa/picks.json
```

about one device per beat, in the order the format needs them, from many families (a variety rule keeps one family from filling a film), weighted toward the house's workhorses and the film's energy. Calm films keep their copy calm while the picture categories draw richer. The agent builds the picks its direction can carry, retold in the film's own objects, and rerolls or drops the rest with a reason written into the treatment. The seed is printed, so a plan can be reproduced.

<details>
<summary>An example device</summary>

**Velocity handoff: cut on the fastest frame, next shot already moving** (`references/devices/cuts-and-seams.md`)
*`dv-velocity-handoff-cut` · workhorse · energy medium · any format · primitive: camera-moves*

The outgoing shot accelerates (a push with roll, a whip, a rise, a zoom-out) and is cut on its fastest frame; the incoming shot opens moving the same way, at about half to one-and-a-half times that speed, and decelerates to rest. Every cut hands over a carrier: velocity, scale direction, shape or position. **When:** the default for every cut in a film. **Avoid:** cutting between two parked frames, or into a move in the opposite direction.

- **Anatomy:** exit ease-in over 4-29 f (about x1.13-1.3 a frame); entry at 0.5-1.5x the exit speed (22-52 px/f on frame one), settling in 20-60 f; a 4 f pre-roll drift can announce the next shot's direction.
- **Timing:** exit 8-58 f; entry 20-72 f; cut speeds 15-200 px/f at 1080p.
- **Sound:** a whoosh, kick or pop on the cut, within ±30 ms of the beat.
- **Build:** `carriedCut()` / `handoffShot()` from `lib/handoff`; declare the seam in `timeline.ts`.

</details>

Browse the book in [references/devices/INDEX.md](skills/cinetic/references/devices/INDEX.md) and the drawable library in [references/technique-library.md](skills/cinetic/references/technique-library.md). The house rules behind them (shot lengths, easing, text timing, transitions, camera, UI in motion, colour over time) are in [references/craft-rules.md](skills/cinetic/references/craft-rules.md).

## Install

### Skills CLI (recommended)

```bash
npx skills add Leonxlnx/cinetic
```

Global install for Claude Code, without prompts:

```bash
npx skills add Leonxlnx/cinetic -g -a claude-code -y
```

Pin a version:

```bash
npx skills add Leonxlnx/cinetic#v1.2.0
```

For Claude Code the skill lands in `.claude/skills/cinetic` (project) or `~/.claude/skills/cinetic` (with `-g`). The same command installs it for the other agents the skills CLI supports, such as Codex and Cursor; choose them with `-a`.

### Claude Code plugin marketplace

```text
/plugin marketplace add Leonxlnx/cinetic
/plugin install cinetic@cinetic
```

Claude Code can then load the skill on its own when you ask for a video, because the request matches the skill's description, or you can call it directly as `/cinetic:cinetic`. To update, run `/plugin marketplace update cinetic`, then open `/plugin` > Installed > cinetic > Update now (details in [docs/setup.md](docs/setup.md#claude-code-plugin)).

### Manual

Download `cinetic.skill` from the [latest release](https://github.com/Leonxlnx/cinetic/releases/latest). It is a zip whose top folder is `cinetic/`:

```bash
curl -L -o cinetic.skill https://github.com/Leonxlnx/cinetic/releases/latest/download/cinetic.skill
mkdir -p ~/.claude/skills
unzip cinetic.skill -d ~/.claude/skills/
```

Or copy the folder from a clone (use `<project>/.claude/skills/` instead for a single project):

```bash
git clone --depth 1 https://github.com/Leonxlnx/cinetic
mkdir -p ~/.claude/skills && cp -R cinetic/skills/cinetic ~/.claude/skills/
```

To update a manual install, remove `~/.claude/skills/cinetic` first, then repeat.

## Requirements

- **macOS or Linux.** The scripts are bash (3.2 or newer, so macOS's built-in bash works); they were developed on Linux, and macOS is less tested. On Windows, WSL2 with the [Ubuntu steps](docs/setup.md#ubuntu-and-debian-apt) is the likely route; it has not been tested.
- **Node 22+** (Remotion 4; `assets.mjs` and the checks)
- **ffmpeg 6+** with libx264, and ffprobe
- **Python 3.11+** with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa; fonttools, brotli and uharfbuzz for outlined SVG logos and supplied fonts; pillow for banding-free gradient PNGs
- **[earshot](https://github.com/Leonxlnx/earshot) 0.4+** in its own virtual environment, with `EARSHOT_PYTHON` pointing at its interpreter: it renders the film's sound kit (the `launch` preset, levelled over the music) and listens to the soundtrack. A film keeps its rendered takes in `audio/kit/`, so it rebuilds where earshot is not installed. Details: [Sound from earshot](docs/setup.md#sound-from-earshot).
- **A licensed music track per film.** You choose it (or the agent searches the licences that pass, `references/music.md`); it stays in the film's git-ignored `audio/music/`. Details: [Music](docs/setup.md#music).
- **Chromium or a Chrome headless shell.** Remotion downloads its own if allowed; set `REMOTION_BROWSER` or `CHROMIUM_PATH` to use a local one.
- **A Remotion licence if you need one.** cinetic is MIT, but Remotion, the default engine, has its own licence: free for individuals and companies of up to 3 people, a company licence from 4. HyperFrames is Apache-2.0.

Install the Python packages in a virtual environment:

```bash
python3 -m venv ~/.venvs/cinetic
source ~/.venvs/cinetic/bin/activate
pip install numpy scipy soundfile pyloudnorm opencv-python librosa fonttools brotli uharfbuzz pillow
```

The scripts call plain `python3`, so activate the environment before you start the agent, or put `~/.venvs/cinetic/bin` first on your `PATH` so the agent's shell finds it. A virtual environment also avoids the `externally-managed-environment` error that recent Debian, Ubuntu and Homebrew Pythons raise on a global `pip install`. Details: [Python packages](docs/setup.md#python-packages).

You don't need a Remotion project first: the agent scaffolds one with `scripts/new-film.sh` and installs its dependencies. Renders are CPU-heavy. Motion blur multiplies render time by the number of sub-frames (typically 3–8x a sharp render); `render.sh --blur` prints an estimate before the sub-frame render, and `--budget` caps it. Full setup steps: [docs/setup.md](docs/setup.md).

## Use

Describe the film in a sentence or two. Paste one of these and swap in your product:

```text
Make a 25-second launch film with music for our database branching tool, for the announcement on X. Invent the brand.
```

```text
Branchly 2.0 is out. Make a 15-second update video with music: offline mode, a command palette and shared branches. Use our brand kit in ./brand.
```

```text
Make our launch film feel like this clip (./ref/launch.mp4), but with our product and our own idea.
```

```text
Make a 20-second launch film for our weather app from real photography of storms and coastlines, cut to a calm instrumental track.
```

```text
Animate our new export feature as a 10-second loop for the landing page. It autoplays muted, so it has to read without sound.
```

```text
Design a logo for our budgeting app and make a 6-second sting with music, plus a transparent version for our editors.
```

```text
Make 9:16 and 1:1 versions of the launch film for Reels and LinkedIn.
```

```text
Review this Remotion film: find the weakest three seconds, check the sync and fix what fails.
```

**What the agent does.** If the brief names the product, the message and the length, it starts; otherwise it asks at most three questions. It works in files you can read and edit: `BRIEF.md` (the spec line, the hard bans and any brand exceptions), a film project scaffolded from the starter at intake, then `TREATMENT.md` (the dealt direction, logline, beat sheet, copy with its word count, the drawn devices, the music and the imagery). It chooses and records the music before it writes the timeline, renders style stills and checks them before it animates, critiques previews on contact sheets, and renders the motion-blurred master once, after the last review round. Stings, loops and short clips take a scaled-down path: a one-page treatment, one or two acts and one review round.

**Plan for a long run.** A full launch film takes the agent one to two hours and several hundred thousand tokens: dealing the direction, finding imagery and music, building the brand, rendering motion blur and running review rounds.

**What you get**, by format:

| Format | Length | Deliverables |
|---|---|---|
| Launch film or teaser | 15–45 s | 16:9 master cut to its track, 9:16 and 1:1 re-layouts, poster, credits for the post, brand kit if invented |
| Update video | 8–20 s | master opening on the version or the mark, the changes as product moments, the end card with the version, poster |
| Product or feature video | 8–30 s | master, poster |
| Feature loop | 4–15 s | MP4, WebM and GIF, with a checked loop seam |
| Logo sting | 3–8 s | MP4, ProRes 4444 alpha versions (held and cleared), poster, brand kit if invented |
| UI walkthrough | 20–90 s | master, SRT captions |

Social versions are re-laid out from the same timeline, never cropped from the master. The brand kit for an invented brand holds the mark and lockups as SVG and transparent PNG for light and dark grounds, favicon sizes, a 400x400 avatar and, on request, a 1500x500 header for X. The delivery folder keeps the deliverables at the top level, `CREDITS.md` and a paste-ready description when a licence asks for a credit, and the QA material (sheets, reports, a manifest with probe facts) in `qa/`. The film stays source code: change a line of copy, the accent or the track, and render again.

## How it works

Every step writes a file and ends at a gate the agent actually runs. It starts from `BRIEF.md`, the brief plus a spec line such as `1920x1080@60, 25s, music: licensed track, pace: calm, format: launch`.

| # | Step | Writes | What happens | Key script or template |
|---|---|---|---|---|
| 0 | Intake | `BRIEF.md`, the project | The format (launch, update, loop, sting…), a supplied brand kit taken in, a clip to borrow grammar from measured | `new-film.sh`, `brand.py`, `like.py` |
| 1 | Idea | `TREATMENT.md` | Three dealt directions, an idea sentence each, one chosen with its signature shot; the film's devices drawn; a beat sheet whose copy is written as fragment chains with the picture beat between fragments | `deck.py`, `pick.py` |
| 2 | Brand and material | `src/brand/`, `public/assets/` | The supplied brand in its roles, or a brand from three personality words; real imagery found, chosen on a sheet and graded into one look | `palette.py`, `assets.mjs` |
| 3 | Music and timeline | `audio/music/`, `src/timeline.ts` | The track licensed, analysed and edited at bar lines; its grid written for the timeline, with acts, cues, copy, seams and declarations on it, words per frame and reading holds checked | `track.py`, `grid-check.ts` |
| 4 | Build | `src/acts/` | Acts built from motion tokens and tested primitives (`Chain`, `Photo`, `InlineGap`, `KeyLight`…), with real product UI fed by one data module; layout, covered text and text speed audited | `lint-film.mjs`, `layout-audit.sh` |
| 5 | Sound | `public/audio/soundtrack.wav` | Sync frames computed from the picture code; the earshot kit's effects placed on them, levelled over the bed, with stop-downs before the payoff; mastered to −14 LUFS; earshot listens to the result | `export-cues.ts`, `plan.py`, `score.py`, `listen.py` |
| 6 | Render | `out/film.mp4` | Preview, sharp or motion-blurred master: blur as the film declares it, optical-flow speeds set the sub-frames, averaged in float and quantized once to BT.709; sync and spec gates | `render.sh` |
| 7 | Review | `out/qa/` | Contact sheets, the picture and motion floors, the grammar score, pixel forensics, an onset-by-onset audio audit, four critic lenses and a verifier, a scored rubric and a ship gate | `look-audit.py`, `grammar-score.mjs`, `forensics.py` |
| 8 | Deliver | `out/deliver/` | Poster from a clean still, GIF and WebM loops, alpha stings, social variants, credits for the post, a manifest; the brand kit | `deliver.sh`, `credits.py`, `brand-kit.sh` |

Everything hangs off one grid. With a track, `track.py grid` writes `src/music.ts` from the edit, and every frame number in the film comes from one helper on the music's own bars, so the picture, the cue export and the audits can't drift apart:

```ts
export const b = (n: number, beat = 0, sub = 0) =>   // bar, beat, 16ths
  MUSIC ? Math.round(bar(n, beat, sub))               // the track's measured bars
        : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
```

Sounds are never placed by hand. `export-cues.ts` runs the project's `src/sync.ts`, which computes the contact frames of springs, the settle frames of arrivals and the velocity peaks of launches from the same constants the acts animate with, and `score.py` places the effects on those frames.

## Sound

**The music.** Every film plays one licensed, human-made, instrumental track. `track.py add` writes its licence record with the licence quoted as read on the item's own page; `analyze` measures tempo, bars, phrases, entries, stops, the ending and the key; `edit` cuts it at bar lines to the film's length with the reveal on a strong bar; `grid` writes the film-time grid the timeline uses; `check` measures every join on the edited bed. The track and anything mixed from it are git-ignored; the record, the analysis and the edit are committed (JSON, no audio). A licence that asks for a credit gets it in the delivery folder and the post description, never in the picture.

**The effects.** Every effect has a role (`text`, `hit`, `land`, `whoosh.short`, `key`, ...), and the film's kit, `audio/kit.json`, names one sound for each from the bank of [earshot](https://github.com/Leonxlnx/earshot), a separate tool that designs sounds in code and checks them by measurement. With a track the kit is the `launch` preset: each role sits at its level over the bed, offset against the cut, with a minimum gap for runs. `plan.py` lays the effects out; `score.py` renders the bed and the effects, applies the stop-downs (a few before the hit, the drop or the swell that matter, never a duck under every effect) and masters to −14 LUFS. Tuned effects never become a melody: at most two pitched effects in any 4 s.

The house style is restraint: one soft sound per text fragment, near-silence while it is read, a big hit only for the one reveal, and a lockup that is a stop-down and one clean element. `scripts/audio/listen.py` gives the review loop ears: earshot's per-cue sync, an annotated sound sheet and a critique, in one process.

Without earshot or a rendered kit the soundtrack fails its gate; `score.py --draft` plays placeholder voices for a timing check, and a draft build is never delivered.

## Look

Neutral grounds and surfaces (cool greys, a mid slate for dark stages), ink, and one accent with a meaning, on what matters, at its share of the frame. A film may add a second hue for a moment. Real imagery keeps its own colour, graded natural. The picture is never flat: `look-audit.py` fails a render under the floors (the camera or the ground moving through every hold, two planes at different rates, carried seams, a device in every beat, a light event in every act, scale contrast across cuts, structure and colour mass in the frame), and `grammar-score.mjs` scores the film against the house grammar or a clip's.

When the agent invents the look, none of these appear:

- **Words:** eyebrow or kicker labels, stacked taglines, "Introducing…", full sentences dumped at once, text walls and filler (decorative mono captions, fake metrics, lorem ipsum)
- **Type:** serif typefaces; italic or oblique styles, including a skew that fakes one; overshoot or per-letter tricks on copy
- **Colour:** orange, amber, beige, cream, tan or sand; purple, violet or indigo; neon; a monochrome wash of the accent
- **Decoration:** emoji and stock icons; sparkles standing for "AI", confetti and code rain; bouncy overshoot on anything that isn't landing

Light, glow, glass, spectral and iridescent colour and multi-hue gradients are allowed as part of a device with a job (every gradient baked and dithered, no banding), never as a look laid over everything. `lint-film.mjs` checks tokens and styles (colours by OKLCH region, declared device palettes), `palette.py` refuses a banned accent or ground, and the critics check the rendered frames.

**A brand you supply always wins.** If your identity includes a serif wordmark or an orange, it is used as given, recorded in `BRIEF.md` and `brand/brand.json` so the critics don't flag it, and marked in code with `// cinetic:brand-supplied <what>` so the lint accepts it; supplied colours are checked only for contrast and the one-accent rule.

## What's inside

| Path | Contents |
|---|---|
| `skills/cinetic/SKILL.md` | The director: formats and defaults, the laws, the workflow from intake to delivery (Steps 0–8) with its gates plus a scaled-down path for stings and loops, taste rules, the timing and motion systems, engine rules, the ship gate |
| `skills/cinetic/references/` | 26 guides, each read when its step comes up (concept and the direction deck, brand and colour, brand kits, copy and type, timing grid, motion tokens, camera, lighting, transitions, product UI, imagery, music, sound, update films, clip match, formats, finishing, checks, review loop, a catalogue of cheap-looking tells, both engines, Chromium rendering traps, the craft rules, a worked example), the device book in `devices/` and the drawable library in `library/` |
| `skills/cinetic/assets/directions/` | The direction deck: `directions.json` and the imagery-led `imagery.json` |
| `skills/cinetic/assets/library/` | `techniques.json`, the 721 entries `pick.py` draws from |
| `skills/cinetic/scripts/` | 42 scripts: scaffold, the direction deal (`deck.py`), the draw (`pick.py`), brand intake (`brand.py`), clip match (`like.py`), imagery (`assets.mjs`), lint, grid and layout audits, palette, cue export, the music (`track.py`), the sound kit (`kit.py`), the effects plan, score and master, credits, listening, render and motion blur, probe and sync gates, the look floors and the grammar score, forensics, A/V audit, contact sheets, delivery, brand kit. Each is documented in its header comment and, except the internal `brand-svg.ts` and `hf-preflight.cjs` helpers, in its `--help`. Their regression tests are in `scripts/test/`. |
| `skills/cinetic/assets/` | The Remotion starter (default, with its demo and the tested primitives in `src/fx/`), the HyperFrames starter, the treatment template and five critic prompts (director, art/copy/UI, sound-sync, forensics, verifier) |
| [`evals/evals.json`](evals/evals.json) | The briefs and the written expectations each film is graded against |
| `docs/` | [Setup](docs/setup.md) and the [evaluation](docs/evaluation.md) |
| `.claude-plugin/` | `marketplace.json` and `plugin.json` for the Claude Code plugin marketplace |
| `.github/workflows/` | `ci.yml` (checks) and `release.yml` (packages `cinetic.skill` for each version tag, with notes from the changelog) |
| [`CHANGELOG.md`](CHANGELOG.md) | What each version changed |

The Remotion starter's demo is a 13-second film built to be replaced: "Built on" and "the beat" build on a drawn rule around an accent dot that lands on the downbeat, the line launches left into a photograph slot (a stand-in drawn in code until the film's own photographs go in), the picture contracts into the gap of "Every frame", and the mark lands as a relief under a turning key before the name slides out. Its `audio/score.json` plays the track you add (`audio/music/README.md`).

## Evaluation

Each round ran the briefs with cinetic and with the same agent without it but with the official Remotion agent skills. A grader checked each brief's written expectations (size, frame rate, duration, loudness and true peak measured by script; sync and the visual checks judged from frames and audio), and blind judging agents compared each pair with the labels randomized: a neutral senior creative director in every round, a second judge applying a house style guide equal to the hard bans from round 3, and from round 6 the neutral judge again, comparing each new film with the one 0.5.0 made for the same brief.

| Round | Version | Briefs | Expectations met (cinetic vs baseline) | Neutral judge: cinetic wins | House-style judge: cinetic wins | Against 0.5.0's films |
|---|---|---|---|---|---|---|
| 1 | 0.1.0 | 3 | 97.7% vs 80.3% | 0 of 3 | not run | not run |
| 3 | 0.3.0 | 4 | 100% vs 74.8% | 2 of 4 | 4 of 4 | not run |
| 4 | 0.4.0 | 4 | 55/56 (98%) vs 39/56 (70%) | 0 of 4 | 4 of 4 | not run |
| 5 | 0.5.0 | 4 | 54/56 (96%) vs 41/56 (73%) | 2 of 4 | 4 of 4 | not run |
| 6 | 1.0.0, first snapshot | 4 | 53/56 (95%) vs 41/56 (73%) | 1 of 4 | 4 of 4 | 2 of 4 |
| 7 | 1.0.0, second snapshot | 4 | 54/56 (96%) vs 41/56 (73%) | 2 of 4 | 4 of 4 | 3 of 4 |

Round 2 was invalidated by a harness problem and is not reported.

cinetic met more of the written expectations in every round and won every house-style comparison. The neutral judge was split, and its craft notes became rules: in round 7 it credited the baselines' warmer, richer pictures while preferring cinetic's ideas and product story. Version 1.2 answers that note directly, with a dealt direction per film, real imagery, the device book, music on every film and floors that fail a flat picture; 1.1.0 and 1.2.0 have not had a judged round of their own yet. A cinetic run costs about three times the time and tokens of the baseline (round 7 average: 95 vs 33 minutes, 626k vs 231k tokens). The method and the full results are in [docs/evaluation.md](docs/evaluation.md).

## Origin

The process was first worked out while making Tessel, a 33-second launch film built in code ([source and film](https://github.com/Leonxlnx/claude-launchvideo)). Its [worked example](skills/cinetic/references/worked-example.md) ships with the skill.

## Contributing

Issues and pull requests are welcome. Before you open a PR, run the regression tests (they need Node 22.18+ and Python 3 with numpy, scipy, soundfile, pyloudnorm and librosa):

```bash
node skills/cinetic/scripts/test/tokens.test.mjs
node skills/cinetic/scripts/test/mirror.test.mjs
node skills/cinetic/scripts/test/lint-film.test.mjs --part static
node skills/cinetic/scripts/test/grid-check.test.mjs    # the Remotion starter cases need: npm install in assets/remotion-starter
node skills/cinetic/scripts/test/scripts-docs.test.mjs
node skills/cinetic/scripts/test/add-font.test.mjs
node skills/cinetic/scripts/test/provenance.test.mjs
node skills/cinetic/scripts/test/assets.test.mjs
python3 skills/cinetic/scripts/test/pick.test.py
python3 skills/cinetic/scripts/test/deck.test.py
python3 skills/cinetic/scripts/test/brand.test.py
python3 skills/cinetic/scripts/test/like.test.py
python3 skills/cinetic/scripts/test/track.test.py
python3 skills/cinetic/scripts/test/score.test.py
python3 skills/cinetic/scripts/test/encode-tags.test.py   # runs its encodes when ffmpeg is on PATH
python3 skills/cinetic/scripts/test/bash32.test.py
```

CI runs the same tests (with the Remotion starter installed and type-checked) and also checks the SKILL.md frontmatter, the JSON and plugin manifests, that the skills CLI discovers the skill, Python, Node and shell syntax, and that no audio or video with sound is tracked by git. The shell scripts are also parsed with bash 3.2 (macOS's `/bin/bash`), in a container and on a macOS runner, which also runs the encode-tags test on a current ffmpeg. Bash 3.2 cannot parse a heredoc inside `$( )`: put such a heredoc in a shell function (`bash32.test.py` finds them). A change to a lint or text-flow rule needs a fixture in `skills/cinetic/scripts/test/lint-fixtures/`, and a change to a timeline check one in `grid-fixtures/`, that declares what it must produce. A change to the library goes into `techniques.json`; regenerate the readable pages with `python3 skills/cinetic/scripts/pick.py --markdown` (the index) and `--markdown --family <name>` (each family's file in `references/library/`); `pick.test.py` checks that they match.

## License

[MIT](LICENSE), copyright (c) 2026 Leonxlnx.
