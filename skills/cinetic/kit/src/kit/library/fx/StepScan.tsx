// StepScan (fx, loop): a small grid of square cells with one strong row stepping down it by cuts: the row it left drops to
// a mid tint, the rest stay pale; after the last row the whole grid goes pale for a beat and the scan restarts at the top.
// A machine reading, line by line.
// Numbers: a 4 x 4 grid, cells 4.5 % of the frame height, gaps 0.75 of a cell; holds 6, 4, 1, 4 f a row and 1 f all pale
// (uneven, so it reads as work, not a metronome); tints 100 % strong, 45 % the row just left, 18 % pale; on each restart
// the other rows fall from 45 % to pale over 3 f.
// Caution: a small, technical loop beside a line that says what is being read; never full screen, never more than one.
// Catalogue: ../catalog/fx.ts; props and recipe: references/library-fx.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp } from '../../motion';

/**
 * StepScan: a `cols` x `rows` grid of cells in `color`; from `at` one strong row (or column, `axis="col"`) steps through it
 * on the frames of `holds` (one hold a row, then one with all pale), looping until `until`.
 */
export const StepScan: React.FC<{
  at: number;
  until?: number;
  cols?: number;
  rows?: number;
  /** Cell size in px (default 4.5 % of the frame height). */
  cell?: number;
  /** Gap as a share of a cell. */
  gap?: number;
  color?: string;
  /** Frames each row is held strong, then the all-pale beat (one more entry than rows; it repeats if shorter). */
  holds?: number[];
  axis?: 'row' | 'col';
  radius?: number;
  style?: React.CSSProperties;
}> = ({ at, until, cols = 4, rows = 4, cell, gap = 0.75, color = '#E8492B', holds = [6, 4, 1, 4, 1], axis = 'row', radius = 0.08, style }) => {
  const frame = useCurrentFrame();
  const { height: H } = useVideoConfig();
  const c = cell ?? Math.round(H * 0.045);
  const g = c * gap;
  const lines = axis === 'row' ? rows : cols;
  const seq = Array.from({ length: lines + 1 }, (_, i) => holds[i % holds.length]);
  const cycle = seq.reduce((a, b) => a + b, 0);
  const t = frame - at;
  const live = t >= 0 && (until === undefined || frame < until);
  let strong = -1;
  let since = 0;
  if (live) {
    const local = t % cycle;
    let acc = 0;
    for (let i = 0; i < seq.length; i++) {
      if (local < acc + seq[i]) {
        strong = i < lines ? i : -1;
        since = local;
        break;
      }
      acc += seq[i];
    }
  }
  const tint = (line: number) => {
    if (!live) return 0.18;
    if (line === strong) return 1;
    if (strong > 0 && line === strong - 1) return 0.45;
    if (strong === -1 && line === lines - 1) return 0.18;
    // on a restart the rest fall from the mid tint to pale over 3 frames
    if (strong === 0) return 0.45 - (0.45 - 0.18) * clamp(since / 3);
    return 0.18;
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${c}px)`, gap: g, ...style }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const line = axis === 'row' ? Math.floor(i / cols) : i % cols;
        return <div key={i} style={{ width: c, height: c, borderRadius: c * radius, background: color, opacity: tint(line) }} />;
      })}
    </div>
  );
};
