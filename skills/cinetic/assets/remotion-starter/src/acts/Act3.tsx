import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, SAFE, TYPE, typeStyle, U } from '../brand/tokens';
import { fragmentSpans } from '../fx/Chain';
import { INLINE_GAP } from '../fx/InlineGap';
import { Photo } from '../fx/Photo';
import { clamp, E, easeOf, fd, lmix, M, mix, prog } from '../lib/anim';
import { camera } from '../lib/camera';
import { useFilm } from '../lib/film';
import { launch } from '../lib/handoff';
import { baselineOf, measureTracked } from '../lib/measure';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { lineCutSpeed, RULE, statementSize } from './Act1';
import { Paper } from './ground';
import { OPEN, PLATE_MOVE, PLATE_PARALLAX, PLATE_SLICES, plateRoom, plateShift, SET_FRAMES } from './plate';

// ACT 3 - the picture becomes a word. On the cut the full-frame plate contracts into a window in the middle of
// the frame (still drifting: one continuous picture), and the line forms round it: "Cuts" and "land." rise on
// either side on the beat's rule, drawn in again, the window as the gap between them (fx/InlineGap's anatomy:
// margins, radius, hard-cut swaps).
// The window cuts through two more frames of the set on the 8ths, then holds for the read. The line and its
// picture then drop out of the frame, accelerating (lib/handoff launch), and Act4 opens on that speed.

const L = (abs: number) => abs - ACT.frame.from; // absolute cue -> act-local frame
const LINE = copy('frame');
// the window opens before the line's last word: "Cuts [picture] land."
const LEFT = LINE.text.slice(0, LINE.text.lastIndexOf(' '));
const RIGHT = LINE.text.slice(LINE.text.lastIndexOf(' ') + 1);

/** The window's shape: height in em of the line's size, and its aspect. */
const WIN = { em: 1.15, aspect: 1.6 };
/** The morph from the full frame into the window (absolute frames). */
export const MORPH = { from: ACT.frame.from, dur: f60x(28), ease: E.glideOut };
/** The drop into Act4 (absolute frames): it builds into the cut, its last frame the fastest (px per frame). */
export const DROP = { cut: ACT.mark.from - 1, vCut: 64 * U };
/** The camera's creep through the act (scale per act), about frame centre. */
const CREEP = 1.035;

/** The line's offset at absolute frame F as it drops (px, down): 0 until its build starts, the whole travel at the cut. */
export const dropY = (F: number) => {
  const o = { vCut: DROP.vCut, fps: FPS };
  return Math.max(0, launch(Math.min(F, DROP.cut), DROP.cut, o).x - launch(DROP.cut - 48, DROP.cut, o).x);
};

export const Act3: React.FC = () => {
  const f = useCurrentFrame();
  const film = useFilm();
  const F = f + ACT.frame.from;
  const disp = TYPE.display;
  const pace = film.pace;

  // Layout from the real font: the halves at the display size, shrunk only if the line would leave the safe width.
  const per100 = { l: measureTracked(LEFT, 100, disp.weight, disp.track) / 100, r: measureTracked(RIGHT, 100, disp.weight, disp.track) / 100, s: measureTracked(' ', 100, disp.weight, disp.track) / 100 };
  const margin = INLINE_GAP.margin * U;
  const unit = per100.l + per100.r + 2 * per100.s + WIN.em * WIN.aspect;
  const size = Math.min(disp.size * U, (W - 2 * SAFE.x - 2 * margin) / (unit * CREEP));
  const ch = WIN.em * size;
  const cw = ch * WIN.aspect;
  const gapSide = per100.s * size + margin;
  const total = per100.l * size + gapSide + cw + gapSide + per100.r * size;
  const x0 = (W - total) / 2;
  const top = H / 2 - (size * disp.lead) / 2;
  const base = top + baselineOf(size, disp.weight, disp.lead);
  const capMid = base - 0.36 * size; // the window centres on the capitals
  const win = { cx: x0 + per100.l * size + gapSide + cw / 2, cy: capMid, w: cw, h: ch, r: Math.min(ch * 0.18, INLINE_GAP.margin * 3 * U) };

  // The morph: the plate (as Act2 left it, still carried and drifting) scales about the window's centre while
  // its clip closes from the frame to the window. Scale in log space, one curve for clip, scale and place.
  const t = prog(F, MORPH.from, MORPH.from + MORPH.dur, MORPH.ease);
  const s1 = Math.max(cw / W, ch / H);
  const s = lmix(1, s1, t);
  const tx = mix(W / 2, win.cx, t);
  const ty = mix(H / 2, win.cy, t);
  const hw = mix(W / 2, cw / (2 * s1), t);
  const hh = mix(H / 2, ch / (2 * s1), t);
  const rr = mix(0, win.r / s1, t);
  const shot = SET_FRAMES()[fd(F) >= CUE.swapB ? 3 : fd(F) >= CUE.swapA ? 2 : 1];
  const vCut = lineCutSpeed(film, statementSize());

  // The halves rise as the calm pace draws words: opacity on the pace's curve, the rise on M.rise.
  const spans = fragmentSpans(LINE.text, LINE.in, pace, FPS);
  const rise = pace.rise * (pace.riseUnit === 'line' ? disp.lead : 1) * size;
  const word = (i: number) => {
    const [a, b] = spans[i];
    const op = easeOf(pace)(clamp((F - a) / Math.max(1, b - a)));
    const dy = rise * (1 - M.rise(clamp((F - a) / f60x(pace.riseDur ?? 25))));
    return { opacity: op, transform: `translateY(${dy.toFixed(2)}px)` };
  };

  const cam = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2 + dropY(F), k: lmix(1, CREEP, prog(F, ACT.frame.from, ACT.mark.from, E.linear)) };
  const text: React.CSSProperties = { ...typeStyle('display', size), color: C.ink, position: 'absolute', left: 0, top: 0 };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Paper frame={f} from={ACT.frame.from} />
      <div style={camera(cam)}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
            transform: `translate(${(tx - (W / 2) * s).toFixed(3)}px, ${(ty - (H / 2) * s).toFixed(3)}px) scale(${s.toFixed(5)})`,
            clipPath: `inset(${(H / 2 - hh).toFixed(2)}px ${(W / 2 - hw).toFixed(2)}px ${(H / 2 - hh).toFixed(2)}px ${(W / 2 - hw).toFixed(2)}px round ${rr.toFixed(2)}px)`,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${plateShift(F, vCut)[0].toFixed(2)}px)` }}>
            <Photo photo={shot.photo} scale={shot.scale} frame={F} move={PLATE_MOVE} room={plateRoom(vCut)} slices={PLATE_SLICES} parallax={PLATE_PARALLAX} style={OPEN} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: -RULE.reach * W, top: base, width: (1 + 2 * RULE.reach) * W, height: RULE.px * U, background: C.mute, transformOrigin: '0 0', transform: `scaleX(${prog(f, L(LINE.in) + RULE.from, L(LINE.in) + RULE.from + RULE.dur, E.glideOut).toFixed(4)})` }} />
        {f >= L(LINE.in) - 1 && (
          <div data-text="frame" style={{ position: 'absolute', left: x0, top, width: total, height: size * disp.lead }}>
            <span style={{ ...text, ...word(0) }}>{LEFT}</span>
            <span style={{ ...text, left: total - per100.r * size, ...word(spans.length - 1) }}>{RIGHT}</span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
