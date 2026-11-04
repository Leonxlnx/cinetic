import React from 'react';
import { clamp, E, type Ease, fd, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { FONT } from '../brand/tokens';
import type { Declares, SteppedRange } from '../timeline';

/**
 * Streak: light that becomes type, and lines of light.
 *
 *   StreakResolve  the caption is born from light: first a thin bright horizontal streak about the caption's
 *                  width (letters unreadable) that opens into a thick sideways smear over half its time and holds
 *                  (15 f at 60 fps: the width 0.89 -> 1.03 of the caption, the height from a hairline to the line),
 *                  then the word smeared sideways for a beat (5 f), then sharp; one sample a frame, stepped. The exit
 *                  is the same reversed: the caption dims to 40 % with a sideways ghost, then collapses into a
 *                  widening streak on twos that vanishes, accelerating (18 f)
 *   LightLine      a thin line shoots from a point (a frame edge, a hero) to its end in a few frames (12 f,
 *                  front-loaded) and thins afterwards; several pierce one after another (10-30 f apart). Flat by
 *                  default (no halo); `soft` adds a static sideways-blurred copy
 *
 * The smears are fixed horizontal blurs (SVG filters built once, never animated). Pure state functions.
 */

/** House numbers: frames at 60 fps, px at 1080p, widths as shares of the text width, heights of the line box. */
export const STREAK = { streak60: 15, open: 0.5, from: 0.89, to: 1.03, hFrom: 0.12, core: 3, heavy: 110, smear60: 5, sigmaX: 40, exit60: 18, dim: 0.4, ghostShare: 0.3, collapseTo: 1.4 } as const;

export type StreakProps = {
  at: number; // the streak appears
  streak?: { frames?: number; open?: number; from?: number; to?: number; hFrom?: number; ease?: Ease }; // house 15 f, opening over the first half (E.whipBuild), width 0.89 -> 1.03, height 0.12 -> 1
  smear?: { frames?: number; sigmaX?: number }; // house 5 f at sigma 40 px
  grow?: 'centre' | 'right'; // the streak widens from its centre or out of the line's left (to the right)
  exit?: { at: number; frames?: number; dim?: number }; // house 18 f, dim to 0.4
  id?: string;
};

export type StreakPhase = 'off' | 'streak' | 'smear' | 'sharp' | 'ghost' | 'collapse' | 'gone';
/** w: width share of the text; hk: height share of the line box (streak); core: the bright hairline's opacity. */
export type StreakState = { phase: StreakPhase; w: number; hk: number; core: number; opacity: number; smear: boolean };

/** The phase, the streak's width and height shares, the core line and the opacity at frame f. Pure. */
export const streakState = (frame: number, p: StreakProps, film?: Partial<FilmCtx>): StreakState => {
  const fps = fpsOf(film);
  const F = fd(frame); // one sample a frame: decide on whole frames
  const sf = Math.max(1, Math.round(f60x(p.streak?.frames ?? STREAK.streak60, fps)));
  const mf = Math.max(1, Math.round(f60x(p.smear?.frames ?? STREAK.smear60, fps)));
  const off: StreakState = { phase: 'off', w: 0, hk: 0, core: 0, opacity: 0, smear: false };
  if (F < p.at) return off;
  if (p.exit && F >= p.exit.at) {
    const ef = Math.max(2, Math.round(f60x(p.exit.frames ?? STREAK.exit60, fps)));
    const t = (F - p.exit.at) / ef;
    if (t >= 1) return { ...off, phase: 'gone' };
    if (t < STREAK.ghostShare) return { phase: 'ghost', w: 1, hk: 1, core: 0, opacity: mix(1, p.exit.dim ?? STREAK.dim, t / STREAK.ghostShare), smear: true };
    const g = p.exit.at + Math.round(ef * STREAK.ghostShare);
    const k = (Math.floor((F - g) / 2) * 2) / Math.max(1, ef - (g - p.exit.at)); // on twos
    const q = E.buildIn(clamp(k));
    return { phase: 'collapse', w: mix(1, STREAK.collapseTo, q), hk: mix(0.5, 0.06, q), core: 1 - q, opacity: Math.min(1, (p.exit.dim ?? STREAK.dim) + 0.35) * (1 - q), smear: false };
  }
  if (F < p.at + sf) {
    const openF = Math.max(1, Math.round(sf * (p.streak?.open ?? STREAK.open)));
    const k = (p.streak?.ease ?? E.whipBuild)(clamp((F - p.at) / openF));
    return { phase: 'streak', w: mix(p.streak?.from ?? STREAK.from, p.streak?.to ?? STREAK.to, k), hk: mix(p.streak?.hFrom ?? STREAK.hFrom, 1, k), core: 1 - k, opacity: 1, smear: false };
  }
  if (F < p.at + sf + mf) return { phase: 'smear', w: 1, hk: 1, core: 0, opacity: 1, smear: true };
  return { phase: 'sharp', w: 1, hk: 1, core: 0, opacity: 1, smear: false };
};

/** Sync: the streak (a shimmer), the smear, sharp (the caption leads the spoken word by 2-16 f), the exit. */
export const streakFrames = (p: StreakProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const sf = Math.max(1, Math.round(f60x(p.streak?.frames ?? STREAK.streak60, fps)));
  const mf = Math.max(1, Math.round(f60x(p.smear?.frames ?? STREAK.smear60, fps)));
  const exitEnd = p.exit ? p.exit.at + Math.max(2, Math.round(f60x(p.exit.frames ?? STREAK.exit60, fps))) : undefined;
  return { streak: p.at, smear: p.at + sf, sharp: p.at + sf + mf, exit: p.exit?.at, gone: exitEnd };
};

/**
 * Draws the caption centred on (x, y) through its streak, smear and sharp states. Measures the text (FontGate).
 * The streak is the caption itself through a heavy sideways blur, squeezed to the streak's height, with a bright
 * hairline core in `light` (the caption's colour by default) that fades as the streak opens.
 */
export const StreakResolve: React.FC<StreakProps & { frame: number; text: string; x: number; y: number; font: { size: number; weight: number; track: number; family?: string; color: string }; light?: string }> = (props) => {
  const film = useFilm();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const s = streakState(props.frame, props, film);
  if (s.phase === 'off' || s.phase === 'gone') return null;
  const u = uOf(film);
  const f = props.font;
  const fam = f.family ?? FONT.text;
  const tw = measureTracked(props.text, f.size, f.weight, f.track, fam);
  const lh = f.size * 1.2;
  const sigma = (props.smear?.sigmaX ?? STREAK.sigmaX) * u;
  const text: React.CSSProperties = { position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: fam, fontSize: f.size, fontWeight: f.weight, letterSpacing: `${f.track}em`, lineHeight: `${lh}px`, color: f.color };
  const defs = (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <filter id={`sm-${uid}`} x="-50%" y="-20%" width="200%" height="140%">
        <feGaussianBlur stdDeviation={`${sigma.toFixed(1)} 0`} />
      </filter>
      <filter id={`hv-${uid}`} x="-60%" y="-40%" width="220%" height="180%">
        <feGaussianBlur stdDeviation={`${(STREAK.heavy * u).toFixed(1)} ${(4 * u).toFixed(1)}`} />
      </filter>
    </svg>
  );
  const pos = `translate(${(props.x - tw / 2).toFixed(2)}px, ${(props.y - lh / 2).toFixed(2)}px)`;
  if (s.phase === 'streak' || s.phase === 'collapse') {
    const ox = (props.grow ?? 'centre') === 'right' ? 0 : tw / 2;
    const core = STREAK.core * u;
    const w = tw * s.w;
    const x0 = (props.grow ?? 'centre') === 'right' ? props.x - tw / 2 : props.x - w / 2;
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, opacity: s.opacity }}>
        {defs}
        <div style={{ ...text, transform: `${pos} scale(${s.w.toFixed(4)}, ${s.hk.toFixed(4)})`, transformOrigin: `${ox}px ${lh / 2}px`, filter: `url(#hv-${uid})` }}>{props.text}</div>
        {s.core > 0.01 && <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: core, borderRadius: core, background: props.light ?? f.color, opacity: s.core, transform: `translate(${x0.toFixed(2)}px, ${(props.y - core / 2).toFixed(2)}px)` }} />}
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, opacity: s.opacity }}>
      {defs}
      {s.smear && <div style={{ ...text, transform: pos, filter: `url(#sm-${uid})`, opacity: s.phase === 'smear' ? 1 : 0.8 }}>{props.text}</div>}
      {(!s.smear || s.phase === 'ghost') && <div style={{ ...text, transform: pos }}>{props.text}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- LightLine

/** House numbers: frames at 60 fps, px at 1080p. */
export const LIGHT_LINE = { grow60: 12, thin: { to: 0.35, frames60: 10 }, width: 4, sigma: 10 } as const;

export type LightLineProps = {
  at: number;
  from: [number, number]; // px
  to: [number, number];
  grow?: { frames?: number; ease?: Ease }; // house 12 f on E.snapOut (quad-out like)
  thin?: false | { to?: number; frames?: number }; // the width thins to this share after the growth (house 0.35 over 10 f)
  width?: number; // px at 1080p (house 4; 60-100 for a light bar)
  id?: string;
};

/** The line's drawn share of its length, its width (px) and its end point at frame f. Pure. */
export const lightLineState = (frame: number, p: LightLineProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const gf = Math.max(1, f60x(p.grow?.frames ?? LIGHT_LINE.grow60, fps));
  const len = frame < p.at ? 0 : (p.grow?.ease ?? E.snapOut)(clamp((frame - p.at) / gf));
  const w0 = (p.width ?? LIGHT_LINE.width) * uOf(film);
  const th = p.thin === false ? 0 : E.softOut(clamp((frame - p.at - gf) / Math.max(1, f60x(p.thin?.frames ?? LIGHT_LINE.thin.frames60, fps))));
  const width = mix(w0, w0 * (p.thin === false ? 1 : (p.thin?.to ?? LIGHT_LINE.thin.to)), th);
  return { len, width, end: [mix(p.from[0], p.to[0], len), mix(p.from[1], p.to[1], len)] as [number, number], visible: len > 0 };
};

/** Draws the line (round caps) in `color`; `soft` adds a static blurred copy under it (dark stages only). */
export const LightLine: React.FC<LightLineProps & { frame: number; color: string; soft?: boolean }> = (props) => {
  const film = useFilm();
  const s = lightLineState(props.frame, props, film);
  if (!s.visible) return null;
  const sig = LIGHT_LINE.sigma * uOf(film);
  const line = (w: number, extra: React.SVGProps<SVGLineElement> = {}) => <line x1={props.from[0]} y1={props.from[1]} x2={s.end[0]} y2={s.end[1]} stroke={props.color} strokeWidth={w} strokeLinecap="round" {...extra} />;
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} aria-hidden>
      {props.soft && (
        <>
          <filter id={`ll-${props.id ?? 'line'}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={sig} />
          </filter>
          {line(s.width * 3, { opacity: 0.45, filter: `url(#ll-${props.id ?? 'line'})` })}
        </>
      )}
      {line(s.width)}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------- declares

/** A streak resolve is one sample a frame (stepped) from the streak to sharp, and through its exit. */
export const declares = (p?: { streak?: Partial<StreakProps> }, film?: Partial<FilmCtx>): Declares => {
  const s = p?.streak;
  if (!s || s.at === undefined) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = streakFrames(s as StreakProps, film);
  const id = s.id ?? 'streak';
  const stepped: SteppedRange[] = [{ from: fr.streak, to: fr.sharp + 1, id }];
  if (fr.exit !== undefined && fr.gone !== undefined) stepped.push({ from: fr.exit, to: fr.gone + 1, id: `${id}-exit` });
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
