// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// type-flip: full-frame type cut on single frames: a giant word rides in on the accent, jumps into a type poster that builds
// word by word on a paper grid, the call to act builds white on the accent, then the colours flip and it leaves.
//
// Four grounds, every change a cut on one or two frames (a 24 fps clock, snappy): (1) the accent slides in carrying one
// giant white word that brakes leftward and creeps; (2) the word turns ink and jumps to the top left of a paper ground
// with a fine grid while the rest of the line builds round it, a row or a word per frame, ink then accent, a corner arrow,
// the last two words spreading to their gap while everything creeps up; (3) the accent again: the call's first word rises
// white at the centre, cuts to the left as the row completes, small labels type in at the left, the second row slides in from the right; for one frame the white
// dims toward the accent; (4) the flip: paper ground, the same layout in the accent, the last row lands spread and closes,
// then the rows slide apart (first and last right, the middle left) into the cut. 1.9 s. Big (a colour flood).
//
// Numbers (1080p px, 24 fps): the giant word ~1000 px wide, cap 210, left edge 650 310 245 210 then 200; poster cap ~150
// (rows fitted to 1700 px), grid 30 px; call rows at y 70-370, 360-690, 690-980 (left, right, centre), labels cap 20 at
// y 600-680; exit velocity build over 5 f.
import React from 'react';
import { FONT } from '../brand/tokens';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { paletteOf, type Palette, type SceneMeta, useClock } from './parts';
import { rgba, Stage1080 } from './stage1080';

export const FLIP = {
  dur: 56,
  fps: 24,
  phase: { ride: 0, poster: 8, call: 22, dim: 33, flip: 34, exit: 40, end: 44 },
  ride: { panel: [1150, 420, 90, 0] as const, left: [900, 650, 310, 245, 210, 205, 200, 196] as const, width: 1000, maxWidth: 1500 },
  poster: { maxWidth: 1700, maxSize: 300, track: -0.05, rowY: [12, 192, 382, 568, 822] as const, align: ['left', 'right', 'left', 'centre', 'spread'] as const },
  call: { size: 300, track: -0.05, rowY: [70, 360, 690] as const },
  grid: 30,
} as const;

export type TypeFlipProps = {
  /** the giant opening word (it becomes the poster's first word) */
  word: string;
  /** the rest of the line, built round it on the poster (up to six words) */
  line: string;
  /** the call to act, built over three rows (e.g. three to five words) */
  call: string;
  /** up to three small labels typed in at the left during the call */
  labels?: string[];
  palette?: Partial<Palette>;
  frame?: number;
};

export const typeFlipMeta: SceneMeta = {
  id: 'type-flip',
  does: 'a giant word rides in on the accent, jumps into a type poster built word by word, the call builds white on the accent and the colours flip',
  dur: FLIP.dur,
  props: ['word', 'line', 'call', 'labels'],
  handIn: null,
  handOut: { form: 'word', x: 110, y: 70, w: 1700, h: 910 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'flip-ride', weight: 0.7 },
    { f: 10, kind: 'snap', id: 'flip-poster', weight: 0.8 },
    { f: 28, kind: 'hit', id: 'flip-call', weight: 0.9 },
    { f: 43, kind: 'snap', id: 'flip-colour', weight: 0.9 },
    { f: 50, kind: 'whoosh', id: 'flip-exit', weight: 0.6 },
  ],
};

type Row = { words: string[]; ink: 'ink' | 'accent'; align: 'left' | 'right' | 'centre' | 'spread'; y: number; at: number[] };

/** The poster's rows: the word (with a full stop), then the line's words, two rows of ink then accent rows. */
export const posterRows = (word: string, line: string): Row[] => {
  const w = line.split(/\s+/).filter(Boolean).slice(0, 6);
  const rows: string[][] = [[`${word}.`]];
  if (w.length <= 3) w.forEach((x) => rows.push([x]));
  else {
    rows.push([w[0]]);
    rows.push([w[1]]);
    rows.push([w[2]]);
    rows.push(w.slice(3));
  }
  const P = FLIP.poster;
  // the build (24 fps frames from the poster's first frame): rows 0-2 at once, row 1 sliding, row 3 at +4, the last at +6
  const ats = [[0], [0], [0], [4], [6, 6, 6]];
  return rows.slice(0, 5).map((r, i) => ({ words: r, ink: i < 2 ? 'ink' : 'accent', align: P.align[i], y: P.rowY[i], at: r.map((_, j) => (ats[i] ?? [5])[j] ?? 5) }));
};

/** The call's rows: [first two words], [the third], [the rest]. */
export const callRows = (call: string) => {
  const w = call.split(/\s+/).filter(Boolean);
  if (w.length <= 2) return [w.slice(0, 1), w.slice(1), []];
  return [w.slice(0, 2), w.slice(2, 3), w.slice(3)];
};

export const TypeFlip: React.FC<TypeFlipProps> = ({ word, line, call, labels = [], palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf({ ground: '#FDFBFD', ink: '#0E0B0F', ...palette });
  const F = FLIP;
  const u = Math.floor((t * F.fps) / 30 + 1e-6); // the 24 fps clock: every change lands on a whole frame
  const ph = F.phase;
  const font = FONT.text;
  const tw = (s: string, size: number, wt = 600) => measureTracked(s, size, wt, F.poster.track, font);
  const T: React.CSSProperties = { position: 'absolute', fontFamily: font, fontWeight: 600, letterSpacing: `${F.poster.track}em`, lineHeight: 1, whiteSpace: 'nowrap' };

  // ---- (1) the ride: the accent slides in carrying the giant word
  if (u < ph.poster) {
    const size0 = 300;
    const w0 = tw(word, size0);
    const size = Math.min(size0 * (F.ride.width / w0), size0 * (F.ride.maxWidth / w0), 380);
    const panel = F.ride.panel[Math.min(F.ride.panel.length - 1, u)];
    const left = F.ride.left[Math.min(F.ride.left.length - 1, u)];
    return (
      <Stage1080 W={W} H={H} ground={pal.ground}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${panel}px, ${0}px)`, width: 1920, height: 1080, background: pal.accent }}>
          <div data-text="flip-word" style={{ ...T, left: 0, top: 0, transform: `translate(${left - panel}px, ${590 - size * 0.27}px)`, fontSize: size, color: '#FFFFFF' }}>{word}</div>
        </div>
      </Stage1080>
    );
  }

  // ---- (2) the poster on the paper grid
  if (u < ph.call) {
    const k = u - ph.poster; // 0 = the jump frame (still on the accent)
    const rows = posterRows(word, line);
    const widest = Math.max(...rows.map((r) => tw(r.words.join(' '), 300)));
    const size = Math.min(F.poster.maxSize, (300 * F.poster.maxWidth) / widest);
    const creep = Math.max(0, k - 6);
    const onAccent = k === 0;
    return (
      <Stage1080 W={W} H={H} ground={onAccent ? pal.accent : pal.ground}>
        {!onAccent && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${rgba(mixColor(pal.ground, pal.ink, 0.12), 1)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(mixColor(pal.ground, pal.ink, 0.12), 1)} 1px, transparent 1px)`, backgroundSize: `${F.grid}px ${F.grid}px` }} />
        )}
        {!onAccent && k >= 1 && <CornerArrow x={1696} y={38 - creep} size={174} color={pal.accent} />}
        {rows.map((r, i) => {
          if (onAccent && i > 1) return null;
          const shown = r.words.filter((_, j) => k >= r.at[j] + (i === 1 ? 0 : 0));
          if (!shown.length) return null;
          const text = r.words.join(' ');
          const wRow = tw(text, size);
          const y = r.y - creep;
          const color = r.ink === 'ink' ? pal.ink : pal.accent;
          if (r.align === 'spread') {
            // the last row lands close together and spreads to its gap
            const gap = size * (0.18 + 0.5 * Math.min(1, Math.max(0, (k - 6) / 5)));
            const ws = r.words.map((x) => tw(x, size));
            const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
            let x = 960 - total / 2;
            return r.words.map((x0, j) => {
              const el = <div key={`${i}-${j}`} style={{ ...T, left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, fontSize: size, color }}>{x0}</div>;
              x += ws[j] + gap;
              return el;
            });
          }
          // row 1 slides in from the right on its first frames
          const slide = i === 1 ? [1500, 520, 140, 0][Math.min(3, k)] : 0;
          const left = r.align === 'left' ? 124 : r.align === 'right' ? 1900 - wRow : 960 - wRow / 2;
          return <div key={i} data-text={`flip-row-${i}`} style={{ ...T, left: 0, top: 0, transform: `translate(${left + slide}px, ${y}px)`, fontSize: size, color: onAccent && i === 0 ? pal.ink : color }}>{text}</div>;
        })}
      </Stage1080>
    );
  }

  // ---- (3) the call, white on the accent, and (4) the flip
  const flip = u >= ph.flip;
  const k = u - ph.call;
  const rows = callRows(call);
  const widest = Math.max(...rows.map((r) => tw(r.join(' '), 300)), 1);
  const size = Math.min(F.call.size, (300 * 1780) / widest);
  const exit = Math.max(0, u - ph.exit);
  const v = [0, 18, 52, 120, 240, 420][Math.min(5, exit)];
  const colour = flip ? pal.accent : u === ph.dim ? mixColor('#FFFFFF', pal.accent, 0.6) : '#FFFFFF';
  // the first row rises into place: from y 560 to 300 to its slot
  const rise = [520, 330, 210, 130, 95, 80, F.call.rowY[0]];
  const row0Y = rise[Math.min(rise.length - 1, k)];
  const row0 = k < 5 ? rows[0].slice(0, 1) : rows[0];
  const row1In = [1920, 1500, 1180, 1000][Math.min(3, Math.max(0, k - 6))];
  const lab = labels.slice(0, 3);
  const labelAt = [0, 1, 3];
  return (
    <Stage1080 W={W} H={H} ground={flip ? pal.ground : pal.accent}>
      <div data-text="flip-call-0" style={{ ...T, left: 0, top: 0, transform: `translate(${(k < 5 ? 960 - tw(row0.join(' '), size) / 2 : 110) + v}px, ${row0Y}px)`, fontSize: size, color: colour }}>{row0.join(' ')}</div>
      {k >= 6 && rows[1].length > 0 && (
        <div data-text="flip-call-1" style={{ ...T, left: Math.max(1900 - tw(rows[1].join(' '), size), 700) + (row1In - 1000) * (k < 10 ? 1 : 0) - v, top: F.call.rowY[1], fontSize: size, color: colour }}>{rows[1].join(' ')}</div>
      )}
      {flip && rows[2].length > 0 && (() => {
        const kk = u - ph.flip;
        const n = rows[2].length;
        const ws = rows[2].map((x) => tw(x, size));
        const gap = kk === 1 ? size * 0.9 : size * 0.22;
        const total = ws.reduce((a, b) => a + b, 0) + gap * (n - 1);
        let x = 960 - total / 2;
        return rows[2].map((w0, j) => {
          const el = kk >= 1 || j === n - 1 ? <div key={j} style={{ ...T, left: 0, top: 0, transform: `translate(${x + v}px, ${F.call.rowY[2]}px)`, fontSize: size, color: colour }}>{w0}</div> : null;
          x += ws[j] + gap;
          return el;
        });
      })()}
      {lab.map((l, i) =>
        k >= labelAt[i] ? (
          <div key={i} data-text={`flip-label-${i}`} style={{ position: 'absolute', left: 140 + i * 320, top: 600, width: 260, fontFamily: font, fontWeight: 450, fontSize: 36, lineHeight: 1.15, letterSpacing: '-0.01em', textTransform: 'uppercase', color: pal.ink }}>{l}</div>
        ) : null,
      )}
    </Stage1080>
  );
};

/** The corner arrow: a thick chevron corner with a diagonal shaft (pointing up and right). */
const CornerArrow: React.FC<{ x: number; y: number; size: number; color: string }> = ({ x, y, size, color }) => {
  const s = size;
  const k = s * 0.22;
  return (
    <svg width={s} height={s} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px)` }} viewBox={`0 0 ${s} ${s}`}>
      <path d={`M ${s * 0.18} 0 L ${s} 0 L ${s} ${s * 0.82} L ${s - k} ${s * 0.82} L ${s - k} ${k * 1.6} L ${k * 0.7} ${s} L 0 ${s - k * 0.7} L ${s - k * 1.6} ${k} L ${s * 0.18} ${k} Z`} fill={color} />
    </svg>
  );
};
