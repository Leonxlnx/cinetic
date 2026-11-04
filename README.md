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

<!-- EXAMPLE E1 (hero), for the owner to fill: the approved 1.5 launch film as a GIF excerpt linking to its MP4 on the media branch, with alt text, and one caption line under it (length, format, "made by an agent with cinetic 1.5 from the brief below"). No media is committed to this branch. -->

cinetic (cinema + kinetic) is an agent skill that makes your coding agent direct a short film instead of arranging animation components. It is built for the two films a product team makes most: the **launch film** and the **update video** ("v2 is out", with the three things that changed).

- **Clear copy first.** Before any picture, the agent writes a script a stranger understands in 5 seconds: what the product is by 3 s, then one thing it does a line, then the name and what to do, in 2–7 plain words a line. `copy-check.py` reads it the way a stranger would and fails vague words, slogans and keyword piles.
- **One line at a time, each with its own animation.** Every line of the script arrives its own way, from twenty-three tested text animations and a book of 466 devices, while the camera keeps the picture moving. A hero line lands solid and leaves at speed, and seams carry the object and the speed into the next shot.
- **Templates for the films teams make most.** `new-film.sh --template` lays down a whole film's structure: an update video, a UI walkthrough, a capability reel, a camera teaser, a prompt run, a social ad or a type explainer. For a film whose idea is its own device, the agent is dealt an art direction instead.
- **The product, built in code.** Its screens come back as live components at film size: dense screens with one readable line, panels tilted in one light, a camera that moves through depth, portraits instead of grey silhouettes, and data that adds up on every frame.
- **Real marks of the products it works with.** `logos.mjs` fetches the official colour marks of a product's integrations, sources and models from open collections and records source, licence and trademark owner. The kit sets them as app-icon tiles, chips, marks inside a line, walls and rings. Generic glyphs are Phosphor Icons.
- **Type in one step.** Inter at its display cut by default, or a free face dealt from a set by look (neutral, tight, geometric, friendly, technical); two measured type families, calm or bold, set with one command; and `font-match.mjs` picks the free face closest to a brand face that cannot ship.
- **Your brand, or one it makes.** Hand it a brand kit (logo, colours, fonts, screenshots) and `brand.py` writes it into the film. Without one, it designs a brand from three personality words. A clip you supply can lend the film its grammar, never its content.
- **Music-led sound.** Every film is cut to its own licensed, human-made instrumental track, found by mood, tempo and length, with a sound cast for each action from an [earshot](https://github.com/Leonxlnx/earshot) kit and a library of real effects. No music is generated, nothing copyrighted enters a repository, and credits never appear in the picture.
- **Finished and measured.** True motion blur, no banding, BT.709 and a sync-checked mux, then gates that fail motion that snaps, freezes or stops dead, floors against a flat picture, checks against filler shapes and unmotivated light, pixel forensics, an audio-sync audit, contact sheets and critic passes against a ship gate.

It builds with Remotion (React) by default, or HyperFrames (HTML and GSAP).

[Quick start](#quick-start) · [Examples](#examples) · [Start a film](#start-a-film) · [Install](#install) · [Requirements](#requirements) · [Use](#use) · [How it works](#how-it-works) · [Sound](#sound) · [Look](#look) · [What's inside](#whats-inside) · [Evaluation](#evaluation)

## Quick start

```bash
npx skills add Leonxlnx/cinetic
```

Then ask your agent for a film, for example: "Make a 25-second launch film with music for our database branching tool. Invent the brand." It works with Claude Code, Codex, Cursor and the other agents the skills CLI supports.

Before the first film, check your machine with [a first test render](docs/setup.md#4-a-first-test-render). It needs Node 22+, ffmpeg 6+, Python 3.11+ and a headless Chromium, plus [earshot](https://github.com/Leonxlnx/earshot) 0.4 for the sound; see [Requirements](#requirements).

## Examples

<!--
EXAMPLES, for the owner to fill with the approved 1.5 films. No media is committed to this branch: each film
lives on the repo's `media` branch (or as a release asset) and its cell links there; list the same files in
DEMOS in .github/workflows/release.yml so the release attaches them.
One cell per film, in this order:
  E2  the update video ("v1.5 is out", three changes)
  E3  the launch film built from a supplied brand kit
  E4  the film made with clip match
  E5  the sign-off sting
Each cell: a GIF excerpt linking to its MP4, alt text, a bold title, two or three sentences on its idea and
its template or devices, and "Download MP4 (length, sound, size in MB)".
Then the briefs, word for word, in a <details> block.
-->

Every film here was made by an agent with cinetic 1.5 from a one-paragraph brief and cut to a licensed music track. The brands are invented unless the brief supplied one. Clicking a GIF downloads its MP4. The films live on the repo's `media` branch, so installs stay small.

## Start a film

The agent scaffolds the project itself at intake. These are the commands it runs, and you can run them too (`<skill>` is where the skill is installed, for example `~/.claude/skills/cinetic`):

```bash
# a launch film from the starter, for an idea that is its own device
bash <skill>/scripts/new-film.sh films/acme --fps 60 --size 1920x1080

# a film template laid over the starter
bash <skill>/scripts/new-film.sh films/acme-walk --template ui-walkthrough

# an update video in a supplied brand, cut to a track found with music.mjs
bash <skill>/scripts/new-film.sh films/acme-2 --template update --brand ./brand \
  --music ./audio/track.mp3 --record ./audio/track.licence.json
```

`new-film.sh` copies the starter (and the template), sets the grid, copies every cinetic script into the project so it runs on its own, and installs its dependencies. Other flags: `--type calm|bold` (the type family), `--like <clip>` (a clip's grammar), `--pace crisp`, `--engine hyperframes`, `--font <name>` and `--link-modules <dir>`; `--format update` is the same as `--template update`. `new-film.sh --help` lists them all.

### Which template

| Template | Length | Use it when |
|---|---|---|
| none (the starter) | 15–45 s | a launch film whose idea is its own device: most films |
| `update` | 15–23 s | "vX is out": 2–4 changes to show, each as a product moment |
| `ui-walkthrough` | 25–40 s | the product's flow is the story: an input goes in, the product does visible work, an output comes out |
| `capability-reel` | 15–25 s | the product's breadth is the story (sources, formats, integrations), or a launch film needs its close |
| `camera-teaser` | 20–25 s | a dark, fast teaser of the product's screens where the camera does the moving |
| `prompt-run` | 18–20 s | the product does work from a request (an agent, an assistant, a generator) and returns it done |
| `social-ad` | 15 s | a short ad for a feed, cut on the product's own pictures |
| `type-explainer` | 20–30 s | the idea is simple to say and the words carry it, on a white page with little product UI |

The test is to say the film in one sentence. "You give it X and get Y" is a walkthrough; "it works with everything and returns anything" is a reel; "here is what changed" is an update; "ask it, it does the steps, here is the result" is a prompt run. When none fits, start from the starter.

A template is the floor, never the film. It carries the structure, shot types, timing, transitions and choreography; the product, the words, the brand and the direction are yours. Its pace, tempo and type family become the film's defaults. Every string on screen comes from one content file whose placeholder marker fails the lint until the product's own words and data are in, and a fresh scaffold passes `tsc`, `grid-check` and `lint-film` with only those markers left. Its acts sit on whole bars, so once the track is in, every act line lands on a downbeat. Templates are for Remotion. Details: [references/templates.md](skills/cinetic/references/templates.md).

### Directions and devices

A film from the starter is dealt, not left to the agent's habits.

**The direction deck.** In Step 1 the agent runs

```bash
python3 scripts/deck.py --brief "a docs map for scattered teams" --format launch --pace calm --options 3
```

and gets three complete directions from 35, each fitted to the format: its space, light, camera language, cut grammar, type behaviour, story shape, lockup, palette proportions and one signature shot, and for an update film its hook, change and payoff beats. Type-led and graphic directions come up most; the 9 imagery-led ones are dealt only when the film has the product's own photographs or footage (`--have photos` or `--have footage`). The agent writes an idea sentence for each, keeps the one a competitor could not claim, and deals the full sheet for it, which becomes the art direction in `TREATMENT.md`.

**The device book.** `references/devices/` holds 466 devices in 25 family files (type arrivals and exits, lines and swaps, marks and markers, icons and glyphs, colour and light, glass, glow and spectral, texture and grids, photos and footage, collage and composition, camera, camera transitions, cuts and seams, morphs and handoffs, wipes, masks and irises, speed and rush, depth and 3D, UI choreography, micro-interactions, cursor, loaders, data and numbers, logo and end card, sound and timing, cadence and grammar), with an index that picks by job: opening hook, reveal, emphasis, transition, proof, product moment, update change, lockup. Each entry gives what it is and when it earns its place, its anatomy, house timing at 60 fps, the sound that goes with it, and how to build it: a tested primitive in the starter's `src/fx/` with its props, or a recipe in plain layers.

**The draw.** `pick.py` draws the film's devices from 724 entries in 27 families, and one text animation for each line of the script:

```bash
python3 scripts/pick.py --format launch --energy high --seconds 25 --lines 6 --json out/qa/picks.json
```

That is about one device per beat, in the order the format needs them, from many families (a variety rule keeps one family from filling a film), weighted toward the house's workhorses and the film's energy, and a different text animation on every line. The agent builds the picks its direction can carry, retold in the film's own objects, and rerolls or drops the rest with a reason written into the treatment. The seed is printed, so a plan can be reproduced.

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
npx skills add Leonxlnx/cinetic#v1.5.0
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

- **macOS, Linux, or Windows with Git Bash.** The scripts are bash (3.2 or newer, so macOS's built-in bash works); they were developed on Linux, and macOS is less tested. On Windows they run in Git Bash, with `PYTHON` set to the interpreter of an environment that has the packages below; WSL2 with the [Ubuntu steps](docs/setup.md#ubuntu-and-debian-apt) is another route, not yet tested.
- **Node 22+** (Remotion 4; `music.mjs`, `logos.mjs`, `assets.mjs`, `font-match.mjs` and the checks)
- **ffmpeg 6+** with libx264, and ffprobe
- **Python 3.11+** with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa; fonttools, brotli and uharfbuzz for outlined SVG logos and supplied fonts; pillow for banding-free gradient PNGs
- **[earshot](https://github.com/Leonxlnx/earshot) 0.4+** in its own virtual environment, with `EARSHOT_PYTHON` pointing at its interpreter: it renders the film's sound kit (the `launch` preset, levelled over the music), ranks the sounds cast for each action and listens to the soundtrack. A film keeps its rendered takes in `audio/kit/`, so it rebuilds where earshot is not installed. Details: [Sound from earshot](docs/setup.md#sound-from-earshot).
- **A licensed music track per film.** The agent finds one with `music.mjs` in free catalogs whose licence needs no credit, or you choose it; it stays in the film's git-ignored `audio/music/` beside its licence record. Details: [Music](docs/setup.md#music).
- **Chromium or a Chrome headless shell.** Remotion downloads its own if allowed; set `REMOTION_BROWSER` or `CHROMIUM_PATH` to use a local one.
- **A Remotion licence if you need one.** cinetic is MIT, but Remotion, the default engine, has its own licence: free for individuals and companies of up to 3 people, a company licence from 4. HyperFrames is Apache-2.0.

Install the Python packages in a virtual environment:

```bash
python3 -m venv ~/.venvs/cinetic
source ~/.venvs/cinetic/bin/activate
pip install numpy scipy soundfile pyloudnorm opencv-python librosa fonttools brotli uharfbuzz pillow
```

Every script finds Python through `scripts/py.mjs`: `$PYTHON` when it is set, else the first of `python3`, `python` and `py -3` that runs Python 3.10 or newer and imports numpy, so the Microsoft Store alias is never run (`node scripts/py.mjs --which` prints the one it uses). Set `PYTHON` to the environment's interpreter, activate the environment before you start the agent, or put `~/.venvs/cinetic/bin` first on your `PATH`. A virtual environment also avoids the `externally-managed-environment` error that recent Debian, Ubuntu and Homebrew Pythons raise on a global `pip install`. Details: [Python packages](docs/setup.md#python-packages).

You don't need a Remotion project first: the agent scaffolds one with `scripts/new-film.sh` and installs its dependencies. Renders are CPU-heavy. Motion blur multiplies render time by the number of sub-frames (typically 3–8x a sharp render); `render.sh --blur` prints an estimate before the sub-frame render, and `--budget` caps it. Renders run in parts, so a render stopped by a time limit or a crash resumes where it stopped. Full setup steps: [docs/setup.md](docs/setup.md).

## Use

Describe the film in a sentence or two. Paste one of these and swap in your product:

```text
Make a 25-second launch film with music for our database branching tool, for the announcement on X. Invent the brand.
```

```text
Branchly 2.0 is out. Make a 15-second update video with music: offline mode, a command palette and shared branches. Use our brand kit in ./brand.
```

```text
Make a 30-second walkthrough of our app: you paste a meeting link and get a finished brief. It works with Zoom, Google Meet and Slack, so show their marks.
```

```text
Make our launch film feel like this clip (./ref/launch.mp4), but with our product and our own idea.
```

```text
Make a 15-second ad for Reels from the product photos in ./photos.
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

**What the agent does.** If the brief names the product, the message and the length, it starts; otherwise it asks at most three questions, and it asks for the products yours works with, whose marks it can show. It works in files you can read and edit: `BRIEF.md` (the spec line, the hard bans and any brand exceptions), a film project scaffolded from the starter or a template at intake, then `TREATMENT.md` (the dealt direction, the script with its word count, the beat sheet with a device and a text animation per line, the music and any pictures). It runs `copy-check.py` on the script before any picture work, chooses and records the music before it writes the timeline, renders style stills and checks them before it animates, critiques previews on contact sheets, and renders the motion-blurred master once, after the last review round. Stings, loops and short clips take a scaled-down path: a one-page treatment, one or two acts and one review round.

**Plan for a long run.** A full launch film takes the agent one to two hours and several hundred thousand tokens: dealing the direction, writing and checking the script, finding the music, building the brand and the product's screens, rendering motion blur and running review rounds.

**What you get**, by format:

| Format | Length | Deliverables |
|---|---|---|
| Launch film or teaser | 15–45 s | 16:9 master cut to its track, 9:16 and 1:1 re-layouts, poster, credits for the post, brand kit if invented |
| Update video | 8–20 s | master opening on the name and the version, the changes as product moments, the end card with the version, poster, 9:16 |
| Product or feature video | 8–30 s | master, poster |
| Feature loop | 4–15 s | MP4, WebM and GIF, with a checked loop seam |
| Logo sting | 3–8 s | MP4, ProRes 4444 alpha versions (held and cleared), poster, brand kit if invented |
| UI walkthrough | 20–90 s | master, SRT captions |

Social versions are re-laid out from the same timeline, never cropped from the master. The brand kit for an invented brand holds the mark and lockups as SVG and transparent PNG for light and dark grounds, favicon sizes, a 400x400 avatar and, on request, a 1500x500 header for X. The delivery folder keeps the deliverables at the top level, `CREDITS.md` and a paste-ready description when a licence asks for a credit, and the QA material (sheets, reports, a manifest with probe facts) in `qa/`. The film stays source code: change a line of copy, the accent or the track, and render again.

## How it works

Every step writes a file and ends at a gate the agent actually runs. It starts from `BRIEF.md`, the brief plus a spec line such as `1920x1080@60, 25s, pace: calm, format: launch, audio: licensed track + launch kit`.

| # | Step | Writes | What happens | Key script or template |
|---|---|---|---|---|
| 0 | Brief | `BRIEF.md`, the project | The format, the engine and the pace; what is supplied (a brand kit, a clip, pictures, the products it works with); the project scaffolded from the starter or a template | `new-film.sh` |
| 1 | Direction | `TREATMENT.md`, `out/direction.json` | Three dealt directions, an idea sentence each, one chosen with its signature shot | `deck.py` |
| 1b | Script | `TREATMENT.md` (Script) | What it is by 3 s, one thing it does a line, the name and what to do; 2–7 plain words a line, checked before any picture work | `copy-check.py` |
| 2 | Brand and look | `src/brand/` | A supplied kit taken in, or a brand from three personality words; the type family; a clip's grammar measured; style stills | `brand.py`, `palette.py`, `type-family.mjs`, `like.py` |
| 3 | Music | `audio/music/`, `src/music.ts` | The track found by mood, tempo and length, licensed, analysed and edited at bar lines; its grid written for the timeline | `music.mjs`, `track.py` |
| 4 | Pictures (optional) | `public/assets/graded/` | Only the product's own pictures, or one that carries the idea, graded into one look | `assets.mjs` |
| 5 | Beat sheet and timeline | `TREATMENT.md`, `src/timeline.ts` | One sentence per beat; the devices drawn, one text animation per line; acts, cues, copy and declarations on the music's bars | `pick.py`, `grid-check.ts` |
| 6 | Build | `src/acts/` | Acts built from motion tokens and tested primitives (`TypeLine`, `Chain`, `Lit`, `DepthStack`…), the product rebuilt with the kit and one data module, real marks fetched; layout, covered text and text speed audited | `lint-film.mjs`, `layout-audit.sh`, `logos.mjs` |
| 7 | Checks | `out/qa/` | On a preview: the floors against a flat film, the motion gates, the grammar score | `look-audit.py`, `forensics.py`, `grammar-score.mjs` |
| 8 | Sound | `public/audio/soundtrack.wav` | Sync frames computed from the picture code; a sound cast for each action, levelled over the bed, with stop-downs before the payoff; mastered to −14 LUFS; earshot listens to the result | `export-cues.ts`, `kit.py`, `plan.py`, `score.py` |
| 9 | Render | `out/film.mp4` | Preview, sharp or motion-blurred master in resumable parts: blur as the film declares it, optical-flow speeds set the sub-frames, averaged in float and quantized once to BT.709; sync and spec gates | `render.sh` |
| 10 | Review | `out/qa/round-N/` | Contact sheets and feed-size strips, the measurements, an onset-by-onset audio audit, critic lenses and a verifier, a scored rubric and a ship gate | `sheet.py`, `av-audit.py`, `listen.py` |
| 11 | Deliver | `out/deliver/` | Poster from a clean still, GIF and WebM loops, alpha stings, social variants, credits for the post, a manifest; the brand kit | `deliver.sh`, `credits.py`, `brand-kit.sh` |

Everything hangs off one grid. With a track, `track.py grid` writes `src/music.ts` from the edit, and every frame number in the film comes from one helper on the music's own bars, so the picture, the cue export and the audits can't drift apart:

```ts
export const b = (n: number, beat = 0, sub = 0) =>   // bar, beat, 16ths
  MUSIC ? Math.round(bar(n, beat, sub))               // the track's measured bars
        : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
```

Sounds are never placed by hand. `export-cues.ts` runs the project's `src/sync.ts`, which computes the contact frames of springs, the settle frames of arrivals and the velocity peaks of launches from the same constants the acts animate with, and `score.py` places the effects on those frames.

## Sound

**The music.** Every film plays its own licensed, human-made, instrumental track. `music.mjs search` looks through free catalogs whose licence needs no credit (Mixkit, and CC0 recordings on Wikimedia Commons, ccMixter and Openverse) and ranks them by the brief's mood words, tempo, length and energy curve; `sheet --measure` lists three to audition; `get` reads the licence page again and downloads the file with its licence record. `music.mjs pick` ranks a curated library of analysed tracks instead. No film reuses a track an earlier film used. `track.py` then analyses tempo, bars, phrases, entries, stops, the ending and the key, edits the track at bar lines to the film's length with the reveal on a strong bar, writes the film-time grid the timeline uses and measures every join. The track and anything mixed from it are git-ignored; the record, the analysis and the edit are committed (JSON, no audio). A licence that asks for a credit gets it in the delivery folder and the post description, never in the picture.

**The effects.** Every effect plays an action: a card landing, a toggle, typing, a swipe, a logo lock, a transition through a shape. `kit.py cast` gives each action in the film its own sound from the bank of [earshot](https://github.com/Leonxlnx/earshot), a separate tool that designs sounds in code and checks them by measurement, ranked by earshot's ears and checked for masking against the track. Where the bank sounds an action weakly, a real effect that needs no credit comes in (`music.mjs search --kind sfx`, `kit.py real`) and joins a sound library (`library.py`) that the cast draws from beside the bank, so no two films share one set. With a track, each role sits at its level over the bed. `plan.py` lays the effects out; `score.py` renders the bed and the effects, applies the stop-downs (a few before the hit, the drop or the swell that matter, never a duck under every effect) and masters to −14 LUFS. Tuned effects never become a melody: at most two pitched effects in any 4 s.

The house style is restraint: one soft sound per line of text, near-silence while it is read, a big hit only for the one reveal, and a lockup that is a stop-down and one clean element. `scripts/audio/listen.py` gives the review loop ears: earshot's per-cue sync, an annotated sound sheet and a critique, in one process.

Without earshot or a rendered kit the soundtrack fails its gate; `score.py --draft` plays placeholder voices for a timing check, and a draft build is never delivered.

## Look

Neutral grounds and surfaces (cool greys, a mid slate for dark stages), ink, and one accent with a meaning, on what matters, at its share of the frame, with an optional support hue beside it in 10–30 % of the film. Type reads large and frontal on clean fields; the product's own UI and graphic effects carry the picture, and pictures are an accent. The picture is never flat or frozen: `look-audit.py` fails a render under the floors (the camera or the ground moving through most of the body, two planes at different rates, carried seams, a designed moment every 3 s, a light event in every act, scale changes across cuts, clean flat ground and colour mass in the frame), `forensics.py` fails motion that snaps, freezes, settles too fast or stops dead, and `grammar-score.mjs` scores the film against the house grammar or a clip's. Every element in frame has a job, and light is motivated and subtle: a ground is flat or keyed gently from one side, and `look-audit.py` fails faint shapes that carry no text, icon or mark and a pool or haze of light over the ground, which `lint-film.mjs` also flags in the source.

When the agent invents the look, none of these appear:

- **Words:** a film that does not say what the product is by 3 s; vague, fancy or metaphor copy and slogan shapes ("X, reimagined"); keyword piles; two lines on screen at once; a line over 7 words; eyebrow or kicker labels, stacked taglines, "Introducing…", text walls and filler (decorative mono captions, fake metrics, lorem ipsum)
- **Type:** serif typefaces; italic or oblique styles, including a skew that fakes one; overshoot on copy; letters moving one by one outside a line's own text animation
- **Colour:** orange, amber, beige, cream, tan or sand; purple, violet or indigo; neon; a monochrome wash of the accent; glassmorphism as a UI style
- **Decoration:** emoji and stock icons; sparkles standing for "AI", confetti and code rain; bouncy overshoot on anything that isn't landing
- **Filler:** faint plates and blank cards that carry nothing, floating at depth or round a line; a light pool, white haze or fog vignette with no source in the picture; a veil over the product
- **Pictures:** stock as the base of a film; low-resolution or mixed-grade pictures

Light, glow, glass, spectral and iridescent colour and multi-hue gradients are allowed as part of a device with a job (every gradient baked and dithered, no banding), never as a look laid over everything. Other products' marks keep their own colours. `lint-film.mjs` checks tokens and styles (colours by OKLCH region, declared device palettes), `palette.py` refuses a banned accent or ground, and the critics check the rendered frames.

**A brand you supply always wins.** If your identity includes a serif wordmark or an orange, it is used as given, recorded in `BRIEF.md` and `brand/brand.json` so the critics don't flag it, and marked in code with `// cinetic:brand-supplied <what>` so the lint accepts it; supplied colours are checked only for contrast and the one-accent rule.

## What's inside

| Path | Contents |
|---|---|
| `skills/cinetic/SKILL.md` | The director: formats and defaults, the laws, the workflow from brief to delivery (Steps 0–11) with its gates plus a scaled-down path for stings and loops, taste rules, the timing and motion systems, engine rules, the ship gate |
| `skills/cinetic/references/` | 27 guides, each read when its step comes up (concept and the direction deck, film templates, copy and type, brand and colour, brand kits, timing grid, motion tokens, camera, lighting, transitions, product UI, imagery, music, sound, update films, clip match, formats, finishing, checks, review loop, a catalogue of cheap-looking tells, both engines, Chromium rendering traps, the craft rules, a worked example, the library index), the device book in `devices/` and the drawable library in `library/` |
| `skills/cinetic/assets/templates/` | Seven film templates: `update`, `ui-walkthrough`, `capability-reel`, `camera-teaser`, `prompt-run`, `social-ad` and `type-explainer` |
| `skills/cinetic/assets/directions/` | The direction deck: `directions.json` and the imagery-led `imagery.json` |
| `skills/cinetic/assets/library/` | `techniques.json`, the 724 entries `pick.py` draws from |
| `skills/cinetic/scripts/` | 51 scripts: scaffold (`new-film.sh`), the direction deal (`deck.py`), the draw (`pick.py`), the script check (`copy-check.py`), brand intake (`brand.py`), clip match (`like.py`), type (`type-family.mjs`, `font-match.mjs`, `add-font.mjs`, with the face set by look in `faces.json`), imagery (`assets.mjs`), other products' marks (`logos.mjs`), the music finder (`music.mjs`) and the track (`track.py`), the sound kit and its cast (`kit.py`, `actions.py`, `library.py`), the effects plan, score and master, credits, listening, lint, grid and layout audits, palette, cue export, render and motion blur, probe and sync gates, the look floors and the grammar score, forensics, A/V audit, contact sheets, delivery, brand kit, and the Python finder (`py.mjs`). Each is documented in its header comment and, except the internal `brand-svg.ts` and `hf-preflight.cjs` helpers, in its `--help`. Their regression tests are in `scripts/test/`. |
| `skills/cinetic/assets/` | The Remotion starter (default, with its demo, the tested primitives in `src/fx/` and the product kit in `src/kit/`), the HyperFrames starter, the treatment template and five critic prompts (director, art/copy/UI, sound-sync, forensics, verifier) |
| [`evals/evals.json`](evals/evals.json) | The briefs and the written expectations each film is graded against |
| `docs/` | [Setup](docs/setup.md) and the [evaluation](docs/evaluation.md) |
| `.claude-plugin/` | `marketplace.json` and `plugin.json` for the Claude Code plugin marketplace |
| `.github/workflows/` | `ci.yml` (checks) and `release.yml` (packages `cinetic.skill` for each version tag, with notes from the changelog) |
| [`CHANGELOG.md`](CHANGELOG.md) | What each version changed |

The Remotion starter's demo is a 15-second film in seven bars, every act opening on a bar line, built to be replaced: "plinth cuts" and "to music." build around an accent dot that lands as the line's full stop, the line launches left into a picture slot (a stand-in drawn in code until the film's own picture goes in, or the shot is rebuilt without one), the picture contracts into the gap of "Cuts land.", and the mark lands as a relief under a turning key before the name rises whole through its slot. Its `audio/score.json` plays the track you add (`audio/music/README.md`).

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

cinetic met more of the written expectations in every round and won every house-style comparison. The neutral judge was split, and its craft notes became rules: in round 7 it credited the baselines' warmer, richer pictures while preferring cinetic's ideas and product story. Version 1.5 answers that note with a plain script shown one line at a time, film templates, the product's screens built in code in a lit place with depth, music on every film, and gates that fail a flat or frozen film; 1.1.0 and 1.5.0 have not had a judged round of their own yet. A cinetic run costs about three times the time and tokens of the baseline (round 7 average: 95 vs 33 minutes, 626k vs 231k tokens). The method and the full results are in [docs/evaluation.md](docs/evaluation.md).

## Origin

The process was first worked out while making Tessel, a 33-second launch film built in code ([source and film](https://github.com/Leonxlnx/claude-launchvideo)). Its [worked example](skills/cinetic/references/worked-example.md) ships with the skill.

## Contributing

Issues and pull requests are welcome. Before you open a PR, run the regression tests (they need Node 22.18+ and Python 3 with numpy, scipy, soundfile, pyloudnorm and librosa; the tests that load the starter's TypeScript, such as grid-check, the primitives and the type and kit tests, need `npm install` in `skills/cinetic/assets/remotion-starter`):

```bash
node skills/cinetic/scripts/test/tokens.test.mjs
node skills/cinetic/scripts/test/mirror.test.mjs
node skills/cinetic/scripts/test/lint-film.test.mjs --part static
node skills/cinetic/scripts/test/grid-check.test.mjs
node skills/cinetic/scripts/test/scripts-docs.test.mjs
node skills/cinetic/scripts/test/add-font.test.mjs
node skills/cinetic/scripts/test/provenance.test.mjs
node skills/cinetic/scripts/test/assets.test.mjs
node skills/cinetic/scripts/test/logos.test.mjs
node skills/cinetic/scripts/test/logo-kit.test.mjs
node skills/cinetic/scripts/test/music.test.mjs
node skills/cinetic/scripts/test/primitives.test.mjs
node skills/cinetic/scripts/test/continuity.test.mjs
node skills/cinetic/scripts/test/handoff.test.mjs
node skills/cinetic/scripts/test/transitions.test.mjs
node skills/cinetic/scripts/test/depth-light.test.mjs
node skills/cinetic/scripts/test/kit-dense.test.mjs
node skills/cinetic/scripts/test/moment.test.mjs
node skills/cinetic/scripts/test/wordmark.test.mjs
node skills/cinetic/scripts/test/type-presets.test.mjs
node skills/cinetic/scripts/test/type-moves.test.mjs
node skills/cinetic/scripts/test/type-family.test.mjs
python3 skills/cinetic/scripts/test/copy-check.test.py
python3 skills/cinetic/scripts/test/pick.test.py
python3 skills/cinetic/scripts/test/deck.test.py
python3 skills/cinetic/scripts/test/brand.test.py
python3 skills/cinetic/scripts/test/like.test.py
python3 skills/cinetic/scripts/test/track.test.py
python3 skills/cinetic/scripts/test/score.test.py
python3 skills/cinetic/scripts/test/cast.test.py
python3 skills/cinetic/scripts/test/library.test.py
python3 skills/cinetic/scripts/test/render-parts.test.py
python3 skills/cinetic/scripts/test/encode-tags.test.py   # runs its encodes when ffmpeg is on PATH
python3 skills/cinetic/scripts/test/bash32.test.py
```

CI runs all of these but the slow `cast.test.py` (provenance in release mode; lint-film, pick, deck, brand, like, assets, logos, music, copy-check, library and track; tokens, mirror and grid-check; the starter's primitive, continuity, handoff, transitions, depth and light, kit, moment, wordmark, logo-kit and type tests; type-family, score, scripts-docs, add-font, render-parts, bash32 and encode-tags), plus the forensics self-test, with the Remotion starter installed and type-checked, and also checks the SKILL.md frontmatter, the JSON and plugin manifests, that the skills CLI discovers the skill, Python, Node and shell syntax, and that no audio or video with sound is tracked by git. The shell scripts are also parsed with bash 3.2 (macOS's `/bin/bash`), in a container and on a macOS runner, which also runs the encode-tags test on a current ffmpeg. Bash 3.2 cannot parse a heredoc inside `$( )`: put such a heredoc in a shell function (`bash32.test.py` finds them). A change to a lint or text-flow rule needs a fixture in `skills/cinetic/scripts/test/lint-fixtures/`, and a change to a timeline check one in `grid-fixtures/`, that declares what it must produce. A change to the library goes into `techniques.json`; regenerate the readable pages with `python3 skills/cinetic/scripts/pick.py --write-docs skills/cinetic/references` (the index and each family's file in `references/library/`; `--markdown`, with `--family <name>` for one family, prints them); `pick.test.py` checks that they match.

## License

[MIT](LICENSE), copyright (c) 2026 Leonxlnx.
