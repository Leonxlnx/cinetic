// Pointer (ui, emphasis): a pointer that looks right: arcing, decelerating travel, a lifting shadow, a squash press
// and a soft ring.
// Numbers: arcs with bow 0.14 (at most 120 px) on cubic-bezier(0.3, 0.05, 0.12, 1); press 3 f to 0.84, back over 7 f;
// ring 20 f.
// Caution: the target must answer the press; keep it 56-80 px tall.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { at, clamp, ease, type Ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { bez, useUiFrame } from './_shared';

export type PointerKey = { f: number; x: number; y: number; curve?: Ease; /** The arc of the move arriving here (default the pointer's `bow`; 0 = straight, for a drag along a track). */ bow?: number };

/** Default travel: leaves briskly, decelerates long onto the target (the pointer "aims"). */
const aim: Ease = bez(0.3, 0.05, 0.12, 1);

/** Where the pointer is on a frame: an arc between keys (bowed to one side, never a straight line), and its speed. */
export const pointerAt = (frame: number, keys: PointerKey[], bow = 0.14) => {
  if (frame <= keys[0].f) return { x: keys[0].x, y: keys[0].y, vx: 0, vy: 0 };
  const pos = (fr: number) => {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (fr <= b.f) {
        const p = (b.curve ?? aim)(clamp((fr - a.f) / Math.max(1, b.f - a.f)));
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.sin(p * Math.PI) * Math.min(120, len * (b.bow ?? bow));
        return { x: mix(p, a.x, b.x) + (dy / len) * k, y: mix(p, a.y, b.y) - (dx / len) * k };
      }
    }
    const l = keys[keys.length - 1];
    return { x: l.x, y: l.y };
  };
  const a = pos(frame);
  const b = pos(frame - 1);
  return { ...a, vx: a.x - b.x, vy: a.y - b.y };
};

/** The press of a pointer at `c`: 0..1, in over 3 frames, springing back over 6. */
export const pressOf = (frame: number, clicks: number[]) => {
  let p = 0;
  for (const c of clicks) p = Math.max(p, at(frame, c - 3, 3, ease.out) - at(frame, c, 7, bez(0.3, 1.5, 0.5, 1)));
  return p;
};

/**
 * A pointer that looks right: a macOS-proportioned arrow (tip, straight left edge, notch, tail) in near-black with a
 * white outline a tenth of its height, a two-layer shadow that drifts away while it travels (it is lifted) and closes
 * when it lands, a lean of a few degrees into its travel, a 2 px idle drift at rest, a squash press (0.84) that springs
 * back, and a soft ring that blooms from the tip on each click. `size` is its height in px.
 */
export const Pointer: React.FC<{
  keys: PointerKey[];
  clicks?: number[];
  size?: number;
  /** The frame it appears (default: its first key). */
  start?: number;
  /** The common name for `start`. */
  at?: number;
  /** Frame it leaves (accelerating down-right, 12 frames). */
  exitAt?: number;
  color?: string;
  outline?: string;
  ring?: string | false;
  hand?: boolean;
  bow?: number;
}> = ({ keys, clicks = [], size = 64, start: startIn, at: atIn, exitAt, color = '#111216', outline = '#FFFFFF', ring = '#8FB0FF', hand = false, bow = 0.14 }) => {
  const start = startIn ?? atIn ?? keys[0].f;
  const frame = useUiFrame();
  if (frame < start) return null;
  if (exitAt !== undefined && frame > exitAt + 14) return null;
  const k = pointerAt(frame, keys, bow);
  const v = Math.hypot(k.vx, k.vy);
  const rest = clamp(1 - v / 3);
  const x = k.x + Math.sin(frame / 13) * 1.6 * rest;
  const y = k.y + Math.cos(frame / 17) * 1.2 * rest;
  const lean = clamp(k.vx / 40, -1, 1) * 7;
  const press = pressOf(frame, clicks);
  const appear = at(frame, start, 6, ease.out);
  const out = exitAt !== undefined ? at(frame, exitAt, 14, ease.in) : 0;
  const lift = Math.min(1, v / 25);
  const s = size / 24;
  const rings = ring
    ? clicks
        .filter((c) => frame >= c && frame < c + 22)
        .map((c) => {
          const q = at(frame, c, 20, ease.out);
          const r = mix(q, size * 0.25, size * 1.5);
          return (
            <div
              key={c}
              style={{
                position: 'absolute',
                left: k.x - r,
                top: k.y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: r,
                border: `${mix(q, size * 0.14, size * 0.03)}px solid ${ring}`,
                opacity: (1 - q) * 0.55,
                filter: `blur(${mix(q, 1, 5)}px)`,
                pointerEvents: 'none',
              }}
            />
          );
        })
    : null;
  const path = hand ? HAND : ARROW;
  return (
    <>
      {rings}
      <div
        style={{
          position: 'absolute',
          left: x + out * 520 - 3.2 * s,
          top: y + out * 380 - 2 * s,
          width: size,
          height: size,
          transformOrigin: `${3.2 * s}px ${2 * s}px`,
          transform: `rotate(${lean}deg) scale(${mix(appear, 0.7, 1) * (1 - press * 0.16)})`,
          opacity: appear * (1 - out),
          filter: `drop-shadow(0 ${mix(lift, 1.5, 7) * s * 0.5}px ${mix(lift, 1.5, 4) * s * 0.5}px rgba(0,0,0,${mix(lift, 0.28, 0.16)})) drop-shadow(0 ${mix(lift, 4, 14) * s * 0.5}px ${mix(lift, 6, 14) * s * 0.5}px rgba(0,0,0,${mix(lift, 0.16, 0.1)}))`,
          zIndex: 200,
          pointerEvents: 'none',
        }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`ptr${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor={mixColor(color, '#FFFFFF', 0.16)} />
              <stop offset="1" stopColor={color} />
            </linearGradient>
          </defs>
          <path d={path} fill={`url(#ptr${color.replace(/[^a-zA-Z0-9]/g, "")})`} stroke={outline} strokeWidth={1.7} strokeLinejoin="round" paintOrder="stroke" />
        </svg>
      </div>
    </>
  );
};

// tip at (3.2, 2): a straight left edge, a notch, a tail at the angle of the real arrow
const ARROW = 'M3.2 2 L3.2 19.1 L7.25 15.3 L10.1 21.6 L12.75 20.45 L9.95 14.25 L15.4 14.25 Z';

const HAND =
  'M8.2 2.6 C8.2 1.6 10.2 1.6 10.2 2.6 L10.2 9.6 L10.4 9.6 L10.4 8.2 C10.4 7.2 12.3 7.2 12.3 8.2 L12.3 9.8 L12.5 9.8 L12.5 8.8 C12.5 7.8 14.4 7.8 14.4 8.8 L14.4 10.3 L14.6 10.3 L14.6 9.7 C14.6 8.7 16.4 8.7 16.4 9.7 L16.4 15.2 C16.4 18.6 14.6 21.2 11.6 21.2 L10.6 21.2 C8.6 21.2 7.5 20.2 6.4 18.6 L3.6 14.4 C3.1 13.6 4.2 12.5 5.1 13.2 L8.2 15.6 Z';
