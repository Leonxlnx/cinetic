// The sound events of the update film, computed from the picture plan. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/kit.py cast gives each action its own sound and scripts/audio/score.py voices
// each event on its exact frame. The music carries the film (an update film is music-led: the version mark on the bar
// line that ends the body); the effects are cut to the picture by the house sync grammar:
//   each scene's own moments sound on its measured frames (its meta entry's cues: the press, the porthole opening, the
//   keys, each notification landing, the page landing), placed where the film plays them (a scene given more time at its
//   rest plays its later moments later);
//   a soft swipe under each wipe; one soft text sound per line, a few frames after it is read; nothing sounds on a start; one strong sound a gesture;
//   the version's arrival in the hook, the mark's pull-back, the lockup, and the version mark on its bar line.
import { DEAL, HEROES } from './deal';
import { E } from './lib/anim';
import { settleOf } from './lib/sync';
import { ACT, CHANGES, CLOSE, copy, type Declares, END_MOMENTS30, endAt, f60, HOOK, INTO, N, type Salience, SCENE_MOMENTS, TOTAL } from './timeline';

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
  action?: string; // what the picture does (scripts/audio/actions.py: 'touch', 'press', 'success', 'appear', 'detent' ...): kit.py cast voices each action with its own sound
  id?: string;
  structural?: true;
  force?: true;
  offset_ms?: number;
  salience?: Salience;
};

const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';
/** The action each scene sound is (scripts/audio/actions.py): what the picture does on that frame. */
const ACTION: Record<string, string> = { click: 'press', pop: 'appear', bell: 'success', whoosh: 'swipe', swell: 'swell', hit: 'reveal', land: 'card-land', tick: 'detent', key: 'type', suck: 'shape', riser: 'build', snap: 'lock', tock: 'lock', drop: 'thud' };
/** A whoosh's or a swell's length (frames): the move it rides. */
const LONG: Record<string, number> = { whoosh: 18, swell: 18, riser: 30, suck: 14 };

/** No declared moves beyond the timeline's seams: the scenes carry their own measured cameras inside their shots. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // the hook: the version arriving beside the name (its pill landing, its numerals locking, its tag cutting on)
  if (DEAL.hook === 'roll') ev.push({ f: HOOK.version + f60(16), kind: 'tick', weight: 0.75, pan: 0.2, action: 'detent', id: 'version-locks' });
  else if (DEAL.hook === 'tag') ev.push({ f: HOOK.version + f60(8), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-tag' });
  else ev.push({ f: HOOK.version + f60(6), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-pill' });
  // each defocus into a change: a soft swipe whose apex sits on the cut inside the blur
  for (const x of INTO) if (x.kind === 'defocus' && x.at > 0) ev.push({ f: x.at - f60(5), kind: 'whoosh', weight: 0.35, pan: 0, dur: f60(16), apexFrac: 0.3, action: 'swipe', id: x.id ?? 'defocus' });
  // each change: its line read (a soft text sound), its scene's own moments
  CHANGES.forEach((c) => {
    const line = copy(`change${c.i + 1}`);
    if (c.card) ev.push({ f: settleOf(line.in, line.resolved, E.snapOut) + f60(4), kind: 'text', weight: 0.7, pan: -0.15, id: `change${c.i + 1}-words` });
  });
  for (const x of SCENE_MOMENTS) {
    const kind = x.kind as Kind;
    const action = x.kind === 'click' && /press|send|click/.test(x.id) ? 'press' : ACTION[x.kind] ?? 'appear';
    const e: SoundEvent = { f: x.at, kind, weight: x.w, pan: 0, action, id: `${HEROES[x.i]}-${x.id}` };
    if (LONG[x.kind]) Object.assign(e, { dur: f60(LONG[x.kind]), apexFrac: x.kind === 'whoosh' ? 0.35 : 0.85 });
    ev.push(e);
  }
  // the end: the mark's pull-back, the one snap to the lockup assembling, the version mark on its bar line
  for (const x of END_MOMENTS30) {
    const e: SoundEvent = { f: endAt(x.f), kind: x.kind as Kind, weight: x.w, pan: 0, action: x.id === 'lockup' ? 'logo-lock' : ACTION[x.kind] ?? 'appear', id: `mark-${x.id}` };
    if (LONG[x.kind]) Object.assign(e, { dur: f60(LONG[x.kind]), apexFrac: 0.3 });
    ev.push(e);
  }
  ev.push({ f: CLOSE.lockup, kind: 'hit', weight: 1, pan: 0, action: 'logo-lock', id: 'version-lands' });

  for (const e of ev) {
    e.f = Math.round(e.f);
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  if (N < 2) throw new Error('sync: an update film shows 2-3 changes');
  return ev.sort((p, q) => p.f - q.f);
}
