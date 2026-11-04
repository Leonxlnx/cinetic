// The single source of truth for time, for a camera-led teaser on a dark stage: every shot is one layout under one
// camera path (lib/camera camPath) on a lit ground of its own, one carrying move per shot with its secondaries riding
// it, every hold drifting, every move landing before its cut. The request box arriving, a whip into its close-up and
// the send button, the app window streaming code under the film's one 3D turn, the proof in depth, the page it made
// with a modal toast, the product's stages, the end mark. Each act plays one of two or three devices on the same cues
// (src/deal.ts DEAL); the declarations below follow the deal. Picture (src/acts), sound (src/sync.ts -> out/cues.json)
// and QA (scripts/grid-check.ts) all import this file. The facts live in src/teaser.ts. Think in beats, never in
// seconds. Keep it free of React and CSS imports: Node scripts load it directly.
import { DEAL } from './deal';
import { holdFor, PACE, readingWindows, wordCount, type PaceName } from './lib/pace';
import { LOGOS } from './logos';
import { bar, MUSIC } from './music';
import { TEASER } from './teaser';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track yet, and the timeline runs on its own BPM grid
 * below. With a track, scripts/audio/track.py grid writes src/music.ts, BPM becomes the track's and b() follows the
 * music's bars. A teaser is cut to its track's hits: choose it first.
 */
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
/** The film's pace (src/lib/pace.ts): the crisp launch tempo. */
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
/** Absolute frame `x` beats from the film's first downbeat, on the 16th grid (x in quarter beats). */
export const bt = (x: number) => {
  const q = Math.round(x * 4);
  const n = Math.floor(q / 4);
  return b(1 + Math.floor(n / 4), n % 4, q % 4);
};

/**
 * After the last bar the lockup holds while the music ends, never on a cut: 1.9 s for the name and the close to read,
 * or MUSIC.end.hold (track.py grid) when the ending needs longer: the track's own final hit ringing out (1.5-2.5 s), a
 * hit that rings, or a 2-3 s fade under the end card.
 */
export const TAIL = Math.max(Math.round(1.9 * FPS), MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0);

/**
 * Where each act starts, in beats (10 bars at 120 BPM: 22 s with the tail). Every act line sits on a bar line, so with
 * a track in each one lands on a downbeat (grid-check structural-on-music): the 2-bar request box, the 1-bar
 * close-up, the 2-bar window, the 1-bar proof, the 2-bar page and its modal, the 1-bar stages and the 1-bar end.
 * Retime in whole bars.
 */
export const BEATS = { input: 0, launch: 8, window: 12, cards: 20, page: 24, stages: 32, end: 36, last: 40 } as const;

// Acts: contiguous, [from, from + dur). Each act is its own composition in Root.tsx (in this order). The first act
// starts on frame 0 even when the track's first downbeat comes later (a pickup): its own cues start on that downbeat.
const order = ['input', 'launch', 'window', 'cards', 'page', 'stages', 'end'] as const;
export type ActName = (typeof order)[number];
export const ACT = Object.fromEntries(
  order.map((k, i) => {
    const from = i === 0 ? 0 : bt(BEATS[k]);
    const to = i + 1 < order.length ? bt(BEATS[order[i + 1]]) : bt(BEATS.last) + TAIL;
    return [k, { from, dur: to - from }];
  }),
) as Record<ActName, { from: number; dur: number }>;

export const TOTAL = bt(BEATS.last) + TAIL;

// Named sync points (absolute frames), all on the 16th grid. Picture code reads these; src/sync.ts turns them into
// sound events. Salience below says what each asks of the eye. One carrying move per shot: its cue first, the
// secondaries a little after it, overlapping its tail, never queued after it.
export const CUE: Record<string, number> = {
  // input: the box arrives (its device's carrying move, the camera creeping), the what line over it, a rim light
  // glides, the request types, the send button arms; the whip right into the close-up
  rise: bt(0),
  what: bt(0.5),
  sweep: bt(1.5),
  type: bt(2.5),
  arm: bt(5.5),
  whipR: bt(7),
  // launch: the whip carried into the close-up, decaying, a slow push; the camera dives into the send button from `fly`
  // (it has the button framed on `aim`), or the button launches on `launch` and the cut takes it while it still
  // accelerates out of the top of the frame (the J-curve's y crosses the frame edge about 24 f in at 60 fps)
  slide: bt(8),
  push: bt(8.5),
  fly: bt(10.5),
  aim: bt(11.25),
  launch: bt(11.25),
  // window: the window arrives on the film's one 3D turn, its status chip, the code streaming; a slow drift; the lens
  // glides to the line the product just wrote; the whip out
  window: bt(12),
  build: bt(12.75),
  stream: bt(13),
  settle3d: bt(15.75),
  lens: bt(16.5),
  whipOut: bt(19.25),
  // cards: the whip carried down into the proof; the connect line, its slot rolling the real marks; the stack leaves up
  cards: bt(20),
  connect: bt(20.25),
  fan: bt(20.75),
  cardsOut: bt(23.25),
  // page: arrives moving up; the cards rise in a cascade a beat apart; the modal (blur, dim, push, the toast at the
  // push's midpoint); a pull-out into black
  page: bt(24),
  sib1: bt(24.75),
  sib2: bt(25.25),
  dim: bt(28),
  toast: bt(28) + f60(21), // offgrid: the toast pops at the modal push's midpoint (lib/camera-moves MODAL.push60 / 2)
  blackout: bt(31.25),
  // stages: the three stages, a glide apart
  stage1: bt(32),
  stage2: bt(33.25),
  stage3: bt(34.5),
  // end: the mark arrives (comets meeting, or its parts assembling), the name, the close
  comets: bt(36),
  mark: bt(37),
  name: bt(37),
  close: bt(39.25), // the name is read first at any tempo (14 f to resolve + its hold), then the close
  lockup: bt(37),
  last: bt(40),
};

// ---- Declarations: what the picture does on purpose (grid-check validates them; export-cues writes them).

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band (lib/look.ts GRAMMAR.shot.band). */
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

/** A crisp film: the camera's whips smear along their own travel (fx/Defocus DirBlur from lib/camera camVel). */
export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam is the camera's: a whip into the close-up, the button leaving (or a dive through it), a whip out, momentum up, through black, the end. */
export const SEAMS: Seam[] = [
  { at: ACT.launch.from, kind: 'whip', carry: 'x', dir: 1, signature: true, id: DEAL.cut === 'flash' ? 'whip-right-with-a-flash' : 'whip-right-smeared' },
  DEAL.launch === 'dive' ? { at: ACT.window.from, kind: 'mask', carry: 'scale', id: 'dive-through-the-button' } : { at: ACT.window.from, kind: 'hard', id: 'cut-as-the-button-leaves' },
  { at: ACT.cards.from, kind: 'whip', carry: 'y', dir: -1, id: 'whip-out-at-a-blur-peak' },
  { at: ACT.page.from, kind: 'velocity', carry: 'y', dir: -1, id: 'cards-leave-up' },
  { at: ACT.stages.from, kind: 'colour', carry: 'colour', id: 'through-black' },
  DEAL.stages === 'claim' ? { at: ACT.end.from, kind: 'wipe', carry: 'y', dir: -1, id: 'the-accent-wipes-up' } : DEAL.end === 'comets' ? { at: ACT.end.from, kind: 'light', id: 'comets-out-of-the-last-word' } : { at: ACT.end.from, kind: 'defocus', id: 'stages-go-soft-into-the-mark' },
  // the comets collapse at full speed and the cut lands on the frame they meet (acts/End.tsx cometsRun): a cut at speed
  ...(DEAL.end === 'comets' ? [{ at: CUE.mark, kind: 'hard' as const, id: 'cut-on-the-comets-meeting' }] : []),
];
/**
 * The designed cuts, for forensics.py --cuts: the act lines where the picture changes on a whip's blur peak or a hard
 * cut (a wipe included), and the hard cut inside the end (the comets' meeting). The carried seams (velocity, the dive,
 * a light, a defocus) are not cuts: the picture runs through them. Print them with
 *   npx tsx -e "import('./src/timeline.ts').then((t) => console.log((t.CUTS ?? t.default.CUTS).join(',')))"
 */
export const CUTS: number[] = SEAMS.filter((s) => s.kind === 'whip' || s.kind === 'hard' || s.kind === 'wipe').map((s) => s.at);
/** The designed steps: none (lists glide, stages roll on glides). */
export const STEPPED: SteppedRange[] = [];
/** The one snap device, when the deal has it: a single near-white frame inside the whip right. */
export const FLASHES: Flash[] = DEAL.cut === 'flash' ? [{ f: ACT.launch.from - 1, frames: 1, id: 'flash-in-the-whip' }] : [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events: the claim floods the frame with the accent for the stages act; otherwise the accent stays on the product. */
export const COLOUR: ColourRange[] = DEAL.stages === 'claim' ? [{ from: ACT.stages.from, to: ACT.end.from, id: 'stages-on-the-accent' }] : [];
/** The one lock: the name and the close hold to the end from the close. */
export const END: EndLock = { from: CUE.close, to: TOTAL };
/** The biggest reveal: the lockup, on the mark (with a track: its last hit). */
export const REVEAL = CUE.lockup;
/** No underdamped spring: cards land on glides, critically. */
export const SPRING_CLASS = '';
/** CUE names that must land on a music event. None without a track; with one, add 'slide', 'window', 'cards' and 'mark'. */
export const STRUCTURAL: string[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Record<string, Salience> = {
  rise: 'cut', what: 'copy', sweep: 'life', type: 'life', arm: 'move', whipR: 'move',
  slide: 'cut', push: 'life', fly: 'move', aim: 'move', launch: 'hit',
  window: 'cut', build: 'copy', stream: 'life', settle3d: 'life', lens: 'move', whipOut: 'move',
  cards: 'cut', connect: 'copy', fan: 'move', cardsOut: 'move',
  page: 'cut', sib1: 'life', sib2: 'life', dim: 'move', toast: 'hit', blackout: 'move',
  stage1: 'cut', stage2: 'hit', stage3: 'hit',
  comets: 'cut', mark: 'hit', name: 'hit', close: 'copy', lockup: 'hit', last: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name'; // 'ui': a string the product shows, not budgeted; 'name': the name, not a line of the script
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
};

const pace = PACE[PACE_NAME];

/** The crisp hero entry (fx/TypePresets crispWords): 26 f a word on E.out, 7 f apart. */
export const CRISP = { dur60: 26, gap60: 7 } as const;
/**
 * How long each dealt voice (DEAL.voice, fx/TypePresets house numbers at 60 fps) takes to land a line of n words:
 * mask, words 8 f apart, each head 8 f, the last 2.5x; land, the whole line in 34 f; fall, words 9 f apart, 12 f each.
 */
export const VOICE60: Record<'mask' | 'land' | 'fall' | 'crisp', (n: number) => number> = {
  mask: (n) => 8 * Math.max(0, n - 1) + 8 * (n > 1 ? 2.5 : 1),
  land: () => 34,
  fall: (n) => 9 * Math.max(0, n - 1) + 12,
  crisp: (n) => CRISP.dur60 + CRISP.gap60 * Math.max(0, n - 1),
};
/** A script line arriving on the film's voice: resolved when its last word has landed. */
const crisp = (id: string, text: string, inF: number, out: number): Copy => ({ id, text, in: inF, resolved: inF + f60(VOICE60[DEAL.voice](wordCount(text))), out });
/** The connect line arrives as an object line (kit ObjectLine, the crisp entry: its slot is a word). */
const crispObject = (id: string, text: string, inF: number, out: number): Copy => ({ id, text, in: inF, resolved: inF + f60(VOICE60.crisp(wordCount(text))), out });

/** What the connect line's slot shows first: the first integration's name, else the first card's app. */
export const SLOT_NAME = ((): string => {
  const slug = TEASER.integrations[0];
  return (slug && (LOGOS as Record<string, { name: string }>)[slug]?.name) || TEASER.cards[0].app;
})();
/** A line with its [] slot read as what the slot shows first. */
export const slotText = (s: string) => s.replace('[]', SLOT_NAME);

// Every on-screen word of the film. The request, the window, the code, the cards, the page, the toast and the stages
// are the product's own strings (UI).
export const COPY: Copy[] = [
  crisp('what', TEASER.lines.what, CUE.what, CUE.whipR),
  { id: 'request', text: TEASER.request.text, kind: 'ui', in: CUE.type, resolved: CUE.whipR, out: ACT.window.from },
  crisp('build', TEASER.lines.build, CUE.build, CUE.whipOut - f60(30)), // it leaves a little before the whip, so it is gone when the next line arrives
  { id: 'status', text: TEASER.window.status, kind: 'ui', in: CUE.window + f60(20), resolved: CUE.window + f60(30), out: ACT.cards.from },
  crispObject('connect', slotText(TEASER.lines.connect), CUE.connect, CUE.cardsOut),
  ...TEASER.cards.map((c, i): Copy => ({ id: `card${i + 1}`, text: `${c.app} ${c.event}`, kind: 'ui', in: CUE.cards + f60(8 * i), resolved: CUE.fan + f60(20 + 8 * i), out: ACT.page.from })),
  { id: 'title', text: TEASER.page.title, kind: 'ui', in: CUE.page, resolved: CUE.page + f60(26), out: CUE.blackout },
  { id: 'toast', text: `${TEASER.page.toast.title} ${TEASER.page.toast.body}`, kind: 'ui', in: CUE.toast, resolved: CUE.toast + f60(11), out: CUE.blackout },
  ...TEASER.stages.map((s, i): Copy => ({ id: `stage${i + 1}`, text: s, kind: 'ui', in: [CUE.stage1, CUE.stage2, CUE.stage3][i], resolved: [CUE.stage1, CUE.stage2, CUE.stage3][i] + f60(20), out: DEAL.stages === 'push' ? ACT.end.from : [CUE.stage2, CUE.stage3, ACT.end.from][i] })),
  { id: 'wordmark', text: TEASER.name, kind: 'name', in: CUE.name, resolved: CUE.name + f60(14), out: TOTAL },
  crisp('close', TEASER.lines.close, CUE.close, TOTAL),
];

// A cue placed in beats never shortens a read: at a faster track the beats shrink, so a line leaves on its read instead
// of its cue (the acts take each line's exit from COPY). Where an act line comes first, the cut takes the line.
for (const c of COPY) {
  if (c.kind || c.out >= TOTAL) continue;
  c.out = Math.min(TOTAL, Math.max(c.out, c.resolved + f60(holdFor(wordCount(c.text), pace))));
}

/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};

/** The fragments of one chain, in order of arrival. */
export const chainOf = (id: string): Copy[] => {
  const list = COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);
  if (!list.length) throw new Error(`timeline: no COPY chain "${id}"`);
  return list;
};
