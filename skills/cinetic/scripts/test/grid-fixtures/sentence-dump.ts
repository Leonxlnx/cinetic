// Fixture for scripts/test/grid-check.test.mjs. expect: fragment=1 reveal-rate:warn=1 copy-concurrent=1 word-rate:warn=2 text-share=1 text-share:warn=1
// A whole sentence at once: eleven words in one entry, revealed in 32 f (3 f a word), all on screen
// together and resolving inside 5 s (2.3 words a second), on 76% of the body (an error when calm:
// more than 10 points over 65%) with no text-free beat.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const ACT = { a: { from: 0, dur: 144 * 2 + TAIL } };
export const TOTAL = 144 * 2 + TAIL;
export const CUE = { a: 0, d: 216, end: 288 };
export const COPY = [{ id: 'dump', text: 'Every sound you heard in this film was made by code', in: 20, resolved: 52, out: 240 }];
