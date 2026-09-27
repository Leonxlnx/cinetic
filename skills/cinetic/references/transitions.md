# Transitions

Covers how a film moves from shot to shot: selection rules, the energy table, the seam laws, a catalogue of twelve designed seams (each with frames, curves and its failure mode), the bans, and when to use `@remotion/transitions`. Read it while planning seams in the beat sheet (Steps 1–3) and before building any act boundary.

The frame counts and curves are proven defaults from shipped films (Tessel's are quoted where they came from). Keep the laws; tune the numbers to the film's energy.

**Contents**
1. [Selection rules](#1-selection-rules)
2. [Energy](#2-energy)
3. [Seam laws](#3-seam-laws)
4. [The seam catalogue](#4-the-seam-catalogue)
5. [Bans](#5-bans)
6. [`@remotion/transitions` and the grid](#6-remotiontransitions-and-the-grid)
7. [Seam plan and checks](#7-seam-plan-and-checks)

---

## 1. Selection rules

- **A seam is a designed match, not a cut between unrelated pictures.** Something carries across: the story device, a shape, a colour, a direction of motion or a velocity.
- **The story device never blinks.** It stays at full opacity through every seam and is handed from scene to scene as a shared prop.
- **6–8 transition types per film, each used at most twice.** Velocity-matched cuts are exempt. Variety within a grammar reads as authored; one type repeated reads as a preset.
- **One signature move derived from the mark,** used three times: open, middle, close. In Tessel it was the red "now" dot growing into a flood or collapsing into a point.
- **Seams land on the grid.** Act changes on downbeats; the cut frame (or the frame a flood fills the screen) is where the sound hits (`references/timing-grid.md`).
- **Pick the seam from the story moment**, then its energy (§2), then check it against its failure mode (§4).
- **No element crosses the frame faster than about 60–80 px/f.** Motion blur makes fast motion read as motion only up to a point: past it, a 240° shutter smears an element into a streak longer than itself, and the samples that fit in a frame show as stepped copies. A whip that needs 300 px/f is a seam that wants to be a cut on the beat, a match cut, a mask wipe, or a shorter distance with the rest of the travel hidden behind the cut. `measure-speed.py` lists the frames over 80 px/f (`too_fast`) when the master renders; design them away before that.

## 2. Energy

| Energy | Duration | At 60 fps | Curve family | Transient blur | Typical seams |
|---|---|---|---|---|---|
| Calm | 0.5–0.8 s | 30–48 f | sine-like: `E.smooth`, `E.dolly`, `E.inOut` on morphs | 20–30 px (defocus) | container morph, rack focus, slow iris, pull-back |
| Medium | 0.3–0.5 s | 18–30 f | cubic-like: `E.glide`, `E.whip`, `E.ui` | 8–15 px | whip, split on a seam, partial slide |
| High | 0.15–0.3 s | 9–18 f | expo-like: `E.in` / `E.out`, `E.contact` | 3–6 px | zoom-through, velocity-matched cut, implosion, flood |

- Match the seam's energy to the music at that point: a high-energy seam on a drop, a calm one across a breakdown.
- Blur here is the transient softness a seam adds on purpose (a defocus, a zoom smear). Speed blur on fast motion comes from the motion-blur render pass (`references/finishing.md`), whose samples never cross an act boundary, so hard cuts stay crisp.

## 3. Seam laws

1. **Both sides at rest, or the incoming shot starts at the outgoing velocity.** Anything else is a visible jerk.
2. **Accelerate out, cut at peak speed, decay in.** The outgoing move accelerates about ×1.25–1.3 per frame over its last 24–30 f (that is `E.in` over 24–30 f), the cut lands at its peak velocity, and the incoming move decays about ×0.959 per frame (a 0.4 s time constant, `E.out` over about 90 f).
3. **Match every property across the cut:** position, size, radius, colour, shadow, opacity, blur. A property that flips at the cut pops (a dot whose opacity went 0 → 1, a pill that appeared).
4. **The rest pose appears once.** If a move comes to rest on pose P and the next act opens on P, the outgoing act's last frame is the move's last in-between and the incoming act's frame 0 is P. Showing P twice reads as stop-hold-go.
5. **Place things the same way on both sides.** If one act positions an element by layout and the next by transform, sub-pixel differences show as a whole-UI shimmer on the cut (0.42 px in Tessel). Share the placement function.
6. **Never cross-fade two copies of one object.** Morph one object, wipe chrome away with a clip, and swap content on a single element at the arc apex (when progress passes 0.5).

Velocity matching from the real curves, so the numbers are exact for whole frames:

```ts
import { E, type Ease } from '../lib/anim';

/** px/f on the last frame of a D px move over T frames (E.in: its fastest frame). */
export const exitSpeed = (D: number, T: number, ease: Ease = E.in) => D * (ease(1) - ease(1 - 1 / T));
/** Distance an incoming move over T frames needs to start at v px/f. */
export const entryDistance = (v: number, T: number, ease: Ease = E.out) => v / (ease(1 / T) - ease(0));

// exit 300 px over 24 f on E.in -> 71.7 px/f at the cut, just inside the ~80 px/f ceiling; the entry
// over 90 f on E.out then travels entryDistance(71.7, 90) = about 1050 px, in the same screen direction
```

`E.in` and `E.out` are exact mirror images, so an exit and an entry with the same distance and duration also match; the helpers let the two sides differ.

## 4. The seam catalogue

Each entry: what it is, frames and curves, and the failure mode to check on the contact sheet.

### 4.1 Relay handoff
The story device crosses the seam untouched while the world changes around it.
- **Frames:** none of its own. The device's state is one function of the *absolute* frame, rendered by both acts, so its last frame in act A and its first in act B are consecutive samples of the same curve.
- **Failure:** the device blinks out for a few frames (4 missing frames were flagged in Tessel), changes style at the seam, or two copies overlap.

```ts
// src/device.ts: one source for the device, imported by every act that shows it
import { E, hitPulse, lmix, mix, prog } from './lib/anim';
import { CUE } from './timeline';
export const deviceAt = (abs: number) => ({
  x: mix(960, 420, prog(abs, CUE.drop, CUE.drop + 40, E.inOut)),
  y: 540,
  r: lmix(14, 20, prog(abs, CUE.drop, CUE.drop + 40, E.inOut)) * (1 + 0.3 * hitPulse(abs - CUE.deviceIn)),
});
// in an act: const d = deviceAt(ACT.turn.from + f);
```

### 4.2 Shared-element container morph
The mark's pieces become the product's containers (Tessel: the tall block became the sidebar, the square became the calendar).
- **Frames and curves:** 46 f on `E.inOut`. Each piece is a **mask** (clip) with the live product drawn inside it at its final transform. Inner corners square off and the pieces overlap by 2 px once they join (from about 35% of the move), with their bottoms meeting, so no background line or L-step shows. On the landing frame, swap to one unclipped product layer drawn with **the identical transform** the next act opens on.
- **Failure:** a double exposure (window chrome fading over a differently shaped tile), a hairline of background between pieces, a shimmer at the swap because the two layers are placed differently.

### 4.3 Iris or flood from the device
The device grows to fill the frame, or the frame contracts onto the device.
- **Iris in:** a full-accent frame (the device at 80×, 28 px → 2240 px, covering the 2203 px frame diagonal) contracts onto the marker by the first beat (30 f). Scale in log space on the `iris` curve (.4, 0, .7, .92), so the zoom rate is even and it lands with a little speed on the tick.
- **Flood out:** radius from the device to the farthest corner over 18 f on `E.out`, starting at `cue − 1` so it is already opening on the drop frame. A flood that ends a shot runs on `E.in` instead, so its edge is fastest at the cut.
- **Failure:** a linear radius (crawls, then snaps), a flood still at rest on the drop frame (a dead frame on the boom), the same iris three times (it turns into a preset).

```ts
// needs the specialist token in anim.ts:  iris: Easing.bezier(0.4, 0, 0.7, 0.92),
import { E, lmix, mix, prog } from '../lib/anim';
const farthest = (x: number, y: number) => Math.hypot(Math.max(x, 1920 - x), Math.max(y, 1080 - y));
/** Diameter of an iris that contracts from 80x onto a 28 px dot by frame 30, in log space. */
export const irisD = (f: number) => lmix(28 * 80, 28, prog(f, 0, 30, E.iris));
/** Radius of a flood from a button at (x, y), already moving on the drop frame. */
export const floodR = (f: number, drop: number, x: number, y: number) =>
  mix(0, farthest(x, y), prog(f, drop - 1, drop + 18, E.out));
```

### 4.4 Implosion into the device, then silence, then the drop
Everything collapses into the device; a beat of true silence; the drop.
- **Frames and curves:** world scale 1 → 0 and rotation 0 → −14° on `E.in` over 19 f, while the device grows ×1.25. Then ≤ 15 f of true silence (only the device on screen, reverb tails ducked too), then the drop on the downbeat.
- **Failure:** the device shrinks with the world (it is the constant, so it must hold or grow), the "silence" still carries a tail, the implosion ends off the grid so the silence has no pulse.

### 4.5 Shutter collapse
A full-frame field collapses to a line, then to the device.
- **Frames and curves:** height first over 16 f on `shutter` (.2, .7, .2, 1), starting at `cue − 1` so it is already moving on the drop frame; then width over frames 13–26 on `E.inOut` into a line, which becomes the device. Clip it to the content area so the line never crosses UI chrome.
- **Failure:** both axes at once (reads as a zoom-out, not a shutter), a field still at rest on the drop frame, a line crossing a sidebar or header.

### 4.6 Split on a seam
The product opens along one of its own borders (a sidebar edge, a list divider).
- **Frames and curves:** the split on `split` (.33, 0, .1, 1) over 42 f; one side widens into a type column while the other goes full-bleed on a vertical hinge (rotateY −12°, perspective 2400). Clip with `clip-path: inset(… round r)` using sub-pixel values. Swing shut on `close` (.55, 0, .15, 1) so it comes to rest exactly on the next act's frame 0.
- **Failure:** integer clip values step 1 px on slow moves; the rest pose shown twice; a split along a line that is not a real border (it reads as a wipe).

```ts
type Box = { x: number; y: number; w: number; h: number };
const px = (v: number) => `${Math.max(0, v).toFixed(3)}px`;
/** Sub-pixel, rounded clip of the full frame down to box b. */
export const insetClip = (b: Box, r: number) =>
  `inset(${px(b.y)} ${px(1920 - b.x - b.w)} ${px(1080 - b.y - b.h)} ${px(b.x)} round ${px(r)})`;
```

### 4.7 Velocity-matched cut
A hard cut between two moving shots whose motion continues in the same screen direction at the same speed (§3 helpers).
- **Frames:** exit on `E.in` over 24–30 f, cut at peak speed, entry on `E.out` decaying over 60–90 f. Whips peak on the kick.
- **Failure:** direction reverses across the cut, speed halves or doubles, or one side is at rest; any of these reads as a jump.

### 4.8 Zoom-through
The camera flies forward through shot A into shot B.
- **Frames and curves:** exit scale 1 → 1.2 with blur 0 → 10 px (text-sized layers) or 18–20 px (full frame) on `E.in` over 12 f (0.2 s); entry scale 0.75 → 1 over 30 f (0.5 s) on `E.out`. Scale with `lmix`. Put the blur on one wrapper, never on each child, and never on a layer with `will-change`.
- **Full-frame blur:** an animated `filter: blur()` on a large layer steps from sharp to soft in one frame; for a full-frame zoom-through, cross-fade to a constant 18 px copy with `src/fx/RackFocus.tsx` instead.
- **Failure:** the entry starting slow (the forward motion stalls at the cut), blur on the entry lingering past 6 f on text, ghost frames from `will-change`.

### 4.9 Partial slide cut
Both shots slide a short way in the same direction; the cut hides in the motion.
- **Frames and curves:** ±230 px, the same distance and the same duration on both sides (for example 24 f); the exit runs on `E.in` and has faded out by 25–30% of its travel; the entry arrives on `E.out`.
- **Failure:** unequal distance or duration (two unrelated moves), the exit still visible when the entry arrives (a double exposure), a full-frame push (a preset slide).

### 4.10 Word waterfall
One line hands over to the next word by word, so only one line is ever on screen.
- **Frames and curves:** line A exits at half its entry stagger (3–4 f) over 16 f on `E.in`, rising 0.6 of its entry offset; line B's first word starts once A's last word is past half its exit, on the beat. Entry per `references/motion-tokens.md` §6.
- **Failure:** two full lines visible at once (a text wall), B's words colliding with A's, all words leaving together (that is a fade).

### 4.11 An exit that reverses its entrance
Leave the way you came, mirrored in time: an entrance on `E.out` exits on `E.in`, along the same path.
- **Frames:** exits are shorter than entrances (Tessel's wordmark tucked back behind the mark in 14 f on the tock). When something was revealed from behind an edge, it tucks back behind the **live** edge: the clip follows the moving element, never a fixed box.
- **Failure:** a fixed clip box while the mark moves (the word pokes out on one side), a generic fade instead of the reverse move (reads as a pop when fast).

### 4.12 Words become the mark
The payoff line turns into the mark's pieces.
- **Frames and curves:** each word is **underlined**, never struck through (a strike crosses out the film's own promise): a 0.1 em line at baseline + 0.07 em, drawn left to right over 16 f on `E.out`. The line swells into a block covering ascenders to descenders (top at baseline − 0.8 em, 1.04 em tall) over 12 f while the glyphs fade under it (≥ 6 f). The blocks accelerate into the mark's pieces over 20 f on `E.contact`, shape settling 6 f early, and land with the contact squash (`land()` in `references/motion-tokens.md` §7). The relay dot follows 5 f behind and drops into its slot.
- **Failure:** glyph tops poking out above the block (pad covering boxes about 8 px; negative tracking pushes the last glyph's ink past the measured width), pieces landing on a target that is still moving, the dot arriving before the blocks clear its path.

Two more tools, used inside seams rather than as seams: **luminance flips** (white → accent → ink) hidden inside a move, never on a static frame (see `references/brand-and-color.md`), and a **deliberate hard cut on the beat**, which is fine when it is intended; declare it as a cut for `scripts/forensics.py` (see `references/review-loop.md`).

## 5. Bans

| Ban | Why | Instead |
|---|---|---|
| Crossfade as the default seam | nothing carries across, so the film reads as slides | a relay, morph or matched move |
| Dissolving two layers that both fade over black | at the midpoint luminance is 0.5·B + 0.25·A, a 25% dip | fade only the incoming layer over a fully opaque outgoing one |
| Glitch or RGB split, light leak, film burn, swirl, ripple, dreamy zoom, flash through white, page burn | preset gimmicks with no story reason | a seam from §4 |
| The same iris or wipe three times | it becomes a preset | the signature move three times, everything else ≤ 2 |
| A whip or fling above ~80 px/f | blur can't make it read: a long smear with stepped copies | a cut on the beat, a match cut, a mask wipe, or a shorter move |
| Two copies of one object cross-fading | a translucent double image | morph one object; swap content at the apex |

## 6. `@remotion/transitions` and the grid

- The package is not in the starter; add it with `npx remotion add @remotion/transitions` so its version matches `remotion`.
- Version 4.0.529 ships 20 presentations: blur-slide, book-flip, clock-wipe, cross-zoom, crosswarp, dissolve, dreamy-zoom, fade, film-burn, flip, iris, linear-blur, none, push-cut, ripple, slide, swap, wipe, zoom-blur, zoom-in-out. Treat the gimmicks (book-flip, clock-wipe, crosswarp, dreamy-zoom, film-burn, ripple, swap, zoom-blur) as off-brand unless the brand asks for them.
- `fade()` keeps the outgoing scene at full opacity by default, which is the correct dissolve; `shouldFadeOutExitingScene: true` brings back the luminance dip.
- **A transition shortens the timeline** (60 + 60 − 15 = 105 frames); an overlay does not. Every later cue shifts by the overlap unless you account for it, which breaks the grid.
- **Prefer seams built inside the acts**: the outgoing act draws its exit and the incoming act its entry, both from shared absolute-frame functions (`deviceAt` in §4.1). `ACT` stays contiguous and bar-aligned, and each act still renders alone.
- If you do use `TransitionSeries`, add the overlap to the outgoing sequence so the incoming one still starts on the grid:

```tsx
import React from 'react';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { E } from '../lib/anim';
import { b } from '../timeline';

const X = 15; // overlap
export const Pair: React.FC<{ a: React.ReactNode; c: React.ReactNode }> = ({ a, c }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={b(3) + X}>{a}</TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: X, easing: E.smooth })} />
    {/* starts at b(3) + X - X = b(3): still on the downbeat */}
    <TransitionSeries.Sequence durationInFrames={b(2)}>{c}</TransitionSeries.Sequence>
  </TransitionSeries>
);
```

## 7. Seam plan and checks

Write the plan into the treatment's beat sheet before building:

| Seam | Bar | Type (§4) | Energy | Frames | What carries across | Sound |
|---|---|---|---|---|---|---|
| hook → turn | 4 | implosion + silence + flood | high | 19 + 15 + 18 | the device | suck, silence, drop |
| turn → proof | 6 | container morph | calm | 46 | mark pieces → product | whoosh at `peak()` |
| feature 1 → 2 | 9 | velocity-matched whip | medium | 28 | screen direction | whoosh apex on the kick |

- Count types: 6–8 in total, each ≤ 2 times, plus the signature move 3 times.
- Grab frames `seam − 2 … seam + 2` (`scripts/grab.sh`) and read them as stills: one outline per object, no property flip, the rest pose once.
- `scripts/forensics.py` flags MAD spikes at seams you did not declare as cuts and seam differences above 0.4; both usually mean a property flipped or a pose repeated.
