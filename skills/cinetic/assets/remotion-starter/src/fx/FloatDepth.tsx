// The stage camera's context and the planes under it (fx/Float.tsx puts each act on its stage): split out so
// fx/Grounds can hold a ground still on screen under a declared move without importing the stage. Named apart from
// the fx/depth folder (the 3D stage): on a case-blind disk a file fx/Depth.tsx would answer `import '../fx/depth'`.
import React, { createContext, useContext } from 'react';
import { useFilm } from '../lib/film';
import { bleedFor, type FloatOpts, type FloatState, planeOf } from '../lib/drift';

export type FloatCtxT = { s: FloatState; o: FloatOpts; bleed: number } | null;
export const FloatCtx = createContext<FloatCtxT>(null);

/** The stage camera the current subtree sits on (null outside a Float): an act that tracks an overlay to the screen reads it. */
export const useFloat = () => useContext(FloatCtx);

export const T = (x: number, y: number, k: number) => `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) scale(${k.toFixed(6)})`;

/**
 * A plane at depth z under the stage camera (lib/drift DRIFT.depth): while a declared move runs, z < 1 lags (the
 * ground 0.25, a back layer 0.6), z > 1 leads (a near plane 1.35); on a still camera every plane is still. `bleed`
 * scales the plane so its edges never show under the move (a ground or a wall drawn to the frame). Outside a Float
 * it renders its children as they are.
 */
export const Depth: React.FC<{ z: number; bleed?: boolean; children: React.ReactNode; style?: React.CSSProperties }> = ({ z, bleed = false, children, style }) => {
  const film = useFilm();
  const ctx = useFloat();
  if (!ctx) return <>{children}</>;
  const p = planeOf(ctx.s, z);
  const b = bleed ? bleedFor(ctx.o, film, z) : 1;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, transformOrigin: '50% 50%', transform: T(p.x, p.y, p.k * b), ...style }}>
      {children}
    </div>
  );
};
