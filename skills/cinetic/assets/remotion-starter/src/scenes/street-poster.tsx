// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// street-poster: the product's output out in the world. Real street photographs cut one after another, each a steady
// pull-back; on every one a billboard or poster carries the product's output, mapped onto the board in its perspective
// and graded into the shot (a little less contrast than a screen; at night the photograph sinks and the board is the
// brightest thing in the frame, its light spilling round it).
// Numbers (frames at 30 fps, px at 1080): each plate holds 18 f (the last 24) and pulls back x1.39 onto a view where its
// boards span half the frame (at most x2.2 of the photograph's cover fit), linear (0.982 a frame) on the cuts between
// and from x1.6 eased on the last; a night plate drops to 30 % brightness (contrast 1.12) and 65 % colour while the
// board keeps its own, glows 34 px (x1.08, 75 %) and lights its surroundings; the output is drawn at the board's own
// aspect and mapped through one homography per board (matrix3d), its contrast at 94 %.
// The photographs are the film's own (scripts/assets.mjs: open collections, no credit needed); each comes with the four
// corners of its boards in the photograph's pixels, read off a gridded copy.
import React from 'react';
import { Img } from 'remotion';
import { E } from '../lib/anim';
import { withAlpha } from '../lib/handover';
import { type Palette, paletteOf, type SceneMeta, span, useClock } from './parts';
import { type Quad, quadMatrix } from './phone-pullback';
import { srcOf, Stage1080 } from './stage1080';

/** A real photograph and its boards: their corners (top-left, top-right, bottom-right, bottom-left) in its own pixels. */
export type StreetPlate = { src: string; w: number; h: number; boards: readonly Quad[]; night?: boolean };

export type StreetPosterProps = {
  /** 1-4 street or wall photographs, each with the corners of the boards the output goes on */
  plates: readonly StreetPlate[];
  /** the product's output: an image (cover-fitted to each board) or a drawing made at a board's size (w x h px, its index) */
  output: string | ((w: number, h: number, i: number) => React.ReactNode);
  /** ink: the night's dark under the boards; paper: the board's light */
  palette?: Partial<Palette>;
  frame?: number;
};

export const STREET_POSTER = { hold: 18, last: 24, from: 1.39, fromLast: 1.6, board: 0.5, maxZoom: 2.2, night: { bright: 0.3, contrast: 1.12, sat: 0.65 }, glow: { blur: 34, scale: 1.08, alpha: 0.75, spill: 0.16 }, contrast: 0.94 } as const;

/** The scene's length for n plates (frames at 30 fps): 18 f each, the last 24, never under 45 f. */
export const streetPosterDur = (n = 3) => Math.max(45, STREET_POSTER.hold * (Math.max(1, n) - 1) + STREET_POSTER.last);

type Pt = readonly [number, number];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Which plate is on at frame t, its own frame and its length. */
export const plateAt = (t: number, n: number) => {
  const last = Math.max(1, n) - 1;
  const total = streetPosterDur(n);
  const i = Math.min(last, Math.max(0, Math.floor(t / STREET_POSTER.hold)));
  const start = i * STREET_POSTER.hold;
  const len = i === last ? total - start : STREET_POSTER.hold;
  return { i, local: t - start, len };
};

/** The plate's view at its own frame: the boards (together) end about half the frame wide, as central as the picture
 *  allows while it still covers the stage, after a pull-back from x1.39 of that. */
export const plateView = (pl: StreetPlate, local: number, len: number, last: boolean) => {
  const cover = Math.max(1920 / pl.w, 1080 / pl.h);
  const xs = pl.boards.flatMap((b) => b.map((q) => q[0]));
  const ys = pl.boards.flatMap((b) => b.map((q) => q[1]));
  const bc: Pt = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  // never more than x2.2 of the cover fit: a small board in a small photograph would go soft
  const zEnd = Math.min(STREET_POSTER.maxZoom, Math.max(1, (STREET_POSTER.board * 1920) / ((Math.max(...xs) - Math.min(...xs)) * cover)));
  const p = span(local, 0, len);
  const from = last ? STREET_POSTER.fromLast : STREET_POSTER.from;
  const z = zEnd * (from + (1 - from) * (last ? E.stdInOut(p) : p));
  const s = cover * z;
  const ox = Math.min(0, Math.max(1920 - pl.w * s, 960 - bc[0] * s));
  const oy = Math.min(0, Math.max(1080 - pl.h * s, 540 - bc[1] * s));
  const map = (q: Pt): Pt => [ox + q[0] * s, oy + q[1] * s];
  return { s, ox, oy, z, map, centre: map(bc) };
};

export const StreetPoster: React.FC<StreetPosterProps> = ({ plates, output, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const n = Math.max(1, plates.length);
  const { i, local, len } = plateAt(t, n);
  const pl = plates[i];
  const v = plateView(pl, local, len, i === n - 1);
  const night = !!pl.night;
  return (
    <Stage1080 W={W} H={H} ground={P.ink}>
      {/* the photograph, pulling back about its board */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: pl.w, height: pl.h, transformOrigin: '0 0', transform: `translate(${v.ox.toFixed(2)}px, ${v.oy.toFixed(2)}px) scale(${v.s.toFixed(6)})` }}>
        <Img src={srcOf(pl.src)} style={{ width: pl.w, height: pl.h, display: 'block', filter: night ? `brightness(${STREET_POSTER.night.bright}) contrast(${STREET_POSTER.night.contrast}) saturate(${STREET_POSTER.night.sat})` : undefined }} />
      </div>
      {/* at night the boards' light spills onto what is round them */}
      {night ? <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(v.centre[0] - 700).toFixed(2)}px, ${(v.centre[1] - 450).toFixed(2)}px)`, width: 1400, height: 900, background: `radial-gradient(closest-side, ${withAlpha(P.paper, STREET_POSTER.glow.spill)}, ${withAlpha(P.paper, 0)})` }} /> : null}
      {/* the boards: the output mapped onto each in its perspective */}
      {pl.boards.map((b, j) => {
        const q = b.map((pt) => v.map(pt)) as unknown as Quad;
        const bw = (dist(b[0], b[1]) + dist(b[3], b[2])) / 2;
        const bh = (dist(b[0], b[3]) + dist(b[1], b[2])) / 2;
        const w = 1200;
        const h = Math.round((1200 * bh) / Math.max(1, bw));
        const k = i * 3 + j; // which drawing: each board its own
        const art = typeof output === 'string' ? <Img src={srcOf(output)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : output(w, h, k);
        const board = (glow: boolean) => (
          <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden', transformOrigin: '0 0', transform: quadMatrix(w, h, q), filter: glow ? `blur(${STREET_POSTER.glow.blur}px)` : `contrast(${STREET_POSTER.contrast})`, opacity: glow ? STREET_POSTER.glow.alpha : 1 }}>
            <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: glow ? `scale(${STREET_POSTER.glow.scale})` : undefined }}>{art}</div>
            {!glow && !night ? <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${withAlpha(P.paper, 0.06)}, ${withAlpha(P.ink, 0.08)})` }} /> : null}
          </div>
        );
        return (
          <React.Fragment key={`${i}-${j}`}>
            {night ? board(true) : null}
            {board(false)}
          </React.Fragment>
        );
      })}
    </Stage1080>
  );
};

export const streetPosterMeta: SceneMeta = {
  id: 'street-poster',
  does: 'real street photographs cut one after another, each pulling back, every billboard carrying the product\'s output in its perspective',
  dur: streetPosterDur(3),
  props: ['plates', 'output', 'palette?'],
  handIn: null,
  handOut: { form: 'photo', x: 0, y: 0, w: 1920, h: 1080 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'pop', id: 'plate-1', weight: 0.7 },
    { f: STREET_POSTER.hold, kind: 'pop', id: 'plate-2', weight: 0.8 },
    { f: STREET_POSTER.hold * 2, kind: 'pop', id: 'plate-3', weight: 0.7 },
    { f: STREET_POSTER.hold * 2 + 6, kind: 'whoosh', id: 'last-pull', weight: 0.4 },
  ],
};
