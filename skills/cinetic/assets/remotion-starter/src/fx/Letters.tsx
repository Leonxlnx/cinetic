import React from 'react';
import { C, FONT, TYPE, typeStyle } from '../brand/tokens';
import { clamp, E, type Ease, fd, M, prog } from '../lib/anim';
import { mixColor, mixRgb } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { baselineOf, measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';

type Role = keyof typeof TYPE;

/**
 * Letter by letter, for the ONE word that earns it: a wordmark, a product name, the payoff. Film copy
 * arrives in words and fragments (fx/Words, fx/Chain); letters are for marks.
 *
 *   build  the first letter grows from its baseline (M.letterGrow, 7 frames at 30 fps), then the others
 *          fade in a little to the right (3.5 frames), slide home on M.letterSlide (8 frames each, 2 frames
 *          apart), darkening from a
 *          light grey to the ink on an S-curve a little longer than the slide (E.stdInOut, 12 frames);
 *          when the word is complete it settles about 9 % smaller as one (E.glideOut, 20 frames).
 *   arc    each letter swings up into place on a short arc: it shows small and turned (house 25 degrees,
 *          0.35x) and lands on M.letterArc (about 4 % over), 5 frames each, 1 frame apart: a quick ripple.
 *   pop    each letter cuts on and rises 0.19 em on E.snapOut, about 1.4 frames apart at 30 fps:
 *          the letters of a name arriving while a lockup slides.
 *
 * Tracking as a device: `tracking` opens the spacing and closes it on arrival (house +0.024 em a gap,
 * closing over 10 frames at 30 fps on E.glideOut: the word tightens about 3 % as it lands); `collapse`
 * is a tracking-collapse exit: the letters pull together on E.buildIn over 5 frames at 30 fps and the
 * word is cut on its last frame, at speed. Positions come from the real font's prefix widths (FontGate),
 * so kerning holds; every letter is its own transform.
 */

/** House numbers, frames at 30 fps (converted with the film's rate), sizes in em or px at 1080p. */
export const LETTERS_HOUSE = {
  build: { first30: 7, gap30: 4.5, stagger30: 2, dur30: 8.25, appear30: 3.5, slideEm: 0.62, greyOfPaper: 0.78, ink30: 12.25, inkLead30: -2.07, settleShrink: 0.092, settle30: 20, settleGap30: 2 }, // the arriving grey: 78 % of the way from the ink to the paper
  arc: { stagger30: 1, dur30: 5, angle: 25, from: 0.35, pivotEm: [0.9, 1.1] as [number, number] },
  pop: { stagger30: 1.4, dur30: 6, riseEm: 0.19 },
  tracking: { fromEm: 0.024, dur30: 10 },
  collapse: { dur30: 5, toEm: -0.5 },
} as const;

export type LettersOpts = {
  text: string;
  start: number; // the 0 frame of the first letter (it shows from start + 1)
  mode?: 'build' | 'arc' | 'pop';
  onsets?: number[]; // per letter: its 0 frame (overrides start + stagger)
  stagger?: number; // film frames between letters
  dur?: number; // film frames per letter
  ease?: Ease; // the letter's arrival curve (build: M.letterSlide; arc: M.letterArc; pop: E.snapOut)
  // build
  firstFrames?: number; // the first letter's growth (house 7 at 30 fps)
  firstEase?: Ease; // house M.letterGrow
  firstGap?: number; // film frames from the first letter's end of growth to the second letter (house 3 at 30 fps)
  slide?: number; // em the letters slide in from (+ = from the right; house 0.62)
  appear?: number; // build: film frames a letter fades in, waiting at its start offset, before it slides (house 3.5 at 30 fps)
  grey?: string; // the colour a letter arrives in (house a light grey); it darkens to `color` on the arrival curve (or inkEase over inkDur)
  inkEase?: Ease; // build: the darkening's curve (house E.stdInOut)
  inkDur?: number; // build: film frames of the darkening (house 12.25 at 30 fps)
  inkLead?: number; // build: film frames the darkening starts after the letter's 0 frame (house -2 at 30 fps: under way when it shows)
  color?: string; // the ink
  settle?: false | { at?: number; shrink?: number; frames?: number; ease?: Ease }; // the whole word settles smaller once complete
  // arc
  angle?: number; // deg the letter starts turned (house 25)
  from?: number; // start scale (house 0.35)
  turn?: { frames?: number; ease?: Ease }; // arc: the rotation's own length and curve (default the arrival's): a turn that lands after the scale
  pivot?: [number, number]; // em from the letter's baseline centre: the centre of its arc (house [0.9, 1.1]: below right, so a turned letter waits up and to the right)
  // pop
  rise?: number; // em (house 0.19: 24 px on a 128 px wordmark)
  // tracking
  tracking?: false | { from?: number; to?: number; at?: number; frames?: number; ease?: Ease }; // em per gap
  collapse?: { at: number; frames?: number; to?: number; ease?: Ease }; // tracking-collapse exit: the word is cut after at + frames
};

export type LetterState = {
  x: number; // em from the letter's rest (the tracking offset comes on top, see `track`)
  y: number; // em (down)
  sx: number;
  sy: number;
  rot: number; // deg
  opacity: number;
  color: string;
  p: number; // the arrival's eased progress
  visible: boolean;
};

export type LettersState = {
  letters: LetterState[];
  track: number; // em per gap added to the spacing (tracking + collapse)
  scale: number; // the whole word's scale (build settle)
  onsets: number[];
  complete: number; // the frame every letter has landed
  cut?: number; // the collapse's last drawn frame
};

const glyphs = (t: string) => [...t];

/**
 * Where a letter turned `rot` degrees (clockwise on screen) about the arc's centre sits, em from its rest
 * (its baseline centre): pivot + R(rot) (rest - pivot). Pure; the curve tests read it.
 */
export const arcOffset = (rot: number, pivot: readonly [number, number] = LETTERS_HOUSE.arc.pivotEm): [number, number] => {
  const a = (rot * Math.PI) / 180;
  const vx = -pivot[0];
  const vy = -pivot[1];
  return [pivot[0] + vx * Math.cos(a) - vy * Math.sin(a), pivot[1] + vx * Math.sin(a) + vy * Math.cos(a)];
};

/** Each letter's 0 frame (absolute). The component and the sound cues read the same list. */
export const letterFrames = (o: LettersOpts, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  const n = glyphs(o.text).length;
  if (o.onsets) return glyphs(o.text).map((_, i) => o.onsets?.[i] ?? o.onsets?.[o.onsets.length - 1] ?? o.start);
  const mode = o.mode ?? 'build';
  if (mode === 'build') {
    const H = LETTERS_HOUSE.build;
    const ff = o.firstFrames ?? f60x(H.first30 * 2, fps);
    const g = o.firstGap ?? f60x(H.gap30 * 2, fps);
    const st = o.stagger ?? f60x(H.stagger30 * 2, fps);
    return Array.from({ length: n }, (_, i) => (i === 0 ? o.start : Math.round(o.start + ff + g + (i - 1) * st)));
  }
  const st = o.stagger ?? f60x((mode === 'arc' ? LETTERS_HOUSE.arc.stagger30 : LETTERS_HOUSE.pop.stagger30) * 2, fps);
  return Array.from({ length: n }, (_, i) => Math.round(o.start + i * st));
};

/**
 * The state of every letter at frame f (pure, closed form). Offsets and `track` (per gap) are em: multiply
 * by the type size. An arc letter's swing offset is arcOffset(rot, pivot). Under a collapse the word is not
 * drawn after its cut.
 */
export const letterState = (f: number, o: LettersOpts, film?: Partial<FilmCtx>): LettersState => {
  const fps = fpsOf(film);
  const mode = o.mode ?? 'build';
  const chars = glyphs(o.text);
  const onsets = letterFrames(o, film);
  const ink = o.color ?? C.ink;
  const letters: LetterState[] = [];
  let complete = 0;
  if (mode === 'build') {
    const H = LETTERS_HOUSE.build;
    const ff = o.firstFrames ?? f60x(H.first30 * 2, fps);
    const d = o.dur ?? f60x(H.dur30 * 2, fps);
    const ease = o.ease ?? M.letterSlide;
    const slide = o.slide ?? H.slideEm;
    const grey = o.grey ?? mixColor(ink, C.paper, H.greyOfPaper);
    chars.forEach((_, i) => {
      const s = onsets[i];
      if (i === 0) {
        const p = prog(f, s, s + ff, o.firstEase ?? M.letterGrow);
        complete = Math.max(complete, s + ff);
        letters.push({ x: 0, y: 0, sx: 1, sy: Math.max(0, p), rot: 0, opacity: f > s ? 1 : 0, color: ink, p, visible: f > s });
        return;
      }
      const p = prog(f, s, s + d, ease);
      complete = Math.max(complete, s + d);
      const ap = o.appear ?? f60x(H.appear30 * 2, fps);
      const shows = f > s - ap;
      const fadeIn = ap > 0 ? clamp((f - (s - ap)) / ap) : 1;
      // the darkening is its own S-curve, a touch longer than the slide and already under way on the first frame
      const il = s + (o.inkLead ?? f60x(H.inkLead30 * 2, fps));
      const pi = prog(f, il, il + (o.inkDur ?? f60x(H.ink30 * 2, fps)), o.inkEase ?? E.stdInOut);
      letters.push({ x: slide * (1 - p), y: 0, sx: 1, sy: 1, rot: 0, opacity: shows ? fadeIn : 0, color: mixRgb(grey, ink, clamp(pi)), p, visible: shows });
    });
  } else if (mode === 'arc') {
    const H = LETTERS_HOUSE.arc;
    const d = o.dur ?? f60x(H.dur30 * 2, fps);
    const ease = o.ease ?? M.letterArc;
    const a0 = o.angle ?? H.angle;
    const s0 = o.from ?? H.from;
    chars.forEach((_, i) => {
      const s = onsets[i];
      const p = prog(f, s, s + d, ease);
      const td = o.turn?.frames ?? d;
      complete = Math.max(complete, s + d, s + td);
      const rot = a0 * (1 - (o.turn ? prog(f, s, s + td, o.turn.ease ?? ease) : p));
      const sc = s0 + (1 - s0) * p;
      letters.push({ x: 0, y: 0, sx: sc, sy: sc, rot, opacity: f > s ? 1 : 0, color: ink, p, visible: f > s });
    });
  } else {
    const H = LETTERS_HOUSE.pop;
    const d = o.dur ?? f60x(H.dur30 * 2, fps);
    const ease = o.ease ?? E.snapOut;
    const rise = o.rise ?? H.riseEm;
    chars.forEach((_, i) => {
      const s = onsets[i];
      const p = prog(f, s, s + d, ease);
      complete = Math.max(complete, s + d);
      letters.push({ x: 0, y: rise * (1 - p), sx: 1, sy: 1, rot: 0, opacity: fd(f) > s ? 1 : 0, color: ink, p, visible: fd(f) > s });
    });
  }
  let scale = 1;
  if (mode === 'build' && o.settle !== false) {
    const H = LETTERS_HOUSE.build;
    const st = o.settle || {};
    const at = st.at ?? Math.ceil(complete + f60x(H.settleGap30 * 2, fps));
    scale = 1 - (st.shrink ?? H.settleShrink) * prog(f, at, at + (st.frames ?? f60x(H.settle30 * 2, fps)), st.ease ?? E.glideOut);
  }
  let track = 0;
  if (o.tracking) {
    const T = LETTERS_HOUSE.tracking;
    const tr = o.tracking;
    const at = tr.at ?? onsets[0];
    track = (tr.from ?? T.fromEm) + ((tr.to ?? 0) - (tr.from ?? T.fromEm)) * prog(f, at, at + (tr.frames ?? f60x(T.dur30 * 2, fps)), tr.ease ?? E.glideOut);
  }
  let cut: number | undefined;
  if (o.collapse) {
    const K = LETTERS_HOUSE.collapse;
    const fr = o.collapse.frames ?? f60x(K.dur30 * 2, fps);
    const q = prog(f, o.collapse.at, o.collapse.at + fr, o.collapse.ease ?? E.buildIn);
    track += ((o.collapse.to ?? K.toEm) - track) * q;
    cut = Math.ceil(o.collapse.at + fr);
    if (fd(f) > cut) letters.forEach((l) => { l.opacity = 0; l.visible = false; });
  }
  return { letters, track, scale, onsets, complete, cut };
};

/**
 * <Letters text start mode>: one word set from the real font's prefix widths, each letter its own
 * transform about its baseline centre. `align` places the word around x (default centre); the build
 * settle and the tracking shift letters about the word's centre.
 */
export const Letters: React.FC<
  LettersOpts & {
    frame: number; // local frame
    role?: Role;
    size?: number;
    family?: string;
    align?: 'left' | 'center';
    x?: number; // px in the parent (centre or left edge); default 0
    top?: number; // px in the parent: top of the line box; default 0
    id?: string;
    style?: React.CSSProperties;
  }
> = ({ frame, role = 'display', size: sizeProp, family = FONT.text, align = 'center', x = 0, top = 0, id = 'letters', style, ...o }) => {
  const film = useFilm();
  const u = uOf(film);
  const size = sizeProp ?? TYPE[role].size * u;
  const { weight, track: tk, lead } = TYPE[role];
  const s = letterState(frame, o, film);
  const chars = glyphs(o.text);
  const n = chars.length;
  const pre = chars.map((_, i) => measureTracked(chars.slice(0, i).join(''), size, weight, tk, family));
  const adv = chars.map((_, i) => measureTracked(chars.slice(0, i + 1).join(''), size, weight, tk, family) - pre[i]);
  const wordW = pre[n - 1] + adv[n - 1] - tk * size;
  const left0 = align === 'center' ? x - wordW / 2 : x;
  const cx = left0 + wordW / 2;
  const base = baselineOf(size, weight, lead, family);
  const mode = o.mode ?? 'build';
  const pv = o.pivot ?? LETTERS_HOUSE.arc.pivotEm;
  return (
    <div data-text={id} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${cx.toFixed(2)}px ${(top + base).toFixed(2)}px`, transform: s.scale !== 1 ? `scale(${s.scale.toFixed(6)})` : undefined, ...style }}>
      {chars.map((ch, i) => {
        const l = s.letters[i];
        if (!l.visible) return null;
        const gapShift = (i - (n - 1) / 2) * s.track * size;
        let lx = left0 + pre[i] + gapShift + l.x * size;
        let ly = top + l.y * size;
        if (mode === 'arc' && l.rot !== 0) {
          // swing about the arc's centre: the baseline centre turns around the pivot by the angle still to go
          const [ox, oy] = arcOffset(l.rot, pv);
          lx += ox * size;
          ly += oy * size;
        }
        return (
          <span
            key={i}
            style={{
              ...typeStyle(role, size),
              fontFamily: family,
              position: 'absolute',
              left: 0,
              top: 0,
              color: l.color,
              opacity: l.opacity,
              transformOrigin: `${(adv[i] / 2).toFixed(2)}px ${base.toFixed(2)}px`,
              transform: `translate3d(${lx.toFixed(3)}px, ${ly.toFixed(3)}px, 0) rotate(${l.rot.toFixed(3)}deg) scale(${l.sx.toFixed(5)}, ${l.sy.toFixed(5)})`,
              willChange: 'transform',
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/**
 * What a Letters instance does on purpose: a collapse exit is cut at speed on its last frame (a velocity
 * seam on the next frame, along x); pop letters cut on (each a one-frame step); build and arc are
 * continuous.
 */
export const declares = (p?: Partial<LettersOpts> & { id?: string }, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p || p.text === undefined || p.start === undefined) return out;
  const id = p.id ?? 'letters';
  const o = p as LettersOpts;
  if (p.mode === 'pop') for (const s of letterFrames(o, film)) out.stepped?.push({ from: s + 1, to: s + 2, id });
  if (p.collapse) {
    const fps = fpsOf(film);
    const cut = Math.ceil(p.collapse.at + (p.collapse.frames ?? f60x(LETTERS_HOUSE.collapse.dur30 * 2, fps)));
    out.seams?.push({ at: cut + 1, kind: 'velocity', carry: 'x', id });
  }
  return out;
};
