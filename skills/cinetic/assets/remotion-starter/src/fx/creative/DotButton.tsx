// dot-button: a dot that grows into the button it was about to press. A dot of the accent appears at the centre,
// travels on a soft arc to where the product's button will be, grows into that button (its label inking in), is
// pressed, and the product opens out of the press as an iris from that point, at rest, its own button in the same
// place. One point of attention carried from nothing to the product.
import React from 'react';
import { FONT } from '../../brand/tokens';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, centreOf, face, frameOf, inkFor, k60, mixBox, type PictureProps, type Recipe, type Params } from './core';

/** House numbers (f@60, px@1080): the dot, its travel and arc, the grow, the press and the iris. */
export const DOT = { dot: 40, appear: 10, travel: 30, arc: 0.07, grow: 18, press: 12, iris: 32, text: 46, gap: 6 } as const;

export const RECIPE: Recipe = {
  id: 'dot-button',
  recipe:
    'A dot that grows into the button it was about to press: an accent dot (40 px) appears at the centre (10 f), travels on a soft arc to the button\'s place (strongInOut 30 f), grows into the button with its label inking in (18 f), is pressed (x0.94 and back, 12 f), and the product opens out of the press as an iris from that point (32 f) to rest, its own button in the same place.',
  params: { ...DOT },
};

/** The device at frame t: the dot or button box, its corner, the label, the press scale and the iris radius (px). */
export const dotState = (t: number, button: Box, film?: Partial<FilmCtx>, o: Params<typeof DOT> = {}) => {
  const P = { ...DOT, ...o };
  const k = k60(film);
  const { W, H, u } = frameOf(film);
  const t1 = P.appear * k;
  const t2 = t1 + P.travel * k + P.gap * k;
  const t3 = t2 + P.grow * k;
  const t4 = t3 + P.press * k;
  const d = P.dot * u;
  const c = centreOf(button);
  const tr = E.strongInOut(clamp((t - t1) / (P.travel * k)));
  const x = mix(W / 2, c.x, tr);
  const y = mix(H / 2, c.y, tr) - Math.sin(Math.PI * tr) * P.arc * H;
  const dotBox: Box = { x: x - d / 2, y: y - d / 2, w: d, h: d };
  const g = E.glideOut(clamp((t - t2) / (P.grow * k)));
  const box = mixBox(dotBox, button, g);
  const pr = clamp((t - t3) / (P.press * k));
  const press = 1 - 0.06 * Math.sin(Math.PI * pr);
  const far = Math.max(Math.hypot(c.x, c.y), Math.hypot(W - c.x, c.y), Math.hypot(c.x, H - c.y), Math.hypot(W - c.x, H - c.y)) * 1.03;
  const ir = E.glideOut(clamp((t - t4 + 3 * k) / (P.iris * k)));
  return { box, r: Math.min(box.h, box.w) / 2, label: E.softOut(clamp((t - t2 - 6 * k) / (10 * k))), press, iris: ir > 0 ? Math.exp(mix(Math.log(button.h * 0.4), Math.log(far), ir)) : 0, appear: E.snapOut(clamp(t / t1)), done: ir >= 1, c };
};

export const DotButton: React.FC<PictureProps & { label?: string; button?: Box; params?: Params<typeof DOT> }> = ({ f, start = 0, pal, scene, focus, label, button, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...DOT, ...params };
  const fb = focus ?? { x: W / 2 - 220 * u, y: H * 0.62, w: 440 * u, h: 112 * u };
  // the button: the given box, else a pill at the bottom of the product's focus box
  const btn: Box = button ?? { x: fb.x + fb.w / 2 - 230 * u, y: fb.y + fb.h - 140 * u, w: 460 * u, h: 112 * u };
  const st = dotState(f - start, btn, film, P);
  const node = scene(f);
  if (st.done) return <div style={{ position: 'absolute', inset: 0 }}>{node}</div>;
  const ink = inkFor(pal.accent, pal);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {st.iris > 0 && <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${st.iris.toFixed(2)}px at ${st.c.x.toFixed(2)}px ${st.c.y.toFixed(2)}px)` }}>{node}</div>}
      <div style={{ position: 'absolute', left: 0, top: 0, width: st.box.w, height: st.box.h, borderRadius: st.r, ...face(pal.accent, { ...pal, dark: true }, u, { lift: 0.5 }), opacity: st.appear * (1 - clamp(st.iris / (btn.w * 0.9))), transformOrigin: '50% 50%', transform: `translate3d(${st.box.x.toFixed(2)}px, ${st.box.y.toFixed(2)}px, 0) scale(${(st.press * mix(0.5, 1, st.appear)).toFixed(4)})` }}>
        {label && (
          <div data-text={label} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: st.box.w, height: st.box.h, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: P.text * u, fontWeight: 600, letterSpacing: '-0.015em', color: mixColor(pal.accent, ink, st.label), opacity: st.label }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
