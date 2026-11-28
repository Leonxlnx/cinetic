// Frost (design, preset): glass panels that are a material of the world: a photograph or footage as the ground, a
// frosted pill or panel over it that shows the picture through, white type, a black round send button.
// Numbers: glass white at 16 % with a 20 px backdrop blur and a 1 px white 30 % rim; the pill 6 % of the height tall,
// full radius; panels radius 30 px; statements 64 px at 1080 (Inter 500); light grain on the footage only.
// Caution: the picture is the ground, never a pastel gradient field; keep the type off busy parts of the picture.
// Statement sizes (share of the frame height): 5-6 words 0.05, 3-4 words 0.06, 1-2 words 0.12.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Frost: Design = {
  name: 'Frost',
  look: 'glass panels over photographs',
  palette: { ground: '#1B2530', surface: 'rgba(255,255,255,0.16)', ink: '#FFFFFF', muted: 'rgba(255,255,255,0.74)', accent: '#0E0E10', accentInk: '#FFFFFF', line: 'rgba(255,255,255,0.3)' },
  accents: ['#FFFFFF'],
  grounds: ['a photograph or aerial footage (PhotoPlate)', 'deep slate #1B2530 between pictures'],
  groundPiece: 'PhotoPlate',
  type: { sizes: { long: 0.05, mid: 0.06, short: 0.12 }, font: fonts.inter, scale: { statement: 64, heading: 30, body: 22, label: 18 }, weights: { statement: 500, heading: 500, body: 400 }, tracking: '-0.015em', display: 150, case: 'sentence' },
  radii: { small: 999, card: 30, window: 32 },
  shadow: { card: 3, hero: 5 },
  stroke: { width: 1, color: 'rgba(255,255,255,0.3)' },
  texture: 'grain',
  spacing: { margin: 120, gap: 32, pad: 34 },
  picture: { radius: 30, grade: 'saturate(0.9)' },
  moves: ['WindowOpen', 'PromptAnswer', 'GrowIris'],
};
