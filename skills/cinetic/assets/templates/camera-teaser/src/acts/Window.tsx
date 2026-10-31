import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, U } from '../brand/tokens';
import { Lit } from '../fx/Lit';
import { CodePanel, DenseScreen, face, filmWorld } from '../kit';
import { E, prog, track } from '../lib/anim';
import { glideValue } from '../lib/continuity';
import { type CamMove, type Shot, swing3d } from '../lib/camera';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { ReadBack } from '../fx/ReadBack';
import { ACT, copy, CUE, DEAL, f60, f60x, H, W } from '../timeline';
import { TEASER } from '../teaser';
import { BASE, Caption, glass, GROUNDS, INK, useAbs, World } from './stage';

/** The split window's live screen: the product's own rows (teaser.ts screen). */
const WORLD = filmWorld(TEASER.screen);

// WINDOW - the product working, under the film's one 3D turn (lib/camera swing3d: 22 degrees on one axis over 108 f
// at 60 fps on E.strongInOut, landing front-on and creeping on). The app window arrives on the turn itself (one
// carrying move, no rise queued before it), lit in the film's light; its status chip pulses; the code
// streams by line cadence (kit CodePanel in the film's mono). The camera drifts on, then whips out upward into the
// cut. The deal's device:
//   yaw    the camera swings round a vertical hinge to face the window
//   pitch  the camera rises over the desk: the window lies back and comes up to face it (a tabletop turn)
//   split  the window holds the code beside the app it is building (kit DenseScreen, the product's records, one row
//          readable at a time), the camera swinging round the hinge between them

/** The window (px at 1080p), its head, the turn and the code's row cadence: [60 fps frames from the stream cue, share of the rows]. */
export const WIN = { w: 1400, h: 720, y: -40, head: 92, tilt: { x: 0, y: 0 }, turn: 22, zoom: 1.12 } as const;
export const STREAM: [number, number][] = [[0, 0.01], [2, 0.05], [22, 0.1], [42, 0.35], [66, 0.6], [102, 1]];

/** The window shot's camera: the turn (it opens turned and lands front-on), its creep, the whip out. After a dive the shot opens still zooming in. */
export const windowMoves = (): { base: Shot; moves: CamMove[] } => {
  const sw = swing3d({ at: CUE.window, axis: DEAL.window === 'pitch' ? 'pitch' : 'yaw', from: DEAL.window === 'pitch' ? 4 + WIN.turn : -(4 + WIN.turn), to: 0, zoom: WIN.zoom, ...(DEAL.window === 'pitch' ? { look: { y: -30 * U } } : { pan: { x: -40 * U } }) });
  const dive = DEAL.launch === 'dive' ? 0.6 : 1;
  const base: Shot = { ...BASE, k: dive, ...sw.start };
  const moves: CamMove[] = [
    ...sw.moves,
    { at: CUE.settle3d, frames: CUE.whipOut - CUE.settle3d, zoom: 1.03, pan: { x: -24 * U }, ease: E.linear }, // the hold keeps moving into the whip
    { at: CUE.whipOut, frames: ACT.cards.from - CUE.whipOut, pan: { y: -1100 * U }, ease: E.launchIn },
  ];
  if (dive !== 1) moves.unshift({ at: CUE.window, frames: f60(48), zoom: 1 / dive, ease: E.glideOut });
  return { base, moves };
};

const Head: React.FC<{ F: number; w: number }> = ({ F, w }) => {
  const ui = 38 * U;
  const pulse = 0.55 + 0.45 * Math.cos((F - ACT.window.from) / f60x(9));
  const chip = prog(F, CUE.window + f60x(20), CUE.window + f60x(36), E.snapOut);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: WIN.head * U, display: 'flex', alignItems: 'center', gap: ui * 0.6, padding: `0 ${ui}px`, boxSizing: 'border-box', boxShadow: `inset 0 -${(1.5 * U).toFixed(2)}px 0 ${INK.line}` }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: ui * 0.42, height: ui * 0.42, borderRadius: ui, background: INK.line }} />)}
      <span data-text="window-title" style={{ ...face(ui, 600, INK.text), marginLeft: ui * 0.4 }}>{TEASER.window.title}</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: ui * 0.4, padding: `${ui * 0.25}px ${ui * 0.55}px`, borderRadius: ui, background: INK.well, opacity: chip, transform: `translate3d(${((1 - chip) * 24 * U).toFixed(2)}px, 0, 0)` }}>
        <div style={{ width: ui * 0.35, height: ui * 0.35, borderRadius: ui, background: INK.accent, opacity: pulse }} />
        <span data-text="status" style={face(ui * 0.95, 500, INK.mute)}>{TEASER.window.status}</span>
      </div>
    </div>
  );
};

/** The code, streamed: the gutter as long as the code, the rows as wide as the longest line, in the film's mono. */
const Code: React.FC<{ F: number; maxW: number; scale?: number }> = ({ F, maxW, scale = 1 }) => {
  const film = useFilm();
  const n = TEASER.code.length;
  const rows = track(((F - CUE.stream) * 60) / film.fps, STREAM.map(([f, s]) => [f, s * n] as [number, number]));
  const size = 30 * U * scale;
  const longest = Math.max(...TEASER.code.map((l) => measureTracked(l.map((t) => t.s).join(''), size, 450, 0, FONT.mono)));
  // the split column is narrow: the code takes the whole column (the panel keeps its type at a readable floor, so a
  // width measured at the smaller size would crop it)
  const w = scale < 1 ? maxW : Math.min(maxW, longest + size * 3.5);
  // the lens: a soft strip on the line being written, then on the lens cue it glides back to the first line (what it built)
  const lh = size * 1.5;
  const follow = Math.min(n - 1, Math.max(0, rows - 0.6));
  const row = F < CUE.lens ? follow : glideValue(F, [{ at: CUE.lens, value: 0 }], n - 1, { frames: 30 }, film);
  const on = prog(F, CUE.stream, CUE.stream + f60x(12), E.snapOut);
  return (
    <div style={{ position: 'relative', width: w }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w + size * 0.8, height: lh, borderRadius: size * 0.3, background: INK.accentSoft, opacity: 0.55 * on, transform: `translate3d(${(-size * 0.4).toFixed(2)}px, ${(row * lh).toFixed(2)}px, 0)` }} />
      <CodePanel theme={INK} w={w} lines={TEASER.code} rows={F < CUE.stream ? 0 : rows} size={size} gutter={n} family={FONT.mono} id="code" />
    </div>
  );
};

export const Window: React.FC = () => {
  const F = useAbs('window');
  const cam = windowMoves();
  const w = WIN.w * U;
  const h = WIN.h * U;
  const head = WIN.head * U;
  const ui = 38 * U;
  const split = DEAL.window === 'split';
  // split: the code takes the left 48 % (its long lines run under the screen pane, as in an editor), the screen the right 52 %
  const codeW = split ? w * 0.48 - 1.5 * ui : w - 2 * ui;
  // after the dive the shot opens inside the button: the accent with a hole that opens from the centre (an iris)
  const iris = DEAL.launch === 'dive' ? prog(F, ACT.window.from, ACT.window.from + f60x(24), E.snapOut) : 1;
  const r = (40 + (Math.hypot(W, H) / 2 / U + 20 - 40) * iris) * U;
  const hole = `radial-gradient(circle at 50% 50%, transparent ${r.toFixed(1)}px, black ${(r + 1.5).toFixed(1)}px)`;
  return (
    <AbsoluteFill style={{ background: INK.ground, overflow: 'hidden' }}>
      <ReadBack F={F} at={copy('build').in} out={copy('build').out} blur={4} dim={0.35}>
      <World F={F} act="window" base={cam.base} moves={cam.moves} depth>
        <Lit frame={F} x={W / 2} y={H / 2 + WIN.y * U} w={w} h={h} r={28 * U} tilt={WIN.tilt} ground={GROUNDS.window.base} id="window">
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...glass(28 * U) }}>
            <Head F={F} w={w} />
            <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${ui}px, ${(head + ui * 0.8).toFixed(2)}px, 0)` }}>
              <Code F={F} maxW={codeW} scale={split ? 0.7 : 1} />
            </div>
            {split && (
              <div style={{ position: 'absolute', left: 0, top: 0, width: w * 0.52, height: h - head, overflow: 'hidden', transform: `translate3d(${(w * 0.48).toFixed(2)}px, ${head.toFixed(2)}px, 0)`, boxShadow: `inset ${(1.5 * U).toFixed(2)}px 0 0 ${INK.line}` }}>
                <DenseScreen frame={F} theme={INK} world={WORLD} layout="board" w={w * 0.52} h={h - head} scale={0.7} view={0.9} focus={[{ at: CUE.stream, row: 0 }, { at: CUE.stream + f60(60), row: 1 }, { at: CUE.lens, row: 2 }]} drawAt={CUE.stream} lift={0} />
              </div>
            )}
          </div>
        </Lit>
      </World>
      </ReadBack>
      {/* the line centred in the middle of the frame while the window steps back behind it (fx/ReadBack) */}
      <Caption id="build" F={F} y={H / 2} />
      {iris < 1 && <AbsoluteFill style={{ background: INK.accent, maskImage: hole, WebkitMaskImage: hole }} />}
    </AbsoluteFill>
  );
};
