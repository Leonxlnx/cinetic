// The product kit's colours, derived from one recipe (lib/look.ts RECIPE) and the film's tokens. Nothing here
// writes a hex colour: every surface, text and tone is computed from OKLCH numbers. Grounds, surfaces, wells,
// hairlines and avatar tones are neutral greys (lib/look.ts NEUTRAL: C <= .012 here, at the hue of the film's
// own greys, brand/tokens.ts C.mute); only the accent carries the hue, on the things that matter (the state
// that changed, the highlighted bar, the button pressed). A film that changes its accent, its greys or its
// recipe re-colours the whole kit at once.
import { C } from '../brand/tokens';
import type { PhotoGrade } from '../fx/Photo';
import { mixColor, oklch as fromLch, textOn, toOklch } from '../lib/color';
import { NEUTRAL, STAGE } from '../lib/look';

export type KitRecipe = 'slateMid' | 'deepField' | 'stoneMid' | 'tintedPaper' | 'inkStage';

export type KitTheme = {
  recipe: KitRecipe;
  dark: boolean; // light type on a dark or mid-dark ground
  hue: number; // the accent's hue (degrees)
  ground: string; // the stage behind the product (neutral; the accent's hue at depth only for deepField, a colour event)
  surface: string; // a card on the ground (on a dark theme 8 L* or more over it: look-audit card-separation)
  raised: string; // a face lifted toward the key (a header, a selected row)
  well: string; // inset areas: a bar's track, an input
  text: string;
  mute: string; // secondary text, still >= 4.5:1 on the surface
  line: string; // hairlines and dividers
  accent: string; // the one accent, at the lightness the ground needs
  accentInk: string; // text and glyphs drawn on the accent
  accentText: string; // the accent as words on this theme's surface and raised faces (a swapped word, a key word): moved in lightness until it reads 4.5:1 on both; `accent` stays for fills, bars and marks
  accentSoft: string; // a quiet tint of the accent, under the saturated line (chips, the other bars, the selected row)
  accentDeep: string; // the accent at depth (the duotone shadow, a pressed button)
  second?: string; // the support hue beside the accent (lib/look.ts COLOUR.second): 10-30 % of the film, at the lightness the ground needs
  shade: [r: number, g: number, b: number]; // the shadow colour (a neutral near-black), for rgba() shadows
  shadeA: number; // the base alpha of a cast shadow on this ground
  tones: string[]; // avatar tones: neutral greys, six lightness steps
  photo: { backdrop: [top: string, bottom: string]; floor: string; bodies: string[] }; // the still-life palette: neutral set, one accent body
};

export type KitOptions = {
  /** The film's greys (a token such as C.mute): their hue, and their chroma up to NEUTRAL.houseC[1]. */
  greys?: string;
  /** The support hue beside the accent (C.second when the film declares one). */
  second?: string;
};

const rgbOf = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
};

/** The tokens' optional second hue, if the film declares one (brand/tokens.ts C.second). */
const tokenSecond = (): string | undefined => (C as Record<string, string | undefined>).second;

/**
 * The kit's colours for a recipe (default: the dark stage, a neutral mid slate). Neutrals sit at the hue of the
 * film's greys (`greys`, default C.mute) with chroma no higher than theirs and never above NEUTRAL.houseC[1];
 * the accent keeps its own hue. deepField is a colour event: its ground is the accent's hue at depth, its
 * cards stay neutral.
 */
export const kitTheme = (recipe: KitRecipe = STAGE.dark, accent: string = C.accent, opts: KitOptions = {}): KitTheme => {
  const t = kitThemeBase(recipe, accent, opts);
  return { ...t, accentText: textOn(textOn(t.accent, t.surface, 4.5), t.raised, 4.5) }; // readable on the card and on a lifted face
};

const kitThemeBase = (recipe: KitRecipe, accent: string, opts: KitOptions): Omit<KitTheme, 'accentText'> => {
  const [aL, aC, h] = toOklch(accent);
  const [, gC, gh] = toOklch(opts.greys ?? C.mute);
  const greyC = Math.min(NEUTRAL.houseC[1], gC);
  const nh = gC < 0.002 ? h : gh; // pure greys: the accent's hue at the low chroma below (it rounds to grey)
  const at = (L: number, Cc: number) => fromLch(L, Cc, h);
  const n = (L: number, Cc = 0.008) => fromLch(L, Math.min(Cc, greyC), nh);
  const c = (want: number) => Math.min(want, Math.max(0.06, aC)); // never more chroma than the brand's own accent
  const soft = (L: number) => at(L, Math.min(0.03, aC)); // a tint under the saturated line (C < .06), so it never floods
  const tones = (Ls: number[]) => Ls.map((L) => n(L, 0.01));
  const sec = opts.second ?? tokenSecond();
  const secondAt = (L: number) => {
    if (!sec) return undefined;
    const [, sC, sh] = toOklch(sec);
    return fromLch(L, Math.min(sC, 0.14), sh);
  };
  switch (recipe) {
    case 'deepField':
      return {
        recipe, dark: true, hue: h,
        ground: at(0.38, 0.1), surface: n(0.455, 0.01), raised: n(0.5, 0.01), well: n(0.33, 0.01),
        text: n(0.97, 0.005), mute: n(0.85, 0.008), line: n(0.56, 0.01),
        accent: at(0.84, c(0.1)), accentInk: at(0.26, 0.06), accentSoft: soft(0.56), accentDeep: at(0.3, 0.09), second: secondAt(0.8),
        shade: rgbOf(n(0.14, 0.006)), shadeA: 0.34,
        tones: tones([0.62, 0.7, 0.56, 0.76, 0.66, 0.52]),
        photo: { backdrop: [n(0.5, 0.008), n(0.36, 0.008)], floor: n(0.3, 0.008), bodies: [n(0.86), at(0.62, c(0.1)), n(0.24), n(0.72)] },
      };
    case 'stoneMid':
      return {
        recipe, dark: false, hue: h,
        ground: n(0.74, 0.012), surface: n(0.82, 0.01), raised: n(0.87, 0.008), well: n(0.68, 0.012),
        text: n(0.14, 0.01), mute: n(0.36, 0.01), line: n(0.64, 0.01),
        accent: at(0.42, c(0.16)), accentInk: n(0.97, 0.005), accentSoft: soft(0.66), accentDeep: at(0.3, 0.1), second: secondAt(0.44),
        shade: rgbOf(n(0.14, 0.008)), shadeA: 0.22,
        tones: tones([0.42, 0.5, 0.36, 0.56, 0.46, 0.32]),
        photo: { backdrop: [n(0.86, 0.008), n(0.7, 0.01)], floor: n(0.66, 0.01), bodies: [at(0.42, c(0.12)), n(0.92, 0.006), n(0.22), n(0.58)] },
      };
    case 'tintedPaper':
      return {
        recipe, dark: false, hue: h,
        ground: n(0.955, 0.006), surface: n(0.99, 0.003), raised: n(1, 0), well: n(0.92, 0.006),
        text: n(0.22, 0.01), mute: n(0.5, 0.01), line: n(0.885, 0.006),
        accent, accentInk: n(0.985, 0.004), accentSoft: soft(0.9), accentDeep: at(Math.max(0.3, aL - 0.16), c(0.12)), second: secondAt(0.56),
        shade: rgbOf(n(0.22, 0.008)), shadeA: 0.1,
        tones: tones([0.5, 0.58, 0.44, 0.64, 0.54, 0.4]),
        photo: { backdrop: [n(0.9, 0.006), n(0.78, 0.008)], floor: n(0.74, 0.008), bodies: [at(0.45, c(0.12)), n(0.94, 0.006), n(0.26), n(0.62)] },
      };
    case 'inkStage':
      return {
        recipe, dark: true, hue: h,
        ground: n(0.15, 0.008), surface: n(0.225, 0.008), raised: n(0.27, 0.008), well: n(0.12, 0.008),
        text: n(0.955, 0.006), mute: n(0.75, 0.008), line: n(0.3, 0.008),
        accent: at(0.74, c(0.13)), accentInk: n(0.18, 0.008), accentSoft: soft(0.34), accentDeep: at(0.28, 0.07), second: secondAt(0.74),
        shade: rgbOf(n(0.06, 0.006)), shadeA: 0.42,
        tones: tones([0.52, 0.6, 0.46, 0.66, 0.56, 0.42]),
        photo: { backdrop: [n(0.34, 0.01), n(0.18, 0.008)], floor: n(0.16, 0.008), bodies: [n(0.86), at(0.56, c(0.1)), n(0.3), n(0.7)] },
      };
    case 'slateMid':
    default:
      return {
        recipe: 'slateMid', dark: true, hue: h,
        ground: n(0.34, 0.008), surface: n(0.415, 0.008), raised: n(0.46, 0.008), well: n(0.3, 0.008),
        text: n(0.97, 0.005), mute: n(0.8, 0.008), line: n(0.5, 0.01),
        accent: at(0.8, c(0.12)), accentInk: n(0.2, 0.008), accentSoft: soft(0.5), accentDeep: at(0.32, 0.07), second: secondAt(0.78),
        shade: rgbOf(n(0.12, 0.006)), shadeA: 0.32,
        tones: tones([0.58, 0.66, 0.52, 0.72, 0.62, 0.48]),
        photo: { backdrop: [n(0.52, 0.008), n(0.36, 0.008)], floor: n(0.32, 0.008), bodies: [n(0.88), at(0.6, c(0.1)), n(0.24), n(0.72)] },
      };
  }
};

/** A shadow colour of the theme at alpha a, for box-shadow and SVG fills. */
export const shadeRgba = (t: KitTheme, a: number) => `rgba(${t.shade[0]}, ${t.shade[1]}, ${t.shade[2]}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;

/** The theme colour c lifted toward the key by `amt` (0..1 of the way to the text colour on dark themes, to white on light ones). */
export const lit = (t: KitTheme, c: string, amt: number) => mixColor(c, t.dark ? t.text : t.raised, amt);

export type GradeLook = 'natural' | 'matte' | 'silver' | 'deep' | 'duotone';

/**
 * A photo or footage grade (fx/Photo, fx/Footage `grade`) for a look. `natural` is the default and the film's
 * look: each picture keeps its own colour (a touch of contrast, colour held back a little). matte and silver are
 * whole-film looks too. deep and duotone wash the picture in the accent's hue: explicit choices for one shot
 * (a colour event, lib/look.ts COLOUR), never the default; bake heavy grades with scripts/assets.mjs grade.
 */
export const photoGrade = (look: GradeLook = 'natural', t: KitTheme = kitTheme()): PhotoGrade => {
  switch (look) {
    case 'matte':
      return { saturate: 0.7, contrast: 0.92, brightness: 1.03 };
    case 'silver':
      return { saturate: 0, contrast: 1.08 };
    case 'deep':
      return { duotone: [fromLch(0.14, 0.05, t.hue), fromLch(0.82, 0.1, t.hue)], contrast: 1.04 };
    case 'duotone':
      return { duotone: [fromLch(0.2, 0.08, t.hue), fromLch(0.96, 0.03, t.hue)] };
    case 'natural':
    default:
      return { saturate: 0.9, contrast: 1.03 };
  }
};
