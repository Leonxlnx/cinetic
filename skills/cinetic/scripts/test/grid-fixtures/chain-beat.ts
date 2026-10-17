// Fixture for scripts/test/grid-check.test.mjs. expect: chain-beat=1
// A build chain whose picture beat is empty: 37 f between the first fragment's read (f107) and the
// second fragment, short enough to pass the event gap, but no cue there, so nothing in the picture
// takes its turn (an error when calm).
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 576 + TAIL } };
export const TOTAL = 576 + TAIL;
export const CUE = { a: 0, b: 144, c: 369, d: 441, e: 513, end: 576 };
export const COPY = [
  { id: 's.1', text: 'Built on', in: 0, resolved: 47, out: 300, chain: 's', mode: 'build' },
  { id: 's.2', text: 'the beat', in: 144, resolved: 191, out: 300, chain: 's', mode: 'build' },
];
