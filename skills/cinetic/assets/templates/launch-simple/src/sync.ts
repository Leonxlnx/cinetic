// The sound events of a simple launch, computed from the timeline. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame, over the
// film's licensed track. The track carries the film and its cuts; the effects mark what the picture does: each line
// once it is whole (one soft text sound), each picture's own moments (launch.ts hits: the click, the result), the
// push closer (a soft swell under the camera's move), the seams that move (a whoosh on the speed, never on a
// cross-blur or a focus pull), a sub drop as the claim arrives, the element becoming the mark and ONE clean hit on the
// lockup (the drop and the hit each take a stop-down in the mix: two dynamic accents, never a flat bed).
import { DEAL } from './deal';
import { ACT, copy, CUE, type Declares, f60, PAIRS, PUSH, type Salience, SEAM_PLAN, TOTAL } from './timeline';
import { LAUNCH } from './launch';

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
  action?: string; // what the picture does (scripts/audio/actions.py): kit.py cast voices each action with its own sound
  id?: string;
  structural?: true;
  force?: true;
  offset_ms?: number;
  salience?: Salience;
};

const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';

/** What the primitives the acts use declare on purpose: the timeline's SEAMS cover the stage's seams. */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  LAUNCH.pairs.forEach((_, i) => {
    const k = i + 1;
    if (LAUNCH.pairs[i].line?.trim()) ev.push({ f: copy(`line${k}`).resolved, kind: 'text', weight: 0.65, pan: 0, action: 'text', id: `line${k}-whole` });
    const hits = Object.keys(CUE).filter((n) => n.startsWith(`a${k}h`));
    hits.forEach((n, j) => ev.push({ f: CUE[n], kind: j === hits.length - 1 ? 'pop' : 'click', weight: 0.6, pan: (j % 2 ? 0.1 : -0.1), action: j === hits.length - 1 ? 'card-land' : 'press', id: `pic${k}-${n}` }));
    // the push closer: a soft swell under the camera's move (it lands with the push, PUSH.dur f@60 after the cue)
    if (CUE[`a${k}cut`] !== undefined) ev.push({ f: CUE[`a${k}cut`], kind: 'swell', weight: 0.3, pan: 0, dur: f60(PUSH.dur), apexFrac: 0.8, action: 'shape', id: `pic${k}-closer` });
  });
  // the claim's arrival (its colour field filling the frame) is the film's second accent: a sub drop the mix takes a
  // stop-down before (score.py: the music dips 0.3-0.5 s and lands back on it), so the track has two dynamic moments
  // (the claim and the lockup), never one flat bed to the end; the seam into it sounds as that drop, once
  const claimAt = PAIRS[PAIRS.length - 1].from;
  ev.push({ f: claimAt, kind: 'drop', weight: 0.85, pan: 0, action: 'thud', id: 'the-claim-arrives' });
  for (const s of SEAM_PLAN) {
    if (s.at === claimAt) continue;
    if (s.recipe === 'velocityCut') ev.push({ f: s.at, kind: 'whoosh', weight: 0.55, pan: s.dir === 'left' ? -0.4 : 0.4, dur: f60(26), apexFrac: 0.62, action: 'whip', id: `seam-${s.id}` });
    else if (s.recipe === 'matchCut') ev.push({ f: s.at, kind: 'snap', weight: 0.45, pan: 0, action: 'jump-cut', id: `seam-${s.id}` });
    else if (s.recipe === 'zoomThrough') ev.push({ f: s.at, kind: 'suck', weight: 0.6, pan: 0, dur: f60(30), apexFrac: 0.85, action: 'shape', id: `seam-${s.id}` });
  }
  if (DEAL.end === 'element') ev.push({ f: ACT.end.from, kind: 'swell', weight: 0.55, pan: 0, dur: f60(30), action: 'shape', id: 'element-becomes-the-mark' });
  else ev.push({ f: ACT.end.from - f60(12), kind: 'whoosh', weight: 0.5, pan: 0, dur: f60(34), apexFrac: 0.3, action: 'swipe', id: 'the-element-spins-into-the-mark' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0, action: 'logo-lock', id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev.sort((a, b) => a.f - b.f);
}
