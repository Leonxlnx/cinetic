// The sound events of the ad, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The track
// drives the ad and carries its cuts; the effects mark what lands, few enough to survive the plan's restraint (10 per
// 10 s): the name landing and the opener whole, the stack, the mark and its name, the rise, the field and the pill, the
// label and its swap, the rush, each tagline, ONE element at the lockup. Each dealt device brings its own sounds
// (src/deal.ts), so ads from this template do not sound alike.
import { E } from './lib/anim';
import { peak } from './lib/sync';
import { DEAL } from './deal';
import { ACT, copy, CUE, type Declares, DEALS, f60, type Salience, TOTAL } from './timeline';

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
  action?: string; // what the picture does (scripts/audio/actions.py: 'card-land', 'click', 'toggle' ...): kit.py cast voices each action with its own sound
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

/** What the primitives the acts use declare on purpose: the timeline's SEAMS and COLOUR cover them. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  const what = copy('what');
  // open: the opener (its device's landing), whole; the stack (dealt or fanned)
  ev.push(DEAL.open === 'land' ? { f: what.in + f60(28), kind: 'drop', weight: 0.85, pan: 0, id: 'name-lands' } : { f: what.in + f60(12), kind: 'tock', weight: 0.6, pan: -0.15, id: 'first-word-lands' });
  ev.push({ f: what.resolved, kind: 'text', weight: 0.6, pan: 0.1, id: 'opener-whole' });
  ev.push({ f: CUE.pile, kind: 'hit', weight: 0.7, pan: 0, id: 'the-stack' });
  if (DEAL.stack === 'pile') ev.push({ f: DEALS[3] + f60(2), kind: 'snap', weight: 0.45, pan: 0.15, id: 'dealt' });
  else ev.push({ f: CUE.deal + f60(14), kind: 'whoosh', weight: 0.45, pan: -0.2, dur: f60(22), apexFrac: 0.6, id: 'fanned' });
  // brand: the mark (spun or the tile grown), its name, the rise into the field
  ev.push(DEAL.brand === 'spin' ? { f: CUE.mark + f60(6), kind: 'whoosh', weight: 0.7, pan: 0, dur: f60(40), apexFrac: 0.2, id: 'spin-in' } : { f: ACT.brand.from + f60(2), kind: 'swell', weight: 0.65, pan: 0, dur: f60(30), id: 'the-tile-grows' });
  ev.push({ f: copy('brandName').in, kind: 'pop', weight: 0.7, pan: 0.15, id: 'name' });
  ev.push(across(ACT.field.from, f60(24), 0.6, 0, 'rise-into-the-field'));
  // field: the content arriving (one sound), the pill
  ev.push({ f: ACT.field.from + f60(8), kind: DEAL.field === 'ring' ? 'tock' : 'pop', weight: 0.45, pan: -0.1, id: 'the-field' });
  ev.push({ f: copy('find').in + f60(8 * (copy('find').text.trim().split(/\s+/).length - 1)) + f60(2), kind: 'pop', weight: 0.8, pan: 0.1, id: 'pill' });
  // label: the chip, the swap, the rush out
  ev.push({ f: copy('plan').in, kind: 'tick', weight: 0.5, pan: 0, id: 'label' });
  ev.push({ f: CUE.swap + f60(4), kind: 'snap', weight: 0.75, pan: 0, id: 'swap' });
  ev.push({ f: CUE.rushOut + f60(6), kind: 'riser', weight: 0.65, pan: 0, dur: ACT.taglines.from - CUE.rushOut - f60(6), apexFrac: 0.95, id: 'rush-out' });
  // taglines: the accent sweeping in (claim: its one tagline), each tagline whole
  if (DEAL.taglines === 'claim') ev.push({ f: ACT.taglines.from + f60(2), kind: 'swell', weight: 0.6, pan: -0.3, dur: f60(30), id: 'the-accent' });
  ev.push({ f: copy('tag.1').resolved, kind: 'text', weight: 0.7, pan: -0.1, id: 'tagline-1' });
  if (DEAL.taglines !== 'claim') ev.push({ f: copy('tag.2').resolved, kind: 'text', weight: 0.7, pan: 0.1, id: 'tagline-2' }); // the claim plays one
  // end: the mark (spun or risen), the lockup as ONE clean element
  ev.push(DEAL.end === 'spin' ? { f: CUE.endMark + f60(6), kind: 'whoosh', weight: 0.55, pan: 0, dur: f60(40), apexFrac: 0.2, id: 'end-spin' } : { f: CUE.endMark + f60(8), kind: 'tock', weight: 0.55, pan: -0.1, id: 'end-rise' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
