// split-compare: before and after in one frame. The old way fills the frame (a muted card of the steps people do by
// hand today, each still waiting on its spinner); a divider enters from the right and travels to the centre, the old
// card stepping aside to the left half while the product takes the right half; they hold side by side; on the moment
// the divider sweeps on out to the left and the product takes the whole frame, at rest. The contrast tells it.
import React from 'react';
import { FONT } from '../../brand/tokens';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { type Box, face, fitInto, frameOf, k60, mixBox, momentAt, type Pal, type PictureProps, type Recipe, SceneView, type Params } from './core';

/** House numbers (f@60, px@1080): the divider's travel in and out, the old card, its rows and their spinners. */
export const SPLIT = { enter: 38, leave: 26, at: 0.68, card: 0.4, row: 104, text: 46, pad: 44, gap: 18, knob: 44, line: 2.5, spin: 5, veilDark: 0.34, veilLight: 0.05 } as const;

export const RECIPE: Recipe = {
  id: 'split-compare',
  recipe:
    'Before and after in one frame: the old way fills the frame (a muted card of the hand steps, each waiting on a spinner); a divider with a lit knob enters from the right and travels to the centre on strongInOut (38 f), the old card stepping to the left half as the product takes the right half; they hold; on the moment (68 %) the divider sweeps out to the left on launchIn (26 f) and the product takes the whole frame at rest.',
  params: { ...SPLIT },
};

/** The divider's place (share of the width from the left) and the product's growth to the whole frame at frame t. */
export const splitState = (t: number, at: number, film?: Partial<FilmCtx>, o: Params<typeof SPLIT> = {}) => {
  const P = { ...SPLIT, ...o };
  const k = k60(film);
  const a = E.strongInOut(clamp((t - 4 * k) / (P.enter * k)));
  const b = E.launchIn(clamp((t - at) / (P.leave * k)));
  return { divider: mix(1, 0.5, a) * (1 - b), enter: a, leave: b, whole: b >= 1 };
};

/** A spinner (an arc turning at a steady rate: the wait it stands for), `s` px. */
const Spinner: React.FC<{ s: number; t: number; color: string; track: string; k: number }> = ({ s, t, color, track, k }) => (
  <svg width={s} height={s} viewBox="0 0 40 40" style={{ position: 'absolute', left: 0, top: 0 }}>
    <circle cx={20} cy={20} r={15} fill="none" stroke={track} strokeWidth={4.5} />
    <circle cx={20} cy={20} r={15} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeDasharray="26 70" transform={`rotate(${((t / k) * SPLIT.spin).toFixed(2)} 20 20)`} />
  </svg>
);

/** The old way: a muted card, its rows the steps done by hand, each waiting. */
const OldCard: React.FC<{ rows: string[]; box: Box; t: number; pal: Pal; u: number; k: number }> = ({ rows, box, t, pal, u, k }) => {
  const bg = pal.dark ? mixColor(pal.ground, '#ffffff', 0.12) : mixColor(pal.surface, pal.ground, 0.5);
  const ink = mixColor(pal.type, bg, pal.dark ? 0.3 : 0.45);
  const rowH = SPLIT.row * u;
  const pad = SPLIT.pad * u;
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: 28 * u, ...face(bg, pal, u, { flat: !pal.dark }), boxShadow: pal.dark ? 'none' : undefined, transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0)`, overflow: 'hidden' }}>
      {rows.map((r, i) => {
        const y = pad + i * (rowH + SPLIT.gap * u);
        return (
          <div key={i} style={{ position: 'absolute', left: pad, top: y, width: box.w - 2 * pad, height: rowH, borderRadius: 18 * u, background: mixColor(bg, pal.dark ? '#ffffff' : pal.type, 0.05) }}>
            <div data-text={r} style={{ position: 'absolute', left: 28 * u, top: (rowH - SPLIT.text * u * 1.2) / 2, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: SPLIT.text * u, fontWeight: 480, letterSpacing: '-0.01em', lineHeight: 1.2, color: ink }}>{r}</div>
            <div style={{ position: 'absolute', left: box.w - 2 * pad - 28 * u - 40 * u, top: (rowH - 40 * u) / 2, width: 40 * u, height: 40 * u }}>
              <Spinner s={40 * u} t={t + i * 9 * k} color={mixColor(ink, bg, 0.2)} track={mixColor(ink, bg, 0.82)} k={k} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const SplitCompare: React.FC<PictureProps & { before: string[]; params?: Params<typeof SPLIT> }> = ({ f, dur, start = 0, hits, pal, scene, focus, before, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const k = k60(film);
  const P = { ...SPLIT, ...params };
  const t = f - start;
  const at = momentAt(hits, 0, start, dur, P.at) - start;
  const st = splitState(t, at, film, P);
  const node = scene(f);
  if (st.whole) return <div style={{ position: 'absolute', inset: 0 }}>{node}</div>;
  const fb = focus ?? { x: W * 0.25, y: H * 0.18, w: W * 0.5, h: H * 0.64 };
  const dx = st.divider * W;
  // the old card: centred while it fills the frame, then centred in the left half; it leaves with the divider
  const rows = before.slice(0, 4);
  const cw = P.card * W;
  const ch = 2 * P.pad * u + rows.length * P.row * u + Math.max(0, rows.length - 1) * P.gap * u;
  const cx = mix(W / 2, W / 4, st.enter) - st.leave * W * 0.6;
  const card: Box = { x: cx - cw / 2, y: H / 2 - ch / 2, w: cw, h: ch };
  // the product: fitted into the right half while they share the frame, growing to its own place as it takes it
  const half: Box = { x: W * 0.5 + W * 0.04, y: H * 0.12, w: W * 0.42, h: H * 0.76 };
  const v0 = fitInto(fb, half, 'contain');
  const fit = mixBox({ x: v0.tx, y: v0.ty, w: W * v0.s, h: H * v0.s }, { x: 0, y: 0, w: W, h: H }, st.leave);
  const view = { s: fit.w / W, tx: fit.x, ty: fit.y };
  // the veil darkens the lit ground it lies on (a translucent shade, never a flat slab over the family's light)
  const veil = pal.dark ? `rgba(0, 0, 0, ${P.veilDark})` : `rgba(0, 0, 0, ${P.veilLight})`;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* the old side: the ground in shade left of the divider (its light still showing through), the old card on it */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `inset(0px ${(W - dx).toFixed(2)}px 0px 0px)` }}>
        <div style={{ position: 'absolute', inset: 0, background: veil }} />
        <OldCard rows={rows} box={card} t={t} pal={pal} u={u} k={k} />
      </div>
      {/* the new side: the product, right of the divider */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `inset(0px 0px 0px ${dx.toFixed(2)}px)` }}>
        <SceneView node={node} box={{ x: 0, y: 0, w: W, h: H }} view={view} W={W} H={H} clip={false} />
      </div>
      {/* the divider: a line of light and a lit knob */}
      {st.divider > 0.001 && st.divider < 0.999 && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, width: P.line * u, height: H, background: pal.dark ? mixColor(pal.ground, '#ffffff', 0.6) : '#ffffff', boxShadow: `0 0 ${(18 * u).toFixed(1)}px rgba(0, 0, 0, ${pal.dark ? 0.4 : 0.12})`, transform: `translate3d(${(dx - (P.line * u) / 2).toFixed(2)}px, 0, 0)` }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: P.knob * u * 2, height: P.knob * u * 2, borderRadius: '50%', ...face(pal.dark ? mixColor(pal.surface, '#ffffff', 0.85) : '#ffffff', pal, u), transform: `translate3d(${(dx - P.knob * u).toFixed(2)}px, ${(H / 2 - P.knob * u).toFixed(2)}px, 0)` }} />
        </>
      )}
    </div>
  );
};
