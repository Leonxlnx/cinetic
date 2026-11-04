// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// site-flip: on a black stage with a faint lattice of ring dots lit in soft pools, two white blocks step across the
// frame and the white turns into a sheet: the product's site page, seen in 3D, arriving as a pure white silhouette
// that greys down to the dark page in three frames. The page comes in from the right a third larger than it rests,
// receding and turning its far side away as it slows; then an orbit swings it round so its right side comes near
// while the page builds section by section (its pictures flash in as solid accent panels, then show through); a
// thin bright line of light runs down its left edge, a dimmer one along the top, with small grey handles on the
// corners; at the end it whips out to the left, accelerating, for the cut. 2.1 s. Big.
//
// Numbers (frames at 30 fps, px at 1080): perspective 1400 at the frame's centre; the page 1469 x 1056 (its picture
// edge the frame's), entering at x1.29 of its rest size with its left edge 1246 -> 1034 -> 886 px on f2-5, turned
// 9-20 deg away (right side far) while it slows to f25, swung to 5 deg the other way (right side near) by f45, tilted
// back 8-12 deg; then out to the left on a quad ease-in, 2 -> 109 px/f over f51-61. Edge light: a 1.5 px line, glow at
// 50 % 2 px, 25 % 7 px, 10 % 22 px, an inner gradient 90 px wide on the left edge; 23 px corner handles. Sections
// arrive 5 f apart from f1; a picture flashes solid accent and clears over 4 f (1, .79, .54, .26, 0). Dots: pitch 12
// px, ring 4.8 px across, light pools sliding between two anchor sets; blocks on f0 and f1, the silhouette on f2,
// a white overlay .67, .33, 0 on f3-5.
import React from 'react';
import { BrowserWindow, browserWindowLayout, type Site, skinOf } from '../kit/screens';
import { clamp, track } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, span, useClock } from './parts';
import { rgba, Stage1080 } from './stage1080';

export type SiteFlipProps = {
  /** the product's own site (kit BrowserWindow content: brand, nav, cta, headline, accentWord, lead, ctaAlt, hero picture, cards) */
  site: Site;
  /** ground: the black stage; accent: the site's buttons and the pictures' flash; paper: the light on the edge and the blocks */
  palette?: Partial<Palette>;
  /** false: no whip at the end (the page holds its last pose) */
  exit?: boolean;
  frame?: number;
};

export const SITE_FLIP = {
  dur: 62,
  page: { w: 1469, h: 1056 },
  persp: 1400,
  blocks: [[170, 394, 584, 550], [559, 204, 1198, 794]] as const, // the white blocks on f0 and f1 (x0, y0, x1, y1)
  white: [[2, 1], [3, 0.667], [4, 0.333], [5, 0]] as const,
  build: { at: 1, every: 5 },
  flash: [1, 0.79, 0.54, 0.26, 0] as const,
  exit: [51, 61] as const,
} as const;

// the page's pose by frame: its centre (x, y, z: px, z toward the eye) and turn (yaw: + right side far; pitch: + top
// back; roll), solved from the move frame by frame and smoothed; the exit follows the edge's measured run
const POSE: Record<'x' | 'y' | 'z' | 'yaw' | 'pitch' | 'roll', [number, number][]> = {
  x: [[2, 1930], [3, 1736], [5, 1639], [8, 1549], [11, 1484], [14, 1437], [17, 1402], [21, 1369], [25, 1341], [28, 1290], [30, 1205], [33, 1090], [36, 1027], [39, 986], [42, 955], [45, 936], [49, 926], [51, 926], [52, 924], [53, 913], [54, 896], [55, 872], [56, 840], [57, 798], [58, 747], [59, 683], [60, 604], [61, 506]],
  y: [[2, 700], [5, 700], [8, 687], [11, 678], [14, 675], [17, 675], [21, 679], [25, 678], [28, 681], [30, 686], [33, 681], [36, 675], [39, 672], [42, 668], [45, 667], [49, 672], [52, 675], [61, 690]],
  z: [[2, 380], [3, 342], [5, 300], [8, 262], [11, 231], [14, 212], [17, 206], [21, 199], [25, 185], [28, 190], [33, 194], [36, 194], [39, 186], [42, 180], [45, 168], [49, 153], [52, 140], [56, 120], [61, 80]],
  yaw: [[2, 11], [3, 10.9], [5, 8.6], [8, 9.5], [11, 12.5], [14, 13.7], [17, 14.6], [21, 18.3], [25, 19.5], [28, 15.7], [30, 11.4], [33, 4.1], [36, 0.2], [39, -2.3], [42, -4.5], [45, -5.3], [49, -4.3], [52, -4.6], [56, -7], [61, -11]],
  pitch: [[2, -2], [5, -2.4], [8, -2], [11, 2], [14, 3.8], [17, 5.3], [21, 8], [25, 7.9], [28, 6.6], [30, 4.5], [33, 6.9], [36, 9.6], [39, 10.7], [42, 11.3], [45, 11.6], [49, 11.4], [52, 10.8], [61, 11.6]],
  roll: [[2, -1.8], [5, -1], [8, -1.8], [11, -2.3], [17, -2.1], [25, -2], [30, -1.5], [36, -1.3], [42, -1.7], [49, -1.4], [53, -1.8], [61, -3.6]],
};

/** The page's pose at frame t (see POSE). */
export const sitePose = (t: number, exit = true) => {
  const tt = exit ? t : Math.min(t, SITE_FLIP.exit[0]);
  return { x: track(tt, POSE.x), y: track(tt, POSE.y), z: track(tt, POSE.z), yaw: track(tt, POSE.yaw), pitch: track(tt, POSE.pitch), roll: track(tt, POSE.roll) };
};

const sine = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p));

export const SiteFlip: React.FC<SiteFlipProps> = ({ site, palette, exit = true, frame }) => {
  const { t, k, W, H } = useClock(frame);
  const P = paletteOf({ ground: mixColor(palette?.ink ?? paletteOf().ink, '#000000', 0.7), ...palette });
  const S = SITE_FLIP;
  const pose = sitePose(t, exit);
  const pt = S.page.w / 1024;
  const skin = skinOf('dark', P.ground, P.accent);
  const f = t * k;
  const build = { at: S.build.at * k, every: S.build.every * k };
  const lay = browserWindowLayout({ ...site, chrome: false, tone: 'dark', ground: P.ground, accent: P.accent, w: 1024, build }, f, { pt });
  const rim = mixColor(P.paper, P.accent, 0.08);
  const handle = mixColor(P.paper, P.ground, 0.21);
  const whiteOver = t >= 2 ? Math.max(0, track(t, S.white)) : 0;
  // each picture flashes solid accent on the frame its section arrives, then clears
  const SECTIONS = ['nav', 'headline', 'lead', 'buttons', 'picture', 'notice', 'card0', 'card1', 'card2'];
  const flashes = ['picture', 'card0', 'card1', 'card2']
    .map((name) => ({ box: lay.focus[name], at: S.build.at + SECTIONS.indexOf(name) * S.build.every }))
    .filter((x) => x.box)
    .map((x) => ({ ...x, o: t < x.at ? 0 : S.flash[Math.min(S.flash.length - 1, Math.floor(t - x.at))] }));
  // the dot lattice's light: pool A slides, pool C gives way to pool D
  const q = sine(span(t, -7, 23));
  const pools = [
    { x: 420 + (250 - 420) * q, y: 160 + (120 - 160) * q, r: 520 + (500 - 520) * q, i: 0.55 + 0.05 * q },
    { x: 1550, y: 820, r: 380, i: 0.35 * (1 - q) },
    { x: 1850, y: 300, r: 380, i: 0.4 * q },
  ];
  const mask = pools.map((p) => `radial-gradient(${p.r * 1.25}px ${p.r * 1.25}px at ${p.x.toFixed(0)}px ${p.y.toFixed(0)}px, rgba(0,0,0,${p.i.toFixed(3)}), rgba(0,0,0,0))`).join(', ');
  const dot = mixColor(P.ground, P.paper, 0.32);
  const { w: PW, h: PH } = S.page;
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {/* the stage's lattice of ring dots, lit only in its pools */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask }}>
        <defs>
          <pattern id="site-flip-dots" x={960 - 6.01} y={540 - 6.01} width={12.02} height={12.02} patternUnits="userSpaceOnUse">
            <circle cx={6.01} cy={6.01} r={1.62} fill="none" stroke={dot} strokeWidth={1.56} />
          </pattern>
        </defs>
        <rect width={1920} height={1080} fill="url(#site-flip-dots)" />
      </svg>
      {/* the white blocks stepping in before the sheet */}
      {t < 2
        ? (() => {
            const [x0, y0, x1, y1] = S.blocks[t < 1 ? 0 : 1];
            return <div style={{ position: 'absolute', left: 0, top: 0, width: x1 - x0, height: y1 - y0, background: P.paper, transform: `translate(${x0}px, ${y0}px)` }} />;
          })()
        : null}
      {t >= 2 ? (
        <div style={{ position: 'absolute', inset: 0, perspective: `${S.persp}px`, perspectiveOrigin: '960px 540px' }}>
          <div
            style={{
              position: 'absolute',
              left: 960 - PW / 2,
              top: 540 - PH / 2,
              width: PW,
              height: PH,
              transform: `translate3d(${(pose.x - 960).toFixed(2)}px, ${(pose.y - 540).toFixed(2)}px, ${pose.z.toFixed(2)}px) rotateY(${pose.yaw.toFixed(3)}deg) rotateX(${pose.pitch.toFixed(3)}deg) rotateZ(${pose.roll.toFixed(3)}deg)`,
              background: skin.face,
              boxShadow: `0 0 0 1.5px ${rgba(rim, 0.85)}, 0 0 4px 1px ${rgba(rim, 0.5)}, 0 0 22px 2px ${rgba(rim, 0.13)}, -6px 8px 26px ${rgba(rim, 0.12)}`,
            }}
          >
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <BrowserWindow {...site} chrome={false} tone="dark" ground={P.ground} accent={P.accent} w={1024} pt={pt} frame={f} build={build} style={{ position: 'absolute', left: 0, top: 0 }} />
              {flashes.map((x, i) =>
                x.o > 0 ? <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: x.box.w, height: x.box.h, borderRadius: x.box.r ?? 0, background: P.accent, opacity: x.o, transform: `translate(${x.box.x.toFixed(2)}px, ${x.box.y.toFixed(2)}px)` }} /> : null,
              )}
              {/* the light on the left edge reaching in, and the white the sheet arrives as */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 90, background: `linear-gradient(90deg, ${rgba(rim, 0.24)}, ${rgba(rim, 0)})` }} />
              {whiteOver > 0 ? <div style={{ position: 'absolute', inset: 0, background: P.paper, opacity: whiteOver }} /> : null}
            </div>
            {/* the bright line down the left edge: lint-ok: the page's lit edge, light on the sheet, not a bar on a card */}
            <div style={{ position: 'absolute', left: -1.5, top: 0, bottom: 0, width: 3, background: rim, boxShadow: `0 0 3px 1px ${rgba(rim, 0.7)}, 0 0 12px 2px ${rgba(rim, 0.35)}, 0 0 30px 4px ${rgba(rim, 0.12)}` }} />
            {/* the corner handles */}
            {[0, PW].map((x) => (
              <div key={x} style={{ position: 'absolute', left: x - 11.5, top: -11.5, width: 23, height: 23, background: handle, boxShadow: `inset 1px 1px 0 ${rgba(P.paper, 0.9)}` }} />
            ))}
          </div>
        </div>
      ) : null}
    </Stage1080>
  );
};

export const siteFlipMeta: SceneMeta = {
  id: 'site-flip',
  does: 'white blocks step in and turn into the product\'s site page in 3D on a dotted black stage; it orbits round while it builds, its left edge lit, then whips out',
  dur: SITE_FLIP.dur,
  props: ['site', 'palette?', 'exit?'],
  handIn: null,
  handOut: { form: 'page', x: -114, y: 79, w: 1346, h: 980 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'snap', id: 'block-1', weight: 0.6 },
    { f: 1, kind: 'snap', id: 'block-2', weight: 0.6 },
    { f: 2, kind: 'whoosh', id: 'sheet', weight: 0.8 },
    { f: 13, kind: 'tick', id: 'sections', weight: 0.3 },
    { f: 28, kind: 'whoosh', id: 'orbit', weight: 0.5 },
    { f: 33, kind: 'pop', id: 'pictures', weight: 0.5 },
    { f: 52, kind: 'whoosh', id: 'exit', weight: 0.7 },
  ],
};
