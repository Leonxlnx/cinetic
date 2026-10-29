// The sound events of the teaser, computed from the picture code. scripts/export-cues.ts calls the default export and
// writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame. The track
// carries the teaser; the effects ride the camera: the box arriving, the whip into the close-up (a hit a frame ahead
// of the flash when the deal has it), the launch or the dive, the window on its turn, the whip out, the proof landing
// and its marks rolling, the page and the toast, the pull-out, the stages, the mark, ONE element at the lockup. Each
// device of the deal (src/deal.ts) keeps the cues, so the plan only changes where a device moves differently.
import { E } from './lib/anim';
import { peak } from './lib/sync';
import { ACT, copy, CUE, DEAL, type Declares, f60, FLASHES, type Salience, TOTAL } from './timeline';

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

/** What the primitives the acts use declare on purpose: nothing beyond the timeline's own (lists and stages glide). */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // input: the arrival, the line, the whip into the close-up
  ev.push({ f: CUE.rise + f60(DEAL.input === 'rise' ? 10 : 30), kind: 'swell', weight: 0.6, pan: DEAL.input === 'track' ? -0.3 : 0, dur: f60(DEAL.input === 'rise' ? 50 : 90), id: 'arrive' });
  ev.push({ f: copy('what').resolved, kind: 'text', weight: 0.7, pan: 0, id: 'what' });
  ev.push({ f: CUE.arm, kind: 'tick', weight: 0.4, pan: 0.3, id: 'send-arms' });
  ev.push(across(ACT.launch.from - f60(4), ACT.launch.from - CUE.whipR, 0.7, 0.3, 'whip-right'));
  if (FLASHES.length) ev.push({ f: ACT.launch.from - 1, kind: 'hit', weight: 0.9, pan: 0.2, offset_ms: -16, id: 'flash-cut' });
  // launch: the button's flight, or the dive into it
  if (DEAL.launch === 'jcurve') ev.push({ f: CUE.launch, kind: 'whoosh', weight: 0.7, pan: 0.3, dur: Math.max(f60(18), ACT.window.from - CUE.launch), apexFrac: 0.9, id: 'launch' });
  else ev.push({ f: CUE.fly, kind: 'suck', weight: 0.7, pan: 0.2, dur: ACT.window.from - CUE.fly, apexFrac: 0.95, id: 'dive' });
  // window: the cut, the turn, the line, the whip out
  ev.push({ f: ACT.window.from, kind: 'hit', weight: 0.8, pan: 0, id: 'window' });
  ev.push({ f: ACT.window.from + f60(20), kind: 'whoosh', weight: 0.45, pan: DEAL.window === 'pitch' ? 0 : -0.3, dur: f60(90), apexFrac: 0.35, id: 'turn' });
  ev.push({ f: copy('build').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'build' });
  ev.push(across(ACT.cards.from, ACT.cards.from - CUE.whipOut, 0.8, 0, 'whip-out'));
  // cards: the landings, the marks rolling in the line, the exit
  ev.push({ f: ACT.cards.from + f60(10), kind: 'land', weight: 0.7, pan: 0, id: 'card-lands' });
  ev.push({ f: CUE.fan + f60(20), kind: 'tock', weight: 0.5, pan: -0.2, id: 'cards' });
  ev.push({ f: copy('connect').resolved, kind: 'text', weight: 0.6, pan: 0, id: 'connect' });
  ev.push(across(ACT.page.from, ACT.page.from - CUE.cardsOut, 0.6, 0, 'cards-leave'));
  // page: the cascade, the push and the toast, the pull-out
  ev.push({ f: CUE.sib1 + f60(10), kind: 'tock', weight: 0.45, pan: -0.4, id: 'sibling-left' });
  ev.push({ f: CUE.sib2 + f60(10), kind: 'tock', weight: 0.45, pan: 0.4, id: 'sibling-right' });
  ev.push({ f: CUE.toast, kind: 'pop', weight: 0.8, pan: 0, id: 'toast' });
  ev.push({ f: CUE.blackout + f60(10), kind: 'suck', weight: 0.6, pan: 0, dur: ACT.stages.from - CUE.blackout, apexFrac: 0.9, id: 'pull-out' });
  // stages: each stage on its glide (the claim's flood on the act line)
  if (DEAL.stages === 'claim') ev.push({ f: ACT.stages.from, kind: 'hit', weight: 0.8, pan: 0, id: 'flood' });
  ev.push({ f: CUE.stage1 + f60(10), kind: 'tick', weight: 0.55, pan: 0, id: 'stage-1' });
  ev.push({ f: CUE.stage2 + f60(4), kind: DEAL.stages === 'push' ? 'whoosh' : 'snap', weight: 0.6, pan: 0, ...(DEAL.stages === 'push' ? { dur: f60(56), apexFrac: 0.4 } : {}), id: 'stage-2' });
  ev.push({ f: CUE.stage3 + f60(4), kind: 'snap', weight: 0.55, pan: 0, id: 'stage-3' });
  // end: the comets or the parts, the mark, the lockup
  if (DEAL.end === 'comets') ev.push({ f: CUE.comets + f60(10), kind: 'riser', weight: 0.6, pan: 0, dur: CUE.mark - CUE.comets - f60(10), apexFrac: 0.95, id: 'comets' });
  else ev.push({ f: ACT.end.from + f60(6), kind: 'whoosh', weight: 0.5, pan: 0, dur: CUE.mark - ACT.end.from, apexFrac: 0.85, id: 'parts' });
  ev.push({ f: CUE.mark, kind: 'hit', weight: 1, pan: 0, id: 'mark' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
