import React, { useId } from 'react';
import { Img } from 'remotion';
import { C } from '../brand/tokens';
import { clamp, E, type Ease } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Cut-outs and collage: pieces of photographs cut along hand-drawn mattes (a polygon in the image's own
 * px, traced once on a still: the rock, the shell, the person, the tool), laid on a ground or on each
 * other like printed paper, each casting a shadow from one key light. A piece arrives lifted (z px above
 * the surface), offset and turned, and settles flat: its shadow slides in under it and sharpens, and a
 * tight contact shadow appears as it touches. No ML matting: the matte is a drawing, which is also why
 * the edge reads as cut (an optional paper border makes it a print).
 *
 * Shadows: a piece z px up throws its matte shape z cot(elevation) away from the key (azimuth measured
 * like fx/KeyLight: 315 = the key at the top left, shadows to the bottom right). The blur never animates:
 * two fixed radii (house 3 and 14 px) cross-fade by the lift, and the contact shadow (the matte grown 2 px,
 * the tight radius) fades in over the last 24 px of lift. All in the ink colour, alpha 0.18-0.32.
 * House: pieces settle on E.settleOut over 34 f at 60 fps from z 120 px, 4-8 degrees of turn, a stagger of
 * 6-10 f between pieces; at rest a piece keeps a 1-2 degree living sway only if the camera is locked.
 */
export type CutPiece = {
  src: string;
  w: number; // image px
  h: number;
  matte?: [number, number][]; // the cut, image px (default the whole image)
  at: [number, number]; // frame px where the matte's centre rests
  scale?: number; // image px -> frame px at rest (default 1)
  rot?: number; // degrees at rest
  land: number; // the frame it lies flat
  dur?: number; // frames of the settle (house 34 f at 60 fps)
  from?: { dx?: number; dy?: number; rot?: number; z?: number }; // where it starts relative to rest (z = lift px)
  ease?: Ease;
  paper?: number; // a paper border, px at rest (0: none)
  id?: string;
};
export type CutoutsProps = {
  frame: number;
  pieces: CutPiece[];
  light?: { azimuth?: number; elevation?: number };
  ink?: string;
  alpha?: number; // shadow strength (house 0.26)
  paperColor?: string;
  style?: React.CSSProperties;
  id?: string;
};

export const CUTOUT_HOUSE = { dur60: 34, z: 120, turn: 6, azimuth: 315, elevation: 34, alpha: 0.26, blur: [3, 14] as [number, number], contactPx: 24 } as const;

/** The centre of a matte (the mean of its points), image px. */
export const matteCentre = (pts: [number, number][]): [number, number] => {
  const n = Math.max(1, pts.length);
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
};

export type CutState = { t: number; x: number; y: number; rot: number; scale: number; z: number; visible: boolean; shadow: [number, number]; soft: number; contact: number };

/**
 * A piece at frame f: where its matte centre is (frame px), its turn and scale, its lift z, the shadow's
 * offset (frame px), how soft the shadow is (0 tight .. 1 soft) and the contact shadow's weight. Pure.
 */
export const cutoutState = (f: number, piece: CutPiece, film?: Partial<FilmCtx>, light: { azimuth?: number; elevation?: number } = {}): CutState => {
  const fps = fpsOf(film);
  const dur = piece.dur ?? f60x(CUTOUT_HOUSE.dur60, fps);
  const t = clamp((f - (piece.land - dur)) / Math.max(1e-6, dur));
  const e = (piece.ease ?? E.settleOut)(t);
  const fr = piece.from ?? {};
  const z0 = fr.z ?? CUTOUT_HOUSE.z;
  const z = z0 * (1 - e);
  const az = ((light.azimuth ?? CUTOUT_HOUSE.azimuth) * Math.PI) / 180;
  const el = ((light.elevation ?? CUTOUT_HOUSE.elevation) * Math.PI) / 180;
  const len = z / Math.tan(Math.max(0.05, el));
  // the key at azimuth a (0 = top, clockwise) throws shadows the opposite way
  const shadow: [number, number] = [-Math.sin(az) * len, Math.cos(az) * len];
  // a lifted piece is nearer the lens: up to +6 % larger at the start of its fall
  const scale = (piece.scale ?? 1) * (1 + 0.06 * (z / Math.max(1, z0)) * (z0 > 0 ? 1 : 0));
  return {
    t,
    x: piece.at[0] + (fr.dx ?? 0) * (1 - e),
    y: piece.at[1] + (fr.dy ?? 0) * (1 - e),
    rot: (piece.rot ?? 0) + (fr.rot ?? CUTOUT_HOUSE.turn) * (1 - e),
    scale,
    z,
    visible: f >= piece.land - dur,
    shadow,
    soft: clamp(z / Math.max(1, z0)),
    contact: clamp(1 - z / CUTOUT_HOUSE.contactPx),
  };
};

const polyCss = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;
const polyD = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;

/** A matte grown by d px along its vertex normals (a paper border or a contact shadow); fine for gently concave cuts. */
export const growMatte = (pts: [number, number][], d: number): [number, number][] => {
  const n = pts.length;
  if (n < 3 || d === 0) return pts;
  const [cx, cy] = matteCentre(pts);
  // orientation: positive area = clockwise in screen coordinates (y down)
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const sgn = area >= 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    let nx = (b[1] - a[1]) * sgn;
    let ny = -(b[0] - a[0]) * sgn;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    // keep the normal pointing away from the centre (robust on small concavities)
    if ((p[0] - cx) * nx + (p[1] - cy) * ny < 0) { nx = -nx; ny = -ny; }
    return [p[0] + nx * d, p[1] + ny * d] as [number, number];
  });
};

export const Cutouts: React.FC<CutoutsProps> = (p) => {
  const film = useFilm();
  const uid = useId().replace(/:/g, '');
  const id = `cut-${p.id ?? uid}`;
  const ink = p.ink ?? C.ink;
  const alpha = p.alpha ?? CUTOUT_HOUSE.alpha;
  const [b0, b1] = CUTOUT_HOUSE.blur;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...p.style }}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id={`${id}-a`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={b0} />
          </filter>
          <filter id={`${id}-b`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={b1} />
          </filter>
        </defs>
      </svg>
      {p.pieces.map((pc, i) => {
        const s = cutoutState(p.frame, pc, film, p.light);
        if (!s.visible) return null;
        const matte = pc.matte ?? [[0, 0], [pc.w, 0], [pc.w, pc.h], [0, pc.h]];
        const [mx, my] = matteCentre(matte);
        // image px -> frame px: the matte centre on (x, y), turned and scaled about it
        const place = (dx = 0, dy = 0) => `translate(${(s.x + dx).toFixed(2)}px, ${(s.y + dy).toFixed(2)}px) rotate(${s.rot.toFixed(3)}deg) scale(${s.scale.toFixed(5)}) translate(${(-mx).toFixed(2)}px, ${(-my).toFixed(2)}px)`;
        const paper = pc.paper ? growMatte(matte, pc.paper / Math.max(1e-6, pc.scale ?? 1)) : null;
        const shape = paper ?? matte;
        const svgBox = { position: 'absolute' as const, left: 0, top: 0, width: pc.w, height: pc.h, overflow: 'visible' as const, transformOrigin: '0 0' };
        return (
          <React.Fragment key={pc.id ?? i}>
            {/* cast shadow: two fixed blurs cross-faded by the lift */}
            <svg viewBox={`0 0 ${pc.w} ${pc.h}`} style={{ ...svgBox, transform: place(s.shadow[0], s.shadow[1]) }}>
              <path d={polyD(shape)} fill={ink} opacity={alpha * (1 - s.soft) * (0.55 + 0.45 * (1 - s.contact))} filter={`url(#${id}-a)`} />
              {s.soft > 0.001 && <path d={polyD(shape)} fill={ink} opacity={alpha * s.soft} filter={`url(#${id}-b)`} />}
            </svg>
            {s.contact > 0.001 && (
              <svg viewBox={`0 0 ${pc.w} ${pc.h}`} style={{ ...svgBox, transform: place(0.6, 1.2) }}>
                <path d={polyD(growMatte(shape, 2 / Math.max(1e-6, pc.scale ?? 1)))} fill={ink} opacity={0.5 * alpha * s.contact} filter={`url(#${id}-a)`} />
              </svg>
            )}
            {paper && (
              <svg viewBox={`0 0 ${pc.w} ${pc.h}`} style={{ ...svgBox, transform: place() }}>
                <path d={polyD(paper)} fill={p.paperColor ?? C.paper} />
              </svg>
            )}
            <div style={{ position: 'absolute', left: 0, top: 0, width: pc.w, height: pc.h, transformOrigin: '0 0', transform: place(), clipPath: polyCss(matte) }}>
              <Img data-imagery="" src={pc.src} style={{ width: pc.w, height: pc.h, display: 'block' }} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** A collage settles continuously: nothing stepped, no seams of its own. */
export const declares = (_p?: Partial<CutoutsProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
