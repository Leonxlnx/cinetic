import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, TYPE, U } from '../brand/tokens';
import { DEAL } from '../deal';
import { DirBlur } from '../fx/Defocus';
import { DepthStack, depthPush } from '../fx/DepthStack';
import { TypePush } from '../fx/TypePush';
import { capHeight, ContentTile, hasLogo, sampleWorld, worldNodes } from '../kit';
import { fitLine, inlineWidth, type InlineRef, ObjectLine } from '../kit/inline';
import { lmix, prog, E } from '../lib/anim';
import { measureTracked } from '../lib/measure';
import { ACT, copy, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { CENTRE, drift, Ground, launchOut, themeOf, useAbs } from './stage';

// OPEN - the promise, already moving on frame 0: one sentence that says what the product is, with the real mark of the
// product the input lives on set inside it at cap height (kit ObjectLine, the crisp hero entry: words rise and sharpen
// while they resolve). The dealt device holds it: 'line' keeps it in a slow push on its lit ground, 'push' sends the
// camera through it to 2.2x onto the mark (fx/TypePush, bleeding off the frame), 'stack' sets it in a depth stack of the
// input's own items. The whole frame then launches up, fastest on the cut, and the card act carries that speed.

/** The launch into the card: px per frame on the cut at 1080p, upward (the card act opens carried at 0.8 of it). */
export const OPEN_EXIT = { vCut: -46 * U };

/** The promise's object: the source's real mark, or a chip with its name until the mark is fetched. */
export const SOURCE: InlineRef = hasLogo(WALK.input.source) ? WALK.input.source : { kind: 'chip', label: WALK.input.sourceName, glyph: 'link' };

/** The promise's size (px) and the screen point of its object (the push's reading point), measured like ObjectLine does. */
const promiseLayout = (ground: 'light' | 'dark') => {
  const role = TYPE.display;
  const base = role.size * U;
  const text = WALK.lines.promise.includes('[]') ? WALK.lines.promise : `${WALK.lines.promise} []`;
  const tokens = text.split(/\s+/).filter(Boolean);
  const slot = tokens.findIndex((t) => t.includes('[]'));
  const objW = (px: number) => inlineWidth(SOURCE, capHeight(px, role.weight), ground, (t: string, s: number) => measureTracked(t, s, 600, -0.01, FONT.text));
  const words = (px: number, list: string[]) => measureTracked(list.map((t) => t.replace('[]', '')).join(' '), px, role.weight, role.track, FONT.text);
  const natural = words(base, tokens) + objW(base);
  const size = fitLine(base, natural, W, H);
  const full = words(size, tokens) + objW(size);
  const before = slot > 0 ? words(size, tokens.slice(0, slot)) + size * 0.28 : 0;
  return { size, read: { x: W / 2 - full / 2 + before + objW(size) / 2, y: H / 2 } };
};

export const Open: React.FC = () => {
  const F = useAbs('open');
  const t = themeOf('open');
  const ground = t.dark ? 'dark' : 'light';
  const c = copy('promise');
  const L = promiseLayout(ground);
  const film = { fps: FPS, width: W, height: H };
  const lift = launchOut('open', F, OPEN_EXIT.vCut); // the whole frame, ground with it
  const v = lift - launchOut('open', F - 1, OPEN_EXIT.vCut);
  const d = drift('open', F, 270, 0.45);
  // the camera is already arriving on frame 0 (a settle from 1.3x over the line's entry); 'line' then keeps a slow linear
  // push under the hold (the line never parks); 'push' and 'stack' bring their own camera after it
  const kIn = lmix(1.3, 1, prog(F, 0, f60x(120), E.settleOut));
  const k = kIn * (DEAL.open === 'line' ? lmix(1, 1.07, prog(F, CUE.line, ACT.card.from, E.linear)) : 1);
  const line = (x = W / 2, y = H / 2) => (
    <ObjectLine id="promise" text={WALK.lines.promise} objects={[SOURCE]} at={c.in} frame={F} role="display" size={L.size} x={x} y={y} color={t.text} ground={ground} theme={t} entry="crisp" />
  );
  const nodes = worldNodes(sampleWorld(`${WALK.name}:open`), 10).map((n, i) => (i < WALK.results.length ? { ...n, label: WALK.results[i].title, sub: WALK.results[i].meta } : n));
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={v / U} axis="y" id="open-launch">
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${d.x.toFixed(3)}px, ${(lift + d.y).toFixed(3)}px, 0)` }}>
          <Ground act="open" F={F} />
          {DEAL.open === 'stack' ? (
            <DepthStack
              frame={F}
              cam={{ base: CENTRE, moves: depthPush(CUE.line + f60x(10), { film, zoom: 1.24, pan: -70, yaw: 5 }) }}
              rim
              items={[
                ...nodes.slice(0, 4).map((_, i) => ({ id: `far-${i}`, plane: 'far' as const, x: W * (0.12 + 0.25 * i), y: H * (i % 2 ? 0.2 : 0.8), w: 300 * U, h: 300 * U, at: CUE.line + f60x(6 * i) })),
                { id: 'line', plane: 'mid' as const, x: W / 2, y: H / 2, w: W, h: 300 * U },
                ...nodes.slice(4, 6).map((_, i) => ({ id: `near-${i}`, plane: 'near' as const, x: i ? W * 0.95 : W * 0.06, y: i ? H * 0.08 : H * 0.92, w: 320 * U, h: 320 * U, at: CUE.line + f60x(14 + 8 * i) })),
              ]}
              render={(id) => {
                if (id === 'line') return line(W / 2, 150 * U);
                const [plane, n] = id.split('-');
                const node = nodes[(plane === 'far' ? 0 : 4) + Number(n)];
                return <ContentTile node={node} theme={t} w={id.startsWith('far') ? 300 * U : 320 * U} />;
              }}
            />
          ) : DEAL.open === 'push' ? (
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `${L.read.x.toFixed(1)}px 50%`, transform: `scale(${kIn.toFixed(5)})` }}>
              <TypePush push={{ at: CUE.push, read: [{ x: W / 2, y: H / 2 }, L.read], toward: { x: W / 2, y: H / 2 } }} frame={F}>
                {line()}
              </TypePush>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, transformOrigin: `${L.read.x.toFixed(1)}px 50%`, transform: `scale(${k.toFixed(5)})` }}>{line()}</div>
          )}
        </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
