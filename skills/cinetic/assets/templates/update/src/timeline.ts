// The single source of truth for time, for an update film ("vX is out"): the hook (the name and the version on a clean
// ground, moving from the first frame), then each change as its line (alone on the ground of the scene it leads into, in
// and read in 1.2 s) and its house scene (src/scenes, dealt in src/deal.ts HEROES) in 2-4 s (a typed change 3 s), a scene
// that takes over the element the one before hands on following it on a match cut, then the mark pulling back into the
// lockup (mark-pullback, one snap) and the version landing on the bar line that ends the body, the lockup alive and gone
// within 2 s. Every limit is src/deal.ts LIMITS; FAULTS at the end of this file fails a plan outside them. Picture (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this
// file. The facts live in src/update.ts; this file only places them on the grid. Keep it free of React and CSS imports:
// Node scripts load it directly.
export { DEAL_PLAN, PLAYED } from './deal';
import { DEAL, HEROES, LIMITS, LINE_MIN60, LINES, LINKED, macroTypeDur30, type Move, PULLBACK30, RESOLVE60, SCENE_SPEC, splitLine } from './deal';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { type Change, spokenChange, UPDATE } from './update';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track (`python3 scripts/audio/track.py fit`), BPM becomes the track's and b() follows its bars.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites
 * the `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The film's pace (src/lib/pace.ts): an update film is short and runs at the crisp launch tempo. */
export const PACE_NAME: PaceName = 'crisp';

/** Frames per beat (a whole number without a track: 60 fps -> 90, 100, 120, 144, 150 BPM). */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/** Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat. */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));

/** A choreography length written in 60 fps frames, converted to this film's fps (rounded). */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
/** Film frames per scene frame (the house scenes write every number at 30 fps). */
export const K30 = FPS / 30;

/** How many changes the film shows (2-3, from src/update.ts). */
export const N = UPDATE.changes.length;
/** Absolute frame of the n-th beat from the film's first downbeat (sub = 16ths): a whole frame on the grid. */
export const beat = (n: number, sub = 0) => b(1 + Math.floor(n / 4), n % 4, sub);
/** Absolute frame of a fractional beat position, on the 16th grid (2.25 = the second 16th of beat 2). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  return beat(Math.floor(q / 4), q % 4);
};
/** The first 16th of the grid at or after frame f. */
export const g16 = (f: number) => {
  let q = Math.max(0, Math.floor((f / BEAT) * 4) / 4 - 0.25);
  while (bt(q) < f - 1e-9) q += 0.25;
  return bt(q);
};
/** The first bar line at or after frame f. */
export const gBar = (f: number) => {
  let n = Math.max(1, Math.floor(f / BAR));
  while (b(n) < f - 1e-9) n++;
  return b(n);
};

const pace = PACE[PACE_NAME];
/** The frames a line of n words stays readable once resolved (the pace's read; grid-check holds every line to it). */
export const readHold = (n: number): number => f60(holdFor(n, pace));
/** The move this film dealt a line (src/deal.ts LINES). */
export const moveOf = (id: string): Move => LINES.move[id] ?? LINES.voice;
/** Frames from a move's start until a line of `n` words is read, at the move's natural speed (src/deal.ts RESOLVE60). */
export const resolveSpan = (move: Move, n: number): number => f60(RESOLVE60[move](Math.max(1, n)));

// ---------------------------------------------------------------------------------------------- the limits, in frames
/** src/deal.ts LIMITS at this film's fps: the plan is built inside them, and FAULTS (below) fails a plan outside them. */
export const LIM = {
  line: Math.round(LIMITS.LINE_S * FPS),
  scene: Math.round(LIMITS.SCENE_S * FPS),
  change: Math.round(LIMITS.CHANGE_S * FPS),
  type: Math.round(LIMITS.TYPE_S * FPS),
  hook: Math.round(LIMITS.HOOK_S * FPS),
  lock: Math.round(LIMITS.LOCK_S * FPS),
  tail: Math.round(LIMITS.TAIL_S * FPS),
} as const;
/** The last 16th of the grid at or before frame f. */
export const l16 = (f: number) => {
  let q = Math.floor((f / BEAT) * 4) / 4 + 0.5;
  while (q > 0 && bt(q) > f + 1e-9) q -= 0.25;
  return bt(Math.max(0, q));
};

// ---------------------------------------------------------------------------------------------- the scenes' own frames
export { macroTypeDur30 };
/** A scene's own length for change c (frames at 30 fps, from its first frame). */
export const sceneDur30 = (id: string, c: Change): number => (id === 'macro-type' && c.show.kind === 'type' ? macroTypeDur30(c.show.text) : SCENE_SPEC[id].dur);
/** The scene frames (30 fps) the film enters a scene after (src/deal.ts SCENE_SPEC skip): its first frames are cut. */
export const skipOf = (id: string): number => SCENE_SPEC[id]?.skip ?? 0;
/**
 * When the line a scene sets inside it is read (frames at 30 fps from the scene's first frame), and when it starts to
 * leave: porthole-line's two lines cut on whole behind the porthole, the bottom one 12 f after the top; decode-title's
 * title decodes; orbit-chips' line stands on the orbits from the first frame.
 */
export const carriedLine = (id: string, c: Change): { in: number; resolved: number; out: number } | null => {
  if (id === 'porthole-line') {
    const [, bottom] = splitLine(c);
    return { in: 36, resolved: 48 + PORTHOLE_EVERY * (bottom.split(/\s+/).length - 1) + 5, out: 72 };
  }
  if (id === 'decode-title') return { in: 1, resolved: 18, out: SCENE_SPEC[id].dur };
  if (id === 'orbit-chips') return { in: 0, resolved: 6, out: 43 };
  return null;
};
/** porthole-line's frames between the words of a line (scenes/porthole-line PORTHOLE.words.every: 0, each line whole). */
const PORTHOLE_EVERY = 0;

// ---------------------------------------------------------------------------------------------- the plan
/** A change's line card (absolute frames): its ground is the scene's it leads into. `offgrid`: its cut follows the read, off the 16th grid. */
export type Card = { from: number; to: number; in: number; resolved: number; offgrid?: boolean };
/**
 * A change's scene (absolute frames): `from`, `to`; `dur30` its own length; `skip` the scene frames cut from its start;
 * `rest`/`extra`: the film gives it `extra` frames at its scene frame `rest` (played at a quarter speed over the
 * stretch: slower, never frozen); `endless`: it ends on its element without its own last action (the next scene's pointer
 * takes it); `pressed`: the scene before pressed for it.
 */
export type ScenePlan = { id: string; from: number; to: number; dur30: number; skip: number; rest?: number; extra: number; endless: boolean; pressed: boolean; offgrid?: boolean };
export type ChangePlan = { i: number; id: string; card: Card | null; scene: ScenePlan; line: { in: number; resolved: number; out: number }; typed: boolean };
/** The stretch a scene can play slower over: 4 scene frames at its rest. */
const STRETCH30 = 4;

/**
 * The hook's frames: the name already moving on the first frame (its move starts `lead` frames before the film: a film
 * opens on motion), the version arriving (pill, roll or tag), read, out within LIM.hook.
 */
const hookFrames = (extra: number) => {
  const name = UPDATE.name;
  const n = wordCount(name);
  const lead = f60(4);
  const nameRes = Math.max(1, resolveSpan(LINES.voice, n) - lead);
  const verAt = DEAL.hook === 'roll' ? nameRes + f60(2) : DEAL.hook === 'tag' ? nameRes + f60(4) : nameRes;
  const resolved = verAt + f60(DEAL.hook === 'tag' ? 16 : 14);
  const want = g16(resolved + readHold(n + 1) + extra);
  return { name: -lead, nameRes, version: verAt, resolved, out: Math.min(want, Math.max(g16(resolved + readHold(n + 1)), l16(LIM.hook))) };
};

/**
 * A lone line card from frame `from` for `n` words with at most `cap` frames: the move's natural resolve, then the pace's
 * read, the cut on the 16th grid; the move runs faster (down to LINE_MIN60) rather than the card running over `cap`, and
 * where no 16th fits the cut follows the read off the grid.
 */
const cardAt = (from: number, n: number, move: Move, cap: number): Card => {
  const hold = readHold(n);
  const fastest = f60(LINE_MIN60);
  const natural = Math.max(fastest, Math.min(resolveSpan(move, n), cap - hold));
  let to = g16(from + natural + hold);
  if (to - from > cap) to = l16(from + cap);
  if (to - from < hold + fastest) return { from, to: from + hold + Math.max(fastest, Math.min(natural, cap - hold)), in: from, resolved: from + Math.max(fastest, Math.min(natural, cap - hold)), offgrid: true };
  return { from, to, in: from, resolved: Math.min(from + natural, to - hold) };
};

/** The film's plan with `extra` frames given to its parts (the hook, each scene with a rest, the pull-back's rest). */
const planWith = (extra: { hook: number; scene: number[]; pull: number }) => {
  const hook = hookFrames(extra.hook);
  let at = hook.out;
  const changes: ChangePlan[] = UPDATE.changes.map((c, i) => {
    const id = HEROES[i];
    const spec = SCENE_SPEC[id];
    const linkedIn = i > 0 && LINKED[i - 1];
    const typed = c.show.kind === 'type';
    const dur30 = sceneDur30(id, c);
    const skip = skipOf(id);
    const endless = !!LINKED[i] && !!spec.endless;
    // the scene's own frames, and the read its carried line needs at its rest
    const cl = carriedLine(id, c);
    const need = cl ? Math.max(0, readHold(wordCount(spokenChange(c))) - (cl.out - cl.resolved) * K30 + f60(4)) : 0;
    const own = (dur30 - skip) * K30;
    const n = wordCount(spokenChange(c));
    const hasCard = !spec.carries && !linkedIn;
    // the change's ceiling: a typed change TYPE_S, any change CHANGE_S, any scene SCENE_S
    const ceiling = typed ? LIM.type : LIM.change;
    const lineCap = hasCard ? Math.min(LIM.line, ceiling - Math.min(LIM.scene, own) - (own % 1 ? 1 : 0)) : 0;
    let card: Card | null = null;
    if (hasCard) {
      card = cardAt(at, n, moveOf(`change${i + 1}`), Math.max(readHold(n) + f60(LINE_MIN60), lineCap));
      at = card.to;
    }
    const from = at;
    const sceneCeil = Math.min(LIM.scene, ceiling - (card ? card.to - card.from : 0));
    let ext = spec.rest !== undefined ? Math.max(0, Math.min(sceneCeil - own, need + extra.scene[i])) : 0;
    let to = from + own + ext;
    // the cut out of a scene sits on the grid: a scene with a rest takes the frames to it there, any other holds its last
    // frame creeping; where the 16th after would run past the change's limit, the cut takes the 16th before (a held end
    // a few frames shorter) or, failing that, the scene's own last frame off the grid
    let snapped = g16(to);
    let offgrid = false;
    if (snapped - from > sceneCeil) {
      const d = l16(to);
      if (d >= to - f60(4) && d > from) snapped = d;
      else {
        snapped = to;
        offgrid = true;
      }
    }
    if (spec.rest !== undefined) ext += snapped - to;
    to = snapped;
    const scene: ScenePlan = { id, from, to, dur30, skip, rest: spec.rest, extra: ext, endless, pressed: linkedIn, offgrid };
    at = to;
    const line = card ? { in: card.in, resolved: card.resolved, out: card.to } : cl ? { in: sceneAt(scene, cl.in), resolved: sceneAt(scene, cl.resolved), out: sceneAt(scene, cl.out) } : { in: from, resolved: from, out: from };
    return { i, id: c.id, card, scene, line, typed };
  });
  // the end: the pull-back (slower over its rest by `pull`), the one snap to the lockup, the version once it is read
  const markIn = at;
  const lockIn = markIn + PULLBACK30.lockup * K30 + extra.pull;
  return { hook, changes, markIn, lockIn, ready: lockIn + VERSION_AFTER };
};

/**
 * The film frame (absolute) at which scene frame s30 (frames at 30 fps from the scene's first frame) plays: the film
 * enters at the scene's `skip`, then K30 film frames per scene frame, except over the stretch at its rest, which takes
 * its extra frames too.
 */
export const sceneAt = (s: ScenePlan, s30: number): number => {
  const k = s30 - s.skip;
  if (s.rest === undefined || s30 <= s.rest) return Math.round(s.from + k * K30);
  const into = Math.min(s30 - s.rest, STRETCH30);
  const over = Math.max(0, s30 - s.rest - STRETCH30);
  return Math.round(s.from + (s.rest - s.skip) * K30 + (into / STRETCH30) * (STRETCH30 * K30 + s.extra) + over * K30);
};
/** The scene frame (30 fps, fractional) a scene plays at film frame f (absolute): the inverse of sceneAt. */
export const sceneFrame = (s: ScenePlan, f: number): number => {
  const local = f - s.from;
  if (s.rest === undefined || local <= (s.rest - s.skip) * K30) return s.skip + local / K30;
  const span = STRETCH30 * K30 + s.extra;
  const into = local - (s.rest - s.skip) * K30;
  if (into <= span) return s.rest + (into / span) * STRETCH30;
  return s.rest + STRETCH30 + (into - span) / K30;
};
/** The pull-back's own frame (30 fps, fractional) at film frame f: slower over its rest by the plan's `pull` frames. */
export const pullbackFrame = (f: number): number => {
  const local = f - CLOSE.markIn;
  const rest = SCENE_SPEC['mark-pullback'].rest ?? PULLBACK30.cut;
  if (local <= rest * K30) return local / K30;
  const span = (PULLBACK30.lockup - rest) * K30 + CLOSE.pull;
  const into = local - rest * K30;
  if (into <= span) return rest + (into / span) * (PULLBACK30.lockup - rest);
  return PULLBACK30.lockup + (into - span) / K30;
};

/**
 * The lockup: the mark-pullback plays from `markIn` (its one snap to the lockup at 28 scene frames, the parts closing, the
 * letters on, settled by 43), the version lands on the first bar line once the lockup is read (VERSION_AFTER): the bar
 * line that ends the body (the track's final hit). The film ends LIMITS.LOCK_S after the lockup's first frame, at least
 * LIMITS.TAIL_S after the version, so the lockup never stands: when the bar line is further off, the hook, the scenes with a
 * rest and the pull-back's rest take the difference first (a little longer each, inside their limits).
 */
/** Frames from the lockup's first frame until the version may land: its name on and the lockup settling (about half a second). */
const VERSION_AFTER = Math.max(f60(30), Math.ceil((1 + 0.9 * [...UPDATE.name].length + 4) * K30));
/** The latest the version may land after the lockup's first frame: the lockup's limit less the tail. */
const VERSION_LATEST = LIM.lock - LIM.tail;
const PLAN = (() => {
  const zero = { hook: 0, scene: UPDATE.changes.map(() => 0), pull: 0 };
  const p0 = planWith(zero);
  const lock0 = gBar(p0.ready);
  const wait0 = lock0 - p0.lockIn;
  if (wait0 <= VERSION_LATEST) return { ...p0, lockup: lock0, pull: 0 };
  // capacities: the hook up to its limit, each scene with a rest up to its limits (planWith clamps), the pull-back's rest a quarter second
  const cap = { hook: Math.max(0, l16(LIM.hook) - p0.hook.out), scene: p0.changes.map((c) => (c.scene.rest !== undefined ? f60(36) : 0)), pull: f60(15) };
  const total = cap.hook + cap.scene.reduce((a, v) => a + v, 0) + cap.pull;
  let best = { ...p0, lockup: lock0, pull: 0 };
  for (let give = total; give > 0; give -= Math.max(1, Math.round(BEAT / 8))) {
    const k = give / Math.max(1, total);
    const ex = { hook: Math.floor(cap.hook * k), scene: cap.scene.map((v) => Math.floor(v * k)), pull: Math.floor(cap.pull * k) };
    const p = planWith(ex);
    if (gBar(p.ready) === lock0) {
      best = { ...p, lockup: lock0, pull: ex.pull };
      break;
    }
  }
  return best;
})();

/** The hook's frames. */
export const HOOK = PLAN.hook;
/** Each change's line card (or null: its scene carries its line, or the scene before hands it the element) and scene. */
export const CHANGES: ChangePlan[] = PLAN.changes;

/** The end's frames: the pull-back's cut in (`markIn`), the lockup (the one snap), the name, the version landing on its bar line. */
export const CLOSE = (() => {
  const markIn = PLAN.markIn;
  const lockIn = PLAN.lockIn;
  const lockup = PLAN.lockup;
  return {
    markIn,
    pull: PLAN.pull,
    lockIn,
    settled: lockIn + (PULLBACK30.settled - PULLBACK30.lockup) * K30,
    nameIn: lockIn,
    named: lockIn + Math.ceil((1 + 0.9 * [...UPDATE.name].length + 4) * K30),
    turn: markIn + 10 * K30,
    versionIn: lockup - f60(10),
    lockup,
  };
})();

/**
 * After the version mark the lockup keeps pushing while the music ends, never on a cut: the film ends LIMITS.LOCK_S after
 * the lockup's first frame and never less than LIMITS.TAIL_S after the version (scripts/audio/score.py fades the track's
 * ring-out under the last 1.3 s): the lockup is read, it lives, and the film is over.
 */
const BODY_END = CLOSE.lockup;
export const TAIL = Math.max(LIM.tail, CLOSE.lockIn + LIM.lock - BODY_END);
export const TOTAL = BODY_END + TAIL;
/**
 * The grounds as runs (grid-check grounds): the film's base everywhere (the hook, every line card and scene, the lockup),
 * the accent field once at most (toast-stack's flood with its card), then back: one deliberate change.
 */
export const GROUND_PLAN: { from: number; to: number; ground: 'base' | 'field' }[] = (() => {
  const field = (id: string) => SCENE_SPEC[id]?.tone === 'field';
  const runs: { from: number; to: number; ground: 'base' | 'field' }[] = [];
  const put = (from: number, to: number, ground: 'base' | 'field') => {
    if (to <= from) return;
    const last = runs[runs.length - 1];
    if (last && last.ground === ground) last.to = Math.max(last.to, to);
    else runs.push({ from: last ? last.to : 0, to, ground });
  };
  put(0, HOOK.out ?? 0, 'base');
  for (const c of CHANGES) put(c.card ? c.card.from : c.scene.from, c.scene.to, field(c.scene.id) ? 'field' : 'base');
  put(CLOSE.markIn, TOTAL, 'base');
  if (runs.length) runs[runs.length - 1].to = TOTAL;
  return runs;
})();
/** The film's bars in the body (track.py fit reads it with REVEAL and ACT.end to cut the track to the picture). */
export const BARS = Math.round(((BODY_END - b(1)) / BAR) * 2) / 2;

/**
 * One act: the film cuts on the plan's own frames (the 16th grid), never on bar lines, so it declares no act boundary
 * the track would have to land on; the structure the track lands on is the version mark (STRUCTURAL) on the bar line
 * that ends the body. Root.tsx's Act1 is the whole film.
 */
export const ACT: Record<string, { from: number; dur: number }> = { film: { from: 0, dur: TOTAL } };
/** Where each act starts, in beats (kept for the starter's helpers). */
export const BEATS = { hook: 0, end: CLOSE.markIn / BEAT, last: BODY_END / BEAT } as const;

/** One scene cue (the scene's own sound, src/scenes meta cues) placed in the film: its name. */
const sceneCueName = (i: number, k: number) => `s${i}_${k}`;
/** A scene's own sound (its meta entry's cues): frame at 30 fps from its first frame, kind, weight. */
export type Moment = { f: number; kind: string; id: string; w: number };

// Named sync points (absolute frames). Picture code reads these; src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {
  version: HOOK.version, // the version arrives beside the name
  hookRead: Math.min(HOOK.out - 1, g16(HOOK.resolved)),
  hookOut: HOOK.out,
  ...Object.fromEntries(
    CHANGES.flatMap((c) => [
      ...(c.card ? [[`card${c.i}`, c.card.from], [`read${c.i}`, c.card.resolved]] : []),
      [`scene${c.i}`, c.scene.from],
      [`sceneEnd${c.i}`, c.scene.to],
      ...(!c.card ? [[`said${c.i}`, c.line.resolved]] : []),
    ]),
  ),
  markIn: CLOSE.markIn,
  markTurn: CLOSE.turn,
  lockIn: CLOSE.lockIn,
  settled: CLOSE.settled,
  versionIn: CLOSE.versionIn,
  lockup: CLOSE.lockup,
  end: CLOSE.lockup,
};
/**
 * The scene moments the picture lands on its own measured frames (each scene's meta cues, at their place in the film):
 * src/sync.ts voices them with their meta cue's kind; the CUEs below name them `s<change>_<k>` so the checks see the
 * picture's events.
 */
export const SCENE_MOMENTS: (Moment & { i: number; k: number; at: number })[] = [];
const m = (f: number, kind: string, id: string, w: number): Moment => ({ f, kind, id, w });
/**
 * The moments each scene's meta lists (its `cues`: frames at 30 fps; a scene whose length follows its content,
 * macro-type, counts its closing moments from its end). Written here so this file stays free of React: acts/scenes.tsx
 * checks them against the scenes' own meta entries in the Studio.
 */
export const MOMENTS30: Record<string, (dur30: number) => Moment[]> = {
  'porthole-line': () => [m(8, 'click', 'press', 0.8), m(14, 'swell', 'open', 0.6), m(23, 'pop', 'picture', 0.7), m(36, 'hit', 'line-top', 0.9), m(48, 'hit', 'line-bottom', 0.8), m(72, 'whoosh', 'exit', 0.5)],
  'decode-title': () => [m(0, 'suck', 'swirl', 0.6), m(4, 'pop', 'decode', 0.7), m(7, 'pop', 'decode-2', 0.5), m(15, 'bell', 'title', 0.7), m(27, 'whoosh', 'button-flies', 0.6), m(32, 'pop', 'button', 0.6), m(44, 'click', 'click', 0.8)],
  'macro-type': (d) => [m(1, 'whoosh', 'pointer-in', 0.5), m(25, 'click', 'field', 0.8), m(28, 'swell', 'bloom', 0.4), m(37, 'key', 'typing', 0.5), m(d - 17, 'whoosh', 'run-to-send', 0.4), m(d - 6, 'click', 'send', 0.9)],
  'glass-prompt': () => [m(2, 'swell', 'rise', 0.4), m(21, 'pop', 'glint', 0.4), m(27, 'whoosh', 'whip-left', 0.6), m(41, 'key', 'typing', 0.4), m(46, 'riser', 'whip-right', 0.7)],
  'toast-stack': () => [m(4, 'bell', 'first', 0.7), m(7, 'pop', 'arrive-2', 0.6), m(11, 'pop', 'arrive-3', 0.6), m(15, 'pop', 'arrive-4', 0.6), m(19, 'pop', 'arrive-5', 0.5)],
  'page-fly': () => [m(2, 'whoosh', 'page-rises', 0.6), m(12, 'land', 'headline', 0.6), m(24, 'tick', 'rows', 0.3), m(36, 'tick', 'rows-2', 0.3), m(65, 'whoosh', 'exit', 0.5)],
  'photo-river': () => [m(0, 'hit', 'first', 0.6), m(8, 'tick', 'swaps', 0.4), m(26, 'riser', 'faster', 0.5), m(45, 'whoosh', 'river', 0.7), m(61, 'hit', 'last', 0.8)],
  'photo-counters': () => [m(0, 'swell', 'photo', 0.5), m(2, 'whoosh', 'card-big', 0.5), m(4, 'tick', 'counting', 0.3), m(11, 'pop', 'card-2', 0.5), m(18, 'pop', 'card-3', 0.5), m(47, 'whoosh', 'exit', 0.6)],
  'orbit-chips': () => [m(9, 'whoosh', 'chips-fly', 0.7), m(11, 'pop', 'chips-land-1', 0.7), m(22, 'tick', 'chips-small', 0.5), m(43, 'suck', 'chips-dip', 0.6)],
  'photo-orbit': () => [m(0, 'hit', 'line-glow', 0.9), m(1, 'whoosh', 'tiles-dive', 0.7), m(5, 'tick', 'word-2', 0.4), m(10, 'tick', 'word-3', 0.4), m(56, 'riser', 'flare-build', 0.6), m(66, 'hit', 'flare', 0.9)],
  'card-rivers': () => [m(1, 'click', 'rivers-in', 0.6), m(14, 'tock', 'beat', 0.5), m(38, 'hit', 'word-swap', 0.9), m(71, 'hit', 'accelerate', 0.8), m(77, 'hit', 'accelerate-2', 0.7), m(84, 'whoosh', 'streaks', 0.6)],
  'site-flip': () => [m(0, 'snap', 'block-1', 0.6), m(1, 'snap', 'block-2', 0.6), m(2, 'whoosh', 'sheet', 0.8), m(13, 'tick', 'sections', 0.3), m(28, 'whoosh', 'orbit', 0.5), m(33, 'pop', 'pictures', 0.5), m(52, 'whoosh', 'exit', 0.7)],
  'ribbon-ring': () => [m(0, 'swell', 'ring-in', 0.5), m(1, 'key', 'word-1', 0.4), m(11, 'key', 'word-2', 0.35), m(19, 'key', 'word-3', 0.35), m(30, 'whoosh', 'whip-up', 0.6), m(39, 'key', 'word-last', 0.4)],
  'phone-pullback': () => [m(0, 'whoosh', 'pull-back', 0.5), m(26, 'whoosh', 'pull-peak', 0.4), m(44, 'land', 'phone', 0.4), m(55, 'click', 'press', 0.8), m(58, 'pop', 'menu', 0.7), m(75, 'tick', 'row', 0.3)],
  'object-window': () => [m(0, 'whoosh', 'window-rises', 0.4), m(12, 'whoosh', 'turn', 0.5), m(30, 'swell', 'push', 0.4), m(58, 'click', 'mark-spot', 0.7), m(59, 'pop', 'marker', 0.5), m(74, 'click', 'done', 0.7)],
  'crystal-hall': () => [m(0, 'whoosh', 'sphere', 0.6), m(10, 'land', 'landing', 0.6), m(12, 'swell', 'crystal', 0.5), m(18, 'hit', 'cone', 0.8), m(58, 'riser', 'fill', 0.5), m(61, 'bell', 'flash', 0.7)],
  'cloud-dome': () => [m(4, 'riser', 'tilt', 0.4), m(17, 'whoosh', 'cloud-rush', 0.9), m(27, 'land', 'diorama', 0.7), m(29, 'swell', 'glass', 0.5), m(80, 'whoosh', 'push-cut', 0.7)],
  'street-poster': () => [m(0, 'pop', 'plate-1', 0.7), m(18, 'pop', 'plate-2', 0.8), m(36, 'pop', 'plate-3', 0.7), m(42, 'whoosh', 'last-pull', 0.4)],
  'room-push': () => [m(0, 'whoosh', 'haze', 0.5), m(4, 'tick', 'pass', 0.3), m(22, 'hit', 'punch', 0.7), m(44, 'riser', 'push', 0.5), m(58, 'land', 'screen', 0.6)],
};
/** The mark-pullback's own moments (its meta cues): the pull-back, the one snap to the lockup, the lockup landing. */
export const END_MOMENTS30: Moment[] = [m(0, 'whoosh', 'pull-back', 0.7), m(PULLBACK30.lockup, 'snap', 'parts', 0.6), m(PULLBACK30.lockup + 7, 'land', 'lockup', 0.7)];
/** The film frame of an end moment (scene frame x30 of the pull-back, the lockup's on the plan's lockIn). */
export const endAt = (x30: number): number => (x30 >= PULLBACK30.lockup ? CLOSE.lockIn + Math.round((x30 - PULLBACK30.lockup) * K30) : CLOSE.markIn + Math.round(x30 * K30));
/** Moments the picture makes that a scene's meta does not list (a toast stack's climb landing at rest). */
export const EXTRA30: Record<string, Moment[]> = { 'toast-stack': [m(24, 'land', 'stack-rests', 0.35)], 'photo-counters': [m(38, 'tick', 'count-lands', 0.35)] };
CHANGES.forEach((c) => {
  const s = c.scene;
  // the counts and the cards a change's content leaves out are not played: photo-counters with one card has no card-2 or card-3
  const cards = UPDATE.changes[c.i].show.kind === 'count' ? 1 : 3;
  [...(MOMENTS30[s.id]?.(s.dur30) ?? []), ...(EXTRA30[s.id] ?? [])]
    .filter((x) => !(s.id === 'photo-counters' && ((x.id === 'card-2' && cards < 2) || (x.id === 'card-3' && cards < 3))))
    // a scene that hands its element on ends before its own last press: that press is the next scene's
    .filter((x) => !(s.endless && x.f >= s.dur30 - 8))
    .forEach((x, k) => {
      if (x.f < s.skip) return; // cut with the scene's first frames
      const at = x.f === s.skip ? s.from + 1 : sceneAt(s, x.f); // a moment on the frame the film enters sounds just after the cut
      if (at <= s.from || at >= s.to) return; // a moment on the cut itself is the cut's
      SCENE_MOMENTS.push({ ...x, i: c.i, k, at });
      CUE[sceneCueName(c.i, k)] = at;
    });
});

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band (lib/look.ts GRAMMAR.shot.band; grammar-score --format update reads the update band). */
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
/** One surface material per film, or none. */
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
/** How one shot hands over to the next. `hard` is a designed cut; `fadeEnd` only closes a film. */
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

/** Cut film: every part is its own shot, on the grid; each line card and the scene it leads into share one ground. */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: false, whiteWorld: false };

/**
 * Every seam: each change comes in as INTO says (carried, the exit before carrying it, or a defocus); a line card into its
 * scene keeps the ground and its line dissolves off over the scene's first frames (dissolveUi); the cut into the mark's
 * pull-back is the signature (a defocus onto the solid's close-up, its first frames racking in), and the film's one snap
 * is the pull-back's cut to the lockup.
 */
/**
 * A defocus seam's frames on each side of its cut: what was before racks out of focus (DEFOCUS_PX at 1080, a slight push)
 * and the cut lands inside the blur, where neither side can be read; what comes in racks back in (its line's own move on
 * top). LINGER_F: a line card's line leaves over its scene's first frames (a dissolve on the shared ground, never a line
 * that vanishes in one frame).
 */
export const DEFOCUS_F = f60(8);
export const DEFOCUS_PX = 30;
export const LINGER_F = f60(10);
/**
 * How each change's first part comes in: the element carried from the scene before (morph: the send button pressed), the
 * scene before's own exit carrying it (a defocus, a whip, the page leaving at speed), else a defocus: what was before
 * racks out of focus and the change's clean ground racks in, the cut inside the blur.
 */
export const INTO: Seam[] = CHANGES.map((c, i): Seam => {
  const at = (c.card ?? c.scene).from;
  if (i > 0 && LINKED[i - 1]) return { at, kind: 'morph', carry: 'shape', id: `element-carried-${i + 1}` };
  const exit = i > 0 ? SCENE_SPEC[CHANGES[i - 1].scene.id].exit : undefined;
  if (exit) return { at, kind: exit.kind, ...(exit.carry ? { carry: exit.carry } : {}), ...(exit.dir ? { dir: exit.dir } : {}), id: `${CHANGES[i - 1].scene.id}-exit-${i + 1}` };
  return { at, kind: 'defocus', id: `defocus-into-change-${i + 1}` };
});
export const SEAMS: Seam[] = (() => {
  const out: Seam[] = INTO.filter((x) => x.at > 0).map((x) => ({ ...x }));
  CHANGES.forEach((c, i) => {
    if (c.card) out.push({ at: c.scene.from, kind: 'dissolveUi', id: `line-into-scene-${i + 1}` });
  });
  out.push({ at: CLOSE.markIn, kind: 'defocus', signature: true, id: 'mark-pull-back' });
  out.push({ at: CLOSE.lockIn, kind: 'snapZoom', carry: 'scale', id: 'lockup' });
  return out.sort((p, q) => p.at - q.at);
})();
/** Off the grid on purpose: the scenes' own measured moments, the mark's cuts. */
export const OFFGRID: Record<string, string> = {
  version: 'the version arrives on the line\'s own move, once the name is read',
  ...Object.fromEntries(CHANGES.flatMap((c, k) => [
    [`read${c.i}`, 'the line is read on its move\'s own frames'],
    [`said${c.i}`, 'the scene sets its line on its own measured frames'],
    ...(c.card?.offgrid ? [[`scene${c.i}`, 'the cut follows the line\'s read: no 16th fits inside the line\'s 1.2 s']] : []),
    ...(c.scene.offgrid ? [[`sceneEnd${c.i}`, 'the scene ends on its own last frame: no 16th fits inside the change\'s limit'], [k + 1 < CHANGES.length ? (CHANGES[k + 1].card ? `card${k + 1}` : `scene${k + 1}`) : 'markIn', 'the cut follows the scene before on its own last frame']] : []),
  ])),
  ...Object.fromEntries(SCENE_MOMENTS.map((m) => [sceneCueName(m.i, m.k), 'the scene\'s own measured moment'])),
  markTurn: 'the pull-back is three quarters out on its own measured curve',
  lockIn: 'the pull-back snaps to the lockup on its own measured frame',
  settled: 'the lockup settles on its own measured frame',
  versionIn: 'the version leads its bar line by its landing',
};
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
/** The fast frames a motion-blurred master samples: the first, fast third of the mark's pull-back. */
export const CAMERA_BLUR: CameraBlurRange[] = [{ from: CLOSE.markIn, to: CLOSE.markIn + 10 * K30, id: 'mark-pull-back' }];
export const COLOUR: ColourRange[] = [];
/** The one lock: the version, the mark and the name hold to the end. */
export const END: EndLock = { from: CLOSE.lockup, to: TOTAL };
/** The biggest reveal: the version landing in the lockup. */
export const REVEAL = CLOSE.lockup;
/** The one element class allowed an underdamped spring: the version landing in the lockup. */
export const SPRING_CLASS = 'version-land';
/** CUE names that must land on a music event: with a track, the version mark (the bar line that ends the body). */
export const STRUCTURAL: string[] = MUSIC ? ['lockup'] : [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  version: 'hit',
  hookRead: 'copy',
  hookOut: 'cut',
  ...Object.fromEntries(
    CHANGES.flatMap((c) => [
      ...(c.card ? [[`card${c.i}`, 'cut' as Salience], [`read${c.i}`, 'copy' as Salience]] : []),
      [`scene${c.i}`, 'cut' as Salience],
      [`sceneEnd${c.i}`, 'cut' as Salience],
      ...(!c.card ? [[`said${c.i}`, 'copy' as Salience]] : []),
    ]),
  ),
  ...Object.fromEntries(SCENE_MOMENTS.map((m) => [sceneCueName(m.i, m.k), 'hit' as Salience])),
  markIn: 'cut', markTurn: 'move', lockIn: 'cut', settled: 'move', versionIn: 'move', lockup: 'hit', end: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name'; // 'ui': a string the product shows, not budgeted; 'name': the name or the version, not a line of the script
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};

/** The text a change's line shows: one line on its card, two where a scene parts it. */
export const lineText = (i: number): string => {
  const c = UPDATE.changes[i];
  return CHANGES[i].scene.id === 'porthole-line' && !CHANGES[i].card ? splitLine(c).join('\n') : spokenChange(c);
};

// Every on-screen word: the name and the version together ("[Name] [version]": which product, which release, by 1 s),
// each change one short sentence (alone on its card, or set by its scene), then the name and the version in the lockup.
// The hook and every line card arrive whole or in 2-3 chunks and are read by their hold (reveal 'focus'); a carried line
// is its scene's own build.
export const COPY: Copy[] = [
  { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, in: Math.max(0, HOOK.name), resolved: HOOK.resolved, out: HOOK.out, reveal: 'focus' },
  ...CHANGES.map((c): Copy => ({ id: `change${c.i + 1}`, text: lineText(c.i), in: c.line.in, resolved: c.line.resolved, out: c.line.out, ...(c.card ? { reveal: 'focus' as const } : {}) })),
  ...CHANGES.filter((c) => c.scene.id === 'macro-type' || c.scene.id === 'glass-prompt').map((c): Copy => {
    const s = UPDATE.changes[c.i].show;
    const text = s.kind === 'type' ? s.text : '';
    return { id: `typed${c.i + 1}`, text, kind: 'ui', in: Math.max(c.scene.from, sceneAt(c.scene, 37)), resolved: Math.min(c.scene.to - 1, sceneAt(c.scene, c.scene.dur30 - 19)), out: c.scene.to };
  }),
  // the lockup is one unit: the name assembling with the mark, the version landing under it on the bar line, read together
  { id: 'lockup', text: `${UPDATE.name}\n${UPDATE.version}`, kind: 'name', in: CLOSE.nameIn, resolved: CLOSE.lockup, out: TOTAL },
];

/**
 * The beat plan (grid-check `beats`): the name with its version alone on the ground (T), each change's line alone on the
 * ground of its scene (T), then the scene (A); a scene that parts its line round its picture plays its press first (A),
 * then the line meeting its picture (T, meets); the lockup.
 */
export type Beat = { id: string; kind: 'T' | 'A' | 'TA' | 'end'; from: number; to: number; meets?: boolean };
export const BEAT_PLAN: Beat[] = [
  { id: 'hook', kind: 'T', from: 0, to: HOOK.out },
  ...CHANGES.flatMap((c): Beat[] => {
    const id = `change${c.i + 1}`;
    if (c.card) return [{ id, kind: 'T', from: c.card.from, to: c.card.to }, { id: `${id}-scene`, kind: 'A', from: c.scene.from, to: c.scene.to }];
    if (c.line.in > c.scene.from + FPS * 0.5) return [{ id: `${id}-press`, kind: 'A', from: c.scene.from, to: c.line.in }, { id, kind: 'T', from: c.line.in, to: c.scene.to, meets: true }];
    return [{ id, kind: 'T', from: c.scene.from, to: c.scene.to, meets: true }];
  }),
  { id: 'end', kind: 'end', from: CLOSE.markIn, to: TOTAL },
];

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
/** The fragments of one chain, in order of arrival (kept for the starter's helpers). */
export const chainOf = (id: string): Copy[] => {
  const list = COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
  if (!list.length) throw new Error(`timeline: no COPY chain "${id}"`);
  return list;
};
/** The defocus seams the stage draws itself (the template's, never a scene's own exit): their cut frames. */
export const DEFOCUS_AT: number[] = [...INTO.filter((x, i) => x.kind === 'defocus' && x.at > 0 && !(i > 0 && SCENE_SPEC[CHANGES[i - 1].scene.id].exit)).map((x) => x.at), CLOSE.markIn];

/** Each part's seconds: the hook, each change (its line card, its scene, the two together), the pull-back, the lockup. */
const sec = (f: number) => +(f / FPS).toFixed(2);
export const LENGTHS = {
  hook: sec(HOOK.out),
  changes: CHANGES.map((c) => ({ id: c.id, scene: c.scene.id, card: c.card ? sec(c.card.to - c.card.from) : 0, read: c.card ? sec(c.card.resolved - c.card.from) : 0, sceneS: sec(c.scene.to - c.scene.from), change: sec((c.card ? c.card.to - c.card.from : 0) + c.scene.to - c.scene.from), typed: c.typed })),
  pullback: sec(CLOSE.lockIn - CLOSE.markIn),
  lockup: sec(TOTAL - CLOSE.lockIn),
  film: sec(TOTAL),
};
/** The film as one line, for the print: the hook, each change's line and scene, the end. */
export const PLAN_LINE = [`${UPDATE.name} ${UPDATE.version} (${LENGTHS.hook.toFixed(2)} s)`, ...CHANGES.map((c, k) => `"${spokenChange(UPDATE.changes[c.i])}" ${c.card ? `card ${LENGTHS.changes[k].card.toFixed(2)} s + ` : ''}${c.scene.id} ${LENGTHS.changes[k].sceneS.toFixed(2)} s = ${LENGTHS.changes[k].change.toFixed(2)} s${c.scene.endless ? ' (hands on)' : ''}${c.scene.pressed ? ' (pressed)' : ''}`), `mark-pullback ${LENGTHS.pullback.toFixed(2)} s, lockup ${LENGTHS.lockup.toFixed(2)} s, version on f${CLOSE.lockup} (${LENGTHS.film.toFixed(2)} s in all)`].join(' | ');

/**
 * The film's limits, checked (src/deal.ts LIMITS): a lone line in and read in 1.2 s, a scene 3 s, a change 4 s, a typed
 * change 3 s, the hook 1.6 s, the lockup 2 s to the last frame, one snap, the film 8-20 s. A plan outside them throws:
 * grid-check, the Studio and the render all stop on it, with what to change. Never raise a limit to pass: shorten the
 * line, the request or the scene's content, or choose another scene (`scene` with `why` in src/update.ts).
 */
export const FAULTS: string[] = (() => {
  const out: string[] = [];
  const s = (f: number) => `${(f / FPS).toFixed(2)} s`;
  if (HOOK.out > LIM.hook + 1) out.push(`the hook runs ${s(HOOK.out)} (at most ${LIMITS.HOOK_S} s): a shorter name and version`);
  if (HOOK.name > 0) out.push('the hook stands still on its first frame: the name is moving on frame 0');
  CHANGES.forEach((c) => {
    const words = spokenChange(UPDATE.changes[c.i]);
    if (c.card && c.card.to - c.card.from > LIM.line + 1) out.push(`"${words}" stands ${s(c.card.to - c.card.from)} alone (a lone line is in and read in ${LIMITS.LINE_S} s): fewer words`);
    const sc = c.scene.to - c.scene.from;
    if (sc > LIM.scene + 1) out.push(`${c.id}'s ${c.scene.id} runs ${s(sc)} (a scene runs ${LIMITS.SCENE_S} s at most): less content, or another scene`);
    const ch = (c.card ? c.card.to - c.card.from : 0) + sc;
    if (c.typed && ch > LIM.type + 1) out.push(`${c.id} (typed) runs ${s(ch)} (a typed change runs ${LIMITS.TYPE_S} s): a request of about 20 characters types in macro-type, a longer one in glass-prompt`);
    else if (ch > LIM.change + 1) out.push(`${c.id} runs ${s(ch)} (a change runs ${LIMITS.CHANGE_S} s at most)`);
  });
  if (TOTAL - CLOSE.lockIn > LIM.lock + 1) out.push(`the lockup stands ${s(TOTAL - CLOSE.lockIn)} (at most ${LIMITS.LOCK_S} s to the last frame): the version's bar line is too far after the lockup (a track a little faster, or a third change)`);
  const snaps = SEAMS.filter((x) => x.kind === 'snapZoom').length;
  if (snaps > 1) out.push(`${snaps} snap zooms are declared (a film keeps one: the pull-back's cut to the lockup)`);
  const secs = TOTAL / FPS;
  if (secs < LIMITS.FILM_S[0] - 0.05 || secs > LIMITS.FILM_S[1] + 0.05) out.push(`the film runs ${secs.toFixed(1)} s (an update film runs ${LIMITS.FILM_S[0]}-${LIMITS.FILM_S[1]} s)`);
  return out;
})();
if (FAULTS.length) throw new Error(`update timeline (src/deal.ts LIMITS): ${FAULTS.join('; ')}. The plan: ${PLAN_LINE}`);
