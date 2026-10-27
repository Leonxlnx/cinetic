import React from 'react';
import { clamp, E, type Ease, M, OVERSIZE } from '../lib/anim';
import { mixColor, mixRgb } from '../lib/color';
import { defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * An oversized landing: the element cuts in LARGER than its rest size and settles down to it, never
 * below. It replaces a scale-up from nothing (which reads as a template) with weight: the word
 * arrives close to the lens and sits down into the layout. The colour can cool from the accent to
 * the ink in parallel, either all at once or as a soft front that sweeps across the element, and a
 * defocused start can snap (or resolve) sharp.
 *
 * House numbers (60 fps): from x1.6 (normal 1.28-1.9; up to about x2.7 for a first word that also
 * starts defocused), settle 36 f on M.oversize (normal 22-56 f), the colour home about 12 f before
 * the scale. The scale is drawn on a composited layer, so the settle stays sub-pixel smooth to the
 * last frame. Anchor it where the layout is fixed: `origin` 'center' for a centred title, 'left
 * center' for a left-aligned line (its left edge then stays put while the rest settles).
 */
export type OversizeOpts = {
  start: number; // the first frame: the element is drawn at `from` on it (it cuts in oversized)
  from?: number; // scale on `start` (house 1.6)
  dur?: number; // film frames to settle to 1 (default 36 f@60)
  ease?: Ease; // default M.oversize
  origin?: string; // CSS transform-origin of the settle (default 'center')
  /** Colour: the element starts in `accent` and cools to `ink`. Off when no accent is given. */
  accent?: string;
  ink?: string;
  cool?: 'together' | 'sweep'; // all at once, or a soft front crossing the element (default together)
  coolStart?: number; // film frames after `start` the cool begins (default 0)
  coolDur?: number; // film frames of the cool (default: dur minus 12 f@60, so the colour is home first)
  coolEase?: Ease; // default E.linear (together); E.glideOut reads well for a sweep
  space?: 'srgb' | 'oklab'; // the space the cool is linear in (house 'srgb'; a sweep is always srgb)
  sweep?: { dir?: 'ltr' | 'rtl'; width?: number }; // the front: direction and softness as a share of the element's width (default ltr, 0.8)
  /** Defocus: `defocus` px (at 1080p) on `start`, held until `defocusUntil` (sharp from that frame), or resolving over `defocusDur` frames. */
  defocus?: number;
  defocusUntil?: number;
  defocusDur?: number;
  defocusEase?: Ease; // the resolve's curve (default E.softOut)
  id?: string; // name for the declarations (default 'oversize')
};

export type OversizeState = {
  scale: number; // >= 1 while settling down from above
  t: number; // settle progress 0..1 (eased)
  cool: number; // colour progress 0 (accent) .. 1 (ink); for a sweep, the front's progress
  color?: string; // the uniform colour (together), when an accent is given
  front?: { lead: number; width: number; dir: 'ltr' | 'rtl' }; // sweep: lead edge in element widths (ink behind it, accent ahead after `width`)
  blur: number; // px at 1080p
};

const HOUSE = { from: 1.6, dur60: 36, coolLead60: 12, sweepWidth: 0.8 } as const;

/**
 * The first word of a kinetic opener: cut in at x2.67, defocused 6 px, settling in 24 f at 60 fps, and snapping sharp
 * (defocusUntil) on the frame the second word lands: the focus snap is the hit. Spread into OversizeOpts with
 * `defocusUntil` set to the second word's frame (f60x the dur for other rates).
 */
export const OVERSIZE_FIRST = { from: 2.67, dur60: 24, defocus: 6 } as const;

/** The house oversize numbers in film frames at `fps`. */
export const oversizeDefaults = (fps: number) => ({ from: HOUSE.from, dur: f60x(HOUSE.dur60, fps), coolLead: f60x(HOUSE.coolLead60, fps), range: OVERSIZE });

/**
 * State of an oversized landing at `frame` (pure, closed form; fractional frames are exact). Before
 * `start` the element is at `from` (it is not drawn there: the component hides it), on `start` at
 * `from`, at `start + dur` at 1. A `from` above 1 never draws below 1, whatever the ease does.
 */
export const oversizeState = (frame: number, o: OversizeOpts, film?: Partial<FilmCtx>): OversizeState => {
  const fps = fpsOf(film);
  const from = o.from ?? HOUSE.from;
  const dur = Math.max(1e-6, o.dur ?? f60x(HOUSE.dur60, fps));
  const ease = o.ease ?? M.oversize;
  const u = clamp((frame - o.start) / dur);
  const t = u <= 0 ? 0 : u >= 1 ? 1 : ease(u);
  const raw = from + (1 - from) * t;
  const scale = from >= 1 ? Math.max(1, raw) : Math.min(1, raw);
  // colour
  const cs = o.start + (o.coolStart ?? 0);
  const cd = Math.max(1e-6, o.coolDur ?? Math.max(1, dur - f60x(HOUSE.coolLead60, fps)));
  const cu = clamp((frame - cs) / cd);
  const cool = cu <= 0 ? 0 : cu >= 1 ? 1 : (o.coolEase ?? E.linear)(cu);
  let color: string | undefined;
  let front: OversizeState['front'];
  if (o.accent) {
    const ink = o.ink ?? o.accent;
    if ((o.cool ?? 'together') === 'sweep') {
      const width = Math.max(1e-3, o.sweep?.width ?? HOUSE.sweepWidth);
      front = { lead: cool * (1 + width), width, dir: o.sweep?.dir ?? 'ltr' };
    } else color = (o.space ?? 'srgb') === 'srgb' ? mixRgb(o.accent, ink, cool) : mixColor(o.accent, ink, cool);
  }
  // defocus
  let blur = 0;
  if (o.defocus && o.defocus > 0) {
    if (o.defocusUntil !== undefined) blur = frame >= o.start && frame < o.defocusUntil ? o.defocus : 0;
    else if (o.defocusDur !== undefined) {
      const v = clamp((frame - o.start) / Math.max(1e-6, o.defocusDur));
      blur = o.defocus * (1 - (v >= 1 ? 1 : (o.defocusEase ?? E.softOut)(v)));
    } else blur = 0;
  }
  return { scale, t, cool, color, front, blur };
};

/**
 * The sweep's colour progress at x (0 = the element's leading edge, 1 = its far edge, in the sweep's
 * direction): 1 (ink) once the front's lead is `width` past x, 0 (accent) before the lead reaches it.
 */
export const sweepAt = (s: OversizeState, x: number) => (s.front ? clamp((s.front.lead - x) / s.front.width) : s.cool);

/**
 * The CSS filter for a blur of `px` (undefined under 0.05 px). The line system builds every blur here
 * and never puts one on a promoted layer: Words and Chain give a word its own layer (will-change) only
 * on frames where that word is sharp, because a layer whose blur changes leaves stale ghost frames.
 */
export const blurFilter = (px: number): string | undefined => (px > 0.05 ? `blur(${Number(px.toFixed(2))}px)` : undefined);

/** The sweep's mask as CSS (the accent copy shows where the mask is opaque). */
const sweepMask = (f: NonNullable<OversizeState['front']>) => {
  const a = ((f.lead - f.width) * 100).toFixed(3);
  const b = (f.lead * 100).toFixed(3);
  const dir = f.dir === 'ltr' ? 'to right' : 'to left';
  return `linear-gradient(${dir}, transparent ${a}%, #000 ${b}%)`;
};

/**
 * <Oversize start={f} from={1.6}> wraps any element (a word, a title, a mark) and lands it
 * oversized. Colour (accent/ink) is applied as CSS `color`, so text inside should use currentColor.
 * A sweep draws the child twice (ink below, accent above under a moving gradient mask), which mixes
 * in sRGB like a plain colour transition. Hidden before `start`.
 */
export const Oversize: React.FC<
  OversizeOpts & { frame: number; children: React.ReactNode; style?: React.CSSProperties; hideBefore?: boolean }
> = ({ frame, children, style, hideBefore = true, ...o }) => {
  const film = useFilm();
  if (hideBefore && frame < o.start) return null;
  const s = oversizeState(frame, o, film);
  const u = film.height / 1080;
  const copies = s.blur > 0 ? defocusMix(s.blur * u) : [{ level: 0, weight: 1 }];
  const body = (key: string, extra: React.CSSProperties) => (
    <div key={key} style={{ position: 'relative', ...extra }}>
      {children}
    </div>
  );
  const layer = (c: { level: number; weight: number }, i: number) => {
    const blur = c.level > 0 ? blurFilter(c.level) : undefined;
    const st: React.CSSProperties = { position: i === 0 ? 'relative' : 'absolute', inset: i === 0 ? undefined : 0, filter: blur, opacity: i === 0 ? 1 : c.weight };
    if (s.front && o.accent) {
      return (
        <div key={i} style={st}>
          {body('ink', { color: o.ink ?? o.accent })}
          {body('accent', { color: o.accent, position: 'absolute', inset: 0, WebkitMaskImage: sweepMask(s.front), maskImage: sweepMask(s.front) })}
        </div>
      );
    }
    return body(String(i), { ...st, color: s.color });
  };
  return (
    <div
      style={{
        display: 'inline-block',
        transformOrigin: o.origin ?? 'center',
        transform: `translate3d(0, 0, 0) scale(${s.scale.toFixed(6)})`,
        ...style,
      }}
    >
      {copies.map(layer)}
    </div>
  );
};

/** Frames of an oversized landing: when it cuts in, when the colour is home, when the scale is at rest. */
export const oversizeFrames = (o: OversizeOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const dur = o.dur ?? f60x(HOUSE.dur60, fps);
  const coolEnd = o.start + (o.coolStart ?? 0) + (o.coolDur ?? Math.max(1, dur - f60x(HOUSE.coolLead60, fps)));
  return { start: o.start, coolEnd: Math.ceil(coolEnd), rest: Math.ceil(o.start + dur), sharp: o.defocusUntil ?? (o.defocusDur !== undefined ? Math.ceil(o.start + o.defocusDur) : o.start) };
};

/**
 * What an oversized landing declares: a defocus that snaps sharp on `defocusUntil` is a designed
 * step (one sample across it, never shutter-blurred into a smear); nothing else.
 */
export const declares = (p?: Partial<OversizeOpts>, _film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || !p.defocus || p.defocusUntil === undefined) return none;
  return { ...none, stepped: [{ from: p.defocusUntil, to: p.defocusUntil + 1, id: p.id ?? 'oversize' }] };
};
