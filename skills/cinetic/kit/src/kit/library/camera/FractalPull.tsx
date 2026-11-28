// FractalPull (camera, build, exit): a small grid of cells (each with a strong row stepping through it) replicates
// outward, first into a plus of grids, then a field of them, while the camera pulls back without stopping, until the frame
// is a fine field of cells flickering row by row: one machine becoming many.
// Numbers: units of 4 x 4 cells; neighbours appear by their distance from the centre (3 f for the plus, then faster); the pull
// from 1x to 1/5 over 46 f on an in-out (log scale); each unit's strong row steps every 3 f with its own phase.
// Caution: one colour on a light ground; end it on a cut or a type move once the field is fine, never hold the field.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, ease, logScale, rand } from '../../motion';

/**
 * FractalPull: from `at` the camera pulls back from one unit (a `cells` x `cells` grid, `unit` px wide at the start, centred)
 * to `to` of its scale over `dur` frames, while copies of the unit appear outward every `spread` frames a step.
 */
export const FractalPull: React.FC<{
  at: number;
  dur?: number;
  to?: number;
  unit?: number;
  cells?: number;
  spread?: number;
  color?: string;
  ground?: string;
  seed?: number;
}> = ({ at, dur = 46, to = 1 / 5, unit, cells = 4, spread = 3, color = '#E8492B', ground = '#FFFFFF', seed = 5 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const U = unit ?? H * 0.36;
  const z = logScale(1, to, ease.inOut(clamp((frame - at) / dur)));
  const u = U * z;
  const pitch = u * 1.35;
  const nx = Math.ceil(W / pitch / 2) + 1;
  const ny = Math.ceil(H / pitch / 2) + 1;
  const cell = u / (cells + (cells - 1) * 0.75);
  const gap = cell * 0.75;
  const rects: React.ReactNode[] = [];
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      const d = Math.abs(i) + Math.abs(j);
      // the plus first, then the field; far units follow faster so the frame is full by the end of the pull
      if (d > 0 && frame < at + spread * Math.pow(d, 0.7)) continue;
      const ox = W / 2 + i * pitch - u / 2;
      const oy = H / 2 + j * pitch - u / 2;
      const phase = Math.floor(rand(seed * 97 + i * 31 + j * 57) * (cells + 1));
      const strong = (Math.floor(Math.max(0, frame - at) / 3) + phase) % (cells + 1);
      for (let r = 0; r < cells; r++) {
        const a = r === strong ? 1 : r === strong - 1 ? 0.45 : 0.18;
        for (let c = 0; c < cells; c++) {
          rects.push(<rect key={`${i}_${j}_${r}_${c}`} x={ox + c * (cell + gap)} y={oy + r * (cell + gap)} width={cell} height={cell} fill={color} fillOpacity={a} />);
        }
      }
    }
  }
  return (
    <AbsoluteFill style={{ background: ground }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} shapeRendering="crispEdges">
        {rects}
      </svg>
    </AbsoluteFill>
  );
};
