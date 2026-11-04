// Fixture for scripts/test/grid-check.test.mjs. expect: anti-metronome:warn=2 reveal-dip:warn=1 shot-length:warn=2 seam-plan:warn=2 cut-mix:warn=1 scene-length=1
// Bar-grid editing of a launch film: a hard cut on every downbeat (all of the cuts on downbeats, even
// intervals, shots that never vary), seven hard cuts and nothing carried across (no change without a hard cut), and a reveal with
// no stop or dip before it. Every one of these is a warning: the timeline is valid, the edit is flat.
export const FPS = 60;
const BEATF = (60 / 124) * 60;
const T0 = 0.37 * 60;
const D = Array.from({ length: 9 }, (_, i) => T0 + i * 4 * BEATF);
export const MUSIC = {
  bpm: 124, beatS: 60 / 124, fps: 60, t0: T0, bars: 8, downbeats: D,
  accents: [], entries: [], stops: [], end: { mode: 'stop', f: D[8] },
};
const bar = (n: number, beat = 0) => D[0] + ((n - 1) * 4 + beat) * BEATF;
export const BPM = MUSIC.bpm;
export const b = (n: number, beat = 0, sub = 0) => Math.round(bar(n, beat + sub / 4));
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = b(9) + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = {
  c1: b(1), m1: b(1, 2), c2: b(2), m2: b(2, 2), c3: b(3), m3: b(3, 2), c4: b(4), m4: b(4, 2), c5: b(5),
  m5: b(5, 2), c6: b(6), m6: b(6, 2), c7: b(7), m7: b(7, 2), c8: b(8), m8: b(8, 2), end: b(9),
};
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SEAMS = [2, 3, 4, 5, 6, 7, 8].map((n) => ({ at: b(n), kind: 'hard' }));
export const REVEAL = b(5);
export const COPY = [];
