import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, U } from '../brand/tokens';
import { LitGround } from '../fx/Grounds';
import { Lit } from '../fx/Lit';
import { ReadBack } from '../fx/ReadBack';
import { AccentClaim, inkOn } from '../fx/TypeClaim';
import { TypeLine } from '../fx/TypePresets';
import { DenseScreen } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { CAM3D } from '../lib/camera';
import { creep } from '../lib/handoff';
import { DEAL } from '../deal';
import { ACT, chainOf, CUE, f60x, FPS, H, W } from '../timeline';
import { carryOffset, EMPH, keysFor, LightEvent, lineSize, PAGE, quadIn, SEAM, SHOT, SLATE, useAbs, WORLD } from './stage';

// TAGLINES - two short imperatives taking turns, then a push into the cut. The shot opens on the label's rightward
// rush, carried and decaying. The taglines slot's device (src/deal.ts):
//   panel  the product's own dense screen as a lit, tilted panel on the slate (fx/Lit: rim on the key side, its
//          shadow on the ground), centred; the film's one 3D turn: the camera swings round it (CAM3D.house degrees on
//          one axis over 108 f, E.strongInOut) and creeps on. The imperatives sit centred in front of it while the panel
//          steps back behind them (fx/ReadBack): the first arrives on the film's voice (the crisp entry, word by word)
//          and leaves dropping off right to left; the second arrives the same way and is cut on the push
//   claim  the accent wipes in from the left on the rush over the label's last 20 f (E.launchIn, the film's one colour
//          event), so the shot opens on the full accent, and the first imperative alone is set as the claim on it
//          (fx/TypeClaim: cap 16 % of the frame or more, centred, -0.04 em, semibold, word by word on the crisp entry),
//          creeping and rising slowly under the push into the cut: one poster line, never two in a row

/** The turn (60 fps frames) and the panel at rest (px at 1080p). */
export const TURN = { frames: 108, from: -CAM3D.house, to: 0, pitch: 9 } as const; // turns round and lands face-on (a declared object move)
const PANEL = { w: 1100, h: 660, x: 960, y: 560 } as const;

export const Taglines: React.FC = () => {
  const F = useAbs('taglines');
  const cut = ACT.end.from;
  const tags = chainOf('tag');
  // a creep all act long (the holds never freeze), then a push into the cut
  const push = creep(F, ACT.taglines.from, { pctPerSec: 0.015 }, FPS) * (1 + 0.05 * prog(F, CUE.push, cut, quadIn));
  const carry = carryOffset(F, ACT.taglines.from, SEAM.rush * U); // the rush, carried and decaying (moving right, from the left of its rest)
  if (DEAL.taglines === 'claim') {
    const ink = inkOn(C.accent);
    return (
      <AbsoluteFill style={{ background: C.accent, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `translate3d(0, ${((-18 * U * Math.max(0, F - ACT.taglines.from)) / FPS).toFixed(2)}px, 0) scale(${push.toFixed(5)})` }}>
          {tags.slice(0, 1).map((c) => {
            if (F < c.in - 1) return null;
            // one line, held to the cut: it carries the rush in (decaying) and rises with the push, so it never stands still
            return (
              <div key={c.id} style={{ position: 'absolute', inset: 0, transform: `translate3d(${(carry * 0.4).toFixed(2)}px, 0, 0)` }}>
                <AccentClaim text={c.text} at={c.in - 1} frame={F} flood={false} ground={C.accent} color={ink} id={c.id} creep={0.02} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }
  const p = prog(F, ACT.taglines.from - f60x(10), ACT.taglines.from - f60x(10) + f60x(TURN.frames), E.strongInOut);
  const yaw = mix(TURN.from, TURN.to, p);
  const pitch = mix(TURN.pitch, 0, p);
  const w = PANEL.w * U;
  const h = PANEL.h * U;
  return (
    <AbsoluteFill style={{ background: SHOT.ground, overflow: 'hidden' }}>
      <LitGround frame={F} spec={SLATE} cam={{ base: { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 }, shot: { ax: W / 2, ay: H / 2, sx: W / 2 + carry * 0.25, sy: H / 2, k: push } }} />
      <LightEvent F={F} act="taglines" dark />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${push.toFixed(5)})` }}>
        <ReadBack F={F} at={tags[0].in} out={tags[tags.length - 1].out}>
          <Lit frame={F} x={PANEL.x * U + carry} y={PANEL.y * U} w={w} h={h} r={22 * U} tilt={{ x: pitch, y: yaw }} ground={SHOT.ground} id="panel">
            <DenseScreen frame={F} theme={PAGE} world={WORLD} layout="table" w={w} h={h} scale={w / 1600} focus={null} lift={0} drawAt={ACT.taglines.from} />
          </Lit>
        </ReadBack>
        {/* the imperatives on their own layer in front of the panel's 3D space */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, transform: 'translateZ(200px)' }}>
        {tags.map((c, i) => {
          const size = lineSize(c.text, 0.4);
          return (
            <TypeLine
              key={c.id}
              spec={{ preset: 'crisp', text: c.text, at: c.in - 1, out: i === 0 ? c.out : undefined, exit: 'drop', colors: { ink: SHOT.text, accent: PAGE.accent, mute: SHOT.mute, ground: SHOT.ground }, id: c.id, emph: EMPH[c.id], keys: keysFor(c.id, c.text) }}
              frame={F}
              size={size}
              x={W / 2 + carry * 0.6}
              y={H / 2}
            />
          );
        })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
