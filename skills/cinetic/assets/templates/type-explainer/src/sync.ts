// The sound events of the explainer, computed from the picture code. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. A calm
// track carries the film and its cuts (the cuts get nothing: the track's downbeats are on them); the effects mark the
// story's own moments, so they survive the plan's restraint (10 per 10 s): the name landing, the mark arriving as a
// word, each line once it is whole, the product opening in the line and becoming the shot, the name over it, the seam
// off the product, the parts' wave (one sound), the three parts read, the gather, the name and ONE element at the
// lockup. Each dealt device brings its own sounds (src/deal.ts), so films from this template do not sound alike.
import { bornAt, cells } from './acts/Grid';
import { ROLLS } from './acts/Promise';
import { DEAL } from './deal';
import { ACT, copy, CUE, type Declares, f60, LABELS, type Salience, TOTAL } from './timeline';

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

/** What the primitives the acts use declare on purpose: the timeline's SEAMS and COLOUR cover them. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // open: the name (its device's sound), the mark arriving as a word, what it is said
  if (DEAL.open === 'band') ev.push({ f: CUE.giant + f60(10), kind: 'drop', weight: 0.85, pan: 0, id: 'name-lands' });
  else if (DEAL.open === 'focus') ev.push({ f: CUE.giant, kind: 'swell', weight: 0.7, pan: 0, dur: f60(36), id: 'name-focuses' });
  else ev.push({ f: CUE.giant + f60(6), kind: 'key', weight: 0.6, pan: -0.1, id: 'name-set' });
  ev.push({ f: CUE.mark + f60(2), kind: 'pop', weight: 0.75, pan: 0.2, id: 'mark-as-a-word' });
  if (DEAL.open === 'push') ev.push({ f: CUE.what - f60(4), kind: 'whoosh', weight: 0.5, pan: 0, dur: f60(30), apexFrac: 0.85, id: 'push-through-the-name' });
  ev.push({ f: copy('what').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'what-said' });
  // pain: the line whole; its device's move
  if (DEAL.pain !== 'land') ev.push({ f: copy('pain').resolved, kind: 'text', weight: 0.65, pan: 0.1, id: 'pain-said' });
  if (DEAL.pain === 'land') ev.push({ f: CUE.pain + f60(30), kind: 'land', weight: 0.55, pan: 0, id: 'the-line-lands' });
  if (DEAL.pain === 'push') ev.push({ f: CUE.painPush + f60(14), kind: 'whoosh', weight: 0.4, pan: 0, dur: f60(40), apexFrac: 0.3, id: 'push-through-the-line' });
  if (DEAL.pain === 'crowd') ev.push({ f: CUE.pain + f60(10), kind: 'tock', weight: 0.45, pan: -0.2, id: 'the-tools-arrive' });
  // promise: the slot opening (and rolling), the line whole, the product becoming the shot
  ev.push({ f: CUE.pill + f60(2), kind: 'pop', weight: 0.7, pan: 0, id: 'the-product-opens' });
  if (DEAL.promise === 'roll') ROLLS.forEach((f, i) => ev.push({ f: Math.round(f), kind: 'tick', weight: 0.4, pan: 0.05 * (i + 1), id: `roll-${i + 1}` }));
  ev.push({ f: copy('promise').resolved, kind: 'text', weight: 0.7, pan: 0.1, id: 'promise-said' });
  ev.push(DEAL.promise === 'lens' ? { f: ACT.picture.from, kind: 'suck', weight: 0.7, pan: 0, dur: ACT.picture.from - CUE.grow, apexFrac: 0.95, id: 'through-the-word' } : { f: ACT.picture.from, kind: 'swell', weight: 0.75, pan: 0, dur: f60(40), id: 'the-product-is-the-shot' });
  // picture: the name over the product
  ev.push({ f: CUE.title, kind: 'pop', weight: 0.75, pan: -0.1, id: 'name-on-the-product' });
  // system: the seam off the product, the line whole, the float off
  if (DEAL.system === 'push') {
    // the push-wipe: the edge arriving and pushing the product along, then leaving at speed on the second half
    ev.push({ f: CUE.wipe + f60(8), kind: 'whoosh', weight: 0.5, pan: -0.3, dur: f60(30), apexFrac: 0.3, id: 'the-push-wipe' });
    ev.push({ f: CUE.system2 + f60(12), kind: 'whoosh', weight: 0.5, pan: 0.4, dur: f60(26), apexFrac: 0.8, id: 'the-edge-leaves' });
  } else ev.push({ f: CUE.wipe + f60(10), kind: 'whoosh', weight: DEAL.system === 'sheet' ? 0.55 : 0.6, pan: -0.4, dur: f60(28), apexFrac: 0.4, id: DEAL.system === 'sheet' ? 'the-sheet' : 'the-one-wipe' });
  ev.push({ f: copy('system').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'system-said' });
  // grid: the parts' wave as one sound, the three read, the gather
  const born = cells().filter((c) => c.module >= 0).map((c) => Math.round(bornAt(c)));
  ev.push({ f: Math.min(...born) + f60(4), kind: DEAL.grid === 'ring' ? 'tock' : 'pop', weight: 0.55, pan: 0, id: 'the-parts-arrive' });
  LABELS.forEach((f, i) => ev.push({ f, kind: 'tick', weight: 0.55, pan: [-0.2, 0.2, 0][i], id: `part-read-${i + 1}` }));
  ev.push({ f: CUE.gather + f60(20), kind: 'suck', weight: 0.55, pan: 0, dur: f60(22), apexFrac: 0.8, id: 'parts-gather' });
  // end: the name, the lockup (one clean element)
  if (DEAL.end === 'claim') ev.push({ f: ACT.end.from + f60(6), kind: 'swell', weight: 0.6, pan: 0, dur: f60(36), id: 'the-accent-floods' });
  ev.push({ f: CUE.name, kind: 'pop', weight: 0.75, pan: -0.2, id: 'name' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
