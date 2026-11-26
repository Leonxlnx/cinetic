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
 * sheen crosses it once. Centre at (x, y).
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
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, n, at: start, x: xIn, y: yIn, w = 1100, size = 34, badge = '#FF453A', sheenAt = 44 , speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
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
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2 + rise, width: cw, height: h, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
      <div style={{ ...surfaceStyle(L, 4, h / 2), position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {sh > 0 && sh < 1 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: mix(sh, -260, cw + 60), width: 220, background: `linear-gradient(100deg, transparent, rgba(255,255,255,${L.dark ? 0.1 : 0.5}), transparent)` }} />
        )}
      </div>
      <div style={{ position: 'absolute', left: pad - (1 - clamp(t / 4)) * 10, top: pad }}>
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
