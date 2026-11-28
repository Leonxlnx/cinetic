// Tray (design, preset): real-looking objects on a light grey void: a long white tray with a lit bevel, squircle sockets
// pressed into it, icons as tiles, a heavy grotesk word under a light serif lead, one hot accent on the heavy word.
// Numbers: void #DADADD; tray radius full with softShadow 5; sockets radius 22 % with an inner shadow 0 4 12 at 18 %;
// the heavy word 150 px at 1080 (Inter 700, -0.045 em), the serif lead 96 px (Newsreader 400).
// Caution: objects lit from above with soft contact shadows, never hard edges; the accent on one word only.
// Statement sizes (share of the frame height): 5-6 words 0.09, 3-4 words 0.14, 1-2 words 0.19.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Tray: Design = {
  name: 'Tray',
  look: 'tactile product objects on light',
  palette: { ground: '#DADADD', surface: '#F6F6F7', ink: '#111111', muted: '#77777C', accent: '#FF5A36', accentInk: '#FFFFFF', line: '#C9C9CE' },
  accents: ['#151515'],
  grounds: ['light grey void #DADADD', 'white #FFFFFF stage for a ring of cards'],
  type: { sizes: { long: 0.09, mid: 0.14, short: 0.19 }, font: fonts.inter, scale: { statement: 150, heading: 32, body: 24, label: 20 }, weights: { statement: 700, heading: 600, body: 400 }, tracking: '-0.045em', display: 210, second: { font: fonts.serif, role: 'the light lead line over the heavy word' }, case: 'lower', lineHeight: 0.95 },
  radii: { small: 22, card: 40, window: 48 },
  shadow: { card: 3, hero: 5 },
  stroke: { width: 0, color: 'transparent' },
  texture: 'none',
  spacing: { margin: 120, gap: 36, pad: 36 },
  picture: { radius: 40, grade: 'none' },
  moves: ['GhostFill', 'TilePop', 'LockupType'],
};
