/**
 * Type in depth: lines on planes at different depths in front of a camera that travels past them, so the copy lives in
 * a space instead of lying flat on the ground (a giant word seen in perspective, its near side soft; statements
 * passing the lens while the read line waits further in).
 *
 *   TypePlanes  lines on planes at depth `z` (px at 1080p; the camera starts at z0 and travels to z1 on E.strongInOut,
 *               then keeps creeping 0.6 px a frame at 60 fps so nothing freezes). A plane `d` px in front of the camera
 *               is drawn at scale perspective / d (house 1400 px: a plane 1400 px away sits at its own size), turned
 *               `turn` degrees about its vertical axis (house 12: a slight perspective, settling frontal for the read
 *               plane unless it names a turn), defocused by its distance from the focus plane (lib/defocus dofSigma:
 *               sharp within 120 px of depth, 10 px at 900; drawn as fixed-radius copies, never an animated radius),
 *               and faded out as it passes the lens (from 260 px in front of the camera to 90). Planes draw far to
 *               near; the focus plane defaults to the last plane where the move ends, so the read line lands sharp.
 *
 * typePlaneState() is pure (any frame, any order); <TypePlanes> draws each plane's line with <TypeLine> inside the
 * plane's transform, so presets and emphasis work in depth. A line read in perspective settles frontal for its read
 * (look-audit type-read): give the read plane `turn: 0` (the default for the last plane).
 */
import React from 'react';
import { TYPE } from '../brand/tokens';
import { clamp, E, type Ease, mix, prog } from '../lib/anim';
import { dofSigma } from '../lib/defocus';
import { f60x, type FilmCtx, fpsOf, useFilm } from '../lib/film';
import { Defocus } from './Defocus';
import type { EmphasisSpec } from './TypeEmphasis';
import type { Declares } from '../timeline';
import { declares as lineDeclares, type TypeColors, TypeLine, type TypePresetName } from './TypePresets';

/** House numbers: px at 1080p, degrees, frames at 60 fps. */
export const DEPTH_TYPE = { perspective: 1400, turn: 12, pass: [260, 90] as const, dof: { focus: 120, range: 900, max: 10 }, creep60: 0.6, step60: 10 } as const;

export type TypePlane = {
  text: string; // *marks* name its key words
  z: number; // the plane's depth (px at 1080p)
  x?: number; // the line's anchor on its plane, px from the frame's centre at the plane's own size
  y?: number;
  turn?: number; // degrees about the vertical axis (default DEPTH_TYPE.turn, alternating sides; the last plane 0)
  role?: keyof typeof TYPE;
  size?: number;
  weight?: number;
  preset?: TypePresetName; // default crisp
  at?: number; // default: the move's start plus 10 f a plane
  emph?: EmphasisSpec;
  colors?: TypeColors;
  align?: 'centre' | 'left' | 'right';
};

export type TypePlanesProps = {
  planes: TypePlane[];
  frame: number;
  z0: number; // the camera's depth at `from`
  z1: number; // and at `to`
  from: number;
  to: number;
  ease?: Ease;
  focus?: number; // the sharp distance in front of the camera (default: the last plane's at the end of the move)
  perspective?: number;
  id?: string;
};

export type PlaneState = { visible: boolean; d: number; s: number; x: number; y: number; turn: number; sigma: number; opacity: number };

/** The camera's depth at frame f: the move, then a creep. Pure. */
export const depthCamZ = (f: number, p: Pick<TypePlanesProps, 'z0' | 'z1' | 'from' | 'to' | 'ease'>, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const dir = Math.sign(p.z1 - p.z0) || 1;
  return mix(p.z0, p.z1, prog(f, p.from, p.to, p.ease ?? E.strongInOut)) + dir * Math.max(0, f - p.to) * DEPTH_TYPE.creep60 * (60 / fps);
};

/**
 * One plane at frame f: its distance from the camera, its scale and on-screen anchor (px from the frame's centre, at
 * 1080p units like `x`), its turn, defocus (px) and opacity. Pure.
 */
export const typePlaneState = (f: number, i: number, p: TypePlanesProps, film?: Partial<FilmCtx>): PlaneState => {
  const pl = p.planes[i];
  const P = p.perspective ?? DEPTH_TYPE.perspective;
  const d = pl.z - depthCamZ(f, p, film);
  const last = p.planes.length - 1;
  const turn = pl.turn ?? (i === last ? 0 : DEPTH_TYPE.turn * (i % 2 ? -1 : 1));
  if (d <= 1) return { visible: false, d, s: 0, x: 0, y: 0, turn, sigma: 0, opacity: 0 };
  const s = P / d;
  const focus = p.focus ?? p.planes[last].z - p.z1;
  const sigma = dofSigma(d - focus, DEPTH_TYPE.dof);
  const [a, b] = DEPTH_TYPE.pass;
  const opacity = clamp((d - b) / (a - b));
  return { visible: opacity > 0.001, d, s, x: (pl.x ?? 0) * s, y: (pl.y ?? 0) * s, turn, sigma, opacity };
};

export const TypePlanes: React.FC<TypePlanesProps> = (p) => {
  const film = useFilm();
  const u = Math.min(film.width, film.height) / 1080;
  const fps = fpsOf(film);
  const P = (p.perspective ?? DEPTH_TYPE.perspective) * u;
  const order = p.planes.map((_, i) => ({ i, st: typePlaneState(p.frame, i, p, film) })).sort((a, b) => b.st.d - a.st.d);
  return (
    <>
      {order.map(({ i, st }) => {
        if (!st.visible) return null;
        const pl = p.planes[i];
        const ax = film.width / 2 + (pl.x ?? 0) * u;
        const ay = film.height / 2 + (pl.y ?? 0) * u;
        const tx = st.x * u - (pl.x ?? 0) * u;
        const ty = st.y * u - (pl.y ?? 0) * u;
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: st.opacity, transformOrigin: `${ax.toFixed(2)}px ${ay.toFixed(2)}px`, transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${st.s.toFixed(5)}) perspective(${P.toFixed(1)}px) rotateY(${st.turn.toFixed(3)}deg)` }}>
            <Defocus sigma={(st.sigma * u) / Math.max(0.05, st.s)} style={{ position: 'absolute', inset: 0 }}>
              <TypeLine
                spec={{ preset: pl.preset ?? 'crisp', text: pl.text, at: pl.at ?? p.from + f60x(DEPTH_TYPE.step60 * i, fps), emph: pl.emph, colors: pl.colors, align: pl.align, id: `${p.id ?? 'plane'}-${i}` }}
                frame={p.frame}
                role={pl.role}
                size={pl.size}
                weight={pl.weight}
                x={ax}
                y={ay}
              />
            </Defocus>
          </div>
        );
      })}
    </>
  );
};

/** The planes' own declares: every plane's line (stepped runs, seams) as TypePresets declares it. */
export const declares = (p?: Partial<TypePlanesProps>, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fps = fpsOf(film);
  (p?.planes ?? []).forEach((pl, i) => {
    const d = lineDeclares({ preset: pl.preset ?? 'crisp', text: pl.text, at: pl.at ?? (p?.from ?? 0) + f60x(DEPTH_TYPE.step60 * i, fps), id: `${p?.id ?? 'plane'}-${i}` }, film);
    out.stepped!.push(...(d.stepped ?? []));
    out.seams!.push(...(d.seams ?? []));
  });
  return out;
};
