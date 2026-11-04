/**
 * cinetic:device-palette the worlds' fields, key lights and glass tints, each from a hue window per world (WORLD_HUE: a
 * blue accent lends its own hue to the electric stage, a blue or teal one to the deep field and the plate tints; any other
 * accent gives that world's cool default, so a green brand never paints a green screen); white and black are the light's ends
 * cinetic:light a world's own light: one key that rims the glass and lights the type, and the light baked into its field
 *
 * Worlds: the place a film stands in, one per film, each with its key light (where the light comes from, so glass,
 * rims, sweeps and glowing type pick it up). Pure data and closed-form helpers, Node-safe.
 *
 *   plate worlds (a real photograph or footage, fetched with `node scripts/assets.mjs plate <name>`)
 *     clouds     a sea of clouds from above, the horizon high, cool morning light      white type, light glass
 *     aerial     land or coast from high above (a drone, a plane)                      white type, light glass
 *     sky        a pale sky with soft clouds, looking up                               ink type, milky glass
 *     sea        open water to a far horizon, grey-blue                                white type, light glass
 *     nightCity  a city at night, its lights soft                                      white type, dark glass
 *     studio     a seamless studio sweep under a softbox                               ink type, milky glass
 *     macro      a close natural surface: leaves, water drops, moss                     white type, light glass
 *   built worlds (no picture: a lit field baked once and dithered)
 *     blackField  near-black with a soft key from above on a fine woven surface: glass glows by its rims and sweeps   white type
 *     electric    a saturated stage in the accent's hue (a cool 245 otherwise), lit from the top   white type
 *     deepField   a deep night at the accent's hue with a pool of light rising from the floor    white or glowing type
 *     paleSky     a pale sky built in code: the sun's side bright, a deeper sky opposite          ink type
 *     nearWhite   paper lit from the top left, for real photos in cards                           ink type
 *
 * dealWorld(seed) deals one world per film from WORLD_DEAL (the same seed, the same world); worldOf(kind, o) resolves
 * a world's colours for the film's accent.
 */
import { C } from '../../brand/tokens';
import { mixColor, oklch, toOklch } from '../../lib/color';
import type { LitField } from '../Grounds';
import { type Key, rgbaOf } from '../light/light';

export type PlateKind = 'clouds' | 'aerial' | 'sky' | 'sea' | 'nightCity' | 'studio' | 'macro';
export type BuiltKind = 'blackField' | 'electric' | 'deepField' | 'paleSky' | 'nearWhite';
export type WorldKind = PlateKind | BuiltKind;
export type Tone = 'light' | 'dark';

/** How glass reads in a world (alphas 0..1; blur px at 1080p, 0 over a built field: a smooth field needs no frost). */
export type GlassLook = {
  blur: number; // the frost: how far the world behind is blurred inside the glass
  veil: string; // the tint over the frost at the bottom of the face
  veilTop: string; // ... and at the top (a quiet vertical sheen, lighter toward the light above)
  rim: string; // the rim's colour
  rimPeak: number; // rim alpha facing the key
  rimBase: number; // rim alpha on the far side
  hi: number; // the inner top highlight (a 1 px line of light inside the top edge)
  shade: number; // the inner edge shade at the bottom (the glass's thickness)
  shadow: string | null; // a soft drop shadow on light worlds (a dark tone of the world, never a glow)
  brighten: number; // the frosted copy's brightness
  sat: number; // the frosted copy's saturation
  spec: number; // the resting glare across the face
  text: string; // type on the glass
};

/**
 * A static grade over a plate, in film: CSS filters (skipped at 1) and a one-hue wash (skipped at tintMix 0). The grade is
 * baked into the file by `scripts/assets.mjs plate <name> --accent <the film's accent>`, so a world's plate draws with
 * neither by default: a full-frame filter or a colour blend costs a pass every frame. Set them for a picture that was
 * not baked (World spec={{ grade: {...} }}). Nothing animates a filter.
 */
export type PlateGrade = { saturate: number; brightness: number; contrast: number; tint: string; tintMix: number; tintMode: 'color' | 'soft-light' | 'multiply' | 'screen' };

/** What a plate world's picture is and how to find it (scripts/assets.mjs PLATES holds the same searches). */
export type PlatePreset = { what: string; kind: 'photo' | 'video'; focus: [number, number]; queries: readonly string[] };

export type WorldSpec = {
  kind: WorldKind;
  tone: Tone; // light: a pale world, ink type; dark: a dark or deep world, white type
  hue: number; // the world's hue (OKLCH degrees)
  base: string; // the world's base colour: under the plate while it loads, the haze, the field's mean
  field?: LitField; // built worlds: the lit field, baked once (fx/Grounds litFieldPixels)
  plate?: PlatePreset; // plate worlds: the picture to fetch
  grade?: PlateGrade; // plate worlds: the in-film grade
  haze?: { color: string; strength: number; y: number }; // plate worlds: atmosphere toward the horizon (y: share of the frame where it peaks)
  key: Key; // where the light comes from
  ink: string; // type
  mute: string; // secondary type
  glow: string; // the colour of light here: glowing type, bloom, sweeps
  glass: GlassLook;
  vignette: number; // 0..0.5: the corners' darkening
  typeShadow?: string; // plate worlds with white type: a soft shadow in the plate's deep tone, so a line reads over bright cloud (CSS text-shadow)
  /**
   * Built worlds: a fine woven surface the key falls on (staggered short threads in a 10 x 16 px cell at 1080p, baked once as one full-frame layer), seen only where
   * the light reaches: `a` its strength, the lit ellipse at (x, y) with radii rx, ry (shares of the frame). A black
   * field with a surface is a lit place; without one it is a void. Glass frosts it away.
   */
  surface?: { a: number; x: number; y: number; rx: number; ry: number } | null;
};

/** The searches and framing of every plate world (scripts/assets.mjs plate <name> runs them). */
export const PLATES: Record<PlateKind, PlatePreset> = {
  clouds: { what: 'a sea of clouds from above, the horizon high in frame, cool morning light', kind: 'photo', focus: [0.5, 0.6], queries: ['above the clouds', 'sea of clouds aerial', 'clouds from above horizon', 'cloud layer from airplane'] },
  aerial: { what: 'land or coast from high above, soft and cool', kind: 'photo', focus: [0.5, 0.5], queries: ['aerial coastline', 'aerial landscape drone', 'aerial view fields', 'aerial forest fog'] },
  sky: { what: 'a pale blue sky with soft white clouds, looking up', kind: 'photo', focus: [0.5, 0.5], queries: ['blue sky white clouds', 'soft clouds sky', 'pale sky clouds', 'cumulus clouds blue sky'] },
  sea: { what: 'open water to a far horizon, grey-blue', kind: 'photo', focus: [0.5, 0.45], queries: ['calm sea horizon', 'ocean horizon', 'sea surface', 'open water'] },
  nightCity: { what: 'a city at night from above or across water, its lights soft', kind: 'photo', focus: [0.5, 0.55], queries: ['city at night', 'night city skyline', 'city lights night aerial', 'night street lights bokeh'] },
  studio: { what: 'a seamless studio sweep under a softbox, light grey', kind: 'photo', focus: [0.5, 0.5], queries: ['studio backdrop', 'seamless paper backdrop', 'empty studio light', 'grey studio background'] },
  macro: { what: 'a close natural surface: leaves, water drops, moss, in soft light', kind: 'photo', focus: [0.5, 0.5], queries: ['leaf macro', 'water drops macro', 'moss macro', 'fern close up'] },
};

/** The worlds a film may be dealt, each once in the list (a plate world needs its plate fetched first). */
export const WORLD_DEAL: readonly WorldKind[] = ['clouds', 'blackField', 'electric', 'deepField', 'paleSky', 'nearWhite', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro'];

/** The worlds that need no picture. */
export const BUILT: readonly BuiltKind[] = ['blackField', 'electric', 'deepField', 'paleSky', 'nearWhite'];
export const isPlateWorld = (k: WorldKind): k is PlateKind => !(BUILT as readonly string[]).includes(k);

/**
 * The hue window of each world (OKLCH degrees): an accent inside [lo, hi) lends the world its own hue, any other accent
 * gives `dflt`. A saturated stage reads as electric only in a blue (a green one is a chroma key, a teal one a pool); a
 * deep field is a navy or the accent's deep teal or blue; a photograph is tinted toward a sky, never toward green; the
 * near-neutral worlds (black field, near-white, studio) take a cool accent's hue at a chroma too low to see as colour.
 */
export const WORLD_HUE = {
  electric: { lo: 228, hi: 266, dflt: 258 },
  deep: { lo: 195, hi: 266, dflt: 252 },
  plate: { lo: 195, hi: 266, dflt: 236 },
  neutral: { lo: 140, hi: 266, dflt: 245 },
} as const;
export type HueWindow = keyof typeof WORLD_HUE;

/** The hue an accent lends a world through its window (WORLD_HUE): the accent's own inside the window, else the default. */
export const hueFor = (accent: string, w: HueWindow) => {
  const { lo, hi, dflt } = WORLD_HUE[w];
  const [, Cc, h] = toOklch(accent);
  return Cc >= 0.04 && h >= lo && h < hi ? h : dflt;
};

/** Which hue window a world reads its hue through. */
export const hueWindowOf = (kind: WorldKind): HueWindow =>
  kind === 'electric' ? 'electric' : kind === 'deepField' || kind === 'nightCity' ? 'deep' : kind === 'blackField' || kind === 'nearWhite' || kind === 'studio' ? 'neutral' : 'plate';

/** The neutral window's hue (kept for callers that want one cool field hue for an accent). */
export const fieldHue = (accent: string) => hueFor(accent, 'neutral');

/** A string's 32-bit hash (FNV-1a): the deal is a pure function of the seed. */
export const hashSeed = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/**
 * One world for a film, dealt from its seed (the film's name): the same seed, the same world. `from` narrows the deal
 * (say the built worlds when no plate is fetched yet), `avoid` skips the worlds of the last films.
 */
export const dealWorld = (seed: string, o: { from?: readonly WorldKind[]; avoid?: readonly WorldKind[] } = {}): WorldKind => {
  const pool = (o.from ?? WORLD_DEAL).filter((k) => !(o.avoid ?? []).includes(k));
  const list = pool.length ? pool : (o.from ?? WORLD_DEAL);
  return list[hashSeed(seed) % list.length];
};

const white = (a: number) => rgbaOf('#FFFFFF', a);

/**
 * Glass over a photograph: smoked a little in the plate's own deep tone, so white type reads on it even where the plate
 * behind is bright cloud (a white veil over bright cloud loses the type); a white rim and a lighter face toward the key.
 */
const glassOnPlate = (text: string, deep: string): GlassLook => ({
  blur: 26,
  veil: rgbaOf(deep, 0.2),
  veilTop: rgbaOf(deep, 0.06),
  rim: '#FFFFFF',
  rimPeak: 0.85,
  rimBase: 0.2,
  hi: 0.45,
  shade: 0.14,
  shadow: null,
  brighten: 0.94,
  sat: 1,
  spec: 0.07,
  text,
});

const glassMilky = (text: string, deep: string): GlassLook => ({
  blur: 30,
  veil: white(0.5),
  veilTop: white(0.78),
  rim: '#FFFFFF',
  rimPeak: 0.95,
  rimBase: 0.4,
  hi: 0.9,
  shade: 0.05,
  shadow: rgbaOf(deep, 0.16),
  brighten: 1.06,
  sat: 1,
  spec: 0.1,
  text,
});

/**
 * A world's colours for the film. `accent` (default the brand token) gives the world's hue through its window
 * (WORLD_HUE; `hue` overrides it); `ink` and `white` (default the brand tokens) are the type on light and dark worlds.
 */
export const worldOf = (kind: WorldKind, o: { accent?: string; hue?: number; ink?: string; white?: string } = {}): WorldSpec => {
  const accent = o.accent ?? C.accent;
  const h = o.hue ?? hueFor(accent, hueWindowOf(kind));
  const sky = o.hue ?? 236; // a sky stays a sky's blue
  const ink = o.ink ?? C.ink;
  const wt = o.white ?? C.white;
  const inkCool = mixColor(ink, oklch(0.22, 0.03, h), 0.35);
  const dark = (extra: Partial<WorldSpec> & Pick<WorldSpec, 'kind' | 'base' | 'key' | 'glass' | 'vignette'>): WorldSpec => ({
    tone: 'dark',
    hue: h,
    ink: wt,
    mute: mixColor(wt, extra.base, 0.38),
    glow: oklch(0.9, 0.05, h),
    ...extra,
  });
  const light = (extra: Partial<WorldSpec> & Pick<WorldSpec, 'kind' | 'base' | 'key' | 'glass' | 'vignette'>): WorldSpec => ({
    tone: 'light',
    hue: h,
    ink: inkCool,
    mute: mixColor(inkCool, extra.base, 0.45),
    glow: oklch(0.97, 0.02, h),
    ...extra,
  });
  const sun = (x: number, y: number, strength = 0.9): Key => ({ x, y, color: oklch(0.985, 0.006, h), strength });
  const coolTint = (L: number, Cc: number) => oklch(L, Cc, h);

  switch (kind) {
    case 'clouds':
      return dark({
        kind,
        base: oklch(0.62, 0.02, h),
        plate: PLATES.clouds,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: coolTint(0.62, 0.05), tintMix: 0, tintMode: 'color' },
        haze: { color: oklch(0.86, 0.018, h), strength: 0.12, y: 0.2 },
        typeShadow: `0 2px 30px ${rgbaOf(oklch(0.3, 0.03, h), 0.42)}`,
        key: sun(0.8, -0.1),
        glass: glassOnPlate(wt, oklch(0.32, 0.03, h)),
        vignette: 0.16,
      });
    case 'aerial':
      return dark({
        kind,
        base: oklch(0.45, 0.03, h),
        plate: PLATES.aerial,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: coolTint(0.5, 0.05), tintMix: 0, tintMode: 'color' },
        haze: { color: oklch(0.8, 0.02, h), strength: 0.14, y: 0.2 },
        typeShadow: `0 2px 30px ${rgbaOf(oklch(0.25, 0.03, h), 0.45)}`,
        key: sun(0.2, -0.2),
        glass: glassOnPlate(wt, oklch(0.32, 0.03, h)),
        vignette: 0.2,
      });
    case 'sky':
      return light({
        kind,
        hue: sky,
        base: oklch(0.88, 0.04, sky),
        plate: PLATES.sky,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: oklch(0.82, 0.05, sky), tintMix: 0, tintMode: 'color' },
        haze: { color: oklch(0.97, 0.01, sky), strength: 0.3, y: 0.95 },
        key: sun(0.86, -0.12),
        glass: glassMilky(inkCool, oklch(0.4, 0.05, sky)),
        vignette: 0,
      });
    case 'sea':
      return dark({
        kind,
        base: oklch(0.5, 0.03, h),
        plate: PLATES.sea,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: coolTint(0.55, 0.05), tintMix: 0, tintMode: 'color' },
        haze: { color: oklch(0.84, 0.02, h), strength: 0.16, y: 0.45 },
        typeShadow: `0 2px 30px ${rgbaOf(oklch(0.28, 0.03, h), 0.42)}`,
        key: sun(0.5, -0.3),
        glass: glassOnPlate(wt, oklch(0.32, 0.03, h)),
        vignette: 0.18,
      });
    case 'nightCity':
      return dark({
        kind,
        base: oklch(0.16, 0.03, h),
        plate: PLATES.nightCity,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: coolTint(0.35, 0.07), tintMix: 0, tintMode: 'color' },
        key: { x: 0.5, y: 1.15, color: oklch(0.92, 0.04, h), strength: 0.7 },
        glass: { ...glassOnPlate(wt, oklch(0.16, 0.03, h)), veil: white(0.04), veilTop: white(0.1), rimPeak: 0.7, rimBase: 0.1, hi: 0.25, shade: 0.25 },
        vignette: 0.3,
      });
    case 'studio':
      return light({
        kind,
        base: oklch(0.86, 0.004, h),
        plate: PLATES.studio,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: coolTint(0.85, 0.02), tintMix: 0, tintMode: 'color' },
        key: sun(0.2, -0.3),
        glass: glassMilky(inkCool, oklch(0.35, 0.01, h)),
        vignette: 0.06,
      });
    case 'macro':
      return dark({
        kind,
        base: oklch(0.35, 0.04, h),
        plate: PLATES.macro,
        grade: { saturate: 1, brightness: 1, contrast: 1, tint: coolTint(0.45, 0.03), tintMix: 0, tintMode: 'color' },
        key: sun(0.15, -0.2),
        glass: glassOnPlate(wt, oklch(0.32, 0.03, h)),
        vignette: 0.24,
      });
    case 'blackField':
      return dark({
        kind,
        base: oklch(0.14, 0.003, h),
        field: {
          L: 0.135,
          C: 0.003,
          h,
          vignette: 0.28,
          lights: [
            { x: 0.5, y: -0.2, rx: 0.42, ry: 0.22, L: 0.26, C: 0.004, h, a: 0.6 }, // a softbox above the set
            { x: 0.5, y: 1.12, rx: 0.5, ry: 0.12, L: 0.17, C: 0.003, h, a: 0.5 }, // its faint bounce off the floor
          ],
        },
        key: { x: 0.5, y: -0.35, color: '#FFFFFF', strength: 0.8 },
        glow: oklch(0.97, 0.004, h),
        glass: { blur: 0, veil: white(0.03), veilTop: white(0.07), rim: '#FFFFFF', rimPeak: 0.85, rimBase: 0.1, hi: 0.2, shade: 0.35, shadow: null, brighten: 1, sat: 1, spec: 0.05, text: wt },
        surface: { a: 0.14, x: 0.5, y: 0.32, rx: 0.46, ry: 0.6 },
        vignette: 0,
      });
    case 'electric':
      return dark({
        kind,
        base: oklch(0.53, 0.185, h),
        field: {
          L: 0.53,
          C: 0.185,
          h,
          vignette: 0.08,
          lights: [
            { x: 0.55, y: -0.12, rx: 0.75, ry: 0.22, L: 0.66, C: 0.15, h, a: 0.75 }, // the top light
            { x: 0.04, y: 1.06, rx: 0.45, ry: 0.35, L: 0.4, C: 0.19, h, a: 0.65 }, // the deep corner
            { x: 1.0, y: 0.75, rx: 0.35, ry: 0.4, L: 0.6, C: 0.17, h, a: 0.45 }, // a side fill
          ],
        },
        key: { x: 0.35, y: -0.3, color: oklch(0.97, 0.02, h), strength: 0.85 },
        glow: oklch(0.95, 0.04, h),
        glass: { blur: 0, veil: white(0.1), veilTop: white(0.2), rim: '#FFFFFF', rimPeak: 0.65, rimBase: 0.14, hi: 0.4, shade: 0.12, shadow: rgbaOf(oklch(0.25, 0.12, h), 0.4), brighten: 1.08, sat: 1, spec: 0.06, text: wt },
        vignette: 0,
      });
    case 'deepField':
      return dark({
        kind,
        base: oklch(0.13, 0.035, h),
        field: {
          L: 0.12,
          C: 0.035,
          h,
          vignette: 0.32,
          lights: [
            { x: 0.5, y: 1.08, rx: 0.52, ry: 0.3, L: 0.34, C: 0.11, h, a: 0.8 }, // the pool of light rising from the floor
            { x: 0.5, y: -0.2, rx: 0.6, ry: 0.25, L: 0.08, C: 0.02, h, a: 0.5 }, // the dark above it
          ],
        },
        key: { x: 0.5, y: 1.1, color: oklch(0.8, 0.09, h), strength: 0.75 },
        glow: oklch(0.88, 0.07, h),
        glass: { blur: 0, veil: white(0.04), veilTop: white(0.09), rim: oklch(0.95, 0.03, h), rimPeak: 0.7, rimBase: 0.1, hi: 0.22, shade: 0.3, shadow: null, brighten: 1, sat: 1, spec: 0.05, text: wt },
        vignette: 0,
      });
    case 'paleSky':
      return light({
        kind,
        hue: sky,
        base: oklch(0.925, 0.028, sky),
        field: {
          L: 0.925,
          C: 0.028,
          h: sky,
          lights: [
            { x: 0.88, y: -0.08, rx: 0.5, ry: 0.42, L: 0.99, C: 0.006, h: sky, a: 0.85 }, // the sun's side
            { x: 0.02, y: 0.0, rx: 0.42, ry: 0.36, L: 0.86, C: 0.05, h: sky + 4, a: 0.55 }, // the deeper sky opposite
            { x: 0.5, y: 1.05, rx: 0.9, ry: 0.22, L: 0.975, C: 0.01, h: sky, a: 0.65 }, // the pale horizon
          ],
        },
        key: sun(0.86, -0.1),
        glass: glassMilky(inkCool, oklch(0.42, 0.06, sky)),
        vignette: 0,
      });
    case 'nearWhite':
    default:
      return light({
        kind: 'nearWhite',
        base: oklch(0.965, 0.004, h),
        field: {
          L: 0.965,
          C: 0.004,
          h,
          lights: [
            { x: 0.12, y: -0.12, rx: 0.6, ry: 0.45, L: 0.995, C: 0.002, h, a: 0.9 }, // the key from the top left
            { x: 1.0, y: 1.1, rx: 0.5, ry: 0.35, L: 0.92, C: 0.006, h, a: 0.55 }, // the far corner falling off
          ],
        },
        key: sun(0.12, -0.2),
        glass: glassMilky(inkCool, oklch(0.3, 0.01, h)),
        vignette: 0,
      });
  }
};
