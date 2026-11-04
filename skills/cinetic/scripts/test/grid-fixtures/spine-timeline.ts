// Fixture for scripts/test/grid-check.test.mjs. expect: spine-bare=1
// The timeline of beats-loop-meets.ts (clean on every timing rule) exporting a SPINE_PLAN: the default run reads the
// plan too. The spine carries the element through six of seven changes, but one change inside the second act is a
// bare cut: that one finding, and nothing from the timing rules.
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
export const SPINE_PLAN = {
  element: 'the note',
  case: { request: 'Turn my notes into a weekly plan', names: ['Weekly plan'] },
  acts: [
    { verb: 'takes', form: ['word', 'pill'], from: 0, to: 288, world: 'enter', ui: ['Turn my notes into a weekly plan'] },
    { verb: 'sorts', form: 'list', from: 288, to: 576, ui: ['Inbox', 'Weekly plan'] },
    { verb: 'plans', form: 'card', from: 576, to: 864, world: 'light', ui: ['Weekly plan', 'Monday'] },
    { verb: 'ends', form: ['count', 'mark'], from: 864, to: 1212, world: 'pull-back', ui: ['Weekly plan'] },
  ],
  changes: [
    { at: 120, kind: 'swell' },
    { at: 288, kind: 'grow' },
    { at: 400, kind: 'cut' },
    { at: 576, kind: 'swell' },
    { at: 720, kind: 'stay' },
    { at: 864, kind: 'fly' },
    { at: 1000, kind: 'converge' },
  ],
  lines: [
    { id: 'a', text: 'Tessel turns notes into plans', place: 'alone', from: 0, to: 115, out: 'E' },
    { id: 'b', text: 'Tessel sorts your inbox fast', place: 'inside', from: 252, to: 367 },
    { id: 'c', text: 'Mornings stay yours now', place: 'around', from: 520, to: 620 },
  ],
  end: { kind: 'converge', at: 1000 },
};
