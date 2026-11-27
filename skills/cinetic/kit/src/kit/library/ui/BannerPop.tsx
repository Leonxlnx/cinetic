// BannerPop (ui, enter): a banner grows out of its icon, a badge pops, title and body arrive by word, a sheen crosses
// it once.
// Numbers: width 0.15, 0.3, 0.62, 0.9, 1 on frames 0-4; badge at +3 f; words every 2 f from +4 f; rise 56 px over 16
// f; sheen 10 f.
// Caution: one line of body; for more, open it (RowExpand).
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { mixColor } from '../../type';
import { bez, InkWords, inkWordsEnd, type Look, MarkSlot, type NoticeData, surfaceStyle, useUiFrame, withPace } from './_shared';

/**
 * A banner that grows out of its icon: a dark pill with only the glyph arrives blurred, widens to the right in 4
 * frames (0.15, 0.3, 0.62, 0.9, 1 of its width) as it sharpens, a badge pops on the glyph, the title then the body
 * type in word by word (fresh words born in the accent), the time fades in, the banner rises 56 px (expo-out) and a
 * sheen crosses it once. Centre at (x, y). `leaveAt`: it leaves whole to `leaveTo` (default right) on an ease-in over
 * 10 f, clear of the frame on its last one; never fading.
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
}> = ({ L, n, at: start, x: xIn, y: yIn, w = 1100, size = 34, badge = '#FF453A', sheenAt = 44, leaveAt, leaveTo = 'right', speed = 1 }) => {
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
  const rise = mix(at(frame, start, 16, ease.out), 56, 0);
  const bp = at(frame, start + 3, 6, bez(0.3, 1.7, 0.5, 1));
  const titleAt = start + 4;
  const bodyAt = inkWordsEnd(n.title, titleAt, 2) - 2;
  const timeP = at(frame, start + 10, 8, ease.out);
  const sh = at(frame, start + sheenAt, 10, ease.inOut);
  // the exit: whole, on an ease-in, the far edge clear of the frame on the last of its 10 frames
  const lv = leaveAt === undefined ? 0 : at(raw, leaveAt, Math.max(2, Math.round(10 / speed)), ease.in);
  if (lv >= 1) return null;
  const left0 = x - w / 2;
  const top0 = y - h / 2 + rise;
  const lx = leaveTo === 'left' ? -(left0 + cw + 40) * lv : leaveTo === 'right' ? (frameW - left0 + 40) * lv : 0;
  const ly = leaveTo === 'up' ? -(top0 + h + 40) * lv : 0;
  return (
    <div style={{ position: 'absolute', left: left0 + lx, top: top0 + ly, width: cw, height: h, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
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
            <InkWords text={n.title} start={titleAt} color={L.ink} born={L.accent} />
          </div>
          {n.time && <div style={{ fontSize: size * 0.9, color: L.faint, opacity: timeP }}>{n.time}</div>}
        </div>
        {n.body && (
          <div style={{ fontSize: size * 0.92, color: L.muted, marginTop: size * 0.16 }}>
            <InkWords text={n.body} start={bodyAt} color={L.muted} born={mixColor(L.accent, L.muted, 0.3)} />
          </div>
        )}
      </div>
    </div>
  );
};

export const BannerPop = withPace(BannerPopInner);
