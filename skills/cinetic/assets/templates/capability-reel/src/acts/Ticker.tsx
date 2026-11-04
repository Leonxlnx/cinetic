import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { MaskList, maskListState } from '../fx/Reels';
import { AppIcon, GlyphTile, hasLogo } from '../kit';
import { E, lmix, prog } from '../lib/anim';
import { launch } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, TICKS, W } from '../timeline';
import { REEL } from '../reel';
import { LIGHT, lineSize, useAbs } from './stage';

// TICKER - what the product returns, as a wheel: an icon tile and a word list that steps a row every 10 f (or closer: TICKS), hard
// and unblurred (fx/Reels MaskList), the neighbours kept faint by a fixed mask, the icon swapping on the same frame (a
// capability that is another product shows its real mark on an app-icon tile, the rest a generic glyph).
// The act opens still zooming out from the statement; its exit launches left, its last frame the fastest, and the
// claim opens on that speed.

const TILE = 300 * U;
/** The exit: px per frame on the cut, leftward. */
export const TICKER_EXIT = { vCut: -45 * U }; // the tile is still in frame on the cut, and the claim carries 0.6 of it with its words under 20 px/f

export const Ticker: React.FC = () => {
  const F = useAbs('ticker');
  const t = LIGHT;
  const longest = REEL.capabilities.reduce((a, c) => (c.word.length > a.length ? c.word : a), '');
  const size = lineSize(longest, 'display', 0.62);
  const pitch = size * 1.18;
  const k = lmix(1.1, 1, prog(F, ACT.ticker.from, ACT.ticker.from + f60x(24), E.snapOut));
  const lo = { vCut: TICKER_EXIT.vCut, fps: FPS };
  const dx = launch(F, ACT.claim.from - 1, lo).x - launch(ACT.claim.from - 1 - f60x(90), ACT.claim.from - 1, lo).x;
  const exitV = launch(F, ACT.claim.from - 1, lo).v / U; // the exit's speed (px/f at 1080p) smears the layer along it
  const list = { n: REEL.capabilities.length, pitch, start: CUE.tick0, steps: TICKS, id: 'capabilities' };
  const idx = maskListState(F, list, { fps: FPS }).index;
  const listW = 1100 * U;
  const x0 = (W - (TILE + 70 * U + listW)) / 2;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={exitV} axis="x" id="ticker-exit">
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `translate3d(${dx.toFixed(2)}px, 0, 0) scale(${k.toFixed(5)})` }}>
        <div style={{ position: 'absolute', left: x0, top: H / 2 - TILE / 2 }}>
          {hasLogo(REEL.capabilities[idx].logo) ? <AppIcon logo={REEL.capabilities[idx].logo} size={TILE} theme={t} lift={30} /> : <GlyphTile theme={t} name={REEL.capabilities[idx].glyph} size={TILE} solid />}
        </div>
        <MaskList
          {...list}
          frame={F}
          x={x0 + TILE + 70 * U + listW / 2}
          y={H / 2}
          width={listW}
          render={(i) => (
            <div style={{ height: pitch, display: 'flex', alignItems: 'center' }}>
              <span data-text={`capability-${i}`} style={{ ...typeStyle('display', size), color: t.text, lineHeight: TYPE.display.lead }}>
                {REEL.capabilities[i].word}
              </span>
            </div>
          )}
        />
      </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
