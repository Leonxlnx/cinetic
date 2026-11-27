// DotLattice (ground, build / idle): a fine lattice of dots (round, ring or square LEDs) on black, lit from inside by
// slow pools that drift, filled in a wave from a point, with a hole that opens for the type.
// The hole is rounded and soft: inside it no dots, past its edge the dots grow back to full size over 0.7 of its half
// size, so the type sits in a clearing of the lattice, never on a black box.
// Numbers: pitch 12 px at 1080, dots 0.6 of the pitch, unlit at 9 % white, pools 0.35 of the height lifting dots to
// 55 %, drifting about 0.04 of the width a second; the fill front crosses the frame in about 24 f, each dot pops in 4 f.
// Caution: the light is in the dots, never a haze over them; keep the pools slow and the type off the brightest pool.
// Catalogue: ../catalog/ground.ts; props and recipe: references/library-grounds.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, clamp, ease, rand } from '../../motion';
import { parseColor } from '../../world';
import { FrameCanvas, unit } from './_shared';

/** How far past the hole's edge the dots grow back to full size, as a share of the hole's half size. */
const HOLE_FEATHER = 0.7;

/**
 * DotLattice: a dot screen as a ground. `fill` brings the dots in as a wave from (x, y) (shares of the frame);
 * `pools` lit areas wander slowly; `hole` clears a rounded box at the centre (shares of the frame) from `hole.at`.
 */
export const DotLattice: React.FC<{
  ground?: string;
  /** The dots' colour (lit). */
  color?: string;
  /** Dot pitch as a share of the frame height (0.011 = 12 px at 1080). */
  pitch?: number;
  /** Dot size as a share of the pitch. */
  size?: number;
  shape?: 'round' | 'ring' | 'square';
  /** Opacity of an unlit dot. */
  base?: number;
  /** Lit pools (0: an even lattice). */
  pools?: number;
  /** Extra opacity at a pool's centre. */
  lit?: number;
  fill?: { at: number; dur?: number; x?: number; y?: number };
  hole?: { at: number; w: number; h: number; dur?: number };
  speed?: number;
  seed?: number;
}> = ({ ground = '#050507', color = '#FFFFFF', pitch = 0.011, size = 0.6, shape = 'ring', base = 0.12, pools = 2, lit = 0.55, fill, hole, speed = 1, seed = 2 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const u = unit(H);
  const draw = (g: CanvasRenderingContext2D) => {
    g.fillStyle = ground;
    g.fillRect(0, 0, W, H);
    const rgb = parseColor(color) ?? [255, 255, 255];
    const p = Math.max(4, pitch * H);
    const r = (p * size) / 2;
    const t = (f / fps) * speed;
    const P = Array.from({ length: pools }, (_, i) => ({
      x: W * (0.5 + 0.38 * Math.sin(t * 0.21 + rand(seed + i) * 6.28)),
      y: H * (0.5 + 0.34 * Math.cos(t * 0.17 + rand(seed + i * 5) * 6.28)),
      r: 0.35 * H * (0.8 + 0.4 * rand(seed + i * 9)),
    }));
    const fx = (fill?.x ?? 0.5) * W;
    const fy = (fill?.y ?? 0.5) * H;
    const fdur = fill?.dur ?? 24;
    const reach = Math.hypot(Math.max(fx, W - fx), Math.max(fy, H - fy));
    const hp = hole ? prog(f, hole.at, hole.dur ?? 10, ease.out) : 0;
    const hw = hole ? (hole.w * W * hp) / 2 : 0;
    const hh = hole ? (hole.h * H * hp) / 2 : 0;
    const cols = Math.ceil(W / p) + 1;
    const rows = Math.ceil(H / p) + 1;
    const offX = (W - (cols - 1) * p) / 2;
    const offY = (H - (rows - 1) * p) / 2;
    g.lineWidth = Math.max(1, r * 0.34);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = offX + i * p;
        const y = offY + j * p;
        let s = 1;
        if (hole && hp > 0) {
          // a rounded hole (a superellipse) whose dots shrink toward the type instead of a hard-edged box
          const dn = ((Math.abs(x - W / 2) / hw) ** 3 + (Math.abs(y - H / 2) / hh) ** 3) ** (1 / 3);
          if (dn < 1) continue;
          const m = clamp((dn - 1) / HOLE_FEATHER);
          s = m * m * (3 - 2 * m);
          if (s < 0.08) continue;
        }
        if (fill) {
          const d = Math.hypot(x - fx, y - fy) / reach;
          const born = fill.at + d * fdur + rand(i * 7.1 + j * 13.3 + seed) * 4;
          s *= ease.out(clamp((f - born) / 4));
          if (s <= 0) continue;
        }
        let a = base;
        for (const q of P) {
          const d = Math.hypot(x - q.x, y - q.y) / q.r;
          if (d < 1) a += lit * (0.5 + 0.5 * Math.cos(Math.PI * d)) ** 2;
        }
        a = clamp(a);
        const rr = r * s;
        if (shape === 'square') {
          g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
          g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        } else {
          g.beginPath();
          g.arc(x, y, rr, 0, Math.PI * 2);
          if (shape === 'ring') {
            g.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
            g.stroke();
          } else {
            g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
            g.fill();
          }
        }
      }
    }
    void u;
  };
  return <FrameCanvas width={W} height={H} draw={draw} deps={[f, ground, color, pitch, size, shape, base, pools, lit, JSON.stringify(fill), JSON.stringify(hole), speed, seed]} />;
};
