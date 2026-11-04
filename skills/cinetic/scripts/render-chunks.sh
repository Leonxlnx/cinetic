#!/usr/bin/env bash
# render-chunks.sh: parallel chunked render. Bundle once, render N frame ranges as N independent
# Chromium processes (concurrency 1 each, each with its own GPU process), join them losslessly
# with ffmpeg concat (-c copy), mux the soundtrack, then run the same sync + spec gates as render.sh.
# On machines where one browser with many tabs stalls (GPU/compositor bound scenes, WebGL), this
# is often faster than a single render at the same total concurrency. Sharp renders only: right for a
# crisp film (LOOK.blur 'crisp', the house default) with no CAMERA_BLUR range; a film whose policy asks
# for blur samples (camera, or camera-blur ranges) gets its master from render.sh --blur. Each chunk is
# its own Chromium: on a laptop keep the chunk count low.
#
# Usage:
#   bash scripts/render-chunks.sh <Comp> <out.mp4> [chunks] [crf] [options] [-- extra remotion args]
#
#   bash scripts/render-chunks.sh Film out/film.mp4             # chunks = half the CPUs, CRF 14
#   bash scripts/render-chunks.sh Film out/film.mp4 6 16 -- --gl=angle
#   bash scripts/render-chunks.sh Act2 out/act2.mp4 2 --audio-offset 360
#
# Options:
#   --audio FILE        soundtrack (default public/audio/soundtrack.wav)
#   --no-audio          no mux, no sync check
#   --audio-offset F    film frame at which this composition starts (for per-act compositions)
#   --entry FILE        Remotion entry (default src/index.ts)
#   --preset P          x264 preset (default slow)
#   --build-audio       rebuild the soundtrack first, as render.sh --build-audio does (npm run music with a
#                       track, cues, kit, audio, credits with a track)
#   --policy P          auto (default: LOOK.blur and CAMERA_BLUR from out/cues.json), crisp or camera: a film
#                       that needs blur samples is refused here (use render.sh --blur)
#   --no-check          skip check-sync.py and probe.py
#   --keep              keep the work directory
# Exit 0 = rendered and gates passed, 1 = a chunk, the join or a gate failed.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# Python: $PYTHON when it is set (the interpreter of a full environment; new-film.sh and npm's scripts/py.mjs
# honour it too), else the one scripts/py.mjs picks (python3, python or py -3, each only after it runs), so the
# Microsoft Store alias is never run
PYCMD=()
if [[ -n "${PYTHON:-}" ]]; then PYCMD=("$PYTHON")
else read -r -a PYCMD <<< "$(node "$SCRIPT_DIR/py.mjs" --which 2>/dev/null || echo python3)"; fi
python3() { "${PYCMD[@]}" "$@"; }
usage() { sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
die() { echo "render-chunks.sh: $*" >&2; exit 1; }
T0=$(date +%s)
step() { echo "[chunks $(( $(date +%s) - T0 ))s] $*" >&2; }

AUDIO=public/audio/soundtrack.wav; NOAUDIO=0; AOFF=0; ENTRY=src/index.ts; PRESET=slow; NOCHECK=0; KEEP=0; BUILD_AUDIO=0; POLICY=auto
POS=(); EXTRA=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --audio) AUDIO=${2:?}; shift ;;
    --no-audio) NOAUDIO=1 ;;
    --audio-offset) AOFF=${2:?}; shift ;;
    --entry) ENTRY=${2:?}; shift ;;
    --preset) PRESET=${2:?}; shift ;;
    --no-check) NOCHECK=1 ;;
    --build-audio) BUILD_AUDIO=1 ;;
    --policy) POLICY=${2:?--policy needs auto, crisp or camera}; shift ;;
    --keep) KEEP=1 ;;
    --) shift; EXTRA=("$@"); break ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) POS+=("$1") ;;
  esac
  shift
done
[[ ${#POS[@]} -ge 2 && ${#POS[@]} -le 4 ]] || usage 1
COMP=${POS[0]}; OUT=${POS[1]}
NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)  # sysctl: macOS has no nproc
CHUNKS=${POS[2]:-$(( NPROC / 2 > 2 ? NPROC / 2 : 2 ))}
CRF=${POS[3]:-14}
[[ "$CHUNKS" =~ ^[0-9]+$ && "$CHUNKS" -ge 1 ]] || die "chunks must be a positive integer"

if [[ ! -f "$ENTRY" ]]; then
  if [[ -f "$SCRIPT_DIR/../$ENTRY" ]]; then cd "$SCRIPT_DIR/.."; else die "no $ENTRY here; run from the project root or pass --entry"; fi
fi
case "$POLICY" in auto|crisp|camera) ;; *) die "--policy is auto, crisp or camera (got $POLICY)" ;; esac
NEEDS_BLUR=0
if [[ $POLICY == camera ]]; then NEEDS_BLUR=1
elif [[ $POLICY == auto && -f out/cues.json ]]; then
  node -e "const c=JSON.parse(require('fs').readFileSync('out/cues.json','utf8'));const d=c.declared||{};const fx=(d.fx||[]).flatMap(x=>x.cameraBlur||[]);process.exit(c.look&&(c.look.blur==='camera'||(d.cameraBlur||[]).length||fx.length)?0:1)" && NEEDS_BLUR=1
fi
[[ $NEEDS_BLUR -eq 0 ]] || die "this film's blur policy asks for samples (camera, or CAMERA_BLUR ranges): render its master with render.sh --blur (pass --policy crisp to render it sharp here anyway)"
if [[ $BUILD_AUDIO -eq 1 && $NOAUDIO -eq 0 ]]; then
  has_script() { [[ -f package.json ]] && node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts[process.argv[1]]?0:1)" "$1"; }
  has_script cues && has_script audio || die "--build-audio needs the project's npm scripts cues and audio (render.sh --build-audio also runs older projects)"
  MUSIC_LED=0
  if [[ -f audio/score.json ]] && node -e "const s=JSON.parse(require('fs').readFileSync('audio/score.json','utf8'));process.exit(s.music&&typeof s.music==='object'?0:1)"; then MUSIC_LED=1; fi
  step "rebuilding the soundtrack"
  if [[ $MUSIC_LED -eq 1 ]]; then npm run --silent music >&2 || die "npm run music failed"; fi
  npm run --silent cues >&2 || die "npm run cues failed"
  if [[ -f audio/kit.json ]] && has_script kit; then npm run --silent kit >&2 || echo "render-chunks.sh: the kit was not rendered (above)" >&2; fi
  npm run --silent audio >&2 || die "npm run audio failed"
  if [[ "$AUDIO" != public/audio/soundtrack.wav && -f public/audio/soundtrack.wav ]]; then mkdir -p "$(dirname "$AUDIO")"; cp public/audio/soundtrack.wav "$AUDIO"; fi
  if [[ $MUSIC_LED -eq 1 ]]; then npm run --silent credits >&2 || die "the licence gate refused the music (npm run credits)"; fi
fi
[[ $NOAUDIO -eq 1 || -f "$AUDIO" ]] || die "soundtrack $AUDIO not found (or pass --no-audio)"
mkdir -p "$(dirname "$OUT")" out/qa
OUT_ABS=$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")
NAME=$(basename "${OUT%.*}")

WORK=$(mktemp -d "${TMPDIR:-/tmp}/cinetic-chunks.XXXXXX")
if [[ $KEEP -eq 1 ]]; then echo "render-chunks.sh: keeping $WORK" >&2; else trap 'rm -rf "$WORK"' EXIT; fi

step "bundling $ENTRY"
npx remotion bundle "$ENTRY" --out-dir "$WORK/bundle" --log=error >/dev/null || die "bundle failed"
LIST=$(npx remotion compositions "$WORK/bundle" 2>/dev/null) || die "could not list compositions"
read -r FPS SIZE TOTAL <<< "$(awk -v id="$COMP" '$1 == id && $2 ~ /^[0-9.]+$/ && $3 ~ /^[0-9]+x[0-9]+$/ { print $2, $3, $4; exit }' <<< "$LIST")" || true
[[ -n "${FPS:-}" ]] || die "no video composition '$COMP'"
(( CHUNKS <= TOTAL )) || CHUNKS=$TOTAL
per=$(( (TOTAL + CHUNKS - 1) / CHUNKS ))

step "$COMP: ${SIZE}@${FPS}, $TOTAL frames in $CHUNKS chunks of <= $per"
pids=()
for ((i = 0; i < CHUNKS; i++)); do
  a=$(( i * per )); b=$(( (i + 1) * per - 1 )); (( b >= TOTAL )) && b=$(( TOTAL - 1 ))
  (( a > b )) && break
  npx remotion render "$WORK/bundle" "$COMP" "$WORK/part$i.mp4" --frames="$a-$b" --concurrency=1 \
    --crf="$CRF" --x264-preset="$PRESET" --pixel-format=yuv420p --color-space=bt709 --muted --log=error \
    ${EXTRA[@]+"${EXTRA[@]}"} > "$WORK/part$i.log" 2>&1 &
  pids+=($!)
done
fail=0
for i in "${!pids[@]}"; do
  if ! wait "${pids[$i]}"; then echo "render-chunks.sh: chunk $i failed:" >&2; tail -20 "$WORK/part$i.log" >&2; fail=1; fi
done
[[ $fail -eq 0 ]] || die "a chunk failed"

step "joining ${#pids[@]} chunks"
for ((i = 0; i < ${#pids[@]}; i++)); do echo "file '$WORK/part$i.mp4'"; done > "$WORK/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$WORK/list.txt" -c copy "$WORK/video.mp4" || die "concat failed"
GOT=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$WORK/video.mp4")
[[ "$GOT" -eq "$TOTAL" ]] || die "joined video has $GOT frames, expected $TOTAL"

DUR=$(python3 -c "print(f'{$TOTAL/$FPS:.6f}')")
AOFF_S=$(python3 -c "print(f'{$AOFF/$FPS:.6f}')")
if [[ $NOAUDIO -eq 1 ]]; then
  ffmpeg -v error -y -i "$WORK/video.mp4" -map 0:v:0 -c copy -movflags +faststart "$OUT_ABS" || die "copy failed"
else
  step "muxing $AUDIO (from ${AOFF_S}s)"
  ffmpeg -v error -y -i "$WORK/video.mp4" -ss "$AOFF_S" -i "$AUDIO" -map 0:v:0 -map 1:a:0 -c:v copy \
    -af apad -c:a aac -b:a 320k -ar 48000 -ac 2 -t "$DUR" -movflags +faststart "$OUT_ABS" || die "mux failed"
fi

STATUS=0
if [[ $NOCHECK -eq 0 ]]; then
  if [[ $NOAUDIO -eq 0 ]]; then
    python3 "$SCRIPT_DIR/check-sync.py" "$OUT_ABS" "$AUDIO" --ref-offset "$AOFF_S" --json "out/qa/sync-$NAME.json" >/dev/null || STATUS=1
  fi
  PARGS=(--spec "${SIZE}@${FPS}" --frames "$TOTAL" --json "out/qa/probe-$NAME.json" --no-loudness)
  [[ $NOAUDIO -eq 1 ]] && PARGS+=(--audio none)
  python3 "$SCRIPT_DIR/probe.py" "$OUT_ABS" ${PARGS[@]+"${PARGS[@]}"} >/dev/null || STATUS=1
fi
step "$( [[ $STATUS -eq 0 ]] && echo done || echo 'FAILED a gate' ): $OUT"
exit $STATUS
