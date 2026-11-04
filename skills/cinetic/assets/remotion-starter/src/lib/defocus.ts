// Defocus that Chromium renders cleanly. On the house render path (ANGLE) a blur radius under 0.5 px
// renders sharp, 0.5-0.7 px renders weaker than asked, and from 0.75 px up the drawn blur is within
// 0.1 px of the request. An animated radius on a large layer still costs the GPU on every frame and
// steps on other backends, so: render the layer as copies at FIXED radii from the ladder below and
// cross-fade at most two of them by opacity (fx/RackFocus does this for a rack). The radii are CSS px
// at a full-size render (a half-scale preview halves them on screen). Node-safe, no imports.

/**
 * Blur radii (CSS px at scale 1), from the first one that renders as asked upward, about x1.33-1.5
 * apart so a cross-fade between neighbours never shows a double image. Between two neighbours,
 * cross-fade; never animate the radius itself.
 */
export const DEFOCUS_LEVELS = [0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32] as const;
/** Below this radius Chromium renders a blur as sharp: treat smaller sigmas as 0. */
export const DEFOCUS_SHARP = 0.5;
/** The most stacked copies a defocus may draw at once (GPU cost per frame). */
export const DEFOCUS_MAX_COPIES = 2;

export type DefocusCopy = { level: number; weight: number };

/**
 * The copies that draw a defocus of `sigma` px: one level, or the two neighbouring levels with
 * weights that sum to 1 (never more than DEFOCUS_MAX_COPIES). Draw the first copy at full opacity and
 * the second on top at opacity = its weight (for opaque content that is the weighted mix). Level 0
 * is the sharp layer. Above the top level the top level is used alone.
 */
export const defocusMix = (sigma: number, levels: readonly number[] = DEFOCUS_LEVELS): DefocusCopy[] => {
  const s = Math.max(0, sigma);
  const ladder = [0, ...levels.filter((l) => l > 0)].sort((a, b) => a - b);
  const top = ladder[ladder.length - 1];
  if (s >= top) return [{ level: top, weight: 1 }];
  let i = 0;
  while (i < ladder.length - 2 && s >= ladder[i + 1]) i++;
  const a = ladder[i];
  const b = ladder[i + 1];
  const w = (s - a) / (b - a);
  if (w <= 1e-4) return [{ level: a, weight: 1 }];
  if (w >= 1 - 1e-4) return [{ level: b, weight: 1 }];
  return [
    { level: a, weight: 1 - w },
    { level: b, weight: w },
  ];
};

/**
 * Depth of field by distance: the defocus sigma (px at 1080p) of a layer `d` px (at 1080p) from the focal point or
 * plane. Sharp within `focus` px, rising on a smoothstep to `max` at `range` px, held there beyond (house: sharp within
 * 230 px, 7.5 px at 850 px: cards streaming past a centred word, the near and far planes of a set). Feed it the
 * distance on screen for a flat stream, or |z - zFocus| for planes in depth; draw the result with defocusMix. Pure.
 */
export const DOF = { focus: 230, range: 850, max: 7.5 } as const;
export const dofSigma = (d: number, o: { focus?: number; range?: number; max?: number } = {}): number => {
  const a = o.focus ?? DOF.focus;
  const b = Math.max(a + 1e-6, o.range ?? DOF.range);
  const t = Math.min(1, Math.max(0, (Math.abs(d) - a) / (b - a)));
  return (o.max ?? DOF.max) * t * t * (3 - 2 * t);
};

/** The nearest ladder level to `sigma` (0 under DEFOCUS_SHARP): for a held defocus drawn as one copy. */
export const defocusLevel = (sigma: number, levels: readonly number[] = DEFOCUS_LEVELS): number => {
  if (sigma < DEFOCUS_SHARP) return 0;
  return levels.reduce((best, l) => (Math.abs(l - sigma) < Math.abs(best - sigma) ? l : best), levels[0]);
};
