// Fixture for scripts/test/grid-check.test.mjs. expect: music-grid=3 structural-on-music=1 cue-grid=1 cut-on-sound:warn=1
// Music mode gone stale: BPM still 120 against the track's 124, b() still the plain grid (b(1) = 0
// while bar 1's downbeat is at f22.2), a body one bar short of MUSIC.bars, an act 3 f after its
// downbeat (a near miss, also a cut 2.5 f behind its sound), and a cue on neither a 16th nor a sound.
export const FPS = 60;
const BEATF = (60 / 124) * 60;
const T0 = 0.37 * 60;
const D = Array.from({ length: 9 }, (_, i) => T0 + i * 4 * BEATF);
export const MUSIC = {
  bpm: 124, beatS: 60 / 124, fps: 60, t0: T0, bars: 8, downbeats: D,
  accents: [], entries: [], stops: [], end: { mode: 'stop', f: D[8] },
};
const at = (n: number, beat = 0) => Math.round(D[0] + ((n - 1) * 4 + beat) * BEATF);
export const BPM = 120;
export const b = (n: number, beat = 0, sub = 0) => Math.round(((n - 1) * 4 + beat) * 30 + sub * 7.5);
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = at(8) + TAIL;
export const ACT = {
  a: { from: 0, dur: at(3) + 3 },
  b: { from: at(3) + 3, dur: TOTAL - at(3) - 3 },
};
export const CUE = {
  c1: at(1), c2: at(1, 2), c3: at(2), stray: at(2) + 4, c4: at(2, 2), c5: at(3), c6: at(3, 2), c7: at(4),
  c8: at(4, 2), c9: at(5), c10: at(5, 2), c11: at(6), c12: at(6, 2), c13: at(7), c14: at(7, 2),
};
export const COPY = [];
