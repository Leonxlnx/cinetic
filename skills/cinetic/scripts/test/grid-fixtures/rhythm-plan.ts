// Fixture for scripts/test/grid-check.test.mjs. expect: shot-length:warn=2 long-take:warn=1 cut-mix:warn=1 picture-change:warn=1 opener:warn=1 scene-length=1
// A held edit: nothing changes in the first 2.5 s, five hard cuts in a burst (none without a hard cut),
// then one 15.4 s take where only `life` cues (a creep, light) run, so the picture never changes. The
// shot lengths also miss the launch band and one shot runs over 4 s. Every one of these is a warning.
export const FPS = 30;
export const BPM = 120;
export const PACE_NAME = 'crisp';
export const TAIL = 30;
export const TOTAL = 600 + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = {
  life: Array.from({ length: 40 }, (_, i) => i * 15), // stagger: list
  cuts: [79, 94, 109, 124, 139], // stagger: list
};
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SALIENCE = { life: 'life', cuts: 'cut' };
export const COPY = [];
