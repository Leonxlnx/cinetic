// colour-flood: the result takes over the frame. The product plays; on the moment the accent floods out of the element
// just pressed (a disc growing on a log scale until it covers the frame), a check draws itself large in white on the
// colour with the result's word under it, held; then the colour drains back into the element and the product shows its
// new state. The film's one colour event (the timeline declares it).
import React from 'react';
import { FONT } from '../../brand/tokens';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { centreOf, frameOf, inkFor, k60, momentAt, type PictureProps, type Recipe, type Params } from './core';

/** House numbers (f@60, px@1080): the flood's growth and drain, the hold, the check and the word. */
export const FLOOD = { at: 0.34, seed: 44, grow: 20, check: 26, size: 250, word: 72, hold: 0.62, drain: 22, lit: 0.1 } as const;

export const RECIPE: Recipe = {
  id: 'colour-flood',
  recipe:
    'The result takes over the frame: on the moment (34 %) the accent floods out of the element just pressed, a disc growing on a log scale from 44 px to cover the frame (launchIn 20 f); a 250 px check draws itself in white (26 f) with the result word under it, held; at 62 % the colour drains back into the element (strongInOut 22 f) and the product shows its new state. The film\'s one colour event.',
  params: { ...FLOOD },
};

/** The flood at frame t: its radius (px), whether it covers the frame, the check's stroke, the word's arrival. */
export const floodState = (t: number, at: number, back: number, from: { x: number; y: number }, film?: Partial<FilmCtx>, o: Params<typeof FLOOD> = {}) => {
  const P = { ...FLOOD, ...o };
  const k = k60(film);
  const { W, H, u } = frameOf(film);
  const far = Math.max(Math.hypot(from.x, from.y), Math.hypot(W - from.x, from.y), Math.hypot(from.x, H - from.y), Math.hypot(W - from.x, H - from.y)) * 1.04;
  const g = E.launchIn(clamp((t - at) / (P.grow * k)));
  const d = back > at ? E.strongInOut(clamp((t - back) / (P.drain * k))) : 0;
  const lr = (p: number) => Math.exp(mix(Math.log(P.seed * u * 0.5), Math.log(far), p));
  const r = t < at ? 0 : d > 0 ? lr(1 - d) * (d >= 1 ? 0 : 1) : lr(g);
  return { r, covers: g >= 1 && d <= 0, check: E.stdInOut(clamp((t - at - P.grow * k) / (P.check * k))), word: E.snapOut(clamp((t - at - (P.grow + 12) * k) / (22 * k))), on: t >= at && d < 1, drain: d };
};

export const ColourFlood: React.FC<PictureProps & { word?: string; params?: Params<typeof FLOOD> }> = ({ f, dur, start = 0, hits, pal, scene, focus, word, params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...FLOOD, ...params };
  const fb = focus ?? { x: W / 2 - 60 * u, y: H / 2 - 60 * u, w: 120 * u, h: 120 * u };
  const from = centreOf(fb);
  const at = momentAt(hits, 0, start, dur, P.at);
  const back = momentAt(hits, 1, at + 30 * k60(film), dur, P.hold);
  // a beat too short to hold the colour and still drain keeps it to the end (the next seam carries it out)
  const drain = dur - back > P.drain * k60(film) * 1.4 ? back : -1;
  const st = floodState(f, at, drain, from, film, P);
  const ink = inkFor(pal.accent, pal);
  const s = P.size * u;
  const field = pal.accent;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {scene(f)}
      {st.on && st.r > 0 && (
        <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${st.r.toFixed(2)}px at ${from.x.toFixed(2)}px ${from.y.toFixed(2)}px)` }}>
          {/* the field: the accent lit from its top left corner (never a flat slab) */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${mixColor(field, '#ffffff', P.lit)} 0%, ${field} 48%, ${mixColor(field, '#000000', 0.08)} 100%)` }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: s, height: s, opacity: clamp(st.check * 6), transform: `translate3d(${(W / 2 - s / 2).toFixed(2)}px, ${(H / 2 - s * 0.62).toFixed(2)}px, 0)` }}>
            <svg width={s} height={s} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
              <path d="M27 52 L43 68 L74 34" fill="none" stroke={ink} strokeWidth={8.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - st.check} />
            </svg>
          </div>
          {word && (
            <div data-text={word} data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: W, textAlign: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: P.word * u, fontWeight: 620, letterSpacing: '-0.025em', lineHeight: 1.1, color: ink, opacity: st.word, transform: `translate3d(0px, ${(H / 2 + s * 0.42 + (1 - st.word) * 16 * u).toFixed(2)}px, 0)` }}>
              {word}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
