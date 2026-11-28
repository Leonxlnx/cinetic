# Setup

cinetic 2 needs **Node 22+**, **ffmpeg 6+** (with ffprobe) and, on the first render, Remotion's own headless Chromium
(downloaded automatically). Nothing else.

## 1. Install the skill

```bash
npx skills add Leonxlnx/cinetic            # for the agents the skills CLI supports
npx skills add Leonxlnx/cinetic -g -a claude-code -y   # global, Claude Code only
```

### Claude Code plugin

`/plugin marketplace add Leonxlnx/cinetic`, then `/plugin install cinetic@cinetic`. To update, run
`/plugin marketplace update cinetic`, then open `/plugin` > Installed > cinetic > Update now.

## 2. Check the tools

```bash
node --version      # v22 or newer
ffmpeg -version     # 6 or newer, built with libx264
```

macOS: `brew install node ffmpeg`. Ubuntu/Debian: `sudo apt install ffmpeg` and Node 22 from nodesource or nvm.
Windows: `winget install OpenJS.NodeJS.LTS Gyan.FFmpeg`; the scripts are plain Node, so PowerShell, cmd and Git Bash all work.

## 3. A first film to check the machine

```bash
node ~/.claude/skills/cinetic/kit/scripts/new-film.mjs ~/films/probe --name Probe
cd ~/films/probe
node scripts/frames.mjs sheet        # out/main-sheet.png: 36 frames of the blank film
node scripts/frames.mjs render       # out/main-preview.mp4 at half size
```

If the sheet renders, the machine is ready. Ask your agent for a film; it scaffolds its own project the same way.

## 4. Rendering on a weak or unstable GPU

Remotion renders in headless Chromium. If renders crash the display driver, render on the CPU (slower, safe):

```bash
CINETIC_GL=swangle node scripts/frames.mjs render
```

Keep one render at a time, previews at half size (the default), and split long finals into parts:

```bash
node scripts/frames.mjs render --final --muted --range 0-449   --out out/part-a.mp4
node scripts/frames.mjs render --final --muted --range 450-899 --out out/part-b.mp4
node scripts/frames.mjs audio                     # out/audio.wav
node scripts/frames.mjs mux out/part-a.mp4 out/part-b.mp4 --audio out/audio.wav --out out/main.mp4
```

`CINETIC_CONCURRENCY` (default 2) sets how many frames render in parallel.

## 5. Sound, music and logos

They are fetched per film into `public/` and never committed:

```bash
node scripts/sfx.mjs roles                 # the judged sound effects by role
node scripts/sfx.mjs get mixkit-3124 ...   # into public/sfx, typed index in src/sfx.ts
node scripts/sfx.mjs shortlist --mood "<the film's world in words>"
node scripts/sfx.mjs music <shortlist id>  # the bed, with its licence record
node scripts/logos.mjs get openai --film . # an official mark Simple Icons cannot carry
node scripts/sfx.mjs credits > CREDITS.md
```

The music shortlist (`kit/scripts/music-shortlist.json`) lists licensed tracks with their tempo, length and the second
each one gets going.

## 6. Remotion licence

cinetic is MIT. Remotion, its engine, is free for individuals and companies of up to 3 people; larger companies need a
Remotion company licence (https://www.remotion.dev/license).
