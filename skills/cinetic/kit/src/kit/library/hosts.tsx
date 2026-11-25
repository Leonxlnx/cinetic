// Motion library: hosts. Faithful rebuilds of the third-party screens films show most (a GitHub pull request, a GitHub
// Projects column of issues, a VS Code window with code) and a design-canvas app chrome for the product's own canvas.
// The host's chrome stays as the real product draws it (its layout, colours, icons and wording, measured from the real
// screens in November 2026); the props carry the film's content: the repo, the title, the files, the code, the checks.
// Each screen is laid out in the real product's own pixels and drawn `scale` times larger, so its proportions stay
// true. Every piece is deterministic from the frame. See references/library-hosts.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { at, clamp, ease, mix } from '../motion';
import { mixColor } from '../type';
import { softShadow } from '../world';
import { Brand, Icon } from '../icons';
import { fonts } from '../fonts';

/**
 * The face the hosts draw their UI in. GitHub and VS Code use the system's UI face (Segoe UI, San Francisco); Inter is
 * the bundled stand-in with the same proportions, so a render looks the same on every machine.
 */
export const HOST_FONT = fonts.inter;
/** Code and branch names: the hosts use the system mono (Consolas, SF Mono); Geist Mono stands in. */
export const HOST_MONO = fonts.mono;

const ago = (frame: number, t: number | undefined) => t === undefined || frame >= t;

// =====================================================================================================================
// GitHub (Primer, light mode)
// =====================================================================================================================

/** GitHub's own colours (Primer light): the chrome keeps them whatever the film's palette is. */
export const GH = {
  fg: '#1F2328',
  muted: '#59636E',
  border: '#D1D9E0',
  subtle: '#F6F8FA',
  canvas: '#FFFFFF',
  link: '#0969DA',
  refBg: '#DDF4FF',
  open: '#1A7F37',
  openBtn: '#1F883D',
  done: '#8250DF',
  pending: '#BF8700',
  danger: '#D1242F',
  counter: 'rgba(129,139,152,0.18)',
  tabLine: '#FD8C73',
};

/** A label as GitHub draws it from its colour: a pale fill, a deeper hairline, dark text. */
export type GHLabel = { name: string; color: string };
const GHLabelPill: React.FC<{ l: GHLabel }> = ({ l }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 7px',
      borderRadius: 20,
      background: mixColor(l.color, '#FFFFFF', 0.8),
      border: `1px solid ${mixColor(l.color, '#FFFFFF', 0.45)}`,
      color: mixColor(l.color, '#000000', 0.45),
      fontSize: 12,
      fontWeight: 600,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
    }}
  >
    {l.name}
  </span>
);

const GHCounter: React.FC<{ n: number | string }> = ({ n }) => (
  <span style={{ display: 'inline-block', minWidth: 20, padding: '0 6px', height: 18, lineHeight: '18px', borderRadius: 20, background: GH.counter, color: GH.fg, fontSize: 12, fontWeight: 500, textAlign: 'center', boxSizing: 'border-box' }}>{n}</span>
);

/** A round avatar: the person's picture (`src` node) or their initials on a colour. */
export type GHPerson = { login: string; color?: string; avatar?: React.ReactNode };
const GHAvatar: React.FC<{ p: GHPerson; size: number; square?: boolean }> = ({ p, size, square }) => (
  <div style={{ width: size, height: size, borderRadius: square ? size * 0.2 : size, overflow: 'hidden', flexShrink: 0, background: p.color ?? '#8C959F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 600, boxShadow: `0 0 0 1px rgba(31,35,40,0.15)` }}>
    {p.avatar ?? p.login.slice(0, 1).toUpperCase()}
  </div>
);

/** The state glyph of an issue or pull request, in GitHub's colours. */
export type GHState = 'open' | 'closed' | 'pr' | 'draft' | 'merged';
const stateGlyph = (s: GHState, size = 16) => {
  const map: Record<GHState, [string, string]> = { open: ['CircleDot', GH.open], closed: ['CircleCheck', GH.done], pr: ['GitPullRequest', GH.open], draft: ['GitPullRequestDraft', GH.muted], merged: ['GitMerge', GH.done] };
  const [n, c] = map[s];
  return <Icon name={n} size={size} color={c} stroke={2.2} />;
};

// --------------------------------------------------------------------------------------------------------------------
export type GHIssue = {
  repo: string;
  number: number;
  title: string;
  labels?: GHLabel[];
  state?: GHState;
  assignees?: GHPerson[];
  /** The product's own content attached to the card (a thumbnail of a sketch, a preview). Not part of GitHub's card. */
  thumb?: React.ReactNode;
};

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

// --------------------------------------------------------------------------------------------------------------------
export type GHCheck = { name: string; time?: string };

export type GitHubPRProps = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: GHPerson;
  branch: string;
  base?: string;
  commits?: number;
  /** The opening comment, one string per line (keep each line to one line at the page's width: nothing wraps). */
  body: string[];
  /** One commit in the timeline under the comment (its message and short sha). */
  commit?: { message: string; sha: string };
  checks?: GHCheck[];
  /** The frame each check finishes (default: all finished). */
  checksAt?: number[];
  /** The frame the pull request is merged (the badge, the box and the button change). */
  mergeAt?: number;
  /** The frame the Merge button is pressed (default 3 f before mergeAt): a dip the pointer's press lines up with. */
  pressAt?: number;
  counts?: { conversation?: number; commits?: number; checks?: number; files?: number };
  diff?: [number, number];
  /** Sidebar rows (default Reviewers, Assignees, Labels, Development). */
  sidebar?: Array<{ title: string; value: React.ReactNode }>;
  /** The repo's tab counts in the header. */
  repoCounts?: { issues?: number; pulls?: number };
  /** Show GitHub's header (the mark, owner / repo, the repo tabs). Default true. */
  header?: boolean;
  /** The page's width in GitHub's pixels (default 960: 1920 px at scale 2). */
  w?: number;
  scale?: number;
  /** The frame the running checks' spinners start from. */
  start?: number;
  style?: React.CSSProperties;
};

// layout of the page in GitHub's pixels (before scale), shared by the component and gitHubPRGeometry
const prLayout = (p: GitHubPRProps) => {
  const W = p.w ?? 960;
  const pad = 24;
  const sideW = 220;
  const mainW = W - pad * 2 - sideW - 24;
  const header = p.header === false ? 0 : 112;
  const title = header + 24;
  const stateRow = title + 48 + 8;
  const tabs = stateRow + 32 + 16;
  const tl = tabs + 48 + 24;
  const bodyH = p.body.length * 21 + 32;
  const comment = { y: tl, h: 40 + bodyH };
  const commitY = comment.y + comment.h + 16;
  const mergeY = commitY + (p.commit ? 32 + 24 : 8);
  const checks = p.checks ?? [];
  const reviewH = 64;
  const checksH = 64 + checks.length * 36;
  const conflictH = 64;
  const btnRow = mergeY + reviewH + checksH + conflictH;
  const boxX = pad + 56;
  const boxW = mainW - 56;
  return { W, pad, sideW, mainW, header, title, stateRow, tabs, tl, bodyH, comment, commitY, mergeY, reviewH, checksH, conflictH, btnRow, boxX, boxW, H: btnRow + 64 + 40 };
};

/**
 * Where things sit on a GitHubPullRequest, in screen px from its top-left (already multiplied by `scale`): the Merge
 * button's centre (for a Pointer), each check's row, the page's size.
 */
export const gitHubPRGeometry = (p: GitHubPRProps) => {
  const L = prLayout(p);
  const s = p.scale ?? 2;
  return {
    merge: { x: (L.boxX + 16 + 80) * s, y: (L.btnRow + 32) * s },
    checks: (p.checks ?? []).map((_, i) => ({ x: (L.boxX + 16) * s, y: (L.mergeY + L.reviewH + 64 + i * 36 + 18) * s })),
    title: { x: L.pad * s, y: L.title * s },
    width: L.W * s,
    height: L.H * s,
  };
};

const Section: React.FC<{ icon: React.ReactNode; title: string; sub: string; h: number; children?: React.ReactNode; last?: boolean }> = ({ icon, title, sub, h, children, last }) => (
  <div style={{ minHeight: h, borderBottom: last ? undefined : `1px solid ${GH.border}`, boxSizing: 'border-box' }}>
    <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
      {icon}
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 14, color: GH.muted }}>{sub}</div>
      </div>
    </div>
    {children}
  </div>
);
const Disc: React.FC<{ color: string; icon: string }> = ({ color, icon }) => (
  <div style={{ width: 32, height: 32, borderRadius: 32, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <Icon name={icon} size={18} color="#FFFFFF" stroke={2.6} />
  </div>
);
const Spin: React.FC<{ start: number; size: number; color: string }> = ({ start, size, color }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ transform: `rotate(${(frame - start) * 18}deg)`, flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeOpacity={0.25} strokeWidth="2" />
      <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * GitHubPullRequest: a pull request's Conversation page as GitHub draws it today: the header with the repo tabs, the
 * title and number, the state badge and "wants to merge", the PR tabs with counters and the diff stat, the opening
 * comment, a commit, the merge box (review, checks finishing one by one, no conflicts, the green Merge button) and the
 * sidebar. `checksAt` finishes the checks on their frames; `mergeAt` merges it (the purple badge and box).
 */
export const GitHubPullRequest: React.FC<GitHubPRProps> = (p) => {
  const frame = useCurrentFrame();
  const L = prLayout(p);
  const s = p.scale ?? 2;
  const checks = p.checks ?? [];
  const done = checks.map((_, i) => ago(frame, p.checksAt?.[i]));
  const allDone = done.every(Boolean);
  const merged = p.mergeAt !== undefined && frame >= p.mergeAt;
  const pressAt = p.pressAt ?? (p.mergeAt !== undefined ? p.mergeAt - 3 : undefined);
  const press = pressAt === undefined ? 0 : clamp(at(frame, pressAt - 2, 2) - at(frame, pressAt + 1, 5));
  const counts = { conversation: 1, commits: p.commits ?? 1, checks: checks.length, files: 4, ...p.counts };
  const diff = p.diff ?? [128, 14];
  const base = p.base ?? 'main';
  const ref = (t: string) => <span style={{ fontFamily: HOST_MONO, fontSize: 12, background: GH.refBg, color: GH.link, padding: '2px 6px', borderRadius: 6 }}>{t}</span>;
  const sidebar = p.sidebar ?? [
    { title: 'Reviewers', value: 'No reviews' },
    { title: 'Assignees', value: p.author.login },
    { title: 'Labels', value: 'None yet' },
    { title: 'Development', value: 'Successfully merging this pull request may close these issues.' },
  ];
  const tab = (icon: string, label: string, n: number | undefined, active?: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 16px', marginBottom: -1, border: active ? `1px solid ${GH.border}` : '1px solid transparent', borderBottom: active ? `1px solid ${GH.canvas}` : undefined, borderRadius: '6px 6px 0 0', background: active ? GH.canvas : 'transparent', fontSize: 14, color: GH.fg, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
      <Icon name={icon} size={16} color={GH.muted} />
      {label}
      {n !== undefined && <GHCounter n={n} />}
    </div>
  );
  const sq = (c: string, i: number) => <span key={i} style={{ display: 'inline-block', width: 8, height: 8, marginLeft: 1, background: c, borderRadius: 1 }} />;
  const plusSq = Math.round((diff[0] / Math.max(1, diff[0] + diff[1])) * 5);
  return (
    <div style={{ width: L.W * s, height: L.H * s, ...p.style }}>
      <div style={{ width: L.W, height: L.H, transform: `scale(${s})`, transformOrigin: '0 0', background: GH.canvas, fontFamily: HOST_FONT, color: GH.fg, position: 'relative', overflow: 'hidden' }}>
        {/* header: the mark, owner / repo, the repo tabs */}
        {L.header > 0 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: L.W, height: 112, background: GH.subtle, borderBottom: `1px solid ${GH.border}` }}>
            <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${GH.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GH.canvas, boxSizing: 'border-box' }}>
                <Icon name="Menu" size={16} color={GH.muted} />
              </div>
              <Brand name="github" size={32} />
              <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
                {p.owner} <span style={{ color: GH.muted, margin: '0 2px' }}>/</span> <b style={{ fontWeight: 600 }}>{p.repo}</b>
              </span>
              <div style={{ flex: 1 }} />
              <div style={{ width: 240, height: 32, borderRadius: 6, border: `1px solid ${GH.border}`, background: GH.canvas, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontSize: 14, color: GH.muted, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                <Icon name="Search" size={16} color={GH.muted} />
                Type <span style={{ border: `1px solid ${GH.border}`, borderRadius: 4, padding: '0 4px', fontSize: 11, lineHeight: '16px' }}>/</span> to search
              </div>
              {['Plus', 'CircleDot', 'GitPullRequest', 'Inbox'].map((n) => (
                <div key={n} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${GH.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GH.canvas, boxSizing: 'border-box' }}>
                  <Icon name={n} size={16} color={GH.muted} />
                </div>
              ))}
              <GHAvatar p={p.author} size={32} />
            </div>
            <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px' }}>
              {[
                ['Code', 'Code', undefined],
                ['CircleDot', 'Issues', p.repoCounts?.issues ?? 12],
                ['GitPullRequest', 'Pull requests', p.repoCounts?.pulls ?? 3],
                ['CirclePlay', 'Actions', undefined],
                ['Table2', 'Projects', undefined],
                ['Shield', 'Security', undefined],
                ['ChartLine', 'Insights', undefined],
              ].map(([icon, label, n]) => {
                const active = label === 'Pull requests';
                return (
                  <div key={label as string} style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontSize: 14, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                    <Icon name={icon as string} size={16} color={GH.muted} />
                    {label as string}
                    {n !== undefined && <GHCounter n={n as number} />}
                    {active && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2, background: GH.tabLine }} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* title, state, PR tabs */}
        <div style={{ position: 'absolute', left: L.pad, top: L.title, right: L.pad + 150, fontSize: 32, lineHeight: '48px', fontWeight: 400, whiteSpace: 'nowrap' }}>
          {p.title} <span style={{ color: GH.muted }}>#{p.number}</span>
        </div>
        <div style={{ position: 'absolute', right: L.pad, top: L.title + 8, display: 'flex', gap: 8, fontSize: 14, fontWeight: 500 }}>
          <span style={{ height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', borderRadius: 6, border: `1px solid ${GH.border}`, background: GH.subtle, boxSizing: 'border-box' }}>Edit</span>
          <span style={{ height: 32, padding: '0 10px 0 12px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6, background: GH.openBtn, color: '#FFFFFF', fontWeight: 600 }}>
            <Icon name="Code" size={16} color="#FFFFFF" />
            Code
            <Icon name="ChevronDown" size={14} color="#FFFFFF" />
          </span>
        </div>
        <div style={{ position: 'absolute', left: L.pad, top: L.stateRow, height: 32, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: GH.muted, whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', borderRadius: 32, background: merged ? GH.done : GH.openBtn, color: '#FFFFFF', fontWeight: 600 }}>
            <Icon name={merged ? 'GitMerge' : 'GitPullRequest'} size={16} color="#FFFFFF" stroke={2.4} />
            {merged ? 'Merged' : 'Open'}
          </span>
          <b style={{ color: GH.fg, fontWeight: 600 }}>{p.author.login}</b> {merged ? 'merged' : 'wants to merge'} {counts.commits} commit{counts.commits === 1 ? '' : 's'} into {ref(base)} from {ref(p.branch)}
          <Icon name="Copy" size={14} color={GH.muted} />
        </div>
        <div style={{ position: 'absolute', left: L.pad, right: L.pad, top: L.tabs, height: 48, display: 'flex', alignItems: 'flex-end', borderBottom: `1px solid ${GH.border}` }}>
          {tab('MessagesSquare', 'Conversation', counts.conversation, true)}
          {tab('GitCommitHorizontal', 'Commits', counts.commits)}
          {tab('ListChecks', 'Checks', counts.checks)}
          {tab('FileDiff', 'Files changed', counts.files)}
          <div style={{ flex: 1 }} />
          <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: GH.open }}>+{diff[0]}</span>
            <span style={{ color: GH.danger }}>−{diff[1]}</span>
            <span style={{ marginLeft: 4 }}>{[0, 1, 2, 3, 4].map((i) => sq(i < plusSq ? GH.open : i < 5 && diff[1] > 0 && i === plusSq ? GH.danger : '#D1D9E0', i))}</span>
          </div>
        </div>
        {/* timeline: the comment */}
        <div style={{ position: 'absolute', left: L.pad + 56 + 16, top: L.comment.y + L.comment.h, width: 2, height: L.mergeY - (L.comment.y + L.comment.h), background: GH.border }} />
        <div style={{ position: 'absolute', left: L.pad, top: L.comment.y }}>
          <GHAvatar p={p.author} size={40} />
        </div>
        <div style={{ position: 'absolute', left: L.boxX, top: L.comment.y, width: L.boxW, height: L.comment.h, border: `1px solid ${GH.border}`, borderRadius: 6, boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', gap: 4, padding: '0 16px', background: GH.subtle, borderBottom: `1px solid ${GH.border}`, fontSize: 14, color: GH.muted, whiteSpace: 'nowrap' }}>
            <b style={{ color: GH.fg, fontWeight: 600 }}>{p.author.login}</b> commented now
            <div style={{ flex: 1 }} />
            <span style={{ border: `1px solid ${GH.border}`, borderRadius: 20, padding: '0 7px', fontSize: 12, lineHeight: '18px' }}>Author</span>
            <Icon name="Ellipsis" size={16} color={GH.muted} style={{ marginLeft: 8 }} />
          </div>
          <div style={{ padding: 16, fontSize: 14, lineHeight: '21px' }}>
            {p.body.map((ln, i) => (
              <div key={i} style={{ whiteSpace: 'nowrap', minHeight: 21 }}>
                {ln}
              </div>
            ))}
          </div>
        </div>
        {/* a commit */}
        {p.commit && (
          <div style={{ position: 'absolute', left: L.pad + 56, top: L.commitY, width: L.boxW, height: 32, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: GH.muted, whiteSpace: 'nowrap' }}>
            <div style={{ width: 34, display: 'flex', justifyContent: 'center', background: GH.canvas }}>
              <Icon name="GitCommitHorizontal" size={16} color={GH.muted} />
            </div>
            <GHAvatar p={p.author} size={20} />
            <span style={{ fontFamily: HOST_MONO, color: GH.fg, textDecoration: 'underline', textDecorationColor: GH.border }}>{p.commit.message}</span>
            <div style={{ flex: 1 }} />
            <span style={{ border: `1px solid ${GH.open}`, color: GH.open, borderRadius: 20, padding: '0 7px', lineHeight: '18px' }}>Verified</span>
            <span style={{ fontFamily: HOST_MONO, marginLeft: 12 }}>{p.commit.sha}</span>
          </div>
        )}
        {/* the merge box: its badge at the left, then the box */}
        <div style={{ position: 'absolute', left: L.pad, top: L.mergeY, width: 40, height: 40, borderRadius: 6, background: merged ? GH.done : allDone ? GH.openBtn : GH.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={merged ? 'GitMerge' : 'GitPullRequest'} size={22} color="#FFFFFF" stroke={2.2} />
        </div>
        <div style={{ position: 'absolute', left: L.boxX, top: L.mergeY, width: L.boxW, border: `1px solid ${merged ? GH.done : GH.border}`, borderRadius: 6, boxSizing: 'border-box', background: GH.canvas, overflow: 'hidden' }}>
          {merged ? (
            <>
              <Section icon={<Disc color={GH.done} icon="GitMerge" />} title="Pull request successfully merged and closed" sub={`You're all set. The ${p.branch} branch can be safely deleted.`} h={64} last={false}>
                <div style={{ padding: '0 16px 16px 60px', fontSize: 14, color: GH.muted }}>
                  {checks.length} successful check{checks.length === 1 ? '' : 's'}
                </div>
              </Section>
              <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
                <span style={{ height: 32, padding: '0 12px', borderRadius: 6, border: `1px solid ${GH.border}`, background: GH.subtle, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 500 }}>Delete branch</span>
              </div>
            </>
          ) : (
            <>
              <Section icon={<Disc color={GH.openBtn} icon="Check" />} title="Changes reviewed" sub="1 approving review by reviewers with write access" h={L.reviewH} />
              <Section
                icon={allDone ? <Disc color={GH.openBtn} icon="Check" /> : <Disc color={GH.pending} icon="Dot" />}
                title={allDone ? 'All checks have passed' : "Some checks haven't completed yet"}
                sub={allDone ? `${checks.length} successful check${checks.length === 1 ? '' : 's'}` : `${done.filter((d) => !d).length} in progress, ${done.filter(Boolean).length} successful`}
                h={L.checksH}
              >
                {checks.map((c, i) => (
                  <div key={c.name} style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 0 24px', fontSize: 14, whiteSpace: 'nowrap', background: GH.subtle, borderTop: `1px solid ${GH.border}` }}>
                    {done[i] ? <Icon name="Check" size={16} color={GH.open} stroke={2.6} /> : <Spin start={p.start ?? 0} size={16} color={GH.pending} />}
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: GH.canvas, border: `1px solid ${GH.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                      <Icon name="Workflow" size={12} color={GH.muted} />
                    </div>
                    <b style={{ fontWeight: 600 }}>{c.name}</b>
                    <span style={{ color: GH.muted }}>{done[i] ? `Successful in ${c.time ?? '32s'}` : 'In progress'}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ color: GH.link }}>Details</span>
                  </div>
                ))}
              </Section>
              <Section icon={<Disc color={GH.openBtn} icon="Check" />} title="No conflicts with base branch" sub="Merging can be performed automatically." h={L.conflictH} />
              <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderTop: `1px solid ${GH.border}` }}>
                <div style={{ display: 'inline-flex', height: 32, borderRadius: 6, overflow: 'hidden', transform: `scale(${1 - press * 0.04})`, opacity: allDone ? 1 : 0.55, boxShadow: '0 1px 0 rgba(31,35,40,0.1)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 12px', background: press > 0 ? '#1A7F37' : GH.openBtn, color: '#FFFFFF', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Merge pull request</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 8px', background: GH.openBtn, borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                    <Icon name="ChevronDown" size={14} color="#FFFFFF" stroke={2.4} />
                  </span>
                </div>
                <span style={{ fontSize: 14, color: GH.muted, whiteSpace: 'nowrap' }}>You can also merge this with the command line.</span>
              </div>
            </>
          )}
        </div>
        {/* sidebar */}
        <div style={{ position: 'absolute', left: L.W - L.pad - L.sideW, top: L.tl, width: L.sideW, fontSize: 12, color: GH.fg }}>
          {sidebar.map((r, i) => (
            <div key={r.title} style={{ padding: '0 0 16px', marginBottom: 16, borderBottom: i < sidebar.length - 1 ? `1px solid ${GH.border}` : undefined, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, color: GH.muted, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                {r.title}
                <div style={{ flex: 1 }} />
                <Icon name="Settings" size={14} color={GH.muted} />
              </div>
              <div>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================================================================================
// VS Code (the Modern themes: Dark Modern, VS Code's default, and Light Modern)
// =====================================================================================================================

type VSTheme = {
  title: string;
  side: string;
  editor: string;
  border: string;
  fg: string;
  dim: string;
  lineNo: string;
  lineNoActive: string;
  activeLine: string;
  accent: string;
  tabInactive: string;
  select: string;
  input: string;
  tok: Record<'text' | 'control' | 'storage' | 'string' | 'comment' | 'number' | 'type' | 'fn' | 'variable' | 'tag' | 'attr' | 'punct', string>;
  brackets: [string, string, string];
};

/** VS Code's own colours: Dark Modern (the default) and Light Modern, with their syntax colours (Dark+ and Light+). */
export const VS_THEMES: Record<'dark' | 'light', VSTheme> = {
  dark: {
    title: '#181818',
    side: '#181818',
    editor: '#1F1F1F',
    border: '#2B2B2B',
    fg: '#CCCCCC',
    dim: '#9D9D9D',
    lineNo: '#6E7681',
    lineNoActive: '#CCCCCC',
    activeLine: '#282828',
    accent: '#0078D4',
    tabInactive: '#181818',
    select: '#264F78',
    input: '#313131',
    tok: { text: '#CCCCCC', control: '#C586C0', storage: '#569CD6', string: '#CE9178', comment: '#6A9955', number: '#B5CEA8', type: '#4EC9B0', fn: '#DCDCAA', variable: '#9CDCFE', tag: '#569CD6', attr: '#9CDCFE', punct: '#CCCCCC' },
    brackets: ['#FFD700', '#DA70D6', '#179FFF'],
  },
  light: {
    title: '#F8F8F8',
    side: '#F8F8F8',
    editor: '#FFFFFF',
    border: '#E5E5E5',
    fg: '#3B3B3B',
    dim: '#868686',
    lineNo: '#6E7681',
    lineNoActive: '#171184',
    activeLine: '#F5F5F5',
    accent: '#005FB8',
    tabInactive: '#F8F8F8',
    select: '#ADD6FF',
    input: '#FFFFFF',
    tok: { text: '#3B3B3B', control: '#AF00DB', storage: '#0000FF', string: '#A31515', comment: '#008000', number: '#098658', type: '#267F99', fn: '#795E26', variable: '#001080', tag: '#800000', attr: '#E50000', punct: '#3B3B3B' },
    brackets: ['#0431FA', '#319331', '#7B3814'],
  },
};

const CONTROL = /^(import|export|from|return|if|else|for|while|await|default|switch|case|break|throw|try|catch|as|of|in)$/;
const STORAGE = /^(const|let|var|function|type|interface|class|new|extends|async|enum|true|false|null|undefined|this|typeof|def|self)$/;

/** Colour one line of code the way VS Code's default themes colour TypeScript, JSX, JSON, CSS and Python. */
export const vsTokens = (line: string, theme: VSTheme, depth0 = 0): { tokens: Array<{ t: string; c: string }>; depth: number } => {
  const T = theme.tok;
  const out: Array<{ t: string; c: string }> = [];
  let depth = depth0;
  const re = /(\/\/.*$|(?<=^\s*)#.*$|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|<\/?[A-Za-z][\w.]*|\/?>|\b\d[\d_.]*\b|\b[A-Za-z_$][\w$]*\b|[{}()[\]]|\s+|.)/g;
  const parts = line.match(re) ?? [];
  parts.forEach((s, i) => {
    const next = parts.slice(i + 1).find((x) => !/^\s+$/.test(x)) ?? '';
    const prev = parts.slice(0, i).reverse().find((x) => !/^\s+$/.test(x)) ?? '';
    let c = T.text;
    if (/^(\/\/|#)/.test(s)) c = T.comment;
    // a JSON key is a property (the variable colour), its value a string
    else if (/^['"`]/.test(s)) c = s[0] === '"' && next === ':' ? T.variable : T.string;
    else if (/^<\/?[A-Za-z]/.test(s)) {
      const name = s.replace(/^<\/?/, '');
      out.push({ t: s.slice(0, s.length - name.length), c: T.punct });
      out.push({ t: name, c: /^[A-Z]/.test(name) ? T.type : T.tag });
      return;
    } else if (/^\/?>$/.test(s)) c = T.punct;
    else if (/^\d/.test(s)) c = T.number;
    else if (CONTROL.test(s)) c = T.control;
    else if (STORAGE.test(s)) c = T.storage;
    else if (/^[A-Za-z_$]/.test(s)) {
      if (next === '=' && /<[A-Za-z]/.test(line) && !/^(const|let|var)$/.test(prev)) c = T.attr;
      else if (next === '(') c = T.fn;
      else if (/^[A-Z]/.test(s)) c = T.type;
      else c = T.variable;
    } else if (/^[{([]$/.test(s)) {
      c = theme.brackets[depth % 3];
      depth += 1;
    } else if (/^[})\]]$/.test(s)) {
      depth = Math.max(0, depth - 1);
      c = theme.brackets[depth % 3];
    } else c = T.punct;
    out.push({ t: s, c });
  });
  return { tokens: out, depth };
};

/** A file's icon as VS Code's default icon theme (Seti) draws it, by extension. */
export const VSFileIcon: React.FC<{ name: string; size?: number; folder?: boolean; open?: boolean; theme?: 'dark' | 'light' }> = ({ name, size = 16, folder, open, theme = 'dark' }) => {
  const dim = VS_THEMES[theme].dim;
  if (folder) return <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={size} color={dim} stroke={1.8} />;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const blue = '#519ABA';
  const txt = (t: string, c: string) => <span style={{ width: size, display: 'inline-flex', justifyContent: 'center', fontFamily: HOST_FONT, fontSize: size * 0.62, fontWeight: 700, color: c, letterSpacing: '-0.04em', flexShrink: 0 }}>{t}</span>;
  if (ext === 'ts') return txt('TS', blue);
  if (ext === 'js' || ext === 'mjs') return txt('JS', '#CBCB41');
  if (ext === 'tsx' || ext === 'jsx') return <Icon name="Atom" size={size} color={blue} stroke={2} />;
  if (ext === 'json') return txt('{}', '#CBCB41');
  if (ext === 'css') return txt('#', blue);
  if (ext === 'py') return txt('py', '#4B8BBE');
  if (ext === 'md') return <Icon name="Info" size={size} color={blue} stroke={2} />;
  if (/^(png|jpg|jpeg|svg|webp|gif)$/.test(ext)) return <Icon name="Image" size={size} color="#A074C4" stroke={2} />;
  return <Icon name="File" size={size} color={dim} stroke={1.8} />;
};

export type VSFile = { name: string; depth?: number; folder?: boolean; open?: boolean; active?: boolean; modified?: boolean };
export type VSTab = { name: string; active?: boolean; modified?: boolean };

export type VSCodeProps = {
  theme?: 'dark' | 'light';
  /** The workspace's name in the command centre and the explorer. */
  workspace: string;
  tabs: VSTab[];
  /** The breadcrumb under the tabs (default: the active tab's name). */
  breadcrumb?: string[];
  /** The code, one string per line (indent with spaces). */
  code: string[];
  /** The first line's number (default 1). */
  lineStart?: number;
  /** Lines appear from this frame, one every `perLine` frames (default: all there). */
  revealAt?: number;
  perLine?: number;
  /** Selection bands that grow over a line on a frame (`line` counts from 0 in `code`). */
  highlights?: Array<{ line: number; at: number; color?: string }>;
  /** The line the caret is on (the active line's band and number). */
  activeLine?: number;
  /** The explorer's tree (omit for no sidebar). */
  files?: VSFile[];
  /** The status bar: the branch, problems [errors, warnings], items at the right (default Ln, Spaces, UTF-8, the language). */
  status?: { branch?: string; problems?: [number, number]; right?: string[] };
  /** An extension's own item: its mark in the activity bar (lit) and its name in the status bar. */
  extension?: { mark: React.ReactNode; label: string };
  /** The window's size in VS Code's pixels (default 960 x 540: 1920 x 1080 at scale 2). */
  w?: number;
  h?: number;
  scale?: number;
  /** The code's font size in VS Code's pixels (default 14, the editor's default). */
  codeSize?: number;
  /** Laid over the editor area (a notification, the product's own panel), in VS Code's pixels. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/** Where the editor's code area and a line sit, in screen px from the window's top-left (multiplied by `scale`). */
export const vsCodeGeometry = (p: Pick<VSCodeProps, 'files' | 'scale' | 'codeSize' | 'w' | 'h'>) => {
  const s = p.scale ?? 2;
  const cs = p.codeSize ?? 14;
  const lh = Math.round(cs * 1.36);
  const left = 48 + (p.files ? 220 : 0);
  const top = 35 + 35 + 22;
  return { codeX: (left + 64) * s, codeY: (top + 4) * s, lineH: lh * s, line: (i: number) => ({ x: (left + 64) * s, y: (top + 4 + i * lh + lh / 2) * s }), width: (p.w ?? 960) * s, height: (p.h ?? 540) * s };
};

/**
 * VSCodeWindow: a VS Code window as it looks today: the title bar with the menu, the command centre and the layout
 * controls, the activity bar, the explorer, the tabs, the breadcrumb, the editor with line numbers, syntax colours and
 * coloured bracket pairs, the status bar. Dark Modern (VS Code's default) or Light Modern. `revealAt` writes the code
 * line by line; `highlights` grow selection bands; `children` sit over the editor (a VSCodeNotice).
 */
export const VSCodeWindow: React.FC<VSCodeProps> = (p) => {
  const frame = useCurrentFrame();
  const th = VS_THEMES[p.theme ?? 'dark'];
  const W = p.w ?? 960;
  const H = p.h ?? 540;
  const s = p.scale ?? 2;
  const cs = p.codeSize ?? 14;
  const lh = Math.round(cs * 1.36);
  const sideW = p.files ? 220 : 0;
  const left = 48 + sideW;
  const top = 35;
  const tabsH = 35;
  const crumbH = 22;
  const statusH = 22;
  const lang = (p.tabs.find((t) => t.active)?.name ?? '').split('.').pop() ?? '';
  const langName: Record<string, string> = { tsx: 'TypeScript JSX', ts: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript JSX', json: 'JSON', css: 'CSS', py: 'Python', md: 'Markdown' };
  const shown = p.revealAt === undefined ? p.code.length : Math.max(0, Math.min(p.code.length, Math.floor((frame - p.revealAt) / (p.perLine ?? 1)) + 1));
  const crumb = p.breadcrumb ?? [p.tabs.find((t) => t.active)?.name ?? ''];
  let depth = 0;
  const lines = p.code.map((ln) => {
    const r = vsTokens(ln, th, depth);
    depth = r.depth;
    return r.tokens;
  });
  const status = { branch: 'main', problems: [0, 0] as [number, number], right: ['Ln 12, Col 8', 'Spaces: 2', 'UTF-8', 'LF', langName[lang] ?? 'Plain Text'], ...p.status };
  const ui: React.CSSProperties = { fontFamily: HOST_FONT, color: th.fg };
  return (
    <div style={{ width: W * s, height: H * s, ...p.style }}>
      <div style={{ ...ui, width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0', background: th.editor, position: 'relative', overflow: 'hidden', fontSize: 13 }}>
        {/* title bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: top, background: th.title, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
          <div style={{ width: 35, display: 'flex', justifyContent: 'center' }}>
            <Brand name="vscode" size={16} />
          </div>
          {/* a narrow window folds the last menus into "..." the way VS Code does */}
          {(W < 1100 ? ['File', 'Edit', 'Selection', 'View', 'Go', 'Run'] : ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help']).map((m) => (
            <span key={m} style={{ padding: '0 7px', fontSize: 13, color: th.fg, whiteSpace: 'nowrap' }}>
              {m}
            </span>
          ))}
          {W < 1100 && <Icon name="Ellipsis" size={14} color={th.fg} style={{ margin: '0 7px' }} />}
          <div style={{ flex: 1 }} />
          <div style={{ position: 'absolute', left: Math.max(W / 2 - 150, W < 1100 ? 352 : 0), top: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="ArrowLeft" size={14} color={th.dim} />
            <Icon name="ArrowRight" size={14} color={th.dim} />
            <div style={{ width: W < 1100 ? 236 : 280, height: 22, borderRadius: 6, border: `1px solid ${th.border}`, background: p.theme === 'light' ? '#FFFFFF' : '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: th.dim, boxSizing: 'border-box' }}>
              <Icon name="Search" size={12} color={th.dim} />
              {p.workspace}
            </div>
          </div>
          {['PanelLeft', 'PanelBottom', 'PanelRight', 'LayoutPanelLeft'].map((n) => (
            <div key={n} style={{ width: 26, display: 'flex', justifyContent: 'center' }}>
              <Icon name={n} size={14} color={th.dim} stroke={1.6} />
            </div>
          ))}
          <div style={{ width: 12 }} />
          {['Minus', 'Square', 'X'].map((n) => (
            <div key={n} style={{ width: 46, display: 'flex', justifyContent: 'center' }}>
              <Icon name={n} size={n === 'Square' ? 11 : 14} color={th.fg} stroke={1.4} />
            </div>
          ))}
        </div>
        {/* activity bar */}
        <div style={{ position: 'absolute', left: 0, top, width: 48, bottom: statusH, background: th.side, borderRight: `1px solid ${th.border}`, boxSizing: 'border-box' }}>
          {['Files', 'Search', 'GitBranch', 'Bug', 'Blocks'].map((n, i) => (
            <div key={n} style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i === 0 && p.files && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: th.accent }} />}
              <Icon name={n} size={24} color={i === 0 && p.files ? th.fg : th.dim} stroke={1.5} />
            </div>
          ))}
          {p.extension && (
            <div style={{ position: 'relative', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!p.files && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: th.accent }} />}
              <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.extension.mark}</div>
            </div>
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8 }}>
            {['CircleUserRound', 'Settings'].map((n) => (
              <div key={n} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={n} size={24} color={th.dim} stroke={1.5} />
              </div>
            ))}
          </div>
        </div>
        {/* explorer */}
        {p.files && (
          <div style={{ position: 'absolute', left: 48, top, width: sideW, bottom: statusH, background: th.side, borderRight: `1px solid ${th.border}`, boxSizing: 'border-box' }}>
            <div style={{ height: 35, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 11, color: th.fg }}>
              EXPLORER
              <div style={{ flex: 1 }} />
              <Icon name="Ellipsis" size={14} color={th.dim} />
            </div>
            <div style={{ height: 22, display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px', fontSize: 11, fontWeight: 700, color: th.fg }}>
              <Icon name="ChevronDown" size={14} color={th.fg} stroke={1.8} />
              {p.workspace.toUpperCase()}
            </div>
            {p.files.map((f, i) => (
              <div key={i} style={{ height: 22, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 12 + (f.depth ?? 0) * 8, fontSize: 13, background: f.active ? (p.theme === 'light' ? '#E4E6F1' : '#37373D') : undefined, outline: f.active ? `1px solid ${th.accent}` : undefined, outlineOffset: -1, color: f.modified ? '#E2C08D' : th.fg, whiteSpace: 'nowrap' }}>
                <VSFileIcon name={f.name} folder={f.folder} open={f.open} theme={p.theme} />
                {f.name}
                {f.modified && <span style={{ marginLeft: 'auto', marginRight: 12, fontSize: 11 }}>M</span>}
              </div>
            ))}
          </div>
        )}
        {/* tabs and breadcrumb */}
        <div style={{ position: 'absolute', left, top, right: 0, height: tabsH, background: th.tabInactive, borderBottom: `1px solid ${th.border}`, display: 'flex', boxSizing: 'border-box' }}>
          {p.tabs.map((t) => (
            <div key={t.name} style={{ height: tabsH, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px 0 12px', fontSize: 13, background: t.active ? th.editor : th.tabInactive, color: t.active ? th.fg : th.dim, borderRight: `1px solid ${th.border}`, borderTop: t.active ? `1px solid ${th.accent}` : '1px solid transparent', borderBottom: t.active ? `1px solid ${th.editor}` : undefined, boxSizing: 'border-box', whiteSpace: 'nowrap', fontStyle: 'normal' }}>
              <VSFileIcon name={t.name} theme={p.theme} />
              {t.name}
              <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
                {t.modified ? <span style={{ width: 8, height: 8, borderRadius: 8, background: th.fg }} /> : t.active ? <Icon name="X" size={14} color={th.fg} /> : null}
              </span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left, top: top + tabsH, right: 0, height: crumbH, display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px', fontSize: 13, color: th.dim, whiteSpace: 'nowrap' }}>
          {crumb.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon name="ChevronRight" size={12} color={th.dim} />}
              {i === crumb.length - 1 && c.includes('.') && <VSFileIcon name={c} size={14} theme={p.theme} />}
              <span>{c}</span>
            </React.Fragment>
          ))}
        </div>
        {/* editor */}
        <div style={{ position: 'absolute', left, top: top + tabsH + crumbH, right: 0, bottom: statusH, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 4, right: 0, fontFamily: HOST_MONO, fontSize: cs, lineHeight: `${lh}px` }}>
            {lines.slice(0, shown).map((toks, i) => {
              const active = p.activeLine === i;
              const hls = (p.highlights ?? []).filter((h) => h.line === i);
              return (
                <div key={i} style={{ position: 'relative', height: lh, display: 'flex', whiteSpace: 'pre', background: active ? th.activeLine : undefined }}>
                  <span style={{ width: 52, textAlign: 'right', color: active ? th.lineNoActive : th.lineNo, paddingRight: 12, flexShrink: 0 }}>{(p.lineStart ?? 1) + i}</span>
                  <span style={{ position: 'relative', paddingLeft: 12 }}>
                    {hls.map((h, k) => (
                      <span key={k} style={{ position: 'absolute', left: 12, right: 0, top: 1, bottom: 1, background: h.color ?? th.select, borderRadius: 3, transformOrigin: '0 50%', transform: `scaleX(${at(frame, h.at, 6, ease.out)})` }} />
                    ))}
                    <span style={{ position: 'relative' }}>
                      {toks.map((tk, j) => (
                        <span key={j} style={{ color: tk.c }}>
                          {tk.t}
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {/* the minimap's slider strip at the right edge */}
          <div style={{ position: 'absolute', right: 14, top: 0, width: 1, bottom: 0, background: th.border }} />
          {p.children}
        </div>
        {/* status bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: statusH, background: th.title, borderTop: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: th.dim, boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
          <div style={{ width: 34, height: statusH, background: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -1 }}>
            <Icon name="ChevronsLeftRight" size={14} color="#FFFFFF" stroke={2} />
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="GitBranch" size={13} color={th.dim} />
            {status.branch}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="CircleX" size={13} color={th.dim} /> {status.problems[0]}
            <Icon name="TriangleAlert" size={13} color={th.dim} /> {status.problems[1]}
          </span>
          <div style={{ flex: 1 }} />
          {status.right.map((r) => (
            <span key={r}>{r}</span>
          ))}
          {p.extension && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 13, height: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{p.extension.mark}</span>
              {p.extension.label}
            </span>
          )}
          <Icon name="Bell" size={13} color={th.dim} style={{ marginRight: 10 }} />
        </div>
      </div>
    </div>
  );
};

/**
 * VSCodeNotice: a VS Code notification (bottom right of the editor): the info glyph, the message, its source, the
 * buttons (the first one primary). Place it in VSCodeWindow's children; `at` brings it in (rises 12 px over 8 f).
 */
export const VSCodeNotice: React.FC<{ theme?: 'dark' | 'light'; message: string; source: string; buttons?: string[]; at?: number; pressAt?: number; mark?: React.ReactNode; w?: number; style?: React.CSSProperties }> = ({
  theme = 'dark',
  message,
  source,
  buttons = [],
  at: t0 = 0,
  pressAt,
  mark,
  w = 420,
  style,
}) => {
  const frame = useCurrentFrame();
  const th = VS_THEMES[theme];
  const p = at(frame, t0, 8, ease.out);
  const press = pressAt === undefined ? 0 : clamp(at(frame, pressAt - 2, 2) - at(frame, pressAt + 1, 5));
  if (frame < t0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        width: w,
        background: theme === 'light' ? '#F8F8F8' : '#202020',
        border: `1px solid ${th.border}`,
        borderRadius: 6,
        boxShadow: theme === 'light' ? '0 0 8px 2px rgba(0,0,0,0.16)' : '0 0 8px 2px rgba(0,0,0,0.6)',
        fontFamily: HOST_FONT,
        color: th.fg,
        transform: `translateY(${mix(p, 12, 0)}px)`,
        opacity: clamp(p * 2),
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 8, padding: '10px 10px 4px 10px', fontSize: 13, lineHeight: '18px' }}>
        {mark ?? <Icon name="Info" size={16} color="#3794FF" stroke={2} />}
        <span style={{ flex: 1 }}>{message}</span>
        <Icon name="X" size={14} color={th.dim} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 10px 34px', fontSize: 12, color: th.dim }}>
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Source: {source}</span>
        {buttons.map((b, i) => (
          <span key={b} style={{ height: 24, padding: '0 10px', display: 'inline-flex', alignItems: 'center', borderRadius: 2, fontSize: 12, whiteSpace: 'nowrap', background: i === 0 ? (press > 0 ? '#026EC1' : '#0078D4') : theme === 'light' ? '#E5E5E5' : '#313131', color: i === 0 ? '#FFFFFF' : th.fg, transform: i === 0 ? `scale(${1 - press * 0.05})` : undefined }}>
            {b}
          </span>
        ))}
      </div>
    </div>
  );
};

// =====================================================================================================================
// A design canvas's app chrome (the product's own canvas: a design tool, a whiteboard, an editor)
// =====================================================================================================================

/** The canvas itself: a ground with a dot grid at `pitch`. */
export const DotCanvas: React.FC<{ w: number | string; h: number | string; pitch?: number; ground?: string; dot?: string; style?: React.CSSProperties; children?: React.ReactNode }> = ({ w, h, pitch = 32, ground = '#F4F5F7', dot = 'rgba(21,23,28,0.13)', style, children }) => (
  <div style={{ position: 'absolute', width: w, height: h, background: ground, backgroundImage: `radial-gradient(circle, ${dot} 1.3px, transparent 1.6px)`, backgroundSize: `${pitch}px ${pitch}px`, backgroundPosition: `${pitch / 2}px ${pitch / 2}px`, ...style }}>
    {children}
  </div>
);

export type CanvasColours = { ground: string; surface: string; ink: string; muted: string; line: string; accent: string; accentPale: string; font: string };

/**
 * CanvasChrome: the fixed chrome of a design-canvas app over its moving canvas, in floating panels: the file pill
 * (mark, product, path, file), the people and an action (a sync or share button) at the top right, the tool rail (left,
 * or a bar at the bottom centre the way current design tools set it), the zoom at the bottom right. The product's own
 * look: pass its colours and mark. Sizes are screen px at `size` (the text size, default 25).
 */
export const CanvasChrome: React.FC<{
  mark?: React.ReactNode;
  product: string;
  path?: string[];
  file: string;
  people?: Array<{ initials: string; color: string }>;
  action?: { label: string; icon?: React.ReactNode; dark?: boolean };
  tools?: string[];
  activeTool?: number;
  toolbar?: 'left' | 'bottom';
  zoom?: number;
  colours?: Partial<CanvasColours>;
  size?: number;
  w?: number;
  h?: number;
}> = ({ mark, product, path = [], file, people = [], action, tools = ['MousePointer2', 'Frame', 'Square', 'PenTool', 'Type', 'MessageCircle'], activeTool = 0, toolbar = 'left', zoom = 1, colours, size = 25, w = 1920, h = 1080 }) => {
  const C: CanvasColours = { ground: '#F4F5F7', surface: '#FFFFFF', ink: '#15171C', muted: '#5D6470', line: 'rgba(21,23,28,0.10)', accent: '#0D99FF', accentPale: '#E5F4FF', font: HOST_FONT, ...colours };
  const k = size / 25;
  const pill: React.CSSProperties = { position: 'absolute', display: 'flex', alignItems: 'center', gap: 14 * k, height: 64 * k, padding: `0 ${22 * k}px`, borderRadius: 20 * k, background: C.surface, border: `1.5px solid ${C.line}`, boxShadow: softShadow(2, C.ground), fontFamily: C.font, fontSize: size, color: C.ink, boxSizing: 'border-box', whiteSpace: 'nowrap' };
  const toolBtn = (n: string, i: number) => (
    <div key={n} style={{ width: 44 * k, height: 44 * k, borderRadius: 12 * k, background: i === activeTool ? C.accentPale : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={n} size={26 * k} color={i === activeTool ? C.accent : C.muted} stroke={2} />
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, pointerEvents: 'none' }}>
      <div style={{ ...pill, left: 40 * k, top: 36 * k }}>
        {mark}
        <span style={{ fontWeight: 640 }}>{product}</span>
        {path.map((s) => (
          <React.Fragment key={s}>
            <span style={{ color: mixColor(C.muted, C.surface, 0.45) }}>/</span>
            <span style={{ color: C.muted }}>{s}</span>
          </React.Fragment>
        ))}
        <span style={{ color: mixColor(C.muted, C.surface, 0.45) }}>/</span>
        <span style={{ fontWeight: 560 }}>{file}</span>
      </div>
      {(people.length > 0 || action) && (
        <div style={{ ...pill, right: 40 * k, top: 36 * k, gap: 10 * k, paddingRight: 10 * k }}>
          {people.map((pp, i) => (
            <div key={pp.initials} style={{ width: 40 * k, height: 40 * k, borderRadius: 40 * k, background: pp.color, color: '#FFFFFF', fontSize: 17 * k, fontWeight: 620, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: i ? -16 * k : 0, border: `${2.5 * k}px solid ${C.surface}` }}>
              {pp.initials}
            </div>
          ))}
          {action && (
            <span style={{ marginLeft: 8 * k, display: 'inline-flex', alignItems: 'center', gap: 8 * k, padding: `${10 * k}px ${18 * k}px`, borderRadius: 14 * k, background: action.dark === false ? C.accent : C.ink, color: '#FFFFFF', fontWeight: 600, fontSize: 23 * k }}>
              {action.icon}
              {action.label}
            </span>
          )}
        </div>
      )}
      {toolbar === 'left' ? (
        <div style={{ ...pill, left: 40 * k, top: h / 2 - (tools.length * 66 * k) / 2, height: 'auto', flexDirection: 'column', padding: `${16 * k}px ${12 * k}px`, gap: 22 * k }}>{tools.map(toolBtn)}</div>
      ) : (
        <div style={{ ...pill, left: w / 2 - (tools.length * 54 * k + 24 * k) / 2, bottom: 36 * k, gap: 10 * k, padding: `0 ${12 * k}px` }}>{tools.map(toolBtn)}</div>
      )}
      <div style={{ ...pill, right: 40 * k, bottom: 36 * k, height: 54 * k, fontSize: 23 * k, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
        <Icon name="Minus" size={20 * k} color={C.muted} stroke={2.2} />
        {Math.round(zoom * 100)}%
        <Icon name="Plus" size={20 * k} color={C.muted} stroke={2.2} />
      </div>
    </div>
  );
};
