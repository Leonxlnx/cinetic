// What every act of the reel shares: three grounds (a light paper, a deep ink stage for the record, the accent for the
// claim), the absolute frame, a line of the script set on one line and sized to fit, and placement helpers.
// Retell it in the dealt direction's world (out/DIRECTION.md): its grounds, light and type replace this floor; the
// product's own record replaces the kit parts the record act uses.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, SAFE, TYPE, U } from '../brand/tokens';
import { kitTheme } from '../kit';
import { fitSize } from '../lib/measure';
import { ACT, type ActName, H, W } from '../timeline';

/** The paper, the ink stage (a tinted near-black, never #000) and the theme on the accent. */
export const LIGHT = kitTheme('tintedPaper', C.accent);
export const INK = kitTheme('inkStage', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/** The size a line of the script is set at: its role's size, smaller only when it would not fit `share` of the safe width. */
export const lineSize = (text: string, role: 'line' | 'display' | 'hero' = 'line', share = 1) =>
  Math.min(TYPE[role].size * U, fitSize(text, (W - 2 * SAFE.x) * share, TYPE[role].size * U, TYPE[role].weight, TYPE[role].track));

/** Absolutely placed content, its top-left at (x, y) px. */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`, ...style }}>{children}</div>
);

/** A layer scaled by `k` about the screen point (ox, oy) and moved by (dx, dy). */
export const Cam: React.FC<{ k?: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ k = 1, ox = W / 2, oy = H / 2, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>{children}</div>
);
