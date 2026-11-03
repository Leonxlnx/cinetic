// The sound events of the update film, computed from the picture code. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/kit.py cast gives each action its own sound and scripts/audio/score.py voices
// each event on its exact frame. The music carries the film (an update film is music-led: the mark's converge and the
// version mark on its bar lines); the effects are cut to the picture by the house sync grammar:
//   a handover's air starts 4 f@60 before its cut and peaks 3 f after it (a converge draws in to its spark and the spark
//   pops), and the element's landing sounds on the frame it lands (a contact on the contact);
//   each hero shot's own moment sounds on its frames (the press and the answer, the keys and the send, each card dropping
//   onto the stack, the ring landing, the picture developing, the figure counting and landing, the page landing);
//   one soft text sound per line, a few frames after it is read; nothing sounds on a start; one strong sound a gesture.
import { CHANGE_FRAMES, handSpecs, portTrack, surfaceTrack } from './acts/World';
import { heroCamera } from './acts/heroes';
import { HEROES } from './deal';
import { shotDeclares } from './fx/depth/index';
import { stepsFromPlan, worldStepDeclares } from './fx/world';
import { E } from './lib/anim';
import { handoverDeclares, type HandoverSeam } from './lib/handover';
import { settleOf } from './lib/sync';
import { ACT, CLOSE, copy, type Declares, f60, FPS, HANDS, HOOK, N, ROLL, type Salience, type Seam, SPINE_PLAN, TIMES, TOTAL, W, H } from './timeline';
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

const FILM = { fps: FPS, width: W, height: H };
/** A seam that carries the element's box on its frames ([f, x, y, w, h], film px): forensics --spine follows it. */
type TrackSeam = Seam & { track: [number, number, number, number, number][] };
const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';
/** Air under a move: a soft whoosh as long as the move, its apex where the move is fastest. */
const air = (from: number, to: number, weight: number, id: string, action = 'swipe'): SoundEvent => ({ f: Math.round(from + (to - from) * 0.35), kind: 'whoosh', weight, pan: 0, dur: Math.max(f60(18), to - from), apexFrac: 0.35, action, id });
/** A handover's air: starting 4 f@60 before the cut, peaking 3 f@60 after it, as long as the handover's land. */
const cutAir = (at: number, t1: number, weight: number, id: string, action = 'shape'): SoundEvent => {
  const f = at - f60(4);
  const dur = Math.max(f60(20), t1 - f);
  return { f, kind: 'whoosh', weight, pan: 0, dur, apexFrac: Math.min(0.6, f60(7) / dur), action, id };
};

/**
 * What the picture does on purpose: each hero shot's camera (its declared moves, forensics camera-wander reads them as
 * purposeful shots inside their stage) at the shot's own offset in the film; the world's one step per act; and each
 * drawn handover with the element's box on every frame of its span (forensics --spine follows it).
 */
export const declares = (): (Declares & { id?: string })[] => [
  ...TIMES.flatMap((t) => {
    const cam = heroCamera(t.i);
    if (!cam) return [];
    return [{ ...shotDeclares(cam, { id: `${HEROES[t.i]}-${t.i + 1}`, offset: t.h0, frames: Math.max(1, t.heroEnd - t.h0) }) }];
  }),
  { id: 'world', ...worldStepDeclares(stepsFromPlan(SPINE_PLAN), FILM) },
  ...handSpecs().map((s, k) => {
    const d = handoverDeclares(s, FILM);
    // the mark's solid has no box edge (a turned 3D mark): its converge is tracked while the element collapses to the spark
    const seams = s.to.form === 'mark' ? (d.seams as HandoverSeam[]).map((x) => ({ ...x, track: x.track.filter((r) => r[0] <= s.at) })) : d.seams;
    return { id: `handover-${k}`, ...d, seams };
  }),
  // the porthole holding the element in a parted line, opening into the frame; a two-form shot's button reached on its own surface
  ...TIMES.flatMap((t) => {
    const out: (Declares & { id?: string })[] = [];
    const port = portTrack(t.i);
    if (t.iris && port.length) out.push({ id: `porthole-${t.i + 1}`, seams: [{ at: t.iris[0], kind: 'mask', carry: 'scale', id: `porthole:opens-into-frame-${t.i + 1}`, track: port } as TrackSeam] });
    const surf = surfaceTrack(t.i);
    if (surf) out.push({ id: `surface-${t.i + 1}`, seams: [{ at: surf.at, kind: 'morph', carry: 'shape', id: `surface:${HEROES[t.i]}-${t.i + 1}`, track: surf.track } as TrackSeam] });
    return out;
  }),
];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // the hook: the version's pill landing (its dot widening, rising), or its numerals locking on the drum
  if (DEAL.hook === 'roll') ev.push({ f: settleOf(HOOK.roll, HOOK.roll + f60(ROLL), E.snapOut), kind: 'tick', weight: 0.8, pan: 0.2, action: 'detent', id: 'version-locks' });
  else if (DEAL.hook === 'badge') ev.push({ f: HOOK.version + f60(6), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-badge' });
  else ev.push({ f: HOOK.version + f60(10), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-rises' });
  // the handovers: air into each cut, the element landing; a converge draws in to its spark, which pops
  for (const h of HANDS) {
    const id = `hand${h.k}-${h.kind}`;
    if (h.kind === 'same-surface') {
      ev.push(air(h.at, h.t1, 0.5, `${id}-travel`, 'shape'));
      continue;
    }
    if (h.kind === 'converge') {
      ev.push({ f: h.t0, kind: 'suck', weight: 0.5, pan: 0, dur: Math.max(f60(10), h.at - h.t0), apexFrac: 0.9, action: 'shape', id: `${id}-in` });
      ev.push({ f: h.at + f60(2), kind: 'pop', weight: h.to.side === 'mark' ? 0.9 : 0.65, pan: 0, action: 'appear', id: `${id}-spark` });
      if (h.to.side !== 'mark') ev.push({ f: h.t1, kind: 'land', weight: 0.5, pan: 0, action: 'card-land', id: `${id}-lands` });
      continue;
    }
    ev.push(cutAir(h.at, h.t1, h.kind === 'fly' ? 0.75 : 0.62, `${id}-air`, h.kind === 'fly' ? 'swipe' : 'shape'));
    ev.push({ f: h.t1, kind: h.kind === 'swell' || h.kind === 'shrink' ? 'snap' : 'land', weight: 0.55, pan: 0, action: 'card-land', id: `${id}-lands` });
  }
  CHANGE_FRAMES.forEach((t, i) => {
    const ch = UPDATE.changes[i];
    const hero = HEROES[i];
    if (t.iris) ev.push(cutAir(t.iris[0] + f60(4), t.iris[1], 0.6, `${t.id}-opens`, 'shape'));
    // the shot's own moment
    if (hero === 'push-press' || hero === 'focus-swap') {
      if (hero === 'focus-swap') ev.push(air(t.hit - f60(24), t.hit + f60(12), 0.4, `${t.id}-after-rises`, 'shape'));
      ev.push({ f: t.hit - f60(2), kind: 'click', weight: 1, pan: 0.3, action: 'touch', id: `${t.id}-tap` });
      ev.push({ f: t.hit + f60(8), kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.3, action: 'success', id: `${t.id}-done` });
      if (ch.show.kind === 'tap' && rowsOf(ch).length) ev.push({ f: t.hit + f60(16), kind: 'pop', weight: 0.55, pan: 0.15, action: 'appear', id: `${t.id}-result` });
    } else if (hero === 'macro-type') {
      for (let k = 0; k < 6; k++) ev.push({ f: t.go + Math.round(((t.hit - f60(30) - t.go) * k) / 5), kind: 'key', weight: 0.42, pan: -0.15 + 0.06 * k, action: 'type', id: `${t.id}-key${k}` });
      ev.push({ f: t.hit - f60(1), kind: 'click', weight: 0.95, pan: 0.25, action: 'press', id: `${t.id}-send` });
      ev.push({ f: t.hit + f60(6), kind: 'pop', weight: 0.55, pan: 0.2, action: 'success', id: `${t.id}-sent` });
    } else if (hero === 'toast-stack' || hero === 'fan-focus') {
      const n = rowsOf(ch).length;
      const span = Math.max(f60(12), t.hit - f60(12) - t.go);
      for (let k = 1; k < n; k++) ev.push({ f: (k === n - 1 ? t.hit - f60(12) : t.go + Math.round((span * k) / Math.max(1, n - 1))) + f60(4), kind: 'pop', weight: 0.42 + 0.04 * k, pan: -0.25 + (0.5 * k) / Math.max(1, n), action: 'appear', id: `${t.id}-card${k}` });
      ev.push({ f: t.hit, kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.15, action: 'success', id: `${t.id}-lands` });
    } else if (hero === 'carousel') {
      ev.push(air(t.h0, t.hit, 0.5, `${t.id}-ring`, 'swipe'));
      ev.push({ f: t.hit, kind: 'tick', weight: 0.6, pan: 0, action: 'detent', id: `${t.id}-lands` });
    } else if (hero === 'photo-develop') {
      ev.push({ f: t.go + f60(4), kind: 'swell', weight: 0.4, pan: 0, dur: f60(18), apexFrac: 0.8, action: 'swell', id: `${t.id}-develops` });
      ev.push({ f: t.go + f60(12), kind: 'pop', weight: 0.5, pan: -0.2, action: 'appear', id: `${t.id}-glass` });
      ev.push({ f: t.hit, kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.15, action: 'success', id: `${t.id}-tick` });
    } else if (hero === 'glass-counter') {
      for (const q of [0.15, 0.35, 0.6]) ev.push({ f: Math.round(t.go + (t.hit - t.go) * q), kind: 'tick', weight: 0.38, pan: 0.15, action: 'detent', id: `${t.id}-tick${Math.round(q * 100)}` });
      ev.push({ f: t.hit, kind: 'click', variant: 'confirm', weight: 0.85, pan: 0.2, action: 'success', id: `${t.id}-lands` });
    } else if (hero === 'page-fly') {
      ev.push(air(t.go, t.hit, 0.5, `${t.id}-travel`, 'swipe'));
      ev.push({ f: t.hit, kind: 'land', weight: 0.6, pan: 0, action: 'card-land', id: `${t.id}-lands` });
    } else {
      ev.push({ f: t.hit, kind: 'land', weight: 0.55, pan: 0, action: 'card-land', id: `${t.id}-lands` });
    }
    const line = copy(`change${i + 1}`);
    ev.push({ f: settleOf(line.in, line.resolved, E.snapOut) + f60(4), kind: 'text', weight: 0.75, pan: -0.2, id: `${t.id}-words` });
  });
  // the end: the solid's pull-back, its landing on the flat mark, the version mark on the bar line
  ev.push(air(CLOSE.solid, CLOSE.markFlat, 0.5, 'mark-pull-back', 'shape'));
  ev.push({ f: CLOSE.markFlat, kind: 'pop', weight: 0.6, pan: 0, action: 'appear', id: 'mark' });
  ev.push({ f: CLOSE.lockup, kind: 'hit', weight: 1, pan: 0, action: 'logo-lock', id: 'lockup' });

  for (const e of ev) {
    e.f = Math.round(e.f);
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  if (N < 2) throw new Error('sync: an update film shows 2-3 changes');
  return ev;
}
