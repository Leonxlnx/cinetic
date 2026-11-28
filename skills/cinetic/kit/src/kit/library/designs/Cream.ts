// Cream (design, preset): a warm cream ground, calm grotesk statements on the midline, a text serif for the greeting
// and the wordmark, a faithful light UI at a calm size, one earthy accent, two faint hairline circles turning.
// Numbers: cream #F4F1EA; statements 48 px at 1080 (Inter 420, cap 3.2 % of the height), greeting serif 64 px; input
// box radius 14 px with a 1 px #E6E3DE edge and softShadow 1; the accent on the send button and the mark only.
// Caution: the serif for one role (greeting, wordmark), never the statements; no full stops on the lines.
// Statement sizes (share of the frame height): 5-6 words 0.044, 3-4 words 0.05, 1-2 words 0.08.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Cream: Design = {
  name: 'Cream',
  look: 'warm cream assistant',
  palette: { ground: '#F4F1EA', surface: '#FFFFFF', ink: '#1A1917', muted: '#8C877E', accent: '#A8432A', accentInk: '#FFFFFF', line: '#E6E1D8' },
  accents: ['#14121B'],
  grounds: ['cream #F4F1EA with two hairline circles (OrbitLines)', 'white #FFFFFF for the chat view'],
  groundPiece: 'OrbitLines',
  type: { sizes: { long: 0.044, mid: 0.05, short: 0.08 }, font: fonts.inter, scale: { statement: 48, heading: 30, body: 22, label: 18 }, weights: { statement: 420, heading: 450, body: 400 }, tracking: '-0.01em', second: { font: fonts.serif, role: 'the greeting and the wordmark' }, case: 'sentence' },
  radii: { small: 10, card: 14, window: 18 },
  shadow: { card: 1, hero: 3 },
  stroke: { width: 1, color: '#E6E3DE' },
  texture: 'none',
  spacing: { margin: 160, gap: 32, pad: 30 },
  picture: { radius: 14, grade: 'none' },
  moves: ['RiseLine', 'Pointer', 'WindowOpen'],
};
