import React from 'react';
import { DEFOCUS_SHARP, defocusMix, type DefocusCopy } from '../lib/defocus';
import { type FilmCtx, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import type { Declares } from '../timeline';

/**
 * Defocus and speed smear as static copies (lib/defocus): the layer is drawn at one or two FIXED blur levels and
 * the two are cross-faded by opacity, so no blur radius ever animates.
 *
 *   Defocus   an even softening of `sigma` px (at 1080p): a hidden cut's jump frame, a layer stepping back in a
 *             stack, a punch-in clearing. The copies sit in an isolated group, so a blend inside stays inside; every
 *             copy after the first is marked data-audit-copy, so the layout audit reads the text once.
 *   DirBlur   a smear along the motion only, from the layer's speed: sigma = speed (px/s) x DIR_BLUR.seconds,
 *             the smear a 180-degree shutter leaves at 30 fps (sigma 0.15 x px per 30 fps frame). For flick
 *             scrolls, whips, a grid rising fast and cards leaving at speed in a crisp film, where the shutter
 *             pass (render.sh --blur) is not wanted. Each level is its own static SVG gaussian (x or y only);
 *             only the copies' opacity changes from frame to frame. `shutter` (deg) sets the smear from the travel per
 *             film frame instead (sigma = px/frame x shutter/360 / sqrt 12): camera whips and rivers of cards read
 *             at 360 (sigma 0.29 x px/frame), twice the house smear at 30 fps. `angle` smears along any direction.
 */

/** House numbers: the smear in seconds of travel (sigma = px/s x seconds), the speed under which nothing smears. */
export const DIR_BLUR = { seconds: 0.0048, minPxS: 120, whipShutter: 360 } as const;

/** The copies that draw a smear of a layer moving `v` px per film frame (signed; px at 1080p). Pure. */
export const dirBlurMix = (v: number, film?: Partial<FilmCtx>, o: { seconds?: number; minPxS?: number; shutter?: number } = {}): DefocusCopy[] => {
  const fps = fpsOf(film);
  const pxS = Math.abs(v) * fps;
  if (pxS < (o.minPxS ?? DIR_BLUR.minPxS)) return [{ level: 0, weight: 1 }];
  const sigma = o.shutter !== undefined ? (Math.abs(v) * o.shutter) / 360 / Math.sqrt(12) : pxS * (o.seconds ?? DIR_BLUR.seconds);
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
      {defocusMix(s).map((c, i, all) => (
        // two levels add (plus-lighter: (1 - w) of one and w of the other, premultiplied), an exact cross for a card or for
        // type on nothing alike: laying the upper level over the lower at w let the sharp ink show through until the step
        // to the next pair, a one-frame jump in a fading layer
        <div key={c.level} data-audit-copy={i > 0 ? '' : undefined} style={{ ...layer, opacity: all.length > 1 ? c.weight : 1, mixBlendMode: i > 0 ? 'plus-lighter' : undefined, filter: c.level > 0 ? `blur(${c.level}px)` : undefined }}>
          {children}
        </div>
      ))}
    </div>
  );
};

/**
 * A smear along `axis` for a layer moving `v` px per film frame at 1080p (pass the speed the act already computes,
 * divided by u when it is in film px: a flick's flickState().v / u, a whip's step / u, camVel().speed / u, a pile
 * card's or masonry tile's v / u); the levels scale with the frame. Sharp under DIR_BLUR.minPxS. `id` names the filters (one per
 * instance). `angle` (deg, 0 = +x, 90 = down; camVel().angle) smears along any direction: the layer is turned onto
 * the travel inside a box as large as the frame's diagonal, smeared on x and turned back.
 */
export const DirBlur: React.FC<{ v: number; axis?: 'x' | 'y'; angle?: number; id?: string; seconds?: number; shutter?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ v, axis = 'y', angle, id, seconds, shutter, style, children }) => {
  const film = useFilm();
  const auto = React.useId();
  const name = safeId(id ?? `dirblur${auto}`);
  const copies = dirBlurMix(v, film, { seconds, shutter }).map((c) => ({ ...c, level: c.level * uOf(film) }));
  const base: React.CSSProperties = { ...layer, isolation: 'isolate', ...style };
  if (copies.length === 1 && copies[0].level === 0) return <div style={base}>{children}</div>;
  const smear = { 'data-audit-smear': '' }; // the layout audit's text-speed check leaves smeared text out: it is blurred along its motion
  if (angle !== undefined && angle % 180 !== 0) {
    const { width, height } = sizeOf(film);
    const d = Math.ceil(Math.hypot(width, height));
    const box: React.CSSProperties = { position: 'absolute', left: (width - d) / 2, top: (height - d) / 2, width: d, height: d, transform: `rotate(${angle}deg)` };
    const back: React.CSSProperties = { position: 'absolute', left: (d - width) / 2, top: (d - height) / 2, width, height, transform: `rotate(${-angle}deg)` };
    return (
      <div style={base} {...smear}>
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          {copies.filter((c) => c.level > 0).map((c) => (
            <filter key={c.level} id={`${name}-a${Math.round(c.level * 100)}`} x="-10%" y="0%" width="120%" height="100%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${c.level} 0`} />
            </filter>
          ))}
        </svg>
        {copies.map((c, i) => (
          <div key={c.level} data-audit-copy={i > 0 ? '' : undefined} style={{ ...box, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? `url(#${name}-a${Math.round(c.level * 100)})` : undefined }}>
            <div style={back}>{children}</div>
          </div>
        ))}
      </div>
    );
  }
  const ax = angle === undefined ? axis : 'x';
  return (
    <div style={base} {...smear}>
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        {copies
          .filter((c) => c.level > 0)
          .map((c) => (
            <filter key={c.level} id={`${name}-${Math.round(c.level * 100)}`} x={ax === 'x' ? '-20%' : '0%'} y={ax === 'y' ? '-20%' : '0%'} width={ax === 'x' ? '140%' : '100%'} height={ax === 'y' ? '140%' : '100%'} colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={ax === 'x' ? `${c.level} 0` : `0 ${c.level}`} />
            </filter>
          ))}
      </svg>
      {copies.map((c, i) => (
        <div key={c.level} data-audit-copy={i > 0 ? '' : undefined} style={{ ...layer, opacity: i === 0 ? 1 : c.weight, filter: c.level > 0 ? `url(#${name}-${Math.round(c.level * 100)})` : undefined }}>
          {children}
        </div>
      ))}
    </div>
  );
};

/**
 * A rotational smear for a layer spinning `omega` degrees per film frame about (cx, cy) px: copies turned back over
 * the shutter (house 180 degrees: half the frame's turn), averaged as a running mean (copy k at opacity 1 / (k + 1)),
 * one copy every `stepDeg` (house 6 degrees, at most 10). Sharp under 1 degree a frame. A mark spinning in, a dial.
 */
export const SPIN_BLUR = { shutter: 180, stepDeg: 6, max: 10 } as const;
export const spinBlurCopies = (omega: number, o: { shutter?: number; stepDeg?: number; max?: number } = {}) => {
  const sweep = Math.abs(omega) * ((o.shutter ?? SPIN_BLUR.shutter) / 360);
  if (Math.abs(omega) < 1) return [0];
  const n = Math.max(2, Math.min(o.max ?? SPIN_BLUR.max, Math.ceil(sweep / (o.stepDeg ?? SPIN_BLUR.stepDeg)) + 1));
  return Array.from({ length: n }, (_, k) => -Math.sign(omega) * sweep * (k / (n - 1))); // degrees behind the current angle
};
export const SpinBlur: React.FC<{ omega: number; cx: number; cy: number; shutter?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ omega, cx, cy, shutter, style, children }) => {
  const back = spinBlurCopies(omega, { shutter });
  const base: React.CSSProperties = { ...layer, isolation: 'isolate', ...style };
  if (back.length === 1) return <div style={base}>{children}</div>;
  return (
    <div style={base} data-audit-smear="">
      {back.map((d, k) => (
        <div key={k} data-audit-copy={k > 0 ? '' : undefined} style={{ ...layer, opacity: 1 / (k + 1), transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${d.toFixed(3)}deg)` }}>
          {children}
        </div>
      ))}
    </div>
  );
};

/** Defocus and DirBlur are continuous: nothing to declare. */
export const declares = (_props?: unknown, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
