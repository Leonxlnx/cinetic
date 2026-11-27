// HubPill (ui, build): words append into a hub pill that widens to fit, each word inking in from colour; with each
// word a tool tile pops in round the pill with a coloured dot under it and the same dot lands on the pill's edge; at
// `flyAt` the tiles fly out past the camera.
// Numbers: a word every 12, 14, 9 f; the pill widens to fit it on its frame (3 f ease-out from the frame before); a word's colour walks
// gold, rose, coral, sage, blue, navy to the ink, 2 f a step (12 f); a tile pops 0.6 to 1 in 3 f; tiles 0.11 H,
// radius 22 %; fly-out 12 f ease-in, scale 1 to 1.35, the last 4 f blurred.
// Caution: three to five words, one tile a word (the last word may bring two); tiles are the tools themselves (a
// `mark` each), never letters in boxes.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { useTextWidth } from '../../type';
import { type Look, useUiFrame, withPace } from './_shared';

export type HubTile = {
  /** The tool's real logo (a <Brand>), drawn in the tile. */
  mark?: React.ReactNode;
  /** A Lucide icon when there is no mark. */
  icon?: string;
  /** The tile's connector colour: the dot under it and the dot on the pill. */
  dot: string;
  /** Its place round the pill, as a share of the frame from the centre (x of the width, y of the height). */
  dx: number;
  dy: number;
  /** The word (0-based) it arrives with. */
  word: number;
};

// the walk of a fresh word: gold, rose, coral, slate blue, blue, navy, then the ink (2 f a step); no green on the way
const WALK = ['#E8B65A', '#E06A7A', '#EE8A6A', '#8594B8', '#4C7BD8', '#24305A'];

const HubPillInner: React.FC<{
  L: Look;
  words: string[];
  tiles: HubTile[];
  at: number;
  /** Frames between words (the last value repeats). */
  every?: number[];
  /** The frame (from `at`) the tiles fly out past the camera; omit to keep them. */
  flyAt?: number;
  x?: number;
  y?: number;
  /** The text size in px (the pill is 2.9 times as tall). */
  size?: number;
  /** The colour walk a fresh word takes before the ink. */
  walk?: string[];
  speed?: number;
}> = ({ L, words, tiles, at: start, every = [12, 14, 9], flyAt, x: xIn, y: yIn, size: sizeIn, walk = WALK, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const x = xIn ?? W / 2;
  const y = yIn ?? H / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const size = sizeIn ?? Math.min(W, H) * 0.048;
  const style: React.CSSProperties = { fontFamily: L.font, fontSize: size, fontWeight: 520, letterSpacing: '-0.01em' };
  // the frame each word joins
  const T: number[] = [];
  for (let i = 0; i < words.length; i++) T.push(i === 0 ? start : T[i - 1] + (every[Math.min(i - 1, every.length - 1)] ?? 9));
  // widths of every prefix of the line, measured in the real face
  const widths = words.map((_, i) => useTextWidth(words.slice(0, i + 1).join(' '), style));
  const shown = T.filter((t) => frame >= t).length;
  if (shown === 0) return null;
  // the pill's width steps to its new text on each word's frame (most of it on that frame, settled two later)
  let textW = widths[0];
  for (let i = 1; i < shown; i++) textW = mix(at(frame, T[i] - 1, 3, ease.out), textW, widths[i]);
  const ph = size * 2.9;
  const pad = ph * 0.62;
  const pw = textW + pad * 2;
  const born = springAt(frame, 30, start, springs.pop);
  const fly = flyAt !== undefined ? at(frame, start + flyAt, 12, ease.in) : 0;
  const stroke = Math.max(2, size * 0.075);
  const tileS = Math.min(W, H) * 0.11;
  const dotS = Math.min(W, H) * 0.016;
  return (
    <>
      {/* tiles */}
      {tiles.map((t, i) => {
        const t0 = T[Math.min(t.word, T.length - 1)] + (t.word >= words.length - 1 ? (i % 2) * 2 : 0);
        if (frame < t0) return null;
        const pop = at(frame, t0, 3, ease.snap);
        const tx = x + t.dx * W;
        const ty = y + t.dy * H;
        // a slow outward drift after it lands, then the fly-out: radially, accelerating, growing
        const drift = clamp((frame - t0) / 120) * 0.04;
        const fx = (tx - x) * (1 + drift + fly * 2.2);
        const fy = (ty - y) * (1 + drift + fly * 2.2);
        const sc = mix(pop, 0.6, 1) * mix(fly, 1, 1.35);
        if (fly >= 1) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: tileS, height: tileS, transform: `translate(${x + fx - tileS / 2}px, ${y + fy - tileS / 2}px) scale(${sc})`, opacity: clamp(pop * 1.6), filter: fly > 0.6 ? `blur(${(fly - 0.6) * 14}px)` : undefined }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: tileS * 0.22, background: L.surface, border: `${Math.max(1.5, tileS * 0.017)}px solid ${L.dark ? 'rgba(255,255,255,0.14)' : '#DADADA'}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: L.dark ? '0 6px 18px rgba(0,0,0,0.35)' : '0 1px 1px rgba(17,19,24,0.04), 0 6px 16px rgba(17,19,24,0.05)' }}>
              {t.mark ?? <Icon name={t.icon ?? 'Box'} size={tileS * 0.48} color={t.dot} stroke={2.1} />}
            </div>
            <div style={{ position: 'absolute', left: tileS / 2 - dotS / 2, top: tileS - dotS * 0.35, width: dotS, height: dotS, borderRadius: dotS, background: t.dot, boxShadow: `0 0 0 ${dotS * 0.18}px ${L.ground}` }} />
          </div>
        );
      })}
      {/* the pill */}
      <div style={{ position: 'absolute', left: x - pw / 2, top: y - ph / 2, width: pw, height: ph, transform: `scale(${mix(born, 0.7, 1)})`, opacity: clamp(born * 3) }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: ph * 0.3, background: L.surface, border: `${stroke}px solid ${L.ink}`, boxSizing: 'border-box' }} />
        {/* dots on the pill's edge, facing their tiles */}
        {tiles.map((t, i) => {
          const t0 = T[Math.min(t.word, T.length - 1)] + (t.word >= words.length - 1 ? (i % 2) * 2 : 0) + 1;
          if (frame < t0) return null;
          const ang = Math.atan2(t.dy * H, t.dx * W);
          // the point where the ray towards the tile leaves the pill's box
          const hx = pw / 2;
          const hy = ph / 2;
          const k = Math.min(hx / Math.max(1e-6, Math.abs(Math.cos(ang))), hy / Math.max(1e-6, Math.abs(Math.sin(ang))));
          const ex0 = Math.cos(ang) * k;
          const ex = clamp(ex0, -hx + ph * 0.3, hx - ph * 0.3);
          // a ray that leaves through a rounded end is moved onto the straight top or bottom edge, so the dot sits on the
          // outline and never inside the corner's curve
          const ey = ex !== ex0 ? Math.sign(Math.sin(ang) || 1) * hy : Math.sin(ang) * k;
          const d = dotS * 0.8;
          const q = at(frame, t0, 3, ease.snap);
          return <div key={i} style={{ position: 'absolute', left: pw / 2 + ex - d / 2, top: ph / 2 + ey - d / 2, width: d, height: d, borderRadius: d, background: t.dot, transform: `scale(${q})` }} />;
        })}
        <div style={{ position: 'absolute', left: pad, top: 0, width: pw - pad * 2 + 2, height: ph, display: 'flex', alignItems: 'center', whiteSpace: 'pre', overflow: 'hidden', ...style }}>
          {words.map((w, i) => {
            if (frame < T[i]) return null;
            const k = Math.floor((frame - T[i]) / 2);
            const c = k < walk.length ? walk[k] : L.ink;
            const fresh = at(frame, T[i], 2, ease.out);
            return (
              <span key={i} style={{ color: c, opacity: mix(fresh, 0.4, 1) }}>
                {i ? ' ' : ''}
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};

export const HubPill = withPace(HubPillInner);
