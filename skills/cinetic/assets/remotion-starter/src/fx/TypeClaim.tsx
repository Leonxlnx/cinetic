import React from 'react';
import { C, FONT } from '../brand/tokens';
import { clamp } from '../lib/anim';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { crispWords } from './TypePresets';
import { Words } from './Words';

/**
 * Claim on accent: the big claim of a launch close, set like a poster on the accent. Cap height 16 % of the frame
 * height or more (house 16.5 %: 251 px in Geist at 1080p), flush left at a 3 % margin, tracking -0.04 em, weight 600-700
 * (house 600), lead 0.98, one to three lines broken at word boundaries so each line fits the frame, the block centred on
 * the frame's height (or sitting on the bottom or the top margin). The words arrive with the crisp entry, one after
 * another across the lines (7 f apart), so the claim builds as it is read. The accent fills the frame behind it (a
 * declared colour event: put its span in the cues' `declared.colour`), the type in paper or ink, whichever reads. Once
 * it is built the block creeps 1.5 % a second about its left margin, up to 3 % (a few tenths of a px a frame at its far
 * edge; the layout leaves room for it), so the hold is never a frozen frame.
 *
 * The block is tagged data-audit-claim: the layout audit holds it to a 2.5 % left margin instead of the zone's (the
 * claim's 3 % sits inside the title-safe 5 % on purpose); its other edges keep the zone. claimLayout() is pure (pass
 * `measure` in Node; the component measures the real font under FontGate).
 */

/** House numbers: the cap height as a share of the frame height, the margin as a share of its width, the face's cap in em. */
export const CLAIM = { cap: 0.165, capMin: 0.16, margin: 0.03, track: -0.04, weight: 600, weights: [600, 700] as const, lead: 0.98, capEm: 0.71, maxLines: 3, creep: 0.015, creepMax: 0.03 } as const;

export type ClaimSpec = {
  text: string;
  cap?: number; // cap height as a share of the frame height (>= 0.16, default 0.165)
  weight?: number; // 600-700 (default 600)
  align?: 'centre' | 'bottom' | 'top'; // where the block sits on the frame's height (default centre)
  maxLines?: number; // default 3
};

export type ClaimLine = { text: string; x: number; top: number; width: number; words: number };
export type ClaimLayout = { size: number; cap: number; weight: number; track: number; lead: number; lines: ClaimLine[]; fits: boolean; left: number; right: number };

type Measure = (text: string, size: number, weight: number, track: number) => number;
/** A width estimate for Node and tests: 0.56 em a character (a sans at semibold), tracking included. */
export const monoMeasure: Measure = (text, size, _w, track) => [...text].length * size * (0.56 + track);

/** Greedy word breaks: as many words a line as fit `maxW`. */
const breakLines = (words: string[], size: number, weight: number, track: number, maxW: number, m: Measure) => {
  const lines: string[][] = [];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (cur && m([...cur, w].join(' '), size, weight, track) <= maxW) cur.push(w);
    else lines.push([w]);
  }
  return lines;
};

/**
 * The claim's layout in frame px (pure with `measure`): the size from the cap height, the lines flush left at the
 * margin, each line's top. If a word or the line count does not fit, the size comes down toward capMin (16 %); `fits`
 * says whether it held there. The right edge keeps the safe inset `right` (default 5 % of the width).
 */
export const claimLayout = (s: ClaimSpec, film?: Partial<FilmCtx>, measure: Measure = monoMeasure, right?: number): ClaimLayout => {
  const { width, height } = sizeOf(film);
  const weight = clamp(s.weight ?? CLAIM.weight, CLAIM.weights[0], CLAIM.weights[1]);
  const left = Math.round(CLAIM.margin * width);
  const r = right ?? Math.round(0.05 * width);
  const maxW = (width - left - r) / (1 + CLAIM.creepMax); // room for the hold's creep
  const maxLines = s.maxLines ?? CLAIM.maxLines;
  const words = s.text.split(/\s+/).filter(Boolean);
  const capOf = (cap: number) => (cap * height) / CLAIM.capEm;
  let cap = Math.max(CLAIM.capMin, s.cap ?? CLAIM.cap);
  let size = capOf(cap);
  let lines = breakLines(words, size, weight, CLAIM.track, maxW, measure);
  const widest = () => Math.max(0, ...lines.map((l) => measure(l.join(' '), size, weight, CLAIM.track)));
  let fits = lines.length <= maxLines && widest() <= maxW;
  for (let k = 0; !fits && k < 24 && cap > CLAIM.capMin + 1e-6; k++) {
    cap = Math.max(CLAIM.capMin, cap - 0.0025);
    size = capOf(cap);
    lines = breakLines(words, size, weight, CLAIM.track, maxW, measure);
    fits = lines.length <= maxLines && widest() <= maxW;
  }
  const pitch = size * CLAIM.lead;
  const blockH = pitch * (lines.length - 1) + size;
  const top0 = s.align === 'top' ? Math.round(0.06 * height) : s.align === 'bottom' ? height - Math.round(0.06 * height) - blockH : (height - blockH) / 2;
  return {
    size,
    cap,
    weight,
    track: CLAIM.track,
    lead: CLAIM.lead,
    left,
    right: r,
    fits,
    lines: lines.map((l, i) => ({ text: l.join(' '), x: left, top: top0 + i * pitch, width: measure(l.join(' '), size, weight, CLAIM.track), words: l.length })),
  };
};

const lum = (hex: string) => {
  const n = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
/** WCAG contrast of two hex colours. */
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** The type colour on a ground: paper or ink, whichever reads better. */
export const inkOn = (ground: string, light: string = C.paper, dark: string = C.ink) => (contrast(ground, light) >= contrast(ground, dark) ? light : dark);

/**
 * <AccentClaim text at frame>: the claim on the accent. `flood` fills the frame with the accent (default true; false sets
 * the claim on whatever is under it, in `color`). Each line is a <Words> line on the crisp entry, the next line's first
 * word 7 f after the last line's last word; `id` tags the lines id.0, id.1 ... for the layout audit.
 */
export const AccentClaim: React.FC<ClaimSpec & { at: number; frame: number; flood?: boolean; ground?: string; color?: string; creep?: number; id?: string; style?: React.CSSProperties }> = ({
  at, frame, flood = true, ground = C.accent, color, creep = CLAIM.creep, id = 'claim', style, ...spec
}) => {
  const film = useFilm();
  const L = claimLayout(spec, film, (t, size, w, tr) => measureTracked(t, size, w, tr, FONT.text, { trailing: false }));
  const ink = color ?? inkOn(ground);
  const crisp = crispWords(film);
  const gap = crisp.stagger ?? 0;
  let n = 0;
  return (
    <div style={{ position: 'absolute', inset: 0, background: flood ? ground : undefined, overflow: 'hidden', ...style }}>
      <div data-audit-claim style={{ position: 'absolute', inset: 0, transformOrigin: `${L.left}px 50%`, transform: `scale(${(1 + Math.min(CLAIM.creepMax, (creep * Math.max(0, frame - at)) / fpsOf(film))).toFixed(5)})` }}>
        {L.lines.map((l, i) => {
          const start = at + n * gap;
          n += l.words;
          return (
            <div key={i} style={{ position: 'absolute', left: l.x, top: l.top, height: L.size * L.lead, lineHeight: L.lead }}>
              <Words
                id={`${id}.${i}`}
                text={l.text}
                start={start}
                frame={frame}
                {...crisp}
                size={L.size}
                lead={1}
                color={ink}
                style={{ fontFamily: FONT.text, fontSize: L.size, fontWeight: L.weight, letterSpacing: `${L.track}em`, lineHeight: L.lead, whiteSpace: 'pre' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
