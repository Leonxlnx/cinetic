import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT, SAFE, U } from '../brand/tokens';
import { LitGround } from '../fx/Grounds';
import { Lit } from '../fx/Lit';
import { AccentClaim, claimLayout, inkOn } from '../fx/TypeClaim';
import { TypeLine } from '../fx/TypePresets';
import { DenseScreen } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { CAM3D } from '../lib/camera';
import { useFilm } from '../lib/film';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { DEAL } from '../deal';
import { ACT, chainOf, CUE, f60x, FPS, H, W } from '../timeline';
import { carryOffset, EMPH, keysFor, LightEvent, lineSize, PAGE, quadIn, SEAM, SHOT, SLATE, useAbs, WORLD } from './stage';

// TAGLINES - two short imperatives taking turns, then a push into the cut. The shot opens on the label's rightward
// rush, carried and decaying. The taglines slot's device (src/deal.ts):
//   panel  the product's own dense screen as a lit, tilted panel on the slate (fx/Lit: rim on the key side, its
//          shadow on the ground), crossing the frame's right edge; the film's one 3D turn: the camera swings round it
//          (CAM3D.house degrees on one axis over 108 f, E.strongInOut) and creeps on. The imperatives sit flush left
//          beside it: the first drops into place word by word (fx/TypePresets fall) and leaves dropping off right to
//          left; the second falls in and is cut on the push
//   claim  the accent wipes in from the left on the rush over the label's last 20 f (E.launchIn, the film's one colour
//          event), so the shot opens on the full accent, and the
//          imperatives are set as the claim on it (fx/TypeClaim: cap 16 % of the frame or more, flush left at 3 %,
//          -0.04 em, semibold, word by word on the crisp entry); the first flicks up out of the frame, slowing as it
//          clears, and the second arrives as it goes (the accent field never stands empty)

/** The share of its exit at which the claim's first imperative clears the frame (E.glideOut reaches 97 % at about 0.8). */
const TAG_CLEAR = 0.8;
/** The turn (60 fps frames) and the panel at rest (px at 1080p). */
export const TURN = { frames: 108, from: -8 - CAM3D.house, to: -8 } as const;
const PANEL = { w: 1100, h: 660, x: 1430, y: 560 } as const;

export const Taglines: React.FC = () => {
  const F = useAbs('taglines');
  const cut = ACT.end.from;
  const tags = chainOf('tag');
  // a creep all act long (the holds never freeze), then a push into the cut
  const push = creep(F, ACT.taglines.from, { pctPerSec: 0.015 }, FPS) * (1 + 0.05 * prog(F, CUE.push, cut, quadIn));
  const carry = carryOffset(F, ACT.taglines.from, SEAM.rush * U); // the rush, carried and decaying (moving right, from the left of its rest)
  const film = useFilm();
  if (DEAL.taglines === 'claim') {
    const ink = inkOn(C.accent);
    return (
      <AbsoluteFill style={{ background: C.accent, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${(W * 0.03).toFixed(1)}px 50%`, transform: `translate3d(0, ${((-18 * U * Math.max(0, F - ACT.taglines.from)) / FPS).toFixed(2)}px, 0) scale(${push.toFixed(5)})` }}>
          {tags.map((c, i) => {
            // the first flicks up out of the frame on E.glideOut: fast off its read, its last edge clearing the top at 97 %
            // of the travel (under a tenth of its speed) about 4 f before the second arrives, so on the flat accent field
            // nothing stops dead and nothing stands empty
            const lay = i === 0 ? claimLayout({ text: c.text }, film, (t, px, wt, tr) => measureTracked(t, px, wt, tr, FONT.text, { trailing: false })) : null; // as AccentClaim lays it out
            const last = lay?.lines[lay.lines.length - 1];
            const clear = (lay && last ? last.top + lay.size * lay.lead : 0.62 * H) + 0.04 * H;
            const next = tags[1]?.in ?? c.out + f60x(40);
            const exitD = Math.max(f60x(16), (next - c.out - f60x(4)) / TAG_CLEAR);
            const leave = i === 0 ? prog(F, c.out, c.out + exitD, E.glideOut) : 0;
            if (F < c.in - 1 || leave >= 1) return null;
            return (
              <div key={c.id} style={{ position: 'absolute', inset: 0, transform: `translate3d(${(i === 0 ? carry * 0.4 : 0).toFixed(2)}px, ${((-clear / 0.97) * leave).toFixed(2)}px, 0)` }}>
                <AccentClaim text={c.text} at={c.in - 1} frame={F} flood={false} ground={C.accent} color={ink} id={c.id} creep={0.02} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }
  const p = prog(F, ACT.taglines.from - f60x(10), ACT.taglines.from - f60x(10) + f60x(TURN.frames), E.strongInOut);
  const creepT = Math.max(0, F - ACT.taglines.from - f60x(TURN.frames)) / FPS;
  const yaw = mix(TURN.from, TURN.to, p) + 0.5 * creepT;
  const w = PANEL.w * U;
  const h = PANEL.h * U;
  return (
    <AbsoluteFill style={{ background: SHOT.ground, overflow: 'hidden' }}>
      <LitGround frame={F} spec={SLATE} cam={{ base: { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 }, shot: { ax: W / 2, ay: H / 2, sx: W / 2 + carry * 0.25, sy: H / 2, k: push } }} />
      <LightEvent F={F} act="taglines" dark />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `scale(${push.toFixed(5)})` }}>
        <Lit frame={F} x={PANEL.x * U + carry} y={PANEL.y * U} w={w} h={h} r={22 * U} tilt={{ x: 9, y: yaw }} ground={SHOT.ground} id="panel">
          <DenseScreen frame={F} theme={PAGE} world={WORLD} layout="table" w={w} h={h} scale={w / 1600} focus={null} lift={0} drawAt={ACT.taglines.from} />
        </Lit>
        {/* the imperatives on their own layer in front of the panel's 3D space */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, transform: 'translateZ(200px)' }}>
        {tags.map((c, i) => {
          const size = lineSize(c.text, 0.4);
          return (
            <TypeLine
              key={c.id}
              spec={{ preset: 'fall', text: c.text, at: c.in - 1, out: i === 0 ? c.out : undefined, exit: 'drop', colors: { ink: SHOT.text, accent: PAGE.accent, mute: SHOT.mute, ground: SHOT.ground }, id: c.id, emph: EMPH[c.id], keys: keysFor(c.id, c.text), align: 'left' }}
              frame={F}
              size={size}
              x={SAFE.x + carry * 0.6}
              y={H / 2}
            />
          );
        })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
