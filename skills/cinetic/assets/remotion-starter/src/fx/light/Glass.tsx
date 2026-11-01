/**
 * cinetic:light glass catching the world's key: a rim toward the light, a glare across the face, a sweep when it turns
 *
 * Glass: a pane of frosted glass in a <World>. Inside its rounded rect it shows the world behind it blurred (a copy of
 * the world's ground, aligned to the pixel, so the frost is what is really there), a veil lighter toward the key,
 * a 1 px line of light inside the top edge, an inner shade along the bottom (the pane's thickness), a rim brightest on
 * the side that faces the world's key, a faint glare across the face, and on light worlds a soft drop shadow in the
 * world's own dark tone. Everything reads from the world: frost, tints and rim strength suit a cloud plate, a black
 * field or an electric stage without a prop.
 *
 *   <Glass x={460} y={540} w={1000} h={116}>{the input's content}</Glass>
 *   <Glass x={...} y={...} w={640} h={360} r={36} at={20} sweep={48}>{a card}</Glass>
 *
 *   at      the entrance: it rises 26 px into place and clears in over 30 f (E.glideOut); the frost inside stays
 *           registered to the world while the pane moves, as real glass would
 *   sweep   the frame (or frames) a light crosses it (fx/light LightSweep) and its glare slides across the face with
 *           it. Give it when something happens (the pane lands, the input sends), not on a loop
 *   sweepKind  band (the default on a bar or input, w >= 2.5 h: a bar of light crosses the pane and lights its top
 *           and bottom edges at once, the face lit along the bar) or edge (the default on a card: a light runs
 *           along the rim and turns the corner)
 *   r       corner radius: a pill up to 140 px tall, else 28 px
 *   blur    the frost in px at 1080p (the world's: 26-30 over a photo, 0 over a built field, which is already smooth)
 *
 * Children are the content, laid out inside the w x h box (type on glass takes the world's glass.text colour:
 * useWorld()?.spec.glass.text). The glass frosts the world, not other UI behind it: keep panes from overlapping, or
 * stack them so the nearer one is opaque enough. Outside a <World> it draws a dark glass with nothing to frost.
 * Cost: one blurred copy of the glass's own area (plus 3 x the blur around it), skipped when the world has a
 * pre-blurred plate (World soft) or is a built field; the rest are gradients. Pure state: glassState(f, p, film).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../../brand/tokens';
import { type FilmCtx, sizeOf, uOf, useFilm } from '../../lib/film';
import type { Declares } from '../../timeline';
import { useWorld } from '../world/context';
import { worldOf } from '../world/worlds';
import { activeSweep, arrival, bandState, gradientAt, keyAngle, radiusOf, rgbaOf, SWEEP, type SweepKind, sweepKindOf, type SweepOpts } from './light';
import { LightSweep, RimLight } from './Rim';

/** House numbers: px at 1080p, 60 fps frames. `band`: the glare of a band sweep (width % of the face, extra level). */
export const GLASS_LIGHT = { rise: 26, enter60: 30, shadow: { y: 28, blur: 64, near: 12 }, glare: { angle: 104, width: 15, rest: 0.26, band: { width: 7, gain: 0.6 } } } as const;

export type GlassProps = Omit<SweepOpts, 'at'> & {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  circle?: boolean;
  at?: number;
  sweep?: number | readonly number[];
  sweepKind?: SweepKind;
  blur?: number;
  shadow?: boolean; // default: the world's (light worlds cast one)
  frame?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties; // the content box
};

/** The pane at frame f: its arrival 0..1, its offset (px, the rise) and the running sweep, if any. Pure. */
export const glassState = (f: number, p: Pick<GlassProps, 'at' | 'sweep' | 'dur60' | 'from' | 'travel' | 'ease'>, film: Partial<FilmCtx>) => {
  const a = arrival(f, p.at, GLASS_LIGHT.enter60, film);
  return { a, rise: (1 - a) * GLASS_LIGHT.rise, sweep: activeSweep(f, p.sweep, { dur60: p.dur60, from: p.from, travel: p.travel, ease: p.ease }, film) };
};

export const Glass: React.FC<GlassProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const { width: W, height: H } = sizeOf(film);
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const world = useWorld();
  const spec = world?.spec ?? worldOf('blackField');
  const g = spec.glass;
  const st = glassState(f, p, film);
  if (st.a <= 0) return null;
  const r = p.circle ? Math.min(p.w, p.h) / 2 : radiusOf(p, u);
  const x = p.x;
  const y = p.y + st.rise * u;
  const blur = (p.blur ?? (world?.hasSoft ? 0 : g.blur)) * u;
  const m = Math.ceil(blur * 3) + 2;
  // the frost: only the parts that do something (a filter at identity still costs a layer)
  const frost = [blur > 0 ? `blur(${blur.toFixed(2)}px)` : '', g.sat !== 1 ? `saturate(${g.sat})` : '', g.brighten !== 1 ? `brightness(${g.brighten})` : ''].filter(Boolean).join(' ') || undefined;
  const box: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, borderRadius: r };
  const angle = keyAngle({ x, y, w: p.w, h: p.h }, spec.key, W, H);
  // the glare: a soft diagonal band, resting on the key's side of the face; a sweep slides it across (a band sweep:
  // along the bar of light itself, leaning with it, narrower and brighter)
  const kind = sweepKindOf(p.w, p.h, p.sweepKind, p.circle);
  const GL = GLASS_LIGHT.glare;
  const keySide = Math.cos((angle * Math.PI) / 180) >= 0 ? 1 - GL.rest : GL.rest;
  const band = st.sweep && kind === 'band';
  const gAngle = band ? 90 - SWEEP.band.tilt : GL.angle;
  const gc = st.sweep ? (band ? gradientAt(p.w, p.h, gAngle, bandState(p.w, p.h, r, st.sweep.e, u).xc) : -0.25 + 1.5 * st.sweep.t) : keySide;
  const ga = g.spec * (st.sweep ? 1 + (band ? GL.band.gain : 1.6) * st.sweep.level : 1);
  const gw = band ? GL.band.width : GL.width;
  const pc = (v: number) => `${(v * 100).toFixed(2)}%`;
  const glare = `linear-gradient(${gAngle}deg, ${rgbaOf(C.white, 0)} ${pc(gc - gw / 100)}, ${rgbaOf(C.white, ga)} ${pc(gc)}, ${rgbaOf(C.white, 0)} ${pc(gc + (gw * 1.2) / 100)})`;
  const S = GLASS_LIGHT.shadow;
  const shadow = (p.shadow ?? !!g.shadow) && g.shadow;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`, opacity: st.a }}>
      {shadow ? <div style={{ ...box, boxShadow: `0 ${S.y * u}px ${S.blur * u}px ${shadow}, 0 ${4 * u}px ${S.near * u}px ${shadow}` }} /> : null}
      <div style={{ ...box, overflow: 'hidden', isolation: 'isolate' }}>
        {world ? (
          <div data-audit-copy style={{ position: 'absolute', left: -m, top: -m, width: p.w + 2 * m, height: p.h + 2 * m, overflow: 'hidden', filter: frost }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${(m - x).toFixed(2)}px, ${(m - y).toFixed(2)}px)` }}>{world.ground({ soft: true, bare: true })}</div>
          </div>
        ) : (
          <div style={{ ...box, background: spec.base }} />
        )}
        {/* the veil: lighter on the side that faces the key (the face catching the light), clearer away from it */}
        <div style={{ ...box, background: `linear-gradient(${(angle + 90 + 180).toFixed(1)}deg, ${g.veilTop}, ${g.veil} 64%)` }} />
        <div style={{ ...box, background: glare }} />
        <div style={{ ...box, boxShadow: `inset 0 ${-14 * u}px ${30 * u}px ${rgbaOf(C.ink, g.shade)}, inset 0 ${1.2 * u}px 0 ${rgbaOf(C.white, g.hi)}` }} />
      </div>
      <RimLight w={p.w} h={p.h} r={r} circle={p.circle} angle={angle} />
      {p.sweep !== undefined ? <LightSweep w={p.w} h={p.h} r={r} circle={p.circle} at={p.sweep} kind={kind} dur60={p.dur60} from={p.from} travel={p.travel} ease={p.ease} frame={f} /> : null}
      <div style={{ ...box, color: g.text, ...p.style }}>{p.children}</div>
    </div>
  );
};

/** Glass is a material: nothing steps or flashes. */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
