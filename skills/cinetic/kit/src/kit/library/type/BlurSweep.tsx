// BlurSweep (type, enter): a line comes into focus left to right, each letter sharpening from a heavy blur inside a
// soft front.
// Numbers: 0.8 letters a frame, a soft front 7 letters wide, 14 px of blur.
// Caution: one per film; it is slow by nature (a 30-letter line takes about 45 frames).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { clamp, ease } from '../../motion';
import { absCentre } from './_shared';

/**
 * BlurSweep: a line that comes into focus from left to right, a soft front a few letters wide in which each letter
 * sharpens from a heavy blur and fades up. Calm, for a message, a quote, a line that should feel spoken.
 */
export const BlurSweep: React.FC<{
  text: string;
  at?: number;
  /** Letters per frame the front travels (default 0.8). */
  speed?: number;
  /** Width of the soft front in letters (default 7). */
  soft?: number;
  blur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ text, at = 0, speed = 0.8, soft = 7, blur = 14, size = 96, color = '#141414', x, y, font = fonts.inter, weight = 500, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const front = (frame - at) * speed;
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.015em', whiteSpace: 'pre', lineHeight: 1.1, ...style }}>
      {Array.from(text).map((ch, i) => {
        const p = ease.out(clamp((front - i) / soft));
        return (
          <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: clamp(p * 1.4), filter: p < 0.99 ? `blur(${(1 - p) * blur}px)` : undefined, transform: `translateX(${(1 - p) * 0.08}em)` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};
