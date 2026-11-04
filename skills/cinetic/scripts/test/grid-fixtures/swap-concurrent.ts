// Fixture for scripts/test/grid-check.test.mjs. expect: (none)
// A declared swap that keeps the old line's first words: "Tessel sorts your inbox fast" becomes "Tessel sorts your
// calendar too" in one move (swap: 'b'). The old line leaves in that move, so it counts only until 4 f into the swap,
// not through an exit it never plays, and while both show the swap adds only its new words (2): 7 words at once, under
// the calm 8. Counted as two whole lines through a full exit it would be 10 (a false copy-concurrent error).
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
