// BlobKnock (fx, emphasis): a soft-edged colour blob slides in under a bold line from one side and settles beneath
// it; as it settles the whole line turns white at once, so the words read through the colour and no letter is ever
// split between two colours.
// Numbers: the blob two lobes sized from the line's own box (the main lobe 8 % wider than the line on each side and
// 0.55 / 0.7 of the type size above and below it, a smaller lobe trailing high on the right), its edge softened 0.8 %
// of the frame height; it travels from `from` to `to` (shares of the width) in 10 f on an expo-out and keeps drifting
// 1 px a frame; the line turns from `ink` to `knock` over the last part of the travel (from 75 % to 95 % of it), as one
// piece; the line in the blob's own colour by default.
// Caution: one line, set bold and large (6 % of the frame height or more); the blob is the line's colour or a dark ink,
// not a second hue.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, mix } from '../../motion';
import { fonts } from '../../fonts';

/**
 * BlobKnock: `text` centred at (`x`, `y`) in `ink`; from `at` the blob (`color`) slides from `from` to `to` (shares of
 * the frame width, its centre) over `dur` frames under it, and as it settles the whole line turns `knock`.
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
  // the blob's centre, as an offset from the line's centre: it settles at `to` (so 2 % right of the middle by default)
  const dx = mix(p, from, to) * W - Math.max(0, frame - at - dur) * 1 - cx;
  const k = on ? clamp((p - 0.75) / 0.2) : 0;
  const tone = interpolateColors(k, [0, 1], [ink ?? color, knock]);
  const lobe = (l: React.CSSProperties) => <div style={{ position: 'absolute', borderRadius: '50%', background: color, ...l }} />;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)' }}>
        {on && (
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${dx}px)`, filter: `blur(${H * 0.008}px)`, opacity: clamp((frame - at + 1) / 3) }}>
            {lobe({ left: '-8%', right: '-8%', top: -S * 0.55, bottom: -S * 0.7 })}
            {lobe({ left: '58%', right: '-14%', top: -S * 0.95, height: S * 1.3 })}
          </div>
        )}
        <div style={{ position: 'relative', fontFamily: fonts.inter, fontSize: S, fontWeight: 620, letterSpacing: '-0.03em', whiteSpace: 'pre', color: tone, ...style }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};
