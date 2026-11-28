// WindowOpen (turn, join): a window opens out of the button that was pressed, the next scene's window drawn whole
// inside the growing rectangle.
// Numbers: 14 f on cubic-bezier(0.32, 0, 0.12, 1); the rectangle takes the window's shape in the first 45 % (so the
// content, scaled to cover, is cropped only while it is small); the face fades in the first 3 f and grows 15 % at most;
// opening to the full frame, the old scene is carried with it (scaled to 1.6 about the button, `carry`).
// Caution: what surrounds the button must lie wholly inside the window, or a sliver stays beside it.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, type Ease, mix } from '../../motion';
import { t01 } from '../_shared';
import { type Scenes, sp, type TurnBox } from './_shared';

const openCurve: Ease = Easing.bezier(0.32, 0, 0.12, 1);

/**
 * WindowOpen: a window or panel opens out of the button or card that was pressed. The button's rounded rectangle grows
 * into the window's rectangle (position, size and radius together), and inside it the next scene's window is already laid
 * out and drawn whole, scaled to fit the growing rectangle (cover, centred): never an empty plate, never a reveal through
 * a sliding clip edge. The button's own face (`face`) sits on top and fades out in the first fifth, growing 15 % at most. On its last frame the
 * rectangle is the window and the next scene is whole.
 * Measured: 12-16 f; a short lift out of the button then a long settle (cubic-bezier 0.32, 0, 0.12, 1); the shadow grows
 * with it. The scene around the window must be the same in both scenes (one desk, one ground); otherwise open to the
 * full frame (`win` omitted).
 */
export const WindowOpen: React.FC<
  Scenes & {
    /** The button or card in the old scene (its centre, size and radius), exactly as drawn there. */
    box: TurnBox;
    /** The window in the next scene (its centre, size and radius); default the full frame. */
    win?: TurnBox;
    dur?: number;
    /** The button's face (its label and fill, laid out at `box` size), fading out over the first fifth. */
    face?: React.ReactNode;
    /** The window's surface colour, under its content while it grows. */
    surface?: string;
    /** The common name for `surface`. */
    color?: string;
    /** A shadow under the growing rectangle (`softShadow(...)`). */
    shadow?: string;
    /**
     * How far the old scene is carried with the window, as its scale on the last frame (about the button, which rides
     * under the window's centre): the old scene leaves the frame with the window instead of standing round it. Default
     * 1.6 when the window is the full frame (`win` omitted), 1 (the old scene holds still) when `win` is given.
     */
    carry?: number;
  }
> = ({ from, to, at: start, speed = 1, box, win, dur = 14, face, surface: surfaceIn, color, shadow, carry }) => {
  const surface = surfaceIn ?? color ?? '#FFFFFF';
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const D = sp(dur, speed);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + D - 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const w1 = win ?? { x: W / 2, y: H / 2, w: W, h: H, r: 0 };
  const tt = t01(frame, start, D);
  const p = openCurve(tt);
  const cx = mix(p, box.x, w1.x);
  const cy = mix(p, box.y, w1.y);
  // size follows the curve; the shape (aspect) reaches the window's in the first 45 %, so the content, scaled to cover,
  // is cropped only while the rectangle is small (a wide button no longer crops the window's long side for long)
  const pa = openCurve(clamp(tt / 0.45));
  const side = mix(p, Math.sqrt(box.w * box.h), Math.sqrt(w1.w * w1.h));
  const asp = Math.exp(mix(pa, Math.log(box.w / box.h), Math.log(w1.w / w1.h)));
  // never narrower or shorter than the button it grows out of
  const cw = Math.max(side * Math.sqrt(asp), Math.min(box.w, w1.w));
  const ch = Math.max(side / Math.sqrt(asp), Math.min(box.h, w1.h));
  const cr = mix(p, box.r ?? 0, w1.r ?? 0);
  // the old scene rides with the window: scaled about the button, the button kept under the window's centre
  const zEnd = carry ?? (win ? 1 : 1.6);
  // never larger than the window around it, or the old button's own ends would show beside the window
  const z = Math.max(1, Math.min(mix(p, 1, zEnd), cw / box.w, ch / box.h));
  const fromT = zEnd !== 1 ? `translate(${cx - box.x * z}px, ${cy - box.y * z}px) scale(${z})` : undefined;
  // the window's content, drawn whole and scaled to cover the rectangle (centred on it): it grows, it is never uncovered
  const s = Math.max(cw / w1.w, ch / w1.h);
  const left = cx - cw / 2;
  const top = cy - ch / 2;
  // the face leaves fast and barely grows: a label scaled up over the window's content reads as an overprint
  const faceO = 1 - clamp(t01(frame, start, Math.max(2, Math.round(D / 5))));
  const fs = Math.min(1.15, cw / box.w, ch / box.h);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transformOrigin: '0 0', transform: fromT }}>{from}</AbsoluteFill>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left, top, width: cw, height: ch, borderRadius: cr, overflow: 'hidden', background: surface, boxShadow: shadow }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${cw / 2 - w1.x * s}px, ${ch / 2 - w1.y * s}px) scale(${s})` }}>{to}</div>
        {face && faceO > 0.01 && (
          <div style={{ position: 'absolute', left: cw / 2 - box.w / 2, top: ch / 2 - box.h / 2, width: box.w, height: box.h, opacity: faceO, transform: `scale(${fs})` }}>{face}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const windowOpenEnd = (at: number, o: { dur?: number; speed?: number } = {}) => at + sp(o.dur ?? 14, o.speed) - 1;
