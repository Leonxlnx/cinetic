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
  const MOTION = root.MOTION || (typeof require === 'function' ? require('./motion.js') : null);
  if (!MOTION) throw new Error('timeline.js: load motion.js first');
  const { b, E, FPS, BPM, peak, settleOf, startFor, arriving, pace, wordCount, holdFor, revealFor, readingWindows } = MOTION;

  const TAIL = FPS; // 1 s after the last event: room for reverb tails and the poster hold

  // Acts are contiguous and bar-aligned.
  const ACT = {
    mark: { from: 0, dur: b(2) }, //                       bar 1: the mark assembles
    lockup: { from: b(2), dur: b(3) + TAIL - b(2) }, //    bar 2: the word locks, then the hold
  };
  const TOTAL = b(3) + TAIL; // 300 f = 5.0 s at 60 fps and 120 BPM (348 f = 5.8 s at 100 BPM)

  // Named cues, on the sixteenth grid.
  const CUE = {
    rise: b(1, 0, 2), //            the tall bar rises
    slide: b(1, 2), //              the square slides in
    fall: b(1, 3), //               the accent starts to fall (E.contact, one beat)
    hit: b(2), //                   contact on the downbeat: squash, recoil, the hit
    glide: b(2), //                 the impact sets the mark gliding aside (peak ~12 px/f)
    word1: b(2, 2), //              "In" settles (97%) on the beat, once the glide has done its work
    word2: b(2, 3), //              "sync." settles a beat later and the accent period pops: the line lands
  };

  // Move lengths in frames. The picture and the cue export both read these. A word rises over
  // 40 f: the calm pace's 36 f, a little longer because it travels a whole line out of its mask.
  // The fall comes from the grid, so its contact lands on CUE.hit at any tempo (one beat: 30 f at
  // 120 BPM, 36 f at 100).
  const DUR = { rise: 36, slide: 36, fall: CUE.hit - CUE.fall, glide: 72, word: 40 };
  const DROP = 96; // px the accent falls; on E.contact (4.5x its mean speed at contact) it meets the grid at ~14 px/f at 120 BPM, ~12 at 100
  // The words rise on the pace's ease (calm: E.outSoft, no overshoot), finished early with
  // arriving(): vertical text snaps to whole pixels, so a rise that creeps its last pixels settles
  // in visible 1 px ticks.
  const WORD_EASE = arriving(E[pace.ease]);

  /**
   * One thought as a chain of fragments, one COPY entry each (`<id>.1`, `<id>.2`, ...), like the
   * Remotion starter's timeline.ts chain(): 1-4 words per fragment, never a whole sentence at once,
   * with a picture beat between fragments. Give each fragment its first frame; `resolved` follows
   * from the pace, the frame its last word is fully in when its words are pace.stagger apart.
   *   build    fragments append to one held line that clears as a whole at `out`
   *   replace  each fragment leaves whole (over pace.exitDur: 24 f when calm) and has gone 6 f
   *            before the next one rises in its place, so two fragments never share the spot
   * Render it with the GSAP recipe in references/hyperframes-engine.md ("Fragment chains").
   */
  function chain(id, mode, fragments, o = {}) {
    const f60 = (f) => Math.round((f * FPS) / 60);
    const base = fragments.map(([text, inF], i) => ({ id: `${id}.${i + 1}`, text, in: inF, resolved: inF + f60(revealFor(wordCount(text))), chain: id, mode }));
    const last = base[base.length - 1];
    if (!last) throw new Error(`timeline.js: chain "${id}" has no fragments`);
    if (mode === 'build') {
      const out = o.out ?? last.resolved + f60(holdFor(base.reduce((n, c) => n + wordCount(c.text), 0)));
      return base.map((c) => ({ ...c, out }));
    }
    const leave = f60(pace.exitDur) + f60(6); // the outgoing fragment's exit is over before the next rises
    return base.map((c, i) => ({ ...c, out: base[i + 1] ? base[i + 1].in - leave : (o.out ?? c.resolved + f60(holdFor(wordCount(c.text)))) }));
  }

  // Copy: first frame visible, frame it reads as resolved, last frame on screen. The lockup line is
  // one fragment whose two words land a beat apart (not pace.stagger apart), so its frames come from
  // the cues: it resolves when "sync." settles, and holds 90 f (1.5 s) to the end.
  const wordIn = Math.floor(startFor(CUE.word1, DUR.word, WORD_EASE));
  const COPY = [{ id: 'lockup.1', text: 'In sync.', in: wordIn, resolved: CUE.word2, out: TOTAL, chain: 'lockup', mode: 'build' }];
  // When each entry is being read (motion.js readingWindows(), the rule every check shares).
  const READ = readingWindows(COPY, pace, FPS, TOTAL);

  /**
   * out/cues.json: {fps, bpm, total, pace, acts, cue, copy, events:[{f, kind, weight, pan}]}, the
   * schema scripts/export-cues.ts writes for Remotion: `copy` (every on-screen string with its
   * frames and its reading windows, `read`) gives forensics.py, measure-speed.py and grid-check
   * the reads, `pace` their thresholds.
   */
  function cues() {
    // Settles on their 97% frame, the impact on its contact frame, the whoosh apex on the peak.
    // Weights are set so no event is masked by the bed (score.py reports masking per event).
    const g0 = CUE.glide, g1 = CUE.glide + DUR.glide, apex = peak(g0, g1, E.glide);
    const events = [
      { f: settleOf(CUE.rise, CUE.rise + DUR.rise, E.out), kind: 'land', variant: 'light', weight: 0.8, pan: -0.1, id: 'bar' },
      { f: settleOf(CUE.slide, CUE.slide + DUR.slide, E.out), kind: 'land', variant: 'light', weight: 0.7, pan: 0.1, id: 'square' },
      { f: CUE.hit, kind: 'hit', weight: 1, pan: 0.1, id: 'accent-contact' },
      { f: apex, kind: 'whoosh', weight: 1.3, pan: -0.3, dur: DUR.glide, apexFrac: (apex - g0) / DUR.glide, id: 'glide' },
      // one soft text sound as the line lands (its last word and the period), never one per word
      { f: CUE.word2, kind: 'text', weight: 0.9, pan: 0.2, id: 'line-lands' },
    ].sort((p, q) => p.f - q.f);
    const copy = COPY.map((c) => ({ ...c, words: wordCount(c.text), kind: c.kind || 'copy', read: READ[c.id] || [] }));
    return { fps: FPS, bpm: BPM, total: TOTAL, pace: MOTION.PACE_NAME, acts: ACT, cue: CUE, copy, events };
  }

  // PACE_NAME and PACE ride along so scripts/grid-check.ts reads this file like a Remotion timeline.ts.
  const FILM = { FPS, BPM, TAIL, ACT, TOTAL, DUR, DROP, WORD_EASE, CUE, COPY, READ, PACE_NAME: MOTION.PACE_NAME, PACE: MOTION.PACE, chain, cues };
  root.FILM = FILM;
  if (typeof module === 'object' && module.exports) module.exports = FILM;
})(typeof window !== 'undefined' ? window : globalThis);
