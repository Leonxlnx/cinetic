// FourUp (ground, loop): the frame split into four equal panels, each playing its own scene on its own loop length and
// phase, so the four never cut together and something changes somewhere every few frames.
// Numbers: four half-size panels, butted (no gutter) or 4 px black gutters with 8 px corners at 1080; loops of
// 90-150 f, phases spread so no two panel cuts fall within 6 f of each other.
// Caution: each panel is a full composition with its own subject centred; one panel carries the words, the others
// pictures or UI, or the frame reads as noise.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { AbsoluteFill, Loop, Sequence, useVideoConfig } from 'remotion';

/**
 * FourUp: `panels` are four full-frame scenes (laid out for the whole frame, shown at half size); `loops[i]` frames
 * (0: no loop) and `phases[i]` frames already played at frame 0.
 */
export const FourUp: React.FC<{
  panels: React.ReactNode[];
  loops?: number[];
  phases?: number[];
  /** Gutter in px at 1080 (0: butted). */
  gutter?: number;
  radius?: number;
  ground?: string;
}> = ({ panels, loops = [120, 96, 138, 110], phases = [0, 37, 71, 18], gutter = 0, radius = 0, ground = '#000000' }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = H / 1080;
  const g = gutter * u;
  const pw = (W - g * 3) / 2;
  const ph = (H - g * 3) / 2;
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      {panels.slice(0, 4).map((node, i) => {
        const x = g + (i % 2) * (pw + g);
        const y = g + Math.floor(i / 2) * (ph + g);
        const loop = loops[i] ?? 0;
        const phase = phases[i] ?? 0;
        const inner = <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${pw / W}, ${ph / H})`, transformOrigin: '0 0' }}>{node}</div>;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: pw, height: ph, overflow: 'hidden', borderRadius: radius * u }}>
            <Sequence from={-phase} layout="none">
              {loop > 0 ? (
                <Loop durationInFrames={loop} layout="none">
                  {inner}
                </Loop>
              ) : (
                inner
              )}
            </Sequence>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
