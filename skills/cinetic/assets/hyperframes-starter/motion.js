/*
 * motion.js: the cinetic motion kit for HyperFrames (plain script, no build step).
 *
 * The same grid, pace, easing tokens, springs, envelopes and sync helpers as the Remotion kit
 * (src/lib/pace.ts + src/lib/anim.ts + src/lib/sync.ts), with the same names and numbers, plus
 * adapters that turn them into GSAP eases. Every export is a pure function of its arguments: no clocks, no unseeded
 * randomness, no state carried between frames, because HyperFrames seeks each frame on its own
 * (often in parallel workers).
 *
 * Units: the grid is in FRAMES (the numbers the sound pipeline and grid-check read). GSAP wants
 * SECONDS, so convert at the call site with sec() or at().
 *
 * Loads as a classic <script> (sets window.MOTION) and under Node (module.exports or vm), so tools
 * read the same numbers the picture uses. Keep index.html's data-fps / data-width / data-height
 * equal to FPS / W / H below.
 */
(function (root) {
  'use strict';

  // ---- grid ------------------------------------------------------------------------------
  const FPS = 60;
  const BPM = 120;
  const W = 1920;
  const H = 1080;
  /** Frames per beat. Pick a BPM that makes it whole: 60 fps -> 90, 100, 120, 144, 150 BPM. */
  const BEAT = (60 / BPM) * FPS;
  const BAR = BEAT * 4;
  /** Frame of bar (1-based), beat (0-3) and sixteenth (0-3): b(3) is the downbeat of bar 3. */
  const b = (bar, beat = 0, sub = 0) => Math.round(((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
  /** Frames to seconds, for GSAP durations and positions. */
  const sec = (f) => f / FPS;
  /** Seconds of a grid position: tl.fromTo(el, a, z, at(2, 1)). */
  const at = (bar, beat = 0, sub = 0) => sec(b(bar, beat, sub));
  /** Whole frame for discrete state (typed characters, counters), so blur sub-frames agree. */
  const fd = Math.round;

  // ---- pace: how fast text arrives, how long it holds, how much is on screen ------------------
  // The same profiles as the Remotion kit's src/lib/pace.ts, in 60 fps frames. calm (the house
  // default): fragments of 1-4 words, each word fading in over 32 f on E.snapOut, 12 f apart on the
  // reading cadence, held about 1-1.5 s, taking turns with the picture; crisp: the denser launch
  // tempo, for briefs that ask for energy. The PACE block is written by scripts/gen-pace.mjs from
  // pace.ts: never edit it by hand. scripts/new-film.sh --pace sets PACE_NAME; scripts/lint-film.mjs
  // reads it here.
  const PACE_NAME = 'calm';
  // <gen-pace>
  const PACE = {
    calm: {
      wordDur: 28, stagger: 11, rise: 0.33, riseUnit: 'line', riseDur: 22, blur: 0, ease: 'snapOut',
      cadence: 'reading', exit: 'auto', exitDur: 15, exitFade: 9, exitLift: 0.12, holdBase: 36, holdPerWord: 7,
      holdMin: 52, readMax: 150, gapMin: 26, gapMax: 90, maxNewWords: 4, maxVisibleBuild: 8, maxVisibleReplace: 5,
      maxWordsPerSec: 1.35, avgWordsPerSec: 1, maxWords: 30, textShare: 0.65, freeRun: 90, maxGap: 72, accentDur: 28,
      accentHold: 16, accentCool: 12, accentSpace: 'oklab', recentre: 'jump', recentreDur: 19, recentreLead: 0,
      move: { base: 0.44, perPx: 0.0014, camMin: 0.8, camMax: 2.65 },
      fx: {
        mask: { stagger: 9, dur: 9, exitDur: 19, head: 'linearStop', lastScale: 2.8 }, typeFPerChar: 2,
        scramble: { stagger: 3, rate: 1, fadeIn: 14, order: 'centre', rateHz: 10 }, roll: { dur: 80, roll: 16 },
        morph: 46, iris: 16, irisMode: { mode: 'rate', ratio: 1.28 },
      },
    },
    crisp: {
      wordDur: 23, stagger: 8, rise: 0.33, riseUnit: 'line', riseDur: 19, blur: 0, ease: 'snapOut',
      cadence: 'reading', exit: 'auto', exitDur: 12, exitFade: 7, exitLift: 0.19, holdBase: 28, holdPerWord: 6,
      holdMin: 36, readMax: 120, gapMin: 16, gapMax: 90, maxNewWords: 5, maxVisibleBuild: 10, maxVisibleReplace: 10,
      maxWordsPerSec: 2.25, avgWordsPerSec: 1.35, maxWords: 35, textShare: 0.8, freeRun: 60, maxGap: 48,
      accentDur: 18, accentHold: 6, accentCool: 12, accentSpace: 'oklab', recentre: 'jump', recentreDur: 14,
      recentreLead: 0, move: { base: 0.31, perPx: 0.0012, camMin: 0.53, camMax: 2.1 },
      fx: {
        mask: { stagger: 7, dur: 9, exitDur: 14, head: 'linearStop', lastScale: 2.8 }, typeFPerChar: 2,
        scramble: { stagger: 3, rate: 1.5, fadeIn: 9, order: 'centre', rateHz: 10 }, roll: { dur: 53, roll: 12 },
        morph: 35, iris: 16, irisMode: { mode: 'rate', ratio: 1.28 },
      },
    },
  };
  // </gen-pace>
  const pace = PACE[PACE_NAME];
  /** Words in a string, as every check counts them. */
  const wordCount = (text) => String(text).split(/\s+/).filter(Boolean).length;
  /** Frames (60 fps) a fragment holds after it resolves: max(holdMin, holdBase + holdPerWord * words). */
  const holdFor = (words, p = pace) => Math.max(p.holdMin, p.holdBase + p.holdPerWord * words);
  /** Frames (60 fps) from a fragment's first word starting to its last word fully in. */
  const revealFor = (words, p = pace) => Math.max(0, words - 1) * p.stagger + p.wordDur;
  /**
   * When each COPY entry is being read: {id: [[from, to), ...]} in this film's frames, the rule of
   * the Remotion kit's readingWindows() (src/lib/pace.ts), which every check shares: from
   * `resolved` for at most readMax (never past `out`); an earlier fragment of a chain only for its
   * own hold (never past the next fragment's `in`), so the picture beat between two fragments is
   * not a read; a build line once more, whole, after its last fragment resolves. timeline.js
   * exports it as READ and writes it into out/cues.json; nothing new starts inside a window.
   */
  function readingWindows(copy, p = pace, fps = FPS, total = Infinity) {
    const s = fps / 60;
    const cap = Math.round(p.readMax * s);
    const out = {};
    for (const c of copy) {
      const end = c.out == null ? total : c.out;
      const chain = c.chain ? copy.filter((x) => x.chain === c.chain).sort((a, z) => a.in - z.in) : [c];
      const last = chain[chain.length - 1];
      const next = chain[chain.indexOf(c) + 1];
      const own = next ? [c.resolved, Math.min(next.in, c.resolved + Math.round(holdFor(wordCount(c.text), p) * s), end)] : [c.resolved, Math.min(end, c.resolved + cap)];
      const line = next && (c.mode || 'build') === 'build' ? [last.resolved, Math.min(last.out == null ? total : last.out, last.resolved + cap)] : null;
      out[c.id] = (line ? [own, line] : [own]).filter(([a, z]) => z > a);
    }
    return out;
  }
  /**
   * Frames for a move of `px` pixels at this film's fps: calm 0.5 s + 1.6 ms/px (camera moves
   * clamped to 0.9-3.0 s), crisp 0.35 s + 1.35 ms/px (0.6-2.4 s).
   */
  const durFor = (px, camera = false, p = pace) => {
    const s = p.move.base + p.move.perPx * Math.abs(px);
    return Math.round((camera ? Math.min(p.move.camMax, Math.max(p.move.camMin, s)) : s) * FPS);
  };

  // ---- cubic-bezier solver ---------------------------------------------------------------
  // CSS cubic-bezier() maths: solve x(t) = p (Newton-Raphson, bisection fallback), return y(t).
  // Matches Remotion's Easing.bezier to < 1e-6. GSAP accepts any function p -> value as an ease.
  function bez(x1, y1, x2, y2) {
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) throw new RangeError('bez: x1 and x2 must be in [0,1]');
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t;
    const Y = (t) => ((ay * t + by) * t + cy) * t;
    const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    function solveT(p) {
      let t = p;
      for (let i = 0; i < 8; i++) {
        const err = X(t) - p;
        if (Math.abs(err) < 1e-7) return t;
        const d = dX(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      let lo = 0, hi = 1;
      t = p;
      for (let i = 0; i < 40; i++) {
        const x = X(t);
        if (Math.abs(x - p) < 1e-7) return t;
        if (x < p) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    }
    const ease = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : Y(solveT(p)));
    ease.points = [x1, y1, x2, y2];
    return ease;
  }

  /** True exponential ease-out, normalised to land on 1: (1 - e^(-k p)) / (1 - e^(-k)). k = 6: half-way at 12%, 90% at 38%. */
  function expOut(k) {
    const n = 1 - Math.exp(-k);
    return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : (1 - Math.exp(-k * p)) / n);
  }
  /** Exponential ease-in: (e^(k p) - 1) / (e^k - 1); its speed grows by e^(k / frames) every frame. */
  function expIn(k) {
    const n = Math.exp(k) - 1;
    return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : (Math.exp(k * p) - 1) / n);
  }
  /** A per-frame ratio written at fpsRef as the same ratio per frame at fps: r^(fpsRef / fps). */
  const perFrame = (r, fpsRef, fps) => r ** (fpsRef / fps);
  /** A house curve given as progress at p = 0, 0.1 ... 1, through a monotone cubic (as the Remotion kit's table()). */
  function table(ys) {
    const n = ys.length - 1, h = 1 / n;
    const d = ys.slice(0, -1).map((y, i) => (ys[i + 1] - y) / h);
    const end = (a, z) => { const q = a + (a - z) * 0.5; return Math.sign(q) !== Math.sign(a) ? 0 : Math.abs(q) > 2 * Math.abs(a) ? 2 * a : q; };
    const m = ys.map((_, i) => {
      if (i === 0) return end(d[0], d[1]);
      if (i === n) return end(d[n - 1], d[n - 2]);
      const a = d[i - 1], z = d[i];
      if (a * z <= 0) return 0;
      return (Math.sign(a) + Math.sign(z)) * Math.min(Math.abs(a), Math.abs(z), Math.abs((a + z) / 2) / 2);
    });
    return (p) => {
      if (p <= 0) return ys[0];
      if (p >= 1) return ys[n];
      const i = Math.min(n - 1, Math.floor(p / h)), s = (p - i * h) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
    };
  }
  /** Name a curve and give it its family: arrive | reposition | leave | linear (1.1 names also say what replaces them). */
  const tag = (fn, family, token, deprecated) => Object.assign((p) => fn(p), deprecated ? { family, token, deprecated } : { family, token });

  const STD_IN_OUT = [0, 0.04, 0.127, 0.316, 0.55, 0.756, 0.871, 0.924, 0.962, 0.986, 1];
  const WHIP_BUILD = [0, 0.017, 0.041, 0.083, 0.143, 0.279, 0.522, 0.757, 0.902, 0.976, 1];

  // ---- easing tokens by role (the Remotion kit's lib/anim.ts E; table: references/motion-tokens.md)
  const E = {
    // arrive: peak speed on the first frame
    snapOut: tag(bez(0.137, 0.758, 0.128, 0.926), 'arrive', 'snapOut'), //   words (opacity and rise as one), inserts, tiles; 32 f
    glideOut: tag(bez(0.172, 0.687, 0.393, 0.943), 'arrive', 'glideOut'), // THE default arrival; 34 f
    settleOut: tag(bez(0.202, 0.579, 0.484, 0.887), 'arrive', 'settleOut'), // UI cards, slow settles; 34 f
    softOut: tag(expOut(1.271), 'arrive', 'softOut'), //                      tints, mask reveals, slow pushes; 34 f
    liftOut: tag(bez(0.399, 0.329, 0.148, 0.966), 'arrive', 'liftOut'), //   UI reframes: a short lunge, a long settle; 31 f
    jump: tag(expOut(12), 'arrive', 'jump'), //                               line re-centre: 42 % in frame 1 of 22 f at 60 fps
    // reposition inside a shot
    stdInOut: tag(table(STD_IN_OUT), 'reposition', 'stdInOut'), //           repositioning, pull-backs, presses; 30 f
    strongInOut: tag(bez(0.673, 0.077, 0.288, 0.943), 'reposition', 'strongInOut'), // camera reframes, pans, colour cross-fades; 36 f
    whipBuild: tag(table(WHIP_BUILD), 'reposition', 'whipBuild'), //         whips: long build, short brake (peak at .55-.6); 28 f
    anticipate: tag(bez(0.56, -0.303, 0.132, 0.795), 'reposition', 'anticipate'), // one wind-up per film at most
    // leave: end at speed; cut on the last frame
    softIn: tag(bez(0.571, 0.245, 0.76, 0.612), 'leave', 'softIn'), //       gentle exits; 28 f
    buildIn: tag(bez(0.525, 0.079, 0.724, 0.331), 'leave', 'buildIn'), //    THE exit (x1.11 a frame at 26 f); 26 f
    launchIn: tag(bez(0.556, 0.053, 0.835, 0.188), 'leave', 'launchIn'), //  into a cut (x1.16 a frame at 29 f); 29 f
    linear: tag((p) => p, 'linear', 'linear'), //                             colour lerps, decays, drifts, counters
    // 1.1 names, 1.1 shapes
    out: tag(bez(0.16, 1, 0.3, 1), 'arrive', 'out', 'snapOut'), //           expo-out: arrivals and reveals (never fade-outs)
    outSoft: tag(bez(0.22, 1, 0.36, 1), 'arrive', 'outSoft', 'snapOut'), //  quint-out: gentle settles
    in: tag(bez(0.7, 0, 0.84, 0), 'leave', 'in', 'launchIn'), //             expo-in: departures, implosions, exits
    inOut: tag(bez(0.87, 0, 0.13, 1), 'reposition', 'inOut', 'strongInOut'), // expo-in-out: whips and lockup slides
    smooth: tag(bez(0.65, 0, 0.35, 1), 'reposition', 'smooth', 'strongInOut'), // cubic-in-out: drifts and 10-14 f fades
    ui: tag(bez(0.4, 0, 0.2, 1), 'reposition', 'ui', 'stdInOut'), //         small UI state changes
    cam: tag(bez(0.48, 0.1, 0, 0.9), 'arrive', 'cam', 'liftOut'), //         camera: slow start, peak at ~27%, long settle
    glide: tag(bez(0.47, 0.2, 0.15, 1), 'arrive', 'glide', 'liftOut'), //    150-350 px moves with a soft landing
    rest: tag(bez(0.45, 0, 0.1, 1), 'reposition', 'rest', 'stdInOut'), //   zero-slope start, ends at rest
    contact: tag(bez(0.55, 0, 0.9, 0.55), 'leave', 'contact', 'buildIn'), // accelerates INTO an impact (ends with velocity)
    whip: tag(bez(0.6, 0, 0.15, 1), 'reposition', 'whip', 'whipBuild'), //   feature-to-feature moves (fast start)
    dolly: tag(bez(0.35, 0, 0.65, 1), 'reposition', 'dolly', 'linear'), //  slow push through a hold
    exit: tag(bez(0.55, 0.055, 0.675, 0.19), 'leave', 'exit', 'buildIn'), // cubic-in: exits into a cut
    type: tag(bez(0.5, 1, 0.89, 1), 'arrive', 'type'), //                    quad-out: an eased typewriter
    expo: tag(expOut(6), 'arrive', 'expo'), //                                exponential glide of held text (the 1.1 re-centre)
  };
  /** The 1.1 easing names and their replacements. */
  const E_DEPRECATED = Object.fromEntries(Object.entries(E).filter(([, e]) => e.deprecated).map(([k, e]) => [k, e.deprecated]));

  /** Special curves primitives use as their defaults, by job (the Remotion kit's M). */
  const M = {
    rise: tag(bez(0.17, 0.75, 0.29, 0.83), 'arrive', 'M.rise'),
    press: tag(bez(0.77, 0.51, 0.33, 0.94), 'reposition', 'M.press'),
    lockup: tag(bez(0.841, 0.113, 0.196, 0.941), 'reposition', 'M.lockup'),
    develop: tag(bez(0.73, 0.26, 0.45, 0.69), 'reposition', 'M.develop'),
    letterArc: tag(bez(0.428, 1.064, 0.653, 1.114), 'arrive', 'M.letterArc'),
    letterGrow: tag(bez(0.721, 0.007, 0.854, 1.45), 'reposition', 'M.letterGrow'),
    letterSlide: tag(bez(0.301, 0.189, 0.249, 0.89), 'arrive', 'M.letterSlide'),
    groupSettle: tag(bez(0.172, 0.752, 0.455, 0.826), 'arrive', 'M.groupSettle'),
    pixelStair: tag(bez(0.49, 0.03, 0.07, 0.94), 'reposition', 'M.pixelStair'),
    demosaicZoom: tag(bez(0.006, 0.51, 0.35, 1), 'arrive', 'M.demosaicZoom'),
    collagePush: tag(bez(0.734, 0.266, 0.339, 0.837), 'reposition', 'M.collagePush'),
    oversize: tag(bez(0.232, 0.902, 0.794, 0.997), 'arrive', 'M.oversize'),
    squeeze: tag(bez(0.917, 0.495, 0.361, 0.843), 'reposition', 'M.squeeze'),
    swell: tag(bez(1, -0.044, 0.791, 0.97), 'reposition', 'M.swell'),
    ringTighten: tag(bez(0.253, -0.242, 0.331, 0.925), 'reposition', 'M.ringTighten'),
    focusSlide: tag(bez(0, 0.973, 0.466, 0.983), 'arrive', 'M.focusSlide'),
  };

  // ---- tables: house numbers, 60 fps frames unless noted (the Remotion kit's lib/anim.ts) ----
  const DUR = {
    word: [16, 24, 32, 32, 57], lineIn: [12, 18, 28, 54, 78], letter: [12, 25, 34, 45, 64],
    typeOther: [8, 19, 26, 53, 66], typeOn: [19, 24, 40, 58, 91],
    typeColour: [12, 12, 18, 28, 60], typeScale: [13, 19, 26, 49, 81], typeExit: [7, 10, 17, 24, 33],
    reflow: [10, 12, 22, 44, 64], scaleIn: [11, 20, 32, 53, 81], slideIn: [15, 18, 30, 39, 48],
    exit: [10, 15, 24, 32, 44], ui: [10, 20, 34, 50, 70], press: [12, 17, 20, 25, 32],
    cursor: [25, 31, 44, 54, 90], logoPart: [10, 20, 30, 46, 80], counter: [24, 24, 34, 80, 120],
    lineDraw: [13, 16, 22, 45, 95], mask: [12, 17, 26, 40, 58], morph: [14, 16, 22, 32, 49],
    colour: [12, 20, 34, 54, 110], whip: [17, 21, 32, 52, 94], zoomThrough: [14, 24, 35, 46, 75],
    push: [15, 28, 50, 72, 86], pull: [25, 30, 43, 70, 129], pan: [27, 38, 48, 72, 126],
    drift: [18, 28, 49, 82, 146], orbit: [25, 35, 55, 81, 110], seamMove: [6, 14, 25, 42, 64],
    collage: [25, 27, 40, 62, 120], loader: [14, 17, 25, 30, 61], ambient: [18, 29, 60, 97, 244],
    hold: [15, 24, 76, 147, 302], focus: [16, 16, 27, 45, 45],
  };
  const PRESS = { squeeze: 9, hold: 3, release: 10 };
  const TAU = { marker: 3, element: 8, hero: 17, world: 30, exitUi: 6, exitCamera: 19 };
  const STAG = {
    letter: [2, 3, 4, 8, 14], word: [4, 7, 10, 14, 14], row: [6, 8, 9, 10, 18],
    ui: [2.5, 5, 7.5, 17.5, 34], logoPart: [6, 6, 7, 24, 30],
  };
  const ACCEL = {
    rows: [18, 18, 14, 10, 8, 6, 6],
    montage: [14, 14, 14, 14, 14, 10, 10, 10, 6, 6, 6, 6, 6, 6],
    typing: [5, 2, 2, 1, 1, 1],
  };
  const CPS = { human: { min: 19, house: 30, max: 45, burst: 2 }, prompt: { start: 5, end: 19 }, stream: { min: 50, max: 150 } };
  const SPEED = {
    wordRise: [420, 630, 1080], reflowPeak: [930, 2000, 3060], uiCard: [390, 1080, 1900], slideIn: [780, 1860, 3200],
    cursor: [1350, 1530, 2400], pan: [570, 1700, 2640], whipPeak: [750, 1600, 3700], whipMax: 7400,
    cutExitTypical: [900, 2700], holdDrift: [6, 30, 90], residualAfterCut: 45, blurThreshold: [900, 1200], crispFlatMax: 10000,
  };
  const CARRY = {
    ratio: [0.4, 0.7, 1.4], decay60: [0.78, 0.89, 0.93], fast: { share: 0.6, decay60: 0.4 }, residual60: 0,
    approach60: [16, 46], settle60: [16, 50],
  };
  const BREATH = { into: [0.01, 0.08], intoDur60: [10, 20], open: [0.05, 0.12], settleDur60: [8, 50] };
  const OVERSIZE = { from: [1.28, 1.9], dur60: [22, 56] };

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const mix = (a, z, t) => a + (z - a) * t;
  /** Log-space mix for scale and zoom: equal ratios per frame, so a zoom never seems to rush (linear when an end is 0). */
  const lmix = (a, z, t) => (a > 0 && z > 0 ? Math.exp(mix(Math.log(a), Math.log(z), t)) : mix(a, z, t));
  /** Clamped eased value between two frames (for values you compute yourself, e.g. in onUpdate). */
  const tw = (f, from, to, a, z, ease = E.out) => mix(a, z, ease(clamp((f - from) / (to - from))));
  const prog = (f, from, to, ease = E.out) => tw(f, from, to, 0, 1, ease);

  // ---- vertical text: finish the move while it still travels ------------------------------
  /**
   * Chromium snaps a text layer's vertical position to whole pixels (horizontal stays sub-pixel),
   * so the slow tail of an ease-out settles in 1 px ticks with holds between them. `arrive` ends a
   * move at `k` of its curve, while it still travels ~0.5-1 px/f; `depart` skips the slow start of
   * an exit. `arriving(ease)` / `departing(ease)` wrap a GSAP ease the same way:
   *   tl.fromTo('#w1', { yPercent: 115 }, { yPercent: 0, duration: sec(30), ease: MOTION.arriving(E.out) }, t);
   * Same numbers as the Remotion kit's arrive/depart (src/lib/anim.ts).
   */
  const arrive = (p, k = 0.94) => clamp(p / k);
  const depart = (q, k = 0.06) => clamp((q - k) / (1 - k));
  const arriving = (ease, k = 0.94) => (p) => arrive(ease(p), k);
  const departing = (ease, k = 0.06) => (p) => depart(ease(p), k);

  // ---- hitPulse: the one envelope for punches and ticks (frames) ---------------------------
  /**
   * 0 at t <= 0, quarter-sine up to 1 at `attack`, then exp(-(t - attack) / tau); gone at attack + 6 tau.
   * `t` is in this film's frames; `attack` and `tau` are 60 fps frames (as in the Remotion kit), so a
   * pulse lasts the same time at any fps.
   */
  const hitPulse = (t, attack = 2, tau = 5) => {
    const u = (t * 60) / FPS;
    return u <= 0 || u > attack + 6 * tau ? 0 : u < attack ? Math.sin((u / attack) * (Math.PI / 2)) : Math.exp(-(u - attack) / tau);
  };
  /** Contact squash `t` frames after contact: 10% flatter along the impact, 8% wider across it. */
  const squash = (t) => {
    const k = hitPulse(t, 1, 4);
    return { along: 1 - 0.1 * k, across: 1 + 0.08 * k };
  };

  /**
   * hitPulse as a GSAP ease. It runs 0 -> 1 -> 0, so the tween's `to` value is the PEAK and the
   * property is back at its `from` value when the tween ends (the tiny exp(-6) tail is removed).
   *   const P = MOTION.pulse(2, 5);
   *   tl.fromTo(el, { scale: 1 }, { scale: 1.03, duration: P.dur, ease: P.ease }, MOTION.sec(CUE.hit));
   * The peak lands `attack` (60 fps) frames after the tween's start, i.e. 2 f after its sound by default.
   */
  function pulse(attack = 2, tau = 5) {
    const T = ((attack + 6 * tau) * FPS) / 60; // this film's frames
    const tail = hitPulse(T, attack, tau);
    const ease = (p) => (p <= 0 || p >= 1 ? 0 : hitPulse(p * T, attack, tau) - p * tail);
    return { ease, dur: sec(T), durF: T, peakF: (attack * FPS) / 60 };
  }

  // ---- springs: closed form, seek-safe ------------------------------------------------------
  /**
   * Position x(t), t in seconds, of Remotion's spring(): m x'' + c x' + k (x - 1) = 0 from rest.
   * Accepts {stiffness, damping, mass} or {response (s), dampingFraction}. Like Remotion, any
   * zeta >= 1 uses the critically damped solution, so overdamped presets keep the shape they were
   * tuned with. Matches Remotion's frames to < 0.1% of travel.
   */
  function springFn(cfg) {
    let k, c, m;
    if (cfg.response !== undefined) {
      const w = (2 * Math.PI) / cfg.response;
      const z = cfg.dampingFraction === undefined ? 1 : cfg.dampingFraction;
      m = 1; k = w * w; c = 2 * z * w;
    } else {
      k = cfg.stiffness === undefined ? 100 : cfg.stiffness;
      c = cfg.damping === undefined ? 10 : cfg.damping;
      m = cfg.mass === undefined ? 1 : cfg.mass;
    }
    if (!(k > 0 && m > 0 && c > 0)) throw new RangeError('spring: need stiffness, mass and damping > 0');
    const w0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    }
    return (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  /**
   * spring(cfg, eps) -> {ease, dur, durF, x}: a GSAP ease plus the duration (seconds, whole
   * frames) after which |1 - x| stays below eps (0.001 = 0.4 px on a 400 px move). The ease is
   * x(p * dur) plus a sub-eps linear correction, so it ends on exactly 1 with no final snap.
   *   const S = MOTION.spring(MOTION.SPR.snap);
   *   tl.fromTo(el, { y: 120 }, { y: 0, duration: S.dur, ease: S.ease }, MOTION.sec(start));
   * Put overshooting springs on transforms only and fade opacity with its own short tween.
   */
  function spring(cfg = SPR.snap, eps = 1e-3) {
    const x = springFn(cfg);
    const step = 1 / (FPS * 4);
    let last = 0;
    for (let t = 0; t <= 20; t += step) if (Math.abs(1 - x(t)) >= eps) last = t;
    const dur = Math.ceil((last + step) * FPS) / FPS;
    const resid = 1 - x(dur);
    const ease = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : x(p * dur) + resid * p);
    return { ease, dur, durF: Math.round(dur * FPS), x };
  }

  /**
   * Spring presets, identical to the Remotion kit. Default to critical damping. A film has ONE
   * underdamped class (one kind of element that springs, every time, never type); the 1.1 presets
   * keep their 1.1 configs. Keep one preset per line (lint-film reads them).
   */
  const SPR = {
    critical: { stiffness: 170, damping: 26, mass: 1 }, //       DEFAULT: zeta 1.00, settled (2 %) in 27 f at 60 fps
    criticalFast: { stiffness: 400, damping: 40, mass: 1 }, //   markers, chips: 18 f
    criticalSlow: { stiffness: 60, damping: 15.5, mass: 1 }, //  big objects, the camera: 45 f
    landing: { stiffness: 244, damping: 18.3, mass: 1 }, //      THE spring class: zeta 0.59, 10 %, 23 f
    softLanding: { stiffness: 145, damping: 16, mass: 1 }, //    big framing objects: 6 %, 30 f
    menu: { stiffness: 910, damping: 39, mass: 1 }, //           a menu or container snapping open: 7 %, 12 f
    containerPop: { stiffness: 4274, damping: 71, mass: 1 }, //  a container morph: 12-13 %, 6 f
    wordDrop: { stiffness: 864, damping: 33.3, mass: 1 }, //     posterised word drops only: 11 %, 12 f
    lazyWheel: { stiffness: 100, damping: 10.1, mass: 1 }, //    wheel pickers: 16 %, 49 f
    logoSwing: { stiffness: 68, damping: 8.24, mass: 1 }, //     a logo's rotation after a wind-up: 16 %, 59 f
    snap: { damping: 18, stiffness: 260, mass: 0.7 }, //         1.1: locks into place, small overshoot
    pop: { damping: 11, stiffness: 180, mass: 0.6 }, //          1.1: 14% overshoot
    soft: { damping: 26, stiffness: 120, mass: 1 }, //           1.1: weighty, no overshoot
    heavy: { damping: 30, stiffness: 90, mass: 1.4 }, //         1.1: big objects
    firm: { damping: 24, stiffness: 140, mass: 1 }, //           1.1: UI arrivals, no overshoot
    micro: { damping: 30, stiffness: 500, mass: 0.6 }, //        1.1: chips, badges, small snaps
    land: { damping: 14.5, stiffness: 200, mass: 1 }, //         1.1: ~15% overshoot
    word: { damping: 20, stiffness: 170, mass: 0.9 }, //         1.1: words sliding in to lock
    detent: { damping: 24, stiffness: 380, mass: 0.6 }, //       1.1: a reel or picker clicking home
    calm: { damping: 16, stiffness: 64, mass: 1 }, //            1.1: critically damped, 97% at 41 f
  };
  /** The 1.1 spring presets and the preset that replaces each. */
  const SPR_DEPRECATED = {
    snap: 'landing', pop: 'containerPop', soft: 'critical', heavy: 'criticalSlow', firm: 'critical',
    micro: 'criticalFast', land: 'landing', word: 'critical', detent: 'criticalFast', calm: 'criticalSlow',
  };

  // ---- sync: computed from the same curves the picture uses --------------------------------
  const STEPS = 400;
  /** Frame of peak velocity of a tween from frame a to b (where a whoosh's apex goes). */
  function peak(a, z, ease) {
    let best = a, bestV = -Infinity;
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS;
      const v = Math.abs(ease(Math.min(1, t + 1 / STEPS)) - ease(t));
      if (v > bestV) { bestV = v; best = a + (t + 0.5 / STEPS) * (z - a); }
    }
    return Math.round(best);
  }
  /** First frame a tween from a to b reaches `thr` of its travel (0.97 = where a settle sound goes). */
  function settleOf(a, z, ease, thr = 0.97) {
    for (let f = Math.ceil(a); f < z; f++) if (ease((f - a) / (z - a)) >= thr) return f;
    return Math.ceil(z);
  }
  /** Frames after its start until a spring first reaches `thr` (0.5 = pop, 1 = contact). */
  function delayTo(cfg, thr = 1) {
    const x = springFn(cfg);
    for (let f = 0; f < FPS * 4; f++) if (x(f / FPS) >= thr - 5e-4) return f;
    throw new Error(`delayTo: spring never reached ${thr} within 4 s`);
  }
  /** Absolute frame a spring started at `start` first reaches `thr`. */
  const hit = (start, cfg, thr = 1) => start + delayTo(cfg, thr);
  /** Progress p at which ease(p) first reaches `reach` (bisection; the eases here are monotone). */
  function reachAt(ease, reach) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (ease(mid) < reach) lo = mid; else hi = mid;
    }
    return hi;
  }
  /**
   * Start frame (fractional) so a durF-frame tween on `ease` is `reach` of the way home exactly on
   * cueF. An expo-out arrival reads as settled long before its last frame, so a tween that starts
   * at cue - dur lands visibly late. 0.97 matches settleOf, where the lock's sound goes.
   */
  const startFor = (cueF, durF, ease, reach = 0.97) => cueF - reachAt(ease, reach) * durF;

  // ---- seeded randomness ----------------------------------------------------------------------
  /** Deterministic value in [0,1) from a number or string seed (same hash as the Remotion kit). */
  function rand(seed) {
    const s = String(seed);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  const MOTION = {
    FPS, BPM, W, H, BEAT, BAR, b, sec, at, fd,
    PACE_NAME, PACE, pace, wordCount, holdFor, revealFor, readingWindows, durFor,
    bez, expOut, expIn, perFrame, tag, STD_IN_OUT, WHIP_BUILD, E, E_DEPRECATED, M,
    DUR, PRESS, TAU, STAG, ACCEL, CPS, SPEED, CARRY, BREATH, OVERSIZE,
    clamp, mix, lmix, tw, prog, arrive, depart, arriving, departing, hitPulse, squash, pulse, springFn, spring, SPR, SPR_DEPRECATED,
    peak, settleOf, delayTo, hit, reachAt, startFor, rand,
  };
  root.MOTION = MOTION;
  if (typeof module === 'object' && module.exports) module.exports = MOTION;
})(typeof window !== 'undefined' ? window : globalThis);
