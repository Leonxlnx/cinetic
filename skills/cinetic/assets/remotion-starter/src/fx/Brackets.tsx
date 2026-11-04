import React from 'react';
import { clamp, E, type Ease, expOut, fd, mix } from '../lib/anim';
import { peakFrame } from '../lib/camera-moves';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { FONT } from '../brand/tokens';
import type { Declares, Seam } from '../timeline';

/**
 * Brackets: braces (or brackets) are separate glyphs with their own motion around a phrase that grows or
 * swaps. Two behaviours:
 *
 *   insert  the closing brace jumps outward ONE frame before the new word cuts on (about two thirds of its
 *           travel in that frame), then settles exponentially (10 f at 60 fps); the frame is ready before
 *           the word arrives, so the word lands in a space already made
 *   peak    for a swap, the braces accelerate apart through the end of the hold on an in-out run (60 f) and
 *           the words change exactly on the run's fastest frame (a velocity seam)
 *
 * The phrase is centred on x: both braces move by half the width change. Pure state: bracketState(f) takes
 * the phrase widths; <Brackets> measures them (FontGate).
 */

/** House numbers: frames at 60 fps. */
export const BRACKETS = { jump: 0.66, settle60: 10, settleK: 9, run60: 60, pad: 0.28 } as const;

export type BracketWord = { at: number; w: number }; // the phrase from frame `at`, its width px

export type BracketsProps = {
  words: BracketWord[];
  pad: number; // px between the phrase and each brace
  mode?: 'insert' | 'peak';
  jump?: number; // insert: share of the move on the jump frame (house 0.66)
  settle?: number; // insert: 60 fps frames (house 10)
  run?: { frames?: number; ease?: Ease }; // peak: 60 fps frames (house 60) on E.strongInOut; the swap sits on its peak
  id?: string;
};

/** The braces' offsets from the centre (lx < 0 < rx, px, inner edges) and the phrase showing at frame f. Pure. */
export const bracketState = (frame: number, p: BracketsProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const F = fd(frame);
  const mode = p.mode ?? 'insert';
  let index = 0;
  for (let i = 0; i < p.words.length; i++) if (F >= p.words[i].at) index = i;
  let half = p.words[0].w / 2 + p.pad;
  for (let i = 1; i < p.words.length; i++) {
    const a = p.words[i - 1].w / 2 + p.pad;
    const b = p.words[i].w / 2 + p.pad;
    const at = p.words[i].at;
    let k = 0;
    if (mode === 'insert') {
      const j0 = at - 1; // the jump frame: one before the word
      if (F >= j0) {
        const js = p.jump ?? BRACKETS.jump;
        k = js + (1 - js) * expOut(BRACKETS.settleK)(clamp((frame - j0) / Math.max(1, f60x(p.settle ?? BRACKETS.settle60, fps))));
      }
    } else {
      const frames = Math.max(1, f60x(p.run?.frames ?? BRACKETS.run60, fps));
      const ease = p.run?.ease ?? E.strongInOut;
      const start = at - (peakFrame(ease, 0, frames) - 0); // place the run so its fastest frame is the swap
      k = ease(clamp((frame - start) / frames));
    }
    half += mix(a, b, k) - a;
  }
  return { lx: -half, rx: half, index };
};

/** Sync: jump frames (a click) and word swaps (insert), or run starts and swap peaks (peak). */
export const bracketFrames = (p: BracketsProps, film?: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const frames = Math.max(1, f60x(p.run?.frames ?? BRACKETS.run60, fps));
  return p.words.slice(1).map((w) =>
    (p.mode ?? 'insert') === 'insert' ? { jump: w.at - 1, swap: w.at } : { run: w.at - peakFrame(p.run?.ease ?? E.strongInOut, 0, frames), swap: w.at },
  );
};

/** Draws `phrases[index]` centred on (x, y) between two brace glyphs that move on their own. */
export const Brackets: React.FC<
  Omit<BracketsProps, 'words' | 'pad'> & { frame: number; phrases: { at: number; text: string }[]; x: number; y: number; font: { size: number; weight: number; track: number; family?: string; color: string }; glyphs?: [string, string]; braceColor?: string; pad?: number }
> = (props) => {
  const film = useFilm();
  const f = props.font;
  const fam = f.family ?? FONT.text;
  const words = props.phrases.map((ph) => ({ at: ph.at, w: measureTracked(ph.text, f.size, f.weight, f.track, fam) }));
  const pad = props.pad ?? f.size * BRACKETS.pad;
  const s = bracketState(props.frame, { ...props, words, pad }, film);
  const [g0, g1] = props.glyphs ?? ['{', '}'];
  const bw = measureTracked(g1, f.size, f.weight, f.track, fam);
  const lh = f.size * 1.2;
  const st: React.CSSProperties = { position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: fam, fontSize: f.size, fontWeight: f.weight, letterSpacing: `${f.track}em`, lineHeight: `${lh}px`, color: f.color };
  const ph = props.phrases[s.index];
  const pw = words[s.index].w;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height }}>
      <div style={{ ...st, color: props.braceColor ?? f.color, transform: `translate(${(props.x + s.lx - bw).toFixed(2)}px, ${(props.y - lh / 2).toFixed(2)}px)` }}>{g0}</div>
      <div style={{ ...st, transform: `translate(${(props.x - pw / 2).toFixed(2)}px, ${(props.y - lh / 2).toFixed(2)}px)` }}>{ph.text}</div>
      <div style={{ ...st, color: props.braceColor ?? f.color, transform: `translate(${(props.x + s.rx).toFixed(2)}px, ${(props.y - lh / 2).toFixed(2)}px)` }}>{g1}</div>
    </div>
  );
};

/** Insert: each jump frame and word cut is a step. Peak: each swap is a velocity seam (the change hides in the speed). */
export const declares = (p?: Partial<BracketsProps>, film?: Partial<FilmCtx>): Declares => {
  if (!p?.words || p.words.length < 2) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const fr = bracketFrames(p as BracketsProps, film);
  const id = p.id ?? 'brackets';
  if ((p.mode ?? 'insert') === 'insert') return { stepped: fr.flatMap((r, i) => [{ from: (r as { jump: number }).jump, to: r.swap + 1, id: `${id}-${i}` }]), flashes: [], cameraBlur: [], seams: [] };
  const seams: Seam[] = fr.map((r, i) => ({ at: r.swap, kind: 'velocity', carry: 'x', id: `${id}-${i}` }));
  return { stepped: [], flashes: [], cameraBlur: [], seams };
};
