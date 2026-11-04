import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { jLaunch } from '../fx/Flight';
import { Glyph } from '../kit';
import { E, prog } from '../lib/anim';
import type { CamMove, Shot } from '../lib/camera';
import { useFilm } from '../lib/film';
import { ACT, CUE, DEAL, f60, H, W } from '../timeline';
import { BOX, boxCentre, InputWorld } from './Input';
import { INK, useAbs, World } from './stage';

// LAUNCH - the same box, close. The whip is carried in: the camera arrives still travelling right and settles on one
// glide (no second move queued after it), then pushes in slowly while the typing finishes. The deal's device ends it:
//   jcurve  the send button launches up and right on a J-curve (x on a cubic-out, y on a cubic-in, growing x1.74),
//           smeared along its own travel; the cut takes it as it accelerates out of the top of the frame
//   dive    the camera dives into the send button on an ease-in, the accent filling the frame: the window opens from
//           inside it (a zoom-through, carried)

/** The close-up's framing and moves, and the button's flight (px at 1080p, 60 fps frames). */
export const CLOSE = { k: 2.3, frame: 0.3, slide: 0.55, slide60: 34, push: 1.06, fly: { x: 140, y: -820 }, dive: 18 } as const;

/** The send button's centre in the world. */
export const sendCentre = () => {
  const { x: cx, y: cy } = boxCentre();
  const w = BOX.w * U;
  const h = BOX.h * U;
  const pad = Math.min(h * 0.19, 44 * U);
  const ctl = Math.min(h * 0.3, 68 * U);
  return { x: cx + w / 2 - pad - ctl / 2, y: cy + h / 2 - pad * 0.75 - ctl / 2, ctl };
};

export const launchMoves = (): { base: Shot; moves: CamMove[] } => {
  const { x: cx, y: cy } = boxCentre();
  const send = sendCentre();
  // framed toward the send corner, so the button's flight stays on screen and is still rising fast at the cut
  const base: Shot = { ax: cx + BOX.w * U * CLOSE.frame, ay: cy, sx: W / 2 - CLOSE.slide * W, sy: H / 2, k: CLOSE.k };
  const moves: CamMove[] = [
    { at: CUE.slide, frames: f60(CLOSE.slide60), pan: { x: CLOSE.slide * W }, ease: E.glideOut },
    { at: CUE.push, frames: ACT.window.from - CUE.push, zoom: CLOSE.push, look: { y: 18 * U }, ease: E.linear },
  ];
  if (DEAL.launch === 'dive') {
    // the camera finds the button first (its look lands on `aim`), then the zoom runs on into it
    const d = ACT.window.from - CUE.fly;
    moves.push({ at: CUE.fly, frames: CUE.aim - CUE.fly, look: { x: send.x - base.ax, y: send.y - cy - 18 * U }, ease: E.stdInOut });
    moves.push({ at: CUE.fly, frames: d, zoom: CLOSE.dive, ease: E.launchIn });
  }
  return { base, moves };
};

export const Launch: React.FC = () => {
  const F = useAbs('launch');
  const film = useFilm();
  const cam = launchMoves();
  const send = sendCentre();
  const j = jLaunch(F, { at: CUE.launch, x: CLOSE.fly.x, y: CLOSE.fly.y }, film);
  const jPrev = jLaunch(F - 1, { at: CUE.launch, x: CLOSE.fly.x, y: CLOSE.fly.y }, film);
  const flying = DEAL.launch === 'jcurve' && F >= CUE.launch;
  const d = send.ctl * j.scale;
  const v = Math.hypot(j.dx - jPrev.dx, j.dy - jPrev.dy) * CLOSE.k;
  const angle = (Math.atan2(j.dy - jPrev.dy, j.dx - jPrev.dx) * 180) / Math.PI;
  // the dive: the button's glyph gives way as the camera goes in, so its last frames are the accent alone
  const glyph = DEAL.launch === 'dive' ? 1 - prog(F, CUE.fly + f60(30), ACT.window.from - f60(6), E.stdInOut) : 1;
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} act="launch" base={cam.base} moves={cam.moves}>
        <InputWorld F={F} sendScale={flying ? 0 : 1} glyph={glyph} />
        {flying && (
          <DirBlur v={v / U} angle={angle} id="send-flight">
            <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: d, height: d, borderRadius: d / 2, background: INK.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate3d(${(send.x + j.dx - d / 2).toFixed(2)}px, ${(send.y + j.dy - d / 2).toFixed(2)}px, 0)` }}>
              <Glyph name="send" size={d * 0.46} color={INK.accentInk} weight={2.4} />
            </div>
          </DirBlur>
        )}
      </World>
    </AbsoluteFill>
  );
};
