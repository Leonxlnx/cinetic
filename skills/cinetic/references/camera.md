# Camera

Covers the camera: one world transform, the anchor camera in `src/lib/camera.ts` (`Shot`, `lc`, `camera`, `toScreen`, `breath`, `dip`), chaining shots, the modifiers that keep holds alive (breath, dip, punch, dolly, drift), 3D and perspective limits, pull-backs, rack focus and speed limits. Read it before building any act where the frame moves, and when a shot feels locked-off, floaty or seasick.

The numbers are proven defaults from shipped films. Adjust them to the product's scale and the film's energy, but keep the model.

**Contents**
1. [One world transform](#1-one-world-transform)
2. [The anchor camera](#2-the-anchor-camera)
3. [Shots, chains and modifiers](#3-shots-chains-and-modifiers)
4. [Holds stay alive](#4-holds-stay-alive)
5. [3D, perspective and axes](#5-3d-perspective-and-axes)
6. [Pull-backs and chained moves](#6-pull-backs-and-chained-moves)
7. [Framing, legibility and rack focus](#7-framing-legibility-and-rack-focus)
8. [Speed limits](#8-speed-limits)

---

## 1. One world transform

- Lay the product out **once, in its own coordinates** ("app space", e.g. a 1600×1000 window), and move it with **one transform on one wrapper**. The layout never reflows, overlays can be projected onto it, and both sides of a seam can use the identical matrix.
- **All translation lives inside the transform.** The wrapper is `position: absolute; left: 0; top: 0; transform-origin: 0 0`. A fractional `left`/`top` combined with a scale or rotate makes Chromium snap the paint offset to whole pixels: slow moves step in 1 px stairs every 6–8 f. Never animate `left`, `top`, `width` or `height` of anything the camera carries.
- **Lay out static, animate one matrix.** Text, lockups and UI are positioned once; the camera, punches and dollies are all transforms on the wrapper. Nothing inside steps on the pixel grid during a hold.

## 2. The anchor camera

Describe a framing the way a director does: *this point of the product sits there on screen, this big.*

- `ax, ay`: a point in app space (the subject).
- `sx, sy`: where that point sits on screen.
- `k`: scale.

Moving between two framings lerps the anchors linearly and `k` in log space, so the subject travels a straight screen path at an even zoom rate. Lerping a translate and a scale separately makes the subject swing off its line mid-move, because screen position = translate + point × scale is not linear in both.

`src/lib/camera.ts` in the starter holds the model:

```ts
// src/lib/camera.ts (the starter's API, abridged)
export type Shot = {
  ax: number; ay: number; // world point that is framed ...
  sx: number; sy: number; // ... at this screen point
  k: number; // scale (world px -> screen px)
  yaw?: number; pitch?: number; roll?: number; // degrees; roll stays rigid, outside the tilt
};
/** Blend two shots: anchors and angles linearly, k in log space. Chain: lc(lc(A, B, t1), C, t2). */
export declare const lc: (A: Shot, B: Shot, t: number) => Shot;
/** Style for the world container: absolute at 0,0, origin 0 0, and one transform:
 *  translate(sx,sy) [perspective(P) rotateZ(roll) rotateX(pitch) rotateY(yaw)] scale(k) translate(-ax,-ay) */
export declare const camera: (s: Shot, perspective?: number) => React.CSSProperties;
/** Screen position of a world point under a flat shot: where overlays that track the product go. */
export declare const toScreen: (s: Shot, p: { x: number; y: number }) => { x: number; y: number };
/** Multiply k by these: a push inside a hold (+2.5%), and a zoom-out hop through a whip. */
export declare const breath: (t: number, amount?: number) => number; // 1 + amount * t
export declare const dip: (t: number, depth?: number) => number; // 1 - depth * sin^2(pi t)
```

- The transform reads right to left: move the anchor to the origin, scale, rotate about it, then place it on screen. That is why the hinge and every punch pivot on the subject, not on a corner.
- Overlays that must track the product (a cursor, the story device, a caption pinned to a row) are drawn in screen space at the projected point, every frame. For a flat shot the starter's `toScreen` does it:

```ts
// in src/lib/camera.ts
export const toScreen = (s: Shot, p: { x: number; y: number }) => ({
  x: s.sx + (p.x - s.ax) * s.k,
  y: s.sy + (p.y - s.ay) * s.k,
});
// in an act: the cursor follows the Send button through the camera move
const at = toScreen({ ...cam, k }, SEND_BUTTON);
<Cursor x={at.x} y={at.y} />
```

Under rotation, project with the same maths as the transform (Tessel's Act 6 did the rotateZ, rotateX and perspective divide by hand) rather than guessing.

## 3. Shots, chains and modifiers

Name each framing once, drive each move with a camera ease, and multiply the modifiers into `k` at the end:

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { E, hitPulse, prog } from '../lib/anim';
import { breath, camera, dip, lc, type Shot } from '../lib/camera';

const APP = { W: 1600, H: 1000 };
const SHOT: Record<'wide' | 'inbox' | 'reply', Shot> = {
  wide: { ax: 800, ay: 500, sx: 960, sy: 540, k: 0.94 }, // the whole window, centred
  inbox: { ax: 420, ay: 300, sx: 760, sy: 540, k: 2.1, yaw: -6 }, // the list, on the eye line, hinged
  reply: { ax: 1180, ay: 640, sx: 1160, sy: 540, k: 2.4 }, // the reply, same eye line, flat again
};
const PUSH = [20, 80] as const; // act-local
const WHIP = [104, 132] as const; // 28 f whip, velocity peak on the next kick
const PAYOFF = 180;

export const InboxCamera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const t1 = prog(f, PUSH[0], PUSH[1], E.cam);
  const t2 = prog(f, WHIP[0], WHIP[1], E.whip);
  const cam = lc(lc(SHOT.wide, SHOT.inbox, t1), SHOT.reply, t2);
  const hold = breath(prog(f, PUSH[1], WHIP[0], E.smooth) * (1 - t2)); // alive in the hold, released by the whip
  const punch = 1 + 0.012 * hitPulse(f - PAYOFF, 3, 7); // the payoff lands
  const k = cam.k * hold * dip(t2) * punch;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={{ ...camera({ ...cam, k }), width: APP.W, height: APP.H }}>{children}</div>
    </AbsoluteFill>
  );
};
```

| Modifier | Formula | When |
|---|---|---|
| breath | `breath(prog(holdStart, holdEnd, E.smooth) · (1 − nextMove))` = +2.5% | inside every hold; the next move releases it, so there is no velocity step |
| dip | `dip(t)` = `1 − 0.18 · sin²(π·t)` | during a whip between two close framings: the operator pulls back to find the next subject |
| punch | `1 + 0.012 · hitPulse(f − cue, 3, 7)` | a payoff or lock-in; one per payoff, never on every beat |
| dolly | `lmix(1, 1.2, prog(a, b, E.dolly))` | a logo or statement hold |

## 4. Holds stay alive

A locked-off frame reads as a stalled player in a muted feed. Every hold has visible, slow life:

| Hold | Life | Number |
|---|---|---|
| Logo / lockup | dolly in on `E.dolly` | 10–20% over about 2 s (Tessel's 1.0 → 1.1 still read as dead; use 1.2) |
| UI hold | drift | 0.5–1.5 px/f, plus a 2–3%/s push |
| Typing or reading | background parallax under a sharp foreground | background −16 px and +2.5% while the foreground bar pushes +0.16 |
| Statement | slow grow | ×1.03–1.05 through the hold |

- **Parallax planes** move at 0.3× (background), 1.0× (subject) and 1.6× (foreground) of the camera's translation. Two planes are usually enough; three is the maximum before it looks like a demo reel of parallax.
- A drift that starts at a seam **eases in from rest**, so the cut is clean: `drift = (f − 20·(1 − e^(−f/20))) / 300` starts at zero velocity and reaches constant speed over about 60 f.
- Stillness is still allowed: a designed freeze of ≤ 15 f exactly on a silence (`references/timing-grid.md` §9).

## 5. 3D, perspective and axes

- **Perspective 1800–2600 px** on a 1920-wide frame. Below that, UI distorts like a wide lens; above, 3D reads flat and you might as well scale.
- **Each act gets its own axis:** a vertical hinge (yaw) in one act, a tabletop (pitch) in another, a roll or pull-back in a third. The same tilted-card angle three times in 15 s is a template tell.
- **Keep roll rigid and outside the tilt:** `perspective(P) rotateZ(roll) rotateX(tilt)`. The tilt then happens in the element's own frame and the roll turns the result as a whole. The reverse order (`rotateX` outside `rotateZ`) shears type into faux italics, about 18° in Tessel's first tabletop.
- **Limits:** roll ≤ 11°, total visible shear ≤ 7° (for example pitch 42° with roll ≤ 12°). Tessel's tabletop ran pitch 46 → 36 and roll −11 → −5 before straightening.
- **Real 3D only.** Tilted screenshot cards floating in space are a tell; tilt the live product, with its own shadow on its own ground.
- **Chromium caps the raster scale under `perspective`**, so text scaled up in 3D goes soft. Lay the product out at shot scale with CSS `zoom: Z` and scale the camera by `scale3d(k/Z, k/Z, 1/Z)`, switching Z only on a whole frame at a velocity peak where the swap is invisible. `camera()` does not do this split; write that one transform by hand (Tessel's features act did). Paint order, minification crawl and `preserve-3d` flattening are covered in `references/chromium-rendering.md`.

## 6. Pull-backs and chained moves

**A pull-back** that reveals scale (Tessel's product window becoming one tile of a quilt of weeks): scale in log space, a slow tilt and roll, and a constant drift that eases in from the seam.

```ts
import { E, lmix, mix, prog } from '../lib/anim';

const PULL_END = 180; // act-local
/** Camera state for frame f: the previous act lands at rest, so this one starts from rest. */
export const pullBack = (f: number) => {
  const p = prog(f, 0, PULL_END, E.rest);
  const drift = (f - 20 * (1 - Math.exp(-f / 20))) / 300; // zero velocity at the seam
  return {
    k: lmix(0.94, 0.23, p) * Math.exp(-0.1 * drift),
    pitch: mix(0, 22, p),
    roll: mix(0, -7, p) - 1.8 * drift,
  };
};
```

**Chained moves never stall.** When one move hands over to another (an orbit settling into a straighten), start the second on a zero-slope curve while the first is still moving: about 20 f of overlap for moves of similar speed, more when the first is slow (Tessel's slow orbit and its straighten overlapped by 40 f). Two moves that each ease to rest back to back measured a combined speed of 0.0002°/f at the handoff: a visible stop.

```ts
import { E, mix, prog } from '../lib/anim';

const ORBIT = { from: 0, to: 210 };
const STRAIGHTEN = { from: 170, to: 240 }; // starts 40 f before the slow orbit ends
export const tabletop = (f: number) => {
  const orbit = prog(f, ORBIT.from, ORBIT.to, E.smooth);
  const st = prog(f, STRAIGHTEN.from, STRAIGHTEN.to, E.rest); // zero initial slope
  return {
    pitch: mix(mix(46, 36, orbit), 0, st),
    roll: mix(mix(-11, -5, orbit), 0, st),
  };
};
// dev check (npx tsx): the combined speed must not dip toward zero between the two moves
export const speedAt = (f: number) => {
  const a = tabletop(f);
  const b = tabletop(f + 1);
  return Math.hypot(b.pitch - a.pitch, b.roll - a.roll); // degrees per frame
};
```

- The camera eases both ways; everything else follows `references/motion-tokens.md` §1.
- A whip between features peaks its velocity on the kick (`peak()` in `references/timing-grid.md` §7) and puts its whoosh apex there.
- Seams between acts follow `references/transitions.md`: both sides at rest, or the incoming shot starts at the outgoing velocity.

## 7. Framing, legibility and rack focus

- **The product covers the frame** whenever it is the shot. Clamp the camera so no window edge or void enters by accident (a black band under the product, a 20–130 px dark edge at the frame border were real Tessel defects):

```ts
import type { Shot } from '../lib/camera';
/** Shift a flat shot so a world of size w×h still covers the 1920×1080 frame. */
export const cover = (c: Shot, w: number, h: number): Shot => {
  const k = Math.max(c.k, 1920 / w, 1080 / h); // never smaller than the frame
  const left = c.sx - c.ax * k; // screen x of the app's left edge
  const top = c.sy - c.ay * k;
  const x = Math.min(0, Math.max(1920 - w * k, left)); // both edges stay outside the frame
  const y = Math.min(0, Math.max(1080 - h * k, top));
  return { ...c, k, sx: c.sx + (x - left), sy: c.sy + (y - top) };
};
```

- **Headroom:** ≥ 24 px between any glyph and the frame edge at maximum `k` (breath × punch included). Compute the worst case, do not eyeball the rest frame.
- **Readable UI:** anything the viewer must read is ≥ 22 px on screen after camera scale, so `k ≥ 22 / fontPx` for the smallest text that carries meaning. Smaller text is texture.
- **Overscan** moving layers by 5–8% so a drift, dip or punch never reveals an edge.
- **Rack focus** with `src/fx/RackFocus.tsx`, never an animated `filter: blur()` on a large layer (Chromium steps the ramp from sharp to soft in one frame). It cross-fades a sharp copy with a constant-blur copy (10–12 px, both overscanned 80 px):

```tsx
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, prog } from '../lib/anim';
import { RackFocus } from '../fx/RackFocus';

export const Defocus: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const f = useCurrentFrame();
  return <RackFocus t={prog(f, from, to, E.smooth)} blur={10} render={() => children} />;
};
```

- Behind a payoff line, veil the defocused background at 80–85% of the background colour; at 66% a striped background fought the type.

## 8. Speed limits

| Move | Speed or length | Note |
|---|---|---|
| Hold drift | 0.5–1.5 px/f | visible life, not motion |
| Push in a hold | 2–3% per second | a logo hold 10–20% over ~2 s |
| Camera move | 0.35 s + 1.35 ms/px, 0.6–2.4 s | `durFor(px, true)` in `references/motion-tokens.md` |
| Whip | 24–30 f, peak 60–70 px/f | beside 0.3–0.6 px/f stillness; needs motion blur |
| Unblurred motion | ≤ 12 px/f | above that, render the master with `--blur` (`references/finishing.md`) |
| Strobing | > 20 px/f unblurred | falling blocks at 140 px/f stamped copies until blurred |

- The longest camera move in a film lasts at least 3× the shortest.
- `scripts/measure-speed.py` measures on-screen speed from the sharp render and sets the motion-blur sample count per frame; check its report for any shot you expected to be calm.
