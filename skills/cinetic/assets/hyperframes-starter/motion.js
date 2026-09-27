/*
 * motion.js: the cinetic motion kit for HyperFrames (plain script, no build step).
 *
 * The same grid, easing tokens, springs, envelopes and sync helpers as the Remotion kit
 * (src/lib/anim.ts + src/lib/sync.ts), with the same names and numbers, plus adapters that turn
 * them into GSAP eases. Every export is a pure function of its arguments: no clocks, no unseeded
 * randomness, no state carried between frames, because HyperFrames seeks each frame on its own
 * (often in parallel workers).
 *
 * Units: the grid is in FRAMES (the numbers the sound pipeline and grid-check read). GSAP wants
 * SECONDS, so convert at the call site with sec() or at().
 *
 * Loads as a classic <script> (sets window.BF) and under Node (module.exports or vm), so tools
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

  // ---- easing tokens: named for how they feel (table: references/motion-tokens.md) ---------
  const E = {
    out: bez(0.16, 1, 0.3, 1), //         expo-out: arrivals and reveals (never fade-outs)
    outSoft: bez(0.22, 1, 0.36, 1), //    quint-out: gentle settles
    in: bez(0.7, 0, 0.84, 0), //          expo-in: departures, implosions, exits
    inOut: bez(0.87, 0, 0.13, 1), //      expo-in-out: whips and lockup slides
    smooth: bez(0.65, 0, 0.35, 1), //     cubic-in-out: drifts and 10-14 f fades
    ui: bez(0.4, 0, 0.2, 1), //           small UI state changes
    cam: bez(0.48, 0.1, 0, 0.9), //       camera: slow start, peak at ~27%, long settle
    glide: bez(0.47, 0.2, 0.15, 1), //    150-350 px moves with a soft landing
    rest: bez(0.45, 0, 0.1, 1), //        zero-slope start, ends at rest: chains after a move
    contact: bez(0.55, 0, 0.9, 0.55), //  accelerates INTO an impact (ends with velocity)
    whip: bez(0.6, 0, 0.15, 1), //        feature-to-feature whips
    dolly: bez(0.35, 0, 0.65, 1), //      slow push through a hold
    linear: (p) => p, //                  drift only
  };

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const mix = (a, z, t) => a + (z - a) * t;
  /** Log-space mix for scale and zoom: equal ratios per frame, so a zoom never seems to rush. */
  const lmix = (a, z, t) => Math.exp(mix(Math.log(a), Math.log(z), t));
  /** Clamped eased value between two frames (for values you compute yourself, e.g. in onUpdate). */
  const tw = (f, from, to, a, z, ease = E.out) => mix(a, z, ease(clamp((f - from) / (to - from))));
  const prog = (f, from, to, ease = E.out) => tw(f, from, to, 0, 1, ease);

  // ---- vertical text: finish the move while it still travels ------------------------------
  /**
   * Chromium snaps a text layer's vertical position to whole pixels (horizontal stays sub-pixel),
   * so the slow tail of an ease-out settles in 1 px ticks with holds between them. `arrive` ends a
   * move at `k` of its curve, while it still travels ~0.5-1 px/f; `depart` skips the slow start of
   * an exit. `arriving(ease)` / `departing(ease)` wrap a GSAP ease the same way:
   *   tl.fromTo('#w1', { yPercent: 115 }, { yPercent: 0, duration: sec(30), ease: BF.arriving(E.out) }, t);
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
   *   const P = BF.pulse(2, 5);
   *   tl.fromTo(el, { scale: 1 }, { scale: 1.03, duration: P.dur, ease: P.ease }, BF.sec(CUE.hit));
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
   *   const S = BF.spring(BF.SPR.snap);
   *   tl.fromTo(el, { y: 120 }, { y: 0, duration: S.dur, ease: S.ease }, BF.sec(start));
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

  /** Spring presets, identical to the Remotion kit. Default to critical damping (zeta >= 1). */
  const SPR = {
    snap: { damping: 18, stiffness: 260, mass: 0.7 }, //   locks into place, small overshoot
    pop: { damping: 11, stiffness: 180, mass: 0.6 }, //    14% overshoot: a true landing only (<= 2 per film)
    soft: { damping: 26, stiffness: 120, mass: 1 }, //     weighty, no overshoot
    heavy: { damping: 30, stiffness: 90, mass: 1.4 }, //   big objects
    firm: { damping: 24, stiffness: 140, mass: 1 }, //     UI arrivals, no overshoot
    micro: { damping: 30, stiffness: 500, mass: 0.6 }, //  chips, badges, small snaps
    land: { damping: 14.5, stiffness: 200, mass: 1 }, //   ~15% overshoot: a true landing only (<= 2 per film)
    word: { damping: 20, stiffness: 170, mass: 0.9 }, //   words sliding in to lock
    detent: { damping: 24, stiffness: 380, mass: 0.6 }, // a reel or picker clicking home
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

  const BF = {
    FPS, BPM, W, H, BEAT, BAR, b, sec, at, fd,
    bez, E, clamp, mix, lmix, tw, prog, arrive, depart, arriving, departing, hitPulse, squash, pulse, springFn, spring, SPR,
    peak, settleOf, delayTo, hit, reachAt, startFor, rand,
  };
  root.BF = BF;
  if (typeof module === 'object' && module.exports) module.exports = BF;
})(typeof window !== 'undefined' ? window : globalThis);
