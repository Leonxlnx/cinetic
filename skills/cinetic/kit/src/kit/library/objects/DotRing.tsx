// DotRing (object, build): scattered dots fly on arcs to their places on a ring, growing as they fly; the ring turns
// slowly, the dots stretch into dashes, the dashes lengthen until the ring closes, the ring floods with colour segment
// by segment, and a light runs round it while a short label types in its middle.
// Numbers: flights 12 f each, started 0-4 f apart, the dots from 0.8 % to 4 % of the short side; ring radius 36 % of the short side, turning 2
// degrees a frame; dashes from 23 f, closed at 30 f (the stroke 4 to 5 % of the short side); a pale tint at 29 f, the colour
// floods segment by segment 30-33 f; the light runs once round in 20 f from 34 f; the label (7.5 % of the short side, a word that
// fills the ring's middle) types a letter a frame from 26 f.
// Caution: the scattered dots should come from something on screen (the tips of lines, points of a map); the ring is a
// moment of connection, one in a film.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { mixColor } from '../../type';
import { fonts } from '../../fonts';
import { rnd } from './_shared';

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} A${r} ${r} 0 ${large} 1 ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}`;
};

export const DotRing: React.FC<{
  at?: number;
  /** How many dots. */
  count?: number;
  /** Where the dots start, in px (default: seeded across the frame). */
  from?: Array<{ x: number; y: number }>;
  /** The dots' colour, the flood and the running light. */
  dot?: string;
  color?: string;
  light?: string;
  /** Fill inside the ring once it closes (the ground's colour by default: none). */
  disc?: string;
  /** A short word that types inside the ring. */
  label?: string;
  labelColor?: string;
  /** Ring radius as a share of the short side. */
  radius?: number;
  seed?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, count = 7, from, dot = '#FFFFFF', color = '#2457F5', light = '#7FD8FA', disc, label, labelColor = '#FFFFFF', radius = 0.36, seed = 4, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const R = radius * Math.min(W, H);
  const rot = (t * 2 * Math.PI) / 180 - Math.PI / 2;
  const slot = (i: number) => rot + (i / count) * Math.PI * 2;
  const close = ease.inOut(clamp((t - 23) / 7));
  const stroke = mix(close, 0.04, 0.05) * Math.min(W, H);
  const tint = t >= 29 ? 1 : 0;
  const els: React.ReactNode[] = [];
  if (disc && t >= 25) els.push(<circle key="disc" cx={cx} cy={cy} r={R} fill={disc} opacity={clamp((t - 24) / 2)} />);
  if (t < 34) {
    for (let i = 0; i < count; i++) {
      const s0 = Math.floor(rnd(seed, i, 1) * 5);
      const p = ease.inOut(clamp((t - s0) / 12));
      if (t < 23) {
        const a = slot(i);
        const ex = cx + Math.cos(a) * R;
        const ey = cy + Math.sin(a) * R;
        const st = from?.[i] ?? { x: W * (0.08 + rnd(seed, i, 2) * 0.84), y: H * (0.08 + rnd(seed, i, 3) * 0.84) };
        // an arc: the control point pushed off the straight line, to the outside
        const mx = (st.x + ex) / 2;
        const my = (st.y + ey) / 2;
        const nx = -(ey - st.y);
        const ny = ex - st.x;
        const side = rnd(seed, i, 4) > 0.5 ? 0.35 : -0.35;
        const qx = mx + nx * side;
        const qy = my + ny * side;
        const px = (1 - p) * (1 - p) * st.x + 2 * (1 - p) * p * qx + p * p * ex;
        const py = (1 - p) * (1 - p) * st.y + 2 * (1 - p) * p * qy + p * p * ey;
        const d = mix(p, 0.008, 0.04) * Math.min(W, H);
        els.push(<circle key={i} cx={px} cy={py} r={d / 2} fill={dot} />);
      } else {
        // dashes: centred on the slot, growing to fill the gap
        const half = mix(close, 0.02 / radius, Math.PI / count + 0.002);
        const a = slot(i);
        const seg = t >= 30 + (i / count) * 4 ? 1 : 0;
        const c = seg ? color : tint ? mixColor(dot, color, 0.25) : dot;
        els.push(<path key={i} d={arcPath(cx, cy, R, a - half, a + half)} stroke={c} strokeWidth={stroke} strokeLinecap={close < 0.98 ? 'round' : 'butt'} fill="none" />);
      }
    }
  } else {
    els.push(<circle key="ring" cx={cx} cy={cy} r={R} stroke={color} strokeWidth={stroke} fill="none" />);
    // the running light: a head and a fading tail, once round in 20 f, then on round more slowly
    const head = rot + (ease.inOut(clamp((t - 34) / 20)) + Math.max(0, t - 54) / 60) * Math.PI * 2;
    for (let k = 0; k < 30; k++) {
      const a1 = head - k * 0.03;
      els.push(<path key={`l${k}`} d={arcPath(cx, cy, R, a1 - 0.034, a1)} stroke={light} strokeOpacity={(1 - k / 30) * 0.9} strokeWidth={stroke} fill="none" />);
    }
  }
  const typed = label && t >= 26 ? label.slice(0, Math.min(label.length, t - 25)) : '';
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {els}
      </svg>
      {typed && (
        <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)', fontFamily: fonts.inter, fontSize: Math.min(W, H) * 0.075, fontWeight: 560, color: labelColor, letterSpacing: '-0.03em', whiteSpace: 'pre' }}>
          <span>{typed}</span>
          <span style={{ visibility: 'hidden' }}>{label!.slice(typed.length)}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
