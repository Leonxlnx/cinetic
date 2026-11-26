// TagSlap (type, emphasis): small tilted label tags slap across a big word or a picture one after another; each tag
// opens from its centre in three frames, its text cropped by its edges until it is whole.
// Numbers: a tag every 15-20 f; it opens 40 %, 75 %, 100 % of its width on its first three frames (no ease, no
// overshoot); tilted -3 to +3 degrees; 7.5 % of the frame's height tall (about a third of the giant word's cap); a
// small arrow before the text.
// Caution: two or three tags at most, each a real attribute of what they sit on; they cover what is behind them.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';

export type Tag = {
  text: string;
  at: number;
  /** Centre as a share of the frame (0..1). */
  x: number;
  y: number;
  /** Tilt in degrees (default -3). */
  rot?: number;
};

const OPEN = [0.4, 0.75, 1];

/**
 * TagSlap: each tag of `tags` lands on its frame at its place, tilted, opening from its centre over three frames with its
 * text cropped by the opening edges. Tags stay once landed (until `leaveAt`).
 */
export const TagSlap: React.FC<{
  tags: Tag[];
  color?: string;
  ink?: string;
  /** Height as a share of the frame's height (default 0.075). */
  size?: number;
  arrow?: boolean;
  leaveAt?: number;
  font?: string;
  weight?: number;
}> = ({ tags, color = '#F0582A', ink = '#FFFFFF', size = 0.075, arrow = true, leaveAt, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (leaveAt !== undefined && frame >= leaveAt) return null;
  const h = height * size;
  const fs = h * 0.66;
  return (
    <>
      {tags.map((t, i) => {
        const age = frame - t.at;
        if (age < 0) return null;
        const open = OPEN[Math.min(age, OPEN.length - 1)];
        return (
          <div key={i} style={{ position: 'absolute', left: t.x * width, top: t.y * height, transform: `translate(-50%, -50%) rotate(${t.rot ?? -3}deg)` }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: h * 0.18, height: h, padding: `0 ${h * 0.32}px`, background: color, color: ink, fontFamily: font, fontWeight: weight, fontSize: fs, letterSpacing: '0.005em', whiteSpace: 'pre', clipPath: `inset(0 ${((1 - open) / 2) * 100}% 0 ${((1 - open) / 2) * 100}%)` }}>
              {arrow && (
                <svg width={fs * 0.8} height={fs * 0.8} viewBox="0 0 10 10" style={{ flex: 'none' }}>
                  <path d="M2 8 L8 2 M3.2 2 H8 V6.8" stroke={ink} strokeWidth={1.7} fill="none" strokeLinecap="square" />
                </svg>
              )}
              {t.text}
            </div>
          </div>
        );
      })}
    </>
  );
};
