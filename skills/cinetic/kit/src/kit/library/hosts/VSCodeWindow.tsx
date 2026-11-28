// VSCodeWindow (host, build): a VS Code window as it looks today, Dark Modern or Light Modern, the code written line
// by line and highlighted.
// Numbers: 960 x 540 VS Code px drawn at scale 2; 13 px UI, 14 px code; `perLine` frames a line when writing.
// Caution: write the code the product would write, 15-25 lines; keep the lines that are read short.
// Catalogue: ../catalog/host.ts; props and recipe: references/library-hosts.md.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Brand, Icon } from '../../icons';
import { at, ease } from '../../motion';
import { HOST_FONT, HOST_MONO, VS_THEMES, VSFileIcon, type VSTheme } from './_shared';

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
