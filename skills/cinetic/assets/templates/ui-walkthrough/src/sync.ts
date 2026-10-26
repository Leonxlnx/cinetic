// The sound events of the walkthrough, computed from the picture code. scripts/export-cues.ts calls the default
// export and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame.
// The music carries the film; the effects mark the product's discrete state changes (a card landing, a row checking,
// a notice arriving, a key, a press, a count locking, a choice), one soft text sound per line as it comes to rest,
// three whooshes on the moves that carry the film (the hidden cut, the two whips) and ONE element at the lockup.
import { TOASTS } from './acts/Proof';
import { typedKeys } from './acts/Field';
import { COUNT } from './acts/Feed';
import { stackFrames } from './fx/Stack';
import { E } from './lib/anim';
import { peak, settleOf } from './lib/sync';
import { ACT, copy, CUE, type Declares, f60, FPS, type Salience, TOTAL } from './timeline';

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
/** A move peaking on frame `at` (a cut taken on the fastest frame): a whoosh as long as the move, its apex on the peak. */
const across = (at: number, dur: number, weight: number, pan: number, id: string): SoundEvent => {
  const from = at - dur / 2;
  const to = at + dur / 2;
  const apex = peak(from, to, E.strongInOut);
  return { f: apex, kind: 'whoosh', weight, pan, dur: Math.max(f60(18), dur), apexFrac: (apex - from) / (to - from), id };
};
/** One soft text sound as a line comes to rest (the house reveal on E.snapOut). */
const said = (id: string, pan = -0.2): SoundEvent => {
  const c = copy(id);
  return { f: settleOf(c.in, c.resolved, E.snapOut), kind: 'text', weight: 0.8, pan, id: `${id}-said` };
};

/** What the primitives the acts use declare on purpose: the timeline's STEPPED covers the three designed steps. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // open: the promise snaps larger on its last word
  ev.push({ f: CUE.snap, kind: 'snap', weight: 0.9, pan: 0, id: 'promise-snaps' });
  // card: the input lands, the hidden cut, the output's title, three rows and their checks
  ev.push({ f: CUE.rise + f60(10), kind: 'land', weight: 0.8, pan: 0, id: 'card-lands' });
  ev.push(across(CUE.jump, f60(30), 1, 0, 'input-becomes-output'));
  ev.push(said('promise', 0));
  ['row1', 'row2', 'row3'].forEach((r, i) => ev.push({ f: CUE[r], kind: 'tick', weight: 0.6, pan: -0.1, id: `step-${i + 1}` }));
  ['done1', 'done2', 'done3'].forEach((r, i) => ev.push({ f: CUE[r], kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.1, id: `check-${i + 1}` }));
  // proof: each notice on its arrival's 50 % frame
  stackFrames({ arrivals: TOASTS }, { fps: FPS }).forEach((s, i) => ev.push({ f: s.at + f60(2), kind: 'pop', weight: 0.55 + 0.08 * i, pan: 0.05, id: `notice-${i + 1}` }));
  // claim: the snap out to the line, the line read in the quiet
  ev.push({ f: CUE.claimSnap, kind: 'snap', weight: 0.9, pan: 0, id: 'claim-opens' });
  ev.push(said('claim'));
  // field: the line, the keys (one in four), the press, the first result
  ev.push(said('step1'));
  typedKeys().filter((_, i) => i % 4 === 0).forEach((f, i) => ev.push({ f, kind: 'key', weight: 0.5, pan: 0.1, id: `key-${i}` }));
  ev.push({ f: CUE.press, kind: 'click', weight: 1, pan: 0.2, id: 'press' });
  ev.push({ f: CUE.develop + f60(4), kind: 'pop', weight: 0.6, pan: -0.1, id: 'results' });
  ev.push(across(ACT.feed.from, f60(26), 0.9, 0, 'whip-up'));
  // feed: the count locks on its total, the flick lands on the item
  const lock = COUNT[COUNT.length - 1];
  ev.push({ f: CUE.land, kind: 'land', weight: 0.7, pan: 0, id: 'feed-lands' });
  ev.push({ f: lock.at, kind: 'tick', variant: 'crisp', weight: 0.9, pan: 0.1, id: 'count-locks' });
  // insight: the chip, the line
  ev.push({ f: CUE.chip + f60(3), kind: 'pop', weight: 0.8, pan: 0.15, id: 'chip' });
  ev.push(said('insight'));
  ev.push(across(ACT.pick.from, f60(26), 0.9, -0.3, 'whip-left'));
  // pick: the line, the choice, the pill
  ev.push(said('pick'));
  ev.push({ f: CUE.chosen, kind: 'click', variant: 'confirm', weight: 1, pan: 0, id: 'chosen' });
  ev.push({ f: CUE.toPill + f60(14), kind: 'snap', weight: 0.8, pan: 0, id: 'pill' });
  // page: it lands flat
  ev.push({ f: CUE.pageLand, kind: 'land', weight: 0.9, pan: 0, id: 'page-lands' });
  // end: the lockup is one clean element; the payoff is read in near-silence
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: -0.2, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
