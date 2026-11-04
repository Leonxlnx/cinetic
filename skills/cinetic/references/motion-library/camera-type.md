# Camera and type

How the camera moves and how type is set and timed: velocity cuts, pushes that land, the centred word build, following
the action, the type system, readable time, pushes into a cut, punch-ins, pull reveals, colour emphasis, whips, giant
type, 3D planes, face switches, rack focus, letter lockups, typing cameras, pulsed travel, decode and slot rolls, tracking,
rolls, cranes, orbits, zoom-out exits, brackets, blur-resolve type, drift tails, slot reveals, plate pushes, parallax,
panel cameras, the UI canvas camera, type exits, stacked captions, handheld micro-moves and the lens bulge. Each entry
gives the job, the numbers, named presets, what makes it rich or cheap, and Remotion 4 code on a shared camera kit.

**Units.** px at 1920 x 1080; frames at 30 fps unless noted; scale as a ratio (1.0 = rest). Camera speeds are px per frame
at 1920 wide; "% per frame" for scale is the per-frame scale change.

---

## Ten laws

1. **A camera move is a sentence:** it starts, travels and lands, or it leaves at full speed into a cut. Never a wander.
   If a hold needs life, use the tail of the last move (`drift-tail`), not a new drift.
2. **Cut while moving, arrive moving.** Exit on the fastest frame; the next shot enters in the same direction at 0.6-1.0x
   that speed and brakes. Hard cuts between two still frames are the template look.
3. **Scale lives in log space.** Interpolate `log(s)`; pushes land at 1.04-1.5, pulls at 0.65-0.96; creeps run 0.1-0.4 % per
   frame.
4. **Accelerate exponentially, decelerate first-frame heavy.** Exits multiply the per-frame step (x1.3-x2 per frame);
   arrivals put 55-65 % of the travel in the first quarter. Never a plain ease-in-out for a camera.
5. **The camera lands clean** (an overshoot on 2 % of moves at most). Objects bounce; cameras do not.
6. **Motion blur is a film-wide choice:** 0.5 x the per-frame step (or 7-25 % of the travel on cranes), or none at all.
   Never partial within a film.
7. **The camera follows the action** (the caret, the cursor, the typing line, a growing chain) and steps with the source
   rhythm.
8. **Type is one centred line of 1-5 words,** its ink 35-70 % of the frame width, the size set to that measure (not a
   fixed size per film).
9. **Display tight, labels wide:** display -0.01 to -0.05 em at weight 400-600; caps labels +0.06 to +0.32 em; a serif
   italic for the one word that should feel human; no underlines.
10. **Readable time:** one word stays 0.5 s or more; a 4-5 word statement builds at 4-7 f per word and holds 0.9-1.5 s after
    its last word; about one headline word per second over a film.

## Camera numbers at a glance

| move | house size | duration | notes |
|---|---|---|---|
| fast pan | 4-40 % of the width (house 14 %) | 0.2-1.7 s (house 0.6) | peak 1.7-4.3 % of the width per frame; about 40 % start at peak speed, 35 % end at it |
| slow pan | 0.7-12 % of the width | 0.16-1 s | expo out (`panTo`) or expo in (`exitTo`), never linear; it may start at speed |
| push-in | x1.04-1.5 (house 1.115) | 0.4-1.4 s | first-frame heavy; lands clean; a creep after |
| pull-out | x0.65-0.96 (house 0.856) | 4-36 f | lands clean, or one 0.7 % settle |
| whip | 104-236 px per frame peak (house 130) | build 9-12 f, stop 7-30 f | blur 0.5 x step, or none |
| roll | -38 to +63 degrees | 0.2-1.3 s (house 0.4) | always returns to level; paired with a zoom |

A moving camera on about half of the frames; the rest hold or creep.

## Camera curves

House cubic-beziers for camera moves (x1, y1, x2, y2).

| token | bezier | use |
|---|---|---|
| `pushLand` | 0, 0.042, 0.199, 1.017 | a push that lands (25 / 50 / 75 % progress = 0.6 / 0.85 / 0.97) |
| `pullReveal` | 0.719, 0.157, 0.309, 1.11 | a pull-out with a 0.7 % settle |
| `pullLand` | 0.221, 1.108, 1.0, 0.902 | a pull-back that lands |
| `pushYaw` | 0.562, 0.144, 0.199, 0.916 | a push with a yaw and a lens bulge |
| `pushPeak` | 0.704, 0.265, 0.264, 0.977 | a long push peaking late |
| `pullBackSoft` | 0.569, 0.368, 0.25, 0.964 | a soft pull-back 1.331 -> 1.0 |
| `whipBuild` | 0.854, 0.06, 0.425, 0.936 | a whip with a 12 f build and a 7 f stop |
| `whipIntoCut` | 0.23, 0.0, 0.72, 0.12 | pure acceleration into a cut |
| `diagPan` / `hPan` / `vPan` | 0.811, 0.06, 0.123, 0.945 / 0.87, 0.074, 0.459, 1.034 / 0.725, 0.04, 0.154, 0.793 | needle-peaked pans |
| `whipUp` | 0.527, 0.157, 0.855, 0.206 | an accelerating vertical exit |
| `slowZoomOut` | 0.5, 0.1, 0.7, 0.41 | a quad-in zoom-out into the end |
| `tilt3d` | 0.45, 0, 0.55, 1 | a camera tilt 90 -> 12 degrees |
| `panEaseOut` / `panEaseIn` | 0.1, 0.7, 0.3, 1 / 0.55, 0, 1, 0.45 | pans that land / pans that leave |
| `expoOut` | 0.16, 1, 0.3, 1 | a push x1.41 that lands |
| `smoothZoomScroll` | 0.74, 0.13, 0.27, 0.84 | a combined zoom and scroll over a UI canvas |

Per-frame laws:

- **Velocity-doubling exit:** v(n) = v0 x r^n with r = 2, 1.6 or 1.35-1.45.
- **Decaying entry after a velocity cut:** v(n) = v0 x d^n with d = 0.55 (a 5-frame snap), 0.62-0.70, or 0.83 (a long brake).
- **Exponential push:** per-frame scale ratios 1.004, 1.006, 1.008, 1.011, 1.013, 1.017, 1.022, 1.028, 1.034, 1.043, 1.067,
  1.129.
- **Expo tail into a constant zoom:** 17, 9.4, 4.2, 2.4 % per frame, then a constant 0.10-0.17 % per frame.
- **Line re-centre:** x(t) = target + (jump - target) x exp(-t / 2.6 f), or the per-frame fractions 0, 0.69, 0.85, 0.93, 0.97,
  0.99, 1.0.
- **Creep:** s(f) = s0 x (1 + c)^(f - f0), c = 0.001-0.004 per frame.
- **Camera motion blur:** sigma = 0.5 x the per-frame step (or 7-25 % of the travel on cranes).
- **Camera springs** (when a spring is wanted): m 1, k 30.5, d 12.7 (damping ratio 1.15, very soft); m 1, k 120, d 18 (0.82);
  m 1, k 90, d 20 (1.05).

## Type at a glance

- Statements centred 80 % of their time or more, in the middle band 85 % or more, on one line 85 % or more.
- Statement cap height: a line alone 9.2 % of the frame height (never under 7 %, up to about 15 %; the claim 11.2 %), read in
  1.2 s at most; caps in general 16-165 px.
- Display tracking about -0.02 em; caps-label tracking about +0.12 em.
- Emphasis on 60 % of statements at most; by kind: colour first, then an object inside the line, brackets, outlines, a split;
  a box or a scribble seldom, never an underline.
- Ink follows the ground (dark on light, light on dark); chromatic ink on about one statement in six at most.

## Camera kit (`camtype.tsx`)

Every implementation imports this file (and `motion.tsx`, the animation kit in `animations.md`, saved beside it): a log-scale camera transform, the curve tokens, velocity build and decay helpers,
a camera blur from the per-frame step, a creep, a re-centre, and a per-frame table player.

```tsx
// camtype.tsx  (cinetic camera + type kit; Remotion 4.0.x, CPU only, deterministic: a pure function of the frame)
import React from 'react';
import {continueRender, delayRender, interpolate, staticFile} from 'remotion';
import {fitText} from '@remotion/layout-utils';
import {CL, ez, tbl, Bz} from './motion';

/* ---------- curves (the camera curve table above) ---------- */
export const CAM = {
  pushLand:      [0, 0.042, 0.199, 1.017],     // Push: 60 % in the first quarter, lands clean
  pushLandSoft:  [0.16, 1, 0.3, 1],            // expo-out: x1.41 / 33 f, 5.3 % / 12 f
  pushLong:      [0.068, 0.147, 0, 0.874],     // 5 s decelerating push
  pushYaw:       [0.562, 0.144, 0.199, 0.916], // Push (with yaw + bulge)
  pushPeak:      [0.704, 0.265, 0.264, 0.977],
  pushIntoCut:   [0.681, -0.006, 1, 0.648],    // Exponential push, cut at the top
  pushExpIn:     [0, 0.008, 0.861, 0.007],     // Ratios 1.004 -> 1.129
  pullReveal:    [0.719, 0.157, 0.309, 1.11],  // Pull-out, 0.7 % overshoot
  pullLand:      [0.221, 1.108, 1, 0.902],     // Pull-back that lands
  pullSoft:      [0.569, 0.368, 0.25, 0.964],
  pullBack:      [0.45, 0, 0.25, 1],
  pullExit:      [0.217, 0.056, 0.695, 0.26],  // Board exit (accelerating)
  slowZoomOut:   [0.5, 0.1, 0.7, 0.41],        // End zoom-out (quadIn)
  tlPush:        [0.039, 0.433, 0.416, 1.008], // Push about a panel centre
  boardPush:     [0.88, 0.174, 0.475, 0.76],   // Slow S-push
  whipBuild:     [0.854, 0.06, 0.425, 0.936],  // Whip: 12 f build / 7 f stop
  whipIntoCut:   [0.23, 0, 0.72, 0.12],        // Whip right, into the cut
  whipPan:       [0.396, -0.005, 0.107, 0.987],// Whip pan (9 f build, 30 f tail)
  whipUp:        [0.527, 0.157, 0.855, 0.206], // Vertical whip exit
  glideIn:       [0.021, 0.481, 0.353, 0.953], // Arrival after a whip
  giantPan:      [0.195, 0.805, 0.716, 0.935], // Pan along giant type
  panEaseOut:    [0.1, 0.7, 0.3, 1],
  panEaseIn:     [0.55, 0, 1, 0.45],
  diagPan:       [0.811, 0.06, 0.123, 0.945],  // Diagonal pan
  hPan:          [0.87, 0.074, 0.459, 1.034],  // Horizontal pan
  vPan:          [0.725, 0.04, 0.154, 0.793],  // Vertical pan
  craneIn:       [0, 0.004, 0.745, 0.335],     // Crane (accelerating)
  rollReturn:    [0.27, 0.866, 0.705, 0.98],   // Roll return (decay 0.83/f @24)
  tilt3d:        [0.45, 0, 0.55, 1],           // Camera tilt 90 -> 12 deg
} as const satisfies Record<string, Bz>;

/* ---------- camera state and the World wrapper ---------- */
export type Cam = {s: number; x: number; y: number; rot?: number; rx?: number; ry?: number; px?: number; py?: number};
export const CAM0: Cam = {s: 1, x: 0, y: 0, rot: 0, rx: 0, ry: 0};

/** Applies the camera to everything inside. Pivot defaults to the frame centre. perspective > 0 enables rx/ry (3D planes). */
export const World: React.FC<{cam: Cam; w?: number; h?: number; perspective?: number; children: React.ReactNode; style?: React.CSSProperties}> =
  ({cam, w = 1920, h = 1080, perspective = 0, children, style}) => {
    const px = cam.px ?? w / 2, py = cam.py ?? h / 2;
    const t3 = perspective > 0 ? ` rotateX(${cam.rx ?? 0}deg) rotateY(${cam.ry ?? 0}deg)` : '';
    return (
      <div style={{position: 'absolute', inset: 0, perspective: perspective > 0 ? `${perspective}px` : undefined,
                   perspectiveOrigin: `${px}px ${py}px`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: `${px}px ${py}px`,
                     transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.rot ?? 0}deg) scale(${cam.s})${t3}`,
                     transformStyle: perspective > 0 ? 'preserve-3d' : undefined, ...style}}>
          {children}
        </div>
      </div>
    );
  };

/* ---------- keyframed camera: each segment uses the curve of its arrival key; scale in log space ---------- */
export type CamKey = {f: number; s?: number; x?: number; y?: number; rot?: number; rx?: number; ry?: number; c?: Bz};
export const camTrack = (f: number, keys: readonly CamKey[], base: Cam = CAM0): Cam => {
  const val = (k: CamKey, p: keyof Cam) => ((k as any)[p] ?? (base as any)[p] ?? 0) as number;
  if (f <= keys[0].f) return {...base, s: val(keys[0], 's') || 1, x: val(keys[0], 'x'), y: val(keys[0], 'y'),
    rot: val(keys[0], 'rot'), rx: val(keys[0], 'rx'), ry: val(keys[0], 'ry')};
  let i = 0;
  while (i < keys.length - 2 && f > keys[i + 1].f) i++;
  const a = keys[i], b = keys[i + 1];
  const t = interpolate(f, [a.f, b.f], [0, 1], {...CL, easing: ez(b.c ?? CAM.pushLand)});
  const lin = (p: keyof Cam) => val(a, p) + (val(b, p) - val(a, p)) * t;
  const sa = val(a, 's') || 1, sb = val(b, 's') || 1;
  return {...base, s: Math.exp(Math.log(sa) + (Math.log(sb) - Math.log(sa)) * t), x: lin('x'), y: lin('y'),
          rot: lin('rot'), rx: lin('rx'), ry: lin('ry')};
};

/* ---------- per-frame laws (2.3) ---------- */
/** Velocity-multiplying exit: offset after n frames when the step starts at v0 and multiplies by r every frame. Fractional n allowed. */
export const whipOut = (f: number, f0: number, v0: number, r = 2) => {
  const n = Math.max(0, f - f0);
  return r === 1 ? v0 * n : (v0 * (Math.pow(r, n) - 1)) / (r - 1);
};
/** Decaying entry after a velocity cut: remaining offset to rest (sign = direction it comes from). */
export const whipIn = (f: number, f0: number, v0: number, d = 0.55) => -(v0 * Math.pow(d, Math.max(0, f - f0))) / (1 - d);
/** Exponential push from a per-frame ratio list, fractional frames interpolate in log space. */
export const ratioPush = (f: number, f0: number, ratios: readonly number[]) => {
  const n = f - f0;
  if (n <= 0) return 1;
  let s = 1;
  const k = Math.min(Math.floor(n), ratios.length);
  for (let i = 0; i < k; i++) s *= ratios[i];
  if (k < ratios.length) s *= Math.pow(ratios[k], n - k);
  return s;
};
/** Creep: a constant per-frame scale rate (0.001-0.004) authored at srcFps. */
export const creep = (f: number, f0: number, rate: number, fps: number, srcFps = 30) =>
  Math.pow(1 + rate, Math.max(0, ((f - f0) * srcFps) / fps));
/** Velocity-matched handover: the next shot's entry speed from the exit speed at the cut (k 0.6-1.0, same direction). */
export const handover = (vExit: number, k = 0.8) => vExit * k;

/* ---------- blur from camera speed and depth ---------- */
/** Motion blur sigma from the per-frame step (px). k = 0.5; 0 for no-blur films. Cap keeps the SVG filter cheap. */
export const camBlur = (stepPx: number, k = 0.5, cap = 60) => Math.min(cap, Math.abs(stepPx) * k);
/** DOF ladder: blur grows with distance from the focal plane. */
export const dof = (z: number, zFocus: number, pxPerUnit: number, max = 40, floor = 0) =>
  Math.min(max, floor + Math.abs(z - zFocus) * pxPerUnit);

/* ---------- type ---------- */
export const FACE = {
  grotesk: '"Inter Variable", Inter, system-ui, sans-serif',     // Inter / Inter Tight / SF Pro / Geist
  geist:   '"Geist Variable", Geist, sans-serif',
  mono:    '"Geist Mono Variable", "JetBrains Mono", monospace',  // labels, code
  serif:   '"Instrument Serif", "Newsreader", serif',            // display serif / the human word
  serifText: '"Source Serif 4", "Newsreader", serif',
} as const;
/** Tracking classes (em). */
export const TRACK = {display: -0.02, displayTight: -0.045, hero: -0.05, body: -0.01, label: 0.12, labelWide: 0.18, cta: 0.14, spaced: 0.32} as const;
/** Font-size from a target ink width (statement measure 35-70 % of the frame width). */
export const fitSize = (text: string, widthPx: number, family: string, weight: number, trackingEm = TRACK.display) =>
  fitText({text, withinWidth: widthPx, fontFamily: family, fontWeight: weight, letterSpacing: `${trackingEm}em`, validateFontIsLoaded: false}).fontSize;
/** Load a local OFL font file once (public/fonts/...). Call at module level of the composition file. */
export const loadFace = (family: string, file: string, descriptors: FontFaceDescriptors = {}) => {
  if (typeof document === 'undefined') return;
  const h = delayRender(`font ${family}`);
  const ff = new FontFace(family, `url(${staticFile(file)})`, descriptors);
  ff.load().then((f) => { (document.fonts as any).add(f); continueRender(h); }).catch(() => continueRender(h));
};

/** Readable time (`readable-time`): frames a statement must stay after its last word starts, and the minimum for a single word. */
export const readHold = (words: number, fps: number) => Math.round(fps * Math.min(1.5, 0.75 + 0.15 * words)); // 0.9 s @1 word .. 1.5 s @5
export const minWordOnScreen = (fps: number) => Math.round(0.5 * fps);

/** The canonical word entrance tables, played at any fps. */
export const RISE = [1, 0.667, 0.458, 0.354, 0.271, 0.229, 0.188, 0.167, 0.146, 0.125, 0.104, 0.104, 0.083, 0.063, 0.042, 0.021, 0];
export const INK = [0.34, 0.56, 0.69, 0.77, 0.82, 0.85, 0.89, 0.91, 0.93, 0.94, 0.95, 0.97, 0.98, 1];
export const wordIn = (f: number, f0: number, fps: number, risePx: number) => {
  if (f < f0) return {dy: risePx, o: 0, smear: 0};
  const k = Math.round(((f - f0) * 30) / fps);
  return {dy: risePx * tbl(f, f0, RISE, 30, fps), o: tbl(f, f0, INK, 30, fps), smear: k === 0 ? 6 * (risePx / 40) : k === 1 ? 3 * (risePx / 40) : 0};
};
/** Re-centre after an append. */
export const RECENTRE = [0, 0.69, 0.85, 0.93, 0.97, 0.99, 1];
export const recentre = (f: number, fAppend: number, from: number, to: number, fps: number) =>
  from + (to - from) * tbl(f, fAppend, RECENTRE, 30, fps);
```

## Index

| # | slug | entry | family |
|---|---|---|---|
| 1 | `velocity-cut` | cut while moving, arrive moving | camera, cut |
| 2 | `push-land` | a push-in that lands on the one element | camera |
| 3 | `word-build-centred` | the centred statement built word by word | type |
| 4 | `action-follow` | the camera follows the action | camera |
| 5 | `type-system` | face, weight, measure, tracking, colour | type |
| 6 | `readable-time` | the build-hold-exit clock | type, timing |
| 7 | `push-into-cut` | an accelerating push into a zoom cut or zoom-through | camera, cut |
| 8 | `punch-in` | punch-in and snap zoom by cut | camera, cut |
| 9 | `word-rise` | the canonical word entrance (type side) | type |
| 10 | `pull-reveal` | pull back from detail to whole | camera |
| 11 | `colour-emphasis` | arrival tint and the one accent word | type, colour |
| 12 | `whip-pan` | whip pan within a shot | camera |
| 13 | `giant-type-travel` | giant type as a landscape | type, camera |
| 14 | `plane3d-settle` | a UI plane in perspective that lands flat | camera, 3D |
| 15 | `face-switch` | emphasis by a face switch | type |
| 16 | `rack-focus` | rack focus and the depth ladder (camera side) | camera, lens |
| 17 | `letter-lockup` | per-letter wordmark reveal into the lockup | type, logo |
| 18 | `typewriter-camera` | typing with a head, a caret and a camera | type, UI |
| 19 | `pulse-travel` | go-stop-go travel on the beat | camera, rhythm |
| 20 | `type-swap` | decode, scramble, slot roll in brackets | type |
| 21 | `tracking-motion` | tracking as motion | type |
| 22 | `roll-accent` | camera roll as an accent | camera |
| 23 | `crane-tilt` | crane and tilt with a foreground wipe | camera |
| 24 | `orbit-hero` | orbit and turntable around a 3D hero | camera, 3D |
| 25 | `zoom-out-exit` | exponential zoom-out that hides a switch | camera, cut |
| 26 | `brackets-select` | brackets and corner markers that select a word | type |
| 27 | `blur-resolve-type` | blur-resolve per word or letter | type |
| 28 | `drift-tail` | creep and drift tail after a landing | camera |
| 29 | `slot-reveal` | type slides out from behind an edge | type |
| 30 | `plate-push` | a slow push on a photo or footage | camera |
| 31 | `parallax-layers` | parallax depth layers | camera, depth |
| 32 | `panel-cameras` | split panels, each with its own camera | camera, layout |
| 33 | `scroll-camera` | one camera over one app canvas | camera, UI |
| 34 | `type-exit` | type exits | type |
| 35 | `stacked-caption` | two-line stacked captions (rare) | type |
| 36 | `handheld-micro` | handheld micro-jitter on footage only | camera |
| 37 | `lens-bulge-push` | lens bulge during a push | camera, lens |

---

## Entries

### 1. Cut while moving, arrive moving · `velocity-cut`

Family: camera, cut. See also `transitions.md` `velocity-cut` and `animations.md` `whip-exit-match`.

**What.** The camera (or the whole world layer) accelerates out of a shot, the cut lands on the fastest frame, and the next
shot is already moving the same way and brakes. Two shots read as one continuous throw.

**Job.** Scene changes flow, energy carries from beat to beat, and a film can change subject every 1.5-2 s without ever
stopping; the eye keeps travelling one way, so the new picture reads as "the next thing", not a new slide.

**Numbers.**
- Exit speed at the cut 54-170 px per frame; zoom exits lose 15-50 % of scale in 4-9 f.
- Acceleration x1.35-1.45 per frame (34, 45, 54 px), x1.6, or x2; a build of 5-12 f, the last 3-5 carrying most of the
  travel.
- Entry at about 0.84x the exit speed (131 -> 110 px per frame), decaying 0.55 per frame (a 5-frame snap) to about 0.8 (a
  20-frame brake).
- Blur at the cut: none, 0.5 x the step, or a 6-18 px pulse on the last 3 frames; the first frame after the cut may carry
  the same smear (60 px, sharp in 5 f).
- Start 40-50 % of pushes and slow pans at peak speed; end 22-35 % of moves at peak.

**Presets.**
- *Caption keeps going.* The line keeps moving left after it is read, accelerating (left edge 985, 983, 980, 978, 976, 973,
  968, 961, 951 ... px), and the cut lands at 88 px per frame.
- *Whip into the cut.* A box centre goes 673, 677, 683, 691, 703, 717, 735, 757, 784, 818, 863, 917 px (+245 px, pure
  acceleration), cut at 54 px per frame.
- *Tilt-up whip.* A bar's anchor rises 539, 533, 522, 505, 477, 441 px (x1.6 per frame) into the cut.
- *Zoom-out exit.* A lockup zooms out 1.0 -> 0.85 on an ease-in with a horizontal smear on the last 2 frames, then the cut.
- *Consistent direction.* Three or four cuts in a row all travel left.

**Rich.** The exit multiplies its speed and is cut on its fastest frame; the next shot is pre-rolled, so its first frame is
already displaced and moving; the direction holds across 3-4 cuts; blur in proportion to the step (if the film blurs); the
hit on the cut frame or 3 frames before it.

**Cheap.** An exit that slows before the cut; a new shot that starts from rest; alternating directions; a constant blur
filter; a cross-dissolve laid over a move.

```tsx
// VelocityCut: shot A accelerates out, shot B enters moving and brakes. Authored in 30-fps frames; plays at any fps.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Smear} from './motion';
import {World, whipOut, whipIn, handover, camBlur} from './camtype';

type VC = {f0: number; cut: number; v0: number; r?: number; k?: number; d?: number; dir?: 1 | -1};
/** Content offset of the visible shot at frame f, plus the per-frame step (for blur). dir -1 = content travels left. */
export const velocityCut = (f: number, fps: number, o: VC) => {
  const r = o.r ?? 2, d = o.d ?? 0.55, k = o.k ?? 0.84, dir = o.dir ?? -1;
  const t = (n: number) => (n * 30) / fps;
  if (f < o.cut) {
    const off = (n: number) => dir * whipOut(t(n - o.f0), 0, o.v0, r);
    return {shot: 'A' as const, off: off(f), step: off(f) - off(f - 1)};
  }
  const vExit = o.v0 * Math.pow(r, Math.max(0, t(o.cut - o.f0) - 1));
  // B starts displaced against the travel direction by v/(1-d) and decays to 0, so it keeps moving the same way
  const off = (n: number) => dir * whipIn(t(n - o.cut), 0, handover(vExit, k), d);
  return {shot: 'B' as const, off: off(f), step: off(f) - off(f - 1)};
};

export const VelocityCutShot: React.FC<{A: React.ReactNode; B: React.ReactNode; f0: number; cut: number}> = ({A, B, f0, cut}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  // Numbers: doubling from 5 px/f over the last 5 frames before the cut (5 10 20 40 80), entry at 0.84x, 20-frame brake (d 0.8)
  const s = velocityCut(f, fps, {f0, cut, v0: 5, r: 2, k: 0.84, d: 0.8, dir: -1});
  const blur = camBlur(s.step, 0.5);            // k = 0 for a no-blur film
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <Smear id="vc" sx={blur}>
        <World cam={{s: 1, x: s.off, y: 0}}>{s.shot === 'A' ? A : B}</World>
      </Smear>
    </AbsoluteFill>
  );
};
// Zoom version: for f < cut, s = 0.85 ** (((f - f0) / (cut - f0)) ** 2.2), blur 0 -> 10 px over the last 3 frames;
// B starts at 1 / s(cut - 1) relative scale and lands on 1 with CAM.pullLand over 8-12 f.
```

### 2. A push-in that lands on the one element · `push-land`

Family: camera.

**What.** The camera moves toward the element that matters now (a button, a field, the typed line, a row) about that
element's point, fast at first and settling clean, then keeps a slow creep: the camera saying "look here".

**Job.** It points: a full screen of interface becomes one readable action, a statement gains weight, and the next action is
explained before it happens (the push lands on the send button, then the cursor clicks it).

**Numbers.**
- Scale 1.04-1.07 (subtle), 1.15-1.33, 1.41-1.58; house x1.04 / 1.115 / 1.5 at the low / middle / high end.
- 12-42 f (0.4-1.4 s); a long settle of 1-5 s is possible.
- First-frame heavy: 55-65 % of the log-scale in the first quarter (`pushLand`, progress 0.6 / 0.85 / 0.97 at 25 / 50 /
  75 %); an in-out curve only when the push travels across the UI.
- Pivot: a named point on the element; the frame centre only for type cards.
- After landing: a creep of 0.1-0.4 % per frame, or a hold.

**Presets.**
- *Toolbar push* (60 fps). About the caret end of a toolbar: scale 1.00, 1.05, 1.11, 1.18, 1.24, 1.28, 1.30, 1.32, 1.33
  over 34 f.
- *Ease-out push* (60 fps). 1.000 -> 1.320 over 42 f: 1.074, 1.163, 1.225, 1.268, 1.296, 1.311 on every 6th frame.
- *Long decelerating push.* The whole UI 1.000 -> 1.150 over about 5 s, strongly decelerating (1.007, 1.028 ... early).
- *Bar push.* A hard cut to a dark stage with an input bar; the camera pushes in x1.41 over 33 f on an expo-out while the
  text is retyped.
- *Panel push.* x1.439 about the panel centre with per-frame scale ratios 1.1128, 1.0501, 1.0369, 1.0308, 1.0244, 1.0219,
  1.0190 ... (most of it on frame 1).

**Rich.** The pivot is the element (the frame moves toward it); the push starts with speed and lands without overshoot; the
element is already the brightest thing; secondary layers move against the push; a creep keeps the hold alive; the push
lands exactly when the next action starts.

**Cheap.** A slow linear zoom over a whole shot on the frame centre; zooming onto empty space; pushing in and out on every
beat; overshooting the landing.

```tsx
// PushLand: camera pushes toward an element's point, lands clean, then creeps.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {sf} from './motion';
import {World, camTrack, creep, CAM} from './camtype';

export const PushLand: React.FC<{
  at: number; pivot: [number, number]; to?: number; dur?: number; creepRate?: number; children: React.ReactNode;
}> = ({at, pivot, to = 1.33, dur = 0.57, creepRate = 0.0007, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const end = at + sf(dur, fps);                       // 34 f @60 = 0.57 s for 1.00 -> 1.33
  const cam = camTrack(f, [{f: at, s: 1}, {f: end, s: to, c: CAM.pushLand}]);
  const s = f > end ? cam.s * creep(f, end, creepRate, fps) : cam.s;  // Creep 0.06-0.12 %/f inside the hold
  return <World cam={{...cam, s, px: pivot[0], py: pivot[1]}}>{children}</World>;
};
// <PushLand at={66} pivot={[705, 700]} to={1.33} dur={0.57}>...toolbar...</PushLand>
// <PushLand at={15} pivot={[960, 540]} to={1.32} dur={0.7}>...page...</PushLand>
// Keep the pivot on screen at the target scale: screen = P + (q - P) * s.
```

### 3. The centred statement built word by word · `word-build-centred`

Family: type. See also `animations.md` `word-build-recentre`.

**What.** One centred line; each word arrives on its beat at its final slot of the growing line, and the whole line glides
to stay centred (snap, then settle). The line is complete only on its last word.

**Job.** The film's voice: the text is spoken, not shown. It holds attention on one place, paces the reading to the voice or
the music, and lets a single sentence carry a whole beat (type-only shots are about a fifth of all shots).

**Numbers.**
- Stagger: 2 f at 24 fps for a title; 4-7 f at 30 fps for statements; 10-12 f when deliberate; or locked to the voice.
- Re-centre: 69 % of the shift on the first frame, 99 % by frame 5 (fractions 0, 0.69, 0.85, 0.93, 0.97, 0.99, 1.0; bezier
  0.08, 1.01, 0.22, 0.94 for sub-frames); or an exponential with tau 2.6 f; or a 12-15 f ease-out; or a 42 f glide at 60 fps.
- The shift per word is half the new word's advance plus half a space; the centre stays within 1-2 px of x 960 at rest.
- Word entrance: cut on, the canonical rise (`word-rise`), a colour drain (`colour-emphasis`), or a 12-15 f fade.
- 1-5 words (85 % one line); a second line starts on the same centre (baseline +81 px).

**Presets.**
- *Voice-locked caption* (23.976 fps). A grotesk at weight 500, cap 51 px, tracking -0.01 em, `#F2F2F2`, centred on x 960 at
  baseline 565; words land on the syllables.
- *Tinted build.* Four words 10-12 f apart, each born in a colour and drained to black.
- *Snap re-centre.* Each word cuts on and the line re-centres with the 0.69 first-frame fraction.
- *Colour-front build.* A build with a blue -> black colour front travelling through it.
- *Fast title* (24 fps). One word every 2 f on a pale sky field, the block shrinking and drifting as it builds.

**Rich.** The line re-centres with a snap, so the build has a pulse; each word lands on its syllable or a beat; the new word
is distinguishable for 2-10 frames, then the line is one voice; the finished line holds long enough to read and leaves with
a move.

**Cheap.** A left-aligned build; a mushy ease-in-out re-centre; every word fading identically with no relation to sound; a
line built and then cut statically.

```tsx
// CentredBuild: one centred line, words appended on their onsets, the line re-centres, canonical entrance per word.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import {Smear, tbl} from './motion';
import {FACE, TRACK, RECENTRE, wordIn} from './camtype';

type W = {text: string; at: number; color?: string};
export const CentredBuild: React.FC<{words: W[]; size: number; weight?: number; y: number; ink?: string; family?: string; track?: number; rise?: number}> =
  ({words, size, weight = 500, y, ink = '#0A0A0A', family = FACE.grotesk, track = TRACK.display, rise = 0.75}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const m = (t: string) => measureText({text: t, fontFamily: family, fontSize: size, fontWeight: weight,
    letterSpacing: `${track}em`, validateFontIsLoaded: false}).width;
  const space = m('a a') - 2 * m('a');
  const widths = words.map((w) => m(w.text));
  const lineW = (n: number) => widths.slice(0, n).reduce((a, b) => a + b, 0) + space * Math.max(0, n - 1);
  const visible = words.filter((w) => f >= w.at).length;
  let left = (1920 - lineW(Math.max(1, visible))) / 2;
  if (visible >= 2) {                               // re-centre from the previous layout with the fraction table
    const k = visible - 1, from = (1920 - lineW(k)) / 2, to = (1920 - lineW(k + 1)) / 2;
    left = from + (to - from) * tbl(f, words[k].at, RECENTRE, 30, fps);
  }
  let x = left;
  return (
    <>
      {words.map((w, i) => {
        const xi = x; x += widths[i] + space;
        if (f < w.at) return null;
        const e = wordIn(f, w.at, fps, size * 0.727 * rise);   // rise 0.75 x cap; cap = 0.727 em for Inter
        return (
          <div key={i} style={{position: 'absolute', left: xi, top: y - size, opacity: e.o, transform: `translateY(${e.dy}px)`}}>
            <Smear id={`cb${i}`} sy={e.smear}>
              <span style={{fontFamily: family, fontSize: size, fontWeight: weight, letterSpacing: `${track}em`,
                            color: w.color ?? ink, whiteSpace: 'pre'}}>{w.text}</span>
            </Smear>
          </div>
        );
      })}
    </>
  );
};
// Variant: left = to + (from - to) * Math.exp(-((f - at) * 30 / fps) / 2.6).
// Lockup variant: cut jump (left = to on the append frame). variant: 12-15 f glide with CURVE.land.
```

### 4. The camera follows the action · `action-follow`

Family: camera.

**What.** The camera is attached to whatever is acting: it pans with the caret as text is typed at macro scale, keeps the
cursor near the centre while the world slides under it, travels along a line being written. It moves because something
moves, at that thing's rhythm.

**Job.** The product acts in close-up: the viewer reads the request as it is written and sees the cursor's intent. Every
pixel of camera travel is explained by the subject; a macro shot can last 2-3 s without a cut.

**Numbers.**
- Follow at 7.5-12 px per frame, with periodic spikes (x2 every 5th frame at the character rhythm); whips inside a follow at
  147-260 px per frame, or a single-frame jump of about 1000 px with no blur.
- The subject keeps a band (the caret at 60-67 % of the width; the cursor near the centre).
- Scale while following: x1.05, a slow zoom-out 0.997 per frame, or a macro x7.9.
- End: accelerate into the cut, or snap out x0.112.

**Presets.**
- *Caret macro* (25 fps). A snap zoom x7.9 onto the caret (`punch-in`); the bar fills the frame, x-height 148 px; the camera
  pans with the caret, keeping it at x 1150-1280, stepping every 5th frame with the typing; one whip skips ahead.
- *Cursor descends.* A message field rises into a macro; a giant cursor flies in, becomes an I-beam and descends; the camera
  pans with the caret at about 8 px per frame, then accelerates into the cut.
- *Line follow.* A typed left-aligned line: the camera travels along it as words enter with a focus pull, whips ahead at
  250 px per frame, and glides back into the follow.
- *Giant line.* A giant light line (about 210 px) types word by word while the camera tracks it.
- *Cursor at centre.* In a fisheye close-up the cursor stays near the frame centre while the camera follows it.

**Rich.** The subject keeps a fixed screen band (it reads as a camera operator); the pan's micro-rhythm matches the typing
(stepped, not smoothed); the follow breaks into a whip to skip ahead and glides back; macro scale shows the type huge
(x-height 110-150 px).

**Cheap.** A constant-speed pan unrelated to the typing; the caret drifting out of frame and the camera catching up with a
jump; a smoothed spline that loses the rhythm; small type.

```tsx
// Follow camera: a deterministic lagged follow of a subject x(f) (closed-form weighted window, no state), stepped rhythm preserved.
import {useCurrentFrame, useVideoConfig} from 'remotion';

/** Weighted lag: average of the subject over the last n frames with weights exp(-k/tau). Pure function of f. */
export const lagFollow = (fn: (f: number) => number, f: number, tau = 3, n = 18) => {
  let s = 0, w = 0;
  for (let k = 0; k <= n; k++) { const wk = Math.exp(-k / tau); s += wk * fn(f - k); w += wk; }
  return s / w;
};
/** Content offset that keeps the subject at screen x `band`. */
export const followX = (subjectX: (f: number) => number, f: number, band = 1200, tau = 3) => band - lagFollow(subjectX, f, tau);

/** Caret follow for macro typing: charsAt(sourceFrame) from the typing table, advance from measureText. */
export const useCaretFollow = (charsAt: (srcF: number) => number, advancePx: number, x0: number, srcFps = 25) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const caretX = (g: number) => x0 + charsAt(Math.floor((g * srcFps) / fps)) * advancePx;
  return followX(caretX, f, 1200, 1.5);   // tau <= 2 keeps 5-frame pulse; larger tau smooths it away (wrong)
};
// A whip inside the follow: add whipOut for 3-5 frames, then glide back into the
// follow with CAM.glideIn over 25-30 frames.
```

### 5. The type system: face, weight, measure, tracking, colour · `type-system`

Family: type. See `copy-and-type.md` for the copy rules.

**What.** The rules that make a line look designed before it moves: one neo-grotesk (or one display serif) per film, display
weight 400-600, the size set to a measure of 35-70 % of the frame width, tight display tracking, wide caps labels, and
an ink-ground pair chosen for the film.

**Job.** Consistency of voice: one face for about 90 % of the words, so the type reads as the brand speaking; size by measure
makes short lines big and long lines calm without breaking the centre.

**Numbers.**
- One primary face per film; a second only for a role (mono labels, a serif italic for emphasis, a wordmark).
- Weight 400-600 for statements (300 for big serifs and very large light lines); 700-900 only for wordmarks and ad
  headlines.
- Cap height: a line alone 76-121 px (7-11.2 % of the height; house 9.2 %, the claim 11.2 %), other statements a size down;
  titles 120-220; giant 360-720; UI micro-text 10-30.
- Measure: ink 35-70 % of the frame width; fit the size to it (a long line takes two rows rather than a cap under 7 %).
- Tracking: display -0.005 to -0.06 em (house -0.02; heavier and bigger = tighter: 700 weight at -0.06, 205-240 px at
  -0.045, 168 px at -0.04); text -0.01; caps labels +0.06 to +0.32 (house +0.12).
- Stacked display lines: line height 1.0 x the font size.

**Presets.**
- *Neo-grotesk display.* Inter Display or Inter at 500, cap 60 px, -0.01 em; or a system grotesk at 500, 70 px, cap 51,
  -0.01 em, `#F2F2F2` on black.
- *Geometric sans.* A rounded geometric family at 300 / 600 / 700 (72-210 px), tracking 0 except stacked captions at
  -0.01 em.
- *Display serif.* Source Serif 4 at 600 on pictures, 500 on paper (optical size 20-32), with letterpress specks; the
  wordmark at optical size 60, weight 300.
- *Mono.* IBM Plex Mono 400 in caps at +0.06 em; Geist Mono 400; Roboto Mono 14 px for code.
- *Techno or extended.* Tektur or Chakra Petch (cap 123); Unbounded 300 with Michroma.

**Rich.** An optical-size serif or a tight grotesk whose tracking tightens as size grows; every line sized to a measure so
statements share one visual mass; ink not pure black on a tinted ground (`#16161C`, `#0F1115`, `#35342F`) and white not pure
on black (`#F2F2F2`, `#F4F2EE`); labels in wide caps 13-22 px; real typographic quotes and apostrophes.

**Cheap.** Default tracking at 120 px (gappy); bold everywhere; three faces in a film; one font size for every line (long
lines overflow, short ones look lost); pure `#000` on `#FFF`; straight quotes.

```tsx
// Statement: a centred line fitted to a measure; film-wide type tokens.
import React from 'react';
import '@fontsource-variable/inter';
import {FACE, TRACK, fitSize} from './camtype';

export const TYPE = {
  statement:     {family: FACE.grotesk, weight: 500, track: TRACK.display, measure: 0.55, ink: '#0F1115', ground: '#F5F6F8'},
  statementDark: {family: FACE.grotesk, weight: 500, track: TRACK.display, measure: 0.55, ink: '#F2F2F2', ground: '#0B0C0E'},
  editorial:     {family: FACE.serif, weight: 400, track: -0.01, measure: 0.5, ink: '#16161C', ground: '#F4F3EF'},
  label:         {family: FACE.grotesk, weight: 600, track: TRACK.labelWide, size: 18, ink: 'rgba(255,255,255,0.85)'},
  mono:          {family: FACE.mono, weight: 400, track: 0.06, size: 16, ink: '#9C9B9A'},
} as const;

/** Tighter as it grows: -0.01 em at <= 70 px, -0.045 em at >= 200 px. */
export const trackFor = (px: number) => -0.01 - 0.035 * Math.min(1, Math.max(0, (px - 70) / 130));

export const Statement: React.FC<{text: string; preset?: keyof typeof TYPE; y?: number; measure?: number}> =
  ({text, preset = 'statement', y = 540, measure}) => {
  const p = TYPE[preset] as any;
  const width = 1920 * (measure ?? p.measure ?? 0.55);
  const size = p.size ?? Math.min(160, fitSize(text, width, p.family, p.weight, p.track));
  const track = p.size ? p.track : trackFor(size);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, transform: 'translateY(-50%)', textAlign: 'center',
                 fontFamily: p.family, fontWeight: p.weight, fontSize: size, letterSpacing: `${track}em`, color: p.ink,
                 lineHeight: 1, fontFeatureSettings: '"cv11" 0'}}>
      {text.replace(/'/g, '’')}
    </div>
  );
};
```

### 6. Readable time: the build-hold-exit clock · `readable-time`

Family: type, timing. See also `content-pacing.md`.

**What.** How long text stays: the build (per word), the hold after the last word, the exit. Fast, but never unreadable.

**Job.** It sets the film's tempo and decides whether the copy is read or skimmed. Too long and the film feels static; too
short and the text is noise.

**Numbers.**
- Per-word build: 2 f at 24 fps (a title) to 7 f at 30 fps (statements); locked to the voice otherwise.
- Hold after the last word's onset: 0.87-1.53 s (26-46 f) for 3-5 words; a one-word flash of 0.46-0.6 s in a rhythmic list;
  1.1-1.25 s for a one-word statement.
- A statement in all: 1.6-1.9 s for 4-5 words; 1.2 s for a fast 5-word line.
- Film-wide: 0.26-1.54 headline words per second (aim about 1.06).

**Presets.**
- *Five-word statement.* Five words 5 f apart (20 f of build), then a hold of about 28 f, then the exit.
- *Voice-locked.* A number 10 f (0.42 s), a word 23 f (0.96 s), two words 20 f (0.83 s), each held to its syllables.
- *Escalating words* (24 fps). One word 27 f (1.12 s), a bigger word 57 f (2.38 s, with a scale event), a third 30 f (1.25 s).
- *Rhythmic list.* Three single words at 0.53 s, 0.6 s and 1.07 s (the longer word gets more time).

**Rich.** A clock tied to the sound (syllables or beats) and to the word count; the line leaves while still readable (the
exit starts at the end of the hold, not after a dead pause); single-word flashes only for short words in a rhythmic series.

**Cheap.** Every line held 3 s regardless of length; five words flashed in 0.5 s; the hold counted from the first word instead
of the last.

```tsx
// statementClock: onsets, exit frame and total for a statement from its word count.
import {readHold} from './camtype';

export const statementClock = (words: string[], at: number, fps: number, staggerS = 0.2 /* 6 f @30 */) => {
  const onsets = words.map((_, i) => at + Math.round(i * staggerS * fps));
  const last = onsets[onsets.length - 1];
  const exitAt = last + readHold(words.length, fps);   // 0.9 s @1 word .. 1.5 s @5 words
  return {onsets, exitAt, total: (exitAt - at) / fps};
};
// Rhythmic one-word flash: >= Math.round(0.46 * fps) frames per word, only for words of <= 10 characters.
// Film check: unique headline words / film seconds should land in 0.6-1.5 (aim 1.06).
```

### 7. An accelerating push into a zoom cut or zoom-through · `push-into-cut`

Family: camera, cut. See also `transitions.md` `zoom-through`.

**What.** The camera pushes toward a detail with growing speed (each frame's scale ratio larger than the last) and either
cuts on the fastest frame to a new shot that continues the dive (a zoom cut), or passes through an element (a white centre,
a screen, a letter's counter, a glass face) into the next world (a zoom-through).

**Job.** "Inside this is the next thing": the product opens into its feature, a screen into its content, a word into its
meaning. The acceleration builds anticipation; the cut releases it.

**Numbers.**
- Per-frame ratio at the start 1.0008-1.004; at the cut 1.036-1.129.
- Total push before the cut x1.025-1.74.
- 6-23 f for the push; the landing 8-16 f.
- What is crossed: a white centre, a screen, a letter cell, a glass face, a message field, a panel at half scale for one
  frame, a blob ring.
- Landing: defocused first frames (6 px), a colour wash with a ghost title, or the push continuing and decelerating.

**Presets.**
- *Exponential push.* Per-frame ratios 1.004, 1.006, 1.008, 1.011, 1.013, 1.017, 1.022, 1.028, 1.034, 1.043, 1.067, 1.129
  (x1.45 in all), cut into the next word's box.
- *Report page push.* 10 f of true hold, then s 1.0 -> 1.06 -> 1.18 -> 1.62 over 10 f, cut, and the next shot continues
  decelerating.
- *Short push.* 1.000, 1.001, 1.007, 1.025 into a zoom-through cut with a colour wash.
- *Steady build.* 1.001, 1.002, 1.004, 1.005, 1.007, 1.009, 1.010 ... per frame (x1.23 in 15 f), landing 6 px defocused.
- *White centre.* x1.74 over 15 f on a quad-in plus 12 degrees of rotation, through a white centre into the next scene.
- *Toward the send button.* 1.0008, 1.0034, 1.0062, 1.0096, 1.0168, 1.0242, 1.0361 per frame toward the button.

**Rich.** An exponential push (the ratio grows every frame) heading for a specific point; something crossed that justifies
the cut; the next shot starting already zoomed and still moving; blur only in the last 2-3 frames.

**Cheap.** A linear zoom that stops and then cuts; a cross-dissolve during a slow zoom; a zoom into the frame centre with
nothing there; a constant-speed scale.

```tsx
// PushIntoCut: exponential push toward a pivot, cut at the top, the next shot continues the dive and lands.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {Smear, CL, ez} from './motion';
import {World, ratioPush, CAM, camBlur} from './camtype';

const PUSH_RATIOS = [1.004, 1.006, 1.008, 1.011, 1.013, 1.017, 1.022, 1.028, 1.034, 1.043, 1.067, 1.129];

export const PushIntoCut: React.FC<{A: React.ReactNode; B: React.ReactNode; at: number; pivot: [number, number];
  ratios?: readonly number[]; landFrom?: number; land?: number}> =
  ({A, B, at, pivot, ratios = PUSH_RATIOS, landFrom = 1.3, land = 14}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const n30 = ((f - at) * 30) / fps;                 // ratios are per 30-fps frame
  const cut = at + Math.round((ratios.length * fps) / 30);
  if (f < cut) {
    const s = ratioPush(n30, 0, ratios);
    const step = (s - ratioPush(n30 - 30 / fps, 0, ratios)) * 960;   // edge speed in px for blur
    const blur = f >= cut - Math.round(fps / 10) ? camBlur(step, 0.25, 12) : 0;  // blur only on the last ~3 frames
    return <Smear id="pic" sx={blur} sy={blur}><World cam={{s, x: 0, y: 0, px: pivot[0], py: pivot[1]}}>{A}</World></Smear>;
  }
  // landing: B arrives already zoomed (1.3x) and decelerates to 1
  const t = interpolate(f, [cut, cut + Math.round((land * fps) / 30)], [0, 1], {...CL, easing: ez(CAM.pushLand)});
  const s = Math.exp(Math.log(1 / landFrom) * (1 - t));          // from 1/1.3 relative to rest up to 1: continues inward
  return <World cam={{s, x: 0, y: 0}}>{B}</World>;
};
// Zoom-through a screen: render B inside A's screen rect; at the cut frame swap so that the screen rect
// fills the frame exactly (scale = 1920 / screenWidth at that frame), then keep pushing 2-5 % more with CAM.pushLandSoft.
// One-frame zoom-through: on one frame draw B at scale 0.5 inside A's top-right panel, then cut to B.
```

### 8. Punch-in and snap zoom by cut · `punch-in`

Family: camera, cut. See also `animations.md` `punch-in` and `transitions.md` `snap-punch`.

**What.** The same content cuts to a tighter framing in one frame (x1.13-x8), often landing slightly blurred and resolving in
2-3 frames, then creeping on. A snap zoom does the same in 2 frames (a half-way frame, then full).

**Job.** Emphasis on the beat: the scale jump says "this, now" with the force of a cut but keeps the place. Two punch-ins step
the viewer closer in two beats; a snap zoom jumps from the whole UI to the one character being typed.

**Numbers.**
- Cut scale x1.126, x1.15-1.21, x1.30, x1.347, x1.5, x1.6 (2 frames), x2.5, x5, x7.9 (2 frames); out x0.112 (2 frames).
- Landing blur about 17 x ln(s): 6 / 4 / 2 / 0 px for x1.35, 3 / 1.5 / 0 for x1.13; none in a no-blur film.
- Optional pre-blur: one frame at about 4 px before the cut.
- After: a creep of +0.4-0.9 % over 20 f, +0.2-0.3 % per frame, a decaying pull-back of -9 %, or a decelerating push.
- Pivot: the frame centre, the caret, a window corner.

**Presets.**
- *Two punches.* x1.347, then 20 f later x1.126 on the same card, each landing blurred and resolving in 3 frames, then a creep.
- *Punch and push.* The same screen 1.206x tighter, then a slow push of +0.2-0.3 % per frame.
- *Type punch.* A 1.30x punch on the word only, while the picture keeps its framing.
- *Corner punch.* The same window at x1.5 about its top-left corner.
- *Two-frame snap.* x1.499 then x1.067 more (x1.60 in all), no blur, then the slow push continues.

**Rich.** The jump on a beat; a landing blur in proportion to the jump, gone in 3 frames; a creep after the cut; the pivot
putting the next action in the centre; two punches stepping in rather than one big one.

**Cheap.** A scale cut with nothing else (no blur, no creep); punching on every line; punching off the beat; an animated zoom
where a cut is wanted.

```tsx
// PunchIn: scale cuts on given frames with a proportional blur resolve and a creep in each hold.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {World, creep} from './camtype';

type Punch = {f: number; s: number; pivot?: [number, number]};
export const PunchIn: React.FC<{punches: Punch[]; creepRate?: number; preBlur?: number; children: React.ReactNode}> =
  ({punches, creepRate = 0.0006, preBlur = 4, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  let s = 1, last = -1, px = 960, py = 540;
  punches.forEach((p, i) => { if (f >= p.f) { s *= p.s; last = i; if (p.pivot) [px, py] = p.pivot; } });
  let blur = 0;
  if (last >= 0) {
    const p = punches[last];
    const k = Math.floor(((f - p.f) * 30) / fps);                 // frames since the cut @30
    const peak = 17 * Math.log(p.s);                               // 1.347 -> 5.1 px, 1.126 -> 2.0 px
    blur = k < 3 ? peak * [1, 0.66, 0.33][k] : 0;
    s *= creep(f, p.f, creepRate, fps);                            // +0.6 % in 5 f then slower; 0.0006/f is the mean
  }
  const next = punches.find((p) => p.f === f + 1);
  if (next) blur = Math.max(blur, preBlur * (next.s > 1.2 ? 1 : 0.5));   // Pre-blur
  return (
    <div style={{position: 'absolute', inset: 0, filter: blur > 0.2 ? `blur(${blur}px)` : undefined}}>
      <World cam={{s, x: 0, y: 0, px, py}}>{children}</World>
    </div>
  );
};
// <PunchIn punches={[{f: 90, s: 1.347}, {f: 110, s: 1.126}]}>...card...</PunchIn>
// Snap zoom: two punches on consecutive frames, no blur: [{f: 267, s: 5.8, pivot: [650, 540]}, {f: 268, s: 1.364}]; preBlur 0.
// CSS filter blur on the whole frame is fine at <= 6 px; for bigger values blur a half-size copy.
```

### 9. The canonical word entrance (type side) · `word-rise`

Family: type. The full recipe is `animations.md` `word-rise`; these numbers matter to the build and the clock here.

**Numbers.** Rise 20-55 px (0.45 x the x-height to 0.75 x the cap); 4-16 f (9 f at 24 fps); half the rise done by frame 1-2;
first-frame opacity 0.3-0.7; a vertical smear of 6 / 3 / 0 px or a 2 px blur on frame 1; stagger 4-7 f.

**Presets.**
- *Rise table.* Remaining rise per frame (share of the total): 1, 0.667, 0.458, 0.354, 0.271, 0.229, 0.188, 0.167, 0.146,
  0.125, 0.104, 0.104, 0.083, 0.063, 0.042, 0.021, 0.
- *Ink table.* Opacity per frame: 0.34, 0.56, 0.69, 0.77, 0.82, 0.85, 0.89, 0.91, 0.93, 0.94, 0.95, 0.97, 0.98, 1.
- *Short rise.* 30 px in 4 frames, opacity 0.3 -> 1, grey to black.

**Rich.** Frame 1 already at 30-70 % and most of the way up; a vertical smear only on frames 1-2; a long tail of 1-2 px; the ink
ramping with the rise.

**Cheap.** A 0.5 s ease-in-out slide from 100 px below; opacity 0 on frame 1; the same entrance on every element (cards, icons)
instead of only words.

**Build.** `wordIn()` in the camera kit returns `{dy, o, smear}` from the word-rise tables; `CentredBuild` (`word-build-centred`) uses it. The short variant: `dy = 30 * [1, 0.6, 0.3, 0.1, 0][k]`, colour `interpolateColors(k, [0, 1, 20, 28], ['#5B5B5B', '#2C2C2C', '#121212', '#000'])`, blur 2 px on k = 0. The full component: `animations.md` `word-rise`.

### 10. Pull back from detail to whole · `pull-reveal`

Family: camera.

**What.** The camera starts close on a detail and pulls back to show where it lives (the whole window, the lockup, the grid,
the wall of apps), decelerating into a clean landing (or with a 0.7 % settle).

**Job.** Context after detail: "this button is part of this product". It answers the question the close-up raised and gives a
breath before the next push. Open on a detail and pull out, or end a section by pulling back.

**Numbers.**
- From 1.15-2.5 back to 1.0, or from 1.0 to 0.58-0.95 (house 0.65 / 0.86 / 0.96).
- 4-36 f (house about 0.5 s).
- Curve: a landing (55-65 % in the first quarter, `pullLand`) or an in-out across the whole UI (`pullReveal`, 0.7 % settle).
- Often combined with a pan toward the subject's new place, a re-centring type build, or a fade of the UI chrome.

**Presets.**
- *Window pull-out.* A pull-out with a leftward pan to see the whole window (S 2.09 -> 1.0 over 36 f) on `pullReveal`, peaking
  at -7 % per frame; the window lands exactly on its rest box.
- *Lockup zoom-out.* The whole lockup (mark, wordmark, guide lines) zooms out uniformly from 1.98 to 1.00 over 27 f while the
  wordmark types.
- *Cubic pull.* A pull-back to 0.62 on a cubic in-out, peaking in the middle, the anchor drifting up 50 px.
- *Decaying pull-back.* After a 2.5x cut, the close-up scales down about 9 % with an exponential decay.
- *Pull and return.* A slow pull 1.000 -> 0.908 (60 fps), a hold, then a push back to 0.964.

**Rich.** The pull begins on a detail that already said something; its pivot keeps the subject on screen; it decelerates into a
composed frame; blur follows the speed; another action happens during the pull.

**Cheap.** A pull-out of an empty layout; a linear zoom-out; a pull that reveals the edges of a flat card (no world beyond the
frame); pulling back at the end of every scene.

```tsx
// PullReveal: from a detail (scale > 1 about a pivot that tracks the subject) back to the whole, with speed-driven blur.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Smear, sf} from './motion';
import {World, camTrack, camBlur, CAM} from './camtype';

export const PullReveal: React.FC<{at: number; from?: number; dur?: number; fromXY?: [number, number]; overshoot?: boolean;
  children: React.ReactNode}> = ({at, from = 2.09, dur = 1.2, fromXY = [327, -80], overshoot = true, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const keys = [{f: at, s: from, x: fromXY[0], y: fromXY[1]},
                {f: at + sf(dur, fps), s: 1, x: 0, y: 0, c: overshoot ? CAM.pullReveal : CAM.pullLand}];
  const cam = camTrack(f, keys), prev = camTrack(f - 1, keys);
  const edgeStep = Math.abs(Math.log(cam.s / prev.s)) * 1100 + Math.hypot(cam.x - prev.x, cam.y - prev.y); // px/frame at the frame edge
  return <Smear id="pr" sx={camBlur(edgeStep, 0.12, 8)} sy={camBlur(edgeStep, 0.12, 8)}><World cam={cam}>{children}</World></Smear>;
};
// <PullReveal at={140} from={2.09} dur={1.2} fromXY={[327, -80]} /> (the window lands on its rest box after 30 f, 0.994 two frames later)
// From 1/0.827 in log space is the same as to 0.827: use camTrack with s 1 -> 0.827 and CAM.pullLand over 35 f.
// The blur coefficient 0.12 reproduces 8 px peak at -7 %/f.
```

### 11. Arrival tint and the one accent word · `colour-emphasis`

Family: type, colour. See also `animations.md` `arrival-tint`.

**What.** New words are born in a colour (the accent, gold, lavender, green, grey or a hue path) and drain to the ink within
1-13 frames; in a finished statement at most one word or phrase keeps a brand colour. Colour does the emphasis that boxes and
underlines do in template films.

**Job.** The eye reads "new" from colour and "important" from the one coloured word. The build gains a second rhythm (a colour
pulse per word) and the type ties to the palette. Colour is the first emphasis; never an underline.

**Numbers.**
- Tint drain 1 f, 2 f, 3-4 f, 4-6 f, 6-8 f, 10 steps at one per frame, or 11-13 f.
- Tint colours: the film's accent, or a hue path that ends in ink, or grey -> ink.
- Kept accent: one word or phrase per statement, in the line's bold weight or with a glow; never two colours.
- Front version: a 220 px soft front, a letter-by-letter wave, a blur front.

**Presets.**
- *Hue path per glyph.* About one step per frame: `#EACFA2` -> `#D0C68B` -> `#A7D3CE` -> `#8EDFE7` -> `#A5BBEA` -> `#A293D0` ->
  `#8F7EBE` -> `#463C5A` -> `#1A171F` -> `#000000`.
- *Brand keyword.* One keyword per caption in the brand blue (`#2832A5`) in the line's bold weight.
- *Gold for one frame.* Words appear gold and turn ink on the next frame; a swapped word heats up.
- *Tinted and blurred entry.* A word enters blue-tinted (`#7FA6F0`), blurred 2 px at 50 %, then sharp ink.
- *Green cooling.* A phrase typed letter by letter in the accent green that cools to black after 11-13 frames.

**Rich.** The tint is the brand colour or a designed path; a fast drain (1-6 f) so the line is one voice again; one accent word
per statement in the same face, chosen because it carries the meaning; a colour front that travels with the build.

**Cheap.** A highlight box behind the keyword; a coloured word in every statement; two accent colours; a rainbow gradient on
type; an accent that does not match the logo palette.

```tsx
// Tinted arrival + accent word. Colours as data; drain length in 30-fps frames.
import React from 'react';
import {interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';

export const HUE_PATH = ['#EACFA2', '#D0C68B', '#A7D3CE', '#8EDFE7', '#A5BBEA', '#A293D0', '#8F7EBE', '#463C5A', '#1A171F', '#000000'];
/** Colour of a word (or glyph) born at `at`: walks `path` one step per `stepF` frames @30, ending on `ink`. */
export const arrivalColour = (f: number, at: number, fps: number, path: string[], stepF = 1) => {
  const k = ((f - at) * 30) / fps / stepF;
  if (k <= 0) return path[0];
  if (k >= path.length - 1) return path[path.length - 1];
  return interpolateColors(k, path.map((_, i) => i), path);
};
export const TINTS = {
  gold1: ['#E9B44C', '#0A0A0A'],                 // 1 frame
  greyWhite: ['#8A8A8A', '#FFFFFF'],             // 2 frames (stepF 2)
  lavenderBlue: ['#B6B8E0', '#5A60C0', '#2832A5'], // Keyword: 3-4 frames to brand blue (kept)
  greenCool: ['#79CD05', '#79CD05', '#3D6A04', '#0A0A0A'], // Cools by age 11-13 (stepF 4)
  limeGhost: ['#E8F0B0', '#E8F0B0', '#9A9A9A'],  // 4-6 frames ghost then grey (stepF 3)
};
/** Colour front: per-glyph mix between accent and ink by distance behind a moving front (220 px soft edge). */
export const frontMix = (glyphX: number, front: number, soft = 220) => Math.min(1, Math.max(0, (glyphX - (front - soft)) / soft));
export const TintedWord: React.FC<{text: string; at: number; path: string[]; stepF?: number; style?: React.CSSProperties}> =
  ({text, at, path, stepF = 1, style}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return <span style={{...style, color: arrivalColour(f, at, fps, path, stepF)}}>{text}</span>;
};
```

### 12. Whip pan within a shot · `whip-pan`

Family: camera. See also `transitions.md` `whip`.

**What.** The camera pans fast within a shot (100-250 px per frame) from one subject to the next: a quick build, a peak, a
longer stop, with motion blur in proportion to the step (or none, by film).

**Job.** It connects two subjects in one space ("this, then that") faster than a cut and with more energy. Inside a follow it
skips ahead; between UI regions it shows they are one product.

**Numbers.**
- Peak 50-66 px per frame for small whips on a 1x UI; 150-260 px per frame for big ones (house 104 / 130 / 236); or about
  1000 px in one frame.
- Shape: a build of 9-12 f and a stop of 7-30 f (asymmetric; a tail up to 3x the build), or no stop when it ends in a cut.
- Blur 0.5 x the step, 60-120 px at 150-250 px per frame, a ramp 0 / 8 / 24 / 60 px, 4 sub-frame copies at 25 %, or none.
- Horizontal by default; vertical as a scene exit.

**Presets.**
- *Small whip.* A box centre 961, 960, 957, 954, 950, 944, 937, 928, 916, 900, 876, 840, 790 px (peak 50 px per frame), then a
  7-frame stop (`whipBuild`).
- *Long whip* (24 fps). Content dx -2.5, -9.3, -19.7, -32.7, -51.0, -74.6, -107.2, -148.2, -186.9, -205, -212, -212, -205,
  -190, -175, -164, -132 ... -41.7 ... -2.2 px; no blur.
- *World slide.* The whole world slides right at 150-250 px per frame with 60-120 px of horizontal blur.
- *Ramped blur.* A pan of half the width on a quad-in, blur 0, 8, 24, 60 px as it speeds up.
- *Whip and settle* (60 fps). tx -693 -> -1229, peaking at -61 px per frame with about 60 px of blur, settling over 17 f.

**Rich.** Asymmetric (a fast build, a long brake) or a build into a cut; blur strictly from speed (or consistently none);
something new arrives during the tail; a composed destination.

**Cheap.** A symmetric ease-in-out slide (a carousel); a fixed blur switched on for the move; whipping to nothing;
back-and-forth whips.

```tsx
// WhipPan: per-frame table or curve, blur from the step, optional sub-frame copies instead of a Gaussian.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {CL, ez, tbl, Smear} from './motion';
import {World, CAM, camBlur} from './camtype';

const LONG_WHIP = [-2.5, -9.3, -19.7, -32.7, -51, -74.6, -107.2, -148.2, -186.9, -205, -212, -212, -205, -190, -175, -164, -132.1, -110,
  -92, -78, -66, -57, -50, -46, -43, -41.7, -37, -33.4, -29.9, -26.2, -25.4, -21.1, -18.6, -16, -13.4, -11.3, -9.3, -7.2, -5.6, -3.8, -2.2, 0];
const cum = LONG_WHIP.reduce<number[]>((a, v) => (a.push((a[a.length - 1] ?? 0) + v), a), []);   // cumulative content x @24

export const WhipPan: React.FC<{at: number; mode?: 'table' | 'curve'; dist?: number; dur?: number; blurK?: number; children: React.ReactNode}> =
  ({at, mode = 'table', dist = -1500, dur = 19, blurK = 0.5, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const x = (g: number) => mode === 'table'
    ? tbl(g, at, [0, ...cum], 24, fps)
    : interpolate(g, [at, at + Math.round((dur * fps) / 30)], [0, dist], {...CL, easing: ez(CAM.whipBuild)});  // 12/7
  const step = x(f) - x(f - 1);
  return <Smear id="wp" sx={camBlur(step, blurK)}><World cam={{s: 1, x: x(f), y: 0}}>{children}</World></Smear>;
};
// Alternative to a Gaussian: draw the world 4 times at x - k*step/4 (k = 0..3), each at opacity 0.25, only on whip frames.
// No-blur film: blurK = 0.
```

### 13. Giant type as a landscape · `giant-type-travel`

Family: type, camera. See also `items.md` `giant-type`.

**What.** A word or line so large it fills the frame height (cap 360-720 px) is treated as a place: the camera pans or drifts
along it, the type changes colour as the world changes behind it, and it often matches into the same line at normal size.

**Job.** Type becomes the set. One word carries a whole shot with scale and motion alone; read in pieces as the camera travels,
it feels physical.

**Numbers.**
- Cap 150-576 px (font 300-820 px); the word cut by the frame edges.
- Travel 142 -> 16 px per frame on an expo-out, 6 -> 130 -> 250 px per frame on an ease-in, 1 -> 7 px per frame drifting, or
  6-12 px per frame.
- Perspective: scale +6 % then -6 % and a roll up to 2.1 degrees during the pan.
- Colour change during the travel (black -> white as a picture blooms behind; blue -> black).
- Exit: a match cut to the same words small, keeping the motion; or a cut at speed.

**Presets.**
- *Giant black pan.* A hard cut to giant black type filling the frame height on a screen-fixed blue-to-white gradient; the
  pan runs 142 -> 16 px per frame on an expo-out with a touch of scale and roll.
- *Accelerating pan* (24 fps). The camera pans right on an accelerating ease-in (6 -> 250 px per frame) while the type turns
  from black to white as a picture blooms behind it.
- *Serif over a defocused sky.* One line of a white light serif at cap 218 px over a still defocused sky, drifting 1 -> 7 px
  per frame, then a match cut to the same line small.
- *Giant word sweep.* A giant word (cap 444 px) with a blue -> black sweep over 8 f, cut to the same word smaller.
- *Designed blur.* A word in a bold grotesk at 205 px, -0.045 em, its right 40 % permanently blurred, drifting 6-12 px per frame.

**Rich.** The type cropped by the frame; a move with its own curve; a hint of perspective; the ground behind changing while the
type travels; a handover that matches the same words at another size.

**Cheap.** A giant word centred and static; a constant-speed marquee; type scaled past the measure with default tracking;
outlined giant type with no light.

```tsx
// GiantTravel: a giant line as a plane; pan with an expo-out plus a small perspective scale and roll.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {CL, ez, tbl} from './motion';
import {CAM, FACE} from './camtype';

export const GiantTravel: React.FC<{text: string; at: number; capPx?: number; travel?: number; dur?: number; ink?: string}> =
  ({text, at, capPx = 576, travel = -1454, dur = 25, ink = '#0F1115'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const t = interpolate(f, [at, at + Math.round((dur * fps) / 30)], [0, 1], {...CL, easing: ez(CAM.giantPan)});
  const x = travel * t;
  const s = tbl(f, at, [1, 1.06, 1.052, 1.034, 1.015, 0.998], 30 / 5, fps);   // Scale every 5 f @30
  const roll = tbl(f, at, [0, -0.2, -0.1, 0.6, 1.5, 2.1], 30 / 5, fps);
  const step = Math.abs(x - travel * interpolate(f - 1, [at, at + Math.round((dur * fps) / 30)], [0, 1], {...CL, easing: ez(CAM.giantPan)}));
  const fontSize = capPx / 0.7;                                                  // cap ~0.70 em for the display face
  return (
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(#5A88F2 0px, #B5CBF7 250px, #EEF2FD 450px, #fff 600px)'}}>
      <div style={{position: 'absolute', left: 0, top: 792 - fontSize * 0.98, whiteSpace: 'nowrap', transformOrigin: '960px 540px',
                   transform: `translateX(${x}px) scale(${s}) rotate(${roll}deg)`, filter: step > 4 ? `blur(${Math.min(30, step * 0.42) / 2}px)` : undefined,
                   fontFamily: FACE.grotesk, fontWeight: 500, fontSize, letterSpacing: '-0.045em', color: ink}}>{text}</div>
    </div>
  );
};
// Variant: accelerating drift x = 78 + 53 * ((f - 3) / 33) ** 2.6 over 33 f, words fade with the opacity table, a blurred
// sky plate (filter blur 20 px on a 2x crop) behind; match cut to the small headline continuing at the same px/f and braking.
```

### 14. A UI plane in perspective that lands flat · `plane3d-settle`

Family: camera, 3D. See also `animations.md` `flip3d`.

**What.** A flat UI (a card, a page, a phone face, a prompt box) is a plane in a perspective camera: it enters tilted (rotateX /
rotateY 25-90 degrees, or a sliver edge-on) and swings to face the camera as it decelerates; or the camera yaws a few degrees
during a push. Depth comes from a designed 3D move, never from a card left tilted.

**Job.** A flat product gains real space and an arrival with weight; the swing-to-flat is a reveal; a yaw during a push makes a
screen recording feel shot by a camera.

**Numbers.**
- Entry tilt: rotateX 25-28, 45, 54, 85-90 degrees (edge-on); rotateY 28.
- Yaw during a push: up to -8 degrees with rotateZ +1.
- Perspective 900-2000 px, origin at the frame centre.
- Settle: 6 f for a flip from edge-on (85, 70, 45, 25, 10, 0 degrees), 18 f, 9-10 f, or 20-40 f while travelling.
- Every plane rests flat; tilted cards at rest only inside a real 3D world.

**Presets.**
- *Channel card.* A large frosted card tilted back (top edge farther, a trapezoid) swings flat as it rises.
- *Window swing.* rotateY 28 -> 0 (right side away) and rotateX 6 -> 0 over 18 f, landing flat.
- *Sliver flip.* A prompt box as a 6 px white sliver with a strong glow flips up to face-on in 6 frames.
- *Camera tilt.* A camera tilt from 90 degrees (edge-on) to 12 on `tilt3d` over 10 f.
- *Yaw push.* During a push, a 3D yaw with perspective 1400 px about the window centre: 0, -1 ... -8 degrees, with a lens bulge
  (`lens-bulge-push`).

**Rich.** A perspective camera with a real origin; the rotation decelerating to exactly 0; the tilt combined with a travel so it
reads as a camera move; a glow or rim light on the edge when it is a sliver; the text on the plane shearing correctly.

**Cheap.** A 2D card rotated -6 degrees at rest; rotateY with no perspective (a squash); a perspective so strong (under 800 px)
the UI distorts; tilts that never resolve.

```tsx
// Plane3D: a flat DOM plane that swings from a tilt to flat under a perspective camera; per-frame tables or a curve.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {CL, ez, tbl} from './motion';
import {CAM} from './camtype';

export const Plane3D: React.FC<{at: number; rx?: number[] | number; ry?: number; dur?: number; persp?: number; rise?: number;
  w: number; h: number; children: React.ReactNode}> =
  ({at, rx = [85, 70, 45, 25, 10, 0], ry = 0, dur = 18, persp = 1200, rise = 0, w, h, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const t = interpolate(f, [at, at + Math.round((dur * fps) / 30)], [0, 1], {...CL, easing: ez(CAM.pushLand)});
  const ax = Array.isArray(rx) ? tbl(f, at, rx, 25, fps) : rx * (1 - t);     // Table authored @25
  const ay = ry * (1 - t);
  return (
    <div style={{position: 'absolute', inset: 0, perspective: `${persp}px`, perspectiveOrigin: '960px 540px'}}>
      <div style={{position: 'absolute', left: 960 - w / 2, top: 540 - h / 2, width: w, height: h, transformOrigin: '50% 50%',
                   transform: `translateY(${rise * (1 - t)}px) rotateX(${ax}deg) rotateY(${ay}deg)`, backfaceVisibility: 'hidden'}}>
        {children}
      </div>
    </div>
  );
};
// Rx 28 (constant), rise 600 -> 0 with CAM.pushLandSoft over 24 f, persp 2000; then the velocity cut to the flat card.
// Rx 6 -> 0, ry 28 -> 0, scale 0.92 -> 1, translateX 90 -> 0 over 18 f.
// Yaw during a push: wrap the World in perspective 1400 and set cam.ry from the table [0,0,0,-1,-2,-3,-4.5,-6,-7,-7.5,-8 ... -8,-7,-6,-5,-4].
// 4-point planes: solve a CSS matrix3d from the 4 screen anchors per key frame (homography), interpolate the anchors, not the matrix.
```

### 15. Emphasis by a face switch · `face-switch`

Family: type. See also `animations.md` `font-cycle`.

**What.** One word changes face: a display serif italic inside a grotesk line (the human, felt word), or a word that arrives
through a sequence of faces (pixel -> italic serif -> grotesk) before settling. The switch is the emphasis; no box, no
underline.

**Job.** The key word sounds different, like a change of voice; a serif italic reads as idea, AI, behind, thoughts. A cycle on
arrival says generated or many styles, and can become the brand's signature.

**Numbers.**
- Pairing: a neo-grotesk at 500-700 with a display serif italic at 400 (Instrument Serif, Libre Caslon Italic, Playfair Italic).
- Size match: the serif at 1.15-1.3x the grotesk's font size so the x-heights match.
- One switched word per line; cycles of 3 frames per face, or 4 + 4-8 frames.
- Colour: the switched word may carry the accent, or stay in ink.

**Presets.**
- *Wordmark split.* A product word in Inter 600 at -0.02 em, the suffix in Instrument Serif Italic 400, sized to match
  x-heights.
- *Italic AI.* One word in a lime accent, then "AI" in a serif italic, white, cap 76 px, cutting on to its right (lime on its
  first frame).
- *Serif then grotesk.* A two-word phrase in a serif at 122 px, -0.01 em, then the key word in a bold grotesk at 205 px, -0.045 em.
- *Small italics in UI.* In-scene labels in a serif italic, white, cap 27 px.
- *Cycle.* A new word arrives in a blue pixel face, turns into a blue italic serif, then a black grotesk (4 f, 4-8 f).

**Rich.** A real display italic sized to the grotesk's x-height and sharing its baseline, for one word with meaning; cycles
rasterised honestly (nearest-neighbour pixel faces) in 3-4 frame steps.

**Cheap.** A browser-synthesised oblique of a sans; a serif word that sits lower or smaller than the line; a different face on
every line; script fonts for whole sentences.

```tsx
// SwitchWord and FaceCycle. Pixel faces: render the word to a small canvas and upscale with image-rendering: pixelated.
import React, {useEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {FACE} from './camtype';

export const SwitchLine: React.FC<{before: string; word: string; after?: string; size: number; serifScale?: number}> =
  ({before, word, after = '', size, serifScale = 1.18}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 540, transform: 'translateY(-50%)', textAlign: 'center', whiteSpace: 'pre',
               fontFamily: FACE.grotesk, fontWeight: 600, fontSize: size, letterSpacing: '-0.02em', color: '#0F1115', lineHeight: 1}}>
    {before}
    <span style={{fontFamily: FACE.serif, fontStyle: 'italic', fontWeight: 400, fontSize: size * serifScale, letterSpacing: '-0.01em'}}>{word}</span>
    {after}
  </div>
);

/** Pixel rendering of a word: draw at 1/k scale, upscale nearest. Deterministic. */
export const PixelWord: React.FC<{text: string; size: number; weight: number; k: number; color: string; family?: string}> =
  ({text, size, weight, k, color, family = 'Inter Variable'}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil((text.length * size * 0.62) / k), h = Math.ceil((size * 1.25) / k);
  useEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.clearRect(0, 0, w, h); c.fillStyle = color; c.font = `${weight} ${size / k}px "${family}"`; c.textBaseline = 'alphabetic';
    c.fillText(text, 0, (size * 0.95) / k);
  }, [text, size, weight, k, color, family, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{width: w * k, height: h * k, imageRendering: 'pixelated'}} />;
};

/** Arrival: pixel (4 f) -> italic serif lavender (6 f) -> grotesk ink. Frames @30. */
export const CycleWord: React.FC<{text: string; at: number; size: number}> = ({text, at, size}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const k = ((f - at) * 30) / fps;
  if (k < 0) return null;
  if (k < 4) return <PixelWord text={text} size={size} weight={600} k={6} color="#6082F5" />;
  if (k < 10) return <span style={{fontFamily: FACE.serif, fontStyle: 'italic', fontSize: size * 1.18,
    background: 'linear-gradient(#6F7BF0, #A49BEF)', WebkitBackgroundClip: 'text', color: 'transparent'}}>{text}</span>;
  return <span style={{fontFamily: FACE.grotesk, fontWeight: 400, fontSize: size, color: '#0A0A0A'}}>{text}</span>;
};
// Cycle: faces = [Plex Mono 300, Pixel(Inter 300, k 6), Inter 400, Pixel(Inter 800, k 9), Archivo 800 wdth 112], 3 f each @24.
```

### 16. Rack focus and the depth ladder (camera side) · `rack-focus`

Family: camera, lens. The look and blur cost are in `effects.md` `dof-ladder`, `defocus-exit` and `focus-pull-in`; this entry
gives when focus moves and by how much.

**What.** The camera has a focal plane: a shot opens soft and snaps into focus, focus pulls from one layer to another, elements
at other depths are blurred by their distance, and a shot can end by defocusing.

**Job.** It directs the eye with optics instead of arrows: the sharp thing is the subject. A focus pull is a cut inside a shot; a
defocus is an ending that needs no fade.

**Numbers.**
- Focus-in: 2.5-14 px -> 0 in 5-9 f (with a scale 1.09 -> 1.0 for a word).
- Defocus exit: 0 -> 4.5-7.2 px over 9-15 f, to 28 px in 3 f for a card, to 40 px for a world.
- Ladder: 0 at the subject, 1-3 px one step away, 3-8 px two steps, 8-12 px near the lens, 40-60 px for masses.
- Rack: 4 px for 4 frames; far elements dimmed 50-70 %.

**Presets.**
- *Snap into focus.* 2.5, 3.5, 3, 3, 2.5, 0 px over 6 f.
- *Focus by depth.* The subject 1.0-1.5 px; the near-centre layer 1-3; side and back 4-8; nearest the lens 8-12; the far plate
  3-4.
- *Word focus pull.* 14, 10, 7, 4, 2, 0 px with scale 1.09 for five frames, then 1.06, 1.03, 1.0.
- *Far and near.* Far elements 6-10 px and dimmed to 50-70 %; near ones 6-8 px; the middle sharp.
- *Focus band.* Sharp in a horizontal band, about 5 px at its edges and 8 px at the frame edges.

**Rich.** Blur by depth (a ladder); the subject sharp and brightest; focus moving on story beats; the pull combined with a small
scale settle (lens breathing); near-lens elements very soft.

**Cheap.** A uniform background blur behind a sharp card; blur as a transition on everything; focus pulls with no change of
subject; blur over 20 px on text.

```tsx
// Depth layers: each child has a depth z; the camera's focus z animates; blur = |z - focus| * k (kit dof()).
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {CL, ez, tbl} from './motion';
import {dof, CAM} from './camtype';

export const DepthLayer: React.FC<{z: number; focus: number; k?: number; dimFar?: boolean; children: React.ReactNode}> =
  ({z, focus, k = 3, dimFar = false, children}) => {
  const b = dof(z, focus, k, 40);
  return <div style={{position: 'absolute', inset: 0, filter: b > 0.3 ? `blur(${b}px)` : undefined,
                      opacity: dimFar && z > focus ? Math.max(0.5, 1 - (z - focus) * 0.15) : 1}}>{children}</div>;
};
/** Focus-in on a word: blur and scale tables @30. */
export const focusIn = (f: number, at: number, fps: number) => ({
  blur: tbl(f, at, [14, 10, 7, 4, 2, 0], 30, fps),
  scale: tbl(f, at, [1.09, 1.09, 1.09, 1.09, 1.09, 1.06, 1.035, 1.015, 1.0], 30, fps),
});
/** Defocus exit: sigma per frame from the start of the exit @24. */
export const EXIT_DEFOCUS = [0, 0.3, 0.4, 0.8, 1.0, 1.2, 1.7, 2.2, 2.9, 3.6, 4.1, 4.8, 5.6, 6.4, 7.2];
export const useRack = (at: number, from: number, to: number, durF = 4) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return interpolate(f, [at, at + Math.round((durF * fps) / 30)], [from, to], {...CL, easing: ez(CAM.tilt3d)});
};
// Blur > 20 px at 1080p: blur a 50 % scaled copy (CSS transform scale(0.5) inside, filter, then scale(2)) to keep the CPU cost flat.
```

### 17. Per-letter wordmark reveal into the lockup · `letter-lockup`

Family: type, logo. See also `animations.md` `letter-reveal` and `items.md` `logo-lockup`.

**What.** The brand name arrives glyph by glyph: each glyph cuts on, fades, or glides in from the right at reduced opacity and
tightens into its slot, while the lockup re-centres and often the camera pulls back. A real company's wordmark is its official
file (split into glyph paths) or its own font; never redrawn.

**Job.** The name spelled out as the last beat: a typed signature. The per-glyph timing gives the end card a rhythm the sound
can hit (one tick per glyph), and the glide makes the word feel assembled.

**Numbers.**
- Glyph interval 1.4-4 f at 30 fps.
- Per-glyph entrance: a cut-on; a 2-4 f fade; 25 % -> 100 % in 3-4 f with a colour; a glide of 1.2 glyph widths in 8-10 f at
  85 %; a slide from the right in light grey; a tumble (scale 0.4, 20 degrees) in 7 f; a soft mask with a grey front.
- Order: left to right (the default), outside-in, or letters spaced +30 % that close up.
- The lockup re-centres per glyph (a cut jump or continuously), under a pull-back (1.98 -> 1.0) or a slide.

**Presets.**
- *Glyphs every 4 frames.* One glyph cuts on to the right of the icon every 4 f (8 f at 60 fps), no fade, no slide; the lockup
  re-centres on the same frames while the background dissolves.
- *Typed under a zoom-out.* A serif wordmark types in letter by letter beside the mark during a uniform zoom-out 1.98 -> 1.00;
  the glyphs glide in from 1.2 glyph widths to the right and tighten.
- *Left to right in white.* The white wordmark reveals letter by letter left to right, about one letter every 2 f.
- *Soft mask slide* (24 fps). The name revealed letter by letter while sliding left under a moving soft mask; the front letter
  reads grey for a frame or two.
- *Colour letters.* Letters appear at 25 % in lavender and reach full blue in 3-4 frames, one every 1.4 frames.

**Rich.** A glyph rhythm locked to sound ticks; the word tightening as it completes; the background or camera changing on the
same frames; the official wordmark split into glyph paths.

**Cheap.** A redrawn logo; a uniform per-letter fade-up from below in every film; letters popping with overshoot; a reveal so slow
the name is read before it is finished.

```tsx
// GlyphLockup: glyphs glide from the right at 85 % into their slots, lockup re-centred, optional pull-back.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import {CL, ez, CURVE} from './motion';

export const GlyphLockup: React.FC<{text: string; at: number; every?: number; size: number; family: string; weight?: number;
  mark?: React.ReactNode; markW?: number; gap?: number; glideW?: number; glideF?: number}> =
  ({text, at, every = 2.5, size, family, weight = 400, mark, markW = 0, gap = 30, glideW = 1.2, glideF = 9}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const glyphs = [...text];
  const adv = glyphs.map((g, i) => measureText({text: text.slice(0, i + 1), fontFamily: family, fontSize: size, fontWeight: weight,
    validateFontIsLoaded: false}).width);
  const starts = glyphs.map((_, i) => at + Math.round((i * every * fps) / 30));
  const shown = starts.filter((s) => f >= s).length;
  const groupW = markW + gap + (shown ? adv[Math.min(shown, glyphs.length) - 1] : 0);
  const left = 960 - groupW / 2;                              // re-centred every frame; = same but without a tween
  return (
    <div style={{position: 'absolute', left, top: 540 - size * 0.7}}>
      {mark && <div style={{position: 'absolute', left: 0, top: 0}}>{mark}</div>}
      {glyphs.map((g, i) => {
        if (f < starts[i]) return null;
        const t = interpolate(f, [starts[i], starts[i] + Math.round((glideF * fps) / 30)], [0, 1], {...CL, easing: ez(CURVE.land)});
        const x0 = markW + gap + (i ? adv[i - 1] : 0);
        const w = adv[i] - (i ? adv[i - 1] : 0);
        return <span key={i} style={{position: 'absolute', left: x0 + glideW * w * (1 - t), opacity: 0.85 + 0.15 * t,
          fontFamily: family, fontWeight: weight, fontSize: size, letterSpacing: '-0.01em', whiteSpace: 'pre'}}>{g}</span>;
      })}
    </div>
  );
};
// Official wordmarks: split the SVG into one <path> per glyph (by x order) and animate those paths instead of <span>s.
```

### 18. Typing with a head, a caret and a camera · `typewriter-camera`

Family: type, UI. See also `animations.md` `typewriter-head`.

**What.** Text typed into the product: characters cut on or fade over 2-6 frames at 0.7-3 characters per frame (prose) or about
14 per frame (code), the newest characters tinted or blurred (a head), a caret that stays solid while typing and blinks when
idle, and often a camera that rides the caret or pushes in as the line fills.

**Job.** The request is the product's verb: typing shows the user's intent in their own words, at a speed that reads as human or
as machine. The head makes each new character visible at video speed.

**Numbers.** 0.7-3 characters per frame (prose), about 14 (code); a per-character fade of 0-6 f; a head tint of 1-13 f; a caret
1-10 px wide and 0.9-1.1x the line height; blink 2 / 2, 10 / 10 at 24 fps, or a 16 f period; solid while typing.

**Presets.**
- *Word-end holds.* One character per frame with a hold of a frame or two at the end of each word.
- *Fading letters.* Each letter fades over 2 frames from light grey to black.
- *Big caret.* A dark caret 9-10 px wide and 113 px tall, blinking 10 on / 10 off at 24 fps, independent of the typing.
- *Riding camera.* The camera follows the caret (`action-follow`), or pans with it at about 8 px per frame, or pushes in x1.41
  while a handle is deleted and retyped.

**Rich.** An uneven rate (word-end holds, bursts); a visible head; a caret that never blinks while typing; real typing errors only
when the story wants them; the camera framing the end of the line.

**Cheap.** A constant one character per frame for 3 s; a blinking caret during typing; monospace for prose; typing so small it
cannot be read; the whole field visible with the text in one corner.

```tsx
// Typed: visible substring from a schedule (chars per 30-fps frame, with word-end holds), head blur/tint, caret rules.
import React from 'react';
import {interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';

export const charsAt = (n30: number, text: string, rate = 1.2, wordHold = 2) => {
  let t = 0, c = 0;                                       // walk the text: each char costs 1/rate frames, each space +wordHold
  while (c < text.length) { const cost = 1 / rate + (text[c] === ' ' ? wordHold : 0); if (t + cost > n30) break; t += cost; c++; }
  return c;
};
export const Typed: React.FC<{text: string; at: number; rate?: number; size: number; color?: string; head?: string; headF?: number;
  blurHead?: boolean; caretW?: number; blinkOn?: number; blinkOff?: number}> =
  ({text, at, rate = 1.2, size, color = '#111', head = '#3B6CF6', headF = 4, blurHead = false, caretW = 2, blinkOn = 10, blinkOff = 10}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const n30 = ((f - at) * 30) / fps;
  const n = Math.max(0, charsAt(n30, text, rate));
  const typing = n < text.length;
  const idle = n30 - (text.length / rate + (text.split(' ').length - 1) * 2);   // frames since the last character
  const caretOn = typing || idle < 0 || (Math.floor(idle) % (blinkOn + blinkOff)) < blinkOn;   // solid while typing
  return (
    <span style={{fontSize: size, whiteSpace: 'pre', color}}>
      {[...text.slice(0, n)].map((ch, i) => {
        const born = i / rate + (text.slice(0, i).split(' ').length - 1) * 2;   // when char i appeared (same costs as charsAt)
        const age = n30 - born;                                                  // in 30-fps frames
        const k = Math.max(0, Math.min(1, age / headF));
        return <span key={i} style={{color: interpolateColors(k, [0, 1], [head, color]),
          filter: blurHead && k < 1 ? `blur(${8 * (1 - k)}px)` : undefined, opacity: blurHead ? 0.4 + 0.6 * k : 1}}>{ch}</span>;
      })}
      {caretOn && <span style={{display: 'inline-block', width: caretW, height: size * 1.05, background: color, verticalAlign: 'text-bottom',
                                marginLeft: 2}} />}
    </span>
  );
};
// Head: blurHead true, headF 3 (6 f @60). head '#2F6BFF' on words (apply per word), caret 10 px wide, blink 10/10 @24.
```

### 19. Go-stop-go travel on the beat · `pulse-travel`

Family: camera, rhythm.

**What.** The camera travels in pulses: a fast push that peaks near a beat, a long soft settle almost to a stop, then the next
push; it ends with an acceleration into the cut. Distance is covered in steps the music can carry.

**Job.** A long travel (a timeline, a chain of words, a strip of cards) gets a musical rhythm and moments of rest where each new
item can be read: camera choreography rather than transport.

**Numbers.** Pulse peaks 106-147 px per frame; between pulses 2-20 px per frame (never a dead stop); pulses 13-16 f apart (about
one beat at 122 BPM / 25 fps), the peak on the beat within about +/-6 f; rise 3-5 f, settle 8-12 f; exit accelerating x1.2-1.3
per frame into the cut.

**Presets.**
- *Pulsed pan* (25 fps, 122 BPM). The camera pans right in three pulses 13-16 f apart, each peaking near a beat and settling to a
  slow crawl, the last pulse turning into the exit.
- *Slow surge.* Content dx -50.2, -56.6, -58.3, -59.8, -61.2, -62.2, -62.7, -63.0, -63.1, -63.2 px per frame ... a near-constant
  surge that then settles.
- *Drift, slow, surge.* A line drifts left the whole time, slowing for 11 f, then accelerating again into the cut.
- *Pan to a stop.* A leftward pan decelerates to a stop while the headline builds on the right.
- *Stepped room push.* Keep a 5-frame rhythm in a push or pan (do not smooth the table).

**Rich.** Pulses aligned to the music (a whoosh per pulse); each rest lands a new item in a readable position; speed never quite
reaching zero; the last pulse becoming the exit.

**Cheap.** A constant-speed scroll; pulses off the beat; full stops (it becomes a slideshow); equal rise and fall.

```tsx
// PulseTravel: sum of pulses, each a fast push with a long settle (CAM.pushLand over riseF + settleF), placed on beat frames.
import {interpolate} from 'remotion';
import {CL, ez} from './motion';
import {CAM, whipOut} from './camtype';

export const pulseX = (f: number, fps: number, o: {beats: number[]; dist: number[]; riseSettleF?: number; exitAt?: number; v0?: number}) => {
  const L = Math.round(((o.riseSettleF ?? 14) * fps) / 25);       // ~14 f @25 per pulse (3-5 f rise, 8-12 f settle)
  let x = 0;
  o.beats.forEach((b, i) => {
    const start = b - Math.round((3 * fps) / 25);                   // the peak lands ~3 f after the push starts
    x += o.dist[i] * interpolate(f, [start, start + L], [0, 1], {...CL, easing: ez(CAM.pushLand)});
  });
  if (o.exitAt !== undefined && f > o.exitAt) x -= whipOut(((f - o.exitAt) * 25) / fps, 0, o.v0 ?? 15, 1.27);  // -15 ... -91 px/f
  return x;
};
// @25: beats [5, 21, 34] after the start, dist [-560, -470, -520], exitAt 49, v0 15 -> cut 6 f later.
```

### 20. Decode, scramble, slot roll in brackets · `type-swap`

Family: type. See also `animations.md` `decode` and `swap-drum`.

**What.** A word changes in place: random glyphs lock into letters (decode), letters shuffle into a new word (scramble or
anagram), or the old word rolls up out of a clip and the new one rolls in from below (slot roll), often inside L-shaped corner
brackets that resize to the new word, with a camera zoom on the swap.

**Job.** One position on screen carries a sequence of ideas (one step, the next, the next): the viewer reads change without the
layout changing. A decode says computed; a slot roll says next step.

**Numbers.**
- Decode 6-17 f; glyph blocks 12 px; a glow that decays from strong for 2 f to a quarter after 4 f.
- Roll: 4-6 f per swap, old and new at the same speed (70-80 px per frame at that size), 25 px vertical blur, the clip = the
  bracket box; the box resizes to the new word over 8-10 f.
- Camera on the swap: a pre-zoom of +17 % over 4 f before the roll; the next word at a new scale (68 -> 146 px cap).
- Colour: decode in the accent then white, lavender then black, or heat then black.

**Presets.**
- *Bracketed roll.* A scrambled four-letter word decodes into the first word inside two L-shaped brackets while the group zooms
  down; then the word rolls up out of the bracket box and the next rolls in (5 f), the brackets resizing, twice.
- *Decode out of a swirl.* A techno title decodes out of a soft blue swirl over a fine dot grid, glyph by glyph from a white
  front, over 17 f.
- *Scramble into the title.* Letters scramble into the product title (lavender for 3 f, black on the last).
- *Pixel states.* Pictures and captions enter and leave through mosaic states and decode.
- *Anagram.* Two coloured words that are anagrams of the next words appear and resolve.

**Rich.** Fronts with structure (blocks at the edge, glow by age, the right edge lagging); a designed clip (the bracket box);
the camera taking part (a pre-zoom, a new scale per word); sound ticks on glyph locks; the final word still and crisp.

**Cheap.** Random characters flickering uniformly across the whole word; a roll with no clip; green code-rain styling; a decode
on every line.

```tsx
// SlotRoll and Decode -- deterministic: random from remotion with a seed per glyph and frame.
import React from 'react';
import {random, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {CL, ez, Smear} from './motion';

export const SlotRoll: React.FC<{words: string[]; at: number[]; size: number[]; box: (i: number) => [number, number, number, number];
  rollF?: number}> = ({words, at, size, box, rollF = 5}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const i = Math.max(0, at.filter((a) => f >= a).length - 1);
  const t = i > 0 ? interpolate(f, [at[i], at[i] + Math.round((rollF * fps) / 30)], [0, 1], CL) : 1;
  const b0 = box(Math.max(0, i - 1)), b1 = box(i);
  const k = ez([0.267, 1.15, 1.0, 0.939])(Math.min(1, t * 1.6));
  const bx = b0.map((v, j) => v + (b1[j] - v) * k);
  const [x0, y0, x1, y1] = bx; const h = y1 - y0;
  const blur = t > 0.1 && t < 0.9 ? 12 : 0;                        // 25 px smear on the 3 middle frames (as sigma ~12)
  const Corner = ({x, y, sx, sy}: {x: number; y: number; sx: 1 | -1; sy: 1 | -1}) => (
    <svg style={{position: 'absolute', left: x - 70, top: y - 70, overflow: 'visible'}} width={140} height={140}>
      <path d={`M ${70 + sx * 68} 70 L 70 70 L 70 ${70 + sy * 62}`} stroke="#F0F0F0" strokeWidth={3.5} fill="none" strokeLinecap="square" />
    </svg>);
  return (
    <>
      <Corner x={x1} y={y0} sx={-1} sy={1} /><Corner x={x0} y={y1} sx={1} sy={-1} />
      <div style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: h, overflow: 'hidden'}}>
        {[i - 1, i].filter((j) => j >= 0 && (j === i || t < 1)).map((j) => {
          const dy = j === i ? (1 - t) * h : -t * h;                // old up, new from below, same speed
          return (
            <div key={j} style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`, display: 'flex', alignItems: 'center',
                                 justifyContent: 'center'}}>
              <Smear id={`sr${j}`} sy={blur}><span style={{fontSize: size[j], color: '#F2F2F3', fontFamily: 'Segoe UI, Selawik, sans-serif'}}>{words[j]}</span></Smear>
            </div>);
        })}
      </div>
    </>
  );
};

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/';
/** Decode: glyph i shows a random glyph until its lock frame, then the real letter; a front glyph can render as blocks. */
export const decodeText = (text: string, f: number, at: number, perGlyph = 1, jitter = 3, seed = 'dec') =>
  [...text].map((ch, i) => {
    const lock = at + i * perGlyph + Math.floor(random(`${seed}${i}`) * jitter);
    if (ch === ' ' || f >= lock) return ch;
    return GLYPHS[Math.floor(random(`${seed}${i}-${f}`) * GLYPHS.length)];
  }).join('');
```

### 21. Tracking as motion · `tracking-motion`

Family: type. See also `animations.md` `tracking-snap`.

**What.** Letter-spacing animates: a word arrives too tight or too wide and snaps to normal in 1-3 frames, springs open from
-0.35 em over a second, opens to +0.6 em as it dies, or a building word is letter-spaced and closes up as it completes.

**Job.** A still word gets an arrival without moving: it breathes in to its true shape. Tight-to-normal reads as energy;
normal-to-wide as dissolving (an exit); wide-to-normal as assembly.

**Numbers.** A snap from -0.09 / +0.18 em to rest in 1-3 f (ease-out); a spring from -0.35 em over 23 f at 60 fps with 70 % in
5 f; an exit opening 0 -> +0.6 em over 3-4 f with a 4-5 px blur and a fade; assembly from +30 % (or 1.2 glyph widths) to 0 in
8-10 f. The word stays centred, or anchored at its inner edge.

**Presets.**
- *Snap* (24 fps). The tracking snaps from an extreme value to normal in 1-3 frames on each new word.
- *Spring open* (60 fps). The tracking springs open to normal over 24 f (70 % done by frame 6) while each word stays anchored
  at its inner edge.
- *Opening exit.* Blur 0 -> 1 -> 2 -> 3 px and scale 1 -> 0.97 over 4 f, then the letter-spacing opens to +0.6 em while the
  word fades.
- *Assembly.* Glyphs enter 1.2 glyph widths right of their slot, so the word reads letter-spaced while building and tightens as
  it completes.

**Rich.** A first-frame-heavy snap; a chosen anchor; the tracking change paired with a cut or a sound hit; short exit openings
(3-4 f) with blur and fade.

**Cheap.** A slow letter-spacing tween over a second on every title; tracking animated on body text; an opening with no anchor
(the word slides).

```tsx
// TrackSnap: letter-spacing from an extreme to rest, first-frame heavy, centred or edge-anchored.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {CL, ez, CURVE} from './motion';

export const TrackSnap: React.FC<{text: string; at: number; from?: number; to?: number; durF?: number; size: number; anchor?: 'center' | 'left' | 'right';
  curve?: readonly [number, number, number, number]}> =
  ({text, at, from = -0.09, to = -0.02, durF = 3, size, anchor = 'center', curve = CURVE.snap}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const em = interpolate(f, [at, at + Math.max(1, Math.round((durF * fps) / 24))], [from, to], {...CL, easing: ez(curve)});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 540, transform: 'translateY(-50%)', textAlign: anchor,
                 fontSize: size, letterSpacing: `${em}em`, whiteSpace: 'pre', marginRight: `${-em}em` /* keep optical centre */}}>
      {text}
    </div>
  );
};
// From -0.09 (or +0.18) to rest in 3 f @24 with CURVE.snap. from -0.35 to 0, durF 23 @60 -> pass durF in 24-fps units (9)
// curve [0.26, 0.81, 0.66, 0.83], anchor 'right' for the left word and 'left' for the right word, plus two ghost copies on f1-3.
// Exit: from 0 to 0.6 over 3 f with filter blur 4-5 px and opacity 0.8 -> 0.5.
```

### 22. Camera roll as an accent · `roll-accent`

Family: camera.

**What.** The camera rotates about the lens axis: a fast roll out and an expo return to upright, a roll combined with a zoom (a
spiral dive), or a moving subject arriving rolled and settling level. Rolls are accents (0.2-1.3 s), never a resting state.

**Job.** A jolt of energy and disorientation that resolves: entering a new space, diving into a detail, a phone thrown into
frame. The return to level is the landing that makes it feel controlled.

**Numbers.** 1.6-3.5 degrees (footage-like), 11-15, or 26-50; within -38 to +63; 0.2-1.3 s (house 0.4 s); the
return decays 0.83 per frame at 24 fps, or on an expo-out (26.6 -> 6.2 degrees in 10 f); peak 6.4-9 degrees per frame; always
paired with a zoom (x1.45, x1.89, or 0.425).

**Presets.**
- *Hall roll* (24 fps). The camera rolls about +50 degrees and back to upright into a corridor (9 degrees per frame at its
  fastest, decaying 0.83 per frame).
- *Whip zoom with roll.* The content moves down 248 px and scales x1.58 (peaking at 1.0797 per frame) with a roll into a
  detail.
- *Phone arrives rolled.* After a whip cut the phone arrives moving left and rotated +26.6 degrees, settling to +6.2 in 10 f and
  +2.0, +1.6 after.
- *Rising roll.* The camera rises, travels toward the far end and rolls clockwise about 30 degrees, then levels.
- *Footage roll.* A city zoom-out ends at 0.425 with a -3.5 degree roll on an ease-in-out.

**Rich.** A roll with a zoom or travel (a spiral move); a decaying return that lands exactly level; motion blur along the arc on
fast frames; the subject held near the pivot.

**Cheap.** A constant rotation; a Dutch angle left on; rolling flat 2D cards at rest; rolling the frame with nothing to read.

```tsx
// RollAccent: out (ease-in-out) and back (geometric decay), optionally with a zoom. Rotation tables in 24-fps frames.
import {interpolate} from 'remotion';
import {CL, ez} from './motion';

export const rollAccent = (f: number, fps: number, o: {at: number; peakDeg?: number; outF?: number; holdF?: number; decay?: number;
  zoomPerFrame0?: number; zoomDecay?: number}) => {
  const k = ((f - o.at) * 24) / fps;                     // Clock (24 fps)
  const peak = o.peakDeg ?? 50, outF = o.outF ?? 9, holdF = o.holdF ?? 3, d = o.decay ?? 0.83;
  let rot = 0, s = 1;
  if (k > 0 && k <= outF) rot = peak * ez([0.45, 0, 0.55, 1])(k / outF);
  else if (k > outF && k <= outF + holdF) rot = peak;
  else if (k > outF + holdF) {
    const n = k - outF - holdF;
    rot = peak * Math.pow(d, n);                           // 9.05 deg on the first return frame for peak 50, d 0.83
    const z0 = o.zoomPerFrame0 ?? 1.055, zd = o.zoomDecay ?? 0.88;
    for (let i = 0; i < Math.floor(n); i++) s *= 1 + (z0 - 1) * Math.pow(zd, i);    // push 1.055 -> 1.009 per frame
  }
  return {rot, s};
};
// Apply with <World cam={{s, x: 0, y: 0, rot}}>; the subject (cube) stays fixed in the world. peakDeg -37.3, no hold, zoom x1.45 in 27 f.
```

### 23. Crane and tilt with a foreground wipe · `crane-tilt`

Family: camera. See also `transitions.md` `continuous-camera` and `backgrounds.md` `world-plate`.

**What.** The camera moves vertically (the content travels up or down): a crane over a cloud plate, a tilt down a grid to the
next row, a tilt up off an input as results rise, often finished by a foreground mass rushing through (a cloud, a mist, a
horizon) that hides the stop.

**Job.** Vertical travel reads as discovery; a scene changes without a cut (the foreground wipe is a natural transition); a tilt
down into darkness or mist ends a film or section softly.

**Numbers.** 4 -> 16 px per frame accelerating on a plate, 20 px per frame on a horizon, a tilt peaking at 73 px per frame,
170-189 px per frame for the foreground mass; travel 186-420 px (one row or one band); ends: a stop hidden by a foreground, a
near-hold then a new direction, or a cut; blur about 10 % of the travel when used.

**Presets.**
- *Cloud crane* (24 fps). The camera tilts down so the frame content moves up, accelerating 4 -> 16 px per frame, then a big
  foreground cloud rushes past at 170-189 px per frame and hides the stop.
- *Push, then tilt.* A slow push (about 0.2 % per frame) for 22 f, then a tilt down that moves the content up 420 px, peaking at
  73 px per frame.
- *Tilt up off the input.* The camera tilts up off the input (which continues at the top of the frame) as the results grid rises
  186 px on an expo-out.
- *Tilt into darkness.* At the end, a tilt down into darkness.
- *Accelerating tilt into a match.* The content moves up -11, -17, -26 px per frame ... and cuts on a match.

**Rich.** The move reveals the next story item; it accelerates (or decelerates into a composed frame); a foreground layer moves
faster than the background and can hide the stop; the title rides the world and defocuses.

**Cheap.** A slow vertical scroll of a flat layout; a tilt that reveals nothing; equal speeds for all layers.

```tsx
// Crane: background plate travels up with an accelerating curve; a foreground mass rushes through at ~11x the speed and hides the stop.
import React from 'react';
import {AbsoluteFill, Img, useCurrentFrame, useVideoConfig, staticFile} from 'remotion';
import {tbl} from './motion';

const CRANE_TABLE = [4, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 10, 11, 12, 15, 16];       // px/f @24 over 23 f
const cumu = (a: number[]) => a.reduce<number[]>((r, v) => (r.push((r[r.length - 1] ?? 0) + v), r), [0]);
export const Crane: React.FC<{at: number; plate: string; cloud: string; title: React.ReactNode}> = ({at, plate, cloud, title}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const y = tbl(f, at, cumu(CRANE_TABLE), 24, fps);                                  // plate offset (content up)
  const fgY = tbl(f, at + Math.round((21 * fps) / 24), cumu([0, 170, 180, 184, 189, 185, 185, 180, 174]), 24, fps);
  const k = ((f - at) * 24) / fps;
  const titleBlur = k > 23 ? Math.min(12, (k - 23) * 4) : 0;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#DDE7F3'}}>
      <Img src={staticFile(plate)} style={{position: 'absolute', top: -y, width: 1920}} />
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-y}px)`, filter: titleBlur ? `blur(${titleBlur}px)` : undefined}}>{title}</div>
      <Img src={staticFile(cloud)} style={{position: 'absolute', left: -200, top: 1080 - fgY, width: 2400, filter: 'blur(6px)'}} />
    </AbsoluteFill>
  );
};
// Cloud plates are found photos (open licence, a soft cumulus field) or a code cloud (layered radial gradients + feTurbulence displacement).
```

### 24. Orbit and turntable around a 3D hero · `orbit-hero`

Family: camera, 3D. See also `items.md` `hero-3d-object`.

**What.** The camera circles a 3D object (a sphere in an editor view, a diorama on a disc, an isometric cube lattice) while
pushing in, or the object turns on a turntable to show another face; often it ends by swinging to a flat, front-on view that
becomes the logo or the UI.

**Job.** Volume and craft: the hero is real enough to walk around. An orbit that lands face-on turns an object into a sign; an
orbit with a push reveals what the hero is doing.

**Numbers.** An orbit of 10-40 degrees during a push; a swing to flat in 20 f; a spin past 360 degrees settling in 7 f; a ring spin
of 3.8 degrees per frame decaying; a turntable of 180 degrees in 15 f (12 degrees per frame); always ending on a composed view.

**Presets.**
- *Diorama orbit* (24 fps). A floating disc with a glass dome and a figure at a desk; glass app tiles orbit the dome; the camera
  orbits about 40 degrees while pushing in, ending on the figure's back with the laptop visible.
- *Editor orbit.* A 3D-editor look on near-black (a sphere with a selection box and axis lines); a 10-degree orbit with a push.
- *Iso to flat.* Cubes in a true orthographic isometric view (yaw 45, pitch 31-33) swing to a flat front view over 20 f and
  become the mark.
- *Yaw flip.* A page's yaw (right side receding) flips by an orbit (right side nearer) over 21 f, with tile flashes.
- *Falling spin.* A cube enters through the top edge, falls and spins past 360 degrees, and settles into a three-quarter view.

**Rich.** A real 3D render (or a pre-rendered sprite) with consistent light while the camera moves; the orbit paired with a push;
secondary objects orbiting at their own rate; the move landing on a meaningful view; depth of field by distance.

**Cheap.** CSS rotateY on a flat image; a constant turntable spin with no landing; orbiting a logo forever.

```tsx
// Orbit: a three.js camera on a circle around the hero, pushing in; rendered with software GL (heavy.mjs --swgl). Deterministic.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CL, ez} from './motion';
import {CAM} from './camtype';

export const OrbitShot: React.FC<{at: number; durS?: number; fromDeg?: number; toDeg?: number; r0?: number; r1?: number; children: React.ReactNode}> =
  ({at, durS = 2.1, fromDeg = -35, toDeg = 5, r0 = 9, r1 = 5.6, children}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const t = interpolate(f, [at, at + Math.round(durS * fps)], [0, 1], {...CL, easing: ez(CAM.pushYaw)});
  const a = ((fromDeg + (toDeg - fromDeg) * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t;   // ~40 deg while the disc grows 1.6x
  return (
    <ThreeCanvas width={1280} height={720} style={{width: 1920, height: 1080}} camera={{fov: 30, position: [Math.sin(a) * r, 2.2, Math.cos(a) * r]}}
      onCreated={({camera}) => camera.lookAt(0, 0.4, 0)}>
      <ambientLight intensity={0.5} /><directionalLight position={[3, 5, 4]} intensity={1.2} />
      {children}
    </ThreeCanvas>
  );
};
// The camera position must be recomputed each frame: put the lookAt in a small <CameraRig a={a} r={r} /> that uses useThree() and sets
// camera.position + lookAt on every render (no useFrame; Remotion renders per frame). For a CSS-only hero: pre-render a 15-36 frame
// turntable sprite once and pick the frame by angle.
```

### 25. Exponential zoom-out that hides a switch · `zoom-out-exit`

Family: camera, cut. See also `transitions.md` `velocity-cut`.

**What.** A pull-back that accelerates instead of landing: the scale drops faster every frame and, on its fastest frame, the
subject is swapped (one window becomes a wall of windows, a page becomes a board) or the shot cuts; then the zoom brakes with an
expo tail into a constant slow zoom-out.

**Job.** Scale of impact: "one" becomes "many", a detail leaves into the whole system, a section ends with distance. The switch
is invisible because it happens at peak speed.

**Numbers.** Per-frame scale 0.99-0.997 at the start, 0.84-0.95 at the fastest frame (one frame at 0.52 for the switch); a total
of 0.24-0.94; 8-30 f; after: an expo tail of 17 -> 2.4 % per frame, then a constant 0.10-0.17 % per frame, or a cut; a radial zoom
blur up to 20 px.

**Presets.**
- *One to a wall.* The pull-back becomes exponential (0.99 -> 0.84 per frame); on its fastest frame one app window becomes an
  infinite wall of windows at about half size; then it brakes 17, 9.4, 4.2, 2.4 % per frame into a constant slow zoom-out.
- *Radial zoom-out* (60 fps). A zoom-out to 0.240, accelerating, with a radial zoom blur growing with the speed.
- *Footage zoom-outs.* Per-plate zoom-outs to 0.69 (0.986 per frame, linear) with the content drifting up.
- *Accelerating pull.* 1.0, 0.97, 0.90, 0.80, 0.68 over about 26 f.
- *Board exit.* A board scales 1.266, 1.261, 1.253, 1.243, 1.232, 1.219, 1.204, 1.186, 1.165, 1.141 ... accelerating into the cut.

**Rich.** Exponential (not eased) acceleration; a swap on the fastest frame; an expo tail into a constant motion; radial blur
growing with speed; a colour pulse on the new state.

**Cheap.** A slow linear zoom-out to a small card on a blank ground; a zoom-out that reveals the edge of a flat image; a fade-out
laid over a zoom-out.

```tsx
// ZoomOutExit: per-frame ratio falls geometrically to a peak, swap on the fastest frame, expo tail, then a constant creep.
import {creep} from './camtype';

export const zoomOutExit = (f: number, fps: number, o: {at: number; accelF?: number; r0?: number; rPeak?: number;
  tail?: number[]; creepRate?: number}) => {
  const n = ((f - o.at) * 24) / fps;                      // @23.976
  const A = o.accelF ?? 10, r0 = o.r0 ?? 0.99, rp = o.rPeak ?? 0.84;
  const tail = o.tail ?? [0.17, 0.094, 0.042, 0.024];
  let s = 1;
  const steps = Math.floor(Math.max(0, n));
  for (let i = 0; i < steps; i++) {
    if (i < A) s *= r0 * Math.pow(rp / r0, i / (A - 1));   // 0.99 -> 0.84 per frame
    else if (i - A < tail.length) s *= 1 - tail[i - A];    // 17, 9.4, 4.2, 2.4 %/f
    else s *= 1 - (o.creepRate ?? 0.0013);                 // constant 0.10-0.17 %/f
  }
  return {s, swapped: n >= A - 1};                          // render the wall instead of the single window from the fastest frame
};
// The wall: tile the window screenshot in a CSS grid (gutter 24 px) whose cell = the single window's rest box, so the swap is seamless.
```

### 26. Brackets and corner markers that select a word · `brackets-select`

Family: type, emphasis. See also `items.md` `handles-guides`.

**What.** Four small corner squares or two L-shaped brackets frame the word like a selection in a design tool; they arrive doubled
or wide, contract to the word, drift slightly, and stretch out to exit; when the word changes they resize to it.

**Job.** "Selected, generated, designed" without a box: a tool's grammar applied to type. A still word gets motion on every cut
(the markers move, the word does not).

**Numbers.** 25-26 px squares, or L-brackets with a 3.5-4 px stroke and 54-141 px arms; a doubled entry of 2-3 f (bars 46-66 px,
gaps 2-18 px); a drift of 1-2 px per frame outward; an exit stretch of 2-3 f; a resize to a new word in 8-10 f; blinks of 1-8 f on /
1-6 f off; colour sampled from the picture, white, or the accent.

**Presets.**
- *Corner squares on stills.* On each still, one heavy white word centred, with four corner markers (25-26 px squares) in a
  colour sampled from the picture; doubled for 2-3 frames on entry, drifting outward 1-2 px per frame, stretching out on exit.
- *L-brackets.* Two L-shaped brackets (3.5 px stroke `#F0F0F0`, square ends, arms 54-73 px; 4 px with 122-126 px arms for the next
  word) that resize to each word in the roll (`type-swap`).
- *Selection grows.* Selection-box corner squares tight around one word, then around two words, then a wide box, blinking.
- *Accent handles.* Accent-coloured handles and markers around words and the logo plate; a tagline building inside corner markers.

**Rich.** Markers with their own small life (a doubled entry, a drift, a stretch exit) while the word is still; colour from the
scene; the box following the word (resize, re-centre).

**Cheap.** A static rectangle outline; rounded selection boxes with a drop shadow; markers on every line; markers not aligned to
the ink box.

```tsx
// CornerMarkers: doubled entry, contraction, drift, stretch exit. Box = the word's ink box.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export const CornerMarkers: React.FC<{box: [number, number, number, number]; from: number; to: number; color: string; sq?: number}> =
  ({box, from, to, color, sq = 25}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const k = ((f - from) * 24) / fps, left = ((to - f) * 24) / fps;          // effective frames @24
  if (k < 0 || left < 0) return null;
  const drift = Math.min(k, 40) * 1.5;                                        // 1-2 px per effective frame outward
  const bar = k < 2.5 ? 56 * (1 - k / 2.5) : left < 2.5 ? 56 * (1 - left / 2.5) : 0;  // 46-66 px bar on entry and exit
  const gap = 10;
  const [x0, y0, x1, y1] = box;
  const corners: Array<[number, number, 1 | -1]> = [[x0 - drift - sq, y0 - drift - sq, -1], [x1 + drift, y0 - drift - sq, 1],
                                                     [x0 - drift - sq, y1 + drift, -1], [x1 + drift, y1 + drift, 1]];
  return (
    <>
      {corners.map(([x, y, dir], i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: x, top: y, width: sq, height: sq, background: color}} />
          {bar > 1 && <div style={{position: 'absolute', top: y + sq / 2 - 4, height: 8, width: bar, background: color,
                                   left: dir > 0 ? x + sq + gap : x - gap - bar}} />}
        </React.Fragment>
      ))}
    </>
  );
};
// Box from measureText of the word at its rest size; colour = a light tint sampled from the still (precompute per shot).
```

### 27. Blur-resolve per word or letter · `blur-resolve-type`

Family: type. The look is `effects.md` `focus-pull-in`; the per-unit timing is here.

**What.** Type arrives out of focus and sharpens: a whole word from 14 px with a small oversize; each new word as a blurred light
ghost that resolves in place; or a blur front travelling through a word letter by letter.

**Job.** A softer, more cinematic arrival than a rise: the word comes into focus like a thought forming. A blur front makes a
word feel generated or detected.

**Numbers.** Start blur 2 px (words), 8 px (letters), 14 px (a hero word), 17 px (a box); resolve in 4-6 f (6 f at 60 fps);
start opacity 0.4-0.5; an oversize 1.09 -> 1.0 with the blur; a front 0.6-0.8 of the word width wide.

**Presets.**
- *Hero word.* Blur 14, 10, 7, 4, 2, 0 px with scale 1.09 for five frames, then 1.06, 1.035, 1.015, 1.0 about the line's left
  baseline.
- *Tinted ghost.* Each new word blue-tinted, blurred 2 px at 50 %, then sharp ink.
- *Over moving hills.* A line sharpens word by word over a moving gradient.
- *Blur front.* Each word builds left to right with a blur front: letters appear over about 6 frames, each blurred about 8 px at
  first.
- *Per letter* (60 fps). Each new letter appears at blur 8 and 40 % and sharpens over 6 frames.

**Rich.** Short resolves (4-6 f); blur paired with an oversize settle or a tint; a front that moves through the word; the
resolved text perfectly crisp.

**Cheap.** A one-second blur fade on every element; blur on small UI text; blur over 20 px on words (they become blobs).

**Build.** `focusIn()` (`rack-focus`) for whole words; per letter: `blur = 8 * clamp(1 - (n30 - born_i) / 6)`, `opacity = 0.4 + 0.6 * clamp((n30 - born_i) / 6)`, `born_i = i * letterInterval`; a front version sets `born_i` from `x_i / frontSpeed`. One CSS `filter: blur()` per span is cheap for <= 30 glyphs; for long lines blur the whole word span instead.

### 28. Creep and drift tail after a landing · `drift-tail`

Family: camera. See also `animations.md` `drift-tail`.

**What.** After a camera move lands, the camera keeps moving very slowly in the same direction (0.06-0.4 % per frame of scale, or
a few px per frame), so the hold is alive without a new move. It is the decaying tail of a purposeful move, never an idle float.

**Job.** The frame never freezes, but nothing wanders; the viewer's sense of direction carries into the next cut.

**Numbers.** Scale creep 0.03-0.4 % per frame; position drift under 1 to 4 px per frame; the direction of the last move; a true
still hold only as a 5-10 f beat before a big move; a creep may run only about 0.2 s before the next event cuts it.

**Presets.**
- *After punch-ins.* A very slow creep in after each punch-in cut: 1.000 -> 1.006 -> 1.008 -> 1.009 over 20 f.
- *Slow push.* +0.2-0.3 % per frame for 10 f after a cut.
- *Linear plate push.* +0.105 % per frame, linear: 1.0, 1.008, 1.016, 1.024, 1.032 every 8 f.
- *Constant zoom-out.* A constant slow zoom-out of 0.10-0.17 % per frame after an expo tail.
- *Decelerating glide.* The camera glides left, decelerating from 38 px per frame to almost nothing with a slow zoom-out: a long
  near-hold that still moves.

**Rich.** The creep continues the last move; tiny (under 0.4 % per frame); applied to the world, not a single card; cut by the next
event; a true still hold used once, as a pause before a big move.

**Cheap.** A floating sine drift back and forth; bobbing cards; a drift that reverses; a creep on the text but not on the world.

**Build.** `creep(f, f0, rate, fps)` in the kit; chain it after `camTrack` (`push-land`'s `PushLand` already does). Rule of thumb for a film: every hold longer than 0.8 s gets a creep of 0.06-0.2 %/f in the direction of the previous move, or a scroll / colour process inside the frame; never a sinusoid.

### 29. Type slides out from behind an edge · `slot-reveal`

Family: type. See also `animations.md` `mask-reveal` and `effects.md` `soft-mask-reveal`.

**What.** A word is clipped by an edge (a card's side, a panel border, a bracket box, a moving soft mask) and slides out of it,
so it appears letter by letter without per-letter animation; or a soft mask travels across a still word.

**Job.** The word is revealed by the layout itself: it seems to come out of the card it belongs to. Physical, designed, and cheap
(one clip, one translate).

**Numbers.** An accelerating slide; a 6-frame wipe across a word; a soft edge of 60-220 px; the letter at the edge grey for 1-2
frames; the direction is the way the layout moves.

**Presets.**
- *Card and word.* A card and its word slide left together, accelerating hard over 12 f; the word lies under the card's edge and
  appears as the card moves.
- *Sliding word, moving mask.* One word slides while one soft mask moves; no per-letter animation.
- *Six-frame wipe.* A big italic serif word over a photo, its letters wiping in left to right over 6 frames.
- *Right-to-left head.* A transparent head reveals letters fading in from its right edge over about 80 px.
- *Evaporation front.* A line's `mask-image: linear-gradient(90deg, ...)` whose stops move per frame.

**Rich.** The clip edge is a real layout edge; the motion is the layout's motion; the front soft (60-220 px), or a hard edge that
matches the card.

**Cheap.** An invisible rectangle mask in empty space; a linear wipe at constant speed on every title.

```tsx
// SlotOut: the word lives in a container clipped at an edge; translating the word reveals it glyph by glyph.
import React from 'react';
export const SlotOut: React.FC<{edgeX: number; y: number; h: number; x: number; side?: 'left' | 'right'; children: React.ReactNode}> =
  ({edgeX, y, h, x, side = 'left', children}) => (
  <div style={{position: 'absolute', top: y, height: h, overflow: 'hidden', ...(side === 'left' ? {left: 0, width: edgeX} : {left: edgeX, right: 0})}}>
    <div style={{position: 'absolute', top: 0, left: x - (side === 'left' ? 0 : edgeX), whiteSpace: 'pre'}}>{children}</div>
  </div>
);
// EdgeX = the boy card's left edge (moving with its group), x(f) accelerating left with whipOut(..., r 1.25); the word sits to the
// right of edgeX on its first frame and slides out of the slot.
// Soft mask: style={{WebkitMaskImage: `linear-gradient(90deg, #000 ${front - soft}px, transparent ${front}px)`}} on the word.
```

### 30. A slow push on a photo or footage · `plate-push`

Family: camera. See also `backgrounds.md` `world-plate` and `context-plate`.

**What.** A photographic or footage plate pushes very slowly and linearly (0.1-0.3 % per frame) about a point of interest, on the
plate only: the type is a separate layer that does not scale with it. Stills in a fast montage often do not move at all.

**Job.** A photograph stays alive and gains depth relative to the type (the plate moves, the words stay): a camera in front of a
real scene. In a montage of stills, the stillness itself is the rhythm.

**Numbers.** 0.1 % per frame (linear), 0.2-0.4 % per frame, up to 1-2 % per frame only inside a story push; 2-8.5 % per shot; linear
(a camera at constant speed, the one place linear is right); the origin on the subject; the text never scaled with the plate; stills
held still in a beat montage.

**Presets.**
- *Plate-only push.* The text is a separate layer; the plate scales +0.105 % per frame (linear) about the person in it.
- *Face push* (24 fps). 1.000 -> 1.085 about the face over 22 f, linear; elsewhere six full-bleed stills with hard cuts and no
  camera move.
- *Story push.* A duotone photo develops to colour while it pushes in and the cost cards count up.
- *Card with the plate.* A push 1.0 -> 1.22 in which the card grows with the plate.
- *Near-static mock-up.* A slow push of about 1.5 % over the whole shot.

**Rich.** A good plate (an open-licence photo or footage chosen for the story); a slow linear push about the subject; an independent
type layer; a grade on the plate that changes during the push.

**Cheap.** Zooming the whole composition, text included; fast pans across random stock; pushing every photo the same way.

**Build.** `<World cam={{s: creep(f, at, 0.00105, fps), x: 0, y: 0, px: 1067, py: 701}}><Img src={plate} /></World>` under a separate type layer; footage: `<OffthreadVideo>` inside the same `World`; handheld (`handheld-micro`) only on footage.

### 31. Parallax depth layers · `parallax-layers`

Family: camera, depth.

**What.** Layers at different depths move at different speeds under one camera move: the foreground faster (and softer), the
background slower; with a zoom, near layers scale more than far ones.

**Job.** Depth from motion alone, without 3D: a pan over a 2D collage becomes a camera move through a space.

**Numbers.** Foreground 1.3x to about 11x the subject layer; background 0.33-0.5x; blur growing with depth distance (foreground
6-12 px); with a zoom, near layers scale 1.2-1.5x the far layers' rate.

**Presets.**
- *Soft foreground.* Foreground signs carry 6-12 px of lens blur and move about 1.3x faster than the tiles.
- *Window and forest.* The forest moves less than the window frame (content dx -1.8, -2.3, -3.3, -4.1, -5.7, -7.7 px ... for the
  window, about a third of that for the forest).
- *Zoom parallax.* Discs and the title zoom at different rates (the inner disc shrinks 376 -> 323.5 px while the title shrinks less).
- *Card drift.* Each card drifts at its own rate (1-3 px per frame), the biggest card slowest.
- *Layers drift left.* The layers drift left with parallax and the clip ends mid-move.

**Rich.** Depth assigned by meaning (framing elements in front and soft, the subject sharp, the background slow and soft); the ratio
held through accelerations; blur by depth.

**Cheap.** Every layer at a different random speed (it wobbles); parallax on UI cards that should be one plane; a foreground with no
blur.

**Build.** One camera offset `x(f)`; each layer `translateX(x(f) * depthFactor)` and `scale(1 + (s(f) - 1) * depthFactor)` about the pivot, with `filter: blur(dof(depth, 1, k))`. Depth factors: background 0.33-0.5, subject 1.0, foreground 1.3-2 (11 only for a wipe mass).

### 32. Split panels, each with its own camera · `panel-cameras`

Family: camera, layout. See also `backgrounds.md` `panel-grid` and `transitions.md` `split-panel`.

**What.** The frame is a grid of 2-4 panels; each panel runs its own shot with its own camera (push, pan, whip, roll) and its own
clock or loop, while the whole frame never moves.

**Job.** Many features at once ("it does all of this") with each panel still cinematic; the grid is calm, the energy is inside the
cells. A dense film can run 5-16 s.

**Numbers.** 2-4 panels; per-panel moves use the full-frame vocabulary (pushes 1.1-1.45, pans peaking 17-66 px per frame, whips,
rolls); panel moves offset in time by 6-12 f (no two panels peak together); loops of 16-41 f; the grid lines and the frame static.

**Presets.**
- *Four panels.* A camera per panel at its own centre, each looping on its own length.
- *Kanban cell* (60 fps). A per-cell camera: s 1.0008, 1.0018 ... with tx -1.6, -3.3 ... accelerating into a whip.
- *Pane push.* Pane scale 1.0, 1.0065, 1.0116, 1.016 over 40 f, then a small pull to 0.994; the next pane pushes about its own
  point 1.0 -> 1.1.
- *Slow grid zoom.* A grid zooms 1.0 -> 1.03 over 140 f in one pane.
- *Break the grid.* One pane zooms through to the full frame for one frame.

**Rich.** Each panel a real shot with a purposeful camera; panel moves interleaving like instruments; one panel allowed to break the
grid.

**Cheap.** Four static screenshots in a grid; all panels moving in sync; borders that shift.

**Build.** Render each panel as its own `<World>` inside an `overflow: hidden` cell; give each panel a camera key list (`camTrack`); offset their peaks by 6-12 frames; loops: `const g = f0 + ((f - f0) % loopLen)` inside the panel.

### 33. One camera over one app canvas · `scroll-camera`

Family: camera, UI. See also `items.md` `product-window`.

**What.** The product UI is built once at its design layout; a single camera transform (translate + scale) zooms and scrolls over
it while the content changes state inside; whole-screen motion is always the camera, and cuts hide inside the fastest frame of a
zoom or scroll whip.

**Job.** A long product demo reads as one continuous shot operated by a camera person: the viewer always knows where they are in
the app, and the camera points at each action in turn. It carries 20-40 s of UI without flying cards.

**Numbers.** Canvas scale 1.0-2.1 (1.25-1.48 for close framings, 2.1 for a detail); scroll 1 px per frame (idle) to 16 (reading)
to 70-72 at a whip's peak (doubling per frame 1, 2, 2, 4, 5, 8, 15, 36, 72); zoom whips x1.6-2.4 per frame into a hidden cut; expo
landings 1.070, 1.027, 1.014 ...; a smooth zoom and scroll on `smoothZoomScroll`.

**Presets.**
- *App canvas.* The UI built once as one large component at its design layout; the camera holds per-frame tables of scale and
  translation; the states change inside.
- *Dashboard pages.* Desktop pages under camera tables, with in-UI page dissolves while the camera moves.
- *Reading scroll.* A slow scroll, the list moving up about 16 px per frame.
- *Scroll inside a push.* A scroll jump (-28 -> -237 px over 10 f) inside a push to 0.776.
- *Resolve and scroll.* A profile window resolves out of white, settles, drifts, and starts to scroll.

**Rich.** The UI is real (one layout, built once); the camera frames each action at a readable scale; scroll whips hide cuts (the
state changes on the fastest frame); sounds mark the settles.

**Cheap.** UI cards flying in separately; a screen recording scaled down in a device frame with no camera; constant-speed scrolling;
zooming with blur on everything.

```tsx
// AppCanvasCamera: one canvas component; camera keys (s, x, y) in canvas px; hidden cuts swap canvas state on the fastest frame.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {World, camTrack, CamKey} from './camtype';

export const AppCanvasCamera: React.FC<{keys: CamKey[]; states: {from: number; render: (f: number) => React.ReactNode}[]}> = ({keys, states}) => {
  const f = useCurrentFrame();
  const cam = camTrack(f, keys);
  const st = [...states].reverse().find((s) => f >= s.from) ?? states[0];   // state swaps happen on whip peaks (hidden cuts)
  return <World cam={cam}>{st.render(f)}</World>;
};
// Scroll whip: content y per frame cumulative of [1, 2, 2, 4, 5, 8, 15, 36, 72]; put the state swap on the 72 px/f frame
// then continue with a decaying 0.55/f entry on the new state (kit whipIn).
```

### 34. Type exits · `type-exit`

Family: type. See also `animations.md` `exit-shrink-rise` and `whip-exit-match`.

**What.** How a statement leaves: words vanish from the end backwards, a left-to-right evaporation front fades the letters,
letters erode from the end of a word, the line shrinks and accelerates out, or it drops out in 1-2 frames under the next element.

**Job.** A deliberate exit says the thought is finished and makes room for the next one in the same place; reverse-order vanishing
reads as unsaying (problem lines), evaporation as fading memory.

**Numbers.** Reverse vanish one word every 2-4 f (a letter every 2 f); an evaporation front from 0 to 100 % of the word in 4-5 f
(front fractions 0, 0.2, 0.35, 0.65, 1.0); a shrink of -4 % to -15 % accelerating into a cut; a drop-out of 1-2 f; always into the
next event (no dead air).

**Presets.**
- *Evaporation.* The line exits by a left-to-right front: letters fade by the same kind of front that brought them in.
- *Erode from the end.* One word vanishes in one frame and the next erodes letter by letter from its end while the next words
  arrive.
- *Marker hides.* A marker block slides left over the words, hiding them letter by letter (one letter every 2 f).
- *Slide and vanish.* The line slides right while its words vanish from the end.
- *Spread and fade.* Each word moves right by an amount that grows with its index, and the right-most words fade.

**Rich.** An exit with a direction and a mechanism tied to the next element; 4-12 frames; the next thing arriving as it leaves.

**Cheap.** A 0.5 s cross-fade of every line; all lines leaving the same way; exits followed by an empty frame.

**Build.** Evaporation: `WebkitMaskImage: linear-gradient(90deg, transparent ${front - 80}px, #000 ${front}px)` with `front = tbl(f, at, [0, 0.2, 0.35, 0.65, 1].map((v) => x0 + v * width), 30, fps)`. Reverse vanish: hide word i when `f >= exitAt + (n - 1 - i) * stepF`. Erode from the end: per-letter opacity `1 - clamp((f - exitAt - (len - 1 - j) * 1) / 3)`.

### 35. Two-line stacked captions (rare) · `stacked-caption`

Family: type.

**What.** Two or three short lines stacked at line height 1.0, built line by line, with one line or word in a heavier weight or
the accent. A house style for a single film, not a general device; the "small lead line + big key line" two-voice stack is a template
mark to avoid.

**Job.** A beat with two parts (verb / object) read as one graphic unit.

**Numbers.** 2-3 lines; line height 1.0; one weight step (400 -> 600 / 700) or one colour; 7 f per line; centred, or beside a
device.

**Presets.**
- *Stacked caption.* Three short lines at a cap of 92-105 px (font about 140-150 px), line height 1.0, built 7 f apart, the last
  line in the accent.

**Rich.** Equal sizes; a tight line height; a weight change that follows the sentence's meaning.

**Cheap.** A small grey eyebrow line over a big headline; three sizes in one stack; left-aligned stacks in a corner.

**Build.** Three `CentredBuild` lines (`word-build-centred`) with `y` steps of `1.0 * fontSize`, onsets 7 f apart, one line with `weight 700` and `ink '#2832A5'`.

### 36. Handheld micro-jitter on footage only · `handheld-micro`

Family: camera.

**What.** A tiny irregular drift (+/-1 px, +/-0.1 degrees) on a footage plate, or a stop-motion re-placement wobble on a collage;
never on UI or type.

**Job.** It authenticates footage (a camera held by a person) and gives a crafted, physical feel to stop-motion collages. On UI it
would read as a bug.

**Numbers.** +/-1 px per frame, +/-0.1 degrees, re-seeded every frame (footage at 24 fps) or every 2 frames; stop-motion 1-2 px on
single frames.

**Presets.**
- *Handheld footage.* A gentle handheld drift (+/-1 px) with a push-in 1.000 -> 1.020 over the shot, at 24 fps.
- *Stop-motion collage.* 1-2 px re-placements on single frames while a slow zoom settles.

**Rich.** Barely visible, only on footage, combined with a slow push.

**Cheap.** A camera-shake effect on a UI hit; large random shakes; jitter on type.

**Build.** `const jx = (random(`hx${Math.floor(f * 24 / fps)}`) - 0.5) * 2, jy = ..., jr = (random(...) - 0.5) * 0.2;` added to the footage `World` only.

### 37. Lens bulge during a push · `lens-bulge-push`

Family: camera, lens. The optics are `effects.md` `lens-distortion`; the timing is here.

**What.** A barrel distortion that grows during a push and relaxes after it, bowing the edges of a UI window outward; or a
permanent fisheye over a close-up layer.

**Job.** It sells speed and closeness: the push feels like a lens rushing toward the screen.

**Numbers.** k = 0.01 -> 0.06 -> 0.02 over 18 frames following the push speed (k 0.01, 0.03, 0.05, 0.06 held, 0.04, 0.02); an edge
bow of about 14 px at 1080p; or a permanent fisheye (k 0.18) for a whole shot.

**Rich.** The bulge following the push speed and releasing as it lands; the cursor and UI chrome kept straight.

**Cheap.** A permanent fisheye on a clean UI film; distortion without a camera move.

**Build.** One SVG `feDisplacementMap` with a precomputed radial displacement image (`staticFile('barrel.png')`, R/G = x/y offset) and `scale = k * 1100`; cheap on the CPU because the map is static and only `scale` animates.

---

## Choosing a camera grammar for a film

1. Pick 3-5 camera entries per film, not per shot: always `velocity-cut` and `push-land`; then `action-follow` or `scroll-camera`
   for UI films, `giant-type-travel` or `word-build-centred` for type films, `plane3d-settle`, `orbit-hero` or `roll-accent` when
   there is a 3D hero. Pick the rest at random from this file so films differ.
2. Choose one blur policy for the whole film (0.5 x the step, or none).
3. Every shot boundary is either velocity-matched or a deliberate hard cut on a beat; aim for about 40 % of moves starting at speed
   and 30 % ending at speed.
4. No camera move without a subject: a push lands on an element; a pan follows an action or reveals the next item; a pull answers a
   close-up. A shot with no subject holds for one beat or creeps; never a sine drift.
5. Type defaults: one face, size set to a 35-70 % measure, tracking by size, centred one-line statements of 1-5 words built word
   by word with a snap re-centre, one emphasis device for the whole film, the clock of `readable-time`.

## Checks you can run on a render

| entry | measure | target |
|---|---|---|
| `velocity-cut` | px per frame of the moving layer on the 2 frames before and after the cut | same sign; after / before 0.6-1.0; before 50 px per frame or more |
| `push-land` | log-scale progress at 25 / 50 / 75 % of the move | 0.55-0.65 / 0.8-0.86 / 0.93-0.97; no overshoot |
| `word-build-centred` | line centre x one and five frames after each word's onset | shift 69 % / 99 % done; centre within 2 px of 960 at rest |
| `action-follow` | subject screen x during the follow | inside a band about 130 px wide |
| `readable-time` | frames from the last word's onset to the exit | 26-46 f at 30 fps for 3-5 words |
| `push-into-cut` | per-frame scale ratios before the cut | strictly increasing; the last 1.035 or more |
| `punch-in` | blur sigma on the cut, +1, +2, +3 frames | about 17 ln(s), 2/3 of it, 1/3, 0 |
| `pull-reveal` | final box vs the rest box; overshoot | within 2 px; 0.7 % or less |
| `whip-pan` | build frames : stop frames; blur / step | 9-12 : 7-30; 0.5 (or 0, by film) |
| `giant-type-travel` | cap height; speed on the first / last frame | 360 px or more; 140 -> 16 px per frame |
| `roll-accent` | per-frame return rotation ratio | 0.80-0.86 per frame at 24 fps |
| `drift-tail` | per-frame scale change in holds over 0.8 s | 0.03-0.4 %, same sign as the previous move |
