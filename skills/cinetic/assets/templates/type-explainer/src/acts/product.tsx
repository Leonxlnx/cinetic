// The product moment: one world drawn at the full frame and shown twice, inside the promise line (scaled into the
// pill, so the pill's last frame IS the next shot's first) and full bleed in the picture act. By default it is the
// product's own screen built in code (kit DenseScreen from explain.ts screen: fill it from the
// product's real screens before shipping), a lit panel on its own lit ground; a supplied photograph only when the
// brief gives one (explain.ts picture.kind 'photo'). The picture slot's device decides the space:
//   turn   the screen as a lit, tilted panel (fx/Lit); the film's one 3D turn: the camera swings 22 degrees round it
//          on one axis over 108 f (60 fps) and creeps on, the ground riding the turn at the background's weight
//   stack  the screen between content cards in three planes (fx/DepthStack: far wall turned, near cards soft and
//          crossing the edges); the camera pushes through them
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { DepthStack, type DepthItem, depthPush } from '../fx/DepthStack';
import { LitGround } from '../fx/Grounds';
import { Lit } from '../fx/Lit';
import { ContentTile, DenseScreen, filmWorld, Photo, worldNodes } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { CAM3D } from '../lib/camera';
import { EXPLAIN } from '../explain';
import { DEAL } from '../deal';
import { ACT, f60x, FPS, H, W } from '../timeline';
import { GROUNDS, LightEvent, PAGE, SHOT } from './stage';

/** The world the screen shows: the film's own rows (explain.ts screen). */
export const WORLD = filmWorld(EXPLAIN.screen);
/** The panel at rest (px at 1080p): the screen's size and centre. */
export const PANEL = { w: 1360, h: 782, x: 960, y: 540 } as const;

/** The turn: the screen turns round and lands face-on over the move (lib/camera CAM3D numbers), then a sub-pixel creep of its pan. */
export const TURN = { from: ACT.picture.from - f60x(40), frames: f60x(140) } as const; // it starts while the pill grows, so the pill already turns
const turnOf = (F: number) => {
  const p = prog(F, TURN.from, TURN.from + TURN.frames, E.strongInOut);
  const creep = Math.max(0, F - TURN.from - TURN.frames) / FPS;
  return { yaw: mix(-CAM3D.house, 0, p), pitch: mix(9, 0, p), pan: mix(70, 0, p) * U - 8 * creep * U };
};

/** The screen itself, drawn at w x h (the kit's dense screen, or the supplied photo). */
const Screen: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) =>
  EXPLAIN.picture.kind === 'photo' && EXPLAIN.picture.src ? (
    <Photo theme={SHOT} w={w} h={h} src={staticFile(EXPLAIN.picture.src)} push={prog(F, ACT.promise.from, ACT.system.from, E.linear) * 0.3} />
  ) : (
    <DenseScreen frame={F} theme={PAGE} world={WORLD} layout={EXPLAIN.picture.layout} w={w} h={h} scale={w / 1600} focus={null} lift={0} drawAt={ACT.picture.from} />
  );

/** The far and near cards of the stack: the world's own records and people as content tiles. */
const NODES = worldNodes(WORLD, 6);
const STACK: DepthItem[] = [
  { id: 'screen', plane: 'mid', carries: 'ui', x: 960, y: 560, w: 1180, h: 680, r: 22 },
  { id: 'far0', plane: 'far', carries: 'data', x: 300, y: 300, w: 360, h: 360, r: 40 },
  { id: 'far1', plane: 'far', carries: 'data', x: 1640, y: 760, w: 360, h: 360, r: 40 },
  { id: 'far2', plane: 'far', carries: 'data', x: 1580, y: 250, w: 320, h: 320, r: 36 },
  { id: 'near0', plane: 'near', carries: 'data', x: 170, y: 900, w: 300, h: 300, r: 34 },
  { id: 'near1', plane: 'near', carries: 'data', x: 1800, y: 140, w: 280, h: 280, r: 32 },
];

/** The product moment at absolute frame F, at the full frame: its ground, the screen in its light, the device's camera. */
export const ProductScene: React.FC<{ F: number }> = ({ F }) => {
  if (EXPLAIN.picture.kind === 'photo') {
    return (
      <AbsoluteFill style={{ background: SHOT.ground, overflow: 'hidden' }}>
        <Screen F={F} w={W} h={H} />
      </AbsoluteFill>
    );
  }
  if (DEAL.picture === 'stack') {
    const from = ACT.promise.from + (ACT.picture.from - ACT.promise.from) * 0.5;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <LitGround frame={F} spec={GROUNDS.picture} />
        <LightEvent F={F} act="picture" dark />
        <DepthStack
          frame={F}
          items={STACK.map((it) => ({ ...it, x: it.x * U, y: it.y * U, w: it.w * U, h: it.h * U, r: (it.r ?? 0) * U }))}
          cam={{ moves: depthPush(from, { frames: f60x(150), zoom: 1.26, pan: -70 * U, yaw: 6 }) }}
          rim
          render={(id, s) =>
            id === 'screen' ? (
              <Screen F={F} w={s.w} h={s.h} />
            ) : (
              <ContentTile node={NODES[Number(id.slice(-1)) + (id.startsWith('near') ? 3 : 0)]} theme={PAGE} w={s.w} lift={14} />
            )
          }
        />
      </AbsoluteFill>
    );
  }
  const t = turnOf(F);
  const w = PANEL.w * U;
  const h = PANEL.h * U;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <LitGround frame={F} spec={GROUNDS.picture} cam={{ base: { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 }, shot: { ax: W / 2, ay: H / 2, sx: W / 2 + t.pan * 1.6, sy: H / 2, k: 1 } }} />
      <LightEvent F={F} act="picture" dark />
      <Lit frame={F} x={PANEL.x * U + t.pan} y={PANEL.y * U} w={w} h={h} r={22 * U} tilt={{ x: t.pitch, y: t.yaw }} ground={SHOT.ground} id="product">
        <Screen F={F} w={w} h={h} />
      </Lit>
    </AbsoluteFill>
  );
};
