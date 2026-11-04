// Fixture for scripts/test/grid-check.test.mjs. expect: deal-share=1 deal-own=1 deal-twice=1 deal-shared=1 deal-redraw=1
// args: --part spine
// A film the agent cast itself: three scenes of its own (under 75 % from the bank), one house scene twice, three scenes
// of the last film, a slot redrawn with no reason: every deal rule fails once.
// to the element; one device per act, each drawing its act's form; the mark converges out of the last form.
export const FPS = 60;
export const SPINE_PLAN = {
  total: 1440,
  format: 'launch',
  sentence: 'Fernway turns one sentence into a booking page that fills itself.',
  element: 'the request',
  case: { request: 'A booking page for my Sunday choir rehearsal', names: ['Sunday Choir'], numbers: ['42'] },
  acts: [
    { id: 'asks', verb: 'types', form: ['word', 'pill'], from: 0, to: 336, world: 'enter', ui: ['A booking page for my Sunday choir rehearsal'] },
    { id: 'writes', verb: 'writes', form: 'page', from: 336, to: 768, world: 'closer', ui: ['Sunday Choir', 'Rehearsal at 10:00', 'Book a seat'] },
    { id: 'publishes', verb: 'presses', form: ['button', 'pill'], from: 768, to: 1104, world: 'turn', ui: ['Publish', 'Live at fernway.page/choir'] },
    { id: 'fills', verb: 'fills', form: ['notice', 'count', 'mark'], from: 1104, to: 1440, world: 'pull-back', ui: ['Ana booked a seat', '42 booked', 'Sunday Choir'] },
  ],
  changes: [
    { at: 150, kind: 'swell', carry: 'EAG' },
    { at: 336, kind: 'grow' },
    { at: 520, kind: 'surface' },
    { at: 700, kind: 'surface' },
    { at: 768, kind: 'swell' },
    { at: 960, kind: 'stay' },
    { at: 1104, kind: 'fly' },
    { at: 1290, kind: 'converge' },
  ],
  lines: [
    { text: 'Fernway writes your booking page.', place: 'alone', from: 30, to: 150 },
    { text: 'Live at fernway.page/choir', place: 'inside', from: 800, to: 960 },
    { text: 'It tells you who booked.', place: 'around', from: 1110, to: 1250 },
    { text: 'Your page fills itself.', place: 'alone', from: 1300, to: 1400, in: 'E' },
  ],
  devices: [
    { id: 'macro-type', act: 0, verb: 'types', form: 'pill' },
    { id: 'page-fly', act: 1, verb: 'writes', form: 'page' },
    { id: 'push-press', act: 2, verb: 'presses', form: 'button' },
    { id: 'toast-stack', act: 3, verb: 'fills', form: 'notice' },
  ],
  end: { kind: 'converge', at: 1290 },
};
export const DEAL_PLAN = {
  template: 'launch-simple',
  scenes: [
    { name: 'promise', bank: null, own: false, line: true, dealt: false },
    { name: 'ask', bank: 'macro-type', own: false, line: false, dealt: false },
    { name: 'result', bank: null, own: true, line: false, dealt: false },
    { name: 'press', bank: null, own: true, line: false, dealt: false },
    { name: 'arrivals', bank: 'toast-stack', own: false, line: false, dealt: true },
    { name: 'again', bank: 'toast-stack', own: false, line: false, dealt: true },
    { name: 'count', bank: null, own: true, line: false, dealt: false },
    { name: 'lockup', bank: 'blobs-to-mark', own: false, line: false, dealt: true },
  ],
  last: ['macro-type', 'toast-stack', 'blobs-to-mark', 'page-fly'],
};
