import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { CodePanel, face } from '../kit';
import { E, track } from '../lib/anim';
import type { CamMove } from '../lib/camera';
import { useFilm } from '../lib/film';
import { ACT, CUE, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { Caption, glass, INK, tail, useAbs, World } from './stage';

// WINDOW - the product working. The app window rises from below with an expo tail and keeps drifting; its status chip
// pulses; the code streams by line cadence (a row, a pause, then faster: fx/TypeOn's stream as a panel, kit CodePanel),
// the gutter full from the start. The camera zooms out on a whip into a blur peak and, on the frame it settles, pushes
// in turning in 3D; then it whips out upward and the cut lands on the blur peak.

/** The window (px at 1080p), its rise, and the code's row cadence: [60 fps frames from the stream cue, share of the rows]. */
export const WIN = { w: 1440, h: 740, y: -50, rise: 620, head: 92 } as const;
export const STREAM: [number, number][] = [[0, 0.01], [2, 0.05], [22, 0.1], [42, 0.35], [66, 0.6], [102, 1]];

export const windowMoves = (): CamMove[] => [
  { at: ACT.window.from, frames: CUE.zoomOut - ACT.window.from, zoom: 1.03, ease: E.linear },
  { at: CUE.zoomOut, frames: f60(20), zoom: 0.52, ease: E.strongInOut },
  { at: CUE.push3d, frames: f60(80), zoom: 1.6, yaw: -12, ease: E.glideOut },
  { at: CUE.whipOut, frames: ACT.cards.from - CUE.whipOut, pan: { y: -1100 * U }, ease: E.launchIn },
];

export const Window: React.FC = () => {
  const F = useAbs('window');
  const film = useFilm();
  const w = WIN.w * U;
  const h = WIN.h * U;
  const x = (W - w) / 2;
  const y = (H - h) / 2 + WIN.y * U + tail(F, ACT.window.from, WIN.rise * U, film.fps, 0.05);
  const head = WIN.head * U;
  const n = TEASER.code.length;
  const rows = track(((F - CUE.stream) * 60) / film.fps, STREAM.map(([f, s]) => [f, s * n] as [number, number]));
  const ui = 38 * U;
  const pulse = 0.55 + 0.45 * Math.cos((F - ACT.window.from) / f60x(9));
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <World F={F} moves={windowMoves()}>
        <div data-ui style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', ...glass(28 * U) }}>
          <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: head, display: 'flex', alignItems: 'center', gap: ui * 0.6, padding: `0 ${ui}px`, boxShadow: `inset 0 -${(1.5 * U).toFixed(2)}px 0 ${INK.line}` }}>
            <span data-text="window-title" style={face(ui, 600, INK.text)}>{TEASER.window.title}</span>
            <div style={{ flex: 1 }} />
            {F >= ACT.window.from + f60(20) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: ui * 0.4, padding: `${ui * 0.25}px ${ui * 0.55}px`, borderRadius: ui, background: INK.well }}>
                <div style={{ width: ui * 0.35, height: ui * 0.35, borderRadius: ui, background: INK.accent, opacity: pulse }} />
                <span data-text="status" style={face(ui * 0.95, 500, INK.mute)}>{TEASER.window.status}</span>
              </div>
            )}
          </div>
          <div style={{ position: 'absolute', left: ui, top: head + ui * 0.8, right: ui }}>
            <CodePanel theme={INK} w={w - 2 * ui} lines={TEASER.code} rows={F < CUE.stream ? 0 : rows} size={32 * U} gutter={14} id="code" />
          </div>
        </div>
      </World>
      <Caption id="build" F={F} y={H - 110 * U} />
    </AbsoluteFill>
  );
};
