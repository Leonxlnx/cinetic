// Fixture for scripts/test/grid-check.test.mjs. expect: beats=4 beats:warn=1
// A beat plan that breaks the simple launch's grammar four ways: one type-only beat (a line alone, at least two
// a film), four of eight beats with a line over a picture (at most 40 %), a picture beat with a statement on
// screen for half of it, and a line beat with no line; the same picture beat also runs 5.3 s (a warning: 1-3.5 s).
// The copy is the clean swap fixture's.
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
  { id: 'a', text: 'Tessel turns notes into plans', in: 0, resolved: 60, out: 132 },
  { id: 'b', text: 'Tessel sorts your inbox fast', in: b(2, 3), resolved: 326, out: 400 },
  { id: 'c', text: 'Tessel sorts your calendar too', in: 400, resolved: 440, out: 540, swap: 'b' },
  { id: 'd', text: 'Mornings stay yours now', in: 640, resolved: 708, out: 800 },
  { id: 'e', text: 'Everything fits this week', in: 880, resolved: 948, out: 1040 },
  { id: 'name', text: 'tessel', kind: 'name', in: 1100, resolved: 1130, out: TOTAL },
];
export const BEAT_PLAN = [
  { id: 'l1', kind: 'TA', from: 0, to: 160 },
  { id: 'p1', kind: 'A', from: 160, to: 252 },
  { id: 'l2', kind: 'TA', from: 252, to: 400 },
  { id: 'l3', kind: 'TA', from: 400, to: 540 },
  { id: 'p2', kind: 'A', from: 540, to: 860 },
  { id: 'l4', kind: 'TA', from: 860, to: 1060 },
  { id: 'l5', kind: 'T', from: 1060, to: 1100 },
  { id: 'end', kind: 'end', from: 1100, to: 1212 },
];
