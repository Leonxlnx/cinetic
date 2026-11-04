import React from 'react';
import { clamp, E, fd, hitPulse, mix, SPR, spr, type Spr } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares, Flash, SteppedRange } from '../timeline';

/**
 * MicroUI: the small answers a product gives, each one exact and short.
 *
 *   CheckPop      a check in a filled disc cuts on at 45 % and pops to full on a front-loaded curve (10 f), its
 *                 tick draws a frame later (7 f), and a thin ring leaves it, growing to 1.9x and fading (14 f)
 *   Toggle        'spring': the knob crosses on the film's one spring (SPR.landing, clamped at 6 % over) and the
 *                 track snaps to the accent one frame after the knob starts; 'inPlace': the knob dissolves on
 *                 the left and reappears on the right while the track colour switches in the same frame
 *   Ripple        click feedback: an 18 px dot blooms at the tip (2 f), thin rings expand around it 10 -> 40 px
 *                 (12 f each, launched 10 f apart, each a step lighter) in the shape of the control (a circle
 *                 or a pill's stadium), and the clicked area takes a light tint that holds (6 f)
 *   ThinkingDots  three dots that darken and grow 1.4x in turn, the wave passing left to right (20 f up, 20 f
 *                 down, 25 f apart at 60 fps); `ellipsis` brings them on one by one, accelerating (14 f, then 7)
 *   TickGauge     a row of thin vertical ticks (about 32, 3 px wide): the filled share is the value; it fills
 *                 one tick a frame from left to right when it moves
 *   EntryFlash    an element arrives over-exposed: a flat overlay in the light colour (or the accent) holds and
 *                 drops to the element's own tone in one step ('step', hold 10 f), or decays over a few frames
 *                 ('decay', 1 -> 0 in 5 f: the accent-flash tile)
 *   hoverPulse    a rim scale for the cursor touching a control: +7.8 % in 2 f at 30 fps, back over 4 f
 *
 * Every state is a pure function of the frame; discrete changes decide on whole frames.
 */

// ---------------------------------------------------------------------------------------------- CheckPop

/** House numbers: frames at 60 fps. */
export const CHECK_POP = { pop60: 10, from: 0.45, tickDelay60: 1, tick60: 7, ring60: 14, ringGrow: 0.9, ringAlpha: 0.9 } as const;

export type CheckPopProps = {
  at: number; // the frame the check cuts on
  pop?: { frames?: number; from?: number }; // 60 fps frames (house 10), first-frame scale (house 0.45)
  tick?: { delay?: number; frames?: number }; // 60 fps frames (house 1 and 7)
  ring?: false | { frames?: number; grow?: number; alpha?: number }; // house 14 f, to 1 + 0.9, from 0.9 opacity
  id?: string;
};

export type CheckPopState = { visible: boolean; scale: number; tick: number; ring: { scale: number; opacity: number } | null };

/** The check's scale, the tick's drawn share and the ring at frame f. Pure. */
export const checkPopState = (frame: number, p: CheckPopProps, film?: Partial<FilmCtx>): CheckPopState => {
  const fps = fpsOf(film);
  if (fd(frame) < p.at) return { visible: false, scale: 0, tick: 0, ring: null };
  const t = frame - p.at;
  const from = p.pop?.from ?? CHECK_POP.from;
  const scale = from + (1 - from) * E.snapOut(clamp(t / Math.max(1, f60x(p.pop?.frames ?? CHECK_POP.pop60, fps))));
  const d = f60x(p.tick?.delay ?? CHECK_POP.tickDelay60, fps);
  const tick = E.snapOut(clamp((t - d) / Math.max(1, f60x(p.tick?.frames ?? CHECK_POP.tick60, fps))));
  let ring: CheckPopState['ring'] = null;
  if (p.ring !== false) {
    const rf = Math.max(1, f60x(p.ring?.frames ?? CHECK_POP.ring60, fps));
    const k = clamp(t / rf);
    if (k < 1) ring = { scale: 1 + (p.ring?.grow ?? CHECK_POP.ringGrow) * E.softOut(k), opacity: (p.ring?.alpha ?? CHECK_POP.ringAlpha) * (1 - k) };
  }
  return { visible: true, scale, tick, ring };
};

/** Sync: the pop (a soft high tick, louder for the last of a run) and when it has settled. */
export const checkPopFrames = (p: CheckPopProps, film?: Partial<FilmCtx>) => ({ pop: p.at, settled: Math.ceil(p.at + f60x(p.pop?.frames ?? CHECK_POP.pop60, fpsOf(film))) });

/** A check that pops, centred on (x, y) (or laid out inline when x/y are left out). */
export const CheckPop: React.FC<CheckPopProps & { frame: number; size: number; fill: string; tick: string; ringColor?: string; x?: number; y?: number; rim?: string }> = (props) => {
  const film = useFilm();
  const s = checkPopState(props.frame, props, film);
  if (!s.visible) return null;
  const sz = props.size;
  const pos: React.CSSProperties = props.x === undefined ? { position: 'relative' } : { position: 'absolute', left: 0, top: 0, transform: `translate(${(props.x - sz / 2).toFixed(2)}px, ${((props.y ?? 0) - sz / 2).toFixed(2)}px)` };
  return (
    <div style={{ ...pos, width: sz, height: sz }}>
      {s.ring && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `${Math.max(1, sz * 0.06)}px solid ${props.ringColor ?? props.fill}`, transform: `scale(${s.ring.scale.toFixed(4)})`, opacity: s.ring.opacity }} />
      )}
      <svg width={sz} height={sz} viewBox="0 0 24 24" style={{ position: 'absolute', inset: 0, transform: `scale(${s.scale.toFixed(4)})` }} aria-hidden>
        <circle cx={12} cy={12} r={11} fill={props.fill} stroke={props.rim} strokeWidth={props.rim ? 1.4 : 0} />
        <path d="M7 12.5l3.2 3.2L17 9" stroke={props.tick} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={(1 - s.tick).toFixed(4)} />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Toggle

/** House numbers: frames at 60 fps. The spring is the film's one underdamped class (SPR.landing). */
export const TOGGLE = { snap60: 1, overshoot: 0.06, inPlace60: 26, swap: 0.5 } as const;

export type ToggleProps = {
  at: number; // the click
  mode?: 'spring' | 'inPlace';
  spring?: Spr; // house SPR.landing (the film's one spring class)
  overshoot?: number; // clamp of the knob's overshoot, share of the travel (house 0.06)
  snap?: number; // spring: 60 fps frames after the click when the track snaps (house 1)
  frames?: number; // inPlace: 60 fps frames for the whole change (house 26)
  off?: boolean; // turning off instead of on
  id?: string;
};

export type ToggleState = { knob: number; on: boolean; knobLeft: number; knobRight: number };

/** The knob's position (0 left .. 1 right), whether the track shows the on colour, and in-place opacities. Pure. */
export const toggleState = (frame: number, p: ToggleProps, film?: Partial<FilmCtx>): ToggleState => {
  const fps = fpsOf(film);
  const F = fd(frame);
  const dir = (k: number) => (p.off ? 1 - k : k);
  if ((p.mode ?? 'spring') === 'spring') {
    const raw = frame < p.at ? 0 : spr(frame, p.at, p.spring ?? SPR.landing, fps);
    const k = Math.min(raw, 1 + (p.overshoot ?? TOGGLE.overshoot));
    const snapped = F >= p.at + Math.round(f60x(p.snap ?? TOGGLE.snap60, fps));
    const knob = dir(k);
    return { knob, on: p.off ? !snapped : snapped, knobLeft: 1 - clamp(knob), knobRight: clamp(knob) };
  }
  // in place: the knob fades out where it was and in where it goes; the track swaps at the midpoint, one frame
  const fr = Math.max(2, f60x(p.frames ?? TOGGLE.inPlace60, fps));
  const t = clamp((frame - p.at) / fr);
  const outK = 1 - E.softIn(clamp(t / TOGGLE.swap));
  const inK = E.snapOut(clamp((t - TOGGLE.swap) / (1 - TOGGLE.swap)));
  const swapped = F >= p.at + Math.round(fr * TOGGLE.swap);
  const from = p.off ? 1 : 0;
  return { knob: swapped ? 1 - from : from, on: p.off ? !swapped : swapped, knobLeft: p.off ? inK : outK, knobRight: p.off ? outK : inK };
};

/** Sync: the click (a toggle click on the knob's start), the track snap. */
export const toggleFrames = (p: ToggleProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const swap = (p.mode ?? 'spring') === 'spring' ? p.at + Math.round(f60x(p.snap ?? TOGGLE.snap60, fps)) : p.at + Math.round(Math.max(2, f60x(p.frames ?? TOGGLE.inPlace60, fps)) * TOGGLE.swap);
  return { click: p.at, swap };
};

/** Draws the toggle at its natural size (`w` wide, 0.56 w tall), inline. */
export const Toggle: React.FC<ToggleProps & { frame: number; w: number; track: string; trackOn: string; knob: string; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const s = toggleState(props.frame, props, film);
  const h = props.w * 0.56;
  const pad = h * 0.12;
  const k = h - 2 * pad;
  const travel = props.w - k - 2 * pad;
  const knob = (x: number, o: number, key: string) => (
    <div key={key} style={{ position: 'absolute', top: pad, left: 0, width: k, height: k, borderRadius: '50%', background: props.knob, opacity: o, transform: `translateX(${(pad + x * travel).toFixed(2)}px)`, boxShadow: '0 2px 6px rgba(0,0,0,0.28)' }} />
  );
  const spring = (props.mode ?? 'spring') === 'spring';
  return (
    <div style={{ position: 'relative', width: props.w, height: h, borderRadius: h / 2, background: s.on ? props.trackOn : props.track, ...props.style }}>
      {spring ? knob(s.knob, 1, 'k') : [knob(0, s.knobLeft, 'l'), knob(1, s.knobRight, 'r')]}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- Ripple

/** House numbers: px at 1080p, frames at 60 fps. */
export const RIPPLE = { dot: 18, bloom60: 2, rings: 1, every60: 10, ring60: 12, from: 10, to: 40, alpha: 0.85, step: 0.6, tint60: 6, tint: 0.14, stroke: 2 } as const;

export type RippleProps = {
  at: number; // the click
  rings?: number; // rings launched (house 1; 3 for a pill)
  every?: number; // 60 fps frames between rings (house 10)
  frames?: number; // 60 fps frames per ring (house 12)
  from?: number; // ring radius at launch and at the end, px at 1080p (house 10 -> 40); for a pill the growth past its edge
  to?: number;
  dot?: false | { size?: number }; // the bloom dot (house 18 px)
  tint?: false | { frames?: number; opacity?: number }; // the area tint (house 6 f to 0.14, then held)
  id?: string;
};

export type RippleState = { dot: { r: number; opacity: number } | null; rings: { grow: number; opacity: number }[]; tint: number };

/** The dot, each ring's growth (px past its base shape) and opacity, and the area tint at frame f. Pure. */
export const rippleState = (frame: number, p: RippleProps, film?: Partial<FilmCtx>): RippleState => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const t = frame - p.at;
  if (t < 0) return { dot: null, rings: [], tint: 0 };
  let dot: RippleState['dot'] = null;
  if (p.dot !== false) {
    const bloom = Math.max(1, f60x(RIPPLE.bloom60, fps));
    const life = f60x(RIPPLE.ring60, fps);
    const r = ((p.dot?.size ?? RIPPLE.dot) * u) / 2;
    if (t < life + bloom) dot = { r: r * E.snapOut(clamp(t / bloom)), opacity: 1 - clamp((t - bloom) / Math.max(1, life)) };
  }
  const rings: RippleState['rings'] = [];
  const n = p.rings ?? RIPPLE.rings;
  const rf = Math.max(1, f60x(p.frames ?? RIPPLE.ring60, fps));
  for (let i = 0; i < n; i++) {
    const k = clamp((t - i * f60x(p.every ?? RIPPLE.every60, fps)) / rf);
    if (k <= 0 || k >= 1) continue;
    rings.push({ grow: mix((p.from ?? RIPPLE.from) * u, (p.to ?? RIPPLE.to) * u, E.snapOut(k)), opacity: RIPPLE.alpha * RIPPLE.step ** i * (1 - k) });
  }
  const tint = p.tint === false ? 0 : (p.tint?.opacity ?? RIPPLE.tint) * E.snapOut(clamp(t / Math.max(1, f60x(p.tint?.frames ?? RIPPLE.tint60, fps))));
  return { dot, rings, tint };
};

/**
 * Draws the ripple. `shape` is the clicked control (a box, px): rings follow its outline (a stadium for a
 * pill), or a circle around (x, y) when it is left out. The tint fills the control's box.
 */
export const Ripple: React.FC<RippleProps & { frame: number; x: number; y: number; color: string; shape?: { w: number; h: number; r?: number } }> = (props) => {
  const film = useFilm();
  const s = rippleState(props.frame, props, film);
  const u = uOf(film);
  const sh = props.shape;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translate(${props.x}px, ${props.y}px)`, pointerEvents: 'none' }} aria-hidden>
      {sh && s.tint > 0 && <div style={{ position: 'absolute', left: -sh.w / 2, top: -sh.h / 2, width: sh.w, height: sh.h, borderRadius: sh.r ?? sh.h / 2, background: props.color, opacity: s.tint }} />}
      {s.rings.map((g, i) => {
        const w = (sh?.w ?? 0) + 2 * g.grow;
        const h = (sh?.h ?? 0) + 2 * g.grow;
        const r = sh ? (sh.r ?? sh.h / 2) + g.grow : g.grow;
        return <div key={i} style={{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, borderRadius: r, border: `${RIPPLE.stroke * u}px solid ${props.color}`, opacity: g.opacity, boxSizing: 'border-box' }} />;
      })}
      {s.dot && s.dot.r > 0 && <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(-s.dot.r).toFixed(2)}px, ${(-s.dot.r).toFixed(2)}px)`, width: 2 * s.dot.r, height: 2 * s.dot.r, borderRadius: '50%', background: props.color, opacity: s.dot.opacity }} />}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- ThinkingDots

/** House numbers: frames at 60 fps. */
export const THINKING = { up60: 20, down60: 20, stagger60: 25, grow: 1.4, low: 0.35, ellipsis60: [14, 7] as [number, number] } as const;

export type ThinkingProps = {
  start: number;
  n?: number; // dots (house 3)
  up?: number; // 60 fps frames
  down?: number;
  stagger?: number;
  ellipsis?: boolean; // the dots arrive one by one first (house gaps 14, then 7 f)
  id?: string;
};

/** How many dots show (ellipsis) and each dot's scale and ink (low .. 1) at frame f. Pure. */
export const thinkingState = (frame: number, p: ThinkingProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const n = p.n ?? 3;
  const up = f60x(p.up ?? THINKING.up60, fps);
  const dn = f60x(p.down ?? THINKING.down60, fps);
  const st = f60x(p.stagger ?? THINKING.stagger60, fps);
  const period = Math.max(up + dn, n * st);
  const F = fd(frame);
  let shown = F >= p.start ? n : 0;
  if (p.ellipsis) {
    const [g0, g1] = THINKING.ellipsis60;
    shown = 0;
    let t = p.start;
    for (let i = 0; i < n; i++) {
      if (F >= Math.round(t)) shown = i + 1;
      t += f60x(i === 0 ? g0 : g1, fps);
    }
  }
  const dots = Array.from({ length: n }, (_, i) => {
    const local = ((((frame - p.start - i * st) % period) + period) % period);
    const k = local < up ? E.stdInOut(local / up) : local < up + dn ? 1 - E.stdInOut((local - up) / dn) : 0;
    return { visible: i < shown, scale: mix(1, THINKING.grow, k), ink: mix(THINKING.low, 1, k) };
  });
  return { shown, dots };
};

/** Draws the dots inline (a row), `size` px each, `gap` between. */
export const ThinkingDots: React.FC<ThinkingProps & { frame: number; size: number; gap?: number; color: string }> = (props) => {
  const film = useFilm();
  const s = thinkingState(props.frame, props, film);
  const g = props.gap ?? props.size * 0.8;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: g, height: props.size * THINKING.grow }}>
      {s.dots.map((d, i) => (
        <div key={i} style={{ width: props.size, height: props.size, borderRadius: '50%', background: props.color, opacity: d.visible ? d.ink : 0, transform: `scale(${d.scale.toFixed(4)})` }} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- TickGauge

/** House numbers: px at 1080p, frames at 60 fps. */
export const TICK_GAUGE = { n: 32, w: 3, h: 25, gap: 3, perTick60: 1 } as const;

export type TickGaugeProps = {
  value: number; // 0..1, the filled share
  from?: number; // the share before the fill starts (house 0)
  at?: number; // the fill starts (left out: static at `value`)
  n?: number;
  perTick?: number; // 60 fps frames per tick of fill (house 1)
  id?: string;
};

/** How many ticks are filled at frame f (whole ticks, one per `perTick` frames from `at`). Pure. */
export const tickGaugeState = (frame: number, p: TickGaugeProps, film?: Partial<FilmCtx>) => {
  const n = p.n ?? TICK_GAUGE.n;
  const target = Math.round(clamp(p.value) * n);
  if (p.at === undefined) return { n, filled: target };
  const start = Math.round(clamp(p.from ?? 0) * n);
  const per = Math.max(1e-6, f60x(p.perTick ?? TICK_GAUGE.perTick60, fpsOf(film)));
  const k = fd(frame) < p.at ? 0 : Math.floor((fd(frame) - p.at) / per + 1e-9) + 1;
  return { n, filled: target >= start ? Math.min(target, start + k) : Math.max(target, start - k) };
};

/** Draws the gauge inline: thin rounded ticks, filled in `on`, the rest in `off`. */
export const TickGauge: React.FC<TickGaugeProps & { frame: number; on: string; off: string; w?: number; h?: number; gap?: number }> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const s = tickGaugeState(props.frame, props, film);
  const w = (props.w ?? TICK_GAUGE.w) * u;
  const h = (props.h ?? TICK_GAUGE.h) * u;
  const g = (props.gap ?? TICK_GAUGE.gap) * u;
  return (
    <div style={{ display: 'inline-flex', gap: g, height: h }} aria-hidden>
      {Array.from({ length: s.n }, (_, i) => (
        <div key={i} style={{ width: w, height: h, borderRadius: w / 2, background: i < s.filled ? props.on : props.off }} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- EntryFlash

/** House numbers: frames at 60 fps. */
export const ENTRY_FLASH = { hold60: 10, decay60: 5 } as const;

export type EntryFlashProps = {
  at: number; // the element's first frame
  mode?: 'step' | 'decay'; // step: hold then drop in one frame (house); decay: 1 -> 0 linearly
  hold?: number; // step: 60 fps frames at full (house 10)
  decay?: number; // decay: 60 fps frames (house 5: the accent-flash tile)
  peak?: number; // overlay opacity at its strongest (house 1)
  id?: string;
};

/** The overlay's opacity at frame f. Pure; the step mode decides on whole frames. */
export const entryFlashState = (frame: number, p: EntryFlashProps, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  const F = fd(frame);
  if (F < p.at) return 0;
  const peak = p.peak ?? 1;
  if ((p.mode ?? 'step') === 'step') return F < p.at + Math.max(1, Math.round(f60x(p.hold ?? ENTRY_FLASH.hold60, fps))) ? peak : 0;
  const d = Math.max(1, f60x(p.decay ?? ENTRY_FLASH.decay60, fps));
  return F === p.at ? peak : peak * Math.max(0, 1 - (frame - p.at) / d);
};

/** A full-size overlay over its parent box (place it inside the arriving element). */
export const EntryFlash: React.FC<EntryFlashProps & { frame: number; color: string; radius?: number }> = (props) => {
  const film = useFilm();
  const o = entryFlashState(props.frame, props, film);
  if (o <= 0.001) return null;
  return <div style={{ position: 'absolute', inset: 0, borderRadius: props.radius, background: props.color, opacity: o, pointerEvents: 'none' }} />;
};

// ---------------------------------------------------------------------------------------------- hoverPulse

/** Rim scale for a hover on contact at `at`: +7.8 % in 2 f, back over 4 f at 30 fps (12 f at 60). */
export const hoverPulse = (frame: number, at: number, film?: Partial<FilmCtx>, amount = 0.078): number => 1 + amount * hitPulse(frame - at, 4, 2.6, fpsOf(film));

// ---------------------------------------------------------------------------------------------- declares

/** Check pops cut on (one stepped frame each); an in-place toggle swaps in one frame; a stepped entry flash is a flash. */
export const declares = (
  p?: { checks?: Partial<CheckPopProps>[]; toggle?: Partial<ToggleProps>; flash?: Partial<EntryFlashProps>[] },
  film?: Partial<FilmCtx>,
): Declares => {
  const stepped: SteppedRange[] = [];
  const flashes: Flash[] = [];
  (p?.checks ?? []).forEach((c, i) => c.at !== undefined && stepped.push({ from: c.at, to: c.at + 1, id: `${c.id ?? 'check'}-${i}` }));
  if (p?.toggle?.at !== undefined && p.toggle.mode === 'inPlace') {
    const s = toggleFrames(p.toggle as ToggleProps, film).swap;
    stepped.push({ from: s, to: s + 1, id: p.toggle.id ?? 'toggle' });
  }
  (p?.flash ?? []).forEach((e, i) => {
    if (e.at === undefined) return;
    if ((e.mode ?? 'step') === 'step') {
      const hold = Math.max(1, Math.round(f60x(e.hold ?? ENTRY_FLASH.hold60, fpsOf(film))));
      if (hold <= 2) flashes.push({ f: e.at, frames: hold as 1 | 2, id: `${e.id ?? 'entryFlash'}-${i}` });
      else stepped.push({ from: e.at, to: e.at + hold + 1, id: `${e.id ?? 'entryFlash'}-${i}` });
    } else flashes.push({ f: e.at, frames: 1, id: `${e.id ?? 'entryFlash'}-${i}` });
  });
  return { stepped, flashes, cameraBlur: [], seams: [] };
};

/** A pop with no spring: from 62 % to full size in 2 f at 60 fps, linear, no overshoot (an accent pill landing on a cut). */
export const POP = { from: 0.62, frames60: 2 } as const;
/** The pop's scale at frame f (1 before `at`'s first frame is drawn is the caller's choice: it shows from `at`). Pure. */
export const popScale = (frame: number, at: number, o: { from?: number; frames?: number } = {}, film?: Partial<FilmCtx>) =>
  mix(o.from ?? POP.from, 1, clamp((frame - at) / Math.max(1, f60x(o.frames ?? POP.frames60, fpsOf(film)))));

/**
 * A click that swells instead of pressing down: the button grows to `to` (house x1.38) in 6 f at 60 fps, walks its
 * fill through `stops` (the brand's colours, ending on the held one) while it holds 18 f, then settles back in 6 f.
 * The cursor squashes on the same frame (Cursor pressDepth 0.2). Pure: scale, fill and progress at frame f.
 */
export const SWELL = { to: 1.38, in60: 6, hold60: 18, out60: 6 } as const;
export type SwellProps = { at: number; stops: string[]; to?: number; in?: number; hold?: number; out?: number };
export const swellState = (frame: number, p: SwellProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const a = f60x(p.in ?? SWELL.in60, fps);
  const h = f60x(p.hold ?? SWELL.hold60, fps);
  const o = f60x(p.out ?? SWELL.out60, fps);
  const t = frame - p.at;
  const up = E.snapOut(clamp(t / Math.max(1, a)));
  const down = E.stdInOut(clamp((t - a - h) / Math.max(1, o)));
  const scale = t < 0 ? 1 : mix(1, p.to ?? SWELL.to, up * (1 - down));
  // the walk: across the stops over the swell and the hold, back to the first on the way down
  const walk = clamp(t / Math.max(1, a + h * 0.6));
  const n = Math.max(1, p.stops.length - 1);
  const seg = Math.min(n - 1, Math.floor(walk * n));
  const walked = p.stops.length > 1 ? mixColor(p.stops[seg], p.stops[seg + 1], E.stdInOut(clamp(walk * n - seg))) : p.stops[0];
  const fill = t < 0 ? p.stops[0] : down > 0 ? mixColor(walked, p.stops[0], down) : walked;
  return { scale, fill, t: clamp(t / Math.max(1, a + h + o)), on: t >= 0 && t < a + h + o };
};
