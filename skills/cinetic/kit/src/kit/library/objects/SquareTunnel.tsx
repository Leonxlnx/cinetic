// SquareTunnel (object, build / join): a small solid square at the centre opens into a ring; new squares are born in
// its hole every few frames and open in turn, every ring growing outward at one steady speed, so the frame fills with
// concentric square rings; the births quicken, the rings thicken, and the last square grows solid until it covers the
// frame (the next scene's ground).
// Numbers: the first square 13 % of the short side; every ring grows 6.9 % of the short side a frame (linear: a tunnel, not a zoom); a ring 7 % of
// H thick (each later one 4 % thicker), solid until it is twice that wide; births every 5 f, every 3 f after 20 f; the
// last square from 34 f, covering the frame at 43 f on an ease-in.
// Caution: it starts from a square that is already on screen (a tile, a cell, a button); never from a full stop.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';

export const SquareTunnel: React.FC<{
  at?: number;
  color?: string;
  /** The first square's side as a share of the short side. */
  size?: number;
  /** 1 the measured timing. */
  speed?: number;
  /** Frames until the last square covers the frame (43 measured). */
  dur?: number;
  /** Corner radius as a share of a square's side (0 measured). */
  radius?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, color = '#F0541E', size = 0.13, speed = 1, dur = 43, radius = 0, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = ((f - at) * speed * 43) / dur;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const v = 0.069 * Math.min(W, H);
  const T0 = 0.07 * Math.min(W, H);
  // births: the first square is there at 0 (already at `size`), then every 5 f, every 3 f after 20 f, until 34 f
  const births: number[] = [0];
  for (let b = 5; b < 34; b += b < 20 ? 5 : 3) births.push(b);
  const cover = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 2.05;
  const squares: React.ReactNode[] = [];
  births.forEach((b, k) => {
    if (t < b) return;
    const s0 = k === 0 ? size * Math.min(W, H) : 0.035 * Math.min(W, H);
    const side = s0 + v * (t - b);
    if (side > cover * 1.2) return;
    const th = T0 * (1 + 0.04 * k);
    const border = Math.min(side / 2, th);
    squares.push(
      <div key={k} style={{ position: 'absolute', left: cx - side / 2, top: cy - side / 2, width: side, height: side, boxSizing: 'border-box', border: `${border}px solid ${color}`, background: border >= side / 2 - 0.5 ? color : 'transparent', borderRadius: radius * side }} />,
    );
  });
  // the last square: born at 34 f, grows solid on an ease-in until it covers the frame at 43 f
  if (t >= 34) {
    const p = ease.in(clamp((t - 34) / 9));
    const side = mix(p, 0.035 * Math.min(W, H), cover);
    squares.push(<div key="last" style={{ position: 'absolute', left: cx - side / 2, top: cy - side / 2, width: side, height: side, background: color, borderRadius: radius * side * (1 - p) }} />);
  }
  return <AbsoluteFill style={{ overflow: 'hidden' }}>{squares}</AbsoluteFill>;
};
