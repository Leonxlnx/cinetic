// The single source of truth for time, for an update film ("vX is out"), played as a SPINE (lib/spine.ts): one session
// (src/update.ts session and case) in acts: the hook (the name and the version, the version in its pill: the film's
// element), one act per change (its hero shot draws the element in that act's form: a photo, a stack of notices, a card
// and its button ...), and the lockup grown out of the last form (it converges into the brand's mark as a solid, which
// pulls back into the name and the version). Every change of scene hands the element on (HANDS: it grows, flies,
// swells, converges ... from one shot into the next), each line meets the element (PLACES: parted round a porthole that
// holds it, or riding over it in its shot), and the world takes one step per act. Picture (src/acts), sound
// (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts --part spine reads SPINE_PLAN) all import this file. The
// facts live in src/update.ts; this file only places them on the grid. Think in bars and beats, never in seconds. Keep
// it free of React and CSS imports: Node scripts load it directly.
import { DEAL, EXIT60, HEROES, LINES, type Move, type Place, PLACES, RESOLVE60, verbOf } from './deal';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { type Act as SpineAct, type Form, HANDOVERS, handoverFrames, handoversFor, type HandoverKind, planSpine, type Scene, type Spine, type SpinePlan, spineDeclares } from './lib/spine';
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
/** The fractional twin of f60, for durations inside a move. */
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;

/** How many changes the film shows (2-3, from src/update.ts): with the hook, the spine's 3-4 acts. */
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

/** Frames from a move's start until a line of `n` words is read (src/deal.ts RESOLVE60, at this film's fps). */
export const resolveSpan = (move: Move, n: number): number => Math.ceil(f60x(RESOLVE60[move][Math.min(8, Math.max(1, n)) - 1])) + 1;
/** The move this film dealt a line (src/deal.ts LINES). */
export const moveOf = (id: string): Move => LINES.move[id] ?? LINES.voice;
/** Frames a line's exit takes (the film's one whole-line exit). */
export const EXIT_F = f60(EXIT60[LINES.exitVoice]);
/** How long the version's changed numerals take to roll (60 fps frames). */
export const ROLL = 18;
/** The key word of change i's line: the last word of the change's key, else the line's longest word. */
export const heroWord = (i: number): number => {
  const words = spokenChange(UPDATE.changes[i]).split(/\s+/);
  const bare = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (UPDATE.changes[i].key ?? '').split(/\s+/).map(bare).filter(Boolean);
  const last = key.length ? words.map(bare).lastIndexOf(key[key.length - 1]) : -1;
  return last >= 0 ? last : words.reduce((b, w, j) => (bare(w).length > bare(words[b]).length ? j : b), 0);
};
/** Frames change i's line needs on screen: its move to the last word, then the pace's read of its words. */
const readOf = (i: number) => {
  const n = wordCount(spokenChange(UPDATE.changes[i]));
  return resolveSpan(moveOf(`change${i + 1}`), n) + f60(holdFor(n, PACE[PACE_NAME]));
};

// ---------------------------------------------------------------------------------------------- the hero shots
/**
 * A hero shot's own frames (f@60): `pre` from the shot at rest to its action, `act` from its action to the state change
 * (the hit: the press, the last row, the chosen picture facing the camera, the figure landing, the page's landing).
 */
export const heroFrames = (id: string, c: Change): { pre: number; act: number } => {
  const s = c.show;
  const n = s.kind === 'fill' && s.layout !== 'week' ? s.items.length : 4;
  switch (id) {
    case 'push-press':
      return { pre: 6, act: 74 };
    case 'macro-type': {
      // the typing at about 18 characters a second with its breaths, then the travel to send and the press
      const text = s.kind === 'type' ? s.text : c.title;
      return { pre: 24, act: Math.round(text.length * (60 / 18) * 1.3 + 34) };
    }
    case 'toast-stack':
      return { pre: 0, act: 24 * (n - 1) + 16 };
    case 'fan-focus':
      return { pre: 0, act: 34 + 7 * (n - 1) + 76 };
    case 'carousel':
      return { pre: 0, act: 112 };
    case 'photo-develop':
      return { pre: 8, act: 70 };
    case 'glass-counter':
      return { pre: 4, act: 96 };
    case 'page-fly':
      return { pre: 0, act: 140 };
    case 'focus-swap':
      return { pre: 34, act: 30 };
    case 'glass-tiles':
      return { pre: 0, act: 140 };
    default:
      return { pre: 0, act: 80 };
  }
};

/**
 * The element's forms in each hero shot (lib/spine FORMS): what the shot draws it as. A shot of two forms travels its
 * own surface from the first to the second (a same-surface change: the camera rides from the card to its button).
 */
export const HERO_FORMS: Record<string, readonly Form[]> = {
  'push-press': ['card', 'button'],
  'macro-type': ['card', 'button'],
  'toast-stack': ['notice'],
  'fan-focus': ['list'],
  carousel: ['photo'],
  'photo-develop': ['photo'],
  'glass-counter': ['count'],
  'page-fly': ['page'],
  'focus-swap': ['card'],
  'glass-tiles': ['card'],
};
const formsOf = (i: number): readonly Form[] => HERO_FORMS[HEROES[i]] ?? ['card'];

// ---------------------------------------------------------------------------------------------- the handovers
/**
 * The handovers the stage draws between two shots (fx/Handover: the element's box, corner, fill and content carried from
 * one shot's camera into the next's). Each change of act takes one of its form pair's recipes (lib/spine FORM_PAIRS) that
 * the stage draws, the least used first so a film plays several kinds; a pair with none goes through a point (converge,
 * always allowed). The lockup always grows out of a converge: the last form collapses to a spark and the mark grows from it.
 */
export const DRAWN: readonly HandoverKind[] = ['grow', 'fly', 'swell', 'shrink', 'converge'];
const OPENS: readonly Form[] = ['notice', 'list', 'photo', 'card', 'page', 'count'];
const handOf = (from: Form, to: Form, used: Partial<Record<HandoverKind, number>>): HandoverKind => {
  if (to === 'mark') return 'converge';
  const opts = handoversFor(from, to).filter((k) => DRAWN.includes(k));
  // a pair with no drawn recipe: a notice, a photo or a card that opens into the next screen grows into it (the grow's
  // own "a notice opens"); anything else goes through a point
  if (!opts.length) return OPENS.includes(from) && ['card', 'page', 'window'].includes(to) && (used.grow ?? 0) <= (used.converge ?? 0) ? 'grow' : 'converge';
  return opts.slice().sort((a, b) => (used[a] ?? 0) - (used[b] ?? 0) || opts.indexOf(a) - opts.indexOf(b))[0];
};
/** Each act boundary's handover, in film order (hook -> change 1, ... , last change -> the mark). */
export const BOUNDARY_KINDS: HandoverKind[] = (() => {
  const used: Partial<Record<HandoverKind, number>> = {};
  const out: HandoverKind[] = [];
  const firsts: Form[] = UPDATE.changes.map((_, i) => formsOf(i)[0]);
  const lasts: Form[] = ['pill', ...UPDATE.changes.map((_, i) => formsOf(i)[formsOf(i).length - 1])];
  for (let k = 0; k <= N; k++) {
    const kind = handOf(lasts[k], k < N ? firsts[k] : 'mark', used);
    used[kind] = (used[kind] ?? 0) + 1;
    out.push(kind);
  }
  return out;
})();
/** [lead, land] of a handover kind in film frames (lib/spine house frames). */
const leadLand = (k: HandoverKind): [number, number] => handoverFrames(k, FPS);

// ---------------------------------------------------------------------------------------------- the acts' lengths
/** The porthole's opening into the frame once the parted line has gone (f@60). */
export const IRIS60 = 36;
/** House numbers (s): a result held after its hit before the element hands on (the last one shorter: the converge into the mark carries it on). */
const SHOW = { result: 0.75, last: 0.55 } as const;
/**
 * The lockup's beats: the converge into the mark, its pull-back, the name, the version landing on the bar line that ends
 * the body: two bars (it opens on a downbeat).
 */
const END_BEATS = 8;
/** The hook's beats: the name, the pill landing, read (one bar). */
const HOOK_BARS = 1;

/**
 * Change i's act in whole bars: the element's arrival (the handover's land, or for a parted line its read and the
 * porthole opening), the shot's action and its result held, the line's read, the next handover's lead; the last act adds
 * the lockup's beats. A shot of two forms starts its action on the act's middle beat (where planSpine puts the second
 * scene: the same-surface change).
 */
const actBars = (i: number): number => {
  const c = UPDATE.changes[i];
  const hf = heroFrames(HEROES[i], c);
  const [, landIn] = leadLand(BOUNDARY_KINDS[i]);
  const [leadOut] = leadLand(BOUNDARY_KINDS[i + 1]);
  const R = readOf(i);
  const place = PLACES[i];
  const two = formsOf(i).length > 1;
  const last = i === N - 1;
  for (let bars = 1; bars <= 12; bars++) {
    const beats = bars * 4 + (last ? END_BEATS : 0);
    const body = beats - (last ? END_BEATS : 0); // the change's own beats before the lockup
    const span = beat(body) - beat(0);
    const hinOf = place === 'part' ? landIn + Math.max(R, f60(40)) + Math.round(0.3 * EXIT_F) + f60(IRIS60) : landIn;
    const mid = beat(Math.round((two ? body / 2 : 0))) - beat(0);
    const go = two ? Math.max(mid, hinOf + f60(hf.pre)) : hinOf + f60(hf.pre);
    if (two && go > mid) continue; // the action must start on the same-surface change
    const hit = go + f60(hf.act);
    const end = hit + Math.round((last ? SHOW.last : SHOW.result) * FPS) + leadOut;
    const lineEnd = place === 'head' ? landIn + R + EXIT_F + leadOut : 0;
    if (Math.max(end, lineEnd) <= span) return bars;
  }
  return 12;
};
const BARS_OF: number[] = [HOOK_BARS, ...UPDATE.changes.map((_, i) => actBars(i))];

// ---------------------------------------------------------------------------------------------- the spine
/** A change's verb in the sentence (its own, else its line's first word). */
export const VERBS: string[] = UPDATE.changes.map((c) => verbOf(c));
/** The case's words a change's screen shows (its title, detail, rows, action, request, figure): the checks follow the case through them. */
export const stringsOf = (c: Change): string[] => {
  const s = c.show;
  const rows = s.kind === 'tap' ? [...(s.rows ?? []), ...(s.result ?? []), ...(s.you ? [s.you] : [])] : s.kind === 'swap' ? [...s.before, ...s.after] : s.kind === 'fill' && s.layout !== 'week' ? s.items : [];
  const extra = s.kind === 'tap' ? [s.action, s.done] : s.kind === 'type' ? [s.text] : s.kind === 'count' ? [s.label, `${s.to}${s.unit ? ` ${s.unit}` : ''}`] : s.kind === 'fill' && s.layout === 'week' ? s.items.map((x) => x.label) : [];
  return [c.title, c.sub ?? '', ...rows.flatMap((r) => [r.label, r.meta ?? '']), ...extra].map((x) => String(x).trim()).filter(Boolean);
};
/** The film as one sentence: the name, the version and the session, then each change's verb. */
export const SENTENCE = `${UPDATE.name} ${UPDATE.version} ${UPDATE.session.trim()}: ${VERBS.join(', ')}`;

/**
 * The spine (lib/spine.ts) this film plays: the hook (the version's pill, its line alone and joined: the pill is the
 * element), one act per change (its hero shot's forms; the second form of a two-form shot reached on its own surface),
 * the lockup grown out of the last form by a converge. Every act boundary names its handover (BOUNDARY_KINDS).
 */
export const SPINE: Spine = {
  format: 'update',
  sentence: SENTENCE,
  element: 'version',
  case: { ...UPDATE.case },
  acts: [
    {
      id: 'hook',
      verb: 'opens',
      scenes: [{ form: 'pill', name: 'version' }],
      line: { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, place: 'alone', becomes: 'pill' },
      world: 'enter',
      bars: BARS_OF[0],
      strings: [UPDATE.name, UPDATE.version],
    },
    ...UPDATE.changes.map((c, i): SpineAct => {
      const forms = formsOf(i);
      const scenes: Scene[] = forms.map((form, k) => (k === 0 ? { form, name: `${c.id}-${form}`, via: BOUNDARY_KINDS[i] } : { form, name: `${c.id}-${form}`, via: 'same-surface' }));
      const place = PLACES[i];
      return {
        id: c.id,
        verb: VERBS[i],
        scenes,
        line: { id: `change${i + 1}`, text: spokenChange(c), place: place === 'part' ? 'around' : 'inside', join: { in: 'element', out: 'element' } },
        world: i === N - 1 ? 'pull-back' : i === 0 ? 'closer' : 'light',
        bars: BARS_OF[i + 1] + (i === N - 1 ? END_BEATS / 4 : 0),
        strings: stringsOf(c),
        devices: [{ id: HEROES[i] }],
      };
    }),
  ],
  end: { via: 'converge', share: 0 },
};
// the lockup's share of the last act: exactly its beats
SPINE.end = { via: 'converge', share: END_BEATS / ((BARS_OF[N] + END_BEATS / 4) * 4) };

/** The total bars of the body. */
const BODY_BARS = BARS_OF.reduce((a, v) => a + v, 0) + END_BEATS / 4;
/** The plan the checks read (grid-check --part spine, export-cues): acts, scenes, changes, lines, the world's steps. */
export const SPINE_PLAN: SpinePlan = planSpine(SPINE, { fps: FPS, b, bars: BODY_BARS });

/** Where each act starts and ends (absolute frames): 0 the hook, i + 1 change i. */
const ACTS = SPINE_PLAN.acts;
/** The plan's scenes of act a. */
const scenesOf = (a: number) => SPINE_PLAN.scenes.filter((s) => s.act === a);

/**
 * One drawn or declared handover between two scenes: its kind, the cut (`at`, the incoming scene's first frame), its span
 * [t0, t1), the sides (the hook's pill, change i's shot, or the mark) and their forms; `drawn` when the stage draws the
 * element across it (fx/Handover); a same-surface change is the shot's own camera move (declared, drawn by the shot).
 */
export type Hand = { k: number; kind: HandoverKind; at: number; t0: number; t1: number; from: { side: 'hook' | number; form: Form }; to: { side: 'mark' | number; form: Form }; drawn: boolean; boundary: boolean };
export const HANDS: Hand[] = SPINE_PLAN.changes.map((c, k) => {
  const kind = c.kind as HandoverKind;
  const side = (act: number, form: Form): 'hook' | 'mark' | number => (form === 'mark' ? 'mark' : act === 0 ? 'hook' : act - 1);
  const from = side(c.from.act, c.from.form) as 'hook' | number;
  const to = side(c.to.act, c.to.form) as 'mark' | number;
  return { k, kind, at: c.at, t0: c.span[0], t1: c.span[1], from: { side: from, form: c.from.form }, to: { side: to, form: c.to.form }, drawn: HANDOVERS[kind].draws === 'handover' && from !== to, boundary: c.boundary };
});
/** The handover into change i's shot, and the one out of it (to the next shot, or the converge into the mark). */
export const handIn = (i: number): Hand => HANDS.find((h) => h.to.side === i && h.from.side !== i)!;
export const handOut = (i: number): Hand => HANDS.find((h) => h.from.side === i && h.to.side !== i)!;

// ---------------------------------------------------------------------------------------------- each change's frames
/**
 * Each change's frames (absolute). `h0`: the shot's first frame (the handover into it starts: it is drawn inside the
 * element from there), `hin`: the element landed and the shot open, `go`: its action starts, `hit`: the state change,
 * `res`, `res2`: the result's details landing, `live`: the result's later beats; `say` and `out`: its line in and leaving;
 * `gap` (part): the element landing in the line's gap; `iris` (part): the porthole opening into the frame; `heroEnd`: the
 * shot's last frame (the handover out of it ends); `creep`: from here the held result keeps moving on the tail of the
 * shot's last move (a slow push about the element, never a still frame).
 */
export type ChangeTimes = {
  i: number; place: Place; hero: string; from: number; to: number;
  h0: number; hin: number; go: number; hit: number; res: number; res2: number; live: number[]; say: number; out: number;
  gap?: [number, number]; iris?: [number, number]; heroEnd: number; creep: number;
};
export const TIMES: ChangeTimes[] = UPDATE.changes.map((c, i) => {
  const act = ACTS[i + 1];
  const own = scenesOf(i + 1).filter((s) => s.form !== 'mark');
  const hi = handIn(i);
  const ho = handOut(i);
  const hf = heroFrames(HEROES[i], c);
  const place = PLACES[i];
  const R = readOf(i);
  const id = `change${i + 1}`;
  let say: number;
  let out: number;
  let hin: number;
  let gap: [number, number] | undefined;
  let iris: [number, number] | undefined;
  if (place === 'part') {
    // the line builds round its gap as the element flies in and lands in it as the porthole; read, the words leave and
    // the porthole opens into the frame
    say = act.from;
    gap = [hi.at, hi.t1];
    out = g16(Math.max(say + R, hi.t1 + f60(40)));
    const i0 = g16(out + Math.round(0.3 * EXIT_F));
    iris = [i0, i0 + f60(IRIS60)];
    hin = iris[1];
  } else {
    // the line arrives over the element as it lands and rides it while the shot plays; it leaves as the element hands on
    hin = hi.t1;
    say = g16(Math.max(act.from, hi.t1 - f60(10)));
    // read, then it leaves as the shot's action starts (its camera moves in), or as the element hands on
    const go0 = own.length > 1 ? own[1].from : g16(hin + f60(hf.pre));
    out = Math.min(Math.max(say + R, go0), Math.max(say + R, ho.t0 - EXIT_F));
  }
  const go = own.length > 1 ? own[1].from : g16(hin + f60(hf.pre));
  const hit = g16(go + f60(hf.act));
  const live: number[] = [];
  for (let q = hit + BEAT * 2.5; q <= ho.t0 - BEAT * 0.5; q += BEAT) live.push(g16(q));
  void id;
  return { i, place, hero: HEROES[i], from: act.from, to: act.to, h0: hi.t0, hin, go, hit, res: g16(hit + 0.75 * BEAT), res2: g16(hit + 1.75 * BEAT), live, say, out, gap, iris, heroEnd: ho.t1, creep: hit + f60(10) };
});

/** The hook's frames: the name, the version's pill (rolling, rising or growing from a dot), the name leaving as the pill hands on. */
export const HOOK = (() => {
  const ho = HANDS[0];
  return { name: 0, version: bt(0.75), roll: bt(1), out: Math.max(bt(2.5), ho.t0 - Math.round(0.35 * EXIT_F)), hand: ho };
})();

/**
 * The end's frames: the last form converging into a spark from which the mark's solid grows (`markIn`, the cut, on its
 * beat), its pull-back landing on the flat mark, the name sliding out of it, the version landing on the bar line that
 * ends the body (the track's final hit), held to the end.
 */
export const CLOSE = (() => {
  const h = HANDS[HANDS.length - 1];
  const last = ACTS[ACTS.length - 1];
  const lockup = last.to;
  const markFlat = g16(h.t1 + f60(110));
  return {
    conv: [h.t0, h.t1] as [number, number],
    markIn: h.at,
    solid: h.t1, // the solid's pull-back starts as the converge lands it
    markFlat, // the pull-back lands exactly on the flat mark
    nameIn: markFlat,
    named: markFlat + f60(30),
    versionIn: Math.max(markFlat + f60(30), lockup - Math.round(0.75 * BEAT)),
    lockup,
  };
})();

/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after the bar line that ends the body (the track's own final hit ringing out, 1.5-2.5 s); a grid
 * written before the endings (a stop, no hold) names only the stop's element: hold it and 1 s after it. The version lands
 * on that bar line (CUE.lockup), so the tail is also the end card's hold: that, and at least 1.5 s.
 */
const BODY_END = CLOSE.lockup;
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - BODY_END) : 0;
export const TAIL = Math.max(Math.round(1.5 * FPS), MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);
export const TOTAL = BODY_END + TAIL;
/** The film's bars in the body (track.py fit reads it with REVEAL and ACT.end to cut the track to the picture). */
export const BARS = Math.round(((BODY_END - b(1)) / BAR) * 2) / 2;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order); the end is the
// last act's lockup (from the converge's cut, on its bar line).
export const ACT: Record<string, { from: number; dur: number }> = (() => {
  const cuts = [0, ...TIMES.map((t) => t.from), CLOSE.markIn, TOTAL];
  const names = ['hook', ...UPDATE.changes.map((_, i) => `change${i + 1}`), 'end'];
  return Object.fromEntries(names.map((n, k) => [n, { from: cuts[k], dur: cuts[k + 1] - cuts[k] }]));
})();
/** The act of change i (0-based). */
export const changeAct = (i: number) => ACT[`change${i + 1}`];
/** Where each act starts, in beats (kept for the starter's helpers). */
export const BEATS = { hook: 0, change: (i: number) => (i < N ? TIMES[i].from / BEAT : CLOSE.markIn / BEAT), end: CLOSE.markIn / BEAT, last: BODY_END / BEAT } as const;

// Named sync points (absolute frames). Picture code reads these; src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {
  roll: HOOK.roll, // 'roll': the changed numerals roll in the pill
  rise: HOOK.version, // 'rise' and 'badge': the pill arrives beside the name
  hookOut: HOOK.out,
  ...Object.fromEntries(HANDS.flatMap((h) => [[`hand${h.k}`, h.at], [`land${h.k}`, h.t1]])),
  ...Object.fromEntries(
    TIMES.flatMap((t) => [
      [`c${t.i}`, t.from],
      [`in${t.i}`, t.hin],
      [`go${t.i}`, t.go],
      [`mid${t.i}`, bt(Math.round(((t.go + t.hit) / 2 / BEAT) * 4) / 4)],
      [`hit${t.i}`, t.hit],
      [`res${t.i}`, t.res],
      [`res2${t.i}`, t.res2],
      ...t.live.map((f, k) => [`live${t.i}_${k}`, f]),
      [`say${t.i}`, t.say],
      [`out${t.i}`, t.out],
      ...(t.iris ? [[`iris${t.i}`, t.iris[0]]] : []),
    ]),
  ),
  markIn: CLOSE.markIn,
  markTurn: g16((CLOSE.solid + CLOSE.markFlat) / 2),
  markFlat: CLOSE.markFlat,
  nameIn: CLOSE.nameIn,
  versionIn: CLOSE.versionIn,
  lockup: CLOSE.lockup,
  glint: g16(CLOSE.lockup + 0.5 * BEAT),
  rest: Math.min(TOTAL - 1, g16(CLOSE.lockup + BEAT)),
  end: CLOSE.lockup,
};

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

/**
 * One world, one continuous stage: every change of scene hands the element on (no hard cut). Crisp: the depth stage and
 * the handovers draw their own short-shutter smear on the fast moves, and a motion-blurred master samples only CAMERA_BLUR.
 */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'update', oneTake: true, whiteWorld: false };

/**
 * Every seam: one per spine change (lib/spine spineDeclares: its handover's kind and carry, the id naming it; the
 * converge into the mark is the signature), and the porthole opening into the frame after a parted line.
 */
export const SEAMS: Seam[] = (() => {
  const out: Seam[] = spineDeclares(SPINE_PLAN).seams.map((s) => {
    const { at, kind, carry, dir, id } = s;
    const seam: Seam = { at, kind, ...(carry ? { carry } : {}), ...(dir ? { dir } : {}), ...(id ? { id } : {}) };
    if (at === CLOSE.markIn) seam.signature = true;
    return seam;
  });
  TIMES.forEach((t) => {
    if (t.iris) out.push({ at: t.iris[0], kind: 'mask', carry: 'scale', id: `porthole:opens-into-frame-${t.i + 1}` });
  });
  return out.sort((p, q) => p.at - q.at);
})();
/**
 * Off the grid on purpose: the element lands where its handover's house frames land it (lib/spine HANDOVERS: the land
 * after the cut on the beat), a shot opens as its element lands, a line riding the element leaves as the element hands
 * on, the name leaves as the pill lifts; the cuts themselves stay on the beat.
 */
export const OFFGRID: Record<string, string> = {
  hookOut: 'the name leaves as the pill lifts into the first handover (its lead before the cut on the beat)',
  ...Object.fromEntries(HANDS.map((h) => [`land${h.k}`, `the element lands ${h.t1 - h.at} f after the cut, the ${h.kind}'s house land`])),
  ...Object.fromEntries(TIMES.flatMap((t) => [[`in${t.i}`, 'the shot opens as its element lands (the land of its handover, or the porthole open)'], [`out${t.i}`, 'the line leaves as its element hands on (the lead of the next handover)']])),
};
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
/** The fast frames a motion-blurred master samples: the first, fast third of the mark's pull-back. */
export const CAMERA_BLUR: CameraBlurRange[] = [{ from: CLOSE.solid, to: CLOSE.solid + f60(30), id: 'mark-pull-back' }];
export const COLOUR: ColourRange[] = [];
/** The one lock: the version, the mark and the name hold to the end. */
export const END: EndLock = { from: CLOSE.lockup, to: TOTAL };
/** The biggest reveal: the version landing in the lockup. */
export const REVEAL = CLOSE.lockup;
/** The one element class allowed an underdamped spring: the version landing in the lockup. */
export const SPRING_CLASS = 'version-land';
/** CUE names that must land on a music event: with a track, the mark's converge and the version mark (both on bar lines). */
export const STRUCTURAL: string[] = MUSIC ? ['markIn', 'lockup'] : [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  roll: 'hit',
  rise: 'hit',
  hookOut: 'copy',
  ...Object.fromEntries(HANDS.flatMap((h) => [[`hand${h.k}`, 'cut' as Salience], [`land${h.k}`, 'hit' as Salience]])),
  ...Object.fromEntries(
    TIMES.flatMap((t) => [
      [`c${t.i}`, 'cut' as Salience],
      [`in${t.i}`, 'move' as Salience],
      [`go${t.i}`, 'move' as Salience],
      [`mid${t.i}`, 'move' as Salience],
      [`hit${t.i}`, 'hit' as Salience],
      [`res${t.i}`, 'hit' as Salience],
      [`res2${t.i}`, 'hit' as Salience],
      ...t.live.map((_, k) => [`live${t.i}_${k}`, 'life' as Salience]),
      [`say${t.i}`, 'copy' as Salience],
      [`out${t.i}`, 'copy' as Salience],
      ...(t.iris ? [[`iris${t.i}`, 'move' as Salience]] : []),
    ]),
  ),
  markIn: 'cut', markTurn: 'move', markFlat: 'hit', nameIn: 'copy', versionIn: 'move', lockup: 'hit', glint: 'life', rest: 'life', end: 'cut',
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

const pace = PACE[PACE_NAME];

/** One line of copy on its dealt move, leaving at `out` (never before its read). */
export const line = (id: string, text: string, inF: number, out: number): Copy => {
  const n = wordCount(text);
  const resolved = inF + resolveSpan(moveOf(id), n);
  const read = resolved + f60(holdFor(n, pace));
  return { id, text, in: inF, resolved, out: Math.max(out, read) };
};

// Every on-screen word: the name and the version together ("[Name] [version]": which product, which release, by 1 s),
// each change one short sentence that meets its element, then the name and the version again in the lockup.
export const COPY: Copy[] = [
  { id: 'hook', text: `${UPDATE.name} ${UPDATE.version}`, in: 0, resolved: DEAL.hook === 'roll' ? HOOK.roll + f60(ROLL) : HOOK.version + f60(DEAL.hook === 'badge' ? 34 : 24), out: HOOK.out },
  ...UPDATE.changes.map((c, i) => line(`change${i + 1}`, spokenChange(c), TIMES[i].say, TIMES[i].out)),
  { id: 'wordmark', text: UPDATE.name, kind: 'name', in: CLOSE.nameIn, resolved: CLOSE.named, out: TOTAL },
  { id: 'release', text: UPDATE.version, kind: 'name', in: CLOSE.versionIn, resolved: CLOSE.lockup, out: TOTAL },
];

/**
 * The beat plan (grid-check `beats`): the name with its pill, then each change's line meeting its element (TA: parted
 * round the porthole, or riding over the shot) and the shot playing on (A), the lockup.
 */
export type Beat = { id: string; kind: 'T' | 'A' | 'TA' | 'end'; from: number; to: number; meets?: boolean };
export const BEAT_PLAN: Beat[] = [
  { id: 'hook', kind: 'T', from: 0, to: TIMES[0].from, meets: true },
  ...TIMES.flatMap((t): Beat[] => {
    const id = `change${t.i + 1}`;
    const end = t.i === N - 1 ? CLOSE.markIn : t.to;
    const lineEnd = Math.min(end, t.out + EXIT_F);
    // a parted line stands alone on the world with the element in its gap (it meets its picture: the porthole opens into it)
    const lineBeat: Beat = t.place === 'part' ? { id, kind: 'T', from: t.from, to: lineEnd, meets: true } : { id, kind: 'TA', from: t.from, to: lineEnd };
    return end - lineEnd >= FPS ? [lineBeat, { id: `${id}-shot`, kind: 'A', from: lineEnd, to: end }] : [{ ...lineBeat, to: end }];
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
void DEAL;
