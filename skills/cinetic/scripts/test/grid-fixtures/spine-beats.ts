// Fixture for scripts/test/grid-check.test.mjs. expect: spine-carry=2 spine-bare=1 spine-lines=1 text-then-cards=2 spine-case=1 seam-variety=1
// args: --part spine
// expect: spine-end=1 checklist=1 spine-boundary:warn=1 spine-lines:warn=1 text-then-cards:warn=1 checklist:warn=1
// A beat film, not a spine: a line alone, a card, a cut, four times. Nothing of the element crosses a scene change (one
// whip, one dissolve, the rest bare cuts, four of them inside acts), the two middle lines stand alone in two places (one
// an island), the request shows in the first act only, the mark arrives after a bare cut, and the four devices meet
// through no handover. Each act's lengths are in band, so the shape itself passes.
export const FPS = 60;
export const SPINE_PLAN = {
  total: 1200,
  element: 'the planner card',
  case: { request: 'Plan my week of lessons' },
  acts: [
    { verb: 'asks', form: 'pill', from: 0, to: 300, world: 'enter', ui: ['Plan my week of lessons'] },
    { verb: 'shows', form: 'card', from: 300, to: 600, ui: ['Monday', 'Tuesday'] },
    { verb: 'reminds', form: 'notice', from: 600, to: 900, ui: ['Reminder'] },
    { verb: 'ends', form: 'mark', from: 900, to: 1200, ui: ['Out now'] },
  ],
  changes: [
    { at: 150, kind: 'cut' },
    { at: 300, kind: 'whip' },
    { at: 450, kind: 'cut' },
    { at: 600, kind: 'optics' },
    { at: 750, kind: 'cut' },
    { at: 900, kind: 'cut' },
    { at: 1050, kind: 'cut' },
  ],
  lines: [
    { text: 'Ledger plans your lessons.', place: 'alone', from: 0, to: 150 },
    { text: 'It fills your week.', place: 'alone', from: 300, to: 450 },
    { text: 'It reminds your class.', place: 'alone', from: 600, to: 750 },
    { text: 'Teach more, plan less.', place: 'alone', from: 900, to: 1050 },
  ],
  devices: [
    { id: 'macro-type', act: 0, verb: 'types', form: 'pill' },
    { id: 'carousel', act: 1, verb: 'shows pictures', form: 'card' },
    { id: 'toast-stack', act: 2, verb: 'fills', form: 'notice' },
    { id: 'logo-sting', act: 3, verb: 'ends', form: 'mark' },
  ],
  end: { kind: 'entry', at: 1050 },
};
