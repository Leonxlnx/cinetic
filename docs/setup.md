# Setup

This page covers installing cinetic, preparing the machine it renders on, making a first test render from the starter, what render times to expect, and fixes for known problems.

cinetic is a skill: a folder (`SKILL.md`, `references/`, `scripts/`, `assets/`) that your coding agent reads and runs. The agent does the directing. The machine needs Node, ffmpeg, Python and a headless Chromium so the agent's commands can run.

**Contents**

1. [Install the skill](#1-install-the-skill)
2. [Requirements](#2-requirements)
3. [Browser setup](#3-browser-setup)
4. [A first test render](#4-a-first-test-render)
5. [Render times and `--budget`](#5-render-times-and---budget)
6. [Troubleshooting](#6-troubleshooting)

**Short version**, for Claude Code on macOS (on Linux, replace the first line with the [apt steps](#ubuntu-and-debian-apt) and use your Python 3.11 or newer where it says `python3.12`):

```bash
brew install node ffmpeg python@3.12
python3.12 -m venv ~/.venvs/cinetic && source ~/.venvs/cinetic/bin/activate
pip install numpy scipy soundfile pyloudnorm opencv-python librosa fonttools brotli uharfbuzz pillow
npx skills add Leonxlnx/cinetic -g -a claude-code -y
```

Keep the virtual environment on the agent's `PATH` ([Python packages](#python-packages)), then run the [test render in section 4](#4-a-first-test-render).

---

## 1. Install the skill

Pick one of three routes: the skills CLI, the Claude Code plugin, or a manual copy. The skills CLI and a manual copy put a `cinetic/` folder in your agent's skills directory. The plugin installs into Claude Code's plugin cache and is named `cinetic:cinetic`. Use one route per agent. Claude Code loads a plugin skill and a skills-folder skill side by side, so installing both gives you two copies.

### skills CLI (Claude Code and other agents)

The skills CLI runs through `npx`, so install Node first; cinetic itself needs Node 22 or newer ([Requirements](#2-requirements)).

```bash
npx skills add Leonxlnx/cinetic
```

The repository holds one skill, so the CLI selects it without asking. It still asks which agents, which scope and, for several agents, symlink or copy; `-a`, `-g` and `-y` answer these up front. Common forms:

```bash
npx skills add Leonxlnx/cinetic -g -a claude-code -y   # global, Claude Code only, no prompts
npx skills add Leonxlnx/cinetic#v1.1.0                 # pin to the v1.1.0 tag
npx skills add Leonxlnx/cinetic --list                 # show what would be installed, install nothing
```

| Flag | Effect |
|---|---|
| `-g`, `--global` | install for your user instead of the current project |
| `-a`, `--agent <ids>` | install for these agents (space-separated); `'*'` means all |
| `-y`, `--yes` | skip confirmation prompts |
| `--copy` | copy files into each agent folder instead of symlinking |
| `-l`, `--list` | list the skills in the repository without installing |

For Claude Code the skill lands in:

| Scope | Path |
|---|---|
| Project (default) | `./.claude/skills/cinetic/` |
| Global (`-g`) | `~/.claude/skills/cinetic/` (or `$CLAUDE_CONFIG_DIR/skills/cinetic/` when that is set) |

Update or remove it with the same CLI:

```bash
npx skills update cinetic        # checks project and global installs; -g or -p limits it to one
npx skills remove cinetic        # add -g for a global install
npx skills ls -g                   # list global installs (without -g: this project)
```

`update` keeps a pinned install on its tag. To move to a newer tag, run `npx skills add` again with that tag.

#### Other agents (`-a`)

```bash
npx skills add Leonxlnx/cinetic -a codex
npx skills add Leonxlnx/cinetic -a cursor opencode -g
```

| Agent | `-a` id | Project install | Global install (`-g`) |
|---|---|---|---|
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `codex` | `.agents/skills/` | `~/.agents/skills/` |
| Cursor | `cursor` | `.agents/skills/` | `~/.agents/skills/` |
| OpenCode | `opencode` | `.agents/skills/` | `~/.agents/skills/` |
| Gemini CLI | `gemini-cli` | `.agents/skills/` | `~/.agents/skills/` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `~/.agents/skills/` |

These ids and paths are what skills CLI v1.7.0 does. The full agent list is the Supported Agents table in the [skills CLI README](https://github.com/vercel-labs/skills#supported-agents); that table shows each agent's own global folder, but a global install for an agent that reads `.agents/skills/` goes to `~/.agents/skills/`.

When you install for several agents at once, the CLI keeps one copy in `.agents/skills/cinetic/` (`~/.agents/skills/cinetic/` with `-g`). Codex, Cursor, OpenCode, Gemini CLI and GitHub Copilot read that folder directly, and Claude Code gets a symlink to it in `.claude/skills/cinetic/`; `--copy` gives Claude Code its own copy instead. A single-agent install is a plain copy. The skill needs an agent that can run shell commands, because every step runs a script.

### Claude Code plugin

Inside Claude Code:

```text
/plugin marketplace add Leonxlnx/cinetic
/plugin install cinetic@cinetic
```

From a terminal, the same two steps are `claude plugin marketplace add Leonxlnx/cinetic` and `claude plugin install cinetic@cinetic`.

Claude Code then loads the skill whenever a request matches its description ("make a video about X", "animate this feature", "we need a launch clip"). You can also call it by name with `/cinetic:cinetic`.

| Task | Command |
|---|---|
| Update | `/plugin marketplace update cinetic`, then `/plugin` > Installed > cinetic > Update now. From a shell: `claude plugin marketplace update cinetic && claude plugin update cinetic@cinetic`. The new version loads after `/reload-plugins` or in a new session. |
| Remove | `/plugin uninstall cinetic@cinetic` |

Auto-update is off by default for third-party marketplaces. Run the update after each release, or turn it on in `/plugin` > Marketplaces > cinetic > Enable auto-update.

### Manual copy

Each GitHub Release carries `cinetic.skill`, a zip archive whose top folder is `cinetic/`:

```bash
curl -L -o cinetic.skill https://github.com/Leonxlnx/cinetic/releases/latest/download/cinetic.skill
mkdir -p ~/.claude/skills
unzip cinetic.skill -d ~/.claude/skills/          # creates ~/.claude/skills/cinetic/
```

To pin a version, download it from its tag instead: `https://github.com/Leonxlnx/cinetic/releases/download/v1.1.0/cinetic.skill`.

Or copy the folder from a clone:

```bash
git clone --depth 1 https://github.com/Leonxlnx/cinetic.git
mkdir -p ~/.claude/skills
cp -R cinetic/skills/cinetic ~/.claude/skills/  # creates ~/.claude/skills/cinetic/
```

For a single project, use `<project>/.claude/skills/cinetic/` instead. Check the result with `ls ~/.claude/skills/cinetic/SKILL.md`. The scripts are always run through `bash`, `node` or `python3`, so they work without the executable bit.

To update, delete the old folder first and repeat the steps: `rm -rf ~/.claude/skills/cinetic` (or the project path), then unzip or copy again. Unzipping over an existing folder stops at a "replace?" prompt, and both `unzip` and `cp -R` keep files that the new version removed. To remove the skill, delete the folder.

---

## 2. Requirements

| Tool | Version | Used for |
|---|---|---|
| Node.js | 22 or newer | Remotion 4.0.529, the starters, the TypeScript scripts (`tsx`), `add-font.mjs`, the HyperFrames CLI through `npx` |
| ffmpeg and ffprobe | 6 or newer, built with libx264 | muxing the soundtrack, the blurred master's encode (`accumulate.py`), the HyperFrames encode (`hf-finish.sh`), probing and QA decoding |
| Python | 3.11 or newer | sound (`score.py`, `master.py`), motion blur (`measure-speed.py`, `accumulate.py`), every QA gate |
| Chromium headless shell | any recent build | rendering frames; Remotion downloads its own unless you point it at one ([section 3](#3-browser-setup)) |
| bash | 3.2 or newer (macOS's built-in bash works) | every `.sh` script |
| Network | when scaffolding a film, and each time you add a font | `npm install` in each new film (unless `--link-modules`), `npm pack` in `add-font.mjs`, the first `npx -y hyperframes@0.8.79` run, Remotion's first browser download; renders themselves run offline |

Remotion bundles an ffmpeg of its own for its internal encodes, but `render.sh`, `accumulate.py`, `hf-finish.sh` and the QA scripts call `ffmpeg` and `ffprobe` from your `PATH`.

The scripts are bash and were developed and tested on Linux (CI runs on Ubuntu). They avoid GNU-only tools and bash 4 features so that they also run on macOS with its built-in bash 3.2, but macOS is less tested; please report anything that breaks. On Windows, WSL2 with the Ubuntu steps below is the likely route; it has not been tested.

### macOS (Homebrew)

```bash
brew install node@22 ffmpeg python@3.12
echo 'export PATH="$(brew --prefix node@22)/bin:$PATH"' >> ~/.zshrc   # node@22 is keg-only
exec zsh
node --version && ffmpeg -version | head -1 && python3.12 --version
```

`brew install node` works as well: any current Node release is 22 or newer. Homebrew's `ffmpeg` includes libx264.


### Ubuntu and Debian (apt)

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg python3 python3-venv python3-pip curl ca-certificates unzip
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version && ffmpeg -version | head -1 && python3 --version
```

- **Node.** Ubuntu 22.04 and 24.04 and Debian 12 and 13 ship a `nodejs` older than 22 (check yours with `apt-cache policy nodejs`), so the lines above use the NodeSource repository. `nvm install 22` is an alternative.
- **ffmpeg.** Ubuntu 24.04 and Debian 13 ship ffmpeg 6 or newer. Ubuntu 22.04 (4.4) and Debian 12 (5.1) are too old: use a static build linked from [ffmpeg.org/download.html](https://ffmpeg.org/download.html) that includes libx264, and put it first on your `PATH`.
- **Python.** Ubuntu 22.04 ships Python 3.10, which is too old. Install 3.11 or newer (for example `python3.12` and `python3.12-venv` from the deadsnakes PPA) and create the environment below with that interpreter: `python3.12 -m venv ~/.venvs/cinetic`.

### Python packages

Create one virtual environment for cinetic and install everything with a single line:

```bash
python3 -m venv ~/.venvs/cinetic            # macOS with Homebrew: python3.12 -m venv ~/.venvs/cinetic
source ~/.venvs/cinetic/bin/activate
pip install numpy scipy soundfile pyloudnorm opencv-python librosa fonttools brotli uharfbuzz pillow
python3 -c "import numpy, scipy, soundfile, pyloudnorm, cv2, librosa, fontTools, brotli, uharfbuzz, PIL; print('ok')"
```

| Packages | Needed by |
|---|---|
| `numpy`, `scipy`, `soundfile`, `pyloudnorm` | the score, mix and master (`scripts/audio/`), `check-sync.py`, `av-audit.py` |
| `opencv-python` | `measure-speed.py`, `accumulate.py`, `forensics.py`, `sheet.py`, `av-audit.py`, `brand-kit.sh`, `palette.py` (accent coverage on a still) |
| `librosa` | `av-audit.py` |
| `fonttools`, `brotli`, `uharfbuzz` | outlined lettering: `outline-text.py` and the SVG lockups in `brand-kit.sh` |
| `pillow` | `dither-gradient.py` (banding-free gradient PNGs) |

The npm scripts and shell scripts call plain `python3`, and many agents open a fresh shell for each command. Either activate the environment in the terminal before you start the agent, or put it first on your `PATH` in your shell profile:

```bash
echo 'export PATH="$HOME/.venvs/cinetic/bin:$PATH"' >> ~/.zshrc    # or ~/.bashrc
```

A venv also avoids the `externally-managed-environment` error that recent Debian, Ubuntu and Homebrew Pythons raise on a global `pip install`.

### Fonts

Nothing is installed system-wide. Each film vendors its typefaces from npm `@fontsource-variable/*` packages, with `--font <name>` on `new-film.sh` or `node scripts/add-font.mjs <name>` inside the project (both need the network), so a render never fetches a font. A brand's own `.ttf` or `.otf`, and the route for offline machines, are in [`references/copy-and-type.md` §6](../skills/cinetic/references/copy-and-type.md#6-one-family-chosen-for-the-brand).

---

## 3. Browser setup

Remotion renders frames in a Chromium headless shell. The starter's `remotion.config.ts` chooses the browser in this order, first match wins:

1. `REMOTION_BROWSER` in the environment;
2. `CHROMIUM_PATH` in the environment;
3. a path baked in at scaffold time by `new-film.sh --browser <path>` (the `PINNED_BROWSER` constant; `new-film.sh` also bakes in `CHROMIUM_PATH` when it is set while scaffolding);
4. the newest headless shell under `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`, where some sandboxes and CI images keep one;
5. otherwise nothing is set, and Remotion downloads its own Chrome Headless Shell into `node_modules/.remotion/` on the first render.

**Option A: let Remotion download it.** Nothing to do. To fetch it ahead of time (before going offline, or to see the download succeed), run this in a film project:

```bash
npx remotion browser ensure
```

**Option B: use a local headless shell.** Useful when the download is blocked, or to share one browser across projects:

```bash
npx @puppeteer/browsers install chrome-headless-shell@stable   # prints the executable's path
export REMOTION_BROWSER=/path/to/chrome-headless-shell
```

Point the variable at a headless shell or a Chromium build. Current desktop Chrome builds no longer include the old headless mode that a headless shell provides, so a regular Chrome install is not a dependable substitute. The environment variable wins over a baked-in path, so one export changes the browser for every film. Restart a running Studio after changing the browser or `remotion.config.ts`.

**Linux libraries.** A downloaded shell needs a few shared libraries. If it fails with `error while loading shared libraries`, install the set Remotion documents for Linux (Ubuntu 24.04 names; on older releases use `libasound2`):

```bash
sudo apt-get install -y libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2t64 libxrandr2 \
  libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2
```

The config also sets the ANGLE GL backend (WebGL works headless), JPEG q95 intermediates, BT.709 color and a 120 s `delayRender` timeout. Keep those settings; the render scripts rely on them.

**HyperFrames** has its own variable: `HYPERFRAMES_BROWSER_PATH` (alias `PRODUCER_HEADLESS_SHELL_PATH`). When it is unset, `hf-finish.sh` tries `CHROMIUM_PATH`, then `REMOTION_BROWSER`, then the `/opt/pw-browsers` shell, and otherwise HyperFrames downloads its own. Setting `CHROMIUM_PATH` once covers both engines' render scripts: `render.sh` and every `npx remotion` command through `remotion.config.ts`, and `hf-finish.sh` (`npm run cues`, `npm run render` and `npm run render:preview` in a HyperFrames project). Commands that call the HyperFrames CLI directly (`npm run preview`, `npm run check`, `npm run snapshot`, `doctor`) read only `HYPERFRAMES_BROWSER_PATH`, so export that as well when you use them.

---

## 4. A first test render

This renders the starter's 9-second placeholder demo end to end: scaffold, gates, cues, a synthesized soundtrack, a preview and a motion-blurred master. It proves the machine is ready before an agent spends an hour on a film. After `npm install`, the gates, cues, soundtrack and preview take a little over a minute, and the blurred master about four and a half more. The timings in the comments were measured on a 4-CPU Linux machine.

Set `SKILL` to the folder that holds the installed `SKILL.md`. Use an absolute path, because the steps below change directory:

| Installed with | `SKILL=` |
|---|---|
| skills CLI or manual copy, Claude Code, global | `$HOME/.claude/skills/cinetic` |
| skills CLI or manual copy, Claude Code, project | `$PWD/.claude/skills/cinetic` (run from the project root) |
| skills CLI, Codex, Cursor, OpenCode and the other `.agents` agents | `$HOME/.agents/skills/cinetic` (global) or `$PWD/.agents/skills/cinetic` (project) |
| Claude Code plugin | `$HOME/.claude/plugins/cache/cinetic/cinetic/1.1.0/skills/cinetic` (the next-to-last folder is the installed version) |
| a clone of this repository | `$PWD/skills/cinetic` (run from the clone's root) |

```bash
SKILL="$HOME/.claude/skills/cinetic"
bash "$SKILL/scripts/new-film.sh" films/first-film --fps 60 --bpm 120 --size 1920x1080
cd films/first-film
```

`new-film.sh` copies the starter, sets the grid, copies every cinetic script into `films/first-film/scripts/` and runs `npm install` (the slowest step, network-bound). From here on everything runs from the project folder. Its flags, from `--help`:

| Flag | Default | Effect |
|---|---|---|
| `<dir>` | (required) | target folder; must be empty unless `--force` |
| `--engine remotion\|hyperframes` | `remotion` | which starter to copy |
| `--fps N` | `60` | frame rate |
| `--bpm N` | `120` | tempo; one beat must be a whole number of frames (at 60 fps: 90 → 40 f, 100 → 36, 120 → 30, 144 → 25, 150 → 24) |
| `--size WxH` | `1920x1080` | frame size, even in both dimensions (`1080x1920` for 9:16, `1080x1080` for 1:1) |
| `--name NAME` | the folder name | project and package name |
| `--font NAME` | none | vendor a `@fontsource-variable/*` family (repeatable) |
| `--browser PATH` | `$CHROMIUM_PATH` | bake a headless-shell path into `remotion.config.ts` |
| `--link-modules DIR` | none | symlink an existing `node_modules` instead of running `npm install` |
| `--no-install` | off | skip `npm install` |
| `--force` | off | allow a non-empty `<dir>` |

Now run the gates and build the sound:

```bash
npm run check    # 3 s. Fails on purpose: "lint-film: 24 files, 5 errors, 0 warnings -> FAIL"
npm run cues     # 1 s. "wrote out/cues.json: 20 events (...), 16 cues, 9.00 s at 60 fps, 120 BPM"
npm run audio    # 6 s. "PASS  public/audio/soundtrack.wav  9.0s  -14.0 LUFS  TP -2.27 dBTP ..."
```

- `npm run check` runs `tsc`, `lint-film.mjs` and `grid-check.ts`. On the starter the lint fails with `placeholder` errors: the palette, typeface, mark and name are stand-ins, and no film may ship on them. Replacing them is the agent's Step 2. `tsc` passing is the part that matters here. Because the lint stops the chain, run the grid check on its own: `npx tsx scripts/grid-check.ts src/timeline.ts` should print `-> pass (0 errors, 0 warnings)`.
- `npm run cues` exports the sync frames from the picture code (`scripts/export-cues.ts`).
- `npm run audio` synthesizes and masters the score (`scripts/audio/score.py`) into `public/audio/soundtrack.wav`, with stems in `out/stems/` and a report in `out/qa/score.json`.

Render a preview, then the motion-blurred master:

```bash
bash scripts/render.sh Film out/preview.mp4 --preview   # about 1 min (same as: npm run render:preview)
bash scripts/render.sh Film out/film.mp4 --blur         # about 4.5 min (same as: npm run render)
```

Both commands take the soundtrack from `public/audio/soundtrack.wav` by default (`--audio FILE` to change it, `--no-audio` for a silent loop) and end with two gates: `check-sync.py` (audio lag at most 48 samples, true peak at most −1 dBTP after decoding) and `probe.py` (size, fps, frame count, yuv420p, BT.709 tags, AAC at 48 kHz). A good run ends with `check-sync PASS`, `probe PASS` and `done: out/preview.mp4 (0.6 MB, 9.000s, preview)`. Exit code 0 means every gate passed.

Other useful commands in the Remotion starter: `npm run studio` (Remotion Studio, with each act as its own composition), `npm run stills` (the mark at 16 px, at full size and across sizes, into `out/stills/`), and `npm run qa` (probe, forensics, A/V audit and a contact sheet of `out/film.mp4`).

If every step behaves as shown above (the lint fails only with placeholder errors and everything else passes), the machine is ready: ask your agent for a film. The skill's workflow scaffolds its own project the same way.

### The same for HyperFrames

Continuing from `films/first-film`, with `SKILL` still set:

```bash
cd ../..                          # back to where you ran the first new-film.sh
bash "$SKILL/scripts/new-film.sh" films/hf-film --engine hyperframes --fps 60 --bpm 120 --size 1920x1080
cd films/hf-film
node scripts/lint-film.mjs .      # fails on purpose until the placeholder palette, font and mark in index.html are replaced
npm run lint                      # HyperFrames' own lint: must show 0 errors
npm run cues && npm run audio
npm run render:preview            # hf-finish.sh --preview -> out/preview.mp4
npm run render                    # hf-finish.sh with the soundtrack -> out/film.mp4
```

`npm install` runs the starter's `setup.mjs`, which copies GSAP and the fonts into the project so renders never touch the network. `npm run preview` opens HyperFrames Studio (port 3002). The HyperFrames starter's 5-second master takes under a minute on 2 workers.

---

## 5. Render times and `--budget`

Rendering is CPU-bound, and motion blur is the expensive part: it renders several sub-frames for every output frame that moves, then averages them.

| Job | Work | Time on 4 CPUs |
|---|---|---|
| Preview of the starter demo (9 s, 1080p60) | 540 frames | about 1 min |
| Blurred master of the starter demo | 540 frames → 1,415 sub-frames (2.6×) | 4.5 min end to end: bundle, sharp pass, speed measurement (about 80 s), sub-frames, accumulation |
| Rule of thumb, 10 s film at 6× | 600 frames → 3,600 sub-frames | about 7 min on simple frames, 10–15 min on dense UI |
| A 33 s launch film at 10× | 1,980 frames → 19,841 sub-frames | about 56 min at concurrency 4 |
| HyperFrames starter master (5 s) | PNG render + one encode | under 1 min on 2 workers; about 2 min with `--blur 4` |

A whole film made by an agent with cinetic takes much longer than its renders. In the [round-5 evaluation](evaluation.md#cost), runs averaged 99 minutes (against 33 for the same agent without the skill), because the agent builds a brand, scores the sound, renders motion blur and runs review rounds.

**Read the estimate.** Before the sub-frame pass, `render.sh --blur` prints the multiple and a time estimate from the sharp pass's measured speed, for example:

```text
render.sh: blur pass: 540 frames -> 1415 sub-frames (2.6x), about 2 min at 0.054 s per sharp frame
```

The estimate covers the sub-frame render and the accumulation. The bundle, the sharp pass and the speed measurement have already run by then.

**Cap it with `--budget`.** `--budget X` limits the blur pass to X times the frame count. The fastest frames get fewer samples and a shorter shutter, and the capped frames are listed. Above 8×, `render.sh` suggests `--budget 6` itself.

```bash
bash scripts/render.sh Film out/film.mp4 --blur --budget 6
```

**Other ways to spend less time:**

- **Iterate on previews.** Review rounds use `--preview`; render the blurred master once, after the last round.
- **Re-render one act.** `--blur --frames A-B` renders one film-frame range (audio from the same range) for a splice, instead of re-blurring the whole film.
- **Reuse the samples for variants.** A 9:16 or 1:1 version with identical timing takes `--samples-from out/samples.json` and skips the sharp pass and the measurement.
- **Skip blur when nothing is fast.** Motion under about 12 px per frame reads clean at 60 fps; render a sharp master (no flag).
- **Redesign too-fast moves.** Moves over about 80 px per frame are flagged as too fast for clean blur. More samples will not fix them; a cut on the beat, a match cut, a mask wipe or a shorter distance will.
- **Tune parallelism.** `--concurrency N` sets Remotion's tabs (default: about half the cores). For sharp renders of GPU-heavy scenes, `bash scripts/render-chunks.sh Film out/film.mp4 4` runs N separate browsers and joins the parts losslessly.
- **Leave `src/` alone while a render runs.** `render.sh` renders from a bundle frozen at its start and warns if the source changed. Stop a render by its own PID, never with a `pkill -f` pattern, which can kill other renders on a shared machine.

`--10bit` encodes a blurred master as 10-bit (High 10) for grading or re-encoding. Ship 8-bit to the web, because many browsers and phones do not decode High 10.

The full pipeline is in [`references/finishing.md`](../skills/cinetic/references/finishing.md).

---

## 6. Troubleshooting

### Install and environment

| Symptom | Cause | Fix |
|---|---|---|
| The agent never uses the skill | installed for a different agent or scope, into the wrong folder, or after the session started | `npx skills ls` and `npx skills ls -g`; check that `SKILL.md` sits directly in `.../skills/cinetic/`; in Claude Code, run `/reload-skills` (skills folder) or `/reload-plugins` (plugin), or start a new session; for the plugin, invoke `/cinetic:cinetic` once |
| The skill is listed twice (`cinetic` and `cinetic:cinetic`) | installed both as a plugin and into a skills folder | keep one route: `/plugin uninstall cinetic@cinetic`, or remove the skills-folder copy (`npx skills remove cinetic`, or delete the folder) |
| `new-film: at 60 fps, 110 BPM gives a beat of 32.727 frames. Pick a BPM with a whole beat: ...` | the beat is not a whole number of frames | use a BPM from the list the message prints |
| `npm run check` fails with `placeholder` errors | by design: the starter's brand is a stand-in | replace the palette, typeface, mark and name ([`references/brand-and-color.md`](../skills/cinetic/references/brand-and-color.md)); this is the agent's Step 2 |
| `error: externally-managed-environment` from `pip` | the system Python refuses global installs | use the virtual environment from [Python packages](#python-packages) |
| `ModuleNotFoundError: No module named 'cv2'` (or `soundfile`, `librosa`) | the shell running the script does not see the venv | activate it before starting the agent, or put `~/.venvs/cinetic/bin` first on `PATH`; rerun the pip line |
| `outline-text.py: ...; pip install fonttools brotli uharfbuzz` (exit 2) | the lettering packages are missing | install them; `brand-kit.sh` needs them for the SVG lockups |
| `render.sh: ffmpeg not found on PATH` (or `ffprobe`, `npx`, `python3`) | a required tool is missing | install it ([Requirements](#2-requirements)) |
| `Unknown encoder 'libx264'` during `--blur` or `hf-finish.sh` | your ffmpeg was built without libx264 (common in minimal or LGPL-only builds) | check with `ffmpeg -hide_banner -encoders \| grep libx264`; install Homebrew's or the distribution's `ffmpeg`, or a static GPL build |
| Fonts or other packages appear in unrelated films | `npm install` ran inside a project whose `node_modules` is a symlink (`--link-modules`) | add fonts with `node scripts/add-font.mjs <name>`; for any other package, give the project its own install (`rm node_modules && npm install`) |

### Browser

| Symptom | Cause | Fix |
|---|---|---|
| The first render hangs or fails while downloading Chrome Headless Shell | the download is blocked (offline, proxy, sandbox) | run `npx remotion browser ensure` where the network works, or set `REMOTION_BROWSER` to a local headless shell ([section 3](#3-browser-setup)) |
| `render.sh: could not list compositions` | the browser did not start, or the project does not compile | run `npx remotion compositions src/index.ts` to see the real error |
| `error while loading shared libraries: libnss3.so` (or similar) | Linux libraries the headless shell needs are missing | install the library list in [section 3](#3-browser-setup) |
| `REMOTION_BROWSER` seems to be ignored | a Studio started before the change, or the path is not an executable | restart the Studio; check with `test -x "$REMOTION_BROWSER" && echo ok` |
| WebGL canvases render blank or very slowly | no GL backend in headless Linux | keep the starter's `Config.setChromiumOpenGlRenderer('angle')`; validate with `--concurrency 1` |

### Fonts and `delayRender`

| Symptom | Cause | Fix |
|---|---|---|
| The render stops with `FontGate: not loaded: 600 16px "X Variable" (is the @fontsource import in brand/fonts.ts?)` | `FACES` in `tokens.ts` names a family or weight whose CSS is not imported in `src/brand/fonts.ts` | vendor the family with `node scripts/add-font.mjs <name>`, which writes the import and `FACES` together; a variable family's CSS name ends in `Variable` |
| A `delayRender()` timeout naming `FontGate: loading fonts` | the font files never finished loading, or the machine is overloaded (cold start, too many tabs) | check that the imported folder under `src/brand/fonts/` exists; lower `--concurrency`; give it more time with `bash scripts/render.sh ... -- --timeout=240000` (milliseconds, passed through to Remotion) |
| Other `delayRender()` timeouts | an image, measurement or other async step did not finish within 120 s | the same: lower concurrency, raise `--timeout`, and render a still of the failing frame (`npx remotion still src/index.ts Film out/f.png --frame=N`) to find it |
| Text renders in a fallback face, or boxes are sized for the wrong font | something measured or rendered before the fonts loaded | wrap everything in `<FontGate>`; measure only under it ([`references/chromium-rendering.md` §12](../skills/cinetic/references/chromium-rendering.md#12-fonts)) |

### Sound

| Symptom | Cause | Fix |
|---|---|---|
| `render.sh: soundtrack public/audio/soundtrack.wav not found` | cues and audio were not built | `npm run cues && npm run audio`; or pass `--build-audio` to rebuild both first; or `--no-audio` for a silent film |
| `render.sh: warning: src/... is newer than public/audio/soundtrack.wav` | the picture changed after the score was made | rerun `npm run cues && npm run audio` before rendering; an old WAV under a retimed picture is the most common sync bug |
| `npm run audio` prints `FAIL` with `integrated ... LUFS not within -14.0+-0.5` | the master missed its loudness target (±0.5 LU) | read `warnings` and `limiter_hot` in `out/qa/score.json`; pull a loud bed down rather than raising the ceiling; a calm brand or a sting of 8 s or less may target −16: set `"master": {"lufs": -16}` in `audio/score.json` (or pass `--lufs -16`), then rerun `npm run audio` |
| `FAIL: true peak ... dBTP above -1.5` | the ceiling was raised, or sounds were added after mastering | restore `"ceiling": 0.77` in `audio/score.json` and rerun `npm run audio`; master a supplied track with `python3 scripts/audio/master.py mix.wav public/audio/soundtrack.wav --lufs -14` |
| `check-sync` fails on true peak after the mux | the AAC encode adds 0.5–1 dB of peak | the same fix as above: keep the 0.77 ceiling so the WAV stays at or under −1.5 dBTP |
| A Python script of your own dies with `Segmentation fault` inside `librosa.onset` or `librosa.util.peak_pick` | a stale numba cache, or a numba build that does not match numpy | `av-audit.py` no longer uses librosa's numba code; for your own scripts, `export NUMBA_CACHE_DIR=$(mktemp -d)` or upgrade numba and numpy together |
| `score.py` warns that typing sits too loud or too bright | keys over a full groove, or a per-key style above 25 characters a second | keep `"typing": "auto"` (it switches fast runs to one blip per word and ducks the music under slower ones), or lower the key weights in `src/sync.ts` |

### Rendering and blur

| Symptom | Cause | Fix |
|---|---|---|
| The blurred master takes far longer than expected | a high sub-frame multiple | read the printed estimate; add `--budget 6`; re-render only the changed act with `--frames A-B`; see [section 5](#5-render-times-and---budget) |
| `render.sh: WARNING: too fast for clean blur at frames ...` | moves over about 80 px per frame | redesign the move (a cut on the beat, a match cut, a mask wipe, a shorter distance) |
| Stepped copies of a moving wordmark in the master | too few samples on its fastest frames | grab them with `bash scripts/grab.sh out/film.mp4 <frame>`; raise the floor for that range with `--floor A-B:N` |
| `--blur needs the sub-frame composition 'XSub'` | a composition without a registered `...Sub` twin | register one in `src/Root.tsx` like `FilmSub`, pass `--sub ID`, or blur a range of `Film` with `--frames A-B` |
| The output shows older code than the source | `src/` was edited while the render ran | render again; `render.sh` warns when this happens |
| On macOS, a `--blur` render stops right after the sharp pass | the system `date` does not support `%N` | run it with GNU coreutils first on `PATH` ([macOS](#macos-homebrew)) |

### HyperFrames

| Symptom | Cause | Fix |
|---|---|---|
| The first `npx -y hyperframes@0.8.79 ...` is slow or fails offline | `npx` downloads the pinned CLI on first use | run `npx -y hyperframes@0.8.79 doctor` once while online; point `HF_CLI` at a local install for `hf-finish.sh` |
| HyperFrames downloads a browser, or `doctor` reports one missing | no browser configured | set `HYPERFRAMES_BROWSER_PATH` to a local headless shell (`CHROMIUM_PATH` reaches only `hf-finish.sh`); `npx -y hyperframes@0.8.79 browser` helps diagnose |
| `setup: missing node_modules/gsap/dist/gsap.min.js` | `npm install` did not run | `npm install` in the project (it runs `setup.mjs`), or `node setup.mjs` after linking `node_modules` |
| `check` reports "0 samples" and looks clean | a lint error disables the layout audit | get `npm run lint` to 0 errors first |
| `hf-finish: ... has transparent pixels` | PNG capture drops the `html`/`body` background, which would encode as black | put the background on a full-bleed `.clip` layer, or pass `--allow-transparent` |
| Extra skills appeared in `~/.claude/skills` | `hyperframes init` installs its vendor's agent skills | start projects with `new-film.sh --engine hyperframes`, not `init`; `hf-finish.sh` sets `HYPERFRAMES_SKIP_SKILLS=1` and turns telemetry off (`HYPERFRAMES_NO_TELEMETRY=1`) |
| Motion over about 18 px per frame shows separate copies after `--blur` | HyperFrames blur is capped at 240 fps (K ≤ 4 at 60 fps) | build fast films in Remotion, whose `render.sh --blur` adds samples with speed |

Still stuck: every script except the internal `brand-svg.ts` helper prints `--help`, and [`references/remotion-engine.md`](../skills/cinetic/references/remotion-engine.md), [`references/hyperframes-engine.md`](../skills/cinetic/references/hyperframes-engine.md), [`references/chromium-rendering.md`](../skills/cinetic/references/chromium-rendering.md) and [`references/finishing.md`](../skills/cinetic/references/finishing.md) cover each engine's traps in more depth. Report a problem at [github.com/Leonxlnx/cinetic/issues](https://github.com/Leonxlnx/cinetic/issues).
