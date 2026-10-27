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
 * Each dimension scores 100 inside its pass band and falls linearly to 0 at twice the band's width
 * outside its edge; shot lengths and their spread are ratios, so they fall with the log of the ratio
 * to the band's edge (70 at 1.75 times beyond it, `shot.r70` in the target). Each is tagged
 * `measured` (read off the rendered frames: look-audit.py, forensics.py) or `declared` (read off the
 * timeline: cues.json, the tween registry of an audited render); the score
 * uses the measured value wherever a render was measured. Ship: a mean of >= 90 over the measured and
 * declared dimensions, none under 70, and the floor against a flat film (look-audit.py) passing.
 *
 * Dimensions: role-mix (total-variation distance of arrive / reposition / leave / linear / spring
 * shares, <= 0.17), front-loaded (entrances on arrive curves, >= 71 %), into-cuts (moves ending at a
 * cut on leave curves, >= 71 %), durations (per role, medians in the house range), staggers (groups
 * irregular, gaps in the house range), shots (median in the format's band, q75/q25 spread 1.9-3.1;
 * not scored on a one-take film), density (starts per second, concurrency, idle frames), holds
 * (living share >= 95 %), seams (carried >= 40 %, no kind more than 3 times except the signature,
 * mix distance <= 0.35), cut-sync (hard cuts within 1 f of a sound, the picture leading by up to 3 f,
 * >= 50 %; within 100 ms >= 80 %; not scored on a one-take film), velocity-seams (every declared one
 * carries speed), colour (one hue group, neutral grounds, ink and ground in band, and from the picture reads:
 * neutral pixels >= 40 %, no colour wash, the accent's hue family 6-15 % of the frame, no second accent;
 * lib/look.ts NEUTRAL, COLOUR, PICTURE; frames inside a declared colour event are left out of the accent's
 * share, its p95 and the neutral share, so one declared flood is never scored as the film's colour), type (no role
 * warnings), overlap (secondaries start before the primary reaches 90 %, the foreground lands about
 * 20 f@60 before the background, the next element enters 0-1 f before the previous leaves).
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
  const iqr = (row, lo = 1, hi = 3) => (Array.isArray(row) ? [row[lo], row[hi]] : null);
  return {
    source: src ? 'house (lib/look.ts GRAMMAR, lib/anim.ts DUR and STAG)' : 'house (built-in)',
    roleMix: { shares: { arrive: 0.55, reposition: 0.16, leave: 0.19, linear: 0.08, spring: 0.02 }, tvdMax: 0.17 },
    frontLoaded: 0.71,
    intoCuts: 0.71,
    durations: {
      arrive: iqr(DUR.word) && [Math.min(DUR.word[1], DUR.ui?.[1] ?? 99), Math.max(DUR.ui?.[3] ?? 0, DUR.word[3])],
      reposition: iqr(DUR.push) && [DUR.push[1], DUR.pan?.[3] ?? DUR.push[3]],
      leave: iqr(DUR.exit) && [Math.min(DUR.typeExit?.[1] ?? 99, DUR.exit[1]), DUR.exit[3]],
    },
    staggers: { gap: [STAG.letter?.[1] ?? 3, STAG.ui?.[3] ?? 17.5], cvMin: 0.15 },
    shot: { band: G.shot?.band ?? { launch: [1.3, 2.2] }, spread: G.shot?.spread ?? [1.9, 3.1], r70: 1.75 },
    density: { startsPerSec: [G.density?.startsPerSec?.[0] ?? 1.9, G.density?.startsPerSec?.[2] ?? 2.8], concurrent: [G.density?.concurrent?.[0] ?? 1.6, G.density?.concurrent?.[2] ?? 2.5], idleMax: G.density?.idleMax ?? 0.15 },
    holds: { livingMin: 0.95 },
    seams: {
      carriedMin: 0.4,
      maxUses: 3,
      mix: { velocity: 0.25, morph: 0.125, hard: 0.15, mask: 0.08, whip: 0.08, defocus: 0.07, light: 0.06, snapZoom: 0.06, breath: 0.04, zoomThrough: 0.04, stepped: 0.03, colour: 0.02 },
      mixTvdMax: 0.35,
    },
    cutSync: { within1f: G.cut?.within1f ?? 0.5, within100ms: G.cut?.within100ms ?? 0.8, width100: 0.4 },
    // grounds: paper, the mid stone, the mid slate or a deep field, ink (lib/look.ts RECIPE); ink on a light or mid-light ground
    // and the colour of the picture (look-audit's picture reads): floor 70, house target 100, like the picture dimension
    colour: {
      hueGroups: 1,
      accentMax: CO.accent?.frameMax ?? 0.25, // p95 of the accent's share of a frame (one designed flood aside)
      groundL: [[0.93, 0.99], [0.7, 0.8], [0.3, 0.42], [0.06, 0.23]],
      inkL: [0.12, 0.25],
      groundCMax: N.maxC ?? 0.025,
      neutral: { floor: 0.15, target: P.target?.neutralMin ?? CO.neutralTarget ?? 0.4 },
      saturatedMax: { floor: P.saturatedMax ?? 0.45, target: P.target?.saturatedMax ?? 0.3 },
      washShare: { floor: P.washFrame?.maxShare ?? 0.45, target: P.target?.washShare ?? 0.33 },
      accent: P.target?.accent ?? CO.accent?.share ?? [0.06, 0.15],
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
        saturatedMin: P.saturatedMin ?? 0.022,
        bleedShare: P.bleed?.share ?? 0.25,
        falloffShare: 0,
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
    overlap: { secondaryBefore90: 0.7, foregroundLead60: [10, 30], foregroundShare: 0.5, enterBeforeLeave: [0, 1], handoverShare: 0.7 },
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

// ---------------------------------------------------------------------------------- the score
export const score = ({ cues, layout, look, forensics, target, format }) => {
  const T = target;
  const fps = cues?.fps ?? look?.fps ?? 60;
  const f60 = (n) => (n * fps) / 60;
  const dims = [];
  const dim = (name, value, s, source, detail) => dims.push({ name, value, score: s, source, detail });
  const tweens = (layout?.tweens ?? []).filter((t) => Number.isFinite(t.from) && Number.isFinite(t.to) && t.to > t.from);
  const fam = (t) => t.family || 'untagged';
  const acts = cues ? Object.values(cues.acts ?? {}).map((a) => a.from).filter((a) => a > 0) : [];
  const seams = cues?.declared?.seams ?? [];
  const cuts = [...new Set([...acts, ...seams.map((s) => s.at)])].sort((p, q) => p - q);
  const M = look?.measures ?? null;

  // role mix
  if (tweens.length >= 4) {
    const n = tweens.length;
    const shares = { arrive: 0, reposition: 0, leave: 0, linear: 0, spring: 0 };
    for (const t of tweens) if (fam(t) in shares) shares[fam(t)] += 1 / n;
    const d = tvd(shares, T.roleMix.shares);
    dim('role-mix', Math.round(d * 1000) / 1000, atMost(d, T.roleMix.tvdMax), 'declared', Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, Math.round(v * 100) / 100])));
  } else dim('role-mix', null, null, 'unmeasured', 'needs the tween registry (layout-audit.sh --every 6)');

  // front-loaded arrivals: tweens starting on an arrival (a copy entry, an act start, a seam)
  const arrivals = [...(cues?.copy ?? []).map((c) => c.in), ...acts, ...seams.map((s) => s.at)];
  const ent = tweens.filter((t) => arrivals.some((a) => Math.abs(t.from - a) <= f60(3)));
  if (ent.length >= 2) {
    const share = ent.filter((t) => fam(t) === 'arrive').length / ent.length;
    dim('front-loaded', Math.round(share * 100) / 100, atLeast(share, T.frontLoaded), 'declared', `${ent.length} entrances`);
  } else dim('front-loaded', null, null, 'unmeasured', 'no entrance tweens recorded');

  // into cuts
  const into = tweens.filter((t) => cuts.some((c) => Math.abs(t.to - c) <= f60(2)));
  if (into.length >= 1) {
    const share = into.filter((t) => fam(t) === 'leave' || fam(t) === 'linear').length / into.length;
    dim('into-cuts', Math.round(share * 100) / 100, atLeast(share, T.intoCuts), 'declared', `${into.length} moves end at a cut`);
  } else dim('into-cuts', null, null, 'unmeasured', 'no move ends at a cut');

  // durations by role
  {
    const rows = [];
    for (const [role, band] of Object.entries(T.durations)) {
      if (!band) continue;
      const ds = tweens.filter((t) => fam(t) === role).map((t) => ((t.to - t.from) * 60) / fps);
      if (ds.length < 3) continue;
      const m = median(ds);
      rows.push({ role, median: Math.round(m * 10) / 10, band, ok: m >= band[0] && m <= band[1] });
    }
    if (rows.length) {
      const share = rows.filter((r) => r.ok).length / rows.length;
      dim('durations', Math.round(share * 100) / 100, atLeast(share, 0.8), 'declared', rows);
    } else dim('durations', null, null, 'unmeasured', 'fewer than 3 tweens per role');
  }

  // staggers: runs of the same curve and length starting one after another
  {
    const groups = new Map();
    for (const t of tweens) {
      const key = `${t.token}|${Math.round(((t.to - t.from) * 60) / fps)}`;
      groups.set(key, [...(groups.get(key) ?? []), t.from]);
    }
    const rows = [];
    for (const starts of groups.values()) {
      const s = [...new Set(starts.map((x) => Math.round(x * 10) / 10))].sort((p, q) => p - q);
      let run = [s[0]];
      const flush = () => {
        if (run.length >= 3) {
          const gaps = run.slice(1).map((x, i) => ((x - run[i]) * 60) / fps);
          const m = median(gaps);
          const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          const cv = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length) / Math.max(mean, 1e-6);
          rows.push({ n: run.length, gap: Math.round(m * 10) / 10, cv: Math.round(cv * 100) / 100, ok: m >= T.staggers.gap[0] && m <= T.staggers.gap[1] && (run.length <= 3 || cv >= T.staggers.cvMin) });
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
      dim('staggers', Math.round(share * 100) / 100, atLeast(share, 1), 'declared', rows.slice(0, 8));
    } else dim('staggers', null, null, 'unmeasured', 'no staggered group of 3 or more');
  }

  // shot lengths: measured cuts when a render was measured, else the declared acts and seams
  {
    const band = T.shot.band[format] ?? T.shot.band.launch ?? [1.3, 2.2];
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
      const s = Math.min(ratioScore(m, band[0], band[1], T.shot.r70), ratioScore(spread, T.shot.spread[0], T.shot.spread[1], T.shot.r70));
      dim('shots', { median: Math.round(m * 100) / 100, spread: Math.round(spread * 100) / 100, format, band }, s, source, `${lens.length} shots`);
    } else dim('shots', null, null, 'unmeasured', M?.one_take || cues?.look?.oneTake ? 'one-take film' : continuous ? 'continuous film: its seams are not hard cuts (declare them in the timeline)' : 'fewer than 3 shots');
  }

  // density
  if (M && M.starts_per_s !== null && M.starts_per_s !== undefined) {
    const s = Math.min(bandScore(M.starts_per_s, ...T.density.startsPerSec), M.concurrency === null ? 100 : bandScore(M.concurrency, ...T.density.concurrent), M.idle_share === null ? 100 : atMost(M.idle_share, T.density.idleMax));
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
    const s = Math.min(bandScore(sps, ...T.density.startsPerSec), atMost(busy / total, T.density.idleMax));
    dim('density', { startsPerSec: Math.round(sps * 100) / 100, concurrency: Math.round((conc / total) * 100) / 100, idle: Math.round((busy / total) * 100) / 100 }, s, 'declared');
  } else dim('density', null, null, 'unmeasured', 'needs look-audit.py or the tween registry');

  // living holds
  {
    const v = M?.living_holds ?? forensics?.checks?.grammar?.holds?.live_share ?? null;
    if (v !== null) dim('holds', v, atLeast(v, T.holds.livingMin), 'measured');
    else dim('holds', null, null, 'unmeasured', 'needs look-audit.py or forensics.py');
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
    const parts = [atLeast(carried, T.seams.carriedMin), over.length ? 50 : 100];
    if (d !== null && seams.length >= 5) parts.push(atMost(d, T.seams.mixTvdMax));
    dim('seams', { carried: carried === null ? null : Math.round(carried * 100) / 100, overused: over.map(([k]) => k), mixDistance: d === null ? null : Math.round(d * 100) / 100 }, Math.min(...parts.filter((x) => x !== null)), M?.carried_share !== undefined && M?.carried_share !== null ? 'measured' : 'declared');
  } else dim('seams', null, null, 'unmeasured', 'no seams declared or measured');

  // cut sync
  {
    let v = M?.cut_sync ?? null;
    let source = 'measured';
    // hard cuts land on a sound; continuity seams (velocity, morph, whip, ...) may float
    const punch = new Set(['hard', 'colour', 'light', 'stepped']);
    const carriedAt = new Set(seams.filter((s) => !punch.has(s.kind)).map((s) => s.at));
    const hardCuts = [...new Set([...acts.filter((a) => !carriedAt.has(a)), ...seams.filter((s) => punch.has(s.kind)).map((s) => s.at)])];
    if (!v && cues && hardCuts.length) {
      const ev = (cues.events ?? []).map((e) => e.f);
      if (ev.length) {
        const d = hardCuts.map((c) => Math.min(...ev.map((e) => Math.abs(e - c))));
        v = { within_1f: d.filter((x) => x <= 1).length / d.length, within_100ms: d.filter((x) => x <= 0.1 * fps).length / d.length };
        source = 'declared';
      }
    }
    if (M?.one_take || cues?.look?.oneTake) dim('cut-sync', null, null, 'unmeasured', 'one-take film: no hard cut to sync');
    else if (v) dim('cut-sync', v, Math.min(atLeast(v.within_1f, T.cutSync.within1f), atLeast(v.within_100ms, T.cutSync.within100ms, T.cutSync.within100ms + (T.cutSync.width100 ?? 0.2))), source);
    else dim('cut-sync', null, null, 'unmeasured', 'no hard cuts or no sound events');
  }

  // velocity seams carry speed (forensics carried-cut)
  {
    const rows = forensics?.checks?.grammar?.carried ?? null;
    if (rows && rows.length) {
      const share = rows.filter((r) => r.ok).length / rows.length;
      dim('velocity-seams', share, share === 1 ? 100 : Math.round(share * 100 * 0.7), 'measured');
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
    const parts = [M.hue_groups <= Tc.hueGroups ? 100 : M.hue_groups === 2 ? 60 : 0];
    if (M.accent_p95 !== null && M.accent_p95 !== undefined) parts.push(atMost(M.accent_p95, Tc.accentMax));
    if (M.ground_L !== null && M.ground_L !== undefined) parts.push(Tc.groundL.some(([lo, hi]) => M.ground_L >= lo && M.ground_L <= hi) ? 100 : 60);
    if (M.ground_C !== null && M.ground_C !== undefined && Tc.groundCMax !== undefined) parts.push(M.ground_C <= Tc.groundCMax + 1e-9 ? 100 : 60);
    if (M.ink_L !== null && M.ink_L !== undefined && M.ground_L > 0.5) parts.push(bandScore(M.ink_L, ...Tc.inkL));
    const Pm = M.picture ?? {};
    const acc = Pm.accent;
    if (Tc.neutral) parts.push(tier(Pm.neutral, Tc.neutral.floor, Tc.neutral.target));
    if (Tc.saturatedMax) parts.push(tier(Pm.saturated_out, Tc.saturatedMax.floor, Tc.saturatedMax.target));
    if (Tc.washShare) parts.push(tier(Pm.wash_share, Tc.washShare.floor, Tc.washShare.target));
    if (acc !== undefined && acc !== null && Tc.accent) parts.push(acc > Tc.accent[1] ? tier(acc, Tc.accentMax, Tc.accent[1]) : acc < Tc.accent[0] ? tier(acc, Tc.accent[0] / 3, Tc.accent[0]) : 100);
    if (Pm.second_accent === true) parts.push(60);
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
      tier(Pm.saturated, Fl.saturatedMin ?? 0.022, Tg.saturatedMin ?? 0.06),
      tier(bleed, Fl.bleedShare ?? 0.5, Tg.bleedShare ?? 1),
      tier(Pm.falloff, Fl.falloffShare ?? 0, Tg.falloffShare ?? 0.35),
      (Pm.skeleton_samples ?? 0) >= 2 ? 0 : 100,
    ].filter((x) => x !== null);
    dim('picture', { flat: Pm.flat, edges: Pm.edges, falloff: Pm.falloff, saturated: Pm.saturated, bleed: Math.round(bleed * 100) / 100, skeleton: Pm.skeleton_samples ?? 0 }, Math.min(...parts), 'measured');
  } else dim('picture', null, null, 'unmeasured', 'needs look-audit.py (the picture floor)');

  // type
  if (layout && Array.isArray(layout.warnings)) {
    const n = layout.warnings.filter((w) => w.kind === 'type-size').length;
    dim('type', n, n === 0 ? 100 : Math.max(0, 100 - 10 * n), 'measured', `${n} type-size warnings`);
  } else if (M && M.type_issues !== undefined && opt.layout) dim('type', M.type_issues, M.type_issues ? Math.max(0, 100 - 10 * M.type_issues) : 100, 'measured');
  else dim('type', null, null, 'unmeasured', 'needs layout-audit.sh');

  // overlap: secondaries start before the primary reaches 90 %; the foreground lands ~20 f@60 before
  // the background; the next element enters 0-1 f before the previous leaves
  if (tweens.length >= 3) {
    const t90 = { arrive: 0.5, reposition: 0.75, leave: 0.95, linear: 0.9 };
    const parts = [];
    const sec = [];
    for (const b of tweens)
      for (const a of tweens)
        if (a !== b && a.to - a.from > b.to - b.from && a.from < b.from && b.from < a.to) {
          sec.push(b.from <= a.from + (t90[fam(a)] ?? 0.9) * (a.to - a.from));
          break;
        }
    if (sec.length) parts.push(['secondary-before-90', sec.filter(Boolean).length / sec.length, T.overlap.secondaryBefore90]);
    const fg = [];
    for (const bg of tweens.filter((t) => ((t.to - t.from) * 60) / fps >= 40))
      for (const f of tweens.filter((t) => fam(t) === 'arrive' && t !== bg && t.from >= bg.from && t.to <= bg.to + f60(5) && ((t.to - t.from) * 60) / fps < 40)) {
        const lead = ((bg.to - f.to) * 60) / fps;
        fg.push(lead >= T.overlap.foregroundLead60[0] && lead <= T.overlap.foregroundLead60[1]);
      }
    if (fg.length) parts.push(['foreground-lead', fg.filter(Boolean).length / fg.length, T.overlap.foregroundShare]);
    const hand = [];
    for (const lv of tweens.filter((t) => fam(t) === 'leave'))
      for (const ar of tweens.filter((t) => fam(t) === 'arrive' && Math.abs(t.from - lv.to) <= f60(6))) {
        const d = lv.to - ar.from; // frames the next element is in before the previous has left
        hand.push(d >= T.overlap.enterBeforeLeave[0] - 1e-6 && d <= T.overlap.enterBeforeLeave[1] + 1e-6);
      }
    if (hand.length) parts.push(['enter-before-leave', hand.filter(Boolean).length / hand.length, T.overlap.handoverShare]);
    if (parts.length) {
      const s = Math.min(...parts.map(([, v, min]) => atLeast(v, min)));
      dim('overlap', Object.fromEntries(parts.map(([k, v]) => [k, Math.round(v * 100) / 100])), s, 'declared');
    } else dim('overlap', null, null, 'unmeasured', 'no overlapping tweens recorded');
  } else dim('overlap', null, null, 'unmeasured', 'needs the tween registry');

  const scored = dims.filter((d) => d.score !== null);
  const mean = scored.length ? Math.round((scored.reduce((n, d) => n + d.score, 0) / scored.length) * 10) / 10 : null;
  const weakest = [...scored].sort((p, q) => p.score - q.score).slice(0, 3).map((d) => d.name);
  const floor = look?.floor ? !!look.floor.pass : null;
  const ship = mean !== null && mean >= 90 && scored.every((d) => d.score >= 70) && floor === true;
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
  const cuesA = { fps: 60, total: 640, acts: Object.fromEntries([0, ...cuts].map((f, i, a) => [`a${i}`, { from: f, dur: (a[i + 1] ?? 640) - f }])), declared: { seams: cuts.map((f, i) => ({ at: f, kind: ['velocity', 'morph', 'hard', 'whip'][i] })) }, copy: [0, ...cuts].map((f) => ({ in: f })), events: cuts.map((f) => ({ f })) };
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
  // overlap: a hand-over 0-1 f before the exit ends passes; a 10 f gap fails
  const ov = score({ cues: cuesA, layout: { tweens: [{ from: 0, to: 30, token: 'buildIn', family: 'leave' }, { from: 29, to: 61, token: 'snapOut', family: 'arrive' }, { from: 100, to: 130, token: 'buildIn', family: 'leave' }, { from: 128, to: 160, token: 'snapOut', family: 'arrive' }, { from: 140, to: 200, token: 'strongInOut', family: 'reposition' }] }, target: T, format: 'launch' });
  check(ov.dims.find((d) => d.name === 'overlap').value?.['enter-before-leave'] === 0.5, 'the next element entering 0-1 f before the exit ends is measured (one of two)', JSON.stringify(ov.dims.find((d) => d.name === 'overlap').value));
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
  pair('holds', withM({ living_holds: 0.97 }), withM({ living_holds: 0.55 }), 'holds: 97 % living holds score 100; 55 % do not');
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
    score({ cues: cuesA, forensics: { checks: { grammar: { carried: [{ ok: true }, { ok: false }] } } }, target: T, format: 'launch' }),
    'velocity-seams: every declared velocity seam carrying speed scores 100; one that does not fails',
  );
  pair('colour', withM({ hue_groups: 1, accent_p95: 0.05, ground_L: 0.95, ink_L: 0.22 }), withM({ hue_groups: 3, accent_p95: 0.2 }), 'colour: one hue on paper scores 100; three hue groups and a 20 % accent do not');
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
    check(dimOf(withM({ ground_C: 0.04 }), 'colour').score === 60, 'colour: a ground at the accent chroma (C .04) is not a house ground (60)');
  }
  pair('type', score({ layout: { warnings: [] }, look: lookA, target: T, format: 'launch' }), score({ layout: { warnings: Array.from({ length: 4 }, () => ({ kind: 'type-size' })) }, look: lookA, target: T, format: 'launch' }), 'type: no role warnings score 100; four do not');
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
