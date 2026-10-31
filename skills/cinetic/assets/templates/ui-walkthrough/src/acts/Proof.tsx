import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, U } from '../brand/tokens';
import { DEAL } from '../deal';
import { Defocus } from '../fx/Defocus';
import { Stack } from '../fx/Stack';
import { ContentWall, Notice, type TileNode } from '../kit';
import { E, lmix, prog } from '../lib/anim';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { Cam, Ground, HOLD, GROUNDS, themeOf, useAbs } from './stage';

// PROOF - results arriving, faster and faster, by the dealt device: 'stack' piles notices in front (fx/Stack: the
// newest rises from behind into the front slot, the older ones step back smaller), 'river' sends them flowing up through
// three depths at their own speeds (near large and soft, mid sharp, far small and soft), 'wall' lands them as content
// tiles tumbling into a wall the camera pushes through. The act opens on the zoom-through's speed (the camera still
// settling in from 1.3x) and ends on a panel of the claim's ground wiping up, accelerating into the cut.

export const TOASTS = ['toast0', 'toast1', 'toast2', 'toast3', 'toast4'].map((k) => CUE[k]);
/** The frames the proof's items land on (for the sound): one per result. */
export const proofHits = (): number[] => TOASTS.slice(0, WALK.proof.length).map((f) => f + Math.round(f60x(DEAL.proof === 'stack' ? 4 : 10)));
/** The colour the wipe carries in: the claim's flood or its ground. */
export const WIPE_COLOUR = DEAL.claim === 'accent' ? C.accent : GROUNDS.claim.base;

const NOTICE = { w: 1180 * U, h: 200 * U } as const;

/** One notice drawn at its film size. */
const N: React.FC<{ i: number }> = ({ i }) => {
  const t = themeOf('proof');
  const p = WALK.proof[i % WALK.proof.length];
  return <Notice theme={t} w={NOTICE.w} h={NOTICE.h} glyph={p.glyph} title={p.title} body={p.body} meta={p.meta} id={`proof-${i}`} />;
};

/** The river: notices on three depths flowing up at constant speeds (closed form in the frame). */
const River: React.FC<{ F: number }> = ({ F }) => {
  const lanes = [
    { k: 0.62, x: W * 0.17, speed: 3.2, blur: 6, phase: 0.1 },
    { k: 1, x: W * 0.4, speed: 5.4, blur: 0, phase: 0.55 },
    { k: 1.3, x: W * 1.04, speed: 7.6, blur: 10, phase: 0.3 },
  ];
  const t0 = ACT.proof.from;
  return (
    <>
      {lanes.map((l, li) => {
        const pitch = (NOTICE.h + 70 * U) * l.k;
        // enough notices that one wraps from the top to the bottom only while both places are off the frame
        const n = Math.ceil((H + NOTICE.h * l.k + 40 * U) / pitch) + 1;
        const len = pitch * n;
        const l2 = { ...l, n };
        const lane = (
          <div style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: l2.n }, (_, j) => {
              const y0 = (j + l.phase) * pitch - ((F - t0) * l.speed * U * 60) / FPS;
              const y = (((y0 % len) + len) % len) - (NOTICE.h * l.k + 20 * U);
              const arrive = prog(F, TOASTS[j % TOASTS.length], TOASTS[j % TOASTS.length] + f60x(30), E.glideOut);
              return (
                <div key={j} style={{ position: 'absolute', left: 0, top: 0, opacity: li === 1 ? arrive : 0.9, transform: `translate3d(${(l.x - (NOTICE.w * l.k) / 2).toFixed(2)}px, ${(y + (1 - arrive) * 60 * U).toFixed(2)}px, 0) scale(${l.k})`, transformOrigin: '0 0' }}>
                  <N i={j + li * 2} />
                </div>
              );
            })}
          </div>
        );
        return (
          <div key={li} style={{ position: 'absolute', inset: 0, zIndex: li }}>
            {l.blur ? <Defocus sigma={l.blur}>{lane}</Defocus> : lane}
          </div>
        );
      })}
    </>
  );
};

export const Proof: React.FC = () => {
  const F = useAbs('proof');
  const t = themeOf('proof');
  // the zoom-through's speed carried in: the camera settles from 1.3x (glide), then a slow push keeps the act alive
  const k = lmix(1.3, 1, prog(F, ACT.proof.from, ACT.proof.from + f60x(34), E.glideOut)) * lmix(1, 1.06, prog(F, ACT.proof.from, ACT.claim.from, E.linear));
  const d = HOLD; // the hold rests between moves (no drift)
  // the wipe into the claim: a panel of the claim's ground rising from the bottom edge, covering the frame on the act line
  const wipe = prog(F, CUE.wipe, ACT.claim.from, E.launchIn);
  const n = Math.min(WALK.proof.length, TOASTS.length);
  const nodes: TileNode[] = WALK.proof.map((p, i) => ({ glyph: 'bolt', label: p.title, sub: p.body, value: p.meta, preview: (['doc', 'chart', 'list', 'table', 'bars'] as const)[i % 5], seed: `${WALK.name}:proof:${i}` }));
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <Ground act="proof" F={F} />
      <Cam k={k} dx={d.x} dy={d.y}>
        {DEAL.proof === 'river' ? (
          <River F={F} />
        ) : DEAL.proof === 'wall' ? (
          <ContentWall nodes={nodes} frame={F} start={ACT.proof.from - Math.round(f60x(26))} tile={250 * U} stagger={3} theme={t} seed={`${WALK.name}:proof`} clear={{ w: 0, h: 0 }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: undefined }}>
            <Stack frame={F} arrivals={[ACT.proof.from - Math.round(f60x(18)), ...TOASTS.slice(1, n)]} enter={24} x={W / 2} y={H * 0.3} width={NOTICE.w} height={NOTICE.h} render={(i) => <N i={i} />} />
          </div>
        )}
      </Cam>
      {wipe > 0 && <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, background: WIPE_COLOUR, transform: `translate3d(0, ${((1 - wipe) * H).toFixed(2)}px, 0)` }} />}
    </AbsoluteFill>
  );
};
