// photo-arc: many pictures, one chosen. Upright cards (the film's photos; else the product at its other moments) stream
// through the frame in ONE level row, one way only, fast at first and slowing until the chosen card lands at the
// centre; a short rest, then that card opens to the whole frame about its own centre (the product, at rest) while the
// others slide out to the sides. Nothing rises or sinks, nothing pans back: the row travels, lands and opens. The
// opening card stays opaque (its face turns into the film's ground as it reaches the frame), so no ghost card shows
// through the product. A film's seed picks the direction of travel.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { clamp, E, mix } from '../../lib/anim';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, face, frameOf, hash01, k60, mixBox, momentAt, type PictureProps, type Recipe, SceneView, type Params } from './core';

/** House numbers (f@60, px@1080): the cards (height, photo aspect w/h, gap, corner), the row's travel (in frame widths)
 * and the share of the beat where it lands, the rest, the open and the others' exit. */
export const ARC = { h: 620, aspect: 0.74, gap: 40, radius: 26, travel: 1.5, at: 0.5, rest: 8, open: 32, leave: 24 } as const;

export const RECIPE: Recipe = {
  id: 'photo-arc',
  recipe:
    'Many pictures, one chosen: upright cards (the film\'s photos, 620 px tall, portrait 0.74; else the product at its other moments in wide cards) stream through the frame in one level row, one way only (1.5 frame widths of travel decaying to rest on a cubic out by 50 % of the beat: about 90 px a frame at first), landing with the chosen card centred; 8 f of rest, then it opens to the whole frame about its own centre (card-expand, strongInOut 32 f, the photo cross-fading to the product at 35-75 %, the card\'s face turning into the ground) while the others slide out to the sides (buildIn 24 f). Nothing rises, sinks or pans back; cards face the camera.',
  params: { ...ARC },
};

/** The row's travel (px) at frame t: a fast start decaying to rest at `at` (cubic out; closed form, no state). */
export const arcTravel = (t: number, at: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> = {}) => {
  const P = { ...ARC, ...o };
  const { W } = frameOf(film);
  const x = clamp(t / Math.max(1e-6, at));
  return P.travel * W * (1 - (1 - x) ** 3);
};

/** The card width for an aspect (w/h) at the house height. */
const cardW = (aspect: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> = {}) => ({ ...ARC, ...o }).h * frameOf(film).u * aspect;

/** How many cards the row needs so the frame is full from its first frame to the landing (odd: the chosen one in the
 * middle). */
export const arcCount = (_at: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> & { cardAspect?: number } = {}) => {
  const P = { ...ARC, ...o };
  const { W, u } = frameOf(film);
  const step = cardW(o.cardAspect ?? P.aspect, film, P) + P.gap * u;
  return Math.min(41, 2 * Math.ceil((P.travel * W + W / 2 + step) / step) + 1);
};

/**
 * The cards at frame t (n cards, the chosen one in the middle), `dir` -1 travelling left, 1 right: each card's centre
 * (y is the frame's centre, always), its opacity, the open (0..1) and whether the device has landed on the product.
 */
export const arcState = (t: number, n: number, at: number, film?: Partial<FilmCtx>, o: Params<typeof ARC> & { cardAspect?: number } = {}, dir: -1 | 1 = -1) => {
  const P = { ...ARC, ...o };
  const { W, H, u } = frameOf(film);
  const k = k60(film);
  const step = cardW(o.cardAspect ?? P.aspect, film, P) + P.gap * u;
  const pick = Math.floor(n / 2);
  const left = P.travel * W - arcTravel(Math.min(t, at), at, film, P); // distance still to travel
  const t0 = at + P.rest * k;
  const open = E.strongInOut(clamp((t - t0) / (P.open * k)));
  const leave = E.buildIn(clamp((t - t0) / (P.leave * k)));
  const cards = Array.from({ length: n }, (_, i) => {
    const side = Math.sign(i - pick);
    const x = W / 2 + (i - pick) * step - dir * left + (i === pick ? 0 : side * leave * W * 0.6);
    return { i, x, y: H / 2, opacity: i === pick ? 1 : 1 - leave };
  });
  return { cards, pick, open, landed: open >= 1, resting: t >= at && t < t0 };
};

export const PhotoArc: React.FC<PictureProps & { photos?: string[]; params?: Params<typeof ARC> }> = ({ f, dur, start = 0, hits, pal, scene, focus, photos = [], radius, seed = 0, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...ARC, ...params };
  const t = f - start;
  const at = momentAt(hits, 0, start, dur, P.at) - start;
  const fb0 = focus ?? { x: W * 0.3, y: H * 0.15, w: W * 0.4, h: H * 0.7 };
  // photos stand upright (portrait); the product's own moments take wide cards in the shape of its frame
  const cardAspect = photos.length ? P.aspect : Math.max(1.1, Math.min(1.8, fb0.w / fb0.h));
  const n = arcCount(at, film, { ...P, cardAspect });
  const dir: -1 | 1 = hash01(seed, 31) < 0.5 ? -1 : 1;
  const st = arcState(t, n, at, film, { ...P, cardAspect }, dir);
  if (st.landed) return <div style={{ position: 'absolute', inset: 0 }}>{scene(f)}</div>;
  const ch = P.h * u;
  const cw = ch * cardAspect;
  const r = (radius ?? P.radius) * u;
  const edge = { ...face(pal.surface, pal, u, { flat: true }), background: 'transparent' };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {st.cards.map((c) => {
        if (c.opacity <= 0.002) return null;
        const chosen = c.i === st.pick;
        const card: Box = { x: c.x - cw / 2, y: c.y - ch / 2, w: cw, h: ch };
        if (!chosen && (card.x > W || card.x + cw < 0)) return null;
        const box = chosen ? mixBox(card, { x: 0, y: 0, w: W, h: H }, st.open) : card;
        const rr = chosen ? mix(r, 0, st.open) : r;
        const photo = photos.length ? photos[(((c.i - st.pick) % photos.length) + photos.length) % photos.length] : null;
        // the chosen card's content cross-fades from its picture to the product while it opens (card-expand, 35-75 %)
        const toScene = chosen ? E.softOut(clamp((st.open - 0.35) / 0.4)) : 0;
        const off = Math.round((c.i - st.pick) * dur * 0.35);
        const place = { position: 'absolute' as const, left: 0, top: 0, width: box.w, height: box.h, borderRadius: rr, transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)` };
        return (
          <div key={c.i} data-audit-copy={chosen ? undefined : ''} style={{ position: 'absolute', inset: 0, opacity: c.opacity, zIndex: chosen ? 2 : 1 }}>
            <div style={{ ...place, ...face(pal.surface, pal, u, { lift: chosen ? st.open : 0 }) }} />
            {/* the opening card turns into the film's ground: opaque all the way, so the product never shows a ghost card */}
            {chosen && st.open > 0.4 && <div style={{ ...place, background: pal.ground, opacity: E.softOut(clamp((st.open - 0.4) / 0.6)) }} />}
            {photo && toScene < 1 && (
              <div style={{ ...place, overflow: 'hidden', opacity: 1 - toScene }}>
                <Img src={staticFile(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            {(!photo || toScene > 0) && (
              <div style={{ position: 'absolute', inset: 0, opacity: photo ? toScene : 1 }}>
                <SceneView node={chosen ? scene(f) : scene(f + off)} box={box} focus={chosen ? mixBox(fb0, { x: 0, y: 0, w: W, h: H }, st.open) : fb0} radius={rr} fit="cover" W={W} H={H} />
              </div>
            )}
            {st.open < 0.9 && <div style={{ ...place, ...edge, opacity: 1 - clamp(st.open / 0.9) }} />}
          </div>
        );
      })}
    </div>
  );
};
