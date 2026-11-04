// The house look, as numbers: colour-system recipes, shadow, radius, living light, measure and the
// grammar bands the checks read. Colours here are OKLCH [L, C]: grounds and surfaces are neutral greys
// (C <= NEUTRAL.maxC, toward the brand's greys or the accent's hue at a chroma too low to read as a
// colour), the accent carries the hue. scripts/palette.py --recipe turns a recipe into hex tokens for
// brand/tokens.ts, which stays the only place a hex colour is written. Node-safe, no imports.

/** OKLCH lightness and chroma (a ground's C stays under NEUTRAL.maxC; an accent's sits at the accent hue h). */
export type LC = [L: number, C: number];

/**
 * Neutral: every ground and UI surface (paper, stone, slate, ink, cards, wells, hairlines) is a grey at
 * OKLCH C <= 0.025 (house 0.004-0.012), at the hue of the brand's own greys (or the accent's hue at that low
 * chroma when a brand has none). A pixel under C 0.03 counts as neutral in the checks, one at 0.06 or more as
 * saturated. A ground at the accent's own hue and chroma is a colour event (COLOUR.event), never the film's
 * stage: a frame washed in one hue hides the accent it was meant to show.
 */
export const NEUTRAL = { maxC: 0.025, houseC: [0.004, 0.012] as const, pixelC: 0.03, saturatedC: 0.06 } as const;

/**
 * Colour as shares of the frame (scripts/look-audit.py measures them, scripts/grammar-score.mjs scores them):
 *   neutral    most of a frame is neutral: the house target is 40 % of the pixels or more over the film
 *   accent     the accent's hue family (within 20 degrees) covers 6-15 % of the frame on average, outside
 *              imagery: on the thing that matters (the state that changed, the number, the mark), never
 *              on the ground; no frame over 25 % except inside a declared colour event
 *   wash       saturated pixels have a floor (PICTURE.saturatedMin) and a ceiling (PICTURE.saturatedMax,
 *              PICTURE.washFrame): a film is not one colour wash; the target is 4.5-32 % saturated with a
 *              quarter of the frames or fewer over half saturated: commit to colour, do not drain it
 *   second     a support hue beside the accent (the default palette is accent + support): a second brand
 *              colour, data beside the accent, a state the accent cannot be, or the photographs' own second
 *              hue. It sits 40 degrees or more from the accent in an allowed family, shows in 10-30 % of the
 *              samples (the target; under 9 % warns as timid colour) at up to 8 % of the frame while it shows;
 *              declare it in the tokens (C.second) so the one-accent checks know it. A hue in more than 80 %
 *              of the frames at over 15 % of the frame is a second accent (a warning)
 *   event      a declared colour event (cues `declared.colour` [{ from, to }], or one designed flood up to
 *              2 s): a deep field, an accent flood, a colour cut; the ceilings pause inside it
 *   grade      real imagery keeps its own colour: `natural` is the default grade (kit/theme.ts photoGrade,
 *              scripts/assets.mjs grade); tint, duotone and deep are explicit choices for one shot
 */
export const COLOUR = {
  neutralTarget: 0.4,
  accent: { share: [0.06, 0.15] as const, frameMax: 0.25, deg: 20 },
  second: { minDeg: 40, frames: [0.1, 0.3] as const, maxShare: 0.08, presentShare: 0.01, timidFrames: 0.09, warn: { frames: 0.8, share: 0.15 } }, // warn: a second accent
  event: { floodMaxS: 2 },
  grade: 'natural',
} as const;

/**
 * Colour systems. Ground, ink and accent bands; one accent hue per film. tintedPaper is the light
 * default, slateMid the dark default (STAGE below), stoneMid the mid stone for relief and shadow play,
 * deepField a colour event (the accent's own hue at depth, for a moment, under neutral UI); inkStage is the
 * near-black stage, kept for films that want it on purpose; paperEditorial neutral paper with one material;
 * whiteWorld the one system where pure white is allowed. Grounds are neutral (NEUTRAL); colour mass comes
 * from the accent on what matters, real imagery in its own colours and, for a moment, a declared colour
 * event: a 1 % dot is too little, a frame in one hue too much (COLOUR).
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
  /** A mid stone: matte relief, shadow play, a lit face reads against it. A neutral grey, cool or toward the brand's greys. */
  stoneMid: {
    ground: [0.74, 0.012] as LC, // L .70-.80, C .004-.012 (C <= .006 with a red or yellow accent, so it never reads as the banned paper band)
    surface: [0.8, 0.01] as LC, // a raised face: +.04-.08 L
    lit: [0.84, 0.01] as LC, // a face turned to the key: up to +.10 L
    ink: [0.14, 0.01] as LC, // L .12-.16: type holds 7:1
    mute: [0.34, 0.01] as LC,
    accent: [0.42, 0.16] as LC, // L .38-.46: graphics hold 3:1 on the stone
    shade: [0.12, 0.24] as const, // ink alpha of the shade plates (turned-away faces, cast shadows)
  },
  /** A mid slate: the dark default. Deep enough for light type, light enough that shadows and lit faces still read. A neutral grey. */
  slateMid: {
    ground: [0.34, 0.008] as LC, // L .30-.40, C .004-.012: the brand's greys or a cool grey (a slate tinted at C .025 or more reads as a colour)
    raised: [0.4, 0.008] as LC, // +.06 L
    lit: [0.44, 0.008] as LC, // a face turned to the key: +.06-.10 L
    type: [0.97, 0.005] as LC, // L .96-.99: 8:1 or more
    mute: [0.8, 0.008] as LC,
    line: [0.48, 0.01] as LC,
    accent: [0.8, 0.12] as LC, // L .74-.84 (a yellow .86-.90): it signals by lightness on the slate
    shade: [0.2, 0.32] as const, // near-black alpha of the shade plates
  },
  /**
   * A colour event: the ground is the accent's hue at depth, so the accent signals by lightness (blue, teal or
   * green hues). For a moment (COLOUR.event: declare it), under neutral UI, never the film's stage.
   */
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
// STAGE.colour is the recipe of a declared colour event (COLOUR.event), not a stage a film sits on.

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
 * a lightness swing of 0.05-0.20 across the field at chroma <= 0.13 at the accent hue (a field that fills the
 * frame at that chroma is a colour event; behind UI, keep it near neutral, C <= 0.025). Pools wander
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

/**
 * The ground and its light. Every element in frame has a job; light is motivated and subtle. A living light field
 * (LIGHT) is a place's light (a lit floor, a window, a lamp the film shows) or a light event, never the default ground
 * behind type and UI. The ground is flat or keyed from one side (a lightness swing of 0.02-0.10, house 0.06: fx/Grounds
 * flat and wash); a pool, bars or beams only where the place has that light, named in the film (cinetic:light <what>);
 * never a white haze, a pool behind a line or a lockup, or a vignette that reads as fog (look-audit ground-haze: the
 * ground's light rising to a dome more than 0.025 L over its brightest edge). Nothing floats on the ground without
 * content: a shape 0.015-0.07 L off the ground that carries no text, icon or mark is filler (look-audit filler-shape);
 * a far plane is softer and smaller, never dimmed into a blank shape. A lit panel's face lifts 5 % toward the key at
 * most (fx/Lit): the light is the rim and the shadow, not a veil over the product.
 */
export const GROUND_LOOK = {
  swing: [0.02, 0.1] as const, // OKLCH L across the frame behind content
  swingHouse: 0.06,
  haze: 0.025, // the most the ground's light may rise to a dome inside the frame over its brightest edge
  filler: [0.015, 0.07] as const, // L off the ground: a faint shape in this band must carry text, an icon or a mark
  faceLift: 0.05, // the most a lit panel's face lifts toward the key
} as const;

/** Line measure as a share of the frame width: a statement up to 0.61 (typically 0.28-0.58), a payoff up to 0.84. */
export const MEASURE = { statementMaxFW: 0.61, statementTypicalFW: [0.28, 0.58] as const, payoffMaxFW: 0.84 } as const;

/**
 * The house type roles, measured, in two families; the director picks one per film (brand/tokens.ts TYPE_FAMILY,
 * and TYPE holds that family's numbers). Sizes in px at 1080p; tracking in em in the starter's face (Inter at its display
 * cut), fitted to target frames with scripts/font-match.mjs, so the letter fit is measured, not a convention; another
 * face adds its offsets from scripts/faces.json.
 *   calm   the usual family (the largest line on screen a 5.9-8.5 % box of the frame height, median 7.8 %): small
 *          sentence lines (cap 5-6 % of the frame height, 84 px), regular weights (measured 380-500), the face's own letter fit at every size (Inter measured -0.015 to +0.03 em on sentence lines,
 *          labels and UI text), an open lead and 85 % white or more. "Airy" is size, weight and space,
 *          not wide tracking: positive tracking is only what a tight face needs to reach that fit (Inter Tight
 *          needs about +0.03 em); a wide-tracked title at rest is a slop tell.
 *   bold   the punchy one (a 9.3-14.8 % box, median 10.6 %): big lines (cap 7.4-8.3 %, 120 px), semibold
 *          (measured 540-600), tracking that tightens with size (in Inter, -0.034 em measured at a line, -0.04 to -0.05
 *          at the big type and the end title).
 * Both, measured: sentence case (capitals only on small labels, tracked +0.04 to +0.08 em);
 * 2-4 words a line (median 3, rarely past 7); a statement 28-58 % of the frame width (MEASURE); UI text 37-55 px; the
 * end card's name with a cap or ascender 10-14 % of the frame height, its tagline a caption. Two weights per family.
 */
export const TYPE_LOOK = {
  calm: {
    ui: { size: 40, weight: 450, track: 0.01, lead: 1.3 }, // labels and UI text (measured 37-52 px, +0.015 to +0.024 em)
    caption: { size: 46, weight: 450, track: 0.01, lead: 1.3 },
    line: { size: 84, weight: 450, track: 0, lead: 1.2 }, // the sentence line (measured 62-85 px, -0.010 to +0.005 em)
    display: { size: 160, weight: 500, track: -0.01, lead: 1.05 }, // a short statement, the end card's name: cap 10.5 %
    hero: { size: 200, weight: 500, track: -0.01, lead: 1.0 }, // the payoff word: cap 13 %
    giant: { size: 640, weight: 500, track: 0.02, lead: 0.9 }, // the one giant word, whole in frame (measured 622 px, +0.03 em)
  },
  bold: {
    ui: { size: 40, weight: 500, track: -0.01, lead: 1.3 },
    caption: { size: 46, weight: 500, track: -0.01, lead: 1.25 },
    line: { size: 120, weight: 600, track: -0.03, lead: 1.05 }, // measured 90-120 px at 540-600, -0.036 em
    display: { size: 200, weight: 600, track: -0.035, lead: 1.0 }, // titles measured 154-175 px, -0.047 to -0.017 em
    hero: { size: 240, weight: 600, track: -0.04, lead: 0.95 }, // big type measured 253 px at 580, -0.044 em
    giant: { size: 900, weight: 600, track: -0.045, lead: 0.9 }, // cropped by the frame (cap 41-91 %)
  },
} as const;
export type TypeFamily = keyof typeof TYPE_LOOK;

/**
 * Emphasis: a hero line is never one size, one weight and one colour from end to end (fx/TypeEmphasis). Most hero
 * statement lines set their key word apart in one of these ways:
 *   weight    the key word about 200 weight units over the line at the same size (regular 400-450 against semibold
 *             600-700), usually in the accent too: calm 450 -> 650, bold 600 -> 800. Bold type is tracked tighter,
 *             and the device holds the word's width by tightening its tracking (at most 0.06 em), so a layout
 *             measured at the line's weight still holds
 *   scale     the key word one step up the type scale on the line's baseline: calm x1.5 (an 84 px line's word at
 *             126, the bold line), bold x1.35 (120 -> 162, a display word); `swell` grows it in after the line has
 *             landed (22 f on E.glideOut) while the other words slide apart and the line re-centres (kinetic reflow)
 *   marker    a solid accent bar behind the key word, 1.12 em of its size tall (measured 1.1-1.2 em), its centre
 *             0.36 em over the baseline, 0.14 em of side pad inside a line (a word alone takes more), corners 0.12 of its height; it wipes on from the left
 *             in 10 f (E.snapOut) and knocks the word out to the ground as its front passes
 *   box       the inverted box: the line's ink behind the word, 1.42 em tall, 0.4 em of side pad, square corners
 *             (measured 1.57 em and 0.72 em on a giant word)
 *   under     a rule under the key word: 0.075 em thick, 0.13 em under the baseline, drawn left to right in 12 f,
 *             the word at the emphasis weight
 *   outline   the key word arrives as an outline (0.022 em stroke) and fills left to right after it lands (16 f, a
 *             0.06 em edge), resting at the emphasis weight in the accent
 *   sweep     the accent crosses the key word left to right after the line lands (22 f, a 0.5 em soft front) and
 *             stays: the word ends in the accent, the rest of the line in ink
 * Times are 60 fps frames; every device starts `after60` once the key word has landed (or at its own `at`).
 */
export const EMPHASIS_LOOK = {
  weight: { calm: 650, bold: 800 } as Record<'calm' | 'bold', number>,
  scale: { calm: 1.5, bold: 1.35 } as Record<'calm' | 'bold', number>,
  holdTrack: 0.06, // the most the width hold tightens the key word's tracking (em)
  after60: 4,
  swell60: 22,
  mark60: 10,
  under60: 12,
  outline60: 16,
  sweep60: 22,
  marker: { h: 1.12, lift: 0.36, pad: 0.14, radius: 0.12 },
  box: { h: 1.42, lift: 0.34, pad: 0.4, radius: 0 },
  under: { thick: 0.075, drop: 0.13, pad: 0.02 },
  outline: { stroke: 0.022, feather: 0.06 },
  sweep: { feather: 0.5 },
} as const;

/**
 * Stacked and editorial layouts (fx/TypeStack), measured: a stack of 2-3 lines flush left at 3-5 % of the frame width
 * (2.9 and 4.6 % measured), baseline to baseline 1.0-1.08 of the size (1.02 and 1.04 measured), the last line or its key
 * word carrying the emphasis (semibold and the accent at the same size); a stair indents each line by about a third of
 * the line above; giant plus small: one or two words at display or hero size with a short caption hung beside them,
 * its first cap line on the giant's cap line, a third of an em of the giant to its right. Lines start 14 f apart.
 */
export const STACK_LOOK = { margin: 0.04, lead: 1.04, stair: 0.34, asideGap: 0.35, step60: 14 } as const;

/**
 * The grammar bands the checks read (seconds unless noted). 1.2 cuts about 12 % shorter than 1.1 (house shot 1.6 -> 1.4 s,
 * every format band x0.88); a line still holds its read (lib/pace.ts READ_WPS).
 */
export const GRAMMAR = {
  shot: {
    house: 1.4, usual: [0.82, 2.2] as const, short: 0.5, long: 3.3, spread: [1.9, 3.1] as const, // spread = q75 / q25 of the shot lengths (under 1.9 reads as a metronome)
    band: { launch: [1.15, 2.05] as const, update: [0.7, 1.4] as const, explainer: [1.75, 2.65] as const, reel: [0.45, 0.9] as const, social: [0.45, 0.9] as const },
  },
  // changeMaxS: a layout or type change at least this often outside the end lock (a creep alone reads as a held frame);
  // openerChanges: picture changes in the first 2.5 s; longTake: a take over longTake.s changes at least perTenS times every 10 s
  density: { startsPerSec: [1.9, 2.3, 2.8] as const, gapS: 0.33, concurrent: [1.6, 2.0, 2.5] as const, idleMax: 0.15, changeMaxS: 2.5, openerChanges: 2, longTake: { s: 15, perTenS: 2 } },
  // readLockS: the camera may lock this long on each type read (life continues in the type build, the light, a counter);
  // cameraMoving: the share of the body the camera moves on (look-audit floor-moving fails under 0.70, camera-lock warns over 0.99)
  hold: { creepPerSec: [0.02, 0.06, 0.15] as const, driftPxS: [6, 30, 90] as const, intoExit60: [12, 20] as const, staticMaxS: 0.8, readLockS: [0.5, 1.0] as const, cameraMoving: [0.83, 0.95] as const, endLockS: [1, 5] as const },
  cut: { within1f: 0.5, within100ms: 0.8, leadMaxF: 3, dipS: [0.2, 0.5] as const, dipDb: [7, 10] as const },
} as const;

/**
 * The picture (scripts/look-audit.py measures it on the render, beside the motion floor, which is blind
 * to content): what a frame holds, not how it moves. Two levels: the floor fails a film, the target is
 * the house band (a warning until it is met). Type reads large and frontal on clean, flat grounds; texture is
 * an accent, not the ground of every shot.
 *   flat       share of the frame that is flat ground (16 px blocks at 480 wide with almost no
 *              variation): floor mean >= 0.25 and >= 5 % of frames over 0.60 flat (a clean field
 *              somewhere), mean <= 0.90 (an empty film); target mean 0.43-0.85 and >= 18 % of frames
 *              over 0.60 flat: every type beat on a clean field or on a plate dimmed and defocused behind it
 *   edges      busy-ness: edge pixels <= 12 % of the frame (floor: busy to the edges everywhere),
 *              target <= 5.9 %; and >= 0.6 % (an empty film)
 *   saturated  colour mass: saturated pixels (OKLCH C >= 0.06) >= 2.2 % of the frame (target 4.5 %: the
 *              accent on what matters, a support hue, real imagery; one accent dot on grey is not colour)
 *   wash       and a ceiling (COLOUR): saturated pixels <= 60 % of the frame on average and no more than 65 %
 *              of the frames over half saturated (target: <= 32 % and <= 25 % of frames, neutral pixels
 *              >= 40 %, the accent's hue family 6-15 % of the frame); declared colour events left out
 *   second     (target) a support hue in 9 % of the samples or more (COLOUR.second)
 *   bleed      the subject framed past two edges at 1.2x the frame or more in at least a quarter of the
 *              acts (target: every act; a type beat on a clean field is the exception it allows)
 *   skeleton   no more than 3 glyphless bars in focus in a frame: placeholder lines are not content
 *   falloff    depth of field (target only, the motion floor asks for two planes already): a crisp plane
 *              and a defocused one in the same frame in >= 35 % of frames
 * Framing (warnings): the subject sits off-centre (1.1-1.6x the frame, bleeding off an edge); no framing
 * is held longer than 0.8 s without a depth plane moving.
 */
export const PICTURE = {
  flatMin: 0.25,
  flatMax: 0.9,
  flatFrame: { over: 0.6, minShare: 0.05 },
  edgesMax: 0.12,
  edgesMin: 0.006,
  saturatedMin: 0.022,
  saturatedMax: 0.6,
  washFrame: { over: 0.5, maxShare: 0.65 },
  bleed: { share: 0.25, edges: 2, scale: 1.2 },
  skeletonBarsMax: 3,
  target: { flatMin: 0.43, flatMax: 0.85, flatShare: 0.18, edgesMax: 0.059, saturatedMin: 0.045, bleedShare: 1, falloffShare: 0.35, saturatedMax: 0.32, washShare: 0.25, neutralMin: 0.4, accent: [0.06, 0.15] as const, secondFrames: 0.09 },
  subject: { scale: [1.1, 1.6] as const, offCentre: 0.08 },
  holdMaxS: 0.8,
} as const;
