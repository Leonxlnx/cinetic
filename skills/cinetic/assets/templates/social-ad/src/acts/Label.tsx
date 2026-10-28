import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, U } from '../brand/tokens';
import { CONVEYOR, conveyorState, type ConveyorProps } from '../fx/Conveyor';
import { DirBlur } from '../fx/Defocus';
import { ARC_PATHS, ArcRiver, mirrorPath } from '../fx/Pictures';
import { TypeLine } from '../fx/TypePresets';
import { ContentTicker, DenseScreen, shadeRgba } from '../kit';
import { E, lmix, mix, prog, rand } from '../lib/anim';
import { useFilm } from '../lib/film';
import { AD } from '../ad';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, H, SWAP, W } from '../timeline';
import { ActGround, carryOffset, Item, launchOffset, lineSize, lineStyle, lineWidth, NODES, PAGE, PICS, SEAM, useAbs, WORLD } from './stage';

// LABEL - a label stands over moving content and swaps its last word once. It is a chip on the page's surface: its
// words rise and sharpen in on the crisp entry (fx/TypePresets crisp), it recedes slightly the whole time, and on the swap its last word
// rolls up out of the chip while the new one rolls in from below (16 f, E.snapOut, clipped to the chip) as the chip
// glides to the new width: a roll, never a pop. On the last beats the content rushes out to the right, accelerating
// (the next shot carries that speed), and the chip goes with it. The label slot's device (src/deal.ts):
//   rivers  two diagonal streams of content tiles running opposite ways (fx/Conveyor), already at their cruise on the
//           cut (a fast entry would spike the field's carried rise), upright in a staircase, sizes varied by depth,
//           smeared only along their own travel; the rush takes both streams right together. With photographs (ad.ts
//           pictures) the streams run on two curves that pass the chip like the arms of an S (fx/Pictures ArcRiver:
//           spaced along the curve, sharp near the chip and softer away from it, smeared along the tangent)
//   ticker  rows of content tiles flowing past on two depths, curved toward the camera (kit ContentTicker), already
//           flowing on the cut
//   screen  the product's own dense screen filling the frame (kit DenseScreen), its lens gliding to a new row on the
//           swap (the screen's one readable line), the chip over its top

/** Frames (60 fps) the accent takes to wipe across the label's last frames before the claim taglines. */
export const WIPE = 20;

/** The streams: their angle (deg), the tile's base width (px at 1080p), the staircase overlap and the depth range. */
export const RIVER = { angle: -37, card: 250, stair: 0.82, sizes: [0.82, 1.24], n: 12, gap: 0.27 } as const;

const stream = (start: number, outAt: number | undefined, angle: number, phase: number): ConveyorProps => ({ start, n: RIVER.n, pitch: RIVER.card * U * RIVER.stair, angle, outAt, phase, speed: { in: CONVEYOR.cruise }, id: `river-${angle}` });

const River: React.FC<{ F: number; p: ConveyorProps; cy: number; seed: number }> = ({ F, p, cy, seed }) => {
  const s = conveyorState(F, p, useFilm());
  const items = [...s.items].sort((a, b) => a.along - b.along); // later along the travel draws on top
  return (
    <DirBlur v={s.v / U} angle={p.angle} id={`river${seed}`}>
      {items.map((it) => {
        const k = RIVER.sizes[0] + (RIVER.sizes[1] - RIVER.sizes[0]) * rand(seed * 97 + it.i);
        const w = RIVER.card * U * k;
        const h = w * 1.2;
        return (
          <div key={it.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(W / 2 + it.x - w / 2).toFixed(2)}px, ${(cy + it.y - h / 2).toFixed(2)}px, 0)` }}>
            <Item i={seed * 11 + it.i} w={w} h={h} lift={14} />
          </div>
        );
      })}
    </DirBlur>
  );
};

/** The chip: the head of the label rising out of its mask, the last word rolling once, the chip gliding to its width. */
const Chip: React.FC<{ F: number; cx: number; cy: number }> = ({ F, cx, cy }) => {
  const a = copy('plan');
  const b2 = copy('swap');
  const [l0, l1] = AD.lines.plan;
  const words0 = l0.trim().split(/\s+/);
  const head = words0.slice(0, -1).join(' ');
  const w0 = words0[words0.length - 1];
  const w1 = l1.trim().split(/\s+/).pop() as string;
  const size = lineSize(l0, 0.5);
  const space = lineWidth('a a', size) - 2 * lineWidth('a', size);
  const wHead = lineWidth(head, size);
  const q = prog(F, b2.in, b2.in + f60x(SWAP), E.snapOut);
  const wLast = mix(lineWidth(w0, size), lineWidth(w1, size), q);
  const padX = 0.55 * size;
  const chipW = wHead + space + wLast + 2 * padX;
  const chipH = size * 1.62;
  const open = prog(F, a.in - 1, a.in - 1 + f60x(14), E.snapOut);
  const show = prog(F, a.in - 1, a.in - 1 + f60x(20), E.snapOut); // a third on its first frame: a solid chip at full opacity in one frame pops
  const x0 = cx - chipW / 2 + padX;
  const lastX = x0 + wHead + space;
  const pitch = size * 1.1;
  const colors = { ink: PAGE.text, accent: PAGE.accent, mute: PAGE.mute };
  const lastAt = a.in - 1 + f60x(7 * (words0.length - 1));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: chipW, height: chipH, borderRadius: chipH / 2, background: PAGE.surface, boxShadow: `0 ${(14 * U).toFixed(1)}px ${(36 * U).toFixed(1)}px ${shadeRgba(PAGE, 0.18)}, inset 0 0 0 ${(1.5 * U).toFixed(1)}px ${PAGE.line}`, transformOrigin: '50% 50%', transform: `translate3d(${(cx - chipW / 2).toFixed(2)}px, ${(cy - chipH / 2).toFixed(2)}px, 0) scale(${mix(0.86, 1, open).toFixed(4)})`, opacity: show }} />
      <TypeLine spec={{ preset: 'crisp', text: head, at: a.in - 1, colors, id: 'plan' }} frame={F} size={size} x={x0 + wHead / 2} y={cy} />
      {/* the last word: its own slot, clipped to the chip, rolling once */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, clipPath: `inset(${(cy - chipH / 2).toFixed(2)}px 0 ${(H - cy - chipH / 2).toFixed(2)}px 0)` }}>
        {F < b2.in + f60x(SWAP) && (
          <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0, ${(-q * pitch).toFixed(2)}px, 0)` }}>
            <TypeLine spec={{ preset: 'crisp', text: w0, at: lastAt, colors, id: 'plan' }} frame={F} size={size} x={lastX + lineWidth(w0, size) / 2} y={cy} />
          </div>
        )}
        {F >= b2.in && (
          <div data-text="swap" style={{ ...lineStyle(size, PAGE.accent), position: 'absolute', left: 0, top: 0, transform: `translate3d(${lastX.toFixed(2)}px, ${(cy - size * 0.53 + (1 - q) * pitch).toFixed(2)}px, 0)` }}>
            {w1}
          </div>
        )}
      </div>
    </div>
  );
};

export const Label: React.FC = () => {
  const F = useAbs('label');
  const cut = ACT.taglines.from;
  const rush = launchOffset(F, cut - 1, SEAM.rush * U); // the content rushes right into the cut, the chip with it
  const enter = carryOffset(F, ACT.label.from, -SEAM.v * U); // the field's upward speed, carried and decaying
  const recede = lmix(1, 0.88, prog(F, copy('plan').in, cut, E.linear));
  const content =
    DEAL.label === 'ticker' ? (
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${rush.toFixed(2)}px, ${enter.toFixed(2)}px, 0)` }}>
        <ContentTicker nodes={NODES.slice(0, 8)} fill={NODES.slice(8)} frame={F} start={ACT.label.from - f60x(60)} tile={250 * U} speed={150 * U} rows={2} theme={PAGE} seed="label" />
      </div>
    ) : DEAL.label === 'screen' ? (
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `translate3d(${rush.toFixed(2)}px, ${enter.toFixed(2)}px, 0) scale(${lmix(1.06, 1.12, prog(F, ACT.label.from, cut, E.linear)).toFixed(5)})` }}>
        <DenseScreen frame={F} theme={PAGE} world={WORLD} layout="board" w={W * 0.94} h={H * 0.9} x={W * 0.03} y={H * 0.08} focus={[{ at: ACT.label.from, row: 3 }, { at: CUE.swap, row: 6 }]} drawAt={ACT.label.from} />
      </div>
    ) : PICS.length ? (
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${rush.toFixed(2)}px, ${enter.toFixed(2)}px, 0)` }}>
        <ArcRiver frame={F} photos={PICS} points={ARC_PATHS.rise} start={ACT.label.from - f60x(60)} focus={[W / 2, H / 2]} seed={1} />
        <ArcRiver frame={F} photos={PICS} points={mirrorPath(ARC_PATHS.rise)} start={ACT.label.from - f60x(60)} focus={[W / 2, H / 2]} seed={2} />
      </div>
    ) : (
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${rush.toFixed(2)}px, ${enter.toFixed(2)}px, 0)` }}>
        <River F={F} p={stream(ACT.label.from, undefined, RIVER.angle, 0)} cy={H / 2 - RIVER.gap * H} seed={1} />
        <River F={F} p={stream(ACT.label.from, undefined, RIVER.angle + 180, RIVER.card * U * 0.4)} cy={H / 2 + RIVER.gap * H} seed={2} />
      </div>
    );
  const chipY = DEAL.label === 'screen' ? H * 0.2 : H / 2;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="label" />
      {content}
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `50% ${((chipY / H) * 100).toFixed(1)}%`, transform: `translate3d(${rush.toFixed(2)}px, ${enter.toFixed(2)}px, 0) scale(${recede.toFixed(5)})` }}>
        {F >= copy('plan').in - 1 && <Chip F={F} cx={W / 2} cy={chipY} />}
      </div>
      {/* the claim taglines: the accent wipes in from the left on the rush, covering the frame on the cut (one colour event) */}
      {DEAL.taglines === 'claim' && F >= cut - f60x(WIPE) && (
        <div style={{ position: 'absolute', inset: 0, background: C.accent, transform: `translate3d(${(-W * (1 - prog(F, cut - f60x(WIPE), cut - 1, E.launchIn))).toFixed(2)}px, 0, 0)` }} />
      )}
    </AbsoluteFill>
  );
};
