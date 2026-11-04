import React from 'react';
import { C } from './tokens';

// cinetic:placeholder - delete these three lines once the mark is the film's own. This is the
// starter's stand-in: build the film's mark (or place the user's logo) per
// references/brand-and-color.md; lint-film.mjs errors while a placeholder marker is left in src/.
//
// The placeholder mark: three primitives on a 100-unit box, every gap >= 8 units so it still
// reads at 16 px. A dome (A) over a block (B) and the accent dot (D) - the dot is the film's
// story device, which is why it is its own piece. Replace the geometry, keep the contract:
// named pieces, per-piece transforms, geometry exported for the acts to place things by.
export const MARK = {
  A: { d: 'M0 50 A50 50 0 0 1 100 50 Z', cx: 50, cy: 25, w: 100, h: 50 }, // dome: the signature curve
  B: { x: 0, y: 58, w: 46, h: 42, r: 3 }, // block: crisp corners against the curves
  D: { cx: 77, cy: 79, r: 21 }, // dot: the accent
};

export type Piece = 'A' | 'B' | 'D';

/** Per-piece pose in mark units. `origin` defaults to the piece centre; set it to an edge to squash against it. */
export type PieceXf = { x?: number; y?: number; rot?: number; s?: number; sx?: number; sy?: number; o?: number; origin?: [number, number] };

const xf = (p: PieceXf | undefined, cx: number, cy: number) => {
  if (!p) return undefined;
  const [ox, oy] = p.origin ?? [cx, cy];
  // Clamp scales at 0: overshoot must never feed a negative value into SVG geometry.
  const sx = Math.max(0, (p.s ?? 1) * (p.sx ?? 1));
  const sy = Math.max(0, (p.s ?? 1) * (p.sy ?? 1));
  return `translate(${p.x ?? 0} ${p.y ?? 0}) rotate(${p.rot ?? 0} ${ox} ${oy}) translate(${ox} ${oy}) scale(${sx} ${sy}) translate(${-ox} ${-oy})`;
};

export const Mark: React.FC<{
  size: number; // px on screen for the 100-unit box
  ink?: string;
  dot?: string;
  a?: PieceXf;
  b?: PieceXf;
  d?: PieceXf;
  only?: Piece[]; // draw a subset: the dot alone is the story device before the mark exists
  style?: React.CSSProperties;
}> = ({ size, ink = C.ink, dot = C.accent, a, b, d, only, style }) => {
  const { A, B, D } = MARK;
  const show = (p: Piece) => !only || only.includes(p);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible', display: 'block', ...style }}>
      {show('A') && <path d={A.d} fill={ink} transform={xf(a, A.cx, A.cy)} opacity={a?.o ?? 1} />}
      {show('B') && <rect x={B.x} y={B.y} width={B.w} height={B.h} rx={B.r} fill={ink} transform={xf(b, B.x + B.w / 2, B.y + B.h / 2)} opacity={b?.o ?? 1} />}
      {show('D') && <circle cx={D.cx} cy={D.cy} r={D.r} fill={dot} transform={xf(d, D.cx, D.cy)} opacity={d?.o ?? 1} />}
    </svg>
  );
};

/**
 * Transform that places a Mark rendered at `size` so its box's top-left sits at (x, y) scaled by k.
 * Scale the whole SVG by transform instead of changing `size` per frame: no relayout, no pixel snapping.
 */
export const placeMark = (x: number, y: number, k = 1): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  transformOrigin: '0 0',
  transform: `translate(${x}px, ${y}px) scale(${Math.max(1e-4, k)})`,
});

// ------------------------------------------------------------------------------- a supplied logo
// A logo the brand supplies (an SVG file's text) split into parts for an assembly and a lockup:
// logoParts() parses it without a DOM (Node-safe: tests and scripts read it too), normalises its
// viewBox into a 100-unit box (aspect kept, centred), and returns one part per drawable element
// (split 'leaves'), per top-level child ('top', a group stays one part) or per element or group that
// has an id ('ids'). Each part keeps its paths, fills and transforms exactly, plus a box and centre in
// mark units, so fx/Wordmark.tsx can fly it in from an edge and land it where the file put it.
// Supported: path, rect, circle, ellipse, polygon, polyline, line (stroked); g with transforms
// (matrix, translate, scale, rotate, skewX, skewY); fill / stroke / opacity / fill-rule from
// attributes, inline style or simple class rules in a <style> block; inherited from groups.
// Skipped (listed in `skipped`): text, image, use, and everything inside defs, clipPath, mask, symbol.

export type LogoItem = { d: string; fill: string; stroke?: string; strokeWidth?: number; fillRule?: 'nonzero' | 'evenodd'; opacity?: number; transform: string };
export type LogoBox = { x: number; y: number; w: number; h: number };
export type LogoPart = { id: string; items: LogoItem[]; box: LogoBox; cx: number; cy: number; fill: string };
export type Logo = { viewBox: [number, number, number, number]; scale: number; offset: [number, number]; box: LogoBox; parts: LogoPart[]; skipped: string[] };

type Mat = [number, number, number, number, number, number]; // a b c d e f
const I: Mat = [1, 0, 0, 1, 0, 0];
const mul = (m: Mat, n: Mat): Mat => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const nums = (s: string) => (s.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);

/** An SVG transform attribute as one matrix. */
export const parseTransform = (t?: string): Mat => {
  if (!t) return I;
  let m: Mat = I;
  for (const [, fn, args] of t.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = nums(args);
    let n: Mat = I;
    if (fn === 'matrix' && a.length >= 6) n = [a[0], a[1], a[2], a[3], a[4], a[5]];
    else if (fn === 'translate') n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
    else if (fn === 'scale') n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (fn === 'rotate') {
      const r = ((a[0] ?? 0) * Math.PI) / 180;
      const [cx, cy] = [a[1] ?? 0, a[2] ?? 0];
      n = mul(mul([1, 0, 0, 1, cx, cy], [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    } else if (fn === 'skewX') n = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    else if (fn === 'skewY') n = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = mul(m, n);
  }
  return m;
};
const matStr = (m: Mat) => `matrix(${m.map((v) => +v.toFixed(6)).join(' ')})`;

/** Points along a path (end points, curve samples, arc samples) in its own coordinates: for boxes. */
export const pathPoints = (d: string): [number, number][] => pathSubpaths(d).flat();

/** The same points, one array per subpath (a new one at every moveto). */
export const pathSubpaths = (d: string): [number, number][][] => {
  const subs: [number, number][][] = [];
  let out: [number, number][] = [];
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cx = 0;
  let cy = 0; // the last control point (for S and T)
  const num = () => Number(toks[i++]);
  const isNum = () => i < toks.length && !/^[a-zA-Z]$/.test(toks[i]);
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let k = 1; k <= 8; k++) {
      const t = k / 8;
      const u = 1 - t;
      out.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
    }
  };
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C2 = cmd.toUpperCase();
    if (C2 === 'Z') {
      x = sx;
      y = sy;
      cx = x;
      cy = y;
      continue;
    }
    if (!isNum()) break;
    if (C2 === 'M' || C2 === 'L' || C2 === 'T') {
      const nx = num() + (rel ? x : 0);
      const ny = num() + (rel ? y : 0);
      if (C2 === 'T') {
        const qx = 2 * x - cx;
        const qy = 2 * y - cy;
        cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), nx + (2 / 3) * (qx - nx), ny + (2 / 3) * (qy - ny), nx, ny);
        cx = qx;
        cy = qy;
      } else {
        cx = nx;
        cy = ny;
      }
      x = nx;
      y = ny;
      if (C2 === 'M') {
        if (out.length) subs.push(out);
        out = [];
      }
      out.push([x, y]);
      if (C2 === 'M') {
        sx = x;
        sy = y;
        cmd = rel ? 'l' : 'L';
      }
    } else if (C2 === 'H') {
      x = num() + (rel ? x : 0);
      cx = x;
      cy = y;
      out.push([x, y]);
    } else if (C2 === 'V') {
      y = num() + (rel ? y : 0);
      cx = x;
      cy = y;
      out.push([x, y]);
    } else if (C2 === 'C' || C2 === 'S') {
      const x1 = C2 === 'S' ? 2 * x - cx : num() + (rel ? x : 0);
      const y1 = C2 === 'S' ? 2 * y - cy : num() + (rel ? y : 0);
      const x2 = num() + (rel ? x : 0);
      const y2 = num() + (rel ? y : 0);
      const x3 = num() + (rel ? x : 0);
      const y3 = num() + (rel ? y : 0);
      cubic(x1, y1, x2, y2, x3, y3);
      cx = x2;
      cy = y2;
      x = x3;
      y = y3;
    } else if (C2 === 'Q') {
      const qx = num() + (rel ? x : 0);
      const qy = num() + (rel ? y : 0);
      const nx = num() + (rel ? x : 0);
      const ny = num() + (rel ? y : 0);
      cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), nx + (2 / 3) * (qx - nx), ny + (2 / 3) * (qy - ny), nx, ny);
      cx = qx;
      cy = qy;
      x = nx;
      y = ny;
    } else if (C2 === 'A') {
      const rx0 = Math.abs(num());
      const ry0 = Math.abs(num());
      const phi = (num() * Math.PI) / 180;
      const large = num();
      const sweep = num();
      const nx = num() + (rel ? x : 0);
      const ny = num() + (rel ? y : 0);
      // endpoint -> centre parameterisation (SVG implementation notes, F.6.5), then samples
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const dx = (x - nx) / 2;
      const dy = (y - ny) / 2;
      const x1p = cp * dx + sp * dy;
      const y1p = -sp * dx + cp * dy;
      let rx = rx0;
      let ry = ry0;
      const lam = rx && ry ? (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry) : 0;
      if (lam > 1) {
        rx *= Math.sqrt(lam);
        ry *= Math.sqrt(lam);
      }
      if (rx && ry) {
        const sgn = large !== sweep ? 1 : -1;
        const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
        const co = sgn * Math.sqrt(Math.max(0, num2 / (rx * rx * y1p * y1p + ry * ry * x1p * x1p || 1)));
        const cxp = (co * rx * y1p) / ry;
        const cyp = (-co * ry * x1p) / rx;
        const ccx = cp * cxp - sp * cyp + (x + nx) / 2;
        const ccy = sp * cxp + cp * cyp + (y + ny) / 2;
        const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
        let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
        if (!sweep && dt > 0) dt -= 2 * Math.PI;
        if (sweep && dt < 0) dt += 2 * Math.PI;
        for (let k = 1; k <= 12; k++) {
          const t = t1 + (dt * k) / 12;
          out.push([ccx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, ccy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]);
        }
      } else out.push([nx, ny]);
      x = nx;
      y = ny;
      cx = x;
      cy = y;
    } else i++;
  }
  if (out.length) subs.push(out);
  return subs;
};

/**
 * A path as closed polygons, one per subpath (curves and arcs flattened), in the coordinates of
 * `transform` (a part item's own transform: mark units). Each polygon is a footprint fx/KeyLight.tsx
 * can extrude for a relief of a logo part.
 */
export const pathPolys = (d: string, transform?: string): [number, number][][] => {
  const m = parseTransform(transform);
  return pathSubpaths(d)
    .map((q) => {
      const r = q.map(([px, py]) => apply(m, px, py));
      if (r.length > 2 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 1e-6) r.pop();
      return r;
    })
    .filter((q) => q.length >= 3);
};

const attrsOf = (s: string) => {
  const a: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) a[m[1]] = m[3] ?? m[4] ?? '';
  for (const kv of (a.style ?? '').split(';')) {
    const [k, v] = kv.split(':').map((t) => t?.trim());
    if (k && v) a[k] = v;
  }
  return a;
};

const shapeD = (tag: string, a: Record<string, string>): string | null => {
  const n = (k: string, d = 0) => (a[k] !== undefined ? parseFloat(a[k]) : d);
  if (tag === 'path') return a.d ?? null;
  if (tag === 'rect') {
    const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')];
    let rx = a.rx !== undefined ? n('rx') : a.ry !== undefined ? n('ry') : 0;
    let ry = a.ry !== undefined ? n('ry') : rx;
    rx = Math.min(rx, w / 2);
    ry = Math.min(ry, h / 2);
    if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const [cx, cy] = [n('cx'), n('cy')];
    const rx = tag === 'circle' ? n('r') : n('rx');
    const ry = tag === 'circle' ? n('r') : n('ry');
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const p = nums(a.points ?? '');
    if (p.length < 4) return null;
    let d = `M${p[0]} ${p[1]}`;
    for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
    return tag === 'polygon' ? d + 'Z' : d;
  }
  if (tag === 'line') return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
  return null;
};

const SKIP_BLOCK = /^(defs|clipPath|mask|symbol|style|title|desc|metadata|linearGradient|radialGradient|pattern|filter)$/;

/** Parse a supplied logo SVG into parts in a 100-unit box (see the block comment above). */
export const logoParts = (svg: string, o: { split?: 'leaves' | 'top' | 'ids'; box?: number; fallbackFill?: string } = {}): Logo => {
  const split = o.split ?? 'leaves';
  const boxSize = o.box ?? 100;
  const src = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const classStyle: Record<string, Record<string, string>> = {};
  for (const st of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g))
    for (const r of st[1].matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const decl = attrsOf(`style="${r[2]}"`);
      delete decl.style;
      for (const sel of r[1].split(',')) {
        const cls = sel.trim().match(/^\.([\w-]+)$/)?.[1];
        if (cls) classStyle[cls] = { ...(classStyle[cls] ?? {}), ...decl };
      }
    }
  const rootAttrs = attrsOf(src.match(/<svg\b([^>]*)>/)?.[1] ?? '');
  const vb = nums(rootAttrs.viewBox ?? '');
  const viewBox: [number, number, number, number] = vb.length === 4 ? [vb[0], vb[1], vb[2], vb[3]] : [0, 0, parseFloat(rootAttrs.width ?? '100') || 100, parseFloat(rootAttrs.height ?? '100') || 100];
  const scale = boxSize / Math.max(viewBox[2], viewBox[3]);
  const offset: [number, number] = [(boxSize - viewBox[2] * scale) / 2 - viewBox[0] * scale, (boxSize - viewBox[3] * scale) / 2 - viewBox[1] * scale];
  type Frame = { m: Mat; style: Record<string, string>; part: string | null; depth: number };
  const stack: Frame[] = [{ m: [scale, 0, 0, scale, offset[0], offset[1]], style: {}, part: null, depth: 0 }];
  const parts = new Map<string, LogoItem[]>();
  const order: string[] = [];
  const skipped: string[] = [];
  let skipDepth = 0;
  let leaf = 0;
  const body = src.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  for (const t of body.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, close, tag, rest, selfClose] = t;
    const top = stack[stack.length - 1];
    if (SKIP_BLOCK.test(tag)) {
      if (close) skipDepth = Math.max(0, skipDepth - 1);
      else if (!selfClose) skipDepth++;
      continue;
    }
    if (skipDepth > 0) continue;
    if (close) {
      if ((tag === 'g' || tag === 'a' || tag === 'svg') && stack.length > 1) stack.pop();
      continue;
    }
    const a = attrsOf(rest);
    const cls = (a.class ?? '').split(/\s+/).reduce((s, c) => ({ ...s, ...(classStyle[c] ?? {}) }), {} as Record<string, string>);
    const style = { ...top.style, ...cls, ...Object.fromEntries(Object.entries(a).filter(([k]) => /^(fill|stroke|stroke-width|opacity|fill-opacity|fill-rule)$/.test(k))) };
    const m = mul(top.m, parseTransform(a.transform));
    if (tag === 'g' || tag === 'a' || tag === 'svg') {
      const own = split === 'top' && top.depth === 0 ? (a.id ?? `g${order.length}`) : split === 'ids' && a.id ? a.id : null;
      if (!selfClose) stack.push({ m, style, part: own ?? top.part, depth: top.depth + 1 });
      continue;
    }
    const d = shapeD(tag, a);
    if (!d) {
      if (tag !== 'stop') skipped.push(tag);
      continue;
    }
    const fill = style.fill ?? (tag === 'line' || tag === 'polyline' ? 'none' : (o.fallbackFill ?? C.ink));
    const stroke = style.stroke && style.stroke !== 'none' ? style.stroke : undefined;
    if (fill === 'none' && !stroke) continue;
    const id = top.part ?? (a.id ?? (split === 'top' ? `p${order.length}` : `p${leaf}`));
    leaf++;
    if (!parts.has(id)) {
      parts.set(id, []);
      order.push(id);
    }
    const op = parseFloat(style.opacity ?? '1') * parseFloat(style['fill-opacity'] ?? '1');
    parts.get(id)!.push({ d, fill, stroke, strokeWidth: stroke ? parseFloat(style['stroke-width'] ?? '1') : undefined, fillRule: style['fill-rule'] === 'evenodd' ? 'evenodd' : undefined, opacity: op < 1 ? op : undefined, transform: matStr(m) });
  }
  const boxOf = (items: LogoItem[]): LogoBox => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const it of items) {
      const m = parseTransform(it.transform);
      const pad = ((it.strokeWidth ?? 0) / 2) * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
      for (const [px, py] of pathPoints(it.d)) {
        const [X, Y] = apply(m, px, py);
        x0 = Math.min(x0, X - pad);
        y0 = Math.min(y0, Y - pad);
        x1 = Math.max(x1, X + pad);
        y1 = Math.max(y1, Y + pad);
      }
    }
    return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
  };
  const out: LogoPart[] = order.map((id) => {
    const items = parts.get(id)!;
    const box = boxOf(items);
    return { id, items, box, cx: box.x + box.w / 2, cy: box.y + box.h / 2, fill: items.find((it) => it.fill !== 'none')?.fill ?? items[0].stroke ?? C.ink };
  });
  return { viewBox, scale, offset, box: boxOf(out.flatMap((p) => p.items)), parts: out, skipped };
};

/** The starter's placeholder mark as SVG text: the sample a supplied logo replaces (three parts). */
export const SAMPLE_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path id="A" d="${MARK.A.d}" fill="${C.ink}"/><rect id="B" x="${MARK.B.x}" y="${MARK.B.y}" width="${MARK.B.w}" height="${MARK.B.h}" rx="${MARK.B.r}" fill="${C.ink}"/><circle id="D" cx="${MARK.D.cx}" cy="${MARK.D.cy}" r="${MARK.D.r}" fill="${C.accent}"/></svg>`;

/**
 * A parsed logo drawn part by part, each with its own pose (mark units, origin the part's centre unless
 * set). `fill` overrides a part's colours (a one-colour lockup, a part cooling from the accent).
 */
export const LogoMark: React.FC<{
  logo: Logo;
  size: number; // px for the 100-unit box
  poses?: (PieceXf | undefined)[] | ((part: LogoPart, i: number) => PieceXf | undefined);
  fill?: (part: LogoPart, i: number) => string | undefined;
  only?: string[]; // part ids to draw
  style?: React.CSSProperties;
}> = ({ logo, size, poses, fill, only, style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible', display: 'block', ...style }}>
    {logo.parts.map((p, i) => {
      if (only && !only.includes(p.id)) return null;
      const pose = typeof poses === 'function' ? poses(p, i) : poses?.[i];
      const col = fill?.(p, i);
      return (
        <g key={p.id} transform={xf(pose, p.cx, p.cy)} opacity={pose?.o ?? 1}>
          {p.items.map((it, j) => (
            <path
              key={j}
              d={it.d}
              transform={it.transform}
              fill={it.fill === 'none' ? 'none' : (col ?? it.fill)}
              fillRule={it.fillRule}
              stroke={it.stroke ? (col ?? it.stroke) : undefined}
              strokeWidth={it.strokeWidth}
              opacity={it.opacity}
            />
          ))}
        </g>
      );
    })}
  </svg>
);
