import React from 'react';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { clamp, E, type Ease, M, perFrame, prog } from '../lib/anim';
import { defocusMix, DEFOCUS_SHARP } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';
import { blurFilter } from './Oversize';

type Role = keyof typeof TYPE;

/**
 * A word (or the parts of a UI string) coming into focus instead of fading in.
 *
 *   word  the word shows on its first frame soft (house sigma 4.6 px at 1080p) and a little to the side
 *         (house 55 px from the right); the defocus falls to about 0.41 of itself a frame at 30 fps (sharp after
 *         three frames) while the word slides home on M.focusSlide (front-loaded: most of the slide in
 *         the first frames, then a long, quiet landing).
 *   ui    the parts of a product string (a back button, a field, an address) focus in one after another,
 *         left to right on an uneven stagger, each slower at first and snapping sharp at the end (more
 *         than a third of the contrast arrives in its last two frames); the last part takes 1.6x longer.
 *
 * The defocus is drawn as at most two copies at fixed ladder radii (lib/defocus), the group faded as one,
 * never an animated blur radius. A word arriving this way pairs with the transient accent (it lands in
 * the accent and cools: fx/Words accent).
 */

/** House numbers: word mode in 1080p px, frames at 30 fps; ui mode offsets and lengths at 60 fps. */
export const FOCUS_HOUSE = {
  word: { sigma0: 4.6, ratio: 0.41, ratioFps: 30, slide: 55, slideS: 7 / 30, fadeS: 1 / 30 },
  ui: { offsets60: [0, 2, 5, 6, 10], part60: 10, lastScale: 1.6, sigma0: 4, linear: 0.56, power: 8 },
} as const;

export type FocusOpts = {
  start: number; // the 0 frame: the word (or the first part) shows from start + 1
  mode?: 'word' | 'ui';
  sigma0?: number; // px at 1080p on the first visible frame (word) / at a part's start (ui)
  ratio?: number; // word: defocus kept per frame at ratioFps (house 0.41)
  ratioFps?: number;
  slide?: number; // word: px at 1080p it lands from (+ = from the right) (house 55)
  slideFrames?: number; // word: film frames of the slide (house 7/30 s)
  slideEase?: Ease; // word: house M.focusSlide
  fadeFrames?: number; // word: opacity ramp, film frames (house 1/30 s: on at once)
  parts?: number; // ui: how many parts (default the offsets' length)
  offsets?: number[]; // ui: film frames from start per part (house 0/+2/+5/+6/+10 at 60 fps)
  partFrames?: number; // ui: film frames per part (house 10 at 60 fps; 10-16)
  lastScale?: number; // ui: the last part's length x (house 1.6)
  linear?: number; // ui: share of the contrast that arrives linearly (house 0.56); the rest snaps in on t^power
  power?: number; // ui: house 8 (about 40 % of the contrast lands in the last two frames)
};

export type FocusPart = { sigma: number; opacity: number; contrast: number; x: number; t: number; visible: boolean };
export type FocusState = { parts: FocusPart[]; sharpFrame: number };

/**
 * The focus state at frame f (pure, closed form). Word mode returns one part: sigma (px at 1080p, 0 once
 * under the sharp threshold), x (px at 1080p from rest), opacity. Ui mode returns one entry per part, with
 * `contrast` 0..1 (drawn as opacity) and a sigma that clears with it.
 */
export const focusState = (f: number, o: FocusOpts, film?: Partial<FilmCtx>): FocusState => {
  const fps = fpsOf(film);
  if ((o.mode ?? 'word') === 'word') {
    const H = FOCUS_HOUSE.word;
    const r = perFrame(o.ratio ?? H.ratio, o.ratioFps ?? H.ratioFps, fps);
    const s0 = o.sigma0 ?? H.sigma0;
    const k = f - (o.start + 1); // 0 on the first visible frame
    const visible = f > o.start;
    const raw = visible ? s0 * r ** Math.max(0, k) : s0;
    const sigma = visible && raw >= DEFOCUS_SHARP ? raw : visible ? 0 : s0;
    const sd = o.slideFrames ?? H.slideS * fps;
    const x = (o.slide ?? H.slide) * (1 - prog(f, o.start, o.start + sd, o.slideEase ?? M.focusSlide));
    const fadeF = o.fadeFrames ?? H.fadeS * fps;
    const opacity = visible ? (fadeF <= 1 ? 1 : prog(f, o.start, o.start + fadeF, E.snapOut)) : 0;
    const sharpFrame = o.start + 1 + Math.max(0, Math.ceil(Math.log(DEFOCUS_SHARP / s0) / Math.log(r)));
    return { parts: [{ sigma, opacity, contrast: opacity, x, t: clamp(k / Math.max(1, sd)), visible }], sharpFrame };
  }
  const H = FOCUS_HOUSE.ui;
  const offs = o.offsets ?? H.offsets60.map((v) => f60x(v, fps));
  const n = o.parts ?? offs.length;
  const pf = o.partFrames ?? f60x(H.part60, fps);
  const a = o.linear ?? H.linear;
  const q = o.power ?? H.power;
  const s0 = o.sigma0 ?? H.sigma0;
  let sharpFrame = o.start;
  const parts = Array.from({ length: n }, (_, i): FocusPart => {
    const st = o.start + (offs[i] ?? offs[offs.length - 1] ?? 0);
    const d = pf * (i === n - 1 ? (o.lastScale ?? H.lastScale) : 1);
    sharpFrame = Math.max(sharpFrame, Math.ceil(st + d));
    const t = clamp((f - st) / d);
    const contrast = a * t + (1 - a) * t ** q;
    const sigma = t >= 1 ? 0 : s0 * (1 - t) ** 2;
    return { sigma: sigma >= DEFOCUS_SHARP ? sigma : 0, opacity: contrast, contrast, x: 0, t, visible: f > st };
  });
  return { parts, sharpFrame };
};

/** Frames of a focus-in: first visible frame and the first fully sharp frame. */
export const focusFrames = (o: FocusOpts, film?: Partial<FilmCtx>) => {
  const s = focusState(o.start, o, film);
  return { shows: Math.floor(o.start) + 1, sharp: s.sharpFrame };
};

/** At most two fixed-radius copies of `node`, the group faded as one (a per-copy fade under-draws the blur). */
const Defocused: React.FC<{ sigmaPx: number; opacity: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ sigmaPx, opacity, children, style }) => {
  const copies = sigmaPx >= DEFOCUS_SHARP ? defocusMix(sigmaPx) : [{ level: 0, weight: 1 }];
  return (
    <span style={{ display: 'inline-block', position: 'relative', opacity, ...style }}>
      {copies.map((c, i) => (
        <span key={i} style={{ display: 'inline-block', position: i === 0 ? 'relative' : 'absolute', left: 0, top: 0, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? blurFilter(c.level) : undefined }}>
          {children}
        </span>
      ))}
    </span>
  );
};

/**
 * <FocusWord text start mode> draws focusState. Word mode: one word (or a short phrase) sliding home as
 * it sharpens. Ui mode: `text` split on `sep` (default '|') into parts set side by side, each focusing in
 * on its own offset; `gap` px between parts. Colour by CSS (`color`), so an accent can ride on top.
 */
export const FocusWord: React.FC<
  FocusOpts & {
    text: string;
    frame: number; // local frame
    role?: Role;
    size?: number;
    family?: string;
    color?: string;
    sep?: string;
    gap?: number;
    id?: string;
    style?: React.CSSProperties;
  }
> = ({ text, frame, role = 'display', size: sizeProp, family = FONT.text, color = C.ink, sep = '|', gap, id = 'focus', style, ...o }) => {
  const film = useFilm();
  const u = uOf(film);
  const size = sizeProp ?? TYPE[role].size * u;
  const s = focusState(frame, o, film);
  const base: React.CSSProperties = { ...typeStyle(role, size), fontFamily: family, color };
  if ((o.mode ?? 'word') === 'word') {
    const p = s.parts[0];
    if (!p.visible) return null;
    return (
      <span data-text={id} style={{ ...base, display: 'inline-block', transform: `translate3d(${(p.x * u).toFixed(4)}px, 0, 0)`, ...style }}>
        <Defocused sigmaPx={p.sigma * u} opacity={p.opacity}>
          {text}
        </Defocused>
      </span>
    );
  }
  const parts = text.split(sep);
  const g = gap ?? measureTracked(' ', size, TYPE[role].weight, TYPE[role].track, family);
  return (
    <span data-text={id} style={{ ...base, display: 'inline-flex', gap: g, ...style }}>
      {parts.map((t, i) => {
        const p = s.parts[i] ?? s.parts[s.parts.length - 1];
        return (
          <Defocused key={i} sigmaPx={p.sigma * u} opacity={p.visible ? p.opacity : 0}>
            {t}
          </Defocused>
        );
      })}
    </span>
  );
};

/** A focus-in is continuous (fixed ladder copies cross-faded): it declares nothing. */
export const declares = (_props?: Partial<FocusOpts>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
