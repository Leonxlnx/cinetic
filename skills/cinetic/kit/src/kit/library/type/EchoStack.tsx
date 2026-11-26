// EchoStack (type, emphasis / exit): one word repeated into a stack: rows of copies above and below and copies behind
// it to the left and right, each nearer copy hiding the ones behind it, so only their ends show; small labels pop
// around it; then the centre copy zooms in steps inside its own box until a fragment of one letter fills the frame.
// Numbers: rows at a 0.7 em pitch; side copies show 27 %, 20 % and 10 % of the word's width on the centre, near and far
// rows, sliding out over 3 f; the centre row and rows +-1 at once, rows +-2 and the near sides at 4 f, the far sides at
// 6 f; labels in pairs every 2-4 f at 1 % of the frame's height; the zoom cuts to 1.7x, then 2.7x three frames later,
// then a 14x fragment for its last frames.
// Caution: one short word (4-8 letters) in a heavy sans on a flat ground; give the ground colour (the copies hide each
// other with it).
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';

/**
 * EchoStack: from `at` the word stands with its rows above and below and its side copies sliding out; at `at + 4` the
 * outer rows and the near rows' sides, at `at + 6` the outer sides: a stack of echoes, the nearer copy always on top with a slab of `ground` behind its
 * letters. `labels` pop around the stack in pairs from `labelsAt`. From `zoomAt` the rest goes and the centre copy
 * zooms inside its own box by cuts (1.7x, then 2.7x), and on `zoomAt + 5` a single letter fragment fills the frame.
 */
export const EchoStack: React.FC<{
  text: string;
  at?: number;
  labels?: string[];
  labelsAt?: number;
  zoomAt?: number;
  size?: number;
  color?: string;
  ground?: string;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, labels = [], labelsAt, zoomAt, size = 150, color = '#F4F4F2', ground = '#0B0B0C', leaveAt, x, y, font = fonts.inter, weight = 600 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.035em', lineHeight: 1 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at || (leaveAt !== undefined && frame >= leaveAt)) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const W = L.width;
  const f = frame - at;
  // the letters' band: from the cap line to just below the baseline (the slab that hides the copies behind)
  const capTop = L.baseline - size * 0.76;
  const band = size * 0.86;
  const zoom = zoomAt === undefined ? 0 : frame - zoomAt;
  const copy = (dx: number, dy: number, key: string, slab = true) => (
    <div key={key} style={{ position: 'absolute', left: cx - W / 2 + dx, top: cy - L.height / 2 + dy, width: W, height: L.height }}>
      {slab && <div style={{ position: 'absolute', left: -size * 0.02, right: -size * 0.02, top: capTop, height: band, background: ground }} />}
      <span style={{ ...style, position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', color }}>{text}</span>
    </div>
  );
  if (zoom >= 0 && zoomAt !== undefined) {
    if (zoom >= 5) {
      // the last beat: one letter fragment, huge, filling the frame
      const s = 14;
      const gi = Math.floor(L.chars.length / 2);
      const g = L.chars[gi];
      return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: ground }}>
          <span style={{ ...style, position: 'absolute', left: cx - (g.x + g.width * 0.62), top: cy - (capTop + band * 0.4), whiteSpace: 'pre', color, transform: `scale(${s})`, transformOrigin: `${g.x + g.width * 0.62}px ${capTop + band * 0.4}px` }}>{text}</span>
        </div>
      );
    }
    const s = zoom < 3 ? 1.7 : 2.7;
    // the centre copy zooms inside its own box; the outer copies of its row stay as they were
    return (
      <>
        {copy(-W * 0.27, 0, 'l')}
        {copy(W * 0.27, 0, 'r')}
        <div style={{ position: 'absolute', left: cx - W / 2, top: cy - L.height / 2 + capTop - band * 0.06, width: W, height: band * 1.06, overflow: 'hidden', background: ground }}>
          <span style={{ ...style, position: 'absolute', left: 0, top: -(capTop - band * 0.06), whiteSpace: 'pre', color, transform: `scale(${s})`, transformOrigin: `${W / 2}px ${capTop + band / 2}px` }}>{text}</span>
        </div>
      </>
    );
  }
  const pitch = size * 0.7;
  // back to front: the far rows, the near rows, the centre row; within a row the sides, then the middle
  const layers: React.ReactNode[] = [];
  const row = (r: number, side: number, show: boolean, showSides: boolean) => {
    if (!show) return;
    const dy = r * pitch;
    if (showSides) {
      layers.push(copy(-W * side, dy, `${r}l`));
      layers.push(copy(W * side, dy, `${r}r`));
    }
    layers.push(copy(0, dy, `${r}c`));
  };
  // the side copies slide out from behind their row's middle copy over 3 frames
  const out = (t: number) => Math.min(1, Math.max(0, (f - t + 1) / 3));
  row(-2, 0.1 * out(6), f >= 4, f >= 6);
  row(2, 0.1 * out(6), f >= 4, f >= 6);
  row(-1, 0.2 * out(4), f >= 0, f >= 4);
  row(1, 0.2 * out(4), f >= 0, f >= 4);
  row(0, 0.27 * out(0), true, true);
  // labels: pairs every 3 f, alternating around the stack
  const t0 = labelsAt ?? at + 13;
  const spots = [
    [0, -2.9],
    [0, 2.9],
    [-0.72, -1.4],
    [0.72, -0.5],
    [-0.74, -0.2],
    [0.72, 0.5],
    [-0.74, 0.9],
    [0.7, 1.4],
    [-0.62, -2],
    [0.6, 2.2],
  ];
  const ls = labels.map((t, i) => {
    if (frame < t0 + Math.floor(i / 2) * 3) return null;
    const [sx, sy] = spots[i % spots.length];
    return (
      <div key={`lab${i}`} style={{ position: 'absolute', left: cx + sx * W, top: cy + sy * pitch, transform: 'translate(-50%, -50%)', fontFamily: font, fontWeight: 500, fontSize: Math.max(11, height * 0.012), color, opacity: 0.9, whiteSpace: 'pre' }}>
        {t}
      </div>
    );
  });
  return (
    <>
      {layers}
      {ls}
    </>
  );
};
