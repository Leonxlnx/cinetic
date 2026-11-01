// The sound events of the update film, computed from the picture code. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/kit.py cast gives each action its own sound and scripts/audio/score.py voices
// each event on its exact frame. The music carries the film (an update film is music-led: the mark's arrival and the
// version mark on its bar lines); the UI layer marks what the product does in each hero shot (the press and the answer,
// the keys and the send, each card dropping onto the stack, the ring landing, the picture developing, the figure
// counting and landing, the page landing, the after rising over the before), one soft text sound per line as it comes
// to rest, the shots' arrivals and camera moves as quiet air, never a whip.
import { CHANGE_FRAMES } from './acts/World';
import { heroCamera } from './acts/heroes';
import { HEROES } from './deal';
import { shotDeclares } from './fx/depth/index';
import { E } from './lib/anim';
import { settleOf } from './lib/sync';
import { ACT, CLOSE, copy, type Declares, f60, FPS, HOOK, N, ROLL, type Salience, TIMES, TOTAL } from './timeline';
import { DEAL } from './deal';
import { rowsOf, UPDATE } from './update';

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
/** Air under a move: a soft whoosh as long as the move, its apex where the move is fastest. */
const air = (from: number, to: number, weight: number, id: string, action = 'swipe'): SoundEvent => ({ f: Math.round(from + (to - from) * 0.35), kind: 'whoosh', weight, pan: 0, dur: Math.max(f60(18), to - from), apexFrac: 0.35, action, id });

/**
 * What the picture does on purpose: each hero shot's camera (its declared moves, forensics camera-wander reads them as
 * purposeful shots inside their stage) at the shot's own offset in the film.
 */
export const declares = (): (Declares & { id?: string })[] =>
  TIMES.flatMap((t) => {
    const cam = heroCamera(t.i);
    if (!cam) return [];
    return [{ ...shotDeclares(cam, { id: `${HEROES[t.i]}-${t.i + 1}`, offset: t.h0, frames: Math.max(1, t.heroEnd - t.h0) }) }];
  });

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // the hook: the version locking (the drum's settle), rising out of its mask, or its pill landing
  if (DEAL.hook === 'roll') ev.push({ f: settleOf(HOOK.roll, HOOK.roll + f60(ROLL), E.snapOut), kind: 'tick', weight: 0.8, pan: 0.2, action: 'detent', id: 'version-locks' });
  else if (DEAL.hook === 'badge') ev.push({ f: HOOK.version + f60(6), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-badge' });
  else ev.push({ f: HOOK.version + f60(10), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-rises' });
  CHANGE_FRAMES.forEach((t, i) => {
    const ch = UPDATE.changes[i];
    const hero = HEROES[i];
    // the shot arriving (its optics) and the porthole opening into the frame
    if (t.clear) ev.push(air(t.clear[0], t.clear[1], 0.3, `${t.id}-clears`, 'shape'));
    if (t.gap) ev.push({ f: t.gap[0] + f60(6), kind: 'pop', weight: 0.5, pan: 0.1, action: 'appear', id: `${t.id}-porthole` });
    if (t.iris) ev.push(air(t.iris[0], t.iris[1], 0.5, `${t.id}-opens`, 'shape'));
    else ev.push(air(t.h0, t.hin + f60(10), DEAL.arrive === 'whip' ? 0.55 : 0.38, `${t.id}-arrives`, DEAL.arrive === 'whip' ? 'swipe' : 'shape'));
    // the shot's own moment
    if (hero === 'push-press' || hero === 'focus-swap') {
      if (hero === 'push-press') ev.push(air(t.go, t.hit - f60(4), 0.3, `${t.id}-follow`, 'shape'));
      else ev.push(air(t.hit - f60(24), t.hit + f60(12), 0.45, `${t.id}-after-rises`, 'shape'));
      ev.push({ f: t.hit - f60(2), kind: 'click', weight: 1, pan: 0.3, action: 'touch', id: `${t.id}-tap` });
      ev.push({ f: t.hit + f60(8), kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.3, action: 'success', id: `${t.id}-done` });
      if (ch.show.kind === 'tap' && rowsOf(ch).length) ev.push({ f: t.hit + f60(16), kind: 'pop', weight: 0.55, pan: 0.15, action: 'appear', id: `${t.id}-result` });
    } else if (hero === 'macro-type') {
      ev.push(air(Math.max(t.h0, t.go - f60(28)), t.go + f60(2), 0.35, `${t.id}-push`, 'shape'));
      for (let k = 0; k < 6; k++) ev.push({ f: t.go + Math.round(((t.hit - f60(30) - t.go) * k) / 5), kind: 'key', weight: 0.42, pan: -0.15 + 0.06 * k, action: 'type', id: `${t.id}-key${k}` });
      ev.push({ f: t.hit - f60(1), kind: 'click', weight: 0.95, pan: 0.25, action: 'press', id: `${t.id}-send` });
      ev.push({ f: t.hit + f60(6), kind: 'pop', weight: 0.55, pan: 0.2, action: 'success', id: `${t.id}-sent` });
    } else if (hero === 'toast-stack' || hero === 'fan-focus') {
      const n = rowsOf(ch).length;
      const span = Math.max(f60(12), t.hit - f60(12) - t.go);
      for (let k = 0; k < n; k++) ev.push({ f: (k === n - 1 ? t.hit - f60(12) : t.go + Math.round((span * k) / Math.max(1, n - 1))) + f60(4), kind: 'pop', weight: 0.42 + 0.04 * k, pan: -0.25 + (0.5 * k) / Math.max(1, n), action: 'appear', id: `${t.id}-card${k}` });
      ev.push({ f: t.hit, kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.15, action: 'success', id: `${t.id}-lands` });
    } else if (hero === 'carousel') {
      ev.push(air(t.h0, t.hit, 0.55, `${t.id}-ring`, 'swipe'));
      ev.push({ f: t.hit, kind: 'tick', weight: 0.6, pan: 0, action: 'detent', id: `${t.id}-lands` });
      ev.push(air(t.hit + f60(2), t.hit + f60(30), 0.35, `${t.id}-opens`, 'shape'));
    } else if (hero === 'photo-develop') {
      ev.push({ f: t.go + f60(4), kind: 'swell', weight: 0.4, pan: 0, dur: f60(18), apexFrac: 0.8, action: 'swell', id: `${t.id}-develops` });
      ev.push({ f: t.go + f60(12), kind: 'pop', weight: 0.5, pan: -0.2, action: 'appear', id: `${t.id}-glass` });
      ev.push({ f: t.hit, kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.15, action: 'success', id: `${t.id}-tick` });
    } else if (hero === 'glass-counter') {
      for (const q of [0.15, 0.35, 0.6]) ev.push({ f: Math.round(t.go + (t.hit - t.go) * q), kind: 'tick', weight: 0.38, pan: 0.15, action: 'detent', id: `${t.id}-tick${Math.round(q * 100)}` });
      ev.push({ f: t.hit, kind: 'click', variant: 'confirm', weight: 0.85, pan: 0.2, action: 'success', id: `${t.id}-lands` });
      ev.push(air(t.hit, t.hit + f60(40), 0.3, `${t.id}-sweep`, 'shape'));
    } else if (hero === 'page-fly') {
      ev.push(air(t.go, t.hit, 0.5, `${t.id}-travel`, 'swipe'));
      ev.push({ f: t.hit, kind: 'land', weight: 0.6, pan: 0, action: 'card-land', id: `${t.id}-lands` });
    } else {
      ev.push(air(t.go, t.hit, 0.5, `${t.id}-tiles`, 'shape'));
      ev.push({ f: t.hit, kind: 'land', weight: 0.55, pan: 0, action: 'card-land', id: `${t.id}-lands` });
    }
    if (t.iso) ev.push(air(t.iso[0], t.iso[1], 0.28, `${t.id}-isolate`, 'shape'));
    const line = copy(`change${i + 1}`);
    ev.push({ f: settleOf(line.in, line.resolved, E.snapOut), kind: 'text', weight: 0.7, pan: -0.2, id: `${t.id}-words` });
  });
  // the end card: the mark's pull-back, its landing on the flat mark, the version mark
  ev.push(air(CLOSE.markIn, CLOSE.markFlat, 0.55, 'mark-pull-back', 'shape'));
  ev.push({ f: CLOSE.markFlat, kind: 'pop', weight: 0.6, pan: 0, action: 'appear', id: 'mark' });
  ev.push({ f: CLOSE.lockup, kind: 'hit', weight: 1, pan: 0, action: 'logo-lock', id: 'lockup' });

  for (const e of ev) {
    e.f = Math.round(e.f);
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  if (N < 2) throw new Error('sync: an update film shows 2-4 changes');
  void FPS;
  return ev;
}
