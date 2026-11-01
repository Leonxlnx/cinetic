#!/usr/bin/env bash
# render.sh: picture from Remotion (always muted), soundtrack muxed by ffmpeg, then sync + spec gates.
#
# Usage:
#   bash scripts/render.sh <Comp> <out.mp4> [--preview | --blur] [options] [-- extra remotion args]
#
#   bash scripts/render.sh Film out/draft.mp4 --draft          # the whole film, early: half size, fast, the current sound
#   bash scripts/render.sh Film out/preview.mp4 --preview      # fast check render (CRF 20, veryfast)
#   bash scripts/render.sh Film out/film.mp4                   # sharp master (CRF 14, x264 slow)
#   bash scripts/render.sh Film out/film.mp4 --blur            # motion-blurred master
#   bash scripts/render.sh Film out/act3.mp4 --blur --frames 600-839   # one act, for a splice
#   bash scripts/render.sh Film out/film.mp4 --max-min 8               # under a job limit: rerun until exit 0
#   bash scripts/render.sh Film out/film.mp4 --from-draft out/draft.mp4  # out of time: the whole draft, scaled up
#
# Modes:
#   (default)  sharp master: CRF 14, BT.709 tagged (--color-space=bt709), rendered in parts from a
#              pre-built bundle and joined losslessly (see Parts below). Its frames go through lossless PNG
#              (soft lit grounds band through JPEG intermediates; --jpeg for a faster master of a film without them).
#   --draft    the WHOLE film early, to look at and to fall back on: half size (-- --scale=S for another),
#              CRF 23 on x264 superfast, JPEG frames, parts of up to 450 frames (fewer browser starts), no blur
#              samples, the current soundtrack muxed when there is one (with a track picked and no mix yet, the track
#              alone: sound.mjs --bed-only; silent only with no track at all, said at the end and marked out/qa/SILENT), and
#              out/qa/draft-sheet.png (16 tiles cut from the video by ffmpeg). Look at the film through the draft
#              (frames.mjs sheet --from / grab --from), not through per-frame stills.
#   --from-draft DRAFT  the delivery when the final cannot finish in the time left: the whole draft scaled up to the
#              composition's size (lanczos, CRF 16), BT.709 tagged, the soundtrack muxed. A run never delivers a cut
#              film: a complete draft beats a final that stops halfway.
#   --preview  same pipeline, CRF 20 on x264 veryfast (about 3x faster to encode). Same tags as the
#              master, so colour and banding judgements carry over.
#   --blur     true motion blur, as the film declares it (--policy): sharp render -> measure-speed.py
#              writes out/samples.json (samples per frame from optical flow) -> the sub-frame
#              composition (<Comp>Sub, e.g. FilmSub)
#              renders every sub-frame with --props=out/samples.json -> accumulate.py averages
#              them in float, quantizes once (flat fields exact, dither only in smooth ramps) and
#              encodes BT.709 CRF 14. Before the sub-frame pass it prints the
#              sub-frame multiple and an estimate in minutes from the sharp pass's measured speed,
#              and it warns about moves too fast for clean blur. Typical films cost 3-8x a sharp
#              render; cap it with --budget. Render the blurred master once, after the last review.
#              A crisp film (LOOK.blur 'crisp', the house default) samples only inside its CAMERA_BLUR
#              ranges; with none in the range, no frame needs samples and the sharp master is rendered
#              instead. A film with declarations caps the samples at 8 per frame (--measure "--max N"
#              overrides).
#
# The source is bundled once at the start and every pass renders from that frozen bundle, so edits
# to src/ during a render are not in it; render.sh warns at the end if src/ changed meanwhile.
#
# Fast by default: the bundle (and its composition list) is a copy of the one scripts/frames.mjs keeps per state of
# the source in out/.bundle/, which the stills and sheets of the session built already; the project's Remotion CLI runs
# through node (no npm start per call); the GL backend is the one `node scripts/frames.mjs gl` measured fastest among
# those that draw the same pixels as software GL here (probed once per machine; CINETIC_GL=X or -- --gl=X overrides),
# and a render that fails on the GPU path runs once more on swangle (software GL), which the rest of the run keeps.
#
# Parts (the master and the preview): the frames render in parts of up to --chunk-frames (default 240) from a
# bundle built once into out/render/<name>/ (or --bundle DIR, one you built with `npx remotion bundle`),
# one Remotion render at a time; each finished part is kept there, so a run stopped by a job limit
# (a shared machine's 10-minute cap) or a crash resumes where it stopped: rerun the same command. The
# bundle is rebuilt when the source of <Comp> changed since it was built: what scripts/render-key.cjs follows
# from the entry (the composition's component and its imports, Root.tsx, remotion.config.ts) and public/; an
# edit to src/sync.ts, a still or anything else the composition never imports keeps the bundle and every part.
# When it did change, render.sh names the files that changed and drops the parts, unless --redo A-B says the
# edit changes only frames A..B (one act's file, say): then the parts outside A..B are kept, the ones that
# overlap it re-render, and each re-rendered part is compared with the one it replaces outside A..B (8x8 blocks
# of a 480-wide luma decode, a mean difference over 4 levels is a change); a change there stops the run and the
# kept parts re-render next time. --max-min M
# stops starting parts once the next one would pass M minutes (from its measured pace) and exits 75 with
# the parts left; --part K renders part K alone and exits (a scheduler runs each part as its own job).
# The composition list is cached beside the bundle, so a rerun on a kept bundle starts its first part without
# `remotion compositions`. --join-only joins the parts already there (no bundle, no Remotion: a CPU-only job
# while another job holds the GPU), then muxes and gates as below; a missing part stops it with its --part K.
# Each part starts on an I-frame, whose quality step shows as a one-frame pop in a still hold, so every boundary moves
# back onto the latest cut in its part's last half (an act line or a declared seam in out/cues.json), and a part of
# 240 f or fewer holds no other I-frame (x264's keyframe interval is 250); a folder that already holds parts keeps
# their grid. When every part is there, ffmpeg joins them with the concat demuxer (stream copy, no re-encode) and
# writes the BT.709 colour tags into the stream and the container, then the mux and the gates below run.
# The parts stay after the join until every gate has passed, render.sh's own and then the film's (forensics,
# look-audit and the rest), so a gate failing after the join costs no re-render while src/ and public/ are
# unchanged: rerun the same command and it joins the kept parts. deliver.sh, which runs once every gate has
# passed, cleans them (--clean does it by hand); --keep keeps them always.
# --single renders the whole range in one Remotion call instead (the 1.1 route).
#
# Two paths at once (a slow machine): the parts are shared work. Each worker claims a part before it renders it (an
# atomic folder beside the parts, holding the worker's pid; a claim whose worker is gone is cleared), so two workers
# never render one part, and both write the same encode from the same bundle: the join stays a lossless stream copy,
# never a hand splice. --split runs a software-GL worker (--gl=swangle, on the CPU, from the last part backward) beside
# the GPU worker (the picked backend, from the first part forward) inside this one run. Without --split, a master whose
# first part shows the rest would take more than --split-after minutes (default 4; CINETIC_SPLIT_MIN) starts that CPU
# worker by itself (--no-split never does). --worker gpu|cpu runs one worker only (the GPU path forward, or software GL
# backward), so two jobs on a shared machine (one holding the GPU, one the CPU) split one master; whichever finishes
# the last part joins, muxes and gates. --cpu-concurrency N sets the software-GL worker's concurrency (default half the
# cores).
#
# Every mode then muxes the WAV with ffmpeg (AAC 320k, 48 kHz, +faststart; the audio is padded or
# trimmed to the picture) because Remotion's own AAC mux leaves ~2048 samples of encoder priming,
# i.e. audio 2-3 frames late. Then check-sync.py (lag <= 48 samples, true peak <= -1 dBTP after
# decode) and probe.py (size, fps, frame count, yuv420p, BT.709 tags, AAC 48 kHz) gate the file;
# reports go to out/qa/. Exit 0 = rendered and every gate passed, 1 = a step or gate failed, 75 =
# --max-min stopped it with parts left (rerun the same command to continue).
#
# Options:
#   --audio FILE        soundtrack (default public/audio/soundtrack.wav). Missing: a --draft or --preview plays the
#                       picked track alone (sound.mjs --bed-only), else renders silent (said, and out/qa/SILENT); a
#                       master stops before any frame and names the commands that write it; --from-draft never delivers
#                       a silent film
#   --no-audio          silent deliverable (loops): no mux, no sync check, probe expects no audio
#   --jpeg              a master through JPEG q95 frames instead of PNG (faster; only for a film with no soft grounds)
#   --loop              a seamless loop: every pass renders lossless PNG intermediates, because JPEG
#                       noise is smoothed by x264 between neighbours but not between the last frame
#                       and the first, which pushes the loop seam over its gate; check the seam with
#                       forensics.py --loop or deliver.sh --loop
#   --audio-offset F    film frame at which this composition starts (default: the --frames start;
#                       set it when rendering a per-act composition with sound)
#   --build-audio       rebuild the soundtrack first, through the project's npm scripts: with a licensed
#                       track (audio/score.json "music" is a track) `npm run music` (analyse, edit, write
#                       src/music.ts), then `npm run cues`, `npm run kit` (the earshot kit, cached),
#                       `npm run audio` (the effects plan, then the mix) and, with a track, `npm run
#                       credits` (the licence gate: a music film without a valid record stops here). A
#                       project without those scripts runs export-cues.ts, kit.py render and score.py
#   --policy P          blur policy for --blur: auto (default: LOOK.blur from out/cues.json, else camera),
#                       crisp (samples only inside CAMERA_BLUR ranges) or camera (every fast frame)
#   --entry FILE        Remotion entry point (default src/index.ts)
#   --sub ID            sub-frame composition for --blur (default <Comp>Sub)
#   --frames A-B        render only film frames A..B (inclusive); audio is taken from the same range
#   --chunk-frames N    frames per part at most (default 240, under x264's keyframe interval; boundaries on cuts); 0 or --single: one call
#   --max-min M         stop starting parts once the next would pass M minutes; exit 75 with parts left
#   --part K            render part K (0-based) alone and exit 0 (no join, no mux)
#   --redo A-B          (repeatable) the source changed only frames A..B: keep the parts outside them, re-render
#                       the ones that overlap, check the re-rendered parts match the old ones outside A..B
#   --join-only         join the parts in the parts folder (every one must be there), mux and gate; no bundle and
#                       no Remotion call (size and fps from the cached composition list or the parts themselves)
#   --parts DIR         where the bundle and the parts live (default out/render/<out name>)
#   --bundle DIR        render from this pre-built bundle (npx remotion bundle src/index.ts --out-dir DIR)
#   --single            the whole range in one Remotion render (no parts)
#   --split             render the parts on two paths at once: the GPU forward, software GL (CPU) backward
#   --no-split          never start the software-GL worker by itself on a slow machine
#   --split-after M     start it by itself when the parts left would take more than M minutes (default 4)
#   --worker gpu|cpu    run one worker only (the GPU path forward, or software GL backward); a second job runs the other
#   --cpu-concurrency N the software-GL worker's Remotion concurrency (default half the cores)
#   --clean             every gate has passed: remove the bundle and the parts of <out.mp4> (out/render/<name>,
#                       or --parts DIR) and exit; deliver.sh does this when its checks pass
#   --crf N             override the final CRF (preview 20, master 14, blur 14)
#   --10bit             (--blur) encode the master as yuv420p10le, High 10: the cleanest gradients and
#                       the smallest file, for masters that will be graded or re-encoded; ship 8-bit
#                       to the web, because many browsers and phones do not decode High 10
#   --concurrency N     Remotion concurrency (default: remotion.config.ts / Remotion default)
#   --samples FILE      where --blur writes the samples JSON (default out/samples.json)
#   --samples-from FILE reuse an existing samples JSON (skips the sharp render + measurement), e.g.
#                       the master's for a variant with identical timing
#   --budget X          cap the blur pass at X times the frame count (e.g. 6): the fastest frames get
#                       fewer samples and a shorter shutter; the capped frames are listed
#   --floor A-B:N       minimum samples over film frames A..B (repeatable; passed to measure-speed.py)
#   --accept-fast A-B   (--blur) frames A..B may exceed the speed ceiling (repeatable): only for frame-
#                       filling edges (a wipe, a flood, an iris, a zoom-through) checked at full size.
#                       Without it, moves listed as too fast for clean blur stop the render before the
#                       sub-frame pass: redesign them (a cut on the beat, a match cut, a shorter move)
#   --accept-cut A-B    (--blur) frames A..B may hold an unexplained full-frame change away from an act
#                       boundary (repeatable): a flood, a flash or a zoom-through you checked at full
#                       size. Without it, such a change stops the render before the sub-frame pass,
#                       because if it is a hard cut its sub-frames blend the two shots into one
#                       double-exposed frame: make the cut an ACT boundary in src/timeline.ts instead
#   --measure "ARGS"    extra measure-speed.py arguments, e.g. --measure "--max 64 --step 2"
#   --spec WxH@fps      extra expectation for probe.py (default: the composition's own size/fps,
#                       scaled by a --scale passed after --)
#   --no-check          skip check-sync.py and probe.py
#   --keep              keep the work directory (bundle, sharp.mp4, sub.mp4, picture.mp4), and the parts
#                       always (deliver.sh and later runs leave them; a run without --keep clears the mark)
#   -- ARGS             passed to every `remotion render` call (e.g. -- --image-format=png --scale=0.5)
#
# Needs: node/npx with @remotion/cli, ffmpeg >= 6, and for the gates Python with numpy scipy soundfile (opencv for
# --blur): $PYTHON when set, else the interpreter scripts/py.mjs picks, else one `node scripts/frames.mjs python` finds
# that imports them (it says which; set PYTHON to it). Without one, the film still renders and muxes; the sync and
# spec gates are skipped with a warning (a --blur master needs it).
# Run it from the project root (the folder holding src/index.ts); the other scripts are found
# next to this one.
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# Python: $PYTHON when it is set (the interpreter of a full environment; new-film.sh and npm's scripts/py.mjs
# honour it too), else the one scripts/py.mjs picks (python3, python or py -3, one that imports numpy first),
# so the Microsoft Store alias is never run. Paths go to it as arguments, never inside -c strings: Git Bash
# converts /e/... to E:/... only for arguments.
PYCMD=()
if [[ -n "${PYTHON:-}" ]]; then PYCMD=("$PYTHON")
else read -r -a PYCMD <<< "$(node "$SCRIPT_DIR/py.mjs" --which 2>/dev/null || echo python3)"; fi
python3() { "${PYCMD[@]}" "$@"; }
HAVE_PY=1
usage() { sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
die() { echo "render.sh: $*" >&2; exit 1; }
# bash's own clock (SECONDS): every $(date) is a process, and a process costs seconds on a busy machine
SECONDS=0
step() { echo "[render ${SECONDS}s] $*" >&2; }

COMP=""; OUT=""; MODE=master; JPEG=0; FROM_DRAFT=""; CHUNK_SET=0; AUDIO=public/audio/soundtrack.wav; NOAUDIO=0; AOFF=""; BUILD_AUDIO=0; POLICY=auto
ENTRY=src/index.ts; SUB=""; FRAMES=""; CRF=""; CONC=""; SAMPLES=out/samples.json; SAMPLES_FROM=""
SPEC=""; NOCHECK=0; KEEP=0; CLEAN=0; MS_ARGS=(); EXTRA=(); BUDGET=""; TENBIT=0; LOOP=0; ACCEPT_FAST=""; ACCEPT_CUT=""
CHUNK=240; MAXMIN=0; ONLY_PART=""; PARTS=""; PREBUILT=""; SINGLE=0; REDO=""; JOIN_ONLY=0
SPLIT=auto; SPLIT_MIN=${CINETIC_SPLIT_MIN:-4}; WORKER=""; CPU_CONC=""
POS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --preview) MODE=preview ;;
    --draft) MODE=draft ;;
    --jpeg) JPEG=1 ;;
    --from-draft) FROM_DRAFT=${2:?--from-draft needs the draft video}; shift ;;
    --blur) MODE=blur ;;
    --master) MODE=master ;;
    --audio) AUDIO=${2:?--audio needs a file}; shift ;;
    --no-audio) NOAUDIO=1 ;;
    --loop) LOOP=1 ;;
    --accept-fast) ACCEPT_FAST="$ACCEPT_FAST ${2:?}"; shift ;;
    --accept-cut) ACCEPT_CUT="$ACCEPT_CUT ${2:?}"; shift ;;
    --audio-offset) AOFF=${2:?}; shift ;;
    --build-audio) BUILD_AUDIO=1 ;;
    --policy) POLICY=${2:?--policy needs auto, crisp or camera}; shift ;;
    --entry) ENTRY=${2:?}; shift ;;
    --sub) SUB=${2:?}; shift ;;
    --frames) FRAMES=${2:?}; shift ;;
    --chunk-frames) CHUNK=${2:?--chunk-frames needs a number}; CHUNK_SET=1; shift ;;
    --max-min) MAXMIN=${2:?--max-min needs minutes}; shift ;;
    --part) ONLY_PART=${2:?--part needs an index}; shift ;;
    --redo) [[ "${2:-}" =~ ^[0-9]+-[0-9]+$ ]] || die "--redo wants A-B, the film frames the edit changes"; REDO="$REDO $2"; shift ;;
    --join-only) JOIN_ONLY=1 ;;
    --parts) PARTS=${2:?--parts needs a folder}; shift ;;
    --bundle) PREBUILT=${2:?--bundle needs a folder}; shift ;;
    --single) SINGLE=1 ;;
    --split) SPLIT=on ;;
    --no-split) SPLIT=off ;;
    --split-after) SPLIT_MIN=${2:?--split-after needs minutes}; shift ;;
    --worker) WORKER=${2:?--worker needs gpu or cpu}; shift ;;
    --cpu-concurrency) CPU_CONC=${2:?--cpu-concurrency needs a number}; shift ;;
    --crf) CRF=${2:?}; shift ;;
    --10bit) TENBIT=1 ;;
    --concurrency) CONC=${2:?}; shift ;;
    --samples) SAMPLES=${2:?}; shift ;;
    --samples-from) SAMPLES_FROM=${2:?}; shift ;;
    --budget) BUDGET=${2:?--budget needs a multiple, e.g. 6}; MS_ARGS+=(--budget "$BUDGET"); shift ;;
    --floor) MS_ARGS+=(--floor "${2:?}"); shift ;;
    --measure) read -r -a _m <<< "${2:?}"; MS_ARGS+=(${_m[@]+"${_m[@]}"}); shift ;;
    --spec) SPEC=${2:?}; shift ;;
    --no-check) NOCHECK=1 ;;
    --keep) KEEP=1 ;;
    --clean) CLEAN=1 ;;
    --) shift; EXTRA=("$@"); break ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) POS+=("$1") ;;
  esac
  shift
done
[[ ${#POS[@]} -eq 2 ]] || usage 1
case "$POLICY" in auto|crisp|camera) ;; *) die "--policy is auto, crisp or camera (got $POLICY)" ;; esac
[[ $TENBIT -eq 0 || $MODE == blur ]] || die "--10bit applies to --blur masters (accumulate.py encodes them)"
COMP=${POS[0]}; OUT=${POS[1]}
[[ "$CHUNK" =~ ^[0-9]+$ ]] || die "--chunk-frames wants a whole number of frames"
[[ "$MAXMIN" =~ ^[0-9]+([.][0-9]+)?$ ]] || die "--max-min wants minutes"
# the limit in seconds, once; over_limit N: the next part of N frames (at the last part's pace per frame, plus 15 %)
# would end past it
MAXSEC=$(( ${MAXMIN%%.*} * 60 )); [[ "$MAXMIN" == *.* ]] && MAXSEC=$(awk -v m="$MAXMIN" 'BEGIN { printf "%d", m * 60 }')
LAST_S=0; LAST_N=0
over_limit() { local est=$LAST_S; (( LAST_N > 0 && ${1:-0} > 0 )) && est=$(( LAST_S * $1 / LAST_N )); (( 100 * SECONDS + 115 * est > 100 * MAXSEC )); }
[[ -z "$ONLY_PART" || "$ONLY_PART" =~ ^[0-9]+$ ]] || die "--part wants a 0-based index"
[[ -z "$WORKER" || "$WORKER" == gpu || "$WORKER" == cpu ]] || die "--worker takes gpu or cpu"
[[ -z "$WORKER" || ( $MODE != blur && $SINGLE -eq 0 && -z "$ONLY_PART" && $JOIN_ONLY -eq 0 ) ]] || die "--worker renders the parts of a draft, a preview or a master (not --blur, --single, --part or --join-only)"
[[ -z "$CPU_CONC" || "$CPU_CONC" =~ ^[0-9]+$ ]] || die "--cpu-concurrency wants a number"
# a draft: parts of up to 450 frames (each part pays a browser start; its quality steps do not matter in a draft)
[[ $MODE == draft && $CHUNK_SET -eq 0 ]] && CHUNK=450
[[ "$CHUNK" -eq 0 ]] && SINGLE=1
[[ $JOIN_ONLY -eq 0 || ( $MODE != blur && $SINGLE -eq 0 && -z "$ONLY_PART" ) ]] || die "--join-only joins the parts of a preview or a master (not --blur, --single or --part)"

# project root: the current folder if it has the entry, else the folder above this script
if [[ ! -f "$ENTRY" ]]; then
  if [[ -f "$SCRIPT_DIR/../$ENTRY" ]]; then cd "$SCRIPT_DIR/.."; else die "no $ENTRY here; run from the project root or pass --entry"; fi
fi
ROOT=$(pwd)
# The project's Remotion CLI, run by node itself: `npx remotion` starts npm first, 5-20 s on every call (18 s measured
# on a busy laptop, against 4 s for node on the CLI file), and a master runs one call per part. npx when unresolvable.
REMOTION_JS=$(node -e 'try { const p = require.resolve("@remotion/cli/package.json", { paths: [process.cwd()] }); const b = require(p).bin;
const js = require("path").join(require("path").dirname(p), typeof b === "string" ? b : b.remotion); if (require("fs").existsSync(js)) console.log(js) } catch {}' 2>/dev/null || true)
remotion() { if [[ -n "$REMOTION_JS" ]]; then node "$REMOTION_JS" "$@"; else npx remotion "$@"; fi; }
# The bundle: scripts/frames.mjs keeps one per state of the source in out/.bundle/ (the stills and sheets of the session
# built it already, most of the time); render.sh renders from its own frozen copy of it. It bundles here itself when
# frames.mjs is missing (an older project), the project's own CLI cannot be resolved, or frames.mjs fails.
FASTPATH=0; [[ -n "$REMOTION_JS" && -f "$SCRIPT_DIR/frames.mjs" ]] && FASTPATH=1
bundle_to() {
  if [[ $FASTPATH -eq 1 ]] && node "$SCRIPT_DIR/frames.mjs" bundle --entry "$ENTRY" --copy-to "$1" --quiet >/dev/null; then return 0; fi
  remotion bundle "$ENTRY" --out-dir "$1" --log=error >/dev/null
}
if [[ $CLEAN -eq 1 ]]; then  # every gate has passed: the kept bundle and parts go
  P=${PARTS:-out/render/$(basename "${OUT%.*}")}
  [[ -d "$P" ]] || { echo "render.sh: no parts at $P" >&2; exit 0; }
  [[ -f "$P/bundle.key" || -n "$(find "$P" -maxdepth 1 -name 'part-*.mp4' 2>/dev/null | head -1)" ]] \
    || die "$P holds no render parts (no bundle.key, no part-*.mp4): not removing it"
  rm -rf "$P"
  echo "render.sh: removed the bundle and the parts in $P" >&2
  exit 0
fi
if [[ -n "$FROM_DRAFT" ]]; then
  # The delivery when the final cannot finish: the whole draft at the composition's size. The size comes from the
  # composition list a render or a sheet cached (out/render/*/compositions.txt, out/.bundle/*/.compositions.txt), else
  # twice the draft's (a draft renders at half size); --spec WxH@fps says it outright.
  [[ -f "$FROM_DRAFT" ]] || die "--from-draft $FROM_DRAFT not found (render the draft first: bash scripts/render.sh $COMP out/draft.mp4 --draft)"
  for tool in ffmpeg ffprobe; do command -v "$tool" >/dev/null || die "$tool not found on PATH"; done
  mkdir -p "$(dirname "$OUT")" out/qa
  OUT_ABS=$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")
  read -r DW DH DFPS <<< "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$FROM_DRAFT" | awk -F, '{ split($3, r, "/"); printf "%s %s %g", $1, $2, r[1] / (r[2] ? r[2] : 1) }')"
  TW=""; TH=""
  if [[ "$SPEC" =~ ^([0-9]+)x([0-9]+) ]]; then TW=${BASH_REMATCH[1]}; TH=${BASH_REMATCH[2]}
  else
    LISTF=$(ls -t out/render/*/compositions.txt out/.bundle/*/.compositions.txt 2>/dev/null | head -1 || true)
    if [[ -n "$LISTF" ]]; then read -r TW TH <<< "$(awk -v id="$COMP" '$1 == id && $3 ~ /^[0-9]+x[0-9]+$/ { split($3, s, "x"); print s[1], s[2]; exit }' "$LISTF")"; fi
    [[ -n "$TW" ]] || { TW=$((DW * 2)); TH=$((DH * 2)); }
  fi
  step "--from-draft: $FROM_DRAFT (${DW}x${DH}) scaled to ${TW}x${TH} as the delivery (the whole film; the final did not finish)"
  AIN=(); AMAP=(-map 0:a:0?)
  if [[ $NOAUDIO -eq 0 && -f "$AUDIO" ]]; then AIN=(-i "$AUDIO"); AMAP=(-map 1:a:0); fi
  # a delivery is never silent: a draft with no sound and no soundtrack to mux stops here (--no-audio for a silent loop)
  if [[ $NOAUDIO -eq 0 && ${#AIN[@]} -eq 0 && -z "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$FROM_DRAFT")" ]]; then
    die "--from-draft: $FROM_DRAFT has no sound and there is no $AUDIO to mux: a delivery is never silent (npm run sound, then rerun; --no-audio only for a silent loop)"
  fi
  DDUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FROM_DRAFT")
  ACODEC=(-c:a aac -b:a 320k -ar 48000 -ac 2)
  [[ $NOAUDIO -eq 1 ]] && { AMAP=(); ACODEC=(-an); }
  ffmpeg -v error -y -i "$FROM_DRAFT" ${AIN[@]+"${AIN[@]}"} -map 0:v:0 ${AMAP[@]+"${AMAP[@]}"} \
    -vf "scale=${TW}:${TH}:flags=lanczos,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv" -c:v libx264 -crf "${CRF:-16}" -preset medium \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv ${ACODEC[@]+"${ACODEC[@]}"} -t "$DDUR" -movflags +faststart "$OUT_ABS" \
    || die "ffmpeg could not scale the draft"
  if [[ $NOCHECK -eq 0 ]] && python3 -c "import numpy" >/dev/null 2>&1; then
    PARGS=(--spec "${TW}x${TH}@${DFPS%.000}" --json "out/qa/probe-$(basename "${OUT%.*}").json" --no-loudness)
    [[ $NOAUDIO -eq 1 || ( ${#AIN[@]} -eq 0 && -z "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$FROM_DRAFT")" ) ]] && PARGS+=(--audio none)
    python3 "$SCRIPT_DIR/probe.py" "$OUT_ABS" "${PARGS[@]}" >/dev/null || echo "render.sh: warning: probe.py flagged the scaled draft (out/qa/probe-*.json)" >&2
  fi
  step "done: $OUT is the whole film from the draft, scaled up (render the final again when there is time: the parts kept in out/render resume)"
  exit 0
fi
for tool in npx ffmpeg ffprobe; do command -v "$tool" >/dev/null || die "$tool not found on PATH"; done
# the Python modules this run needs, checked before a minute of bundling (the Store alias and an
# interpreter without numpy both fail here, not after the frames)
PYMODS=numpy
[[ $NOCHECK -eq 0 && $NOAUDIO -eq 0 || $BUILD_AUDIO -eq 1 ]] && PYMODS="$PYMODS, scipy, soundfile"
[[ $MODE == blur ]] && PYMODS="$PYMODS, cv2"
# The modules are checked beside the frames (one Python start with scipy costs 10-30 s on a busy machine), and settled
# before the gates; a --blur master, --build-audio and --redo need Python before any frame, so they settle now.
PYCHECK_FILE="${TMPDIR:-/tmp}/cinetic-pycheck.$$"
PYCHECK_PID=""
py_check() { if python3 -c "import $PYMODS" >/dev/null 2>&1; then echo ok > "$PYCHECK_FILE"; else echo miss > "$PYCHECK_FILE"; fi; }
py_settle() {
  if [[ -n "$PYCHECK_PID" ]]; then wait "$PYCHECK_PID" 2>/dev/null || true; PYCHECK_PID=""; fi
  [[ -f "$PYCHECK_FILE" ]] || return 0
  local got; got=$(< "$PYCHECK_FILE"); rm -f "$PYCHECK_FILE"
  [[ "$got" == ok ]] && return 0
  # the pick misses a module: another interpreter on this machine may have them all (frames.mjs python asks each
  # once and caches the answer); else the frames still render and the gates that need Python are skipped
  local ALT=""
  if [[ -z "${PYTHON:-}" ]]; then ALT=$(node "$SCRIPT_DIR/frames.mjs" python --need "${PYMODS//, /,}" --print 2>/dev/null || true); fi
  if [[ -n "$ALT" ]]; then
    read -r -a PYCMD <<< "${ALT//\"/}"
    [[ "$ALT" == *\"* ]] && PYCMD=("${ALT//\"/}")
    echo "render.sh: ${PYTHON:-the default Python} misses one of $PYMODS; using $ALT, which has them (export PYTHON=$ALT to skip this search)" >&2
  elif [[ $MODE == blur ]]; then
    die "no Python here imports $PYMODS (a --blur master needs them): node scripts/frames.mjs python says what each interpreter misses and the pip line"
  else
    HAVE_PY=0
    echo "render.sh: warning: no Python here imports $PYMODS: the film renders and muxes, but the sync and spec gates are skipped (node scripts/frames.mjs python says what to install or which interpreter to set as PYTHON)" >&2
  fi
}
if [[ $MODE == blur || $BUILD_AUDIO -eq 1 || -n "$REDO" ]]; then py_check; py_settle
else py_check & PYCHECK_PID=$!; fi
mkdir -p "$(dirname "$OUT")" out/qa
OUT_ABS=$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")
NAME=$(basename "${OUT%.*}")

if [[ $BUILD_AUDIO -eq 1 && $NOAUDIO -eq 0 ]]; then
  # the npm scripts of the project (music, cues, kit, audio, credits), else the scripts themselves
  has_script() { [[ -f package.json ]] && node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts[process.argv[1]]?0:1)" "$1"; }
  MUSIC_LED=0
  if [[ -f audio/score.json ]] && node -e "const s=JSON.parse(require('fs').readFileSync('audio/score.json','utf8'));process.exit(s.music&&typeof s.music==='object'?0:1)"; then MUSIC_LED=1; fi
  if has_script cues && has_script audio; then
    step "rebuilding the soundtrack (npm run$([[ $MUSIC_LED -eq 1 ]] && echo ' music,') cues, kit, audio$([[ $MUSIC_LED -eq 1 ]] && echo ', credits'))"
    if [[ $MUSIC_LED -eq 1 ]]; then
      has_script music || die "--build-audio: audio/score.json plays a track but package.json has no music script"
      npm run --silent music >&2 || die "npm run music failed (track analysis, edit or grid)"
    fi
    npm run --silent cues >&2 || die "npm run cues failed"
    if [[ -f audio/kit.json ]] && has_script kit; then
      npm run --silent kit >&2 || echo "render.sh: the kit was not rendered (above); the mix uses the takes already in audio/kit" >&2
    fi
    npm run --silent audio >&2 || die "npm run audio failed (the effects plan or the mix; see out/qa/score.json)"
    if [[ "$AUDIO" != public/audio/soundtrack.wav && -f public/audio/soundtrack.wav ]]; then
      mkdir -p "$(dirname "$AUDIO")"; cp public/audio/soundtrack.wav "$AUDIO"
    fi
    if [[ $MUSIC_LED -eq 1 ]]; then
      has_script credits || die "--build-audio: a music film needs the credits script (the licence gate)"
      npm run --silent credits >&2 || die "the licence gate refused the music (npm run credits): no film leaves without a valid record and its credits"
    fi
  else
    [[ -f "$SCRIPT_DIR/export-cues.ts" && -f "$SCRIPT_DIR/audio/score.py" ]] || die "--build-audio needs scripts/export-cues.ts and scripts/audio/score.py"
    step "rebuilding cues and soundtrack"
    npx tsx "$SCRIPT_DIR/export-cues.ts" >&2
    # the earshot kit first (cached: seconds when nothing changed)
    if [[ -f audio/kit.json && -f "$SCRIPT_DIR/audio/kit.py" ]]; then
      python3 "$SCRIPT_DIR/audio/kit.py" render >&2 || echo "render.sh: the kit was not rendered (above); score.py uses the takes already in audio/kit" >&2
    fi
    python3 "$SCRIPT_DIR/audio/score.py" --cues out/cues.json --score audio/score.json --out "$AUDIO" --stems out/stems --json out/qa/score.json >&2
  fi
fi
SILENT=0
if [[ $NOAUDIO -eq 0 && ! -f "$AUDIO" && -z "$FROM_DRAFT" ]]; then
  if [[ $MODE == draft || $MODE == preview ]]; then
    # a film is never looked at silent once its track is picked: the edited track alone (sound.mjs --bed-only: no cues or
    # kit needed) plays under the draft until npm run sound mixes the effects in
    TRACK=$(ls audio/music/*.{mp3,wav,m4a,flac,ogg,aac} 2>/dev/null | grep -v -- '-edit\.' | head -1 || true)
    if [[ -n "$TRACK" && -f scripts/sound.mjs && "$AUDIO" == public/audio/soundtrack.wav ]]; then
      step "no soundtrack yet: the track alone under this $MODE (node scripts/sound.mjs --bed-only; npm run sound mixes the effects in)"
      node scripts/sound.mjs --bed-only --quiet >&2 || echo "render.sh: the bed could not be cut (above)" >&2
    fi
    if [[ ! -f "$AUDIO" ]]; then
      echo "render.sh: no soundtrack at $AUDIO and no track in audio/music: this $MODE is SILENT. Every film is music-led: pick the track now (node scripts/music.mjs pick --mood \"<words>\" --length <s>, then get '#n' --to audio/music), then npm run sound" >&2
      NOAUDIO=1; SILENT=1
    fi
  else
    die "soundtrack $AUDIO not found: write it first (npm run cues && npm run kit && npm run audio, or rerun with --build-audio), pass --audio FILE, or --no-audio for a silent film"
  fi
fi
if [[ $NOAUDIO -eq 0 && -z "$FROM_DRAFT" ]]; then
  [[ -f "$AUDIO" ]] || die "soundtrack $AUDIO not found (build it, pass --audio FILE, or --no-audio for a silent film)"
  newer=$(find src -type f -newer "$AUDIO" 2>/dev/null | head -1 || true)
  [[ -z "$newer" ]] || echo "render.sh: warning: $newer is newer than $AUDIO; if timing changed, rerun cues + audio (or pass --build-audio)" >&2
fi

WORK=$(mktemp -d "${TMPDIR:-/tmp}/cinetic-render.XXXXXX")
if [[ $KEEP -eq 1 ]]; then echo "render.sh: keeping work files in $WORK" >&2; else trap 'rm -rf "$WORK"' EXIT; fi

touch "$WORK/.bundled"
# public/ as the frames see it: every folder but public/audio (the soundtrack is muxed by ffmpeg; Remotion renders
# muted), so writing a new mix never rebuilds the bundle or drops a rendered part
PUBDIRS=()
for d in public/*/; do [[ -d "$d" && "$d" != public/audio/ ]] && PUBDIRS+=("${d%/}"); done
for f in public/*; do [[ -f "$f" ]] && PUBDIRS+=("$f"); done   # top-level files of public/ too (keyed by path and size)
# the parts route keeps its bundle and parts in a folder of the project, so a stopped run resumes
CHUNKED=0; [[ $MODE != blur && $SINGLE -eq 0 ]] && CHUNKED=1
PARTS=${PARTS:-out/render/$NAME}
[[ $CHUNKED -eq 1 ]] && mkdir -p "$PARTS"
# parts.keys: one line per part, "<file> <the source key of the bundle it was rendered from>"; redo.kept: the parts a
# --redo run kept from before the edit, until every re-rendered part has matched its old one outside the frames named
SRC_KEY=""; KEYS="$PARTS/parts.keys"; KEPT_LIST="$PARTS/redo.kept"
part_key() { if [[ -f "$KEYS" ]]; then awk -v f="$(basename "$1")" '$1 == f { print $2; exit }' "$KEYS"; fi; return 0; }
set_part_key() {
  # two workers (--split, --worker) write it: one at a time under an atomic lock (a lock older than 30 s is a dead writer's)
  local f i=0; f=$(basename "$1")
  while ! mkdir "$KEYS.lock" 2>/dev/null; do
    i=$((i + 1)); if [[ $i -ge 300 ]]; then rmdir "$KEYS.lock" 2>/dev/null || true; i=0; fi
    sleep 0.1
  done
  if [[ -f "$KEYS" ]]; then awk -v f="$f" '$1 != f' "$KEYS" > "$KEYS.tmp"; else : > "$KEYS.tmp"; fi
  if [[ -n "$2" ]]; then echo "$f $2" >> "$KEYS.tmp"; fi
  mv -f "$KEYS.tmp" "$KEYS"
  rmdir "$KEYS.lock" 2>/dev/null || true
}
# a part is current when it was rendered from this source (a pre-built --bundle or --join-only trusts the folder)
part_current() { if [[ -z "$SRC_KEY" ]]; then return 0; fi; [[ "$(part_key "$1")" == "$SRC_KEY" ]]; }
in_redo() { local r; for r in $REDO; do if (( $1 <= ${r#*-} && $2 >= ${r%-*} )); then return 0; fi; done; return 1; }
old_parts() { find "$PARTS" -maxdepth 1 -name 'part-*.mp4' ! -name '*.tmp.mp4' ! -name '*.old.mp4' 2>/dev/null | sort; }
if [[ $JOIN_ONLY -eq 1 ]]; then
  [[ -d "$PARTS" ]] || die "--join-only: no parts folder $PARTS (render.sh writes it; --parts DIR names another)"
  B=""
  if [[ -f "$PARTS/bundle.key" ]]; then
    now=$(node "$SCRIPT_DIR/render-key.cjs" --entry "$ENTRY" --comp "$COMP" ${PUBDIRS[@]+"${PUBDIRS[@]}"} 2>/dev/null || true)
    [[ -z "$now" || "$now" == "$(cat "$PARTS/bundle.key")" ]] || echo "render.sh: warning: the source of $COMP changed since these parts' bundle was built; the joined film shows it as it was" >&2
  fi
  step "--join-only: joining the parts in $PARTS (no bundle, no Remotion)"
elif [[ -n "$PREBUILT" ]]; then
  [[ -f "$PREBUILT/index.html" ]] || die "--bundle $PREBUILT is not a Remotion bundle (no index.html)"
  B=$(cd "$PREBUILT" && pwd)
  step "pre-built bundle: $B"
elif [[ $CHUNKED -eq 1 ]]; then
  # the source's fingerprint: what the composition can depend on (scripts/render-key.cjs) and public/ (path, size)
  SRC_KEY=$(node "$SCRIPT_DIR/render-key.cjs" --entry "$ENTRY" --comp "$COMP" --manifest "$PARTS/manifest.new.json" ${PUBDIRS[@]+"${PUBDIRS[@]}"}) || die "could not fingerprint the source of $COMP"
  if [[ -f "$PARTS/bundle/index.html" && "$(cat "$PARTS/bundle.key" 2>/dev/null)" == "$SRC_KEY" ]]; then
    step "reusing the bundle in $PARTS (the source of $COMP and public/ unchanged since it was built)"
    [[ -z "$REDO" ]] || step "--redo$REDO has nothing to do: the source is the one the bundle was built from"
    mv -f "$PARTS/manifest.new.json" "$PARTS/manifest.json"
    if [[ ! -f "$KEYS" ]]; then for p in $(old_parts); do set_part_key "$p" "$SRC_KEY"; done; fi  # a folder from before the record
  else
    OLD=$(old_parts)
    if [[ -d "$PARTS/bundle" || -n "$OLD" ]]; then
      CHANGED=$(node -e '
const fs = require("fs"); const [a, b] = process.argv.slice(1).map((p) => JSON.parse(fs.readFileSync(p, "utf8")));
const A = a.files || {}, B = b.files || {};
const ch = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) => A[k] !== B[k]).sort();
console.log(ch.length ? ch.slice(0, 8).map((k) => k + (A[k] === undefined ? " (new)" : B[k] === undefined ? " (gone)" : "")).join(", ") + (ch.length > 8 ? `, and ${ch.length - 8} more` : "") : `the reach of the key changed (${a.mode} -> ${b.mode})`);' "$PARTS/manifest.json" "$PARTS/manifest.new.json" 2>/dev/null || echo "(no manifest of the last bundle to compare)")
      step "the source of $COMP changed since the last bundle: $CHANGED"
    fi
    if [[ -n "$REDO" && -n "$OLD" ]]; then
      : > "$KEPT_LIST"
      kept=0
      for p in $OLD; do
        nm=$(basename "$p"); [[ "$nm" =~ ^part-([0-9]+)-([0-9]+)\.mp4$ ]] || continue
        if in_redo "$((10#${BASH_REMATCH[1]}))" "$((10#${BASH_REMATCH[2]}))"; then mv -f "$p" "${p%.mp4}.old.mp4"; set_part_key "$p" ""
        else set_part_key "$p" "$SRC_KEY"; echo "$nm" >> "$KEPT_LIST"; kept=$((kept + 1)); fi
      done
      step "--redo$REDO: kept $kept part(s) outside those frames; the ones that overlap them re-render and are checked against the old ones outside them"
    else
      [[ -n "$OLD" ]] && step "dropping the parts (when the edit changes only some frames, rerun with --redo A-B to keep the others)"
      rm -f "$PARTS"/part-*.mp4 "$KEYS" "$KEPT_LIST"
    fi
    rm -rf "$PARTS/bundle" "$PARTS/bundle.key" "$PARTS/compositions.txt"
    [[ -f "$KEYS" ]] || : > "$KEYS"
    step "bundling $ENTRY into $PARTS/bundle"
    bundle_to "$PARTS/bundle" || die "bundle failed"
    echo "$SRC_KEY" > "$PARTS/bundle.key"
    mv -f "$PARTS/manifest.new.json" "$PARTS/manifest.json"
  fi
  B=$(cd "$PARTS/bundle" && pwd)
else
  step "bundling $ENTRY"
  bundle_to "$WORK/bundle" || die "bundle failed"
  B="$WORK/bundle"
fi
# the composition list: cached beside the parts per bundle, so a rerun on a kept bundle skips `remotion compositions`
CACHE=""; [[ $CHUNKED -eq 1 ]] && CACHE="$PARTS/compositions.txt"
if [[ $JOIN_ONLY -eq 1 ]]; then
  LIST=""; [[ -f "$CACHE" ]] && LIST=$(tail -n +2 "$CACHE")
else
  step "frozen bundle: $B (every pass renders from it; edits to src/ from now on are not in this render)"
  CKEY="bundle $(node -e 'const s = require("fs").statSync(process.argv[1]); console.log(`${s.size}:${Math.round(s.mtimeMs)}`)' "$B/index.html")"
  if [[ -n "$CACHE" && -f "$CACHE" && "$(head -1 "$CACHE")" == "$CKEY" ]]; then
    LIST=$(tail -n +2 "$CACHE")
  elif [[ -s "$B/.compositions.txt" ]]; then  # listed by scripts/frames.mjs when it built this bundle (a sheet or the gl probe)
    LIST=$(cat "$B/.compositions.txt")
    if [[ -n "$CACHE" ]]; then { echo "$CKEY"; echo "$LIST"; } > "$CACHE"; fi
  else
    LIST=$(remotion compositions "$B" 2>/dev/null) || die "could not list compositions"
    if [[ -n "$CACHE" ]]; then { echo "$CKEY"; echo "$LIST"; } > "$CACHE"; fi
  fi
fi
meta() { awk -v id="$1" '$1 == id && $2 ~ /^[0-9.]+$/ && $3 ~ /^[0-9]+x[0-9]+$/ { print $2, $3, $4; exit }' <<< "$LIST"; }
read -r FPS SIZE TOTAL <<< "$(meta "$COMP")" || true
FIRST_PART=""
if [[ $JOIN_ONLY -eq 1 ]]; then
  FIRST_PART=$(old_parts | head -1)
  [[ -n "$FIRST_PART" ]] || die "--join-only: no parts in $PARTS"
  if [[ -z "${FPS:-}" ]]; then  # no cached list (parts rendered by hand): the parts' own size and rate, the film's length from out/cues.json
    FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$FIRST_PART" | node -e 'const [n, d] = require("fs").readFileSync(0, "utf8").trim().split("/").map(Number); console.log(+(n / (d || 1)).toFixed(3))')
    SIZE=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$FIRST_PART")
    TOTAL=$(node -e 'try { console.log(JSON.parse(require("fs").readFileSync("out/cues.json", "utf8")).total || "") } catch { console.log("") }')
    if [[ -z "$TOTAL" ]]; then [[ -n "$FRAMES" ]] && TOTAL=$(( ${FRAMES#*-} + 1 )) || die "--join-only: no cached composition list and no out/cues.json total; pass --frames A-B"; fi
  fi
fi
if [[ -z "${FPS:-}" ]]; then
  ids=$(awk '$2 ~ /^[0-9.]+$/ && $3 ~ /x/ {printf "%s ", $1}' <<< "$LIST")
  die "no video composition '$COMP' (stills render with 'npx remotion still'). Available: $ids"
fi

# The file's size: a --scale passed through to Remotion (-- --scale=0.5) scales each side, made even the way
# Remotion makes it for H.264, so probe expects that size and a half-size preview passes its own gate
SCALE=""; _prev=""
for _a in ${EXTRA[@]+"${EXTRA[@]}"}; do
  case "$_a" in --scale=*) SCALE=${_a#--scale=} ;; esac
  [[ "$_prev" == --scale ]] && SCALE=$_a
  _prev=$_a
done
OUTSIZE=$SIZE
if [[ -n "$SCALE" ]]; then
  OUTSIZE=$(node -e 'const [w, h] = process.argv[1].split("x").map(Number), s = Number(process.argv[2]);
if (!(s > 0)) process.exit(1);
const side = (d) => { while (Math.round(d * s) % 2) d--; return Math.round(d * s); };
console.log(`${side(w)}x${side(h)}`);' "$SIZE" "$SCALE") || die "--scale wants a positive number (got $SCALE)"
fi
# --join-only: the probe expects the size the parts were rendered at, whatever --scale rendered them
[[ $JOIN_ONLY -eq 1 ]] && OUTSIZE=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$FIRST_PART")

FROM=0; TO=$((TOTAL - 1)); RANGE=()
if [[ -n "$FRAMES" ]]; then
  [[ "$FRAMES" =~ ^([0-9]+)-([0-9]+)$ ]] || die "--frames wants A-B, e.g. 600-839"
  FROM=${BASH_REMATCH[1]}; TO=${BASH_REMATCH[2]}
  (( FROM <= TO && TO < TOTAL )) || die "--frames $FRAMES outside $COMP (0-$((TOTAL - 1)))"
  RANGE=(--frames="$FROM-$TO")
fi
N=$((TO - FROM + 1))
DUR=$(awk -v n="$N" -v f="$FPS" 'BEGIN { printf "%.3f", n / f }')
AOFF=${AOFF:-$FROM}
AOFF_S=$(awk -v n="$AOFF" -v f="$FPS" 'BEGIN { printf "%.6f", n / f }')
# Remotion refuses a concurrency above the cores it sees (the lower of nproc, which honours OMP_NUM_THREADS,
# and node's availableParallelism): clamp to them here, not after a failed render
clamp_conc() {
  local cores np
  cores=$(node -e "const o=require('os');console.log(o.availableParallelism?o.availableParallelism():o.cpus().length)")
  np=$(nproc 2>/dev/null || echo "$cores"); [[ "$np" =~ ^[0-9]+$ ]] && (( np < cores )) && cores=$np
  if [[ "$CONC" =~ ^[0-9]+$ ]] && (( CONC > cores )); then
    echo "$1: --concurrency $CONC is above the $cores core(s) Remotion sees here; using $cores" >&2; CONC=$cores
  fi
  return 0
}
# a draft renders at half size unless -- --scale=S says otherwise (the probe expects the scaled size)
if [[ $MODE == draft && -z "$SCALE" ]]; then SCALE=0.5; EXTRA+=(--scale=0.5)
  OUTSIZE=$(node -e 'const [w, h] = process.argv[1].split("x").map(Number); const side = (d) => { while (Math.round(d * 0.5) % 2) d--; return Math.round(d * 0.5); }; console.log(`${side(w)}x${side(h)}`)' "$SIZE"); fi
RARGS=(--muted --log=error)
# a master's frames go through lossless PNG: lit grounds band through JPEG q95 (plateaus over a tenth of a pale frame)
if [[ $MODE == master && $JPEG -eq 0 && " ${EXTRA[*]-} " != *" --image-format"* ]]; then RARGS+=(--image-format=png); fi
[[ -n "$CONC" ]] && clamp_conc render.sh && RARGS+=(--concurrency="$CONC")
[[ $LOOP == 1 ]] && RARGS+=(--image-format=png)
RARGS+=(${EXTRA[@]+"${EXTRA[@]}"})
# The GL backend: a --gl passed after -- wins, then CINETIC_GL, then the one scripts/frames.mjs measured fastest among
# the backends that draw the same pixels as software GL here (probed once per machine, cached in out/.bundle/gl.json and ~/.cinetic/gl.json)
GL=""; GL_AUTO=0
if [[ $JOIN_ONLY -eq 0 && $FASTPATH -eq 1 && " ${EXTRA[*]-} " != *" --gl"* ]]; then
  # a draft takes the machine's cached pick (or the config's backend) and never waits for the probe; a master probes once
  if [[ $MODE == draft ]]; then GL=${CINETIC_GL:-$(node "$SCRIPT_DIR/frames.mjs" gl --cached 2>/dev/null || true)}
  else GL=${CINETIC_GL:-$(node "$SCRIPT_DIR/frames.mjs" gl --bundle "$B" --comp "$COMP" --quiet 2>/dev/null || true)}; fi
  if [[ -n "$GL" ]]; then RARGS+=(--gl="$GL"); GL_AUTO=1; step "GL backend: $GL (scripts/frames.mjs gl; CINETIC_GL or -- --gl=X overrides)"; fi
fi
# a film with a WebGL hero shot (fx/three) draws its flat 2D twin on software GL: say so, so a review of this render
# does not judge the 3D shot by its fallback (the master wants a hardware backend: --gl=angle where the machine has one)
if [[ ( "$GL" == swangle || " ${EXTRA[*]-} " == *"--gl=swangle"* ) ]] && grep -rqs --include=*.ts --include=*.tsx "fx/three" src; then
  echo "render.sh: note: the film uses fx/three and this render runs on software GL: its 3D shots draw their flat 2D fallback here" >&2
fi
# rrender ARGS: `remotion render ARGS`; when the picked backend fails on the GPU path (the browser or its GPU process
# died, a lost GL context, a hung frame), the call runs once more on swangle (software GL, slower, always draws) and
# the rest of the run stays on it. An error in the film's own code fails the same way on every backend: no retry.
rrender() {
  local err="$WORK/remotion-err.txt" rc=0 x a=() r=()
  remotion render "$@" 2>"$err" || rc=$?
  cat "$err" >&2
  if [[ $rc -ne 0 && $GL_AUTO -eq 1 && "$GL" != swangle ]] \
    && grep -Eiq 'WebGL|GPU|EGL|ANGLE|context lost|Target closed|Session closed|crash|Browser (closed|disconnected|has disconnected)|Protocol error|timed out|Timeout' "$err"; then
    step "the render failed on --gl=$GL (above); once more on --gl=swangle (software GL), kept for the rest of this run"
    for x in "$@"; do [[ "$x" == --gl=* ]] && x=--gl=swangle; a+=("$x"); done
    for x in "${RARGS[@]}"; do [[ "$x" == --gl=* ]] && x=--gl=swangle; r+=("$x"); done
    RARGS=("${r[@]}"); GL=swangle; rc=0
    remotion render "${a[@]}" || rc=$?
  fi
  return $rc
}
PIC="$WORK/picture.mp4"
step "$COMP: ${SIZE}@${FPS}$([[ "$OUTSIZE" != "$SIZE" ]] && echo " (written at $OUTSIZE, --scale $SCALE)"), frames $FROM-$TO ($N f, ${DUR}s), mode $MODE"

# redo_check NEW OLD A: a part re-rendered after a --redo edit against the part it replaces, frame by frame outside
# the --redo frames (A = the part's first film frame): exit 0 they match, 1 a frame changed, 2 nothing to compare.
# Both are decoded to 480-wide luma; an 8x8 block whose mean difference passes 4 levels is a change (two encodes of
# the same frames differ by about 1). A function, because bash 3.2 cannot parse a heredoc inside $( ).
redo_check() {
  python3 - "$1" "$2" "$3" "$REDO" <<'PY'
import subprocess, sys
import numpy as np
new, old, a0 = sys.argv[1], sys.argv[2], int(sys.argv[3])
rng = [tuple(int(v) for v in r.split('-')) for r in sys.argv[4].split()]
W, H = (int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                        '-of', 'csv=p=0', new], capture_output=True, text=True).stdout.strip().split(','))
w = min(480, W) // 2 * 2
h = max(2, int(round(H * w / W / 2)) * 2)
def frames(p):
    pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', p, '-vf', f'scale={w}:{h}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                          stdout=subprocess.PIPE)
    while True:
        buf = pr.stdout.read(w * h)
        if len(buf) < w * h:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w).astype(np.int16)
    pr.stdout.close()
    pr.wait()
hh, ww = h // 8 * 8, w // 8 * 8
bad, seen = [], 0
for i, (x, y) in enumerate(zip(frames(new), frames(old))):
    f = a0 + i
    if any(lo <= f <= hi for lo, hi in rng):
        continue
    seen += 1
    d = float(np.abs(x - y)[:hh, :ww].reshape(hh // 8, 8, ww // 8, 8).mean(axis=(1, 3)).max())
    if d > 4:
        bad.append((f, d))
if not seen:
    print('no frame of it lies outside --redo, nothing to compare')
    sys.exit(2)
if bad:
    print(f'{len(bad)} of its {seen} frame(s) outside --redo changed (f{bad[0][0]}..f{bad[-1][0]}, an 8x8 block up to {max(d for _, d in bad):.0f} levels apart)')
    sys.exit(1)
print(f'its {seen} frame(s) outside --redo match the part rendered before the edit')
PY
}

# subframe_span SAMPLES A B: the first and last sub-frame of film frames A-B. A function, because
# bash 3.2 (macOS) cannot parse a heredoc inside $( ).
subframe_span() {
  python3 - "$@" <<'PY'
import json, sys
g = [max(1, int(x)) for x in json.load(open(sys.argv[1]))['groups']]
a, b = int(sys.argv[2]), int(sys.argv[3])
g += [1] * max(0, b + 1 - len(g))  # FilmSub renders missing entries once
before = sum(g[:a])
print(before, before + sum(g[a:b + 1]) - 1)
PY
}

case "$MODE" in
  draft|preview|master)
    if [[ $MODE == draft ]]; then Q=(--crf="${CRF:-23}" --x264-preset=superfast)
    elif [[ $MODE == preview ]]; then Q=(--crf="${CRF:-20}" --x264-preset=veryfast); else Q=(--crf="${CRF:-14}" --x264-preset=slow); fi
    if [[ $CHUNKED -eq 0 ]]; then
      step "rendering $COMP ($MODE)"
      rrender "$B" "$COMP" "$PIC" ${RANGE[@]+"${RANGE[@]}"} ${Q[@]+"${Q[@]}"} --pixel-format=yuv420p --color-space=bt709 ${RARGS[@]+"${RARGS[@]}"} \
        || die "remotion render failed"
    else
      # parts of CHUNK frames, one Remotion render at a time; a finished part (its frame count checked) is kept
      frames_of() { ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$1" 2>/dev/null || echo 0; }
      # the parts' first frames: the grid of the parts already in the folder (a resumed run), then every CHUNK frames, each
      # boundary moved back onto the latest cut in the part's last half (act lines and seams, out/cues.json)
      read -r -a STARTS <<< "$(node -e '
const fs = require("fs");
const [from, to, chunk, dir] = [...process.argv.slice(1, 4).map(Number), process.argv[4]];
let cuts = [];
try {
  const c = JSON.parse(fs.readFileSync("out/cues.json", "utf8"));
  cuts = [...Object.values(c.acts || {}).map((a) => a.from), ...((c.declared || {}).seams || []).map((s) => s.at)].map(Math.round);
} catch {}
cuts = [...new Set(cuts)].filter((f) => f > from && f <= to).sort((p, q) => p - q);
let have = [];
try { have = fs.readdirSync(dir).map((n) => /^part-(\d+)-(\d+)\.mp4$/.exec(n)).filter(Boolean).map((m) => [+m[1], +m[2]]); } catch {}
const out = [from];
let a = from;
for (;;) {
  const kept = have.find(([x, y]) => x === a && y < to);
  if (kept) { a = kept[1] + 1; out.push(a); continue; }
  if (a + chunk > to) break;
  const c = cuts.filter((f) => f >= a + Math.ceil(chunk / 2) && f <= a + chunk).pop();
  a = c ?? a + chunk;
  out.push(a);
}
console.log(out.join(" "));' "$FROM" "$TO" "$CHUNK" "$PARTS")" || die "could not lay out the parts"
      NP=${#STARTS[@]}
      [[ -z "$ONLY_PART" || "$ONLY_PART" -lt "$NP" ]] || die "--part $ONLY_PART: this range has $NP part(s), 0-$((NP - 1))"
      PEND=(); PFILE=()
      for ((k = 0; k < NP; k++)); do
        if (( k + 1 < NP )); then PEND[k]=$(( STARTS[k + 1] - 1 )); else PEND[k]=$TO; fi
        _a=000000${STARTS[k]}; _b=000000${PEND[k]}; PFILE[k]="$PARTS/part-${_a: -6}-${_b: -6}.mp4"  # zero-padded without a process (bash 3.2 too)
      done
      part_end() { echo "${PEND[$1]}"; }
      part_file() { echo "${PFILE[$1]}"; }
      LAST_S=0; LAST_N=0; left=0; MISSING=""
      step "$N frames in $NP part(s) of <= $CHUNK in $PARTS$([[ "$MAXMIN" != 0 ]] && echo ", stopping before ${MAXMIN} min")"
      # a part found whole is remembered for the rest of the run: each check is an ffprobe over the part, and on a busy
      # machine every process costs seconds (an indexed array: bash 3.2 has no associative ones)
      PART_OK=()
      part_done() {
        local f a b
        [[ "${PART_OK[$1]:-}" == 1 ]] && return 0
        f=${PFILE[$1]}; a=${STARTS[$1]}; b=${PEND[$1]}
        [[ -f "$f" && "$(frames_of "$f")" -eq $((b - a + 1)) ]] && part_current "$f" && PART_OK[$1]=1
      }
      # a claim: an atomic folder beside the parts holding the claiming worker's pid; a claim whose worker is gone is cleared
      claim() { mkdir "$PARTS/.claim-$1" 2>/dev/null && echo "$2" > "$PARTS/.claim-$1/pid"; }
      unclaim() { rm -f "$PARTS/.claim-$1/pid"; rmdir "$PARTS/.claim-$1" 2>/dev/null || true; }
      for c in "$PARTS"/.claim-*; do
        [[ -d "$c" ]] || continue
        cp_=$(cat "$c/pid" 2>/dev/null || echo 0)
        if ! kill -0 "$cp_" 2>/dev/null; then rm -f "$c/pid"; rmdir "$c" 2>/dev/null || true; fi
      done
      # render_part K PATH: one part on the GPU path (rrender, its swangle fallback) or software GL (--gl=swangle on the
      # CPU, at its own concurrency); the same bundle, encode and tags, so the parts join as one stream
      CARGS=()
      for x in ${RARGS[@]+"${RARGS[@]}"}; do [[ "$x" == --gl=* || "$x" == --concurrency=* ]] || CARGS+=("$x"); done
      # half the cores, and never above the ones Remotion sees (nproc, which OMP_NUM_THREADS lowers: it refuses more)
      CC=${CPU_CONC:-$(node -e "const o=require('os');console.log(Math.max(1,Math.floor((o.availableParallelism?o.availableParallelism():o.cpus().length)/2)))")}
      _np=$(nproc 2>/dev/null || echo "$CC"); [[ "$_np" =~ ^[0-9]+$ ]] && (( CC > _np )) && CC=$_np
      CARGS+=(--gl=swangle --concurrency="$CC")
      render_part() {
        local k=$1 path=$2 a b f t1 rc msg
        a=${STARTS[$k]}; b=${PEND[$k]}; f=${PFILE[$k]}
        t1=$SECONDS
        step "part $((k + 1))/$NP: frames $a-$b$([[ $path == cpu ]] && echo ' (software GL, CPU)')"
        rm -f "$f.tmp.mp4"
        if [[ $path == cpu ]]; then
          remotion render "$B" "$COMP" "$f.tmp.mp4" --frames="$a-$b" ${Q[@]+"${Q[@]}"} --pixel-format=yuv420p --color-space=bt709 "${CARGS[@]}" \
            || { rm -f "$f.tmp.mp4"; echo "render.sh: software GL failed on part $((k + 1)) (frames $a-$b); the GPU path takes it" >&2; return 1; }
        else
          rrender "$B" "$COMP" "$f.tmp.mp4" --frames="$a-$b" ${Q[@]+"${Q[@]}"} --pixel-format=yuv420p --color-space=bt709 ${RARGS[@]+"${RARGS[@]}"} \
            || die "remotion render failed on part $((k + 1)) (frames $a-$b); the finished parts are kept in $PARTS: rerun to resume"
        fi
        mv -f "$f.tmp.mp4" "$f"
        [[ -n "$SRC_KEY" ]] && set_part_key "$f" "$SRC_KEY"
        if [[ -f "${f%.mp4}.old.mp4" ]]; then  # a --redo part: outside the frames named it must match the part it replaces
          rc=0; msg=$(redo_check "$f" "${f%.mp4}.old.mp4" "$a") || rc=$?
          if [[ $rc -eq 1 ]]; then
            if [[ -f "$KEPT_LIST" ]]; then while read -r kp; do [[ -n "$kp" ]] && set_part_key "$kp" ""; done < "$KEPT_LIST"; rm -f "$KEPT_LIST"; fi
            rm -f "${f%.mp4}.old.mp4"  # the re-rendered part is the new source's: it stays
            die "part $((k + 1)) (frames $a-$b): $msg. The edit reaches past --redo$REDO, so the parts kept from before it re-render on the next run (rerun the same command, without --redo)"
          fi
          step "part $((k + 1)): $msg"
          rm -f "${f%.mp4}.old.mp4"
        fi
        LAST_S=$(( SECONDS - t1 )); LAST_N=$(( b - a + 1 ))
        return 0
      }
      # the software-GL worker: from the last part backward, a part at a time, each claimed first; it stops at a part
      # the GPU worker holds or has done (the two meet in the middle) and under the time limit like the GPU worker
      cpu_worker() {
        local k me=$1
        for ((k = NP - 1; k >= 0; k--)); do
          [[ -n "$ONLY_PART" && "$k" -ne "$ONLY_PART" ]] && continue
          part_done "$k" && continue
          if [[ "$MAXMIN" != 0 ]] && over_limit $(( PEND[k] - STARTS[k] + 1 )); then break; fi
          claim "$k" "$me" || { [[ -n "$WORKER" ]] && continue || break; }
          render_part "$k" cpu || { unclaim "$k"; break; }
          unclaim "$k"
        done
      }
      CPU_PID=""
      trap 'if [[ -n "$CPU_PID" ]]; then kill "$CPU_PID" 2>/dev/null || true; fi; if [[ $KEEP -ne 1 ]]; then rm -rf "$WORK"; fi' EXIT
      start_cpu() {
        [[ -z "$CPU_PID" ]] || return 0
        step "software-GL worker on the CPU from the last part backward (concurrency $CC), beside the GPU worker"
        ( cpu_worker "$(exec sh -c 'echo "$PPID"')" ) &
        CPU_PID=$!
      }
      if [[ $JOIN_ONLY -eq 0 && "$WORKER" == cpu ]]; then
        cpu_worker "$$"
      elif [[ $JOIN_ONLY -eq 0 ]]; then
        [[ $SPLIT == on && -z "$ONLY_PART" && -z "$WORKER" ]] && start_cpu
        for ((k = 0; k < NP; k++)); do
          [[ -n "$ONLY_PART" && "$k" -ne "$ONLY_PART" ]] && continue
          part_done "$k" && continue
          # under a time limit: start a part only if it fits, judged by the last part's pace
          if [[ "$MAXMIN" != 0 ]] && over_limit $(( PEND[k] - STARTS[k] + 1 )); then
            left=$((left + 1)); continue
          fi
          claim "$k" "$$" || continue  # the software-GL worker has it
          render_part "$k" gpu
          unclaim "$k"
          # a slow machine: after the first part, the parts left at this pace would take more than SPLIT_MIN minutes
          if [[ $SPLIT == auto && -z "$CPU_PID" && -z "$ONLY_PART" && -z "$WORKER" && $MODE == master ]]; then
            todo=0; for ((q = k + 1; q < NP; q++)); do part_done "$q" || todo=$((todo + $(part_end "$q") - STARTS[q] + 1)); done
            if node -e "const [s,n,t,m]=process.argv.slice(1).map(Number);process.exit(n > 0 && (m <= 0 || s / Math.max(1,t) * n > m * 60) ? 0 : 1)" "$LAST_S" "$todo" "$(( $(part_end "$k") - STARTS[k] + 1 ))" "$SPLIT_MIN"; then
              step "slow here: the $todo frames left would take over ${SPLIT_MIN} min at this pace (--no-split keeps one path)"
              start_cpu
            fi
          fi
        done
        if [[ -n "$CPU_PID" ]]; then
          step "the GPU worker is done; waiting for the software-GL worker"
          wait "$CPU_PID" || true
          # a part the software-GL worker could not render (or left): the GPU path takes it now
          for ((k = 0; k < NP; k++)); do
            [[ -n "$ONLY_PART" && "$k" -ne "$ONLY_PART" ]] && continue
            part_done "$k" && continue
            if [[ "$MAXMIN" != 0 ]] && over_limit $(( PEND[k] - STARTS[k] + 1 )); then
              left=$((left + 1)); continue
            fi
            claim "$k" "$$" || continue
            render_part "$k" gpu
            unclaim "$k"
          done
        fi
      fi
      for ((k = 0; k < NP; k++)); do
        [[ -n "$ONLY_PART" && "$k" -ne "$ONLY_PART" ]] && continue
        part_done "$k" && continue
        if [[ $JOIN_ONLY -eq 1 ]]; then MISSING="$MISSING --part $k (frames ${STARTS[$k]}-$(part_end "$k"));"; continue; fi
        [[ -n "$WORKER" ]] && left=$((left + 1))
      done
      if [[ -n "$WORKER" && $left -gt 0 ]]; then
        step "the $WORKER worker is done: $left part(s) are another worker's (or left); the last worker to finish joins"
        exit 0
      fi
      if [[ -n "$WORKER" ]]; then  # two worker jobs done at once: one joins (a join claim left by a gone worker was cleared above)
        if ! claim join "$$"; then step "every part is there; the other worker joins"; exit 0; fi
        trap 'if [[ $KEEP -ne 1 ]]; then rm -rf "$WORK"; fi; unclaim join' EXIT
      fi
      # the parts left, counted once more here (a part skipped by both loops was counted twice)
      left=0; for ((k = 0; k < NP; k++)); do [[ -n "$ONLY_PART" && "$k" -ne "$ONLY_PART" ]] && continue; part_done "$k" || left=$((left + 1)); done
      [[ -z "$MISSING" ]] || die "--join-only: missing or out-of-date part(s) in $PARTS:$MISSING render each with the same command and --part K (or rerun without --join-only)"
      if [[ -f "$KEPT_LIST" && -z "$(find "$PARTS" -maxdepth 1 -name '*.old.mp4' 2>/dev/null | head -1)" ]]; then rm -f "$KEPT_LIST"; fi
      if [[ -n "$ONLY_PART" ]]; then step "part $ONLY_PART done: $(part_file "$ONLY_PART")"; exit 0; fi
      if [[ $left -gt 0 ]]; then
        step "stopped before the ${MAXMIN}-minute limit: $left of $NP part(s) left in $PARTS; rerun the same command to continue"
        [[ $MODE == master && -f out/draft.mp4 ]] && step "out of time for the rest? deliver the whole draft instead of a cut film: bash scripts/render.sh $COMP $OUT --from-draft out/draft.mp4"
        exit 75
      fi
      step "joining $NP part(s) (stream copy) with BT.709 tags"
      # the list sits beside the parts and names them relative to itself (no POSIX/Windows path translation)
      for ((k = 0; k < NP; k++)); do echo "file '$(basename "$(part_file "$k")")'"; done > "$PARTS/parts.txt"
      ffmpeg -v error -y -f concat -safe 0 -i "$PARTS/parts.txt" -map 0:v:0 -c copy \
        -bsf:v h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0 \
        -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv "$PIC" || die "joining the parts failed"
    fi
    ;;
  blur)
    SUB=${SUB:-${COMP}Sub}
    [[ -n "$(meta "$SUB")" ]] || die "--blur needs the sub-frame composition '$SUB' (register it in Root.tsx, pass --sub ID, or blur one act with: render.sh Film out.mp4 --blur --frames A-B)"
    mkdir -p "$(dirname "$SAMPLES")"
    if [[ -n "$SAMPLES_FROM" ]]; then
      [[ -f "$SAMPLES_FROM" ]] || die "--samples-from $SAMPLES_FROM not found"
      if [[ -n "$BUDGET" ]]; then  # re-decide the groups from the saved speed track under the budget
        python3 "$SCRIPT_DIR/measure-speed.py" "$SAMPLES_FROM" "$WORK/samples.json" ${MS_ARGS[@]+"${MS_ARGS[@]}"} >/dev/null || die "measure-speed.py failed"
        cp "$WORK/samples.json" "$SAMPLES"
      else
        [[ "$(cd "$(dirname "$SAMPLES_FROM")" && pwd)/$(basename "$SAMPLES_FROM")" == "$(cd "$(dirname "$SAMPLES")" && pwd)/$(basename "$SAMPLES")" ]] || cp "$SAMPLES_FROM" "$SAMPLES"
      fi
      step "reusing samples from $SAMPLES_FROM"
    else
      step "rendering sharp pass for speed measurement"
      # intermediates keep Chromium's native full-range JPEG colour (--color-space=default): no
      # matrix conversion before accumulate.py, which decodes with the file's own tags
      TS=$(python3 -c 'import time; print(time.time())')
      rrender "$B" "$COMP" "$WORK/sharp.mp4" ${RANGE[@]+"${RANGE[@]}"} --crf=12 --x264-preset=veryfast --color-space=default ${RARGS[@]+"${RARGS[@]}"} \
        || die "sharp render failed"
      SPF=$(python3 -c "import time; print(round((time.time() - $TS) / $N, 4))")
      step "measuring on-screen speed -> $SAMPLES (policy $POLICY)"
      CUES=(); [[ -f out/cues.json ]] && CUES=(--cues out/cues.json)
      # a film with declarations accumulates at most 8 samples per frame (laptop-safe finals)
      CAP=()
      if [[ -f out/cues.json ]] && node -e "process.exit(JSON.parse(require('fs').readFileSync('out/cues.json','utf8')).look?0:1)" && [[ " ${MS_ARGS[*]-} " != *" --max "* ]]; then CAP=(--max 8); fi
      python3 "$SCRIPT_DIR/measure-speed.py" "$WORK/sharp.mp4" "$SAMPLES" --offset "$FROM" --policy "$POLICY" ${CUES[@]+"${CUES[@]}"} ${CAP[@]+"${CAP[@]}"} ${MS_ARGS[@]+"${MS_ARGS[@]}"} >/dev/null \
        || die "measure-speed.py failed"
      # remember the measured throughput, so a later --samples-from run can estimate too
      python3 - "$SAMPLES" "$SPF" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['sharp_s_per_frame'] = float(sys.argv[2]); json.dump(d, open(sys.argv[1], 'w'))
PY
    fi
    read -r SA SB <<< "$(subframe_span "$SAMPLES" "$FROM" "$TO")"
    if [[ $((SB - SA + 1)) -eq $N ]]; then
      # crisp, or nothing fast: every frame renders from one sample, so the master is a sharp render
      step "no frame in $FROM-$TO needs blur samples ($(python3 -c "import json, sys;print(json.load(open(sys.argv[1])).get('policy','camera'))" "$SAMPLES") policy): rendering the sharp master"
      rrender "$B" "$COMP" "$PIC" ${RANGE[@]+"${RANGE[@]}"} --crf="${CRF:-14}" --x264-preset=slow --pixel-format=yuv420p --color-space=bt709 ${RARGS[@]+"${RARGS[@]}"} \
        || die "remotion render failed"
      SKIP_SUB=1
    fi
    [[ ${SKIP_SUB:-0} -eq 1 ]] || {
    # The estimate, measured on the starter (4 CPUs): a sub-frame renders in about the time of a
    # sharp frame, and the float accumulation costs about 0.75 of that again per sub-frame.
    FASTRC=0
    python3 - "$SAMPLES" "$FROM" "$TO" "$((SB - SA + 1))" "$ACCEPT_FAST" "$ACCEPT_CUT" <<'PY' >&2 || FASTRC=$?
import json, sys
d = json.load(open(sys.argv[1])); a, b, sub = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
rng_of = lambda r: tuple(int(v) for v in (r.split('-') if '-' in r else (r, r)))
acc = [rng_of(r) for r in sys.argv[5].split()]
acc_cut = [rng_of(r) for r in sys.argv[6].split()]
n = b - a + 1
spf = d.get('sharp_s_per_frame')
est = f', about {max(1, round(sub * spf * 1.75 / 60))} min at {spf:.3f} s per sharp frame' if spf else ''
print(f'render.sh: blur pass: {n} frames -> {sub} sub-frames ({sub / n:.1f}x){est}')
tf = [r for r in d.get('too_fast', []) if r[1] >= a and r[0] <= b]
left = [(x, y) for x, y in tf if not any(p <= x and y <= q for p, q in acc)]
if sub / n > 8 and not d.get('budget'):
    print('render.sh: note: over 8x; pass --budget 6 to cap it, or slow the fastest moves')
if left:
    rng = ', '.join(f'{x}-{y}' for x, y in left[:6])
    print(f'render.sh: too fast for clean blur at frames {rng} (> {d.get("too_fast_px_f", 80):g} px/f, peak '
          f'{d.get("peak")} px/f): blur will show stepped copies there. Redesign those moves (a cut on the beat, a match '
          f'cut, a mask wipe, a shorter distance), or, for a frame-filling edge you checked at full size, pass --accept-fast A-B.')
    sys.exit(3)
# unexplained full-frame changes inside an act (hard cuts measured as such already render sharp)
hard = set(d.get('cuts', []))
odd = [c for c in d.get('cuts_inside_acts', []) if a <= c <= b and c not in hard
       and not any(p <= c <= q for p, q in acc + acc_cut)]
if odd:
    print(f'render.sh: frames {", ".join(map(str, odd[:8]))} change in a way the flow cannot explain, away from any act '
          'boundary. If one is a hard cut, its sub-frames will blend the two shots into a double-exposed frame: make it '
          'an ACT boundary in src/timeline.ts. If it is a flood, a flash or a zoom-through you checked at full size, '
          'pass --accept-cut A-B.')
    sys.exit(4)
PY
    [[ $FASTRC -eq 3 ]] && die "stopped before the sub-frame pass: moves too fast for clean blur (see above)"
    [[ $FASTRC -eq 4 ]] && die "stopped before the sub-frame pass: a possible cut inside an act (see above)"
    step "rendering $SUB sub-frames $SA-$SB ($((SB - SA + 1)) sub-frames for $N frames)"
    rrender "$B" "$SUB" "$WORK/sub.mp4" --props="$(cd "$(dirname "$SAMPLES")" && pwd)/$(basename "$SAMPLES")" \
      --frames="$SA-$SB" --crf=6 --x264-preset=veryfast --pixel-format=yuv444p --color-space=default ${RARGS[@]+"${RARGS[@]}"} \
      || die "sub-frame render failed"
    step "accumulating in float -> BT.709 CRF ${CRF:-14}$([[ $TENBIT -eq 1 ]] && echo ', 10-bit')"
    ACC=(--crf "${CRF:-14}"); [[ $TENBIT -eq 1 ]] && ACC+=(--10bit)
    python3 "$SCRIPT_DIR/accumulate.py" "$WORK/sub.mp4" "$SAMPLES" "$PIC" --start "$FROM" --count "$N" ${ACC[@]+"${ACC[@]}"} --quiet >/dev/null \
      || die "accumulate.py failed"
    }
    ;;
esac

GOT=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$PIC")
[[ "$GOT" -eq "$N" ]] || die "picture has $GOT frames, expected $N"

if [[ $NOAUDIO -eq 1 ]]; then
  step "writing $OUT (no audio)"
  ffmpeg -v error -y -i "$PIC" -map 0:v:0 -c copy -movflags +faststart "$OUT_ABS" || die "ffmpeg copy failed"
else
  ADUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO")
  python3 - "$ADUR" "$AOFF_S" "$DUR" "$FPS" "$([[ -n "$FRAMES" ]] && echo 1 || echo 0)" <<'PY' >&2 || true
import sys
adur, off, dur, fps, excerpt = map(float, sys.argv[1:])
need = off + dur
if adur < need - 1 / fps:
    print(f'render.sh: warning: soundtrack is {adur:.3f}s, picture needs {need:.3f}s; padding with silence')
elif off == 0 and not excerpt and adur > need + 1.0:
    print(f'render.sh: warning: soundtrack runs {adur - need:.2f}s past the picture; trimming it (check TOTAL / the tail)')
PY
  step "muxing $AUDIO (from ${AOFF_S}s) -> $OUT"
  ffmpeg -v error -y -i "$PIC" -ss "$AOFF_S" -i "$AUDIO" -map 0:v:0 -map 1:a:0 -c:v copy \
    -af apad -c:a aac -b:a 320k -ar 48000 -ac 2 -t "$DUR" -movflags +faststart "$OUT_ABS" || die "ffmpeg mux failed"
fi

STATUS=0
py_settle
[[ $HAVE_PY -eq 0 && $NOCHECK -eq 0 ]] && { echo "render.sh: warning: the sync and spec gates were skipped (no Python with numpy, scipy and soundfile)" >&2; NOCHECK=1; }
if [[ $NOCHECK -eq 0 ]]; then
  if [[ $NOAUDIO -eq 0 ]]; then
    step "check-sync"
    python3 "$SCRIPT_DIR/check-sync.py" "$OUT_ABS" "$AUDIO" --ref-offset "$AOFF_S" --json "out/qa/sync-$NAME.json" >/dev/null || STATUS=1
  fi
  step "probe"
  PARGS=(--spec "${SPEC:-${OUTSIZE}@${FPS}}" --frames "$N" --json "out/qa/probe-$NAME.json" --no-loudness)
  [[ $NOAUDIO -eq 1 ]] && PARGS+=(--audio none)
  [[ $TENBIT -eq 1 ]] && PARGS+=(--pix-fmt yuv420p10le)
  python3 "$SCRIPT_DIR/probe.py" "$OUT_ABS" ${PARGS[@]+"${PARGS[@]}"} >/dev/null || STATUS=1
fi

SIZE_MB=$(node -e 'console.log((require("fs").statSync(process.argv[1]).size / 1e6).toFixed(1))' "$OUT_ABS")
changed=$(find src -type f -newer "$WORK/.bundled" 2>/dev/null | head -3 | tr '\n' ' ' || true)
[[ -z "$changed" ]] || echo "render.sh: warning: src/ changed while this rendered ($changed); $OUT shows the source as it was when bundled" >&2
if [[ $MODE == blur && -f "$SAMPLES" ]]; then
  FAST=$(python3 -c "import json, sys;d=json.load(open(sys.argv[1]));print(' '.join(str(f - $FROM) for f in d.get('fastest_frames', [])[:4] if $FROM <= f <= $TO))" "$SAMPLES" 2>/dev/null || true)
  [[ -z "$FAST" ]] || echo "render.sh: look at the fastest frames at full size for stepped copies: bash scripts/grab.sh $OUT $FAST" >&2
fi
if [[ ${CHUNKED:-0} -eq 1 && -z "$PREBUILT" ]]; then
  # the parts stay until every gate has passed (the film's gates run after this): a late gate costs no re-render
  if [[ $KEEP -eq 1 ]]; then touch "$PARTS/.keep"; else rm -f "$PARTS/.keep"; fi
  [[ $STATUS -eq 0 ]] && step "the bundle and the parts stay in $PARTS until every gate has passed: deliver.sh cleans them, or rerun with --clean$([[ $KEEP -eq 1 ]] && echo ' (--keep: they stay)')"
fi
if [[ $MODE == draft ]]; then
  # the draft's contact sheet, cut from the video by ffmpeg (seconds): the first look at the whole film
  node "$SCRIPT_DIR/frames.mjs" sheet --from "$OUT_ABS" --out out/qa/draft-sheet.png --quiet >/dev/null 2>&1 \
    && step "out/qa/draft-sheet.png: 16 tiles over the whole draft (one act: node scripts/frames.mjs sheet --from $OUT --frames A-B)"
fi
if [[ $SILENT -eq 1 ]]; then
  # said again at the end, where it is read: a silent draft is a picture test, never a film (out/qa/SILENT marks it)
  echo "render.sh: SILENT: $OUT has no sound (no track picked). The film is not done until the track and the kit play under it: node scripts/music.mjs pick, get, npm run sound, then the draft again" >&2
  : > out/qa/SILENT
else
  rm -f out/qa/SILENT
fi
if [[ $STATUS -eq 0 ]]; then
  step "done: $OUT (${SIZE_MB} MB, ${DUR}s, $MODE)"
else
  step "FAILED a gate: $OUT written (${SIZE_MB} MB) but see the report above and out/qa/*-$NAME.json"
fi
exit $STATUS
