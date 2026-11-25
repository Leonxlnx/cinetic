// Library, type with a treatment: a year that rolls its last digit, letters tracked in outlined boxes with live
// coordinates, a giant word built of tiles, a dot-matrix word typed letter by letter, and a dot letter the camera dives
// through. Every piece reads the frame itself; `at` is its start frame.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { at as prog, clamp, ease, logScale, mix } from '../motion';
import { fonts } from '../fonts';
import { useTextLayout } from '../type';
import { FrameCanvas, hash, useRaster } from './type-raster';

const absCentre = (x: number, y: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' });

/** Seeded, uneven typing times: char i shows from the returned frame (gaps of 1-4 frames, longer after a space). */
const typeTimes = (text: string, start: number, per: number, seed: number) => {
  const out: number[] = [];
  let t = start;
  Array.from(text).forEach((ch, i) => {
    out.push(Math.round(t));
    const jitter = 0.45 + hash(i, seed) * 1.3;
    t += per * jitter * (ch === ' ' ? 1.8 : 1);
  });
  return out;
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * RollType: a line typed in place, character by character at an uneven pace, whose last characters then roll like a
 * counter from `from` to their real value, the neighbouring digits faint above and below ("In 2026": "In 202" types,
 * then the last digit steps 3, 4, 5 a frame each, crisp, with its neighbours faint above and below, and slows onto 6;
 * a low dash appears after it on that last step). Never blurred: a counter that smears reads as a fault.
 */
export const RollType: React.FC<{
  text: string;
  at?: number;
  /** The starting values of the rolling tail, as many characters as roll ("2" rolls the last digit from 2). */
  from?: string;
  /** Frames per typed character, on average (default 1.6). */
  per?: number;
  /** Frames of the roll's last, slowing step (default 5); every step before it takes one frame. */
  rollDur?: number;
  /**
   * Whole digits only (default true): every frame shows whole digits, the last step lands as a cut after a held
   * second-to-last digit, with a 2-frame settle of the landed digit; no frame ever holds a digit clipped mid-roll.
   * false: the earlier roll, whose last step travels through fractions of a digit.
   */
  whole?: boolean;
  size?: number;
  color?: string;
  /** Neighbour digits' strength (0 hides them). */
  ghosts?: number;
  caret?: boolean;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, from = '0', per = 1.6, rollDur = 5, whole = true, size = 160, color = '#141414', ghosts = 0.42, caret = true, x, y, font = fonts.inter, weight = 500, seed = 3 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const chars = Array.from(text);
  const nRoll = Math.min(from.length, chars.length);
  const head = chars.slice(0, chars.length - nRoll);
  const times = typeTimes(head.join(''), at, per, seed);
  const typedEnd = (times[times.length - 1] ?? at) + Math.round(per * 1.4);
  // as measured: no caret while it types; a low dash appears after the rolling digits on their last, slow step and stays
  const span0 = (() => { const a = Number(from[0]); const b = Number(chars[chars.length - nRoll]); return Number.isNaN(a) || Number.isNaN(b) ? 1 : (b - a + 10) % 10 || 10; })();
  const slowAt = typedEnd + Math.max(0, span0 - 1) + 1;
  const caretOn = caret && frame >= slowAt;
  const caretEl = (
    <span style={{ position: 'relative', display: 'inline-block', width: 0 }}>
      <span style={{ position: 'absolute', left: '0.06em', bottom: '0.06em', width: '0.4em', height: '0.07em', background: color }} />
    </span>
  );
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline' }}>
      {head.map((ch, i) => (
        <React.Fragment key={i}>
          <span style={{ visibility: frame >= times[i] ? 'visible' : 'hidden' }}>{ch}</span>
        </React.Fragment>
      ))}
      {chars.slice(chars.length - nRoll).map((ch, k) => {
        const s = typedEnd + k * 2;
        const a = Number(from[k]);
        const b = Number(ch);
        const isDigit = !Number.isNaN(a) && !Number.isNaN(b);
        if (!isDigit) return <span key={`r${k}`} style={{ visibility: frame >= s ? 'visible' : 'hidden' }}>{ch}</span>;
        const span = (b - a + 10) % 10 || 10;
        // fast first, a long slowing over the last digit: the counter finds its value
        // one whole digit per frame at first (crisp steps, never a smear), then the last step slows over four frames
        const steps = Math.max(0, span - 1);
        const t = frame - s;
        const slow = Math.max(2, rollDur);
        // whole: the second-to-last digit holds through the slow step and the last lands as a cut, settling 0.06 em
        // over 2 frames; the old roll travels through fractions on its last step
        const landed = whole && t >= steps + slow - 2;
        const pos = whole
          ? a + (t <= steps ? Math.max(0, t) : landed ? steps + 1 : steps)
          : a + (t <= steps ? Math.max(0, t) : steps + prog(frame, s + steps, slow, ease.out));
        const base = Math.floor(pos);
        const frac = pos - base;
        const settle = landed ? Math.max(0, 1 - (t - (steps + slow - 2)) / 2) * 0.06 : 0;
        return (
          <span key={`r${k}`} style={{ position: 'relative', display: 'inline-block', visibility: frame >= s ? 'visible' : 'hidden' }}>
            <span style={{ visibility: 'hidden' }}>0</span>
            {[-2, -1, 0, 1, 2].map((d) => {
              const yy = d - frac; // rows from the centre (0 = on the line)
              const dist = Math.abs(yy);
              const o = dist < 0.5 ? 1 - dist * (1 - ghosts) * 2 : Math.max(0, ghosts * (1.6 - dist));
              const done = frame >= s + steps + slow;
              if (done && Math.round(yy) !== 0) return null;
              return (
                <span
                  key={d}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `translateY(${yy * 1.08 + settle}em)`,
                    opacity: done ? 1 : o,
                  }}
                >
                  {(((base + d) % 10) + 10) % 10}
                </span>
              );
            })}
          </span>
        );
      })}
      {caretOn && caretEl}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * TrackedType: a word bent on a shallow arc, each letter in a thin outlined box that turns with it, its live screen
 * coordinates printed above the box, a dot at its centre, and dashed arcs with arrowheads looping between the letters:
 * the look of motion tracking laid over type. `glitch` frames slice and shift the letters for one frame each.
 */
export const TrackedType: React.FC<{
  text: string;
  at?: number;
  size?: number;
  color?: string;
  /** The boxes' outline. */
  box?: string;
  /** The centre dots. */
  dot?: string;
  /** The dashed arcs. */
  path?: string;
  /** Bend of the arc in px at the ends (negative, the default: the ends fall away, a crest; positive: a smile). */
  bend?: number;
  /** Frames over which the bend relaxes from 1.3x to `bend` (the word breathing). */
  dur?: number;
  labels?: boolean;
  paths?: number;
  glitch?: number[];
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, size = 260, color = '#FFFFFF', box = '#E0245E', dot = '#FFC24A', path = 'rgba(255,255,255,0.72)', bend = -130, dur = 40, labels = true, paths = 5, glitch = [], x, y, font = fonts.inter, weight = 500, seed = 7 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '0em', lineHeight: 1.04 } as const;
  const L = useTextLayout(text, style);
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const t = frame - at;
  if (t < 0 || !L.ready) return null;
  const b = bend * mix(prog(frame, at, dur, ease.out), 1.3, 1) + Math.sin(t * 0.09) * bend * 0.04;
  const half = L.width / 2;
  // each letter: its centre on the arc, its angle the arc's slope, a little larger toward the ends
  const letters = L.chars
    .map((g, i) => ({ g, i, ch: Array.from(text)[i] }))
    .filter((q) => q.ch.trim())
    .map((q) => {
      const u = (q.g.cx - half) / half; // -1..1
      const lx = cx + (q.g.cx - half) * (1 + 0.06 * u * u);
      const ly = cy + (q.g.cy - L.height / 2) - b * u * u;
      const slope = (-2 * b * u) / half;
      const ang = (Math.atan(slope) * 180) / Math.PI;
      const sc = 1 + 0.1 * u * u;
      return { ...q, lx, ly, ang, sc, u };
    });
  const appear = (i: number) => t >= i; // a box per frame
  const isGlitch = glitch.includes(frame);
  // dashed loops between letter centres
  const pathEls: React.ReactNode[] = [];
  for (let k = 0; k < paths && letters.length > 1; k++) {
    const a = letters[Math.floor(hash(k, seed) * letters.length)];
    let c = letters[Math.floor(hash(k + 9, seed) * letters.length)];
    if (c === a) c = letters[(letters.indexOf(a) + 2) % letters.length];
    const up = hash(k + 3, seed) > 0.5 ? -1 : 1;
    const lift = size * (0.9 + hash(k + 5, seed) * 1.6) * up;
    const p0 = [a.lx, a.ly];
    const p3 = [c.lx, c.ly];
    const p1 = [mix(0.25, p0[0], p3[0]) - size * 0.4, p0[1] + lift];
    const p2 = [mix(0.75, p0[0], p3[0]) + size * 0.4, p3[1] + lift];
    const bez = (s: number) => {
      const m = 1 - s;
      return [m * m * m * p0[0] + 3 * m * m * s * p1[0] + 3 * m * s * s * p2[0] + s * s * s * p3[0], m * m * m * p0[1] + 3 * m * m * s * p1[1] + 3 * m * s * s * p2[1] + s * s * s * p3[1]];
    };
    const draw = clamp((t - 2 - k) / 8);
    if (draw <= 0) continue;
    const d = `M${p0[0]},${p0[1]} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`;
    const s0 = 0.55;
    const [ax, ay] = bez(s0);
    const [bx, by] = bez(s0 + 0.01);
    const ang = Math.atan2(by - ay, bx - ax);
    const ah = size * 0.06;
    pathEls.push(
      <g key={k} opacity={draw}>
        <path d={d} fill="none" stroke={path} strokeWidth={Math.max(1.5, size * 0.009)} strokeDasharray={`${size * 0.035} ${size * 0.03}`} strokeDashoffset={-t * 2.2} />
        <path
          d={`M${ax - Math.cos(ang - 0.5) * ah},${ay - Math.sin(ang - 0.5) * ah} L${ax},${ay} L${ax - Math.cos(ang + 0.5) * ah},${ay - Math.sin(ang + 0.5) * ah}`}
          fill="none"
          stroke={path}
          strokeWidth={Math.max(1.5, size * 0.009)}
        />
      </g>,
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        {pathEls}
      </svg>
      {letters.map((q, n) => {
        if (!appear(n)) return null;
        const ink = q.g.ink;
        const pad = size * 0.05;
        const bw = Math.max(ink.width, size * 0.18) + pad * 2;
        const bh = q.g.height * 0.78;
        const slices = isGlitch ? [0, 1, 2].map((s) => (hash(s + n * 3, frame) - 0.5) * size * 0.16) : null;
        return (
          <div key={q.i} style={{ position: 'absolute', left: q.lx, top: q.ly, transform: `translate(-50%, -50%) rotate(${q.ang}deg) scale(${q.sc})` }}>
            <div style={{ position: 'relative', width: q.g.width, height: q.g.height }}>
              {(slices ?? [0]).map((off, s) => (
                <span
                  key={s}
                  style={{
                    ...style,
                    position: 'absolute',
                    left: off,
                    top: 0,
                    color,
                    whiteSpace: 'pre',
                    clipPath: slices ? `inset(${s * 33}% 0 ${100 - (s + 1) * 34}% 0)` : undefined,
                  }}
                >
                  {q.ch}
                </span>
              ))}
              <div style={{ position: 'absolute', left: ink.cx - (q.g.x) - bw / 2, top: q.g.height * 0.13, width: bw, height: bh, border: `${Math.max(1.5, size * 0.008)}px solid ${box}` }} />
              <div style={{ position: 'absolute', left: ink.cx - q.g.x - size * 0.02, top: q.g.height * 0.52 - size * 0.02, width: size * 0.04, height: size * 0.04, borderRadius: '50%', background: dot }} />
              {labels && (
                <div style={{ position: 'absolute', left: ink.cx - q.g.x - bw / 2 + size * 0.02, top: q.g.height * 0.13 - size * 0.1, fontFamily: fonts.inter, fontWeight: 500, fontSize: Math.max(14, size * 0.065), color, whiteSpace: 'pre', letterSpacing: '0.02em' }}>
                  {`x: ${Math.round(q.lx)}  y: ${Math.round(q.ly)}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * TileWord: a giant word that builds itself out of a lattice. Outlined cells (crosses, rings, slashes) sweep in on a
 * tilted, rippling plane and fill solid into a blocky word with stepped edges; it holds tilted for a few frames, then
 * a hard cut shows it flat and whole, every tile with a dot at its centre, creeping. Fill the frame with it (the turn of
 * an argument), then cut to a small line.
 */
export const TileWord: React.FC<{
  text: string;
  at?: number;
  /** Font size in px (the word's cap height is about 0.72 of it). */
  size?: number;
  /** Tile size in px. */
  cell?: number;
  color?: string;
  /** The dot and the grid line between tiles: the ground's colour, usually. */
  ink?: string;
  /** Frames the assembly takes (default 14). */
  dur?: number;
  /** Frames the built word holds tilted before the cut to flat (default 6). */
  hold?: number;
  /** Frame the tiles dissolve away (6 frames). */
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, size = 600, cell = 24, color = '#EFEFEC', ink = '#0B0B0C', dur = 14, hold = 6, leaveAt, x, y, font = fonts.inter, weight = 700, seed = 11 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = useRaster(text, { font, size, weight, cell, threshold: 0.5 });
  const t = frame - at;
  if (t < 0 || !R.ready) return null;
  // two shots, as measured: the lattice sweeps in tilted and huge and builds the word, holds tilted, then a hard cut
  // to the word flat and whole, which creeps
  const p = prog(frame, at, dur, ease.out);
  const flatAt = at + dur + hold;
  const flat = frame >= flatAt;
  const creep = prog(frame, flatAt, 60, ease.out);
  const q = leaveAt === undefined ? 0 : clamp((frame - leaveAt) / 6);
  const s = cell - 1.5;
  const w = R.w;
  const h = R.h;
  const tiltHold = 1 - prog(frame, at + dur, hold + 1, ease.linear) * 0.12;
  const transform = flat
    ? `scale(${1 + 0.03 * creep})`
    : `rotateX(${mix(p, 58, 24) * tiltHold}deg) rotateY(${mix(p, -38, -16) * tiltHold}deg) rotateZ(${mix(p, 26, 9) * tiltHold}deg) scale(${mix(p, 2.3, 1.32)})`;
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), width: w, height: h, perspective: 1400 }}>
      <div
        style={{
          width: w,
          height: h,
          transformOrigin: '50% 50%',
          transform,
        }}
      >
        <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
          {R.cells.map((c, i) => {
            const r = hash(i, seed);
            // cells arrive over the first frames, left to right with scatter, as outlines first
            const born = at + (c.x / w) * dur * 0.35 + r * dur * 0.3;
            if (frame < born) return null;
            const fillAt = at + dur * 0.35 + (c.x / w) * dur * 0.45 + r * dur * 0.35;
            const filled = frame >= fillAt && !(c.edge && r < 0.07);
            const gone = q > 0 && hash(i, seed + 5) < q;
            if (gone) return null;
            // a warp that ripples through the lattice and dies out as it lands
            const amp = (1 - p) * cell * 2.4;
            const dx = Math.sin(c.row * 0.45 + t * 0.7) * amp;
            const dy = Math.cos(c.col * 0.35 + t * 0.55) * amp;
            const X = c.x - s / 2 + dx;
            const Y = c.y - s / 2 + dy;
            const mark = r < 0.33 ? 'x' : r < 0.55 ? 'o' : '/';
            if (filled && !flat) return <rect key={i} x={X - 0.5} y={Y - 0.5} width={cell + 0.5} height={cell + 0.5} fill={color} />;
            if (filled || flat)
              return (
                <g key={i}>
                  <rect x={X} y={Y} width={s} height={s} fill={color} />
                  <circle cx={X + s / 2} cy={Y + s / 2} r={Math.max(1.2, cell * 0.08)} fill={ink} />
                </g>
              );
            const sw = Math.max(1.2, cell * 0.07);
            return (
              <g key={i} stroke={color} strokeWidth={sw} fill="none">
                <rect x={X + sw / 2} y={Y + sw / 2} width={s - sw} height={s - sw} />
                {mark === 'x' && <path d={`M${X} ${Y}L${X + s} ${Y + s}M${X + s} ${Y}L${X} ${Y + s}`} />}
                {mark === 'o' && <circle cx={X + s / 2} cy={Y + s / 2} r={s * 0.3} />}
                {mark === '/' && <path d={`M${X} ${Y + s}L${X + s} ${Y}`} />}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * DotWord: a word in dot-matrix, typed in letter by letter (each letter's dots pop in over two frames, in a scatter),
 * dots as soft square LEDs. `glitch` frames slice it into bands that slip sideways for one frame each (a screen being
 * re-read; no flash, the ground never changes).
 */
export const DotWord: React.FC<{
  text: string;
  at?: number;
  /** Frames per letter (default 3, uneven). */
  per?: number;
  size?: number;
  cell?: number;
  color?: string;
  /** Frames on which the dot rows slip sideways in bands. */
  glitch?: number[];
  /** 'square' LEDs (default) or 'round' dots. */
  shape?: 'square' | 'round';
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, per = 3, size = 420, cell = 22, color = '#F4F4F1', glitch = [], shape = 'square', x, y, font = fonts.geist, weight = 500, seed = 5 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = useRaster(text, { font, size, weight, cell, threshold: 0.45 });
  const times = typeTimes(text, at, per, seed);
  if (frame < at || !R.ready) return null;
  const inv = glitch.includes(frame);
  const W = R.w + cell * 6;
  const H = R.h + cell * 2;
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), width: W, height: H }}>
      <FrameCanvas
        w={W}
        h={H}
        deps={[frame, R, inv]}
        draw={(ctx) => {
          const d = cell * 0.74;
          R.cells.forEach((c, i) => {
            const t0 = times[c.char] ?? at;
            const r = hash(i, seed);
            if (frame < t0 + (r < 0.5 ? 0 : 1)) return;
            // a glitch frame: bands of rows slip by whole cells, a few dots drop out
            const band = Math.floor(c.row / 3);
            const slip = inv ? Math.round((hash(band, frame + seed) - 0.5) * 5) * cell : 0;
            if (inv && hash(i, frame) < 0.18) return;
            const X = c.x + cell * 3 - d / 2 + slip;
            const Y = c.y + cell - d / 2;
            ctx.fillStyle = color;
            if (shape === 'round') {
              ctx.beginPath();
              ctx.arc(X + d / 2, Y + d / 2, d / 2, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.roundRect(X, Y, d, d, d * 0.22);
              ctx.fill();
              ctx.fillStyle = 'rgba(0,0,0,0.16)';
              ctx.fillRect(X + d * 0.12, Y + d * 0.8, d * 0.76, d * 0.12);
            }
          });
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * DotDive: one letter becomes the way in. A small plain letter holds for a beat, cuts to the same letter in dot-matrix
 * that grows toward the lens, tilts back and turns into a deep field of dots that the camera flies through, the letter's
 * own dots rushing past. Cut to the next shot on its last frame (`at + dur`).
 */
export const DotDive: React.FC<{
  char: string;
  at?: number;
  /** Frames from the plain letter to the end of the dive (default 34). */
  dur?: number;
  size?: number;
  cell?: number;
  color?: string;
  /** The plain letter's colour (a dimmer step of `color`). */
  dim?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ char, at = 0, dur = 34, size = 420, cell = 18, color = '#F2F2EE', dim = '#8D8D89', x, y, font = fonts.geist, weight = 500, seed = 13 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const R = useRaster(char, { font, size, weight, cell, threshold: 0.4 });
  const t = frame - at;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  if (t < 0 || t > dur || !R.ready) return null;
  const k = dur / 34; // the measured beat is 34 frames; everything scales with dur
  const plainEnd = Math.round(3 * k);
  const growEnd = Math.round(10 * k);
  if (t < plainEnd)
    return <div style={{ ...absCentre(cx, cy), fontFamily: font, fontWeight: 400, fontSize: size * 0.36, color: dim, lineHeight: 1 }}>{char}</div>;
  // grow: log-scale from 0.62 to 1.25 with an accelerating curve
  const g = clamp((t - plainEnd) / Math.max(1, growEnd - plainEnd));
  const diving = t >= growEnd;
  const dv = clamp((t - growEnd) / Math.max(1, dur - growEnd));
  // the first frames of the dive flicker between the flat letter and the field
  const flat = diving && t < growEnd + 4 * k && (t - growEnd) % 2 === 1;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <FrameCanvas
        w={width}
        h={height}
        deps={[frame, R]}
        draw={(ctx) => {
          const d = cell * 0.7;
          if (!diving || flat) {
            const sc = diving ? 1.3 : logScale(0.62, 1.25, Math.pow(g, 1.6));
            const tilt = diving ? 1 : 0;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tilt * -0.32);
            ctx.scale(sc, sc * (1 - tilt * 0.25));
            ctx.fillStyle = color;
            R.cells.forEach((c) => {
              ctx.beginPath();
              ctx.roundRect(c.x - R.w / 2 - d / 2, c.y - R.h / 2 - d / 2, d, d, d * 0.2);
              ctx.fill();
            });
            ctx.restore();
            return;
          }
          // the dive: the letter's dots at z = 0, a field of dots on a rolling surface behind; the camera moves in z
          const camZ = mix(Math.pow(dv, 1.7), -900, 1150);
          const f = 900;
          const project = (X: number, Y: number, Z: number) => {
            const dz = Z - camZ;
            if (dz < 30) return null;
            const s = f / dz;
            return { x: cx + X * s, y: cy + Y * s, s };
          };
          const fade = 1 - clamp((dv - 0.82) / 0.18);
          // field
          const n = 2600;
          for (let i = 0; i < n; i++) {
            const X = (hash(i, seed) - 0.5) * width * 4.2;
            const Y = (hash(i, seed + 1) - 0.5) * height * 4.2;
            const Z = 260 + hash(i, seed + 2) * 1400 + Math.sin(X * 0.002 + Y * 0.003) * 160;
            const P = project(X, Y, Z);
            if (!P) continue;
            const sz = Math.max(1.2, d * 0.55 * P.s);
            ctx.globalAlpha = Math.min(1, 0.25 + P.s * 0.6) * fade;
            ctx.fillStyle = color;
            ctx.fillRect(P.x - sz / 2, P.y - sz / 2, sz, sz);
          }
          // the letter, slightly tilted, extruded into three sheets
          for (let layer = 0; layer < 3; layer++)
            R.cells.forEach((c, i) => {
              const X = (c.x - R.w / 2) * 1.25;
              const Y = (c.y - R.h / 2) * 1.25 + X * 0.25;
              const Z = layer * 60 + (hash(i, seed + 4) - 0.5) * 30;
              const P = project(X, Y, Z);
              if (!P) return;
              const sz = d * 1.25 * P.s * (1 - layer * 0.2);
              ctx.globalAlpha = (layer === 0 ? 1 : 0.45) * fade;
              ctx.fillStyle = color;
              ctx.fillRect(P.x - sz / 2, P.y - sz / 2, sz, sz);
            });
          ctx.globalAlpha = 1;
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
const LIGHT_HUES = ['#FFFFFF', '#FFE45C', '#FF5FA2', '#3FD3F2', '#7FB0FF', '#FF8A3D', '#F4F4F4'];
const SCRAMBLE = '&@/\\[]{}<>+%#1?!';

/**
 * LightWord: a wall of round lights in saturated colours, bulging like a screen seen through a lens, twinkling on twos.
 * Over it, on a dark plate, the label scrambles through stray glyphs (held two frames each) and finds its real
 * characters left to right. At `resolveAt` the coloured lights fall away column by column and the label is redrawn in
 * white lights on black: the word now made of the same lights. A year, a number, a short word.
 */
export const LightWord: React.FC<{
  text: string;
  at?: number;
  /** Frame the coloured lights drop and the word becomes lights (default at + 36). */
  resolveAt?: number;
  /** Frames over which the label finds its characters (default 24). */
  decode?: number;
  size?: number;
  /** Pitch of the light grid in px (default 34). */
  pitch?: number;
  hues?: string[];
  /** The ground under the lights and inside the plate. */
  ground?: string;
  /** How strongly the wall bulges toward the lens (0 flat, default 0.22). */
  bulge?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, resolveAt, decode = 24, size = 230, pitch = 34, hues = LIGHT_HUES, ground = '#050505', bulge = 0.22, x, y, font = fonts.inter, weight = 500, seed = 19 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1 } as const;
  const L = useTextLayout(text, style);
  const cell = Math.max(6, Math.round(size / 14));
  const R = useRaster(text, { font, size, weight: Math.max(Number(weight), 640), cell, threshold: 0.38 });
  const t = frame - at;
  if (t < 0 || !L.ready || !R.ready) return null;
  const res = resolveAt ?? at + 36;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const tw = onTwosLocal(frame);
  const chars = Array.from(text);
  // the plate: the label's box with a ragged edge of whole cells
  const plateW = L.width + size * 0.5;
  const plateH = size * 1.3;
  const shown = chars
    .map((ch, i) => {
      if (!ch.trim()) return ch;
      const settle = at + Math.round((i / Math.max(1, chars.length - 1)) * decode * 0.7 + hash(i, seed) * decode * 0.3);
      if (frame >= settle) return ch;
      if (frame < at + i * 2) return ' ';
      return SCRAMBLE[Math.floor(hash(i * 7 + tw, seed) * SCRAMBLE.length)];
    })
    .join('');
  const resolved = frame >= res;
  return (
    <div style={{ position: 'absolute', inset: 0, background: ground }}>
      <FrameCanvas
        w={width}
        h={height}
        deps={[frame, R.ready, resolved]}
        draw={(ctx) => {
          // the camera pulls back from the wall over the first frames: big square pixels become a field of small dots
          const pull = prog(frame, at + 4, 14, ease.inOut);
          const pp = logScale(pitch * 3.2, pitch, pull);
          const hc = Math.ceil(width / 2 / pp) + 1;
          const hr = Math.ceil(height / 2 / pp) + 1;
          const rMax = Math.hypot(width / 2, height / 2);
          for (let jj = -hr; jj < hr; jj++)
            for (let ii = -hc; ii < hc; ii++) {
              const i = ii + 500;
              const j = jj + 500;
              const gx = width / 2 + (ii + 0.5) * pp;
              const gy = height / 2 + (jj + 0.5) * pp;
              // barrel: points near the centre spread out, the rim compresses
              const dx = gx - width / 2;
              const dy = gy - height / 2;
              const rn = Math.hypot(dx, dy) / rMax;
              const k = 1 + bulge * (1 - rn * rn);
              let X = width / 2 + dx * k;
              let Y = height / 2 + dy * k;
              let d = pp * (pp > pitch * 2 ? 0.94 : 0.82) * k * (1 - 0.35 * rn * rn);
              // inside the plate: dark
              const inPlate = Math.abs(X - cx) < plateW / 2 + (hash(i, j + seed) - 0.5) * pp * 1.2 && Math.abs(Y - cy) < plateH / 2 + (hash(j, i + seed) - 0.5) * pp;
              if (inPlate) continue;
              const idx = j * 1009 + i;
              // twinkle: a third of the lights change colour every two frames, a few go dark
              const h0 = hash(idx, seed + Math.floor(tw / 2) * (hash(idx, 3) < 0.33 ? 1 : 0));
              if (h0 < 0.12) continue;
              let alpha = 1;
              if (resolved) {
                // the fall: column by column, gravity, gone in ~10 frames
                const ft = frame - res - Math.floor(hash(i, seed + 9) * 4);
                if (ft > 0) {
                  Y += 0.5 * 16 * ft * ft + ft * 10;
                  X += (hash(idx, 5) - 0.5) * ft * 8;
                  d *= Math.max(0.3, 1 - ft * 0.08);
                  alpha = Math.max(0, 1 - ft / 7);
                }
                if (alpha <= 0 || Y > height + d) continue;
              }
              ctx.globalAlpha = alpha;
              ctx.fillStyle = hues[Math.floor(h0 * 997) % hues.length];
              ctx.beginPath();
              if (pp < pitch * 1.8 && rn < 0.6) ctx.arc(X, Y, d / 2, 0, Math.PI * 2);
              else ctx.roundRect(X - d / 2, Y - d / 2, d, d, d * 0.18);
              ctx.fill();
            }
          ctx.globalAlpha = 1;
          if (resolved) {
            // the word as white lights, the same size and place as the label
            const ox = cx - R.w / 2;
            const oy = cy - R.h / 2;
            ctx.fillStyle = '#F4F4F2';
            R.cells.forEach((c, n) => {
              const pop = frame - res - (hash(n, seed + 2) < 0.5 ? 0 : 1);
              if (pop < 0) return;
              ctx.beginPath();
              ctx.arc(ox + c.x, oy + c.y, cell * 0.42, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }}
      />
      {!resolved && (
        <div style={{ ...absCentre(cx, cy), ...style, color: '#FFFFFF', whiteSpace: 'pre', display: 'flex' }}>
          {Array.from(shown).map((ch, i) => (
            // every glyph sits in its real character's box, so the line never shifts while it scrambles
            <span key={i} style={{ display: 'inline-block', width: L.chars[i]?.width ?? 0, textAlign: 'center', whiteSpace: 'pre' }}>
              {ch}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const onTwosLocal = (f: number) => Math.floor(f / 2) * 2;
