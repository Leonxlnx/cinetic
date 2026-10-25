import React, { useId, useMemo } from 'react';
import { C, FONT, MASK } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';
import { COOL_SPECTRUM, ditherPlate, type Stop } from './plates';

/**
 * TypeFill: type filled by a moving material. The glyphs are a clip (SVG text) over a baked, dithered plate
 * (fx/plates.ts) that moves by transform only, or per-word and per-letter colour states. Modes:
 *
 *   band     one plate `span` text widths long slides through the line: a tint wave with shoulders derived
 *            from the ink (tintBand: a deep shade on dark type, a pale tint on light type), or a spectral run
 *            that leaves ink behind it (spectralInk); house 48 f at 60 fps on E.stdInOut
 *   shimmer  a soft band (6 letters wide, 2.5 letters of feather each side) crosses a status line once a
 *            period (40 f) and restarts at once: white on a dark ground, a darker band on a light one
 *   develop  the line develops through several fronts, each slower than the one before: the first reveals
 *            behind a feathered head (5 letters), later fronts recolour, the last (the ink) eases out and
 *            stalls at 85 % of the line before the end catches up (house 44, 72, 120, 260 f)
 *   window   the whole line flashes the accent (18 f), the colour narrows to a window that steps word by word
 *            (8 f) and parks on the keyword; `then` types on after it, each letter born hot, cooling in 24 f
 *   swap     letters leave the plate one by one (4 f apart), blink out for a gap (4 f) and return solid
 *   fill     the phrase grows 27 % (58 f, E.settleOut) while its fill turns from solid to the plate in the
 *            first 24 f, a deeper glow copy at one fixed blur behind it; `grow` 0 and a `vertical` plate give
 *            static bevelled metal numerals
 *
 * The default spectral run is the cool side of the wheel (lime, green, teal, cyan, blue): no orange or violet
 * unless a brand passes them (plates.ts FULL_SPECTRUM). Pure state: typeFillState(f); <TypeFill> measures the
 * line (call it under FontGate). declares() lists the stepped window and the swap dropouts.
 */

export const TYPE_FILL = {
  span: 3,
  band60: 48,
  shimmer: { period60: 40, width: 6, feather: 2.5 },
  develop: { head: 5, durs60: [44, 72, 120, 260], stall: 0.85 },
  window: { flash60: 18, step60: 8, pause60: 10, char60: 2, cool60: 24 },
  swap: { stagger60: 4, gap60: 4 },
  fill: { dur60: 58, shift60: 24, grow: 0.27, glowBlur: 20, glowOpacity: 0.5 },
} as const;

export type TypeFillMode = 'band' | 'shimmer' | 'develop' | 'window' | 'swap' | 'fill';
export type DevelopFront = { color: string; dur?: number; ease?: Ease; stall?: number };

export type TypeFillProps = {
  mode: TypeFillMode;
  at: number;
  text: string;
  dur?: number; // 60 fps frames: band (48), fill (58)
  ease?: Ease; // band (E.stdInOut), fill growth (E.settleOut)
  from?: number; // band: plate window position at the start (1 = the plate's right third shows)
  to?: number; // band: at the end (0 = the left third)
  span?: number; // band: plate length in text widths (3)
  stops?: readonly (Stop | string)[]; // band, swap, fill: the plate, left to right
  period?: number; // shimmer: 60 fps frames per pass (40)
  passes?: number; // shimmer: how many (Infinity)
  width?: number; // shimmer: band width in letters (6)
  feather?: number; // shimmer: feather each side in letters (2.5); develop: head feather (5)
  fronts?: DevelopFront[]; // develop: in order (reveal first, ink last)
  park?: number; // window: the word index it parks on (the last word)
  step?: number; // window: 60 fps frames per word (8)
  flash?: number; // window: whole-line flash (18)
  then?: string; // window: text that types on after the park
  stagger?: number; // swap: 60 fps frames between letters (4)
  gap?: number; // swap: dropout length (4)
  grow?: number; // fill: growth share (0.27; 0 = static type, e.g. small metal numerals)
  vertical?: boolean; // swap, fill: the plate runs top to bottom (a bevelled metal: light, mid, dark, light)
  id?: string;
};

export type TypeFillState = {
  mode: TypeFillMode;
  pos: number; // band: plate window position (0..1); fill: plate share (0..1)
  phase: number; // shimmer: 0..1 across the line, -1 off
  fronts: number[]; // develop: head of each front as a share of the line (0..1)
  wordHeat: number[]; // window: accent amount per word (0..1)
  typed: number; // window: letters of `then` on
  thenHeat: number[]; // window: accent amount per typed letter
  letters: ('plate' | 'gap' | 'solid')[]; // swap
  scale: number; // fill
};

const words = (t: string) => t.split(' ');
const swapGaps = (p: TypeFillProps, fps: number) => ({ st: f60x(p.stagger ?? TYPE_FILL.swap.stagger60, fps), gap: Math.max(1, Math.round(f60x(p.gap ?? TYPE_FILL.swap.gap60, fps))) });

/** Ink front: power-out to the stall, a slow creep, then the end catches up. */
const stallCurve = (u: number, stall: number) => (u < 0.55 ? stall * (1 - (1 - u / 0.55) ** 2.1) : u < 0.8 ? stall + 0.03 * ((u - 0.55) / 0.25) : stall + 0.03 + (1 - stall - 0.03) * E.glideOut((u - 0.8) / 0.2));

// cinetic:device-palette the develop fronts' cool neighbour of the accent
/** Default develop fronts: a pale reveal, a light tint, the accent's cool neighbour, the accent, the ink. */
export const developFronts = (ink: string = C.ink, accent: string = C.accent): DevelopFront[] => [
  { color: mixColor(accent, '#FFFFFF', 0.72), dur: TYPE_FILL.develop.durs60[0] },
  { color: mixColor('#2DB4D6', '#FFFFFF', 0.25), dur: TYPE_FILL.develop.durs60[1] },
  { color: accent, dur: TYPE_FILL.develop.durs60[2] },
  { color: ink, dur: TYPE_FILL.develop.durs60[3], stall: TYPE_FILL.develop.stall },
];

/** The state of the fill at frame f. Pure. */
export const typeFillState = (frame: number, p: TypeFillProps, film?: Partial<FilmCtx>): TypeFillState => {
  const fps = fpsOf(film);
  const t = frame - p.at;
  const n = [...p.text].length;
  const base: TypeFillState = { mode: p.mode, pos: 0, phase: -1, fronts: [], wordHeat: [], typed: 0, thenHeat: [], letters: [], scale: 1 };
  if (p.mode === 'band') {
    const d = Math.max(1, f60x(p.dur ?? TYPE_FILL.band60, fps));
    const k = (p.ease ?? E.stdInOut)(clamp(t / d));
    const a = p.from ?? 1;
    return { ...base, pos: a + ((p.to ?? 0) - a) * k };
  }
  if (p.mode === 'shimmer') {
    const per = Math.max(1, f60x(p.period ?? TYPE_FILL.shimmer.period60, fps));
    const i = Math.floor(t / per);
    if (t < 0 || i >= (p.passes ?? Infinity)) return base;
    return { ...base, phase: (t - i * per) / per };
  }
  if (p.mode === 'develop') {
    const fr = p.fronts ?? developFronts();
    return {
      ...base,
      fronts: fr.map((q) => {
        const u = clamp(t / Math.max(1, f60x(q.dur ?? 60, fps)));
        return q.stall !== undefined ? stallCurve(u, q.stall) : (q.ease ?? E.softOut)(u);
      }),
    };
  }
  if (p.mode === 'window') {
    const W = words(p.text);
    const park = Math.min(W.length - 1, p.park ?? W.length - 1);
    const flash = f60x(p.flash ?? TYPE_FILL.window.flash60, fps);
    const step = f60x(p.step ?? TYPE_FILL.window.step60, fps);
    const parkAt = flash + park * step;
    let heat: number[];
    if (t < 0) heat = W.map(() => 0);
    else if (t < flash) heat = W.map(() => 1);
    else {
      const idx = Math.min(park, Math.floor((t - flash) / step));
      heat = W.map((_, i) => (i === idx ? 1 : 0));
    }
    const then = [...(p.then ?? '')];
    const t0 = parkAt + f60x(TYPE_FILL.window.pause60, fps);
    const per = f60x(TYPE_FILL.window.char60, fps);
    const cool = f60x(TYPE_FILL.window.cool60, fps);
    const typed = t < t0 ? 0 : Math.min(then.length, Math.floor((t - t0) / per) + 1);
    return { ...base, wordHeat: heat, typed, thenHeat: then.slice(0, typed).map((_, i) => 1 - E.linear(clamp((t - (t0 + i * per)) / cool))) };
  }
  if (p.mode === 'swap') {
    const { st, gap } = swapGaps(p, fps);
    return {
      ...base,
      letters: Array.from({ length: n }, (_, i) => {
        const off = Math.round(i * st);
        return t < off ? 'plate' : t < off + gap ? 'gap' : 'solid';
      }),
    };
  }
  const d = Math.max(1, f60x(p.dur ?? TYPE_FILL.fill.dur60, fps));
  const sh = Math.max(1, f60x(TYPE_FILL.fill.shift60, fps));
  return { ...base, pos: E.softOut(clamp(t / sh)), scale: 1 + (p.grow ?? TYPE_FILL.fill.grow) * (p.ease ?? E.settleOut)(clamp(t / d)) };
};

/**
 * Sync cues: start and end; band: the frame the plate's centre crosses each share of the line in `centres`
 * (word centres: put a tick on each); window: each step and the park; swap: each dropout.
 */
export const typeFillFrames = (p: TypeFillProps, film?: Partial<FilmCtx>, centres: number[] = []) => {
  const fps = fpsOf(film);
  if (p.mode === 'band') {
    const d = f60x(p.dur ?? TYPE_FILL.band60, fps);
    const span = p.span ?? TYPE_FILL.span;
    const a = p.from ?? 1;
    const b = p.to ?? 0;
    const ease = p.ease ?? E.stdInOut;
    // the plate's centre (u = .5) sits at line share c when pos = (span / 2 - c) / (span - 1)
    const cross = centres.map((c) => {
      const want = (span / 2 - c) / (span - 1);
      const k = (want - a) / (b - a || 1);
      if (k < 0 || k > 1) return -1;
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 30; i++) {
        const m = (lo + hi) / 2;
        if (ease(m) < k) lo = m;
        else hi = m;
      }
      return Math.round(p.at + lo * d);
    });
    return { start: p.at, end: Math.ceil(p.at + d), cross };
  }
  if (p.mode === 'window') {
    const W = words(p.text);
    const park = Math.min(W.length - 1, p.park ?? W.length - 1);
    const flash = f60x(p.flash ?? TYPE_FILL.window.flash60, fps);
    const step = f60x(p.step ?? TYPE_FILL.window.step60, fps);
    const steps = Array.from({ length: park + 1 }, (_, i) => Math.round(p.at + flash + i * step));
    const t0 = p.at + flash + park * step + f60x(TYPE_FILL.window.pause60, fps);
    return { start: p.at, steps, park: steps[steps.length - 1], typeFrom: Math.round(t0), end: Math.ceil(t0 + [...(p.then ?? '')].length * f60x(TYPE_FILL.window.char60, fps) + f60x(TYPE_FILL.window.cool60, fps)) };
  }
  if (p.mode === 'swap') {
    const { st, gap } = swapGaps(p, fps);
    const n = [...p.text].length;
    const drops = Array.from({ length: n }, (_, i) => p.at + Math.round(i * st));
    return { start: p.at, drops, end: drops[n - 1] + gap };
  }
  if (p.mode === 'develop') {
    const fr = p.fronts ?? developFronts();
    return { start: p.at, end: Math.ceil(p.at + Math.max(...fr.map((q) => f60x(q.dur ?? 60, fps)))) };
  }
  if (p.mode === 'shimmer') {
    const per = f60x(p.period ?? TYPE_FILL.shimmer.period60, fps);
    const k = Math.min(p.passes ?? 8, 64);
    return { start: p.at, passes: Array.from({ length: k }, (_, i) => Math.round(p.at + i * per)), end: Math.ceil(p.at + k * per) };
  }
  return { start: p.at, end: Math.ceil(p.at + f60x(p.dur ?? TYPE_FILL.fill.dur60, fps)) };
};

/** A tint wave plate: ink, a shoulder (the accent mixed half toward the ink), the accent core, shoulder, ink. */
export const tintBand = (ink: string = C.ink, accent: string = C.accent): Stop[] => {
  const sh = mixColor(accent, ink, 0.5);
  return [
    { at: 0, color: ink },
    { at: 0.4, color: ink },
    { at: 0.45, color: sh },
    { at: 0.5, color: accent },
    { at: 0.56, color: accent },
    { at: 0.61, color: sh },
    { at: 0.66, color: ink },
    { at: 1, color: ink },
  ];
};

/** A spectral run that leaves ink: the plate's left part is ink, its right part the spectrum (from = 1, to = 0). */
export const spectralInk = (ink: string = C.ink, spectrum: readonly string[] = COOL_SPECTRUM): Stop[] => {
  const s = [...spectrum].reverse(); // cool next to the ink, warm at the far end
  return [{ at: 0, color: ink }, { at: 0.34, color: ink }, ...s.map((c, i) => ({ at: 0.42 + (0.58 * i) / Math.max(1, s.length - 1), color: c }))];
};

type DrawProps = TypeFillProps & {
  frame: number;
  x: number;
  y: number; // top of the line box
  size: number;
  weight?: number;
  track?: number; // em
  color?: string; // the ink (band ink, shimmer base, window base, swap solid, fill solid)
  accent?: string;
  band?: string; // shimmer band colour (white on dark grounds)
  glow?: string; // fill: the glow copy's colour ('none': no glow)
  family?: string;
};

/** Draws the line at (x, y) (top left of its box). Measure-dependent: render under FontGate. */
export const TypeFill: React.FC<DrawProps> = (props) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const s = typeFillState(props.frame, props, film);
  const weight = props.weight ?? 600;
  const track = props.track ?? -0.02;
  const family = props.family ?? FONT.text;
  const ink = props.color ?? C.ink;
  const accent = props.accent ?? C.accent;
  const chars = [...props.text];
  const W = measureTracked(props.text, props.size, weight, track, family);
  const xs = useMemo(() => chars.map((_, i) => measureTracked(chars.slice(0, i).join(''), props.size, weight, track, family)), [props.text, props.size, weight, track, family]);
  const H = props.size * 1.3;
  const base = props.size * 1.0;
  const letterW = W / Math.max(1, chars.length);
  const style: React.CSSProperties = { fontFamily: family, fontSize: props.size, fontWeight: weight, letterSpacing: `${track}em`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'pre' };
  const whole = (fill?: string, extra?: React.SVGProps<SVGTextElement>) => (
    <text x={0} y={base} style={style} fill={fill} {...extra}>
      {props.text}
    </text>
  );
  const letter = (i: number, fill?: string) => (
    <text key={i} x={xs[i]} y={base} style={style} fill={fill}>
      {chars[i]}
    </text>
  );
  const span = props.span ?? TYPE_FILL.span;
  // cinetic:device-palette the fill's default stops: a pale accent, the accent and its cool neighbour
  const stops = props.stops ?? (props.mode === 'band' ? tintBand(ink, accent) : [mixColor(accent, '#FFFFFF', 0.35), accent, '#2DB4D6']);
  const plateW = props.mode === 'band' ? span * W : W;
  const plate = useMemo(() => (props.mode === 'band' || props.mode === 'swap' || props.mode === 'fill' ? ditherPlate(stops, plateW, H, { vertical: props.vertical && props.mode !== 'band' }) : ''), [JSON.stringify(stops), plateW, H, props.mode, props.vertical]);
  const fea = (props.feather ?? (props.mode === 'shimmer' ? TYPE_FILL.shimmer.feather : TYPE_FILL.develop.head)) * letterW;
  const bw = (props.width ?? TYPE_FILL.shimmer.width) * letterW;
  const alpha = useMemo(() => {
    if (props.mode === 'shimmer') {
      const tot = bw + 2 * fea;
      return ditherPlate([{ at: 0, color: MASK }, { at: fea / tot, color: C.white }, { at: (fea + bw) / tot, color: C.white }, { at: 1, color: MASK }], tot, H);
    }
    if (props.mode === 'develop') return ditherPlate([{ at: 0, color: C.white }, { at: W / (W + fea), color: C.white }, { at: 1, color: MASK }], W + fea, H);
    return '';
  }, [props.mode, bw, fea, W, H]);

  let body: React.ReactNode = null;
  const clip = `tf${uid}`;
  if (props.mode === 'band') {
    body = (
      <>
        <defs>
          <clipPath id={clip}>{whole()}</clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <image href={plate} x={0} y={0} width={plateW} height={H} preserveAspectRatio="none" transform={`translate(${(-(span - 1) * W * s.pos).toFixed(2)} 0)`} />
        </g>
      </>
    );
  } else if (props.mode === 'shimmer') {
    const tot = bw + 2 * fea;
    const tx = s.phase < 0 ? null : -tot + (W + tot) * s.phase;
    body = (
      <>
        {whole(ink)}
        {tx !== null ? (
          <>
            <defs>
              <clipPath id={clip}>{whole()}</clipPath>
              <mask id={`${clip}m`} maskUnits="userSpaceOnUse" x={-tot} y={0} width={W + 2 * tot} height={H}>
                <image href={alpha} x={0} y={0} width={tot} height={H} preserveAspectRatio="none" transform={`translate(${tx.toFixed(2)} 0)`} />
              </mask>
            </defs>
            <g clipPath={`url(#${clip})`} mask={`url(#${clip}m)`}>
              <rect x={0} y={0} width={W} height={H} fill={props.band ?? C.white} />
            </g>
          </>
        ) : null}
      </>
    );
  } else if (props.mode === 'develop') {
    const fr = props.fronts ?? developFronts(ink, accent);
    body = (
      <>
        <defs>
          <clipPath id={clip}>{whole()}</clipPath>
          {fr.map((_, k) => (
            <mask key={k} id={`${clip}d${k}`} maskUnits="userSpaceOnUse" x={-W - fea} y={0} width={3 * W + 2 * fea} height={H}>
              <image href={alpha} x={0} y={0} width={W + fea} height={H} preserveAspectRatio="none" transform={`translate(${(-W - fea + (W + fea) * (s.fronts[k] ?? 0)).toFixed(2)} 0)`} />
            </mask>
          ))}
        </defs>
        {fr.map((q, k) => (
          <g key={k} clipPath={`url(#${clip})`} mask={`url(#${clip}d${k})`}>
            <rect x={0} y={0} width={W} height={H} fill={q.color} />
          </g>
        ))}
      </>
    );
  } else if (props.mode === 'window') {
    const W0 = words(props.text);
    let li = 0;
    const out: React.ReactNode[] = [];
    W0.forEach((w, wi) => {
      for (const ch of [...w]) {
        out.push(
          <text key={`w${li}`} x={xs[li]} y={base} style={style} fill={mixColor(ink, accent, s.wordHeat[wi] ?? 0)}>
            {ch}
          </text>,
        );
        li++;
      }
      li++; // the space
    });
    const then = [...(props.then ?? '')];
    const tx = W + measureTracked(' ', props.size, weight, track, family);
    for (let i = 0; i < s.typed; i++) {
      out.push(
        <text key={`t${i}`} x={tx + measureTracked(then.slice(0, i).join(''), props.size, weight, track, family)} y={base} style={style} fill={mixColor(ink, accent, s.thenHeat[i] ?? 0)}>
          {then[i]}
        </text>,
      );
    }
    body = <>{out}</>;
  } else if (props.mode === 'swap') {
    const onPlate = chars.map((_, i) => i).filter((i) => s.letters[i] === 'plate');
    body = (
      <>
        <defs>
          <clipPath id={clip}>{onPlate.map((i) => letter(i))}</clipPath>
        </defs>
        {onPlate.length ? (
          <g clipPath={`url(#${clip})`}>
            <image href={plate} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
          </g>
        ) : null}
        {chars.map((_, i) => (s.letters[i] === 'solid' ? letter(i, ink) : null))}
      </>
    );
  } else {
    const glow = props.glow ?? mixColor(accent, C.ink, 0.25);
    body = (
      <>
        <defs>
          <clipPath id={clip}>{whole()}</clipPath>
        </defs>
        {props.glow === 'none' ? null : whole(glow, { opacity: TYPE_FILL.fill.glowOpacity * s.pos, style: { ...style, filter: `blur(${TYPE_FILL.fill.glowBlur * (props.size / 200)}px)` } })}
        {s.pos < 1 ? whole(ink, { opacity: 1 - s.pos }) : null}
        <g clipPath={`url(#${clip})`} opacity={s.pos}>
          <image href={plate} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
        </g>
      </>
    );
  }
  const ox = props.mode === 'fill' ? (W * (s.scale - 1)) / 2 : 0;
  return (
    <svg
      width={W + (props.mode === 'window' ? measureTracked(` ${props.then ?? ''}`, props.size, weight, track, family) : 0)}
      height={H}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translate(${(props.x - ox).toFixed(2)}px, ${(props.y - (H * (s.scale - 1)) / 2).toFixed(2)}px) scale(${s.scale.toFixed(4)})`, transformOrigin: '0 0' }}
      aria-hidden
    >
      {body}
    </svg>
  );
};

/** The window steps and the swap dropouts are stepped (designed cuts of colour); the rest is continuous. */
export const declares = (p?: Partial<TypeFillProps>, film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || p.at === undefined || p.text === undefined || (p.mode !== 'window' && p.mode !== 'swap')) return none;
  const fr = typeFillFrames(p as TypeFillProps, film) as { start: number; end: number; park?: number };
  return { ...none, stepped: [{ from: p.at, to: (p.mode === 'window' ? (fr.park ?? fr.end) : fr.end) + 1, id: p.id ?? `typefill-${p.mode}` }] };
};
