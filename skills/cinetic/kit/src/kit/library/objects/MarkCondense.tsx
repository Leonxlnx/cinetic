// MarkCondense (logo, build): the mark's place is drawn first as a blueprint (a hairline tile, a construction circle
// with its centre point and four corner handles, in a tool blue); then the real mark condenses inside it out of a pale,
// mottled blur that darkens and sharpens; the blueprint fades once the mark has landed.
// Numbers: the blueprint draws on 0-6 f and holds; the mark from 8 f: blur 9 % of its size to 0 and brightness 1.9 to 1
// over 13 f (expo out), mottled on its first 8 f; the blueprint fades 22-30 f; hairlines 1.5 px.
// Caution: the mark must be the company's real one (`<Brand>` or the user's file); the blueprint stays quiet (one blue,
// thin), and the move wants a calm, light ground.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { useUid } from '../_shared';

export const MarkCondense: React.FC<{
  /** The mark, drawn centred in a `size` box. */
  mark: React.ReactNode;
  at?: number;
  /** The box's side in px (default 30 % of the short side). */
  size?: number;
  /** The blueprint's colour. */
  line?: string;
  /** Corner radius of the blueprint tile as a share of its side. */
  radius?: number;
  x?: number;
  y?: number;
}> = ({ mark, at = 0, size, line = '#3C8DF0', radius = 0.22, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('markcondense');
  if (f < at) return null;
  const t = f - at;
  const s = size ?? Math.min(W, H) * 0.3;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const draw = ease.out(clamp(t / 6));
  const fade = 1 - clamp((t - 22) / 8);
  const p = ease.out(clamp((t - 8) / 13));
  const mottle = clamp(1 - (t - 8) / 8);
  const per = 4 * s;
  const circ = Math.PI * s * 0.72;
  const hs = Math.max(5, s * 0.035);
  return (
    <AbsoluteFill>
      {t >= 8 && (
        <div
          style={{
            position: 'absolute',
            left: cx - s / 2,
            top: cy - s / 2,
            width: s,
            height: s,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: mix(p, 0.3, 1),
            filter: `${mottle > 0 ? `url(#${id}) ` : ''}blur(${(mix(p, 0.09, 0) * s).toFixed(1)}px) brightness(${mix(p, 1.9, 1).toFixed(2)}) grayscale(${mix(p, 1, 0).toFixed(2)})`,
          }}
        >
          {mark}
        </div>
      )}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: fade }}>
        <defs>
          <filter id={id}>
            <feTurbulence type="fractalNoise" baseFrequency={0.035} numOctaves={2} seed={3} />
            <feDisplacementMap in="SourceGraphic" scale={s * 0.12 * mottle} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {fade > 0 && (
          <g fill="none" stroke={line} strokeWidth={1.5}>
            <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={radius * s} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
            <circle cx={cx} cy={cy} r={s * 0.36} strokeDasharray={circ * 2} strokeDashoffset={circ * 2 * (1 - draw)} transform={`rotate(-90 ${cx} ${cy})`} />
            <circle cx={cx} cy={cy} r={2.5} fill={line} opacity={draw} />
            {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy], i) => (
              <rect key={i} x={cx + (dx * s) / 2 - hs / 2} y={cy + (dy * s) / 2 - hs / 2} width={hs} height={hs} fill="#FFFFFF" opacity={clamp((t - 2 - i) / 2)} />
            ))}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
