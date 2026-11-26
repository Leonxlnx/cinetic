// Blockprint (design, preset): flat poster fields that change by section (tangerine, cobalt, sky, black, bone), a
// grid a shade darker than the field that tilts into an isometric floor, slabs lit by their faces, lowercase words.
// Numbers: the field fills 65-98 % of the frame; grid lines 12 % darker, cells 1/6 of the height; hero words 110 px at
// 1080 one to a line, staggered; tags in mono 18 px, square-cornered; radius 0; no shadows.
// Caution: change the field by a cut or a flood, never a fade; depth from face shading only.
// Statement sizes (share of the frame height): 5-6 words 0.07, 3-4 words 0.1, 1-2 words 0.12.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Blockprint: Design = {
  name: 'Blockprint',
  look: 'flat poster fields with isometric blocks',
  palette: { ground: '#FF6B1A', surface: '#FFFFFF', ink: '#0B0B0C', muted: '#5A2A10', accent: '#0B0B0C', accentInk: '#FFFFFF', line: '#E05A12' },
  accents: ['#2340E8', '#D6E8F7', '#0B0B0C', '#F1EEE6'],
  grounds: ['tangerine field #FF6B1A', 'cobalt field #2340E8', 'sky field #D6E8F7 (type in #2D7FD0)', 'black #0B0B0C with a #1C1C1C grid', 'bone #F1EEE6'],
  groundPiece: 'IsoFloor',
  type: { sizes: { long: 0.07, mid: 0.1, short: 0.12 }, font: fonts.inter, scale: { statement: 110, heading: 34, body: 24, label: 18 }, weights: { statement: 450, heading: 500, body: 400 }, tracking: '-0.02em', display: 130, second: { font: fonts.mono, role: 'labels on square tags, as written' }, case: 'lower' },
  radii: { small: 0, card: 0, window: 0 },
  shadow: { card: 0, hero: 0 },
  stroke: { width: 0, color: 'transparent' },
  texture: 'grid',
  spacing: { margin: 96, gap: 24, pad: 28 },
  picture: { radius: 0, grade: 'contrast(1.05)' },
  moves: ['BlockBurst', 'CubeSplit', 'TileWord'],
};
