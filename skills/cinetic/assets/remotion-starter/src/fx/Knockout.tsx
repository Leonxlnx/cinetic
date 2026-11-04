import React from 'react';
import { clamp, E, type Ease, fd, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { FONT } from '../brand/tokens';
import type { Declares } from '../timeline';

/**
 * Knockout: a solid object sweeps through a line and eats the letters at its edge. The words do not fade:
 * whatever the object has passed is gone, and a letter half under the edge is half there. It is how a
 * product action replaces a word (a button slides over the old way, a rule deletes it from the caret).
 *
 *   'clip'     the text is clipped at the object's leading edge, continuously (partial letters at the edge)
 *   'letters'  whole letters go one by one as the edge passes their centre; the next letter to go turns the
 *              accent first (forward delete: a rule grows from the caret and the letters ahead of it light
 *              and vanish, about 3 f apart at 60 fps)
 *   'reveal'   the inverse: the object writes the line on behind it
 *
 * The object is a bar of the line's height (a highlighter), a thin rule from the caret, or any node you
 * place at the edge (`object`). One closed-form edge position drives both; letters 3 f apart fall out of
 * the edge's speed. Pure state: knockoutState(f, widths) never measures; <Knockout> measures (FontGate).
 */

/** House numbers: frames at 60 fps, shares of an em. */
export const KNOCKOUT = { frames60: 24, bar: 0.55, rule: 0.06, accentAhead: 1 } as const;

export type KnockoutProps = {
  at: number; // the edge starts to move
  from: number; // edge position (px, relative to the line's left) at `at` ...
  to: number; // ... and at the end; to > from sweeps left to right
  frames?: number; // 60 fps frames (house 24)
  ease?: Ease; // house E.softIn (sine-in: it gathers speed through the word)
  mode?: 'clip' | 'letters' | 'reveal';
  accentAhead?: number; // letters: letters within this many letter-widths ahead of the edge show the accent (house 1)
  id?: string;
};

export type KnockoutLetter = { i: number; visible: boolean; accent: boolean; cover: number };
export type KnockoutState = { edge: number; dir: 1 | -1; letters: KnockoutLetter[]; done: boolean };

/**
 * The edge (px from the line's left) and, for each letter (given the cumulative advance widths, `prefix[i]`
 * = width of the first i letters, prefix.length = n + 1), whether it shows, whether it is lit, and how much
 * of it is covered. Pure.
 */
export const knockoutState = (frame: number, p: KnockoutProps, prefix: number[], film?: Partial<FilmCtx>): KnockoutState => {
  const fps = fpsOf(film);
  const fr = Math.max(1, f60x(p.frames ?? KNOCKOUT.frames60, fps));
  const t = clamp((frame - p.at) / fr);
  const e = (p.ease ?? E.softIn)(t);
  const edge = frame < p.at ? p.from : mix(p.from, p.to, e);
  const dir: 1 | -1 = p.to >= p.from ? 1 : -1;
  const mode = p.mode ?? 'clip';
  const F = fd(frame);
  const edgeW = F < p.at ? p.from : mix(p.from, p.to, (p.ease ?? E.softIn)(clamp((F - p.at) / fr))); // whole-frame edge for discrete letters
  const n = prefix.length - 1;
  const letters: KnockoutLetter[] = [];
  for (let i = 0; i < n; i++) {
    const a = prefix[i];
    const b = prefix[i + 1];
    const w = Math.max(1e-6, b - a);
    // share of the letter the object has passed
    const cover = dir > 0 ? clamp((edge - a) / w) : clamp((b - edge) / w);
    const centrePassed = dir > 0 ? edgeW >= (a + b) / 2 : edgeW <= (a + b) / 2;
    const ahead = dir > 0 ? (a + b) / 2 - edgeW : edgeW - (a + b) / 2;
    if (mode === 'letters') letters.push({ i, visible: !centrePassed, accent: !centrePassed && F >= p.at && ahead <= (p.accentAhead ?? KNOCKOUT.accentAhead) * w, cover: centrePassed ? 1 : 0 });
    else if (mode === 'reveal') letters.push({ i, visible: cover > 0, accent: false, cover });
    else letters.push({ i, visible: cover < 1, accent: false, cover });
  }
  return { edge, dir, letters, done: t >= 1 };
};

/** Sync: the start (a whoosh tail), the frame each letter goes ('letters'), the end. */
export const knockoutFrames = (p: KnockoutProps, prefix: number[], film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const end = Math.ceil(p.at + f60x(p.frames ?? KNOCKOUT.frames60, fps));
  const gone: number[] = [];
  if ((p.mode ?? 'clip') === 'letters') {
    const n = prefix.length - 1;
    const seen = new Array(n).fill(false);
    for (let f = p.at; f <= end; f++) {
      const s = knockoutState(f, p, prefix, film);
      s.letters.forEach((l, i) => {
        if (!l.visible && !seen[i]) {
          seen[i] = true;
          gone.push(f);
        }
      });
    }
  }
  return { start: p.at, gone: gone.sort((a, b) => a - b), end };
};

/**
 * Draws `text` with its left edge at (x, y - line box / 2), eaten by the edge. `object`: 'bar' (a block of
 * the line's height at the edge, house 0.55 em wide), 'rule' (a thin line at the baseline from `from` to the
 * edge), 'none', or a render function given the edge's absolute x.
 */
export const Knockout: React.FC<
  KnockoutProps & { frame: number; text: string; x: number; y: number; font: { size: number; weight: number; track: number; family?: string; color: string }; accent?: string; object?: 'bar' | 'rule' | 'none' | ((edgeX: number) => React.ReactNode); objectColor?: string; objectWidth?: number }
> = (props) => {
  const film = useFilm();
  const f = props.font;
  const fam = f.family ?? FONT.text;
  const chars = Array.from(props.text);
  const prefix = chars.map((_, i) => measureTracked(chars.slice(0, i).join(''), f.size, f.weight, f.track, fam));
  prefix.push(measureTracked(props.text, f.size, f.weight, f.track, fam));
  const s = knockoutState(props.frame, props, prefix, film);
  const lh = f.size * 1.2;
  const top = props.y - lh / 2;
  const mode = props.mode ?? 'clip';
  const st: React.CSSProperties = { position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: fam, fontSize: f.size, fontWeight: f.weight, letterSpacing: `${f.track}em`, lineHeight: `${lh}px`, color: f.color, fontVariantNumeric: 'tabular-nums' };
  const W = prefix[prefix.length - 1];
  let body: React.ReactNode;
  if (mode === 'letters') {
    body = s.letters.map((l) =>
      l.visible ? (
        <span key={l.i} style={{ ...st, color: l.accent && props.accent ? props.accent : f.color, transform: `translate(${(props.x + prefix[l.i]).toFixed(2)}px, ${top.toFixed(2)}px)` }}>
          {chars[l.i]}
        </span>
      ) : null,
    );
  } else {
    // keep the side ahead of the edge (clip) or behind it (reveal)
    const e = s.edge;
    const keepRight = (mode === 'clip') === s.dir > 0;
    const clip = keepRight ? `inset(0 0 0 ${clamp(e, 0, W).toFixed(2)}px)` : `inset(0 ${clamp(W - e, 0, W).toFixed(2)}px 0 0)`;
    body = <div style={{ ...st, clipPath: clip, transform: `translate(${props.x.toFixed(2)}px, ${top.toFixed(2)}px)` }}>{props.text}</div>;
  }
  const ex = props.x + s.edge;
  const oc = props.objectColor ?? props.accent ?? f.color;
  let obj: React.ReactNode = null;
  const moving = props.frame >= props.at && !(s.done && mode !== 'reveal' && (props.object ?? 'bar') === 'rule');
  if (typeof props.object === 'function') obj = props.object(ex);
  else if ((props.object ?? 'bar') === 'bar' && moving) {
    const bw = props.objectWidth ?? f.size * KNOCKOUT.bar;
    const bx = s.dir > 0 ? ex - bw : ex;
    obj = <div style={{ position: 'absolute', left: 0, top: 0, width: bw, height: lh * 0.86, borderRadius: f.size * 0.08, background: oc, transform: `translate(${bx.toFixed(2)}px, ${(props.y - lh * 0.43).toFixed(2)}px)` }} />;
  } else if (props.object === 'rule' && moving) {
    const a = props.x + props.from;
    const rh = Math.max(2 * uOf(film), f.size * KNOCKOUT.rule);
    obj = <div style={{ position: 'absolute', left: 0, top: 0, width: Math.abs(ex - a), height: rh, borderRadius: rh, background: oc, transform: `translate(${Math.min(a, ex).toFixed(2)}px, ${(props.y + f.size * 0.36).toFixed(2)}px)` }} />;
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      {body}
      {obj}
    </div>
  );
};

/** 'letters' removes whole letters (a stepped run); 'clip' and 'reveal' are continuous. */
export const declares = (p?: Partial<KnockoutProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p || p.at === undefined || (p.mode ?? 'clip') !== 'letters') return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const end = Math.ceil(p.at + f60x(p.frames ?? KNOCKOUT.frames60, fpsOf(film)));
  return { stepped: [{ from: p.at, to: end + 1, id: p.id ?? 'knockout' }], flashes: [], cameraBlur: [], seams: [] };
};
