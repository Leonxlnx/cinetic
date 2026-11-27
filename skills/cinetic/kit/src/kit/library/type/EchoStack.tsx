// EchoStack (type, emphasis / exit): one word repeated into a stack: whole copies in rows above and below and a whole
// copy sliding out from behind it to the left and right, each echo dimmer than the word, so the stack reads as depth
// and never as overprinted fragments; small labels pop beside it; then the centre copy zooms in steps inside its own
// box until a fragment of one letter fills the frame.
// Numbers: rows at a 1.0 em pitch (whole words, never cut through); the side copies of the centre row sit a word and
// 0.3 em out, sliding out from behind it over 3 f; the centre row and rows +-1 at once, rows +-2 at 4 f; the echoes
// recede in tone (the word full, its sides and the near rows 40 %, the far rows 18 % toward the ground); labels in pairs
// every 3 f at 2.4 % of the frame's height, beside the upper and lower rows; the zoom clears the echoes and cuts the
// whole word to 1.7x, then 2.7x three frames later (held to 90 % of the frame's width, never cropped), then a 14x
// fragment for its last frames.
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
 * letters. `labels` pop around the stack in pairs from `labelsAt`. From `zoomAt` the rest goes and the word, whole,
 * steps closer by cuts (1.7x, then 2.7x, within 90 % of the frame's width), and on `zoomAt + 5` a single letter fragment fills the frame.
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
  const copy = (dx: number, dy: number, key: string, tone = 1, slab = true) => (
    <div key={key} style={{ position: 'absolute', left: cx - W / 2 + dx, top: cy - L.height / 2 + dy, width: W, height: L.height }}>
      {slab && <div style={{ position: 'absolute', left: -size * 0.02, right: -size * 0.02, top: capTop, height: band, background: ground }} />}
      <span style={{ ...style, position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', color, opacity: tone }}>{text}</span>
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
    // the echoes go and the word alone steps closer by cuts, always whole (never cropped): 1.7x, then 2.7x, each held
    // to 90 % of the frame's width
    const fit = (width * 0.9) / W;
    const s = Math.min(zoom < 3 ? 1.7 : 2.7, fit);
    return (
      <div style={{ position: 'absolute', inset: 0, background: ground }}>
        <span style={{ ...style, position: 'absolute', left: cx - W / 2, top: cy - L.height / 2, whiteSpace: 'pre', color, transform: `scale(${s})`, transformOrigin: `${W / 2}px ${capTop + band / 2}px` }}>{text}</span>
      </div>
    );
  }
  const pitch = size;
  // back to front: the far rows, the near rows, the centre row; within a row the sides, then the middle
  const layers: React.ReactNode[] = [];
  const row = (r: number, side: number, show: boolean) => {
    if (!show) return;
    const dy = r * pitch;
    // the echoes recede in tone: the word full, its own sides and the near rows 40 %, the far rows 18 %
    const tone = Math.abs(r) <= 1 ? 0.4 : 0.18;
    if (side > 0) {
      layers.push(copy(-side, dy, `${r}l`, tone));
      layers.push(copy(side, dy, `${r}r`, tone));
    }
    layers.push(copy(0, dy, `${r}c`, r === 0 ? 1 : tone));
  };
  // the side copies slide out from behind the word over 3 frames (eased out), to a word and 0.3 em away
  const out = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, (f - t + 1) / 3)), 2);
  row(-2, 0, f >= 4);
  row(2, 0, f >= 4);
  row(-1, 0, f >= 0);
  row(1, 0, f >= 0);
  row(0, (W + size * 0.3) * out(0), true);
  // labels: pairs every 3 f, beside the upper and lower rows (never over a copy, never on the centre row), the left ones
  // set flush right and the right ones flush left
  const t0 = labelsAt ?? at + 13;
  const spots = [
    [-1, -1.5],
    [1, -1.0],
    [-1, -0.8],
    [1, 0.8],
    [-1, 1.0],
    [1, 1.5],
    [-1, 2.0],
    [1, -2.0],
    [-1, -2.0],
    [1, 2.0],
  ];
  const edge = W * 0.5 + size * 0.22;
  const ls = labels.map((t, i) => {
    if (frame < t0 + Math.floor(i / 2) * 3) return null;
    const [sx, sy] = spots[i % spots.length];
    return (
      <div key={`lab${i}`} style={{ position: 'absolute', left: cx + sx * edge, top: cy + sy * pitch, transform: sx < 0 ? 'translate(-100%, -50%)' : 'translate(0, -50%)', fontFamily: font, fontWeight: 500, fontSize: Math.max(18, Math.min(width, height) * 0.024), color, opacity: 0.9, whiteSpace: 'pre' }}>
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
