import React, { useId } from 'react';
import { C, FONT } from '../brand/tokens';
import { clamp, E, type Ease, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { baselineOf, measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';
import { bakePlate } from './Gradients';
import { COOL_SPECTRUM, normStops, type Stop } from './plates';

/**
 * TypeFx: per-letter and variable-weight text effects. Every state is a pure function of the frame; the
 * components lay letters out from measured advances (call them under FontGate) and move them by transform.
 *
 *   WeightWave      a weight bump (2.5 letters wide) travels the word on the variable axis, 300 -> 750 -> 300
 *                   (`pass`) or leaving the heavy weight behind it (`fill`); the line reflows with the weights
 *   OutlineFill     letters drawn as outlines fill from the baseline one after another (10 f each, 3 f apart),
 *                   or empty back to outlines; order ltr, rtl, centre or random
 *   FontCycle       one word shuffles through font styles every 7.5 f at 60 fps (regular, black, thin wide-
 *                   tracked, mono, black wide) while it steps larger, and lands on the brand style; each state
 *                   re-measured so the line re-centres on the state frame; no slant axis (no italics)
 *   SplitFlap       a split-flap board: each character flips through seeded characters (4 f a flap, 2 f stagger
 *                   per column) to its target; the upper flap falls on E.buildIn, the lower lands on E.snapOut
 *   CodeType        code types in plain ink at `cps`; each token's syntax colour switches on `late60` (10) frames
 *                   after the token is complete, and the newest characters arrive as a sideways smear trailing
 *                   back along the line that sharpens over 6 f (two copies, one through a fixed horizontal blur),
 *                   so the caret ahead of them stays a clean bar
 *   GradientText    type filled with a dithered multi-stop plate that drifts slowly, crossed by a soft
 *                   specular band once a period (the shine of a loading or premium label)
 *   ScatterAssemble letters start scattered (seeded, grey, almost still), drift in gently and snap into the
 *                   word on a 13 f expo-out, turning to ink as they land; `order` random makes each letter appear
 *                   faint at its own shuffled onset first
 *   ErodeRise       the old word erodes from its end, letter by letter through a fixed horizontal blur copy,
 *                   while the new word's letters rise into place behind it (20 f each, E.snapOut)
 *
 * declares(): FontCycle's states and CodeType's typing are stepped runs; the rest are continuous.
 */

export const TYPE_FX = {
  wave: { dur60: 48, from: 300, to: 750, width: 2.5 },
  outline: { stagger60: 3, dur60: 10, stroke: 0.022 },
  cycle: { every60: 7.5 },
  flap: { every60: 4, stagger60: 2, min: 4, extra: 4, charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' },
  code: { cps: 40, late60: 10, smear: { chars: 3, frames60: 6, sigma: 7 } },
  shine: { period60: 96, pass60: 40, width: 0.24, drift: 0.04 },
  scatter: { radius: 330, float60: 40, land60: 13, stagger60: 2 },
  erode: { every60: 3, frames60: 6, sigma: 10, riseDelay60: 6, rise60: 20, riseStagger60: 2 },
} as const;

const NONE: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
type Order = 'ltr' | 'rtl' | 'centre' | 'random';

/** Onset rank of each of n letters for an order (0 first). Pure. */
export const orderRanks = (n: number, order: Order = 'ltr', seed: string | number = 0): number[] => {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (order === 'rtl') return idx.map((i) => n - 1 - i);
  if (order === 'centre') {
    const c = (n - 1) / 2;
    const sorted = [...idx].sort((a, b) => Math.abs(a - c) - Math.abs(b - c) || a - b);
    return idx.map((i) => sorted.indexOf(i));
  }
  if (order === 'random') {
    const sorted = [...idx].sort((a, b) => rand(`${seed}:o:${a}`) - rand(`${seed}:o:${b}`));
    return idx.map((i) => sorted.indexOf(i));
  }
  return idx;
};

/** Left edges of each letter and the total width at per-letter weights (single-letter advances, weights rounded to 25). Browser only. */
export const letterXs = (text: string, size: number, weights: number | number[], track = 0, family: string = FONT.text) => {
  const chars = [...text];
  const xs: number[] = [];
  let x = 0;
  if (typeof weights === 'number') {
    chars.forEach((_, i) => xs.push(measureTracked(chars.slice(0, i).join(''), size, weights, track, family)));
    return { xs, width: measureTracked(text, size, weights, track, family) };
  }
  chars.forEach((ch, i) => {
    xs.push(x);
    x += measureTracked(ch, size, Math.round(weights[i] / 25) * 25, track, family);
  });
  return { xs, width: x };
};

// ---------------------------------------------------------------------------------------------------- weight wave
export type WeightWaveProps = { at: number; dur60?: number; from?: number; to?: number; width?: number; mode?: 'pass' | 'fill'; ease?: Ease };

/** Each letter's weight at frame f. Pure. */
export const weightWaveState = (f: number, n: number, p: WeightWaveProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const W = TYPE_FX.wave;
  const lo = p.from ?? W.from;
  const hi = p.to ?? W.to;
  const wd = p.width ?? W.width;
  const t = clamp((f - p.at) / f60x(p.dur60 ?? W.dur60, fps));
  const pos = -wd + (n - 1 + 2 * wd) * (p.ease ?? E.stdInOut)(t);
  return Array.from({ length: n }, (_, i) => {
    const d = Math.abs(i - pos) / wd;
    const b = d < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * d) : 0;
    const behind = p.mode === 'fill' && i < pos ? 1 : 0;
    return lo + (hi - lo) * Math.max(b, behind);
  });
};

type Line = { text: string; x: number; y: number; size: number; color?: string; family?: string; track?: number; align?: 'left' | 'center' };
const leftOf = (l: Line, width: number) => (l.align === 'center' ? l.x - width / 2 : l.x);

export const WeightWave: React.FC<WeightWaveProps & Line & { frame: number }> = (p) => {
  const film = useFilm();
  const chars = [...p.text];
  const ws = weightWaveState(p.frame, chars.length, p, film);
  const L = letterXs(p.text, p.size, ws, p.track ?? 0, p.family);
  const x0 = leftOf(p, L.width);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {chars.map((ch, i) => (
        <span key={i} style={{ position: 'absolute', left: x0 + L.xs[i], top: p.y, fontFamily: p.family ?? FONT.text, fontSize: p.size, lineHeight: 1, fontWeight: Math.round(ws[i] / 25) * 25, letterSpacing: `${p.track ?? 0}em`, color: p.color ?? C.ink, whiteSpace: 'pre' }}>
          {ch}
        </span>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- outline fill
export type OutlineFillProps = { at: number; stagger60?: number; dur60?: number; order?: Order; seed?: string | number; empty?: boolean; ease?: Ease };

/** Each letter's fill share at frame f (0 outline .. 1 solid; reversed when `empty`). Pure. */
export const outlineFillState = (f: number, n: number, p: OutlineFillProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const O = TYPE_FX.outline;
  const rk = orderRanks(n, p.order, p.seed);
  return rk.map((r) => {
    const k = (p.ease ?? E.snapOut)(clamp((f - p.at - f60x((p.stagger60 ?? O.stagger60) * r, fps)) / f60x(p.dur60 ?? O.dur60, fps)));
    return p.empty ? 1 - k : k;
  });
};

export const OutlineFill: React.FC<OutlineFillProps & Line & { frame: number; weight?: number }> = (p) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const w = p.weight ?? 700;
  const chars = [...p.text];
  const L = letterXs(p.text, p.size, w, p.track ?? 0, p.family);
  const fill = outlineFillState(p.frame, chars.length, p, film);
  const x0 = leftOf(p, L.width);
  const base = p.y + baselineOf(p.size, w, 1, p.family);
  const col = p.color ?? C.ink;
  const font = { fontFamily: p.family ?? FONT.text, fontSize: p.size, fontWeight: w, letterSpacing: `${p.track ?? 0}em` };
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        {chars.map((_, i) => (
          <clipPath key={i} id={`of${uid}${i}`}>
            <rect x={x0 + L.xs[i] - p.size} y={p.y + p.size * 1.1 * (1 - fill[i]) - p.size * 0.05} width={p.size * 3} height={p.size * 1.2} />
          </clipPath>
        ))}
      </defs>
      {chars.map((ch, i) => (
        <g key={i}>
          <text x={x0 + L.xs[i]} y={base} style={font} fill="none" stroke={col} strokeWidth={TYPE_FX.outline.stroke * p.size} xmlSpace="preserve">
            {ch}
          </text>
          {fill[i] > 0 ? (
            <text x={x0 + L.xs[i]} y={base} style={font} fill={col} clipPath={`url(#of${uid}${i})`} xmlSpace="preserve">
              {ch}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------- font cycle
export type FontState = { family?: string; wght: number; track?: number };
export const FONT_STATES: FontState[] = [
  { wght: 400, track: 0 },
  { wght: 900, track: -0.02 },
  { wght: 150, track: 0.16 },
  { family: FONT.mono, wght: 500, track: 0 },
  { wght: 900, track: 0.12 },
  { wght: 600, track: -0.01 },
];
export type FontCycleProps = { at: number; states?: FontState[]; every60?: number; scale?: [number, number]; id?: string };

/** The style index at frame f (the last state is the landing) and the size factor of that step. Pure. */
export const fontCycleState = (f: number, p: FontCycleProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const S = p.states ?? FONT_STATES;
  const k = clamp(Math.floor((f - p.at) / f60x(p.every60 ?? TYPE_FX.cycle.every60, fps)), 0, S.length - 1);
  const [a, b] = p.scale ?? [1, 1];
  return { index: k, state: S[k], scale: a + ((b - a) * k) / Math.max(1, S.length - 1), landed: k === S.length - 1 };
};

/** Sync: the state change frames (rounded up to whole frames) and the landing. */
export const fontCycleFrames = (p: FontCycleProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const S = p.states ?? FONT_STATES;
  const steps = S.slice(1).map((_, i) => Math.ceil(p.at + f60x((p.every60 ?? TYPE_FX.cycle.every60) * (i + 1), fps) - 1e-6));
  return { steps, land: steps[steps.length - 1] ?? p.at };
};

export const FontCycle: React.FC<FontCycleProps & Line & { frame: number }> = (p) => {
  const film = useFilm();
  const s = fontCycleState(p.frame, p, film);
  const fam = s.state.family ?? p.family ?? FONT.text;
  const size = p.size * s.scale;
  const w = measureTracked(p.text, size, s.state.wght, s.state.track ?? 0, fam);
  return (
    <div style={{ position: 'absolute', left: leftOf(p, w), top: p.y + (p.size - size) / 2, fontFamily: fam, fontSize: size, fontWeight: s.state.wght, letterSpacing: `${s.state.track ?? 0}em`, lineHeight: 1, color: p.color ?? C.ink, whiteSpace: 'pre' }}>{p.text}</div>
  );
};

// ---------------------------------------------------------------------------------------------------- split flap
export type SplitFlapProps = { at: number; target: string; from?: string; every60?: number; stagger60?: number; min?: number; extra?: number; charset?: string; seed?: string | number };

/** Each column's flap sequence (from -> seeded characters -> target). Pure. */
export const flapSequence = (i: number, p: SplitFlapProps): string[] => {
  const F = TYPE_FX.flap;
  const cs = p.charset ?? F.charset;
  const from = [...(p.from ?? '')][i] ?? ' ';
  const to = [...p.target][i] ?? ' ';
  const m = (p.min ?? F.min) + Math.floor(rand(`${p.seed ?? 0}:fl:${i}`) * ((p.extra ?? F.extra) + 1));
  const mid = Array.from({ length: m - 1 }, (_, j) => cs[Math.floor(rand(`${p.seed ?? 0}:fc:${i}:${j}`) * cs.length)]);
  return [from, ...mid, to];
};

/** Column i at frame f: the showing character, the next one and the flip phase (0..1), or done. Pure. */
export const splitFlapState = (f: number, i: number, p: SplitFlapProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const F = TYPE_FX.flap;
  const seq = flapSequence(i, p);
  const every = f60x(p.every60 ?? F.every60, fps);
  const t = (f - p.at - f60x((p.stagger60 ?? F.stagger60) * i, fps)) / every;
  if (t < 0) return { cur: seq[0], next: seq[0], phase: 0, done: false };
  const j = Math.floor(t);
  if (j >= seq.length - 1) return { cur: seq[seq.length - 1], next: seq[seq.length - 1], phase: 0, done: true };
  return { cur: seq[j], next: seq[j + 1], phase: t - j, done: false };
};

export const SplitFlap: React.FC<SplitFlapProps & { frame: number; x: number; y: number; size: number; tile?: string; ink?: string; family?: string; weight?: number }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const n = Math.max([...p.target].length, [...(p.from ?? '')].length);
  const cw = p.size * 0.66;
  const ch = p.size * 1.02;
  const gap = p.size * 0.06;
  const half = (c: string, lower: boolean, extra?: React.CSSProperties) => (
    <div style={{ position: 'absolute', left: 0, top: lower ? ch / 2 : 0, width: cw, height: ch / 2, overflow: 'hidden', background: p.tile ?? C.ink2, borderRadius: lower ? `0 0 ${4 * u}px ${4 * u}px` : `${4 * u}px ${4 * u}px 0 0`, ...extra }}>
      <div style={{ position: 'absolute', left: 0, top: lower ? -ch / 2 : 0, width: cw, height: ch, lineHeight: `${ch}px`, textAlign: 'center', fontFamily: p.family ?? FONT.mono, fontWeight: p.weight ?? 600, fontSize: p.size * 0.8, color: p.ink ?? C.paper }}>{c}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y }}>
      {Array.from({ length: n }, (_, i) => {
        const s = splitFlapState(p.frame, i, p, film);
        const top = s.phase < 0.5 ? -90 * E.buildIn(s.phase * 2) : -90;
        const bot = s.phase >= 0.5 ? 90 * (1 - E.snapOut((s.phase - 0.5) * 2)) : 90;
        return (
          <div key={i} style={{ position: 'absolute', left: i * (cw + gap), top: 0, width: cw, height: ch, perspective: 6 * ch }}>
            {half(s.phase > 0 ? s.next : s.cur, false)}
            {half(s.cur, true)}
            {s.phase > 0 && s.phase < 0.5 ? half(s.cur, false, { transformOrigin: '50% 100%', transform: `rotateX(${top.toFixed(2)}deg)`, filter: `brightness(${(1 - 0.35 * s.phase * 2).toFixed(3)})` }) : null}
            {s.phase >= 0.5 ? half(s.next, true, { transformOrigin: '50% 0%', transform: `rotateX(${bot.toFixed(2)}deg)` }) : null}
            <div style={{ position: 'absolute', left: 0, top: ch / 2 - 0.75 * u, width: cw, height: 1.5 * u, background: 'rgba(0,0,0,0.55)' }} />
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- code type
export type CodeKind = 'plain' | 'keyword' | 'string' | 'param' | 'number' | 'comment' | 'punct';
export type CodeToken = { text: string; kind?: CodeKind; br?: boolean };
export type CodeTypeProps = { at: number; tokens: CodeToken[]; cps?: number; late60?: number; kinds?: CodeKind[]; smear?: false | { chars?: number; frames60?: number }; id?: string };

/** The schedule: each character's onset (frames), each token's completion and colour-on frame. Pure. */
export const codeSchedule = (p: CodeTypeProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const per = fps / (p.cps ?? TYPE_FX.code.cps);
  const late = f60x(p.late60 ?? TYPE_FX.code.late60, fps);
  const kinds = p.kinds ?? ['string', 'param', 'number', 'keyword'];
  let k = 0;
  return p.tokens.map((t) => {
    const onsets = [...t.text].map(() => p.at + per * k++);
    if (t.br) k += 3; // a beat at the line end
    const done = onsets.length ? onsets[onsets.length - 1] + per : p.at + per * k;
    return { onsets, done, colourAt: kinds.includes(t.kind ?? 'plain') ? done + late : Infinity };
  });
};

/** Per token at frame f: characters shown, whether its colour is on, and each shown character's smear share. Pure. */
export const codeTypeState = (f: number, p: CodeTypeProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const sm = p.smear === false ? null : { chars: p.smear?.chars ?? TYPE_FX.code.smear.chars, frames: f60x(p.smear?.frames60 ?? TYPE_FX.code.smear.frames60, fps) };
  return codeSchedule(p, film).map((t) => {
    const shown = t.onsets.filter((o) => o <= f).length;
    const smear = t.onsets.slice(0, shown).map((o) => (sm ? clamp(1 - (f - o) / sm.frames) : 0));
    return { shown, coloured: f >= t.colourAt, smear };
  });
};

export const CODE_PALETTE: Record<CodeKind, string> = { plain: C.ink, keyword: C.ink, string: C.accent, param: C.accent, number: C.accent, comment: C.mute, punct: C.mute };

export const CodeType: React.FC<CodeTypeProps & { frame: number; x: number; y: number; size: number; ink?: string; palette?: Partial<Record<CodeKind, string>>; lead?: number; caret?: string }> = (p) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const st = codeTypeState(p.frame, p, film);
  const cw = measureTracked('M', p.size, 400, 0, FONT.mono);
  const lh = p.size * (p.lead ?? 1.5);
  const pal = { ...CODE_PALETTE, ...(p.ink ? { plain: p.ink, keyword: p.ink } : {}), ...p.palette };
  const ink = p.ink ?? C.ink;
  let col = 0;
  let row = 0;
  let last: [number, number] = [0, 0];
  const out: React.ReactNode[] = [];
  p.tokens.forEach((t, ti) => {
    const s = st[ti];
    const colour = s.coloured ? pal[t.kind ?? 'plain'] : ink;
    [...t.text].forEach((ch, ci) => {
      if (ci < s.shown) {
        const sm = s.smear[ci];
        const pos: React.CSSProperties = { position: 'absolute', left: p.x + col * cw, top: p.y + row * lh, fontFamily: FONT.mono, fontSize: p.size, lineHeight: 1, color: colour, whiteSpace: 'pre' };
        out.push(
          <span key={`${ti}-${ci}`} style={{ ...pos, opacity: 1 - sm }}>
            {ch}
          </span>,
        );
        if (sm > 0) out.push(<span key={`${ti}-${ci}s`} style={{ ...pos, opacity: sm, filter: `url(#ct${uid})`, transform: `translateX(${(-0.3 * sm * cw).toFixed(2)}px) scaleX(${(1 + 0.9 * sm).toFixed(3)})`, transformOrigin: '100% 50%' }}>{ch}</span>);
        last = [col + 1, row];
      }
      col++;
    });
    if (t.br) {
      col = 0;
      row++;
    }
  });
  const sched = codeSchedule(p, film);
  const end = Math.max(...sched.map((s) => s.done));
  const caretOn = p.frame >= p.at && p.frame < end + f60x(30, fpsOf(film));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={`ct${uid}`} x="-50%" y="-10%" width="200%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${TYPE_FX.code.smear.sigma * uOf(film)} 0`} />
          </filter>
        </defs>
      </svg>
      {out}
      {caretOn ? <div style={{ position: 'absolute', left: p.x + last[0] * cw + 0.08 * cw, top: p.y + last[1] * lh - 0.05 * p.size, width: 0.12 * p.size, height: 1.05 * p.size, background: p.caret ?? C.accent }} /> : null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- gradient text
export type GradientTextProps = { stops?: readonly (Stop | string)[]; at?: number; period60?: number; pass60?: number; width?: number; drift?: number };

/** The shine band's centre (share of the text width, off-text when resting) and the plate's drift (share). Pure. */
export const gradientTextState = (f: number, p: GradientTextProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const S = TYPE_FX.shine;
  const w = p.width ?? S.width;
  const period = f60x(p.period60 ?? S.period60, fps);
  const pass = f60x(p.pass60 ?? S.pass60, fps);
  const t0 = f - (p.at ?? 0);
  const inP = t0 < 0 ? -1 : t0 % period;
  const band = inP < 0 || inP > pass ? -w : -w + (1 + 2 * w) * E.stdInOut(inP / pass);
  const tri = (v: number) => 1 - Math.abs((((v % 2) + 2) % 2) - 1);
  return { band, shift: tri(((p.drift ?? S.drift) * f) / fps) * 0.5 };
};

export const GradientText: React.FC<GradientTextProps & Line & { frame: number; weight?: number }> = (p) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const w = p.weight ?? 700;
  const fam = p.family ?? FONT.text;
  const tw = measureTracked(p.text, p.size, w, p.track ?? 0, fam);
  const s = gradientTextState(p.frame, p, film);
  const x0 = leftOf(p, tw);
  const base = p.y + baselineOf(p.size, w, 1, fam);
  const stops = p.stops ?? COOL_SPECTRUM;
  const ns = normStops(stops);
  const mirrored: Stop[] = [...ns.map((c) => ({ ...c, at: c.at / 2 })), ...[...ns].reverse().map((c) => ({ ...c, at: 1 - c.at / 2 }))];
  const plate = bakePlate('linear', mirrored, 512, 8);
  const shine = bakePlate('linear', [{ at: 0, color: '#FFFFFF', alpha: 0 }, { at: 0.5, color: '#FFFFFF', alpha: 0.8 }, { at: 1, color: '#FFFFFF', alpha: 0 }], 128, 8);
  const bw = (p.width ?? TYPE_FX.shine.width) * tw;
  return (
    <svg width={film.width} height={film.height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <clipPath id={`gt${uid}`}>
          <text x={x0} y={base} style={{ fontFamily: fam, fontSize: p.size, fontWeight: w, letterSpacing: `${p.track ?? 0}em` }} xmlSpace="preserve">
            {p.text}
          </text>
        </clipPath>
      </defs>
      <g clipPath={`url(#gt${uid})`}>
        <image href={plate} x={x0 - s.shift * 2 * tw} y={p.y - p.size * 0.2} width={tw * 2} height={p.size * 1.4} preserveAspectRatio="none" />
        {/* lint-ok: the skew leans the shine image inside the glyph clip, not the text */}
        <image href={shine} x={x0 + s.band * tw - bw / 2} y={p.y - p.size * 0.2} width={bw} height={p.size * 1.4} preserveAspectRatio="none" transform={`skewX(-18)`} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------- scatter
export type ScatterProps = { at: number; radius?: number; float60?: number; land60?: number; order?: 'together' | Order; stagger60?: number; seed?: string | number; grey?: string; ink?: string };

/** Each letter at frame f: offset (px at 1080p), opacity and the share of its ink (grey -> ink on landing). Pure. */
export const scatterState = (f: number, n: number, p: ScatterProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const S = TYPE_FX.scatter;
  const R = p.radius ?? S.radius;
  const fl = f60x(p.float60 ?? S.float60, fps);
  const ld = f60x(p.land60 ?? S.land60, fps);
  const rk = p.order && p.order !== 'together' ? orderRanks(n, p.order, p.seed) : Array(n).fill(0);
  return rk.map((r, i) => {
    const on = p.at + f60x((p.stagger60 ?? S.stagger60) * r, fps);
    const a = rand(`${p.seed ?? 0}:sa:${i}`) * 2 * Math.PI;
    const m = 0.45 + 0.55 * rand(`${p.seed ?? 0}:sm:${i}`);
    const ft = clamp((f - on) / fl);
    const lt = clamp((f - on - fl) / ld);
    const k = (1 - 0.18 * E.softIn(ft)) * (1 - E.snapOut(lt));
    const appear = p.order && p.order !== 'together' ? (f < on ? 0 : 0.35 + 0.65 * lt) : 1;
    return { dx: Math.cos(a) * R * m * k, dy: Math.sin(a) * R * m * 0.6 * k, opacity: appear, ink: lt };
  });
};

export const ScatterAssemble: React.FC<ScatterProps & Line & { frame: number; weight?: number }> = (p) => {
  const film = useFilm();
  const u = uOf(film);
  const w = p.weight ?? 600;
  const chars = [...p.text];
  const L = letterXs(p.text, p.size, w, p.track ?? 0, p.family);
  const st = scatterState(p.frame, chars.length, p, film);
  const x0 = leftOf(p, L.width);
  const grey = p.grey ?? C.mute;
  const ink = p.ink ?? p.color ?? C.ink;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {chars.map((ch, i) => (
        <span key={i} style={{ position: 'absolute', left: x0 + L.xs[i], top: p.y, fontFamily: p.family ?? FONT.text, fontSize: p.size, fontWeight: w, lineHeight: 1, letterSpacing: `${p.track ?? 0}em`, whiteSpace: 'pre', color: st[i].ink >= 1 ? ink : grey, opacity: st[i].opacity, transform: `translate(${(st[i].dx * u).toFixed(2)}px, ${(st[i].dy * u).toFixed(2)}px)` }}>
          {ch}
          {st[i].ink > 0 && st[i].ink < 1 ? <span style={{ position: 'absolute', left: 0, top: 0, color: ink, opacity: st[i].ink }}>{ch}</span> : null}
        </span>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------- erode rise
export type ErodeRiseProps = { at: number; every60?: number; frames60?: number; riseDelay60?: number; rise60?: number; riseStagger60?: number };

/** The old word's letters (erode share 0..1, right to left) and the new word's (rise share 0..1) at frame f. Pure. */
export const erodeRiseState = (f: number, oldN: number, newN: number, p: ErodeRiseProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const R = TYPE_FX.erode;
  const old = Array.from({ length: oldN }, (_, i) => clamp((f - p.at - f60x((p.every60 ?? R.every60) * (oldN - 1 - i), fps)) / f60x(p.frames60 ?? R.frames60, fps)));
  const rise = Array.from({ length: newN }, (_, j) => E.snapOut(clamp((f - p.at - f60x((p.riseDelay60 ?? R.riseDelay60) + (p.riseStagger60 ?? R.riseStagger60) * j, fps)) / f60x(p.rise60 ?? R.rise60, fps))));
  return { old, rise };
};

export const ErodeRise: React.FC<ErodeRiseProps & Omit<Line, 'text'> & { frame: number; from: string; to: string; weight?: number }> = (p) => {
  const film = useFilm();
  const uid = useId().replace(/[:]/g, '');
  const w = p.weight ?? 600;
  const A = [...p.from];
  const B = [...p.to];
  const LA = letterXs(p.from, p.size, w, p.track ?? 0, p.family);
  const LB = letterXs(p.to, p.size, w, p.track ?? 0, p.family);
  const s = erodeRiseState(p.frame, A.length, B.length, p, film);
  const font: React.CSSProperties = { position: 'absolute', top: p.y, fontFamily: p.family ?? FONT.text, fontSize: p.size, fontWeight: w, lineHeight: 1, letterSpacing: `${p.track ?? 0}em`, whiteSpace: 'pre', color: p.color ?? C.ink };
  const xa = leftOf({ ...p, text: p.from }, LA.width);
  const xb = leftOf({ ...p, text: p.to }, LB.width);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={`er${uid}`} x="-60%" y="-10%" width="220%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${TYPE_FX.erode.sigma * uOf(film)} 0`} />
          </filter>
        </defs>
      </svg>
      {B.map((ch, j) => (
        <span key={`b${j}`} style={{ ...font, left: xb + LB.xs[j], opacity: clamp(s.rise[j] * 2.5), transform: `translateY(${((1 - s.rise[j]) * 0.5 * p.size).toFixed(2)}px)` }}>
          {ch}
        </span>
      ))}
      {A.map((ch, i) =>
        s.old[i] < 1 ? (
          <React.Fragment key={`a${i}`}>
            <span style={{ ...font, left: xa + LA.xs[i], opacity: 1 - clamp(s.old[i] * 1.6) }}>{ch}</span>
            {s.old[i] > 0 ? <span style={{ ...font, left: xa + LA.xs[i], opacity: Math.sin(Math.PI * s.old[i]) * 0.9, filter: `url(#er${uid})` }}>{ch}</span> : null}
          </React.Fragment>
        ) : null,
      )}
    </div>
  );
};

/** FontCycle states and CodeType typing are stepped runs; pass `{ kind: 'cycle' | 'code', ...props }`. */
export const declares = (p?: ({ kind: 'cycle' } & FontCycleProps) | ({ kind: 'code' } & CodeTypeProps), film?: Partial<FilmCtx>): Declares => {
  if (!p) return NONE;
  if (p.kind === 'cycle') {
    const fr = fontCycleFrames(p, film);
    return { ...NONE, stepped: [{ from: Math.floor(p.at), to: fr.land + 1, id: p.id ?? 'font-cycle' }] };
  }
  const s = codeSchedule(p, film);
  const on = s.flatMap((t) => t.onsets);
  if (!on.length) return NONE;
  return { ...NONE, stepped: [{ from: Math.floor(Math.min(...on)), to: Math.ceil(Math.max(...on)) + 1, id: p.id ?? 'code-type' }] };
};
