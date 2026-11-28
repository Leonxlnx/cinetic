// ChipBloom (turn, join): a picture chip set inside a sentence grows in place, pushing the words apart, then opens to
// the whole frame: its picture is the next scene.
// Numbers: 6 f of growth to 1.75x from rest (the words ride its edges; never wider than the frame allows), then 8 f to
// the full frame, the chip covering the words on one continuous curve in log space (speed carried through, a soft landing); the picture inside always
// covers the chip and lands at its own scale. Optional lines above and below ride the chip's top and bottom.
// Caution: the chip must show the next scene's own picture from the start; a chip that changes picture is a cut.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { chain, clamp, logScale, mix } from '../../motion';
import { useTextLayout } from '../../type';
import { type Scenes, sp } from './_shared';

/**
 * ChipBloom: the sentence "we bring it [picture] all together" where the picture chip becomes the next scene. The piece
 * sets the line itself (`before`, the chip, `after`, centred on x, y; optional `above` and `below` lines) over `from` (the
 * ground and anything else), holds it until `at`, then the chip grows from rest, the words riding its edges, and opens
 * to the frame on one continuous curve. Inside the chip the next scene is drawn so that it always covers the chip, so the
 * picture the reader saw is the picture that lands. In a frame too narrow for the grown line (a vertical film) the chip
 * grows less in width and more in height, so the words stay inside the frame until it opens.
 * Measured: chip 185 x 105 px at 1920 grows to ~1.75x, then fills the frame.
 */
export const ChipBloom: React.FC<
  Scenes & {
    before: string;
    after: string;
    /** The line's style (font, size, colour). */
    style: React.CSSProperties;
    /** The chip's size and corner radius in px. */
    chip: { w: number; h: number; r?: number };
    x?: number;
    y?: number;
    /** Space between a word and the chip, in px (default a third of the font size). */
    gap?: number;
    /** Frames of growth in the line (default 6), and frames from there to the full frame (default 8). */
    dur?: number;
    open?: number;
    /** How much the chip grows in the line before it opens. */
    grow?: number;
    /** A shadow under the chip. */
    shadow?: string;
    /** A line set above the chip's line (centred), pushed up by the chip as it grows: a fuller hook in a tall frame. */
    above?: string;
    /** A line set below the chip's line (centred), pushed down by the chip as it grows. */
    below?: string;
    /** The style of `above` and `below` (default: the line's style). */
    lineStyle?: React.CSSProperties;
  }
> = ({ from, to, at: start, speed = 1, before, after, style, chip, x: xIn, y: yIn, gap: gapIn, dur = 6, open = 8, grow = 1.75, shadow, above, below, lineStyle }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const A = useTextLayout(before, style);
  const B = useTextLayout(after, style);
  const GA = sp(dur, speed);
  const OB = Math.max(1, sp(open, speed));
  if (frame >= start + GA + OB) return <AbsoluteFill>{to}</AbsoluteFill>;
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const fs = typeof style.fontSize === 'number' ? style.fontSize : 60;
  const gap = gapIn ?? fs / 3;
  const r0 = chip.r ?? chip.h * 0.22;
  // the line centred as a whole: before, gap, chip, gap, after
  const total = A.width + gap + chip.w + gap + B.width;
  const cx0 = x - total / 2 + A.width + gap + chip.w / 2;
  // the grown chip keeps the whole line inside 88 % of the frame width; what it cannot take in width it takes in height
  const room = (W * 0.88 - (total - chip.w)) / chip.w;
  const gw = A.ready && B.ready ? clamp(room, 1, grow) : grow;
  const gh = Math.max(grow, gw) * Math.min(1.6, Math.max(1, grow / gw));
  // one progress u over growth (0 -> 0.5) and opening (0.5 -> 1), joined so the speed carries through
  const u = chain(frame, [[start - 1, 0], [start + GA - 1, 0.5], [start + GA + OB - 1, 1]]);
  const growing = u <= 0.5;
  const a = growing ? u / 0.5 : (u - 0.5) / 0.5;
  let cx = cx0, cy = y, cw: number, ch: number, cr: number;
  // the words ride the chip's edges while it grows; once it opens they drift on only a little and the chip covers them
  // (they never slide out through the frame edge)
  let ex: number, ey: number;
  if (growing) {
    cw = logScale(chip.w, chip.w * gw, a);
    ch = logScale(chip.h, chip.h * gh, a);
    cr = mix(a, r0, r0 * Math.min(gw, gh));
    ex = cw / 2;
    ey = ch / 2;
  } else {
    cw = logScale(chip.w * gw, W + 4, a);
    ch = logScale(chip.h * gh, H + 4, a);
    cr = mix(a, r0 * Math.min(gw, gh), 0);
    cx = mix(a, cx0, W / 2);
    cy = mix(a, y, H / 2);
    ex = (chip.w * gw) / 2 + (cw - chip.w * gw) * 0.02;
    ey = (chip.h * gh) / 2 + (ch - chip.h * gh) * 0.02;
  }
  const lx = growing ? cx : cx0;
  const ly = growing ? cy : y;
  const ps = Math.max(cw / W, ch / H);
  const ls = lineStyle ?? style;
  const lfs = typeof ls.fontSize === 'number' ? ls.fontSize : fs;
  const side: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, textAlign: 'center', whiteSpace: 'pre', ...ls };
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill>{from}</AbsoluteFill>
      {above && <div style={{ ...side, transform: `translate(${x - W / 2}px, ${ly - ey - gap - lfs * 1.2}px)` }}>{above}</div>}
      {below && <div style={{ ...side, transform: `translate(${x - W / 2}px, ${ly + ey + gap}px)` }}>{below}</div>}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${lx - ex - gap - A.width}px, ${ly - A.height / 2}px)`, whiteSpace: 'pre', ...style, opacity: A.ready ? 1 : 0 }}>{before}</div>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${lx + ex + gap}px, ${ly - B.height / 2}px)`, whiteSpace: 'pre', ...style, opacity: B.ready ? 1 : 0 }}>{after}</div>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cx - cw / 2}px, ${cy - ch / 2}px)`, width: cw, height: ch, borderRadius: cr, overflow: 'hidden', boxShadow: growing ? shadow : undefined }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${cw / 2 - W / 2}px, ${ch / 2 - H / 2}px) scale(${ps})` }}>{to}</div>
      </div>
    </AbsoluteFill>
  );
};
