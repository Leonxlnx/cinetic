// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// held-product-word: the product stays locked dead centre while the world behind it cuts every quarter second (a
// paper sweep, then the places it lives in), then the world settles to one lit colour and a giant line cuts on
// BEHIND the product as a staircase (each word lower than the last) that eases into one baseline while drifting left
// to centre: the product covers the middle letters. Graphics move on twos (15 fps), the photographs on every frame.
// Numbers (frames at 30 fps, px at 1080): plates every 7 f, each pushing in x1.03; the product 63 % of the frame high,
// growing x1.12 on an accelerating push; the line at cap 200 px, its words 12 / 37 / 82 px below their baseline and
// 88 px right, home in 20 f on the measured ease-out (43 % in 4 f).
import React from 'react';
import { Img } from 'remotion';
import { FONT } from '../brand/tokens';
import { clamp, curveOf, E, zoomAt } from '../lib/anim';
import { contrastRatio, mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { baselineOf, measureTracked } from '../lib/measure';
import { type Palette, paletteOf, type SceneMeta, span, stepped, useClock } from './parts';

export type HeldProductWordProps = {
  /** the product, drawn in a productW x productH box (px at 1080) at the frame's centre: a device, a box, an object */
  product: React.ReactNode;
  productW: number;
  productH: number;
  /** the places it lives in: three photographs, cut every 7 f behind it */
  plates: readonly string[];
  /** the giant line (2-4 short words) */
  line: string;
  /** the ground behind the line: a calm, sharp photograph of the product's world (default a lit studio sweep in the accent) */
  backdrop?: string;
  palette?: Partial<Palette>;
  frame?: number;
};

export const HELD = { dur: 64, every: 7, word: 28, home: 20 } as const;
// the line's home curve, measured (share of the travel at frames 0 .. 20 after it cuts on)
const HOME = curveOf([0, 0.25, 0.36, 0.43, 0.57, 0.62, 0.68, 0.75, 0.78, 0.81, 0.88, 0.89, 0.91, 0.95, 0.96, 0.98, 0.99, 0.995, 1, 1, 1]);

export const HeldProductWord: React.FC<HeldProductWordProps> = ({ product, productW, productH, plates, line, backdrop, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const g = stepped(t, 2); // the graphics' clock (twos)
  const cx = W / 2;
  const cy = H / 2;
  const slot = Math.floor(t / HELD.every); // 0 paper, 1..n plates, then the field
  const n = plates.length;
  const onField = t >= HELD.word;
  const inSlot = (t - slot * HELD.every) / HELD.every;
  const platePush = 1 + 0.03 * E.softOut(clamp(inSlot));
  // the product: locked, an accelerating push x1.12
  const grow = 1 + 0.12 * E.softIn(span(g, 0, HELD.dur));
  const pw = productW * u;
  const ph = productH * u;
  // the ground the line sits on: a studio sweep in the accent (a key light behind the product, the floor falling into
  // shade) or the given calm photograph; never a blurred picture behind the type
  const sweepTop = mixColor(P.accent, P.ink, 0.42);
  const sweepMid = mixColor(P.accent, P.ink, 0.12);
  const sweepFloor = mixColor(P.accent, P.ink, 0.5);
  const key = mixColor(P.accent, P.paper, 0.38);
  const ink = backdrop || contrastRatio(P.paper, sweepMid) >= 2.2 ? P.paper : P.ink;
  // the line: a staircase easing into one baseline, drifting left to centre
  const words = line.split(' ');
  const size = Math.min(300 * u, (0.86 * W * 100) / Math.max(1, measureTracked(line, 100, 600, -0.02)));
  const lineW = measureTracked(line, size, 600, -0.02);
  const p = onField ? HOME(clamp((g - HELD.word) / HELD.home)) : 0;
  const k = size / (300 * u);
  const left = cx - lineW / 2 + 88 * k * u * (1 - p);
  const baseline = cy + 0.36 * size;
  const top0 = baseline - baselineOf(size, 600, 1);
  let x = left;
  const placed = words.map((w, i) => {
    const wx = x;
    x += measureTracked(`${w} `, size, 600, -0.02);
    const dy = (12 + 70 * Math.pow(i / Math.max(1, words.length - 1), 1.6)) * k * u * (1 - p);
    return { w, x: wx, dy };
  });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.paper }}>
      {/* the world behind: paper, the plates, the field */}
      {!onField && slot >= 1 && slot <= n ? <Img src={plates[slot - 1]} style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', transform: `scale(${platePush.toFixed(4)})` }} /> : null}
      {!onField && slot === 0 ? <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 45% 40%, ${P.paper}, ${mixColor(P.paper, P.ground, 0.9)})` }} /> : null}
      {onField && backdrop ? <Img src={backdrop} style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', transform: `scale(${zoomAt(t, HELD.word, HELD.dur, 1, 1.02, E.softOut).toFixed(4)})` }} /> : null}
      {onField && !backdrop ? (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoomAt(t, HELD.word, HELD.dur, 1, 1.02, E.softOut).toFixed(4)})`, background: `radial-gradient(ellipse 42% 52% at 50% 46%, ${withAlpha(key, 0.9)} 0%, ${withAlpha(key, 0)} 100%), linear-gradient(180deg, ${sweepTop} 0%, ${sweepMid} 58%, ${mixColor(sweepMid, sweepFloor, 0.5)} 74%, ${sweepFloor} 100%)` }} />
      ) : null}
      {/* the line, behind the product */}
      {onField
        ? placed.map((o, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${o.x.toFixed(2)}px, ${(top0 + o.dy).toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: ink }}>
              {o.w}
            </div>
          ))
        : null}
      {/* the product, its contact shadow on the ground it stands in front of */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: pw, height: ph, transformOrigin: `${pw / 2}px ${ph / 2}px`, transform: `translate(${(cx - pw / 2).toFixed(2)}px, ${(cy - ph / 2).toFixed(2)}px) scale(${grow.toFixed(4)})` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(pw * 0.08).toFixed(2)}px, ${(ph * 0.94).toFixed(2)}px)`, width: pw * 0.84, height: ph * 0.1, borderRadius: '50%', background: `radial-gradient(closest-side, ${withAlpha(P.ink, onField ? 0.3 : 0.38)}, ${withAlpha(P.ink, 0)})` }} />
        {slot === 0 && !onField ? <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(pw * 0.2).toFixed(2)}px, ${(ph * 0.08).toFixed(2)}px)`, width: pw, height: ph, borderRadius: pw * 0.18, background: withAlpha(P.ink, 0.1), filter: `blur(${(26 * u).toFixed(1)}px)` }} /> : null}
        {product}
      </div>
    </div>
  );
};

export const heldProductWordMeta: SceneMeta = {
  id: 'held-product-word',
  does: 'the product stays locked while the world behind it cuts every quarter second, then a giant line settles behind it',
  dur: HELD.dur,
  props: ['product', 'productW', 'productH', 'plates', 'line', 'backdrop?', 'palette?'],
  handIn: { form: 'photo', x: 960 - 170, y: 200, w: 340, h: 680 },
  handOut: { form: 'photo', x: 960 - 190, y: 160, w: 380, h: 760 },
  klass: 'big',
  cues: [
    { f: 7, kind: 'tick', id: 'world-1', weight: 0.5 },
    { f: 14, kind: 'tick', id: 'world-2', weight: 0.5 },
    { f: 21, kind: 'tick', id: 'world-3', weight: 0.5 },
    { f: HELD.word, kind: 'drop', id: 'line', weight: 0.9 },
  ],
};
