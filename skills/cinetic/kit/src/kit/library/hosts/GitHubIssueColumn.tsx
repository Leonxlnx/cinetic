// GitHubIssueColumn (host, build): a GitHub Projects status column: cards rise in, one can be taken out and the cards
// below close the gap.
// Numbers: GitHub px drawn at scale 2; a card rises 8 px over 7 f; the gap closes over 12 f.
// Caution: titles fit one line at the card's width.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix } from '../../motion';
import { ago, GH, GHCounter, type GHIssue, HOST_FONT } from './_shared';
import { GitHubIssueCard, gitHubIssueCardHeight } from './GitHubIssueCard';

/**
 * GitHubIssueColumn: a status column of a GitHub Projects board (its circle, name and count, the cards, "Add item").
 * `times` brings card i in on its frame (a rise of 8 px over 7 f); `gone` takes one card out on a frame (it is being
 * dragged away: render it yourself with GitHubIssueCard) and the cards below close the gap over 12 f, the count
 * following. Sizes in GitHub's pixels, drawn `scale` times.
 */
export const GitHubIssueColumn: React.FC<{
  name: string;
  items: GHIssue[];
  /** The status circle's colour (GitHub's status colours: grey, blue, green, yellow, orange, red, pink, purple). */
  color?: string;
  count?: number;
  times?: number[];
  gone?: { index: number; at: number };
  w?: number;
  h?: number;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ name, items, color = GH.muted, count, times, gone, w = 340, h = 760, scale = 2, style }) => {
  const frame = useCurrentFrame();
  const shown = items.map((_, i) => ago(frame, times?.[i]));
  const isGone = !!gone && frame >= gone.at;
  const close = gone ? at(frame, gone.at + 4, 12, ease.out) : 0;
  const n = (count ?? items.length) - (times ? items.length - shown.filter(Boolean).length : 0) - (isGone ? 1 : 0);
  let y = 0;
  const tops: number[] = [];
  items.forEach((it, i) => {
    tops.push(y);
    // an arriving card opens its own room: the cards below glide down with it
    if (shown[i]) y += (gitHubIssueCardHeight(it) + 8) * (times ? at(frame, times[i], 7, ease.out) : 1);
  });
  const goneH = gone ? gitHubIssueCardHeight(items[gone.index]) + 8 : 0;
  return (
    <div style={{ width: w * scale, height: h * scale, ...style }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', background: GH.subtle, border: `1px solid ${GH.border}`, borderRadius: 6, fontFamily: HOST_FONT, color: GH.fg, boxSizing: 'border-box', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 16px' }}>
          <div style={{ width: 14, height: 14, borderRadius: 14, border: `2px solid ${color}`, boxSizing: 'border-box' }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>{name}</span>
          <GHCounter n={Math.max(0, n)} />
          <div style={{ flex: 1 }} />
          <Icon name="Ellipsis" size={16} color={GH.muted} />
        </div>
        <div style={{ position: 'absolute', left: 8, right: 8, top: 48 }}>
          {items.map((it, i) => {
            if (!shown[i] || (isGone && i === gone!.index)) return null;
            const p = times ? at(frame, times[i], 7, ease.out) : 1;
            const shift = gone && i > gone.index ? close * goneH : 0;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: tops[i] - shift + mix(p, 8, 0), opacity: clamp(p * 2.5) }}>
                <GitHubIssueCard issue={it} w={w - 16 - 2} scale={1} />
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', fontSize: 14, color: GH.muted, background: GH.subtle, borderTop: `1px solid ${GH.border}` }}>
          <Icon name="Plus" size={16} color={GH.muted} />
          Add item
        </div>
      </div>
    </div>
  );
};

/** Where card i of a column sits (its top-left and size in screen px, relative to the column's top-left). */
export const gitHubColumnCardBox = (items: GHIssue[], i: number, w = 340, scale = 2) => {
  let y = 48;
  for (let k = 0; k < i; k++) y += gitHubIssueCardHeight(items[k]) + 8;
  return { x: 8 * scale, y: y * scale, w: (w - 18) * scale, h: gitHubIssueCardHeight(items[i]) * scale };
};
