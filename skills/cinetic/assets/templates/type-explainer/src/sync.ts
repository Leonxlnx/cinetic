// The sound events of the explainer, computed from the picture code. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. A calm
// track carries the film; the effects mark what lands: the giant name, the mark arriving as a word, each line said
// (once, when it is whole), the cuts at speed, the picture opening and becoming the shot, the name over it, the one
// wipe, the parts born round the mark (thinned), the three labels, the gather, the name and ONE element at the lockup.
import { cells, bornAt } from './acts/Grid';
import { E } from './lib/anim';
import { peak } from './lib/sync';
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
  // open: the giant name lands, the mark arrives as a word, the cut at speed, what it is said
  ev.push({ f: CUE.giant + f60(8), kind: 'drop', weight: 0.9, pan: 0, id: 'name-lands' });
  ev.push({ f: CUE.mark, kind: 'pop', weight: 0.8, pan: 0.2, id: 'mark-as-a-word' });
  ev.push(across(CUE.what, f60(24), 0.6, -0.3, 'cut-at-speed'));
  ev.push({ f: copy('what').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'what-said' });
  // pain and promise: each line whole; the picture opening; it grows into the shot
  ev.push(across(ACT.pain.from, f60(20), 0.5, 0.3, 'what-leaves'));
  ev.push({ f: copy('pain').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'pain-said' });
  ev.push(across(ACT.promise.from, f60(20), 0.5, 0.3, 'pain-leaves'));
  ev.push({ f: CUE.pill + f60(2), kind: 'pop', weight: 0.7, pan: 0, id: 'picture-opens' });
  ev.push({ f: copy('promise').resolved, kind: 'text', weight: 0.7, pan: 0.1, id: 'promise-said' });
  ev.push({ f: CUE.grow + f60(6), kind: 'riser', weight: 0.6, pan: 0, dur: ACT.picture.from - CUE.grow, apexFrac: 0.95, id: 'picture-grows' });
  // picture: the cut onto it, the name over it
  ev.push({ f: ACT.picture.from, kind: 'swell', weight: 0.8, pan: 0, dur: f60(40), id: 'picture-is-the-shot' });
  ev.push({ f: CUE.title, kind: 'pop', weight: 0.8, pan: -0.1, id: 'name-on-the-picture' });
  // system: the one wipe, the line, the float off
  ev.push(across(CUE.wipe + f60(12), f60(26), 0.7, -0.4, 'the-one-wipe'));
  ev.push({ f: copy('system').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'system-said' });
  ev.push({ f: CUE.floatOff + f60(6), kind: 'whoosh', weight: 0.4, pan: 0, dur: f60(18), id: 'words-float-off' });
  // grid: every few parts born pop (the track carries the rest), the labels, the gather
  cells()
    .filter((c) => c.module >= 0)
    .forEach((c, i) => {
      if (i % 2 === 0) ev.push({ f: Math.round(bornAt(c.d)) + f60(2), kind: 'pop', weight: 0.45, pan: Math.max(-0.4, Math.min(0.4, (c.x - 960) / 2400)), id: `part-${i}` });
    });
  LABELS.forEach((f, i) => ev.push({ f, kind: 'tick', weight: 0.6, pan: 0.15, id: `label-${i + 1}` }));
  ev.push({ f: CUE.gather + f60(20), kind: 'suck', weight: 0.6, pan: 0, dur: f60(22), apexFrac: 0.8, id: 'parts-gather' });
  // end: the name, the close, the lockup (one clean element)
  ev.push({ f: CUE.name, kind: 'pop', weight: 0.8, pan: -0.2, id: 'name' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
