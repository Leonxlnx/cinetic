/**
 * grid-check.ts: checks a film's timeline against the timing rules before anything renders.
 *
 * Imports the project's src/timeline.ts (FPS, BPM, TOTAL, ACT, CUE, COPY; optional BEAT, BAR, TAIL,
 * PACE_NAME, PACE, READ), or a HyperFrames project's timeline.js (its FILM object; PACE_NAME and
 * PACE from the timeline or the motion.js beside it), and checks, with the 60 fps numbers scaled
 * to the film's fps:
 *   beat-whole     one beat is a whole number of frames (60*FPS/BPM)
 *   acts           acts are contiguous from 0 to TOTAL with positive lengths
 *   acts-on-bar    every act starts on a bar line (warning); in a spine film an act change the element carries may sit on
 *                  the music's 8th (so in music mode, structural-on-music)
 *   cue-grid       every CUE is a frame in [0, TOTAL) on the 16th grid, or its line carries a
 *                  trailing `// offgrid: <reason>` comment (or an entry in an exported OFFGRID map)
 *   copy           every COPY entry has in <= resolved <= out inside the film
 *   lone-line      a COPY entry marked `place: 'alone'` (a line alone on its ground): its declared `cap` (cap height as a
 *                  share of the frame height) at least 6 %, its `chunks` (the parts it arrives in) at most 3, on screen
 *                  1.2 s at most from its first chunk to its exit (errors); its text-hold is counted from its first chunk
 *   type-size      any other film text that declares its `cap` (a kicker, the fact under the lockup) at least 3 % (error)
 *   text-hold      resolved text holds >= max(holdMin, holdBase + holdPerWord * words) before it
 *                  leaves (calm: 52 f, or 36 f + 7 f/word; crisp: 36 f, or 28 f + 6 f/word); a build chain's
 *                  line holds that long for all its words after its last fragment resolves
 *   script         the film's words are a script of short real sentences, one clean line on screen at a
 *                  time. A line is a COPY entry, a build chain (its fragments joined) or one fragment of a
 *                  replace chain; ui strings, `kind: 'name'` entries and the end card (an entry that holds
 *                  to the end of the body or resolves inside END) are not lines. Every line holds 2-7
 *                  words (over 7: an error, say it in two sentences; a single word: a warning, a keyword,
 *                  not a line); more than half the lines a single word is a keyword pile (warning); two
 *                  lines on screen at once (one arrives before the other starts to leave, after its read)
 *                  is an error unless the later one declares `swap: '<id>'` (or true): a deliberate swap
 *                  that takes the old line's place in one move. Then the wording, by copy-check.py (beside
 *                  this script; the Python scripts/py.mjs finds): every COPY entry is read
 *                  as a stranger reads it, and its errors are script errors: vague or fancy words, metaphors,
 *                  slogan shapes, a line with no verb or more than one claim, no name, no line that says
 *                  what the product is by 3 s (an update film: the name and the version by 3 s, from
 *                  LOOK.filmType). --no-copy skips the wording (timing-only fixtures). A film whose lines
 *                  are mostly sentences (60 % or more of 2-7 words) is held to the script's reading budget:
 *                  50 words, 2.4 words a second in any 5 s, 1.6 over the body, text on 85 % of it
 *   fragment       words per chain fragment: a warning above maxNewWords (calm 4, crisp 5), an error
 *                  above maxNewWords + 2 when calm or above 10 when crisp; a line that is not a chain is
 *                  held to the script rule instead; kind: 'ui' entries are exempt
 *   copy-lines     <= 2 lines per entry (warning)
 *   copy-concurrent film words on screen at once (in <= f < out + exitDur: a leaving fragment is
 *                  still seen until its exit is over): an error above maxVisibleBuild (calm 8), or
 *                  above maxVisibleReplace (calm 5) when every entry on screen is a replace-mode
 *                  fragment; a warning when film and ui words together pass 14
 *   read-first     two film entries that are not one chain: the later one arrives only after the
 *                  earlier one, still on screen, has resolved and held its read (an error when
 *                  calm, a warning when crisp): two lines arriving together are a sentence dump
 *   reveal-rate    an entry of 3+ words revealed faster than 8 f per word, (resolved - in) /
 *                  (words - 1): a sentence dumped at once (warning). An entry with reveal: 'focus' (the
 *                  whole line coming into focus at once, fx/FocusWord) is read by its hold instead
 *   chain-gap      inside a chain (COPY entries sharing `chain`): each fragment arrives only after
 *                  the previous one has resolved and held its read (error), with a picture beat of
 *                  gapMin..gapMax frames (calm 26-90 f) after that read (shorter: an error when
 *                  calm, a warning when crisp; longer: a warning); in replace mode the previous
 *                  fragment's exit (the pace's exitDur: calm 15 f, crisp 12 f) is over >= 6 f before the next
 *                  arrives (error); a chain keeps one mode and a build chain clears at one `out`
 *   chain-beat     the picture beat between two fragments really happens: at least one CUE (or,
 *                  with --cues, a sound event other than a `text` sound) in [read, next.in) (an
 *                  error when calm, a warning when crisp)
 *   read-quiet     calm: no CUE starts inside a reading window (READ) other than a text's own
 *                  frames: what was just said is read in the quiet (warning)
 *   word-rate      film words resolving in any 5 s window <= 5 * maxWordsPerSec (calm 6.75), and the
 *                  body's average <= avgWordsPerSec (calm 1.0 w/s) (warnings); a script's budget is wider
 *                  (see script)
 *   text-share     film copy on screen on <= textShare of the body's frames (calm 65%; a warning,
 *                  an error when calm and more than 10 points over), and every 10 s of body (all
 *                  of it, if shorter) holds a text-free run >= freeRun frames (calm 90 f): the
 *                  picture gets its turns (warning)
 *   beats          with a BEAT_PLAN ([{id, kind: 'T' | 'A' | 'TA' | 'end', from, to}]: a line alone on a clean ground, the
 *                  picture acting, a line over a picture, the end card): type-only beats >= 15 % of the shots and >= 2
 *                  a film, T+A <= 40 % of the beats, the first line on screen by 1 s, every line beat holding a line
 *                  and no picture beat carrying a statement for more than a quarter of it (errors); a line beat
 *                  outside 0.5-2.4 s or a picture beat outside 1-3.5 s (warnings). A timeline without a BEAT_PLAN
 *                  is not held to these (the simple launch declares one). The text-then-cards loop: a line alone then
 *                  its picture (T then A) three times or more with no line beat that meets its picture (TA, or a T
 *                  beat marked `meets: true`: the line's own device opens into its picture, a porthole parts it), an
 *                  error in a film with src/launch.ts (a pair's beat fixes it), else a warning
 *   word-total     on-screen words <= --max-words (default: the pace's maxWords, calm 30, crisp 35; a script 50);
 *                  entries with kind: 'ui' (terminal commands, code, URLs, app labels the product
 *                  shows) are counted apart, not budgeted
 *   event-gap      a stretch without an event (cue, copy change, act change, or a cues.json event
 *                  with --cues) longer than --max-gap frames (default: the pace's maxGap, calm 72 f,
 *                  crisp 48 f) is a warning, tail excluded: a hold may rest, still, with nothing planted
 *                  in it. It fails past --max-rest (default 150 f at 60 fps, 2.5 s), where the film
 *                  reads frozen (forensics motion-frozen). A line's words arriving through its reveal are events,
 *                  and a reading window counts as alive: a hold being read
 *                  needs a slow drift, not a tick planted in it. The windows are the timeline's
 *                  READ (src/lib/pace.ts readingWindows(): from `resolved` for at most readMax, calm
 *                  150 f; an earlier fragment of a chain only for its own hold, so a chain's picture
 *                  beat is not a read; a build line once more after its last fragment), else a
 *                  cues.json copy block's `read`, else the same rule computed here. One designed
 *                  near-still hold may be declared with `export const HOLD = {from, to}` (60-96 f
 *                  at 60 fps, on the key claim under a music dropout), and gaps inside it pass
 *   tail           >= 1 s after the last cue so the audio can decay (warning)
 *   whole-bars     the body (TOTAL - TAIL) is whole bars; loops need it (warning)
 *
 * Salience (timeline SALIENCE, missing = 'hit'): read-quiet guards only CUEs whose salience is
 * `copy`, `hit` or `cut`. `life` (creep, light, drift, a carried decay) and `move` (a camera move
 * away from the text) may run during a read and count toward the picture's density. A fast move
 * over the text being read is a `hit`: mark it so.
 *
 * Music mode (the timeline exports a non-null MUSIC, src/music.ts written by track.py grid):
 *   music-grid     replaces beat-whole and whole-bars: BPM == MUSIC.bpm, MUSIC.fps == FPS,
 *                  b(1) == round(MUSIC.t0), and the body (TOTAL - TAIL) ends within 0.5 f of the
 *                  downbeat after MUSIC.bars bars
 *   cue-grid       a CUE lands on a music 16th (within 0.5 f) or on a sound: an analysed accent, an
 *                  entry, a downbeat attack, a stop's end or a designed effect (--cues, --onsets),
 *                  inside the picture-lead window (the picture may lead its sound by up to 3 f and
 *                  trail it by 1 f: --lead -3,1); the 16th grid is the fallback, not the target
 *   structural-on-music  every act boundary and every CUE named in STRUCTURAL sits within 1 f of a
 *                  measured downbeat, an entry, a stop's end or the ending (error)
 *   anti-metronome outside reel and social films: at most 60 % of the ordinary cuts on downbeats,
 *                  and the cut intervals vary (coefficient of variation >= 0.25) (warnings)
 *   reveal-dip     a stop or dip of 0.2-0.5 s ends within 2 f of REVEAL (warning): the track's own stops and
 *                  breaks, stop or dip events in --cues, audio/score.json stopdowns.add (a depth 'stop'
 *                  lasts stop_len, 0.2-0.7 s, default 0.4; a dip about 0.4 s) and the stop-downs the kit
 *                  adds (out/qa/sfx_plan.json, written by plan.py)
 *
 * Declarations (LOOK, SEAMS, STEPPED, FLASHES, CAMERA_BLUR, END, REVEAL, SPRING_CLASS, STRUCTURAL,
 * SALIENCE; all optional, a timeline without them is checked exactly as before):
 *   declarations   shapes and places: seams, steps, flashes and camera-blur ranges inside the film,
 *                  known kinds, to > from, flashes of 1-2 frames, step cadences below the film fps,
 *                  no duplicates or overlaps, STRUCTURAL and SALIENCE naming real CUEs (errors); a
 *                  range crossing an act boundary, a step range shorter than two steps (a 1-frame
 *                  range is one discrete frame, a snap such as fx/Loaders' row ticks) or a
 *                  camera-blur range over 2 s (warnings)
 *   declares-cover with --cues: what the primitives declare about themselves (cues.json
 *                  declared.fx, from each fx's declares()) is covered by the timeline's own
 *                  declarations: every step inside a STEPPED range, every flash in FLASHES, every
 *                  camera-blur range inside CAMERA_BLUR (or LOOK.blur 'camera'), every seam in
 *                  SEAMS at the same frame and kind (error)
 * Grammar (only for timelines that make the declarations above):
 *   shot-length    shots between act boundaries, seams and `cut` CUEs, for films of 3+ shots that
 *                  are not LOOK.oneTake: median inside the film type's band (launch 1.3-2.2 s, update
 *                  0.8-1.6 s, explainer 2.0-3.0 s, reel and social 0.5-1.0 s), q75/q25 >= 1.6 (not
 *                  metronomic; aim for 1.9-3.1), longest >= 2x shortest, shots under 0.25 s only as declared punches, few
 *                  shots over 4 s (launch <= 15 %, others <= 30 %) (warnings)
 *   scene-length   (a film that declares its LOOK) each scene is one point shown in 1.5-3 s: a shot over 3.2 s fails, the
 *                  declared lockup (the last shot, when CUE.lockup or REVEAL lands in it) over 2.5 s fails, and so does a
 *                  lockup that holds more than 2 s from CUE.lockup (or REVEAL) to the end of the body (errors in a
 *                  scene-bank film, SPINE_PLAN, and in a film written by hand; a film from another template: warnings)
 *   lockup-end     (with the declared lockup, held like scene-length) the lockup stays whole and alive to the last frame:
 *                  a fadeEnd seam or an END that stops before TOTAL fails; in a scene-bank film (SPINE_PLAN, GROUND_PLAN)
 *                  so does a lockup whole for under 1.5 s from CUE.lockup (or REVEAL) to the last frame; over 2.2 s warns
 *   grounds        with a GROUND_PLAN ([{from, to, ground}]): more than two ground changes fail (a flood and its return
 *                  count as one; a template keeps one ground and changes it once at most)
 *   subject-run    with SUBJECTS ([{subject, from, to}]): consecutive scenes about the same picture are one beat; one
 *                  over 4.5 s fails
 *   long-take      a take over 15 s (a shot, or the whole body of a LOOK.oneTake film) holds at least two
 *                  picture changes per 10 s inside it (warning)
 *   cut-mix        5+ picture changes (act boundaries, seams, `cut` CUEs): at least 14 % of them happen
 *                  without a hard cut (a morph, mask, wipe, zoom-through, breath, defocus or UI dissolve)
 *                  (warning)
 *   picture-change a layout or type change at least every 2.5 s outside the end lock and the tail: a cut
 *                  or seam, a COPY entry arriving or leaving, or a CUE whose salience is hit, cut, copy or
 *                  move (a creep, light or drift is `life`, not a change) (warning)
 *   opener         at least two picture changes in the first 2.5 s (warning)
 *   seam-plan      `fadeEnd` only as the last seam, `dissolveUi` never across an act boundary or
 *                  longer than 8 f@60 (errors); one kind more than 3 times (the signature move
 *                  exempt), carried seams under 40 % of 3+ seams, a cut film over 20 s with no
 *                  velocity seam (warnings)
 *   cut-on-sound   when onsets exist (MUSIC, --cues events, --onsets): >= 50 % of the hard cuts
 *                  (hard and punch seams, act boundaries with no carried seam, `cut` CUEs) within the
 *                  picture-lead window of an onset and >= 80 % within 100 ms (warning); under 30 %
 *                  within 100 ms (error). Continuity seams (velocity, morph, breath, zoom-through,
 *                  whip, snap zoom, mask, defocus, wipe, UI dissolve) may float off the accents
 *   stagger-shape  CUE lists of 4+ starts: uniform gaps (CV < 0.1) unless tagged `// stagger: list`;
 *                  a list tagged `payoff` whose last three gaps grow; the median of a list tagged
 *                  word (7-14 f@60), letter (3-8) or ui (5-18); the pace's word stagger (7-14 f@60)
 *                  when it carries a cadence (warnings)
 *   exit-length    the pace's text exit <= 0.75 x its entrance and <= 33 f@60 (warning)
 *   recentre       the pace's re-centre: 12-44 f@60, lead <= 12 f@60, a jump >= 55 % home after
 *                  1/30 s (warning)
 *   accent-time    the pace's accent: hold <= 1.2 s, a linear cool <= 28 f@60 (warning)
 *   end-lock       END holds 1-5 s and runs to the end of the body (warning)
 *   spec           the film runs the length the spec line of BRIEF.md asks for (`1920x1080@30, 20s`): over 10 % longer
 *                  is an error, 15 % shorter a warning; with a BRIEF.md a launch film runs 15-45 s and an update film 8-20 s, and
 *                  the lockup holds at most 3.5 s from CUE.lockup to the end of the body (warnings)
 *   type-devices   with src/launch.ts: three lines or more all landing a starred accent on their last word (warning)
 *   density-plan   with a MOTION registry ([{from, to}], timeline or cues.json `motion`): 1.4-3.6
 *                  starts/s, 1.3-2.7 moves running at once on average, no 1 s without a start
 *                  outside HOLD and END (warnings)
 *
 * The deal (the timeline's DEAL_PLAN, launch-simple and update; --part spine runs it too): a film's scenes are dealt from the
 * house bank at random. Lines are the template's own type and are not counted; scenes drawn in src/product.tsx OWN count
 * as the film's own whether the script declares them or not:
 *   deal-share     under 75 % of the picture scenes from the bank (error)
 *   deal-own       more than one scene of the film's own, or one drawn in src/product.tsx OWN the script does not mark
 *                  `own` (errors)
 *   deal-twice     one house scene twice in the film (error)
 *   deal-shared    more than 2 scenes shared with the last film in the history (error)
 *   deal-redraw    a dealt slot redrawn by hand without its reason (`why`) (error)
 *
 * The spine (the timeline's SPINE_PLAN; --part spine runs these alone and needs nothing else from the timeline). A film
 * is one action played as 3-5 acts, one case carried from the request to the result, and one element whose form changes
 * act to act and carries the scene changes. A beat film (a line, a card, a cut, again) passes the beat rules above and
 * fails here. Shares are of all declared scene changes; a film over 35 s holds the carry family (spine-carry, spine-bare,
 * spine-momentum, the element share of text-then-cards) as warnings:
 *   spine-declared no SPINE_PLAN with --part spine, in a timeline that imports the spine or beside src/spine.ts (a film
 *                  from launch-simple or update without one: a warning); acts outside 3-5 (an update 3-4); no element
 *                  named; an unknown handover kind or line place (errors); the first act outside 20-32 % of the film (an
 *                  update's hook 10-32 %) or the last outside 12-31 % (warnings)
 *   spine-carry    the element carries under half the scene changes, or under 60 % of those inside acts (errors);
 *                  under 65 % / 75 % (warnings)
 *   spine-bare     a bare change (nothing carried, or a `cut` whatever ground it keeps) inside an act, or more
 *                  than one bare act boundary (errors); a bare boundary off the downbeat (warning). The cut to black after
 *                  the end card (`final: true`) is no join
 *   spine-momentum speed-only joins (motion, with nothing but optics or the ground beside it) over 30 % of the changes
 *                  (error), over 20 % (warning)
 *   spine-boundary an act boundary held only by the ground or optics: no element, anchor, speed or world step (warning)
 *   spine-lines    more than one group of alone lines in the middle acts (error); under half the lines inside the product
 *                  or around the element, more than one `over` line (warnings)
 *   spine-case     no case, or its request (its names, numbers or two of its nouns) on screen in fewer than two acts
 *                  (error); a name or number of the case never on screen (warning)
 *   spine-end      the lockup arrives after a bare cut or empty frames (error); a lockup not grown from the element's
 *                  last form and not entering on the claim's kept ground (warning)
 *   checklist      a device with no verb, or not drawing its act's form; more devices than acts + 1; two signatures;
 *                  devices in adjacent acts with no element handover between them (errors); fewer than 3 handover kinds,
 *                  one kind over 60 % of them (warnings)
 *   seam-variety   one join (a handover kind, a cut counted as one) on more than 40 % of 5 or more scene changes (error;
 *                  a film over 35 s: a warning)
 *   text-then-cards  an alone line in a middle act that is an island (no element, anchor or speed carries it in or out),
 *                  three alone lines or more while the element carries under half the changes (errors); an island in the
 *                  first or last act (warning)
 * SPINE_PLAN is lib/spine.ts planSpine()'s plan (plain data, absolute frames at its `fps`, else the timeline's FPS):
 *   { format: 'launch' | 'update', sentence, element, case: { request, names, numbers, who?, result? }, fps, from, to,
 *     acts: [{ i, id, verb, from, to, world: 'enter' | 'closer' | 'light' | 'turn' | 'pull-back' | 'hold', scenes: [i],
 *              strings: [the case's words it shows], case }],
 *     scenes: [{ i, act, form }], changes: [{ at, kind, carries: ['E', 'G'], boundary, downbeat }],
 *     lines: [{ text, act, place: 'alone' | 'inside' | 'around' | 'over', join: { in, out } }],
 *     devices: [{ act, id, verb, form, signature, fits }], end: { kind, at }, issues: { errors, warnings } }
 *   Read leniently, so a plan written by hand works too: an act's `form` (one or a list) for its scenes, `ui` for its
 *   strings; `handovers` for `changes`, `carry` letters or names for `carries`, `final: true` on the cut to black after
 *   the end card; a line's `from` / `to` frames (its joins then default to the change at its first or last frame), `in`
 *   / `out` for its joins, `becomes` for an out-join through the element; act indices are 0-based. A change's kind is a
 *   handover (grow, shrink, swell, press-open, iris, zoom-into, pull-out, fly, stay, word, part, converge, same-surface:
 *   the element carries; momentum: speed; or H1-H14), 'entry' (the mark's own entry), or a join that is not the element
 *   (anchor, ground, world, optics, cut). Channels: E element, A anchor, G ground, M motion, O optics. An act boundary
 *   with no change declared is bare. end.kind: a handover (the mark grown from the last form), 'entry' (its own entry
 *   on the kept ground), 'none' (the film ends inside the action), 'cut' or 'empty'. The plan's own grammar errors that
 *   these rules do not measure (the sentence, the world's steps, an unjoinable form pair) fail spine-declared.
 *
 * The pace: --pace calm|crisp, else the timeline's PACE_NAME, else crisp (a timeline written before
 * paces existed). The numbers come from the timeline's exported PACE (src/lib/pace.ts) when it has
 * one, so a retuned token moves the checks with the picture; otherwise from the copy below.
 *
 * Usage:
 *   npx tsx scripts/grid-check.ts [src/timeline.ts | timeline.js] [--pace calm|crisp] [--strict]
 *                                 [--json] [--max-words N] [--max-gap N] [--cues out/cues.json]
 *                                 [--onsets onsets.json] [--lead -3,1] [--part spine]
 *   --part spine  only the spine rules, on the timeline's SPINE_PLAN (any module that exports one).
 *   Without a path: src/timeline.ts, else timeline.js. Node 22.18+ runs it without tsx too, when
 *   the timeline has no extensionless imports (a HyperFrames timeline.js):
 *   node scripts/grid-check.ts timeline.js
 *   --strict  warnings fail too.   --json  machine-readable report on stdout.   --no-copy  skip copy-check.py.
 *   --onsets  extra sound onsets: a JSON array of film frames, or {"frames": [...]} or
 *             {"seconds": [...]} (an analysed effects or voice track).
 *   --lead    the picture-lead window in film frames, as `min,max` of (picture - sound): -3,1.
 * Exit codes: 0 pass, 1 a check failed (or a warning with --strict), 2 bad arguments / import error.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { findPython } from './py.mjs';

type Act = { from: number; dur: number };
type Copy = { id: string; text: string; in: number; resolved: number; out?: number | null; kind?: string; chain?: string; mode?: string; reveal?: string; swap?: string | boolean; place?: string; cap?: number; chunks?: number };
/**
 * Lines that read (house numbers): a line alone sets at a cap of 6 % of the frame height or more and is read in 1.2 s at
 * most, arriving whole or in 3 chunks at most; other read text (a kicker, the fact under a lockup) 3 % or more.
 * Scenes: none over 3.2 s on screen (house 1.5-3 s), the lockup 2.5 s at most and gone 2 s after its mark is whole.
 */
const LONE = { cap: 0.06, small: 0.03, read: 1.2, chunks: 3 };
const SCENE_LEN = { max: 3.2, lockup: 2.5, lockTail: 2.0 };
/** The complete lockup to the last frame (s); the ground changes a film may make (a flood and its return count as one); one subject in a row (s). */
const LOCKUP_HOLD = { min: 1.5, max: 2.2 };
const GROUND_CHANGES = 2;
const SUBJECT_MAX_S = 4.5;
/** Ground changes in a run of grounds: a change into a ground and straight back out to the one before counts once. */
const groundChanges = (g: string[]): number => {
  let n = 0;
  for (let k = 0; k + 1 < g.length; k++) {
    n++;
    if (k + 2 < g.length && g[k + 2] === g[k]) k++;
  }
  return n;
};
/**
 * The script (house numbers): a line is one short sentence of 2-7 words, one clean line on screen at a time.
 * A film whose lines are mostly sentences (modeShare) reads at the script's budget: total words, words a second
 * in any 5 s and over the body, and the share of the body with a line on screen.
 */
const SCRIPT = { minWords: 2, maxWords: 7, modeShare: 0.6, words: 50, wordsPerSec: 2.4, avgWordsPerSec: 1.6, textShare: 0.85 };
type Finding = { check: string; severity: 'error' | 'warn'; message: string };
type Span = { from: number; to: number; label?: string };
type Music = {
  bpm: number; beatS: number; fps: number; t0: number; bars: number; downbeats: number[];
  accents?: { f: number; db?: number }[]; entries?: number[]; stops?: Span[]; breaks?: Span[];
  end?: { mode?: string; f: number };
};
type Seam = { at: number; kind: string; carry?: string; dir?: number; signature?: boolean; id?: string; dur?: number };
type Range = { from: number; to: number; id?: string; fps?: number; on?: number };
type FlashDecl = { f: number; frames: number; id?: string };
type Declares = { id?: string; seams?: Seam[]; stepped?: Range[]; flashes?: FlashDecl[]; cameraBlur?: Range[] };
type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';
const SALIENCES = ['copy', 'hit', 'cut', 'move', 'life'];
const SEAM_KINDS = ['velocity', 'morph', 'hard', 'mask', 'whip', 'defocus', 'light', 'snapZoom', 'breath', 'zoomThrough', 'stepped', 'colour', 'dissolveUi', 'fadeEnd', 'wipe'];
/** Seams that carry something across (speed, shape, scale): the film reads as one move through them. */
const CARRIED = new Set(['velocity', 'morph', 'breath', 'zoomThrough', 'whip', 'snapZoom', 'mask']);
/** Seams that make a designed punch: a shot shorter than 0.25 s next to one of them is intended. */
const PUNCH = new Set(['snapZoom', 'stepped', 'colour', 'light']);
/** Seams that change the picture without a hard cut: the next picture is revealed by a moving shape (cut-mix). */
const CUT_FREE = new Set(['morph', 'mask', 'wipe', 'zoomThrough', 'breath', 'defocus', 'dissolveUi']);
/** Seams that carry the eye through on their own: they may float off the music's accents (cut-on-sound skips them). */
const CONTINUITY = new Set([...CARRIED, 'defocus', 'wipe', 'dissolveUi', 'fadeEnd']);
const TEXTURES = ['clean', 'paper', 'grid', 'halftone', 'dither'];
const FILM_TYPES = ['launch', 'update', 'explainer', 'reel', 'social'];
/** House shot-length bands in seconds (median shot), by film type. */
const SHOT_BAND: Record<string, [number, number]> = { launch: [1.15, 2.05], update: [0.7, 1.4], explainer: [1.75, 2.65], reel: [0.45, 0.9], social: [0.45, 0.9] }; // = lib/look.ts GRAMMAR.shot.band
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN;
};
const quantile = (a: number[], q: number) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const p = (s.length - 1) * q;
  const i = Math.floor(p);
  return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i);
};
const cv = (a: number[]) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return m > 0 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m : 0;
};
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
type Pace = {
  holdBase: number; holdPerWord: number; holdMin: number; readMax: number; gapMin: number; gapMax: number;
  maxNewWords: number; maxVisibleBuild: number; maxVisibleReplace: number; maxWordsPerSec: number;
  avgWordsPerSec: number; maxWords: number; textShare: number; freeRun: number; maxGap: number; exitDur: number;
};
type Windows = Record<string, [number, number][]>;

// The check numbers of src/lib/pace.ts (60 fps frames), for timelines that do not export PACE.
// <gen-pace>
const BUILTIN: Record<'calm' | 'crisp', Pace> = {
  calm: { holdBase: 36, holdPerWord: 7, holdMin: 52, readMax: 150, gapMin: 26, gapMax: 90, maxNewWords: 4, maxVisibleBuild: 8, maxVisibleReplace: 5, maxWordsPerSec: 1.35, avgWordsPerSec: 1, maxWords: 30, textShare: 0.65, freeRun: 90, maxGap: 72, exitDur: 15 },
  crisp: { holdBase: 28, holdPerWord: 6, holdMin: 36, readMax: 120, gapMin: 16, gapMax: 90, maxNewWords: 5, maxVisibleBuild: 10, maxVisibleReplace: 10, maxWordsPerSec: 2.25, avgWordsPerSec: 1.35, maxWords: 35, textShare: 0.8, freeRun: 60, maxGap: 48, exitDur: 12 },
};
// </gen-pace>

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
if (has('-h') || has('--help')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}
const valued = new Set(['--max-words', '--max-gap', '--max-rest', '--cues', '--pace', '--onsets', '--lead', '--part']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1]));
const tlPath = resolve(positional[0] ?? (!existsSync('src/timeline.ts') && existsSync('timeline.js') ? 'timeline.js' : 'src/timeline.ts'));
const json = has('--json');
const strict = has('--strict');
const part = val('--part') ?? 'all';

const die = (msg: string): never => {
  if (json) console.log(JSON.stringify({ tool: 'grid-check', pass: false, fatal: msg }));
  else console.error(`grid-check: ${msg}`);
  process.exit(2);
};

const wordsOf = (text: unknown) => String(text ?? '').split(/\s+/).filter(Boolean).length;

/**
 * src/lib/pace.ts readingWindows(), for a timeline that exports no READ (and no cues.json `read`):
 * the same rule, so every check reads text the same way.
 */
const readingWindows = (copy: Copy[], P: Pace, fps: number, total: number): Windows => {
  const s = fps / 60;
  const cap = Math.round(P.readMax * s);
  const hold = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const w: Windows = {};
  for (const c of copy) {
    const end = c.out ?? total;
    const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, b) => a.in - b.in) : [c];
    const last = chain[chain.length - 1];
    const next = chain[chain.indexOf(c) + 1];
    const own: [number, number] = next ? [c.resolved, Math.min(next.in, c.resolved + hold(wordsOf(c.text)), end)] : [c.resolved, Math.min(end, c.resolved + cap)];
    const line: [number, number] | null = next && (c.mode ?? 'build') === 'build' ? [last.resolved, Math.min(last.out ?? total, last.resolved + cap)] : null;
    const list: [number, number][] = line ? [own, line] : [own];
    w[String(c.id)] = list.filter(([a, b]) => b > a);
  }
  return w;
};
const isWindows = (v: unknown): v is Windows =>
  !!v && typeof v === 'object' && Object.values(v as object).every((l) => Array.isArray(l) && l.every((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite)));

/**
 * The timeline module. A Remotion timeline.ts is an ES module. A HyperFrames timeline.js is a classic
 * script that sets FILM (CommonJS under Node, so the import gives it as `default`), with PACE_NAME
 * and PACE in the motion.js beside it; one that cannot be imported (in an ES-module package) runs
 * in a vm after its motion.js and music.js (when present), as the browser loads them.
 */
async function loadTimeline(path: string): Promise<Record<string, unknown>> {
  let T: Record<string, unknown>;
  let M: Record<string, unknown> | undefined;
  const motion = join(dirname(path), 'motion.js');
  const music = join(dirname(path), 'music.js');
  try {
    const mod = (await import(pathToFileURL(path).href)) as Record<string, unknown>;
    T = mod.default && mod.FPS === undefined ? { ...(mod.default as object) } : mod;
  } catch (e) {
    if (!/\.c?js$/.test(path)) throw e;
    const ctx: Record<string, unknown> = {};
    ctx.window = ctx;
    createContext(ctx);
    if (existsSync(motion)) runInContext(readFileSync(motion, 'utf8'), ctx, { filename: motion });
    // the music grid sits between them (window.MUSIC_GRID), so a film with a track is checked on its music
    if (existsSync(music)) runInContext(readFileSync(music, 'utf8'), ctx, { filename: music });
    runInContext(readFileSync(path, 'utf8'), ctx, { filename: path });
    if (!ctx.FILM) throw e;
    T = { ...(ctx.FILM as object) };
    M = ctx.MOTION as Record<string, unknown> | undefined;
  }
  if (T.PACE_NAME === undefined && !M && existsSync(motion)) {
    try {
      M = createRequire(path)(motion) as Record<string, unknown>;
    } catch {
      /* an ES-module motion.js: the pace falls back to crisp, as for a timeline written before paces */
    }
  }
  if (T.PACE_NAME === undefined && M && typeof M.PACE_NAME === 'string') Object.assign(T, { PACE_NAME: M.PACE_NAME, PACE: T.PACE ?? M.PACE });
  return T;
}

// ---------------------------------------------------------------------------------------------------- the spine
/**
 * The spine's house numbers. A film is one action played as acts; one element carries most of its scene changes and
 * one case runs from the request to the result. The carry family is judged as written up to `longFilm` seconds; a
 * longer film may lean on speed and section cuts more, so there it warns.
 */
const SPINE = {
  acts: { launch: [3, 5], update: [3, 4] } as Record<string, [number, number]>,
  first: { launch: [0.2, 0.32], update: [0.1, 0.32] } as Record<string, [number, number]>,
  last: [0.12, 0.31] as [number, number],
  carry: { fail: 0.5, warn: 0.65 },
  within: { fail: 0.6, warn: 0.75 },
  momentum: { fail: 0.3, warn: 0.2 },
  placed: 0.5, // under this share of the lines inside the product or around the element warns
  over: 1, // more `over` lines than this warns
  aloneMany: 3, // this many alone lines or more ...
  aloneCarry: 0.5, // ... while the element carries under this share of the changes: text then cards
  kinds: 3, // fewer handover kinds warns
  kindShare: 0.6, // one kind over this share of the handovers warns
  kindFail: 0.4, // one kind over this share of 5+ scene changes (a cut counted as a kind) fails
  longFilm: 35, // seconds
  tol: 0.05, // seconds: a change this near an act's start is that act's boundary; a line's edge meets a change as near
};
/** Handover kinds that carry the element (the form table's H1-H13); momentum (H14) carries speed only. */
const SPINE_ELEMENT = ['grow', 'shrink', 'swell', 'press', 'iris', 'zoom', 'pull', 'fly', 'stay', 'word', 'part', 'converge', 'surface'];
const SPINE_KIND: Record<string, string> = {
  grow: 'grow', expand: 'grow', cardexpand: 'grow', develop: 'grow', resolve: 'grow',
  shrink: 'shrink', collapse: 'shrink',
  swell: 'swell', swellswap: 'swell',
  press: 'press', pressopen: 'press',
  iris: 'iris',
  zoom: 'zoom', zoominto: 'zoom', dive: 'zoom', screenfill: 'zoom', punchin: 'zoom',
  pull: 'pull', pullout: 'pull', pullback: 'pull',
  fly: 'fly', flight: 'fly',
  stay: 'stay', isolate: 'stay',
  word: 'word', wordswap: 'word', letterswap: 'word',
  part: 'part', slottake: 'part',
  converge: 'converge', implode: 'converge', gather: 'converge',
  surface: 'surface', samesurface: 'surface', travel: 'surface',
  momentum: 'momentum', velocity: 'momentum', velocitycut: 'momentum', speed: 'momentum', whip: 'momentum',
  anchor: 'anchor', slot: 'anchor', textswap: 'anchor', centre: 'anchor', center: 'anchor',
  ground: 'ground',
  entry: 'entry', // the mark's own entry on the kept ground (what carries it is in `carries`)
  world: 'world', worldstep: 'world',
  optics: 'optics', blur: 'optics', flash: 'optics', wipe: 'optics', fade: 'optics', dissolve: 'optics', defocus: 'optics', light: 'optics',
  cut: 'cut', hard: 'cut', bare: 'cut', none: 'cut',
};
const SPINE_H = [...SPINE_ELEMENT, 'momentum']; // H1..H14 in order
const SPINE_PLACES = ['alone', 'inside', 'around', 'over'];
const SPINE_KEEP = new Set(['', 'keep', 'hold', 'same', 'none', 'kept']);
const SPINE_STOP = new Set(['a', 'an', 'the', 'for', 'my', 'our', 'your', 'to', 'of', 'in', 'on', 'at', 'and', 'with', 'from', 'by', 'is', 'it', 'me', 'i', 'we', 'you', 'this', 'that', 'can', 'could', 'please', 'make', 'want', 'new']);
type SpineChange = { at: number; kind: string; ch: Set<string>; whip: boolean; downbeat: boolean | null; final: boolean; boundary: number; act: number; synthetic: boolean };
type SpineAct = { i: number; id: string; verb: string; forms: string[]; from: number; to: number; step: boolean; strings: string[]; flag: boolean | null };
type SpineLine = { text: string; place: string; from: number; to: number; act: number; inJ: boolean; outJ: boolean };

/** A kind's canonical name ('' when unknown): handover names, their aliases, H1..H14, the joins that are not the element. */
const spineKind = (k: unknown): string => {
  const s = String(k ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const h = /^h(\d{1,2})$/.exec(s);
  if (h) return SPINE_H[Number(h[1]) - 1] ?? '';
  return SPINE_KIND[s] ?? '';
};
/** The channels a kind carries: E element, M motion, A anchor, G ground, O optics; a world step and a cut carry none. */
const kindChannels = (kind: string): string => (SPINE_ELEMENT.includes(kind) ? 'E' : ({ momentum: 'M', anchor: 'A', ground: 'G', optics: 'O' } as Record<string, string>)[kind] ?? '');
/** `carry` as channel letters: 'EAG', ['element', 'anchor'], or a kind. */
const carryChannels = (v: unknown): string => {
  if (v === undefined || v === null || v === false) return '';
  if (v === true) return 'E';
  if (Array.isArray(v)) return v.map(carryChannels).join('');
  const s = String(v).trim();
  if (/^[EAGMO]*$/.test(s)) return s;
  // a line's join (element, anchor, swap: a swap in its slot holds the slot) or a channel's name
  const word: Record<string, string> = { element: 'E', anchor: 'A', swap: 'A', ground: 'G', motion: 'M', speed: 'M', optics: 'O' };
  return word[s.toLowerCase()] ?? kindChannels(spineKind(s));
};
const joinedBy = (ch: string) => /[EAM]/.test(ch);
const pctOf = (a: number, n: number) => Math.round((1000 * a) / Math.max(1, n)) / 10;

/**
 * The spine rules on a SPINE_PLAN. `ctx.fps` and `ctx.total` come from the plan or the timeline; `ctx.downbeats` (film
 * frames) lets a bare act boundary be checked against the music; `ctx.format` launch or update. Returns findings and a
 * summary for the report.
 */
function spineFindings(raw: unknown, ctx: { fps: number; total: number; format: string; downbeats: number[] | null }): { findings: Finding[]; summary: Record<string, unknown> } {
  const out: Finding[] = [];
  const err = (check: string, message: string) => out.push({ check, severity: 'error', message });
  const warn = (check: string, message: string) => out.push({ check, severity: 'warn', message });
  const P = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const fps = isNum(P.fps) && P.fps > 0 ? P.fps : ctx.fps;
  const format = String(P.format ?? ctx.format ?? 'launch').toLowerCase() === 'update' ? 'update' : 'launch';
  const sec = (f: number) => `${(f / fps).toFixed(2)} s`;
  const tol = Math.max(1, Math.round(SPINE.tol * fps));
  const list = (k: string[]): Record<string, unknown>[] => {
    for (const key of k) if (Array.isArray(P[key])) return (P[key] as unknown[]).filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
    return [];
  };
  // --- acts (a planned spine keeps each act's forms in its scenes: indices into SPINE_PLAN.scenes)
  const actsIn = list(['acts']);
  const scenesIn = list(['scenes']);
  const formOf = (s: unknown): string => {
    if (typeof s === 'number') return String((scenesIn.find((x) => x.i === s) ?? scenesIn[s] ?? {}).form ?? '');
    if (s && typeof s === 'object') return String((s as { form?: unknown }).form ?? '');
    return s === undefined || s === null ? '' : String(s);
  };
  const acts: SpineAct[] = actsIn
    .map((a, i) => {
      const from = Number(a.from);
      const to = isNum(a.to) ? (a.to as number) : isNum(a.dur) ? from + (a.dur as number) : NaN;
      const own = Array.isArray(a.form) ? a.form : Array.isArray(a.forms) ? a.forms : a.form !== undefined ? [a.form] : Array.isArray(a.scenes) ? a.scenes : scenesIn.filter((s) => s.act === i);
      const forms = (own as unknown[]).map(formOf).filter(Boolean).map((x) => x.toLowerCase());
      const strings = (['ui', 'strings', 'words'].map((k) => a[k]).find(Array.isArray) as unknown[] | undefined) ?? [];
      return { i, id: String(a.id ?? a.verb ?? `act${i + 1}`), verb: String(a.verb ?? ''), forms, from, to, step: !SPINE_KEEP.has(String(a.world ?? '').toLowerCase()), strings: strings.map(String), flag: typeof a.case === 'boolean' ? (a.case as boolean) : null };
    })
    .sort((a, b) => a.from - b.from);
  acts.forEach((a, i) => {
    a.i = i;
    if (!isNum(a.to)) a.to = acts[i + 1]?.from ?? (isNum(P.to) ? (P.to as number) : isNum(P.total) ? (P.total as number) : ctx.total);
  });
  // the body: SPINE_PLAN.from / to (a planned spine), else [0, total); shares and the film's length are of the body
  const bodyFrom = isNum(P.from) ? (P.from as number) : 0;
  const total = isNum(P.to) && (P.to as number) > bodyFrom ? (P.to as number) - bodyFrom
    : isNum(P.total) && (P.total as number) > 0 ? (P.total as number) : Math.max(ctx.total || 0, ...acts.map((a) => a.to).filter(isNum));
  const filmEnd = bodyFrom + total;
  const seconds = total / fps;
  const long = seconds > SPINE.longFilm;
  const carryErr = long ? warn : err; // the carry family past 35 s
  const longNote = long ? ` (a film over ${SPINE.longFilm} s: a warning)` : '';
  const actAt = (f: number) => {
    let k = 0;
    for (const a of acts) if (f >= a.from - 1e-6) k = a.i;
    return k;
  };
  const bad = acts.filter((a) => !isNum(a.from) || !isNum(a.to) || !(a.to > a.from));
  if (bad.length) err('spine-declared', `acts need frames: ${bad.map((a) => a.id).join(', ')} (from, then to or dur)`);
  const [aMin, aMax] = SPINE.acts[format];
  if (acts.length < aMin || acts.length > aMax)
    err('spine-declared', `${acts.length} act${acts.length === 1 ? '' : 's'}: ${format === 'update' ? 'an update plays a hook and 2-3 changes, 3-4 acts' : 'a film is one action in 3-5 acts, one verb each'}`);
  if (!String(P.element ?? '').trim()) err('spine-declared', 'no element named (SPINE_PLAN.element): one element carries the film, its form changing act to act');
  if (acts.length >= 2 && total > 0 && !bad.length) {
    const first = (acts[0].to - acts[0].from) / total;
    const last = (acts[acts.length - 1].to - acts[acts.length - 1].from) / total;
    const [f0, f1] = SPINE.first[format];
    if (first < f0 - 1e-9 || first > f1 + 1e-9) warn('spine-declared', `the first act runs ${pctOf(first, 1)} % of the film; ${format === 'update' ? 'the hook' : 'the first act (the promise and the request)'} runs ${Math.round(100 * f0)}-${Math.round(100 * f1)} %`);
    if (last < SPINE.last[0] - 1e-9 || last > SPINE.last[1] + 1e-9) warn('spine-declared', `the last act runs ${pctOf(last, 1)} % of the film; the last act (the result and the claim) runs ${Math.round(100 * SPINE.last[0])}-${Math.round(100 * SPINE.last[1])} %`);
  }
  // --- scene changes
  const unknownKinds = new Set<string>();
  const changes: SpineChange[] = list(['changes', 'handovers']).flatMap((c) => {
    const at = Number(c.at ?? c.f ?? c.from);
    if (!isNum(at)) return [];
    const kind = spineKind(c.kind);
    if (c.kind !== undefined && !kind) unknownKinds.add(String(c.kind));
    // what carries it: the kind's own channel, `carry` (letters or names) and a planned change's `carries` / `element`
    const ch = new Set((kindChannels(kind) + carryChannels(c.carry) + carryChannels(c.carries) + (c.element === true ? 'E' : '')).split('').filter(Boolean));
    const whip = c.whip === true || /whip/i.test(String(c.kind ?? ''));
    return [{ at, kind: kind || (ch.size ? '' : 'cut'), ch, whip, downbeat: typeof c.downbeat === 'boolean' ? (c.downbeat as boolean) : null, final: c.final === true, boundary: c.boundary === false ? -2 : -1, act: 0, synthetic: false }];
  });
  if (unknownKinds.size) err('spine-declared', `unknown handover kind${unknownKinds.size > 1 ? 's' : ''} ${[...unknownKinds].join(', ')}: use ${SPINE_H.join(', ')} (or H1-H14), anchor, ground, world, optics or cut`);
  // every act boundary is a scene change: one with no change declared there is a bare cut
  for (const a of acts.slice(1)) {
    if (!changes.some((c) => Math.abs(c.at - a.from) <= tol)) changes.push({ at: a.from, kind: 'cut', ch: new Set(), whip: false, downbeat: null, final: false, boundary: -1, act: 0, synthetic: true });
  }
  changes.sort((a, b) => a.at - b.at);
  for (const c of changes) {
    // a change at an act's first frame is that act's boundary (a planned change that says boundary: false stays inside)
    const b = c.boundary === -2 ? -1 : acts.findIndex((a, i) => i > 0 && Math.abs(c.at - a.from) <= tol);
    c.boundary = b;
    c.act = b >= 0 ? b : actAt(c.at);
  }
  const n = changes.length;
  const E = changes.filter((c) => c.ch.has('E'));
  const within = changes.filter((c) => c.boundary < 0);
  const withinE = within.filter((c) => c.ch.has('E'));
  const share = n ? E.length / n : 0;
  const withinShare = within.length ? withinE.length / within.length : 1;
  if (!n) err('spine-carry', 'no scene changes declared (SPINE_PLAN.changes): every change of scene is a handover of the element, or says what else carries it');
  else {
    if (share < SPINE.carry.fail) carryErr('spine-carry', `the element carries ${E.length} of ${n} scene changes (${pctOf(E.length, n)} %): at least half, two thirds or more in a film that flows. Let the element's last form become the next scene (grow, shrink, swell and swap, fly, zoom into it)${longNote}`);
    else if (share < SPINE.carry.warn) warn('spine-carry', `the element carries ${E.length} of ${n} scene changes (${pctOf(E.length, n)} %); two thirds or more reads as one action`);
    if (within.length) {
      if (withinShare < SPINE.within.fail) carryErr('spine-carry', `inside the acts the element carries ${withinE.length} of ${within.length} changes (${pctOf(withinE.length, within.length)} %): at least 60 %, three quarters or more; inside an act the element changes state, the scene does not cut away from it${longNote}`);
      else if (withinShare < SPINE.within.warn) warn('spine-carry', `inside the acts the element carries ${withinE.length} of ${within.length} changes (${pctOf(withinE.length, within.length)} %); three quarters or more keeps each act on the element`);
    }
  }
  // --- bare changes
  const isBare = (c: SpineChange) => c.kind === 'cut' || c.ch.size === 0; // a cut is bare whatever ground it keeps (a hard cut on the kept ground is 'ground')
  const bare = changes.filter((c) => isBare(c) && !c.final);
  const bareIn = bare.filter((c) => c.boundary < 0);
  const bareB = bare.filter((c) => c.boundary >= 0);
  if (bareIn.length) carryErr('spine-bare', `a bare cut inside an act at ${bareIn.map((c) => sec(c.at)).join(', ')}: nothing of the element, an anchor, speed or optics crosses it. Inside an act the element hands the scene on${longNote}`);
  if (bareB.length > 1) carryErr('spine-bare', `${bareB.length} bare act boundaries (${bareB.map((c) => `${sec(c.at)}${c.synthetic ? ' (no change declared)' : ''}`).join(', ')}): a bare cut is a section break on a downbeat, once a film at most${longNote}`);
  const onDown = (c: SpineChange): boolean | null => {
    if (c.downbeat !== null) return c.downbeat;
    if (!ctx.downbeats || !ctx.downbeats.length) return null;
    return ctx.downbeats.some((d) => Math.abs(d - c.at) <= 1);
  };
  const offDown = bareB.filter((c) => onDown(c) === false);
  if (offDown.length) warn('spine-bare', `a bare act boundary off the downbeat at ${offDown.map((c) => sec(c.at)).join(', ')}: a section cut lands on the bar`);
  // --- momentum
  const speedOnly = changes.filter((c) => c.ch.has('M') && !c.ch.has('E') && !c.ch.has('A'));
  const mShare = n ? speedOnly.length / n : 0;
  if (mShare > SPINE.momentum.fail) carryErr('spine-momentum', `${speedOnly.length} of ${n} changes (${pctOf(speedOnly.length, n)} %) are joined by speed alone: at most 30 %, under 20 % in a film that flows. Speed carries a run of consequences of the same case, never one subject to another${longNote}`);
  else if (mShare > SPINE.momentum.warn) warn('spine-momentum', `${speedOnly.length} of ${n} changes (${pctOf(speedOnly.length, n)} %) are joined by speed alone; keep it under 20 %: the element carries, speed is the fallback`);
  // --- act boundaries
  const loose = changes.filter((c) => c.boundary >= 0 && !isBare(c) && !c.ch.has('E') && !c.ch.has('A') && !c.ch.has('M') && !acts[c.boundary].step);
  if (loose.length) warn('spine-boundary', `act boundar${loose.length > 1 ? 'ies' : 'y'} at ${loose.map((c) => sec(c.at)).join(', ')} held only by ${loose.map((c) => [...c.ch].join('')).join(', ')} (ground or optics): an act turns on the element, an anchor or speed, or makes the world's one step for that act (enter, closer, light, turn, pull-back)`);
  // --- lines
  const unknownPlaces = new Set<string>();
  const changeNear = (f: number) => changes.filter((c) => Math.abs(c.at - f) <= tol);
  const sideJoined = (v: unknown, f: number, atFilmEdge: boolean): boolean => {
    if (v !== undefined && v !== null) return typeof v === 'boolean' ? v : joinedBy(carryChannels(v));
    if (atFilmEdge) return false;
    return changeNear(f).some((c) => joinedBy([...c.ch].join('')));
  };
  const lines: SpineLine[] = list(['lines']).flatMap((l) => {
    // frames: from / to (or a COPY entry's numeric in / out), else the line's act (0-based) or position. Joins: in / out
    // (letters, a kind, a channel's name), joinIn / joinOut, a planned line's join: { in, out } ('element', 'anchor',
    // 'swap', null), becomes (it turns into the element's next form); else the change at its first or last frame
    const from = isNum(l.from) ? (l.from as number) : isNum(l.in) ? (l.in as number) : NaN;
    const to = isNum(l.to) ? (l.to as number) : isNum(l.out) ? (l.out as number) : NaN;
    const place = String(l.place ?? '').toLowerCase();
    if (!SPINE_PLACES.includes(place)) {
      unknownPlaces.add(place || '(none)');
      return [];
    }
    const pos = String(l.position ?? '');
    const act = isNum(from) ? actAt(from) : isNum(l.act) ? Math.max(0, Math.min(acts.length - 1, l.act as number)) : pos === 'first' ? 0 : pos === 'last' ? acts.length - 1 : pos === 'middle' ? Math.min(1, acts.length - 1) : -1;
    if (act < 0) return [];
    const J = (l.join && typeof l.join === 'object' ? l.join : {}) as { in?: unknown; out?: unknown };
    const joinIn = l.joinIn ?? J.in ?? (isNum(l.in) ? undefined : l.in);
    const joinOut = l.joinOut ?? J.out ?? (l.becomes ? 'E' : undefined) ?? (isNum(l.out) ? undefined : l.out);
    const framed = isNum(from) && isNum(to);
    // a planned line with no frames is joined only by what it declares
    const side = (v: unknown, f: number, edge: boolean) => (framed ? sideJoined(v, f, edge) : v !== undefined && v !== null && sideJoined(v, f, false));
    return [{ text: String(l.text ?? ''), place, from: framed ? from : acts[act]?.from ?? 0, to: framed ? to : acts[act]?.to ?? 0, act, inJ: side(joinIn, from, from <= bodyFrom + tol), outJ: side(joinOut, to, to >= filmEnd - tol) }];
  });
  if (unknownPlaces.size) err('spine-declared', `line place ${[...unknownPlaces].join(', ')}: a line sits alone (the promise, the claim), inside the product's own words, around the element or over a picture`);
  lines.sort((a, b) => a.act - b.act || a.from - b.from);
  const last = acts.length - 1;
  const middle = (l: SpineLine) => l.act > 0 && l.act < last;
  const count = (p: string) => lines.filter((l) => l.place === p).length;
  const placed = count('inside') + count('around');
  if (lines.length && placed < SPINE.placed * lines.length)
    warn('spine-lines', `${placed} of ${lines.length} lines sit inside the product or around the element (${pctOf(placed, lines.length)} %): half or more. In the middle acts the product speaks (the request typed, a status, a button's label) or the element parts the line, rises behind it, holds it`);
  if (count('over') > SPINE.over) warn('spine-lines', `${count('over')} lines sit over a picture they do not touch: once a film at most`);
  const groups: SpineLine[][] = [];
  lines.forEach((l, i) => {
    if (l.place !== 'alone' || !middle(l)) return;
    const prev = lines[i - 1];
    if (prev && prev.place === 'alone' && prev.act === l.act && groups.length && groups[groups.length - 1].includes(prev)) groups[groups.length - 1].push(l);
    else groups.push([l]);
  });
  if (groups.length > 1)
    err('spine-lines', `${groups.length} groups of alone lines in the middle acts (${groups.map((g) => `"${g[0].text}"`).join(', ')}): a line stands alone for the promise and the claim; in the middle one joined pair at most (a word or letter swap in its slot)`);
  // --- text then cards
  const alone = lines.filter((l) => l.place === 'alone');
  const island = (l: SpineLine) => !l.inJ && !l.outJ;
  const midIslands = alone.filter((l) => middle(l) && island(l));
  const endIslands = alone.filter((l) => !middle(l) && island(l));
  if (midIslands.length)
    err('text-then-cards', `an alone line in a middle act is an island: ${midIslands.map((l) => `"${l.text}" (${sec(l.from)})`).join(', ')}. Nothing carries it in or out: it comes out of the element (swell and swap, a word that survives the cut, the element parting it) or the element takes it on`);
  if (alone.length >= SPINE.aloneMany && n && share < SPINE.aloneCarry)
    carryErr('text-then-cards', `${alone.length} alone lines while the element carries ${pctOf(E.length, n)} % of the changes: a line, a card, a cut, again. Put the middle lines inside the product or around the element and let the element carry the scenes${longNote}`);
  if (endIslands.length) warn('text-then-cards', `an alone line with nothing carried in or out: ${endIslands.map((l) => `"${l.text}" (${sec(l.from)})`).join(', ')}; the promise is born from the element or turns into it, the claim comes out of the last form`);
  // --- the case
  const C = (P.case && typeof P.case === 'object' ? P.case : {}) as Record<string, unknown>;
  const request = String(C.request ?? '').trim();
  const names = (Array.isArray(C.names) ? C.names : []).map(String).filter(Boolean);
  const numbers = (Array.isArray(C.numbers) ? C.numbers : []).map(String).filter(Boolean);
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}$€£%.]+/gu, ' ').trim();
  const nouns = [...new Set(norm(request).split(/\s+/).filter((w) => w.length >= 3 && !SPINE_STOP.has(w)))];
  const showsCase = (a: SpineAct) => {
    if (a.flag !== null) return a.flag;
    const text = norm(a.strings.join(' | '));
    if (!text) return false;
    if (request && text.includes(norm(request))) return true;
    if (names.some((x) => text.includes(norm(x))) || numbers.some((x) => text.includes(norm(x)))) return true;
    const hits = nouns.filter((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.$]/g, '\\$&')}`, 'u').test(text)).length;
    return hits >= Math.min(2, nouns.length) && hits > 0;
  };
  const caseActs = acts.filter(showsCase).map((a) => a.i);
  if (!request && !names.length && !numbers.length && !acts.some((a) => a.flag)) err('spine-case', 'no case (SPINE_PLAN.case): one request, record or person, with its names and numbers, followed from the request to the result');
  else if (caseActs.length < 2)
    err('spine-case', `the case ${request ? `("${request}")` : ''} is on screen in ${caseActs.length ? `act ${caseActs[0] + 1} only` : 'no act'}: the request made early is the result shown later, its names, numbers or nouns in the strings of two acts or more`);
  else if (caseActs[caseActs.length - 1] === caseActs[0]) err('spine-case', 'the case never reaches a later act');
  const allText = norm(acts.map((a) => a.strings.join(' | ')).join(' | '));
  const unseen = [...names, ...numbers].filter((x) => allText && !allText.includes(norm(x)));
  if (unseen.length && acts.some((a) => a.strings.length)) warn('spine-case', `the case's ${unseen.map((x) => `"${x}"`).join(', ')} never show${unseen.length === 1 ? 's' : ''} on screen: the names and numbers of the case are the ones the product shows, the same in every act (data-check reads them)`);
  // --- the end
  const end = (P.end && typeof P.end === 'object' ? P.end : null) as Record<string, unknown> | null;
  if (end) {
    const raw = String(end.kind ?? '').toLowerCase();
    const kind = ['entry', 'none', 'cut', 'empty'].includes(raw) ? raw : spineKind(raw);
    const at = isNum(end.at) ? (end.at as number) : null;
    const arrival = at !== null ? changeNear(at)[0] : undefined;
    if (kind !== 'none') {
      if (kind === 'cut' || kind === 'empty' || (arrival && arrival.kind === 'cut') || (arrival && arrival.ch.size === 0) || end.after === 'cut' || end.after === 'empty')
        err('spine-end', `the lockup arrives after ${kind === 'empty' || end.after === 'empty' ? 'empty frames' : 'a bare cut from a picture'}${at !== null ? ` (${sec(at)})` : ''} with nothing carried: grow the mark out of the element's last form (converge the notices into the count and the count into the mark, pull back from the last screen onto the mark, swell the chip into it, swap the case's key word into the wordmark)`);
      else if (!SPINE_ELEMENT.includes(kind) && !(kind === 'entry' && (!arrival || arrival.ch.has('G'))))
        warn('spine-end', `the lockup is not built from the last form (end.kind ${raw || '(none)'}): the mark grows out of it, or enters with its own designed move on the claim's kept ground`);
    }
  } else warn('spine-end', 'no end declared (SPINE_PLAN.end): say how the lockup arrives (grown from the last form, its own entry on the kept ground) or that the film ends inside the action');
  // --- the checklist
  const kindsUsed = changes.filter((c) => SPINE_H.includes(c.kind));
  const tally = new Map<string, number>();
  for (const c of kindsUsed) tally.set(c.kind, (tally.get(c.kind) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  if (n && tally.size < SPINE.kinds) warn('checklist', `${tally.size} handover kind${tally.size === 1 ? '' : 's'} (${[...tally.keys()].join(', ') || 'none'}): three or more a film, dealt by the form pair (grow, shrink, swell and swap, fly, zoom into, iris, converge, word, part, stay, same surface)`);
  else if (top && top[1] > SPINE.kindShare * kindsUsed.length) warn('checklist', `one handover kind (${top[0]}) takes ${top[1]} of ${kindsUsed.length} handovers: one house kind may lead, up to 60 %`);
  {
    // the seams vary: no kind (a cut counted as one) on more than 40 % of 5 or more scene changes
    const joins = changes.filter((c) => SPINE_H.includes(c.kind) || c.kind === 'cut');
    const t2 = new Map<string, number>();
    for (const c of joins) t2.set(c.kind, (t2.get(c.kind) ?? 0) + 1);
    const top2 = [...t2.entries()].sort((a, b) => b[1] - a[1])[0];
    if (joins.length >= 5 && top2 && top2[1] > SPINE.kindFail * joins.length + 1e-9)
      carryErr('seam-variety', `one join (${top2[0]}) takes ${top2[1]} of ${joins.length} scene changes (${pctOf(top2[1], joins.length)} %): no kind on more than ${SPINE.kindFail * 100} %; vary the handovers (a converge, a flight, a porthole, an iris, a grow, a swell, a whip, one cut at most)${longNote}`);
  }
  const devIn = list(['devices']);
  if (devIn.length) {
    const actOf = (d: Record<string, unknown>): number => {
      // act: the act's index (0-based, as a planned spine writes it) or its id
      if (typeof d.act === 'number') return Math.max(0, Math.min(acts.length - 1, Math.round(d.act)));
      if (typeof d.act === 'string') {
        const k = acts.findIndex((a) => a.id === d.act || a.verb === d.act);
        if (k >= 0) return k;
      }
      return isNum(d.at) ? actAt(d.at as number) : -1;
    };
    // a planned device says whether a verb of its act asks for it (`fits`); a device written by hand names its verb
    const devs = devIn.map((d) => ({ id: String(d.id ?? '?'), act: actOf(d), verb: d.fits === false ? '' : String(d.verb ?? '').trim(), form: d.form === undefined ? '' : String(d.form).toLowerCase(), signature: d.signature === true }));
    const noVerb = devs.filter((d) => !d.verb);
    if (noVerb.length) err('checklist', `a device no verb asks for: ${noVerb.map((d) => `${d.id}${d.act >= 0 ? ` (act ${d.act + 1}${acts[d.act]?.verb ? `, ${acts[d.act].verb}` : ''})` : ''}`).join(', ')}. A device is chosen by its act's verb (types, writes, sends, fills, chooses, counts, shows pictures) and draws the element; one with no verb is out`);
    const offForm = devs.filter((d) => d.form && d.act >= 0 && acts[d.act].forms.length && !acts[d.act].forms.includes(d.form));
    if (offForm.length) err('checklist', `a device that does not draw its act's form: ${offForm.map((d) => `${d.id} draws ${d.form}, act ${d.act + 1} is ${acts[d.act].forms.join(' / ')}`).join('; ')}`);
    if (devs.length > acts.length + 1) err('checklist', `${devs.length} devices in ${acts.length} acts: no more than acts + 1`);
    const sig = devs.filter((d) => d.signature);
    if (sig.length > 1) err('checklist', `${sig.length} signature devices (${sig.map((d) => d.id).join(', ')}): one signature event a film, at the turn`);
    const actsWith = [...new Set(devs.map((d) => d.act).filter((k) => k >= 0))].sort((a, b) => a - b);
    const unjoined: string[] = [];
    for (let i = 1; i < actsWith.length; i++) {
      const [a, b] = [actsWith[i - 1], actsWith[i]];
      if (b !== a + 1) continue;
      const bound = changes.find((c) => c.boundary === b);
      if (!bound || !bound.ch.has('E')) unjoined.push(`${devs.filter((d) => d.act === a).map((d) => d.id).join('+')} -> ${devs.filter((d) => d.act === b).map((d) => d.id).join('+')} (${bound ? sec(bound.at) : `act ${b + 1}`})`);
    }
    if (unjoined.length) err('checklist', `devices in adjacent acts with no element handover between them: ${unjoined.join('; ')}. Two devices meet through the form table (a ring of photos collapses to a chip or a point before it becomes a stack of notices)`);
  }
  // --- a planned spine carries its own grammar check (lib/spine validateSpine): the errors the rules above do not
  // measure (the sentence, the world's steps, scenes without frames, a form pair no handover joins, an unknown form)
  const own = P.issues && typeof P.issues === 'object' ? (P.issues as { errors?: unknown }).errors : null;
  if (Array.isArray(own)) {
    const extra = own.map(String).filter((e) => /^(sentence|world|scenes|end):/.test(e) || /^act \d+ scene/.test(e) || (/->/.test(e) && !/bare cut/.test(e)));
    if (extra.length) err('spine-declared', `the plan's own grammar: ${extra.join('; ')}`);
  }
  const summary = {
    seconds: +seconds.toFixed(2), format, acts: acts.length, changes: n, element: pctOf(E.length, n), withinActs: within.length ? pctOf(withinE.length, within.length) : null,
    bare: bare.length, bareInsideActs: bareIn.length, bareBoundaries: bareB.length, speedOnly: pctOf(speedOnly.length, n), kinds: Object.fromEntries(tally),
    lines: { alone: count('alone'), inside: count('inside'), around: count('around'), over: count('over') }, caseActs: caseActs.map((k) => k + 1), long,
  };
  return { findings: out, summary };
}

/** The music's downbeats in film frames (MUSIC), else the bar lines of the timeline's own grid; null without either. */
function spineDownbeats(T: Record<string, unknown>): number[] | null {
  const M = T.MUSIC && typeof T.MUSIC === 'object' ? (T.MUSIC as Music) : null;
  if (M && Array.isArray(M.downbeats) && M.downbeats.length) return M.downbeats.map(Number).filter(Number.isFinite);
  const fps = Number(T.FPS);
  const bpm = Number(T.BPM);
  const total = Number(T.TOTAL);
  if (!(fps > 0 && bpm > 0 && total > 0)) return null;
  const bar = (60 / bpm) * fps * 4;
  const out: number[] = [];
  for (let f = 0; f < total; f += bar) out.push(f);
  return out;
}

/** The keys of src/product.tsx's OWN object (the film's own scenes by name), read by brace depth; [] without one. */
function ownKeys(file: string): string[] {
  if (!existsSync(file)) return [];
  const t = readFileSync(file, 'utf8');
  const at = /const OWN[^=]*=\s*\{/.exec(t);
  if (!at) return [];
  const keys: string[] = [];
  let depth = 1;
  let quote = '';
  for (let i = at.index + at[0].length; i < t.length && depth > 0; i++) {
    const c = t[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      if (depth === 1) {
        const m = /^(['"])([^'"]+)\1\s*:/.exec(t.slice(i));
        if (m) {
          keys.push(m[2]);
          i += m[0].length - 1;
          continue;
        }
      }
      quote = c;
    } else if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (depth === 1 && /[A-Za-z_$]/.test(c) && /[\s,{]/.test(t[i - 1])) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(t.slice(i));
      if (m) {
        keys.push(m[1]);
        i += m[0].length - 1;
      }
    }
  }
  return keys;
}

type DealScene = { name: string; bank: string | null; own?: boolean; line?: boolean; dealt?: boolean; why?: string };
/** The deal rules on a template's DEAL_PLAN (see the deal family above); none without one. */
function dealFindings(T: Record<string, unknown>): { findings: Finding[]; summary: Record<string, unknown> | null } {
  const plan = T.DEAL_PLAN as { template?: string; scenes?: DealScene[]; last?: string[] } | undefined;
  if (!plan || !Array.isArray(plan.scenes)) return { findings: [], summary: null };
  const out: Finding[] = [];
  const e = (check: string, message: string) => out.push({ check, severity: 'error', message });
  const drawn = ownKeys(resolve(dirname(tlPath), 'product.tsx'));
  const scenes = plan.scenes.map((x) => (drawn.includes(x.name) ? { ...x, bank: null, own: true, line: false, drawn: true } : { ...x, drawn: false }));
  const pic = scenes.filter((x) => !x.line);
  const bank = pic.filter((x) => x.bank);
  const own = pic.filter((x) => !x.bank);
  const share = pic.length ? bank.length / pic.length : 1;
  if (share < 0.75 - 1e-9)
    e('deal-share', `${bank.length} of ${pic.length} picture scenes come from the bank (${Math.round(share * 100)} %); 75 % or more are dealt from the house scenes: let the deal cast them`);
  if (own.length > 1) e('deal-own', `${own.length} scenes of the film's own (${own.map((x) => x.name).join(', ')}); one at most: let the deal cast the rest`);
  for (const x of scenes.filter((y) => y.drawn && !plan.scenes.find((z) => z.name === y.name)?.own))
    e('deal-own', `scene "${x.name}" is drawn in src/product.tsx OWN over the scene the deal gave it: mark it \`own: true\` with its seconds in the spine (one a film), or delete the drawing`);
  const ids = bank.map((x) => x.bank as string);
  const twice = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (twice.length) e('deal-twice', `${twice.join(', ')} plays twice; one house scene once a film`);
  const last = Array.isArray(plan.last) ? plan.last : [];
  const shared = [...new Set(ids.filter((id) => last.includes(id)))];
  if (shared.length > 2) e('deal-shared', `${shared.length} scenes shared with the last film (${shared.join(', ')}); 2 at most: deal again`);
  for (const x of pic.filter((y) => y.bank && y.dealt === false && !String(y.why ?? '').trim()))
    e('deal-redraw', `scene "${x.name}" names ${x.bank} by hand with no reason: give it \`why\` (what rules the dealt scene out), or let the deal cast it`);
  return { findings: out, summary: { template: plan.template ?? null, scenes: pic.length, bank: bank.length, share: Math.round(share * 100), own: own.length, shared: shared.length } };
}

/** --part spine: the spine rules alone, on any module that exports SPINE_PLAN. */
function spineOnly(T: Record<string, unknown>) {
  const out: Finding[] = [];
  let summary: Record<string, unknown> | null = null;
  const plan = T.SPINE_PLAN;
  if (plan === undefined || plan === null) {
    out.push({ check: 'spine-declared', severity: 'error', message: `${tlPath} exports no SPINE_PLAN: the film's sentence, its case, its element and its acts, scene changes and lines (see --help)` });
  } else {
    const fps = Number(T.FPS) > 0 ? Number(T.FPS) : 60;
    const fmt = String((plan as { format?: string }).format ?? (T.LOOK as { filmType?: string } | undefined)?.filmType ?? 'launch');
    const r = spineFindings(plan, { fps, total: Number(T.TOTAL) > 0 ? Number(T.TOTAL) : 0, format: fmt, downbeats: spineDownbeats(T) });
    out.push(...r.findings);
    summary = r.summary;
  }
  const dealt = dealFindings(T);
  out.push(...dealt.findings);
  const errors = out.filter((x) => x.severity === 'error').length;
  const warnings = out.length - errors;
  const pass = errors === 0 && !(strict && warnings > 0);
  if (json) console.log(JSON.stringify({ tool: 'grid-check', part: 'spine', timeline: tlPath, pass, errors, warnings, summary: { spine: summary, deal: dealt.summary }, findings: out }, null, 1));
  else {
    for (const f of out) console.log(`${f.severity === 'error' ? 'FAIL' : 'warn'}  ${f.check}  ${f.message}`);
    const s = summary as { acts?: number; changes?: number; element?: number; withinActs?: number | null; speedOnly?: number; lines?: Record<string, number>; caseActs?: number[] } | null;
    console.log(s
      ? `grid-check spine: ${s.acts} acts, ${s.changes} scene changes, the element on ${s.element} % (${s.withinActs ?? '-'} % inside acts), speed alone ${s.speedOnly} %, lines ${Object.entries(s.lines ?? {}).map(([k, v]) => `${v} ${k}`).join(', ')}, the case in acts ${(s.caseActs ?? []).join(', ') || 'none'} -> ${pass ? 'pass' : 'FAIL'} (${errors} errors, ${warnings} warnings)`
      : `grid-check spine: no plan -> FAIL`);
    if (dealt.summary) console.log(`grid-check deal: ${dealt.summary.bank} of ${dealt.summary.scenes} picture scenes from the bank (${dealt.summary.share} %), ${dealt.summary.own} own, ${dealt.summary.shared} shared with the last film`);
  }
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (!existsSync(tlPath)) die(`${tlPath} not found`);
  let T: Record<string, unknown>;
  try {
    T = await loadTimeline(tlPath);
  } catch (e) {
    return die(`importing ${tlPath} failed (keep timeline.ts free of React/CSS imports): ${(e as Error).message}`);
  }
  const src = readFileSync(tlPath, 'utf8');
  if (!['all', 'spine'].includes(part)) die(`--part must be spine (got ${part})`);
  if (part === 'spine') return spineOnly(T);
  const FPS = Number(T.FPS);
  const BPM = Number(T.BPM);
  const TOTAL = Number(T.TOTAL);
  const ACT = T.ACT as Record<string, Act> | undefined;
  const CUE = T.CUE as Record<string, number | number[]> | undefined;
  const COPY = (T.COPY as Copy[] | undefined) ?? [];
  for (const [k, v] of Object.entries({ FPS, BPM, TOTAL })) if (!(v > 0)) die(`timeline must export a positive number ${k}`);
  if (!ACT || typeof ACT !== 'object') die('timeline must export ACT ({name: {from, dur}})');
  if (!CUE || typeof CUE !== 'object') die('timeline must export CUE ({name: frame})');
  if (!Array.isArray(COPY)) die('COPY must be an array of {id, text, in, resolved, out}');

  const paceName = (val('--pace') ?? (typeof T.PACE_NAME === 'string' ? T.PACE_NAME : 'crisp')) as 'calm' | 'crisp';
  if (!(paceName in BUILTIN)) die(`--pace must be calm or crisp (got ${paceName})`);
  const exported = (T.PACE as Record<string, Partial<Pace>> | undefined)?.[paceName];
  const P: Pace = { ...BUILTIN[paceName], ...(exported ?? {}) };

  const s = FPS / 60; // the 60 fps rules, scaled to this film
  const maxGap = Number(val('--max-gap') ?? Math.round(P.maxGap * s));
  // a hold may rest (still, nothing planted in it); only past 2.5 s with nothing new does the film read frozen
  const maxRest = Math.max(maxGap, Number(val('--max-rest') ?? Math.round(150 * s)));
  const BEAT = (60 / BPM) * FPS;
  const BAR = BEAT * 4;
  const S16 = BEAT / 4;
  const TAIL = T.TAIL !== undefined ? Number(T.TAIL) : 0;
  const bodyEnd = TOTAL - TAIL;

  // The script's lines: entries, build chains joined, replace fragments; never ui strings, names or the end card.
  type Line = { id: string; text: string; n: number; in: number; resolved: number; out: number; ids: string[]; chain?: string; swap?: string | boolean };
  const endDecl = T.END as { from?: number } | undefined;
  const endFrom = endDecl && isNum(endDecl.from) && endDecl.from > 0 ? endDecl.from : Infinity;
  const isCard = (c: Copy) => c.kind === 'name' || (c.out ?? TOTAL) >= bodyEnd || c.resolved >= endFrom;
  const lines: Line[] = [];
  const joined = new Set<string>();
  for (const c of COPY) {
    if (!c || c.kind === 'ui' || !isNum(c.in) || !isNum(c.resolved) || isCard(c)) continue;
    const frags = c.chain ? COPY.filter((x) => x && x.chain === c.chain && isNum(x.in)).sort((a, b) => a.in - b.in) : [c];
    if (c.chain && (frags[0].mode ?? 'build') === 'build') {
      // a build chain is one line, however many fragments build it
      if (joined.has(c.chain)) continue;
      joined.add(c.chain);
      const text = frags.map((x) => String(x.text)).join(' ');
      lines.push({ id: c.chain, text, n: wordsOf(text), in: frags[0].in, resolved: frags[frags.length - 1].resolved, out: Math.max(...frags.map((x) => x.out ?? TOTAL)), ids: frags.map((x) => x.id), chain: c.chain, swap: frags[0].swap });
    } else lines.push({ id: c.id, text: String(c.text), n: wordsOf(c.text), in: c.in, resolved: c.resolved, out: c.out ?? TOTAL, ids: [c.id], chain: c.chain, swap: c.swap });
  }
  const scriptMode = lines.length > 0 && lines.filter((l) => l.n >= SCRIPT.minWords && l.n <= SCRIPT.maxWords).length >= SCRIPT.modeShare * lines.length;
  const maxWords = Number(val('--max-words') ?? (scriptMode ? Math.max(P.maxWords, SCRIPT.words) : P.maxWords));
  const out: Finding[] = [];
  const err = (check: string, message: string) => out.push({ check, severity: 'error', message });
  const warn = (check: string, message: string) => out.push({ check, severity: 'warn', message });

  // Off-grid reasons: `name: value, // offgrid: why` on the declaring line, or export OFFGRID = {name: 'why'}.
  const offgrid = new Map<string, string>();
  for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:.*\/\/.*\boffgrid:\s*(.+)$/gm)) offgrid.set(m[1], m[2].trim());
  for (const [k, v] of Object.entries((T.OFFGRID as Record<string, string>) ?? {})) offgrid.set(k, String(v));
  // Stagger tags for CUE lists: `name: [...], // stagger: list | payoff | word | letter | ui`.
  const staggerTag = new Map<string, string>();
  for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:.*\/\/.*\bstagger:\s*([a-z]+)/gm)) staggerTag.set(m[1], m[2]);

  // --- cues.json (--cues): sound events, reading windows, the primitives' declarations
  const soundEvents: { f: number; kind: string; dur?: number }[] = [];
  const cuesPath = val('--cues');
  let cuesDoc: {
    events?: { f: number; kind?: string; dur?: number }[];
    copy?: { id: string; read?: unknown }[];
    declared?: { fx?: Declares[] };
    motion?: { from: number; to: number }[];
  } | null = null;
  if (cuesPath) {
    if (!existsSync(cuesPath)) die(`--cues ${cuesPath} not found (run npx tsx scripts/export-cues.ts)`);
    cuesDoc = JSON.parse(readFileSync(cuesPath, 'utf8'));
    for (const e of cuesDoc!.events ?? []) if (Number.isFinite(e.f)) soundEvents.push({ f: e.f, kind: String(e.kind ?? ''), dur: isNum(e.dur) ? e.dur : undefined });
  }

  // --- music mode: src/music.ts carries a licensed track's grid, every number a film frame
  const MUSIC = T.MUSIC && typeof T.MUSIC === 'object' ? (T.MUSIC as Music) : null;
  const leadArg = (val('--lead') ?? '-3,1').split(',').map(Number);
  if (leadArg.length !== 2 || !leadArg.every(Number.isFinite) || leadArg[0] > leadArg[1]) die(`--lead must be min,max in frames, e.g. -3,1 (got ${val('--lead')})`);
  const [leadMin, leadMax] = leadArg;
  const mBeat = MUSIC && isNum(MUSIC.beatS) && isNum(MUSIC.fps) ? MUSIC.beatS * MUSIC.fps : MUSIC && MUSIC.bpm > 0 ? (60 / MUSIC.bpm) * FPS : BEAT;
  const mDown: number[] = MUSIC && Array.isArray(MUSIC.downbeats) ? MUSIC.downbeats.filter(isNum) : [];
  /** src/music.ts bar(): film frame of a position `pos` beats after bar 1's downbeat. */
  const musicAt = (pos: number) => {
    const d = mDown;
    const i = Math.floor(pos / 4);
    if (i >= 0 && i + 1 < d.length) return d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i]);
    if (d.length && i >= d.length - 1) return d[d.length - 1] + (pos - 4 * (d.length - 1)) * mBeat;
    return (d.length ? d[0] : (MUSIC?.t0 ?? 0)) + pos * mBeat;
  };
  // the music's 16ths and bar lines over the film (a pickup before bar 1 included)
  const grid16: number[] = [];
  const barLines: number[] = [];
  if (MUSIC && mBeat > 0) {
    for (let pos = -16; ; pos += 0.25) {
      const f = musicAt(pos);
      if (f > TOTAL + mBeat) break;
      if (f >= -mBeat) grid16.push(f);
      if (Math.abs(pos / 4 - Math.round(pos / 4)) < 1e-9 && f >= 0 && f <= TOTAL) barLines.push(f);
      if (grid16.length > 200000) break; // a runaway grid (a broken MUSIC): the checks below say why
    }
  }
  const nearest = (list: number[], f: number) => list.reduce((best, x) => (Math.abs(x - f) < Math.abs(best - f) ? x : best), Infinity);
  /** audio/score.json stopdowns.add as film-frame spans ending on their time (plan.py builds them): a depth 'stop'
   *  lasts stop_len (0.2-0.7 s, default 0.4), a dip about 0.4 s. Times as score.py reads them: a frame, "@cue",
   *  "@cue+6" or "bar:beat:16th" on the music grid. */
  const scoreStopdowns = (): Span[] => {
    const dir = dirname(tlPath);
    const p = [join(dir, '..', 'audio', 'score.json'), join(dir, 'audio', 'score.json')].find((x) => existsSync(x));
    let sd: { add?: unknown[]; stop_len?: number } | undefined;
    try {
      sd = p ? JSON.parse(readFileSync(p, 'utf8'))?.stopdowns : undefined;
    } catch {
      return [];
    }
    if (!sd || !Array.isArray(sd.add)) return [];
    const stopLen = Math.min(0.7, Math.max(0.2, isNum(sd.stop_len) ? sd.stop_len : 0.4));
    const frameOf = (x: unknown): number | undefined => {
      if (isNum(x)) return x;
      const s = String(x).trim();
      let m = s.match(/^@([A-Za-z_]\w*)\s*([+-]\s*\d+(?:\.\d+)?)?$/);
      if (m) {
        const c = CUE?.[m[1]] ?? (m[1] === 'reveal' && isNum(T.REVEAL) ? T.REVEAL : undefined); // "@reveal" reads the timeline's REVEAL
        const f = Array.isArray(c) ? c[0] : c;
        return isNum(f) ? f + Number((m[2] ?? '0').replace(/\s/g, '')) : undefined;
      }
      m = s.match(/^(\d+)(?::(\d+(?:\.\d+)?))?(?::(\d+(?:\.\d+)?))?$/);
      return m ? musicAt((Number(m[1]) - 1) * 4 + Number(m[2] ?? 0) + Number(m[3] ?? 0) / 4) : undefined;
    };
    const out: Span[] = [];
    for (const a of sd.add) {
      const obj = a && typeof a === 'object' ? (a as { at?: unknown; depth?: string }) : null;
      const f = frameOf(obj ? obj.at : a);
      if (isNum(f)) out.push({ from: f - (obj?.depth === 'stop' ? stopLen : 0.4) * FPS, to: f, label: 'score.json stop-down' });
    }
    return out;
  };
  /** The stop-downs plan.py placed (out/qa/sfx_plan.json: the kit's own and score.json's), as film-frame spans. */
  const planStopdowns = (): Span[] => {
    const dir = dirname(tlPath);
    const p = [join(dir, '..', 'out', 'qa', 'sfx_plan.json'), join(dir, 'out', 'qa', 'sfx_plan.json')].find((x) => existsSync(x));
    try {
      const rows = p ? JSON.parse(readFileSync(p, 'utf8'))?.stopdowns : undefined;
      if (!Array.isArray(rows)) return [];
      return rows.filter((r) => r && ['added', 'arrangement'].includes(r.status) && isNum(r.from) && isNum(r.t))
        .map((r) => ({ from: r.from * FPS, to: r.t * FPS, label: 'sfx_plan.json stop-down' }));
    } catch {
      return [];
    }
  };
  // Sound onsets a cut or a cue can land on: the track's accents, entries, measured downbeats, stop
  // ends and ending; the designed effects (--cues); an analysed onset list (--onsets).
  const onsets: number[] = [];
  if (MUSIC) {
    for (const a of MUSIC.accents ?? []) if (a && isNum(a.f)) onsets.push(a.f);
    for (const e of MUSIC.entries ?? []) if (isNum(e)) onsets.push(e);
    for (const sp of MUSIC.stops ?? []) if (sp && isNum(sp.to)) onsets.push(sp.to);
    if (MUSIC.end && isNum(MUSIC.end.f)) onsets.push(MUSIC.end.f);
    onsets.push(...mDown);
  }
  for (const e of soundEvents) onsets.push(e.f);
  const onsetsPath = val('--onsets');
  if (onsetsPath) {
    if (!existsSync(onsetsPath)) die(`--onsets ${onsetsPath} not found`);
    const o = JSON.parse(readFileSync(onsetsPath, 'utf8'));
    const frames = Array.isArray(o) ? o : Array.isArray(o.frames) ? o.frames : Array.isArray(o.seconds) ? o.seconds.map((x: number) => x * FPS) : null;
    if (!frames || !frames.every(isNum)) die(`--onsets ${onsetsPath}: want a JSON array of frames, {"frames": [...]} or {"seconds": [...]}`);
    onsets.push(...(frames as number[]));
  }
  onsets.sort((a, b) => a - b);
  /** picture minus sound for the nearest onset (frames), or null without onsets */
  const toOnset = (f: number) => (onsets.length ? f - nearest(onsets, f) : null);
  const inLead = (f: number) => {
    // any onset whose (picture - sound) falls inside the lead window
    for (const o of onsets) if (f - o >= leadMin - 1e-9 && f - o <= leadMax + 1e-9) return true;
    return false;
  };

  // --- beat (music mode: music-grid)
  if (!MUSIC) {
    if (Math.abs(BEAT - Math.round(BEAT)) > 1e-9) {
      const ok = [];
      for (let b = 60; b <= 200; b++) if (Number.isInteger((60 / b) * FPS)) ok.push(b);
      err('beat-whole', `a beat is ${BEAT.toFixed(3)} f at ${BPM} BPM / ${FPS} fps; use a BPM with whole beats: ${ok.join(', ')}`);
    }
    if (T.BEAT !== undefined && Math.abs(Number(T.BEAT) - BEAT) > 1e-9) err('beat-whole', `exported BEAT ${T.BEAT} != 60/BPM*FPS = ${BEAT}`);
    if (T.BAR !== undefined && Math.abs(Number(T.BAR) - BAR) > 1e-9) err('beat-whole', `exported BAR ${T.BAR} != 4 beats = ${BAR}`);
  } else {
    const M = MUSIC;
    const shape: string[] = [];
    if (!(isNum(M.bpm) && M.bpm > 0)) shape.push('bpm must be a positive number');
    if (!isNum(M.t0)) shape.push('t0 must be a frame');
    if (!(isNum(M.bars) && M.bars > 0)) shape.push('bars must be a positive number');
    if (!Array.isArray(M.downbeats) || !M.downbeats.every(isNum) || M.downbeats.some((f, i, a) => i > 0 && f <= a[i - 1])) shape.push('downbeats must be increasing film frames');
    for (const x of shape) err('music-grid', `MUSIC.${x} (src/music.ts is written by track.py grid)`);
    if (M.fps !== FPS) err('music-grid', `MUSIC.fps is ${M.fps} but the film runs at ${FPS} fps: rerun track.py grid at this fps`);
    if (isNum(M.bpm) && Math.abs(BPM - M.bpm) > 1e-9) err('music-grid', `BPM is ${BPM} but the track's is ${M.bpm}: write BPM = MUSIC?.bpm ?? <grid tempo>`);
    if (Array.isArray(M.downbeats) && M.downbeats.length && isNum(M.t0) && Math.abs(M.downbeats[0] - M.t0) > 1e-6)
      err('music-grid', `MUSIC.downbeats[0] (${M.downbeats[0]}) must be t0 (${M.t0}): the first downbeat is bar 1`);
    if (typeof T.b === 'function' && isNum(M.t0)) {
      const b1 = (T.b as (n: number) => number)(1);
      if (b1 !== Math.round(M.t0)) err('music-grid', `b(1) is ${b1} but bar 1's downbeat is f${M.t0.toFixed(2)}: b() must follow the music (Math.round(bar(...)))`);
    }
    if (!shape.length) {
      const endF = musicAt(4 * M.bars);
      if (Math.abs(bodyEnd - endF) > 0.5 + 1e-9)
        err('music-grid', `the body (TOTAL - TAIL = ${bodyEnd} f) should end on the downbeat after bar ${M.bars} (f${endF.toFixed(2)}), ${(bodyEnd - endF).toFixed(2)} f off: rerun track.py grid after changing the edit or TOTAL`);
    }
    if (T.BEAT !== undefined && Math.abs(Number(T.BEAT) - BEAT) > 1e-9) err('music-grid', `exported BEAT ${T.BEAT} != 60/BPM*FPS = ${BEAT}`);
  }

  // --- acts
  const acts = Object.entries(ACT!).sort((a, b) => a[1].from - b[1].from);
  // a spine film's act changes carried by the element (SPINE_PLAN changes that are no cut): such a change may land on
  // the music's 8th when the scenes' house lengths (1.5-3 s, a line read in 1.2 s) leave no downbeat in reach
  const carriedAt = new Set<number>(
    ((T.SPINE_PLAN as { changes?: { at?: number; kind?: string }[] } | undefined)?.changes ?? []).filter((c) => isNum(c.at) && c.kind && c.kind !== 'cut' && c.kind !== 'entry').map((c) => c.at as number),
  );
  let at = 0;
  for (const [name, a] of acts) {
    if (!(a.dur > 0)) err('acts', `ACT.${name} has dur ${a.dur}`);
    if (a.from !== at)
      err('acts', at === 0 && MUSIC && isNum(MUSIC.t0) && Math.abs(a.from - MUSIC.t0) <= 1
        ? `ACT.${name} starts on the track's first downbeat (f${a.from}), expected 0: the first act starts on frame 0 and only its cues wait for b(1) (from = i === 0 ? 0 : bt(...))`
        : `ACT.${name} starts at ${a.from}, expected ${at} (${a.from > at ? 'gap' : 'overlap'} of ${Math.abs(a.from - at)} f)`);
    const off = Math.abs(a.from - Math.round(a.from / BAR) * BAR);
    const off8 = Math.abs(a.from - Math.round(a.from / (BAR / 8)) * (BAR / 8));
    if (!MUSIC && off > 0.5 && !offgrid.has(name) && !(carriedAt.has(a.from) && off8 <= 0.5)) warn('acts-on-bar', `ACT.${name} starts at ${a.from}, ${off.toFixed(1)} f off a bar line`);
    at = a.from + a.dur;
  }
  if (acts.length && at !== TOTAL) err('acts', `acts end at ${at} but TOTAL is ${TOTAL}`);

  // --- cues
  const cueFrames: { name: string; f: number }[] = [];
  for (const [name, v] of Object.entries(CUE!)) {
    const list = Array.isArray(v) ? v : [v];
    list.forEach((f, i) => {
      const label = Array.isArray(v) ? `${name}[${i}]` : name;
      if (typeof f !== 'number' || !Number.isFinite(f)) return err('cue-grid', `CUE.${label} is not a frame number (${f})`);
      if (!Number.isInteger(f)) err('cue-grid', `CUE.${label} = ${f} is fractional; cues are whole frames`);
      if (f < 0 || f >= TOTAL) err('cue-grid', `CUE.${label} = ${f} is outside the film [0, ${TOTAL})`);
      if (MUSIC) {
        // music mode: on a sound (lead window) or, as the fallback, on a music 16th
        const off = Math.abs(f - nearest(grid16, f));
        if (off > 0.5 + 1e-9 && !inLead(f) && !offgrid.has(name))
          err('cue-grid', `CUE.${label} = ${f} is ${Number.isFinite(off) ? off.toFixed(2) : '?'} f off the music's 16ths and on no sound (an accent, entry, downbeat, stop end or designed effect, picture ${leadMin}..+${leadMax} f from it): move it onto the accent it belongs to, snap it with b(), or add "// offgrid: <reason>"`);
      } else {
        const off = Math.abs(f - Math.round(f / S16) * S16);
        if (off > 0.5 + 1e-9 && !offgrid.has(name) && !(onsets.length && inLead(f)))
          err('cue-grid', `CUE.${label} = ${f} is ${off.toFixed(2)} f off the 16th grid (${S16} f); snap it with b() or add "// offgrid: <reason>"`);
      }
      cueFrames.push({ name: label, f });
    });
  }
  const baseName = (label: string) => label.replace(/\[\d+\]$/, '');
  const SAL = (T.SALIENCE && typeof T.SALIENCE === 'object' ? T.SALIENCE : {}) as Record<string, string>;
  const salienceOf = (label: string): Salience => (SALIENCES.includes(SAL[baseName(label)]) ? (SAL[baseName(label)] as Salience) : 'hit');

  // --- copy: one entry at a time
  let words = 0;
  let uiWords = 0;
  const holdNeed = (n: number) => Math.round(Math.max(P.holdMin, P.holdBase + P.holdPerWord * n) * s);
  const fragErr = paceName === 'calm' ? P.maxNewWords + 2 : 10;
  const valid: (Copy & { out: number; n: number; nNew: number; ui: boolean })[] = [];
  // a declared swap that keeps the line's start brings only its changed words: "for students" -> "for staff" is one
  // new word (the line it takes the place of: swap: '<id>', or the latest film line before it for swap: true)
  const swapNew = (c: Copy, n: number) => {
    if (!c.swap) return n;
    const film0 = COPY.filter((x) => x.kind !== 'ui' && x !== c);
    const prev = typeof c.swap === 'string' ? film0.find((x) => x.id === c.swap || x.chain === c.swap) : film0.filter((x) => x.in <= c.in).sort((a, b) => b.in - a.in)[0];
    if (!prev) return n;
    const a = String(prev.text).toLowerCase().split(/\s+/).filter(Boolean);
    const b = String(c.text).toLowerCase().split(/\s+/).filter(Boolean);
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    return Math.max(1, n - k);
  };
  for (const c of COPY) {
    const id = c.id ?? '?';
    const n = wordsOf(c.text);
    const nNew = swapNew(c, n);
    const ui = c.kind === 'ui'; // product strings: a typed command, code, a URL, an app label
    if (ui) uiWords += n;
    else words += nNew;
    const o = c.out ?? TOTAL;
    if (![c.in, c.resolved, o].every(Number.isFinite)) {
      err('copy', `COPY ${id}: in/resolved/out must be frames`);
      continue;
    }
    if (!(c.in <= c.resolved && c.resolved <= o)) err('copy', `COPY ${id}: needs in <= resolved <= out (got ${c.in}, ${c.resolved}, ${o}); unresolved text never exits`);
    if (c.in < 0 || o > TOTAL) err('copy', `COPY ${id}: [${c.in}, ${o}] is outside the film [0, ${TOTAL}]`);
    valid.push({ ...c, out: o, n, nNew, ui });
    // a line alone (place 'alone', arriving whole or in 2-3 chunks) is read from its first chunk; any other from resolved
    const alone = c.place === 'alone';
    const hold = alone ? o - c.in : o - c.resolved;
    if (hold < holdNeed(n) && ui) warn('text-hold', `COPY ${id} (ui) "${c.text}" holds ${hold} f resolved; ${n} word(s) want >= ${holdNeed(n)} f if it must be read`);
    else if (hold < holdNeed(n)) err('text-hold', `COPY ${id} "${c.text}" holds ${hold} f ${alone ? 'from its first chunk' : 'resolved'}; ${n} word(s) need >= ${holdNeed(n)} f`);
    // type that reads: a line alone big (a cap of 6 % of the frame or more), fast (whole or in 2-3 chunks, read in 1.2 s at
    // most before its scene); any other text that declares its size (a kicker, a fact) 3 % at least
    if (alone && !ui) {
      if (isNum(c.cap) && c.cap < LONE.cap - 1e-9)
        err('lone-line', `COPY ${id} "${c.text}" is a line alone at a cap of ${(100 * c.cap).toFixed(1)} % of the frame: a line alone on its ground sets at ${LONE.cap * 100} % or more (house 9 %, the hero bigger; a long line takes two rows), never a small line in a wide empty frame`);
      if (isNum(c.chunks) && c.chunks > LONE.chunks)
        err('lone-line', `COPY ${id} "${c.text}" arrives in ${c.chunks} parts: a line alone arrives whole or in ${LONE.chunks} chunks at most, never typed word by word`);
      if (o - c.in > LONE.read * FPS + 1)
        err('lone-line', `COPY ${id} "${c.text}" is on screen ${((o - c.in) / FPS).toFixed(2)} s before it leaves: a line alone is read in ${LONE.read} s at most, then its scene shows the point`);
    } else if (!ui && isNum(c.cap) && c.cap < LONE.small - 1e-9)
      err('type-size', `COPY ${id} "${c.text}" sets at a cap of ${(100 * c.cap).toFixed(1)} % of the frame: text a viewer must read (a kicker, the fact under the lockup) sets at ${LONE.small * 100} % or more, or is left out`);
    if (ui) continue; // UI strings keep the product's own layout
    if (!c.chain) {
      // a line that is not a chain: the script rule holds it to 2-7 words
    } else if (n > fragErr) err('fragment', `COPY ${id} "${c.text}" shows ${n} words at once; a thought longer than ${P.maxNewWords} words arrives as a chain of fragments (timeline.ts chain())`);
    else if (n > P.maxNewWords) warn('fragment', `COPY ${id} "${c.text}" has ${n} words; a fragment holds 1-${P.maxNewWords} (split it into a chain)`);
    const lines = String(c.text).split('\n');
    if (lines.length > 2) warn('copy-lines', `COPY ${id}: ${lines.length} lines on screen at once (keep <= 2)`);
    const rate = (c.resolved - c.in) / Math.max(1, nNew - 1);
    if (nNew >= 3 && rate < 8 * s && c.reveal !== 'focus' && !(c.place === 'alone' && isNum(c.chunks) && c.chunks <= LONE.chunks)) warn('reveal-rate', `COPY ${id} "${c.text}" reveals ${nNew} ${nNew < n ? 'new ' : ''}words in ${c.resolved - c.in} f (${rate.toFixed(1)} f per word < ${8 * s}): a block, not a read; stagger the words or split the line`);
  }
  // --- script: every line one short sentence (2-7 words); one clean line on screen at a time
  for (const l of lines) {
    if (l.n > SCRIPT.maxWords) err('script', `line ${l.id} "${l.text}" has ${l.n} words; a line holds ${SCRIPT.minWords}-${SCRIPT.maxWords}: say it in two sentences, each its own line`);
    else if (l.n === 1) warn('script', `line ${l.id} "${l.text}" is a single keyword: write a sentence that says what the product does (${SCRIPT.minWords}-${SCRIPT.maxWords} words, with a verb)`);
    else if (l.n < SCRIPT.minWords) warn('script', `line ${l.id} "${l.text}" has ${l.n} words: a label, not a sentence; a line holds ${SCRIPT.minWords}-${SCRIPT.maxWords} words that say something`);
    if (l.ids.length === 1 && /\n/.test(l.text)) warn('script', `line ${l.id} "${l.text.replace(/\n/g, ' / ')}" is set on ${l.text.split('\n').length} lines: one clean line, sized to fit (copy-and-type.md, the script)`);
  }
  const shortLines = lines.filter((l) => l.n < SCRIPT.minWords);
  if (lines.length >= 3 && shortLines.length > lines.length / 2)
    warn('script', `${shortLines.length} of ${lines.length} lines are under ${SCRIPT.minWords} words: a pile of keywords, not a script. Write short sentences: what the product is, then one thing it does a line, then the name and what to do`);
  const lineOrder = [...lines].sort((a, b) => a.in - b.in);
  for (let i = 0; i < lineOrder.length; i++)
    for (let j = i + 1; j < lineOrder.length; j++) {
      const [a, b] = [lineOrder[i], lineOrder[j]];
      if (a.chain && a.chain === b.chain) continue; // a chain's own fragments: chain-gap times them
      if (b.in >= a.out) continue; // a starts to leave before b arrives: a clean handover, or a swap in motion
      if (b.in < a.resolved + holdNeed(a.n)) continue; // before a's read: read-first reports it
      if (b.swap === true || (typeof b.swap === 'string' && (b.swap === a.id || a.ids.includes(b.swap)))) continue;
      err('script', `lines ${a.id} "${a.text}" and ${b.id} "${b.text}" are on screen together (f${b.in}-f${Math.min(a.out, b.out)}): one clean line at a time. Let ${a.id} leave before ${b.id} arrives, or mark ${b.id} swap: '${a.id}' when it takes ${a.id}'s place in one move (an erode, a redaction, a wheel, a make-room)`);
    }
  // --- the wording: copy-check.py reads every entry the way a stranger does (vague words, metaphors, slogans, no
  // verb, two claims, no name, nothing that says what the product is by 3 s); its errors are script errors
  if (!has('--no-copy') && COPY.length) {
    const doc = { fps: FPS, total: bodyEnd, ...(Number.isFinite(endFrom) ? { end: endFrom } : {}), copy: COPY, ...((T.LOOK as { filmType?: string } | undefined)?.filmType === 'update' ? { format: 'update' } : {}) };
    const script = fileURLToPath(new URL('./copy-check.py', import.meta.url));
    const py = existsSync(script) ? findPython({ numpy: false }) : null;
    let rep: { findings?: { rule: string; severity: string; line?: number | null; text?: string | null; message: string }[] } | null = null;
    if (py) {
      const [exe, ...pre] = py;
      const r = spawnSync(exe, [...pre, script, '--stdin', '--json'], { input: JSON.stringify(doc), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } });
      if (!r.error && (r.status === 0 || r.status === 1)) try { rep = JSON.parse(r.stdout); } catch { rep = null; }
    }
    if (!rep) warn('script', `copy-check.py did not run (${py ? `${py.join(' ')} failed` : 'no Python 3.10+ found'}: set PYTHON), so the wording was not checked`);
    // grid-check measures length, keywords and lines on screen together itself, on its own frames
    for (const f of rep?.findings ?? []) {
      if (['long', 'keyword', 'together'].includes(f.rule)) continue;
      (f.severity === 'error' ? err : warn)('script', `copy-check ${f.rule}${f.text ? ` "${f.text}"` : ''}: ${f.message}`);
    }
  }
  if (words > maxWords) err('word-total', `${words} on-screen words; the budget is ${maxWords} (--max-words). Typed commands, code, URLs and app labels belong in COPY with kind: 'ui' and are not budgeted`);

  // --- reading windows: the timeline's READ, else the cues.json copy block's `read`, else the same rule here
  const fromCues = (() => {
    const p = val('--cues');
    if (!p || !existsSync(p)) return null;
    const w: Windows = {};
    for (const c of JSON.parse(readFileSync(p, 'utf8')).copy ?? []) if (isWindows({ x: c.read })) w[String(c.id)] = c.read;
    return Object.keys(w).length ? w : null;
  })();
  const READ: Windows = isWindows(T.READ) ? (T.READ as Windows) : (fromCues ?? readingWindows(valid, P, FPS, TOTAL));

  // --- chains: fragments of one thought
  const chains = new Map<string, typeof valid>();
  for (const c of valid) if (c.chain) chains.set(c.chain, [...(chains.get(c.chain) ?? []), c]);
  const exitF = Math.round(P.exitDur * s); // a leaving entry is seen until its exit is over
  const calm = paceName === 'calm';
  const sev = (check: string, message: string) => (calm ? err : warn)(check, message);
  for (const [name, list] of chains) {
    list.sort((a, b) => a.in - b.in);
    const modes = new Set(list.map((c) => c.mode ?? 'build'));
    if (modes.size > 1) err('chain-gap', `chain ${name} mixes modes (${[...modes].join(', ')}); a chain either builds one line or replaces in place`);
    const mode = list[0].mode ?? 'build';
    if (mode === 'build') {
      const outs = new Set(list.map((c) => c.out));
      if (outs.size > 1) err('chain-gap', `build chain ${name} leaves at ${[...outs].join(', ')}; a built line clears as a whole (one out for every fragment)`);
      const last = list[list.length - 1];
      const total = list.reduce((n, c) => n + c.n, 0);
      if (list.length > 1 && last.out - last.resolved < holdNeed(total))
        err('text-hold', `build chain ${name} holds ${last.out - last.resolved} f after its last fragment; its ${total} words need >= ${holdNeed(total)} f`);
    }
    for (let i = 1; i < list.length; i++) {
      const [a, b] = [list[i - 1], list[i]];
      const read = a.resolved + holdNeed(a.n);
      const gap = b.in - read;
      if (gap < 0) err('chain-gap', `${b.id} arrives at f${b.in}, ${-gap} f before ${a.id} has been read (resolved f${a.resolved} + ${holdNeed(a.n)} f)`);
      else if (gap < Math.round(P.gapMin * s)) sev('chain-gap', `${a.id} -> ${b.id}: ${gap} f of picture between the read and the next fragment; give the picture its beat (${Math.round(P.gapMin * s)}-${Math.round(P.gapMax * s)} f)`);
      else if (gap > Math.round(P.gapMax * s)) warn('chain-gap', `${a.id} -> ${b.id}: ${gap} f between the read and the next fragment; past ${Math.round(P.gapMax * s)} f the thought breaks in two`);
      if (gap >= Math.round(P.gapMin * s)) {
        // the picture beat must be something the picture does: a cue, or a sound that is not a text sound
        const beat = cueFrames.some((c) => c.f >= read && c.f < b.in) || soundEvents.some((e) => e.kind !== 'text' && e.f >= read && e.f < b.in);
        if (!beat)
          sev('chain-beat', `${a.id} -> ${b.id}: nothing happens between the read (f${read}) and the next fragment (f${b.in}): no CUE${cuesPath ? ' and no sound other than text' : ''} there. The picture takes its turn between fragments (the product does what the fragment set up): give it a cue`);
      }
      const clear = Math.round((P.exitDur + 6) * s);
      if (mode === 'replace' && b.in < a.out + clear)
        err('chain-gap', `replace chain ${name}: ${b.id} arrives at f${b.in} while ${a.id} is still leaving (out f${a.out} + a ${exitF} f exit); start it >= ${clear} f after ${a.id}'s out, so its exit is over first`);
    }
  }

  // --- separate entries that arrive together (not one chain): the earlier one is read first
  const film = valid.filter((c) => !c.ui);
  const byIn = [...film].sort((a, b) => a.in - b.in);
  for (let i = 0; i < byIn.length; i++)
    for (let j = i + 1; j < byIn.length; j++) {
      const [a, b] = [byIn[i], byIn[j]];
      if (a.chain && a.chain === b.chain) continue; // chain-gap checks a chain's own fragments
      if (b.in >= a.out) continue; // a has left before b arrives
      const read = a.resolved + holdNeed(a.n);
      if (b.in < read)
        sev('read-first', `${b.id} "${b.text}" arrives at f${b.in} while ${a.id} "${a.text}" is on screen and not yet read (resolved f${a.resolved} + ${holdNeed(a.n)} f): two lines at once read as one sentence dumped. Write them as one chain() so they take turns, or bring ${b.id} in after f${read}`);
    }

  // --- what is on screen, frame by frame (film copy; ui counted apart)
  let maxVisible = 0;
  let worst: { f: number; ids: string[]; n: number; limit: number } | null = null;
  let textFrames = 0;
  let maxBoth = 0;
  const free: boolean[] = [];
  // a line a later swap takes the place of (swap: '<id>' or true) leaves in that one move: it counts until 4 f@60 into
  // the swap, not to the end of an exit it never plays, and while both show the swap adds only its new words
  const swapEnd = new Map<string, number>();
  for (const b of film) {
    if (!b.swap) continue;
    const prev = typeof b.swap === 'string' ? film.find((x) => x.id === b.swap || x.chain === b.swap) : film.filter((x) => x !== b && x.in <= b.in).sort((p, q) => q.in - p.in)[0];
    if (prev) swapEnd.set(prev.id, Math.min(swapEnd.get(prev.id) ?? Infinity, b.in + Math.round(4 * s)));
  }
  for (let f = 0; f < TOTAL; f++) {
    const on = film.filter((c) => c.in <= f && f < c.out); // on screen until its exit begins (text-share)
    const seen = film.filter((c) => c.in <= f && f < Math.min(c.out + exitF, swapEnd.get(c.id) ?? Infinity)); // ... and until its exit is over (concurrency)
    const n = seen.reduce((m, c) => m + (c.swap && seen.some((x) => x !== c && swapEnd.has(x.id)) ? c.nNew : c.n), 0);
    const both = n + valid.filter((c) => c.ui && c.in <= f && f < c.out + exitF).reduce((m, c) => m + c.n, 0);
    const limit = seen.length && seen.every((c) => c.mode === 'replace') ? P.maxVisibleReplace : P.maxVisibleBuild;
    maxVisible = Math.max(maxVisible, n);
    maxBoth = Math.max(maxBoth, both);
    if (n > limit && (!worst || n - limit > worst.n - worst.limit)) worst = { f, ids: seen.map((c) => c.id), n, limit };
    if (f < bodyEnd) {
      if (on.length) textFrames++;
      free.push(!on.length);
    }
  }
  if (worst) err('copy-concurrent', `${worst.n} film words on screen at f${worst.f} (${worst.ids.join(', ')}); at most ${worst.limit} at once: one fragment at a time`);
  if (maxBoth > 14) warn('copy-concurrent', `up to ${maxBoth} words (film copy and ui) readable at once; past 14 the frame reads as a page`);

  // --- copy rate and text share
  const win5 = Math.round(5 * FPS);
  const resolves = film.map((c) => ({ f: c.resolved, n: c.nNew })).sort((a, b) => a.f - b.f); // a swap counts its new words
  let peak = { n: 0, f: 0 };
  for (const r of resolves) {
    const n = resolves.filter((x) => x.f >= r.f && x.f < r.f + win5).reduce((m, x) => m + x.n, 0);
    if (n > peak.n) peak = { n, f: r.f };
  }
  const perSec = scriptMode ? Math.max(P.maxWordsPerSec, SCRIPT.wordsPerSec) : P.maxWordsPerSec; // a script reads faster
  const avgMax = scriptMode ? Math.max(P.avgWordsPerSec, SCRIPT.avgWordsPerSec) : P.avgWordsPerSec;
  const shareMax = scriptMode ? Math.max(P.textShare, SCRIPT.textShare) : P.textShare;
  const maxIn5 = Math.round(5 * perSec);
  if (peak.n > maxIn5) warn('word-rate', `${peak.n} film words resolve in the 5 s from f${peak.f}; keep <= ${maxIn5} (${perSec} w/s): fewer words, or let the picture take the time`);
  const bodySec = bodyEnd / FPS;
  const avg = bodySec > 0 ? words / bodySec : 0;
  if (avg > avgMax) warn('word-rate', `${avg.toFixed(2)} film words per second over the body; keep <= ${avgMax}`);
  const share = bodyEnd > 0 ? textFrames / bodyEnd : 0;
  if (film.length && share > shareMax)
    (calm && share > shareMax + 0.1 ? err : warn)('text-share', `film copy is on screen on ${(100 * share).toFixed(1)}% of the body; keep <= ${Math.round(100 * shareMax)}%: give the picture beats with no copy`);
  // the longest text-free run inside every 10 s window of the body (the whole body when shorter)
  const freeNeed = Math.round(P.freeRun * s);
  const win10 = Math.min(bodyEnd, Math.round(10 * FPS));
  const runIn = (a: number, b: number) => {
    let best = 0;
    let cur = 0;
    for (let f = a; f < b; f++) best = Math.max(best, (cur = free[f] ? cur + 1 : 0));
    return best;
  };
  let longestFree = runIn(0, bodyEnd);
  if (film.length && freeNeed > 0 && win10 > 0) {
    for (let a = 0; a + win10 <= bodyEnd; a += Math.max(1, Math.round(FPS / 2))) {
      const run = runIn(a, a + win10);
      if (run < freeNeed) {
        warn('text-share', `no text-free stretch of ${freeNeed} f between f${a} and f${a + win10} (longest ${run} f): every 10 s needs a picture beat with no copy`);
        break;
      }
    }
  }

  // --- event gaps (the tail is for the audio to decay, so it is excluded)
  const events = new Set<number>([0, bodyEnd]);
  // One designed near-still hold per film (the key claim, under a music dropout) may run past the gap limit.
  const HOLD = T.HOLD as { from: number; to: number } | undefined;
  const holdMax = Math.round(96 * s);
  let hold: { from: number; to: number } | null = null;
  if (HOLD !== undefined) {
    if (!HOLD || !Number.isFinite(HOLD.from) || !Number.isFinite(HOLD.to) || HOLD.to <= HOLD.from) {
      err('hold', 'HOLD must be {from, to} frames with to > from');
    } else if (HOLD.to - HOLD.from > holdMax) {
      err('hold', `HOLD runs ${HOLD.to - HOLD.from} f; a designed hold is at most ${holdMax} f (96 f at 60 fps)`);
    } else {
      hold = HOLD;
      events.add(HOLD.from);
      events.add(HOLD.to);
    }
  }
  for (const c of cueFrames) events.add(c.f);
  for (const [, a] of acts) events.add(a.from);
  for (const c of valid) for (const f of [c.in, c.resolved, c.out]) events.add(f);
  // a line's words arriving through its reveal are events too: a 6-word sentence builds for a second or more
  for (const c of valid) for (let k = 1; k < c.n; k++) events.add(Math.round(c.in + (k * (c.resolved - c.in)) / c.n));
  for (const e of soundEvents) events.add(Math.round(e.f));
  // Reading windows: a resolved line being read is alive, so it fills the gap it sits in.
  const reading = Object.values(READ).flat();
  const uncovered = (a: number, b: number) => {
    // the longest run of frames in (a, b) that no reading window covers
    let best = 0;
    let cur = 0;
    for (let f = a + 1; f < b; f++) best = Math.max(best, (cur = reading.some(([x, y]) => f >= x && f < y) ? 0 : cur + 1));
    return best + 1; // + 1: a run of k uncovered frames between two events spans k + 1 frame steps
  };
  const ev = [...events].filter((f) => f >= 0 && f <= bodyEnd).sort((a, b) => a - b);
  let longestGap = 0;
  for (let i = 1; i < ev.length; i++) {
    const gap = ev[i] - ev[i - 1];
    if (hold && ev[i - 1] >= hold.from && ev[i] <= hold.to) continue; // the declared hold
    const live = gap > maxGap ? uncovered(ev[i - 1], ev[i]) : gap;
    longestGap = Math.max(longestGap, Math.min(gap, live));
    if (gap > maxGap && live > maxGap) {
      const near = cueFrames.filter((c) => c.f === ev[i - 1] || c.f === ev[i]).map((c) => c.name);
      const where = `between f${ev[i - 1]} and f${ev[i]}${near.length ? ` (${near.join(', ')})` : ''}`;
      if (live > maxRest) err('event-gap', `${live} f without an event or a line being read ${where}: past ${maxRest} f the film reads frozen; give the stretch its next beat (the product acting, a line, a cut), or --max-rest`);
      else warn('event-gap', `${live} f without an event or a line being read ${where}: a hold may rest still (no planted tick, no drift); make sure it is a hold you meant (a read, the product's result, the lockup)`);
    }
  }

  // --- read-quiet: nothing new that asks for the eye starts while a fragment is read (calm). Only
  // copy, hit and cut CUEs are guarded; life and moves away from the text keep the picture alive.
  if (calm) {
    const textFrames = new Set(valid.flatMap((c) => [c.in, c.resolved, c.out]));
    const loud = new Set<string>();
    for (const c of valid) {
      if (c.ui) continue;
      for (const [a, b] of READ[String(c.id)] ?? [])
        for (const q of cueFrames) {
          const sal = salienceOf(q.name);
          if (sal === 'life' || sal === 'move') continue;
          if (q.f >= a && q.f < b && q.f < bodyEnd && !textFrames.has(q.f) && !loud.has(q.name)) {
            loud.add(q.name);
            warn('read-quiet', `CUE.${q.name} (f${q.f}, ${sal}) starts while ${c.id} "${c.text}" is being read (f${a}-${b}): nothing that asks for the eye starts during a reading hold; move it after the read, where the picture takes its turn (life and camera moves away from the text may run: SALIENCE 'life' | 'move')`);
          }
        }
    }
  }

  // ---- declarations: what the picture does on purpose (all optional; absent = the 1.1 checks only)
  const DECL_KEYS = ['LOOK', 'SEAMS', 'STEPPED', 'FLASHES', 'CAMERA_BLUR', 'END', 'REVEAL', 'SPRING_CLASS', 'STRUCTURAL', 'SALIENCE'];
  const declared = DECL_KEYS.some((k) => T[k] !== undefined) || !!MUSIC;
  const arr = <X>(k: string): X[] => {
    const v = T[k];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      err('declarations', `${k} must be an array`);
      return [];
    }
    return v as X[];
  };
  const LOOK = (T.LOOK && typeof T.LOOK === 'object' ? T.LOOK : {}) as { blur?: string; texture?: string; filmType?: string; oneTake?: boolean; whiteWorld?: boolean };
  const filmType = String(LOOK.filmType ?? 'launch');
  const SEAMS = arr<Seam>('SEAMS').filter((x, i) => {
    if (!x || !isNum(x.at)) return (err('declarations', `SEAMS[${i}]: at must be a frame`), false);
    return true;
  });
  const STEPPED = arr<Range>('STEPPED');
  const FLASHES = arr<FlashDecl>('FLASHES');
  const CAMERA_BLUR = arr<Range>('CAMERA_BLUR');
  const END0 = T.END as { from?: number; to?: number } | undefined;
  const END = END0 && isNum(END0.from) && isNum(END0.to) && !(END0.from === 0 && END0.to === 0) ? { from: END0.from, to: END0.to } : null;
  const REVEAL = isNum(T.REVEAL) && T.REVEAL > 0 ? (T.REVEAL as number) : null;
  const actStarts = acts.map(([, a]) => a.from).filter((f) => f > 0);
  const crossesAct = (from: number, to: number) => actStarts.find((x) => x > from && x < to);

  // --- beats: a line alone (T), the picture acting (A), a line over a picture (TA), the end, in turn
  const firstLine = film.filter((c) => c.kind !== 'name').reduce((m, c) => Math.min(m, c.in), Infinity);
  const PLAN = T.BEAT_PLAN as { id?: string; kind?: string; from?: number; to?: number; meets?: boolean }[] | undefined;
  if (Array.isArray(PLAN) && PLAN.length) {
    const ok = PLAN.filter((x, i) => {
      const good = x && ['T', 'A', 'TA', 'end'].includes(String(x.kind)) && isNum(x.from) && isNum(x.to) && x.to > x.from;
      if (!good) err('beats', `BEAT_PLAN[${i}] must be {kind: 'T' | 'A' | 'TA' | 'end', from, to} with to > from`);
      return good;
    }) as { id?: string; kind: string; from: number; to: number; meets?: boolean }[];
    const body = ok.filter((x) => x.kind !== 'end');
    const nT = body.filter((x) => x.kind === 'T').length;
    const nTA = body.filter((x) => x.kind === 'TA').length;
    if (body.length) {
      if (nT < 2) err('beats', `${nT} type-only beat${nT === 1 ? '' : 's'}: a line alone on a clean ground at least twice a film (T in BEAT_PLAN)`);
      else if (nT < 0.15 * body.length) err('beats', `type-only beats are ${Math.round((100 * nT) / body.length)} % of the shots; keep >= 15 %: a line alone, then the picture`);
      if (nTA > 0.4 * ok.length) err('beats', `${nTA} of ${ok.length} beats set a line over a picture (${Math.round((100 * nTA) / ok.length)} %); keep <= 40 %: give the line its own beat, then the picture`);
      // the text-then-cards loop: a line alone, then its picture, again and again, and no line ever built with its picture
      // (a line whose own device opens into its picture, or that a porthole parts, says so with `meets`: it joins the two)
      let loops = 0;
      for (let i = 1; i < body.length; i++) if (body[i - 1].kind === 'T' && body[i].kind === 'A') loops++;
      const nMeet = body.filter((x) => x.kind === 'T' && x.meets === true).length;
      // an error where the film can fix it in one word (src/launch.ts: a pair's beat), a warning in a template that cannot yet
      const loopSev = existsSync(resolve(dirname(tlPath), 'launch.ts')) ? err : warn;
      if (loops >= 3 && nTA === 0 && nMeet === 0)
        loopSev('beats', `the beats run a line alone, then its picture, ${loops} times and no line meets its picture (T A T A ...): the text-then-cards loop. Let one line arrive with its picture or over it (a pair's beat 'with' or 'over' in src/launch.ts: the picture enters the line, the product rises behind a giant word, an object parts it) and let one picture carry straight into the next`);
    }
    const lineOn = (a: number, z: number) => film.filter((c) => c.kind !== 'name' && c.in < z && (c.out ?? TOTAL) > a);
    for (const x of body) {
      const sec = (x.to - x.from) / FPS;
      const label = `${x.kind} ${x.id ?? ''} f${x.from}-f${x.to}`.replace(/\s+/g, ' ');
      if (x.kind !== 'A' && !lineOn(x.from, x.to).length) err('beats', `${label} is a line beat with no line on screen`);
      if (x.kind === 'A') {
        const over = lineOn(x.from, x.to).reduce((m, c) => m + Math.min(x.to, c.out ?? TOTAL) - Math.max(x.from, c.in), 0);
        if (over > 0.25 * (x.to - x.from)) err('beats', `${label} is a picture beat with a statement on screen for ${Math.round((100 * over) / (x.to - x.from))} % of it: declare it TA (a line over a picture) or give the line its own beat`);
      }
      const beatS = (60 / BPM) * 1;
      if (x.kind === 'T' && (sec < 0.5 - 1e-9 || sec > 2.4 + beatS / 2 + 1e-9)) warn('beats', `${label} holds its line ${sec.toFixed(2)} s; a line alone holds 0.5-2.4 s (about 1.3)`);
      if (x.kind === 'A' && (sec < 1 - 1e-9 || sec > 3.5 + beatS / 2 + 1e-9)) warn('beats', `${label} runs ${sec.toFixed(2)} s; a picture beat runs 1-3.5 s`);
    }
    if (firstLine > FPS) err('beats', `the first line arrives at ${(firstLine / FPS).toFixed(2)} s; it is on screen by 1 s`);
  }

  // --- spec: the length the brief's spec line asks for (`1920x1080@30, 20s, format: launch`), the format's band, the lockup's hold
  {
    const briefPath = resolve(dirname(tlPath), '..', 'BRIEF.md');
    const brief = existsSync(briefPath) ? readFileSync(briefPath, 'utf8') : '';
    const m = brief.match(/\b\d{3,4}\s*x\s*\d{3,4}\s*@\s*\d+(?:\.\d+)?\s*,\s*(\d+(?:\.\d+)?)\s*s\b/i);
    const sec = TOTAL / FPS;
    if (m) {
      const want = Number(m[1]);
      if (sec > want * 1.1 + 0.5) err('spec', `the film runs ${sec.toFixed(1)} s; BRIEF.md's spec line asks for ${want} s (at most 10 % over): cut a beat or shorten the holds, never speed the picture up`);
      else if (sec < want * 0.85 - 0.5) warn('spec', `the film runs ${sec.toFixed(1)} s against BRIEF.md's ${want} s`);
    }
    const fmt = String((T.LOOK as { filmType?: string } | undefined)?.filmType ?? (brief.match(/format:\s*([a-z-]+)/i) || [])[1] ?? '').toLowerCase();
    const BAND: Record<string, [number, number]> = { launch: [15, 45], update: [8, 20] };
    const band = BAND[fmt];
    if (brief && band && (sec < band[0] - 0.5 || sec > band[1] + 0.5)) warn('spec', `${fmt === 'update' ? 'an' : 'a'} ${fmt} film runs ${band[0]}-${band[1]} s; this one runs ${sec.toFixed(1)} s`);
    const lock = CUE && isNum(CUE.lockup) ? (bodyEnd - (CUE.lockup as number)) / FPS : null;
    if (lock !== null && lock > 3.5) warn('spec', `the lockup holds ${lock.toFixed(1)} s from CUE.lockup to the end of the body; the end card holds 2-3 s (the music rings out under it)`);
  }

  // --- the type's devices: one device on every line (the key word last, in the accent, three times) reads as a template
  {
    const lp = resolve(dirname(tlPath), 'launch.ts');
    let pairs: { line?: string }[] = [];
    if (existsSync(lp)) {
      try {
        const L = (await import(pathToFileURL(lp).href)) as { LAUNCH?: { pairs?: { line?: string }[] } };
        pairs = Array.isArray(L.LAUNCH?.pairs) ? L.LAUNCH!.pairs! : [];
      } catch { pairs = []; }
    }
    const said = pairs.map((p) => String(p.line ?? '').trim()).filter(Boolean);
    const last = said.filter((s) => /\*[^*]+\*[.!?,;:]*$/.test(s)).length;
    if (said.length >= 3 && last >= 3 && last === said.filter((s) => s.includes('*')).length)
      warn('type-devices', `${last} lines land their accent on the last word in the same way: one device on every line reads as a template. Vary the lines: one line with no accent, the key word first or alone at giant size, one line built with its picture, one type event (a word pushed apart by an object, a decode, a re-centring build)`);
  }

  if (declared) {
    if (T.LOOK !== undefined) {
      if (!T.LOOK || typeof T.LOOK !== 'object') err('declarations', 'LOOK must be {blur, texture, filmType, oneTake, whiteWorld}');
      else {
        if (LOOK.blur !== undefined && !['crisp', 'camera'].includes(LOOK.blur)) err('declarations', `LOOK.blur must be 'crisp' or 'camera' (got ${LOOK.blur})`);
        if (LOOK.texture !== undefined && !TEXTURES.includes(LOOK.texture)) err('declarations', `LOOK.texture must be one of ${TEXTURES.join(', ')} (got ${LOOK.texture})`);
        if (LOOK.filmType !== undefined && !FILM_TYPES.includes(LOOK.filmType)) err('declarations', `LOOK.filmType must be one of ${FILM_TYPES.join(', ')} (got ${LOOK.filmType})`);
      }
    }
    const seen = new Map<number, string>();
    SEAMS.forEach((x, i) => {
      const id = x.id ?? `SEAMS[${i}]`;
      if (!SEAM_KINDS.includes(x.kind)) err('declarations', `seam ${id}: kind "${x.kind}" is not one of ${SEAM_KINDS.join(', ')}`);
      if (!(x.at > 0 && x.at < TOTAL)) err('declarations', `seam ${id} at f${x.at} is outside the film (0, ${TOTAL})`);
      if (!Number.isInteger(x.at)) err('declarations', `seam ${id} at f${x.at}: seams sit on whole frames`);
      if (seen.has(x.at)) err('declarations', `seams ${seen.get(x.at)} and ${id} are both at f${x.at}: one seam per cut`);
      seen.set(x.at, id);
      if (x.dir !== undefined && x.dir !== 1 && x.dir !== -1) err('declarations', `seam ${id}: dir must be 1 or -1`);
    });
    const rangeCheck = (list: Range[], name: string, extra: (r: Range, id: string) => void) => {
      const ok: Range[] = [];
      list.forEach((r, i) => {
        const id = r?.id ?? `${name}[${i}]`;
        if (!r || !isNum(r.from) || !isNum(r.to)) return err('declarations', `${name} ${id}: from and to must be frames`);
        if (!(r.to > r.from)) return err('declarations', `${name} ${id}: to (f${r.to}) must be after from (f${r.from})`);
        if (r.from < 0 || r.to > TOTAL) return err('declarations', `${name} ${id} [f${r.from}, f${r.to}) is outside the film [0, ${TOTAL}]`);
        const over = ok.find((o) => r.from < o.to && o.from < r.to);
        if (over) err('declarations', `${name} ${id} overlaps ${over.id ?? 'another range'}: one declaration per frame`);
        const x = crossesAct(r.from, r.to);
        if (x !== undefined) warn('declarations', `${name} ${id} [f${r.from}, f${r.to}) crosses the act boundary at f${x}: declare one range per act`);
        extra(r, id);
        ok.push(r);
      });
    };
    rangeCheck(STEPPED, 'STEPPED', (r, id) => {
      if (r.fps !== undefined && ![12, 16, 20, 30].includes(r.fps)) err('declarations', `STEPPED ${id}: fps must be 12, 16, 20 or 30`);
      else if (r.fps !== undefined && r.fps >= FPS) err('declarations', `STEPPED ${id}: a ${r.fps} fps cadence is not a step in a ${FPS} fps film`);
      if (r.on !== undefined && ![2, 3].includes(r.on)) err('declarations', `STEPPED ${id}: on must be 2 or 3`);
      const step = r.on ?? (r.fps ? FPS / r.fps : 2);
      if (r.to - r.from > 1 && r.to - r.from < 2 * step) warn('declarations', `STEPPED ${id} lasts ${r.to - r.from} f, under two steps of ${step.toFixed(2)} f: a step nobody sees is a dropped frame`);
    });
    rangeCheck(CAMERA_BLUR, 'CAMERA_BLUR', (r, id) => {
      if (r.to - r.from > 2 * FPS) warn('declarations', `CAMERA_BLUR ${id} lasts ${((r.to - r.from) / FPS).toFixed(2)} s: a camera-blur moment is a flick or a whip; for a whole camera film set LOOK.blur = 'camera'`);
    });
    const flashAt = new Map<number, string>();
    FLASHES.forEach((x, i) => {
      const id = x?.id ?? `FLASHES[${i}]`;
      if (!x || !isNum(x.f)) return err('declarations', `flash ${id}: f must be a frame`);
      if (x.frames !== 1 && x.frames !== 2) err('declarations', `flash ${id} lasts ${x.frames} frames: a designed flash is 1 or 2 frames (a longer one is a fade or an exposure event)`);
      if (x.f < 0 || x.f + (x.frames || 1) > TOTAL) err('declarations', `flash ${id} at f${x.f} is outside the film`);
      if (flashAt.has(x.f)) err('declarations', `flashes ${flashAt.get(x.f)} and ${id} are both at f${x.f}`);
      flashAt.set(x.f, id);
    });
    if (END0 !== undefined && !END) {
      if (!END0 || !isNum(END0.from) || !isNum(END0.to)) err('declarations', 'END must be {from, to} frames');
    }
    if (END) {
      if (!(END.to > END.from)) err('declarations', `END: to (f${END.to}) must be after from (f${END.from})`);
      if (END.from < 0 || END.to > TOTAL) err('declarations', `END [f${END.from}, f${END.to}) is outside the film [0, ${TOTAL}]`);
    }
    if (T.REVEAL !== undefined && !(isNum(T.REVEAL) && T.REVEAL >= 0 && T.REVEAL < TOTAL)) err('declarations', `REVEAL must be a frame inside the film (got ${T.REVEAL})`);
    if (T.SPRING_CLASS !== undefined && typeof T.SPRING_CLASS !== 'string') err('declarations', 'SPRING_CLASS must be a string');
    if (T.STRUCTURAL !== undefined) {
      if (!Array.isArray(T.STRUCTURAL)) err('declarations', 'STRUCTURAL must be an array of CUE names');
      else for (const n of T.STRUCTURAL as unknown[]) if (!(String(n) in CUE!)) err('declarations', `STRUCTURAL names "${n}", which is not a CUE`);
    }
    if (T.SALIENCE !== undefined) {
      if (!T.SALIENCE || typeof T.SALIENCE !== 'object') err('declarations', 'SALIENCE must be {cueName: salience}');
      else
        for (const [k, v] of Object.entries(T.SALIENCE as Record<string, unknown>)) {
          if (!(k in CUE!)) err('declarations', `SALIENCE names "${k}", which is not a CUE`);
          else if (!SALIENCES.includes(String(v))) err('declarations', `SALIENCE.${k} must be one of ${SALIENCES.join(', ')} (got ${v})`);
        }
    }
  }

  // ---- declares-cover: the primitives' own declarations (cues.json declared.fx) are in the timeline's
  const fxDecl = (cuesDoc?.declared?.fx ?? []) as Declares[];
  if (fxDecl.length) {
    const inside = (r: Range, list: Range[]) => list.some((o) => isNum(o.from) && isNum(o.to) && r.from >= o.from && r.to <= o.to);
    for (const [i, d] of fxDecl.entries()) {
      const who = `fx ${d.id ?? i}`;
      for (const r of d.stepped ?? []) {
        const host = STEPPED.find((o) => r.from >= o.from && r.to <= o.to);
        if (!host) err('declares-cover', `${who} steps [f${r.from}, f${r.to})${r.fps ? ` at ${r.fps} fps` : ''} but no STEPPED range covers it: declare it in the timeline, or the blur sampling and forensics treat the steps as dropped frames`);
        else if ((r.fps && host.fps && r.fps !== host.fps) || (r.on && host.on && r.on !== host.on))
          err('declares-cover', `${who} steps [f${r.from}, f${r.to}) ${r.fps ? `at ${r.fps} fps` : `on ${r.on}s`} inside STEPPED ${host.id ?? ''} declared ${host.fps ? `at ${host.fps} fps` : `on ${host.on}s`}: one cadence per range`);
      }
      for (const x of d.flashes ?? [])
        if (!FLASHES.some((o) => o.f === x.f && (o.frames ?? 1) >= (x.frames ?? 1)))
          err('declares-cover', `${who} flashes at f${x.f} for ${x.frames} frame(s) but FLASHES has no such flash: declare it, or forensics fails it as a pop`);
      for (const r of d.cameraBlur ?? [])
        if (LOOK.blur !== 'camera' && !inside(r, CAMERA_BLUR))
          err('declares-cover', `${who} needs camera blur over [f${r.from}, f${r.to}) but no CAMERA_BLUR range covers it in this crisp film: declare it, or the move renders without its blur`);
      for (const x of d.seams ?? [])
        if (!SEAMS.some((o) => o.at === x.at && o.kind === x.kind))
          err('declares-cover', `${who} makes a ${x.kind} seam at f${x.at} but SEAMS has no ${x.kind} seam there: declare it in the timeline`);
    }
  }

  // ---- cuts: act boundaries, seams and CUEs whose salience is `cut` (inside the body)
  const cutMap = new Map<number, string>();
  for (const [name, a] of acts) if (a.from > 0 && a.from < bodyEnd) cutMap.set(a.from, `ACT.${name}`);
  for (const x of SEAMS) if (x.kind !== 'fadeEnd' && x.at > 0 && x.at < bodyEnd) cutMap.set(x.at, x.id ? `seam ${x.id}` : `${x.kind} seam`);
  for (const q of cueFrames) if (salienceOf(q.name) === 'cut' && q.f > 0 && q.f < bodyEnd && !cutMap.has(q.f)) cutMap.set(q.f, `CUE.${q.name}`);
  const cuts = [...cutMap.keys()].sort((a, b) => a - b);
  const structuralNames = Array.isArray(T.STRUCTURAL) ? (T.STRUCTURAL as unknown[]).map(String) : [];
  const structuralFrames = new Set<number>([...actStarts, ...cueFrames.filter((q) => structuralNames.includes(baseName(q.name))).map((q) => q.f)]);

  // ---- music: structure on the music's events, no metronome editing, a dip before the reveal
  if (MUSIC && mDown.length) {
    const targets = [...mDown, ...(MUSIC.entries ?? []).filter(isNum), ...(MUSIC.stops ?? []).map((x) => x?.to).filter(isNum), ...(MUSIC.breaks ?? []).map((x) => x?.to).filter(isNum)];
    if (MUSIC.end && isNum(MUSIC.end.f)) targets.push(MUSIC.end.f);
    const check = (f: number, what: string) => {
      const n = nearest(targets, f);
      if (Math.abs(f - n) > 1 + 1e-9)
        err('structural-on-music', `${what} at f${f} is ${(f - n).toFixed(2)} f from the nearest music event (f${n.toFixed(2)}): structure lands within 1 f of a downbeat attack, an entry, a stop's end or the ending`);
    };
    const eighths: number[] = [];
    for (let i = 0; i + 1 < mDown.length; i++) for (let k = 0; k < 8; k++) eighths.push(mDown[i] + ((mDown[i + 1] - mDown[i]) * k) / 8);
    for (const [name, a] of acts) if (a.from > 0 && !(carriedAt.has(a.from) && eighths.length && Math.abs(a.from - nearest(eighths, a.from)) <= 1 + 1e-9)) check(a.from, `ACT.${name}`);
    for (const q of cueFrames) if (structuralNames.includes(baseName(q.name))) check(q.f, `CUE.${q.name} (STRUCTURAL)`);
    if (!['reel', 'social'].includes(filmType)) {
      const ordinary = cuts.filter((f) => !structuralFrames.has(f));
      if (ordinary.length >= 3) {
        const onDown = ordinary.filter((f) => Math.abs(f - nearest(mDown.length ? [...mDown, ...barLines] : barLines, f)) <= 1 + 1e-9).length;
        if (onDown / ordinary.length > 0.6)
          warn('anti-metronome', `${onDown} of ${ordinary.length} ordinary cuts (${Math.round((100 * onDown) / ordinary.length)} %) sit on downbeats; keep <= 60 %: cut on the track's accents and designed sounds, skip some downbeats, use the 16th before one (a ${filmType} film is not a grid reel)`);
      }
      if (cuts.length >= 4) {
        const gaps = cuts.slice(1).map((f, i) => f - cuts[i]);
        const c = cv(gaps);
        if (c < 0.25) warn('anti-metronome', `the ${cuts.length} cuts come at near-even intervals (coefficient of variation ${c.toFixed(2)} < 0.25): vary the shot lengths with the music's phrasing, not the bar count`);
      }
    }
    if (REVEAL !== null) {
      const dips: Span[] = [...(MUSIC.stops ?? []), ...(MUSIC.breaks ?? [])].filter((x) => x && isNum(x.from) && isNum(x.to));
      for (const e of soundEvents) if (/^(stop|dip|stopdown)$/i.test(e.kind) && isNum(e.dur)) dips.push({ from: e.f, to: e.f + e.dur });
      dips.push(...scoreStopdowns(), ...planStopdowns());
      const near = dips.filter((x) => Math.abs(x.to - REVEAL) <= 2 + 1e-9);
      const good = near.filter((x) => (x.to - x.from) / FPS >= 0.2 - 1e-9 && (x.to - x.from) / FPS <= 0.5 + 1e-9);
      if (!near.length) warn('reveal-dip', `no stop or dip ends within 2 f of REVEAL (f${REVEAL}): before the biggest reveal, stop the track (or dip it) for 0.2-0.5 s and land the reveal on its return`);
      else if (!good.length) warn('reveal-dip', `the stop before REVEAL lasts ${((near[0].to - near[0].from) / FPS).toFixed(2)} s; 0.2-0.5 s reads as a held breath, longer as a break`);
    }
  }

  // ---- grammar: only for timelines that declare what they do
  const s60 = (f60n: number) => f60n * s; // a 60 fps number at this film's fps
  let shotInfo: { shots: number; median: number; longest: number } | null = null;
  if (declared) {
    // shot-length
    const bounds = [0, ...cuts, bodyEnd];
    const shots = bounds.slice(1).map((f, i) => f - bounds[i]).filter((d) => d > 0);
    const sec = shots.map((d) => d / FPS);
    shotInfo = { shots: shots.length, median: +median(sec).toFixed(3), longest: +Math.max(0, ...sec).toFixed(3) } as typeof shotInfo;
    // scene-length: every scene is a point shown and understood in 1.5-3 s (any film, a template's or one written by
    // hand; a one-take declares its scene changes as seams): none over 3.2 s, the declared lockup (the last shot when
    // CUE.lockup or REVEAL lands in it) at most 2.5 s and gone 2 s after its mark is whole. A film declares its LOOK; a
    // bare fixture of the timing rules does not and is not held to it
    if (T.LOOK !== undefined) {
      // a scene-bank film (SPINE_PLAN: launch-simple, update) or a film written by hand (--template none) fails; a film
      // from another template keeps that template's own scenes and is warned
      let template = '';
      try {
        template = String(JSON.parse(readFileSync(resolve(dirname(tlPath), '..', 'film.json'), 'utf8')).template ?? '');
      } catch {
        /* no film.json: a film made without a template */
      }
      const held = T.SPINE_PLAN != null || ['', 'none', 'null', 'launch-simple', 'update'].includes(template);
      const sceneErr = (msg: string) => (held ? err('scene-length', msg) : warn('scene-length', `${msg} (the ${template} template's own scenes: a warning)`));
      const lockF = CUE && isNum(CUE.lockup) ? (CUE.lockup as number) : REVEAL;
      const segs = bounds.slice(1).map((f, i) => [bounds[i], f] as [number, number]).filter(([a, b]) => b > a);
      segs.forEach(([a, b], i) => {
        const len = (b - a) / FPS;
        const lockup = i === segs.length - 1 && lockF !== null && lockF >= a && lockF <= b;
        if (lockup && len > SCENE_LEN.lockup + 1 / FPS + 1e-9)
          sceneErr(`the lockup runs ${len.toFixed(2)} s (f${a}-f${b}): a lockup lands, lives (a creep, a light) and is gone in 2.5 s at most`);
        else if (!lockup && len > SCENE_LEN.max + 1e-9)
          sceneErr(`the scene f${a}-f${b} runs ${len.toFixed(2)} s: each scene is one point shown in 1.5-3 s (a complex animation is cut into scenes of 1.5-3 s, each handed on; a scene of your own too); declare its changes as seams if it cuts inside`);
      });
      if (lockF !== null && (bodyEnd - lockF) / FPS > SCENE_LEN.lockTail + 1 / FPS + 1e-9)
        sceneErr(`the lockup holds ${((bodyEnd - lockF) / FPS).toFixed(2)} s after its mark is whole (CUE.lockup or REVEAL f${lockF} to the body's end f${bodyEnd}): it ends in ${SCENE_LEN.lockTail} s at most, living (a creep, a light), then the music rings out`);
      // lockup-end: the lockup stays whole and alive to the last frame (1.5-2.2 s from its mark): never a fade to blank
      if (lockF !== null) {
        const endErr = (msg: string) => (held ? err('lockup-end', msg) : warn('lockup-end', `${msg} (the ${template} template's own end: a warning)`));
        const fade = SEAMS.find((x) => x.kind === 'fadeEnd');
        const hold = (TOTAL - lockF) / FPS;
        if (fade) endErr(`the lockup leaves before the last frame: a fadeEnd seam at f${fade.at} (${(fade.at / FPS).toFixed(2)} s) takes it out ${((TOTAL - fade.at) / FPS).toFixed(2)} s before the end. Keep the lockup whole and alive to the last frame (a creep, a light), never a fade to blank`);
        else if (END && END.to < TOTAL) endErr(`the end lock stops at f${END.to}, before the last frame f${TOTAL}: the lockup holds to the last frame`);
        // the band: a scene-bank film (SPINE_PLAN, a GROUND_PLAN, launch-simple or update); a starter's own end is not held to it
        const bankFilm = T.SPINE_PLAN != null || T.GROUND_PLAN !== undefined || ['launch-simple', 'update'].includes(template);
        if (!bankFilm) {
          /* the fade and the end lock above only */
        } else if (hold < LOCKUP_HOLD.min - 1e-9) endErr(`the lockup is whole for ${hold.toFixed(2)} s (CUE.lockup or REVEAL f${lockF} to the last frame): it holds ${LOCKUP_HOLD.min}-${LOCKUP_HOLD.max} s`);
        else if (hold > LOCKUP_HOLD.max + 1 / FPS + 1e-9) warn('lockup-end', `the lockup is whole for ${hold.toFixed(2)} s to the last frame; ${LOCKUP_HOLD.min}-${LOCKUP_HOLD.max} s reads as an end card, longer as a wait`);
      }
    }
    // grounds: one ground family a film, at most one deliberate change (a flood and its return count as one)
    const gp = arr<{ from: number; to: number; ground: string }>('GROUND_PLAN').filter((r) => r && isNum(r.from) && isNum(r.to) && r.to > r.from);
    if (gp.length) {
      const runs = gp.reduce<{ from: number; to: number; ground: string }[]>((o, r) => (o.length && o[o.length - 1].ground === String(r.ground) ? (o[o.length - 1].to = r.to, o) : [...o, { from: r.from, to: r.to, ground: String(r.ground) }]), []);
      const n = groundChanges(runs.map((r) => r.ground));
      if (n > GROUND_CHANGES)
        err('grounds', `the film changes ground ${n} times (${runs.map((r) => `${r.ground} ${(r.from / FPS).toFixed(1)}-${(r.to / FPS).toFixed(1)} s`).join(' > ')}; a flood and its return count as one): keep one ground for the whole film, its scenes painted on it, and change it once on purpose (a colour flood, the lockup's field)`);
    }
    // subject-run: one subject (consecutive scenes about the same picture) at most 4.5 s in a row
    const sj = arr<{ subject: string; from: number; to: number }>('SUBJECTS').filter((r) => r && isNum(r.from) && isNum(r.to) && r.to > r.from);
    if (sj.length) {
      const runs = sj.reduce<{ subject: string; from: number; to: number }[]>((o, r) => (o.length && o[o.length - 1].subject === String(r.subject) ? (o[o.length - 1].to = r.to, o) : [...o, { subject: String(r.subject), from: r.from, to: r.to }]), []);
      for (const r of runs)
        if ((r.to - r.from) / FPS > SUBJECT_MAX_S + 1 / FPS + 1e-9)
          err('subject-run', `${((r.to - r.from) / FPS).toFixed(2)} s on one subject ("${r.subject}", f${r.from}-f${r.to}): consecutive scenes about the same picture are one beat, ${SUBJECT_MAX_S} s at most; cut a scene or move to the next subject`);
    }
    if (!LOOK.oneTake && shots.length >= 3) {
      const band = SHOT_BAND[filmType] ?? [0.5, 3.0];
      const med = median(sec);
      if (med < band[0] || med > band[1]) warn('shot-length', `the median shot is ${med.toFixed(2)} s; a ${filmType} film sits at ${band[0]}-${band[1]} s (LOOK.filmType)${med > band[1] ? ': cut more, or carry the shot with the camera and declare it LOOK.oneTake' : ''}`);
      if (shots.length >= 4) {
        const spread = quantile(sec, 0.75) / quantile(sec, 0.25);
        if (spread < 1.6) warn('shot-length', `shot lengths barely vary (q75/q25 ${spread.toFixed(2)} < 1.6; aim for 1.9-3.1): the cuts read as a metronome; mix long holds with short punches (a 0.6 s insert beside a 4 s hold)`);
      }
      if (Math.max(...sec) < 2 * Math.min(...sec)) warn('shot-length', `the longest shot (${Math.max(...sec).toFixed(2)} s) is under twice the shortest (${Math.min(...sec).toFixed(2)} s)`);
      for (let i = 0; i < shots.length; i++) {
        if (sec[i] >= 0.25) continue;
        const [a, b] = [bounds[i], bounds[i + 1]];
        const punch = FLASHES.some((x) => x.f >= a && x.f < b) || STEPPED.some((r) => r.from < b && a < r.to) || SEAMS.some((x) => (x.at === a || x.at === b) && PUNCH.has(x.kind));
        if (!punch) warn('shot-length', `the shot f${a}-f${b} lasts ${sec[i].toFixed(2)} s; under 0.25 s only as a declared punch (a flash, a step, a snap zoom, a colour or light seam)`);
      }
      const long = sec.filter((x) => x > 4).length / sec.length;
      const longMax = filmType === 'launch' || filmType === 'update' ? 0.15 : 0.3;
      if (long > longMax) warn('shot-length', `${Math.round(100 * long)} % of the shots run over 4 s; keep <= ${Math.round(100 * longMax)} % in a ${filmType} film, or declare LOOK.oneTake`);
    }

    // picture changes: cuts and seams, copy arriving or leaving, and CUEs that change the picture (hit, cut, copy,
    // move); `life` (creep, light, drift) keeps a hold alive but is not a change
    const endFrom = END ? Math.min(END.from, bodyEnd) : bodyEnd;
    const changeSet = new Set<number>(cuts);
    for (const c of COPY) for (const f of [c.in, c.out]) if (isNum(f) && f > 0 && f < endFrom) changeSet.add(f);
    for (const q of cueFrames) if (q.f > 0 && q.f < endFrom && salienceOf(q.name) !== 'life') changeSet.add(q.f);
    const changes = [...changeSet].filter((f) => f > 0 && f < endFrom).sort((a, b) => a - b);
    // long-take: a take over 15 s keeps changing inside (two picture changes per 10 s)
    const takes: [number, number][] = LOOK.oneTake ? [[0, endFrom]] : bounds.slice(1).map((f, i) => [bounds[i], Math.min(f, endFrom)] as [number, number]);
    for (const [a, b] of takes) {
      const len = (b - a) / FPS;
      if (len <= 15) continue;
      const inside = changes.filter((f) => f > a && f < b && !cuts.includes(f)).length;
      if (inside / (len / 10) < 2) warn('long-take', `the take f${a}-f${b} runs ${len.toFixed(1)} s with ${inside} picture change(s) inside it; a take over 15 s changes its layout or type at least twice every 10 s (a word, a chip, a reframe), or cut it`);
    }
    // cut-mix: some changes happen without a hard cut
    if (cuts.length >= 5) {
      const seamAt = new Map(SEAMS.map((x) => [x.at, x.kind] as [number, string]));
      const soft = cuts.filter((f) => CUT_FREE.has(seamAt.get(f) ?? '')).length;
      if (soft / cuts.length < 0.14 - 1e-9) warn('cut-mix', `${soft} of ${cuts.length} picture changes happen without a hard cut (${Math.round((100 * soft) / cuts.length)} %); carry at least one in seven on a morph, mask, wipe or zoom-through`);
    }
    // picture-change: a layout or type change at least every 2.5 s outside the end lock
    {
      const marks = [0, ...changes, endFrom];
      let worst: [number, number] | null = null;
      for (let i = 1; i < marks.length; i++) if (!worst || marks[i] - marks[i - 1] > worst[1] - worst[0]) worst = [marks[i - 1], marks[i]];
      if (worst && worst[1] - worst[0] > 2.5 * FPS + 1e-9)
        warn('picture-change', `f${worst[0]}-f${worst[1]}: ${((worst[1] - worst[0]) / FPS).toFixed(2)} s with no layout or type change (no cut, copy arriving or leaving, or hit, cut, copy or move cue); change the picture at least every 2.5 s outside the end lock: a creep alone reads as a held frame`);
    }
    // opener: two picture changes in the first 2.5 s
    {
      const early = changes.filter((f) => f <= 2.5 * FPS + 1e-9).length;
      if (endFrom > 2.5 * FPS && early < 2) warn('opener', `${early} picture change(s) in the first 2.5 s; open with at least two (a cut, a word arriving, a reframe), the subject readable from frame 0`);
    }

    // seam-plan
    if (SEAMS.length) {
      const sorted = [...SEAMS].sort((a, b) => a.at - b.at);
      const lastAct = acts.length ? acts[acts.length - 1][1].from : 0;
      sorted.forEach((x, i) => {
        const id = x.id ?? `${x.kind}@f${x.at}`;
        if (x.kind === 'fadeEnd' && (i !== sorted.length - 1 || x.at < lastAct)) err('seam-plan', `seam ${id}: a fade only ends the film (the last seam, in the last act); between shots it reads as a dissolve`);
        if (x.kind === 'dissolveUi' && actStarts.includes(x.at)) err('seam-plan', `seam ${id}: a dissolve only lives inside UI under camera motion; across the act boundary at f${x.at} it joins unrelated shots (carry something: velocity, morph, mask)`);
        if (x.kind === 'dissolveUi' && isNum(x.dur) && x.dur > s60(8) + 1e-9) err('seam-plan', `seam ${id}: a ${x.dur} f dissolve; keep UI dissolves <= ${s60(8)} f (8 f@60)`);
      });
      const counts = new Map<string, number>();
      // a spine handover counts by its own kind (grow, swell, fly, converge ...): each is a different way across, whatever
      // seam kind it declares for the devices it promises
      const planKind = (x: (typeof SEAMS)[number]) => {
        const h = (x as { handover?: unknown }).handover;
        return typeof h === 'string' && h ? `${h} handover` : `${x.kind}`;
      };
      for (const x of SEAMS) if (!x.signature) counts.set(planKind(x), (counts.get(planKind(x)) ?? 0) + 1);
      for (const [k, n] of counts) if (n > 3) warn('seam-plan', `${n} ${k} seams; any one kind <= 3 times except the signature move (mark it signature: true)`);
      if (SEAMS.length >= 3) {
        const carried = SEAMS.filter((x) => CARRIED.has(x.kind)).length / SEAMS.length;
        if (carried < 0.4) warn('seam-plan', `${Math.round(100 * carried)} % of the seams carry something across (velocity, morph, breath, zoom-through, whip, snap zoom, mask); keep >= 40 %`);
      }
      if (TOTAL / FPS > 20 && SEAMS.some((x) => x.kind === 'hard') && !SEAMS.some((x) => x.kind === 'velocity'))
        warn('seam-plan', `a ${(TOTAL / FPS).toFixed(1)} s cut film with no velocity seam: carry the speed through at least one cut`);
    }

    // cut-on-sound (when there are onsets to land on). Continuity seams (speed, shape or scale carried
    // through: velocity, morph, breath, zoom-through, whip, mask, defocus, wipe, a UI dissolve) may float
    // off the accents; hard cuts, graphic punches and undeclared act cuts land on a sound.
    const soundCuts = cuts.filter((f) => !SEAMS.some((x) => x.at === f && CONTINUITY.has(x.kind)));
    if (onsets.length && soundCuts.length) {
      const d = soundCuts.map((f) => ({ f, lead: inLead(f), near: Math.abs(toOnset(f) ?? Infinity) <= 0.1 * FPS + 1e-9 }));
      const inWin = d.filter((x) => x.lead).length / d.length;
      const in100 = d.filter((x) => x.near).length / d.length;
      const off = d.filter((x) => !x.near).map((x) => `${cutMap.get(x.f)} f${x.f}`);
      if (in100 < 0.3) err('cut-on-sound', `only ${Math.round(100 * in100)} % of the ${d.length} cuts land within 100 ms of a sound (${off.slice(0, 4).join(', ')}${off.length > 4 ? ', ...' : ''}): cut on an accent or a designed effect`);
      else if (inWin < 0.5 || in100 < 0.8)
        warn('cut-on-sound', `${Math.round(100 * inWin)} % of the ${d.length} cuts sit on a sound (picture ${leadMin}..+${leadMax} f from it) and ${Math.round(100 * in100)} % within 100 ms; want >= 50 % and >= 80 %${off.length ? ` (off: ${off.slice(0, 4).join(', ')})` : ''}`);
    }

    // stagger-shape: CUE lists of starts, and the pace's word stagger when it carries a cadence
    const BANDS: Record<string, [number, number]> = { word: [7, 14], letter: [3, 8], ui: [5, 18] };
    for (const [name, v] of Object.entries(CUE!)) {
      if (!Array.isArray(v) || v.length < 4 || !v.every(isNum)) continue;
      const tag = staggerTag.get(name) ?? '';
      const f = [...(v as number[])].sort((a, b) => a - b);
      const gaps = f.slice(1).map((x, i) => (x - f[i]) / s);
      if (tag !== 'list' && cv(gaps) < 0.1)
        warn('stagger-shape', `CUE.${name}: ${f.length} starts at even ${median(gaps).toFixed(1)} f@60 gaps (CV ${cv(gaps).toFixed(2)}); stagger by the reading rhythm, or tag a real list with "// stagger: list"`);
      if (tag === 'payoff' && gaps.length >= 3 && gaps[gaps.length - 3] < gaps[gaps.length - 2] && gaps[gaps.length - 2] < gaps[gaps.length - 1])
        warn('stagger-shape', `CUE.${name} is a payoff but its last gaps grow (${gaps.slice(-3).map((g) => g.toFixed(0)).join(', ')} f@60): accelerate into the payoff`);
      const band = BANDS[tag];
      if (band && (median(gaps) < band[0] || median(gaps) > band[1])) warn('stagger-shape', `CUE.${name}: a ${tag} stagger of ${median(gaps).toFixed(1)} f@60 (median); ${tag}s stagger ${band[0]}-${band[1]} f@60`);
    }
    const PX = exported as Record<string, unknown> | undefined;
    if (PX && typeof PX.cadence === 'string' && isNum(PX.stagger) && (PX.stagger < 7 || PX.stagger > 14))
      warn('stagger-shape', `the ${paceName} pace staggers words ${PX.stagger} f@60; words stagger 7-14 f@60`);

    // exit-length: the pace's text exit against its entrance
    if (PX && isNum(PX.exitDur) && isNum(PX.wordDur) && (PX.exitDur > 0.75 * PX.wordDur + 1e-9 || PX.exitDur > 33))
      warn('exit-length', `the ${paceName} pace exits text over ${PX.exitDur} f@60 against a ${PX.wordDur} f entrance; an exit is <= 0.75 x the entrance and <= 33 f@60 (leave faster than you arrive)`);

    // recentre: the pace's re-centre (1.2 knobs: recentre, recentreDur, recentreLead)
    if (PX && typeof PX.recentre === 'string') {
      const dur = Number(PX.recentreDur);
      const lead = Number(PX.recentreLead ?? 0);
      if (isNum(dur) && (dur < 12 || dur > 44)) warn('recentre', `the ${paceName} pace re-centres over ${dur} f@60; a re-centre jump takes 12-44 f@60 (house 22)`);
      if (isNum(lead) && lead > 12) warn('recentre', `the ${paceName} pace starts its re-centre ${lead} f@60 early; a lead over 12 f@60 reads as drift`);
      if (PX.recentre === 'jump' && isNum(dur) && dur > 0) {
        const k = isNum(PX.recentreK) ? PX.recentreK : 12;
        const t = Math.min(1, 2 / dur);
        const p = (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
        if (p < 0.55) warn('recentre', `the ${paceName} re-centre is ${Math.round(100 * p)} % home after 1/30 s; a jump is >= 55 % there (house ~67 %)`);
      }
    }

    // accent-time: the pace's transient accent (1.2 knobs: accentHold, accentCool)
    if (PX && (isNum(PX.accentHold) || isNum(PX.accentCool))) {
      if (isNum(PX.accentHold) && PX.accentHold > 72) warn('accent-time', `the ${paceName} pace holds the accent ${PX.accentHold} f@60 (${(PX.accentHold / 60).toFixed(2)} s); hold it 0.2-1.2 s`);
      if (isNum(PX.accentCool) && PX.accentCool > 28) warn('accent-time', `the ${paceName} pace cools the accent over ${PX.accentCool} f@60; cool it in <= 28 f@60 (house 13)`);
      if (typeof PX.accentEase === 'string' && PX.accentEase !== 'linear') warn('accent-time', `the ${paceName} pace cools the accent on ${PX.accentEase}; the cool is linear`);
    }

    // end-lock
    if (END && END.to > END.from) {
      const len = (END.to - END.from) / FPS;
      if (len < 1 - 1e-9 || len > 5 + 1e-9) warn('end-lock', `END holds ${len.toFixed(2)} s; the one end lock holds 1-5 s`);
      if (END.to < bodyEnd) warn('end-lock', `END stops at f${END.to}, before the body ends (f${bodyEnd}): the lock holds to the end`);
    }

    // density-plan (optional): a MOTION registry of moves
    const MOTION = (Array.isArray(T.MOTION) ? T.MOTION : Array.isArray(cuesDoc?.motion) ? cuesDoc!.motion : null) as { from: number; to: number }[] | null;
    if (MOTION && MOTION.length) {
      const moves = MOTION.filter((m) => m && isNum(m.from) && isNum(m.to) && m.to > m.from);
      const quiet = (f: number) => (hold && f >= hold.from && f < hold.to) || (END && f >= END.from && f < END.to);
      const span = Math.max(1, (END ? Math.min(END.from, bodyEnd) : bodyEnd));
      const starts = moves.filter((m) => m.from < span).map((m) => m.from).sort((a, b) => a - b);
      const rate = starts.length / (span / FPS);
      if (rate < 1.4 || rate > 3.6) warn('density-plan', `${rate.toFixed(2)} moves start per second before the end lock; a living film runs 1.4-3.6 (house ~2.3)`);
      let running = 0;
      for (let f = 0; f < span; f++) running += moves.filter((m) => m.from <= f && f < m.to).length;
      const conc = running / span;
      if (conc < 1.3 || conc > 2.7) warn('density-plan', `${conc.toFixed(2)} moves run at once on average; keep 1.3-2.7 (house ~1.7)`);
      const win = FPS;
      for (let a = 0; a + win <= span; a += Math.max(1, Math.round(FPS / 4))) {
        if (quiet(a)) continue;
        if (!starts.some((f) => f >= a && f < a + win)) {
          warn('density-plan', `nothing starts between f${a} and f${a + win}: no second without a new move outside HOLD and END`);
          break;
        }
      }
    }
  }

  // --- tail and bars
  const lastCue = cueFrames.reduce((m, c) => Math.max(m, c.f), 0);
  if (TOTAL - lastCue < FPS) warn('tail', `only ${TOTAL - lastCue} f after the last cue; leave >= ${FPS} f (1 s) for the audio to decay`);
  if (T.TAIL !== undefined && TAIL < FPS) warn('tail', `TAIL is ${TAIL} f; use >= ${FPS} f (1 s)`);
  if (!MUSIC && Math.abs(bodyEnd / BAR - Math.round(bodyEnd / BAR)) > 1e-6) warn('whole-bars', `the body (TOTAL - TAIL = ${bodyEnd} f) is ${(bodyEnd / BAR).toFixed(2)} bars; whole bars loop and end cleanly`);

  // --- the spine: the plan when the timeline exports one; a film that imports the spine, or a template film, without one
  let spine: Record<string, unknown> | null = null;
  if (T.SPINE_PLAN !== undefined && T.SPINE_PLAN !== null) {
    const r = spineFindings(T.SPINE_PLAN, { fps: FPS, total: TOTAL, format: filmType, downbeats: spineDownbeats(T) });
    out.push(...r.findings);
    spine = r.summary;
  } else {
    let template = '';
    try {
      template = String(JSON.parse(readFileSync(resolve(dirname(tlPath), '..', 'film.json'), 'utf8')).template ?? '');
    } catch {
      /* no film.json: a film made without a template */
    }
    if (existsSync(resolve(dirname(tlPath), 'spine.ts')) || /\bspine\b/i.test(src))
      err('spine-declared', 'the film plays a spine (src/spine.ts, or the timeline reads it) but the timeline exports no SPINE_PLAN: export it, so the acts, the handovers, the lines and the case are checked');
    else if (['launch-simple', 'update'].includes(template))
      warn('spine-declared', `a film from the ${template} template with no SPINE_PLAN: write the film as one sentence, one case, one element in 3-5 acts (the template's spine) and export SPINE_PLAN from the timeline`);
  }

  // --- the deal: most scenes dealt from the bank, one of the film's own at most, none twice, two of the last film's at most
  const dealt = dealFindings(T);
  out.push(...dealt.findings);

  // --- report
  const errors = out.filter((x) => x.severity === 'error').length;
  const warnings = out.length - errors;
  const pass = errors === 0 && !(strict && warnings > 0);
  const summary = {
    fps: FPS,
    bpm: BPM,
    beat: BEAT,
    bar: BAR,
    total: TOTAL,
    seconds: +(TOTAL / FPS).toFixed(3),
    acts: acts.length,
    cues: cueFrames.length,
    pace: paceName,
    words,
    uiWords,
    maxWords,
    maxVisible,
    wordsPerSec: +avg.toFixed(2),
    peakWordsIn5s: peak.n,
    textShare: +share.toFixed(3),
    longestTextFree: longestFree,
    maxGap,
    longestGap,
    music: MUSIC ? { bpm: MUSIC.bpm, t0: MUSIC.t0, bars: MUSIC.bars, accents: (MUSIC.accents ?? []).length } : null,
    declared,
    cuts: cuts.length,
    onsets: onsets.length,
    shots: shotInfo,
    spine,
    deal: dealt.summary,
  };
  if (json) console.log(JSON.stringify({ tool: 'grid-check', timeline: tlPath, pass, errors, warnings, summary, findings: out }, null, 1));
  else {
    for (const f of out) console.log(`${f.severity === 'error' ? 'FAIL' : 'warn'}  ${f.check}  ${f.message}`);
    console.log(
      `grid-check: ${summary.seconds} s, ${BPM} BPM @ ${FPS} fps (beat ${+BEAT.toFixed(3)} f, bar ${+BAR.toFixed(3)} f${MUSIC ? `, music grid from f${+Number(MUSIC.t0).toFixed(2)}` : ''}), ${paceName} pace, ${summary.acts} acts, ${summary.cues} cues, ` +
        `${words}/${maxWords} words${uiWords ? ` (+${uiWords} ui)` : ''}, <= ${maxVisible} on screen, ${summary.wordsPerSec} w/s, ` +
        `text on ${Math.round(100 * share)}% (longest text-free ${longestFree} f), longest gap ${longestGap}/${maxGap} f -> ${pass ? 'pass' : 'FAIL'} (${errors} errors, ${warnings} warnings)`,
    );
  }
  process.exit(pass ? 0 : 1);
}

main();
