// TrackOverlay (fx, idle / emphasis): motion tracking over a moving object: turning boxes, centre dots, live
// coordinates and dashed arcs between targets.
// Numbers: 1.8 px boxes, a 10 px dot, 24 px labels 1.5 lines above; arcs 1.6 px dashed 10/8 drawing in over 10 f.
// Caution: the target must move; tracking a still object looks like a template.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fonts } from '../../fonts';
import { ease } from '../../motion';
import { t01 } from '../_shared';

export type Tracked = { x: number; y: number; w: number; h: number; rot?: number };

/**
 * TrackOverlay: the look of motion tracking laid over a moving object: a thin box round each target (it turns with it),
 * a dot at its centre, the live coordinates above it (they count every frame), dashed arcs that draw between the
 * targets and sweep past them with arrowheads, and optional guide lines to the frame edges. Cut on, not faded.
 * Measured: 1.5 px boxes, a 10 px dot, 22-26 px labels 12 px above the box; arcs 1.5 px dashed 10/8, drawn over ~10 f.
 * `track(frame)` returns the targets on that frame (in px), so the overlay follows whatever moves.
 */
export const TrackOverlay: React.FC<{
  at: number;
  track: (frame: number) => Tracked[];
  /** Box and label colour. */
  color?: string;
  dot?: string;
  line?: string;
  labels?: boolean;
  arcs?: boolean;
  guides?: boolean;
  corners?: boolean;
  size?: number;
  leaveAt?: number;
}> = ({ at: start, track, color = '#FF3B4E', dot = '#FFB020', line = 'rgba(255,255,255,0.75)', labels = true, arcs = true, guides = false, corners = false, size = 24, leaveAt }) => {
  const frame = useCurrentFrame();
  if (frame < start || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const T = track(frame);
  const draw = ease.out(t01(frame, start, 10));
  // arcs: from each centre to the next, bowing down, plus one long sweep over the top with an arrowhead
  let arcPath = '';
  if (arcs && T.length > 1) {
    for (let i = 0; i < T.length - 1; i++) {
      const a = T[i], b = T[i + 1];
      const mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + Math.abs(b.x - a.x) * 0.35;
      arcPath += `M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}`;
    }
    const f0 = T[0], fl = T[T.length - 1];
    const top = Math.min(...T.map((t) => t.y - t.h / 2)) - 140;
    arcPath += `M${fl.x + fl.w * 0.8} ${fl.y - fl.h * 0.6}C${fl.x} ${top} ${f0.x} ${top} ${f0.x - f0.w * 1.2} ${f0.y - f0.h * 0.2}`;
    const bot = Math.max(...T.map((t) => t.y + t.h / 2)) + 160;
    arcPath += `M${f0.x - f0.w * 1.4} ${f0.y + f0.h * 0.3}C${f0.x} ${bot} ${fl.x} ${bot} ${fl.x + fl.w * 1.3} ${fl.y + fl.h * 0.1}`;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <marker id={`trk-arrow-${start}`} markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">
            <path d="M1 1L7 6L1 11" fill="none" stroke={line} strokeWidth="1.6" />
          </marker>
        </defs>
        {arcPath && <path d={arcPath} fill="none" stroke={line} strokeWidth={1.6} strokeDasharray="10 8" pathLength={1000} style={{ strokeDashoffset: 0 }} markerEnd={`url(#trk-arrow-${start})`} opacity={draw} />}
        {guides &&
          T.map((t, i) => (
            <g key={`g${i}`} stroke={color} strokeWidth={1} opacity={0.35}>
              <line x1={0} y1={t.y} x2={4000} y2={t.y} />
              <line x1={t.x} y1={0} x2={t.x} y2={3000} />
            </g>
          ))}
        {T.map((t, i) => {
          const tr = `translate(${t.x} ${t.y}) rotate(${t.rot ?? 0})`;
          const c = Math.min(t.w, t.h) * 0.22;
          return (
            <g key={i} transform={tr}>
              {corners ? (
                <path
                  d={`M${-t.w / 2} ${-t.h / 2 + c}V${-t.h / 2}H${-t.w / 2 + c}M${t.w / 2 - c} ${-t.h / 2}H${t.w / 2}V${-t.h / 2 + c}M${t.w / 2} ${t.h / 2 - c}V${t.h / 2}H${t.w / 2 - c}M${-t.w / 2 + c} ${t.h / 2}H${-t.w / 2}V${t.h / 2 - c}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                />
              ) : (
                <rect x={-t.w / 2} y={-t.h / 2} width={t.w} height={t.h} fill="none" stroke={color} strokeWidth={1.8} />
              )}
              <circle r={5} fill={dot} />
            </g>
          );
        })}
      </svg>
      {labels &&
        T.map((t, i) => (
          <div
            key={`l${i}`}
            style={{
              position: 'absolute',
              left: t.x - t.w / 2,
              top: t.y - t.h / 2 - size * 1.5,
              transformOrigin: `${t.w / 2}px ${t.h / 2 + size * 1.5}px`,
              transform: `rotate(${t.rot ?? 0}deg)`,
              fontFamily: fonts.inter,
              fontSize: size,
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              color: line,
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}
          >
            x: {Math.round(t.x)}&nbsp;&nbsp;y: {Math.round(t.y)}
          </div>
        ))}
    </AbsoluteFill>
  );
};
