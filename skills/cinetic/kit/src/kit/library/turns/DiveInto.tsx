// DiveInto (turn, join): the camera dives into a card, a window or a picture, exponentially, and its inside is the
// next scene.
// Numbers: 20 f on cubic-bezier(0.4, 0, 0.75, 0.35) in log scale; the plate starts 1.6x the window; up to 8 px blur;
// 3 % carry over 18 f.
// Caution: words in the next scene arrive after the landing; draw the preview as the plate will show it.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, type Ease, logScale, mix } from '../../motion';
import { t01 } from '../_shared';
import { type Scenes, sp, type TurnBox } from './_shared';

/** The smallest scale at which a rounded box (w x h, radius r), centred on the frame, covers the frame corners too. */
const diveCover = (w: number, h: number, r: number, W: number, H: number) => {
  const covers = (s: number) => {
    const A = (w * s) / 2, B = (h * s) / 2, R = r * s;
    if (A < W / 2 || B < H / 2) return false;
    const ex = W / 2 - (A - R), ey = H / 2 - (B - R);
    if (ex <= 0 || ey <= 0) return true;
    return ex * ex + ey * ey <= R * R;
  };
  let lo = Math.max(W / w, H / h), hi = lo * 4;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (covers(m)) hi = m;
    else lo = m;
  }
  return hi * 1.002;
};

const diveCurve: Ease = Easing.bezier(0.4, 0, 0.75, 0.35);

/**
 * DiveInto: the camera dives into an object (a card, a window, a screen, a porthole) and its inside is the next scene.
 * The zoom is exponential and accelerates (ease in) until the object's rounded box covers the frame, corners included,
 * on the last frame of the dive; the next scene is a plate inside the object that the window outruns (it starts already
 * larger than the window and grows less), so there is depth; after landing the next scene keeps a little of the speed.
 * Measured: 18-24 f to cover; window x11, plate x1.9; blur on the outer scene from 0 to ~8 px in the last third.
 */
export const DiveInto: React.FC<
  Scenes & {
    box: TurnBox;
    dur?: number;
    /** How much larger than the window the plate starts (1 = the same size: a rigid dive). */
    plate?: number;
    /** How much the next scene keeps growing after landing (a share of its size) and over how many frames. */
    carry?: number;
    settle?: number;
    blur?: number;
    curve?: Ease;
  }
> = ({ from, to, at: start, speed = 1, box, dur = 20, plate = 2.2, carry = 0.03, settle = 18, blur = 8, curve = diveCurve }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  const end = start + D;
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= end) {
    const q = ease.out(t01(frame, end, sp(settle, speed)));
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transform: `scale(${1 + carry * q})` }}>{to}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const r = box.r ?? 0;
  const S = diveCover(box.w, box.h, r, W, H);
  const p = curve(t01(frame, start, D));
  const s = logScale(1, S, p);
  const cx = mix(p, box.x, W / 2);
  const cy = mix(p, box.y, H / 2);
  // window on screen
  const ww = box.w * s, wh = box.h * s;
  const wl = cx - ww / 2, wt = cy - wh / 2;
  // the plate: log interpolation from `plate` x the window to the full frame, never smaller than the visible window
  const ps0 = (plate * box.w) / W;
  let ps = logScale(Math.max(ps0, (box.h * plate) / H), 1, p);
  const il = Math.max(0, wl), ir = Math.min(W, wl + ww), it = Math.max(0, wt), ib = Math.min(H, wt + wh);
  const need = Math.max((Math.max(cx - il, ir - cx) * 2) / W, (Math.max(cy - it, ib - cy) * 2) / H);
  ps = Math.max(ps, need);
  const speedNow = Math.abs(curve(t01(frame + 1, start, D)) - p);
  const b = blur * clamp((p - 0.35) / 0.65) * clamp(speedNow * 6);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${cx - box.x * s}px, ${cy - box.y * s}px) scale(${s})`, filter: b > 0.3 ? `blur(${b / Math.sqrt(s)}px)` : undefined }}>
        {from}
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: wl, top: wt, width: ww, height: wh, borderRadius: r * s, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: cx - wl - W / 2, top: cy - wt - H / 2, width: W, height: H, transform: `scale(${ps})` }}>{to}</div>
      </div>
    </AbsoluteFill>
  );
};
