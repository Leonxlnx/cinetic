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
  const w = 1920 / cols;
  const h = 1080 / cols;
  return (
    <AbsoluteFill style={{ background: '#111' }}>
      {list.map((fr, i) => (
        <div key={i} style={{ position: 'absolute', left: (i % cols) * w, top: Math.floor(i / cols) * h, width: w, height: h, overflow: 'hidden', outline: '1px solid #000' }}>
          <div style={{ width: 1920, height: 1080, transform: `scale(${1 / cols})`, transformOrigin: '0 0', position: 'relative' }}>
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
