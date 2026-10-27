import React, { useId } from 'react';
import { C } from '../brand/tokens';
import { clamp, E, type Ease, mix } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, sizeOf, uOf, useFilm } from '../lib/film';
import { FILM_LIGHT, type FilmLight, faceLight, faceShift, keyLocal, type Tilt } from '../lib/light';
import type { Declares } from '../timeline';
import { shadowTone } from './KeyLight';

/**
 * Lit: a product panel placed in a lit space instead of pasted front-on. The panel turns 8-14 degrees on X and Y
 * (house rotateX 10, rotateY -12) in a perspective of 2200 px, lifted 36 px off its backing, and the film's one light
 * (lib/light FILM_LIGHT) does the rest:
 *   - a 1 px rim highlight on the edges that face the key, computed in the panel's own coordinates (keyLocal), so the
 *     rim slides round the edge as the panel turns and brightens as an edge turns into the light;
 *   - the face catches more or less light as it turns (n . l against a front-on panel: a faint lift toward the key,
 *     capped at 5 %, a shade away from it) plus a faint sheen along the key-side edge (3 %, gone by 40 % of the face),
 *     both in the light's colour (rim.color). No bloom and no haze: the face never takes a white veil, so the
 *     product's own colours and type stay as designed; the light is the rim and the shadow;
 *   - a ground-coloured spill: the ground's bounce light on the side away from the key;
 *   - a cast shadow on the backing plane `lift` px behind the panel and parallel to it (so a turned panel never cuts
 *     through its own ground), thrown away from the key by lift x (in-plane light / facing light), its penumbra
 *     growing with that throw (two fixed blur levels cross-faded, never an animated radius); and a soft contact
 *     shadow straight behind it. Both in the ground's own hue (KeyLight shadowTone), both seen through the same
 *     perspective as the panel.
 * It never stops: a sway of 1.4 degrees on X and Y a quarter-turn apart (7 s loop) and a float of 18 px/s on a 1:2
 * loop (9 s) keep the panel moving 0.3-1 px a frame at 30 fps through every hold, and an optional entry settles the panel from a steeper tilt on
 * E.settleOut over 48 f at 60 fps. All placement is transform (translate3d), never left/top.
 *
 * Draw the panel at (0, 0) in its own w x h box as the children (a kit Surface with lift 0-6: Lit draws the shadow).
 * litState() is pure: any frame, any order, any fps.
 */

/** House numbers: px at 1080p, degrees, 60 fps frames. */
export const LIT = {
  tilt: { x: 10, y: -12 } as Required<Pick<Tilt, 'x' | 'y'>>,
  tiltRange: [8, 14] as const, // |rotateX| and |rotateY| of a lit panel at rest
  lift: 36, // px between the panel and its backing plane
  perspective: 2200, // px (references/camera.md §9: 1800-2600)
  sway: { deg: 1.4, period: 7, float: 18, floatPeriod: 9 }, // tilt: degrees on X and Y a quarter-turn apart, s per loop; float: px/s on a 1:2 loop (never at rest)
  sheen: 0.03, // the light's colour along the key-side edge at full in-plane light (never a veil across the face)
  sheenReach: 0.4, // share of the face the sheen crosses before it is gone
  gain: 0.35, // the face's light change per unit of n . l change (the light's colour toward the key, shade away)
  liftMax: 0.05, // the most the light side may lift the face (a white veil over the product is haze)
  shadeMax: 0.22, // the most the far side may shade it
  rimWidth: 1, // px at 1080p
  shadow: { dL: 0.26, alpha: 0.55, soft: 0.34, maxThrow: 3, levels: [6, 20] as [number, number], contact: { grow: 6, blur: 14, alpha: 0.38 } },
  enter60: 48,
  enterFrom: { y: 90, lift: 0, tilt: { x: 24, y: -18 } },
} as const;

export type LitEnter = { at: number; dur60?: number; ease?: Ease; from?: { x?: number; y?: number; lift?: number; tilt?: Tilt } };

export type LitProps = {
  x: number; // the panel's centre at rest, px
  y: number;
  w: number; // the panel's own size, px
  h: number;
  r?: number; // corner radius, px (house 12 % of the short side)
  tilt?: Tilt; // degrees at rest (house x 10, y -12; keep |x|, |y| in 8-14)
  lift?: number; // px off the backing plane (house 36)
  sway?: { deg?: number; period?: number; float?: number; phase?: number } | false; // the living drift (house 1.4 deg over 7 s, an 18 px/s float)
  enter?: LitEnter; // settle in from a steeper tilt (house from y +90 px, lift 0, tilt 24 / -18 over 48 f at 60 fps)
  ground: string; // the ground colour behind the panel: the shadow's hue and the spill's colour
  light?: FilmLight; // the film's light (house FILM_LIGHT)
  rim?: { color?: string; alpha?: number }; // the light's colour (house C.white: the rim, the sheen and the lift take it) and the rim's peak alpha (house light.rim)
  shadow?: { alpha?: number; dL?: number }; // the cast shadow's opacity and how much darker than the ground it is
  perspective?: number; // px (house 2200)
  vanish?: [number, number]; // perspective origin on screen (house the frame centre)
};

export type LitState = {
  x: number;
  y: number;
  lift: number;
  tilt: { x: number; y: number; z: number };
  opacity: number;
  face: number; // n . l, 0..1
  shift: number; // n . l minus a front-on panel's
  sheen: { angle: number; alpha: number }; // CSS angle away from the key in the panel's own axes; white alpha
  tone: { light: boolean; alpha: number }; // the face's overall lift (white) or shade
  rim: { x1: number; y1: number; x2: number; y2: number; alpha: number }; // gradient line in panel px, key end first
  spill: { angle: number; alpha: number };
  shadow: { dx: number; dy: number; blur: number; alpha: number }; // the cast shadow on the backing, panel axes px
  contact: { grow: number; blur: number; alpha: number };
};

const deg = (r: number) => (r * 180) / Math.PI;

/**
 * The rim of a w x h panel turned by `tilt` under the light: the gradient line (panel px, the key end first) and its
 * alpha, from the key in the panel's own axes (an edge turning into the light brightens). Pure.
 */
export const rimLine = (tilt: Tilt, w: number, h: number, light: Pick<FilmLight, 'azimuth' | 'elevation' | 'rim'> = FILM_LIGHT, peak: number = light.rim) => {
  const kl = keyLocal(tilt, light);
  const m = Math.hypot(kl[0], kl[1]);
  const dx = m > 1e-6 ? kl[0] / m : 0;
  const dy = m > 1e-6 ? kl[1] / m : -1;
  return { x1: w / 2 + (dx * w) / 2, y1: h / 2 + (dy * h) / 2, x2: w / 2 - (dx * w) / 2, y2: h / 2 - (dy * h) / 2, alpha: peak * clamp(0.45 + 0.66 * m) };
};

/** The panel's pose and light at frame f. Pure. */
export const litState = (frame: number, p: LitProps, film?: Partial<FilmCtx>): LitState => {
  const fps = fpsOf(film);
  const u = uOf(film); // like fpsOf: the timeline's frame when no film is given
  const light = p.light ?? FILM_LIGHT;
  const rest = { x: p.tilt?.x ?? LIT.tilt.x, y: p.tilt?.y ?? LIT.tilt.y, z: p.tilt?.z ?? 0 };
  let q = 1;
  let { x, y } = p;
  let lift = (p.lift ?? LIT.lift) * u;
  const tilt = { ...rest };
  if (p.enter) {
    const e = p.enter;
    q = (e.ease ?? E.settleOut)(clamp((frame - e.at) / Math.max(1, f60x(e.dur60 ?? LIT.enter60, fps))));
    const from = e.from ?? {};
    x = mix(from.x ?? p.x, p.x, q);
    y = mix(from.y ?? p.y + LIT.enterFrom.y * u, p.y, q);
    lift = mix((from.lift ?? LIT.enterFrom.lift) * u, lift, q);
    tilt.x = mix(from.tilt?.x ?? LIT.enterFrom.tilt.x, rest.x, q);
    tilt.y = mix(from.tilt?.y ?? LIT.enterFrom.tilt.y, rest.y, q);
    tilt.z = mix(from.tilt?.z ?? rest.z, rest.z, q);
  }
  if (p.sway !== false) {
    const sw = p.sway || {};
    const a = sw.deg ?? LIT.sway.deg;
    const ph = 2 * Math.PI * (frame / (fps * (sw.period ?? LIT.sway.period)) + (sw.phase ?? 0));
    tilt.x += a * Math.sin(ph);
    tilt.y += a * Math.cos(ph);
    // the float: a 1:2 loop whose speed never reaches 0 (0.7-1.6 x its mean), so a hold keeps 0.3-1 px a frame at 30 fps
    const T = LIT.sway.floatPeriod;
    const R = ((sw.float ?? LIT.sway.float) * u * T) / (2 * Math.PI);
    const fp = 2 * Math.PI * (frame / (fps * T) + (sw.phase ?? 0));
    x += R * Math.sin(fp);
    y += R * 0.6 * Math.sin(2 * fp);
  }
  const face = faceLight(tilt, light);
  const shift = faceShift(tilt, light);
  const kl = keyLocal(tilt, light);
  const m = Math.hypot(kl[0], kl[1]);
  const dx = m > 1e-6 ? kl[0] / m : 0;
  const dy = m > 1e-6 ? kl[1] / m : -1;
  const away = deg(Math.atan2(-dx, dy)); // CSS angle running from the key side to the far side, panel axes
  // the throw on the backing plane: lift x in-plane light / facing light, away from the key, capped for a raking key
  const throwLen = Math.min(LIT.shadow.maxThrow * lift, (lift * m) / Math.max(1e-3, kl[2]));
  const fade = clamp(q * 1.5);
  return {
    x,
    y,
    lift,
    tilt,
    opacity: clamp(q / 0.35),
    face,
    shift,
    sheen: { angle: away, alpha: LIT.sheen * clamp(m / 0.83) },
    tone: { light: shift >= 0, alpha: clamp(LIT.gain * Math.abs(shift), 0, shift >= 0 ? LIT.liftMax : LIT.shadeMax) },
    rim: rimLine(tilt, p.w, p.h, light, p.rim?.alpha ?? light.rim),
    spill: { angle: (away + 180) % 360, alpha: light.spill * (0.6 + 0.4 * clamp(m / 0.83)) },
    shadow: { dx: -dx * throwLen, dy: -dy * throwLen, blur: 2 * u + LIT.shadow.soft * throwLen, alpha: (p.shadow?.alpha ?? LIT.shadow.alpha) * fade },
    contact: { grow: LIT.shadow.contact.grow * u, blur: LIT.shadow.contact.blur * u, alpha: LIT.shadow.contact.alpha * fade },
  };
};

/** Sync: the entry's start and the frame it is home (a soft landing sound), when it has one. */
export const litFrames = (p: LitProps, film?: Partial<FilmCtx>) =>
  p.enter ? { at: p.enter.at, home: Math.ceil(p.enter.at + f60x(p.enter.dur60 ?? LIT.enter60, fpsOf(film))) } : null;

/** A token colour (hex or rgb()) at an alpha, as rgba(). */
export const rgbaOf = (c: string, a: number) => {
  const m = c.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const v = m[1].split(',').map((s) => parseFloat(s));
    return `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${clamp(a).toFixed(3)})`;
  }
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(a).toFixed(3)})`;
};

const rr = (w: number, h: number, r: number, g = 0) => {
  const R = Math.max(0, Math.min(r + g, (w + 2 * g) / 2, (h + 2 * g) / 2));
  const x0 = -g;
  const y0 = -g;
  const x1 = w + g;
  const y1 = h + g;
  return `M${x0 + R} ${y0}H${x1 - R}A${R} ${R} 0 0 1 ${x1} ${y0 + R}V${y1 - R}A${R} ${R} 0 0 1 ${x1 - R} ${y1}H${x0 + R}A${R} ${R} 0 0 1 ${x0} ${y1 - R}V${y0 + R}A${R} ${R} 0 0 1 ${x0 + R} ${y0}Z`;
};

/**
 * The 1 px rim on the key side of a w x h box with corner radius r (draw it last, inside the panel's own box): a
 * stroke whose gradient runs from the key end (full) to the far end (nothing). `line` from rimLine() or litState().rim.
 */
export const RimEdge: React.FC<{ w: number; h: number; r: number; line: ReturnType<typeof rimLine>; color?: string; width?: number; id?: string }> = ({ w, h, r, line, color = C.white, width, id }) => {
  const film = useFilm();
  const sw = (width ?? LIT.rimWidth) * uOf(film);
  const gid = `${id ?? 'rim'}${useId().replace(/[^a-zA-Z0-9]/g, '')}-rim`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}>
          <stop offset="0" stopColor={color} stopOpacity={1} />
          <stop offset="0.5" stopColor={color} stopOpacity={0.28} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={sw / 2} y={sw / 2} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} rx={Math.max(0, r - sw / 2)} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} opacity={line.alpha} />
    </svg>
  );
};

/** A panel in the film's light: tilt, rim, sheen, spill, cast and contact shadow. Children: the panel at (0, 0), w x h. */
export const Lit: React.FC<LitProps & { frame: number; children: React.ReactNode; id?: string; style?: React.CSSProperties }> = (props) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const u = uOf(film);
  const s = litState(props.frame, props, film);
  const uid = `${props.id ?? 'lit'}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { w, h } = props;
  const r = props.r ?? Math.min(w, h) * 0.12;
  const [lo, hi] = LIT.shadow.levels.map((v) => v * u);
  const wHi = clamp((s.shadow.blur - lo) / (hi - lo));
  const tone = shadowTone(props.ground, props.shadow?.dL ?? LIT.shadow.dL);
  const rimColor = props.rim?.color ?? C.white;
  const v = props.vanish ?? [W / 2, H / 2];
  const t = s.tilt;
  const pose = `translate3d(${(s.x - w / 2).toFixed(2)}px, ${(s.y - h / 2).toFixed(2)}px, ${s.lift.toFixed(2)}px) rotateZ(${t.z.toFixed(3)}deg) rotateX(${t.x.toFixed(3)}deg) rotateY(${t.y.toFixed(3)}deg)`;
  const box: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '50% 50%' };
  const pad = (LIT.shadow.levels[1] * 3 + LIT.shadow.maxThrow * (props.lift ?? LIT.lift)) * u; // room for the widest throw and blur (props only)
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, perspective: `${props.perspective ?? LIT.perspective}px`, perspectiveOrigin: `${v[0]}px ${v[1]}px`, ...props.style }}>
      <div style={{ ...box, transform: `${pose} translate3d(0px, 0px, ${(-s.lift).toFixed(2)}px)` }}>
        <svg width={w + 2 * pad} height={h + 2 * pad} viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translate(${-pad}px, ${-pad}px)` }}>
          <defs>
            <filter id={`${uid}-c`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={LIT.shadow.contact.blur * u} />
            </filter>
            <filter id={`${uid}-a`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={LIT.shadow.levels[0] * u} />
            </filter>
            <filter id={`${uid}-b`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation={LIT.shadow.levels[1] * u} />
            </filter>
          </defs>
          {s.contact.alpha > 0.001 && <path d={rr(w, h, r, s.contact.grow)} fill={tone} opacity={s.contact.alpha} filter={`url(#${uid}-c)`} />}
          <g transform={`translate(${s.shadow.dx.toFixed(2)} ${s.shadow.dy.toFixed(2)})`}>
            {wHi < 0.999 && <path d={rr(w, h, r)} fill={tone} opacity={s.shadow.alpha * (1 - wHi)} filter={`url(#${uid}-a)`} />}
            {wHi > 0.001 && <path d={rr(w, h, r)} fill={tone} opacity={s.shadow.alpha * wHi} filter={`url(#${uid}-b)`} />}
          </g>
        </svg>
      </div>
      <div data-ui style={{ ...box, borderRadius: r, overflow: 'hidden', opacity: s.opacity, transform: pose }}>
        {props.children}
        <div style={{ position: 'absolute', inset: 0, background: s.tone.light ? rgbaOf(rimColor, s.tone.alpha) : rgbaOf(tone, s.tone.alpha) }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${s.sheen.angle.toFixed(2)}deg, ${rgbaOf(rimColor, s.sheen.alpha)} 0%, ${rgbaOf(rimColor, 0)} ${(LIT.sheenReach * 100).toFixed(0)}%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${s.spill.angle.toFixed(2)}deg, ${rgbaOf(props.ground, s.spill.alpha)} 0%, ${rgbaOf(props.ground, 0)} 55%)` }} />
        <RimEdge w={w} h={h} r={r} line={s.rim} color={rimColor} id={uid} />
      </div>
    </div>
  );
};

/** Continuous (the sway and the entry are eased moves): nothing to declare. */
export const declares = (_p?: Partial<LitProps>, _film?: Partial<FilmCtx>): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
