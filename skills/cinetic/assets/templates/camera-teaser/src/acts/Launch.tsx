import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { jLaunch } from '../fx/Flight';
import { Glyph } from '../kit';
import { E } from '../lib/anim';
import type { CamMove, Shot } from '../lib/camera';
import { useFilm } from '../lib/film';
import { ACT, CUE, f60, H, W } from '../timeline';
import { BOX, boxCentre, InputWorld } from './Input';
import { INK, useAbs, World } from './stage';

// LAUNCH - the same box, close. The camera slides in at x2.3 from the left on a cubic-out and, on the frame the slide
// settles, pulls back to x0.65 of it; then a slow push while the base sinks. The send button launches up and right on
// a J-curve (x on a cubic-out, y on a cubic-in, growing x1.74) and leaves the frame: the cut.

/** The close-up's framing and moves, and the button's flight (px at 1080p, 60 fps frames). */
export const CLOSE = { k: 2.3, slide: 0.55, pull: 0.65, push: 1.08, fly: { x: 520, y: -820 } } as const;

export const Launch: React.FC = () => {
  const F = useAbs('launch');
  const film = useFilm();
  const w = BOX.w * U;
  const h = BOX.h * U;
  const { x: cx, y: cy } = boxCentre(F, film.fps);
  const pad = Math.min(h * 0.19, 44 * U);
  const ctl = Math.min(h * 0.3, 68 * U);
  const send = { x: cx + w / 2 - pad - ctl / 2, y: cy + h / 2 - pad * 0.75 - ctl / 2 };
  const base: Shot = { ax: cx + w * 0.22, ay: cy, sx: W / 2 - CLOSE.slide * W, sy: H / 2, k: CLOSE.k };
  const moves: CamMove[] = [
    { at: CUE.slide, frames: f60(28), pan: { x: CLOSE.slide * W }, ease: E.glideOut },
    { at: CUE.pull, frames: f60(28), zoom: CLOSE.pull, ease: E.glideOut },
    { at: CUE.push, frames: ACT.window.from - CUE.push, zoom: CLOSE.push, look: { y: 18 * U }, ease: E.linear },
  ];
  const j = jLaunch(F, { at: CUE.fly, x: CLOSE.fly.x, y: CLOSE.fly.y }, film);
  const flying = F >= CUE.fly;
  const bx = send.x + j.dx;
  const by = send.y + j.dy;
  const d = ctl * j.scale;
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} base={base} moves={moves}>
        <InputWorld F={F} sendScale={flying ? 0 : 1} />
        {flying && (
          <div data-ui style={{ position: 'absolute', left: bx - d / 2, top: by - d / 2, width: d, height: d, borderRadius: d / 2, background: INK.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="send" size={d * 0.46} color={INK.accentInk} weight={2.4} />
          </div>
        )}
      </World>
    </AbsoluteFill>
  );
};
