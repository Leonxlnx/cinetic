// The film's palette, designed: ONE accent (the brand's), a white ground, a near-black ground and the accent as the
// one solid field; each house scene is painted on the value it was designed on (src/bank.ts `ground`: a light scene on
// the white, a dark one on the near-black, a colour field on the accent), so every scene keeps its source's contrast
// with the brand's colour in it. Never a tinted wash, never a scene's demo colours, never the starter's stand-in green:
// while the brand tokens still hold the starter's accent, the palette is dealt from the house set below by the film's
// seed (the deck's direction, else the name), so a film without a brand still has a designed one. A palette the deck
// dealt (src/dealt.ts `palette`: hexes mapped onto the brand) wins over both.
import { C } from './brand/tokens';
import { DEALT } from './dealt';
import { mixColor, oklch, toOklch } from './lib/color';
import type { Palette } from './scenes/parts';
import { SCENE_SEED, type Ground } from './bank';
import type { Look } from './world';

/** The house accents a film without a brand is dealt from (OKLCH): cobalt, vermilion, ocean, raspberry, signal yellow,
 * ink. Saturated, high contrast on white and on near-black; none of them a violet or the starter's green. */
export const HOUSE_ACCENTS = [[0.55, 0.23, 262], [0.63, 0.21, 33], [0.55, 0.12, 225], [0.6, 0.21, 5], [0.84, 0.17, 90], [0.2, 0, 0]].map(([l, c, h]) => oklch(l, c, h));

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const dealtPal = ((DEALT as unknown as { palette?: Partial<Record<'ground' | 'ink' | 'accent' | 'night', string>> } | null)?.palette ?? {}) as Partial<Record<'ground' | 'ink' | 'accent' | 'night', string>>;
// the starter's stand-in accent (a signal green at L .59, C .14, h 157): a film that still carries it has no brand colour
const placeholder = (([l, c, h]) => Math.abs(l - 0.593) < 0.01 && Math.abs(c - 0.141) < 0.01 && Math.abs(h - 156.5) < 2)(toOklch(C.accent));
/** The film's accent: the deck's, else the brand's, else a house accent dealt by the seed. */
export const ACCENT: string = dealtPal.accent ?? (placeholder ? HOUSE_ACCENTS[hash(SCENE_SEED) % HOUSE_ACCENTS.length] : C.accent);
const [aL, aC, aH] = toOklch(ACCENT);
const neutral = aC < 0.03; // a black or grey brand: the field is the ink, the lift a grey
/** The three grounds: white (with the brand's paper when it has one), near-black in the accent's hue, the accent. */
export const GROUNDS: Record<Ground, string> = {
  light: dealtPal.ground ?? (placeholder ? C.white : C.paper),
  dark: dealtPal.night ?? oklch(0.15, Math.min(0.018, aC * 0.12), aH),
  field: neutral ? oklch(0.16, 0.004, aH) : ACCENT,
};
/** The accent's light end on the near-black (a dark accent lifts to read there); the ink of the white. */
export const LIFT: string = aL < 0.62 ? oklch(Math.max(0.72, aL + 0.2), Math.min(0.2, aC), aH) : mixColor(ACCENT, C.white, 0.18);
export const INK: string = dealtPal.ink ?? C.ink;
/** The type on the accent field: white on a mid or dark accent, ink on a light one (a yellow). */
const ON_FIELD = aL > 0.78 ? INK : C.white;

/** The palette a house scene takes on its own ground (the props `palette` every scene reads, src/scenes/parts.ts). */
export const paletteFor = (g: Ground): Palette => {
  if (g === 'dark') return { ground: GROUNDS.dark, ink: C.white, accent: aL < 0.5 ? LIFT : ACCENT, lift: LIFT, paper: C.white };
  if (g === 'field') return { ground: GROUNDS.field, ink: mixColor(GROUNDS.dark, ACCENT, 0.12), accent: ON_FIELD, lift: LIFT, paper: C.white };
  return { ground: GROUNDS.light, ink: INK, accent: neutral ? INK : ACCENT, lift: LIFT, paper: C.white };
};

/**
 * A house scene painted on the film's one ground (timeline FILM_GROUND) when it was designed on the other value: a light
 * scene on the near-black keeps its white surfaces as raised dark ones under white type (its pill, its cards), a dark
 * scene on the white takes the white's ink with white paper; the same value, or the flood, is its own palette.
 */
export const paletteOn = (design: Ground, on: Ground): Palette => {
  if (design === on || on === 'field' || design === 'field') return paletteFor(on);
  if (on === 'dark') return { ...paletteFor('dark'), paper: oklch(0.25, Math.min(0.02, aC * 0.15), aH) };
  return paletteFor('light');
};

/** The look a line stands in on its ground (acts/scenes.tsx reads tone, ink, mute and accent; a clean solid, no glow). */
export const lookFor = (g: Ground): Look => {
  const p = paletteFor(g);
  const dark = g !== 'light';
  return {
    kind: g === 'field' ? 'field' : dark ? 'night' : 'stage',
    tone: dark ? 'dark' : 'light',
    top: p.ground,
    bottom: p.ground,
    floor: p.ground,
    glow: p.ground,
    glowA: 0,
    ink: dark ? C.white : INK,
    mute: dark ? mixColor(C.white, p.ground, 0.42) : mixColor(INK, p.ground, 0.45),
    accent: g === 'field' ? ON_FIELD : dark ? LIFT : ACCENT,
    rings: 0,
  };
};
/** The chip a line's key word gathers into (the element): the accent on white and near-black, white on the field. */
export const chipFor = (g: Ground): string => (g === 'field' ? C.white : g === 'dark' ? (aL < 0.5 ? LIFT : ACCENT) : ACCENT);
