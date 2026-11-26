// GlyphSheen (fx, emphasis): light passing through letters: a soft bright band, clipped to the glyphs themselves, crosses
// a large word once, left to right, the letter under it brightening nearly to white; a fainter second highlight rides a
// letter behind.
// Numbers: 24-28 f for a four-letter word set 60 % of the frame high (about 7 f a letter), close to linear; the band 22 %
// of the word wide, the second at 40 % strength 12 % behind; the word's own fill unchanged elsewhere.
// Caution: once, on the word that is the payoff (a name, a mark); on small type it reads as a flicker.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';

/**
 * GlyphSheen: `text` drawn in `fill` (a colour or a CSS gradient), with the sheen (`light`) laid over it clipped to the
 * same glyphs, crossing from `at` in `dur` frames. `style` sets the type (font, size, weight, tracking).
 */
export const GlyphSheen: React.FC<{
  text: string;
  at: number;
  dur?: number;
  /** The word's own fill: a colour or a CSS gradient. */
  fill?: string;
  light?: string;
  /** Band width as a share of the word. */
  band?: number;
  /** Strength of the trailing highlight (0: none). */
  echo?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ text, at, dur = 26, fill = '#2E3550', light = '#FFFFFF', band = 0.22, echo = 0.4, size = 300, style }) => {
  const frame = useCurrentFrame();
  const t = t01(frame, at, dur);
  const on = frame >= at && frame < at + dur;
  // the band centre travels from before the first letter to past the last, nearly linear
  const c = mix(0.25 * ease.soft(t) + 0.75 * t, -band, 1 + band) * 100;
  const h = (band / 2) * 100;
  const e = c - 12;
  const alpha = (a: number) => `rgba(255,255,255,${a})`;
  const sheen =
    light.toLowerCase() === '#ffffff'
      ? `linear-gradient(90deg, ${alpha(0)} ${e - h}%, ${alpha(echo * 0.9)} ${e}%, ${alpha(0)} ${e + h * 0.6}%, ${alpha(0)} ${c - h}%, ${alpha(0.95)} ${c}%, ${alpha(0)} ${c + h}%)`
      : `linear-gradient(90deg, transparent ${c - h}%, ${light} ${c}%, transparent ${c + h}%)`;
  const type: React.CSSProperties = { fontFamily: fonts.inter, fontSize: size, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'pre', ...style };
  const clip = (bg: string): React.CSSProperties => ({ backgroundImage: bg, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' });
  const isGradient = fill.includes('gradient(');
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ ...type, ...(isGradient ? clip(fill) : { color: fill }) }}>{text}</span>
      {on && (
        <span aria-hidden style={{ ...type, ...clip(sheen), position: 'absolute', left: 0, top: 0, mixBlendMode: 'screen' }}>
          {text}
        </span>
      )}
    </span>
  );
};
