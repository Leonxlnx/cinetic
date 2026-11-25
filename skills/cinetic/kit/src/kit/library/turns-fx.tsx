// Motion library: finishing effects. The layers that make a frame rich: light crossing a surface, a soft bloom, a tracking
// overlay that follows an object, a dot screen, a channel split on an impact, and one rounded shape that becomes the next.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { clamp, ease, mix, type Ease } from '../motion';
import { mixLab } from '../world';
import { fonts } from '../fonts';
import { SplitFilter, type TurnBox } from './turns-cuts';

const useUid = (p: string) => p + React.useId().replace(/[^a-zA-Z0-9]/g, '');
/** Progress of a move that starts ON frame a and lands ON frame a + d - 1. */
const t01 = (f: number, a: number, d: number) => clamp((f - a + 1) / Math.max(1, d));

// ---------------------------------------------------------------------------------------------------------------------
/**
 * LightSweep: a band of light crosses a surface once, a broad soft glow with a thin hot line at its leading edge, clipped
 * to the surface's own rounded box. Put it on a card, a button, a glass panel, a word set large.
 * Measured: 8-12 f, travel on ease in-out, the band ~35 % of the surface wide, tilted ~18 deg.
 */
export const LightSweep: React.FC<{
  at: number;
  dur?: number;
  w: number;
  h: number;
  radius?: number;
  angle?: number;
  color?: string;
  strength?: number;
  /** Band width as a share of the surface. */
  width?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at: start, dur = 12, w, h, radius = 0, angle = 18, color = '#FFFFFF', strength = 0.75, width = 0.35, blend = 'screen', children, style }) => {
  const frame = useCurrentFrame();
  const t = t01(frame, start, dur);
  const on = frame >= start && frame <= start + dur;
  const span = w + h * Math.tan((angle * Math.PI) / 180);
  const bw = span * width;
  const x = mix(ease.inOut(t), -bw - h * Math.tan((angle * Math.PI) / 180), w + bw * 0.2);
  return (
    <div style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', ...style }}>
      {children}
      {on && (
        <div style={{ position: 'absolute', top: -h * 0.5, left: x, width: bw, height: h * 2, transform: `skewX(${-angle}deg)`, mixBlendMode: blend, pointerEvents: 'none', opacity: strength }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${color}00 0%, ${color}33 30%, ${color}AA 78%, ${color} 90%, ${color}00 100%)` }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '90%', width: Math.max(2, bw * 0.02), background: color, filter: 'blur(1px)' }} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * Bloom: light that spills in its own colour. A blurred copy of the content added on top (screen), so bright parts glow
 * and dark parts do nothing; `pulse` swells it once (a hit, a reveal).
 * Measured: blur 18-40 px at 30-45 %; a pulse to ~2x strength over 3 f, back over 12 f.
 */
export const Bloom: React.FC<{ radius?: number; strength?: number; pulse?: { at: number; up?: number; down?: number; gain?: number }; children: React.ReactNode; style?: React.CSSProperties }> = ({
  radius = 28,
  strength = 0.4,
  pulse,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  let k = 1;
  if (pulse) {
    const up = at01(frame, pulse.at, pulse.up ?? 3);
    const down = at01(frame, pulse.at + (pulse.up ?? 3), pulse.down ?? 12);
    k = 1 + ((pulse.gain ?? 2) - 1) * (ease.out(up) - ease.inOut(down));
  }
  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${radius}px)`, opacity: clamp(strength * k), mixBlendMode: 'screen', pointerEvents: 'none' }}>{children}</div>
    </div>
  );
};
const at01 = (f: number, a: number, d: number) => clamp((f - a) / Math.max(1, d));

// ---------------------------------------------------------------------------------------------------------------------
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
  const els: React.ReactNode[] = [];
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

// ---------------------------------------------------------------------------------------------------------------------
/**
 * DotScreen: the content seen through a grid of round dots, an LED board or a coarse halftone; unlit dots can show
 * faintly so the grid reads on dark. `amount` blends it with the plain content (key it on for a few frames, or hold it).
 * Measured: an 11-16 px pitch, dots ~0.8 of the pitch; unlit dots ~10 % on black.
 */
export const DotScreen: React.FC<{
  pitch?: number;
  dot?: number;
  amount?: number;
  /** The colour of unlit dots ('' for none). */
  off?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ pitch = 14, dot = 0.8, amount = 1, off = 'rgba(255,255,255,0.09)', children, style }) => {
  const r = (pitch * dot) / 2;
  const mask = `radial-gradient(circle at ${pitch / 2}px ${pitch / 2}px, #000 ${r - 0.6}px, transparent ${r + 0.6}px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {amount < 1 && <div style={{ position: 'absolute', inset: 0, opacity: 1 - amount }}>{children}</div>}
      {off && amount > 0 && <div style={{ position: 'absolute', inset: 0, opacity: amount, backgroundImage: mask.replace('#000', off), backgroundSize: `${pitch}px ${pitch}px` }} />}
      {amount > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: amount, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: `${pitch}px ${pitch}px`, maskSize: `${pitch}px ${pitch}px` }}>{children}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * ChromaHit: on an impact the channels split for two frames and snap back, with a small push. Wrap the thing that lands
 * (a word, a mark, the whole frame).
 * Measured: 2 f at ~10 px then ~5 px, 0 on the third. No push, no shake: the object's own landing does the moving.
 */
export const ChromaHit: React.FC<{ at: number; px?: number; frames?: number; angle?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at: start,
  px = 10,
  frames = 2,
  angle = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const uid = useUid('ch');
  const i = frame - start;
  const d = i >= 0 && i < frames ? px * (1 - i / frames / 2) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {d > 0 && <SplitFilter id={`${uid}${i}`} d={d} angle={angle} />}
      <div style={{ position: 'absolute', inset: 0, filter: d > 0 ? `url(#${uid}${i})` : undefined }}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
export type MorphStage = { at: number; box: TurnBox; color: string; content?: React.ReactNode; dur?: number; curve?: Ease };

/**
 * MorphBox: one rounded shape that becomes the next (a pill, a card, a window) with no pop: position, size, radius and
 * colour interpolate together, and each stage's colour and content wipe in left to right behind a soft lead edge while
 * the old content clears in the first frames. Content is laid out at the stage's own size, top-left anchored.
 * Measured: 8-14 f per stage on a soft out curve; the colour wipe trails the size by ~2 f; old content gone in ~3 f.
 */
export const MorphBox: React.FC<{ stages: MorphStage[]; shadow?: string; wipe?: boolean }> = ({ stages, shadow, wipe = true }) => {
  const frame = useCurrentFrame();
  if (!stages.length || frame < stages[0].at) return null;
  let k = 0;
  while (k < stages.length - 1 && frame >= stages[k + 1].at) k++;
  const cur = stages[k];
  const prev = k > 0 ? stages[k - 1] : null;
  const dur = cur.dur ?? 12;
  const t = prev ? t01(frame, cur.at, dur) : 1;
  const p = (cur.curve ?? ease.soft)(t);
  const A = prev ? prev.box : cur.box;
  const B = cur.box;
  const x = mix(p, A.x, B.x), y = mix(p, A.y, B.y), w = mix(p, A.w, B.w), h = mix(p, A.h, B.h), r = mix(p, A.r ?? 0, B.r ?? 0);
  // the wipe trails the size a little and finishes at 70 % of the stage, so no soft band lingers on the far edge
  const q = prev ? ease.inOut(clamp((t - 0.08) / 0.62)) : 1;
  const lead = 22;
  const edge = mix(q, -lead, 100 + lead);
  const wipeMask = `linear-gradient(90deg, #000 ${edge - lead}%, transparent ${edge}%)`;
  const bg = prev && !wipe ? mixLab(prev.color, cur.color, q) : cur.color;
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, overflow: 'hidden', boxShadow: shadow, background: prev && wipe ? prev.color : bg }}>
      {prev && wipe && q < 1 && <div style={{ position: 'absolute', inset: 0, background: cur.color, WebkitMaskImage: wipeMask, maskImage: wipeMask }} />}
      {prev && wipe && q >= 1 && <div style={{ position: 'absolute', inset: 0, background: cur.color }} />}
      {prev?.content && t < 0.35 && <div style={{ position: 'absolute', left: 0, top: 0, width: A.w, height: A.h, opacity: 1 - clamp(t / 0.25) }}>{prev.content}</div>}
      {cur.content && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: B.w, height: B.h, WebkitMaskImage: q < 1 ? wipeMask : undefined, maskImage: q < 1 ? wipeMask : undefined }}>{cur.content}</div>
      )}
    </div>
  );
};
