// Fixture for scripts/test/grid-check.test.mjs. expect: scene-length=1
// Music mode, clean: a track at 124 BPM whose first downbeat is at 0.37 s (f22.2 at 60 fps), 8 bars.
// b() follows the music (rounded), acts start on measured downbeats, two hard cuts land on analysed
// accents off the 16th grid (the picture 0.5 and 1.6 f ahead of the sound), the reveal comes on the
// track's entry after a 0.3 s stop, and the cuts skip most downbeats at uneven intervals (q75/q25 above 1.9).
export const FPS = 60;
const BEATF = (60 / 124) * 60; // 29.03 f: not a whole number, the normal case with a track
const T0 = 0.37 * 60;
const D = Array.from({ length: 9 }, (_, i) => T0 + i * 4 * BEATF);
export const MUSIC = {
  bpm: 124,
  beatS: 60 / 124,
  fps: 60,
  t0: T0,
  bars: 8,
  phraseLen: 4,
  downbeats: D,
  accents: [{ f: 127.5, db: 8.2, band: 'mid' }, { f: 413.6, db: 9.1, band: 'low' }, { f: D[4], db: 11, band: 'low' }],
  phrases: [T0, D[4]],
  entries: [D[4]],
  breaks: [],
  stops: [{ from: D[4] - 18, to: D[4] }],
  end: { mode: 'stop', f: D[8] },
};
const bar = (n: number, beat = 0, sub = 0) => {
  const pos = (n - 1) * 4 + beat + sub / 4;
  const i = Math.floor(pos / 4);
  if (i >= 0 && i + 1 < D.length) return D[i] + ((pos - 4 * i) / 4) * (D[i + 1] - D[i]);
  if (i >= D.length - 1) return D[D.length - 1] + (pos - 4 * (D.length - 1)) * BEATF;
  return D[0] + pos * BEATF;
};
export const BPM = MUSIC.bpm;
export const b = (n: number, beat = 0, sub = 0) => Math.round(bar(n, beat, sub));
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = b(9) + TAIL;
export const ACT = {
  intro: { from: 0, dur: b(3) },
  build: { from: b(3), dur: b(5) - b(3) },
  reveal: { from: b(5), dur: TOTAL - b(5) },
};
export const CUE = {
  open: b(1),
  rise: b(1, 2),
  snap: 127, // offgrid-free: an analysed accent at f127.5, the picture half a frame ahead
  push: b(2),
  turn: b(2, 2),
  build: b(3),
  slide: b(3, 2),
  peak: b(4),
  swap: 412, // the accent at f413.6, the picture 1.6 f ahead
  lift: b(4, 2),
  reveal: b(5),
  settle: b(5, 2),
  drift: b(6),
  grain: b(6, 2),
  glow: b(7),
  lean: b(7, 2),
  lock: b(8),
  hold: b(8, 2),
  end: b(9),
};
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SEAMS = [
  { at: 48, kind: 'velocity', carry: 'x', dir: -1 },
  { at: 127, kind: 'hard' },
  { at: b(3), kind: 'morph', carry: 'shape' },
  { at: 294, kind: 'whip', carry: 'x', dir: 1 },
  { at: 412, kind: 'hard' },
  { at: b(5), kind: 'hard', signature: true },
  { at: 630, kind: 'mask' },
  { at: 690, kind: 'velocity', carry: 'y', dir: 1 },
  { at: b(8), kind: 'morph', carry: 'shape' },
];
export const STEPPED = [{ from: 633, to: 688, fps: 12, id: 'collage' }];
export const FLASHES = [{ f: b(5), frames: 1, id: 'reveal-flash' }];
export const CAMERA_BLUR = [{ from: 288, to: 300, id: 'whip' }];
export const END = { from: b(8), to: TOTAL };
export const REVEAL = b(5);
export const SPRING_CLASS = 'pill';
export const STRUCTURAL = ['reveal'];
export const SALIENCE = {
  open: 'life', rise: 'move', snap: 'cut', push: 'move', turn: 'life', build: 'cut', slide: 'move', peak: 'hit', swap: 'cut',
  lift: 'move', reveal: 'cut', settle: 'life', drift: 'life', grain: 'life', glow: 'life', lean: 'move', lock: 'hit', hold: 'life', end: 'cut',
};
export const COPY = [];
