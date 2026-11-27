// GlyphSheen (fx, emphasis): light passing through letters: a soft bright band, clipped to the glyphs themselves, crosses
// a large word once, left to right, the letter under it brightening nearly to white; a fainter second highlight rides a
// letter behind.
// Numbers: 24-28 f for a four-letter word set 60 % of the frame high (about 7 f a letter), close to linear; the band 22 %
// of the word wide, the second at 40 % strength 12 % behind, both bell-shaped (no crest line); the word's own fill
// unchanged elsewhere. On a dark word (near-black ink) the light peaks at 40 % and the band is 1.5 times as wide.
// Caution: once, on the word that is the payoff (a name, a mark); on small type it reads as a flicker. It is made for
// a coloured or light word on a dark ground; on dark ink over a light ground it stays a soft lift (`strength`).
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fonts } from '../../fonts';
import { ease, mix } from '../../motion';
import { t01 } from '../_shared';

/** Rough luminance 0..1 of a #rgb / #rrggbb colour (anything else counts as mid). */
const luma = (c: string) => {
  const m = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 0.5;
  const s = m[1].length === 3 ? m[1].split('').map((d) => d + d).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

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
  /**
   * Peak strength of the light (0..1). Default: 0.95 on a coloured or light word; 0.4 on a dark word (a near-black ink on
   * a light ground), where a band brightening to white would cut the letter in two and read as a broken glyph.
   */
  strength?: number;
}> = ({ text, at, dur = 26, fill = '#2E3550', light = '#FFFFFF', band = 0.22, echo = 0.4, size = 300, style, strength }) => {
  const frame = useCurrentFrame();
  const t = t01(frame, at, dur);
  const on = frame >= at && frame < at + dur;
  const dark = !fill.includes('gradient(') && luma(fill) < 0.22;
  const peak = strength ?? (dark ? 0.4 : 0.95);
  // a dark word takes a wider, softer band: a narrow bright one on dark ink reads as a metal edge
  const bw = dark && strength === undefined ? band * 1.5 : band;
  // the band centre travels from before the first letter to past the last, nearly linear
  const c = mix(0.25 * ease.soft(t) + 0.75 * t, -bw, 1 + bw) * 100;
  const h = (bw / 2) * 100;
  const e = c - 12;
  // a smooth (bell-shaped) profile sampled finely, never a triangle: no hard crest line inside the letter
  const bell = (x: number, mid: number, half: number) => Math.exp(-(((x - mid) / (half * 0.5)) ** 2));
  const white = (a: number) => `rgba(255,255,255,${a.toFixed(3)})`;
  const tinted = (a: number) => `color-mix(in srgb, ${light} ${Math.round(a * 100)}%, transparent)`;
  const col = light.toLowerCase() === '#ffffff' ? white : tinted;
  const stops: string[] = [];
  const lo = e - h * 1.2;
  const hi = c + h * 1.2;
  for (let i = 0; i <= 24; i++) {
    const xx = lo + ((hi - lo) * i) / 24;
    const a = Math.min(1, peak * bell(xx, c, h) + (echo > 0 ? peak * echo * 0.9 * bell(xx, e, h * 0.7) : 0));
    stops.push(`${col(a)} ${xx.toFixed(2)}%`);
  }
  const sheen = `linear-gradient(90deg, ${stops.join(', ')})`;
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
