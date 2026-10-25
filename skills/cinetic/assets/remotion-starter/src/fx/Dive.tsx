// cinetic:light soft occluder: a static soft-edged layer the camera dives through (a gradient edge, no glow)
import React from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Dive through a layer: a soft occluder (cloud, frosted panel, fog bank, a big blurred foreground
 * object) rises into the frame while the scene behind it defocuses, the camera dives through it, a
 * few frames are nothing but the soft layer (the hidden cut), and the next subject rises out of it
 * with its focus racking in a few frames behind its position (focus lags motion: it reads as a lens).
 *
 * House numbers (60 fps): the occluder rises over 40 f (ease-in), the outgoing scene defocuses to
 * 16 px at 1080p on an accelerating curve and travels up 0.35 of the frame height; 12 f fully covered;
 * the occluder clears over 20 f; the subject rises 0.12 of the height over 18 f (E.glideOut) and its
 * focus racks from 14 px over 36 f, starting 4 f after it starts moving (so focus settles 12-20 f after
 * position: the lag reads as a lens). Soft shapes come from a
 * gradient edge or a static pre-blurred plate only.
 */
export type DiveProps = {
  start: number; // the occluder starts rising
  rise?: number; // frames until it covers the frame
  riseEase?: Ease; // house E.buildIn
  cover?: number; // frames fully covered (the cut sits in the middle)
  clear?: number; // frames the occluder takes to clear upward
  clearEase?: Ease; // house E.launchIn
  defocus?: number; // the outgoing scene's peak defocus, px at 1080p
  defocusEase?: Ease; // house E.buildIn (accelerating)
  travel?: number; // how far the outgoing content moves up during the rise, share of the frame height
  subject?: { rise?: number; from?: number; ease?: Ease; lag?: number; rack?: number; sigma?: number; rackEase?: Ease };
  soft?: number; // the occluder's soft edge, share of the frame height (house 0.35)
  id?: string;
};

export type DiveState = {
  phase: 'before' | 'rise' | 'cover' | 'clear' | 'after';
  edge: number; // the occluder's leading edge, share of the frame height from the top (1 = at the bottom, <= 0 = covering)
  cover: number; // share of the frame fully covered by the occluder body
  sigmaA: number; // outgoing scene defocus, px at 1080p
  travelA: number; // outgoing content offset, px (negative = up)
  showB: boolean; // the incoming scene is drawn (from the cut)
  subjectY: number; // incoming subject offset, px (positive = below its rest)
  sigmaB: number; // incoming subject defocus, px at 1080p
  cut: number; // the hidden cut frame
};

/** The frames of a dive: start, covered, cut, clear start, clear end. */
export const diveFrames = (p: DiveProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const rise = Math.max(1, p.rise ?? f60x(40, fps));
  const cover = Math.max(1, p.cover ?? f60x(12, fps));
  const clear = Math.max(1, p.clear ?? f60x(20, fps));
  const covered = p.start + rise;
  const cut = Math.round(covered + cover / 2);
  return { start: p.start, covered, cut, clearFrom: covered + cover, clearTo: covered + cover + clear };
};

/** The dive at frame f. Pure, closed form. */
export const diveState = (f: number, p: DiveProps, film?: Partial<FilmCtx>): DiveState => {
  const fps = fpsOf(film);
  const { height } = sizeOf(film);
  const fr = diveFrames(p, film);
  const soft = p.soft ?? 0.35;
  const sub = p.subject ?? {};
  // the occluder's body top travels from below the frame (1 + soft) to the top (0) over the rise,
  // holds, then leaves upward (to -1 - soft) over the clear
  let edge: number;
  let phase: DiveState['phase'];
  if (f < fr.start) {
    edge = 1 + soft;
    phase = 'before';
  } else if (f < fr.covered) {
    edge = mix(1 + soft, 0, (p.riseEase ?? E.buildIn)(clamp((f - fr.start) / (fr.covered - fr.start))));
    phase = 'rise';
  } else if (f < fr.clearFrom) {
    edge = 0;
    phase = 'cover';
  } else if (f < fr.clearTo) {
    edge = mix(0, -1 - soft, (p.clearEase ?? E.launchIn)(clamp((f - fr.clearFrom) / (fr.clearTo - fr.clearFrom))));
    phase = 'clear';
  } else {
    edge = -1 - soft;
    phase = 'after';
  }
  const coverShare = phase === 'clear' || phase === 'after' ? clamp(1 + edge) : clamp(1 - edge);
  const k = clamp((f - fr.start) / (fr.covered - fr.start));
  const sigmaA = (p.defocus ?? 16) * (p.defocusEase ?? E.buildIn)(k);
  const travelA = -(p.travel ?? 0.35) * height * (p.riseEase ?? E.buildIn)(k);
  const sRise = Math.max(1, sub.rise ?? f60x(18, fps));
  const sFrom = (sub.from ?? 0.12) * height;
  const sStart = fr.cut; // the subject starts moving on the cut
  const ys = f < sStart ? sFrom : sFrom * (1 - (sub.ease ?? E.glideOut)(clamp((f - sStart) / sRise)));
  const lag = sub.lag ?? f60x(4, fps);
  const rack = Math.max(1, sub.rack ?? f60x(36, fps));
  const sigmaB = (sub.sigma ?? 14) * (1 - (sub.rackEase ?? E.glideOut)(clamp((f - (sStart + lag)) / rack)));
  return { phase, edge, cover: coverShare, sigmaA, travelA, showB: f >= fr.cut, subjectY: ys, sigmaB, cut: fr.cut };
};

/**
 * Renders a dive: `outgoing` (defocusing and travelling up) until the cut, then the `incoming` subject rising
 * and racking into focus over `background`, and the occluder above both. The occluder is `occluder` (a static
 * plate: soft px, then one frame height, then soft px tall) or a flat body of `color` with soft gradient edges
 * above and below. (`subject` is the subject's timing prop, so its content goes in `incoming`.)
 */
export const Dive: React.FC<
  DiveProps & { frame: number; outgoing: React.ReactNode; background?: React.ReactNode; incoming?: React.ReactNode; occluder?: React.ReactNode; color?: string; style?: React.CSSProperties }
> = (props) => {
  const film = useFilm();
  const { width, height } = film;
  const s = diveState(props.frame, props, film);
  const u = uOf(film);
  const soft = (props.soft ?? 0.35) * height;
  const stack = (node: React.ReactNode, sigma: number, y: number) =>
    defocusMix(sigma * u).map((c, i) => (
      <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? `blur(${c.level}px)` : undefined, transform: `translateY(${y.toFixed(3)}px)` }}>
        {node}
      </div>
    ));
  const color = props.color ?? C.paper;
  // the occluder: a soft edge, a body one frame tall, a soft edge; edge 0 = the body covers the frame exactly
  const top = s.edge * height - soft;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      {!s.showB && stack(props.outgoing, s.sigmaA, s.travelA)}
      {s.showB && (
        <>
          {props.background}
          {stack(props.incoming, s.sigmaB, s.subjectY)}
        </>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width, height: soft * 2 + height, transform: `translateY(${top.toFixed(3)}px)` }}>
        {props.occluder ?? (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, width, height: soft, background: `linear-gradient(180deg, transparent 0%, ${color} 100%)` }} />
            <div style={{ position: 'absolute', left: 0, top: soft - 0.5, width, height: height + 1, background: color }} />
            <div style={{ position: 'absolute', left: 0, top: soft + height, width, height: soft, background: `linear-gradient(180deg, ${color} 0%, transparent 100%)` }} />
          </>
        )}
      </div>
    </div>
  );
};

/** A dive is a `defocus` seam (the cut is hidden inside the occluder), carrying the vertical move. */
export const declares = (p?: Partial<DiveProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.start === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = diveFrames(p as DiveProps, film);
  return { stepped: [], flashes: [], cameraBlur: [], seams: [{ at: fr.cut, kind: 'defocus', carry: 'y', dir: -1, id: p.id ?? 'dive' }] };
};
