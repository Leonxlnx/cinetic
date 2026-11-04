// Fixture for scripts/test/grid-check.test.mjs. expect: lockup-end=1 grounds=1 subject-run=1 seam-plan:warn=1
// The seams of cut-on-sound.ts with no onsets to land on, and the three structural rules of a scene-bank film: the
// lockup (CUE.lockup) leaves before the last frame on a fadeEnd seam; the film changes ground three times (two floods
// and their returns count as two, then a third change); one subject holds 5 s in a row (two scenes of one calendar).
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = 720 + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = { c0: 0, c1: 63, c2: 126, c3: 189, c4: 252, c5: 315, c6: 378, c7: 441, c8: 504, c9: 567, c10: 630, lockup: 648 };
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SEAMS = [
  { at: 80, kind: 'hard' },
  { at: 250, kind: 'hard' },
  { at: 300, kind: 'velocity', carry: 'x' },
  { at: 410, kind: 'colour' },
  { at: 470, kind: 'morph', carry: 'shape' },
  { at: 560, kind: 'hard' },
  { at: 680, kind: 'mask' },
  { at: 700, kind: 'fadeEnd' },
];
export const COPY = [];
export const GROUND_PLAN = [
  { from: 0, to: 250, ground: 'light' },
  { from: 250, to: 300, ground: 'field' },
  { from: 300, to: 410, ground: 'light' },
  { from: 410, to: 470, ground: 'field' },
  { from: 470, to: 560, ground: 'light' },
  { from: 560, to: TOTAL, ground: 'dark' },
];
export const SUBJECTS = [
  { subject: 'promise', from: 0, to: 80 },
  { subject: 'calendar', from: 80, to: 250 },
  { subject: 'calendar', from: 250, to: 410 },
  { subject: 'invite', from: 410, to: 560 },
  { subject: 'lockup', from: 560, to: 720 },
];
