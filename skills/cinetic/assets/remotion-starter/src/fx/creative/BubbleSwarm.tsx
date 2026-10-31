// bubble-swarm: the noise, then the product that ends it. The old way's pieces (the script's `before`: the questions,
// pings and chores the product does away with, short and real) pop up as message bubbles round an empty centre, faster
// and faster; on the product's moment the product arrives in the centre and the bubbles are drawn into it one after
// another, accelerating as they go, until only the product is left, at rest. Bubbles land and hold still where they
// pop (no bobbing, no drift), face the camera and are made of the film's card material; they never overlap.
import React from 'react';
import { C, FONT } from '../../brand/tokens';
import { clamp, E, mix } from '../../lib/anim';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, centreOf, face, frameOf, hash01, k60, momentAt, phrased, type PictureProps, type Recipe, type Params } from './core';
import { widthIn } from './type';

/** House numbers (f@60, px@1080): how many bubbles at most, the span the pops phrase over (share of the time before the
 * moment), the pop, the bubble (height, text size, padding, widest share of the frame), the pull into the product. */
export const SWARM = { max: 7, span: 0.8, pop: 14, h: 100, text: 46, pad: 42, wide: 0.3, absorb: 24, stagger: 3, arrive: 20, at: 0.58 } as const;

export const RECIPE: Recipe = {
  id: 'bubble-swarm',
  recipe:
    'The noise, then the product that ends it: the script\'s `before` items (4-7 short real ones: questions, pings, chores) pop up as message bubbles (100 px pills in the card material, text 46 px) at fixed places round an empty centre, on settling beats over 80 % of the time before the moment (each gap shorter: the noise builds; each pop snapOut 14 f from 0.7 toward the centre); on the moment the product arrives in the centre (glideOut 20 f) and the bubbles are drawn into it 3 f apart, accelerating (buildIn 24 f), shrinking as they reach it. Bubbles hold still where they land and never overlap.',
  params: { ...SWARM },
};

/** The places bubbles may take, as shares of the frame (centre x, centre y), round a centre kept clear for the product. */
const SLOTS: [number, number][] = [
  [0.27, 0.2],
  [0.73, 0.24],
  [0.17, 0.5],
  [0.83, 0.52],
  [0.29, 0.8],
  [0.71, 0.77],
  [0.5, 0.09],
];

/** The bubbles' boxes for `widths` (px), a seed shuffling the places: centred on their slots, pushed apart vertically
 * until no two overlap (16 px between them at 1080p), kept inside the frame. */
export const swarmLayout = (widths: number[], seed: number, film?: Partial<FilmCtx>, o: Params<typeof SWARM> = {}): Box[] => {
  const P = { ...SWARM, ...o };
  const { W, H, u } = frameOf(film);
  const h = P.h * u;
  const order = SLOTS.map((s, i) => ({ s, k: hash01(seed, 40 + i) })).sort((a, b) => a.k - b.k).map((x) => x.s);
  // the first places go to the corners and sides (the top-centre slot only for a seventh bubble)
  const places = [...order.filter((s) => s[1] !== 0.09), ...order.filter((s) => s[1] === 0.09)];
  const boxes = widths.map((w, i) => {
    const [sx, sy] = places[i % places.length];
    const jx = (hash01(seed, 60 + i) - 0.5) * 0.04 * W;
    const x = clamp(sx * W + jx - w / 2, 48 * u, W - 48 * u - w);
    return { x, y: clamp(sy * H - h / 2, 40 * u, H - 40 * u - h), w, h };
  });
  const m = 16 * u;
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = boxes[j];
        const b = boxes[i];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + m;
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + m;
        if (ox > 0 && oy > 0) b.y = clamp(b.y + (b.y >= a.y ? oy : -oy), 40 * u, H - 40 * u - b.h);
      }
    }
  }
  return boxes;
};

/** The swarm at frame t: each bubble's pop (0..1), its pull into the product (0..1), the product's arrival, landed. */
export const swarmState = (t: number, n: number, moment: number, film?: Partial<FilmCtx>, o: Params<typeof SWARM> = {}) => {
  const P = { ...SWARM, ...o };
  const k = k60(film);
  const span = Math.max(1, (moment - P.pop * k) * P.span);
  const onsets = phrased(n, span, 'settle', 0.8);
  const bubbles = onsets.map((on, i) => ({
    pop: E.snapOut(clamp((t - on) / (P.pop * k))),
    pull: E.buildIn(clamp((t - moment - i * P.stagger * k) / (P.absorb * k))),
  }));
  const arrive = E.glideOut(clamp((t - moment + 6 * k) / (P.arrive * k)));
  const done = t >= moment + ((n - 1) * P.stagger + P.absorb) * k && arrive >= 1;
  return { bubbles, arrive, landed: done };
};

export const BubbleSwarm: React.FC<PictureProps & { before?: string[]; params?: Params<typeof SWARM> }> = ({ f, dur, start = 0, hits, pal, scene, focus, seed = 0, before = [], params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...SWARM, ...params };
  const items = before.filter((x) => x.trim()).slice(0, P.max);
  const t = f - start;
  const moment = momentAt(hits, 0, start, dur, P.at) - start;
  const st = swarmState(t, items.length, moment, film, P);
  const node = scene(f);
  if (st.landed || !items.length) return <div style={{ position: 'absolute', inset: 0 }}>{node}</div>;
  const font = { size: P.text * u, weight: 500, track: -0.006, font: FONT.ui ?? FONT.text };
  // a long item sets a little smaller (never under 80 %) so it fits the widest bubble; never cut with an ellipsis
  const sizes = items.map((s) => font.size * clamp((P.wide * W - 2 * P.pad * u) / Math.max(1, widthIn(s, font)), 0.8, 1));
  const widths = items.map((s, i) => Math.min(P.wide * W, widthIn(s, { ...font, size: sizes[i] }) + 2 * P.pad * u));
  const boxes = swarmLayout(widths, seed, film, P);
  const fb = focus ?? { x: W * 0.3, y: H * 0.25, w: W * 0.4, h: H * 0.5 };
  const c = centreOf(fb);
  const ink = pal.dark ? C.white : C.ink; // the film's own inks (tokens), never a hex of the device's
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {st.arrive > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: E.softOut(clamp(st.arrive * 1.4)), transformOrigin: `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`, transform: `scale(${mix(0.9, 1, st.arrive).toFixed(4)})` }}>{node}</div>
      )}
      {items.map((s, i) => {
        const b = boxes[i];
        const { pop, pull } = st.bubbles[i];
        if (pop <= 0 || pull >= 1) return null;
        const bc = centreOf(b);
        // the pop comes from a little toward the centre; the pull goes all the way into the product
        const px = mix(mix(bc.x, c.x, 0.3), bc.x, pop);
        const py = mix(mix(bc.y, c.y, 0.3), bc.y, pop);
        const x = mix(px, c.x, pull);
        const y = mix(py, c.y, pull);
        const s0 = mix(0.7, 1, pop) * mix(1, 0.32, pull);
        return (
          <div key={i} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, borderRadius: b.h / 2, ...face(pal.surface, pal, u, { lift: pull * 0.6 }), opacity: Math.min(E.snapOut(clamp(pop * 1.5)), 1 - clamp((pull - 0.7) / 0.3)), transformOrigin: '50% 50%', transform: `translate3d(${(x - b.w / 2).toFixed(2)}px, ${(y - b.h / 2).toFixed(2)}px, 0) scale(${s0.toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ whiteSpace: 'pre', fontFamily: font.font, fontSize: sizes[i], fontWeight: font.weight, letterSpacing: `${font.track}em`, color: ink }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};
