// Fixture for scripts/test/grid-check.test.mjs. expect: chain-gap=1 copy-concurrent=1
// A replace chain timed the old way, its first fragment leaving only 6 f before the next rises:
// the first is still fading out (a 24 f exit) when the second arrives in its place (chain-gap),
// and the two together put 6 words on screen in a replace chain (copy-concurrent, max 5).
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 576 + TAIL } };
export const TOTAL = 576 + TAIL;
export const CUE = { a: 0, beat: 126, b: 360, c: 432, d: 504, end: 576 };
export const COPY = [
  { id: 'r.1', text: 'One move now', in: 0, resolved: 58, out: 154, chain: 'r', mode: 'replace' },
  { id: 'r.2', text: 'then the next', in: 160, resolved: 218, out: 300, chain: 'r', mode: 'replace' },
];
