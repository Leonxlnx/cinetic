// The sound events of the update film, computed from the picture code. scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/kit.py cast gives each action its own sound and scripts/audio/score.py voices
// each event on its exact frame. The music carries the film (an update film is music-led, its biggest entry on the
// recap's gather and its final hit on the version mark); the UI layer marks what the product does: every tap, every
// highlight, every state change, each item landing, the count ticking up, the wipe of a before -> after; one soft text
// sound per line as it comes to rest; the card's moves are quiet air, never a whip.
import { CHANGE_FRAMES } from './acts/World';
import { E } from './lib/anim';
import { settleOf } from './lib/sync';
import { ACT, BEAT, CLOSE, copy, type Declares, f60, FPS, HOOK, N, ROLL, type Salience, TOTAL } from './timeline';
import { DEAL } from './deal';
import { UPDATE } from './update';

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
/** Air under a card's move: a soft whoosh as long as the move, its apex where the move is fastest. */
const air = (from: number, to: number, weight: number, id: string, action = 'swipe'): SoundEvent => ({ f: Math.round(from + (to - from) * 0.35), kind: 'whoosh', weight, pan: 0, dur: Math.max(f60(18), to - from), apexFrac: 0.35, action, id });

/** What the primitives the acts use declare on purpose: none here (one stage, no stepped or flashed frames). */
export const declares = (): (Declares & { id?: string })[] => [];

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // the hook: the version locking (the drum's settle) or rising out of its mask
  if (DEAL.hook === 'roll') ev.push({ f: settleOf(HOOK.roll, HOOK.roll + f60(ROLL), E.snapOut), kind: 'tick', weight: 0.8, pan: 0.2, action: 'detent', id: 'version-locks' });
  else if (DEAL.hook === 'badge') ev.push({ f: HOOK.version + f60(6), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-badge' });
  else ev.push({ f: HOOK.version + f60(10), kind: 'pop', weight: 0.7, pan: 0.2, action: 'appear', id: 'version-rises' });
  CHANGE_FRAMES.forEach((c, i) => {
    const ch = UPDATE.changes[i];
    const s = ch.show;
    const d = c.device;
    // the card coming in: into its line's gap and out of it (split), its creative device's own beats, the element of the
    // card before growing into it, or its rise; a colour field closing into it carries its own sound below
    if (c.gap) ev.push(air(c.gap[0], c.gap[1], 0.35, `${c.id}-into-gap`, 'shape'));
    if (c.shape === 'lead' && c.fold) ev.push(air(c.fold[0], c.fold[1], 0.35, `${c.id}-fold`, 'shape'));
    if (c.arrival === 'device' && d) {
      const len = d.to - d.from;
      const hit0 = d.from + (d.hits?.[0] ?? Math.round(len * 0.6));
      if (d.id === 'bubble-swarm') {
        // the pings pop round the empty centre, faster and faster; then the screen draws them in
        const n = Math.min(7, (ch.before ?? []).length);
        const span = Math.max(1, (hit0 - d.from - f60(14)) * 0.8);
        const gaps = Array.from({ length: Math.max(0, n - 1) }, (_, k) => 0.8 ** k);
        const total = gaps.reduce((a, b) => a + b, 0) || 1;
        let at = 0;
        for (let k = 0; k < n; k++) {
          if (k) at += gaps[k - 1];
          ev.push({ f: d.from + Math.round((at / total) * span) + f60(3), kind: 'pop', weight: 0.42 + 0.04 * k, pan: k % 2 ? 0.35 : -0.35, action: 'appear', id: `${c.id}-ping${k}` });
        }
        ev.push({ f: hit0 + f60(10), kind: 'whoosh', weight: 0.55, pan: 0, dur: f60(24), apexFrac: 0.8, action: 'shape', id: `${c.id}-drawn-in` });
      } else if (d.id === 'photo-arc') {
        ev.push(air(d.from, hit0, 0.55, `${c.id}-row`, 'swipe'));
        ev.push({ f: hit0, kind: 'tick', weight: 0.55, pan: 0, action: 'detent', id: `${c.id}-lands` });
        ev.push(air(hit0 + f60(8), d.to, 0.4, `${c.id}-opens`, 'shape'));
      } else if (d.id === 'split-compare') {
        ev.push(air(d.from + f60(4), d.from + f60(42), 0.45, `${c.id}-divider`, 'swipe'));
        ev.push(air(hit0, hit0 + f60(26), 0.5, `${c.id}-sweep`, 'swipe'));
      } else if (d.id === 'logo-orbit') {
        ev.push({ f: d.from + f60(6), kind: 'pop', weight: 0.5, pan: 0, action: 'appear', id: `${c.id}-burst` });
        ev.push({ f: hit0 + f60(18), kind: 'whoosh', weight: 0.55, pan: 0, dur: f60(22), apexFrac: 0.8, action: 'shape', id: `${c.id}-collapse` });
      } else if (d.id === 'pixel-assemble') {
        for (let k = 0; k < 4; k++) ev.push({ f: d.from + f60(6 + k * 13), kind: 'tick', weight: 0.32 + 0.05 * k, pan: -0.3 + 0.2 * k, action: 'appear', id: `${c.id}-tiles${k}` });
        ev.push({ f: d.from + f60(70), kind: 'land', weight: 0.55, pan: 0, action: 'card-land', id: `${c.id}-whole` });
      } else if (d.id === 'shape-morph') {
        [4, 34, 56, 70].forEach((at, k) => ev.push({ f: d.from + f60(at), kind: 'pop', weight: 0.4 + 0.06 * k, pan: 0, action: 'appear', id: `${c.id}-morph${k}` }));
        ev.push(air(d.from + f60(90), d.to, 0.45, `${c.id}-opens`, 'shape'));
      } else {
        ev.push(air(d.from, d.from + f60(44), 0.5, `${c.id}-turns`, 'shape'));
      }
      ev.push({ f: c.card[1] - f60(2), kind: 'land', weight: 0.5, pan: 0, action: 'card-land', id: `${c.id}-arrives` });
    } else if (c.arrival === 'rise' || c.arrival === 'open' || c.arrival === 'morph') ev.push(air(c.card[0], c.card[1], i === 0 ? 0.55 : 0.45, `${c.id}-card`, c.arrival === 'morph' ? 'shape' : 'swipe'));
    else if (c.arrival === 'gap') ev.push(air(c.card[0], c.card[1], 0.45, `${c.id}-card`));
    // cursor-follow: the camera's push onto the pointer, its travel to the button (the click is the tap's own), the pull back
    if (d && d.kind === 'scene') {
      ev.push(air(d.from, d.from + f60(26), 0.35, `${c.id}-push`, 'shape'));
      ev.push(air(c.hit + f60(8), c.hit + f60(50), 0.35, `${c.id}-pull`, 'shape'));
    }
    if (s.kind === 'tap') {
      ev.push({ f: c.hit - f60(2), kind: 'click', weight: 1, pan: 0.3, action: 'touch', id: `${c.id}-tap` });
      ev.push({ f: c.hit + f60(8), kind: 'click', variant: 'confirm', weight: 0.8, pan: 0.3, action: 'success', id: `${c.id}-done` });
      const nRes = (s.result ?? []).length + (s.you ? 1 : 0);
      if (nRes) ev.push({ f: c.hit + f60(10) + f60(6) * Math.max(0, nRes - 1) + (s.you ? f60(8) : 0), kind: 'pop', weight: 0.55, pan: 0.15, action: 'appear', id: `${c.id}-result` });
      ev.push({ f: c.res2, kind: 'tick', weight: 0.45, pan: 0.25, action: 'appear', id: `${c.id}-glow` });
    } else if (s.kind === 'fill') {
      const n = s.items.length;
      const step = Math.max(f60(6), Math.min(BEAT / 2, (c.hit - c.go) / Math.max(1, n - 1)));
      for (let k = 0; k < n - 1; k += n > 4 ? 2 : 1) ev.push({ f: Math.round(c.hit - (n - 1 - k) * step), kind: 'pop', weight: 0.45, pan: -0.2 + (0.4 * k) / n, action: 'appear', id: `${c.id}-item${k}` });
      ev.push({ f: c.hit, kind: 'click', variant: 'confirm', weight: 0.9, pan: 0.2, action: 'success', id: `${c.id}-found` });
      ev.push({ f: c.res2, kind: 'tick', weight: 0.45, pan: 0.2, action: 'appear', id: `${c.id}-glow` });
    } else if (s.kind === 'swap') {
      ev.push(air(c.go, c.hit, 0.5, `${c.id}-wipe`, 'shape'));
      ev.push({ f: c.hit, kind: 'click', weight: 0.85, pan: 0.25, action: 'toggle', id: `${c.id}-after` });
      ev.push({ f: c.res, kind: 'pop', weight: 0.5, pan: -0.1, action: 'appear', id: `${c.id}-checks` });
    } else {
      for (const q of [0.25, 0.5, 0.75]) ev.push({ f: Math.round(c.go + (c.hit - c.go) * q), kind: 'tick', weight: 0.4, pan: 0.15, action: 'detent', id: `${c.id}-tick${q * 100}` });
      ev.push({ f: c.hit, kind: 'click', variant: 'confirm', weight: 0.85, pan: 0.2, action: 'success', id: `${c.id}-lands` });
      ev.push({ f: c.res2, kind: 'tick', weight: 0.4, pan: 0.2, action: 'appear', id: `${c.id}-glow` });
    }
    // the card folding shut into the bar of light its line rises from (show)
    if (c.shape === 'show' && c.fold) ev.push(air(c.fold[0], c.fold[1], 0.35, `${c.id}-fold`, 'shape'));
    const line = copy(`change${i + 1}`);
    ev.push({ f: settleOf(line.in, line.resolved, E.snapOut), kind: 'text', weight: 0.7, pan: -0.2, id: `${c.id}-words` });
    // the colour field: the changed element swelling into the frame, then closing into what comes next
    if (c.field) {
      ev.push({ f: c.field.in, kind: 'pop', weight: 0.55, pan: 0.1, action: 'appear', id: `${c.id}-field-turns` }); // the element takes the accent: the cut's sound
      ev.push({ f: c.field.in + Math.round(0.93 * c.field.grow), kind: 'swell', weight: 0.65, pan: 0, dur: c.field.grow, apexFrac: 0.93, action: 'swell', id: `${c.id}-field` });
      ev.push(air(c.field.close[0], c.field.close[1], 0.5, `${c.id}-field-close`, 'shape'));
    }
  });
  // the recap: the carried card shrinks into the row (or the cards rise into it), the others land beside it; the fold; the version mark
  if (!CHANGE_FRAMES[N - 1].field) ev.push(air(CLOSE.gather, CLOSE.recapIn, 0.5, 'recap', 'swipe')); // else the field's close carries it
  ev.push({ f: CLOSE.recapIn, kind: 'land', weight: 0.6, pan: 0, action: 'card-land', id: 'recap-lands' });
  CLOSE.recapGlints.forEach((f, j) => ev.push({ f, kind: 'tick', weight: 0.4, pan: -0.3 + 0.3 * j, action: 'appear', id: `recap-glint${j}` }));
  ev.push(air(CLOSE.fold, CLOSE.markIn, 0.55, 'fold', 'shape'));
  ev.push({ f: CLOSE.markIn, kind: 'pop', weight: 0.6, pan: 0, action: 'appear', id: 'mark' });
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
