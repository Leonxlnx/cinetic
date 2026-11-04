import React from 'react';
import { Freeze, OffthreadVideo } from 'remotion';
import { clamp } from '../lib/anim';
import { type FilmCtx, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Speed-ramped footage: each clip plays fast at its ends and slow in its middle (a U of speed), and
 * consecutive clips join on their fastest frames, so the cut hides inside the blur of peak speed and
 * every clip breathes once. Speed is a multiple of real time (1 = as shot): house peak 2.4, trough
 * 0.3, a ratio of 8 between the fastest and the slowest frame, about a second of film per clip.
 * Footage shot at a high frame rate (120 fps and up) keeps the slow middle smooth; at the film's own
 * rate the trough repeats source frames.
 *
 * Every output frame shows exactly one source frame, picked in closed form from the integral of the
 * speed curve (rampSource), and drawn with <Freeze> around <OffthreadVideo>: no playback clock, so any
 * frame renders the same in any order.
 */
export type RampClip = {
  src: string; // the video (staticFile() or a URL)
  frames: number; // output frames this clip plays for
  from?: number; // where in the clip to start, seconds (default 0)
  srcFps?: number; // the clip's frame rate (default the film's)
  peak?: number; // speed at the clip's ends, x real time (house 2.4)
  trough?: number; // speed in its middle, x real time (house 0.3)
  dip?: number; // where the slowest moment sits, 0..1 of the clip (default 0.5)
};
export type FootageRampProps = {
  clips: RampClip[];
  start?: number; // frame the first clip starts on (default 0)
  join?: 'peak' | 'cut'; // 'peak' (default): clips join at full speed; 'cut': each clip's speed curve starts and ends at its trough instead (an ∩)
  fit?: 'cover' | 'contain';
  style?: React.CSSProperties;
  id?: string;
};

const HOUSE = { peak: 2.4, trough: 0.3 } as const;

/** Clip starts, joins (the first frame of each later clip) and the end, in output frames. */
export const rampFrames = (p: FootageRampProps) => {
  const starts: number[] = [];
  let t = p.start ?? 0;
  for (const c of p.clips) {
    starts.push(t);
    t += Math.max(1, Math.round(c.frames));
  }
  return { starts, joins: starts.slice(1), end: t };
};

/**
 * Speed (x real time) of a clip at local output time tau (0 .. frames): a raised-cosine U from `peak`
 * at the ends to `trough` at `dip` (an ∩ with join 'cut').
 */
export const rampSpeed = (tau: number, c: RampClip, join: 'peak' | 'cut' = 'peak') => {
  const N = Math.max(1, Math.round(c.frames));
  const pk = c.peak ?? HOUSE.peak;
  const tr = c.trough ?? HOUSE.trough;
  const d = clamp(c.dip ?? 0.5, 0.05, 0.95);
  const u = clamp(tau / N);
  const w = u < d ? (u / d) * 0.5 : 0.5 + ((u - d) / (1 - d)) * 0.5; // the dip mapped to the middle of one cosine period
  const g = (1 + Math.cos(2 * Math.PI * w)) / 2; // 1 at the ends, 0 at the dip
  return join === 'peak' ? tr + (pk - tr) * g : pk + (tr - pk) * g;
};

/** Source time (seconds from the clip's `from`) played by local output time tau, at film `fps`: the integral of the speed. Closed form. */
export const rampSeconds = (tau: number, c: RampClip, fps: number, join: 'peak' | 'cut' = 'peak') => {
  const N = Math.max(1, Math.round(c.frames));
  const pk = c.peak ?? HOUSE.peak;
  const tr = c.trough ?? HOUSE.trough;
  const d = clamp(c.dip ?? 0.5, 0.05, 0.95);
  const lo = join === 'peak' ? tr : pk;
  const amp = join === 'peak' ? pk - tr : tr - pk;
  // integral of (1 + cos 2 pi w) / 2 over tau, piecewise linear w(tau) with slope 0.5 / (d N) then 0.5 / ((1 - d) N)
  const G = (x: number) => x / 2 + Math.sin(2 * Math.PI * x) / (4 * Math.PI); // antiderivative in w
  const t = clamp(tau, 0, N);
  const t1 = d * N;
  let I: number;
  if (t <= t1) I = (t1 / 0.5) * (G((t / t1) * 0.5) - G(0));
  else I = (t1 / 0.5) * (G(0.5) - G(0)) + (((1 - d) * N) / 0.5) * (G(0.5 + ((t - t1) / ((1 - d) * N)) * 0.5) - G(0.5));
  return (lo * t + amp * I) / fps;
};

export type RampState = { clip: number; local: number; seconds: number; srcFrame: number; shown: number; speed: number };

/**
 * Which source frame shows at output frame f: the clip, frames since its start, the source time
 * (seconds from the clip's start of file), the exact source frame (fractional) and the one shown
 * (whole), and the speed (x real time). Before the first clip: its first frame; after the last: its
 * final frame (held).
 */
export const rampSource = (f: number, p: FootageRampProps, film?: Partial<FilmCtx>): RampState => {
  const fps = fpsOf(film);
  const { starts } = rampFrames(p);
  let i = starts.length - 1;
  while (i > 0 && f < starts[i]) i--;
  const c = p.clips[i];
  const N = Math.max(1, Math.round(c.frames));
  const local = clamp(f - starts[i], 0, N);
  const join = p.join ?? 'peak';
  const seconds = (c.from ?? 0) + rampSeconds(local, c, fps, join);
  const sf = c.srcFps ?? fps;
  const srcFrame = seconds * sf;
  return { clip: i, local, seconds, srcFrame, shown: Math.floor(srcFrame + 1e-6), speed: rampSpeed(local, c, join) };
};

/** Renders the ramp: one OffthreadVideo per clip, frozen on the source frame rampSource() picks. */
export const FootageRamp: React.FC<FootageRampProps & { frame: number }> = (props) => {
  const film = useFilm();
  const s = rampSource(props.frame, props, film);
  const c = props.clips[s.clip];
  const sf = c.srcFps ?? film.fps;
  // OffthreadVideo reads media time = frame / fps; aim at the middle of the source frame
  const freezeAt = ((s.shown + 0.5) / sf) * film.fps;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...props.style }}>
      <Freeze frame={freezeAt}>
        <OffthreadVideo data-imagery="" src={c.src} muted style={{ width: '100%', height: '100%', objectFit: props.fit ?? 'cover' }} />
      </Freeze>
    </div>
  );
};

/** What a ramp declares: each join is a speed-matched cut (a `velocity` seam). */
export const declares = (p?: Partial<FootageRampProps>, _film?: Partial<FilmCtx>): Declares => {
  if (!p || !p.clips) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const id = p.id ?? 'footageRamp';
  const { joins } = rampFrames(p as FootageRampProps);
  return { stepped: [], flashes: [], cameraBlur: [], seams: joins.map((at) => ({ at, kind: 'velocity' as const, carry: 'x' as const, id })) };
};
