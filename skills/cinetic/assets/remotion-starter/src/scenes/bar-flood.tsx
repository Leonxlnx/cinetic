// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// bar-flood: one element of the product shrinks to a bar, turns to the accent, sinks, then grows from its centre until it
// is the whole frame; on that colour the product's lockup assembles, a band of light crosses it and it keeps creeping in;
// a kicker, when there is one, lands under it at a size that reads (a cap of 3.6 % of the frame) or is left out.
//
// On a dark ground with a faint dashed grid, the element (a card the spine hands in, big: 840 x 470 px at the centre)
// shrinks in 3 frames to a wide bar (620 x 160: never a speck on the empty ground), turns to the accent over 2 frames
// and, straight on (one continuous move), floods out from its centre at speed, sinking a touch, while its centre
// travels to the frame's centre, and settles over the frame with room to spare (no edge strip). On the full colour the lockup
// builds: the mark slides in from the left and its parts converge from far apart, the name stands as a pale ghost that
// fills to ink; then a soft band of light crosses the lockup and the whole keeps creeping in to its last frame (never a
// still end card). Every move is continuous at the film's rate (no held frames, no one-frame flip). Big.
//
// Numbers (1080p px; the tables in 25 fps units u = t x 25 / 30, read continuously): card 840 x 470 -> bar 620 x 160 by
// u 2.5, accent over u 1.6-4.0, then an ease-out flood from u 4 to full at u 20 (sinking up to 14 px on the way); lockup cap
// 360 px centred, mark in from x -78 px over u 15-27, parts converge from 1.9x apart; ghost until u 20, then ink; light
// band u 29-42; creep 1 -> 1.025 from u 24 to the end; kicker cap 39 px, in from u 23. 1.8 s.
import React from 'react';
import { FONT } from '../brand/tokens';
import { type Logo, LogoMark } from '../brand/Mark';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { markOf, paletteOf, type Palette, type SceneMeta, useClock } from './parts';
import { rgba, Stage1080 } from './stage1080';

export const FLOOD = {
  dur: 54,
  fps: 25,
  card: { x: 540, y: 305, w: 840, h: 470 }, // the element handed in
  bar: { x: 650, y: 455, w: 620, h: 160 }, // the bar it becomes
  shrink: 2.5, // u: the bar formed
  flip: 4, // u: it is the accent (the colour turns over u 3.4-4.4)
  sink: 14, // px the bar sinks as it starts to grow
  full: 20, // u: the colour fills the picture
  // lockup per 25 fps unit from the flood's growth: mark x offset (px), parts' spread, name ghost (1 ghost, 0 ink), name x offset
  mark: [[15, -78], [17, -49], [19, -31], [20, -19], [22, -10], [24, -4], [27, 0]] as const,
  spread: [[17, 1.9], [19, 1.55], [20, 1.3], [22, 1.12], [24, 1.05], [27, 1]] as const,
  ghost: { until: 20, dark: 22 },
  nameDx: [[15, 25], [22, 25], [24, 14], [25, 6], [27, 0], [29, -4], [32, -6]] as const,
  kicker: [[23, 1.6, 0, 40, 0], [24, 1.3, 0, 22, 1], [26, 1.0, 0, 0, 1]] as const,
  light: [29, 42] as const,
  creep: [24, 1.025] as const,
  cap: 360,
  kickerCap: 0.036, // the kicker's cap as a share of the frame height (legible, never a footnote)
  width: 980, // the lockup is held to about half the frame's width (the measured one is 653 px for three glyphs)
  ground: '#000000',
} as const;

export type BarFloodProps = {
  /** the product's name, set beside its mark */
  name: string;
  logo?: Logo;
  /** a short line under the lockup (e.g. the word for a launch), set at a cap of 3.6 % of the frame; empty: none */
  kicker?: string;
  /** the element before it shrinks: a short label drawn in it (its two text bars otherwise) */
  cell?: string;
  /** the element is handed in already in the accent (a chip): it starts as an accent card, no turn of colour */
  cellAccent?: boolean;
  palette?: Partial<Palette>;
  frame?: number;
};

export const barFloodMeta: SceneMeta = {
  id: 'bar-flood',
  does: 'an element shrinks to a bar, turns to the accent, sinks, then floods the frame; the lockup assembles on the colour, a light crosses it and it creeps in',
  dur: FLOOD.dur,
  props: ['name', 'logo', 'kicker', 'cell', 'cellAccent?'],
  handIn: { form: 'card', ...FLOOD.card, r: 18 },
  handOut: { form: 'mark', x: 637, y: 355, w: 653, h: 369 },
  klass: 'big',
  cues: [
    { f: 3, kind: 'pop', id: 'flood-bar', weight: 0.6 },
    { f: 6, kind: 'riser', id: 'flood-grow', weight: 0.7 },
    { f: 24, kind: 'hit', id: 'flood-full', weight: 1 },
    { f: 27, kind: 'pop', id: 'flood-lockup', weight: 0.6 },
  ],
};

const linear = (u: number, k: readonly (readonly number[])[], col = 1) => {
  if (u <= k[0][0]) return k[0][col];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) return k[i - 1][col] + ((k[i][col] - k[i - 1][col]) * (u - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][col];
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (q: number) => 1 - (1 - q) ** 3;

/** The flood state at scene frame t (continuous): the element's box, its share of the accent (0..1), whether it is the
 * accent and whether it fills the frame, in the table's 25 fps units `u`. */
export const floodState = (t: number) => {
  const F = FLOOD;
  const u = (t * F.fps) / 30;
  const c = F.card;
  const b0 = F.bar;
  let box: { x: number; y: number; w: number; h: number };
  if (u < F.shrink) {
    const q = easeOut(clamp01(u / F.shrink));
    box = { x: c.x + (b0.x - c.x) * q, y: c.y + (b0.y - c.y) * q, w: c.w + (b0.w - c.w) * q, h: c.h + (b0.h - c.h) * q };
  } else if (u < F.flip) {
    box = { ...b0 }; // the bar turns to the accent before it floods (the colour and the growth never mix in one frame)
  } else if (u < F.full) {
    // straight on from the shrink (no pause, one continuous move with the element's landing): the bar floods out from
    // its centre at speed and settles onto the whole frame (an ease-out), its last steps covering the corners softly
    const x = clamp01((u - F.flip) / (F.full - F.flip));
    const q = 1 - (1 - x) ** 3;
    const cx = 960;
    const sink = F.sink * Math.sin(Math.PI * Math.min(1, x * 2.2)) * (1 - q);
    const cy0 = b0.y + b0.h / 2;
    const cy = cy0 + (540 - cy0) * q + sink;
    const w = b0.w + (1920 + 48 - b0.w) * q;
    const h = b0.h + (1080 + 48 - b0.h) * q;
    box = { x: cx - w / 2, y: cy - h / 2, w, h };
  } else box = { x: -24, y: -24, w: 1968, h: 1128 }; // the whole frame with room to spare: no edge strip
  return { u, box, mix: clamp01((u - 1.6) / 2.4), accent: u >= F.flip, full: u >= F.full };
};

/** The ink that reads on the accent: the palette's ink or its paper, whichever has the higher contrast ratio with it. */
const lum = (hex: string) => {
  const s = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
export const floodInk = (palette?: Partial<Palette>) => {
  const pal = paletteOf(palette);
  return ratio(pal.ink, pal.accent) > ratio(pal.paper, pal.accent) ? pal.ink : pal.paper;
};
/** The element's box on screen at scene frame t (the card, the bar, the flood): the box a handover lands on. */
export const floodBox = (t: number) => floodState(t).box;

export const BarFlood: React.FC<BarFloodProps> = ({ name, logo, kicker, cell, cellAccent = false, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf(palette);
  const F = FLOOD;
  const st = floodState(t);
  const u = st.u;
  const ground = mixColor(F.ground, pal.ink, 0.15);
  const onAccent = floodInk(pal);
  const mark = markOf(logo);
  const fit = Math.min(1, F.width / (F.cap * 1.22 + measureTracked(name, F.cap * 1.32, 600, -0.03)));
  const cap = F.cap * fit;
  const nameSize = cap * 1.32;
  const nameW = measureTracked(name, nameSize, 600, -0.03);
  const markW = cap * 1.02;
  const gap = cap * 0.2;
  const total = markW + gap + nameW;
  const x0 = 960 - total / 2;
  const markDx = linear(u, F.mark);
  const spread = linear(u, F.spread);
  const nameDx = linear(u, F.nameDx);
  const ghost = u < F.ghost.until ? 1 : u < F.ghost.dark ? 0.5 : 0;
  const nameInk = ghost === 1 ? mixColor(pal.accent, '#FFFFFF', 0.42) : ghost === 0.5 ? mixColor(pal.accent, onAccent, 0.6) : onAccent;
  const showLockup = u >= F.mark[0][0];
  const lockA = clamp01((u - F.mark[0][0]) / 2.5); // the lockup comes in over 3 frames, never in one
  const creep = 1 + (F.creep[1] - 1) * clamp01((u - F.creep[0]) / ((F.dur * F.fps) / 30 - F.creep[0]));
  const kk = F.kicker;
  const kS = linear(u, kk, 1);
  const kY = linear(u, kk, 3);
  const kO = linear(u, kk, 4);
  const kickSize = (F.kickerCap * 1080) / 0.72;
  // the light band: a soft diagonal crossing the lockup once (screen, the accent lifted toward white)
  const lq = clamp01((u - F.light[0]) / (F.light[1] - F.light[0]));
  const lightX = -600 + lq * 3100;
  const b = st.box;
  const face = cellAccent ? pal.accent : mixColor(mixColor(pal.paper, pal.accent, 0.12), pal.accent, st.mix);
  return (
    <Stage1080 W={W} H={H} ground={ground}>
      {/* the faint dashed grid */}
      {!st.full && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {[547, 640, 1373].map((x) => (
            <line key={x} x1={x} y1={0} x2={x} y2={1080} stroke={rgba(pal.paper, 0.14)} strokeWidth={1.5} strokeDasharray="6 8" />
          ))}
          {[700, 980].map((y) => (
            <line key={y} x1={0} y1={y} x2={1920} y2={y} stroke={rgba(pal.paper, 0.1)} strokeWidth={1.5} strokeDasharray="6 8" />
          ))}
        </svg>
      )}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px)`,
          width: b.w,
          height: b.h,
          background: face,
          borderRadius: st.full ? 0 : Math.min(18, b.h * 0.12) * (1 - clamp01((u - 15) / 5)),
          overflow: 'hidden',
        }}
      >
        {st.mix < 1 && !cellAccent && (
          <div style={{ position: 'absolute', inset: 0, opacity: 1 - st.mix, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: b.h * 0.12, padding: `0 ${b.w * 0.09}px` }}>
            {cell ? (
              <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: Math.min(b.h * 0.22, 64), color: pal.ink, whiteSpace: 'nowrap' }}>{cell}</div>
            ) : (
              <>
                <div style={{ width: '58%', height: b.h * 0.1, borderRadius: b.h, background: rgba(pal.ink, 0.7) }} />
                <div style={{ width: '82%', height: b.h * 0.1, borderRadius: b.h, background: rgba(pal.ink, 0.25) }} />
              </>
            )}
          </div>
        )}
      </div>
      {showLockup && (
        <div style={{ position: 'absolute', inset: 0, opacity: lockA, transform: `scale(${creep.toFixed(5)})`, transformOrigin: '960px 540px' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x0 + markDx}px, ${540 - markW / 2}px)` }}>
            <LogoMark
              logo={mark}
              size={markW}
              fill={() => onAccent}
              poses={(p) => {
                const dy = (p.cy - 50) * (spread - 1) * 1.4;
                return { y: dy };
              }}
            />
          </div>
          <div
            data-text="scene-name"
            style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x0 + markW + gap + nameDx}px, ${540 - nameSize * 0.62}px)`, fontFamily: FONT.text, fontWeight: 600, fontSize: nameSize, letterSpacing: '-0.03em', lineHeight: 1.24, color: nameInk, whiteSpace: 'nowrap' }}
          >
            {name}
          </div>
          {kicker && kO > 0 && (
            <div
              data-text="scene-kicker"
              style={{
                position: 'absolute',
                left: 0,
                width: 1920,
                top: 540 + markW / 2 + cap * 0.35,
                textAlign: 'center',
                transform: `translate(0px, ${kY}px) scale(${kS})`,
                transformOrigin: '50% 0%',
                fontFamily: FONT.text,
                fontWeight: 500,
                fontSize: kickSize,
                color: onAccent,
                opacity: kO,
                whiteSpace: 'nowrap',
              }}
            >
              {kicker}
            </div>
          )}
          {lq > 0 && lq < 1 && (
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, mixBlendMode: 'screen', background: `linear-gradient(105deg, rgba(255,255,255,0) ${lightX - 260}px, ${rgba(mixColor(pal.accent, '#FFFFFF', 0.7), 0.22)} ${lightX}px, rgba(255,255,255,0) ${lightX + 260}px)` }} />
          )}
        </div>
      )}
    </Stage1080>
  );
};
