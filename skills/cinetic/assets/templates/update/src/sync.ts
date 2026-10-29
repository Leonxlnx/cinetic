// The sound events of the update film, computed from the picture code. scripts/export-cues.ts calls the
// default export and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on
// its exact frame. The music carries the film (an update film is music-led); the effects mark discrete
// state changes only: the version's numeral locking, each product moment's contact frame, one soft text
// sound per fragment as it comes to rest, the camera's moves between acts, the version landing and the
// lockup (a stop-down, then ONE clean element).
import { CHANGE_FRAMES } from './acts/World';
import { E } from './lib/anim';
import { peak, settleOf } from './lib/sync';
import { ACT, beat, BEATS, copy, CUE, type Declares, f60, FPS, N, ROLL, type Salience, TOTAL } from './timeline';

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

const sec = (s: number) => Math.round(s * FPS);
const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';
/** A camera move centred on an act line: a whoosh as long as the move with its apex on the speed peak. */
const across = (at: number, dur: number, weight: number, pan: number, id: string): SoundEvent => {
  const from = at - dur / 2;
  const to = at + dur / 2;
  const apex = peak(from, to, E.strongInOut);
  return { f: apex, kind: 'whoosh', weight, pan, dur: Math.max(sec(0.3), dur), apexFrac: (apex - from) / (to - from), id };
};

/** What the primitives the acts use declare on purpose: none here (one camera, no stepped or flashed frames). */
export const declares = (): (Declares & { id?: string })[] => [];

const HIT_KIND: Record<string, { kind: Kind; variant?: string }> = {
  approve: { kind: 'click', variant: 'confirm' },
  chat: { kind: 'pop' },
  count: { kind: 'tick', variant: 'crisp' },
  budget: { kind: 'click' },
  table: { kind: 'tick', variant: 'crisp' },
};

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // the hook: the version's numeral locks on its new value (the drum's settle)
  ev.push({ f: settleOf(CUE.roll, CUE.roll + f60(ROLL), E.snapOut), kind: 'snap', weight: 0.9, pan: 0.2, id: 'version-locks' });
  // every change: the move in, the product's contact frame, the fragment coming to rest
  CHANGE_FRAMES.forEach((c, i) => {
    ev.push(across(beat(BEATS.change(i)), f60(40), 0.8, 0.3, `to-${c.id}`));
    ev.push({ f: c.hit, ...HIT_KIND[c.moment], weight: 1, pan: 0.35, id: `${c.id}-hit` });
    ev.push({ f: settleOf(copy(`change${i + 1}`).in, c.resolved, E.snapOut), kind: 'text', weight: 0.8, pan: -0.3, id: `${c.id}-words` });
  });
  // the payoff: the pull back, the version landing in front
  ev.push(across(CUE.gather + f60(18), f60(72), 1, 0, 'pull-back'));
  ev.push({ f: CUE.land, kind: 'land', weight: 1, pan: 0.1, id: 'version-lands' });
  // the lockup: one clean element on the beat, the name read in near-silence
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: -0.2, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  if (N < 2) throw new Error('sync: an update film shows 2-4 changes');
  return ev;
}
