#!/usr/bin/env node
/**
 * grammar-score.mjs: how close a film's motion grammar sits to its target, as numbers, so every
 * iteration of a film is a score next to its contact sheet.
 *
 * The target is the house grammar by default: the role mix of the curves, front-loaded arrivals,
 * exits that accelerate into cuts, durations and staggers (lib/anim.ts DUR and STAG), shot bands per
 * format, density, holds and seams (lib/look.ts GRAMMAR), cut sync, colour, type, and overlap. A
 * --target JSON replaces any part of it (a clip's measured grammar, for instance); `--print-target`
 * prints the house target to start from. Shot bands come from GRAMMAR.shot.band, so a new format band
 * needs no change here.
 *
 * Each dimension scores 100 inside the house target and 70 at its floor, linear between; past the floor it
 * falls to 0 at twice the target-floor gap. The floors of the measured dimensions are the edges of what the
 * house ranges reach (the films the house holds up as its bar, read by look-audit.py, each score 70 or more on every
 * render dimension, and a mean of 80 or more); the declared ones are set on the demo films the house made, so a
 * film a director passes passes them and the faults they name are the ones a director sees. Shot lengths and their
 * spread are ratios, so they fall with the log of the ratio to the band's edge (70 at `shot.r70` times beyond it,
 * 2; the spread at `shot.spreadR70`, 2.6). Each is tagged `measured` (read off the rendered frames:
 * look-audit.py, forensics.py) or `declared` (read off the timeline: cues.json, the tween registry of an audited
 * render); the score uses the measured value wherever a render was measured. Ship (target.ship): a mean of >= 80
 * over the measured and declared dimensions, none under 70, and the floor against a flat film (look-audit.py)
 * passing. 80 is the lowest mean those films reach (80.8); a dimension under 70 is outside all of them.
 * references/checks.md (grammar-score) has the bar and what each dimension reads.
 *
 * The tween registry holds every eased value an audited frame evaluated; drifts and creeps (linear, 1.5 s or
 * longer) are the living holds' own measure and stay out of the declared motion dimensions, and a camera's move
 * (a reposition of 2 s or more) is never an element's entrance or a secondary's primary.
 * Dimensions: role-mix (total-variation distance of arrive / reposition / leave / linear / spring
 * shares, <= 0.25; floor 0.6), front-loaded (entrances on arrive curves, >= 71 %; floor 40 %), into-cuts (moves
 * ending at a hard cut on leave curves, >= 71 %, from 3 such moves; a carried seam is crossed, not cut into),
 * durations (per role, medians in the house range, by ratio, the mean of the roles), staggers (runs of 3 or more
 * starts in the house gap range; a run of 6 or more irregular, CV >= 0.15; starts within 1.5 f@60 are one start and
 * a run on the beat grid is the track's; scored by share, 80 % for 100, 50 % for 70), shots (median in the
 * format's band, q75/q25 spread 1.9-3.1; not scored on a one-take film), density (starts per second 1.9-2.8,
 * floor 1.3-3.2; regions moving at once 1.6-2.5, floor 1.05-4.4; idle frames <= 15 %, floor 45 %), holds (no dead
 * stretch: forensics.py dead-stretch runs, over 2.5 s where nothing changes; a still hold is fine: 0 runs 100, 1 run
 * 60, more 30), seams (carried >= 40 %, floor 30 %; no kind more than 3 times except the signature;
 * the distance of the seam-kind mix from the house's is reported, not scored), cut-sync (hard cuts within 1 f of a
 * sound, the picture leading by up to 3 f, >= 50 %, floor 14 %; within 100 ms >= 80 %, floor 28 %; from 3 hard cuts;
 * not scored on a one-take film), velocity-seams (every declared one carries speed; half of them is the floor),
 * colour (hue groups <= 2, floor 8; neutral grounds and ink in band (a ground off the house bands, or pure black,
 * scores 85); and from the picture reads: neutral pixels >= 40 %, floor 15 %; saturated pixels <= 30 %, floor 55 %;
 * colour-wash frames <= 33 %, floor 60 %; the accent's hue family 2-17 % of the frame, floor 0-42 %; a second accent
 * scores 80; lib/look.ts NEUTRAL, COLOUR, PICTURE; frames inside a declared colour event are left out of the accent's
 * share, its p95 and the neutral share, so one declared flood is never scored as the film's colour), type (the
 * layout audit's boxes re-measured against the type bands both families share, lib/Audit.tsx TYPE_BANDS and
 * TYPE_WIDTH: text under the ui role (5 % under it is rounding, not a fault), a cap over the giant band or between two bands, a line past its width (a calm
 * sentence 75 %, a line 61 %, display and hero 84 %), more than 2 non-UI sizes at once; a push in flight is the
 * camera's, a landed push and a claim may bleed; counted per text, not per audited frame, so an old audit is
 * re-scored on today's bands; without boxes, layout-audit.sh's type-size warnings; `--print-target` shows where each
 * role of the calm and the bold family, lib/look.ts TYPE_LOOK, lands in the bands),
 * overlap (secondaries start before an element's primary move (up to 2 s) reaches 90 %, the foreground lands
 * 10-30 f@60 before a background arrival (40-150 f@60), the next element enters between 3 f@60 after and 6 f@60
 * before the previous one has left; each share scores 70 at half its target), picture (look-audit.py's picture floor:
 * flat ground, structure, colour mass (a mono film's grey is its own: 0 saturated is the floor), bleed, focus
 * falloff, and skeleton bars: 2-4 samples score 70 down to 0 at 10).
 *
 * Usage (from the project root):
 *   node scripts/grammar-score.mjs [--cues out/cues.json] [--layout out/qa/layout-Film.json]
 *        [--look out/qa/look.json] [--forensics out/qa/forensics.json] [--target target.json]
 *        [--format launch] [--src src] [--json out/grammar-score.json] [--quiet]
 *   node scripts/grammar-score.mjs --print-target [--src src]
 *   node scripts/grammar-score.mjs --self-test
 * The layout JSON carries the tweens when layout-audit.sh audited enough frames (--every 6). Each run
 * is appended to --json (default out/grammar-score.json) so a loop shows its progress.
 * Exit codes: 0 ship, 1 below the ship bar, 2 bad arguments or nothing to score.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = { cues: null, layout: null, look: null, forensics: null, target: null, format: null, src: null, json: 'out/grammar-score.json', quiet: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const val = () => {
    const v = argv[++i];
    if (v === undefined) {
      console.error(`grammar-score: ${a} needs a value`);
      process.exit(2);
    }
    return v;
  };
  if (a === '-h' || a === '--help') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
    process.exit(0);
  } else if (a === '--cues') opt.cues = val();
  else if (a === '--layout') opt.layout = val();
  else if (a === '--look') opt.look = val();
  else if (a === '--forensics') opt.forensics = val();
  else if (a === '--target') opt.target = val();
  else if (a === '--format') opt.format = val();
  else if (a === '--src') opt.src = val();
  else if (a === '--json') opt.json = val();
  else if (a === '--quiet') opt.quiet = true;
  else if (a === '--print-target') opt.printTarget = true;
  else if (a === '--self-test') opt.selfTest = true;
  else {
    console.error(`grammar-score: unknown option ${a}`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------------- the house target
/** An exported object literal of a TypeScript file, evaluated (types and `as const` stripped). */
const literal = (src, name) => {
  const at = src.search(new RegExp(`export const ${name}\\b[^=]*=\\s*\\{`));
  if (at < 0) return null;
  const open = src.indexOf('{', at + src.slice(at).search(/=\s*\{/));
  let depth = 0;
  let j = open;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) break;
  }
  const body = src
    .slice(open, j + 1)
    .replace(/\s+as\s+const\b/g, '')
    .replace(/\s+as\s+[A-Z][\w]*(\[\])?/g, '');
  try {
    return Function(`return (${body});`)();
  } catch {
    return null;
  }
};
/** An exported array literal of a TypeScript file (TYPE_BANDS), evaluated (its type annotation skipped). */
const arrayLiteral = (src, name) => {
  const m = new RegExp(`export const ${name}\\b[^=]*=\\s*\\[`).exec(src);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  let depth = 0;
  let j = open;
  for (; j < src.length; j++) {
    if (src[j] === '[') depth++;
    else if (src[j] === ']' && --depth === 0) break;
  }
  try {
    return Function(`return (${src.slice(open, j + 1).replace(/\s+as\s+const\b/g, '')});`)();
  } catch {
    return null;
  }
};
/** An exported number constant of a TypeScript file. */
const numConst = (src, name) => {
  const m = new RegExp(`export const ${name}\\b[^=]*=\\s*(-?[\\d.]+)\\s*;`).exec(src);
  return m ? Number(m[1]) : null;
};
// The type bands both families share, as lib/Audit.tsx holds them (used when no src is found): cap height (0.72 em) in %
// of the frame height; a calm line 84 px is 5.6 %, a bold line 120 px 8 %, display 160-200 10.7-13.3 %, a bold hero
// 240 px 16 %, a name re-set at a quarter of the frame 25-28 %, a giant 640-900 px 43-60 %.
const TYPE_HOUSE = {
  bands: [['caption', 2.3, 4], ['line', 4, 9], ['display', 9, 14], ['hero', 14, 26], ['giant', 26, 90]],
  widths: { line: 0.61, sentence: 0.75, sentenceCap: 6.5, display: 0.84, hero: 0.84 },
  uiPx: 30,
  minPx: 22,
  minPxTall: 32,
};
const capOf = (px, height = 1080) => Math.round(((0.72 * px) / height) * 1000) / 10;
/** The band a cap height falls in: a role, or 'ui' under the first, 'over' past the last, 'between' in a gap. */
const bandOf = (cap, bands) => bands.find(([, lo, hi]) => cap >= lo && cap <= hi)?.[0] ?? (cap < bands[0][1] ? 'ui' : cap > bands[bands.length - 1][2] ? 'over' : 'between');
/** The type part of the target: the audit's bands and widths, and where each role of each family lands in them at 1080p. */
const typeTarget = (audit = '', typeLook = {}) => {
  const B = arrayLiteral(audit, 'TYPE_BANDS');
  const bands = Array.isArray(B) && B.length && B.every((b) => Array.isArray(b) && b.length === 3) ? B : TYPE_HOUSE.bands;
  const families = Object.fromEntries(
    Object.entries(typeLook ?? {}).map(([fam, roles]) => [fam, Object.fromEntries(Object.entries(roles).filter(([r, v]) => r !== 'ui' && Number.isFinite(v?.size)).map(([r, v]) => [r, { px: v.size, cap: capOf(v.size), band: bandOf(capOf(v.size), bands) }]))]),
  );
  return {
    bands,
    widths: { ...TYPE_HOUSE.widths, ...(literal(audit, 'TYPE_WIDTH') ?? {}) },
    uiPx: numConst(audit, 'UI_TEXT_PX') ?? TYPE_HOUSE.uiPx,
    minPx: numConst(audit, 'MIN_TEXT_PX') ?? TYPE_HOUSE.minPx,
    minPxTall: numConst(audit, 'MIN_TEXT_PX_TALL') ?? TYPE_HOUSE.minPxTall,
    families,
  };
};
const findSrc = () => {
  for (const d of [opt.src, 'src', join(HERE, '..', 'assets', 'remotion-starter', 'src')].filter(Boolean)) if (existsSync(join(d, 'lib', 'look.ts'))) return d;
  return null;
};
const houseTarget = () => {
  const src = findSrc();
  const look = src ? readFileSync(join(src, 'lib', 'look.ts'), 'utf8') : '';
  const anim = src && existsSync(join(src, 'lib', 'anim.ts')) ? readFileSync(join(src, 'lib', 'anim.ts'), 'utf8') : '';
  const G = literal(look, 'GRAMMAR') ?? {};
  const DUR = literal(anim, 'DUR') ?? {};
  const STAG = literal(anim, 'STAG') ?? {};
  const P = literal(look, 'PICTURE') ?? {};
  const N = literal(look, 'NEUTRAL') ?? {};
  const CO = literal(look, 'COLOUR') ?? {};
  const audit = src && existsSync(join(src, 'lib', 'Audit.tsx')) ? readFileSync(join(src, 'lib', 'Audit.tsx'), 'utf8') : '';
  const iqr = (row, lo = 1, hi = 3) => (Array.isArray(row) ? [row[lo], row[hi]] : null);
  return {
    source: src ? 'house (lib/look.ts GRAMMAR, lib/anim.ts DUR and STAG)' : 'house (built-in)',
    // the type bands both families share (lib/Audit.tsx) and where each TYPE_LOOK role lands in them
    type: typeTarget(audit, literal(look, 'TYPE_LOOK') ?? {}),
    roleMix: { shares: { arrive: 0.55, reposition: 0.16, leave: 0.19, linear: 0.08, spring: 0.02 }, tvdMax: 0.25, tvdFloor: 0.6 },
    frontLoaded: 0.71,
    frontLoadedFloor: 0.4,
    intoCuts: 0.71,
    intoCutsFloor: 0.4,
    // drifts and creeps (linear, frames@60 or longer) and camera moves (a reposition this long) in the tween registry
    driftF60: 90,
    cameraF60: 120,
    durations: {
      arrive: iqr(DUR.word) && [Math.min(DUR.word[1], DUR.ui?.[1] ?? 99), Math.max(DUR.ui?.[3] ?? 0, DUR.word[3])],
      reposition: iqr(DUR.push) && [DUR.push[1], DUR.pan?.[3] ?? DUR.push[3]],
      leave: iqr(DUR.exit) && [Math.min(DUR.typeExit?.[1] ?? 99, DUR.exit[1]), DUR.exit[3]],
    },
    staggers: { gap: [STAG.letter?.[1] ?? 3, STAG.ui?.[3] ?? 17.5], cvMin: 0.15, cvRun: 6, together60: 1.5, share: [0.8, 0.5] },
    shot: { band: G.shot?.band ?? { launch: [1.15, 2.05] }, spread: G.shot?.spread ?? [1.9, 3.1], r70: 2, spreadR70: 2.6 },
    // floors: the edges of the house ranges (starts 1.33-2.35 a second, 1.09-4.29 regions moving at once, idle up to 44 %)
    density: {
      startsPerSec: [G.density?.startsPerSec?.[0] ?? 1.9, G.density?.startsPerSec?.[2] ?? 2.8],
      concurrent: [G.density?.concurrent?.[0] ?? 1.6, G.density?.concurrent?.[2] ?? 2.5],
      idleMax: G.density?.idleMax ?? 0.15,
      floor: { startsPerSec: [1.3, 3.2], concurrent: [1.05, 4.4], idleMax: 0.45 },
    },
    holds: { deadMax: 0 }, // dead stretches (forensics dead-stretch); a still hold is fine
    seams: {
      carriedMin: 0.4,
      carriedFloor: 0.3,
      maxUses: 3,
      mix: { velocity: 0.25, morph: 0.125, hard: 0.15, mask: 0.08, whip: 0.08, defocus: 0.07, light: 0.06, snapZoom: 0.06, breath: 0.04, zoomThrough: 0.04, stepped: 0.03, colour: 0.02 },
      mixTvdMax: 0.35,
    },
    cutSync: { within1f: G.cut?.within1f ?? 0.5, within100ms: G.cut?.within100ms ?? 0.8, floor1f: 0.14, floor100ms: 0.28, minCuts: 3 },
    velocitySeams: { floor: 0.5 },
    // grounds: paper, the mid stone, the mid slate or a deep field, ink (lib/look.ts RECIPE); ink on a light or mid-light ground
    // and the colour of the picture (look-audit's picture reads): floor 70, house target 100, like the picture dimension
    // floors: the edges of the house ranges (up to 8 hue groups, 19 % neutral, 54 % saturated, 60 % wash frames, the accent
    // on 0-40 % of the frame, ink up to L 0.40, grounds up to C 0.028); the targets are the house's
    colour: {
      hueGroups: 2,
      hueGroupsFloor: 8,
      accentMax: CO.accent?.frameMax ?? 0.25, // p95 of the accent's share of a frame (one designed flood aside)
      accentMaxFloor: 0.6,
      groundL: [[0.93, 0.99], [0.7, 0.8], [0.3, 0.42], [0.06, 0.23]],
      groundOff: 85,
      inkL: [0.12, 0.25],
      inkLFloor: [0.08, 0.41],
      groundCMax: N.maxC ?? 0.025,
      groundCFloor: 0.035,
      neutral: { floor: 0.15, target: P.target?.neutralMin ?? CO.neutralTarget ?? 0.4 },
      saturatedMax: { floor: 0.55, target: P.target?.saturatedMax ?? 0.3 },
      washShare: { floor: 0.6, target: P.target?.washShare ?? 0.33 },
      accent: [0.02, 0.17], // the middle of the house range (the house's PICTURE.target.accent, 6-15 %, is look-audit's aim)
      accentFloor: [0, 0.42],
      secondAccent: 80,
    },
    // the picture: the floor (look-audit fails under it) scores 70, the house target 100 (lib/look.ts PICTURE)
    // flat ground has a floor (texture everywhere fails) and an empty-film cap; edges a ceiling (busy everywhere) and an empty-film floor
    picture: {
      floor: {
        flatMin: P.flatMin ?? 0.25,
        flatMax: P.flatMax ?? 0.9,
        flatShare: P.flatFrame?.minShare ?? 0.05,
        edgesMin: P.edgesMin ?? 0.006,
        edgesMax: P.edgesMax ?? 0.12,
        saturatedMin: 0, // a mono film's grey is its own (the house range goes down to 0 % saturated)
        bleedShare: P.bleed?.share ?? 0.25,
        falloffShare: 0,
        skeleton: 4, // skeleton-bar samples: 2-4 score 70 (look-audit.py and the layout audit fail placeholders on their own)
      },
      target: {
        flatMin: P.target?.flatMin ?? 0.43,
        flatMax: P.target?.flatMax ?? 0.85,
        flatShare: P.target?.flatShare ?? 0.18,
        edgesMax: P.target?.edgesMax ?? 0.059,
        saturatedMin: P.target?.saturatedMin ?? 0.06,
        bleedShare: P.target?.bleedShare ?? 1,
        falloffShare: P.target?.falloffShare ?? 0.35,
      },
    },
    // the ship bar: 80 is the lowest mean over the render dimensions that the films the house holds up reach (80.8), and
    // each dimension's floor (70) is the edge of the house range
    ship: { mean: 80, min: 70 },
    overlap: { secondaryBefore90: 0.7, primaryMax60: 120, foregroundLead60: [10, 30], background60: [40, 150], foregroundShare: 0.5, enterBeforeLeave: [-3, 6], handoverShare: 0.7 },
  };
};
const merge = (a, b) => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b ?? a;
  const out = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(out[k], v) : v;
  return out;
};

// ---------------------------------------------------------------------------------- scoring helpers
/** 100 inside [lo, hi], linear to 0 at twice the band's width outside it (a one-sided band uses its value). */
const bandScore = (v, lo, hi) => {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  if (v >= lo && v <= hi) return 100;
  const width = Number.isFinite(hi) && Number.isFinite(lo) ? hi - lo : Math.abs(Number.isFinite(lo) ? lo : hi) || 1;
  const d = v < lo ? lo - v : v - hi;
  return Math.max(0, Math.round(100 * (1 - d / (2 * Math.max(width, 1e-6)))));
};
/** A share that must reach `min` (a band [min, top]: 0 at twice the band's width below it). */
const atLeast = (v, min, top = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  if (v >= min) return 100;
  const width = Math.max(top - min, 0.25 * min, 0.05);
  return Math.max(0, Math.round(100 * (1 - (min - v) / (2 * width))));
};
/** A ratio-scale value (a shot length, a spread): 100 inside [lo, hi]; outside, the score falls with
 * the log of the ratio to the nearer edge, 70 at `r70` times beyond it (0 at r70^(10/3)). */
const ratioScore = (v, lo, hi, r70 = 1.75) => {
  if (v === null || v === undefined || Number.isNaN(v) || v <= 0) return null;
  if (v >= lo && v <= hi) return 100;
  const r = v < lo ? lo / v : v / hi;
  return Math.max(0, Math.round(100 * (1 - (0.3 * Math.log(r)) / Math.log(Math.max(1.01, r70)))));
};
const atMost = (v, max) => (v === null || v === undefined ? null : v <= max ? 100 : Math.max(0, Math.round(100 * (1 - (v - max) / (2 * Math.max(max, 1e-6))))));
/** 100 inside the target [lo, hi], 70 at the floor [lo, hi], linear between; past the floor it falls to 0 at twice the
 * target-floor gap beyond it. A side with no floor (the floor equal to the target) is a cliff to 70 at once. */
const tierBand = (v, target, floor) => {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  const [tlo, thi] = target;
  const [flo, fhi] = floor;
  if (v >= tlo && v <= thi) return 100;
  const below = v < tlo;
  const gap = Math.max(1e-9, below ? tlo - flo : fhi - thi);
  const d = below ? tlo - v : v - thi;
  if (d <= gap) return Math.round(100 - (30 * d) / gap);
  return Math.max(0, Math.round(70 - (70 * (d - gap)) / (2 * gap)));
};
const median = (xs) => {
  const s = [...xs].sort((p, q) => p - q);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const quant = (xs, q) => {
  const s = [...xs].sort((p, r) => p - r);
  if (!s.length) return null;
  const k = (s.length - 1) * q;
  return s[Math.floor(k)] + (s[Math.ceil(k)] - s[Math.floor(k)]) * (k - Math.floor(k));
};
const tvd = (p, q) => 0.5 * [...new Set([...Object.keys(p), ...Object.keys(q)])].reduce((n, k) => n + Math.abs((p[k] ?? 0) - (q[k] ?? 0)), 0);
const read = (p) => {
  if (!p) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`grammar-score: cannot read ${p}: ${e.message}`);
    process.exit(2);
  }
};

/**
 * Type faults re-measured from the layout audit's boxes, the way lib/Audit.tsx warns, on the bands both families share
 * (the JSON's own typeBands when the audit wrote them, else the target's): readable text (opacity >= 0.5, at least the
 * minimum size) under the ui role, a cap over the giant band or in a gap between two, a line past its width (a calm
 * sentence, cap under sentenceCap, 75 % of the frame; a line 61 %; display and hero 84 %; a landed push or a claim may
 * bleed), more than 2 non-UI sizes at once (within 8 % is one size). A box in a push in flight is the camera's. One
 * fault per text (an entry's parts, "what.0" and "what.1", are one text), however many audited frames it misses on,
 * and only when it misses on 2 audited frames or more (one is a size passing through a zoom or a push); 5 % under the
 * ui size and 2 % past a width are rounding. null when the JSON carries no boxes.
 */
const typeFaults = (layout, TT, acts = {}) => {
  const actOf = (f) => Object.entries(acts).find(([, a]) => f >= a.from && f < a.from + (a.dur ?? Infinity))?.[0] ?? 'the film';
  const frames = Array.isArray(layout?.boxes) ? layout.boxes.filter((f) => f && Array.isArray(f.boxes)) : [];
  if (!frames.length) return null;
  const bands = Array.isArray(layout.typeBands) && layout.typeBands.length ? layout.typeBands : TT.bands;
  const W = { ...TT.widths, ...(layout.typeWidths ?? {}) };
  const root = (id) => String(id ?? '?').split('.')[0];
  const faults = new Map();
  const add = (key, frame, detail) => {
    if (!faults.has(key)) faults.set(key, { id: key, frame, frames: 0, detail });
    faults.get(key).frames++;
  };
  for (const fr of frames) {
    const width = fr.width ?? layout.width ?? 1920;
    const height = fr.height ?? layout.height ?? 1080;
    const U = Math.min(width, height) / 1080;
    const minPx = (height / width > 1.5 ? TT.minPxTall : TT.minPx) * U;
    const sizes = [];
    const ids = new Set();
    for (const b of fr.boxes.filter((x) => (x.opacity ?? 1) >= 0.5 && x.px >= minPx)) {
      if (b.push === 'moving') continue;
      const cap = capOf(b.px, height);
      const role = b.ui ? 'ui' : bandOf(cap, bands);
      if (b.px < 0.95 * TT.uiPx * U) add(root(b.id), fr.frame, `${b.px} px is under the ui role (${Math.round(TT.uiPx * U)} px)`);
      if (role === 'over') add(root(b.id), fr.frame, `cap ${cap} % is over the giant band (<= ${bands[bands.length - 1][2]} %)`);
      if (role === 'between') add(root(b.id), fr.frame, `cap ${cap} % falls between two bands`);
      const sentence = role === 'line' && cap < W.sentenceCap;
      const wide = b.push === 'bleed' || b.claim ? null : role === 'line' ? (sentence ? W.sentence : W.line) : role === 'display' || role === 'hero' ? W[role] : null;
      if (wide !== null && b.w > 1.02 * wide * width) add(root(b.id), fr.frame, `${role === 'line' ? (sentence ? 'a sentence' : 'a line') : `a ${role} line`} ${Math.round((b.w / width) * 1000) / 10} % of the frame wide (<= ${Math.round(wide * 100)} %; cap ${cap} %)`);
      if (!b.ui) {
        ids.add(root(b.id));
        if (!sizes.some((s) => Math.abs(s - b.px) <= 0.08 * s)) sizes.push(b.px);
      }
    }
    // one fault per scene (act), not per set of texts: a scrolling list showing new rows is the same scene
    if (sizes.length > 2) add(`sizes in ${actOf(fr.frame)}`, fr.frame, `${sizes.length} non-UI sizes at once (${[...ids].sort().slice(0, 4).join(', ')}${ids.size > 4 ? ', ...' : ''})`);
  }
  // a size seen on one audited frame only (a text passing through a zoom or a push, under 2 audit steps) is not held to be read
  return { faults: [...faults.values()].filter((f) => f.frames >= 2 || frames.length < 4), frames: frames.length };
};

// ---------------------------------------------------------------------------------- the score
export const score = ({ cues, layout, look, forensics, target, format }) => {
  const T = target;
  const fps = cues?.fps ?? look?.fps ?? 60;
  const f60 = (n) => (n * fps) / 60;
  const dims = [];
  const dim = (name, value, s, source, detail) => dims.push({ name, value, score: s, source, detail });
  const all = (layout?.tweens ?? []).filter((t) => Number.isFinite(t.from) && Number.isFinite(t.to) && t.to > t.from);
  const fam = (t) => t.family || 'untagged';
  const len60 = (t) => ((t.to - t.from) * 60) / fps;
  // drifts and creeps (long linear values) are the living holds' measure; a long reposition is the camera's move
  const isDrift = (t) => fam(t) === 'linear' && len60(t) >= (T.driftF60 ?? 90);
  const isCamera = (t) => fam(t) === 'reposition' && len60(t) >= (T.cameraF60 ?? 120);
  const tweens = all.filter((t) => !isDrift(t));
  const acts = cues ? Object.values(cues.acts ?? {}).map((a) => a.from).filter((a) => a > 0) : [];
  const seams = cues?.declared?.seams ?? [];
  const cuts = [...new Set([...acts, ...seams.map((s) => s.at)])].sort((p, q) => p - q);
  // hard cuts: act lines no seam carries, and the seams that cut (a carried seam is crossed by its move, not cut into)
  const punch = new Set(['hard', 'colour', 'light', 'stepped']);
  const carriedAt = new Set(seams.filter((s) => !punch.has(s.kind)).map((s) => s.at));
  const hardCuts = [...new Set([...acts.filter((a) => !carriedAt.has(a)), ...seams.filter((s) => punch.has(s.kind)).map((s) => s.at)])].sort((p, q) => p - q);
  const M = look?.measures ?? null;
  const drifts = all.length - tweens.length;

  // role mix (drifts and creeps left out)
  if (tweens.length >= 4) {
    const n = tweens.length;
    const shares = { arrive: 0, reposition: 0, leave: 0, linear: 0, spring: 0 };
    for (const t of tweens) if (fam(t) in shares) shares[fam(t)] += 1 / n;
    const d = tvd(shares, T.roleMix.shares);
    dim('role-mix', Math.round(d * 1000) / 1000, tierBand(d, [0, T.roleMix.tvdMax], [0, T.roleMix.tvdFloor ?? 0.6]), 'declared',
      { ...Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, Math.round(v * 100) / 100])), driftsLeftOut: drifts });
  } else dim('role-mix', null, null, 'unmeasured', 'needs the tween registry (layout-audit.sh --every 6)');

  // front-loaded arrivals: an element's move starting on an arrival (a copy entry, an act start, a seam); an exit or a
  // linear value starting there, and the camera's move, are not entrances
  const arrivals = [...(cues?.copy ?? []).map((c) => c.in), ...acts, ...seams.map((s) => s.at)];
  const ent = tweens.filter((t) => !['leave', 'linear'].includes(fam(t)) && !isCamera(t) && arrivals.some((a) => Math.abs(t.from - a) <= f60(3)));
  if (ent.length >= 2) {
    const share = ent.filter((t) => fam(t) === 'arrive' || fam(t) === 'spring').length / ent.length;
    dim('front-loaded', Math.round(share * 100) / 100, tierBand(share, [T.frontLoaded, 1], [T.frontLoadedFloor ?? 0.4, 1]), 'declared', `${ent.length} entrances`);
  } else dim('front-loaded', null, null, 'unmeasured', 'no entrance tweens recorded');

  // into cuts: moves that end on a hard cut accelerate into it (leave or linear)
  const into = tweens.filter((t) => hardCuts.some((c) => Math.abs(t.to - c) <= f60(2)));
  if (into.length >= 3) {
    const share = into.filter((t) => fam(t) === 'leave' || fam(t) === 'linear').length / into.length;
    dim('into-cuts', Math.round(share * 100) / 100, tierBand(share, [T.intoCuts, 1], [T.intoCutsFloor ?? 0.4, 1]), 'declared', `${into.length} moves end at a hard cut`);
  } else dim('into-cuts', null, null, 'unmeasured', `${into.length} move(s) end at a hard cut (a carried seam is crossed, not cut into; scored from 3)`);

  // durations by role: each role's median against its house range, by ratio (70 at twice past an edge); the mean of the roles
  {
    const rows = [];
    for (const [role, band] of Object.entries(T.durations)) {
      if (!band) continue;
      const ds = tweens.filter((t) => fam(t) === role).map(len60);
      if (ds.length < 3) continue;
      const m = median(ds);
      rows.push({ role, median: Math.round(m * 10) / 10, band, score: ratioScore(m, band[0], band[1], 2) });
    }
    if (rows.length) {
      const sc = Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length);
      dim('durations', rows.filter((r) => r.score === 100).length / rows.length, sc, 'declared', rows);
    } else dim('durations', null, null, 'unmeasured', 'fewer than 3 tweens per role');
  }

  // staggers: runs of the same curve and length starting one after another. Starts within 1.5 f@60 are one start (a
  // group moving together); a run whose gaps sit on the track's beat grid (half beats) is the track's, not a stagger;
  // a run of up to 5 reads as one gesture, so only a run of 6 or more must be irregular (CV >= 0.15)
  {
    const S = T.staggers;
    const beatF = cues?.music?.beatS ? cues.music.beatS * fps : cues?.bpm ? (60 / cues.bpm) * fps : null;
    const onGrid = (gaps60) => beatF !== null && gaps60.every((g) => {
      const f = (g * fps) / 60;
      const k = Math.round(f / (beatF / 2));
      return k >= 1 && Math.abs(f - (k * beatF) / 2) <= 1;
    });
    const groups = new Map();
    for (const t of tweens) {
      const key = `${t.token}|${Math.round(len60(t))}`;
      groups.set(key, [...(groups.get(key) ?? []), t.from]);
    }
    const rows = [];
    let grid = 0;
    for (const starts of groups.values()) {
      const s0 = [...new Set(starts.map((x) => Math.round(x * 10) / 10))].sort((p, q) => p - q);
      const s = s0.filter((x, i) => i === 0 || ((x - s0[i - 1]) * 60) / fps > (S.together60 ?? 1.5)); // together = one start
      let run = [s[0]];
      const flush = () => {
        if (run.length >= 3) {
          const gaps = run.slice(1).map((x, i) => ((x - run[i]) * 60) / fps);
          if (onGrid(gaps)) {
            grid++;
            return;
          }
          const m = median(gaps);
          const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          const cv = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length) / Math.max(mean, 1e-6);
          rows.push({ n: run.length, gap: Math.round(m * 10) / 10, cv: Math.round(cv * 100) / 100, ok: m >= S.gap[0] && m <= S.gap[1] && (run.length < (S.cvRun ?? 6) || cv >= S.cvMin) });
        }
      };
      for (const x of s.slice(1)) {
        if (((x - run[run.length - 1]) * 60) / fps <= 40) run.push(x);
        else {
          flush();
          run = [x];
        }
      }
      flush();
    }
    if (rows.length) {
      const share = rows.filter((r) => r.ok).length / rows.length;
      const [sTop, sFloor] = S.share ?? [0.8, 0.5];
      dim('staggers', Math.round(share * 100) / 100, tierBand(share, [sTop, 1], [sFloor, 1]), 'declared', { runs: rows.length, onTheBeat: grid, failing: rows.filter((r) => !r.ok).slice(0, 6) });
    } else dim('staggers', null, null, 'unmeasured', grid ? `${grid} run(s), all on the beat grid` : 'no staggered group of 3 or more');
  }

  // shot lengths: measured cuts when a render was measured, else the declared acts and seams
  {
    const band = T.shot.band[format] ?? T.shot.band.launch ?? [1.15, 2.05];
    let lens = M?.shot_lengths ?? null;
    let source = 'measured';
    if (!lens && cues) {
      const edges = [0, ...cuts, cues.total];
      lens = edges.slice(1).map((e, i) => (e - edges[i]) / fps).filter((x) => x > 0.25);
      source = 'declared';
    }
    const continuous = source === 'measured' && !seams.length && lens && median(lens) > 4; // seams the camera carries are not hard cuts
    if (lens && lens.length >= 3 && !(M?.one_take || cues?.look?.oneTake) && !continuous) {
      const m = median(lens);
      const spread = quant(lens, 0.75) / Math.max(1e-6, quant(lens, 0.25));
      const s = Math.min(ratioScore(m, band[0], band[1], T.shot.r70), ratioScore(spread, T.shot.spread[0], T.shot.spread[1], T.shot.spreadR70 ?? T.shot.r70));
      dim('shots', { median: Math.round(m * 100) / 100, spread: Math.round(spread * 100) / 100, format, band }, s, source, `${lens.length} shots`);
    } else dim('shots', null, null, 'unmeasured', M?.one_take || cues?.look?.oneTake ? 'one-take film' : continuous ? 'continuous film: its seams are not hard cuts (declare them in the timeline)' : 'fewer than 3 shots');
  }

  // density
  const D = T.density;
  const Df = D.floor ?? { startsPerSec: D.startsPerSec, concurrent: D.concurrent, idleMax: D.idleMax };
  if (M && M.starts_per_s !== null && M.starts_per_s !== undefined) {
    const s = Math.min(tierBand(M.starts_per_s, D.startsPerSec, Df.startsPerSec), M.concurrency === null || M.concurrency === undefined ? 100 : tierBand(M.concurrency, D.concurrent, Df.concurrent),
      M.idle_share === null || M.idle_share === undefined ? 100 : tierBand(M.idle_share, [0, D.idleMax], [0, Df.idleMax]));
    dim('density', { startsPerSec: M.starts_per_s, concurrency: M.concurrency, idle: M.idle_share }, s, 'measured');
  } else if (tweens.length && cues) {
    const total = cues.total;
    const sps = tweens.length / (total / fps);
    let busy = 0;
    let conc = 0;
    for (let f = 0; f < total; f++) {
      const k = tweens.filter((t) => t.from <= f && f < t.to).length;
      conc += k;
      if (!k) busy++;
    }
    const s = Math.min(tierBand(sps, D.startsPerSec, Df.startsPerSec), tierBand(busy / total, [0, D.idleMax], [0, Df.idleMax]));
    dim('density', { startsPerSec: Math.round(sps * 100) / 100, concurrency: Math.round((conc / total) * 100) / 100, idle: Math.round((busy / total) * 100) / 100 }, s, 'declared');
  } else dim('density', null, null, 'unmeasured', 'needs look-audit.py or the tween registry');

  // holds: a still hold is fine (the camera moves only with a purpose); a dead stretch is not (forensics.py
  // dead-stretch: over 2.5 s outside the end lock where nothing changes at all)
  {
    const dead = forensics?.checks?.grammar?.holds?.frozen_runs;
    if (Array.isArray(dead)) dim('holds', dead.length, dead.length <= (T.holds.deadMax ?? 0) ? 100 : dead.length === 1 ? 60 : 30, 'measured');
    else dim('holds', null, null, 'unmeasured', 'needs forensics.py (dead stretches); a still hold is fine');
  }

  // seams
  if (!seams.length && M && M.one_take) dim('seams', null, null, 'unmeasured', 'one-take film: no hard cut to carry');
  else if (seams.length || (M && M.seams)) {
    const kinds = {};
    for (const s of seams) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
    const carriedDecl = seams.length ? seams.filter((s) => ['velocity', 'morph', 'breath', 'zoomThrough', 'whip', 'snapZoom', 'mask', 'wipe', 'defocus'].includes(s.kind)).length / seams.length : null;
    const carried = M?.carried_share ?? carriedDecl;
    const over = Object.entries(kinds).filter(([k, n]) => n > T.seams.maxUses && !seams.some((s) => s.kind === k && s.signature));
    const mix = seams.length ? Object.fromEntries(Object.entries(kinds).map(([k, n]) => [k, n / seams.length])) : null;
    const d = mix ? tvd(mix, T.seams.mix) : null;
    // the mix distance is reported, not scored: a dealt direction plays its own seams, and 'overused' catches a refrain
    const parts = [tierBand(carried, [T.seams.carriedMin, 1], [T.seams.carriedFloor ?? T.seams.carriedMin, 1]), over.length ? 50 : 100];
    dim('seams', { carried: carried === null ? null : Math.round(carried * 100) / 100, overused: over.map(([k]) => k), mixDistance: d === null ? null : Math.round(d * 100) / 100 }, Math.min(...parts.filter((x) => x !== null)), M?.carried_share !== undefined && M?.carried_share !== null ? 'measured' : 'declared');
  } else dim('seams', null, null, 'unmeasured', 'no seams declared or measured');

  // cut sync
  {
    let v = M?.cut_sync ?? null;
    let source = 'measured';
    // hard cuts land on a sound; continuity seams (velocity, morph, whip, ...) may float
    if (!v && cues && hardCuts.length) {
      const ev = (cues.events ?? []).map((e) => e.f);
      if (ev.length) {
        const d = hardCuts.map((c) => Math.min(...ev.map((e) => Math.abs(e - c))));
        v = { within_1f: d.filter((x) => x <= 1).length / d.length, within_100ms: d.filter((x) => x <= 0.1 * fps).length / d.length };
        source = 'declared';
      }
    }
    const C = T.cutSync;
    const nCuts = source === 'measured' && Array.isArray(M?.shot_lengths) ? M.shot_lengths.length - 1 : hardCuts.length;
    if (M?.one_take || cues?.look?.oneTake) dim('cut-sync', null, null, 'unmeasured', 'one-take film: no hard cut to sync');
    else if (v && nCuts < (C.minCuts ?? 3)) dim('cut-sync', v, null, 'unmeasured', `${nCuts} hard cut(s): too few to read a sync (scored from ${C.minCuts ?? 3})`);
    else if (v) dim('cut-sync', v, Math.min(tierBand(v.within_1f, [C.within1f, 1], [C.floor1f ?? C.within1f, 1]), tierBand(v.within_100ms, [C.within100ms, 1], [C.floor100ms ?? C.within100ms, 1])), source);
    else dim('cut-sync', null, null, 'unmeasured', 'no hard cuts or no sound events');
  }

  // velocity seams carry speed (forensics carried-cut)
  {
    const rows = forensics?.checks?.grammar?.carried ?? null;
    if (rows && rows.length) {
      const share = rows.filter((r) => r.ok).length / rows.length;
      dim('velocity-seams', share, tierBand(share, [1, 1], [T.velocitySeams?.floor ?? 0.5, 1]), 'measured');
    } else if (seams.some((s) => s.kind === 'velocity')) dim('velocity-seams', null, null, 'unmeasured', 'run forensics.py on the render');
  }

  // 100 at the target, 70 at the floor, linear between; under the floor it falls to 0 at twice the floor-target gap
  const tier = (v, floor, target) => {
    if (v === null || v === undefined || Number.isNaN(v)) return null;
    const up = target >= floor; // larger is better
    if (up ? v >= target : v <= target) return 100;
    if (up ? v >= floor : v <= floor) return Math.round(70 + (30 * (v - floor)) / (target - floor || 1e-9));
    const gap = Math.abs(target - floor) || Math.abs(floor) || 1;
    return Math.max(0, Math.round(70 - (70 * Math.abs(v - floor)) / (2 * gap)));
  };

  // colour: one hue family, neutral grounds in band, and the picture's colour (neutral share, no wash, the accent band, no second accent)
  if (M && M.hue_groups !== undefined) {
    const Tc = T.colour;
    const parts = [tierBand(M.hue_groups, [0, Tc.hueGroups], [0, Tc.hueGroupsFloor ?? Tc.hueGroups])];
    if (M.accent_p95 !== null && M.accent_p95 !== undefined) parts.push(tierBand(M.accent_p95, [0, Tc.accentMax], [0, Tc.accentMaxFloor ?? 2 * Tc.accentMax]));
    if (M.ground_L !== null && M.ground_L !== undefined) parts.push(Tc.groundL.some(([lo, hi]) => M.ground_L >= lo && M.ground_L <= hi) ? 100 : Tc.groundOff ?? 85);
    if (M.ground_C !== null && M.ground_C !== undefined && Tc.groundCMax !== undefined) parts.push(tierBand(M.ground_C, [0, Tc.groundCMax + 1e-9], [0, Tc.groundCFloor ?? Tc.groundCMax + 0.01]));
    if (M.ink_L !== null && M.ink_L !== undefined && M.ground_L > 0.5) parts.push(tierBand(M.ink_L, Tc.inkL, Tc.inkLFloor ?? [Tc.inkL[0] - 0.04, Tc.inkL[1] + 0.08]));
    const Pm = M.picture ?? {};
    const acc = Pm.accent;
    if (Tc.neutral) parts.push(tier(Pm.neutral, Tc.neutral.floor, Tc.neutral.target));
    if (Tc.saturatedMax) parts.push(tier(Pm.saturated_out, Tc.saturatedMax.floor, Tc.saturatedMax.target));
    if (Tc.washShare) parts.push(tier(Pm.wash_share, Tc.washShare.floor, Tc.washShare.target));
    if (acc !== undefined && acc !== null && Tc.accent) parts.push(tierBand(acc, Tc.accent, Tc.accentFloor ?? [Tc.accent[0] / 3, Tc.accentMax]));
    if (Pm.second_accent === true) parts.push(Tc.secondAccent ?? 80);
    const got = parts.filter((x) => x !== null && x !== undefined);
    dim('colour', { hueGroups: M.hue_groups, accent: M.accent_p95, groundL: M.ground_L, groundC: M.ground_C ?? null, inkL: M.ink_L, neutral: Pm.neutral ?? null, saturated: Pm.saturated_out ?? null,
      washShare: Pm.wash_share ?? null, accentShare: acc ?? null, secondAccent: Pm.second_accent ?? null }, Math.min(...got), 'measured');
  } else dim('colour', null, null, 'unmeasured', 'needs look-audit.py');

  // picture: what the frames hold (look-audit.py picture floor): flat ground, structure, depth of field, colour mass, bleed, no skeleton bars
  if (M && M.picture) {
    const Pm = M.picture;
    const Fl = T.picture?.floor ?? {};
    const Tg = T.picture?.target ?? {};
    const bleed = Pm.bleed_share ?? (Pm.bleed_acts?.length ? Pm.bleed_acts.filter(Boolean).length / Pm.bleed_acts.length : 1);
    const parts = [
      Pm.flat > (Tg.flatMax ?? 0.85) ? tier(Pm.flat, Fl.flatMax ?? 0.9, Tg.flatMax ?? 0.85) : tier(Pm.flat, Fl.flatMin ?? 0.25, Tg.flatMin ?? 0.43),
      tier(Pm.flat_frames_over, Fl.flatShare ?? 0.05, Tg.flatShare ?? 0.18),
      Pm.edges < (Fl.edgesMin ?? 0.006) ? 60 : tier(Pm.edges, Fl.edgesMax ?? 0.12, Tg.edgesMax ?? 0.059), // under the edge floor: an empty film
      tier(Pm.saturated, Fl.saturatedMin ?? 0, Tg.saturatedMin ?? 0.06),
      tier(bleed, Fl.bleedShare ?? 0.5, Tg.bleedShare ?? 1),
      tier(Pm.falloff, Fl.falloffShare ?? 0, Tg.falloffShare ?? 0.35),
      tierBand(Pm.skeleton_samples ?? 0, [0, 1], [0, Fl.skeleton ?? 4]),
    ].filter((x) => x !== null);
    dim('picture', { flat: Pm.flat, edges: Pm.edges, falloff: Pm.falloff, saturated: Pm.saturated, bleed: Math.round(bleed * 100) / 100, skeleton: Pm.skeleton_samples ?? 0 }, Math.min(...parts), 'measured');
  } else dim('picture', null, null, 'unmeasured', 'needs look-audit.py (the picture floor)');

  // type: the layout boxes re-measured on the bands both families share; without boxes, the audit's own warnings
  const tf = layout ? typeFaults(layout, T.type ?? typeTarget(), cues?.acts ?? {}) : null;
  if (tf) {
    const n = tf.faults.length;
    const shown = tf.faults.slice(0, 3).map((f) => `${f.id}: ${f.detail} (${f.frames} f)`);
    dim('type', n, n === 0 ? 100 : Math.max(0, 100 - 10 * n), 'measured', `${n} text(s) off the type bands of both families, re-measured on ${tf.frames} audited frames${n ? `: ${shown.join('; ')}${n > 3 ? '; ...' : ''}` : ''}`);
  } else if (layout && Array.isArray(layout.warnings)) {
    // per text, not per sampled frame: a line whose size misses its role on every audited frame is one fault
    const ws = layout.warnings.filter((w) => w.kind === 'type-size');
    const n = new Set(ws.map((w, i) => (w.id ? String(w.id).split('.')[0] : `#${i}`))).size;
    dim('type', n, n === 0 ? 100 : Math.max(0, 100 - 10 * n), 'measured', `${n} text(s) with type-size warnings (${ws.length} on audited frames)`);
  } else if (M && M.type_issues !== undefined && opt.layout) dim('type', M.type_issues, M.type_issues ? Math.max(0, 100 - 10 * M.type_issues) : 100, 'measured');
  else dim('type', null, null, 'unmeasured', 'needs layout-audit.sh');

  // overlap: secondaries start before the primary reaches 90 %; the foreground lands ~20 f@60 before
  // the background; the next element enters 0-1 f before the previous leaves
  if (tweens.length >= 3) {
    const O = T.overlap;
    const t90 = { arrive: 0.5, reposition: 0.75, leave: 0.95, linear: 0.9 };
    const parts = [];
    const sec = [];
    // a primary is an element's move (not linear, not the camera's, up to primaryMax60)
    const primaries = tweens.filter((t) => fam(t) !== 'linear' && !isCamera(t) && len60(t) <= (O.primaryMax60 ?? 120));
    // a primary is clearly the longer move (a quarter longer at least): words of one staggered line are not each other's
    for (const b of tweens)
      for (const a of primaries)
        if (a !== b && a.to - a.from >= 1.25 * (b.to - b.from) && a.from < b.from && b.from < a.to) {
          sec.push(b.from <= a.from + (t90[fam(a)] ?? 0.9) * (a.to - a.from));
          break;
        }
    if (sec.length) parts.push(['secondary-before-90', sec.filter(Boolean).length / sec.length, O.secondaryBefore90]);
    const fg = [];
    const [bgLo, bgHi] = O.background60 ?? [40, Infinity];
    for (const bg of tweens.filter((t) => fam(t) !== 'linear' && !isCamera(t) && len60(t) >= bgLo && len60(t) <= bgHi))
      for (const f of tweens.filter((t) => fam(t) === 'arrive' && t !== bg && t.from >= bg.from && t.to <= bg.to + f60(5) && len60(t) < 40)) {
        const lead = ((bg.to - f.to) * 60) / fps;
        fg.push(lead >= O.foregroundLead60[0] && lead <= O.foregroundLead60[1]);
      }
    if (fg.length) parts.push(['foreground-lead', fg.filter(Boolean).length / fg.length, O.foregroundShare]);
    const hand = [];
    for (const lv of tweens.filter((t) => fam(t) === 'leave'))
      for (const ar of tweens.filter((t) => fam(t) === 'arrive' && Math.abs(t.from - lv.to) <= f60(6))) {
        const d = ((lv.to - ar.from) * 60) / fps; // frames@60 the next element is in before the previous has left (negative: after)
        hand.push(d >= O.enterBeforeLeave[0] - 1e-6 && d <= O.enterBeforeLeave[1] + 1e-6);
      }
    if (hand.length) parts.push(['enter-before-leave', hand.filter(Boolean).length / hand.length, O.handoverShare]);
    // scored: the hand-overs (an exit and the next arrival), which the registry reads whole; which tween is an element's
    // primary and which is the foreground the registry does not record (a line's rise and its words' fades, a camera's
    // settle and the card it frames), so those two shares are reported, not scored
    const scoredParts = parts.filter(([k]) => k === 'enter-before-leave');
    if (scoredParts.length) {
      const s = Math.min(...scoredParts.map(([, v, min]) => tierBand(v, [min, 1], [min / 2, 1])));
      dim('overlap', Object.fromEntries(parts.map(([k, v]) => [k, Math.round(v * 100) / 100])), s, 'declared');
    } else dim('overlap', null, null, 'unmeasured', 'no overlapping tweens recorded');
  } else dim('overlap', null, null, 'unmeasured', 'needs the tween registry');

  const scored = dims.filter((d) => d.score !== null);
  const mean = scored.length ? Math.round((scored.reduce((n, d) => n + d.score, 0) / scored.length) * 10) / 10 : null;
  const weakest = [...scored].sort((p, q) => p.score - q.score).slice(0, 3).map((d) => d.name);
  const floor = look?.floor ? !!look.floor.pass : null;
  const bar = T.ship ?? { mean: 80, min: 70 };
  const ship = mean !== null && mean >= bar.mean && scored.every((d) => d.score >= bar.min) && floor === true;
  return { mean, ship, floor, weakest, dims, measured: scored.filter((d) => d.source === 'measured').length, declared: scored.filter((d) => d.source === 'declared').length };
};

// ---------------------------------------------------------------------------------- self-test
const selfTest = () => {
  let bad = 0;
  const check = (ok, what, detail = '') => {
    if (!ok) bad++;
    console.log(`${ok ? 'pass' : 'FAIL'}  grammar-score self-test: ${what}${detail ? `  (${detail})` : ''}`);
  };
  const T = houseTarget();
  check(Array.isArray(T.shot.band.launch) && T.shot.band.launch[0] > 0, 'the house target reads the shot bands from GRAMMAR', JSON.stringify(T.shot.band));
  const extra = merge(T, { shot: { band: { update: [0.8, 1.6] } } });
  const r0 = score({ cues: { fps: 60, total: 600, acts: { a: { from: 0, dur: 100 }, b: { from: 100, dur: 100 }, c: { from: 200, dur: 100 }, d: { from: 300, dur: 300 } }, declared: { seams: [] }, copy: [] }, target: extra, format: 'update' });
  check(r0.dims.find((d) => d.name === 'shots')?.value?.band?.[0] === 0.8, 'a format band added to the target needs no code (update)');
  // a house-like film: arrivals on arrive curves, exits on leave curves into the cuts, irregular staggers
  const tw = [];
  const cuts = [120, 260, 400, 520];
  let at = 0;
  for (const c of [...cuts, 640]) {
    tw.push({ from: at, to: at + 32, token: 'snapOut', family: 'arrive' });
    tw.push({ from: at + 11, to: at + 43, token: 'snapOut', family: 'arrive' });
    tw.push({ from: at + 25, to: at + 57, token: 'snapOut', family: 'arrive' });
    tw.push({ from: at + 34, to: at + 66, token: 'snapOut', family: 'arrive' });
    tw.push({ from: at + 5, to: c, token: 'linear', family: 'linear' });
    tw.push({ from: at + 40, to: at + 76, token: 'strongInOut', family: 'reposition' });
    tw.push({ from: c - 26, to: c, token: 'launchIn', family: 'leave' });
    at = c;
  }
  const cuesA = { fps: 60, total: 640, acts: Object.fromEntries([0, ...cuts].map((f, i, a) => [`a${i}`, { from: f, dur: (a[i + 1] ?? 640) - f }])), declared: { seams: cuts.map((f, i) => ({ at: f, kind: ['hard', 'morph', 'hard', 'hard'][i] })) }, copy: [0, ...cuts].map((f) => ({ in: f })), events: cuts.map((f) => ({ f })) };
  const lookA = { floor: { pass: true }, measures: { shot_lengths: [2, 2.33, 2.33, 2, 2], starts_per_s: 2.2, concurrency: 1.8, idle_share: 0.04, living_holds: 0.97, carried_share: 0.75, seams: 4, cut_sync: { within_1f: 0.75, within_100ms: 1 }, hue_groups: 1, accent_p95: 0.05, ground_L: 0.95, ink_L: 0.22 } };
  const rA = score({ cues: cuesA, layout: { tweens: tw, warnings: [] }, look: lookA, target: T, format: 'launch' });
  check(rA.dims.find((d) => d.name === 'front-loaded').score === 100 && rA.dims.find((d) => d.name === 'into-cuts').score === 100, 'arrivals on arrive curves and exits on leave curves into the cuts score 100');
  check(rA.mean >= 80, 'a house-like film scores high', `mean ${rA.mean}, weakest ${rA.weakest.join(', ')}`);
  // a templated film: one symmetric curve for everything, a metronome stagger, fading exits
  const tw2 = [];
  for (let i = 0; i < 20; i++) tw2.push({ from: i * 30, to: i * 30 + 30, token: 'inOut', family: 'reposition' });
  const rB = score({ cues: cuesA, layout: { tweens: tw2, warnings: [{ kind: 'type-size' }, { kind: 'type-size' }] }, look: { floor: { pass: false }, measures: { ...lookA.measures, hue_groups: 3, living_holds: 0.6 } }, target: T, format: 'launch' });
  check(rB.dims.find((d) => d.name === 'role-mix').score < 50 && !rB.ship, 'one symmetric curve for everything fails the role mix and the ship bar', `role-mix ${rB.dims.find((d) => d.name === 'role-mix').score}`);
  check(rB.dims.find((d) => d.name === 'staggers').score < 100, 'a metronome stagger (CV 0) is caught');
  // overlap: the next element entering up to 6 f before the exit ends (or 3 f after it) passes; a 5 f gap fails
  const ov = score({ cues: cuesA, layout: { tweens: [{ from: 0, to: 30, token: 'buildIn', family: 'leave' }, { from: 26, to: 58, token: 'snapOut', family: 'arrive' }, { from: 100, to: 130, token: 'buildIn', family: 'leave' }, { from: 135, to: 167, token: 'snapOut', family: 'arrive' }, { from: 140, to: 200, token: 'strongInOut', family: 'reposition' }] }, target: T, format: 'launch' });
  check(ov.dims.find((d) => d.name === 'overlap').value?.['enter-before-leave'] === 0.5, 'the next element entering 4 f before the exit ends passes, one entering 5 f after it does not (one of two)', JSON.stringify(ov.dims.find((d) => d.name === 'overlap').value));
  check(score({ cues: cuesA, layout: { tweens: tw }, look: { ...lookA, floor: { pass: false } }, target: T, format: 'launch' }).ship === false, 'a failing floor blocks the ship bar whatever the mean');
  // shot lengths fall off as ratios; a one-take film has no cut to sync
  const shotsAt = (len) => score({ cues: { fps: 60, total: 600, acts: {}, declared: { seams: [{ at: 100, kind: 'hard' }] }, copy: [] }, look: { floor: { pass: true }, measures: { shot_lengths: [0.6, 0.8, 1.2, 1.5, 2, 2.4].map((x) => (x * len) / 1.35) } }, target: T, format: 'launch' }).dims.find((d) => d.name === 'shots').score;
  check(shotsAt(1.7) === 100 && shotsAt(3.2) >= 70 && shotsAt(3.2) < 100 && shotsAt(5) < 70, 'shot lengths score by their ratio to the band (launch: 1.7 s in, 3.2 s near, 5 s off)', `${shotsAt(1.7)} / ${shotsAt(3.2)} / ${shotsAt(5)}`);
  const oneTake = score({ look: { floor: { pass: true }, measures: { ...lookA.measures, one_take: true, cut_sync: { within_1f: 0, within_100ms: 0 } } }, target: T, format: 'launch' });
  check(oneTake.dims.find((d) => d.name === 'cut-sync').score === null, 'a one-take film is not scored on cut sync');
  const custom = merge(T, { roleMix: { shares: { arrive: 0, reposition: 1, leave: 0, linear: 0, spring: 0 } } });
  check(score({ cues: cuesA, layout: { tweens: tw2 }, target: custom, format: 'launch' }).dims.find((d) => d.name === 'role-mix').score === 100, '--target scores closeness to another grammar (a clip that only repositions)');
  // a bad and a good input for every dimension that reads a measure (each scores 100 on the good one, under 70 on the bad one)
  const dimOf = (r, name) => r.dims.find((d) => d.name === name);
  const withM = (m) => score({ look: { floor: { pass: true }, measures: { ...lookA.measures, ...m } }, target: T, format: 'launch' });
  const pair = (name, good, badIn, what) => {
    const g = dimOf(good, name)?.score;
    const b = dimOf(badIn, name)?.score;
    check(g === 100 && b !== null && b !== undefined && b < 70, what, `good ${g}, bad ${b}`);
  };
  const tws = (role, token, len, n) => Array.from({ length: n }, (_, i) => ({ from: i * 50, to: i * 50 + len, token, family: role }));
  pair(
    'durations',
    score({ cues: cuesA, layout: { tweens: [...tws('arrive', 'snapOut', 32, 4), ...tws('leave', 'buildIn', 22, 4)] }, target: T, format: 'launch' }),
    score({ cues: cuesA, layout: { tweens: [...tws('arrive', 'snapOut', 120, 4), ...tws('leave', 'buildIn', 90, 4)] }, target: T, format: 'launch' }),
    'durations: house-length arrivals and exits score 100; 2 s arrivals and 1.5 s exits do not',
  );
  pair('density', withM({ starts_per_s: 2.2, concurrency: 1.8, idle_share: 0.05 }), withM({ starts_per_s: 0.4, concurrency: 1, idle_share: 0.6 }), 'density: 2.2 starts a second scores 100; a sparse film (0.4 a second, idle 60 %) does not');
  {
    const fz = (runs) => score({ forensics: { checks: { grammar: { holds: { frozen_runs: runs } } } }, target: T, format: 'launch' });
    pair('holds', fz([]), fz([[100, 190], [400, 480]]), 'holds: no dead stretch scores 100 (still holds are fine); two dead stretches do not');
    check(dimOf(withM({ living_holds: 0.4 }), 'holds')?.score == null, 'holds: a low living share alone is not scored (a still hold is fine)');
  }
  pair(
    'seams',
    score({ cues: { ...cuesA, declared: { seams: [{ at: 120, kind: 'velocity' }, { at: 260, kind: 'morph' }, { at: 400, kind: 'whip' }] } }, look: { floor: { pass: true }, measures: { carried_share: 0.67, seams: 3 } }, target: T, format: 'launch' }),
    score({ cues: { ...cuesA, declared: { seams: [120, 200, 260, 330, 400].map((at) => ({ at, kind: 'hard' })) } }, look: { floor: { pass: true }, measures: { carried_share: 0, seams: 5 } }, target: T, format: 'launch' }),
    'seams: carried, varied seams score 100; five plain hard cuts carrying nothing do not',
  );
  pair('cut-sync', withM({ cut_sync: { within_1f: 0.75, within_100ms: 1 } }), withM({ cut_sync: { within_1f: 0.1, within_100ms: 0.2 } }), 'cut-sync: cuts on the sound score 100; cuts off it do not');
  pair(
    'velocity-seams',
    score({ cues: cuesA, forensics: { checks: { grammar: { carried: [{ ok: true }, { ok: true }] } } }, target: T, format: 'launch' }),
    score({ cues: cuesA, forensics: { checks: { grammar: { carried: [{ ok: true }, { ok: false }, { ok: false }] } } }, target: T, format: 'launch' }),
    'velocity-seams: every declared velocity seam carrying speed scores 100; two of three that do not fail',
  );
  pair('colour', withM({ hue_groups: 1, accent_p95: 0.05, ground_L: 0.95, ink_L: 0.22 }), withM({ hue_groups: 9, accent_p95: 0.7 }), 'colour: one hue on paper scores 100; nine hue groups (past the house range) and the accent on 70 % of the frame do not');
  check(dimOf(withM({ hue_groups: 1, accent_p95: 0.05, ground_L: 0.35, ink_L: 0.2 }), 'colour').score === 100 && dimOf(withM({ hue_groups: 1, accent_p95: 0.05, ground_L: 0.74, ink_L: 0.14 }), 'colour').score === 100,
    'colour: the mid slate and the mid stone are house grounds (100)');
  pair(
    'colour',
    withM({ ground_C: 0.008, picture: { neutral: 0.72, saturated_out: 0.12, wash_share: 0.05, accent: 0.1, second_accent: false } }),
    withM({ ground_C: 0.1, picture: { neutral: 0.06, saturated_out: 0.83, wash_share: 1, accent: 0.67, second_accent: true } }),
    'colour: a neutral picture with the accent on 10 % of the frame scores 100; a frame washed in the accent hue does not',
  );
  {
    const C = T.colour;
    const atFloor = dimOf(withM({ ground_C: 0.008, picture: { neutral: C.neutral.floor, saturated_out: C.saturatedMax.floor, wash_share: C.washShare.floor, accent: 0.1 } }), 'colour').score;
    check(atFloor >= 70 && atFloor <= 72, 'colour: a picture exactly at the wash ceiling and the neutral floor scores 70', `${atFloor}`);
    check(dimOf(withM({ ground_C: 0.04 }), 'colour').score < 70, 'colour: a ground at the accent chroma (C .04) is not a house ground (under 70)');
  }
  pair('type', score({ layout: { warnings: [] }, look: lookA, target: T, format: 'launch' }), score({ layout: { warnings: Array.from({ length: 4 }, () => ({ kind: 'type-size' })) }, look: lookA, target: T, format: 'launch' }), 'type: no role warnings score 100; four do not');
  {
    const persistent = dimOf(score({ layout: { warnings: Array.from({ length: 40 }, (_, f) => ({ kind: 'type-size', frame: f * 6, id: 'what' })) }, look: lookA, target: T, format: 'launch' }), 'type');
    const parts = dimOf(score({ layout: { warnings: [{ kind: 'type-size', id: 'what.0' }, { kind: 'type-size', id: 'what.1' }, { kind: 'type-size', id: 'claim' }] }, look: lookA, target: T, format: 'launch' }), 'type');
    check(persistent.score === 90 && parts.score === 80, 'type: counted per text, not per audited frame (one line warned on 40 frames scores 90; two parts of one entry count once)', `${persistent.score} / ${parts.score}`);
  }
  {
    // the type bands hold both families: every role of the calm and the bold family lands in a band, none between or over
    const fams = T.type?.families ?? {};
    const off = Object.entries(fams).flatMap(([f, roles]) => Object.entries(roles).filter(([, r]) => ['between', 'over', 'ui'].includes(r.band)).map(([r, v]) => `${f} ${r} ${v.cap} % ${v.band}`));
    check(fams.calm && fams.bold && Object.keys(fams.calm).length >= 5 && off.length === 0, 'type: every role of both families (lib/look.ts TYPE_LOOK) lands inside a band of lib/Audit.tsx TYPE_BANDS', off.join('; ') || Object.entries(fams).map(([f, r]) => `${f} ${Object.entries(r).map(([k, v]) => `${k} ${v.cap}`).join(' ')}`).join(' | '));
    // films audited frame by frame (boxes as layout-audit.sh writes them, 1920x1080, every 6 f)
    const film = (shots) => ({ warnings: [], boxes: shots.flatMap((boxes, s) => Array.from({ length: 12 }, (_, k) => ({ frame: s * 72 + k * 6, width: 1920, height: 1080, boxes }))) });
    const box = (id, px, w, more = {}) => ({ id, text: id, words: 4, ui: false, x: (1920 - w) / 2, y: 400, w, h: px, px, opacity: 1, ...more });
    const calm = film([
      [box('what', 84, 1270)], // the calm sentence at 66 % of the width (cap 5.6 %)
      [box('pain', 70, 1380)], // fitted down to 70 px at 72 %
      [box('name', 520, 1390)], // the name re-set at a quarter of the frame (cap 34.7 %)
      [box('payoff', 160, 900), box('tag', 46, 500)], // the calm display and a caption
      [box('giant', 640, 1500)],
    ]);
    const bold = film([
      [box('line', 120, 1110)], // a bold line at 58 %
      [box('hero', 240, 1560)], // the bold hero at 81 %
      [box('push', 260, 2600, { push: 'bleed' })], // a landed type push crossing the frame
      [box('claim', 250, 1800, { claim: true })], // the claim on the accent (cap 16.7 %)
      [box('giant', 900, 2900, { push: 'bleed' })],
      [box('flight', 420, 3400, { push: 'moving' })], // a push in flight is the camera's
    ]);
    const cS = dimOf(score({ layout: calm, look: lookA, target: T, format: 'launch' }), 'type');
    const bS = dimOf(score({ layout: bold, look: lookA, target: T, format: 'launch' }), 'type');
    check(cS.score === 100 && bS.score === 100, 'type: a calm film (84 px sentence at 66 %, a name at a quarter of the frame, a 640 px giant) and a bold one (120 px line, 240 px hero, a landed push, a claim) both score 100', `${cS.score} ${cS.detail} | ${bS.score} ${bS.detail}`);
    const stale = dimOf(score({ layout: { ...calm, warnings: Array.from({ length: 73 }, (_, f) => ({ kind: 'type-size', id: f % 2 ? 'what' : 'name', frame: f * 6 })) }, look: lookA, target: T, format: 'launch' }), 'type');
    check(stale.score === 100, 'type: an audit written on older bands is re-scored from its boxes on today\'s (its 73 stale warnings do not count)', `${stale.score}`);
    const faults = film([
      [box('line', 120, 1340)], // a bold line at 70 % (over 61 %)
      [box('what', 84, 1500)], // a calm sentence at 78 % (over 75 %)
      [box('a', 120, 600), box('b', 200, 600, { y: 100 }), box('c', 46, 400, { y: 900 })], // three sizes at once
      [box('label', 26, 200)], // under the ui role
    ]);
    const fS = dimOf(score({ layout: faults, look: lookA, target: T, format: 'launch' }), 'type');
    check(fS.score === 60 && fS.value === 4, 'type: a line past 61 %, a sentence past 75 %, three sizes at once and text under the ui role are four faults, one per text however many frames (60)', `${fS.score} ${fS.detail}`);
    const gaps = dimOf(score({ layout: { ...calm, typeBands: [['caption', 2.3, 4], ['statement', 5, 9], ['hero', 11, 23], ['giant', 40, 90]] }, look: lookA, target: T, format: 'launch' }), 'type');
    check(gaps.value >= 1, 'type: the bands an audit wrote into its JSON are the ones it is scored on (a name at 34.7 % falls between bands that do not meet)', `${gaps.value} ${gaps.detail}`);
  }
  // the declared dimensions read elements, not the camera or the creeps: a film carried by one camera with creeping
  // holds, on-beat ticks and words moving together does not fail role-mix, staggers or overlap for them
  {
    const tw3 = [];
    for (let k = 0; k < 6; k++) {
      const at = k * 100;
      tw3.push({ from: at, to: at + 400, token: 'linear', family: 'linear' }); // a creep under every hold
      tw3.push({ from: at, to: at + 150, token: 'stdInOut', family: 'reposition' }); // the camera's move
      for (let w = 0; w < 4; w++) tw3.push({ from: at + 4 + w * 7, to: at + 36 + w * 7, token: 'snapOut', family: 'arrive' }); // 4 words, even 7 f
      tw3.push({ from: at + 70, to: at + 92, token: 'launchIn', family: 'leave' });
      tw3.push({ from: at + 88, to: at + 120, token: 'glideOut', family: 'arrive' });
    }
    for (let j = 0; j < 5; j++) tw3.push({ from: 30 + j * 30, to: 42 + j * 30, token: 'hitPulse', family: 'arrive' }); // ticks on the beat (120 BPM)
    for (let j = 0; j < 6; j++) tw3.push({ from: 500 + j, to: 530 + j, token: 'softOut', family: 'arrive' }); // six panels turning together
    const r3 = score({ cues: { ...cuesA, bpm: 120 }, layout: { tweens: tw3 }, target: T, format: 'launch' });
    const st = dimOf(r3, 'staggers');
    check((st.score ?? 100) >= 70 && dimOf(r3, 'role-mix').score >= 70 && dimOf(r3, 'overlap').score >= 70,
      'creeps, the camera, even 4-word staggers, beat-locked ticks and panels moving together do not fail role-mix, staggers or overlap',
      `role-mix ${dimOf(r3, 'role-mix').score}, staggers ${st.score} ${JSON.stringify(st.value)}, overlap ${dimOf(r3, 'overlap').score} ${JSON.stringify(dimOf(r3, 'overlap').value)}`);
    const metro = [];
    for (let k = 0; k < 4; k++) for (let w = 0; w < 8; w++) metro.push({ from: k * 200 + w * 6, to: k * 200 + w * 6 + 30, token: 'snapOut', family: 'arrive' });
    check(dimOf(score({ cues: cuesA, layout: { tweens: metro } , target: T, format: 'launch' }), 'staggers').score < 70, 'runs of 8 starts at an even 6 f (a metronome) still fail staggers');
  }
  // the measured dimensions are calibrated on the house ranges: a film at their edges scores 70 or more
  {
    const edge = withM({ starts_per_s: 1.33, concurrency: 4.29, idle_share: 0.44, living_holds: 0.83, cut_sync: { within_1f: 0.143, within_100ms: 0.286 }, shot_lengths: [0.8, 1, 1.2, 1.34, 4, 7, 8, 9.5].map((x) => x),
      hue_groups: 8, ground_L: 0.13, ground_C: 0.0275, ink_L: 0.40, picture: { neutral: 0.19, saturated_out: 0.54, wash_share: 0.6, accent: 0.40, second_accent: true, flat: 0.28, flat_frames_over: 0.07, edges: 0.108, falloff: 0.01, saturated: 0, bleed_share: 0.25, skeleton_samples: 4 } });
    const low = edge.dims.filter((d) => d.score !== null && d.score < 70 && ['density', 'holds', 'cut-sync', 'colour', 'picture'].includes(d.name)).map((d) => `${d.name} ${d.score}`);
    check(low.length === 0, 'a film at the edges of the house ranges scores 70 or more on density, holds, cut-sync, colour and picture', low.join(', '));
  }
  pair(
    'picture',
    withM({ picture: { flat: 0.5, flat_frames_over: 0.3, edges: 0.04, falloff: 0.8, saturated: 0.14, bleed_acts: [true, true], skeleton_samples: 0 } }),
    withM({ picture: { flat: 0.06, flat_frames_over: 0, edges: 0.16, falloff: 0.3, saturated: 0.003, bleed_acts: [false, false], skeleton_samples: 12 } }),
    'picture: type on clean ground beside imagery scores 100; texture everywhere with skeleton cards does not',
  );
  {
    const atFloor = dimOf(withM({ picture: { flat: 0.25, flat_frames_over: 0.05, edges: 0.12, falloff: 0, saturated: 0.022, bleed_share: 0.25, skeleton_samples: 0 } }), 'picture').score;
    check(atFloor >= 70 && atFloor <= 72, 'picture: a frame exactly at the floor scores 70 (the target scores 100)', `${atFloor}`);
  }
  console.log(`grammar-score self-test: ${bad ? `${bad} failed` : 'all pass'}`);
  return bad ? 1 : 0;
};

// ---------------------------------------------------------------------------------- main
if (opt.selfTest) process.exit(selfTest());
let target = houseTarget();
if (opt.target) target = merge(target, read(opt.target));
if (opt.printTarget) {
  console.log(JSON.stringify(target, null, 1));
  process.exit(0);
}
const cuesPath = opt.cues ?? (existsSync('out/cues.json') ? 'out/cues.json' : null);
const cues = read(cuesPath);
const layout = read(opt.layout);
const look = read(opt.look);
const forensics = read(opt.forensics);
if (!cues && !look && !layout) {
  console.error('grammar-score: nothing to score: pass --cues (or have out/cues.json), --look and/or --layout');
  process.exit(2);
}
const format = opt.format ?? cues?.look?.filmType ?? 'launch';
const res = score({ cues, layout, look, forensics, target, format });
const run = { at: new Date().toISOString(), format, target: target.source ?? 'custom', inputs: { cues: cuesPath, layout: opt.layout, look: opt.look, forensics: opt.forensics }, ...res };
if (opt.json) {
  const p = resolve(opt.json);
  mkdirSync(dirname(p), { recursive: true });
  let doc = { runs: [] };
  try {
    doc = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(doc.runs)) doc = { runs: [] };
  } catch {
    /* a first run */
  }
  doc.runs.push(run);
  writeFileSync(p, JSON.stringify(doc, null, 1) + '\n');
}
if (!opt.quiet) {
  for (const d of res.dims) console.log(`  ${d.score === null ? '  - ' : String(d.score).padStart(4)}  ${d.name.padEnd(15)} ${d.source.padEnd(10)} ${typeof d.value === 'object' && d.value !== null ? JSON.stringify(d.value) : d.value ?? ''}${d.detail && typeof d.detail === 'string' ? `  (${d.detail})` : ''}`);
  console.log(`grammar-score: mean ${res.mean ?? '-'} over ${res.measured + res.declared} dimensions (${res.measured} measured, ${res.declared} declared); weakest ${res.weakest.join(', ') || '-'}; floor ${res.floor === null ? 'not measured (look-audit.py)' : res.floor ? 'pass' : 'FAIL'} -> ${res.ship ? 'SHIP' : 'below the ship bar'}${opt.json ? ` (${opt.json})` : ''}`);
}
process.exit(res.ship ? 0 : 1);
