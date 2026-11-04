// Fixture for scripts/test/grid-check.test.mjs. expect: spine-declared=4 spine-declared:warn=2 spine-case=1 spine-end:warn=1
// args: --part spine
// A plan that does not hold its shape: an update in five acts (3-4), no element named, a handover kind and a line place
// that do not exist, the hook at 40 % and the last act at 8 % of the film; no case at all and no end declared. The
// changes themselves carry the element, so the carry rules stay quiet.
export const FPS = 60;
export const SPINE_PLAN = {
  total: 1200,
  format: 'update',
  case: {},
  acts: [
    { verb: 'hooks', form: 'word', from: 0, to: 480, world: 'enter' },
    { verb: 'shows', form: 'card', from: 480, to: 720 },
    { verb: 'checks', form: 'list', from: 720, to: 900 },
    { verb: 'joins', form: 'button', from: 900, to: 1100 },
    { verb: 'ends', form: 'mark', from: 1100, to: 1200 },
  ],
  changes: [
    { at: 240, kind: 'swell' },
    { at: 480, kind: 'zoom' },
    { at: 600, kind: 'teleport', carry: 'E' },
    { at: 720, kind: 'shrink' },
    { at: 900, kind: 'H8' },
    { at: 1000, kind: 'surface' },
    { at: 1100, kind: 'converge' },
  ],
  lines: [
    { text: 'Trailhead 4.0', place: 'alone', from: 20, to: 240, out: 'E' },
    { text: 'Join a hike in one tap', place: 'inside', from: 920, to: 1000 },
    { text: 'See the summit first', place: 'aside', from: 500, to: 600 },
  ],
};
