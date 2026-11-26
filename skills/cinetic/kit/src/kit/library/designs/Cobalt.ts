// Cobalt (design, preset): one saturated ultramarine as the whole ground, faint concentric arcs on it, white glass
// cards with a hairline rim, big Title Case headlines in a round grotesk, one warm colour inside pictures only.
// Numbers: ground #2140D9 flat; glass white at 14 % with a 1 px white 25 % rim, radius 22 px, a deep soft shadow
// (softShadow 5); headlines 140 px at 1080 (cap 10 % of the height, Inter 400); UI 26 px.
// Caution: keep the blue flat (no lighter centre, no glow at the foot); white on blue needs weight 400 or more.
// Statement sizes (share of the frame height): 5-6 words 0.085, 3-4 words 0.13, 1-2 words 0.22.
// Catalogue: ../catalog/design.ts; tokens and use: references/library-designs.md.
import { fonts } from '../../fonts';
import type { Design } from './_shared';

export const Cobalt: Design = {
  name: 'Cobalt',
  look: 'saturated blue field',
  palette: { ground: '#2140D9', surface: 'rgba(255,255,255,0.14)', ink: '#FFFFFF', muted: 'rgba(255,255,255,0.72)', accent: '#FFFFFF', accentInk: '#2140D9', line: 'rgba(255,255,255,0.25)' },
  accents: ['#FF6A2B'],
  grounds: ['ultramarine #2140D9 with concentric arcs (CobaltArcs)', 'white #FFFFFF title cards', 'near-black #05070F for input scenes'],
  groundPiece: 'CobaltArcs',
  type: { sizes: { long: 0.085, mid: 0.13, short: 0.22 }, font: fonts.inter, scale: { statement: 140, heading: 34, body: 26, label: 20 }, weights: { statement: 400, heading: 500, body: 400 }, tracking: '-0.025em', display: 240, case: 'title' },
  radii: { small: 999, card: 22, window: 28 },
  shadow: { card: 5, hero: 6 },
  stroke: { width: 1, color: 'rgba(255,255,255,0.25)' },
  texture: 'none',
  spacing: { margin: 120, gap: 32, pad: 34 },
  picture: { radius: 22, grade: 'saturate(1.05)' },
  moves: ['NoticePile', 'FeedRush', 'VelocityCut'],
};
