// Fixture for scripts/test/grid-check.test.mjs. expect: fragment:warn=1
// A timeline written before paces (no PACE_NAME) is checked as crisp: 36 f + 6 f/word holds pass,
// and a 6-word, 2-line entry is a warning (a chain would read better), not an error.
export const FPS = 60;
export const BPM = 120;
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 480 + TAIL } };
export const TOTAL = 480 + TAIL;
export const CUE = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`c${i}`, i * 30]));
export const COPY = [
  { id: 'one', text: 'Your week\ndoesn’t fit anymore, honestly', in: 29, resolved: 79, out: 160 },
  { id: 'two', text: 'Everything fits.', in: 300, resolved: 332, out: 400 },
];
