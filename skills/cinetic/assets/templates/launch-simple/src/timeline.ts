// The single source of truth for time, for a simple launch: a line alone, the product acting, the next line, the
// product again ... the lockup. The script lives in src/launch.ts, the choices in src/deal.ts; everything below is
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
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, MUSIC && MUSIC.end.hold === undefined ? Math.ceil(MUSIC.end.f - bar(MUSIC.bars + 1)) + FPS : 0);

// ---- The text voice (deal.ts voice): when a line of n words is whole, in 60 fps frames from its first frame.
/** The voice's house numbers (f@60): word fade, stagger, re-centre (a glide); the blur-in; the ink-in. */
export const VOICE = {
  build: { fade: 20, stagger: 6, recentre: 24 },
  blur: { dur: 34, blur: 12, from: 1.04 },
  ink: { stagger: 6, ink: 10, fade: 8 },
} as const;
export const resolveOf = (n: number): number =>
  DEAL.voice === 'build' ? VOICE.build.stagger * (n - 1) + Math.max(VOICE.build.fade, VOICE.build.recentre) : DEAL.voice === 'blur' ? VOICE.blur.dur : VOICE.ink.stagger * (n - 1) + VOICE.ink.ink;

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

// ---- The beat plan: every pair is a line beat (T, or T+A when the line sits over the picture's start) then a picture
// beat (A), each on the track's 8ths; the pairs together end on a bar line, then the end in whole bars, then the tail.
// A pair that starts on a downbeat opens an act (acts start on downbeats: grid-check structural-on-music).
const SEC = (s: number) => s * FPS;
const LINE = { min: 0.5, max: 2.4 } as const; // a line alone holds 0.5-2.4 s (house: about 1.3)
const PIC = { min: 1, max: 3.5, house: [2.6, 1.6, 2.2, 3.0] } as const; // a picture beat runs 1-3.5 s; unset, they vary (a long one beside a short one)
const SEAM_OUT = 14; // f@60 the outgoing line needs inside its beat for the seam (the longest line exit, blurThrough)
const LEAD = 0; // f@60 between a line's beat and its first word: the seam brings the line in, its first word on the cue

export type BeatKind = 'T' | 'TA' | 'A' | 'end';
export type BeatPlan = { id: string; kind: BeatKind; from: number; to: number; pair: number };

const P = LAUNCH.pairs;
if (P.length < 2 || P.length > 6) throw new Error(`timeline: launch.ts has ${P.length} pairs; a simple launch has 2-6 (3-4 is typical)`);
// a key word on at most 60 % of the lines (the accent ink is the emphasis; on every line it is decoration)
const keyed = P.filter((p) => /\*/.test(p.line)).length;
if (keyed > 0.6 * P.length) throw new Error(`timeline: ${keyed} of ${P.length} lines mark a key word; keep it to at most 60 % (launch.ts: drop the stars on one line)`);
// lengths in half beats (8ths): a line's beat is its build, its read and its exit, rounded up; a picture's is its seconds
const HALF = BEAT / 2;
const beatsOf = P.map((p, i) => {
  const n = wordCount(plain(p.line));
  const need = f60(LEAD + resolveOf(n)) + f60(holdFor(n, pace)) + f60(SEAM_OUT);
  if (need > SEC(LINE.max)) throw new Error(`timeline: "${plain(p.line)}" needs ${(need / FPS).toFixed(2)} s; a line alone holds at most ${LINE.max} s: shorten it`);
  const t = Math.max(Math.ceil(need / HALF), Math.ceil(SEC(LINE.min) / HALF));
  const want = Math.min(PIC.max, Math.max(PIC.min, p.seconds ?? PIC.house[i % PIC.house.length]));
  let a = Math.max(2, Math.round(SEC(want) / HALF));
  while (a * HALF < SEC(PIC.min)) a++;
  return { t, a };
});
// the pairs end on a bar line (the end starts on a downbeat): the spare 8ths go to the pictures, last first, while they
// stay under 3.5 s, then to the lines while they stay under 2.4 s, then to the last picture
{
  let spare = (8 - (beatsOf.reduce((n, x) => n + x.t + x.a, 0) % 8)) % 8;
  for (let pass = 0; pass < 2 && spare > 0; pass++)
    for (let i = beatsOf.length - 1; i >= 0 && spare > 0; i--) {
      const x = beatsOf[i];
      if (pass === 0 && (x.a + 1) * HALF <= SEC(PIC.max) + 0.5) (x.a++, spare--);
      else if (pass === 1 && (x.t + 1) * HALF <= SEC(LINE.max) + 0.5) (x.t++, spare--);
    }
  beatsOf[beatsOf.length - 1].a += spare;
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
/** Each pair: its first frame (the line), the cut to the picture, its last frame. */
export const PAIRS = P.map((_, i) => ({ k: i + 1, from: i === 0 ? 0 : bt(startH[i] / 2), ta: bt((startH[i] + beatsOf[i].t) / 2), to: bt((startH[i] + beatsOf[i].t + beatsOf[i].a) / 2) }));
export const TOTAL = bt(lastBeat) + TAIL;

/**
 * The acts: a new act at every pair that starts on a downbeat (the first on frame 0), and the end. A pair that starts
 * between bar lines plays inside the act before it (its seam is declared like any other).
 */
export const ACT: Record<string, { from: number; dur: number }> = {};
{
  const starts = P.map((_, i) => i).filter((i) => i === 0 || startH[i] % 8 === 0);
  starts.forEach((i, j) => {
    const from = PAIRS[i].from;
    const to = j + 1 < starts.length ? PAIRS[starts[j + 1]].from : bt(endBeat);
    ACT[`p${i + 1}`] = { from, dur: to - from };
  });
  ACT.end = { from: bt(endBeat), dur: TOTAL - bt(endBeat) };
}
export type ActName = string;
/** Bars in the body: track.py edit --bars takes this number. */
export const BARS = lastBeat / 4;

// ---- Cues (absolute frames on the 16th grid). Picture code reads these; src/sync.ts turns them into sound.
export const CUE: Record<string, number> = {};
P.forEach((p, i) => {
  const k = i + 1;
  const pr = PAIRS[i];
  CUE[`line${k}`] = i === 0 ? (b(1) <= f60(54) ? b(1) : 0) : pr.from; // the first line is on screen by 1 s (frame 0 when the track's first downbeat comes later)
  CUE[`ta${k}`] = pr.ta; // line -> picture
  const a0 = (startH[i] + beatsOf[i].t) / 2; // the picture's first beat
  const len = beatsOf[i].a / 2;
  const hitBeats = (p.hits ?? [0.35]).map((h) => Math.max(0.25, Math.min(len - 0.5, Math.round(h * len * 4) / 4)));
  hitBeats.forEach((x, j) => (CUE[`a${k}h${j + 1}`] = bt(a0 + x)));
  // a picture beat over 2.2 s cuts once to a closer frame of the same shot (x1.45 in one frame about the scene's focus,
  // a crop that bleeds past the frame, still pushing: a cut-in), on the beat nearest its middle that keeps 0.6 s each
  // side: shots of 1-2 s, and two framings of the product's moment
  const cuts: number[] = [];
  if (len * BEAT > SEC(2.2)) {
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

// The seam plan: the dealt kind and its next choice take turns at each kind of change, so no kind runs over 45 % of
// them; into the end, the element carried into the mark.
export type SeamRecipe = 'exitEnter' | 'textSwap' | 'matchCut' | 'velocityCut' | 'blurThrough' | 'zoomThrough' | 'sharedElement';
export type SeamPlan = { recipe: SeamRecipe; at: number; dir?: 'left' | 'right' | 'up' | 'down'; id: string; from: number; to: number };
// line -> picture may carry speed (the outgoing line is whole and the picture is whole on its first frame); picture ->
// line never does (the incoming line builds from nothing), so the picture blurs away or the camera pushes through it
const ALT_TA: Record<string, SeamRecipe> = { matchCut: 'blurThrough', blurThrough: 'matchCut', velocityCut: 'matchCut' };
const ALT_AT: Record<string, SeamRecipe> = { blurThrough: 'zoomThrough', zoomThrough: 'blurThrough' };
const KIND: Record<SeamRecipe, SeamKind> = { exitEnter: 'breath', textSwap: 'defocus', matchCut: 'morph', velocityCut: 'velocity', blurThrough: 'defocus', zoomThrough: 'zoomThrough', sharedElement: 'morph' };
/** Every change of beat and how it is carried: the stage draws each with fx/Seam, SEAMS declares them. */
export const SEAM_PLAN: SeamPlan[] = [];
{
  const list: SeamPlan[] = [];
  let ta = 0;
  let at = 0;
  P.forEach((_, i) => {
    const k = i + 1;
    if (i > 0) {
      // a pair that opens an act starts on the act line: a push through would cut there in one frame, so it blurs through
      const r = (startH[i] % 8 === 0 ? (at++, 'blurThrough') : at++ % 2 === 0 ? DEAL.seamAT : ALT_AT[DEAL.seamAT]) as SeamRecipe;
      list.push({ recipe: r, at: PAIRS[i].from, dir: 'up', id: `pic${i}-line${k}`, from: 2 * i - 1, to: 2 * i });
    }
    const r = (ta++ % 2 === 0 ? DEAL.seamTA : ALT_TA[DEAL.seamTA]) as SeamRecipe;
    list.push({ recipe: r, at: CUE[`ta${k}`], dir: r === 'velocityCut' ? (k % 2 ? 'left' : 'right') : 'up', id: `line${k}-pic${k}`, from: 2 * i, to: 2 * i + 1 });
  });
  // into the end (on the act line, so never a cut there): the last picture's element carried into the mark (turning
  // as it goes, for the badge)
  list.push({ recipe: 'sharedElement', at: ACT.end.from, id: 'into-the-lockup', from: 2 * P.length - 1, to: 2 * P.length });
  // no kind over 45 %: the most used one gives way to the third choice where it repeats
  const cap = Math.floor(0.45 * list.length);
  const ACT_LINES = new Set(Object.values(ACT).map((a) => a.from));
  for (let guard = 0; guard < 8; guard++) {
    const n = new Map<string, number>();
    for (const s of list) n.set(KIND[s.recipe], (n.get(KIND[s.recipe]) ?? 0) + 1);
    const [top, c] = [...n.entries()].sort((x, y) => y[1] - x[1])[0];
    if (c <= cap) break;
    // the latest seam of the top kind that can take another kind (a push through never cuts on an act line)
    const nextOf = (x: SeamPlan) => (x.id.startsWith('line') ? (['matchCut', 'velocityCut', 'blurThrough'] as SeamRecipe[]).find((r) => KIND[r] !== top) : (['blurThrough', 'zoomThrough'] as SeamRecipe[]).find((r) => KIND[r] !== top && (r !== 'zoomThrough' || !ACT_LINES.has(x.at))));
    const s = [...list].reverse().find((x) => KIND[x.recipe] === top && x.id !== 'into-the-lockup' && nextOf(x));
    if (!s) break;
    s.recipe = nextOf(s) as SeamRecipe;
    if (s.recipe === 'velocityCut') s.dir = 'left';
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
const leadOf = (k: number) => SEAM_LEAD[SEAM_PLAN.find((s) => s.id === `line${k}-pic${k}`)?.recipe ?? 'exitEnter'] ?? f60(18);
export const COPY: Copy[] = [];
P.forEach((p, i) => {
  const k = i + 1;
  const text = plain(p.line);
  const inF = CUE[`line${k}`] + (i === 0 ? 0 : f60(LEAD));
  // the blur voice brings a line into focus whole: its hold is read, not a per-word rate
  COPY.push({ id: `line${k}`, text, in: inF, resolved: inF + f60(resolveOf(wordCount(text))), out: CUE[`ta${k}`] - leadOf(k), ...(DEAL.voice === 'blur' ? { reveal: 'focus' as const } : {}) });
  const pr = PAIRS[i];
  (p.ui ?? []).forEach((u, j) => COPY.push({ id: `ui${k}.${j + 1}`, text: u, kind: 'ui', in: p.over ? pr.from : pr.ta, resolved: (p.over ? pr.from : pr.ta) + f60(20), out: pr.to }));
});
COPY.push({ id: 'wordmark', text: LAUNCH.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(END_PRE.named), out: TOTAL });
COPY.push({ id: 'close', text: LAUNCH.close, in: CUE.close, resolved: CUE.close + f60(22), out: TOTAL, reveal: 'focus' });

/** The beat plan (grid-check `beats`): what each stretch of the film is, a line alone, a line over a picture, a picture, the end. */
export const BEAT_PLAN: BeatPlan[] = [];
P.forEach((p, i) => {
  const k = i + 1;
  BEAT_PLAN.push({ id: `line${k}`, kind: p.over ? 'TA' : 'T', from: PAIRS[i].from, to: PAIRS[i].ta, pair: k });
  BEAT_PLAN.push({ id: `pic${k}`, kind: 'A', from: PAIRS[i].ta, to: PAIRS[i].to, pair: k });
});
BEAT_PLAN.push({ id: 'end', kind: 'end', from: ACT.end.from, to: TOTAL, pair: 0 });

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

/** The seams, as fx/Seam seamDeclares writes them (kind from the recipe, the recipe in the id). */
/** The seams, as fx/Seam seamDeclares writes them (kind from the recipe, the recipe in the id), and the cuts to a closer
 * frame: a hard cut in one frame (the ground kept, the scene's focus held), never a move that has to land. */
const PUNCH: Seam[] = Object.keys(CUE).filter((k) => /^a\d+cut$/.test(k)).map((k) => ({ at: CUE[k], kind: 'hard', id: `punchIn:pic${k.slice(1, -3)}` }));
export const SEAMS: Seam[] = [...PUNCH, ...SEAM_PLAN.map((s) => {
  const axis = s.dir === 'left' || s.dir === 'right' ? 'x' : 'y';
  const carry = ({ matchCut: 'scale', velocityCut: axis, blurThrough: 'scale', zoomThrough: 'scale', sharedElement: 'shape' } as Partial<Record<SeamRecipe, Seam['carry']>>)[s.recipe];
  const out: Seam = { at: s.at, kind: KIND[s.recipe], id: `${s.recipe}:${s.id}` };
  if (carry) out.carry = carry;
  if (s.recipe === 'velocityCut' || s.recipe === 'exitEnter') out.dir = s.dir === 'left' || s.dir === 'up' ? -1 : 1;
  if (s.id === 'into-the-lockup') out.signature = true;
  return out;
})].sort((x, y) => x.at - y.at);
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/**
 * The ground family's one colour event: the white-with-a-band family floods the middle line's beat with the band's
 * colour (that line sits on the colour field); the light-then-dark family turns dark at the middle pair and stays.
 */
const mid = Math.floor(P.length / 2) + 1;
export const COLOUR: ColourRange[] =
  DEAL.ground === 'whiteBand' ? [{ from: PAIRS[mid - 1].from, to: PAIRS[mid - 1].ta, id: 'band-flood' }]
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
  Object.keys(CUE).map((k) => [k, /^line/.test(k) ? 'copy' : /^ta/.test(k) ? 'cut' : /^a\d+cut$/.test(k) ? 'move' : /^a\d+h/.test(k) ? 'hit' : /^a\d+m/.test(k) ? 'move' : k === 'close' ? 'copy' : k === 'end' ? 'cut' : k === 'last' ? 'cut' : 'hit'] as const),
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
