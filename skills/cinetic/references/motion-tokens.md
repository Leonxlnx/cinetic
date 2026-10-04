# Motion tokens

Covers the house motion system: easing tokens and when to use each, spring presets and the damping rule, the `hitPulse` envelope, stagger and choreography constants, anticipation, landings and weight. Read it before Step 4 (Build), and whenever motion looks floaty, bouncy, uniform or mechanical.

The numbers are proven defaults, measured against Remotion 4.0.529 at 60 fps. Treat them as starting points: a brand with its own motion language wins, but keep it to a small set of named tokens.

**Contents**
1. [The laws](#1-the-laws)
2. [Easing tokens](#2-easing-tokens)
3. [Springs](#3-springs)
4. [Scale, zoom and stepped looks](#4-scale-zoom-and-stepped-looks)
5. [hitPulse: the one envelope for punches and ticks](#5-hitpulse-the-one-envelope-for-punches-and-ticks)
6. [Choreography and stagger](#6-choreography-and-stagger)
7. [Anticipation, contact and landing](#7-anticipation-contact-and-landing)
8. [Starter primitives](#8-starter-primitives)
9. [Checks](#9-checks)

---

## 1. The laws

- **All motion comes from `src/lib/anim.ts`**: `E` (easing tokens), `SPR` (spring presets), `tw`, `prog`, `mix`, `lmix`, `clamp`, `spr`, `hitPulse`, `squash`, `blurIn`, `blurOut`, `arrive`, `arriveK`, `depart`, `rand`, `fd`, `stagger`, `inertia`, and the types `Ease` and `Spr`. A raw `Easing.bezier(…)` or `Easing.spring` anywhere else is a lint error (`scripts/lint-film.mjs`), and spring configs belong in `SPR` for the same reason: consistent motion is what makes it read as a brand, and ad-hoc curves are what make it read as generated. Need a new curve or spring? Add a named token with a comment saying its job.
- **Entrances decay, exits accelerate.** Things arrive fast and settle (`E.out`); they leave slowly then fast (`E.in`). Only the camera eases both ways.
- **Fades run 10–14 f on `E.smooth`.** Never fade out on `E.out`: it puts half the change in the first frame, so the element pops to 55% and then drifts. A 6 f `E.in` fade does the reverse and vanishes in about one frame.
- **Linear is for drift only** (a constant background creep, a clock). Anything that starts or stops uses a curve.
- **Duration scales with distance.** `0.35 s + 1.35 ms per px`, clamped to 0.6–2.4 s for camera moves. The longest move in a film lasts at least 3× the shortest, or everything feels the same speed.
- **Consecutive moves overlap by about 20 f** (more when the first move is slow), with the second starting on a zero-slope curve (`E.rest`, `E.smooth`). Two moves that each ease to rest and then restart read as stall-then-lurch (`references/camera.md` §6).
- **One hero motion plus at most two supporting motions** at any moment. Stillness after motion is a tool; idle bobbing everywhere is noise.
- **Speed limit:** anything faster than 12 px/f needs motion blur in the master (`references/finishing.md`); unblurred moves above about 20 px/f strobe. Pair fast with still: a 60–70 px/f whip reads best next to 0.3–0.6 px/f calm.
- **Smooth, or it doesn't ship.** Jitter, pixel-snap stairs (`references/chromium-rendering.md`), single-frame pops and stall-then-lurch block the ship: the gate needs zero `forensics.py` fails and Finish at 5 (`references/review-loop.md` §10), however good the idea is.
- **Discrete state reads whole frames.** Anything that switches (typed characters, labels, counters, layout thresholds) uses `fd(f)` (`Math.round`), so every motion-blur sub-sample of a frame agrees.

```ts
import { FPS } from '../timeline';
/** Frames for a move of `px` pixels: 0.35 s + 1.35 ms/px, camera moves clamped to 0.6-2.4 s. */
export const durFor = (px: number, camera = false) => {
  const s = 0.35 + 0.00135 * px;
  return Math.round((camera ? Math.min(2.4, Math.max(0.6, s)) : s) * FPS);
};
// durFor(150) = 33 f, durFor(350) = 49 f, durFor(1200, true) = 118 f
```

## 2. Easing tokens

`E` in `src/lib/anim.ts`, each an `Easing.bezier`. Values are the eased progress at 25% and 50% of the time; "peak" is where velocity is highest.

| Token | Bezier | 25% / 50% | Peak | Use for | Not for |
|---|---|---|---|---|---|
| `out` | .16,1,.3,1 | .83 / .97 | at start | arrivals, reveals, word entrances | fade-outs, anything leaving |
| `outSoft` | .22,1,.36,1 | .77 / .96 | at start | gentle settles, secondary arrivals | hero impacts |
| `in` | .7,0,.84,0 | .00 / .03 | at end | implosions, hard snaps out | short fades (vanishes in 1 f); ordinary exits into a cut (too steep) |
| `exit` | .55,.055,.675,.19 | .04 / .15 | at end (2.7× mean) | exits into a cut: speed grows about ×1.1–1.2 per frame over the last 10–24 f, the cut on the fastest frame | arrivals |
| `inOut` | .87,0,.13,1 | .04 / .50 | 50% (7.7× mean) | whips, lockup slides, morphs | slow moves (feels like a jump) |
| `smooth` | .65,0,.35,1 | .07 / .50 | 50% (2.9×) | fades, drifts, holds, breath | arrivals (starts too slow) |
| `ui` | .4,0,.2,1 | .24 / .78 | 30% | small UI changes: toggles, chips, rows | camera |
| `cam` | .48,.1,0,.9 | .28 / .83 | 27% | camera pushes: slow start, early peak, long settle | UI |
| `glide` | .47,.2,.15,1 | .27 / .82 | 31% | 150–350 px element moves with a soft landing | long travels |
| `rest` | .45,0,.1,1 | .23 / .82 | 29% | any move that must end at rest; chaining after another move | impacts |
| `contact` | .55,0,.9,.55 | .04 / .17 | at end (4.5× mean) | accelerating into an impact: it arrives with velocity | anything that should settle |
| `whip` | .6,0,.15,1 | .10 / .75 | 39% | feature-to-feature whips, 24–30 f | holds |
| `dolly` | .35,0,.65,1 | .15 / .50 | 50% (1.5×) | slow push through a hold | reveals |
| `type` | .5,1,.89,1 | .44 / .75 | at start (2×) | an eased typewriter's character count (`TypeOn`) | motion of any kind |
| `linear` | – | .25 / .50 | flat | drift, clocks, constant creep | anything that starts or stops |

- **A film uses about three easing characters** most of the time, typically `out` for arrivals, `cam` for the camera and `in` for exits, with the rest reserved for the moments that need them. Ten curves in equal measure read as no system.
- **Specialist curves** that proved themselves in Tessel. Add them to `E` when a seam needs them:

| Name | Bezier | Job |
|---|---|---|
| `split` | .33,0,.1,1 | a window splitting open on a seam |
| `close` | .55,0,.15,1 | a swing-shut that lands on the next act's first frame |
| `pull` | .5,0,.12,1 | a long pull-back |
| `iris` | .4,0,.7,.92 | an iris, applied in log space, landing with a little speed |
| `shutter` | .2,.7,.2,1 | a collapse already moving on its first frame |
| `hop` | .35,0,.7,.85 | eases off, lands with a little speed (ballistic hops) |

- **`Easing.spring()` is not expo-out.** It maps t ∈ [0,1] onto a normalized spring that starts from zero velocity: `Easing.spring({damping: 200})` gives 0.057 at t = 0.05 and 0.453 at t = 0.2, against 0.281 and 0.752 for `E.out`. It feels late and soft. The default config overshoots to 1.163. Use `spring()` for physics and `E.out` for decaying arrivals.
- **Always clamp.** `interpolate()` extrapolates by default; `tw()` and `prog()` clamp both sides. A raw `interpolate` without `extrapolateLeft/Right: 'clamp'` is a lint error.
- **Pass the curve explicitly.** Write `prog(f, a, b, E.smooth)`, not `prog(f, a, b)`, even where the default would do: a helper default of `E.out` caused four fade-out pops in Tessel.

Multi-segment moves take one easing per segment (n − 1 for n keyframes):

```ts
import { interpolate } from 'remotion';
import { E } from '../lib/anim';
// rise, hold, fall: in 18 f on out, hold, leave 14 f on in
const y = (f: number) =>
  interpolate(f, [0, 18, 90, 104], [40, 0, 0, -40], {
    easing: [E.out, E.linear, E.in],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
```

## 3. Springs

`spring({frame, fps, config: {damping, stiffness, mass, overshootClamping}})` is real physics, and its frames can be computed for sound sync (`references/timing-grid.md` §7). Presets in `SPR`:

| Preset | damping / stiffness / mass | ζ | Overshoot | 50% / 100% | Settles | Character, use |
|---|---|---|---|---|---|---|
| `snap` | 18 / 260 / 0.7 | 0.67 | 6% | 5 f / 10 f | 22 f | locks into place with a small overshoot: impacts, lock-ins |
| `pop` | 11 / 180 / 0.6 | 0.53 | 14% | 5 f / 9 f | 32 f | a small object landing in its slot (a check badge that cannot collide): a true landing only, one of the 2 |
| `land` | 14.5 / 200 / 1 | 0.51 | 15% | 6 f / 11 f | 40 f | a real bounce on a true landing: one of the 2 |
| `micro` | 30 / 500 / 0.6 | 0.87 | 0.4% | 4 f / 11 f | 11 f | fast and precise: chips, badges, UI micro-states |
| `firm` | 24 / 140 / 1 | 1.01 | 0% | 9 f / at rest | 38 f | the critically damped workhorse: UI arrivals |
| `soft` | 26 / 120 / 1 | 1.19 | 0% | 10 f / at rest | 41 f | weighty: panels, cards, large type |
| `heavy` | 30 / 90 / 1.4 | 1.34 | 0% | 13 f / at rest | 56 f | slow and massive: full-frame surfaces |

"Settles" is `measureSpring` (within 0.005 of rest). Configs that earned a name in Tessel and are worth adding to `SPR` when a film needs them:

| Name | damping / stiffness / mass | Overshoot | Job |
|---|---|---|---|
| impact | 23 / 320 / 1 | 7% | the upper limit for a visible impact |
| detent | 24 / 380 / 0.6 | 1.6% | a reel or picker clicking home |
| check | 12 / 220 / 0.5 | 11% | a tiny check badge landing (50% at 4 f): one of the 2 |
| tile | 15 / 150 / 0.7 | 3.4% | tiles snapping into a grid (cue at 0.92) |
| wordSlide | 20 / 170 / 0.9 | 1.3% | two words locking, clamped at the lock (reaches 1 at 19 f) |

Rules:
- **Default to critical damping**: `damping ≥ 2·√(stiffness·mass)` (ζ ≥ 1), or an ease. Bouncy springs everywhere are the most common tell of generated motion, and a hard ban (`SKILL.md`).
- **Overshoot belongs only to a true landing**: an object arriving at a surface or a lock, with a contact you could put a sound on. Keep it to 1–7% (`snap`, `impact`), and use at most two visible landings per film, counting every `pop`, `land` or `check`. A card, a label, a chip or a camera that merely arrives never overshoots.
- **Clamp overshoot wherever it could collide or go negative.** A piece arriving from the left must not pass its slot; a word sliding in must not close the word space (Tessel's "Everythingfits" frame). Either clamp the offset or set `overshootClamping: true`, which stops the spring dead on arrival; put the impact in a `hitPulse` punch instead.
- **Snap the tail to rest** when `|1 − s| < 0.01`, so labels never creep a sub-pixel across a cut.
- **A spring before its start frame is 0** (`spring()` returns 0 for negative frames), so `spr(f, start, cfg)` needs no guard.

```ts
import { SPR, spr } from '../lib/anim';

// spr(f, start, cfg) = spring({ frame: f - start, fps: FPS, config: cfg })
const s = (f: number, start: number) => {
  const v = spr(f, start, SPR.snap);
  return Math.abs(1 - v) < 0.01 ? 1 : v; // no sub-pixel creep at rest
};
// arrives from the left; never passes its slot, however the spring overshoots
const pieceX = (f: number) => Math.min(0, (1 - s(f, 8)) * -1150);
// geometry fed by overshoot is clamped, or Chromium keeps the stale SVG value
const radius = (f: number) => Math.max(0, 30 * (1 - s(f, 8)));
```

- **`measureSpring({fps, config, threshold})`** returns the frames until the spring stays within `threshold` (default 0.005) of rest. Use it to size a `<Sequence>` or to start the next move once this one has truly settled.
- **`spring({…, durationInFrames: n})`** stretches the same physics to a fixed length, which is handy when a spring must fit a bar. It keeps the overshoot shape, so recompute sync frames with it.

## 4. Scale, zoom and stepped looks

- **Scale and zoom interpolate in log space**: `lmix(a, b, t) = exp(mix(log a, log b, t))`. A linear 1 → 4 zoom spends most of its time at the small end and then rushes; log space feels like constant speed.
- **`output: 'perceptual-scale'` is not log space.** It is area-linear: for 1 → 4 the midpoint is 2.92, against 2.0 for `lmix`. Use `lmix` for camera and iris moves.
- **`posterize: n`** holds the input for n frames (`interpolate(f, [0, 10], [0, 1], {posterize: 3})` gives 0, 0, 0, 0.3, 0.3, 0.3, …). Use it only for a deliberate stop-motion look (`posterize: 5` at 60 fps reads as 12 fps), and never on text that must read smoothly.

```ts
import { E, lmix, prog } from '../lib/anim';
// an iris that contracts from 80x onto a 28 px dot by the first beat, evenly paced
const irisScale = (f: number, beat: number) => lmix(80, 1, prog(f, 0, beat, E.linear));
```

## 5. hitPulse: the one envelope for punches and ticks

Every punch, tick and beat pulse uses the same attack-decay envelope:

```ts
// in src/lib/anim.ts: t is in the film's frames; attack and tau are 60 fps frames
export const hitPulse = (t: number, attack = 2, tau = 5) => {
  const u = (t * 60) / FPS; // so a pulse lasts the same time at any fps
  return u <= 0 || u > attack + 6 * tau ? 0 : u < attack ? Math.sin((u / attack) * (Math.PI / 2)) : Math.exp(-(u - attack) / tau);
};
```

- **Shape:** rises on a quarter-sine to 1 at `attack` frames, then decays exponentially (0.37 at `attack + tau`, 0.05 at `attack + 3·tau`), and ends at `attack + 6·tau`. With the defaults it peaks 2 f after the cue and is gone by 32 f at 60 fps (1 f and 16 f at 30 fps: the input is scaled by 60/FPS, so every number in this file keeps its duration in seconds).
- **Why not a half-sine:** `sin(π·t/N)` on a hard window has a velocity step at both ends (a visible clunk), and its peak lands N/2 frames after the sound: 6–8 f late in practice.
- **Why 2 f after the sound:** picture that answers a sound a hair later reads as caused by it; picture that leads reads as "sound late".
- **Repeating ticks take the max, independent causes add:** `Math.max(...beats.map((b) => hitPulse(f - b)))` so overlapping ticks never stack, and `1 + a·hitPulse(f - x) + b·hitPulse(f - y)` for two different impacts.

Amplitudes that worked (scale = `1 + amp · hitPulse(…)`):

| Use | Amplitude | Envelope |
|---|---|---|
| clock tick on a small dot | +18–30% | `hitPulse(t)` |
| whole-mark beat punch in a hold | +1.5% | `hitPulse(t)` |
| lock-in punch when a piece lands | +2.5–3% | `hitPulse(t)` |
| payoff camera punch | +1.2% | `hitPulse(t, 3, 7)` |
| word-lock punch | +1.8% | `hitPulse(t, 1, 4)` |
| final blink of the mark | ≤ +10% (keep the mark's gaps ≥ 8 px) | `hitPulse(t)` |
| contact squash | +8% wide, −10% tall | `squash(t)` = `hitPulse(t, 1, 4)` |

## 6. Choreography and stagger

| Pattern | Constant | Note |
|---|---|---|
| Statement words | 6 f apart, each 26 f on `E.out` | Tessel headlines ran 9 f / 28 f; a quiet descriptor 5 f / 24 f |
| Burst words | 4 f apart | a punchy line landing on one beat |
| Word exit | half the entry stagger, 16 f on `E.in` | exits are quicker than entrances |
| Grids | 4 f per column, 6 f per row | reading order: left to right, then down |
| Lists | 15 f per row (an 8th at 120 BPM) | locked to tempo |
| A whole group | arrives within 30 f | longer reads as a queue, not a group |
| "Human" gaps | irregular 7, 12, 18 f | clicks, keystroke bursts, a person's rhythm |
| Spatial ripple | delay = distance / 60 px (1 f per 60 px) | from the cause outward, or from the centre |
| Batch landings | 16th grid, 0–3 f seeded spread, first on the beat | `references/timing-grid.md` §5 |

- **Order a stagger by importance, not by DOM order.** The element that carries the idea arrives first (or last, as the punchline); decoration never leads.
- **A word reveal** (`src/fx/Words.tsx`): per word over 26 f on `E.out`, opacity 0 → 1, `translateY` 0.32 em → 0 through `arrive(p)`, blur 8 → 0 px (4–6 px for body lines, or none) through `blurIn(p, px)`, which is clear by 60% of the eased move. Blur only on entry, never left on readable text for more than 6 f. `blurIn` and `arrive` exist because Chromium steps blur radii (~0.5 px; under ~0.75 px renders fully sharp) and snaps vertical text to whole pixels, so a slow finish would snap into focus or settle in 1 px ticks (`references/chromium-rendering.md` §3, §15). Recipes for slams, locks and type that becomes the mark are in `references/copy-and-type.md` and `references/transitions.md`.

```ts
import { E, prog } from '../lib/anim';
// a ripple from a cause at (cx, cy): each tile starts distance/60 frames after `at`
type Tile = { x: number; y: number };
const rippleIn = (f: number, at: number, t: Tile, cx: number, cy: number) => {
  const start = at + Math.hypot(t.x - cx, t.y - cy) / 60;
  return prog(f, start, start + 18, E.out);
};
// a grid: 4 f per column, 6 f per row
const gridIn = (f: number, at: number, col: number, row: number) =>
  prog(f, at + col * 4 + row * 6, at + col * 4 + row * 6 + 22, E.out);
```

## 7. Anticipation, contact and landing

Weight comes from how a thing starts and stops. These recipes carry the exact numbers Tessel shipped with.

- **Anticipation.** Before a hero move (not a UI tweak), pull 2–4% of the distance the opposite way over 6–10 f on `E.smooth`, then start the main move on a zero-slope curve (`E.rest`, `E.whip`). Use it once or twice per film; on every move it becomes cartoonish.
- **Accelerate into contact.** A thing that hits something must still be moving on the contact frame: drive position with `E.contact` (or `E.in` over the last 10 f of a drop). An ease-out into a wall has no impact frame to put a sound on.
- **Shape settles before position.** Width, height and radius finish 6 f before contact, on their own curve. Driving shape with the position ease crams the aspect change into the last 1–2 frames, where it reads as a cut.
- **Contact squash.** On impact, widen and flatten against the contact edge: width × (1 + 0.08·q), height × (1 − 0.10·q), with `q = hitPulse(t, 1, 4)`, anchored at the edge it hit. `squash(t)` in `anim.ts` returns `{ along, across }` with exactly these factors.
- **Landing settle**, for one of the film's two true landings only: `scale = 1 − exp(−t/4)·sin(t/1.6)·0.035`, plus an outline ring `exp(−t/9)` meaning "just moved".
- **Falling card:** accelerate over 16 f with `((t + 16)/16)^2.2`, then settle `exp(−t/5)·sin(t/2.2)·10` px.
- **Lift and fly:** lift over 14 f on `E.out` (z 70–130 px), travel on `E.inOut` with a `sin(π·t)·50` px arc, drop over the last 10 f on `E.in`. Ground shadow offset `(z·0.1, z·0.22)`, blur `3 + z·0.06` px, alpha `0.2 − 0.1·min(1, z/200)`. Paint lifted items above grounded ones (sort by z).
- **Leaving for good:** drift 900 px off-frame while rising in z, fading over frames 22–46 of the move on `E.in`.

```ts
import { E, mix, prog, squash } from '../lib/anim';

type R = { x: number; y: number; w: number; h: number };
/** Move box a onto box b so it arrives with velocity at `to` and squashes against its bottom edge. */
export const land = (f: number, from: number, to: number, a: R, b: R): R => {
  const move = prog(f, from, to, E.contact); // centres accelerate into contact
  const shape = prog(f, from, to - 6, E.inOut); // proportions settle 6 f early
  const q = squash(f - to); // the impact, felt in the shape
  const cx = mix(a.x + a.w / 2, b.x + b.w / 2, move);
  const cy = mix(a.y + a.h / 2, b.y + b.h / 2, move);
  const w = mix(a.w, b.w, shape) * q.across;
  const h = mix(a.h, b.h, shape);
  const hs = h * q.along; // squashed against its own bottom edge
  return { x: cx - w / 2, y: cy + h / 2 - hs, w, h: hs };
};
```

## 8. Starter primitives

`src/fx/` in the Remotion starter holds tested versions of the moves generated films most often get wrong. Each is a pure function of the frame, placed by transform, built on `E`, `fd`, `arrive` and `blurIn`, with its failure mode in its doc comment. Defaults are 60 fps frames (converted with `f60`).

| File | What it does | Defaults | Serves |
|---|---|---|---|
| `TypeOn.tsx` | typewriter with a caret; `typeOn()` gives the caret x (stepped and continuous, for a camera follow), `typeFrames()` the whole frame each key lands | 2 f per character on `E.type` (last key at ~80% of the box) or a linear `cps`; head fade 4 f; caret solid while typing, 30 f on / 30 f off when idle | prompts, search bars, a headline typed on |
| `Scramble.tsx` | decode reveal: glyphs cycle through same-class, same-width glyphs, then lock; `scrambleFrames()` gives the lock frames | fade-in 10 f, hold 18 f, a lock every 3 f left to right (or seeded random), ~1.5 glyph changes per frame, cycling glyphs in `C.mute` | IDs, prices, codenames, a stat that resolves |
| `Roll.tsx` | rolling digits in per-column masks; `countSteps()` turns a count into steps, so a fast count spins like an odometer | each changed digit slides 14 f on `E.out` through `arrive` (k from `arriveK`), starting 1 f before its step; count 60 f on `E.out`; tabular, fixed columns | counters, totals, a metric that counts up |
| `Morph.tsx` | one rounded rect from state A to B (x, y, w, h, radius, fill, stroke, shadow) that clips each state's content, which stays put; `morphBox()` gives the geometry | 40 f on `E.inOut` (or a `SPR.firm` spring); content A out over the first 35%, B in over the last 40% | pill → card, button → panel, caret → pill |
| `Iris.tsx` | reveal (or a solid accent flood) through a clip circle from a point; `close` reverses it | 24 f, radius 1 px → far corner + 2 px in log space on `E.out` (`E.in` closing); optional ring ahead of the edge | a glyph or button opening the next shot, the one accent flood |
| `MaskRise.tsx` | words or lines rise from behind a clip under the baseline and leave through the top | 30 f per unit on `E.out` through `arrive` (k from `arriveK`), 5 f stagger; exit 16 f on `E.in`, half the stagger | headlines, captions, the closing line |

In `src/lib/`: `stagger(i, n, span, ease)` spreads starts over a span; `inertia(f, start, v0, decay = 0.89)` coasts a scroll that enters at peak speed (closed form; 8.6·v0 px of travel, within 0.5 px of rest after about 60 f); `zoomHandoff(t, v0, settle = 30)` in `camera.ts` continues a zoom-through at the outgoing log-scale speed (`zoomSpeed`) and decays it to rest, so the cut reads as one move (`references/transitions.md` §4.8).

## 9. Checks

- `node scripts/lint-film.mjs src`: no raw curves outside `anim.ts`, no unclamped `interpolate`, no CSS transitions or animations.
- Contact sheet at `--every 1` across every landing (`scripts/sheet.py`): the contact frame shows the squash, the frame before shows speed, and nothing interpenetrates on the overshoot frames.
- `scripts/forensics.py` stalls and spikes: a stall between two moving stretches means a handoff eased to rest; a spike on a fade means an `E.out` fade-out.
