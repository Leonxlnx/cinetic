// Fixture for scripts/test/grid-check.test.mjs. expect: read-quiet:warn=1
// Calm: a cue that starts something new while a line is being read (the read is f63-f213) warns;
// a cue on the line's own frames and one after the read do not.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 432 + TAIL } };
export const TOTAL = 432 + TAIL;
export const CUE = { line: 9, resolve: 63, born: 144, after: 225, b: 297, c: 360, end: 432 };
export const COPY = [{ id: 'held', text: 'Held a while', in: 9, resolved: 63, out: 240 }];
