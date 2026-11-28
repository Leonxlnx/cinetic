// LinkPanel (ui, build): sources stand in a column, the panel rises with its rows waiting; a bracket connector joins
// each source to its row, light pulses run along them, each row lights in the accent as its first pulse arrives, its
// figures land and it settles to the surface; the totals row counts up in steps.
// Numbers: sources drop in with blur on an exponential arrival (half-life 2 f: half-way in 2 f, a soft tail); the panel rises from +2 f; each connector comes in whole (node to row, a
// port at each end) over 6 f, 2 f apart, from +8 f, and follows the panel while it settles: no end ever hangs in the
// air; pulses run source to row in 12 f (linear), 3 f apart, every 24 f, from +10 f; rows light as their first pulse
// arrives (+22 f, 3 f apart), lit 6 f, settling over 10 f; totals step every 3 f; lines 0.14 % of the frame height.
// Caution: three to five sources with real titles and figures; the totals must be the sum the rows suggest.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { approach, at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { type Look, MarkSlot, Pill, surfaceStyle, useUiFrame, withPace } from './_shared';

export type LinkSource = {
  title: string;
  /** A node drawn as the source's picture (a <Photo>, a thumbnail); default a tinted tile with `icon`. */
  thumb?: React.ReactNode;
  icon?: string;
  color?: string;
  /** The chip on its line, and the panel row's cells. */
  chip: string;
  row: { label: string; value: string; meta: string };
};

export type LinkTotal = { label: string; from: number; step: number; steps: number; prefix?: string; suffix?: string; decimals?: number };

const LinkPanelInner: React.FC<{
  L: Look;
  sources: LinkSource[];
  totals: LinkTotal[];
  at: number;
  title?: string;
  sub?: string;
  mark?: React.ReactNode;
  /** The column of sources and the panel, as shares of the frame. */
  srcX?: number;
  panelX?: number;
  panelW?: number;
  size?: number;
  speed?: number;
}> = ({ L, sources, totals, at: start, title = 'Tracked links', sub, mark, srcX = 0.15, panelX = 0.66, panelW = 0.46, size: sizeIn, speed = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const frame = start + (useUiFrame() - start) * speed;
  const s = sizeIn ?? Math.min(W, H) * 0.021;
  const n = sources.length;
  const cardW = W * 0.15;
  const cardH = Math.min(W, H) * 0.15;
  const gapY = Math.min(W, H) * 0.035;
  const colH = n * cardH + (n - 1) * gapY;
  const col0 = H / 2 - colH / 2;
  const cy = (i: number) => col0 + i * (cardH + gapY) + cardH / 2;
  const sx = srcX * W;
  const pw = panelW * W;
  const rowH = s * 2.7;
  const headH = s * 3.2;
  const totH = s * 4.4;
  const ph = headH + n * rowH + s * 0.9 + totH;
  const px0 = panelX * W - pw / 2;
  const py0 = H / 2 - ph / 2;
  const trunkX = mix(0.55, sx + cardW / 2, px0);
  const enterP = springAt(frame, 30, start + 2, springs.ui);
  const panelDy = mix(enterP, 24, 0);
  // the connector ends on the row's left edge (the row is inset s * 0.6 in the panel), at the row's middle
  const rowTop = (i: number) => headH + s * 0.35 + i * rowH;
  const rowMidH = rowH - s * 0.3;
  const entryY = (i: number) => py0 + panelDy + rowTop(i) + rowMidH / 2;
  const endX = px0 + s * 0.6;
  const r = Math.min(W, H) * 0.012;
  const lw = Math.max(1.5, Math.min(W, H) * 0.0014);
  // the path of source i: right to the trunk, along it to its row's height, right into the panel
  const pts = (i: number): Array<[number, number]> => [
    [sx + cardW / 2, cy(i)],
    [trunkX, cy(i)],
    [trunkX, entryY(i)],
    [endX, entryY(i)],
  ];
  const pathD = (i: number) => {
    const [a, b, c, d] = pts(i);
    const dir = Math.sign(c[1] - b[1]);
    if (Math.abs(c[1] - b[1]) < r * 2) return `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} L${d[0]} ${d[1]}`;
    return `M${a[0]} ${a[1]} L${b[0] - r} ${b[1]} Q${b[0]} ${b[1]} ${b[0]} ${b[1] + dir * r} L${c[0]} ${c[1] - dir * r} Q${c[0]} ${c[1]} ${c[0] + r} ${c[1]} L${d[0]} ${d[1]}`;
  };
  const along = (i: number, p: number) => {
    const P = pts(i);
    const segs = P.slice(1).map((q, k) => Math.hypot(q[0] - P[k][0], q[1] - P[k][1]));
    const len = segs.reduce((a, b) => a + b, 0);
    let d = p * len;
    for (let k = 0; k < segs.length; k++) {
      if (d <= segs[k] || k === segs.length - 1) {
        const t = segs[k] ? clamp(d / segs[k]) : 0;
        return [mix(t, P[k][0], P[k + 1][0]), mix(t, P[k][1], P[k + 1][1])];
      }
      d -= segs[k];
    }
    return P[P.length - 1];
  };
  const lineC = L.dark ? 'rgba(255,255,255,0.22)' : 'rgba(17,19,24,0.2)';
  const glow = L.accent;
  const rowAt = (i: number) => start + 22 + i * 3; // as the first pulse along its line arrives
  const totalsAt = rowAt(n - 1) + 12;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, fontFamily: L.font }}>
      {/* sources */}
      {sources.map((src, i) => {
        // each source enters already moving (from above, blurred) and lands on an exponential tail
        const q = approach(frame, start + i * 1 - 1, 2);
        return (
          <div key={`s${i}`} style={{ ...surfaceStyle(L, 3, cardH * 0.1), position: 'absolute', left: 0, top: 0, transform: `translate(${sx - cardW / 2}px, ${cy(i) - cardH / 2 - mix(q, H * 0.08, 0)}px)`, width: cardW, height: cardH, overflow: 'hidden', opacity: clamp(q * 2), filter: q < 0.97 ? `blur(${mix(q, 8, 0)}px)` : undefined }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: cardH * 0.64, background: mixColor(L.surface, src.color ?? L.accent, 0.5), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {src.thumb ?? <Icon name={src.icon ?? 'Play'} size={cardH * 0.26} color="#FFFFFF" stroke={2.2} />}
            </div>
            <div style={{ position: 'absolute', left: s * 0.55, right: s * 0.55, bottom: 0, height: cardH * 0.36, display: 'flex', alignItems: 'center', fontSize: s * 0.84, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{src.title}</div>
          </div>
        );
      })}
      {/* the panel */}
      <div style={{ ...surfaceStyle(L, 5, s * 1.05), position: 'absolute', left: px0, top: py0, width: pw, height: ph, opacity: clamp(enterP * 2), transform: `translateY(${mix(enterP, 24, 0)}px)` }}>
        <div style={{ position: 'absolute', left: s * 1.1, right: s * 1.1, top: 0, height: headH, display: 'flex', alignItems: 'center', gap: s * 0.55, borderBottom: `1px solid ${L.line}` }}>
          <MarkSlot mark={mark} icon="Link" colors={['#5B86FF', '#2350E6']} size={s * 1.5} />
          <div style={{ fontSize: s * 1.02, fontWeight: 640, color: L.ink }}>{title}</div>
          <div style={{ fontSize: s * 0.82, color: L.muted }}>{sub ?? `${n} active`}</div>
          <div style={{ flex: 1 }} />
          <Pill L={L} label="Live" icon="Radio" color={L.accent} size={s * 0.66} />
        </div>
        {sources.map((src, i) => {
          // the row waits in the panel (its picture and name, its figures as blank bars) and lands when its pulse arrives
          const t0 = rowAt(i);
          const q = at(frame, t0, 3, ease.out);
          const lit = frame < t0 ? 0 : 1 - at(frame, t0 + 6, 10, ease.out);
          const wait = mixColor(L.ink, L.surface, 0.45);
          const blank = L.dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,19,24,0.07)';
          return (
            <div key={`r${i}`} style={{ position: 'absolute', left: s * 0.6, right: s * 0.6, top: rowTop(i), height: rowMidH, borderRadius: s * 0.5, background: mixColor(L.dark ? mixColor(L.surface, '#FFFFFF', 0.03) : '#F7F8FA', L.accent, lit * 0.9), display: 'flex', alignItems: 'center', gap: s * 0.6, padding: `0 ${s * 0.6}px`, boxSizing: 'border-box', fontSize: s * 0.86, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ width: s * 2.2, height: s * 1.5, borderRadius: s * 0.28, overflow: 'hidden', background: mixColor(L.surface, src.color ?? L.accent, 0.55), flexShrink: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0.08)', opacity: mix(q, 0.55, 1) }}>{src.thumb}</div>
              <div style={{ flex: 1, color: mixColor(mixColor(wait, L.ink, q), '#FFFFFF', lit), fontWeight: 560, overflow: 'hidden', textOverflow: 'ellipsis' }}>{src.row.label}</div>
              <div style={{ position: 'relative', color: lit > 0.5 ? '#FFFFFF' : L.muted }}>
                <span style={{ opacity: q }}>{src.row.meta}</span>
                <span style={{ position: 'absolute', right: 0, top: '50%', width: s * 3, height: s * 0.5, marginTop: -s * 0.25, borderRadius: s * 0.25, background: blank, opacity: 1 - q }} />
              </div>
              <div style={{ position: 'relative', width: s * 4.2, textAlign: 'right', color: mixColor(L.ink, '#FFFFFF', lit), fontWeight: 620 }}>
                <span style={{ opacity: q }}>{src.row.value}</span>
                <span style={{ position: 'absolute', right: 0, top: '50%', width: s * 2.4, height: s * 0.5, marginTop: -s * 0.25, borderRadius: s * 0.25, background: blank, opacity: 1 - q }} />
              </div>
            </div>
          );
        })}
        {/* totals */}
        <div style={{ position: 'absolute', left: s * 1.1, right: s * 1.1, bottom: 0, height: totH, borderTop: `1px solid ${L.line}`, display: 'flex', alignItems: 'center', opacity: at(frame, totalsAt - 6, 6, ease.out) }}>
          {totals.map((t, k) => {
            const stepN = Math.min(t.steps, Math.max(0, Math.floor((frame - totalsAt) / 3)));
            const v = t.from + stepN * t.step;
            const txt = (t.prefix ?? '') + v.toLocaleString('en-US', { minimumFractionDigits: t.decimals ?? 0, maximumFractionDigits: t.decimals ?? 0 }) + (t.suffix ?? '');
            return (
              <div key={k} style={{ flex: 1 }}>
                <div style={{ fontSize: s * 0.82, color: L.muted }}>{t.label}</div>
                <div style={{ fontSize: s * 1.45, fontWeight: 620, color: k === totals.length - 1 ? L.accent : L.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: s * 0.1 }}>{txt}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* connectors and pulses, over the panel's edge so each ends on its row */}
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {sources.map((_, i) => {
          const d = at(frame, start + 8 + i * 2, 6, ease.out);
          if (d <= 0) return null;
          const P = pts(i);
          return (
            <g key={i} opacity={d}>
              <path d={pathD(i)} fill="none" stroke={lineC} strokeWidth={lw} strokeLinejoin="round" />
              <circle cx={P[0][0]} cy={P[0][1]} r={lw * 2.2} fill={L.surface} stroke={lineC} strokeWidth={lw} />
              <circle cx={P[3][0]} cy={P[3][1]} r={lw * 2.2} fill={frame >= rowAt(i) ? L.accent : lineC} />
            </g>
          );
        })}
        {sources.map((_, i) => {
          const runs: React.ReactNode[] = [];
          for (let k = 0; k < 6; k++) {
            const t0 = start + 10 + i * 3 + k * 24;
            const p = (frame - t0) / 12;
            if (p < 0 || p > 1) continue;
            const [hx, hy] = along(i, p);
            const [tx, ty] = along(i, Math.max(0, p - 0.09));
            runs.push(
              <g key={k} opacity={p > 0.92 ? (1 - p) / 0.08 : 1}>
                <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={glow} strokeWidth={lw * 5} strokeLinecap="round" opacity={0.25} style={{ filter: `blur(${lw * 2.5}px)` }} />
                <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={mixColor(glow, '#FFFFFF', 0.35)} strokeWidth={lw * 1.8} strokeLinecap="round" />
              </g>,
            );
          }
          return <g key={`p${i}`}>{runs}</g>;
        })}
      </svg>
      {/* chips on the lines */}
      {sources.map((src, i) => {
        const q = at(frame, start + 9 + i * 2, 4, ease.snap);
        if (q <= 0) return null;
        const mx = mix(0.5, sx + cardW / 2, trunkX);
        return (
          <div key={`c${i}`} style={{ position: 'absolute', left: mx, top: cy(i), transform: `translate(-50%, -50%) scale(${mix(q, 0.7, 1)})`, opacity: clamp(q * 2) }}>
            <Pill L={L} label={src.chip} size={s * 0.8} style={{ background: L.surface, color: L.ink, border: `1px solid ${L.line}`, fontWeight: 560 }} />
          </div>
        );
      })}
    </div>
  );
};

export const LinkPanel = withPace(LinkPanelInner);
