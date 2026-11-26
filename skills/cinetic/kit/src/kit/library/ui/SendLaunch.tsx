// SendLaunch (ui, join): the send button is pressed and lifts away up and to the right while the composer falls out
// of the bottom of the frame; on the cut a small spark of square pixels glows low on a dark ground and leads the next
// window, which slides in from the lower right with a horizontal smear and brakes into place.
// Numbers: press 3 f; the button rises 0.27 H and drifts 0.08 W right over 8 f (ease-in, 8 px vertical blur); the
// composer falls 0.38 H from +2 f over 6 f (ease-in, three quarters in the last 3 f, smear to 20 px, fading to 0.5);
// the cut at +8 f: the ground lifts to 16 % grey round the spark and darkens back to 7 % in 9 f; three squares 2.4 %
// H with a 30 px bloom fall out of the bottom by +20 f; the window enters at +11 f from 0.45 W right and 0.3 H down,
// 70 % of the way by +17 f, settled at +24 f, 30 px horizontal smear clearing by +20 f.
// Caution: the window is the product's answer to the prompt: real content, the same product chrome as the composer.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { SmearFilter, useUid } from '../_shared';
import { type Look, surfaceStyle, useUiFrame, withPace } from './_shared';

const SendLaunchInner: React.FC<{
  L: Look;
  /** The prompt standing in the composer. */
  prompt: string;
  /** The frame of the press (the composer is on screen before it). */
  at: number;
  /** The next shot's window, drawn at `winW` x `winH` px. */
  window: React.ReactNode;
  winW?: number;
  winH?: number;
  /** The dark ground of the next shot. */
  night?: string;
  /** Composer width in px and text size. */
  w?: number;
  size?: number;
  speed?: number;
}> = ({ L, prompt, at: press, window: win, winW: winWIn, winH: winHIn, night = '#121212', w: wIn, size: sizeIn, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = press + (useUiFrame() - press) * speed;
  const idA = useUid('slA');
  const idW = useUid('slW');
  const s = sizeIn ?? H * 0.026;
  const w = wIn ?? Math.min(W * 0.7, s * 34);
  const cut = press + 8;
  const winW = winWIn ?? W * 0.62;
  const winH = winHIn ?? H * 0.7;
  if (frame < cut) {
    // the composer, pressed, then leaving
    const dip = at(frame, press - 3, 3, ease.out) - at(frame, press, 4, ease.out);
    const up = at(frame, press, 8, ease.in);
    const fall = at(frame, press + 2, 6, (t) => t * t * t);
    const ch = s * 4.6;
    const cx = W / 2 - w / 2;
    const cy = H * 0.6 - ch / 2;
    const bs = s * 1.9;
    const bx = cx + w - s * 0.9 - bs;
    const by = cy + ch - s * 0.8 - bs;
    return (
      <AbsoluteFill style={{ background: L.ground }}>
        <SmearFilter id={idA} x={0} y={fall * 20} />
        <div style={{ position: 'absolute', left: cx, top: cy + fall * H * 0.38, width: w, height: ch, opacity: mix(fall, 1, 0.5), filter: fall > 0.02 ? `url(#${idA})` : undefined }}>
          <div style={{ ...surfaceStyle(L, 4, ch * 0.3), position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', left: s * 1.1, top: s * 0.75, right: s * 4, fontFamily: L.font, fontSize: s, color: L.ink, whiteSpace: 'nowrap', overflow: 'hidden' }}>{prompt}</div>
          <div style={{ position: 'absolute', left: s * 0.9, bottom: s * 0.75, display: 'flex', alignItems: 'center', gap: s * 0.6, color: L.muted, fontFamily: L.font, fontSize: s * 0.78 }}>
            <Icon name="Plus" size={s * 1.05} stroke={2} />
            <span style={{ display: 'flex', alignItems: 'center', gap: s * 0.3 }}>
              <Icon name="ShieldCheck" size={s * 0.9} stroke={2} />
              Ask for approval
            </span>
          </div>
        </div>
        {/* the send button: lifted away */}
        <div style={{ position: 'absolute', left: bx + up * W * 0.08, top: by + (fall > 0 ? 0 : 0) - up * H * 0.27, width: bs, height: bs, borderRadius: bs, background: mixColor(L.ink, '#FFFFFF', dip * 0.25), transform: `scale(${(1 - dip * 0.08) * mix(up, 1, 0.9)})`, filter: up > 0.1 ? `blur(${up * 4}px)` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          <Icon name="ArrowUp" size={bs * 0.5} color={L.surface} stroke={2.6} />
        </div>
      </AbsoluteFill>
    );
  }
  // the cut: a spark on a dark ground leads the window in
  const k = frame - cut;
  const lift = 1 - at(frame, cut, 9, ease.out);
  const sparkX = W * 0.23;
  const sparkY = H * 0.7;
  const fallS = at(frame, cut + 5, 10, ease.in);
  const sq = H * 0.024;
  const inP = at(frame, cut + 3, 13, ease.out);
  const inPrev = at(frame - 1, cut + 3, 13, ease.out);
  const vx = (inP - inPrev) * W * 0.45;
  const smear = Math.min(30, vx * 0.5);
  const wx = W - winW - W * 0.06 + (1 - inP) * W * 0.45;
  const wy = (H - winH) / 2 + (1 - inP) * H * 0.3;
  const ground = mixColor(night, '#3A3A3A', lift * 0.75);
  return (
    <AbsoluteFill style={{ background: night }}>
      <SmearFilter id={idW} x={smear} y={0} />
      {/* the lit area round the spark */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${sparkX}px ${sparkY}px, ${ground} 0, ${night} ${H * 0.75}px)` }} />
      {fallS < 1 &&
        [
          [0, 0, 1],
          [-1.5, 0.9, 0.55],
          [0.9, 1.5, 0.85],
        ].map(([dx, dy, sc], i) => {
          const px = sparkX + dx * sq + fallS * W * 0.06 + k * 1.2;
          const py = sparkY + dy * sq + fallS * H * 0.36;
          const z = sq * sc;
          return (
            <div key={i} style={{ position: 'absolute', left: px - z / 2, top: py - z / 2, width: z, height: z, background: '#FFFFFF', boxShadow: `0 0 ${H * 0.028}px ${H * 0.008}px rgba(255,255,255,${mix(lift, 0.25, 0.6)})`, opacity: clamp(1.2 - fallS) }} />
          );
        })}
      {frame >= cut + 3 && (
        <div style={{ position: 'absolute', left: wx, top: wy, width: winW, height: winH, filter: smear > 0.5 ? `url(#${idW})` : undefined }}>{win}</div>
      )}
    </AbsoluteFill>
  );
};

export const SendLaunch = withPace(SendLaunchInner);
