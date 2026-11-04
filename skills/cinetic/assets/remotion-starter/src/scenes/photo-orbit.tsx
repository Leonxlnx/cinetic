// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// photo-orbit: a short line in caps builds word by word at the centre of a near-black ground while square photo tiles
// dive in from the lens and orbit it in depth, a carousel seen a little from above: tiles in front pass larger and
// lower and cover the letters, tiles behind pass smaller and higher. Light is an event at the ends only: the first
// frames glow white and clear in a sixth of a second; at the end the line sinks and the tiles flare white-hot into a
// cut to white. 2.3 s. Big.
//
// Numbers (frames at 30 fps, px at 1080): caps cap height 40 px, centred, the words cut on 5 f apart and the line
// re-centres on each; after the last word it shrinks x0.975 over 20 f. Tiles 205 px x their depth factor, hard-edged
// squares, no radius, no shadow, on a ring of radius 540 round the line (its centre 60 px above it), the eye 16 deg
// above it, perspective 1150; the ring turns 250 deg in all, 40 % of it in the first 10 f, then slow, a little faster again from f54; the tiles come
// in from the lens side (the ring near and above, landing in 5 f). Glow 1, .7, .45, .25, .1, 0 on f0-5; back .1 -> 1 over f61-68 while the
// line sinks 65 px on an ease-in. The halo reaches 50 % at about 15 px, 10 % at about 70 px past an edge.
import React from 'react';
import { FONT } from '../brand/tokens';
import { E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, tab, useClock } from './parts';
import { Picture, rgba, Stage1080 } from './stage1080';

export type PhotoOrbitProps = {
  /** the line at the centre: 2-4 short words read best (set in caps unless caps is false) */
  line: string;
  /** the tiles' pictures (public paths or URLs): the product's own images, outputs or people; 4 read best, they cycle */
  images: string[];
  /** ground: the near-black field (default the ink taken toward black); paper: the line and the flare */
  palette?: Partial<Palette>;
  caps?: boolean;
  /** how many tiles orbit (3-6, default 4) */
  tiles?: number;
  frame?: number;
};

export const PHOTO_ORBIT = {
  dur: 69,
  words: { every: 5, span: 20 }, // the words cut on 5 f apart (squeezed to fit 20 f when there are many)
  cap: 40,
  shrink: { to: 0.975, len: 20 },
  ring: { r: 540, tilt: 16, persp: 1150, tile: 205, lift: 60 }, // the ring's centre sits 60 px above the line on screen
  enter: 5, // the ring's dive from the lens side (near and above) onto its seat
  // the ring's turn (deg) by frame: front-loaded, slow, a little faster again from f54
  turn: [[2, 0], [4, 40], [6, 70], [10, 100], [20, 128], [35, 160], [54, 200], [68, 250]] as const,
  glowIn: [[0, 1], [1, 0.7], [2, 0.45], [3, 0.25], [4, 0.1], [5, 0]] as const,
  glowOut: [[60, 0], [61, 0.1], [62, 0.2], [63, 0.35], [64, 0.5], [65, 0.65], [66, 0.8], [67, 0.9], [68, 1]] as const,
  sink: [[54, 0], [55.5, 3], [57, 6], [58.5, 10], [60, 15], [61.5, 21], [63, 29], [64.5, 40], [66, 53], [67.5, 65]] as const,
  sizes: [1.0, 0.94, 0.86, 0.96, 1.0, 0.9] as const, // each tile's own size (a carousel of mixed prints)
} as const;

/** The glow level (0..1) on frame t: the in-flash and the out-flare. */
export const orbitGlow = (t: number) => Math.max(tab(t, PHOTO_ORBIT.glowIn), tab(t, PHOTO_ORBIT.glowOut));

/** Each tile's place on frame t: its centre and size on the 1080p stage and its depth (+: in front of the line). */
export const orbitPlaces = (t: number, n = 4) => {
  const R = PHOTO_ORBIT.ring;
  const phi = (R.tilt * Math.PI) / 180;
  const turn = tab(t, PHOTO_ORBIT.turn);
  // the dive: the whole ring starts near the lens and above, and lands on its seat round the line (ease-out)
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, t / PHOTO_ORBIT.enter)), 3);
  const cy = 330 * (1 - e);
  const cz = 430 * (1 - e);
  return Array.from({ length: n }, (_, i) => {
    const a = ((turn - 30 + (i * 360) / n) * Math.PI) / 180;
    const x = R.r * Math.sin(a);
    const y = cy;
    const z = R.r * Math.cos(a) + cz;
    const yc = y * Math.cos(phi) - z * Math.sin(phi);
    const zc = y * Math.sin(phi) + z * Math.cos(phi);
    const k = R.persp / Math.max(60, R.persp - zc);
    return { i, x: 960 + x * k, y: 540 - R.lift - yc * k, s: R.tile * PHOTO_ORBIT.sizes[i % PHOTO_ORBIT.sizes.length] * k, z: zc };
  });
};

/** When word i of n cuts on. */
export const orbitWordAt = (i: number, n: number) => i * Math.min(PHOTO_ORBIT.words.every, PHOTO_ORBIT.words.span / Math.max(1, n - 1));

export const PhotoOrbit: React.FC<PhotoOrbitProps> = ({ line, images, palette, caps = true, tiles = 4, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: mixColor(palette?.ink ?? paletteOf().ink, '#000000', 0.45), ...palette });
  const words = line.trim().split(/\s+/);
  const n = Math.max(3, Math.min(6, Math.round(tiles)));
  const shown = words.filter((_, i) => t >= orbitWordAt(i, words.length));
  const last = orbitWordAt(words.length - 1, words.length);
  const g = orbitGlow(t);
  const size = PHOTO_ORBIT.cap / 0.727;
  const q = Math.min(1, Math.max(0, (t - last) / PHOTO_ORBIT.shrink.len));
  const shrink = 1 - (1 - PHOTO_ORBIT.shrink.to) * (1 - Math.pow(1 - q, 3));
  const sink = tab(t, PHOTO_ORBIT.sink);
  const places = orbitPlaces(t, n).sort((a, b) => a.z - b.z);
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1920,
    textAlign: 'center',
    whiteSpace: 'pre',
    fontFamily: FONT.text,
    fontWeight: 600,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: '0.005em',
    textTransform: caps ? 'uppercase' : 'none',
    color: P.paper,
    transform: `translateY(${(540 - size * 0.5 + sink).toFixed(2)}px) scale(${shrink.toFixed(5)})`,
    transformOrigin: '960px 50%',
  };
  const flare = (s: number): React.CSSProperties =>
    g > 0.005
      ? { filter: `brightness(${(1 + 0.5 * g).toFixed(3)}) drop-shadow(0 0 ${(4 + 8 * g).toFixed(1)}px ${rgba(P.paper, 0.95 * g)}) drop-shadow(0 0 ${(16 + 0.08 * s * g).toFixed(1)}px ${rgba(P.paper, 0.7 * g)})` }
      : {};
  const tile = (p: (typeof places)[number]) => (
    <div key={p.i} style={{ position: 'absolute', left: 0, top: 0, width: p.s, height: p.s, transform: `translate(${(p.x - p.s / 2).toFixed(2)}px, ${(p.y - p.s / 2).toFixed(2)}px)`, ...flare(p.s) }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: mixColor(P.ground, P.paper, 0.1) }}>
        {images.length ? <Picture src={images[p.i % images.length]} /> : null}
        {g > 0.005 ? <div style={{ position: 'absolute', inset: 0, background: P.paper, opacity: 0.45 * g }} /> : null}
      </div>
    </div>
  );
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {places.filter((p) => p.z < 0).map(tile)}
      {g > 0.005 ? [14, 5].map((b, i) => <div key={i} style={{ ...lineStyle, filter: `blur(${b}px)`, opacity: Math.min(1, g * (i ? 1 : 1.4)) }}>{shown.join(' ')}</div>) : null}
      <div data-text="scene-line" style={{ ...lineStyle, textShadow: g > 0.005 ? `0 0 ${(4 * g).toFixed(1)}px ${rgba(P.paper, g)}, 0 0 ${(14 * g).toFixed(1)}px ${rgba(P.paper, 0.8 * g)}` : undefined }}>
        {shown.join(' ')}
      </div>
      {places.filter((p) => p.z >= 0).map(tile)}
      {/* the last frames go to white with the flare: the cut the next scene opens on */}
      {t > 67 ? <div style={{ position: 'absolute', inset: 0, background: P.paper, opacity: E.snapOut(Math.min(1, (t - 67) / 1.5)) * 0.8 }} /> : null}
    </Stage1080>
  );
};

export const photoOrbitMeta: SceneMeta = {
  id: 'photo-orbit',
  does: 'a caps line builds word by word while square photo tiles dive in and orbit it in depth, glowing at the ends and flaring to white',
  dur: PHOTO_ORBIT.dur,
  props: ['line', 'images', 'palette?', 'caps?', 'tiles?'],
  handIn: null,
  handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'hit', id: 'line-glow', weight: 0.9 },
    { f: 1, kind: 'whoosh', id: 'tiles-dive', weight: 0.7 },
    { f: 5, kind: 'tick', id: 'word-2', weight: 0.4 },
    { f: 10, kind: 'tick', id: 'word-3', weight: 0.4 },
    { f: 56, kind: 'riser', id: 'flare-build', weight: 0.6 },
    { f: 66, kind: 'hit', id: 'flare', weight: 0.9 },
  ],
};
