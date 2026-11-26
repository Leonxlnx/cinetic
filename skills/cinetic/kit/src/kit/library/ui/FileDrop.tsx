// FileDrop (ui, build): the pointer brings a file in from the lower right on a decelerating arc; the file hangs from
// the pointer's tip, tilted by the travel, swings past upright and back as the pointer slows, then drops into the
// composer's attachment slot; the send button cuts on and the box grows taller upward.
// Numbers: travel 9 f on the pointer's arc (half the frame in 4 f), a settle of 6 f; the file swings as a damped
// pendulum (period 12 f, about 30 degrees in flight, settled in 20 f); the drop 5 f (scale 1 to 0.9); the send
// button cuts on 8 f after it and the box grows 22 % upward in 4 f; file icon 8 % of the frame height.
// Caution: the file is what the prompt will be about (a brief, a contract): give it a real name; one file.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { type Look, surfaceStyle, useUiFrame, withPace } from './_shared';
import { Pointer, pointerAt, type PointerKey } from './Pointer';

/** The file's tilt (degrees) on a frame: a damped pendulum hung from the pointer, driven by the pointer's sideways acceleration. */
const swing = (frame: number, keys: PointerKey[], from: number, until: number) => {
  const w0 = (2 * Math.PI) / 12;
  const zeta = 0.16;
  let th = 0.52; // tilted on entry
  let om = 0;
  let vPrev = 0;
  const end = Math.min(frame, until);
  for (let f = from + 1; f <= end; f++) {
    const v = pointerAt(f, keys).vx;
    const a = v - vPrev;
    vPrev = v;
    const sub = 4;
    for (let k = 0; k < sub; k++) {
      const acc = -w0 * w0 * Math.sin(th) - 2 * zeta * w0 * om - a * 0.0042 / sub;
      om += acc / sub;
      th += om / sub;
    }
  }
  return (th * 180) / Math.PI;
};

const FileDropInner: React.FC<{
  L: Look;
  at: number;
  file: { name: string; size: string };
  /** The heading over the composer. */
  greeting?: string;
  /** Frames (from `at`) the pointer lands over the slot and the file drops. */
  landAt?: number;
  dropAt?: number;
  w?: number;
  size?: number;
  mark?: React.ReactNode;
  speed?: number;
}> = ({ L, at: start, file, greeting = 'What are we making today?', landAt = 15, dropAt = 26, w: wIn, size: sizeIn, mark, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = start + (useUiFrame() - start) * speed;
  const s = sizeIn ?? H * 0.024;
  const w = wIn ?? Math.min(W * 0.62, s * 34);
  const grow = at(frame, start + dropAt + 8, 4, ease.out);
  const bh0 = s * 4.2;
  const bh = bh0 * mix(grow, 1, 1.22);
  const bx = W / 2 - w / 2;
  const bBottom = H * 0.55 + bh0 / 2;
  const by = bBottom - bh;
  const slot = { x: bx + s * 1.3, y: by + s * 0.9 };
  const fh = H * 0.08;
  const fw = fh * 0.78;
  // the pointer's path: in from the lower right, an arc, a settle over the slot, away after the drop
  const keys: PointerKey[] = [
    { f: start, x: W * 0.98, y: H * 1.04 },
    { f: start + landAt - 6, x: slot.x + fw * 0.9, y: slot.y - fh * 0.2 },
    { f: start + landAt, x: slot.x + fw * 0.5, y: slot.y - fh * 0.15 },
    { f: start + dropAt + 2, x: slot.x + fw * 0.5, y: slot.y - fh * 0.1 },
    { f: start + dropAt + 22, x: bx + w * 0.42, y: by + bh * 0.62 },
  ];
  const drop = at(frame, start + dropAt, 5, ease.out);
  const dropped = frame >= start + dropAt;
  const p = pointerAt(frame, keys);
  const tilt = dropped ? swing(start + dropAt, keys, start, start + dropAt) * (1 - drop) : swing(frame, keys, start, start + dropAt);
  // the file hangs from the tip; once dropped it settles into the slot
  const hang = { x: p.x - fw * 0.2, y: p.y + fh * 0.05 };
  const fx = dropped ? mix(drop, hang.x, slot.x) : hang.x;
  const fy = dropped ? mix(drop, hang.y, slot.y) : hang.y;
  const fsc = dropped ? mix(drop, 1, 0.9) : 1;
  const sendOn = frame >= start + dropAt + 8;
  const greetY = by - s * 3.4;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, fontFamily: L.font }}>
      {/* greeting */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: greetY, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: s * 0.6, fontSize: s * 1.55, fontWeight: 520, color: L.ink, letterSpacing: '-0.02em' }}>
        {mark ?? <Icon name="Sparkle" size={s * 1.5} color={L.accent} stroke={2} />}
        {greeting}
      </div>
      {/* the composer */}
      <div style={{ ...surfaceStyle(L, 2, s * 0.55), position: 'absolute', left: bx, top: by, width: w, height: bh }}>
        <div style={{ position: 'absolute', left: s * 0.9, bottom: s * 0.75, display: 'flex', alignItems: 'center', gap: s * 0.5, color: L.muted }}>
          <Icon name="Plus" size={s * 1.1} stroke={2} />
        </div>
        {dropped && drop > 0.9 && (
          <div style={{ position: 'absolute', left: s * 1.3 + fw * 0.9 + s * 0.5, top: s * 0.9, fontSize: s * 0.78, opacity: at(frame, start + dropAt + 4, 5, ease.out), whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600, color: L.ink }}>{file.name}</div>
            <div style={{ color: L.faint, marginTop: s * 0.1 }}>{file.size}</div>
          </div>
        )}
        <div style={{ position: 'absolute', right: s * 0.8, bottom: s * 0.7, display: 'flex', alignItems: 'center', gap: s * 0.6, color: L.muted }}>
          <Icon name="Mic" size={s * 0.95} stroke={2} />
          {sendOn ? (
            <div style={{ width: s * 1.6, height: s * 1.6, borderRadius: s * 0.4, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="ArrowUp" size={s * 1} color={L.accentInk} stroke={2.6} />
            </div>
          ) : (
            <div style={{ width: s * 1.6, height: s * 1.6 }} />
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: bx + s * 0.4, top: by + bh + s * 0.6, display: 'flex', gap: s * 1.2, fontSize: s * 0.72, color: L.muted }}>
        <span>Project or folder</span>
        <span style={{ padding: `${s * 0.12}px ${s * 0.5}px`, borderRadius: s * 0.3, background: mixColor(L.ground, '#000000', 0.05) }}>Output</span>
      </div>
      {/* the file */}
      <div style={{ position: 'absolute', left: fx, top: fy, width: fw, height: fh, transformOrigin: `${fw * 0.2}px 0px`, transform: `rotate(${tilt}deg) scale(${fsc})`, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.14))', zIndex: 150 }}>
        <svg width={fw} height={fh} viewBox="0 0 39 50">
          <path d="M3 1 H27 L38 12 V47 a2 2 0 0 1 -2 2 H3 a2 2 0 0 1 -2 -2 V3 a2 2 0 0 1 2 -2 Z" fill="#FFFFFF" stroke="#C9C6C0" strokeWidth={1.2} />
          <path d="M27 1 V12 H38" fill="#EEEBE6" stroke="#C9C6C0" strokeWidth={1.2} />
          <rect x={1} y={30} width={37} height={12} fill="#D2463C" />
          <text x={19.5} y={39.4} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700} fontSize={8.5} fill="#FFFFFF">
            PDF
          </text>
          <path d="M8 12 H22 M8 17 H30 M8 22 H26" stroke="#D9D6D0" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </div>
      <Pointer keys={keys} size={s * 3} ring={false} at={start} exitAt={start + dropAt + 30} />
    </div>
  );
};

export const FileDrop = withPace(FileDropInner);
