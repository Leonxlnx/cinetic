#!/usr/bin/env bash
# new-film.sh: start a film project from the cinetic starter.
#
# Copies assets/remotion-starter (or assets/hyperframes-starter) into <dir>, sets the frame rate,
# tempo, pace, size and name, copies every cinetic script into <dir>/scripts so the project runs on
# its own, then installs dependencies (or symlinks an existing node_modules with --link-modules).
#
# Usage:
#   bash scripts/new-film.sh <dir> [--engine remotion|hyperframes] [--fps 60] [--bpm N]
#                            [--pace calm|crisp] [--size 1920x1080] [--name my-film]
#                            [--link-modules <node_modules>]
#                            [--font <name>]... [--browser <chromium path>] [--no-install] [--force]
#                            [--music <track file> --title T --artist A --source S --page URL --licence L
#                             --seen-quote Q --seen-url URL [--credit C] [--file-url URL] [--content-id X]
#                             [--profile calm|crisp|punchy] | --music <file> --record <licence.json>]
#
#   --fps, --bpm   one beat must be a whole number of frames (60*fps/bpm). At 60 fps:
#                  90 -> 40 f, 100 -> 36, 120 -> 30, 144 -> 25, 150 -> 24. Without --bpm the
#                  starter keeps its own tempo (Remotion 100, HyperFrames 120), or 120 with
#                  --pace crisp. The project's audio/score.json gets the same bpm.
#   --pace         calm (default): text arrives as short fragments that take turns with the
#                  picture and holds about 1-1.5 s; crisp: the denser launch-film tempo. Sets
#                  PACE_NAME (src/timeline.ts, or motion.js), which the components, grid-check
#                  and lint-film read.
#   --size         WxH, e.g. 1920x1080, 1080x1920 (9:16), 1080x1080. The demo lays out from the short side.
#   --engine       remotion (default): sets FPS/BPM/W/H in src/timeline.ts. hyperframes: sets them in
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
#   --music        a film cut to a licensed, human-made, instrumental track (references/music.md): the file is
#                  copied into <dir>/audio/music/ (git-ignored; never committed), its licence record written
#                  (scripts/audio/track.py add with the flags above: the licence as read on the item's own page
#                  now, never from memory; or --record, an existing record for the same file), the track
#                  analysed (track.py analyze), the launch kit set up (kit.py init --preset launch, with
#                  earshot 0.4+) and audio/score.json pointed at the track. The tempo comes from the track, so
#                  the whole-beat check below is skipped. Then: track.py edit, track.py grid (printed).
#                  Python: $PYTHON, else python3 (numpy, scipy, soundfile, librosa, ffmpeg).
#
# Exit codes: 0 created, 1 bad arguments or a failed step (the message says which).
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }
die() { echo "new-film: $*" >&2; exit 1; }

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONTS=()
MUSIC=""; RECORD=""; PROFILE=""; ADD=()
PY="${PYTHON:-python3}"
DIR=""; ENGINE=remotion; FPS=60; BPM=""; PACE=""; SIZE=1920x1080; NAME=""; LINK=""; BROWSER="${CHROMIUM_PATH:-}"; INSTALL=1; FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --engine) ENGINE="${2:?--engine needs a value}"; shift 2 ;;
    --fps) FPS="${2:?--fps needs a value}"; shift 2 ;;
    --bpm) BPM="${2:?--bpm needs a value}"; shift 2 ;;
    --pace) PACE="${2:?--pace needs calm or crisp}"; shift 2 ;;
    --size) SIZE="${2:?--size needs a value}"; shift 2 ;;
    --name) NAME="${2:?--name needs a value}"; shift 2 ;;
    --link-modules) LINK="${2:?--link-modules needs a path}"; shift 2 ;;
    --browser) BROWSER="${2:?--browser needs a path}"; shift 2 ;;
    --font) FONTS+=("${2:?--font needs a family name or package}"); shift 2 ;;
    --no-install) INSTALL=0; shift ;;
    --music) MUSIC="${2:?--music needs a track file}"; shift 2 ;;
    --record) RECORD="${2:?--record needs a licence record}"; shift 2 ;;
    --profile) PROFILE="${2:?--profile needs calm, crisp or punchy}"; shift 2 ;;
    --title|--artist|--source|--page|--licence|--seen-quote|--seen-url|--seen-date|--credit|--file-url|--content-id|--licence-url|--limits)
      ADD+=("$1" "${2:?$1 needs a value}"); shift 2 ;;
    --force) FORCE=1; shift ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) [[ -z "$DIR" ]] || die "one target directory only (got '$DIR' and '$1')"; DIR="$1"; shift ;;
  esac
done

[[ -n "$DIR" ]] || { usage; die "missing <dir>"; }
[[ "$ENGINE" == remotion || "$ENGINE" == hyperframes ]] || die "--engine must be remotion or hyperframes"
[[ "$FPS" =~ ^[0-9]+$ && "$FPS" -gt 0 ]] || die "--fps must be a positive integer"
[[ -z "$PACE" || "$PACE" == calm || "$PACE" == crisp ]] || die "--pace must be calm or crisp"
SRC="$SKILL/assets/$ENGINE-starter"
[[ -d "$SRC" ]] || die "starter not found: $SRC"
if [[ -z "$BPM" ]]; then
  # the starter's own tempo, unless the pace asks for the crisp one
  GRID="$SRC/src/timeline.ts"; [[ "$ENGINE" == hyperframes ]] && GRID="$SRC/motion.js"
  BPM=$(sed -nE 's/^[[:space:]]*(export )?const BPM = ([0-9.]+);.*/\2/p' "$GRID" | head -n 1)
  [[ "$PACE" == crisp ]] && BPM=120
  [[ -n "$BPM" ]] || die "could not read BPM from $GRID; pass --bpm"
fi
[[ "$BPM" =~ ^[0-9]+([.][0-9]+)?$ ]] || die "--bpm must be a number"
[[ "$SIZE" =~ ^([0-9]+)x([0-9]+)$ ]] || die "--size must look like 1920x1080"
W="${BASH_REMATCH[1]}"; H="${BASH_REMATCH[2]}"
(( W % 2 == 0 && H % 2 == 0 )) || die "--size must be even in both dimensions (yuv420p needs it)"

if [[ -n "$MUSIC" ]]; then
  [[ -f "$MUSIC" ]] || die "--music: $MUSIC not found"
  [[ -n "$RECORD" || ${#ADD[@]} -gt 0 ]] || die "--music needs its licence: --record <licence.json>, or --title --artist --source --page --licence --seen-quote --seen-url (read on the item's own page)"
  [[ -z "$RECORD" || -f "$RECORD" ]] || die "--record: $RECORD not found"
  [[ -z "$PROFILE" || "$PROFILE" =~ ^(calm|crisp|punchy)$ ]] || die "--profile must be calm, crisp or punchy"
fi

# The whole system assumes a beat is a whole number of frames: cues on the grid, sound on the frame.
# With a track the tempo is the track's (src/music.ts gives b() its fractional frames): no whole-beat check.
if [[ -z "$MUSIC" ]] && ! node -e "const b=60*$FPS/$BPM; process.exit(Math.abs(b-Math.round(b))<1e-9?0:1)"; then
  OK=$(node -e "const r=[];for(let b=60;b<=200;b++){const f=60*$FPS/b;if(Number.isInteger(f))r.push(b+' ('+f+' f)')}console.log(r.join(', '))")
  die "at $FPS fps, $BPM BPM gives a beat of $(node -e "console.log((60*$FPS/$BPM).toFixed(3))") frames. Pick a BPM with a whole beat: $OK"
fi

if [[ -e "$DIR" ]]; then
  [[ -d "$DIR" ]] || die "$DIR exists and is not a directory"
  if [[ -n "$(ls -A "$DIR" 2>/dev/null)" && "$FORCE" != 1 ]]; then die "$DIR is not empty (use --force to copy into it anyway)"; fi
fi
[[ -z "$NAME" ]] && NAME="$(basename "$DIR")"
PKG=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^[-._]+//; s/-+$//')
[[ -n "$PKG" ]] || PKG=film

mkdir -p "$DIR"
DIR="$(cd "$DIR" && pwd)"
# Copy the starter, leaving out anything installed or rendered.
(cd "$SRC" && tar --exclude=node_modules --exclude=out --exclude=__pycache__ -cf - .) | (cd "$DIR" && tar -xf -)

# Substitute a `const NAME = value;` line; fail loudly if the starter no longer has it.
set_const() { # file name value
  local file="$1" name="$2" value="$3"
  grep -Eq "^(export )?const $name(: [^=]+)? = [^;]+;" "$file" || die "$file has no 'const $name = ...;' line to set"
  sed -i.bak -E "s|^((export )?const $name(: [^=]+)? = )[^;]+;|\1$value;|" "$file" && rm -f "$file.bak"
}

if [[ "$ENGINE" == remotion ]]; then
  TL="$DIR/src/timeline.ts"
  set_const "$TL" FPS "$FPS"; set_const "$TL" BPM "$BPM"; set_const "$TL" W "$W"; set_const "$TL" H "$H"
  [[ -n "$PACE" ]] && set_const "$TL" PACE_NAME "'$PACE'"
  sed -i.bak -E "s|\"name\": \"[^\"]*\"|\"name\": \"$PKG\"|; s|[0-9]+x[0-9]+@[0-9]+|${W}x${H}@${FPS}|g" "$DIR/package.json" && rm -f "$DIR/package.json.bak"
  if [[ -n "$BROWSER" ]]; then
    [[ -x "$BROWSER" ]] || echo "new-film: warning: --browser $BROWSER is not an executable file here" >&2
    set_const "$DIR/remotion.config.ts" PINNED_BROWSER "'$BROWSER'"
  fi
else
  # HyperFrames: the grid lives in motion.js (FPS, BPM, W, H); index.html repeats the size, fps and
  # length on the root element, the viewport meta and the html/body box. Set all of them, then
  # derive data-duration from timeline.js (TOTAL / FPS) so the render neither cuts nor freezes.
  MJ="$DIR/motion.js"
  [[ -f "$MJ" && -f "$DIR/timeline.js" && -f "$DIR/index.html" ]] || die "HyperFrames starter needs motion.js, timeline.js and index.html"
  for kv in "FPS=$FPS" "BPM=$BPM" "W=$W" "H=$H" ${PACE:+"PACE_NAME='$PACE'"}; do
    k="${kv%%=*}"; v="${kv#*=}"
    grep -Eq "^[[:space:]]*const $k = [^;]+;" "$MJ" || die "motion.js has no 'const $k = ...;' line to set"
    sed -i.bak -E "s|^([[:space:]]*const $k = )[^;]+;|\1$v;|" "$MJ" && rm -f "$MJ.bak"
  done
  DIR="$DIR" W="$W" H="$H" node - <<'JS' || die "could not update index.html from motion.js/timeline.js"
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = process.env.DIR, W = +process.env.W, H = +process.env.H;
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['motion.js', 'timeline.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const { FPS } = ctx.MOTION, { TOTAL } = ctx.FILM;
const dur = +(TOTAL / FPS).toFixed(6);
const file = path.join(dir, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const root = (html.match(/<[a-z][^>]*\bdata-composition-id\s*=[^>]*>/is) || [])[0];
if (!root) throw new Error('index.html: no element with data-composition-id');
const old = (root.match(/\bdata-duration\s*=\s*"([^"]*)"/) || [])[1];
const setAttr = (tag, name, v) => (new RegExp(`\\b${name}\\s*=\\s*"[^"]*"`).test(tag) ? tag.replace(new RegExp(`\\b${name}\\s*=\\s*"[^"]*"`), `${name}="${v}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${v}">`));
let tag = root;
for (const [n, v] of [['data-fps', FPS], ['data-width', W], ['data-height', H], ['data-duration', dur]]) tag = setAttr(tag, n, v);
html = html.replace(root, tag);
// clips that ran the whole film (same data-duration as the old root) keep running the whole film
if (old !== undefined) html = html.replace(new RegExp(`(\\bdata-duration\\s*=\\s*")${old.replace('.', '\\.')}(")`, 'g'), `$1${dur}$2`);
html = html.replace(/(<meta\s+name="viewport"\s+content=")[^"]*(")/i, `$1width=${W}, height=${H}$2`);
html = html.replace(/(html,\s*body\s*\{[^}]*?\bwidth:\s*)\d+px/, `$1${W}px`).replace(/(html,\s*body\s*\{[^}]*?\bheight:\s*)\d+px/, `$1${H}px`);
fs.writeFileSync(file, html);
console.log(`new-film: index.html root ${W}x${H} @ ${FPS} fps, data-duration ${dur} s (TOTAL ${TOTAL} f)`);
JS
  [[ -f "$DIR/package.json" ]] && sed -i.bak -E "s|\"name\": \"[^\"]*\"|\"name\": \"$PKG\"|" "$DIR/package.json" && rm -f "$DIR/package.json.bak"
fi

# score.py refuses a score whose bpm differs from the timeline's: keep audio/score.json on the grid.
if [[ -f "$DIR/audio/score.json" ]]; then
  sed -i.bak -E "s|(\"bpm\"[[:space:]]*:[[:space:]]*)[0-9.]+|\1$BPM|" "$DIR/audio/score.json" && rm -f "$DIR/audio/score.json.bak"
fi

# The project carries its own copy of every script, so npm scripts use local paths (not the
# skill's own tests in scripts/test/).
mkdir -p "$DIR/scripts"
(cd "$SKILL/scripts" && tar --exclude=__pycache__ --exclude='*.pyc' --exclude=./test -cf - .) | (cd "$DIR/scripts" && tar -xf -)
chmod +x "$DIR"/scripts/*.sh 2>/dev/null || true
# a licensed track never enters git: make sure the project ignores it and everything mixed from it
GI="$DIR/.gitignore"
for line in 'node_modules/' 'out/*' '!out/cues.json' 'public/audio/*.wav' 'audio/music/*' '!audio/music/*.json' '!audio/music/README.md' 'out/cache/' '.DS_Store' '*.log' '__pycache__/'; do
  grep -qxF -- "$line" "$GI" 2>/dev/null || echo "$line" >> "$GI"
done
# pick.py draws from the technique library; the project keeps a copy so it runs from here too
LIB="$SKILL/assets/library/techniques.json"; [[ -f "$LIB" ]] || LIB="$SKILL/scripts/library/techniques.json"
if [[ -f "$LIB" ]]; then mkdir -p "$DIR/scripts/library" && cp "$LIB" "$DIR/scripts/library/"; fi

if [[ -n "$LINK" ]]; then
  [[ -d "$LINK" ]] || die "--link-modules: $LINK is not a directory"
  rm -rf "$DIR/node_modules"
  TARGET="$(cd "$LINK" && pwd)"
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      # ln -s copies here (hundreds of MB) unless Windows symlinks are enabled: make a junction,
      # which needs no rights and acts like a symlink for node and npm.
      MSYS_NO_PATHCONV=1 cmd /c mklink /J "$(cygpath -w "$DIR/node_modules")" "$(cygpath -w "$TARGET")" >/dev/null \
        || die "--link-modules: could not make a junction node_modules -> $TARGET (cmd /c mklink /J)"
      ;;
    *) ln -s "$TARGET" "$DIR/node_modules" ;;
  esac
  [[ -d "$DIR/node_modules" ]] || die "--link-modules: $DIR/node_modules was not created"
  echo "new-film: linked node_modules -> $LINK"
  # npm's postinstall does not run for a linked folder; run the starter's setup step directly
  if [[ -f "$DIR/setup.mjs" ]]; then
    (cd "$DIR" && node setup.mjs) || echo "new-film: warning: setup.mjs could not copy its files from the linked node_modules (npm install in $DIR fixes it)" >&2
  fi
elif [[ "$INSTALL" == 1 && -f "$DIR/package.json" ]]; then
  (cd "$DIR" && npm install --no-audit --no-fund) || die "npm install failed in $DIR (rerun it there, or use --link-modules)"
fi

for font in ${FONTS[@]+"${FONTS[@]}"}; do
  node "$DIR/scripts/add-font.mjs" "$font" --dir "$DIR" || die "--font $font: could not vendor it (see above)"
done

if [[ -n "$MUSIC" ]]; then
  mkdir -p "$DIR/audio/music"
  cp "$MUSIC" "$DIR/audio/music/"
  TRK="audio/music/$(basename "$MUSIC")"
  STEM=$(basename "$MUSIC" | sed -E 's/\.[^.]+$//' | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g; s/^_+//; s/_+$//')
  REC="audio/music/$STEM.licence.json"
  if [[ -n "$RECORD" ]]; then
    cp "$RECORD" "$DIR/$REC"
    (cd "$DIR" && "$PY" scripts/audio/credits.py --check "$REC" --track "$TRK") || die "--record: the licence record does not pass (see above)"
  else
    (cd "$DIR" && "$PY" scripts/audio/track.py add "$TRK" "${ADD[@]}" --out "$REC") || die "the licence record was refused (see above): a track the gate cannot license never goes into a film"
  fi
  (cd "$DIR" && "$PY" scripts/audio/track.py analyze "$TRK" ${PROFILE:+--profile "$PROFILE"} --quiet) || \
    echo "new-film: warning: track.py analyze did not resolve the downbeat (see above): rerun it with --phase N before track.py edit" >&2
  TJ="audio/music/$STEM.track.json"
  # score.json: the track, its edit and its record; the key from the analysis; the tempo comes from src/music.ts
  (cd "$DIR" && TRK="$TRK" REC="$REC" TJ="$TJ" "$PY" - <<'PYEOF'
import json, os
p = 'audio/score.json'
s = json.load(open(p, encoding='utf-8'))
s['music'] = {'track': os.environ['TRK'], 'edit': 'audio/music/edit.json', 'licence': os.environ['REC']}
s.pop('bpm', None)
if os.path.isfile(os.environ['TJ']):
    k = (json.load(open(os.environ['TJ'], encoding='utf-8')).get('key') or {}).get('name')
    if k:
        s['key'] = k
s.setdefault('stopdowns', {'auto': 'kit', 'add': [], 'skip': [], 'quiet_db': -7})
s.setdefault('master', {})['lufs'] = -14
open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(s, indent=2) + '\n')
print(f"new-film: audio/score.json plays {s['music']['track']} (key {s.get('key')})")
PYEOF
  ) || die "could not point audio/score.json at the track"
  (cd "$DIR" && "$PY" scripts/audio/kit.py init --preset launch --force) || \
    echo "new-film: warning: the launch kit needs earshot 0.4+ (docs/setup.md); run python3 scripts/audio/kit.py init --preset launch --force once it is installed" >&2
fi

BEAT=$(node -e "console.log(60*$FPS/$BPM)")
echo "new-film: created $DIR ($ENGINE, ${W}x${H} @ $FPS fps, $BPM BPM = $BEAT f per beat${PACE:+, $PACE pace})"
if [[ "$ENGINE" == remotion ]]; then
  cat <<EOF
next:
  cd $DIR
  npm run check             # tsc, lint-film, grid-check: fails on purpose until the placeholder brand
                            # (palette, typeface, mark and name: cinetic:placeholder in src/brand and
                            # COPY) is replaced; see brand-and-color.md
  npm run stills            # style frames in out/stills/ - look at them
  npm run studio            # iterate act by act (Acts folder)
  npm run cues && npm run kit && npm run audio && npm run render:preview
  npm run listen            # earshot's ears on the soundtrack: out/qa/listen.json + sound_sheet.png
EOF
else
  cat <<EOF
next:
  cd $DIR
  node scripts/lint-film.mjs .   # cinetic bans; fails on purpose until the placeholder palette
                                 # and font in index.html are replaced (references/brand-and-color.md)
  node scripts/grid-check.ts timeline.js   # the grid, the reads and the text flow (Node 22.18+;
                                           # else npx -y tsx scripts/grid-check.ts timeline.js)
  npm run preview                # HyperFrames Studio
  npm run cues && npm run kit && npm run audio && npm run render:preview   # then: npm run render
  npm run listen                 # earshot's ears on the soundtrack: out/qa/listen.json + sound_sheet.png
EOF
fi
if [[ -n "$MUSIC" ]]; then
  cat <<EOF
music first (references/music.md):
  python3 scripts/audio/track.py edit --bars N --reveal-bar K --end stop|button|ring   # the film's bars on the track
  python3 scripts/audio/track.py grid       # src/music.ts (or music.js): write the timeline on MUSIC bars
  python3 scripts/audio/track.py check      # joins, licence, nothing from the track in git
EOF
fi
# the effects come from earshot's kit (audio/kit.json): say now whether this machine can render it
if [[ -f "$DIR/audio/kit.json" ]] && command -v python3 >/dev/null; then
  (cd "$DIR" && python3 scripts/audio/kit.py where 2>/dev/null | tail -n 1 | sed 's/^kit:/sound:/') || true
fi
