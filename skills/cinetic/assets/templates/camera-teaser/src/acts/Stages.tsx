import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, typeStyle, U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { claimLayout, CLAIM, inkOn } from '../fx/TypeClaim';
import { crispWords } from '../fx/TypePresets';
import { TypePush } from '../fx/TypePush';
import { Words } from '../fx/Words';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { glideValue } from '../lib/continuity';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { ACT, CUE, DEAL, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { INK, useAbs, World } from './stage';

// STAGES - the product's own stages, one word each. Every change is a glide (16 f at 60 fps on E.glideOut, never a
// one-frame roll), the frame keeps moving through every hold. The deal's device:
//   brackets  one word at a time inside two corner brackets fixed on the screen: the words roll up into place on
//             glides while the camera eases in toward the second and backs off on the third, the brackets
//             tightening and then turning to the other corners: a decrescendo before the end
//   push      the three stages in one row with a thin arrow between each; the camera pushes through the row (fx/TypePush,
//             1.0 -> 2.2x on E.cam) from the first word to the last, each lighting in the accent as the reading point
//             reaches it, the row crossing the frame's edges
//   claim     the frame floods with the accent and each stage is set as the claim (fx/TypeClaim numbers: cap 16.5 % of
//             the frame, flush left at 3 %, -0.04 em, semibold), rolling up into the next on a glide: the film's colour event

export const STAGE = { size: 150, arm: 64, stroke: 3, zoom: 1.6, back: 0.8, glide60: 16 } as const;

const at = () => [CUE.stage1, CUE.stage2, CUE.stage3];

/** A corner bracket placed by transform: its arm length a, stroke s, facing (sx, sy). */
const Corner: React.FC<{ x: number; y: number; sx: 1 | -1; sy: 1 | -1; o?: number }> = ({ x, y, sx, sy, o = 1 }) => {
  const a = STAGE.arm * U;
  const s = STAGE.stroke * U;
  if (o <= 0.001) return null;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: a, height: a, opacity: o, transform: `translate3d(${(x - (sx > 0 ? 0 : a)).toFixed(2)}px, ${(y - (sy > 0 ? 0 : a)).toFixed(2)}px, 0)`, boxShadow: `inset ${sx * s}px ${sy * s}px 0 ${INK.text}` }} />;
};

/** The words rolling through a band on glides: the band's offset in words (0, 1, 2) and its speed. */
const rollState = (F: number) => {
  const film = useFilm();
  const steps = [{ at: CUE.stage2, value: 1 }, { at: CUE.stage3, value: 2 }];
  const y = glideValue(F, steps, 0, { frames: STAGE.glide60 }, film);
  const v = Math.abs(y - glideValue(F - 1, steps, 0, { frames: STAGE.glide60 }, film));
  return { y, v };
};

const Brackets: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const size = STAGE.size * U;
  const r = rollState(F);
  const zin = prog(F, CUE.stage2 - f60x(10), CUE.stage2 + f60x(50), E.stdInOut);
  const zback = prog(F, CUE.stage3, CUE.stage3 + f60x(60), E.stdInOut);
  const k = lmix(1, STAGE.zoom, zin) * lmix(1, STAGE.back / STAGE.zoom, zback) * (1 + 0.02 * ((F - ACT.stages.from) / film.fps));
  const tighten = lmix(1.25, 1, prog(F, CUE.stage1, CUE.stage1 + f60x(40), E.glideOut));
  const bw = (size * 3.6 * tighten) / 2;
  const bh = (size * 1.05 * tighten) / 2;
  const flip = prog(F, CUE.stage3 + f60x(6), CUE.stage3 + f60x(30), E.stdInOut);
  const band = size * 1.4;
  const style = { ...typeStyle('display', size), color: INK.text, lineHeight: 1 };
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})`, opacity: mix(1, 0.4, zback) }}>
        <DirBlur v={(r.v * band) / U} axis="y" id="roll">
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: band, overflow: 'hidden', transform: `translate3d(0, ${(H / 2 - band / 2).toFixed(2)}px, 0)` }}>
            {TEASER.stages.map((s, i) => {
              const y = (i - r.y) * band;
              if (Math.abs(y) > band * 1.2) return null;
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(0, ${(band / 2 - size * 0.55 + y).toFixed(2)}px, 0)` }}>
                  {i === 0 ? <Words id="stage1" text={s} frame={F} start={CUE.stage1} size={size} {...crispWords(film)} style={style} /> : <span data-text={`stage${i + 1}`} style={style}>{s}</span>}
                </div>
              );
            })}
          </div>
        </DirBlur>
      </div>
      {F < ACT.end.from && (
        <>
          <Corner x={W / 2 + bw} y={H / 2 - bh} sx={-1} sy={1} o={1 - flip} />
          <Corner x={W / 2 - bw} y={H / 2 + bh} sx={1} sy={-1} o={1 - flip} />
          <Corner x={W / 2 - bw} y={H / 2 - bh} sx={1} sy={1} o={flip} />
          <Corner x={W / 2 + bw} y={H / 2 + bh} sx={-1} sy={-1} o={flip} />
        </>
      )}
    </>
  );
};

/** A thin arrow between two stages (two strokes, no glyph). */
const Arrow: React.FC<{ x: number; y: number; size: number; o: number }> = ({ x, y, size, o }) => {
  const s = 4 * U;
  const len = size * 0.5;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: o, transform: `translate3d(${(x - len / 2).toFixed(2)}px, ${(y - s / 2).toFixed(2)}px, 0)` }}>
      <div style={{ width: len, height: s, borderRadius: s, background: INK.mute }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: size * 0.2, height: size * 0.2, transform: `translate3d(${(len - size * 0.16).toFixed(2)}px, ${(-size * 0.1 + s / 2).toFixed(2)}px, 0) rotate(45deg)`, boxShadow: `inset -${s}px ${s}px 0 ${INK.mute}` }} />
    </div>
  );
};

const Push: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const size = 120 * U;
  const style = { ...typeStyle('display', size), lineHeight: 1 };
  const ws = TEASER.stages.map((s) => measureTracked(s, size, 600, -0.02, FONT.text, { trailing: false }));
  const gap = size * 1.1;
  const total = ws.reduce((a, b) => a + b, 0) + gap * 2;
  const xs: number[] = [];
  let x = (W - total) / 2;
  for (const w of ws) {
    xs.push(x + w / 2);
    x += w + gap;
  }
  const cy = H / 2;
  const starts = [CUE.stage1, CUE.stage1 + f60(14), CUE.stage1 + f60(28)];
  const push = { at: CUE.stage2 - f60(16), frames: f60(56), read: [{ x: xs[0], y: cy }, { x: xs[2], y: cy }] };
  return (
    <TypePush push={push} frame={F}>
      {TEASER.stages.map((s, i) => {
        const lit = prog(F, at()[i], at()[i] + f60x(14), E.stdInOut);
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(xs[i] - ws[i] / 2).toFixed(2)}px, ${(cy - size * 0.55).toFixed(2)}px, 0)` }}>
            <Words id={`stage${i + 1}`} text={s} frame={F} start={starts[i]} size={size} {...crispWords(film)} style={{ ...style, color: mixColor(INK.text, INK.accent, lit), opacity: mix(0.55, 1, lit) }} />
          </div>
        );
      })}
      {[0, 1].map((i) => <Arrow key={i} x={(xs[i] + ws[i] / 2 + xs[i + 1] - ws[i + 1] / 2) / 2} y={cy} size={size} o={prog(F, starts[i + 1], starts[i + 1] + f60x(20), E.snapOut)} />)}
    </TypePush>
  );
};

const Claim: React.FC<{ F: number }> = ({ F }) => {
  const film = useFilm();
  const r = rollState(F);
  const L = claimLayout({ text: TEASER.stages.reduce((a, b) => (b.length > a.length ? b : a)), maxLines: 1, cap: 0.24 }, film, (t, s, w, tr) => measureTracked(t, s, w, tr, FONT.text, { trailing: false }));
  const ink = inkOn(INK.accent, INK.text, INK.accentInk);
  const flood = prog(F, ACT.stages.from, ACT.stages.from + f60x(10), E.snapOut);
  const band = L.size * 1.1;
  const creep = 1 + Math.min(CLAIM.creepMax, (CLAIM.creep * Math.max(0, F - CUE.stage1)) / film.fps);
  const top = (H - L.size) / 2;
  return (
    <div style={{ position: 'absolute', inset: 0, background: INK.accent, opacity: clamp(flood * 1.5) }}>
      <div data-audit-claim style={{ position: 'absolute', inset: 0, transformOrigin: `${L.left}px 50%`, transform: `scale(${creep.toFixed(5)})` }}>
        <DirBlur v={(r.v * band) / U} axis="y" id="claim-roll">
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: band, overflow: 'hidden', transform: `translate3d(0, ${(top - (band - L.size) / 2).toFixed(2)}px, 0)` }}>
            {TEASER.stages.map((s, i) => {
              const y = (i - r.y) * band;
              if (Math.abs(y) > band * 1.2) return null;
              const style: React.CSSProperties = { fontFamily: FONT.text, fontSize: L.size, fontWeight: L.weight, letterSpacing: `${L.track}em`, lineHeight: 1, whiteSpace: 'pre', color: ink };
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${L.left}px, ${((band - L.size) / 2 + y).toFixed(2)}px, 0)` }}>
                  {i === 0 ? <Words id="stage1" text={s} frame={F} start={CUE.stage1} size={L.size} {...crispWords(film)} style={style} /> : <span data-text={`stage${i + 1}`} style={style}>{s}</span>}
                </div>
              );
            })}
          </div>
        </DirBlur>
      </div>
    </div>
  );
};

export const Stages: React.FC = () => {
  const F = useAbs('stages');
  // the way out into the end: the words recede into the ground the end stands on, or the accent wipes up off the frame
  const out = prog(F, ACT.end.from - f60x(16), ACT.end.from, E.buildIn);
  const moves = [{ at: ACT.stages.from, frames: ACT.stages.dur, zoom: 1.04, ease: E.linear }];
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} act="stages" moves={moves}>
        <div />
      </World>
      {DEAL.stages === 'claim' ? (
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0, ${(-H * E.launchIn(out)).toFixed(2)}px, 0)` }}>
          <Claim F={F} />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - out, transformOrigin: '50% 50%', transform: `scale(${(1 - 0.12 * out).toFixed(4)})` }}>
          {DEAL.stages === 'brackets' ? <Brackets F={F} /> : <Push F={F} />}
        </div>
      )}
    </AbsoluteFill>
  );
};
