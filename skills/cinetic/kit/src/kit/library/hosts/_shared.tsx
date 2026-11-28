// Shared by the host screens: the faces the hosts draw in (HOST_FONT, HOST_MONO), GitHub's Primer colours and
// its small parts (labels, counters, avatars, state glyphs, the issue type), VS Code's two themes and its file icons.
import React from 'react';
import { fonts } from '../../fonts';
import { Icon } from '../../icons';
import { mixColor } from '../../type';

/**
 * The face the hosts draw their UI in. GitHub and VS Code use the system's UI face (Segoe UI, San Francisco); Inter is
 * the bundled stand-in with the same proportions, so a render looks the same on every machine.
 */
export const HOST_FONT = fonts.inter;

/** Code and branch names: the hosts use the system mono (Consolas, SF Mono); Geist Mono stands in. */
export const HOST_MONO = fonts.mono;

export const ago = (frame: number, t: number | undefined) => t === undefined || frame >= t;

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

export const GHLabelPill: React.FC<{ l: GHLabel }> = ({ l }) => (
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

export const GHCounter: React.FC<{ n: number | string }> = ({ n }) => (
  <span style={{ display: 'inline-block', minWidth: 20, padding: '0 6px', height: 18, lineHeight: '18px', borderRadius: 20, background: GH.counter, color: GH.fg, fontSize: 12, fontWeight: 500, textAlign: 'center', boxSizing: 'border-box' }}>{n}</span>
);

/** A round avatar: the person's picture (`src` node) or their initials on a colour. */
export type GHPerson = { login: string; color?: string; avatar?: React.ReactNode };

export const GHAvatar: React.FC<{ p: GHPerson; size: number; square?: boolean }> = ({ p, size, square }) => (
  <div style={{ width: size, height: size, borderRadius: square ? size * 0.2 : size, overflow: 'hidden', flexShrink: 0, background: p.color ?? '#8C959F', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 600, boxShadow: `0 0 0 1px rgba(31,35,40,0.15)` }}>
    {p.avatar ?? p.login.slice(0, 1).toUpperCase()}
  </div>
);

/** The state glyph of an issue or pull request, in GitHub's colours. */
export type GHState = 'open' | 'closed' | 'pr' | 'draft' | 'merged';

export const stateGlyph = (s: GHState, size = 16) => {
  const map: Record<GHState, [string, string]> = { open: ['CircleDot', GH.open], closed: ['CircleCheck', GH.done], pr: ['GitPullRequest', GH.open], draft: ['GitPullRequestDraft', GH.muted], merged: ['GitMerge', GH.done] };
  const [n, c] = map[s];
  return <Icon name={n} size={size} color={c} stroke={2.2} />;
};

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

// =====================================================================================================================
// VS Code (the Modern themes: Dark Modern, VS Code's default, and Light Modern)
// =====================================================================================================================

export type VSTheme = {
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
