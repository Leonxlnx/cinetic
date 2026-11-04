// Fixture for scripts/test/grid-check.test.mjs. expect: (none)
// The beats of beats-loop.ts (a line alone, then its picture, three times, no TA beat), but the second line's own device
// opens into its picture (`meets: true` on its T beat: a type window, a porthole parting the line): the line and the
// picture join once, so it is no text-then-cards loop. Every beat holds the house lengths; the copy is clean.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
const BEAT = 36;
const b = (bar: number, beat = 0) => ((bar - 1) * 4 + beat) * BEAT;
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: b(9) + TAIL } };
export const TOTAL = b(9) + TAIL;
export const CUE = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`c${i}`, i * BEAT]));
export const SALIENCE = Object.fromEntries(Object.keys(CUE).map((k) => [k, 'move']));
export const COPY = [
  { id: 'a', text: 'Tessel turns notes into plans', in: 0, resolved: 40, out: 115 },
  { id: 'b', text: 'Tessel sorts your inbox fast', in: 252, resolved: 292, out: 367 },
  { id: 'c', text: 'Mornings stay yours now', in: 520, resolved: 552, out: 620 },
  { id: 'name', text: 'tessel', kind: 'name', in: 1000, resolved: 1030, out: TOTAL },
];
export const BEAT_PLAN = [
  { id: 'l1', kind: 'T', from: 0, to: 120 },
  { id: 'p1', kind: 'A', from: 120, to: 252 },
  { id: 'l2', kind: 'T', from: 252, to: 372, meets: true },
  { id: 'p2', kind: 'A', from: 372, to: 520 },
  { id: 'l3', kind: 'T', from: 520, to: 640 },
  { id: 'p3', kind: 'A', from: 640, to: 790 },
  { id: 'end', kind: 'end', from: 1000, to: 1212 },
];
