// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// key-glow: a dark wall of keycaps; one key per item is pressed into light and the camera travels from key to key.
//
// A flat wall of rounded keys (seen square on, no perspective) on a night ground with a deep glow along the floor. Each
// item lights one key: its face fills with the accent from the left, a pale rim light runs down its right edge and blooms
// over the neighbours, a white line glyph sits on it and the item's label on the wide key to its left. The camera holds
// on the first with a slow push, tilts down to the second at the lower left while pulling back, glides up and right to
// the third and accelerates left into the cut: each move reveals the next lit key. 2.4 s. Big.
//
// Numbers (1080p px, 30 fps, at the first hold's scale): key pitch 390 x 395, keys 358 x 355, radius 36; light-up
// 12 f on cubic-bezier(.2, .7, .3, 1) (the second and third over 19-20 f); blue fill from 35 % of the key width; rim band
// 40 px; halo 120 px beyond the right edge, 80 px above and below; glyph 100 px, stroke 4; label cap 44 px. Camera: push
// 0.2 %/f, tilt down 420 px with the pull to 0.83, glide 360 px left / 190 px down on an expo-out, exit 8 10 13 18 27 44
// 79 px/f.
import React from 'react';
import { FONT } from '../brand/tokens';
import type { IconName } from '../kit/icons';
import { Glyph } from '../kit/parts';
import { E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { bezier, rgba, Stage1080 } from './stage1080';

export type KeyItem = { label: string; glyph: IconName };

export const KEYS = {
  dur: 72,
  pitch: { x: 390, y: 395 },
  key: { w: 358, h: 355, r: 36 },
  origin: { x: -78, y: -55 }, // the top-left key's corner at the first hold (col 0, row 0)
  // the three lit keys (col, row) and how many keys their labels take to the left
  slots: [
    { col: 3, row: 1, at: 3, full: 15 },
    { col: 2, row: 3, at: 31, full: 50 },
    { col: 5, row: 2, at: 51, full: 71 },
  ],
  light: [0.2, 0.7, 0.3, 1] as const,
  // camera: [t, centre x, centre y, scale] at the stage's centre (960, 540)
  camera: [
    [0, 968, 548, 0.956],
    [22, 960, 540, 1.0],
    [23, 961, 545, 0.999],
    [39, 1096, 978, 0.93],
    [44, 1100, 1010, 0.86],
    [45, 1104, 1008, 0.85],
  ] as const,
  glide: { from: 45, to: 64, dx: 440, dy: -236, s: [0.85, 0.81] as const },
  exit: [8, 10, 13, 18, 27, 44, 79] as const, // content px/f leftward over the last 7 frames (at the final scale)
  ground: '#010103',
  face: '#060608',
  edge: '#121219',
} as const;

export type KeyGlowProps = {
  /** two or three items: a label and a generic glyph each (the third key lights as the camera leaves) */
  items: KeyItem[];
  palette?: Partial<Palette>;
  frame?: number;
};

export const keyGlowMeta: SceneMeta = {
  id: 'key-glow',
  does: 'a dark wall of keycaps; one key per item lights with a bloom pool and the camera travels from key to key',
  dur: KEYS.dur,
  props: ['items'],
  handIn: null,
  handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 },
  klass: 'big',
  cues: [
    { f: 3, kind: 'tick', id: 'key-1', weight: 0.8 },
    { f: 23, kind: 'whoosh', id: 'key-tilt', weight: 0.5 },
    { f: 31, kind: 'tick', id: 'key-2', weight: 0.8 },
    { f: 45, kind: 'whoosh', id: 'key-glide', weight: 0.5 },
    { f: 51, kind: 'tick', id: 'key-3', weight: 0.8 },
    { f: 65, kind: 'whoosh', id: 'key-exit', weight: 0.9 },
  ],
};

/** The camera at scene frame t: the world point at the stage centre and the scale. */
export const keyCamera = (t: number) => {
  const K = KEYS;
  if (t <= K.glide.from) {
    const k = K.camera.map((r) => [r[0], r[1], r[2], r[3]] as const);
    const cx = tab(t, k.map((r) => [r[0], r[1]] as const));
    const cy = tab(t, k.map((r) => [r[0], r[2]] as const));
    // the tilt (23-39) eases in and out; the hold before it creeps
    const tilt = bezier(0.45, 0, 0.3, 1)(span(t, 23, 39));
    const base = K.camera[2];
    const end = K.camera[3];
    const inTilt = t > 23 && t < 39;
    return {
      x: inTilt ? base[1] + (end[1] - base[1]) * tilt : cx,
      y: inTilt ? base[2] + (end[2] - base[2]) * tilt : cy,
      s: tab(t, k.map((r) => [r[0], r[3]] as const)),
    };
  }
  const last = K.camera[K.camera.length - 1];
  const p = span(t, K.glide.from, K.glide.to);
  const e = 1 - Math.pow(1 - p, 3.2); // expo-like out: peak speed in the first frames
  const s = K.glide.s[0] + (K.glide.s[1] - K.glide.s[0]) * e;
  let x = last[1] + K.glide.dx * e;
  const y = last[2] + K.glide.dy * e;
  const tail = t - (K.dur - K.exit.length);
  if (tail > 0) {
    let px = 0;
    for (let i = 0; i < K.exit.length; i++) px += K.exit[i] * Math.min(1, Math.max(0, tail - i));
    x += px / s;
  }
  return { x, y, s };
};

/** A lit key's light 0..1 at scene frame t. */
export const keyLight = (t: number, i: number) => {
  const sl = KEYS.slots[i];
  return bezier(...KEYS.light)(span(t, sl.at, sl.full));
};

export const KeyGlow: React.FC<KeyGlowProps> = ({ items, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf({ ground: KEYS.ground, ink: '#F4F5F9', ...palette });
  const floor = mixColor(pal.accent, KEYS.ground, 0.72);
  const K = KEYS;
  const cam = keyCamera(t);
  const used = items.slice(0, K.slots.length);
  // which keys hold a label (to the left of each lit key) and how many keys the label takes
  const labelKeys = used.map((it, i) => ({ i, n: it.label.length > 6 ? 2 : 1, ...K.slots[i] }));
  const cols = 9;
  const rows = 6;
  const keyX = (c: number) => K.origin.x + c * K.pitch.x;
  const keyY = (r: number) => K.origin.y + r * K.pitch.y;
  const cells: { c: number; r: number; span: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const lab = labelKeys.find((l) => l.row === r && c >= l.col - l.n && c < l.col);
      if (lab && c !== lab.col - lab.n) continue;
      cells.push({ c, r, span: lab ? lab.n : 1 });
    }
  }
  const glow = mixColor(pal.accent, '#FFFFFF', 0.62);
  return (
    <Stage1080 W={W} H={H} ground={pal.ground}>
      {/* the night floor: a deep glow along the bottom of the frame, showing through the keys and their gaps */}
      <div style={{ position: 'absolute', left: 0, top: 560, width: 1920, height: 520, background: `linear-gradient(180deg, ${rgba(floor, 0)} 0%, ${rgba(floor, 0.75)} 50%, ${rgba(mixColor(floor, pal.accent, 0.4), 1)} 100%)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(960px, 540px) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)` }}>
        {cells.map(({ c, r, span: n }) => {
          const w = K.key.w + (n - 1) * K.pitch.x;
          return (
            <div
              key={`${c}:${r}`}
              style={{
                position: 'absolute',
                left: keyX(c),
                top: keyY(r),
                width: w,
                height: K.key.h,
                borderRadius: K.key.r,
                background: `linear-gradient(180deg, ${rgba(K.face, 0.93)} 0%, ${rgba(K.face, 0.8)} 100%)`,
                boxShadow: `inset 0 1px 0 ${K.edge}, inset 0 -18px 30px rgba(0,0,0,0.35)`,
              }}
            />
          );
        })}
        {used.map((it, i) => {
          const sl = K.slots[i];
          const L = keyLight(t, i);
          const x = keyX(sl.col);
          const y = keyY(sl.row);
          const { w, h, r } = K.key;
          const lab = labelKeys[i];
          const labelX = keyX(sl.col - lab.n);
          const labelW = K.key.w + (lab.n - 1) * K.pitch.x;
          const labelOn = E.snapOut(i === 0 ? span(t, sl.at - 3, sl.at) : span(t, sl.at - 8, sl.at - 5));
          return (
            <React.Fragment key={i}>
              {/* the bloom pool: the accent spreading about a key width past the key (light under the caps, not a flat fill) */}
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x - w * 0.95}px, ${y - h * 0.95}px)`, width: w * 2.9, height: h * 2.9, borderRadius: '50%', background: `radial-gradient(closest-side, ${rgba(pal.accent, 0.75 * L)} 0%, ${rgba(pal.accent, 0.38 * L)} 42%, ${rgba(pal.accent, 0.1 * L)} 72%, ${rgba(pal.accent, 0)} 100%)`, mixBlendMode: 'screen' }} />
              {/* the key face lit from below: the accent rising from its lower right, the cap's top still dark */}
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, width: w, height: h, borderRadius: r, overflow: 'hidden', opacity: L }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 95% 95% at 62% 78%, ${rgba(mixColor(pal.accent, '#FFFFFF', 0.12), 0.95)} 0%, ${rgba(pal.accent, 0.8)} 38%, ${rgba(mixColor(pal.accent, K.face, 0.55), 0.55)} 80%, ${rgba(K.face, 0.3)} 100%)` }} />
                {/* the rim: a pale band down the right edge and along the foot */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 46, background: `linear-gradient(90deg, ${rgba(glow, 0)} 0%, ${rgba(mixColor(glow, '#FFFFFF', 0.5), 0.9)} 100%)` }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: `linear-gradient(180deg, ${rgba(glow, 0)} 0%, ${rgba(mixColor(glow, '#FFFFFF', 0.3), 0.7)} 100%)` }} />
              </div>
              {/* the halo the rim throws over the neighbours: 120 px past the right edge, 80 px above and below */}
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x + w - 170}px, ${y - 90}px)`, width: 330, height: h + 200, borderRadius: '50%', background: `radial-gradient(closest-side, ${rgba(mixColor(glow, '#FFFFFF', 0.35), 0.95 * L)} 0%, ${rgba(glow, 0.6 * L)} 38%, ${rgba(glow, 0)} 100%)`, filter: 'blur(16px)', mixBlendMode: 'screen' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x - 10}px, ${y + h - 90}px)`, width: w + 120, height: 200, borderRadius: '50%', background: `radial-gradient(closest-side, ${rgba(mixColor(glow, '#FFFFFF', 0.2), 0.75 * L)} 0%, ${rgba(glow, 0)} 100%)`, mixBlendMode: 'screen' }} />
              <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x + w / 2 - 50}px, ${y + h / 2 - 50}px)`, opacity: 0.85 + 0.15 * L }}>
                <Glyph name={it.glyph} size={100} color="#FFFFFF" weight={2} />
              </div>
              <div
                data-text={`key-label-${i}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: `translate(${labelX}px, ${y}px)`,
                  width: labelW,
                  height: h,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT.text,
                  fontWeight: 500,
                  fontSize: 80,
                  letterSpacing: '-0.01em',
                  color: pal.ink,
                  opacity: labelOn * (0.45 + 0.55 * L),
                  whiteSpace: 'nowrap',
                }}
              >
                {it.label}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </Stage1080>
  );
};
