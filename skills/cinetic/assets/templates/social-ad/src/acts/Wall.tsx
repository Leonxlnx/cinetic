import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { masonryState, type MasonryTile } from '../fx/Scroll';
import { mix, prog } from '../lib/anim';
import { useFilm } from '../lib/film';
import { copy, CUE, f60, f60x, H, POP_GAP, W } from '../timeline';
import { adSize, adStyle, adWidth, PictureCard, PAGE, useAbs } from './stage';

// WALL - a wall of pictures enters scrolling up, and it is not one rigid plane: every tile settles on its own depth
// and lag (fx/Scroll masonryState), so it lands like a stack of separate cards. The claim sits in the gap and rides
// the hero tile's track; its words pop on a few frames apart and its last word stands on the accent pill, which pops
// from 62 % to full size in 2 f with no overshoot. One shared ease-in exit carries the whole wall up into the cut.

/** The wall at 1080p, laid round a clear band through the middle (y 340-700) where the claim sits. */
export const TILES: MasonryTile[] = [
  { x: 780, y: 40, w: 360, h: 290, depth: 1.0 }, // the hero: the claim rides its track
  { x: 780, y: 720, w: 360, h: 330, depth: 1.15, lag: 1 },
  { x: 330, y: -90, w: 410, h: 420, depth: 0.8 },
  { x: 330, y: 710, w: 410, h: 420, depth: 1.3, lag: 2 },
  { x: 1180, y: -50, w: 410, h: 380, depth: 0.9, lag: 1 },
  { x: 1180, y: 700, w: 410, h: 440, depth: 1.2, lag: 2 },
  { x: -170, y: 120, w: 450, h: 600, depth: 0.6, lag: 1 },
  { x: 1640, y: 90, w: 450, h: 640, depth: 0.7 },
];
/** The wall's shared exit (60 fps frames): short, so it is fast on the cut. */
export const WALL_EXIT = 10;
/** The pill's pop: from 62 % to full in 2 f at 60 fps, no spring. */
export const PILL_POP = { from: 0.62, frames: 2 } as const;

export const Wall: React.FC = () => {
  const F = useAbs('wall');
  const c = copy('find');
  const words = c.text.trim().split(/\s+/);
  const n = words.length;
  const tiles = masonryState(F, { at: CUE.wall, out: CUE.wallOut, exit: WALL_EXIT, tiles: TILES }, useFilm());
  const ride = tiles[0].y - TILES[0].y * U;
  const fast = tiles.reduce((m, t) => Math.max(m, Math.abs(t.v)), 0);
  const size = adSize(c.text, 0.6);
  const padX = 0.32 * size;
  const ws = words.map((w) => adWidth(w, size));
  const space = adWidth('a a', size) - 2 * adWidth('a', size);
  const total = ws.reduce((a, b) => a + b, 0) + space * (n - 1) + 2 * padX;
  let x = (W - total) / 2;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <DirBlur v={fast} axis="y" id="wall">
        {tiles.map((t) => (
          <div key={t.i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0)` }}>
            <PictureCard i={t.i + 8} w={t.w} h={t.h} />
          </div>
        ))}
      </DirBlur>
      <div data-text="find" style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.1) / 2 + ride, width: W, height: size * 1.1 }}>
        {words.map((w, i) => {
          const at = c.in + f60(POP_GAP * i);
          const last = i === n - 1;
          const left = x + (last ? padX : 0);
          x += ws[i] + space + (last ? 2 * padX : 0);
          if (F < at) return null;
          if (!last) return <span key={i} style={{ ...adStyle(size), position: 'absolute', left, top: 0 }}>{w}</span>;
          const k = mix(PILL_POP.from, 1, prog(F, at, at + f60x(PILL_POP.frames), (t) => t));
          return (
            <span key={i} style={{ position: 'absolute', left: left - padX, top: -0.08 * size, padding: `${(0.08 * size).toFixed(1)}px ${padX.toFixed(1)}px`, borderRadius: size * 0.62, background: PAGE.accent, transform: `scale(${k.toFixed(4)})`, transformOrigin: '50% 50%' }}>
              <span style={adStyle(size, PAGE.accentInk)}>{w}</span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
