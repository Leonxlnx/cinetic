// Fixture for scripts/test/grid-check.test.mjs. expect: (none)
// args: --part spine
// A spine that flows: one sentence in four acts (asks, writes, publishes, fills), one case from the typed request to the
// count, one element whose form changes act to act (word, pill, page, button, live pill, notice, count, mark) and
// carries every scene change by six handover kinds; the lines alone only for the promise and the claim, each joined
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
