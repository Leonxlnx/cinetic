// Sketchbook (design, preset): real materials with their faults: warm paper, a slate cutting mat under window-blind
// shadows, one dry-brush marker colour, tiles and stickers that cast short shadows, a hero word dead centre.
// Numbers: paper #F3F1EC; marker strokes 16 px at 1080 drawn over 6-12 f; hero words 120 px (Inter 600, -0.02 em);
// tiles radius 10 %, turned -25 to 25 degrees; blind shadows 8 % of the height at 32 %.
// Caution: one marker colour; the hand shows in the strokes, never in a handwriting font for statements.
// Statement sizes (share of the frame height): 5-6 words 0.07, 3-4 words 0.11, 1-2 words 0.13.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Sketchbook: Design = {
  name: 'Sketchbook',
  look: 'paper, marker and collage',
  palette: { ground: '#F3F1EC', surface: '#FFFFFF', ink: '#111111', muted: '#77736B', accent: '#FF6A1F', accentInk: '#111111', line: '#E2DED5' },
  accents: ['#2F5BFF'],
  grounds: ['warm paper #F3F1EC', 'slate cutting mat with blind shadows (CuttingMat)', 'black #000000 with a dashed grid for the night beats'],
  groundPiece: 'CuttingMat',
  type: { sizes: { long: 0.07, mid: 0.11, short: 0.13 }, font: fonts.inter, scale: { statement: 120, heading: 30, body: 22, label: 18 }, weights: { statement: 600, heading: 600, body: 400 }, tracking: '-0.02em', display: 300, case: 'sentence' },
  radii: { small: 4, card: 10, window: 12 },
  shadow: { card: 2, hero: 3 },
  stroke: { width: 0, color: 'transparent' },
  texture: 'paper',
  spacing: { margin: 120, gap: 32, pad: 30 },
  picture: { radius: 4, grade: 'saturate(1.05)' },
  moves: ['DealtStack', 'TilePop', 'CubeSplit'],
};
