// Fixture for scripts/test/grid-check.test.mjs. expect: script:warn=6
// A keyword pile: five lines of one or two words ("Speed." "Less noise." ...), each held and read, the
// picture taking its turns between them. Every line is a label, not a sentence (five warnings), and more
// than half the lines under 3 words is a pile of keywords, not a script (one more).
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
const BEAT = 36;
const b = (bar: number, beat = 0) => ((bar - 1) * 4 + beat) * BEAT;
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: b(9) + TAIL } };
export const TOTAL = b(9) + TAIL;
// a living picture: a camera move on every beat, away from the words being read
export const CUE = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`c${i}`, i * BEAT]));
export const SALIENCE = Object.fromEntries(Object.keys(CUE).map((k) => [k, 'move']));
export const COPY = [
  { id: 'k1', text: 'Speed.', in: 0, resolved: 32, out: 120 },
  { id: 'k2', text: 'Less noise.', in: b(2, 2), resolved: 260, out: 340 },
  { id: 'k3', text: 'Total control.', in: b(4), resolved: 476, out: 550 },
  { id: 'k4', text: 'Effortless.', in: b(5, 2), resolved: 680, out: 760 },
  { id: 'k5', text: 'One app.', in: b(7), resolved: 908, out: 990 },
];
