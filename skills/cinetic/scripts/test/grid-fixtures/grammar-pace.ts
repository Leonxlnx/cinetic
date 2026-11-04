// Fixture for scripts/test/grid-check.test.mjs. expect: exit-length:warn=1 recentre:warn=3 accent-time:warn=3 stagger-shape:warn=4 scene-length=1
// A pace whose motion knobs drift from the house grammar: an exit nearly as long as the entrance, a
// slow re-centre with a long lead (only 33 % home after 1/30 s), an accent held 1.5 s and cooled
// over 40 f on an eased curve, words staggered 5 f; and three CUE lists: even starts not tagged as a
// list, a payoff whose gaps grow, letters staggered 18 f. A list tagged `list` may be even.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const PACE = {
  calm: {
    wordDur: 32, stagger: 5, cadence: 'reading', exitDur: 30,
    recentre: 'jump', recentreDur: 60, recentreLead: 20,
    accentHold: 90, accentCool: 40, accentEase: 'smooth',
  },
};
export const TAIL = 60;
export const TOTAL = 432 + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = {
  open: 0,
  rows: [99, 108, 117, 126, 135],
  menu: [36, 45, 54, 63], // stagger: list
  items: [180, 189, 207, 234, 270], // stagger: payoff
  letters: [306, 324, 342, 369], // stagger: letter
  close: 414,
};
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const COPY = [];
