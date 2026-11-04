// The sound of a launch played as a spine, computed from the timeline: scripts/export-cues.ts calls the default export
// and writes out/cues.json; scripts/audio/score.py voices each event with the film's kit on its exact frame over the
// licensed track (npm run sound). The track carries the film; the effects are cut to the picture by the reference
// grammar: a contact sounds on the contact, a word's sound lands once the line is whole, a whoosh starts 4 f before its
// cut and peaks 3 f after it, a swell rides a handover into its cut, a riser ends on its hit, nothing sounds on a start.
// One strong sound per gesture; micro-sounds (keys, ticks) come in cascades, quiet. Every handover sounds by its kind,
// the world's turn takes the sub drop (the film's colour event), the lockup ONE clean hit.
import { HANDOVERS } from './lib/spine';
import { ACT, type Declares, f60, FPS, HANDOVER_PLAN, LINES, LOCKUP_AT, NAME_AT, type Salience, SCENES, type Seam, SPINE_PLAN, TOTAL } from './timeline';
import { ctxOf, defOf, specs } from './acts/stage';
import { handoverDeclares } from './lib/handover';
import { stepsFromPlan, worldStepDeclares } from './fx/world/Step';

export type Kind = 'tick' | 'tock' | 'hit' | 'land' | 'pop' | 'whoosh' | 'riser' | 'drop' | 'key' | 'click' | 'snap' | 'swell' | 'bell' | 'suck' | 'text';
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
const film = { fps: FPS };

/** What the picture declares on purpose: each drawn handover's box track (forensics --spine follows the element in it), the world's steps. */
export const declares = (): (Declares & { id?: string })[] => {
  const out: (Declares & { id?: string })[] = [];
  specs().forEach((s, i) => {
    if (!s) return;
    try {
      out.push({ id: `handover-${i + 1}`, ...handoverDeclares(s, film) });
    } catch {
      /* a scene whose boxes need the browser: its seam is still declared by the timeline */
    }
  });
  out.push({ id: 'world-steps', ...worldStepDeclares(stepsFromPlan(SPINE_PLAN), film), colour: [] });
  // the house scenes' own designed cuts (a poster jumping in, a colour flip): hard seams, never an undeclared swap
  const cuts: Seam[] = SCENES.flatMap((s) => (defOf(s.i).cuts?.() ?? []).map((f) => ({ at: s.from + f, kind: 'hard' as const, id: `scene-cut:${s.name}:${f}` }))).filter((x) => x.at < TOTAL);
  if (cuts.length) out.push({ id: 'scene-cuts', seams: cuts });
  return out;
};

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];
  // each line once it is whole (one soft text sound); the product's own words sound through their scene
  for (const l of LINES) if (l.place !== 'inside') ev.push({ f: l.resolved + f60(4), kind: 'text', weight: l.claim ? 0.7 : 0.55, pan: 0, action: 'text', id: `${l.id}-whole` });
  // each scene's own moments (keys, the press, sections landing, notices, the count's ticks)
  SCENES.forEach((s) => {
    const d = defOf(s.i);
    if (!d.moments) return;
    const c = ctxOf(s.i, s.from);
    for (const m of d.moments({ dur: c.dur, fps: FPS, land: c.land, leadAt: c.leadAt, i: s.i, prev: c.prev })) {
      const f = s.from + m.f;
      if (f >= s.from && f < Math.min(TOTAL, s.to + f60(20))) ev.push({ f, kind: m.kind, weight: m.weight, pan: m.pan ?? 0, action: m.action, id: `s${s.i + 1}-${m.id}`, ...(m.dur ? { dur: m.dur } : {}), ...(m.apexFrac !== undefined ? { apexFrac: m.apexFrac } : {}) });
    }
  });
  // every handover by its kind, on the cut's own grammar
  for (const h of HANDOVER_PLAN) {
    if (h.kind === 'cut' || h.kind === 'entry') continue;
    const lead = h.at - h.span[0];
    const land = h.span[1] - h.at;
    const id = `${HANDOVERS[h.kind].id}-${h.kind}-${h.forms.join('-')}`;
    if (h.kind === 'fly' || h.kind === 'momentum') {
      ev.push({ f: h.at - f60(8), kind: 'whoosh', weight: 0.55, pan: h.dir === 'left' ? -0.3 : 0.3, dur: f60(30), apexFrac: 0.38, action: 'whip', id });
      ev.push({ f: h.span[1], kind: 'land', weight: 0.5, pan: 0, action: 'card-land', id: `${id}-lands` });
    } else if (h.kind === 'converge' || h.kind === 'shrink') {
      ev.push({ f: Math.max(0, h.span[0]), kind: 'suck', weight: 0.5, pan: 0, dur: lead + f60(4), apexFrac: 0.85, action: 'shape', id });
      ev.push({ f: h.at + f60(4), kind: 'pop', weight: 0.6, pan: 0, action: 'shape', id: `${id}-spark` });
    } else if (h.kind === 'swell' || h.kind === 'grow' || h.kind === 'press-open' || h.kind === 'iris') {
      ev.push({ f: Math.max(0, h.span[0]), kind: 'swell', weight: h.kind === 'grow' ? 0.5 : 0.42, pan: 0, dur: lead + land, apexFrac: lead / Math.max(1, lead + land), action: 'shape', id });
      if (h.kind === 'grow') ev.push({ f: h.span[1], kind: 'land', weight: 0.45, pan: 0, action: 'card-land', id: `${id}-lands` });
    } else if (h.kind === 'zoom-into' || h.kind === 'pull-out') {
      ev.push({ f: Math.max(0, h.span[0]), kind: 'whoosh', weight: 0.5, pan: 0, dur: lead + land, apexFrac: lead / Math.max(1, lead + land), action: 'swipe', id });
    }
  }
  // the world's turn (the film's biggest change): a sub drop as the flood leaves the element, at weight 1 so the music
  // steps down for a breath before it (plan.py stop-downs) and the turn lands clear
  const turn = SPINE_PLAN.world.find((w) => w.step === 'turn');
  if (turn) ev.push({ f: turn.at, kind: 'drop', weight: 1, pan: 0, action: 'thud', id: 'the-world-turns' });
  // the lockup: the name's slide, then ONE clean hit as the mark lands whole
  ev.push({ f: NAME_AT, kind: 'whoosh', weight: 0.28, pan: 0.2, dur: f60(28), apexFrac: 0.5, action: 'swipe', id: 'the-name-slides-out' });
  ev.push({ f: LOCKUP_AT, kind: 'hit', weight: 1, pan: 0, action: 'logo-lock', id: 'lockup' });

  // one strong sound per gesture: a quiet event inside 2 f of a stronger one of the same kind goes
  ev.sort((a, b) => a.f - b.f || (b.weight ?? 0) - (a.weight ?? 0));
  const kept: SoundEvent[] = [];
  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) continue;
    if (kept.some((k) => k.kind === e.kind && e.kind !== 'key' && Math.abs(k.f - e.f) < 2)) continue;
    kept.push({ ...e, id: `${actOf(e.f)}:${e.id}` });
  }
  return kept;
}
