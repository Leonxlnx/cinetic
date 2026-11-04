import React from 'react';
import { clamp, E, type Ease, lmix } from '../lib/anim';
import { type FilmCtx, fpsOf, sizeOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';
import type { Rect } from './BlockStep';

export type { Rect } from './BlockStep';

/**
 * Window transition: the next shot opens as a window inside the current one and takes the frame in
 * a few held steps. Each step the window grows (a rect, frame px) while the old shot steps back
 * (its scale drops) until the window is the whole frame. The steps sit on a lower cadence (house
 * 16 fps holds: in a 24 fps film 1, 2, 1, 2 frames; in a 60 fps film 4, 4, 3, 4 ...), so it reads as a
 * designed edit, not a tween; declares() marks the run as stepped.
 *
 * Type window: the next shot shows through the letters of a word that scales up until the image takes
 * the frame, with the title inverting to the light colour on the last step.
 *
 * House numbers: 4 steps on 16 fps, the old shot 1 -> 0.94 -> 0.80 behind a window that grows from a
 * fifth of the frame to all of it; the type window 9 steps at 24 fps, x1.25 a step.
 */
export type WindowProps = {
  start: number; // the frame of step 0 (the window's first appearance is step 1)
  rects: Rect[]; // the window on steps 1..n (the last one may be the frame)
  oldScale?: number[]; // the old shot's scale on steps 0..n (house 1, 1, 0.94, 0.8, 0.8)
  cadence?: 12 | 16 | 20 | 24 | 30; // steps per second (house 16)
  phase?: number; // step phase (house 0.5: the first step comes after a single frame at 24 fps)
  full?: number; // the step on which the new shot is the whole frame (house rects.length + 1)
  radius?: number | number[]; // the window's corner radius, px (one for every step, or per step 1..n): a pill or card that became the window keeps its corners
  id?: string;
};

export type WindowState = {
  step: number; // 0 = before the window, rects.length + 1 = full frame
  rect: Rect | null; // the window now (null before it and once the new shot is full)
  oldScale: number;
  full: boolean; // the new shot fills the frame
};

/** Which held step a frame shows: floor((f - start) x cadence / fps + phase), never negative. */
export const windowStep = (f: number, p: Pick<WindowProps, 'start' | 'cadence' | 'phase'>, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const n = (Math.round(f) - p.start) * ((p.cadence ?? 16) / fps) + (p.phase ?? 0.5);
  return Math.round(f) < p.start ? -1 : Math.floor(n + 1e-9);
};

/** The window at frame f (whole frames: every state is a held step). Pure. */
export const windowState = (f: number, p: WindowProps, film?: Partial<FilmCtx>): WindowState => {
  const step = windowStep(f, p, film);
  const full = p.full ?? p.rects.length + 1;
  const scales = p.oldScale ?? [1, 1, 0.94, 0.8, 0.8];
  const oldScale = scales[clamp(step, 0, scales.length - 1)] ?? 1;
  if (step <= 0) return { step: Math.max(0, step), rect: null, oldScale: scales[0] ?? 1, full: false };
  if (step >= full) return { step, rect: null, oldScale, full: true };
  return { step, rect: p.rects[Math.min(p.rects.length - 1, step - 1)], oldScale, full: false };
};

/** The frames a window transition spans: from its start to the first full-frame step. */
export const windowFrames = (p: WindowProps, film?: Partial<FilmCtx>) => {
  const full = p.full ?? p.rects.length + 1;
  let f = p.start;
  while (windowStep(f, p, film) < full && f < p.start + 600) f++;
  return { start: p.start, full: f };
};

/**
 * Renders a window transition: `old` scaled about the frame centre by the step's scale, `next` seen
 * through the window rect (clip-path inset in frame px), then `next` alone. `frame` is local.
 */
export const Window: React.FC<WindowProps & { frame: number; old: React.ReactNode; next: React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const { width, height } = film;
  const s = windowState(props.frame, props, film);
  if (s.full) return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>{props.next}</div>;
  const r = s.rect;
  const rad = Array.isArray(props.radius) ? (props.radius[Math.max(0, s.step - 1)] ?? 0) : (props.radius ?? 0);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${width / 2}px ${height / 2}px`, transform: `scale(${s.oldScale})` }}>{props.old}</div>
      {r && (
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${r.y.toFixed(2)}px ${(width - r.x - r.w).toFixed(2)}px ${(height - r.y - r.h).toFixed(2)}px ${r.x.toFixed(2)}px${rad > 0 ? ` round ${rad.toFixed(2)}px` : ''})` }}>
          {props.next}
        </div>
      )}
    </div>
  );
};

/** A type window: the next shot inside the letters of `text`, scaling per step, inverting on the last. */
export type TypeWindowProps = {
  start: number;
  steps?: number; // house 9
  from?: number; // the word's scale on step 0 (house 1)
  to?: number; // its scale on the last step (house 7.5: the letters are wider than the frame)
  ease?: Ease; // spread of the scale over the steps, in log space (house E.buildIn)
  cadence?: 12 | 16 | 20 | 24 | 30; // steps per second (house 24)
  id?: string;
};

/** The type window at frame f: its step, the word's scale and whether the image has taken the frame. */
export const typeWindowState = (f: number, p: TypeWindowProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const steps = Math.max(1, Math.round(p.steps ?? 9));
  const step = Math.round(f) < p.start ? -1 : Math.floor((Math.round(f) - p.start) * ((p.cadence ?? 24) / fps) + 1e-9);
  const t = clamp(step / (steps - 1));
  const scale = lmix(p.from ?? 1, p.to ?? 7.5, (p.ease ?? E.buildIn)(t));
  return { step, scale, taken: step >= steps - 1, inverted: step >= steps - 1 };
};

export const TypeWindow: React.FC<
  TypeWindowProps & { frame: number; text: string; textStyle: React.CSSProperties; image: React.ReactNode; old?: React.ReactNode; light?: string; origin?: { x: number; y: number } }
> = (props) => {
  const film = useFilm();
  const { width, height } = sizeOf(film);
  const s = typeWindowState(props.frame, props, film);
  const o = props.origin ?? { x: width / 2, y: height / 2 };
  if (s.step < 0) return <>{props.old}</>;
  if (s.taken)
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {props.image}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ ...props.textStyle, color: props.light ?? '#FFFFFF' }}>{props.text}</span>
        </div>
      </div>
    );
  // the next shot is clipped by the word's glyphs (an SVG text clip over a foreignObject), scaled about the origin
  const clipId = `tw-${props.id ?? 'type'}`;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {props.old}
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <clipPath id={clipId}>
            <text
              x={o.x}
              y={o.y}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`translate(${o.x} ${o.y}) scale(${s.scale.toFixed(4)}) translate(${-o.x} ${-o.y})`}
              style={props.textStyle}
            >
              {props.text}
            </text>
          </clipPath>
        </defs>
        <foreignObject x={0} y={0} width={width} height={height} clipPath={`url(#${clipId})`}>
          <div style={{ position: 'relative', width, height }}>{props.image}</div>
        </foreignObject>
      </svg>
    </div>
  );
};

/** A window transition is stepped (held frames on its cadence) and a `mask` seam on its full-frame step. */
export const declares = (p?: Partial<WindowProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined || !p.rects) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = windowFrames(p as WindowProps, film);
  const id = p.id ?? 'window';
  const cad = p.cadence ?? 16;
  const stepFps = (cad === 24 ? undefined : cad) as 12 | 16 | 20 | 30 | undefined;
  return {
    stepped: [{ from: fr.start, to: fr.full + 1, ...(stepFps ? { fps: stepFps } : {}), id }],
    flashes: [],
    cameraBlur: [],
    seams: [{ at: fr.full, kind: 'mask', carry: 'shape', id }],
  };
};

