<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-dark.svg">
    <img src="docs/brand/lockup-light.svg" alt="cinetic" width="340">
  </picture>
</h1>

<p align="center">Launch films, update videos and motion design from code, directed by your coding agent.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f2328" alt="License: MIT"></a>
  <a href="#install"><img src="https://img.shields.io/badge/npx%20skills%20add-Leonxlnx%2Fcinetic-1f2328" alt="npx skills add Leonxlnx/cinetic"></a>
  <a href="https://github.com/Leonxlnx/cinetic/releases/latest"><img src="https://img.shields.io/github/v/release/Leonxlnx/cinetic?color=1f2328" alt="Latest release"></a>
</p>

<!-- EXAMPLE (hero), for the owner to fill: a GIF excerpt of an approved cinetic 2 film linking to its MP4 on the media branch. No media is committed to this branch. -->

cinetic (cinema + kinetic) is an agent skill that makes your coding agent direct a short film instead of arranging animation components: launch films, feature and update videos, teasers, social clips and UI walkthroughs, built in Remotion.

**cinetic 2** is a rework around one idea: the gap between a template video and a launch film by a top studio is direction, not effects. The skill now gives the agent a director's method and a kit that looks premium by default, and gets out of its way.

- **A director's method.** A new idea every 1-2 seconds; one world per film; nothing is ever just cut away (the full stop grows into the next scene, the button becomes the progress bar, the camera dives into a tile and its inside is the next shot); front-loaded motion that is never linear and never dead still; type as an event; the real product, really used.
- **Motion references organised by what moves.** Text, big entrances, exits, mid-turns and transitions, camera, cards and UI, imagery, extra effects, sound design, film grammar, ten graphic worlds and a taste guide with the tells of AI-made video and a scoring rubric: every recipe with numbers at 30 fps and code against the kit.
- **A Remotion kit that looks premium by default.** Kinetic type (masked rise, born-tint, cut-on words on the beat, swaps, typing at a human pace, decode, rolling odometers), a 3D camera with log-space zooms, solid 3D blocks with type on their faces, depth ladders, product UI (cards, windows, chat, input bars, terminals, toasts) driven by a real arrow pointer, turns (iris, tiles, mosaic, push, zoom-through, flash), imagery (one grade for every picture, duotone develop, letters as windows, before/after).
- **Real marks, real icons.** Company logos in their own colours from Simple Icons or, for marks Simple Icons cannot carry, in their newest official form through `logos.mjs`, with source and licence recorded. Interface icons from Lucide.
- **Real, licensed sound.** A judged catalogue of recorded effects that land on their transient (or, for whooshes and swells, their peak) on the exact frame, and a measured shortlist of licensed music tracks with tempo and the second each one gets going. Breath gaps before the hit, music that rings out under the end card.
- **A fast look-fix loop.** `frames.mjs sheet` renders a whole film as 16 frozen frames in one still; `strip` shows any moment of a preview at 15 frames a second. The agent reads both and fixes the three worst things before the final.

## Quick start

```bash
npx skills add Leonxlnx/cinetic
```

Then ask your agent for a film: "Make a 30-second launch film for our database branching tool. It works with GitHub and Vercel. Invent the brand."

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
npx skills add Leonxlnx/cinetic#v2.0.0
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

- **Node 22+** and **ffmpeg 6+** (with ffprobe). That is all: no Python, no extra audio tools.
- **Chromium.** Remotion downloads its own headless shell on the first render.
- **A Remotion licence if you need one.** cinetic is MIT; Remotion has its own licence (free for individuals and companies of up to 3 people).
- Network access to fetch sounds, music and logos while a film is made; rendering works offline.

Rendering is heavy. The skill renders half-size previews while it iterates and the full-size master once. On machines whose GPU is unstable under rendering, set `CINETIC_GL=swangle` to render on the CPU.

## How a film is made

1. `new-film.mjs` scaffolds a Remotion project with the kit.
2. The agent writes `BRIEF.md` (what the product does as input -> output, the features, the brand) and `BEATS.md` (one row per beat: what is seen, what moves, how it hands off to the next beat, the sound).
3. It picks one world, builds the film section by section on one timeline, and looks at a 16-frame sheet after each section.
4. It fetches licensed sounds and a music track and places them on the same frames as the picture.
5. It scores a preview with the rubric, fixes the worst three things, renders the master and writes `CREDITS.md`.

## What's inside

```
skills/cinetic/
  SKILL.md                 the director's method and the default path
  references/              film-grammar, worlds, taste, sound-design, kit, assets, rendering,
                           motion/ text, entrances, exits, turns, camera, cards-ui, imagery, effects
  kit/                     the Remotion project every film starts from
    src/kit/               motion, type, camera, world, ui, turns, imagery, sound, icons, fonts
    src/films/             worked examples (light product UI; an isometric block world; editorial imagery)
    scripts/               new-film, frames (sheet, still, render, join, strip), sfx (effects and music),
                           logos (official marks), the sound catalogue and the music shortlist
```

## Credits

- Sound effects: [Mixkit](https://mixkit.co/free-sound-effects/) (Mixkit Sound Effects Free License). Music shortlist: [Mixkit](https://mixkit.co/free-stock-music/) (Mixkit Stock Music Free License) and [Kevin MacLeod / incompetech.com](https://incompetech.com) (CC BY 4.0, credit required). No audio is stored in this repository; films fetch the files they use.
- Marks: [Simple Icons](https://simpleicons.org) (CC0; the marks are trademarks of their owners). Interface icons: [Lucide](https://lucide.dev) (ISC).
- Fonts: Inter, Geist, Geist Mono, Instrument Serif (SIL Open Font License), through Fontsource.

## Contributing

Issues and pull requests are welcome. Before you open one:

```bash
cd skills/cinetic/kit && npm ci && npx tsc --noEmit
```

CI type-checks the kit and every example film, checks script syntax, the catalogues, that a scaffolded film type-checks, that every reference link resolves, the SKILL.md frontmatter, the plugin manifests, that the skills CLI discovers the skill, and that no audio or video is tracked by git.

## License

[MIT](LICENSE), copyright (c) 2026 Leonxlnx.
