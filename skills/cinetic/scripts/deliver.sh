#!/usr/bin/env bash
# deliver.sh: turn a finished master into its deliverables, each checked.
#
# Usage:
#   bash scripts/deliver.sh <master.mp4> [options]
#
#   bash scripts/deliver.sh out/film.mp4                                 # poster only
#   bash scripts/deliver.sh out/loop.mp4 --loop --gif --webm             # landing-page loop set
#   bash scripts/deliver.sh out/sting.mp4 --alpha StingAlpha             # + ProRes 4444 with alpha
#   bash scripts/deliver.sh out/film.mp4 --variants Film9x16,Film1x1     # re-laid-out social cuts
#
# What it writes (into --out-dir, default out/deliver/):
#   poster.png / poster.jpg   the final frame (the final frame is the poster), or --poster-frame N
#   <name>-loop.mp4           --loop: muted, faststart copy, plus a loop-seam check: the step from
#                             the last frame back to frame 0 must look like the steps around it
#                             (seam MAD <= max(0.4, 1.5x the median of the 8 steps at each end))
#   <name>.gif                --gif: two-pass palettegen/paletteuse (25 fps, 960 px wide by default)
#   <name>.webm               --webm: VP9 CRF 32 (Opus audio unless --loop), BT.709 tagged
#   <Comp>.mov                --alpha Comp: Remotion ProRes 4444, yuva444p10le, PNG frames, BT.709
#   <Comp>-alpha.webm         --alpha-webm: VP9 with alpha (yuva420p) of the same composition
#   <Comp>.mp4                --variants A,B: each composition through render.sh (sharp master)
#   manifest.json             every file with its probe facts and check results
#
# Options:
#   --out-dir DIR        output folder (default out/deliver)
#   --poster-frame N     poster from frame N instead of the last frame
#   --gif-fps N          GIF frame rate (default 25; GIF delays are whole 1/100 s, so 25 or 50 play
#                        at the true rate while 30 plays 11% fast)
#   --gif-width N        GIF width in px (default 960)
#   --gif-max-mb N       warn above this size (default 8)
#   --gif-dither D       paletteuse dither: sierra2_4a (default), bayer, floyd_steinberg, none
#   --webm-crf N         VP9 CRF (default 32)
#   --alpha-frames A-B   render only this range of the alpha composition (tests)
#   --alpha-props JSON   --props for the alpha render, e.g. '{"transparent":true}'
#   --entry FILE         Remotion entry for --alpha/--variants (default src/index.ts)
#   --audio FILE         soundtrack for --variants (default public/audio/soundtrack.wav)
# Exit 0 = everything written and every check passed, 1 = a step or check failed.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
usage() { sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
die() { echo "deliver.sh: $*" >&2; exit 1; }
step() { echo "[deliver] $*" >&2; }

OUTDIR=out/deliver; POSTER_FRAME=""; LOOP=0; GIF=0; WEBM=0; ALPHA=""; ALPHA_WEBM=0; VARIANTS=""
GIF_FPS=25; GIF_W=960; GIF_MAX=8; GIF_DITHER=sierra2_4a; WEBM_CRF=32; ALPHA_FRAMES=""; ALPHA_PROPS=""
ENTRY=src/index.ts; AUDIO=public/audio/soundtrack.wav; POS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --out-dir) OUTDIR=${2:?}; shift ;;
    --poster-frame) POSTER_FRAME=${2:?}; shift ;;
    --loop) LOOP=1 ;;
    --gif) GIF=1 ;;
    --webm) WEBM=1 ;;
    --alpha) ALPHA=${2:?}; shift ;;
    --alpha-webm) ALPHA_WEBM=1 ;;
    --alpha-frames) ALPHA_FRAMES=${2:?}; shift ;;
    --alpha-props) ALPHA_PROPS=${2:?}; shift ;;
    --variants) VARIANTS=${2:?}; shift ;;
    --gif-fps) GIF_FPS=${2:?}; shift ;;
    --gif-width) GIF_W=${2:?}; shift ;;
    --gif-max-mb) GIF_MAX=${2:?}; shift ;;
    --gif-dither) GIF_DITHER=${2:?}; shift ;;
    --webm-crf) WEBM_CRF=${2:?}; shift ;;
    --entry) ENTRY=${2:?}; shift ;;
    --audio) AUDIO=${2:?}; shift ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) POS+=("$1") ;;
  esac
  shift
done
[[ ${#POS[@]} -eq 1 ]] || usage 1
MASTER=${POS[0]}
[[ -f "$MASTER" ]] || die "master $MASTER not found"
command -v ffmpeg >/dev/null || die "ffmpeg not found"
mkdir -p "$OUTDIR"
NAME=$(basename "${MASTER%.*}")
STATUS=0
CHECKS="$OUTDIR/.checks.jsonl"; : > "$CHECKS"
note() { printf '%s\n' "$1" >> "$CHECKS"; }

read -r W H FPS N HAS_AUDIO <<< "$(python3 - "$MASTER" <<'PY'
import json, subprocess, sys
from fractions import Fraction
d = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-show_streams', '-of', 'json', sys.argv[1]],
                              capture_output=True, text=True, check=True).stdout)
v = next(s for s in d['streams'] if s['codec_type'] == 'video')
a = any(s['codec_type'] == 'audio' for s in d['streams'])
print(v['width'], v['height'], float(Fraction(v['avg_frame_rate'])), v['nb_read_packets'], int(a))
PY
)"
step "$MASTER: ${W}x${H}@${FPS}, $N frames, audio $([[ $HAS_AUDIO -eq 1 ]] && echo yes || echo no)"
TO_RGB="scale=in_color_matrix=auto:in_range=auto:flags=accurate_rnd+full_chroma_int,format=rgb24"

# poster: the last frame (decode only the last second), or an exact frame
if [[ -n "$POSTER_FRAME" ]]; then
  ffmpeg -v error -y -i "$MASTER" -vf "select=eq(n\,$POSTER_FRAME),$TO_RGB" -vsync 0 -frames:v 1 "$OUTDIR/poster.png"
else
  ffmpeg -v error -y -sseof -1 -i "$MASTER" -vf "$TO_RGB" -update 1 "$OUTDIR/poster.png"
fi
[[ -s "$OUTDIR/poster.png" ]] || die "poster extraction failed"
ffmpeg -v error -y -i "$OUTDIR/poster.png" -q:v 2 "$OUTDIR/poster.jpg"
step "poster.png / poster.jpg ($([[ -n "$POSTER_FRAME" ]] && echo "frame $POSTER_FRAME" || echo 'last frame'))"

if [[ $LOOP -eq 1 ]]; then
  ffmpeg -v error -y -i "$MASTER" -map 0:v:0 -c copy -an -movflags +faststart "$OUTDIR/$NAME-loop.mp4"
  if python3 - "$MASTER" "$OUTDIR/loop-seam.json" <<'PY' >&2
import json, subprocess, sys
import numpy as np
src, out = sys.argv[1:3]
W, H = 480, 270
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H}:flags=area,format=rgb24', '-f', 'rawvideo', '-'],
                     capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.int16)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2, 3))            # step i -> i+1
seam = float(np.abs(fr[0] - fr[-1]).mean())                      # last frame -> frame 0
ends = np.concatenate([d[:8], d[-8:]])                            # the steps around the wrap
local = float(np.median(ends)) if len(ends) else 0.0
limit = max(0.4, 1.5 * local)                                     # same rule as forensics.py --loop
ok = seam <= limit
res = {'check': 'loop_seam', 'pass': bool(ok), 'seam_mad': round(seam, 3), 'median_step_at_ends': round(local, 3),
       'limit': round(limit, 3), 'median_step': round(float(np.median(d)), 3) if len(d) else None,
       'rule': 'seam <= max(0.4, 1.5 x median of the 8 steps at each end)'}
json.dump(res, open(out, 'w'), indent=1)
print(f"  loop seam MAD {seam:.3f}, limit {limit:.3f} (median step at the ends {local:.3f}): "
      + ('OK' if ok else 'FAIL: the last frame does not flow into frame 0 (match state and velocity; whole bars)'))
sys.exit(0 if ok else 1)
PY
  then note '{"file":"'"$NAME-loop.mp4"'","check":"loop_seam","pass":true}'
  else note '{"file":"'"$NAME-loop.mp4"'","check":"loop_seam","pass":false}'; STATUS=1; fi
  step "$NAME-loop.mp4 (muted)"
fi

if [[ $GIF -eq 1 ]]; then
  F="scale=${GIF_W}:-2:flags=lanczos:in_color_matrix=auto:in_range=auto,format=rgb24,fps=${GIF_FPS}"
  ffmpeg -v error -y -i "$MASTER" -vf "$F,palettegen=max_colors=256:stats_mode=full" "$OUTDIR/.palette.png"
  ffmpeg -v error -y -i "$MASTER" -i "$OUTDIR/.palette.png" -lavfi "$F[x];[x][1:v]paletteuse=dither=${GIF_DITHER}:diff_mode=rectangle" \
    -loop 0 "$OUTDIR/$NAME.gif"
  rm -f "$OUTDIR/.palette.png"
  mb=$(python3 -c "import os;print(round(os.path.getsize('$OUTDIR/$NAME.gif')/1e6,2))")
  if python3 -c "import sys; sys.exit(0 if $mb <= $GIF_MAX else 1)"; then
    note '{"file":"'"$NAME.gif"'","check":"size","pass":true,"mb":'"$mb"'}'
  else
    note '{"file":"'"$NAME.gif"'","check":"size","pass":false,"mb":'"$mb"'}'
    echo "deliver.sh: warning: $NAME.gif is $mb MB (> $GIF_MAX): lower --gif-width/--gif-fps, shorten the loop or ship the WebM/MP4" >&2
  fi
  step "$NAME.gif (${GIF_W}px, ${GIF_FPS} fps, $mb MB)"
fi

if [[ $WEBM -eq 1 ]]; then
  AUD=(-an); [[ $HAS_AUDIO -eq 1 && $LOOP -eq 0 ]] && AUD=(-c:a libopus -b:a 160k)
  ffmpeg -v error -y -i "$MASTER" -map 0:v:0 $([[ $HAS_AUDIO -eq 1 && $LOOP -eq 0 ]] && echo "-map 0:a:0") \
    -c:v libvpx-vp9 -crf "$WEBM_CRF" -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv "${AUD[@]}" "$OUTDIR/$NAME.webm" \
    || die "webm encode failed"
  step "$NAME.webm (VP9 CRF $WEBM_CRF$([[ ${AUD[0]} == -an ]] && echo ', muted'))"
fi

if [[ -n "$ALPHA" ]]; then
  command -v npx >/dev/null || die "--alpha needs npx/Remotion"
  [[ -f "$ENTRY" ]] || die "--alpha needs the Remotion entry $ENTRY (run from the project root)"
  RA=(--muted --log=error --image-format=png --color-space=bt709)
  [[ -n "$ALPHA_FRAMES" ]] && RA+=(--frames="$ALPHA_FRAMES")
  [[ -n "$ALPHA_PROPS" ]] && RA+=(--props="$ALPHA_PROPS")
  step "rendering $ALPHA as ProRes 4444 with alpha"
  npx remotion render "$ENTRY" "$ALPHA" "$OUTDIR/$ALPHA.mov" --codec=prores --prores-profile=4444 \
    --pixel-format=yuva444p10le "${RA[@]}" || die "alpha render failed"
  if [[ $ALPHA_WEBM -eq 1 ]]; then
    npx remotion render "$ENTRY" "$ALPHA" "$OUTDIR/$ALPHA-alpha.webm" --codec=vp9 --pixel-format=yuva420p "${RA[@]}" \
      || die "VP9 alpha render failed"
  fi
  if python3 - "$OUTDIR/$ALPHA.mov" <<'PY' >&2
import json, subprocess, sys
import numpy as np
f = sys.argv[1]
s = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,profile',
                               '-of', 'json', f], capture_output=True, text=True).stdout)['streams'][0]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', 'scale=320:-2', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
                     capture_output=True).stdout
a = np.frombuffer(raw, np.uint8)[3::4]
clear = float((a < 250).mean()) if len(a) else 0.0
# Remotion encodes yuva444p10le; ffprobe reports the ProRes decoder's format, yuva444p12le
ok = s.get('codec_name') == 'prores' and str(s.get('pix_fmt', '')).startswith('yuva444p')
print(f"  {f}: {s.get('codec_name')} {s.get('profile')} {s.get('pix_fmt')}, first frame {clear:.0%} non-opaque"
      + ('' if clear > 0 else ' (warning: fully opaque; paint no background when rendering the alpha version)'))
sys.exit(0 if ok else 1)
PY
  then note '{"file":"'"$ALPHA.mov"'","check":"prores_alpha","pass":true}'
  else note '{"file":"'"$ALPHA.mov"'","check":"prores_alpha","pass":false}'; STATUS=1; fi
fi

if [[ -n "$VARIANTS" ]]; then
  IFS=',' read -r -a VS <<< "$VARIANTS"
  for V in "${VS[@]}"; do
    step "rendering variant $V"
    VA=(); [[ $HAS_AUDIO -eq 1 ]] && VA=(--audio "$AUDIO") || VA=(--no-audio)
    if bash "$SCRIPT_DIR/render.sh" "$V" "$OUTDIR/$V.mp4" "${VA[@]}" --entry "$ENTRY"; then
      note '{"file":"'"$V.mp4"'","check":"render","pass":true}'
    else
      note '{"file":"'"$V.mp4"'","check":"render","pass":false}'; STATUS=1
    fi
  done
fi

python3 - "$OUTDIR" "$CHECKS" "$MASTER" <<'PY'
import json, os, subprocess, sys
from fractions import Fraction
outdir, checks, master = sys.argv[1:4]
items = []
for name in sorted(os.listdir(outdir)):
    p = os.path.join(outdir, name)
    if name.startswith('.') or name == 'manifest.json' or not os.path.isfile(p):
        continue
    e = {'file': name, 'mb': round(os.path.getsize(p) / 1e6, 3)}
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p], capture_output=True, text=True)
    if r.returncode == 0:
        d = json.loads(r.stdout)
        v = next((s for s in d.get('streams', []) if s['codec_type'] == 'video'), None)
        if v:
            e.update(codec=v['codec_name'], size=f"{v['width']}x{v['height']}", pix_fmt=v.get('pix_fmt'))
            try:
                fr = float(Fraction(v.get('avg_frame_rate', '0/1')))
                if fr > 0 and d['format'].get('duration'):
                    e.update(fps=round(fr, 3), seconds=round(float(d['format']['duration']), 3))
            except (ValueError, ZeroDivisionError):
                pass
            e['audio'] = any(s['codec_type'] == 'audio' for s in d['streams'])
    items.append(e)
res = [json.loads(l) for l in open(checks) if l.strip()]
m = {'master': master, 'files': items, 'checks': res, 'pass': all(c.get('pass', True) for c in res)}
json.dump(m, open(os.path.join(outdir, 'manifest.json'), 'w'), indent=1)
for e in items:
    print(f"  {e['file']:<28} {e['mb']:>8.2f} MB  {e.get('codec', '')} {e.get('size', '')} {e.get('pix_fmt', '') or ''}", file=sys.stderr)
PY
rm -f "$CHECKS"
step "$([[ $STATUS -eq 0 ]] && echo 'done' || echo 'FAILED a check'): $OUTDIR/manifest.json"
exit $STATUS
