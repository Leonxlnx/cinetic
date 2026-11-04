import React from 'react';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { clamp, E, type Ease, fd, prog, rand } from '../lib/anim';
import { f60, f60x, type FilmCtx, fpsOf, paceOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';

type Role = keyof typeof TYPE;

const DIGITS = '0123456789';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const scrambles = (ch: string) => /[0-9A-Za-z]/.test(ch); // spaces and punctuation hold still
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export type ScrambleOrder = 'ltr' | 'random' | 'centre';

export type ScrambleTiming = {
  start: number;
  hold?: number; // frames every glyph cycles before the first one locks
  stagger?: number; // frames between locks
  order?: ScrambleOrder; // 'centre': outward from the middle by each glyph's distance from the centre (a title reveal)
  seed?: number | string;
  centres?: number[]; // 'centre' order: each character's centre x (any unit; default its index), the component passes measured ones
};

/** Rank of each scrambling character in the lock order (-1 for characters that never scramble). */
const ranks = (text: string, order: ScrambleOrder, seed: number | string, centres?: number[]) => {
  const chars = [...text];
  const idx = chars.map((c, i) => (scrambles(c) ? i : -1)).filter((i) => i >= 0);
  if (order === 'random') idx.sort((a, b) => rand(`${seed}:o:${a}`) - rand(`${seed}:o:${b}`));
  if (order === 'centre') {
    const cx = centres ?? chars.map((_, i) => i + 0.5);
    const all = chars.map((_, i) => cx[i]);
    const mid = (Math.min(...all) + Math.max(...all)) / 2;
    idx.sort((a, b) => Math.abs(cx[a] - mid) - Math.abs(cx[b] - mid) || a - b);
  }
  const r = chars.map(() => -1);
  idx.forEach((i, k) => (r[i] = k));
  return r;
};

/** The lock order of a text's characters (-1: never scrambles): the rank every state below reads. */
export const scrambleRanks = ranks;

/**
 * Whole frame each character locks to its final glyph (characters that never scramble: `start`).
 * Put a tick on each for sound (they are integers); the component reads the same schedule.
 */
export const scrambleFrames = (text: string, t: ScrambleTiming, film?: Partial<FilmCtx>): number[] => {
  const pace = paceOf(film);
  const { start, hold = f60(18, fpsOf(film)), stagger = f60(pace.fx.scramble.stagger, fpsOf(film)), order = 'ltr', seed = 0 } = t;
  return ranks(text, order, seed, t.centres).map((r) => (r < 0 ? Math.round(start) : Math.round(start + hold + r * stagger)));
};

/** House numbers of the 1.2 decode (frames at 60 fps; the title's mosaic band in em). */
export const DECODE_HOUSE = { perGlyph60: 3, rateHz: 10, mosaic60: 4, steps: 3, bandEm: 0.55 } as const;

export type DecodeOpts = ScrambleTiming & {
  text: string;
  perGlyph?: number; // film frames between locks (house 3 at 60 fps: a title of 11 glyphs opens in about half a second)
  rateHz?: number; // cycling glyphs change this many times a second each (house 10); 0 = no cycling glyphs
  edge?: 'none' | 'mosaic'; // 'mosaic': a glyph shows as accent blocks for `mosaicFrames` before it locks
  mosaicFrames?: number; // film frames (house 4 at 60 fps)
  steps?: number; // anagram: the title's own letters shuffled, settling into place in this many stages
  title?: boolean; // a title reveal: the title opens outward from its centre behind two fronts of accent blocks (no cycling glyphs)
  width?: number; // title: the title's width, in the units of `centres` (the component passes measured px)
  band?: number; // title: the mosaic band at each front, in the units of `centres` (house 0.55 em)
  ease?: Ease; // title: the fronts' progress over the reveal (house E.linear: a steady opening)
};

/**
 * A title's centre-out reveal at frame f (pure): q 0..1 of the way the two fronts travel, and in the
 * units of `centres` the half-width `h` of the opened span (the bright title shows inside h - band,
 * accent blocks fill the band at each front). The fronts open over perGlyph x glyphs frames (house 3 a
 * glyph at 60 fps: an 11-glyph title in about half a second).
 */
export const titleReveal = (f: number, o: DecodeOpts, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const per = o.perGlyph ?? o.stagger ?? f60x(DECODE_HOUSE.perGlyph60, fps);
  const n = [...o.text].filter(scrambles).length;
  const frames = Math.max(1, per * n);
  const q = (o.ease ?? E.linear)(clamp((f - o.start) / frames));
  const width = o.width ?? [...o.text].length;
  const band = o.band ?? 0.9 * (width / Math.max(1, [...o.text].length)); // about one glyph cell when no px are given
  const h = q * (width / 2 + band);
  return { q, h, band, open: Math.max(0, h - band), width, frames, end: Math.ceil(o.start + frames) };
};

export type DecodeGlyph = {
  ch: string; // the final character
  shown: string; // what is drawn this frame (the final glyph once locked; a cycling or anagram glyph before)
  state: 'still' | 'hidden' | 'cycling' | 'mosaic' | 'locked';
  rank: number;
  lock: number; // whole frame it locks
  mosaic: number; // 0..1 of its mosaic window (1 = just before the lock)
  age: number; // whole frames since it locked (-1 before)
};

/**
 * The decode at frame f (pure; discrete states decided on fd(f), so sub-frames agree). Titles (`title`)
 * keep each glyph hidden until its turn; a scramble cycles glyphs of its own class (`rateHz` changes a
 * second each, phases spread so they never change together); `steps` turns the cycling into an anagram
 * of the title's own letters that settles in stages. `edge: 'mosaic'` draws the glyph as blocks for the
 * last frames before it locks. Widths, lock frames and order are the component's.
 */
export const decodeState = (f: number, o: DecodeOpts, film?: Partial<FilmCtx>): DecodeGlyph[] => {
  const fps = fpsOf(film);
  const pace = paceOf(film);
  const chars = [...o.text];
  const order = o.order ?? pace.fx.scramble.order ?? 'centre';
  const seed = o.seed ?? 0;
  const per = o.perGlyph ?? o.stagger ?? f60x(DECODE_HOUSE.perGlyph60, fps);
  const hold = o.hold ?? (o.title ? 0 : f60x(18, fps));
  const r = ranks(o.text, order, seed, o.centres);
  const locks = r.map((k) => (k < 0 ? Math.round(o.start) : Math.round(o.start + hold + k * per)));
  const F = fd(f);
  if (o.title) {
    // centre-out fronts: a glyph is mosaic while a front crosses it and locked once inside the open span
    const cx = o.centres ?? chars.map((_, i) => i + 0.5);
    const tr = titleReveal(F, o, film);
    const centre = o.centres ? (o.width !== undefined ? o.width / 2 : (Math.min(...cx) + Math.max(...cx)) / 2) : chars.length / 2;
    const lockAt = (d: number) => {
      for (let g = Math.ceil(o.start); g <= Math.ceil(o.start + tr.frames) + 1; g++) if (titleReveal(g, o, film).open >= d) return g;
      return Math.ceil(o.start + tr.frames) + 1;
    };
    return chars.map((ch, i): DecodeGlyph => {
      const d = Math.abs(cx[i] - centre);
      const L = lockAt(d);
      if (r[i] < 0) return { ch, shown: ch, state: F >= o.start ? 'still' : 'hidden', rank: -1, lock: L, mosaic: 0, age: F - L };
      if (F >= L) return { ch, shown: ch, state: 'locked', rank: r[i], lock: L, mosaic: 0, age: F - L };
      if (tr.h >= d && o.edge !== 'none') return { ch, shown: ch, state: 'mosaic', rank: r[i], lock: L, mosaic: clamp((tr.h - d) / Math.max(1e-6, tr.band)), age: -1 };
      return { ch, shown: ch, state: 'hidden', rank: r[i], lock: L, mosaic: 0, age: -1 };
    });
  }
  const mos = o.edge === 'mosaic' ? (o.mosaicFrames ?? f60x(DECODE_HOUSE.mosaic60, fps)) : 0;
  const hz = o.rateHz ?? pace.fx.scramble.rateHz ?? DECODE_HOUSE.rateHz;
  const P = hz > 0 ? Math.max(1, Math.round(fps / hz)) : Infinity;
  const m = r.filter((k) => k >= 0).length;
  // anagram: at stage s the first s/steps of the lock order sit home; the rest are a seeded shuffle of what is left
  const steps = o.steps ?? 0;
  const letters = chars.map((c, i) => ({ c, i })).filter((x) => r[x.i] >= 0);
  const anagramAt = (stage: number) => {
    const home = new Set(letters.filter((x) => r[x.i] < Math.round((stage / Math.max(1, steps)) * m)).map((x) => x.i));
    const free = letters.filter((x) => !home.has(x.i));
    const pool = free.map((x) => x.c).sort((a, b) => rand(`${seed}:ana:${stage}:${a}:${b}`) - 0.5);
    const shuffled = [...free].sort((a, b) => rand(`${seed}:anag:${stage}:${a.i}`) - rand(`${seed}:anag:${stage}:${b.i}`));
    const out = new Map<number, string>();
    shuffled.forEach((x, k) => out.set(x.i, pool[k] ?? x.c));
    return out;
  };
  return chars.map((ch, i): DecodeGlyph => {
    if (r[i] < 0) return { ch, shown: ch, state: F >= o.start ? 'still' : 'hidden', rank: -1, lock: locks[i], mosaic: 0, age: F - locks[i] };
    const L = locks[i];
    if (F >= L) return { ch, shown: ch, state: 'locked', rank: r[i], lock: L, mosaic: 0, age: F - L };
    if (F < o.start) return { ch, shown: ch, state: 'hidden', rank: r[i], lock: L, mosaic: 0, age: -1 };
    if (mos > 0 && F >= L - mos) return { ch, shown: ch, state: 'mosaic', rank: r[i], lock: L, mosaic: clamp((F - (L - mos) + 1) / mos), age: -1 };
    if (steps > 0) {
      const span = Math.max(1, L - o.start);
      const stage = Math.min(steps - 1, Math.floor(((F - o.start) / span) * steps));
      return { ch, shown: anagramAt(stage).get(i) ?? ch, state: 'cycling', rank: r[i], lock: L, mosaic: 0, age: -1 };
    }
    const base = /[0-9]/.test(ch) ? DIGITS : /[A-Z]/.test(ch) ? UPPER : LOWER;
    const phase = Math.round((rand(`${seed}:p:${i}`) * P * m) % Math.max(1, P));
    const k = Number.isFinite(P) ? Math.floor((F - o.start + phase) / P) : 0;
    let stride = 1 + Math.floor(rand(`${seed}:s:${i}`) * (base.length - 1));
    while (gcd(stride, base.length) !== 1) stride++;
    const g = base[(Math.floor(rand(`${seed}:a:${i}`) * base.length) + k * stride) % base.length];
    return { ch, shown: g, state: 'cycling', rank: r[i], lock: L, mosaic: 0, age: -1 };
  });
};

/**
 * The cells of a glyph's mosaic at window progress t (0..1): `n` x `n` blocks, each on or off, seeded,
 * fewer as the lock nears (the glyph condenses out of blocks). Pure; the component draws them.
 */
export const mosaicCells = (i: number, t: number, n = 5, seed: number | string = 0): { x: number; y: number }[] => {
  const keep = 0.7 - 0.45 * clamp(t);
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rand(`${seed}:m:${i}:${x}:${y}:${Math.round(t * 8)}`) < keep) out.push({ x, y });
  return out;
};

/**
 * Decode reveal. Every letter and digit cycles through glyphs of (nearly) its own width, then locks
 * to its final glyph, left to right, in a seeded random order, or outward from the centre, `stagger`
 * frames apart. About `rate` glyphs change per frame across the whole line (1.1), or each cycling
 * glyph changes `rateHz` times a second (a 1.2 pace: 10), never all at once: a calm decode, not noise.
 * Deterministic from `seed`; all state on fd(frame). Defaults from the film's pace (pace.fx.scramble,
 * 60 fps): calm fade-in 16 f (E.smooth), hold 18 f, stagger 3 f, centre order and 10 changes a second
 * with a 1.2 pace (1.1: left to right, 5 f, 1 glyph/f); crisp 10 f, 18 f, 3 f, 1.5; cycling glyphs in
 * C.mute.
 *
 * Where it goes: a short product string (a code, a version, a number) once per film, or (1.2, `title`) the
 * title itself, outward from the centre with the freshest edges as accent blocks (`edge="mosaic"`): a
 * title that opens from its middle in about half a second. Never on running film copy, which a viewer
 * must read the moment it appears. `steps` makes the cycling an anagram of the title's own letters.
 * The layout never jumps: the final text is laid out from the first frame (only opacity changes, tabular
 * figures, kerning intact) and each cycling glyph is drawn on its own layer, centred on its cell, from
 * a pool of the same class whose advance is within 8% of the final glyph's (at least the 6 nearest).
 * `set` replaces the pool. `lockStyle(i, age)` styles character i, `age` whole frames after it locked.
 */
export const Scramble: React.FC<
  ScrambleTiming & {
    text: string;
    frame: number; // local frame
    id?: string; // data-text id for the layout audit
    rate?: number;
    rateHz?: number;
    edge?: 'none' | 'mosaic';
    mosaicFrames?: number;
    mosaicColor?: string;
    steps?: number;
    title?: boolean;
    fadeIn?: number;
    set?: string;
    color?: string; // colour of the cycling glyphs
    role?: Role;
    size?: number;
    family?: string;
    style?: React.CSSProperties;
    lockStyle?: (i: number, age: number) => React.CSSProperties;
  }
> = ({ text, frame, id = 'scramble', rate: rateProp, rateHz, edge, mosaicFrames, mosaicColor = C.accent, steps, title, fadeIn: fadeInProp, set, color = C.mute, role = 'display', size: sizeProp, family = FONT.text, style, lockStyle, ...t }) => {
  const film = useFilm();
  const size = sizeProp ?? TYPE[role].size * uOf(film);
  const { weight, track } = TYPE[role];
  const w = (s: string) => measureTracked(s, size, weight, track, family);
  const fresh = title !== undefined || edge !== undefined || steps !== undefined || rateHz !== undefined || (rateProp === undefined && film.pace.fx.scramble.rateHz !== undefined);
  const F = fd(frame);
  if (F < t.start) return null;
  const chars = [...text];
  const cells = chars.map((_, i) => {
    const x0 = w(text.slice(0, i));
    return { x0, cell: w(text.slice(0, i + 1)) - x0 - track * size };
  });
  if (fresh) {
    // 1.2: decodeState decides every glyph (centre order from the measured cells)
    const centres = cells.map((c) => c.x0 + c.cell / 2);
    const fullW = w(text) - track * size;
    const band = DECODE_HOUSE.bandEm * size;
    const opts: DecodeOpts = { ...t, text, rateHz, edge, mosaicFrames, steps, title, centres, width: fullW, band, order: t.order ?? film.pace.fx.scramble.order ?? 'centre' };
    const g = decodeState(frame, opts, film);
    const fade = title ? 1 : prog(frame, t.start, t.start + (fadeInProp ?? f60(film.pace.fx.scramble.fadeIn, film.fps)), E.smooth);
    const cap = 0.72 * size;
    if (title) {
      // the title opens from its centre: the text is clipped to the open span, accent blocks ride the two fronts
      const tr = titleReveal(F, opts, film);
      // one whole-pixel lattice anchored on the title's centre: the open span ends on a cell edge and the
      // blocks start on it, so no block overlaps the bright title and no edge is anti-aliased (an AA block
      // edge over the ink reads as extra bright width)
      const cellPx = Math.max(2, Math.round(size * 0.09));
      const mid = Math.round(fullW / 2);
      const kOpen = Math.floor(tr.open / cellPx + 1e-9);
      const kFront = tr.q >= 1 ? kOpen : Math.max(kOpen, Math.ceil(tr.h / cellPx - 1e-9));
      const lo = mid - kOpen * cellPx;
      const hi = mid + kOpen * cellPx;
      const top = Math.round((size * TYPE[role].lead - cap) / 2);
      const n = Math.ceil(cap / cellPx);
      const cols = kFront - kOpen;
      const block = Math.max(1, cellPx - Math.max(1, Math.round(cellPx * 0.1)));
      const shown = tr.q >= 1 ? null : `inset(-20% ${Math.max(0, fullW - hi + track * size)}px -20% ${Math.max(0, lo)}px)`;
      return (
        <span data-text={id} style={{ ...typeStyle(role, size), fontFamily: family, position: 'relative', display: 'inline-block', ...style }}>
          <span style={{ display: 'inline-block', clipPath: shown ?? undefined }}>
            {chars.map((ch, i) => (
              <span key={i} style={g[i].state === 'locked' ? lockStyle?.(i, g[i].age) : undefined}>
                {ch}
              </span>
            ))}
          </span>
          {edge !== 'none' && cols > 0 && (
            <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, transform: `translate(0px, ${top}px)` }}>
              {[0, 1].flatMap((k) =>
                Array.from({ length: cols * n }, (_, c) => c)
                  // densest next to the open title, thinning toward the front's leading edge
                  .filter((c) => rand(`${t.seed ?? 0}:tb:${k}:${c}:${F}`) < 0.42 - 0.3 * (((c % cols) + 0.5) / cols))
                  .map((c) => {
                    const j = kOpen + (c % cols); // lattice column out from the centre
                    const x = k === 0 ? mid - (j + 1) * cellPx : mid + j * cellPx;
                    return <span key={`${k}-${c}`} style={{ position: 'absolute', left: 0, top: 0, width: block, height: block, background: mosaicColor, transform: `translate(${x}px, ${Math.floor(c / cols) * cellPx}px)` }} />;
                  }),
              )}
            </span>
          )}
        </span>
      );
    }
    return (
      <span data-text={id} style={{ ...typeStyle(role, size), fontFamily: family, position: 'relative', display: 'inline-block', opacity: fade, ...style }}>
        {chars.map((ch, i) => {
          const s = g[i];
          const on = s.state === 'locked' || s.state === 'still';
          return (
            <span key={i} style={{ opacity: on ? 1 : 0, ...(s.state === 'locked' ? lockStyle?.(i, s.age) : undefined) }}>
              {ch}
            </span>
          );
        })}
        {g.map((s, i) => {
          if (s.state === 'cycling') {
            const gw = w(s.shown) - track * size;
            const x = cells[i].x0 + (cells[i].cell - gw) / 2;
            return (
              <span key={`g${i}`} aria-hidden style={{ position: 'absolute', left: 0, top: 0, color, transform: `translateX(${x.toFixed(3)}px)` }}>
                {s.shown}
              </span>
            );
          }
          if (s.state === 'mosaic') {
            const n = 5;
            const bw = cells[i].cell / n;
            const bh = cap / n;
            const top = (size * TYPE[role].lead - size) / 2 + size * 0.2;
            return (
              <span key={`m${i}`} aria-hidden style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${cells[i].x0.toFixed(3)}px, ${top.toFixed(3)}px)` }}>
                {mosaicCells(i, s.mosaic, n, t.seed ?? 0).map((c, k) => (
                  <span key={k} style={{ position: 'absolute', left: 0, top: 0, width: bw * 0.92, height: bh * 0.92, background: mosaicColor, transform: `translate(${(c.x * bw).toFixed(2)}px, ${(c.y * bh).toFixed(2)}px)` }} />
                ))}
              </span>
            );
          }
          return null;
        })}
      </span>
    );
  }
  const rate = rateProp ?? film.pace.fx.scramble.rate;
  const fadeIn = fadeInProp ?? f60(film.pace.fx.scramble.fadeIn, film.fps);
  const { start, seed = 0 } = t;
  const locks = scrambleFrames(text, t, film);
  const order = ranks(text, t.order ?? 'ltr', seed, t.centres);
  const m = order.filter((r) => r >= 0).length;
  const P = Math.max(1, Math.round(m / Math.max(0.1, rate))); // frames between changes of one glyph
  const fade = prog(frame, start, start + fadeIn, E.smooth);
  // Each cycling cell changes every P frames on its own phase; a seeded permutation spreads the
  // phases evenly, so about m / P = `rate` glyphs change on any one frame.
  const slot = [...order.keys()].filter((i) => order[i] >= 0).sort((a, b) => rand(`${seed}:p:${a}`) - rand(`${seed}:p:${b}`));

  const cycling = chars.map((ch, i) => {
    if (order[i] < 0 || F >= locks[i]) return null;
    const base = set ?? (/[0-9]/.test(ch) ? DIGITS : /[A-Z]/.test(ch) ? UPPER : LOWER);
    const wt = w(ch);
    const byWidth = [...base].map((g) => ({ g, d: Math.abs(w(g) - wt) })).sort((a, b) => a.d - b.d || a.g.localeCompare(b.g));
    const near = byWidth.filter((x) => x.d <= 0.08 * wt);
    const pool = (near.length >= 6 ? near : byWidth.slice(0, 6)).map((x) => x.g);
    const L = pool.length;
    // Glyph k of this cell: a seeded start and a stride coprime with the pool, so consecutive glyphs always differ.
    const phase = Math.round((slot.indexOf(i) * P) / Math.max(1, m));
    const k = Math.floor((F - start + phase) / P);
    let stride = 1 + Math.floor(rand(`${seed}:s:${i}`) * Math.max(1, L - 1));
    while (L > 1 && gcd(stride, L) !== 1) stride++;
    const g = pool[(Math.floor(rand(`${seed}:a:${i}`) * L) + k * stride) % L];
    // Centre the glyph on its cell (tracking trails each glyph, so take it off both widths).
    const x0 = cells[i].x0;
    const cell = cells[i].cell;
    const gw = w(g) - track * size;
    return { i, g, x: x0 + (cell - gw) / 2 };
  });

  return (
    <span data-text={id} style={{ ...typeStyle(role, size), fontFamily: family, position: 'relative', display: 'inline-block', opacity: fade, ...style }}>
      {chars.map((ch, i) => {
        const locked = order[i] < 0 || F >= locks[i];
        return (
          <span key={i} style={{ opacity: locked ? 1 : 0, ...(locked && order[i] >= 0 ? lockStyle?.(i, F - locks[i]) : undefined) }}>
            {ch}
          </span>
        );
      })}
      {cycling.map((c) =>
        c ? (
          <span key={`g${c.i}`} aria-hidden style={{ position: 'absolute', left: 0, top: 0, color, transform: `translateX(${c.x.toFixed(3)}px)` }}>
            {c.g}
          </span>
        ) : null,
      )}
    </span>
  );
};

/**
 * What a Scramble instance does on purpose: each lock (and each mosaic block change) is a designed
 * discrete step, so a 1.2 decode declares its span as stepped (on whole frames, one sample each);
 * the 1.1 form declares nothing.
 */
export const declares = (p?: Partial<DecodeOpts> & { id?: string }, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || p.text === undefined || p.start === undefined || (p.title === undefined && p.edge === undefined && p.steps === undefined && p.rateHz === undefined)) return out;
  const g = decodeState(p.start, p as DecodeOpts, film);
  const last = Math.max(...g.map((x) => x.lock));
  const first = Math.min(...g.filter((x) => x.rank >= 0).map((x) => x.lock - (p.edge === 'mosaic' ? Math.ceil(p.mosaicFrames ?? f60x(DECODE_HOUSE.mosaic60, fpsOf(film))) : 0)));
  out.stepped?.push({ from: Math.min(first, Math.round(p.start)), to: last + 1, id: p.id ?? 'decode' });
  return out;
};
