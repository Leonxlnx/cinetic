// GitHubPullRequest (host, build): a pull request's Conversation page as GitHub draws it: checks finish one by one,
// the merge button turns it purple.
// Numbers: a 960 px page drawn at scale 2 (about 1300 px tall); the merge press dips the button 4 % over 3 f.
// Caution: each body line fits the comment's width; the title fits beside the two buttons.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Brand, Icon } from '../../icons';
import { at, clamp } from '../../motion';
import { ago, GH, GHAvatar, GHCounter, type GHPerson, HOST_FONT, HOST_MONO } from './_shared';

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
  /** The common name for `start`. */
  at?: number;
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
                    {done[i] ? <Icon name="Check" size={16} color={GH.open} stroke={2.6} /> : <Spin start={p.start ?? p.at ?? 0} size={16} color={GH.pending} />}
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
