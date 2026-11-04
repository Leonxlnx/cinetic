// The sound events of the demo, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The track
// carries the demo; the effects mark the product's state changes, few and in story order: the label landing, the kick
// (the tools leaving or docking: one event for all of them), the way into the box, the punch-in, the send (marked
// `story` so restraint never drops it), the whip, the checks, the result, ONE element at the lockup. Each device of the
// deal (src/deal.ts) keeps the cues; only the kind of an event changes where its device moves differently.
import { E } from './lib/anim';
import { peak } from './lib/sync';
import { ACT, copy, CUE, DEAL, type Declares, f60, type Salience, STEPS, TOTAL } from './timeline';
import { RUN } from './run';

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

/** What the primitives the acts use declare on purpose: the timeline's SEAMS and COLOUR cover them (no stepped runs). */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // pill: the label landing, the kick (the tools leaving, docking or the wall falling back), the wind-up
  ev.push({ f: copy('what').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'label' });
  ev.push({ f: CUE.kick, kind: 'hit', weight: 0.9, pan: 0, id: 'kick' });
  if (DEAL.open === 'dock') ev.push({ f: CUE.kick + f60(26), kind: 'land', weight: 0.6, pan: -0.2, id: 'tools-dock' });
  else if (DEAL.open === 'ring') ev.push({ f: CUE.kick + f60(10), kind: 'whoosh', weight: 0.5, pan: 0.2, dur: f60(26), apexFrac: 0.8, id: 'tools-fly-off' });
  ev.push({ f: CUE.windup, kind: 'riser', weight: 0.5, pan: 0, dur: ACT.ask.from - CUE.windup, apexFrac: 0.95, id: 'wind-up' });
  // ask: the iris (or the stretch), the line, the typing
  ev.push(DEAL.ask === 'iris' ? { f: ACT.ask.from, kind: 'swell', weight: 0.8, pan: 0, dur: f60(40), id: 'iris' } : { f: ACT.ask.from + f60(6), kind: 'whoosh', weight: 0.5, pan: 0, dur: f60(36), apexFrac: 0.4, id: 'stretch' });
  ev.push({ f: copy('tell').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'tell' });
  ev.push({ f: CUE.type + f60(2), kind: 'key', weight: 0.4, pan: 0.1, id: 'typing' });
  ev.push({ f: CUE.arm, kind: 'tick', weight: 0.4, pan: 0.3, id: 'send-arms' });
  // click: the punch-in, the send, the whip
  ev.push({ f: ACT.click.from, kind: 'hit', weight: 0.8, pan: 0, id: 'punch-in' });
  ev.push({ f: CUE.press, kind: 'click', weight: 0.9, pan: 0.3, force: true, id: 'send' });
  ev.push(across(ACT.run.from, f60(20), 0.7, 0, 'whip-up'));
  // run: the turn, each step's check
  ev.push({ f: ACT.run.from + f60(20), kind: 'whoosh', weight: 0.4, pan: -0.3, dur: f60(90), apexFrac: 0.35, id: 'turn' });
  RUN.steps.forEach((_, i) => {
    if (i < RUN.steps.length - 1) ev.push({ f: STEPS[i + 1] + f60(10), kind: 'tick', weight: 0.45, pan: -0.2, id: `check-${i + 1}` });
  });
  // done: the result lands (or the accent rises and the claim lands)
  ev.push(DEAL.done === 'claim' ? { f: ACT.done.from + f60(10), kind: 'whoosh', weight: 0.6, pan: 0, dur: f60(20), apexFrac: 0.6, id: 'accent-rises' } : { f: ACT.done.from + f60(26), kind: 'land', weight: 0.8, pan: 0, force: true, id: 'result' });
  ev.push({ f: copy('done').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'done' });
  // end: the lockup
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
