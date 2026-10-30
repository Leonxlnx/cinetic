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
import { Depth } from './Depth';
import { bakePixels, bakePlate } from './Gradients';
import { Wash, WASH } from './Washes';
import { hash01 } from './plates';

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
 * films never share the same paper and slate. A family is one field and its light for the whole film, never cut, with
 * at most one colour event (the band flooding the frame for one line, the turn to dark); the bans stay (no orange, no
 * purple, no neon). Fields take the accent's hue only when it is a blue, teal or green (else a cool 230).
 *
 *   family         what it is                                                    tone   colour field
 *   nearWhite      98 % light, a clean near-white page under real pictures and UI  light  no
 *   blackField     a near-black field (L .13), white type, a soft light along rims  dark   no
 *   whiteBand      white with one band of the brand colour across the top; once a   light  the band (one line on it)
 *                  film the band floods the frame for one line
 *   deepPool       a deep field at the accent's hue (L .19) with a light pool        dark   yes (the whole field)
 *                  drifting slowly behind the subject
 *   softSky        a pale sky gradient (L .965 to .915 at a cool hue), type in ink  light  yes (pale)
 *   lightDark      the problem on a light page, then the product on a dark stage:   turn   no
 *                  one turn, declared, on a seam
 *   gradientField  one pale tinted gradient field (L .965 to .90 at the hue), drifting light  yes (pale)
 */
export type GroundFamily = 'nearWhite' | 'blackField' | 'whiteBand' | 'deepPool' | 'softSky' | 'lightDark' | 'gradientField';
export const GROUND_FAMILIES: Record<GroundFamily, { about: string; tone: 'light' | 'dark' | 'turn'; field: boolean; event: string }> = {
  nearWhite: { about: 'a clean near-white page under real pictures and UI', tone: 'light', field: false, event: 'none' },
  blackField: { about: 'a near-black field, white type, a soft light along the rims', tone: 'dark', field: false, event: 'none' },
  whiteBand: { about: 'white with one band of the brand colour across the top', tone: 'light', field: true, event: 'the band floods the frame for one line' },
  deepPool: { about: 'a deep field at the accent hue with a light pool drifting behind the subject', tone: 'dark', field: true, event: 'none (the field is the colour)' },
  softSky: { about: 'a pale sky gradient, type in ink', tone: 'light', field: true, event: 'none' },
  lightDark: { about: 'the problem on a light page, the product on a dark stage', tone: 'turn', field: false, event: 'the turn to dark, once, on a seam' },
  gradientField: { about: 'one pale tinted gradient field, drifting', tone: 'light', field: true, event: 'none' },
};
export const FAMILY_NAMES = Object.keys(GROUND_FAMILIES) as GroundFamily[];

/** The colours a family stands on and writes with. `dark`: the light-then-dark family after its turn. */
export type FamilyInks = { ground: string; far: string; type: string; mute: string; accent: string; surface: string; line: string; dark: boolean; field?: string; onField?: string };

/** A field's hue: the accent's own when it is a blue, teal or green, else a cool 230 (a red or yellow never becomes a pink or cream field). */
export const fieldHue = (accent: string = C.accent) => {
  const h = toOklch(accent)[2];
  return h >= 150 && h <= 265 ? h : 230;
};

/** The family's inks from the film's tokens (paper, ink, accent): grounds, type, the UI surface, the colour field. */
export const familyInks = (family: GroundFamily, o: { dark?: boolean; paper?: string; ink?: string; accent?: string; white?: string } = {}): FamilyInks => {
  const paper = o.paper ?? C.paper;
  const ink = o.ink ?? C.ink;
  const accent = o.accent ?? C.accent;
  const white = o.white ?? C.white;
  const hf = fieldHue(accent);
  const h = toOklch(ink)[2];
  const lightSet = (ground: string, far: string, extra: Partial<FamilyInks> = {}): FamilyInks => ({ ground, far, type: ink, mute: mixColor(ink, ground, 0.42), accent, surface: white, line: mixColor(ink, ground, 0.84), dark: false, ...extra });
  const darkSet = (ground: string, far: string, extra: Partial<FamilyInks> = {}): FamilyInks => ({ ground, far, type: white, mute: mixColor(white, ground, 0.4), accent: mixColor(accent, white, 0.28), surface: mixColor(ground, white, 0.09), line: mixColor(white, ground, 0.8), dark: true, ...extra });
  // cinetic:device-palette the ground families' fields and their type, derived from the film's tokens at each family's lightness
  switch (family) {
    case 'blackField':
      return darkSet(oklch(0.13, 0.004, h), oklch(0.1, 0.003, h));
    case 'deepPool':
      return darkSet(oklch(0.19, 0.045, hf), oklch(0.15, 0.04, hf), { field: oklch(0.19, 0.045, hf), onField: white });
    case 'whiteBand':
      return lightSet(mixColor(white, paper, 0.25), paper, { field: accent, onField: contrastOn(accent, white, ink) });
    case 'softSky':
      return lightSet(oklch(0.965, 0.018, 232), oklch(0.915, 0.034, 232), { field: oklch(0.94, 0.026, 232), onField: ink });
    case 'gradientField':
      return lightSet(oklch(0.965, 0.022, hf), oklch(0.9, 0.05, hf), { field: oklch(0.93, 0.036, hf), onField: ink });
    case 'lightDark':
      return o.dark ? darkSet(oklch(0.17, 0.008, h), oklch(0.13, 0.006, h)) : lightSet(paper, mixColor(paper, ink, 0.06));
    default:
      return lightSet(paper, mixColor(paper, ink, 0.05));
  }
};
const lum = (c: string) => toOklch(c)[0];
/** White or ink on a colour field, whichever reads (the field's lightness decides). */
const contrastOn = (field: string, white: string, ink: string) => (lum(field) < 0.66 ? white : ink);

/**
 * The family's ground at frame `frame`, full frame and never cut: draw it once under every shot (outside the camera
 * float, so the content drifts over it). `dark` (lightDark): after the turn. `flood` (whiteBand): 0..1, the band
 * covering the frame for the film's one colour event. Every plate is baked once, dithered, and moved by transform
 * only; the light drifts on 9-16 s loops, so a held ground is never dead and never pulses.
 */
export const FamilyGround: React.FC<{ family: GroundFamily; frame: number; dark?: boolean; flood?: number; seed?: number; style?: React.CSSProperties }> = ({ family, frame, dark = false, flood = 0, seed = 1, style }) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const t = frame / fpsOf(film);
  const k = inksCache(family, dark);
  const abs: React.CSSProperties = { position: 'absolute', left: 0, top: 0 };
  const ph = (seed % 97) / 97;
  const wave = (period: number, phase = 0) => Math.sin(2 * Math.PI * (t / period + ph + phase));
  const b = GROUND.bake;
  const Plate: React.FC<{ src: string; x?: number; y?: number; w: number; h: number; rot?: number; o?: number }> = ({ src, x = 0, y = 0, w, h, rot = 0, o = 1 }) =>
    src ? <Img src={src} style={{ ...abs, width: w, height: h, opacity: o, transformOrigin: '50% 50%', transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)` }} /> : null;
  let body: React.ReactNode = null;
  if (family === 'nearWhite' || (family === 'lightDark' && !dark)) {
    return <LitGround frame={frame} spec={{ kind: 'wash', base: k.ground, lift: 0.035, seed }} style={style} />;
  } else if (family === 'blackField' || (family === 'lightDark' && dark)) {
    // a soft light along the top rim, sliding slowly: the field is black, the light is felt on its edge
    const rim = bakePlate('linear', [{ at: 0, color: C.white, alpha: 0.075 }, { at: 0.5, color: C.white, alpha: 0.02 }, { at: 1, color: C.white, alpha: 0 }], W * b * 0.5, H * 0.42 * b * 0.5, { vertical: true, seed: 5 });
    body = <Plate src={rim} x={W * 0.08 * wave(14)} y={-H * 0.04} w={W * 1.3} h={H * 0.42} />;
  } else if (family === 'whiteBand') {
    const bandH = H * (0.24 + 0.015 * wave(12));
    const f = clamp(flood);
    const band = bakePlate('linear', [{ at: 0, color: k.accent, alpha: 0.92 }, { at: 0.55, color: k.accent, alpha: 0.42 }, { at: 1, color: k.accent, alpha: 0 }], W * b * 0.25, H * 0.5 * b * 0.5, { vertical: true, seed: 7 });
    body = (
      <>
        <Plate src={band} x={-W * 0.05} y={-bandH * 0.08} w={W * 1.1} h={bandH * 1.6} />
        {f > 0 && <div style={{ ...abs, width: W, height: H, background: k.accent, clipPath: `inset(0px 0px ${((1 - f) * H).toFixed(2)}px 0px)` }} />}
      </>
    );
  } else if (family === 'deepPool') {
    const pool = bakePlate('radial', [{ at: 0, color: mixColor(k.ground, C.white, 0.14), alpha: 1 }, { at: 0.5, color: mixColor(k.ground, C.white, 0.06), alpha: 0.6 }, { at: 1, color: k.ground, alpha: 0 }], W * b * 0.4, W * b * 0.4, { seed: 9 });
    const R = W * 0.95;
    body = <Plate src={pool} x={W / 2 - R / 2 + W * 0.06 * wave(15)} y={H * 0.58 - R / 2 + H * 0.04 * wave(11, 0.25)} w={R} h={R} />;
  } else if (family === 'softSky' || family === 'gradientField') {
    const size = Math.hypot(W, H) * 1.2;
    const sky = bakePlate('linear', [{ at: 0, color: k.ground }, { at: 0.55, color: mixColor(k.ground, k.far, 0.5) }, { at: 1, color: k.far }], size * b * 0.5, size * b * 0.5, { seed: 11 });
    const rot = family === 'softSky' ? 90 : 62;
    body = <Plate src={sky} x={(W - size) / 2 + W * 0.03 * wave(16)} y={(H - size) / 2 + H * 0.03 * wave(13, 0.3)} w={size} h={size} rot={rot} />;
  }
  return (
    <div data-ground={family} style={{ ...abs, width: W, height: H, overflow: 'hidden', background: k.ground, ...style }}>
      {body}
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

/** Grounds are continuous light (drift loops, no steps): nothing to declare. */
export const declares =(_p?: Partial<GroundSpec>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
