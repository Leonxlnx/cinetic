// PushApart (type, exit / join): the gap in a short line prises open while a dot grows in it, then a cut to the
// object whole, the halves sliding off.
// Numbers: phase one 16 f: camera 1 to 1.3x, the dot 1.5 % to 16 % of the object; on the cut 1.75x, halves blurred 9
// px, sliding off over 12 f.
// Caution: the object must be worth the frame; a generic shape wastes the move.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { accel, clamp, logScale } from '../../motion';
import { useTextLayout } from '../../type';

/**
 * PushApart: an exit made by what arrives. A short line sits centred; from `at` the gap between its two halves prises
 * open while a dot grows in it and the camera creeps in (`dur` frames); then a cut in: the object whole in the middle
 * with a small settle, the halves pushed to the frame's edges, out of focus, sliding off. The line hands the frame to
 * the thing it named.
 */
export const PushApart: React.FC<{
  left: string;
  right: string;
  /** Frame the line is there (a cut) and the frame the push starts. */
  from?: number;
  at: number;
  /** The object: any node drawn at `objSize` px square. */
  node: React.ReactNode;
  objSize?: number;
  /** Frames of the push (default 16). */
  dur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ left, right, from = 0, at, node, objSize = 420, dur = 16, size = 120, color = '#141414', x, y, font = fonts.inter, weight = 550 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.2 } as const;
  const LL = useTextLayout(left, style);
  const LR = useTextLayout(right, style);
  if (!LL.ready || !LR.ready || frame < from) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const space = size * 0.28;
  const total = LL.width + space + LR.width;
  const lx = cx - total / 2;
  const gapX = lx + LL.width + space / 2; // the gap's centre in the line
  const cutAt = at + dur;
  const pushed = frame >= cutAt;
  // two beats, as measured: the gap prises open slowly while a dot grows in it and the camera creeps in; then a cut
  // in, the object whole in the middle, the halves at the frame's edges, out of focus, sliding off
  const u = clamp((frame - at) / dur);
  let zoom = 1;
  let objPx = 0;
  let objX = cx;
  let offL = 0;
  let offR = 0;
  let blur = 0;
  if (frame >= at && !pushed) {
    zoom = logScale(1, 1.3, Math.pow(u, 1.4));
    objPx = objSize * logScale(0.015, 0.16, Math.pow(u, 1.2));
    objX = cx + (gapX - cx) * zoom;
    offL = offR = objPx / 2 + size * 0.12 * u;
  } else if (pushed) {
    const t = frame - cutAt;
    zoom = 1.75;
    objPx = objSize * (1 + 0.05 * Math.exp(-t / 4) * Math.cos(t * 0.7));
    const slide = accel(frame, cutAt + 4, 12, 1.3) * width * 0.35 + t * 3;
    // each half's inner edge sits so that about 40 % of it shows at the frame's edge
    offL = Math.max(objSize / 2 + size * 0.4, width / 2 - LL.width * zoom * 0.4) - (cx - (lx + LL.width)) * zoom + slide;
    offR = Math.max(objSize / 2 + size * 0.4, width / 2 - LR.width * zoom * 0.4) - (lx + LL.width + space - cx) * zoom + slide;
    blur = 9;
  }
  const word = (txt: string, L0: typeof LL, left0: number, sign: number, off: number) => (
    <span style={{ ...style, position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${cx + (left0 - cx) * zoom + sign * off}px, ${cy - (L0.height * zoom) / 2}px) scale(${zoom})`, color, whiteSpace: 'pre', filter: blur ? `blur(${blur}px)` : undefined }}>
      {txt}
    </span>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {word(left, LL, lx, -1, offL)}
      {word(right, LR, lx + LL.width + space, 1, offR)}
      {objPx > 1 && (
        <div style={{ position: 'absolute', transform: `translate(${objX - objPx / 2}px, ${cy - objPx / 2}px)`, left: 0, top: 0, width: objPx, height: objPx }}>
          <div style={{ width: objSize, height: objSize, transformOrigin: '0 0', transform: `scale(${objPx / objSize})` }}>{node}</div>
        </div>
      )}
    </div>
  );
};
