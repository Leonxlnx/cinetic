// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// decode-title: a soft swirl of the accent opens on a dark dot grid and the title decodes out of it from the centre:
// each glyph is born at a moving front as accent pixel blocks and resolves to the ink within two frames, the newest
// glyphs glowing hardest; crisp data dashes are thrown up the frame and thin out. After a short hold the call-to-action
// button flies in on an arc from the lower right, a real pointer riding its top edge, while the title rises to make room;
// the button lands centred under the title, sized to it (its height 1.22 x the title's cap: a press that reads, never a
// chip beside a giant title), and the pointer clicks it.
// Numbers (frames at 30 fps, px at 1080): the white span opens over 18 f, centre-out with the right front a glyph
// behind; blocks 13 px; glow 18 px with a 40 px skirt, hardest 2 f after a glyph is born, a quarter by 4 f; dashes
// 17-24 px tall, 20-100 wide, 8-15 px/f to the right, living 3-8 f, never inside the title band; hold 8 f; the button
// flies 18 f (x lands on an ease-out, y lags, scale 0.75 -> 1, roll -8.3 -> 0 deg) and is clicked on its landing. The
// button's seat is computed from the words alone (decodeTitleOut: a deterministic width estimate), so the element the
// film hands on is the same box in the browser and in Node.
import React from 'react';
import { C, FONT } from '../brand/tokens';
import { Cursor, pressAt } from '../fx/Cursor';
import { Icon } from '../kit/screens/base';
import { clamp, E, rand, XP } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import { paletteOf, perFrame, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

export type DecodeTitleProps = {
  /** the line that decodes: one to three words (a promise, the product's name and verb) */
  title: string;
  /** the button that flies into the line ("Book a demo", "Start free") */
  cta: string;
  /** dark scene: ground near black, ink the type, accent the blocks, glow, dashes and the button */
  palette?: Partial<Palette>;
  /** false: no pointer on the button (it flies in on its own and is not clicked) */
  pointer?: boolean;
  frame?: number;
};

export const DECODE = {
  dur: 50,
  decode: [0, 18] as const,
  fly: [26, 44] as const,
  click: 44,
  cap: 150, // the title's cap height, px at 1080 (it shrinks to fit a long title): the scene's subject, filling the frame
  block: 13,
  baseline: 600,
  maxW: 1680, // the title's widest, px
  btn: 1.22, // the button's height as a share of the title's cap (a press that reads: 40 % of 3 caps or more)
  label: 0.32, // the label's size as a share of the button's height
  gap: 0.55, // title to button, a share of the cap
} as const;

/** A deterministic width estimate (px) of a string at a size: the em a character of the face (a wide advance), tracking included. */
const estW = (s: string, size: number, em: number, track = 0) => s.length * size * (em + track);
/**
 * The layout from the words alone (no measuring: the same in the browser and in Node): the title's cap (it shrinks to
 * fit DECODE.maxW), the button's size (DECODE.btn x the cap, its label DECODE.label of its height, uppercase, tracked
 * 0.14 em) and both seats once the button has joined the title, centred on the frame.
 */
export const decodeLayout = (title: string, cta: string) => {
  const fit = Math.min(1, DECODE.maxW / Math.max(1, estW(title, DECODE.cap / 0.727, 0.58, -0.012)));
  const cap = DECODE.cap * fit;
  const btnH = Math.round(DECODE.btn * cap);
  const label = DECODE.label * btnH;
  const labelW = estW(cta.toUpperCase(), label, 0.7, 0.14);
  const btnW = Math.round(0.42 * btnH + labelW + 0.28 * btnH + 0.3 * btnH + 0.38 * btnH);
  const gap = DECODE.gap * cap;
  const group = cap + gap + btnH;
  const baseline = 540 - group / 2 + cap; // the title's baseline once the button has joined it
  const btnCy = baseline + gap + btnH / 2;
  return { fit, cap, btnH, btnW, label, gap, baseline, alone: 540 + cap / 2, btnCy };
};
/** The button the scene hands on, for its words (film px at 1920 x 1080, its last frame). */
export const decodeTitleOut = (title: string, cta: string) => {
  const L = decodeLayout(title || DECODE_SAMPLE.title, cta || DECODE_SAMPLE.cta);
  return { form: 'button' as const, x: Math.round(960 - L.btnW / 2), y: Math.round(L.btnCy - L.btnH / 2), w: L.btnW, h: L.btnH };
};
/** The words the meta's box is measured on (another title or call moves the button: decodeTitleOut). */
export const DECODE_SAMPLE = { title: 'Ship it.', cta: 'Start free' } as const;

// The white ink of the title per frame, as shares of its ink box (left, right): centre-out, the right front lagging.
const SPAN_PX: [number, number, number][] = [
  [0, 954, 954], [1, 954, 954], [2, 870, 1009], [3, 866, 1073], [4, 829, 1091], [5, 772, 1090], [6, 769, 1089], [7, 713, 1189], [8, 691, 1210],
  [9, 653, 1276], [10, 615, 1304], [11, 596, 1359], [12, 557, 1377], [13, 553, 1400], [14, 462, 1413], [15, 461, 1438], [16, 442, 1458],
  [17, 406, 1496], [18, 406, 1513],
];
const SPAN_L = SPAN_PX.map(([f, l]) => [f, (l - 406) / 1107] as const);
const SPAN_R = SPAN_PX.map(([f, , r]) => [f, (r - 406) / 1107] as const);
// the glow ring's strength over the decode (1 = the peak), and the dash field: count alive and its vertical extent
const GLOW = perFrame(2, [0.78, 1, 0.81, 0.78, 0.48, 0.35, 0.37, 0.24, 0.35, 0.28, 0.23, 0.17, 0.2, 0.19, 0.27, 0.21, 0.15, 0.09, 0.07, 0.05, 0.02, 0]);
const DASH_N = [13, 22, 27, 30, 34, 22, 16, 12, 10, 10, 10, 11, 12, 13, 14, 13, 13, 12, 12, 8, 5, 1];
const DASH_Y: [number, number][] = [[961, 1062], [895, 1061], [661, 1053], [500, 1062], [422, 1065], [341, 981], [278, 944], [239, 904], [159, 841], [118, 802], [119, 619], [61, 560], [60, 519], [59, 419], [60, 379], [20, 340], [19, 341], [18, 339], [19, 341], [20, 199], [61, 196], [140, 141]];
// the button's flight: offset from its seat (px), scale and roll (deg) per frame from the first flight frame
const FLY_X = perFrame(0, [693, 601, 454, 341, 255, 191, 143, 106, 78, 57, 41, 29, 20, 13, 9, 5, 3, 1, 0]);
const FLY_Y = perFrame(0, [353, 347, 336, 313, 284, 252, 220, 188, 159, 132, 107, 86, 67, 50, 36, 24, 14, 6, 0]);
const FLY_S = perFrame(0, [0.75, 0.8, 0.85, 0.88, 0.91, 0.92, 0.94, 0.95, 0.96, 0.97, 0.97, 0.98, 0.98, 0.99, 0.99, 0.99, 1, 1, 1]);
const FLY_R = perFrame(0, [-8.3, -6.77, -5.44, -4.43, -3.6, -2.97, -2.45, -2.04, -1.68, -1.36, -1.11, -0.9, -0.72, -0.54, -0.43, -0.32, -0.27, 0, 0]);
// the light pools on the grid: (x, y, r, strength) for two pools, keyed through the scene
const POOLS: { t: number; a: [number, number, number, number]; b: [number, number, number, number] }[] = [
  { t: 0, a: [700, 420, 380, 0.35], b: [1600, 250, 420, 0.8] },
  { t: 20, a: [420, 160, 520, 0.55], b: [1550, 820, 380, 0.35] },
  { t: 44, a: [720, 300, 380, 0.5], b: [1650, 950, 420, 0.35] },
];

type Dash = { b: number; life: number; x: number; v: number; y: number; w: number; h: number; tier: number };
/** The dash field (pure, built once): each frame births just enough dashes to hold the frame's count; none outlives f22. */
const DASHES: Dash[] = (() => {
  const all: Dash[] = [];
  DASH_N.forEach((n, b) => {
    const alive = all.filter((d) => d.b < b && d.b + d.life > b).length;
    for (let k = 0; k < Math.max(0, n - alive); k++) {
      const s = `dash:${b}:${k}`;
      const life = Math.min(3 + Math.floor(rand(`${s}:l`) * 6), DASH_N.length - b);
      const h = 17 + Math.floor(rand(`${s}:h`) * 8);
      const [y0, y1] = DASH_Y[b];
      let y = y0 + rand(`${s}:y`) * (y1 - y0);
      if (y + h > 440 && y < 640) y = y < 540 ? 440 - h - rand(`${s}:p`) * 60 : 640 + rand(`${s}:p`) * 60; // never in the title band
      const q = rand(`${s}:w`);
      const w = q < 0.1 ? 20 : q < 0.5 ? 20 + ((q - 0.1) / 0.4) * 22 : q < 0.9 ? 42 + ((q - 0.5) / 0.4) * 58 : 100 + ((q - 0.9) / 0.1) * 60;
      all.push({ b, life, x: 140 + rand(`${s}:x`) * 1650, v: 8 + rand(`${s}:v`) * 7, y, w, h, tier: b < 2 ? 0 : Math.floor(rand(`${s}:c`) * 3) });
    }
  });
  return all;
})();

/** The dashes alive at frame t (pure): born along the bottom first, the field rising up the frame and thinning out. */
export const dashesAt = (t: number) => {
  const F = Math.floor(t);
  return DASHES.filter((d) => F >= d.b && F < d.b + d.life).map((d) => ({ x: d.x + d.v * (t - d.b), y: d.y, w: d.w, h: d.h, tier: d.tier }));
};

const poolAt = (t: number) => {
  const i = Math.max(0, POOLS.findIndex((_, k) => k === POOLS.length - 1 || POOLS[k + 1].t > t));
  const A = POOLS[Math.min(i, POOLS.length - 1)];
  const B = POOLS[Math.min(i + 1, POOLS.length - 1)];
  const q = A === B ? 0 : (1 - Math.cos(Math.PI * span(t, A.t, B.t))) / 2;
  const lerp4 = (a: number[], b: number[]) => a.map((v, k) => v + (b[k] - v) * q);
  return [lerp4(A.a, B.a), lerp4(A.b, B.b)];
};

/** The pixel-block look of a glyph being born: the glyph thickened and cut into 11 px squares on a 13 px lattice. */
const CELLS = `url("data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13'><rect width='11' height='11' fill='black'/></svg>")}")`;

export const DecodeTitle: React.FC<DecodeTitleProps> = ({ title, cta, palette, pointer = true, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: C.ink, ink: C.white, ...palette });
  const family = FONT.text;
  const weight = 700;
  const track = -0.012;
  // ---- the title's size (measured, to fit) and the stacked layout it shares with the button at the end
  const lay = decodeLayout(title, cta);
  const tw0 = measureTracked(title, DECODE.cap / 0.727, weight, track, family);
  const size = (DECODE.cap / 0.727) * Math.min(1, DECODE.maxW / Math.max(1, tw0));
  const tw = tw0 * Math.min(1, DECODE.maxW / Math.max(1, tw0));
  const k = lay.btnH / 80; // the button's parts at the size the title asks for
  const btnW = lay.btnW;
  const btnH = lay.btnH;
  const left0 = 960 - tw / 2; // the title's left edge, centred
  // ---- clocks
  const tf = t - DECODE.fly[0];
  const flying = tf >= 0;
  const dx = flying ? tab(tf, FLY_X) : 693;
  const room = 1 - dx / 693; // the title rises as the button arrives under it
  const baseNow = lay.alone + (lay.baseline - lay.alone) * room;
  const L = tab(t, SPAN_L);
  const R = tab(t, SPAN_R);
  const band = 0.075; // the block band at each front, a share of the title (about a glyph)
  const decoding = t < DECODE.decode[1];
  // ---- glyph cells (for the glow): the centre of each glyph as a share of the title
  const glyphs = [...title];
  // lint-ok: prefix widths place the glyph cells, nothing types on
  const widthTo = (n: number) => measureTracked(title.slice(0, n), size, weight, track, family);
  const cells = glyphs.map((_, i) => {
    const a = widthTo(i);
    const b = widthTo(i + 1);
    return { a, b, mid: (a + b) / 2 / tw };
  });
  const born = (mid: number) => {
    for (let f = 0; f <= DECODE.decode[1]; f++) if (mid >= tab(f, SPAN_L) - band && mid <= tab(f, SPAN_R) + band) return f;
    return DECODE.decode[1];
  };
  const glowLevel = tab(t, GLOW);
  const glowOf = (i: number) => {
    const age = t - born(cells[i].mid);
    if (age < 0) return 0;
    const fresh = age <= 2 ? 1 : age <= 6 ? 1 - (0.75 * (age - 2)) / 4 : 0.25;
    return clamp(fresh * (0.35 + 0.65 * glowLevel) * (glowLevel > 0 ? 1 : 0));
  };
  // ---- the grid and its pools
  const pitch = 12.02;
  const dot = mixColor(P.ground, P.ink, 0.23);
  const [pa, pb] = poolAt(t);
  const poolMask = [pa, pb].map(([x, y, r, s]) => `radial-gradient(${r * 1.6}px ${r * 1.6}px at ${x}px ${y}px, rgba(0,0,0,${s.toFixed(3)}) 0%, rgba(0,0,0,${(s * 0.37).toFixed(3)}) 45%, rgba(0,0,0,0) 100%)`).join(', ');
  const grid = `radial-gradient(circle at ${pitch / 2}px ${pitch / 2}px, ${withAlpha(dot, 0)} 0.8px, ${dot} 0.95px, ${dot} 2.2px, ${withAlpha(dot, 0)} 2.5px)`;
  // ---- the swirl: two broad soft arcs of the accent turning clockwise inside a wide glow
  const sw = span(t, 0, 6);
  const swirlA = t < 13 ? clamp((0.4 + 0.6 * E.snapOut(clamp(t / 1.2))) * (1 - E.buildIn(span(t, 4, 12)))) : 0;
  const rx = 240 + 160 * sw;
  const ry = 190 + 110 * sw;
  const rot = 6 * t;
  const arc = (c: number) => {
    const pts = Array.from({ length: 25 }, (_, i) => {
      const a = ((c - 55 + (110 * i) / 24 + rot) * Math.PI) / 180;
      return `${(960 + rx * Math.cos(a)).toFixed(1)},${(545 + ry * Math.sin(a)).toFixed(1)}`;
    });
    return `M${pts.join(' L')}`;
  };
  // ---- the button and the pointer
  const sx = flying ? tab(tf, FLY_S) : 0.75;
  const rotB = flying ? tab(tf, FLY_R) : -8.3;
  const seatX = 960;
  // the flight from the lower right, in sight from its first frame (offsets as measured, from the button's seat)
  const bx = seatX + dx;
  const by = lay.btnCy + (flying ? tab(tf, FLY_Y) : 353);
  // the press: the button dips 8 % over 2 frames under the pointer and springs back over 6 (never a one-frame jump)
  const pt = t - DECODE.click;
  const dip = (q: number) => q * q * (3 - 2 * q);
  const press = pointer ? 1 - 0.08 * (pt < -2 || pt > 6 ? 0 : pt <= 0 ? dip((pt + 2) / 2) : 1 - dip(pt / 6)) : 1;
  const ptrOn = pointer && flying && tf >= 1;
  const ptrA = E.snapOut(span(tf, 1, 3)); // the pointer comes in with the button, over 2 frames
  const toClick = XP.travel(span(t, DECODE.click - 3, DECODE.click - 0.5));
  const edge = { x: bx + btnW * 0.2 * sx, y: by - (btnH / 2) * sx + 6 };
  const hit = { x: seatX - btnW * 0.16, y: lay.btnCy + btnH * 0.12 };
  const ease = (q: number) => q * q * (3 - 2 * q);
  const ptr = { x: edge.x + (hit.x - edge.x) * ease(toClick), y: edge.y + (hit.y - edge.y) * ease(toClick) };
  const tiers = [mixColor(P.accent, P.ground, 0.62), mixColor(P.accent, P.ground, 0.3), P.accent];
  const titleStyle: React.CSSProperties = { position: 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: family, fontWeight: weight, fontSize: size, letterSpacing: `${track}em`, lineHeight: 1 };
  const blockInk = mixColor(P.accent, P.ink, 0.12);
  const blocks: React.CSSProperties = { color: blockInk, WebkitTextStroke: `${(size * 0.05).toFixed(1)}px ${blockInk}`, WebkitMaskImage: CELLS, maskImage: CELLS, WebkitMaskSize: '13px 13px', maskSize: '13px 13px' };
  const lineTop = baseNow - size * 0.864; // Inter at line-height 1 sets its baseline 0.864 em down
  const clipSpan = (a: number, b: number) => `inset(-30% ${Math.max(0, (1 - b) * tw)}px -30% ${Math.max(0, a * tw)}px)`;
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {/* the dot grid, lit by its pools */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: grid, backgroundSize: `${pitch}px ${pitch}px`, backgroundPosition: `${(960 - pitch / 2) % pitch}px ${(540 - pitch / 2) % pitch}px`, WebkitMaskImage: poolMask, maskImage: poolMask }} />
      {/* the swirl: two broad soft arcs of the accent turning */}
      {swirlA > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: swirlA }}>
          {/* lint-ok: the swirl lives 13 f; the two decode glow copies are title-sized and gone by f22 */}
          <g style={{ filter: 'blur(40px)' }} opacity={0.35}>
            {[215, 35].map((c) => (
              <path key={c} d={arc(c)} stroke={P.accent} strokeWidth={70} fill="none" strokeLinecap="round" />
            ))}
          </g>
        </svg>
      )}
      {/* the dashes thrown out of the swirl */}
      {t < 22 &&
        // the field thins out and fades over its last frames (a dash never stops dead in one frame)
        dashesAt(t).map((d, i) => <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: d.w, height: d.h, background: tiers[d.tier], opacity: 1 - E.buildIn(span(t, 15, 21.5)), transform: `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px)` }} />)}
      {/* the title */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: tw, height: size * 1.2, transform: `translate(${left0.toFixed(2)}px, ${lineTop.toFixed(2)}px)` }}>
        {/* the decode glow: a soft copy of the glyphs being born, in the accent */}
        {glowLevel > 0 && (
          <>
            <div aria-hidden style={{ ...titleStyle, color: P.accent, filter: 'blur(18px)', opacity: 0.95 }}>
              {glyphs.map((ch, i) => (
                <span key={i} style={{ opacity: glowOf(i) }}>{ch}</span>
              ))}
            </div>
            <div aria-hidden style={{ ...titleStyle, color: P.accent, filter: 'blur(40px)', opacity: 0.55 }}>
              {glyphs.map((ch, i) => (
                <span key={i} style={{ opacity: glowOf(i) }}>{ch}</span>
              ))}
            </div>
          </>
        )}
        {/* the resolved ink */}
        <div data-text="decode-title" style={{ ...titleStyle, color: P.ink, clipPath: decoding ? clipSpan(L, R) : undefined }}>
          {title}
        </div>
        {/* the fronts: the glyphs being born as accent blocks */}
        {decoding && (
          <>
            <div aria-hidden style={{ ...titleStyle, ...blocks, clipPath: clipSpan(L - band, L) }}>{title}</div>
            <div aria-hidden style={{ ...titleStyle, ...blocks, clipPath: clipSpan(R, R + band) }}>{title}</div>
          </>
        )}
        {/* the fine dark screen inside the letters once they rest */}
        {t >= 17 && (
          <div aria-hidden style={{ ...titleStyle, color: 'transparent', backgroundImage: `radial-gradient(circle at ${pitch / 2}px ${pitch / 2}px, ${withAlpha(P.ground, 0.55)} 1.2px, ${withAlpha(P.ground, 0)} 2.2px)`, backgroundSize: `${pitch}px ${pitch}px`, padding: '.18em 0 .32em', margin: '-.18em 0 0', WebkitBackgroundClip: 'text', backgroundClip: 'text', opacity: E.snapOut(span(t, 17, 19)) }}>
            {title}
          </div>
        )}
      </div>
      {/* the button flying into the line */}
      {flying && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: btnW, height: btnH, transform: `translate(${(bx - btnW / 2).toFixed(2)}px, ${(by - btnH / 2).toFixed(2)}px) rotate(${rotB}deg) scale(${(sx * press).toFixed(4)})`, transformOrigin: '50% 50%', background: P.accent, borderRadius: btnH * 0.12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: btnH * 0.28 }}>
          <span data-text="decode-cta" style={{ fontFamily: family, fontWeight: 500, fontSize: lay.label, letterSpacing: '0.14em', color: P.paper, whiteSpace: 'pre', lineHeight: 1 }}>{cta.toUpperCase()}</span>
          <Icon name="arrowRight" size={btnH * 0.3} color={P.paper} weight="bold" />
        </div>
      )}
      {ptrOn && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `rotate(${(rotB * (1 - toClick)).toFixed(2)}deg)`, transformOrigin: `${ptr.x}px ${ptr.y}px`, opacity: ptrA }}>
          <Cursor x={ptr.x} y={ptr.y} scale={Math.min(2.4, Math.max(1.5, 0.9 * k))} shape="arrow" shadow="drop" fill={P.ink} outline={P.ground} press={pressAt(t, DECODE.click, 30)} pressDepth={0.14} />
        </div>
      )}
    </Stage1080>
  );
};

export const decodeTitleMeta: SceneMeta = {
  id: 'decode-title',
  does: 'the title decodes from the centre out of a swirl of the accent on a dark dot grid; the call-to-action flies into the line and a pointer clicks it',
  dur: DECODE.dur,
  props: ['title', 'cta', 'palette?', 'pointer?'],
  handIn: null,
  handOut: decodeTitleOut(DECODE_SAMPLE.title, DECODE_SAMPLE.cta),
  klass: 'big',
  cues: [
    { f: 0, kind: 'suck', id: 'swirl', weight: 0.6 },
    { f: 4, kind: 'pop', id: 'decode', weight: 0.7 },
    { f: 7, kind: 'pop', id: 'decode-2', weight: 0.5 },
    { f: 15, kind: 'bell', id: 'title', weight: 0.7 },
    { f: DECODE.fly[0] + 1, kind: 'whoosh', id: 'button-flies', weight: 0.6 },
    { f: DECODE.fly[0] + 6, kind: 'pop', id: 'button', weight: 0.6 },
    { f: DECODE.click, kind: 'click', id: 'click', weight: 0.8 },
  ],
};
