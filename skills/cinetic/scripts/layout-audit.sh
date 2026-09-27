#!/usr/bin/env bash
# layout-audit.sh: render audit stills of a composition and check every text box.
#
# Renders the chosen frames with --props '{"audit":true}'. The starter's <Audit> (src/lib/Audit.tsx)
# measures every element tagged data-text="<id>" and logs one BF_AUDIT JSON line per frame; this
# script collects them and fails on text outside the title-safe area, text boxes that overlap, and
# readable text under 22 px (at 1080p). The audit stills (boxes drawn, safe area dashed) are kept.
#
# Usage (from the project root):
#   bash scripts/layout-audit.sh <Comp> [--frames 120,240 | --cues | --copy] [--props '{"k":1}']
#                                [--entry src/index.ts] [--json out/qa/layout-<Comp>.json]
#                                [--out out/qa/layout-<Comp>] [--concurrency 2]
#   frames   --copy (default): each COPY entry's resolved frame, mid-hold and last frame before it leaves
#            --cues: every CUE frame plus each COPY resolved frame
#            --frames: an explicit comma list
#   Comp ActN reads frames relative to the Nth entry of ACT; any other composition (Film,
#   Film9x16, ...) uses absolute timeline frames. The composition must accept an `audit` prop.
# Exit codes: 0 no issues, 1 issues found or the audit did not run, 2 bad arguments.
set -euo pipefail

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }
die() { echo "layout-audit: $*" >&2; exit 2; }

COMP=""; MODE=copy; FRAMES=""; PROPS="{}"; ENTRY=src/index.ts; JSON=""; OUTDIR=""; CONC="${CONCURRENCY:-2}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --frames) MODE=frames; FRAMES="${2:?--frames needs a list}"; shift 2 ;;
    --cues) MODE=cues; shift ;;
    --copy) MODE=copy; shift ;;
    --props) PROPS="${2:?--props needs JSON}"; shift 2 ;;
    --entry) ENTRY="${2:?}"; shift 2 ;;
    --json) JSON="${2:?}"; shift 2 ;;
    --out) OUTDIR="${2:?}"; shift 2 ;;
    --concurrency) CONC="${2:?}"; shift 2 ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) [[ -z "$COMP" ]] || die "one composition only"; COMP="$1"; shift ;;
  esac
done
[[ -n "$COMP" ]] || { usage; die "missing <Comp>"; }

# Run from the project root: the current directory if it holds the entry, else this script's parent.
if [[ ! -f "$ENTRY" ]]; then cd "$(dirname "${BASH_SOURCE[0]}")/.."; fi
[[ -f "$ENTRY" ]] || die "entry $ENTRY not found (run from the project root or pass --entry)"
JSON="${JSON:-out/qa/layout-$COMP.json}"
OUTDIR="${OUTDIR:-out/qa/layout-$COMP}"
mkdir -p "$(dirname "$JSON")"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/layout-audit-XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# Frame list from the timeline (tsx loads src/timeline.ts directly).
if [[ "$MODE" != frames ]]; then
  TL="$(dirname "$ENTRY")/timeline.ts"
  [[ -f "$TL" ]] || die "$TL not found; pass --frames"
  cat > "$TMP/frames.ts" <<EOF
import * as T from '$(cd "$(dirname "$TL")" && pwd)/timeline.ts';
const mode = '$MODE';
const comp = '$COMP';
const acts = Object.values(T.ACT as Record<string, { from: number; dur: number }>);
const m = /^Act(\d+)$/.exec(comp);
const act = m ? acts[Number(m[1]) - 1] : null;
if (m && !act) { console.error('no ACT entry #' + m[1]); process.exit(3); }
const [lo, hi] = act ? [act.from, act.from + act.dur] : [0, T.TOTAL as number];
const out = new Set<number>();
const copy = (T.COPY ?? []) as { resolved: number; out?: number }[];
for (const c of copy) {
  const end = Math.min(c.out ?? T.TOTAL, T.TOTAL) - 1;
  out.add(c.resolved);
  if (mode === 'copy') { out.add(Math.floor((c.resolved + end) / 2)); out.add(end); }
}
if (mode === 'cues') for (const v of Object.values(T.CUE as Record<string, number | number[]>)) for (const f of [v].flat()) out.add(f);
const frames = [...out].filter((f) => f >= lo && f < hi).map((f) => Math.round(f - lo)).sort((a, b) => a - b);
console.log([...new Set(frames)].join(','));
EOF
  FRAMES=$(npx tsx "$TMP/frames.ts") || die "could not read frames from $TL"
  [[ -n "$FRAMES" ]] || die "no COPY/CUE frames fall inside $COMP; pass --frames"
fi
FRAMES=$(node -e "const f=[...new Set(process.argv[1].split(',').map(Number))].filter(Number.isInteger).sort((a,b)=>a-b);if(!f.length)process.exit(1);console.log(f.join(','))" "$FRAMES") || die "bad --frames list"
ALLPROPS=$(node -e "try{const p=JSON.parse(process.argv[1]);p.audit=true;console.log(JSON.stringify(p))}catch(e){process.exit(1)}" "$PROPS") || die "--props is not valid JSON"

echo "layout-audit: $COMP frames $FRAMES"
rm -rf "$OUTDIR"; mkdir -p "$OUTDIR"
if ! npx remotion render "$ENTRY" "$COMP" "$OUTDIR" --sequence --frames="$FRAMES" --props="$ALLPROPS" \
     --image-format=jpeg --concurrency="$CONC" --log=verbose > "$TMP/render.log" 2>&1; then
  tail -30 "$TMP/render.log" >&2
  echo "layout-audit: render failed" >&2; exit 1
fi

node - "$TMP/render.log" "$JSON" "$COMP" "$FRAMES" "$OUTDIR" <<'EOF'
const fs = require('fs');
const [log, jsonPath, comp, framesArg, outDir] = process.argv.slice(2);
const want = framesArg.split(',').map(Number);
const byFrame = new Map();
for (const line of fs.readFileSync(log, 'utf8').split('\n')) {
  const i = line.indexOf('BF_AUDIT ');
  if (i < 0) continue;
  try { const d = JSON.parse(line.slice(i + 9)); byFrame.set(d.frame, d); } catch { /* truncated line */ }
}
const missing = want.filter((f) => !byFrame.has(f));
const issues = [];
for (const [frame, d] of [...byFrame].sort((a, b) => a[0] - b[0])) for (const x of d.issues) issues.push({ frame, ...x });
const report = {
  tool: 'layout-audit', comp, frames: want, audited: byFrame.size, missing, stills: outDir,
  pass: issues.length === 0 && missing.length === 0 && byFrame.size > 0,
  issues,
  boxes: [...byFrame.values()].map((d) => ({ frame: d.frame, safe: d.safe, boxes: d.boxes })),
};
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 1) + '\n');
for (const x of issues) console.log(`  f${x.frame}  ${x.kind}  ${x.id}  ${x.detail}`);
if (!byFrame.size) console.log(`  no BF_AUDIT output: does ${comp} accept the audit prop and render <Audit/> inside <FontGate>?`);
else if (missing.length) console.log(`  no audit line for frames ${missing.join(',')}`);
const n = [...byFrame.values()].reduce((s, d) => s + d.boxes.length, 0);
console.log(`layout-audit: ${byFrame.size}/${want.length} frames, ${n} text boxes, ${issues.length} issues -> ${report.pass ? 'pass' : 'FAIL'} (${jsonPath}, stills in ${outDir})`);
process.exit(report.pass ? 0 : 1);
EOF
