// GitHubIssueCard (host, build): one GitHub Projects card (state glyph, repo and number, title, labels, assignees)
// that can lift and ride a pointer.
// Numbers: GitHub px drawn at scale 2; `lift` 0-1 raises its shadow for a carried card.
// Caution: thumb is the product's own attachment: only when the story attaches something.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';
import { softShadow } from '../../world';
import { GH, GHAvatar, type GHIssue, GHLabelPill, HOST_FONT, stateGlyph } from './_shared';

/**
 * GitHubIssueCard: one card of a GitHub Projects board as GitHub draws it: the state glyph and "repo #number", the
 * title, the labels, the assignees. `w` in GitHub's pixels (default 316), drawn `scale` times (default 2). `lift` 0..1
 * raises it for a drag (a deeper shadow and 1.03 scale).
 */
export const GitHubIssueCard: React.FC<{ issue: GHIssue; w?: number; scale?: number; lift?: number; ground?: string; style?: React.CSSProperties }> = ({ issue, w = 316, scale = 2, lift = 0, ground = GH.subtle, style }) => {
  const thumbW = issue.thumb ? 76 : 0;
  return (
    <div style={{ width: w * scale, ...style }}>
      <div
        style={{
          width: w,
          transform: `scale(${scale * (1 + lift * 0.03)})`,
          transformOrigin: '0 0',
          background: GH.canvas,
          border: `1px solid ${GH.border}`,
          borderRadius: 6,
          padding: '8px 12px 10px',
          boxSizing: 'border-box',
          fontFamily: HOST_FONT,
          color: GH.fg,
          boxShadow: lift > 0 ? softShadow(1 + lift * 4, ground) : '0 1px 0 rgba(31,35,40,0.04)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: GH.muted, height: 20, paddingRight: thumbW }}>
          {stateGlyph(issue.state ?? 'open', 16)}
          <span style={{ whiteSpace: 'nowrap' }}>
            {issue.repo} #{issue.number}
          </span>
          <div style={{ flex: 1 }} />
          {(issue.assignees ?? []).map((p, i) => (
            <div key={p.login} style={{ marginLeft: i ? -6 : 0 }}>
              <GHAvatar p={p} size={18} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, lineHeight: '20px', marginTop: 4, paddingRight: thumbW, whiteSpace: 'nowrap', overflow: 'hidden' }}>{issue.title}</div>
        {issue.labels && issue.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, paddingRight: thumbW }}>
            {issue.labels.map((l) => (
              <GHLabelPill key={l.name} l={l} />
            ))}
          </div>
        )}
        {issue.thumb && <div style={{ position: 'absolute', right: 10, top: 10, width: 66, height: 50, borderRadius: 4, overflow: 'hidden', boxShadow: `0 0 0 1px ${GH.border}` }}>{issue.thumb}</div>}
      </div>
    </div>
  );
};

/** The height of a card in GitHub's pixels (before `scale`): 20 + 4 + 20 (+ 8 + label rows) + padding and border. */
export const gitHubIssueCardHeight = (issue: GHIssue) => 8 + 20 + 4 + 20 + (issue.labels?.length ? 28 : 0) + 10 + 2;
