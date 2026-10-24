// The product kit's colours, derived from one recipe (lib/look.ts RECIPE) at the hue of the film's accent
// (brand/tokens.ts C.accent). Nothing here writes a hex colour: every surface, text and tone is computed
// from the recipe's OKLCH numbers, so a film that changes its accent or its recipe re-colours the whole
// kit at once, and every part stays inside one accent family (one hue, lightness steps).
import { C } from '../brand/tokens';
import { mixColor, oklch as fromLch, toOklch } from '../lib/color';
import { STAGE } from '../lib/look';

export type KitRecipe = 'slateMid' | 'deepField' | 'stoneMid' | 'tintedPaper' | 'inkStage';

export type KitTheme = {
  recipe: KitRecipe;
  dark: boolean; // light type on a dark or mid-dark ground
  hue: number; // the accent's hue (degrees)
  ground: string; // the stage behind the product
  surface: string; // a card on the ground
  raised: string; // a face lifted toward the key (a header, a selected row)
  well: string; // inset areas: a bar's track, an input
  text: string;
  mute: string; // secondary text, still >= 4.5:1 on the surface
  line: string; // hairlines and dividers
  accent: string; // the one accent, at the lightness the ground needs
  accentInk: string; // text and glyphs drawn on the accent
  accentSoft: string; // a quiet tint of the accent (chips, the selected row, the duotone highlight)
  accentDeep: string; // the accent at depth (the duotone shadow, a pressed button)
  shade: [r: number, g: number, b: number]; // the shadow colour (ink of the hue), for rgba() shadows
  shadeA: number; // the base alpha of a cast shadow on this ground
  tones: string[]; // avatar tones: one hue, six lightness steps
  photo: { backdrop: [top: string, bottom: string]; floor: string; bodies: string[] }; // the still-life palette
};

const rgbOf = (c: string): [number, number, number] => {
  const m = c.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
};

/** The kit's colours for a recipe at the accent's hue (default: the dark stage, a mid slate). */
export const kitTheme = (recipe: KitRecipe = STAGE.dark, accent: string = C.accent): KitTheme => {
  const [aL, aC, h] = toOklch(accent);
  const at = (L: number, Cc: number) => fromLch(L, Cc, h);
  const c = (want: number) => Math.min(want, Math.max(0.06, aC)); // never more chroma than the brand's own accent
  const tones = (Ls: number[], Cc: number) => Ls.map((L) => at(L, Cc));
  switch (recipe) {
    case 'deepField':
      return {
        recipe, dark: true, hue: h,
        ground: at(0.38, 0.1), surface: at(0.43, 0.1), raised: at(0.48, 0.1), well: at(0.33, 0.09),
        text: at(0.97, 0.01), mute: at(0.86, 0.03), line: at(0.53, 0.08),
        accent: at(0.84, c(0.1)), accentInk: at(0.26, 0.08), accentSoft: at(0.55, 0.09), accentDeep: at(0.3, 0.09),
        shade: rgbOf(at(0.16, 0.07)), shadeA: 0.34,
        tones: tones([0.62, 0.7, 0.56, 0.76, 0.66, 0.52], 0.08),
        photo: { backdrop: [at(0.5, 0.07), at(0.36, 0.08)], floor: at(0.3, 0.07), bodies: [at(0.86, 0.03), at(0.62, 0.1), at(0.24, 0.06), at(0.74, 0.07)] },
      };
    case 'stoneMid':
      return {
        recipe, dark: false, hue: h,
        ground: at(0.74, 0.012), surface: at(0.82, 0.01), raised: at(0.87, 0.008), well: at(0.68, 0.012),
        text: at(0.14, 0.01), mute: at(0.36, 0.01), line: at(0.64, 0.01),
        accent: at(0.42, c(0.16)), accentInk: at(0.97, 0.005), accentSoft: at(0.64, 0.06), accentDeep: at(0.3, 0.1),
        shade: rgbOf(at(0.14, 0.01)), shadeA: 0.22,
        tones: tones([0.42, 0.5, 0.36, 0.56, 0.46, 0.32], 0.07),
        photo: { backdrop: [at(0.86, 0.01), at(0.7, 0.014)], floor: at(0.66, 0.012), bodies: [at(0.42, 0.12), at(0.92, 0.008), at(0.22, 0.03), at(0.58, 0.07)] },
      };
    case 'tintedPaper':
      return {
        recipe, dark: false, hue: h,
        ground: at(0.955, 0.008), surface: at(0.99, 0.003), raised: at(1, 0), well: at(0.92, 0.008),
        text: at(0.22, 0.012), mute: at(0.5, 0.01), line: at(0.885, 0.006),
        accent, accentInk: at(0.985, 0.004), accentSoft: at(0.92, 0.04), accentDeep: at(Math.max(0.3, aL - 0.16), c(0.12)),
        shade: rgbOf(at(0.22, 0.012)), shadeA: 0.1,
        tones: tones([0.5, 0.58, 0.44, 0.64, 0.54, 0.4], 0.07),
        photo: { backdrop: [at(0.9, 0.01), at(0.78, 0.014)], floor: at(0.74, 0.014), bodies: [at(0.45, 0.12), at(0.94, 0.006), at(0.26, 0.03), at(0.62, 0.07)] },
      };
    case 'inkStage':
      return {
        recipe, dark: true, hue: h,
        ground: at(0.15, 0.01), surface: at(0.2, 0.012), raised: at(0.25, 0.012), well: at(0.12, 0.01),
        text: at(0.955, 0.006), mute: at(0.75, 0.01), line: at(0.3, 0.01),
        accent: at(0.74, c(0.13)), accentInk: at(0.18, 0.02), accentSoft: at(0.34, 0.06), accentDeep: at(0.28, 0.07),
        shade: rgbOf(at(0.06, 0.01)), shadeA: 0.42,
        tones: tones([0.52, 0.6, 0.46, 0.66, 0.56, 0.42], 0.07),
        photo: { backdrop: [at(0.34, 0.02), at(0.18, 0.015)], floor: at(0.16, 0.012), bodies: [at(0.86, 0.01), at(0.56, 0.1), at(0.3, 0.03), at(0.7, 0.06)] },
      };
    case 'slateMid':
    default:
      return {
        recipe: 'slateMid', dark: true, hue: h,
        ground: at(0.34, 0.025), surface: at(0.4, 0.025), raised: at(0.45, 0.025), well: at(0.3, 0.022),
        text: at(0.97, 0.005), mute: at(0.8, 0.01), line: at(0.5, 0.02),
        accent: at(0.8, c(0.12)), accentInk: at(0.2, 0.03), accentSoft: at(0.5, 0.06), accentDeep: at(0.32, 0.07),
        shade: rgbOf(at(0.12, 0.02)), shadeA: 0.32,
        tones: tones([0.58, 0.66, 0.52, 0.72, 0.62, 0.48], 0.07),
        photo: { backdrop: [at(0.52, 0.02), at(0.36, 0.024)], floor: at(0.32, 0.022), bodies: [at(0.88, 0.01), at(0.6, 0.1), at(0.24, 0.03), at(0.72, 0.06)] },
      };
  }
};

/** A shadow colour of the theme at alpha a, for box-shadow and SVG fills. */
export const shadeRgba = (t: KitTheme, a: number) => `rgba(${t.shade[0]}, ${t.shade[1]}, ${t.shade[2]}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;

/** The theme colour c lifted toward the key by `amt` (0..1 of the way to the text colour on dark themes, to white on light ones). */
export const lit = (t: KitTheme, c: string, amt: number) => mixColor(c, t.dark ? t.text : t.raised, amt);
