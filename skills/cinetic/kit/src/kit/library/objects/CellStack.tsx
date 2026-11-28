// CellStack (object, build / loop): square cells appear one by one in a row on a white plate, then whole rows join
// below, each row born as small dots that grow into squares, while the plate grows from a bar into a square around
// them; then the grid works like a loader: one row strong at a time, stepping down, the others pale.
// Numbers: the first row's cells 1 f apart, each from 30 % to full in 2 f; rows two to four at 11, 13 and 16 f; the plate
// re-fits in 3 f a row (expo out); a cell 3.6 % of W on a pitch of 8.4 % of W; the loader from 18 f: rows strong for 5,
// 4, 2, 3 f, the row before at 55 %, the rest at 30 %.
// Caution: it says working, collecting, indexing; let it loop under a line, never as the line's only content.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix } from '../../motion';
import { softShadow } from '../../world';

export const CellStack: React.FC<{
  at?: number;
  cols?: number;
  rows?: number;
  color?: string;
  /** The plate behind the cells (false: none). */
  plate?: string | false;
  ground?: string;
  /** Cell side as a share of W (the pitch is 2.33 times it). */
  cell?: number;
  /** Corner radius of a cell as a share of its side. */
  radius?: number;
  x?: number;
  y?: number;
}> = ({ at = 0, cols = 4, rows = 4, color = '#E4572E', plate = '#FFFFFF', ground = '#F2F2F0', cell = 0.036, radius = 0, x, y }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const c = cell * W;
  const pitch = c * 2.33;
  const rowAt = [0, 11, 13, 16, 18, 20, 22, 24].slice(0, rows);
  // rows on screen (smooth, for the plate and the re-centring)
  let rowsNow = 0;
  rowAt.forEach((ra) => (rowsNow += ease.out(clamp((t - ra + 1) / 3))));
  rowsNow = Math.max(1, rowsNow);
  const gw = (cols - 1) * pitch + c;
  const gh = (rowsNow - 1) * pitch + c;
  const top0 = cy - gh / 2;
  const left0 = cx - gw / 2;
  // the loader: which row is strong
  const cycle = [5, 4, 2, 3];
  let strong = -1;
  let prev = -1;
  if (t >= 18) {
    let k = (t - 18) % cycle.slice(0, rows).reduce((a, b) => a + b, 0);
    for (let r = 0; r < Math.min(rows, cycle.length); r++) {
      if (k < cycle[r]) {
        strong = r;
        prev = (r + rows - 1) % rows;
        break;
      }
      k -= cycle[r];
    }
  }
  const pad = pitch * 0.62;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const born = r === 0 ? q : rowAt[r];
      if (t < born) continue;
      const g = mix(ease.out(clamp((t - born + 1) / 2)), 0.3, 1);
      const op = strong < 0 ? 1 : r === strong ? 1 : r === prev ? 0.55 : 0.3;
      const s = c * g;
      cells.push(<div key={`${r}-${q}`} style={{ position: 'absolute', left: left0 + q * pitch + (c - s) / 2, top: top0 + r * pitch + (c - s) / 2, width: s, height: s, background: color, opacity: op, borderRadius: radius * s }} />);
    }
  }
  return (
    <AbsoluteFill>
      {plate && <div style={{ position: 'absolute', left: left0 - pad, top: top0 - pad, width: gw + pad * 2, height: gh + pad * 2, background: plate, borderRadius: pad * 0.18, boxShadow: softShadow(2, ground) }} />}
      {cells}
    </AbsoluteFill>
  );
};
