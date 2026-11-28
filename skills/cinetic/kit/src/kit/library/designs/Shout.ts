// Shout (design, preset): type as image: a tight heavy grotesk set so close the lines overlap and cropped by the frame,
// tiny type parked in corners for scale, flat tags turned -3 degrees, one red flood, a graph grid under it all.
// Numbers: white #FFFFFF with a #E8E8EC grid every 30 px; statements 200 px at 1080 (Inter 700, -0.055 em, leading
// 0.86); tags 1.3 em tall, radius 0; the red on up to 74 % of the frame on its flood.
// Caution: crop by the frame, never by a box; one giant line at a time, the small type stays small.
// Statement sizes (share of the frame height): 5-6 words 0.12, 3-4 words 0.185, 1-2 words 0.21.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Shout: Design = {
  name: 'Shout',
  look: 'loud poster type',
  palette: { ground: '#FFFFFF', surface: '#FFFFFF', ink: '#0A0A0A', muted: '#6A6A6A', accent: '#E8322B', accentInk: '#FFFFFF', line: '#E8E8EC' },
  accents: ['#0A0A0A'],
  grounds: ['white with a graph grid (HairlineGrid, cell 0.028)', 'red flood #E8322B', 'black #0A0A0A'],
  groundPiece: 'HairlineGrid',
  type: { sizes: { long: 0.12, mid: 0.185, short: 0.21 }, font: fonts.inter, scale: { statement: 200, heading: 34, body: 22, label: 18 }, weights: { statement: 700, heading: 600, body: 400 }, tracking: '-0.055em', display: 230, case: 'sentence', lineHeight: 0.86 },
  radii: { small: 0, card: 0, window: 0 },
  shadow: { card: 0, hero: 0 },
  stroke: { width: 2, color: '#0A0A0A' },
  texture: 'grid',
  spacing: { margin: 64, gap: 24, pad: 28 },
  picture: { radius: 0, grade: 'contrast(1.05)' },
  moves: ['ScaleJump', 'BarStack', 'PushApart'],
};
