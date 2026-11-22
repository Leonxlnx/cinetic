// Sound, locked to picture. Effects land on their transient (not the file start), music ducks under hits and
// fades out with the end card. Files live in public/sfx and public/music (fetched by scripts/sfx.mjs: `get` for
// effects, `shortlist` and `music` for the bed; never committed).
import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig, interpolate } from 'remotion';

export type Cue = {
  /** Frame the sound's transient should hit (the visual event). */
  at: number;
  /** File under public/, e.g. 'sfx/mixkit-275.wav'. */
  src: string;
  /** Silence before the transient in the file, in ms (public/sfx/sfx.json: leadMs). The cue starts that much early. */
  leadMs?: number;
  /** Linear gain 0..1 (0.35-0.7 typical for UI, 0.8-1 for a hit). */
  volume?: number;
  /** Play only the first n seconds. */
  maxS?: number;
  /** Playback rate (pitch). 0.9-1.1 for variety between repeats. */
  rate?: number;
};

/** One effect, starting early by its lead so the transient lands exactly on `at`. */
export const Sfx: React.FC<Cue> = ({ at, src, leadMs = 0, volume = 0.6, maxS, rate = 1 }) => {
  const { fps } = useVideoConfig();
  const from = Math.round(at - (leadMs / 1000) * fps);
  const dur = maxS ? Math.round(maxS * fps) : undefined;
  return (
    <Sequence from={from} durationInFrames={dur} layout="none" name={`sfx ${src}`}>
      <Audio src={staticFile(src)} volume={volume} playbackRate={rate} />
    </Sequence>
  );
};

/** A list of cues. Keep them in one array beside the timeline so picture and sound change together. */
export const Cues: React.FC<{ cues: Cue[] }> = ({ cues }) => (
  <>
    {cues.map((c, i) => (
      <Sfx key={i} {...c} />
    ))}
  </>
);

/**
 * The music bed. Starts `startFrom` seconds into the track (pick the bar where it gets good), fades in over
 * `fadeIn` frames, fades out over the last `fadeOut` frames, and dips under the listed hit frames.
 */
export const Music: React.FC<{
  src: string;
  startFrom?: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  duck?: number[];
  duckBy?: number;
  /** Breath gaps: the bed drops out over the `breathLen` frames BEFORE each listed frame and comes back on it (the hit). */
  breaths?: number[];
  breathLen?: number;
  /** Frame the music enters (silence before it: a quiet opener). */
  enterAt?: number;
}> = ({ src, startFrom = 0, volume = 0.55, fadeIn = 1, fadeOut = 45, duck = [], duckBy = 0.45, breaths = [], breathLen = 6, enterAt = 0 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <Sequence from={enterAt} layout="none" name="music">
    <Audio
      src={staticFile(src)}
      startFrom={Math.round(startFrom * fps)}
      volume={(local) => {
        const f = local + enterAt;
        const env =
          durationInFrames > enterAt + fadeIn + fadeOut + 2
            ? interpolate(f, [enterAt, enterAt + fadeIn, durationInFrames - fadeOut, durationInFrames - 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            : 1;
        let d = 1;
        for (const h of duck) {
          const t = f - h;
          if (t > -2 && t < 14) d = Math.min(d, 1 - duckBy * (t < 0 ? (t + 2) / 2 : 1 - t / 14));
        }
        for (const b of breaths) {
          const t = b - f;
          if (t > 0 && t <= breathLen + 3) d = Math.min(d, t > breathLen ? (t - breathLen) / 3 : 0.08);
        }
        return volume * env * d;
      }}
    />
    </Sequence>
  );
};

/** Decibels to linear gain: db(-6) = 0.5. Write effect levels in dB. */
export const db = (x: number) => Math.pow(10, x / 20);

/**
 * The music's beat grid at 30 fps (or `fps`). `beats(120, 6)`: 120 BPM, first downbeat at frame 6.
 * `.at(n)` the frame of beat n, `.snap(frame)` the nearest beat, `.half(frame)` the nearest half-beat, `.bar(n)` bar n (4/4).
 */
export const beats = (bpm: number, offset = 0, fps = 30) => {
  const len = (60 / bpm) * fps;
  return {
    len,
    at: (n: number) => Math.round(offset + n * len),
    bar: (n: number) => Math.round(offset + n * 4 * len),
    snap: (frame: number) => Math.round(offset + Math.round((frame - offset) / len) * len),
    half: (frame: number) => Math.round(offset + Math.round((frame - offset) / (len / 2)) * (len / 2)),
  };
};
