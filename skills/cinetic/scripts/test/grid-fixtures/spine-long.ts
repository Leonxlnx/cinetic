// Fixture for scripts/test/grid-check.test.mjs. expect: spine-carry:warn=2 spine-bare:warn=1 spine-momentum:warn=1 seam-variety:warn=1
// args: --part spine
// A 40 s film that leans on speed: the element carries 4 of 10 changes (2 of 7 inside the acts), 4 runs are joined by
// speed alone and one cut inside an act is bare. Past 35 s the carry family warns instead of failing; everything else
// holds (acts in band, lines placed, the case in three acts, the mark pulled back out of the last screen).
export const FPS = 30;
export const SPINE_PLAN = {
  total: 1200,
  element: 'the order card',
  case: { request: 'Reorder the oat milk from last week', names: ['Oat milk'], numbers: ['$4.20'] },
  acts: [
    { verb: 'asks', form: 'pill', from: 0, to: 300, world: 'enter', ui: ['Reorder the oat milk from last week'] },
    { verb: 'finds', form: 'card', from: 300, to: 660, world: 'closer', ui: ['Oat milk', '$4.20'] },
    { verb: 'delivers', form: 'notice', from: 660, to: 990, world: 'light', ui: ['Oat milk is on its way'] },
    { verb: 'counts', form: ['count', 'mark'], from: 990, to: 1200, world: 'pull-back', ui: ['3 orders this month'] },
  ],
  changes: [
    { at: 140, kind: 'momentum' },
    { at: 300, kind: 'grow' },
    { at: 420, kind: 'velocity', carry: 'G' },
    { at: 530, kind: 'cut' },
    { at: 660, kind: 'fly' },
    { at: 760, kind: 'whip' },
    { at: 860, kind: 'momentum', carry: 'O' },
    { at: 920, kind: 'stay' },
    { at: 990, kind: 'anchor' },
    { at: 1080, kind: 'pull' },
  ],
  lines: [
    { text: 'Basket reorders your groceries.', place: 'alone', from: 10, to: 140, out: 'M' },
    { text: 'Oat milk is on its way', place: 'inside', from: 700, to: 860 },
    { text: 'It remembers every week.', place: 'around', from: 925, to: 985 },
    { text: 'Your fridge stays full.', place: 'alone', from: 1090, to: 1180, in: 'E' },
  ],
  end: { kind: 'pull', at: 1080 },
};
