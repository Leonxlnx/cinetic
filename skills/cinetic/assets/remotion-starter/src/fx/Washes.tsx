import React from 'react';
import { C } from '../brand/tokens';
import { mixColor, mixRgb } from '../lib/color';
import type { FilmCtx } from '../lib/film';
import type { Declares } from '../timeline';
import { GradientField, type GradientFieldProps } from './Gradients';
import type { Stop } from './plates';

/**
 * Washes: colour grounds with a direction, behind cards, a product or a line: the
 * light has a side, the colour gathers at one edge and the rest of the frame stays paper. Each is a GradientField
 * (fx/Gradients: float OKLab ramp, blue-noise dither, so a slow ramp never bands), still or drifting on a slow loop.
 * A wash is motivated light, not haze: one direction, no pools floating inside the frame, no second hue.
 *
 *   rise     paper over the upper third, the tint gathering toward the bottom edge on an ease-in ramp (t^1.7 from
 *            32 % of the height): a lit floor under nodes, cards or a diagram on a light film
 *   fall     the same from the top edge down (a sky light over a product, a dark film's ceiling)
 *   side     from one side across (the key's side; angle sets which)
 *   sky      a dusk sky behind a line: deep at the top to a lifted haze at the horizon (t^1.25), no photograph
 *            needed when the beat is the line, not the place
 *   corner   a broad glow from one corner (radial, 1.05 of the diagonal), falling to paper by two thirds of the frame
 *   halo     a soft light behind the subject (radial from 0.5, 0.6; 0.55 of the diagonal): a product card or a
 *            photo stands in its own light
 *   tilted   a lit page whose colour pools along one tilted edge: paper over the first third, then a long S-shaped
 *            ramp to the tint at the far edge (knots: 4 % of the tint at 34 % of the run, 24 % at 52 %, 81 % at 84 %,
 *            all of it at the edge), the run 8 degrees off vertical (angle 82: down and a little right), the tint the
 *            accent only a fifth of the way to paper. Behind nodes, pills and a diagram on a light film: the colour
 *            gathers under them and the frame still reads as a clean page
 *
 * Tint: the accent lifted (house mixColor(accent, paper, 0.45)), or the brand's second colour. Deep (sky): the
 * film's ink lifted toward the tint's hue. washStops() and washField() are pure; <Wash> paints the field (half size,
 * dithered) and drifts it slowly when `drift` is set (ramp lengths a second, mirrored: never a seam).
 */
export type WashKind = 'rise' | 'fall' | 'side' | 'sky' | 'corner' | 'halo' | 'tilted';

/** House numbers: where each ramp starts (share of the run), its curve exponent, the radial centres and radii. */
export const WASH = {
  rise: { from: 0.32, gamma: 1.7 },
  fall: { from: 0.32, gamma: 1.7 },
  side: { from: 0.2, gamma: 1.5 },
  sky: { from: 0, gamma: 1.25 },
  corner: { from: 0, gamma: 0.75, centre: [1, 1] as [number, number], radius: 1.05 },
  halo: { from: 0, gamma: 0.9, centre: [0.5, 0.6] as [number, number], radius: 0.55 },
  tilted: { from: 0, gamma: 1, angle: 82, tintMix: 0.2, knots: [[0, 0], [0.34, 0.04], [0.52, 0.24], [0.84, 0.81], [1, 1]] as [number, number][] },
  tintMix: 0.45, // the default tint: the accent this far toward paper
  knots: 7,
} as const;

/**
 * The ramp of a wash, as Stops from where the colour is strongest (at 0) to paper (at 1) for the radial kinds, and
 * from paper (0) to the tint (1) for the linear ones. Pure.
 */
export const washStops = (kind: WashKind, paper: string, tint: string, deep?: string): Stop[] => {
  const H = WASH[kind];
  const n = WASH.knots;
  if (kind === 'tilted') return WASH.tilted.knots.map(([at, k]) => ({ at, color: mixRgb(paper, tint, k) })); // knots read in gamma sRGB
  if (kind === 'sky') {
    const top = deep ?? mixColor(C.ink, tint, 0.35);
    return Array.from({ length: n }, (_, k) => ({ at: k / (n - 1), color: mixColor(top, tint, (k / (n - 1)) ** H.gamma) }));
  }
  if (kind === 'corner' || kind === 'halo') {
    // centre (0) is the tint, the edge (1) paper
    return Array.from({ length: n }, (_, k) => ({ at: k / (n - 1), color: mixColor(tint, paper, (k / (n - 1)) ** H.gamma) }));
  }
  const stops: Stop[] = [{ at: 0, color: paper }];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    stops.push({ at: H.from + (1 - H.from) * t, color: mixColor(paper, tint, t ** H.gamma) });
  }
  return stops;
};

/** The GradientField of a wash (angle: linear kinds, degrees; centre: radial kinds, shares of the frame). Pure. */
export const washField = (kind: WashKind, o: { paper?: string; tint?: string; deep?: string; angle?: number; centre?: [number, number]; radius?: number; drift?: number; grain?: number } = {}): GradientFieldProps => {
  const paper = o.paper ?? C.paper;
  const tint = o.tint ?? mixColor(C.accent, paper, kind === 'tilted' ? WASH.tilted.tintMix : WASH.tintMix);
  const stops = washStops(kind, paper, tint, o.deep);
  if (kind === 'corner' || kind === 'halo') {
    const H = WASH[kind];
    return { mode: 'radial', stops, centre: o.centre ?? H.centre, radius: o.radius ?? H.radius, grain: o.grain ?? 0.6, ...(o.drift ? { orbit: [o.drift, o.drift * 0.6], period: 14 } : {}) };
  }
  const angle = o.angle ?? (kind === 'rise' ? 90 : kind === 'fall' ? -90 : kind === 'sky' ? 90 : kind === 'tilted' ? WASH.tilted.angle : 0);
  return { mode: 'linear', stops, angle, grain: o.grain ?? 0.6, ...(o.drift ? { drift: o.drift } : {}) };
};

/** A wash over the whole frame (or a box), dithered at half size. */
export const Wash: React.FC<{ frame: number; kind: WashKind; paper?: string; tint?: string; deep?: string; angle?: number; centre?: [number, number]; radius?: number; drift?: number; grain?: number; x?: number; y?: number; w?: number; h?: number; style?: React.CSSProperties }> = (p) => (
  <GradientField frame={p.frame} x={p.x} y={p.y} w={p.w} h={p.h} style={p.style} {...washField(p.kind, p)} />
);

/** A wash declares nothing: it never cuts or steps. */
export const declares = (_p?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
