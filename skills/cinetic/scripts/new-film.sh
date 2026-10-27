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
#                            [--format launch|update] [--template <name>] [--brand <kit folder or file>]... [--like <clip>]
#                            [--music <track file> --title T --artist A --source S --page URL --licence L
#                             --seen-quote Q --seen-url URL --ai-generated no --vocals no [--credit C]
#                             [--file-url URL] [--content-id X] [--certificate C] [--modifications M]
#                             [--profile calm|crisp|punchy] | --music <file> --record <licence.json>]
#
#   --fps, --bpm   one beat must be a whole number of frames (60*fps/bpm). At 60 fps:
#                  90 -> 40 f, 100 -> 36, 120 -> 30, 144 -> 25, 150 -> 24. Without --bpm the
#                  starter keeps its own 120 BPM, a placeholder until track.py grid writes the
#                  track's grid; at an fps where 120 gives no whole beat (25 fps) the nearest tempo
#                  that does (125). A bpm in audio/score.json follows it.
#   --pace         calm (default): the script's lines arrive one at a time with reading holds of
#                  about 1-1.5 s between picture beats; crisp: the denser launch-film tempo. Sets
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
#   --format       launch (default: the starter's own acts, the main case, 15-45 s) or update: an 8-20 s
#                  "vX is out" film laid over the starter from assets/templates/update (src/update.ts holds
#                  the version and 2-4 changes; a hook on the version, one act per change shown as a product
#                  moment, the payoff, the end card with the version). update defaults to --pace crisp and
#                  the template's 120 BPM. Remotion only. The same as --template update.
#   --template     a film template from assets/templates/<name> laid over the starter: its timeline, acts,
#                  film and sound (template.json lists the files it copies and the starter files it removes;
#                  its pace and tempo become the defaults). update (a "vX is out" film), ui-walkthrough (a
#                  product's flow in steps: the promise, the input becoming the output, proof, a claim, then
#                  input -> the product reads -> insight -> choice -> output, the end card), capability-reel
#                  (a launch close: a ring of sources, one real record, a statement, a capability ticker, the
#                  big claim on the accent, a transition out of its full stop, the end card), prompt-run (a
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
#                  film is checked with: node scripts/py.mjs scripts/like.py guard --film out/film.mp4 --clip <clip>
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
#
# Exit codes: 0 created, 1 bad arguments or a failed step (the message says which).
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }
die() { echo "new-film: $*" >&2; exit 1; }

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONTS=()
MUSIC=""; RECORD=""; PROFILE=""; ADD=()
# Python: $PYTHON when set, else what scripts/py.mjs picks (on Windows python3 is often the Store alias, which runs
# nothing): every Python step goes through py(), and the printed commands show the same form.
py() { if [[ -n "${PYTHON:-}" ]]; then "$PYTHON" "$@"; else node "$SKILL/scripts/py.mjs" "$@"; fi; }
if [[ -n "${PYTHON:-}" ]]; then PYS="$PYTHON"; [[ "$PYTHON" == *" "* ]] && PYS="\"$PYTHON\""; else PYS="node scripts/py.mjs"; fi
DIR=""; ENGINE=remotion; FPS=60; BPM=""; PACE=""; SIZE=1920x1080; NAME=""; LINK=""; BROWSER="${CHROMIUM_PATH:-}"; INSTALL=1; FORCE=0
FORMAT=launch; TEMPLATE=""; BRANDS=(); LIKE=""; NAME_SET=0; BPM_SET=0; ANALYZE=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --engine) ENGINE="${2:?--engine needs a value}"; shift 2 ;;
    --fps) FPS="${2:?--fps needs a value}"; shift 2 ;;
    --bpm) BPM="${2:?--bpm needs a value}"; BPM_SET=1; shift 2 ;;
    --pace) PACE="${2:?--pace needs calm or crisp}"; shift 2 ;;
    --size) SIZE="${2:?--size needs a value}"; shift 2 ;;
    --name) NAME="${2:?--name needs a value}"; NAME_SET=1; shift 2 ;;
    --format) FORMAT="${2:?--format needs launch or update}"; shift 2 ;;
    --template) TEMPLATE="${2:?--template needs a name (a folder in assets/templates)}"; shift 2 ;;
    --brand) BRANDS+=("${2:?--brand needs a kit folder or file}"); shift 2 ;;
    --like) LIKE="${2:?--like needs a clip}"; shift 2 ;;
    --link-modules) LINK="${2:?--link-modules needs a path}"; shift 2 ;;
    --browser) BROWSER="${2:?--browser needs a path}"; shift 2 ;;
    --font) FONTS+=("${2:?--font needs a family name or package}"); shift 2 ;;
    --no-install) INSTALL=0; shift ;;
    --music) MUSIC="${2:?--music needs a track file}"; shift 2 ;;
    --record) RECORD="${2:?--record needs a licence record}"; shift 2 ;;
    --profile) PROFILE="${2:?--profile needs calm, crisp or punchy}"; shift 2 ;;
    --no-analyze) ANALYZE=0; shift ;;
    --title|--artist|--source|--page|--licence|--seen-quote|--seen-url|--seen-date|--credit|--file-url|--content-id|--licence-url|--limits|--ai-generated|--vocals|--certificate|--modifications)
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
[[ "$FORMAT" == launch || "$FORMAT" == update ]] || die "--format must be launch or update"
TPL=""
[[ "$FORMAT" == update && -z "$TEMPLATE" ]] && TEMPLATE=update
[[ "$FORMAT" == update && "$TEMPLATE" != update ]] && die "--format update is the update template: pass --format update or --template $TEMPLATE, not both"
if [[ -n "$TEMPLATE" ]]; then
  [[ "$TEMPLATE" =~ ^[a-z0-9-]+$ ]] || die "--template takes a template's folder name (letters, digits, dashes)"
  TPL="$SKILL/assets/templates/$TEMPLATE"
  if [[ ! -f "$TPL/template.json" ]]; then
    AVAIL=$(cd "$SKILL/assets/templates" && for d in */; do [[ -f "$d/template.json" ]] && printf '%s ' "${d%/}"; done)
    die "no template '$TEMPLATE' (assets/templates has: ${AVAIL% })"
  fi
  [[ "$ENGINE" == remotion ]] || die "--template $TEMPLATE is a Remotion template (use --engine remotion)"
  TPACE=$(sed -nE 's/^[[:space:]]*"pace":[[:space:]]*"([a-z]+)".*/\1/p' "$TPL/template.json" | head -n 1)
  [[ -n "$PACE" ]] || PACE="${TPACE:-crisp}"
fi
for kit in ${BRANDS[@]+"${BRANDS[@]}"}; do [[ -e "$kit" ]] || die "--brand: $kit not found"; done
[[ -z "$LIKE" || -f "$LIKE" ]] || die "--like: $LIKE not found"
if [[ -z "$BPM" ]]; then
  # the starter's own tempo (the template's with --template), unless the pace asks for the crisp one
  GRID="$SRC/src/timeline.ts"; [[ "$ENGINE" == hyperframes ]] && GRID="$SRC/motion.js"
  [[ -n "$TPL" ]] && GRID="$TPL/src/timeline.ts"
  BPM=$(sed -nE 's/^[[:space:]]*(export )?const BPM = ([0-9.]+);.*/\2/p' "$GRID" | head -n 1)
  [[ "$PACE" == crisp && -z "$TPL" ]] && BPM=120  # a template keeps its own tempo
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
  if [[ -z "$RECORD" ]]; then  # the gate refuses a record that leaves these unknown: ask before anything is copied
    for need in --title --artist --source --page --licence --ai-generated --vocals; do
      printf '%s\n' "${ADD[@]}" | grep -qx -- "$need" || die "--music needs $need (as the item's own page says; --ai-generated and --vocals are no or yes): the licence record is refused without it"
    done
  fi
  [[ -z "$PROFILE" || "$PROFILE" =~ ^(calm|crisp|punchy)$ ]] || die "--profile must be calm, crisp or punchy"
fi

# The whole system assumes a beat is a whole number of frames: cues on the grid, sound on the frame.
# With a track the tempo is the track's (src/music.ts gives b() its fractional frames): no whole-beat check.
# The starter's own tempo is a placeholder: at an fps where it gives no whole beat, take the nearest one that does.
if [[ -z "$MUSIC" ]] && ! node -e "const b=60*$FPS/$BPM; process.exit(Math.abs(b-Math.round(b))<1e-9?0:1)"; then
  OK=$(node -e "const r=[];for(let b=60;b<=200;b++){const f=60*$FPS/b;if(Number.isInteger(f))r.push(b+' ('+f+' f)')}console.log(r.join(', '))")
  NEAR=$(node -e "let n='';for(let b=60;b<=200;b++){if(Number.isInteger(60*$FPS/b)&&(n===''||Math.abs(b-$BPM)<Math.abs(n-$BPM)))n=b}console.log(n)")
  if [[ "$BPM_SET" == 0 && -n "$NEAR" ]]; then
    echo "new-film: at $FPS fps the starter's $BPM BPM gives no whole beat: using $NEAR BPM ($(node -e "console.log(60*$FPS/$NEAR)") f), a placeholder until track.py grid writes the track's grid (or pass --bpm)" >&2
    BPM="$NEAR"
  else
    die "at $FPS fps, $BPM BPM gives a beat of $(node -e "console.log((60*$FPS/$BPM).toFixed(3))") frames. Pick a BPM with a whole beat: $OK"
  fi
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
# A template: its files over the starter (its timeline, acts, film and sound), the starter's own acts removed
# (template.json lists both).
if [[ -n "$TPL" ]]; then
  TPL="$TPL" DIR="$DIR" node -e '
const fs = require("fs"), path = require("path");
const tpl = process.env.TPL, dir = process.env.DIR;
const m = JSON.parse(fs.readFileSync(path.join(tpl, "template.json"), "utf8"));
const keep = new Set(m.keep_if_present || []); // a brand already written into this folder (--force) stays
for (const f of m.copy) {
  if (keep.has(f) && fs.existsSync(path.join(dir, f))) continue;
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.copyFileSync(path.join(tpl, f), path.join(dir, f));
}
for (const f of m.remove) fs.rmSync(path.join(dir, f), { force: true });
console.log(`new-film: ${m.name} template: ${m.copy.length} files over the starter, ${m.remove.length} removed`);
' || die "could not lay the $TEMPLATE template over the starter"
fi

# Substitute a `const NAME = value;` line; fail loudly if the starter no longer has it.
set_const() { # file name value: the FIRST `const NAME = ...;` line only (timeline.ts derives
  # `export const BPM = MUSIC?.bpm ?? GRID_BPM;` from the grid line below it, which must stay as it is)
  local file="$1" name="$2" value="$3"
  grep -Eq "^(export )?const $name(: [^=]+)? = [^;]+;" "$file" || die "$file has no 'const $name = ...;' line to set"
  F="$file" N="$name" V="$value" node -e '
const fs = require("fs"), f = process.env.F, n = process.env.N, v = process.env.V;
const re = new RegExp("^((export )?const " + n + "(: [^=]+)? = )[^;]+;", "m");
fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(re, (m, head) => head + v + ";"));
' || die "could not set $name in $file"
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
# deck.py deals from the directions (and lists tracks from the music shortlist): the project keeps copies
for pair in "directions/directions.json:directions" "directions/imagery.json:directions" "music/shortlist.json:music"; do
  srcf="$SKILL/assets/${pair%%:*}"; dstd="$DIR/scripts/${pair##*:}"
  if [[ -f "$srcf" ]]; then mkdir -p "$dstd" && cp "$srcf" "$dstd/"; fi
done

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

# A supplied brand kit: brand.json, the tokens, the logo's parts, the screenshots (scripts/brand.py).
if [[ ${#BRANDS[@]} -gt 0 ]]; then
  ABS=()
  for kit in "${BRANDS[@]}"; do ABS+=("$(cd "$(dirname "$kit")" && pwd)/$(basename "$kit")"); done
  if [[ "$NAME_SET" == 1 ]]; then
    (cd "$DIR" && py scripts/brand.py "${ABS[@]}" --project . --name "$NAME") || echo "new-film: warning: brand.py reported a failed check (see above): fix the kit or the tokens before the build" >&2
  else
    (cd "$DIR" && py scripts/brand.py "${ABS[@]}" --project .) || echo "new-film: warning: brand.py reported a failed check (see above): fix the kit or the tokens before the build" >&2
  fi
  GF=$(cd "$DIR" && py -c "import json; print((json.load(open('brand/brand.json', encoding='utf-8')).get('fonts') or {}).get('google') or '')" 2>/dev/null || true)
  if [[ -n "$GF" ]]; then
    node "$DIR/scripts/add-font.mjs" "$GF" --dir "$DIR" --brand-supplied || echo "new-film: warning: could not vendor the brand's font $GF (node scripts/add-font.mjs \"$GF\" --brand-supplied)" >&2
  fi
fi

# A clip to borrow grammar from: its measured grammar and the rules (scripts/like.py).
if [[ -n "$LIKE" ]]; then
  CLIP="$(cd "$(dirname "$LIKE")" && pwd)/$(basename "$LIKE")"
  (cd "$DIR" && py scripts/like.py measure "$CLIP" --out out) || \
    echo "new-film: warning: like.py could not measure $LIKE (needs ffmpeg, numpy, opencv-python): run $PYS scripts/like.py measure <clip> later" >&2
fi

if [[ -n "$MUSIC" ]]; then
  mkdir -p "$DIR/audio/music"
  cp "$MUSIC" "$DIR/audio/music/"
  TRK="audio/music/$(basename "$MUSIC")"
  STEM=$(basename "$MUSIC" | sed -E 's/\.[^.]+$//' | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g; s/^_+//; s/_+$//')
  REC="audio/music/$STEM.licence.json"
  TJ="audio/music/$STEM.track.json"
  # an analysis made beside the source file: track.py analyze keeps it when its sha256 and settings match
  SRCTJ="$(dirname "$MUSIC")/$STEM.track.json"
  if [[ -f "$SRCTJ" && ! -e "$DIR/$TJ" ]]; then cp "$SRCTJ" "$DIR/$TJ"; fi
  if [[ -n "$RECORD" ]]; then
    cp "$RECORD" "$DIR/$REC"
    (cd "$DIR" && py scripts/audio/credits.py --check "$REC" --track "$TRK") || die "--record: the licence record does not pass (see above)"
  else
    (cd "$DIR" && py scripts/audio/track.py add "$TRK" "${ADD[@]}" --out "$REC") || die "the licence record was refused (see above): a track the gate cannot license never goes into a film"
  fi
  if [[ "$ANALYZE" == 1 ]]; then
    (cd "$DIR" && py scripts/audio/track.py analyze "$TRK" ${PROFILE:+--profile "$PROFILE"} --quiet) || \
      echo "new-film: warning: track.py analyze did not resolve the downbeat (see above): rerun it with --phase N before track.py edit" >&2
  fi
  # score.json: the track, its edit and its record; the key from the analysis; the tempo comes from src/music.ts
  (cd "$DIR" && TRK="$TRK" REC="$REC" TJ="$TJ" py - <<'PYEOF'
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
  (cd "$DIR" && py scripts/audio/kit.py init --preset launch --force) || \
    echo "new-film: warning: the launch kit needs earshot 0.4+ (references/sound.md, Finding earshot: EARSHOT_PYTHON); run $PYS scripts/audio/kit.py init --preset launch --force once it is installed" >&2
fi

BEAT=$(node -e "console.log(60*$FPS/$BPM)")
echo "new-film: created $DIR ($ENGINE, ${W}x${H} @ $FPS fps, $BPM BPM = $BEAT f per beat${PACE:+, $PACE pace}${TEMPLATE:+, the $TEMPLATE template})"
if [[ -n "$TPL" && "$TEMPLATE" != update ]]; then
  # the template's own first steps (template.json "next"); the music slot every film fills is printed below
  TPL="$TPL" node -e 'const m = JSON.parse(require("fs").readFileSync(require("path").join(process.env.TPL, "template.json"), "utf8")); for (const l of m.next || []) console.log(l);'
fi
if [[ "$TEMPLATE" == update ]]; then
  cat <<EOF
update film: write the version and 2-4 changes (one plain sentence each, 2-6 words, a result the user sees, each with its product moment) in src/update.ts,
  then deal its direction: $PYS scripts/deck.py --brief "<one line>" --format update --changes N --options 3
EOF
fi
if [[ "$ENGINE" == remotion ]]; then
  cat <<EOF
next:
  cd $DIR
  $PYS scripts/copy-check.py TREATMENT.md   # the script first, before any picture: what the product is by 3 s,
                            # one thing it does a line, the close; plain words (references/copy-and-type.md)
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
  $PYS scripts/copy-check.py TREATMENT.md   # the script first, before any picture: what the product is by 3 s
  node scripts/lint-film.mjs .   # cinetic bans; fails on purpose until the placeholder palette
                                 # and font in index.html are replaced (references/brand-and-color.md)
  node scripts/grid-check.ts timeline.js   # the grid, the reads and the text flow (Node 22.18+;
                                           # else npx -y tsx scripts/grid-check.ts timeline.js)
  npm run preview                # HyperFrames Studio
  npm run cues && npm run kit && npm run audio && npm run render:preview   # then: npm run render
  npm run listen                 # earshot's ears on the soundtrack: out/qa/listen.json + sound_sheet.png
EOF
fi
if [[ -z "$MUSIC" ]]; then
  cat <<EOF
music first: the slot is empty, and every film is cut to its own licensed track, never effects only
(references/music.md). In $DIR:
  node scripts/music.mjs search --mood "<the film's mood words>" --bpm <lo-hi> --length <film s>
  node scripts/music.mjs sheet --measure      # audition the first three; never the last film's track
  node scripts/music.mjs get '#n' --to audio/music   # the file and its licence record
  (a track found elsewhere: $PYS scripts/audio/track.py add <file> --title T --artist A --source S --page URL
   --licence L --seen-quote Q --seen-url URL --ai-generated no --vocals no)
  then $PYS scripts/audio/track.py analyze audio/music/<file>, and track.py edit / grid / check
EOF
fi
if [[ -n "$MUSIC" ]]; then
  cat <<EOF
music first (references/music.md):
EOF
  if [[ "$ANALYZE" == 0 ]]; then
    cat <<EOF
  $PYS scripts/audio/track.py analyze $TRK${PROFILE:+ --profile $PROFILE}   # its own job (the longest step); then "key" in audio/score.json and kit.py tune
EOF
  fi
  cat <<EOF
  $PYS scripts/audio/track.py edit --bars N --reveal-bar K --end stop|button|ring   # the film's bars on the track
  $PYS scripts/audio/track.py grid       # src/music.ts (or music.js): write the timeline on MUSIC bars
  $PYS scripts/audio/track.py check      # joins, licence, nothing from the track in git
EOF
fi
# the effects come from earshot's kit (audio/kit.json): say now whether this machine can render it
if [[ -f "$DIR/audio/kit.json" ]] && py -c "" >/dev/null 2>&1; then
  (cd "$DIR" && py scripts/audio/kit.py where 2>/dev/null | tail -n 1 | sed 's/^kit:/sound:/') || true
fi
