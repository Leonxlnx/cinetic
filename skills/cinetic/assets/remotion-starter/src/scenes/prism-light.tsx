// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// prism-light: a dot pulls out a line, the line turns in space and splits into a triangle, the triangle becomes a wire
// pyramid that rushes at the camera and fills with glass light, holds frame-filling, then rolls and flies through its
// bright face into white.
//
// On black. A white disc shrinks and drifts right; a line is drawn out of it to the left (thick, thinning to a hairline)
// and ends in a second dot; the segment turns in 3D (the nearer dot larger), a third dot splits off, the three are joined,
// the dots shrink away and leave the wire; the square pyramid turns until its apex swings free, then comes at the lens in
// nine frames while its faces fill one by one: the front face a flat grey with a warm caustic growing inside it, the far
// face dark with a caustic band (a mint-white core, the warm light on one side, a red fringe on the other), the side face
// pale along one edge with a spectral fan (mint, teal, lavender, plum). The colours are painted in each face's own
// coordinates, so they travel with the glass. It holds and breathes, then rolls, and the camera passes through the pale
// face into a pearly white. 2.8 s. Big.
//
// Numbers (1080p px, measured at 24 fps): every vertex and dot below is the measured table (per 24 fps frame), played on a
// shortened clock: the turn of the segment three times as fast, the hold 12 frames. Lines 2 px, the drawn-out line
// 5 -> 8 -> 2 px; caustic hot spot r 90 -> 140 -> 170 px; faces back to front CDG, CFD, CGA, CAF (CAF adds light where it
// overlaps CGA).
import React, { useId } from 'react';
import { E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, useClock } from './parts';
import { rgba, Stage1080 } from './stage1080';

type P2 = readonly [number, number];
type Dot = readonly [number, number, number]; // x, y, diameter

/** Scene clock (24 fps frames, u) -> the measured frame: [u, frame] keys, linear between. */
export const PRISM_CLOCK = [[0, 23], [2, 25], [6, 29], [12, 47], [39, 74], [51, 86], [51.001, 111], [67, 127]] as const;

export const PRISM = {
  dur: 84,
  disc: { 21: [254.1, 960, 539.5], 22: [219.8, 960, 539.5], 23: [152.5, 961.7, 539.6], 24: [96.6, 970.4, 540.3], 25: [67.2, 988.6, 542.6] } as Record<number, readonly [number, number, number]>,
  // the drawn-out line f25-28: left end, right end (D), thickness, D diameter, F diameter
  pull: { 25: [[930, 540], [955, 542], 2, 60, 0], 26: [[900, 532], [1015, 548], 5, 49, 0], 27: [[871, 520], [1040, 557], 8, 20, 0], 28: [[849, 505], [1066, 566], 6, 22, 12] } as Record<number, readonly [P2, P2, number, number, number]>,
  // dots D, F, G per frame f29-56 (diameter 0: gone)
  dots: {
    29: [[1072.3, 585.6, 26.7], [843.3, 492.0, 17.5]], 30: [[1077.5, 602.6, 24.6], [837.8, 474.4, 20.6]], 31: [[1077.9, 619.9, 23.7], [837.5, 456.7, 23.0]],
    32: [[1074.3, 636.3, 23.9], [841.2, 440.0, 25.0]], 33: [[1067.8, 650.7, 23.9], [847.8, 424.8, 26.2]], 34: [[1059.3, 663.4, 23.9], [856.8, 411.8, 27.3]],
    35: [[1049.5, 674.2, 23.9], [866.8, 400.7, 28.1]], 36: [[1038.5, 682.9, 23.9], [878.1, 391.7, 28.8]], 37: [[1027.1, 689.8, 23.7], [889.9, 384.9, 29.1]],
    38: [[1015.4, 694.8, 23.9], [902.0, 379.5, 29.5]], 39: [[1003.8, 698.5, 23.9], [914.0, 375.7, 29.7]], 40: [[992.3, 701.3, 23.9], [925.7, 372.9, 29.6]],
    41: [[981.1, 703.1, 23.9], [937.2, 370.9, 29.3]], 42: [[970.2, 704.2, 23.9], [948.5, 369.8, 28.3]], 43: [[959.5, 704.5, 23.9], [959.5, 369.5, 26.7]],
    44: [[948.2, 703.5, 23.9], [971.1, 369.9, 25.3]], 45: [[935.3, 700.4, 23.9], [984.5, 371.2, 24.2]], 46: [[925.6, 698.0, 30.3], [1000.3, 374.4, 23.9]],
    47: [[913.7, 692.2, 33.8], [1018.4, 379.7, 23.9]], 48: [[915.3, 699.6, 24.0], [1039.6, 388.4, 23.6], [889.1, 668.3, 23.7]],
    49: [[910.4, 699.9, 23.8], [1064.1, 402.2, 23.2], [872.9, 645.9, 23.4]], 50: [[906.0, 702.0, 23.6], [1090.7, 422.4, 22.5], [858.7, 614.3, 23.0]],
    51: [[899.5, 704.9, 23.5], [1115.8, 449.0, 21.6], [849.3, 572.9, 21.9]], 52: [[887.5, 705.8, 22.7], [1135.5, 480.3, 20.2], [849.1, 524.6, 20.5]],
    53: [[870.2, 702.1, 21.9], [1147.8, 514.5, 17.6], [859.7, 478.0, 18.1]], 54: [[850.6, 693.9, 20.1], [1152.5, 548.5, 12.1], [878.8, 441.4, 13.8]],
    55: [[832.9, 683.0, 16.9], [1154.5, 579.2, 0], [901.0, 417.0, 6.5]], 56: [[818.4, 672.3, 7.6], [1146, 602, 0], [921, 401, 0]],
  } as Record<number, readonly Dot[]>,
  // the pyramid's vertices A, C, D, F, G per frame f56-123 (null: hidden behind a face)
  verts: {
    56: [null, null, [818, 672], [1146, 602], [921, 401]], 57: [null, null, [809, 664], [1141, 617], [935, 394]], 58: [null, null, [804, 656], [1138, 628], [945, 391]],
    59: [[953, 371], null, [802, 651], [1131, 638], [943, 390]], 60: [[975, 380], null, [810, 650], [1127, 645], [932, 389]], 61: [[1003, 384], null, [817, 650], [1119, 646], [919, 388]],
    62: [[1030, 383], null, [828, 654], [1116, 651], [899, 385]], 63: [[1061, 377], null, [838, 662], [1110, 653], [875, 382]], 64: [[1104, 371], [1100, 664], [853, 673], [1105, 662], [842, 379]],
    65: [[1126, 361], [1077, 676], [865, 687], [1113, 673], [825, 368]], 66: [[1145, 342], [1028, 698], [876, 705], [1130, 690], [811, 353]], 67: [[1172, 314], [958, 728], [879, 717], [1156, 711], [787, 324]],
    68: [[1212, 273], [851, 770], [881, 734], [1193, 744], [754, 284]], 69: [[1265, 212], [685, 829], [1000, 700], [1242, 789], [708, 227]], 70: [[1124, 159], [534, 850], [1120, 640], [1348, 902], [681, 113]],
    71: [[905, 141], [401, 838], [1230, 570], [1446, 1014], [683, 18]], 72: [[701, 164], [330, 800], [1320, 505], [1493, 1078], [714, -23]], 73: [[518, 180], [251, 769], [1413, 430], [1511, 1127], [717, -55]],
    74: [[391, 194], [206, 747], [1503, 373], [1544, 1170], [734, -76]], 75: [[339, 201], [210, 724], [1545, 340], [1511, 1186], [764, -91]], 76: [[310, 205], [224, 704], [1570, 315], [1468, 1197], [790, -96]],
    77: [[286, 208], [235, 689], [1592, 296], [1434, 1205], [811, -102]], 78: [[267, 212], [244, 676], [1610, 279], [1407, 1211], [829, -106]], 79: [[251, 215], [252, 665], [1624, 266], [1382, 1216], [843, -112]],
    80: [[237, 217], [258, 656], [1636, 255], [1362, 1220], [859, -115]], 81: [[225, 218], [263, 648], [1648, 244], [1347, 1224], [868, -117]], 82: [[216, 220], [268, 641], [1656, 236], [1332, 1228], [877, -120]],
    83: [[207, 221], [272, 635], [1665, 229], [1319, 1231], [888, -124]], 84: [[199, 222], [276, 631], [1671, 222], [1310, 1233], [894, -126]], 85: [[193, 223], [278, 626], [1678, 216], [1300, 1236], [896, -126]],
    86: [[188, 225], [282, 622], [1682, 213], [1294, 1239], [906, -129]],
    111: [[185, 227], [287, 620], [1684, 208], [1285, 1247], [906, -125]], 112: [[189, 227], [287, 623], [1680, 211], [1287, 1245], [903, -123]], 113: [[194, 227], [286, 627], [1675, 215], [1295, 1245], [901, -125]],
    114: [[202, 226], [284, 632], [1669, 221], [1303, 1245], [891, -120]], 115: [[212, 226], [282, 639], [1660, 227], [1314, 1245], [883, -117]], 116: [[224, 224], [278, 647], [1649, 236], [1327, 1244], [874, -113]],
    117: [[239, 223], [276, 657], [1635, 248], [1346, 1244], [858, -106]], 118: [[260, 223], [271, 670], [1616, 261], [1371, 1244], [842, -100]], 119: [[285, 222], [266, 687], [1594, 280], [1398, 1242], [820, -91]],
    120: [[316, 220], [260, 708], [1565, 302], [1437, 1242], [794, -82]], 121: [[352, 217], [251, 734], [1531, 329], [1479, 1242], [761, -68]], 122: [[382, 185], [247, 791], [1476, 394], [1555, 1266], [697, -66]],
    123: [[474, 106], [282, 902], [1339, 502], [1699, 1407], [594, -104]], 124: [[560, 30], [396, 1034], [1200, 610], [1845, 1569], [480, -150]],
  } as Record<number, readonly (P2 | null)[]>,
  // the caustic hot spot inside the front face while it fills (f69-72): centre, radius, colour
  hot: { 69: [1015, 783, 50, '#8A8A8A'], 70: [1071, 810, 90, '#D9DBDC'], 71: [1113, 837, 140, '#E9EBEC'], 72: [1204, 856, 170, '#EDEFF0'] } as Record<number, readonly [number, number, number, string]>,
  white: '#DCDCD7',
} as const;

export type PrismLightProps = {
  /** the warm light inside the glass (the caustic's amber side); the spectral bands stay physical */
  light?: string;
  palette?: Partial<Palette>;
  /** 'fly': rolls and flies through the pale face into white (hands on a white world); 'hold': ends on the glass */
  exit?: 'fly' | 'hold';
  frame?: number;
};

export const prismLightMeta: SceneMeta = {
  id: 'prism-light',
  does: 'a dot pulls a line that turns into a triangle and a wire pyramid; it rushes at the camera, fills with glass light and is flown through',
  dur: PRISM.dur,
  props: ['light'],
  handIn: { form: 'button', x: 960 - 76, y: 540 - 76, w: 152, h: 152, r: 76 },
  handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 },
  klass: 'big',
  cues: [
    { f: 3, kind: 'whoosh', id: 'prism-line', weight: 0.4 },
    { f: 15, kind: 'tick', id: 'prism-triangle', weight: 0.5 },
    { f: 44, kind: 'whoosh', id: 'prism-rush', weight: 0.9 },
    { f: 50, kind: 'swell', id: 'prism-glass', weight: 0.7 },
    { f: 76, kind: 'whoosh', id: 'prism-fly', weight: 0.8 },
  ],
};

/** The measured frame (24 fps, fractional) at scene frame t. */
export const prismFrame = (t: number) => {
  const u = (t * 24) / 30;
  const k = PRISM_CLOCK;
  if (u <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (u - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][1];
};

/** Linear between the two measured frames around f (a table keyed by whole frames). */
const between = <T,>(tab: Record<number, T>, f: number, mixFn: (a: T, b: T, p: number) => T): T | null => {
  const a = Math.floor(f);
  const b = a + 1;
  const ta = tab[a];
  const tb = tab[b];
  if (ta !== undefined && tb !== undefined) return mixFn(ta, tb, f - a);
  return ta ?? tb ?? null;
};
const mixP = (a: P2 | null, b: P2 | null, p: number): P2 | null => (a && b ? [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p] : (a ?? b));
const mixVerts = (a: readonly (P2 | null)[], b: readonly (P2 | null)[], p: number) => a.map((v, i) => mixP(v, b[i], p));
const mixDots = (a: readonly Dot[], b: readonly Dot[], p: number): Dot[] =>
  b.map((d, i) => {
    const s = a[i];
    if (!s) return d;
    return [s[0] + (d[0] - s[0]) * p, s[1] + (d[1] - s[1]) * p, s[2] + (d[2] - s[2]) * p] as const;
  });

/** Where segment p-q crosses the line a-b (as a share of p-q), or null. */
const cross = (p: P2, q: P2, a: P2, b: P2) => {
  const d = (q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0]);
  if (Math.abs(d) < 1e-9) return null;
  const s = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / d;
  return s > 0 && s < 1 ? s : null;
};

export const PrismLight: React.FC<PrismLightProps> = ({ light, palette, exit = 'fly', frame }) => {
  const { t, W, H } = useClock(frame);
  const uid = `pl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pal = paletteOf({ ground: '#000000', ...palette });
  const warm = light ?? pal.accent;
  const rust = mixColor(warm, '#000000', 0.45);
  const peach = mixColor(warm, '#FFFFFF', 0.55);
  const f = exit === 'hold' ? Math.min(prismFrame(t), 86) : prismFrame(t);
  const edge = '#E8EEE9';
  const wire = '#D9D9D9';
  let body: React.ReactNode = null;
  let wash = 0;

  if (f < 25) {
    // the disc shrinking and drifting right
    const d = between(PRISM.disc, f, (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p] as const) ?? PRISM.disc[25];
    body = <circle cx={d[1]} cy={d[2]} r={d[0] / 2} fill="#FFFFFF" />;
  } else if (f < 29) {
    const fi = Math.min(28, Math.floor(f));
    const [l, r, th, dd, fd] = PRISM.pull[fi];
    body = (
      <>
        <line x1={l[0]} y1={l[1]} x2={r[0]} y2={r[1]} stroke="#FFFFFF" strokeWidth={th} strokeLinecap="round" />
        <circle cx={r[0]} cy={r[1]} r={dd / 2} fill="#FFFFFF" />
        {fd > 0 && <circle cx={l[0]} cy={l[1]} r={fd / 2} fill="#FFFFFF" />}
      </>
    );
  } else if (f < 56) {
    const dots = between(PRISM.dots, f, mixDots) ?? [];
    const th = f < 30 ? 4.7 : f < 31 ? 3.4 : f < 32 ? 2.9 : f < 33 ? 2.5 : f < 40 ? 2.3 : 2;
    const pts = dots.map((d) => [d[0], d[1]] as P2);
    body = (
      <>
        {pts.length >= 2 && <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]} stroke="#FFFFFF" strokeWidth={th} />}
        {pts.length >= 3 && (
          <>
            <line x1={pts[1][0]} y1={pts[1][1]} x2={pts[2][0]} y2={pts[2][1]} stroke="#FFFFFF" strokeWidth={2} />
            <line x1={pts[2][0]} y1={pts[2][1]} x2={pts[0][0]} y2={pts[0][1]} stroke="#FFFFFF" strokeWidth={2} />
          </>
        )}
        {dots.map((d, i) => (d[2] > 0.5 ? <circle key={i} cx={d[0]} cy={d[1]} r={d[2] / 2} fill="#FFFFFF" /> : null))}
      </>
    );
  } else {
    const fv = Math.min(f, 124);
    const vs = between(PRISM.verts, fv, mixVerts) ?? PRISM.verts[86];
    let [A, C, D, F, G] = vs;
    if (!C && D && F) C = [F[0] + (D[0] - F[0]) * 0.06, F[1] + (D[1] - F[1]) * 0.06]; // still on edge D-F near F
    if (!A && G) A = G;
    const fill = f >= 65;
    const L = (p: P2 | null, q: P2 | null, w = 2, c = wire, key = '') => (p && q ? <line key={key} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={c} strokeWidth={w} strokeLinecap="round" /> : null);
    if (!fill) {
      body = (
        <>
          {f < 59 ? (
            <>
              {L(F, D, 2, wire, 'fd')}
              {L(D, G, 2, wire, 'dg')}
              {L(G, F, 2, wire, 'gf')}
            </>
          ) : (
            <>
              {L(A, G, 2, wire, 'ag')}
              {L(A, F, 2, wire, 'af')}
              {L(D, G, 2, wire, 'dg')}
              {L(D, F, 2, wire, 'df')}
              {L(G, C, 2, wire, 'gc')}
            </>
          )}
        </>
      );
    } else if (A && C && D && F && G) {
      // the glass: faces painted in their own coordinates (unit triangle (0,0) P0, (1,0) P1, (0,1) P2)
      const mtx = (p0: P2, p1: P2, p2: P2) => `matrix(${p1[0] - p0[0]} ${p1[1] - p0[1]} ${p2[0] - p0[0]} ${p2[1] - p0[1]} ${p0[0]} ${p0[1]})`;
      const tri = 'M 0 0 L 1 0 L 0 1 Z';
      const glass = f >= 73.5 ? 1 : f >= 72 ? E.snapOut((f - 72) / 1.5) : 0;
      const cfd = f >= 72 ? E.snapOut(Math.min(1, (f - 71.5) / 1.5)) : 0;
      const cga = f >= 73 ? E.snapOut(Math.min(1, (f - 72.5) / 1)) : 0;
      const grey = f < 69 ? '#6A6A6A' : mixColor('#6B6B6B', '#807D79', Math.min(1, (f - 69) / 3));
      const hot = between(PRISM.hot, Math.min(72, Math.max(69, f)), (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p, mixColor(a[3], b[3], p)] as const);
      const facePoly = (p: P2[]) => p.map((q) => q.join(',')).join(' ');
      // C-D hidden where it passes behind the front face: from C to its crossing with A-F
      const sCD = cross(C, D, A, F);
      const cdFrom: P2 = sCD ? [C[0] + (D[0] - C[0]) * sCD, C[1] + (D[1] - C[1]) * sCD] : C;
      body = (
        <>
          <defs>
            {/* CFD: the caustic band along u + v = 0.72, warm toward the F-D edge, a red fringe toward C, darker toward D */}
            <linearGradient id={`${uid}cfd`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0.5} y2={0.5}>
              <stop offset="0" stopColor="#060203" />
              <stop offset="0.46" stopColor="#0B0505" />
              <stop offset="0.58" stopColor={rgba('#C77A6E', 1)} />
              <stop offset="0.67" stopColor="#D8E2DA" />
              <stop offset="0.77" stopColor={peach} />
              <stop offset="0.87" stopColor={warm} />
              <stop offset="0.95" stopColor={rust} />
              <stop offset="1" stopColor="#4D3229" />
            </linearGradient>
            <linearGradient id={`${uid}cfdShade`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0.45" stopColor="#000" stopOpacity="0" />
              <stop offset="0.95" stopColor="#120A08" stopOpacity="0.8" />
            </linearGradient>
            {/* CGA: warm grey at C, white along C-G, a spectral fan toward G and A, a brown corner at A */}
            <linearGradient id={`${uid}cga`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0.5} y2={0.5}>
              <stop offset="0.1" stopColor="#B7B8BA" />
              <stop offset="0.36" stopColor="#E4E6E6" />
              <stop offset="0.55" stopColor="#CDDBCE" />
              <stop offset="0.7" stopColor="#7C9895" />
              <stop offset="0.8" stopColor="#959DAE" />
              <stop offset="0.92" stopColor="#4A3D44" />
              <stop offset="1" stopColor="#2A2A2C" />
            </linearGradient>
            <linearGradient id={`${uid}cgaCorner`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0.4" stopColor={rust} stopOpacity="0" />
              <stop offset="0.95" stopColor={rust} stopOpacity="0.95" />
            </linearGradient>
            {/* CAF: grey body, lightening along C-A, warm toward F */}
            <linearGradient id={`${uid}caf`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={1} y2={0}>
              <stop offset="0.05" stopColor="#7C7C7C" />
              <stop offset="0.45" stopColor="#C6C8CA" />
              <stop offset="0.65" stopColor="#E2E4E5" />
              <stop offset="0.85" stopColor={mixColor('#D0D2D4', warm, 0.2)} />
            </linearGradient>
            <linearGradient id={`${uid}cafMask`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0" stopColor="#FFF" stopOpacity="1" />
              <stop offset="0.38" stopColor="#FFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${uid}cafWarm`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0.45" stopColor="#A9ABAE" stopOpacity="0" />
              <stop offset="0.85" stopColor={mixColor('#A9ABAE', warm, 0.25)} stopOpacity="0.9" />
            </linearGradient>
            <mask id={`${uid}cafM`} maskContentUnits="userSpaceOnUse" x="-1" y="-1" width="3" height="3">
              <path d={tri} fill={`url(#${uid}cafMask)`} />
            </mask>
            <radialGradient id={`${uid}hot`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={hot ? hot[3] : '#EDEFF0'} stopOpacity="1" />
              <stop offset="0.55" stopColor={hot ? hot[3] : '#EDEFF0'} stopOpacity="0.35" />
              <stop offset="1" stopColor={hot ? hot[3] : '#EDEFF0'} stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${uid}cafClip`}>
              <polygon points={facePoly([C, A, F])} />
            </clipPath>
          </defs>
          {/* CFD (behind) */}
          {cfd > 0 && (
            <g transform={mtx(C, F, D)} opacity={cfd}>
              <path d={tri} fill={`url(#${uid}cfd)`} />
              <path d={tri} fill={`url(#${uid}cfdShade)`} />
            </g>
          )}
          {/* CGA */}
          {cga > 0 && (
            <g transform={mtx(C, G, A)} opacity={cga}>
              <path d={tri} fill={`url(#${uid}cga)`} />
              <path d={tri} fill={`url(#${uid}cgaCorner)`} />
            </g>
          )}
          {/* CAF (front): flat grey with the growing hot spot, then its glass paint; it adds light over CGA */}
          <g style={{ mixBlendMode: 'screen' }}>
            <polygon points={facePoly([C, A, F])} fill={grey} opacity={1 - glass * 0.08} />
            {hot && f < 74 && (
              <g clipPath={`url(#${uid}cafClip)`} opacity={1 - glass}>
                <circle cx={hot[0]} cy={hot[1]} r={hot[2] * 1.6} fill={`url(#${uid}hot)`} />
              </g>
            )}
            {glass > 0 && (
              <g transform={mtx(C, A, F)} opacity={glass}>
                <path d={tri} fill="#737373" />
                <path d={tri} fill={`url(#${uid}caf)`} mask={`url(#${uid}cafM)`} />
                <path d={tri} fill={`url(#${uid}cafWarm)`} />
              </g>
            )}
          </g>
          {/* the edges: 2 px with a faint chromatic fringe */}
          <g stroke={edge} strokeWidth={2} strokeLinecap="round" fill="none">
            {[
              [C, A], [A, G], [G, C], [A, F], [C, F], [F, D], [D, G], [cdFrom, D],
            ].map(([p, q], i) => (
              <g key={i}>
                <line x1={p[0] + 1} y1={p[1]} x2={q[0] + 1} y2={q[1]} stroke={rgba('#B9F3D9', 0.35)} strokeWidth={1} />
                <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
              </g>
            ))}
          </g>
        </>
      );
      // the fly-through: the pale face takes the frame, then pearly white
      if (exit === 'fly' && f > 122) wash = Math.min(1, (f - 122) / 4.5);
    }
  }
  return (
    <Stage1080 W={W} H={H} ground={pal.ground}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {body}
      </svg>
      {wash > 0 && (
        // lint-ok: a near-white sheen under the closing wash, on screen under a second; the film's grain dithers it
        <div style={{ position: 'absolute', inset: 0, opacity: Math.pow(wash, 1.4), background: `linear-gradient(60deg, ${mixColor(PRISM.white, warm, 0.18)} 0%, ${PRISM.white} 35%, #F4F3EF 48%, ${PRISM.white} 60%, #F6F5F2 74%, ${PRISM.white} 100%)` }} />
      )}
    </Stage1080>
  );
};
