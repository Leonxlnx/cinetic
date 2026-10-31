// The stage's layers: one tree per element for its whole life, so the browser never re-draws a line or a card in a
// new place for one frame. A seam moves a layer (transform, opacity) and softens it with copies at fixed blur levels
// (lib/defocus: no radius ever animates); the sharp copy is always mounted, the soft copies only while they show.
// Text inside a sharp layer sits on its own composited layer (usePromote in acts/ui.tsx and acts/line.tsx), so slow
// vertical moves (the camera's push, the float, a row's rise) travel sub-pixel instead of in whole-pixel ticks; the
// blurred copies' text is never promoted (a promoted layer under a blur leaves stale frames), the sharp copy's stays
// promoted for as long as the sharp copy shows (it has no filter), so the start of a blur never re-draws its glyphs on
// whole pixels in one frame. Keep promotion (will-change) out of this file: it animates blur.
import React from 'react';
import { defocusMix } from '../lib/defocus';
import { uOf, useFilm } from '../lib/film';
import type { SeamLayer } from '../fx/Seam';

/** Whether text in this subtree may sit on its own composited layer (false while an ancestor is soft). */
export const PromoteCtx = React.createContext(true);
export const usePromote = () => React.useContext(PromoteCtx);

/** Under this blur (px at 1080p) a layer is drawn sharp: one copy, its text promoted. Low, so a blur ramp starts as a
 * cross-fade of the sharp copy and the first level (0.75 px) instead of jumping from sharp to 2-3 px in one frame (a
 * spike on a light, high-contrast surface such as a phone's light screen). */
export const SOFT_MIN = 0.2;

const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' };

/** A soft copy of `children` at `sigma` px (1080p): the sharp copy plus at most two fixed-level copies, never remounted. */
export const Soft: React.FC<{ sigma: number; children: React.ReactNode }> = ({ sigma, children }) => {
  const film = useFilm();
  const parent = usePromote();
  const soft = sigma >= SOFT_MIN;
  const copies = soft ? defocusMix(sigma * uOf(film)) : [{ level: 0, weight: 1 }];
  const sharpOn = copies[0].level === 0;
  const blurred = copies.filter((c) => c.level > 0);
  return (
    <div style={{ ...fill, isolation: 'isolate' }}>
      <div key="sharp" style={{ ...fill, opacity: sharpOn ? 1 : 0 }}>
        {/* the sharp copy carries no filter, so its text stays promoted while it shows: un-promoting it as the blur
            starts re-draws every glyph on whole pixels in one frame, a pop on a light, high-contrast surface */}
        <PromoteCtx.Provider value={parent && sharpOn}>{children}</PromoteCtx.Provider>
      </div>
      {blurred.map((c, i) => (
        <div key={`soft${i}`} data-audit-copy="" style={{ ...fill, opacity: sharpOn || i > 0 ? c.weight : 1, filter: `blur(${c.level}px)` }}>
          <PromoteCtx.Provider value={false}>{children}</PromoteCtx.Provider>
        </div>
      ))}
    </div>
  );
};

/** One element of the stage placed by a seam's layer state (fx/Seam seamState): offset, scale about `origin`, opacity, blur. */
export const Layer: React.FC<{ s?: SeamLayer; origin: string; z: number; children: React.ReactNode }> = ({ s, origin, z, children }) => {
  const film = useFilm();
  const u = uOf(film);
  const x = s ? s.x * u : 0;
  const y = s ? s.y * u : 0;
  const k = s ? s.scale : 1;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: z, opacity: s ? s.opacity : 1, transformOrigin: origin, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>
      <Soft sigma={s ? s.blur : 0}>{children}</Soft>
    </div>
  );
};
