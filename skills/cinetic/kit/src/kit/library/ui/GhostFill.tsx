// GhostFill (ui, build): a field of ghost slots (a shade darker than the ground) round a central mark takes its
// colours one app tile at a time, in a scattered order, the interval shrinking, until the set is full; label pills
// may pop beside a few tiles.
// Numbers: each tile from a pale tint to full colour in 6 f (scale 0.94 to 1); intervals 6, 5, 5, 4, 4, 3, 3, 2, 2,
// 2, 1 f (the last repeats); ghosts 4 % darker than the ground, radius 28 %, fading out towards the field's edge.
// Caution: real tools in the filled tiles (a `mark`, or a glyph with one colour pair each); 12-20 filled of 50-70 slots.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix, rand } from '../../motion';
import { mixColor } from '../../type';
import { Glyph, type Look, Pill, useUiFrame, withPace } from './_shared';

export type GhostItem = {
  /** The slot it fills, as column and row from the field's centre (0, 0 is the mark). */
  c: number;
  r: number;
  icon?: string;
  letter?: string;
  colors?: [string, string];
  /** The tool's real logo, drawn on a white tile in place of the glyph. */
  mark?: React.ReactNode;
};

const GAPS = [6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1];

const GhostFillInner: React.FC<{
  L: Look;
  items: GhostItem[];
  at: number;
  /** The node at the centre slot (the product's mark). */
  center?: React.ReactNode;
  /** Columns and rows of slots each side of the centre. */
  cols?: number;
  rows?: number;
  /** Tile side in px (default 6.2 % of the frame height) and the pitch as a multiple of it. */
  tile?: number;
  pitch?: number;
  /** Frames between fills (the last repeats); the order is shuffled by `seed`. */
  gaps?: number[];
  /** Labels popping beside filled tiles: the item's index, its text, the frame (from `at`). */
  labels?: Array<{ item: number; text: string; f: number }>;
  x?: number;
  y?: number;
  seed?: number;
  speed?: number;
}> = ({ L, items, at: start, center, cols = 4, rows = 3, tile: tileIn, pitch = 1.42, gaps = GAPS, labels = [], x: xIn, y: yIn, seed = 7, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const s = tileIn ?? H * 0.062;
  const p = s * pitch;
  const ghost = mixColor(L.ground, L.dark ? '#FFFFFF' : '#000000', L.dark ? 0.06 : 0.04);
  // a scattered order, seeded
  const order = items.map((_, i) => i).sort((a, b) => rand(seed * 31 + a) - rand(seed * 31 + b));
  const T: number[] = new Array(items.length);
  let t = start;
  order.forEach((idx, k) => {
    T[idx] = t;
    t += gaps[Math.min(k, gaps.length - 1)];
  });
  const filled = new Map(items.map((it, i) => [`${it.c},${it.r}`, i]));
  const slots: Array<{ c: number; r: number }> = [];
  for (let r = -rows; r <= rows; r++) for (let c = -cols; c <= cols; c++) slots.push({ c, r });
  // the field fades towards an ellipse round the centre
  const fade = (c: number, r: number) => clamp(1.25 - Math.hypot(c / (cols + 0.6), r / (rows + 0.6)) * 1.05);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, pointerEvents: 'none' }}>
      {slots.map(({ c, r }) => {
        const k = `${c},${r}`;
        const cx = x + c * p;
        const cy = y + r * p;
        if (c === 0 && r === 0) {
          return center ? (
            <div key={k} style={{ position: 'absolute', left: cx - s, top: cy - s, width: s * 2, height: s * 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {center}
            </div>
          ) : null;
        }
        const i = filled.get(k);
        const a = fade(c, r);
        const ghostTile = <div style={{ position: 'absolute', inset: 0, borderRadius: s * 0.28, background: ghost, opacity: a }} />;
        if (i === undefined || frame < T[i]) {
          return a > 0 ? (
            <div key={k} style={{ position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s }}>
              {ghostTile}
            </div>
          ) : null;
        }
        const it = items[i];
        const q = at(frame, T[i], 6, ease.out);
        return (
          <div key={k} style={{ position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s }}>
            {ghostTile}
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${mix(q, 0.94, 1)})`, opacity: clamp(q * 2.5) }}>
              {it.mark ? (
                <div style={{ width: s, height: s, borderRadius: s * 0.28, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.mark}</div>
              ) : (
                <Glyph icon={it.icon} letter={it.letter} colors={it.colors} size={s} />
              )}
              {/* the pale tint it arrives in: the ground laid over it, clearing */}
              <div style={{ position: 'absolute', inset: -1, borderRadius: s * 0.3, background: L.ground, opacity: (1 - q) * 0.78 }} />
            </div>
          </div>
        );
      })}
      {labels.map((lb, n) => {
        const it = items[lb.item];
        if (!it) return null;
        const f0 = start + lb.f;
        if (frame < f0) return null;
        const q = at(frame, f0, 5, ease.snap);
        const cx = x + it.c * p;
        const cy = y + it.r * p;
        const right = it.c >= 0;
        return (
          <div key={n} style={{ position: 'absolute', top: cy - s * 0.32, left: right ? cx + s * 0.62 : undefined, right: right ? undefined : W - (cx - s * 0.62), transform: `scale(${mix(q, 0.8, 1)})`, transformOrigin: right ? 'left center' : 'right center', opacity: clamp(q * 2), zIndex: 5 }}>
            <Pill L={L} label={lb.text} size={s * 0.36} style={{ background: L.surface, color: L.ink, boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.07)', fontWeight: 560 }} />
          </div>
        );
      })}
    </div>
  );
};

export const GhostFill = withPace(GhostFillInner);
