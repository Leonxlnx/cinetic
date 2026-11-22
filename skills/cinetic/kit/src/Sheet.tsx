// A contact sheet in ONE still render: the film frozen at 36 frames in a 6x6 grid (cols: 4 gives 16 bigger cells).
// The fastest way to see a whole film: `node scripts/frames.mjs sheet [--film main] [--grid 6]`.
import React from 'react';
import { AbsoluteFill, Freeze } from 'remotion';
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
