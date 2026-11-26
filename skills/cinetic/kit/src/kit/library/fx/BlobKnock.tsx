// BlobKnock (fx, emphasis): a heavily blurred colour blob slides in under a bold line from one side and settles beneath
// it; where the blob is dense the letters turn white, so the words read through the colour.
// Numbers: the blob two lobes, 30 % of the frame wide and 24 % high in all, centred a little under the line, blurred 3 %
// of the frame height; it travels 30 % of the width in 10 f on an expo-out and keeps drifting 1 px a frame; the line in
// the blob's own colour.
// Caution: one line, set bold and large (6 % of the frame height or more); the blob is the line's colour, not a second hue.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, mix } from '../../motion';
import { fonts } from '../../fonts';

/**
 * BlobKnock: `text` centred at (`x`, `y`) in `ink`; from `at` the blob (`color`) slides from `from` to `to` (shares of
 * the frame width, its centre) over `dur` frames under it, and the letters over its dense part turn `knock`.
 */
export const BlobKnock: React.FC<{
  text: string;
  at: number;
  dur?: number;
  from?: number;
  to?: number;
  color?: string;
  ink?: string;
  knock?: string;
  size?: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ text, at, dur = 10, from = 0.82, to = 0.52, color = '#2F4FE0', ink, knock = '#FFFFFF', size, x, y, style }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const S = size ?? Math.round(H * 0.075);
  const p = ease.out(clamp((frame - at) / dur));
  const on = frame >= at;
  const bx = mix(p, from, to) * W - Math.max(0, frame - at - dur) * 1;
  const by = cy + S * 0.3;
  const bw = W * 0.3;
  const bh = H * 0.24;
  // two lobes: a big one under the words and a smaller one trailing low behind it
  const lobes = [
    { x: bx - bw * 0.1, y: by, w: bw * 0.78, h: bh * 0.8 },
    { x: bx + bw * 0.24, y: by - bh * 0.2, w: bw * 0.5, h: bh * 0.56 },
  ];
  const blur = H * 0.03;
  const mask = lobes.map((l) => `radial-gradient(ellipse ${l.w * 0.5}px ${l.h * 0.46}px at ${l.x}px ${l.y}px, #000 70%, transparent 100%)`).join(', ');
  const line = (c: string) => (
    <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)', fontFamily: fonts.inter, fontSize: S, fontWeight: 620, letterSpacing: '-0.03em', whiteSpace: 'pre', color: c, ...style }}>{text}</div>
  );
  return (
    <AbsoluteFill>
      {on && (
        <AbsoluteFill style={{ filter: `blur(${blur}px)`, opacity: clamp((frame - at + 1) / 3) }}>
          {lobes.map((l, i) => (
            <div key={i} style={{ position: 'absolute', left: l.x - l.w / 2, top: l.y - l.h / 2, width: l.w, height: l.h, borderRadius: '50%', background: color }} />
          ))}
        </AbsoluteFill>
      )}
      {line(ink ?? color)}
      {on && <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{line(knock)}</AbsoluteFill>}
    </AbsoluteFill>
  );
};
