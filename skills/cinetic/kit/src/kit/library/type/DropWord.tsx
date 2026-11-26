// DropWord (type, enter / exit): heavy lowercase letters fall in one by one, squash and bounce, small characters pop
// in around them; they scatter.
// Numbers: a 6 f fall per letter, 6 f apart; squash 0.84 / 1.1 over 3 f, a bounce of 7 % of the size; the scatter
// accelerates over 16 f.
// Caution: the characters are the product's (pass your own node); never invent a mascot for a brand that has none.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { accel, clamp, mix } from '../../motion';
import { useTextLayout } from '../../type';
import { hash, spr } from './_shared';

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
