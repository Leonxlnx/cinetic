import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { blurBridge } from '../fx/CutFx';
import { Cursor, cursorExit, cursorMove, pressAt } from '../fx/Cursor';
import { Defocus, DirBlur } from '../fx/Defocus';
import { E, mix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { ACT, CUE, f60x, H, W } from '../timeline';
import { BOX, boxAt, ComposerShot } from './Ask';
import { PAGE, useAbs } from './stage';

// CLICK - a hard punch-in to the request box (x2.44), opening blurred (the other half of the blur bridge) and breathing
// back to x2.23 over 35 f with a decaying drift, so the close-up is never still. The typing slows here; the pointer
// glides in on an arc, presses (it squashes to 0.8), the send button swells and walks the accent's tints
// (fx/MicroUI swellState), and the pointer spins out on a quad-in (fx/Cursor cursorExit). The shot leaves on an
// ease-in whip up, cut on its fastest frame.

/** The close-up: its scale at the cut and at rest, the breath's length, the whip (60 fps frames, share of H). */
export const CLOSE = { from: 2.436, to: 2.231, breathe60: 35, drift: 118, pointer: 4.2, whip: 0.55 } as const;

export const Click: React.FC = () => {
  const F = useAbs('click');
  const film = useFilm();
  const b = boxAt(ACT.click.from);
  const h = BOX.h * U * b.k;
  // the framed point: between the request's end and the send button, on the box's lower half
  const focus = { x: b.cx + b.sw * 0.22, y: b.cy + h * 0.08 };
  const breathe = 1 - Math.exp(-((F - ACT.click.from) / f60x(CLOSE.breathe60)) * 3);
  const S = mix(CLOSE.from, CLOSE.to, breathe);
  const drift = CLOSE.drift * U * breathe;
  const whipT = prog(F, CUE.whip, ACT.run.from, E.linear);
  const whip = -CLOSE.whip * H * E.launchIn(whipT);
  const whipV = -CLOSE.whip * H * (E.launchIn(whipT) - E.launchIn(prog(F - 1, CUE.whip, ACT.run.from, E.linear)));
  const tx = W / 2 - focus.x * S + drift;
  const ty = H / 2 - focus.y * S + whip;
  // the send button on screen: the box's right end, its control row
  const ctl = Math.min(BOX.h * 0.3, 68) * U * b.k;
  const send = { x: b.cx + b.sw / 2 - Math.min(BOX.h * 0.19, 44) * U * b.k - ctl / 2, y: b.cy + h / 2 - Math.min(BOX.h * 0.19, 44) * U * b.k * 0.75 - ctl / 2 };
  const target = { x: send.x * S + tx, y: send.y * S + ty };
  const p = cursorMove(F, { x: W * 0.92, y: H * 1.15 }, [{ to: { x: target.x - ctl * 0.2 * S, y: target.y - ctl * 0.15 * S }, start: CUE.cursor, dur: f60x(40) }], film);
  const away = cursorExit(F, CUE.away, {}, film);
  const sigma = blurBridge(F, ACT.click.from, {}, film);
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <DirBlur v={whipV} axis="y" id="click-whip">
        <Defocus sigma={sigma}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${S.toFixed(5)})` }}>
            <ComposerShot F={F} />
          </div>
        </Defocus>
        {F >= CUE.cursor && !away.gone && (
          <Cursor x={p.x + away.dx} y={p.y + away.dy} shape="pointer" scale={CLOSE.pointer * U} press={pressAt(F, CUE.press, film.fps)} pressDepth={0.2} angle={away.angle} opacity={away.opacity} fill={PAGE.accent} outline={PAGE.surface} />
        )}
      </DirBlur>
    </AbsoluteFill>
  );
};
