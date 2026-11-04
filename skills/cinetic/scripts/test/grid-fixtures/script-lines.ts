// Fixture for scripts/test/grid-check.test.mjs. expect: script=1 script:warn=1
// A script of short sentences, one line at a time, with three faults the script rule finds or forgives:
// the second line arrives after the first has been read but while it is still on screen (an error: two
// lines at once); the third takes the second's place in one move and says so (swap: 'b', passes); the
// fourth is set on two lines (a warning: one clean line). The name is not a line. The lines are 2-7 word
// sentences, so the film reads at the script's budget: text on about 77 % of the body passes (a calm film
// of fragments fails over 75 %).
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
  { id: 'a', text: 'Your week overflows', in: 0, resolved: 56, out: 200 },
  { id: 'b', text: 'Three meetings, one hour', in: b(2), resolved: 212, out: 360 },
  { id: 'c', text: 'Tessel moves the rest', in: b(3, 1), resolved: 392, out: 500, swap: 'b' },
  { id: 'd', text: 'Mornings stay\nyours now', in: 612, resolved: 680, out: 790 },
  { id: 'e', text: 'Everything fits this week', in: 880, resolved: 948, out: 1040 },
  { id: 'name', text: 'tessel', kind: 'name', in: 1100, resolved: 1130, out: TOTAL },
];
