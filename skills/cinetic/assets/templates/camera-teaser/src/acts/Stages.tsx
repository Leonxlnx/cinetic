import React from 'react';
import { AbsoluteFill } from 'remotion';
import { typeStyle, U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { Scramble } from '../fx/Scramble';
import { E, lmix, mix, prog } from '../lib/anim';
import { ACT, CUE, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { INK, useAbs } from './stage';

// STAGES - the product's own stages, one word at a time inside two corner brackets that stay fixed on the screen. The
// first decodes out of the black (fx/Scramble), the brackets tightening with it; the second rolls up into its place
// while the camera zooms in x1.9 after a short anticipation; the third rolls in while the camera backs off and the word
// dims, and the brackets flip to the other corners: a decrescendo before the end.

export const STAGE = { size: 150, arm: 64, stroke: 3, roll: 0.55, zoom: 1.9, back: 0.66 } as const;

const Corner: React.FC<{ x: number; y: number; sx: 1 | -1; sy: 1 | -1 }> = ({ x, y, sx, sy }) => {
  const a = STAGE.arm * U;
  const s = STAGE.stroke * U;
  return (
    <div style={{ position: 'absolute', left: x - (sx > 0 ? 0 : a), top: y - (sy > 0 ? 0 : a), width: a, height: a, boxShadow: `inset ${sx * s}px ${sy * s}px 0 ${INK.text}` }} />
  );
};

export const Stages: React.FC = () => {
  const F = useAbs('stages');
  const size = STAGE.size * U;
  const at = [CUE.stage1, CUE.stage2, CUE.stage3];
  const idx = F >= CUE.stage3 ? 2 : F >= CUE.stage2 ? 1 : 0;
  const rollP = (i: number) => (i === 0 ? 1 : E.snapOut(prog(F, at[i], at[i] + f60x(10), E.linear)));
  const pre = prog(F, CUE.stage2 - f60x(8), CUE.stage2, E.stdInOut); // the anticipation before the zoom
  const zin = prog(F, CUE.stage2, CUE.stage2 + f60x(14), E.glideOut);
  const zback = prog(F, CUE.stage3, CUE.stage3 + f60x(22), E.softOut);
  const k = lmix(1, 0.97, pre * (1 - zin)) * lmix(1, STAGE.zoom, zin) * lmix(1, STAGE.back, zback);
  const dim = mix(1, 0.3, zback);
  const tighten = lmix(1.25, 1, prog(F, CUE.stage1, CUE.stage1 + f60x(34), E.snapOut));
  const bw = (size * 3.6 * tighten) / 2;
  const bh = (size * 1.05 * tighten) / 2;
  const flip = F >= CUE.stage3 + f60x(12);
  const band = STAGE.roll * size * 2;
  const v = idx > 0 ? (band * (rollP(idx) - (idx > 0 ? E.snapOut(prog(F - 1, at[idx], at[idx] + f60x(10), E.linear)) : 1))) / U : 0;
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})`, opacity: dim }}>
        <DirBlur v={Math.abs(v)} axis="y" id="roll">
          <div style={{ position: 'absolute', left: 0, top: H / 2 - band / 2, width: W, height: band, overflow: 'hidden' }}>
            {TEASER.stages.map((s, i) => {
              if (i > idx || i < idx - 1) return null;
              const p = i === idx ? rollP(i) : 1;
              const y = i === idx ? (1 - p) * band : -rollP(idx) * band;
              const style = { ...typeStyle('display', size), color: INK.text, lineHeight: 1 };
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: band / 2 - size * 0.55 + y, width: W, display: 'flex', justifyContent: 'center' }}>
                  {i === 0 ? <Scramble id="stage1" text={s} frame={F} start={CUE.stage1} order="centre" role="display" size={size} color={INK.mute} style={style} /> : <span data-text={`stage${i + 1}`} style={style}>{s}</span>}
                </div>
              );
            })}
          </div>
        </DirBlur>
      </div>
      {F < ACT.end.from && (flip ? (
        <>
          <Corner x={W / 2 - bw} y={H / 2 - bh} sx={1} sy={1} />
          <Corner x={W / 2 + bw} y={H / 2 + bh} sx={-1} sy={-1} />
        </>
      ) : (
        <>
          <Corner x={W / 2 + bw} y={H / 2 - bh} sx={-1} sy={1} />
          <Corner x={W / 2 - bw} y={H / 2 + bh} sx={1} sy={-1} />
        </>
      ))}
    </AbsoluteFill>
  );
};
