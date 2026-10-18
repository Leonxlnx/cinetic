// Fixture for scripts/test/grid-check.test.mjs. expect: (none)
// A calm film that passes clean: a build chain (two fragments around a picture beat with a cue in
// it), a replace chain whose first fragment has left before the next rises, reads that carry the
// event gaps with no cue inside them, text on under 65% of the body and a text-free beat.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
const BEAT = 36;
const b = (bar: number, beat = 0) => ((bar - 1) * 4 + beat) * BEAT;
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: b(4) }, b: { from: b(4), dur: b(7) + TAIL - b(4) } };
export const TOTAL = b(7) + TAIL;
export const CUE = { a: b(1), beat: b(1, 3), b: b(2), exit: b(3), x1: b(3, 2), c: b(4), turn: b(4, 3), e: b(5), f: b(6), g: b(6, 2), end: b(7) };
export const COPY = [
  { id: 's.1', text: 'Built on', in: 0, resolved: 47, out: 288, chain: 's', mode: 'build' },
  { id: 's.2', text: 'the beat', in: 144, resolved: 191, out: 288, chain: 's', mode: 'build' },
  { id: 'r.1', text: 'One move', in: 432, resolved: 479, out: 546, chain: 'r', mode: 'replace' },
  { id: 'r.2', text: 'then the next', in: 576, resolved: 634, out: 720, chain: 'r', mode: 'replace' },
];
