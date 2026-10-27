// The sound events of the ad, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The track
// drives the ad; the effects mark what lands: each word of the opener, the pile (thinned), the mark's spin and the
// name, the rise, the pill, the rivers rushing out, the swap, each tagline, the lockup.
import { E } from './lib/anim';
import { peak } from './lib/sync';
import { ACT, buildStarts, copy, CUE, type Declares, DEALS, f60, type Salience, TOTAL } from './timeline';
import { AD } from './ad';

export type Kind =
  | 'tick' | 'tock' | 'hit' | 'land' | 'pop' | 'whoosh' | 'riser'
  | 'drop' | 'key' | 'click' | 'snap' | 'swell' | 'bell' | 'suck' | 'text';

export type SoundEvent = {
  f: number;
  kind: Kind;
  weight?: number;
  pan?: number;
  pitch?: number | string;
  apexFrac?: number;
  dur?: number;
  variant?: string;
  id?: string;
  structural?: true;
  force?: true;
  offset_ms?: number;
  salience?: Salience;
};

const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';
/** A move peaking on frame `at`: a whoosh as long as the move, its apex on the peak. */
const across = (at: number, dur: number, weight: number, pan: number, id: string): SoundEvent => {
  const from = at - dur / 2;
  const to = at + dur / 2;
  const apex = peak(from, to, E.strongInOut);
  return { f: apex, kind: 'whoosh', weight, pan, dur: Math.max(f60(18), dur), apexFrac: (apex - from) / (to - from), id };
};

/** What the primitives the acts use declare on purpose: the timeline's SEAMS cover them. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // open: each word of the opener lands; the pile is dealt (every other card)
  buildStarts(CUE.what, AD.lines.what.trim().split(/\s+/).length).forEach((f, i) => ev.push({ f, kind: i ? 'tick' : 'drop', weight: i ? 0.55 : 0.9, pan: -0.2 + 0.12 * i, id: `word-${i + 1}` }));
  ev.push({ f: CUE.pile, kind: 'hit', weight: 0.7, pan: 0, id: 'pile' });
  DEALS.forEach((f, i) => {
    if (i % 2 === 1) ev.push({ f: f + f60(2), kind: 'snap', weight: 0.45, pan: 0.15, id: `deal-${i}` });
  });
  // brand: the cut, the spin, the name, the rise into the wall
  ev.push({ f: ACT.brand.from, kind: 'hit', weight: 0.8, pan: 0, id: 'cut-to-the-mark' });
  ev.push({ f: CUE.mark + f60(6), kind: 'whoosh', weight: 0.7, pan: 0, dur: f60(40), apexFrac: 0.2, id: 'spin-in' });
  ev.push({ f: copy('brandName').in, kind: 'pop', weight: 0.7, pan: 0.15, id: 'name' });
  ev.push(across(ACT.wall.from, f60(24), 0.7, 0, 'rise-into-the-wall'));
  // wall: the pill; the wall leaves up
  ev.push({ f: copy('find').resolved - f60(4), kind: 'pop', weight: 0.8, pan: 0.1, id: 'pill' });
  ev.push(across(ACT.rivers.from, f60(24), 0.6, 0, 'wall-leaves'));
  // rivers: the label, the swap, the rush out
  ev.push({ f: copy('plan').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'label' });
  ev.push({ f: CUE.swap, kind: 'snap', weight: 0.8, pan: 0, id: 'swap' });
  ev.push({ f: CUE.rushOut + f60(10), kind: 'riser', weight: 0.7, pan: 0, dur: ACT.taglines.from - CUE.rushOut - f60(10), apexFrac: 0.95, id: 'rush-out' });
  // taglines: the hero, each tagline
  ev.push({ f: ACT.taglines.from, kind: 'swell', weight: 0.7, pan: 0, dur: f60(48), id: 'hero' });
  ev.push({ f: copy('tag.1').resolved, kind: 'text', weight: 0.7, pan: -0.1, id: 'tagline-1' });
  ev.push({ f: copy('tag.2').resolved, kind: 'text', weight: 0.7, pan: 0.1, id: 'tagline-2' });
  // end: the spin, the lockup
  ev.push({ f: CUE.endMark + f60(6), kind: 'whoosh', weight: 0.6, pan: 0, dur: f60(40), apexFrac: 0.2, id: 'end-spin' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
