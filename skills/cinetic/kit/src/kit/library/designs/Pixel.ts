// Pixel (design, preset): every scene reached through one screen material: dots on black (round LEDs, ring dots,
// square pixels), a halftone field on light grey, words redrawn as dot matrix; the dot pitch constant within a scene.
// Numbers: black #050505, dots 12 px apart at 1080 (0.6 of the pitch), unlit 9 % white; halftone 27 px; LED colours
// coral, yellow, cyan, white; statements 64 px at 1080 (Inter 500).
// Caution: one pitch a scene so it reads as a screen, not a filter; words through dots need weight 700 and size.
// Statement sizes (share of the frame height): 5-6 words 0.055, 3-4 words 0.06, 1-2 words 0.28.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Pixel: Design = {
  name: 'Pixel',
  look: 'screen material: pixels, dot matrix, halftone',
  palette: { ground: '#050505', surface: '#111111', ink: '#FFFFFF', muted: '#8A8A8A', accent: '#FF8A5C', accentInk: '#050505', line: '#2A2A2A' },
  accents: ['#F6EE8A', '#7FD6F0', '#FFFFFF'],
  grounds: ['black #050505 with a dot lattice (DotLattice)', 'light grey #E6E6E6 halftone field (HalftoneField)'],
  groundPiece: 'DotLattice',
  type: { sizes: { long: 0.055, mid: 0.06, short: 0.28 }, font: fonts.inter, scale: { statement: 64, heading: 28, body: 22, label: 16 }, weights: { statement: 500, heading: 550, body: 400 }, tracking: '-0.01em', display: 300, second: { font: fonts.mono, role: 'coordinates on tracked things' }, case: 'sentence' },
  radii: { small: 6, card: 10, window: 12 },
  shadow: { card: 0, hero: 0 },
  stroke: { width: 1, color: '#2A2A2A' },
  texture: 'dots',
  spacing: { margin: 120, gap: 28, pad: 28 },
  picture: { radius: 10, grade: 'contrast(1.1) saturate(1.1)' },
  moves: ['DotWord', 'LightWord', 'DotScreen', 'DotReveal'],
};
