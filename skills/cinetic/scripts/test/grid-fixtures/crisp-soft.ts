// Fixture for scripts/test/grid-check.test.mjs. expect: read-first:warn=1 chain-beat:warn=1 chain-gap:warn=1
// The crisp profile warns where calm fails: two separate lines arriving 10 f apart, a chain whose
// picture beat has no cue, and a chain with 5 f of picture between its fragments.
export const FPS = 60;
export const BPM = 120;
export const PACE_NAME = 'crisp';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 1080 + TAIL } };
export const TOTAL = 1080 + TAIL;
export const CUE = { a: 0, b: 195, c: 240, d: 270, e: 645, f: 690, g: 1035, end: 1080 };
export const COPY = [
  { id: 'x', text: 'Ship it', in: 0, resolved: 32, out: 150 },
  { id: 'y', text: 'today for real', in: 10, resolved: 54, out: 150 },
  { id: 'c.1', text: 'One move', in: 300, resolved: 332, out: 600, chain: 'c', mode: 'build' },
  { id: 'c.2', text: 'then more', in: 420, resolved: 452, out: 600, chain: 'c', mode: 'build' },
  { id: 'd.1', text: 'Here is', in: 720, resolved: 752, out: 1000, chain: 'd', mode: 'build' },
  { id: 'd.2', text: 'the next', in: 805, resolved: 837, out: 1000, chain: 'd', mode: 'build' },
];
