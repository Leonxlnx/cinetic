// The sound events of the reel, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The music
// carries the reel (its cuts and swaps sit on the track's drum onsets); the effects mark discrete state changes only:
// the sources popping in (thinned), the disc becoming the card, the record's fields, the cut on the kick, the
// ticker's first and last steps, the claim's two beats and its full stop, the zoom through it, the flood, the title's
// name, ONE element at the lockup.
import { BIRTHS } from './acts/Rings';
import { E } from './lib/anim';
import { phraseOnsets } from './lib/cadence';
import { peak, settleOf } from './lib/sync';
import { ACT, chainOf, copy, CUE, type Declares, f60, type Salience, TICKS, TOTAL } from './timeline';
import { REEL } from './reel';

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

/** What the primitives the acts use declare on purpose: the timeline's STEPPED covers the ticker's steps and the hops. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  const sources = copy('sources');
  // sources: the line comes to rest; every other source pops (the music carries the rest)
  ev.push({ f: settleOf(sources.in, sources.resolved, E.snapOut), kind: 'text', weight: 0.8, pan: 0, id: 'sources-said' });
  const chipAt = phraseOnsets(CUE.chips, REEL.sources.length, f60(6), { shape: 'group', seed: 'sources' }); // acts/Sources CHIP_AT
  REEL.sources.forEach((_, i) => {
    if (i % 3 === 0) ev.push({ f: chipAt[i] + f60(3), kind: 'pop', weight: 0.5, pan: Math.cos((i / REEL.sources.length) * Math.PI * 2) * 0.15, id: `source-${i}` });
  });
  // record: the disc becomes the card, its fields land, the cut on the kick
  ev.push({ f: ACT.record.from + f60(10), kind: 'swell', weight: 0.7, pan: 0, dur: f60(24), id: 'disc-to-card' });
  ev.push(across(CUE.pan, f60(40), 0.8, -0.3, 'pan'));
  ev.push({ f: CUE.rows, kind: 'tick', weight: 0.6, pan: 0.2, id: 'fields' });
  ev.push({ f: ACT.statement.from, kind: 'hit', weight: 0.9, pan: 0, id: 'cut-on-the-kick' });
  // statement: its words land
  ev.push({ f: copy('statement').resolved, kind: 'text', weight: 0.8, pan: 0, id: 'statement-said' });
  // ticker: the first step and the last (the steps between are carried by the track)
  ev.push({ f: TICKS[0], kind: 'tick', weight: 0.7, pan: 0.1, id: 'ticker-starts' });
  ev.push({ f: TICKS[TICKS.length - 1], kind: 'tick', variant: 'crisp', weight: 0.8, pan: 0.1, id: 'ticker-ends' });
  // claim: each fragment, the full stop
  chainOf('claim').forEach((c, i) => ev.push({ f: c.resolved, kind: 'text', weight: 0.9, pan: 0, id: `claim-${i + 1}` }));
  ev.push({ f: CUE.stop, kind: 'snap', weight: 0.9, pan: 0.1, id: 'full-stop' });
  ev.push(across(ACT.rings.from, f60(30), 1, 0, 'through-the-full-stop'));
  // rings: the flood
  ev.push({ f: CUE.flood + f60(8), kind: 'suck', weight: 0.7, pan: 0, dur: f60(22), apexFrac: 0.8, id: 'flood' });
  // end: the name, the lockup (one clean element)
  ev.push({ f: CUE.title, kind: 'pop', weight: 0.8, pan: -0.2, id: 'name' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: -0.1, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  if (BIRTHS.length < 2) throw new Error('sync: the transition needs its rings');
  return ev.sort((a, b) => a.f - b.f);
}
