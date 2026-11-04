import React from 'react';
import { FONT, TYPE, typeStyle } from '../brand/tokens';
import { clamp, E, type Ease, fd, perFrame, prog } from '../lib/anim';
import { DEFOCUS_SHARP, defocusMix } from '../lib/defocus';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import type { Declares } from '../timeline';
import { blurFilter } from './Oversize';

type Role = keyof typeof TYPE;

/**
 * Two ways a held line answers a new word, both built around ONE decisive frame:
 *
 *   make room   the held words creep (speed rising frame by frame), then cover most of the distance in a
 *               single frame (house 67 %), then settle on a decaying tail. The new word arrives in the
 *               open space. An extreme in-out reflow: nothing slides sideways for long, the room appears.
 *   scale snap  on the frame the last word lands, the whole line jumps larger in one frame (house x2.2);
 *               the words already read settle a few pixels on an arrive curve while a short defocus
 *               clears; the new word fades in over 4-5 frames with a small rise.
 *
 * The jump frames are designed steps: declares() lists them, so blur sampling takes one sample there and
 * the checks read them as craft, not as a pop. State functions are pure and closed form: whole frames
 * for the stepped parts, linear between whole frames inside the creep and the tail.
 */

/** House numbers (seconds and per-frame ratios written at 25 fps, converted to the film's rate). */
export const LINESNAP_HOUSE = {
  room: { creepS: 0.28, creepShare: 0.172, rise: 28, shape: 1.5, jumpShare: 0.675, tailS: 0.24, ratio: 0.47, ratioEnd: 0.8, tailShape: 0.4, fpsRef: 25 },
  snap: { factor: 2.2, settleS: 7 / 30, settlePx: 31, sigmaPeak: 3.1, sigmaS: 7 / 30, wordFadeS: 5 / 30, wordFrom: 0.16, wordRisePx: 11 },
} as const;

export type MakeRoomOpts = {
  start: number; // the creep's 0 frame; the first creep step shows on start + 1
  distance: number; // px the held words travel (negative = to the left)
  creep?: {
    frames?: number; // whole film frames of creep (house 0.28 s)
    v0?: number; // px per film frame on the first creep frame (with v1: explicit speeds; else from share and rise)
    v1?: number; // px per film frame on the last creep frame
    share?: number; // share of the distance the creep covers (house 0.172)
    rise?: number; // last creep speed / first (house 28)
    shape?: number; // 1 = speed grows geometrically; > 1 starts slower and ends faster (house 1.5)
  };
  jumpShare?: number; // share of the distance covered on the one jump frame (house 0.675)
  tail?: {
    frames?: number; // whole film frames of the tail (house 0.24 s)
    ratio?: number; // each tail step / the one before, at fpsRef (house 0.47 on the first tail frame)
    ratioEnd?: number; // the ratio on the last tail frame (house 0.8: the settle slows as it lands)
    shape?: number; // how the ratio travels from ratio to ratioEnd (house 0.4)
  };
  fpsRef?: number; // the rate `ratio` / `ratioEnd` are written at (house 25)
};

export type MakeRoomState = {
  x: number; // px travelled (signed like distance)
  p: number; // 0..1 of the distance
  v: number; // px moved on this whole frame (signed)
  phase: 'before' | 'creep' | 'jump' | 'tail' | 'rest';
  jumpFrame: number; // the first frame drawn at the jumped position
  end: number; // the first frame at rest
};

/** The per-frame steps of a make-room move (px, signed), first creep step first. Pure. */
export const makeRoomSteps = (o: MakeRoomOpts, film?: Partial<FilmCtx>): { steps: number[]; creep: number; jumpIndex: number } => {
  const fps = fpsOf(film);
  const H = LINESNAP_HOUSE.room;
  const D = o.distance;
  const n = Math.max(1, Math.round(o.creep?.frames ?? H.creepS * fps));
  const m = Math.max(1, Math.round(o.tail?.frames ?? H.tailS * fps));
  const ref = o.fpsRef ?? H.fpsRef;
  const steps: number[] = [];
  let creep = 0;
  if (o.creep?.v0 !== undefined && o.creep?.v1 !== undefined) {
    const g = o.creep.shape ?? 1;
    const v0 = Math.abs(o.creep.v0);
    const v1 = Math.abs(o.creep.v1);
    for (let k = 0; k < n; k++) steps.push(Math.sign(D) * v0 * (v1 / Math.max(1e-9, v0)) ** ((n > 1 ? k / (n - 1) : 1) ** g));
  } else {
    const g = o.creep?.shape ?? H.shape;
    const rise = o.creep?.rise ?? H.rise;
    const raw = Array.from({ length: n }, (_, k) => rise ** ((n > 1 ? k / (n - 1) : 1) ** g));
    const sum = raw.reduce((a, b) => a + b, 0);
    const share = o.creep?.share ?? H.creepShare;
    for (const r of raw) steps.push((D * share * r) / sum);
  }
  creep = steps.reduce((a, b) => a + b, 0);
  const jump = D * (o.jumpShare ?? H.jumpShare);
  steps.push(jump);
  const rest = D - creep - jump;
  const r1 = perFrame(o.tail?.ratio ?? H.ratio, ref, fps);
  const rm = perFrame(o.tail?.ratioEnd ?? o.tail?.ratio ?? H.ratioEnd, ref, fps);
  const h = o.tail?.shape ?? H.tailShape;
  const w = [1];
  for (let k = 2; k <= m; k++) w.push(w[k - 2] * (r1 + (rm - r1) * (m > 2 ? ((k - 2) / (m - 2)) ** h : 1)));
  const ws = w.reduce((a, b) => a + b, 0);
  for (const x of w) steps.push((rest * x) / ws);
  return { steps, creep, jumpIndex: n };
};

/**
 * The make-room move at frame f (pure, closed form). Steps land on whole frames: frame start + k shows the
 * first k steps; inside the creep and the tail a fractional frame interpolates linearly, the jump switches
 * on its whole frame (fd), so motion-blur sub-samples never smear the designed step.
 */
export const makeRoomState = (f: number, o: MakeRoomOpts, film?: Partial<FilmCtx>): MakeRoomState => {
  const { steps, jumpIndex } = makeRoomSteps(o, film);
  const cum = [0];
  for (const s of steps) cum.push(cum[cum.length - 1] + s);
  const total = steps.length;
  const jumpFrame = o.start + jumpIndex + 1;
  const end = o.start + total;
  const t = f - o.start;
  let x: number;
  if (t <= 0) x = 0;
  else if (t >= total) x = o.distance;
  else {
    const k = Math.floor(t);
    const u = t - k;
    x = k === jumpIndex ? cum[fd(t) >= jumpIndex + 1 ? jumpIndex + 1 : jumpIndex] : cum[k] + (cum[k + 1] - cum[k]) * u;
  }
  const K = clamp(fd(t), 0, total);
  const v = K >= 1 ? cum[K] - cum[K - 1] : 0;
  const phase: MakeRoomState['phase'] = t <= 0 ? 'before' : K <= jumpIndex ? 'creep' : K === jumpIndex + 1 ? 'jump' : K < total ? 'tail' : 'rest';
  return { x, p: o.distance ? x / o.distance : 1, v, phase, jumpFrame, end };
};

export type ScaleSnapOpts = {
  at: number; // the jump frame: the first frame drawn large (the new word's first frame)
  factor?: number; // the one-frame scale jump (house 2.2)
  sigmas?: number[]; // defocus per frame from `at`, px at 1080p (explicit; else peak and frames)
  sigmaPeak?: number; // px at 1080p (house 3.1), falling on a half cosine
  sigmaFrames?: number; // film frames until sharp (house 7/30 s)
  settle?: { px?: number; frames?: number; ease?: Ease }; // the read words land: px at 1080p (house 31, signed: + = they start right of rest), film frames (house 7/30 s), curve (house E.glideOut)
  word?: { frames?: number; from?: number; rise?: number; ease?: Ease }; // the new word: fade film frames (house 5/30 s) from opacity `from` (house 0.16), rise px at 1080p on screen (house 11), curve (house E.glideOut)
};

export type ScaleSnapState = {
  scale: number; // 1 before `at`, factor from it
  settleX: number; // px at 1080p the read words still sit from rest (scaled by the caller's u)
  sigma: number; // px at 1080p
  wordOpacity: number; // the new word
  wordY: number; // px at 1080p below rest (the new word's rise)
  snapped: boolean;
};

/** The scale snap at frame f (pure). The scale switches on the whole frame (fd); the rest is continuous. */
export const scaleSnapState = (f: number, o: ScaleSnapOpts, film?: Partial<FilmCtx>): ScaleSnapState => {
  const fps = fpsOf(film);
  const H = LINESNAP_HOUSE.snap;
  const snapped = fd(f) >= o.at;
  const factor = o.factor ?? H.factor;
  const sd = o.settle?.frames ?? H.settleS * fps;
  const se = o.settle?.ease ?? E.glideOut;
  const settleX = snapped ? (o.settle?.px ?? H.settlePx) * (1 - prog(f, o.at, o.at + sd, se)) : (o.settle?.px ?? H.settlePx);
  let sigma = 0;
  if (snapped) {
    const k = f - o.at;
    if (o.sigmas) {
      const i = Math.floor(k);
      const a = o.sigmas[i] ?? 0;
      const b = o.sigmas[i + 1] ?? 0;
      sigma = i < 0 ? 0 : a + (b - a) * (k - i);
    } else {
      const n = o.sigmaFrames ?? H.sigmaS * fps;
      sigma = k >= n ? 0 : (o.sigmaPeak ?? H.sigmaPeak) * 0.5 * (1 + Math.cos((Math.PI * Math.max(0, k)) / n));
    }
  }
  const wf = o.word?.frames ?? H.wordFadeS * fps;
  const from = o.word?.from ?? H.wordFrom;
  const wp = snapped ? prog(f, o.at, o.at + wf, o.word?.ease ?? E.glideOut) : 0;
  const wordOpacity = snapped ? from + (1 - from) * wp : 0;
  const wordY = (o.word?.rise ?? H.wordRisePx) * (1 - wp);
  return { scale: snapped ? factor : 1, settleX, sigma, wordOpacity, wordY, snapped };
};

/** The designed step frames: the make-room jump and the scale snap. */
export const lineSnapFrames = (o: { room?: MakeRoomOpts; snap?: ScaleSnapOpts }, film?: Partial<FilmCtx>) => ({
  jump: o.room ? makeRoomState(o.room.start, o.room, film).jumpFrame : undefined,
  roomEnd: o.room ? makeRoomState(o.room.start, o.room, film).end : undefined,
  snap: o.snap?.at,
});

export type LineSnapProps = {
  frame: number; // local frame
  held: string; // the words already on screen
  word: string; // the arriving word
  mode: 'room' | 'snap';
  room?: Omit<MakeRoomOpts, 'distance'> & { distance?: number }; // distance default: the room the new word needs
  wordAt?: number; // room mode: the frame the new word shows (default: the jump frame)
  snap?: ScaleSnapOpts;
  role?: Role;
  size?: number;
  family?: string;
  weight?: number; // the face's weight (default the role's); measuring and drawing both use it
  color?: string;
  wordColor?: string;
  align?: 'left' | 'center'; // where the finished line sits around x (default centre)
  x?: number; // px in the parent: the finished line's centre (or left edge); default the frame's centre
  top?: number; // px in the parent: top of the line box; default centred
  origin?: 'left' | 'center' | 'right'; // snap mode: the scale's origin on the line (default: the line's centre; 'right' keeps the new word's end in place and pushes the read words out to the left)
  id?: string;
  style?: React.CSSProperties;
};

/**
 * A held line and its next word, making room or snapping larger. Room mode: the held words travel the
 * new word's room on makeRoomState (centred: half its width plus a space, to the left) and the new word
 * cuts on in the open space at `wordAt`. Snap mode: the line is laid out finished; before `snap.at` the
 * new word is hidden; on `at` the line jumps `factor` larger, the read words settle and a short defocus
 * clears (at most two fixed ladder copies), the new word fades in with a small rise. Call under FontGate.
 */
export const LineSnap: React.FC<LineSnapProps> = ({ frame, held, word, mode, room, wordAt, snap, role = 'display', size: sizeProp, family = FONT.text, color, wordColor, align = 'center', x: xProp, top: topProp, origin = 'center', id = 'linesnap', weight: weightProp, style }) => {
  const film = useFilm();
  const u = uOf(film);
  const size = sizeProp ?? TYPE[role].size * u;
  const { track, lead } = TYPE[role];
  const weight = weightProp ?? TYPE[role].weight;
  const w = (s: string) => measureTracked(s, size, weight, track, family) - track * size;
  const full = `${held} ${word}`;
  const wFull = w(full);
  const wHeld = w(held);
  const wordLeft = measureTracked(`${held} `, size, weight, track, family);
  const cx = xProp ?? film.width / 2;
  const left = align === 'center' ? cx - wFull / 2 : cx;
  const top = topProp ?? film.height / 2 - (size * lead) / 2;
  const F = fd(frame);
  if (mode === 'room') {
    const dist = room?.distance ?? (align === 'center' ? -(wFull - wHeld) / 2 : 0);
    const ro: MakeRoomOpts = { start: room?.start ?? 0, ...room, distance: dist };
    const s = makeRoomState(frame, ro, film);
    const show = F >= (wordAt ?? s.jumpFrame);
    const heldLeft = left - dist + s.x; // the held words start where a centred held line sits
    return (
      <div style={{ position: 'absolute', left: 0, top: 0, ...style }}>
        <span data-text={`${id}.held`} style={{ ...typeStyle(role, size), fontWeight: weight, fontFamily: family, color, position: 'absolute', left: 0, top: 0, transform: `translate3d(${heldLeft.toFixed(3)}px, ${top.toFixed(3)}px, 0)`, willChange: 'transform' }}>
          {held}
        </span>
        {show && (
          <span data-text={`${id}.word`} style={{ ...typeStyle(role, size), fontWeight: weight, fontFamily: family, color: wordColor ?? color, position: 'absolute', left: 0, top: 0, transform: `translate(${(left + wordLeft).toFixed(3)}px, ${top.toFixed(3)}px)` }}>
            {word}
          </span>
        )}
      </div>
    );
  }
  const so: ScaleSnapOpts = snap ?? { at: 0 };
  const s = scaleSnapState(frame, so, film);
  const ox = left + (origin === 'left' ? 0 : origin === 'right' ? wFull : wFull / 2);
  const oy = top + (size * lead) / 2;
  // the settle and the rise sit inside the scaled container (on-screen px divide by the scale); the defocus
  // copies wrap it from outside, so their ladder radii are on-screen px (a radius inside a x2.2 scale would
  // lose every on-screen sigma under about 1.1 px to the sharp threshold). The two copies add in an isolated group
  // (plus-lighter, each at its weight), so a transparent text layer is the weighted mix: a second copy drawn over
  // an opaque first one would add ink and read as more blur on a light weight and as less near the sharp end.
  const k = s.scale;
  const copies = s.sigma * u >= DEFOCUS_SHARP ? defocusMix(s.sigma * u) : [{ level: 0, weight: 1 }];
  const line = (key: number, level: number, opacity: number) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, opacity, filter: level > 0 ? blurFilter(level) : undefined, mixBlendMode: key > 0 ? 'plus-lighter' : undefined }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `scale(${k.toFixed(6)})` }}>
        <span style={{ ...typeStyle(role, size), fontWeight: weight, fontFamily: family, color, position: 'absolute', left: 0, top: 0, transform: `translate(${(left + (s.settleX * u) / k).toFixed(3)}px, ${top.toFixed(3)}px)` }}>{held}</span>
        {s.snapped && (
          <span style={{ ...typeStyle(role, size), fontWeight: weight, fontFamily: family, color: wordColor ?? color, position: 'absolute', left: 0, top: 0, opacity: s.wordOpacity, transform: `translate(${(left + wordLeft).toFixed(3)}px, ${(top + (s.wordY * u) / k).toFixed(3)}px)` }}>{word}</span>
        )}
      </div>
    </div>
  );
  return (
    <div data-text={id} style={{ position: 'absolute', left: 0, top: 0, width: film.width, height: film.height, isolation: copies.length > 1 ? 'isolate' : undefined, ...style }}>
      {copies.map((c, i) => line(i, c.level, c.weight))}
    </div>
  );
};

/**
 * What a LineSnap instance does on purpose: the make-room jump frame and the scale-snap frame are
 * designed one-frame steps (stepped ranges of one frame), never motion-blurred into a smear.
 */
export const declares = (p?: { room?: MakeRoomOpts; snap?: ScaleSnapOpts; mode?: 'room' | 'snap'; id?: string }, film?: Partial<FilmCtx>): Declares => {
  const out: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (!p) return out;
  const id = p.id ?? 'linesnap';
  if (p.room && p.room.distance !== undefined && (p.mode ?? 'room') === 'room') {
    const j = makeRoomState(p.room.start, p.room, film).jumpFrame;
    out.stepped?.push({ from: j, to: j + 1, id });
  }
  if (p.snap && (p.mode ?? 'snap') === 'snap') out.stepped?.push({ from: p.snap.at, to: p.snap.at + 1, id });
  return out;
};

/** House numbers at a film's rate (frames), for timelines that schedule around a snap. */
export const lineSnapHouse = (fps: number) => ({
  creepFrames: Math.round(LINESNAP_HOUSE.room.creepS * fps),
  tailFrames: Math.round(LINESNAP_HOUSE.room.tailS * fps),
  settleFrames: LINESNAP_HOUSE.snap.settleS * fps,
  sigmaFrames: LINESNAP_HOUSE.snap.sigmaS * fps,
  wordFade: f60x(10, fps),
});
