import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DepthStack, type DepthItem, depthPush } from '../fx/DepthStack';
import { TypeLine } from '../fx/TypePresets';
import { TypePush } from '../fx/TypePush';
import { settleLeft, Words } from '../fx/Words';
import { AppIcon, ContentTile, worldNodes } from '../kit';
import { E, prog } from '../lib/anim';
import { EXPLAIN } from '../explain';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, FPS, H, speechStarts, W } from '../timeline';
import { WORLD } from './product';
import { ActGround, EMPH, keysFor, PAGE, sentenceSize, sentenceStyle, sentenceWidth, useAbs, useCrisp } from './stage';

// PAIN - the problem as one line, the turn of the story; it enters carrying the last line's rightward speed and
// leaves the same way, accelerating into a cut at speed. The dealt device (src/deal.ts):
//   land   the whole line cuts in at x1.7 in the accent and lands on E.glideOut over 34 f (fx/TypePresets land: a
//          slight defocus rides the scale and is gone as it lands; the accent cools to ink 12 f before), while the
//          line drifts right (the last line's speed carried, 125 px decaying, 90 % home in 30 f); a second after the
//          cut the page's light dims once
//   push   the line is said on the crisp entry, then the camera pushes through it onto its last word (fx/TypePush,
//          1.0 -> 2.2x on E.cam over 52 f, following the reading point, the line crossing the frame's edges)
//   crowd  the line in front of the tools it names: the products it works with as app icons (explain.ts
//          integrations), or the product's own records as content tiles, on a far wall turned 16 degrees and on a
//          soft near plane crossing the edges (fx/DepthStack); the camera pushes through the stack
// Every depth item says what it carries (a line of text, an app's real mark, a record of the product's world).

/** The beat's drift and exit (px at 1080p). */
export const BEAT_MOVE = { drift: 125, exit: 150 } as const;

const ICONS = EXPLAIN.integrations.length >= 2;
const crowdItems = (lineW: number, lineH: number): DepthItem[] => {
  const tile = ICONS ? ('icon' as const) : ('data' as const);
  return [
    { id: 'line', plane: 'mid', carries: 'text', x: W / 2, y: H / 2, w: lineW, h: lineH },
    // the tools are there on the cut (the camera's decaying move carries the last line's speed through them)
    { id: 't0', plane: 'far', carries: tile, x: 330 * U, y: 260 * U, w: 300 * U, h: 300 * U, r: 34 * U },
    { id: 't1', plane: 'far', carries: tile, x: 960 * U, y: 170 * U, w: 280 * U, h: 280 * U, r: 32 * U },
    { id: 't2', plane: 'far', carries: tile, x: 1600 * U, y: 280 * U, w: 300 * U, h: 300 * U, r: 34 * U },
    { id: 't3', plane: 'far', carries: tile, x: 520 * U, y: 860 * U, w: 280 * U, h: 280 * U, r: 32 * U },
    { id: 't4', plane: 'far', carries: tile, x: 1420 * U, y: 880 * U, w: 300 * U, h: 300 * U, r: 34 * U },
    { id: 't5', plane: 'near', carries: tile, x: 60 * U, y: 960 * U, w: 300 * U, h: 300 * U, r: 34 * U },
    { id: 't6', plane: 'near', carries: tile, x: 1880 * U, y: 110 * U, w: 280 * U, h: 280 * U, r: 32 * U },
  ];
};
const NODES = worldNodes(WORLD, 8);

export const Pain: React.FC = () => {
  const F = useAbs('pain');
  const crisp = useCrisp();
  const c = copy('pain');
  const size = sentenceSize(c.text);
  const words = c.text.trim().split(/\s+/);
  const n = words.length;
  const cut = ACT.promise.from;
  // in: the last 125 px of a decaying drift from the left (it carries the last line's rightward speed, about 10 px/f
  // on the cut, x0.93 a frame); out: an ease-in exit the same way
  const out = Math.min(c.out, cut - f60x(14));
  const carry = -BEAT_MOVE.drift * U * settleLeft(F - ACT.pain.from, f60x(30));
  // and the hold keeps drifting right at 30 px/s, so the read never freezes
  const hold = (0.5 * U * Math.max(0, F - c.resolved) * 60) / FPS + BEAT_MOVE.exit * U * prog(F, out, cut, E.launchIn);
  const x = carry + hold;
  const lineW = sentenceWidth(c.text, size);
  const said = speechStarts(c.in - 1, n);
  // the problem's last word lands in the accent and cools to ink (the house transient accent): the word the line turns on
  const keyword = { accent: PAGE.accent, accentOn: 'last' as const, color: PAGE.text };
  const saidLine = <Words id="pain" text={c.text} frame={F} start={c.in - 1} {...crisp} starts={said} arriveX={-0.25} size={size} {...keyword} style={sentenceStyle(size)} />;
  const centred = <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.2) / 2, width: W, display: 'flex', justifyContent: 'center' }}>{saidLine}</div>;
  if (DEAL.pain === 'push') {
    // the reading point: the last word's centre, the line laid out centred
    const before = sentenceWidth(words.slice(0, -1).join(' ') + ' ', size);
    const lastW = sentenceWidth(words[n - 1], size);
    const read = { x: (W - lineW) / 2 + before + lastW / 2, y: H / 2 };
    return (
      <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
        <ActGround F={F} act="pain" />
        {F >= c.in && F < cut && (
          <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${x.toFixed(2)}px, 0, 0)` }}>
            <TypePush frame={F} push={{ at: CUE.painPush, read: [{ x: W / 2, y: H / 2 }, read], to: 2.2 }}>
              {centred}
            </TypePush>
          </div>
        )}
      </AbsoluteFill>
    );
  }
  if (DEAL.pain === 'crowd') {
    const items = crowdItems(lineW, size * 1.2);
    return (
      <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
        <ActGround F={F} act="pain" />
        {F < cut && (
          <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${carry.toFixed(2)}px, 0, 0)` }}>
          <DepthStack
            frame={F}
            items={items}
            cam={{ moves: depthPush(ACT.pain.from, { frames: f60x(150), zoom: 1.22, pan: 40 * U, yaw: 5, ease: E.stdInOut }) }} // the stack carries the cut's speed (the container); the camera then pushes through
            render={(id, s) => {
              if (id === 'line')
                return (
                  <div style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, transform: `translate3d(${hold.toFixed(2)}px, 0, 0)` }}>
                    {F >= c.in && <Words id="pain" text={c.text} frame={F} start={c.in - 1} {...crisp} starts={said} arriveX={-0.25} size={size} {...keyword} style={sentenceStyle(size)} />}
                  </div>
                );
              const i = Number(id.slice(1));
              return ICONS ? <AppIcon logo={EXPLAIN.integrations[i % EXPLAIN.integrations.length]} size={s.w} theme={PAGE} lift={16} /> : <ContentTile node={NODES[i % NODES.length]} theme={PAGE} w={s.w} lift={14} />;
            }}
          />
          </div>
        )}
      </AbsoluteFill>
    );
  }
  // land: the whole line at once, oversized in the accent, landing crisp while it drifts
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="pain" />
      {F >= c.in - 1 && F < cut && (
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${x.toFixed(2)}px, 0, 0)` }}>
          <TypeLine spec={{ preset: 'land', text: c.text, at: c.in - 1, colors: { ink: PAGE.text, accent: PAGE.accent, mute: PAGE.mute }, id: 'pain', emph: EMPH.pain, keys: keysFor('pain', c.text) }} frame={F} size={size} y={H / 2} />
        </div>
      )}
    </AbsoluteFill>
  );
};
