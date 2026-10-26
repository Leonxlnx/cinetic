import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, U } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { StepList } from '../fx/Loaders';
import { Avatar, Chip, face, KIT_TYPE, Photo, Surface } from '../kit';
import { clamp, E, hitPulse, lmix, mix, prog, track } from '../lib/anim';
import { mixColor } from '../lib/color';
import { creep, intoCut } from '../lib/handoff';
import { ACT, CUE, f60, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { DARK, LIGHT, useAbs } from './stage';

// CARD - the signature: the user's input as one object, rising as a tilted card while the ground turns from the
// paper to the stage edges-first. It creeps, eases into a zoom, and on ONE frame (the hidden cut) jumps to half its
// size and flat, softened, under a short tinted swell: the same card is now the output. Its title wipes on, the old
// subtitle wipes out as the new one wipes in, the input's details drop away, and a three-row checklist builds in the
// card while two punch-ins (one-frame scale steps) follow the rows. Continuity comes from the container, never a cut.

/** The card in world px (at k = 1 it sits whole in the frame) and the screen scales of its story. */
export const CARD = { w: 1040 * U, h: 760 * U, k0: 2.1, tilt0: 30, tilt1: 21, tilt2: 14, pre: 0.85, jump: 0.52, after: 0.47, punch: 1.12 } as const;
const cx = W / 2;
const cy = H / 2 + 20 * U;
const left = cx - CARD.w / 2;
const top = cy - CARD.h / 2;

/** The camera's scale at absolute frame F: creep, the ease into the jump, the jump, the settle, two punches, the push into the cut. */
export const cardK = (F: number) => {
  const pre = lmix(1, CARD.pre, prog(F, CUE.zoomIn, CUE.jump, E.buildIn));
  const settle = lmix(CARD.jump / CARD.pre, CARD.after / CARD.pre, prog(F, CUE.jump, CUE.jump + f60x(22), E.snapOut));
  const jumped = F >= CUE.jump ? settle : 1;
  const punches = (F >= CUE.punch1 ? CARD.punch : 1) * (F >= CUE.punch2 ? CARD.punch : 1);
  return CARD.k0 * creep(F, CUE.creep, { pctPerSec: 0.03 }, FPS) * pre * jumped * punches * lmix(1, 1.15, intoCut(F, ACT.proof.from, 30, FPS));
};

/** The card's tilt (deg, rotateX): 30 on the rise, creeping to 21, 14 into the jump, flat from it. */
const tiltAt = (F: number) => (F >= CUE.jump ? 0 : track(F, [[CUE.rise, CARD.tilt0], [CUE.zoomIn, CARD.tilt1], [CUE.jump, CARD.tilt2]]));

/** The tinted swell around the jump frame (opacity of a light accent-tinted veil), 5 frames at 30 fps. */
const swell = (F: number) => track(F, [[CUE.jump - f60(4), 0], [CUE.jump - f60(2), 0.12], [CUE.jump, 0.55], [CUE.jump + f60(2), 0.46], [CUE.jump + f60(4), 0.2], [CUE.jump + f60(8), 0]]);

const initials = (s: string) => s.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'IN';

export const Card: React.FC = () => {
  const F = useAbs('card');
  const t = DARK;
  const k = cardK(F);
  const rise = prog(F, CUE.rise, CUE.rise + f60x(34), E.snapOut);
  const dy = (1 - rise) * H * 0.9;
  // the ground turns from the paper to the stage edges-first under the rising card (10 f)
  const turn = prog(F, CUE.rise, CUE.rise + f60x(10), E.snapOut);
  const r = mix(120, -20, turn);
  // the content swap, inside the same card
  const swapped = F >= CUE.swap;
  const wipe = prog(F, CUE.swap, CUE.swap + f60x(8), E.snapOut); // the output's title wipes on
  const subOut = prog(F, CUE.sub - f60x(6), CUE.sub + f60x(10), E.stdInOut);
  const drop = prog(F, CUE.swap, CUE.swap + f60x(8), E.buildIn); // the input's details blur, fade and drop away
  const soft = F >= CUE.jump ? mix(5, 0, clamp((F - CUE.jump) / f60x(6))) + 3 * (hitPulse(F - CUE.punch1, 1, 3, FPS) + hitPulse(F - CUE.punch2, 1, 3, FPS)) : 0;
  const pad = 64 * U;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${LIGHT.ground} ${Math.max(0, r - 30).toFixed(1)}%, ${t.ground} ${Math.max(0.1, r).toFixed(1)}%)`, overflow: 'hidden' }}>
      <Defocus sigma={soft}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${cx}px ${top + CARD.h * 0.35}px`, transform: `translate3d(0, ${dy.toFixed(2)}px, 0) scale(${k.toFixed(5)})` }}>
          <div style={{ position: 'absolute', left, top, width: CARD.w, height: CARD.h, transformOrigin: `50% 35%`, transform: `perspective(${2680 * U}px) rotateX(${tiltAt(F).toFixed(3)}deg)` }}>
            <Surface theme={t} w={CARD.w} h={CARD.h} tone="raised" lift={48} r={44 * U}>
              {/* the input: who or what it is, its numbers, a strip of its pictures fading into the card */}
              {(!swapped || drop < 1) && (
                <div style={{ position: 'absolute', inset: 0, opacity: swapped ? 1 - drop : 1, transform: `translate3d(0, ${(drop * 10 * U).toFixed(2)}px, 0)` }}>
                  <div style={{ position: 'absolute', left: pad, top: pad }}>
                    <Avatar theme={t} i={2} initials={initials(WALK.input.title)} size={150 * U} />
                  </div>
                  <div style={{ position: 'absolute', left: pad, top: 250 * U, display: 'flex', gap: 18 * U }}>
                    {WALK.input.stats.map((s, i) => (
                      <Chip key={i} theme={t} label={s} h={64 * U} id={`card-stat-${i}`} />
                    ))}
                  </div>
                  <div style={{ position: 'absolute', left: 0, top: CARD.h - 300 * U, width: CARD.w, height: 300 * U, display: 'flex', gap: 16 * U, padding: `0 ${pad}px`, boxSizing: 'border-box' }}>
                    {[3, 5, 7, 9].map((seed) => (
                      <div key={seed} style={{ width: 210 * U, height: 236 * U, borderRadius: 20 * U, overflow: 'hidden', flex: 'none' }}>
                        <Photo theme={t} w={210 * U} h={236 * U} seed={seed} />
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'absolute', left: 0, top: CARD.h - 320 * U, width: CARD.w, height: 320 * U, background: `linear-gradient(180deg, transparent 0%, ${t.raised} 92%)` }} />
                </div>
              )}
              {/* the title: the input's, then the output's wiping on over it */}
              <div style={{ position: 'absolute', left: pad + (swapped ? 0 : 180 * U), top: swapped ? pad : pad + 22 * U }}>
                {!swapped || wipe < 1 ? (
                  <span data-text="card-title-in" style={{ ...face(KIT_TYPE.head * U, 650, t.text, -0.03), opacity: swapped ? 0 : 1 }}>
                    {WALK.input.title}
                  </span>
                ) : null}
                {swapped && (
                  <span data-text="card-title-out" style={{ ...face(KIT_TYPE.head * U, 650, t.text, -0.03), position: 'absolute', left: 0, top: 0, clipPath: `inset(0 ${((1 - wipe) * 100).toFixed(2)}% 0 0)` }}>
                    {WALK.output.title}
                  </span>
                )}
              </div>
              {/* the subtitle: the input's handle wipes out left to right while the output's line wipes in */}
              <div style={{ position: 'absolute', left: pad + (swapped ? 0 : 180 * U), top: swapped ? pad + 100 * U : pad + 118 * U }}>
                <span data-text="card-sub-in" style={{ ...face(KIT_TYPE.body * U, 500, t.mute), clipPath: `inset(0 0 0 ${(subOut * 100).toFixed(2)}%)`, display: swapped && subOut >= 1 ? 'none' : undefined }}>
                  {WALK.input.handle}
                </span>
                {swapped && (
                  <span data-text="card-sub-out" style={{ ...face(KIT_TYPE.body * U, 500, t.mute), position: 'absolute', left: 0, top: 0, clipPath: `inset(0 ${((1 - subOut) * 100).toFixed(2)}% 0 0)` }}>
                    {WALK.output.sub}
                  </span>
                )}
              </div>
              {/* the output's steps, built in the same card */}
              {F >= CUE.row1 - 1 && (
                <StepList
                  frame={F}
                  rows={[
                    { at: CUE.row1, done: CUE.done1 },
                    { at: CUE.row2, done: CUE.done2 },
                    { at: CUE.row3, done: CUE.done3 },
                  ]}
                  rowH={110}
                  labels={WALK.output.steps.map((s) => ({ verb: s }))}
                  x={pad}
                  y={300 * U}
                  width={CARD.w - 2 * pad}
                  font={{ size: KIT_TYPE.body * U, weight: 560, family: FONT.text }}
                  colors={{ ink: t.text, mute: t.mute, accent: t.accent, ground: t.raised }}
                />
              )}
            </Surface>
          </div>
        </div>
      </Defocus>
      {/* the swell that hides the swap: a light veil tinted by the accent */}
      {swell(F) > 0.001 && <AbsoluteFill style={{ background: mixColor(t.text, t.accent, 0.3), opacity: swell(F) }} />}
    </AbsoluteFill>
  );
};
