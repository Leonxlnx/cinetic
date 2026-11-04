// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// gloss-orbit: a glossy hero object glowing in a dark space, translucent shapes drifting round it in depth, a pointer
// that comes to it and presses.
//
// A dark 3D space with a haze of the accent round the centre and a faint ring texture behind. The hero stands in the
// middle (a lathe-turned object of two bowls and a waist, or the product's mark, glazed in the accent with a hot rim on
// the side the light comes from); translucent shapes float round it at different depths (a quatrefoil, half-discs, pills,
// a rounded diamond, rounded triangles, hairline outlines), the near ones soft. The camera eases in 12 %, the shapes drift
// 2-4 px/f and spread with the push (the near ones faster), the hero's glow warms from a dim start to full heat, and a
// pointer arrives on the lower bowl and presses: the hero gives and flares. 1.8 s. Big.
//
// Numbers (1080p px, 30 fps): hero 390 px wide, rims at y 337-360 and 742-802, waist 90 px at y 547; haze radius 300 px;
// camera 1.00 -> 1.12 over f2-19 (ease out); glow dim f0-4, mid f5-23, hot from f24; pointer in at f6, press at f36
// (squash 3 f, release on a critical spring), the hero 0.97 -> 1.03 -> 1.
import React, { useId } from 'react';
import { Cursor } from '../fx/Cursor';
import { type Logo, LogoMark } from '../brand/Mark';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { markOf, paletteOf, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { bezier, hash, rgba, Stage1080 } from './stage1080';

export const GLOSS = {
  dur: 54,
  ground: '#030303',
  push: { from: 2, to: 19, s: [1, 1.12] as const },
  heat: [[0, 0.55], [4, 0.62], [5, 0.8], [23, 0.86], [24, 1], [54, 1]] as const,
  pointer: { in: 6, press: 36, from: { x: 982, y: 705 }, to: { x: 1006, y: 612 }, hover: { x: 1020, y: 584 } },
  hero: { cx: 982, top: 352, bottom: 772, rimW: 195, waist: 34, waistY: 556, from: 0.9 },
  haze: 300,
  // the shapes: kind, box (x0, y0, x1, y1 at 1080p), depth 0 (far) .. 1 (near), opacity
  shapes: [
    { kind: 'quatrefoil', box: [357, 12, 517, 162], depth: 0.35, o: 0.7 },
    { kind: 'halfdisc', box: [222, 105, 470, 560], depth: 0.2, o: 0.85 },
    { kind: 'tripill', box: [1473, 90, 1575, 165], depth: 0.45, o: 0.8 },
    { kind: 'pill', box: [500, 645, 680, 730], depth: 0.6, o: 0.8 },
    { kind: 'diamond', box: [1560, 415, 1870, 640], depth: 0.75, o: 0.75 },
    { kind: 'tri', box: [0, 693, 250, 877], depth: 0.9, o: 0.8 },
    { kind: 'bigdisc', box: [910, 760, 1370, 1180], depth: 0.1, o: 0.7 },
    { kind: 'outline', box: [1110, 440, 1480, 690], depth: 0.3, o: 0.55 },
    { kind: 'outlineTri', box: [100, 640, 350, 830], depth: 0.5, o: 0.5 },
  ] as const,
} as const;

export type GlossOrbitProps = {
  /** the hero: a lathe-turned object glazed in the accent, or the product's mark glazed the same way */
  hero?: 'lathe' | 'mark';
  logo?: Logo;
  /** the shapes' colour (a cool companion to the accent) */
  second?: string;
  palette?: Partial<Palette>;
  pointer?: boolean;
  frame?: number;
  seed?: number;
};

export const glossOrbitMeta: SceneMeta = {
  id: 'gloss-orbit',
  does: 'a glossy hero object glows in a dark space among drifting translucent shapes; a pointer arrives and presses it',
  dur: GLOSS.dur,
  props: ['hero', 'logo', 'second'],
  handIn: null,
  handOut: { form: 'mark', x: 787, y: 337, w: 390, h: 465 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'drop', id: 'gloss-cut', weight: 0.7 },
    { f: 24, kind: 'swell', id: 'gloss-heat', weight: 0.5 },
    { f: GLOSS.pointer.press, kind: 'click', id: 'gloss-press', weight: 1 },
  ],
};

/** Camera scale, heat (0..1) and the hero's press scale at scene frame t. */
export const glossState = (t: number) => {
  const G = GLOSS;
  const s = G.push.s[0] + (G.push.s[1] - G.push.s[0]) * bezier(0.25, 0.1, 0.25, 1)(span(t, G.push.from, G.push.to));
  const heat = tab(t, G.heat.map((k) => [k[0], k[1]] as const));
  const d = t - G.pointer.press;
  const press = d < 0 ? 1 : d < 3 ? 1 - 0.03 * E.snapOut(d / 3) : 1 + 0.03 * Math.exp(-(d - 3) / 4) * Math.cos((d - 3) / 3.2) - 0.03 * Math.exp(-(d - 3) / 1.2);
  const flare = d < 0 ? 0 : Math.exp(-d / 7) * Math.min(1, d / 2);
  const grow = G.hero.from + (1 - G.hero.from) * bezier(0.2, 0.7, 0.3, 1)(span(t, 0, 8)); // the hero arrives a little small
  return { s, heat, press, flare, grow };
};

/** The pointer's tip at scene frame t (it glides in, settles on the lower bowl, presses). */
export const glossPointer = (t: number) => {
  const P = GLOSS.pointer;
  if (t < P.in) return null;
  const p = bezier(0.2, 0.7, 0.3, 1)(span(t, P.in, P.in + 14));
  const settle = E.stdInOut(span(t, P.in + 14, P.press));
  const x = P.from.x + (P.to.x - P.from.x) * p + (P.hover.x - P.to.x) * settle;
  const y = P.from.y + (P.to.y - P.from.y) * p + (P.hover.y - P.to.y) * settle;
  const d = t - P.press;
  const press = d < 0 ? 0 : d < 3 ? 1 : 1 - E.glideOut(clamp((d - 3) / 6));
  return { x, y, press, o: span(t, P.in, P.in + 2) };
};

const heroPath = () => {
  const h = GLOSS.hero;
  const L = h.cx - h.rimW;
  const R = h.cx + h.rimW;
  const wl = h.cx - h.waist;
  const wr = h.cx + h.waist;
  const k = 0.552; // quarter-ellipse handles
  const cup = h.waistY - h.top;
  const dome = h.bottom - h.waistY;
  // the top bowl is a cup (the lower half of an ellipse on the top rim), the bottom one a dome on the foot
  return [
    `M ${L} ${h.top}`,
    `C ${L} ${h.top + cup * k}, ${wl - (wl - L) * k} ${h.waistY}, ${wl} ${h.waistY}`,
    `C ${wl - (wl - L) * k} ${h.waistY}, ${L + 4} ${h.bottom - dome * k}, ${L + 4} ${h.bottom}`,
    `L ${R + 4} ${h.bottom}`,
    `C ${R + 4} ${h.bottom - dome * k}, ${wr + (R - wr) * k} ${h.waistY}, ${wr} ${h.waistY}`,
    `C ${wr + (R - wr) * k} ${h.waistY}, ${R} ${h.top + cup * k}, ${R} ${h.top}`,
    'Z',
  ].join(' ');
};

export const GlossOrbit: React.FC<GlossOrbitProps> = ({ hero = 'lathe', logo, second = '#3A5AC8', palette, pointer = true, frame, seed = 3 }) => {
  const { t, W, H } = useClock(frame);
  const uid = `go${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pal = paletteOf({ ground: GLOSS.ground, ...palette });
  const G = GLOSS;
  const st = glossState(t);
  const ptr = pointer ? glossPointer(t) : null;
  const warmth = 1 - Math.min(1, Math.max(0, (st.heat - 0.55) / 0.3)); // 1 at the dim start, 0 once hot
  const base = mixColor(pal.accent, '#000000', 0.3 * warmth); // the dim start
  const hot = mixColor(base, '#FFFFFF', 0.12 + 0.18 * st.flare);
  const body = mixColor(base, '#000000', 0.45 * (1 - st.heat));
  const deep = mixColor(base, '#000000', 0.45 + 0.3 * (1 - st.heat));
  const hi = mixColor(base, '#FFFFFF', 0.72);
  const h = G.hero;
  const cx = h.cx;
  const cy = (h.top + h.bottom) / 2;
  const world = (depth: number) => 1 + (st.s - 1) * (0.4 + 1.4 * depth); // near shapes spread faster with the push
  const shapeAt = (i: number, box: readonly number[], depth: number) => {
    const ang = hash(seed, i) * Math.PI * 2;
    const v = 2 + 2 * hash(seed + 1, i); // px/f
    const dx = Math.cos(ang) * v * t;
    const dy = Math.sin(ang) * v * t;
    const k = world(depth);
    const bx = (box[0] + box[2]) / 2;
    const by = (box[1] + box[3]) / 2;
    return { x: 960 + (bx + dx - 960) * k, y: 540 + (by + dy - 540) * k, k, w: (box[2] - box[0]) * k, h: (box[3] - box[1]) * k };
  };
  const sc = (c: string, a: number) => rgba(c, a);
  const haze = mixColor(pal.accent, '#000000', 0.86);
  return (
    <Stage1080 W={W} H={H} ground={pal.ground}>
      {/* the haze and the ring texture behind */}
      <div style={{ position: 'absolute', left: 960 - 900, top: 560 - 700, width: 1800, height: 1400, borderRadius: '50%', background: `radial-gradient(closest-side, ${sc(mixColor(pal.accent, haze, 0.55), 0.55)} 0%, ${sc(haze, 0.35)} 45%, ${sc(haze, 0)} 100%)` }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`${uid}ring`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#000" stopOpacity="0.9" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${960 + (1230 - 960) * world(0.05)} ${540 + (650 - 540) * world(0.05)}) scale(${world(0.05)})`}>
          <circle r={520} fill={`url(#${uid}ring)`} />
          {Array.from({ length: 15 }, (_, i) => (
            <circle key={i} r={40 + i * 30} fill="none" stroke={sc('#000000', 0.42 - i * 0.02)} strokeWidth={12} />
          ))}
        </g>
      </svg>
      {/* the shapes, far to near (the nearest soft) */}
      {G.shapes.map((sp, i) => ({ sp, i })).sort((a, b) => a.sp.depth - b.sp.depth).map(({ sp, i }) => {
        const p = shapeAt(i, sp.box, sp.depth);
        const blur = sp.depth > 0.7 ? (sp.depth - 0.7) * 14 * st.s : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${p.x - p.w / 2}px, ${p.y - p.h / 2}px)`, width: p.w, height: p.h, opacity: sp.o, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
            <Shape kind={sp.kind} w={p.w} h={p.h} second={second} accent={pal.accent} uid={`${uid}s${i}`} />
          </div>
        );
      })}
      {/* the hero: glow, body, rims */}
      <div style={{ position: 'absolute', left: cx - G.haze * 1.6, top: cy - G.haze * 1.6, width: G.haze * 3.2, height: G.haze * 3.2, borderRadius: '50%', background: `radial-gradient(closest-side, ${sc(pal.accent, 0.42 * st.heat + 0.25 * st.flare)} 0%, ${sc(pal.accent, 0.12 * st.heat)} 50%, ${sc(pal.accent, 0)} 100%)`, transform: `scale(${st.s})` }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}body`} x1="0" y1="0" x2="1" y2="0.25">
            <stop offset="0" stopColor={hi} />
            <stop offset="0.28" stopColor={mixColor(body, hi, 0.35)} />
            <stop offset="0.62" stopColor={body} />
            <stop offset="0.9" stopColor={hot} />
            <stop offset="1" stopColor={mixColor(hot, '#FFFFFF', 0.5)} />
          </linearGradient>
          <linearGradient id={`${uid}shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={deep} stopOpacity="0.55" />
            <stop offset="0.45" stopColor={deep} stopOpacity="0" />
            <stop offset="0.55" stopColor={deep} stopOpacity="0" />
            <stop offset="1" stopColor={mixColor(pal.accent, '#FFFFFF', 0.08)} stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id={`${uid}spec`} cx="0.3" cy="0.3" r="0.5">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${960} ${540}) scale(${st.s * st.press * st.grow}) translate(${-960} ${-540})`}>
          {hero === 'mark' ? (
            <g transform={`translate(${cx - 230} ${cy - 230})`}>
              <LogoMark logo={markOf(logo)} size={460} fill={() => `url(#${uid}body)`} />
            </g>
          ) : (
            <>
              <path d={heroPath()} fill={`url(#${uid}body)`} />
              <path d={heroPath()} fill={`url(#${uid}shade)`} />
              <ellipse cx={cx - 60} cy={h.top + 90} rx={70} ry={60} fill={`url(#${uid}spec)`} />
              <ellipse cx={cx - 50} cy={h.bottom - 110} rx={80} ry={70} fill={`url(#${uid}spec)`} opacity={0.7} />
              {/* the rims: a flat ellipse on top (its far lip dark), a thicker one at the foot */}
              <ellipse cx={cx} cy={h.top} rx={h.rimW} ry={12} fill={mixColor(deep, pal.accent, 0.3)} />
              <ellipse cx={cx} cy={h.top - 1} rx={h.rimW - 3} ry={8} fill="none" stroke={rgba(hot, 0.9)} strokeWidth={2} />
              <ellipse cx={cx + 6} cy={h.bottom} rx={h.rimW} ry={30} fill={mixColor(pal.accent, '#FFFFFF', 0.1 + 0.15 * st.heat)} />
              <path d={`M ${cx + h.rimW - 1} ${h.top + 2} C ${cx + h.rimW - 1} ${h.top + 110}, ${cx + h.waist + 50} ${h.waistY}, ${cx + h.waist + 1} ${h.waistY}`} fill="none" stroke={rgba('#FFFFFF', 0.9)} strokeWidth={4} />
              <path d={`M ${cx + h.waist + 1} ${h.waistY} C ${cx + h.waist + 50} ${h.waistY}, ${cx + h.rimW + 3} ${h.bottom - 124}, ${cx + h.rimW + 3} ${h.bottom - 6}`} fill="none" stroke={rgba(hot, 0.85)} strokeWidth={3} />
            </>
          )}
        </g>
      </svg>
      {ptr && <Cursor x={ptr.x} y={ptr.y} scale={2.9} press={ptr.press} opacity={ptr.o} fill="#111111" outline="#FFFFFF" />}
    </Stage1080>
  );
};

const Shape: React.FC<{ kind: string; w: number; h: number; second: string; accent: string; uid: string }> = ({ kind, w, h, second, accent, uid }) => {
  const edge = mixColor(second, accent, 0.55);
  const fillG = (
    <defs>
      <linearGradient id={`${uid}g`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor={mixColor(second, '#FFFFFF', 0.08)} stopOpacity="0.95" />
        <stop offset="1" stopColor={mixColor(second, '#000000', 0.45)} stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={second} stopOpacity="0.9" />
        <stop offset="1" stopColor={second} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${uid}e`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={edge} stopOpacity="0.9" />
        <stop offset="0.5" stopColor={second} stopOpacity="0.5" />
        <stop offset="1" stopColor={mixColor(second, '#000', 0.5)} stopOpacity="0.7" />
      </linearGradient>
    </defs>
  );
  const r = Math.min(w, h);
  let el: React.ReactNode = null;
  if (kind === 'quatrefoil') {
    const q = r / 4;
    el = (
      <g fill={`url(#${uid}g)`}>
        <circle cx={w / 2} cy={q} r={q * 1.05} />
        <circle cx={w / 2} cy={h - q} r={q * 1.05} />
        <circle cx={q} cy={h / 2} r={q * 1.05} />
        <circle cx={w - q} cy={h / 2} r={q * 1.05} />
        <rect x={q} y={q} width={w - 2 * q} height={h - 2 * q} />
      </g>
    );
  } else if (kind === 'halfdisc' || kind === 'bigdisc') {
    el = <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${uid}f)`} transform={kind === 'bigdisc' ? `rotate(-60 ${w / 2} ${h / 2})` : undefined} />;
  } else if (kind === 'pill') {
    el = <rect x={0} y={0} width={w} height={h} rx={h / 2} fill={`url(#${uid}e)`} />;
  } else if (kind === 'tripill' || kind === 'tri' || kind === 'diamond') {
    const rr = r * (kind === 'diamond' ? 0.18 : 0.22);
    const pts = kind === 'diamond' ? [[0.1, 0.5], [0.45, 0.02], [0.98, 0.25], [0.6, 0.98]] : kind === 'tri' ? [[0.02, 0.98], [0.32, 0.05], [0.98, 0.98]] : [[0.02, 0.1], [0.98, 0.2], [0.35, 0.95]];
    el = <path d={roundPoly(pts.map(([a, b]) => [a * w, b * h]), rr)} fill={`url(#${uid}e)`} stroke={rgba(mixColor(accent, '#FFFFFF', 0.4), 0.35)} strokeWidth={2} />;
  } else if (kind === 'outline') {
    el = <path d={`M 10 ${h - 10} L ${w * 0.38} ${h * 0.2} L ${w * 0.5} ${h * 0.55} L ${w * 0.75} ${h * 0.15} L ${w - 10} ${h * 0.6}`} fill="none" stroke={rgba(mixColor(second, '#FFFFFF', 0.2), 0.55)} strokeWidth={2} strokeLinejoin="round" />;
  } else if (kind === 'outlineTri') {
    el = <path d={roundPoly([[10, h - 10], [w * 0.45, 10], [w - 10, h - 10]], r * 0.12)} fill="none" stroke={rgba(mixColor(second, '#FFFFFF', 0.2), 0.5)} strokeWidth={2} />;
  }
  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {fillG}
      {el}
    </svg>
  );
};

/** A polygon with rounded corners (radius rr) as an SVG path. */
const roundPoly = (pts: number[][], rr: number) => {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]];
    const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(v1[0], v1[1]);
    const l2 = Math.hypot(v2[0], v2[1]);
    const r = Math.min(rr, l1 / 2, l2 / 2);
    const a = [p1[0] + (v1[0] / l1) * r, p1[1] + (v1[1] / l1) * r];
    const b = [p1[0] + (v2[0] / l2) * r, p1[1] + (v2[1] / l2) * r];
    d += `${i === 0 ? 'M' : 'L'} ${a[0]} ${a[1]} Q ${p1[0]} ${p1[1]} ${b[0]} ${b[1]} `;
  }
  return `${d}Z`;
};
