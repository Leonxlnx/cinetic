// Crafted avatars drawn in code: a person on a product screen is a portrait, never a grey silhouette and never a
// circle of initials (initials only on a 24-40 px chip, as a monogram tile). Three kinds, all seeded by the person:
//   PortraitMark      a lit gradient portrait: head, hair (seven cuts), ears, neck and shoulders modelled by the
//                     house key (lit side, shade side, a rim of light on the key edge), the collar of a garment;
//                     tinted in the accent's hue at the theme's lightnesses, so a stack reads as one family
//   HalftonePortrait  a dot screen of a generated face-like shape (sockets, nose shade, mouth, hair, shoulders)
//                     under the same key: for a large portrait, a profile, a quote card
//   MonogramTile      initials on a soft rounded tile, for a 24-40 px chip only
// Pure functions of their props: the same person draws the same face on every frame. Colours come from the theme.
// A drawn portrait is for a small avatar inside product UI (72 px and under at 1080p): it carries data-drawn="person",
// and the layout audit fails one drawn larger (drawn-figure). A person who matters in the shot is a real photo (Avatar
// src, fx/Pictures PhotoCard).
import React, { useId } from 'react';
import { clamp, rand } from '../lib/anim';
import { mixColor, oklch as fromLch, toOklch } from '../lib/color';
import { C, MASK } from '../brand/tokens';
import type { KitTheme } from './theme';

export type HairCut = 'crop' | 'side' | 'bun' | 'long' | 'curls' | 'buzz' | 'wave';
export type Collar = 'crew' | 'v' | 'shirt' | 'turtle';
/** A portrait's features, dealt from the person's seed. Lightnesses are OKLCH L on a light ground (dark grounds lift the backdrop). */
export type PortraitStyle = { hair: HairCut; collar: Collar; glasses: boolean; rx: number; ry: number; tilt: number; brow: number; smile: number; deep: boolean; skinL: number; hairL: number; shirtL: number; shirtAccent: boolean; bgL: number; bgTint: boolean };

const CUTS: HairCut[] = ['crop', 'side', 'bun', 'long', 'curls', 'buzz', 'wave'];
const COLLARS: Collar[] = ['crew', 'v', 'shirt', 'turtle'];

/** The features of a person's portrait (pure). */
export const portraitStyle = (seed: string | number): PortraitStyle => {
  const s = String(seed);
  const r = (k: string) => rand(`${s}:${k}`);
  // the backdrop's family: deep or mid behind a light face, light behind a mid face (the face always separates)
  const fam = r('tone');
  const deep = fam < 0.45;
  const light = fam >= 0.8;
  return {
    hair: CUTS[Math.floor(r('hair') * CUTS.length)],
    collar: COLLARS[Math.floor(r('collar') * COLLARS.length)],
    glasses: r('glasses') < 0.22,
    rx: 14.6 + 2 * r('rx'),
    ry: 18 + 2.2 * r('ry'),
    tilt: (r('tilt') - 0.5) * 7,
    brow: (r('brow') - 0.5) * 1.4,
    smile: 0.8 + 1.6 * r('smile'),
    deep,
    skinL: light ? 0.62 + 0.12 * r('skin') : 0.8 + 0.13 * r('skin'),
    hairL: r('grey') < 0.1 ? 0.8 : 0.12 + 0.2 * r('hairL'),
    shirtL: deep ? 0.88 + 0.08 * r('shirt') : 0.22 + 0.12 * r('shirt'),
    shirtAccent: r('acc') < 0.34,
    bgL: deep ? 0.38 + 0.14 * r('bg') : light ? 0.9 + 0.05 * r('bg') : 0.62 + 0.1 * r('bg'),
    bgTint: r('tint') < 0.75,
  };
};

/** The colours of a portrait on a theme: neutrals and the accent's hue at low chroma (one family, never a rainbow). */
const portraitColours = (t: KitTheme, st: PortraitStyle) => {
  const h = t.hue;
  const [aL, aC] = toOklch(t.accent);
  const tint = (L: number, C: number) => fromLch(L, Math.min(C, Math.max(0.02, aC)), h);
  const bgL = t.dark && !st.deep ? st.bgL - 0.12 : st.bgL;
  return {
    bg: st.bgTint ? tint(bgL, st.bgL < 0.8 ? 0.11 : 0.05) : fromLch(bgL, 0.008, h),
    bgDeep: st.bgTint ? tint(bgL - 0.09, st.bgL < 0.8 ? 0.1 : 0.06) : fromLch(bgL - 0.08, 0.01, h),
    feature: fromLch(Math.min(0.3, st.hairL < 0.5 ? st.hairL : 0.28), 0.012, h),
    lip: fromLch(st.skinL - 0.24, 0.03, h),
    // faces stay near neutral (C .015): the colour lives in the backdrop and the garment, never in the skin
    skin: fromLch(st.skinL, 0.015, h),
    skinShade: fromLch(st.skinL - 0.15, 0.018, h),
    skinLit: fromLch(Math.min(0.97, st.skinL + 0.07), 0.01, h),
    hair: fromLch(st.hairL, 0.012, h),
    hairLit: fromLch(Math.min(0.95, st.hairL + 0.14), 0.012, h),
    shirt: st.shirtAccent ? fromLch(clamp(aL, 0.42, 0.62), Math.min(aC, 0.14), h) : fromLch(st.shirtL, 0.01, h),
    shirtShade: st.shirtAccent ? fromLch(clamp(aL, 0.42, 0.62) - 0.12, Math.min(aC, 0.12), h) : fromLch(st.shirtL - 0.12, 0.01, h),
    rim: 'rgba(255, 255, 255, 0.7)',
  };
};

/** The head and shoulders outline (viewBox 100): a hair path in front of the head and one behind it. */
const hairPaths = (cut: HairCut, rx: number): { back?: string; front: string; bun?: [number, number, number]; curls?: [number, number, number][] } => {
  const L = 50 - rx - 0.6;
  const R = 50 + rx + 0.6;
  switch (cut) {
    case 'side':
      return { front: `M${L} 44 C${L - 1} 26 41 20 52 20 C${R + 2} 21 ${R + 1} 34 ${R} 42 C${R - 3} 33 60 29 50 31 C44 32 38 37 ${L} 44 Z` };
    case 'bun':
      return { front: `M${L} 42 C${L - 0.5} 27 41 22 50 22 C59 22 ${R + 0.5} 27 ${R} 42 C${R - 4} 33 58 30 50 30 C42 30 ${L + 4} 33 ${L} 42 Z`, bun: [50, 17.5, 6.4] };
    case 'long':
      return {
        back: `M${L - 1} 46 C${L - 2} 24 40 18 50 18 C60 18 ${R + 2} 24 ${R + 1} 46 L${R + 3} 70 C${R - 3} 75 58 72 57 64 L43 64 C42 72 ${L + 3} 75 ${L - 3} 70 Z`,
        front: `M${L} 44 C${L - 0.5} 26 41 20 50 20 C59 20 ${R + 0.5} 26 ${R} 44 C${R - 2} 34 59 28 47 30 C42 31 ${L + 3} 36 ${L} 44 Z`,
      };
    case 'curls': {
      const curls: [number, number, number][] = [];
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1.05 + (i / 8) * 0.9);
        curls.push([50 + Math.cos(a) * (rx + 1.6), 40 + Math.sin(a) * 19, 5.2 + (i % 2) * 0.9]);
      }
      return { front: `M${L} 42 C${L} 28 41 23 50 23 C59 23 ${R} 28 ${R} 42 C${R - 4} 34 58 31 50 31 C42 31 ${L + 4} 34 ${L} 42 Z`, curls };
    }
    case 'buzz':
      return { front: `M${L + 0.4} 40 C${L + 0.5} 27 41 23.5 50 23.5 C59 23.5 ${R - 0.5} 27 ${R - 0.4} 40 C${R - 3} 33 58 31.5 50 31.5 C42 31.5 ${L + 3} 33 ${L + 0.4} 40 Z` };
    case 'wave':
      return { front: `M${L - 0.5} 45 C${L - 2} 25 40 18.5 51 19.5 C62 20 ${R + 2.5} 28 ${R} 45 C${R - 1} 36 62 30 55 32 C49 34 47 30 42 32 C37 34 ${L + 2} 38 ${L - 0.5} 45 Z` };
    case 'crop':
    default:
      return { front: `M${L} 42 C${L - 1} 26 42 21 50 21 C60 21 ${R + 1} 27 ${R} 42 C${R - 3} 33 58 30 50 30 C42 30 ${L + 3} 33 ${L} 42 Z` };
  }
};

/**
 * A lit gradient portrait in a disc (or `shape` square: a rounded tile). `size` px; `seed` the person. The key comes
 * from the upper left: the face and shoulders are lifted on that side and shaded on the other, a rim of light runs
 * along the key edge, the neck sits in the jaw's shadow.
 */
export const PortraitMark: React.FC<{ theme: KitTheme; seed: string | number; size: number; shape?: 'disc' | 'tile'; style?: React.CSSProperties }> = ({ theme: t, seed, size, shape = 'disc', style }) => {
  const features = size >= 36; // eyes, brows, nose and mouth from 36 px up (under it they would be noise)
  const id = `pm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const st = portraitStyle(seed);
  const c = portraitColours(t, st);
  const hp = hairPaths(st.hair, st.rx);
  const hx = 50;
  const hy = 43;
  const clip = shape === 'disc' ? <circle cx={50} cy={50} r={50} /> : <rect x={0} y={0} width={100} height={100} rx={24} />;
  return (
    <svg data-drawn="person" width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flex: 'none', ...style }} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>{clip}</clipPath>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mixColor(c.bg, C.white, t.dark ? 0.06 : 0.25)} />
          <stop offset="1" stopColor={c.bgDeep} />
        </linearGradient>
        <linearGradient id={`${id}sk`} x1="0.15" y1="0.1" x2="0.95" y2="0.9">
          <stop offset="0" stopColor={c.skinLit} />
          <stop offset="0.5" stopColor={c.skin} />
          <stop offset="1" stopColor={c.skinShade} />
        </linearGradient>
        <linearGradient id={`${id}sh`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor={mixColor(c.shirt, C.white, 0.14)} />
          <stop offset="0.55" stopColor={c.shirt} />
          <stop offset="1" stopColor={c.shirtShade} />
        </linearGradient>
        <linearGradient id={`${id}hr`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.hairLit} />
          <stop offset="0.6" stopColor={c.hair} />
        </linearGradient>
        <radialGradient id={`${id}ao`} cx="0.5" cy="0" r="0.7">
          <stop offset="0" stopColor={MASK} stopOpacity={0.28} />
          <stop offset="1" stopColor={MASK} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect x={0} y={0} width={100} height={100} fill={`url(#${id}bg)`} />
        {/* a soft shadow the figure throws away from the key, on the backdrop */}
        <ellipse cx={58} cy={62} rx={30} ry={34} fill={MASK} opacity={t.dark ? 0.16 : 0.07} />
        <g transform={`rotate(${st.tilt.toFixed(2)} 50 70)`}>
          {hp.back && <path d={hp.back} fill={`url(#${id}hr)`} />}
          {/* shoulders and the garment */}
          <path d="M5 102 C7 83 21 73 50 72 C79 73 93 83 95 102 Z" fill={`url(#${id}sh)`} />
          {st.collar === 'turtle' && <path d="M40 64 L40 75 Q50 80 60 75 L60 64 Z" fill={c.shirtShade} />}
          {/* neck in the jaw's shadow */}
          <path d="M42 56 L42 72 Q50 77.5 58 72 L58 56 Z" fill={c.skinShade} />
          <path d="M42 60 Q50 67 58 60 L58 56 L42 56 Z" fill={MASK} opacity={0.12} />
          {st.collar === 'crew' && <path d="M38.5 73.5 Q50 81 61.5 73.5" stroke={c.shirtShade} strokeWidth={2.4} fill="none" strokeLinecap="round" />}
          {st.collar === 'v' && <path d="M39 73 L50 85 L61 73 L58 72.4 L50 80 L42 72.4 Z" fill={c.skinShade} />}
          {st.collar === 'shirt' && (
            <g fill={mixColor(c.shirt, C.white, 0.32)}>
              <path d="M41 70.5 L50 79 L44.5 84 L37.5 74 Z" />
              <path d="M59 70.5 L50 79 L55.5 84 L62.5 74 Z" />
            </g>
          )}
          {/* ears, head */}
          <ellipse cx={hx - st.rx - 0.4} cy={hy + 2.5} rx={2.6} ry={4.1} fill={c.skin} />
          <ellipse cx={hx + st.rx + 0.4} cy={hy + 2.5} rx={2.6} ry={4.1} fill={c.skinShade} />
          <ellipse cx={hx} cy={hy} rx={st.rx} ry={st.ry} fill={`url(#${id}sk)`} />
          {/* the jaw's turn away from the key */}
          <path d={`M${hx + st.rx * 0.2} ${hy + st.ry * 0.98} C${hx + st.rx * 0.9} ${hy + st.ry * 0.7} ${hx + st.rx} ${hy + st.ry * 0.2} ${hx + st.rx} ${hy - st.ry * 0.1} L${hx + st.rx * 1.05} ${hy + st.ry} Z`} fill={c.skinShade} opacity={0.55} />
          {features && (
            <g>
              {[-1, 1].map((sd) => (
                <g key={sd}>
                  <ellipse cx={hx + sd * st.rx * 0.39} cy={hy + 2.6} rx={1.25} ry={1.5} fill={c.feature} />
                  <path d={`M${hx + sd * st.rx * 0.39 - 2.5} ${hy - 1.6 + (sd > 0 ? st.brow : 0)} Q${hx + sd * st.rx * 0.39} ${hy - 2.9} ${hx + sd * st.rx * 0.39 + 2.5} ${hy - 1.8 + (sd < 0 ? st.brow : 0)}`} stroke={c.feature} strokeWidth={1.15} fill="none" strokeLinecap="round" />
                </g>
              ))}
              <path d={`M${hx + 0.8} ${hy + 4.2} Q${hx + 2.9} ${hy + 9} ${hx + 0.3} ${hy + 9.6}`} stroke={c.skinShade} strokeWidth={1.05} fill="none" strokeLinecap="round" />
              <path d={`M${hx - 3.3} ${hy + 12.4} Q${hx} ${hy + 12.4 + st.smile} ${hx + 3.3} ${hy + 12.4}`} stroke={c.lip} strokeWidth={1.3} fill="none" strokeLinecap="round" />
            </g>
          )}
          {/* hair */}
          {hp.curls?.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={`url(#${id}hr)`} />)}
          <path d={hp.front} fill={`url(#${id}hr)`} />
          {hp.bun && <circle cx={hp.bun[0]} cy={hp.bun[1]} r={hp.bun[2]} fill={`url(#${id}hr)`} />}
          {st.glasses && (
            <g stroke={mixColor(c.hair, MASK, 0.2)} strokeWidth={1.25} fill="none" opacity={0.85}>
              <rect x={hx - st.rx * 0.74} y={hy - 0.3} width={st.rx * 0.66} height={5.8} rx={2.4} />
              <rect x={hx + st.rx * 0.08} y={hy - 0.3} width={st.rx * 0.66} height={5.8} rx={2.4} />
              <path d={`M${hx - st.rx * 0.08} ${hy + 2.2} L${hx + st.rx * 0.08} ${hy + 2.2}`} />
            </g>
          )}
          {/* the rim of light on the key edge: head, then shoulder */}
          <path d={`M${hx - st.rx * 0.98} ${hy + 4} A${st.rx} ${st.ry} 0 0 1 ${hx - st.rx * 0.2} ${hy - st.ry * 0.98}`} stroke={c.rim} strokeWidth={1.2} fill="none" opacity={0.55} strokeLinecap="round" />
          <path d="M8.5 96 C11 84 22 76 40 73.2" stroke={c.rim} strokeWidth={1.3} fill="none" opacity={0.5} strokeLinecap="round" />
        </g>
        {/* ambient occlusion at the top edge, a touch of depth */}
        <rect x={0} y={0} width={100} height={100} fill={`url(#${id}ao)`} opacity={0.35} />
      </g>
    </svg>
  );
};

/** The darkness (0 paper .. 1 ink) of a face-like shape at (x, y) in a 100 box, lit from the upper left. Pure.
 * Read like a printed portrait: a pale backdrop (the figure's shadow falls on it away from the key), dark hair, a face
 * lit on the key side and turned into shade on the far side with a drawn contour, eyes, brows, the nose's shade,
 * the mouth, the neck dark under the jaw, a garment in the person's tone. The head is framed a little larger than
 * PortraitMark's (head and shoulders fill the disc). */
export const halftoneField = (x0: number, y0: number, st: PortraitStyle): number => {
  const z = 1.16;
  const x = 50 + (x0 - 50) / z;
  const y = 52 + (y0 - 52) / z;
  const hx = 50;
  const hy = 43;
  const rx = st.rx * 1.04;
  const ry = st.ry;
  const L = [-0.55, -0.55, 0.63];
  const lam = (nx: number, ny: number, nz: number) => clamp(nx * L[0] + ny * L[1] + nz * L[2], 0, 1);
  const g = (cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  const ax = Math.abs(x - hx);
  const nx = (x - hx) / rx;
  const ny = (y - hy) / ry;
  const e = nx * nx + ny * ny;
  const grey = st.hairL > 0.5;
  const hairInk = () => clamp((grey ? 0.44 : 0.93) - (grey ? 0.24 : 0.34) * lam((x - hx) / (rx + 3), (y - hy) / (ry + 3), 0.55) - 0.18 * g(hx - rx * 0.42, hy - ry * 0.72, 4, 2.4));
  // hair: a dome over the crown down to the temples, its hairline curving down at the sides (a side part drops one side)
  const part = st.hair === 'side' || st.hair === 'wave' ? 0.1 * (x - hx) : 0;
  const hairline = hy - ry * (st.hair === 'buzz' ? 0.6 : 0.5) + 0.03 * (x - hx) ** 2 + part;
  const ang = Math.atan2(y - (hy - 2), x - hx);
  const grow = st.hair === 'curls' ? 1.12 + 0.06 * Math.sin(ang * 12) : st.hair === 'buzz' ? 0.98 : st.hair === 'wave' ? 1.06 + 0.02 * Math.sin(ang * 5) : 1.03;
  const dx = (x - hx) / ((rx + 1.6) * grow);
  const dy = (y - (hy - 1.5)) / ((ry + 2.6) * grow);
  const dome = dx * dx + dy * dy <= 1 && y < Math.min(hairline, hy + (st.hair === 'curls' ? 5 : 1));
  const bun = st.hair === 'bun' && (x - hx) ** 2 + ((y - (hy - ry - 5.5)) / 0.9) ** 2 <= 36;
  if (dome || bun) return hairInk();
  // long hair strands over the face's edges
  const longCut = st.hair === 'long';
  if (longCut && e <= 1 && ax > rx * 0.8 && y < hy + ry * 0.55) return hairInk();
  // ears
  for (const sd of [-1, 1]) if (((x - (hx + sd * (rx + 0.2))) / 2.3) ** 2 + ((y - (hy + 2.5)) / 3.8) ** 2 <= 1 && !longCut) return sd < 0 ? 0.24 : 0.52;
  if (e <= 1) {
    const nz = Math.sqrt(Math.max(0, 1 - e));
    let d = 0.48 - 0.42 * lam(nx, ny, nz); // lit toward the key (about 0.1), turned into shade on the far side (about 0.5)
    d += 0.26 * clamp((e - 0.82) / 0.18) * (nx > -0.2 ? 1 : 0.35); // the contour, drawn on the shade side and the jaw
    for (const sd of [-1, 1]) {
      const ex = hx + sd * rx * 0.38;
      d += 0.2 * g(ex, hy + 1.5, 3.8, 2.4); // the socket
      d += 0.92 * g(ex, hy + 2.3, 1.75, 0.95); // the eye
      d += 0.6 * g(ex, hy - 2.2 + (sd > 0 ? st.brow : 0), 3.3, 0.72); // the brow
      if (st.glasses) d += 0.5 * Math.exp(-(((Math.max(Math.abs(x - ex) / 4.3, Math.abs(y - (hy + 2.3)) / 2.8) - 1) / 0.13) ** 2));
    }
    if (st.glasses) d += 0.45 * g(hx, hy + 2, 1.5, 0.45); // the bridge
    d += 0.3 * g(hx + 2, hy + 7, 1.2, 3); // the nose's shade, away from the key
    d += 0.48 * g(hx + 0.8, hy + 9.4, 2.1, 0.7); // under the nose
    d += 0.7 * g(hx, hy + 12.4 + st.smile * 0.22, 3.8 + st.smile * 0.4, 0.68); // the mouth
    d += 0.2 * g(hx + 0.5, hy + 14.3 + st.smile * 0.22, 2.5, 0.8); // under the lip
    d += 0.2 * clamp((y - (hy + ry * 0.76)) / (ry * 0.24)); // the jaw turning under
    return clamp(d);
  }
  // the garment: broad shoulders in the person's tone (dark or light), lit on the key side, with its collar
  const shoulder = 69.5 + 15 * ((x - hx) / 40) ** 2;
  const neck = ax < 6.4 && y > hy + ry * 0.6;
  if (neck && y < shoulder + 2.5) return clamp((longCut ? 0.32 : 0.44) + 0.34 * clamp((hy + ry + 5 - y) / 7) + (x > hx ? 0.1 : 0)); // dark under the jaw
  // long hair behind the neck and down to the shoulders
  if (longCut && y > hy - 4 && y < shoulder + 4 - 0.004 * (x - hx) ** 2 && ax < rx + 2.5 + 0.1 * Math.max(0, y - hy)) return hairInk();
  if (y > shoulder) {
    const sx = (x - hx) / 46;
    const dark = st.shirtL < 0.6 || st.shirtAccent;
    const base = dark ? 0.76 : 0.42;
    let d = base - (dark ? 0.3 : 0.22) * lam(sx, -0.62, 0.6) + 0.12 * clamp((y - shoulder) / 24) + (dark ? 0 : 0.22 * clamp(1 - (y - shoulder) / 1.6)); // a light garment keeps its edge
    if (st.collar === 'v' && ax < 8.5 - 0.62 * (y - shoulder) && y > shoulder) d = 0.44 + (x > hx ? 0.12 : 0); // skin in the V
    if (st.collar === 'crew') d += 0.32 * Math.exp(-(((y - (shoulder + 2.4 + 0.012 * (x - hx) ** 2)) / 0.85) ** 2)) * (ax < 12 ? 1 : 0);
    if (st.collar === 'shirt') d = dark ? d - 0.42 * clamp(1 - Math.abs(ax - (y - shoulder) * 0.62 - 3) / 2.4) * (y < shoulder + 12 ? 1 : 0) : d + 0.3 * clamp(1 - Math.abs(ax - (y - shoulder) * 0.62 - 3) / 1.2) * (y < shoulder + 12 ? 1 : 0);
    if (st.collar === 'turtle' && ax < 9.5 && y < shoulder + 6) d = base + 0.08 * (x > hx ? 1 : -1);
    return clamp(d);
  }
  // the backdrop: pale, a touch deeper toward the lower right, with the figure's soft shadow cast away from the key
  return clamp(0.06 + 0.1 * clamp((x0 + y0 - 60) / 140) + 0.12 * g(hx + 9, hy + 18, 22, 30));
};

/** The dots of a halftone portrait: a hex screen of `grid` columns covering the whole box, radius from the field's
 * darkness (`invert`: from its lightness, for light dots on a dark field). Pure. */
export const halftoneDots = (seed: string | number, grid = 28, invert = false): [x: number, y: number, r: number][] => {
  const st = portraitStyle(seed);
  const cell = 100 / grid;
  const row = cell * 0.866;
  const out: [number, number, number][] = [];
  for (let j = 0; j * row <= 100 + row; j++)
    for (let i = -1; i <= grid + 1; i++) {
      const x = (i + (j % 2 ? 0.5 : 0)) * cell;
      const y = j * row;
      const f = halftoneField(x, y, st);
      const d = invert ? 1 - f : f;
      const r = 0.6 * cell * Math.sqrt(d);
      if (r > 0.1 * cell) out.push([x, y, r]);
    }
  return out;
};

/**
 * A halftone portrait: dots of a generated face-like shape, `ink` dots on a `paper` field (default: the accent's
 * depth on its soft tint; `inverse` lays light dots on the accent). For a large portrait (96 px and up).
 */
export const HalftonePortrait: React.FC<{ theme: KitTheme; seed: string | number; size: number; grid?: number; inverse?: boolean; shape?: 'disc' | 'tile' | 'none'; style?: React.CSSProperties }> = ({ theme: t, seed, size, grid, inverse, shape = 'disc', style }) => {
  const id = `ht${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const g = grid ?? Math.round(clamp(size / 6, 16, 48));
  const dots = halftoneDots(seed, g, inverse);
  const paper = inverse ? t.accent : mixColor(t.accentSoft, t.dark ? t.text : C.white, 0.35);
  const ink = inverse ? mixColor(t.accent, C.white, 0.85) : t.accentDeep;
  return (
    <svg data-drawn="person" width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flex: 'none', ...style }} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>{shape === 'disc' ? <circle cx={50} cy={50} r={50} /> : <rect x={0} y={0} width={100} height={100} rx={shape === 'tile' ? 18 : 0} />}</clipPath>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mixColor(paper, C.white, inverse ? 0.12 : 0.45)} />
          <stop offset="1" stopColor={mixColor(paper, t.accent, inverse ? 0 : 0.18)} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect x={0} y={0} width={100} height={100} fill={`url(#${id}p)`} />
        <g fill={ink}>
          {dots.map(([x, y, r], i) => (
            <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={r.toFixed(2)} />
          ))}
        </g>
      </g>
    </svg>
  );
};

/** A monogram tile for a 24-40 px chip: the person's initials on a soft rounded tile of their tone. */
export const MonogramTile: React.FC<{ theme: KitTheme; seed: string | number; initials: string; size: number; font: (px: number, weight: number, color: string) => React.CSSProperties; style?: React.CSSProperties }> = ({ theme: t, seed, initials, size, font, style }) => {
  const st = portraitStyle(seed);
  const c = portraitColours(t, st);
  const fill = st.shirtAccent ? t.accentSoft : c.bg;
  // a pale tile takes dark initials, a deep one light initials, on either theme (a light theme's text is dark ink)
  const ink = toOklch(fill)[0] > 0.6 ? (t.dark ? t.accentInk : t.accentDeep) : t.dark ? t.text : t.accentInk;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: `linear-gradient(135deg, ${mixColor(fill, C.white, 0.18)}, ${fill})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', ...style }}>
      <span data-texture style={font(size * 0.42, 650, ink)}>
        {initials.slice(0, 2)}
      </span>
    </div>
  );
};
