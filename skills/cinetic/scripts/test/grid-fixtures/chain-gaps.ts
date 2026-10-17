// Fixture for scripts/test/grid-check.test.mjs. expect: chain-gap=3 chain-gap:warn=2
// Fragments that do not take turns: in a build chain the second arrives before the first is read
// (error); a replace chain overlaps its fragments (error) and gives no picture beat (warning); a
// third chain mixes modes (error) and stalls 3 s between its fragments (warning).
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 1440 + TAIL } };
export const TOTAL = 1440 + TAIL;
export const CUE = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`c${i}`, i * 72]));
export const COPY = [
  { id: 'a.1', text: 'Built on', in: 0, resolved: 47, out: 250, chain: 'a', mode: 'build' },
  { id: 'a.2', text: 'the beat', in: 80, resolved: 127, out: 250, chain: 'a', mode: 'build' },
  { id: 'b.1', text: 'One move', in: 500, resolved: 547, out: 620, chain: 'b', mode: 'replace' },
  { id: 'b.2', text: 'then the next', in: 610, resolved: 668, out: 740, chain: 'b', mode: 'replace' },
  { id: 'c.1', text: 'Here is', in: 900, resolved: 947, out: 1320, chain: 'c', mode: 'build' },
  { id: 'c.2', text: 'the newest', in: 1190, resolved: 1237, out: 1320, chain: 'c', mode: 'replace' },
];
