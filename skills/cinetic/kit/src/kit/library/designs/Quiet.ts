// Quiet (design, preset): a white (or neutral grey) stage with one sentence on the centre line, pictures and chips set
// inside the line, light product UI with soft shadows, one blue for the key word.
// Numbers: ground #FFFFFF (or #EDEDED); the line 60 px at 1080 (Inter 500, -0.01 em), measured 4.5-6 % of the height;
// pills full radius with a #E6E6E6 hairline; cards radius 20 px, softShadow 2; the accent under 1 % of the frame.
// Caution: the build of the line is the show: re-centre it as words land; nothing else on the stage.
// Statement sizes (share of the frame height): 5-6 words 0.05, 3-4 words 0.056, 1-2 words 0.16.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Quiet: Design = {
  name: 'Quiet',
  look: 'quiet white stage, one line',
  palette: { ground: '#FFFFFF', surface: '#FFFFFF', ink: '#111111', muted: '#8E8E93', accent: '#3355F0', accentInk: '#FFFFFF', line: '#E6E6E6' },
  accents: ['#EDEDED'],
  grounds: ['white #FFFFFF', 'neutral grey #EDEDED', 'a full-frame photograph at the reveal only'],
  type: { sizes: { long: 0.05, mid: 0.056, short: 0.16 }, font: fonts.inter, scale: { statement: 60, heading: 28, body: 22, label: 18 }, weights: { statement: 500, heading: 550, body: 400 }, tracking: '-0.01em', display: 170, case: 'sentence' },
  radii: { small: 999, card: 20, window: 24 },
  shadow: { card: 2, hero: 4 },
  stroke: { width: 1, color: '#ECECEC' },
  texture: 'none',
  spacing: { margin: 160, gap: 40, pad: 32 },
  picture: { radius: 24, grade: 'none' },
  moves: ['InkLine', 'ScaleJump', 'PromptAnswer'],
};
