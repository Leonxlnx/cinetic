// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// photo-river: the pictures the product makes, one after another, faster and faster: a photo card pulls back, and at
// every hard swap the picture changes and the card punches in larger again; the cards it leaves stay behind as a deck
// of edge-on slivers receding to the left; then the deck unfolds into a row of face-on cards receding in depth toward
// the left (a lower lane cut by the frame's edge), new cards cutting in at the front faster and faster; the last picture
// cuts in front as the row rushes back and keeps drifting, the two words flanking the scene on a pull-back.
// Numbers (frames at 30 fps, px at 1080; measured on a 25 fps pump): segments 8 6 6 5 4 4 3 3 3 3 f; each card pulls
// back to 0.84 of its first size on an expo-out and the next punches in at x1.14; slivers turned 62 deg, 55 px apart;
// the row: a card a steps back stands at 1 / (1 + 0.5 a) of the front, its centre on the line from the front card to a
// vanishing point 1100 px left of centre, every third card in a lower lane 0.78 card heights down; front cards cut in
// at 0 4 7 10 12 14 f of the row; the last card 715 px tall, the row behind it on a far line (1 / (1 + 0.79 a), from
// 1257 px right of centre at full size to 805 px left at none) rushing from 2.4 to 4 steps back in 8 f and drifting on,
// "you" ending 706 px left of centre, the right word 74 px off the card, 100 px; the pull-back x0.81.
import React from 'react';
import { Img } from 'remotion';
import { FONT } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { clamp, E, rand } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { baselineOf, measureTracked } from '../lib/measure';
import { nth, type Palette, paletteOf, type SceneMeta, useClock } from './parts';

export type PhotoRiverProps = {
  /** the pictures (portrait crops read best): 8-14 of them, the last one ends the scene */
  photos: readonly string[];
  /** the two words that flank the last picture (left, right), optional */
  words?: readonly [string, string];
  palette?: Partial<Palette>;
  frame?: number;
};

export const RIVER = { segs: [8, 6, 6, 5, 4, 4, 3, 3, 3, 3], swaps: [0, 4, 7, 10, 12, 14], river: 16, flank: 20, aspect: 0.745, stack: 3, rows: 14, row: { dz: 0.5, x0: -1100, x1: 0 }, far: { dz: 0.79, x0: -805, x1: 1257 } } as const;
type RowLine = { dz: number; x0: number; x1: number };
const PUMP = RIVER.segs.reduce((a, b) => a + b, 0);
const PUMP_INDEX = RIVER.segs.length - 1; // the river picks the pictures up where the pump left them
export const photoRiverDur = () => PUMP + RIVER.river + RIVER.flank;

export const PhotoRiver: React.FC<PhotoRiverProps> = ({ photos, words, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const cx = W / 2;
  const cy = H / 2;
  const edge = mixColor(P.ground, P.ink, 0.14);
  const card = (src: string, w: number, h: number, key: React.Key, style: React.CSSProperties, k = 1) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: 6 * u * k, overflow: 'hidden', background: P.paper, boxShadow: `0 0 0 ${1 * u}px ${edge}, 0 ${18 * u * k}px ${44 * u * k}px ${withAlpha(P.ink, 0.16)}`, ...style }}>
      <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
  // a card `a` steps back along a row line (h0 tall at full size): its scale 1 / (1 + dz a) and its centre between the
  // line's ends (x0 px from the centre at no size, x1 at full size); a lower-lane card drops into its lane as it leaves
  // the front; `turn` (deg) about its right edge while the deck unfolds
  const rowCard = (m: number, a: number, h0: number, L: RowLine, turn = 0) => {
    const s = 1 / (1 + L.dz * a);
    const lane = ((m % 3) + 3) % 3 === 1 ? Math.min(1, a) : 0;
    const jit = (rand(`river-row-${m}`) * 2 - 1) * Math.min(1, a);
    const h = h0 * s;
    const w = h * RIVER.aspect;
    const x = cx + (L.x0 + (L.x1 - L.x0) * s) * u;
    const y = cy + 24 * u * (1 - s) + lane * 0.78 * h0 * s + jit * 0.05 * h0 * s;
    const rot = Math.abs(turn) > 0.01 ? ` rotateY(${turn.toFixed(2)}deg)` : '';
    return card(nth(photos, m), w, h, `r${m}`, { transformOrigin: '100% 50%', transform: `translate(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px)${rot}` }, Math.max(0.25, s));
  };
  // ---- the pump (with the deck of slivers behind)
  if (t < PUMP) {
    let j = 0;
    let at = 0;
    while (j < RIVER.segs.length - 1 && t >= at + RIVER.segs[j]) at += RIVER.segs[j++];
    let h0 = 900 * u;
    for (let i = 1; i <= j; i++) h0 = Math.max(640 * u, h0 * 0.84 * 1.14);
    const h = h0 * (1 - 0.16 * E.softOut(clamp((t - at) / RIVER.segs[j])));
    const w = h * RIVER.aspect;
    const behind = j >= RIVER.stack ? Math.min(6, j) : 0;
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground, perspective: 1400 * u }}>
        {Array.from({ length: behind }, (_, s) => behind - s).map((s) => {
          const sw = w * Math.pow(0.95, s);
          const sh = h * Math.pow(0.95, s);
          return card(nth(photos, j - s), sw, sh, `s${s}`, {
            transformOrigin: '100% 50%',
            transform: `translate(${(cx - w / 2 - sw - (s - 1) * 55 * u).toFixed(2)}px, ${(cy - sh / 2).toFixed(2)}px) rotateY(-62deg)`,
            filter: `brightness(${(1 - 0.07 * s).toFixed(3)})`,
          });
        })}
        {card(nth(photos, j), w, h, 'front', { transform: `translate(${(cx - w / 2).toFixed(2)}px, ${(cy - h / 2).toFixed(2)}px)` })}
      </div>
    );
  }
  // ---- the row: the deck unfolds face-on, receding toward the left; new cards cut in at the front, faster and faster
  if (t < PUMP + RIVER.river) {
    const tau = t - PUMP;
    const h0 = 760 * u;
    let n = 0;
    while (n + 1 < RIVER.swaps.length && tau >= RIVER.swaps[n + 1]) n++;
    const segEnd = n + 1 < RIVER.swaps.length ? RIVER.swaps[n + 1] : RIVER.river;
    const q = E.softOut(clamp((tau - RIVER.swaps[n]) / (segEnd - RIVER.swaps[n]))); // the row's step back in this segment
    const unfold = 1 - E.glideOut(clamp(tau / 5));
    const head = PUMP_INDEX + 1 + n; // the picture at the front
    const v = 30 + 90 * (tau / RIVER.river) ** 2; // the row's speed at the front (px/f at 1080), for its smear
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground, perspective: 1400 * u }}>
        <DirBlur v={-v} axis="x" id="photo-river">
          {Array.from({ length: RIVER.rows + 1 }, (_, i) => RIVER.rows - i).map((back) => rowCard(head - back, back + q, h0, RIVER.row, back + q >= 1 ? -62 * unfold : 0))}
        </DirBlur>
      </div>
    );
  }
  // ---- the last picture cuts in front as the row rushes back and keeps drifting; the words flank the scene
  const tf = t - PUMP - RIVER.river;
  const pull = 1 - 0.19 * E.glideOut(clamp(tf / RIVER.flank));
  const h0 = 715 * u;
  const w0 = h0 * RIVER.aspect;
  const off = 2.4 + 1.6 * E.glideOut(clamp(tf / 8)) + 0.04 * tf;
  const head = PUMP_INDEX + RIVER.swaps.length; // the row's last front
  const size = 100 * u;
  const base = baselineOf(size, 450, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: `scale(${pull.toFixed(5)})` }}>
        {Array.from({ length: RIVER.rows }, (_, i) => RIVER.rows - 1 - i)
          .filter((back) => nth(photos, head - back) !== photos[photos.length - 1]) // the last picture only in front
          .map((back) => rowCard(head - back, off + back, h0, RIVER.far))}
        {card(photos[photos.length - 1], w0, h0, 'last', { transform: `translate(${(cx - w0 / 2).toFixed(2)}px, ${(cy - h0 / 2).toFixed(2)}px)` })}
        {words && tf >= 2
          ? words.map((wd, i) => {
              const ww = measureTracked(wd, size, 450, -0.01);
              const x = i === 0 ? Math.max(48 * u, cx - 706 * u - ww) : cx + w0 / 2 + 74 * u;
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x.toFixed(2)}px, ${(cy + 0.36 * size - base).toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: 450, letterSpacing: '-0.01em', lineHeight: 1, color: P.ink }}>
                  {wd}
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
};
export const photoRiverMeta: SceneMeta = {
  id: 'photo-river',
  does: 'a photo card pumps through the product\'s pictures faster and faster, leaves a deck, unfolds into a row receding in depth, the last picture flanked by two words',
  dur: photoRiverDur(),
  props: ['photos', 'words?', 'palette?'],
  handIn: { form: 'photo', x: 960 - 335, y: 90, w: 670, h: 900 },
  handOut: { form: 'photo', x: 960 - 216, y: 540 - 290, w: 432, h: 579 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'hit', id: 'first', weight: 0.6 },
    { f: 8, kind: 'tick', id: 'swaps', weight: 0.4 },
    { f: 26, kind: 'riser', id: 'faster', weight: 0.5 },
    { f: PUMP, kind: 'whoosh', id: 'river', weight: 0.7 },
    { f: PUMP + RIVER.river, kind: 'hit', id: 'last', weight: 0.8 },
  ],
};
