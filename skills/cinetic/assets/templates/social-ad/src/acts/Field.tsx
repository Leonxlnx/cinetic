import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DepthStack, type DepthItem, depthPush } from '../fx/DepthStack';
import { TypeLine } from '../fx/TypePresets';
import { ContentRing, ContentWall } from '../kit';
import { E, mix, prog } from '../lib/anim';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, H, HERO_END, W } from '../timeline';
import { ActGround, capOf, carryOffset, Item, launchOffset, lineSize, lineWidth, NODES, PAGE, SEAM, useAbs } from './stage';

// FIELD - the claim inside the product's own content. It enters carrying the brand's upward speed (the field rises
// into place on a decaying curve, its tiles already there) and launches up together into the cut. The claim arrives word
// by word on the film's voice (fx/TypePresets crisp: each word rising and sharpening); its last word stands on the accent
// pill, which grows from 62 % to full round the word in 10 f (E.snapOut: a glide, never a one-frame pop) as the
// word starts to rise. The field slot's device (src/deal.ts):
//   wall   a wall of content tiles round a box kept clear for the claim (kit ContentWall: the ad's items take the near
//          slots by the centre, the world fills the rest), tumbling out from the centre and settling on depth bands
//   ring   a ring of content tiles round the claim (kit ContentRing), tumbling in in turn and orbiting slowly
//   depth  three planes (fx/DepthStack): far tiles on a wall turned away, the claim on the middle, soft near tiles
//          crossing the frame's edges; the camera pushes through them

/** The pill round the last word: its padding (em) and its growth. */
const PILL = { padX: 0.3, padY: 0.16, from: 0.62, grow60: 10, fade60: 20 } as const; // fade60: never a solid shape in one frame (a third on its first)

// few, large and legible: a far wall of three tiles big enough to read as the product's records, two mid tiles beside
// the claim, one near tile crossing the corner (a far tile that reads as a blank card is filler)
const STACK: DepthItem[] = [
  { id: 'claim', plane: 'mid', carries: 'text', x: W / 2, y: H / 2, w: 1200 * U, h: 200 * U },
  { id: 'm0', plane: 'mid', carries: 'data', x: 330 * U, y: 250 * U, w: 360 * U, h: 300 * U, r: 34 * U },
  { id: 'm1', plane: 'mid', carries: 'data', x: 1610 * U, y: 840 * U, w: 360 * U, h: 300 * U, r: 34 * U },
  { id: 'f0', plane: 'far', carries: 'data', x: 1500 * U, y: 180 * U, w: 520 * U, h: 420 * U, r: 44 * U },
  { id: 'f1', plane: 'far', carries: 'data', x: 420 * U, y: 900 * U, w: 520 * U, h: 420 * U, r: 44 * U },
  { id: 'f2', plane: 'far', carries: 'data', x: 960 * U, y: 120 * U, w: 480 * U, h: 380 * U, r: 44 * U },
  { id: 'n0', plane: 'near', carries: 'data', x: 1880 * U, y: 1000 * U, w: 380 * U, h: 380 * U, r: 40 * U },
];

/** The claim's layout centred on (cx, cy): the head's width, the pill's box and the last word's centre. */
const claimLayout = (cx: number) => {
  const c = copy('find');
  const words = c.text.trim().split(/\s+/);
  const size = lineSize(c.text, 0.6);
  const space = lineWidth('a a', size) - 2 * lineWidth('a', size);
  const wHead = lineWidth(words.slice(0, -1).join(' '), size);
  const pillW = lineWidth(words[words.length - 1], size) + 2 * PILL.padX * size;
  const total = wHead + space * 1.4 + pillW;
  return { pillX: cx + total / 2 - pillW / 2 };
};

/** The claim at absolute frame F, centred on (cx, cy): the words before the last on the film's voice (the crisp entry), the last on its pill. */
const Claim: React.FC<{ F: number; cx: number; cy: number }> = ({ F, cx, cy }) => {
  const c = copy('find');
  const words = c.text.trim().split(/\s+/);
  const head = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];
  const size = lineSize(c.text, 0.6);
  const space = lineWidth('a a', size) - 2 * lineWidth('a', size);
  const wHead = lineWidth(head, size);
  const wLast = lineWidth(last, size);
  const padX = PILL.padX * size;
  const pillW = wLast + 2 * padX;
  const total = wHead + space * 1.4 + pillW;
  const x0 = cx - total / 2;
  const lastAt = c.in - 1 + f60x(7 * (words.length - 1)); // the crisp entry's word gap: the last word lands on its pill in turn
  const g = prog(F, lastAt, lastAt + f60x(PILL.grow60), E.snapOut);
  const show = prog(F, lastAt, lastAt + f60x(PILL.fade60), E.snapOut); // the pill fades up as it grows: at full opacity on its first frame it pops
  const pillH = capOf(size) + 2 * PILL.padY * size + size * 0.18;
  const colors = { ink: PAGE.text, accent: PAGE.accent, mute: PAGE.mute };
  return (
    <>
      {head && <TypeLine spec={{ preset: 'crisp', text: head, at: c.in - 1, colors, id: 'find' }} frame={F} size={size} x={x0 + wHead / 2} y={cy} />}
      {F >= lastAt && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pillW, height: pillH, borderRadius: pillH / 2, background: PAGE.accent, transformOrigin: '50% 50%', transform: `translate3d(${(x0 + total - pillW).toFixed(2)}px, ${(cy - pillH / 2 + size * 0.02).toFixed(2)}px, 0) scale(${mix(PILL.from, 1, g).toFixed(4)})`, opacity: show }} />
      )}
      <TypeLine spec={{ preset: 'crisp', text: last, at: lastAt, colors: { ink: PAGE.accentInk, mute: PAGE.accentSoft ?? PAGE.accentInk, accent: PAGE.accentInk }, id: 'find' }} frame={F} size={size} x={x0 + total - pillW / 2} y={cy} />
    </>
  );
};

export const Field: React.FC = () => {
  const F = useAbs('field');
  const c = copy('find');
  const size = lineSize(c.text, 0.6);
  const enter = carryOffset(F, ACT.field.from, -SEAM.v * U); // the brand's rise, carried and decaying
  const leave = launchOffset(F, ACT.label.from - 1, -SEAM.v * U); // the field launches up into the cut
  const y = enter + leave;
  // the type push: once the claim is read the camera leans into its pill (x1.14 on E.stdInOut over 40 f), carried into the exit
  const lean = 1 + 0.14 * prog(F, CUE.fieldPush, CUE.fieldPush + f60x(40), E.stdInOut);
  const px = claimLayout(W / 2).pillX;
  const nodes = NODES.slice(0, 10);
  const fill = NODES.slice(10);
  const field =
    DEAL.field === 'ring' ? (
      <ContentRing nodes={nodes} fill={fill} frame={F} start={ACT.field.from - f60x(60)} tile={190 * U} rx={720 * U} ry={360 * U} orbit={5} theme={PAGE} seed="field" />
    ) : DEAL.field === 'wall' ? (
      <ContentWall nodes={nodes} fill={fill} frame={F} start={ACT.field.from - f60x(60)} tile={220 * U} clear={{ w: Math.min(W * 0.78, lineWidth(c.text, size) + 2.2 * size), h: size * 2.6 }} theme={PAGE} seed="field" />
    ) : null;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="field" />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${px.toFixed(1)}px 50%`, transform: `translate3d(0, ${y.toFixed(2)}px, 0) scale(${lean.toFixed(5)})` }}>
        {DEAL.field === 'depth' ? (
          <DepthStack
            frame={F}
            items={STACK}
            planes={{ far: { blur: 3 }, near: { blur: 7 } }}
            cam={{ moves: depthPush(ACT.field.from, { frames: f60x(150), zoom: 1.2, pan: -60 * U, yaw: 5, ease: E.glideOut }) }}
            render={(id, s) => (id === 'claim' ? <Claim F={F} cx={s.w / 2} cy={s.h / 2} /> : <Item i={Number(id.slice(1)) + (id.startsWith('f') ? 2 : id.startsWith('n') ? 5 : 0)} w={s.w} h={s.h} lift={16} />)}
          />
        ) : (
          <>
            {field}
            <Claim F={F} cx={W / 2} cy={H / 2} />
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** The claim's whole read (the last word's rise and the pill included), for the sound. */
export const claimLanded = () => copy('find').in + f60x(HERO_END.crisp(copy('find').text.trim().split(/\s+/).length));
