// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// blobs-to-mark: two solid blobs of the brand colour sweep in from the frame's edges, pass through each other,
// shrink, come back and pass again, and merge into one small dot; the dot snaps into the product's mark (born
// squashed, one part still swollen), which settles and slides aside as the name's letters cut on beside it one by one.
// Graphics are crisp on every frame: no blur, no motion smear (flat, confident shapes).
// Numbers (frames at 30 fps, px at 1080; the blob paths are the measured boxes, played x1.25): the dance 36 f; the
// dot 75 px; the mark 217 px, born at x1.08 / x0.79 with its last part x1.6, home in 11 f; the slide 19 f on the
// measured curve (half of it in its middle 5 f), the letters cut on from its 6th frame about one a frame.
import React, { useMemo } from 'react';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { C, FONT } from '../brand/tokens';
import { clamp, curveOf, trackLinear } from '../lib/anim';
import { baselineOf, measureTracked } from '../lib/measure';
import { markBox, type Palette, paletteOf, type SceneMeta, tab, useClock } from './parts';

export type BlobsToMarkProps = {
  /** the product's name, its letters cut on beside the mark */
  name: string;
  logo?: Logo;
  /** the blobs' colour (default the accent: give the mark's own colour) */
  blob?: string;
  /** draw the mark in the blobs' one colour (a one-colour mark: the blobs visibly become it) */
  mono?: boolean;
  palette?: Partial<Palette>;
  frame?: number;
};

export const BLOBS = { dance: 36, birth: 11, slideAt: 49, slide: 19, dur: 74, mark: 217 } as const;
type Box = [f: number, x0: number, x1: number, y0: number, y1: number];
// the two blobs' boxes (frames from the first at the measured rate; px at 1080): A enters from the left, B from the right
const A: Box[] = [[0, -678, 141, 212, 867], [1, -676, 310, 145, 934], [2, -299, 630, 168, 911], [3, -81, 769, 200, 880], [4, 106, 891, 226, 853], [5, 426, 1147, 250, 830], [6, 552, 1209, 271, 809], [7, 674, 1266, 292, 788], [8, 777, 1305, 312, 767], [9, 872, 1336, 333, 746], [10, 980, 1379, 354, 725], [11, 1015, 1392, 361, 718], [12, 1067, 1410, 373, 705], [13, 1085, 1414, 379, 700], [14, 1100, 1417, 384, 695], [15, 1121, 1418, 392, 687], [17, 1137, 1414, 402, 677], [19, 1142, 1409, 407, 672], [21, 1144, 1399, 413, 666], [23, 1135, 1381, 419, 660], [25, 1116, 1355, 425, 654], [27, 1098, 1332, 429, 650], [29, 1060, 1287, 435, 644], [30, 1028, 1250, 439, 640], [31, 1010, 1229, 441, 638], [32, 991, 1207, 443, 636], [39, 797, 957, 468, 611], [40, 789, 937, 472, 607], [41, 787, 910, 479, 600], [42, 791, 909, 483, 596], [43, 827, 951, 493, 586], [44, 870, 1000, 503, 577], [45, 920, 995, 510, 569]];
const B: Box[] = [[0, 1697, 2623, 153, 925], [1, 1487, 2448, 139, 940], [2, 1180, 1998, 215, 864], [3, 1066, 1784, 254, 825], [4, 970, 1608, 282, 797], [5, 759, 1349, 300, 780], [6, 711, 1252, 316, 764], [7, 680, 1173, 331, 748], [8, 647, 1092, 347, 733], [9, 619, 1016, 362, 717], [10, 577, 926, 378, 701], [11, 562, 898, 382, 697], [12, 540, 855, 390, 689], [13, 532, 838, 392, 687], [14, 526, 824, 395, 684], [15, 518, 805, 399, 680], [17, 516, 788, 404, 675], [19, 514, 782, 407, 672], [21, 515, 777, 409, 670], [23, 523, 783, 412, 667], [25, 540, 800, 414, 665], [27, 559, 819, 416, 663], [29, 600, 861, 419, 660], [30, 638, 897, 422, 657], [31, 660, 918, 423, 656], [32, 684, 941, 425, 654], [39, 970, 1150, 457, 622], [40, 991, 1154, 462, 617], [41, 1016, 1151, 472, 607], [42, 1009, 1141, 478, 601], [43, 963, 1093, 491, 588], [44, 930, 1050, 503, 577], [45, 920, 995, 510, 569]];
const at = (boxes: Box[], f: number) => [1, 2, 3, 4].map((c) => trackLinear(f, boxes.map((b) => [b[0], b[c]] as const)));
// the birth: the mark's squash (x, y) and its last part's swell, frames from the dot
const SQ_X: [number, number][] = [[0, 1.078], [1, 1.083], [2, 1.078], [3, 1.074], [4, 1.064], [5, 1.05], [8, 1.02], [11, 1]];
const SQ_Y: [number, number][] = [[0, 0.79], [1, 0.89], [2, 0.97], [3, 0.98], [4, 0.99], [5, 1]];
const SWELL: [number, number][] = [[0, 1.6], [1, 1.34], [2, 1.19], [3, 1.17], [5, 1.09], [8, 1.03], [11, 1]];
// the slide (share of the travel), measured on 24 frames, played on 19
const SLIDE = curveOf([0, 0.012, 0.024, 0.059, 0.086, 0.125, 0.275, 0.416, 0.647, 0.714, 0.761, 0.831, 0.855, 0.878, 0.914, 0.925, 0.949, 0.957, 0.965, 0.976, 0.984, 0.988, 0.992, 0.996, 1]);

export const BlobsToMark: React.FC<BlobsToMarkProps> = ({ name, logo, blob, mono = false, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  // no logo given: the starter's placeholder mark painted in this palette, never in the starter's own accent
  const lg = useMemo(() => logo ?? logoParts(SAMPLE_MARK_SVG.split(C.accent).join(P.accent).split(C.ink).join(P.ink)), [logo, P.accent, P.ink]);
  const col = blob ?? P.accent;
  const cx = W / 2;
  const cy = H / 2;
  const ox = cx - 957.5 * u; // the boxes put the dot at x 957.5: centre it
  if (t < BLOBS.dance) {
    const f = t * 1.25;
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
        {[A, B].map((boxes, i) => {
          const [x0, x1, y0, y1] = at(boxes, f);
          return <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: (x1 - x0) * u, height: (y1 - y0) * u, borderRadius: '50%', background: col, transform: `translate(${(ox + x0 * u).toFixed(2)}px, ${(cy + (y0 - 539.5) * u).toFixed(2)}px)` }} />;
        })}
      </div>
    );
  }
  // ---- the mark, born from the dot, then the lockup slides aside as the letters cut on
  const tb = t - BLOBS.dance;
  const mb0 = markBox(lg, 100);
  const size = (BLOBS.mark * u * 100) / Math.max(mb0.w, mb0.h);
  const mb = markBox(lg, size);
  const font = (0.62 * mb.h) / 0.727;
  const gap = 0.295 * mb.w;
  const letters = Array.from(name);
  const nameW = measureTracked(name, font, 500, -0.02);
  const total = mb.w + gap + nameW;
  const sp = clamp((t - BLOBS.slideAt) / BLOBS.slide);
  const travel = total / 2 - mb.w / 2;
  const markLeft = cx - mb.w / 2 - travel * SLIDE(sp);
  const creep = 1 + 0.012 * clamp((t - (BLOBS.slideAt + BLOBS.slide)) / 20);
  const sx = tab(tb, SQ_X);
  const sy = tab(tb, SQ_Y);
  const last = lg.parts.length - 1;
  const swell = tab(tb, SWELL);
  const base = baselineOf(font, 500, 1);
  const every = Math.min(1.2, 7 / Math.max(1, letters.length - 1));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: `scale(${creep.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${mb.x + mb.w / 2}px ${mb.y + mb.h / 2}px`, transform: `translate(${(markLeft - mb.x).toFixed(2)}px, ${(cy - mb.h / 2 - mb.y).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})` }}>
          <LogoMark logo={lg} size={size} poses={(_, i) => (last > 0 && i === last ? { s: swell } : undefined)} fill={mono ? () => col : undefined} />
        </div>
        {letters.map((ch, i) => {
          const on = BLOBS.slideAt + 6 + i * every;
          if (t < on) return null;
          const x = markLeft + mb.w + gap + measureTracked(letters.slice(0, i).join(''), font, 500, -0.02);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x.toFixed(2)}px, ${(cy + 0.36 * font - base).toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: font, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1, color: P.ink }}>
              {ch}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const blobsToMarkMeta: SceneMeta = {
  id: 'blobs-to-mark',
  does: 'two brand-colour blobs sweep in, pass through each other twice and merge into a dot that snaps into the mark; the name cuts on',
  dur: BLOBS.dur,
  props: ['name', 'logo?', 'blob?', 'mono?', 'palette?'],
  handIn: null,
  handOut: { form: 'mark', x: 960 - 364, y: 431, w: 728, h: 217 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'blobs-in', weight: 0.7 },
    { f: 7, kind: 'whoosh', id: 'pass-1', weight: 0.4 },
    { f: 28, kind: 'whoosh', id: 'pass-2', weight: 0.4 },
    { f: BLOBS.dance, kind: 'pop', id: 'mark', weight: 0.8 },
    { f: BLOBS.slideAt + 6, kind: 'tick', id: 'letters', weight: 0.4 },
  ],
};
