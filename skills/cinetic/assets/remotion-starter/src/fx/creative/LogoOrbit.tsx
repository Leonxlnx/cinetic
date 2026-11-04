// logo-orbit: the products this one works with, as an orbit that collapses into one. The official marks burst out of
// the centre onto a ring (flat tiles facing the camera, nearer ones larger), the ring turning fast and decaying to a
// cruise; on the moment every mark flies into the centre (the far ones first) and the product grows out of the point
// they met in, whole and at rest. The marks are one colour in the film's own ink by default (an official colour that
// fights the palette is the cheap look): `colour: 'official'` keeps their own colours.
import React from 'react';
import { FONT } from '../../brand/tokens';
import { BrandLogo, hasLogo, logoName } from '../../kit/logos';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { type FilmCtx, useFilm } from '../../lib/film';
import { centreOf, face, frameOf, k60, momentAt, type PictureProps, type Recipe, SceneView, type Params } from './core';

/** House numbers (f@60, px@1080, degrees a frame): the ring, the tiles, the burst, the turn decaying to a cruise, the
 * collapse and the product growing out of the centre. */
export const ORBIT = { rx: 640, ry: 210, cy: 0, tile: 190, far: 0.6, burst: 30, stagger: 2, fast: 6, cruise: 0.32, tau: 16, collapse: 22, grow: 30, from: 0.32, at: 0.58 } as const;

export const RECIPE: Recipe = {
  id: 'logo-orbit',
  recipe:
    'The products it works with as an orbit that collapses into one: the official marks (one colour in the film ink by default) burst from the centre onto a 640 x 210 px ring (190 px tiles) as flat lit tiles facing the camera (30 f, 2 f apart), the ring turning 6 deg a frame and decaying to a 0.32 deg cruise; on the moment (58 %) every mark flies into the centre on launchIn (22 f, far ones first) and the product grows out of that point to rest (30 f, from 32 %).',
  params: { ...ORBIT },
};

/** The ring's turn (degrees) at frame t after it starts: a fast start decaying to a cruise (closed form, any frame). */
export const orbitAngle = (t: number, film?: Partial<FilmCtx>, o: Params<typeof ORBIT> = {}) => {
  const P = { ...ORBIT, ...o };
  const k = k60(film);
  const x = Math.max(0, t) / k; // in 60 fps frames
  return P.cruise * x + (P.fast - P.cruise) * P.tau * (1 - Math.exp(-x / P.tau));
};

/** Every tile's place at frame t (since the device started), with the collapse at frame `at`: x, y, scale, depth (0
 * back .. 1 front), opacity; and the product's growth (0..1). */
export const orbitState = (t: number, n: number, at: number, film?: Partial<FilmCtx>, o: Params<typeof ORBIT> = {}) => {
  const P = { ...ORBIT, ...o };
  const k = k60(film);
  const { W, H, u } = frameOf(film);
  const turn = orbitAngle(t, film, P);
  const tiles = Array.from({ length: n }, (_, i) => {
    const a = ((turn + (360 * i) / n + 90) * Math.PI) / 180;
    const depth = (Math.sin(a) + 1) / 2;
    const burst = E.glideOut(clamp((t - i * P.stagger * k) / (P.burst * k)));
    // far ones first into the centre
    const c = E.launchIn(clamp((t - at - (1 - depth) * 6 * k) / (P.collapse * k)));
    const r = burst * (1 - c);
    return {
      x: W / 2 + Math.cos(a) * P.rx * u * r,
      y: H / 2 + P.cy * u + Math.sin(a) * P.ry * u * r,
      scale: mix(P.far, 1, depth) * mix(0.5, 1, burst) * mix(1, 0.35, c),
      depth,
      opacity: clamp(burst * 3) * (1 - clamp((c - 0.82) / 0.18)),
    };
  });
  const grow = E.glideOut(clamp((t - at - P.collapse * 0.7 * k) / (P.grow * k)));
  return { tiles, grow, turn };
};

/** One mark on a lit tile facing the camera; a mark the film has not fetched shows its name's first letter (precheck
 * names it: node scripts/logos.mjs get <name>). */
const Tile: React.FC<{ logo: string; size: number; u: number; pal: Parameters<typeof face>[1]; official: boolean }> = ({ logo, size, u, pal, official }) => {
  const bg = pal.dark ? mixColor(pal.surface, '#ffffff', 0.04) : pal.surface;
  const ink = pal.dark ? '#ffffff' : pal.type;
  const ground = pal.dark && !official ? 'dark' : 'light';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size * 0.27, ...face(bg, pal, u), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {hasLogo(logo) ? (
        <BrandLogo logo={logo} box={size * 0.5} ground={ground} mono={!official} />
      ) : (
        <div style={{ fontFamily: FONT.text, fontSize: size * 0.44, fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1, color: ink }}>{(logoName(logo).trim()[0] ?? '').toUpperCase()}</div>
      )}
    </div>
  );
};

export const LogoOrbit: React.FC<PictureProps & { logos: string[]; colour?: 'mono' | 'official'; params?: Params<typeof ORBIT> }> = ({ f, dur, start = 0, hits, pal, scene, focus, logos, colour = 'mono', params = {} }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const P = { ...ORBIT, ...params };
  const t = f - start;
  const at = momentAt(hits, 0, start, dur, P.at) - start;
  const st = orbitState(t, logos.length, at, film, P);
  const fb = focus ?? { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.6 };
  const c = centreOf(fb);
  const s = mix(P.from, 1, st.grow);
  // the product grows out of the frame's centre into its own place
  const view = { s, tx: mix(W / 2 - c.x * s, 0, st.grow), ty: mix(H / 2 - c.y * s, 0, st.grow) };
  const order = st.tiles.map((x, i) => ({ ...x, i })).sort((a, b) => a.depth - b.depth);
  const size = P.tile * u;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {st.grow > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: clamp(st.grow * 2.5) }}>
          <SceneView node={scene(f)} box={{ x: 0, y: 0, w: W, h: H }} view={view} W={W} H={H} clip={false} />
        </div>
      )}
      {order.map((x) =>
        x.opacity <= 0.002 ? null : (
          <div key={x.i} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, opacity: x.opacity, transformOrigin: '50% 50%', transform: `translate3d(${(x.x - size / 2).toFixed(2)}px, ${(x.y - size / 2).toFixed(2)}px, 0) scale(${x.scale.toFixed(4)})` }}>
            <Tile logo={logos[x.i]} size={size} u={u} pal={pal} official={colour === 'official'} />
          </div>
        ),
      )}
    </div>
  );
};
