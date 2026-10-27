// What every act of the walkthrough shares: the two stages (a light paper for the statements, the mid slate for the
// product), the absolute frame, a line of the script set on one line and sized to fit, and a camera for one layer.
// Retell it in the dealt direction's world (out/DIRECTION.md): its grounds, light and type replace this floor; the
// product's own screens replace the kit parts the acts use.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, SAFE, TYPE, typeStyle, U } from '../brand/tokens';
import { Words, type WordsSpec } from '../fx/Words';
import { kitTheme } from '../kit';
import { fitSize } from '../lib/measure';
import { ACT, type ActName, copy, H, W } from '../timeline';

/** The statements' stage (a tinted paper) and the product's stage (the mid slate): neutral grounds, one accent. */
export const LIGHT = kitTheme('tintedPaper', C.accent);
export const DARK = kitTheme('slateMid', C.accent);

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/**
 * The size a line of the script is set at: its role's size, smaller only when it would not fit `share` of the safe
 * width. The default share keeps a statement under 61 % of the frame (the layout audit's statement width) with room
 * for a hold's creep and a push into the cut; pass a larger share only for a payoff or a giant word.
 */
export const LINE_SHARE = 0.64;
export const lineSize = (text: string, role: 'line' | 'display' = 'line', share = LINE_SHARE) =>
  Math.min(TYPE[role].size * U, fitSize(text, (W - 2 * SAFE.x) * share, TYPE[role].size * U, TYPE[role].weight, TYPE[role].track));

/**
 * A line of the script (a COPY entry) on one line, centred on the frame at `top` (px), revealed word by word at the
 * film's pace and launched out at its `out` frame toward `exitDir`, its last frame `exitAt` (the cut).
 */
export const ScriptLine: React.FC<{ id: string; F: number; top: number; color: string; role?: 'line' | 'display'; exitDir?: WordsSpec['exitDir']; exitAt?: number; size?: number; spec?: Partial<WordsSpec> }> = ({ id, F, top, color, role = 'line', exitDir = 'up', exitAt, size, spec }) => {
  const c = copy(id);
  const px = size ?? lineSize(c.text, role);
  if (F < c.in - 1) return null;
  return (
    <div style={{ position: 'absolute', left: 0, top, width: W, display: 'flex', justifyContent: 'center' }}>
      <Words id={id} text={c.text} frame={F} start={c.in} size={px} out={c.out} exit="launch" exitDir={exitDir} exitAt={exitAt} {...spec} style={{ ...typeStyle(role, px), color }} />
    </div>
  );
};

/** A layer scaled by `k` about the screen point (ox, oy) and moved by (dx, dy): the act's camera on its world. */
export const Cam: React.FC<{ k?: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ k = 1, ox = W / 2, oy = H / 2, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>{children}</div>
);

/** Absolutely placed content, its top-left at (x, y) px, `w` x `h`. */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`, ...style }}>{children}</div>
);
