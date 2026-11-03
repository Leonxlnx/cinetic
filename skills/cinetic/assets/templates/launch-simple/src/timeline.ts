// The single source of truth for time, for a launch played as a spine: the script (src/spine.ts: one sentence, one
// case, one element, 3-5 acts) laid on the music's bars, every scene change handed over by the element (HANDOVER_PLAN),
// the lines placed (alone for the promise and the claim, inside the product's words or around the element between),
// the world's one step per act, the lockup grown out of the last form. Everything here is derived from src/spine.ts,
// src/deal.ts and the music, so a new script, track or tempo needs no edit here. Picture (src/acts), sound (src/sync.ts
// -> out/cues.json) and the checks (scripts/grid-check.ts --part spine reads SPINE_PLAN) import this file. Think in
// beats, never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { type Form, handoverFrames, HANDOVERS, type HandoverKind, planSpine, type PlanChange, type PlanScene, type Spine, spineDeclares, type SpinePlan, stemVerb } from './lib/spine';
import { ACT_BARS, BARS, CLOSE, type FilmScene, SPINE } from './spine';
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

const SP: Spine = { ...SPINE, acts: SPINE.acts.map((a, i) => ({ ...a, bars: a.bars ?? ACT_BARS?.[i] })) } as Spine;
const PLAN0: SpinePlan = planSpine(SP, { fps: FPS, b, bars: BARS });
/** Each scene's script entry, in plan order (the lockup the plan adds at the end has none). */
export const SCENE_DEF: (FilmScene | undefined)[] = PLAN0.scenes.map((s) => SPINE.acts[s.act]?.scenes[s.k]);

/**
 * Scenes on the beats their weights ask for (src/spine.ts `beats`; lib/spine shares an act's beats evenly), the lockup
 * where the plan put it; the changes follow their scenes (each lands on the incoming scene's first frame, its lead
 * before it, its landing after it).
 */
const retime = (p: SpinePlan): SpinePlan => {
  const scenes: PlanScene[] = p.scenes.map((s) => ({ ...s }));
  let bar0 = 1;
  for (const act of p.acts) {
    const own = act.scenes.map((i) => scenes[i]).filter((s) => s.form !== 'mark' || SCENE_DEF[s.i]);
    const until = act.scenes.map((i) => scenes[i]).find((s) => s.form === 'mark' && !SCENE_DEF[s.i])?.from ?? act.to;
    const beats = Math.round((until - act.from) / BEAT);
    const w = own.map((s) => Math.max(0.25, SCENE_DEF[s.i]?.beats ?? 1));
    const sum = w.reduce((a, v) => a + v, 0);
    let acc = 0;
    const at = (beat: number) => (beat >= beats ? until : b(bar0 + Math.floor(beat / 4), beat % 4));
    own.forEach((s, j) => {
      const from = Math.round((acc / sum) * beats);
      acc += w[j];
      const to = j === own.length - 1 ? beats : Math.max(from + 1, Math.round((acc / sum) * beats));
      s.from = j === 0 ? act.from : at(from);
      s.to = at(to);
    });
    bar0 += act.bars;
  }
  const downbeats = new Set(Array.from({ length: BARS + 1 }, (_, k) => b(1 + k)));
  const changes: PlanChange[] = p.changes.map((c) => {
    const at = scenes[c.to.scene].from;
    const [lead, land] = c.kind === 'cut' || c.kind === 'entry' ? [0, 1] : handoverFrames(c.kind, FPS);
    return { ...c, at, span: [at - lead, at + land], downbeat: downbeats.has(at) };
  });
  const last = changes[changes.length - 1];
  const end = p.end.kind === 'entry' ? { ...p.end, at: scenes[p.end.scene].from } : { ...p.end, at: last ? last.at : p.end.at };
  return { ...p, scenes, changes, end };
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

/** The text voice (deal.ts voice): word fade, stagger, re-centre (f@60). The re-centre front-loads (E.jump: most of
 * the move on its first frame); a new word is born in the accent and drains to ink. */
export const VOICE = { fade: 14, stagger: 5, recentre: 14, rise: 0.55, drain: 7 } as const;
/** A line alone that becomes the element: once read, its key word takes the centre as the other words part (f@60 before the handover's lead). */
export const GATHER = { lead: 12, dur: 10 } as const;
/** When a line of n words is whole, f@60 from its first frame. */
export const buildOf = (n: number) => Math.max(0, n - 1) * VOICE.stagger + VOICE.fade;

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

/** The lockup: the mark grows out of the last form (the end's handover lands it), the name slides out from behind it, the
 * one fact under it; then it holds (a slow creep, 3 %) to the end while the music rings out. f@60 from the lockup scene. */
export const LOCK = { mark: 0, name: 26, slide: 30, fact: 64, creep: 0.03 } as const;
const LS = SCENES[LOCKUP_SCENE];
const landOfEnd = (() => {
  const h = handIn(LOCKUP_SCENE);
  return h && h.kind !== 'cut' && h.kind !== 'entry' ? f60(HANDOVERS[h.kind].land) : 0;
})();
export const LOCKUP_AT = q16(LS.from + landOfEnd);
export const NAME_AT = q16(LOCKUP_AT + f60(LOCK.name));
export const FACT_AT = q16(NAME_AT + f60(LOCK.fact) + f60(18)) - f60(18);
/** The frame the whole frame settles out with the music's ring-out (declared fadeEnd). */
export const END_FADE = { fade: 30 } as const;

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
export const SEAMS: Seam[] = [...spineDeclares(SPINE_PLAN).seams, { at: TOTAL - f60(END_FADE.fade), kind: 'fadeEnd' as SeamKind, id: 'fadeEnd:settle-out' }].sort((x, y) => x.at - y.at);
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

/** What the deal and the spine chose, for a print: `npx tsx -e "import { PLAN_PRINT } from './src/timeline'; console.log(PLAN_PRINT)"`. */
export const PLAN_PRINT = [
  `${SPINE_PLAN.sentence}  [${DEAL.ground}, ${DEAL.voice}]`,
  ...SPINE_PLAN.acts.map((a) => `act ${a.i + 1} ${a.verb} (${a.bars} bars, ${Math.round(a.share * 100)} %, world ${a.world}): ${a.scenes.map((i) => `${SCENES[i].name}:${SCENES[i].form} ${((SCENES[i].to - SCENES[i].from) / FPS).toFixed(2)} s`).join(' | ')}`),
  ...HANDOVER_PLAN.map((h) => `  ${h.forms[0]} -> ${h.forms[1]}: ${h.kind} at ${(h.at / FPS).toFixed(2)} s`),
  ...LINES.map((l) => `  line ${l.id} (${l.place}) "${l.text}" ${(l.in / FPS).toFixed(2)}-${(l.out / FPS).toFixed(2)} s`),
  `  issues: ${[...SPINE_PLAN.issues.errors.map((e) => `ERROR ${e}`), ...SPINE_PLAN.issues.warnings].join(' | ') || 'none'}`,
].join('\n');
