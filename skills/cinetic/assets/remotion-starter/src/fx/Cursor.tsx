import React from 'react';
import { C } from '../brand/tokens';
import { clamp, DUR, E, type Ease, expOut, fd, hitPulse, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';

type Pt = { x: number; y: number };

/** Cursor shapes: the arrow (hotspot at its tip), the text I-beam (hotspot at its centre) and the link hand (hotspot at the fingertip). */
export type CursorShape = 'arrow' | 'ibeam' | 'hand';

const ARROW = 'M3 2 L3 33 L10.2 26.4 L15 38 L20.2 35.8 L15.4 24.4 L25 24.4 Z';
// an I-beam with soft serifs, 24 x 46 at scale 1, centred on (12, 23)
const IBEAM =
  'M5 3.5 C8 2.2 10.5 3 12 5.2 C13.5 3 16 2.2 19 3.5 L18.6 6.4 C16.6 5.7 14.6 6.2 13.9 8.2 L13.9 20.6 L16.2 20.6 L16.2 25.4 L13.9 25.4 L13.9 37.8 C14.6 39.8 16.6 40.3 18.6 39.6 L19 42.5 C16 43.8 13.5 43 12 40.8 C10.5 43 8 43.8 5 42.5 L5.4 39.6 C7.4 40.3 9.4 39.8 10.1 37.8 L10.1 25.4 L7.8 25.4 L7.8 20.6 L10.1 20.6 L10.1 8.2 C9.4 6.2 7.4 5.7 5.4 6.4 Z';
// the pointing hand over a link or a button, 28 x 33 at scale 1, the fingertip at (10.5, 1.4)
const HAND =
  'M10.5 1.2 C9.1 1.2 8 2.3 8 3.7 L8 17.2 L6.6 15.8 C5.6 14.8 4 14.8 3 15.8 C2.1 16.7 2 18.1 2.8 19.1 L8.4 27 C9.9 29.3 12.4 30.8 15.2 30.8 L18.2 30.8 C22.1 30.8 25.2 27.7 25.2 23.8 L25.2 15.6 C25.2 14.3 24.2 13.3 22.9 13.3 C21.6 13.3 20.6 14.3 20.6 15.6 L20.6 14.2 C20.6 12.9 19.6 11.9 18.3 11.9 C17 11.9 16 12.9 16 14.2 L16 13.1 C16 11.8 15 10.8 13.7 10.8 C13.4 10.8 13.2 10.8 13 10.9 L13 3.7 C13 2.3 11.9 1.2 10.5 1.2 Z';
const SHAPES: Record<CursorShape, { d: string; w: number; h: number; hot: Pt; stroke: number }> = {
  arrow: { d: ARROW, w: 30, h: 42, hot: { x: 3, y: 2 }, stroke: 2.4 },
  ibeam: { d: IBEAM, w: 24, h: 46, hot: { x: 12, y: 23 }, stroke: 2.2 }, // hotspot at the glyph's centre (it is symmetric)
  hand: { d: HAND, w: 28, h: 33, hot: { x: 10.5, y: 1.4 }, stroke: 2.2 },
};

/**
 * System-style pointer, placed ONLY by transform (hotspot at x, y). A fractional left/top next to a
 * transform snaps to whole pixels, so a slow cursor would stair-step. Use no cursor at all once the
 * product acts on its own.
 *
 * New in this version (all optional; without them it draws exactly as before): `angle` (degrees, about
 * the hotspot: a cursor that swings upright as it lands), `shape` ('arrow' | 'ibeam' | 'hand'), `shadow` ('drop':
 * the soft drop shadow it always had; 'cast': a blurred copy of the shape offset down-right, the shadow of
 * a cursor floating above the UI; 'none'), and `ring` (a press ring from cursorRing(): a thin circle that
 * expands and fades around the hotspot, never a glow).
 */
export const Cursor: React.FC<{
  x: number;
  y: number;
  scale?: number;
  press?: number;
  opacity?: number;
  angle?: number;
  shape?: CursorShape;
  shadow?: 'drop' | 'cast' | 'none';
  ring?: { r: number; opacity: number } | null;
  fill?: string;
  outline?: string;
}> = ({ x, y, scale = 1, press = 0, opacity = 1, angle, shape, shadow, ring, fill = C.ink, outline = C.white }) => {
  if (angle === undefined && shape === undefined && shadow === undefined && ring === undefined) {
    // the 1.1 drawing, unchanged
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          opacity,
          transformOrigin: '0 0',
          transform: `translate(${x}px, ${y}px) scale(${scale * (1 - 0.12 * press)})`,
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.28))',
        }}
      >
        <svg width={30} height={42} viewBox="0 0 30 42" style={{ position: 'absolute', left: -3, top: -2 }}>
          <path d={ARROW} fill={fill} stroke={outline} strokeWidth={2.4} strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  const sh = SHAPES[shape ?? 'arrow'];
  const k = scale * (1 - 0.12 * press);
  const glyph = (paint: string, line: string | undefined, key: string, extra?: React.CSSProperties) => (
    <svg key={key} width={sh.w} height={sh.h} viewBox={`0 0 ${sh.w} ${sh.h}`} style={{ position: 'absolute', left: -sh.hot.x, top: -sh.hot.y, overflow: 'visible', ...extra }}>
      <path d={sh.d} fill={paint} stroke={line} strokeWidth={line ? sh.stroke : 0} strokeLinejoin="round" />
    </svg>
  );
  const mode = shadow ?? 'drop';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity }}>
      {ring && ring.opacity > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 2 * ring.r,
            height: 2 * ring.r,
            borderRadius: '50%',
            boxShadow: `inset 0 0 0 ${(2 * scale).toFixed(2)}px ${fill}`,
            opacity: clamp(ring.opacity),
            transform: `translate(${(x - ring.r).toFixed(3)}px, ${(y - ring.r).toFixed(3)}px)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px) rotate(${(angle ?? 0).toFixed(4)}deg) scale(${k.toFixed(5)})`,
          filter: mode === 'drop' ? 'drop-shadow(0 3px 5px rgba(0,0,0,0.28))' : undefined,
        }}
      >
        {mode === 'cast' && glyph('rgba(0, 0, 0, 0.26)', undefined, 'cast', { transform: `translate(${9}px, ${15}px)`, filter: 'blur(3px)' })}
        {glyph(shape === 'ibeam' ? outline : fill, shape === 'ibeam' ? fill : outline, 'shape')}
      </div>
    </div>
  );
};

/**
 * Point on a bowed path from a to b at eased progress t (0..1). Hands never move in straight
 * lines: the control point sits `bow` of the path length off the chord (0.15-0.25 reads human).
 */
export const cursorArc = (a: Pt, b: Pt, t: number, bow = 0.2): Pt => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const cx = mx - dy * bow; // perpendicular offset (bows to the left of travel; negate bow to flip)
  const cy = my + dx * bow;
  return { x: mix(mix(a.x, cx, t), mix(cx, b.x, t), t), y: mix(mix(a.y, cy, t), mix(cy, b.y, t), t) };
};

/** Click press 0..1 for Cursor's `press` prop: down over 4 f from `at`, recoil over the next 8 f (60 fps frames; `fps` converts). */
export const pressAt = (frame: number, at: number, fps: number = fpsOf()) => {
  const t = ((frame - at) * 60) / fps;
  if (t <= 0 || t >= 12) return 0;
  return t < 4 ? t / 4 : 1 - (t - 4) / 8;
};

// ---- cursor physics ---------------------------------------------------------------------------------
/** One move of the cursor: to `to`, starting `start`, over `dur` frames on `ease`, bowed by `bow`. */
export type CursorMove = { to: Pt; start: number; dur?: number; ease?: Ease; bow?: number };

/**
 * Where the cursor is at frame f after a list of moves from `from` (each move starts where the last one
 * ended). Default move: 44 f at 60 fps on E.glideOut (an approach that lands softly), bow 0.18. Returns
 * the point and its speed (px per frame), closed form.
 */
export const cursorMove = (f: number, from: Pt, moves: CursorMove[], film?: Partial<FilmCtx>): Pt & { v: number } => {
  const fps = fpsOf(film);
  const at = (g: number): Pt => {
    let p = from;
    for (const m of moves) {
      if (g < m.start) break;
      const dur = Math.max(1e-6, m.dur ?? f60x(DUR.cursor[2], fps));
      p = cursorArc(p, m.to, (m.ease ?? E.glideOut)(clamp((g - m.start) / dur)), m.bow ?? 0.18);
      if (g < m.start + dur) return p;
      p = m.to;
    }
    return p;
  };
  const a = at(f);
  const b = at(f - 1);
  return { ...a, v: Math.hypot(a.x - b.x, a.y - b.y) };
};

/**
 * The cursor's tilt: it swings in from `swing.from` degrees to `from` over `swing.frames` (ending at
 * `start`), then settles upright from `from` to 0 over `dur` frames on `ease` (default 36 f at 60 fps on
 * E.settleOut, the exponential-looking settle of a hand coming to rest). Positive = clockwise.
 */
export type CursorTilt = { from: number; start: number; dur?: number; ease?: Ease; swing?: { from: number; frames: number; ease?: Ease } };
export const cursorTilt = (f: number, t: CursorTilt, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  if (f < t.start) {
    if (!t.swing) return t.from;
    const s = clamp((f - (t.start - t.swing.frames)) / Math.max(1e-6, t.swing.frames));
    return mix(t.swing.from, t.from, (t.swing.ease ?? E.snapOut)(s));
  }
  const dur = Math.max(1e-6, t.dur ?? f60x(36, fps));
  return t.from * (1 - (t.ease ?? E.settleOut)(clamp((f - t.start) / dur)));
};

/** House numbers of a cursor rising into the frame: px at 1080p it travels, 60 fps frames, the share of the travel in its first 8 f. */
export const CURSOR_RISE = { from: 400, frames60: 30, k: 5.2, firstShare: 0.75, fade60: 4 } as const;

/**
 * A cursor that enters from straight below the frame and stops on its target (the hand rising to a button): an
 * exponential arrival with 75 % of the travel in its first 8 f at 60 fps (expOut 5.2 over 30 f), fading in over its
 * first 4 f. Returns the point and an opacity; hand the point to cursorMove() as `from` for the moves after it.
 */
export const cursorRise = (f: number, at: number, to: Pt, o: { from?: number; frames?: number } = {}, film?: Partial<FilmCtx>): Pt & { opacity: number } => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const dur = Math.max(1e-6, o.frames ?? f60x(CURSOR_RISE.frames60, fps));
  const t = clamp((f - at) / dur);
  const dy = (o.from ?? CURSOR_RISE.from * u) * (1 - expOut(CURSOR_RISE.k)(t));
  return { x: to.x, y: to.y + dy, opacity: f <= at ? 0 : clamp((f - at) / f60x(CURSOR_RISE.fade60, fps)) };
};

/** A press ring around the hotspot `at` a click: radius from r0 to r1 on E.snapOut over `dur`, opacity on hitPulse (attack 2, tau 6 at 60 fps). */
export const cursorRing = (f: number, at: number, o: { r0?: number; r1?: number; dur?: number; alpha?: number } = {}, film?: Partial<FilmCtx>): { r: number; opacity: number } | null => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const t = f - at;
  if (t <= 0) return null;
  const dur = Math.max(1e-6, o.dur ?? f60x(30, fps));
  if (t >= dur) return null;
  return { r: mix(o.r0 ?? 10 * u, o.r1 ?? 34 * u, E.snapOut(t / dur)), opacity: (o.alpha ?? 0.45) * hitPulse(t, 2, 6, fps) };
};

export type CursorStateProps = {
  from: Pt;
  moves?: CursorMove[];
  tilt?: CursorTilt;
  shape?: CursorShape; // the shape at the start (default arrow)
  switches?: { at: number; to: CursorShape }[]; // shape changes on whole frames (arrow -> ibeam over a text field)
  click?: { at: number; ring?: boolean }; // a press (Cursor's press dip) and an optional ring
};
export type CursorState = Pt & { v: number; angle: number; shape: CursorShape; press: number; ring: { r: number; opacity: number } | null };

/** Everything a cursor does at frame f: position (cursorMove), tilt, shape, press and ring. Pure. */
export const cursorState = (f: number, p: CursorStateProps, film?: Partial<FilmCtx>): CursorState => {
  const fps = fpsOf(film);
  const m = cursorMove(f, p.from, p.moves ?? [], film);
  let shape: CursorShape = p.shape ?? 'arrow';
  for (const s of p.switches ?? []) if (fd(f) >= s.at) shape = s.to;
  const press = p.click ? pressAt(f, p.click.at, fps) : 0;
  const ring = p.click?.ring ? cursorRing(f, p.click.at, {}, film) : null;
  return { ...m, angle: p.tilt ? cursorTilt(f, p.tilt, film) : 0, shape, press, ring };
};

/**
 * What a Cursor instance does on purpose: nothing in its 1.1 form; a shape switch (arrow -> I-beam over a text
 * field) is a designed one-frame change, declared as a one-frame step when the instance's `switches` are passed.
 */
export const declares = (props?: { switches?: { at: number }[]; id?: string }, _film?: Partial<FilmCtx>): Declares => {
  const stepped: SteppedRange[] = (props?.switches ?? []).map((s, i) => ({ from: Math.round(s.at), to: Math.round(s.at) + 1, id: `${props?.id ?? 'cursor'}-${i}` }));
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
