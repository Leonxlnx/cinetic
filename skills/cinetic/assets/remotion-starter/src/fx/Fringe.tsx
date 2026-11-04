import React, { useId } from 'react';
import { MASK } from '../brand/tokens';
import { clamp } from '../lib/anim';
import { type FilmCtx, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Fringe: chromatic aberration on the graphic layer, a lens property rather than an effect. The layer (with its
 * ground: build it once over everything, never per element) is drawn three times, each copy through a static
 * filter that keeps one channel, recombined in screen blend over black:
 *
 *   radial   red scales 1 - amount and blue 1 + amount about `centre`, so a thin luminous line far from the
 *            centre splits into three (warm inside, a green core, blue outside) and things split more as they
 *            move outward (house amount 0.006; 0.018 for a lo-fi look)
 *   lateral  red and blue copies shift by +-px along `angle` (house 2.5 px: glass edges; 1.2 % of the width,
 *            23 px, for an expired-film look on stills)
 *
 * `smear` adds one fixed one-axis blur copy at 40 % (a soft sideways smear). Levels are static per shot or
 * stepped (`levels`: [{ at, amount }], declared), or follow a speed (fringeForSpeed: a rush that splits on its
 * fastest frames only). The filters never animate; only the copies' transforms change.
 */

export const FRINGE = { radial: 0.006, lofi: 0.018, lateralShare: 0.012, glassPx: 2.5, smear: 0.4, smearPx: 14 } as const;

export type FringeProps = {
  mode?: 'radial' | 'lateral';
  amount?: number; // radial: scale split (0.006); lateral: px at 1080p (2.5)
  centre?: [number, number]; // shares of the frame (0.5, 0.5)
  angle?: number; // lateral: degrees (0 = red to the right)
  levels?: { at: number; amount: number }[]; // stepped levels (sorted by at)
  smear?: number | false; // the one-axis blur copy's opacity (false = none)
  id?: string;
};

/** The split at frame f: the active amount and the red / blue offsets (px, at the film's size) or scales. Pure. */
export const fringeState = (frame: number, p: FringeProps, film?: Partial<FilmCtx>) => {
  const u = uOf(film);
  const mode = p.mode ?? 'radial';
  let amount = p.amount ?? (mode === 'radial' ? FRINGE.radial : FRINGE.glassPx);
  if (p.levels?.length) {
    const lv = p.levels.filter((l) => l.at <= frame);
    amount = lv.length ? lv[lv.length - 1].amount : 0;
  }
  if (mode === 'radial') return { mode, amount, red: { dx: 0, dy: 0, s: 1 - amount }, blue: { dx: 0, dy: 0, s: 1 + amount } };
  const a = ((p.angle ?? 0) * Math.PI) / 180;
  const d = amount * u;
  return { mode, amount, red: { dx: d * Math.cos(a), dy: d * Math.sin(a), s: 1 }, blue: { dx: -d * Math.cos(a), dy: -d * Math.sin(a), s: 1 } };
};

/** A split that follows speed: none below `from` px per 60 fps frame, `max` at `to` and above (linear between). Pure. */
export const fringeForSpeed = (speed60: number, max: number, from = 12, to = 60) => max * clamp((Math.abs(speed60) - from) / (to - from));

/** Sync: each stepped level change (a tick). */
export const fringeFrames = (p: FringeProps, film?: Partial<FilmCtx>) => {
  fpsOf(film);
  return { steps: (p.levels ?? []).map((l) => l.at) };
};

const KEEP = {
  r: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0',
  g: '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0',
  b: '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0',
};

/** Draws `children` (the whole graphic layer, ground included) three times with the split. */
export const Fringe: React.FC<FringeProps & { frame: number; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const s = fringeState(props.frame, props, film);
  const [cx, cy] = props.centre ?? [0.5, 0.5];
  const origin = `${cx * 100}% ${cy * 100}%`;
  const tf = (o: { dx: number; dy: number; s: number }) => `translate(${o.dx.toFixed(2)}px, ${o.dy.toFixed(2)}px) scale(${o.s.toFixed(5)})`;
  const smear = props.smear === undefined ? false : props.smear;
  const layer = (key: string, filter: string, transform: string, blend?: React.CSSProperties['mixBlendMode'], opacity = 1) => (
    <div key={key} style={{ position: 'absolute', inset: 0, filter, transform, transformOrigin: origin, mixBlendMode: blend, opacity }}>
      {props.children}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', isolation: 'isolate', background: MASK }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          {(['r', 'g', 'b'] as const).map((c) => (
            <filter key={c} id={`fr${uid}${c}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={KEEP[c]} />
            </filter>
          ))}
          <filter id={`fr${uid}s`} colorInterpolationFilters="sRGB" x="-5%" y="0" width="110%" height="100%">
            <feGaussianBlur stdDeviation={`${FRINGE.smearPx * uOf(film)} 0`} />
          </filter>
        </defs>
      </svg>
      {layer('r', `url(#fr${uid}r)`, tf(s.red))}
      {layer('g', `url(#fr${uid}g)`, 'none', 'screen')}
      {layer('b', `url(#fr${uid}b)`, tf(s.blue), 'screen')}
      {smear !== false ? layer('s', `url(#fr${uid}s)`, 'none', 'normal', smear) : null}
    </div>
  );
};

/** Stepped levels are designed changes of the lens: declared as a stepped run; a static split declares nothing. */
export const declares = (p?: Partial<FringeProps>, _film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p?.levels?.length) return none;
  const at = p.levels.map((l) => l.at);
  return { ...none, stepped: [{ from: Math.min(...at), to: Math.max(...at) + 1, id: p.id ?? 'fringe' }] };
};
