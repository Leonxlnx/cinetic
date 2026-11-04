// Fixture for scripts/test/grid-check.test.mjs. expect: declarations=10 declarations:warn=1 seam-plan=2 end-lock:warn=1 scene-length=2
// Declarations that do not hold: a seam on frame 0, a seam of an unknown kind, two seams on one frame,
// a step range that ends before it starts and one at the film's own 60 fps, a 3-frame "flash", a
// camera-blur range past the end, STRUCTURAL and SALIENCE naming what is not there, a LOOK.blur that
// does not exist (errors); a fade between shots and a dissolve across an act boundary (seam-plan
// errors); a 6.7 s end lock and a 12 fps step range of 5 f (warnings). A 1-frame step range is one discrete
// frame (a snap): no warning.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = 720 + TAIL;
export const ACT = { a: { from: 0, dur: 432 }, b: { from: 432, dur: 144 }, c: { from: 576, dur: TOTAL - 576 } };
export const CUE = {
  c0: 0, c1: 63, c2: 126, c3: 189, land: 252, c5: 315, c6: 378, c7: 432, c8: 495, c9: 558, c10: 576, c11: 639, c12: 702,
};
export const LOOK = { blur: 'smear', texture: 'clean', filmType: 'explainer', oneTake: false, whiteWorld: false };
export const SEAMS = [
  { at: 0, kind: 'hard' },
  { at: 220, kind: 'swoosh' },
  { at: 200, kind: 'fadeEnd' },
  { at: 432, kind: 'morph', carry: 'shape' },
  { at: 432, kind: 'velocity', carry: 'x' },
  { at: 576, kind: 'dissolveUi' },
  { at: 650, kind: 'whip' },
];
export const STEPPED = [
  { from: 100, to: 90, fps: 12, id: 'backwards' },
  { from: 600, to: 640, fps: 60, id: 'not-a-step' },
  { from: 300, to: 301, id: 'snap' },
  { from: 320, to: 325, fps: 12, id: 'one-step' },
];
export const FLASHES = [{ f: 500, frames: 3, id: 'long-flash' }];
export const CAMERA_BLUR = [{ from: 700, to: 900, id: 'past-the-end' }];
export const END = { from: 380, to: TOTAL };
export const STRUCTURAL = ['nope'];
export const SALIENCE = { land: 'loud' };
export const COPY = [];
