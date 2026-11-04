// CodePage: an editor with the film's own code: a tab bar with the file, a gutter of line numbers that is always full, and
// the code highlighted by a small tokenizer (keywords, strings, numbers, calls, types, comments) in two hues taken from the
// accent, never a rainbow. It can type the code on as an agent writes it (`type`: the caret leads, the view scrolls by whole
// lines as it grows) or stream it in line by line (`stream`), and hold one line in a wash (`highlight`). Every visible
// line is a focus box, and so is the caret.
//
//   <CodePage file="plan.ts" code={CONTENT.code.text} type={{ at: 10, cps: 60 }} tone="dark" />
import React from 'react';
import { C, FONT } from '../../brand/tokens';
import { clamp, E, fd, prog } from '../../lib/anim';
import { mixColor, oklch as fromLch, toOklch } from '../../lib/color';
import { f60x } from '../../lib/film';
import { Caret, caretOn, fbox, type Focus, focusAttr, Icon, Panel, SCREEN, type ScreenBase, type ScreenLayout, type Skin, textTag, textW, tx, useScreen } from './base';
import { typedAt } from './typing';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type CodeLang = 'ts' | 'js' | 'py' | 'json' | 'sh' | 'css' | 'html' | 'text';

export type CodePageProps = ScreenBase & {
  code: string;
  lang?: CodeLang;
  file?: string;
  /** other open files, as tabs after the first */
  tabs?: string[];
  w?: number;
  /** the lines in view (default every line, at most 24) */
  rows?: number;
  type?: { at: number; cps?: number };
  stream?: { at: number; lps?: number };
  /** a line held in a wash, or a schedule the wash steps along */
  highlight?: number | { at: number; line: number }[];
};

type Tok = { k: 'kw' | 'str' | 'num' | 'com' | 'fn' | 'type' | 'punc' | 'txt'; s: string };

const KW: Record<string, RegExp> = {
  ts: /^(import|from|export|default|const|let|var|function|return|if|else|for|while|await|async|new|type|interface|extends|implements|class|of|in|as|true|false|null|undefined|this|try|catch|throw|switch|case|break)\b/,
  py: /^(import|from|def|return|if|elif|else|for|while|in|not|and|or|class|with|as|try|except|raise|lambda|yield|True|False|None|await|async|self)\b/,
  sh: /^(npm|npx|node|git|cd|export|curl|pip|python|echo|run|install|deploy)\b/,
  css: /^(@media|@import|!important)\b/,
};

/** One line of code as tokens (a small, forgiving tokenizer: enough to look like an editor, never a parser). */
export const tokenize = (line: string, lang: CodeLang = 'ts'): Tok[] => {
  const out: Tok[] = [];
  const kw = KW[lang === 'js' ? 'ts' : lang] ?? KW.ts;
  let s = line;
  const push = (k: Tok['k'], v: string) => {
    if (v) out.push({ k, s: v });
    s = s.slice(v.length);
  };
  while (s.length) {
    let m: RegExpMatchArray | null;
    if ((lang === 'py' || lang === 'sh') && s.startsWith('#')) { push('com', s); break; }
    if (s.startsWith('//') && lang !== 'py' && lang !== 'sh') { push('com', s); break; }
    if ((m = s.match(/^\s+/))) { push('txt', m[0]); continue; }
    if ((m = s.match(/^(['"`])(?:\\.|(?!\1).)*\1?/))) { push('str', m[0]); continue; }
    if ((m = s.match(/^\d[\d_.]*(?:e[+-]?\d+)?/i))) { push('num', m[0]); continue; }
    if (lang === 'json' && (m = s.match(/^(true|false|null)\b/))) { push('kw', m[0]); continue; }
    if (lang !== 'json' && (m = s.match(kw))) { push('kw', m[0]); continue; }
    if ((m = s.match(/^[A-Za-z_$][\w$]*(?=\s*\()/))) { push('fn', m[0]); continue; }
    if ((m = s.match(/^[A-Z][\w$]*/))) { push('type', m[0]); continue; }
    if ((m = s.match(/^[A-Za-z_$][\w$-]*/))) { push('txt', m[0]); continue; }
    if ((m = s.match(/^[{}()[\];,.:=<>+\-*/!?&|%^~@]+/))) { push('punc', m[0]); continue; }
    push('txt', s[0]);
  }
  return out;
};

/** The editor's two hues from the accent: keywords and calls in the accent's family, strings and numbers in a second hue
 * 150 degrees round (nudged out of the orange and violet bands), types and text in the ink, comments faint. */
export const codeInks = (skin: Skin) => {
  const [, aC, aH] = toOklch(skin.accent);
  let h2 = (aH + 150) % 360;
  if (h2 > 35 && h2 < 95) h2 = h2 < 65 ? 25 : 105; // never orange or amber
  if (h2 > 270 && h2 < 330) h2 = h2 < 300 ? 250 : 340; // never violet
  const L = skin.dark ? 0.8 : 0.48;
  const c = Math.min(skin.dark ? 0.16 : 0.13, Math.max(skin.dark ? 0.1 : 0.07, aC));
  return {
    kw: fromLch(skin.dark ? 0.76 : 0.5, c, aH),
    fn: fromLch(skin.dark ? 0.86 : 0.42, c * 0.7, aH + 18),
    str: fromLch(L, c * 0.8, h2),
    num: fromLch(skin.dark ? 0.84 : 0.46, c * 0.75, h2 + 25),
    type: mixColor(skin.text, skin.accent, 0.18),
    punc: mixColor(skin.text, skin.face, 0.38),
    txt: mixColor(skin.text, skin.face, 0.08),
    com: skin.faint,
  };
};

const T = { code: 13, gutter: 12, tab: 13, lead: 1.62, tabH: 40 } as const;
/** The mono face's advance (Geist Mono: 600 of 1000 units), so a column's x needs no measuring. */
const ADV = 0.6;

/** The editor's size and focus boxes at frame f: editor, file, caret, line{i} (lines in view). */
export const codePageLayout = (p: CodePageProps, f: number, ctx: { pt?: number; fps?: number } = {}): ScreenLayout & { lines: string[]; first: number; rows: number; shown: number; scroll: number; chars: number } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const fps = ctx.fps ?? 30;
  const all = p.code.replace(/\t/g, '  ').split('\n');
  const rows = Math.min(p.rows ?? Math.min(24, all.length), all.length);
  const rh = T.code * pt * T.lead;
  const top = T.tabH * pt + 14 * pt;
  const gutter = 46 * pt;
  // as wide as the longest line (between 560 and 880 points), so a line is never cut at the edge; a longer one fades out
  const longest = Math.max(0, ...all.map((l) => l.length));
  const W = p.w ?? Math.min(880 * pt, Math.max(560 * pt, gutter + 14 * pt + longest * ADV * T.code * pt + 30 * pt));
  let chars = p.code.length;
  let shown = all.length;
  if (p.type) {
    const t = typedAt(p.code, f, { at: p.type.at, cps: p.type.cps ?? 70, fps, seed: 'code' });
    chars = t.n;
    shown = p.code.slice(0, t.n).split('\n').length;
  } else if (p.stream) {
    shown = clamp(Math.floor(((fd(f) - p.stream.at) / fps) * (p.stream.lps ?? 9)) + 1, 0, all.length);
  }
  // the view scrolls by whole lines once the text outgrows the rows (hard UI: a line jumps, it never glides)
  const scroll = Math.max(0, shown - rows);
  const first = scroll;
  const H = top + rows * rh + 16 * pt;
  const focus: Focus = { editor: fbox(0, 0, W, H, T.code * pt, SCREEN.radius.card * pt), file: fbox(14 * pt, 6 * pt, textW(p.file ?? '', T.tab * pt, 500) + 48 * pt, (T.tabH - 12) * pt, T.tab * pt) };
  for (let r = 0; r < rows; r++) {
    const i = first + r;
    if (i >= all.length) break;
    focus[`line${i}`] = fbox(gutter, top + r * rh, W - gutter - 16 * pt, rh, T.code * pt);
  }
  const caretLine = Math.max(0, shown - 1);
  const before = p.code.slice(0, chars).split('\n');
  const col = before[before.length - 1] ?? '';
  focus.caret = fbox(gutter + 14 * pt + col.length * ADV * T.code * pt, top + (caretLine - first) * rh + rh * 0.12, Math.max(2, 1.6 * pt), rh * 0.76, T.code * pt);
  return { w: W, h: H, focus, lines: all, first, rows, shown, scroll, chars };
};

/** The editor (see the file header). */
export const CodePage: React.FC<CodePageProps> = (p) => {
  const { f, fps, pt, u, view, skin: s0 } = useScreen({ tone: 'dark', ...p });
  const skin = s0;
  const L = codePageLayout(p, f, { pt, fps });
  const ink = codeInks(skin);
  const lang = p.lang ?? (p.file?.endsWith('.py') ? 'py' : p.file?.endsWith('.json') ? 'json' : p.file?.endsWith('.sh') ? 'sh' : 'ts');
  const rh = T.code * pt * T.lead;
  const top = T.tabH * pt + 14 * pt;
  const gutter = 46 * pt;
  const mono = FONT.mono;
  const hl = typeof p.highlight === 'number' ? p.highlight : Array.isArray(p.highlight) ? [...p.highlight].reverse().find((h) => f >= h.at)?.line : undefined;
  const hlIn = Array.isArray(p.highlight) && hl !== undefined ? prog(f, [...p.highlight].reverse().find((h) => f >= h.at)!.at, [...p.highlight].reverse().find((h) => f >= h.at)!.at + f60x(10, fps), E.snapOut) : 1;
  const typedText = p.type ? p.code.slice(0, L.chars) : undefined;
  const typedLines = typedText?.split('\n');
  const t = p.type ? typedAt(p.code, f, { at: p.type.at, cps: p.type.cps ?? 70, fps, seed: 'code' }) : null;
  const tabs = [p.file, ...(p.tabs ?? [])].filter(Boolean) as string[];
  const code = { fontFamily: mono, fontSize: T.code * pt, lineHeight: `${rh}px`, whiteSpace: 'pre' as const, fontVariantLigatures: 'none' as const };
  const edge = `linear-gradient(90deg, black calc(100% - ${(36 * pt).toFixed(1)}px), transparent 100%)`;
  return (
    <div data-ui data-screen="code-page" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={SCREEN.radius.card * pt} u={u} lift={0.4} backdrop={p.backdrop} focus="editor">
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.tabH * pt, borderBottom: `${Math.max(1, 0.6 * pt).toFixed(2)}px solid ${skin.line}`, display: 'flex', alignItems: 'stretch', paddingLeft: 10 * pt }}>
          {tabs.map((name, i) => (
            <div key={i} {...(i === 0 ? focusAttr('file') : {})} style={{ display: 'flex', alignItems: 'center', gap: 8 * pt, padding: `0 ${14 * pt}px`, background: i === 0 ? mixColor(skin.face, skin.dark ? C.white : C.ink, 0.035) : 'transparent', boxShadow: i === 0 ? `inset 0 ${(-1.5 * pt).toFixed(2)}px 0 ${skin.accent}` : 'none' }}>
              <Icon name={name.endsWith('.json') ? 'braces' : name.endsWith('.md') ? 'doc' : 'code'} size={14 * pt} color={i === 0 ? skin.accent : skin.faint} />
              <span {...textTag(`tab${i}`, T.tab * pt, view)} style={tx(T.tab, pt, 500, i === 0 ? skin.text : skin.mute)}>{name}</span>
            </div>
          ))}
        </div>
        {hl !== undefined && hl >= L.first && hl < L.first + L.rows && <div style={{ position: 'absolute', left: 0, right: 0, top: top + (hl - L.first) * rh, height: rh, background: skin.dark ? mixColor(skin.face, skin.accent, 0.16) : mixColor(skin.face, skin.accent, 0.1), opacity: hlIn }} />}
        {Array.from({ length: L.rows }, (_, r) => {
          const i = L.first + r;
          if (i >= L.lines.length) return null;
          const visible = p.type ? i < (typedLines?.length ?? 0) : p.stream ? i < L.shown : true;
          const text = p.type ? (typedLines?.[i] ?? '') : L.lines[i];
          const streamIn = p.stream ? prog(f, p.stream.at + (i / (p.stream.lps ?? 9)) * fps, p.stream.at + (i / (p.stream.lps ?? 9)) * fps + f60x(10, fps), E.snapOut) : 1;
          return (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: 0, width: gutter - 6 * pt, top: top + r * rh, textAlign: 'right', ...code, fontSize: T.gutter * pt, color: i === hl ? skin.mute : mixColor(skin.faint, skin.face, 0.25) }} data-texture="">
                {i + 1}
              </div>
              {visible && (
                <div {...focusAttr(`line${i}`)} {...textTag(`code${i}`, T.code * pt, view)} style={{ position: 'absolute', left: gutter + 14 * pt, top: top + r * rh, width: L.w - gutter - 28 * pt, overflow: 'hidden', ...(text.length * ADV * T.code * pt > L.w - gutter - 28 * pt ? { WebkitMaskImage: edge, maskImage: edge } : null), ...code, opacity: streamIn, transform: `translateX(${((1 - streamIn) * 10 * pt).toFixed(2)}px)` }}>
                  {tokenize(text, lang).map((k, j) => (
                    <span key={j} style={{ color: ink[k.k] }}>
                      {k.s}
                    </span>
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
        {t && !t.done && <Caret h={L.focus.caret.h} w={L.focus.caret.w} color={skin.accent} on={caretOn(t.since, fps)} style={{ position: 'absolute', left: L.focus.caret.x, top: L.focus.caret.y }} />}
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a CodePage draws (kit/screens/forms.ts), part -> [form, focus box]: the editor as a page, the caret, the file tab as a chip. */
export const CODE_PAGE_FORMS = { page: ['page', 'editor'], caret: ['word', 'caret'], file: ['chip', 'file'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from codePageLayout. */
export const codePageForms = (p: CodePageProps, ctx: { pt?: number; fps?: number } = {}): ScreenForms => screenForms((f) => codePageLayout(p, f, ctx), CODE_PAGE_FORMS, { pt: ctx.pt });
