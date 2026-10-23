// Fixture for scripts/test/grid-check.test.mjs. expect: cut-on-sound=1
// args: --onsets cut-on-sound.onsets.json
// Four cuts that must land on a sound (three hard, one colour punch) against an analysed onset list:
// one lands with the picture 2 f ahead of its sound, three miss every onset by more than 100 ms
// (under 30 % on a sound is an error). The velocity, morph and mask seams may float.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = 720 + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = { c0: 0, c1: 63, c2: 126, c3: 189, c4: 252, c5: 315, c6: 378, c7: 441, c8: 504, c9: 567, c10: 630, c11: 693 };
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SEAMS = [
  { at: 80, kind: 'hard' },
  { at: 250, kind: 'hard' },
  { at: 300, kind: 'velocity', carry: 'x' },
  { at: 410, kind: 'colour' },
  { at: 470, kind: 'morph', carry: 'shape' },
  { at: 560, kind: 'hard' },
  { at: 680, kind: 'mask' },
];
export const COPY = [];
