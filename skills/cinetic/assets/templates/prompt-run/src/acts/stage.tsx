// What every act of the demo shares: the cool page, the absolute frame, the script's line inked by a front, the mark,
// and placement helpers. Retell it in the dealt direction's world (out/DIRECTION.md): its ground and type replace this
// floor; the product's own screens replace the kit parts (Composer, Bubble, StepList, Notice) the acts use.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { clipText, frontFill } from '../fx/HueSweep';
import { kitTheme } from '../kit';
import { E, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { fitSize, measureTracked } from '../lib/measure';
import { ACT, type ActName, f60x, H, inkFrames, W } from '../timeline';

/** The page: a cool tinted white (the stage the product's UI sits on). */
export const PAGE = kitTheme('tintedPaper', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/** The script's line: a light, wide line role (weight 400), never under 72 px. */
export const LINE = { size: 96, weight: 400, track: -0.012, lead: 1.15, min: 72 } as const;
export const lineSize = (text: string, share = 0.66) =>
  Math.max(LINE.min * U, Math.min(LINE.size * U, fitSize(text, (W - 2 * SAFE.x) * share, LINE.size * U, LINE.weight, LINE.track)));
export const lineWidth = (text: string, size: number, weight: number = LINE.weight) => measureTracked(text, size, weight, LINE.track, FONT.text, { trailing: false });
export const lineStyle = (size: number, weight: number = LINE.weight): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: size,
  fontWeight: weight,
  letterSpacing: `${LINE.track}em`,
  lineHeight: LINE.lead,
  whiteSpace: 'pre',
});

/**
 * A line inked by a front moving left to right in px (fx/HueSweep frontFill): behind the front the ink, ahead of it
 * the accent's tints fading to nothing, so the line is written rather than faded. `at` starts the front; it crosses
 * the line in inkFrames(text) frames (8 a word) on a front-loaded curve.
 */
export const Inked: React.FC<{ id: string; text: string; F: number; at: number; size: number; weight?: number; ink?: string; style?: React.CSSProperties }> = ({ id, text, F, at, size, weight, ink = PAGE.text, style }) => {
  if (F < at) return null;
  const w = lineWidth(text, size, weight);
  const front = (w + 320 * U) * prog(F, at, at + f60x(inkFrames(text)), E.snapOut) - 160 * U;
  const fill = frontFill({ front, ink, ramp: [[60 * U, PAGE.accent], [220 * U, mixColor(PAGE.accent, PAGE.ground, 0.55)], [320 * U, PAGE.ground]], dir: 'ltr' });
  return (
    <span data-text={id} style={{ ...lineStyle(size, weight), ...clipText(fill), ...style }}>
      {text}
    </span>
  );
};

/** The mark at `size` px, centred on (x, y), scaled `s`. */
export const MarkAt: React.FC<{ x: number; y: number; size: number; s?: number; o?: number }> = ({ x, y, size, s = 1, o = 1 }) => (
  <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) scale(${s.toFixed(5)})` }}>
    <LogoMark logo={LOGO} size={size} />
  </div>
);

/** The circ-out the measured moves use. */
export const circOut = (t: number) => Math.sqrt(1 - (1 - Math.min(1, Math.max(0, t))) ** 2);

export { H, W };
