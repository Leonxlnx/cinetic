// The film's look, shared by the stage (acts/World.tsx) and the hero shots (acts/heroes.tsx): the world it stands in
// (fx/world, dealt as src/deal.ts `ground`, one for the whole film, never cut), its key light, the product's surfaces in
// that world (light cards on a pale world or a photograph, dark ones on a night world or the electric stage), the type's
// inks, and one treatment for every picture.
//
// A plate world (clouds, sky, aerial, sea, nightCity, studio, macro) is a real photograph: `node scripts/assets.mjs plate
// <kind>` saves a sheet of candidates; pick one for its light and a calm area where the line and the product sit, then
// `node scripts/assets.mjs plate <kind> --pick <n> --to public/plates --accent '<the accent>'` writes public/plates/<kind>.jpg
// (graded for the film) and <kind>-soft.jpg (what glass frosts, the far depth). Until the plate is there a built world of
// the same tone stands in (PLATE_FALLBACK) and the stage says so in the Studio console.
import { getStaticFiles, staticFile } from 'remotion';
import { C } from '../brand/tokens';
import { DEAL } from '../deal';
import { type BuiltKind, isPlateWorld, type PlateKind, type WorldKind, type WorldSpec, worldOf } from '../fx/world';
import type { Light3D } from '../fx/three';
import type { ScreenTone } from '../kit/screens';
import { kitTheme, type KitTheme } from '../kit';
import { cardInks } from '../kit/card';
import { mixColor, toOklch } from '../lib/color';

/** The dealt world. */
export const WORLD_KIND = DEAL.ground as WorldKind;
/** The built world that stands in for a plate world until its picture is fetched: the same tone, the same type. */
export const PLATE_FALLBACK: Record<PlateKind, BuiltKind> = { clouds: 'deepField', aerial: 'deepField', sea: 'deepField', macro: 'deepField', nightCity: 'blackField', sky: 'paleSky', studio: 'nearWhite' };
/** Where assets.mjs plate writes a plate world's picture (public/), and its soft copy. */
export const platePath = (kind: WorldKind, soft = false) => `plates/${kind}${soft ? '-soft' : ''}.jpg`;
const hasStatic = (p: string) => {
  try {
    return getStaticFiles().some((s) => s.name === p);
  } catch {
    return false;
  }
};
/** The world the film draws: the dealt one with its picture, or (a plate world whose picture is not fetched) its stand-in. */
export const worldDrawn = (): { kind: WorldKind; src?: string; soft?: string; standIn: boolean } => {
  if (!isPlateWorld(WORLD_KIND)) return { kind: WORLD_KIND, standIn: false };
  if (!hasStatic(platePath(WORLD_KIND))) return { kind: PLATE_FALLBACK[WORLD_KIND], standIn: true };
  return { kind: WORLD_KIND, src: staticFile(platePath(WORLD_KIND)), soft: hasStatic(platePath(WORLD_KIND, true)) ? staticFile(platePath(WORLD_KIND, true)) : undefined, standIn: false };
};
let warned = false;
/** Says once, in the Studio console and the render log, that a plate world plays its stand-in. */
export const warnStandIn = () => {
  if (warned || typeof document === 'undefined') return;
  warned = true;
  const d = worldDrawn();
  if (d.standIn) console.warn(`update: the dealt world "${WORLD_KIND}" is a photograph and public/${platePath(WORLD_KIND)} is missing (a ${d.kind} stands in): node scripts/assets.mjs plate ${WORLD_KIND}, then --pick <n> --to public/plates --accent '${C.accent}'`);
};

/** The drawn world's colours for the film (its tone and type hold for a stand-in too). */
export const WORLD: WorldSpec = worldOf(WORLD_KIND);
/** A dark world (white type), else a pale one (ink type). */
export const DARK = WORLD.tone === 'dark';
/** The night worlds: the product's surfaces are dark glass lit by their rims, light is an event (bloom, glow pools). */
export const NIGHT = (['blackField', 'deepField', 'nightCity'] as WorldKind[]).includes(WORLD_KIND);
/** The worlds whose product surfaces are dark: the night worlds and the electric stage (dark cards on saturated blue). */
export const DARK_UI = NIGHT || WORLD_KIND === 'electric';
/** A photograph: glass over it frosts its soft copy. */
export const PLATE = isPlateWorld(WORLD_KIND);

/** The product's surfaces: kit/screens tone (light cards over a pale world or a photograph, dark ones on a night world). */
export const SCREEN_TONE: ScreenTone = DARK_UI ? 'dark' : 'light';
/** The colour behind the screens (its lightness picks the inks and the shadow). */
export const GROUND = WORLD.base;
/** The type: the world's ink, and the accent at the lightness this world needs to read. */
export const INK = WORLD.ink;
export const MUTE = WORLD.mute;
export const ACCENT = (() => {
  const [L] = toOklch(C.accent);
  if (DARK_UI && L < 0.66) return mixColor(C.accent, '#FFFFFF', 0.34); // a night world or the electric stage: lifted to read
  if (!DARK && L > 0.72) return mixColor(C.accent, C.ink, 0.3);
  return C.accent;
})();

/** The product's cards (acts/moments.tsx): kit/card's light or dark surface for this world, the brand's accent on what changed. */
const CARD_INKS = cardInks(DARK_UI ? 'dark' : 'light', GROUND, C.accent);
export const THEME: KitTheme = (() => {
  const base = kitTheme(DARK_UI ? 'inkStage' : 'tintedPaper', C.accent);
  const f = CARD_INKS.face;
  return { ...base, ground: GROUND, surface: f, raised: mixColor(f, '#FFFFFF', DARK_UI ? 0.05 : 0.6), well: DARK_UI ? mixColor(f, GROUND, 0.55) : base.well, text: CARD_INKS.text, mute: CARD_INKS.mute, line: CARD_INKS.line };
})();

/** The world's light for a 3D object (fx/three): its key read off the world's key, the light stage it reflects. */
export const LIGHT3D: Light3D = (() => {
  const k = WORLD.key;
  const azimuth = ((Math.atan2(k.x - 0.5, -(k.y - 0.5)) * 180) / Math.PI + 360) % 360; // 0 top, 90 right
  const stage = WORLD_KIND === 'blackField' ? 'black' : WORLD_KIND === 'deepField' || WORLD_KIND === 'nightCity' ? 'night' : ['clouds', 'sky', 'paleSky', 'aerial', 'sea'].includes(WORLD_KIND) ? 'sky' : 'studio';
  return { stage, azimuth, elevation: k.y > 1 ? -12 : 36 } as Light3D;
})();

/** A picture's src: a public/ path (staticFile) or a URL already resolved (src/content.ts photos are). */
export const pic = (p: string) => (/^(\/|https?:|data:|blob:)/.test(p) ? p : staticFile(p));
/** One treatment for every picture in the film: the natural grade (a touch of contrast, colour held back a little). */
export const PICTURE = { filter: 'saturate(0.92) contrast(1.04)', r: 22 } as const;
