// Library, kinetic type: letters that drop in among small characters and fall apart again, a tossed word whose letters
// land in a wave, a staggered stack with a bar that slides behind one line, a line that sharpens from blur left to
// right, and a statement typed into a field while the product around it changes.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { accel, at as prog, clamp, ease, mix } from '../motion';
import { fonts } from '../fonts';
import { mixColor, useTextLayout } from '../type';
import { softShadow } from '../world';
import { Icon } from '../icons';
import { hash } from './type-raster';

const absCentre = (x: number, y: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' });

/** A damped spring from 0 to 1 starting at frame 0 (pure, cheap): `zeta` damping ratio, `w` angular speed per frame. */
const spr = (t: number, zeta = 0.42, w = 0.42) => {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
};

// ---------------------------------------------------------------------------------------------------------------------
export type Actor = { node?: React.ReactNode; color?: string; shape?: 'round' | 'square' | 'pill'; size?: number };

/** A small character: a soft body with two eyes that blink and look toward the word's centre. */
const DefaultActor: React.FC<{ color: string; shape: 'round' | 'square' | 'pill'; size: number; blink: boolean; look: number }> = ({ color, shape, size, blink, look }) => {
  const w = shape === 'pill' ? size * 1.3 : size;
  const r = shape === 'round' ? '50%' : shape === 'pill' ? size / 2 : size * 0.3;
  const eyeW = size * 0.11;
  const eyeH = blink ? eyeW * 0.25 : eyeW * 1.55;
  return (
    <div style={{ width: w, height: size, borderRadius: r, background: color, position: 'relative', boxShadow: `inset ${-size * 0.06}px ${-size * 0.1}px 0 rgba(0,0,0,0.13), inset ${size * 0.05}px ${size * 0.06}px 0 rgba(255,255,255,0.18)` }}>
      {[-1, 1].map((s) => (
        <div key={s} style={{ position: 'absolute', left: w / 2 + s * size * 0.14 - eyeW / 2 + look * size * 0.05, top: size * 0.4 - eyeH / 2 + eyeW * 0.75, width: eyeW, height: eyeH, borderRadius: eyeW, background: '#FFFFFF' }} />
      ))}
    </div>
  );
};

/**
 * DropWord: a heavy lowercase word whose letters fall in one at a time from different sides (spinning, blurred by
 * their speed), land with a squash and a bounce and settle a little crooked, while small characters pop in on and
 * around them and stay alive (bob, blink). From `leaveAt` the letters fall apart: each tips and flies off the frame
 * in its own direction, accelerating, while the characters stay. `leave="push"`: the first character runs along the
 * baseline and knocks the letters away instead.
 */
export const DropWord: React.FC<{
  text: string;
  at?: number;
  /** Frames between letters, on average (default 6). */
  gap?: number;
  size?: number;
  color?: string;
  /** The characters among the letters (default three). Give `node` to use your own. */
  actors?: Actor[];
  leaveAt?: number;
  leave?: 'scatter' | 'push';
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  seed?: number;
}> = ({ text, at = 0, gap = 6, size = 440, color = '#0E0E0E', actors, leaveAt, leave = 'scatter', x, y, font = fonts.inter, weight = 800, seed = 4 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.045em', lineHeight: 1.04 } as const;
  const L = useTextLayout(text, style);
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const cast: Actor[] = actors ?? [
    { color: '#2F7CF6', shape: 'round', size: size * 0.36 },
    { color: '#F2459A', shape: 'pill', size: size * 0.3 },
    { color: '#FF8A3D', shape: 'square', size: size * 0.27 },
  ];
  if (!L.ready || frame < at) return null;
  const chars = Array.from(text);
  let acc = at;
  const starts = chars.map((ch, i) => {
    const s = acc;
    acc += ch === ' ' ? 0 : gap * (0.7 + hash(i, seed) * 0.6);
    return Math.round(s);
  });
  const ox = cx - L.width / 2;
  const oy = cy - L.height / 2;
  const landed = Math.max(...starts) + 14;
  // push: the first character's run along the baseline
  const knockDur = 18;
  const knockX = (f: number) => mix(accel(f, leaveAt ?? 1e9, knockDur, 1.12), ox - size * 0.8, ox + L.width + size * 1.4);
  const knockAt = (lx: number) => {
    if (leaveAt === undefined || leave !== 'push') return Infinity;
    for (let f = leaveAt; f <= leaveAt + knockDur; f++) if (knockX(f) >= lx - size * 0.25) return f;
    return leaveAt + knockDur;
  };
  const fall = 6; // frames of the fall
  const letterPose = (i: number, f: number) => {
    // where it comes from: mostly above, one in three from below or the side
    const kind = hash(i, seed + 1);
    const fromX = kind < 0.66 ? (hash(i, seed + 2) - 0.5) * size * 0.9 : (kind < 0.83 ? 1 : -1) * size * (1.1 + hash(i, seed + 2) * 0.5);
    const fromY = kind < 0.66 ? -size * (1.5 + hash(i, seed + 3) * 0.6) : size * (0.9 + hash(i, seed + 3) * 0.5);
    const rot0 = (hash(i, seed + 4) > 0.5 ? 1 : -1) * (30 + hash(i, seed + 5) * 35);
    const rest = (hash(i, seed + 6) - 0.5) * 9; // settles a little crooked
    const t = f - starts[i];
    let X = 0;
    let Y = 0;
    let R = rest;
    let sx = 1;
    let sy = 1;
    if (t < fall) {
      const p = clamp(t / fall);
      const g = p * p; // gravity: slow first, fastest at the landing
      X = mix(1 - Math.pow(1 - p, 2), fromX, 0);
      Y = mix(g, fromY, 0);
      R = mix(p, rot0, rest);
    } else {
      const u = t - fall;
      // the landing: a squash, one bounce, an overshoot of the angle
      const sq = Math.exp(-u / 3) * Math.cos(u * 0.9);
      sy = 1 - 0.16 * sq;
      sx = 1 + 0.1 * sq;
      Y = -Math.abs(Math.sin(u * 0.45)) * size * 0.07 * Math.exp(-u / 5);
      R = rest + (rot0 > 0 ? -1 : 1) * 10 * Math.exp(-u / 4) * Math.cos(u * 0.6);
    }
    // leaving
    if (leaveAt !== undefined && leave === 'scatter' && f > leaveAt) {
      const g0 = L.chars[i];
      const side = g0.cx - L.width / 2 >= 0 ? 1 : -1;
      const d0 = leaveAt + Math.round(hash(i, seed + 7) * 4);
      const q = accel(f, d0, 16, 1.22);
      const up = hash(i, seed + 8) < 0.4 ? -1 : 1;
      X += side * q * width * (0.5 + hash(i, seed + 9) * 0.5);
      Y += up * q * height * (0.7 + hash(i, seed + 10) * 0.4);
      R += side * q * (60 + hash(i, seed + 11) * 70);
    }
    const k = knockAt(ox + L.chars[i].cx);
    if (f > k) {
      const dt = f - k;
      const up = hash(i, seed + 6) > 0.4 ? -1 : 1;
      X += size * (0.06 + hash(i, seed + 7) * 0.1) * dt;
      Y += up * size * (0.05 + hash(i, seed + 8) * 0.07) * dt + 0.5 * size * 0.012 * dt * dt;
      R += (hash(i, seed + 9) > 0.5 ? 1 : -1) * dt * (6 + hash(i, seed + 10) * 8);
    }
    return { X, Y, R, sx, sy };
  };
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {chars.map((ch, i) => {
        if (!ch.trim() || frame < starts[i]) return null;
        const g = L.chars[i];
        const a = letterPose(i, frame);
        const b = letterPose(i, frame - 1);
        const speed = Math.hypot(a.X - b.X, a.Y - b.Y);
        return (
          <span
            key={i}
            style={{
              ...style,
              position: 'absolute',
              left: ox + g.x,
              top: oy + g.y,
              color,
              whiteSpace: 'pre',
              transformOrigin: '50% 85%',
              transform: `translate(${a.X}px, ${a.Y}px) rotate(${a.R}deg) scale(${a.sx}, ${a.sy})`,
              filter: speed > 8 ? `blur(${Math.min(10, speed * 0.05)}px)` : undefined,
              zIndex: 2,
            }}
          >
            {ch}
          </span>
        );
      })}
      {cast.map((c, j) => {
        // each character belongs to a letter: it pops in as that letter lands, then sits on it (even) or in front of
        // its foot (odd), bobbing
        const letters = chars.map((ch, i) => (ch.trim() ? i : -1)).filter((i) => i >= 0);
        // seats: on the shoulder of an early letter (in front), at the foot between two letters (in front), peeking
        // over the last letter (behind)
        const seat = j % 3;
        const share = seat === 0 ? 0.15 : seat === 1 ? 0.5 : 1;
        const li = letters[Math.min(letters.length - 1, Math.round(share * (letters.length - 1)))];
        const s0 = starts[li] + fall + 1 + j;
        if (frame < s0) return null;
        const t = frame - s0;
        const pop = spr(t, 0.38, 0.6);
        const sz = c.size ?? size * 0.25;
        const g = L.chars[li];
        const onTop = seat !== 2;
        const pose = letterPose(li, Math.min(frame, leaveAt ?? frame));
        const ink = g.ink;
        let X = ox + (seat === 0 ? ink.x + ink.width * 0.85 : seat === 1 ? ink.x + ink.width + size * 0.02 : ink.x + ink.width * 0.8) + pose.X * 0.15;
        let Y = oy + (seat === 0 ? ink.y + sz * 0.15 : seat === 1 ? g.baseline - sz * 0.38 : ink.y - sz * 0.18) + Math.sin(t / 7 + j) * 5;
        let rot = Math.sin(t * 0.13 + j) * 6;
        if (j === 0 && leave === 'push' && leaveAt !== undefined && frame >= leaveAt) {
          X = knockX(frame);
          Y = oy + g.baseline - sz * 0.5 - Math.abs(Math.sin((frame - leaveAt) * 0.6)) * size * 0.16;
          rot = (frame - leaveAt) * 14;
        }
        return (
          <div key={j} style={{ position: 'absolute', left: X, top: Y, transform: `translate(-50%, -50%) scale(${pop}) rotate(${rot}deg)`, zIndex: onTop ? 3 : 1 }}>
            {c.node ?? <DefaultActor color={c.color ?? '#2F7CF6'} shape={c.shape ?? 'round'} size={sz} blink={(t + j * 11) % 53 < 3} look={frame > landed ? Math.sign(cx - X) : 0} />}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * ArcToss: a word tossed in. Its letters arrive in a quick wave from left to right, each dropping from above on a
 * curve, turned and smaller, blurred by its speed, and landing with a small overshoot, so for a few frames the word
 * reads as a ribbon unrolling into place; then it holds and eases back a touch. A title over a product shot.
 */
export const ArcToss: React.FC<{
  text: string;
  at?: number;
  /** Frames between letters (default 1.2). */
  lag?: number;
  /** Frames each letter's flight takes (default 9). */
  dur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  leaveAt?: number;
}> = ({ text, at = 0, lag = 1.2, dur = 9, size = 220, color = '#F2F2F0', x, y, font = fonts.inter, weight = 600, leaveAt }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.025em', lineHeight: 1.1 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const chars = Array.from(text);
  const lastLand = at + (chars.length - 1) * lag + dur;
  const settle = 1 - 0.07 * prog(frame, lastLand, 40, ease.soft);
  const out = leaveAt === undefined ? 0 : accel(frame, leaveAt, 10, 1.4);
  const pose = (i: number, f: number) => {
    const t = f - (at + i * lag);
    const p = spr(t, 0.62, 0.62 * (9 / dur));
    const q = clamp(t / dur);
    // a curve: from up and left of its place, over the top, down into place
    const dx = mix(p, -size * 0.55, 0) + Math.sin(q * Math.PI) * size * 0.12;
    const dy = mix(p, -size * 1.0, 0) - Math.sin(q * Math.PI) * size * 0.18;
    return { dx, dy, r: mix(p, 34, 0), s: mix(Math.min(1, p), 0.55, 1), t };
  };
  return (
    <div style={{ position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${settle})`, width: L.width, height: L.height }}>
      {chars.map((ch, i) => {
        if (!ch.trim()) return null;
        const a = pose(i, frame);
        if (a.t < 0) return null;
        const b = pose(i, frame - 1);
        const v = Math.hypot(a.dx - b.dx, a.dy - b.dy);
        const g = L.chars[i];
        const o = out * (1 + i * 0.08);
        return (
          <span
            key={i}
            style={{
              ...style,
              position: 'absolute',
              left: g.x,
              top: g.y,
              color,
              whiteSpace: 'pre',
              transformOrigin: '30% 80%',
              transform: `translate(${a.dx + o * width * 0.9}px, ${a.dy - o * height * 0.3}px) rotate(${a.r - o * 30}deg) scale(${a.s})`,
              filter: v > 6 ? `blur(${Math.min(9, v * 0.09)}px)` : undefined,
              opacity: clamp(a.t / 2 + 0.35),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * BarStack: three big lines stacked tight and staggered to the right. The first slides in from the left, the others
 * from the right, and a solid bar wipes in from the right behind one line and runs on past the left edge, so that line
 * reads reversed out of the bar. Then the lines drift apart in a slow cross-parallax (the top one right, the others
 * left). `leaveAt` carries the whole block up and out of the frame at speed (the next shot arrives from below).
 */
export const BarStack: React.FC<{
  lines: string[];
  /** The line on the bar (default 1, the middle). */
  bar?: number;
  at?: number;
  size?: number;
  color?: string;
  barColor?: string;
  /** The text on the bar. */
  barInk?: string;
  /** Horizontal offset of each line's centre from the block's centre, in em (the stagger). */
  offsets?: number[];
  /** Drift of each line, px per frame at the start (it slows over about a second). */
  drift?: number[];
  /** Frames to settle (default 9). */
  dur?: number;
  leaveAt?: number;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ lines, bar = 1, at = 0, size = 230, color = '#0E0E0E', barColor = '#0E0E0E', barInk = '#FFFFFF', offsets, drift, dur = 9, leaveAt, x, y, font = fonts.inter, weight = 700 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < at) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const n = lines.length;
  const lead = 0.98; // line pitch in em: the lines nearly touch
  const offs = offsets ?? lines.map((_, i) => (i === 0 ? -1.0 : i === bar ? 0.75 : 1.15 + (i - 2) * 0.4));
  const drv = drift ?? lines.map((_, i) => (i === 0 ? 12 : -9 - i * 1.5));
  const t = frame - at;
  const outP = leaveAt === undefined ? 0 : accel(frame, leaveAt, 10, 1.42);
  const out = { x: -outP * width * 0.35, y: -outP * height * 1.25 };
  const lineX = (i: number, f: number) => {
    const fromLeft = i === 0;
    const delay = i === bar ? 0 : fromLeft ? 1 : 3;
    const p = prog(f, at + delay, dur, ease.out);
    const from = (fromLeft ? -1 : 1) * width * 0.75;
    const tt = Math.max(0, f - at - dur);
    const dr = drv[i] * 30 * (1 - Math.exp(-tt / 30));
    return mix(p, from, 0) + dr + offs[i] * size;
  };
  // the bar's left edge: in from the right with its line, then on past the left edge of the frame
  const barLeft = (f: number) => mix(prog(f, at, dur * 1.8, ease.out), width * 0.62, -cx - 60);
  const barH = size * 1.0;
  const blurOut = outP > 0 ? Math.min(14, (accel(frame, leaveAt!, 10, 1.42) - accel(frame - 1, leaveAt!, 10, 1.42)) * 120) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${out.x}px, ${out.y}px)`, filter: blurOut > 0.5 ? `blur(${blurOut}px)` : undefined }}>
        {lines.map((ln, i) => {
          const X = lineX(i, frame);
          const v = Math.abs(X - lineX(i, frame - 1));
          const Y = cy + (i - (n - 1) / 2) * lead * size;
          const onBar = i === bar;
          const bl = barLeft(frame);
          const bv = Math.abs(bl - barLeft(frame - 1));
          return (
            <React.Fragment key={i}>
              {onBar && <div style={{ position: 'absolute', left: cx + bl, top: Y - barH / 2 + size * 0.05, width: width * 2.5, height: barH, background: barColor, filter: bv > 30 ? `blur(${Math.min(8, bv * 0.04)}px)` : undefined }} />}
              <div
                style={{
                  ...absCentre(cx + X, Y),
                  fontFamily: font,
                  fontWeight: weight,
                  fontSize: size,
                  letterSpacing: '-0.035em',
                  lineHeight: 1,
                  color: onBar ? barInk : color,
                  whiteSpace: 'pre',
                  filter: v > 25 ? `blur(${Math.min(12, v * 0.05)}px)` : undefined,
                }}
              >
                {ln}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {t < 0 && null}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
/**
 * BlurSweep: a line that comes into focus from left to right, a soft front a few letters wide in which each letter
 * sharpens from a heavy blur and fades up. Calm, for a message, a quote, a line that should feel spoken.
 */
export const BlurSweep: React.FC<{
  text: string;
  at?: number;
  /** Letters per frame the front travels (default 0.8). */
  speed?: number;
  /** Width of the soft front in letters (default 7). */
  soft?: number;
  blur?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ text, at = 0, speed = 0.8, soft = 7, blur = 14, size = 96, color = '#141414', x, y, font = fonts.inter, weight = 500, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const front = (frame - at) * speed;
  return (
    <div style={{ ...absCentre(x ?? width / 2, y ?? height / 2), fontFamily: font, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.015em', whiteSpace: 'pre', lineHeight: 1.1, ...style }}>
      {Array.from(text).map((ch, i) => {
        const p = ease.out(clamp((front - i) / soft));
        return (
          <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: clamp(p * 1.4), filter: p < 0.99 ? `blur(${(1 - p) * blur}px)` : undefined, transform: `translateX(${(1 - p) * 0.08}em)` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
export type Host = {
  /** The flat ground behind the product. */
  ground: string;
  /** The field's fill, its text colour, its muted colour (placeholder, chips), its outline. */
  card: string;
  ink: string;
  muted: string;
  line?: string;
  /** The send button when the field has text. */
  accent: string;
  accentInk?: string;
  /** The product's name at the top left, and its glyph (a Lucide icon name). */
  app: string;
  glyph?: string;
  /** The heading above the field. */
  title?: string;
  titleInk?: string;
  /** Small text under the heading. */
  sub?: string;
  radius?: number;
  /** Suggestion chips under the field. */
  chips?: string[];
  /** The model or mode pill in the field. */
  mode?: string;
  /** How far the host is pushed in (1 = none). */
  zoom?: number;
  /** A sidebar of recent projects down the left edge. */
  side?: string[];
};

const HOSTS: Host[] = [
  { ground: '#141416', card: '#1F1F22', ink: '#EDEDED', muted: '#8A8A90', line: '#2C2C30', accent: '#F2F2F2', accentInk: '#111', app: 'Pebbleworks', glyph: 'Hexagon', title: 'What should we build today?', titleInk: '#F0F0F0', radius: 26, mode: 'Fast', chips: ['Landing page', 'Habit tracker', 'Invoice tool'], zoom: 1.0 },
  { ground: '#F6F5F2', card: '#FFFFFF', ink: '#1A1A1A', muted: '#9A9A9E', line: '#E4E2DD', accent: '#FF6A3D', app: 'Sprigly', glyph: 'Sprout', title: 'Turn an idea into an app', titleInk: '#1C1C1C', sub: 'Describe it, we build it, you ship it', radius: 18, mode: 'Pro', zoom: 1.38, side: ['New project', 'Recipe box', 'Gym log', 'Portfolio'] },
  { ground: '#FF6A3D', card: '#1D1B1B', ink: '#F4F4F4', muted: '#8C8580', line: '#2E2A28', accent: '#FFFFFF', accentInk: '#1D1B1B', app: 'Kilnly', glyph: 'Flame', title: 'Build the thing you keep imagining', titleInk: '#FFFFFF', radius: 30, chips: ['Web app', 'Mobile', 'Game'], zoom: 1.14 },
  { ground: '#DCEBFA', card: '#FFFFFF', ink: '#14202C', muted: '#93A0AD', line: '#C9DAEA', accent: '#1F6FEB', app: 'Harborline', glyph: 'Anchor', title: 'Describe your idea', titleInk: '#14202C', sub: 'Apps, sites and tools from one sentence', radius: 14, mode: 'Agent', zoom: 1.52 },
  { ground: '#0D1117', card: '#161B22', ink: '#E6EDF3', muted: '#6E7781', line: '#262C36', accent: '#E6EDF3', accentInk: '#0D1117', app: 'Tidewell', glyph: 'Terminal', title: 'Ask anything, ship anything', titleInk: '#E6EDF3', radius: 12, mode: 'Build', chips: ['Dashboard', 'Chat bot', 'Store'], zoom: 1.24, side: ['Workspace', 'Billing app', 'Team wiki', 'Store front', 'Settings'] },
  { ground: '#F1E9DD', card: '#FBF8F3', ink: '#2A2622', muted: '#A39A8E', line: '#E2D7C7', accent: '#2A2622', accentInk: '#FBF8F3', app: 'Quillby', glyph: 'Feather', title: 'Start with one line', titleInk: '#2A2622', radius: 22, mode: 'Draft', zoom: 1.42 },
];

/** Steady typing times: one character every 1/cps frames with a small seeded unevenness, a beat longer after a space. */
const steadyTimes = (text: string, start: number, cps: number, seed: number) => {
  const out: number[] = [];
  let t = start;
  Array.from(text).forEach((ch, i) => {
    out.push(Math.floor(t));
    t += (1 / cps) * (0.8 + hash(i, seed) * 0.4) * (ch === ' ' ? 1.5 : 1);
  });
  return out;
};

/**
 * HostType: one statement typed into a product's prompt field at a steady, believable pace (never a burst), while the
 * product around it changes by hard cut every few frames (a dark app, a light one, a warm one, a code tool): the field
 * stays at the same spot on screen and the text carries on across every cut, so one sentence reads as said
 * everywhere. Each host is a whole product page (name, heading, field with its mode and send button, chips), on a flat
 * ground. Bring your own `hosts` for the products in your film.
 */
export const HostType: React.FC<{
  text: string;
  at?: number;
  /** Characters per frame (default 0.62, about 19 a second). */
  cps?: number;
  /** Frames per host, on average (default 5, seeded between 4 and 6). */
  every?: number;
  hosts?: Host[];
  /** The field's width and its text size. */
  w?: number;
  size?: number;
  x?: number;
  y?: number;
  font?: string;
  seed?: number;
}> = ({ text, at = 0, cps = 0.62, every = 5, hosts = HOSTS, w = 1240, size = 54, x, y, font = fonts.inter, seed = 2 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame < at) return null;
  const t = frame - at;
  let k = 0;
  let edge = 0;
  while (true) {
    const len = Math.max(3, Math.round(every * (0.8 + hash(k, seed) * 0.4)));
    if (edge + len > t) break;
    edge += len;
    k++;
  }
  const H = hosts[k % hosts.length];
  const local = t - edge;
  const times = steadyTimes(text, at + 3, cps, seed);
  const shown = times.filter((tt) => frame >= tt).length;
  const typed = text.slice(0, shown);
  const done = shown >= text.length;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2 + 40;
  const fieldH = size * 3.6;
  const z = (H.zoom ?? 1) * (1 + local * 0.004);
  const ax = cx - w / 2 + size * 0.8;
  const ay = cy - fieldH / 2 + size * 1.15;
  const chip = (label: React.ReactNode, key: React.Key, icon?: string, onGround = false) => (
    <div key={key} style={{ height: size * 0.82, padding: `0 ${size * 0.4}px`, borderRadius: size, border: `1.5px solid ${onGround ? mixColor(H.ground, H.titleInk ?? H.ink, 0.3) : H.line ?? H.muted}`, background: onGround ? mixColor(H.ground, H.titleInk ?? H.ink, 0.06) : undefined, display: 'flex', alignItems: 'center', gap: size * 0.18, color: onGround ? H.titleInk ?? H.ink : H.muted, fontFamily: font, fontWeight: 500, fontSize: size * 0.4, whiteSpace: 'pre' }}>
      {icon && <Icon name={icon} size={size * 0.42} color={H.muted} />}
      {label}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: H.ground }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${ax}px ${ay}px`, transform: `scale(${z})` }}>
        {H.side && (
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 330, background: H.card, borderRight: `1.5px solid ${H.line ?? H.muted}`, paddingTop: 140, boxSizing: 'border-box' }}>
            {H.side.map((s, i) => (
              <div key={i} style={{ margin: '0 22px 8px', padding: '14px 18px', borderRadius: 12, background: i === 0 ? H.ground : 'transparent', fontFamily: font, fontWeight: i === 0 ? 600 : 450, fontSize: 26, color: i === 0 ? H.ink : H.muted, display: 'flex', alignItems: 'center', gap: 14 }}>
                <Icon name={i === 0 ? 'Plus' : 'Folder'} size={24} color={i === 0 ? H.ink : H.muted} />
                {s}
              </div>
            ))}
          </div>
        )}
        {/* the product's own chrome */}
        <div style={{ position: 'absolute', left: 64, top: 48, display: 'flex', alignItems: 'center', gap: 14, fontFamily: font, fontWeight: 600, fontSize: 30, color: H.titleInk ?? H.ink }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: H.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={H.glyph ?? 'Sparkles'} size={26} color={H.accentInk ?? '#FFFFFF'} />
          </div>
          {H.app}
        </div>
        <div style={{ position: 'absolute', right: 64, top: 52, display: 'flex', alignItems: 'center', gap: 18, fontFamily: font, fontWeight: 500, fontSize: 26, color: H.muted }}>
          <span>Docs</span>
          <span>Pricing</span>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: H.line ?? H.muted }} />
        </div>
        {H.title && (
          <div style={{ position: 'absolute', left: cx - w, top: cy - fieldH / 2 - size * (H.sub ? 3.5 : 2.6), width: w * 2, textAlign: 'center', fontFamily: font, fontWeight: 600, fontSize: size * 1.5, letterSpacing: '-0.025em', color: H.titleInk ?? H.ink }}>{H.title}</div>
        )}
        {H.sub && <div style={{ position: 'absolute', left: cx - w, top: cy - fieldH / 2 - size * 1.45, width: w * 2, textAlign: 'center', fontFamily: font, fontWeight: 450, fontSize: size * 0.6, color: H.muted }}>{H.sub}</div>}
        <div style={{ position: 'absolute', left: cx - w / 2, top: cy - fieldH / 2, width: w, height: fieldH, borderRadius: H.radius ?? 18, background: H.card, border: `1.5px solid ${H.line ?? 'transparent'}`, boxShadow: softShadow(3, H.ground), boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', left: size * 0.6, bottom: size * 0.5, display: 'flex', gap: size * 0.25 }}>
            {chip('', 'a', 'Plus')}
            {chip('Attach', 'b', 'Paperclip')}
            {H.mode && chip(H.mode, 'c', 'Zap')}
          </div>
          <div style={{ position: 'absolute', right: size * 0.5, bottom: size * 0.42, width: size * 1.0, height: size * 1.0, borderRadius: '50%', background: typed.length ? H.accent : H.line ?? H.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="ArrowUp" size={size * 0.56} color={typed.length ? H.accentInk ?? '#FFFFFF' : H.muted} />
          </div>
        </div>
        {H.chips && (
          <div style={{ position: 'absolute', left: cx - w / 2, top: cy + fieldH / 2 + size * 0.6, width: w, display: 'flex', justifyContent: 'center', gap: size * 0.3 }}>
            {H.chips.map((c, i) => chip(c, i, undefined, true))}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', left: ax, top: ay - size * 0.6, fontFamily: font, fontWeight: 450, fontSize: size, color: H.ink, whiteSpace: 'pre', lineHeight: 1.2 }}>
        {typed}
        <span style={{ display: 'inline-block', width: 3, height: size * 1.05, marginLeft: 2, verticalAlign: 'text-bottom', background: H.ink, opacity: done && Math.floor(frame / 8) % 2 ? 0 : 1 }} />
        {typed.length === 0 && <span style={{ color: H.muted }}>Describe what you want</span>}
      </div>
    </div>
  );
};
