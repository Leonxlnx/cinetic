// The single source of truth for time. Picture (src/acts), sound (src/sync.ts -> out/cues.json)
// and QA (scripts/grid-check.ts) all import this file, so a change here moves everything together.
// Think in bars and beats, never in seconds. Keep this file free of React and CSS imports:
// Node scripts load it directly.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/**
 * The film-time music grid (src/music.ts). null: no licensed track (effects only, or before the
 * track is chosen), and the timeline runs on its own BPM grid below. With a track, scripts/audio/
 * track.py grid writes src/music.ts, BPM becomes the track's and b() follows the music's bars.
 */
export { MUSIC } from './music';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites
 * the `const BPM = ...;` line inside, so keep that line as it is. The demo is planned for a 124 BPM
 * bed (a bar is 1.94 s, its seven bars 13.5 s): until the track is in audio/music/, the grid runs at
 * 120 BPM, the nearest tempo with whole-frame beats at 60 fps. `track.py grid` then writes
 * src/music.ts and every b() below follows the track's own bars: the cue plan moves with the music.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/**
 * The film's pace (src/lib/pace.ts). calm: text arrives as short fragments that take turns with
 * the picture, held about 1-1.5 s (the default for text-led films, at 90-100 BPM). crisp: the
 * denser launch-film tempo, for briefs that ask for energy (at 120 BPM).
 */
export const PACE_NAME: PaceName = 'calm';

/**
 * Frames per beat. Without a track it must be a whole number (grid-check fails otherwise): 60 fps ->
 * 90, 100, 120, 144, 150 BPM. With a track it is fractional (124 BPM = 29.03 f) and b() rounds.
 */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/**
 * Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat.
 * b(3) is the downbeat of bar 3; b(2, 1, 2) is the "and" of beat 2 in bar 2. With a track (MUSIC
 * set) it is the music's grid from its first downbeat, rounded: a whole frame within 0.5 f of the
 * music. Its fractional twin is bar() in src/music.ts, for the rare place that needs it.
 */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));

/**
 * A choreography length written in 60 fps frames (the unit every number in the cinetic
 * references uses), converted to this film's fps (or to `fps`, for a composition at another
 * rate). Cues come from b(); durations inside a move use f60(), so the film keeps its timing if
 * --fps changes. It rounds (copy timing, Sequence lengths); f60x() is the fractional twin, for
 * durations inside a move, where rounding would bend the curve at 24, 25 or 30 fps.
 */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;

/** The body: whole bars, ending on the bar line after the last one (with a track, the downbeat after MUSIC.bars). */
const BODY = b(8);
/**
 * After the last bar the picture holds while the music ends, never on a cut: MUSIC.end.hold (track.py grid) is how long
 * the ending needs after that bar line: the track's own final hit ringing out (1.5-2.5 s), a hit that rings, or a 2-3 s
 * fade under the end card. The tail is that, and at least 1 s.
 */
/** A grid written before the endings (end.mode 'stop', no hold) names only the stop's element: hold it and 1 s after it. */
const STOP_GAP = MUSIC && MUSIC.end.hold === undefined && MUSIC.end.mode === 'stop' ? Math.max(0, Math.ceil(MUSIC.end.f) - BODY) : 0;
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, STOP_GAP ? STOP_GAP + FPS : 0);

// Acts: contiguous, [from, from + dur), each starting on a bar line (with a track, a downbeat: grid-check
// structural-on-music). Each act is its own composition in Root.tsx. Six shots in four acts (a cut inside an act
// is a declared seam): every hand-over carries something, and each act's cut lands on its bar line.
export const ACT = {
  line: { from: 0, dur: b(4) }, // the statement builds round the dot's landing, then launches left (frame 0 on: with a track, b(1) is its first downbeat)
  plate: { from: b(4), dur: b(5) - b(4) }, // the cut lands on the downbeat, on the launch's fastest frame
  frame: { from: b(5), dur: b(6) - b(5) }, // the plate shrinks into the line on the next downbeat
  mark: { from: b(6), dur: BODY + TAIL - b(6) }, // the line drops into the relief on the downbeat; the dome lands an 8th later
};

export const TOTAL = BODY + TAIL;

// Named sync points (absolute frames), all on the 16th grid. A cue that must sit off the grid
// carries a trailing `// offgrid: <reason>` comment, which grid-check accepts.
// Picture code reads these; src/sync.ts turns them into sound events.
export const CUE = {
  fragA: b(1, 1, 2), // "plinth cuts" rises on the off-beat after the second beat into a frame that is already moving (the rule drawing, the creep, the key on the paper)
  drop: b(2, 1), // once "plinth cuts" stands: the accent dot is born above the line and falls...
  land: b(2, 2), // ...and lands where the line will end, off the downbeat: the camera punches in on the contact (each shot 3 s at most)
  fragB: b(2, 2, 2), // "to music" answers on the off-beat; the line jumps to make room, the dot is its period
  exit: b(3, 3, 2), // the read is over: the line (dot and all) accelerates out to the left...
  cut: b(4), // ...cut on its fastest frame, on the downbeat: the plate (the film's real imagery) arrives already moving left
  band: b(4, 1), // a band of light crosses the plate, mid-frame on the beat
  plateCut: b(4, 2), // a hard cut on the beat to a closer frame of the same set, still drifting left
  band2: b(4, 3), // the light crosses the closer frame too, mid-frame on the beat
  morph: b(5), // the plate contracts into the gap of the next line on the downbeat: the picture becomes a word
  fragC: b(5), // "Cuts" and "land." rise on either side of it as it contracts (a one-bar act reads two words)
  swapA: b(5, 1), // the picture in the gap cuts to the next frame of the set...
  swapB: b(5, 1, 2), // ...and the next (designed steps)
  exit2: b(5, 3, 3), // the read is over: the line and its picture drop out of the frame, accelerating...
  drop2: b(6), // ...into the relief on the downbeat: the plinth under a low key, carried in on the same speed
  pieceA: b(6, 0, 2), // the dome lands on the plinth (contact frame)
  pieceB: b(6, 1, 2), // the block lands (contact frame)
  catch: b(6, 2), // the mark is whole: the key rises, and every shadow shortens
  lockCut: b(6, 3), // cut to the lockup as the key climbs: shadows shorten, the name rises in its slot
  lockup: b(7), // the name is home on the downbeat: the payoff, then the hold lives on the key and a slow dolly
  end: BODY, // last bar line; TAIL follows
};

// ---- Declarations: what the picture does on purpose -------------------------------------------
// Every export from here to COPY is optional: a timeline without them keeps the 1.1 behaviour.
// With them, grid-check validates them, scripts/export-cues.ts writes them into out/cues.json
// (`look`, `declared`, `salience`), and the blur sampling, forensics and the speed checks treat a
// declared step, flash, seam or camera-blur moment as craft while still failing undeclared pops.
// Frames are absolute film frames, like CUE.

/** How fast moves render: 'crisp' (house default, flat graphics stay sharp) or 'camera' (180-degree shutter on fast moves). */
export type BlurPolicy = 'crisp' | 'camera';
/** The film's type sets its shot-length band and whether a grid-locked edit is allowed (reel, social). */
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
/** One surface material per film, or none. */
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean; palette?: 'colour' | 'mono' };
/** How one shot hands over to the next. `hard` is a designed cut; `fadeEnd` only closes a film. */
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
/** A seam at frame `at`: what carries across it (`carry`), its direction, and whether it is the film's signature move. */
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
/** Frames [from, to) animated on a lower cadence (`fps`) or held `on` 2s / 3s: a designed step, not a dropped frame. */
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
/** A designed flash: 1 or 2 frames from `f`. */
export type Flash = { f: number; frames: 1 | 2; id: string };
/** Frames [from, to) rendered with camera blur inside a crisp film (a flick, a whip). */
export type CameraBlurRange = { from: number; to: number; id: string };
/** The film's one end lock: frames [from, to), 1-5 s. */
export type EndLock = { from: number; to: number };
/** A colour event (a deep field, an accent flood, a colour cut): look-audit pauses its wash and accent ceilings inside it. */
export type ColourRange = { from: number; to: number; id: string };
/**
 * What one primitive instance does on purpose, from its own props: every fx exports
 * `declares(props, film): Declares`. src/sync.ts `declares()` lists them for the instances the acts
 * use; export-cues writes them under `declared.fx`, and grid-check fails when the timeline's own
 * declarations below do not cover them.
 */
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[]; colour?: ColourRange[] };
/**
 * What a CUE asks of the eye. read-quiet guards `copy`, `hit` and `cut` (and fast moves over the
 * text being read); `life` (creep, light, drift, a carried decay) and camera moves away from the
 * text may run during a read and count toward the picture's density. A CUE without one is `hit`.
 */
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** Every seam of the film. Designed cuts are seams of kind `hard`. */
export const SEAMS: Seam[] = [
  // the dot's contact punches the camera in (scale carried through a 6-frame snap)
  { at: CUE.land, kind: 'snapZoom', carry: 'scale', id: 'punch-on-contact' },
  // the line launches left (fx/Chain exit 'launch') and the plate opens at 0.7 of its cut speed
  { at: ACT.plate.from, kind: 'velocity', carry: 'x', dir: -1, id: 'statement' },
  // a cut inside the plate, on the beat: a closer frame of the same set, the drift keeping its direction
  { at: CUE.plateCut, kind: 'hard', id: 'plate-closer' },
  // the full-frame plate contracts into the gap of "Cuts [ ] land."
  { at: ACT.frame.from, kind: 'morph', carry: 'scale', id: 'plate-into-line' },
  // the line drops out and the relief opens on the same downward speed
  { at: ACT.mark.from, kind: 'velocity', carry: 'y', dir: 1, id: 'line-drops' },
  // the cut to the lockup is carried by the key light climbing (fx/KeyLight noon lift)
  { at: CUE.lockCut, kind: 'light', id: 'noon-lift' },
];
/** The picture in the line's gap cuts to the next frame of the set (fx/InlineGap swaps). */
export const STEPPED: SteppedRange[] = [
  { from: CUE.swapA, to: CUE.swapA + 4, id: 'gap-0' },
  { from: CUE.swapB, to: CUE.swapB + 4, id: 'gap-1' },
];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** Colour events (a deep field, an accent flood, a colour cut, up to 2 s each): written to cues declared.colour. */
export const COLOUR: ColourRange[] = [];
/** The one lock: the name holds beside the mark to the end, the key and a slow dolly keeping it alive. */
export const END: EndLock = { from: CUE.lockup, to: TOTAL };
/** The biggest reveal (its stop-down or dip ends here): the lockup. */
export const REVEAL = CUE.lockup;
/** The one element class allowed an underdamped spring: the mark's pieces landing. */
export const SPRING_CLASS = 'mark-piece';
/**
 * CUE names that must land on a music event (a downbeat attack, an entry, a stop's end, the ending). None
 * without a track; with the 124 BPM bed the plan is pieceA on an accent, lockup on the track's entry at bar 7
 * and end on the bar line where the bed stops (track.py edit --bars 7 --reveal-bar 7 --end stop).
 */
export const STRUCTURAL: (keyof typeof CUE)[] = [];
/** Each CUE's salience (missing = 'hit'). */
export const SALIENCE: Partial<Record<keyof typeof CUE, Salience>> = {
  fragA: 'copy', drop: 'move', land: 'hit', fragB: 'copy', exit: 'copy', cut: 'cut', band: 'life', plateCut: 'cut', band2: 'life', morph: 'cut',
  fragC: 'copy', swapA: 'move', swapB: 'move', exit2: 'copy', drop2: 'cut', pieceA: 'hit', pieceB: 'hit', catch: 'life', lockCut: 'cut',
  lockup: 'hit', end: 'cut',
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name'; // 'ui': a string the product shows (a typed command, code, a URL, an app label), not budgeted; 'name': the product's name or version on the end card, not a line of the script
  chain?: string; // the thought this fragment belongs to (fx/Chain renders a chain; grid-check checks its gaps)
  mode?: 'build' | 'replace'; // build: fragments append to one held line; replace: each takes the last one's place
  reveal?: 'focus'; // the phrase comes into focus whole (fx/FocusWord): grid-check reads its hold, not a per-word rate
  swap?: string | boolean; // a deliberate swap: this line takes the named line's place in one move (an erode, a redaction, a wheel), the one time two lines share the screen
};

const pace = PACE[PACE_NAME];

/** How the words of a line or fragment arrive, as fx/Chain draws them with the same `ink`. */
export type Ink = 'reveal' | 'pop' | 'partial';
/**
 * Frames from a fragment's first frame to every word in: the pace's reveal, or for a line cut on ('pop')
 * the frame after its last word's start, or part-inked ('partial') that start plus the 10 f ink, so a
 * caption the act cuts on is not held as long as a calm reveal.
 */
const revealSpan = (n: number, ink: Ink = 'reveal'): number => {
  const last = (Math.max(0, n - 1) * pace.stagger * FPS) / 60;
  return ink === 'pop' ? Math.floor(last) + 1 : ink === 'partial' ? Math.ceil(last + (10 * FPS) / 60) : f60(revealFor(n, pace));
};

/**
 * One line of copy revealed word by word with this film's pace (the numbers <Words> uses), so
 * `resolved` is the frame its last word is fully in. `out` defaults to the pace's hold. `ink` as the act
 * draws it: 'pop' (cut on) or 'partial' resolve as soon as the last word is in.
 */
export const line = (id: string, text: string, inF: number, out?: number, o: { ink?: Ink } = {}): Copy => {
  const n = wordCount(text);
  const resolved = inF + revealSpan(n, o.ink);
  return { id, text, in: inF, resolved, out: out ?? resolved + f60(holdFor(n, pace)) };
};

/**
 * One line built in beats, one COPY entry per fragment (`<id>.1`, `<id>.2`, ...), rendered by fx/Chain:
 * the script's sentence (2-7 words in all) arrives in two or three parts with a picture beat between
 * them (the product does what the first part set up). It is still one line: grid-check's script rule
 * reads a build chain as one sentence. Give each fragment its first frame; `resolved` follows from the pace.
 *   build    fragments append to one held line, which re-centres; the line clears as a whole, at
 *            `out` (default: the last fragment's resolve plus the hold of the full line)
 *   replace  each fragment leaves (as a whole, over pace.exitDur: 24 f when calm) and has gone
 *            6 f before the next one rises in its place, so two fragments never share the spot;
 *            the last one leaves at `out` (default: its resolve plus its hold)
 * grid-check checks the result: every fragment is read before the next arrives, the picture beat
 * between them, the words on screen at once and the copy rate. `ink`: as <Chain ink> draws them.
 */
export const chain = (id: string, mode: 'build' | 'replace', fragments: [text: string, inF: number][], o: { out?: number; ink?: Ink } = {}): Copy[] => {
  const base = fragments.map(([text, inF], i) => ({ id: `${id}.${i + 1}`, text, in: inF, resolved: inF + revealSpan(wordCount(text), o.ink), chain: id, mode }));
  const last = base[base.length - 1];
  if (!last) throw new Error(`timeline: chain "${id}" has no fragments`);
  const words = (list: { text: string }[]) => list.reduce((n, c) => n + wordCount(c.text), 0);
  if (mode === 'build') {
    const out = o.out ?? last.resolved + f60(holdFor(words(base), pace));
    return base.map((c) => ({ ...c, out }));
  }
  // replace: the outgoing fragment's exit (exitDur) is over 6 f before the next one starts to rise
  const leave = f60(pace.exitDur) + f60(6);
  return base.map((c, i) => ({ ...c, out: base[i + 1] ? base[i + 1].in - leave : (o.out ?? c.resolved + f60(holdFor(wordCount(c.text), pace))) }));
};

// Every on-screen word: the word budget (kind: 'ui' entries are counted apart), the hold check,
// and the text-flow checks (fragments, words on screen at once, copy rate, text share) read this.
export const COPY: Copy[] = [
  // The script, one clean line at a time, plain words (copy-check.py): line 1 says what the product does, by name.
  // "plinth cuts" (read alone) -> the dot falls and lands where the line will end -> "to music". The dot is the
  // period (Act1 draws it, so the text carries none), and the line says what the picture just did. For the real product, write
  // "[Name] is a [plain category] for [who]." or "[Name] turns [input] into [output]."
  ...chain('statement', 'build', [['plinth cuts', CUE.fragA], ['to music', CUE.fragB]], { out: CUE.exit }),
  // The picture takes its turn (the plate, no words), then holds the line open: "Cuts [picture] land." Two words
  // read in the one-bar act at the calm pace (a third word needs more than a bar).
  line('frame', 'Cuts land.', CUE.fragC, CUE.exit2),
  // cinetic:placeholder - the demo's invented name: use the product's, then delete this line.
  { id: 'wordmark', text: 'plinth', kind: 'name', in: CUE.lockCut, resolved: CUE.lockup, out: TOTAL },
];

/**
 * When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts
 * readingWindows(): from `resolved` for at most readMax, an earlier fragment of a build chain only
 * for its own hold, then the whole line again). The one rule every check uses: export-cues.ts
 * writes it into out/cues.json, and grid-check, layout-audit, measure-speed and forensics read it.
 * Nothing new should start inside a window: the read happens in the quiet.
 */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);

/** One COPY entry by id; acts read their text and timing from here so the budget stays true. */
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
