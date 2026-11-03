// bar-flood: one element of the product shrinks to a bar, flips to the accent, sinks, then grows from its centre until it
// is the whole frame; on that colour the product's lockup assembles and a small kicker lands at its lower left.
//
// On a dark ground with a faint dashed grid, the element (a card the spine hands in) shrinks in three frames, turns into a
// bar of the accent, sinks 20 px on an ease-out, then grows from its centre on an ease-in (slow, slow, then the frame in
// four frames) while its centre travels to the frame's centre. On the full colour the lockup builds: the mark slides in
// from the left and its parts converge from far apart, the name stands as a pale ghost that fills to ink; the kicker
// flies in large and soft and lands at the lockup's lower left; a slight pull back leaves into the cut. The picture moves
// on twos (a 25 fps table held as measured): the steppy cadence is part of the look. 1.7 s. Big (a full colour flood).
//
// Numbers (1080p px, measured at 25 fps): cell 412 x 229 -> 306 x 128 -> 274 x 95, the bar sinks 20 px over 10 f, then
// grows 277 -> 1193 -> 1911 px wide in 9 f; lockup cap 360 px centred; mark in from x -78 px over 12 f, parts converge
// from 1.9x apart; ghost at 42 % white for 4 f, then ink; kicker cap 26 px, in from 2.2x and 180 px left.
import React from 'react';
import { FONT } from '../brand/tokens';
import { type Logo, LogoMark } from '../brand/Mark';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { markOf, paletteOf, type Palette, type SceneMeta, useClock } from './parts';
import { rgba, Stage1080 } from './stage1080';

type Box4 = readonly [number, number, number, number];

export const FLOOD = {
  dur: 51,
  fps: 25,
  // the element's box per 25 fps frame (x0, y0, x1, y1): shrink, flip, sink, grow (the repeats are the measured holds)
  box: [
    [747, 724, 1159, 953], [799, 800, 1105, 928], [799, 800, 1105, 928], [816, 830, 1090, 925], [814, 834, 1091, 933],
    [814, 840, 1091, 939], [814, 840, 1091, 939], [814, 845, 1091, 943], [814, 848, 1091, 946], [814, 848, 1091, 946],
    [814, 850, 1091, 948], [814, 852, 1091, 950], [814, 852, 1091, 950], [814, 853, 1091, 953], [814, 853, 1091, 953],
    [808, 848, 1097, 955], [794, 834, 1111, 956], [794, 834, 1111, 956], [766, 805, 1139, 961], [766, 805, 1139, 961],
    [707, 744, 1197, 971], [356, 376, 1549, 1029], [356, 376, 1549, 1029], [106, 114, 1799, 1068], [106, 114, 1799, 1068],
    [44, 48, 1861, 1078], [11, 14, 1894, 1079], [11, 14, 1894, 1079], [0, 0, 1911, 1079], [0, 0, 1911, 1079], [0, 0, 1920, 1080],
  ] as readonly Box4[],
  flip: 4, // the frame (25 fps) it turns into the accent
  full: 30, // the frame the colour fills the picture
  // lockup per 25 fps frame from the flood's growth: mark x offset (px), parts' spread, name ghost (1 ghost, 0 ink), name x offset
  mark: [[21, -78], [23, -49], [25, -31], [26, -19], [28, -10], [30, -4], [33, 0]] as const,
  spread: [[23, 1.9], [25, 1.55], [26, 1.3], [28, 1.12], [30, 1.05], [33, 1]] as const,
  ghost: { until: 26, dark: 28 },
  nameDx: [[21, 25], [28, 25], [30, 14], [31, 6], [33, 0], [35, -4], [38, -8]] as const,
  kicker: [[24, 2.2, -180, -140, 0], [25, 1.5, -150, -78, 1], [27, 1.0, -150, 0, 1], [29, 1.0, -89, 0, 1], [30, 1.0, 0, 0, 1], [38, 1, 0, 0, 1], [39, 1, 0, 18, 1], [40, 1, 0, 48, 1]] as const,
  pull: [[38, 1], [40, 0.985], [41, 0.97]] as const,
  cap: 360,
  width: 980, // the lockup is held to about half the frame's width (the measured one is 653 px for three glyphs)
  ground: '#000000',
} as const;

export type BarFloodProps = {
  /** the product's name, set beside its mark */
  name: string;
  logo?: Logo;
  /** the small line that lands at the lockup's lower left (e.g. the word for a launch) */
  kicker?: string;
  /** the element before it shrinks: a short label drawn in it (its two text bars otherwise) */
  cell?: string;
  palette?: Partial<Palette>;
  frame?: number;
};

export const barFloodMeta: SceneMeta = {
  id: 'bar-flood',
  does: 'an element shrinks to a bar, flips to the accent, sinks, then floods the frame; the lockup assembles on the colour',
  dur: FLOOD.dur,
  props: ['name', 'logo', 'kicker', 'cell'],
  handIn: { form: 'card', x: 747, y: 724, w: 412, h: 229, r: 18 },
  handOut: { form: 'mark', x: 637, y: 355, w: 653, h: 369 },
  klass: 'big',
  cues: [
    { f: 4, kind: 'snap', id: 'flood-flip', weight: 0.7 },
    { f: 18, kind: 'riser', id: 'flood-grow', weight: 0.7 },
    { f: 31, kind: 'hit', id: 'flood-full', weight: 1.1 },
    { f: 34, kind: 'pop', id: 'flood-lockup', weight: 0.6 },
  ],
};

const linear = (u: number, k: readonly (readonly number[])[], col = 1) => {
  if (u <= k[0][0]) return k[0][col];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) return k[i - 1][col] + ((k[i][col] - k[i - 1][col]) * (u - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][col];
};

/** The flood state at scene frame t: the element's box, whether it is the accent, the 25 fps frame (held on twos). */
export const floodState = (t: number) => {
  const u = Math.floor((t * FLOOD.fps) / 30 + 1e-6); // the table's own frame (holds as measured)
  const b = FLOOD.box[Math.min(FLOOD.box.length - 1, Math.max(0, u))];
  return { u, box: { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] }, accent: u >= FLOOD.flip, full: u >= FLOOD.full };
};

/** The ink that reads on the accent (the palette's ink or its paper, whichever contrasts more). */
const lum = (hex: string) => {
  const s = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export const BarFlood: React.FC<BarFloodProps> = ({ name, logo, kicker, cell, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf(palette);
  const F = FLOOD;
  const st = floodState(t);
  const u = st.u;
  const ground = mixColor(F.ground, pal.ink, 0.15);
  const onAccent = lum(pal.accent) > 0.35 ? pal.ink : pal.paper;
  const mark = markOf(logo);
  const fit = Math.min(1, F.width / (F.cap * 1.22 + measureTracked(name, F.cap * 1.32, 600, -0.03)));
  const cap = F.cap * fit;
  const nameSize = cap * 1.32;
  const nameW = measureTracked(name, nameSize, 600, -0.03);
  const markW = cap * 1.02;
  const gap = cap * 0.2;
  const total = markW + gap + nameW;
  const x0 = 960 - total / 2;
  const pull = linear(u, F.pull);
  const markDx = linear(u, F.mark);
  const spread = linear(u, F.spread);
  const nameDx = linear(u, F.nameDx);
  const ghost = u < F.ghost.until ? 1 : u < F.ghost.dark ? 0.5 : 0;
  const nameInk = ghost === 1 ? mixColor(pal.accent, '#FFFFFF', 0.42) : ghost === 0.5 ? mixColor(pal.accent, onAccent, 0.6) : onAccent;
  const showLockup = u >= 21;
  const kk = F.kicker;
  const kS = linear(u, kk, 1);
  const kX = linear(u, kk, 2);
  const kY = linear(u, kk, 3);
  const kO = u < kk[0][0] ? 0 : 1;
  const kBlur = Math.max(0, (kS - 1) * 6);
  const b = st.box;
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
          transform: `translate(${b.x}px, ${b.y}px)`,
          width: b.w,
          height: b.h,
          background: st.accent ? pal.accent : mixColor(pal.paper, pal.accent, 0.12),
          borderRadius: st.full ? 0 : Math.min(18, b.h * 0.12),
          overflow: 'hidden',
        }}
      >
        {!st.accent && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: b.h * 0.12, padding: `0 ${b.w * 0.09}px` }}>
            {cell ? (
              <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: b.h * 0.2, color: pal.ink, whiteSpace: 'nowrap' }}>{cell}</div>
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
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${pull})`, transformOrigin: '960px 540px' }}>
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
              style={{ // focus-in
                position: 'absolute',
                right: 1920 - (x0 - cap * 0.08),
                top: 540 + markW / 2 - 40,
                transform: `translate(${kX}px, ${kY}px) scale(${kS})`,
                transformOrigin: '100% 100%',
                fontFamily: FONT.text,
                fontWeight: 400,
                fontSize: 36,
                color: onAccent,
                // focus-in: the kicker flies in large and soft and lands sharp
                filter: kBlur > 0.3 ? `blur(${kBlur}px)` : undefined,
                whiteSpace: 'nowrap',
              }}
            >
              {kicker}
            </div>
          )}
        </div>
      )}
    </Stage1080>
  );
};

