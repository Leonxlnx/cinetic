// GhostWord (ground, idle): a flat light ground with one giant word set across it a few percent lighter than the
// ground, cropped by the frame and drifting sideways, so the brand's word is the texture under small type.
// Numbers: the word's cap about 0.95 of the height (it bleeds off both sides), 6-8 % lighter than the ground, a 2 px
// softening; drift 0.5 px a frame at 1080.
// Caution: faint is the point: if it can be read before the line in front, it is too strong; never a second ghost.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, ease } from '../../motion';
import { fonts } from '../../fonts';

/** GhostWord: `text` set at `size` (share of the height) in `font`, coloured `color` over `ground`, drifting `drift` px a frame. */
export const GhostWord: React.FC<{
  text: string;
  at?: number;
  ground?: string;
  color?: string;
  font?: string;
  weight?: number;
  italic?: boolean;
  size?: number;
  drift?: number;
  blur?: number;
  y?: number;
}> = ({ text, at = 0, ground = '#E4E6E2', color = '#ECEDEA', font = fonts.serif, weight = 400, italic = true, size = 1.15, drift = 0.5, blur = 2, y = 0.5 }) => {
  const f = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const u = H / 1080;
  const p = prog(f, at, 30, ease.out);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${y * 100}%`,
          transform: `translate(calc(-50% + ${-drift * u * f}px), -50%)`,
          whiteSpace: 'nowrap',
          fontFamily: font,
          fontStyle: italic ? 'italic' : 'normal',
          fontWeight: weight,
          fontSize: size * H,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color,
          opacity: p,
          filter: blur ? `blur(${blur * u}px)` : undefined,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
