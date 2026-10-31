// shape-morph: one shape becomes the product. A dot of the accent appears at the centre and morphs on phrased beats:
// into a pill, into a lit square, into the product's own frame (the box of the product's moment), each change a size,
// corner and colour interpolated together; the product shows inside the last shape and then opens to the whole frame,
// at rest. Nothing cuts: the frame is one object changing its mind until it is the product.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, face, frameOf, k60, mixBox, phrased, type PictureProps, type Recipe, SceneView, type Params } from './core';

/** House numbers (f@60, px@1080): the shapes (w, h, corner as a share of the short side), each morph's length, the
 * span the morphs are phrased over (share of the beat, at least `min`), the product fading in and the open. */
export const MORPH = { dot: 40, pill: [340, 104] as const, square: 230, morph: 22, span: 0.5, min: 66, show: 14, open: 26, radius: 30 } as const;

export const RECIPE: Recipe = {
  id: 'shape-morph',
  recipe:
    'One shape becomes the product: an accent dot (40 px) at the centre morphs on phrased beats (settling, over half the beat) into a 340 x 104 pill, a lit 230 px square, then the product\'s own frame (its focus box), each change size, corner and colour together on strongInOut (22 f); the product shows inside the last shape (14 f) and opens to the whole frame at rest (26 f).',
  params: { ...MORPH },
};

type Shape = { box: Box; r: number; fill: string };
/** The shape at frame t: its box, corner and colour, the product's opacity inside it and the open to the frame (0..1). */
export const morphState = (t: number, dur: number, shapes: Shape[], film?: Partial<FilmCtx>, o: Params<typeof MORPH> = {}) => {
  const P = { ...MORPH, ...o };
  const k = k60(film);
  const span = Math.max(P.min * k, dur * P.span);
  const on = phrased(shapes.length - 1, span, 'settle', 0.8).map((x) => x + 2 * k);
  let i = 0;
  let p = 0;
  for (let j = 0; j < on.length; j++) {
    const e = E.strongInOut(clamp((t - on[j]) / (P.morph * k)));
    if (t >= on[j]) (i = j), (p = e);
  }
  const a = shapes[i];
  const b = shapes[Math.min(i + 1, shapes.length - 1)];
  const last = on[on.length - 1];
  const show = E.softOut(clamp((t - last) / (P.show * k)));
  const open = E.strongInOut(clamp((t - last - P.morph * k) / (P.open * k)));
  const appear = E.snapOut(clamp(t / (10 * k)));
  return { box: mixBox(a.box, b.box, p), r: mix(a.r, b.r, p), fill: mixColor(a.fill, b.fill, p), show, open, appear, done: open >= 1 };
};

export const ShapeMorph: React.FC<PictureProps & { params?: Params<typeof MORPH> }> = ({ f, dur, start = 0, pal, scene, focus, radius, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...MORPH, ...params };
  const t = f - start;
  const fb = focus ?? { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.6 };
  const cx = W / 2;
  const cy = H / 2;
  const at = (w: number, h: number): Box => ({ x: cx - w / 2, y: cy - h / 2, w, h });
  const surface = pal.dark ? mixColor(pal.surface, '#ffffff', 0.08) : pal.surface;
  const shapes: Shape[] = [
    { box: at(P.dot * u, P.dot * u), r: (P.dot * u) / 2, fill: pal.accent },
    { box: at(P.pill[0] * u, P.pill[1] * u), r: (P.pill[1] * u) / 2, fill: pal.accent },
    { box: at(P.square * u, P.square * u), r: 0.26 * P.square * u, fill: surface },
    { box: fb, r: (radius ?? P.radius) * u, fill: surface },
  ];
  const st = morphState(t, dur - start, shapes, film, P);
  const node = scene(f);
  if (st.done) return <div style={{ position: 'absolute', inset: 0 }}>{node}</div>;
  // the open: the shape's clip grows from the product's frame to the whole frame, its face fading so the product's own
  // ground shows
  const box = mixBox(st.box, { x: 0, y: 0, w: W, h: H }, st.open);
  const r = mix(st.r, 0, st.open);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: st.appear }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: st.box.w, height: st.box.h, borderRadius: st.r, ...face(st.fill, pal, u), opacity: 1 - E.softOut(clamp(st.open * 2.5)), transform: `translate3d(${st.box.x.toFixed(2)}px, ${st.box.y.toFixed(2)}px, 0) scale(${mix(0.6, 1, st.appear).toFixed(4)})`, transformOrigin: '50% 50%' }} />
      {st.show > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: st.show }}>
          <SceneView node={node} box={box} view={{ s: 1, tx: 0, ty: 0 }} radius={r} W={W} H={H} />
        </div>
      )}
    </div>
  );
};
