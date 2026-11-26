// CaretCam (camera, emphasis): a prompt typed in a small bar, then a cut into the bar around the caret so the words type
// at giant size while the camera follows the caret, jumping on at each new word; a snap back to the wide view at the end.
// Numbers: a char every 1-3 f (2 on average); cut in with no tween; the macro text 30 % of the frame height (x-height 16 %); the camera
// holds through a word and catches the caret at each word start in 3 f (65 %, 90 %, 100 %), putting it at 40 % of the
// width; the way out passes one frame at about 2.2x.
// Caution: one prompt a film; the macro needs a short prompt of plain words (25-60 characters), never a whole paragraph.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { rand } from '../../motion';
import { useTextLayout } from '../../type';

/** The frame each character of `text` appears on, from `at`, a character every 1-3 frames (`rate` on average), seeded. */
export const caretTimes = (text: string, at: number, rate = 2, seed = 7) => {
  const out: number[] = [];
  let t = at;
  for (let i = 0; i < text.length; i++) {
    const r = rand(seed * 131 + i * 17);
    const step = Math.max(1, Math.round(rate * (r < 0.3 ? 0.5 : r < 0.8 ? 1 : 1.5)));
    t += step + (text[i - 1] === ' ' ? 1 : 0);
    out.push(t);
  }
  return out;
};

/**
 * CaretCam: the prompt types into a small bar laid over `children` (the scene, full frame); at `inAt` the view cuts into
 * the bar so the same words type huge, and the camera follows the caret; at `outAt` it snaps back through one frame at
 * about 2.2x to the wide view, where the typing finishes. Measured: 78 f for 40 characters, the cut in 20 f after the
 * first character, the macro 58 f.
 */
export const CaretCam: React.FC<{
  text: string;
  /** First frame of the typing (the first character lands a frame or two later). */
  at: number;
  /** Frames per character on average. */
  rate?: number;
  /** The cut into the bar (default 20 f after `at`). */
  inAt?: number;
  /** The snap back to the wide view (default 4 f before the last character). */
  outAt?: number;
  /** Text size in the macro, px (default 30 % of the frame height: an x-height of about 16 %). */
  size?: number;
  /** Text size in the wide bar, px (default 1.6 % of the frame height). */
  wideSize?: number;
  /** Bar width in the wide view, px (default 42 % of the frame width). */
  w?: number;
  /** Bar centre (default the frame's centre). */
  x?: number;
  y?: number;
  /** Where the caret lands across the frame at each word start, 0..1. */
  anchor?: number;
  /** The bar's surface. */
  color?: string;
  /** The type and the caret. */
  ink?: string;
  /** The send button. */
  accent?: string;
  seed?: number;
  children?: React.ReactNode;
}> = ({ text, at, rate = 2, inAt, outAt, size, wideSize, w, x, y, anchor = 0.4, color = 'rgba(255,255,255,0.62)', ink = '#121317', accent = '#121317', seed = 7, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const S = size ?? Math.round(H * 0.3);
  const s = wideSize ?? Math.round(H * 0.016);
  const bw = w ?? Math.round(W * 0.42);
  const bh = Math.round(s * 2.6);
  const cx = x ?? W / 2;
  const cy = y ?? H / 2;
  const times = React.useMemo(() => caretTimes(text, at, rate, seed), [text, at, rate, seed]);
  const shown = times.filter((t) => frame >= t).length;
  const typed = text.slice(0, shown);
  const zin = inAt ?? at + 20;
  const zout = outAt ?? (times[times.length - 1] ?? at) - 4;
  const macro = frame >= zin && frame < zout;
  const passing = frame === zout;
  const style: React.CSSProperties = { fontFamily: fonts.inter, fontSize: S, fontWeight: 450, letterSpacing: '-0.02em', whiteSpace: 'pre' };
  const L = useTextLayout(text, style);
  const caretX = (n: number) => (n <= 0 || !L.chars.length ? 0 : L.chars[Math.min(n, L.chars.length) - 1].x + L.chars[Math.min(n, L.chars.length) - 1].width);

  // the camera holds through a word and catches the caret at each word start (and at the cut in)
  const starts = [zin, ...times.filter((t, i) => t > zin && i > 0 && text[i - 1] === ' ')];
  let k = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]) k = i;
  const tgt = (i: number) => caretX(times.filter((t) => t <= starts[i]).length);
  const steps = [0.65, 0.9, 1];
  const d = frame - starts[k];
  const p = k === 0 ? 1 : d < steps.length ? steps[d] : 1;
  const off = k === 0 ? tgt(0) : tgt(k - 1) + (tgt(k) - tgt(k - 1)) * p;
  const left = W * anchor - off;

  const caret = (h: number, wpx: number) => <span style={{ display: 'inline-block', width: wpx, height: h, background: ink, marginLeft: wpx * 0.6, verticalAlign: 'middle', transform: `translateY(${-h * 0.06}px)` }} />;

  const wide = (
    <AbsoluteFill>
      {children}
      <div style={{ position: 'absolute', left: cx - bw / 2, top: cy - bh / 2, width: bw, height: bh, borderRadius: bh / 2, background: color, backdropFilter: 'blur(14px)', boxShadow: `0 ${s * 0.3}px ${s * 1.6}px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.7)`, display: 'flex', alignItems: 'center', padding: `0 ${bh * 0.5}px`, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, fontFamily: fonts.inter, fontSize: s, fontWeight: 450, color: ink, whiteSpace: 'pre', overflow: 'hidden' }}>
          {typed}
          {caret(s * 1.15, Math.max(1, s * 0.08))}
        </div>
        <div style={{ width: bh * 0.62, height: bh * 0.62, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={bh * 0.34} height={bh * 0.34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );

  if (passing) {
    // the way out: one frame at about 2.2x around the bar, a little soft
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transform: `scale(2.2)`, transformOrigin: `${cx}px ${cy}px`, filter: 'blur(1.5px)' }}>{wide}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (!macro) return wide;

  const top = H * 0.17;
  const bot = H * 0.84;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* the scene seen past the bar's rim, close and out of focus, sliding with the camera */}
      <AbsoluteFill style={{ transform: `translateX(${-off * 0.25}px) scale(3)`, transformOrigin: `${cx}px ${cy}px`, filter: 'blur(12px)' }}>{children}</AbsoluteFill>
      <div style={{ position: 'absolute', left: -W, right: -W, top, height: bot - top, background: color, backdropFilter: 'blur(24px)', borderTop: `${Math.max(2, H * 0.004)}px solid rgba(255,255,255,0.75)`, borderBottom: `${Math.max(2, H * 0.004)}px solid rgba(255,255,255,0.45)` }} />
      <div style={{ position: 'absolute', left, top: (top + bot) / 2 - S * 0.62, height: S * 1.24, display: 'flex', alignItems: 'center', ...style, color: ink }}>
        {typed}
        {caret(S * 1.05, Math.max(2, S * 0.045))}
      </div>
    </AbsoluteFill>
  );
};
