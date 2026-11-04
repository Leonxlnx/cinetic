import React from 'react';
import { clamp } from '../lib/anim';
import { DEFOCUS_LEVELS, type DefocusCopy, defocusLevel, defocusMix } from '../lib/defocus';
import { type FilmCtx, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * The copies a rack draws at progress t (0 sharp, 1 at `blur` px): with ladder levels, at most two
 * copies at FIXED blur radii from lib/defocus (the first at full opacity, the second on top at its
 * weight), so no radius ever animates. `levels` true takes the house ladder.
 */
export const rackState = (t: number, blur: number, levels: boolean | readonly number[] = true): DefocusCopy[] =>
  defocusMix(clamp(t) * Math.max(0, blur), levels === true || levels === false ? DEFOCUS_LEVELS : levels);

/**
 * Rack focus without Chromium's stepped blur ramp. Animating filter: blur() on a large layer jumps
 * from sharp to soft in visible steps, so this renders the layer twice - sharp, and at a constant
 * blur - and cross-fades them (an optional middle copy at ~0.35x the radius hides the double
 * image mid-rack). Copies are overscanned so the blur never pulls in transparent edge pixels.
 * Never put will-change on these layers: promotion plus a blur causes stale ghost frames.
 *
 * `levels` (new): the defocus follows t x blur exactly, drawn as at most two copies at fixed radii of
 * the defocus ladder (lib/defocus.ts) cross-faded by opacity: a rack whose blur reads as a smooth
 * Gaussian ramp at every frame, never more than two blurred layers on the GPU. `hero` (new): content
 * drawn above the blurred stack and kept sharp (or at `heroBlur` x t, one fixed level): the product,
 * the word or the button the eye holds while the world around it goes soft.
 */
export const RackFocus: React.FC<{
  t: number; // 0 = sharp, 1 = fully defocused
  blur: number; // px at t = 1; 10-12 reads as "background"
  mid?: boolean; // add the 0.35x copy for slow racks (1.1 cross-fade only)
  overscan?: number;
  render: () => React.ReactNode; // content in frame coordinates
  style?: React.CSSProperties;
  levels?: boolean | readonly number[]; // true: house ladder; or your own radii (CSS px)
  hero?: () => React.ReactNode; // drawn above the stack, outside the blur
  heroBlur?: number; // the hero's blur at t = 1 (default 0: always sharp)
}> = ({ t, blur, mid = false, overscan = 80, render, style, levels, hero, heroBlur = 0 }) => {
  const { width, height } = useFilm();
  const box: React.CSSProperties = { position: 'absolute', left: -overscan, top: -overscan, width: width + overscan * 2, height: height + overscan * 2, overflow: 'hidden' };
  const inner: React.CSSProperties = { position: 'absolute', left: overscan, top: overscan, width, height };
  const tc = Math.min(1, Math.max(0, t));
  const layer = (px: number, opacity: number, key?: number, draw: () => React.ReactNode = render) => (
    <div key={key} style={{ ...box, filter: px > 0 ? `blur(${px}px)` : undefined, opacity }}>
      <div style={inner}>{draw()}</div>
    </div>
  );
  const heroLayer = hero ? layer(defocusLevel(tc * heroBlur), 1, -1, hero) : null;
  if (levels !== undefined && levels !== false) {
    const copies = rackState(tc, blur, levels);
    return (
      <div style={{ position: 'absolute', inset: 0, ...style }}>
        {copies.map((c, i) => layer(c.level, i === 0 ? 1 : c.weight, i))}
        {heroLayer}
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      {tc < 0.999 && layer(0, 1)}
      {mid && tc > 0.001 && tc < 0.999 && layer(blur * 0.35, Math.sin(Math.PI * tc))}
      {tc > 0.001 && layer(blur, Math.min(1, tc * 1.8))}
      {heroLayer}
    </div>
  );
};

/** What a RackFocus instance does on purpose (steps, flashes, camera blur, seams): nothing; a rack is continuous. */
export const declares = (_props?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
