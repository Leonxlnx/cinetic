// Fixture for scripts/test/grid-check.test.mjs. expect: read-first=1
// One sentence written as two separate entries (not a chain) that arrive 10 f apart: each is a
// fragment and six words fit on screen, but the second arrives before the first is read, which is
// a sentence dump (an error when calm). The end card's line under the name, arriving after the name
// has been read, passes.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 1008 + TAIL } };
export const TOTAL = 1008 + TAIL;
export const CUE = { a: 0, b: 225, c: 297, d: 369, e: 441, f: 765, g: 837, h: 909, i: 981, end: 1008 };
export const COPY = [
  { id: 'a', text: 'Your notes stay', in: 0, resolved: 58, out: 200 },
  { id: 'b', text: 'messy forever now', in: 10, resolved: 68, out: 200 },
  { id: 'name', text: 'plinth', in: 441, resolved: 475, out: 700 },
  { id: 'tag', text: 'made for you', in: 560, resolved: 618, out: 700 },
];
