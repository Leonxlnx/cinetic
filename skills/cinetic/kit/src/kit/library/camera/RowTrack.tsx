// RowTrack (camera, idle, build): the camera tracks sideways along a row of things (slots in a tray, cards, circles, years
// on a timeline) at a constant height, slowing steadily, so each one takes its turn at the centre and the row reads as one
// long object instead of a run of cuts.
// Numbers: 6-8 px a frame at 1080 to start, slowing steadily (an ease-out of power 1.6) over 90-110 f; items 30-40 % of
// the frame wide with gaps of 4-6 %; a horizontal smear of up to 4 px while it is fast, none once it slows.
// Caution: the row must be long and each item worth a look; never let it stop dead (end on a slow crawl) and never reverse.
// Catalogue: ../catalog/camera.ts; props and recipe: references/library-camera.md.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp } from '../../motion';
import { useUid } from '../_shared';

/**
 * RowTrack: `items` laid in a row `itemW` px wide with `gap` px between, centred on the frame's height (or `y`); the
 * camera travels from item `from` to item `to` (fractions allowed) over `dur` frames from `at`, slowing with `power`.
 */
export const RowTrack: React.FC<{
  items: React.ReactNode[];
  at: number;
  dur?: number;
  from?: number;
  to?: number;
  itemW?: number;
  gap?: number;
  y?: number;
  power?: number;
  /** Max horizontal smear in px. */
  smear?: number;
  ground?: string;
  children?: React.ReactNode;
}> = ({ items, at, dur = 100, from = 0, to, itemW, gap, y, power = 1.6, smear = 4, ground, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const id = useUid('rowtrack');
  const iw = itemW ?? W * 0.34;
  const g = gap ?? W * 0.05;
  const step = iw + g;
  const end = to ?? items.length - 1;
  const pos = (f: number) => {
    const t = clamp((f - at) / dur);
    return from + (end - from) * (1 - Math.pow(1 - t, power));
  };
  const p = pos(frame);
  const v = Math.abs(p - pos(frame - 1)) * step;
  const sm = Math.min(smear, Math.max(0, v - 4) * 0.6);
  const offset = W / 2 - (p * step + iw / 2);
  return (
    <AbsoluteFill style={{ background: ground, overflow: 'hidden' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={id} x="-2%" y="0" width="104%" height="100%">
          <feGaussianBlur stdDeviation={`${sm.toFixed(2)} 0`} />
        </filter>
      </svg>
      <div style={{ position: 'absolute', left: offset, top: y ?? H / 2, transform: 'translateY(-50%)', display: 'flex', gap: g, filter: sm > 0.4 ? `url(#${id})` : undefined }}>
        {items.map((it, i) => (
          <div key={i} style={{ width: iw, flex: 'none' }}>
            {it}
          </div>
        ))}
      </div>
      {children}
    </AbsoluteFill>
  );
};
