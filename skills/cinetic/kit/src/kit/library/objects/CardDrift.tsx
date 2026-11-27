// CardDrift (object, idle): small cards (pictures, chips, app tiles) float round a centred line at several depths,
// each drifting slowly outward at its own speed (the near ones faster, larger and sharp, the far ones small and soft),
// while extra items pop into the gaps one at a time.
// Numbers: cards placed in a ring round a clear centre (40 % of W by 24 % of H kept empty); depth 0..1 gives scale 60 to
// 120 %, blur 3 px to 0 and a drift of 0.05 to 0.25 % of W a frame away from the centre; the first set lands on 0-8 f
// (each from 85 %, 1 f apart), `pops` arrive one every 6 f from 14 f with a 4 f pop (to 108 %, then 100 %).
// Caution: everything in it is content of the film's world (its pictures, its apps); keep the line in the clear centre.
// Catalogue: ../catalog/object.ts; props and recipe: references/library-objects.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, clamp, mix, keys } from '../../motion';
import { rnd } from './_shared';

export const CardDrift: React.FC<{
  /** The floating items, drawn centred. */
  items: React.ReactNode[];
  /** Items that pop into the gaps later, one every 6 f. */
  pops?: React.ReactNode[];
  at?: number;
  /** The clear centre as shares of W and H. */
  clear?: { w: number; h: number };
  seed?: number;
}> = ({ items, pops = [], at = 0, clear = { w: 0.4, h: 0.24 }, seed = 11 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < at) return null;
  const t = f - at;
  const all = [...items.map((n, i) => ({ n, born: i % 9, pop: false })), ...pops.map((n, i) => ({ n, born: 14 + i * 6, pop: true }))];
  const placed = all.map((it, i) => {
    // a place outside the clear centre: an angle round the centre and a distance past the clear box's edge
    const a = (i / all.length) * Math.PI * 2 + (rnd(seed, i, 1) - 0.5) * 0.25;
    const ex = (clear.w / 2) * W;
    const ey = (clear.h / 2) * H;
    const edge = 1 / Math.max(Math.abs(Math.cos(a)) / ex, Math.abs(Math.sin(a)) / ey);
    // alternate an inner and an outer band so neighbours do not overlap
    const room = Math.min(W, H) * ((i % 2 ? 0.05 : 0.24) + rnd(seed, i, 2) * 0.06);
    const d = edge + room;
    const depth = it.pop ? 0.75 + rnd(seed, i, 3) * 0.25 : rnd(seed, i, 3);
    const v = mix(depth, 0.0005, 0.0025) * W;
    const age = t - it.born;
    // the drift slows as it nears the frame's edge and never crosses an ellipse 42 % of W by 34 % of H from the centre,
    // so no item is cut by the frame however long it holds
    const rMax = Math.min((0.42 * W) / Math.max(1e-6, Math.abs(Math.cos(a))), (0.34 * H) / Math.max(1e-6, 0.9 * Math.abs(Math.sin(a))));
    const raw = d + v * Math.max(0, t);
    const knee = rMax * 0.8;
    const r = raw <= knee ? raw : knee + (raw - knee) / (1 + (raw - knee) / (rMax - knee));
    const px = W / 2 + Math.cos(a) * r;
    const py = H / 2 + Math.sin(a) * r * 0.9;
    const enter = it.pop ? keys(age, [[0, 0.6], [2, 1.08], [4, 1]], ease.out) : mix(ease.out(clamp((age + 1) / 4)), 0.85, 1);
    const s = mix(depth, 0.6, 1.2) * enter;
    return { depth, age, el: { px, py, s, blur: (1 - depth) * 3, node: it.n } };
  });
  return (
    <AbsoluteFill>
      {placed
        .filter((p) => p.age >= 0)
        .sort((a, b) => a.depth - b.depth)
        .map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.el.px, top: p.el.py, transform: `translate(-50%, -50%) scale(${p.el.s.toFixed(4)})`, filter: p.el.blur > 0.4 ? `blur(${p.el.blur.toFixed(1)}px)` : undefined }}>
            {p.el.node}
          </div>
        ))}
    </AbsoluteFill>
  );
};
