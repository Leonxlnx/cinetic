// ChipBloom (turn, join): a picture chip set inside a sentence grows in place, pushing the words apart, then opens to
// the whole frame in two frames: its picture is the next scene.
// Numbers: 5 f of growth to 1.75x on an ease-in (the words ride its edges), then 2 f to the full frame; the picture
// inside always covers the chip and lands at its own scale.
// Caution: the chip must show the next scene's own picture from the start; a chip that changes picture is a cut.
// Catalogue: ../catalog/turn.ts; props and recipe: references/library-turns.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { logScale, mix } from '../../motion';
import { useTextLayout } from '../../type';
import { type Scenes, sp } from './_shared';

/**
 * ChipBloom: the sentence "we bring it [picture] all together" where the picture chip becomes the next scene. The piece
 * sets the line itself (`before`, the chip, `after`, centred on x, y) over `from` (the ground and anything else), holds it
 * until `at`, then the chip grows on an ease-in, the words riding its edges, and in two frames it is the frame. Inside the
 * chip the next scene is drawn so that it always covers the chip, so the picture the reader saw is the picture that lands.
 * Measured: chip 185 x 105 px at 1920 grows to ~1.75x in 5 f (1.0, 1.19, 1.37, 1.5, 1.75), then fills the frame.
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
    /** Frames of growth in the line, and frames from there to the full frame. */
    dur?: number;
    open?: number;
    /** How much the chip grows in the line before it opens. */
    grow?: number;
    /** A shadow under the chip. */
    shadow?: string;
  }
> = ({ from, to, at: start, speed = 1, before, after, style, chip, x: xIn, y: yIn, gap: gapIn, dur = 5, open = 2, grow = 1.75, shadow }) => {
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
  let cx = cx0, cy = y, cw = chip.w, ch = chip.h, cr = r0;
  const k = frame - start;
  if (k >= 0 && k < GA) {
    const t = (k + 1) / GA;
    const g = mix(t * t, 1, grow);
    cw = chip.w * g;
    ch = chip.h * g;
    cr = r0 * g;
  } else if (k >= GA) {
    const t = (k - GA + 1) / OB;
    const w1 = chip.w * grow, h1 = chip.h * grow;
    cw = logScale(w1, W + 4, t);
    ch = logScale(h1, H + 4, t);
    cr = mix(t, r0 * grow, 0);
    cx = mix(t, cx0, W / 2);
    cy = mix(t, y, H / 2);
  }
  const ps = Math.max(cw / W, ch / H);
  const lineTop = cy - A.height / 2;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill>{from}</AbsoluteFill>
      <div style={{ position: 'absolute', left: cx - cw / 2 - gap - A.width, top: lineTop, whiteSpace: 'pre', ...style, opacity: A.ready ? 1 : 0 }}>{before}</div>
      <div style={{ position: 'absolute', left: cx + cw / 2 + gap, top: cy - B.height / 2, whiteSpace: 'pre', ...style, opacity: B.ready ? 1 : 0 }}>{after}</div>
      <div style={{ position: 'absolute', left: cx - cw / 2, top: cy - ch / 2, width: cw, height: ch, borderRadius: cr, overflow: 'hidden', boxShadow: k < GA ? shadow : undefined }}>
        <div style={{ position: 'absolute', left: cw / 2 - W / 2, top: ch / 2 - H / 2, width: W, height: H, transform: `scale(${ps})` }}>{to}</div>
      </div>
    </AbsoluteFill>
  );
};
