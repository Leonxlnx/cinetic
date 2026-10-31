// photo-arc: pictures flow along an arc and one becomes the shot. Upright cards (photos the film was given, or the
// product at other moments) stream along a wide arc rising through the frame, fast at first and slowing to a cruise;
// on the moment the card at the top comes forward and opens to the whole frame (the product, at rest) while the others
// fall away along the arc. Many things, one of them chosen: the river.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { clamp, E, mix } from '../../lib/anim';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, face, frameOf, k60, mixBox, momentAt, type PictureProps, type Recipe, SceneView, type Params } from './core';

/** House numbers (f@60, px@1080): the arc (centre below the frame, radius), the cards, the stream's speed decaying to a
 * cruise, the chosen card opening and the others falling away. */
export const ARC = { cy: 1.95, r: 1.45, card: 470, aspect: 0.62, gap: 34, fast: 70, cruise: 6, tau: 22, at: 0.55, open: 30, fall: 26, radius: 24 } as const;

export const RECIPE: Recipe = {
  id: 'photo-arc',
  recipe:
    'Pictures flow along an arc and one becomes the shot: upright cards (the film\'s photos, else the product at other moments) stream along a wide arc rising through the frame (centre 1.95 H below the top, radius 1.45 H), 70 px a frame decaying to a 6 px cruise; on the moment (55 %) the card at the top opens to the whole frame (card-expand, 30 f) and the others fall away along the arc (26 f). Cards stay upright: never tilted.',
  params: { ...ARC },
};

/** The stream's travel along the arc (px) at frame t: a fast start decaying to a cruise (closed form). */
export const arcTravel = (t: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> = {}) => {
  const P = { ...ARC, ...o };
  const { u } = frameOf(film);
  const x = Math.max(0, t) / k60(film);
  return (P.cruise * x + (P.fast - P.cruise) * P.tau * (1 - Math.exp(-x / P.tau))) * u;
};

/** How many cards the stream needs so the arc is full from its first frame to the moment (odd: the chosen one in the
 * middle). */
export const arcCount = (at: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> = {}) => {
  const P = { ...ARC, ...o };
  const { W, u } = frameOf(film);
  return Math.min(31, 2 * Math.ceil((arcTravel(at, film, P) + W * 0.65) / ((P.card + P.gap) * u)) + 1);
};
/** The cards' centres at frame t (n cards, the chosen one index `pick`): arc position, the open and the fall. */
export const arcState = (t: number, n: number, at: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> = {}) => {
  const P = { ...ARC, ...o };
  const { W, H, u } = frameOf(film);
  const k = k60(film);
  const R = P.r * H;
  const cx = W / 2;
  const cy = P.cy * H;
  const cw = P.card * u;
  const step = cw + P.gap * u;
  // the stream ends with the chosen card at the top of the arc on the moment: travel is offset so it lands there
  const end = arcTravel(at, film, P);
  const pick = Math.floor(n / 2);
  const open = E.strongInOut(clamp((t - at) / (P.open * k)));
  const fall = E.buildIn(clamp((t - at) / (P.fall * k)));
  const cards = Array.from({ length: n }, (_, i) => {
    const s = (i - pick) * step - (end - arcTravel(Math.min(t, at), film, P));
    const a = s / R; // radians from the top of the arc, clockwise
    const away = i === pick ? 0 : Math.sign(i - pick || 1) * fall * 0.5;
    const aa = a + away;
    return { i, x: cx + Math.sin(aa) * R, y: cy - Math.cos(aa) * R, opacity: i === pick ? 1 : 1 - fall };
  });
  return { cards, pick, open, landed: open >= 1 };
};

export const PhotoArc: React.FC<PictureProps & { photos?: string[]; params?: Params<typeof ARC> }> = ({ f, dur, start = 0, hits, pal, scene, focus, photos = [], radius, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P0 = { ...ARC, ...params };
  // photos stand upright (portrait); the product's own moments are wider cards in the shape of its frame
  const P = { ...P0, card: photos.length ? P0.card : P0.card * 1.18 };
  const t = f - start;
  const at = momentAt(hits, 0, start, dur, P.at) - start;
  const n = arcCount(at, film, P);
  const st = arcState(t, n, at, film, P);
  if (st.landed) return <div style={{ position: 'absolute', inset: 0 }}>{scene(f)}</div>;
  const fb0 = focus ?? { x: W * 0.3, y: H * 0.15, w: W * 0.4, h: H * 0.7 };
  const aspect = photos.length ? P.aspect : Math.max(1.1, Math.min(1.8, fb0.w / fb0.h));
  const cw = P.card * u;
  const ch = cw / aspect;
  const r = (radius ?? P.radius) * u;
  const fb = { x: fb0.x - fb0.w * 0.05, y: fb0.y - fb0.h * 0.05, w: fb0.w * 1.1, h: fb0.h * 1.1 };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {st.cards.map((c) => {
        if (c.opacity <= 0.002) return null;
        const chosen = c.i === st.pick;
        const card: Box = { x: c.x - cw / 2, y: c.y - ch / 2, w: cw, h: ch };
        if (!chosen && (card.x > W || card.x + cw < 0 || card.y > H || card.y + ch < 0)) return null;
        const box = chosen ? mixBox(card, { x: 0, y: 0, w: W, h: H }, st.open) : card;
        const rr = chosen ? mix(r, 0, st.open) : r;
        const photo = photos.length ? photos[(c.i + photos.length) % photos.length] : null;
        // a photo fills its card; without photos each card is the product at another moment (the chosen one, now)
        const off = Math.round((c.i - st.pick) * dur * 0.35);
        const node = chosen && st.open > 0 ? scene(f) : photo ? null : scene(f + off);
        return (
          <div key={c.i} data-audit-copy={chosen ? undefined : ''} style={{ position: 'absolute', inset: 0, opacity: c.opacity, zIndex: chosen ? 2 : 1 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: rr, ...face(pal.surface, pal, u, { lift: chosen ? st.open : 0 }), opacity: chosen ? 1 - st.open : 1, transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)` }} />
            {photo && !(chosen && st.open > 0.5) ? (
              <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: rr, overflow: 'hidden', transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)` }}>
                <Img src={staticFile(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <SceneView node={node} box={box} focus={chosen ? mixBox(fb, { x: 0, y: 0, w: W, h: H }, st.open) : fb} radius={rr} fit={photos.length ? 'cover' : 'contain'} W={W} H={H} />
            )}
          </div>
        );
      })}
    </div>
  );
};
