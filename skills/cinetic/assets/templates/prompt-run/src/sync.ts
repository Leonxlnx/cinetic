// The sound events of the demo, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The track
// carries the demo; the effects mark the product's state changes: the label written, the kick (the tools flying off,
// the swap), the wind-up and the iris, the burst of typing, the punch-in, the click and its swell, the whip, the
// bubble, each step's check, the result landing, ONE element at the lockup.
import { E } from './lib/anim';
import { peak } from './lib/sync';
import { ACT, copy, CUE, type Declares, f60, type Salience, STEPS, TOTAL } from './timeline';
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

/** What the primitives the acts use declare on purpose: the timeline's SEAMS and STEPPED cover them. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // pill: the label written, the kick, the wind-up
  ev.push({ f: copy('what').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'label' });
  ev.push({ f: CUE.kick, kind: 'hit', weight: 0.9, pan: 0, id: 'kick' });
  ev.push({ f: CUE.kick + f60(10), kind: 'whoosh', weight: 0.5, pan: 0.2, dur: f60(26), apexFrac: 0.8, id: 'tools-fly-off' });
  ev.push({ f: CUE.windup, kind: 'riser', weight: 0.6, pan: 0, dur: ACT.ask.from - CUE.windup, apexFrac: 0.95, id: 'wind-up' });
  // ask: the iris, the line, the burst of typing
  ev.push({ f: ACT.ask.from, kind: 'swell', weight: 0.8, pan: 0, dur: f60(40), id: 'iris' });
  ev.push({ f: copy('tell').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'tell' });
  ev.push({ f: CUE.type + f60(2), kind: 'key', weight: 0.4, pan: 0.1, id: 'typing' });
  // click: the punch-in, the click, the whip
  ev.push({ f: ACT.click.from, kind: 'hit', weight: 0.8, pan: 0, id: 'punch-in' });
  ev.push({ f: CUE.press, kind: 'click', weight: 0.9, pan: 0.3, id: 'click' });
  ev.push({ f: CUE.press + f60(2), kind: 'pop', weight: 0.6, pan: 0.3, id: 'send-swells' });
  ev.push(across(ACT.run.from, f60(20), 0.7, 0, 'whip-up'));
  // run: the bubble, each step's check
  ev.push({ f: CUE.bubble + f60(4), kind: 'pop', weight: 0.6, pan: 0.3, id: 'bubble' });
  RUN.steps.forEach((_, i) => {
    if (i < RUN.steps.length - 1) ev.push({ f: (STEPS[i + 1] ?? CUE.checked) + f60(2), kind: 'tick', weight: 0.5, pan: -0.2, id: `check-${i + 1}` });
  });
  // done: the result lands, the line
  ev.push({ f: ACT.done.from + f60(24), kind: 'land', weight: 0.8, pan: 0, id: 'result' });
  ev.push({ f: copy('done').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'done' });
  // end: the lockup
  ev.push({ f: ACT.end.from, kind: 'pop', weight: 0.7, pan: -0.2, id: 'mark' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
