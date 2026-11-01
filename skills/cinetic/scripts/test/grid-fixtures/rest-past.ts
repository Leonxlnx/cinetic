// Fixture for scripts/test/grid-check.test.mjs. expect: event-gap=1
// A hold may rest, still, with nothing planted in it (event-gap warns past the pace's gap), but past 150 f at 60 fps
// (2.5 s) with nothing new and no line being read, the film reads frozen: event-gap fails.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 720 + TAIL } };
export const TOTAL = 720 + TAIL;
export const CUE = { a: 0, b: 396, c: 459, d: 522, e: 576, f: 639, g: 684, end: 720 };
export const COPY = [{ id: 'held', text: 'Held a while', in: 10, resolved: 68, out: 200 }];
