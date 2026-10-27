// The sound events of the teaser, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The track
// carries the teaser; the effects ride the camera: the rise, the whips (one with the flash), the launch, the window's
// rise and its zoom-out and push, the cards landing and fanning, the title, the siblings, the toast, the pull-out, the
// decode and the rolls, the comets, ONE element at the lockup. Sound leads picture by a frame on the disguised cuts.
import { declares as scrambleDeclares } from './fx/Scramble';
import { E } from './lib/anim';
import { peak } from './lib/sync';
import { ACT, copy, CUE, type Declares, f60, type Salience, TOTAL } from './timeline';
import { TEASER } from './teaser';

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

/** What the primitives the acts use declare on purpose: the decode's glyph steps. */
export const declares = (): (Declares & { id?: string })[] => [{ ...scrambleDeclares({ start: CUE.stage1, text: TEASER.stages[0], id: 'stage-decode' }), id: 'stage-decode' }];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // input: the rise, the line, the whips, the flash
  ev.push({ f: CUE.rise + f60(6), kind: 'swell', weight: 0.6, pan: 0, dur: f60(40), id: 'rise' });
  ev.push({ f: copy('what').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'what' });
  ev.push(across(CUE.whipL + f60(8), f60(16), 0.5, -0.4, 'whip-left'));
  ev.push({ f: ACT.launch.from - 1, kind: 'hit', weight: 0.9, pan: 0.2, offset_ms: -16, id: 'flash-cut' });
  // launch: the slide, the button's flight
  ev.push(across(CUE.slide + f60(8), f60(28), 0.6, -0.3, 'slide-in'));
  ev.push({ f: CUE.fly, kind: 'riser', weight: 0.7, pan: 0.3, dur: ACT.window.from - CUE.fly, apexFrac: 0.9, id: 'launch' });
  // window: the rise, the line, the zoom-out whip, the push, the whip out
  ev.push({ f: ACT.window.from, kind: 'hit', weight: 0.8, pan: 0, id: 'window' });
  ev.push({ f: copy('build').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'build' });
  ev.push(across(CUE.zoomOut + f60(10), f60(20), 0.7, 0, 'zoom-out'));
  ev.push(across(ACT.cards.from, f60(18), 0.8, 0, 'whip-out'));
  // cards: the landing, the fan, the exit
  ev.push({ f: ACT.cards.from + f60(6), kind: 'land', weight: 0.7, pan: 0, id: 'card-lands' });
  ev.push({ f: CUE.fan + f60(16), kind: 'snap', weight: 0.6, pan: -0.2, id: 'fan' });
  ev.push(across(ACT.page.from, f60(16), 0.6, 0, 'cards-leave'));
  // page: the title, the siblings, the push and the toast, the pull-out
  ev.push({ f: CUE.sib1 + f60(6), kind: 'tock', weight: 0.5, pan: -0.4, id: 'sibling-left' });
  ev.push({ f: CUE.sib2 + f60(6), kind: 'tock', weight: 0.5, pan: 0.4, id: 'sibling-right' });
  ev.push({ f: CUE.toast, kind: 'pop', weight: 0.8, pan: 0, id: 'toast' });
  ev.push({ f: CUE.blackout + f60(10), kind: 'suck', weight: 0.6, pan: 0, dur: ACT.stages.from - CUE.blackout, apexFrac: 0.9, id: 'pull-out' });
  // stages: the decode, the rolls
  ev.push({ f: CUE.stage1 + f60(20), kind: 'tick', weight: 0.6, pan: 0, id: 'decode' });
  ev.push({ f: CUE.stage2, kind: 'snap', weight: 0.7, pan: 0, id: 'roll-2' });
  ev.push({ f: CUE.stage3, kind: 'snap', weight: 0.6, pan: 0, id: 'roll-3' });
  // end: the comets, the mark, the lockup
  ev.push({ f: CUE.comets + f60(10), kind: 'riser', weight: 0.6, pan: 0, dur: CUE.mark - CUE.comets - f60(10), apexFrac: 0.95, id: 'comets' });
  ev.push({ f: CUE.mark, kind: 'hit', weight: 1, pan: 0, id: 'mark' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
