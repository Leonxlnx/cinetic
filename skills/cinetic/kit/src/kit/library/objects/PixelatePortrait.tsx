// PixelatePortrait (object / logo, join / build): a full-frame photograph breaks into coarse blocks and cuts to a dark
// ground where the mark stands as a coarse one-bit pixel figure, which then sharpens in held resolution steps (grey
// in-between cells at each step) until it is fine.
// Numbers: the photo 1 f, its mosaic (blocks 2.5 % of W) 1 f, then the mark at 10 cells across its height for 3 f, 16
// cells for 2 f, 26 cells for 1 f and 36 cells from then on; at the middle steps cells half covered show grey.
// Caution: the mark is any closed outline (an SVG path in a 100 x 100 box) or a function of (x, y) in 0..1; a mark too
// thin to survive 10 cells reads as noise on its first frames.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { PixelFilter, useUid } from '../_shared';
import { srcOf } from './_shared';

/** The default mark: a paper dart (an invented shape). */
export const DART = 'M4 52 L96 8 L66 94 L50 64 L80 22 L40 58 Z';

const cover = (d: string) => {
  if (typeof document === 'undefined') return () => false;
  const ctx = document.createElement('canvas').getContext('2d');
  const p = new Path2D(d);
  return (x: number, y: number) => (ctx ? ctx.isPointInPath(p, x * 100, y * 100, 'evenodd') : false);
};

export const PixelatePortrait: React.FC<{
  /** The photograph it starts from (a public path or URL). */
  src: string;
  at?: number;
  /** The mark: an SVG path in a 100 x 100 box. */
  shape?: string;
  color?: string;
  ground?: string;
  /** The mark's height as a share of H. */
  size?: number;
  x?: number;
  y?: number;
}> = ({ src, at = 0, shape = DART, color = '#FFFFFF', ground = '#15110D', size = 0.5, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('pxportrait');
  const inside = React.useMemo(() => cover(shape), [shape]);
  if (f < at) return null;
  const t = f - at;
  if (t < 2) {
    return (
      <AbsoluteFill style={{ background: ground }}>
        {t === 1 && <PixelFilter id={id} step={Math.round(W * 0.025)} />}
        <Img src={srcOf(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: t === 1 ? `url(#${id})` : undefined }} />
      </AbsoluteFill>
    );
  }
  const n = t < 5 ? 10 : t < 7 ? 16 : t < 8 ? 26 : 36;
  const grey = t >= 5 && t < 8;
  const side = size * H;
  const c = side / n;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const cells: React.ReactNode[] = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      // four samples a cell: all in or the centre in -> on; one or two -> grey at the middle steps
      const s = [inside((i + 0.25) / n, (j + 0.25) / n), inside((i + 0.75) / n, (j + 0.25) / n), inside((i + 0.25) / n, (j + 0.75) / n), inside((i + 0.75) / n, (j + 0.75) / n)].filter(Boolean).length;
      const on = s >= 3 || (s >= 2 && inside((i + 0.5) / n, (j + 0.5) / n));
      if (!on && !(grey && s >= 1)) continue;
      cells.push(<div key={`${i}-${j}`} style={{ position: 'absolute', left: cx - side / 2 + i * c, top: cy - side / 2 + j * c, width: c + 0.4, height: c + 0.4, background: color, opacity: on ? 1 : 0.45 }} />);
    }
  return <AbsoluteFill style={{ background: ground }}>{cells}</AbsoluteFill>;
};
