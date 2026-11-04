// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// mark-pullback: the product's mark as an extruded solid, opened on an extreme close-up of one stroke, pulls back
// fast and decelerates on a log-scale dolly while the camera rolls 17 degrees, until the whole mark stands in frame;
// ONE snap cut to the lockup assembling: the mark's parts slide together (the accent part glowing), the name's letters
// cut on one a frame and close their spacing, the whole lockup settles, then keeps a slow push toward the lens to the
// last frame (a living tail, never a still card). One snap device; no small flat mark alone on an empty ground.
// Numbers (frames at 30 fps, px at 1080): the dolly widens the view x4.6 in 27 f, 27 % of it (in log distance) in the
// first 2 f, 76 % by 10 f; the roll 0 -> 17 deg on the same front-loaded curve; the first 5 f rack in from 24 px soft
// (the cut into the scene lands inside a blur);
// the cut at 28 f; the lockup: parts 1.1 mark widths apart close in 7 f, letters 1 a frame each 0.22 em wide of their
// place closing in ~4 f, the lockup x1.117 -> 1 and 42 px right -> centred in 15 f, then the push 0.12 % a frame
// (about 0.5 px a frame at the lockup's ends, which forensics reads as motion) to the end of the film.
// The ground is the palette's own clean ground (`band` adds the accent band over its top).
// The solid is fx/three's Logo3D (real extrusion on a GPU, its CSS-3D solid on software GL), driven on this curve.
import React, { useMemo } from 'react';
import { Freeze } from 'remotion';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { C, FONT } from '../brand/tokens';
import { Logo3D } from '../fx/three/Logo3D';
import type { GlMode } from '../fx/three/gl';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { baselineOf, measureTracked } from '../lib/measure';
import { decay, markBox, type Palette, paletteOf, type SceneMeta, tab, useClock } from './parts';

export type MarkPullbackProps = {
  /** the product's name, set beside the mark in the lockup */
  name: string;
  /** the product's mark: logoParts() of its SVG (default the starter's mark) */
  logo?: Logo;
  /** a screen-fixed accent band over the top of the ground (default none: the palette's clean ground) */
  band?: boolean;
  palette?: Partial<Palette>;
  gl?: GlMode;
  frame?: number;
};

export const PULLBACK = { dur: 60, cut: 28, lockup: 28, settled: 43, scale: 4.6, creep: 0.0012 } as const;

// log-distance progress of the dolly and the roll (deg), measured (front-loaded, a long settle)
const DOLLY: [number, number][] = [[0, 0], [1, 0.12], [2, 0.27], [4, 0.47], [6, 0.61], [10, 0.76], [14, 0.87], [18, 0.95], [21, 0.975], [24.5, 0.99], [27, 1]];
const ROLL: [number, number][] = [[0, 0], [1, 1.7], [2, 3.7], [4, 6.6], [6, 9.2], [10, 12], [14, 14.2], [18, 15.6], [21, 16.6], [24.5, 17.1], [27, 17.3]];
const SOFT: [number, number][] = [[0, 24], [1.5, 14], [3, 6], [5, 0]];
const SETTLE: [number, number][] = [[29, 1.117], [34, 1.031], [39, 1.003], [43, 1.001], [48, 1]];
/**
 * The lockup's scale at scene frame t (30 fps): its settle x1.117 -> 1, then the living push (PULLBACK.creep a frame)
 * from the settle on. A template that sets something beside the lockup (a version pill) rides this same scale.
 */
export const pullbackScale = (t: number): number => tab(t, SETTLE) * (1 + PULLBACK.creep * Math.max(0, t - PULLBACK.settled));
// Logo3D's zoom runs on strongInOut: its progress for a wanted zoom share, by bisection (monotone)
const zoomInverse = (z: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (E.strongInOut(m) < z) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
// the close-up's pose (x the lockup, a slight turn that unwinds, the point of the mark that fills the frame); the
// depth never presses flat and the colour never settles: this scene cuts to the lockup instead of landing on it
const FROM = { scale: PULLBACK.scale, yaw: 12, pitch: 7, roll: 0, focus: [0.12, -0.04] as [number, number], depth: 16, flatten: [2, 3] as [number, number], flat: [2, 3] as [number, number] };

export const MarkPullback: React.FC<MarkPullbackProps> = ({ name, logo, band = false, palette, gl = 'auto', frame }) => {
  const { t, W, H, u, k } = useClock(frame);
  const P = paletteOf(palette);
  // no logo given: the starter's placeholder mark painted in this palette, never in the starter's own accent
  const lg = useMemo(() => logo ?? logoParts(SAMPLE_MARK_SVG.split(C.accent).join(P.accent).split(C.ink).join(P.ink)), [logo, P.accent, P.ink]);
  const cx = W / 2;
  // ---- the ground: the palette's clean ground (with `band`, a screen-fixed accent band over its top)
  const bandAt = 28 + 8 * clamp((t - PULLBACK.cut) / 30);
  const ground = band ? `linear-gradient(180deg, ${mixColor(P.accent, P.ground, 0.12)} 0%, ${mixColor(P.accent, P.ground, 0.55)} ${bandAt}%, ${P.ground} ${bandAt + 20}%, ${P.ground} 100%)` : P.ground;
  // ---- 1. the solid pulls back
  if (t < PULLBACK.cut) {
    const box = lg.box;
    const markH = Math.min(0.56 * H, (0.5 * W * box.h) / Math.max(1, box.w));
    const size = (markH * 100) / box.h;
    const lockup = { x: cx + 50 * u - ((box.x + box.w / 2) * size) / 100, y: H / 2 - 15 * u - ((box.y + box.h / 2) * size) / 100, size };
    const pIn = Math.min(0.999, zoomInverse(tab(t, DOLLY)));
    const durF = 30 * k; // Logo3D's dur 60 f@60, in this film's frames
    const soft = tab(t, SOFT) * u;
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: ground }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${H / 2}px`, transform: `rotate(${tab(t, ROLL).toFixed(3)}deg)`, filter: soft > 0.05 ? `blur(${soft.toFixed(2)}px)` : undefined }}>
          <Freeze frame={pIn * durF}>
            <Logo3D lockup={lockup} logo={lg} at={0} dur={60} depth={16} bevel={2} from={FROM} gl={gl} finish="satin" />
          </Freeze>
        </div>
      </div>
    );
  }
  // ---- 2. the lockup assembles (the one snap: a cut straight from the solid)
  const L0 = PULLBACK.lockup;
  const markHpx = 137 * u;
  const size = (markHpx * 100) / lg.box.h;
  const mb = markBox(lg, size);
  const font = 143 * u;
  const gap = 30 * u;
  const nameW = measureTracked(name, font, 600, -0.01);
  const total = mb.w + gap + nameW;
  const settle = pullbackScale(t);
  const shift = 42 * u * ((tab(t, SETTLE) - 1) / 0.117);
  const left = cx - total / 2;
  const close = 1 - E.glideOut(clamp((t - L0) / 7)); // the parts' spread, 1 -> 0
  const parts = lg.parts.length;
  const poses = (_: unknown, i: number) => {
    if (parts < 2) return { s: 1 + 0.25 * close };
    const dx = (i === 0 ? -1.1 : 0.25) * lg.box.w * close;
    const dy = i === 0 ? 0 : (i % 2 ? -1 : 1) * 0.15 * lg.box.h * close;
    return { x: dx, y: dy };
  };
  const glow = close;
  const letters = Array.from(name);
  const base = baselineOf(font, 600, 1);
  const baseline = H / 2 + mb.h / 2 - 0.08 * mb.h; // the name sits on the mark's lower line
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: ground }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${H / 2}px`, transform: `translateX(${shift.toFixed(2)}px) scale(${settle.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(left - mb.x).toFixed(2)}px, ${(H / 2 - mb.h / 2 - mb.y).toFixed(2)}px)`, filter: glow > 0.02 ? `drop-shadow(0 0 ${(30 * u * glow).toFixed(1)}px ${withAlpha(P.lift, 0.85 * glow)})` : undefined }}>
          <LogoMark logo={lg} size={size} poses={poses} />
        </div>
        {letters.map((ch, i) => {
          const on = L0 + 1 + i * 0.9;
          if (t < on) return null;
          const x = left + mb.w + gap + measureTracked(letters.slice(0, i).join(''), font, 600, -0.01) + 0.22 * font * decay(t, on, 1.4);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x.toFixed(2)}px, ${(baseline - base).toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: font, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1, color: P.ink }}>
              {ch}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const markPullbackMeta: SceneMeta = {
  id: 'mark-pullback',
  does: 'the extruded mark pulls back from an extreme close-up with a roll, then one snap cut to the lockup assembling, which keeps a slow push to the end',
  dur: PULLBACK.dur,
  props: ['name', 'logo?', 'palette?', 'gl?'],
  handIn: null,
  handOut: { form: 'mark', x: 960 - 330, y: 540 - 69, w: 660, h: 137 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'pull-back', weight: 0.7 },
    { f: PULLBACK.lockup, kind: 'snap', id: 'parts', weight: 0.6 },
    { f: PULLBACK.lockup + 7, kind: 'land', id: 'lockup', weight: 0.7 },
  ],
};
