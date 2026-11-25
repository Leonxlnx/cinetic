// A contact sheet in ONE still render: the film frozen at 36 frames in a 6x6 grid (cols: 4 gives 16 bigger cells).
// The fastest way to see a whole film: `node scripts/frames.mjs sheet [--film main] [--grid 6]`.
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { FILMS } from './films';

export const Sheet: React.FC<{ film?: string; from?: number; to?: number; frames?: number[]; cols?: number }> = ({ film, from = 0, to, frames, cols = 6 }) => {
  const F = FILMS[film ?? Object.keys(FILMS)[0]];
  if (!F) throw new Error(`No film "${film}" in src/films.ts (films: ${Object.keys(FILMS).join(', ')})`);
  const end = to ?? F.duration - 1;
  const n = cols * cols;
  const list = frames ?? Array.from({ length: n }, (_, i) => Math.round(from + ((end - from) * i) / (n - 1)));
  // lay the frames out at the film's own aspect (vertical and square films too): pick the grid that shows them biggest
  const FW = F.width ?? 1920;
  const FH = F.height ?? 1080;
  let best = { c: cols, r: Math.ceil(list.length / cols), s: 0 };
  for (let c = 1; c <= list.length; c++) {
    const r = Math.ceil(list.length / c);
    const sc = Math.min(1920 / (c * FW), 1080 / (r * FH));
    if (sc > best.s) best = { c, r, s: sc };
  }
  const gc = best.c;
  const w = FW * best.s;
  const h = FH * best.s;
  return (
    <AbsoluteFill style={{ background: '#111' }}>
      {list.map((fr, i) => (
        <div key={i} style={{ position: 'absolute', left: (i % gc) * w, top: Math.floor(i / gc) * h, width: w, height: h, overflow: 'hidden', outline: '1px solid #000' }}>
          <div style={{ width: FW, height: FH, transform: `scale(${best.s})`, transformOrigin: '0 0', position: 'relative' }}>
            <Freeze frame={fr}>
              <F.component />
            </Freeze>
          </div>
          <div style={{ position: 'absolute', left: 6, top: 4, font: `600 ${cols > 4 ? 12 : 15}px monospace`, color: '#ff0', background: 'rgba(0,0,0,.6)', padding: '1px 5px' }}>
            {fr} · {(fr / 30).toFixed(2)}s
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/**
 * Every join at real size, one join a frame: frame i of this composition shows join i of `joins` as the frames J - pad ..
 * J + pad of the film, each `cell` px wide, three to a row, the frame number on each cell and the join frame outlined.
 * `node scripts/frames.mjs joins` renders it as one image a join (one browser, one render call).
 */
export type JoinsProps = { film?: string; joins?: number[]; pad?: number; cell?: number };
const joinsGrid = (props: JoinsProps) => {
  const F = FILMS[props.film ?? Object.keys(FILMS)[0]];
  if (!F) throw new Error(`No film "${props.film}" in src/films.ts (films: ${Object.keys(FILMS).join(', ')})`);
  const FW = F.width ?? 1920;
  const FH = F.height ?? 1080;
  const cell = props.cell ?? 960;
  const n = 2 * (props.pad ?? 4) + 1;
  const cols = Math.min(3, n);
  const rows = Math.ceil(n / cols);
  const ch = Math.round((cell * FH) / FW);
  return { F, FW, FH, cell, ch, n, cols, rows };
};
export const joinsMetadata = ({ props }: { props: JoinsProps }) => {
  const g = joinsGrid(props);
  const even = (v: number) => Math.ceil(v / 2) * 2;
  // as long as the film (a Sequence inside it is cut by the composition's length); frames.mjs renders frames 0 .. n-1
  return { durationInFrames: Math.max((props.joins ?? [0]).length, g.F.duration), fps: g.F.fps, width: even(g.cols * g.cell), height: even(g.rows * g.ch) };
};
export const Joins: React.FC<JoinsProps> = (props) => {
  const i = useCurrentFrame();
  const { F, FW, cell, ch, n, cols } = joinsGrid(props);
  const list = props.joins ?? [0];
  const j = list[Math.min(i, list.length - 1)];
  const pad = (n - 1) / 2;
  const s = cell / FW;
  const label = Math.round(cell / 40);
  return (
    <AbsoluteFill style={{ background: '#111' }}>
      {Array.from({ length: n }, (_, k) => j - pad + k).map((fr, k) => {
        const f = Math.max(0, Math.min(F.duration - 1, fr));
        return (
          <div key={k} style={{ position: 'absolute', left: (k % cols) * cell, top: Math.floor(k / cols) * ch, width: cell, height: ch, overflow: 'hidden' }}>
            <div style={{ width: FW, height: F.height ?? 1080, transform: `scale(${s})`, transformOrigin: '0 0', position: 'relative' }}>
              <Freeze frame={f}>
                <F.component />
              </Freeze>
            </div>
            <div style={{ position: 'absolute', inset: 0, boxShadow: fr === j ? `inset 0 0 0 ${Math.max(3, label / 5)}px #ff0` : 'inset 0 0 0 1px #000' }} />
            <div style={{ position: 'absolute', left: 8, top: 6, font: `600 ${label}px monospace`, color: '#ff0', background: 'rgba(0,0,0,.66)', padding: '2px 8px' }}>
              {f} · {(f / F.fps).toFixed(2)}s{fr === j ? ' · join' : f !== fr ? ' (film edge)' : ''}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
