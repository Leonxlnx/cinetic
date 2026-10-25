# Motion tokens

The house motion system: curves by role, special curves for primitives, spring presets and the one spring class, the
duration, time-constant, stagger, typing and speed tables, velocity carried through cuts, holds that creep, overlap,
oversized landings, stepped time, the pace knob and the `hitPulse` envelope. Read it before Step 4 (Build), and
whenever motion looks floaty, bouncy, uniform or mechanical.

Everything lives in `src/lib/anim.ts` (curves, springs, tables), `src/lib/pace.ts` (the pace), `src/lib/handoff.ts`
(carry, creep, overlap) and `src/lib/cadence.ts` (stepped and irregular time); HyperFrames carries the same numbers in
`motion.js` (`scripts/test/mirror.test.mjs` keeps them equal). Numbers are house defaults with normal ranges at 60 fps
(`f@60`); every helper takes the film's fps from the film context, so the same numbers give the same motion in
seconds at 24, 25, 30 or 60 fps.

**Contents**
1. [The laws](#1-the-laws)
2. [Curves by role](#2-curves-by-role)
3. [Special curves](#3-special-curves)
4. [Springs and the one spring class](#4-springs-and-the-one-spring-class)
5. [Tables: durations, time constants, staggers, typing, speed](#5-tables)
6. [Speed through cuts, holds that live, overlap](#6-speed-through-cuts-holds-that-live-overlap)
7. [Scale: log space, oversized landings, breath](#7-scale-log-space-oversized-landings-breath)
8. [Stepped and irregular time](#8-stepped-and-irregular-time)
9. [The pace knob](#9-the-pace-knob)
10. [hitPulse, anticipation, contact and landing](#10-hitpulse-anticipation-contact-and-landing)
11. [The 1.1 names](#11-the-11-names)
12. [Checks](#12-checks)

---

## 1. The laws

- **All motion comes from the house files.** A raw `Easing.bezier(…)` or an inline spring config outside `lib/anim.ts`
  is a lint error (`raw-easing`, `spring-config`). Need a new curve? Add a named token with a comment saying its job;
  a retuned house curve gets a new name (`token-drift`).
- **Vocabulary by role.** Every curve carries a family: **arrive** (peak speed on the first frame, a long settle:
  entrances, inserts, landings), **reposition** (an S: moves inside a shot, camera reframes, whips), **leave** (ends at
  speed: exits, ideally cut on their last frame) and **linear** (colour lerps, flash decays, drifts, counters,
  log-scale zooms). `enter()`, `leave()` and `move()` refuse a curve of the wrong family (`ease-family`). Most
  arrivals are front-loaded and most moves into a cut end at speed: grammar-score wants ≥ 71 % of each.
- **Entrances decay, exits accelerate; never fade a statement out.** A statement leaves at speed (into a cut or a
  mask at full opacity, or with a short fade in the last half of a moving exit). A standalone opacity fade of more
  than 12 f@60 on a line is a tell (`fade-exit`). Opacity on type never runs on `E.linear` (`linear-opacity`).
- **Duration grows with distance.** Calm: 0.5 s + 1.6 ms per px, camera moves 0.9-3.0 s (crisp: 0.35 s + 1.35 ms/px,
  0.6-2.4 s): `durFor(px, camera?)`. The slowest move in a film is at least 3× the fastest.
- **One hero motion plus at most two supporting ones.** Ordinary moves stay under about 25 px/f; fast moves sit next
  to real stillness and never happen while text is read.
- **Never scale from zero.** An entrance starts oversized (1.28-1.9×) and settles (`fx/Oversize`, `scale-from-zero`).
- **Smooth, or it doesn't ship.** Jitter, pixel-snap stairs, single-frame pops and stall-then-lurch block the ship
  (zero `forensics.py` fails, Finish 5). Designed artifacts (steps, flashes, hard seams) are declared, so they read as
  craft (`references/checks.md`).
- **Discrete state reads whole frames.** Typed characters, labels, counters and layout switches use `fd(f)`
  (`Math.round`), so every motion-blur sub-sample of a frame agrees.
- **Pass the curve explicitly.** `prog(f, a, b, E.glideOut)`, never `prog(f, a, b)`: the default is a 1.1 arrival.

## 2. Curves by role

`E` in `lib/anim.ts`. "t = .1" is the progress at 10 % of the time; durations are house values at 60 fps.

| Token | Family | t = .1 | House dur | Use |
|---|---|---|---|---|
| `snapOut` | arrive | .50 | 32 f | words (opacity and rise as one), slot inserts, tiles, settles after a cut |
| `glideOut` | arrive | .33 | 34 f | **the default arrival**: layers after a cut, slides, logo parts |
| `settleOut` | arrive | .25 | 34 f | UI cards, slow camera and colour settles |
| `softOut` | arrive | .16 | 34 f | tints, mask reveals, slow pushes under holds (an exponential, k 1.27) |
| `liftOut` | arrive | .09 | 31 f | UI reframes: a short lunge (peak at t = .25), a long settle |
| `jump` | arrive | (42 % in frame 1) | 22 f | line re-centre and make-room: 42 % in the first frame, 66 % by the second (exponential, k 12) |
| `stdInOut` | reposition | .04 | 30 f | card repositioning, pull-backs, presses, a bar growing (peak at 35 %) |
| `strongInOut` | reposition | .02 | 36 f | camera reframes and pans, lateral moves, colour cross-fades |
| `whipBuild` | reposition | .02 | 28 f | whips: a long build, a short brake (peak speed at t = .55-.6) |
| `anticipate` | reposition | (dips 4 %) | | one wind-up per film at most |
| `softIn` | leave | .05 | 28 f | gentle exits, a logo shrinking before a cut |
| `buildIn` | leave | .02 | 26 f | **the exit**: speed about ×1.11 a frame at the end |
| `launchIn` | leave | .01 | 29 f | into a cut: speed about ×1.16 a frame at the end (×1.34 at 30 fps) |
| `linear` | linear | .10 | | colour lerps, flash decays, drifts, counters, log-scale zooms (with `lmix`) |

- **A film's role mix** sits near 55 % arrive, 16 % reposition, 19 % leave, 8 % linear, 2 % spring (grammar-score
  `role-mix`). A film where every move is an in-out S reads as a slideshow; a film with no leave curves never cuts on
  speed.
- **`expOut(k)` and `expIn(k)`** are true exponentials normalised to land on 1 (`jump` is `expOut(12)`); `perFrame(r,
  60, fps)` converts a per-frame ratio written at 60 fps.
- **`Easing.spring()` is not an arrival curve:** it starts from zero velocity and feels late; use `spring()` for
  physics and an arrive token for decaying arrivals.
- Multi-segment moves take one easing per segment: `interpolate(f, [0, 18, 90, 104], [40, 0, 0, -40], { easing:
  [E.snapOut, E.linear, E.buildIn], extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`.

## 3. Special curves

`M` holds the special curves that primitives use as their defaults, named for their job. A one-off curve for one
moment stays a prop of that moment; it does not become a token.

| Curve | Family | Job |
|---|---|---|
| `M.rise` | arrive | a word's rise (`pace.riseDur`); its opacity rides the pace ease |
| `M.press` | reposition | a press squeezing in |
| `M.lockup` | reposition | a lockup slide: mark and name meeting (peak speed past the middle) |
| `M.develop` | reposition | imagery developing from a tint to full colour |
| `M.letterArc`, `M.letterGrow`, `M.letterSlide` | arrive / reposition | letters swinging up on an arc (about 4 % over), a first letter growing from the baseline, the letters sliding in after it |
| `M.groupSettle` | arrive | a built word settling as one |
| `M.pixelStair`, `M.demosaicZoom` | reposition / arrive | block size stepping out, and resolving back in |
| `M.collagePush` | reposition | the slow push under a collage build |
| `M.oversize` | arrive | an oversized landing settling to size |
| `M.squeeze`, `M.swell` | reposition | a container gathering before it changes state; swelling into its next state |
| `M.ringTighten` | reposition | a ring wipe tightening |
| `M.focusSlide` | arrive | a word sliding home while it comes into focus |

## 4. Springs and the one spring class

`SPR` presets (Remotion configs, mass 1; ζ = damping / (2√(stiffness·mass)); settle = within 2 % of rest at 60 fps):

| Preset | ζ | Overshoot | Settle | Use |
|---|---|---|---|---|
| `critical` | 1.00 | 0 | 27 f | **the default** |
| `criticalFast` | 1.00 | 0 | 18 f | markers, chips |
| `criticalSlow` | 1.00 | 0 | 45 f | big objects, the camera |
| `landing` | 0.59 | 9-11 % | 23 f | the house spring class: pill, bubble, aperture, logo |
| `softLanding` | 0.66 | 4-7 % | 30 f | big framing objects |
| `menu` | 0.65 | 6-10 % | 12 f | a menu or container snapping open |
| `containerPop` | 0.54 | 12-13 % | 6 f | a container morph |
| `wordDrop` | 0.57 | 11-12 % | 12 f | posterised word drops only |
| `lazyWheel` | 0.50 | 15-17 % | 49 f | wheel pickers, after an anticipation dip |
| `logoSwing` | 0.50 | 16-18 % | 59 f | a logo's rotation after a wind-up |

- **One underdamped class per film.** `SPRING_CLASS` in `timeline.ts` names the one kind of element that springs
  (the pill, the bubble, the logo), every time it moves; everything else settles critically. Two classes warn and three
  error (`spring-budget`; tag a use `// spring: <class>`). Type never springs with overshoot.
- **Overshoot belongs to a true landing**: an object arriving at a surface or a lock, with a contact you could put a
  sound on. Clamp overshoot wherever it could collide or go negative (`overshootClamping`, or clamp the offset), and
  snap to rest when `|1 − s| < 0.01`.
- `spr(f, start, cfg)` is 0 before its start; `measureSpring` sizes a sequence; `src/lib/sync.ts` `hit()` and
  `delayTo()` find the contact frame for the sound.

## 5. Tables

House numbers in `lib/anim.ts`, 60 fps frames unless noted. Pick the house value; move between short and long by size
and importance.

**`DUR`** (by class: shortest, short, **house**, long, longest), a selection:

| Class | Frames | Class | Frames |
|---|---|---|---|
| `word` | 16, 24, **32**, 32, 57 | `ui` | 10, 20, **34**, 50, 70 |
| `lineIn` | 12, 18, **28**, 54, 78 | `press` | 12, 17, **20**, 25, 32 |
| `letter` | 12, 25, **34**, 45, 64 | `cursor` | 25, 31, **44**, 54, 90 |
| `typeExit` | 7, 10, **17**, 24, 33 | `counter` | 24, 24, **34**, 80, 120 |
| `exit` | 10, 15, **24**, 32, 44 | `morph` | 14, 16, **22**, 32, 49 |
| `scaleIn` | 11, 20, **32**, 53, 81 | `mask` | 12, 17, **26**, 40, 58 |
| `slideIn` | 15, 18, **30**, 39, 48 | `colour` | 12, 20, **34**, 54, 110 |
| `whip` | 17, 21, **32**, 52, 94 | `zoomThrough` | 14, 24, **35**, 46, 75 |
| `push` | 15, 28, **50**, 72, 86 | `pull` | 25, 30, **43**, 70, 129 |
| `pan` | 27, 38, **48**, 72, 126 | `drift` | 18, 28, **49**, 82, 146 |
| `logoPart` | 10, 20, **30**, 46, 80 | `hold` | 15, 24, **76**, 147, 302 |

The full table (`typeOn`, `typeColour`, `typeScale`, `reflow`, `lineDraw`, `orbit`, `seamMove`, `collage`,
`loader`, `ambient`, `focus`) is in `anim.ts`. A press is `PRESS`: squeeze 9, hold 3, release 10.

**`TAU`** (exponential time constants; for `expOut(k)` over d frames, k = d / tau; 99 % home after about 4.6 tau):
marker 3, element 8, hero 17, world 30, UI exit 6, camera exit 19.

**`STAG`** (staggers: shortest, short, **house**, long, longest): letter 2, 3, **4**, 8, 14; word 4, 7, **10**, 14, 14;
row 6, 8, **9**, 10, 18; UI 2.5, 5, **7.5**, 17.5, 34; logo part 6, 6, **7**, 24, 30. Staggers are irregular by default
(gap variation ≥ 0.15): a metronome stagger is a tell.

**`ACCEL`** (gaps of an accelerating payoff): rows 18, 18, 14, 10, 8, 6, 6; montage 14 ×5, 10 ×3, 6 ×6; typing 5, 2,
2, 1, 1, 1.

**`CPS`** (typing, characters per second): a human 19-45 (house 30, bursts of about 2); a prompt that speeds up from
5 to 19; a stream 50-150.

**`SPEED`** (px/s at 1080p: slow, house, fast): word rise 420, 630, 1080; UI card 390, 1080, 1900; slide-in 780,
1860, 3200; cursor 1350, 1530, 2400; pan 570, 1700, 2640; whip peak 750, 1600, 3700 (never above 7400); hold drift
6, 30, 90; a residual drift after a cut 45; motion blur becomes visible from about 900-1200.

## 6. Speed through cuts, holds that live, overlap

**A velocity-carried cut** (`lib/handoff.ts`) is two halves. `launch(f, cut, { vCut })`: the outgoing move
accelerates into the cut and the cut frame is its fastest (house profile `LAUNCH`: the step k frames before the cut
is vCut·e^(−0.47·k^0.76); the last frame grows the speed about ×1.6 at 60 fps, the frames before it ×1.3-1.5; a
geometric build of ×1.11-1.16 a frame also works). `carry(f, start, { v0 | ratio, vCut })`: the incoming shot opens at
a share of the outgoing speed (`CARRY.ratio` 0.4-1.4, house 0.7), drops fast (60 % of it at ×0.4 a frame), then
decays slowly (×0.78-0.93 a frame, house 0.89) to a living residual of about 0.75 px a frame. `carriedCut()` puts both
halves on one coordinate; `shotMove()` is a whole shot (opens carried, lives on its residual, launches into its own
cut); `carryChain()` strings shots; `carryShot()` and `handoffShot()` carry a camera's x, y, log scale and roll
through a cut. Declare the seam (`SEAMS`, kind `velocity`): forensics then fails it if direction or speed breaks
(direction cosine ≥ 0.7, incoming 0.4-1.4× the outgoing, then decaying).

**Holds live.** Nothing on screen is frozen for more than 0.8 s outside the end lock. A hold creeps (`creep(f, from,
{ pctPerSec })`, house 6 %/s, range 2-15 %/s) or drifts (`drift(f, from, pxPerSec)`, house 30 px/s, range 6-90),
or sits over moving light, and turns into its exit over the last 12-20 f with `intoCut(f, cut, lead = 16)`, which
starts flat so the hold speeds up into the cut with no step. While text is read the hold stays under 90 px/s and
15 %/s.

**Overlap and anticipation** (`OVERLAP`): a secondary move starts before its primary is 90 % home (`overlapAt(primary,
0.9)`); the foreground lands about 20 f before the background (`leadBy(at, 20)`); the next element enters 0-1 f
before the previous one leaves. Without overlap, two moves that each ease to rest read as stall-then-lurch.

## 7. Scale: log space, oversized landings, breath

- **Scale and zoom interpolate in log space**: `lmix(a, b, t) = exp(mix(log a, log b, t))`. Remotion's
  `perceptual-scale` output is area-linear, not log space.
- **Oversized landing** (`OVERSIZE`, `fx/Oversize`): start at 1.28-1.9× and settle in 22-56 f on `M.oversize`, often
  with a defocused start; this replaces every scale-from-zero.
- **Scale breath around a cut** (`BREATH`, `lib/camera-moves.ts scaleBreath`): push 1-8 % into the cut over 10-20 f;
  the next shot opens 5-12 % off and settles in 8-50 f, so the cut reads as one breath (`references/camera.md`).

## 8. Stepped and irregular time

- `lib/cadence.ts`: `stepFrame(f, { animFps })` (a layer at a lower cadence), `onTwos(f, on)`, `accel(n, first, last)`
  (accelerating onsets), `reading(words, base)` (gaps from each word's length: the reading cadence), `irregular(seed,
  n, mean, min, max)` (seeded human gaps).
- `<Stepped fps={16}>` (`fx/Stepped`) runs its children on stepped time while the camera and footage outside stay
  smooth; `on={2}` holds every pose two frames. It is built on a shifted `Sequence`, not `Freeze`, so nested sequences
  see the right frame. Stepped layers get no shutter blur, and their range is declared (`STEPPED`), so forensics reads
  the holds as craft. `collage({...})` builds a stop-motion collage: elements born as cuts on irregular gaps (house
  4 f average, 1-10 f), some re-cut larger a few frames later, a camera that steps on births and one slow push under
  the whole build (`M.collagePush`).
- Remotion's `posterize` holds an interpolation input for n frames; use `Stepped` for anything bigger than one value.

## 9. The pace knob

`PACE` in `lib/pace.ts` (`motion.js` in HyperFrames) holds every text default, in 60 fps frames. A film picks one with
`PACE_NAME` in `timeline.ts` (calm unless the brief asks for energy); components read it from the film context, and
`grid-check.ts` checks `COPY` against the same numbers (`scripts/gen-pace.mjs` copies the check numbers after an edit;
`mirror.test.mjs` fails while they differ).

| Field | Calm (default) | Crisp | Meaning |
|---|---|---|---|
| `wordDur`, `ease` | 32, `snapOut` | 26, `snapOut` | a word's fade-in |
| `rise`, `riseDur` | 0.33 line box, 25 f on `M.rise` | 0.33, 22 f | a word's rise |
| `stagger`, `cadence` | 12, reading | 8, reading | mean gap between word starts; each gap from the previous word's length |
| `blur` | 0 | 0 | no entry blur on type by default (a focus-in word is a device: `FocusWord`) |
| `exit`, `exitDur`, `exitFade` | auto, 17, 10 | auto, 14, 8 | exits accelerate: full opacity into a cut or a mask, otherwise a short fade in the move's last half |
| `holdBase`, `holdPerWord`, `holdMin` | 42, 8, 60 | 36, 6, 42 | reading hold = max(holdMin, holdBase + holdPerWord·words) |
| `readMax` | 150 | 120 | a reading window counts as alive for at most this long |
| `gapMin`, `gapMax` | 30, 90 | 18, 90 | picture beat between two fragments of a chain |
| `maxNewWords`, `maxVisibleBuild`, `maxVisibleReplace` | 4, 8, 5 | 5, 10, 10 | words per fragment; words visible at once |
| `maxWordsPerSec`, `avgWordsPerSec`, `maxWords` | 1.2, 0.9, 30 | 2.0, 1.2, 35 | copy rate and total |
| `textShare`, `freeRun`, `maxGap` | 0.65, 90, 72 | 0.8, 60, 48 | share of frames with copy; the text-free run each 10 s; frames without an event |
| `accentHold`, `accentCool` | 18, 13 | 7, 13 | the newest fragment holds the accent, then cools to ink linearly |
| `recentre`, `recentreDur`, `recentreLead` | jump, 22, 0 | jump, 16, 0 | a build line re-centres with a jump on `E.jump` |
| `move` | 0.5 s + 1.6 ms/px, camera 0.9-3.0 s | 0.35 s + 1.35 ms/px, 0.6-2.4 s | `durFor()` |
| `fx` | MaskRise 10 f a unit, 10 apart, a linear head that stops, the last word 2.8× longer; TypeOn 2 f a character (30 cps); Scramble a lock every 3 f from the centre at 10 Hz; Roll 90 / 18; Morph 52; Iris 18 f in rate mode (×1.28 a frame) | the same, faster where it matters | component defaults |

A passage can run at the other tempo with a `pace={PACE.crisp}` prop. Both profiles build copy from fragments
(`references/copy-and-type.md`).

## 10. hitPulse, anticipation, contact and landing

**`hitPulse(t, attack = 2, tau = 5)`** is the one envelope for every punch, tick and beat pulse: a quarter-sine to 1 at
`attack` frames, then an exponential decay, gone at `attack + 6·tau` (60 fps frames, converted for the film).
Repeating ticks take the max (`Math.max(...beats.map((b) => hitPulse(f - b)))`); independent causes add. Amplitudes
(scale = 1 + amp·pulse): a clock tick on a small dot +18-30 %; a whole-mark beat punch +1.5 %; a lock-in punch
+2.5-3 %; a payoff camera punch +1.2 % (`hitPulse(t, 3, 7)`); a word-lock punch +1.8 % (`hitPulse(t, 1, 4)`). A
half-sine on a hard window leaves velocity clunks and peaks 6-8 f late.

- **Anticipation.** Before a hero move (not a UI tweak), pull 2-4 % of the distance the other way over 6-10 f, then
  start the main move on a zero-slope curve (`E.anticipate` does both). Once or twice per film.
- **Accelerate into contact.** A thing that hits something is still moving on the contact frame (a leave curve, or a
  spring threshold of 0.92-1.0), so there is a frame to put a sound on.
- **Shape settles before position.** Width, height and radius finish 6 f before contact, on their own curve.
- **Contact squash.** On impact, widen 8 % and flatten 10 % against the contact edge, back over about 8 f:
  `squash(t)` returns `{ along, across }`.
- **Lift and fly.** Lift over 14 f (z 70-130 px), travel on a reposition curve with a `sin(π·t)·50` px arc, drop on a
  leave curve over the last 10 f; the shadow comes from the key (`references/lighting.md`, `FloatShadow`).
- **Vertical text** ends its rise on `arrive(p)` (and starts an exit on `depart(q)`), because the headless shell
  snaps vertical text to whole pixels (`references/chromium-rendering.md`); `arriveK(px, dur, ease)` finds the stop.
- **`blurIn(p, px)`** clears an entry blur by 60 % of the move; text lands sharp.

## 11. The 1.1 names

The 1.1 tokens keep their 1.1 shapes, so old acts and recipes render the same, and lint warns with the 1.2 name to
use (`deprecated-token`):

| 1.1 easing | Use instead | 1.1 spring | Use instead |
|---|---|---|---|
| `out`, `outSoft` | `snapOut` | `snap`, `land` | `landing` |
| `in` | `launchIn` | `pop` | `containerPop` |
| `exit`, `contact` | `buildIn` | `soft`, `firm`, `word` | `critical` |
| `inOut`, `smooth` | `strongInOut` | `heavy`, `calm` | `criticalSlow` |
| `ui`, `rest` | `stdInOut` | `micro`, `detent` | `criticalFast` |
| `cam`, `glide` | `liftOut` | | |
| `whip` | `whipBuild` | | |
| `dolly` | `linear` (pushes on holds), `launchIn` (pushes into cuts) | | |

`E.type` (an eased typewriter) and `E.expo` (the 1.1 glide re-centre) remain as named curves.

## 12. Checks

- `lint-film.mjs`: `raw-easing`, `spring-config`, `ease-family`, `token-drift`, `whip-shape`, `spring-budget`,
  `spring-range`, `scale-from-zero`, `fade-exit`, `linear-opacity`, `deprecated-token`, `interpolate-clamp`.
- `grammar-score.mjs`: `role-mix`, `front-loaded`, `into-cuts`, `durations`, `staggers`, `holds`, `velocity-seams`,
  `overlap` (`references/checks.md`).
- `forensics.py`: `hold-drift`, `carried-cut`, stalls between two moving stretches (a hand-over eased to rest), spikes
  on fades.
- Contact sheets at `--every 1` across every landing: the contact frame shows the squash, the frame before shows
  speed, nothing interpenetrates on the overshoot frames.
