// The film-time music grid. With a licensed track, `python3 scripts/audio/track.py grid` rewrites
// this file from audio/music/edit.json: every number is a film frame (fractional) at the film's fps,
// so the edit stays invisible to the picture code. This is the stub the starter ships: MUSIC = null,
// and src/timeline.ts keeps its own BPM grid (an effects-only film, or a film before its track).
//
// A generated file keeps these exports and names:
//   MUSIC        { bpm, beatS, fps, t0, bars, phraseLen, downbeats, accents, phrases, sections,
//                  entries, breaks, stops, end } (the Music type below), `as const`
//   bar()        film frame of a music grid position, fractional; b() in timeline.ts rounds it
//   accentNear() the analysed track accent within `tol` frames of f, or null
// Keep this file free of React and CSS imports: Node scripts load it through timeline.ts.

/** One analysed accent of the edited track: its film frame, its strength over the local bed and its band. */
export type MusicAccent = { f: number; db: number; band?: 'low' | 'mid' | 'high' };
/** A span of film frames in the track (a stop, a break, a section). */
export type MusicSpan = { from: number; to: number; label?: string };

export type Music = {
  bpm: number; // the edited track's tempo
  beatS: number; // one beat in seconds (60 / bpm)
  fps: number; // the film fps every frame below is in; must equal timeline.ts FPS
  t0: number; // film frame of bar 1's downbeat (the music may start before or after frame 0)
  bars: number; // bars in the body (TOTAL - TAIL), counted from t0
  phraseLen?: number; // bars per phrase
  downbeats: readonly number[]; // film frame of every bar's measured downbeat attack, bar 1 first
  accents: readonly MusicAccent[]; // the attacks cuts and hits aim at (the 16th grid is only the fallback)
  phrases?: readonly number[]; // film frames where phrases start
  sections?: readonly MusicSpan[]; // intro, build, drop... as the edit labels them
  entries: readonly number[]; // where the track enters or re-enters after a break or a stop
  breaks?: readonly MusicSpan[];
  stops: readonly MusicSpan[]; // the arrangement's own stops (preferred over gain stop-downs)
  // how and where the music ends: f is the final hit (button, ring), the hit on the bar line after the body (hit)
  // or that bar line where the fade starts (fade); hold is how many frames the picture holds after the bar line
  // after the body so the ending completes (its ring 1.5-2.5 s, the hit's ring, the fade): the tail is at least that
  end: { mode: 'button' | 'ring' | 'hit' | 'fade' | 'stop'; f: number; hold?: number }; // 'stop', no hold: a grid written before the endings
};

export const MUSIC: Music | null = null;

/**
 * Film frame (fractional) of a music grid position: bar is 1-based, beat 0-3, sixteenth 0-3. With
 * MUSIC set it follows the music: inside the measured bars it runs from one downbeat attack to the
 * next (a played track breathes; downbeats[0] is t0), past them it continues at the track's tempo.
 * With MUSIC null it is the plain grid of `grid` (default 60 fps at 100 BPM). timeline.ts calls it
 * only when MUSIC is set, and b() rounds it, so every act start, Sequence and CUE stays a whole frame
 * within 0.5 f of the music.
 */
export const bar = (n: number, beat = 0, sixteenth = 0, grid: { fps: number; bpm: number } = { fps: 60, bpm: 100 }): number => {
  const m = MUSIC as Music | null;
  const pos = (n - 1) * 4 + beat + sixteenth / 4; // beats after bar 1's downbeat
  if (!m) return pos * (60 / grid.bpm) * grid.fps;
  const beatF = m.beatS * m.fps;
  const d = m.downbeats;
  const i = Math.floor(pos / 4); // 0-based bar of this position
  if (i >= 0 && i + 1 < d.length) return d[i] + ((pos - 4 * i) / 4) * (d[i + 1] - d[i]);
  if (d.length && i >= d.length - 1) return d[d.length - 1] + (pos - 4 * (d.length - 1)) * beatF;
  return (d.length ? d[0] : m.t0) + pos * beatF; // before bar 1 (a pickup), or no measured downbeats
};

/** The analysed track accent within `tol` frames of f (the nearest), or null; always null in the stub. */
export const accentNear = (f: number, tol = 1): MusicAccent | null => {
  const m = MUSIC as Music | null;
  if (!m) return null;
  let best: MusicAccent | null = null;
  for (const a of m.accents) if (Math.abs(a.f - f) <= tol && (!best || Math.abs(a.f - f) < Math.abs(best.f - f))) best = a;
  return best;
};
