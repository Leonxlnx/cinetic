import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, U } from '../brand/tokens';
import { face, GlyphTile } from '../kit';
import { clamp, E, mix, prog } from '../lib/anim';
import { creep } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, LABELS, W } from '../timeline';
import { EXPLAIN } from '../explain';
import { capOf, MarkWord, PAGE, useAbs } from './stage';
import { HUB, hubPush, systemSize } from './System';

// GRID - the mark that was a word is now the hub of the product. Its parts are born round it by distance (all of
// them inside 6 f at 60 fps: a radial wave, not a stagger), first as soft tiles, their glyphs coming in a beat later;
// outer cells stay faint and fade with distance, so the grid has an edge without a frame. Three parts get a label, one
// a second, each growing from its bottom edge. A slow push; then the parts gather back into the mark, outer first.

/** The grid: cell pitch and tile size (px at 1080p), the birth wave's reach and how far the faint cells fade. */
export const GRID = { pitch: 152, tile: 92, wave: 6, reach: 780, fade: 1100, rows: 4, cols: 7 } as const;

export type Cell = { x: number; y: number; d: number; module: number };
/** Every cell round the hub (W/2, H/2), nearest first; the nearest ones carry the modules. Odd rows sit half a pitch over. */
export const cells = (): Cell[] => {
  const p = GRID.pitch * U;
  const list: Cell[] = [];
  for (let j = -GRID.rows; j <= GRID.rows; j++)
    for (let i = -GRID.cols; i <= GRID.cols; i++) {
      if (i === 0 && j === 0) continue;
      const x = W / 2 + (i + (Math.abs(j) % 2 ? 0.5 : 0)) * p;
      const y = H / 2 + j * p * 0.88;
      if (x < -p || x > W + p || y < -p || y > H + p) continue;
      list.push({ x, y, d: Math.hypot(x - W / 2, y - H / 2), module: -1 });
    }
  list.sort((a, b) => a.d - b.d || a.x - b.x);
  EXPLAIN.modules.forEach((_, m) => (list[m].module = m));
  return list;
};

/** The frame a cell is born: the wave crosses `reach` px in GRID.wave frames (60 fps). */
export const bornAt = (d: number) => CUE.tiles + f60x((GRID.wave * d) / (GRID.reach * U));

export const Grid: React.FC = () => {
  const F = useAbs('grid');
  const markH = capOf(systemSize()) * HUB.mark;
  const k = hubPush(ACT.grid.from) * creep(F, ACT.grid.from, { pctPerSec: 0.012 }, FPS);
  const tile = GRID.tile * U;
  const all = cells();
  const dmax = all[all.length - 1].d;
  const ui = TYPE.ui.size * U;
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${k.toFixed(5)})` }}>
        {all.map((c, i) => {
          const born = bornAt(c.d);
          if (F < born) return null;
          const pop = prog(F, born, born + f60x(10), E.snapOut);
          // the gather: outer cells first, each pulled into the hub on an ease-in
          const g0 = CUE.gather + f60x(14 * (1 - c.d / dmax));
          const g = prog(F, g0, g0 + f60x(22), E.buildIn);
          const x = mix(c.x, W / 2, g);
          const y = mix(c.y, H / 2, g);
          const s = mix(0.82, 1, pop) * mix(1, 0.2, g);
          const faint = c.module < 0;
          const o = (faint ? 0.8 * clamp(1 - c.d / (GRID.fade * U)) : 1) * Math.min(1, pop * 3) * (1 - g);
          if (o <= 0.002) return null;
          const glyphAt = CUE.glyphs + f60x((GRID.wave * c.d) / (GRID.reach * U));
          const glyph = faint ? 0 : prog(F, glyphAt, glyphAt + f60x(20), E.softOut);
          const mod = faint ? null : EXPLAIN.modules[c.module];
          return (
            <div key={i} data-ui style={{ position: 'absolute', left: 0, top: 0, width: tile, height: tile, opacity: o, transform: `translate3d(${(x - tile / 2).toFixed(2)}px, ${(y - tile / 2).toFixed(2)}px, 0) scale(${s.toFixed(5)})` }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: tile * 0.28, background: faint ? PAGE.well : PAGE.accentSoft }} />
              {mod && <div style={{ position: 'absolute', inset: 0, opacity: glyph }}><GlyphTile theme={PAGE} name={mod.glyph} size={tile} solid /></div>}
            </div>
          );
        })}
        <MarkWord x={W / 2} y={H / 2} size={markH} />
        {LABELS.map((at, m) => {
          const c = all.find((x) => x.module === m);
          if (!c || F < at) return null;
          const t = prog(F, at, at + f60x(20), E.snapOut);
          const leave = prog(F, CUE.gather - f60x(4), CUE.gather + f60x(8), E.buildIn);
          const label = EXPLAIN.modules[m].label;
          // the label stands on the far side of its tile from the hub: above a tile above the hub's row, beside one on it
          const side = Math.abs(c.y - H / 2) < 1 ? Math.sign(c.x - W / 2) : 0;
          const lx = side ? c.x + side * (tile / 2 + 14 * U) : c.x;
          const ly = side ? c.y : c.y + Math.sign(c.y - H / 2 || -1) * (tile / 2 + 14 * U);
          const edge = (on: boolean) => (on ? `${((1 - t) * 100).toFixed(2)}%` : '0'); // the label grows out of the edge facing its tile
          const tr = side ? `translate(${side > 0 ? '0' : '-100%'}, -50%)` : c.y > H / 2 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
          return (
            <div key={m} data-ui style={{ position: 'absolute', left: lx, top: ly, transform: tr, opacity: 1 - leave }}>
              <div style={{ transformOrigin: side ? (side > 0 ? '0% 50%' : '100% 50%') : c.y > H / 2 ? '50% 0%' : '50% 100%', transform: `scale(${mix(0.6, 1, t).toFixed(4)})`, clipPath: `inset(${edge(c.y < H / 2 && !side)} ${edge(side < 0)} ${edge(c.y > H / 2 && !side)} ${edge(side > 0)} round ${ui}px)`, padding: `${(ui * 0.32).toFixed(1)}px ${(ui * 0.6).toFixed(1)}px`, borderRadius: ui, background: PAGE.surface, boxShadow: `inset 0 0 0 ${(2 * U).toFixed(1)}px ${PAGE.line}`, whiteSpace: 'pre' }}>
                <span data-text={`label${m + 1}`} style={face(ui, TYPE.ui.weight, PAGE.text, TYPE.ui.track)}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
