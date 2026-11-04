// Fixture for scripts/test/grid-check.test.mjs. expect: density-plan:warn=3 scene-length=1
// A MOTION registry of a sparse picture: 6 moves in 10 s before the end lock (0.6 starts/s, under 1.4),
// at most one running at a time (0.6 on average, under 1.3), and a stretch of 2 s where nothing starts.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = 720 + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = { c0: 0, c1: 63, c2: 126, c3: 189, c4: 252, c5: 315, c6: 378, c7: 441, c8: 504, c9: 567, c10: 630, c11: 693 };
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const END = { from: 600, to: TOTAL };
export const MOTION = [
  { from: 0, to: 60 }, { from: 70, to: 130 }, { from: 140, to: 200 },
  { from: 330, to: 400 }, { from: 410, to: 480 }, { from: 500, to: 580 },
];
export const COPY = [];
