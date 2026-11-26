// Nightdesk (design, preset): a black drafting table: dashed rules, square ticks at the crossings, a thin partial ring,
// white type, tiny data labels at the grid's corners and one signal colour that means "this one".
// Numbers: ground #050506, rules #303238 1 px dashed 6/6, cells 22 % of the height, ticks 3 px; statements 72 px at
// 1080 (Geist 500); labels 16 px; the signal on under 3 % of the frame; radius 0; no shadows.
// Caution: labels in sentence case or as written, never tracked capitals; one signal colour.
// Statement sizes (share of the frame height): 5-6 words 0.055, 3-4 words 0.067, 1-2 words 0.12.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Nightdesk: Design = {
  name: 'Nightdesk',
  look: 'dark technical, ticks and rules',
  palette: { ground: '#050506', surface: '#0E0F11', ink: '#F2F2F2', muted: '#8A8C92', accent: '#FFB020', accentInk: '#0B0B0C', line: '#303238' },
  accents: ['#3A5BFF'],
  grounds: ['black #050506 with dashed rules and ticks (TechGrid)', 'graded documentary footage behind corner-ticked photos'],
  groundPiece: 'TechGrid',
  type: { sizes: { long: 0.055, mid: 0.067, short: 0.12 }, font: fonts.geist, scale: { statement: 72, heading: 28, body: 22, label: 16 }, weights: { statement: 500, heading: 500, body: 400 }, tracking: '-0.01em', display: 130, second: { font: fonts.mono, role: 'coordinates and data labels at the grid corners' }, case: 'sentence' },
  radii: { small: 0, card: 0, window: 2 },
  shadow: { card: 0, hero: 0 },
  stroke: { width: 1, color: 'rgba(255,255,255,0.22)' },
  texture: 'grid',
  spacing: { margin: 96, gap: 28, pad: 28 },
  picture: { radius: 0, grade: 'contrast(1.08) saturate(0.85)' },
  moves: ['ScrambleType', 'GlitchCut', 'TrackOverlay'],
};
