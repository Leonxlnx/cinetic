// DocPage: a real document page: an optional big number and the product's name at the top, a heavy title with one word in
// the accent, a lead in the quieter ink, a section label, paragraphs set like print (12.5 pt, 1.5 leading) and a table whose header
// row is the accent, the first column numbered. `write` writes the paragraphs on word by word and drops the table rows in
// after them (a document the product is generating). Made for a camera travelling over the page in perspective: the
// title, every paragraph and every table row is a focus box.
//
//   <DocPage number="01" title="Launch plan" accentWord="plan" lead="Everything we ship on Friday, and who owns it." body={[...]} table={{ head: [...], rows: [...] }} />
import React from 'react';
import { C } from '../../brand/tokens';
import { clamp, E, prog } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { f60x } from '../../lib/film';
import { fbox, type Focus, focusAttr, Panel, Picture, SCREEN, type ScreenBase, type ScreenLayout, textTag, textW, tx, useScreen, wrapText } from './base';
import { type FormMap, type ScreenForms, screenForms } from './forms';

export type DocTable = { head: string[]; rows: string[][]; numbered?: boolean };

export type DocPageProps = ScreenBase & {
  /** a big number at the top left ("01") */
  number?: string;
  /** the product or the document's owner, tracked capitals at the top */
  brand?: string;
  eyebrow?: string;
  title: string;
  /** a word of the title set in the accent */
  accentWord?: string;
  /** the title in capitals (default true) */
  caps?: boolean;
  lead?: string;
  section?: string;
  body: string[];
  table?: DocTable;
  figure?: string;
  /** page width, px (default 560 points); the page is as tall as its content, at least A4 */
  w?: number;
  /** write the paragraphs on from `at`, `wps` words a second (default 26), then the table rows */
  write?: { at: number; wps?: number };
};

const T = { number: 60, title: 40, lead: 15, eyebrow: 10.5, body: 12.5, th: 10, td: 12.5, brand: 10 } as const;

/** The page's size and focus boxes: page, title, lead, para{i}, table, row{i}, figure, number. */
export const docPageLayout = (p: DocPageProps, _f = 0, ctx: { pt?: number } = {}): ScreenLayout & { titleLines: string[]; paras: string[][]; cols: number[] } => {
  const pt = ctx.pt ?? SCREEN.pt;
  const W = p.w ?? 560 * pt;
  const pad = 46 * pt;
  const inner = W - 2 * pad;
  const figW = p.figure ? inner * 0.34 : 0;
  const caps = p.caps !== false;
  const title = caps ? p.title.toUpperCase() : p.title;
  const titleLines = wrapText(title, T.title * pt, 800, inner - (figW ? figW + 18 * pt : 0), -0.03);
  const focus: Focus = {};
  let y = pad;
  if (p.brand) y += T.brand * pt * 1.4 + 16 * pt;
  if (p.number) {
    focus.number = fbox(pad, y, textW(p.number, T.number * pt, 850, -0.04), T.number * pt * 0.95, T.number * pt);
    y += T.number * pt * 0.95 + 6 * pt;
  }
  focus.title = fbox(pad, y, Math.max(...titleLines.map((l) => textW(l, T.title * pt, 800, -0.03))), titleLines.length * T.title * pt * 0.98, T.title * pt);
  if (p.figure) focus.figure = fbox(W - pad - figW, pad + (p.brand ? T.brand * pt * 1.4 + 16 * pt : 0), figW, figW * 1.08, undefined, 10 * pt);
  y += titleLines.length * T.title * pt * 0.98 + 14 * pt;
  if (p.lead) {
    focus.lead = fbox(pad, y, textW(p.lead, T.lead * pt, 450), T.lead * pt * 1.35, T.lead * pt);
    y += T.lead * pt * 1.35 + 22 * pt;
  }
  if (focus.figure) y = Math.max(y, focus.figure.y + focus.figure.h + 22 * pt);
  if (p.section) {
    focus.section = fbox(pad, y, textW(p.section.toUpperCase(), T.eyebrow * pt, 750, 0.14), T.eyebrow * pt * 1.3, T.eyebrow * pt);
    y += T.eyebrow * pt * 1.3 + 10 * pt;
  }
  const paras = p.body.map((b) => wrapText(b, T.body * pt, 450, inner));
  paras.forEach((lines, i) => {
    focus[`para${i}`] = fbox(pad, y, inner, lines.length * T.body * pt * 1.5, T.body * pt);
    y += lines.length * T.body * pt * 1.5 + 10 * pt;
  });
  let cols: number[] = [];
  if (p.table) {
    y += 14 * pt;
    const n = p.table.head.length;
    const wts = p.table.head.map((h, c) => Math.max(textW(h.toUpperCase(), T.th * pt, 750, 0.12), ...p.table!.rows.map((r) => textW(r[c] ?? '', T.td * pt, c === 0 ? 800 : 450))) + 20 * pt);
    const sum = wts.reduce((a, b) => a + b, 0);
    cols = wts.map((v) => (v / sum) * inner);
    if (n && p.table.numbered !== false) {
      // the number column stays narrow, the rest share what is left
      const first = Math.min(cols[0], 56 * pt);
      const rest = cols.slice(1).reduce((a, b) => a + b, 0) || 1;
      cols = [first, ...cols.slice(1).map((v) => (v / rest) * (inner - first))];
    }
    const top = y;
    const rh = T.td * pt * 2.3;
    y += 30 * pt;
    p.table.rows.forEach((_, i) => {
      focus[`row${i}`] = fbox(pad, y, inner, rh, T.td * pt);
      y += rh;
    });
    focus.table = fbox(pad, top, inner, y - top, T.td * pt);
  }
  const H = Math.max(y + pad, W * 1.294);
  focus.page = fbox(0, 0, W, H, T.body * pt, 6 * pt);
  return { w: W, h: H, focus, titleLines, paras, cols };
};

/** The page (see the file header). */
export const DocPage: React.FC<DocPageProps> = (p) => {
  const { f, fps, pt, u, view, skin } = useScreen(p);
  const L = docPageLayout(p, f, { pt });
  const { focus } = L;
  const pad = 46 * pt;
  const accent = skin.accentText;
  const ink = skin.text;
  const bodyInk = mixColor(skin.text, skin.face, 0.18);
  // write-on: one word at a time across the paragraphs, then the table rows
  const words = L.paras.map((lines) => lines.join(' ').split(' ').length);
  const total = words.reduce((a, b) => a + b, 0);
  const wps = p.write?.wps ?? 26;
  const shownWords = p.write ? Math.floor(((f - p.write.at) / fps) * wps) : Infinity;
  const tableAt = p.write ? p.write.at + (total / wps) * fps + f60x(8, fps) : -Infinity;
  const titleWords = L.titleLines.map((l) => l.split(' '));
  const accentUp = (p.accentWord ?? '').toUpperCase();
  let wordBase = 0;
  return (
    <div data-ui data-screen="doc-page" style={{ position: 'relative', width: L.w, height: L.h, ...p.style }}>
      <Panel skin={skin} w={L.w} h={L.h} r={6 * pt} u={u} lift={0.5} backdrop={p.backdrop} focus="page">
        {p.brand && <div {...textTag('doc-brand', T.brand * pt, view)} style={{ position: 'absolute', left: pad, top: pad, ...tx(T.brand, pt, 750, skin.mute, { track: 0.16 }) }}>{p.brand.toUpperCase()}</div>}
        {p.number && focus.number && <div {...focusAttr('number')} {...textTag('doc-number', T.number * pt, view)} style={{ position: 'absolute', left: focus.number.x, top: focus.number.y, ...tx(T.number, pt, 850, accent, { track: -0.04, lead: 0.95 }) }}>{p.number}</div>}
        <div {...focusAttr('title')} {...textTag('doc-title', T.title * pt, view)} style={{ position: 'absolute', left: focus.title.x, top: focus.title.y, ...tx(T.title, pt, 800, ink, { track: -0.03, lead: 0.98 }) }}>
          {titleWords.map((ws, li) => (
            <div key={li}>
              {ws.map((w, k) => (
                <span key={k} style={{ color: accentUp && w.toUpperCase().replace(/[^\p{L}\p{N}-]/gu, '') === accentUp.replace(/[^\p{L}\p{N}-]/gu, '') ? accent : ink }}>
                  {w}
                  {k < ws.length - 1 ? ' ' : ''}
                </span>
              ))}
            </div>
          ))}
        </div>
        {p.figure && focus.figure && (
          <div {...focusAttr('figure')} style={{ position: 'absolute', left: focus.figure.x, top: focus.figure.y }}>
            <Picture src={p.figure} w={focus.figure.w} h={focus.figure.h} r={10 * pt} />
          </div>
        )}
        {p.lead && focus.lead && <div {...focusAttr('lead')} {...textTag('doc-lead', T.lead * pt, view)} style={{ position: 'absolute', left: focus.lead.x, top: focus.lead.y, ...tx(T.lead, pt, 450, skin.mute) }}>{p.lead}</div>}
        {p.section && focus.section && <div {...textTag('doc-section', T.eyebrow * pt, view)} style={{ position: 'absolute', left: focus.section.x, top: focus.section.y, ...tx(T.eyebrow, pt, 750, accent, { track: 0.14 }) }}>{p.section.toUpperCase()}</div>}
        {L.paras.map((lines, i) => {
          const b = focus[`para${i}`];
          const base = wordBase;
          wordBase += words[i];
          let k = 0;
          return (
            <div key={i} {...focusAttr(`para${i}`)} {...textTag(`para${i}`, T.body * pt, view)} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, ...tx(T.body, pt, 450, bodyInk, { lead: 1.5 }) }}>
              {lines.map((ln, li) => (
                <div key={li}>
                  {ln.split(' ').map((w, wi) => {
                    const idx = base + k++;
                    const o = p.write ? clamp(shownWords - idx + 1) : 1;
                    return (
                      <span key={wi} style={{ opacity: o }}>
                        {w}
                        {wi < ln.split(' ').length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
        {p.table && focus.table && (
          <div {...focusAttr('table')} style={{ position: 'absolute', left: focus.table.x, top: focus.table.y, width: focus.table.w }}>
            <div style={{ display: 'flex', height: 30 * pt, alignItems: 'center', background: `linear-gradient(180deg, ${mixColor(skin.accent, C.white, 0.08)} 0%, ${skin.accent} 100%)`, borderRadius: 3 * pt }}>
              {p.table.head.map((h, c) => (
                <div key={c} {...textTag(`th${c}`, T.th * pt, view)} style={{ width: L.cols[c], paddingLeft: 10 * pt, boxSizing: 'border-box', ...tx(T.th, pt, 750, skin.accentInk, { track: 0.12 }) }}>
                  {h.toUpperCase()}
                </div>
              ))}
            </div>
            {p.table.rows.map((r, i) => {
              const b = focus[`row${i}`];
              const o = p.write ? prog(f, tableAt + i * f60x(7, fps), tableAt + i * f60x(7, fps) + f60x(14, fps), E.snapOut) : 1;
              return (
                <div key={i} {...focusAttr(`row${i}`)} style={{ position: 'absolute', left: 0, top: b.y - focus.table.y, width: b.w, height: b.h, display: 'flex', alignItems: 'center', borderBottom: `${Math.max(1, 0.5 * pt).toFixed(2)}px solid ${skin.line}`, opacity: o, transform: `translateY(${((1 - o) * 8 * pt).toFixed(2)}px)` }}>
                  {r.map((cell, c) => (
                    <div key={c} {...textTag(`td${i}_${c}`, T.td * pt, view)} style={{ width: L.cols[c], paddingLeft: 10 * pt, boxSizing: 'border-box', ...tx(c === 0 && p.table!.numbered !== false ? 15 : T.td, pt, c === 0 && p.table!.numbered !== false ? 800 : c === 1 ? 620 : 450, c === 0 && p.table!.numbered !== false ? accent : c === 1 ? ink : skin.mute) }}>
                      {cell}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ forms

/** The spine forms a DocPage draws (kit/screens/forms.ts), part -> [form, focus box]: the page, its headline, a figure as a photo, a big number as a count, a table as a list, the lead line. */
export const DOC_PAGE_FORMS = { page: ['page', 'page'], headline: ['word', 'title'], figure: ['photo', 'figure'], number: ['count', 'number'], table: ['list', 'table'], lead: ['word', 'lead'] } as const satisfies FormMap;
/** Its parts as forms with their box on any frame (the screen's px), from docPageLayout. */
export const docPageForms = (p: DocPageProps, ctx: { pt?: number } = {}): ScreenForms => screenForms((f) => docPageLayout(p, f, ctx), DOC_PAGE_FORMS, { pt: ctx.pt });
