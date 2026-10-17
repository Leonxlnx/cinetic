// Fixture for scripts/test/grid-check.test.mjs. expect: event-gap=1
// A held read carries the gap it sits in (no tick planted in it), up to readMax (150 f when
// calm); a stretch with nothing on screen and no event still fails.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 720 + TAIL } };
export const TOTAL = 720 + TAIL;
export const CUE = { a: 0, b: 288, c: 360, d: 432, e: 504, f: 576, g: 648, end: 720 };
export const COPY = [{ id: 'held', text: 'Held a while', in: 10, resolved: 68, out: 200 }];
