// The sound events of the walkthrough, computed from the picture code. scripts/export-cues.ts calls the default
// export and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame.
// The music carries the film; the effects mark the product's discrete state changes (a card landing, a row checking,
// a result arriving, a key, a press, a count locking, a choice), one soft text sound per line as it comes to rest,
// a whoosh on each move that carries the film across an act line, and ONE element at the lockup.
import { proofHits } from './acts/Proof';
import { typedKeys } from './acts/Field';
import { COUNT } from './acts/Feed';
import { DEAL } from './deal';
import { E } from './lib/anim';
import { peak, settleOf } from './lib/sync';
import { ACT, copy, CUE, type Declares, f60, type Salience, TOTAL } from './timeline';

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
/** A move peaking on frame `at` (a cut taken on the fastest frame): a whoosh as long as the move, its apex on the peak. */
const across = (at: number, dur: number, weight: number, pan: number, id: string): SoundEvent => {
  const from = at - dur / 2;
  const to = at + dur / 2;
  const apex = peak(from, to, E.strongInOut);
  return { f: apex, kind: 'whoosh', weight, pan, dur: Math.max(f60(18), dur), apexFrac: (apex - from) / (to - from), id };
};
/** One soft text sound as a line comes to rest (the crisp entry settles like E.snapOut). */
const said = (id: string, pan = -0.2): SoundEvent => {
  const c = copy(id);
  return { f: settleOf(c.in, c.resolved, E.snapOut), kind: 'text', weight: 0.8, pan, id: `${id}-said` };
};

/** What the primitives the acts use declare on purpose: nothing (every move in the template is continuous). */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // open: the promise comes to rest; the launch into the card
  ev.push(said('promise', 0));
  ev.push(across(ACT.card.from, f60(28), 0.7, 0, 'promise-launches'));
  // card: the card settles on its turn, the transformation, three rows and their checks, the push into the card
  ev.push({ f: CUE.rise + f60(18), kind: 'land', weight: 0.7, pan: 0, id: 'card-lands' });
  ev.push(
    DEAL.turn === 'sheen'
      ? { f: CUE.swap + f60(10), kind: 'swell', weight: 0.7, pan: 0, dur: f60(34), id: 'input-becomes-output' }
      : across(CUE.swap + f60(22), f60(30), 0.8, DEAL.turn === 'slide' ? -0.3 : 0, 'input-becomes-output'),
  );
  ['row1', 'row2', 'row3'].forEach((r, i) => ev.push({ f: CUE[r] + f60(4), kind: 'tick', weight: 0.55, pan: -0.1, id: `step-${i + 1}` }));
  ['done1', 'done2', 'done3'].forEach((r, i) => ev.push({ f: CUE[r], kind: 'click', variant: 'confirm', weight: 0.75, pan: 0.1, id: `check-${i + 1}` }));
  ev.push(across(ACT.proof.from, f60(26), 0.8, 0, 'into-the-card'));
  // proof: each result as it lands
  proofHits().forEach((f, i) => ev.push({ f, kind: 'pop', weight: 0.5 + 0.08 * i, pan: 0.05, id: `notice-${i + 1}` }));
  // claim: the line read in the quiet, the push through it into the field
  ev.push(said('claim'));
  ev.push(across(ACT.field.from, f60(28), 0.8, 0, 'through-the-claim'));
  // field: the line, the keys (one in four), the press, the first result, the whip up
  ev.push(said('step1'));
  typedKeys().filter((_, i) => i % 4 === 0).forEach((f, i) => ev.push({ f, kind: 'key', weight: 0.5, pan: 0.1, id: `key-${i}` }));
  ev.push({ f: CUE.press, kind: 'click', weight: 1, pan: 0.2, id: 'press' });
  ev.push({ f: CUE.develop + f60(8), kind: 'pop', weight: 0.6, pan: -0.1, id: 'results' });
  ev.push(across(ACT.feed.from, f60(26), 0.9, 0, 'whip-up'));
  // feed: the count locks on its total, the read lands on the item
  const lock = COUNT[COUNT.length - 1];
  ev.push({ f: CUE.land, kind: 'land', weight: 0.7, pan: 0, id: 'read-lands' });
  ev.push({ f: lock.at, kind: 'tick', variant: 'crisp', weight: 0.8, pan: 0.1, id: 'count-locks' });
  // insight: the chip, the line, the whip left
  ev.push({ f: CUE.chip + f60(6), kind: 'pop', weight: 0.75, pan: 0.15, id: 'chip' });
  ev.push(said('insight'));
  ev.push(across(ACT.pick.from, f60(26), 0.9, -0.3, 'whip-left'));
  // pick: the line, the choice, the head settling
  ev.push(said('pick'));
  ev.push({ f: CUE.chosen, kind: 'click', variant: 'confirm', weight: 1, pan: 0, id: 'chosen' });
  ev.push({ f: CUE.toPill + f60(24), kind: 'land', weight: 0.6, pan: 0, id: 'head' });
  // page: it lands
  ev.push({ f: CUE.pageLand + f60(10), kind: 'land', weight: 0.85, pan: 0, id: 'page-lands' });
  // end: the lockup is one clean element; the payoff is read in near-silence
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: -0.2, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
