// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// cloud-dome: the product's world as a diorama under glass, floating above a sea of cloud. The line sits on a pale sky;
// the camera tilts down, slowly and then hard: the line rides up and goes soft, the cloud plate rises from below, a
// bright cloud rushes past the lens and fills the frame, and as it clears the diorama is there, landed dead: a thick
// white disc with a grey bowl beneath, a clear glass dome on it (a darker refraction band and a thin bright soap-film
// rim at its edge), the product inside (its screen on a laptop at a desk, its object, or its mark on a plinth), and the
// official icons of the tools it works with orbiting the dome as frosted glass tiles, sharp near the glass, soft near
// the lens. Then one push in, slow at first and accelerating, ending in a zoom-blur for the cut. 2.8 s. Big.
//
// Numbers (frames at 30 fps, px at 1080, the stage 1920 wide): the line cap 86 px centred, riding the tilt and
// defocusing 0 -> 12 px over f8-19; the world rises 1000 px (front-loaded only in the whip: 60-110 px/f over f17-24,
// stopping dead at f27), the plate at 0.45 of it; the near cloud crosses at 190-350 px/f and covers the frame f21-23.
// At rest: disc 1024 x 124 rim, top at y 613, bowl 213 deep; dome radius 420 (its apex at 193); the tiles 118 px at
// the dome's depth on a ring of radius 573, 92 px over the disc, eye 1900 px off, turning 110 deg over the shot; depth
// of field on the tiles from the focus on the inside: about 1 px beside the glass, 4 px in front at the landing and 8
// px as the push brings them to the lens, 2-3 px behind; the plate 2.5 px soft. The dome
// fades up f24-28 while focus pulls in from 10 px; the push x1.42 by f80 (slow, then accelerating), x1.62 with a
// 6 px zoom-blur on the last three frames.
import React, { useMemo } from 'react';
import { Img } from 'remotion';
import { C, FONT } from '../brand/tokens';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { DOME as DOME3D, GlassDome } from '../fx/three/GlassDome';
import { draws3D, type GlMode } from '../fx/three/gl';
import { BrandLogo, logoFile, logoOf, type LogoRef } from '../kit/logos';
import { clamp, E, expIn, lmix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { paletteOf, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { hash, rgba, srcOf, Stage1080 } from './stage1080';

export type CloudDomeProps = {
  /** the line on the sky before the camera tilts down (one or two lines; it wraps itself) */
  line: string;
  /** words of the line set in the accent */
  accent?: string;
  /** the plate the world floats over: a photograph of open sky over cloud or sea (public path or URL) */
  plate: string;
  /** what stands in the dome: the product's screen on a laptop (an image), its object (a cut-out PNG), else its mark */
  screen?: string;
  object?: string;
  logo?: Logo;
  /** the official marks of the tools it works with (scripts/logos.mjs), 4-6 orbit the dome as glass tiles */
  icons?: LogoRef[];
  /** the sky above the plate, top and bottom (default a pale overcast blue that meets most sky plates) */
  sky?: [string, string];
  /** ink: the line; accent: its accent words; paper: the light of the disc and the glass */
  palette?: Partial<Palette>;
  /** 'auto' draws the glass, disc and tiles in 3D on a GPU and the 2D drawing elsewhere; 'fallback' always 2D */
  gl?: GlMode;
  frame?: number;
  seed?: number;
};

export const CLOUD_DOME = {
  dur: 84,
  cap: 86,
  // the world's lift below its rest (px) by frame: the slow tilt, the whip, the dead stop
  crane: [[0, 1000], [4, 990], [8, 962], [11, 925], [14, 868], [16, 812], [17, 772], [18, 712], [19, 632], [20, 540], [21, 440], [22, 338], [23, 238], [24, 148], [25, 72], [26, 24], [27, 4], [28, 0]] as const,
  plate: 0.45, // the plate rides the tilt at this share (it is far)
  blur: [[0, 0], [8, 0], [10, 1], [13, 2.9], [15, 4.8], [17, 7.2], [18, 10], [19, 12]] as const, // the line's defocus
  haze: [[0, 0.75], [6, 0.6], [12, 0.35], [18, 0.12], [22, 0]] as const, // the plate's haze clearing
  cloud: [[14, 1150], [15, 1080], [17, 760], [19, 380], [21, -10], [22, -200], [23, -420], [24, -680], [25, -980], [26, -1300], [27, -1650], [28, -2000]] as const, // the near cloud's top edge
  cloudH: 1700,
  dome: [[24, 0], [25, 0.3], [26, 0.7], [27, 1]] as const,
  tilesIn: [[25, 0], [26, 0.5], [27, 1]] as const,
  focus: [[24, 10], [25, 7], [26, 4.5], [27, 2.5], [28, 0]] as const, // the diorama's focus pull (blur px)
  push: [[28, 1], [40, 1.035], [52, 1.09], [64, 1.18], [74, 1.3], [80, 1.42], [84, 1.62]] as const,
  zoom: [80.5, 84] as const,
  disc: { cx: 940, top: 613, rb: 512, ry: 46, rim: 124, bowl: 213 },
  dome3: { r: 420 },
  tiles: { ring: 573, lift: 92, eye: 1900, side: 118, turn: 110, elev: 6 },
} as const;

export const cloudDomeMeta: SceneMeta = {
  id: 'cloud-dome',
  does: 'the line on a pale sky; the camera tilts down through a rushing cloud onto the product under a glass dome above a cloud sea, tool tiles orbiting, and pushes in',
  dur: CLOUD_DOME.dur,
  props: ['line', 'accent?', 'plate', 'screen?', 'object?', 'logo?', 'icons?', 'sky?', 'palette?', 'gl?'],
  handIn: { form: 'word', x: 330, y: 430, w: 1260, h: 202 },
  handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 },
  klass: 'big',
  cues: [
    { f: 4, kind: 'riser', id: 'tilt', weight: 0.4 },
    { f: 17, kind: 'whoosh', id: 'cloud-rush', weight: 0.9 },
    { f: 27, kind: 'land', id: 'diorama', weight: 0.7 },
    { f: 29, kind: 'swell', id: 'glass', weight: 0.5 },
    { f: 80, kind: 'whoosh', id: 'push-cut', weight: 0.7 },
  ],
};

/** The camera's push (x the rest size) at frame t. */
export const domePush = (t: number) => tab(t, CLOUD_DOME.push);

/** Each tile's place at frame t on the 1080p stage: centre, side, blur, depth (+: toward the lens). */
export const domeTiles = (t: number, n: number) => {
  const T = CLOUD_DOME.tiles;
  const D = CLOUD_DOME.disc;
  const m = domePush(t);
  const turnP = clamp((t - 24) / (CLOUD_DOME.dur - 24));
  const turn = T.turn * expIn(0.8)(turnP); // a turn that gathers speed: (e^(0.8 p) - 1) / (e^0.8 - 1)
  const F = { x: D.cx, y: D.top - CLOUD_DOME.dome3.r * 0.55 }; // the push's focus: the middle of what is inside
  const el = (T.elev * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const a = ((turn + 200 + (i * 360) / n) * Math.PI) / 180;
    const x = T.ring * Math.sin(a);
    const z = T.ring * Math.cos(a);
    const h = T.lift + 28 * (hash(31, i) - 0.5);
    const k = T.eye / Math.max(120, T.eye / m - z);
    const sx = F.x + (D.cx + x - F.x) * k;
    const sy = F.y + (D.top - h + z * Math.sin(el) - F.y) * k;
    // the lens focused on what is inside: a tile's blur grows with how far its distance is from the focus distance
    const blur = 0.8 + 8 * Math.abs(z / (T.eye / m - z));
    return { i, x: sx, y: sy, s: T.side * k, blur, z };
  });
};

/** The line split into one or two centred lines (whichever holds it inside 1500 px at the house size). */
const splitLine = (line: string, size: number) => {
  const words = line.trim().split(/\s+/);
  if (measureTracked(line, size, 500, -0.02) <= 1500 || words.length < 2) return [line];
  let best = 1;
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(measureTracked(words.slice(0, i).join(' '), size, 500, -0.02) - measureTracked(words.slice(i).join(' '), size, 500, -0.02));
    if (d < diff) {
      diff = d;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

export const CloudDome: React.FC<CloudDomeProps> = ({ line, accent, plate, screen, object, logo, icons = [], sky, palette, gl = 'auto', frame, seed = 3 }) => {
  const { t, k, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const S = CLOUD_DOME;
  const D = S.disc;
  const R = S.dome3.r;
  const [skyTop, skyLow] = sky ?? ['#E4EEF6', '#D3E2F1'];
  const three = draws3D(gl);
  const lg = useMemo(() => logo ?? logoParts(SAMPLE_MARK_SVG.split(C.accent).join(P.accent).split(C.ink).join(P.ink)), [logo, P.accent, P.ink]);
  const C0 = S.crane[0][1];
  const lift = tab(t, S.crane);
  const m = domePush(t);
  const zoom = E.launchIn(span(t, S.zoom[0], S.zoom[1]));
  const zoomBlur = 6 * zoom;
  const F = { x: D.cx, y: D.top - R * 0.55 };
  const size = S.cap / 0.727;
  const lines = splitLine(line, size);
  const accentSet = new Set((accent ?? '').toLowerCase().split(/\s+/).filter(Boolean));
  const tiles = icons.slice(0, 6);
  const places = domeTiles(t, tiles.length).sort((a, b) => a.z - b.z);
  const tileIn = tab(t, S.tilesIn);
  const domeIn = tab(t, S.dome);
  const focusBlur = tab(t, S.focus);
  const glass = mixColor(P.paper, skyLow, 0.12);
  const band = mixColor(skyLow, P.ink, 0.42);
  const clay = mixColor(P.paper, skyLow, 0.18);
  const clayDark = mixColor(P.paper, P.ink, 0.2);
  const bowlTop = mixColor(P.paper, P.ink, 0.3);
  const bowlLow = mixColor(P.paper, P.ink, 0.5);
  const alu = mixColor(P.paper, P.ink, 0.22);
  // ---- the tiles (2D): frosted glass squares holding the official marks, soft by depth
  const tile = (p: (typeof places)[number]) => (
    <div
      key={p.i}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: p.s,
        height: p.s,
        borderRadius: p.s * 0.26,
        opacity: tileIn * (p.z < 0 ? 0.88 : 1),
        transform: `translate(${(p.x - p.s / 2).toFixed(2)}px, ${(p.y - p.s / 2).toFixed(2)}px)`,
        background: `linear-gradient(160deg, ${rgba(P.paper, 0.78)}, ${rgba(P.paper, 0.46)})`,
        boxShadow: `inset 0 0 0 ${Math.max(1, p.s * 0.01).toFixed(2)}px ${rgba(P.paper, 0.95)}, inset 0 0 ${(p.s * 0.06).toFixed(1)}px ${rgba(skyLow, 0.9)}`,
        filter: p.blur > 0.6 ? `blur(${p.blur.toFixed(2)}px)` : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BrandLogo logo={tiles[p.i]} box={p.s * 0.58} />
    </div>
  );
  // ---- what stands inside the dome
  const deskW = R * 0.98;
  const deskY = D.top - R * 0.4;
  const scrW = R * 0.74;
  const scrH = scrW * 0.625;
  const inside = object ? (
    <Img src={srcOf(object)} style={{ position: 'absolute', left: D.cx - R * 0.42, top: D.top - R * 0.88, width: R * 0.84, height: R * 0.88, objectFit: 'contain', objectPosition: '50% 100%' }} />
  ) : screen ? (
    <>
      {/* the desk: a white top, two legs, its contact shade on the disc */}
      <div style={{ position: 'absolute', left: D.cx - deskW * 0.55, top: D.top - 10, width: deskW * 1.1, height: 26, borderRadius: '50%', background: `radial-gradient(closest-side, ${rgba(P.ink, 0.22)}, ${rgba(P.ink, 0)})` }} />
      {[-1, 1].map((s) => (
        <div key={s} style={{ position: 'absolute', left: D.cx + s * deskW * 0.42 - 7, top: deskY + 10, width: 14, height: D.top - deskY - 8, background: `linear-gradient(90deg, ${clayDark}, ${mixColor(clayDark, P.paper, 0.4)})`, borderRadius: 3 }} />
      ))}
      <div style={{ position: 'absolute', left: D.cx - deskW / 2, top: deskY, width: deskW, height: 18, borderRadius: 5, background: `linear-gradient(180deg, ${P.paper}, ${clay} 55%, ${clayDark})`, boxShadow: `0 6px 14px ${rgba(P.ink, 0.12)}` }} />
      {/* the laptop: the lid with the product's screen, the deck at a grazing angle */}
      <div style={{ position: 'absolute', left: D.cx - scrW * 0.56, top: deskY - 12, width: scrW * 1.12, height: 14, borderRadius: '3px 3px 8px 8px', background: `linear-gradient(180deg, ${mixColor(alu, P.paper, 0.5)}, ${alu})` }} />
      <div style={{ position: 'absolute', left: D.cx - scrW / 2 - 7, top: deskY - 12 - scrH - 12, width: scrW + 14, height: scrH + 14, borderRadius: 10, background: mixColor(P.ink, '#000000', 0.4), boxShadow: `0 0 0 1.5px ${alu}` }}>
        <Img src={srcOf(screen)} style={{ position: 'absolute', left: 7, top: 7, width: scrW, height: scrH, objectFit: 'cover', objectPosition: '50% 0%', borderRadius: 4 }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: `linear-gradient(118deg, ${rgba(P.paper, 0.16)} 0%, ${rgba(P.paper, 0)} 38%)` }} />
      </div>
    </>
  ) : (
    <>
      <div style={{ position: 'absolute', left: D.cx - R * 0.36, top: D.top - R * 0.12, width: R * 0.72, height: R * 0.16, borderRadius: '50%', background: `linear-gradient(180deg, ${P.paper}, ${clayDark})` }} />
      <div style={{ position: 'absolute', left: D.cx - R * 0.29, top: D.top - R * 0.7, width: R * 0.58, height: R * 0.58 }}>
        <LogoMark logo={lg} size={R * 0.58} />
      </div>
    </>
  );
  // ---- the dome's outline: the upper half of a circle meeting the disc along the front of the base ellipse
  const domePath = `M ${D.cx - R} ${D.top} A ${R} ${R} 0 0 1 ${D.cx + R} ${D.top} A ${R} ${D.ry * (R / D.rb)} 0 0 1 ${D.cx - R} ${D.top} Z`;
  const diorama = (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: `${F.x}px ${F.y}px`, transform: `scale(${m.toFixed(5)})`, filter: focusBlur > 0.3 ? `blur(${focusBlur.toFixed(2)}px)` : undefined }}>
      {/* the bowl under the disc, the rim, the top */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id="cd-bowl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={bowlTop} />
            <stop offset="1" stopColor={bowlLow} />
          </linearGradient>
          <linearGradient id="cd-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={P.paper} />
            <stop offset="0.35" stopColor={P.paper} />
            <stop offset="0.7" stopColor={clay} />
            <stop offset="1" stopColor={mixColor(clay, clayDark, 0.75)} />
          </linearGradient>
          <radialGradient id="cd-top" cx={D.cx - D.rb * 0.25} cy={D.top - D.ry * 0.4} r={D.rb * 1.2} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={P.paper} />
            <stop offset="1" stopColor={clay} />
          </radialGradient>
          <radialGradient id="cd-glass" cx={D.cx} cy={D.top} r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={glass} stopOpacity={0} />
            <stop offset="0.7" stopColor={glass} stopOpacity={0.04} />
            <stop offset="0.84" stopColor={band} stopOpacity={0.2} />
            <stop offset="0.915" stopColor={band} stopOpacity={0.34} />
            <stop offset="0.95" stopColor={P.paper} stopOpacity={0.5} />
            <stop offset="0.985" stopColor={P.paper} stopOpacity={0.82} />
            <stop offset="1" stopColor={P.paper} stopOpacity={0.3} />
          </radialGradient>
        </defs>
        <path d={`M ${D.cx - D.rb * 0.84} ${D.top + D.rim - 8} Q ${D.cx - D.rb * 0.56} ${D.top + D.rim + D.bowl * 0.98} ${D.cx} ${D.top + D.rim + D.bowl * 0.94} Q ${D.cx + D.rb * 0.56} ${D.top + D.rim + D.bowl * 0.98} ${D.cx + D.rb * 0.84} ${D.top + D.rim - 8} Z`} fill="url(#cd-bowl)" />
        <ellipse cx={D.cx} cy={D.top + D.rim + 4} rx={D.rb * 0.86} ry={D.ry * 0.9} fill={rgba(P.ink, 0.16)} style={{ filter: 'blur(6px)' }} />
        <path d={`M ${D.cx - D.rb} ${D.top} L ${D.cx - D.rb} ${D.top + D.rim - D.ry} A ${D.rb} ${D.ry} 0 0 0 ${D.cx + D.rb} ${D.top + D.rim - D.ry} L ${D.cx + D.rb} ${D.top} Z`} fill="url(#cd-rim)" />
        <ellipse cx={D.cx} cy={D.top} rx={D.rb} ry={D.ry} fill="url(#cd-top)" />
        <ellipse cx={D.cx} cy={D.top + 2} rx={R * 1.01} ry={D.ry * (R / D.rb) * 1.05} fill="none" stroke={rgba(P.ink, 0.1)} strokeWidth={5} />
      </svg>
      {!three ? places.filter((p) => p.z < 0).map(tile) : null}
      <div style={{ position: 'absolute', inset: 0 }}>{inside}</div>
      {/* the glass: clear in the middle, a darker refraction band and the thin bright film at its rim, the key's highlight */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: domeIn, overflow: 'visible' }}>
        <path d={domePath} fill="url(#cd-glass)" />
        <ellipse cx={D.cx - R * 0.42} cy={D.top - R * 0.62} rx={R * 0.3} ry={R * 0.2} transform={`rotate(-38 ${D.cx - R * 0.42} ${D.top - R * 0.62})`} fill={rgba(P.paper, 0.22)} style={{ filter: 'blur(14px)' }} />
        <path d={`M ${D.cx - R * 0.86} ${D.top - R * 0.42} A ${R * 0.95} ${R * 0.95} 0 0 1 ${D.cx - R * 0.22} ${D.top - R * 0.93}`} fill="none" stroke={rgba(P.paper, 0.85)} strokeWidth={7} strokeLinecap="round" style={{ filter: 'blur(3px)' }} />
        <path d={`M ${D.cx + R * 0.55} ${D.top - R * 0.78} A ${R * 0.96} ${R * 0.96} 0 0 1 ${D.cx + R * 0.9} ${D.top - R * 0.3}`} fill="none" stroke={rgba(P.paper, 0.5)} strokeWidth={4} strokeLinecap="round" />
      </svg>
      {/* the soap film: pale colour where the glass turns away, and a broad faint band of it on the far wall seen through */}
      {[
        { inner: 80, a: 92, b: 97, o: 1, from: 200 },
        { inner: 44, a: 58, b: 74, o: 0.7, from: 20 },
      ].map((f, i) => {
        const ring = `radial-gradient(closest-side, transparent ${f.inner}%, black ${f.a}%, black ${f.b}%, transparent ${Math.min(100, f.b + 3)}%), linear-gradient(180deg, black 0%, black 50%, transparent 50.5%)`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: D.cx - R,
              top: D.top - R,
              width: R * 2,
              height: R * 2,
              borderRadius: '50%',
              opacity: domeIn * f.o,
              background: `conic-gradient(from ${f.from}deg, ${rgba('#A9DDEB', 0.6)}, ${rgba('#CDEFE0', 0.55)}, ${rgba('#F0C4D2', 0.55)}, ${rgba('#B9D6F2', 0.6)}, ${rgba('#C2ECF0', 0.55)}, ${rgba('#A9DDEB', 0.6)})`,
              WebkitMaskImage: ring,
              maskImage: ring,
              WebkitMaskComposite: 'source-in',
              maskComposite: 'intersect',
            }}
          />
        );
      })}
      {!three ? places.filter((p) => p.z >= 0).map(tile) : null}
    </div>
  );
  // ---- the 3D drawing (a GPU): the glass, disc, desk and tiles from fx/three over the same plate; the push and the tilt stay CSS
  const icons3D = tiles.map((l) => {
    const e = logoOf(l);
    const f = e && logoFile(e, 'mark');
    return f ? srcOf(f.src) : null;
  }).filter((x): x is string => !!x);
  const world3D = three ? (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: `${F.x}px ${F.y}px`, transform: `scale(${m.toFixed(5)})`, filter: focusBlur > 0.3 ? `blur(${focusBlur.toFixed(2)}px)` : undefined, WebkitMaskImage: 'linear-gradient(180deg, transparent 0px, black 300px)', maskImage: 'linear-gradient(180deg, transparent 0px, black 300px)' }}>
      <GlassDome inside={screen ? 'laptop' : logo || !object ? 'mark' : 'none'} screen={screen ? srcOf(screen) : undefined} mark={lg} icons={icons3D} move="orbit" at={24 * k} dur={(S.dur - 24) * 2} size={R * 2} x={D.cx} y={D.top - R * DOME3D.aim} backdrop={srcOf(plate)} gl={gl} seed={seed} />
      {object ? <div style={{ position: 'absolute', inset: 0 }}>{inside}</div> : null}
    </div>
  ) : null;
  // ---- the near cloud: a cauliflower of soft white puffs, shaded under, rushing up past the lens
  const cloudTop = tab(t, S.cloud);
  const puffs = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const u = hash(seed + 41, i);
        const v = hash(seed + 43, i);
        const edge = i < 9; // the first puffs make the bumpy top edge
        return { x: 2800 * (0.04 + 0.92 * u), y: edge ? 60 + 140 * v : 260 + 1300 * v, r: (edge ? 230 : 330) + 230 * hash(seed + 47, i) };
      }),
    [seed],
  );
  const cloud =
    cloudTop < 1080 && cloudTop > -S.cloudH - 200 ? (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 2800, height: S.cloudH, transform: `translate(-440px, ${cloudTop.toFixed(1)}px) rotate(-7deg)`, filter: 'blur(9px)' }}>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 300, bottom: 80, background: P.paper, borderRadius: 400 }} />
        {puffs.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(p.x - p.r).toFixed(1)}px, ${(p.y - p.r).toFixed(1)}px)`, width: p.r * 2, height: p.r * 2, borderRadius: '50%', background: `radial-gradient(closest-side, ${rgba(P.paper, 1)} 0%, ${rgba(P.paper, 1)} 55%, ${rgba(P.paper, 0)} 100%)` }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${srcOf(plate)})`, backgroundSize: '260% auto', backgroundPosition: '38% 34%', mixBlendMode: 'multiply', opacity: 0.55, WebkitMaskImage: 'radial-gradient(ellipse 52% 48% at 50% 56%, black 55%, transparent 100%)', maskImage: 'radial-gradient(ellipse 52% 48% at 50% 56%, black 55%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(skyLow, 0)} 45%, ${rgba(mixColor(skyLow, P.ink, 0.25), 0.28)} 100%)`, WebkitMaskImage: 'radial-gradient(ellipse 52% 48% at 50% 56%, black 60%, transparent 100%)', maskImage: 'radial-gradient(ellipse 52% 48% at 50% 56%, black 60%, transparent 100%)' }} />
      </div>
    ) : null;
  // ---- the line: rides the tilt and goes soft
  const lineBlur = tab(t, S.blur);
  const lineDy = lift - C0;
  const blockH = lines.length * size;
  const plateDy = S.plate * lift;
  const plateScale = 1 + 0.25 * (m - 1);
  return (
    <Stage1080 W={W} H={H} ground={skyTop}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${F.x}px ${F.y}px`, transform: zoom > 0 ? `scale(${lmix(1, 1.2, zoom).toFixed(4)})` : undefined, filter: zoomBlur > 0.2 ? `blur(${zoomBlur.toFixed(2)}px)` : undefined }}>
        {/* the sky: a pale field with two soft brighter puffs */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(420px 300px at 30% 52%, ${rgba(P.paper, 0.7)}, ${rgba(P.paper, 0)}), radial-gradient(520px 360px at 76% 30%, ${rgba(P.paper, 0.6)}, ${rgba(P.paper, 0)}), linear-gradient(180deg, ${skyTop}, ${skyLow})` }} />
        {/* the plate: rises from below at its own (farther) rate, its top edge melting into the sky; a haze that clears */}
        {!three ? (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${F.x}px ${F.y}px`, transform: `translateY(${plateDy.toFixed(2)}px) scale(${(1.08 * plateScale).toFixed(4)})`, WebkitMaskImage: 'linear-gradient(180deg, transparent 0px, black 300px)', maskImage: 'linear-gradient(180deg, transparent 0px, black 300px)' }}>
            <Img src={srcOf(plate)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2.5px)' }} />
            <div style={{ position: 'absolute', inset: 0, background: P.paper, opacity: tab(t, S.haze) }} />
          </div>
        ) : null}
        {/* the line */}
        {t < 22 ? (
          <div data-text="scene-line" style={{ position: 'absolute', left: 0, top: 0, width: 1920, transform: `translateY(${(531 - blockH / 2 + lineDy).toFixed(2)}px)`, filter: lineBlur > 0.2 ? `blur(${lineBlur.toFixed(2)}px)` : undefined }}>
            {lines.map((l, li) => (
              <div key={li} style={{ textAlign: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em', color: P.ink }}>
                {l.split(' ').map((w, i) => (
                  <React.Fragment key={i}>
                    {i ? ' ' : ''}
                    <span style={accentSet.has(w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '')) ? { color: P.accent } : undefined}>{w}</span>
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        {/* the diorama rides the tilt in full (it is near) */}
        {t >= 21 ? <div style={{ position: 'absolute', inset: 0, transform: `translateY(${lift.toFixed(2)}px)` }}>{three ? world3D : diorama}</div> : null}
        {cloud}
      </div>
    </Stage1080>
  );
};
