// BentoFly (ui, enter): on a cut, mixed tiles (photographs, solid tiles, discs, a pill) arrive from every side already
// moving and brake into a bento grid; the tiles from the edge land last.
// Numbers: on its first frame a tile has done `p0` (0.7) of its travel; the rest in `dur` (12) f expo-out, so about
// 80 % of what is left in the first 4 f; travel 0.35 of the frame from its side; delays 0-8 f by tile; radius 20 % of
// a tile's height (discs and pills fully round); gutter 1.4 % of the frame width.
// Caution: it is an entrance on a cut: put the cut on its first frame; real pictures in the photo tiles, one or two
// solid tiles in the brand colour, at most one icon.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { Img, staticFile, useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, ease, mix } from '../../motion';
import { type Look, useUiFrame, withPace } from './_shared';

export type BentoTile = {
  /** Grid cell (column, row) and span. */
  c: number;
  r: number;
  cw?: number;
  rh?: number;
  kind?: 'photo' | 'solid' | 'disc' | 'pill';
  /** A picture in public/ (photo tiles, and a disc that holds a picture). */
  src?: string;
  /** Any node drawn inside the tile (over the fill). */
  node?: React.ReactNode;
  color?: string;
  icon?: string;
  /** The side it arrives from. */
  from: 'left' | 'right' | 'top' | 'bottom';
  /** Frames after the cut it starts (edge tiles 4-8). */
  delay?: number;
};

const BentoFlyInner: React.FC<{
  L: Look;
  tiles: BentoTile[];
  at: number;
  cols?: number;
  rows?: number;
  /** The share of its travel a tile has done on the first frame. */
  p0?: number;
  dur?: number;
  /** The grid's box as shares of the frame (default nearly the whole frame). */
  box?: { x: number; y: number; w: number; h: number };
  speed?: number;
}> = ({ L, tiles, at: start, cols = 4, rows = 3, p0 = 0.7, dur = 12, box = { x: 0.04, y: 0.06, w: 0.92, h: 0.88 }, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = start + (useUiFrame() - start) * speed;
  if (frame < start) return null;
  const g = W * 0.014;
  const bx = box.x * W;
  const by = box.y * H;
  const cw = (box.w * W - g * (cols - 1)) / cols;
  const ch = (box.h * H - g * (rows - 1)) / rows;
  return (
    <>
      {tiles.map((t, i) => {
        const w = cw * (t.cw ?? 1) + g * ((t.cw ?? 1) - 1);
        const h = ch * (t.rh ?? 1) + g * ((t.rh ?? 1) - 1);
        const x = bx + t.c * (cw + g);
        const y = by + t.r * (ch + g);
        const d = t.delay ?? 0;
        // a tile that starts later is further out on the first frame
        const head = Math.max(0, p0 - d * 0.06);
        const q = mix(at(frame, start + d, dur, ease.out), head, 1);
        const qPrev = mix(at(frame - 1, start + d, dur, ease.out), head, 1);
        const travel = (t.from === 'left' || t.from === 'right' ? W : H) * 0.35 + (t.from === 'left' || t.from === 'right' ? w : h) * 0.5;
        const sx = t.from === 'left' ? -1 : t.from === 'right' ? 1 : 0;
        const sy = t.from === 'top' ? -1 : t.from === 'bottom' ? 1 : 0;
        const off = (1 - q) * travel;
        const v = frame > start ? (q - qPrev) * travel : (1 - head) * travel * 0.3;
        const kind = t.kind ?? 'photo';
        const radius = kind === 'disc' ? Math.min(w, h) / 2 : kind === 'pill' ? h / 2 : Math.min(w, h) * 0.2;
        const isRound = kind === 'disc';
        const side = Math.min(w, h);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (isRound ? x + (w - side) / 2 : x) + sx * off,
              top: (isRound ? y + (h - side) / 2 : y) + sy * off,
              width: isRound ? side : w,
              height: isRound ? side : h,
              borderRadius: radius,
              overflow: 'hidden',
              background: t.color ?? L.accent,
              filter: v > 6 ? `blur(${Math.min(6, v * 0.08)}px)` : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {t.src && <Img src={staticFile(t.src)} style={{ position: 'absolute', left: -1, top: -1, width: 'calc(100% + 2px)', height: 'calc(100% + 2px)', objectFit: 'cover' }} />}
            {t.icon && <Icon name={t.icon} size={side * 0.3} color={L.accentInk} stroke={1.8} />}
            {t.node}
          </div>
        );
      })}
    </>
  );
};

export const BentoFly = withPace(BentoFlyInner);
