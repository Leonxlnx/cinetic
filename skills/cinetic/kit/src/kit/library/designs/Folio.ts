// Folio (design, preset): the serif as the brand's voice, set big and calm on paper grey with a faint grid, editorial
// pictures full-bleed, tool marks (corner brackets, handles) in one clay accent instead of app chrome.
// Numbers: paper #E9E9E6 with a 1 px #DEDEDA grid every 34 px; statements 100 px at 1080 (Newsreader 500), giant
// scrolling words 220-380 px; brackets 10 x 4 px bars with 4 px squares; radius 0.
// Caution: a serif only when the brand's voice is one; UI stays in Inter; never mix two serifs.
// Statement sizes (share of the frame height): 5-6 words 0.07, 3-4 words 0.09, 1-2 words 0.25.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Folio: Design = {
  name: 'Folio',
  look: 'serif voice over pictures',
  palette: { ground: '#E9E9E6', surface: '#F6F6F3', ink: '#121212', muted: '#77756F', accent: '#C8553D', accentInk: '#FFFFFF', line: '#D6D6D2' },
  accents: ['#171717'],
  grounds: ['paper grey #E9E9E6 with a faint grid (HairlineGrid, cell 0.031)', 'full-bleed editorial pictures', 'near-black #171717 for a voice panel'],
  groundPiece: 'HairlineGrid',
  type: { sizes: { long: 0.07, mid: 0.09, short: 0.25 }, font: fonts.serif, scale: { statement: 100, heading: 34, body: 24, label: 18 }, weights: { statement: 500, heading: 500, body: 400 }, tracking: '-0.01em', display: 300, second: { font: fonts.inter, role: 'UI and labels' }, case: 'sentence' },
  radii: { small: 0, card: 4, window: 4 },
  shadow: { card: 0, hero: 2 },
  stroke: { width: 0, color: 'transparent' },
  texture: 'grid',
  spacing: { margin: 140, gap: 36, pad: 34 },
  picture: { radius: 0, grade: 'contrast(1.04) saturate(0.9)' },
  moves: ['ScaleJump', 'FaceCycle', 'SelectFrame'],
};
