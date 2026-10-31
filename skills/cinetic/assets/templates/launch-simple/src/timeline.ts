// The single source of truth for time, for a simple launch: lines that meet their pictures (alone, with or over
// them), every change of picture carried, then the lockup. The script lives in src/launch.ts, the choices in src/deal.ts; everything below is
// derived from them and from the music, so a new script, a new track or a new tempo needs no edit here. Picture
// (src/acts), sound (src/sync.ts -> out/cues.json) and QA (scripts/grid-check.ts) all import this file. Think in beats,
// never in seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { LAUNCH } from './launch';
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
/** One line at a time, said and gone: the crisp word tempo. */
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
/** Absolute frame `x` beats from the film's first downbeat, on the 16th grid (x in quarter beats). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  const n = Math.floor(q / 4);
  return b(1 + Math.floor(n / 4), n % 4, q % 4);
};

/**
 * After the last bar the picture holds while the music ends, never on a cut: at least 1 s, or the ending's own hold
 * (track.py grid writes it); a grid that only names a stop's element (end.f) holds that element and 1 s after it.
 */
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, MUSIC && MUSIC.end.hold === undefined ? Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1) + FPS : 0); // whole frames as the body ends (b rounds)

// ---- The text voice (deal.ts voice): when a line of n words is whole, in 60 fps frames from its first frame.
/** The voice's house numbers (f@60): word fade, stagger, re-centre (a glide); the blur-in; the ink-in. */
export const VOICE = {
  build: { fade: 20, stagger: 6, recentre: 24 },
  blur: { dur: 34, blur: 12, from: 1.04 },
  ink: { stagger: 6, ink: 10, fade: 8 },
} as const;
export const resolveOf = (n: number): number =>
  DEAL.voice === 'build' ? VOICE.build.stagger * (n - 1) + Math.max(VOICE.build.fade, VOICE.build.recentre) : DEAL.voice === 'blur' ? VOICE.blur.dur : VOICE.ink.stagger * (n - 1) + VOICE.ink.ink;
/**
 * The hero line (the claim, the film's last line) takes the film's one contrasting entry: its words arrive in the voice,
 * then after a `pause` its last word snaps in, one frame at `from` x its size, settling in `settle` (f@60).
 */
export const HERO = { pause: 8, settle: 7, from: 2.2 } as const;
/** When the hero line's last word snaps in, f@60 from the line's first frame (n words). */
export const heroSnapAt = (n: number): number =>
  (DEAL.voice === 'blur' ? Math.round(VOICE.blur.dur * 0.6) : (DEAL.voice === 'build' ? VOICE.build.stagger : VOICE.ink.stagger) * Math.max(0, n - 1)) + HERO.pause;
/** When a line of n words is whole, f@60 from its first frame: the hero line once its last word has settled. */
export const resolveLine = (n: number, hero: boolean): number => (hero ? Math.max(n > 1 ? resolveOf(n - 1) : 0, heroSnapAt(n) + HERO.settle) : resolveOf(n));

/** The script's words on screen: the stars that mark a key word are not drawn. */
export const plain = (s: string) => s.replace(/\*/g, '');
/** The words of a line and which of them are the key (marked *like this* in launch.ts). */
export const keyWords = (s: string): { word: string; key: boolean }[] => {
  const out: { word: string; key: boolean }[] = [];
  let on = false;
  for (const w of s.split(/\s+/).filter(Boolean)) {
    const opens = w.startsWith('*');
    if (opens) on = true;
    out.push({ word: w.replace(/\*/g, ''), key: on });
    if (w.replace(/[.,!?;:]+$/, '').endsWith('*')) on = false;
  }
  return out;
};

// ---- The beat plan. Never a slideshow: a line meets its picture one of three ways (launch.ts `beat`):
//   alone  T then A: the line alone on the ground (it builds over the last picture as that one leaves, so the frame is
//          never empty), then its picture
//   with   TA then A: the line arrives with its picture's first motion, in front of it (the picture behind, soft and
//          low), and leaves as the picture racks into focus and plays on alone: one shot, no cut
//   over   TA: the line holds over its whole picture, the picture composed round the line's band (logos round a line,
//          footage under it)
// Unset: the first line and the claim (the last line) stand alone, the lines between arrive with their pictures, so the
// beats mix about T 20-33 % / T+A 17-30 % / A 50 % (one `over` brings A to about 37 %). Each beat sits on the track's
// 8ths; the pairs together end on a bar line, then the end in whole bars, then the tail. Two acts: the pairs and the end
// (an act line re-draws the whole frame, so it never falls on a seam's cut).
const SEC = (s: number) => s * FPS;
const LINE = { min: 0.5, max: 2.4 } as const; // a line beat holds 0.5-2.4 s (house: about 1.3)
const PIC = { min: 1, max: 3.5, house: [2.6, 1.6, 2.2, 3.0] } as const; // a picture beat runs 1-3.5 s; unset, they vary (a long one beside a short one)
const SEAM_OUT = 14; // f@60 the outgoing line needs inside its beat for the seam (the longest line exit, blurThrough)
/** f@60: a line over a picture leaves on its own (it lifts and softens away) while the picture racks into focus. */
export const LINE_EXIT = 16;
const LEAD = 0; // f@60 between a line's beat and its first word: the seam brings the line in, its first word on the cue
/** f@60 a line held over its whole picture (over) is gone before the picture's seam out begins. */
const OVER_TAIL = 6;

export type BeatKind = 'T' | 'TA' | 'A' | 'end';
export type BeatPlan = { id: string; kind: BeatKind; from: number; to: number; pair: number };
export type Mode = 'alone' | 'with' | 'over';

const P = LAUNCH.pairs;
if (P.length < 2 || P.length > 6) throw new Error(`timeline: launch.ts has ${P.length} pairs; a simple launch has 2-6 (3-4 is typical)`);
// a key word on at most 60 % of the lines (the accent ink is the emphasis; on every line it is decoration)
const keyed = P.filter((p) => /\*/.test(p.line)).length;
if (keyed > 0.6 * P.length) throw new Error(`timeline: ${keyed} of ${P.length} lines mark a key word; keep it to at most 60 % (launch.ts: drop the stars on one line)`);
/** How each line meets its picture: launch.ts `beat`, else the first line and the claim alone, the lines between with. */
export const MODES: Mode[] = P.map((p, i): Mode => p.beat ?? (i === 0 || i === P.length - 1 ? 'alone' : 'with'));
// lengths in half beats (8ths): a line's beat is its build, its read and its exit, rounded up; a picture's is its seconds
// (with: the picture alone after the line; over: the line and the picture together, the longer of the two)
const HALF = BEAT / 2;
const beatsOf = P.map((p, i) => {
  const n = wordCount(plain(p.line));
  const mode = MODES[i];
  const need = f60(LEAD + resolveLine(n, i === P.length - 1)) + f60(holdFor(n, pace)) + f60(mode === 'alone' ? SEAM_OUT : mode === 'over' ? LINE_EXIT + OVER_TAIL : LINE_EXIT);
  if (need > SEC(LINE.max)) throw new Error(`timeline: "${plain(p.line)}" needs ${(need / FPS).toFixed(2)} s; a line beat holds at most ${LINE.max} s: shorten it`);
  const want = Math.min(PIC.max, Math.max(PIC.min, p.seconds ?? PIC.house[i % PIC.house.length]));
  let a = Math.max(2, Math.round(SEC(want) / HALF));
  while (a * HALF < SEC(PIC.min)) a++;
  let t = Math.max(Math.ceil(need / HALF), Math.ceil(SEC(LINE.min) / HALF));
  // over: one beat, the line held over the whole picture (never shorter than the line needs)
  if (mode === 'over') (t = Math.max(t, a)), (a = 0);
  return { t, a, mode };
});
// the pairs end on a bar line (the end starts on a downbeat): the spare 8ths go to the pictures, last first, while they
// stay under 3.5 s, then to the last picture (never to a line: a finished line held longer only freezes)
{
  let spare = (8 - (beatsOf.reduce((n, x) => n + x.t + x.a, 0) % 8)) % 8;
  for (let i = beatsOf.length - 1; i >= 0 && spare > 0; i--) {
    const x = beatsOf[i];
    if (x.a > 0 && (x.a + 1) * HALF <= SEC(PIC.max) + 0.5) (x.a++, spare--);
  }
  const last = beatsOf[beatsOf.length - 1];
  if (last.a > 0) last.a += spare;
  else last.t += spare;
}
// the end: the element lands as the mark (18 f), the name slides out (30 f) and is read (24 + 36 f), the fact under it
// is built and read; from the frame all of it is whole the lockup holds 2-3 s (house 2.5) to the end
const END_HOLD = { min: 2, house: 2.5, max: 3 } as const;
const END_PRE = { name: 20, slide: 30, read: 54, named: 18 } as const; // f@60: the end's first frame to the name; its slide; the fact after the name; the name readable
const endWhole = f60(END_PRE.name + END_PRE.read + 22) + Math.ceil(BEAT / 4);
let endBars = 1;
while (endBars * BAR + TAIL < endWhole + SEC(END_HOLD.min)) endBars++;

const startH: number[] = [];
let acc = 0;
for (const x of beatsOf) {
  startH.push(acc);
  acc += x.t + x.a;
}
const endBeat = acc / 2;
const lastBeat = endBeat + endBars * 4;
/**
 * Each pair: its first frame (the line), the end of its line beat (alone: the cut to the picture; with: the line gone,
 * the picture racked into focus and playing on alone; over: the pair's end), its last frame, how the line meets the
 * picture and the picture's first frame (alone: the cut; with and over: the line's first frame, the picture under it).
 */
export const PAIRS = P.map((_, i) => {
  const from = i === 0 ? 0 : bt(startH[i] / 2);
  const ta = bt((startH[i] + beatsOf[i].t) / 2);
  return { k: i + 1, from, ta, to: bt((startH[i] + beatsOf[i].t + beatsOf[i].a) / 2), mode: MODES[i], pic: MODES[i] === 'alone' ? ta : from };
});
export const TOTAL = bt(lastBeat) + TAIL;

/**
 * The acts: the pairs, from frame 0, and the end on its downbeat. An act line re-draws the whole frame, so it never
 * falls on a seam's cut: the pairs play as one act (their seams are declared like any other) and the end's line falls
 * on the element carried into the mark, which has no cut.
 */
export const ACT: Record<string, { from: number; dur: number }> = {
  p1: { from: 0, dur: bt(endBeat) },
  end: { from: bt(endBeat), dur: TOTAL - bt(endBeat) },
};
export type ActName = string;
/** Bars in the body: track.py edit --bars takes this number. */
export const BARS = lastBeat / 4;

/**
 * The push closer (CUE a<pair>cut): a real camera move, never a one-frame jump. `dur` f@60 on E.strongInOut from the
 * cue, to `max` at most (and `min` at least, or no push), framing the scene's focus box with `margin` of the frame on
 * every side (the safe area); its text re-drawn sharp once it lands.
 */
export const PUSH = { dur: 24, max: 1.22, min: 1.08, margin: 0.05 } as const;

// ---- Cues (absolute frames on the 16th grid). Picture code reads these; src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {};
P.forEach((p, i) => {
  const k = i + 1;
  const pr = PAIRS[i];
  CUE[`line${k}`] = i === 0 ? (b(1) <= f60(54) ? b(1) : 0) : pr.from; // the first line is on screen by 1 s (frame 0 when the track's first downbeat comes later)
  CUE[`ta${k}`] = pr.ta; // alone: line -> picture; with: the line leaves, the picture racks into focus
  // the picture's own moments land where it is seen whole: after its line (alone, with), or across it (over)
  const over = MODES[i] === 'over';
  const a0 = (startH[i] + (over ? 0 : beatsOf[i].t)) / 2; // the first beat the picture plays alone (over: the pair's first)
  const len = (over ? beatsOf[i].t : beatsOf[i].a) / 2;
  const hitBeats = (p.hits ?? [0.35]).map((h) => Math.max(0.25, Math.min(len - 0.5, Math.round(h * len * 4) / 4)));
  hitBeats.forEach((x, j) => (CUE[`a${k}h${j + 1}`] = bt(a0 + x)));
  // a picture beat over 2.2 s takes the camera closer once: an eased push (PUSH: 24 f@60 on a strong in-out, about the
  // scene's focus box, which stays inside the safe area), starting on the beat nearest its middle that keeps 0.6 s each
  // side: two framings of the product's moment, never a one-frame jump. A line over the picture keeps the wide frame.
  const cuts: number[] = [];
  if (!over && len * BEAT > SEC(2.2)) {
    // on a beat that sounds (a track accent or a downbeat within 100 ms; any beat before the track is in), the one
    // nearest the middle that keeps 0.6 s each side and is not the picture's own moment; none: no cut, the push goes on
    const lo = SEC(0.6) / BEAT;
    const sounds = MUSIC ? [...(MUSIC.accents ?? []).map((x) => x.f), ...(MUSIC.downbeats ?? [])] : null;
    const onBeat: number[] = [];
    for (let x = Math.ceil(a0 + lo); x <= a0 + len - lo + 1e-9; x++) onBeat.push(x - a0);
    onBeat.sort((p, q) => Math.abs(p - len / 2) - Math.abs(q - len / 2));
    const c = onBeat.find((x) => !hitBeats.includes(x) && (!sounds || sounds.some((f) => Math.abs(bt(a0 + x) - f) <= 0.1 * FPS)));
    if (c !== undefined) {
      cuts.push(c);
      CUE[`a${k}cut`] = bt(a0 + c);
    }
  }
  // the camera re-frames on the beat wherever the picture's own moments leave more than 0.7 s empty (a step of 1.5 % of
  // the frame along its drift or rise, back and forth, settling in 34 f): the picture changes at least every 0.8 s
  const edges = [0, ...hitBeats, ...cuts, len].sort((x, y) => x - y);
  let m = 0;
  for (let j = 0; j + 1 < edges.length; j++) {
    const gap = (edges[j + 1] - edges[j]) * BEAT;
    const n = Math.floor(gap / f60(42));
    for (let q = 1; q <= n; q++) {
      const x = Math.round((edges[j] + ((edges[j + 1] - edges[j]) * q) / (n + 1)) * 4) / 4;
      if (x > edges[j] && x < edges[j + 1]) CUE[`a${k}m${++m}`] = bt(a0 + x);
    }
  }
});
/** An offgrid reason for a cue a track's pickup pushes off its grid (grid-check reads OFFGRID). */
export const OFFGRID: Record<string, string> = MUSIC && b(1) > f60(54) ? { line1: 'the first line is on screen by 1 s, before the first downbeat of the track' } : {};
CUE.end = ACT.end.from; // the last picture's element starts becoming the mark
const onGrid = (f: number) => {
  let lo = 0;
  while (bt((lo + 1) / 4) <= f && lo < 4 * 400) lo++;
  return bt(lo / 4);
};
const onGridUp = (f: number) => {
  const g = onGrid(f);
  return g >= f ? g : onGrid(f + BEAT / 4 + 0.5);
};
// a long end lets the name be read longer before the fact arrives (inside the name's own reading window), so the
// lockup never holds past 3 s
const rest = Math.min(f60(72), Math.max(0, ACT.end.dur - endWhole - SEC(END_HOLD.house)));
CUE.name = onGridUp(ACT.end.from + f60(END_PRE.name)); // the name slides out from behind the mark
CUE.lockup = onGridUp(CUE.name + f60(END_PRE.slide)); // the lockup is whole and centred: the payoff
CUE.close = onGridUp(CUE.name + f60(END_PRE.read) + rest); // the one fact rises under it, once the name is read
CUE.last = bt(lastBeat);

//** The beat plan (grid-check `beats`): what each stretch of the film is, a line alone, a line over a picture, a picture, the end. */
export const BEAT_PLAN: BeatPlan[] = [];
P.forEach((_, i) => {
  const k = i + 1;
  const pr = PAIRS[i];
  if (pr.mode === 'over') return void BEAT_PLAN.push({ id: `line${k}`, kind: 'TA', from: pr.from, to: pr.to, pair: k });
  BEAT_PLAN.push({ id: `line${k}`, kind: pr.mode === 'with' ? 'TA' : 'T', from: pr.from, to: pr.ta, pair: k });
  BEAT_PLAN.push({ id: `pic${k}`, kind: 'A', from: pr.ta, to: pr.to, pair: k });
});
BEAT_PLAN.push({ id: 'end', kind: 'end', from: ACT.end.from, to: TOTAL, pair: 0 });
/** The share of each beat kind in the body (T, TA, A, in %), for the plan print and the review: about 25 / 30 / 37. */
export const BEAT_MIX = (() => {
  const body = BEAT_PLAN.filter((x) => x.kind !== 'end');
  const share = (k: BeatKind) => Math.round((100 * body.filter((x) => x.kind === k).length) / Math.max(1, body.length));
  return { T: share('T'), TA: share('TA'), A: share('A') };
})();

// The seam plan: every change of picture carries something, and the frame is never empty between two scenes.
//   line -> picture (T -> A)      seamTA: matchCut (the word slot holds the centre across the cut, the picture grows
//                                 on), velocityCut (the line leaves at speed, the picture arrives on it), blurThrough
//   picture -> line (A -> T)      seamAT: recede (the picture falls back, softening, while the line builds over it) or
//                                 zoomThrough (the camera pushes into the picture's focus, the line building over the
//                                 push); never a picture blurred away to an empty ground
//   picture -> picture (A -> TA)  seamAA: velocityCut (one camera move carried across the cut), matchCut (the focus
//                                 point holds its place, the ground kept), blurThrough (the cut inside a blur); the
//                                 film's carried element (product.tsx IDEA) flies between the two scenes over any of
//                                 them (a push through would fill the frame with the outgoing picture and lose the
//                                 ground: the incoming picture rises in under its line, never at the push's anchor)
//   out of the claim              velocityCut: the claim's colour field sweeps off at speed (a ground flip carried by
//                                 motion, never a match cut across it)
//   into the end                  the last picture's element carried into the mark
// A line over its picture (with) leaves on its own and the picture racks into focus: one shot, no seam. The dealt kind
// and its next choice take turns at each kind of change, and no kind runs over 45 % of them.
export type SeamRecipe = 'exitEnter' | 'textSwap' | 'matchCut' | 'velocityCut' | 'blurThrough' | 'zoomThrough' | 'sharedElement' | 'recede';
export type SeamClass = 'TA' | 'AT' | 'AA' | 'end';
export type SeamPlan = { recipe: SeamRecipe; at: number; dir?: 'left' | 'right' | 'up' | 'down'; id: string; from: number; to: number; cls: SeamClass };
type Change = Exclude<SeamClass, 'end'>;
const ALT: Record<Change, Record<string, SeamRecipe>> = {
  TA: { matchCut: 'velocityCut', velocityCut: 'matchCut', blurThrough: 'matchCut' },
  AT: { recede: 'zoomThrough', zoomThrough: 'recede' },
  AA: { velocityCut: 'matchCut', matchCut: 'velocityCut', blurThrough: 'velocityCut' },
};
const OPTIONS: Record<Change, SeamRecipe[]> = { TA: ['matchCut', 'velocityCut', 'blurThrough'], AT: ['recede', 'zoomThrough'], AA: ['velocityCut', 'matchCut', 'blurThrough'] };
const KIND: Record<SeamRecipe, SeamKind> = { exitEnter: 'breath', textSwap: 'defocus', matchCut: 'morph', velocityCut: 'velocity', blurThrough: 'defocus', zoomThrough: 'zoomThrough', sharedElement: 'morph', recede: 'breath' };
/** Every change of picture and how it is carried: the stage draws each, SEAMS declares them. */
export const SEAM_PLAN: SeamPlan[] = [];
{
  const list: SeamPlan[] = [];
  const turn: Record<Change, number> = { TA: 0, AT: 0, AA: 0 };
  const deal = { TA: DEAL.seamTA, AT: DEAL.seamAT, AA: DEAL.seamAA } as Record<Change, SeamRecipe>;
  const pick = (c: Change) => (turn[c]++ % 2 === 0 ? deal[c] : ALT[c][deal[c]]);
  const beat = (id: string) => BEAT_PLAN.findIndex((x) => x.id === id);
  let side = 0;
  const dirOf = (r: SeamRecipe): SeamPlan['dir'] => (r === 'velocityCut' ? (side++ % 2 ? 'right' : 'left') : 'up');
  P.forEach((_, i) => {
    const k = i + 1;
    const pr = PAIRS[i];
    if (i > 0) {
      const into = beat(`line${k}`);
      const cls: Change = pr.mode === 'alone' ? 'AT' : 'AA';
      const r = pick(cls);
      list.push({ recipe: r, at: pr.from, dir: dirOf(r), id: cls === 'AT' ? `pic${i}-line${k}` : `pic${i}-pic${k}`, from: into - 1, to: into, cls });
    }
    if (pr.mode === 'alone') {
      // out of the claim: its colour field sweeps off at speed
      const r = k === P.length ? 'velocityCut' : pick('TA');
      list.push({ recipe: r, at: CUE[`ta${k}`], dir: dirOf(r), id: `line${k}-pic${k}`, from: beat(`line${k}`), to: beat(`pic${k}`), cls: 'TA' });
    }
  });
  // into the end (on the act line, so never a cut there): the last picture's element carried into the mark (turning
  // as it goes, for the badge)
  list.push({ recipe: 'sharedElement', at: ACT.end.from, id: 'into-the-lockup', from: BEAT_PLAN.length - 2, to: BEAT_PLAN.length - 1, cls: 'end' });
  // no kind over 45 %: the most used one gives way to another choice of its class where it repeats
  const cap = Math.floor(0.45 * list.length);
  const ACT_LINES = new Set(Object.values(ACT).map((a) => a.from));
  for (let guard = 0; guard < 8; guard++) {
    const n = new Map<string, number>();
    for (const s of list) n.set(KIND[s.recipe], (n.get(KIND[s.recipe]) ?? 0) + 1);
    const [top, c] = [...n.entries()].sort((x, y) => y[1] - x[1])[0];
    if (c <= cap) break;
    // the latest seam of the top kind that can take another kind
    // the least used kind its class offers (never the top one; a push through never cuts on an act line)
    const nextOf = (x: SeamPlan) => (x.cls === 'end' || x.id === `line${P.length}-pic${P.length}` ? undefined : OPTIONS[x.cls].filter((r) => KIND[r] !== top && (r !== 'zoomThrough' || !ACT_LINES.has(x.at))).sort((a, b) => (n.get(KIND[a]) ?? 0) - (n.get(KIND[b]) ?? 0))[0]);
    const s = [...list].reverse().find((x) => KIND[x.recipe] === top && nextOf(x));
    if (!s) break;
    s.recipe = nextOf(s) as SeamRecipe;
    s.dir = dirOf(s.recipe);
  }
  SEAM_PLAN.push(...list);
}

// ---- Every on-screen word of the film.
export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name';
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};
/** The seam out of a line beat starts this many frames before its cut (its exit, fx/Seam seamSpan). */
export const SEAM_LEAD: Record<string, number> = { matchCut: f60(10), exitEnter: f60(18), blurThrough: f60(14), velocityCut: f60(12) };
/** A line after a push through starts building this many frames before the cut, over the push: never an empty frame. */
export const LINE_EARLY: Partial<Record<SeamRecipe, number>> = { zoomThrough: f60(10) };
const leadOf = (k: number) => SEAM_LEAD[SEAM_PLAN.find((s) => s.id === `line${k}-pic${k}`)?.recipe ?? 'exitEnter'] ?? f60(18);
/** The frame a line starts to leave: alone, its seam's lead before the cut; with and over, its own exit, as it ends. */
const lineOut = (i: number) => (PAIRS[i].mode === 'alone' ? CUE[`ta${i + 1}`] - leadOf(i + 1) : PAIRS[i].mode === 'with' ? PAIRS[i].ta - f60(LINE_EXIT) : PAIRS[i].to - f60(LINE_EXIT + OVER_TAIL));
export const COPY: Copy[] = [];
P.forEach((p, i) => {
  const k = i + 1;
  const text = plain(p.line);
  const into = SEAM_PLAN.find((s) => s.at === PAIRS[i].from && s.cls === 'AT');
  const early = i > 0 && into ? LINE_EARLY[into.recipe] ?? 0 : 0;
  const inF = CUE[`line${k}`] + (i === 0 ? 0 : f60(LEAD)) - early;
  // the blur voice brings a line into focus whole: its hold is read, not a per-word rate
  COPY.push({ id: `line${k}`, text, in: inF, resolved: inF + f60(resolveLine(wordCount(text), i === P.length - 1)), out: lineOut(i), ...(DEAL.voice === 'blur' ? { reveal: 'focus' as const } : {}) });
  const pr = PAIRS[i];
  // the picture's strings are read once it is sharp: alone, from the cut; with, from the rack (soft under the line, they
  // are not readable); over, once the line is whole
  const read = pr.mode === 'with' ? pr.ta : pr.mode === 'over' ? COPY[COPY.length - 1].resolved : pr.pic;
  (p.ui ?? []).forEach((u, j) => COPY.push({ id: `ui${k}.${j + 1}`, text: u, kind: 'ui', in: read, resolved: read + f60(20), out: pr.to }));
});
COPY.push({ id: 'wordmark', text: LAUNCH.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(END_PRE.named), out: TOTAL });
COPY.push({ id: 'close', text: LAUNCH.close, in: CUE.close, resolved: CUE.close + f60(22), out: TOTAL, reveal: 'focus' });

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).
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

/**
 * The seams, as fx/Seam seamDeclares writes them (kind from the recipe, the recipe in the id), and the focus pulls: a
 * line over its picture (with) leaves and the picture racks into focus, one shot changing from the line beat to the
 * picture beat without a cut (a defocus seam, `rack:`). The push closer is a camera move inside its shot (PUSH), not a
 * seam.
 */
const RACKS: Seam[] = PAIRS.filter((p) => p.mode === 'with').map((p) => ({ at: p.ta, kind: 'defocus', carry: 'scale', id: `rack:line${p.k}-pic${p.k}` }));
export const SEAMS: Seam[] = [...RACKS, ...SEAM_PLAN.map((s) => {
  const axis = s.dir === 'left' || s.dir === 'right' ? 'x' : 'y';
  const carry = ({ matchCut: 'scale', velocityCut: axis, blurThrough: 'scale', zoomThrough: 'scale', sharedElement: 'shape', recede: 'scale' } as Partial<Record<SeamRecipe, Seam['carry']>>)[s.recipe];
  const out: Seam = { at: s.at, kind: KIND[s.recipe], id: `${s.recipe}:${s.id}` };
  if (carry) out.carry = carry;
  if (s.recipe === 'velocityCut' || s.recipe === 'exitEnter') out.dir = s.dir === 'left' || s.dir === 'up' ? -1 : 1;
  if (s.id === 'into-the-lockup') out.signature = true;
  return out;
})].sort((x, y) => x.at - y.at);
export const STEPPED: SteppedRange[] = [];
/** The hero line's snap (its last word one frame at HERO.from x, timeline HERO): the film's one designed flash. */
export const FLASHES: Flash[] = (() => {
  const c = COPY.find((x) => x.id === `line${P.length}`) as Copy;
  return [{ f: c.in + Math.round(f60x(heroSnapAt(wordCount(c.text)))), frames: 1, id: 'hero-snap' }];
})();
export const CAMERA_BLUR: CameraBlurRange[] = [];
/**
 * The ground family's one colour event: the white-with-a-band family floods the claim's beat with the band's colour
 * (the claim, alone, sits on the colour field, as the other families' claim sits on the accent field the scene before
 * it grows: stage.tsx FIELD); the light-then-dark family turns dark at the middle pair and stays.
 */
const mid = Math.floor(P.length / 2) + 1;
const claimAlone = MODES[P.length - 1] === 'alone';
export const COLOUR: ColourRange[] =
  DEAL.ground === 'whiteBand' ? [claimAlone ? { from: PAIRS[P.length - 1].from, to: PAIRS[P.length - 1].ta, id: 'band-flood' } : { from: PAIRS[mid - 1].from, to: PAIRS[mid - 1].ta, id: 'band-flood' }]
  : DEAL.ground === 'lightDark' ? [{ from: PAIRS[mid - 1].from, to: Math.min(TOTAL, PAIRS[mid - 1].from + SEC(2)), id: 'turn-to-dark' }]
  : [];
/** The frame the light-then-dark family turns dark (never, for the others). */
export const DARK_FROM = DEAL.ground === 'lightDark' ? PAIRS[mid - 1].from : DEAL.ground === 'blackField' || DEAL.ground === 'deepPool' ? 0 : Infinity;
/** The one lock: from the frame the lockup and the fact are whole, they hold to the end, creeping. */
export const END: EndLock = { from: (COPY.find((c) => c.id === 'close') as Copy).resolved, to: TOTAL };
export const REVEAL = CUE.lockup;
export const SPRING_CLASS = '';
/** CUE names that must land on a music event: none (every act line already does). */
export const STRUCTURAL: string[] = [];
export const SALIENCE: Record<string, Salience> = Object.fromEntries(
  Object.keys(CUE).map((k) => [k, /^line/.test(k) ? 'copy' : /^ta/.test(k) ? (MODES[Number(k.slice(2)) - 1] === 'alone' ? 'cut' : 'move') : /^a\d+cut$/.test(k) ? 'move' : /^a\d+h/.test(k) ? 'hit' : /^a\d+m/.test(k) ? 'move' : k === 'close' ? 'copy' : k === 'end' ? 'cut' : k === 'last' ? 'cut' : 'hit'] as const),
);

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
/** The fragments of one chain, in order of arrival (none in this template: every line is whole). */
export const chainOf = (id: string): Copy[] => COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
