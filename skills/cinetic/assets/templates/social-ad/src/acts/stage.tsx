// What every act of the ad shares: the white page and the picture stage, the absolute frame, the ad's one line role
// (a neutral grotesk at a regular weight, ink, the newest word in the accent), the pictures as cards, the mark, and
// placement helpers. Retell it in the dealt direction's world (out/DIRECTION.md): its ground and type replace this
// floor; the ad's own pictures replace the kit's still life.
import React from 'react';
import { staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, SAFE, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { kitTheme, Photo, shadeRgba } from '../kit';
import { fitSize, measureTracked } from '../lib/measure';
import { AD } from '../ad';
import { ACT, type ActName, H, W } from '../timeline';

/** The page (a tinted white), and the picture stage the kit's still life is lit on (the mid slate: white type reads on it). */
export const PAGE = kitTheme('tintedPaper', C.accent);
export const SHOT = kitTheme('slateMid', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/** The ad's line: a regular weight (450), near-zero tracking, ink; never under 72 px (it must read at feed size). */
export const AD_TYPE = { size: 96, weight: 450, track: -0.012, lead: 1.1, min: 72 } as const;
export const adSize = (text: string, share = 0.66) =>
  Math.max(AD_TYPE.min * U, Math.min(AD_TYPE.size * U, fitSize(text, (W - 2 * SAFE.x) * share, AD_TYPE.size * U, AD_TYPE.weight, AD_TYPE.track)));
export const adStyle = (size: number, color: string = PAGE.text): React.CSSProperties => ({
  fontFamily: FONT.text,
  fontSize: size,
  fontWeight: AD_TYPE.weight,
  letterSpacing: `${AD_TYPE.track}em`,
  lineHeight: AD_TYPE.lead,
  whiteSpace: 'pre',
  color,
});
export const adWidth = (text: string, size: number) => measureTracked(text, size, AD_TYPE.weight, AD_TYPE.track, FONT.text, { trailing: false });

/** The i-th card picture: the ad's own (ad.ts pictures.cards, in turn), or undefined for the kit's still life. */
export const cardSrc = (i: number): string | undefined => {
  const list = AD.pictures.cards as readonly string[];
  return list.length ? staticFile(list[i % list.length]) : undefined;
};
export const pictureSrc = (k: 'plate' | 'hero'): string | undefined => (AD.pictures[k] ? staticFile(AD.pictures[k] as string) : undefined);

/** A picture card: rounded, a soft contact shadow, the picture filling it. */
export const PictureCard: React.FC<{ i: number; w: number; h: number }> = ({ i, w, h }) => (
  <div data-ui style={{ width: w, height: h, borderRadius: Math.min(w, h) * 0.06, overflow: 'hidden', boxShadow: `0 ${(10 * U).toFixed(1)}px ${(30 * U).toFixed(1)}px ${shadeRgba(PAGE, 0.16)}` }}>
    <Photo theme={i % 3 === 1 ? PAGE : SHOT} w={w} h={h} seed={i * 7 + 3} src={cardSrc(i)} />
  </div>
);

/** The mark at `size` px, centred on (x, y), turned `rot` deg and scaled `s` about its centre. */
export const MarkAt: React.FC<{ x: number; y: number; size: number; s?: number; rot?: number; o?: number }> = ({ x, y, size, s = 1, rot = 0, o = 1 }) => (
  <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: o, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - size / 2).toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(5)})` }}>
    <LogoMark logo={LOGO} size={size} />
  </div>
);

/** The cubic-out and circ-out the ad's measured moves use. */
export const cubicOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
export const circOut = (t: number) => Math.sqrt(1 - (1 - Math.min(1, Math.max(0, t))) ** 2);
export const quadIn = (t: number) => Math.min(1, Math.max(0, t)) ** 2;

export { H, W };
