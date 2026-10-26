// Fixture for scripts/test/grid-check.test.mjs. expect: read-quiet:warn=2
// Calm copy, a picture that never rests: while a line is read (f63-f213) a slow light drift (life) and a camera move
// away from the text (move) run and pass; a hit (the default salience) and a cut there still warn.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 432 + TAIL } };
export const TOTAL = 432 + TAIL;
export const CUE = { line: 9, resolve: 63, light: 108, pan: 144, born: 162, cut: 198, after: 225, b: 297, c: 360, end: 432 };
export const SALIENCE = { line: 'copy', light: 'life', pan: 'move', cut: 'cut' };
export const COPY = [{ id: 'held', text: 'Held a while', in: 9, resolved: 63, out: 240 }];
