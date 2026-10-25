import React from 'react';
import { clamp, E, fd, mix, rand } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { FONT } from '../brand/tokens';
import type { Declares, SteppedRange } from '../timeline';

/**
 * Echoes: words that move as discrete copies and jumps instead of tweens.
 *
 *   EchoStamp   the rush word: a word teleports on ones through about five converging positions on its way to
 *               its place (progress 0, .40, .60, .66, .75, hold, 1: 12 f at 60 fps), and every visited position
 *               leaves a stamp of the word that fades out (from 75 %, 0.2 per 30 fps frame); corner ticks ride
 *               with the live word
 *   EchoCopies  copies of a word, each on its own solid knock-out box (the ground's colour) so nearer copies hide
 *               farther ones, slide out from behind the word in rings (+1, +3, +4 f at 25 fps, each expo-out),
 *               (half way in 0.05 s, 90 % in 0.2 s), hold, and contract back (20 f)
 *   GridHop     words on small label boxes hop one grid cell at a time, alternating axes like city blocks (each
 *               hop 9 f on 16 fps steps: 0, .19, .36, .78, .95, 1), then all jump into the sentence in one frame
 *
 * Every state is a pure function of the frame; jumps decide on whole frames.
 */

type XY = { x: number; y: number };

// ---------------------------------------------------------------------------------------------- EchoStamp

/** House numbers: frames at 60 fps. */
export const ECHO_STAMP = { path: [0, 0.4, 0.6, 0.66, 0.75, 0.75, 1] as number[], every60: 2, fade60: 10, from: 0.75, offset: { x: 640, y: -250 } } as const;

export type EchoStampProps = {
  at: number; // the first position (the word cuts on far from its place)
  from?: XY; // offset of the first position from the final one, px at 1080p (house 640, -250)
  path?: number[]; // progress per position (house 0, .4, .6, .66, .75, .75, 1)
  every?: number; // 60 fps frames per position (house 2: on ones at 30 fps)
  fade?: number; // 60 fps frames a stamp takes to vanish (house 10)
  stamp?: number; // a stamp's first opacity (house 0.75)
  id?: string;
};

export type EchoStampState = { visible: boolean; index: number; landed: boolean; pos: XY; stamps: (XY & { opacity: number })[] };

/** The live word's offset from its final place, the position index and the fading stamps at frame f. Pure. */
export const echoStampState = (frame: number, p: EchoStampProps, film?: Partial<FilmCtx>): EchoStampState => {
  const fps = fpsOf(film);
  const u = uOf(film);
  const path = p.path ?? ECHO_STAMP.path;
  const per = Math.max(1, f60x(p.every ?? ECHO_STAMP.every60, fps));
  const from = p.from ?? ECHO_STAMP.offset;
  const F = fd(frame);
  if (F < p.at) return { visible: false, index: -1, landed: false, pos: { x: 0, y: 0 }, stamps: [] };
  const posOf = (k: number): XY => ({ x: from.x * u * (1 - path[k]), y: from.y * u * (1 - path[k]) });
  const index = Math.min(path.length - 1, Math.floor((F - p.at) / per + 1e-9));
  const fade = Math.max(1, f60x(p.fade ?? ECHO_STAMP.fade60, fps));
  const s0 = p.stamp ?? ECHO_STAMP.from;
  const stamps: EchoStampState['stamps'] = [];
  for (let k = 0; k < index; k++) {
    if (path[k] === path[k + 1]) continue; // a hold leaves no second stamp
    const left = p.at + Math.ceil((k + 1) * per - 1e-9); // the frame the word left position k
    const o = s0 * (1 - (F - left + 1) / fade);
    if (o > 0.001) stamps.push({ ...posOf(k), opacity: o });
  }
  return { visible: true, index, landed: index === path.length - 1, pos: posOf(index), stamps };
};

/** Sync: every jump frame (one tick or a glitch step each) and the landing (the impact). */
export const echoStampFrames = (p: EchoStampProps, film?: Partial<FilmCtx>) => {
  const per = Math.max(1, f60x(p.every ?? ECHO_STAMP.every60, fpsOf(film)));
  const path = p.path ?? ECHO_STAMP.path;
  const jumps = path.map((_, k) => p.at + Math.ceil(k * per - 1e-9)).filter((_, k) => k === 0 || path[k] !== path[k - 1]);
  return { jumps, land: jumps[jumps.length - 1] };
};

/**
 * Draws the word (centred on its final place x, y) and its stamps. `ticks` adds two small L ticks on the live
 * word's corners (top-left, bottom-right) in `tickColor`.
 */
export const EchoStamp: React.FC<EchoStampProps & { frame: number; x: number; y: number; children: React.ReactNode; ticks?: { color: string; size?: number; pad?: number; w?: number; h?: number } }> = (props) => {
  const film = useFilm();
  const s = echoStampState(props.frame, props, film);
  if (!s.visible) return null;
  const u = uOf(film);
  const at = (q: XY, o: number, key: string, live: boolean) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, opacity: o, transform: `translate(${(props.x + q.x).toFixed(2)}px, ${(props.y + q.y).toFixed(2)}px)` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', whiteSpace: 'pre' }}>{props.children}</div>
      {live && props.ticks && (() => {
        const t = props.ticks;
        const sz = (t.size ?? 16) * u;
        const w = (t.w ?? 0) / 2 + (t.pad ?? 26) * u;
        const h = (t.h ?? 0) / 2 + (t.pad ?? 26) * u * 0.4;
        const line = 2 * u;
        return (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(-w).toFixed(2)}px, ${(-h).toFixed(2)}px)`, width: sz, height: sz, borderLeft: `${line}px solid ${t.color}`, borderTop: `${line}px solid ${t.color}` }} />
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(w - sz).toFixed(2)}px, ${(h - sz).toFixed(2)}px)`, width: sz, height: sz, borderRight: `${line}px solid ${t.color}`, borderBottom: `${line}px solid ${t.color}` }} />
          </>
        );
      })()}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {s.stamps.map((q, i) => at(q, q.opacity, `s${i}`, false))}
      {at(s.pos, 1, 'live', true)}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- EchoCopies

/** House numbers: frames at 60 fps (the rings at +1, +3, +4 f at 25 fps). */
export const ECHO_COPIES = { lags60: [2.4, 7.2, 9.6] as number[], out60: 27, back60: 20 } as const;

export type EchoCopiesProps = {
  at: number; // the first ring starts out
  offset: XY; // each ring's step from the word, px (ring i sits at (i + 1) x offset)
  lags?: number[]; // 60 fps frames after `at` each ring starts (house 2.4, 7.2, 9.6)
  out?: number; // 60 fps frames a ring takes to slide out (house 27 on E.snapOut: half way in 0.05 s, 90 % in 0.2 s)
  back?: { at: number; frames?: number }; // the rings contract back (house 20 f, accelerating)
  id?: string;
};

/** Every ring's offset (px) and progress at frame f, nearest first. Pure. */
export const echoCopiesState = (frame: number, p: EchoCopiesProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const lags = p.lags ?? ECHO_COPIES.lags60;
  const of = Math.max(1, f60x(p.out ?? ECHO_COPIES.out60, fps));
  const back = p.back ? E.buildIn(clamp((frame - p.back.at) / Math.max(1, f60x(p.back.frames ?? ECHO_COPIES.back60, fps)))) : 0;
  return lags.map((lag, i) => {
    const k = E.snapOut(clamp((frame - p.at - f60x(lag, fps)) / of)) * (1 - back);
    return { i, k, dx: (i + 1) * p.offset.x * k, dy: (i + 1) * p.offset.y * k, visible: k > 0.002 };
  });
};

/**
 * Draws the word at (x, y) (its centre) with its rings behind it; each ring is `children` on a box of
 * `ground` (padding `pad` px) so it hides the rings behind it.
 */
export const EchoCopies: React.FC<EchoCopiesProps & { frame: number; x: number; y: number; ground: string; pad?: number; ringColor?: string; children: React.ReactNode }> = (props) => {
  const film = useFilm();
  const s = echoCopiesState(props.frame, props, film);
  const pad = props.pad ?? 0.12 * 100 * uOf(film);
  const piece = (dx: number, dy: number, key: string, ring: boolean) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(props.x + dx).toFixed(2)}px, ${(props.y + dy).toFixed(2)}px)` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', padding: pad, background: props.ground, whiteSpace: 'pre', color: ring ? props.ringColor : undefined }}>{props.children}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {s
        .filter((c) => c.visible)
        .reverse()
        .map((c) => piece(c.dx, c.dy, `r${c.i}`, true))}
      {piece(0, 0, 'word', false)}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- GridHop

/** House numbers: px at 1080p, frames at 60 fps. */
export const GRID_HOP = { cell: 120, hop60: 9, steps: [0, 0.19, 0.36, 0.78, 0.95, 1] as number[] } as const;

export type HopWord = { path: [number, number][]; at: number }; // grid cells visited (col, row), the first hop's frame

export type GridHopProps = {
  words: HopWord[];
  origin: XY; // the grid's (0, 0) cell centre, px
  cell?: number; // px at 1080p (house 120)
  hop?: { frames?: number; steps?: number[] }; // 60 fps frames per hop (house 9) and the stepped progress
  final: { at: number; positions: XY[] }; // every word jumps to its place in the sentence on this frame (centres, px)
  id?: string;
};

/** A city-block route from one cell to another: one axis at a time, alternating, seeded. */
export const manhattan = (from: [number, number], to: [number, number], seed: string | number = 'hop'): [number, number][] => {
  const out: [number, number][] = [from];
  let [c, r] = from;
  let axis = rand(`${seed}:axis`) < 0.5 ? 0 : 1;
  for (let i = 0; i < 64 && (c !== to[0] || r !== to[1]); i++) {
    if (axis === 0 && c === to[0]) axis = 1;
    if (axis === 1 && r === to[1]) axis = 0;
    if (axis === 0) c += Math.sign(to[0] - c);
    else r += Math.sign(to[1] - r);
    out.push([c, r]);
    axis = 1 - axis;
  }
  return out;
};

/** Each word's centre (px) and whether it has jumped into the sentence, at frame f. Pure. */
export const gridHopState = (frame: number, p: GridHopProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const cell = (p.cell ?? GRID_HOP.cell) * uOf(film);
  const hf = Math.max(1, f60x(p.hop?.frames ?? GRID_HOP.hop60, fps));
  const steps = p.hop?.steps ?? GRID_HOP.steps;
  const F = fd(frame);
  return p.words.map((w, i) => {
    if (F >= p.final.at) return { i, ...p.final.positions[i], final: true };
    const at = (k: number): XY => ({ x: p.origin.x + w.path[k][0] * cell, y: p.origin.y + w.path[k][1] * cell });
    const t = (F - w.at) / hf;
    if (t <= 0 || w.path.length < 2) return { i, ...at(0), final: false };
    const j = Math.min(w.path.length - 2, Math.floor(t));
    const local = t >= w.path.length - 1 ? 1 : t - j;
    const sIdx = Math.min(steps.length - 1, Math.floor(local * (steps.length - 1) + 1e-9));
    const k = steps[sIdx];
    const a = at(j);
    const b = at(j + 1);
    return { i, x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), final: false };
  });
};

/** Sync: each hop's start (a small tick on the beat grid) and the final jump (the hit). */
export const gridHopFrames = (p: GridHopProps, film?: Partial<FilmCtx>) => {
  const hf = Math.max(1, f60x(p.hop?.frames ?? GRID_HOP.hop60, fpsOf(film)));
  const hops = p.words.flatMap((w) => w.path.slice(1).map((_, j) => Math.round(w.at + j * hf))).filter((f) => f < p.final.at).sort((a, b) => a - b);
  return { hops, final: p.final.at };
};

/** The centres of `texts` set as one centred line at (x, y): pass as final.positions. Measures (FontGate). */
export const sentencePositions = (texts: string[], x: number, y: number, font: { size: number; weight: number; track: number; family?: string }, gap?: number): XY[] => {
  const fam = font.family ?? FONT.text;
  const ws = texts.map((t) => measureTracked(t, font.size, font.weight, font.track, fam));
  const sp = gap ?? measureTracked(' ', font.size, font.weight, font.track, fam);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (texts.length - 1);
  let cx = x - total / 2;
  return ws.map((w) => {
    const c = { x: cx + w / 2, y };
    cx += w + sp;
    return c;
  });
};

/** Draws the words: each a label (text on a small box of `box` fill, or bare once in the sentence when `bareFinal`). */
export const GridHop: React.FC<GridHopProps & { frame: number; texts: string[]; font: { size: number; weight: number; track: number; family?: string; color: string }; box?: string; bareFinal?: boolean }> = (props) => {
  const film = useFilm();
  const s = gridHopState(props.frame, props, film);
  const f = props.font;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {s.map((w) => (
        <div key={w.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${w.x.toFixed(2)}px, ${w.y.toFixed(2)}px)` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -50%)', whiteSpace: 'pre', fontFamily: f.family ?? FONT.text, fontSize: f.size, fontWeight: f.weight, letterSpacing: `${f.track}em`, lineHeight: 1.15, color: f.color, background: w.final && props.bareFinal ? undefined : props.box, padding: props.box && !(w.final && props.bareFinal) ? `${f.size * 0.12}px ${f.size * 0.22}px` : undefined, borderRadius: f.size * 0.12 }}>
            {props.texts[w.i]}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- declares

/** EchoStamp: its jump span is stepped; GridHop: every hop is stepped (16 fps) and the final jump is a stepped frame; EchoCopies: nothing. */
export const declares = (p?: { stamp?: Partial<EchoStampProps>; hop?: Partial<GridHopProps> }, film?: Partial<FilmCtx>): Declares => {
  const stepped: SteppedRange[] = [];
  if (p?.stamp?.at !== undefined) {
    const fr = echoStampFrames(p.stamp as EchoStampProps, film);
    stepped.push({ from: p.stamp.at, to: fr.land + 1, id: p.stamp.id ?? 'echoStamp' });
  }
  if (p?.hop?.words?.length && p.hop.final) {
    const fr = gridHopFrames(p.hop as GridHopProps, film);
    if (fr.hops.length) stepped.push({ from: fr.hops[0], to: fr.final, fps: 16, id: `${p.hop.id ?? 'gridHop'}-hops` });
    stepped.push({ from: fr.final, to: fr.final + 1, id: `${p.hop.id ?? 'gridHop'}-final` });
  }
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
