// The single source of truth for time, for a launch assembled from the scene bank and played as a spine: the script
// (src/spine.ts: one sentence, one case, one element, 3-5 acts of 1-3 scenes) cast with house scenes (src/bank.ts: the
// ones the script names, the rest dealt by each act's verb), each scene at its own length (1.5-3 s: a point shown and
// understood), every change on the track's 8th and handed over by the element (HANDOVER_PLAN), the lines placed (alone
// on clean ground for the promise and the claim; the scenes carry the statements between), the lockup a house scene
// that holds to the body's last bar line. Everything here is derived from src/spine.ts, src/bank.ts, src/deal.ts and
// the music, so a new script, track or tempo needs no edit here. Picture (src/acts), sound (src/sync.ts ->
// out/cues.json) and the checks (scripts/grid-check.ts --part spine reads SPINE_PLAN) import this file. Keep it free of
// React and CSS imports (src/bank.ts mirrors the scenes' numbers for that): Node scripts load it directly.
import { holdFor, PACE, readingWindows, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { COL_OF, type Form, handoverFrames, HANDOVERS, handoversFor, type HandoverKind, planSpine, type PlanAct, type PlanChange, type PlanScene, type Spine, spineDeclares, type SpinePlan, stemVerb } from './lib/spine';
import { CLOSE, type FilmScene, PICTURES, SPINE } from './spine';
import { BANK, dealScene, durOf, type Ground, type Need, onScreen } from './bank';
import { IDENTITY } from './brand/identity';
import { DEAL } from './deal';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/** The film-time music grid (src/music.ts): null until track.py grid writes the track's; then b() follows its bars. */
export { MUSIC } from './music';
export { DEAL } from './deal';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites the
 * `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The launch tempo: one line at a time, said and gone. */
export const PACE_NAME: PaceName = 'crisp';
const pace = PACE[PACE_NAME];

/** Frames per beat (a whole number without a track: 60 fps -> 90, 100, 120, 144, 150 BPM). */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/** Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat. */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
/** A choreography length written in 60 fps frames, converted to this film's fps (rounded). */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
/** The fractional twin of f60, for durations inside a move. */
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;

/**
 * After the last bar the picture holds while the music ends, never on a cut: at least 1 s, or the ending's own hold
 * (track.py grid writes it).
 */
/** The nearest 16th of the music's grid to frame f (cues that sound land on the track's own subdivision). */
export const q16 = (f: number): number => {
  const k = Math.max(1, Math.floor((f - b(1)) / BAR) + 1);
  let best = f;
  let d = Infinity;
  for (let n = Math.max(1, k - 1); n <= k + 1; n++)
    for (let beat = 0; beat < 4; beat++)
      for (let sub = 0; sub < 4; sub++) {
        const g = b(n, beat, sub);
        if (Math.abs(g - f) < d) [d, best] = [Math.abs(g - f), g];
      }
  return best;
};
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, MUSIC && MUSIC.end.hold === undefined ? Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1) + FPS : 0);

// ---------------------------------------------------------------------------------------------------- the spine

/** The words of a line with their key (a *starred* word). */
export const plain = (s: string) => s.replace(/\*/g, '');
export const keyWords = (s: string): { word: string; key: boolean }[] => {
  const out: { word: string; key: boolean }[] = [];
  let inKey = false;
  for (const raw of s.split(/\s+/).filter(Boolean)) {
    const opens = raw.startsWith('*');
    const closes = raw.replace(/[.,!?;:]+$/, '').endsWith('*');
    const key = inKey || opens;
    out.push({ word: raw.replace(/\*/g, ''), key });
    inKey = (inKey || opens) && !closes;
  }
  return out;
};

/** The text voice (deal.ts voice): word fade, stagger, re-centre (f@60). The re-centre front-loads (E.jump: most of
 * the move on its first frame); a new word is born in the accent and drains to ink. */
export const VOICE = { fade: 14, stagger: 5, recentre: 14, rise: 0.55, drain: 7 } as const;
/** A line alone that becomes the element: once read, its key word takes the centre as the other words part (f@60 before the handover's lead). */
export const GATHER = { lead: 12, dur: 10 } as const;
/** When a line of n words is whole, f@60 from its first frame. */
export const buildOf = (n: number) => Math.max(0, n - 1) * VOICE.stagger + VOICE.fade;


// ---------------------------------------------------------------------------------------------------- the cast

/** What the film can show (a scene that needs more is never dealt): its pictures, and what the spine's props give. */
const HAVE: Need[] = (() => {
  const h = new Set<Need>();
  if (PICTURES.length >= 1) h.add('picture');
  if (PICTURES.length >= 4) h.add('pictures');
  for (const a of SPINE.acts)
    for (const s of a.scenes) {
      const p = s.props ?? {};
      if (p.chips) h.add('logos');
      if (p.plans) h.add('plans');
      if (p.product) h.add('product');
      if (p.hero) h.add('hero');
    }
  return [...h];
})();

/** The scenes in film order (as lib/spine flattens them: the lockup added when the spine ends on another form). */
type Flat = { act: number; k: number; def?: FilmScene; form: Form; name: string };
const FLAT: Flat[] = (() => {
  const out: Flat[] = [];
  SPINE.acts.forEach((a, i) => a.scenes.forEach((s, k) => out.push({ act: i, k, def: s, form: s.form, name: s.name })));
  const last = out[out.length - 1];
  if (last && last.form !== 'mark') out.push({ act: SPINE.acts.length - 1, k: SPINE.acts[SPINE.acts.length - 1].scenes.length, form: 'mark', name: 'lockup' });
  return out;
})();

/**
 * Each scene's house scene: the one its script names, else the deal's (src/bank.ts dealScene: by its act's verb, its
 * form and what the film can show; the lockup from the end scenes). A line (a word scene with no bank) is drawn by the
 * template's own line on clean ground (acts/scenes.tsx wordScene). `ground` is the value the scene was designed on (a
 * line takes the ground of the scene it becomes, so the element arrives on its own ground; a colour field's line stands
 * on the dark). `ff`: the scene opens on its own picture (the element arrives as its whole frame).
 */
export type CastEntry = { bank: string | null; props: Record<string, unknown>; ground: Ground; big: boolean; ff: boolean };
export const CAST: CastEntry[] = (() => {
  const named = FLAT.map((x) => x.def?.bank ?? '').filter(Boolean);
  const used: string[] = [];
  const banks = FLAT.map((s, i) => {
    if (s.def?.bank) return s.def.bank;
    if (s.form === 'word' && s.def) return null;
    const id = dealScene({ act: s.act, k: s.k, verb: SPINE.acts[s.act]?.verb ?? '', form: s.form, last: i === FLAT.length - 1, have: HAVE, used: [...named, ...used] });
    used.push(id);
    return id;
  });
  const dealtWorld: Ground = /^(paleSky|nearWhite|studio|clouds|sky)$/.test(String(DEAL.ground)) ? 'light' : 'dark';
  return banks.map((id, i): CastEntry => {
    if (id) {
      const e = BANK[id];
      if (!e) throw new Error(`timeline: scene "${FLAT[i].name}" names bank "${id}", which src/bank.ts BANK does not hold (${Object.keys(BANK).join(', ')})`);
      return { bank: id, props: FLAT[i].def?.props ?? {}, ground: e.ground, big: e.big, ff: !onScreen(e.handIn) };
    }
    const next = banks.slice(i + 1).find((x): x is string => !!x);
    const g = next ? BANK[next].ground : dealtWorld;
    return { bank: null, props: {}, ground: g === 'field' ? 'dark' : g, big: false, ff: false };
  });
})();

/** How an element becomes a whole new screen (a scene that opens on its own picture): its face grows into the screen,
 * the element in sight on every frame. A converge through a point, a porthole or an iris is the script's to pin. */
const SCREEN_KINDS: Partial<Record<Form, HandoverKind[]>> = {};
/** The drawn kinds the plan picks by itself: the element's face in sight on every frame (a flight smears it, a converge
 * loses it in a point, a porthole or an iris is a disc: those are pinned). */
const AUTO: ReadonlySet<HandoverKind> = new Set(['grow', 'shrink', 'swell', 'word']);
/**
 * Each change pinned to a handover the stage draws: the script's `via`; else the least used drawn recipe of the form
 * pair (never 'word' into a scene that opens on its own picture: its kept content would hide that picture); else, into
 * such a scene, the way the element becomes a whole screen (SCREEN_KINDS: it grows into it); else its face grows into
 * the next scene's element (or shrinks into its chip), always in sight; a converge through a point, a flight, a
 * porthole or an iris only where the script pins it (a point, a smear or a disc loses the element's edge). The scene-internal kinds (stay, part, same-surface, zoom-into, pull-out, momentum) are left to a scene that
 * draws them itself: two house scenes never share one surface.
 */
const VIA: (HandoverKind | 'cut' | undefined)[] = (() => {
  const used: Partial<Record<string, number>> = {};
  const least = (opts: HandoverKind[]) => opts.slice().sort((x, y) => (used[x] ?? 0) - (used[y] ?? 0) || opts.indexOf(x) - opts.indexOf(y))[0];
  return FLAT.map((s, i) => {
    if (i === 0) return s.def?.via;
    const pick = ((): HandoverKind | 'cut' => {
      if (s.def?.via) return s.def.via;
      const A = FLAT[i - 1].form;
      const B = s.form;
      const drawn = handoversFor(A, B).filter((k) => HANDOVERS[k].draws === 'handover' && AUTO.has(k) && !(k === 'word' && CAST[i].ff));
      if (drawn.length) return least(drawn);
      if (CAST[i].ff) return SCREEN_KINDS[A]?.length ? least(SCREEN_KINDS[A] as HandoverKind[]) : 'grow';
      // into an element of its own: its face grows into the next one (a chip into a pill or a page), in sight throughout
      return COL_OF[B] === 'pill' && A !== 'word' ? 'shrink' : 'grow';
    })();
    if (pick !== 'cut') used[pick] = (used[pick] ?? 0) + 1;
    return pick;
  });
})();

/** The words of the line a word scene draws (its act's line; the last word scene of the last act, the claim). */
const lineWords = (i: number) => {
  const a = SPINE.acts[FLAT[i].act];
  const own = FLAT.filter((x, j) => x.act === FLAT[i].act && x.form === 'word' && !CAST[j].bank);
  const claim = own.length > 1 && own[own.length - 1] === FLAT[i] && SPINE.claim?.text;
  return keyWords(String(claim ? SPINE.claim?.text : a?.line?.text ?? SPINE.claim?.text ?? 'A line')).length;
};
const leadOf = (kind: HandoverKind | 'cut' | 'entry' | undefined) => (!kind || kind === 'cut' || kind === 'entry' ? 0 : handoverFrames(kind, FPS)[0]);
/** Each house scene's own length at the film's rate (frames), for the props it plays (0 for a line). */
export const BANK_DUR: number[] = CAST.map((c) => (c.bank ? Math.round((durOf(c.bank, c.props) * FPS) / 30) : 0));
/** Each scene's length as it plays: a house scene whole, then the lead of the handover that takes its element; a line
 * arriving, built, read and gathered into its key word. */
const NATURAL: number[] = FLAT.map((_, i) => {
  const out = i + 1 < FLAT.length ? leadOf(VIA[i + 1]) : 0;
  if (CAST[i].bank) return BANK_DUR[i] + out;
  const n = lineWords(i);
  // the line builds while the element lands in it (LINES: its first word 4 f@60 after the cut), so no landing is added
  return f60(4 + buildOf(n) + holdFor(n, pace) + GATHER.lead + GATHER.dur) + out;
});

/** The nearest 8th of the music's grid to frame f (a scene change lands on the track's own subdivision). */
export const q8 = (f: number): number => {
  const k = Math.max(1, Math.floor((f - b(1)) / BAR) + 1);
  let best = f;
  let d = Infinity;
  for (let n = Math.max(1, k - 1); n <= k + 1; n++)
    for (let beat = 0; beat < 4; beat++)
      for (const sub of [0, 2]) {
        const g = b(n, beat, sub);
        if (Math.abs(g - f) < d) [d, best] = [Math.abs(g - f), g];
      }
  return best;
};

/** How far a house scene may be eased to land its act on the bar: a little faster or slower reads as itself. */
export const EASE = [0.82, 1.2] as const;
/**
 * The body on the track: each act on whole bars (its first scene on the downbeat, so the structure lands on the music),
 * its lines at their own reading length, its house scenes at their own lengths eased together onto the act's bars (the
 * whole number of bars whose ease is nearest 1, inside EASE), each change on the nearest 8th; the lockup plays at its
 * own speed and holds, creeping, to the bar line that ends the body (half a bar at least once its own move is done).
 */
const FIT = (() => {
  const n = FLAT.length;
  const nActs = SPINE.acts.length;
  const bounds: number[] = new Array(n + 1).fill(0);
  const eases: number[] = [];
  const hold = Math.round(BAR / 2);
  let bar = 1;
  for (let a = 0; a < nActs; a++) {
    const idx = FLAT.map((x, i) => (x.act === a ? i : -1)).filter((i) => i >= 0);
    const last = a === nActs - 1;
    const eased = idx.filter((i) => CAST[i].bank && !(last && i === n - 1));
    const lines = idx.filter((i) => !eased.includes(i));
    const easedLen = eased.reduce((t, i) => t + NATURAL[i], 0);
    const fixedLen = lines.reduce((t, i) => t + NATURAL[i], 0) + (last ? hold : 0);
    // an act of lines alone stretches its lines; else the house scenes take the room left by the lines
    const flex = easedLen > 0 ? eased : lines;
    const flexLen = easedLen > 0 ? easedLen : fixedLen;
    const stiff = easedLen > 0 ? fixedLen : 0;
    let best = { nb: 1, k: 1, score: Infinity };
    for (let nb = 1; nb <= 16; nb++) {
      const room = b(bar + nb) - b(bar) - stiff;
      if (room <= 0) continue;
      const k = room / Math.max(1, flexLen);
      if (k < EASE[0] && nb < 16) continue;
      // the last act takes the fewest bars its scenes fit in: the lockup's hold, not a slower scene, fills the rest
      const score = last ? nb : Math.abs(Math.log(Math.min(k, EASE[1]))) + (k > EASE[1] ? Math.log(k / EASE[1]) * 0.5 : 0);
      if (score < best.score) best = { nb, k, score };
      if (k > EASE[1] || (last && k >= EASE[0])) break;
    }
    const k = Math.min(last ? 1 : EASE[1], Math.max(EASE[0], best.k));
    eases.push(k);
    // room the eased scenes cannot take without slowing past EASE goes to the act's lines (a line read a moment longer)
    const spare = easedLen > 0 && lines.length && !last ? Math.max(0, b(bar + best.nb) - b(bar) - stiff - easedLen * k) : 0;
    const linesLen = lines.reduce((t, i) => t + NATURAL[i], 0);
    let f = b(bar);
    idx.forEach((i, j) => {
      bounds[i] = j === 0 ? b(bar) : Math.max(bounds[idx[j - 1]] + 1, q8(f));
      f += flex.includes(i) ? NATURAL[i] * k : NATURAL[i] + (spare && lines.includes(i) ? (spare * NATURAL[i]) / Math.max(1, linesLen) : 0);
    });
    bar += best.nb;
  }
  bounds[n] = b(bar);
  const k = eases.reduce((t, v) => t + v, 0) / Math.max(1, eases.length);
  return { bars: bar - 1, k, bounds };
})();
/** The body's length in bars of the track (the lockup's hold included). */
export const BARS = FIT.bars;
/** How much the house scenes were eased, on average, to land their acts on the bars (1: as they are). */
export const FIT_K = FIT.k;

const SP: Spine = { ...SPINE, acts: SPINE.acts.map((a) => ({ ...a, scenes: a.scenes.map((s) => ({ ...s, via: VIA[FLAT.findIndex((x) => x.def === s)] })) })) } as Spine;
const PLAN0: SpinePlan = planSpine(SP, { fps: FPS, b, bars: Math.max(BARS, SPINE.acts.length) });
/** Each scene's script entry, in plan order (a lockup the plan adds at the end has none). */
export const SCENE_DEF: (FilmScene | undefined)[] = PLAN0.scenes.map((s) => SPINE.acts[s.act]?.scenes[s.k]);

/**
 * The plan on the scenes' own lengths: each scene from its bound to the next (FIT), each act from its first scene to
 * the next act's (its bars the nearest whole number), every change on the incoming scene's first frame with its lead
 * before it (the out scene holds its last frame while the element leaves it) and its landing after it.
 */
const retime = (p: SpinePlan): SpinePlan => {
  const scenes: PlanScene[] = p.scenes.map((s, i) => ({ ...s, from: FIT.bounds[i], to: FIT.bounds[i + 1] }));
  const bodyFrom = FIT.bounds[0];
  const bodyTo = FIT.bounds[FIT.bounds.length - 1];
  const acts: PlanAct[] = p.acts.map((a, i) => {
    const from = scenes[a.scenes[0]].from;
    const to = i + 1 < p.acts.length ? scenes[p.acts[i + 1].scenes[0]].from : bodyTo;
    return { ...a, from, to, bars: Math.max(1, Math.round((to - from) / BAR)), share: (to - from) / Math.max(1, bodyTo - bodyFrom) };
  });
  const downbeats = new Set(Array.from({ length: BARS + 1 }, (_, k) => b(1 + k)));
  const changes: PlanChange[] = p.changes.map((c) => {
    const at = scenes[c.to.scene].from;
    const [lead, land] = c.kind === 'cut' || c.kind === 'entry' ? [0, 1] : handoverFrames(c.kind, FPS);
    return { ...c, at, span: [at - lead, at + land], downbeat: downbeats.has(at) };
  });
  const last = changes[changes.length - 1];
  const end = p.end.kind === 'entry' ? { ...p.end, at: scenes[p.end.scene].from } : { ...p.end, at: last ? last.at : p.end.at };
  const world = p.world.map((w) => ({ ...w, at: acts[w.act].from }));
  return { ...p, from: bodyFrom, to: bodyTo, acts, scenes, changes, end, world };
};

/**
 * THE CONTRACT the checks read (grid-check --part spine, forensics --spine through out/cues.json, precheck): the acts,
 * the scenes, every change with its handover, the lines and where they live, the world's steps, the devices, the end.
 */
export const SPINE_PLAN: SpinePlan = retime(PLAN0);
export const SCENES = SPINE_PLAN.scenes;
export const CHANGES = SPINE_PLAN.changes;

/** One handover a scene change plays: its kind, cut, frames, the two scenes and forms it joins (stage.tsx draws it). */
export type HandoverPlan = { i: number; kind: HandoverKind | 'cut' | 'entry'; at: number; span: [number, number]; from: number; to: number; forms: [Form, Form]; boundary: boolean; draws: 'handover' | 'scene' | 'none'; dir?: 'left' | 'right' | 'up' | 'down' };
/** Every scene change, carried: the handover the element plays across it. */
export const HANDOVER_PLAN: HandoverPlan[] = CHANGES.map((c) => ({
  i: c.i,
  kind: c.kind,
  at: c.at,
  span: c.span,
  from: c.from.scene,
  to: c.to.scene,
  forms: [c.from.form, c.to.form],
  boundary: c.boundary,
  draws: c.kind === 'cut' || c.kind === 'entry' ? 'none' : HANDOVERS[c.kind].draws,
  ...(c.dir ? { dir: c.dir } : {}),
}));
/** The handover that brings scene i in / takes it out (undefined for the first / the last). */
export const handIn = (i: number) => HANDOVER_PLAN.find((h) => h.to === i);
export const handOut = (i: number) => HANDOVER_PLAN.find((h) => h.from === i);
/** The scene on screen at film frame F (the last one past the body). */
export const sceneAt = (F: number): PlanScene => SCENES.find((s) => F >= s.from && F < s.to) ?? (F < SCENES[0].from ? SCENES[0] : SCENES[SCENES.length - 1]);
/** The act's verb stem for a scene ('asks' -> 'ask'): the house scenes pick their device by it. */
export const verbOf = (scene: number) => stemVerb(SPINE_PLAN.acts[SCENES[scene].act]?.verb ?? '');

export const LOCKUP_SCENE = SPINE_PLAN.end.scene;
export const BODY_END = b(1 + BARS);
export const TOTAL = BODY_END + TAIL;

// ---------------------------------------------------------------------------------------------------- the acts

/** The acts as film windows (Film.tsx draws one Sequence each on the one stage); the last one holds through the tail. */
export const ACT: Record<string, { from: number; dur: number }> = Object.fromEntries(
  SPINE_PLAN.acts.map((a, i) => [a.id, { from: i === 0 ? 0 : a.from, dur: (i === SPINE_PLAN.acts.length - 1 ? TOTAL : a.to) - (i === 0 ? 0 : a.from) }]),
);
export type ActName = string;

// ---------------------------------------------------------------------------------------------------- the lines

export type LineTime = { id: string; text: string; raw: string; act: number; place: 'alone' | 'over' | 'around' | 'inside'; scene: number; in: number; resolved: number; out: number; claim: boolean };
/** The scene that draws a line: a 'word' scene in its act for a line alone, else the act's scene of its form (around:
 * the scene the element stands in; inside: the scene whose words carry it). */
const lineScene = (act: number, place: string, claim: boolean): number => {
  const own = SPINE_PLAN.acts[act].scenes.map((i) => SCENES[i]);
  if (place === 'alone') {
    const word = own.filter((s) => s.form === 'word');
    return (claim ? word[word.length - 1] : word[0])?.i ?? own[0].i;
  }
  return (own.find((s) => s.form !== 'word' && s.form !== 'mark') ?? own[0]).i;
};
const LINE_RAW = new Map<string, string>([...SPINE.acts.map((a, i) => [`act${i}`, a.line?.text ?? ''] as [string, string]), ['claim', SPINE.claim?.text ?? '']]);
/** Every line with the scene that draws it and its frames: in (first word), resolved (whole), out (gone). */
export const LINES: LineTime[] = SPINE_PLAN.lines.map((l) => {
  const claim = l.id === 'claim';
  const raw = (claim ? LINE_RAW.get('claim') : LINE_RAW.get(`act${l.act}`)) || l.text;
  const sc = lineScene(l.act, l.place, claim);
  const s = SCENES[sc];
  const n = keyWords(raw).length;
  const lead = l.place === 'inside' ? f60(handIn(sc) ? HANDOVERS_LAND(sc) : 0) : f60(4);
  const build = l.place === 'inside' ? f60(14) : f60(buildOf(n));
  // the line is whole on the music's 16th (its sound lands there): its first word moves by at most half a 16th
  const resolved = Math.max(s.from + lead + build - Math.round(BEAT / 8), q16(s.from + lead + build));
  const inF = resolved - build;
  const ho = handOut(sc);
  // a line around the element leaves once it is read (the element takes the frame back before it is handed on); a
  // line alone leaves as its key word is carried off; a line inside lives as long as its scene
  const read = f60(holdFor(n, pace));
  const out = l.place === 'around' ? Math.min(resolved + read, (ho ? ho.span[0] : s.to) - f60(12)) : ho ? Math.max(resolved + f60(20), ho.span[0] - (l.place === 'alone' ? f60(GATHER.lead) : 0)) : s.to;
  return { id: l.id, text: plain(raw), raw, act: l.act, place: l.place, scene: sc, in: inF, resolved, out: Math.min(out, s.to + f60(18)), claim };
});
function HANDOVERS_LAND(sc: number): number {
  const h = handIn(sc);
  if (!h || h.kind === 'cut' || h.kind === 'entry') return 0;
  return HANDOVERS[h.kind].land;
}
/** The line a scene draws (alone in a word scene, inside its words, around its element), if any. */
export const lineOf = (scene: number) => LINES.find((l) => l.scene === scene);
export const lineById = (id: string) => LINES.find((l) => l.id === id);

// ---------------------------------------------------------------------------------------------------- the end

/** The lockup is a house scene (src/bank.ts: a mark born from blobs, a line splitting round the wordmark, a bar that
 * floods ...): it lands the mark and the name at its own beats (BANK `lock` and `name`, shares of its length); the one
 * fact arrives under it once its move is done, and the whole keeps creeping in to the last frame while the music rings
 * out (creep: a front-loaded start, its time constant in 30 fps frames, then the house hold rate in % a 30 fps frame).
 * `mark`, `slide`, `fact` and `solo` (f@60) are the house lockup's own (acts/scenes.tsx lockupScene). */
export const LOCK = { mark: 0, name: 26, slide: 30, fact: 64, creep: { start: 0.04, tau30: 14, pct: 0.1 }, solo: 1.9 } as const;
const LS = SCENES[LOCKUP_SCENE];
const LE = CAST[LOCKUP_SCENE]?.bank ? BANK[CAST[LOCKUP_SCENE].bank as string] : undefined;
const LD = BANK_DUR[LOCKUP_SCENE] || f60(90);
export const LOCKUP_AT = q16(LS.from + LD * (LE?.lock ?? 0.5));
export const NAME_AT = Math.max(LOCKUP_AT + 2, q16(LS.from + LD * (LE?.name ?? 0.62)));
export const FACT_AT = Math.max(NAME_AT + 2, q16(LS.from + LD + f60(4) + f60(18)) - f60(18));
/** The settle-out: the whole frame goes into the world's deep tone WITH the music's ring-out: it starts `after` f@60
 * past the body's last bar line (the final hit lands first), runs to the last frame and completes there (never cut
 * mid-fade); `fade` is the shortest it may be (a film with no ring-out). */
export const END_FADE = { fade: 30, after: 8 } as const;
export const FADE_FROM = Math.min(TOTAL - f60(END_FADE.fade), BODY_END + f60(END_FADE.after));

// ---------------------------------------------------------------------------------------------------- COPY

export type Copy = {
  id: string;
  text: string; // exactly what is on screen
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name';
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};
/** Every string on screen with its frames: the lines (copy), the product's words (ui), the name and the fact. */
export const COPY: Copy[] = [
  ...LINES.map((l): Copy => ({ id: l.id, text: l.text, in: l.in, resolved: l.resolved, out: l.out, kind: l.place === 'inside' ? 'ui' : 'copy' })),
  ...SCENES.flatMap((s) => (SCENE_DEF[s.i]?.ui ?? []).map((t, k): Copy => ({ id: `s${s.i + 1}ui${k + 1}`, text: t, in: s.from, resolved: s.from + f60(12), out: s.to, kind: 'ui' }))),
  { id: 'name', text: IDENTITY.name, in: NAME_AT, resolved: NAME_AT + f60(LOCK.slide), out: TOTAL, kind: 'name' } as Copy,
  { id: 'close', text: CLOSE, in: FACT_AT, resolved: FACT_AT + f60(18), out: TOTAL, kind: 'copy' } as Copy,
].sort((x, y) => x.in - y.in);
/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
/** The fragments of one chain, in order of arrival (none in this template: every line is whole). */
export const chainOf = (id: string): Copy[] => COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);

// ---------------------------------------------------------------------------------------------------- CUE

/** Named frames: act and scene starts, every handover's cut, each line whole, the lockup, the name and the fact. */
export const CUE: Record<string, number> = {};
SPINE_PLAN.acts.forEach((a, i) => (CUE[`act${i + 1}`] = a.from));
SCENES.forEach((s) => (CUE[`s${s.i + 1}`] = s.from));
HANDOVER_PLAN.forEach((h) => (CUE[`h${h.i + 1}`] = h.at));
LINES.forEach((l) => (CUE[l.id] = l.resolved));
CUE.lockup = LOCKUP_AT;
CUE.name = NAME_AT;
CUE.close = FACT_AT + f60(18);
/** No cue is off the grid on purpose. */
export const OFFGRID: Record<string, string> = {};

// ---------------------------------------------------------------------------------------------------- declarations

export type BlurPolicy = 'crisp' | 'camera';
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
export type Flash = { f: number; frames: 1 | 2; id: string };
export type CameraBlurRange = { from: number; to: number; id: string };
export type EndLock = { from: number; to: number };
export type ColourRange = { from: number; to: number; id: string };
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[]; colour?: ColourRange[] };
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** One seam per scene change (lib/spine spineDeclares: the handover in its id, its element and forms), the settle-out. */
export const SEAMS: Seam[] = [...spineDeclares(SPINE_PLAN).seams, { at: FADE_FROM, kind: 'fadeEnd' as SeamKind, id: 'fadeEnd:settle-out' }].sort((x, y) => x.at - y.at);
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** The film's one colour event: the world's turn (src/world.tsx), from its cut until the flood has covered the frame. */
const TURN = SPINE_PLAN.world.find((w) => w.step === 'turn');
export const COLOUR: ColourRange[] = TURN ? [{ from: TURN.at, to: TURN.at + f60(36), id: 'world-turn' }] : [];
/** The one lock: from the frame the fact is whole, the lockup holds (creeping) to the end. */
export const END: EndLock = { from: copy('close').resolved, to: TOTAL };
export const REVEAL = CUE.lockup;
export const SPRING_CLASS = '';
/** CUE names that must land on a music event: the act turns. */
export const STRUCTURAL: string[] = [];
export const SALIENCE: Record<string, Salience> = Object.fromEntries(
  Object.keys(CUE).map((k) => [k, /^line|^claim|^name$|^close$/.test(k) ? 'copy' : /^act/.test(k) ? 'cut' : /^h\d/.test(k) ? 'move' : /^s\d/.test(k) ? 'move' : k === 'end' ? 'cut' : 'hit'] as const),
);

/** The median scene length in frames (a launch reads at 1.5-2.5 s a point). */
export const MEDIAN_SHOT = ((): number => {
  const d = SCENES.map((s) => s.to - s.from).sort((x, y) => x - y);
  return d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
})();

/** What the deal and the spine chose, for a print: `npx tsx -e "import { PLAN_PRINT } from './src/timeline'; console.log(PLAN_PRINT)"`. */
export const PLAN_PRINT = [
  `${SPINE_PLAN.sentence}  [${DEAL.ground}, ${DEAL.voice}; ${SCENES.length} scenes, median ${(MEDIAN_SHOT / FPS).toFixed(2)} s, ${CAST.filter((c) => c.big).length} big (*), eased x${FIT_K.toFixed(3)}]`,
  ...SPINE_PLAN.acts.map((a) => `act ${a.i + 1} ${a.verb} (${a.bars} bars, ${Math.round(a.share * 100)} %, world ${a.world}): ${a.scenes.map((i) => `${SCENES[i].name}:${SCENES[i].form}=${CAST[i]?.bank ?? 'line'}${CAST[i]?.big ? '*' : ''} ${((SCENES[i].to - SCENES[i].from) / FPS).toFixed(2)} s`).join(' | ')}`),
  ...HANDOVER_PLAN.map((h) => `  ${h.forms[0]} -> ${h.forms[1]}: ${h.kind} at ${(h.at / FPS).toFixed(2)} s`),
  ...LINES.map((l) => `  line ${l.id} (${l.place}) "${l.text}" ${(l.in / FPS).toFixed(2)}-${(l.out / FPS).toFixed(2)} s`),
  `  issues: ${[...SPINE_PLAN.issues.errors.map((e) => `ERROR ${e}`), ...SPINE_PLAN.issues.warnings].join(' | ') || 'none'}`,
].join('\n');
