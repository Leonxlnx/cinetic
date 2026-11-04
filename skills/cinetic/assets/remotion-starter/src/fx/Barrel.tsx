import React from 'react';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Barrel: one word or short line repeated in rows that wrap round a drum. Each row is clipped to its own band, the
 * bands squash toward the drum's top and bottom (the cosine of the row's angle), the outer rows sit back in ink, and
 * beside each row a fragment of the word shows on either side, its start on the left and its end on the right, wider
 * on the middle row and narrower toward the edges, so the drum reads round both ways. The drum closes into the one
 * line (the bands collapse onto the middle row while the fragments slide back under it), or opens out of it.
 * Labels that orbit the drum (numbers, names) go beside it in the act and drop out as it closes.
 *
 *   barrelRows(n, open, lineH, o)   each row's centre (px from the drum's middle), band height, vertical scale, ink,
 *                                   the share of the word its side fragments show, and whether it is the middle row;
 *                                   open 1 = the full drum, 0 = closed into the one line
 *   barrelOpen(f, o)                the drum's openness at frame f: closing (house) or opening over `dur60` on `ease`
 *   <Barrel>                        draws `children` (the line, laid out at lineW x lineH) per row and per fragment
 *
 * House numbers (60 fps frames): 5 rows over a 76-degree arc on a drum 2.7 line heights in radius (the middle band is
 * about 0.9 of the line box), the outer rows at 0.35 of full ink; the side fragments show 43 % of the word on the
 * middle row, falling with the fourth power of the row's scale (17 % on the outer rows), 6 % of the word's width from
 * it; the drum closes in 26 f on E.glideOut. Bands tile: each runs from R sin(theta - half) to R sin(theta + half), so
 * no band shows a sliver of the next row, and while the drum closes the middle band grows back to the full line and
 * the other rows show only what lies outside it (they slide under the line, never stack over it).
 */
export const BARREL = { rows: 5, arc: 76, radius: 2.7, outer: 0.35, side: 0.43, sidePow: 4, gap: 0.06, dur60: 26 } as const;

/** y: the row's centre; top..bottom: the band it shows (px from the drum's middle), band = bottom - top. */
export type BarrelRow = { i: number; y: number; top: number; bottom: number; band: number; scale: number; ink: number; side: number; middle: boolean };

/** The rows of a drum of `n` rows for a line `lineH` px tall, `open` 0..1. Pure. */
export const barrelRows = (n: number, open: number, lineH: number, o: { arc?: number; radius?: number; outer?: number; side?: number } = {}): BarrelRow[] => {
  const k = clamp(open);
  const arc = ((o.arc ?? BARREL.arc) * Math.PI) / 180;
  const R = (o.radius ?? BARREL.radius) * lineH;
  const mid = (n - 1) / 2;
  const half = mid ? ((arc / 2) * k) / mid / 2 : 0; // half the angle between two rows
  const rows: BarrelRow[] = [];
  const midBand = Math.max(Math.min(lineH, 2 * R * Math.sin(half)), 1.35 * lineH * (1 - k)); // the middle row grows back to the whole line (descenders included) as the drum closes
  for (let i = 0; i < n; i++) {
    const s = mid ? (i - mid) / mid : 0; // -1 .. 1
    const th = s * (arc / 2) * k;
    const scale = Math.cos(th);
    const middle = i === Math.round(mid);
    const y = R * Math.sin(th) * Math.cos(half); // bands from R sin(th - half) to R sin(th + half): they tile, never overlap
    const slot = Math.min(lineH * scale, 2 * R * scale * Math.sin(half));
    // every other row shows only what lies outside the middle row's band: closing rows slide under it, never stack over it
    let top = middle ? -midBand / 2 : y - slot / 2;
    let bottom = middle ? midBand / 2 : y + slot / 2;
    if (!middle && s < 0) bottom = Math.min(bottom, -midBand / 2);
    if (!middle && s > 0) top = Math.max(top, midBand / 2);
    const band = Math.max(0, bottom - top);
    const ink = middle ? 1 : mix(1, mix(o.outer ?? BARREL.outer, 1, 1 - Math.abs(s)), k);
    rows.push({ i, y, top, bottom: top + band, band, scale, ink: (k <= 0 || band <= 0) && !middle ? 0 : ink, side: (o.side ?? BARREL.side) * scale ** BARREL.sidePow * k, middle });
  }
  return rows;
};

/** The drum's openness at frame f: 1 until `at`, closing to 0 over dur60 (or opening 0 -> 1 with `opening`). Pure. */
export const barrelOpen = (f: number, o: { at: number; dur60?: number; ease?: Ease; opening?: boolean }, film?: Partial<FilmCtx>) => {
  const dur = Math.max(1, f60x(o.dur60 ?? BARREL.dur60, fpsOf(film)));
  const p = (o.ease ?? E.glideOut)(clamp((f - o.at) / dur));
  return o.opening ? p : 1 - p;
};

export type BarrelProps = {
  frame: number;
  x: number; // the drum's centre, film px
  y: number;
  lineW: number; // the line's laid-out width and height, film px (measure it once: the font is loaded by FontGate)
  lineH: number;
  open: number; // barrelOpen(frame, ...) or your own 0..1
  rows?: number;
  sides?: boolean; // the side fragments (default on)
  children: React.ReactNode; // the line, laid out at lineW x lineH
  style?: React.CSSProperties;
};

/** A drum of rows of one line: the middle row's own copy carries the line's data-text; every other copy is texture (data-audit-copy). */
export const Barrel: React.FC<BarrelProps> = (p) => {
  useFilm();
  const rows = barrelRows(p.rows ?? BARREL.rows, p.open, p.lineH);
  const gap = BARREL.gap * p.lineW;
  const edge = p.lineW / 2 + gap; // the fragments live outside the word's own box
  const reach = edge + BARREL.side * p.lineW;
  const line = (left: number, top: number, scale: number) => (
    <div style={{ position: 'absolute', left, top, width: p.lineW, height: p.lineH, transformOrigin: '50% 50%', transform: `scaleY(${scale.toFixed(5)})` }}>{p.children}</div>
  );
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: 0, height: 0, ...p.style }}>
      {rows.map((r) => {
        if (r.ink <= 0.001 || r.band <= 0.01) return null;
        const top = r.y - r.top - p.lineH / 2; // the line stays on its row's centre while its band is cut
        const frag = r.side * p.lineW;
        return (
          <div key={r.i} data-audit-copy={r.middle ? undefined : ''} style={{ position: 'absolute', left: -reach, top: r.top, width: 2 * reach, height: r.band, overflow: 'hidden', opacity: r.ink }}>
            {line(reach - p.lineW / 2, top, r.scale)}
            {p.sides !== false && frag > 0.5 && (
              <>
                {/* the start of the word on the left: its rest hides past the fragment's window */}
                <div data-audit-copy="" style={{ position: 'absolute', left: reach - edge - frag, top: 0, width: frag, height: r.band, overflow: 'hidden' }}>
                  {line(0, top, r.scale)}
                </div>
                {/* the end of the word on the right */}
                <div data-audit-copy="" style={{ position: 'absolute', left: reach + edge, top: 0, width: frag, height: r.band, overflow: 'hidden' }}>
                  {line(frag - p.lineW, top, r.scale)}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** A drum declares nothing: it closes continuously. */
export const declares = (_p?: Partial<BarrelProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
