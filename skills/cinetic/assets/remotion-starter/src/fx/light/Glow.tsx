/**
 * cinetic:light light that has a source: a pool where the world has a light, type that is itself the light, bloom off
 * the brightest things in a dark world
 *
 * GlowPool: a pool of light in the world: a near-white core, a body in the light's colour and a long falloff, baked
 * once as a dithered sprite and placed by transform (never an animated gradient). It is a light the place has (the
 * glow under a pane, a lamp, a screen's spill on a dark floor), turned on once (`at`) and then held; never a pool
 * drifting behind a line, never a halo round a lockup.
 *
 *   <GlowPool x={960} y={700} r={520} ry={180} at={30} />
 *
 * GlowType: a line that is a light: white-hot letters tinted toward the world's light, a tight body glow and a wide
 * falloff, added as light (plus-lighter) on a dark world. Words ignite one after another from `at` (the letters
 * first, then the light spreading round them with a brief flare that settles), the line centred where it stands.
 * For a deep field or a black field; on a pale world the light is lost and the line should be ink.
 *
 *   <GlowType text="The right one" at={12} />             (centred in the frame; role line, display or hero)
 *
 * Bloom: a cheap bloom pass over its children: a copy keeps only the bright parts (brightness, then contrast about
 * the threshold), is blurred `radius` px and screen-added at `strength`. Wrap what emits light (glowing type, a lit
 * pane, a screen), not a pale world: everything above the threshold blooms.
 *
 *   <Bloom strength={0.4} box={{ x: 460, y: 420, w: 1000, h: 220 }}>{the glass and its type}</Bloom>
 *
 * Give `box` (where the light is, frame px) whenever the light sits in one place: only that area and the blur's reach
 * are copied and blurred, a tenth of the frame for a pane instead of all of it. Under a camera move, give the box in
 * the coordinates the children are laid out in (the Bloom moves with them).
 *
 * Cost: a pool is one image; GlowType is three copies of one line (two blurred); Bloom is one copy of its children
 * blurred once (only its box when given one). Blur radii are fixed per element, never animated; levels change by opacity only.
 */
import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { C, TYPE, typeStyle } from '../../brand/tokens';
import { clamp, E } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../../lib/film';
import type { Declares } from '../../timeline';
import { bakePlate } from '../Gradients';
import { useWorld } from '../world/context';
import { arrival } from './light';

/** House numbers: shares of the type size, 60 fps frames, alphas. */
export const GLOW_LIGHT = {
  pool: { on60: 36, from: 0.82 },
  type: { body: 0.07, falloff: 0.3, maxBlur: 40, word60: 20, gap60: 9, flare: 0.35, core: 0.3, bodyA: 0.85, falloffA: 0.55 },
  bloom: { strength: 0.35, radius: 18, threshold: 0.62 },
} as const;

// ------------------------------------------------------------------------------------------------- GlowPool
export type GlowPoolProps = {
  x: number; // the pool's centre, frame px
  y: number;
  r: number; // its radius, px (the falloff reaches it)
  ry?: number; // a pool on a floor is wider than tall
  color?: string; // default the world's light
  strength?: number; // 0..1 (default 0.85 on a dark world, 0.5 on a light one)
  at?: number; // turned on here (0.82 -> 1 in size, light up over 36 f); omitted: on
  frame?: number;
};

/** The pool's sprite: core, body, falloff (dithered, cached). */
export const poolUrl = (color: string, w: number, h: number) =>
  bakePlate(
    'radial',
    [
      { at: 0, color: mixColor(C.white, color, 0.25), alpha: 0.95 },
      { at: 0.1, color, alpha: 0.72 },
      { at: 0.38, color, alpha: 0.26 },
      { at: 0.7, color, alpha: 0.07 },
      { at: 1, color, alpha: 0 },
    ],
    w,
    h,
  );

export const GlowPool: React.FC<GlowPoolProps> = (p) => {
  const film = useFilm();
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const world = useWorld();
  const dark = (world?.spec.tone ?? 'dark') === 'dark';
  const a = arrival(f, p.at, GLOW_LIGHT.pool.on60, film, E.softOut);
  if (a <= 0) return null;
  const color = p.color ?? world?.spec.glow ?? C.white;
  const ry = p.ry ?? p.r;
  const url = poolUrl(color, 256, Math.max(8, Math.round((256 * ry) / p.r)));
  const s = GLOW_LIGHT.pool.from + (1 - GLOW_LIGHT.pool.from) * a;
  if (!url) return null;
  return (
    <Img
      src={url}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 2 * p.r,
        height: 2 * ry,
        transform: `translate(${(p.x - p.r).toFixed(2)}px, ${(p.y - ry).toFixed(2)}px) scale(${s.toFixed(4)})`,
        opacity: clamp((p.strength ?? (dark ? 0.85 : 0.5)) * a),
        mixBlendMode: dark ? 'plus-lighter' : 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

// ------------------------------------------------------------------------------------------------- GlowType
export type GlowTypeProps = {
  text: string;
  role?: 'line' | 'display' | 'hero';
  size?: number; // px at 1080p (default the role's)
  weight?: number;
  at?: number; // words ignite from here, one after another; omitted: lit
  x?: number; // the line's centre, frame px (default the frame's centre)
  y?: number;
  color?: string; // the light's colour (default the world's)
  glow?: number; // how far the light spills, 0..1 (default 1)
  frame?: number;
};

/** Word i's light at frame f: core (the letters) 0..1 and glow (the spill, with a flare that settles) 0..~1.35. Pure. */
export const igniteState = (f: number, at: number | undefined, i: number, film: Partial<FilmCtx>) => {
  if (at === undefined) return { core: 1, glow: 1 };
  const fps = fpsOf(film);
  const T = GLOW_LIGHT.type;
  // a phrased onset: each gap a little shorter than the last (the line gathers pace), never a metronome
  const onset = at + f60x(T.gap60 * i * (1 - 0.06 * Math.min(i, 6)), fps);
  const t = (f - onset) / f60x(T.word60, fps);
  const core = E.glideOut(clamp(t));
  const g = clamp((t - 0.15) / 0.85);
  const flare = Math.sin(Math.PI * clamp(g * 1.4)) * T.flare * (g < 1 / 1.4 ? 1 : 0);
  return { core, glow: E.softOut(g) + flare };
};

export const GlowType: React.FC<GlowTypeProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const { width: W, height: H } = sizeOf(film);
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const world = useWorld();
  const T = GLOW_LIGHT.type;
  const role = p.role ?? 'line';
  const size = (p.size ?? TYPE[role].size) * u;
  const light = p.color ?? world?.spec.glow ?? C.white;
  const dark = (world?.spec.tone ?? 'dark') === 'dark';
  const core = mixColor(C.white, light, T.core);
  const k = clamp(p.glow ?? 1, 0, 1.5);
  const words = p.text.split(/\s+/).filter(Boolean);
  const states = words.map((_, i) => igniteState(f, p.at, i, film));
  const base: React.CSSProperties = { ...typeStyle(role, size), fontWeight: p.weight ?? TYPE[role].weight, position: 'absolute', left: 0, top: 0, whiteSpace: 'pre' };
  const line = (kind: 'falloff' | 'body' | 'core') => (
    <div
      data-audit-copy={kind === 'core' ? undefined : ''}
      aria-hidden={kind === 'core' ? undefined : true}
      style={{
        ...base,
        position: kind === 'core' ? 'relative' : 'absolute',
        color: kind === 'core' ? core : light,
        filter: kind === 'core' ? undefined : `blur(${Math.min(T.maxBlur * u, size * (kind === 'body' ? T.body : T.falloff)).toFixed(2)}px)`,
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ opacity: clamp(kind === 'core' ? states[i].core : states[i].glow * k * (kind === 'body' ? T.bodyA : T.falloffA)) }}>
          {i ? ` ${w}` : w}
        </span>
      ))}
    </div>
  );
  return (
    // the whole line is added to the world as light (its own layers composite inside it): a transformed box is an
    // isolated group, so a blend set on the inner layers would only meet the line's own transparent backdrop
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(p.x ?? W / 2).toFixed(2)}px, ${(p.y ?? H / 2).toFixed(2)}px) translate(-50%, -50%)`, mixBlendMode: dark ? 'plus-lighter' : 'normal' }}>
      <div style={{ position: 'relative' }}>
        {line('falloff')}
        {line('body')}
        {line('core')}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------- Bloom
export type BloomProps = {
  strength?: number; // the bloom copy's opacity (default 0.35)
  radius?: number; // its blur, px at 1080p (default 18)
  threshold?: number; // what counts as bright, 0..1 (default 0.62)
  box?: { x: number; y: number; w: number; h: number }; // where the light is, frame px: only that area (and the blur's reach) is copied and blurred
  children: React.ReactNode;
  style?: React.CSSProperties;
};

/** The bright pass as CSS filters: brightness b then contrast c map [threshold, 1] onto [0, 1]. Pure. */
export const brightPass = (threshold: number) => {
  const t = clamp(threshold, 0.05, 0.95);
  const c = (1 + t) / (1 - t);
  return { b: 0.5 + 0.5 / c, c };
};

export const Bloom: React.FC<BloomProps> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const world = useWorld();
  const dark = (world?.spec.tone ?? 'dark') === 'dark';
  const bp = brightPass(p.threshold ?? GLOW_LIGHT.bloom.threshold);
  const R = Math.min(40, p.radius ?? GLOW_LIGHT.bloom.radius) * u;
  const fill: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' };
  const k = clamp(p.strength ?? GLOW_LIGHT.bloom.strength);
  if (k <= 0) return <div style={{ ...fill, ...p.style }}>{p.children}</div>;
  const { width: W, height: H } = sizeOf(film);
  // the copy's window: the whole frame, or the light's box and the blur's reach round it (far fewer pixels to blur)
  const m = Math.ceil(R * 3);
  const win = p.box ? { x: Math.floor(p.box.x - m), y: Math.floor(p.box.y - m), w: Math.ceil(p.box.w + 2 * m), h: Math.ceil(p.box.h + 2 * m) } : { x: 0, y: 0, w: W, h: H };
  return (
    <div style={{ ...fill, ...p.style }}>
      {p.children}
      {/* the copy: the bright pass on an inner layer; the blur, the blend and the level on its own composited outer layer
          (translateZ: blurred while painted under a scaled parent, Chromium drew a stray unblurred copy on some frames;
          the radius is fixed per element, never animated, so the promoted layer never holds a stale blur) */}
      <div
        data-audit-copy
        aria-hidden
        style={{ position: 'absolute', left: 0, top: 0, width: win.w, height: win.h, overflow: 'hidden', pointerEvents: 'none', transform: `translate(${win.x}px, ${win.y}px) translateZ(0)`, filter: `blur(${R.toFixed(2)}px)`, mixBlendMode: dark ? 'plus-lighter' : 'screen', opacity: k }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${-win.x}px, ${-win.y}px)`, filter: `brightness(${bp.b.toFixed(3)}) contrast(${bp.c.toFixed(3)}) saturate(1.2)` }}>{p.children}</div>
      </div>
    </div>
  );
};

/** Light is continuous: nothing steps or flashes. */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
