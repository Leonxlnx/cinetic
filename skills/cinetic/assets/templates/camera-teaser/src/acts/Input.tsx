import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { Lit } from '../fx/Lit';
import { TypeOn } from '../fx/TypeOn';
import { AppIcon, Composer, GlyphTile, hasLogo } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type CamMove, camPath, type Shot, weighShot } from '../lib/camera';
import { ACT, CUE, DEAL, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { BASE, Caption, GROUNDS, INK, useAbs, World } from './stage';

/** The opening line's centre: centred, in the middle band (39 % of the height), the box arriving under it. */
const WHAT_Y = 0.39;

// INPUT - the request box on the lit stage, facing the camera in the film's one light (fx/Lit: rim on the key side, its shadow on
// the ground). The line over it says what the product is (the crisp hero entry); a rim light glides along the box; the
// request types and the send button arms (it lights in the accent on a glide, a small swell); the camera creeps the whole time and leaves on a whip right into the close-up (through one near-white
// frame when the deal's cut is the flash). The box arrives by the deal's device:
//   rise    it settles up out of a steeper tilt, focus trailing position (sharp a beat after it lands)
//   drop    the camera starts close on the send corner, out of focus, and pulls back to the whole box on one long glide
//   track   the camera trucks in from the left on one long glide past tiles of the products it works with, which cross
//           the foreground soft and cropped by the frame edge

/** The box in the world (px at 1080p): size, centre offset, the rim light's streak, the device numbers. */
export const BOX = { w: 1240, h: 216, y: 70, streak: 240, tilt: { x: 0, y: 0 }, enter60: 66, drop: { k: 1.9, frames60: 96 }, track: { pan: 760, frames60: 110 } } as const;

/** The box's centre in the world. */
export const boxCentre = () => ({ x: W / 2, y: H / 2 + BOX.y * U });

/** The camera of the input shot: the device's arrival, a creep the whole time, the whip right into the cut. */
export const inputMoves = (): { base: Shot; moves: CamMove[] } => {
  const { x, y } = boxCentre();
  const whip: CamMove = { at: CUE.whipR, frames: ACT.launch.from - CUE.whipR, pan: { x: 900 * U }, ease: E.launchIn };
  const creep: CamMove = { at: CUE.rise, frames: ACT.launch.from - CUE.rise, zoom: 1.05, pan: { x: -40 * U }, ease: E.linear };
  if (DEAL.input === 'drop') {
    const ax = x + BOX.w * U * 0.32;
    const base: Shot = { ...BASE, ax, ay: y, k: BOX.drop.k };
    return { base, moves: [{ at: CUE.rise, frames: f60(BOX.drop.frames60), zoom: 1 / BOX.drop.k, look: { x: x - ax, y: H / 2 - y }, ease: E.glideOut }, creep, whip] };
  }
  if (DEAL.input === 'track') {
    const base: Shot = { ...BASE, sx: W / 2 + BOX.track.pan * U };
    return { base, moves: [{ at: CUE.rise, frames: f60(BOX.track.frames60), pan: { x: -BOX.track.pan * U }, ease: E.glideOut }, creep, whip] };
  }
  return { base: BASE, moves: [creep, whip] };
};

/** The box world: the lit, typing box (the launch act frames it close). `sendScale` hides the button once it flies. */
export const InputWorld: React.FC<{ F: number; sendScale?: number; glyph?: number }> = ({ F, sendScale = 1, glyph = 1 }) => {
  const w = BOX.w * U;
  const h = BOX.h * U;
  const { x: cx, y: cy } = boxCentre();
  const rise = DEAL.input === 'rise';
  const sigma = rise ? 8 * (1 - prog(F, CUE.rise + f60x(10), CUE.rise + f60x(BOX.enter60 + 10), E.softOut)) : DEAL.input === 'drop' ? 9 * (1 - prog(F, CUE.rise, CUE.rise + f60x(BOX.drop.frames60 * 0.7), E.softOut)) : 0;
  const st = prog(F, CUE.sweep, CUE.sweep + f60x(56), E.stdInOut);
  const glow = Math.sin(Math.PI * st);
  const streak = BOX.streak * U;
  const n = TEASER.request.text.length;
  // the send button arms once the request is in: from the well's grey to the accent on a glide, a small swell that settles
  const arm = prog(F, CUE.arm, CUE.arm + f60x(16), E.glideOut);
  const swell = 1 + 0.08 * (prog(F, CUE.arm, CUE.arm + f60x(14), E.glideOut) - prog(F, CUE.arm + f60x(14), CUE.arm + f60x(44), E.stdInOut));
  return (
    <Defocus sigma={sigma}>
      <Lit frame={F} x={cx} y={cy} w={w} h={h} r={Math.min(h * 0.22, 44 * U)} tilt={BOX.tilt} ground={GROUNDS.input.base} id="request" {...(rise ? { enter: { at: CUE.rise, dur60: BOX.enter60, from: { y: 260, tilt: { x: 26, y: -16 } } } } : {})}>
        <Composer theme={INK} w={w} h={h} chip={TEASER.request.chip} focus={mix(0.2, 0.6, prog(F, CUE.type, CUE.type + f60x(20), E.stdInOut))} send={{ scale: sendScale * swell, fill: mixColor(INK.well, INK.accent, arm) }} id="request-box">
          <TypeOn id="request" text={TEASER.request.text} frame={F} start={CUE.type} kind="prompt" ramp={{ from: 14, to: 30, chars: 10, hold: 1 }} skip={[{ at: Math.floor(n * 0.45), count: Math.min(4, Math.floor(n * 0.1)) }]} role="ui" size={Math.min(h * 0.19, 44 * U)} blink={Math.round(f60x(600))} />
        </Composer>
        {glyph < 1 && (() => {
          // the dive: an accent disc over the send button's glyph, so the camera goes into the accent alone
          const pad = Math.min(h * 0.19, 44 * U);
          const ctl = Math.min(h * 0.3, 68 * U) * 1.04;
          return <div style={{ position: 'absolute', left: 0, top: 0, width: ctl, height: ctl, borderRadius: ctl / 2, background: INK.accent, opacity: 1 - glyph, transform: `translate3d(${(w - pad - ctl / 2 - ctl * 0.02).toFixed(2)}px, ${(h - pad * 0.75 - ctl / 2 - ctl * 0.02).toFixed(2)}px, 0)` }} />;
        })()}
        {st > 0 && st < 1 && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[0, 1].map((k) => {
              const x = mix(0.85, 0.15, k ? Math.max(0, st - 0.08) : st) * w - streak / 2;
              return <div key={k} style={{ position: 'absolute', left: 0, top: 0, width: streak, height: 3 * U, opacity: glow * (k ? 0.5 : 0.9), transform: `translate3d(${x.toFixed(2)}px, ${(k ? h - 3 * U : 0).toFixed(2)}px, 0)`, background: `linear-gradient(90deg, transparent, ${INK.text}, transparent)` }} />;
            })}
          </div>
        )}
      </Lit>
    </Defocus>
  );
};

/**
 * The track device's near plane: three tiles of the products it works with (their real marks, or the cards' glyphs),
 * travelling 1.6x the camera's truck, 10 px soft and cropped by the frame edge, so the truck reads in depth. The other
 * devices draw nothing round the box: no floating tiles that carry nothing the shot is about.
 */
const PlaneTiles: React.FC<{ F: number; base: Shot; moves: CamMove[] }> = ({ F, base, moves }) => {
  const shot = weighShot(camPath(F, base, moves), base, 1.6);
  const marks = TEASER.integrations.filter((s) => hasLogo(s));
  const size = 250 * U;
  // where the tiles rest once the camera has landed (the near plane travels 1.6x the truck): cropped by the frame's edges
  const rest = [{ x: -70, y: 230 }, { x: 1890, y: 170 }, { x: 1580, y: 1020 }];
  const spots = rest.map((p) => ({ x: p.x + BOX.track.pan * 0.6, y: p.y }));
  return (
    <Defocus sigma={10}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `translate(${shot.sx}px, ${shot.sy}px) scale(${shot.k}) translate(${-shot.ax}px, ${-shot.ay}px)` }}>
        {spots.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(p.x * U).toFixed(1)}px, ${(p.y * U).toFixed(1)}px, 0)` }}>
            {marks.length ? <AppIcon logo={marks[i % marks.length]} size={size} theme={INK} tone="dark" lift={40} /> : <GlyphTile theme={INK} name={TEASER.cards[i % 3].glyph} size={size} />}
          </div>
        ))}
      </div>
    </Defocus>
  );
};

export const Input: React.FC = () => {
  const F = useAbs('input');
  const cam = inputMoves();
  const flash = DEAL.cut === 'flash' && F === ACT.launch.from - 1;
  // the what line lifts a little as the box arrives under it: the line and the box arrive as one move
  const lift = 30 * U * (1 - prog(F, CUE.what, CUE.what + f60x(60), E.glideOut));
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} act="input" base={cam.base} moves={cam.moves}>
        <InputWorld F={F} />
      </World>
      {DEAL.input === 'track' && <PlaneTiles F={F} base={cam.base} moves={cam.moves} />}
      <Caption id="what" F={F} y={WHAT_Y * H + lift} />
      {flash && <AbsoluteFill style={{ background: INK.text, opacity: 0.92 }} />}
    </AbsoluteFill>
  );
};
