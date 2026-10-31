import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { stepValue } from '../fx/HardStep';
import { Chip, DataRow, face, FileThumb, KIT_TYPE, Meter, Photo, surfaceShadow } from '../kit';
import { E, mix, prog, track } from '../lib/anim';
import { mixColor } from '../lib/color';
import { phraseOnsets } from '../lib/cadence';
import { creep } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, HOPS, W } from '../timeline';
import { REEL } from '../reel';
import { RING } from './Sources';
import { LIGHT, useAbs } from './stage';

// RECORD - one real record on the paper (the sources' own ground: no flip before the claim), a lit card. The disc grows into a rounded card (width and height lead, the
// height overshooting once and landing, the corners tightening, the fill catching up a few frames late); the accent
// rises through its picture; a whip pan to the left opens the card into the record's fields, which arrive one per
// two or three frames, top down. The page's grid is the card's own (its pitch a quarter of the picture's width, its
// lines following the card), and two accent cells hop between grid cells on the kicks. A hard cut on a kick.

/** The card: its picture part (the disc grows into it) and the whole card once the pan has opened it (px at 1080p). */
export const CARD = { media: 600 * U, full: 1700 * U, h: 640 * U, r: 38 * U, panFrom: 0, panTo: -550 * U } as const;
const pitch = CARD.media / 4;
/** The record's fields arrive phrased (lib/cadence: in groups with a breath between them), never on a metronome. */
const ROW_AT = phraseOnsets(CUE.rows, REEL.record.rows.length, f60x(2.5), { shape: 'group', seed: 'record-rows' });

/** The card's box on screen at absolute frame F (its left edge, top, width, height, corner radius). */
export const cardBox = (F: number) => {
  const p = CUE.pan;
  const w0 = track(F, [[ACT.record.from, 2 * RING.disc], [ACT.record.from + f60x(10), CARD.media]]);
  const w = F < p - f60x(20) ? w0 : track(F, [[p - f60x(20), CARD.media], [p + f60x(20), CARD.full]]);
  const h = track(F, [[ACT.record.from, 2 * RING.disc], [ACT.record.from + f60x(10), CARD.h * 1.04], [ACT.record.from + f60x(18), CARD.h]]);
  const dx = track(F, [[p - f60x(20), CARD.panFrom], [p, CARD.panTo * 0.45], [p + f60x(35), CARD.panTo]]);
  const r = track(F, [[ACT.record.from, RING.disc], [ACT.record.from + f60x(12), CARD.r]]);
  return { x: W / 2 - CARD.media / 2 + dx + (F < p - f60x(20) ? (CARD.media - w0) / 2 : 0), y: H / 2 - h / 2, w, h, r };
};

/** The accent cells' grid positions [col, row] relative to the card's top-left, stepping on each hop. */
const CELLS: [number, number][][] = [
  [[-2, -1], [5, 4]],
  [[-1, -2], [6, 4]],
  [[-2, 4], [7, -1]],
  [[-1, 4], [9, -2]],
  [[-3, 1], [10, 4]],
];

export const RecordCard: React.FC = () => {
  const F = useAbs('record');
  const t = LIGHT;
  const b = cardBox(F);
  const fill = mixColor(t.raised, t.surface, prog(F, ACT.record.from + f60x(4), ACT.record.from + f60x(14), E.snapOut)); // the fill lags the shape
  const grad = prog(F, CUE.grad, CUE.grad + f60x(22), E.snapOut);
  const k = creep(F, ACT.record.from, { pctPerSec: 0.025 }, FPS);
  const cells = stepValue(F, HOPS.map((at, i) => ({ at, value: CELLS[i + 1] })), CELLS[0]);
  const ox = ((b.x % pitch) + pitch) % pitch;
  const oy = ((b.y % pitch) + pitch) % pitch;
  const lineCol = mixColor(t.ground, t.line, 0.55);
  const opened = prog(F, CUE.pan, CUE.pan + f60x(30), E.snapOut);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `scale(${k.toFixed(5)})` }}>
        {/* the card's grid: lines on its own pitch, following it */}
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: prog(F, ACT.record.from, ACT.record.from + f60x(12), E.snapOut) }} aria-hidden>
          {Array.from({ length: Math.ceil(W / pitch) + 1 }, (_, i) => (
            <line key={`v${i}`} x1={ox + i * pitch} y1={0} x2={ox + i * pitch} y2={H} stroke={lineCol} strokeWidth={1.5 * U} />
          ))}
          {Array.from({ length: Math.ceil(H / pitch) + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={oy + i * pitch} x2={W} y2={oy + i * pitch} stroke={lineCol} strokeWidth={1.5 * U} />
          ))}
          {F >= ACT.record.from + f60x(12) && cells.map(([c, r], i) => <rect key={i} x={b.x + c * pitch} y={b.y + r * pitch} width={pitch} height={pitch} fill={t.accent} opacity={0.85} />)}
        </svg>
        <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, borderRadius: b.r, overflow: 'hidden', background: fill, boxShadow: surfaceShadow(t, 30, U), transform: `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0)` }}>
          {/* the picture, the accent rising through it */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: CARD.media, height: CARD.h, opacity: prog(F, ACT.record.from + f60x(6), ACT.record.from + f60x(16), E.snapOut) }}>
            {REEL.record.photo ? <Photo theme={t} w={CARD.media} h={CARD.h} src={staticFile(REEL.record.photo)} push={prog(F, ACT.record.from, ACT.record.from + ACT.record.dur, E.linear) * 0.5} /> : <FileThumb theme={t} w={CARD.media} h={CARD.h} name={REEL.record.file.name} size={REEL.record.file.size} seed={41} />}
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(0deg, ${t.accent} 0%, transparent ${mix(0, 110, grad).toFixed(1)}%)`, opacity: 0.55 }} />
          </div>
          {/* the record: its fields one by one, its tags, its measure */}
          {F >= CUE.pan && (
            <div style={{ position: 'absolute', left: CARD.media + 64 * U, top: 56 * U, width: CARD.full - CARD.media - 128 * U, opacity: opened }}>
              {REEL.record.rows.map((r, i) => {
                const on = F >= ROW_AT[i];
                return (
                  <div key={i} style={{ opacity: on ? 1 : 0 }}>
                    <DataRow theme={t} w={CARD.full - CARD.media - 128 * U} h={70 * U} label={r.label} value={r.value} accent={i === 0} id={`record-${i}`} />
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 16 * U, marginTop: 28 * U, opacity: F >= CUE.rows + f60x(2.5) * REEL.record.rows.length ? 1 : 0 }}>
                {REEL.record.tags.map((tag, i) => (
                  <Chip key={i} theme={t} label={tag} h={60 * U} on={i === 0} id={`record-tag-${i}`} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 * U, marginTop: 30 * U, opacity: F >= CUE.rows + f60x(2.5) * (REEL.record.rows.length + 1) ? 1 : 0 }}>
                <span data-text="record-measure" style={face(KIT_TYPE.label * U, 600, t.mute)}>
                  {REEL.record.measure.label}
                </span>
                <Meter theme={t} w={420 * U} h={18 * U} p={REEL.record.measure.value * prog(F, CUE.rows + f60x(20), CUE.rows + f60x(50), E.snapOut)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
