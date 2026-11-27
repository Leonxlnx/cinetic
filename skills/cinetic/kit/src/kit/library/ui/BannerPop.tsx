// BannerPop (ui, enter): a banner grows out of its icon, a badge pops, title and body arrive by word, a sheen crosses
// it once.
// Numbers: width 0.15, 0.3, 0.62, 0.9, 1 on frames 0-4; badge at +3 f; words every 2 f from +4 f; rise 56 px on an
// exponential tail (half-life 4 f); sheen 10 f.
// Words arrive clean (opacity and a 0.3 em rise, no blur, no colour); `born` brings back the colour-born, de-blurring
// words.
// Caution: one line of body; for more, open it (RowExpand).
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { accel, approach, at, clamp, ease, mix, settle } from '../../motion';
import { mixColor } from '../../type';
import { bez, InkWords, inkWordsEnd, type Look, MarkSlot, type NoticeData, surfaceStyle, useUiFrame, withPace } from './_shared';

/**
 * A banner that grows out of its icon: a dark pill with only the glyph arrives blurred, widens to the right in 4
 * frames (0.15, 0.3, 0.62, 0.9, 1 of its width) as it sharpens, a badge pops on the glyph, the title then the body
 * type in word by word (each rises 0.3 em into place on a soft settle, in its own ink: no blur and no colour smear; with
 * `born` fresh words are born in that colour and de-blur, the older look), the time fades in, the banner rises 56 px
 * (an exponential tail, placed by transform) and a sheen crosses it once. Only its width animates as a size, over its
 * first 4 frames (100+ px a frame, under its blur), where whole-pixel steps cannot show. Centre at (x, y). `leaveAt`:
 * it leaves whole to `leaveTo` (default right), accelerating over 14 f (each step 1.3x the last), fully clear of the
 * frame on its last drawn frame; never fading and never removed mid-flight.
 */
const BannerPopInner: React.FC<{
  L: Look;
  n: NoticeData;
  at: number;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  badge?: string;
  sheenAt?: number;
  /** Frame it starts to leave (none: it stays). */
  leaveAt?: number;
  /** Where it leaves to: off the frame's left or right edge (default), or up off its top. */
  leaveTo?: 'left' | 'right' | 'up';
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
  /** A colour fresh words are born in (they de-blur and settle to the ink); none: clean words that rise into place. */
  born?: string;
}> = ({ L, n, at: start, x: xIn, y: yIn, w = 1100, size = 34, badge = '#FF453A', sheenAt = 44, leaveAt, leaveTo = 'right', speed = 1, born }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const raw = useUiFrame();
  const frame = start + (raw - start) * speed;
  const t = frame - start;
  if (t < 0) return null;
  const pad = size * 0.62;
  const g = size * 2.3;
  const h = g + pad * 2;
  const WID = [0.15, 0.3, 0.62, 0.9, 1];
  const wf = t >= WID.length - 1 ? 1 : mix(t - Math.floor(t), WID[Math.floor(t)], WID[Math.min(WID.length - 1, Math.floor(t) + 1)]);
  const cw = Math.max(h, w * wf);
  const blur = mix(clamp(t / 4), 8, 0);
  // it arrives already moving (out of its blur): an exponential tail, half-life 4 f, placed by transform below
  const rise = 56 * (1 - approach(frame, start - 1, 4));
  const bp = at(frame, start + 3, 6, bez(0.3, 1.7, 0.5, 1));
  const titleAt = start + 4;
  const bodyAt = inkWordsEnd(n.title, titleAt, 2) - 2;
  const timeP = at(frame, start + 10, 8, ease.out);
  const sh = at(frame, start + sheenAt, 10, ease.inOut);
  // the exit: each step 1.3x the last over 14 f, so it reads as leaving and the last steps are a fifth of the way, not
  // half; the frame it reaches 1 is drawn (fully out of the frame) and it is removed only after it
  const LV = Math.max(3, Math.round(14 / speed));
  const lv = leaveAt === undefined ? 0 : accel(raw, leaveAt - 1, LV, 1.3);
  if (leaveAt !== undefined && raw > leaveAt - 1 + LV) return null;
  const left0 = x - w / 2;
  const top0 = y - h / 2 + rise;
  const lx = leaveTo === 'left' ? -(left0 + cw + 40) * lv : leaveTo === 'right' ? (frameW - left0 + 40) * lv : 0;
  const ly = leaveTo === 'up' ? -(top0 + h + 40) * lv : 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left0 + lx}px, ${top0 + ly}px)`, width: cw, height: h, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
      <div style={{ ...surfaceStyle(L, 4, h / 2), position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {sh > 0 && sh < 1 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, transform: `translateX(${mix(sh, -260, cw + 60)}px)`, left: 0, width: 220, background: `linear-gradient(100deg, transparent, rgba(255,255,255,${L.dark ? 0.1 : 0.5}), transparent)` }} />
        )}
      </div>
      <div style={{ position: 'absolute', transform: `translate(${pad - (1 - clamp(t / 4)) * 10}px, ${pad}px)`, left: 0, top: 0 }}>
        <MarkSlot mark={n.mark} icon={n.icon} letter={n.letter} colors={n.colors} size={g} />
        <div style={{ position: 'absolute', right: -size * 0.22, top: -size * 0.22, width: size * 0.72, height: size * 0.72, borderRadius: size, background: badge, border: `${size * 0.1}px solid ${L.surface}`, transform: `scale(${bp})` }} />
      </div>
      <div style={{ position: 'absolute', left: pad * 2 + g, right: pad * 1.6, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: L.font, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={{ flex: 1, fontSize: size, fontWeight: 620, letterSpacing: '-0.012em' }}>
            {born ? <InkWords text={n.title} start={titleAt} color={L.ink} born={born} /> : <RiseWords text={n.title} start={titleAt} color={L.ink} frame={frame} />}
          </div>
          {n.time && <div style={{ fontSize: size * 0.9, color: L.faint, opacity: timeP }}>{n.time}</div>}
        </div>
        {n.body && (
          <div style={{ fontSize: size * 0.92, color: L.muted, marginTop: size * 0.16 }}>
            {born ? <InkWords text={n.body} start={bodyAt} color={L.muted} born={mixColor(born, L.muted, 0.3)} /> : <RiseWords text={n.body} start={bodyAt} color={L.muted} frame={frame} />}
          </div>
        )}
      </div>
    </div>
  );
};

/** Words one by one, every 2 f: each fades in over 4 f and rises 0.3 em into place on a settle (no blur, no colour). */
const RiseWords: React.FC<{ text: string; start: number; color: string; frame: number }> = ({ text, start, color, frame }) => {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => {
        const f0 = start + i * 2;
        const o = at(frame, f0, 4, ease.inOut);
        const r = 1 - settle(frame, f0 - 1, 3);
        return (
          <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', color, opacity: frame < f0 ? 0 : o, transform: `translateY(${0.3 * r}em)` }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </>
  );
};

export const BannerPop = withPace(BannerPopInner);
