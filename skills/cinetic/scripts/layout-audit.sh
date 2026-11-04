#!/usr/bin/env bash
# layout-audit.sh: render audit stills of a composition and check every text box.
#
# Renders the chosen frames with --props '{"audit":true}'. The starter's <Audit> (src/lib/Audit.tsx)
# measures every element tagged data-text="<id>" and logs one CINETIC_AUDIT JSON line per frame; this
# script collects them and fails on text outside the safe zone, text boxes that overlap, readable
# text under 22 px (at 1080p; 32 px in a 9:16 frame), text covered by a moving element tagged
# data-mover (sampled with elementsFromPoint, so z-order counts), more film words readable at once
# than the pace allows (8 when calm; product strings tagged data-ui count apart) and, with --speed,
# readable text that moves too fast: 20 px/f while it enters or travels (motion blur turns it into
# a double image; text inside an active DirBlur smear is left out: it is blurred along its motion),
# 3 px/f while it is being read; a declared re-centre jump of a build chain (the line
# making room for its next fragment, 2/3 of the distance in 1/30 s) is a decisive move, not a drift,
# and is held to the travel limit instead. Type roles (cap height bands that hold both type families:
# caption 2.3-4 %, line 4-9 %, display 9-14 %, hero 14-26 %, giant 26-90 %; the ui size; at most 2 non-UI
# sizes at once; line, sentence, display and hero widths) are warnings; --strict makes them fail. The safe
# zone holds resting states: a line inside a type push in flight (data-audit-push="moving", fx/TypePush) is
# a camera move (no safe-area, speed or role check); a push landed as a declared bleed must cross the frame's
# edge; a claim on the accent (data-audit-claim) keeps a 2.5 % margin at its sides; with --speed, a box
# moving faster than the read limit outside its reading window is listed apart (`moving`), not failed. The audit stills
# (boxes drawn, safe zone dashed) are kept, and the tweens the audited frames evaluate (lib/registry.ts)
# are collected for scripts/grammar-score.mjs. Each audited frame also records where the official marks are
# drawn (the kit's <Img data-logo>) and where the real pictures show (photos and footage, [data-imagery]), both of
# which look-audit.py --layout leaves out of its palette checks.
# Product UI is simple and aligned (scripts/ui-layout.cjs, on the same boxes): `ui-align` fails two rows stacked in one
# card whose left edges miss by more than 2 px and at most 12 px at 1080, on 2 or more audited frames (one frame warns;
# rows centred on each other or set flush right together are fine); `text-on-asset` lists text crossing the edge of a mark
# or a picture (not a caption wholly on a photo, not an asset set in the line) as a ui warning, which look-audit.py
# --layout confirms on the pixels and fails when the asset is in view there; `text-edge` fails text cut by the frame
# or within 4 % of its edge where it shows, outside a declared crop (data-audit-crop), on 2 audited frames: product
# text a closer frame or a punch-in slices (a declared bleed lets a pushed statement cross, never a card's label).
# Placement (on whenever src/timeline.ts gives the COPY): every statement (a COPY entry that is not 'ui' or 'name') is
# measured where it stands, its boxes merged by id: horizontally centred when its centre is within 10 % of the frame's
# width of the middle (a line parted round a picture counts by its whole span), in the middle band when its centre sits
# at 35-65 % of the height. Over the statement time (each entry's span shared among its audited frames) at least 80 %
# centred and 85 % in the middle band, or fail; a statement or a name flush left at the top or the bottom (left of
# centre and outside the middle band for most of its time) fails; against the pictures the audit logs (lib/Audit.tsx
# "pictures"): a text-top split (a line above a picture that fills the rest of the frame under it, in any band, or a
# line in the top band over a picture; a product string set at headline size counts too) warns, two fail; split
# layouts (a line beside a picture, above or below it, in any band) past one per 30 s warn (fail with --strict).
# --no-placement turns it off.
# Placeholders fail on every visible element, tagged or not (src/lib/placeholder.ts, the lists of
# scripts/placeholders.json): `placeholder` (lorem ipsum, "Placeholder", "Label text", a generic label alone,
# "Item 1", a template slot left in brackets), `bar-text` (two or more grey bars standing in for lines of text
# in a container with no text; a product's own loading skeleton shown on purpose sits in [data-audit-skeleton])
# and `drawn-figure` (a figure the kit draws, data-drawn, larger than a small UI avatar: a portrait over 72 px,
# the still life over 48 px at 1080p; a real photo belongs there).
#
# Usage (from the project root):
#   bash scripts/layout-audit.sh <Comp> [--frames 120,240 | --cues | --copy | --every 6] [--props '{"k":1}']
#                                [--speed | --no-speed] [--max-text-speed 20] [--max-read-speed 3]
#                                [--safe feed9x16 | --safe 270,120,420,64 | --safe 96,64]
#                                [--entry src/index.ts] [--json out/qa/layout-<Comp>.json]
#                                [--out out/qa/layout-<Comp>] [--concurrency 2] [--strict]
#                                [--scale 0.5] [--no-placement] [--log render.log] [--bundle DIR]
#   frames   --copy (default): each COPY entry's resolved frame, mid-hold and last frame before it leaves
#            --cues: every CUE frame plus each COPY resolved frame
#            --frames: an explicit comma list
#            --every N: every Nth frame of the composition (the tween registry for grammar-score.mjs)
#   Comp ActN reads frames relative to the Nth entry of ACT; any other composition (Film,
#   Film9x16, ...) uses absolute timeline frames. The composition must accept an `audit` prop
#   (and a `safe` prop it hands to <Audit>, as the starter's Film and acts do).
#   speed    also renders f+1 for each audited frame f (except the composition's last) and fails a
#            readable text box (effective opacity >= 0.5, at least the minimum size) whose centre
#            moves more than --max-text-speed px/f (default 20, in px of a 1080 px tall frame, so
#            9:16 and 1:1 compare fairly). Boxes match by data-text id: give each line its own.
#            Inside a box's reading window the limit is --max-read-speed (default 3 px/f): the
#            window is the timeline's READ for the COPY entry whose id is the box's data-text id (or
#            its part before the first '.'), and for a fragment of a build chain (fx/Chain) that
#            is not the last, its own read hold plus the full line's read after the last fragment
#            resolves: in between, the line may glide to re-centre at in-flight speed. A frame inside a
#            declared re-centre jump (the pace's recentre 'jump' or 'slot': from the new fragment's
#            first frame, recentreDur long) is held to --max-text-speed, reported as a jump.
#            On by default with --cues (--no-speed turns it off); opt in with --copy or --frames,
#            where it doubles the stills. The composition's length comes from src/timeline.ts.
#   safe     a preset from src/lib/safe.ts (feed9x16, feed9x16Strict, square1x1, portrait4x5,
#            wide16x9, title), insets top,right,bottom,left in px, the older symmetric x,y, or a
#            JSON object. Default: the composition's own `safe` prop, else the preset for its
#            aspect (9:16 -> feed9x16). The audit also fails text painted under a data-mover.
#   scale    renders the stills at this share of the frame (0.25-1; the boxes stay in the composition's px):
#            a quick placement or layout pass at half size.
#   bundle   render the stills from a bundle already built (render.sh keeps one in out/render/<name>/bundle,
#            frames.mjs in its cache) instead of bundling the project again: minutes saved per audit. The bundle
#            holds the source as it was built: rebuild it after an edit. The timeline is still read from the entry.
#   log      no render: read the CINETIC_AUDIT lines from this file (a log another renderer kept of the
#            page's console for the same frames, e.g. renderStill's onBrowserLog with props {"audit":true}).
# Exit codes: 0 no issues, 1 issues found or the audit did not run, 2 bad arguments.
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }
# this script's folder, before any cd (ui-layout.cjs sits next to it); a Windows path where node needs one
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && { pwd -W 2>/dev/null || pwd; })
die() { echo "layout-audit: $*" >&2; exit 2; }

COMP=""; MODE=copy; FRAMES=""; PROPS="{}"; SAFE=""; ENTRY=src/index.ts; BUNDLE=""; JSON=""; OUTDIR=""; CONC="${CONCURRENCY:-2}"; EVERY=0; STRICT=0
SCALE=1; PLACE=1; LOGIN=""
SPEED=""; MAXV=20; MAXR=3
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --frames) MODE=frames; FRAMES="${2:?--frames needs a list}"; shift 2 ;;
    --cues) MODE=cues; shift ;;
    --copy) MODE=copy; shift ;;
    --every) MODE=every; EVERY="${2:?--every needs a frame step}"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    --scale) SCALE="${2:?--scale needs a share of the frame}"; shift 2 ;;
    --no-placement) PLACE=0; shift ;;
    --log) LOGIN="${2:?--log needs a file}"; shift 2 ;;
    --speed) SPEED=1; shift ;;
    --no-speed) SPEED=0; shift ;;
    --max-text-speed) MAXV="${2:?--max-text-speed needs px/f}"; SPEED="${SPEED:-1}"; shift 2 ;;
    --max-read-speed) MAXR="${2:?--max-read-speed needs px/f}"; SPEED="${SPEED:-1}"; shift 2 ;;
    --props) PROPS="${2:?--props needs JSON}"; shift 2 ;;
    --safe) SAFE="${2:?--safe needs a preset, insets or JSON}"; shift 2 ;;
    --entry) ENTRY="${2:?}"; shift 2 ;;
    --bundle) BUNDLE="${2:?--bundle needs a bundle folder}"; shift 2 ;;
    --json) JSON="${2:?}"; shift 2 ;;
    --out) OUTDIR="${2:?}"; shift 2 ;;
    --concurrency) CONC="${2:?}"; shift 2 ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) [[ -z "$COMP" ]] || die "one composition only"; COMP="$1"; shift ;;
  esac
done
[[ -n "$COMP" ]] || { usage; die "missing <Comp>"; }
node -e "process.exit(Number(process.argv[1]) > 0 ? 0 : 1)" "$MAXV" || die "--max-text-speed must be a positive number of px/f"
node -e "process.exit(Number(process.argv[1]) > 0 ? 0 : 1)" "$MAXR" || die "--max-read-speed must be a positive number of px/f"
node -e "const v=Number(process.argv[1]);process.exit(v>=0.25&&v<=1?0:1)" "$SCALE" || die "--scale must be 0.25-1"
[[ -n "$SPEED" ]] || { [[ "$MODE" == cues ]] && SPEED=1 || SPEED=0; }

# Run from the project root: the current directory if it holds the entry, else this script's parent.
if [[ ! -f "$ENTRY" ]]; then cd "$(dirname "${BASH_SOURCE[0]}")/.."; fi
[[ -f "$ENTRY" ]] || die "entry $ENTRY not found (run from the project root or pass --entry)"
[[ -z "$BUNDLE" || -f "$BUNDLE/index.html" ]] || die "--bundle $BUNDLE holds no index.html (a folder npx remotion bundle or render.sh wrote)"
JSON="${JSON:-out/qa/layout-$COMP.json}"
OUTDIR="${OUTDIR:-out/qa/layout-$COMP}"
mkdir -p "$(dirname "$JSON")"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/layout-audit-XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# Frame list and the composition's length from the timeline (tsx loads src/timeline.ts directly).
[[ "$MODE" != every ]] || node -e "process.exit(Number.isInteger(Number(process.argv[1])) && Number(process.argv[1]) > 0 ? 0 : 1)" "$EVERY" || die "--every needs a whole number of frames"
TL="$(dirname "$ENTRY")/timeline.ts"
if [[ "$MODE" != frames || "$SPEED" == 1 || ( "$PLACE" == 1 && -f "$TL" ) ]]; then
  [[ -f "$TL" ]] || die "$TL not found; pass --frames (and --no-speed: --speed reads the composition's length from it)"
  cat > "$TMP/frames.ts" <<EOF
import * as T from '$(cd "$(dirname "$TL")" && { pwd -W 2>/dev/null || pwd; })/timeline.ts';
const mode = '$MODE';
const comp = '$COMP';
const acts = Object.values(T.ACT as Record<string, { from: number; dur: number }>);
const m = /^Act(\d+)$/.exec(comp);
const act = m ? acts[Number(m[1]) - 1] : null;
if (m && !act) { console.error('no ACT entry #' + m[1]); process.exit(3); }
const [lo, hi] = act ? [act.from, act.from + act.dur] : [0, T.TOTAL as number];
const out = new Set<number>();
type C = { id: string; text: string; in: number; resolved: number; out?: number; chain?: string; mode?: string };
const copy = (T.COPY ?? []) as C[];
for (const c of copy) {
  const end = Math.min(c.out ?? T.TOTAL, T.TOTAL) - 1;
  out.add(c.resolved);
  if (mode === 'copy') { out.add(Math.floor((c.resolved + end) / 2)); out.add(end); }
}
if (mode === 'cues') for (const v of Object.values(T.CUE as Record<string, number | number[]>)) for (const f of [v].flat()) out.add(f);
if (mode === 'every') for (let f = lo; f < hi; f += $EVERY) out.add(f);
const frames = [...out].filter((f) => f >= lo && f < hi).map((f) => Math.round(f - lo)).sort((a, b) => a - b);
// Reading windows per COPY id (composition frames): the timeline's READ (src/lib/pace.ts
// readingWindows(), the rule every check shares), else the same rule computed here: from resolved
// for at most readMax, an earlier fragment of a chain only for its own hold, a build line once
// more after its last fragment.
const P = ((T as any).PACE ?? {})[(T as any).PACE_NAME ?? ''] ?? { holdBase: 36, holdPerWord: 6, holdMin: 42, readMax: 120 };
const s60 = (T.FPS as number) / 60;
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const hold = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s60);
const cap = Math.round((P.readMax ?? 120) * s60);
const READ = (T as any).READ as Record<string, [number, number][]> | undefined;
const windows: Record<string, [number, number][]> = {};
for (const c of copy) {
  let w: [number, number][];
  if (READ && Array.isArray(READ[c.id])) w = READ[c.id];
  else {
    const end = Math.min(c.out ?? T.TOTAL, T.TOTAL);
    const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, b) => a.in - b.in) : [c];
    const last = chain[chain.length - 1];
    const next = chain[chain.indexOf(c) + 1];
    const own: [number, number] = next ? [c.resolved, Math.min(next.in, c.resolved + hold(words(c.text)), end)] : [c.resolved, Math.min(end, c.resolved + cap)];
    const line: [number, number] | null = next && (c.mode ?? 'build') === 'build' ? [last.resolved, Math.min(last.out ?? T.TOTAL, last.resolved + cap)] : null;
    w = line ? [own, line] : [own];
  }
  windows[c.id] = w.map(([a, b]) => [a - lo, b - lo]);
}
// Declared re-centre jumps (composition frames): a build chain whose pace re-centres with a 'jump' (or
// opens a 'slot') moves the whole line from each later fragment's first frame over recentreDur f@60.
const jumps: Record<string, [number, number][]> = {};
const how = P.recentre;
if (how === 'jump' || how === 'slot') {
  const dur = Math.max(1, Math.round((P.recentreDur ?? 22) * s60));
  const lead = how === 'slot' ? Math.round(Math.max(P.recentreLead ?? 0, 12) * s60) : 0;
  const chains = new Map<string, C[]>();
  for (const c of copy) if (c.chain && (c.mode ?? 'build') === 'build') chains.set(c.chain, [...(chains.get(c.chain) ?? []), c]);
  for (const list of chains.values()) {
    list.sort((a, b) => a.in - b.in);
    list.forEach((c, j) => {
      if (!j) return;
      const w: [number, number] = [c.in - lead - lo, c.in - lead + dur + 1 - lo];
      for (const x of list) (jumps[x.id] ??= []).push(w);
    });
  }
}
console.log([...new Set(frames)].join(','));
console.log(hi - lo);
console.log(JSON.stringify(windows));
console.log(JSON.stringify(jumps));
// the film's words for the placement gate: each COPY entry's kind and span (composition frames)
console.log(JSON.stringify(copy.map((c) => ({ id: c.id, chain: c.chain, kind: (c as { kind?: string }).kind ?? 'copy', in: c.in - lo, out: Math.min(c.out ?? T.TOTAL, T.TOTAL) - lo }))));
console.log(T.FPS);
EOF
  LIST=$(npx tsx "$TMP/frames.ts") || die "could not read frames from $TL"
  LEN=$(sed -n 2p <<< "$LIST")
  WINDOWS=$(sed -n 3p <<< "$LIST")
  JUMPS=$(sed -n 4p <<< "$LIST")
  WORDS=$(sed -n 5p <<< "$LIST")
  FPSV=$(sed -n 6p <<< "$LIST")
  if [[ "$MODE" != frames ]]; then
    FRAMES=$(head -n 1 <<< "$LIST")
    [[ -n "$FRAMES" ]] || die "no COPY/CUE frames fall inside $COMP; pass --frames"
  fi
fi
FRAMES=$(node -e "const f=[...new Set(process.argv[1].split(',').map(Number))].filter(Number.isInteger).sort((a,b)=>a-b);if(!f.length)process.exit(1);console.log(f.join(','))" "$FRAMES") || die "bad --frames list"
ALLPROPS=$(node -e "try{const p=JSON.parse(process.argv[1]);p.audit=true;console.log(JSON.stringify(p))}catch(e){process.exit(1)}" "$PROPS") || die "--props is not valid JSON"
if [[ -n "$SAFE" ]]; then
  # preset name | t,r,b,l | x,y | JSON  ->  props.safe (validated again by src/lib/safe.ts at render)
  ALLPROPS=$(node -e '
    const [props, s] = process.argv.slice(1); const p = JSON.parse(props); let v;
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(s)) v = s;
    else if (/^\s*\{/.test(s)) v = JSON.parse(s);
    else { const n = s.split(",").map(Number); if (n.some((x) => !(x >= 0))) process.exit(1);
      if (n.length === 4) v = { top: n[0], right: n[1], bottom: n[2], left: n[3] };
      else if (n.length === 2) v = { x: n[0], y: n[1] }; else process.exit(1); }
    p.safe = v; console.log(JSON.stringify(p));' "$ALLPROPS" "$SAFE") || die "--safe must be a preset name, top,right,bottom,left, x,y or a JSON object"
fi

# --speed: render f+1 beside each audited frame f (none past the composition's last frame).
RENDER="$FRAMES"; SPEEDMAX=0; WINDOWS="${WINDOWS:-}"; JUMPS="${JUMPS:-}"; WORDS="${WORDS:-}"; FPSV="${FPSV:-60}"
[[ "$PLACE" == 1 ]] || WORDS=""
if [[ "$SPEED" == 1 ]]; then
  RENDER=$(node -e "const n=Number(process.argv[2]);console.log([...new Set(process.argv[1].split(',').map(Number).flatMap((f)=>f+1<n?[f,f+1]:[f]))].sort((a,b)=>a-b).join(','))" "$FRAMES" "$LEN")
  SPEEDMAX="$MAXV"
fi

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
clamp_conc layout-audit
echo "layout-audit: $COMP frames $FRAMES$([[ "$SPEED" == 1 ]] && echo " (+ f+1 of each for text speed, max $MAXV px/f, $MAXR while read)")"
if [[ -n "$LOGIN" ]]; then
  [[ -f "$LOGIN" ]] || die "--log $LOGIN not found"
  cp "$LOGIN" "$TMP/render.log"
elif ! { rm -rf "$OUTDIR"; mkdir -p "$OUTDIR"; } || ! FORCE_COLOR=0 NO_COLOR=1 npx remotion render "${BUNDLE:-$ENTRY}" "$COMP" "$OUTDIR" --sequence --frames="$RENDER" --props="$ALLPROPS" \
     --image-format=jpeg --concurrency="$CONC" --scale="$SCALE" --log=verbose > "$TMP/render.log" 2>&1; then
  grep -m1 -E "safe: (unknown preset|[a-z]+ must be)" "$TMP/render.log" >&2 || tail -30 "$TMP/render.log" >&2
  echo "layout-audit: render failed" >&2; exit 1
fi

printf '%s' "$WORDS" > "$TMP/words.json"
node - "$TMP/render.log" "$JSON" "$COMP" "$FRAMES" "$OUTDIR" "$SPEEDMAX" "${LEN:-0}" "$MAXR" "$WINDOWS" "$JUMPS" "$STRICT" "$HERE" "$TMP/words.json" "$FPSV" <<'EOF'
const fs = require('fs');
const [log, jsonPath, comp, framesArg, outDir, maxArg, lenArg, readArg, windowsArg, jumpsArg, strictArg, here, wordsPath, fpsArg] = process.argv.slice(2);
const filmWords = (() => { try { const t = fs.readFileSync(wordsPath, 'utf8').trim(); return t ? JSON.parse(t) : null; } catch { return null; } })();
const jumps = JSON.parse(jumpsArg || '{}'); // COPY id -> [[from, to), ...] declared re-centre jumps (composition frames)
const strict = strictArg === '1';
const jumpingAt = (id, f) => {
  const w = jumps[id] ?? jumps[String(id).split('.')[0]];
  return !!w && w.some(([a, b]) => f >= a && f < b);
};
const want = framesArg.split(',').map(Number);
const maxV = Number(maxArg); // text-speed limit, px/f in a 1080 px tall frame; 0: the check is off
const maxR = Number(readArg); // the limit while the text is being read
const windows = JSON.parse(windowsArg || '{}'); // COPY id -> [[from, to), ...] reading windows (composition frames)
const readingAt = (id, f) => {
  const w = windows[id] ?? windows[String(id).split('.')[0]];
  return !!w && w.some(([a, b]) => f >= a && f < b);
};
const pairs = maxV > 0 ? want.filter((f) => f + 1 < Number(lenArg)) : []; // f -> f+1
const byFrame = new Map();
const tweens = new Map(); // span + curve -> the tween (deduplicated across the audited frames)
// a shell with colour on prints the console lines with ANSI escapes after the JSON: strip them, parse to the last }
const json = (s) => JSON.parse(s.slice(0, s.lastIndexOf('}') + 1));
for (const raw of fs.readFileSync(log, 'utf8').split('\n')) {
  const line = raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  const TAG = 'CINETIC_AUDIT ';
  const i = line.indexOf(TAG);
  const k = line.indexOf('CINETIC_TWEENS ');
  if (k >= 0) {
    try {
      const d = json(line.slice(k + 'CINETIC_TWEENS '.length));
      for (const t of d.tweens ?? []) tweens.set(`${Math.round(t.from * 100)}|${Math.round(t.to * 100)}|${t.token}|${t.family}`, t);
    } catch { /* truncated line */ }
  }
  if (i < 0) continue;
  try { const d = json(line.slice(i + TAG.length)); byFrame.set(d.frame, d); } catch { /* truncated line */ }
}
const missing = [...new Set([...want, ...pairs.map((f) => f + 1)])].filter((f) => !byFrame.has(f));
const audited = want.filter((f) => byFrame.has(f)).map((f) => byFrame.get(f)); // f+1 frames only feed the speed
const issues = [];
for (const d of audited) for (const x of d.issues) issues.push({ frame: d.frame, ...x });
const warnings = [];
for (const d of audited) for (const x of d.warnings ?? []) warnings.push({ frame: d.frame, ...x });
const jumped = [];
// Text speed: each box's centre from f to the nearest box with its id on f+1, in px of a 1080 px
// tall frame. Readable: effective opacity >= 0.5 and at least the minimum size.
let fastest = null;
let fastestRead = null;
for (const f of pairs) {
  const a = byFrame.get(f), b = byFrame.get(f + 1);
  if (!a || !b) continue;
  const k = 1080 / a.height;
  for (const box of a.boxes) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const d = Math.min(...b.boxes.filter((n) => n.id === box.id).map((n) => Math.hypot(n.x + n.w / 2 - cx, n.y + n.h / 2 - cy)));
    if (!Number.isFinite(d)) continue; // gone (or faded out) on f+1
    box.speed = Math.round(d * k * 10) / 10;
    if (box.opacity < 0.5 || box.px < (a.minPx ?? 0)) continue;
    if (box.smear) continue; // drawn inside an active smear (fx/Defocus DirBlur): blurred along its motion, not a double image
    if (box.push === 'moving') continue; // inside a type push in flight (fx/TypePush): a camera move about the reading point, not text travelling
    if (!fastest || box.speed > fastest.speed) fastest = { frame: f, id: box.id, speed: box.speed };
    const jump = jumpingAt(box.id, f);
    const read = readingAt(box.id, f) && !jump;
    if (jump && box.speed > maxR) jumped.push({ frame: f, id: box.id, speed: box.speed });
    if (read && (!fastestRead || box.speed > fastestRead.speed)) fastestRead = { frame: f, id: box.id, speed: box.speed };
    const limit = read ? maxR : maxV;
    if (box.speed <= limit) continue;
    const at = k === 1 ? '' : ` (${Math.round(d * 10) / 10} px/f in ${a.width}x${a.height}, scaled to 1080 px tall)`;
    issues.push({ frame: f, kind: read ? 'read-speed' : 'text-speed', id: box.id,
      detail: read
        ? `${box.speed} px/f > ${maxR}${at} while it is being read: hold it near still (a drift under 1 px/f) until the read is done`
        : `${box.speed} px/f > ${maxV}${at}: slow it under ${maxV} px/f, or fade its text out for the flight and resolve it on landing`, speed: box.speed });
  }
}
// Product UI is simple and aligned (scripts/ui-layout.cjs): rows of one card share their left edge (ui-align, a fail when it
// rests on 2+ audited frames), and text crossing a mark's or a picture's edge is listed for look-audit.py --layout to
// confirm on the pixels (text-on-asset); these warnings stay apart from the type warnings (--strict does not fail them).
let ui = { issues: [], warnings: [] };
try { ui = require(require('path').join(here, 'ui-layout.cjs')).uiLayout(audited); } catch (e) { console.log(`  ui-layout: not run (${e.message})`); }
issues.push(...ui.issues);
// The safe zone holds resting states: a box measured moving faster than the read limit on its frame (entering,
// leaving, travelling) is not at rest, so its excursion past the zone is listed apart, not failed; at rest it is held.
const moving = [];
if (pairs.length)
  for (let i = issues.length - 1; i >= 0; i--) {
    const x = issues[i];
    if (x.kind !== 'safe-area') continue;
    const box = byFrame.get(x.frame)?.boxes.find((b) => b.id === x.id && b.speed !== undefined);
    if (box && box.speed > maxR && !readingAt(x.id, x.frame)) moving.push({ ...issues.splice(i, 1)[0], speed: box.speed });
  }
// Placement: where each statement stands over its time (see the header). Statements are the COPY entries that are not
// 'ui' or 'name'; a name is held to the flush-left rule only. Boxes merge by COPY id (exact, else with their part
// suffixes taken off), and the fragments of one build chain merge into their line (a line built in parts is measured whole).
const placement = (() => {
  if (!filmWords || !audited.length) return null;
  const byId = new Map();
  for (const c of filmWords) {
    const k = c.chain || c.id;
    const had = byId.get(k);
    byId.set(k, had ? { ...had, in: Math.min(had.in, c.in), out: Math.max(had.out, c.out) } : { id: k, kind: c.kind, in: c.in, out: c.out });
  }
  const keyOf = new Map(filmWords.map((c) => [c.id, c.chain || c.id]));
  // a box's COPY id: its own, else with its part suffixes taken off one by one (a stack line "what-1", a claim line "tag.1.0")
  const idOf = (b) => {
    for (let id = String(b.id); id; ) {
      if (keyOf.has(id)) return keyOf.get(id);
      if (byId.has(id)) return id;
      const cut = id.replace(/[.-][^.-]*$/, '');
      if (cut === id) break;
      id = cut;
    }
    return null;
  };
  const samples = []; // { id, frame, h, v, layout, headline }
  for (const d of audited) {
    const W = d.width, H = d.height;
    const spans = new Map();
    for (const b of d.boxes) {
      const id = idOf(b);
      if (!id || b.ui || b.opacity < 0.5 || b.px < (d.minPx ?? 0) || b.push) continue; // a type push (in flight or landed as a bleed) is a camera move through a line read centred
      const s = spans.get(id) ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, px: 0 };
      spans.set(id, { x0: Math.min(s.x0, b.x), y0: Math.min(s.y0, b.y), x1: Math.max(s.x1, b.x + b.w), y1: Math.max(s.y1, b.y + b.h), px: Math.max(s.px, b.px ?? 0) });
    }
    const pics = Array.isArray(d.pictures) ? d.pictures : null;
    for (const [id, s] of spans) {
      const cx = (s.x0 + s.x1) / 2 / W, cy = (s.y0 + s.y1) / 2 / H;
      const h = Math.abs(cx - 0.5) <= 0.1 ? 'centre' : cx < 0.5 ? 'left' : 'right';
      const v = cy < 0.35 ? 'top' : cy > 0.65 ? 'bottom' : 'middle';
      let layout = pics ? 'alone' : null;
      if (pics && pics.length) {
        const sa = Math.max(1, (s.x1 - s.x0) * (s.y1 - s.y0));
        const ov = (p) => Math.max(0, Math.min(s.x1, p.x + p.w) - Math.max(s.x0, p.x)) * Math.max(0, Math.min(s.y1, p.y + p.h) - Math.max(s.y0, p.y));
        const inFrame = (p) => Math.max(0, Math.min(W, p.x + p.w) - Math.max(0, p.x)) * Math.max(0, Math.min(H, p.y + p.h) - Math.max(0, p.y));
        // text-top split: the line above a picture that fills the rest of the frame under it (the pictures whose top is
        // past the line's centre and that share its span across: together at least 40 % of the width and 8 % of the
        // frame, starting within 12 % of the height under the line), in any band
        const mid0 = (s.y0 + s.y1) / 2;
        const under = pics.filter((p) => inFrame(p) >= 0.01 * W * H && p.y >= mid0 && Math.min(s.x1, p.x + p.w) - Math.max(s.x0, p.x) > 0);
        const ux0 = Math.min(...under.map((p) => Math.max(0, p.x))), ux1 = Math.max(...under.map((p) => Math.min(W, p.x + p.w)));
        const uy0 = Math.min(...under.map((p) => p.y));
        const fills = under.length > 0 && ux1 - ux0 >= 0.4 * W && under.reduce((a, p) => a + inFrame(p), 0) >= 0.08 * W * H && uy0 - s.y1 <= 0.12 * H;
        if (pics.some((p) => ov(p) > 0.5 * sa || inFrame(p) >= 0.7 * W * H)) layout = 'over';
        else if (fills) layout = 'text-top-split';
        else {
          const big = pics.filter((p) => inFrame(p) >= 0.04 * W * H).sort((a, b) => inFrame(b) - inFrame(a))[0];
          if (big) {
            const hx = Math.min(s.x1, big.x + big.w) - Math.max(s.x0, big.x) > 0;
            const vy = Math.min(s.y1, big.y + big.h) - Math.max(s.y0, big.y) > 0;
            const mid = (s.y0 + s.y1) / 2;
            if (!hx && vy) layout = 'beside';
            else if (hx && big.y >= mid) layout = v === 'top' ? 'text-top/picture-below' : 'above-picture';
            else if (hx && big.y + big.h <= mid) layout = v === 'bottom' ? 'text-bottom/picture-above' : 'below-picture';
            else layout = 'near';
          }
        }
      }
      samples.push({ id, frame: d.frame, h, v, layout, headline: s.px >= 0.045 * H });
    }
  }
  const count = new Map();
  for (const x of samples) count.set(x.id, (count.get(x.id) ?? 0) + 1);
  const weight = (x) => Math.max(1, byId.get(x.id).out - byId.get(x.id).in) / count.get(x.id);
  const isStatement = (id) => !['ui', 'name'].includes(byId.get(id).kind);
  const stm = samples.filter((x) => isStatement(x.id));
  const tot = stm.reduce((a, x) => a + weight(x), 0);
  const share = (f) => (tot ? Math.round((1000 * stm.filter(f).reduce((a, x) => a + weight(x), 0)) / tot) / 10 : null);
  const major = (id, key) => {
    const m = new Map();
    for (const x of samples) if (x.id === id) m.set(x[key], (m.get(x[key]) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const ids = [...count.keys()];
  const leftTB = ids.filter((id) => {
    if (byId.get(id).kind === 'ui') return false; // the product's own strings sit where its UI puts them
    const xs = samples.filter((y) => y.id === id);
    return xs.filter((x) => x.h === 'left' && x.v !== 'middle').length * 2 >= xs.length;
  });
  const stmIds = ids.filter(isStatement);
  const layouts = Object.fromEntries(stmIds.map((id) => [id, major(id, 'layout')]));
  // a product string set as a headline (a page title at statement size, outside any picture) reads as a line of the film
  // here: it counts toward the text-top splits by its headline-size samples
  const headlineUi = ids.filter((id) => byId.get(id).kind === 'ui').filter((id) => {
    const xs = samples.filter((x) => x.id === id && x.headline);
    return xs.length && xs.filter((x) => x.layout === 'text-top-split').length * 2 >= xs.length;
  });
  const TOP = ['text-top-split', 'text-top/picture-below'];
  const textTop = [...stmIds.filter((id) => TOP.includes(layouts[id])), ...headlineUi];
  for (const id of headlineUi) layouts[id] = 'text-top-split';
  const split = stmIds.filter((id) => [...TOP, 'text-bottom/picture-above', 'above-picture', 'below-picture', 'beside'].includes(layouts[id]));
  const durS = Number(lenArg) > 0 ? Number(lenArg) / (Number(fpsArg) || 60) : 0;
  const splitMax = Math.max(1, Math.ceil(durS / 30));
  const out = {
    statements: stmIds.length, samples: stm.length, centred: share((x) => x.h === 'centre'), middle: share((x) => x.v === 'middle'),
    centreMiddle: share((x) => x.h === 'centre' && x.v === 'middle'),
    leftTopBottom: leftTB, textTopPictureBelow: textTop, split, splitMax, layouts,
    where: Object.fromEntries(ids.map((id) => [id, `${major(id, 'h')}-${major(id, 'v')}`])),
    limits: { centred: 80, middle: 85, leftTopBottom: 0, textTopPictureBelow: 1, splitPer30s: 1 },
  };
  if (stm.length) {
    if (out.centred < 80) issues.push({ frame: -1, kind: 'placement', id: 'film', detail: `statements centred ${out.centred} % of their time < 80 %: centre the line (a picture beside it moves before or after the line)` });
    if (out.middle < 85) issues.push({ frame: -1, kind: 'placement', id: 'film', detail: `statements in the middle band ${out.middle} % of their time < 85 %: set the line at 35-65 % of the height (centred top or bottom only over a full-bleed picture)` });
  }
  for (const id of leftTB) issues.push({ frame: -1, kind: 'placement', id, detail: `flush left at the ${major(id, 'v')} of the frame: never; centre it` });
  if (textTop.length >= 2) issues.push({ frame: -1, kind: 'placement', id: textTop.join('+'), detail: `${textTop.length} text-top splits (a line above a picture filling the rest of the frame, or in the top band over one; at most 1 a film): give the line its own beat, centred, and the picture the next` });
  else if (textTop.length === 1) warnings.push({ frame: -1, kind: 'placement', id: textTop[0], detail: "a text-top split (a line above a picture filling the rest of the frame): the film's one (a second fails)" });
  if (split.length > splitMax) (strict ? issues : warnings).push({ frame: -1, kind: 'placement', id: split.join('+'), detail: `${split.length} split layouts (a line beside, above or below a picture) > ${splitMax} (1 per 30 s)` });
  return out;
})();
issues.sort((p, q) => p.frame - q.frame);
const report = {
  tool: 'layout-audit', comp, frames: want, audited: audited.length, missing, stills: outDir,
  width: audited[0]?.width, height: audited[0]?.height,
  pass: issues.length === 0 && missing.length === 0 && audited.length > 0 && !(strict && warnings.length),
  issues, warnings, uiWarnings: ui.warnings, jumps: jumped, moving: moving.sort((p, q) => p.frame - q.frame), placement,
  typeBands: audited[0]?.bands, typeWidths: audited[0]?.widths,
  tweens: [...tweens.values()].sort((p, q) => p.from - q.from),
  speed: maxV > 0 ? { max: maxV, read: maxR, pairs: pairs.length, fastest, fastestRead } : null,
  words: audited.reduce((m, d) => (d.words !== undefined && (!m || d.words > m.max) ? { max: d.words, frame: d.frame, ui: d.uiWords ?? 0 } : m), null),
  zone: audited[0]?.zone, safe: audited[0]?.safe,
  boxes: audited.map((d) => ({ frame: d.frame, width: d.width, height: d.height, safe: d.safe, boxes: d.boxes, ...(d.logos?.length ? { logos: d.logos } : {}), ...(d.imagery?.length ? { imagery: d.imagery } : {}), ...(d.pictures?.length ? { pictures: d.pictures } : {}), ...(d.icons?.length ? { icons: d.icons } : {}) })),
};
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 1) + '\n');
for (const x of issues) console.log(`  f${x.frame}  ${x.kind}  ${x.id}  ${x.detail}`);
for (const x of warnings.slice(0, 20)) console.log(`  f${x.frame}  warn ${x.kind}  ${x.id}  ${x.detail}`);
for (const x of ui.warnings.slice(0, 20)) console.log(`  f${x.frame}  warn ${x.kind}  ${x.id}  ${x.detail}`);
if (moving.length) console.log(`  ${moving.length} box(es) past the safe zone while moving faster than ${maxR} px/f (not at rest, listed apart): ${[...new Set(moving.map((x) => x.id))].join(', ')}`);
if (jumped.length) console.log(`  ${jumped.length} declared re-centre jump frame(s) moved read text faster than ${maxR} px/f (held to ${maxV}): fastest ${Math.max(...jumped.map((j) => j.speed))} px/f`);
if (!byFrame.size) console.log(`  no CINETIC_AUDIT output: does ${comp} accept the audit prop and render <Audit/> inside <FontGate>?`);
else if (missing.length) console.log(`  no audit line for frames ${missing.join(',')}`);
if (placement && placement.samples) {
  const p = placement;
  console.log(`  placement: centred ${p.centred} % of statement time (>= 80), middle band ${p.middle} % (>= 85), flush left top/bottom ${p.leftTopBottom.length}, text-top splits ${p.textTopPictureBelow.length} (<= 1), split ${p.split.length} (<= ${p.splitMax}); ${p.statements} statements`);
}
const n = audited.reduce((s, d) => s + d.boxes.length, 0);
const z = report.safe ? ` in ${report.zone} (top ${report.safe.top}, right ${report.safe.right}, bottom ${report.safe.bottom}, left ${report.safe.left})` : '';
const v = maxV > 0 ? `, fastest readable text ${fastest ? `${fastest.speed} px/f (${fastest.id} f${fastest.frame})` : 'not measured'}` +
  (fastestRead ? `, ${fastestRead.speed} px/f while read (${fastestRead.id} f${fastestRead.frame})` : '') : '';
const wv = report.words ? `, at most ${report.words.max} film words readable (f${report.words.frame})` : '';
console.log(`layout-audit: ${audited.length}/${want.length} frames, ${n} text boxes${z}${v}${wv}, ${issues.length} issues, ${warnings.length} type warnings, ${ui.warnings.length} ui warnings, ${report.tweens.length} tweens -> ${report.pass ? 'pass' : 'FAIL'} (${jsonPath}, stills in ${outDir})`);
process.exit(report.pass ? 0 : 1);
EOF
