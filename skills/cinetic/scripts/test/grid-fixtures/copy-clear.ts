// Fixture for scripts/test/grid-check.test.mjs. expect: (none)
// args: --copy
// A clear launch script, read by copy-check.py through the script rule: line 1 says what the product is by
// name ("Tessel is a calendar for teams."), each next line one thing it does with a verb, one line on screen
// at a time, and the end card holds the name and where to get it. Nothing vague, no metaphor, no slogan.
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
  { id: 'a', text: 'Tessel is a calendar for teams.', in: 0, resolved: 92, out: 230 },
  { id: 'b', text: 'It moves meetings that clash.', in: 340, resolved: 420, out: 520 },
  { id: 'c', text: 'Your mornings stay free.', in: 600, resolved: 668, out: 760 },
  { id: 'd', text: 'Plans fit by Monday.', in: 860, resolved: 928, out: 1020 },
  { id: 'name', text: 'Tessel', kind: 'name', in: 1100, resolved: 1130, out: TOTAL },
  { id: 'url', text: 'tessel.app', kind: 'ui', in: 1120, resolved: 1150, out: TOTAL },
];
