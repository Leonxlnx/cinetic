// Turns: how one section becomes the next. A cut is never bare: it is carried by speed, a shape, an object or light.
//
//   <Iris>       the next shot opens inside a growing shape (circle, rounded rect, any SVG path, a logo)
//   <Tiles>      the frame breaks into a grid of tiles that flip/scale in a sweep, revealing the next shot
//   <Pixelate>   mosaic up, swap, mosaic down (digital, on-beat)
//   <Push>       both shots travel together like one strip of film, with smear on the fastest frames
//   <ZoomThrough> fly into an element until it fills the frame, then it IS the next shot
//   <Flash>      a burst of light (white or the accent) that hides the swap at its peak
//
// Each takes the outgoing shot as `from`, the incoming as `to`, a start frame and a duration. Put them in a
// Sequence that spans both shots, or render `from`/`to` yourself and use the progress helpers.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { at, clamp, ease, logScale, mix, rand, type Ease } from './motion';

type TurnProps = { from: React.ReactNode; to: React.ReactNode; start: number; dur?: number; curve?: Ease };

/** The next shot grows inside a shape from (x, y). shape: 'circle' | 'rounded' | an SVG path in a 100x100 box. */
export const Iris: React.FC<TurnProps & { x?: number; y?: number; shape?: 'circle' | 'rounded' | string; ring?: string }> = ({
  from,
  to,
  start,
  dur = 22,
  curve = ease.inOut,
  x = 960,
  y = 540,
  shape = 'circle',
  ring,
}) => {
  const frame = useCurrentFrame();
  const uid = `iris${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = at(frame, start, dur, curve);
  if (p <= 0) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (p >= 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const maxR = Math.hypot(Math.max(x, 1920 - x), Math.max(y, 1080 - y));
  // Log-space growth so the opening feels even at every size.
  const r = logScale(4, maxR * 1.05, p);
  let clip: string;
  if (shape === 'circle') clip = `circle(${r}px at ${x}px ${y}px)`;
  else if (shape === 'rounded') clip = `inset(${Math.max(0, y - r * 0.62)}px ${Math.max(0, 1920 - x - r)}px ${Math.max(0, 1080 - y - r * 0.62)}px ${Math.max(0, x - r)}px round ${r * 0.18}px)`;
  else clip = 'none';
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${mix(p, 1, 1.12)})`, filter: `blur(${mix(p, 0, 6)}px)` }}>{from}</AbsoluteFill>
      {shape === 'circle' || shape === 'rounded' ? (
        <AbsoluteFill style={{ clipPath: clip, transform: `scale(${mix(p, 1.18, 1)})` }}>{to}</AbsoluteFill>
      ) : (
        <AbsoluteFill>
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <clipPath id={uid} clipPathUnits="userSpaceOnUse">
                <path d={shape} transform={`translate(${x - r} ${y - r}) scale(${(r * 2) / 100})`} />
              </clipPath>
            </defs>
          </svg>
          <AbsoluteFill style={{ clipPath: `url(#${uid})`, transform: `scale(${mix(p, 1.18, 1)})` }}>{to}</AbsoluteFill>
        </AbsoluteFill>
      )}
      {ring && shape === 'circle' && (
        <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', boxShadow: `0 0 0 ${mix(p, 6, 2)}px ${ring}`, opacity: 1 - p }} />
      )}
    </AbsoluteFill>
  );
};

/**
 * The frame breaks into tiles that sweep across (from a corner or the centre), each tile scaling/flipping from
 * the old shot to the new. cols x rows tiles; `order` decides the sweep.
 */
export const Tiles: React.FC<TurnProps & { cols?: number; rows?: number; order?: 'diagonal' | 'center' | 'random' | 'left'; color?: string }> = ({
  from,
  to,
  start,
  dur = 24,
  cols = 12,
  rows = 7,
  order = 'diagonal',
  color,
}) => {
  const frame = useCurrentFrame();
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (frame >= start + dur + 8) return <AbsoluteFill>{to}</AbsoluteFill>;
  const tw = 1920 / cols;
  const th = 1080 / rows;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k =
        order === 'diagonal'
          ? (c / cols + r / rows) / 2
          : order === 'center'
            ? Math.hypot(c + 0.5 - cols / 2, r + 0.5 - rows / 2) / Math.hypot(cols / 2, rows / 2)
            : order === 'left'
              ? c / cols
              : rand(r * 31 + c * 7);
      const p = at(frame, start + k * dur * 0.7, dur * 0.35, ease.inOut);
      // first half: old tile shrinks away (or turns to colour); second half: new tile grows in
      const showNew = p >= 0.5;
      const s = showNew ? mix((p - 0.5) * 2, 0, 1) : mix(p * 2, 1, 0);
      tiles.push(
        <div key={`${r}-${c}`} style={{ position: 'absolute', left: c * tw, top: r * th, width: tw + 0.5, height: th + 0.5, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${color ? 1 : s})`, background: color && !showNew ? color : undefined, opacity: color && !showNew ? clamp(p * 4) : 1 }}>
            <div style={{ position: 'absolute', left: -c * tw, top: -r * th, width: 1920, height: 1080 }}>{showNew ? to : color ? null : from}</div>
          </div>
        </div>,
      );
    }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 }}>{from}</AbsoluteFill>
      <AbsoluteFill style={{ background: 'transparent' }}>{tiles}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Mosaic transition: the old shot pixelates up, swaps at peak, the new shot resolves. Uses an SVG filter (cheap). */
export const Pixelate: React.FC<TurnProps & { max?: number }> = ({ from, to, start, dur = 16, max = 64 }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.linear);
  if (frame < start) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (p >= 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
  // stepped block sizes read as digital: 4, 8, 16, 32, 64
  const step = Math.pow(2, Math.round(mix(ease.in(tri), 1, Math.log2(max))));
  const id = `px${React.useId().replace(/[^a-zA-Z0-9]/g, '')}${frame}`;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feFlood x={step / 2} y={step / 2} height="1" width="1" />
          <feComposite width={step} height={step} />
          <feTile result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
          <feMorphology operator="dilate" radius={step / 2} />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: step > 1 ? `url(#${id})` : undefined }}>{p < 0.5 ? from : to}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Both shots travel as one strip. dir: where the old shot goes. Smear (blur along the move) on the fastest frames. */
export const Push: React.FC<TurnProps & { dir?: 'left' | 'right' | 'up' | 'down'; smear?: number }> = ({ from, to, start, dur = 16, curve = ease.inOut, dir = 'left', smear = 18 }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, curve);
  if (p <= 0) return <AbsoluteFill>{from}</AbsoluteFill>;
  if (p >= 1) return <AbsoluteFill>{to}</AbsoluteFill>;
  const v = Math.abs(at(frame + 0.5, start, dur, curve) - at(frame - 0.5, start, dur, curve));
  const blur = Math.min(smear, v * smear * dur * 0.5);
  const horiz = dir === 'left' || dir === 'right';
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  const size = horiz ? 1920 : 1080;
  const off = sign * p * size;
  const t = (o: number) => (horiz ? `translateX(${o}px)` : `translateY(${o}px)`);
  // directional blur: scale-stretch trick (cheap) along the axis plus a light blur
  const stretch = 1 + blur * 0.004;
  const sk = horiz ? `scaleX(${stretch})` : `scaleY(${stretch})`;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `${t(off)} ${sk}`, filter: blur > 0.5 ? `blur(${blur * 0.35}px)` : undefined }}>{from}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `${t(off - sign * size)} ${sk}`, filter: blur > 0.5 ? `blur(${blur * 0.35}px)` : undefined }}>{to}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Fly into a point of the old shot (an element's centre) until it fills the frame; the new shot takes over
 * at the end, itself arriving from slightly zoomed-in to rest. Log-space zoom, ease.in into the element.
 */
export const ZoomThrough: React.FC<TurnProps & { x: number; y: number; depth?: number }> = ({ from, to, start, dur = 18, x, y, depth = 14 }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.in);
  const q = at(frame, start + dur, Math.round(dur * 0.9), ease.out);
  if (frame < start + dur) {
    const s = logScale(1, depth, p);
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <AbsoluteFill style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${s})`, filter: `blur(${mix(clamp((p - 0.6) / 0.4), 0, 10)}px)` }}>{from}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${logScale(1.5, 1, q)})`, filter: `blur(${mix(q, 8, 0)}px)` }}>{to}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A flash of light that hides a swap: peaks at start + dur/2, where the shot underneath should change. */
export const Flash: React.FC<{ start: number; dur?: number; color?: string; strength?: number }> = ({ start, dur = 10, color = '#ffffff', strength = 1 }) => {
  const frame = useCurrentFrame();
  const p = (frame - start) / dur;
  if (p < 0 || p > 1) return null;
  const v = p < 0.4 ? ease.in(p / 0.4) : 1 - ease.out((p - 0.4) / 0.6);
  return <AbsoluteFill style={{ background: color, opacity: v * strength, mixBlendMode: 'screen', pointerEvents: 'none' }} />;
};

/** Progress helpers when you build a turn by hand (most of the best ones are hand-built per film). */
export const turn = { at, ease, logScale, mix };

/**
 * A ground cut grown from an object: the object's own box (a button, a card, a block) grows in log space until it is the
 * whole frame, and what it reveals (`to`) is the next shot on the new ground. The strongest way to change ground: the
 * colour comes from something the viewer is already looking at. `color` paints the growing box; `to` appears inside it.
 */
export const Flood: React.FC<{
  from: { x: number; y: number; w: number; h: number; r?: number };
  start: number;
  dur?: number;
  color: string;
  under?: React.ReactNode;
  to?: React.ReactNode;
  /** Drawn on top of the flood until it fills the frame: the object it grows from (a URL, a label) stays readable. */
  source?: React.ReactNode;
  /** reveal: `to` shows at full opacity inside the growing shape (a window opening), instead of fading in late. */
  reveal?: boolean;
}> = ({ from, start, dur = 16, color, under, to, source, reveal = false }) => {
  const frame = useCurrentFrame();
  const p = at(frame, start, dur, ease.in);
  if (frame < start) return <AbsoluteFill>{under}</AbsoluteFill>;
  // grow each edge outward to (beyond) the frame edge, in log space so it accelerates evenly
  const k = logScale(1, 40, p) - 1;
  const left = Math.max(-40, from.x - from.w / 2 - k * Math.max(1, from.x - from.w / 2));
  const right = Math.min(1960, from.x + from.w / 2 + k * Math.max(1, 1920 - from.x - from.w / 2));
  const top = Math.max(-40, from.y - from.h / 2 - k * Math.max(1, from.y - from.h / 2));
  const bottom = Math.min(1120, from.y + from.h / 2 + k * Math.max(1, 1080 - from.y - from.h / 2));
  const r = mix(p, from.r ?? 24, 0);
  const done = frame >= start + dur;
  return (
    <AbsoluteFill>
      {!done && <AbsoluteFill>{under}</AbsoluteFill>}
      <AbsoluteFill style={{ clipPath: done ? undefined : `inset(${top}px ${1920 - right}px ${1080 - bottom}px ${left}px round ${r}px)`, background: color }}>
        {to && <AbsoluteFill style={{ opacity: reveal ? 1 : clamp((p - 0.55) / 0.45) }}>{to}</AbsoluteFill>}
      </AbsoluteFill>
      {source && !done && <AbsoluteFill style={{ opacity: 1 - clamp((p - 0.5) / 0.3) }}>{source}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

/**
 * One element turns into another tile by tile (a sketch flipping into the real card, a photo into its UI): a grid of tiles
 * over the element's box, each flipping in 3D from `front` to `back` in a diagonal wave. Place it where the element sits.
 */
export const TileFlip: React.FC<{ front: React.ReactNode; back: React.ReactNode; w: number; h: number; start: number; cols?: number; rows?: number; wave?: number; flip?: number }> = ({
  front,
  back,
  w,
  h,
  start,
  cols = 6,
  rows = 4,
  wave = 16,
  flip = 8,
}) => {
  const frame = useCurrentFrame();
  const tw = w / cols;
  const th = h / rows;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = (c / cols + r / rows) / 2;
      const p = at(frame, start + k * wave, flip, ease.inOut);
      const showBack = p >= 0.5;
      const ang = showBack ? mix((p - 0.5) * 2, -90, 0) : mix(p * 2, 0, 90);
      tiles.push(
        <div key={`${r}-${c}`} style={{ position: 'absolute', left: c * tw, top: r * th, width: tw + 0.5, height: th + 0.5, overflow: 'hidden', transform: `perspective(900px) rotateY(${ang}deg)` }}>
          <div style={{ position: 'absolute', left: -c * tw, top: -r * th, width: w, height: h }}>{showBack ? back : front}</div>
        </div>,
      );
    }
  return <div style={{ position: 'relative', width: w, height: h }}>{tiles}</div>;
};
