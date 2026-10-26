import React from 'react';
import { DEFOCUS_SHARP, defocusMix, type DefocusCopy } from '../lib/defocus';
import { type FilmCtx, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Defocus and speed smear as static copies (lib/defocus): the layer is drawn at one or two FIXED blur levels and
 * the two are cross-faded by opacity, so no blur radius ever animates.
 *
 *   Defocus   an even softening of `sigma` px (at 1080p): a hidden cut's jump frame, a layer stepping back in a
 *             stack, a punch-in clearing. The copies sit in an isolated group, so a blend inside stays inside.
 *   DirBlur   a smear along the motion only, from the layer's speed: sigma = speed (px/s) x DIR_BLUR.seconds,
 *             the smear a 180-degree shutter leaves at 30 fps (sigma 0.15 x px per 30 fps frame). For flick
 *             scrolls, whips, a grid rising fast and cards leaving at speed in a crisp film, where the shutter
 *             pass (render.sh --blur) is not wanted. Each level is its own static SVG gaussian (x or y only);
 *             only the copies' opacity changes from frame to frame.
 */

/** House numbers: the smear in seconds of travel (sigma = px/s x seconds), the speed under which nothing smears. */
export const DIR_BLUR = { seconds: 0.0048, minPxS: 120 } as const;

/** The copies that draw a smear of a layer moving `v` px per film frame (signed; px at 1080p). Pure. */
export const dirBlurMix = (v: number, film?: Partial<FilmCtx>, o: { seconds?: number; minPxS?: number } = {}): DefocusCopy[] => {
  const fps = fpsOf(film);
  const pxS = Math.abs(v) * fps;
  if (pxS < (o.minPxS ?? DIR_BLUR.minPxS)) return [{ level: 0, weight: 1 }];
  const sigma = pxS * (o.seconds ?? DIR_BLUR.seconds);
  return sigma < DEFOCUS_SHARP ? [{ level: 0, weight: 1 }] : defocusMix(sigma);
};

const layer: React.CSSProperties = { position: 'absolute', inset: 0 };
const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');

/** An even defocus of `sigma` px at 1080p (scaled with the frame), drawn as at most two fixed levels. */
export const Defocus: React.FC<{ sigma: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ sigma, style, children }) => {
  const film = useFilm();
  const s = sigma * uOf(film);
  const base: React.CSSProperties = { ...layer, isolation: 'isolate', ...style };
  if (s < DEFOCUS_SHARP) return <div style={base}>{children}</div>;
  return (
    <div style={base}>
      {defocusMix(s).map((c, i) => (
        <div key={c.level} style={{ ...layer, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? `blur(${c.level}px)` : undefined }}>
          {children}
        </div>
      ))}
    </div>
  );
};

/**
 * A smear along `axis` for a layer moving `v` px per film frame (pass the speed the act already computes: a flick's
 * flickState().v, a whip's step). Sharp under DIR_BLUR.minPxS. `id` names the filters (one per instance).
 */
export const DirBlur: React.FC<{ v: number; axis?: 'x' | 'y'; id?: string; seconds?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ v, axis = 'y', id, seconds, style, children }) => {
  const film = useFilm();
  const auto = React.useId();
  const name = safeId(id ?? `dirblur${auto}`);
  const copies = dirBlurMix(v, film, { seconds }).map((c) => ({ ...c, level: c.level * uOf(film) }));
  const base: React.CSSProperties = { ...layer, isolation: 'isolate', ...style };
  if (copies.length === 1 && copies[0].level === 0) return <div style={base}>{children}</div>;
  return (
    <div style={base}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        {copies
          .filter((c) => c.level > 0)
          .map((c) => (
            <filter key={c.level} id={`${name}-${Math.round(c.level * 100)}`} x={axis === 'x' ? '-20%' : '0%'} y={axis === 'y' ? '-20%' : '0%'} width={axis === 'x' ? '140%' : '100%'} height={axis === 'y' ? '140%' : '100%'} colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={axis === 'x' ? `${c.level} 0` : `0 ${c.level}`} />
            </filter>
          ))}
      </svg>
      {copies.map((c, i) => (
        <div key={c.level} style={{ ...layer, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? `url(#${name}-${Math.round(c.level * 100)})` : undefined }}>
          {children}
        </div>
      ))}
    </div>
  );
};

/** Defocus and DirBlur are continuous: nothing to declare. */
export const declares = (_props?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
