// Gallery (design, preset): a magazine spread in motion: warm documentary photographs in one grade, a cream ground,
// a deep ink colour, flat pills and rounded tiles, thin white outlines drawn on the photographs, one light face.
// Numbers: cream #F2ECE3; statements 88 px at 1080 in Inter 300 (the hook), body 24 px; tiles radius 28 px, pills
// full; outlines 1.5 px white; apricot on up to a quarter of one frame; no shadows, no grain.
// Caution: one grade for every photograph; shapes echo the mark's geometry, never stickers.
// Statement sizes (share of the frame height): 5-6 words 0.045, 3-4 words 0.08, 1-2 words 0.11.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Gallery: Design = {
  name: 'Gallery',
  look: 'editorial photographs with flat colour shapes',
  palette: { ground: '#F2ECE3', surface: '#FAF6F0', ink: '#1D2B45', muted: '#6E6A62', accent: '#1D2B45', accentInk: '#F2ECE3', line: '#DDD4C6' },
  accents: ['#F59A6B', '#A9CDEB'],
  grounds: ['cream #F2ECE3', 'deep ink #1D2B45 with 1 px guides', 'full-bleed warm photographs (PhotoPlate)'],
  groundPiece: 'PhotoPlate',
  type: { sizes: { long: 0.045, mid: 0.08, short: 0.11 }, font: fonts.inter, scale: { statement: 88, heading: 34, body: 24, label: 20 }, weights: { statement: 300, heading: 400, body: 300 }, tracking: '-0.015em', display: 170, case: 'sentence' },
  radii: { small: 999, card: 28, window: 28 },
  shadow: { card: 0, hero: 0 },
  stroke: { width: 0, color: 'transparent' },
  texture: 'none',
  spacing: { margin: 120, gap: 24, pad: 36 },
  picture: { radius: 28, grade: 'sepia(0.12) saturate(0.95) contrast(1.02)' },
  moves: ['BlobMerge', 'GrowIris', 'DealtStack'],
};
