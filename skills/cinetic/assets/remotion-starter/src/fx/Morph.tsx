import { interpolatePath } from '@remotion/paths';
import React from 'react';
import { clamp, E, Ease, prog, Spr, spr } from '../lib/anim';
import { morphBox, type MorphBox } from '../lib/box';
import { f60, type FilmCtx, fpsOf, paceOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

// The box state and its clamped blend live in lib/box.ts (shared with other primitives); re-exported here.
export { morphBox, type MorphBox } from '../lib/box';

/**
 * A shape morph between two SVG path strings (parent px) at progress p: interpolatePath of
 * @remotion/paths (the paths need not share commands). Clamped to 0..1, so a spring never overshoots
 * the outline into a self-intersection.
 */
export const morphPath = (a: string, b: string, p: number) => interpolatePath(clamp(p), a, b);

/**
 * Container morph: one rounded rect travels from state A to state B (x, y, w, h, radius, fill,
 * stroke and shadow together) on one progress, for pill -> card, button -> panel, caret -> pill.
 * Content A fades out over the first 35% and content B fades in over the last 40% (E.smooth), so
 * the container is empty while it moves fastest and no frame shows both at full strength (a
 * crossfade of two layouts reads as a double exposure). Content keeps its own size (text is never
 * scaled) and stays where its own state puts it, laid out in that state's box and revealed or
 * hidden by the moving, clipping rounded box (the shared-element mask of references/transitions.md
 * §4.2). Content that rode with the box would cross the slow ends of the move and settle in 1 px
 * vertical ticks (references/chromium-rendering.md §15). Defaults at 60 fps: pace.fx.morph
 * frames on E.inOut (calm 52 f, crisp 40 f),
 * timed by the clock; pass `spring` (SPR.firm) to drive geometry and fades by the spring instead
 * (not an overshooting one when the box shrinks: it clamps at 0 and vanishes for the overshoot).
 * Placed by transform only (left: 0; top: 0);
 * width, height and radius are real sizes, so the radius and stroke never distort the way a
 * scaled box would. The stroke draws above the content, so content at the edge never covers it.
 */
export const Morph: React.FC<{
  frame: number; // local frame
  start: number;
  A: MorphBox;
  B: MorphBox;
  a?: React.ReactNode; // content of state A, laid out in an A.w x A.h box
  b?: React.ReactNode; // content of state B, laid out in a B.w x B.h box
  dur?: number;
  ease?: Ease;
  spring?: Spr;
  style?: React.CSSProperties;
  /** Optional outline morph: the container is drawn as path `a` -> `b` (parent px) instead of a rounded rect; content is clipped by it. */
  path?: { a: string; b: string };
  seam?: boolean | string; // declare this morph as a shot seam (an id, or true)
}> = ({ frame, start, A, B, a, b, dur: durProp, ease = E.inOut, spring, style, path }) => {
  const film = useFilm();
  const dur = durProp ?? f60(film.pace.fx.morph, film.fps);
  const p = spring ? spr(frame, start, spring, film.fps) : prog(frame, start, start + dur, ease);
  const u = spring ? clamp(p) : clamp((frame - start) / Math.max(1, dur)); // the content's clock
  const m = morphBox(A, B, p);
  const outA = 1 - prog(u, 0, 0.35, E.smooth);
  const inB = prog(u, 0.6, 1, E.smooth);
  // content at its own state's place in the parent, so it never moves while the box does
  const place = (S: MorphBox) => `translate(${(S.x - m.x).toFixed(3)}px, ${(S.y - m.y).toFixed(3)}px)`;
  if (path) {
    // the outline morph: one SVG path for the container, the same path clipping the content, all in parent px
    const d = morphPath(path.a, path.b, p);
    const clip = `path("${d}")`;
    const sh0 = m.shadow;
    return (
      <div style={{ position: 'absolute', inset: 0, ...style }}>
        <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
          <path d={d} fill={m.fill} stroke={m.strokeW > 0.01 ? m.stroke : 'none'} strokeWidth={m.strokeW} style={sh0.a > 0.001 ? { filter: `drop-shadow(0 ${sh0.y.toFixed(2)}px ${(sh0.blur / 2).toFixed(2)}px rgba(0,0,0,${sh0.a.toFixed(3)}))` } : undefined} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, clipPath: clip }}>
          {a !== undefined && outA > 0.001 && <div style={{ position: 'absolute', left: 0, top: 0, width: A.w, height: A.h, opacity: outA, transform: `translate(${A.x.toFixed(3)}px, ${A.y.toFixed(3)}px)` }}>{a}</div>}
          {b !== undefined && inB > 0.001 && <div style={{ position: 'absolute', left: 0, top: 0, width: B.w, height: B.h, opacity: inB, transform: `translate(${B.x.toFixed(3)}px, ${B.y.toFixed(3)}px)` }}>{b}</div>}
        </div>
      </div>
    );
  }
  const box: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: m.w, height: m.h, borderRadius: m.r };
  const sh = m.shadow;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${m.x.toFixed(3)}px, ${m.y.toFixed(3)}px)`, ...style }}>
      <div
        style={{
          ...box,
          overflow: 'hidden',
          background: m.fill,
          boxShadow: sh.a > 0.001 ? `0 ${sh.y.toFixed(2)}px ${sh.blur.toFixed(2)}px rgba(0,0,0,${sh.a.toFixed(3)})` : undefined,
        }}
      >
        {a !== undefined && outA > 0.001 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: A.w, height: A.h, opacity: outA, transform: place(A) }}>{a}</div>
        )}
        {b !== undefined && inB > 0.001 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: B.w, height: B.h, opacity: inB, transform: place(B) }}>{b}</div>
        )}
      </div>
      {m.strokeW > 0.01 && <div style={{ ...box, boxShadow: `inset 0 0 0 ${m.strokeW.toFixed(2)}px ${m.stroke}` }} />}
    </div>
  );
};

/**
 * What a Morph instance does on purpose: nothing in its 1.1 form; with `seam` it is a `morph` seam
 * carrying the shape on its last frame (the container carries the film across a cut).
 */
export const declares = (props?: { start?: number; dur?: number; seam?: boolean | string }, film?: Partial<FilmCtx>): Declares => {
  if (!props || !props.seam || props.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const dur = props.dur ?? f60(paceOf(film).fx.morph, fpsOf(film));
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: Math.round(props.start + dur), kind: 'morph', carry: 'shape', id: typeof props.seam === 'string' ? props.seam : 'morph' }] };
};
