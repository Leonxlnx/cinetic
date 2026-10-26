import React from 'react';
import { clamp, E, type Ease, expOut, fd, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Resize: a card or a field is resized the way a design tool resizes it, not the way an animator would.
 * A short anticipation creep (under 20 % of the change over 12 f at 60 fps), then ONE jump frame that
 * takes 50-70 % of the change, with the corner handles stretched as echo bars from where they were, then
 * a long settle (24 f, exponential). `jumpFrames` 3 gives the field version: a slow-in, a three-frame
 * lunge and a long tail while the caret glides.
 *
 * `mode: 'carry'` is the cut-carry squash instead: a card that opens on a cut at the outgoing card's size and
 * squashes to its own (a statement card arriving at the last card's height, then closing round one line). No
 * creep, no handles: an exponential settle from the cut frame (a 20 f box at 60 fps, 17 % left after 9 f), so the
 * first frames carry the change and the layout around it can read the live box.
 */

export type RBox = { x: number; y: number; w: number; h: number };

/** House numbers: frames at 60 fps, shares of the change. */
export const RESIZE = { creep60: 12, creepShare: 0.15, jump: 0.6, settle60: 24, settleK: 6, handle: 16, echoAlpha: 0.45, carry60: 20, carryK: 3.8 } as const;

export type ResizeProps = {
  at: number; // the creep starts
  from: RBox;
  to: RBox;
  creep?: { frames?: number; share?: number; ease?: Ease }; // 60 fps frames (house 12), share (house 0.15) on E.softIn
  jump?: number; // share of the change on the jump frame(s) (house 0.6)
  jumpFrames?: 1 | 2 | 3; // film frames the jump takes (house 1)
  settle?: { frames?: number; k?: number }; // 60 fps frames (house 24), exponential k (house 6)
  handles?: false | { size?: number }; // px at 1080p (house 16)
  mode?: 'tool' | 'carry'; // tool (default): creep, jump, settle; carry: the cut-carry squash (an exponential settle from `at`)
  carry?: { frames?: number; k?: number }; // 60 fps frames (house 20), exponential k (house 3.8)
  id?: string;
};

export type ResizeState = { p: number; box: RBox; phase: 'before' | 'creep' | 'jump' | 'settle' | 'done'; jumpFrame: boolean; handles: { x: number; y: number; w: number; h: number; echo: boolean; seg?: [number, number, number, number] }[] };

const timing = (p: ResizeProps, fps: number) => {
  const c = Math.round(f60x(p.creep?.frames ?? RESIZE.creep60, fps));
  const j = p.jumpFrames ?? 1;
  const s = Math.max(1, f60x(p.settle?.frames ?? RESIZE.settle60, fps));
  return { c, j, s, jump0: p.at + c, settle0: p.at + c + j };
};

/** Progress 0..1 of the resize at frame f (whole frames inside the jump). */
export const resizeProgress = (frame: number, p: ResizeProps, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  if (p.mode === 'carry') return frame <= p.at ? 0 : expOut(p.carry?.k ?? RESIZE.carryK)(clamp((frame - p.at) / Math.max(1, f60x(p.carry?.frames ?? RESIZE.carry60, fps))));
  const { c, j, s, jump0, settle0 } = timing(p, fps);
  const cs = p.creep?.share ?? RESIZE.creepShare;
  const js = p.jump ?? RESIZE.jump;
  if (frame <= p.at) return 0;
  if (frame < jump0) return cs * (p.creep?.ease ?? E.softIn)(clamp((frame - p.at) / Math.max(1, c)));
  if (fd(frame) < settle0) {
    const k = fd(frame) - jump0 + 1; // 1..j: the jump's own frames, whole
    return cs + js * (j === 1 ? 1 : E.stdInOut(k / j));
  }
  const pj = cs + js;
  return pj + (1 - pj) * expOut(p.settle?.k ?? RESIZE.settleK)(clamp((frame - settle0) / s));
};

/** The box, the phase and the four corner handles (the jump frame stretches them back to where they were). Pure. */
export const resizeState = (frame: number, p: ResizeProps, film?: Partial<FilmCtx>): ResizeState => {
  const fps = fpsOf(film);
  const { s, jump0, settle0 } = timing(p, fps);
  const k = resizeProgress(frame, p, film);
  const lerp = (t: number): RBox => ({ x: mix(p.from.x, p.to.x, t), y: mix(p.from.y, p.to.y, t), w: mix(p.from.w, p.to.w, t), h: mix(p.from.h, p.to.h, t) });
  const box = lerp(k);
  const F = fd(frame);
  const carry = p.mode === 'carry';
  const jumpFrame = !carry && F >= jump0 && F < settle0;
  const carryEnd = p.at + f60x(p.carry?.frames ?? RESIZE.carry60, fps);
  const phase = frame <= p.at ? 'before' : carry ? (frame < carryEnd ? 'settle' : 'done') : F < jump0 ? 'creep' : jumpFrame ? 'jump' : frame < settle0 + s ? 'settle' : 'done';
  const handles: ResizeState['handles'] = [];
  if (p.handles !== false && !carry) {
    const hs = (p.handles?.size ?? RESIZE.handle) * uOf(film);
    const prev = jumpFrame ? lerp(resizeProgress(F - 1, p, film)) : box;
    for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x1 = box.x + cx * box.w - hs / 2;
      const y1 = box.y + cy * box.h - hs / 2;
      if (jumpFrame) {
        const x0 = prev.x + cx * prev.w - hs / 2;
        const y0 = prev.y + cy * prev.h - hs / 2;
        handles.push({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0) + hs, h: Math.abs(y1 - y0) + hs, echo: true, seg: [x0 + hs / 2, y0 + hs / 2, x1 + hs / 2, y1 + hs / 2] });
      }
      handles.push({ x: x1, y: y1, w: hs, h: hs, echo: false });
    }
  }
  return { p: k, box, phase, jumpFrame, handles };
};

/** Sync: creep start, the jump (a click or a snap), the end of the settle. */
export const resizeFrames = (p: ResizeProps, film?: Partial<FilmCtx>) => {
  if (p.mode === 'carry') return { creep: p.at, jump: p.at, settle: p.at, done: Math.ceil(p.at + f60x(p.carry?.frames ?? RESIZE.carry60, fpsOf(film))) };
  const { s, jump0, settle0 } = timing(p, fpsOf(film));
  return { creep: p.at, jump: jump0, settle: settle0, done: Math.ceil(settle0 + s) };
};

/**
 * Draws the resizing element: `children` laid out at the current box (a card that reflows with its size),
 * an outline in `line` and the handles (squares in `handle`, echo bars at partial opacity on the jump).
 */
export const ResizeBox: React.FC<ResizeProps & { frame: number; line?: string; handle?: string; radius?: number; children?: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = resizeState(props.frame, props, film);
  const b = s.box;
  const u = uOf(film);
  const hs = (props.handles === false ? 0 : (props.handles?.size ?? RESIZE.handle)) * u;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, borderRadius: props.radius ?? 0, overflow: 'hidden', transform: `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px)`, ...props.style }}>{props.children}</div>
      {props.line && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, boxSizing: 'border-box', border: `${2 * u}px solid ${props.line}`, borderRadius: props.radius ?? 0, transform: `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px)` }} />
      )}
      {props.handle &&
        s.handles.map((h, i) => (
          h.seg ? (
            // an echo bar: the handle stretched along its path (any angle), not its bounding box
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: Math.hypot(h.seg[2] - h.seg[0], h.seg[3] - h.seg[1]) + hs, height: hs, borderRadius: 3 * u, background: props.handle, opacity: RESIZE.echoAlpha, transformOrigin: '0 0', transform: `translate(${h.seg[0].toFixed(2)}px, ${h.seg[1].toFixed(2)}px) rotate(${Math.atan2(h.seg[3] - h.seg[1], h.seg[2] - h.seg[0]).toFixed(4)}rad) translate(${(-hs / 2).toFixed(2)}px, ${(-hs / 2).toFixed(2)}px)` }} />
          ) : (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: h.w, height: h.h, borderRadius: 3 * u, background: props.handle, opacity: h.echo ? RESIZE.echoAlpha : 1, transform: `translate(${h.x.toFixed(2)}px, ${h.y.toFixed(2)}px)` }} />
          )
        ))}
    </>
  );
};

/** The jump frame(s) are a designed step (one sample: the echo handles must not smear); the carry squash is continuous. */
export const declares = (p?: Partial<ResizeProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined || p.mode === 'carry') return { stepped: [], flashes: [], cameraBlur: [], seams: [] }; // carry: continuous
  const fr = resizeFrames(p as ResizeProps, film);
  return { stepped: [{ from: fr.jump, to: fr.settle, id: p.id ?? 'resize' }], flashes: [], cameraBlur: [], seams: [] };
};
