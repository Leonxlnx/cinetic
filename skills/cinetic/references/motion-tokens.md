# Motion tokens

The house motion system: curves by role, special curves for primitives, spring presets and the one spring class, the
duration, time-constant, stagger, typing and speed tables, velocity carried through cuts, holds that creep, overlap,
oversized landings, stepped time, the pace knob and the `hitPulse` envelope. Read it before Step 6 (Build), and
whenever motion looks floaty, bouncy, uniform or mechanical.

Everything lives in `src/lib/anim.ts` (curves, springs, tables), `src/lib/pace.ts` (the pace), `src/lib/handoff.ts`
(carry, creep, overlap), `src/lib/continuity.ts` (glides, the optional hold creep, landing before a cut) and `src/lib/cadence.ts`
(stepped and irregular time); HyperFrames carries the same numbers in
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
- **Nothing on screen moves at a constant rate.** Every transform, position, scale, rotation, camera, blur and opacity
  rides a curve, and most of them an exponential one (`lib/anim.ts`, p = the time share of the move, k = its rate):
  a zoom runs in log space, `zoomAt(f, a, b, from, to, ease)` = from · (to / from)^ease(p), so a push or a dive reads as
  one constant move to the eye; an arrival lands on expo out, `panTo()` = (1 - e^(-k p)) / (1 - e^(-k)); an exit leaves
  on expo in, `exitTo()` = (e^(k p) - 1) / (e^k - 1), cut on its last frame; a pan or a travel inside a shot runs expo
  in-out, `travel()` / `XP.travel`. `interpolate()` without an `easing`, `E.linear`, a raw `frame / n` ramp or a scale
  tweened in value space on any of those properties fails `linear-motion`; only a true live rate (a clock, a real-time
  progress bar, a counter's rate, a constant ambient drift) keeps a linear ramp, with `// lint-ok: <reason>`.
- **Entrances decay, exits accelerate; never fade a statement out.** A statement leaves at speed (into a cut or a
  mask at full opacity, or with a short fade in the last half of a moving exit). A standalone opacity fade of more
  than 12 f@60 on a line is a tell (`fade-exit`). Opacity on type never runs on `E.linear` (`linear-opacity`).
- **Type is solid early and moves while it lands.** A word reads as near-solid ink within 4-8 f@60: it cuts on at
  35-100 %, rises out of a mask, or lands from a scale. A blur lasts 2-6 f, or rides a landing scale and clears on the
  landing frame. Colour, not opacity, marks the newest word (the accent or a tint at full strength, cooling to ink over
  13-18 f). Never two words half-faded and soft at once, never a soft reveal edge wider than about 1.2 em. A hero line
  takes a confident preset (`HERO_PRESETS` in `fx/TypePresets`; `heroPreset()` turns a soft one into `crisp`), and its
  exit carries it out at speed (`slide`, `drift`, `spread`, `collapse`), never a fade.
- **Duration grows with distance.** Calm: 0.5 s + 1.6 ms per px, camera moves 0.9-3.0 s (crisp: 0.35 s + 1.35 ms/px,
  0.6-2.4 s): `durFor(px, camera?)`. The slowest move in a film is at least 3× the fastest.
- **One hero motion plus at most two supporting ones.** Ordinary moves stay under about 25 px/f; fast moves sit next
  to real stillness and never happen while text is read.
- **Never scale from zero.** An entrance starts oversized (1.28-1.9×) and settles (`fx/Oversize`, `scale-from-zero`).
- **Smooth, or it doesn't ship.** Jitter, pixel-snap stairs, single-frame pops and stall-then-lurch block the ship
  (zero `forensics.py` fails, Finish 5). Designed artifacts (steps, flashes, hard seams) are declared, so they read as
  craft (`references/checks.md`).
- **Continuous, or it reads as generated.** No state change happens in one frame (a film keeps one declared snap), no
  hold freezes, every move lands before its cut, and each 3 s is built around one long carrying move rather than a
  queue of short ones (§6 "Continuous motion"; the `forensics.py` motion gates).
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
| `linear` | linear | .10 | | colour lerps and true live rates only (a clock, a real-time bar, a counter's rate, a constant ambient drift, each with `// lint-ok: <reason>`); never a move, a fade or a zoom (`linear-motion`) |
| `XP.arrive` | arrive | .50 | | `expOut(7)`: pans landing, cards sliding home (`panTo()`) |
| `XP.leave` | leave | .00 | | `expIn(6)`: exits and dives into a cut (`exitTo()`) |
| `XP.travel` | reposition | .00 | | `expInOut(7)`: pans, travels, camera reframes, the default zoom curve (`travel()`, `zoomAt()`) |

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

**Measured moves.** When a move is read from a clip frame by frame, keep the numbers instead of hunting for a token:
`track(f, [[frame, value], ...])` draws a monotone cubic through the keys (no overshoot between two keys, the end
values held outside them) and `trackLinear()` draws straight lines; `curveOf([0, ..., 1])` turns progress samples at
t = 0, 1/n ... 1 into an ease for `prog()`. One table replaces a chain of tweens for a card's width, a pan's edge or
a zoom. A measured curve is still a one-off for its moment: it lives in the act or the primitive's props.

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
decays slowly (×0.78-0.93 a frame, house 0.89) to a living residual of about 0.75 px a frame in the carried direction.
Both halves take either sign: a negative `vCut` or `v0` moves left or up, the mirror image of the same curve.
`carry(..., { settle: 60 })` brings the move to rest by that 60 fps frame instead (the last `settleOver`, house 24 f,
ease out with no step in speed), so the camera locks for a read. `carriedCut()` puts both
halves on one coordinate; `shotMove()` is a whole shot (opens carried, lives on its residual, launches into its own
cut); `carryChain()` strings shots; `carryShot()` and `handoffShot()` carry a camera's x, y, log scale and roll
through a cut. Declare the seam (`SEAMS`, kind `velocity`): forensics then fails it if direction or speed breaks
(direction cosine ≥ 0.7, incoming 0.4-1.4× the outgoing, then decaying).

**Holds rest.** The camera is still unless a shot declares a move; a hold may be completely still while the product
changes in it (a value lands, a row fills, a cursor clicks, a line builds). No float, no drift, no idle push, no bobbing
or breathing UI: those read as aimless and cheap. A creep, when a hold wants one, is sub-pixel and one way (`holdDrift`
at most 0.2 px/f@60, 12 px/s; `creep()` at most about 1.5 %/s). A move that carries the cut speeds up into it over the
last 12-20 f with `intoCut(f, cut, lead = 16)`. While text is read the frame stays under 90 px/s and 15 %/s. The gate is
a dead stretch: 2.5 s outside the end lock where nothing at all changes (`forensics.py dead-stretch`, `motion-frozen`).

**Overlap and anticipation** (`OVERLAP`): a secondary move starts before its primary is 90 % home (`overlapAt(primary,
0.9)`); the foreground lands about 20 f before the background (`leadBy(at, 20)`); the next element enters 0-1 f
before the previous one leaves. Without overlap, two moves that each ease to rest read as stall-then-lurch.

### Continuous motion: glide, land, rest, land before the cut

Generated motion has a measurable signature: many short events that start and stop in one frame, settles that fall from
full speed to rest in a frame or two, moves cut while they are still fast, and a camera or a card that floats with no
purpose. Crafted motion is one carrying move per few seconds with secondaries riding it, every move landing with a tail,
and holds that rest while the product changes. `lib/continuity.ts` holds the fixes; `forensics.py` measures the result
on the render (mean luma change at 160x90, one sample per 1/30 s) and `lint-film.mjs` catches the source patterns.

| Rule | Number | Helper | Gate |
|---|---|---|---|
| No state change in one frame | a list step, a selection box, a counter's roll or a field's width glides 16 f@60 on `E.glideOut` (8 f at 30 fps), smeared along its motion by a 180° shutter; a step that starts before the last has landed blends out of it | `fx/GlideStep` (a list: `HardStep`'s props), `glideValue`, `glideBox` | `motion-snap`: at most 0.6 undeclared one-frame changes per 3 s; lint `snap-step` |
| One snap per film | a stepped list, a snap zoom or a line snap is the film's one snap device, declared through its `declares()` in `src/sync.ts` (declarations named alike, `tick-0` ... `tick-9`, are one device) | `fx/HardStep`, `fx/SnapZoom`, `fx/LineSnap` | `motion-snap`: more than 1 declared device fails; lint `snap-step` |
| Holds rest, nothing dies | a hold may be completely still (house: no drift; a creep at most 0.2 px a 60 fps frame, one way); what changes in it is the product (a value, a row, a cursor, a line building). 2.5 s where nothing at all changes is a dead stretch | `holdDrift(f, from, { px, angle })` (house 0) | `motion-frozen` / `dead-stretch`: 2.5 s in a row where nothing changes fails (the opening 0.5 s, the end lock and declared freezes aside); lint `camera-float` (a drift over 0.2 px/f@60) |
| Moves land with a tail | arrivals settle from their peak to 20 % of their speed over 4-6 f@30: `E.glideOut` over 16 f@60 or more, `E.settleOut` for UI cards. The 1.1 `E.out` over 16 f settles in 3 f@30 and the film's median drops under the gate | arrive tokens (§2) | `motion-decay`: a median under 3.5 f@30 fails |
| One carrying move per 3 s | at most 2 primary moves per 3 s, each 48 f@60 or longer; secondaries overlap the primary by 30-50 % instead of queueing after it | `overlapAt`, `leadBy`, `camPath` | `motion-density`: more than 2 primary moves per 3 s fails; lint `move-queue` |
| The camera moves with a purpose | the stage camera is still; an act declares a move only where it shows something: a push that closes on the control that changes, a track that follows what travels, a pull that reveals the whole (house push x1.06, pull x0.94, track 120 px, 72 f on `E.strongInOut`, from rest to rest); under a move the planes part (`Depth z`: a back layer 0.6, a near plane 1.35, the ground held at 0). A list scrolls when the product scrolls it (`scrollBy`), a landing settles on a short tail (`tail`, 16 px) and rests. No float, no sway, no bob, no breathing UI | `ActStage` `moves` / `stageMove`, `stageAt` (`lib/drift.ts`, `fx/Float`), `Depth`, `scrollBy`, `tail` | `camera-wander`: a slow pan or push one way and back inside a shot warns, in two shots fails; a camera that never rests warns; lint `camera-float`, `idle-bob`, `card-tilt` |
| Land before the cut | a cut or an unmount waits until the move is under 10 % of its peak speed, unless a declared whip or velocity seam carries it across | `landBeforeCut(move, cut)` (throws at import with the frame it lands on), `latestStart(cut, dur, ease)`, `landedAt(move)` | `motion-stop`: a move going still in one frame from above 15 % of its peak fails; `motion-cut`: a cut into a braking move warns; lint `unmount-moving` |

```ts
const rows = <GlideStep frame={F} jump={ROW} at={[CUE.a, CUE.b, CUE.c]} width={W} height={H}>{list}</GlideStep>;
const box = glideBox(F, [{ at: CUE.pick, value: picked }], resting);          // a selection box glides to its row
const exitAt = landBeforeCut({ from: CUE.slide, dur: f60(34), ease: E.glideOut }, ACT.next.from); // fails at import if early
<ActStage from={ACT.feed.from} moves={[stageMove(CUE.focus, 'push')]}><Feed /></ActStage> // Film.tsx: a declared push that lands
const y = scrollBy(F, CUE.scroll, { pxS: 24, to: CUE.found }).y;             // the product scrolls its feed, then rests
const t = tail(F, CUE.land, { angle: 0 });                                   // the card settles 16 px after it lands, then rests
<Depth z={DRIFT.depth.back}>{backCards}</Depth>                              // the back layer lags the declared push: parallax
```

## 7. Scale: log space, oversized landings, breath

- **Scale and zoom interpolate in log space**: `lmix(a, b, t) = exp(mix(log a, log b, t))`, and `zoomAt(f, a, b, from,
  to, ease = XP.travel)` = from · (to / from)^ease(p) is the house zoom: equal eased time buys an equal ratio. A scale
  tweened in value space over a ratio of 1.6 or more fails `linear-motion` (it slows on screen as it grows). Remotion's
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
  the holds as craft. A stepped layer, like `HardStep`, is the film's one snap device (§6 "Continuous motion"): a
  second one glides instead (`fx/GlideStep`, `glideValue`). `collage({...})` builds a stop-motion collage: elements born as cuts on irregular gaps (house
  4 f average, 1-10 f), some re-cut larger a few frames later, a camera that steps on births and one slow push under
  the whole build (`M.collagePush`).
- Remotion's `posterize` holds an interpolation input for n frames; use `Stepped` for anything bigger than one value.

## 9. The pace knob

`PACE` in `lib/pace.ts` (`motion.js` in HyperFrames) holds every text default, in 60 fps frames (1.2: about 12 % quicker
than 1.1 in every duration, never under the reading floor `READ_WPS`, 3 words a second). A film picks one with
`PACE_NAME` in `timeline.ts` (calm unless the brief asks for energy); components read it from the film context, and
`grid-check.ts` checks `COPY` against the same numbers (`scripts/gen-pace.mjs` copies the check numbers after an edit;
`mirror.test.mjs` fails while they differ).

| Field | Calm (default) | Crisp | Meaning |
|---|---|---|---|
| `wordDur`, `ease` | 28, `snapOut` | 23, `snapOut` | a word's fade-in |
| `rise`, `riseDur` | 0.33 line box, 22 f on `M.rise` | 0.33, 19 f | a word's rise |
| `stagger`, `cadence` | 11, reading | 8, reading | mean gap between word starts; each gap from the previous word's length |
| `blur` | 0 | 0 | no entry blur on type by default (a focus-in word is a device: `FocusWord`) |
| `exit`, `exitDur`, `exitFade` | auto, 15, 9 | auto, 12, 7 | exits accelerate: full opacity into a cut or a mask, otherwise a short fade in the move's last half |
| `holdBase`, `holdPerWord`, `holdMin` | 36, 7, 52 | 28, 6, 36 | reading hold = max(holdMin, holdBase + holdPerWord·words); with the reveal never under 3 words a second (`READ_WPS`) |
| `readMax` | 150 | 120 | a reading window counts as alive for at most this long |
| `gapMin`, `gapMax` | 26, 90 | 16, 90 | picture beat between two fragments of a chain |
| `maxNewWords`, `maxVisibleBuild`, `maxVisibleReplace` | 4, 8, 5 | 5, 10, 10 | words per fragment; words visible at once |
| `maxWordsPerSec`, `avgWordsPerSec`, `maxWords` | 1.35, 1.0, 30 | 2.25, 1.35, 35 | copy rate and total |
| `textShare`, `freeRun`, `maxGap` | 0.65, 90, 72 | 0.8, 60, 48 | share of frames with copy; the text-free run each 10 s; frames without an event |
| `accentHold`, `accentCool` | 16, 12 | 6, 12 | the newest fragment holds the accent, then cools to ink linearly |
| `recentre`, `recentreDur`, `recentreLead` | jump, 19, 0 | jump, 14, 0 | a build line re-centres with a jump on `E.jump` |
| `move` | 0.44 s + 1.4 ms/px, camera 0.8-2.65 s | 0.31 s + 1.2 ms/px, 0.53-2.1 s | `durFor()` |
| `fx` | MaskRise 9 f a unit, 9 apart, a linear head that stops, the last word 2.8× longer; TypeOn 2 f a character (30 cps); Scramble a lock every 3 f from the centre at 10 Hz; Roll 80 / 16; Morph 46; Iris 16 f in rate mode (×1.28 a frame) | the same, faster where it matters (MaskRise 9 f, 7 apart; Roll 53 / 12; Morph 35) | component defaults |

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
  `spring-range`, `scale-from-zero`, `fade-exit`, `linear-opacity`, `linear-motion` (error), `deprecated-token`, `interpolate-clamp`, and the
  continuous-motion rules `snap-step`, `camera-float`, `idle-bob`, `card-tilt`, `unmount-moving`, `move-queue`.
- `grammar-score.mjs`: `role-mix`, `front-loaded`, `into-cuts`, `durations`, `staggers`, `holds`, `velocity-seams`,
  `overlap` (`references/checks.md`).
- `forensics.py`: `dead-stretch`, `camera-wander`, `carried-cut`, stalls between two moving stretches (a hand-over eased to rest), spikes
  on fades, and the motion gates `motion-snap`, `motion-frozen`, `motion-decay`, `motion-density`, `motion-stop`,
  `motion-cut` (§6 "Continuous motion").
- Contact sheets at `--every 1` across every landing: the contact frame shows the squash, the frame before shows
  speed, nothing interpenetrates on the overshoot frames.
