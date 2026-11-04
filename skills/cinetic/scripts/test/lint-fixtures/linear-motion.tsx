// Fixture for scripts/test/lint-film.test.mjs. expect: linear-motion=6
// A move, a turn, a scale, a fade or a blur at a constant rate fails: interpolate() with no easing, E.linear, a raw
// frame ratio (frame / n, frame * k), a scene's raw span() ramp, and a scale tweened in value space over a big ratio.
// Eased and log-space moves, a ramp handed to a curve, a colour lerp and a true live rate with its lint-ok reason pass.
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { clamp, E, mix, prog, XP, zoomAt } from './anim';
import { mixColor } from './color';
import { span, useClock } from './parts';

export const A: React.FC = () => {
  const frame = useCurrentFrame();
  const { t } = useClock();
  const x = interpolate(frame, [0, 30], [0, 400], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fade = prog(frame, 10, 40, E.linear);
  const spin = frame * 3;
  const blur = 8 * (1 - frame / 20);
  const rise = span(t, 4, 12);
  const dive = mix(1, 2.4, prog(frame, 0, 60, E.glideOut));
  // passes
  const shown = interpolate(frame, [0, 30], [0, 1], { easing: E.snapOut, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const push = zoomAt(frame, 0, 90, 1, 1.6);
  const pan = 300 * XP.travel(clamp(frame / 40));
  const sway = 6 * E.stdInOut(clamp((frame - 40) / 20));
  const hue = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const turn = frame * 0.5; // lint-ok: a clock hand turning at its live rate
  const lift = E.snapOut(span(t, 2, 8));
  return (
    <>
      <div style={{ transform: `translateX(${x}px) rotate(${spin}deg) scale(${dive})`, opacity: fade, filter: `blur(${blur}px)` }} />
      <div style={{ transform: `translateY(${(1 - rise) * 40}px)` }} />
      <div style={{ opacity: shown * lift, transform: `translateX(${pan}px) translateY(${sway}px) scale(${push})`, background: mixColor('#101418', '#1C2228', hue) }} />
      <div style={{ transform: `rotate(${turn}deg)` }} />
    </>
  );
};
