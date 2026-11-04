// object-turn: the product as an object turned by one purposeful move. Its plane enters edge-on, far and to the side,
// and turns to face the camera on one long strong in-out (44 f), a band of light crossing its face as it turns and its
// edge showing until it faces; it lands still, facing, and plays on. The only tilt in a film is this designed turn: it
// starts, travels and lands at zero, never resting at an angle.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { centreOf, ContactShadow, frameOf, Glare, k60, type PictureProps, type Recipe, type Params } from './core';

/** House numbers (f@60, px@1080, degrees): the turn's length, where it starts, the light band, the edge's depth. */
export const TURN = { dur: 44, fade: 8, rotY: -58, rotX: 9, z: -300, x: 0.07, glare: 0.22, edge: 14, perspective: 1800, radius: 30 } as const;

export const RECIPE: Recipe = {
  id: 'object-turn',
  recipe:
    'The product as an object turned by one purposeful move: its plane enters edge-on (58 deg turned, 9 deg tipped, 300 px back, 7 % to the side) and turns to face the camera on one strongInOut (44 f), a band of light crossing its face and its edge showing while it turns; it lands still at zero and plays on. Never a resting tilt.',
  params: { ...TURN },
};

/** The turn at frame t after it starts: angles, depth, side offset, the light band's place and strength (0 at rest). */
export const turnState = (t: number, film?: Partial<FilmCtx>, o: Params<typeof TURN> = {}) => {
  const P = { ...TURN, ...o };
  const k = k60(film);
  const e = E.strongInOut(clamp(t / (P.dur * k)));
  return {
    e,
    rotY: P.rotY * (1 - e),
    rotX: P.rotX * (1 - e),
    z: P.z * (1 - e),
    x: P.x * (1 - e),
    opacity: E.softOut(clamp(t / (P.fade * k))),
    glareAt: mix(-0.3, 1.3, e),
    glare: e >= 1 ? 0 : P.glare * Math.sin(Math.PI * e),
    landed: e >= 1,
  };
};

export const ObjectTurn: React.FC<PictureProps & { params?: Params<typeof TURN> }> = ({ f, start = 0, pal, scene, focus, radius, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...TURN, ...params };
  const st = turnState(f - start, film, P);
  const fb = focus ?? { x: W * 0.25, y: H * 0.18, w: W * 0.5, h: H * 0.64 };
  const c = centreOf(fb);
  const r = (radius ?? P.radius) * u;
  const edge = P.edge * u;
  const node = scene(f);
  const plane: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H, transformStyle: 'preserve-3d', transformOrigin: `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`, transform: `translate3d(${(st.x * W).toFixed(2)}px, 0, ${(st.z * u).toFixed(2)}px) rotateX(${st.rotX.toFixed(3)}deg) rotateY(${st.rotY.toFixed(3)}deg)` };
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: P.perspective * u, perspectiveOrigin: `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`, opacity: st.opacity }}>
      <ContactShadow cx={c.x + st.x * W * 0.6} cy={fb.y + fb.h + 26 * u} w={fb.w * mix(0.55, 0.92, st.e)} opacity={mix(0.35, 1, st.e)} dark={pal.dark} />
      <div style={plane}>
        {/* the edge: the object's thickness, seen only while it is turned */}
        {!st.landed && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: edge, height: fb.h - 2 * r, background: mixColor(pal.surface, pal.ground, 0.35), transformOrigin: '0 0', transform: `translate3d(${(fb.x + fb.w).toFixed(2)}px, ${(fb.y + r).toFixed(2)}px, 0) rotateY(90deg)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0 }}>{node}</div>
        {st.glare > 0.002 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: fb.w, height: fb.h, transform: `translate3d(${fb.x.toFixed(2)}px, ${fb.y.toFixed(2)}px, 0)` }}>
            <Glare w={fb.w} h={fb.h} r={r} at={st.glareAt} strength={st.glare} />
          </div>
        )}
      </div>
    </div>
  );
};
