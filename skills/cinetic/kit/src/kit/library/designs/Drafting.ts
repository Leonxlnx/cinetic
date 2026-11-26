// Drafting (design, preset): a white canvas ruled by quiet hairlines, black type, and one saturated accent used only as
// a tool mark (a marker behind a word, a selection handle, a block that hops cells, one full flood).
// Numbers: ground #FFFFFF, hairlines #E5E5E5 at 1 px, cells 13 % of the height; statements 56 px at 1080 (Inter 450,
// -0.02 em), the claim on the flood 240 px; radius 0; the accent on 4-6 % of a frame, 80-98 % on its one flood.
// Caution: one accent, never two; the accent marks something (a word, a cell, a handle), it never decorates.
// Statement sizes (share of the frame height): 5-6 words 0.052, 3-4 words 0.075, 1-2 words 0.17.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Drafting: Design = {
  name: 'Drafting',
  look: 'hairline canvas, one acid accent',
  palette: { ground: '#FFFFFF', surface: '#FFFFFF', ink: '#0E0E0E', muted: '#8C8C8C', accent: '#2A4BF2', accentInk: '#FFFFFF', line: '#E5E5E5' },
  accents: ['#FF7A1F', '#F5D90A'],
  grounds: ['white #FFFFFF ruled by 1 px hairlines (HairlineGrid)', 'the accent as one full-frame flood for the claim'],
  groundPiece: 'HairlineGrid',
  type: { sizes: { long: 0.052, mid: 0.075, short: 0.17 }, font: fonts.inter, scale: { statement: 56, heading: 30, body: 24, label: 20 }, weights: { statement: 450, heading: 550, body: 400 }, tracking: '-0.02em', display: 240, case: 'sentence' },
  radii: { small: 0, card: 2, window: 4 },
  shadow: { card: 1, hero: 2 },
  stroke: { width: 1, color: '#E5E5E5' },
  texture: 'grid',
  spacing: { margin: 96, gap: 32, pad: 32 },
  picture: { radius: 0, grade: 'none' },
  moves: ['SelectFrame', 'MarkPhrase', 'BlockBurst', 'DotReveal'],
};
