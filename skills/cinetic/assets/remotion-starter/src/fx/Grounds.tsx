import React from 'react';
import { Img } from 'remotion';
import { C } from '../brand/tokens';
import { clamp } from '../lib/anim';
import { camera, type Shot, toScreen, weighShot } from '../lib/camera';
import { mixColor, oklch, toOklch } from '../lib/color';
import { type FilmCtx, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import { FILM_LIGHT, type FilmLight, keyDir } from '../lib/light';
import type { Declares } from '../timeline';
import { shadowTone } from './KeyLight';
import { Depth } from './FloatDepth';
import { bakePixels, bakePlate } from './Gradients';
import { Wash, WASH } from './Washes';
import { hash01, srgbOf } from './plates';

/**
 * cinetic:light lit grounds: the place a product sits in, built in code (no photograph). A ground is clean: the flat
 * base, or a very subtle lit gradient with a stated key direction (the film's one light, lib/light FILM_LIGHT: the
 * side the key comes from is a little lighter, the far side falls a little into the ground's own shade), drifting
 * slowly on a closed loop. Every element in frame has a job, and a ground's job is to stay clean behind the words and
 * the product: no floating plates, no light pools, no haze. Light is motivated and subtle.
 *
 * Plates are for a film that asks for them by name (dealGrounds({ kinds }) or a spec's kind) because the place it
 * shows has that light: soft pools of a lamp, the tall bars of a lit room, a stage's floor light, sun through a
 * window. On a light ground the same shapes are soft shadows instead (white light on paper does nothing). Every
 * shape is a signed-distance falloff baked once as a dithered sprite at half size (no animated blur, no CSS gradient
 * that bands) and moved by transform and opacity only; there are no bokeh discs.
 *
 *   kind     what                                                       reads as
 *   flat     the base colour alone                                      a clean field (the house, with wash)
 *   wash     the base and the key gradient, nothing else                a lit wall, studio paper (the house)
 *   pools    the wash plus a broad pool and 2-3 soft pools (asked)      lamplight falling through a space
 *   bars     the wash plus 3-5 tall soft bars (asked)                   a lit room behind the product, out of focus
 *   floor    a glow rising from the bottom edge, bars in it (asked)     light from below, a stage
 *   window   2-4 beams slanting along the key (asked)                   sun through a window
 *   tint     the base with the colour gathering along one tilted edge   a lit page with a direction (asked)
 *            (fx/Washes tilted: paper over the first third, an S-shaped
 *            ramp to the tint; the tint `light`, else the accent a fifth
 *            of the way to the base), drifting slowly
 *   key      a lit gradient with a stated key: the key side lifted, the     a lit stage, a lit sweep of paper:
 *            far side falling deep (KEY_GROUND: 12 L* or more across the    the place a product shot stands on
 *            frame; on a dark base the far side near black), drifting on    when the film has no picture of
 *            the wash's loop                                                its own for it
 *   plate    a picture of the film's own (a photo, a still of its footage:  the film's own world behind the
 *            `src`) blurred 24-40 px, veiled toward the base, lit by the    product, out of focus
 *            key's gradient over it, breathing in and out slowly (no src:
 *            the key)
 *
 * Numbers (GRAMMAR.hold): a lightness swing of 0.02-0.10 across the frame (house 0.06: you feel the key, you never see
 * a glow); the light drifts 6-30 px/s at 1080p (house 12) on loops of 9-16 s, so a hold over a ground never freezes;
 * the ground rides the camera at the background weight 0.25 (Planes: fg 1.0, mid 0.6, bg 0.25). look-audit.py's
 * ground-haze read fails a pool of light inside the frame above its threshold, and filler-shape fails faint shapes
 * that carry no text, icon or mark.
 *
 * A product shot never stands on a flat grey or charcoal field: a flat neutral ground is a clean page (L* 88 or more)
 * or a black void (under 8), never the middle; every UI shot stands on a place (placeGrounds: the key, or a plate of the
 * film's own picture). look-audit.py ground-plate fails a film whose frames sit on a flat grey or charcoal field.
 *
 * Variety: never the same ground on more than 2 consecutive shots (GROUND.run). groundKey() names a ground (its kind
 * and base), groundRuns() lists the runs that break the rule, dealGrounds() deals a film's grounds from a seed with
 * holds of at most 2 shots (a held ground keeps its seed: the same place across the cut); it deals the clean kinds
 * (flat and wash on the film's bases) unless the film names others.
 *
 * Composition: <Planes> draws bg, mid and fg layers under one camera at 0.25 / 0.6 / 1.0, and cropCheck() asks for
 * at least one element cropped by the frame edge (a frame that holds everything whole inside the margins is a slide).
 */

/** House numbers: px at 1080p, seconds, shares. */
export const GROUND = {
  lift: 0.06, // lightness swing across the frame (OKLCH L): the key is felt, never seen as a glow
  liftRange: [0.02, 0.1] as const,
  driftPxS: 12, // the light's drift, px/s at 1080p (GRAMMAR.hold.driftPxS 6-30-90)
  driftRange: [6, 30] as const,
  period: [9, 16] as const, // s per loop
  oversize: 1.18, // the key plate covers the frame's diagonal x this, so drift and the camera never show its edge
  bake: 0.5, // plates and sprites are baked at this share of their size (soft fields survive the upscale)
  run: 2, // the most consecutive shots one ground may hold
  darkL: 0.7, // a base under this lightness gets light shapes; above it, soft shadow shapes
  planes: { fg: 1, mid: 0.6, bg: 0.25 },
  crop: 0.12, // share of an element's own width or height past a frame edge for it to count as cropped
} as const;

/**
 * The key and the plate (house numbers): on a dark base the key side rises `dark.lit` (OKLCH L) and the far side falls
 * `dark.deep`, never under `floorL` (no pure black); on paper the key side rises `light.lit` toward white and the far side
 * falls `light.deep` into the paper's own shade. `stops`: the key side, the base, the far side along the key (shares of
 * the plate's diagonal). The frame holds `range` L* or more across it (look-audit ground-plate reads a field under 12 L*
 * as flat). A plate's picture is blurred `plate.blur` px at 1080p (24-40), veiled toward the base by `plate.veil`, and
 * breathes between x`plate.push[0]` and x`plate.push[1]` over 2 x `plate.pushS` s (never a stop).
 */
export const KEY_GROUND = {
  dark: { lit: 0.05, deep: 0.15 },
  light: { lit: 0.04, deep: 0.12 },
  floorL: 0.13,
  stops: [0, 0.42, 1] as const,
  range: 12,
  plate: { blur: 32, blurRange: [24, 40] as const, veil: 0.42, push: [1.06, 1.1] as const, pushS: 14 },
} as const;

export type GroundKind = 'flat' | 'wash' | 'pools' | 'bars' | 'floor' | 'window' | 'tint' | 'key' | 'plate';
/** Every kind. */
export const GROUND_KINDS: readonly GroundKind[] = ['flat', 'wash', 'pools', 'bars', 'floor', 'window', 'tint', 'key', 'plate'];
/** The places a product shot stands on: the key's lit gradient, or a plate of the film's own picture (placeGrounds). */
export const PLACE_KINDS: readonly GroundKind[] = ['key', 'plate'];
/** The colour grounds: a tilted tint on one or two acts where the structure has a lit page (asked by name; never the whole film). */
export const TINT_KINDS: readonly GroundKind[] = ['tint'];
/** The clean kinds a film gets unless it asks for more: no shape on the ground at all. */
export const CLEAN_KINDS: readonly GroundKind[] = ['flat', 'wash'];
/** The kinds that put plates on the ground: only for a film that asks, because its place has that light. */
export const PLATE_KINDS: readonly GroundKind[] = ['pools', 'bars', 'floor', 'window'];

export type GroundSpec = {
  kind: GroundKind;
  base: string; // the ground colour: a neutral token (C.slate, C.paper, C.mist ...)
  light?: string; // the light's colour on a dark base (house C.white; an accent lift only at low strength)
  lift?: number; // lightness swing 0.02-0.1 (house 0.06)
  key?: Pick<FilmLight, 'azimuth' | 'elevation'>; // house FILM_LIGHT
  drift?: number; // px/s at 1080p (house 12)
  seed?: number;
  src?: string; // plate: the film's own picture (staticFile URL of a photo or a still of its footage)
  blur?: number; // plate: px at 1080p (house 32, 24-40)
  veil?: number; // plate: the share of the base over the picture (house 0.42)
};

export type GroundShape = {
  form: 'pool' | 'bar' | 'beam';
  x: number; // centre at rest, share of the frame width
  y: number; // share of the frame height
  w: number; // px at 1080p (before rotation)
  h: number;
  rot: number; // deg
  soft: number; // px of falloff either side of the edge
  alpha: number; // peak opacity of the sprite's colour
  depth: number; // parallax weight under the camera (0.15-0.4: behind the subject)
  orbit: { rx: number; ry: number; period: number; phase: number }; // px, px, s, 0..1
  fade?: 'up'; // brighter toward its bottom (a bar standing in a floor glow)
};

/** A small seeded generator (mulberry32): the same seed, the same ground, in any render order. */
export const seeded = (seed: number) => {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * The ground's base lightness and the alphas that give a swing of `lift` (OKLCH L) across it: white light at
 * `light` on the key side adds about light x (1 - L); the far side's shade (the base 0.3 darker) at `shade` takes
 * about shade x 0.3. On a dark base most of the swing is light; on paper, light has nowhere to go and the swing
 * comes from the shade.
 */
export const washAlphas = (base: string, lift: number = GROUND.lift) => {
  const L = toOklch(base)[0];
  const lit = Math.min(lift * 0.6, (1 - L) * 0.9);
  const shade = lift - lit;
  return { L, dark: L < GROUND.darkL, light: clamp(lit / Math.max(1e-3, 1 - L)), shade: clamp(shade / 0.3) };
};

/** How bright each kind's shapes are against the lift (their peak lightness change over lift): light sources read brighter. */
export const KIND_GAIN: Record<GroundKind, number> = { flat: 0, wash: 0, pools: 0.9, bars: 1.1, floor: 1.6, window: 1.0, tint: 0, key: 0, plate: 0 };

/**
 * The key's colours on a base: [key side, base, far side] (KEY_GROUND). On a dark base the key side lifts and the far
 * side falls toward black (never under floorL); on paper the key side whitens a little and the far side falls into
 * the paper's shade, so the frame holds 12 L* or more across it either way. Pure.
 */
export const keyTones = (base: string): [string, string, string] => {
  const [L, Cc, h] = toOklch(base);
  const dark = L < GROUND.darkL;
  const k = dark ? KEY_GROUND.dark : KEY_GROUND.light;
  const lit = oklch(clamp(L + k.lit, 0, 0.995), Cc * (dark ? 0.9 : 0.6), h);
  const deep = oklch(Math.max(dark ? KEY_GROUND.floorL : 0.5, L - k.deep), Math.min(0.13, Cc * 1.1), h);
  return [lit, base, deep];
};

/**
 * Every product shot on a place: the grounds a stage dealt, with the shots `ui` names turned into the key (or, given
 * the film's own picture `src`, a plate of it), the base kept (a tint stays a tint). A run of one place past GROUND.run
 * shots takes the next base of `bases` (when given), so the no-repeat rule holds. Use it in a template's stage after
 * dealGrounds. Pure.
 */
export const placeGrounds = (list: readonly GroundSpec[], ui: readonly boolean[], o: { src?: string; bases?: readonly string[]; blur?: number; veil?: number } = {}): GroundSpec[] => {
  const out: GroundSpec[] = list.map((g, i) =>
    ui[i] && g.kind !== 'tint' ? { ...g, kind: o.src ? ('plate' as const) : ('key' as const), ...(o.src ? { src: o.src, blur: o.blur, veil: o.veil } : {}) } : { ...g },
  );
  if (o.bases && o.bases.length > 1) {
    for (let i = GROUND.run; i < out.length; i++) {
      const run = out.slice(i - GROUND.run, i + 1).every((g) => groundKey(g) === groundKey(out[i]));
      if (run) out[i] = { ...out[i], base: o.bases[(Math.max(0, o.bases.indexOf(out[i].base)) + 1) % o.bases.length] };
    }
  }
  return out;
};

/** True when the ground puts no shape on its base (flat or wash): the clean ground every film starts from. */
export const isClean = (g: Pick<GroundSpec, 'kind'>) => CLEAN_KINDS.includes(g.kind);

/**
 * The procedural plates of a ground: shapes from its seed, in its kind's arrangement, keyed to the light, each with
 * its final peak alpha (the lift budget of its base). The clean kinds have none. Pure.
 */
export const groundShapes = (g: GroundSpec): GroundShape[] => {
  const rnd = seeded((g.seed ?? 1) * 7919 + GROUND_KINDS.indexOf(g.kind) * 104729);
  const key = g.key ?? FILM_LIGHT;
  const [kx, ky] = keyDir(key);
  const drift = g.drift ?? GROUND.driftPxS;
  const lift = g.lift ?? GROUND.lift;
  const wa = washAlphas(g.base, lift);
  // the peak alpha that changes the base's lightness by `dl`: light on a dark base, shade (the base 0.22 darker) on paper
  const peak = (dl: number) => clamp(wa.dark ? dl / Math.max(0.05, 1 - wa.L) : dl / 0.22);
  const gain = KIND_GAIN[g.kind];
  const orbit = (speed = drift) => {
    const period = GROUND.period[0] + rnd() * (GROUND.period[1] - GROUND.period[0]);
    const r = (speed * period) / (2 * Math.PI);
    return { rx: r, ry: r * (0.45 + rnd() * 0.3), period, phase: rnd() };
  };
  const keySide = (d: number) => ({ x: 0.5 + kx * d, y: 0.5 + ky * d }); // a point toward the key, d in frame shares
  const out: GroundShape[] = [];
  if (isClean(g)) return out; // flat and wash: the base and the key gradient, never a shape
  const beamAngle = (Math.atan2(-ky, -kx) * 180) / Math.PI; // light travels away from the key
  if (g.kind === 'pools' && wa.dark) {
    const c = keySide(0.38);
    out.push({ form: 'pool', x: c.x, y: c.y, w: 2300, h: 1600, rot: beamAngle, soft: 0, alpha: peak(lift * gain * 0.9), depth: 0.2, orbit: orbit() });
  }
  if (g.kind === 'pools') {
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const along = -0.3 + 0.75 * t; // spread from the key side across the frame
      const across = (rnd() - 0.5) * 0.55;
      const size = 900 + rnd() * 700;
      out.push({ form: 'pool', x: 0.5 + kx * along - ky * across, y: 0.5 + ky * along + kx * across, w: size, h: size * (0.65 + rnd() * 0.3), rot: rnd() * 180, soft: 0, alpha: peak(lift * gain * (0.55 + rnd() * 0.35)), depth: 0.15 + rnd() * 0.25, orbit: orbit() });
    }
  }
  if (g.kind === 'bars' || g.kind === 'floor') {
    const n = 3 + Math.floor(rnd() * 3);
    const span = 0.72 + rnd() * 0.25;
    const x0 = 0.5 - span / 2 + (rnd() - 0.5) * 0.12;
    for (let i = 0; i < n; i++) {
      const w = (60 + rnd() * 120) * (wa.dark ? 1 : 2.4); // on paper a bar is a shadow band, wider and softer
      const h = g.kind === 'floor' ? 560 + rnd() * 380 : 1000 + rnd() * 500;
      out.push({
        form: 'bar',
        x: x0 + (span * (i + 0.5 + (rnd() - 0.5) * 0.4)) / n,
        y: g.kind === 'floor' ? 1 - h / 2160 + 0.04 : 0.5 + (rnd() - 0.5) * 0.2,
        w,
        h,
        rot: g.kind === 'floor' ? 0 : (rnd() - 0.5) * 4,
        soft: w * (0.55 + rnd() * 0.45) + 24,
        alpha: peak(lift * gain * (0.6 + rnd() * 0.4)),
        depth: 0.2 + rnd() * 0.2,
        orbit: orbit(drift * 0.6),
        ...(g.kind === 'floor' ? { fade: 'up' as const } : {}),
      });
    }
  }
  if (g.kind === 'window') {
    const n = 2 + Math.floor(rnd() * 2);
    const c = keySide(0.1);
    let off = -((n - 1) / 2) * 330;
    for (let i = 0; i < n; i++) {
      const h = 170 + rnd() * 150;
      out.push({ form: 'beam', x: c.x + (-ky * off) / 1920, y: c.y + (kx * off) / 1080, w: 2300 + rnd() * 500, h, rot: beamAngle, soft: h * 0.45 + 20, alpha: peak(lift * gain * (0.65 + rnd() * 0.35)), depth: 0.25, orbit: orbit(drift * 0.8) });
      off += h + 120 + rnd() * 90;
    }
  }
  return out;
};

const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The sprite of a shape as RGBA bytes (its one colour, alpha by distance, dithered), `s` px per 1080p px. Pure.
 *   pool  a gaussian falloff over the ellipse (no rim, no disc)
 *   bar   a rounded box defocused by `soft` either side of its edge, tapering at both ends (a floor bar brightens
 *         toward its foot instead)
 *   beam  the same box, brighter at the key end and fading along the light's travel
 */
export const shapePixels = (sh: GroundShape, colour: string, s: number = GROUND.bake) => {
  const { W, H, margin } = spriteSize(sh, s);
  const px = new Uint8ClampedArray(W * H * 4);
  const rgb = colourBytes(colour);
  const hw = sh.w / 2;
  const hh = sh.h / 2;
  const rr = Math.min(hw, hh) * 0.6;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const lx = (x + 0.5) / s - (sh.w / 2 + margin);
      const ly = (y + 0.5) / s - (sh.h / 2 + margin);
      let a: number;
      if (sh.form === 'pool') {
        const r = Math.hypot(lx / hw, ly / hh);
        a = Math.exp(-4.2 * r * r) * (1 - smooth(0.82, 1, r));
      } else {
        const qx = Math.abs(lx) - (hw - rr);
        const qy = Math.abs(ly) - (hh - rr);
        const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr; // rounded-box distance
        a = 1 - smooth(-sh.soft, sh.soft, d);
        if (sh.form === 'bar') {
          const v = clamp((ly + hh) / sh.h); // 0 at the top, 1 at the foot
          a *= sh.fade === 'up' ? v ** 1.4 : smooth(0, 0.32, v) * smooth(0, 0.32, 1 - v);
        } else {
          const v = clamp((lx + hw) / sh.w); // 0 at the key end
          a *= smooth(0, 0.12, v) * smooth(0, 0.2, 1 - v) * (1 - 0.6 * v);
        }
      }
      const k = (y * W + x) * 4;
      const n = hash01(x, y, 17) + hash01(x + 7919, y + 104729, 18) - 1;
      px[k] = rgb[0];
      px[k + 1] = rgb[1];
      px[k + 2] = rgb[2];
      px[k + 3] = Math.max(0, Math.min(255, Math.round(a * sh.alpha * 255 + n)));
    }
  return { px, W, H };
};

const colourBytes = (c: string): [number, number, number] => {
  const m = c.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const v = m[1].split(',').map((x) => parseFloat(x));
    return [v[0], v[1], v[2]];
  }
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Where the camera has moved the frame centre (screen px) and how far it has zoomed, against its base shot. */
export const camOffset = (cam: { shot: Shot; base: Shot } | undefined, film?: Partial<FilmCtx>) => {
  if (!cam) return { x: 0, y: 0, k: 1 };
  const { width: W, height: H } = sizeOf(film);
  const p = { x: cam.base.ax + (W / 2 - cam.base.sx) / cam.base.k, y: cam.base.ay + (H / 2 - cam.base.sy) / cam.base.k };
  const q = toScreen(cam.shot, p);
  return { x: q.x - W / 2, y: q.y - H / 2, k: cam.shot.k / cam.base.k };
};

export type GroundState = {
  wash: { x: number; y: number; size: number; angle: number }; // the key plate: top-left, edge, rotation (deg)
  floor: { y: number; h: number } | null;
  shapes: { x: number; y: number; w: number; h: number; rot: number; scale: number; opacity: number }[]; // sprite centre, screen size, turn
  speed: number; // the slowest drift of any layer this frame, px per film frame (a hold's floor: never 0)
};

/** The ground at frame f: where the key plate and every shape sit (drift loops plus the camera at their depth). Pure. */
export const groundState = (frame: number, g: GroundSpec, film?: Partial<FilmCtx>, cam?: { shot: Shot; base: Shot }): GroundState => {
  const fps = fpsOf(film);
  const { width: W, height: H } = sizeOf(film);
  const u = uOf(film); // like fpsOf: the timeline's frame when no film is given
  const t = frame / fps;
  const key = g.key ?? FILM_LIGHT;
  const [kx, ky] = keyDir(key);
  const drift = (g.drift ?? GROUND.driftPxS) * u;
  const co = camOffset(cam, film);
  // the key plate drifts across the key direction on a 14 s loop
  const T = 14;
  const R = (drift * T) / (2 * Math.PI);
  const ph = (2 * Math.PI * t) / T;
  const size = Math.hypot(W, H) * GROUND.oversize;
  const bg = GROUND.planes.bg;
  const wx = -ky * R * Math.sin(ph) + kx * R * 0.6 * Math.cos(ph) + co.x * bg; // across the key, and a little along it:
  const wy = kx * R * Math.sin(ph) + ky * R * 0.6 * Math.cos(ph) + co.y * bg; // the speed stays within 0.6-1 x drift
  const angle = (Math.atan2(-ky, -kx) * 180) / Math.PI;
  const shapes = groundShapes(g).map((sh) => {
    const p = (2 * Math.PI * (t / sh.orbit.period + sh.orbit.phase)) % (2 * Math.PI);
    const k = co.k ** sh.depth;
    const cx = W / 2 + (sh.x * W - W / 2) * k + sh.orbit.rx * u * Math.cos(p) + co.x * sh.depth;
    const cy = H / 2 + (sh.y * H - H / 2) * k + sh.orbit.ry * u * Math.sin(2 * p) * 0.5 + co.y * sh.depth;
    const margin = sh.form === 'pool' ? 0 : 1.15 * sh.soft;
    const breathe = 1 + 0.08 * Math.sin(p * 2 + sh.orbit.phase * 7);
    return { x: cx, y: cy, w: (sh.w + 2 * margin) * u, h: (sh.h + 2 * margin) * u, rot: sh.rot, scale: k, opacity: clamp(breathe) };
  });
  const loopSpeed = (2 * Math.PI * R) / T / fps;
  const speeds = [loopSpeed, ...groundShapes(g).map((sh) => (2 * Math.PI * Math.min(sh.orbit.rx, sh.orbit.ry) * 0.5 * u) / sh.orbit.period / fps)];
  return {
    wash: { x: W / 2 - size / 2 + wx, y: H / 2 - size / 2 + wy, size, angle },
    floor: g.kind === 'floor' ? { y: H * 0.42 + co.y * bg, h: H * 0.62 } : null,
    shapes,
    speed: Math.min(...speeds),
  };
};

/** The colours a ground paints with: the key light (on a dark base) and the far-side shade, with their alphas, and the shapes' ink. */
export const groundInks = (g: GroundSpec) => {
  const a = washAlphas(g.base, g.lift ?? GROUND.lift);
  const lightInk = a.dark ? (g.light ?? C.white) : C.white;
  return { L: a.L, dark: a.dark, lightInk, lightA: a.light, shadeInk: shadowTone(g.base, 0.3), shadeA: a.shade, ink: a.dark ? lightInk : shadowTone(g.base, 0.22) };
};

/** A shape sprite's baked size in px (its falloff margin included) at `s` px per 1080p px. */
export const spriteSize = (sh: GroundShape, s: number = GROUND.bake) => {
  const margin = sh.form === 'pool' ? 0 : 1.15 * sh.soft;
  return { W: Math.max(2, Math.round((sh.w + 2 * margin) * s)), H: Math.max(2, Math.round((sh.h + 2 * margin) * s)), margin };
};

/**
 * A lit ground: the base colour and the key gradient (wash), and for a kind the film asked for, the floor glow and the
 * shapes, under the camera at their depths. A flat ground is the base colour alone. Under the film's camera float
 * (fx/Float) the ground holds still on screen while the act drifts over it (Depth z 0): the planes part, and the edge
 * the act drifts away from shows the same ground ActStage holds behind it.
 */
export const LitGround: React.FC<{ frame: number; spec: GroundSpec; cam?: { shot: Shot; base: Shot }; style?: React.CSSProperties }> = (p) => (
  <Depth z={0}>
    <GroundPlate {...p} />
  </Depth>
);

const GroundPlate: React.FC<{ frame: number; spec: GroundSpec; cam?: { shot: Shot; base: Shot }; style?: React.CSSProperties }> = ({ frame, spec, cam, style }) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const abs0: React.CSSProperties = { position: 'absolute', left: 0, top: 0 };
  if (spec.kind === 'flat') return <div style={{ ...abs0, width: W, height: H, background: spec.base, ...style }} />;
  if (spec.kind === 'key' || spec.kind === 'plate') return <PlaceGround frame={frame} spec={spec} cam={cam} style={style} />;
  if (spec.kind === 'tint')
    return (
      <div style={{ ...abs0, width: W, height: H, overflow: 'hidden', background: spec.base, ...style }}>
        <Wash frame={frame} kind="tilted" paper={spec.base} tint={spec.light ?? mixColor(C.accent, spec.base, WASH.tilted.tintMix)} drift={(spec.drift ?? GROUND.driftPxS) / 4000} />
      </div>
    );
  const s = groundState(frame, spec, film, cam);
  const ink = groundInks(spec);
  const b = GROUND.bake;
  const plateSize = Math.round(s.wash.size * b);
  const keyStops = [
    { at: 0, color: ink.lightInk, alpha: ink.lightA },
    { at: 0.42, color: ink.lightInk, alpha: 0 },
    { at: 0.46, color: ink.shadeInk, alpha: 0 },
    { at: 1, color: ink.shadeInk, alpha: ink.shadeA },
  ];
  const wash = bakePlate('linear', keyStops, plateSize, plateSize, { seed: spec.seed ?? 1 });
  const fl = spec.light ?? C.white;
  const floorA = clamp(((spec.lift ?? GROUND.lift) * KIND_GAIN.floor) / Math.max(0.05, 1 - ink.L));
  const floor = s.floor ? bakePlate('linear', [{ at: 0, color: fl, alpha: 0 }, { at: 0.5, color: fl, alpha: floorA * 0.22 }, { at: 1, color: fl, alpha: floorA }], Math.round(W * b * 0.5), Math.round(s.floor.h * b * 0.5), { vertical: true, seed: 3 }) : '';
  const shapes = groundShapes(spec);
  const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0 };
  return (
    <div style={{ ...abs, width: W, height: H, overflow: 'hidden', background: spec.base, ...style }}>
      {wash && <Img src={wash} style={{ ...abs, width: s.wash.size, height: s.wash.size, transformOrigin: '50% 50%', transform: `translate(${s.wash.x.toFixed(2)}px, ${s.wash.y.toFixed(2)}px) rotate(${s.wash.angle.toFixed(3)}deg)` }} />}
      {floor && s.floor && <Img src={floor} style={{ ...abs, width: W, height: s.floor.h, transform: `translate(0px, ${s.floor.y.toFixed(2)}px)` }} />}
      {shapes.map((sh, i) => {
        const st = s.shapes[i];
        const z = spriteSize(sh, b);
        const src = bakePixels(`ground|${ink.ink}|${b}|${JSON.stringify(sh)}`, z.W, z.H, () => shapePixels(sh, ink.ink, b).px);
        if (!src) return null;
        return <Img key={i} src={src} style={{ ...abs, width: st.w, height: st.h, opacity: st.opacity, transformOrigin: '50% 50%', transform: `translate(${(st.x - st.w / 2).toFixed(2)}px, ${(st.y - st.h / 2).toFixed(2)}px) rotate(${st.rot.toFixed(3)}deg) scale(${st.scale.toFixed(5)})` }} />;
      })}
    </div>
  );
};

/**
 * The key and the plate: the key's gradient baked as one dithered plate in full colour (keyTones: key side, base, far
 * side), drifting on the wash's loop; a plate draws the film's picture under it, blurred, breathing and veiled toward
 * the base, with the key's gradient laid over at half strength so the picture sits in the film's light.
 */
const PlaceGround: React.FC<{ frame: number; spec: GroundSpec; cam?: { shot: Shot; base: Shot }; style?: React.CSSProperties }> = ({ frame, spec, cam, style }) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const u = uOf(film);
  const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0 };
  const s = groundState(frame, spec, film, cam);
  const [lit, base, deep] = keyTones(spec.base);
  const plate = spec.kind === 'plate' && !!spec.src;
  const [a, m, b] = KEY_GROUND.stops;
  const stops = plate
    ? [{ at: a, color: lit, alpha: 0.5 }, { at: m, color: base, alpha: 0 }, { at: b, color: deep, alpha: 0.55 }]
    : [{ at: a, color: lit }, { at: m, color: base }, { at: (m + b) / 2, color: mixColor(base, deep, 0.62) }, { at: b, color: deep }];
  const size = Math.round(s.wash.size * GROUND.bake);
  const key = bakePlate('linear', stops, size, size, { seed: spec.seed ?? 1 });
  const P = KEY_GROUND.plate;
  const t = frame / fpsOf(film);
  const push = P.push[0] + (P.push[1] - P.push[0]) * 0.5 * (1 - Math.cos((2 * Math.PI * t) / (2 * P.pushS)));
  const blur = clamp(spec.blur ?? P.blur, P.blurRange[0], P.blurRange[1]) * u;
  return (
    <div style={{ ...abs, width: W, height: H, overflow: 'hidden', background: plate ? spec.base : deep, ...style }}>
      {plate && (
        <>
          <Img data-imagery="" src={spec.src as string} style={{ ...abs, width: W, height: H, objectFit: 'cover', filter: `blur(${blur.toFixed(1)}px)`, transformOrigin: '50% 50%', transform: `scale(${push.toFixed(5)})` }} />
          <div style={{ ...abs, width: W, height: H, background: spec.base, opacity: clamp(spec.veil ?? P.veil) }} />
        </>
      )}
      {key && <Img src={key} style={{ ...abs, width: s.wash.size, height: s.wash.size, transformOrigin: '50% 50%', transform: `translate(${s.wash.x.toFixed(2)}px, ${s.wash.y.toFixed(2)}px) rotate(${s.wash.angle.toFixed(3)}deg)` }} />}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ variety

/** A ground's identity for the no-repeat rule: its kind and its base (a re-seeded field of the same kind is the same ground). */
export const groundKey = (g: Pick<GroundSpec, 'kind' | 'base'>) => `${g.kind}|${g.base}`;

/** Runs of one ground longer than `max` consecutive shots (house 2): [{ from, to, key }] shot indices, inclusive. */
export const groundRuns = (list: readonly Pick<GroundSpec, 'kind' | 'base'>[], max: number = GROUND.run) => {
  const out: { from: number; to: number; key: string }[] = [];
  let i = 0;
  while (i < list.length) {
    let j = i;
    while (j + 1 < list.length && groundKey(list[j + 1]) === groundKey(list[i])) j++;
    if (j - i + 1 > max) out.push({ from: i, to: j, key: groundKey(list[i]) });
    i = j + 1;
  }
  return out;
};

/**
 * Deals one ground per shot from a seed: kinds and bases rotate so no ground holds more than `max` consecutive shots
 * (house 2) and no kind comes back while another is unused for long; a held ground keeps its spec (the same place
 * across the cut). `hold` is the chance a shot keeps the previous ground when the rule allows it (house 0.35). The
 * kinds are the clean ones (flat, wash) unless the film names the kinds its place really has.
 */
export const dealGrounds = (n: number, o: { bases: readonly string[]; kinds?: readonly GroundKind[]; seed?: number; hold?: number; max?: number; light?: string; lift?: number; key?: GroundSpec['key'] }): GroundSpec[] => {
  const rnd = seeded((o.seed ?? 1) * 2654435761);
  const kinds = o.kinds?.length ? o.kinds : CLEAN_KINDS;
  const max = o.max ?? GROUND.run;
  const hold = o.hold ?? 0.35;
  const out: GroundSpec[] = [];
  const used = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const prev = out[i - 1];
    let run = 0;
    for (let j = i - 1; j >= 0 && prev && groundKey(out[j]) === groundKey(prev); j--) run++;
    if (prev && run < max && rnd() < hold) {
      out.push(prev);
      continue;
    }
    const cands: GroundSpec[] = [];
    for (const kind of kinds) for (const base of o.bases) if (!prev || groundKey({ kind, base }) !== groundKey(prev)) cands.push({ kind, base });
    // least used first, then a different kind from the last shot, then the seed decides
    const score = (c: GroundSpec) => (used.get(groundKey(c)) ?? 0) * 10 + (prev && c.kind === prev.kind ? 5 : 0) + rnd();
    const pick = cands.length ? cands.reduce((a, c) => (score(c) < score(a) ? c : a)) : { kind: kinds[0], base: o.bases[0] };
    used.set(groundKey(pick), (used.get(groundKey(pick)) ?? 0) + 1);
    out.push({ ...pick, seed: Math.floor(rnd() * 1e6), ...(o.light ? { light: o.light } : {}), ...(o.lift ? { lift: o.lift } : {}), ...(o.key ? { key: o.key } : {}) });
  }
  return out;
};

// ------------------------------------------------------------------------------------------------ composition

export type PlaneName = keyof typeof GROUND.planes;
export type Box = { x: number; y: number; w: number; h: number };

/** The shot of a composition layer (bg 0.25, mid 0.6, fg 1.0) under the camera. */
export const layerShot = (shot: Shot, base: Shot, plane: PlaneName) => weighShot(shot, base, GROUND.planes[plane]);

/**
 * True when a box is cropped by the frame: at least `share` (house 12 %) of its own width or height lies past an
 * edge while part of it is still in frame.
 */
export const croppedByEdge = (b: Box, film?: Partial<FilmCtx>, share: number = GROUND.crop) => {
  const { width: W, height: H } = sizeOf(film);
  const visible = b.x < W && b.x + b.w > 0 && b.y < H && b.y + b.h > 0;
  if (!visible) return false;
  const past = Math.max(0, -b.x, b.x + b.w - W) / Math.max(1e-6, b.w);
  const pastY = Math.max(0, -b.y, b.y + b.h - H) / Math.max(1e-6, b.h);
  return past >= share || pastY >= share;
};

/** The composition rule on a frame's element boxes: which are cropped by the frame edge; ok when at least one is. */
export const cropCheck = (boxes: readonly (Box & { id: string })[], film?: Partial<FilmCtx>, share: number = GROUND.crop) => {
  const cropped = boxes.filter((b) => croppedByEdge(b, film, share)).map((b) => b.id);
  return { cropped, ok: cropped.length > 0 };
};

/**
 * Three composition layers under one camera: `bg` (the ground, 0.25), `mid` (the product, 0.6), `fg` (the near, cropped
 * elements, 1.0). Each layer is a sibling world laid out in screen px at the base shot, moved by one transform.
 */
export const Planes: React.FC<{ base: Shot; shot: Shot; bg?: React.ReactNode; mid?: React.ReactNode; fg?: React.ReactNode; perspective?: number; style?: React.CSSProperties }> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const layer = (plane: PlaneName, node: React.ReactNode) =>
    node ? (
      <div key={plane} style={{ ...camera(layerShot(p.shot, p.base, plane), p.perspective), width: W, height: H }}>
        {node}
      </div>
    ) : null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', ...p.style }}>
      {layer('bg', p.bg)}
      {layer('mid', p.mid)}
      {layer('fg', p.fg)}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ families

/**
 * Ground families: the whole film stands on one of these, dealt per film (scripts/deck.py, a template's deal), so two
 * films never share the same paper and slate. A family is one designed, lit field for the whole film, never cut, with
 * at most one colour event; the bans stay (no orange, no purple, no neon). Fields take the accent's hue only when it is
 * a blue, teal or green (else a cool 230).
 *
 * Every family is a LIT field, not a two-stop linear: a base colour and two or three lights (a key, a fill or floor,
 * a tinted lobe), each with a position (most sit outside the frame, so the light enters from an edge or a corner and
 * the frame never holds a pool or a haze), an elliptical extent and a gaussian falloff, mixed in OKLab, with a soft
 * optical vignette on the dark families. It is computed in float on a 4 px grid, interpolated per pixel and rounded
 * with triangular dither (+-1.5 levels on a dark field, where an 8-bit ramp bands first), baked once per recipe at the
 * film's size. The field is STILL: the light does not drift or breathe (the camera and the content carry the motion;
 * an aimless drift reads as the frame wandering). The one colour event is a second baked state cross-faded in
 * (`event` 0..1): the key taking the accent's hue, the glow rising, an accent lobe opening; whiteBand floods.
 *
 *   family         what it is                                                        tone   colour field
 *   nearWhite      a paper sweep: near-white (L .99) lit from the top left, falling    light  no
 *                  to L .93 in the far corner
 *   lightStudio    a light grey studio sweep: a top key (L .96) over a floor that      light  no
 *                  falls to L .80 (16 L* across: a lit place, never a flat grey)
 *   softSky        a pale sky: deeper at the top (L .885 C .05), a pale horizon low     light  yes (pale)
 *   gradientField  a pale tinted mesh: two lobes of the field hue from opposite         light  yes (pale)
 *                  corners over paper, white light from the top left
 *   whiteBand      white with one lit band of the brand colour across the top, fading  light  the band; floods once
 *   blackField     studio black: L .10, one soft key from above left (to L .23 at the   dark   no
 *                  top edge), a faint floor, an optical vignette
 *   studio         a mid slate cyclorama: a broad top key (L .47) over a slate floor     dark   no
 *                  (L .24): the product stage for cards on a dark-mid ground
 *   deepPool       a deep field at the accent's hue (L .20 C .05) with a glow rising     dark   yes (the whole field)
 *                  from the bottom edge (L .37 C .085)
 *   duskMesh       a deep tinted night: two lobes of the field hue (L .34 and .25)       dark   yes (the lobes)
 *                  from opposite corners over L .135, a neutral key from the top
 *   floorGlow      near-black with one glow of the field hue rising from the floor       dark   yes (the glow)
 *   lightDark      the problem on nearWhite, then the product on blackField: one turn    turn   no
 */
export type GroundFamily = 'nearWhite' | 'lightStudio' | 'softSky' | 'gradientField' | 'whiteBand' | 'blackField' | 'studio' | 'deepPool' | 'duskMesh' | 'floorGlow' | 'lightDark';
export const GROUND_FAMILIES: Record<GroundFamily, { about: string; tone: 'light' | 'dark' | 'turn'; field: boolean; event: string }> = {
  nearWhite: { about: 'a paper sweep lit from the top left, near-white falling to L .93', tone: 'light', field: false, event: 'an accent lobe opens from the top right' },
  lightStudio: { about: 'a light grey studio sweep: a top key over a falling floor', tone: 'light', field: false, event: 'an accent lobe opens from the top right' },
  softSky: { about: 'a pale sky, deeper at the top, a pale horizon low', tone: 'light', field: true, event: 'an accent lobe opens from the top right' },
  gradientField: { about: 'a pale tinted mesh: two lobes of the field hue from opposite corners', tone: 'light', field: true, event: 'an accent lobe opens from the top right' },
  whiteBand: { about: 'white with one lit band of the brand colour across the top', tone: 'light', field: true, event: 'the band floods the frame for one line' },
  blackField: { about: 'studio black under one soft key from above left', tone: 'dark', field: false, event: 'the key takes the accent hue' },
  studio: { about: 'a mid slate cyclorama: a broad top key over a slate floor', tone: 'dark', field: false, event: 'the key takes the accent hue' },
  deepPool: { about: 'a deep field at the accent hue with a glow rising from the bottom edge', tone: 'dark', field: true, event: 'the glow rises' },
  duskMesh: { about: 'a deep tinted night: two lobes of the field hue from opposite corners', tone: 'dark', field: true, event: 'the lobes rise and open' },
  floorGlow: { about: 'near-black with one glow of the field hue rising from the floor', tone: 'dark', field: true, event: 'the glow rises' },
  lightDark: { about: 'the problem on a light page, the product on a dark stage', tone: 'turn', field: false, event: 'the turn to dark, once, on a seam' },
};
export const FAMILY_NAMES = Object.keys(GROUND_FAMILIES) as GroundFamily[];

/** The colours a family stands on and writes with. `dark`: the light-then-dark family after its turn. */
export type FamilyInks = { ground: string; far: string; type: string; mute: string; accent: string; surface: string; line: string; dark: boolean; field?: string; onField?: string };

/** A field's hue: the accent's own when it is a blue, teal or green, else a cool 230 (a red or yellow never becomes a pink or cream field). */
export const fieldHue = (accent: string = C.accent) => {
  const h = toOklch(accent)[2];
  return h >= 150 && h <= 265 ? h : 230;
};
/** A hue offset from the field hue, held inside the cool band (150-262: never toward purple, never toward yellow). */
const fieldShift = (h: number, d: number) => Math.min(262, Math.max(150, h + d));
/** The hue of the film's neutrals: the paper's own when it is tinted, else the ink's, else the field's (at a grey's chroma it rounds to grey). */
const neutralHue = (paper: string, ink: string, hf: number) => {
  const [, pc, ph] = toOklch(paper);
  if (pc > 0.002) return ph;
  const [, ic, ih] = toOklch(ink);
  return ic > 0.002 ? ih : hf;
};

/** The family's inks from the film's tokens (paper, ink, accent): grounds, type, the UI surface, the colour field. */
export const familyInks = (family: GroundFamily, o: { dark?: boolean; paper?: string; ink?: string; accent?: string; white?: string } = {}): FamilyInks => {
  const paper = o.paper ?? C.paper;
  const ink = o.ink ?? C.ink;
  const accent = o.accent ?? C.accent;
  const white = o.white ?? C.white;
  const hf = fieldHue(accent);
  const h = toOklch(ink)[2];
  const nh = neutralHue(paper, ink, hf);
  const lightSet = (ground: string, far: string, extra: Partial<FamilyInks> = {}): FamilyInks => ({ ground, far, type: ink, mute: mixColor(ink, ground, 0.42), accent, surface: white, line: mixColor(ink, ground, 0.84), dark: false, ...extra });
  const darkSet = (ground: string, far: string, extra: Partial<FamilyInks> = {}): FamilyInks => ({ ground, far, type: white, mute: mixColor(white, ground, 0.4), accent: mixColor(accent, white, 0.28), surface: mixColor(ground, white, 0.15), line: mixColor(white, ground, 0.8), dark: true, ...extra });
  // cinetic:device-palette the ground families' fields and their type, derived from the film's tokens at each family's lightness
  switch (family) {
    case 'blackField':
      return darkSet(oklch(0.11, 0.004, h), oklch(0.09, 0.003, h));
    case 'studio':
      return darkSet(oklch(0.33, 0.008, nh), oklch(0.25, 0.008, nh), { surface: oklch(0.42, 0.008, nh) });
    case 'deepPool':
      return darkSet(oklch(0.22, 0.052, hf), oklch(0.17, 0.042, hf), { field: oklch(0.25, 0.055, hf), onField: white });
    case 'duskMesh':
      return darkSet(oklch(0.17, 0.026, hf), oklch(0.12, 0.014, hf), { field: oklch(0.34, 0.09, fieldShift(hf, 10)), onField: white });
    case 'floorGlow':
      return darkSet(oklch(0.1, 0.006, nh), oklch(0.085, 0.005, nh), { field: oklch(0.42, 0.1, hf), onField: white });
    case 'whiteBand':
      return lightSet(mixColor(white, paper, 0.25), paper, { field: accent, onField: contrastOn(accent, white, ink) });
    case 'softSky':
      return lightSet(oklch(0.955, 0.02, 234), oklch(0.9, 0.045, 236), { field: oklch(0.93, 0.03, 234), onField: ink });
    case 'gradientField':
      return lightSet(oklch(0.955, 0.02, hf), oklch(0.9, 0.055, hf), { field: oklch(0.92, 0.045, hf), onField: ink });
    case 'lightStudio':
      return lightSet(oklch(0.9, 0.006, nh), oklch(0.82, 0.008, nh));
    case 'lightDark':
      return o.dark ? darkSet(oklch(0.11, 0.006, h), oklch(0.09, 0.005, h)) : lightSet(paper, mixColor(paper, ink, 0.06));
    default:
      return lightSet(paper, mixColor(paper, ink, 0.05));
  }
};
const lum = (c: string) => toOklch(c)[0];
/** White or ink on a colour field, whichever reads (the field's lightness decides). */
const contrastOn = (field: string, white: string, ink: string) => (lum(field) < 0.66 ? white : ink);

// ------------------------------------------------------------------------------------------------ lit fields

/**
 * One light of a lit field: centre (x, y) in shares of the frame (outside 0..1 is outside the frame), extent rx, ry in
 * frame widths (so a circle stays round), its colour in OKLCH and its strength `a` (0..1, the mix at its centre);
 * the falloff is gaussian, 11 % of `a` at one extent. `rot` turns the ellipse (degrees).
 */
export type FieldLight = { x: number; y: number; rx: number; ry: number; L: number; C: number; h: number; a: number; rot?: number };
/** A lit field: the base colour (OKLCH), its lights in order, an optical vignette (0..0.3: the corners' L falls by up to this share) and the dither (levels, +-). */
export type LitField = { L: number; C: number; h: number; lights: FieldLight[]; vignette?: number; dither?: number };

export const LIT_FIELD = {
  grid: 4, // px between computed nodes (the field is smooth: interpolated in float between them)
  falloff: 2.2, // gaussian k: exp(-k d^2), 11 % at one extent
  dither: { light: 1.5, dark: 1.5 }, // triangular dither amplitude in levels (+-): enough to survive a half-size render and the encode
} as const;

const labOf = (L: number, Cc: number, h: number): [number, number, number] => [L, Cc * Math.cos((h * Math.PI) / 180), Cc * Math.sin((h * Math.PI) / 180)];

/** The field's colour at (u, v) (shares of a W x H frame) in OKLab. Pure. */
export const litFieldAt = (f: LitField, u: number, v: number, W: number, H: number): [number, number, number] => {
  let [L, A, B] = labOf(f.L, f.C, f.h);
  for (const l of f.lights) {
    let dx = u - l.x;
    let dy = ((v - l.y) * H) / W;
    if (l.rot) {
      const r = (l.rot * Math.PI) / 180;
      [dx, dy] = [dx * Math.cos(r) + dy * Math.sin(r), -dx * Math.sin(r) + dy * Math.cos(r)];
    }
    const d2 = (dx / l.rx) ** 2 + (dy / l.ry) ** 2;
    const w = l.a * Math.exp(-LIT_FIELD.falloff * d2);
    const [lL, lA, lB] = labOf(l.L, l.C, l.h);
    L += (lL - L) * w;
    A += (lA - A) * w;
    B += (lB - B) * w;
  }
  if (f.vignette) {
    const r = Math.hypot((u - 0.5) * 2, ((v - 0.5) * 2 * H) / W);
    const t = clamp((r - 0.55) / 0.85);
    const k = 1 - f.vignette * t * t * (3 - 2 * t);
    L *= k;
    A *= k;
    B *= k;
  }
  return [L, A, B];
};

/** A lit field as RGBA bytes (W x H), computed on the node grid, interpolated in float and dithered per pixel. Pure. */
export const litFieldPixels = (f: LitField, W: number, H: number, seed = 0) => {
  const g = LIT_FIELD.grid;
  const nx = Math.ceil(W / g) + 1;
  const ny = Math.ceil(H / g) + 1;
  const nodes = new Float32Array(nx * ny * 3);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const c = srgbOf(litFieldAt(f, Math.min(1, (i * g) / W), Math.min(1, (j * g) / H), W, H));
      const k = (j * nx + i) * 3;
      nodes[k] = c[0];
      nodes[k + 1] = c[1];
      nodes[k + 2] = c[2];
    }
  const amp = f.dither ?? (f.L < 0.5 ? LIT_FIELD.dither.dark : LIT_FIELD.dither.light);
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const fy = y / g;
    const j = Math.min(ny - 2, Math.floor(fy));
    const ty = fy - j;
    for (let x = 0; x < W; x++) {
      const fx = x / g;
      const i = Math.min(nx - 2, Math.floor(fx));
      const tx = fx - i;
      const k00 = (j * nx + i) * 3;
      const k10 = k00 + 3;
      const k01 = k00 + nx * 3;
      const k11 = k01 + 3;
      const o = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const a = nodes[k00 + c] + (nodes[k10 + c] - nodes[k00 + c]) * tx;
        const b = nodes[k01 + c] + (nodes[k11 + c] - nodes[k01 + c]) * tx;
        const vv = (a + (b - a) * ty) * 255 + (hash01(x, y, seed + 2 * c) + hash01(x + 7919, y + 104729, seed + 2 * c + 1) - 1) * amp;
        px[o + c] = vv < 0 ? 0 : vv > 255 ? 255 : Math.round(vv);
      }
      px[o + 3] = 255;
    }
  }
  return px;
};

/** The lightness range (L*, 0-100) a field spans over the frame, sampled on a 24 x 14 grid: a lit place spans 12 or more. */
export const litFieldRange = (f: LitField, W = 1920, H = 1080) => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j <= 14; j++)
    for (let i = 0; i <= 24; i++) {
      const c = srgbOf(litFieldAt(f, i / 24, j / 14, W, H));
      const Ls = lstarOf(c);
      lo = Math.min(lo, Ls);
      hi = Math.max(hi, Ls);
    }
  return { lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10, range: Math.round((hi - lo) * 10) / 10 };
};
const lstarOf = ([r, g, b]: [number, number, number]) => {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
};

/**
 * Whether a field lights from an edge: its lightest point on the frame's border is at least as light as anything
 * inside (a pool or a dome inside the frame reads as haze: look-audit ground-haze). Sampled on a 24 x 14 grid.
 */
export const litFromEdge = (f: LitField, W = 1920, H = 1080) => {
  let edge = -Infinity;
  let inner = -Infinity;
  for (let j = 0; j <= 14; j++)
    for (let i = 0; i <= 24; i++) {
      const L = litFieldAt(f, i / 24, j / 14, W, H)[0];
      if (i === 0 || j === 0 || i === 24 || j === 14) edge = Math.max(edge, L);
      else inner = Math.max(inner, L);
    }
  return inner <= edge + 0.005;
};

/** A family's field from the film's tokens (paper, ink, accent), at rest or in its colour event (`event`). Pure. */
export const familyField = (family: GroundFamily, o: { dark?: boolean; event?: boolean; paper?: string; ink?: string; accent?: string } = {}): LitField => {
  const paper = o.paper ?? C.paper;
  const ink = o.ink ?? C.ink;
  const accent = o.accent ?? C.accent;
  const hf = fieldHue(accent);
  const nh = neutralHue(paper, ink, hf);
  const [aL, aC, ah] = toOklch(accent);
  const pc = Math.min(0.006, toOklch(paper)[1]);
  const ev = !!o.event;
  // light families' event: an accent lobe opens from the top right
  const lobe: FieldLight = { x: 1.02, y: -0.12, rx: 0.86, ry: 0.78, L: 0.86, C: 0.075, h: hf, a: 0.92 };
  const fam = family === 'lightDark' ? (o.dark ? 'blackField' : 'nearWhite') : family;
  switch (fam) {
    case 'nearWhite':
      return { L: 0.958, C: pc, h: nh, lights: [{ x: -0.08, y: -0.3, rx: 1.05, ry: 0.95, L: 0.995, C: 0.002, h: nh, a: 0.95 }, { x: 1.12, y: 1.3, rx: 0.75, ry: 0.7, L: 0.925, C: 0.008, h: nh, a: 0.55 }, ...(ev ? [lobe] : [])] };
    case 'lightStudio':
      return { L: 0.86, C: 0.006, h: nh, vignette: 0.05, lights: [{ x: 0.5, y: -0.55, rx: 1.2, ry: 0.95, L: 0.968, C: 0.004, h: nh, a: 1 }, { x: 0.5, y: 1.45, rx: 1.3, ry: 0.65, L: 0.79, C: 0.008, h: nh, a: 0.8 }, ...(ev ? [lobe] : [])] };
    case 'softSky':
      return { L: 0.975, C: 0.008, h: 232, lights: [{ x: 0.5, y: -0.95, rx: 1.7, ry: 1.15, L: 0.885, C: 0.05, h: 236, a: 1 }, { x: 0.5, y: 1.35, rx: 1.5, ry: 0.55, L: 0.99, C: 0.004, h: 220, a: 0.7 }, ...(ev ? [{ ...lobe, h: fieldShift(hf, 0) }] : [])] };
    case 'gradientField':
      return {
        L: 0.962, C: 0.014, h: hf,
        lights: [
          { x: 1.04, y: -0.12, rx: 0.78, ry: 0.72, L: ev ? 0.84 : 0.885, C: ev ? 0.085 : 0.062, h: fieldShift(hf, 8), a: 0.92 },
          { x: -0.1, y: 1.12, rx: 0.7, ry: 0.62, L: 0.925, C: 0.045, h: fieldShift(hf, -10), a: 0.8 },
          { x: 0.08, y: -0.2, rx: 0.55, ry: 0.45, L: 0.99, C: 0.004, h: hf, a: 0.55 },
        ],
      };
    case 'whiteBand':
      return { L: 0.985, C: 0.003, h: nh, lights: [{ x: 0.5, y: -0.3, rx: 2.4, ry: 0.34, L: aL, C: aC * 0.92, h: ah, a: 0.97 }, { x: 0.5, y: 1.4, rx: 1.4, ry: 0.6, L: 0.955, C: 0.004, h: nh, a: 0.5 }] };
    case 'blackField':
      return { L: 0.1, C: 0.004, h: nh, vignette: 0.22, lights: [{ x: 0.36, y: -0.5, rx: 1.0, ry: 0.85, L: ev ? 0.31 : 0.27, C: ev ? 0.07 : 0.006, h: ev ? hf : nh, a: 1 }, { x: 0.5, y: 1.5, rx: 1.1, ry: 0.55, L: 0.15, C: 0.004, h: nh, a: 0.6 }] };
    case 'studio':
      return { L: 0.3, C: 0.008, h: nh, vignette: 0.16, lights: [{ x: 0.5, y: -0.6, rx: 1.25, ry: 0.95, L: ev ? 0.5 : 0.47, C: ev ? 0.06 : 0.006, h: ev ? hf : nh, a: 1 }, { x: 0.5, y: 1.45, rx: 1.3, ry: 0.65, L: 0.235, C: 0.008, h: nh, a: 0.75 }] };
    case 'deepPool':
      return { L: 0.2, C: 0.05, h: hf, vignette: 0.15, lights: [{ x: 0.5, y: ev ? 1.2 : 1.38, rx: 1.25, ry: 0.72, L: ev ? 0.43 : 0.37, C: ev ? 0.1 : 0.085, h: hf, a: 1 }, { x: 0.5, y: -0.55, rx: 1.5, ry: 0.62, L: 0.145, C: 0.04, h: hf, a: 0.75 }] };
    case 'duskMesh':
      return {
        L: 0.135, C: 0.014, h: hf, vignette: 0.12,
        lights: [
          { x: 1.06, y: ev ? -0.04 : -0.16, rx: 0.84, ry: 0.8, L: ev ? 0.46 : 0.4, C: ev ? 0.11 : 0.1, h: fieldShift(hf, 10), a: 0.92 },
          { x: -0.16, y: ev ? 1.04 : 1.16, rx: 0.74, ry: 0.64, L: ev ? 0.35 : 0.3, C: 0.08, h: fieldShift(hf, -12), a: 0.84 },
          { x: 0.12, y: -0.45, rx: 0.8, ry: 0.6, L: 0.21, C: 0.012, h: nh, a: 0.5 },
        ],
      };
    case 'floorGlow':
      return { L: 0.085, C: 0.006, h: nh, vignette: 0.2, lights: [{ x: 0.5, y: ev ? 1.12 : 1.28, rx: 1.05, ry: 0.5, L: ev ? 0.5 : 0.44, C: ev ? 0.12 : 0.11, h: hf, a: 1 }] };
    default:
      return { L: 0.958, C: pc, h: nh, lights: [] };
  }
};

/** A family field baked at w x h as a cached data URL (browser; '' in Node). */
export const bakeFamily = (family: GroundFamily, w: number, h: number, o: { dark?: boolean; event?: boolean; seed?: number } = {}) => {
  const W = Math.max(2, Math.round(w));
  const H = Math.max(2, Math.round(h));
  const f = familyField(family, o);
  return bakePixels(`family|${JSON.stringify(f)}|${W}|${H}|${o.seed ?? 0}`, W, H, () => litFieldPixels(f, W, H, o.seed ?? 0));
};

/**
 * The family's ground at frame `frame`, full frame and never cut: draw it once under every shot, outside the camera,
 * so the content moves over a still, lit place. `dark` (lightDark): after the turn. `event` 0..1: the family's one
 * colour event cross-faded in (GROUND_FAMILIES[family].event). `flood` (whiteBand): 0..1, the band covering the frame
 * from the top for the film's one colour line. `res` the bake's share of the frame (1: full size, the default; 0.5 for a
 * quick look). The field is baked once per recipe (litFieldPixels) and never animates its stops.
 */
export const FamilyGround: React.FC<{ family: GroundFamily; frame: number; dark?: boolean; flood?: number; event?: number; seed?: number; res?: number; style?: React.CSSProperties }> = ({ family, dark = false, flood = 0, event = 0, seed = 1, res = 1, style }) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const k = inksCache(family, dark);
  const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'block' };
  const rest = bakeFamily(family, W * res, H * res, { dark, seed: seed % 97 });
  const e = clamp(event);
  const evSrc = e > 0 && family !== 'whiteBand' && family !== 'lightDark' ? bakeFamily(family, W * res, H * res, { dark, event: true, seed: (seed % 97) + 1 }) : '';
  const f = clamp(flood);
  return (
    <div data-ground={family} style={{ ...abs, overflow: 'hidden', background: k.ground, ...style }}>
      {rest && <Img src={rest} style={abs} />}
      {evSrc && <Img src={evSrc} style={{ ...abs, opacity: e }} />}
      {family === 'whiteBand' && f > 0 && <div style={{ ...abs, background: k.accent, clipPath: `inset(0px 0px ${((1 - f) * H).toFixed(2)}px 0px)` }} />}
    </div>
  );
};
const inkMemo = new Map<string, FamilyInks>();
const inksCache = (family: GroundFamily, dark: boolean) => {
  const key = `${family}|${dark}`;
  let v = inkMemo.get(key);
  if (!v) inkMemo.set(key, (v = familyInks(family, { dark })));
  return v;
};

/** Grounds are still or continuous light (no steps): nothing to declare. */
export const declares =(_p?: Partial<GroundSpec>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
