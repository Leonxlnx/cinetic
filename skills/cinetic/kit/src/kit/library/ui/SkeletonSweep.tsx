// SkeletonSweep (ui, build): an answer is drafted as tinted skeleton bars that cascade in one row a frame, each
// widening from the left; then a warm band sweeps across left to right, warming the bars ahead of it and turning
// them into the real text behind it.
// Numbers: a row a frame from +0, each bar widening 0.2 to 1 of its text's width in 3 f; the sweep starts `sweepAt`
// (rows + 8 f) and crosses the block in 14 f (ease-in-out); bars within 0.3 of the block's width ahead of the band
// warm towards its colour; the band is 0.06 of the block wide, soft; the text behind it lands in the ink.
// Caution: the bars have the shape of the text that replaces them (measured); a heading, a few lines, a list; never
// grey bars left standing as content.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix } from '../../motion';
import { mixColor, useTextWidth } from '../../type';
import { type Look, surfaceStyle, useUiFrame, withPace } from './_shared';

export type SkeletonLine = { text: string; /** Relative size (1 = body). */ scale?: number; weight?: number; /** Indent in text sizes. */ indent?: number; /** A bullet dot before it. */ bullet?: boolean; /** Space above, in text sizes. */ gap?: number };

const SkeletonSweepInner: React.FC<{
  L: Look;
  lines: SkeletonLine[];
  at: number;
  sweepAt?: number;
  /** The bars' colour and the band's. */
  ghost?: string;
  band?: string;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  /**
   * A card behind the block (true: the look's surface; a string: that colour), padded one text size: it opens with the
   * first bar and grows down with the rows, so it never stands empty. Your own plate instead: start `at` on its first frame.
   */
  plate?: boolean | string;
  speed?: number;
}> = ({ L, lines, at: start, sweepAt, ghost = '#F2A7C3', band = '#F0A24A', x: xIn, y: yIn, w: wIn, size: sizeIn, plate, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = start + (useUiFrame() - start) * speed;
  const s = sizeIn ?? Math.min(W, H) * 0.026;
  const w = wIn ?? s * 30;
  const x0 = (xIn ?? W / 2) - w / 2;
  const widths = lines.map((l) => useTextWidth(l.text, { fontFamily: L.font, fontSize: s * (l.scale ?? 1), fontWeight: l.weight ?? 450, letterSpacing: '-0.006em' }));
  const tops: number[] = [];
  let yy = 0;
  lines.forEach((l) => {
    yy += (l.gap ?? 0.5) * s;
    tops.push(yy);
    yy += s * (l.scale ?? 1) * 1.35;
  });
  const blockH = yy;
  const y0 = (yIn ?? H / 2) - blockH / 2;
  const sw = start + (sweepAt ?? lines.length + 8);
  const bandP = at(frame, sw, 14, ease.inOut);
  const sweeping = frame >= sw;
  const bandX = mix(bandP, -0.08, 1.08) * w;
  // the plate grows down with the cascade: the first row's height on the first frame, the whole block a frame after the last row
  const pad = s;
  const rowsIn = clamp((frame - start + 1) / Math.max(1, lines.length));
  const firstH = tops[0] + s * (lines[0]?.scale ?? 1) * 1.35;
  const plateH = mix(ease.out(rowsIn), firstH, blockH) + pad * 2;
  return (
    <>
    {plate && frame >= start && (
      <div style={{ ...surfaceStyle(L, 3, s * 0.7), ...(typeof plate === 'string' ? { background: plate } : {}), position: 'absolute', left: x0 - pad, top: y0 - pad, width: w + pad * 2, height: plateH }} />
    )}
    <div style={{ position: 'absolute', left: x0, top: y0, width: w, height: blockH, fontFamily: L.font }}>
      {lines.map((l, i) => {
        const t0 = start + i;
        if (frame < t0) return null;
        const g = at(frame, t0, 3, ease.out);
        const fs = s * (l.scale ?? 1);
        const ind = (l.indent ?? 0) * s + (l.bullet ? s * 0.9 : 0);
        const tw = Math.min(widths[i], w - ind);
        const barW = tw * mix(g, 0.2, 1);
        // the part of the line behind the band is text; ahead of it, the bar
        const cut = sweeping ? clamp((bandX - ind) / Math.max(1, tw)) : 0;
        const warm = (px: number) => clamp(1 - (px - bandX) / (w * 0.3)) * (sweeping ? 1 : 0);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: tops[i], width: w, height: fs * 1.35 }}>
            {l.bullet && <div style={{ position: 'absolute', left: (l.indent ?? 0) * s + s * 0.2, top: fs * 0.55, width: s * 0.28, height: s * 0.28, borderRadius: s, background: cut > 0 ? L.ink : mixColor(ghost, band, warm(0)) }} />}
            {/* the bar, ahead of the band */}
            {cut < 1 && (
              <div style={{ position: 'absolute', left: ind + cut * tw, top: fs * 0.32, width: Math.max(0, barW - cut * tw), height: fs * 0.62, borderRadius: fs * 0.16, background: `linear-gradient(90deg, ${mixColor(ghost, band, warm(ind + cut * tw))}, ${mixColor(ghost, band, warm(ind + barW))})`, opacity: mix(g, 0.5, 1) }} />
            )}
            {/* the text, behind it */}
            {cut > 0 && (
              <div style={{ position: 'absolute', left: ind, top: 0, height: fs * 1.35, display: 'flex', alignItems: 'center', fontSize: fs, fontWeight: l.weight ?? 450, color: L.ink, letterSpacing: '-0.006em', whiteSpace: 'nowrap', clipPath: `inset(0 ${(1 - cut) * 100}% 0 0)` }}>{l.text}</div>
            )}
          </div>
        );
      })}
      {/* the band */}
      {sweeping && bandP < 1 && <div style={{ position: 'absolute', left: bandX - w * 0.03, top: -s * 0.4, width: w * 0.06, height: blockH + s * 0.8, background: `linear-gradient(90deg, transparent, ${band}, transparent)`, opacity: 0.55, filter: `blur(${s * 0.35}px)` }} />}
    </div>
    </>
  );
};

export const SkeletonSweep = withPace(SkeletonSweepInner);
