// SettingsCard (ui, build): a settings card driven by a pointer: a toggle, a segment and a slider changed one after
// another.
// Numbers: the pointer visits the controls in time order; toggle 9 f, segment and slider as their parts.
// Caution: one control changes at a time; everything else in the card stays still.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, type Ease, mix, springAt, springs } from '../../motion';
import { mixColor } from '../../type';
import { bez, type Look, MarkSlot, Paced, Pill, surfaceStyle, useUiFrame, withPace } from './_shared';
import { Pointer } from './Pointer';
import { ToggleSwitch } from './ToggleSwitch';
import { ValueSlider } from './ValueSlider';

export type SettingControl =
  | { kind: 'toggle'; on?: boolean; clickAt?: number }
  | { kind: 'slider'; keys: Array<{ f: number; v: number }>; format?: (v: number) => string }
  | { kind: 'segment'; options: string[]; active: number; to?: number; clickAt?: number };

export type SettingRow = { icon: string; title: string; sub: string; control: SettingControl };

/** A slider's value on a frame (keys eased like ValueSlider). */
export const sliderValue = (frame: number, keys: Array<{ f: number; v: number }>) => {
  let v = keys[0].v;
  for (let i = 1; i < keys.length; i++) v = mix(at(frame, keys[i - 1].f, keys[i].f - keys[i - 1].f, SLIDE), v, keys[i].v);
  return v;
};

const SLIDE = bez(0.45, 0, 0.15, 1);

/**
 * A settings card driven by a pointer. A header (the app's mark, a title, a status line) over rows of icon tile, title,
 * one line of description and a control: a toggle, a slider with its value in figures, or a segmented control. The
 * pointer arcs from control to control in time order and presses each: the toggle's knob stretches across and its track
 * takes the accent (its state), the segment's white indicator slides to the clicked option, the slider's thumb is
 * pressed and dragged through its keys with the pointer on it. Frames in the controls are relative to `at`.
 */
const SettingsCardInner: React.FC<{
  L: Look;
  rows: SettingRow[];
  at: number;
  title?: string;
  sub?: string;
  mark?: React.ReactNode;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  pointer?: boolean;
  speed?: number;
}> = ({ L, rows, at: start, title = 'Backups', sub = 'Last backup 2 minutes ago', mark, x: xIn, y: yIn, w = 1280, size = 32, pointer = true, speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const s = size;
  const headH = s * 4.2;
  const rowH = s * 4.0;
  const padX = s * 1.3;
  const H = headH + rows.length * rowH + s * 0.4;
  const left = x - w / 2;
  const top = y - H / 2;
  const enter = springAt(frame, 30, start - 12, springs.ui);
  const ctrlRight = left + w - padX;
  const sliderW = s * 10;
  const tg = s * 1.55;
  // pointer stops, in time order
  const stops: Array<{ f: number; x: number; y: number; click?: boolean; curve?: Ease; bow?: number }> = [];
  rows.forEach((r, i) => {
    const cy = top + headH + i * rowH + rowH / 2;
    const c = r.control;
    if (c.kind === 'toggle' && c.clickAt !== undefined) stops.push({ f: start + c.clickAt, x: ctrlRight - tg * 1.75 * 0.5, y: cy, click: true });
    if (c.kind === 'segment' && c.clickAt !== undefined && c.to !== undefined) {
      const segW = s * 4.2;
      const x0 = ctrlRight - segW * c.options.length;
      stops.push({ f: start + c.clickAt, x: x0 + segW * (c.to + 0.5), y: cy, click: true });
    }
    if (c.kind === 'slider') {
      const sx = ctrlRight - s * 3.2 - sliderW;
      c.keys.forEach((k, j) => stops.push({ f: start + k.f - (j === 0 ? 2 : 0), x: sx + k.v * sliderW, y: cy, click: j === 0, curve: j === 0 ? undefined : SLIDE, bow: j === 0 ? undefined : 0 }));
    }
  });
  stops.sort((a, b) => a.f - b.f);
  const keys = stops.length
    ? [{ f: stops[0].f - 26, x: stops[0].x + 380, y: stops[0].y + 320 }, ...stops.map((p, i) => ({ f: i === 0 || p.click ? p.f - 3 : p.f, x: p.x, y: p.y + s * 0.15, curve: p.curve, bow: p.bow }))]
    : [];
  const clicks = stops.filter((p) => p.click).map((p) => p.f);
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 36, 0)}px)` }}>
        <div style={{ ...surfaceStyle(L, 5, s * 1.1), position: 'absolute', left, top, width: w, height: H, fontFamily: L.font }}>
          <div style={{ position: 'absolute', left: padX, right: padX, top: 0, height: headH, display: 'flex', alignItems: 'center', gap: s * 0.7, borderBottom: `1px solid ${L.line}` }}>
            <MarkSlot mark={mark} icon="HardDrive" colors={['#5B86FF', '#2350E6']} size={s * 2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: s * 1.1, fontWeight: 650, color: L.ink, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{title}</div>
              <div style={{ fontSize: s * 0.8, color: L.muted, marginTop: s * 0.1, whiteSpace: 'nowrap' }}>{sub}</div>
            </div>
            <Pill L={L} label="Synced" icon="Check" color={L.accent} size={s * 0.74} />
          </div>
          {rows.map((r, i) => {
            const c = r.control;
            const ry = headH + i * rowH;
            let ctrl: React.ReactNode = null;
            if (c.kind === 'toggle') {
              const onAt = c.on ? -1e6 : c.clickAt !== undefined ? start + c.clickAt + 1 : 1e9;
              ctrl = <ToggleSwitch L={L} onAt={onAt} size={tg} />;
            } else if (c.kind === 'slider') {
              const v = sliderValue(frame, c.keys.map((k) => ({ f: start + k.f, v: k.v })));
              ctrl = (
                <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.8 }}>
                  <ValueSlider L={L} keys={c.keys.map((k) => ({ f: start + k.f, v: k.v }))} w={sliderW} size={s * 0.85} pill={false} />
                  <div style={{ width: s * 2.4, textAlign: 'right', fontSize: s * 0.9, fontWeight: 600, color: L.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{(c.format ?? ((q: number) => `${Math.round(q * 100)}%`))(v)}</div>
                </div>
              );
            } else {
              const segW = s * 4.2;
              const p = c.to !== undefined && c.clickAt !== undefined ? at(frame, start + c.clickAt + 1, 9, bez(0.3, 0, 0.1, 1)) : 0;
              const pos = mix(p, c.active, c.to ?? c.active);
              ctrl = (
                <div style={{ position: 'relative', width: segW * c.options.length, height: s * 1.9, borderRadius: s * 0.55, background: L.fill, padding: s * 0.18, boxSizing: 'border-box' }}>
                  <div style={{ position: 'absolute', left: s * 0.18 + pos * segW, top: s * 0.18, width: segW - s * 0.36, height: s * 1.9 - s * 0.36, borderRadius: s * 0.42, background: L.dark ? '#3A3C43' : '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.1), 0 3px 8px rgba(0,0,0,0.06)' }} />
                  {c.options.map((o, k) => (
                    <div key={o} style={{ position: 'absolute', left: k * segW, width: segW, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.8, fontWeight: 600, color: mixColor(L.muted, L.ink, clamp(1 - Math.abs(pos - k))), whiteSpace: 'nowrap' }}>
                      {o}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i} style={{ position: 'absolute', left: padX, right: padX, top: ry, height: rowH, display: 'flex', alignItems: 'center', gap: s * 0.7, borderTop: i > 0 ? `1px solid ${L.line}` : undefined, boxSizing: 'border-box' }}>
                <div style={{ width: s * 1.9, height: s * 1.9, borderRadius: s * 0.5, background: L.fill, color: L.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={r.icon} size={s * 0.95} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: s * 0.95, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: s * 0.78, color: L.muted, marginTop: s * 0.1, whiteSpace: 'nowrap' }}>{r.sub}</div>
                </div>
                {ctrl}
              </div>
            );
          })}
        </div>
        {pointer && keys.length > 0 && <Pointer keys={keys} clicks={clicks} size={s * 2.2} ring={mixColor(L.accent, '#FFFFFF', 0.45)} />}
      </div>
    </Paced>
  );
};

export const SettingsCard = withPace(SettingsCardInner);
