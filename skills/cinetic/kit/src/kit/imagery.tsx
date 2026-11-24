// Pictures with intent: one grade for every image in the film, a develop from duotone to true colour, letters that are
// windows onto a picture, and a before/after wipe. Files live in public/ (the user's, or licensed and credited).
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { at, clamp, ease, mix } from './motion';

export type Grade = {
  /** Shadows and highlights of the duotone the picture develops from (and returns to as "background"). */
  dark: string;
  light: string;
  /** Final look: CSS filter applied to every picture so thirty pictures look like one shoot. */
  look?: string;
};

const hexRgb = (h: string) => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** An SVG duotone filter: luminance mapped between two colours. Render once per id inside the picture. */
const Duotone: React.FC<{ id: string; dark: string; light: string }> = ({ id, dark, light }) => {
  const a = hexRgb(dark);
  const b = hexRgb(light);
  const row = (i: number) => `${(b[i] - a[i]) * 0.2126} ${(b[i] - a[i]) * 0.7152} ${(b[i] - a[i]) * 0.0722} 0 ${a[i]}`;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={`${row(0)} ${row(1)} ${row(2)} 0 0 0 1 0`} />
      </filter>
    </svg>
  );
};

/**
 * A picture that covers its box. `develop` (0..1) cross-fades it from the grade's duotone to true colour, the way
 * a generated or found picture "arrives"; omit it for a plain graded picture. `pan` drifts the crop (Ken Burns, slow).
 */
export const Photo: React.FC<{
  src: string;
  w: number;
  h: number;
  grade?: Grade;
  develop?: number;
  /** Slow drift of the crop: scale from 1 to 1 + zoom over the shot, with an x/y pan in px. */
  zoom?: number;
  panX?: number;
  panY?: number;
  start?: number;
  dur?: number;
  radius?: number;
  style?: React.CSSProperties;
  position?: string;
}> = ({ src, w, h, grade, develop = 1, zoom = 0.06, panX = 0, panY = 0, start = 0, dur = 120, radius = 0, style, position = '50% 50%' }) => {
  const frame = useCurrentFrame();
  const id = `duo${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = at(frame, start, dur, ease.glide);
  const img = (filter?: string, opacity = 1) => (
    <Img
      src={src.startsWith('http') ? src : staticFile(src)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: position,
        transform: `scale(${1 + zoom * p}) translate(${panX * p}px, ${panY * p}px)`,
        filter,
        opacity,
      }}
    />
  );
  return (
    <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden', borderRadius: radius, ...style }}>
      {grade && develop < 1 && <Duotone id={id} dark={grade.dark} light={grade.light} />}
      {grade && develop < 1 && img(`url(#${id})`)}
      {img(grade?.look, develop)}
    </div>
  );
};

/**
 * Type as a window: the letters are holes onto a picture (background-clip: text). Big, heavy faces work best.
 * `reveal` (0..1) slides the picture up inside the letters.
 */
export const TextWindow: React.FC<{ text: string; src: string; style?: React.CSSProperties; reveal?: number; zoom?: number; position?: string; panX?: number; panY?: number }> = ({
  text,
  src,
  style,
  reveal = 1,
  zoom = 1,
  position = '50% 50%',
  /** Pan the picture inside the letters by px (position is relative to the text box, so it moves little). */
  panX = 0,
  panY = 0,
}) => (
  <div
    style={{
      backgroundImage: `url(${src.startsWith('http') ? src : staticFile(src)})`,
      backgroundSize: `${zoom * 100}% auto`,
      backgroundPosition: panX || panY ? `calc(${position.split(' ')[0]} + ${panX}px) calc(${position.split(' ')[1] ?? '50%'} + ${panY}px)` : position,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      clipPath: `inset(${mix(reveal, 100, 0)}% 0 0 0)`,
      lineHeight: 0.95,
      ...style,
    }}
  >
    {text}
  </div>
);

/**
 * Before/after: `before` and `after` stacked, a divider at `split` (0..1 of the width) with a handle. `dividerLabel`
 * rides the divider as it moves: one node centred on the line (a year), or a pair set either side of it ("1998", "2024").
 */
export const Compare: React.FC<{
  before: React.ReactNode;
  after: React.ReactNode;
  split: number;
  w: number;
  h: number;
  line?: string;
  handle?: boolean;
  labels?: [string, string];
  labelStyle?: React.CSSProperties;
  /** A label riding the divider: one node on the line, or [left, right] either side of it. */
  dividerLabel?: React.ReactNode | [React.ReactNode, React.ReactNode];
  /** Where it rides, 0..1 of the height (default 0.86, below the handle). */
  dividerLabelY?: number;
  dividerLabelStyle?: React.CSSProperties;
}> = ({
  before,
  after,
  split,
  w,
  h,
  line = '#FFFFFF',
  handle = true,
  labels,
  labelStyle,
  dividerLabel,
  dividerLabelY = 0.86,
  dividerLabelStyle,
}) => {
  const x = clamp(split) * w;
  const pair = Array.isArray(dividerLabel) && dividerLabel.length === 2;
  const ly = clamp(dividerLabelY) * h;
  return (
    <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
      <AbsoluteFill>{before}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${x}px)` }}>{after}</AbsoluteFill>
      <div style={{ position: 'absolute', left: x - 1.5, top: 0, width: 3, height: h, background: line, boxShadow: '0 0 20px rgba(0,0,0,.35)' }} />
      {handle && (
        <div style={{ position: 'absolute', left: x - 26, top: h / 2 - 26, width: 52, height: 52, borderRadius: 26, background: line, boxShadow: '0 8px 24px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '9px solid #111' }} />
          <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '9px solid #111' }} />
        </div>
      )}
      {labels && (
        <>
          <div style={{ position: 'absolute', left: 24, top: 20, ...labelStyle }}>{labels[0]}</div>
          <div style={{ position: 'absolute', right: 24, top: 20, ...labelStyle }}>{labels[1]}</div>
        </>
      )}
      {dividerLabel !== undefined && dividerLabel !== null && (
        pair ? (
          <>
            <div style={{ position: 'absolute', right: w - x + 18, top: ly, transform: 'translateY(-50%)', whiteSpace: 'nowrap', ...dividerLabelStyle }}>{(dividerLabel as React.ReactNode[])[0]}</div>
            <div style={{ position: 'absolute', left: x + 18, top: ly, transform: 'translateY(-50%)', whiteSpace: 'nowrap', ...dividerLabelStyle }}>{(dividerLabel as React.ReactNode[])[1]}</div>
          </>
        ) : (
          <div style={{ position: 'absolute', left: x, top: ly, transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', ...dividerLabelStyle }}>{dividerLabel as React.ReactNode}</div>
        )
      )}
    </div>
  );
};

/**
 * A selection box with corner handles that draws itself around a region (marking what the product found). `labelAt`
 * places the label (default above, at the left corner); `handles="soft"` draws round handles with a light fill and a
 * thinner line, `"none"` the box alone.
 */
export const Selection: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  start: number;
  dur?: number;
  color?: string;
  label?: React.ReactNode;
  labelStyle?: React.CSSProperties;
  labelAt?: 'top-left' | 'top' | 'bottom-left' | 'bottom' | 'inside';
  handles?: 'square' | 'soft' | 'none';
}> = ({
  x,
  y,
  w,
  h,
  start,
  dur = 14,
  color = '#FFFFFF',
  label,
  labelStyle,
  labelAt = 'top-left',
  handles = 'square',
}) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.out);
  if (frame < start) return null;
  const cw = mix(p, 0, w);
  const ch = mix(p, 0, h);
  const soft = handles === 'soft';
  const hs = soft ? 14 : 12;
  const labelPos: React.CSSProperties =
    labelAt === 'top'
      ? { left: '50%', top: -44, transform: 'translateX(-50%)' }
      : labelAt === 'bottom-left'
        ? { left: -2, top: 'calc(100% + 10px)' }
        : labelAt === 'bottom'
          ? { left: '50%', top: 'calc(100% + 10px)', transform: 'translateX(-50%)' }
          : labelAt === 'inside'
            ? { left: 16, top: 12 }
            : { left: -2, top: -44 };
  return (
    <div style={{ position: 'absolute', left: x + (w - cw) / 2, top: y + (h - ch) / 2, width: cw, height: ch, border: `${soft ? 1.5 : 2}px solid ${color}`, borderRadius: soft ? 6 : 0, boxSizing: 'border-box' }}>
      {handles !== 'none' && [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([a, b], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: a ? undefined : -hs / 2,
            right: a ? -hs / 2 : undefined,
            top: b ? undefined : -hs / 2,
            bottom: b ? -hs / 2 : undefined,
            width: hs,
            height: hs,
            boxSizing: 'border-box',
            ...(soft ? { background: '#FFFFFF', border: `2px solid ${color}`, borderRadius: hs / 2, boxShadow: '0 1px 4px rgba(0,0,0,.18)' } : { background: color }),
            opacity: clamp(p * 2),
          }}
        />
      ))}
      {label && (
        <div style={{ position: 'absolute', ...labelPos, whiteSpace: 'nowrap', opacity: at(frame, start + dur * 0.6, 8), ...labelStyle }}>{label}</div>
      )}
    </div>
  );
};
