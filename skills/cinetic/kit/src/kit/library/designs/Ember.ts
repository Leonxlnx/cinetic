// Ember (design, preset): pure black and one warm light with a visible source (the rim of a planet, a lit disc), white
// type, dark-glass chips with a hairline edge, amber on the key words.
// Numbers: ground #000000; chips #141414 with a 1 px edge at 12 % white, radius 28 % of their height, a soft deep
// shadow; statements 80 px at 1080 (Inter 550, -0.02 em); the warm accent on 2-4 % of a frame, up to 20 % on its light.
// Caution: the light must belong to an object; a glow on its own over black reads as cheap.
// Statement sizes (share of the frame height): 5-6 words 0.055, 3-4 words 0.075, 1-2 words 0.1.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Ember: Design = {
  name: 'Ember',
  look: 'black stage, one warm light, dark glass',
  palette: { ground: '#000000', surface: '#141414', ink: '#FFFFFF', muted: '#9A9A9A', accent: '#F07A32', accentInk: '#FFFFFF', line: 'rgba(255,255,255,0.12)' },
  accents: ['#F2B46E'],
  grounds: ['black #000000', 'a planet rising from the foot with a peach rim (PlanetRim)'],
  groundPiece: 'PlanetRim',
  type: { sizes: { long: 0.055, mid: 0.075, short: 0.1 }, font: fonts.inter, scale: { statement: 80, heading: 30, body: 24, label: 20 }, weights: { statement: 550, heading: 550, body: 500 }, tracking: '-0.02em', display: 104, case: 'sentence' },
  radii: { small: 14, card: 18, window: 24 },
  shadow: { card: 4, hero: 6 },
  stroke: { width: 1, color: 'rgba(255,255,255,0.12)' },
  texture: 'none',
  spacing: { margin: 120, gap: 32, pad: 32 },
  picture: { radius: 18, grade: 'saturate(0.9) brightness(0.92)' },
  moves: ['RiseLine', 'Bloom', 'ChipBloom'],
};
