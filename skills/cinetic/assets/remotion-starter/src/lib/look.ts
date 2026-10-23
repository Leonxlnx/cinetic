// The house look, as numbers: colour-system recipes, shadow, radius, living light, measure and the
// grammar bands the checks read. Colours here are OKLCH [L, C] at the brand's accent hue (or neutral):
// scripts/palette.py --recipe turns a recipe into hex tokens for brand/tokens.ts, which stays the
// only place a hex colour is written. Node-safe, no imports.

/** OKLCH lightness and chroma at the accent hue h (C 0: neutral). */
export type LC = [L: number, C: number];

/**
 * Colour systems. Ground, ink and accent bands; one accent hue per film. tintedPaper is the house
 * default; inkStage its dark twin; paperEditorial neutral paper with one material; whiteWorld the
 * one system where pure white is allowed.
 */
export const RECIPE = {
  tintedPaper: {
    ground: [0.955, 0.008] as LC, // L .93-.99, C .004-.015 toward h (C <= .004 when h is red or yellow)
    surface: [0.985, 0.004] as LC, // raised UI: +.01-.03 L, or the ground with a dip shadow
    ink: [0.22, 0.012] as LC, // L .15-.25, C 0-.02
    mute: [0.52, 0.01] as LC, // secondary text, >= 4.5:1 on the ground
    accent: [0.56, 0.18] as LC, // L .43-.67, C .11-.25
    floor: { stops: [[0.95, 0.02], [0.89, 0.05], [0.8, 0.09], [0.73, 0.13]] as LC[], cover: 0.25 }, // a strong floor; soft: [[.955, .01], [.90, .04]]
  },
  inkStage: {
    ground: [0.15, 0.01] as LC, // L .06-.23, C 0-.04 toward h (navy only for a blue h)
    raised: [0.2, 0.012] as LC, // +.04-.06 L, a 1 px top hairline at 8-12 % white
    type: [0.955, 0.006] as LC, // L .92-.99
    mute: [0.75, 0.01] as LC,
    accent: [0.74, 0.13] as LC, // L .63-.85, C .07-.16
    floor: { stops: [[0.2, 0.08], [0.28, 0.13], [0.31, 0.15]] as LC[], cover: 0.25 },
  },
  paperEditorial: {
    ground: [0.945, 0] as LC, // neutral
    ink: [0.24, 0] as LC,
    texture: { kind: 'paper', highPassStdLstar: 1.9, grainPx: 2 }, // one material, used everywhere
  },
  whiteWorld: {
    ground: [1.0, 0] as LC, // pure white: this system only
    ink: [0.13, 0.01] as LC,
    accentRamp: { from: 0.95, to: 0.3 }, // one-hue L ramp at h, spent on colour sweeps and a late arrival of full colour
  },
  /** Plan a light/dark sequence (L L D L ...) and flip it on transitions carried by a moving shape. */
  rhythm: 'light-dark sequence flipped on carried transitions',
} as const;

/**
 * Shadows. On paper: one soft drop in the ink colour at 6-12 % (house 8 %); on an ink stage a raised
 * surface is a lighter step plus a hairline, never a glow.
 */
export const SHADOW = {
  alpha: [0.06, 0.08, 0.12] as const, // [low, house, high] ink alpha of the paper shadow
  dipL: 0.01, // a surface on the ground can instead dip the ground 0.01 L under it
  /** The paper shadow as CSS, in the ink colour (r, g, b 0-255). */
  paper: (ink: [number, number, number], alpha = 0.08, scale = 1) =>
    `0 ${(12 * scale).toFixed(2)}px ${(40 * scale).toFixed(2)}px rgba(${ink[0]}, ${ink[1]}, ${ink[2]}, ${alpha})`,
  /** The raised surface on an ink stage: an inset top hairline of white at 8-12 %. */
  inkHairline: (alpha = 0.1) => `inset 0 1px 0 rgba(255, 255, 255, ${alpha})`,
} as const;

/** Corners: a card's radius as a share of its width; chips and tags are pills. */
export const RADIUS = { cardOfWidth: 0.12, chip: 'pill' } as const;

/**
 * Living light: a light field is one hue, built from baked, dithered plates (scripts/dither-gradient.py)
 * moved by transform and opacity, never animated CSS gradients. Its strength is visible, not a tint:
 * a lightness swing of 0.05-0.20 across the field at chroma <= 0.13 at the accent hue. Pools wander
 * about 240 px/s at 1080p (8 px per frame at 30 fps, 4 at 60); a loop repeats every 1-4 s; a reveal
 * brightens it x2 over 0.9 s.
 */
export const LIGHT = {
  dL: [0.05, 0.2] as const, // lightness swing across the field (min, max)
  maxC: 0.13, // chroma ceiling, at the accent hue only
  poolSpeedPxS: 240, // pool drift at 1080p, px per second (range 180-300)
  loopPeriodS: [1, 4] as const,
  revealBrighten: { gain: 2, dur: 0.9 }, // seconds
} as const;

/** Line measure as a share of the frame width: a statement up to 0.61 (typically 0.28-0.58), a payoff up to 0.84. */
export const MEASURE = { statementMaxFW: 0.61, statementTypicalFW: [0.28, 0.58] as const, payoffMaxFW: 0.84 } as const;

/** The grammar bands the checks read (seconds unless noted). */
export const GRAMMAR = {
  shot: {
    house: 1.6, usual: [0.93, 2.5] as const, short: 0.5, long: 3.7, spread: [1.5, 2.7] as const, // spread = long end / short end of `usual`
    band: { launch: [1.3, 2.2] as const, explainer: [2.0, 3.0] as const, reel: [0.5, 1.0] as const, social: [0.5, 1.0] as const },
  },
  density: { startsPerSec: [1.6, 2.3, 2.8] as const, gapS: 0.33, concurrent: [1.4, 1.7, 2.5] as const, idleMax: 0.15 },
  hold: { creepPerSec: [0.02, 0.06, 0.15] as const, driftPxS: [6, 30, 90] as const, intoExit60: [12, 20] as const, staticMaxS: 0.8, endLockS: [1, 5] as const },
  cut: { within1f: 0.5, within100ms: 0.8, leadMaxF: 3, dipS: [0.2, 0.5] as const, dipDb: [7, 10] as const },
} as const;
