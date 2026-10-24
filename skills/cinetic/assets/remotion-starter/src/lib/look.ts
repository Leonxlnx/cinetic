// The house look, as numbers: colour-system recipes, shadow, radius, living light, measure and the
// grammar bands the checks read. Colours here are OKLCH [L, C] at the brand's accent hue (or neutral):
// scripts/palette.py --recipe turns a recipe into hex tokens for brand/tokens.ts, which stays the
// only place a hex colour is written. Node-safe, no imports.

/** OKLCH lightness and chroma at the accent hue h (C 0: neutral). */
export type LC = [L: number, C: number];

/**
 * Colour systems. Ground, ink and accent bands; one accent hue per film. tintedPaper is the light
 * default, slateMid the dark default (STAGE below), stoneMid the mid stone for relief and shadow play,
 * deepField the colour world (the accent's own hue at depth); inkStage is the near-black stage, kept for
 * films that want it on purpose; paperEditorial neutral paper with one material; whiteWorld the one
 * system where pure white is allowed. A film needs colour mass, not a 1 % dot: deal at least one mid or
 * colour ground, and let the accent, a deep field or real imagery carry 6 % or more of the frame.
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
  /** A mid stone: matte relief, shadow play, a lit face reads against it. Cool, or toward the accent hue. */
  stoneMid: {
    ground: [0.74, 0.012] as LC, // L .70-.80, C .004-.03 (C <= .006 with a red or yellow accent, so it never reads as the banned paper band)
    surface: [0.8, 0.01] as LC, // a raised face: +.04-.08 L
    lit: [0.84, 0.01] as LC, // a face turned to the key: up to +.10 L
    ink: [0.14, 0.01] as LC, // L .12-.16: type holds 7:1
    mute: [0.34, 0.01] as LC,
    accent: [0.42, 0.16] as LC, // L .38-.46: graphics hold 3:1 on the stone
    shade: [0.12, 0.24] as const, // ink alpha of the shade plates (turned-away faces, cast shadows)
  },
  /** A mid slate: the dark default. Deep enough for light type, light enough that shadows and lit faces still read. */
  slateMid: {
    ground: [0.34, 0.025] as LC, // L .30-.40, C .01-.04 toward h (navy only with a blue hue)
    raised: [0.4, 0.025] as LC, // +.06 L
    lit: [0.44, 0.025] as LC, // a face turned to the key: +.06-.10 L
    type: [0.97, 0.005] as LC, // L .96-.99: 8:1 or more
    mute: [0.8, 0.01] as LC,
    line: [0.48, 0.02] as LC,
    accent: [0.8, 0.12] as LC, // L .74-.84 (a yellow .86-.90): it signals by lightness on the slate
    shade: [0.2, 0.32] as const, // near-black alpha of the shade plates
  },
  /** A colour world: the ground is the accent's hue at depth, so the accent signals by lightness (blue, teal or green hues). */
  deepField: {
    ground: [0.38, 0.1] as LC, // L .34-.42, C .07-.13 at h
    raised: [0.44, 0.1] as LC,
    type: [0.97, 0.01] as LC, // near-white L .96-.98
    mute: [0.86, 0.03] as LC,
    accent: [0.82, 0.1] as LC, // the same hue lifted to L .78-.86
    shadePlate: [0.26, 0.1] as LC, // shade plates in the same hue
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
 * The default recipe for each kind of ground. The dark default is the mid slate, not near-black ink: a
 * near-black void flattens every shadow and lit face, and reads as a screenshot of a dark-mode tool.
 */
export const STAGE = { light: 'tintedPaper', dark: 'slateMid', mid: 'stoneMid', colour: 'deepField' } as const satisfies Record<string, keyof typeof RECIPE>;

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
    band: { launch: [1.3, 2.2] as const, update: [0.8, 1.6] as const, explainer: [2.0, 3.0] as const, reel: [0.5, 1.0] as const, social: [0.5, 1.0] as const },
  },
  density: { startsPerSec: [1.6, 2.3, 2.8] as const, gapS: 0.33, concurrent: [1.4, 1.7, 2.5] as const, idleMax: 0.15 },
  hold: { creepPerSec: [0.02, 0.06, 0.15] as const, driftPxS: [6, 30, 90] as const, intoExit60: [12, 20] as const, staticMaxS: 0.8, endLockS: [1, 5] as const },
  cut: { within1f: 0.5, within100ms: 0.8, leadMaxF: 3, dipS: [0.2, 0.5] as const, dipDb: [7, 10] as const },
} as const;

/**
 * The picture (scripts/look-audit.py measures it on the render, beside the motion floor, which is blind
 * to content): what a frame holds, not how it moves. Two levels: the floor fails a film, the target is
 * where a rich frame sits (a warning until it is met).
 *   flat       share of the frame that is flat ground (16 px blocks at 480 wide with almost no
 *              variation): floor mean <= 0.75 and no more than 88 % of frames over 0.60 flat; target
 *              mean <= 0.55 and no more than 40 % of frames over 0.60
 *   edges      structure (words, numbers, imagery, UI): edge pixels >= 1.8 % of the frame (target 3 %)
 *   saturated  colour mass: saturated pixels (OKLCH C >= 0.06) >= 2.2 % of the frame (target 6 %: a deep
 *              field, real imagery, an accent flood; one accent dot on grey is not colour)
 *   bleed      the subject framed past two edges at 1.2x the frame or more in at least half the acts
 *              (target: every act)
 *   skeleton   no more than 3 glyphless bars in focus in a frame: placeholder lines are not content
 *   falloff    depth of field (target only, the motion floor asks for two planes already): a crisp plane
 *              and a defocused one in the same frame in >= 35 % of frames
 * Framing (warnings): the subject sits off-centre (1.1-1.6x the frame, bleeding off an edge); no framing
 * is held longer than 0.8 s without a depth plane moving.
 */
export const PICTURE = {
  flatMax: 0.75,
  flatFrame: { over: 0.6, maxShare: 0.88 },
  edgesMin: 0.018,
  saturatedMin: 0.022,
  bleed: { share: 0.5, edges: 2, scale: 1.2 },
  skeletonBarsMax: 3,
  target: { flatMax: 0.55, flatShare: 0.4, edgesMin: 0.03, saturatedMin: 0.06, bleedShare: 1, falloffShare: 0.35 },
  subject: { scale: [1.1, 1.6] as const, offCentre: 0.08 },
  holdMaxS: 0.8,
} as const;
