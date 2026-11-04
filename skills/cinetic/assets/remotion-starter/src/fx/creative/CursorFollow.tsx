// cursor-follow: the camera rides a pointer. The beat opens close on the product (x2.4) with a pointer resting on it;
// the pointer glides to the product's moment (its button, clear of the label, else the moment's box) and the camera follows
// it a few frames behind, the product sliding past underneath; on the music's hit it clicks (a press and a ring from its
// tip) and the camera pulls back to the whole product, reacting, at rest. Every move starts, travels and lands: one
// travel, one pull, never a drift back. The pointer is part of the product's world (it scales with the camera) and
// leaves as the pull lands. A film's seed picks where the pointer starts (left, right or below its target).
import React from 'react';
import { C } from '../../brand/tokens';
import { clamp, E, lmix, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, frameOf, hash01, k60, momentAt, type PictureProps, type Recipe, SceneView, type Params } from './core';

/** House numbers (f@60, px@1080 in the product's own scale): the close-up, the rest before the travel, the travel and
 * the camera's lag behind it, the press, the ring, the pull back, the pointer's size, how far from its target it starts. */
export const CURSOR = { zoom: 2.4, hold: 10, travel: 38, lag: 6, press: 12, ring: 20, pull: 42, size: 30, reach: 0.36, at: 0.5 } as const;

export const RECIPE: Recipe = {
  id: 'cursor-follow',
  recipe:
    'The camera rides a pointer: the beat opens close on the product (x2.4) with a pointer (30 px at the product\'s scale) resting on it 36 % of the moment\'s box from its target; after 10 f it glides to the target (the button\'s lower right, clear of its label, else inside the moment\'s box; strongInOut 38 f) with the camera following 6 f behind; on the hit it clicks (x0.88 press 12 f, an accent ring from the tip 20 f) and the camera pulls back to the whole product at rest (stdInOut 42 f, a log zoom), the pointer leaving as the pull lands. One travel and one pull, each landing; no drift.',
  params: { ...CURSOR },
};

type Pt = { x: number; y: number };

/** Where the pointer starts for a target in a moment's box: up and to the left, up and to the right, or above it (on the
 * product's content, which the close-up then frames), by the seed. */
export const cursorStart = (target: Pt, fb: Box, seed = 0, o: Params<typeof CURSOR> = {}): Pt => {
  const P = { ...CURSOR, ...o };
  const v = Math.floor(hash01(seed, 5) * 3);
  const d = [
    { x: -1, y: -0.55 },
    { x: 0.7, y: -0.9 },
    { x: -0.35, y: -1 },
  ][v];
  // inside the moment's box (8 % in from its edges): the close-up opens on the product, never on empty ground
  const cx = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
  return { x: cx(target.x + d.x * P.reach * fb.w, fb.x + 0.08 * fb.w, fb.x + 0.92 * fb.w), y: cx(target.y + d.y * P.reach * fb.h, fb.y + 0.08 * fb.h, fb.y + 0.92 * fb.h) };
};

/**
 * The device at frame t: the pointer (scene px), the camera (look point in scene px and zoom; the frame shows
 * (p - look) x zoom + the frame's centre), the press, the ring and whether it has landed on the product at rest.
 * `click` is the frame of the click (the beat's hit).
 */
export const cursorState = (t: number, from: Pt, to: Pt, click: number, film?: Partial<FilmCtx>, o: Params<typeof CURSOR> = {}) => {
  const P = { ...CURSOR, ...o };
  const k = k60(film);
  const { W, H } = frameOf(film);
  const tp = Math.max(click, (P.hold + P.travel + 2) * k); // the click
  const t1 = tp - (P.travel + 2) * k; // the travel starts
  const tr = E.strongInOut(clamp((t - t1) / (P.travel * k)));
  const tc = E.strongInOut(clamp((t - t1 - P.lag * k) / (P.travel * k)));
  const pointer = { x: mix(from.x, to.x, tr), y: mix(from.y, to.y, tr) };
  const pr = clamp((t - tp) / (P.press * k));
  const press = Math.sin(Math.PI * pr);
  const rg = clamp((t - tp) / (P.ring * k));
  const tq = tp + P.press * 0.6 * k; // the pull starts while the press releases
  const pl = E.stdInOut(clamp((t - tq) / (P.pull * k)));
  const follow = { x: mix(from.x, to.x, tc), y: mix(from.y, to.y, tc) };
  const look = { x: mix(follow.x, W / 2, pl), y: mix(follow.y, H / 2, pl) };
  const zoom = lmix(P.zoom, 1, pl);
  const gone = clamp((t - tq - P.pull * 0.55 * k) / (P.pull * 0.45 * k));
  return { pointer, look, zoom, press, ring: rg > 0 && rg < 1 ? rg : 0, pointerOpacity: 1 - E.softOut(gone), landed: pl >= 1, tp, t1 };
};

/** The pointer: a plain arrow, its tip at (0, 0), `s` px tall; dark on a light ground, light on a dark one. */
const Arrow: React.FC<{ s: number; dark: boolean }> = ({ s, dark }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" style={{ position: 'absolute', left: (-5 / 24) * s, top: (-3 / 24) * s, overflow: 'visible', filter: `drop-shadow(0 ${(s * 0.06).toFixed(2)}px ${(s * 0.12).toFixed(2)}px rgba(0, 0, 0, ${dark ? 0.5 : 0.28}))` }}>
    <path d="M5 3 L5 19.6 L9.3 15.5 L12.2 21.7 L15.1 20.4 L12.2 14.3 L18.2 14.3 Z" fill={dark ? C.white : C.ink} stroke={dark ? C.ink : C.white} strokeWidth={1.4} strokeLinejoin="round" />
  </svg>
);

export const CursorFollow: React.FC<PictureProps & { button?: Box; params?: Params<typeof CURSOR> }> = ({ f, dur, start = 0, hits, pal, scene, focus, seed = 0, button, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...CURSOR, ...params };
  const fb = focus ?? { x: W * 0.3, y: H * 0.2, w: W * 0.4, h: H * 0.6 };
  // the tip lands in the button's lower right (on a pill, clear of its centred label), never on the label itself
  const to = button ? { x: button.x + button.w * 0.8, y: button.y + button.h * 0.66 } : { x: fb.x + fb.w * 0.6, y: fb.y + fb.h * 0.58 };
  const from = cursorStart(to, fb, seed, P);
  const t = f - start;
  const click = momentAt(hits, 0, start, dur, P.at) - start;
  const st = cursorState(t, from, to, click, film, P);
  const node = scene(f);
  if (st.landed && st.pointerOpacity <= 0) return <div style={{ position: 'absolute', inset: 0 }}>{node}</div>;
  const view = { s: st.zoom, tx: W / 2 - st.look.x * st.zoom, ty: H / 2 - st.look.y * st.zoom };
  const toScreen = (p: Pt) => ({ x: (p.x - st.look.x) * st.zoom + W / 2, y: (p.y - st.look.y) * st.zoom + H / 2 });
  const ps = toScreen(st.pointer);
  const rc = toScreen(to);
  const size = P.size * u * st.zoom * (1 - 0.12 * st.press);
  const ringR = (8 + 34 * E.softOut(st.ring)) * u * st.zoom;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SceneView node={node} box={{ x: 0, y: 0, w: W, h: H }} view={view} W={W} H={H} />
      {st.ring > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: ringR * 2, height: ringR * 2, borderRadius: '50%', border: `${(2.5 * u * Math.min(st.zoom, 1.6)).toFixed(2)}px solid ${mixColor(pal.accent, pal.ground, 0.1)}`, opacity: 1 - st.ring, transform: `translate3d(${(rc.x - ringR).toFixed(2)}px, ${(rc.y - ringR).toFixed(2)}px, 0)` }} />
      )}
      {st.pointerOpacity > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: st.pointerOpacity, transform: `translate3d(${ps.x.toFixed(2)}px, ${ps.y.toFixed(2)}px, 0)` }}>
          <Arrow s={size} dark={pal.dark} />
        </div>
      )}
    </div>
  );
};
