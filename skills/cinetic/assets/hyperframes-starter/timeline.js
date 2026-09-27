/*
 * timeline.js: the film's single source of timing, in FRAMES on the beat grid.
 *
 * index.html builds the picture from these numbers; the sound reads the same numbers through
 * `bash scripts/hf-finish.sh . --export-cues out/cues.json`, which calls FILM.cues() below.
 * Never type a sync point twice: derive it here from the grid and the move durations.
 *
 * Keep index.html's root data-duration equal to TOTAL / FPS; hf-finish.sh refuses to render
 * when they differ (a mismatch silently cuts the film short or freezes its last frame).
 */
(function (root) {
  'use strict';
  const BF = root.BF || (typeof require === 'function' ? require('./motion.js') : null);
  if (!BF) throw new Error('timeline.js: load motion.js first');
  const { b, E, FPS, BPM, peak, settleOf, startFor, arriving } = BF;

  const TAIL = FPS; // 1 s after the last event: room for reverb tails and the poster hold

  // Acts are contiguous and bar-aligned.
  const ACT = {
    mark: { from: 0, dur: b(2) }, //                       bar 1: the mark assembles
    lockup: { from: b(2), dur: b(3) + TAIL - b(2) }, //    bar 2: the word locks, then the hold
  };
  const TOTAL = b(3) + TAIL; // 300 f = 5.0 s at 60 fps and 120 BPM

  // Move lengths in frames. The picture and the cue export both read these.
  const DUR = { rise: 36, slide: 36, fall: 30, glide: 72, word: 30 };
  const DROP = 96; // px the accent falls; on E.contact it meets the grid at ~14 px/f
  // The words rise on E.out, finished early with arriving(): vertical text snaps to whole pixels,
  // so a rise that creeps its last pixels settles in visible 1 px ticks.
  const WORD_EASE = arriving(E.out);

  // Named cues, on the sixteenth grid.
  const CUE = {
    rise: b(1, 0, 2), //            the tall bar rises
    slide: b(1, 2), //              the square slides in
    fall: b(1, 3), //               the accent starts to fall (E.contact, one beat)
    hit: b(2), //                   contact on the downbeat: squash, recoil, the hit
    glide: b(2), //                 the impact sets the mark gliding aside (peak ~12 px/f)
    word1: b(2, 2), //              "In" settles (97%) on the beat
    word2: b(2, 3), //              "sync." locks; the accent period pops
  };

  // Copy: first frame visible, frame it reads as resolved, last frame on screen.
  const wordIn = Math.floor(startFor(CUE.word1, DUR.word, WORD_EASE));
  const COPY = [{ id: 'lockup', text: 'In sync.', in: wordIn, resolved: CUE.word2, out: TOTAL }];

  /** Sound events for out/cues.json: {fps, bpm, total, acts, cue, events:[{f, kind, weight, pan}]} */
  function cues() {
    // Settles on their 97% frame, the impact on its contact frame, the whoosh apex on the peak.
    // Weights are set so no event is masked by the bed (score.py reports masking per event).
    const g0 = CUE.glide, g1 = CUE.glide + DUR.glide, apex = peak(g0, g1, E.glide);
    const events = [
      { f: settleOf(CUE.rise, CUE.rise + DUR.rise, E.out), kind: 'land', variant: 'light', weight: 0.8, pan: -0.1, id: 'bar' },
      { f: settleOf(CUE.slide, CUE.slide + DUR.slide, E.out), kind: 'land', variant: 'light', weight: 0.7, pan: 0.1, id: 'square' },
      { f: CUE.hit, kind: 'hit', weight: 1, pan: 0.1, id: 'accent-contact' },
      { f: apex, kind: 'whoosh', weight: 1.3, pan: -0.3, dur: DUR.glide, apexFrac: (apex - g0) / DUR.glide, id: 'glide' },
      { f: CUE.word1, kind: 'snap', weight: 1.0, pan: 0.05, id: 'word1' },
      { f: CUE.word2, kind: 'snap', weight: 0.9, pan: 0.25, id: 'word2' },
      { f: CUE.word2, kind: 'tick', weight: 0.6, pan: 0.35, id: 'period' },
    ].sort((p, q) => p.f - q.f);
    return { fps: FPS, bpm: BPM, total: TOTAL, acts: ACT, cue: CUE, events };
  }

  const FILM = { FPS, BPM, TAIL, ACT, TOTAL, DUR, DROP, WORD_EASE, CUE, COPY, cues };
  root.FILM = FILM;
  if (typeof module === 'object' && module.exports) module.exports = FILM;
})(typeof window !== 'undefined' ? window : globalThis);
