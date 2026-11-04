// The film's colours: the brand's own when src/brand/tokens.ts carries them (scripts/brand.py, or written by hand: its
// accent is no longer the starter's stand-in), else the palette dealt for this film (src/deal.ts PALETTES: a near-black
// or a white ground, one strong accent). Every scene paints with these, never with its own demo colours: each scene
// takes the ground its picture needs (dark, light, the film's base, or the accent as a full field), and every line card
// stands on the ground of the scene it leads into, so the line and its picture share one clean ground.
import { C } from '../brand/tokens';
import { PALETTE, SCENE_SPEC, type FilmPalette } from '../deal';
import { mixColor, oklch, toOklch } from '../lib/color';
import type { Palette } from '../scenes';

/** The starter's stand-in accent: a film that still carries it takes its dealt palette instead (never the green). */
const STAND_IN_ACCENT = '#08965A';
/** Whether the brand brought its own colours. */
export const BRAND_PALETTE = C.accent.toUpperCase() !== STAND_IN_ACCENT;
const lightOf = (hex: string) => toOklch(hex)[0];

/** The film's palette: the brand's (its ink and paper as the dark and light grounds, its accent), else the dealt one. */
export const FILM: FilmPalette = BRAND_PALETTE
  ? {
      id: 'brand',
      base: lightOf(C.paper) > 0.6 ? 'light' : 'dark',
      dark: lightOf(C.ink) < 0.3 ? C.ink : '#0C0D10',
      light: lightOf(C.paper) > 0.85 ? C.paper : '#F4F5F6',
      accent: C.accent,
      lift: C.accentLift,
    }
  : PALETTE;

/** White of cards on any ground. */
export const CARD_WHITE = '#FFFFFF';

/** The ground a tone stands on. */
export const groundOf = (tone: 'dark' | 'light' | 'field'): string => (tone === 'dark' ? FILM.dark : tone === 'light' ? FILM.light : FILM.accent);
/** The tone a scene plays on: the film's one ground (its base), whatever the scene was designed on; the accent field
 * (toast-stack's flood) is the film's one deliberate change, its line card on the field with it, then back. */
export const toneOf = (id: string): 'dark' | 'light' | 'field' => ((SCENE_SPEC[id]?.tone ?? 'either') === 'field' ? 'field' : FILM.base);
/** The value a scene was designed on (its own palette's ground). */
const designOf = (id: string): 'dark' | 'light' | 'field' => {
  const t = SCENE_SPEC[id]?.tone ?? 'either';
  return t === 'either' ? FILM.base : t;
};

/**
 * A scene's palette (src/scenes parts Palette) in this film's colours. Dark: the near-black ground, light type, white
 * cards; light: the white ground, dark type, white cards (the ground a hair off white so a white card reads on it);
 * field: the accent as the ground, dark cards with light type. A light scene on a dark film keeps its white surfaces as
 * raised dark ones under light type (its pill, its cards); a dark scene on a light film takes the light palette.
 */
export const scenePalette = (id: string): Palette => {
  const tone = toneOf(id);
  const across = tone === 'dark' && designOf(id) === 'light';
  const P0: Palette =
    tone === 'dark'
      ? { ground: FILM.dark, ink: FILM.light, accent: FILM.accent, lift: FILM.lift, paper: CARD_WHITE }
      : tone === 'field'
        ? { ground: FILM.accent, ink: mixColor(FILM.dark, FILM.accent, 0.08), accent: FILM.light, lift: FILM.lift, paper: CARD_WHITE }
        : { ground: FILM.light, ink: FILM.dark, accent: FILM.accent, lift: FILM.lift, paper: CARD_WHITE };
  const P: Palette = across ? { ...P0, paper: mixColor(FILM.dark, FILM.light, 0.12) } : P0;
  // a scene that washes its own field toward the accent gets the ground that lands on the film's clean one
  const wash = SCENE_WASH[id];
  return wash ? { ...P, ground: unwash(P.ground, P.accent, wash) } : P;
};

/** Scenes that tint their field toward the accent by a share (porthole-line: 7 % over its upper field). */
const SCENE_WASH: Record<string, number> = { 'porthole-line': 0.07 };
/** The ground that, washed `k` toward `accent` in OKLab (lib/color mixColor), is `target`: the clean ground survives the scene's wash. */
export const unwash = (target: string, accent: string, k: number): string => {
  const lab = (c: string) => {
    const [L, C, h] = toOklch(c);
    return [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
  };
  const T = lab(target);
  const A = lab(accent);
  const G = T.map((v, i) => (v - k * A[i]) / (1 - k));
  return oklch(Math.min(1, Math.max(0, G[0])), Math.hypot(G[1], G[2]), ((Math.atan2(G[2], G[1]) * 180) / Math.PI + 360) % 360);
};

/** The inks of a line set on a ground: the type, the accent its key words take. */
export const inksOn = (ground: string): { ink: string; accent: string } => {
  if (ground === FILM.accent) return { ink: FILM.light, accent: FILM.dark };
  return lightOf(ground) > 0.6 ? { ink: FILM.dark, accent: FILM.accent } : { ink: FILM.light, accent: lightOf(FILM.accent) < 0.55 ? FILM.lift : FILM.accent };
};
/** The film's base ground (the hook stands on it). */
export const BASE = groundOf(FILM.base);
/** The frame's ground under everything (Film.tsx). */
export const WORLD = { base: BASE };
