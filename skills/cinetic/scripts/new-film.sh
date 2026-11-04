#!/usr/bin/env bash
# new-film.sh: start a film project from the cinetic starter.
#
# Copies assets/remotion-starter (or assets/hyperframes-starter) into <dir>, sets the frame rate,
# tempo, pace, size and name, copies every cinetic script into <dir>/scripts so the project runs on
# its own, then installs dependencies (or symlinks an existing node_modules with --link-modules) and
# deals the type pairing from the name (scripts/type-deal.ts). The work runs in scripts/new-film.mjs,
# one node process per stage, so a scaffold takes seconds even on a busy laptop.
#
# Usage:
#   bash scripts/new-film.sh <dir> [--engine remotion|hyperframes] [--fps 30] [--bpm N]
#                            [--pace calm|crisp] [--type calm|bold] [--size 1920x1080] [--name "Product"] [--mood m]
#                            [--link-modules <node_modules>]
#                            [--font <name>]... [--browser <chromium path>] [--no-install] [--force]
#                            [--format launch|update] [--template <name>] [--brand <kit folder or file>]... [--like <clip>]
#                            [--music <track file> --title T --artist A --source S --page URL --licence L
#                             --seen-quote Q --seen-url URL --ai-generated no --vocals no [--credit C]
#                             [--file-url URL] [--content-id X] [--certificate C] [--modifications M]
#                             [--profile calm|crisp|punchy] | --music <file> --record <licence.json>]
#
#   --fps, --bpm   30 fps by default (half the frames of 60 to render; keep sharp moves under about
#                  25 px a frame at 1080p, or render the master with --blur); --fps 60 for a film of
#                  fast camera travel or scrolling UI. One beat must be a whole number of frames
#                  (60*fps/bpm). At 30 fps: 90 -> 20 f, 100 -> 18, 120 -> 15, 150 -> 12; at 60 fps
#                  90 -> 40 f, 100 -> 36, 120 -> 30, 144 -> 25, 150 -> 24. Without --bpm the
#                  starter keeps its own 120 BPM, a placeholder until track.py grid writes the
#                  track's grid; at an fps where 120 gives no whole beat (25 fps) the nearest tempo
#                  that does (125). A bpm in audio/score.json follows it.
#   --pace         calm (default): the script's lines arrive one at a time with reading holds of
#                  about 1-1.5 s between picture beats; crisp: the denser launch-film tempo. Sets
#                  PACE_NAME (src/timeline.ts, or motion.js), which the components, grid-check
#                  and lint-film read.
#   --type         the type family (lib/look.ts TYPE_LOOK): calm, the starter's (small airy sentence lines at the
#                  face's own letter fit), or bold (big semibold lines, tracking tightening with size). Default: the
#                  template's type_family (template.json), else calm. scripts/type-family.mjs writes TYPE_FAMILY, the
#                  six roles of TYPE and the FACES weights into src/brand/tokens.ts; run it later to switch.
#                  Remotion only.
#   --size         WxH, e.g. 1920x1080, 1080x1920 (9:16), 1080x1080. The demo lays out from the short side.
#   --name         the product's name as it is written: the package name, and in a template the name slot
#                  (src/brand/identity.ts, which deals the film and sets its name), with or without --brand.
#                  Give it here: it is written first, so the type pairing and the template's deal follow it
#                  (without it they follow the folder's name).
#   --mood         the type pairing's mood (type-deal.ts --mood: calm, technical, friendly, editorial, bold,
#                  consumer, finance, creative, ai). Without --brand the pairing is dealt from the name and
#                  written into src/brand/tokens.ts; npx tsx scripts/type-deal.ts --pair <id> changes it.
#   --engine      remotion (default): sets FPS/BPM/W/H in src/timeline.ts. hyperframes: sets them in
#                  motion.js and rewrites index.html's root data-fps/-width/-height/-duration (TOTAL/FPS),
#                  viewport and html/body size to match. Either way the starter's brand (palette,
#                  typeface, mark, name) is marked cinetic:placeholder and lint-film.mjs fails
#                  until it is replaced.
#   --link-modules link this node_modules instead of running npm install (offline sandboxes): a
#                  symlink, or on Windows (Git Bash, MSYS2, Cygwin) a directory junction, because
#                  ln -s there copies the whole folder unless Windows symlinks are enabled.
#   --font         vendor a @fontsource-variable/<name> family into the project (scripts/add-font.mjs:
#                  npm pack into a temp folder, never an install into a shared node_modules) and set
#                  FONT/FACES to it. Repeat for a mono. Later, run `node scripts/add-font.mjs <name>`.
#   --browser      bake a Chromium/headless-shell path into remotion.config.ts (env REMOTION_BROWSER
#                  or CHROMIUM_PATH at render time also works, and wins).
#   --force        allow a non-empty <dir> (starter files overwrite same-named files).
#   --format       launch (default, the main case, 15-45 s): the launch-simple template (a line alone in the
#                  middle of a clean ground, the product acting, the next line, the product again, the centred
#                  lockup built from the last picture; the agent writes src/launch.ts and src/product.tsx, the
#                  timeline fits every beat to the track; --template none keeps the starter's own acts; the
#                  HyperFrames starter has no template) or update: a 15-23 s
#                  "vX is out" film laid over the starter from assets/templates/update (src/update.ts holds
#                  the version and 2-4 changes; a hook on the version, one act per change shown as a product
#                  moment, the payoff, the end card with the version). update defaults to --pace crisp and
#                  the template's 120 BPM. Remotion only. The same as --template update.
#   --template     a film template from assets/templates/<name> laid over the starter: its timeline, acts,
#                  film and sound (template.json lists the files it copies and the starter files it removes;
#                  its pace and tempo become the defaults). launch-simple (the default launch: a line, a
#                  picture, a line, a picture, the lockup), none (the starter's own acts), update (a "vX is out"
#                  film), ui-walkthrough (a
#                  product's flow in steps: the promise, the input becoming the output, proof, a claim, then
#                  input -> the product reads -> insight -> choice -> output, the end card), capability-reel
#                  (a launch close: a ring of sources, one real record, a statement, a capability ticker, the
#                  big claim on the accent, a transition out of its full stop, the end card), camera-teaser (a
#                  dark teaser where the camera is the animator: one layout per shot under camPath, whips with a
#                  flash frame, a launch, code streaming, cards fanning, a modal, the stages, comets onto the
#                  mark), prompt-run (a
#                  request in, the work in steps, the result out: a pill among the tools, an iris onto the request
#                  box, the click, the steps, the row becoming the result), social-ad (a 15 s
#                  ad: the opener built word by word onto a pile of pictures, the mark spinning in, a wall round
#                  the claim, two rivers of pictures, two imperatives, the lockup) and type-explainer
#                  (one short sentence at a time on a white page: the name as a giant word, what it is said at
#                  the pace of speech, a picture inside a line that becomes the shot, one soft wipe, the mark as
#                  the hub of the product's parts, the close). A template keeps its own tempo (template.json
#                  bpm) unless --bpm is given. Remotion only.
#   --brand        a supplied brand kit (a folder, or files: logo SVG or PNG, colours, licensed fonts,
#                  screenshots, product photos): scripts/brand.py writes brand/brand.json, the colour and type
#                  roles in src/brand/tokens.ts (supplied colours marked cinetic:brand-supplied), the logo's
#                  parts in src/brand/logo.ts and the screenshots into public/brand/; a Google font name in the
#                  kit is vendored with add-font.mjs. With --name the product's name goes to src/brand/identity.ts.
#                  Then deal the direction with: node scripts/py.mjs scripts/deck.py ... --brand brand/brand.json
#   --like         a clip the user supplies to borrow grammar from (never content): scripts/like.py measures it
#                  into out/like.json (grammar-score.mjs --target) and out/LIKE.md (the rules); the finished
#                  film is checked with: node scripts/py.mjs scripts/like.py guard --film out/film.mp4 --clip <clip>.
#                  A clip it cannot measure ends the run with exit 1 (the project is made; measure it again).
#   --music        a film cut to a licensed, human-made, instrumental track (references/music.md): the file is
#                  copied into <dir>/audio/music/ (git-ignored; never committed), its licence record written
#                  (scripts/audio/track.py add with the flags above: the licence as read on the item's own page
#                  now, never from memory, --ai-generated and --vocals included: the gate refuses a record that
#                  leaves either unknown, so the scaffold asks for both before it starts; or --record, an existing
#                  record for the same file), the track
#                  analysed (track.py analyze; an analysis of the same file beside it, <name>.track.json,
#                  is reused), the launch kit set up (kit.py init --preset launch, with earshot 0.4+) and
#                  audio/score.json pointed at the track. The tempo comes from the track, so the whole-beat
#                  check below is skipped. Then: track.py edit, track.py grid (printed).
#                  Python (every step here): $PYTHON, else the interpreter scripts/py.mjs picks (python3, python,
#                  then py -3 on Windows: the first 3.10+ that imports numpy); the steps need numpy, scipy,
#                  soundfile, librosa and ffmpeg. node scripts/py.mjs --which prints the one it uses.
#   --no-analyze   with --music: leave the analysis (the longest step) for its own job; the command is
#                  printed. The key in audio/score.json is set when the analysis is there.
#   --profile      with --music: the tempo prior the beat tracker starts from (track.py analyze --profile):
#                  calm 100 BPM, crisp 120 (the default), punchy 128.
#
# Exit codes: 0 created, 1 bad arguments or a failed step (the message says which).
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }
die() { echo "new-film: $*" >&2; exit 1; }
for a in "$@"; do case "$a" in -h|--help) usage; exit 0 ;; esac; done

# The work is scripts/new-film.mjs: one node process per stage. A shell call (a subshell, sed, grep, node -e) costs one
# to four seconds on a busy Windows laptop, and the scaffold made about a hundred of them; it now makes six.
case "${BASH_SOURCE[0]}" in */*) HERE="${BASH_SOURCE[0]%/*}" ;; *) HERE=. ;; esac
cd "$HERE/.." || die "cannot find the skill folder from $HERE"
SKILL=$PWD
cd "$OLDPWD" || die "cannot return to $OLDPWD"
ST="${TMPDIR:-/tmp}/cinetic-new-film.$$"
export CINETIC_NF_T0="${EPOCHREALTIME:-}"
# stage 1: check the arguments, copy the starter and the template, the name, film.json, the grid, the data files
node "$SKILL/scripts/new-film.mjs" --stage 1 --state "$ST" "$@"
. "$ST"   # DIR, the project folder stage 1 made
# The project carries its own copy of every script, so npm scripts use local paths (not the
# skill's own tests in scripts/test/).
(cd "$SKILL/scripts" && tar --exclude=__pycache__ --exclude='*.pyc' --exclude=./test -cf - .) | (cd "$DIR/scripts" && tar -xf -)
# stage 2: node_modules, fonts, the type family and the pairing dealt from the name, a brand kit, a clip, the music,
# then the next steps
exec node "$SKILL/scripts/new-film.mjs" --stage 2 --state "$ST" "$@"
