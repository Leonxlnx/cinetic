// TaskRun (ui, build): rows join a card one by one with a spinner that closes to a check as the next arrives, the
// cadence accelerating.
// Numbers: gaps 12, 11, 10, 8, 6, 5, 4, 3, 3 f; a row rises 20 px in 4 f; the tick draws in 5 f; scroll one row in 6
// f.
// Caution: leave 10 f after doneAt before cutting.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { CheckDisc, type Look, MarkSlot, surfaceStyle, useUiFrame, withPace } from './_shared';

/**
 * A task run: rows join a card one by one (fade, rise 20 px, 4 f) with a spinner stepping 45 degrees a frame and a
 * muted "working" label; when the next row arrives the previous one closes: its spinner becomes a filled check, the
 * label crosses to the done word and its title steps up to the ink. The cadence accelerates (default intervals 9, 9, 9,
 * 7, 5, 4, 3, 3), and the card scrolls one row (6 f ease-out) once `show` rows are full. The last row closes at
 * `doneAt`.
 */
const TaskRunInner: React.FC<{
  L: Look;
  tasks: string[];
  at: number;
  gaps?: number[];
  working?: string;
  done?: string;
  doneAt?: number;
  x?: number;
  y?: number;
  w?: number;
  show?: number;
  size?: number;
  /** A header line over the list, with a live "n of N" count at its right. */
  title?: string;
  /** The app's real logo beside the title. */
  mark?: React.ReactNode;
  speed?: number;
}> = ({ L, tasks, at: start, gaps = [12, 11, 10, 8, 6, 5, 4, 3, 3], working = 'Working', done = 'Done', doneAt, x: xIn, y: yIn, w = 980, show = 6, size = 32, title, mark, speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const T: number[] = [start];
  for (let i = 1; i < tasks.length; i++) T.push(T[i - 1] + (gaps[i - 1] ?? 3));
  const close = (i: number) => (i + 1 < tasks.length ? T[i + 1] : doneAt !== undefined ? start + doneAt : Infinity);
  const rowH = size * 2.1;
  const pad = size * 0.8;
  const headH = title ? size * 2.6 : 0;
  const H = show * rowH + pad * 2 + headH;
  let doneN = 0;
  for (let i = 0; i < tasks.length; i++) if (frame >= close(i)) doneN++;
  let scroll = 0;
  for (let i = show; i < tasks.length; i++) scroll += at(frame, T[i], 6, ease.out);
  const enter = springAt(frame, 30, start - 10, springs.ui);
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - H / 2, width: w, height: H, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 30, 0)}px)` }}>
      <div style={{ ...surfaceStyle(L, 3, size * 1.1), position: 'absolute', inset: 0 }} />
      {title && (
        <div style={{ position: 'absolute', left: pad * 1.25, right: pad * 1.25, top: pad, height: headH - pad * 0.4, display: 'flex', alignItems: 'center', fontFamily: L.font, borderBottom: `1px solid ${L.line}` }}>
          <MarkSlot mark={mark} icon="Store" colors={['#5B86FF', '#2350E6']} size={size * 1.4} />
          <div style={{ flex: 1, fontSize: size * 1.05, fontWeight: 620, color: L.ink, letterSpacing: '-0.012em', marginLeft: size * 0.55 }}>{title}</div>
          <div style={{ fontSize: size * 0.92, color: L.muted, fontVariantNumeric: 'tabular-nums' }}>
            {doneN} of {tasks.length}
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', left: pad * 1.25, right: pad * 1.25, top: pad + headH, bottom: pad, overflow: 'hidden', WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${rowH * 0.5}px)` }}>
        {tasks.map((task, i) => {
          if (frame < T[i]) return null;
          const p = at(frame, T[i], 4, ease.out);
          const c = close(i);
          const isDone = frame >= c;
          const q = at(frame, c, 3, ease.out);
          return (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i - scroll) * rowH + mix(p, 20, 0), height: rowH, display: 'flex', alignItems: 'center', gap: size * 0.6, fontFamily: L.font, fontSize: size, opacity: p }}>
              <div style={{ width: size * 1.1, height: size * 1.1, flexShrink: 0, position: 'relative' }}>
                {!isDone ? <StepSpinner size={size * 1.1} color={L.accent} track={L.line} since={T[i]} /> : <CheckDisc size={size * 1.1} color={L.accent} at={c} />}
              </div>
              <div style={{ width: size * 6.2, color: isDone ? L.faint : L.muted, flexShrink: 0, whiteSpace: 'nowrap' }}>{isDone ? done : `${working}…`}</div>
              <div style={{ flex: 1, color: mixColor(L.muted, L.ink, isDone ? q : 0.55), fontWeight: isDone ? 600 : 500, whiteSpace: 'nowrap' }}>{task}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StepSpinner: React.FC<{ size: number; color: string; track: string; since: number }> = ({ size, color, track, since }) => {
  const frame = useUiFrame();
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: `rotate(${(frame - since) * 45}deg)` }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${c * 0.3} ${c}`} />
    </svg>
  );
};

export const TaskRun = withPace(TaskRunInner);
