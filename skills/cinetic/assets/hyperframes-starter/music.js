/*
 * music.js: the film-time music grid, the HyperFrames twin of the Remotion starter's src/music.ts.
 *
 * With a licensed track, `python3 scripts/audio/track.py grid` rewrites this file from
 * audio/music/edit.json: every number is a film frame (fractional) at the film's fps, so the edit
 * stays invisible to the picture code. This is the stub the starter ships: MUSIC = null, and
 * timeline.js keeps motion.js's BPM grid (an effects-only film, or a film before its track).
 *
 * A generated file keeps these names:
 *   MUSIC        { bpm, beatS, fps, t0, bars, phraseLen, downbeats, accents: [{f, db, band}], phrases,
 *                  sections, entries, breaks, stops: [{from, to}], end: {mode: 'stop'|'button'|'ring', f} }
 *   bar()        film frame of a music grid position, fractional; timeline.js b() rounds it
 *   accentNear() the analysed track accent within `tol` frames of f, or null
 *
 * Load it before timeline.js (<script src="music.js">). Loads as a classic script (sets
 * window.MUSIC_GRID) and under Node (module.exports); a timeline.js that finds neither runs without
 * a track. Pure functions only: HyperFrames seeks every frame on its own.
 */
(function (root) {
  'use strict';

  const MUSIC = null;

  /**
   * Film frame (fractional) of bar (1-based), beat (0-3) and sixteenth (0-3). With MUSIC set it
   * follows the music: inside the measured bars from one downbeat attack to the next (downbeats[0]
   * is t0), past them at the track's tempo. With MUSIC null, the plain grid of `grid` (default 60 fps
   * at 120 BPM). timeline.js calls it only when MUSIC is set and rounds it.
   */
  function bar(n, beat = 0, sixteenth = 0, grid = { fps: 60, bpm: 120 }) {
    const pos = (n - 1) * 4 + beat + sixteenth / 4; // beats after bar 1's downbeat
    if (!MUSIC) return pos * (60 / grid.bpm) * grid.fps;
    const beatF = MUSIC.beatS * MUSIC.fps;
    const d = MUSIC.downbeats || [];
    const i = Math.floor(pos / 4); // 0-based bar of this position
    if (i >= 0 && i + 1 < d.length) return d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i]);
    if (d.length && i >= d.length - 1) return d[d.length - 1] + (pos - 4 * (d.length - 1)) * beatF;
    return (d.length ? d[0] : MUSIC.t0) + pos * beatF; // before bar 1 (a pickup), or no measured downbeats
  }

  /** The analysed track accent within `tol` frames of f (the nearest), or null; always null in the stub. */
  function accentNear(f, tol = 1) {
    if (!MUSIC) return null;
    let best = null;
    for (const a of MUSIC.accents) if (Math.abs(a.f - f) <= tol && (!best || Math.abs(a.f - f) < Math.abs(best.f - f))) best = a;
    return best;
  }

  const API = { MUSIC, bar, accentNear };
  root.MUSIC_GRID = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
