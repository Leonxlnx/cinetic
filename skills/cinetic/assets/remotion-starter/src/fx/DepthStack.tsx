import React from 'react';
import { clamp, E, type Ease } from '../lib/anim';
import { type CamMove, camPath, camera, type Shot, weighShot } from '../lib/camera';
import { type FilmCtx, f60x, fpsOf, sizeOf, useFilm } from '../lib/film';
import { FILM_LIGHT, type FilmLight, type Tilt } from '../lib/light';
import type { Declares } from '../timeline';
import { Defocus } from './Defocus';
import { RimEdge, rimLine } from './Lit';

/**
 * DepthStack: a beat with several objects (cards, tiles, chips, marks, rows) spread over three planes, so the frame
 * reads as a space and not as one sheet of paper, with a camera that moves through it.
 *
 *   plane   scale   blur   parallax   turn
 *   far     0.6     6 px   0.5        facing the camera (house turn 0); a receding wall (8-25 deg) only when declared
 *   mid     1       0      1          the subject: sharp, readable, where the copy and the product sit
 *   near    1.4     10 px  1.6        the soft foreground: big, defocused, crossing near a frame edge
 *
 * Each plane is one world layer drawn through the camera (lib/camera camera()) under its own parallaxed shot: a
 * plane of weight w takes w of the camera's pan and look and zooms at w on log scale (lib/camera weighShot), so
 * on a push the near plane grows 1.6x as fast and slides out past the edges while the far wall barely moves, and a
 * yaw swings the near plane furthest. Blur is a fixed level per plane (lib/defocus: one or two static copies, never
 * an animated radius). The near plane fades out as it passes the lens (its zoom past `pass`), so the camera really
 * goes through it. Items sit in their plane by transform (translate3d, never left/top), drawn at the plane's scale
 * about their own centre, facing the camera (an item's own `tilt` is a declared turn, never a resting pose: lint-film
 * card-tilt); `rim` gives every item the film's key-side rim (fx/Lit RimEdge) from its plane's
 * turn plus its own. An item may arrive (E.glideOut from 12 % smaller and 40 px lower, 34 f at 60 fps).
 *
 * Every layer carries real content: every element in frame has a job. Each item says what it shows (`carries`: the
 * product's UI, a line of text, a mark, an icon, a photo, a number) and its render draws that, legible as that thing
 * even when its plane is soft: a far tile is a real screen or a mark at 0.6, a near one a real card crossing the edge.
 * The stack draws nothing of its own (no spacer plates, no blank cards, no glow behind the planes), and an item that
 * does not say what it carries is drawn with data-filler on its box; depthFiller() lists those items, lint-film warns
 * on them (filler-plate) and look-audit fails faint blank shapes in the render (filler-shape). A blank rounded box
 * floating at depth is the filler the eye reads as machine-made.
 *
 * The camera: give `cam` (moves on a base shot, or any ShotFn); the house move is depthPush(): a push of x1.32 with a
 * 90 px pan and a 6 degree yaw over 120 f at 60 fps on E.strongInOut that lands, then a sub-pixel creep (4 % over 10 s).
 * depthStackState() is pure (any frame, any order, any fps); <DepthStack> draws it.
 */

/** House numbers: px at 1080p, degrees, 60 fps frames. */
export const DEPTH = {
  planes: {
    far: { scale: 0.6, blur: 6, parallax: 0.5 },
    mid: { scale: 1, blur: 0, parallax: 1 },
    near: { scale: 1.4, blur: 10, parallax: 1.6 },
  },
  farTurn: 0, // deg, the far plane's turn (house 0: facing the camera; rotateY 8-25 for a declared receding wall, farAxis 'x' for a tabletop)
  farTurnRange: [8, 25] as const,
  perspective: 2200,
  pass: [1.2, 1.5] as const, // the near plane's own zoom over which it fades out as it passes the lens (gone before the house push lands)
  push: { zoom: 1.32, pan: -90, yaw: 6, frames60: 120, creep: 1.04, creep60: 600 },
  enter: { frames60: 34, scale: 0.88, rise: 40 },
} as const;

export type DepthPlane = keyof typeof DEPTH.planes;
export type PlaneSpec = { scale: number; blur: number; parallax: number };
/** What an item shows: its job in the frame. */
export type DepthContent = 'ui' | 'text' | 'mark' | 'icon' | 'photo' | 'data';
export const DEPTH_CONTENT: readonly DepthContent[] = ['ui', 'text', 'mark', 'icon', 'photo', 'data'];

export type DepthItem = {
  id: string;
  plane: DepthPlane;
  carries?: DepthContent; // what it shows (the product's UI, a line, a mark, an icon, a photo, a number); none: a filler item
  x: number; // the item's centre at rest, screen px (camera at its base shot)
  y: number;
  w: number; // the item's own size before the plane's scale, px
  h: number;
  rot?: number; // deg, its own rotateZ (keep within 11)
  tilt?: Tilt; // deg, its own turn in its plane: a declared turn only (animate it, landing face-on); a constant tilt is a card tilted at rest (lint-film card-tilt)
  r?: number; // corner radius for the rim (house 12 % of the short side; a pill: h / 2)
  at?: number; // frame it starts to arrive (none: present from the start)
};

export type DepthCam = { base?: Shot; moves: readonly CamMove[] } | ((f: number) => Shot);

export type DepthStackProps = {
  items: readonly DepthItem[];
  cam?: DepthCam; // the camera through the stack (house: depthPush(0))
  farTurn?: number; // deg, signed (house 0; a declared receding wall |turn| 8-25)
  farAxis?: 'y' | 'x'; // a receding wall (yaw) or a tabletop (pitch)
  planes?: Partial<Record<DepthPlane, Partial<PlaneSpec>>>;
  pass?: readonly [number, number] | false; // fade the near plane out between these zooms of its own (house 1.2-1.5)
  enter60?: number; // an item's arrival, 60 fps frames (house 34)
  ease?: Ease; // the arrival curve (house E.glideOut)
  shutter?: { from: number; to: number; id?: string }; // a camera-blur range to declare (a fast pass through the near plane)
  perspective?: number; // px (house 2200)
  rim?: boolean | { alpha?: number; color?: string }; // a 1 px rim on each item's key side (fx/Lit RimEdge), from its plane's turn and its own
  light?: FilmLight; // the film's light for the rims (house FILM_LIGHT)
};

export type DepthItemState = { id: string; plane: DepthPlane; x: number; y: number; w: number; h: number; scale: number; opacity: number; rot: number; tilt: { x: number; y: number }; turn: { x: number; y: number }; box: { x: number; y: number; w: number; h: number } };
export type DepthPlaneState = { plane: DepthPlane; shot: Shot; blur: number; opacity: number; spec: PlaneSpec };
export type DepthStackState = { planes: DepthPlaneState[]; items: DepthItemState[] };

/** The house move through a stack starting at frame `at`: a push with a pan and a small yaw, then a creep. */
export const depthPush = (at: number, o: { frames?: number; zoom?: number; pan?: number; yaw?: number; ease?: Ease; film?: Partial<FilmCtx> } = {}): CamMove[] => {
  const fps = fpsOf(o.film);
  const frames = o.frames ?? f60x(DEPTH.push.frames60, fps);
  return [
    { at, frames, zoom: o.zoom ?? DEPTH.push.zoom, pan: { x: o.pan ?? DEPTH.push.pan }, yaw: o.yaw ?? DEPTH.push.yaw, ease: o.ease ?? E.strongInOut },
    { at: at + frames * 0.75, frames: f60x(DEPTH.push.creep60, fps), zoom: DEPTH.push.creep, ease: E.linear }, // a sub-pixel creep after the landing (one way, never back)
  ];
};

const specOf = (p: DepthStackProps, plane: DepthPlane): PlaneSpec => ({ ...DEPTH.planes[plane], ...(p.planes?.[plane] ?? {}) });

/** The camera's shot at frame f (default: the frame centre, depthPush from frame 0). */
export const depthCamShot = (f: number, p: DepthStackProps, film?: Partial<FilmCtx>): { shot: Shot; base: Shot } => {
  const { width: W, height: H } = sizeOf(film);
  const centre: Shot = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 };
  const cam = p.cam ?? { moves: depthPush(0, { film }) };
  if (typeof cam === 'function') return { shot: cam(f), base: cam(0) };
  const base = cam.base ?? centre;
  return { shot: camPath(f, base, cam.moves), base };
};

/** A plane's shot under the camera: w of the pan, look and turn, zoom at w on log scale (lib/camera weighShot); the far plane turned. */
export const planeShot = (shot: Shot, base: Shot, spec: PlaneSpec, extra: { yaw?: number; pitch?: number } = {}): Shot => weighShot(shot, base, spec.parallax, extra);

/** Every plane's shot, blur and opacity and every item's place at frame f. Pure. */
export const depthStackState = (frame: number, p: DepthStackProps, film?: Partial<FilmCtx>): DepthStackState => {
  const fps = fpsOf(film);
  const { shot, base } = depthCamShot(frame, p, film);
  const turn = p.farTurn ?? DEPTH.farTurn;
  const pass = p.pass === false ? null : (p.pass ?? DEPTH.pass);
  const planes: DepthPlaneState[] = (['far', 'mid', 'near'] as DepthPlane[]).map((plane) => {
    const spec = specOf(p, plane);
    const extra = plane === 'far' ? ((p.farAxis ?? 'y') === 'y' ? { yaw: turn } : { pitch: turn }) : {};
    const s = planeShot(shot, base, spec, extra);
    const own = s.k / Math.max(1e-6, base.k);
    const opacity = plane === 'near' && pass ? 1 - clamp((own - pass[0]) / Math.max(1e-6, pass[1] - pass[0])) : 1;
    return { plane, shot: s, blur: spec.blur, opacity, spec };
  });
  const dur = Math.max(1, f60x(p.enter60 ?? DEPTH.enter.frames60, fps));
  const ease = p.ease ?? E.glideOut;
  const items: DepthItemState[] = p.items.map((it) => {
    const pl = planes.find((q) => q.plane === it.plane) as DepthPlaneState;
    const q = it.at === undefined ? 1 : ease(clamp((frame - it.at) / dur));
    const scale = pl.spec.scale * (DEPTH.enter.scale + (1 - DEPTH.enter.scale) * q);
    const y = it.y + DEPTH.enter.rise * (1 - q) * pl.spec.scale;
    // screen box under the plane's flat shot (rotation ignored): for crop and overlap checks
    const k = pl.shot.k;
    const cx = pl.shot.sx + (it.x - pl.shot.ax) * k;
    const cy = pl.shot.sy + (y - pl.shot.ay) * k;
    const bw = it.w * scale * k;
    const bh = it.h * scale * k;
    return {
      id: it.id,
      plane: it.plane,
      x: it.x,
      y,
      w: it.w,
      h: it.h,
      scale,
      opacity: it.at === undefined ? 1 : clamp(q / 0.3),
      rot: it.rot ?? 0,
      tilt: { x: it.tilt?.x ?? 0, y: it.tilt?.y ?? 0 },
      turn: { x: (pl.shot.pitch ?? 0) + (it.tilt?.x ?? 0), y: (pl.shot.yaw ?? 0) + (it.tilt?.y ?? 0) }, // what the light sees: plane and own turn
      box: { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh },
    };
  });
  return { planes, items };
};

/** The items that do not say what they carry (no `carries`, or not one of DEPTH_CONTENT): filler until they do. Pure. */
export const depthFiller = (items: readonly Pick<DepthItem, 'id' | 'carries'>[]) => items.filter((it) => !it.carries || !DEPTH_CONTENT.includes(it.carries)).map((it) => it.id);

/** Sync: the camera's moves (start, the frame it is home) and each item's arrival and landing. */
export const depthStackFrames = (p: DepthStackProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const cam = p.cam ?? { moves: depthPush(0, { film }) };
  const moves = typeof cam === 'function' ? [] : cam.moves.map((m) => ({ at: m.at, home: Math.ceil(m.at + m.frames) }));
  const dur = f60x(p.enter60 ?? DEPTH.enter.frames60, fps);
  return { moves, items: p.items.filter((it) => it.at !== undefined).map((it) => ({ id: it.id, at: it.at as number, home: Math.ceil((it.at as number) + dur) })) };
};

/**
 * Draws the stack: far, mid and near planes as sibling world layers (one camera transform each), the far and near
 * ones softened at their fixed levels. `render(id, state)` draws an item in its own w x h box.
 */
export const DepthStack: React.FC<DepthStackProps & { frame: number; render: (id: string, s: DepthItemState) => React.ReactNode; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const s = depthStackState(props.frame, props, film);
  const light = props.light ?? FILM_LIGHT;
  const rim = props.rim ? (props.rim === true ? {} : props.rim) : null;
  const carries = new Map(props.items.map((d) => [d.id, d.carries && DEPTH_CONTENT.includes(d.carries) ? d.carries : undefined]));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', ...props.style }}>
      {s.planes.map((pl) => {
        const items = s.items.filter((it) => it.plane === pl.plane);
        if (!items.length || pl.opacity <= 0.001) return null;
        const layer = (
          <div style={{ ...camera(pl.shot, props.perspective ?? DEPTH.perspective), width: W, height: H }}>
            {items.map((it) => (
              <div
                key={it.id}
                data-depth-item={it.id}
                data-carries={carries.get(it.id)}
                data-filler={carries.get(it.id) ? undefined : ''}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: it.w,
                  height: it.h,
                  opacity: it.opacity,
                  transformOrigin: '50% 50%',
                  transform: `translate3d(${(it.x - it.w / 2).toFixed(2)}px, ${(it.y - it.h / 2).toFixed(2)}px, 0) rotateZ(${it.rot.toFixed(3)}deg)${it.tilt.x || it.tilt.y ? ` perspective(${props.perspective ?? DEPTH.perspective}px) rotateX(${it.tilt.x.toFixed(3)}deg) rotateY(${it.tilt.y.toFixed(3)}deg)` : ''} scale(${it.scale.toFixed(5)})`,
                }}
              >
                {props.render(it.id, it)}
                {rim && (
                  <RimEdge
                    w={it.w}
                    h={it.h}
                    r={props.items.find((d) => d.id === it.id)?.r ?? Math.min(it.w, it.h) * 0.12}
                    line={rimLine(it.turn, it.w, it.h, light, rim.alpha ?? light.rim)}
                    color={rim.color}
                    id={`ds-${it.id}`}
                  />
                )}
              </div>
            ))}
          </div>
        );
        return (
          <div key={pl.plane} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: pl.opacity }}>
            {pl.blur > 0 ? <Defocus sigma={pl.blur}>{layer}</Defocus> : layer}
          </div>
        );
      })}
    </div>
  );
};

/** Continuous; a fast pass through the near plane may declare its span as a camera-blur range (`shutter`). */
export const declares = (p?: Partial<DepthStackProps>, _film?: Partial<FilmCtx>): Declares => ({
  stepped: [],
  flashes: [],
  cameraBlur: p?.shutter ? [{ from: p.shutter.from, to: p.shutter.to, id: p.shutter.id ?? 'depthStack' }] : [],
  seams: [],
});
